import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard";

// Mock recharts to avoid jsdom SVG rendering issues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
}));

/**
 * Creates a mock Socket.IO client that tracks event listeners
 * and allows triggering events programmatically.
 */
function createMockSocket() {
  const listeners = {};
  return {
    on: vi.fn((event, callback) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    }),
    off: vi.fn((event, callback) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      }
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    // Test helper: trigger a socket event
    _trigger(event, data) {
      if (listeners[event]) {
        listeners[event].forEach((cb) => cb(data));
      }
    },
  };
}

let mockSocket;

// Mock socket.io-client at module level so useSocket uses the mock
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

// ─── Integration Tests: WebSocket + Components ─────────────────────────

describe("WebSocket Integration", () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("connects to WebSocket and displays synced tasks", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "ws-1",
          title: "WebSocket Task",
          description: "",
          priority: "High",
          category: "Bug",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("WebSocket Task")).toBeInTheDocument();
    });
  });

  it("shows connected status after connect event", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", []);
    });

    await waitFor(() => {
      expect(screen.getByText("● Connected")).toBeInTheDocument();
    });
  });

  it("shows disconnected status after disconnect event", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", []);
    });

    await waitFor(() => {
      expect(screen.getByText("● Connected")).toBeInTheDocument();
    });

    await act(async () => {
      mockSocket._trigger("disconnect");
    });

    await waitFor(() => {
      expect(screen.getByText("○ Disconnected")).toBeInTheDocument();
    });
  });

  it("emits task:create when creating a task", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", []);
    });

    await waitFor(() => {
      expect(screen.getByText("● Connected")).toBeInTheDocument();
    });

    // Open modal and create task
    fireEvent.click(screen.getAllByText("+ Add Task")[0]);
    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "Integration Task" },
    });
    fireEvent.change(screen.getByTestId("task-priority-select"), {
      target: { value: "High" },
    });
    fireEvent.change(screen.getByTestId("task-category-select"), {
      target: { value: "Bug" },
    });
    fireEvent.click(screen.getByTestId("save-task-btn"));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "task:create",
      expect.objectContaining({
        title: "Integration Task",
        priority: "High",
        category: "Bug",
        column: "To Do",
      })
    );
  });

  it("emits task:delete when deleting a task", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "del-1",
          title: "Delete Me",
          description: "",
          priority: "Low",
          category: "Feature",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Delete Me")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Delete task"));
    expect(mockSocket.emit).toHaveBeenCalledWith("task:delete", "del-1");
  });

  it("emits task:move when moving a task between columns", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "move-1",
          title: "Move Me",
          description: "",
          priority: "Medium",
          category: "Feature",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Move Me")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("→ In Progress"));
    expect(mockSocket.emit).toHaveBeenCalledWith("task:move", {
      taskId: "move-1",
      newColumn: "In Progress",
    });
  });

  it("emits task:update when editing and saving a task", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "edit-1",
          title: "Edit Me",
          description: "Old desc",
          priority: "Low",
          category: "Bug",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Edit Me")).toBeInTheDocument();
    });

    // Click edit button and modify title
    fireEvent.click(screen.getByLabelText("Edit task"));
    await waitFor(() => {
      expect(screen.getByText("Edit Task")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "Updated Title" },
    });
    fireEvent.click(screen.getByTestId("save-task-btn"));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "task:update",
      expect.objectContaining({
        id: "edit-1",
        title: "Updated Title",
      })
    );
  });

  it("updates UI in real-time when receiving sync:tasks with new data", async () => {
    render(<KanbanBoard />);

    // First sync
    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "1",
          title: "First Task",
          description: "",
          priority: "High",
          category: "Bug",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("First Task")).toBeInTheDocument();
    });

    // Simulate another user adding a task (server sends updated task list)
    await act(async () => {
      mockSocket._trigger("sync:tasks", [
        {
          id: "1",
          title: "First Task",
          description: "",
          priority: "High",
          category: "Bug",
          column: "To Do",
          attachments: [],
        },
        {
          id: "2",
          title: "Second Task",
          description: "",
          priority: "Low",
          category: "Feature",
          column: "In Progress",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("First Task")).toBeInTheDocument();
      expect(screen.getByText("Second Task")).toBeInTheDocument();
    });
  });

  it("reflects task column change from WebSocket sync", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "1",
          title: "Task A",
          description: "",
          priority: "Medium",
          category: "Feature",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      const todoColumn = screen.getByTestId("column-To Do");
      expect(todoColumn).toContainElement(screen.getByText("Task A"));
    });

    // Server syncs task moved to Done
    await act(async () => {
      mockSocket._trigger("sync:tasks", [
        {
          id: "1",
          title: "Task A",
          description: "",
          priority: "Medium",
          category: "Feature",
          column: "Done",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      const doneColumn = screen.getByTestId("column-Done");
      expect(doneColumn).toContainElement(screen.getByText("Task A"));
    });
  });

  it("handles task removal from synced data", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "1",
          title: "Will Be Removed",
          description: "",
          priority: "High",
          category: "Bug",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Will Be Removed")).toBeInTheDocument();
    });

    // Server syncs empty task list (task deleted by another user)
    await act(async () => {
      mockSocket._trigger("sync:tasks", []);
    });

    await waitFor(() => {
      expect(screen.queryByText("Will Be Removed")).not.toBeInTheDocument();
    });
  });

  it("validates drag-and-drop by simulating drop event on column", async () => {
    render(<KanbanBoard />);

    await act(async () => {
      mockSocket._trigger("connect");
      mockSocket._trigger("sync:tasks", [
        {
          id: "dnd-1",
          title: "DnD Task",
          description: "",
          priority: "Medium",
          category: "Feature",
          column: "To Do",
          attachments: [],
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("DnD Task")).toBeInTheDocument();
    });

    const doneColumn = screen.getByTestId("column-Done");

    // Simulate the drop with a mock dataTransfer
    fireEvent.drop(doneColumn, {
      dataTransfer: {
        getData: vi.fn(() => "dnd-1"),
      },
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("task:move", {
      taskId: "dnd-1",
      newColumn: "Done",
    });
  });

  it("cleans up socket connection on unmount", () => {
    const { unmount } = render(<KanbanBoard />);
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
