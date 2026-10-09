/**
 * Zoo minigame world logic - entry point.
 *
 * The implementation lives in ./world/*.js (score/levels, lots, animals, attractions, shops, visitors,
 * state load/save, simulation). This file only re-exports it so existing importers keep working.
 */

export { animalPath, animalPosition, animalsAtAttraction, buyAnimal, hasAnimalActions, nestClip, nextAnimalOffer, pendingAnimalFor, tapAnimal, unlockNest } from './world/animals.js';
export { buyAttraction, collectAttractionIncome, countStoredItems, finishAttractionBuild, itemInSlot, itemSlotsOf, placeItem } from './world/attractions.js';
export { formatDuration } from './world/common.js';
export { animalConfig, attractionConfig, attractionSlotPosition, isAdultStage, isBuildTimerRunning, isTimerExpired, itemConfig, shopConfig, shopSlotPosition, slotSide, wareConfig } from './world/config-lookups.js';
export { buyLot, createBuildSlot, hasMoreLots, isLotBuilding, nextLot, worldWidth } from './world/lots.js';
export { attractionUnlockLevel, cappedLevel, currentLevel, isLockedAtLevel, itemUnlockLevel, levelProgress, lockRules, shopUnlockLevel, wareUnlockLevel } from './world/score-and-levels.js';
export { buyShop, changeShopWare, collectShopIncome, countStoredWares, finishShopBuild, shopWare } from './world/shops.js';
export { updateZoo } from './world/simulation.js';
export { createZooState, loadZooState, serializeZooState } from './world/state.js';
export { balloonPosition, clearVisitors, isBalloonIdle, popBalloon } from './world/visitors.js';
