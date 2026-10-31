import { create } from 'zustand';
import { useGamificationStore } from '@/store/gamificationStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession, FocusTheme, FocusMode, FocusStatus } from '@/types/focus.types';
import {
  getAllSessions,
  getSessionsForDate,
  getAllThemes,
  createSession,
  createTheme,
  deleteSession,
  deleteTheme,
  updateSessionTheme,
  updateSessionTime,
} from '@/database/queries/focus.queries';

import {
  awardProductiveAction,
  getGamificationConfig,
  pointsForFocusDuration,
  reverseLatestProductiveAction,
  rescoreFocusSession,
} from '@/services/gamification.service';
import { dateOf } from '@/utils/date';

const GERAL_THEME_HIDDEN_KEY = '@foco:geralThemeHidden';
const ACTIVE_FOCUS_KEY = '@foco:activeFocus';
const TODAY_SESSIONS_CACHE_MS = 5000;
const todaySessionsFetchedAt = new Map<string, number>();
const todaySessionsFetchPromises = new Map<string, Promise<void>>();
let activeFocusStorageQueue = Promise.resolve();

function queueActiveFocusStorage(operation: () => Promise<void>): Promise<void> {
  const next = activeFocusStorageQueue.then(operation, operation);
  activeFocusStorageQueue = next.catch(() => {});
  return next;
}

interface PersistedActiveFocus {
  status: 'running' | 'paused';
  mode: FocusMode;
  selectedTheme: FocusTheme | null;
  startTime: string;
  runningSince: string | null;
  accumulatedSeconds: number;
  elapsedSeconds: number;
  pomodoroRounds: number;
  isOnBreak: boolean;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
}

function calculateElapsedSeconds(
  accumulatedSeconds: number,
  runningSince: Date | null,
  now = Date.now(),
): number {
  if (!runningSince) return Math.max(0, Math.floor(accumulatedSeconds));
  return Math.max(0, Math.floor(accumulatedSeconds + (now - runningSince.getTime()) / 1000));
}

function getPomodoroState(
  elapsedSeconds: number,
  workMinutes: number,
  breakMinutes: number,
): Pick<PersistedActiveFocus, 'pomodoroRounds' | 'isOnBreak'> {
  const workSeconds = Math.max(1, workMinutes * 60);
  const breakSeconds = Math.max(1, breakMinutes * 60);
  const cycleSeconds = workSeconds + breakSeconds;
  const remainder = elapsedSeconds % cycleSeconds;

  return {
    pomodoroRounds: Math.floor(elapsedSeconds / cycleSeconds),
    isOnBreak: remainder >= workSeconds && remainder < cycleSeconds,
  };
}

interface FocusState {
  sessions: FocusSession[];
  todaySessions: FocusSession[];
  themes: FocusTheme[];

  status: FocusStatus;
  mode: FocusMode;
  selectedTheme: FocusTheme | null;
  startTime: Date | null;
  runningSince: Date | null;
  accumulatedSeconds: number;
  elapsedSeconds: number;

  pomodoroRounds: number;
  isOnBreak: boolean;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  geralThemeHidden: boolean;

  fetchSessions: (force?: boolean) => Promise<void>;
  fetchTodaySessions: (date: string) => Promise<void>;
  fetchThemes: (force?: boolean) => Promise<void>;
  lastSessionsFetchedAt: number;
  lastThemesFetchedAt: number;
  addSession: (data: Omit<FocusSession, 'id' | 'createdAt'>) => Promise<void>;
  addTheme: (name: string, color?: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  removeTheme: (id: string) => Promise<void>;
  editSessionTheme: (id: string, themeId?: string, themeName?: string) => Promise<void>;
  editSessionTime: (
    id: string,
    startTime: string,
    endTime: string,
    duration: number,
  ) => Promise<void>;

  setMode: (mode: FocusMode) => void;
  setSelectedTheme: (theme: FocusTheme | null) => void;
  startFocus: () => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => Promise<{ conflict: boolean }>;
  tickTimer: () => void;
  setPomodoroConfig: (workMinutes: number, breakMinutes: number) => void;

  recalculateFromStart: () => void;
  persistActiveFocus: () => Promise<void>;
  restoreActiveFocus: () => Promise<void>;

  fetchGeralThemeVisibility: () => Promise<void>;
  removeGeralTheme: () => Promise<void>;
}

function hasTimeOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  sessions: [],
  todaySessions: [],
  themes: [],

  status: 'idle',
  mode: 'free',
  selectedTheme: null,
  startTime: null,
  runningSince: null,
  accumulatedSeconds: 0,
  elapsedSeconds: 0,

  pomodoroRounds: 0,
  isOnBreak: false,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  geralThemeHidden: false,
  lastSessionsFetchedAt: 0,
  lastThemesFetchedAt: 0,

  fetchSessions: async (force = false) => {
    if (!force && Date.now() - get().lastSessionsFetchedAt < 10000) {
      return;
    }
    const sessions = await getAllSessions();
    set({
      sessions,
      lastSessionsFetchedAt: Date.now(),
    });
  },

  fetchTodaySessions: async (date) => {
    const now = Date.now();
    const fetchedAt = todaySessionsFetchedAt.get(date) ?? 0;
    if (now - fetchedAt < TODAY_SESSIONS_CACHE_MS) return;

    const pending = todaySessionsFetchPromises.get(date);
    if (pending) return pending;

    const request = (async () => {
      const todaySessions = await getSessionsForDate(date);
      set({ todaySessions });
      todaySessionsFetchedAt.set(date, Date.now());
    })();

    todaySessionsFetchPromises.set(date, request);
    try {
      await request;
    } finally {
      todaySessionsFetchPromises.delete(date);
      const cutoff = Date.now() - 30000;
      for (const [cachedDate, timestamp] of todaySessionsFetchedAt) {
        if (timestamp < cutoff) todaySessionsFetchedAt.delete(cachedDate);
      }
    }
  },

  fetchThemes: async (force = false) => {
    if (!force && Date.now() - get().lastThemesFetchedAt < 30000) return;
    const themes = await getAllThemes();
    set({ themes, lastThemesFetchedAt: Date.now() });
  },

  addSession: async (data) => {
    const session = await createSession(data);
    const isToday = dateOf(session.startTime) === dateOf(new Date().toISOString());
    set((state) => ({
      sessions: [session, ...state.sessions],
      todaySessions: isToday ? [session, ...state.todaySessions] : state.todaySessions,
      lastSessionsFetchedAt: Date.now(),
    }));

    const config = await getGamificationConfig();
    const points = pointsForFocusDuration(session.duration, config.pointsPerFocusHour);
    if (points > 0) {
      await awardProductiveAction('focus_session', session.id, points, {
        metadata: {
          durationMinutes: session.duration,
          pointsPerHour: config.pointsPerFocusHour,
          mode: session.mode,
        },
      });
      await useGamificationStore.getState().refreshSummary();
    }
  },

  addTheme: async (name, color) => {
    const theme = await createTheme(name, color);
    set((state) => ({ themes: [...state.themes, theme], lastThemesFetchedAt: Date.now() }));
  },

  removeSession: async (id) => {
    await deleteSession(id);
    await reverseLatestProductiveAction('focus_session', id);
    await useGamificationStore.getState().refreshSummary();
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      todaySessions: state.todaySessions.filter((s) => s.id !== id),
      lastSessionsFetchedAt: Date.now(),
    }));
  },

  removeTheme: async (id) => {
    await deleteTheme(id);
    set((state) => ({
      themes: state.themes.filter((t) => t.id !== id),
      lastThemesFetchedAt: Date.now(),
    }));
  },

  setMode: (mode) => set({ mode }),

  setSelectedTheme: (theme) => set({ selectedTheme: theme }),

  startFocus: () => {
    if (get().status !== 'idle') return;

    const now = new Date();
    set({
      status: 'running',
      startTime: now,
      runningSince: now,
      accumulatedSeconds: 0,
      elapsedSeconds: 0,
      pomodoroRounds: 0,
      isOnBreak: false,
    });
    void get().persistActiveFocus();
  },

  pauseFocus: () => {
    const { status, accumulatedSeconds, runningSince } = get();
    if (status !== 'running') return;

    const elapsedSeconds = calculateElapsedSeconds(accumulatedSeconds, runningSince);
    const pomodoro = getPomodoroState(
      elapsedSeconds,
      get().pomodoroWorkMinutes,
      get().pomodoroBreakMinutes,
    );

    set({
      status: 'paused',
      accumulatedSeconds: elapsedSeconds,
      elapsedSeconds,
      runningSince: null,
      ...pomodoro,
    });
    void get().persistActiveFocus();
  },

  resumeFocus: () => {
    const { status } = get();
    if (status !== 'paused') return;

    const now = new Date();
    set({ status: 'running', runningSince: now });
    void get().persistActiveFocus();
  },

  tickTimer: () => {
    const {
      status,
      accumulatedSeconds,
      runningSince,
      mode,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
    } = get();

    if (status !== 'running') return;

    const elapsedSeconds = calculateElapsedSeconds(accumulatedSeconds, runningSince);
    const pomodoro =
      mode === 'pomodoro'
        ? getPomodoroState(elapsedSeconds, pomodoroWorkMinutes, pomodoroBreakMinutes)
        : { pomodoroRounds: 0, isOnBreak: false };

    set({ elapsedSeconds, ...pomodoro });
  },

  stopFocus: async () => {
    const {
      startTime,
      runningSince,
      accumulatedSeconds,
      mode,
      selectedTheme,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
      sessions,
    } = get();
    const elapsedSeconds = calculateElapsedSeconds(accumulatedSeconds, runningSince);
    const pomodoro = getPomodoroState(elapsedSeconds, pomodoroWorkMinutes, pomodoroBreakMinutes);

    if (!startTime || elapsedSeconds < 10) {
      await queueActiveFocusStorage(() =>
        AsyncStorage.removeItem(ACTIVE_FOCUS_KEY).then(() => undefined),
      );
      set({
        status: 'idle',
        startTime: null,
        runningSince: null,
        accumulatedSeconds: 0,
        elapsedSeconds: 0,
        pomodoroRounds: 0,
        isOnBreak: false,
      });
      return { conflict: false };
    }

    const endTime = new Date();
    const sessionDate = dateOf(startTime);

    const conflict = sessions.some((s) => {
      const sDate = dateOf(s.startTime);
      if (sDate !== sessionDate) return false;
      return hasTimeOverlap(startTime, endTime, new Date(s.startTime), new Date(s.endTime));
    });

    if (conflict) {
      await queueActiveFocusStorage(() =>
        AsyncStorage.removeItem(ACTIVE_FOCUS_KEY).then(() => undefined),
      );
      set({
        status: 'idle',
        startTime: null,
        runningSince: null,
        accumulatedSeconds: 0,
        elapsedSeconds: 0,
        pomodoroRounds: 0,
        isOnBreak: false,
      });
      return { conflict: true };
    }

    await get().addSession({
      themeId: selectedTheme?.id,
      themeName: selectedTheme?.name,
      mode,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: Math.floor(elapsedSeconds / 60),
      isManual: false,
      pomodoroRounds: mode === 'pomodoro' ? pomodoro.pomodoroRounds : undefined,
    });

    await queueActiveFocusStorage(() =>
      AsyncStorage.removeItem(ACTIVE_FOCUS_KEY).then(() => undefined),
    );
    set({
      status: 'idle',
      startTime: null,
      runningSince: null,
      accumulatedSeconds: 0,
      elapsedSeconds: 0,
      pomodoroRounds: 0,
      isOnBreak: false,
    });

    return { conflict: false };
  },

  setPomodoroConfig: (workMinutes, breakMinutes) =>
    set({ pomodoroWorkMinutes: workMinutes, pomodoroBreakMinutes: breakMinutes }),

  recalculateFromStart: () => {
    const {
      status,
      mode,
      accumulatedSeconds,
      runningSince,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
    } = get();
    if (status !== 'running' || !runningSince) return;

    const elapsedSeconds = calculateElapsedSeconds(accumulatedSeconds, runningSince);
    const pomodoro =
      mode === 'pomodoro'
        ? getPomodoroState(elapsedSeconds, pomodoroWorkMinutes, pomodoroBreakMinutes)
        : { pomodoroRounds: 0, isOnBreak: false };

    set({ elapsedSeconds, ...pomodoro });
  },

  persistActiveFocus: async () => {
    const {
      status,
      mode,
      selectedTheme,
      startTime,
      runningSince,
      accumulatedSeconds,
      elapsedSeconds,
      pomodoroRounds,
      isOnBreak,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
    } = get();

    if (status !== 'running' && status !== 'paused') {
      await queueActiveFocusStorage(() =>
        AsyncStorage.removeItem(ACTIVE_FOCUS_KEY).then(() => undefined),
      );
      return;
    }

    if (!startTime) return;

    const payload: PersistedActiveFocus = {
      status,
      mode,
      selectedTheme,
      startTime: startTime.toISOString(),
      runningSince: runningSince?.toISOString() ?? null,
      accumulatedSeconds,
      elapsedSeconds,
      pomodoroRounds,
      isOnBreak,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
    };

    await queueActiveFocusStorage(() =>
      AsyncStorage.setItem(ACTIVE_FOCUS_KEY, JSON.stringify(payload)).then(() => undefined),
    );
  },

  restoreActiveFocus: async () => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_FOCUS_KEY);
      if (!raw) return;

      const persisted = JSON.parse(raw) as Partial<PersistedActiveFocus>;
      if (persisted.status !== 'running' && persisted.status !== 'paused') {
        await AsyncStorage.removeItem(ACTIVE_FOCUS_KEY);
        return;
      }
      if (!persisted.startTime || !persisted.mode) {
        await AsyncStorage.removeItem(ACTIVE_FOCUS_KEY);
        return;
      }

      const startTime = new Date(persisted.startTime);
      const runningSince = persisted.runningSince ? new Date(persisted.runningSince) : null;
      if (
        Number.isNaN(startTime.getTime()) ||
        (runningSince && Number.isNaN(runningSince.getTime())) ||
        (persisted.status === 'running' && !runningSince)
      ) {
        await AsyncStorage.removeItem(ACTIVE_FOCUS_KEY);
        return;
      }

      const accumulatedSeconds = Math.max(
        0,
        Number(persisted.accumulatedSeconds ?? persisted.elapsedSeconds ?? 0),
      );
      const elapsedSeconds = calculateElapsedSeconds(
        accumulatedSeconds,
        persisted.status === 'running' ? runningSince : null,
      );
      const workMinutes = Math.max(1, Number(persisted.pomodoroWorkMinutes ?? 25));
      const breakMinutes = Math.max(1, Number(persisted.pomodoroBreakMinutes ?? 5));
      const pomodoro =
        persisted.mode === 'pomodoro'
          ? getPomodoroState(elapsedSeconds, workMinutes, breakMinutes)
          : {
              pomodoroRounds: Number(persisted.pomodoroRounds ?? 0),
              isOnBreak: false,
            };

      set({
        status: persisted.status,
        mode: persisted.mode,
        selectedTheme: persisted.selectedTheme ?? null,
        startTime,
        runningSince: persisted.status === 'running' ? runningSince : null,
        accumulatedSeconds: persisted.status === 'running' ? accumulatedSeconds : elapsedSeconds,
        elapsedSeconds,
        pomodoroRounds: pomodoro.pomodoroRounds,
        isOnBreak: pomodoro.isOnBreak,
        pomodoroWorkMinutes: workMinutes,
        pomodoroBreakMinutes: breakMinutes,
      });
    } catch {
      await queueActiveFocusStorage(() =>
        AsyncStorage.removeItem(ACTIVE_FOCUS_KEY).then(() => undefined),
      );
    }
  },

  editSessionTheme: async (id, themeId, themeName) => {
    await updateSessionTheme(id, themeId, themeName);
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, themeId, themeName } : s)),
      todaySessions: state.todaySessions.map((s) =>
        s.id === id ? { ...s, themeId, themeName } : s,
      ),
    }));
  },

  editSessionTime: async (id, startTime, endTime, duration) => {
    await updateSessionTime(id, startTime, endTime, duration);
    await rescoreFocusSession(id, duration);
    await useGamificationStore.getState().refreshSummary();
    set((state) => {
      const updated = state.sessions.map((s) =>
        s.id === id ? { ...s, startTime, endTime, duration } : s,
      );
      const updatedSession = updated.find((s) => s.id === id);
      return {
        sessions: updated,
        todaySessions:
          updatedSession && dateOf(updatedSession.startTime) === dateOf(new Date().toISOString())
            ? [...state.todaySessions.filter((s) => s.id !== id), updatedSession]
            : state.todaySessions.filter((s) => s.id !== id),
      };
    });
  },

  fetchGeralThemeVisibility: async () => {
    try {
      const value = await AsyncStorage.getItem(GERAL_THEME_HIDDEN_KEY);
      set({ geralThemeHidden: value === 'true' });
    } catch {
      set({ geralThemeHidden: false });
    }
  },
  removeGeralTheme: async () => {
    try {
      await AsyncStorage.setItem(GERAL_THEME_HIDDEN_KEY, 'true');
    } catch {}

    const { selectedTheme, themes } = get();
    set({
      geralThemeHidden: true,
      selectedTheme: selectedTheme === null ? (themes[0] ?? null) : selectedTheme,
    });
  },
}));
