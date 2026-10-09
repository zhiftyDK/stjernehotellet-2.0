import { AnimationPlayer } from '../../engine/animation.js';
import { getAnimationBounds } from '../../render/canvas-helpers.js';

// Small UI helpers shared by the in-game menus (world-init.js) and the Zoo / Pop minigames.

/**
 * Returns a function that draws a named animation from an asset pack, scaled down (never up)
 * and centred inside a box. Animation players are created lazily and cached per pack+animation.
 * Drawer args: (painter, packName, animName, boxX, boxY, boxW, boxH, alpha = 1).
 */
function createFittedAnimationDrawer() {
  const playerCache = new Map();
  return (painter, packName, animName, boxX, boxY, boxW, boxH, alpha = 1) => {
    const pack = painter.pakker[packName], cacheKey = `${packName}-${animName}`;
    if (!playerCache.has(cacheKey)) {
      const animation = pack && pack.anims.get(animName), player = animation ? new AnimationPlayer(animation) : null;
      if (player) {
        player.advance(0);
      }
      playerCache.set(cacheKey, player);
    }
    const cachedPlayer = playerCache.get(cacheKey), bounds = getAnimationBounds(pack.M, cachedPlayer);
    if (!bounds) {
      return;
    }
    const scale = Math.min(1, boxW / (bounds.x1 - bounds.x0), boxH / (bounds.y1 - bounds.y0));
    painter.anim(packName, cachedPlayer, boxX + boxW / 2 - (bounds.x0 + bounds.x1) / 2 * scale, boxY + boxH / 2 - (bounds.y0 + bounds.y1) / 2 * scale, scale, alpha);
  };
}
/** Draws a coin icon followed by `price` at (x, y); text turns red when the player cannot afford it. */
function drawPriceTag(painter, price, x, y, affordable = true) {
  painter.sprite("ui", painter.U.ikoner.moent, x + 22, y, { skala: 0.6 });
  painter.tekst(String(price), x + 42, y, { str: 20, farve: affordable ? "#fff" : "#ff9c9c" });
}
/**
 * Builds the modal-dialog factories for a UI asset set.
 *  - dialog(message, onConfirm, { titel }): yes/no dialog; onConfirm runs after the player presses yes.
 *  - besked(title, message, onClosed): notice with a single OK button; onClosed runs after closing.
 */
function createDialogs(uiAssets) {
  const dialog = (message, onConfirm, { titel: title = "", ok: isNotice = false, lukket: onClosed = null } = {}) => ({ titel: title, bredde: 576, hoejde: 288, luk: false, tegn(painter, panel, modalWindow) {
      painter.tekst(message, panel.x + panel.w / 2, panel.y + 60, { midt: true, bredde: panel.w - 90, str: 24, op: true });
      if (isNotice) {
        painter.tekstKnap(uiAssets.tekster.slet[4], panel.x + panel.w / 2 - 80, panel.y + panel.h - 90, 160, 56, () => {
          modalWindow.luk();
          if (onClosed) {
            onClosed();
          }
        });
      } else {
        painter.spriteKnap(uiAssets.ikoner.ja, panel.x + panel.w / 2 - 90, panel.y + panel.h - 62, () => {
          modalWindow.luk();
          onConfirm();
        });
        painter.spriteKnap(uiAssets.ikoner.nej, panel.x + panel.w / 2 + 90, panel.y + panel.h - 62, () => modalWindow.luk());
      }
    } });
  return { dialog, besked: (title, message, onClosed = null) => dialog(message, null, { titel: title, ok: true, lukket: onClosed }) };
}

export { createFittedAnimationDrawer, drawPriceTag, createDialogs };
