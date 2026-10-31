import { create } from 'zustand';
import { useGamificationStore } from '@/store/gamificationStore';
import type { Task } from '@/types/task.types';
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  toggleSubtaskComplete,
  rolloverTask,
  resetTaskSubtasks,
  skipTaskOccurrence,
} from '@/database/queries/tasks.queries';
import { saveTaskCompletion } from '@/database/queries/taskHistory.queries';
import {
  getRecurringTasksToRollover,
  getEveryXDaysTasksToReset,
  getRecurringTasksWithStaleSubtasks,
} from '@/services/recurrence.service';
import {
  scheduleTaskReminder,
  scheduleDueDateWarning,
  cancelTaskNotifications,
} from '@/services/notifications.service';
import { useSettingsStore } from '@/store/settingsStore';
import { localDateStr } from '@/utils/date';

import {
  awardProductiveAction,
  getGamificationConfig,
  pointsForTaskLevel,
  reverseLatestProductiveAction,
} from '@/services/gamification.service';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  lastFetchedAt: number;
  lastRecurrenceSyncDate: string | null;
  fetchTasks: (force?: boolean) => Promise<void>;
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editTask: (id: string, data: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  skipRecurringOccurrence: (id: string) => Promise<void>;
}

let tasksFetchPromise: Promise<void> | null = null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  lastFetchedAt: 0,
  lastRecurrenceSyncDate: null,

  fetchTasks: async (force = false) => {
    if (!force && Date.now() - get().lastFetchedAt < 10000) return;
    if (tasksFetchPromise) return tasksFetchPromise;

    tasksFetchPromise = (async () => {
      set({ loading: true });
      try {
        let tasks = await getAllTasks();
        const today = localDateStr();
        const shouldSyncRecurrence = force || get().lastRecurrenceSyncDate !== today;

        if (shouldSyncRecurrence) {
          let recurrenceChanged = false;

          const toReset = getEveryXDaysTasksToReset(tasks);
          for (const task of toReset) {
            recurrenceChanged = true;
            await toggleTaskComplete(task.id, false).catch(() => {});
            if (task.subtasks?.some((s) => s.completed)) {
              await resetTaskSubtasks(task.id).catch(() => {});
            }
          }

          const toResetSubtasks = getRecurringTasksWithStaleSubtasks(tasks);
          for (const task of toResetSubtasks) {
            recurrenceChanged = true;
            await resetTaskSubtasks(task.id).catch(() => {});
          }

          const toRollover = getRecurringTasksToRollover(tasks);
          for (const task of toRollover) {
            recurrenceChanged = true;
            await rolloverTask(task).catch(() => {});
          }

          if (recurrenceChanged) {
            tasks = await getAllTasks();
          }
        }

        set({
          tasks,
          loading: false,
          lastFetchedAt: Date.now(),
          ...(shouldSyncRecurrence ? { lastRecurrenceSyncDate: today } : {}),
        });
      } catch {
        set({ loading: false });
      }
    })();

    try {
      await tasksFetchPromise;
    } finally {
      tasksFetchPromise = null;
    }
  },

  addTask: async (data) => {
    try {
      const newTask = await createTask(data);
      set((state) => ({ tasks: [newTask, ...state.tasks], lastFetchedAt: Date.now() }));

      try {
        const {
          taskReminderEnabled,
          taskReminderHour,
          dueDateWarningEnabled,
          notificationsEnabled,
        } = useSettingsStore.getState();

        if (notificationsEnabled) {
          if (taskReminderEnabled && newTask.scheduledDate) {
            await scheduleTaskReminder(newTask, taskReminderHour);
          }
          if (dueDateWarningEnabled && newTask.dueDate) {
            await scheduleDueDateWarning(newTask);
          }
        }
      } catch {}
    } catch (e) {
      throw e;
    }
  },

  editTask: async (id, data) => {
    try {
      const savedTask = await updateTask(id, data);
      const recurrenceChanged =
        data.type !== undefined ||
        data.recurrenceDays !== undefined ||
        data.recurrenceInterval !== undefined;
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? savedTask : t)),
        lastFetchedAt: Date.now(),
        ...(recurrenceChanged ? { lastRecurrenceSyncDate: null } : {}),
      }));

      await cancelTaskNotifications(id).catch(() => {});
      const updatedTask = get().tasks.find((t) => t.id === id);
      if (!updatedTask) return;

      const { notificationsEnabled, taskReminderEnabled, taskReminderHour, dueDateWarningEnabled } =
        useSettingsStore.getState();

      if (notificationsEnabled && !updatedTask.completed) {
        if (taskReminderEnabled && updatedTask.scheduledDate)
          await scheduleTaskReminder(updatedTask, taskReminderHour).catch(() => {});
        if (dueDateWarningEnabled && updatedTask.dueDate)
          await scheduleDueDateWarning(updatedTask).catch(() => {});
      }
    } catch (e) {
      throw e;
    }
  },

  removeTask: async (id) => {
    try {
      await deleteTask(id);
      await cancelTaskNotifications(id).catch(() => {});
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        lastFetchedAt: Date.now(),
      }));
    } catch (e) {
      throw e;
    }
  },

  toggleComplete: async (id, completed) => {
    try {
      const taskBefore = get().tasks.find((t) => t.id === id);

      await toggleTaskComplete(id, completed);
      const now = new Date().toISOString();
      set((state) => ({
        lastFetchedAt: Date.now(),
        tasks: state.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                completed,
                updatedAt: now,
                completedAt: completed ? now : undefined,
              }
            : t,
        ),
      }));

      if (completed) {
        cancelTaskNotifications(id).catch(() => {});

        if (taskBefore?.type === 'recurring') {
          saveTaskCompletion({
            ...taskBefore,
            completed: true,
            updatedAt: now,
            completedAt: now,
          }).catch(() => {});
        }

        const config = await getGamificationConfig();
        await awardProductiveAction(
          'task_completion',
          id,
          pointsForTaskLevel(taskBefore?.scoreLevel, config),
          { metadata: { scoreLevel: taskBefore?.scoreLevel ?? 1 } },
        );
        await useGamificationStore.getState().refreshSummary();
      } else {
        await reverseLatestProductiveAction('task_completion', id);
        await useGamificationStore.getState().refreshSummary();
      }
    } catch (e) {
      throw e;
    }
  },

  skipRecurringOccurrence: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.type !== 'recurring') return;
    await skipTaskOccurrence(id);
    const today = localDateStr();
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, skippedDate: today } : t)),
      lastFetchedAt: Date.now(),
    }));
  },

  toggleSubtask: async (taskId, subtaskId, completed) => {
    try {
      await toggleSubtaskComplete(subtaskId, completed);
      set((state) => ({
        lastFetchedAt: Date.now(),
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks?.map((s) => (s.id === subtaskId ? { ...s, completed } : s)),
              }
            : t,
        ),
      }));
    } catch {}
  },
}));
