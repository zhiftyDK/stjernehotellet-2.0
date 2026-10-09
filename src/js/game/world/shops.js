/**
 * Zoo minigame: shops ("boder") and the wares ("varer") they sell.
 *
 * A shop is bought into a slot and built; it holds one ware at a time and pays out periodically.
 * Wares not placed in a shop (bod < 0) are kept in storage so they can be swapped back for free.
 */

import { shopConfig, wareConfig, isTimerExpired } from './config-lookups.js';
import { spendAndScore, shopUnlockLevel, isLockedAtLevel } from './score-and-levels.js';

/** The ware currently placed in a shop, or null. */
export const shopWare = (zoo, shopIndex) => zoo.varer.find((ware) => ware.bod === shopIndex) || null;

/** How many unplaced wares (bod < 0) of this type/form are in storage. */
export const countStoredWares = (zoo, type, form) => zoo.varer.filter((ware) => ware.bod < 0 && ware.type === type && ware.f === form).length;

/** Payout interval of the shop's current ware, in seconds. */
const shopPayoutDelay = (zoo, shopIndex) => {
  const ware = shopWare(zoo, shopIndex);
  return ware ? wareConfig(zoo.Z, ware.type, ware.f).udbetalingstid : 0;
};

/** Buys a shop into an empty slot. Returns true / false / "laast" / "penge". */
export function buyShop(zoo, player, shopIndex, type, now) {
  const shop = zoo.boder[shopIndex];
  if (!shop || shop.type !== 0 || !shopConfig(zoo.Z, type)) {
    return false;
  }
  if (isLockedAtLevel(zoo, shopUnlockLevel(zoo.Z, type))) {
    return "laast";
  }
  if (!spendAndScore(zoo, player, shopConfig(zoo.Z, type).pris)) {
    return "penge";
  }
  Object.assign(shop, { type: type, bygger: true, slut: now + shopConfig(zoo.Z, type).byggetid });
  shopWare(zoo, shopIndex) || zoo.varer.push({ bod: shopIndex, type: type, f: 0 });
  zoo.lyde.push(zoo.Z.lyde.byg);
  return true;
}

/** Finishes the construction of a shop when its timer is done. */
export function finishShopBuild(zoo, shopIndex, now) {
  const shop = zoo.boder[shopIndex];
  if (!shop || !shop.bygger || now <= shop.slut) {
    return false;
  }
  shop.bygger = false;
  shop.slut = now + shopPayoutDelay(zoo, shopIndex);
  zoo.lyde.push(zoo.Z.lyde.faerdig);
  return true;
}

/** Collects coins from a shop when ready; returns the amount (0 if not ready). */
export function collectShopIncome(zoo, player, shopIndex, now) {
  const shop = zoo.boder[shopIndex];
  const ware = shopWare(zoo, shopIndex);
  if (!shop || shop.bygger || !ware || !isTimerExpired(shop, now)) {
    return 0;
  }
  const wareCfg = wareConfig(zoo.Z, ware.type, ware.f);
  player.faa(wareCfg.udbetaling);
  shop.slut = now + wareCfg.udbetalingstid;
  return wareCfg.udbetaling;
}

/** Switches the ware sold in a shop (using a stored one or buying it). Returns true / false / "penge". */
export function changeShopWare(zoo, player, shopIndex, form, now) {
  const shop = zoo.boder[shopIndex];
  if (!shop || shop.type < 1) {
    return false;
  }
  const current = shopWare(zoo, shopIndex);
  if (current && current.f === form) {
    return false;
  }
  const spare = zoo.varer.find((ware) => ware.bod < 0 && ware.type === shop.type && ware.f === form);
  if (!spare) {
    const wareCfg = wareConfig(zoo.Z, shop.type, form);
    if (!wareCfg || !spendAndScore(zoo, player, wareCfg.pris)) {
      return "penge";
    }
  }
  if (current) {
    current.bod = -1;
  }
  if (spare) {
    spare.bod = shopIndex;
  } else {
    zoo.varer.push({ bod: shopIndex, type: shop.type, f: form });
  }
  shop.slut = now + wareConfig(zoo.Z, shop.type, form).udbetalingstid;
  zoo.lyde.push(zoo.Z.lyde.byg);
  return true;
}
