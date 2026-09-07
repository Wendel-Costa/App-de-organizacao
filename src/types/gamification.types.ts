export type ProductiveAction =
  | 'task_completion'
  | 'topic_completion'
  | 'focus_session'
  | 'notebook_completion'
  | 'goal_completion';

export type GamificationConfig = {
  pointsPerFocusHour: number;
  taskLevel1Points: number;
  taskLevel2Points: number;
  taskLevel3Points: number;
  topicPoints: number;
  notebookCompletionPoints: number;
  goalCompletionPoints: number;
};

export type PointEvent = {
  id: string;
  action: ProductiveAction;
  entityId: string;
  points: number;
  coins: number;
  occurredAt: string;
  reversalOf?: string;
  metadata?: Record<string, unknown>;
};

export type CoinTransaction = {
  id: string;
  type: 'earn' | 'spend' | 'reversal';
  amount: number;
  occurredAt: string;
  entityType?: string;
  entityId?: string;
  reversalOf?: string;
  description?: string;
};

export type GamificationSummary = {
  points: number;
  coins: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints?: number;
  progress: number;
};
