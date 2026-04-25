import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { db } from '../index';
import { focusSessions, focusThemes } from '../schema';
import type { FocusSession, FocusTheme } from '@/types/focus.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function getAllThemes(): Promise<FocusTheme[]> {
  const rows = await db.select().from(focusThemes);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color ?? undefined,
  }));
}

export async function createTheme(name: string, color?: string): Promise<FocusTheme> {
  const id = generateId();
  await db.insert(focusThemes).values({ id, name, color });
  return { id, name, color };
}

export async function deleteTheme(id: string): Promise<void> {
  await db.delete(focusThemes).where(eq(focusThemes.id, id));
}

export async function getAllSessions(): Promise<FocusSession[]> {
  const rows = await db.select().from(focusSessions).orderBy(desc(focusSessions.startTime));
  return rows.map(rowToSession);
}

export async function getSessionsForDate(date: string): Promise<FocusSession[]> {
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const rows = await db
    .select()
    .from(focusSessions)
    .where(and(gte(focusSessions.startTime, start), lte(focusSessions.startTime, end)))
    .orderBy(desc(focusSessions.startTime));
  return rows.map(rowToSession);
}

export async function getSessionsForRange(
  startDate: string,
  endDate: string,
): Promise<FocusSession[]> {
  const rows = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        gte(focusSessions.startTime, `${startDate}T00:00:00.000Z`),
        lte(focusSessions.startTime, `${endDate}T23:59:59.999Z`),
      ),
    )
    .orderBy(desc(focusSessions.startTime));
  return rows.map(rowToSession);
}

export async function createSession(
  data: Omit<FocusSession, 'id' | 'createdAt'>,
): Promise<FocusSession> {
  const id = generateId();
  const createdAt = now();

  await db.insert(focusSessions).values({
    id,
    themeId: data.themeId,
    themeName: data.themeName,
    mode: data.mode,
    startTime: data.startTime,
    endTime: data.endTime,
    duration: data.duration,
    isManual: data.isManual ? 1 : 0,
    pomodoroRounds: data.pomodoroRounds,
    createdAt,
  });

  return { ...data, id, createdAt };
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(focusSessions).where(eq(focusSessions.id, id));
}

function rowToSession(row: typeof focusSessions.$inferSelect): FocusSession {
  return {
    id: row.id,
    themeId: row.themeId ?? undefined,
    themeName: row.themeName ?? undefined,
    mode: row.mode as FocusSession['mode'],
    startTime: row.startTime,
    endTime: row.endTime,
    duration: row.duration,
    isManual: row.isManual === 1,
    pomodoroRounds: row.pomodoroRounds ?? undefined,
    createdAt: row.createdAt,
  };
}
