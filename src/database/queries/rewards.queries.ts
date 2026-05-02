import { eq } from 'drizzle-orm';
import { db } from '../index';
import { rewards } from '../schema';
import type { Reward } from '@/types/reward.types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export async function getAllRewards(): Promise<Reward[]> {
  const rows = await db.select().from(rewards);
  return rows.map(rowToReward);
}

export async function createReward(
  data: Omit<Reward, 'id' | 'unlocked' | 'unlockedAt' | 'createdAt'>,
): Promise<Reward> {
  const id = generateId();
  const createdAt = now();

  await db.insert(rewards).values({
    id,
    title: data.title,
    description: data.description,
    conditionType: data.condition.type,
    conditionTarget: data.condition.target,
    conditionPeriod: data.condition.period,
    unlocked: 0,
    createdAt,
  });

  return {
    ...data,
    id,
    unlocked: false,
    createdAt,
  };
}

export async function unlockReward(id: string): Promise<void> {
  await db.update(rewards).set({ unlocked: 1, unlockedAt: now() }).where(eq(rewards.id, id));
}

export async function deleteReward(id: string): Promise<void> {
  await db.delete(rewards).where(eq(rewards.id, id));
}

function rowToReward(row: typeof rewards.$inferSelect): Reward {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    condition: {
      type: row.conditionType as Reward['condition']['type'],
      target: row.conditionTarget,
      period: row.conditionPeriod as Reward['condition']['period'],
    },
    unlocked: row.unlocked === 1,
    unlockedAt: row.unlockedAt ?? undefined,
    createdAt: row.createdAt,
  };
}
