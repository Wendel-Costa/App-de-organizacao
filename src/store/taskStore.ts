import { create } from 'zustand';
import type { Task } from '@/types/task.types';
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  toggleSubtaskComplete,
} from '@/database/queries/tasks.queries';

interface TaskState {
  tasks: Task[];
  loading: boolean;

  fetchTasks: () => Promise<void>;
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editTask: (id: string, data: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    const tasks = await getAllTasks();
    set({ tasks, loading: false });
  },

  addTask: async (data) => {
    const newTask = await createTask(data);
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
  },

  editTask: async (id, data) => {
    await updateTask(id, data);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
  },

  removeTask: async (id) => {
    await deleteTask(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  toggleComplete: async (id, completed) => {
    await toggleTaskComplete(id, completed);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed } : t)),
    }));
  },

  toggleSubtask: async (taskId, subtaskId, completed) => {
    await toggleSubtaskComplete(subtaskId, completed);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks?.map((s) => (s.id === subtaskId ? { ...s, completed } : s)),
            }
          : t,
      ),
    }));
  },
}));
