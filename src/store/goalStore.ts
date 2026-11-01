import { create } from 'zustand';
import { useGamificationStore } from '@/store/gamificationStore';
import type { Goal, GoalTaskForToday, LocalGoalTask } from '@/types/goal.types';
import {
  getAllGoals,
  getActiveGoalCount,
  getTodayGoalTasks,
  getGoalTasksForToday,
  createGoal,
  deleteGoal,
  addGoalTask,
  deleteGoalTask,
  completeGoalTaskForToday,
  uncompleteGoalTaskForToday,
  updateGoal,
  archiveGoal,
  setAllowBeyond100,
  reorderGoals,
  deleteGoalTaskCompletion,
} from '@/database/queries/goals.queries';

import { calcGoalProgress } from '@/services/goals.service';
import {
  grantUniqueAchievement,
  awardGoalTaskCompletion,
  getGamificationConfig,
  pointsForTaskLevel,
  reverseGoalTaskCompletion,
} from '@/services/gamification.service';

function calcGoalProgressSafe(goal: Goal): number {
  return calcGoalProgress(goal);
}

const pendingGoalTasks = new Set<string>();
let goalsFetchPromise: Promise<void> | null = null;
let todayGoalTasksFetchPromise: Promise<void> | null = null;
let activeGoalCountFetchPromise: Promise<void> | null = null;
let lastActiveGoalCountFetchedAt = 0;

interface GoalState {
  goals: Goal[];
  todayGoalTasks: GoalTaskForToday[];
  loading: boolean;
  activeGoalCount: number;
  lastFetchedAt: number;
  lastTodayFetchedAt: number;

  fetchGoals: (force?: boolean) => Promise<void>;
  fetchActiveGoalCount: () => Promise<void>;
  fetchTodayGoalTasks: (force?: boolean) => Promise<void>;
  addGoal: (
    data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'order' | 'archivedAt'>,
    tasks: LocalGoalTask[],
  ) => Promise<Goal>;
  editGoal: (
    id: string,
    data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'order' | 'archivedAt'>,
  ) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  enableBeyond100: (id: string, value: boolean) => Promise<void>;
  addTask: (
    goalId: string,
    startDate: string,
    endDate: string,
    local: LocalGoalTask,
  ) => Promise<void>;
  removeTask: (goalId: string, taskId: string) => Promise<void>;
  completeTask: (goalId: string, taskId: string, allowMultipleToday?: boolean) => Promise<void>;
  uncompleteTask: (goalId: string, taskId: string) => Promise<void>;
  refreshTodayTasks: () => Promise<void>;
  updateNotebookFactorProgress: (
    notebookId: string,
    totalTopics: number,
    completedTopics: number,
  ) => void;
  reorderGoals: (orderedIds: string[]) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  todayGoalTasks: [],
  loading: false,
  activeGoalCount: 0,
  lastFetchedAt: 0,
  lastTodayFetchedAt: 0,

  fetchGoals: async (force = false) => {
    const now = Date.now();

    if (!force && now - get().lastFetchedAt < 10000) {
      return;
    }

    if (goalsFetchPromise) {
      return goalsFetchPromise;
    }

    goalsFetchPromise = (async () => {
      set({ loading: true });
      try {
        const goals = await getAllGoals();
        const today = await getGoalTasksForToday(goals);
        const currentDate = new Date().toISOString().slice(0, 10);
        const activeGoalCount = goals.filter(
          (goal) => !goal.archived && goal.startDate <= currentDate && goal.endDate >= currentDate,
        ).length;
        const fetchedAt = Date.now();
        set({
          goals,
          todayGoalTasks: today,
          activeGoalCount,
          loading: false,
          lastFetchedAt: fetchedAt,
          lastTodayFetchedAt: fetchedAt,
        });
      } catch {
        set({ loading: false });
      }
    })();

    try {
      await goalsFetchPromise;
    } finally {
      goalsFetchPromise = null;
    }
  },

  fetchActiveGoalCount: async () => {
    if (Date.now() - lastActiveGoalCountFetchedAt < 5000) return;
    if (activeGoalCountFetchPromise) return activeGoalCountFetchPromise;

    activeGoalCountFetchPromise = (async () => {
      try {
        set({
          activeGoalCount: await getActiveGoalCount(),
        });
        lastActiveGoalCountFetchedAt = Date.now();
      } catch {}
    })();

    try {
      await activeGoalCountFetchPromise;
    } finally {
      activeGoalCountFetchPromise = null;
    }
  },

  fetchTodayGoalTasks: async (force = false) => {
    const now = Date.now();
    if (!force && now - get().lastTodayFetchedAt < 5000) {
      return;
    }

    if (todayGoalTasksFetchPromise) {
      return todayGoalTasksFetchPromise;
    }

    todayGoalTasksFetchPromise = (async () => {
      try {
        const state = get();
        const today =
          state.lastFetchedAt > 0 && Date.now() - state.lastFetchedAt < 10000
            ? await getGoalTasksForToday(state.goals)
            : await getTodayGoalTasks();

        set({
          todayGoalTasks: today,
          lastTodayFetchedAt: Date.now(),
        });
      } catch {}
    })();

    try {
      await todayGoalTasksFetchPromise;
    } finally {
      todayGoalTasksFetchPromise = null;
    }
  },

  addGoal: async (data, tasks): Promise<Goal> => {
    const goal = await createGoal(data, tasks);

    set((s) => ({
      goals: [goal, ...s.goals],
      lastFetchedAt: Date.now(),
    }));

    await get().fetchActiveGoalCount();
    await get().refreshTodayTasks();
    return goal;
  },

  editGoal: async (id, data) => {
    await updateGoal(id, data);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              ...data,
            }
          : g,
      ),
      lastFetchedAt: Date.now(),
    }));
  },

  removeGoal: async (id) => {
    await deleteGoal(id);
    set((s) => ({
      goals: s.goals.filter((g) => g.id !== id),
      lastFetchedAt: Date.now(),
      activeGoalCount: Math.max(0, s.activeGoalCount - 1),
    }));
    await get().refreshTodayTasks();
  },

  archiveGoal: async (id) => {
    const archivedAt = await archiveGoal(id);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              archived: true,
              archivedAt,
            }
          : g,
      ),
      lastFetchedAt: Date.now(),
      activeGoalCount: Math.max(0, s.activeGoalCount - 1),
    }));
    await get().refreshTodayTasks();
  },

  enableBeyond100: async (id, value) => {
    await setAllowBeyond100(id, value);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              allowBeyond100: value,
            }
          : g,
      ),
    }));
  },

  addTask: async (goalId, startDate, endDate, local) => {
    const task = await addGoalTask(goalId, startDate, endDate, local);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              tasks: [...g.tasks, task],
            }
          : g,
      ),
      lastFetchedAt: Date.now(),
    }));
    await get().refreshTodayTasks();
  },

  removeTask: async (goalId, taskId) => {
    await deleteGoalTask(taskId);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              tasks: g.tasks.filter((t) => t.id !== taskId),
            }
          : g,
      ),
      lastFetchedAt: Date.now(),
    }));
    await get().refreshTodayTasks();
  },

  completeTask: async (goalId, taskId, allowMultipleToday = false) => {
    const key = `${goalId}:${taskId}`;
    if (!allowMultipleToday && pendingGoalTasks.has(key)) {
      return;
    }

    const beforeGoal = get().goals.find((g) => g.id === goalId);
    const beforeTask = beforeGoal?.tasks.find((t) => t.id === taskId);

    if (!beforeTask || beforeTask.type === 'notebook') {
      return;
    }

    if (!allowMultipleToday && beforeTask.completedToday) {
      return;
    }

    if (!allowMultipleToday) {
      pendingGoalTasks.add(key);
    }

    const previousGoals = get().goals;
    try {
      const completionId = await completeGoalTaskForToday(taskId, allowMultipleToday);

      if (!completionId) {
        await get().refreshTodayTasks();
        return;
      }

      const beforeProgress = beforeGoal ? calcGoalProgressSafe(beforeGoal) : 0;
      set((s) => ({
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                tasks: g.tasks.map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        completedCount: t.completedCount + 1,
                        completedToday: true,
                        completionsThisWeek: t.completionsThisWeek + 1,
                        completionsThisMonth: t.completionsThisMonth + 1,
                      }
                    : t,
                ),
              }
            : g,
        ),
      }));

      try {
        const config = await getGamificationConfig();

        const points = pointsForTaskLevel(undefined, config);
        await awardGoalTaskCompletion(taskId, completionId, points, goalId);
      } catch (rewardError) {
        await deleteGoalTaskCompletion(completionId);

        throw rewardError;
      }

      await get().refreshTodayTasks();

      const afterGoal = get().goals.find((g) => g.id === goalId);
      if (afterGoal) {
        const afterProgress = calcGoalProgressSafe(afterGoal);
        if (beforeProgress < 1 && afterProgress >= 1) {
          await grantUniqueAchievement('goal_completion', goalId);
        }
      }
      await useGamificationStore.getState().refreshSummary();
    } catch (error) {
      set({
        goals: previousGoals,
      });

      throw error;
    } finally {
      if (!allowMultipleToday) {
        pendingGoalTasks.delete(key);
      }
    }
  },

  uncompleteTask: async (goalId, taskId) => {
    const beforeGoal = get().goals.find((g) => g.id === goalId);
    const beforeTask = beforeGoal?.tasks.find((t) => t.id === taskId);

    if (!beforeTask || !beforeTask.completedToday) {
      return;
    }

    const previousGoals = get().goals;

    try {
      const result = await uncompleteGoalTaskForToday(taskId);

      if (!result.completionId) {
        return;
      }

      set((s) => ({
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                tasks: g.tasks.map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        completedCount: Math.max(0, t.completedCount - 1),
                        completedToday: result.remainingCompletionsToday > 0,
                        completionsThisWeek: Math.max(0, t.completionsThisWeek - 1),
                        completionsThisMonth: Math.max(0, t.completionsThisMonth - 1),
                      }
                    : t,
                ),
              }
            : g,
        ),
      }));

      await reverseGoalTaskCompletion(taskId, result.completionId);

      await get().refreshTodayTasks();
      await useGamificationStore.getState().refreshSummary();
    } catch (error) {
      set({
        goals: previousGoals,
      });

      throw error;
    }
  },

  refreshTodayTasks: async () => {
    const today = await getGoalTasksForToday(get().goals);

    set({
      todayGoalTasks: today,
      lastTodayFetchedAt: Date.now(),
    });
  },

  updateNotebookFactorProgress: (notebookId, totalTopics, completedTopics) => {
    const progress = totalTopics > 0 ? completedTopics / totalTopics : 0;

    set((state) => ({
      goals: state.goals.map((goal) => ({
        ...goal,
        tasks: goal.tasks.map((task) =>
          task.type === 'notebook' && task.notebookId === notebookId
            ? {
                ...task,
                targetCount: 1,
                completedCount: progress,
                completedToday: false,
              }
            : task,
        ),
      })),
      todayGoalTasks: state.todayGoalTasks.map((entry) =>
        entry.task.type === 'notebook' && entry.task.notebookId === notebookId
          ? {
              ...entry,
              task: {
                ...entry.task,
                targetCount: 1,
                completedCount: progress,
                completedToday: false,
              },
              isDue: progress < 1,
            }
          : entry,
      ),
      lastTodayFetchedAt: Date.now(),
    }));
  },

  reorderGoals: async (orderedIds) => {
    set((s) => {
      const byId = new Map(s.goals.map((g) => [g.id, g]));
      const reordered = orderedIds
        .map((id, index) => {
          const g = byId.get(id);

          return g
            ? {
                ...g,
                order: index,
              }
            : null;
        })
        .filter((g): g is Goal => g !== null);
      const untouched = s.goals.filter((g) => !orderedIds.includes(g.id));

      return {
        goals: [...reordered, ...untouched].sort((a, b) => a.order - b.order),
      };
    });
    await reorderGoals(orderedIds);
  },
}));
