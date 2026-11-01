import type { FocusSession, FocusTheme } from '@/types/focus.types';
import type { Goal } from '@/types/goal.types';
import type { CompletedTaskRecord } from '@/types/taskHistory.types';
import { localDateStr, dateOf } from '@/utils/date';

export interface DayData {
  label: string;
  value: number;
  date: string;
}

export interface ThemeData {
  name: string;
  minutes: number;
  color: string;
}

export interface WeeklySummary {
  focusDays: DayData[];
  taskDays: DayData[];
  totalHours: number;
  totalTasks: number;
  totalSessions: number;
  bestFocusDay: string;
}

export interface MonthlySummary {
  totalHours: number;
  totalTasks: number;
  totalSessions: number;
  avgDailyHours: number;
  focusByTheme: ThemeData[];
  goalsSummary: { id: string; title: string; color: string }[];
  year: number;
  month: number;
}

const THEME_PALETTE = [
  '#5B9BD5',
  '#5DB88A',
  '#FFB347',
  '#F9B8C4',
  '#9B7DD4',
  '#F5C518',
  '#E05252',
  '#4ECDC4',
];

function getWeekDates(referenceDate = new Date()): string[] {
  const day = referenceDate.getDay();
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - (day === 0 ? 6 : day - 1),
    12,
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateStr(date);
  });
}

function getMonthDates(year: number, month: number): { start: string; end: string } {
  return {
    start: localDateStr(new Date(year, month, 1, 12)),
    end: localDateStr(new Date(year, month + 1, 0, 12)),
  };
}

export function getWeeklySummary(
  sessions: FocusSession[],
  completions: CompletedTaskRecord[],
  referenceDate = new Date(),
): WeeklySummary {
  const weekDates = getWeekDates(referenceDate);
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const weekDateSet = new Set(weekDates);
  const focusMinutesByDate = new Map<string, number>();
  const taskCountByDate = new Map<string, number>();
  let totalSessions = 0;

  for (const session of sessions) {
    const date = dateOf(session.startTime);
    if (!weekDateSet.has(date)) continue;
    focusMinutesByDate.set(date, (focusMinutesByDate.get(date) ?? 0) + session.duration);
    totalSessions += 1;
  }

  for (const completion of completions) {
    const date = dateOf(completion.completedAt);
    if (!weekDateSet.has(date)) continue;
    taskCountByDate.set(date, (taskCountByDate.get(date) ?? 0) + 1);
  }

  const focusDays: DayData[] = weekDates.map((date, index) => ({
    label: labels[index],
    value: (focusMinutesByDate.get(date) ?? 0) / 60,
    date,
  }));
  const taskDays: DayData[] = weekDates.map((date, index) => ({
    label: labels[index],
    value: taskCountByDate.get(date) ?? 0,
    date,
  }));

  const totalHours = focusDays.reduce((total, day) => total + day.value, 0);
  const totalTasks = taskDays.reduce((total, day) => total + day.value, 0);
  const bestDay = focusDays.reduce(
    (best, day) => (day.value > best.value ? day : best),
    focusDays[0],
  );

  return {
    focusDays,
    taskDays,
    totalHours,
    totalTasks,
    totalSessions,
    bestFocusDay: bestDay.label,
  };
}

export function getMonthlySummary(
  sessions: FocusSession[],
  completions: CompletedTaskRecord[],
  goals: Goal[],
  themes: FocusTheme[],
  year?: number,
  month?: number,
): MonthlySummary {
  const currentDate = new Date();
  const selectedYear = year ?? currentDate.getFullYear();
  const selectedMonth = month ?? currentDate.getMonth();
  const { start, end } = getMonthDates(selectedYear, selectedMonth);

  const monthSessions = sessions.filter((session) => {
    const date = dateOf(session.startTime);
    return date >= start && date <= end;
  });
  const monthCompletions = completions.filter((completion) => {
    const date = dateOf(completion.completedAt);
    return date >= start && date <= end;
  });

  const totalMinutes = monthSessions.reduce((total, session) => total + session.duration, 0);
  const totalHours = totalMinutes / 60;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const avgDailyHours = totalHours / daysInMonth;

  const minutesByTheme = new Map<string, number>();
  for (const session of monthSessions) {
    const key = session.themeId ?? '__general__';
    minutesByTheme.set(key, (minutesByTheme.get(key) ?? 0) + session.duration);
  }

  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  const focusByTheme: ThemeData[] = [];
  minutesByTheme.forEach((minutes, key) => {
    if (key === '__general__') {
      focusByTheme.push({ name: 'Geral', minutes, color: '#C8C8B8' });
      return;
    }

    const theme = themeById.get(key);
    const themeIndex = themes.findIndex((item) => item.id === key);
    focusByTheme.push({
      name:
        theme?.name ??
        monthSessions.find((session) => session.themeId === key)?.themeName ??
        'Tema removido',
      minutes,
      color: THEME_PALETTE[themeIndex >= 0 ? themeIndex % THEME_PALETTE.length : 0],
    });
  });
  focusByTheme.sort((a, b) => b.minutes - a.minutes);

  const activeGoals = goals.filter((goal) => goal.startDate <= end && goal.endDate >= start);
  const goalsSummary = activeGoals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    color: goal.color ?? '#F5C518',
  }));

  return {
    totalHours,
    totalTasks: monthCompletions.length,
    totalSessions: monthSessions.length,
    avgDailyHours,
    focusByTheme,
    goalsSummary,
    year: selectedYear,
    month: selectedMonth,
  };
}
