import { db } from '../index';
import { taskCompletions } from '../schema';
import type { Task } from '@/types/task.types';
import type { CompletedTaskRecord } from '@/types/taskHistory.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function saveTaskCompletion(task: Task): Promise<CompletedTaskRecord> {
  const id = generateId();
  const savedAt = now();
  const completedAt = task.completedAt ?? savedAt;

  await db.insert(taskCompletions).values({
    id,
    originalTaskId: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    priority: task.priority,
    recurrenceDays: task.recurrenceDays?.length ? JSON.stringify(task.recurrenceDays) : null,
    goalId: task.goalId,
    themeId: task.themeId,
    subtasksSnapshot: task.subtasks?.length ? JSON.stringify(task.subtasks) : null,
    completedAt,
    createdAt: task.createdAt,
    savedAt,
  });

  return {
    id,
    originalTaskId: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    priority: task.priority,
    recurrenceDays: task.recurrenceDays,
    goalId: task.goalId,
    themeId: task.themeId,
    subtasks: task.subtasks,
    completedAt,
    createdAt: task.createdAt,
    savedAt,
  };
}

export async function getAllTaskCompletions(): Promise<CompletedTaskRecord[]> {
  const rows = await db.select().from(taskCompletions);
  return rows
    .map((row) => ({
      id: row.id,
      originalTaskId: row.originalTaskId,
      title: row.title,
      description: row.description ?? undefined,
      type: row.type as CompletedTaskRecord['type'],
      priority: (row.priority as CompletedTaskRecord['priority']) ?? undefined,
      recurrenceDays: row.recurrenceDays ? JSON.parse(row.recurrenceDays) : undefined,
      goalId: row.goalId ?? undefined,
      themeId: row.themeId ?? undefined,
      subtasks: row.subtasksSnapshot ? JSON.parse(row.subtasksSnapshot) : undefined,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      savedAt: row.savedAt,
    }))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}
