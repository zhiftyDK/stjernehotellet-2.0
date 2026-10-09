// Platform minigame: sprite id tables and the animation helper.
//
// Sprite ids index into the platform sprite manifest (data/platform/manifest.json).
import { AnimationPlayer } from '../../engine/animation.js';
import { SPRITE_ID_OFFSET } from './constants.js';

// Dust puff frames emitted when the fourth costume lands/brakes.
export const DUST_SPRITES = [300, 301, 302, 303, 304].map((c) => c - 4);
// Tile sprites for ordinary platforms (left cap, right cap, 4 middle variants).
export const PLATFORM_TILE_SPRITES = [392, 393, 394, 395, 390, 391].map((c) => c + SPRITE_ID_OFFSET);
// Middle piece of rope-bridge style moving platforms.
export const PLATFORM_ROPE_SPRITE = 396 + SPRITE_ID_OFFSET;
// Ice overlay sprites placed on top of icy platforms.
export const ICE_SPRITES = [358, 359, 360, 361, 362, 363, 364, 365, 366, 367].map((c) => c + SPRITE_ID_OFFSET);
// Static enemy / hazard sprites (alive, dead, projectile, spikes by orientation).
export const ENEMY_SPRITES = { gaaerDoed: 281 + SPRITE_ID_OFFSET, hopperDoed: 282 + SPRITE_ID_OFFSET, hopperFald: 283 + SPRITE_ID_OFFSET, kaster: [285, 286, 287].map((c) => c + SPRITE_ID_OFFSET), skud: 288 + SPRITE_ID_OFFSET, popper: [291, 292, 293].map((c) => c + SPRITE_ID_OFFSET), pig: { 0: 294 + SPRITE_ID_OFFSET, 1: 295 + SPRITE_ID_OFFSET, 2: 297 + SPRITE_ID_OFFSET, 3: 296 + SPRITE_ID_OFFSET } };

// Creates a fresh player for the animation with id `animId`, or null if it does not exist.
export function createAnimation(animations, animId) {
  const animData = animations.get(animId);
  if (!animData) {
    return null;
  }
  const player = new AnimationPlayer(animData);
  player.advance(0);
  return player;
}
