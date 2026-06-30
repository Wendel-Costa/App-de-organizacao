import { localDateStr, dateOf } from '@/utils/date';
import type { Task, RecurrenceDay } from '@/types/task.types';

const WEEKDAYS: RecurrenceDay[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function getTodayString(): string {
  return localDateStr();
}

export function getTodayWeekday(): RecurrenceDay {
  return WEEKDAYS[new Date().getDay()];
}

export function isEveryXDaysDue(task: Task): boolean {
  const interval = task.recurrenceInterval ?? 1;
  if (!task.completed || !task.completedAt) return true;
  const completedDate = new Date(task.completedAt);
  completedDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSince = Math.round((today.getTime() - completedDate.getTime()) / 86400000);
  return daysSince >= interval;
}

export function filterTasksForHome(tasks: Task[]): Task[] {
  const today = getTodayString();

  return tasks.filter((task) => {
    if (task.type === 'anytime') {
      if (task.completed) {
        return dateOf(task.updatedAt) === today;
      }
      return true;
    }
    if (task.type === 'scheduled') return task.scheduledDate === today;
    if (task.type === 'recurring') {
      if (task.recurrenceDays?.includes('every_x_days')) {
        return !task.completed;
      }
      const todayWeekday = getTodayWeekday();
      const isDueToday =
        task.recurrenceDays?.includes('daily') ||
        task.recurrenceDays?.includes(todayWeekday) ||
        false;
      if (!isDueToday) return false;
      return true;
    }
    return false;
  });
}

export function applyRecurringReset(tasks: Task[], todayStr: string): Task[] {
  return tasks.map((task) => {
    if (task.type === 'recurring' && task.completed) {
      if (task.recurrenceDays?.includes('every_x_days')) {
        if (isEveryXDaysDue(task)) return { ...task, completed: false };
      } else {
        const completedDate = dateOf(task.updatedAt);
        if (completedDate !== todayStr) {
          return { ...task, completed: false };
        }
      }
    }
    return task;
  });
}

export function getRecurringTasksToRollover(tasks: Task[]): Task[] {
  const todayStr = getTodayString();
  return tasks.filter((task) => {
    if (task.type !== 'recurring' || !task.completed) return false;
    if (task.recurrenceDays?.includes('every_x_days')) return false;
    const completedDate = dateOf(task.completedAt ?? task.updatedAt);
    return completedDate !== todayStr;
  });
}

export function getEveryXDaysTasksToReset(tasks: Task[]): Task[] {
  return tasks.filter(
    (task) =>
      task.type === 'recurring' &&
      task.recurrenceDays?.includes('every_x_days') &&
      task.completed &&
      isEveryXDaysDue(task),
  );
}

export function filterTasksForThemeToday(tasks: Task[], themeId?: string): Task[] {
  const today = getTodayString();

  return tasks.filter((task) => {
    if (themeId) {
      if (task.themeId !== themeId) return false;
    } else {
      if (task.themeId) return false;
    }

    if (task.type === 'anytime') {
      if (task.completed) return dateOf(task.updatedAt) === today;
      return true;
    }
    if (task.type === 'scheduled') return task.scheduledDate === today;
    if (task.type === 'recurring') {
      if (task.recurrenceDays?.includes('every_x_days')) {
        return !task.completed;
      }
      const todayWeekday = getTodayWeekday();

      return (
        task.recurrenceDays?.includes('daily') ||
        task.recurrenceDays?.includes(todayWeekday) ||
        false
      );
    }

    return false;
  });
}
