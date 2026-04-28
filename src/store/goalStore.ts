import { create } from 'zustand';
import type { Goal, GoalTask } from '@/types/goal.types';
import {
  getAllGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalTask,
  incrementGoalTask,
  decrementGoalTask,
  deleteGoalTask,
} from '@/database/queries/goals.queries';

interface GoalState {
  goals: Goal[];
  loading: boolean;

  fetchGoals: () => Promise<void>;
  addGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>) => Promise<void>;
  editGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addTask: (data: Omit<GoalTask, 'id' | 'completedCount'>) => Promise<void>;
  incrementTask: (goalId: string, taskId: string) => Promise<void>;
  decrementTask: (goalId: string, taskId: string) => Promise<void>;
  removeTask: (goalId: string, taskId: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,

  fetchGoals: async () => {
    set({ loading: true });
    const goals = await getAllGoals();
    set({ goals, loading: false });
  },

  addGoal: async (data) => {
    const goal = await createGoal(data);
    set((state) => ({ goals: [goal, ...state.goals] }));
  },

  editGoal: async (id, data) => {
    await updateGoal(id, data);
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...data } : g)),
    }));
  },

  removeGoal: async (id) => {
    await deleteGoal(id);
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },

  addTask: async (data) => {
    const task = await addGoalTask(data);
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === data.goalId ? { ...g, tasks: [...g.tasks, task] } : g,
      ),
    }));
  },

  incrementTask: async (goalId, taskId) => {
    await incrementGoalTask(taskId);
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, completedCount: Math.min(t.completedCount + 1, t.targetCount) }
                  : t,
              ),
            }
          : g,
      ),
    }));
  },

  decrementTask: async (goalId, taskId) => {
    await decrementGoalTask(taskId);
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === taskId ? { ...t, completedCount: Math.max(t.completedCount - 1, 0) } : t,
              ),
            }
          : g,
      ),
    }));
  },

  removeTask: async (goalId, taskId) => {
    await deleteGoalTask(taskId);
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === goalId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g,
      ),
    }));
  },
}));
