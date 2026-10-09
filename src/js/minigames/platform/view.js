// Platform minigame: current view (canvas) size.
//
// The canvas is 960 px wide normally and 1136 px wide on wide containers. ES module bindings
// cannot be assigned from other modules, so PlatformGame calls setViewWidth() and every other
// module reads the live `viewWidth` / `viewWidthUnits` bindings.
import { PIXEL_SCALE } from './constants.js';

// Canvas width in pixels and the same width in world units.
export let viewWidth = 960;
export let viewWidthUnits = viewWidth / PIXEL_SCALE;

// Chooses the canvas width from the width of the surrounding container.
export function setViewWidth(containerWidth) {
  viewWidth = containerWidth > 1280 ? 1136 : 960;
  viewWidthUnits = viewWidth / PIXEL_SCALE;
}
