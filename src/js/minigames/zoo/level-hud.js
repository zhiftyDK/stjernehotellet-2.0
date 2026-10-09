// Zoo minigame: the experience/level bar drawn in the HUD, with level-up reactions.

import { FRAME_MS, Tween } from '../../engine/tween.js';
import { cappedLevel, currentLevel, levelProgress } from '../../game/world.js';
import { drawSpriteById } from './draw-utils.js';

/** Level progress bar in the HUD. Returns { updateLevelBar(dtMs), drawLevelHud() }. */
export function createLevelHud(ctx) {
  const { config, zoo, narrator, figureValues, narratorCfg, sounds, canvasCtx, bitmapFont, uiKit, ui } = ctx;
  const levelCfg = config.niveau;
  /** Animated level bar state: score shown, level ("poter" = paws) reached, `fx` = tweened bar fill. */
  const levelBar = { score: -1, poter: 0, fx: new Tween(0, levelCfg.glid), acc: 0 };
  /** Per-frame update: detects score changes, plays the level-up narration/sound and advances the bar tween (`s` = ms). */
  const updateLevelBar = (dtMs) => {
    if (levelBar.score <= 0 && (levelBar.score = zoo.score, levelBar.poter = cappedLevel(zoo), levelBar.fx.mod(levelProgress(config, zoo.score))), levelBar.score !== zoo.score) {
      levelBar.score = zoo.score;
      const newLevel = cappedLevel(zoo);
      if (newLevel > levelBar.poter) {
        const pawIndex = levelCfg.pawSpeak.indexOf(newLevel);
        if (narrator) {
          figureValues.fill(0);
          narrator.startForfra(narratorCfg.haendelser.niveau, { 0: pawIndex < 0 ? 0 : pawIndex });
        }
        sounds.spil(levelCfg.lyd);
      }
      levelBar.fx.mod(levelProgress(config, zoo.score));
      levelBar.poter = currentLevel(zoo);
    }
    for (levelBar.acc += dtMs; levelBar.acc >= FRAME_MS;) {
      levelBar.acc -= FRAME_MS;
      levelBar.fx.trin();
    }
  };
  /** Draws the level progress bar, score and level star in the HUD. */
  const drawLevelHud = () => {
    const { H: hudLayout, M: hudManifest, I: hudTextures } = ui.hud, images = hudLayout.billeder, barField = hudLayout.bjaelkeFelt;
    canvasCtx.fillStyle = `rgb(${barField.bag.join(",")})`;
    canvasCtx.fillRect(barField.x, barField.y, barField.w, barField.h);
    canvasCtx.fillStyle = `rgb(${barField.fyld.join(",")})`;
    canvasCtx.fillRect(barField.x, barField.y, Math.trunc(barField.w * levelBar.fx.v), barField.h);
    drawSpriteById(canvasCtx, hudManifest, hudTextures, images.bjaelke.sprite, images.bjaelke.x, images.bjaelke.y);
    drawSpriteById(canvasCtx, hudManifest, hudTextures, images.bjaelkeKant.sprite, images.bjaelkeKant.x, images.bjaelkeKant.y);
    const pointArea = hudLayout.tekst.point;
    if (bitmapFont) {
      bitmapFont.tegn(canvasCtx, String(zoo.score), pointArea[0] + pointArea[2] / 2, barField.y + barField.h / 2, { str: 27, midt: true });
    }
    uiKit.sprite("ui", levelCfg.pote, images.stjerne.x, images.stjerne.y, { alfa: levelBar.poter >= 1 ? 1 : 0.5 });
    const levelTextArea = levelCfg.potetekst;
    if (levelBar.poter >= 1 && bitmapFont) {
      bitmapFont.tegn(canvasCtx, String(levelBar.poter), levelTextArea[0] + levelTextArea[2] / 2, levelTextArea[1] + levelTextArea[3] / 2, { str: 27, midt: true });
    }
  };

  return { updateLevelBar, drawLevelHud };
}
