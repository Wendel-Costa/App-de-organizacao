export type RewardConditionType = 'focus_hours' | 'tasks_completed';

export type RewardPeriod = 'day' | 'week' | 'month';

export interface RewardCondition {
  type: RewardConditionType;
  target: number; // ex: 10 (horas) ou 20 (tarefas)
  period: RewardPeriod;
}

export interface Reward {
  id: string;
  title: string;
  description?: string;
  condition: RewardCondition;
  unlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
}
