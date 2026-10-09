// Guest simulation: spawning, walking in from the street, riding the elevator,
// staying on a floor (wandering, using furniture, eating), paying and leaving.
//
// Guest lifecycle (guest.fase): "ind" (arriving) -> "ophold" (staying) -> "hjem" (going
// home to the elevator) -> "ud" (walking out). VIP guests (guest.vip = tier) stay
// longer, pay more and never leave. Guests live in floor.gaester; guest.til is the
// floor index they are heading to.
import { PET_FLOOR_TYPE } from '../pets.js';
import { plateSlotPosition, sellPortion, ELEVATOR_X, addMoney } from '../furniture-and-kitchen.js';
import { pointLevel } from '../../render/canvas-helpers.js';
import { Tween } from '../../engine/tween.js';
import { TICK_MS, randomInt, FLOOR_TYPES, GUESTS_PER_FLOOR, FURNITURE_ACTIONS, STAY_DURATION_MS, VIP_TIERS } from './constants.js';

// Switches a guest to animation `anim` (0 idle, 1 walking, 8 eating; 2-7 are furniture and
// reaction animations, see FURNITURE_ACTIONS). Resets the animation clock, raises the guest
// (guest.loeft) for anim 2 (sitting), sets facing, and counts a user on the floor for anim 7.
function startGuestAnimation(hotel, floor, guest, anim) {
  guest.anim = anim;
  guest.animTid = 0;
  guest.loeft.mod(anim === 2 ? hotel.data.gaest.sidY : 0);
  if (anim === 2 || anim === 7) {
    guest.spejl = false;
  } else if (anim === 4) {
    guest.spejl = true;
  }
  if (anim === 7) {
    floor.aktiv = (floor.aktiv || 0) + 1;
  }
}

// Frees the furniture piece the guest was using (if any).
function releaseFurniture(floor, guest) {
  if (guest.moebel >= 0 && floor.moebler[guest.moebel]) {
    floor.moebler[guest.moebel].iBrug = false;
  }
  guest.moebel = -1;
}

// Animation ids (one per animation state) for a guest: VIPs have their own set,
// normal guests use the set of their look (guest.art).
export const guestAnimationIds = (hotel, guest) => guest.vip != null ? hotel.data.vip.film[guest.vip] : hotel.data.gaesterAnims[guest.art];

// True once the guest's current animation has played for its full duration (default 1 s).
export const isGuestAnimationFinished = (hotel, guest) => {
  const animId = guestAnimationIds(hotel, guest)[guest.anim], durationMs = hotel.filmTid && hotel.filmTid.get(animId) || 1e3;
  return guest.animTid >= durationMs;
};

// Walking speed in pixels per tick (0 while still fading in; capped at 16).
export const guestWalkStep = (hotel, guest) => guest.alfa.v < 255 ? 0 : Math.min(16, Math.trunc(hotel.data.gaest.fart * TICK_MS / 1e3));

// One tick of a guest who is staying on a floor. Idle guests randomly decide to
// walk somewhere, go to eat a ready dish at the cafe, or use a free piece of furniture
// that supports a random action; walking guests step towards guest.maal; other
// animations run to completion (eating sells the portion).
function updateStayingGuest(hotel, floor, guest) {
  const data = hotel.data, guestCfg = data.gaest;
  if (guest.animTid += TICK_MS, guest.anim === 0) {
    if (guest.venter >= 1) {
      startGuestAnimation(hotel, floor, guest, guest.venter);
      guest.venter = -1;
      return;
    }
    if (guest.vilSpise && floor.cafe && randomInt(0, 200) === 0) {
      const servedDishes = floor.cafe.paaBordet.filter((dish) => dish.flyt >= 1);
      if (!servedDishes.length) {
        return;
      }
      guest.mad = servedDishes[randomInt(0, servedDishes.length - 1)];
      guest.maal = plateSlotPosition(hotel.C, floor.cafe.bord, guest.mad.tallerken).x;
      guest.venter = 8;
      startGuestAnimation(hotel, floor, guest, 1);
      return;
    }
    if (randomInt(0, 150) === 0) {
      guest.maal = data.doerDx + randomInt(0, data.etage.bredde);
      guest.vilSpise = !!floor.cafe;
      startGuestAnimation(hotel, floor, guest, 1);
      return;
    }
    if (randomInt(0, 150) === 0) {
      const actions = guestCfg.handlinger.filter((actionId) => actionId !== 8), action = actions[randomInt(0, actions.length - 1)], candidates = floor.moebler.map((_furniture, furnitureIndex) => furnitureIndex).filter((index) => {
        const furniture = floor.moebler[index];
        return !furniture.iBrug && furniture.feature >= 0 && (FURNITURE_ACTIONS[furniture.type] || []).includes(action);
      });
      if (!candidates.length) {
        return;
      }
      guest.moebel = candidates[randomInt(0, candidates.length - 1)];
      floor.moebler[guest.moebel].iBrug = true;
      let targetX = floor.moebler[guest.moebel].x + (action === 2 || action === 4 ? guestCfg.sidX : 0);
      targetX = Math.max(data.doerDx, Math.min(data.doerDx + data.etage.bredde, targetX));
      guest.maal = targetX;
      guest.venter = action;
      startGuestAnimation(hotel, floor, guest, 1);
    }
    return;
  }
  if (guest.anim === 1) {
    const dx = guest.maal - guest.x;
    if (Math.abs(dx) <= 3) {
      startGuestAnimation(hotel, floor, guest, 0);
      return;
    }
    guest.spejl = dx < 0;
    guest.x += Math.sign(dx) * Math.min(guestWalkStep(hotel, guest), Math.abs(dx));
    return;
  }
  if (isGuestAnimationFinished(hotel, guest)) {
    if (guest.anim === 8 && floor.cafe) {
      sellPortion(hotel, floor.cafe, guest.mad);
    }
    guest.mad = null;
    releaseFurniture(floor, guest);
    startGuestAnimation(hotel, floor, guest, 0);
  }
}

// Marks activity at a floor's elevator door (counter used for the door animation).
const markDoorUsed = (floor) => {
  floor.doer = (floor.doer || 0) + 1;
};

// All guests in the hotel, regardless of floor.
export const allGuests = (hotel) => hotel.etager.flatMap((floor) => floor.gaester);

// Guest is arriving or staying (not leaving).
const isGuestInside = (guest) => guest.fase === "ind" || guest.fase === "ophold";

// Guest slots of a floor: only finished, non-lobby, non-pet floors take guests.
export const floorCapacity = (hotel, floor) => floor && floor.status === "faerdig" && floor.type >= 2 && floor.type !== hotel.data.lobby && floor.type !== PET_FLOOR_TYPE ? GUESTS_PER_FLOOR : 0;

// Number of inside guests whose destination is the given floor index.
export const guestsHeadingToFloor = (hotel, floorIndex) => allGuests(hotel).filter((guest) => guest.til === floorIndex && isGuestInside(guest)).length;

// Rooms still free across the whole hotel.
export const freeRooms = (hotel) => hotel.etager.reduce((total, floor, floorIndex) => total + floorCapacity(hotel, floor) - guestsHeadingToFloor(hotel, floorIndex), 0);

// Picks a random floor index that still has a free slot (0 = lobby if none).
function pickFloorWithFreeRoom(hotel) {
  const candidates = hotel.etager.map((_floor, index) => index).filter((index) => floorCapacity(hotel, hotel.etager[index]) > guestsHeadingToFloor(hotel, index));
  return candidates.length ? candidates[randomInt(0, candidates.length - 1)] : 0;
}

// Picks a guest type by random weights; higher reputation (points level) unlocks other weight rows.
function pickGuestType(hotel) {
  const typeTable = hotel.data.gaest.typer, weights = typeTable[Math.min(pointLevel(hotel.hentet).antal, typeTable.length - 1)];
  let roll = randomInt(0, 99);
  for (let typeIndex = 0; typeIndex < weights.length; typeIndex++) {
    if (roll -= weights[typeIndex], roll < 1) {
      return typeIndex;
    }
  }
  return 0;
}

// X coordinate just outside the right edge of the world, where guests arrive and leave.
const offscreenX = (hotel) => hotel.data.doerDx + hotel.data.verdensBredde + hotel.data.gaest.bredde;

// Creates a guest at the lobby (floor 0), off-screen to the right, already walking in.
// entryDelayMs staggers several guests arriving in one batch; vipTier makes it a VIP.
export function spawnGuest(hotel, entryDelayMs, vipTier = null) {
  const guestCfg = hotel.data.gaest, typeIndex = pickGuestType(hotel), variants = guestCfg.varianter[typeIndex] || [typeIndex];
  hotel.gaestId = (hotel.gaestId || 0) + 1;
  const guest = { id: hotel.gaestId, art: variants[randomInt(0, variants.length - 1)], vip: vipTier, til: pickFloorWithFreeRoom(hotel), fase: "ind", x: offscreenX(hotel) + Math.trunc(guestCfg.fart * entryDelayMs / 1e3), anim: 1, animTid: 0, spejl: true, venter: -1, moebel: -1, iElevator: false, alfa: new Tween(0, guestCfg.alfaBilleder), loeft: new Tween(0, guestCfg.loeftBilleder) };
  guest.alfa.mod(255);
  hotel.etager[0].gaester.push(guest);
  return guest;
}

// Ordering of new guests: every guestCfg.bestilHver ms, spawn a batch limited by the
// remaining capacity. A waiting VIP (hotel.vipVenter) goes first, as soon as a room is free.
export function spawnGuestsOverTime(hotel) {
  const guestCfg = hotel.data.gaest;
  if (hotel.gaestTid -= TICK_MS, hotel.gaestTid > 0) {
    return;
  }
  if (hotel.gaestTid = guestCfg.bestilHver, hotel.vipVenter != null) {
    if (freeRooms(hotel) >= 1) {
      spawnGuest(hotel, 0, hotel.vipVenter);
      hotel.vipVenter = null;
    }
    return;
  }
  const capacity = GUESTS_PER_FLOOR * hotel.etager.length, insideCount = allGuests(hotel).filter(isGuestInside).length;
  if (insideCount >= capacity) {
    return;
  }
  const batchSize = Math.min(capacity - insideCount - 1, guestCfg.hoejstPrBestilling, freeRooms(hotel) - 1);
  for (let index = 0; index < batchSize; index++) {
    spawnGuest(hotel, index * guestCfg.bestilHver);
  }
}

// Moves a guest from one floor's guest list to the floor with index toIndex.
function moveGuestToFloor(hotel, guest, fromFloor, toIndex) {
  fromFloor.gaester.splice(fromFloor.gaester.indexOf(guest), 1);
  hotel.etager[toIndex].gaester.push(guest);
}

// Finishes a guest's arrival: leaves the elevator, joins the destination floor (or turns
// back if it is not finished) and begins the stay with a random stay time and its rent.
// VIPs use their tier's stay time and payment instead.
export function admitGuest(hotel, fromFloor, fromIndex, guest) {
  const data = hotel.data;
  guest.iElevator = false;
  guest.alfa.mod(255);
  guest.loeft.mod(0);
  const targetFloor = hotel.etager[guest.til];
  if (!targetFloor || targetFloor.status !== "faerdig") {
    guest.fase = "ud";
    guest.spejl = false;
    return;
  }
  if (fromIndex !== guest.til) {
    moveGuestToFloor(hotel, guest, fromFloor, guest.til);
    markDoorUsed(targetFloor);
  }
  Object.assign(guest, { fase: "ophold", venter: 1, maal: data.doerDx + randomInt(0, data.etage.bredde), opholdTid: randomInt(STAY_DURATION_MS[0], STAY_DURATION_MS[1]), vilSpise: !!targetFloor.cafe, betaler: FLOOR_TYPES[targetFloor.type] ? FLOOR_TYPES[targetFloor.type].leje : 0 });
  if (guest.vip != null) {
    Object.assign(guest, { opholdTid: VIP_TIERS[guest.vip].tid, betaler: VIP_TIERS[guest.vip].betaling });
  }
  startGuestAnimation(hotel, targetFloor, guest, 0);
}

// One tick of any guest, by phase: staying guests run their behaviour; arriving guests
// walk to the elevator, fade out, ride it and are admitted; going-home guests do the
// same towards the lobby; leaving guests walk off-screen and are removed.
export function updateGuest(hotel, floor, floorIndex, guest) {
  const guestCfg = hotel.data.gaest;
  if (guest.alfa.trin(), guest.loeft.trin(), guest.fase === "ophold") {
    guest.opholdTid -= TICK_MS;
    updateStayingGuest(hotel, floor, guest);
    if (guest.opholdTid <= 0 && !guest.klar) {
      guest.klar = true;
    }
    return;
  }
  guest.animTid += TICK_MS;
  const step = guestWalkStep(hotel, guest);
  if (guest.fase === "ind") {
    if (guest.x > ELEVATOR_X) {
      guest.spejl = true;
      guest.x -= step;
      return;
    }
    if (!guest.iElevator && floorIndex !== guest.til) {
      guest.iElevator = true;
      guest.alfa.mod(0);
      guest.loeft.mod(guestCfg.elevatorLoeft);
      markDoorUsed(floor);
      return;
    }
    if (guest.alfa.v > 0 && (guest.iElevator || floorIndex !== guest.til)) {
      return;
    }
    admitGuest(hotel, floor, floorIndex, guest);
    return;
  }
  if (guest.fase === "hjem") {
    if (guest.x < ELEVATOR_X ? !guest.spejl : guest.spejl) {
      guest.spejl = guest.x > ELEVATOR_X;
      guest.x += guest.spejl ? -step : step;
      return;
    }
    if (!guest.iElevator) {
      guest.iElevator = true;
      guest.alfa.mod(0);
      guest.loeft.mod(guestCfg.elevatorLoeft);
      markDoorUsed(floor);
      return;
    }
    if (guest.alfa.v > 0) {
      return;
    }
    guest.iElevator = false;
    guest.alfa.mod(255);
    guest.loeft.mod(0);
    if (floorIndex !== 0) {
      moveGuestToFloor(hotel, guest, floor, 0);
      markDoorUsed(hotel.etager[0]);
    }
    guest.fase = "ud";
    return;
  }
  if (guest.spejl = false, guest.x > offscreenX(hotel)) {
    floor.gaester.splice(floor.gaester.indexOf(guest), 1);
    return;
  }
  guest.x += step;
}

// Collects payment from a guest who is ready (guest.klar). Normal guests pay and head home;
// VIPs pay and restart their stay timer. Returns the amount paid (0 if not ready).
export function collectGuestPayment(hotel, floor, guest) {
  if (guest.klar) {
    guest.klar = false;
    return guest.vip != null ? (guest.opholdTid = VIP_TIERS[guest.vip].tid, addMoney(hotel, guest.betaler), hotel.hentet += guest.betaler, guest.betaler) : (releaseFurniture(floor, guest), addMoney(hotel, guest.betaler), hotel.hentet += guest.betaler, Object.assign(guest, { fase: "hjem", venter: -1 }), startGuestAnimation(hotel, floor, guest, 1), guest.spejl = guest.x > ELEVATOR_X, guest.betaler);
  }
  return 0;
}

// Called when the player clicks a staying guest: stops the guest and plays the reaction.
// For a VIP, also sets how long the VIP's info bubble is shown and returns true.
export function greetGuest(hotel, floor, guest) {
  if (guest.fase !== "ophold" || guest.klar) {
    return false;
  }
  guest.spejl = false;
  if (guest.venter < 0) {
    startGuestAnimation(hotel, floor, guest, 3);
  }
  return guest.vip != null ? (guest.visTil = hotel.tid + hotel.data.vip.visTid * 1e3, true) : false;
}
