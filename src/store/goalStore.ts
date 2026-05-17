import { create } from 'zustand';
import type { Goal, GoalTask, LocalGoalTask } from '@/types/goal.types';
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
  type GoalTaskForToday,
} from '@/database/queries/goals.queries';

interface GoalState {
  goals: Goal[];
  todayGoalTasks: GoalTaskForToday[];
  loading: boolean;

  fetchGoals: () => Promise<void>;
  addGoal: (
    data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>,
    tasks: LocalGoalTask[],
  ) => Promise<Goal>;
  removeGoal: (id: string) => Promise<void>;
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
  editGoal: (
    id: string,
    data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>,
  ) => Promise<void>;
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
    set((state) => ({ goals: [goal, ...state.goals] }));
    await get().refreshTodayTasks();
    return goal;
  },

  editGoal: async (id: string, data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>) => {
    await updateGoal(id, data);
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...data } : g)),
    }));
  },

  removeGoal: async (id) => {
    await deleteGoal(id);
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
    await get().refreshTodayTasks();
  },

  addTask: async (goalId, startDate, endDate, local) => {
    const task = await addGoalTask(goalId, startDate, endDate, local);
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goalId ? { ...g, tasks: [...g.tasks, task] } : g)),
    }));
    await get().refreshTodayTasks();
  },

  removeTask: async (goalId, taskId) => {
    await deleteGoalTask(taskId);
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === goalId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g,
      ),
    }));
    await get().refreshTodayTasks();
  },

  completeTask: async (goalId, taskId) => {
    await completeGoalTaskForToday(taskId);
    set((state) => ({
      goals: state.goals.map((g) =>
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
    set((state) => ({
      goals: state.goals.map((g) =>
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
}));
