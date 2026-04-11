export type FocusMode = 'free' | 'pomodoro';

export type FocusStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface FocusTheme {
  id: string;
  name: string;
  color?: string;
}

export interface FocusSession {
  id: string;
  themeId?: string;
  themeName?: string;
  mode: FocusMode;
  startTime: string;
  endTime: string;
  duration: number; //em minutos
  isManual: boolean;
  pomodoroRounds?: number;
  createdAt: string;
}
