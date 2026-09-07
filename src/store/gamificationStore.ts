import { create } from 'zustand';
import type { GamificationConfig, GamificationSummary } from '@/types/gamification.types';
import {
  getGamificationConfig,
  getSummary,
  saveGamificationConfig,
} from '@/services/gamification.service';

interface GamificationState {
  config: GamificationConfig;
  summary: GamificationSummary;
  loading: boolean;
  fetch: () => Promise<void>;
  updateConfig: (patch: Partial<GamificationConfig>) => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  config: {
    pointsPerFocusHour: 1,
    taskLevel1Points: 1,
    taskLevel2Points: 3,
    taskLevel3Points: 5,
    topicPoints: 1,
    notebookCompletionPoints: 10,
    goalCompletionPoints: 25,
  },
  summary: {
    points: 0,
    coins: 0,
    level: 1,
    currentLevelPoints: 0,
    nextLevelPoints: 100,
    progress: 0,
  },
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const [config, summary] = await Promise.all([getGamificationConfig(), getSummary()]);
      set({ config, summary, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateConfig: async (patch) => {
    const config = { ...get().config, ...patch };
    await saveGamificationConfig(config);
    set({ config });
  },
}));
