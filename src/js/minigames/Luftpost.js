/**
 * "Airmail" minigame (Luftpost).
 *
 * The player is Pixeline, a pilot flying a mail plane. Parcels ride towards
 * the cockpit on a conveyor belt (a pseudo-3D lane, z = distance). Drag a
 * parcel to the plane's door to deliver it (+ a throw animation); parcels
 * that reach the end without being delivered cost a life. The exception is
 * the cake ("kage"): cakes must NOT be thrown out - delivering one costs a
 * life, letting it go past is fine. Birds fly towards the windscreen; tap the
 * windscreen (or press Space / Enter) to scare a bird away for points before
 * it hits and splatters on the glass. The game ends when all lives are lost.
 *
 * Gameplay runs on a fixed time step (game.data.trin ms) inside advanceGame.
 * Most state property names are Danish and kept as-is (they are data keys).
 * The default export is the createAirmailGame factory.
 */
import { h } from '../dom.js';
import { createSoundBank, AIRMAIL_SOUNDS } from '../loaders/data-loaders.js';
import { createNarrator, loadNarratorData } from '../audio/audio.js';
import { createLoadingScreen } from './ui-kit.js';
import { AnimationPlayer } from '../engine/animation.js';
import { drawSpriteFrame } from '../render/canvas-helpers.js';
// Random integer in [min, max] inclusive.
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
/**
 * Create a small value animation ("ease"): current value v moves from `fra`
 * to `til` over `trin` fixed steps. `power` selects the curve:
 * 1 = linear, 2 = cosine ease-in-out, 3 = sine ease-out.
 */
function createEase(value, steps, power = 1) {
  return { v: value, fra: value, til: value, trin: steps, i: steps, potens: power };
}
/** Retarget an ease to a new end value (restarts from the current value) unless it is already heading there and finished. */
function easeTo(ease, target) {
  if (!(ease.til === target && ease.i >= ease.trin)) {
    ease.fra = ease.v;
    ease.til = target;
    ease.i = 0;
  }
}
/** Advance an ease by one fixed step. */
function stepEase(ease) {
  if (ease.i++, ease.i < ease.trin) {
    const progress = ease.i / (ease.trin - 1), eased = ease.potens === 3 ? Math.sin(Math.PI / 2 * progress) : ease.potens === 2 ? (1 - Math.cos(Math.PI * progress)) / 2 : progress;
    ease.v = ease.fra + (ease.til - ease.fra) * eased;
  } else {
    ease.v = ease.til;
  }
}
/** True while the ease has not yet reached its target. */
const isEasing = (ease) => ease.v !== ease.til;
// Game phases: intro narration -> playing -> end speech -> fade out sound -> finished.
const GameState = { INTRO: "intro", SPILLER: "spiller", SLUT_TALE: "slutTale", TONER: "toner", SLUT: "slut" };
/**
 * Build the initial game state for a difficulty level: conveyor-belt
 * segments (`stykker`, three of them with staggered depth) and the
 * background clouds. Lists start empty (parcels, birds, windscreen cracks).
 */
function createGame(data, difficulty = 0) {
  const level = data.svaerhed[difficulty];
  const game = {
    data: data,
    svaer: difficulty,
    sv: level,                  // settings of the chosen difficulty (trin, liv, point ...)
    tilstand: GameState.INTRO,
    tid: 0,                     // simulated time in ms
    rest: 0,                    // leftover ms not yet consumed by a fixed step
    liv: 0,                     // lives left (set when the intro reaches phase 2)
    livAlfa: createEase(0, 30), // animated life-icon opacity (0-255 per life)
    introFase: 0,               // 0-3: progress through the intro narration
    taler: false,               // narrator is speaking
    // Engine/belt loop volume, fades in from 0 to 0.5
    lydStyrke: (() => {
      const volume = createEase(0, 15, 2);
      easeTo(volume, 0.5);
      return volume;
    })(),
    tilstandTid: 0,             // time at which the current end phase ends
    point: 0,                   // score (birds scared away)
    naesteSpawn: 0,             // time of the next parcel spawn
    pakker: [],                 // parcels on the belt
    greb: null,                 // parcel currently dragged by the player
    stykker: [],                // belt segments
    fugle: [],                  // birds
    revner: [],                 // cracks on the windscreen
    rudeAlfa: createEase(0, 30),// windscreen overlay opacity while a bird approaches
    skyer: [],                  // clouds
    pilot: 0,                   // 1 while the pilot's throw animation plays
    pilotTid: 0,
    lyde: [],                   // queued sounds (name or [name, volume])
    foersteLevering: false,     // first delivery done (triggers a narrator line)
    slutTid: 0,
  };
  const { baand: beltConfig } = data;
  for (let index = 0; index < beltConfig.stykker; index++) {
    const steps = level.trin - Math.floor(index * level.trin / 3);
    const beltZ = createEase(beltConfig.zFra + index * (beltConfig.zTil - beltConfig.zFra) / 3, steps);
    easeTo(beltZ, beltConfig.zTil);
    const beltScale = createEase(1 - index / 6, steps);
    easeTo(beltScale, 0.5);
    game.stykker.push({ z: beltZ, sk: beltScale });
  }
  const cloudConfig = data.skyer;
  for (let index = 0; index < cloudConfig.antal; index++) {
    game.skyer.push({ sprite: cloudConfig.sprites[randomInt(0, 2)], x: randomInt(-cloudConfig.x, cloudConfig.x), y: randomInt(-cloudConfig.y, cloudConfig.y), z: randomInt(cloudConfig.naer, cloudConfig.fjern) });
  }
  return game;
}
/** Remove one life. */
function loseLife(game) {
  game.liv = Math.max(0, game.liv - 1);
}
/** Spawn a bird in the distance that flies towards the windscreen (limited to birdConfig.max at a time). */
function spawnBird(game) {
  const birdConfig = game.data.fugl;
  if (game.fugle.length >= birdConfig.max) {
    return;
  }
  // Horizontal offset of the approach path (random side).
  const offsetX = randomInt(birdConfig.dxMin, birdConfig.dxMax) * (Math.random() < 0.5 ? -1 : 1);
  const base = { x: createEase(birdConfig.x, birdConfig.trinFlyt), y: createEase(birdConfig.y, birdConfig.trinFlyt) };
  const offset = { x: createEase(0, birdConfig.trinNaerm), y: createEase(0, birdConfig.trinNaerm) };
  easeTo(offset.x, offsetX);
  easeTo(offset.y, randomInt(birdConfig.dyMin, birdConfig.dyMax));
  const scale = createEase(birdConfig.skalaFra / 65536, birdConfig.trinNaerm);
  easeTo(scale, 1);
  game.fugle.push({ base: base, off: offset, skala: scale, tilstand: 0, tid: 0, vent: 0, billede: 0 });
}
/** Current screen position of a bird: its base flight path plus the approach offset. */
const birdPosition = (bird) => ({ x: bird.base.x.v + bird.off.x.v, y: bird.base.y.v + bird.off.y.v });
/** Put a new random parcel (type 0-3, one of three lanes) on the belt at the far end. */
function spawnPackage(game) {
  const packageConfig = game.data.pakker;
  if (game.pakker.length >= packageConfig.max) {
    return;
  }
  const z = createEase(packageConfig.zFra, packageConfig.trin);
  easeTo(z, packageConfig.zTil);
  const scale = createEase(1, packageConfig.trin);
  easeTo(scale, 0.5);
  game.pakker.push({ type: randomInt(0, 3), bane: packageConfig.baner[randomInt(0, 2)], z: z, skala: scale });
}
/** Screen position of a parcel: perspective divides its lane/height by its depth z. */
function packageScreenPos(data, pkg) {
  return { x: data.pakker.x + pkg.bane / pkg.z.v, y: data.pakker.y / pkg.z.v };
}
/**
 * One fixed simulation step: eases, belt, clouds, phase transitions,
 * parcel arrival (lost life), bird logic and windscreen cracks.
 *
 * Bird states (bird.tilstand): 0 = approaching, 1 = scared away,
 * 2 = hit the windscreen (waits), 3 = sliding down the glass.
 * Pilot (game.pilot): 1 while the throw animation plays.
 */
function stepGame(game) {
  const data = game.data;
  game.tid += data.trin;
  stepEase(game.livAlfa);
  stepEase(game.rudeAlfa);
  stepEase(game.lydStyrke);
  for (const piece of game.stykker) {
    stepEase(piece.z);
    stepEase(piece.sk);
    if (!isEasing(piece.z)) {
      piece.z = createEase(data.baand.zFra, game.sv.trin);
      easeTo(piece.z, data.baand.zTil);
      piece.sk = createEase(1, game.sv.trin);
      easeTo(piece.sk, 0.5);
    }
  }
  for (const cloud of game.skyer) {
    cloud.z -= data.skyer.fart;
    if (cloud.z <= data.skyer.naer) {
      cloud.z = data.skyer.fjern;
    }
  }
  if (game.tilstand === GameState.INTRO) {
    if (game.introFase >= 2 && !game.livSat) {
      game.livSat = true;
      game.liv = game.sv.liv;
    }
    if (game.introFase >= 3) {
      game.tilstand = GameState.SPILLER;
      game.naesteSpawn = game.tid + data.pakker.hvert;
    }
  } else if (game.tilstand === GameState.SPILLER) {
    if (game.tid > game.naesteSpawn && !game.taler) {
      spawnPackage(game);
      game.naesteSpawn = game.tid + data.pakker.hvert;
    }
  } else if (game.tilstand === GameState.SLUT_TALE) {
    if (!game.taler && game.tid > game.tilstandTid) {
      game.tilstand = GameState.TONER;
      easeTo(game.lydStyrke, 0);
      game.tilstandTid = game.tid + 1e3;
    }
  } else if (game.tilstand === GameState.TONER && game.tid > game.tilstandTid) {
    game.tilstand = GameState.SLUT;
  }
  for (const pkg of [...game.pakker]) {
    stepEase(pkg.z);
    stepEase(pkg.skala);
    if (!(game.greb && game.greb.pakke === pkg)) {
      if (!isEasing(pkg.z)) {
        if (pkg.type !== data.pakker.kage && game.tilstand === GameState.SPILLER) {
          loseLife(game);
          if (game.fort) {
            game.fort.push(6);
          }
        }
        game.pakker.splice(game.pakker.indexOf(pkg), 1);
      }
    }
  }
  game.pakker.sort((packageA, packageB) => packageB.z.v - packageA.z.v);
  let birdApproaching = false;
  for (const bird of [...game.fugle]) {
    const birdConfig = data.fugl;
    bird.tid += data.trin;
    for (const ease of [bird.base.x, bird.base.y, bird.off.x, bird.off.y, bird.skala]) {
      stepEase(ease);
    }
    if (bird.tid % Math.round(1e3 / birdConfig.fps) < data.trin && (bird.billede = (bird.billede + 1) % 4), bird.tilstand === 0) {
      if (birdApproaching = true, bird.skala.v >= 1) {
        game.lyde.push("ramt");
        if (game.fort && game.tilstand === GameState.SPILLER && randomInt(0, 3) === 0) {
          game.fort.push(5);
        }
        bird.tilstand = 2;
        bird.vent = bird.tid + birdConfig.ventRamt;
        const pos = birdPosition(bird);
        game.revner.push({ x: pos.x, y: pos.y, alfa: (() => {
            const alpha = createEase(255, 300, 3);
            easeTo(alpha, 0);
            return alpha;
          })() });
      }
    } else if (bird.tilstand === 2 && bird.tid > bird.vent) {
      easeTo(bird.base.y, birdConfig.glidY);
      easeTo(bird.base.x, birdPosition(bird).x);
      bird.tilstand = 3;
    }
    if ((bird.tilstand === 3 || bird.tilstand === 1) && !isEasing(bird.base.y) && !isEasing(bird.base.x)) {
      game.fugle.splice(game.fugle.indexOf(bird), 1);
    }
  }
  for (const crack of [...game.revner]) {
    stepEase(crack.alfa);
    if (crack.alfa.v <= 0) {
      game.revner.splice(game.revner.indexOf(crack), 1);
    }
  }
  easeTo(game.rudeAlfa, birdApproaching ? 255 : 0);
  if (game.pilot === 1 && game.tid > game.pilotTid) {
    game.pilot = 0;
    if (randomInt(0, 9) === 0) {
      game.lyde.push(["pilot", 0.5]);
    }
  }
  easeTo(game.livAlfa, game.liv * 255);
  if (game.tilstand === GameState.SPILLER && game.liv <= 0) {
    game.tilstand = GameState.SLUT_TALE;
    game.tilstandTid = game.tid + 1e3;
    if (game.fort) {
      game.fort.push(8);
    }
  }
}
/** Advance the game by dtMs (capped at 250), consuming it in fixed steps of data.trin ms. pilotThrowMs = length of the throw animation. */
function advanceGame(game, dtMs, pilotThrowMs = 600) {
  for (game.pilotVarighed = pilotThrowMs, game.rest += Math.min(dtMs, 250); game.rest >= game.data.trin;) {
    game.rest -= game.data.trin;
    stepGame(game);
  }
}
/** Hit test against a sprite box {x, y, w, h, ox, oy} (ox/oy = origin offset). */
const isInsideBox = (box, x, y) => !!box && x > box.x - box.ox && x < box.x - box.ox + box.w && y > box.y - box.oy && y < box.y - box.oy + box.h;
/**
 * Player taps the windscreen: scare away the approaching bird (if any) for
 * points. Returns {spring: may skip the intro, jaget: a bird was chased away, point}.
 */
function scareBird(game) {
  const canSkipIntro = game.tilstand === GameState.INTRO && (game.introFase === 0 || game.introFase === 2);
  const bird = game.fugle.find((candidate) => candidate.tilstand === 0);
  if (bird) {
    easeTo(bird.base.x, birdPosition(bird).x);
    easeTo(bird.base.y, game.data.fugl.vaekY);
    bird.tilstand = 1;
    game.lyde.push("penge");
    game.point += game.sv.point;
    return { spring: canSkipIntro, jaget: true, point: game.sv.point };
  }
  return { spring: canSkipIntro, jaget: false };
}
/**
 * Pointer pressed. Returns "spring" (skip narration during intro / end
 * speech), "greb" (a parcel was grabbed - topmost first) or null. Tapping the
 * pilot sometimes plays a sound. getPackageBox(pkg) gives [w, h, ox, oy].
 */
function gamePointerDown(game, x, y, getPackageBox, pilotBox) {
  if (game.tilstand === GameState.INTRO || game.tilstand === GameState.SLUT_TALE) {
    return "spring";
  }
  if (game.tilstand !== GameState.SPILLER) {
    return null;
  }
  for (let index = game.pakker.length - 1; index >= 0; index--) {
    const pkg = game.pakker[index];
    const pos = packageScreenPos(game.data, pkg);
    const [width, height, offsetX, offsetY] = getPackageBox(pkg);
    if (x > pos.x - offsetX && x < pos.x - offsetX + width && y > pos.y - offsetY && y < pos.y - offsetY + height) {
      game.greb = { pakke: pkg, x: null, y: null, px: pos.x, py: pos.y, skala: pkg.skala.v };
      return "greb";
    }
  }
  if (isInsideBox(pilotBox, x, y) && randomInt(0, 3) === 0) {
    game.lyde.push("pilotTryk");
  }
  return null;
}
/** Pointer dragged: move the grabbed parcel. */
function gamePointerMove(game, x, y) {
  if (game.greb) {
    game.greb.x = x;
    game.greb.y = y;
  }
}
/**
 * Pointer released: drop the grabbed parcel. Result: "kage_ud" (cake thrown
 * out: lose a life), "kage_vaek" (cake dropped elsewhere: fine), "leveret"
 * (delivered through the door: pilot throws, a new bird appears) or
 * "tabt" (parcel dropped outside the door: lose a life). Null if nothing was held.
 */
function gamePointerUp(game, x, y) {
  const grab = game.greb;
  if (!grab) {
    return null;
  }
  game.greb = null;
  const data = game.data;
  game.pakker.splice(game.pakker.indexOf(grab.pakke), 1);
  // The door is a screen rectangle; dropping inside it throws the parcel out.
  const [doorLeft, doorTop, doorRight, doorBottom] = data.doer;
  const inDoor = x > doorLeft && x < doorRight && y > doorTop && y < doorBottom;
  return grab.pakke.type === data.pakker.kage ? inDoor ? (game.fort && game.fort.push(7), loseLife(game), "kage_ud") : "kage_vaek" : inDoor ? (game.lyde.push(["ud", 0.5], ["ud2", 0.5]), game.pilot = 1, game.pilotTid = game.tid + (game.pilotVarighed || 600), game.kast = (game.kast || 0) + 1, spawnBird(game), game.foersteLevering || (game.foersteLevering = true, game.fort && game.fort.push(4)), "leveret") : (loseLife(game), "tabt");
}
/**
 * Loads spil.json, manifest.json, narrator data and all textures.
 * Resolves to {spil, manifest, images, fortaeller}; rejects on error.
 */
async function loadAirmailData() {
  const [gameConfig, manifest, narratorData] = await Promise.all([fetch("data/luftpost/spil.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`spil.json: ${response.status}`))), fetch("data/luftpost/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))), loadNarratorData("luftpost")]), images = {};
  await Promise.all(Object.entries(manifest.textures).map(([id, entry]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[id] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `data/luftpost/tex/${entry.file}`;
  })));
  return { spil: gameConfig, manifest: manifest, images: images, fortaeller: narratorData };
}
/** Draw a sprite with origin at (x, y), uniform scale and alpha (0-1+). */
function drawSprite(ctx, manifest, images, spriteId, x, y, scale = 1, alpha = 1) {
  const sprite = manifest.sprites[spriteId], image = sprite && images[sprite.assetId];
  if (!(!image || alpha <= 0)) {
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawSpriteFrame(ctx, image, sprite);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
/** Draw all parts of an AnimationPlayer's current frame at (x, y); parts with sprite id `skipSprite` are skipped. */
function drawAnimation(ctx, manifest, images, player, x, y, skipSprite = -1) {
  if (player) {
    for (const part of player.drawList("invers")) {
      if (part.sprite === skipSprite) {
        continue;
      }
      const sprite = manifest.sprites[part.sprite], image = sprite && images[sprite.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x + part.x, y + part.y);
        ctx.rotate((part.rot || 0) * Math.PI * 2);
        ctx.scale(part.scaleX * (part.flip ? -1 : 1), part.scaleY);
        ctx.globalAlpha = part.alpha;
        drawSpriteFrame(ctx, image, sprite);
        ctx.restore();
      }
    }
  }
}
/**
 * The minigame factory.
 * Props: svaer = difficulty index, pause = freeze, lydTil = sound on,
 * paaSlut({vundet, beloenning}) = called once when the game is over,
 * pengeEffekt(points) = called each time a bird is scared away.
 * Returns {el, update({pause, lydTil, ...}), destroy}; `el` is the loading screen first and is swapped for the game when loaded.
 */
function createAirmailGame({ svaer: difficulty = 0, pause: paused = false, lydTil: soundOn = true, paaSlut: onFinish = () => {
}, pengeEffekt: onMoneyEffect = () => {
} } = {}) {
  let destroyed = false;
  let canvas = null;
  let assets = null;
  let game = null;
  let sounds = null;
  let narrator = null;
  let stopLoop = null;
  const debugHitBoxes = false; // set true in devtools to draw the door / windscreen hit boxes
  const loading = createLoadingScreen({ bredde: 1280 });
  const handle = { el: loading.el, update: update, destroy: destroy };
  // Replace the loading screen with the real content.
  const showContent = (content) => {
    loading.el.replaceWith(content);
    loading.destroy();
    handle.el = content;
  };
  // Starts the game once the data is ready: creates the game and runs the update / render loop.
  const startGame = () => {
    const config = assets.spil;
    const manifest = assets.manifest;
    const images = assets.images;
    game = createGame(config, difficulty);
    sounds = createSoundBank(Object.values(AIRMAIL_SOUNDS));
    sounds.saetTil(soundOn);
    game.lyd = sounds;
    // Looping engine ("fly") and belt ("baand") sounds follow game.lydStyrke.
    let lastVolume = -1;
    const applyLoopVolume = () => {
      sounds.loekke(AIRMAIL_SOUNDS.fly);
      sounds.loekke(AIRMAIL_SOUNDS.baand);
      sounds.volumen(AIRMAIL_SOUNDS.fly, game.lydStyrke.v);
      sounds.volumen(AIRMAIL_SOUNDS.baand, game.lydStyrke.v);
      lastVolume = game.lydStyrke.v;
    };
    applyLoopVolume();
    const animationsById = new Map(manifest.animations.map((anim) => [anim.id, anim]));
    const pilotConfig = config.pixeline; // the pilot character (Pixeline)
    const makeAnimation = (animId) => {
      const definition = animationsById.get(animId);
      if (!definition) {
        return null;
      }
      const player = new AnimationPlayer(definition);
      player.advance(0);
      return player;
    };
    const idleAnimation = makeAnimation(pilotConfig.hvile);
    const armsIdleAnimation = makeAnimation(pilotConfig.hvileArme);
    let throwAnimation = makeAnimation(pilotConfig.kast);
    // Throw animation length in ms (duration is in 10 ms units); 600 if missing.
    const throwDurationMs = animationsById.get(pilotConfig.kast) ? animationsById.get(pilotConfig.kast).duration * 10 : 600;
    narrator = createNarrator(assets.fortaeller);
    game.fortaeller = narrator;
    game.fort = [];
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.kaede([1, 2, 3]);
    }
    const ctx = canvas.getContext("2d");
    let rafId;
    let lastTime = performance.now();
    let propellerTime = 0;       // ms, drives the propeller sprite cycle
    let lastThrowCount = 0;      // restart the throw animation when game.kast changes
    let finishReported = false;
    let wasPaused = false;
    // One animation frame: update state, then draw back to front.
    const frame = (now) => {
      const dt = paused ? 0 : now - lastTime;
      // (comma expression: store time, pause / resume the looping sounds, then update intro phase)
      if (lastTime = now, paused !== wasPaused && (wasPaused = paused, wasPaused ? (sounds.stop(AIRMAIL_SOUNDS.fly), sounds.stop(AIRMAIL_SOUNDS.baand)) : game.tilstand !== GameState.SLUT && applyLoopVolume()), game.tilstand === GameState.INTRO) {
        const queueLength = narrator && narrator.koe ? narrator.koe.length : 0;
        game.introFase = !narrator || !narrator.introAktiv() ? 3 : Math.max(0, 2 - queueLength);
      }
      // Step the simulation, keep loop volumes in sync, feed queued narrator lines.
      if (game.taler = !!narrator && narrator.taler, dt > 0 && advanceGame(game, dt, throwDurationMs), game.lydStyrke.v !== lastVolume && game.tilstand !== GameState.SLUT && !wasPaused && (lastVolume = game.lydStyrke.v, sounds.volumen(AIRMAIL_SOUNDS.fly, lastVolume), sounds.volumen(AIRMAIL_SOUNDS.baand, lastVolume)), narrator && dt > 0) {
        for (const narratorLine of game.fort.splice(0)) {
          narrator.spil(narratorLine);
          narrator.slump();
        }
        narrator.tik(dt);
      }
      propellerTime += dt;
      if (game.kast !== lastThrowCount) {
        lastThrowCount = game.kast;
        throwAnimation = makeAnimation(pilotConfig.kast);
      }
      if (idleAnimation) {
        idleAnimation.advance(dt);
      }
      if (armsIdleAnimation) {
        armsIdleAnimation.advance(dt);
      }
      if (throwAnimation && game.pilot === 1) {
        throwAnimation.advance(dt);
      }
      for (const soundEntry of game.lyde.splice(0)) {
        const [soundName, volume] = Array.isArray(soundEntry) ? soundEntry : [soundEntry, 1];
        if (volume === 1) {
          sounds.spil(AIRMAIL_SOUNDS[soundName]);
        } else {
          sounds.spilStyrke(AIRMAIL_SOUNDS[soundName], volume);
        }
      }
      if (game.tilstand === GameState.SLUT) {
        sounds.stopAlle();
      }
      // --- Draw (sky, clouds, birds, cracks, propeller, cockpit, belt, parcels, lives, pilot) ---
      ctx.fillStyle = "#7fc4ea";
      ctx.fillRect(0, 0, config.skaerm.bredde, config.skaerm.hoejde);
      const cloudConfig = config.skyer;
      for (const cloud of [...game.skyer].sort((cloudA, cloudB) => cloudB.z - cloudA.z)) {
        const scale = cloudConfig.stoerrelse * cloudConfig.naer / cloud.z / 65536;
        const alpha = Math.min(255, cloudConfig.naer * 2048 / cloud.z) / 255;
        drawSprite(ctx, manifest, images, cloud.sprite, 2 * cloud.x / cloud.z + 640, 2 * cloud.y / cloud.z + 384, scale, alpha);
      }
      const birdConfig = config.fugl;
      for (const bird of game.fugle) {
        const position = birdPosition(bird);
        if (bird.tilstand === 2 || bird.tilstand === 3) {
          drawSprite(ctx, manifest, images, birdConfig.ramt, position.x, position.y, bird.skala.v);
        } else {
          drawSprite(ctx, manifest, images, birdConfig.krop[bird.billede], position.x, position.y, bird.skala.v);
          if (bird.tilstand === 0) {
            drawSprite(ctx, manifest, images, birdConfig.foedder[bird.billede], position.x, position.y, bird.skala.v);
          }
        }
      }
      for (const crack of game.revner) {
        drawSprite(ctx, manifest, images, birdConfig.revne, crack.x, crack.y, 1, crack.alfa.v / 255);
      }
      drawSprite(ctx, manifest, images, config.propel.sprites[Math.floor(propellerTime / (1e3 / config.propel.fps)) % 3], config.propel.x, config.propel.y);
      for (const spriteId of config.baggrund.sprites) {
        drawSprite(ctx, manifest, images, spriteId, config.baggrund.x, config.baggrund.y);
      }
      for (const piece of game.stykker) {
        drawSprite(ctx, manifest, images, config.baand.sprite, config.baand.x, config.baand.y / piece.z.v, piece.sk.v);
      }
      for (const pkg of game.pakker) {
        if (game.greb && game.greb.pakke === pkg) {
          continue;
        }
        const pos = packageScreenPos(config, pkg);
        drawSprite(ctx, manifest, images, config.pakker.sprites[pkg.type], pos.x, pos.y, pkg.skala.v);
      }
      // The dragged parcel is drawn last, lifted above the pointer.
      const grab = game.greb;
      if (grab) {
        drawSprite(ctx, manifest, images, config.pakker.sprites[grab.pakke.type], grab.x == null ? grab.px : grab.x, grab.x == null ? grab.py : grab.y - config.pakker.loeft, grab.skala);
      }
      // One life icon per 255 units of animated life opacity.
      for (let lifeIndex = 0, lifeLeft = game.livAlfa.v; lifeLeft > 0; lifeIndex++, lifeLeft = Math.max(0, lifeLeft - 255)) {
        drawSprite(ctx, manifest, images, config.liv.sprite, config.liv.x + lifeIndex * config.liv.afstand, config.liv.y, 1, Math.min(255, lifeLeft) / 255);
      }
      // The narrator draws the pilot when present; otherwise draw the idle pilot. Then the arms (idle or throwing).
      if (narrator ? narrator.tegn(ctx, []) : drawAnimation(ctx, manifest, images, idleAnimation, pilotConfig.x, pilotConfig.y, pilotConfig.arme), drawAnimation(ctx, manifest, images, game.pilot === 1 ? throwAnimation : armsIdleAnimation, pilotConfig.x, pilotConfig.y), debugHitBoxes) {
        ctx.strokeStyle = "rgba(255,0,255,.9)";
        const [doorLeft, doorTop, doorRight, doorBottom] = config.doer;
        ctx.strokeRect(doorLeft, doorTop, doorRight - doorLeft, doorBottom - doorTop);
        const sprite = manifest.sprites[config.rude.sprite];
        if (sprite) {
          ctx.strokeRect(config.rude.x - sprite.w / 2, config.rude.y - sprite.h / 2, sprite.w, sprite.h);
        }
      }
      // Report the result once (the airmail game is always a "win"; the reward is the score).
      if (game.tilstand === GameState.SLUT && !finishReported) {
        finishReported = true;
        onFinish({ vundet: true, beloenning: game.point });
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    stopLoop = () => {
      cancelAnimationFrame(rafId);
      sounds.stopAlle();
      if (narrator) {
        narrator.stop();
      }
    };
  };
  // Space / Enter act like tapping the windscreen.
  const onKeyDown = (event) => {
    if (event.repeat || event.code !== "Space" && event.code !== "Enter") {
      return;
    }
    if (!(!game || paused)) {
      event.preventDefault();
      chaseBird(game);
    }
  };
  window.addEventListener("keydown", onKeyDown);
  // Convert a pointer event to canvas coordinates.
  const toCanvasCoords = (event) => {
    const rect = canvas.getBoundingClientRect();
    const config = assets.spil;
    return [(event.clientX - rect.left) * config.skaerm.bredde / rect.width, (event.clientY - rect.top) * config.skaerm.hoejde / rect.height];
  }, packageBox = (pkg) => {
    // [width, height, originX, originY] of a parcel's sprite at its current scale.
    const sprite = assets.manifest.sprites[assets.spil.pakker.sprites[pkg.type]];
    const scale = pkg.skala.v;
    return [sprite.w * scale, sprite.h * scale, sprite.ox * scale, sprite.oy * scale];
  }, spriteBox = (spriteId, x, y) => {
    // Hit box of a sprite placed at (x, y), or undefined if the sprite is unknown.
    const sprite = assets.manifest.sprites[spriteId];
    return sprite && { x: x, y: y, w: sprite.w, h: sprite.h, ox: sprite.ox, oy: sprite.oy };
  };
  // Scare away a bird (windscreen tap / Space / Enter); also skips the intro narration when allowed.
  const chaseBird = (currentGame) => {
    const result = scareBird(currentGame);
    if (result.spring && currentGame.fortaeller) {
      currentGame.fortaeller.spring();
    }
    if (result.jaget) {
      onMoneyEffect(result.point);
    }
  }, onPointerDown = (event) => {
    if (!game || paused) {
      return;
    }
    const [x, y] = toCanvasCoords(event);
    const config = assets.spil;
    if (isInsideBox(spriteBox(config.rude.sprite, config.rude.x, config.rude.y), x, y)) {
      chaseBird(game);
      return;
    }
    if (gamePointerDown(game, x, y, packageBox, spriteBox(config.pilot.sprite, config.pilot.x, config.pilot.y)) === "spring") {
      if (game.fortaeller) {
        game.fortaeller.spring();
      }
      return;
    }
    try {
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId);
      }
    }
    catch {
    }
  }, onPointerMove = (event) => {
    if (paused || !game) {
      return;
    }
    const [x, y] = toCanvasCoords(event);
    gamePointerMove(game, x, y);
  }, onPointerUp = (event) => {
    if (!game || paused) {
      return;
    }
    const [x, y] = toCanvasCoords(event);
    gamePointerUp(game, x, y);
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
      if (game && game.lyd) {
        game.lyd.saetTil(soundOn);
      }
      if (game && game.fortaeller) {
        game.fortaeller.saetLyd(soundOn);
      }
    }
  }
  function destroy() {
    destroyed = true;
    window.removeEventListener("keydown", onKeyDown);
    if (stopLoop) {
      stopLoop();
      stopLoop = null;
    }
    loading.destroy();
  }
  loadAirmailData().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    const config = assets.spil;
    canvas = h("canvas", { width: config.skaerm.bredde, height: config.skaerm.hoejde, style: { touchAction: "none", cursor: "grab" }, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp });
    showContent(h("div", { className: "spilflade" }, canvas));
    startGame();
  }, (error) => {
    if (destroyed) {
      return;
    }
    showContent(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-luftpost.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
  });
  return handle;
}
export { createAirmailGame as default };
