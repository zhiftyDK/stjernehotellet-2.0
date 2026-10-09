// Platform minigame: shared constants, fixed-point helpers and small math utilities.
//
// The original game logic is a port of a fixed-point engine: positions and speeds are stored as
// 16.16 fixed-point numbers in the level data and converted to floats with fromFixed().
// The simulation advances in fixed time steps of STEP_MS milliseconds.

// Simulation time step in milliseconds (the physics runs at ~29.4 Hz regardless of frame rate).
export const STEP_MS = 34;
// Logical (unscaled) screen size in pixels; the canvas is drawn at this resolution.
export const BASE_VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 640;
// Zoom factor between world units and screen pixels.
export const PIXEL_SCALE = 4;
// Size of one solid tile in world units.
export const TILE = 16;
export const BASE_VIEW_WIDTH_UNITS = BASE_VIEW_WIDTH / PIXEL_SCALE;
export const VIEW_HEIGHT_UNITS = VIEW_HEIGHT / PIXEL_SCALE;
// Sprite ids in the level/sprite tables are shifted by this offset.
export const SPRITE_ID_OFFSET = -4;
// One fixed-point unit (1/65536); used as a tiny nudge to keep entities out of walls.
export const FIXED_EPSILON = 1 / 65536;
// Converts a 16.16 fixed-point number to a float.
export const fromFixed = (fixed) => fixed / 65536;
// Converts a per-step fixed-point value so it is correct for STEP_MS (original data was tuned for 33 ms steps).
export const scaleToStep = (value) => fromFixed(value * STEP_MS / 33);

// Gravity (world units per step squared) and terminal fall speed, shared by player, enemies and dust.
export const GRAVITY = fromFixed(35e3);
export const MAX_FALL_SPEED = fromFixed(424288);
// Walking speed of ordinary enemies.
export const ENEMY_WALK_SPEED = scaleToStep(5e4);

// Player movement states (stored in level.tilst).
export const STATE_IDLE = 0; // standing still on a path
export const STATE_WALK = 1; // walking or sliding on a path
export const STATE_SKID = 2; // braking after quickly reversing direction
export const STATE_AIR = 3; // jumping or falling
export const STATE_DEAD = 4; // dying animation / waiting to respawn

// Smoothstep curve (3t^2 - 2t^3) scaled by `scale`; used for camera easing and moving platforms.
export const smoothstepScaled = (progress, scale) => progress * progress * (3 - 2 * progress) * scale;
// Clamps value into [min, max].
export const clamp = (value, min, max) => value < min ? min : value > max ? max : value;
// Axis-aligned box overlap test: box A (left,right,top,bottom) against box B.
export const boxesOverlap = (aLeft, aRight, aTop, aBottom, bLeft, bRight, bTop, bBottom) => aRight >= bLeft && aLeft <= bRight && aBottom >= bTop && aTop <= bBottom;
// Fixed-point multiply of a 16.16 value by a 16.16 fraction (result floored).
export const fixedMul = (value, fraction) => Math.floor(value * fraction / 65536);
