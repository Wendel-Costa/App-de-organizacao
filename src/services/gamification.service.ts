import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/database';
import {
  coinTransactions,
  gamificationSettings,
  pointEvents,
  achievements,
} from '@/database/schema';
import type {
  CoinTransaction,
  GamificationConfig,
  GamificationSummary,
  PointEvent,
  ProductiveAction,
} from '@/types/gamification.types';

const DEFAULT_CONFIG: GamificationConfig = {
  pointsPerFocusHour: 1,
  taskLevel1Points: 1,
  taskLevel2Points: 3,
  taskLevel3Points: 5,
  topicPoints: 1,
  notebookCompletionPoints: 10,
  goalCompletionPoints: 25,
};

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

export function getDefaultGamificationConfig(): GamificationConfig {
  return { ...DEFAULT_CONFIG };
}

export async function getGamificationConfig(): Promise<GamificationConfig> {
  const row = await db
    .select()
    .from(gamificationSettings)
    .where(eq(gamificationSettings.id, 'default'))
    .limit(1);
  if (row.length === 0) {
    await db.insert(gamificationSettings).values({
      id: 'default',
      pointsPerFocusHour: DEFAULT_CONFIG.pointsPerFocusHour,
      taskLevel1Points: DEFAULT_CONFIG.taskLevel1Points,
      taskLevel2Points: DEFAULT_CONFIG.taskLevel2Points,
      taskLevel3Points: DEFAULT_CONFIG.taskLevel3Points,
      topicPoints: DEFAULT_CONFIG.topicPoints,
      notebookCompletionPoints: DEFAULT_CONFIG.notebookCompletionPoints,
      goalCompletionPoints: DEFAULT_CONFIG.goalCompletionPoints,
      updatedAt: now(),
    });
    return { ...DEFAULT_CONFIG };
  }

  return {
    pointsPerFocusHour: Math.max(0, row[0].pointsPerFocusHour),
    taskLevel1Points: Math.max(0, row[0].taskLevel1Points),
    taskLevel2Points: Math.max(0, row[0].taskLevel2Points),
    taskLevel3Points: Math.max(0, row[0].taskLevel3Points),
    topicPoints: Math.max(0, row[0].topicPoints),
    notebookCompletionPoints: Math.max(0, row[0].notebookCompletionPoints),
    goalCompletionPoints: Math.max(0, row[0].goalCompletionPoints),
  };
}

export async function saveGamificationConfig(config: GamificationConfig): Promise<void> {
  await db
    .insert(gamificationSettings)
    .values({
      id: 'default',
      ...config,
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: gamificationSettings.id,
      set: { ...config, updatedAt: now() },
    });
}

export function pointsForTaskLevel(
  level: 1 | 2 | 3 | undefined,
  config: GamificationConfig,
): number {
  switch (level) {
    case 3:
      return config.taskLevel3Points;
    case 2:
      return config.taskLevel2Points;
    case 1:
    default:
      return config.taskLevel1Points;
  }
}

export function pointsForFocusDuration(durationMinutes: number, pointsPerHour: number): number {
  return Math.round((Math.max(0, durationMinutes) / 60) * Math.max(0, pointsPerHour) * 100) / 100;
}

export async function getPointEvents(): Promise<PointEvent[]> {
  const rows = await db.select().from(pointEvents).orderBy(desc(pointEvents.occurredAt));
  return rows.map((r) => ({
    id: r.id,
    action: r.action as ProductiveAction,
    entityId: r.entityId,
    points: r.points,
    coins: r.coins,
    occurredAt: r.occurredAt,
    reversalOf: r.reversalOf ?? undefined,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
  }));
}

export async function getCoinTransactions(): Promise<CoinTransaction[]> {
  const rows = await db.select().from(coinTransactions).orderBy(desc(coinTransactions.occurredAt));
  return rows.map((r) => ({
    id: r.id,
    type: r.type as CoinTransaction['type'],
    amount: r.amount,
    occurredAt: r.occurredAt,
    entityType: r.entityType ?? undefined,
    entityId: r.entityId ?? undefined,
    reversalOf: r.reversalOf ?? undefined,
    description: r.description ?? undefined,
  }));
}

export async function getSummary(): Promise<GamificationSummary> {
  const [pointRow] = await db
    .select({ total: sql<number>`coalesce(sum(${pointEvents.points}), 0)` })
    .from(pointEvents);

  const [coinRow] = await db
    .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions);

  const points = Math.max(0, Number(pointRow?.total ?? 0));
  const coins = Math.max(0, Number(coinRow?.total ?? 0));
  const level = levelForPoints(points);
  const currentLevelPoints = levelThreshold(level);
  const nextLevelPoints = level < 10 ? levelThreshold(level + 1) : levelThreshold(level + 1);
  const progress =
    nextLevelPoints > currentLevelPoints
      ? Math.min(1, (points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints))
      : 0;

  return {
    points,
    coins,
    level,
    currentLevelPoints,
    nextLevelPoints,
    progress,
  };
}

export async function awardProductiveAction(
  action: ProductiveAction,
  entityId: string,
  points: number,
  options?: { metadata?: Record<string, unknown> },
): Promise<PointEvent | null> {
  if (points <= 0) return null;

  const id = generateId();
  const occurredAt = now();

  const [event] = await db
    .select()
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.action, action),
        eq(pointEvents.entityId, entityId),
        isNull(pointEvents.reversalOf),
      ),
    )
    .orderBy(desc(pointEvents.occurredAt))
    .limit(1);

  if (action === 'notebook_completion' || action === 'goal_completion') {
    if (event) return null;
  }

  const [inserted] = await db
    .insert(pointEvents)
    .values({
      id,
      action,
      entityId,
      points,
      coins: points,
      occurredAt,
      reversalOf: null,
      metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
    })
    .returning();

  await db.insert(coinTransactions).values({
    id: generateId(),
    type: 'earn',
    amount: points,
    occurredAt,
    entityType: action,
    entityId,
    description: `+${points} moedas por ${actionLabel(action)}`,
  });

  return inserted
    ? {
        id: inserted.id,
        action: inserted.action as ProductiveAction,
        entityId: inserted.entityId,
        points: inserted.points,
        coins: inserted.coins,
        occurredAt: inserted.occurredAt,
        metadata: options?.metadata,
      }
    : null;
}

export async function reverseLatestProductiveAction(
  action: ProductiveAction,
  entityId: string,
): Promise<PointEvent | null> {
  const events = await db
    .select()
    .from(pointEvents)
    .where(and(eq(pointEvents.action, action), eq(pointEvents.entityId, entityId)))
    .orderBy(desc(pointEvents.occurredAt));

  const reversedIds = new Set(
    events.map((e) => e.reversalOf).filter((id): id is string => Boolean(id)),
  );
  const original = events.find((e) => !e.reversalOf && !reversedIds.has(e.id));
  if (!original) return null;

  const occurredAt = now();
  const reversalId = generateId();
  const [reversal] = await db
    .insert(pointEvents)
    .values({
      id: reversalId,
      action,
      entityId,
      points: -original.points,
      coins: -original.coins,
      occurredAt,
      reversalOf: original.id,
      metadata: JSON.stringify({ reversedAt: occurredAt }),
    })
    .returning();

  const [coinRow] = await db
    .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions);
  const availableCoins = Math.max(0, Number(coinRow?.total ?? 0));
  const coinReversal = -Math.min(Math.max(0, original.coins), availableCoins);

  if (coinReversal !== 0) {
    await db.insert(coinTransactions).values({
      id: generateId(),
      type: 'reversal',
      amount: coinReversal,
      occurredAt,
      entityType: action,
      entityId,
      reversalOf: original.id,
      description: `Reversão de ${actionLabel(action)}`,
    });
  }

  return reversal
    ? {
        id: reversal.id,
        action: reversal.action as ProductiveAction,
        entityId: reversal.entityId,
        points: reversal.points,
        coins: reversal.coins,
        occurredAt: reversal.occurredAt,
        reversalOf: original.id,
      }
    : null;
}

export async function rescoreFocusSession(
  sessionId: string,
  durationMinutes: number,
): Promise<void> {
  const events = await db
    .select()
    .from(pointEvents)
    .where(and(eq(pointEvents.action, 'focus_session'), eq(pointEvents.entityId, sessionId)))
    .orderBy(desc(pointEvents.occurredAt));

  const reversedIds = new Set(
    events.map((e) => e.reversalOf).filter((id): id is string => Boolean(id)),
  );
  const original = events.find((e) => !e.reversalOf && !reversedIds.has(e.id));
  if (!original) {
    const config = await getGamificationConfig();
    const points = pointsForFocusDuration(durationMinutes, config.pointsPerFocusHour);
    await awardProductiveAction('focus_session', sessionId, points, {
      metadata: { durationMinutes, pointsPerHour: config.pointsPerFocusHour },
    });
    return;
  }

  const oldRate = Number(
    original.metadata ? (JSON.parse(original.metadata).pointsPerHour ?? 0) : 0,
  );

  await reverseLatestProductiveAction('focus_session', sessionId);
  const points = pointsForFocusDuration(durationMinutes, oldRate);
  if (points > 0) {
    await awardProductiveAction('focus_session', sessionId, points, {
      metadata: { durationMinutes, pointsPerHour: oldRate, editedAt: now() },
    });
  }
}

export async function purchaseReward(rewardId: string, cost: number, title: string): Promise<void> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions);

  const balance = Number(row?.total ?? 0);
  if (cost < 0 || balance < cost) {
    throw new Error('INSUFFICIENT_COINS');
  }

  await db.insert(coinTransactions).values({
    id: generateId(),
    type: 'spend',
    amount: -cost,
    occurredAt: now(),
    entityType: 'purchasable_reward',
    entityId: rewardId,
    description: `Compra: ${title}`,
  });
}

export async function getLevelInfo(points: number) {
  const level = levelForPoints(points);
  return {
    level,
    currentLevelPoints: levelThreshold(level),
    nextLevelPoints: levelThreshold(level + 1),
    progress: Math.min(
      1,
      (points - levelThreshold(level)) /
        Math.max(1, levelThreshold(level + 1) - levelThreshold(level)),
    ),
  };
}

const FIXED_LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1850, 2500, 3250, 4100];

export function levelThreshold(level: number): number {
  if (level <= 1) return 0;
  if (level <= 10) return FIXED_LEVEL_THRESHOLDS[level - 1];

  const n = level - 10;
  return 4100 + n * 950 + 50 * n * (n - 1);
}

export function levelForPoints(points: number): number {
  let level = 1;
  while (levelThreshold(level + 1) <= points) level += 1;
  return level;
}

function actionLabel(action: ProductiveAction): string {
  switch (action) {
    case 'task_completion':
      return 'conclusão de tarefa';
    case 'topic_completion':
      return 'tópico concluído';
    case 'focus_session':
      return 'sessão de foco';
    case 'notebook_completion':
      return 'conclusão de caderno';
    case 'goal_completion':
      return 'conclusão de meta';
  }
}

export async function grantUniqueAchievement(
  action: 'notebook_completion' | 'goal_completion',
  entityId: string,
  points?: number,
): Promise<PointEvent | null> {
  const key = `${action}:${entityId}`;
  const [existing] = await db.select().from(achievements).where(eq(achievements.key, key)).limit(1);
  if (existing) return null;

  const config = await getGamificationConfig();
  const finalPoints = points ?? config.goalCompletionPoints;

  await db.insert(achievements).values({
    id: generateId(),
    key,
    action,
    entityId,
    createdAt: now(),
  });

  return awardProductiveAction(
    action,
    entityId,
    action === 'notebook_completion' ? finalPoints : finalPoints,
  );
}
