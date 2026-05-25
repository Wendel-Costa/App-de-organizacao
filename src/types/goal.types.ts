import type { RecurrenceDay } from './task.types';

export type GoalTaskRecurrenceType =
  | 'none'
  | 'daily'
  | 'times_per_week'
  | 'times_per_month'
  | 'specific_days';

export type GoalTaskType = 'habit' | 'focus_hours' | 'wildcard';

export interface GoalTask {
  id: string;
  goalId: string;
  title: string;
  type: GoalTaskType;
  targetCount: number;
  completedCount: number;
  completedToday: boolean;
  completionsThisWeek: number;
  completionsThisMonth: number;
  recurrenceType: GoalTaskRecurrenceType;
  recurrenceCount: number;
  recurrenceDays: RecurrenceDay[];
  themeId?: string;
  themeName?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  tasks: GoalTask[];
  color?: string;
  tolerance: number;
  allowOverflow: boolean;
  allowBeyond100: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalGoalTask {
  title: string;
  type: GoalTaskType;
  recurrenceType: GoalTaskRecurrenceType;
  recurrenceCount: number;
  recurrenceDays: RecurrenceDay[];
  themeId?: string;
  themeName?: string;
  targetHours?: number;
}
