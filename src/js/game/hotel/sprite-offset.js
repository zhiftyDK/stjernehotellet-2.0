// Measures the vertical offset of guest animations so they can be aligned to the floor.
import { getAnimationBounds, drawAnimation } from '../../render/canvas-helpers.js';
import { AnimationPlayer } from '../../engine/animation.js';

// Animation types aligned by their lowest opaque pixel (standing/sitting on the floor).
const BOTTOM_ALIGNED_ANIMS = new Set([0, 1, 3, 5, 8, 9, 10, 11, 15, 18]);
// Animation types aligned by their highest opaque pixel (hanging from above).
const TOP_ALIGNED_ANIMS = new Set([2]);
// Pixels with alpha above this count as part of the figure.
const OPAQUE_ALPHA_THRESHOLD = 60;

// Returns lookup(animType, animId) -> vertical pixel offset, computed once per animation by
// rendering its first frame offscreen and finding the first/last row with visible pixels.
// Returns 0 for unknown types, missing animations or images that are not loaded yet.
export function createSpriteYOffsetLookup(gameAssets) {
  const cache = new Map();
  return (animType, animId) => {
    if (!BOTTOM_ALIGNED_ANIMS.has(animType) && !TOP_ALIGNED_ANIMS.has(animType)) {
      return 0;
    }
    if (cache.has(animId)) {
      return cache.get(animId);
    }
    const animation = gameAssets.anims.get(animId);
    if (!animation) {
      return 0;
    }
    const player = new AnimationPlayer(animation);
    player.advance(0);
    for (const drawItem of player.drawList("invers")) {
      const sprite = gameAssets.M.sprites[drawItem.sprite];
      if (sprite && !gameAssets.T.I[sprite.assetId]) {
        return 0;
      }
    }
    const bounds = getAnimationBounds(gameAssets.M, player);
    if (!bounds) {
      cache.set(animId, 0);
      return 0;
    }
    const width = Math.ceil(bounds.x1 - bounds.x0) + 2, height = Math.ceil(bounds.y1 - bounds.y0) + 2, canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    drawAnimation(ctx, gameAssets.M, gameAssets.T.I, player, -bounds.x0 + 1, -bounds.y0 + 1);
    const pixels = ctx.getImageData(0, 0, width, height).data, rowHasInk = (row) => {
      for (let col = 0; col < width; col++) {
        if (pixels[(row * width + col) * 4 + 3] > OPAQUE_ALPHA_THRESHOLD) {
          return true;
        }
      }
      return false;
    };
    let offset = 0;
    if (TOP_ALIGNED_ANIMS.has(animType)) {
      let row = 0;
      for (; row < height && !rowHasInk(row);) {
        row++;
      }
      if (row < height) {
        offset = -Math.round(row - 1 + bounds.y0);
      }
    } else {
      let row = height - 1;
      for (; row >= 0 && !rowHasInk(row);) {
        row--;
      }
      if (row >= 0) {
        offset = -Math.round(row - 1 + bounds.y0);
      }
    }
    cache.set(animId, offset);
    return offset;
  };
}
