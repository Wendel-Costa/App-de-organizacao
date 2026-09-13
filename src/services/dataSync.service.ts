import { useFocusStore } from '@/store/focusStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useGoalStore } from '@/store/goalStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useRewardStore } from '@/store/rewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export async function refreshStoresAfterDataRestore(): Promise<void> {
  const focus = useFocusStore.getState();
  const gamification = useGamificationStore.getState();
  const goals = useGoalStore.getState();
  const notebooks = useNotebookStore.getState();
  const rewards = useRewardStore.getState();
  const settings = useSettingsStore.getState();
  const tasks = useTaskStore.getState();

  await Promise.allSettled([
    tasks.fetchTasks(true),
    focus.fetchSessions(true),
    focus.fetchThemes(true),
    focus.fetchGeralThemeVisibility(),
    goals.fetchGoals(true),
    notebooks.fetchNotebooks(true),
    rewards.fetchRewards(),
    rewards.fetchPurchasableRewards(),
    gamification.fetch(),
    settings.loadName(),
    settings.loadSettings(),
  ]);
}
