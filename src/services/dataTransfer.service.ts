import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db, sqlite } from '@/database';
import * as schema from '@/database/schema';

export const EXPORT_VERSION = 2 as const;

type ExportPayload = {
  exportVersion: 2;
  exportedAt: string;
  settings: {
    name: string;
    notificationSettings: Record<string, unknown>;
    geralThemeHidden: boolean;
  };
  data: Record<string, unknown[]>;
};

type LegacyPayload = Omit<ExportPayload, 'exportVersion'> & { exportVersion: 1 };

type TableDefinition = readonly [keyof ExportPayload['data'], string, unknown];

const NAME_KEY = '@focomais:user_name';
const SETTINGS_KEY = '@focomais:notification_settings';
const GERAL_THEME_HIDDEN_KEY = '@foco:geralThemeHidden';

const TABLES: readonly TableDefinition[] = [
  ['gamificationSettings', 'gamification_settings', schema.gamificationSettings],
  ['pointEvents', 'point_events', schema.pointEvents],
  ['coinTransactions', 'coin_transactions', schema.coinTransactions],
  ['achievements', 'achievements', schema.achievements],
  ['notebooks', 'notebooks', schema.notebooks],
  ['notebookTopics', 'notebook_topics', schema.notebookTopics],
  ['goals', 'goals', schema.goals],
  ['goalTasks', 'goal_tasks', schema.goalTasks],
  ['goalTaskCompletions', 'goal_task_completions', schema.goalTaskCompletions],
  ['focusThemes', 'focus_themes', schema.focusThemes],
  ['focusSessions', 'focus_sessions', schema.focusSessions],
  ['tasks', 'tasks', schema.tasks],
  ['subtasks', 'subtasks', schema.subtasks],
  ['taskCompletions', 'task_completions', schema.taskCompletions],
  ['taskSkips', 'task_skips', schema.taskSkips],
  ['rewards', 'rewards', schema.rewards],
  ['purchasableRewards', 'purchasable_rewards', schema.purchasableRewards],
  ['purchasableRewardPurchases', 'purchasable_reward_purchases', schema.purchasableRewardPurchases],
] as const;

const BOOLEAN_FIELDS = new Set([
  'completed',
  'is_manual',
  'allow_overflow',
  'allow_beyond_100',
  'archived',
  'unlocked',
  'task_scoring_enabled',
  'geralThemeHidden',
]);

const INTEGER_FIELDS = new Set([
  'duration',
  'pomodoro_rounds',
  'recurrence_interval',
  'recurrence_count',
]);

const REAL_FIELDS = new Set([
  'points_per_focus_hour',
  'task_level_1_points',
  'task_level_2_points',
  'task_level_3_points',
  'topic_points',
  'notebook_completion_points',
  'goal_completion_points',
  'points',
  'coins',
  'amount',
  'tolerance',
  'sort_order',
  'target_count',
  'condition_target',
  'cost',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function camelToSnake(value: string): string {
  return value
    .replace(/([a-zA-Z])([0-9])/g, '$1_$2')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function normalizeBoolean(value: unknown, fallback = false): 0 | 1 {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value === 1 ? 1 : value === 0 ? 0 : fallback ? 1 : 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return 1;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return 0;
  }
  return fallback ? 1 : 0;
}

function normalizeScalar(value: unknown, column: string): unknown {
  if (value === undefined) return null;
  if (value === null) return null;

  if (BOOLEAN_FIELDS.has(column)) return normalizeBoolean(value);

  if (INTEGER_FIELDS.has(column)) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Math.trunc(Number(value));
    }
    throw new Error(`INVALID_FIELD_TYPE:${column}`);
  }

  if (REAL_FIELDS.has(column)) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
    throw new Error(`INVALID_FIELD_TYPE:${column}`);
  }

  return value;
}

function validateSettings(settings: unknown): ExportPayload['settings'] {
  if (!isObject(settings)) throw new Error('INVALID_STRUCTURE');
  if (typeof settings.name !== 'string') throw new Error('INVALID_STRUCTURE');
  if (!isObject(settings.notificationSettings)) throw new Error('INVALID_STRUCTURE');
  if (typeof settings.geralThemeHidden !== 'boolean') throw new Error('INVALID_STRUCTURE');
  return {
    name: settings.name,
    notificationSettings: settings.notificationSettings,
    geralThemeHidden: settings.geralThemeHidden,
  };
}

function normalizeBackup(value: unknown): ExportPayload {
  if (!isObject(value)) throw new Error('INVALID_JSON');
  const version = value.exportVersion;
  if (version !== 1 && version !== 2) throw new Error('UNSUPPORTED_VERSION');
  if (typeof value.exportedAt !== 'string') throw new Error('INVALID_STRUCTURE');
  if (!isObject(value.data)) throw new Error('INVALID_STRUCTURE');

  const optionalKeys = new Set(['taskSkips', 'purchasableRewardPurchases']);
  for (const [key] of TABLES) {
    if (!(key in value.data)) {
      if (optionalKeys.has(key)) (value.data as Record<string, unknown[]>)[key] = [];
      else throw new Error('INVALID_STRUCTURE');
    }
    if (!Array.isArray(value.data[key])) throw new Error('INVALID_STRUCTURE');
  }

  const normalizedData: Record<string, unknown[]> = {};

  for (const [key] of TABLES) {
    normalizedData[key] = (value.data[key] as unknown[]).map((row) => {
      if (!isObject(row)) throw new Error('INVALID_STRUCTURE');
      const out: Record<string, unknown> = {};
      for (const [field, fieldValue] of Object.entries(row)) {
        const dbColumn = camelToSnake(field);
        out[field] = normalizeScalar(fieldValue, dbColumn);
      }
      return out;
    });
  }

  return {
    exportVersion: 2,
    exportedAt: value.exportedAt,
    settings: validateSettings(value.settings),
    data: normalizedData,
  };
}

async function getSettingsSnapshot() {
  const [name, notificationSettings, geralThemeHidden] = await Promise.all([
    AsyncStorage.getItem(NAME_KEY),
    AsyncStorage.getItem(SETTINGS_KEY),
    AsyncStorage.getItem(GERAL_THEME_HIDDEN_KEY),
  ]);

  let parsedSettings: Record<string, unknown> = {};
  if (notificationSettings) {
    try {
      const parsed = JSON.parse(notificationSettings);
      if (isObject(parsed)) parsedSettings = parsed;
    } catch {}
  }

  return {
    name: name ?? '',
    notificationSettings: parsedSettings,
    geralThemeHidden: geralThemeHidden === 'true',
  };
}

export async function buildExportPayload(): Promise<ExportPayload> {
  const [rows, settings] = await Promise.all([
    Promise.all(TABLES.map(([, , table]) => db.select().from(table as any))),
    getSettingsSnapshot(),
  ]);

  const tableData: Record<string, unknown[]> = {};
  TABLES.forEach(([key], index) => {
    tableData[key] = rows[index] as unknown[];
  });

  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    data: tableData,
  };
}

export async function pickImportFile(): Promise<ExportPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }

  return normalizeBackup(parsed);
}

function getTableMetadata(tableName: string) {
  const rows = sqlite.getAllSync<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
    dflt_value: string | null;
  }>(`PRAGMA table_info("${tableName}")`);
  if (rows.length === 0) throw new Error(`UNKNOWN_TABLE:${tableName}`);
  return new Map(rows.map((row) => [row.name, row]));
}

function validateRowsAgainstSchema(tableName: string, rows: unknown[]) {
  const columns = getTableMetadata(tableName);
  const primaryKey = Array.from(columns.values()).find((column) => column.pk)?.name;
  const seenPrimaryKeys = new Set<unknown>();

  for (const row of rows) {
    if (!isObject(row)) throw new Error('INVALID_STRUCTURE');

    const seenColumns = new Set<string>();
    for (const [field, rawValue] of Object.entries(row)) {
      const dbColumn = camelToSnake(field);
      const metadata = columns.get(dbColumn);
      if (!metadata) throw new Error(`UNKNOWN_COLUMN:${tableName}.${field}`);
      seenColumns.add(dbColumn);

      if (rawValue === null) {
        if (metadata.notnull && !metadata.dflt_value) {
          throw new Error(`NULL_NOT_ALLOWED:${tableName}.${field}`);
        }
        continue;
      }

      if (metadata.type.toUpperCase().includes('INT') && !BOOLEAN_FIELDS.has(dbColumn)) {
        if (typeof rawValue !== 'number' || !Number.isInteger(rawValue)) {
          throw new Error(`INVALID_FIELD_TYPE:${tableName}.${field}`);
        }
      }
      if (metadata.type.toUpperCase().includes('REAL')) {
        if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
          throw new Error(`INVALID_FIELD_TYPE:${tableName}.${field}`);
        }
      }
      if (metadata.type.toUpperCase().includes('TEXT') && typeof rawValue !== 'string') {
        throw new Error(`INVALID_FIELD_TYPE:${tableName}.${field}`);
      }
    }

    if (primaryKey) {
      const primaryField = Object.entries(row).find(
        ([field]) => camelToSnake(field) === primaryKey,
      )?.[1];
      if (primaryField !== undefined) {
        if (seenPrimaryKeys.has(primaryField)) {
          throw new Error(`DUPLICATE_PRIMARY_KEY:${tableName}.${primaryKey}`);
        }
        seenPrimaryKeys.add(primaryField);
      }
    }

    for (const [column, metadata] of columns) {
      if (!metadata.notnull || metadata.pk || metadata.dflt_value !== null) continue;
      if (!seenColumns.has(column))
        throw new Error(`MISSING_REQUIRED_COLUMN:${tableName}.${column}`);
    }
  }
}

async function deleteAllData(
  txn: Parameters<Parameters<typeof sqlite.withExclusiveTransactionAsync>[0]>[0],
) {
  const statements = [
    'DELETE FROM purchasable_reward_purchases',
    'DELETE FROM purchasable_rewards',
    'DELETE FROM rewards',
    'DELETE FROM task_skips',
    'DELETE FROM task_completions',
    'DELETE FROM subtasks',
    'DELETE FROM tasks',
    'DELETE FROM focus_sessions',
    'DELETE FROM focus_themes',
    'DELETE FROM goal_task_completions',
    'DELETE FROM goal_tasks',
    'DELETE FROM goals',
    'DELETE FROM notebook_topics',
    'DELETE FROM notebooks',
    'DELETE FROM achievements',
    'DELETE FROM coin_transactions',
    'DELETE FROM point_events',
    'DELETE FROM gamification_settings',
  ];
  for (const statement of statements) await txn.execAsync(statement);
}

export async function importData(payload: unknown): Promise<void> {
  const normalized = normalizeBackup(payload);

  for (const [key, tableName] of TABLES) {
    validateRowsAgainstSchema(tableName, normalized.data[key]);
  }

  await sqlite.withExclusiveTransactionAsync(async (txn) => {
    await deleteAllData(txn);

    for (const [key, tableName] of TABLES) {
      const rows = normalized.data[key];
      for (const row of rows) {
        if (!isObject(row)) throw new Error('INVALID_STRUCTURE');
        const entries = Object.entries(row).map(
          ([field, value]) => [camelToSnake(field), value] as const,
        );
        if (!entries.length) continue;

        const columns = entries.map(([column]) => column);
        const placeholders = columns.map(() => '?').join(', ');
        const columnSql = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
        const values = entries.map(([, value]) => (value === undefined ? null : value));

        await txn.runAsync(
          `INSERT INTO "${tableName}" (${columnSql}) VALUES (${placeholders})`,
          ...(values as any[]),
        );
      }
    }
  });

  await AsyncStorage.multiSet([
    [NAME_KEY, normalized.settings.name.trim()],
    [SETTINGS_KEY, JSON.stringify(normalized.settings.notificationSettings)],
    [GERAL_THEME_HIDDEN_KEY, normalized.settings.geralThemeHidden ? 'true' : 'false'],
  ]);
}
