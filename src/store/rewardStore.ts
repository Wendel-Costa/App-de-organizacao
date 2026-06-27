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
  archiveReward,
  unarchiveReward,
  deleteReward,
  reorderRewards,
} from '@/database/queries/rewards.queries';

import { checkRewardCondition } from '@/services/rewards.service';

interface RewardState {
  rewards: Reward[];
  loading: boolean;

  fetchRewards: () => Promise<void>;
  addReward: (
    data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt' | 'archived' | 'order'>,
  ) => Promise<Reward>;
  removeReward: (id: string) => Promise<void>;
  checkAndUnlock: (sessions: FocusSession[], tasks: Task[], goals: Goal[]) => Promise<Reward[]>;
  editReward: (
    id: string,
    data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt' | 'archived' | 'order'>,
  ) => Promise<void>;
  archiveReward: (id: string) => Promise<void>;
  unarchiveReward: (id: string) => Promise<void>;
  reorderRewards: (orderedIds: string[]) => Promise<void>;
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

  archiveReward: async (id) => {
    await archiveReward(id);
    set((state) => ({
      rewards: state.rewards.map((r) => (r.id === id ? { ...r, archived: true } : r)),
    }));
  },

  unarchiveReward: async (id) => {
    await unarchiveReward(id);
    set((state) => ({
      rewards: state.rewards.map((r) => (r.id === id ? { ...r, archived: false } : r)),
    }));
  },

  reorderRewards: async (orderedIds) => {
    set((state) => {
      const byId = new Map(state.rewards.map((r) => [r.id, r]));
      const reordered = orderedIds
        .map((id, index) => {
          const r = byId.get(id);
          return r ? { ...r, order: index } : null;
        })
        .filter((r): r is Reward => r !== null);
      const untouched = state.rewards.filter((r) => !orderedIds.includes(r.id));
      return { rewards: [...reordered, ...untouched].sort((a, b) => a.order - b.order) };
    });
    await reorderRewards(orderedIds);
  },
}));
