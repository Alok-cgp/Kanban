import React, { useState } from "react";
import { useSocket } from "../hooks/useSocket";
import KanbanColumn from "./KanbanColumn";
import TaskModal from "./TaskModal";
import TaskProgressChart from "./TaskProgressChart";

const COLUMNS = ["To Do", "In Progress", "Done"];

/**
 * Main Kanban Board component.
 * Manages task state via WebSocket and renders columns, chart, and modal.
 */
function KanbanBoard() {
  const {
    tasks,
    loading,
    connected,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
  } = useSocket();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleAddTask = (column) => {
    setEditingTask({ column });
    setModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSaveTask = (taskData) => {
    if (taskData.id) {
      updateTask(taskData);
    } else {
      createTask(taskData);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId) => {
    deleteTask(taskId);
  };

  // Native HTML5 Drag & Drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e, column) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      moveTask(taskId, column);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Show loading spinner while waiting for initial sync
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="kanban-board">
      <div className="board-header">
        <div
          className={`connection-status ${connected ? "connected" : "disconnected"}`}
        >
          {connected ? "● Connected" : "○ Disconnected"}
        </div>
      </div>

      <div className="board-columns">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column}
            title={column}
            tasks={tasks.filter((t) => t.column === column)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onAddTask={() => handleAddTask(column)}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={moveTask}
          />
        ))}
      </div>

      <TaskProgressChart tasks={tasks} />

      {modalOpen && (
        <TaskModal
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

export default KanbanBoard;
