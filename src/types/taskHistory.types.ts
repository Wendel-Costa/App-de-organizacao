import type { ScoreLevel, RecurrenceDay, SubTask, TaskType } from './task.types';

export interface CompletedTaskRecord {
  id: string;
  originalTaskId: string;
  title: string;
  description?: string;
  type: TaskType;
  scoreLevel?: ScoreLevel;
  recurrenceDays?: RecurrenceDay[];
  goalId?: string;
  themeId?: string;
  subtasks?: SubTask[];
  completedAt: string;
  createdAt: string;
  savedAt: string;
}
