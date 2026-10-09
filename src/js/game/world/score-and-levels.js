/**
 * Zoo minigame: spending, score and level logic.
 *
 * Every purchase in the zoo converts the price into score points; the score decides the player's level,
 * and the level decides which attractions / items / shops / wares are unlocked.
 * "zooConfig" is the static data table (state.Z), "zoo" the mutable zoo state.
 */

/** Score points earned for spending `price` coins (at least 1 point for any positive price). */
export const scoreForPrice = (zooConfig, price) => Math.trunc(price / zooConfig.regler.kronerPrPoint) || (price > 0 ? 1 : 0);

// Tries to spend `price` coins from the player; on success adds the matching score points. Returns whether the purchase went through.
export function spendAndScore(zoo, player, price) {
  if (player.brug(price)) {
    zoo.score += scoreForPrice(zoo.Z, price);
    return true;
  }
  return false;
}

// Level reached with the given score (index into the configured score thresholds, extended linearly beyond the list).
function levelForScore(zooConfig, score) {
  const thresholds = zooConfig.regler.niveauer;
  const thresholdCount = thresholds.length;
  // Past the last listed threshold: levels continue with the same step as the last gap (capped at 99).
  if (thresholds[thresholdCount - 1] <= score) {
    return Math.min(99, thresholdCount + Math.trunc((score - thresholds[thresholdCount - 1]) / (thresholds[thresholdCount - 1] - thresholds[thresholdCount - 2])));
  }
  for (let index = 0; index < thresholdCount - 1; index++) {
    if (thresholds[index] > score) {
      return index;
    }
  }
  return Math.min(99, thresholdCount - 1);
}

/** Score needed to reach `level` (inverse of levelForScore). */
function scoreForLevel(zooConfig, level) {
  const thresholds = zooConfig.regler.niveauer;
  const thresholdCount = thresholds.length;
  return level < 1
    ? 0
    : level <= thresholdCount
      ? thresholds[level - 1]
      : thresholds[thresholdCount - 1] + (level - thresholdCount) * (thresholds[thresholdCount - 1] - thresholds[thresholdCount - 2]);
}

/** Progress (0..1) of `score` between the current level and the next one, for the level bar. */
export function levelProgress(zooConfig, score) {
  const level = levelForScore(zooConfig, score);
  const levelStart = scoreForLevel(zooConfig, level);
  const levelEnd = scoreForLevel(zooConfig, level + 1);
  return Math.min(1, levelEnd > levelStart ? (score - levelStart) / (levelEnd - levelStart) : 0);
}

/** The zoo's current level. */
export const currentLevel = (zoo) => levelForScore(zoo.Z, zoo.score);

/** Current level capped to the last configured threshold (used for the paw-level display). */
export const cappedLevel = (zoo) => Math.min(levelForScore(zoo.Z, zoo.score), zoo.Z.regler.niveauer.length - 1);

/** The unlock-level table (config.regler.laas). */
export const lockRules = (zooConfig) => zooConfig.regler.laas;

/** Level required to buy an attraction of this type. */
export const attractionUnlockLevel = (zooConfig, type) => lockRules(zooConfig).sevaerdigheder[type] || 0;

/** Level required to buy a decoration item of this category/form. */
export const itemUnlockLevel = (zooConfig, category, form) =>
  lockRules(zooConfig).genstande[category] && lockRules(zooConfig).genstande[category][form] || 0;

/** Level required to buy a shop of this type. */
export const shopUnlockLevel = (zooConfig, type) => lockRules(zooConfig).boder[type] || 0;

/** Level required to sell a ware of this type/form. */
export const wareUnlockLevel = (zooConfig, type, form) =>
  lockRules(zooConfig).varer[type] && lockRules(zooConfig).varer[type][form] || 0;

/** True if something that needs `level` is still locked for the current zoo. */
export const isLockedAtLevel = (zoo, level) => level > currentLevel(zoo);
