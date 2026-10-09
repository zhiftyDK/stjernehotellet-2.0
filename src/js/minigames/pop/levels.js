/**
 * Level / ranking maths for the Popstars minigame (all based on a list of point thresholds).
 */
// Level (index of the first threshold above `points`); beyond the table the last step size is extrapolated, capped at 99.
export function levelFromPoints(thresholds, points) {
  const count = thresholds.length;
  const last = thresholds[count - 1];
  if (last <= points) {
    return Math.min(99, count + Math.trunc((points - last) / (last - thresholds[count - 2])));
  }
  for (let idx = 0; idx < count - 1; idx++) {
    if (thresholds[idx] > points) {
      return idx;
    }
  }
  return count - 1;
}
// Points needed to reach `level` (extrapolates linearly past the end of the table).
export function levelThreshold(thresholds, level) {
  const count = thresholds.length;
  return level < 1 ? 0 : level <= count ? thresholds[level - 1] : thresholds[count - 1] + (thresholds[count - 1] - thresholds[count - 2]) * (level - count);
}
// Progress 0..1 inside the current level.
export function levelProgress(thresholds, points) {
  const level = levelFromPoints(thresholds, points);
  const floor = levelThreshold(thresholds, level);
  const ceiling = levelThreshold(thresholds, level + 1);
  return Math.min(1, (points - floor) / (ceiling - floor));
}
// Position (0 = best) the player gets on the fake leaderboard for a score; 50 entries in total.
export const leaderboardRank = (points) => Math.max(0, 50 - Math.trunc((points + 15) / 15));
