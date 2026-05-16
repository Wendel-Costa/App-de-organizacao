import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotificationPermissions,
  scheduleDailyHabitsReminder,
  cancelDailyHabitsReminder,
  scheduleFocusReminder,
  cancelFocusReminder,
  cancelAllNotifications,
} from '@/services/notifications.service';

const NAME_KEY = '@focomais:user_name';
const SETTINGS_KEY = '@focomais:notification_settings';

interface SettingsState {
  name: string;
  nameLoaded: boolean;
  settingsLoaded: boolean;

  notificationsEnabled: boolean;
  taskReminderEnabled: boolean;
  taskReminderHour: number;
  dueDateWarningEnabled: boolean;
  habitsReminderEnabled: boolean;
  habitsReminderHour: number;
  habitsReminderMinute: number;
  focusReminderEnabled: boolean;
  focusReminderHour: number;
  focusReminderMinute: number;

  loadName: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  requestPermissions: () => Promise<void>;
  setTaskReminder: (enabled: boolean, hour?: number) => Promise<void>;
  setDueDateWarning: (enabled: boolean) => Promise<void>;
  setHabitsReminder: (enabled: boolean, hour?: number, minute?: number) => Promise<void>;
  setFocusReminder: (enabled: boolean, hour?: number, minute?: number) => Promise<void>;
  disableAllNotifications: () => Promise<void>;
}

async function persistSettings(state: Partial<SettingsState>) {
  const keys: (keyof SettingsState)[] = [
    'notificationsEnabled',
    'taskReminderEnabled',
    'taskReminderHour',
    'dueDateWarningEnabled',
    'habitsReminderEnabled',
    'habitsReminderHour',
    'habitsReminderMinute',
    'focusReminderEnabled',
    'focusReminderHour',
    'focusReminderMinute',
  ];
  const toSave: Record<string, unknown> = {};
  keys.forEach((k) => {
    if (k in state) toSave[k] = state[k];
  });
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  name: '',
  nameLoaded: false,
  settingsLoaded: false,

  notificationsEnabled: false,
  taskReminderEnabled: true,
  taskReminderHour: 8,
  dueDateWarningEnabled: true,
  habitsReminderEnabled: false,
  habitsReminderHour: 8,
  habitsReminderMinute: 0,
  focusReminderEnabled: false,
  focusReminderHour: 9,
  focusReminderMinute: 0,

  loadName: async () => {
    try {
      const stored = await AsyncStorage.getItem(NAME_KEY);
      set({ name: stored ?? '', nameLoaded: true });
    } catch {
      set({ nameLoaded: true });
    }
  },

  setName: async (name) => {
    try {
      await AsyncStorage.setItem(NAME_KEY, name.trim());
      set({ name: name.trim() });
    } catch {
      set({ name: name.trim() });
    }
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ ...parsed, settingsLoaded: true });
      } else {
        set({ settingsLoaded: true });
      }
    } catch {
      set({ settingsLoaded: true });
    }
  },

  requestPermissions: async () => {
    const granted = await requestNotificationPermissions();
    const updates = { notificationsEnabled: granted };
    set(updates);
    await persistSettings(updates);

    if (granted) {
      const {
        habitsReminderEnabled,
        habitsReminderHour,
        habitsReminderMinute,
        focusReminderEnabled,
        focusReminderHour,
        focusReminderMinute,
      } = get();
      if (habitsReminderEnabled)
        await scheduleDailyHabitsReminder(habitsReminderHour, habitsReminderMinute);
      if (focusReminderEnabled) await scheduleFocusReminder(focusReminderHour, focusReminderMinute);
    }
  },

  setTaskReminder: async (enabled, hour) => {
    const updates = {
      taskReminderEnabled: enabled,
      taskReminderHour: hour ?? get().taskReminderHour,
    };
    set(updates);
    await persistSettings(updates);
  },

  setDueDateWarning: async (enabled) => {
    set({ dueDateWarningEnabled: enabled });
    await persistSettings({ dueDateWarningEnabled: enabled });
  },

  setHabitsReminder: async (enabled, hour, minute) => {
    const s = get();
    const h = hour ?? s.habitsReminderHour;
    const m = minute ?? s.habitsReminderMinute;
    const updates = {
      habitsReminderEnabled: enabled,
      habitsReminderHour: h,
      habitsReminderMinute: m,
    };
    set(updates);
    await persistSettings(updates);

    if (enabled && s.notificationsEnabled) {
      await scheduleDailyHabitsReminder(h, m);
    } else {
      await cancelDailyHabitsReminder();
    }
  },

  setFocusReminder: async (enabled, hour, minute) => {
    const s = get();
    const h = hour ?? s.focusReminderHour;
    const m = minute ?? s.focusReminderMinute;
    const updates = { focusReminderEnabled: enabled, focusReminderHour: h, focusReminderMinute: m };
    set(updates);
    await persistSettings(updates);

    if (enabled && s.notificationsEnabled) {
      await scheduleFocusReminder(h, m);
    } else {
      await cancelFocusReminder();
    }
  },

  disableAllNotifications: async () => {
    await cancelAllNotifications();
    const updates = { notificationsEnabled: false };
    set(updates);
    await persistSettings(updates);
  },
}));
