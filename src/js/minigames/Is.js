// Ice cream minigame ("Is"): the player stacks scoops and a topping on a cone to match the order
// shown in a speech bubble above the guest, before the clock runs out.
// Pick up a scoop from a tub (or a topping from a jar), drag it onto the stack and release it.
// The right next item grows the stack; a wrong one knocks the whole stack down.
// It is a canvas game driven by requestAnimationFrame; game logic lives in plain functions that
// mutate a state object, the factory only wires up input, sound and drawing.
// Save/game-data property names (Danish) are kept as they are in data/is/spil.json.
import { h } from '../dom.js';
import { Tween, FRAME_MS } from '../engine/tween.js';
import { createSoundBank, ICE_CREAM_SOUNDS } from '../loaders/data-loaders.js';
import { createNarrator, loadNarratorData } from '../audio/audio.js';
import { createLoadingScreen } from './ui-kit.js';
import { AnimationPlayer } from '../engine/animation.js';
import { drawSpriteFrame } from '../render/canvas-helpers.js';
// Phases of one guest's order cycle (values are the strings stored in state.tilstand).
// NY_ORDRE: guest walks in; SPILLER: player is building; FAERDIG: order done or timed out (short pause);
// SKIFT: guest walks out; SLUT: the whole game clock has run out.
// randomInt: inclusive random integer in [min, max].
const OrderPhase = { NY_ORDRE: "ny_ordre", SPILLER: "spiller", FAERDIG: "faerdig", SKIFT: "skift", SLUT: "slut" };
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
// A "glide" is a value that eases (cosine ease-in/out) from one number to another over `steps` frames of 33 ms.
// Used for the guest sliding in and out. v=current value, fra=start, til=target, trin=steps, i=current step.
function createGlide(value, steps) {
  return { v: value, fra: value, til: value, trin: steps, i: steps, rest: 0 };
}
// Start gliding towards `target` (no-op if it is already the target).
function glideTo(glide, target) {
  if (glide.til !== target) {
    glide.fra = glide.v;
    glide.til = target;
    glide.i = 0;
  }
}
// Advance a glide by `dtMs` milliseconds (in 33 ms steps). Returns true while it is still moving.
function advanceGlide(glide, dtMs) {
  for (glide.rest += dtMs; glide.rest > 33;) {
    if (glide.rest -= 33, glide.i++, glide.i < glide.trin) {
      const progress = glide.i / (glide.trin - 1);
      glide.v = glide.fra + (glide.til - glide.fra) * ((1 - Math.cos(Math.PI * progress)) / 2);
    } else {
      glide.v = glide.til;
    }
  }
  return glide.v !== glide.til;
}
// Pick a random guest look, never the same as the previous guest (if more than one exists).
function pickGuestIndex(data, previousIndex) {
  const guestCount = data.gaest.anims[0].length;
  let index;
  do {
    index = randomInt(0, guestCount - 1);
  } while (index === previousIndex && guestCount > 1);
  return index;
}
// Make a random order: 1-2 more scoops than the difficulty's base amount (types 0-7 are ice flavours)
// followed by one topping (types 8-10).
function rollOrder(data, difficulty) {
  const scoopCount = data.svaerhed[difficulty].kugler + randomInt(0, 1);
  const order = [];
  for (let scoopIndex = 0; scoopIndex < scoopCount; scoopIndex++) {
    order.push(randomInt(0, 7));
  }
  order.push(randomInt(8, 10));
  return { ordre: order, kugler: scoopCount };
}
// For every ice cream sprite (index 11 is the cone, which uses the "kegleDisk" sprite) compute the
// anchor as a fraction of the sprite size (origin offset / size). Falls back to the centre.
function computeSpriteAnchors(data, manifest) {
  const getSprite = (spriteId) => manifest && manifest.sprites[spriteId];
  return data.is.sprites.map((spriteId, spriteIndex) => {
    const sprite = getSprite(spriteIndex === 11 ? data.is.kegleDisk : spriteId);
    return sprite && sprite.w && sprite.h ? [sprite.ox / sprite.w, sprite.oy / sprite.h] : [0.5, 0.5];
  });
}
// Create the initial mutable game state. `difficulty` indexes data.svaerhed; the clock starts at data.tid.ialt
// and the per-order timer only runs on difficulties that have a penalty ("straf").
function createGameState(data, difficulty = 0, manifest = null) {
  const state = { data: data, svaer: difficulty, tilstand: OrderPhase.NY_ORDRE, ordre: [], kugler: 0, stabel: [], haand: null, ske: { type: 0, x: 0, y: 0, alfa: new Tween(0, data.is.haandFade), acc: 0 }, svup: false, anker: computeSpriteAnchors(data, manifest), point: 0, tid: data.tid.ialt, ordreTid: data.svaerhed[difficulty].straf ? data.tid.pr : -1, gaest: pickGuestIndex(data, 0), glid: createGlide(data.gaest.fra, data.gaest.trin), gaestX: data.gaest.fra };
  glideTo(state.glid, data.gaest.x);
  return state;
}
// Clickable pickup areas: tubs (scoop flavours, type 0-7) and jars (toppings, type 8+). b=width, h=height, centred on x,y.
function getPickupZones(data) {
  const zones = [];
  data.baljer.forEach(([x, y], index) => zones.push({ type: index, x: x, y: y, b: data.baljeFelt[0], h: data.baljeFelt[1] }));
  data.krukker.forEach(([x, y], index) => zones.push({ type: 8 + index, x: x, y: y, b: data.krukkeFelt[0], h: data.krukkeFelt[1] }));
  return zones;
}
// True if point (px,py) is inside the centred rectangle of a pickup zone.
// isPointOnSprite: True if (px,py) is within a field of size fieldWidth x fieldHeight placed at the sprite
// position, offset by the anchor fractions (used to test whether the dropped scoop hit the stack).
const isInsideZone = (zone, px, py) => px > zone.x - zone.b / 2 && px < zone.x + zone.b / 2 && py > zone.y - zone.h / 2 && py < zone.y + zone.h / 2;
const isPointOnSprite = (spriteX, spriteY, [fieldWidth, fieldHeight], [anchorX, anchorY], px, py) => {
  const left = spriteX - Math.trunc(fieldWidth * anchorX);
  const top = spriteY - Math.trunc(fieldHeight * anchorY);
  return px > left && px < left + fieldWidth && py > top && py < top + fieldHeight;
};
// Compute where each scoop and the cone are drawn for a stack. `scoopTypes` is the bottom-to-top list;
// the stack is anchored at (x,y) at its bottom, or vertically centred on it when `centered` (order bubble).
// Scoops alternate 1px left/right for a slightly uneven look. Returns scoop positions, the cone position and total height.
function layoutStack(data, scoopTypes, x, y, centered) {
  const heights = data.is.hoejder;
  let totalHeight = heights[11];
  for (const scoopType of scoopTypes) {
    totalHeight += heights[scoopType];
  }
  let cursorY = centered ? y - totalHeight / 2 : y - totalHeight;
  const scoops = [];
  for (let index = scoopTypes.length - 1; index >= 0; index--) {
    scoops.unshift({ type: scoopTypes[index], x: index % 2 === 0 ? x + 1 : x - 1, y: cursorY });
    cursorY += heights[scoopTypes[index]];
  }
  return { kugler: scoops, kegle: { x: x, y: cursorY + heights[11] }, hoejde: totalHeight };
}
// Pointer pressed at (x,y): if it hits a tub/jar while it is the player's turn, start holding that item.
// Returns the picked item type or null.
function pickUp(state, x, y, time = 0) {
  if (state.tilstand !== OrderPhase.SPILLER || state.haand) {
    return null;
  }
  for (const zone of getPickupZones(state.data)) {
    if (isInsideZone(zone, x, y)) {
      state.haand = { type: zone.type, x: x, y: y, tid: time };
      Object.assign(state.ske, { type: zone.type, x: x, y: y });
      state.ske.alfa.mod(255);
      return zone.type;
    }
  }
  return null;
}
// Pointer moved while holding an item. Detects a fast "swipe" (speed above swipeLimits.op) so a scoop sound
// can play, and re-arms once the speed drops under swipeLimits.ned. Returns true when a swipe just started.
function dragHand(state, x, y, time = 0, suppressSwipe = false) {
  if (!state.haand) {
    return false;
  }
  const distance = Math.trunc(Math.hypot(x - state.haand.x, y - state.haand.y));
  const elapsed = Math.round(time - state.haand.tid);
  state.haand.x = x;
  state.haand.y = y;
  state.haand.tid = time;
  state.ske.x = x;
  state.ske.y = y;
  const swipeLimits = state.data.svup;
  if (elapsed < 1) {
    return false;
  }
  if (state.svup) {
    if (distance < Math.trunc(swipeLimits.ned / elapsed)) {
      state.svup = false;
    }
  } else if (distance > Math.trunc(swipeLimits.op / elapsed) && !suppressSwipe) {
    state.svup = true;
    return true;
  }
  return false;
}
// Pointer released: drop the held item. If it lands on the stack/cone and is the next item of the order the stack grows
// (and the order is completed when the stack is full, awarding scoops x point), otherwise the stack is cleared.
// Returns {type, rigtig (correct)} or null if nothing relevant happened.
function dropHand(state, x, y) {
  if (!state.haand) {
    return null;
  }
  const droppedType = state.haand.type;
  if (state.haand = null, state.svup = false, state.ske.alfa.mod(0), state.tilstand !== OrderPhase.SPILLER) {
    return null;
  }
  const stackLayout = layoutStack(state.data, state.stabel, state.data.stabel.x, state.data.stabel.y, false);
  if (!(stackLayout.kugler.some((scoop) => isPointOnSprite(scoop.x, scoop.y, state.data.is.kugleFelt, state.anker[scoop.type], x, y)) || isPointOnSprite(stackLayout.kegle.x, stackLayout.kegle.y, state.data.is.kegleFelt, state.anker[11], x, y))) {
    return null;
  }
  const isCorrect = droppedType === state.ordre[state.stabel.length];
  if (isCorrect) {
    state.stabel = [...state.stabel, droppedType];
    if (state.stabel.length === state.ordre.length) {
      state.beloeb = state.kugler * state.data.point;
      state.point += state.beloeb;
      state.tilstand = OrderPhase.FAERDIG;
      state.skiftTid = 1e3;
    }
  } else {
    state.stabel = [];
  }
  return { type: droppedType, rigtig: isCorrect };
}
// Advance the game by `dtMs`: fade the held spoon, run the global clock and the order phase machine
// (NY_ORDRE -> SPILLER -> FAERDIG -> SKIFT -> NY_ORDRE ..., ending in SLUT when the clock is out).
function updateGame(state, dtMs) {
  for (state.ske.acc += dtMs; state.ske.acc >= FRAME_MS;) {
    state.ske.acc -= FRAME_MS;
    state.ske.alfa.trin();
  }
  if (state.tilstand !== OrderPhase.SLUT) {
    if (state.tid = Math.max(0, state.tid - dtMs), state.tilstand === OrderPhase.NY_ORDRE) {
      const stillGliding = advanceGlide(state.glid, dtMs);
      if (state.gaestX = state.glid.v, !stillGliding) {
        const newOrder = rollOrder(state.data, state.svaer);
        state.ordre = newOrder.ordre;
        state.kugler = newOrder.kugler;
        state.stabel = [];
        state.ordreTid = state.data.svaerhed[state.svaer].straf ? state.data.tid.pr : -1;
        state.tilstand = OrderPhase.SPILLER;
      }
    } else if (state.tilstand === OrderPhase.SPILLER) {
      if (state.ordreTid > 0) {
        state.ordreTid -= dtMs;
        if (state.ordreTid <= 0) {
          state.tilstand = OrderPhase.FAERDIG;
          state.skiftTid = 1e3;
        }
      }
    } else if (state.tilstand === OrderPhase.FAERDIG) {
      state.skiftTid -= dtMs;
      if (state.skiftTid <= 0) {
        if (state.haand) {
          state.ske.alfa.mod(0);
        }
        state.tilstand = OrderPhase.SKIFT;
        state.stabel = [];
        state.haand = null;
        state.svup = false;
        glideTo(state.glid, state.data.gaest.fra);
      }
    } else if (state.tilstand === OrderPhase.SKIFT) {
      const stillGliding = advanceGlide(state.glid, dtMs);
      if (state.gaestX = state.glid.v, !stillGliding) {
        if (state.tid <= 0) {
          state.tilstand = OrderPhase.SLUT;
          return;
        }
        state.gaest = pickGuestIndex(state.data, state.gaest);
        glideTo(state.glid, state.data.gaest.x);
        state.tilstand = OrderPhase.NY_ORDRE;
      }
    }
  }
}
// Sprite id of the clock face for the remaining time (the fill sprites are consecutive ids).
function getTimerFillSprite(data, remainingMs) {
  return data.tid.fyld - Math.floor(Math.min(remainingMs, data.tid.ialt - 1) / data.tid.trin);
}
// Loads the game data json, the sprite manifest, the narrator data and all texture images.
// Resolves to {spil, manifest, images, fortaeller} (images that fail to load are skipped); rejects on error.
async function loadGameAssets() {
  const [gameData, manifest, narratorData] = await Promise.all([fetch("data/is/spil.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`spil.json: ${response.status}`))), fetch("data/is/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))), loadNarratorData("is")]);
  const images = {};
  await Promise.all(Object.entries(manifest.textures).map(([textureId, texture]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      images[textureId] = image;
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `data/is/tex/${texture.file}`;
  })));
  return { spil: gameData, manifest: manifest, images: images, fortaeller: narratorData };
}
// Draw one manifest sprite at (x,y) with optional alpha; does nothing if the image is missing or alpha <= 0.
function drawSprite(ctx, manifest, images, spriteId, x, y, alpha = 1) {
  const frame = manifest.sprites[spriteId];
  const image = frame && images[frame.assetId];
  if (!(!image || alpha <= 0)) {
    ctx.save();
    ctx.translate(x, y);
    drawSpriteFrame(ctx, image, frame, alpha);
    ctx.restore();
  }
}
// Draw the current frame of an animation player (all its parts, with rotation/scale/flip) at (x,y). Alpha multiplies each part's alpha.
function drawAnimation(ctx, manifest, images, player, x, y, alpha = 1) {
  if (!(!player || alpha <= 0)) {
    for (const part of player.drawList("invers")) {
      const frame = manifest.sprites[part.sprite];
      const image = frame && images[frame.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x + part.x, y + part.y);
        ctx.rotate((part.rot || 0) * Math.PI * 2);
        ctx.scale(part.scaleX * (part.flip ? -1 : 1), part.scaleY);
        ctx.globalAlpha = part.alpha * alpha;
        drawSpriteFrame(ctx, image, frame);
        ctx.restore();
      }
    }
  }
}
// The minigame factory. Props: svaer = difficulty index, pause, lydTil = sound on, paaSlut = callback({vundet, beloenning})
// when finished, pengeEffekt = callback(amount) to show a money effect for a served order.
// Returns {el, update({pause, lydTil, ...}), destroy}; `el` is the loading screen first and is swapped for the game when loaded.
function createIceCreamGame({ svaer: difficulty = 0, pause: paused = false, lydTil: soundOn = true, paaSlut: onFinish = () => {
}, pengeEffekt: onMoneyEffect = () => {
} } = {}) {
  // Plain variables keep the latest props/objects available inside the animation-frame loop and pointer handlers.
  let destroyed = false;
  let canvas = null;
  let assets = null;
  let state = null;
  let soundBank = null;
  let narrator = null;
  let stopLoop = null;
  const debugZones = false; // set true in devtools code to outline the pickup zones
  const loading = createLoadingScreen({ bredde: 1280 });
  const handle = { el: loading.el, update: update, destroy: destroy };
  // Replace the loading screen with the real content.
  const showContent = (content) => {
    loading.el.replaceWith(content);
    loading.destroy();
    handle.el = content;
  };
  // Starts the game once the assets are loaded: sets up state, sound, animations, narrator and the render loop.
  const startGame = () => {
    const gameData = assets.spil;
    const screenWidth = gameData.skaerm.bredde;
    const screenHeight = gameData.skaerm.hoejde;
    state = createGameState(gameData, difficulty, assets.manifest);
    soundBank = createSoundBank(Object.values(ICE_CREAM_SOUNDS));
    soundBank.saetTil(soundOn);
    const animationDefs = new Map(assets.manifest.animations.map((animation) => [animation.id, animation]));
    // Create an animation player for an animation id (null if the id is unknown).
    const createPlayer = (animationId) => {
      const definition = animationDefs.get(animationId);
      if (!definition) {
        return null;
      }
      const player = new AnimationPlayer(definition);
      player.advance(0);
      return player;
    };
    const guestAnims = gameData.gaest.anims.map((guestVariants) => guestVariants.map(createPlayer)); // [guest kind][look]
    const handAnims = gameData.is.haand.map(createPlayer); // the grabbing hand per item type
    const pixelineIdle = gameData.pixeline ? createPlayer(gameData.pixeline.hvile) : null; // mascot shown when no narrator
    narrator = createNarrator(assets.fortaeller);
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.spil(1);
      narrator.slump();
    }
    state.fortaeller = narrator;
    // hud: fading speech bubble (boble), the ice in the bubble (is) and the clock (ur). fase: 1 = bubble fading in,
    // 2 = ice shown, 3 = order finished.
    let isFirstOrder = true;
    const hud = { boble: new Tween(0, gameData.boble.fade), is: new Tween(0, gameData.boble.fade), ur: new Tween(0, gameData.tid.fade), fase: 0, acc: 0 };
    hud.ur.mod(255);
    const advanceHud = (dtMs) => {
      for (hud.acc += dtMs; hud.acc >= FRAME_MS;) {
        hud.acc -= FRAME_MS;
        hud.boble.trin();
        hud.is.trin();
        hud.ur.trin();
        if (hud.fase === 1 && !hud.boble.bevaeger) {
          hud.fase = 2;
          hud.is.mod(255);
        }
      }
    };
    const ctx = canvas.getContext("2d");
    let frameRequestId;
    let lastFrameTime = performance.now();
    let previousPhase = state.tilstand;
    let endTime = 0; // timestamp when the game reached SLUT
    let finishReported = false;
    // One animation frame: update logic, advance animations, draw everything back to front, handle phase-change reactions.
    const frame = (now) => {
      const dtMs = paused ? 0 : Math.min(100, now - lastFrameTime);
      lastFrameTime = now;
      if (!(narrator && state.intro !== false && narrator.optaget()) && dtMs > 0) {
        state.intro = false;
        updateGame(state, dtMs);
      }
      if (narrator && dtMs > 0) {
        narrator.tik(dtMs);
      }
      if (dtMs > 0) {
        advanceHud(dtMs);
      }
      const guestAnim = guestAnims[gameData.svaerhed[state.svaer].gaest][state.gaest];
      if (guestAnim) {
        guestAnim.advance(dtMs);
      }
      if (pixelineIdle && !narrator) {
        pixelineIdle.advance(dtMs);
      }
      const handAnim = state.ske.alfa.v > 0 ? handAnims[state.ske.type] : null;
      if (handAnim) {
        handAnim.advance(dtMs);
      }
      ctx.fillStyle = "#8fd0ef";
      ctx.fillRect(0, 0, screenWidth, screenHeight);
      for (const sprite of gameData.baggrund.sprites) {
        drawSprite(ctx, assets.manifest, assets.images, sprite, gameData.baggrund.x, gameData.baggrund.y);
      }
      if (drawSprite(ctx, assets.manifest, assets.images, gameData.disk.sprite, gameData.disk.x, gameData.disk.y), drawAnimation(ctx, assets.manifest, assets.images, guestAnim, state.gaestX, gameData.gaest.y), drawSprite(ctx, assets.manifest, assets.images, gameData.kant.sprite, gameData.kant.x, gameData.kant.y), narrator ? narrator.tegn(ctx) : gameData.pixeline && drawAnimation(ctx, assets.manifest, assets.images, pixelineIdle, gameData.pixeline.x, gameData.pixeline.y), hud.boble.v > 0) {
        const bubbleAlpha = hud.boble.v / 255;
        const scoopAlpha = hud.is.v / 255;
        for (const sprite of gameData.boble.sprites) {
          drawSprite(ctx, assets.manifest, assets.images, sprite, gameData.boble.x, gameData.boble.y, bubbleAlpha);
        }
        const orderLayout = layoutStack(gameData, state.ordre, gameData.boble.x, gameData.boble.y, true);
        for (const scoop of orderLayout.kugler) {
          drawSprite(ctx, assets.manifest, assets.images, gameData.is.sprites[scoop.type], scoop.x, scoop.y, scoopAlpha);
        }
        drawSprite(ctx, assets.manifest, assets.images, gameData.is.sprites[11], orderLayout.kegle.x, orderLayout.kegle.y, scoopAlpha);
      }
      const stackLayout = layoutStack(gameData, state.stabel, gameData.stabel.x, gameData.stabel.y, false);
      for (const scoop of stackLayout.kugler) {
        drawSprite(ctx, assets.manifest, assets.images, gameData.is.sprites[scoop.type], scoop.x, scoop.y);
      }
      if (drawSprite(ctx, assets.manifest, assets.images, gameData.is.kegleDisk, stackLayout.kegle.x, stackLayout.kegle.y), handAnim && drawAnimation(ctx, assets.manifest, assets.images, handAnim, state.ske.x, state.ske.y + gameData.is.haandDy, state.ske.alfa.v / 255), drawSprite(ctx, assets.manifest, assets.images, gameData.tid.sprite, gameData.tid.x, gameData.tid.y, hud.ur.v / 255), drawSprite(ctx, assets.manifest, assets.images, getTimerFillSprite(gameData, state.tid), gameData.tid.fyldX, gameData.tid.y, hud.ur.v / 255), debugZones) {
        ctx.strokeStyle = "rgba(0,255,0,.9)";
        for (const zone of getPickupZones(gameData)) {
          ctx.strokeRect(zone.x - zone.b / 2, zone.y - zone.h / 2, zone.b, zone.h);
        }
      }
      if (state.tilstand !== previousPhase && narrator) {
        if (state.tilstand === OrderPhase.SPILLER) {
          narrator.spil(isFirstOrder ? 2 : 6);
          narrator.slump();
          isFirstOrder = false;
        }
        if (state.tilstand === OrderPhase.SLUT) {
          narrator.spil(7);
          narrator.slump();
        }
      }
      if (state.tilstand !== previousPhase) {
        if (state.tilstand === OrderPhase.SPILLER) {
          hud.boble.mod(255);
          hud.is.mod(0);
          hud.fase = 1;
        }
        if (state.tilstand === OrderPhase.FAERDIG) {
          hud.boble.mod(0);
          hud.is.mod(0);
          hud.fase = 3;
        }
        if (state.tilstand === OrderPhase.FAERDIG && state.stabel.length === state.ordre.length) {
          soundBank.spil(ICE_CREAM_SOUNDS.faerdig);
          onMoneyEffect(state.beloeb);
          if (guestAnim) {
            guestAnim.reset();
            guestAnim.advance(0);
          }
        }
        if (state.tilstand === OrderPhase.SLUT) {
          endTime = now;
        }
        previousPhase = state.tilstand;
      }
      if (endTime && !finishReported && now - endTime > 1500 && !(narrator && narrator.optaget())) {
        finishReported = true;
        onFinish({ vundet: true, beloenning: state.point });
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
  // Convert a pointer event to game coordinates (the canvas may be scaled by CSS).
  const getCanvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const gameData = assets.spil;
    return [(event.clientX - rect.left) * gameData.skaerm.bredde / rect.width, (event.clientY - rect.top) * gameData.skaerm.hoejde / rect.height];
  };
  // Only one pointer (finger) is tracked at a time.
  let activePointer = null;
  const isActivePointer = (event) => activePointer === null || activePointer === event.pointerId;
  const onPointerDown = (event) => {
    if (!isActivePointer(event)) {
      return;
    }
    activePointer = event.pointerId;
    const [pointerX, pointerY] = getCanvasPoint(event);
    if (!(!state || paused)) {
      if (state.intro !== false && state.fortaeller) {
        state.fortaeller.spring();
        return;
      }
      pickUp(state, pointerX, pointerY, performance.now());
      try {
        if (canvas.setPointerCapture) {
          canvas.setPointerCapture(event.pointerId);
        }
      }
      catch {
      }
    }
  };
  const onPointerMove = (event) => {
    if (!isActivePointer(event) || !state || paused) {
      return;
    }
    const [pointerX, pointerY] = getCanvasPoint(event);
    if (dragHand(state, pointerX, pointerY, performance.now(), !!soundBank && soundBank.spiller(ICE_CREAM_SOUNDS.skub)) && soundBank) {
      soundBank.spil(ICE_CREAM_SOUNDS.skub);
    }
  };
  const onPointerUp = (event) => {
    if (!isActivePointer(event)) {
      return;
    }
    activePointer = null;
    const [pointerX, pointerY] = getCanvasPoint(event);
    if (!state || paused) {
      return;
    }
    const dropResult = dropHand(state, pointerX, pointerY);
    const stateNarrator = state.fortaeller;
    if (dropResult && stateNarrator) {
      if (dropResult.rigtig) {
        if (state.tilstand === OrderPhase.FAERDIG) {
          stateNarrator.spil(5);
          stateNarrator.slump();
        } else if (!state.rostFoer) {
          stateNarrator.spil(3);
          stateNarrator.slump();
        }
      } else if (Math.random() < 0.1) {
        stateNarrator.spil(4);
        stateNarrator.slump();
      }
      if (dropResult.rigtig) {
        state.rostFoer = true;
      }
    }
    if (dropResult && soundBank) {
      soundBank.spil(dropResult.type < 8 ? ICE_CREAM_SOUNDS.kugle : ICE_CREAM_SOUNDS.topping);
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
    canvas = h("canvas", { width: gameData.skaerm.bredde, height: gameData.skaerm.hoejde, style: { touchAction: "none", cursor: "grab" }, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp });
    showContent(h("div", { className: "spilflade" }, canvas));
    startGame();
  }, (error) => {
    if (destroyed) {
      return;
    }
    showContent(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-is.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
  });
  return handle;
}
export { createIceCreamGame as default };
