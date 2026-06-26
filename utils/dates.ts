const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysIso(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  return Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / MS_PER_DAY);
}

export function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}
