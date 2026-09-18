import { create } from 'zustand';
import { useGamificationStore } from '@/store/gamificationStore';
import type { Goal, LocalGoalTask } from '@/types/goal.types';
import {
  getAllGoals,
  getActiveGoalCount,
  getTodayGoalTasks,
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
  type GoalTaskForToday,
} from '@/database/queries/goals.queries';

import { calcGoalProgress } from '@/services/goals.service';
import {
  grantUniqueAchievement,
  awardProductiveAction,
  getGamificationConfig,
  pointsForTaskLevel,
  reverseLatestProductiveAction,
} from '@/services/gamification.service';

function calcGoalProgressSafe(goal: Goal): number {
  return calcGoalProgress(goal);
}

const pendingGoalTasks = new Set<string>();

interface GoalState {
  goals: Goal[];
  todayGoalTasks: GoalTaskForToday[];
  loading: boolean;
  activeGoalCount: number;
  lastFetchedAt: number;

  fetchGoals: (force?: boolean) => Promise<void>;
  fetchActiveGoalCount: () => Promise<void>;
  fetchTodayGoalTasks: (force?: boolean) => Promise<void>;
  addGoal: (
    data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'order'>,
    tasks: LocalGoalTask[],
  ) => Promise<Goal>;
  editGoal: (
    id: string,
    data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'order'>,
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
  completeTask: (goalId: string, taskId: string) => Promise<void>;
  uncompleteTask: (goalId: string, taskId: string) => Promise<void>;
  refreshTodayTasks: () => Promise<void>;
  reorderGoals: (orderedIds: string[]) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  todayGoalTasks: [],
  loading: false,
  activeGoalCount: 0,
  lastFetchedAt: 0,

  fetchGoals: async (force = false) => {
    const now = Date.now();
    if (!force && now - get().lastFetchedAt < 10000) return;
    set({ loading: true });
    try {
      const [goals, today] = await Promise.all([getAllGoals(), getTodayGoalTasks()]);
      const activeGoalCount = goals.filter(
        (goal) =>
          !goal.archived &&
          goal.startDate <= new Date().toISOString().slice(0, 10) &&
          goal.endDate >= new Date().toISOString().slice(0, 10),
      ).length;
      set({
        goals,
        todayGoalTasks: today,
        activeGoalCount,
        loading: false,
        lastFetchedAt: Date.now(),
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchActiveGoalCount: async () => {
    try {
      set({ activeGoalCount: await getActiveGoalCount() });
    } catch {}
  },

  fetchTodayGoalTasks: async (force = false) => {
    if (!force && Date.now() - get().lastFetchedAt < 5000) return;
    try {
      const today = await getTodayGoalTasks();
      set({ todayGoalTasks: today });
    } catch {}
  },

  addGoal: async (data, tasks): Promise<Goal> => {
    const goal = await createGoal(data, tasks);
    set((s) => ({ goals: [goal, ...s.goals], lastFetchedAt: Date.now() }));
    await get().fetchActiveGoalCount();
    await get().refreshTodayTasks();
    return goal;
  },

  editGoal: async (id, data) => {
    await updateGoal(id, data);
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)),
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
    await archiveGoal(id);
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, archived: true } : g)),
      lastFetchedAt: Date.now(),
      activeGoalCount: Math.max(0, s.activeGoalCount - 1),
    }));
    await get().refreshTodayTasks();
  },

  enableBeyond100: async (id, value) => {
    await setAllowBeyond100(id, value);
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, allowBeyond100: value } : g)),
    }));
  },

  addTask: async (goalId, startDate, endDate, local) => {
    const task = await addGoalTask(goalId, startDate, endDate, local);
    set((s) => ({
      goals: s.goals.map((g) => (g.id === goalId ? { ...g, tasks: [...g.tasks, task] } : g)),
      lastFetchedAt: Date.now(),
    }));
    await get().refreshTodayTasks();
  },

  removeTask: async (goalId, taskId) => {
    await deleteGoalTask(taskId);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g,
      ),
      lastFetchedAt: Date.now(),
    }));
    await get().refreshTodayTasks();
  },

  completeTask: async (goalId, taskId) => {
    const key = `${goalId}:${taskId}`;
    if (pendingGoalTasks.has(key)) return;

    const beforeGoal = get().goals.find((g) => g.id === goalId);
    const beforeTask = beforeGoal?.tasks.find((t) => t.id === taskId);
    if (!beforeTask || beforeTask.type === 'notebook' || beforeTask.completedToday) return;

    pendingGoalTasks.add(key);
    const previousGoals = get().goals;
    try {
      const inserted = await completeGoalTaskForToday(taskId);
      if (!inserted) {
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

      const config = await getGamificationConfig();
      await awardProductiveAction(
        'goal_task_completion',
        taskId,
        pointsForTaskLevel(undefined, config),
        { metadata: { goalId } },
      );
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
      set({ goals: previousGoals });
      throw error;
    } finally {
      pendingGoalTasks.delete(key);
    }
  },

  uncompleteTask: async (goalId, taskId) => {
    const beforeGoal = get().goals.find((g) => g.id === goalId);
    const beforeTask = beforeGoal?.tasks.find((t) => t.id === taskId);
    if (!beforeTask || !beforeTask.completedToday) return;
    const previousGoals = get().goals;

    try {
      await uncompleteGoalTaskForToday(taskId);
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
                        completedToday: false,
                        completionsThisWeek: Math.max(0, t.completionsThisWeek - 1),
                        completionsThisMonth: Math.max(0, t.completionsThisMonth - 1),
                      }
                    : t,
                ),
              }
            : g,
        ),
      }));
      await reverseLatestProductiveAction('goal_task_completion', taskId);
      await get().refreshTodayTasks();
      await useGamificationStore.getState().refreshSummary();
    } catch (error) {
      set({ goals: previousGoals });
      throw error;
    }
  },

  refreshTodayTasks: async () => {
    const today = await getTodayGoalTasks();
    set({ todayGoalTasks: today });
  },

  reorderGoals: async (orderedIds) => {
    set((s) => {
      const byId = new Map(s.goals.map((g) => [g.id, g]));
      const reordered = orderedIds
        .map((id, index) => {
          const g = byId.get(id);
          return g ? { ...g, order: index } : null;
        })
        .filter((g): g is Goal => g !== null);
      const untouched = s.goals.filter((g) => !orderedIds.includes(g.id));
      return { goals: [...reordered, ...untouched].sort((a, b) => a.order - b.order) };
    });
    await reorderGoals(orderedIds);
  },
}));
