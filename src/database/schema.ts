import { int, real, text, sqliteTable } from 'drizzle-orm/sqlite-core';

//tarefas

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  priority: text('priority'),
  completed: int('completed').notNull().default(0), // 0 = false, 1 = true
  scheduledDate: text('scheduled_date'),
  dueDate: text('due_date'),
  recurrenceDays: text('recurrence_days'),
  goalId: text('goal_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const subtasks = sqliteTable('subtasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  title: text('title').notNull(),
  completed: int('completed').notNull().default(0),
});

//foco

export const focusThemes = sqliteTable('focus_themes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'),
});

export const focusSessions = sqliteTable('focus_sessions', {
  id: text('id').primaryKey(),
  themeId: text('theme_id'),
  themeName: text('theme_name'),
  mode: text('mode').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  duration: int('duration').notNull(), // em minutos
  isManual: int('is_manual').notNull().default(0),
  pomodoroRounds: int('pomodoro_rounds'),
  createdAt: text('created_at').notNull(),
});

//metas

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const goalTasks = sqliteTable('goal_tasks', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  title: text('title').notNull(),
  targetCount: int('target_count').notNull(),
  completedCount: int('completed_count').notNull().default(0),
});

//recompensas

export const rewards = sqliteTable('rewards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  conditionType: text('condition_type').notNull(),
  conditionTarget: real('condition_target').notNull(),
  conditionPeriod: text('condition_period').notNull(),
  unlocked: int('unlocked').notNull().default(0),
  unlockedAt: text('unlocked_at'),
  createdAt: text('created_at').notNull(),
});
