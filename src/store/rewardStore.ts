import { create } from 'zustand';
import type { Reward } from '@/types/reward.types';
import type { FocusSession } from '@/types/focus.types';
import type { Task } from '@/types/task.types';
import type { Goal } from '@/types/goal.types';
import {
  getAllRewards,
  createReward,
  updateReward,
  unlockReward,
  deleteReward,
} from '@/database/queries/rewards.queries';

import { checkRewardCondition } from '@/services/rewards.service';

interface RewardState {
  rewards: Reward[];
  loading: boolean;

  fetchRewards: () => Promise<void>;
  addReward: (
    data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt'>,
  ) => Promise<Reward>;
  removeReward: (id: string) => Promise<void>;
  checkAndUnlock: (sessions: FocusSession[], tasks: Task[], goals: Goal[]) => Promise<Reward[]>;
  editReward: (
    id: string,
    data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt'>,
  ) => Promise<void>;
}

export const useRewardStore = create<RewardState>((set, get) => ({
  rewards: [],
  loading: false,

  fetchRewards: async () => {
    set({ loading: true });
    try {
      const rewards = await getAllRewards();
      set({ rewards, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addReward: async (data) => {
    const reward = await createReward(data);
    set((state) => ({ rewards: [...state.rewards, reward] }));
    return reward;
  },

  removeReward: async (id) => {
    await deleteReward(id);
    set((state) => ({ rewards: state.rewards.filter((r) => r.id !== id) }));
  },

  checkAndUnlock: async (sessions, tasks, goals) => {
    const newlyUnlocked: Reward[] = [];

    for (const reward of get().rewards) {
      if (reward.unlocked) continue;
      if (checkRewardCondition(reward, sessions, tasks, goals)) {
        await unlockReward(reward.id);
        newlyUnlocked.push(reward);
      }
    }

    if (newlyUnlocked.length > 0) {
      set((state) => ({
        rewards: state.rewards.map((r) =>
          newlyUnlocked.find((u) => u.id === r.id)
            ? { ...r, unlocked: true, unlockedAt: new Date().toISOString() }
            : r,
        ),
      }));
    }

    return newlyUnlocked;
  },

  editReward: async (id, data) => {
    await updateReward(id, data);
    set((state) => ({
      rewards: state.rewards.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
  },
}));
