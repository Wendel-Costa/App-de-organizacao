import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import React from 'react';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WIDGET_TASK_NAME = 'focomais-widget-update';

async function getWidgetData() {
  try {
    const db = SQLite.openDatabaseSync('focomais.db');

    db.runSync('PRAGMA journal_mode=WAL');
    db.runSync('PRAGMA synchronous=NORMAL');

    const today = new Date().toISOString().split('T')[0];
    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      new Date().getDay()
    ];

    const allTasks = db.getAllSync<{
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
        const isDue = days.includes('daily') || days.includes(weekday);
        if (!isDue) return false;
        if (t.completed === 1) {
          return t.updated_at.split('T')[0] !== today;
        }
        return true;
      }
      if (t.type === 'anytime') {
        if (t.completed === 1) return t.updated_at.split('T')[0] === today ? false : true;
        return true;
      }
      return false;
    });

    const sessions = db.getAllSync<{ duration: number }>(
      `SELECT duration FROM focus_sessions WHERE start_time >= '${today}T00:00:00' AND start_time <= '${today}T23:59:59'`,
    );

    const focusMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
    const userName = (await AsyncStorage.getItem('@focomais:user_name')) ?? '';
    const pendingTaskNames = pendingToday.map((t) => t.title);

    return {
      pendingTasks: pendingToday.length,
      focusMinutes,
      userName,
      pendingTaskNames,
    };
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
