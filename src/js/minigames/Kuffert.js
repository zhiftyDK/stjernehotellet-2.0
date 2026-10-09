// Suitcase minigame ("Kuffert"): a truck drives in carrying three guests. Each guest shows the silhouette of the suitcase
// that belongs to them, while three suitcases stand in a row in the wrong order. The player taps one suitcase and then another
// to swap them, and presses the button when each suitcase is below its owner. A correct row makes the suitcases hop into the truck,
// which drives off and a new round starts; after data.runder rounds the game is won. A wrong row costs a life (red light);
// the game is lost when all lives are gone.
//
// Logic is in plain functions that mutate a state object in fixed 33 ms ticks; the factory handles input, sound and drawing.
// Property names (Danish) come from data/kuffert/spil.json and are kept as they are.
import { h } from '../dom.js';
import { Tween } from '../engine/tween.js';
import { createSoundBank, SUITCASE_SOUNDS } from '../loaders/data-loaders.js';
import { createNarrator, loadNarratorData } from '../audio/audio.js';
import { createLoadingScreen } from './ui-kit.js';
import { drawSpriteFrame } from '../render/canvas-helpers.js';
import { AnimationPlayer } from '../engine/animation.js';
// Inclusive random integer in [min, max].
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
// Brightness table (0..1, parabola) for a lamp blink lasting `steps` ticks; the last step is 0.
// getLightLevel: current lamp brightness (0..255) at tick `step` of the blink, or 0 once it is over.
const makeBlinkTable = (steps) => Array.from({ length: steps }, (unused, index) => index === steps - 1 ? 0 : 1 - (-1 + 2 * index / (steps - 1)) ** 2);
const getLightLevel = (state, step) => step < state.lysTabel.length ? state.lysTabel[step] * 255 : 0;
// An "ease" is a number that glides from one value to another over `steps` ticks.
// v=current, fra=start, til=target, trin=steps, i=current step. power (potens): 2 = cosine ease-in/out, 3 = sine ease-out, otherwise linear.
function createEase(value, steps, power = 2) {
  return { v: value, fra: value, til: value, trin: steps, i: steps, potens: power };
}
// Start gliding towards `target` (no-op if it already is the target).
function easeTo(ease, target) {
  if (ease.til !== target) {
    ease.fra = ease.v;
    ease.til = target;
    ease.i = 0;
  }
}
// Jump to `value` with no glide.
function setEaseInstantly(ease, value) {
  ease.v = value;
  ease.fra = value;
  ease.til = value;
  ease.i = ease.trin;
}
// Advance an ease by one tick.
function stepEase(ease) {
  if (ease.i++, ease.i < ease.trin) {
    const progress = ease.i / (ease.trin - 1);
    const eased = ease.potens === 3 ? Math.sin(Math.PI / 2 * progress) : ease.potens === 2 ? (1 - Math.cos(Math.PI * progress)) / 2 : progress;
    ease.v = ease.fra + (ease.til - ease.fra) * eased;
  } else {
    ease.v = ease.til;
  }
}
// True while the value has not reached its target yet.
const isEasing = (ease) => ease.v !== ease.til;
// Phases of a round: KOERER_IND (truck drives in), SPILLER (player rearranges suitcases), LAESSER (suitcases are loaded),
// KOERER_UD (truck leaves), VUNDET (won), TABT (lost).
const TruckPhase = { KOERER_IND: "ind", SPILLER: "spiller", LAESSER: "laesser", KOERER_UD: "ud", VUNDET: "vundet", TABT: "tabt" };
// Top-left screen position of the truck sprite for a stop position (0 = off-screen start, 1 = parked, 2 = driving away);
// the truck data is stored centred, 640/384 is the screen centre.
const getTruckX = (data, position) => data.lastbil.x[position] - data.lastbil.bredde / 2 + 640;
const getTruckY = (data, position) => data.lastbil.y[position] - data.lastbil.hoejde / 2 + 384;
// Anchor of the check button as a fraction of its sprite size (falls back to bottom-centre).
function getButtonAnchor(data, manifest) {
  const sprite = manifest && manifest.sprites[data.knap.sprite];
  return sprite && sprite.w && sprite.h ? [sprite.ox / sprite.w, sprite.oy / sprite.h] : [0.5, 1];
}
// Initial state. kState is the suitcase state machine: 0 = falling into place, 1 = player may swap them, 2 = hopping into the truck,
// 3 = moving to the truck, 4 = riding with the truck. raekke[slot] = which suitcase currently stands in each of the three slots.
function createGameState(data, difficulty = 0, manifest = null) {
  const difficultyConfig = data.svaerhed[difficulty];
  const state = { haandAnker: getButtonAnchor(data, manifest), data: data, svaer: difficulty, sv: difficultyConfig, tilstand: TruckPhase.KOERER_IND, tid: 0, rest: 0, liv: difficultyConfig.liv, omgang: 0, point: 0, bil: { x: createEase(getTruckX(data, 0), data.lastbil.trin), y: createEase(getTruckY(data, 0), data.lastbil.trin), pos: 0 }, gaester: [], kufferter: [], raekke: [0, 1, 2], valgt: -1, kState: 0, hop: 0, hopTid: 0, lysTabel: makeBlinkTable(data.lys.blink), groen: data.lys.blink, roed: data.lys.blink, livVis: new Tween(0, data.liv.fade), fjeder: -1, lyde: [] };
  setupRound(state);
  moveTruckTo(state, 1);
  state.lyde.push("tomgang");
  return state;
}
// Glide the truck to a stop position (2 also starts the driving sound).
function moveTruckTo(state, position) {
  const data = state.data;
  easeTo(state.bil.x, getTruckX(data, position));
  easeTo(state.bil.y, getTruckY(data, position));
  state.bil.pos = position;
  if (position === 2) {
    state.lyde.push("koer");
  }
}
// Start a new round: pick three different suitcase forms (from the difficulty's interval) and three different guest looks,
// then shuffle the suitcase row into a wrong order (one of 5 permutations) and drop the suitcases in from above.
function setupRound(state) {
  const data = state.data;
  const intervals = state.sv.intervaller;
  const [minForm, maxForm] = intervals.length === 1 ? intervals[0] : state.svaer === 0 ? randomInt(0, 2) === 0 ? intervals[0] : intervals[1] : randomInt(0, 1) === 0 ? intervals[0] : intervals[1];
  const forms = [];
  for (; forms.length < 3;) {
    const form = randomInt(minForm, maxForm);
    if (!forms.includes(form)) {
      forms.push(form);
    }
  }
  const people = [];
  for (; people.length < 3;) {
    const person = randomInt(0, data.gaester.hoved.length - 1);
    if (!people.includes(person)) {
      people.push(person);
    }
  }
  state.gaester = forms.map((form, index) => ({ form: form, person: people[index] }));
  const rowOrders = [[1, 2, 0], [2, 0, 1], [1, 0, 2], [0, 2, 1], [2, 1, 0]];
  state.raekke = [...rowOrders[randomInt(0, rowOrders.length - 1)]];
  const suitcaseData = data.kufferter;
  state.kufferter = forms.map((form) => ({ form: form, x: createEase(0, 15), y: createEase(suitcaseData.yFra, 8, 3), skala: createEase(1, 15) }));
  state.raekke.forEach((suitcaseIndex, slot) => {
    setEaseInstantly(state.kufferter[suitcaseIndex].x, suitcaseData.x[slot]);
    easeTo(state.kufferter[suitcaseIndex].y, suitcaseData.yHvile);
  });
  state.kState = 0;
  state.valgt = -1;
  state.hop = suitcaseData.hop.length - 1;
}
// Current screen position and scale of a suitcase (it follows the truck once loaded, and hops while being loaded).
const getSuitcasePosition = (state, index) => {
  const suitcase = state.kufferter[index];
  let x = suitcase.x.v;
  if (state.kState === 4) {
    x += state.bil.x.v - getTruckX(state.data, 1);
  }
  return { x: x, y: suitcase.y.v + state.data.kufferter.hop[state.hop], skala: suitcase.skala.v };
};
// Current truck position.
const getTruckPosition = (state) => ({ x: state.bil.x.v, y: state.bil.y.v });
// One 33 ms tick: advance all glides, the lamps, the spring mascot (fjeder), the suitcase state machine and the truck phases.
function updateGame(state) {
  const data = state.data;
  state.tid += 33;
  stepEase(state.bil.x);
  stepEase(state.bil.y);
  for (const suitcase of state.kufferter) {
    stepEase(suitcase.x);
    stepEase(suitcase.y);
    stepEase(suitcase.skala);
  }
  if (state.groen < state.lysTabel.length) {
    state.groen++;
  }
  if (state.roed < state.lysTabel.length) {
    state.roed++;
  }
  state.livVis.mod(state.liv * 255);
  state.livVis.trin();
  if (state.fjeder >= 0) {
    state.fjeder += 33;
    if (state.fjeder > 9 * 83) {
      state.fjeder = -1;
    }
  }
  const suitcaseData = data.kufferter;
  if (state.kState === 0 && !isEasing(state.kufferter[0].y)) {
    state.kState = 1;
  } else if (state.kState === 2) {
    if (state.hop >= suitcaseData.hop.length - 1) {
      state.raekke.forEach((suitcaseIndex, slot) => {
        easeTo(state.kufferter[suitcaseIndex].x, suitcaseData.maal[slot]);
      });
      for (const suitcase of state.kufferter) {
        suitcase.y = createEase(suitcase.y.v, 8, 3);
        easeTo(suitcase.y, suitcaseData.yMaal);
        suitcase.skala = createEase(suitcase.skala.v, 8, 3);
        easeTo(suitcase.skala, 0.5);
      }
      state.kState = 3;
    } else if (state.tid > state.hopTid) {
      state.hop++;
      state.hopTid = state.tid + suitcaseData.hopTrin;
    }
  } else if (state.kState === 3 && !isEasing(state.kufferter[0].y)) {
    state.kState = 4;
  }
  switch (state.tilstand) {
    case TruckPhase.KOERER_IND:
      if (!isEasing(state.bil.x)) {
        state.lyde.push("bremse");
        state.tilstand = TruckPhase.SPILLER;
      }
      break;
    case TruckPhase.LAESSER:
      if (state.kState === 4) {
        moveTruckTo(state, 2);
        state.tilstand = TruckPhase.KOERER_UD;
      }
      break;
    case TruckPhase.KOERER_UD:
      if (!isEasing(state.bil.x) && !state.replik) {
        if (state.omgang < data.runder) {
          setEaseInstantly(state.bil.x, getTruckX(data, 0));
          setEaseInstantly(state.bil.y, getTruckY(data, 0));
          setupRound(state);
          moveTruckTo(state, 1);
          state.tilstand = TruckPhase.KOERER_IND;
        } else {
          state.tilstand = TruckPhase.VUNDET;
        }
      }
      break;
  }
}
// Run as many fixed ticks as fit in dtMs (max 250 ms per frame so lag cannot cause a huge jump).
function stepGame(state, dtMs) {
  for (state.rest += Math.min(dtMs, 250); state.rest >= 33;) {
    state.rest -= 33;
    updateGame(state);
  }
}
// True if (x,y) is within the suitcase's hit box (felt = half width/height around its position).
const isSuitcaseHit = (state, index, x, y) => {
  const position = getSuitcasePosition(state, index);
  const [halfWidth, halfHeight] = state.data.kufferter.felt;
  return x > position.x - halfWidth && x < position.x + halfWidth && y > position.y - halfHeight && y < position.y + halfHeight;
};
// Handle a tap at (x,y). While swapping is allowed the first tap selects a suitcase (returns "valgt"), tapping another one swaps
// them (returns "byttet"); tapping elsewhere deselects. Tapping the check button returns "rigtigt" if every suitcase is in its own slot
// (starts loading; the last round sets the reward) or "forkert" (loses a life). Returns null if nothing happened.
function handleTap(state, x, y) {
  const isPlaying = state.tilstand === TruckPhase.SPILLER;
  if (!isPlaying && !(state.tilstand === TruckPhase.KOERER_IND && state.omgang > 0)) {
    return null;
  }
  const data = state.data;
  if (state.kState === 1) {
    const hitIndex = [0, 1, 2].find((index) => isSuitcaseHit(state, index, x, y));
    if (hitIndex === void 0) {
      state.valgt = -1;
      for (const suitcase of state.kufferter) {
        easeTo(suitcase.skala, 1);
      }
    } else {
      if (state.valgt < 0) {
        state.valgt = hitIndex;
        easeTo(state.kufferter[hitIndex].skala, 73728 / 65536);
        return "valgt";
      }
      if (state.valgt !== hitIndex) {
        const selectedIndex = state.valgt;
        const targetX = state.kufferter[selectedIndex].x.til;
        easeTo(state.kufferter[selectedIndex].x, state.kufferter[hitIndex].x.til);
        easeTo(state.kufferter[hitIndex].x, targetX);
        const selectedSlot = state.raekke.indexOf(selectedIndex);
        const hitSlot = state.raekke.indexOf(hitIndex);
        state.raekke[selectedSlot] = hitIndex;
        state.raekke[hitSlot] = selectedIndex;
        state.lyde.push("byt");
      }
      state.valgt = -1;
      for (const suitcase of state.kufferter) {
        easeTo(suitcase.skala, 1);
      }
      return "byttet";
    }
  }
  if (!isPlaying) {
    return null;
  }
  const button = data.knap;
  const [width, height] = button.felt;
  const [anchorX, anchorY] = state.haandAnker;
  const left = button.x - Math.trunc(width * anchorX);
  const top = button.y - Math.trunc(height * anchorY);
  return x > left && x < left + width && y > top && y < top + height ? state.raekke.every((suitcaseIndex, slot) => suitcaseIndex === slot) ? (state.groen = 0, state.omgang += 1, state.omgang >= data.runder && (state.point = state.sv.beloenning, state.lyde.push("vundet")), state.lyde.push("rigtig"), state.fjeder = 0, state.kState = 2, state.hop = 0, state.hopTid = state.tid + data.kufferter.hopTrin, state.valgt = -1, state.tilstand = TruckPhase.LAESSER, "rigtigt") : (state.roed = 0, state.liv -= 1, state.liv <= 0 && (state.tilstand = TruckPhase.TABT), "forkert") : null;
}
// Loads game data, sprite manifest, narrator data and all textures.
// Resolves to {spil, manifest, images, fortaeller}; rejects on error.
async function loadGameAssets() {
  const [gameData, manifest, narratorData] = await Promise.all([fetch("data/kuffert/spil.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`spil.json: ${response.status}`))), fetch("data/kuffert/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))), loadNarratorData("kuffert")]);
  const images = {};
  await Promise.all(Object.entries(manifest.textures).map(([textureId, texture]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      images[textureId] = image;
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `data/kuffert/tex/${texture.file}`;
  })));
  return { spil: gameData, manifest: manifest, images: images, fortaeller: narratorData };
}
// Draw a manifest sprite at (x,y) with scale and alpha.
function drawSprite(ctx, manifest, images, spriteId, x, y, scale = 1, alpha = 1) {
  const frame = manifest.sprites[spriteId];
  const image = frame && images[frame.assetId];
  if (!(!image || alpha <= 0)) {
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawSpriteFrame(ctx, image, frame);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
// Draw the current frame of an animation player (all parts) at (x,y).
function drawAnimation(ctx, manifest, images, player, x, y) {
  if (player) {
    for (const part of player.drawList("invers")) {
      const frame = manifest.sprites[part.sprite];
      const image = frame && images[frame.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x + part.x, y + part.y);
        ctx.rotate((part.rot || 0) * Math.PI * 2);
        ctx.scale(part.scaleX * (part.flip ? -1 : 1), part.scaleY);
        ctx.globalAlpha = part.alpha;
        drawSpriteFrame(ctx, image, frame);
        ctx.restore();
      }
    }
  }
}
// The minigame factory. Props: svaer = difficulty, pause, lydTil = sound on, paaSlut = callback({vundet, beloenning}) when done,
// pengeEffekt = callback(points, effectX, effectY) when the game is won.
// Returns {el, update({pause, lydTil, ...}), destroy}; `el` is the loading screen first and is swapped for the game when loaded.
function createSuitcaseGame({ svaer: difficulty = 0, pause: paused = false, lydTil: soundOn = true, paaSlut: onFinish = () => {
}, pengeEffekt: onMoneyEffect = () => {
} } = {}) {
  let destroyed = false;
  let canvas = null;
  let assets = null;
  let state = null;
  let soundBank = null;
  let narrator = null;
  let stopLoop = null;
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
    const gameData = assets.spil;
    const manifest = assets.manifest;
    const images = assets.images;
    state = createGameState(gameData, difficulty, manifest);
    soundBank = createSoundBank(Object.values(SUITCASE_SOUNDS));
    soundBank.saetTil(soundOn);
    const animationDefs = new Map(manifest.animations.map((animation) => [animation.id, animation]));
    const playerCache = new Map();
    // Animation players are created lazily and cached by animation id.
    const getPlayer = (animationId) => {
      if (!playerCache.has(animationId)) {
        const definition = animationDefs.get(animationId);
        const player = definition ? new AnimationPlayer(definition) : null;
        if (player) {
          player.advance(0);
        }
        playerCache.set(animationId, player);
      }
      return playerCache.get(animationId);
    };
    narrator = createNarrator(assets.fortaeller);
    state.fortaeller = narrator;
    if (narrator) {
      narrator.saetLyd(soundOn);
    }
    const say = (lineNumber) => {
      if (narrator) {
        narrator.spil(lineNumber);
        narrator.slump();
      }
    };
    let previousPhase = state.tilstand;
    // engineRunning: after the "driving" sound starts, switch to the idle sound when it has finished.
    let engineRunning = false;
    const ctx = canvas.getContext("2d");
    let frameRequestId;
    let lastFrameTime = performance.now();
    let endTime = 0;
    let finishReported = false;
    // One animation frame: step logic, narrator cues, sounds, then draw back to front (background, truck, guests, wheels,
    // narrator/mascot, lamps, spring, suitcases, button, lives, foreground).
    const frame = (now) => {
      const dtMs = paused ? 0 : now - lastFrameTime;
      lastFrameTime = now;
      state.replik = !!(narrator && narrator.optaget());
      if (dtMs > 0) {
        stepGame(state, dtMs);
      }
      if (narrator && state.tilstand !== previousPhase) {
        if (state.tilstand === TruckPhase.SPILLER && state.omgang === 0) {
          narrator.kaede([1, 2, 3]);
        }
        if (state.tilstand === TruckPhase.KOERER_IND && state.omgang > 0) {
          say(state.omgang + 7);
        }
        if (state.tilstand === TruckPhase.VUNDET) {
          say(11);
        }
        previousPhase = state.tilstand;
      }
      if ((state.tilstand === TruckPhase.VUNDET || state.tilstand === TruckPhase.TABT) && !endTime) {
        endTime = now;
      }
      if (endTime && !finishReported && now - endTime > 1500 && !(narrator && narrator.optaget())) {
        finishReported = true;
        onFinish({ vundet: state.tilstand === TruckPhase.VUNDET, beloenning: state.tilstand === TruckPhase.VUNDET ? state.point : 0 });
      }
      if (narrator && dtMs > 0) {
        narrator.tik(dtMs);
      }
      for (const player of playerCache.values()) {
        if (player) {
          player.advance(dtMs);
        }
      }
      for (const soundName of state.lyde.splice(0)) {
        if (soundName === "koer" || soundName === "tomgang" || soundName === "bremse") {
          soundBank.spilStyrke(SUITCASE_SOUNDS[soundName], gameData.lastbilLyd);
        } else {
          soundBank.spil(SUITCASE_SOUNDS[soundName]);
        }
        if (soundName === "koer") {
          engineRunning = true;
        }
      }
      if (engineRunning && !soundBank.spiller(SUITCASE_SOUNDS.koer)) {
        soundBank.spilStyrke(SUITCASE_SOUNDS.tomgang, gameData.lastbilLyd);
        engineRunning = false;
      }
      ctx.fillStyle = "#8fd0ef";
      ctx.fillRect(0, 0, gameData.skaerm.bredde, gameData.skaerm.hoejde);
      for (const sprite of gameData.baggrund.sprites) {
        drawSprite(ctx, manifest, images, sprite, gameData.baggrund.x, gameData.baggrund.y);
      }
      const truckPosition = getTruckPosition(state);
      drawSprite(ctx, manifest, images, gameData.lastbil.sprite, truckPosition.x, truckPosition.y);
      drawAnimation(ctx, manifest, images, getPlayer(gameData.lastbil.anim), truckPosition.x + gameData.lastbil.animDx, truckPosition.y + gameData.lastbil.animDy);
      state.gaester.forEach((guest, slot) => {
        const guestX = truckPosition.x + gameData.gaester.x[slot];
        drawAnimation(ctx, manifest, images, getPlayer(gameData.gaester.krop[guest.person]), guestX, gameData.gaester.y);
        drawAnimation(ctx, manifest, images, getPlayer(gameData.gaester.silhuet[guest.form]), guestX, gameData.gaester.y);
        drawAnimation(ctx, manifest, images, getPlayer(gameData.gaester.hoved[guest.person]), guestX, gameData.gaester.y);
      });
      // Draw all suitcases (before the truck's wheels when loaded into the truck, otherwise on top of everything in front of it).
      const drawSuitcases = () => state.kufferter.forEach((suitcase, index) => {
        const position = getSuitcasePosition(state, index);
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.scale(position.skala, position.skala);
        drawAnimation(ctx, manifest, images, getPlayer(gameData.kufferter.anims[suitcase.form]), 0, 0);
        ctx.restore();
      });
      if (state.kState === 4) {
        drawSuitcases();
      }
      for (const wheelX of gameData.lastbil.hjul.x) {
        drawSprite(ctx, manifest, images, gameData.lastbil.hjul.sprite, truckPosition.x + wheelX, truckPosition.y + gameData.lastbil.hjul.dy);
      }
      if (narrator) {
        narrator.tegn(ctx);
      } else if (gameData.pixeline) {
        drawAnimation(ctx, manifest, images, getPlayer(gameData.pixeline.hvile), gameData.pixeline.x, gameData.pixeline.y);
      }
      for (const overlay of gameData.overlay) {
        drawSprite(ctx, manifest, images, overlay.sprite, overlay.x, overlay.y);
      }
      const lights = gameData.lys;
      drawSprite(ctx, manifest, images, lights.ramme, lights.x, lights.y);
      drawSprite(ctx, manifest, images, lights.gul, lights.p1[0], lights.p1[1]);
      drawSprite(ctx, manifest, images, lights.gul, lights.p2[0], lights.p2[1]);
      drawSprite(ctx, manifest, images, lights.groen, lights.p1[0], lights.p1[1], 1, getLightLevel(state, state.groen) / 255);
      drawSprite(ctx, manifest, images, lights.roed, lights.p2[0], lights.p2[1], 1, getLightLevel(state, state.roed) / 255);
      const spring = gameData.fjeder;
      const springSprite = state.fjeder >= 0 ? spring.skud[Math.min(spring.skud.length - 1, Math.floor(state.fjeder / 83))] : spring.hvile[0];
      drawSprite(ctx, manifest, images, springSprite, spring.x, spring.y);
      if (state.kState !== 4) {
        drawSuitcases();
      }
      const button = gameData.knap;
      drawSprite(ctx, manifest, images, button.bag.sprite, button.bag.x, button.bag.y);
      drawSprite(ctx, manifest, images, button.sprite, button.x, button.y);
      drawSprite(ctx, manifest, images, button.for.sprite, button.for.x, button.for.y);
      for (let lifeIndex = 0, lifePoints = Math.round(state.livVis.v); lifePoints > 0; lifeIndex++, lifePoints -= 255) {
        drawSprite(ctx, manifest, images, gameData.liv.sprite, gameData.liv.x + lifeIndex * gameData.liv.afstand, gameData.liv.y, 1, Math.min(lifePoints, 255) / 255);
      }
      for (const sprite of gameData.forgrund.sprites) {
        drawSprite(ctx, manifest, images, sprite, gameData.forgrund.x, gameData.forgrund.y);
      }
      frameRequestId = requestAnimationFrame(frame);
    };
    frameRequestId = requestAnimationFrame(frame);
    stopLoop = () => {
      cancelAnimationFrame(frameRequestId);
      soundBank.stopAlle();
      if (narrator) {
        narrator.stop();
      }
    };
  };
  let activePointer = null;
  const onPointerUp = (event) => {
    if (activePointer === event.pointerId) {
      activePointer = null;
    }
  };
  const onPointerDown = (event) => {
    if (activePointer !== null && activePointer !== event.pointerId) {
      return;
    }
    activePointer = event.pointerId;
    const rect = canvas.getBoundingClientRect();
    const gameData = assets.spil;
    if (!state || paused) {
      return;
    }
    const stateNarrator = state.fortaeller;
    if (stateNarrator && (stateNarrator.koe && stateNarrator.koe.length > 1 || stateNarrator.koe && stateNarrator.koe.length === 1 && stateNarrator.optaget())) {
      stateNarrator.spring();
      return;
    }
    const result = handleTap(state, (event.clientX - rect.left) * gameData.skaerm.bredde / rect.width, (event.clientY - rect.top) * gameData.skaerm.hoejde / rect.height);
    if (result === "rigtigt" && state.omgang >= gameData.runder && onMoneyEffect(state.point, gameData.pengeEffekt[0], gameData.pengeEffekt[1]), !stateNarrator) {
      return;
    }
    const say = (lineNumber) => {
      stateNarrator.spil(lineNumber);
      stateNarrator.slump();
    };
    if (result === "byttet" && Math.random() < 0.1) {
      say(4);
    }
    if (result === "forkert") {
      say(state.liv > 0 ? 6 : 10);
    }
    if (result === "rigtigt") {
      say(7);
    }
  };
  function update(next = {}) {
    if ("pause" in next) {
      paused = next.pause;
    }
    if ("paaSlut" in next) {
      onFinish = next.paaSlut;
    }
    if ("pengeEffekt" in next) {
      onMoneyEffect = next.pengeEffekt;
    }
    if ("lydTil" in next) {
      soundOn = next.lydTil;
      if (soundBank) {
        soundBank.saetTil(soundOn);
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
  loadGameAssets().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    const gameData = assets.spil;
    canvas = h("canvas", { width: gameData.skaerm.bredde, height: gameData.skaerm.hoejde, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: onPointerDown, onPointerUp: onPointerUp, onPointerCancel: onPointerUp });
    showContent(h("div", { className: "spilflade" }, canvas));
    startGame();
  }, (error) => {
    if (destroyed) {
      return;
    }
    showContent(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-kuffert.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
  });
  return handle;
}
export { createSuitcaseGame as default };
