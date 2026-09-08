import { db, sqlite } from '../index';
import { sql } from 'drizzle-orm';

async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await db.all<{ name: string }>(sql.raw(`PRAGMA table_info(${table})`));
  return rows.some((row) => row.name === column);
}

async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (!(await hasColumn(table, column))) {
    await db.run(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`));
  }
}

async function dropColumnIfExists(table: string, column: string): Promise<void> {
  if (await hasColumn(table, column)) {
    await db.run(sql.raw(`ALTER TABLE ${table} DROP COLUMN ${column}`));
  }
}

export async function runMigrations() {
  await db.run(sql`PRAGMA foreign_keys = OFF`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      score_level INTEGER,
      priority TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      scheduled_date TEXT,
      due_date TEXT,
      recurrence_days TEXT,
      recurrence_interval INTEGER,
      goal_id TEXT,
      theme_id TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS focus_themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      theme_id TEXT,
      theme_name TEXT,
      mode TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      is_manual INTEGER NOT NULL DEFAULT 0,
      pomodoro_rounds INTEGER,
      created_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      color TEXT,
      tolerance REAL NOT NULL DEFAULT 0,
      allow_overflow INTEGER NOT NULL DEFAULT 0,
      allow_beyond_100 INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      sort_order REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS goal_tasks (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      target_count REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'habit',
      theme_id TEXT,
      theme_name TEXT,
      theme_ids TEXT,
      notebook_id TEXT,
      recurrence_type TEXT NOT NULL DEFAULT 'none',
      recurrence_count INTEGER NOT NULL DEFAULT 1,
      recurrence_days TEXT
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS goal_task_completions (
      id TEXT PRIMARY KEY,
      goal_task_id TEXT NOT NULL,
      completed_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      condition_type TEXT NOT NULL,
      condition_target REAL NOT NULL,
      condition_period TEXT NOT NULL,
      condition_theme_id TEXT,
      condition_task_ids TEXT,
      condition_goal_id TEXT,
      condition_custom_start TEXT,
      condition_custom_end TEXT,
      unlocked INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      sort_order REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY,
      original_task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      score_level INTEGER,
      priority TEXT,
      recurrence_days TEXT,
      goal_id TEXT,
      theme_id TEXT,
      subtasks_snapshot TEXT,
      completed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      saved_at TEXT NOT NULL
    )
  `);

  await addColumnIfMissing('tasks', 'score_level', 'INTEGER');
  if (await hasColumn('tasks', 'priority')) {
    await db.run(sql`
      UPDATE tasks
      SET score_level = CASE priority
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 1
      END
      WHERE score_level IS NULL
    `);
    await dropColumnIfExists('tasks', 'priority');
  }

  await addColumnIfMissing('task_completions', 'score_level', 'INTEGER');
  if (await hasColumn('task_completions', 'priority')) {
    await db.run(sql`
      UPDATE task_completions
      SET score_level = CASE priority
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 1
      END
      WHERE score_level IS NULL
    `);
    await dropColumnIfExists('task_completions', 'priority');
  }

  await addColumnIfMissing('goal_tasks', 'notebook_id', 'TEXT');

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS gamification_settings (
      id TEXT PRIMARY KEY,
      points_per_focus_hour REAL NOT NULL DEFAULT 1,
      task_scoring_enabled INTEGER NOT NULL DEFAULT 0,
      task_level_1_points REAL NOT NULL DEFAULT 1,
      task_level_2_points REAL NOT NULL DEFAULT 3,
      task_level_3_points REAL NOT NULL DEFAULT 5,
      topic_points REAL NOT NULL DEFAULT 1,
      notebook_completion_points REAL NOT NULL DEFAULT 10,
      goal_completion_points REAL NOT NULL DEFAULT 25,
      updated_at TEXT NOT NULL
    )
  `);

  await addColumnIfMissing(
    'gamification_settings',
    'task_scoring_enabled',
    'INTEGER NOT NULL DEFAULT 0',
  );

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS point_events (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      points REAL NOT NULL,
      coins REAL NOT NULL,
      occurred_at TEXT NOT NULL,
      reversal_of TEXT,
      metadata TEXT
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS coin_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      occurred_at TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      reversal_of TEXT,
      description TEXT
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      action TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sort_order REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS notebook_topics (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS purchasable_rewards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      cost REAL NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      sort_order REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await db.run(
    sql`CREATE INDEX IF NOT EXISTS idx_point_events_entity ON point_events(action, entity_id)`,
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS idx_coin_transactions_entity ON coin_transactions(entity_type, entity_id)`,
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS idx_notebook_topics_notebook ON notebook_topics(notebook_id, sort_order)`,
  );
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_goal_tasks_notebook ON goal_tasks(notebook_id)`);

  await db.run(sql`PRAGMA foreign_keys = ON`);
  try {
    sqlite.runSync('PRAGMA optimize');
  } catch {}
}
