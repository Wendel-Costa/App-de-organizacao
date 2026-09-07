import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { sql } from 'drizzle-orm';
import { db, sqlite } from '@/database';
import * as schema from '@/database/schema';

export const EXPORT_VERSION = 1;

type ExportPayload = {
  exportVersion: 1;
  exportedAt: string;
  settings: {
    name: string;
    notificationSettings: Record<string, unknown>;
    geralThemeHidden: boolean;
  };
  data: Record<string, unknown[]>;
};

const NAME_KEY = '@focomais:user_name';
const SETTINGS_KEY = '@focomais:notification_settings';
const GERAL_THEME_HIDDEN_KEY = '@foco:geralThemeHidden';

const TABLES = [
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
  ['rewards', 'rewards', schema.rewards],
  ['purchasableRewards', 'purchasable_rewards', schema.purchasableRewards],
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePayload(value: unknown): asserts value is ExportPayload {
  if (!isObject(value)) throw new Error('INVALID_JSON');
  if (value.exportVersion !== 1) throw new Error('UNSUPPORTED_VERSION');
  if (!isObject(value.data)) throw new Error('INVALID_STRUCTURE');
  if (!isObject(value.settings)) throw new Error('INVALID_STRUCTURE');

  for (const [key] of TABLES) {
    if (!(key in value.data) || !Array.isArray(value.data[key])) {
      throw new Error('INVALID_STRUCTURE');
    }
  }

  if (typeof value.settings.name !== 'string') throw new Error('INVALID_STRUCTURE');
}

async function getSettingsSnapshot() {
  const [name, notificationSettings, geralThemeHidden] = await Promise.all([
    AsyncStorage.getItem(NAME_KEY),
    AsyncStorage.getItem(SETTINGS_KEY),
    AsyncStorage.getItem(GERAL_THEME_HIDDEN_KEY),
  ]);

  return {
    name: name ?? '',
    notificationSettings: notificationSettings ? JSON.parse(notificationSettings) : {},
    geralThemeHidden: geralThemeHidden === 'true',
  };
}

export async function buildExportPayload(): Promise<ExportPayload> {
  const tableData: Record<string, unknown[]> = {};
  for (const [key, , table] of TABLES) {
    tableData[key] = await db.select().from(table);
  }

  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: await getSettingsSnapshot(),
    data: tableData,
  };
}

export async function exportData(): Promise<string> {
  const payload = await buildExportPayload();
  const uri = `${FileSystem.cacheDirectory}focomais-export-v${EXPORT_VERSION}-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar dados do FocoMais',
      UTI: 'public.json',
    });
  }

  return uri;
}

export async function pickImportFile(): Promise<ExportPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
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
  validatePayload(parsed);
  return parsed;
}

async function deleteAllData(
  txn: Parameters<Parameters<typeof sqlite.withExclusiveTransactionAsync>[0]>[0],
) {
  const statements = [
    'DELETE FROM purchasable_rewards',
    'DELETE FROM rewards',
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
  validatePayload(payload);

  await sqlite.withExclusiveTransactionAsync(async (txn) => {
    await deleteAllData(txn);

    // Use parameterized statements so imported strings cannot become SQL.
    for (const [key, tableName] of TABLES) {
      const rows = payload.data[key];
      for (const row of rows) {
        if (!isObject(row)) throw new Error('INVALID_STRUCTURE');
        const columns = Object.keys(row);
        if (!columns.length) continue;

        const placeholders = columns.map(() => '?').join(', ');
        const columnSql = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
        const values = columns.map((c) => (row[c] === undefined ? null : row[c]));

        await txn.runAsync(
          `INSERT INTO "${tableName}" (${columnSql}) VALUES (${placeholders})`,
          ...(values as any[]),
        );
      }
    }
  });

  await AsyncStorage.multiSet([
    [NAME_KEY, payload.settings.name.trim()],
    [SETTINGS_KEY, JSON.stringify(payload.settings.notificationSettings ?? {})],
    [GERAL_THEME_HIDDEN_KEY, payload.settings.geralThemeHidden ? 'true' : 'false'],
  ]);
}
