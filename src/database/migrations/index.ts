import { sqlite } from '../index';

const CURRENT_SCHEMA_VERSION = 2;

export async function runMigrations() {
  const versionRow = sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = Number(versionRow?.user_version ?? 0);

  if (currentVersion === CURRENT_SCHEMA_VERSION) {
    try {
      sqlite.runSync('PRAGMA optimize');
    } catch (error) {
      console.warn('[database] Não foi possível otimizar o banco:', error);
    }
    return;
  }

  if (currentVersion !== 0) {
    throw new Error(
      `[database] Versão de schema não suportada: ${currentVersion}. ` +
        `Esta versão do aplicativo espera schema v${CURRENT_SCHEMA_VERSION}. ` +
        'Exporte seus dados, reinstale o aplicativo e importe o backup.',
    );
  }

  sqlite.runSync('BEGIN');

  try {
    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        score_level INTEGER,
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

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      )
    `);

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS focus_themes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT
      )
    `);

    sqlite.runSync(`
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

    sqlite.runSync(`
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
        archived_at TEXT,
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    sqlite.runSync(`
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

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS goal_task_completions (
        id TEXT PRIMARY KEY,
        goal_task_id TEXT NOT NULL,
        completed_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        condition_type TEXT NOT NULL,
        condition_target REAL NOT NULL DEFAULT 0,
        condition_period TEXT NOT NULL DEFAULT 'anytime',
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

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS task_skips (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        skipped_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id TEXT PRIMARY KEY,
        original_task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        score_level INTEGER,
        recurrence_days TEXT,
        goal_id TEXT,
        theme_id TEXT,
        subtasks_snapshot TEXT,
        completed_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        saved_at TEXT NOT NULL
      )
    `);

    sqlite.runSync(`
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

    sqlite.runSync(`
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

    sqlite.runSync(`
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

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        action TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    sqlite.runSync(`
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

    sqlite.runSync(`
      CREATE TABLE IF NOT EXISTS purchasable_reward_purchases (
        id TEXT PRIMARY KEY,
        reward_id TEXT NOT NULL,
        title TEXT NOT NULL,
        cost REAL NOT NULL,
        purchased_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0
      )
    `);

    sqlite.runSync(`
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

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_point_events_entity
      ON point_events(action, entity_id)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_purchasable_reward_purchases_date
      ON purchasable_reward_purchases(purchased_at)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_coin_transactions_entity
      ON coin_transactions(entity_type, entity_id)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_task_skips_task_date
      ON task_skips(task_id, skipped_date)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date
      ON tasks(scheduled_date, completed)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_tasks_type
      ON tasks(type, completed)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_subtasks_task
      ON subtasks(task_id)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_focus_sessions_start
      ON focus_sessions(start_time)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_focus_sessions_theme
      ON focus_sessions(theme_id, start_time)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_goals_active
      ON goals(archived, start_date, end_date)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal
      ON goal_tasks(goal_id)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_goal_tasks_notebook
      ON goal_tasks(notebook_id)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_goal_task_completions_task_date
      ON goal_task_completions(goal_task_id, completed_date)
    `);

    sqlite.runSync(`
      CREATE INDEX IF NOT EXISTS idx_notebook_topics_notebook
      ON notebook_topics(notebook_id, sort_order)
    `);

    sqlite.runSync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_goal_tasks_unique_notebook_per_goal
      ON goal_tasks(goal_id, notebook_id)
      WHERE type = 'notebook' AND notebook_id IS NOT NULL
    `);

    sqlite.runSync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    sqlite.runSync('COMMIT');
  } catch (error) {
    try {
      sqlite.runSync('ROLLBACK');
    } catch (rollbackError) {
      console.error('[database] Falha ao reverter a criação do schema:', rollbackError);
    }
    throw error;
  }

  try {
    sqlite.runSync('PRAGMA optimize');
  } catch (error) {
    console.warn('[database] Não foi possível otimizar o banco:', error);
  }
}
