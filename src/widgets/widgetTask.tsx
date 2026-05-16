import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import React from 'react';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WIDGET_TASK_NAME = 'focomais-widget-update';

async function getWidgetData(): Promise<{
  pendingTasks: number;
  focusMinutes: number;
  userName: string;
}> {
  try {
    const db = SQLite.openDatabaseSync('focomais.db');

    db.runSync('PRAGMA journal_mode=WAL');
    db.runSync('PRAGMA synchronous=NORMAL');

    const today = new Date().toISOString().split('T')[0];
    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      new Date().getDay()
    ];

    const allTasks = db.getAllSync<{
      type: string;
      completed: number;
      scheduled_date: string | null;
      recurrence_days: string | null;
    }>('SELECT type, completed, scheduled_date, recurrence_days FROM tasks');

    const pendingTasks = allTasks.filter((t) => {
      if (t.completed === 1) return false;
      if (t.type === 'scheduled') return t.scheduled_date === today;
      if (t.type === 'recurring') {
        if (!t.recurrence_days) return false;
        const days: string[] = JSON.parse(t.recurrence_days);
        return days.includes('daily') || days.includes(weekday);
      }
      return t.type === 'anytime';
    }).length;

    const sessions = db.getAllSync<{ duration: number }>(`
      SELECT duration FROM focus_sessions
      WHERE start_time >= '${today}T00:00:00'
        AND start_time <= '${today}T23:59:59'
    `);
    const focusMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);

    const userName = (await AsyncStorage.getItem('@focomais:user_name')) ?? '';

    return { pendingTasks, focusMinutes, userName };
  } catch {
    return { pendingTasks: 0, focusMinutes: 0, userName: '' };
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
  } catch (e) {
    console.log('Widget update error:', e);
  }
}

TaskManager.defineTask(WIDGET_TASK_NAME, async () => {
  try {
    await updateWidget();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
