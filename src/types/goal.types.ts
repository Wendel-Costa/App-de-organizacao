import type { RecurrenceDay } from './task.types';

export type GoalTaskRecurrenceType =
  | 'none'
  | 'daily'
  | 'times_per_week'
  | 'times_per_month'
  | 'specific_days';

export interface GoalTask {
  id: string;
  goalId: string;
  title: string;
  targetCount: number;
  completedCount: number;
  completedToday: boolean;
  completionsThisWeek: number;
  completionsThisMonth: number;
  recurrenceType: GoalTaskRecurrenceType;
  recurrenceCount: number;
  recurrenceDays: RecurrenceDay[];
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  tasks: GoalTask[];
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalGoalTask {
  title: string;
  recurrenceType: GoalTaskRecurrenceType;
  recurrenceCount: number;
  recurrenceDays: RecurrenceDay[];
}
