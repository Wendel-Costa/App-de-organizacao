export interface TimeParts {
  hours: number;
  minutes: number;
}

export type TimePart = 'hour' | 'minute';

export function parseTimeValue(value: string): TimeParts | null {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return null;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

export function formatTimeValue(hours: number, minutes: number): string {
  const normalizedHours = ((Math.trunc(hours) % 24) + 24) % 24;
  const normalizedMinutes = ((Math.trunc(minutes) % 60) + 60) % 60;

  return `${String(normalizedHours).padStart(2, '0')}:${String(normalizedMinutes).padStart(2, '0')}`;
}

export function adjustTimePart(value: string, part: TimePart, amount: number): string {
  const current = parseTimeValue(value) ?? { hours: 0, minutes: 0 };

  if (part === 'hour') {
    return formatTimeValue(current.hours + amount, current.minutes);
  }

  return formatTimeValue(current.hours, current.minutes + amount);
}
