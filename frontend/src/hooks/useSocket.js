import { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

/**
 * Custom hook for managing WebSocket connection and task operations.
 * Provides real-time task synchronization via Socket.IO.
 */
export function useSocket() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("sync:tasks", (syncedTasks) => {
      setTasks(syncedTasks);
      setLoading(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createTask = useCallback((taskData) => {
    if (socketRef.current) socketRef.current.emit("task:create", taskData);
  }, []);

  const updateTask = useCallback((taskData) => {
    if (socketRef.current) socketRef.current.emit("task:update", taskData);
  }, []);

  const moveTask = useCallback((taskId, newColumn) => {
    if (socketRef.current)
      socketRef.current.emit("task:move", { taskId, newColumn });
  }, []);

  const deleteTask = useCallback((taskId) => {
    if (socketRef.current) socketRef.current.emit("task:delete", taskId);
  }, []);

  return {
    tasks,
    loading,
    connected,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
  };
}
