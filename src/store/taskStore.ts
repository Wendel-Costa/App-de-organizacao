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
import {
  scheduleTaskReminder,
  scheduleDueDateWarning,
  cancelTaskNotifications,
} from '@/services/notifications.service';
import { useFocusStore } from '@/store/focusStore';
import { useRewardStore } from '@/store/rewardStore';
import { useGoalStore } from '@/store/goalStore';

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

    const { taskReminderEnabled, taskReminderHour, dueDateWarningEnabled, notificationsEnabled } = (
      await import('@/store/settingsStore')
    ).useSettingsStore.getState();

    if (notificationsEnabled) {
      if (taskReminderEnabled && newTask.scheduledDate) {
        await scheduleTaskReminder(newTask, taskReminderHour);
      }
      if (dueDateWarningEnabled && newTask.dueDate) {
        await scheduleDueDateWarning(newTask);
      }
    }
  },

  editTask: async (id, data) => {
    await updateTask(id, data);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));

    await cancelTaskNotifications(id);
    const updatedTask = get().tasks.find((t) => t.id === id);
    if (!updatedTask) return;

    const { notificationsEnabled, taskReminderEnabled, taskReminderHour, dueDateWarningEnabled } = (
      await import('@/store/settingsStore')
    ).useSettingsStore.getState();

    if (notificationsEnabled && !updatedTask.completed) {
      if (taskReminderEnabled && updatedTask.scheduledDate) {
        await scheduleTaskReminder(updatedTask, taskReminderHour);
      }
      if (dueDateWarningEnabled && updatedTask.dueDate) {
        await scheduleDueDateWarning(updatedTask);
      }
    }
  },

  removeTask: async (id) => {
    await deleteTask(id);
    await cancelTaskNotifications(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  toggleComplete: async (id, completed) => {
    await toggleTaskComplete(id, completed);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed } : t)),
    }));

    if (completed) {
      await cancelTaskNotifications(id);

      const { sessions } = useFocusStore.getState();
      const { goals } = useGoalStore.getState();
      const { checkAndUnlock } = useRewardStore.getState();
      checkAndUnlock(sessions, get().tasks, goals);
    }
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
