/** Small canvas drawing helpers for the minigolf (sprites with rotation / mirroring, tile layers). */
import { drawSpriteFrame } from '../../render/canvas-helpers.js';

/**
 * Draw sprite `spriteId` with its origin at (x, y). Options (Danish keys):
 * vinkel = rotation in degrees, alfa = opacity 0-1, spejl = mirror horizontally.
 */
export function drawSpriteAt(ctx, manifest, images, spriteId, x, y, { vinkel: angle = 0, alfa: alpha = 1, spejl: mirror = false } = {}) {
  const sprite = manifest.sprites[spriteId];
  const image = sprite && images[sprite.assetId];
  if (!(!image || alpha <= 0)) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (angle) {
      ctx.rotate(angle * Math.PI / 180);
    }
    if (mirror) {
      ctx.scale(-1, 1);
    }
    drawSpriteFrame(ctx, image, sprite);
    ctx.restore();
  }
}

/**
 * Draw a whole tile layer (a course background / foreground): tiles are
 * square sprites numbered from layer.base (0 = empty), laid out in
 * layer.raekker x layer.kolonner. (offsetX, offsetY) is the camera position.
 */
export function drawTileLayer(ctx, manifest, images, layer, offsetX, offsetY) {
  const baseSprite = manifest.sprites[layer.base];
  const tileSize = baseSprite ? baseSprite.w : 256;
  for (let row = 0; row < layer.raekker; row++) {
    for (let col = 0; col < layer.kolonner; col++) {
      const tile = layer.felter[row][col];
      if (tile) {
        drawSpriteAt(ctx, manifest, images, layer.base + tile, col * tileSize - offsetX, row * tileSize - offsetY);
      }
    }
  }
}
