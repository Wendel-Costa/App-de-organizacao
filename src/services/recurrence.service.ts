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

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTodayString(): string {
  return localDateStr();
}

export function getTodayWeekday(dateString = getTodayString()): RecurrenceDay {
  const [year, month, day] = dateString.split('-').map(Number);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

function differenceInCalendarDays(laterDate: string, earlierDate: string): number {
  const [laterYear, laterMonth, laterDay] = laterDate.split('-').map(Number);
  const [earlierYear, earlierMonth, earlierDay] = earlierDate.split('-').map(Number);
  const later = Date.UTC(laterYear, laterMonth - 1, laterDay);
  const earlier = Date.UTC(earlierYear, earlierMonth - 1, earlierDay);

  return Math.round((later - earlier) / MILLISECONDS_PER_DAY);
}

function wasCompletedOn(task: Task, dateString: string): boolean {
  if (!task.completed) return false;
  return dateOf(task.completedAt ?? task.updatedAt) === dateString;
}

function isRecurringScheduledToday(task: Task, dateString: string): boolean {
  const weekday = getTodayWeekday(dateString);
  return Boolean(task.recurrenceDays?.includes('daily') || task.recurrenceDays?.includes(weekday));
}

export function isEveryXDaysTask(task: Task): boolean {
  return (
    task.type === 'recurring' &&
    ((task.recurrenceInterval ?? 0) > 0 || task.recurrenceDays?.includes('every_x_days') === true)
  );
}

export function isEveryXDaysDue(task: Task, todayStr = getTodayString()): boolean {
  if (!isEveryXDaysTask(task)) return false;
  if (task.skippedDate === todayStr) return false;

  const interval = Math.max(task.recurrenceInterval ?? 1, 1);
  const anchorDate = dateOf(task.createdAt);
  const daysSinceCreation = differenceInCalendarDays(todayStr, anchorDate);

  return daysSinceCreation >= 0 && daysSinceCreation % interval === 0;
}

export function filterTasksForHome(tasks: Task[], today = getTodayString()): Task[] {
  return tasks.filter((task) => {
    if (task.type === 'recurring' && task.skippedDate === today) return false;

    if (task.type === 'anytime') {
      if (task.completed) return dateOf(task.updatedAt) === today;
      return true;
    }

    if (task.type === 'scheduled') return task.scheduledDate === today;

    if (task.type === 'recurring') {
      if (isEveryXDaysTask(task)) {
        return wasCompletedOn(task, today) || isEveryXDaysDue(task, today);
      }

      return isRecurringScheduledToday(task, today) || wasCompletedOn(task, today);
    }

    return false;
  });
}

export function applyRecurringReset(tasks: Task[], todayStr: string): Task[] {
  return tasks.map((task) => {
    if (task.type !== 'recurring' || !task.completed) return task;

    const completedDate = dateOf(task.completedAt ?? task.updatedAt);
    if (completedDate === todayStr) return task;

    if (isEveryXDaysTask(task)) {
      if (!isEveryXDaysDue(task, todayStr)) return task;
    } else if (!isRecurringScheduledToday(task, todayStr)) {
      return task;
    }

    return {
      ...task,
      completed: false,
      completedAt: undefined,
      subtasks: task.subtasks?.map((subtask) => ({ ...subtask, completed: false })),
    };
  });
}

export function getRecurringTasksToReset(tasks: Task[], todayStr = getTodayString()): Task[] {
  return tasks.filter((task) => {
    if (task.type !== 'recurring' || !task.completed) return false;

    const completedDate = dateOf(task.completedAt ?? task.updatedAt);
    if (completedDate === todayStr) return false;

    if (isEveryXDaysTask(task)) {
      return isEveryXDaysDue(task, todayStr);
    }

    return isRecurringScheduledToday(task, todayStr);
  });
}

export function filterTasksForThemeToday(
  tasks: Task[],
  themeId?: string,
  today = getTodayString(),
): Task[] {
  return tasks.filter((task) => {
    if (task.type === 'recurring' && task.skippedDate === today) return false;

    if (themeId) {
      if (task.themeId !== themeId) return false;
    } else if (task.themeId) {
      return false;
    }

    if (task.type === 'anytime') {
      if (task.completed) return dateOf(task.updatedAt) === today;
      return true;
    }

    if (task.type === 'scheduled') return task.scheduledDate === today;

    if (task.type === 'recurring') {
      if (isEveryXDaysTask(task)) {
        return wasCompletedOn(task, today) || isEveryXDaysDue(task, today);
      }

      return isRecurringScheduledToday(task, today) || wasCompletedOn(task, today);
    }

    return false;
  });
}
