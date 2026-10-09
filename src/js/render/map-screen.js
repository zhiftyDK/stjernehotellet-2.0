// The world map ("kort") screen: scrolling tile map, drifting clouds, minigame markers and the HUD.
import { HUD_SHIFT, GAME_WIDTH, WIDTH_EXTRA } from '../engine/constants.js';
import { AnimationPlayer } from '../engine/animation.js';
import { createFigureOverlay, drawSprite, drawAnimation } from './canvas-helpers.js';
// The world map screen. Params: mapConfig (tiles, clouds, minigame markers, HUD positions), manifest/images,
// foreground and background tile layers, hud assets, figureConfig (heads overlay), headsRunner (Hc instance), font.
// Returns { kam: camera, tilstand: state (0 = browsing, 2 = minigame selected), vis, klem (clamp camera),
// fremad(dtMs, onMinigameDone), tegn(ctx, {penge, rubiner}), klik(point), stop }.
export function Tv({ K: mapConfig, M: manifest, I: images, forgrund: foregroundLayer, baggrund: backgroundLayer, hud: hudAssets, HV: figureConfig, hoveder: headsRunner, skrift: font }) {
  const foregroundTileSize = manifest.sprites[mapConfig.forgrund.base].w;
  const backgroundTileSize = manifest.sprites[mapConfig.baggrund.base].w;
  // Touching images[...] makes the lazy texture loader start loading that sprite's texture.
  const preloadSprite = (spriteId) => {
    const sprite = manifest.sprites[spriteId];
    if (sprite) {
      images[sprite.assetId];
    }
  };
  for (let frameIndex = 1; frameIndex <= mapConfig.forgrund.antal; frameIndex++) {
    preloadSprite(mapConfig.forgrund.base + frameIndex);
  }
  for (let frameIndex = 1; frameIndex <= mapConfig.baggrund.antal; frameIndex++) {
    preloadSprite(mapConfig.baggrund.base + frameIndex);
  }
  mapConfig.skyer.billeder.flat().forEach(preloadSprite);
  const mapWidth = foregroundLayer.kolonner * foregroundTileSize;
  const mapHeight = foregroundLayer.raekker * foregroundTileSize;
  // Camera position (top-left of the visible 1024x768-ish area in map pixels); starts centred horizontally.
  const camera = { x: Math.trunc((mapWidth - GAME_WIDTH) / 2), y: Math.trunc((mapHeight - 768) / 4) };
  const randomBetween = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const toRgb = (color) => `rgb(${color[0]},${color[1]},${color[2]})`;
  // Numbers of minigames that are locked (drawn dimmed with a padlock and not clickable).
  const lockedMinigames = new Set();
  const animationById = new Map(manifest.animations.map((animation) => [animation.id, animation]));
  const createPlayer = (animationId) => {
    const animationData = animationById.get(animationId);
    const player = animationData ? new AnimationPlayer(animationData) : null;
    if (player) {
      player.advance(0);
    }
    return player;
  };
  // Minigame markers on the map: `ro` = idle animation, `frem` = one-shot "pressed" animation.
  const minigames = mapConfig.minispil.map((minigame) => ({ ...minigame, ro: createPlayer(minigame.film[0]), frem: null }));
  const isSelectable = () => true;
  const cloudConfig = mapConfig.skyer;
  const clouds = Array.from({ length: cloudConfig.antal }, () => ({}));
  // (Re)initialises a drifting cloud; on the initial spawn it is placed randomly along the sky,
  // afterwards it re-enters at the entry edge (cloudConfig.ind).
  const respawnCloud = (cloud, initialSpawn) => {
    cloud.type = randomBetween(0, 2);
    const cloudType = cloudConfig.typer[cloud.type];
    const cloudSprites = cloudConfig.billeder[cloud.type];
    cloud.sprite = cloudSprites[randomBetween(0, cloudSprites.length - 1)];
    cloud.x = initialSpawn ? randomBetween(cloudConfig.start[0], cloudConfig.start[1]) : cloudConfig.ind;
    cloud.y = randomBetween(cloudType.y[0], cloudType.y[1]);
    cloud.fart = randomBetween(cloudType.fart[0], cloudType.fart[1]);
  };
  // Keep clouds sorted by speed so slower (farther) clouds are drawn first.
  const sortClouds = () => clouds.sort((a, b) => a.fart - b.fart);
  clouds.forEach((cloud) => respawnCloud(cloud, true));
  sortClouds();
  let cloudTickAccumulator = 0;
  const figureOverlay = createFigureOverlay(hudAssets.M, hudAssets.I, figureConfig, WIDTH_EXTRA);
  let screenState = 0;
  let selectedMinigame = -1;
  let hudHitboxes = [];
  const drawTileLayer = (ctx, layer, baseId, tileSize, originX, originY) => {
    for (let row = 0; row < layer.raekker; row++) {
      const tileY = originY + row * tileSize;
      if (!(tileY <= -tileSize || tileY >= 768)) {
        for (let col = 0; col < layer.kolonner; col++) {
          const tileX = originX + col * tileSize;
          const tile = layer.felter[row][col];
          if (tile > 0 && tileX > -tileSize && tileX < GAME_WIDTH) {
            drawSprite(ctx, manifest, images, baseId + tile, tileX, tileY);
          }
        }
      }
    }
  };
  return { kam: camera, get tilstand() {
      return screenState;
    }, vis() {
      screenState = 0;
      selectedMinigame = -1;
      headsRunner.start(mapConfig.scripts.start);
    }, klem() {
      camera.x = Math.max(0, Math.min(mapWidth - GAME_WIDTH, camera.x));
      camera.y = Math.max(0, Math.min(mapHeight - 768, camera.y));
    }, fremad(dtMs, onMinigameDone) {
      headsRunner.tik(dtMs);
      figureOverlay.fremad(dtMs, headsRunner.taler);
      for (const minigame of minigames) {
        if (minigame.ro) {
          minigame.ro.advance(dtMs);
        }
        if (minigame.frem) {
          minigame.frem.advance(dtMs);
          if (minigame.frem.finished) {
            minigame.frem = null;
          }
        }
      }
      for (cloudTickAccumulator += Math.min(250, dtMs); cloudTickAccumulator >= 33;) {
        cloudTickAccumulator -= 33;
        let resortNeeded = false;
        for (const cloud of clouds) {
          cloud.x += cloud.fart;
          if (cloud.x >= cloudConfig.ude) {
            respawnCloud(cloud, false);
            resortNeeded = true;
          }
        }
        if (resortNeeded) {
          sortClouds();
        }
      }
      if (screenState === 2 && !headsRunner.taler) {
        screenState = 0;
        const finishedMinigame = selectedMinigame;
        selectedMinigame = -1;
        onMinigameDone(finishedMinigame);
      }
    }, tegn(ctx, { penge: money, rubiner: rubies }) {
      this.klem();
      const cameraX = Math.round(camera.x);
      const cameraY = Math.round(camera.y);
      ctx.fillStyle = toRgb(mapConfig.hav);
      ctx.fillRect(0, 0, GAME_WIDTH, 768);
      drawTileLayer(ctx, backgroundLayer, mapConfig.baggrund.base, backgroundTileSize, 0, -cameraY);
      const cloudCameraX = camera.x * cloudConfig.kamera.x;
      const cloudCameraY = camera.y + cloudConfig.kamera.dy;
      for (const cloud of clouds) {
        drawSprite(ctx, manifest, images, cloud.sprite, Math.trunc(cloud.x * GAME_WIDTH / 65536) - cloudCameraX, Math.trunc(cloud.y * 768 / 65536) - cloudCameraY);
      }
      drawTileLayer(ctx, foregroundLayer, mapConfig.forgrund.base, foregroundTileSize, -cameraX, -cameraY);
      for (const orderIndex of mapConfig.raekkefoelge) {
        const minigame = minigames[orderIndex];
        const unlocked = !lockedMinigames.has(orderIndex);
        drawAnimation(ctx, manifest, images, minigame.frem || minigame.ro, minigame.x - cameraX, minigame.y - cameraY, false, unlocked ? 1 : 128 / 255);
        if (!unlocked) {
          drawSprite(ctx, manifest, images, mapConfig.laas, minigame.x - cameraX, minigame.y - cameraY);
        }
      }
      hudHitboxes = [];
      ctx.save();
      ctx.translate(-HUD_SHIFT, 0);
      const addHudSprite = (name) => {
        const [spriteId, x, y] = mapConfig.hud[name];
        drawSprite(ctx, hudAssets.M, hudAssets.I, spriteId, x, y);
        const frame = hudAssets.M.sprites[spriteId];
        if (frame) {
          hudHitboxes.push({ navn: name, x0: x - frame.ox - HUD_SHIFT, y0: y - frame.oy, x1: x - frame.ox + frame.w - HUD_SHIFT, y1: y - frame.oy + frame.h });
        }
      };
      addHudSprite("tavle");
      addHudSprite("rubin");
      addHudSprite("moent");
      addHudSprite("plus");
      const drawAmount = (text, [x, y, , height]) => font.tegn(ctx, text, x, y + height / 2, { str: 37 });
      drawAmount(String(Math.round(money)), mapConfig.hud.penge);
      drawAmount(String(rubies), mapConfig.hud.rubiner);
      ctx.restore();
      figureOverlay.tegn(ctx, headsRunner.tilstand);
    }, klik(point) {
      const hudHit = [...hudHitboxes].reverse().find((box) => point.x >= box.x0 && point.x <= box.x1 && point.y >= box.y0 && point.y <= box.y1);
      if (hudHit) {
        return hudHit.navn === "plus" || hudHit.navn === "rubin" ? { art: "rubiner" } : { art: "hud" };
      }
      if (screenState !== 0) {
        return null;
      }
      const worldX = point.x + camera.x;
      const worldY = point.y + camera.y;
      const minigame = minigames.find((candidate) => isSelectable(candidate.nr) && worldX >= candidate.x - candidate.b / 2 && worldX <= candidate.x + candidate.b / 2 && worldY >= candidate.y - candidate.h / 2 && worldY <= candidate.y + candidate.h / 2);
      return minigame ? lockedMinigames.has(minigame.nr) ? { art: "laast", nr: minigame.nr } : (headsRunner.spilLyd(mapConfig.trykLyd), minigame.frem = createPlayer(minigame.film[1]), headsRunner.start(mapConfig.scripts.valgt, { v0: minigame.nr }), selectedMinigame = minigame.nr, screenState = 2, { art: "valgt", nr: minigame.nr }) : null;
    }, stop() {
      headsRunner.stop();
    } };
}
