import { localDateStr, dateOf } from '@/utils/date';
import type { Task, RecurrenceDay } from '@/types/task.types';

type Weekday = Exclude<RecurrenceDay, 'daily' | 'every_x_days'>;

const WEEKDAYS: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const DISPLAY_WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'segunda-feira',
  tuesday: 'terça-feira',
  wednesday: 'quarta-feira',
  thursday: 'quinta-feira',
  friday: 'sexta-feira',
  saturday: 'sábado',
  sunday: 'domingo',
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type RecurringTaskStatus = 'pending' | 'completed' | 'skipped' | 'upcoming';

export function getTodayString(): string {
  return localDateStr();
}

export function getTodayWeekday(dateString = getTodayString()): Weekday {
  const [year, month, day] = dateString.split('-').map(Number);
  return WEEKDAYS[new Date(year, month - 1, day, 12).getDay()];
}

function differenceInCalendarDays(laterDate: string, earlierDate: string): number {
  const [laterYear, laterMonth, laterDay] = laterDate.split('-').map(Number);
  const [earlierYear, earlierMonth, earlierDay] = earlierDate.split('-').map(Number);
  const later = Date.UTC(laterYear, laterMonth - 1, laterDay);
  const earlier = Date.UTC(earlierYear, earlierMonth - 1, earlierDay);

  return Math.round((later - earlier) / MILLISECONDS_PER_DAY);
}

function addCalendarDays(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return localDateStr(new Date(year, month - 1, day + amount, 12));
}

function wasCompletedOn(task: Task, dateString: string): boolean {
  if (!task.completed || !task.completedAt) return false;
  return dateOf(task.completedAt) === dateString;
}

function isRecurringScheduledToday(task: Task, dateString: string): boolean {
  const recurrenceDays = task.recurrenceDays ?? [];
  const weekday = getTodayWeekday(dateString);
  return recurrenceDays.includes('daily') || recurrenceDays.includes(weekday);
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

export function getRecurringTaskFrequencyLabel(task: Task): string {
  if (isEveryXDaysTask(task)) {
    const interval = Math.max(task.recurrenceInterval ?? 1, 1);
    return `A cada ${interval} ${interval === 1 ? 'dia' : 'dias'}`;
  }

  const recurrenceDays = task.recurrenceDays ?? [];
  if (recurrenceDays.includes('daily')) return 'Todos os dias';

  const selectedDays = DISPLAY_WEEKDAYS.filter((day) => recurrenceDays.includes(day));
  if (selectedDays.length === 0) return 'Recorrência não definida';

  return selectedDays.map((day) => WEEKDAY_LABELS[day]).join(', ');
}

export function getNextRecurringOccurrenceDate(
  task: Task,
  todayStr = getTodayString(),
): string | null {
  if (task.type !== 'recurring') return null;

  const completedToday = wasCompletedOn(task, todayStr);
  const skippedToday = task.skippedDate === todayStr;
  const firstCandidateDate =
    completedToday || skippedToday ? addCalendarDays(todayStr, 1) : todayStr;

  if (isEveryXDaysTask(task)) {
    const interval = Math.max(task.recurrenceInterval ?? 1, 1);
    const anchorDate = dateOf(task.createdAt);
    const daysSinceAnchor = differenceInCalendarDays(firstCandidateDate, anchorDate);

    if (daysSinceAnchor <= 0) return anchorDate;

    const occurrenceNumber = Math.ceil(daysSinceAnchor / interval);
    return addCalendarDays(anchorDate, occurrenceNumber * interval);
  }

  const recurrenceDays = task.recurrenceDays ?? [];
  if (recurrenceDays.includes('daily')) return firstCandidateDate;

  const selectedDays = WEEKDAYS.filter((day) => recurrenceDays.includes(day));
  if (selectedDays.length === 0) return null;

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDate = addCalendarDays(firstCandidateDate, offset);
    if (selectedDays.includes(getTodayWeekday(candidateDate))) return candidateDate;
  }

  return null;
}

export function getRecurringTaskStatus(
  task: Task,
  todayStr = getTodayString(),
): RecurringTaskStatus {
  if (wasCompletedOn(task, todayStr)) return 'completed';
  if (task.skippedDate === todayStr) return 'skipped';
  if (task.completed && !task.completedAt) return 'completed';

  const isDueToday = isEveryXDaysTask(task)
    ? isEveryXDaysDue(task, todayStr)
    : isRecurringScheduledToday(task, todayStr);

  if (isDueToday) return 'pending';
  if (task.completed) return 'completed';

  return 'upcoming';
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
