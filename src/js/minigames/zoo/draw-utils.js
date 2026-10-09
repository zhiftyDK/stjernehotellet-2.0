// Zoo minigame: small canvas/hit-test helpers and the standalone wallet.

import { drawSpriteFrame } from '../../render/canvas-helpers.js';

/** Draws sprite `spriteId` from the zoo manifest at (x, y), optionally scaled and with alpha.
 *  Params: ctx2d, manifest, textures, spriteId, x, y, scale = 1, alpha = 1. */
export function drawSpriteById(ctx2d, manifest, textures, spriteId, x, y, scale = 1, alpha = 1) {
  const sprite = manifest.sprites[spriteId];
  const texture = sprite && textures[sprite.assetId];
  if (!(!texture || alpha <= 0)) {
    ctx2d.save();
    ctx2d.translate(x, y);
    ctx2d.scale(scale, scale);
    drawSpriteFrame(ctx2d, texture, sprite, alpha);
    ctx2d.restore();
  }
}
/** Hit test: does the tap point (pointX, pointY), grown by `margin` pixels, touch the sprite placed at (x, y)?
 *  `anchorOverride` = [anchorX, anchorY] replaces the sprite's own anchor; `mirrored` flips the sprite horizontally. */
export function hitsSprite(manifest, spriteId, x, y, pointX, pointY, margin, anchorOverride = null, mirrored = false) {
  const sprite = manifest.sprites[spriteId];
  if (!sprite) {
    return false;
  }
  const [anchorX, anchorY] = anchorOverride || [sprite.ox, sprite.oy], left = mirrored ? x - (sprite.w - anchorX) : x - anchorX, top = y - anchorY;
  return pointX + margin >= left && pointX - margin <= left + sprite.w && pointY + margin >= top && pointY - margin <= top + sprite.h;
}
/** Fallback wallet used when no shared one is passed in: `penge` = coins, `brug` spends (false if too poor), `faa` earns. */
export const createWallet = (startCoins) => ({ penge: startCoins, brug(amount) {
    if (this.penge < amount) {
      return false;
    }
    this.penge -= amount;
    return true;
  }, faa(amount) {
    this.penge += amount;
  } });
