import { and, asc, eq } from 'drizzle-orm';
import { db } from '../index';
import { notebookTopics, notebooks } from '../schema';
import type { Notebook, NotebookProgress, NotebookTopic } from '@/types/notebook.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

function progressOf(total: number, completed: number): NotebookProgress {
  return {
    totalTopics: total,
    completedTopics: completed,
    progress: total === 0 ? 0 : completed / total,
  };
}

function rowToTopic(row: typeof notebookTopics.$inferSelect): NotebookTopic {
  return {
    id: row.id,
    notebookId: row.notebookId,
    title: row.title,
    completed: row.completed === 1,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAllNotebooks(): Promise<Notebook[]> {
  const notebookRows = await db.select().from(notebooks).orderBy(asc(notebooks.sortOrder));
  const topicRows = await db.select().from(notebookTopics).orderBy(asc(notebookTopics.sortOrder));
  const topicsByNotebook = new Map<string, NotebookTopic[]>();

  for (const row of topicRows) {
    const list = topicsByNotebook.get(row.notebookId) ?? [];
    list.push(rowToTopic(row));
    topicsByNotebook.set(row.notebookId, list);
  }

  return notebookRows.map((row) => {
    const topics = topicsByNotebook.get(row.id) ?? [];
    const completed = topics.filter((t) => t.completed).length;
    return {
      id: row.id,
      title: row.title,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...progressOf(topics.length, completed),
      topics,
    };
  });
}

export async function createNotebook(title: string): Promise<Notebook> {
  const timestamp = now();
  const rows = await db.select().from(notebooks);
  const order = rows.length ? Math.max(...rows.map((n) => n.sortOrder)) + 1 : 0;
  const id = generateId();

  await db.insert(notebooks).values({
    id,
    title: title.trim(),
    sortOrder: order,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    id,
    title: title.trim(),
    sortOrder: order,
    createdAt: timestamp,
    updatedAt: timestamp,
    totalTopics: 0,
    completedTopics: 0,
    progress: 0,
    topics: [],
  };
}

export async function updateNotebook(id: string, title: string): Promise<void> {
  await db
    .update(notebooks)
    .set({ title: title.trim(), updatedAt: now() })
    .where(eq(notebooks.id, id));
}

export async function deleteNotebook(id: string): Promise<void> {
  await db.delete(notebookTopics).where(eq(notebookTopics.notebookId, id));
  await db.delete(notebooks).where(eq(notebooks.id, id));
}

export async function addTopics(notebookId: string, titles: string[]): Promise<NotebookTopic[]> {
  const clean = titles.map((title) => title.trim()).filter(Boolean);
  if (clean.length === 0) return [];
  const existing = await db
    .select()
    .from(notebookTopics)
    .where(eq(notebookTopics.notebookId, notebookId));
  const startOrder = existing.length ? Math.max(...existing.map((t) => t.sortOrder)) + 1 : 0;
  const timestamp = now();
  const rows = clean.map((title, index) => ({
    id: generateId(),
    notebookId,
    title,
    completed: 0,
    sortOrder: startOrder + index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  await db.insert(notebookTopics).values(rows);
  await db.update(notebooks).set({ updatedAt: now() }).where(eq(notebooks.id, notebookId));
  return rows.map((row) => rowToTopic(row));
}

export function parseTopicInput(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function updateTopic(id: string, title: string): Promise<void> {
  await db
    .update(notebookTopics)
    .set({ title: title.trim(), updatedAt: now() })
    .where(eq(notebookTopics.id, id));
}

export async function deleteTopic(id: string): Promise<void> {
  const [topic] = await db.select().from(notebookTopics).where(eq(notebookTopics.id, id));
  if (!topic) return;
  await db.delete(notebookTopics).where(eq(notebookTopics.id, id));
  await db.update(notebooks).set({ updatedAt: now() }).where(eq(notebooks.id, topic.notebookId));
}

export async function setTopicCompleted(
  id: string,
  completed: boolean,
): Promise<NotebookTopic | null> {
  await db
    .update(notebookTopics)
    .set({ completed: completed ? 1 : 0, updatedAt: now() })
    .where(eq(notebookTopics.id, id));

  const [row] = await db.select().from(notebookTopics).where(eq(notebookTopics.id, id));
  if (!row) return null;
  await db.update(notebooks).set({ updatedAt: now() }).where(eq(notebooks.id, row.notebookId));
  return rowToTopic(row);
}

export async function reorderTopics(notebookId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(notebookTopics)
      .set({ sortOrder: i })
      .where(and(eq(notebookTopics.id, orderedIds[i]), eq(notebookTopics.notebookId, notebookId)));
  }
  await db.update(notebooks).set({ updatedAt: now() }).where(eq(notebooks.id, notebookId));
}

export async function reorderNotebooks(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(notebooks).set({ sortOrder: i }).where(eq(notebooks.id, orderedIds[i]));
  }
}
