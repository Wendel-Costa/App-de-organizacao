export type RewardConditionType =
  | 'focus_hours'
  | 'tasks_completed'
  | 'tasks_specific'
  | 'goal_completed';

export type RewardPeriod = 'day' | 'week' | 'month' | 'anytime' | 'custom';

export interface RewardCondition {
  type: RewardConditionType;
  target: number;
  period: RewardPeriod;
  themeId?: string;
  taskIds?: string[];
  goalId?: string;
  customStartDate?: string;
  customEndDate?: string;
}

export interface Reward {
  id: string;
  title: string;
  description?: string;
  condition: RewardCondition;
  unlocked: boolean;
  unlockedAt?: string;
  archived: boolean;
  order: number;
  createdAt: string;
}
