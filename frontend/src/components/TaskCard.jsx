import React from "react";

const PRIORITY_COLORS = {
  Low: "#27ae60",
  Medium: "#f39c12",
  High: "#e74c3c",
};

const CATEGORY_COLORS = {
  Bug: "#e74c3c",
  Feature: "#3498db",
  Enhancement: "#9b59b6",
};

const COLUMNS = ["To Do", "In Progress", "Done"];

/**
 * Renders a single task card with priority, category, attachments,
 * and action buttons (edit, delete, move).
 * Supports native HTML5 drag as a drag source.
 */
function TaskCard({ task, onDragStart, onEdit, onDelete, onMove }) {
  const moveOptions = COLUMNS.filter((col) => col !== task.column);

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      data-testid={`task-${task.id}`}
    >
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        <div className="task-actions">
          <button
            className="edit-btn"
            onClick={onEdit}
            title="Edit task"
            aria-label="Edit task"
          >
            ✏️
          </button>
          <button
            className="delete-btn"
            onClick={onDelete}
            title="Delete task"
            aria-label="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        <span
          className="priority-badge"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
        >
          {task.priority}
        </span>
        <span
          className="category-badge"
          style={{ backgroundColor: CATEGORY_COLORS[task.category] }}
        >
          {task.category}
        </span>
      </div>

      {task.attachments && task.attachments.length > 0 && (
        <div className="task-attachments">
          {task.attachments.map((file, index) => (
            <div key={index} className="attachment-preview">
              {file.type && file.type.startsWith("image/") ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="attachment-image"
                />
              ) : (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-link"
                >
                  📎 {file.name}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="move-actions">
        {moveOptions.map((col) => (
          <button
            key={col}
            className="move-btn"
            onClick={() => onMove(task.id, col)}
            aria-label={`Move to ${col}`}
          >
            → {col}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TaskCard;
