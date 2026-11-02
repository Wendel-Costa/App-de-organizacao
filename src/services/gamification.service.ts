import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/database';
import {
  coinTransactions,
  gamificationSettings,
  pointEvents,
  achievements,
  purchasableRewardPurchases,
} from '@/database/schema';
import type {
  GamificationConfig,
  GamificationSummary,
  PointEvent,
  ProductiveAction,
} from '@/types/gamification.types';

const DEFAULT_CONFIG: GamificationConfig = {
  pointsPerFocusHour: 1,
  taskScoringEnabled: false,
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

function normalizeBooleanFlag(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : fallback;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
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
      taskScoringEnabled: DEFAULT_CONFIG.taskScoringEnabled ? 1 : 0,
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

  const taskScoringEnabled = normalizeBooleanFlag(row[0].taskScoringEnabled);
  const canonicalStoredValue = taskScoringEnabled ? 1 : 0;

  if (row[0].taskScoringEnabled !== canonicalStoredValue) {
    await db
      .update(gamificationSettings)
      .set({ taskScoringEnabled: canonicalStoredValue, updatedAt: now() })
      .where(eq(gamificationSettings.id, 'default'));
  }

  return {
    pointsPerFocusHour: Math.max(0, Number(row[0].pointsPerFocusHour) || 0),
    taskScoringEnabled,
    taskLevel1Points: Math.max(0, Number(row[0].taskLevel1Points) || 0),
    taskLevel2Points: Math.max(0, Number(row[0].taskLevel2Points) || 0),
    taskLevel3Points: Math.max(0, Number(row[0].taskLevel3Points) || 0),
    topicPoints: Math.max(0, Number(row[0].topicPoints) || 0),
    notebookCompletionPoints: Math.max(0, Number(row[0].notebookCompletionPoints) || 0),
    goalCompletionPoints: Math.max(0, Number(row[0].goalCompletionPoints) || 0),
  };
}

export async function saveGamificationConfig(config: GamificationConfig): Promise<void> {
  await db
    .insert(gamificationSettings)
    .values({
      id: 'default',
      pointsPerFocusHour: config.pointsPerFocusHour,
      taskScoringEnabled: config.taskScoringEnabled ? 1 : 0,
      taskLevel1Points: config.taskLevel1Points,
      taskLevel2Points: config.taskLevel2Points,
      taskLevel3Points: config.taskLevel3Points,
      topicPoints: config.topicPoints,
      notebookCompletionPoints: config.notebookCompletionPoints,
      goalCompletionPoints: config.goalCompletionPoints,
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: gamificationSettings.id,
      set: {
        pointsPerFocusHour: config.pointsPerFocusHour,
        taskScoringEnabled: config.taskScoringEnabled ? 1 : 0,
        taskLevel1Points: config.taskLevel1Points,
        taskLevel2Points: config.taskLevel2Points,
        taskLevel3Points: config.taskLevel3Points,
        topicPoints: config.topicPoints,
        notebookCompletionPoints: config.notebookCompletionPoints,
        goalCompletionPoints: config.goalCompletionPoints,
        updatedAt: now(),
      },
    });
}

export function pointsForTaskLevel(
  level: 1 | 2 | 3 | undefined,
  config: GamificationConfig,
): number {
  if (!config.taskScoringEnabled) return 1;

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

  if (event) {
    const reversals = await db
      .select({ id: pointEvents.id })
      .from(pointEvents)
      .where(eq(pointEvents.reversalOf, event.id))
      .limit(1);
    if (reversals.length === 0) return null;
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

export async function purchaseReward(
  rewardId: string,
  cost: number,
  title: string,
): Promise<string> {
  if (cost < 0) throw new Error('INVALID_REWARD_COST');
  const purchaseId = generateId();
  const occurredAt = now();

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
      .from(coinTransactions);

    const balance = Number(row?.total ?? 0);
    if (balance < cost) {
      throw new Error('INSUFFICIENT_COINS');
    }

    await tx.insert(coinTransactions).values({
      id: generateId(),
      type: 'spend',
      amount: -cost,
      occurredAt,
      entityType: 'purchasable_reward',
      entityId: rewardId,
      description: `Compra: ${title}`,
    });

    await tx.insert(purchasableRewardPurchases).values({
      id: purchaseId,
      rewardId,
      title,
      cost,
      purchasedAt: occurredAt,
      archived: 0,
    });
  });

  return purchaseId;
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
    case 'goal_task_completion':
      return 'fator de meta concluído';
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

export async function awardGoalTaskCompletion(
  taskId: string,
  completionId: string,
  points: number,
  goalId: string,
): Promise<PointEvent | null> {
  return awardProductiveAction('goal_task_completion', completionId, points, {
    metadata: {
      goalId,
      taskId,
      completionId,
    },
  });
}

export async function reverseGoalTaskCompletion(
  taskId: string,
  completionId: string,
): Promise<PointEvent | null> {
  const events = await db
    .select()
    .from(pointEvents)
    .where(eq(pointEvents.action, 'goal_task_completion'))
    .orderBy(desc(pointEvents.occurredAt));

  const reversedIds = new Set(
    events.map((event) => event.reversalOf).filter((id): id is string => Boolean(id)),
  );

  let original = events.find(
    (event) => !event.reversalOf && !reversedIds.has(event.id) && event.entityId === completionId,
  );

  if (!original) {
    original = events.find((event) => {
      if (event.reversalOf || reversedIds.has(event.id) || event.entityId !== taskId) {
        return false;
      }

      if (!event.metadata) {
        return true;
      }

      try {
        const metadata = JSON.parse(event.metadata);
        return metadata.taskId === undefined;
      } catch {
        return true;
      }
    });
  }

  if (!original) {
    return null;
  }

  const occurredAt = now();
  const reversalId = generateId();

  const [reversal] = await db
    .insert(pointEvents)
    .values({
      id: reversalId,
      action: 'goal_task_completion',
      entityId: original.entityId,
      points: -original.points,
      coins: -original.coins,
      occurredAt,
      reversalOf: original.id,
      metadata: JSON.stringify({
        reversedAt: occurredAt,
        taskId,
        completionId,
      }),
    })
    .returning();

  const [coinRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)`,
    })
    .from(coinTransactions);

  const availableCoins = Math.max(0, Number(coinRow?.total ?? 0));

  const coinReversal = -Math.min(Math.max(0, original.coins), availableCoins);

  if (coinReversal !== 0) {
    await db.insert(coinTransactions).values({
      id: generateId(),
      type: 'reversal',
      amount: coinReversal,
      occurredAt,
      entityType: 'goal_task_completion',
      entityId: original.entityId,
      reversalOf: original.id,
      description: `Reversão de ${actionLabel('goal_task_completion')}`,
    });
  }

  return reversal
    ? {
        id: reversal.id,
        action: 'goal_task_completion',
        entityId: original.entityId,
        points: reversal.points,
        coins: reversal.coins,
        occurredAt: reversal.occurredAt,
        reversalOf: original.id,
      }
    : null;
}
