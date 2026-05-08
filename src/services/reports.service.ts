import type { FocusSession, FocusTheme } from '@/types/focus.types';
import type { Task } from '@/types/task.types';
import type { Goal } from '@/types/goal.types';
import { calcGoalProgress } from '@/services/goals.service';

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
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getMonthDates(): { start: string; end: string } {
  const d = new Date();
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
    end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}

export function getWeeklySummary(sessions: FocusSession[], tasks: Task[]): WeeklySummary {
  const weekDates = getWeekDates();

  const focusDays: DayData[] = weekDates.map((date, i) => {
    const daySessions = sessions.filter((s) => s.startTime.split('T')[0] === date);
    const minutes = daySessions.reduce((acc, s) => acc + s.duration, 0);
    return { label: WEEKDAY_LABELS[(i + 1) % 7] || WEEKDAY_LABELS[i], value: minutes / 60, date };
  });

  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  focusDays.forEach((d, i) => {
    d.label = labels[i];
  });

  const taskDays: DayData[] = weekDates.map((date, i) => {
    const count = tasks.filter((t) => t.completed && t.updatedAt.split('T')[0] === date).length;
    return { label: labels[i], value: count, date };
  });

  const totalHours = focusDays.reduce((acc, d) => acc + d.value, 0);
  const totalTasks = taskDays.reduce((acc, d) => acc + d.value, 0);

  const bestDay = focusDays.reduce((best, d) => (d.value > best.value ? d : best), focusDays[0]);

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasFocus = sessions.some((s) => s.startTime.split('T')[0] === dateStr);
    if (!hasFocus && dateStr !== today) break;
    if (hasFocus) streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    if (streak > 365) break;
  }

  return { focusDays, taskDays, totalHours, totalTasks, bestFocusDay: bestDay.label, streak };
}

export function getMonthlySummary(
  sessions: FocusSession[],
  tasks: Task[],
  goals: Goal[],
  themes: FocusTheme[],
): MonthlySummary {
  const { start, end } = getMonthDates();

  const monthSessions = sessions.filter((s) => {
    const d = s.startTime.split('T')[0];
    return d >= start && d <= end;
  });

  const monthTasks = tasks.filter((t) => {
    if (!t.completed) return false;
    const d = t.updatedAt.split('T')[0];
    return d >= start && d <= end;
  });

  const totalMinutes = monthSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = totalMinutes / 60;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
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

  const today = new Date().toISOString().split('T')[0];
  const activeGoals = goals.filter((g) => g.startDate <= today && g.endDate >= today);
  const goalsSummary = activeGoals.map((g) => ({
    title: g.title,
    progress: calcGoalProgress(g),
    color: g.color ?? '#F5C518',
  }));

  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? monthTasks.length / totalTasks : 0;

  return {
    totalHours,
    totalTasks: monthTasks.length,
    totalSessions: monthSessions.length,
    avgDailyHours,
    focusByTheme,
    goalsSummary,
    taskCompletionRate,
  };
}
