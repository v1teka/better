/**
 * Wall-clock math for the practice timer (pure, no React Native imports)
 */

// Finishing noticed later than this means the app was suspended at the end:
// the notification has already rung, so the screen should not ring again.
export const LATE_FINISH_MS = 1500;

export function secondsLeftAt(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function isLateFinish(endAt: number, now: number): boolean {
  return now - endAt > LATE_FINISH_MS;
}
