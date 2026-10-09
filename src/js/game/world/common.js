/**
 * Zoo minigame: small shared helpers (fixed tick length, clock, random numbers, time formatting).
 */

/** Length of one fixed simulation step in milliseconds (about 30 steps per second). */
export const TICK_MS = 33;

/** Current wall-clock time in whole seconds (all build/payout timers are stored in seconds). */
export const nowSeconds = () => Math.floor(Date.now() / 1e3);

/** Random integer in [min, max], both inclusive. */
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Formats a number of seconds as "S", "M:SS" or "H:MM:SS" (largest unit not padded). */
export function formatDuration(totalSeconds) {
  const hours = Math.trunc(totalSeconds / 3600);
  const secondsAfterHours = totalSeconds - hours * 3600;
  const minutes = Math.trunc(secondsAfterHours / 60);
  const seconds = secondsAfterHours - minutes * 60;
  const pad2 = (value) => value <= 9 ? `0${value}` : String(value);
  return totalSeconds >= 3600
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : secondsAfterHours >= 60
      ? `${minutes}:${pad2(seconds)}`
      : String(seconds);
}
