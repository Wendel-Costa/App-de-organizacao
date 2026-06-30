import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { goals, goalTasks, goalTaskCompletions, focusSessions, focusThemes } from '../schema';
import type {
  Goal,
  GoalTask,
  GoalTaskRecurrenceType,
  GoalTaskType,
  LocalGoalTask,
} from '@/types/goal.types';
import type { RecurrenceDay } from '@/types/task.types';
import {
  localDateStr,
  dateOf,
  localWeekStart,
  localWeekEnd,
  localMonthStart,
  localMonthEnd,
} from '@/utils/date';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

function today() {
  return localDateStr();
}

function getWeekRange() {
  return { start: localWeekStart(), end: localWeekEnd() };
}

function getMonthRange() {
  return { start: localMonthStart(), end: localMonthEnd() };
}

function parseThemeIds(row: { themeIds: string | null; themeId: string | null }): string[] {
  if (row.themeIds) {
    try {
      const parsed = JSON.parse(row.themeIds);
      if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string');
    } catch {}
  }
  return row.themeId ? [row.themeId] : [];
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
      const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const idx = recurrenceDays.map((d) => WD.indexOf(d));
      let count = 0;
      const cur = new Date(start);
      while (cur <= end) {
        if (idx.includes(cur.getDay())) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }
    case 'every_x_days': {
      const interval = Math.max(1, recurrenceCount);
      return Math.max(1, Math.floor(days / interval));
    }
    default:
      return recurrenceCount;
  }
}

export async function getAllGoals(): Promise<Goal[]> {
  const goalRows = await db.select().from(goals);
  if (goalRows.length === 0) return [];

  const taskRows = await db.select().from(goalTasks);
  const completionRows = await db.select().from(goalTaskCompletions);
  const sessionRows = await db.select().from(focusSessions);
  const themeRows = await db.select().from(focusThemes);

  const todayStr = today();
  const week = getWeekRange();
  const month = getMonthRange();

  const themeNameById = new Map(themeRows.map((t) => [t.id, t.name]));

  const completionsByTaskId = new Map<string, typeof completionRows>();
  for (const c of completionRows) {
    if (!completionsByTaskId.has(c.goalTaskId)) completionsByTaskId.set(c.goalTaskId, []);
    completionsByTaskId.get(c.goalTaskId)!.push(c);
  }

  const goalById = new Map(goalRows.map((g) => [g.id, g]));

  const tasksByGoalId = new Map<string, GoalTask[]>();

  for (const t of taskRows) {
    const taskType = (t.type ?? 'habit') as GoalTaskType;
    const themeIds = parseThemeIds(t);
    let completedCount = 0,
      completedToday = false,
      completionsThisWeek = 0,
      completionsThisMonth = 0;

    if (taskType === 'focus_hours') {
      const goal = goalById.get(t.goalId);
      if (goal) {
        const relevantSessions = sessionRows.filter((s) => {
          const date = dateOf(s.startTime);
          const inPeriod = date >= goal.startDate && date <= goal.endDate;
          const matchTheme =
            themeIds.length > 0 ? (s.themeId ? themeIds.includes(s.themeId) : false) : true;
          return inPeriod && matchTheme;
        });

        const totalMinutes = relevantSessions.reduce((acc, s) => acc + s.duration, 0);
        completedCount = Math.round((totalMinutes / 60) * 10) / 10;
        completedToday = relevantSessions.some((s) => dateOf(s.startTime) === todayStr);
      }
    } else {
      const comps = completionsByTaskId.get(t.id) ?? [];
      completedCount = comps.length;
      completedToday = comps.some((c) => c.completedDate === todayStr);
      completionsThisWeek = comps.filter(
        (c) => c.completedDate >= week.start && c.completedDate <= week.end,
      ).length;
      completionsThisMonth = comps.filter(
        (c) => c.completedDate >= month.start && c.completedDate <= month.end,
      ).length;
    }

    const allComps = completionsByTaskId.get(t.id) ?? [];
    const lastCompletedDate =
      allComps.length > 0
        ? allComps.reduce(
            (latest, c) => (c.completedDate > latest ? c.completedDate : latest),
            allComps[0].completedDate,
          )
        : undefined;

    if (!tasksByGoalId.has(t.goalId)) tasksByGoalId.set(t.goalId, []);
    tasksByGoalId.get(t.goalId)!.push({
      id: t.id,
      goalId: t.goalId,
      title: t.title,
      type: taskType,
      targetCount: t.targetCount,
      completedCount,
      completedToday,
      completionsThisWeek,
      completionsThisMonth,
      recurrenceType: (t.recurrenceType as GoalTaskRecurrenceType) ?? 'none',
      recurrenceCount: t.recurrenceCount ?? 1,
      recurrenceDays: t.recurrenceDays ? JSON.parse(t.recurrenceDays) : [],
      lastCompletedDate,
      themeIds: themeIds.length > 0 ? themeIds : undefined,
      themeNames:
        themeIds.length > 0
          ? themeIds.map((id) => themeNameById.get(id) ?? '(tema removido)')
          : undefined,
    });
  }

  return goalRows
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      startDate: row.startDate,
      endDate: row.endDate,
      color: row.color ?? undefined,
      tolerance: row.tolerance ?? 0,
      allowOverflow: Boolean(row.allowOverflow),
      allowBeyond100: Boolean(row.allowBeyond100),
      archived: Boolean(row.archived),
      order: row.sortOrder ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tasks: tasksByGoalId.get(row.id) ?? [],
    }))
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export async function createGoal(
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'order'>,
  localTasks: LocalGoalTask[],
): Promise<Goal> {
  const id = generateId();
  const timestamp = now();

  const existing = await db.select().from(goals);
  const maxOrder = existing.reduce((m, g) => Math.max(m, g.sortOrder ?? 0), 0);
  const order = existing.length > 0 ? maxOrder + 1 : 0;

  await db.insert(goals).values({
    id,
    title: data.title,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    color: data.color,
    tolerance: data.tolerance ?? 0,
    allowOverflow: data.allowOverflow ? 1 : 0,
    allowBeyond100: data.allowBeyond100 ? 1 : 0,
    archived: 0,
    sortOrder: order,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const savedTasks: GoalTask[] = [];

  for (const lt of localTasks) {
    const taskId = generateId();
    const taskType = lt.type ?? 'habit';

    let targetCount: number;
    if (taskType === 'wildcard') targetCount = 1;
    else if (taskType === 'focus_hours') targetCount = lt.targetHours ?? 10;
    else
      targetCount = calculateTargetCount(
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
      type: taskType,
      themeIds: lt.themeIds?.length ? JSON.stringify(lt.themeIds) : null,
      recurrenceType: taskType === 'habit' ? lt.recurrenceType : 'none',
      recurrenceCount: taskType === 'habit' ? lt.recurrenceCount : 1,
      recurrenceDays: lt.recurrenceDays?.length ? JSON.stringify(lt.recurrenceDays) : null,
    });

    savedTasks.push({
      id: taskId,
      goalId: id,
      title: lt.title,
      type: taskType,
      targetCount,
      completedCount: 0,
      completedToday: false,
      completionsThisWeek: 0,
      completionsThisMonth: 0,
      recurrenceType: lt.recurrenceType,
      recurrenceCount: lt.recurrenceCount,
      recurrenceDays: lt.recurrenceDays,
      themeIds: lt.themeIds,
      themeNames: lt.themeNames,
    });
  }

  return {
    ...data,
    id,
    archived: false,
    order,
    tasks: savedTasks,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function updateGoal(
  id: string,
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'order'>,
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
      allowOverflow: data.allowOverflow ? 1 : 0,
      updatedAt: now(),
    })
    .where(eq(goals.id, id));
}

export async function archiveGoal(id: string): Promise<void> {
  await db.update(goals).set({ archived: 1, updatedAt: now() }).where(eq(goals.id, id));
}

export async function setAllowBeyond100(id: string, value: boolean): Promise<void> {
  await db
    .update(goals)
    .set({ allowBeyond100: value ? 1 : 0, updatedAt: now() })
    .where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  const taskRows = await db.select().from(goalTasks).where(eq(goalTasks.goalId, id));
  for (const t of taskRows) {
    await db.delete(goalTaskCompletions).where(eq(goalTaskCompletions.goalTaskId, t.id));
  }
  await db.delete(goalTasks).where(eq(goalTasks.goalId, id));
  await db.delete(goals).where(eq(goals.id, id));
}

export async function reorderGoals(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(goals).set({ sortOrder: i }).where(eq(goals.id, orderedIds[i]));
  }
}

export async function addGoalTask(
  goalId: string,
  startDate: string,
  endDate: string,
  local: LocalGoalTask,
): Promise<GoalTask> {
  const id = generateId();
  const taskType = local.type ?? 'habit';

  let targetCount: number;
  if (taskType === 'wildcard') targetCount = 1;
  else if (taskType === 'focus_hours') targetCount = local.targetHours ?? 10;
  else
    targetCount = calculateTargetCount(
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
    type: taskType,
    themeIds: local.themeIds?.length ? JSON.stringify(local.themeIds) : null,
    recurrenceType: taskType === 'habit' ? local.recurrenceType : 'none',
    recurrenceCount: taskType === 'habit' ? local.recurrenceCount : 1,
    recurrenceDays: local.recurrenceDays?.length ? JSON.stringify(local.recurrenceDays) : null,
  });

  return {
    id,
    goalId,
    title: local.title,
    type: taskType,
    targetCount,
    completedCount: 0,
    completedToday: false,
    completionsThisWeek: 0,
    completionsThisMonth: 0,
    recurrenceType: local.recurrenceType,
    recurrenceCount: local.recurrenceCount,
    recurrenceDays: local.recurrenceDays,
    themeIds: local.themeIds,
    themeNames: local.themeNames,
  };
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

  const result: GoalTaskForToday[] = [];

  for (const goal of allGoals) {
    if (goal.archived) continue;
    if (goal.startDate > todayStr || goal.endDate < todayStr) continue;

    for (const task of goal.tasks) {
      if (task.type === 'focus_hours') continue;

      let isDue = false;

      if (task.type === 'wildcard') {
        isDue = task.completedCount < task.targetCount;
      } else {
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
          case 'every_x_days': {
            if (!task.lastCompletedDate) {
              isDue = true;
            } else {
              const lastDate = new Date(task.lastCompletedDate + 'T12:00:00');
              const todayDate = new Date(todayStr + 'T12:00:00');
              const daysSince = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);
              isDue = daysSince >= task.recurrenceCount;
            }
            break;
          }
        }
      }

      result.push({ task, goalId: goal.id, goalTitle: goal.title, goalColor: goal.color, isDue });
    }
  }

  return result;
}
