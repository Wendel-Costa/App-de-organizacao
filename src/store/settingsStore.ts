import { create } from 'zustand';
import {
  requestNotificationPermissions,
  scheduleDailyHabitsReminder,
  cancelDailyHabitsReminder,
  scheduleFocusReminder,
  cancelFocusReminder,
  cancelAllNotifications,
} from '@/services/notifications.service';

interface SettingsState {
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

  requestPermissions: () => Promise<void>;
  setTaskReminder: (enabled: boolean, hour?: number) => Promise<void>;
  setDueDateWarning: (enabled: boolean) => void;
  setHabitsReminder: (enabled: boolean, hour?: number, minute?: number) => Promise<void>;
  setFocusReminder: (enabled: boolean, hour?: number, minute?: number) => Promise<void>;
  disableAllNotifications: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
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

      if (habitsReminderEnabled) {
        await scheduleDailyHabitsReminder(habitsReminderHour, habitsReminderMinute);
      }
      if (focusReminderEnabled) {
        await scheduleFocusReminder(focusReminderHour, focusReminderMinute);
      }
    }
  },

  setTaskReminder: async (enabled, hour) => {
    set((s) => ({
      taskReminderEnabled: enabled,
      taskReminderHour: hour ?? s.taskReminderHour,
    }));
  },

  setDueDateWarning: (enabled) => {
    set({ dueDateWarningEnabled: enabled });
  },

  setHabitsReminder: async (enabled, hour, minute) => {
    const state = get();
    const h = hour ?? state.habitsReminderHour;
    const m = minute ?? state.habitsReminderMinute;

    set({ habitsReminderEnabled: enabled, habitsReminderHour: h, habitsReminderMinute: m });

    if (enabled && state.notificationsEnabled) {
      await scheduleDailyHabitsReminder(h, m);
    } else {
      await cancelDailyHabitsReminder();
    }
  },

  setFocusReminder: async (enabled, hour, minute) => {
    const state = get();
    const h = hour ?? state.focusReminderHour;
    const m = minute ?? state.focusReminderMinute;

    set({ focusReminderEnabled: enabled, focusReminderHour: h, focusReminderMinute: m });

    if (enabled && state.notificationsEnabled) {
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
