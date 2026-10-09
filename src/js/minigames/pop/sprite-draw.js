/**
 * Low-level canvas drawing helpers for the Popstars minigame (sprites, animations, tile grids).
 */
import { drawSpriteFrame } from '../../render/canvas-helpers.js';

// Draws sprite `spriteId` of the manifest at (x, y) with uniform `scale` and `alpha`.
export function drawSprite(ctx, manifest, images, spriteId, x, y, scale = 1, alpha = 1) {
  const sprite = manifest.sprites[spriteId];
  const image = sprite && images[sprite.assetId];
  if (!(!image || alpha <= 0)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawSpriteFrame(ctx, image, sprite, Math.min(1, alpha));
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
// Draws the current frame of an AnimationPlayer at (x, y). `spriteOverrides` (Map sprite id -> replacement id)
// swaps parts of the figure, e.g. to dress band members in their clothes.
export function drawAnimation(ctx, manifest, images, player, x, y, alpha = 1, spriteOverrides = null) {
  if (player) {
    for (const item of player.drawList("invers")) {
      const sprite = manifest.sprites[spriteOverrides && spriteOverrides.has(item.sprite) ? spriteOverrides.get(item.sprite) : item.sprite];
      const image = sprite && images[sprite.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x + item.x, y + item.y);
        ctx.rotate((item.rot || 0) * Math.PI * 2);
        ctx.scale(item.scaleX * (item.flip ? -1 : 1), item.scaleY);
        ctx.globalAlpha = 1;
        drawSpriteFrame(ctx, image, sprite, item.alpha * alpha);
        ctx.restore();
      }
    }
  }
}
// Draws a map of 128x128 tiles (`grid.felter[row][col]` = tile index relative to `baseSprite`), scrolled by the offset.
export function drawTileGrid(ctx, manifest, images, grid, baseSprite, offsetX, offsetY) {
  for (let row = 0; row < grid.raekker; row++) {
    for (let col = 0; col < grid.kolonner; col++) {
      const cell = grid.felter[row][col];
      if (cell) {
        drawSprite(ctx, manifest, images, baseSprite + cell, col * 128 - offsetX, row * 128 - offsetY);
      }
    }
  }
}
