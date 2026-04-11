export type TaskType = 'anytime' | 'scheduled' | 'recurring';

export type Priority = 'high' | 'medium' | 'low';

export type RecurrenceDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'daily';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority?: Priority;
  completed: boolean;
  scheduledDate?: string;
  dueDate?: string;
  recurrenceDays?: RecurrenceDay[];
  subtasks?: SubTask[];
  goalId?: string;
  createdAt: string;
  updatedAt: string;
}
