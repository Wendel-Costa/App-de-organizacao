import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../index';
import { goals, goalTasks, goalTaskCompletions, focusSessions, focusThemes } from '../schema';
import { notebookTopics } from '../schema';
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
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string');
      }
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

export async function getActiveGoalCount(): Promise<number> {
  const todayStr = today();

  const rows = await db
    .select({ id: goals.id })
    .from(goals)
    .where(
      and(eq(goals.archived, 0), lte(goals.startDate, todayStr), gte(goals.endDate, todayStr)),
    );

  return rows.length;
}

export async function getAllGoals(): Promise<Goal[]> {
  const goalRows = await db
    .select({
      id: goals.id,
      title: goals.title,
      description: goals.description,
      startDate: goals.startDate,
      endDate: goals.endDate,
      color: goals.color,
      tolerance: goals.tolerance,
      allowOverflow: goals.allowOverflow,
      allowBeyond100: goals.allowBeyond100,
      archived: goals.archived,
      sortOrder: goals.sortOrder,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals);

  if (goalRows.length === 0) return [];

  const taskRows = await db
    .select({
      id: goalTasks.id,
      goalId: goalTasks.goalId,
      title: goalTasks.title,
      targetCount: goalTasks.targetCount,
      type: goalTasks.type,
      themeId: goalTasks.themeId,
      themeName: goalTasks.themeName,
      themeIds: goalTasks.themeIds,
      notebookId: goalTasks.notebookId,
      recurrenceType: goalTasks.recurrenceType,
      recurrenceCount: goalTasks.recurrenceCount,
      recurrenceDays: goalTasks.recurrenceDays,
    })
    .from(goalTasks);

  if (taskRows.length === 0) {
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
        tasks: [],
      }))
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  }

  const goalTaskIds = taskRows.map((task) => task.id);
  const todayStr = today();
  const week = getWeekRange();
  const month = getMonthRange();
  const focusTaskRows = taskRows.filter((task) => task.type === 'focus_hours');
  const notebookTaskRows = taskRows.filter((task) => task.type === 'notebook' && task.notebookId);

  const minGoalDate = goalRows.reduce(
    (min, goal) => (goal.startDate < min ? goal.startDate : min),
    goalRows[0].startDate,
  );
  const maxGoalDate = goalRows.reduce(
    (max, goal) => (goal.endDate > max ? goal.endDate : max),
    goalRows[0].endDate,
  );

  const dateWithOffset = (date: string, offsetDays: number) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + offsetDays);
    return localDateStr(value);
  };

  const focusSessionStart = `${dateWithOffset(minGoalDate, -1)}T00:00:00.000Z`;
  const focusSessionEnd = `${dateWithOffset(maxGoalDate, 1)}T23:59:59.999Z`;

  const [completionStats, focusStats, notebookStats] = await Promise.all([
    db
      .select({
        goalTaskId: goalTaskCompletions.goalTaskId,
        completedCount: sql<number>`count(*)`,
        completedToday: sql<number>`sum(case when ${goalTaskCompletions.completedDate} = ${todayStr} then 1 else 0 end)`,
        completionsThisWeek: sql<number>`sum(case when ${goalTaskCompletions.completedDate} >= ${week.start} and ${goalTaskCompletions.completedDate} <= ${week.end} then 1 else 0 end)`,
        completionsThisMonth: sql<number>`sum(case when ${goalTaskCompletions.completedDate} >= ${month.start} and ${goalTaskCompletions.completedDate} <= ${month.end} then 1 else 0 end)`,
        lastCompletedDate: sql<string | null>`max(${goalTaskCompletions.completedDate})`,
      })
      .from(goalTaskCompletions)
      .where(inArray(goalTaskCompletions.goalTaskId, goalTaskIds))
      .groupBy(goalTaskCompletions.goalTaskId),
    focusTaskRows.length === 0
      ? Promise.resolve([])
      : db
          .select({
            taskId: goalTasks.id,
            totalMinutes: sql<number>`coalesce(sum(${focusSessions.duration}), 0)`,
            completedToday: sql<number>`sum(case when date(${focusSessions.startTime}, 'localtime') = ${todayStr} then 1 else 0 end)`,
          })
          .from(goalTasks)
          .innerJoin(goals, eq(goalTasks.goalId, goals.id))
          .leftJoin(
            focusSessions,
            sql`
              ${focusSessions.startTime} >= ${focusSessionStart}
              and ${focusSessions.startTime} <= ${focusSessionEnd}
              and date(${focusSessions.startTime}, 'localtime') >= ${goals.startDate}
              and date(${focusSessions.startTime}, 'localtime') <= ${goals.endDate}
              and (
                ${goalTasks.themeIds} is null
                or ${goalTasks.themeIds} = ''
                or ${goalTasks.themeId} = ${focusSessions.themeId}
                or instr(${goalTasks.themeIds}, '"' || coalesce(${focusSessions.themeId}, '') || '"') > 0
              )
            `,
          )
          .where(
            inArray(
              goalTasks.id,
              focusTaskRows.map((task) => task.id),
            ),
          )
          .groupBy(goalTasks.id),
    notebookTaskRows.length === 0
      ? Promise.resolve([])
      : db
          .select({
            notebookId: notebookTopics.notebookId,
            total: sql<number>`count(*)`,
            completed: sql<number>`sum(case when ${notebookTopics.completed} = 1 then 1 else 0 end)`,
          })
          .from(notebookTopics)
          .where(
            inArray(
              notebookTopics.notebookId,
              Array.from(new Set(notebookTaskRows.map((task) => task.notebookId as string))),
            ),
          )
          .groupBy(notebookTopics.notebookId),
  ]);

  const usedThemeIds = Array.from(new Set(taskRows.flatMap((task) => parseThemeIds(task))));
  const themeRows = usedThemeIds.length
    ? await db
        .select({ id: focusThemes.id, name: focusThemes.name })
        .from(focusThemes)
        .where(inArray(focusThemes.id, usedThemeIds))
    : [];

  const completionByTaskId = new Map(completionStats.map((row) => [row.goalTaskId, row]));
  const focusByTaskId = new Map(focusStats.map((row) => [row.taskId, row]));
  const notebookById = new Map(notebookStats.map((row) => [row.notebookId, row]));
  const themeNameById = new Map(themeRows.map((theme) => [theme.id, theme.name]));
  const tasksByGoalId = new Map<string, GoalTask[]>();

  for (const taskRow of taskRows) {
    const taskType = (taskRow.type ?? 'habit') as GoalTaskType;
    const themeIds = parseThemeIds(taskRow);
    const completion = completionByTaskId.get(taskRow.id);
    const focus = focusByTaskId.get(taskRow.id);
    const notebook = taskRow.notebookId ? notebookById.get(taskRow.notebookId) : undefined;

    let completedCount = 0;
    let completedToday = false;
    let completionsThisWeek = 0;
    let completionsThisMonth = 0;

    if (taskType === 'notebook') {
      const total = Number(notebook?.total ?? 0);
      const completed = Number(notebook?.completed ?? 0);
      completedCount = total > 0 ? completed / total : 0;
    } else if (taskType === 'focus_hours') {
      completedCount = Math.round((Number(focus?.totalMinutes ?? 0) / 60) * 10) / 10;
      completedToday = Number(focus?.completedToday ?? 0) > 0;
    } else {
      completedCount = Number(completion?.completedCount ?? 0);
      completedToday = Number(completion?.completedToday ?? 0) > 0;
      completionsThisWeek = Number(completion?.completionsThisWeek ?? 0);
      completionsThisMonth = Number(completion?.completionsThisMonth ?? 0);
    }

    const recurrenceDays = taskRow.recurrenceDays ? JSON.parse(taskRow.recurrenceDays) : [];

    const mappedTask: GoalTask = {
      id: taskRow.id,
      goalId: taskRow.goalId,
      title: taskRow.title,
      type: taskType,
      targetCount: taskRow.targetCount,
      completedCount,
      completedToday,
      completionsThisWeek,
      completionsThisMonth,
      recurrenceType: (taskRow.recurrenceType as GoalTaskRecurrenceType) ?? 'none',
      recurrenceCount: taskRow.recurrenceCount ?? 1,
      recurrenceDays,
      lastCompletedDate: completion?.lastCompletedDate ?? undefined,
      themeIds: themeIds.length > 0 ? themeIds : undefined,
      themeNames:
        themeIds.length > 0
          ? themeIds.map((id) => themeNameById.get(id) ?? '(tema removido)')
          : undefined,
      notebookId: taskRow.notebookId ?? undefined,
    };

    const tasks = tasksByGoalId.get(taskRow.goalId) ?? [];

    tasks.push(mappedTask);
    tasksByGoalId.set(taskRow.goalId, tasks);
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

export async function getTodayGoalTasks(): Promise<GoalTaskForToday[]> {
  const todayStr = today();
  const week = getWeekRange();
  const month = getMonthRange();

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

  const activeGoals = await db
    .select()
    .from(goals)
    .where(
      and(eq(goals.archived, 0), lte(goals.startDate, todayStr), gte(goals.endDate, todayStr)),
    );

  if (activeGoals.length === 0) return [];

  const goalIds = activeGoals.map((goal) => goal.id);

  const taskRows = await db.select().from(goalTasks).where(inArray(goalTasks.goalId, goalIds));

  if (taskRows.length === 0) return [];

  const taskIds = taskRows.map((task) => task.id);

  const completionRows = await db
    .select()
    .from(goalTaskCompletions)
    .where(inArray(goalTaskCompletions.goalTaskId, taskIds));

  const notebookIds = taskRows
    .filter((task) => task.type === 'notebook' && Boolean(task.notebookId))
    .map((task) => task.notebookId as string);

  const notebookTopicRows =
    notebookIds.length > 0
      ? await db
          .select()
          .from(notebookTopics)
          .where(inArray(notebookTopics.notebookId, notebookIds))
      : [];

  const completionsByTaskId = new Map<string, typeof completionRows>();

  for (const completion of completionRows) {
    const list = completionsByTaskId.get(completion.goalTaskId) ?? [];

    list.push(completion);
    completionsByTaskId.set(completion.goalTaskId, list);
  }

  const notebookTopicStats = new Map<string, { total: number; completed: number }>();
  for (const topic of notebookTopicRows) {
    const stats = notebookTopicStats.get(topic.notebookId) ?? { total: 0, completed: 0 };
    stats.total++;
    if (topic.completed === 1) stats.completed++;
    notebookTopicStats.set(topic.notebookId, stats);
  }

  const notebookProgress = new Map<string, number>();

  for (const notebookId of notebookIds) {
    const stats = notebookTopicStats.get(notebookId);
    notebookProgress.set(notebookId, stats && stats.total > 0 ? stats.completed / stats.total : 0);
  }

  const goalById = new Map(activeGoals.map((goal) => [goal.id, goal]));

  const result: GoalTaskForToday[] = [];

  for (const taskRow of taskRows) {
    const taskType = (taskRow.type ?? 'habit') as GoalTaskType;

    if (taskType === 'focus_hours') continue;

    const completions = completionsByTaskId.get(taskRow.id) ?? [];

    const completedToday = completions.some((completion) => completion.completedDate === todayStr);

    const completedCount =
      taskType === 'notebook'
        ? (notebookProgress.get(taskRow.notebookId ?? '') ?? 0)
        : completions.length;

    const completionsThisWeek = completions.filter(
      (completion) =>
        completion.completedDate >= week.start && completion.completedDate <= week.end,
    ).length;

    const completionsThisMonth = completions.filter(
      (completion) =>
        completion.completedDate >= month.start && completion.completedDate <= month.end,
    ).length;

    const lastCompletedDate = completions.length
      ? completions.reduce(
          (latest, completion) =>
            completion.completedDate > latest ? completion.completedDate : latest,
          completions[0].completedDate,
        )
      : undefined;

    const recurrenceType = (taskRow.recurrenceType as GoalTaskRecurrenceType) ?? 'none';

    const recurrenceCount = taskRow.recurrenceCount ?? 1;

    const recurrenceDays = taskRow.recurrenceDays ? JSON.parse(taskRow.recurrenceDays) : [];

    let isDue = false;

    if (taskType === 'wildcard') {
      isDue = completedCount < taskRow.targetCount;
    } else {
      switch (recurrenceType) {
        case 'none':
          isDue = completedCount < taskRow.targetCount;
          break;

        case 'daily':
          isDue = !completedToday;
          break;

        case 'times_per_week':
          isDue = completionsThisWeek < recurrenceCount;
          break;

        case 'times_per_month':
          isDue = completionsThisMonth < recurrenceCount;
          break;

        case 'specific_days':
          isDue = recurrenceDays.includes(todayWeekday) && !completedToday;
          break;

        case 'every_x_days': {
          if (!lastCompletedDate) {
            isDue = true;
          } else {
            const lastDate = new Date(lastCompletedDate + 'T12:00:00');
            const todayDate = new Date(todayStr + 'T12:00:00');

            const daysSince = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);

            isDue = daysSince >= recurrenceCount;
          }

          break;
        }
      }
    }

    result.push({
      task: {
        id: taskRow.id,
        goalId: taskRow.goalId,
        title: taskRow.title,
        type: taskType,
        targetCount: taskRow.targetCount,
        completedCount,
        completedToday,
        completionsThisWeek,
        completionsThisMonth,
        recurrenceType,
        recurrenceCount,
        recurrenceDays,
        lastCompletedDate,
        themeIds: parseThemeIds(taskRow),
        notebookId: taskRow.notebookId ?? undefined,
      },
      goalId: taskRow.goalId,
      goalTitle: goalById.get(taskRow.goalId)?.title ?? '',
      goalColor: goalById.get(taskRow.goalId)?.color ?? undefined,
      isDue,
    });
  }

  return result;
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

    if (taskType === 'wildcard' || taskType === 'notebook') {
      targetCount = 1;
    } else if (taskType === 'focus_hours') {
      targetCount = lt.targetHours ?? 10;
    } else {
      targetCount = calculateTargetCount(
        data.startDate,
        data.endDate,
        lt.recurrenceType,
        lt.recurrenceCount,
        lt.recurrenceDays,
      );
    }

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
      notebookId: lt.notebookId ?? null,
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
      notebookId: lt.notebookId,
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
  await db
    .update(goals)
    .set({
      archived: 1,
      updatedAt: now(),
    })
    .where(eq(goals.id, id));
}

export async function setAllowBeyond100(id: string, value: boolean): Promise<void> {
  await db
    .update(goals)
    .set({
      allowBeyond100: value ? 1 : 0,
      updatedAt: now(),
    })
    .where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  const taskRows = await db.select().from(goalTasks).where(eq(goalTasks.goalId, id));

  for (const task of taskRows) {
    await db.delete(goalTaskCompletions).where(eq(goalTaskCompletions.goalTaskId, task.id));
  }
  await db.delete(goalTasks).where(eq(goalTasks.goalId, id));
  await db.delete(goals).where(eq(goals.id, id));
}

export async function reorderGoals(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(goals)
      .set({
        sortOrder: i,
      })
      .where(eq(goals.id, orderedIds[i]));
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

  if (taskType === 'wildcard' || taskType === 'notebook') {
    targetCount = 1;
  } else if (taskType === 'focus_hours') {
    targetCount = local.targetHours ?? 10;
  } else {
    targetCount = calculateTargetCount(
      startDate,
      endDate,
      local.recurrenceType,
      local.recurrenceCount,
      local.recurrenceDays,
    );
  }

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
    notebookId: local.notebookId ?? null,
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
    notebookId: local.notebookId,
  };
}

export async function deleteGoalTask(taskId: string): Promise<void> {
  await db.delete(goalTaskCompletions).where(eq(goalTaskCompletions.goalTaskId, taskId));

  await db.delete(goalTasks).where(eq(goalTasks.id, taskId));
}

export async function completeGoalTaskForToday(taskId: string): Promise<boolean> {
  const todayStr = today();
  const existing = await db
    .select({ id: goalTaskCompletions.id })
    .from(goalTaskCompletions)
    .where(
      and(
        eq(goalTaskCompletions.goalTaskId, taskId),
        eq(goalTaskCompletions.completedDate, todayStr),
      ),
    )
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(goalTaskCompletions).values({
    id: generateId(),
    goalTaskId: taskId,
    completedDate: todayStr,
    createdAt: now(),
  });
  return true;
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
    if (goal.archived || goal.startDate > todayStr || goal.endDate < todayStr) {
      continue;
    }

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
            isDue = task.recurrenceDays.includes(todayWeekday) && !task.completedToday;
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
