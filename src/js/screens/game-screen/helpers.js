// Tiny pure helpers shared by the game-screen modules.

/** Converts an [r, g, b] array (0-255) to a CSS `rgb(...)` colour string. */
export const rgbString = (color) => `rgb(${color[0]},${color[1]},${color[2]})`;

/** Random integer in the inclusive range [min, max]. */
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
