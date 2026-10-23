const MS_PER_DAY = 86_400_000;

/** How far ahead an event may be planned. */
export const MAX_HORIZON_DAYS = 1096;

/** Days since 1970-01-01 (UTC) for a validated YYYY-MM-DD string. */
export function epochDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function isoFromEpochDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Adds whole days to an ISO date and returns the new ISO date. */
export function addDays(iso: string, days: number): string {
  return isoFromEpochDay(epochDay(iso) + days);
}

export function todayEpochDay(now: Date): number {
  return Math.floor(now.getTime() / MS_PER_DAY);
}

/**
 * Returns an error message when the date cannot be planned, otherwise null.
 * One day of slack is allowed because the server clock is UTC while the user
 * may be a few hours behind it.
 */
export function checkEventDate(iso: string, today: number): string | null {
  const day = epochDay(iso);
  if (day < today - 1) return "Choose today or a future date";
  if (day > today + MAX_HORIZON_DAYS) return "Choose a date within the next three years";
  return null;
}
