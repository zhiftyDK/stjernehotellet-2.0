/**
 * Tiny random helpers for the Popstars minigame.
 */
// Random integer in [min, max] (both inclusive).
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
// Random integer in [min, max] (both inclusive); identical to randomInt, kept as a separate
// name because it was used by different parts of the original code.
export const randomBetween = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
