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

interface SettingsState {
  name: string;
  nameLoaded: boolean;

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
  requestPermissions: () => Promise<void>;
  setTaskReminder: (enabled: boolean, hour?: number) => Promise<void>;
  setDueDateWarning: (enabled: boolean) => void;
  setHabitsReminder: (enabled: boolean, hour?: number, minute?: number) => Promise<void>;
  setFocusReminder: (enabled: boolean, hour?: number, minute?: number) => Promise<void>;
  disableAllNotifications: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  name: '',
  nameLoaded: false,

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

  requestPermissions: async () => {
    const granted = await requestNotificationPermissions();
    set({ notificationsEnabled: granted });
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
    set((s) => ({ taskReminderEnabled: enabled, taskReminderHour: hour ?? s.taskReminderHour }));
  },

  setDueDateWarning: (enabled) => set({ dueDateWarningEnabled: enabled }),

  setHabitsReminder: async (enabled, hour, minute) => {
    const s = get();
    const h = hour ?? s.habitsReminderHour;
    const m = minute ?? s.habitsReminderMinute;
    set({ habitsReminderEnabled: enabled, habitsReminderHour: h, habitsReminderMinute: m });
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
    set({ focusReminderEnabled: enabled, focusReminderHour: h, focusReminderMinute: m });
    if (enabled && s.notificationsEnabled) {
      await scheduleFocusReminder(h, m);
    } else {
      await cancelFocusReminder();
    }
  },

  disableAllNotifications: async () => {
    await cancelAllNotifications();
    set({ notificationsEnabled: false });
  },
}));
