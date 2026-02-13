import React, { useState } from "react";

const PRIORITIES = ["Low", "Medium", "High"];
const CATEGORIES = ["Bug", "Feature", "Enhancement"];
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

/**
 * Modal dialog for creating or editing a task.
 * Supports title, description, priority, category, and file attachments.
 */
function TaskModal({ task, onSave, onClose }) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState(task?.priority || "Medium");
  const [category, setCategory] = useState(task?.category || "Feature");
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [fileError, setFileError] = useState("");

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFileError("");

    files.forEach((file) => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFileError(
          `Unsupported file format: ${file.name}. Allowed: JPEG, PNG, GIF, WebP, PDF`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          { name: file.name, type: file.type, url: reader.result },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(task?.id && { id: task.id }),
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      column: task?.column || "To Do",
      attachments,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="task-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task?.id ? "Edit Task" : "Add New Task"}</h3>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="task-title">Title *</label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
              data-testid="task-title-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
              data-testid="task-description-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                data-testid="task-priority-select"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-category">Category</label>
              <select
                id="task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                data-testid="task-category-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="task-file">Attachments</label>
            <input
              id="task-file"
              type="file"
              onChange={handleFileUpload}
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              multiple
              data-testid="task-file-input"
            />
            {fileError && (
              <p className="file-error" data-testid="file-error">
                {fileError}
              </p>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="attachment-list">
              {attachments.map((file, index) => (
                <div key={index} className="attachment-item">
                  {file.type && file.type.startsWith("image/") ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="attachment-thumb"
                    />
                  ) : (
                    <span className="attachment-name">📎 {file.name}</span>
                  )}
                  <button
                    type="button"
                    className="remove-attachment"
                    onClick={() => removeAttachment(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              data-testid="save-task-btn"
            >
              {task?.id ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
