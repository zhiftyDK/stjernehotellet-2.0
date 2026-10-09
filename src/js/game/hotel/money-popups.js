// Floating "+money" popups and a small sprite drawing helper used by the HUD.
import { drawSpriteFrame } from '../../render/canvas-helpers.js';
import { Tween, AcceleratingValue, FRAME_MS } from '../../engine/tween.js';

// Draws sprite number `spriteIndex` of spriteData at (x, y) with uniform `scale` and `alpha`.
// Nothing is drawn if its image is missing or alpha <= 0.
export function drawSpriteAt(ctx, spriteData, images, spriteIndex, x, y, scale, alpha = 1) {
  const sprite = spriteData.sprites[spriteIndex], image = sprite && images[sprite.assetId];
  if (!(!image || alpha <= 0)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawSpriteFrame(ctx, image, sprite, alpha);
    ctx.restore();
  }
}

// Creates the money popup manager. Each popup (tilfoej = add) floats up while fading and
// growing per popupCfg.effekt; it shows an animated coin sprite plus the amount as text.
// Methods: tilfoej(amount, x, y), fremad(deltaMs) advances/prunes, tegn(ctx) draws, antal = live count.
export function createMoneyPopups(popupCfg, spriteData, images, textRenderer) {
  let popups = [];
  return { tilfoej(amount, x = 640, y = 384) {
      const fx = popupCfg.effekt, frames = Math.trunc(fx.tid / 33), popup = { beloeb: amount, tid: 0, acc: 0, x: new Tween(x, frames), y: new Tween(y, frames), alfa: new AcceleratingValue(fx.alfa[0], fx.maks, Math.trunc(fx.tid / 100)), skala: new AcceleratingValue(fx.skala[0], fx.maks, Math.trunc(fx.tid / 100)) };
      popup.y.mod(y + fx.dy);
      popup.alfa.maal = fx.alfa[1];
      popup.skala.maal = fx.skala[1];
      popups.push(popup);
    }, fremad(deltaMs) {
      const fx = popupCfg.effekt;
      popups = popups.filter((popup) => {
        for (popup.acc += deltaMs; popup.acc >= FRAME_MS;) {
          popup.acc -= FRAME_MS;
          popup.x.trin();
          popup.y.trin();
          popup.alfa.trin();
          popup.skala.trin();
        }
        popup.tid += deltaMs;
        return popup.tid <= fx.tid;
      });
    }, tegn(ctx) {
      const fx = popupCfg.effekt;
      for (const popup of popups) {
        const scale = popup.skala.v / 256, frame = popupCfg.billede + Math.floor(popup.tid / (1e3 / popupCfg.hudFps)) % popupCfg.antal;
        drawSpriteAt(ctx, spriteData, images, frame, popup.x.v, popup.y.v, scale, Math.min(255, popup.alfa.v + 128) / 255);
        textRenderer.tegn(ctx, String(popup.beloeb), popup.x.v + fx.tekstDx, popup.y.v + fx.tekstDy, { font: 3, str: 57 * scale, alfa: Math.max(0, popup.alfa.v) / 255 });
      }
    }, get antal() {
      return popups.length;
    } };
}
