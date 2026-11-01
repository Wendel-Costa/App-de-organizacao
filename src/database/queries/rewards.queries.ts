import { eq } from 'drizzle-orm';
import { db } from '../index';
import { rewards, purchasableRewards, purchasableRewardPurchases } from '../schema';
import type { Reward } from '@/types/reward.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

function normalizeIds(ids: string[] | undefined, legacyId: string | undefined): string[] {
  const source = ids && ids.length > 0 ? ids : legacyId ? [legacyId] : [];
  return Array.from(
    new Set(
      source
        .filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
}

function parseIds(serialized: string | null, legacyId: string | null): string[] {
  if (serialized) {
    try {
      const parsed: unknown = JSON.parse(serialized);
      if (Array.isArray(parsed)) {
        const ids = normalizeIds(
          parsed.filter((value): value is string => typeof value === 'string'),
          undefined,
        );
        if (ids.length > 0 || !legacyId) return ids;
      }
    } catch {
      // Dados antigos ou inválidos continuam podendo usar o identificador singular.
    }
  }

  return normalizeIds(undefined, legacyId ?? undefined);
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
  const themeIds = normalizeIds(data.condition.themeIds, data.condition.themeId);
  const goalIds = normalizeIds(data.condition.goalIds, data.condition.goalId);

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
    conditionThemeId: themeIds.length === 1 ? themeIds[0] : null,
    conditionThemeIds: JSON.stringify(themeIds),
    conditionTaskIds: data.condition.taskIds ? JSON.stringify(data.condition.taskIds) : null,
    conditionGoalId: goalIds.length === 1 ? goalIds[0] : null,
    conditionGoalIds: JSON.stringify(goalIds),
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
  const themeIds = normalizeIds(data.condition.themeIds, data.condition.themeId);
  const goalIds = normalizeIds(data.condition.goalIds, data.condition.goalId);

  await db
    .update(rewards)
    .set({
      title: data.title,
      description: data.description,
      conditionType: data.condition.type,
      conditionTarget: data.condition.target,
      conditionPeriod: data.condition.period,
      conditionThemeId: themeIds.length === 1 ? themeIds[0] : null,
      conditionThemeIds: JSON.stringify(themeIds),
      conditionTaskIds: data.condition.taskIds ? JSON.stringify(data.condition.taskIds) : null,
      conditionGoalId: goalIds.length === 1 ? goalIds[0] : null,
      conditionGoalIds: JSON.stringify(goalIds),
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
      themeIds: parseIds(row.conditionThemeIds, row.conditionThemeId),
      taskIds: row.conditionTaskIds ? JSON.parse(row.conditionTaskIds) : undefined,
      goalId: row.conditionGoalId ?? undefined,
      goalIds: parseIds(row.conditionGoalIds, row.conditionGoalId),
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

function validatePurchasableRewardData(data: {
  title: string;
  description?: string;
  cost: number;
}): { title: string; description?: string } {
  const title = data.title.trim();
  const description = data.description?.trim() || undefined;

  if (!title) throw new Error('O nome do item da loja é obrigatório.');
  if (title.length > 50) throw new Error('O nome deve ter no máximo 50 caracteres.');
  if (description && description.length > 200) {
    throw new Error('A descrição deve ter no máximo 200 caracteres.');
  }
  if (!Number.isFinite(data.cost) || data.cost <= 0) {
    throw new Error('O custo deve ser um número maior que zero.');
  }

  return { title, description };
}

export async function createPurchasableReward(
  data: Omit<
    import('@/types/reward.types').PurchasableReward,
    'id' | 'archived' | 'order' | 'createdAt'
  >,
) {
  const normalized = validatePurchasableRewardData(data);
  const id = generateId();
  const createdAt = now();
  const rows = await db.select().from(purchasableRewards);
  const order = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;
  await db.insert(purchasableRewards).values({
    id,
    title: normalized.title,
    description: normalized.description ?? null,
    cost: data.cost,
    archived: 0,
    sortOrder: order,
    createdAt,
  });
  return { ...data, ...normalized, id, cost: data.cost, archived: false, order, createdAt };
}

export async function updatePurchasableReward(
  id: string,
  data: Omit<
    import('@/types/reward.types').PurchasableReward,
    'id' | 'archived' | 'order' | 'createdAt'
  >,
) {
  const normalized = validatePurchasableRewardData(data);
  await db
    .update(purchasableRewards)
    .set({
      title: normalized.title,
      description: normalized.description ?? null,
      cost: data.cost,
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

export async function getAllRewardPurchases(): Promise<
  import('@/types/reward.types').RewardPurchase[]
> {
  const rows = await db.select().from(purchasableRewardPurchases);
  return rows
    .map((row) => ({
      id: row.id,
      rewardId: row.rewardId,
      title: row.title,
      cost: row.cost,
      purchasedAt: row.purchasedAt,
      archived: row.archived === 1,
    }))
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}

export async function archiveRewardPurchase(id: string): Promise<void> {
  await db
    .update(purchasableRewardPurchases)
    .set({ archived: 1 })
    .where(eq(purchasableRewardPurchases.id, id));
}
