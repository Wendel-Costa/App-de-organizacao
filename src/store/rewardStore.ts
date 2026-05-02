import { create } from 'zustand';
import type { Reward } from '@/types/reward.types';
import type { FocusSession } from '@/types/focus.types';
import type { Task } from '@/types/task.types';
import {
  getAllRewards,
  createReward,
  unlockReward,
  deleteReward,
} from '@/database/queries/rewards.queries';
import { checkRewardCondition } from '@/services/rewards.service';

interface RewardState {
  rewards: Reward[];
  loading: boolean;

  fetchRewards: () => Promise<void>;
  addReward: (data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt'>) => Promise<void>;
  removeReward: (id: string) => Promise<void>;
  checkAndUnlock: (sessions: FocusSession[], tasks: Task[]) => Promise<Reward[]>;
}

export const useRewardStore = create<RewardState>((set, get) => ({
  rewards: [],
  loading: false,

  fetchRewards: async () => {
    set({ loading: true });
    const rewards = await getAllRewards();
    set({ rewards, loading: false });
  },

  addReward: async (data) => {
    const reward = await createReward(data);
    set((state) => ({ rewards: [...state.rewards, reward] }));
  },

  removeReward: async (id) => {
    await deleteReward(id);
    set((state) => ({ rewards: state.rewards.filter((r) => r.id !== id) }));
  },

  checkAndUnlock: async (sessions, tasks) => {
    const { rewards } = get();
    const newlyUnlocked: Reward[] = [];

    for (const reward of rewards) {
      if (reward.unlocked) continue;
      const met = checkRewardCondition(reward, sessions, tasks);
      if (met) {
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
}));
