/**
 * "Find things" minigame (Findting).
 *
 * A big scrollable scene (larger than the 1280x768 screen) hides a number of
 * objects. The player drags / uses the arrow keys to move the camera; any
 * hidden object that ends up under the fixed CROSSHAIR (screen centre) or that
 * is tapped is "found". Find them all before the timer runs out to win a
 * reward. A narrator (the "fortaeller") talks through the intro and reacts to
 * events, and an optional telescope intro animation shows how many objects
 * there are to find.
 *
 * Scene data is loaded from data/findting/*. The default export is the
 * plain-DOM factory createFindThingsGame; everything else is internal.
 */
import { h } from '../dom.js';
import { Tween, FRAME_MS } from '../engine/tween.js';
import { drawSpriteFrame } from '../render/canvas-helpers.js';
import { createSoundBank } from '../loaders/data-loaders.js';
import { createNarrator, loadNarratorData } from '../audio/audio.js';
import { createLoadingScreen } from './ui-kit.js';
import { AnimationPlayer } from '../engine/animation.js';
import { createKineticScroll } from '../engine/kinetic-scroll.js';

// Logical canvas size (the canvas is scaled to fit by CSS).
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 768;
// Round state machine: playing -> won / out of time -> waiting for narrator -> finished.
const RoundState = { SPILLER: "spiller", VUNDET: "vundet", TID_UDE: "tid_ude", VENTER: "venter", SLUT: "slut" };
// Screen point (centre of the screen) that automatically finds objects.
const CROSSHAIR = [640, 384];
// Screen rectangle [x1, y1, x2, y2] where a tap is treated as a tap on the narrator.
const NARRATOR_CLICK_RECT = [984, 688, 1024, 728];
// A pointer press shorter than this (ms) counts as a tap rather than a drag.
const MAX_TAP_MS = 99;
// Random integer in [min, max] inclusive.
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Create the mutable state of one round: picks which object type is hidden,
 * how many of them (from the difficulty's min/max) and at which of the
 * scene's predefined slots.
 */
function createRound(scene, difficulty = 0) {
  const level = scene.svaerhed[difficulty];
  const count = randomInt(level.min, level.max);
  const typeIndex = randomInt(0, 11);
  // Pick `count` distinct slot indices.
  const chosenSlots = [];
  for (; chosenSlots.length < count;) {
    const slotIndex = randomInt(0, scene.genstande.pladser.length - 1);
    if (!chosenSlots.includes(slotIndex)) {
      chosenSlots.push(slotIndex);
    }
  }
  const [objectWidth, objectHeight] = scene.genstande.stoerrelser[typeIndex];
  const objects = chosenSlots.map((slot) => {
    const [slotX, slotY] = scene.genstande.pladser[slot];
    return { x: slotX, y: slotY, bredde: objectWidth, hoejde: objectHeight, fundet: false };
  });
  return {
    scene: scene, svaer: difficulty, type: typeIndex, antal: count, genstande: objects, fundet: 0,
    tilstand: RoundState.SPILLER,
    tid: level.tid,           // time left in ms (negative = unlimited)
    ur: 0,                    // elapsed time in ms
    slutTid: 0,               // time at which the finished state ends
    taler: false,             // narrator is currently speaking
    effekt: null,             // pending money effect {beloeb, x, y}
    beloenning: 0,            // reward
    lyde: [],                 // queued sound names
    fort: [],                 // queued narrator line numbers
    // Camera (top-left of the screen in world coordinates), starts centred.
    kam: { x: Math.trunc((scene.verden.bredde - CANVAS_WIDTH) / 2), y: Math.trunc((scene.verden.hoejde - CANVAS_HEIGHT) / 2) },
    // Arrow keys currently held down.
    taster: { op: false, ned: false, venstre: false, hoejre: false },
  };
}

/** Lazily create the kinetic (inertial) scrollers that drive the camera. */
function ensureScrollers(round) {
  if (!round.rulX) {
    round.rulX = createKineticScroll(0, round.scene.verden.bredde - CANVAS_WIDTH);
    round.rulY = createKineticScroll(0, round.scene.verden.hoejde - CANVAS_HEIGHT);
    round.rulX.flytTil(round.kam.x);
    round.rulY.flytTil(round.kam.y);
  }
  return round;
}

/** Pointer pressed: start dragging the camera. */
function startDrag(round, pointerX, pointerY) {
  ensureScrollers(round);
  round.rulX.tryk(pointerX);
  round.rulY.tryk(pointerY);
}

/** Pointer moved while dragging. */
function dragTo(round, pointerX, pointerY) {
  ensureScrollers(round);
  round.rulX.flyt(pointerX);
  round.rulY.flyt(pointerY);
}

/** Pointer released: let the camera glide on with its momentum. */
function releaseDrag(round) {
  ensureScrollers(round);
  round.rulX.slip();
  round.rulY.slip();
}

/** Advance the camera by `dtMs`: applies held arrow keys, then steps the scrollers. */
function updateCamera(round, dtMs) {
  ensureScrollers(round);
  // Keyboard scrolling speed: 0.4 px per ms, capped at 400 px per step.
  const keyStep = dtMs >= 1e3 ? 400 : Math.trunc(dtMs * 0.4);
  const keys = round.taster;
  if (keys.op) {
    round.rulY.maal(round.rulY.maalet - keyStep);
  }
  if (keys.ned) {
    round.rulY.maal(round.rulY.maalet + keyStep);
  }
  if (keys.venstre) {
    round.rulX.maal(round.rulX.maalet - keyStep);
  }
  if (keys.hoejre) {
    round.rulX.maal(round.rulX.maalet + keyStep);
  }
  round.kam.x = round.rulX.tik(dtMs);
  round.kam.y = round.rulY.tik(dtMs);
}

/**
 * Check whether the screen point (screenX, screenY) hits a not-yet-found
 * object. Marks it found, queues sounds / narrator lines and handles
 * winning. Returns null when the round is not in play, otherwise
 * {traf: hit, faerdig: round won}.
 */
function tryFindAt(round, screenX, screenY) {
  if (round.tilstand !== RoundState.SPILLER) {
    return null;
  }
  const worldX = screenX + round.kam.x;
  const worldY = screenY + round.kam.y;
  for (const obj of round.genstande) {
    if (!obj.fundet && worldX >= obj.x - obj.bredde / 2 && worldX <= obj.x + obj.bredde / 2 && worldY >= obj.y - obj.hoejde / 2 && worldY <= obj.y + obj.hoejde / 2) {
      obj.fundet = true;
      round.fundet++;
      if (round.fundet !== round.antal) {
        round.fort.push(4); // narrator line: "found one"
      }
      round.lyde.push("fundet");
      if (round.fundet === round.antal) {
        round.tilstand = RoundState.VUNDET;
        round.beloenning = round.scene.beloenning;
        round.fort.push(5); // narrator line: "found them all"
        round.lyde.push("vundet");
        round.effekt = { beloeb: round.beloenning, x: round.scene.effekt[0], y: round.scene.effekt[1] };
      }
      return { traf: true, faerdig: round.tilstand === RoundState.VUNDET };
    }
  }
  return { traf: false, faerdig: false };
}

/** True when the screen point lies in the narrator's tap area. */
const isInNarratorRect = (x, y) => x >= NARRATOR_CLICK_RECT[0] && x <= NARRATOR_CLICK_RECT[2] && y >= NARRATOR_CLICK_RECT[1] && y <= NARRATOR_CLICK_RECT[3];

/**
 * Advance the round's clock and state machine by `dtMs`:
 * playing (counting down) -> won/out of time -> wait until the narrator has
 * finished talking, then one more second -> finished.
 */
function advanceRound(round, dtMs) {
  round.ur += dtMs;
  if (round.tilstand === RoundState.SPILLER) {
    if (round.tid >= 0) {
      round.tid -= dtMs;
      if (round.tid <= 0) {
        round.tid = 0;
        round.tilstand = RoundState.TID_UDE;
      }
    }
  } else if (round.tilstand === RoundState.VUNDET || round.tilstand === RoundState.TID_UDE) {
    if (!round.taler) {
      round.tilstand = RoundState.VENTER;
      round.slutTid = round.ur + 1e3;
    }
  } else if (round.tilstand === RoundState.VENTER && round.ur > round.slutTid) {
    round.tilstand = RoundState.SLUT;
  }
}

/** Remaining time as whole seconds, rounded to nearest. */
const secondsLeft = (round) => Math.trunc((round.tid + 500) / 1e3);

/**
 * Build the list of things to draw this frame, back to front:
 * background tile layer, the hidden objects (animated), then two foreground
 * tile layers. Tiles are {sprite, x, y}; objects are {anim, x, y} where anim
 * is 0 + type (not found) or 12 + type (found). Off-screen tiles are skipped.
 */
function buildDrawList(round) {
  const drawList = [];
  const scene = round.scene;
  const addLayer = (layer) => {
    // Horizontal and vertical scroll offsets (parallax per layer; "forrest" is the front layer).
    // (the `, 0` comma expression is a leftover from the original code and has no effect)
    const offsetX = -round.kam.x * layer.parallakse + (layer.navn === "forrest", 0);
    const offsetY = layer.navn === "forrest" ? -layer.dy - round.kam.y * layer.parallakse : -(round.kam.y + layer.dy);
    for (let row = 0; row < layer.raekker; row++) {
      for (let col = 0; col < layer.kolonner; col++) {
        const tile = layer.felter[row][col];
        if (tile <= 0 || tile >= layer.antal) {
          continue; // empty tile
        }
        const px = col * scene.flise + offsetX;
        const py = row * scene.flise + offsetY;
        if (!(px <= -scene.flise || px >= CANVAS_WIDTH || py <= -scene.flise || py >= CANVAS_HEIGHT)) {
          drawList.push({ sprite: layer.base + tile, x: px, y: py });
        }
      }
    }
  };
  addLayer(scene.lag[0]);
  for (const obj of round.genstande) {
    drawList.push({ anim: (obj.fundet ? 12 : 0) + round.type, x: obj.x - round.kam.x, y: obj.y - round.kam.y });
  }
  addLayer(scene.lag[1]);
  addLayer(scene.lag[2]);
  return drawList;
}

// --- Telescope intro ("kikkert") ---------------------------------------
// Layout constants (pixels / sprite ids) for the row of ten number tiles.
const DIGIT_START_X = 348;            // x of the first tile when a selection is shown
const DIGIT_ROW_OFFSET = 170;         // vertical offset added to the rest y when shown
const DIGIT_SPACING = 410;            // horizontal spacing of the idle row
const DIGIT_REST_Y = 591;             // y of the number row once the telescope has slid in
const DIGIT_SPRITE_BASE = 1602;       // sprite id of tile 0
const DIGIT_GLOW_SPRITE_BASE = 1612;  // sprite id of the highlighted overlay of tile 0

/**
 * Telescope overlay shown during the intro and as HUD: a lens frame with a
 * row of ten number tiles (0-9 style counters) that animate into place, one
 * of which is selected to show how many objects must be found, and tiles
 * up to the found-count are highlighted. All values are Tweens stepped at
 * FRAME_MS. `manifest` is the telescope sprite manifest.
 * Methods (Danish names are the original API): visTal = show the number,
 * hurtigt = jump to fast layout, vaelg = select count, fremhaev = highlight,
 * trin = step animation, tegn = draw.
 */
function createTelescopeIntro(manifest) {
  const slideY = new Tween(768, 15);
  slideY.mod(DIGIT_REST_Y);
  // Per tile: slow (intro) positions, fast (skipped intro) positions, scales, glow alpha.
  const slowPositions = [];
  const fastPositions = [];
  const scales = [];
  const glows = [];
  for (let index = 0; index < 10; index++) {
    slowPositions.push({ x: new Tween(index * DIGIT_SPACING - 1920, 30), y: new Tween(864, 30) });
    fastPositions.push({ x: new Tween(0, 10), y: new Tween(0, 10) });
    scales.push(new Tween(1, 10));
    glows.push(new Tween(0, 10));
  }
  let activePositions = slowPositions;
  const selected = new Tween(-1, 30);
  let appliedSelection = null;
  let timeAccumulator = 0;
  const selectedIndex = () => Math.floor(selected.v);
  // When the selection changes, re-target the tiles: tiles before the
  // selected one pack left, the selected one (and its neighbour) is enlarged.
  const relayoutDigits = () => {
    const selection = selectedIndex();
    if (appliedSelection !== selection) {
      if (selection >= 0) {
        let targetX = DIGIT_START_X;
        for (let index = 0; index < 10; index++) {
          if (index >= 1) {
            const sprite = manifest.sprites[DIGIT_SPRITE_BASE + index];
            const spriteWidth = sprite ? sprite.w : 0;
            targetX += (selection === index || selection + 1 === index ? Math.floor(spriteWidth * 3 / 2) : spriteWidth) + 1;
          }
          activePositions[index].x.mod(targetX);
          activePositions[index].y.mod(DIGIT_ROW_OFFSET + DIGIT_REST_Y);
          scales[index].mod(selection === index ? 2 : 1);
        }
      }
      appliedSelection = selection;
    }
  };
  return { visTal() {
      selected.saet(-3);
      selected.mod(-1);
    }, hurtigt() {
      // Switch to the fast layout, starting from where the slow one currently is.
      if (activePositions !== fastPositions) {
        for (let index = 0; index < 10; index++) {
          for (const axis of ["x", "y"]) {
            fastPositions[index][axis].saet(activePositions[index][axis].v);
            fastPositions[index][axis].mod(activePositions[index][axis].maal);
          }
        }
        activePositions = fastPositions;
      }
    }, vaelg(count) {
      selected.mod(count - 1);
    }, fremhaev(foundCount) {
      glows.forEach((glow, index) => glow.mod(index <= foundCount - 1 ? 255 : 0));
    }, get y() {
      return slideY.v;
    }, trin(dtMs) {
      // Fixed-timestep animation.
      for (timeAccumulator += dtMs; timeAccumulator >= FRAME_MS;) {
        timeAccumulator -= FRAME_MS;
        slideY.trin();
        selected.trin();
        for (let index = 0; index < 10; index++) {
          activePositions[index].x.trin();
          activePositions[index].y.trin();
          scales[index].trin();
          glows[index].trin();
        }
        relayoutDigits();
      }
    }, tegn(ctx, images, drawExtra) {
      // Draw one sprite centred at (x, y) with optional scale and alpha.
      const drawSprite = (spriteId, x, y, scale = 1, alpha = 1) => {
        const sprite = manifest.sprites[spriteId], image = sprite && images[sprite.assetId];
        if (!(!image || alpha <= 0)) {
          ctx.save();
          ctx.translate(x, y);
          if (scale !== 1) {
            ctx.scale(scale, scale);
          }
          drawSpriteFrame(ctx, image, sprite, alpha);
          ctx.restore();
        }
      };
      for (const spriteId of [1598, 1599, 1601, 1600]) {
        drawSprite(spriteId, 640, 384);
      }
      // Black bars around the lens opening.
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 1280, 234);
      ctx.fillRect(0, 534, 1280, 234);
      ctx.fillRect(0, 234, 384, 300);
      ctx.fillRect(896, 234, 384, 300);
      const currentSlideY = slideY.v;
      drawSprite(1594, 640, currentSlideY);
      drawSprite(1595, 640, currentSlideY);
      drawSprite(1597, 1200, currentSlideY);
      drawExtra(1200, currentSlideY);
      for (let index = 0; index < 10; index++) {
        const x = activePositions[index].x.v, y = activePositions[index].y.v, scale = scales[index].v;
        drawSprite(DIGIT_SPRITE_BASE + index, x, y, scale);
        drawSprite(DIGIT_GLOW_SPRITE_BASE + index, x, y, scale, glows[index].v / 255);
      }
      drawSprite(1596, 640, 384);
    } };
}

// Sound effect ids (in the shared sound bank) for the round's sound names.
const SOUND_IDS = { fundet: 994, vundet: 976 };

/**
 * Loads the scene JSON, the sprite manifest, the narrator data, the optional
 * telescope manifest and all texture images.
 * Resolves to {scene, manifest, images, fortaeller, kikkert}; throws on error.
 */
async function loadFindThingsData() {
  const [scene, manifest, narratorData, telescopeManifest] = await Promise.all([fetch("data/findting/scene.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`scene.json: ${response.status}`))), fetch("data/findting/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))), loadNarratorData("findting"), fetch("data/findting/kikkert/manifest.json").then((response) => response.ok ? response.json() : null).catch(() => null)]);
  const images = {};
  // Load every texture of a manifest into `images` (failed loads are skipped).
  const loadImages = (folder, textures) => Promise.all(Object.entries(textures).map(([id, entry]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[id] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `data/findting/${folder}${entry.file}`;
  })));
  await Promise.all([loadImages("tex/", manifest.textures), telescopeManifest ? loadImages("kikkert/tex/", telescopeManifest.textures) : null]);
  return { scene: scene, manifest: manifest, images: images, fortaeller: narratorData, kikkert: telescopeManifest };
}

/** Draw sprite `spriteId` from `manifest` with its origin at (x, y). */
function drawSprite(ctx, manifest, images, spriteId, x, y) {
  const sprite = manifest.sprites[spriteId], image = sprite && images[sprite.assetId];
  if (image) {
    ctx.save();
    ctx.translate(x, y);
    drawSpriteFrame(ctx, image, sprite);
    ctx.restore();
  }
}

/** Draw the current frame of an AnimationPlayer (its "invers" draw list) at (x, y). */
function drawAnimation(ctx, manifest, images, player, x, y) {
  if (player) {
    for (const part of player.drawList("invers")) {
      const sprite = manifest.sprites[part.sprite], image = sprite && images[sprite.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x + part.x, y + part.y);
        ctx.rotate((part.rot || 0) * Math.PI * 2);
        ctx.scale(part.scaleX * (part.flip ? -1 : 1), part.scaleY);
        ctx.globalAlpha = 1;
        drawSpriteFrame(ctx, image, sprite, part.alpha);
        ctx.restore();
      }
    }
  }
}

// Box showing "found / total" (x, y, width, height) and the timer position.
const POINTS_BOX = { x: 1016, y: 548, b: 232, h: 196 };
const TIMER_POS = { x: 256, y: 96, tekstY: 106 };

/**
 * The minigame factory.
 * Props: svaer = difficulty index, pause = freeze the game, lydTil = sound
 * on, skrift = bitmap font renderer, ui = shared UI drawing helpers,
 * paaSlut({vundet, beloenning}) = called once when the round is over,
 * pengeEffekt(amount, x, y) = called to show a money effect on a win.
 * Returns { el, update(partialProps), destroy() }; `el` is the loading screen at first and is swapped
 * (in place) for the game canvas once the data is loaded.
 */
function createFindThingsGame(props = {}) {
  let difficulty = props.svaer ?? 0;
  let paused = props.pause ?? false;
  let soundOn = props.lydTil ?? true;
  let font = props.skrift ?? null;
  let ui = props.ui ?? null;
  let onFinish = props.paaSlut ?? (() => {
  });
  let onMoneyEffect = props.pengeEffekt ?? (() => {
  });
  let destroyed = false;
  let assets = null;
  let canvas = null;
  let stopRound = null;
  let currentRound = null;
  let currentSounds = null;
  // Pointer drag in progress ({ t0 } = press time) or null.
  let drag = null;
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

  // Arrow-key camera control.
  const keyMap = { ArrowUp: "op", ArrowDown: "ned", ArrowLeft: "venstre", ArrowRight: "hoejre" }, makeHandler = (isDown) => (event) => {
    const direction = keyMap[event.code];
    if (!(!direction || !currentRound)) {
      event.preventDefault();
      currentRound.taster[direction] = isDown;
    }
  }, onKeyDown = makeHandler(true), onKeyUp = makeHandler(false), onBlur = () => {
    if (currentRound) {
      for (const key of Object.keys(currentRound.taster)) {
        currentRound.taster[key] = false;
      }
    }
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // Convert a pointer event to canvas (logical 1280x768) coordinates.
  const toCanvasCoords = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * CANVAS_WIDTH / rect.width, (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height];
  }, onPointerDown = (event) => {
    if (paused || !currentRound) {
      return;
    }
    const [x, y] = toCanvasCoords(event);
    drag = { t0: performance.now() };
    startDrag(currentRound, x, y);
    try {
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId);
      }
    }
    catch {
    }
  }, onPointerMove = (event) => {
    if (!drag || paused) {
      return;
    }
    const [x, y] = toCanvasCoords(event);
    dragTo(currentRound, x, y);
  }, onPointerUp = (event) => {
    const finishedDrag = drag;
    // (comma expression: clear the drag, release scrolling if there was one)
    if (drag = null, finishedDrag && releaseDrag(currentRound), !finishedDrag || performance.now() - finishedDrag.t0 > MAX_TAP_MS) {
      return; // not a quick tap
    }
    const [x, y] = toCanvasCoords(event), round = currentRound, narrator = round.fortaeller;
    if (isInNarratorRect(x, y)) {
      // Tap on the narrator: skip the intro, or replay a hint line.
      if (narrator && round.intro) {
        narrator.spring();
      } else if (narrator && round.tilstand === RoundState.SPILLER) {
        narrator.spil(6);
        narrator.slump();
      }
      return;
    }
    if (round.intro || round.tilstand === RoundState.VUNDET || round.tilstand === RoundState.TID_UDE) {
      if (narrator) {
        narrator.spring(); // skip current narration
      }
      return;
    }
    if (round.tilstand === RoundState.SPILLER) {
      tryFindAt(round, x, y);
    }
  };

  // Sets up a round (difficulty/font/ui as currently set) and runs the render/update loop. Returns a cleanup function.
  const startRound = () => {
    const round = createRound(assets.scene, difficulty);
    currentRound = round;
    const sounds = createSoundBank(Object.values(SOUND_IDS));
    sounds.saetTil(soundOn);
    currentSounds = sounds;
    // Animation players for the hidden object: 0 = not found, 12 = found variant.
    const animationsById = new Map(assets.manifest.animations.map((anim) => [anim.id, anim])), makeAnimation = (animId) => {
      const definition = animationsById.get(assets.scene.genstande.anims[animId]);
      if (!definition) {
        return null;
      }
      const player = new AnimationPlayer(definition);
      player.advance(0);
      return player;
    }, animPlayers = { 0: makeAnimation(round.type), 12: makeAnimation(round.type + 12) }, narrator = createNarrator(assets.fortaeller);
    round.fortaeller = narrator;
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.spil(1); // intro line
      narrator.slump();
      round.intro = true;
    }
    const telescope = assets.kikkert ? createTelescopeIntro(assets.kikkert) : null, fade = new Tween(255, 30);
    fade.mod(0);
    // phase: 0 = telescope intro, 1 = fading to the scene, 2 = playing.
    let phase = round.intro && telescope ? 0 : 2, fadeAccumulator = 0;
    // Called when the narrator's intro ends: show the count and start fading to the scene.
    const finishIntro = () => {
      if (telescope) {
        phase = 1;
        fade.mod(255);
        telescope.hurtigt();
        telescope.vaelg(round.antal);
      }
    };
    if (telescope) {
      telescope.visTal();
      if (!round.intro) {
        telescope.hurtigt();
        telescope.vaelg(round.antal);
      }
    }
    let lastFoundCount = round.fundet;
    const ctx = canvas.getContext("2d");
    let rafId, lastTime = performance.now(), finishReported = false;
    // One animation frame: update the simulation, then draw.
    const frame = (now) => {
      const dt = paused ? 0 : now - lastTime;
      lastTime = now;
      // Intro narration finished -> start the game proper.
      if (dt > 0 && narrator && round.intro && !narrator.optaget()) {
        round.intro = false;
        narrator.spil(2);
        narrator.saet(0, round.antal - 2);
        narrator.saet(1, round.type);
        narrator.slump();
        finishIntro();
      }
      if (dt > 0) {
        updateCamera(round, dt);
      }
      round.taler = !!narrator && narrator.taler;
      if (!round.intro && dt > 0) {
        advanceRound(round, dt);
        tryFindAt(round, CROSSHAIR[0], CROSSHAIR[1]);
      }
      // Flush queued sounds, money effect and narrator lines.
      for (const soundKey of round.lyde.splice(0)) {
        sounds.spil(SOUND_IDS[soundKey]);
      }
      // (comma expression: fire the money effect once, then clear it)
      if (round.effekt && (onMoneyEffect(round.effekt.beloeb, round.effekt.x, round.effekt.y), round.effekt = null), narrator) {
        for (const narratorLine of round.fort.splice(0)) {
          narrator.spil(narratorLine);
          narrator.slump();
        }
      } else {
        round.fort.length = 0;
      }
      if (narrator && dt > 0) {
        narrator.tik(dt);
      }
      for (const animPlayer of Object.values(animPlayers)) {
        if (animPlayer) {
          animPlayer.advance(dt);
        }
      }
      if (telescope) {
        // Update the highlight when the found count changes, and step the fade at fixed timesteps.
        for (round.fundet !== lastFoundCount && (lastFoundCount = round.fundet, telescope.fremhaev(lastFoundCount)), fadeAccumulator += dt; fadeAccumulator >= FRAME_MS;) {
          fadeAccumulator -= FRAME_MS;
          fade.trin();
        }
        if (phase === 1 && !fade.bevaeger) {
          phase = 2;
          fade.mod(0);
        }
        if (phase === 2) {
          telescope.trin(dt);
        }
      }
      // --- Draw ---
      if (phase < 2) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawSprite(ctx, assets.kikkert, assets.images, 1634, 640, 384);
        drawSprite(ctx, assets.kikkert, assets.images, 1635, 640, 384);
      } else {
        ctx.fillStyle = "#8fd0ef"; // sky blue behind the scene
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        for (const item of buildDrawList(round)) {
          if (item.anim !== void 0) {
            drawAnimation(ctx, assets.manifest, assets.images, animPlayers[item.anim >= 12 ? 12 : 0], item.x, item.y);
          } else {
            drawSprite(ctx, assets.manifest, assets.images, item.sprite, item.x, item.y);
          }
        }
      }
      if (narrator && (phase < 2 || !telescope)) {
        narrator.tegn(ctx);
      }
      if (telescope && phase === 2) {
        telescope.tegn(ctx, assets.images, (px, py) => drawAnimation(ctx, assets.manifest, assets.images, animPlayers[0], px, py));
      } else if (!telescope) {
        // No telescope data: simple "found / total" panel instead.
        if (ui) {
          ui.ramme(ctx, POINTS_BOX.x, POINTS_BOX.y, POINTS_BOX.b, POINTS_BOX.h, "punkt");
        }
        drawAnimation(ctx, assets.manifest, assets.images, animPlayers[0], POINTS_BOX.x + POINTS_BOX.b / 2, POINTS_BOX.y + 84);
        if (font) {
          font.tegn(ctx, `${round.fundet} / ${round.antal}`, POINTS_BOX.x + POINTS_BOX.b / 2, POINTS_BOX.y + POINTS_BOX.h - 30, { str: 37, midt: true });
        }
      }
      // Countdown timer.
      if (round.tid >= 0 && phase === 2) {
        if (ui) {
          ui.faelles(ctx, 1733, TIMER_POS.x, TIMER_POS.y);
        }
        if (font) {
          font.tegn(ctx, String(secondsLeft(round)), TIMER_POS.x, TIMER_POS.tekstY, { str: 73, midt: true, op: true });
        }
      }
      // Black fade overlay (alpha = fade value / 255).
      if (telescope && fade.v > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fade.v / 255})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      // Report the result to the host exactly once.
      if (round.tilstand === RoundState.SLUT && !finishReported) {
        finishReported = true;
        onFinish({ vundet: round.beloenning > 0, beloenning: round.beloenning });
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      sounds.stopAlle();
      if (narrator) {
        narrator.stop();
      }
    };
  };

  loadFindThingsData().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    canvas = h("canvas", { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, style: { touchAction: "none", cursor: "grab" }, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp });
    swapRoot(h("div", { className: "spilflade" }, canvas));
    stopRound = startRound();
  }).catch((error) => {
    if (destroyed) {
      return;
    }
    swapRoot(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-findting.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
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
      if ("pengeEffekt" in next) {
        onMoneyEffect = next.pengeEffekt;
      }
      if ("skrift" in next) {
        font = next.skrift;
      }
      if ("ui" in next) {
        ui = next.ui;
      }
      if ("lydTil" in next) {
        soundOn = next.lydTil;
        if (currentSounds) {
          currentSounds.saetTil(soundOn);
        }
        if (currentRound && currentRound.fortaeller) {
          currentRound.fortaeller.saetLyd(soundOn);
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
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
export { createFindThingsGame as default };
