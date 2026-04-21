import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../index';
import { tasks, subtasks } from '../schema';
import type { Task, SubTask } from '@/types/task.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function getAllTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks);

  return Promise.all(
    rows.map(async (row) => {
      const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, row.id));
      return rowToTask(row, subs);
    }),
  );
}

export async function getTasksForDate(date: string): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.scheduledDate, date));

  return Promise.all(
    rows.map(async (row) => {
      const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, row.id));
      return rowToTask(row, subs);
    }),
  );
}

export async function getAnytimeTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(eq(tasks.type, 'anytime'));

  return Promise.all(
    rows.map(async (row) => {
      const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, row.id));
      return rowToTask(row, subs);
    }),
  );
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
    goalId: data.goalId,
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
      goalId: data.goalId,
      updatedAt: now(),
    })
    .where(eq(tasks.id, id));
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<void> {
  await db
    .update(tasks)
    .set({ completed: completed ? 1 : 0, updatedAt: now() })
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
    goalId: row.goalId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    subtasks: subs.map((s) => ({
      id: s.id,
      title: s.title,
      completed: s.completed === 1,
    })),
  };
}
