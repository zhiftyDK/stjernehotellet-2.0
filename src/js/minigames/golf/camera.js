/**
 * Scrolling camera shared by the minigolf clubhouse view and the course view.
 *
 * The visible screen is `canvasWidth` x 768 pixels; the width depends on the
 * host (the component sets it with setCanvasWidth on every render).
 */
import { AcceleratingValue } from '../../engine/tween.js';

// Current logical canvas width. Exported as a live binding; change it only via setCanvasWidth.
export let canvasWidth = 1280;

/** Set the logical canvas width (called by the minigolf component). */
export function setCanvasWidth(width) {
  canvasWidth = width;
}

/**
 * Create a camera over a world of worldWidth x worldHeight pixels.
 * Scrolling accelerates towards its target (maxSpeed, divisor tune the easing).
 *   camera.x / camera.y : integer top-left of the view in world coordinates
 *   camera.maal(x, y)   : smoothly centre the view on world point (x, y)
 *   camera.tvang(x, y)  : jump immediately
 *   camera.trin()       : advance one animation frame
 *   camera.bevaeger     : true while still scrolling
 */
export function createCamera({ verdenB: worldWidth, verdenH: worldHeight, maks: maxSpeed, deler: divisor }) {
  // Centre on (x, y) but keep the view inside the world (the screen height is 768).
  const clampTarget = (x, y) => [Math.max(0, Math.min(worldWidth - canvasWidth, x - canvasWidth / 2)), Math.max(0, Math.min(worldHeight - 768, y - 384))];
  const [startX, startY] = clampTarget(0, 0);
  const scrollX = new AcceleratingValue(startX, maxSpeed, divisor);
  const scrollY = new AcceleratingValue(startY, maxSpeed, divisor);
  const camera = { x: startX, y: startY, maal(x, y) {
      [scrollX.maal, scrollY.maal] = clampTarget(x, y);
    }, tvang(x, y) {
      const [clampedX, clampedY] = clampTarget(x, y);
      scrollX.saet(clampedX);
      scrollY.saet(clampedY);
      camera.x = clampedX;
      camera.y = clampedY;
    }, trin() {
      scrollX.trin();
      scrollY.trin();
      camera.x = Math.floor(scrollX.v);
      camera.y = Math.floor(scrollY.v);
    }, get bevaeger() {
      return scrollX.bevaeger || scrollY.bevaeger;
    } };
  return camera;
}
