import * as SQLite from 'expo-sqlite';
import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function runMigrations() {
  const rawDb = SQLite.openDatabaseSync('focomais.db');
  try {
    rawDb.runSync('PRAGMA journal_mode=WAL');
    rawDb.runSync('PRAGMA synchronous=NORMAL');
  } catch {}

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      priority TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      scheduled_date TEXT,
      due_date TEXT,
      recurrence_days TEXT,
      goal_id TEXT,
      theme_id TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  try {
    await db.run(sql`ALTER TABLE tasks ADD COLUMN theme_id TEXT`);
  } catch {}
  try {
    await db.run(sql`ALTER TABLE tasks ADD COLUMN completed_at TEXT`);
  } catch {}

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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  try {
    await db.run(sql`ALTER TABLE goals ADD COLUMN tolerance REAL NOT NULL DEFAULT 0`);
  } catch {}

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS goal_tasks (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      recurrence_type TEXT NOT NULL DEFAULT 'none',
      recurrence_count INTEGER NOT NULL DEFAULT 1,
      recurrence_days TEXT
    )
  `);

  try {
    await db.run(
      sql`ALTER TABLE goal_tasks ADD COLUMN recurrence_type TEXT NOT NULL DEFAULT 'none'`,
    );
  } catch {}
  try {
    await db.run(
      sql`ALTER TABLE goal_tasks ADD COLUMN recurrence_count INTEGER NOT NULL DEFAULT 1`,
    );
  } catch {}
  try {
    await db.run(sql`ALTER TABLE goal_tasks ADD COLUMN recurrence_days TEXT`);
  } catch {}

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
      condition_target REAL NOT NULL DEFAULT 0,
      condition_period TEXT NOT NULL DEFAULT 'anytime',
      condition_theme_id TEXT,
      condition_task_ids TEXT,
      condition_goal_id TEXT,
      condition_custom_start TEXT,
      condition_custom_end TEXT,
      unlocked INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT,
      created_at TEXT NOT NULL
    )
  `);

  try {
    await db.run(sql`ALTER TABLE rewards ADD COLUMN condition_theme_id TEXT`);
  } catch {}
  try {
    await db.run(sql`ALTER TABLE rewards ADD COLUMN condition_task_ids TEXT`);
  } catch {}
  try {
    await db.run(sql`ALTER TABLE rewards ADD COLUMN condition_goal_id TEXT`);
  } catch {}
  try {
    await db.run(sql`ALTER TABLE rewards ADD COLUMN condition_custom_start TEXT`);
  } catch {}
  try {
    await db.run(sql`ALTER TABLE rewards ADD COLUMN condition_custom_end TEXT`);
  } catch {}
}
