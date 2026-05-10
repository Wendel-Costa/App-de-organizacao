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

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getTodayWeekday(): RecurrenceDay {
  return WEEKDAYS[new Date().getDay()];
}

export function isTaskActiveToday(task: Task): boolean {
  if (task.type === 'anytime') return true;
  if (task.type === 'scheduled') return task.scheduledDate === getTodayString();
  if (task.type === 'recurring') {
    const today = getTodayWeekday();
    return task.recurrenceDays?.includes('daily') || task.recurrenceDays?.includes(today) || false;
  }
  return false;
}

export function filterTasksForToday(tasks: Task[]): Task[] {
  return tasks.filter(isTaskActiveToday);
}

export function filterTasksForHome(tasks: Task[]): Task[] {
  const today = getTodayString();

  return tasks.filter((task) => {
    if (task.type === 'anytime') {
      if (task.completed) {
        return task.updatedAt.split('T')[0] === today;
      }
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

export function filterTasksByDate(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => {
    if (t.type === 'scheduled') return t.scheduledDate === date;
    if (t.type === 'recurring') {
      const weekday = WEEKDAYS[new Date(date + 'T12:00:00').getDay()];
      return t.recurrenceDays?.includes('daily') || t.recurrenceDays?.includes(weekday) || false;
    }
    return false;
  });
}
