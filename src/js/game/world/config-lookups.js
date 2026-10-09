/**
 * Zoo minigame: pure lookups into the static configuration tables (state.Z / zooConfig)
 * and slot position helpers. Terminology: attraction = "sevaerdighed", shop = "bod",
 * ware = "vare", item = "genstand" (decoration), form = growth stage / variant index.
 */

// Screen position of an attraction slot: even slots in the first column, odd in the second, one step `dx` per slot pair.
export function attractionSlotPosition(zooConfig, slotIndex) {
  const layout = zooConfig.sevaerdighed.plads;
  const isFirstColumn = slotIndex % 2 === 0;
  return {
    x: (isFirstColumn ? layout.x[0] : layout.x[1]) + Math.trunc(slotIndex / 2) * layout.dx,
    y: isFirstColumn ? layout.y[0] : layout.y[1],
  };
}

/** Which side/row (0 or 1) a slot belongs to. */
export const slotSide = (slotIndex) => slotIndex % 2;

/** Screen position of a shop slot (same layout rule as attraction slots). */
export function shopSlotPosition(zooConfig, slotIndex) {
  const layout = zooConfig.bod.plads;
  const isFirstColumn = slotIndex % 2 === 0;
  return {
    x: (isFirstColumn ? layout.x[0] : layout.x[1]) + Math.trunc(slotIndex / 2) * layout.dx,
    y: isFirstColumn ? layout.y[0] : layout.y[1],
  };
}

/** Config entry of an attraction type. */
export const attractionConfig = (zooConfig, type) => zooConfig.regler.sevaerdigheder[type];

/** Config entry (price, payout, ...) of an animal of this attraction type and form. */
export const animalConfig = (zooConfig, type, form) => zooConfig.regler.dyr[type][form];

/** True for forms 0 and 1 (grown animals); forms 2+ are babies that need a nest. */
export const isAdultStage = (form) => form < 2;

/** Config entry of a decoration item. */
export const itemConfig = (zooConfig, category, form) => zooConfig.regler.genstande[category] && zooConfig.regler.genstande[category][form];

/** Config entry of a shop type. */
export const shopConfig = (zooConfig, type) => zooConfig.regler.boder[type];

/** Config entry of a ware. */
export const wareConfig = (zooConfig, type, form) => zooConfig.regler.varer[type] && zooConfig.regler.varer[type][form];

/** True while an entry (building/item) is still before its end timestamp. */
export const isBuildTimerRunning = (entry, time) => time < entry.slut;

/** True once `time` is past the entry's end timestamp (used for shop payouts). */
export const isTimerExpired = (entry, time) => time > entry.slut;
