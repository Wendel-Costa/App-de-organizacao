export function localDateStr(date?: Date): string {
  const d = date ?? new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function dateOf(value: Date | string): string {
  return localDateStr(typeof value === 'string' ? new Date(value) : value);
}

export function localMinutesSinceMidnight(value: Date | string): number {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.getHours() * 60 + d.getMinutes();
}

export function localWeekStart(): string {
  const d = new Date();
  const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
  return localDateStr(new Date(d.setDate(diff)));
}

export function localWeekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  return localDateStr(new Date(d.setDate(diff)));
}

export function localMonthStart(): string {
  const d = new Date();
  return localDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function localMonthEnd(): string {
  const d = new Date();
  return localDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
