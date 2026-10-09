// Hotel simulation entry point. The implementation lives in ./hotel/*.js; this file
// holds the per-tick update that ties floors, guests, pets and restaurants together and
// re-exports the public API for the rest of the game.
//
// Naming of hotel state (Danish field names in the data): etager = floors, gaester = guests,
// penge = money, tid = game time, kam = camera, kd = pet data, kat = furniture catalog,
// hentet = money earned from guests, C = kitchen config, kendteGemt = VIPs restored from a save.
import { createPetEntry, awardPetAchievements, updatePet } from './pets.js';
import { tickFurnitureDeliveries, updateRestaurant } from './furniture-and-kitchen.js';
import { updateGifts } from './gifts.js';
import { TICK_MS, FURNITURE_ACTIONS } from './hotel/constants.js';
import { spawnGuestsOverTime, updateGuest } from './hotel/guests.js';
import { restoreSavedVips } from './hotel/vips.js';
import { floorTopEdgeY } from './hotel/floors.js';

// Public API (re-exported from the modules in ./hotel/).
export { VIP_TIERS, FLOOR_TYPES, newFloorPrice, randomInt } from './hotel/constants.js';
export { CAFE_FLOOR_TYPE } from './hotel/constants.js';
export { createHotel, hotelHeight, floorTopY, floorSprite, buyFloor, floorTopEdgeY, petFloorCost, buyPetFloor } from './hotel/floors.js';
export { guestAnimationIds, isGuestAnimationFinished, guestWalkStep, collectGuestPayment, greetGuest } from './hotel/guests.js';
export { isVipStaying, vipStatus } from './hotel/vips.js';
export { drawSpriteAt, createMoneyPopups } from './hotel/money-popups.js';
export { createSpriteYOffsetLookup } from './hotel/sprite-offset.js';
export { createRestaurantView } from './hotel/restaurant-view.js';
export { petPrice } from './hotel/floors.js';

// Whether the floor's pet is within (or near) the visible screen, to skip off-screen updates.
function isPetOnScreen(hotel, floor, floorIndex) {
  const data = hotel.data, pet = floor.kaeledyr && floor.kaeledyr.dyr;
  if (!pet || !hotel.kd) {
    return false;
  }
  const screenX = data.etage.x + hotel.kd.dyr.gulvDx + pet.x - hotel.kam.x, screenY = floorTopEdgeY(hotel, floorIndex) + hotel.kd.dyr.gulvDy - hotel.kam.y;
  return screenX > -100 && screenX < data.skaerm.bredde + 100 && screenY > -50 && screenY < data.skaerm.hoejde + 150;
}

// Restores a pet that was saved on a floor (floor.kaeledyrGemt): rebuilds its entry with the
// saved name, points, remaining ready-time and still-active goods.
function restoreSavedPet(hotel, floor) {
  const saved = floor.kaeledyrGemt;
  if (floor.kaeledyrGemt = null, !hotel.kd.dyr.film[saved.nr]) {
    return;
  }
  const entry = createPetEntry(hotel, saved.nr);
  if (saved.navn) {
    entry.dyr.navn = saved.navn;
  }
  entry.dyr.point = saved.point || 0;
  entry.dyr.klarTid = hotel.tid + Math.max(0, saved.klarRest || 0);
  entry.varer = (saved.varer || []).filter((item) => item.rest > 0).map((item) => ({ type: item.type, f: item.f, rest: item.rest, aktiv: false }));
  floor.kaeledyr = entry;
}

// One simulation tick: advances game time, restores saved VIPs, awards pet achievements
// (once per second), updates gifts, spawns guests, finishes floor construction, updates
// restaurants and pets, then updates every guest.
function tickHotel(hotel) {
  hotel.tid += TICK_MS;
  if (hotel.kendteGemt) {
    restoreSavedVips(hotel);
  }
  hotel.bedriftTid = (hotel.bedriftTid || 0) - TICK_MS;
  if (hotel.bedriftTid <= 0) {
    hotel.bedriftTid = 1e3;
    awardPetAchievements(hotel);
  }
  updateGifts(hotel);
  spawnGuestsOverTime(hotel);
  const guestSlots = hotel.etager.flatMap((floor, floorIndex) => floor.gaester.map((guest) => [floor, floorIndex, guest]));
  hotel.etager.forEach((floor, floorIndex) => {
    if (floor.status === "bygger") {
      floor.byggeTid -= TICK_MS;
      if (floor.byggeTid <= 0) {
        floor.status = "faerdig";
        floor.byggeTid = 0;
      }
      return;
    }
    if (floor.cafe) {
      updateRestaurant(hotel.C, floor.cafe, TICK_MS);
    }
    if (floor.kaeledyrGemt && hotel.kd) {
      restoreSavedPet(hotel, floor);
    }
    if (floor.kaeledyr) {
      updatePet(hotel, floor, FURNITURE_ACTIONS, isPetOnScreen(hotel, floor, floorIndex));
    }
  });
  for (const [floor, floorIndex, guest] of guestSlots) {
    updateGuest(hotel, floor, floorIndex, guest);
  }
}

// Advances the hotel by deltaMs of real time (capped at 250 ms) in fixed TICK_MS steps.
export function advanceHotel(hotel, deltaMs) {
  for (hotel.rest += Math.min(250, deltaMs); hotel.rest >= TICK_MS;) {
    hotel.rest -= TICK_MS;
    tickHotel(hotel);
    tickFurnitureDeliveries(hotel, TICK_MS);
  }
}
