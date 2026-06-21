import type { FocusSession, FocusTheme } from '@/types/focus.types';
import type { Task } from '@/types/task.types';
import type { Goal } from '@/types/goal.types';
import { calcGoalProgress } from '@/services/goals.service';
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
  bestFocusDay: string;
  streak: number;
}

export interface MonthlySummary {
  totalHours: number;
  totalTasks: number;
  totalSessions: number;
  avgDailyHours: number;
  focusByTheme: ThemeData[];
  goalsSummary: { title: string; progress: number; color: string }[];
  taskCompletionRate: number;
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

function getWeekDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(localDateStr(d));
  }
  return dates;
}

function getMonthDates(year: number, month: number): { start: string; end: string } {
  return {
    start: localDateStr(new Date(year, month, 1)),
    end: localDateStr(new Date(year, month + 1, 0)),
  };
}

export function getWeeklySummary(sessions: FocusSession[], tasks: Task[]): WeeklySummary {
  const weekDates = getWeekDates();
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const focusDays: DayData[] = weekDates.map((date, i) => {
    const daySessions = sessions.filter((s) => dateOf(s.startTime) === date);
    const minutes = daySessions.reduce((acc, s) => acc + s.duration, 0);
    return { label: labels[i], value: minutes / 60, date };
  });

  const taskDays: DayData[] = weekDates.map((date, i) => {
    const count = tasks.filter((t) => t.completed && dateOf(t.updatedAt) === date).length;
    return { label: labels[i], value: count, date };
  });

  const totalHours = focusDays.reduce((acc, d) => acc + d.value, 0);
  const totalTasks = taskDays.reduce((acc, d) => acc + d.value, 0);
  const bestDay = focusDays.reduce((best, d) => (d.value > best.value ? d : best), focusDays[0]);

  let streak = 0;
  const checkDate = new Date();

  while (streak <= 365) {
    const dateStr = localDateStr(checkDate);
    const hasFocus = sessions.some((s) => dateOf(s.startTime) === dateStr);

    if (!hasFocus) break;

    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    focusDays,
    taskDays,
    totalHours,
    totalTasks,
    bestFocusDay: bestDay.label,
    streak,
  };
}

export function getMonthlySummary(
  sessions: FocusSession[],
  tasks: Task[],
  goals: Goal[],
  themes: FocusTheme[],
  year?: number,
  month?: number,
): MonthlySummary {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();

  const { start, end } = getMonthDates(y, m);

  const monthSessions = sessions.filter((s) => {
    const d = dateOf(s.startTime);
    return d >= start && d <= end;
  });

  const monthTasks = tasks.filter((t) => {
    if (!t.completed) return false;
    const d = dateOf(t.updatedAt);
    return d >= start && d <= end;
  });

  const totalMinutes = monthSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = totalMinutes / 60;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const avgDailyHours = totalHours / daysInMonth;

  const themeMap = new Map<string, number>();
  monthSessions.forEach((s) => {
    const key = s.themeId ?? '__general__';
    themeMap.set(key, (themeMap.get(key) ?? 0) + s.duration);
  });

  const focusByTheme: ThemeData[] = [];
  themeMap.forEach((minutes, key) => {
    if (key === '__general__') {
      focusByTheme.push({ name: 'Geral', minutes, color: '#C8C8B8' });
    } else {
      const idx = themes.findIndex((t) => t.id === key);
      const theme = themes.find((t) => t.id === key);
      focusByTheme.push({
        name: theme?.name ?? 'Tema',
        minutes,
        color: THEME_PALETTE[idx >= 0 ? idx % THEME_PALETTE.length : 0],
      });
    }
  });
  focusByTheme.sort((a, b) => b.minutes - a.minutes);

  const activeGoals = goals.filter((g) => g.startDate <= end && g.endDate >= start);
  const goalsSummary = activeGoals.map((g) => ({
    title: g.title,
    progress: calcGoalProgress(g),
    color: g.color ?? '#F5C518',
  }));

  const totalTasksCount = tasks.length;
  const taskCompletionRate = totalTasksCount > 0 ? monthTasks.length / totalTasksCount : 0;

  return {
    totalHours,
    totalTasks: monthTasks.length,
    totalSessions: monthSessions.length,
    avgDailyHours,
    focusByTheme,
    goalsSummary,
    taskCompletionRate,
    year: y,
    month: m,
  };
}
