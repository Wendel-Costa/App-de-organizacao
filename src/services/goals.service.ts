import type { Goal, GoalTask } from '@/types/goal.types';

export function calcTaskProgress(task: GoalTask, tolerance: number): number {
  if (task.targetCount === 0) return 1;
  const adjustedTarget = task.targetCount * (1 - tolerance);
  return Math.min(1, task.completedCount / adjustedTarget);
}

export function calcGoalProgress(goal: Goal): number {
  if (goal.tasks.length === 0) return 0;
  const sum = goal.tasks.reduce((acc, task) => acc + calcTaskProgress(task, goal.tolerance), 0);
  return sum / goal.tasks.length;
}

export function toleranceLabel(tolerance: number): string {
  if (tolerance === 0) return 'Sem margem';
  return `${Math.round(tolerance * 100)}% de margem`;
}

export const TOLERANCE_OPTIONS = [
  { value: 0, label: 'Sem margem', description: '100% das tarefas' },
  { value: 0.1, label: '10%', description: '90% das tarefas' },
  { value: 0.2, label: '20%', description: '80% das tarefas' },
  { value: 0.3, label: '30%', description: '70% das tarefas' },
  { value: 0.5, label: '50%', description: '50% das tarefas' },
];
