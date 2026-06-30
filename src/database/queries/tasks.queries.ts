import { eq } from 'drizzle-orm';
import { db } from '../index';
import { tasks, subtasks } from '../schema';
import type { Task } from '@/types/task.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function getAllTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks);
  if (rows.length === 0) return [];
  const allSubs = await db.select().from(subtasks);
  const subsByTaskId = new Map<string, typeof allSubs>();
  for (const sub of allSubs) {
    if (!subsByTaskId.has(sub.taskId)) {
      subsByTaskId.set(sub.taskId, []);
    }
    subsByTaskId.get(sub.taskId)!.push(sub);
  }

  return rows.map((row) => rowToTask(row, subsByTaskId.get(row.id) ?? []));
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
    priority: data.priority,
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
    await Promise.all(
      data.subtasks.map((sub) =>
        db.insert(subtasks).values({
          id: generateId(),
          taskId: id,
          title: sub.title,
          completed: sub.completed ? 1 : 0,
        }),
      ),
    );
  }

  const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, id));
  const row = await db.select().from(tasks).where(eq(tasks.id, id));
  return rowToTask(row[0], subs);
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  await db
    .update(tasks)
    .set({
      title: data.title,
      description: data.description,
      type: data.type,
      priority: data.priority,
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
      await Promise.all(
        data.subtasks.map((sub) =>
          db.insert(subtasks).values({
            id: generateId(),
            taskId: id,
            title: sub.title,
            completed: sub.completed ? 1 : 0,
          }),
        ),
      );
    }
  }
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<void> {
  await db
    .update(tasks)
    .set({
      completed: completed ? 1 : 0,
      completedAt: completed ? now() : null,
      updatedAt: now(),
    })
    .where(eq(tasks.id, id));
}

export async function toggleSubtaskComplete(id: string, completed: boolean): Promise<void> {
  await db
    .update(subtasks)
    .set({ completed: completed ? 1 : 0 })
    .where(eq(subtasks.id, id));
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(subtasks).where(eq(subtasks.taskId, id));
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function rolloverTask(oldTask: Task): Promise<Task> {
  const fresh = await createTask({
    title: oldTask.title,
    description: oldTask.description,
    type: oldTask.type,
    priority: oldTask.priority,
    completed: false,
    scheduledDate: undefined,
    dueDate: oldTask.dueDate,
    recurrenceDays: oldTask.recurrenceDays,
    recurrenceInterval: oldTask.recurrenceInterval,
    goalId: oldTask.goalId,
    themeId: oldTask.themeId,
    subtasks: oldTask.subtasks?.map((s) => ({ id: s.id, title: s.title, completed: false })),
  });

  await deleteTask(oldTask.id);

  return fresh;
}

function rowToTask(row: typeof tasks.$inferSelect, subs: (typeof subtasks.$inferSelect)[]): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type as Task['type'],
    priority: (row.priority as Task['priority']) ?? undefined,
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
