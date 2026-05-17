import React from 'react';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WIDGET_TASK_NAME = 'focomais-widget-update';

async function getWidgetData() {
  try {
    const rawDb = SQLite.openDatabaseSync('focomais.db');
    rawDb.runSync('PRAGMA journal_mode=WAL');
    const today = new Date().toISOString().split('T')[0];
    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      new Date().getDay()
    ];

    const allTasks = rawDb.getAllSync<{
      title: string;
      type: string;
      completed: number;
      scheduled_date: string | null;
      recurrence_days: string | null;
      updated_at: string;
    }>('SELECT title, type, completed, scheduled_date, recurrence_days, updated_at FROM tasks');

    const pendingToday = allTasks.filter((t) => {
      if (t.type === 'scheduled') return t.completed === 0 && t.scheduled_date === today;
      if (t.type === 'recurring') {
        if (!t.recurrence_days) return false;
        const days: string[] = JSON.parse(t.recurrence_days);
        return (
          (days.includes('daily') || days.includes(weekday)) &&
          (t.completed === 0 || t.updated_at.split('T')[0] !== today)
        );
      }
      if (t.type === 'anytime') return t.completed === 0;
      return false;
    });

    const sessions = rawDb.getAllSync<{ duration: number }>(
      `SELECT duration FROM focus_sessions WHERE start_time >= '${today}T00:00:00' AND start_time <= '${today}T23:59:59'`,
    );
    rawDb.closeSync();

    const focusMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
    const userName = (await AsyncStorage.getItem('@focomais:user_name')) ?? '';
    const pendingTaskNames = pendingToday.map((t) => t.title);
    return { pendingTasks: pendingToday.length, focusMinutes, userName, pendingTaskNames };
  } catch {
    return { pendingTasks: 0, focusMinutes: 0, userName: '', pendingTaskNames: [] };
  }
}

export async function updateWidget(): Promise<void> {
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { FocoWidget } = await import('./FocoWidget');
    const data = await getWidgetData();
    await requestWidgetUpdate({
      widgetName: 'FocoWidget',
      renderWidget: () => React.createElement(FocoWidget, data),
      widgetNotFound: () => {},
    });
  } catch {}
}
