export const br = 725, Me = 307, og = 292, ct = 4, sg = 118, ji = 886, Ti = 165, FURNITURE_TYPE_NAMES = { 0: "Stole", 1: "Borde", 2: "Lamper", 3: "Senge", 4: "Elevatordøre", 5: "Småborde", 6: "Vægpynt", 7: "Tapet", 8: "Småting", 9: "Store ting", 10: "Musik og mere", 11: "Skranker og kommoder", 12: "Hylder", 13: "Billeder", 15: "Pengeskabe", 16: "Byggerammer", 17: "Stjerneplader", 18: "Kæledyrsting" }, furnitureSlot = (e, t, n, r = false) => ({ type: e, x: t, y: n, fast: r }), qt = [furnitureSlot(7, 0, 168), furnitureSlot(4, br, og, true)], ug = 330, FLOOR_FURNITURE_LAYOUTS = { 7: [...qt, furnitureSlot(13, 170, 110), furnitureSlot(2, 150, ct), furnitureSlot(2, 650, ct), furnitureSlot(17, 400, 95, true), furnitureSlot(15, 110, Me, true), furnitureSlot(11, ug, Me, true), furnitureSlot(0, 470, Me), furnitureSlot(5, 555, Me)], 2: [...qt, furnitureSlot(13, 330, 110), furnitureSlot(2, 180, ct), furnitureSlot(0, 170, Me), furnitureSlot(3, 330, Me), furnitureSlot(5, 460, Me), furnitureSlot(6, ji, Ti)], 3: [...qt, furnitureSlot(13, 300, 110), furnitureSlot(12, 485, 130), furnitureSlot(2, 150, ct), furnitureSlot(0, 150, Me), furnitureSlot(3, 300, Me), furnitureSlot(11, 485, Me)], 10: [...qt, furnitureSlot(13, 330, 105), furnitureSlot(12, 500, sg), furnitureSlot(2, 480, ct), furnitureSlot(9, 150, Me), furnitureSlot(3, 330, Me), furnitureSlot(10, 490, Me), furnitureSlot(6, ji, Ti)], 4: [...qt, furnitureSlot(13, 260, 100), furnitureSlot(2, 260, ct), furnitureSlot(2, 460, ct), furnitureSlot(0, 140, Me), furnitureSlot(1, 260, Me), furnitureSlot(0, 395, Me), furnitureSlot(6, ji, Ti)], 9: [...qt, furnitureSlot(2, 300, ct), furnitureSlot(2, 565, ct)], 5: [...qt, furnitureSlot(2, 300, ct), furnitureSlot(2, 460, ct), furnitureSlot(9, 160, Me), furnitureSlot(10, 330, Me), furnitureSlot(8, 450, Me), furnitureSlot(6, ji, Ti)], 6: [...qt, furnitureSlot(13, 480, 100), furnitureSlot(2, 350, ct), furnitureSlot(9, 160, Me), furnitureSlot(9, 290, Me), furnitureSlot(10, 420, Me), furnitureSlot(8, 530, Me)], 8: [...qt, furnitureSlot(2, 125, ct), furnitureSlot(18, 500, Me)] }, featurePrice = (e) => 25 + 5 * e, DELIVERY_TIME_MS = 6e3;
export function createFloorFurniture(e) {
  return (FLOOR_FURNITURE_LAYOUTS[e] || []).map((t) => ({ ...t, feature: t.fast ? 0 : -1, leveres: 0 }));
}
export const Ac = { 0: [2, 0], 1: [0, 0], 2: [4, 0], 3: [2, 0], 5: [0, 0], 6: [6, -21], 8: [0, 0], 9: [3, 0], 10: [2, 0], 11: [2, 0], 12: [5, 0], 13: [5, 0], 18: [0, 0] }, Oc = 14;
export function buyFurnitureFeature(e, t, n) {
  const r = featurePrice(n);
  if (e.penge < r) {
    return false;
  }
  e.penge -= r;
  t.feature = n;
  t.leveres = DELIVERY_TIME_MS;
  return true;
}
export function tickFurnitureDeliveries(e, t) {
  for (const n of e.etager) {
    for (const r of n.moebler || []) {
      if (r.leveres > 0) {
        r.leveres = Math.max(0, r.leveres - t);
      }
    }
  }
}
export const COIN_SOUND_ID = 976;
export function addMoney(e, t) {
  if (t >= 1) {
    e.lyde.push(COIN_SOUND_ID);
  }
  e.penge += t;
}
export const DISH_NAMES = ["Bacon og æg", "Salat", "Sandwich", "Frugtsalat", "Hotdog", "Spaghetti", "Burger", "Hummer", "Bøf med majs", "Pandekager", "Laks", "Fondue", "Sushi", "Omelet", "Dumplings", "Kylling", "Tacos", "Tærte", "Suppe", "Lagkage", "Pizza", "Paella", "Banana split"], COOK_NAMES = ["Grisene", "Kokkepigen", "Kok 3", "Kok 4", "Kok 5"], dishInfo = (e) => {
  const t = 4 + e % 4, n = 20 + 10 * e;
  return { navn: DISH_NAMES[e], pris: n, portioner: t, prisPrPortion: Math.round(n * 1.6 / t), tid: (8 + 4 * e) * 1e3, huer: Math.floor(e / 2) };
}, KITCHEN_LEVEL_THRESHOLDS = [0, 60, 150, 300, 500, 800, 1200, 1700, 2400, 3200, 4200, 5500], kitchenLevel = (e) => KITCHEN_LEVEL_THRESHOLDS.filter((t) => e >= t).length - 1, maxStovesForLevel = (e) => Math.min(4, 1 + Math.floor(e / 2)), maxTableForLevel = (e) => Math.min(7, e), stovePrice = (e) => 150 * e, tablePrice = (e) => 120 * e, COOK_PRICES = [0, 200, 400, 700, 1e3], COOK_INCOME = [0, 40, 70, 110, 160], COOK_INTERVAL_MS = [0, 90, 120, 150, 180].map((e) => e * 1e3);
export function createRestaurant() {
  return { komfurer: [{ mad: null }], bord: 0, kok: 0, kokTid: COOK_INTERVAL_MS[0], paaBordet: [], tjent: 0 };
}
export const isCookIncomeReady = (e) => COOK_INCOME[e.kok] > 0 && e.kokTid <= 0;
export function collectCookIncome(e, t) {
  if (!isCookIncomeReady(t)) {
    return 0;
  }
  const n = COOK_INCOME[t.kok];
  addMoney(e, n);
  e.hentet += n;
  t.kokTid = COOK_INTERVAL_MS[t.kok];
  return n;
}
export function plateSlotPosition(e, t, n) {
  const r = e.bord.pladser[t], l = Math.floor(n / 3);
  let i;
  if (l !== Math.floor(r / 3)) {
    i = e.bord.placering[3][n % 3];
  } else {
    const o = (r - 1) % 3;
    i = e.bord.placering[o + 1][n % 3];
  }
  return { x: i, y: e.bord.yBase + l * e.bord.dy };
}
const freePlateSlot = (e, t) => {
  const n = e.bord.pladser[t.bord];
  for (let r = 0; r < n; r++) {
    if (!t.paaBordet.some((l) => l.tallerken === r)) {
      return r;
    }
  }
  return -1;
};
export function startDish(e, t, n, r) {
  const l = dishInfo(r);
  if (e.penge < l.pris || kitchenLevel(t.tjent) < l.huer) {
    return false;
  }
  e.penge -= l.pris;
  t.komfurer[n].mad = { ret: r, tilstand: 0, tid: 0 };
  return true;
}
export function stoveAction(e, t, n) {
  const r = t.komfurer[n].mad;
  if (!r) {
    return "tom";
  }
  if (r.tilstand === 0) {
    r.tilstand = 1;
    return "ok";
  }
  if (r.tilstand === 1) {
    r.tilstand = 2;
    r.tid = dishInfo(r.ret).tid;
    return "ok";
  }
  if (r.tilstand === 3) {
    const l = freePlateSlot(e, t);
    if (l < 0) {
      return "fuldt";
    }
    t.paaBordet.push({ ret: r.ret, portioner: dishInfo(r.ret).portioner, tallerken: l, fraKomfur: n, flyt: 0 });
    t.komfurer[n].mad = null;
    return "ok";
  }
  return "koger";
}
export function buyStove(e, t) {
  const n = t.komfurer.length;
  if (n >= maxStovesForLevel(kitchenLevel(t.tjent)) || e.penge < stovePrice(n)) {
    return false;
  }
  e.penge -= stovePrice(n);
  t.komfurer.push({ mad: null });
  return true;
}
export function upgradeTable(e, t, n, r) {
  if (r <= n.bord || r > maxTableForLevel(kitchenLevel(n.tjent)) || t.penge < tablePrice(r)) {
    return false;
  }
  t.penge -= tablePrice(r);
  n.bord = r;
  return true;
}
export function hireCook(e, t, n) {
  if (n === t.kok || e.penge < COOK_PRICES[n]) {
    return false;
  }
  e.penge -= COOK_PRICES[n];
  t.kok = n;
  t.kokTid = COOK_INTERVAL_MS[n];
  return true;
}
export function sellPortion(e, t, n = null) {
  const r = t.paaBordet.filter((o) => o.flyt >= 1);
  if (!r.length) {
    return 0;
  }
  const l = n && r.includes(n) ? n : r[Math.floor(Math.random() * r.length)], i = dishInfo(l.ret).prisPrPortion;
  l.portioner -= 1;
  if (l.portioner <= 0) {
    t.paaBordet.splice(t.paaBordet.indexOf(l), 1);
  }
  addMoney(e, i);
  e.hentet += i;
  t.tjent += i;
  return i;
}
export function updateRestaurant(e, t, n) {
  if (t.kokTid === void 0) {
    t.kokTid = COOK_INTERVAL_MS[t.kok];
  }
  if (t.kokTid > 0) {
    t.kokTid = Math.max(0, t.kokTid - n);
  }
  for (const r of t.komfurer) {
    if (r.mad && r.mad.tilstand === 2) {
      r.mad.tid -= n;
      if (r.mad.tid <= 0) {
        r.mad.tid = 0;
        r.mad.tilstand = 3;
      }
    }
  }
  for (const r of t.paaBordet) {
    if (r.flyt < 1) {
      r.flyt = Math.min(1, r.flyt + n / (e.mad.flyt * (1e3 / 30)));
    }
  }
}
