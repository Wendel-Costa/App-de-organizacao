import type { Reward } from '@/types/reward.types';
import type { FocusSession } from '@/types/focus.types';
import type { Task } from '@/types/task.types';

function getDateRange(period: Reward['condition']['period']): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (period === 'day') {
    return { start: today, end: today };
  }

  if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now.setDate(diff));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: mon.toISOString().split('T')[0],
      end: sun.toISOString().split('T')[0],
    };
  }

  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export function checkRewardCondition(
  reward: Reward,
  sessions: FocusSession[],
  tasks: Task[],
): boolean {
  const { start, end } = getDateRange(reward.condition.period);

  if (reward.condition.type === 'focus_hours') {
    const totalMinutes = sessions
      .filter((s) => {
        const date = s.startTime.split('T')[0];
        return date >= start && date <= end;
      })
      .reduce((acc, s) => acc + s.duration, 0);

    const totalHours = totalMinutes / 60;
    return totalHours >= reward.condition.target;
  }

  if (reward.condition.type === 'tasks_completed') {
    const count = tasks.filter((t) => {
      if (!t.completed) return false;
      const date = t.updatedAt.split('T')[0];
      return date >= start && date <= end;
    }).length;

    return count >= reward.condition.target;
  }

  return false;
}

export function formatCondition(reward: Reward): string {
  const periodLabel = {
    day: 'hoje',
    week: 'esta semana',
    month: 'este mês',
  }[reward.condition.period];

  if (reward.condition.type === 'focus_hours') {
    return `Estudar ${reward.condition.target}h ${periodLabel}`;
  }

  return `Concluir ${reward.condition.target} tarefas ${periodLabel}`;
}

export function calcRewardProgress(
  reward: Reward,
  sessions: FocusSession[],
  tasks: Task[],
): number {
  const { start, end } = getDateRange(reward.condition.period);

  if (reward.condition.type === 'focus_hours') {
    const totalMinutes = sessions
      .filter((s) => {
        const date = s.startTime.split('T')[0];
        return date >= start && date <= end;
      })
      .reduce((acc, s) => acc + s.duration, 0);

    return Math.min(1, totalMinutes / 60 / reward.condition.target);
  }

  if (reward.condition.type === 'tasks_completed') {
    const count = tasks.filter((t) => {
      if (!t.completed) return false;
      const date = t.updatedAt.split('T')[0];
      return date >= start && date <= end;
    }).length;

    return Math.min(1, count / reward.condition.target);
  }

  return 0;
}
