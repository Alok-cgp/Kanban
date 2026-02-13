import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard";
import TaskCard from "../../components/TaskCard";
import TaskModal from "../../components/TaskModal";
import TaskProgressChart from "../../components/TaskProgressChart";

// Mock recharts to avoid jsdom SVG issues
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

// Mock the useSocket hook for unit tests
vi.mock("../../hooks/useSocket", () => ({
  useSocket: vi.fn(),
}));

import { useSocket } from "../../hooks/useSocket";

const mockTasks = [
  {
    id: "1",
    title: "Test Task 1",
    description: "Description 1",
    priority: "High",
    category: "Bug",
    column: "To Do",
    attachments: [],
  },
  {
    id: "2",
    title: "Test Task 2",
    description: "Description 2",
    priority: "Medium",
    category: "Feature",
    column: "In Progress",
    attachments: [],
  },
  {
    id: "3",
    title: "Test Task 3",
    description: "Description 3",
    priority: "Low",
    category: "Enhancement",
    column: "Done",
    attachments: [],
  },
];

// ─── KanbanBoard Component Tests ────────────────────────────────────────

describe("KanbanBoard", () => {
  const mockCreateTask = vi.fn();
  const mockUpdateTask = vi.fn();
  const mockMoveTask = vi.fn();
  const mockDeleteTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSocket.mockReturnValue({
      tasks: mockTasks,
      loading: false,
      connected: true,
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      moveTask: mockMoveTask,
      deleteTask: mockDeleteTask,
    });
  });

  it("renders all three Kanban columns", () => {
    render(<KanbanBoard />);
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    useSocket.mockReturnValue({
      tasks: [],
      loading: true,
      connected: false,
      createTask: vi.fn(),
      updateTask: vi.fn(),
      moveTask: vi.fn(),
      deleteTask: vi.fn(),
    });
    render(<KanbanBoard />);
    expect(screen.getByText("Connecting to server...")).toBeInTheDocument();
  });

  it("shows connected status when socket is connected", () => {
    render(<KanbanBoard />);
    expect(screen.getByText("● Connected")).toBeInTheDocument();
  });

  it("shows disconnected status when socket is not connected", () => {
    useSocket.mockReturnValue({
      tasks: mockTasks,
      loading: false,
      connected: false,
      createTask: vi.fn(),
      updateTask: vi.fn(),
      moveTask: vi.fn(),
      deleteTask: vi.fn(),
    });
    render(<KanbanBoard />);
    expect(screen.getByText("○ Disconnected")).toBeInTheDocument();
  });

  it("renders all tasks in their correct columns", () => {
    render(<KanbanBoard />);
    expect(screen.getByText("Test Task 1")).toBeInTheDocument();
    expect(screen.getByText("Test Task 2")).toBeInTheDocument();
    expect(screen.getByText("Test Task 3")).toBeInTheDocument();
  });

  it("opens add task modal when clicking + Add Task", () => {
    render(<KanbanBoard />);
    const addButtons = screen.getAllByText("+ Add Task");
    fireEvent.click(addButtons[0]);
    expect(screen.getByText("Add New Task")).toBeInTheDocument();
  });

  it("closes modal when Cancel is clicked", () => {
    render(<KanbanBoard />);
    fireEvent.click(screen.getAllByText("+ Add Task")[0]);
    expect(screen.getByText("Add New Task")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Add New Task")).not.toBeInTheDocument();
  });

  it("calls createTask when creating a new task via modal", () => {
    render(<KanbanBoard />);
    fireEvent.click(screen.getAllByText("+ Add Task")[0]);
    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "New Task" },
    });
    fireEvent.click(screen.getByTestId("save-task-btn"));
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Task" })
    );
  });

  it("calls deleteTask when delete button is clicked", () => {
    render(<KanbanBoard />);
    const deleteButtons = screen.getAllByLabelText("Delete task");
    fireEvent.click(deleteButtons[0]);
    expect(mockDeleteTask).toHaveBeenCalledWith("1");
  });

  it("calls moveTask when move button is clicked", () => {
    render(<KanbanBoard />);
    const moveButtons = screen.getAllByText("→ In Progress");
    fireEvent.click(moveButtons[0]);
    expect(mockMoveTask).toHaveBeenCalledWith("1", "In Progress");
  });

  it("opens edit modal when clicking edit button on a task", () => {
    render(<KanbanBoard />);
    const editButtons = screen.getAllByLabelText("Edit task");
    fireEvent.click(editButtons[0]);
    expect(screen.getByText("Edit Task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Task 1")).toBeInTheDocument();
  });

  it("calls updateTask when saving an edited task", () => {
    render(<KanbanBoard />);
    fireEvent.click(screen.getAllByLabelText("Edit task")[0]);
    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "Updated Task" },
    });
    fireEvent.click(screen.getByTestId("save-task-btn"));
    expect(mockUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1", title: "Updated Task" })
    );
  });

  it("displays task count badges in column headers", () => {
    render(<KanbanBoard />);
    // Each column has exactly 1 task, so count badges show "1"
    const badges = screen.getAllByText("1");
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the progress chart section", () => {
    render(<KanbanBoard />);
    expect(screen.getByTestId("progress-chart")).toBeInTheDocument();
  });

  it("has three Add Task buttons, one per column", () => {
    render(<KanbanBoard />);
    const addButtons = screen.getAllByText("+ Add Task");
    expect(addButtons).toHaveLength(3);
  });
});

// ─── TaskCard Component Tests ───────────────────────────────────────────

describe("TaskCard", () => {
  const mockTask = {
    id: "card-1",
    title: "Card Task",
    description: "Card Description",
    priority: "High",
    category: "Bug",
    column: "To Do",
    attachments: [],
  };

  it("renders task title and description", () => {
    render(
      <TaskCard
        task={mockTask}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(screen.getByText("Card Task")).toBeInTheDocument();
    expect(screen.getByText("Card Description")).toBeInTheDocument();
  });

  it("renders priority and category badges", () => {
    render(
      <TaskCard
        task={mockTask}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("renders move buttons only for other columns", () => {
    render(
      <TaskCard
        task={mockTask}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(screen.getByText("→ In Progress")).toBeInTheDocument();
    expect(screen.getByText("→ Done")).toBeInTheDocument();
    expect(screen.queryByText("→ To Do")).not.toBeInTheDocument();
  });

  it("renders image attachment preview", () => {
    const taskWithImage = {
      ...mockTask,
      attachments: [
        {
          name: "photo.jpg",
          type: "image/jpeg",
          url: "data:image/jpeg;base64,abc",
        },
      ],
    };
    render(
      <TaskCard
        task={taskWithImage}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    const img = screen.getByAltText("photo.jpg");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/jpeg;base64,abc");
  });

  it("renders PDF attachment as a link", () => {
    const taskWithPDF = {
      ...mockTask,
      attachments: [
        {
          name: "document.pdf",
          type: "application/pdf",
          url: "data:application/pdf;base64,xyz",
        },
      ],
    };
    render(
      <TaskCard
        task={taskWithPDF}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(screen.getByText("📎 document.pdf")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const mockEdit = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onDragStart={vi.fn()}
        onEdit={mockEdit}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Edit task"));
    expect(mockEdit).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when delete button is clicked", () => {
    const mockDelete = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={mockDelete}
        onMove={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Delete task"));
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onMove with correct column when move button is clicked", () => {
    const mockMove = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={mockMove}
      />
    );
    fireEvent.click(screen.getByText("→ Done"));
    expect(mockMove).toHaveBeenCalledWith("card-1", "Done");
  });

  it("does not render description when empty", () => {
    const taskNoDesc = { ...mockTask, description: "" };
    render(
      <TaskCard
        task={taskNoDesc}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(screen.queryByText("Card Description")).not.toBeInTheDocument();
  });

  it("has draggable attribute set to true", () => {
    render(
      <TaskCard
        task={mockTask}
        onDragStart={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    const card = screen.getByTestId("task-card-1");
    expect(card).toHaveAttribute("draggable", "true");
  });
});

// ─── TaskModal Component Tests ──────────────────────────────────────────

describe("TaskModal", () => {
  it("renders add task form when no task id", () => {
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Add New Task")).toBeInTheDocument();
    expect(screen.getByTestId("task-title-input")).toBeInTheDocument();
    expect(screen.getByTestId("task-priority-select")).toBeInTheDocument();
    expect(screen.getByTestId("task-category-select")).toBeInTheDocument();
    expect(screen.getByTestId("task-file-input")).toBeInTheDocument();
  });

  it("renders edit task form with existing data pre-filled", () => {
    const task = {
      id: "edit-1",
      title: "Edit Me",
      description: "Existing description",
      priority: "High",
      category: "Bug",
      column: "To Do",
      attachments: [],
    };
    render(<TaskModal task={task} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Edit Task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Edit Me")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing description")).toBeInTheDocument();
  });

  it("calls onSave with correct form data when submitted", () => {
    const mockSave = vi.fn();
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={mockSave}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "New Task" },
    });
    fireEvent.change(screen.getByTestId("task-description-input"), {
      target: { value: "New Description" },
    });
    fireEvent.change(screen.getByTestId("task-priority-select"), {
      target: { value: "High" },
    });
    fireEvent.change(screen.getByTestId("task-category-select"), {
      target: { value: "Bug" },
    });
    fireEvent.click(screen.getByTestId("save-task-btn"));

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Task",
        description: "New Description",
        priority: "High",
        category: "Bug",
        column: "To Do",
      })
    );
  });

  it("calls onClose when Cancel button is clicked", () => {
    const mockClose = vi.fn();
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={mockClose}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when modal overlay is clicked", () => {
    const mockClose = vi.fn();
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={mockClose}
      />
    );
    fireEvent.click(screen.getByTestId("task-modal"));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when X button is clicked", () => {
    const mockClose = vi.fn();
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={mockClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("shows error for unsupported file format", async () => {
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const file = new File(["test"], "malware.exe", {
      type: "application/x-msdownload",
    });
    fireEvent.change(screen.getByTestId("task-file-input"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByTestId("file-error")).toBeInTheDocument();
      expect(screen.getByTestId("file-error")).toHaveTextContent(
        "Unsupported file format"
      );
    });
  });

  it("allows priority selection to be changed", () => {
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const select = screen.getByTestId("task-priority-select");
    fireEvent.change(select, { target: { value: "Low" } });
    expect(select.value).toBe("Low");
  });

  it("allows category selection to be changed", () => {
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const select = screen.getByTestId("task-category-select");
    fireEvent.change(select, { target: { value: "Enhancement" } });
    expect(select.value).toBe("Enhancement");
  });

  it("does not submit with empty title", () => {
    const mockSave = vi.fn();
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={mockSave}
        onClose={vi.fn()}
      />
    );
    // Leave title empty, try to save
    fireEvent.click(screen.getByTestId("save-task-btn"));
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("shows Create Task button for new tasks", () => {
    render(
      <TaskModal
        task={{ column: "To Do" }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("save-task-btn")).toHaveTextContent(
      "Create Task"
    );
  });

  it("shows Update Task button for existing tasks", () => {
    render(
      <TaskModal
        task={{ id: "1", title: "Test", column: "To Do", attachments: [] }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("save-task-btn")).toHaveTextContent(
      "Update Task"
    );
  });
});

// ─── TaskProgressChart Component Tests ──────────────────────────────────

describe("TaskProgressChart", () => {
  it("renders chart container with title", () => {
    render(<TaskProgressChart tasks={mockTasks} />);
    expect(screen.getByTestId("progress-chart")).toBeInTheDocument();
    expect(screen.getByText("Task Progress")).toBeInTheDocument();
  });

  it("shows no tasks message when task list is empty", () => {
    render(<TaskProgressChart tasks={[]} />);
    expect(
      screen.getByText("No tasks yet. Add tasks to see progress.")
    ).toBeInTheDocument();
  });

  it("displays correct completion percentage (1 of 3 = 33%)", () => {
    render(<TaskProgressChart tasks={mockTasks} />);
    expect(screen.getByTestId("completion-percentage")).toHaveTextContent(
      "33% Complete"
    );
  });

  it("shows 100% when all tasks are in Done column", () => {
    const allDone = mockTasks.map((t) => ({ ...t, column: "Done" }));
    render(<TaskProgressChart tasks={allDone} />);
    expect(screen.getByTestId("completion-percentage")).toHaveTextContent(
      "100% Complete"
    );
  });

  it("shows 0% when no tasks are in Done column", () => {
    const noneDone = mockTasks.map((t) => ({ ...t, column: "To Do" }));
    render(<TaskProgressChart tasks={noneDone} />);
    expect(screen.getByTestId("completion-percentage")).toHaveTextContent(
      "0% Complete"
    );
  });

  it("displays task count detail text", () => {
    render(<TaskProgressChart tasks={mockTasks} />);
    expect(screen.getByText("1 of 3 tasks done")).toBeInTheDocument();
  });

  it("updates when tasks prop changes", () => {
    const { rerender } = render(<TaskProgressChart tasks={mockTasks} />);
    expect(screen.getByTestId("completion-percentage")).toHaveTextContent(
      "33% Complete"
    );

    const updatedTasks = mockTasks.map((t) => ({ ...t, column: "Done" }));
    rerender(<TaskProgressChart tasks={updatedTasks} />);
    expect(screen.getByTestId("completion-percentage")).toHaveTextContent(
      "100% Complete"
    );
  });
});
