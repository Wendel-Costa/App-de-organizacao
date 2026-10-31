import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../index';
import { taskCompletions, tasks, subtasks } from '../schema';
import type { CompletedTaskRecord } from '@/types/taskHistory.types';
import type { RecurrenceDay, SubTask, TaskType } from '@/types/task.types';

export interface TaskCompletionMutationResult {
  changed: boolean;
  completedAt: string | null;
  updatedAt: string;
  historyRecord: CompletedTaskRecord | null;
  historyCreated: boolean;
  removedHistoryRecords: CompletedTaskRecord[];
}

function now(): string {
  return new Date().toISOString();
}

function parseArray<T>(value: string | null): T[] | undefined {
  if (!value) return undefined;
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('INVALID_TASK_HISTORY_SNAPSHOT');
  return parsed as T[];
}

function rowToCompletion(row: typeof taskCompletions.$inferSelect): CompletedTaskRecord {
  return {
    id: row.id,
    originalTaskId: row.originalTaskId,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type as TaskType,
    scoreLevel: (row.scoreLevel as CompletedTaskRecord['scoreLevel']) ?? 1,
    scheduledDate: row.scheduledDate ?? undefined,
    dueDate: row.dueDate ?? undefined,
    recurrenceDays: parseArray<RecurrenceDay>(row.recurrenceDays),
    recurrenceInterval: row.recurrenceInterval ?? undefined,
    goalId: row.goalId ?? undefined,
    themeId: row.themeId ?? undefined,
    subtasks: parseArray<SubTask>(row.subtasksSnapshot),
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    savedAt: row.savedAt,
  };
}

function createCompletionId(taskId: string, completedAt: string): string {
  return `tc:${encodeURIComponent(taskId)}:${encodeURIComponent(completedAt)}`;
}

const LEGACY_COMPLETION_MATCH_WINDOW_MS = 5 * 60 * 1000;

export async function updateTaskCompletionWithHistory(
  taskId: string,
  completed: boolean,
  options?: { resetCompletedOccurrence?: { expectedCompletedAt: string | null } },
): Promise<TaskCompletionMutationResult> {
  return db.transaction(async (tx) => {
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) throw new Error(`TASK_NOT_FOUND:${taskId}`);

    const timestamp = now();
    let taskRecord = task;

    if (completed && options?.resetCompletedOccurrence) {
      const expected = options.resetCompletedOccurrence.expectedCompletedAt;
      const completionCondition =
        expected === null ? isNull(tasks.completedAt) : eq(tasks.completedAt, expected);
      const resetRows = await tx
        .update(tasks)
        .set({ completed: 0, completedAt: null, updatedAt: timestamp })
        .where(and(eq(tasks.id, taskId), eq(tasks.completed, 1), completionCondition))
        .returning({ id: tasks.id });

      if (resetRows.length === 0) {
        throw new Error(`RECURRING_OCCURRENCE_CHANGED:${taskId}`);
      }

      await tx.update(subtasks).set({ completed: 0 }).where(eq(subtasks.taskId, taskId));
      taskRecord = { ...task, completed: 0, completedAt: null, updatedAt: timestamp };
    }

    if (!completed) {
      if (taskRecord.completed !== 1) {
        return {
          changed: false,
          completedAt: null,
          updatedAt: taskRecord.updatedAt,
          historyRecord: null,
          historyCreated: false,
          removedHistoryRecords: [],
        };
      }

      const previousCompletedAt = taskRecord.completedAt;
      await tx
        .update(tasks)
        .set({ completed: 0, completedAt: null, updatedAt: timestamp })
        .where(eq(tasks.id, taskId));

      let removedHistoryRecords: CompletedTaskRecord[] = [];
      if (previousCompletedAt) {
        let matchingRows = await tx
          .select()
          .from(taskCompletions)
          .where(
            and(
              eq(taskCompletions.originalTaskId, taskId),
              eq(taskCompletions.completedAt, previousCompletedAt),
            ),
          );

        if (matchingRows.length === 0) {
          // Older releases generated the task timestamp and history timestamp separately.
          // Match only a nearby event for this exact task, never an arbitrary older occurrence.
          const candidates = await tx
            .select()
            .from(taskCompletions)
            .where(eq(taskCompletions.originalTaskId, taskId));
          const targetTime = new Date(previousCompletedAt).getTime();
          const closest = candidates
            .map((record) => ({
              record,
              difference: Math.abs(new Date(record.completedAt).getTime() - targetTime),
            }))
            .filter(
              (candidate) =>
                Number.isFinite(candidate.difference) &&
                candidate.difference <= LEGACY_COMPLETION_MATCH_WINDOW_MS,
            )
            .sort((a, b) => a.difference - b.difference)[0];

          if (closest) {
            matchingRows = candidates.filter(
              (record) => record.completedAt === closest.record.completedAt,
            );
          }
        }

        removedHistoryRecords = matchingRows.map(rowToCompletion);

        if (matchingRows.length > 0) {
          const matchedCompletedAt = matchingRows[0].completedAt;
          await tx
            .delete(taskCompletions)
            .where(
              and(
                eq(taskCompletions.originalTaskId, taskId),
                eq(taskCompletions.completedAt, matchedCompletedAt),
              ),
            );
        }
      }

      return {
        changed: true,
        completedAt: null,
        updatedAt: timestamp,
        historyRecord: null,
        historyCreated: false,
        removedHistoryRecords,
      };
    }

    // If another action already completed the task, reuse its original event timestamp.
    // A completed legacy task without completedAt is not assigned an invented historical date.
    if (taskRecord.completed === 1 && !taskRecord.completedAt) {
      return {
        changed: false,
        completedAt: null,
        updatedAt: taskRecord.updatedAt,
        historyRecord: null,
        historyCreated: false,
        removedHistoryRecords: [],
      };
    }

    const completedAt = taskRecord.completed === 1 ? taskRecord.completedAt! : timestamp;
    const changed = taskRecord.completed !== 1;

    if (changed) {
      await tx
        .update(tasks)
        .set({ completed: 1, completedAt, updatedAt: timestamp })
        .where(eq(tasks.id, taskId));
    }

    const [exactExistingRecord] = await tx
      .select()
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.originalTaskId, taskId),
          eq(taskCompletions.completedAt, completedAt),
        ),
      )
      .orderBy(desc(taskCompletions.savedAt))
      .limit(1);

    let existingRecord = exactExistingRecord;
    if (!existingRecord && !changed) {
      // Make repeated completion requests idempotent for legacy records whose timestamps
      // were generated separately by the previous taskStore and history query.
      const candidates = await tx
        .select()
        .from(taskCompletions)
        .where(eq(taskCompletions.originalTaskId, taskId));
      const targetTime = new Date(completedAt).getTime();
      const closest = candidates
        .map((record) => ({
          record,
          difference: Math.abs(new Date(record.completedAt).getTime() - targetTime),
        }))
        .filter(
          (candidate) =>
            Number.isFinite(candidate.difference) &&
            candidate.difference <= LEGACY_COMPLETION_MATCH_WINDOW_MS,
        )
        .sort((a, b) => a.difference - b.difference)[0];
      existingRecord = closest?.record;
    }

    if (existingRecord) {
      return {
        changed,
        completedAt,
        updatedAt: changed ? timestamp : taskRecord.updatedAt,
        historyRecord: rowToCompletion(existingRecord),
        historyCreated: false,
        removedHistoryRecords: [],
      };
    }

    const taskSubtasks = await tx.select().from(subtasks).where(eq(subtasks.taskId, taskId));
    const recordId = createCompletionId(taskId, completedAt);
    const savedAt = now();

    await tx
      .insert(taskCompletions)
      .values({
        id: recordId,
        originalTaskId: taskRecord.id,
        title: taskRecord.title,
        description: taskRecord.description,
        type: taskRecord.type,
        scoreLevel: taskRecord.scoreLevel ?? 1,
        scheduledDate: taskRecord.scheduledDate,
        dueDate: taskRecord.dueDate,
        recurrenceDays: taskRecord.recurrenceDays,
        recurrenceInterval: taskRecord.recurrenceInterval,
        goalId: taskRecord.goalId,
        themeId: taskRecord.themeId,
        subtasksSnapshot: taskSubtasks.length
          ? JSON.stringify(
              taskSubtasks.map((subtask) => ({
                id: subtask.id,
                title: subtask.title,
                completed: subtask.completed === 1,
              })),
            )
          : null,
        completedAt,
        createdAt: taskRecord.createdAt,
        savedAt,
      })
      .onConflictDoNothing();

    const [savedRecord] = await tx
      .select()
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.originalTaskId, taskId),
          eq(taskCompletions.completedAt, completedAt),
        ),
      )
      .orderBy(desc(taskCompletions.savedAt))
      .limit(1);

    if (!savedRecord) throw new Error(`TASK_HISTORY_SAVE_FAILED:${taskId}`);

    return {
      changed,
      completedAt,
      updatedAt: changed ? timestamp : taskRecord.updatedAt,
      historyRecord: rowToCompletion(savedRecord),
      historyCreated: savedRecord.id === recordId,
      removedHistoryRecords: [],
    };
  });
}

export async function getAllTaskCompletions(): Promise<CompletedTaskRecord[]> {
  const rows = await db
    .select()
    .from(taskCompletions)
    .orderBy(desc(taskCompletions.completedAt), desc(taskCompletions.savedAt));

  const uniqueRecords = new Map<string, CompletedTaskRecord>();
  for (const row of rows) {
    const record = rowToCompletion(row);
    const eventKey = `${record.originalTaskId}\u0000${record.completedAt}`;
    const existing = uniqueRecords.get(eventKey);

    if (!existing || record.savedAt < existing.savedAt) {
      uniqueRecords.set(eventKey, record);
    }
  }

  return Array.from(uniqueRecords.values()).sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}
