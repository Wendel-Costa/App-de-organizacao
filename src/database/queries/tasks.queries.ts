import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../index';
import { tasks, subtasks, taskSkips } from '../schema';
import type { Task } from '@/types/task.types';
import { localDateStr } from '@/utils/date';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function getAllTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks);
  if (rows.length === 0) return [];
  const taskIds = rows.map((row) => row.id);
  const allSubs = await db
    .select({
      id: subtasks.id,
      taskId: subtasks.taskId,
      title: subtasks.title,
      completed: subtasks.completed,
    })
    .from(subtasks)
    .where(inArray(subtasks.taskId, taskIds));
  const latestSkips = await db
    .select({
      taskId: taskSkips.taskId,
      skippedDate: sql<string>`max(${taskSkips.skippedDate})`,
    })
    .from(taskSkips)
    .where(inArray(taskSkips.taskId, taskIds))
    .groupBy(taskSkips.taskId);
  const subsByTaskId = new Map<string, typeof allSubs>();
  const latestSkipByTaskId = new Map<string, string>();

  for (const sub of allSubs) {
    if (!subsByTaskId.has(sub.taskId)) {
      subsByTaskId.set(sub.taskId, []);
    }
    subsByTaskId.get(sub.taskId)!.push(sub);
  }

  for (const skip of latestSkips) {
    if (skip.skippedDate) latestSkipByTaskId.set(skip.taskId, skip.skippedDate);
  }

  return rows.map((row) => ({
    ...rowToTask(row, subsByTaskId.get(row.id) ?? []),
    skippedDate: latestSkipByTaskId.get(row.id),
  }));
}

export async function createTask(
  data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Task> {
  const id = generateId();
  const timestamp = now();

  await db.insert(tasks).values({
    id,
    title: data.title,
    description: data.description,
    type: data.type,
    scoreLevel: data.scoreLevel ?? 1,
    completed: data.completed ? 1 : 0,
    scheduledDate: data.scheduledDate,
    dueDate: data.dueDate,
    recurrenceDays: data.recurrenceDays ? JSON.stringify(data.recurrenceDays) : null,
    recurrenceInterval: data.recurrenceInterval ?? null,
    goalId: data.goalId,
    themeId: data.themeId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  if (data.subtasks?.length) {
    for (const sub of data.subtasks) {
      await db.insert(subtasks).values({
        id: generateId(),
        taskId: id,
        title: sub.title,
        completed: sub.completed ? 1 : 0,
      });
    }
  }

  const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, id));
  const row = await db.select().from(tasks).where(eq(tasks.id, id));
  return rowToTask(row[0], subs);
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  await db
    .update(tasks)
    .set({
      title: data.title,
      description: data.description,
      type: data.type,
      scoreLevel: data.scoreLevel ?? 1,
      completed: data.completed !== undefined ? (data.completed ? 1 : 0) : undefined,
      scheduledDate: data.scheduledDate,
      dueDate: data.dueDate,
      recurrenceDays: data.recurrenceDays ? JSON.stringify(data.recurrenceDays) : undefined,
      recurrenceInterval: data.recurrenceInterval ?? null,
      goalId: data.goalId,
      themeId: data.themeId,
      updatedAt: now(),
    })
    .where(eq(tasks.id, id));

  if (data.subtasks !== undefined) {
    await db.delete(subtasks).where(eq(subtasks.taskId, id));
    if (data.subtasks.length > 0) {
      for (const sub of data.subtasks) {
        await db.insert(subtasks).values({
          id: generateId(),
          taskId: id,
          title: sub.title,
          completed: sub.completed ? 1 : 0,
        });
      }
    }
  }

  const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, id));
  const row = await db.select().from(tasks).where(eq(tasks.id, id));
  return rowToTask(row[0], subs);
}

export async function toggleSubtaskComplete(id: string, completed: boolean): Promise<void> {
  await db
    .update(subtasks)
    .set({ completed: completed ? 1 : 0 })
    .where(eq(subtasks.id, id));
}

export async function resetRecurringTaskOccurrence(
  taskId: string,
  expectedCompletedAt: string | null,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const completionCondition =
      expectedCompletedAt === null
        ? isNull(tasks.completedAt)
        : eq(tasks.completedAt, expectedCompletedAt);

    const resetRows = await tx
      .update(tasks)
      .set({
        completed: 0,
        completedAt: null,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.completed, 1), completionCondition))
      .returning({ id: tasks.id });

    if (resetRows.length === 0) return false;

    await tx.update(subtasks).set({ completed: 0 }).where(eq(subtasks.taskId, taskId));
    return true;
  });
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(subtasks).where(eq(subtasks.taskId, id));
  await db.delete(tasks).where(eq(tasks.id, id));
}

function rowToTask(row: typeof tasks.$inferSelect, subs: (typeof subtasks.$inferSelect)[]): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type as Task['type'],
    scoreLevel: (row.scoreLevel as Task['scoreLevel']) ?? 1,
    completed: row.completed === 1,
    scheduledDate: row.scheduledDate ?? undefined,
    dueDate: row.dueDate ?? undefined,
    recurrenceDays: row.recurrenceDays ? JSON.parse(row.recurrenceDays) : undefined,
    recurrenceInterval: row.recurrenceInterval ?? undefined,
    goalId: row.goalId ?? undefined,
    themeId: row.themeId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    subtasks: subs.map((s) => ({
      id: s.id,
      title: s.title,
      completed: s.completed === 1,
    })),
    completedAt: row.completedAt ?? undefined,
  };
}

export async function skipTaskOccurrence(id: string): Promise<void> {
  const skippedDate = localDateStr();
  await db
    .delete(taskSkips)
    .where(and(eq(taskSkips.taskId, id), eq(taskSkips.skippedDate, skippedDate)));
  await db.insert(taskSkips).values({
    id: generateId(),
    taskId: id,
    skippedDate,
    createdAt: now(),
  });
}
