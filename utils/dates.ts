const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Calendar date YYYY-MM-DD in the given IANA timezone (defaults to browser). */
export function todayIso(timeZone?: string): string {
  const zone = timeZone || browserTimeZone();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

export function formatInTimeZone(
  value: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(date);
}

export function formatClockInTimeZone(timeZone: string, now = new Date()): string {
  return formatInTimeZone(now, timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeInTimeZone(value: Date | string, timeZone: string): string {
  return formatInTimeZone(value, timeZone, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeZoneOptions(): Array<{ value: string; label: string }> {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [
          "UTC",
          "America/New_York",
          "America/Chicago",
          "America/Denver",
          "America/Los_Angeles",
          "America/Phoenix",
          "America/Anchorage",
          "Pacific/Honolulu",
          "Europe/London",
          "Europe/Paris",
          "Asia/Tokyo",
          "Australia/Sydney",
        ];

  const now = new Date();
  return zones
    .map((value) => {
      const offset = formatInTimeZone(now, value, {
        timeZoneName: "shortOffset",
        hour: "2-digit",
        minute: "2-digit",
      })
        .split(" ")
        .pop();
      const city = value.split("/").pop()?.replace(/_/g, " ") ?? value;
      return {
        value,
        label: `${city} (${offset}) — ${value}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
