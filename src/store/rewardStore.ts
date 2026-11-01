import { create } from 'zustand';
import { useGamificationStore } from '@/store/gamificationStore';
import type { Reward, RewardPurchase } from '@/types/reward.types';
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
  getAllPurchasableRewards,
  createPurchasableReward,
  updatePurchasableReward,
  deletePurchasableReward,
  archivePurchasableReward,
  getAllRewardPurchases,
  archiveRewardPurchase,
} from '@/database/queries/rewards.queries';

import { checkRewardCondition } from '@/services/rewards.service';
import { purchaseReward as spendCoins } from '@/services/gamification.service';
import type { PurchasableReward } from '@/types/reward.types';

interface RewardState {
  rewards: Reward[];
  purchasableRewards: PurchasableReward[];
  purchases: RewardPurchase[];
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
  fetchPurchasableRewards: () => Promise<void>;
  addPurchasableReward: (data: {
    title: string;
    description?: string;
    cost: number;
  }) => Promise<PurchasableReward>;
  editPurchasableReward: (
    id: string,
    data: { title: string; description?: string; cost: number },
  ) => Promise<void>;
  removePurchasableReward: (id: string) => Promise<void>;
  buyPurchasableReward: (reward: PurchasableReward) => Promise<void>;
  fetchPurchases: () => Promise<void>;
  archivePurchase: (id: string) => Promise<void>;
}

export const useRewardStore = create<RewardState>((set, get) => ({
  rewards: [],
  purchasableRewards: [],
  purchases: [],
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
    const pending = get().rewards.filter((reward) => !reward.unlocked);
    if (pending.length === 0) return newlyUnlocked;

    for (const reward of pending) {
      if (checkRewardCondition(reward, sessions, tasks, goals)) {
        await unlockReward(reward.id);
        newlyUnlocked.push(reward);
      }
    }

    if (newlyUnlocked.length > 0) {
      const unlockedIds = new Set(newlyUnlocked.map((reward) => reward.id));
      const unlockedAt = new Date().toISOString();
      set((state) => ({
        rewards: state.rewards.map((reward) =>
          unlockedIds.has(reward.id) ? { ...reward, unlocked: true, unlockedAt } : reward,
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
      const orderedIdSet = new Set(orderedIds);
      const untouched = state.rewards.filter((r) => !orderedIdSet.has(r.id));
      return { rewards: [...reordered, ...untouched].sort((a, b) => a.order - b.order) };
    });
    await reorderRewards(orderedIds);
  },

  fetchPurchasableRewards: async () => {
    set({ purchasableRewards: await getAllPurchasableRewards() });
  },

  fetchPurchases: async () => {
    set({ purchases: await getAllRewardPurchases() });
  },

  addPurchasableReward: async (data) => {
    const reward = await createPurchasableReward(data);
    set((state) => ({ purchasableRewards: [...state.purchasableRewards, reward] }));
    return reward;
  },

  editPurchasableReward: async (id, data) => {
    await updatePurchasableReward(id, data);
    set((state) => ({
      purchasableRewards: state.purchasableRewards.map((r) =>
        r.id === id
          ? { ...r, ...data, title: data.title.trim(), description: data.description?.trim() }
          : r,
      ),
    }));
  },

  removePurchasableReward: async (id) => {
    await deletePurchasableReward(id);
    set((state) => ({ purchasableRewards: state.purchasableRewards.filter((r) => r.id !== id) }));
  },

  buyPurchasableReward: async (reward) => {
    await spendCoins(reward.id, reward.cost, reward.title);
    await get().fetchPurchases();
    await useGamificationStore.getState().refreshSummary();
  },

  archivePurchase: async (id) => {
    await archiveRewardPurchase(id);
    set((state) => ({
      purchases: state.purchases.map((p) => (p.id === id ? { ...p, archived: true } : p)),
    }));
  },
}));
