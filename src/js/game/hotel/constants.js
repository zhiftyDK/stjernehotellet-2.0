// Shared constants and tiny helpers for the hotel simulation.
// (Field names in the game data stay Danish: etager = floors, gaester = guests,
// penge = money, leje = rent paid per stay, pris = price.)

// One simulation tick in milliseconds (~30 ticks per second).
export const TICK_MS = 33;

// Inclusive random integer between min and max.
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Buildable floor types: pris = extra build price on top of the base floor price,
// leje = money paid by a guest for staying on that floor type.
export const FLOOR_TYPES = {
  2: { pris: 0, leje: 24 },
  3: { pris: 200, leje: 32 },
  10: { pris: 2400, leje: 72 },
  4: { pris: 800, leje: 44 },
  9: { pris: 350, leje: 0 },
  5: { pris: 1200, leje: 52 },
  6: { pris: 1e3, leje: 48 },
  8: { pris: 0, leje: 0 },
};

// Base price of a new floor grows by 150 for every floor the hotel already has.
export const newFloorPrice = (floorCount) => 200 + (floorCount - 1) * 150;

// Time a freshly started floor spends under construction.
export const BUILD_TIME_MS = 12e3;

// Floor type that holds a restaurant (cafe) with kitchen and tables.
export const CAFE_FLOOR_TYPE = 9;

// Number of guests that fit on one regular floor.
export const GUESTS_PER_FLOOR = 4;

// Furniture type -> guest actions that furniture supports (action ids index guest animations).
export const FURNITURE_ACTIONS = { 0: [2], 3: [7], 18: [7], 1: [4], 5: [4], 9: [5], 10: [5], 12: [6], 13: [6], 8: [3], 11: [3] };

// [min, max] stay time of a normal guest (3 to 5 minutes).
export const STAY_DURATION_MS = [18e4, 3e5];

// The 13 VIP guests: pris = cost to invite, betaling = payment when they leave/collect,
// tid = how long they stay. All three grow linearly with the tier.
export const VIP_TIERS = Array.from({ length: 13 }, (_, tier) => ({
  pris: 500 + 300 * tier,
  betaling: 60 + 40 * tier,
  tid: (120 + 30 * tier) * 1e3,
}));
