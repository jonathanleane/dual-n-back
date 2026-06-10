/**
 * Format an epoch ms as a local-date YYYY-MM-DD string.
 *
 * IMPORTANT: do NOT use `new Date(ms).toISOString().slice(0, 10)` for this.
 * toISOString() converts to UTC, which can land on a different date than
 * the user's local one. For users in UTC+10, a session finished at 9 AM
 * local on May 24 becomes "2026-05-23" in UTC — wrong day on the heatmap
 * and wrong day for streak math.
 */
export function localDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Local midnight (00:00:00.000 in the user's timezone) for an arbitrary date.
 * Useful for "is this in the future" comparisons that should respect local days.
 */
export function localMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
