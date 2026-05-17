import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = SQLite.openDatabaseSync('focomais.db');
sqlite.runSync('PRAGMA journal_mode=WAL');
sqlite.runSync('PRAGMA synchronous=NORMAL');

export const db = drizzle(sqlite, { schema });
export { sqlite };

export type Database = typeof db;
