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
  resetRecurringTaskOccurrence,
  skipTaskOccurrence,
} from '@/database/queries/tasks.queries';
import { saveTaskCompletion } from '@/database/queries/taskHistory.queries';
import { getRecurringTasksToReset } from '@/services/recurrence.service';
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
let taskMutationVersion = 0;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  lastFetchedAt: 0,
  lastRecurrenceSyncDate: null,

  fetchTasks: async (force = false) => {
    const today = localDateStr();
    const recurrenceAlreadySynced = get().lastRecurrenceSyncDate === today;

    if (!force && recurrenceAlreadySynced && Date.now() - get().lastFetchedAt < 10000) {
      return;
    }
    if (tasksFetchPromise) return tasksFetchPromise;

    const fetchMutationVersion = taskMutationVersion;

    tasksFetchPromise = (async () => {
      set({ loading: true });
      try {
        let tasks = await getAllTasks();
        const shouldSyncRecurrence = force || get().lastRecurrenceSyncDate !== today;

        if (shouldSyncRecurrence) {
          let recurrenceChanged = false;
          const tasksToReset = getRecurringTasksToReset(tasks, today);

          for (const task of tasksToReset) {
            const reset = await resetRecurringTaskOccurrence(task.id, task.completedAt ?? null);
            recurrenceChanged = recurrenceChanged || reset;
          }

          if (recurrenceChanged) {
            tasks = await getAllTasks();
          }
        }

        // A fetch that started before a successful mutation must not replace newer Zustand data.
        if (fetchMutationVersion !== taskMutationVersion) {
          set({ loading: false });
          return;
        }

        set({
          tasks,
          loading: false,
          lastFetchedAt: Date.now(),
          ...(shouldSyncRecurrence ? { lastRecurrenceSyncDate: today } : {}),
        });
      } catch (error) {
        console.error('[taskStore.fetchTasks] Não foi possível atualizar as tarefas:', error);
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
      taskMutationVersion += 1;
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
      taskMutationVersion += 1;
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
      taskMutationVersion += 1;
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
      const taskBefore = get().tasks.find((task) => task.id === id);
      const startsNextOccurrence =
        completed &&
        taskBefore !== undefined &&
        getRecurringTasksToReset([taskBefore], localDateStr()).length > 0;

      if (startsNextOccurrence && taskBefore) {
        const reset = await resetRecurringTaskOccurrence(id, taskBefore.completedAt ?? null);
        if (reset) {
          taskMutationVersion += 1;
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id
                ? {
                    ...task,
                    completed: false,
                    completedAt: undefined,
                    subtasks: task.subtasks?.map((subtask) => ({
                      ...subtask,
                      completed: false,
                    })),
                  }
                : task,
            ),
          }));
        }
      }

      const taskForCompletion =
        startsNextOccurrence && taskBefore
          ? {
              ...taskBefore,
              completed: false,
              completedAt: undefined,
              subtasks: taskBefore.subtasks?.map((subtask) => ({
                ...subtask,
                completed: false,
              })),
            }
          : taskBefore;

      await toggleTaskComplete(id, completed);
      taskMutationVersion += 1;
      const now = new Date().toISOString();
      set((state) => ({
        lastFetchedAt: Date.now(),
        tasks: state.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                ...(startsNextOccurrence
                  ? {
                      subtasks: task.subtasks?.map((subtask) => ({
                        ...subtask,
                        completed: false,
                      })),
                    }
                  : {}),
                completed,
                updatedAt: now,
                completedAt: completed ? now : undefined,
              }
            : task,
        ),
      }));

      if (completed) {
        cancelTaskNotifications(id).catch(() => {});

        if (taskForCompletion?.type === 'recurring') {
          saveTaskCompletion({
            ...taskForCompletion,
            completed: true,
            updatedAt: now,
            completedAt: now,
          }).catch(() => {});
        }

        const config = await getGamificationConfig();
        await awardProductiveAction(
          'task_completion',
          id,
          pointsForTaskLevel(taskForCompletion?.scoreLevel, config),
          { metadata: { scoreLevel: taskForCompletion?.scoreLevel ?? 1 } },
        );
        await useGamificationStore.getState().refreshSummary();
      } else {
        await reverseLatestProductiveAction('task_completion', id);
        await useGamificationStore.getState().refreshSummary();
      }
    } catch (error) {
      throw error;
    }
  },

  skipRecurringOccurrence: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.type !== 'recurring') return;
    await skipTaskOccurrence(id);
    taskMutationVersion += 1;
    const today = localDateStr();
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, skippedDate: today } : t)),
      lastFetchedAt: Date.now(),
    }));
  },

  toggleSubtask: async (taskId, subtaskId, completed) => {
    const taskBefore = get().tasks.find((task) => task.id === taskId);
    const startsNextOccurrence =
      taskBefore !== undefined && getRecurringTasksToReset([taskBefore], localDateStr()).length > 0;

    if (startsNextOccurrence && taskBefore) {
      const reset = await resetRecurringTaskOccurrence(taskId, taskBefore.completedAt ?? null);
      if (reset) {
        taskMutationVersion += 1;
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  completed: false,
                  completedAt: undefined,
                  subtasks: task.subtasks?.map((subtask) => ({ ...subtask, completed: false })),
                }
              : task,
          ),
        }));
      }
    }

    await toggleSubtaskComplete(subtaskId, completed);
    taskMutationVersion += 1;

    set((state) => ({
      lastFetchedAt: Date.now(),
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...(startsNextOccurrence
                ? {
                    completed: false,
                    completedAt: undefined,
                    subtasks: task.subtasks?.map((subtask) => ({
                      ...subtask,
                      completed: subtask.id === subtaskId ? completed : false,
                    })),
                  }
                : {
                    subtasks: task.subtasks?.map((subtask) =>
                      subtask.id === subtaskId ? { ...subtask, completed } : subtask,
                    ),
                  }),
            }
          : task,
      ),
    }));
  },
}));
