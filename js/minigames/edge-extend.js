import { EXTEND_BG, WIDTH_EXTRA } from '../engine/constants.js';
// Background-only edge strips for the 4:3 minigames. Each game calls snapEdges() right after it has drawn its
// background layer (before characters/UI), so only background art reaches the 16:9 side areas.
export const EDGE = Math.ceil(WIDTH_EXTRA / 2);
const make = () => {
  const c = document.createElement("canvas");
  c.width = EDGE;
  c.height = 768;
  return c;
};
export const edgeStrips = { left: make(), right: make(), ready: false };
export function snapEdges(ctx) {
  if (!EXTEND_BG) {
    return;
  }
  const cv = ctx.canvas, w = cv.width;
  const l = edgeStrips.left.getContext("2d"), r = edgeStrips.right.getContext("2d");
  l.setTransform(-1, 0, 0, 1, EDGE, 0);
  l.drawImage(cv, 0, 0, EDGE, 768, 0, 0, EDGE, 768);
  r.setTransform(-1, 0, 0, 1, EDGE, 0);
  r.drawImage(cv, w - EDGE, 0, EDGE, 768, 0, 0, EDGE, 768);
  edgeStrips.ready = true;
}
export function clearEdges() {
  edgeStrips.ready = false;
  for (const c of [edgeStrips.left, edgeStrips.right]) {
    const x = c.getContext("2d");
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, c.width, c.height);
  }
}
// Draws a background layer into the strips by calling fn(ctx) in mirrored coordinates (game x -> strip column).
export function drawEdges(fn, width = 1280) {
  if (!EXTEND_BG) {
    return;
  }
  for (const [c, m] of [[edgeStrips.left, EDGE], [edgeStrips.right, width]]) {
    const x = c.getContext("2d");
    x.setTransform(-1, 0, 0, 1, m, 0);
    x.clearRect(-width, 0, width * 2, 768);
    x.save();
    fn(x);
    x.restore();
  }
  edgeStrips.ready = true;
}
