// Platform minigame: player costumes (transformations).
//
// The player can switch between four costumes (keys 1-4 or the on-screen buttons). Each costume has
// its own movement physics, hitbox and animation set. Costumes are unlocked by completing levels.
import { STEP_MS, fromFixed, scaleToStep } from './constants.js';

// Builds a costume physics record. All numeric inputs are 16.16 fixed-point values from the original data:
//   acc/vmax: ground acceleration and top speed, glid: speed above which turning makes the player skid,
//   bremse: skid braking, isAcc/isFrik: acceleration and friction on ice, hop: jump impulse,
//   hold: how many ms the jump button can be held for extra height, hb: hitbox width, h: hitbox height.
const makeCostumePhysics = (accel, maxSpeed, skidSpeed, brake, iceAccel, iceFriction, jumpSpeed, jumpHoldMs, hitboxWidth, height) => ({ acc: scaleToStep(accel), vmax: scaleToStep(maxSpeed), glid: scaleToStep(skidSpeed), bremse: scaleToStep(brake), isAcc: scaleToStep(iceAccel), isFrik: iceFriction / 65536, hop: scaleToStep(jumpSpeed), hold: jumpHoldMs, tyngde: fromFixed(67878 * STEP_MS >> 6), maxFald: fromFixed(424288), hb: fromFixed(hitboxWidth) / 2, h: fromFixed(height) });

// Per-costume unlock progress counters (index = number of levels completed; all zero in this port).
const levelsCompletedByCostumeCounter = new Array(20).fill(0);
// Which of the four costumes are available after `levelsDone` levels; costume 0 is always free,
// and everything is unlocked after level 11.
export function unlockedCostumes(levelsDone) {
  return [0, 1, 2, 3].map((costumeIndex) => costumeIndex === 0 || levelsDone > 11 || levelsCompletedByCostumeCounter[levelsDone] > costumeIndex - 1);
}

// Physics parameters of the four costumes.
export const COSTUMES = [makeCostumePhysics(23e3, 220840, 163e3, 4e4, 13e3, 64e3, -36e4, 266, 655360, 2031616), makeCostumePhysics(23e3, 380144, 2e5, 35e3, 13e3, 64e3, -232144, 133, 786432, 983040), makeCostumePhysics(23e3, 133840, 1e5, 15e3, 13e3, 64e3, -524288, 266, 393216, 2031616), makeCostumePhysics(5e3, 130304, 95e3, 1e4, 3e3, 64500, -2e5, 100, 1048576, 2031616)];
// The costume currently worn by the player (shared with the physics code).
export let activeCostume = COSTUMES[0];
export function setActiveCostume(costume) {
  activeCostume = costume;
}

// Animation id for each costume and player animation state:
// 0 idle, 1 walk, 2 ice slide, 3 jump up, 4 fall, 5 landing, 6 skid, 7 (unused), 8 hurt, 9 victory.
export const PLAYER_ANIM_IDS = [{ 0: 12805, 1: 12802, 2: 12802, 3: 12803, 4: 12804, 5: 12807, 6: 12806, 7: 12809, 8: 12808, 9: 12810 }, { 0: 12813, 1: 12811, 2: 12811, 3: 12815, 4: 12812, 5: 12817, 6: 12816, 7: 12814, 8: 12808, 9: 12810 }, { 0: 12820, 1: 12818, 2: 12818, 3: 12824, 4: 12819, 5: 12823, 6: 12822, 7: 12821, 8: 12808, 9: 12810 }, { 0: 12828, 1: 12826, 2: 12826, 3: 12831, 4: 12827, 5: 12830, 6: 12832, 7: 12829, 8: 12808, 9: 12810 }];
// Animation states that must play to the end before another animation may start.
export const UNINTERRUPTIBLE_ANIM_STATES = new Set([5, 7, 8, 9]);
