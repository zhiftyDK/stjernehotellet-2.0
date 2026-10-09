// Zoo minigame: floating "+coins" popups spawned when money is collected.

import { AcceleratingValue, FRAME_MS, Tween } from '../../engine/tween.js';
import { drawSpriteById } from './draw-utils.js';

/** Floating coin-amount popups shown when income is collected. */
export function createMoneyEffects(ctx) {
  const { config, attractionCfg, manifest, textures, canvasCtx, bitmapFont } = ctx;
  const moneyEffectCfg = config.pengeEffekt;
  /** Active floating "+coins" popups. */
  const moneyEffects = [];

  /** Starts a popup showing `s` (amount) that floats from screen position (n, e). Tweened x/y/alpha/scale. */
  const spawnMoneyEffect = (amount, startX, startY) => {
    const tweenSteps = Math.trunc(moneyEffectCfg.tid / 33);
    const effect = { beloeb: amount, tid: 0, acc: 0, x: new Tween(startX, tweenSteps), y: new Tween(startY, tweenSteps), alfa: new AcceleratingValue(moneyEffectCfg.alfa[0], moneyEffectCfg.maks, Math.trunc(moneyEffectCfg.tid / 100)), skala: new AcceleratingValue(moneyEffectCfg.skala[0], moneyEffectCfg.maks, Math.trunc(moneyEffectCfg.tid / 100)) };
    effect.y.mod(startY + moneyEffectCfg.dy);
    effect.alfa.maal = moneyEffectCfg.alfa[1];
    effect.skala.maal = moneyEffectCfg.skala[1];
    moneyEffects.push(effect);
  };

  /** Advances all popups by `n` ms (in fixed FRAME_MS steps) and draws them; expired ones are removed. */
  const updateAndDraw = (dtMs) => {
    for (const effect of [...moneyEffects]) {
      for (effect.acc += dtMs; effect.acc >= FRAME_MS;) {
        effect.acc -= FRAME_MS;
        effect.x.trin();
        effect.y.trin();
        effect.alfa.trin();
        effect.skala.trin();
      }
      if (effect.tid += dtMs, effect.tid > moneyEffectCfg.tid) {
        moneyEffects.splice(moneyEffects.indexOf(effect), 1);
        continue;
      }
      const scale = effect.skala.v / 256;
      const frameSprite = attractionCfg.moent.sprite + Math.floor(effect.tid / (1e3 / moneyEffectCfg.hudFps)) % attractionCfg.moent.antal;
      drawSpriteById(canvasCtx, manifest, textures, frameSprite, effect.x.v, effect.y.v, scale, Math.min(255, effect.alfa.v + 128) / 255);
      if (bitmapFont) {
        bitmapFont.tegn(canvasCtx, String(effect.beloeb), effect.x.v + moneyEffectCfg.tekstDx, effect.y.v + moneyEffectCfg.tekstDy, { font: 3, str: 57 * scale, alfa: Math.max(0, effect.alfa.v) / 255 });
      }
    }
  };

  return { spawnMoneyEffect, updateAndDraw };
}
