import { int, real, text, sqliteTable, integer } from 'drizzle-orm/sqlite-core';

//tarefas

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  scoreLevel: int('score_level'),
  completed: int('completed').notNull().default(0),
  scheduledDate: text('scheduled_date'),
  dueDate: text('due_date'),
  recurrenceDays: text('recurrence_days'),
  recurrenceInterval: int('recurrence_interval'),
  goalId: text('goal_id'),
  themeId: text('theme_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  completedAt: text('completed_at'),
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
  duration: int('duration').notNull(),
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
  tolerance: real('tolerance').notNull().default(0),
  allowOverflow: int('allow_overflow').notNull().default(0),
  allowBeyond100: int('allow_beyond_100').notNull().default(0),
  archived: int('archived').notNull().default(0),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const goalTasks = sqliteTable('goal_tasks', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  title: text('title').notNull(),
  targetCount: real('target_count').notNull(),
  type: text('type').notNull().default('habit'),
  themeId: text('theme_id'),
  themeName: text('theme_name'),
  themeIds: text('theme_ids'),
  notebookId: text('notebook_id'),
  recurrenceType: text('recurrence_type').notNull().default('none'),
  recurrenceCount: int('recurrence_count').notNull().default(1),
  recurrenceDays: text('recurrence_days'),
});

export const goalTaskCompletions = sqliteTable('goal_task_completions', {
  id: text('id').primaryKey(),
  goalTaskId: text('goal_task_id').notNull(),
  completedDate: text('completed_date').notNull(),
  createdAt: text('created_at').notNull(),
});

//recompensas

export const rewards = sqliteTable('rewards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  conditionType: text('condition_type').notNull(),
  conditionTarget: real('condition_target').notNull().default(0),
  conditionPeriod: text('condition_period').notNull().default('anytime'),
  conditionThemeId: text('condition_theme_id'),
  conditionTaskIds: text('condition_task_ids'),
  conditionGoalId: text('condition_goal_id'),
  conditionCustomStart: text('condition_custom_start'),
  conditionCustomEnd: text('condition_custom_end'),
  unlocked: int('unlocked').notNull().default(0),
  unlockedAt: text('unlocked_at'),
  archived: int('archived').notNull().default(0),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

//histórico de tarefas concluídas (vou utilizar em atualizações futuras)

export const taskCompletions = sqliteTable('task_completions', {
  id: text('id').primaryKey(),
  originalTaskId: text('original_task_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  scoreLevel: int('score_level'),
  recurrenceDays: text('recurrence_days'),
  goalId: text('goal_id'),
  themeId: text('theme_id'),
  subtasksSnapshot: text('subtasks_snapshot'),
  completedAt: text('completed_at').notNull(),
  createdAt: text('created_at').notNull(),
  savedAt: text('saved_at').notNull(),
});

// gamificação
export const gamificationSettings = sqliteTable('gamification_settings', {
  id: text('id').primaryKey(),
  pointsPerFocusHour: real('points_per_focus_hour').notNull().default(1),
  taskScoringEnabled: integer('task_scoring_enabled').notNull().default(0),
  taskLevel1Points: real('task_level_1_points').notNull().default(1),
  taskLevel2Points: real('task_level_2_points').notNull().default(3),
  taskLevel3Points: real('task_level_3_points').notNull().default(5),
  topicPoints: real('topic_points').notNull().default(1),
  notebookCompletionPoints: real('notebook_completion_points').notNull().default(10),
  goalCompletionPoints: real('goal_completion_points').notNull().default(25),
  updatedAt: text('updated_at').notNull(),
});

export const pointEvents = sqliteTable('point_events', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  entityId: text('entity_id').notNull(),
  points: real('points').notNull(),
  coins: real('coins').notNull(),
  occurredAt: text('occurred_at').notNull(),
  reversalOf: text('reversal_of'),
  metadata: text('metadata'),
});

export const coinTransactions = sqliteTable('coin_transactions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  amount: real('amount').notNull(),
  occurredAt: text('occurred_at').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  reversalOf: text('reversal_of'),
  description: text('description'),
});

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  action: text('action').notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: text('created_at').notNull(),
});

// cadernos
export const notebooks = sqliteTable('notebooks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const notebookTopics = sqliteTable('notebook_topics', {
  id: text('id').primaryKey(),
  notebookId: text('notebook_id').notNull(),
  title: text('title').notNull(),
  completed: int('completed').notNull().default(0),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// loja de recompensas
export const purchasableRewards = sqliteTable('purchasable_rewards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  cost: real('cost').notNull(),
  archived: int('archived').notNull().default(0),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});
