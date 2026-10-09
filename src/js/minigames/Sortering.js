// Sortering ("sorting game"): items ride a conveyor belt in front of a lava pit; the player drags
// each one into the right bin (paper / glass / metal). Right drops fill the thermometer gauge,
// wrong ones lower it. Fill it before time runs out to win.
// Structure: EasedValue (smoothed numbers) -> pure game logic (createGame/tick/advance/grabItem/
// dragTo/dropItem) -> asset loader -> canvas drawing -> createSortingGame factory (default export).
// Game-state property names (tilstand, vare, traek, ...) are Danish and must not change.
import { h } from '../dom.js';
import { createSoundBank, SORTING_SOUNDS } from '../loaders/data-loaders.js';
import { createNarrator, loadNarratorData } from '../audio/audio.js';
import { createLoadingScreen } from './ui-kit.js';
import { drawSpriteFrame } from '../render/canvas-helpers.js';
// Canvas size in pixels.
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 768;
// Sprite ids in the sortering manifest are shifted by this amount from the original numbering.
const SPRITE_ID_OFFSET = -56;
const SPRITES = {
  lava: [1787 + SPRITE_ID_OFFSET, 1788 + SPRITE_ID_OFFSET],
  rum: [1790 + SPRITE_ID_OFFSET, 1791 + SPRITE_ID_OFFSET],
  termometer: 1786 + SPRITE_ID_OFFSET,
  ramme: 1789 + SPRITE_ID_OFFSET,
  // Sprite of item type 0..17.
  vare: (itemType) => 1792 + SPRITE_ID_OFFSET + itemType
};
// KLAR = ready/intro, SPILLER = playing, VUNDET = won, TABT = lost.
const GameState = { KLAR: 0, SPILLER: 2, VUNDET: 3, TABT: 4 };
// The simulation runs at a fixed step of 33 ms (about 30 steps per second).
const TICK_MS = 33;
// Distance between items on the belt (px) and number of item slots circulating on it.
const SLOT_SPACING = 80 * 2;
const SLOT_COUNT = 640 / 80 + 2;
// Vertical position of the items on the belt.
const BELT_Y = 574;
// Belt speed per difficulty in px per ms (original fixed-point values / 65536 * 2).
const BELT_SPEEDS = [8192, 8192, 12288].map((value) => value / 65536 * 2);
// Time limit (ms) and coin reward per difficulty.
const TIME_LIMITS_MS = [6e4, 45e3, 3e4];
const REWARDS = [60, 100, 140];
// Which bin each of the 18 item types belongs to (index into BIN_NAMES).
const ITEM_BIN = [2, 2, 2, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 2, 0, 2, 2];
const BIN_NAMES = ["papir", "glas", "metal"];
// Drop zones of the bins as [left, top, right, bottom] canvas rectangles (same order as BIN_NAMES).
const BIN_RECTS = [[298, 207, 377, 340], [380, 259, 454, 498], [737, 208, 895, 524]];
// Thermometer gauge fill (0..1): starting level, gain per correct item, loss per wrong item, win threshold.
const GAUGE_START = 9830 / 65536;
const GAUGE_GAIN = 6553 / 65536;
const GAUGE_LOSS = 3276 / 65536;
const GAUGE_WIN = 64225 / 65536;
// Thermometer position: x, bottom edge (bund), bar width (b) and full height (h).
const THERMOMETER = { x: 534, bund: 490, b: 56, h: 316 };
// Ease-in-out curve for x in 0..1.
const smoothstep = (x) => x * x * (3 - 2 * x);
// A number that glides toward a target over `duration` ticks using smoothstep easing.
// v = current value, fra = start of the glide, maal = target, f = ticks elapsed, n = duration.
class EasedValue {
  constructor(initial, duration) {
    this.n = duration;
    this.saet(initial);
  }
  // Jump to a value immediately (no animation).
  saet(initial) {
    this.v = initial;
    this.fra = initial;
    this.maal = initial;
    this.f = this.n;
  }
  // Start gliding to a new target (does nothing if it is already the target).
  mod(target) {
    if (target !== this.maal) {
      this.fra = this.v;
      this.maal = target;
      this.f = 0;
    }
  }
  // Advance one tick.
  step() {
    this.f++;
    this.v = this.f < this.n ? this.fra + (this.maal - this.fra) * smoothstep(this.f / this.n) : this.maal;
  }
}
// Build the initial game state. Each belt slot holds an item with eased x/y/scale.
// pos[] = belt x offset per slot, hoved = slot at the head of the belt, fart = belt speed,
// maaler/maalerMaal = gauge (eased / target), traek = dragged slot (-1 none), peger = pointer.
function createGame(difficulty = 0) {
  const items = [];
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    items.push({ synlig: false, type: 0, x: new EasedValue(CANVAS_WIDTH, 4), y: new EasedValue(CANVAS_HEIGHT / 2, 8), skala: new EasedValue(1, 15) });
  }
  return { svaer: difficulty, tilstand: GameState.KLAR, tid: TIME_LIMITS_MS[difficulty], acc: 0, pos: items.map((slotItem, slot) => SLOT_SPACING * slot), hoved: 0, fart: new EasedValue(0, 30), maalerMaal: GAUGE_START, maaler: new EasedValue(0, 30), vare: items, traek: -1, peger: { x: 0, y: 0 }, rigtige: 0, forkerte: 0, beloenning: 0 };
}
// Leave the intro and start the belt moving (it accelerates to the difficulty speed).
function startPlaying(game) {
  game.tilstand = GameState.SPILLER;
  game.fart.mod(BELT_SPEEDS[game.svaer]);
}
// Canvas x of the item in the given slot (belt position minus one slot width).
const slotX = (game, slot) => game.pos[slot] - SLOT_SPACING;
// Give a slot a new random item (shown in every second slot) at its belt position, unless it is being dragged.
function respawnSlot(game, slot) {
  if (slot === game.traek) {
    return;
  }
  const item = game.vare[slot];
  item.synlig = slot % 2 === 0;
  if (item.synlig) {
    item.type = Math.floor(Math.random() * 18);
  }
  item.x.saet(slotX(game, slot));
  item.y.saet(BELT_Y);
  item.skala.saet(1);
}
// One fixed simulation step: move the belt, recycle the leading slot when it leaves the
// screen, update the gauge, check win/lose, and ease every item toward where it should be.
function tick(game) {
  if (game.tilstand === GameState.SPILLER) {
    game.tid -= TICK_MS;
    game.fart.step();
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      game.pos[slot] -= game.fart.v * TICK_MS;
    }
    if (game.pos[game.hoved] < 0) {
      game.pos[game.hoved] += SLOT_COUNT * SLOT_SPACING;
      respawnSlot(game, game.hoved);
      game.hoved = (game.hoved + 1) % SLOT_COUNT;
    }
    game.maaler.mod(game.maalerMaal);
    if (game.maalerMaal >= GAUGE_WIN) {
      game.tilstand = GameState.VUNDET;
      game.beloenning = REWARDS[game.svaer];
      game.traek = -1;
    } else if (game.tid <= 0) {
      game.tid = 0;
      game.tilstand = GameState.TABT;
      game.traek = -1;
    }
  }
  game.maaler.step();
  game.vare.forEach((item, slotIndex) => {
    if (item.skala.maal >= 1) {
      if (slotIndex === game.traek) {
        item.x.mod(game.peger.x);
        item.y.mod(game.peger.y);
      } else {
        item.x.mod(slotX(game, slotIndex));
        item.y.mod(BELT_Y);
      }
    }
    item.x.step();
    item.y.step();
    item.skala.step();
  });
}
// Advance the simulation by dtMs real milliseconds (capped at 250) in fixed TICK_MS steps.
function advance(game, dtMs) {
  for (game.acc += Math.min(dtMs, 250); game.acc >= TICK_MS;) {
    game.acc -= TICK_MS;
    tick(game);
  }
}
// Looks up the clickable bounds of an item sprite; installed by the component once the manifest is loaded.
let getSpriteBounds = () => null;
function setSpriteBoundsLookup(lookup) {
  getSpriteBounds = lookup;
}
// Pointer pressed: start dragging the first visible item under the pointer.
function grabItem(game, pointerX, pointerY) {
  if (game.tilstand === GameState.SPILLER) {
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const item = game.vare[slot];
      if (!item.synlig || item.skala.maal < 1) {
        continue;
      }
      const bounds = getSpriteBounds(item.type);
      if (bounds && pointerX >= item.x.v + bounds.x0 && pointerX <= item.x.v + bounds.x1 && pointerY >= item.y.v + bounds.y0 && pointerY <= item.y.v + bounds.y1) {
        game.traek = slot;
        game.peger = { x: pointerX, y: pointerY };
        return;
      }
    }
  }
}
// Pointer moved: the dragged item follows it.
function dragTo(game, pointerX, pointerY) {
  if (game.traek >= 0) {
    game.peger = { x: pointerX, y: pointerY };
  }
}
// Pointer released: if an item was being dragged and dropped on a bin, score it
// (gauge up for the right bin, down otherwise) and shrink the item away.
// Returns { rigtigt, zone, kasse } for the bin that was hit, or null.
function dropItem(game, pointerX, pointerY) {
  const slot = game.traek;
  if (slot < 0 || (game.traek = -1, game.tilstand !== GameState.SPILLER)) {
    return null;
  }
  const binIndex = BIN_RECTS.findIndex(([left, top, right, bottom]) => pointerX >= left && pointerX <= right && pointerY >= top && pointerY <= bottom);
  if (binIndex < 0) {
    return null;
  }
  const item = game.vare[slot], correct = ITEM_BIN[item.type] === binIndex;
  if (correct) {
    game.maalerMaal = Math.min(1, game.maalerMaal + GAUGE_GAIN);
    game.rigtige++;
  } else {
    game.maalerMaal = Math.max(GAUGE_START, game.maalerMaal - GAUGE_LOSS);
    game.forkerte++;
  }
  item.skala.mod(0);
  return { rigtigt: correct, zone: binIndex, kasse: BIN_NAMES[ITEM_BIN[item.type]] };
}
// Loads the manifest, narrator data and all textures. Resolves to { manifest, images, fortaeller }; rejects on error.
async function loadSortingAssets() {
  const response = await fetch("data/sortering/manifest.json");
  if (!response.ok) {
    throw new Error(`manifest.json: ${response.status}`);
  }
  const manifest = await response.json();
  const narratorData = await loadNarratorData("sortering");
  const images = {};
  await Promise.all(Object.entries(manifest.textures).map(([textureName, textureInfo]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[textureName] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `data/sortering/tex/${textureInfo.file}`;
  })));
  return { manifest: manifest, images: images, fortaeller: narratorData };
}
// Draw a manifest sprite at (x, y), optionally scaled around that point.
function drawSprite(ctx, assets, spriteId, x, y, scale = 1) {
  const sprite = assets.manifest.sprites[spriteId];
  const image = sprite && assets.images[sprite.assetId];
  if (!(!image || scale <= 0)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawSpriteFrame(ctx, image, sprite);
    ctx.restore();
  }
}
// Position of the timer badge and its number.
const TIMER_POSITION = { x: 256, y: 384, tekstY: 394 };
// Draw one frame: background, thermometer, items on the belt, dragged item on top,
// timer, and (when showZones or an item is being dragged) the outlines of the bins.
function drawScene(ctx, game, assets, showZones, font) {
  ctx.fillStyle = "#2a1a10";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  for (const spriteId of SPRITES.lava) {
    drawSprite(ctx, assets, spriteId, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }
  for (const spriteId of SPRITES.rum) {
    drawSprite(ctx, assets, spriteId, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }
  ctx.fillStyle = "#ff0000";
  const gaugeHeight = Math.round(THERMOMETER.h * game.maaler.v);
  if (ctx.fillRect(THERMOMETER.x, THERMOMETER.bund - gaugeHeight, THERMOMETER.b, gaugeHeight), drawSprite(ctx, assets, SPRITES.termometer, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2), game.fortaeller && game.fortaeller.tegn(ctx), game.vare.forEach((item, slotIndex) => {
    if (item.synlig && slotIndex !== game.traek) {
      drawSprite(ctx, assets, SPRITES.vare(item.type), item.x.v, item.y.v, item.skala.v);
    }
  }), game.traek >= 0) {
    const grabbed = game.vare[game.traek];
    drawSprite(ctx, assets, SPRITES.vare(grabbed.type), grabbed.x.v, grabbed.y.v, 1.08);
  }
  drawSprite(ctx, assets, SPRITES.ramme, TIMER_POSITION.x, TIMER_POSITION.y);
  const secondsText = String(Math.max(0, Math.ceil(game.tid / 1e3)));
  if (font) {
    font.tegn(ctx, secondsText, TIMER_POSITION.x, TIMER_POSITION.tekstY, { str: 73, midt: true, op: true });
  }
  if (showZones || game.traek >= 0) {
    ctx.lineWidth = 4;
    BIN_RECTS.forEach(([left, top, right, bottom], binIndex) => {
      ctx.strokeStyle = showZones ? "rgba(80,255,120,.9)" : "rgba(255,255,255,.55)";
      ctx.strokeRect(left, top, right - left, bottom - top);
      if (showZones) {
        ctx.fillStyle = "rgba(80,255,120,.95)";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.fillText(BIN_NAMES[binIndex], (left + right) / 2, top - 20);
      }
    });
  }
}
// Props: difficulty (0..2), paused, soundOn, font (bitmap text renderer), onFinish({ vundet, beloenning })
// called 1.5 s after the game ends.
// Returns {el, update({pause, lydTil, skrift, ...}), destroy}; `el` is the loading screen first and is swapped for the game when loaded.
function createSortingGame({ svaer: difficulty = 0, pause: paused = false, lydTil: soundOn = true, skrift: font = null, paaSlut: onFinish = () => {
} } = {}) {
  let destroyed = false;
  let canvas = null;
  let assets = null;
  let game = null;
  let sounds = null;
  let narrator = null;
  let stopLoop = null;
  const showZones = false; // set true in devtools code to outline the bins
  const loading = createLoadingScreen({ bredde: 1280 });
  const handle = { el: loading.el, update: update, destroy: destroy };
  // Replace the loading screen with the real content.
  const showContent = (content) => {
    loading.el.replaceWith(content);
    loading.destroy();
    handle.el = content;
  };
  // Starts the game once the assets are loaded.
  const startGame = () => {
    setSpriteBoundsLookup((itemType) => {
      const sprite = assets.manifest.sprites[SPRITES.vare(itemType)];
      return sprite && { x0: -sprite.ox, y0: -sprite.oy, x1: sprite.w - sprite.ox, y1: sprite.h - sprite.oy };
    });
    game = createGame(difficulty);
    sounds = createSoundBank(Object.values(SORTING_SOUNDS));
    sounds.saetTil(soundOn);
    let lastState = game.tilstand;
    narrator = createNarrator(assets.fortaeller);
    game.fortaeller = narrator;
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.kaede([1, 2]);
    }
    // Play a narrator voice line (if any), then narrator.slump().
    const narratorSay = (lineId) => {
      if (narrator) {
        narrator.spil(lineId);
        narrator.slump();
      }
    };
    game.fortSpil = narratorSay;
    const ctx = canvas.getContext("2d");
    let frameId;
    let lastTime = performance.now();
    // endTime: timestamp when the game ended (0 = running); finished: onFinish already fired.
    let endTime = 0;
    let finished = false;
    // One animation frame. While paused only the picture is redrawn; otherwise the narrator and
    // simulation advance, state changes trigger sounds/voice lines, and onFinish fires 1.5 s after the end.
    const frame = (now) => {
      if (paused) {
        lastTime = now;
        drawScene(ctx, game, assets, showZones, font);
        frameId = requestAnimationFrame(frame);
        return;
      }
      if (narrator) {
        narrator.tik(now - lastTime);
        if (game.tilstand === GameState.KLAR && !narrator.introAktiv()) {
          startPlaying(game);
          sounds.loekke(SORTING_SOUNDS.baand, 0.35);
          narratorSay(4);
        }
      }
      advance(game, now - lastTime);
      lastTime = now;
      drawScene(ctx, game, assets, showZones, font);
      if (game.tilstand !== lastState) {
        if (game.tilstand !== GameState.SPILLER) {
          sounds.stop(SORTING_SOUNDS.baand);
        }
        if (game.tilstand === GameState.VUNDET) {
          sounds.spil(SORTING_SOUNDS.jingle);
          narratorSay(12);
        }
        if (game.tilstand === GameState.TABT) {
          narratorSay(13);
        }
        if (game.tilstand === GameState.VUNDET || game.tilstand === GameState.TABT) {
          endTime = now;
        }
        lastState = game.tilstand;
      }
      if (endTime && !finished && now - endTime > 1500 && !(narrator && narrator.optaget())) {
        finished = true;
        onFinish({ vundet: game.tilstand === GameState.VUNDET, beloenning: game.tilstand === GameState.VUNDET ? game.beloenning : 0 });
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    stopLoop = () => {
      cancelAnimationFrame(frameId);
      sounds.stopAlle();
      if (narrator) {
        narrator.stop();
      }
    };
  };
  // Convert a pointer event to 1280x768 canvas coordinates.
  const pointerToCanvas = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * CANVAS_WIDTH / rect.width, (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height];
  };
  // Press: skip narrator speech / start the belt on first click / otherwise try to grab an item.
  const handlePointerDown = (event) => {
    if (!(!game || paused)) {
      if (game.fortaeller && game.tilstand !== GameState.SPILLER) {
        game.fortaeller.spring();
        return;
      }
      if (game.tilstand === GameState.KLAR) {
        startPlaying(game);
        if (sounds != null) {
          sounds.loekke(SORTING_SOUNDS.baand, 0.35);
        }
        return;
      }
      try {
        if (canvas.setPointerCapture != null) {
          canvas.setPointerCapture(event.pointerId);
        }
      }
      catch {
      }
      grabItem(game, ...pointerToCanvas(event));
    }
  };
  const handlePointerMove = (event) => {
    if (game && !paused) {
      dragTo(game, ...pointerToCanvas(event));
    }
  };
  // Release: drop the item; narrator comments on the result (voice line depends on bin and correctness).
  const handlePointerUp = (event) => {
    if (!game || paused) {
      return;
    }
    const wasDragging = game.traek >= 0 && game.tilstand === GameState.SPILLER;
    const result = dropItem(game, ...pointerToCanvas(event));
    if (game.fortSpil && wasDragging) {
      game.fortSpil(result ? result.zone + (result.rigtigt ? 5 : 8) : 11);
    }
    if (result) {
      if (sounds != null) {
        sounds.spil(SORTING_SOUNDS.slip);
      }
      if (!(result.rigtigt || sounds == null)) {
        sounds.spil(SORTING_SOUNDS.forkert);
      }
    }
  };
  function update(next = {}) {
    if ("pause" in next) {
      paused = next.pause;
    }
    if ("paaSlut" in next) {
      onFinish = next.paaSlut;
    }
    if ("skrift" in next) {
      font = next.skrift;
    }
    if ("lydTil" in next) {
      soundOn = next.lydTil;
      if (sounds) {
        sounds.saetTil(soundOn);
      }
      if (narrator) {
        narrator.saetLyd(soundOn);
      }
    }
  }
  function destroy() {
    destroyed = true;
    if (stopLoop) {
      stopLoop();
      stopLoop = null;
    }
    loading.destroy();
  }
  loadSortingAssets().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    canvas = h("canvas", { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, style: { touchAction: "none", cursor: "grab" }, onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp, onPointerCancel: handlePointerUp });
    showContent(h("div", { className: "spilflade" }, canvas));
    startGame();
  }, (error) => {
    if (destroyed) {
      return;
    }
    showContent(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kopiér dataene fra web/public/data til spil/public/data.")));
  });
  return handle;
}
export { createSortingGame as default };
