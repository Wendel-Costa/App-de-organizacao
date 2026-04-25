import { create } from 'zustand';
import type { FocusSession, FocusTheme, FocusMode, FocusStatus } from '@/types/focus.types';
import {
  getAllSessions,
  getAllThemes,
  createSession,
  createTheme,
  deleteSession,
  deleteTheme,
  getSessionsForDate,
} from '@/database/queries/focus.queries';

interface FocusState {
  sessions: FocusSession[];
  themes: FocusTheme[];

  status: FocusStatus;
  mode: FocusMode;
  selectedTheme: FocusTheme | null;
  startTime: Date | null;
  elapsedSeconds: number;

  pomodoroRounds: number;
  isOnBreak: boolean;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;

  fetchSessions: () => Promise<void>;
  fetchThemes: () => Promise<void>;
  addSession: (data: Omit<FocusSession, 'id' | 'createdAt'>) => Promise<void>;
  addTheme: (name: string, color?: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  removeTheme: (id: string) => Promise<void>;
  getTodaySessions: () => Promise<FocusSession[]>;

  setMode: (mode: FocusMode) => void;
  setSelectedTheme: (theme: FocusTheme | null) => void;
  startFocus: () => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => Promise<void>;
  tickTimer: () => void;
  setPomodoroConfig: (workMinutes: number, breakMinutes: number) => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  sessions: [],
  themes: [],

  status: 'idle',
  mode: 'free',
  selectedTheme: null,
  startTime: null,
  elapsedSeconds: 0,

  pomodoroRounds: 0,
  isOnBreak: false,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,

  fetchSessions: async () => {
    const sessions = await getAllSessions();
    set({ sessions });
  },

  fetchThemes: async () => {
    const themes = await getAllThemes();
    set({ themes });
  },

  addSession: async (data) => {
    const session = await createSession(data);
    set((state) => ({ sessions: [session, ...state.sessions] }));
  },

  addTheme: async (name, color) => {
    const theme = await createTheme(name, color);
    set((state) => ({ themes: [...state.themes, theme] }));
  },

  removeSession: async (id) => {
    await deleteSession(id);
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) }));
  },

  removeTheme: async (id) => {
    await deleteTheme(id);
    set((state) => ({ themes: state.themes.filter((t) => t.id !== id) }));
  },

  getTodaySessions: async () => {
    const today = new Date().toISOString().split('T')[0];
    return getSessionsForDate(today);
  },

  setMode: (mode) => set({ mode }),

  setSelectedTheme: (theme) => set({ selectedTheme: theme }),

  startFocus: () => {
    set({
      status: 'running',
      startTime: new Date(),
      elapsedSeconds: 0,
      pomodoroRounds: 0,
      isOnBreak: false,
    });
  },

  pauseFocus: () => set({ status: 'paused' }),

  resumeFocus: () => set({ status: 'running' }),

  tickTimer: () => {
    const {
      status,
      mode,
      elapsedSeconds,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
      isOnBreak,
      pomodoroRounds,
    } = get();

    if (status !== 'running') return;

    const newElapsed = elapsedSeconds + 1;

    if (mode === 'pomodoro') {
      const workSeconds = pomodoroWorkMinutes * 60;
      const breakSeconds = pomodoroBreakMinutes * 60;
      const cycleSeconds = isOnBreak ? breakSeconds : workSeconds;

      if (newElapsed % cycleSeconds === 0) {
        if (!isOnBreak) {
          set({ elapsedSeconds: newElapsed, isOnBreak: true, pomodoroRounds: pomodoroRounds + 1 });
        } else {
          set({ elapsedSeconds: newElapsed, isOnBreak: false });
        }
        return;
      }
    }

    set({ elapsedSeconds: newElapsed });
  },

  stopFocus: async () => {
    const { startTime, elapsedSeconds, mode, selectedTheme, pomodoroRounds } = get();
    if (!startTime || elapsedSeconds < 10) {
      set({ status: 'idle', startTime: null, elapsedSeconds: 0 });
      return;
    }

    const endTime = new Date();
    const duration = Math.floor(elapsedSeconds / 60);

    await get().addSession({
      themeId: selectedTheme?.id,
      themeName: selectedTheme?.name,
      mode,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      isManual: false,
      pomodoroRounds: mode === 'pomodoro' ? pomodoroRounds : undefined,
    });

    set({
      status: 'idle',
      startTime: null,
      elapsedSeconds: 0,
      pomodoroRounds: 0,
      isOnBreak: false,
    });
  },

  setPomodoroConfig: (workMinutes, breakMinutes) =>
    set({ pomodoroWorkMinutes: workMinutes, pomodoroBreakMinutes: breakMinutes }),
}));
