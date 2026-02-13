import React from "react";
import KanbanBoard from "./components/KanbanBoard";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Real-time Kanban Board</h1>
      </header>
      <KanbanBoard />
    </div>
  );
}

export default App;
