const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Simple unique ID generator
function generateId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 9);
}

// In-memory task storage
let tasks = [];

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send all existing tasks to the newly connected client
  socket.emit("sync:tasks", tasks);

  // Create a new task
  socket.on("task:create", (taskData) => {
    const task = {
      id: generateId(),
      title: taskData.title || "Untitled Task",
      description: taskData.description || "",
      priority: taskData.priority || "Medium",
      category: taskData.category || "Feature",
      column: taskData.column || "To Do",
      attachments: taskData.attachments || [],
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    io.emit("sync:tasks", tasks);
  });

  // Update an existing task
  socket.on("task:update", (updatedTask) => {
    const index = tasks.findIndex((t) => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updatedTask };
      io.emit("sync:tasks", tasks);
    }
  });

  // Move a task between columns
  socket.on("task:move", ({ taskId, newColumn }) => {
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      tasks[index].column = newColumn;
      io.emit("sync:tasks", tasks);
    }
  });

  // Delete a task
  socket.on("task:delete", (taskId) => {
    tasks = tasks.filter((t) => t.id !== taskId);
    io.emit("sync:tasks", tasks);
  });

  // Reset all tasks (useful for testing)
  socket.on("tasks:reset", () => {
    tasks = [];
    io.emit("sync:tasks", tasks);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
