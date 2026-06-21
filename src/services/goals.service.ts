import type { Goal, GoalTask } from '@/types/goal.types';

export function calcTaskProgress(task: GoalTask, tolerance: number, allowOverflow = false): number {
  if (task.targetCount === 0) return 1;
  const adjustedTarget = task.targetCount * (1 - tolerance);
  const raw = task.completedCount / adjustedTarget;
  return allowOverflow ? raw : Math.min(1, raw);
}

export function calcGoalProgress(goal: Goal): number {
  const regularTasks = goal.tasks.filter((t) => t.type !== 'wildcard');
  const wildcardDone = goal.tasks.some(
    (t) => t.type === 'wildcard' && t.completedCount >= t.targetCount,
  );

  if (wildcardDone) {
    if (!goal.allowBeyond100) return 1;
    if (regularTasks.length === 0) return 1;
    const extra =
      regularTasks.reduce((acc, t) => acc + calcTaskProgress(t, goal.tolerance, true), 0) /
      regularTasks.length;
    return Math.max(1, extra);
  }

  if (regularTasks.length === 0) return 0;
  const allowTaskOverflow = goal.allowOverflow || goal.allowBeyond100;

  const sum = regularTasks.reduce((acc, task) => {
    return acc + calcTaskProgress(task, goal.tolerance, allowTaskOverflow);
  }, 0);

  const avg = sum / regularTasks.length;
  return goal.allowBeyond100 ? avg : Math.min(1, avg);
}

export function toleranceLabel(tolerance: number): string {
  if (tolerance === 0) return 'Sem margem';
  return `${Math.round(tolerance * 100)}% de margem`;
}

export function getLinearBarInfo(
  progress: number,
  accentColor: string,
): { width: number; color: string } {
  if (progress <= 1) return { width: progress, color: accentColor };
  const lapProg = progress % 1 || 1;
  if (progress <= 2) return { width: lapProg, color: '#08d120' };
  if (progress <= 3) return { width: lapProg, color: '#03c2c5' };
  return { width: lapProg, color: '#1a04c3' };
}

export const TOLERANCE_OPTIONS = [
  { value: 0, label: 'Sem margem', description: '100% das tarefas' },
  { value: 0.1, label: '10%', description: '90% das tarefas' },
  { value: 0.2, label: '20%', description: '80% das tarefas' },
  { value: 0.3, label: '30%', description: '70% das tarefas' },
  { value: 0.5, label: '50%', description: '50% das tarefas' },
];
