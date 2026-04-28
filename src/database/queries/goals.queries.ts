import { eq } from 'drizzle-orm';
import { db } from '../index';
import { goals, goalTasks } from '../schema';
import type { Goal, GoalTask } from '@/types/goal.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function getAllGoals(): Promise<Goal[]> {
  const rows = await db.select().from(goals);
  return Promise.all(
    rows.map(async (row) => {
      const taskRows = await db.select().from(goalTasks).where(eq(goalTasks.goalId, row.id));
      return rowToGoal(row, taskRows);
    }),
  );
}

export async function createGoal(
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>,
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
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return { ...data, id, tasks: [], createdAt: timestamp, updatedAt: timestamp };
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<void> {
  await db
    .update(goals)
    .set({
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      color: data.color,
      updatedAt: now(),
    })
    .where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  await db.delete(goalTasks).where(eq(goalTasks.goalId, id));
  await db.delete(goals).where(eq(goals.id, id));
}

export async function addGoalTask(
  data: Omit<GoalTask, 'id' | 'completedCount'>,
): Promise<GoalTask> {
  const id = generateId();
  await db.insert(goalTasks).values({
    id,
    goalId: data.goalId,
    title: data.title,
    targetCount: data.targetCount,
    completedCount: 0,
  });
  return { ...data, id, completedCount: 0 };
}

export async function incrementGoalTask(id: string): Promise<void> {
  const rows = await db.select().from(goalTasks).where(eq(goalTasks.id, id));
  if (!rows[0]) return;
  const next = Math.min(rows[0].completedCount + 1, rows[0].targetCount);
  await db.update(goalTasks).set({ completedCount: next }).where(eq(goalTasks.id, id));
}

export async function decrementGoalTask(id: string): Promise<void> {
  const rows = await db.select().from(goalTasks).where(eq(goalTasks.id, id));
  if (!rows[0]) return;
  const next = Math.max(rows[0].completedCount - 1, 0);
  await db.update(goalTasks).set({ completedCount: next }).where(eq(goalTasks.id, id));
}

export async function deleteGoalTask(id: string): Promise<void> {
  await db.delete(goalTasks).where(eq(goalTasks.id, id));
}

function rowToGoal(
  row: typeof goals.$inferSelect,
  taskRows: (typeof goalTasks.$inferSelect)[],
): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startDate: row.startDate,
    endDate: row.endDate,
    color: row.color ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tasks: taskRows.map((t) => ({
      id: t.id,
      goalId: t.goalId,
      title: t.title,
      targetCount: t.targetCount,
      completedCount: t.completedCount,
    })),
  };
}
