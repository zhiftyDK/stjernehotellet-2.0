// Furniture catalogue and per-floor furniture layouts, plus the cafe kitchen (restaurant) game rules:
// dishes, stoves, tables, cooks and selling portions. Also holds the shared addMoney() coin helper.
//
// Furniture slot = { type, x, y, fast }: `type` is a furniture category (see FURNITURE_TYPE_NAMES),
// (x, y) is its position on the floor and `fast` means it is fixed (cannot be moved or replaced).

// Fixed layout coordinates on a floor (pixels).
// x of the elevator doors (also where guests stand to use the elevator).
export const ELEVATOR_X = 725;
// y of furniture standing on the floor (chairs, beds, tables ...).
export const FLOOR_ROW_Y = 307;
// y of the elevator doors.
export const ELEVATOR_DOOR_Y = 292;
// y of ceiling lamps.
export const CEILING_Y = 4;
// y of wall shelves on some floors.
export const SHELF_Y = 118;
// x of the wall decoration on the right-hand wall.
export const WALL_DECOR_X = 886;
// y of the wall decoration on the right-hand wall.
export const WALL_DECOR_Y = 165;
// Display names of furniture categories, keyed by furniture type id.
export const FURNITURE_TYPE_NAMES = { 0: "Stole", 1: "Borde", 2: "Lamper", 3: "Senge", 4: "Elevatordøre", 5: "Småborde", 6: "Vægpynt", 7: "Tapet", 8: "Småting", 9: "Store ting", 10: "Musik og mere", 11: "Skranker og kommoder", 12: "Hylder", 13: "Billeder", 15: "Pengeskabe", 16: "Byggerammer", 17: "Stjerneplader", 18: "Kæledyrsting" };
// Creates a furniture slot description.
const furnitureSlot = (type, x, y, fixed = false) => ({ type, x, y, fast: fixed });
// Furniture every floor layout starts with: wallpaper and the (fixed) elevator doors.
const BASE_FURNITURE = [furnitureSlot(7, 0, 168), furnitureSlot(4, ELEVATOR_X, ELEVATOR_DOOR_Y, true)];
// x of the counter / drawers on floors that have one.
const COUNTER_X = 330;
// Furniture slots of each floor type (keyed by floor type id, see FLOOR_TYPES in hotel.js).
const FLOOR_FURNITURE_LAYOUTS = {
  7: [...BASE_FURNITURE, furnitureSlot(13, 170, 110), furnitureSlot(2, 150, CEILING_Y), furnitureSlot(2, 650, CEILING_Y), furnitureSlot(17, 400, 95, true), furnitureSlot(15, 110, FLOOR_ROW_Y, true), furnitureSlot(11, COUNTER_X, FLOOR_ROW_Y, true), furnitureSlot(0, 470, FLOOR_ROW_Y), furnitureSlot(5, 555, FLOOR_ROW_Y)],
  2: [...BASE_FURNITURE, furnitureSlot(13, 330, 110), furnitureSlot(2, 180, CEILING_Y), furnitureSlot(0, 170, FLOOR_ROW_Y), furnitureSlot(3, 330, FLOOR_ROW_Y), furnitureSlot(5, 460, FLOOR_ROW_Y), furnitureSlot(6, WALL_DECOR_X, WALL_DECOR_Y)],
  3: [...BASE_FURNITURE, furnitureSlot(13, 300, 110), furnitureSlot(12, 485, 130), furnitureSlot(2, 150, CEILING_Y), furnitureSlot(0, 150, FLOOR_ROW_Y), furnitureSlot(3, 300, FLOOR_ROW_Y), furnitureSlot(11, 485, FLOOR_ROW_Y)],
  10: [...BASE_FURNITURE, furnitureSlot(13, 330, 105), furnitureSlot(12, 500, SHELF_Y), furnitureSlot(2, 480, CEILING_Y), furnitureSlot(9, 150, FLOOR_ROW_Y), furnitureSlot(3, 330, FLOOR_ROW_Y), furnitureSlot(10, 490, FLOOR_ROW_Y), furnitureSlot(6, WALL_DECOR_X, WALL_DECOR_Y)],
  4: [...BASE_FURNITURE, furnitureSlot(13, 260, 100), furnitureSlot(2, 260, CEILING_Y), furnitureSlot(2, 460, CEILING_Y), furnitureSlot(0, 140, FLOOR_ROW_Y), furnitureSlot(1, 260, FLOOR_ROW_Y), furnitureSlot(0, 395, FLOOR_ROW_Y), furnitureSlot(6, WALL_DECOR_X, WALL_DECOR_Y)],
  9: [...BASE_FURNITURE, furnitureSlot(2, 300, CEILING_Y), furnitureSlot(2, 565, CEILING_Y)],
  5: [...BASE_FURNITURE, furnitureSlot(2, 300, CEILING_Y), furnitureSlot(2, 460, CEILING_Y), furnitureSlot(9, 160, FLOOR_ROW_Y), furnitureSlot(10, 330, FLOOR_ROW_Y), furnitureSlot(8, 450, FLOOR_ROW_Y), furnitureSlot(6, WALL_DECOR_X, WALL_DECOR_Y)],
  6: [...BASE_FURNITURE, furnitureSlot(13, 480, 100), furnitureSlot(2, 350, CEILING_Y), furnitureSlot(9, 160, FLOOR_ROW_Y), furnitureSlot(9, 290, FLOOR_ROW_Y), furnitureSlot(10, 420, FLOOR_ROW_Y), furnitureSlot(8, 530, FLOOR_ROW_Y)],
  8: [...BASE_FURNITURE, furnitureSlot(2, 125, CEILING_Y), furnitureSlot(18, 500, FLOOR_ROW_Y)]
};
// Price of furniture feature (variant) number `e`.
export const featurePrice = (featureIndex) => 25 + 5 * featureIndex;
// Time in ms until bought furniture is delivered.
export const DELIVERY_TIME_MS = 6e3;
// Fresh furniture list for a new floor of type `floorType`. feature -1 = nothing bought yet (fixed pieces start with feature 0); leveres = remaining delivery ms.
export function createFloorFurniture(floorType) {
  return (FLOOR_FURNITURE_LAYOUTS[floorType] || []).map((slot) => ({ ...slot, feature: slot.fast ? 0 : -1, leveres: 0 }));
}
// Placeholder film (animation clip) shown for furniture types that have no purchased feature yet:
// furnitureType -> [filmIndex in the placeholder category, x offset]. Used by the game screen when drawing empty slots.
export const EMPTY_SLOT_FILM_BY_TYPE = { 0: [2, 0], 1: [0, 0], 2: [4, 0], 3: [2, 0], 5: [0, 0], 6: [6, -21], 8: [0, 0], 9: [3, 0], 10: [2, 0], 11: [2, 0], 12: [5, 0], 13: [5, 0], 18: [0, 0] };
// Furniture category index (in the catalogue) that holds the placeholder films above.
export const EMPTY_SLOT_CATEGORY = 14;
// Buys feature `featureIndex` for a furniture piece if affordable and starts its delivery timer. Returns true on success.
export function buyFurnitureFeature(state, furniture, featureIndex) {
  const price = featurePrice(featureIndex);
  if (state.penge < price) {
    return false;
  }
  state.penge -= price;
  furniture.feature = featureIndex;
  furniture.leveres = DELIVERY_TIME_MS;
  return true;
}
// Counts down the delivery timers of all furniture in the hotel by `elapsedMs`.
export function tickFurnitureDeliveries(state, elapsedMs) {
  for (const floor of state.etager) {
    for (const furniture of floor.moebler || []) {
      if (furniture.leveres > 0) {
        furniture.leveres = Math.max(0, furniture.leveres - elapsedMs);
      }
    }
  }
}
// Sound id played when coins are received.
export const COIN_SOUND_ID = 976;
// Adds money to the hotel and queues the coin sound for positive amounts.
export function addMoney(state, amount) {
  if (amount >= 1) {
    state.lyde.push(COIN_SOUND_ID);
  }
  state.penge += amount;
}
// Names of the 23 dishes, indexed by dish number.
export const DISH_NAMES = ["Bacon og æg", "Salat", "Sandwich", "Frugtsalat", "Hotdog", "Spaghetti", "Burger", "Hummer", "Bøf med majs", "Pandekager", "Laks", "Fondue", "Sushi", "Omelet", "Dumplings", "Kylling", "Tacos", "Tærte", "Suppe", "Lagkage", "Pizza", "Paella", "Banana split"];
// Display names of the cooks (index 0 is the default cook).
export const COOK_NAMES = ["Grisene", "Kokkepigen", "Kok 3", "Kok 4", "Kok 5"];
// Static info for dish `e`: price to start, portions produced, price per portion, cooking time (ms) and required chef hats.
export const dishInfo = (dishIndex) => {
  const portions = 4 + dishIndex % 4, price = 20 + 10 * dishIndex;
  return { navn: DISH_NAMES[dishIndex], pris: price, portioner: portions, prisPrPortion: Math.round(price * 1.6 / portions), tid: (8 + 4 * dishIndex) * 1e3, huer: Math.floor(dishIndex / 2) };
};
// Total money earned by the cafe needed for kitchen levels 0..11 (level = number of chef hats, "huer").
export const KITCHEN_LEVEL_THRESHOLDS = [0, 60, 150, 300, 500, 800, 1200, 1700, 2400, 3200, 4200, 5500];
// Kitchen level (chef hats) for a cafe that has earned `e` kroner in total.
export const kitchenLevel = (earned) => KITCHEN_LEVEL_THRESHOLDS.filter((threshold) => earned >= threshold).length - 1;
// Maximum number of stoves allowed at a kitchen level.
export const maxStovesForLevel = (level) => Math.min(4, 1 + Math.floor(level / 2));
// Highest table upgrade index available at a kitchen level.
export const maxTableForLevel = (level) => Math.min(7, level);
// Price of the stove when `e` stoves are already owned.
export const stovePrice = (stoveCount) => 150 * stoveCount;
// Price of table upgrade number `e`.
export const tablePrice = (tableIndex) => 120 * tableIndex;
// Price to hire each cook (index 0 = the free default cooks).
export const COOK_PRICES = [0, 200, 400, 700, 1e3];
// Coins each cook produces per collection (0 = none).
export const COOK_INCOME = [0, 40, 70, 110, 160];
// Time between a cook's collectable incomes, in ms.
export const COOK_INTERVAL_MS = [0, 90, 120, 150, 180].map((seconds) => seconds * 1e3);
// Fresh cafe state: one empty stove, smallest table, default cook, nothing on the table, nothing earned yet.
// (komfurer = stoves, bord = table upgrade level, kok = cook, kokTid = ms until cook income is ready,
// paaBordet = dishes on plates, tjent = total earned.)
export function createRestaurant() {
  return { komfurer: [{ mad: null }], bord: 0, kok: 0, kokTid: COOK_INTERVAL_MS[0], paaBordet: [], tjent: 0 };
}
// True when the current cook produces income and its timer has run out.
export const isCookIncomeReady = (cafe) => COOK_INCOME[cafe.kok] > 0 && cafe.kokTid <= 0;
// Pays out the cook's income if ready and restarts the timer. Returns the amount (0 if not ready).
export function collectCookIncome(state, cafe) {
  if (!isCookIncomeReady(cafe)) {
    return 0;
  }
  const income = COOK_INCOME[cafe.kok];
  addMoney(state, income);
  state.hentet += income;
  cafe.kokTid = COOK_INTERVAL_MS[cafe.kok];
  return income;
}
// Screen position of plate `plateIndex` on table upgrade `tableIndex`; plates are laid out in rows of 3 (last row centred by the table's width).
export function plateSlotPosition(cafeData, tableIndex, plateIndex) {
  const tablePlates = cafeData.bord.pladser[tableIndex], row = Math.floor(plateIndex / 3);
  let x;
  if (row !== Math.floor(tablePlates / 3)) {
    x = cafeData.bord.placering[3][plateIndex % 3];
  } else {
    const offset = (tablePlates - 1) % 3;
    x = cafeData.bord.placering[offset + 1][plateIndex % 3];
  }
  return { x, y: cafeData.bord.yBase + row * cafeData.bord.dy };
}
// Index of the first unoccupied plate on the current table, or -1 when all are used.
const freePlateSlot = (cafeData, cafe) => {
  const plateCount = cafeData.bord.pladser[cafe.bord];
  for (let plate = 0; plate < plateCount; plate++) {
    if (!cafe.paaBordet.some((candidate) => candidate.tallerken === plate)) {
      return plate;
    }
  }
  return -1;
};
// Starts cooking dish `dishIndex` on a stove if the player can pay and the kitchen level allows it.
export function startDish(state, cafe, stoveIndex, dishIndex) {
  const dish = dishInfo(dishIndex);
  if (state.penge < dish.pris || kitchenLevel(cafe.tjent) < dish.huer) {
    return false;
  }
  state.penge -= dish.pris;
  cafe.komfurer[stoveIndex].mad = { ret: dishIndex, tilstand: 0, tid: 0 };
  return true;
}
// Player taps a stove. Dish state (tilstand): 0 raw -> 1 prepared -> 2 cooking (timed) -> 3 done -> served to a plate.
// Returns "tom" (empty), "ok", "fuldt" (no free plate) or "koger" (still cooking).
export function stoveAction(cafeData, cafe, stoveIndex) {
  const dish = cafe.komfurer[stoveIndex].mad;
  if (!dish) {
    return "tom";
  }
  if (dish.tilstand === 0) {
    dish.tilstand = 1;
    return "ok";
  }
  if (dish.tilstand === 1) {
    dish.tilstand = 2;
    dish.tid = dishInfo(dish.ret).tid;
    return "ok";
  }
  if (dish.tilstand === 3) {
    const plateSlot = freePlateSlot(cafeData, cafe);
    if (plateSlot < 0) {
      return "fuldt";
    }
    cafe.paaBordet.push({ ret: dish.ret, portioner: dishInfo(dish.ret).portioner, tallerken: plateSlot, fraKomfur: stoveIndex, flyt: 0 });
    cafe.komfurer[stoveIndex].mad = null;
    return "ok";
  }
  return "koger";
}
// Buys one more stove if the kitchen level allows it and the player can pay.
export function buyStove(state, cafe) {
  const stoveCount = cafe.komfurer.length;
  if (stoveCount >= maxStovesForLevel(kitchenLevel(cafe.tjent)) || state.penge < stovePrice(stoveCount)) {
    return false;
  }
  state.penge -= stovePrice(stoveCount);
  cafe.komfurer.push({ mad: null });
  return true;
}
// Upgrades to table `tableIndex` (must be a higher table, within kitchen level, and affordable).
export function upgradeTable(cafeData, state, cafe, tableIndex) {
  if (tableIndex <= cafe.bord || tableIndex > maxTableForLevel(kitchenLevel(cafe.tjent)) || state.penge < tablePrice(tableIndex)) {
    return false;
  }
  state.penge -= tablePrice(tableIndex);
  cafe.bord = tableIndex;
  return true;
}
// Hires cook `cookIndex` (if affordable and not already hired) and resets the income timer.
export function hireCook(state, cafe, cookIndex) {
  if (cookIndex === cafe.kok || state.penge < COOK_PRICES[cookIndex]) {
    return false;
  }
  state.penge -= COOK_PRICES[cookIndex];
  cafe.kok = cookIndex;
  cafe.kokTid = COOK_INTERVAL_MS[cookIndex];
  return true;
}
// Sells one portion of a dish that has finished sliding onto the table (the preferred plate if given, else a random one); returns the money earned or 0.
export function sellPortion(state, cafe, preferredPlate = null) {
  const ready = cafe.paaBordet.filter((candidate) => candidate.flyt >= 1);
  if (!ready.length) {
    return 0;
  }
  const plate = preferredPlate && ready.includes(preferredPlate) ? preferredPlate : ready[Math.floor(Math.random() * ready.length)], portionPrice = dishInfo(plate.ret).prisPrPortion;
  plate.portioner -= 1;
  if (plate.portioner <= 0) {
    cafe.paaBordet.splice(cafe.paaBordet.indexOf(plate), 1);
  }
  addMoney(state, portionPrice);
  state.hentet += portionPrice;
  cafe.tjent += portionPrice;
  return portionPrice;
}
// Per-tick cafe update: cook timer, stove cooking timers and the plate slide-in animation (flyt 0..1).
export function updateRestaurant(cafeData, cafe, elapsedMs) {
  if (cafe.kokTid === void 0) {
    cafe.kokTid = COOK_INTERVAL_MS[cafe.kok];
  }
  if (cafe.kokTid > 0) {
    cafe.kokTid = Math.max(0, cafe.kokTid - elapsedMs);
  }
  for (const stove of cafe.komfurer) {
    if (stove.mad && stove.mad.tilstand === 2) {
      stove.mad.tid -= elapsedMs;
      if (stove.mad.tid <= 0) {
        stove.mad.tid = 0;
        stove.mad.tilstand = 3;
      }
    }
  }
  for (const plate of cafe.paaBordet) {
    if (plate.flyt < 1) {
      plate.flyt = Math.min(1, plate.flyt + elapsedMs / (cafeData.mad.flyt * (1e3 / 30)));
    }
  }
}
