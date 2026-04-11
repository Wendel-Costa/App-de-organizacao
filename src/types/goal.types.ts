export interface GoalTask {
  id: string;
  goalId: string;
  title: string;
  targetCount: number; // quantas vezes preciso fazer no período
  completedCount: number; //quantas vezes já fiz
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
