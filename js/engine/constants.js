// Top-left HUD is moved this many px to the left (original layout assumed a 1024px-wide screen centred in 1280).
export const HUD_SHIFT = 118;
// Main screen (hotel, map, menus, start screen) is 16:9. Minigames keep their original 1280x768 canvas and are centred.
export const MINIGAME_WIDTH = 1280, GAME_WIDTH = 1365, GAME_HEIGHT = 768, WIDTH_EXTRA = GAME_WIDTH - MINIGAME_WIDTH, LOADING_IMAGE_WIDTH = 1024, LOADING_IMAGE_SCALE = MINIGAME_WIDTH / LOADING_IMAGE_WIDTH;
// Where the loading/title artwork is drawn so that it fills a canvas of the given width.
export const backdropPlacement = (width) => {
  const s = width / LOADING_IMAGE_WIDTH;
  return { scale: s, y: GAME_HEIGHT - 718 * s };
};

// Minigames that have been converted to render at the full 16:9 width (others keep 1280 and are centred).
export const WIDE_MINIGAMES = new Set([5, 10, 11, 12]);
export const MINIGAME_OFFSET = Math.floor(WIDTH_EXTRA / 2);
