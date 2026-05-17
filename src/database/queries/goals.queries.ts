import { eq, and, gte, lte, count } from 'drizzle-orm';
import { db } from '../index';
import { goals, goalTasks, goalTaskCompletions } from '../schema';
import type { Goal, GoalTask, GoalTaskRecurrenceType, LocalGoalTask } from '@/types/goal.types';
import type { RecurrenceDay } from '@/types/task.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}
function today() {
  return new Date().toISOString().split('T')[0];
}

function getWeekRange(): { start: string; end: string } {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // segunda
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split('T')[0],
    end: sun.toISOString().split('T')[0],
  };
}

function getMonthRange(): { start: string; end: string } {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export function calculateTargetCount(
  startDate: string,
  endDate: string,
  recurrenceType: GoalTaskRecurrenceType,
  recurrenceCount: number,
  recurrenceDays: RecurrenceDay[],
): number {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

  switch (recurrenceType) {
    case 'none':
      return recurrenceCount;
    case 'daily':
      return days;
    case 'times_per_week':
      return Math.ceil(days / 7) * recurrenceCount;
    case 'times_per_month':
      return Math.ceil(days / 30) * recurrenceCount;
    case 'specific_days': {
      const WEEKDAYS = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const indices = recurrenceDays.map((d) => WEEKDAYS.indexOf(d));
      let count = 0;
      const cur = new Date(start);
      while (cur <= end) {
        if (indices.includes(cur.getDay())) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }
    default:
      return recurrenceCount;
  }
}

async function getCompletionStats(goalTaskId: string): Promise<{
  completedCount: number;
  completedToday: boolean;
  completionsThisWeek: number;
  completionsThisMonth: number;
}> {
  const todayStr = today();
  const week = getWeekRange();
  const month = getMonthRange();

  const all = await db
    .select()
    .from(goalTaskCompletions)
    .where(eq(goalTaskCompletions.goalTaskId, goalTaskId));

  const completedToday = all.some((c) => c.completedDate === todayStr);
  const completionsThisWeek = all.filter(
    (c) => c.completedDate >= week.start && c.completedDate <= week.end,
  ).length;
  const completionsThisMonth = all.filter(
    (c) => c.completedDate >= month.start && c.completedDate <= month.end,
  ).length;

  return {
    completedCount: all.length,
    completedToday,
    completionsThisWeek,
    completionsThisMonth,
  };
}

export async function getAllGoals(): Promise<Goal[]> {
  const rows = await db.select().from(goals);
  return Promise.all(
    rows.map(async (row) => {
      const taskRows = await db.select().from(goalTasks).where(eq(goalTasks.goalId, row.id));
      const tasks = await Promise.all(
        taskRows.map(async (t) => {
          const stats = await getCompletionStats(t.id);
          return rowToTask(t, stats);
        }),
      );
      return rowToGoal(row, tasks);
    }),
  );
}

export async function createGoal(
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>,
  localTasks: LocalGoalTask[],
): Promise<Goal> {
  const id = generateId();
  const timestamp = now();

  await db.insert(goals).values({
    id,
    title: data.title,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    color: data.color,
    tolerance: data.tolerance ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const savedTasks: GoalTask[] = [];

  for (const lt of localTasks) {
    const taskId = generateId();
    const targetCount = calculateTargetCount(
      data.startDate,
      data.endDate,
      lt.recurrenceType,
      lt.recurrenceCount,
      lt.recurrenceDays,
    );

    await db.insert(goalTasks).values({
      id: taskId,
      goalId: id,
      title: lt.title,
      targetCount,
      recurrenceType: lt.recurrenceType,
      recurrenceCount: lt.recurrenceCount,
      recurrenceDays: lt.recurrenceDays.length ? JSON.stringify(lt.recurrenceDays) : null,
    });

    savedTasks.push({
      id: taskId,
      goalId: id,
      title: lt.title,
      targetCount,
      completedCount: 0,
      completedToday: false,
      completionsThisWeek: 0,
      completionsThisMonth: 0,
      recurrenceType: lt.recurrenceType,
      recurrenceCount: lt.recurrenceCount,
      recurrenceDays: lt.recurrenceDays,
    });
  }

  return { ...data, id, tasks: savedTasks, createdAt: timestamp, updatedAt: timestamp };
}

export async function deleteGoal(id: string): Promise<void> {
  const taskRows = await db.select().from(goalTasks).where(eq(goalTasks.goalId, id));
  for (const t of taskRows) {
    await db.delete(goalTaskCompletions).where(eq(goalTaskCompletions.goalTaskId, t.id));
  }
  await db.delete(goalTasks).where(eq(goalTasks.goalId, id));
  await db.delete(goals).where(eq(goals.id, id));
}

export async function addGoalTask(
  goalId: string,
  startDate: string,
  endDate: string,
  local: LocalGoalTask,
): Promise<GoalTask> {
  const id = generateId();
  const targetCount = calculateTargetCount(
    startDate,
    endDate,
    local.recurrenceType,
    local.recurrenceCount,
    local.recurrenceDays,
  );

  await db.insert(goalTasks).values({
    id,
    goalId,
    title: local.title,
    targetCount,
    recurrenceType: local.recurrenceType,
    recurrenceCount: local.recurrenceCount,
    recurrenceDays: local.recurrenceDays.length ? JSON.stringify(local.recurrenceDays) : null,
  });

  return {
    id,
    goalId,
    title: local.title,
    targetCount,
    completedCount: 0,
    completedToday: false,
    completionsThisWeek: 0,
    completionsThisMonth: 0,
    recurrenceType: local.recurrenceType,
    recurrenceCount: local.recurrenceCount,
    recurrenceDays: local.recurrenceDays,
  };
}

export async function updateGoal(
  id: string,
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>,
): Promise<void> {
  await db
    .update(goals)
    .set({
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      color: data.color,
      tolerance: data.tolerance ?? 0,
      updatedAt: now(),
    })
    .where(eq(goals.id, id));
}

export async function deleteGoalTask(taskId: string): Promise<void> {
  await db.delete(goalTaskCompletions).where(eq(goalTaskCompletions.goalTaskId, taskId));
  await db.delete(goalTasks).where(eq(goalTasks.id, taskId));
}

export async function completeGoalTaskForToday(taskId: string): Promise<void> {
  await db.insert(goalTaskCompletions).values({
    id: generateId(),
    goalTaskId: taskId,
    completedDate: today(),
    createdAt: now(),
  });
}

export async function uncompleteGoalTaskForToday(taskId: string): Promise<void> {
  const todayStr = today();
  const rows = await db
    .select()
    .from(goalTaskCompletions)
    .where(
      and(
        eq(goalTaskCompletions.goalTaskId, taskId),
        eq(goalTaskCompletions.completedDate, todayStr),
      ),
    );
  if (rows.length > 0) {
    await db
      .delete(goalTaskCompletions)
      .where(eq(goalTaskCompletions.id, rows[rows.length - 1].id));
  }
}

export interface GoalTaskForToday {
  task: GoalTask;
  goalId: string;
  goalTitle: string;
  goalColor?: string;
  isDue: boolean;
}

export async function getGoalTasksForToday(allGoals: Goal[]): Promise<GoalTaskForToday[]> {
  const todayStr = today();
  const WEEKDAYS = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  const todayWeekday = WEEKDAYS[new Date().getDay()];
  const week = getWeekRange();
  const month = getMonthRange();

  const result: GoalTaskForToday[] = [];

  for (const goal of allGoals) {
    if (goal.startDate > todayStr || goal.endDate < todayStr) continue;

    for (const task of goal.tasks) {
      let isDue = false;

      switch (task.recurrenceType) {
        case 'none':
          isDue = task.completedCount < task.targetCount;
          break;
        case 'daily':
          isDue = !task.completedToday;
          break;
        case 'times_per_week':
          isDue = task.completionsThisWeek < task.recurrenceCount;
          break;
        case 'times_per_month':
          isDue = task.completionsThisMonth < task.recurrenceCount;
          break;
        case 'specific_days':
          isDue =
            task.recurrenceDays.includes(todayWeekday as RecurrenceDay) && !task.completedToday;
          break;
      }

      result.push({
        task,
        goalId: goal.id,
        goalTitle: goal.title,
        goalColor: goal.color,
        isDue,
      });
    }
  }

  return result;
}

function rowToGoal(row: typeof goals.$inferSelect, tasks: GoalTask[]): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startDate: row.startDate,
    endDate: row.endDate,
    color: row.color ?? undefined,
    tolerance: row.tolerance ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tasks,
  };
}

function rowToTask(
  row: typeof goalTasks.$inferSelect,
  stats: Awaited<ReturnType<typeof getCompletionStats>>,
): GoalTask {
  return {
    id: row.id,
    goalId: row.goalId,
    title: row.title,
    targetCount: row.targetCount,
    completedCount: stats.completedCount,
    completedToday: stats.completedToday,
    completionsThisWeek: stats.completionsThisWeek,
    completionsThisMonth: stats.completionsThisMonth,
    recurrenceType: (row.recurrenceType as GoalTaskRecurrenceType) ?? 'none',
    recurrenceCount: row.recurrenceCount ?? 1,
    recurrenceDays: row.recurrenceDays ? JSON.parse(row.recurrenceDays) : [],
  };
}
