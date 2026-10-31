import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { sqlite } from '@/database';

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

type TableDefinition = readonly [string, string];
type StoredSetting = readonly [string, string | null];

type SQLiteTransaction = Parameters<Parameters<typeof sqlite.withExclusiveTransactionAsync>[0]>[0];

const NAME_KEY = '@focomais:user_name';
const SETTINGS_KEY = '@focomais:notification_settings';
const GERAL_THEME_HIDDEN_KEY = '@foco:geralThemeHidden';
const SETTING_KEYS = [NAME_KEY, SETTINGS_KEY, GERAL_THEME_HIDDEN_KEY];

const TABLES: readonly TableDefinition[] = [
  ['gamificationSettings', 'gamification_settings'],
  ['pointEvents', 'point_events'],
  ['coinTransactions', 'coin_transactions'],
  ['achievements', 'achievements'],
  ['notebooks', 'notebooks'],
  ['notebookTopics', 'notebook_topics'],
  ['goals', 'goals'],
  ['goalTasks', 'goal_tasks'],
  ['goalTaskCompletions', 'goal_task_completions'],
  ['focusThemes', 'focus_themes'],
  ['focusSessions', 'focus_sessions'],
  ['tasks', 'tasks'],
  ['subtasks', 'subtasks'],
  ['taskCompletions', 'task_completions'],
  ['taskSkips', 'task_skips'],
  ['rewards', 'rewards'],
  ['purchasableRewards', 'purchasable_rewards'],
  ['purchasableRewardPurchases', 'purchasable_reward_purchases'],
] as const;

const LEGACY_OPTIONAL_TABLES = new Set(['taskSkips', 'purchasableRewardPurchases']);

const REQUIRED_RELATIONSHIPS = [
  { childTable: 'notebookTopics', childColumn: 'notebookId', parentTable: 'notebooks' },
  { childTable: 'goalTasks', childColumn: 'goalId', parentTable: 'goals' },
  { childTable: 'goalTaskCompletions', childColumn: 'goalTaskId', parentTable: 'goalTasks' },
  { childTable: 'subtasks', childColumn: 'taskId', parentTable: 'tasks' },
] as const;

const BOOLEAN_FIELDS = new Set([
  'completed',
  'is_manual',
  'allow_overflow',
  'allow_beyond_100',
  'archived',
  'unlocked',
  'task_scoring_enabled',
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

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

function normalizeBoolean(value: unknown, column: string): 0 | 1 {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 1 || value === '1') return 1;
  if (value === 0 || value === '0') return 0;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'on'].includes(normalized)) return 1;
    if (['false', 'no', 'off'].includes(normalized)) return 0;
  }

  throw new Error(`INVALID_FIELD_TYPE:${column}`);
}

function normalizeInteger(value: unknown, column: string): number {
  if (typeof value === 'string' && value.trim() === '') {
    throw new Error(`INVALID_FIELD_TYPE:${column}`);
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`INVALID_FIELD_TYPE:${column}`);
  }
  return parsed;
}

function normalizeReal(value: unknown, column: string): number {
  if (typeof value === 'string' && value.trim() === '') {
    throw new Error(`INVALID_FIELD_TYPE:${column}`);
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`INVALID_FIELD_TYPE:${column}`);
  return parsed;
}

function normalizeScalar(value: unknown, column: string): unknown {
  if (value === undefined || value === null) return null;
  if (BOOLEAN_FIELDS.has(column)) return normalizeBoolean(value, column);
  if (INTEGER_FIELDS.has(column)) return normalizeInteger(value, column);
  if (REAL_FIELDS.has(column)) return normalizeReal(value, column);
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
  if (version !== 1 && version !== EXPORT_VERSION) throw new Error('UNSUPPORTED_VERSION');
  if (
    typeof value.exportedAt !== 'string' ||
    value.exportedAt.trim() === '' ||
    !isObject(value.data)
  ) {
    throw new Error('INVALID_STRUCTURE');
  }

  const expectedKeys = new Set(TABLES.map(([key]) => key));
  for (const key of Object.keys(value.data)) {
    if (!expectedKeys.has(key)) throw new Error(`UNKNOWN_TABLE:${key}`);
  }

  const normalizedData: Record<string, unknown[]> = {};

  for (const [key] of TABLES) {
    const tableData = value.data[key];
    if (tableData === undefined && version === 1 && LEGACY_OPTIONAL_TABLES.has(key)) {
      normalizedData[key] = [];
      continue;
    }
    if (!Array.isArray(tableData)) throw new Error(`INVALID_TABLE_DATA:${key}`);

    normalizedData[key] = tableData.map((row) => {
      if (!isObject(row)) throw new Error(`INVALID_ROW:${key}`);

      const normalizedRow: Record<string, unknown> = {};
      for (const [field, fieldValue] of Object.entries(row)) {
        normalizedRow[field] = normalizeScalar(fieldValue, camelToSnake(field));
      }
      return normalizedRow;
    });
  }

  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: value.exportedAt,
    settings: validateSettings(value.settings),
    data: normalizedData,
  };
}

async function getSettingsSnapshot(): Promise<ExportPayload['settings']> {
  const settingsEntries = await AsyncStorage.multiGet(SETTING_KEYS);
  const settingsMap = new Map(settingsEntries);
  const name = settingsMap.get(NAME_KEY);
  const notificationSettings = settingsMap.get(SETTINGS_KEY);
  const geralThemeHidden = settingsMap.get(GERAL_THEME_HIDDEN_KEY);

  if (geralThemeHidden !== null && geralThemeHidden !== 'true' && geralThemeHidden !== 'false') {
    throw new Error('INVALID_GERAL_THEME_SETTING');
  }

  let parsedSettings: Record<string, unknown> = {};
  if (notificationSettings) {
    const parsed: unknown = JSON.parse(notificationSettings);
    if (!isObject(parsed)) throw new Error('INVALID_NOTIFICATION_SETTINGS');
    parsedSettings = parsed;
  }

  return {
    name: name ?? '',
    notificationSettings: parsedSettings,
    geralThemeHidden: geralThemeHidden === 'true',
  };
}

export async function buildExportPayload(): Promise<ExportPayload> {
  const tableData: Record<string, unknown[]> = {};

  await sqlite.withExclusiveTransactionAsync(async (txn) => {
    for (const [key, tableName] of TABLES) {
      const rows = await txn.getAllAsync<Record<string, unknown>>(`SELECT * FROM "${tableName}"`);
      tableData[key] = rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([column, value]) => [snakeToCamel(column), value]),
        ),
      );
    }
  });

  const settings = await getSettingsSnapshot();

  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    data: tableData,
  };
}

export async function exportData(format: 'json' | 'txt' = 'json'): Promise<string> {
  const payload = await buildExportPayload();
  const extension = format === 'txt' ? 'txt' : 'json';
  const mimeType = format === 'txt' ? 'text/plain' : 'application/json';
  const uti = format === 'txt' ? 'public.plain-text' : 'public.json';
  const uri = `${FileSystem.cacheDirectory}focomais-export-v${EXPORT_VERSION}-${Date.now()}.${extension}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: 'Exportar dados do FocoMais',
      UTI: uti,
    });
  }

  return uri;
}

export async function pickImportFile(): Promise<ExportPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/plain', 'application/json'],
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

function validateRowsAgainstSchema(tableName: string, rows: unknown[]): string {
  const columns = getTableMetadata(tableName);
  const primaryKey = Array.from(columns.values()).find((column) => column.pk)?.name;
  if (!primaryKey) throw new Error(`MISSING_PRIMARY_KEY_DEFINITION:${tableName}`);

  const seenPrimaryKeys = new Set<string>();

  for (const row of rows) {
    if (!isObject(row)) throw new Error(`INVALID_ROW:${tableName}`);

    const seenColumns = new Set<string>();
    const normalizedColumns = new Map<string, unknown>();

    for (const [field, rawValue] of Object.entries(row)) {
      const dbColumn = camelToSnake(field);
      const metadata = columns.get(dbColumn);
      if (!metadata) throw new Error(`UNKNOWN_COLUMN:${tableName}.${field}`);

      if (seenColumns.has(dbColumn)) {
        throw new Error(`DUPLICATE_COLUMN:${tableName}.${field}`);
      }
      seenColumns.add(dbColumn);
      normalizedColumns.set(dbColumn, rawValue);

      if (rawValue === null) {
        if (metadata.notnull) throw new Error(`NULL_NOT_ALLOWED:${tableName}.${field}`);
        continue;
      }

      const columnType = metadata.type.toUpperCase();
      if (columnType.includes('INT') && !BOOLEAN_FIELDS.has(dbColumn)) {
        if (typeof rawValue !== 'number' || !Number.isInteger(rawValue)) {
          throw new Error(`INVALID_FIELD_TYPE:${tableName}.${field}`);
        }
      } else if (columnType.includes('REAL')) {
        if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
          throw new Error(`INVALID_FIELD_TYPE:${tableName}.${field}`);
        }
      } else if (columnType.includes('TEXT') && typeof rawValue !== 'string') {
        throw new Error(`INVALID_FIELD_TYPE:${tableName}.${field}`);
      }
    }

    const primaryValue = normalizedColumns.get(primaryKey);
    if (typeof primaryValue !== 'string' || primaryValue.length === 0) {
      throw new Error(`MISSING_PRIMARY_KEY:${tableName}.${primaryKey}`);
    }
    if (seenPrimaryKeys.has(primaryValue)) {
      throw new Error(`DUPLICATE_PRIMARY_KEY:${tableName}.${primaryKey}`);
    }
    seenPrimaryKeys.add(primaryValue);

    for (const [column, metadata] of columns) {
      if (metadata.pk || !metadata.notnull || metadata.dflt_value !== null) continue;
      if (!seenColumns.has(column)) {
        throw new Error(`MISSING_REQUIRED_COLUMN:${tableName}.${column}`);
      }
    }
  }

  return primaryKey;
}

function validateRequiredRelationships(data: Record<string, unknown[]>): void {
  for (const relationship of REQUIRED_RELATIONSHIPS) {
    const parentIds = new Set(
      data[relationship.parentTable]
        .filter(isObject)
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string'),
    );

    for (const row of data[relationship.childTable]) {
      if (!isObject(row)) throw new Error(`INVALID_ROW:${relationship.childTable}`);

      const parentId = row[relationship.childColumn];
      if (typeof parentId !== 'string' || !parentIds.has(parentId)) {
        throw new Error(
          `INVALID_RELATIONSHIP:${relationship.childTable}.${relationship.childColumn}`,
        );
      }
    }
  }
}

async function deleteAllData(txn: SQLiteTransaction): Promise<void> {
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

async function insertTableRows(
  txn: SQLiteTransaction,
  tableName: string,
  rows: unknown[],
): Promise<void> {
  for (const row of rows) {
    if (!isObject(row)) throw new Error(`INVALID_ROW:${tableName}`);

    const entries = Object.entries(row).map(
      ([field, value]) => [camelToSnake(field), value] as const,
    );
    if (entries.length === 0) throw new Error(`EMPTY_ROW:${tableName}`);

    const columns = entries.map(([column]) => column);
    const placeholders = columns.map(() => '?').join(', ');
    const columnSql = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(', ');
    const values = entries.map(([, value]) => (value === undefined ? null : value));

    await txn.runAsync(
      `INSERT INTO "${tableName}" (${columnSql}) VALUES (${placeholders})`,
      ...(values as any[]),
    );
  }
}

async function verifyRestoredRows(
  txn: SQLiteTransaction,
  data: Record<string, unknown[]>,
  primaryKeyColumns: Map<string, string>,
): Promise<void> {
  for (const [key, tableName] of TABLES) {
    const primaryKey = primaryKeyColumns.get(key);
    if (!primaryKey) throw new Error(`MISSING_PRIMARY_KEY_DEFINITION:${tableName}`);

    const escapedPrimaryKey = primaryKey.replace(/"/g, '""');
    const restoredRows = await txn.getAllAsync<{ primaryKey: string }>(
      `SELECT "${escapedPrimaryKey}" AS primaryKey FROM "${tableName}"`,
    );
    const restoredIds = new Set(restoredRows.map((row) => row.primaryKey));
    const expectedIds = data[key].map((row): string => {
      if (!isObject(row)) throw new Error(`INVALID_ROW:${tableName}`);

      const id = row[snakeToCamel(primaryKey)];
      if (typeof id !== 'string') throw new Error(`MISSING_PRIMARY_KEY:${tableName}.${primaryKey}`);
      return id;
    });
    const expectedIdSet = new Set(expectedIds);

    if (
      restoredRows.length !== expectedIds.length ||
      restoredIds.size !== expectedIdSet.size ||
      expectedIds.some((id) => !restoredIds.has(id))
    ) {
      throw new Error(`RESTORE_VERIFICATION_FAILED:${tableName}`);
    }
  }
}

function buildSettingsEntries(settings: ExportPayload['settings']): [string, string][] {
  return [
    [NAME_KEY, settings.name],
    [SETTINGS_KEY, JSON.stringify(settings.notificationSettings)],
    [GERAL_THEME_HIDDEN_KEY, settings.geralThemeHidden ? 'true' : 'false'],
  ];
}

async function writeAndVerifySettings(settings: ExportPayload['settings']): Promise<void> {
  const expectedEntries = buildSettingsEntries(settings);
  await AsyncStorage.multiSet(expectedEntries);

  const actualEntries = await AsyncStorage.multiGet(SETTING_KEYS);
  const actualByKey = new Map(actualEntries);

  for (const [key, expectedValue] of expectedEntries) {
    if (actualByKey.get(key) !== expectedValue) {
      throw new Error(`SETTINGS_RESTORE_FAILED:${key}`);
    }
  }
}

async function restoreSettingsSnapshot(snapshot: readonly StoredSetting[]): Promise<void> {
  const entriesToRestore: [string, string][] = [];
  const keysToRemove: string[] = [];

  for (const [key, value] of snapshot) {
    if (value === null) keysToRemove.push(key);
    else entriesToRestore.push([key, value]);
  }

  if (entriesToRestore.length > 0) await AsyncStorage.multiSet(entriesToRestore);
  if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);

  const restoredEntries = await AsyncStorage.multiGet(SETTING_KEYS);
  const restoredByKey = new Map(restoredEntries);

  for (const [key, previousValue] of snapshot) {
    if (restoredByKey.get(key) !== previousValue) {
      throw new Error(`SETTINGS_ROLLBACK_FAILED:${key}`);
    }
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function importData(payload: unknown): Promise<void> {
  const normalized = normalizeBackup(payload);

  const primaryKeyColumns = new Map<string, string>();
  for (const [key, tableName] of TABLES) {
    const primaryKey = validateRowsAgainstSchema(tableName, normalized.data[key]);
    primaryKeyColumns.set(key, primaryKey);
  }
  validateRequiredRelationships(normalized.data);

  const previousSettings = await AsyncStorage.multiGet(SETTING_KEYS);
  let settingsWriteAttempted = false;

  try {
    await sqlite.withExclusiveTransactionAsync(async (txn) => {
      await deleteAllData(txn);

      for (const [key, tableName] of TABLES) {
        await insertTableRows(txn, tableName, normalized.data[key]);
      }

      await verifyRestoredRows(txn, normalized.data, primaryKeyColumns);

      settingsWriteAttempted = true;
      await writeAndVerifySettings(normalized.settings);
    });
  } catch (error) {
    if (settingsWriteAttempted) {
      try {
        await restoreSettingsSnapshot(previousSettings);
      } catch (rollbackError) {
        throw new Error(
          `IMPORT_FAILED_AND_SETTINGS_ROLLBACK_FAILED:${getErrorMessage(error)}:${getErrorMessage(rollbackError)}`,
        );
      }
    }

    throw error;
  }
}
