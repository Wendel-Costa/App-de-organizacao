import { eq } from 'drizzle-orm';
import { db } from '../index';
import { rewards, purchasableRewards } from '../schema';
import type { Reward } from '@/types/reward.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function getAllRewards(): Promise<Reward[]> {
  const rows = await db.select().from(rewards);
  return rows
    .map(rowToReward)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export async function createReward(
  data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt' | 'archived' | 'order'>,
): Promise<Reward> {
  const id = generateId();
  const createdAt = now();

  const existing = await db.select().from(rewards);
  const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0);
  const order = existing.length > 0 ? maxOrder + 1 : 0;

  await db.insert(rewards).values({
    id,
    title: data.title,
    description: data.description,
    conditionType: data.condition.type,
    conditionTarget: data.condition.target,
    conditionPeriod: data.condition.period,
    conditionThemeId: data.condition.themeId,
    conditionTaskIds: data.condition.taskIds ? JSON.stringify(data.condition.taskIds) : null,
    conditionGoalId: data.condition.goalId,
    conditionCustomStart: data.condition.customStartDate,
    conditionCustomEnd: data.condition.customEndDate,
    unlocked: 0,
    archived: 0,
    sortOrder: order,
    createdAt,
  });

  return { ...data, id, unlocked: false, archived: false, order, createdAt };
}

export async function unlockReward(id: string): Promise<void> {
  await db.update(rewards).set({ unlocked: 1, unlockedAt: now() }).where(eq(rewards.id, id));
}

export async function archiveReward(id: string): Promise<void> {
  await db.update(rewards).set({ archived: 1 }).where(eq(rewards.id, id));
}

export async function unarchiveReward(id: string): Promise<void> {
  await db.update(rewards).set({ archived: 0 }).where(eq(rewards.id, id));
}

export async function deleteReward(id: string): Promise<void> {
  await db.delete(rewards).where(eq(rewards.id, id));
}

export async function updateReward(
  id: string,
  data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt' | 'archived' | 'order'>,
): Promise<void> {
  await db
    .update(rewards)
    .set({
      title: data.title,
      description: data.description,
      conditionType: data.condition.type,
      conditionTarget: data.condition.target,
      conditionPeriod: data.condition.period,
      conditionThemeId: data.condition.themeId,
      conditionTaskIds: data.condition.taskIds ? JSON.stringify(data.condition.taskIds) : null,
      conditionGoalId: data.condition.goalId,
      conditionCustomStart: data.condition.customStartDate,
      conditionCustomEnd: data.condition.customEndDate,
    })
    .where(eq(rewards.id, id));
}

export async function reorderRewards(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(rewards).set({ sortOrder: i }).where(eq(rewards.id, orderedIds[i]));
  }
}

function rowToReward(row: typeof rewards.$inferSelect): Reward {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    condition: {
      type: row.conditionType as Reward['condition']['type'],
      target: row.conditionTarget ?? 0,
      period: (row.conditionPeriod ?? 'anytime') as Reward['condition']['period'],
      themeId: row.conditionThemeId ?? undefined,
      taskIds: row.conditionTaskIds ? JSON.parse(row.conditionTaskIds) : undefined,
      goalId: row.conditionGoalId ?? undefined,
      customStartDate: row.conditionCustomStart ?? undefined,
      customEndDate: row.conditionCustomEnd ?? undefined,
    },
    unlocked: row.unlocked === 1,
    unlockedAt: row.unlockedAt ?? undefined,
    archived: row.archived === 1,
    order: row.sortOrder ?? 0,
    createdAt: row.createdAt,
  };
}

export async function getAllPurchasableRewards(): Promise<
  import('@/types/reward.types').PurchasableReward[]
> {
  const rows = await db.select().from(purchasableRewards);
  return rows
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? undefined,
      cost: r.cost,
      archived: r.archived === 1,
      order: r.sortOrder,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export async function createPurchasableReward(
  data: Omit<
    import('@/types/reward.types').PurchasableReward,
    'id' | 'archived' | 'order' | 'createdAt'
  >,
) {
  const id = generateId();
  const createdAt = now();
  const rows = await db.select().from(purchasableRewards);
  const order = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;
  await db.insert(purchasableRewards).values({
    id,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    cost: Math.max(0, data.cost),
    archived: 0,
    sortOrder: order,
    createdAt,
  });
  return { ...data, id, title: data.title.trim(), archived: false, order, createdAt };
}

export async function updatePurchasableReward(
  id: string,
  data: Omit<
    import('@/types/reward.types').PurchasableReward,
    'id' | 'archived' | 'order' | 'createdAt'
  >,
) {
  await db
    .update(purchasableRewards)
    .set({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      cost: Math.max(0, data.cost),
    })
    .where(eq(purchasableRewards.id, id));
}

export async function deletePurchasableReward(id: string) {
  await db.delete(purchasableRewards).where(eq(purchasableRewards.id, id));
}

export async function archivePurchasableReward(id: string, archived: boolean) {
  await db
    .update(purchasableRewards)
    .set({ archived: archived ? 1 : 0 })
    .where(eq(purchasableRewards.id, id));
}
