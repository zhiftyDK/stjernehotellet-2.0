// Restaurant (cafe) floor renderer: the cook animation, stoves, table, dishes in progress
// and dishes sliding to the tables, plus click hitboxes for each element.
import { plateSlotPosition, kitchenLevel, isCookIncomeReady, maxStovesForLevel, maxTableForLevel, dishInfo } from '../furniture-and-kitchen.js';
import { getAnimationBounds, drawAnimation } from '../../render/canvas-helpers.js';
import { AnimationPlayer } from '../../engine/animation.js';

// Creates the view for cafe floors from the kitchen layout config `cfg` (kok = cook, komfur =
// stove, bord = table, mad = food). Returns { fremad(deltaMs) animation/tick update,
// tegn(ctx, floor, floorNr, x, y, hitboxes, onCookReady) draw }. Hitboxes receive
// { x0, y0, x1, y1, nr, art, i } rectangles for clicking.
export function createRestaurantView(cfg, mediaData, assets) {
  const animById = new Map(mediaData.animations.map((m) => [m.id, m])), players = new Map(), getPlayer = (key, animId, advanceMs = 0) => {
    if (!players.has(key)) {
      const anim = animById.get(animId), player = anim ? new AnimationPlayer(anim) : null;
      if (player) {
        player.advance(advanceMs);
      }
      players.set(key, player);
    }
    return players.get(key);
  }, cooks = new Map();
  let tickAccumulator = 0;
  const drawScaled = (ctx, player, x, y, scale, alpha = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawAnimation(ctx, mediaData, assets.I, player, 0, 0, false, alpha);
    ctx.restore();
  }, scaledBounds = (player, x, y, scale = 1) => {
    const b = getAnimationBounds(mediaData, player);
    return b && { x0: x + b.x0 * scale, y0: y + b.y0 * scale, x1: x + b.x1 * scale, y1: y + b.y1 * scale };
  }, drawProgressBar = (ctx, x, y, fraction, label, width = 92) => {
    ctx.fillStyle = "rgba(20,14,26,.75)";
    ctx.fillRect(x - width / 2, y, width, 12);
    ctx.fillStyle = "#ffd46b";
    ctx.fillRect(x - width / 2 + 2, y + 2, (width - 4) * Math.max(0, Math.min(1, fraction)), 8);
    if (label) {
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(20,14,26,.8)";
      ctx.fillStyle = "#fff";
      ctx.strokeText(label, x, y + 36);
      ctx.fillText(label, x, y + 36);
    }
  };
  return { fremad(deltaMs) {
      for (const player of players.values()) {
        if (player) {
          player.advance(deltaMs);
        }
      }
      for (tickAccumulator += Math.min(250, deltaMs); tickAccumulator >= 33;) {
        tickAccumulator -= 33;
        for (const cook of cooks.values()) {
          if (cook.film === 0 && Math.floor(Math.random() * (cfg.kok.skift + 1)) === 0) {
            cook.film = 1 + Math.floor(Math.random() * (cfg.kok.film[cook.kok].length - 1));
            cook.spiller = new AnimationPlayer(animById.get(cfg.kok.film[cook.kok][cook.film]));
            cook.spiller.advance(0);
          }
        }
      }
      for (const cook of cooks.values()) {
        if (cook.film !== 0) {
          cook.spiller.advance(deltaMs);
          if (cook.spiller.finished) {
            cook.film = 0;
          }
        }
      }
    }, tegn(ctx, floor, floorNr, x, y, hitboxes, onCookReady = null) {
      const restaurant = floor.cafe, level = kitchenLevel(restaurant.tjent);
      if (onCookReady && isCookIncomeReady(restaurant)) {
        onCookReady(x + cfg.kok.x, y + cfg.kok.y);
      }
      let cookState = cooks.get(floorNr);
      if (!cookState || cookState.kok !== restaurant.kok) {
        cookState = { kok: restaurant.kok, film: 0, spiller: null };
        cooks.set(floorNr, cookState);
      }
      const cookPlayer = cookState.film === 0 ? getPlayer(`kok-${restaurant.kok}`, cfg.kok.film[restaurant.kok][0]) : cookState.spiller;
      drawScaled(ctx, cookPlayer, x + cfg.kok.x, y + cfg.kok.y, cfg.kok.skala);
      const cookBounds = scaledBounds(cookPlayer, x + cfg.kok.x, y + cfg.kok.y, cfg.kok.skala);
      if (cookBounds) {
        hitboxes.push({ ...cookBounds, nr: floorNr, art: "kok" });
      }
      const stoveCount = restaurant.komfurer.length, visibleStoves = Math.min(cfg.komfur.max, stoveCount < maxStovesForLevel(level) ? stoveCount + 1 : stoveCount), stoveOrder = Array.from({ length: visibleStoves }, (_item, index) => index).sort((a, b) => cfg.komfur.x[a] - cfg.komfur.x[b]);
      for (const stoveIndex of stoveOrder) {
        const stoveX = x + cfg.komfur.x[stoveIndex], stoveY = y + cfg.komfur.y, isCooking = stoveIndex < stoveCount && restaurant.komfurer[stoveIndex].mad && restaurant.komfurer[stoveIndex].mad.tilstand === 2, stovePlayer = getPlayer(`komfur-${isCooking ? 1 : 0}`, cfg.komfur.film[isCooking ? 1 : 0]);
        drawAnimation(ctx, mediaData, assets.I, stovePlayer, stoveX, stoveY, false, stoveIndex < stoveCount ? 1 : 0.4);
        const stoveBounds = scaledBounds(stovePlayer, stoveX, stoveY);
        if (stoveIndex >= stoveCount) {
          drawAnimation(ctx, mediaData, assets.I, getPlayer("pil", cfg.komfur.pil), stoveX - 24, stoveY - 43);
          if (stoveBounds) {
            hitboxes.push({ ...stoveBounds, nr: floorNr, art: "nytKomfur" });
          }
        } else if (stoveBounds) {
          hitboxes.push({ ...stoveBounds, nr: floorNr, art: "komfur", i: stoveIndex });
        }
      }
      const tableX = x + cfg.bord.x, tableY = y + cfg.bord.y, tablePlayer = getPlayer(`bord-${restaurant.bord}`, cfg.bord.film[restaurant.bord]);
      drawAnimation(ctx, mediaData, assets.I, tablePlayer, tableX, tableY);
      const tableBounds = scaledBounds(tablePlayer, tableX, tableY);
      if (tableBounds) {
        hitboxes.push({ ...tableBounds, nr: floorNr, art: "bord" });
      }
      if (maxTableForLevel(level) > restaurant.bord && tableBounds) {
        drawAnimation(ctx, mediaData, assets.I, getPlayer("pil", cfg.komfur.pil), tableBounds.x1 - 20, tableBounds.y0 + 10);
      }
      restaurant.komfurer.forEach((stove, stoveIndex) => {
        const dish = stove.mad;
        if (!dish) {
          return;
        }
        const animId = [cfg.mad.ingrediens1, cfg.mad.ingrediens2, cfg.mad.koger, cfg.mad.faerdig][dish.tilstand][dish.ret], dishX = x + cfg.komfur.x[stoveIndex], dishY = y + cfg.komfur.y + cfg.komfur.madDy, dishPlayer = getPlayer(`mad-${animId}`, animId);
        drawAnimation(ctx, mediaData, assets.I, dishPlayer, dishX, dishY);
        const dishBounds = scaledBounds(dishPlayer, dishX, dishY);
        if (dishBounds && hitboxes.push({ ...dishBounds, nr: floorNr, art: "mad", i: stoveIndex }), dish.tilstand === 2) {
          const info = dishInfo(dish.ret);
          drawProgressBar(ctx, dishX, dishY + 12, 1 - dish.tid / info.tid, `${Math.ceil(dish.tid / 1e3)} s`);
        }
      });
      for (const plated of restaurant.paaBordet) {
        const slot = plateSlotPosition(cfg, restaurant.bord, plated.tallerken), fromX = x + cfg.komfur.x[plated.fraKomfur], fromY = y + cfg.komfur.y + cfg.komfur.madDy, toX = x + slot.x, toY = y + slot.y, progress = plated.flyt, curX = fromX + (toX - fromX) * progress, curY = fromY + (toY - fromY) * progress, scale = cfg.mad.skalaKomfur + (cfg.mad.skalaBord - cfg.mad.skalaKomfur) * progress, salePlayer = getPlayer(`salg-${plated.ret}`, cfg.mad.salg[plated.ret]);
        drawScaled(ctx, salePlayer, curX, curY, scale);
        if (progress >= 1) {
          drawProgressBar(ctx, curX, curY + 14, plated.portioner / dishInfo(plated.ret).portioner, null, 50);
        }
      }
    } };
}
