import type { Reward } from '@/types/reward.types';
import type { FocusSession } from '@/types/focus.types';
import type { Task } from '@/types/task.types';
import type { Goal } from '@/types/goal.types';
import { calcGoalProgress } from '@/services/goals.service';
import {
  localDateStr,
  dateOf,
  localWeekStart,
  localWeekEnd,
  localMonthStart,
  localMonthEnd,
} from '@/utils/date';

function getDateRange(reward: Reward): { start: string; end: string } {
  const today = localDateStr();
  const { period } = reward.condition;

  if (period === 'anytime') {
    return {
      start: dateOf(reward.createdAt),
      end: today,
    };
  }

  if (period === 'custom') {
    return {
      start: reward.condition.customStartDate ?? dateOf(reward.createdAt),
      end: reward.condition.customEndDate ?? today,
    };
  }

  if (period === 'day') return { start: today, end: today };

  if (period === 'week') return { start: localWeekStart(), end: localWeekEnd() };

  return { start: localMonthStart(), end: localMonthEnd() };
}

export function checkRewardCondition(
  reward: Reward,
  sessions: FocusSession[],
  tasks: Task[],
  goals: Goal[],
): boolean {
  const { type } = reward.condition;

  if (type === 'tasks_specific') {
    const ids = reward.condition.taskIds ?? [];
    if (ids.length === 0) return false;
    return ids.every((id) => tasks.find((t) => t.id === id)?.completed === true);
  }

  if (type === 'goal_completed') {
    const goal = goals.find((g) => g.id === reward.condition.goalId);
    if (!goal) return false;
    return calcGoalProgress(goal) >= 1;
  }

  const { start, end } = getDateRange(reward);

  if (type === 'focus_hours') {
    const filtered = sessions.filter((s) => {
      const date = dateOf(s.startTime);
      const inRange = date >= start && date <= end;
      const inTheme = reward.condition.themeId ? s.themeId === reward.condition.themeId : true;
      return inRange && inTheme;
    });
    const totalHours = filtered.reduce((acc, s) => acc + s.duration, 0) / 60;
    return totalHours >= reward.condition.target;
  }

  if (type === 'tasks_completed') {
    const count = tasks.filter((t) => {
      if (!t.completed) return false;
      const date = dateOf(t.updatedAt);
      return date >= start && date <= end;
    }).length;
    return count >= reward.condition.target;
  }

  return false;
}

export function calcRewardProgress(
  reward: Reward,
  sessions: FocusSession[],
  tasks: Task[],
  goals: Goal[],
): number {
  const { type } = reward.condition;

  if (type === 'tasks_specific') {
    const ids = reward.condition.taskIds ?? [];
    if (ids.length === 0) return 0;
    const done = ids.filter((id) => tasks.find((t) => t.id === id)?.completed).length;
    return done / ids.length;
  }

  if (type === 'goal_completed') {
    const goal = goals.find((g) => g.id === reward.condition.goalId);
    return goal ? calcGoalProgress(goal) : 0;
  }

  const { start, end } = getDateRange(reward);

  if (type === 'focus_hours') {
    const filtered = sessions.filter((s) => {
      const date = dateOf(s.startTime);
      const inRange = date >= start && date <= end;
      const inTheme = reward.condition.themeId ? s.themeId === reward.condition.themeId : true;
      return inRange && inTheme;
    });
    const totalHours = filtered.reduce((acc, s) => acc + s.duration, 0) / 60;
    return Math.min(1, totalHours / reward.condition.target);
  }

  if (type === 'tasks_completed') {
    const count = tasks.filter((t) => {
      if (!t.completed) return false;
      const date = dateOf(t.updatedAt);
      return date >= start && date <= end;
    }).length;
    return Math.min(1, count / reward.condition.target);
  }

  return 0;
}

export function formatCondition(
  reward: Reward,
  themeName?: string,
  taskTitles?: string[],
  goalTitle?: string,
): string {
  const { type, target, period } = reward.condition;

  const periodLabel: Record<string, string> = {
    day: 'em um dia',
    week: 'em uma semana',
    month: 'em um mês',
    anytime: 'desde a criação',
    custom: `de ${reward.condition.customStartDate ?? ''} a ${reward.condition.customEndDate ?? ''}`,
  };

  if (type === 'tasks_specific') {
    if (taskTitles && taskTitles.length > 0) return `Concluir: ${taskTitles.join(', ')}`;
    return `Concluir ${reward.condition.taskIds?.length ?? 0} tarefa(s) específica(s)`;
  }

  if (type === 'goal_completed') return `Completar meta: ${goalTitle ?? '—'}`;

  if (type === 'focus_hours') {
    const themeStr = themeName ? ` (${themeName})` : '';
    return `Estudar ${target}h${themeStr} ${periodLabel[period] ?? ''}`;
  }

  return `Concluir ${target} tarefas ${periodLabel[period] ?? ''}`;
}
