import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskFilter, Priority } from 'shared/types';
import * as api from '../api';

export interface UseTasksReturn {
  tasks: Task[];
  filter: TaskFilter;
  setFilter: (f: TaskFilter) => void;
  total: number;
  activeCount: number;
  completedCount: number;
  loading: boolean;
  error: string | null;
  addTask: (title: string, priority?: Priority) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  updateTask: (id: string, title?: string, priority?: Priority) => Promise<void>;
  priorityBreakdown: { high: number; medium: number; low: number };
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: TaskFilter = filter) => {
    try {
      const res = await api.fetchTasks(f);
      setTasks(res.items);
      setTotal(res.meta.total);
      setActiveCount(res.meta.activeCount);
      setCompletedCount(res.meta.completedCount);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const addTask = useCallback(async (title: string, priority?: Priority) => {
    await api.createTask({ title, priority });
    await load();
  }, [load]);

  const toggleTaskAction = useCallback(async (id: string) => {
    await api.toggleTask(id);
    await load();
  }, [load]);

  const deleteTaskAction = useCallback(async (id: string) => {
    await api.deleteTask(id);
    await load();
  }, [load]);

  const clearCompleted = useCallback(async () => {
    await api.deleteCompleted();
    await load();
  }, [load]);

  const updateTaskAction = useCallback(async (id: string, title?: string, priority?: Priority) => {
    await api.updateTask(id, { title, priority });
    await load();
  }, [load]);

  const priorityBreakdown = tasks.reduce(
    (acc, t) => {
      if (!t.completed) acc[t.priority]++;
      return acc;
    },
    { high: 0, medium: 0, low: 0 } as { high: number; medium: number; low: number },
  );

  return {
    tasks,
    filter,
    setFilter,
    total,
    activeCount,
    completedCount,
    loading,
    error,
    addTask,
    toggleTask: toggleTaskAction,
    deleteTask: deleteTaskAction,
    clearCompleted,
    updateTask: updateTaskAction,
    priorityBreakdown,
  };
}
