import { create } from 'zustand';
import { useGamificationStore } from '@/store/gamificationStore';
import type { Task } from '@/types/task.types';
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleSubtaskComplete,
  resetRecurringTaskOccurrence,
  skipTaskOccurrence,
} from '@/database/queries/tasks.queries';
import { updateTaskCompletionWithHistory } from '@/database/queries/taskHistory.queries';
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
    const taskBefore = get().tasks.find((task) => task.id === id);
    if (!taskBefore) throw new Error(`TASK_NOT_FOUND:${id}`);

    const startsNextOccurrence =
      completed && getRecurringTasksToReset([taskBefore], localDateStr()).length > 0;

    const result = await updateTaskCompletionWithHistory(
      id,
      completed,
      startsNextOccurrence
        ? { resetCompletedOccurrence: { expectedCompletedAt: taskBefore.completedAt ?? null } }
        : undefined,
    );

    if (completed && !result.historyRecord) {
      throw new Error(`TASK_COMPLETION_HISTORY_MISSING:${id}`);
    }

    if (!result.changed && !result.historyCreated && !completed) return;
    if (!result.changed && !result.historyCreated && completed) return;

    taskMutationVersion += 1;
    set((state) => ({
      lastFetchedAt: Date.now(),
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completed,
              updatedAt: result.updatedAt,
              completedAt: result.completedAt ?? undefined,
              ...(startsNextOccurrence
                ? {
                    subtasks: task.subtasks?.map((subtask) => ({
                      ...subtask,
                      completed: false,
                    })),
                  }
                : {}),
            }
          : task,
      ),
    }));

    if (completed) {
      void cancelTaskNotifications(id).catch((error) => {
        console.error('[taskStore.toggleComplete] Não foi possível cancelar notificações:', error);
      });

      if (result.historyCreated && result.historyRecord) {
        const config = await getGamificationConfig();
        await awardProductiveAction(
          'task_completion',
          result.historyRecord.id,
          pointsForTaskLevel(taskBefore.scoreLevel, config),
          {
            metadata: {
              taskId: id,
              taskType: taskBefore.type,
              completionId: result.historyRecord.id,
              scoreLevel: taskBefore.scoreLevel ?? 1,
            },
          },
        );
      }
    } else {
      let legacyRewardNeedsReversal = result.removedHistoryRecords.length === 0;

      for (const removedRecord of result.removedHistoryRecords) {
        if (removedRecord.id.startsWith('tc:')) {
          await reverseLatestProductiveAction('task_completion', removedRecord.id);
        } else {
          legacyRewardNeedsReversal = true;
        }
      }

      if (legacyRewardNeedsReversal && taskBefore.completedAt) {
        await reverseLatestProductiveAction('task_completion', id);
      }
    }

    await useGamificationStore.getState().refreshSummary();
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
