import { create } from 'zustand';
import type { Goal, LocalGoalTask } from '@/types/goal.types';
import {
  getAllGoals,
  createGoal,
  deleteGoal,
  addGoalTask,
  deleteGoalTask,
  completeGoalTaskForToday,
  uncompleteGoalTaskForToday,
  getGoalTasksForToday,
  updateGoal,
  archiveGoal,
  setAllowBeyond100,
  reorderGoals,
  type GoalTaskForToday,
} from '@/database/queries/goals.queries';

interface GoalState {
  goals: Goal[];
  todayGoalTasks: GoalTaskForToday[];
  loading: boolean;

  fetchGoals: () => Promise<void>;
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

  fetchGoals: async () => {
    set({ loading: true });
    try {
      const goals = await getAllGoals();
      const today = await getGoalTasksForToday(goals);
      set({ goals, todayGoalTasks: today, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addGoal: async (data, tasks): Promise<Goal> => {
    const goal = await createGoal(data, tasks);
    set((s) => ({ goals: [goal, ...s.goals] }));
    await get().refreshTodayTasks();
    return goal;
  },

  editGoal: async (id, data) => {
    await updateGoal(id, data);
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)) }));
  },

  removeGoal: async (id) => {
    await deleteGoal(id);
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    await get().refreshTodayTasks();
  },

  archiveGoal: async (id) => {
    await archiveGoal(id);
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, archived: true } : g)) }));
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
    }));
    await get().refreshTodayTasks();
  },

  removeTask: async (goalId, taskId) => {
    await deleteGoalTask(taskId);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g,
      ),
    }));
    await get().refreshTodayTasks();
  },

  completeTask: async (goalId, taskId) => {
    await completeGoalTaskForToday(taskId);
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
    await get().refreshTodayTasks();
  },

  uncompleteTask: async (goalId, taskId) => {
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
    await get().refreshTodayTasks();
  },

  refreshTodayTasks: async () => {
    const today = await getGoalTasksForToday(get().goals);
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
