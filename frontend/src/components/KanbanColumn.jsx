import React from "react";
import TaskCard from "./TaskCard";

const COLUMN_COLORS = {
  "To Do": "#3498db",
  "In Progress": "#f39c12",
  Done: "#27ae60",
};

/**
 * Renders a single Kanban column with its tasks.
 * Supports native HTML5 drag-and-drop as a drop target.
 */
function KanbanColumn({
  title,
  tasks,
  onDragStart,
  onDrop,
  onDragOver,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
}) {
  return (
    <div
      className="kanban-column"
      onDrop={(e) => onDrop(e, title)}
      onDragOver={onDragOver}
      data-testid={`column-${title}`}
    >
      <div
        className="column-header"
        style={{ backgroundColor: COLUMN_COLORS[title] }}
      >
        <h3>{title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      <div className="column-body">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task.id)}
            onMove={onMoveTask}
          />
        ))}
        <button className="add-task-btn" onClick={onAddTask}>
          + Add Task
        </button>
      </div>
    </div>
  );
}

export default KanbanColumn;
