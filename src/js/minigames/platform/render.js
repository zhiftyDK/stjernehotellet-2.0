// Platform minigame: canvas rendering of the world.
//
// drawSprite() draws one manifest sprite (with flip, rotation, alpha); drawWorld() paints the sky and
// draws the level's draw list (see level-render.js).
import { VIEW_HEIGHT } from './constants.js';
import { viewWidth } from './view.js';

// Draws sprite `spriteId` centred on (x, y). Manifest flags encode a rotation in quarter turns (bits 1-2),
// an alpha value (bits 8-15) and a horizontal flip (bit 0); `rotation` is in extra turns.
export function drawSprite(ctx, manifest, images, spriteId, x, y, flipX, alpha, rotation = 0, scaleX = 1, scaleY = 1) {
  const sprite = manifest.sprites[spriteId];
  if (!sprite) {
    return;
  }
  const image = images[sprite.assetId];
  if (!image) {
    return;
  }
  const isSpecial = (sprite.flags & 65535) === 65280, flipFlag = !isSpecial && (sprite.flags & 1) > 0, rotationQuarter = isSpecial ? 0 : (sprite.flags & 6) >> 1, flagAlpha = isSpecial ? 1 : ((sprite.flags & 65280) >> 8) / 255;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation + rotationQuarter * 0.25) * Math.PI * 2);
  ctx.scale(scaleX * (flipX !== flipFlag ? -1 : 1), scaleY);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * flagAlpha));
  ctx.drawImage(image, sprite.u, sprite.v, sprite.w, sprite.h, -sprite.ox, -sprite.oy, sprite.w, sprite.h);
  ctx.restore();
}

// Conversion factors from animation-space units to screen pixels.
const ANIM_POSITION_SCALE = 1 / 32 / 0.0122070312;
const ANIM_SPRITE_SCALE = 4096 / 6400;

// Draws the sky colour and everything in the level draw list.
export function drawWorld(ctx, level, manifest, images) {
  ctx.fillStyle = "rgb(150,200,235)";
  ctx.fillRect(0, 0, viewWidth, VIEW_HEIGHT);
  for (const item of level.tegneliste()) {
    if (item.anim) {
      for (const part of item.anim.drawList("invers", false)) {
        drawSprite(ctx, manifest, images, part.sprite, item.x + part.x * ANIM_POSITION_SCALE, item.y + part.y * ANIM_POSITION_SCALE, part.flip !== !!item.flip, part.alpha * (item.alpha ?? 1), part.rot, part.scaleX * ANIM_SPRITE_SCALE, part.scaleY * ANIM_SPRITE_SCALE);
      }
    } else {
      drawSprite(ctx, manifest, images, item.sprite, item.x, item.y, !!item.flip, item.alpha ?? 1);
    }
  }
}
