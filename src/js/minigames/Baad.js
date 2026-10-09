// Boat minigame ("Baad"): a pseudo-3D sailing race. The boat stays near the bottom of the screen and the player steers
// it left/right (arrow keys or touching the left/right half of the screen) while the sea scrolls towards the camera.
// Collect coins (MOENT) and treasure chests (KISTE, which only can be grabbed while jumping off a ramp, RAMPE),
// avoid waves (BOELGE), buoys (BOEJE) and rocks (STEN1/2) - each hit costs a life.
// When the level time is up a finish line (MAAL) appears; crossing it wins the game, losing all lives loses it.
//
// World model: every object has world position X, Y and depth z. z shrinks every tick (the object approaches) and
// projectToScreen() does a perspective divide to get screen x, y, alpha and scale.
// Logic runs in fixed 33 ms ticks (~30 fps) on a plain state object; the factory below handles input, sound and drawing.
// Property names (Danish) come from data/baad/spil.json and are kept as they are.
import { h } from '../dom.js';
import { createNarrator, loadNarratorData } from '../audio/audio.js';
import { createSoundBank, BOAT_SOUNDS } from '../loaders/data-loaders.js';
import { AnimationPlayer } from '../engine/animation.js';
import { createLoadingScreen } from './ui-kit.js';
import { drawSpriteFrame } from '../render/canvas-helpers.js';
// Inclusive random integer in [min, max].
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
// BoatPhase: INTRO (narrator talks, boat stands still), SEJLER (sailing), MAAL (finish line stage), TABT (lost), VUNDET (won).
const BoatPhase = { INTRO: 0, SEJLER: 1, MAAL: 2, TABT: 3, VUNDET: 4 };
// Ids of the things in the water (they index data.objekter).
const ObjectType = { MOENT: 1, BOELGE: 2, BOEJE: 3, RAMPE: 4, SPRØJT: 5, STEN1: 6, STEN2: 7, KISTE: 8, MAAL: 9 };
// Create an object in the world at lateral position xUnits*512, at the spawn depth z0.
// With `farAway` it is placed a random distance further away (used to pre-fill the scenery at start).
function createWorldObject(data, type, xUnits, farAway = false) {
  const object = { type: type, X: xUnits * 512, Y: data.dybde.Y, z: data.dybde.z0, ramt: false, alder: 0, bane: 0 };
  if (farAway) {
    object.z -= randomInt(64, 3328);
  }
  return object;
}
// Perspective projection of an object: returns screen x/y, alpha (objects fade in near the horizon) and sprite scale.
function projectToScreen(data, object) {
  const screenX = object.X / object.z + data.skaerm.bredde / 2;
  const rawY = object.Y / object.z + data.dybde.yPlus;
  const screenY = Math.max(data.dybde.horisont, rawY);
  const alpha = Math.max(0, Math.min(255, 255 - (data.dybde.horisont - rawY) * 32)) / 255;
  return { x: screenX, y: screenY, alfa: alpha, skala: data.dybde.skala / object.z / 65536 };
}
// Initial game state. `withIntro` starts in the INTRO phase with the boat standing still until the narrator is done.
// The 32 background rocks and islands are pre-spread into the distance.
function createGameState(data, difficulty = 0, withIntro = false) {
  const difficultyConfig = data.svaerhed[difficulty];
  const state = { data: data, sv: difficultyConfig, svaer: difficulty, tilstand: withIntro ? BoatPhase.INTRO : BoatPhase.SEJLER, tid: 0, rest: 0, fart: 0, fartMaal: withIntro ? 0 : difficultyConfig.topfart, fartTrin: 0, fartFra: 0, liv: difficultyConfig.liv, point: 0, beloenning: 0, baad: { x: 640, maal: 640, v: 0, hop: -1, hopH: 0, blink: 0, stoed: -1 }, objekter: [], sten: [], oeer: [], naesteSpray: 0, sprayVenstre: false, naesteSpawn: 0, rampeTid: -1, rampeX: 0, maalSat: false, venstre: false, hoejre: false, effekter: [], lyde: [], haendelser: [] };
  for (let index = 0; index < 32; index++) {
    state.sten.push(createBackgroundRock(data, true));
    state.oeer.push(createIsland(data, true));
  }
  return state;
}
// Decorative rock on the left side of the sea (no collision).
function createBackgroundRock(data, farAway) {
  const rock = createWorldObject(data, 0, randomInt(-5120, -640), farAway);
  rock.sprite = data.sten[randomInt(0, 1)];
  return rock;
}
// Decorative island: variant 0 is placed close, others far to the side.
function createIsland(data, farAway) {
  const variant = Math.min(1, randomInt(0, 4));
  const xUnits = variant === 0 ? randomInt(934, 2560) : randomInt(2560, 10240);
  const island = createWorldObject(data, 0, 0, farAway);
  island.X = xUnits * 512;
  island.sprite = data.oeer[variant];
  return island;
}
// Spawn an obstacle/pickup. `lane` is 0..1 across the allowed width (random by default); object.bane gets 0/1/2 (left/middle/right)
// and selects the sprite variant.
function spawnObject(state, type, lane = Math.random()) {
  const data = state.data;
  const spread = type === ObjectType.MAAL || type === ObjectType.BOELGE ? data.spredningBoelge : data.spredning;
  const x = -spread / 2 + spread * lane;
  const object = createWorldObject(data, type, x);
  object.bane = lane < 0.25 ? 0 : lane > 0.75 ? 2 : 1;
  state.objekter.push(object);
}
// hopHeight: height of the boat above the water while jumping (sine arc over 30 ticks, peak = state.baad.hop).
// makeRect: rectangle from centre and size. rectsOverlap: axis-aligned overlap test.
const hopHeight = (state, hopFrame) => hopFrame < 0 || hopFrame >= 30 ? 0 : state.baad.hop * Math.sin(Math.PI * hopFrame / 29);
const makeRect = (centerX, centerY, width, height) => ({ x0: centerX - width / 2, y0: centerY - height / 2, x1: centerX + width / 2, y1: centerY + height / 2 });
const rectsOverlap = (rectA, rectB) => rectA.x0 < rectB.x1 && rectA.x1 > rectB.x0 && rectA.y0 < rectB.y1 && rectA.y1 > rectB.y0;
// Hitbox of the boat (raised while jumping).
function getBoatHitbox(state) {
  const data = state.data;
  return makeRect(state.baad.x, data.baad.y - state.baad.hopH, data.baad.felt[0], data.baad.felt[1]);
}
// Hitbox of a world object on screen. `getObjectBox(object)` returns [width, height, originX, originY] in sprite pixels.
function getObjectHitbox(state, object, getObjectBox) {
  const projected = projectToScreen(state.data, object);
  const [width, height, originX, originY] = getObjectBox(object);
  return { x0: projected.x - originX * projected.skala, y0: projected.y - originY * projected.skala, x1: projected.x - originX * projected.skala + width * projected.skala, y1: projected.y - originY * projected.skala + height * projected.skala };
}
// Leave the INTRO phase: the boat accelerates to the difficulty's top speed.
function endIntro(state) {
  if (state.tilstand === BoatPhase.INTRO) {
    state.tilstand = BoatPhase.SEJLER;
    state.fartFra = state.fart;
    state.fartMaal = state.sv.topfart;
    state.fartTrin = 0;
  }
}
// Advance the game by one 33 ms tick: speed ramp, steering, boat movement/jump/invulnerability, scrolling of all objects,
// spawning, win/lose conditions and collisions. Sounds and narrator cues are queued in state.lyde / state.haendelser.
function updateGame(state, getObjectBox) {
  const data = state.data;
  const boat = state.baad;
  if (state.tilstand === BoatPhase.INTRO) {
    return;
  }
  // Advance the level clock; ease the sailing speed towards its target over 30 ticks.
  state.tid += 33;
  if (state.fartTrin < 30) {
    state.fartTrin++;
    state.fart = state.fartFra + (state.fartMaal - state.fartFra) * (state.fartTrin / 30);
  }
  const scrollSpeed = state.fart * 2;
  if (state.tilstand === BoatPhase.SEJLER || state.tilstand === BoatPhase.MAAL) {
    // Steering: while sailing, a held button moves the boat's target x (within boat.min..max).
    const steerSpeed = Math.min(data.svaerhed[1].topfart, state.fart) * 0.85 * 2;
    if (state.venstre && !state.hoejre) {
      boat.maal = Math.max(data.baad.min, boat.maal - steerSpeed);
    }
    if (state.hoejre && !state.venstre) {
      boat.maal = Math.min(data.baad.max, boat.maal + steerSpeed);
    }
  }
  // The boat then follows the target with an accelerating, capped speed.
  const distance = Math.abs(boat.maal - boat.x);
  if (distance > 0) {
    boat.v = Math.min(boat.v + 2, data.baad.maxFart, distance / 1);
    boat.x += Math.sign(boat.maal - boat.x) * Math.min(boat.v, distance);
  } else {
    boat.v = 0;
  }
  // Jump arc after a ramp (30 ticks).
  if (boat.hop >= 0) {
    boat.hop++;
    boat.hopH = hopHeight(data, boat.hop);
    if (boat.hop >= 30) {
      boat.hop = -1;
      boat.hopH = 0;
    }
  }
  // After a hit the boat blinks and is invulnerable for 1 second (stoed = ms since hit).
  if (boat.stoed >= 0) {
    boat.stoed += 33;
    if (boat.stoed > 1e3) {
      boat.stoed = -1;
    }
  }
  const isHopping = boat.hop >= 0;
  const scrollObject = (object) => {
    object.z -= scrollSpeed;
    object.alder += 33;
    return object.z <= 256;
  };
  state.sten = state.sten.filter((object) => !scrollObject(object));
  state.oeer = state.oeer.filter((object) => !scrollObject(object));
  if (state.tid % 250 < 33) {
    state.sten.push(createBackgroundRock(data, false));
    state.oeer.push(createIsland(data, false));
  }
  state.objekter = state.objekter.filter((object) => !scrollObject(object));
  state.objekter.sort((first, second) => second.z - first.z);
  for (const effect of state.effekter) {
    effect.tid += 33;
  }
  state.effekter = state.effekter.filter((effect) => effect.tid < 700);
  const countOfType = (type) => state.objekter.filter((object) => object.type === type).length;
  if (state.tilstand === BoatPhase.SEJLER && state.tid > state.sv.tid && (state.tilstand = BoatPhase.MAAL), state.tilstand === BoatPhase.MAAL && !state.maalSat && countOfType(ObjectType.BOELGE) + countOfType(ObjectType.RAMPE) + countOfType(ObjectType.KISTE) === 0 && (spawnObject(state, ObjectType.MAAL, 0), spawnObject(state, ObjectType.MAAL, 1), state.maalSat = true), state.tilstand === BoatPhase.SEJLER || state.tilstand === BoatPhase.MAAL) {
    if (state.tid > state.naesteSpray) {
      if (Math.random() < 0.5) {
        state.sprayVenstre = !state.sprayVenstre;
        const sprayLane = state.sprayVenstre ? randomInt(-98304, 32768) / 65536 : randomInt(32768, 65536) / 65536;
        spawnObject(state, ObjectType.SPRØJT, sprayLane);
        state.naesteSpray = state.tid + 500;
      }
    } else if (state.tilstand === BoatPhase.SEJLER && state.tid > state.naesteSpawn) {
      const chance = state.sv.tilfaeldig;
      const maybeSpawn = (type, odds) => {
        if (randomInt(0, odds) === 0) {
          spawnObject(state, type);
          state.naesteSpawn = state.tid + 100;
        }
      };
      maybeSpawn(ObjectType.MOENT, chance / 2);
      maybeSpawn(ObjectType.BOEJE, chance);
      maybeSpawn(ObjectType.STEN1, chance);
      maybeSpawn(ObjectType.STEN2, chance);
      if (countOfType(ObjectType.BOELGE) === 0 && randomInt(0, 75) === 0) {
        maybeSpawn(ObjectType.BOELGE, 0);
      }
      if (countOfType(ObjectType.RAMPE) === 0 && randomInt(0, 75) === 0) {
        state.rampeX = Math.random();
        spawnObject(state, ObjectType.RAMPE, state.rampeX);
        state.naesteSpawn = state.tid + 100;
        state.rampeTid = state.tid + 500;
      }
      if (state.rampeTid > 0 && state.tid > state.rampeTid) {
        spawnObject(state, ObjectType.KISTE, state.rampeX);
        state.rampeTid = -1;
      }
    }
  }
  // Collision checks, in priority order: finish line, chest (only while jumping), ramp, hazards, coin.
  const boatBox = getBoatHitbox(state);
  const hitTest = (type) => {
    for (const object of state.objekter) {
      if (!(object.ramt || object.type !== type) && rectsOverlap(boatBox, getObjectHitbox(state, object, getObjectBox))) {
        object.ramt = true;
        return object;
      }
    }
    return null;
  };
  if (state.tilstand !== BoatPhase.SEJLER && state.tilstand !== BoatPhase.MAAL) {
    return;
  }
  // Reaching the finish line wins the game; reward is points x 4.
  if (state.objekter.find((object) => object.type === ObjectType.MAAL && !object.ramt && projectToScreen(data, object).y >= boatBox.y0)) {
    state.tilstand = BoatPhase.VUNDET;
    state.fartFra = state.fart;
    state.fartMaal = 0;
    state.fartTrin = 0;
    state.beloenning = state.point * 4;
    state.lyde.push("penge");
    state.haendelser.push("maal");
    return;
  }
  // While airborne the boat can only pick up chests.
  if (isHopping) {
    const chest = hitTest(ObjectType.KISTE);
    if (chest) {
      state.lyde.push("kiste");
      collectPoints(state, 20, chest);
    }
    return;
  }
  if (hitTest(ObjectType.RAMPE)) {
    boat.hop = 0;
    return;
  }
  // Hazard hit: lose a life (game lost at 0), otherwise slow down to speed 1 and become invulnerable.
  if (boat.stoed < 0 && (hitTest(ObjectType.BOEJE) || hitTest(ObjectType.BOELGE) || hitTest(ObjectType.STEN1) || hitTest(ObjectType.STEN2))) {
    if (state.liv -= 1, state.liv <= 0) {
      state.tilstand = BoatPhase.TABT;
      state.fartFra = state.fart;
      state.fartMaal = 0;
      state.fartTrin = 0;
      state.beloenning = state.point;
      state.haendelser.push("tabt");
      return;
    }
    state.haendelser.push("stoed");
    state.fartFra = 1;
    state.fart = 1;
    state.fartMaal = state.sv.topfart;
    state.fartTrin = 0;
    boat.stoed = 0;
    return;
  }
  const coin = hitTest(ObjectType.MOENT);
  if (coin) {
    collectPoints(state, 2, coin);
  }
}
// Add points for a collected coin/chest, queue the sound and a pop-up effect at the object's screen position.
function collectPoints(state, points, object) {
  state.point += points;
  state.lyde.push("penge");
  if (state.point < 250) {
    state.haendelser.push("moent");
  }
  const projected = projectToScreen(state.data, object);
  state.effekter.push({ x: projected.x, y: object.type === ObjectType.KISTE ? projected.y - 164 : projected.y, tid: 0 });
}
// Run as many fixed ticks as fit in dtMs (max 250 ms per frame, so a pause or lag cannot cause a huge jump).
function stepGame(state, dtMs, getObjectBox) {
  for (state.rest += Math.min(dtMs, 250); state.rest >= 33;) {
    state.rest -= 33;
    updateGame(state, getObjectBox);
  }
}
// Loads the game data json, sprite manifest, narrator data and all textures.
// Resolves to {spil, manifest, images, fortaeller}; throws on error.
async function loadGameAssets() {
  const [gameData, manifest, narratorData] = await Promise.all([fetch("data/baad/spil.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`spil.json: ${response.status}`))), fetch("data/baad/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))), loadNarratorData("baad")]);
  const images = {};
  await Promise.all(Object.entries(manifest.textures).map(([textureId, texture]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      images[textureId] = image;
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `data/baad/tex/${texture.file}`;
  })));
  return { spil: gameData, manifest: manifest, images: images, fortaeller: narratorData };
}
// Draw a manifest sprite at (x,y) with optional scale, alpha and rotation in degrees.
function drawSprite(ctx, manifest, images, spriteId, x, y, { skala: scale = 1, alfa: alpha = 1, vinkel: angleDegrees = 0 } = {}) {
  const frame = manifest.sprites[spriteId];
  const image = frame && images[frame.assetId];
  if (!(!image || alpha <= 0)) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(x, y);
    if (angleDegrees) {
      ctx.rotate(angleDegrees * Math.PI / 180);
    }
    ctx.scale(scale, scale);
    drawSpriteFrame(ctx, image, frame);
    ctx.restore();
  }
}
// Draw the current frame of an animation player (all parts) at (x,y), scaled by `scale`.
function drawAnimation(ctx, manifest, images, player, x, y, scale = 1) {
  if (player) {
    for (const part of player.drawList("invers")) {
      const frame = manifest.sprites[part.sprite];
      const image = frame && images[frame.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x + part.x * scale, y + part.y * scale);
        ctx.rotate((part.rot || 0) * Math.PI * 2);
        ctx.scale(part.scaleX * scale * (part.flip ? -1 : 1), part.scaleY * scale);
        ctx.globalAlpha = part.alpha;
        drawSpriteFrame(ctx, image, frame);
        ctx.restore();
      }
    }
  }
}
// Sprite id for an object: fixed sprite, a lane-dependent one, or an animated one (frame advances every 83 ms).
function getObjectSprite(data, object) {
  const typeDef = data.objekter[object.type];
  if (!typeDef) {
    return object.sprite;
  }
  if (typeDef.sprite) {
    return typeDef.sprite;
  }
  if (typeDef.baner && !typeDef.antal) {
    return typeDef.baner[object.bane];
  }
  const frameIndex = Math.floor(object.alder / 83);
  return typeDef.baner ? typeDef.baner[object.bane] + frameIndex % typeDef.antal : typeDef.start + frameIndex % typeDef.antal;
}
// Factory for the boat game. Props: svaer = difficulty, pause, lydTil = sound on, paaSlut = callback({vundet, beloenning}) when done.
// Returns { el, update(partialProps), destroy() }; `el` is the loading screen at first and is swapped
// (in place) for the game canvas once the assets are loaded.
function createBoatGame(props = {}) {
  let difficulty = props.svaer ?? 0;
  let paused = props.pause ?? false;
  let soundOn = props.lydTil ?? true;
  let onFinish = props.paaSlut ?? (() => {
  });
  let destroyed = false;
  let assets = null;
  let canvas = null;
  let stopRound = null;
  let currentState = null;
  let sounds = null;
  let narrator = null;
  // Held pointers (pointerId -> "v" | "h") for touch steering.
  const pointers = new Map();
  let loadingScreen = createLoadingScreen({ bredde: 1280 });
  let rootEl = loadingScreen.el;
  // Replace the current root element in place (it may already be attached by the creator).
  const swapRoot = (nextEl) => {
    rootEl.replaceWith(nextEl);
    rootEl = nextEl;
    if (loadingScreen) {
      loadingScreen.destroy();
      loadingScreen = null;
    }
  };
  // Arrow keys steer the boat (ignored while paused).
  const onKey = (event) => {
    const state = currentState;
    if (!state || paused) {
      return;
    }
    const isDown = event.type === "keydown";
    if (event.key === "ArrowLeft") {
      state.venstre = isDown;
      event.preventDefault();
    }
    if (event.key === "ArrowRight") {
      state.hoejre = isDown;
      event.preventDefault();
    }
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  // Held keys/pointers: left and right are active if any pointer is held on that half of the canvas.
  const updateSteering = () => {
    const state = currentState;
    if (state) {
      state.venstre = [...pointers.values()].includes("v");
      state.hoejre = [...pointers.values()].includes("h");
    }
  };
  const getPointerSide = (event) => {
    const rect = canvas.getBoundingClientRect();
    return (event.clientX - rect.left) / rect.width < 0.5 ? "v" : "h";
  };
  const onPointerDown = (event) => {
    const state = currentState;
    if (state && state.tilstand === BoatPhase.INTRO && narrator && !paused) {
      narrator.spring();
      return;
    }
    try {
      canvas.setPointerCapture(event.pointerId);
    }
    catch {
    }
    pointers.set(event.pointerId, getPointerSide(event));
    updateSteering();
  };
  const onPointerMove = (event) => {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, getPointerSide(event));
      updateSteering();
    }
  };
  const onPointerUp = (event) => {
    pointers.delete(event.pointerId);
    updateSteering();
  };
  // (Re)starts a round with the current difficulty. Returns a cleanup function.
  const startRound = () => {
    const gameData = assets.spil;
    const manifest = assets.manifest;
    const images = assets.images;
    const roundNarrator = createNarrator(assets.fortaeller);
    narrator = roundNarrator;
    const say = (lineNumber) => {
      if (roundNarrator) {
        roundNarrator.spil(lineNumber);
        roundNarrator.slump();
      }
    };
    if (roundNarrator) {
      roundNarrator.saetLyd(soundOn);
    }
    const state = createGameState(gameData, difficulty, !!roundNarrator);
    currentState = state;
    say(1);
    const roundSounds = createSoundBank(Object.values(BOAT_SOUNDS));
    roundSounds.saetTil(soundOn);
    sounds = roundSounds;
    // Engine sound disabled (it made the game lag).
    const animationDefs = new Map(manifest.animations.map((animation) => [animation.id, animation]));
    const chestAnim = animationDefs.get(gameData.objekter[8].anim) ? new AnimationPlayer(animationDefs.get(gameData.objekter[8].anim)) : null;
    // Box [width, height, originX, originY] used for collisions: the data's "felt" field if present, otherwise the sprite size.
    const getObjectBox = (object) => {
      const typeDef = gameData.objekter[object.type];
      if (typeDef && typeDef.felt) {
        return [typeDef.felt[0], typeDef.felt[1], typeDef.felt[0] / 2, typeDef.felt[1]];
      }
      const sprite = manifest.sprites[getObjectSprite(gameData, object)];
      return sprite ? [sprite.w, sprite.h, sprite.ox, sprite.oy] : [1, 1, 0, 0];
    };
    const ctx = canvas.getContext("2d");
    let frameRequestId;
    let lastFrameTime = performance.now();
    let animationTimeMs = 0;
    let endTime = 0;
    let finishReported = false;
    // One animation frame: step logic, play queued narrator cues/sounds, draw the scene back to front (islands, spray, rocks, wake, objects, boat, lives, buttons).
    const frame = (now) => {
      const dtMs = paused ? 0 : now - lastFrameTime;
      lastFrameTime = now;
      animationTimeMs += dtMs;
      if (dtMs > 0) {
        stepGame(state, dtMs, getObjectBox);
      }
      if (roundNarrator && dtMs > 0) {
        roundNarrator.tik(dtMs);
      }
      if (state.tilstand === BoatPhase.INTRO && !(roundNarrator && roundNarrator.optaget())) {
        endIntro(state);
        say(2);
      }
      for (const event of state.haendelser.splice(0)) {
        if (event === "stoed") {
          say(3);
        } else if (event === "tabt") {
          say(6);
        } else if (event === "maal") {
          say(5);
        } else if (event === "moent" && roundNarrator && !roundNarrator.optaget() && Math.random() < 0.5) {
          say(4);
        }
      }
      if (chestAnim) {
        chestAnim.advance(dtMs);
      }
      for (const soundName of state.lyde.splice(0)) {
        if (BOAT_SOUNDS[soundName]) {
          roundSounds.spil(BOAT_SOUNDS[soundName]);
        }
      }
      ctx.fillStyle = "#4aa7d8";
      ctx.fillRect(0, 0, gameData.skaerm.bredde, gameData.skaerm.hoejde);
      for (const sprite of gameData.baggrund.sprites) {
        drawSprite(ctx, manifest, images, sprite, gameData.baggrund.x, gameData.baggrund.y);
      }
      const drawWorldObject = (object, spriteId) => {
        const projected = projectToScreen(gameData, object);
        drawSprite(ctx, manifest, images, spriteId, projected.x, projected.y, { skala: projected.skala, alfa: projected.alfa });
      };
      for (const island of [...state.oeer].sort((first, second) => second.z - first.z)) {
        drawWorldObject(island, island.sprite);
      }
      for (const object of state.objekter) {
        if (object.type === ObjectType.SPRØJT) {
          drawWorldObject(object, getObjectSprite(gameData, object));
        }
      }
      for (const rock of [...state.sten].sort((first, second) => second.z - first.z)) {
        drawWorldObject(rock, rock.sprite);
      }
      const boat = state.baad;
      const boatVisible = boat.stoed < 0 || Math.floor(boat.stoed / 100) % 2 === 0;
      const tiltDegrees = (640 - boat.x) * 10 / 640;
      const getWakeSprite = (animation) => animation.start + Math.floor(animationTimeMs / (1e3 / animation.fps)) % animation.antal;
      if (boatVisible && boat.hop < 0) {
        drawSprite(ctx, manifest, images, getWakeSprite(gameData.baad.kølvand), boat.x, gameData.baad.y, { vinkel: -tiltDegrees });
      }
      for (const object of state.objekter) {
        if (!(object.type === ObjectType.SPRØJT || object.ramt && object.type !== ObjectType.RAMPE)) {
          if (object.type === ObjectType.KISTE) {
            const projected = projectToScreen(gameData, object);
            ctx.globalAlpha = projected.alfa;
            drawAnimation(ctx, manifest, images, chestAnim, projected.x, projected.y, projected.skala);
            ctx.globalAlpha = 1;
          } else {
            drawWorldObject(object, getObjectSprite(gameData, object));
          }
        }
      }
      if (boatVisible) {
        const boatAnimation = boat.stoed >= 0 ? gameData.baad.stoed : gameData.baad.sejl;
        drawSprite(ctx, manifest, images, getWakeSprite(boatAnimation), boat.x, gameData.baad.y - boat.hopH, { vinkel: -tiltDegrees });
      }
      for (let lifeIndex = 0; lifeIndex < state.liv; lifeIndex++) {
        drawSprite(ctx, manifest, images, gameData.liv.sprite, gameData.liv.x + lifeIndex * gameData.liv.afstand, gameData.liv.y);
      }
      drawSprite(ctx, manifest, images, gameData.knapper.venstre.sprite, gameData.knapper.venstre.x, gameData.knapper.venstre.y, { alfa: state.venstre ? 1 : 0.8 });
      drawSprite(ctx, manifest, images, gameData.knapper.hoejre.sprite, gameData.knapper.hoejre.x, gameData.knapper.hoejre.y, { alfa: state.hoejre ? 1 : 0.8 });
      if ((state.tilstand === BoatPhase.TABT || state.tilstand === BoatPhase.VUNDET) && !endTime) {
        endTime = now;
      }
      if (endTime && !finishReported && now - endTime > 2e3 && !(roundNarrator && roundNarrator.optaget())) {
        finishReported = true;
        onFinish({ vundet: state.tilstand === BoatPhase.VUNDET, beloenning: state.beloenning });
      }
      frameRequestId = requestAnimationFrame(frame);
    };
    frameRequestId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameRequestId);
      roundSounds.stopAlle();
      if (roundNarrator) {
        roundNarrator.stop();
      }
    };
  };
  loadGameAssets().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    canvas = h("canvas", { width: assets.spil.skaerm.bredde, height: assets.spil.skaerm.hoejde, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp });
    swapRoot(h("div", { className: "spilflade" }, canvas));
    stopRound = startRound();
  }).catch((error) => {
    if (destroyed) {
      return;
    }
    swapRoot(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-baad.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
  });
  return {
    get el() {
      return rootEl;
    },
    // Applies changed props: pause/sound take effect immediately, a new difficulty restarts the round.
    update(next) {
      if ("pause" in next) {
        paused = next.pause;
      }
      if ("paaSlut" in next) {
        onFinish = next.paaSlut;
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
      if ("svaer" in next && next.svaer !== difficulty) {
        difficulty = next.svaer;
        if (stopRound) {
          stopRound();
          stopRound = startRound();
        }
      }
    },
    destroy() {
      destroyed = true;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      if (stopRound) {
        stopRound();
        stopRound = null;
      }
      if (loadingScreen) {
        loadingScreen.destroy();
        loadingScreen = null;
      }
      rootEl.remove();
    }
  };
}
export { createBoatGame as default };
