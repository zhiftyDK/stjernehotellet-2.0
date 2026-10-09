// Zoo minigame: draws the scrolling world (background, attractions, items, animals, shops, balloons, visitors).

import { AnimationPlayer } from '../../engine/animation.js';
import { animalPosition, attractionSlotPosition, balloonPosition, formatDuration, hasAnimalActions, isAdultStage, isBuildTimerRunning, itemSlotsOf, shopSlotPosition, shopWare, slotSide, worldWidth } from '../../game/world.js';
import { drawAnimation } from '../../render/canvas-helpers.js';
import { drawSpriteById } from './draw-utils.js';
import { offsetPoint } from './positions.js';

/** Creates the world renderer. Returns { advancePlayers(dtMs), draw(timestamp, nowSeconds) }. */
export function createSceneRenderer(ctx) {
  const { config, texts, manifest, textures, animations, attractionCfg, zoo, canvasCtx, bitmapFont, loadState, canvasWidth, cameraRef, attractionAnchor } = ctx;
  const shopCfg = config.bod;

  /** Animation players by key ("sev3-1", "bod2-0", ...). Each entry { id, p: player or null, brugt: used this frame }. */
  const playerCache = new Map();
  /** Returns the (cached) animation player for `key` playing animation `n`; a new player starts at a random offset unless `e` is false. */
  const cachedPlayer = (key, animationId, randomStart = true) => {
    let entry = playerCache.get(key);
    if (!entry || entry.id !== animationId || !entry.p && animations.has(animationId)) {
      const animationData = animations.get(animationId);
      entry = { id: animationId, p: animationData ? new AnimationPlayer(animationData) : null };
      if (entry.p && randomStart) {
        entry.p.advance(Math.random() * 5e3);
      }
      playerCache.set(key, entry);
    }
    entry.brugt = true;
    return entry.p;
  };

  /** Draws a countdown text `s` centred at x = n, y = e + r / 2 (r = height of the area). */
  const drawCountdown = (text, x, y, height) => {
    if (bitmapFont) {
      bitmapFont.tegn(canvasCtx, text, x, y + height / 2, { font: 2, midt: true });
    }
  };

  /** Advances all animation players by `n` ms and clears their "used this frame" marks. */
  const advancePlayers = (dtMs) => {
  for (const entry of playerCache.values()) {
    if (entry.p) {
      entry.p.advance(dtMs);
    }
    entry.brugt = false;
  }
  };

  /** Fills the ground and draws the repeating background tiles (128 px grid) visible around camera `r`. */
  const drawBackground = (camera) => {
  canvasCtx.fillStyle = "#5aa02c";
  canvasCtx.fillRect(0, 0, canvasWidth, 768);
  const background = loadState.bg;
  const repeatWidth = background.kolonner * 128;
  for (let repeatIndex = Math.max(0, Math.floor(camera.x / repeatWidth)); repeatIndex < config.verden.gentag && repeatIndex * repeatWidth < camera.x + canvasWidth; repeatIndex++) {
    for (let tileRow = 0; tileRow < background.raekker; tileRow++) {
      for (let tileCol = 0; tileCol < background.kolonner; tileCol++) {
        const tileId = background.felter[tileRow][tileCol];
        const tileX = repeatIndex * repeatWidth + tileCol * 128 - camera.x;
        const tileY = tileRow * 128 - camera.y;
        if (tileId && tileX > -128 && tileX < canvasWidth && tileY > -128 && tileY < 768) {
          drawSpriteById(canvasCtx, manifest, textures, config.baggrund.base + tileId, tileX, tileY);
        }
      }
    }
  }
  };

  /** Draws the animated sign in the upper area. */
  const drawSign = (camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
  if (texts.skilt) {
    drawAnimation(canvasCtx, manifest, textures, cachedPlayer("skilt", texts.skilt.film), toScreenX(texts.skilt.x), toScreenY(texts.skilt.y));
  }
  };

  /** Draws all attractions on row `c` (0 = back, 1 = front): construction, animation, money/heart signs, coin and countdowns. `s` = timestamp, `e` = now (s), `r` = camera. */
  const drawAttractions = (row, timestamp, nowSec, camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
    for (const attraction of zoo.sev) {
      if (slotSide(attraction.nr) !== row) {
        continue;
      }
      const { p: slotPos, x: originX, y: originY } = attractionAnchor(attraction.nr);
      if (originX + 640 < camera.x || originX - 640 > camera.x + canvasWidth) {
        continue;
      }
      if (attraction.bygger) {
        drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`byg${attraction.nr}-${nowSec < attraction.slut ? 0 : 1}`, attractionCfg.byg[nowSec < attraction.slut ? 0 : 1]), toScreenX(originX), toScreenY(originY));
        if (attraction.slut - nowSec >= 1) {
          drawCountdown(formatDuration(attraction.slut - nowSec), toScreenX(originX), toScreenY(originY), attractionCfg.nedtaelling.hoejde[0]);
        }
        continue;
      }
      if (drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`sev${attraction.nr}-${attraction.type}`, attractionCfg.film[attraction.type]), toScreenX(originX), toScreenY(originY)), attraction.type < 1) {
        continue;
      }
      const moneySignPos = offsetPoint(slotPos, attractionCfg.pengeskilt);
      const heartSignPos = offsetPoint(slotPos, attractionCfg.hjerteskilt);
      drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`penge${attraction.nr}`, attractionCfg.pengeskilt.film, false), toScreenX(moneySignPos.x), toScreenY(moneySignPos.y));
      if (hasAnimalActions(zoo, attraction.nr)) {
        drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`hjerte${attraction.nr}`, attractionCfg.hjerteskilt.film, false), toScreenX(heartSignPos.x), toScreenY(heartSignPos.y));
      }
      const coinSprite = attractionCfg.moent.sprite + Math.floor(timestamp / (1e3 / attractionCfg.moent.fps)) % attractionCfg.moent.antal;
      drawSpriteById(canvasCtx, manifest, textures, coinSprite, toScreenX(moneySignPos.x), toScreenY(moneySignPos.y + attractionCfg.moent.dy), attractionCfg.moent.skala, attraction.alfa.v / 255);
      if (attraction.visTil > nowSec && attraction.slut - nowSec >= 1) {
        drawCountdown(formatDuration(attraction.slut - nowSec), toScreenX(moneySignPos.x), toScreenY(moneySignPos.y + attractionCfg.nedtaelling.dyPenge), attractionCfg.nedtaelling.hoejde[1]);
      }
    }
  };

  /** Draws the decoration items of row `c` in z order, with a saw overlay and countdown while they are being built. */
  const drawItems = (row, nowSec, camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
    const zOrder = config.genstand.z;
    for (const item of zoo.genstande.filter((candidate) => candidate.sev >= 0 && slotSide(candidate.sev) === row && zoo.sev[candidate.sev] && !zoo.sev[candidate.sev].bygger).sort((first, second) => zOrder[first.kat] - zOrder[second.kat] || first.plads - second.plads)) {
      const slot = itemSlotsOf(zoo, item.sev)[item.plads];
      if (!slot) {
        continue;
      }
      const attractionPos = attractionSlotPosition(config, item.sev);
      const itemX = attractionPos.x + slot.x;
      const itemY = attractionPos.y + slot.y;
      if (itemX + 300 < camera.x || itemX - 300 > camera.x + canvasWidth) {
        continue;
      }
      const underConstruction = isBuildTimerRunning(item, nowSec);
      drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`gen${item.sev}-${item.plads}-${item.kat}-${item.f}`, config.genstand.film[item.kat][item.f]), toScreenX(itemX), toScreenY(itemY), false, underConstruction ? 85 / 255 : 1);
      if (underConstruction) {
        drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`sav${item.sev}-${item.plads}`, config.genstand.sav), toScreenX(itemX), toScreenY(itemY));
        drawCountdown(formatDuration(item.slut - nowSec), toScreenX(itemX), toScreenY(itemY - 60), 25);
      }
    }
  };

  /** Draws the animals of row `c` (waiting eggs/boxes, countdown or the animated animal and its poof effect). */
  const drawAnimals = (row, nowSec, camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
    for (const animal of zoo.dyr) {
      if (slotSide(animal.sev) !== row) {
        continue;
      }
      const animalPos = animalPosition(zoo, animal);
      if (!(animalPos.x + 400 < camera.x || animalPos.x - 400 > camera.x + canvasWidth)) {
        if (!animal.leveret) {
          const waitOver = nowSec >= animal.slut;
          const waitingAnimation = config.dyr.ikkeAktiv[waitOver ? isAdultStage(animal.f) ? 1 : 2 : 0];
          if (waitOver) {
            drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`ikkeaktiv${animal.id}-${waitingAnimation}`, waitingAnimation), toScreenX(animalPos.x), toScreenY(animalPos.y));
          } else if (animal.slut - nowSec >= 1) {
            drawCountdown(formatDuration(animal.slut - nowSec), toScreenX(animalPos.x), toScreenY(animalPos.y - 74), 25);
          }
          continue;
        }
        if (animal.alfa.v > 0 && drawAnimation(canvasCtx, manifest, textures, animal.spiller, toScreenX(animalPos.x), toScreenY(animalPos.y), animal.spejl, animal.alfa.v / 255, config.dyr.skala[animal.type][animal.f]), animal.poof) {
          const attractionPos = attractionSlotPosition(config, animal.sev);
          drawAnimation(canvasCtx, manifest, textures, animal.poof, toScreenX(attractionPos.x + 640), toScreenY(attractionPos.y + 320));
        }
      }
    }
  };

  /** Draws the shops of row `c`: construction, shop, sign, coin, countdown and the ware on display. */
  const drawShops = (row, timestamp, nowSec, camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
    for (const shop of zoo.boder) {
      if (slotSide(shop.nr) !== row) {
        continue;
      }
      const slotPos = shopSlotPosition(config, shop.nr);
      const shopX = slotPos.x + shopCfg.forskyd[0];
      const shopY = slotPos.y + shopCfg.forskyd[1];
      if (shopX + 400 < camera.x || shopX - 400 > camera.x + canvasWidth) {
        continue;
      }
      if (shop.bygger) {
        const buildStage = nowSec <= shop.slut ? 0 : 1;
        drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`bodbyg${shop.nr}-${buildStage}`, shopCfg.byg[buildStage]), toScreenX(shopX), toScreenY(shopY));
        if (shop.slut - nowSec >= 1) {
          drawCountdown(formatDuration(shop.slut - nowSec), toScreenX(shopX), toScreenY(shopY), 64);
        }
        continue;
      }
      if (drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`bod${shop.nr}-${shop.type}`, shopCfg.film[shop.type]), toScreenX(shopX), toScreenY(shopY)), shop.type < 1) {
        continue;
      }
      const signPos = { x: slotPos.x + shopCfg.skilt.x, y: slotPos.y + shopCfg.skilt.y };
      drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`bodskilt${shop.nr}`, shopCfg.skilt.film, false), toScreenX(signPos.x), toScreenY(signPos.y));
      const coinSprite = attractionCfg.moent.sprite + Math.floor(timestamp / (1e3 / attractionCfg.moent.fps)) % attractionCfg.moent.antal;
      drawSpriteById(canvasCtx, manifest, textures, coinSprite, toScreenX(signPos.x), toScreenY(signPos.y + shopCfg.moentDy), attractionCfg.moent.skala, shop.alfa.v / 255);
      if (shop.slut - nowSec >= 1) {
        drawCountdown(formatDuration(shop.slut - nowSec), toScreenX(signPos.x), toScreenY(signPos.y + shopCfg.tid.dy), shopCfg.tid.hoejde);
      }
      const ware = shopWare(zoo, shop.nr);
      if (ware) {
        drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`vare${shop.nr}-${ware.f}`, shopCfg.vare.film[ware.type][ware.f]), toScreenX(slotPos.x + shopCfg.vare.x), toScreenY(slotPos.y + shopCfg.vare.y));
      }
    }
  };

  /** Draws the buyable land lot at the end of the zoo (top and bottom animation) and its build countdown. */
  const drawLot = (nowSec, camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
    const lotCfg = config.udvidelse;
    const lotX = worldWidth(zoo);
    const worldHeight = config.verden.hoejde;
    if (lotX >= 1 && lotX + lotCfg.filmDx - 640 < camera.x + canvasWidth) {
      drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`grundT-${zoo.lotFilm}`, lotCfg.film.T[zoo.lotFilm]), toScreenX(lotX + lotCfg.filmDx), toScreenY(Math.trunc(worldHeight * lotCfg.filmY[0])));
      drawAnimation(canvasCtx, manifest, textures, cachedPlayer(`grundB-${zoo.lotFilm}`, lotCfg.film.B[zoo.lotFilm]), toScreenX(lotX + lotCfg.filmDx), toScreenY(Math.trunc(worldHeight * lotCfg.filmY[1])));
      if (zoo.lotSlut - nowSec >= 1) {
        drawCountdown(formatDuration(zoo.lotSlut - nowSec), toScreenX(lotX + lotCfg.dx), toScreenY(Math.trunc(worldHeight * lotCfg.y) + lotCfg.tid.dy), lotCfg.tid.h);
      }
    }
  };

  /** Draws the balloons of row `c`. */
  const drawBalloons = (row, camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
    for (const balloon of zoo.balloner) {
      if (balloon.raekke !== row || !balloon.spiller) {
        continue;
      }
      const balloonPos = balloonPosition(zoo, balloon);
      if (!(balloonPos.x + 320 < camera.x || balloonPos.x - 320 > camera.x + canvasWidth)) {
        drawAnimation(canvasCtx, manifest, textures, balloon.spiller, toScreenX(balloonPos.x), toScreenY(balloonPos.y));
      }
    }
  };

  /** Draws the visitors (guests) walking on row `c`. */
  const drawVisitors = (row, camera) => {
    const toScreenX = (worldX) => worldX - camera.x;
    const toScreenY = (worldY) => worldY - camera.y;
    for (const visitor of zoo.gaester) {
      if (!(visitor.raekke !== row || !visitor.spiller || visitor.x + 320 < camera.x || visitor.x - 320 > camera.x + canvasWidth)) {
        drawAnimation(canvasCtx, manifest, textures, visitor.spiller, toScreenX(visitor.x), toScreenY(config.gaester.y[row]), visitor.venstre, 1, config.gaester.skala);
      }
    }
  };

  /** Draws the whole world for one frame. `s` = animation timestamp (ms), `e` = current time in epoch seconds. */
  const draw = (timestamp, nowSec) => {
    const camera = cameraRef.current;
    drawBackground(camera);
    drawSign(camera);
    for (let row = 0; row < 2; row++) {
      drawAttractions(row, timestamp, nowSec, camera);
      drawItems(row, nowSec, camera);
      drawAnimals(row, nowSec, camera);
      drawShops(row, timestamp, nowSec, camera);
      drawLot(nowSec, camera);
      drawBalloons(row, camera);
      drawVisitors(row, camera);
    }
  for (const [key, entry] of playerCache) {
    if (!entry.brugt) {
      playerCache.delete(key);
    }
  }
  };

  return { advancePlayers, draw };
}
