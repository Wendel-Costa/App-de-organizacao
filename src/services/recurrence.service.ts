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
      const completedDate = dateOf(task.updatedAt);
      if (completedDate !== todayStr) {
        return { ...task, completed: false };
      }
    }
    return task;
  });
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
