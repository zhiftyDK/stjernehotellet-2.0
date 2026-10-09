// Zoo minigame: world-position helpers shared by rendering and tap handling.

import { attractionSlotPosition } from '../../game/world.js';

/** Adds two {x, y} points. */
export const offsetPoint = (base, offset) => ({ x: base.x + offset.x, y: base.y + offset.y });

/** Creates a function that, for attraction slot number `slot`, returns the slot position `p`
 *  and the attraction's sprite origin {x, y} (slot position + the attraction sprite offset from config). */
export function createAttractionAnchor(config) {
  const attractionCfg = config.sevaerdighed;
  return (slot) => {
    const slotPosition = attractionSlotPosition(config, slot);
    return { p: slotPosition, x: slotPosition.x + attractionCfg.forskyd[0], y: slotPosition.y + attractionCfg.forskyd[1] };
  };
}
