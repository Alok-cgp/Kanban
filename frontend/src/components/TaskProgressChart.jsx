import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLUMN_COLORS = {
  "To Do": "#3498db",
  "In Progress": "#f39c12",
  Done: "#27ae60",
};

/**
 * Displays a bar chart showing task distribution across columns
 * and a completion percentage indicator.
 * Updates in real-time as tasks are moved between columns.
 */
function TaskProgressChart({ tasks }) {
  const data = [
    {
      name: "To Do",
      count: tasks.filter((t) => t.column === "To Do").length,
    },
    {
      name: "In Progress",
      count: tasks.filter((t) => t.column === "In Progress").length,
    },
    {
      name: "Done",
      count: tasks.filter((t) => t.column === "Done").length,
    },
  ];

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.column === "Done").length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (totalTasks === 0) {
    return (
      <div className="progress-chart" data-testid="progress-chart">
        <h3>Task Progress</h3>
        <p className="no-tasks-message">
          No tasks yet. Add tasks to see progress.
        </p>
      </div>
    );
  }

  return (
    <div className="progress-chart" data-testid="progress-chart">
      <h3>Task Progress</h3>
      <div className="chart-container">
        <div className="completion-info">
          <div
            className="completion-percentage"
            data-testid="completion-percentage"
          >
            {completionPercentage}% Complete
          </div>
          <div className="completion-detail">
            {doneTasks} of {totalTasks} tasks done
          </div>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLUMN_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default TaskProgressChart;
