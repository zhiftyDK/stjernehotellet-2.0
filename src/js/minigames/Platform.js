// Platform minigame (the jungle platformer): entry point (default export = createPlatformGame factory).
//
// createPlatformGame loads the assets, picks a level for the chosen difficulty, runs the fixed-step game loop
// on a canvas (keyboard + pointer input, sounds, tutorial dialogs) and reports the result via onFinish.
// The game is split into modules in ./platform/:
//   constants.js / view.js / costumes.js / sprites.js  shared constants, view size, costume physics, sprite ids
//   track-path.js / moving-platform.js                  walkable paths and moving platforms
//   level.js (+ player.js, enemies.js, level-render.js) the level simulation and draw list
//   dialog.js                                           tutorial speech boxes and scripts
//   assets.js / render.js / hud.js / input.js           loading, drawing, HUD and key mapping
import { h, setChildren, removeEl } from '../dom.js';
import { createSoundBank, PLATFORM_SOUNDS } from '../loaders/data-loaders.js';
import { createLoadingScreen } from './ui-kit.js';
import { STEP_MS, VIEW_HEIGHT } from './platform/constants.js';
import { viewWidth, setViewWidth } from './platform/view.js';
import { unlockedCostumes } from './platform/costumes.js';
import { Level } from './platform/level.js';
import { createTutorial } from './platform/dialog.js';
import { loadPlatformAssets } from './platform/assets.js';
import { drawSprite, drawWorld } from './platform/render.js';
import { drawHud, costumeButtonPos } from './platform/hud.js';
import { KEY_ACTIONS } from './platform/input.js';

// Number of levels per difficulty setting.
const LEVELS_PER_DIFFICULTY = 4;

// Props: bredde = container width, svaer = difficulty (0..), pause = paused, lydTil = sound on,
// skrift = bitmap font for dialog text, paaSlut({vundet, beloenning}) = called when the level ends.
// update({ pause, lydTil, paaSlut }) applies the props that change while the game runs.
function createPlatformGame({ bredde: containerWidth = 1280, svaer: difficulty = 0, pause: paused = false, lydTil: soundOn = true, skrift: font = null, paaSlut: onFinish = () => {
} } = {}) {
  setViewWidth(containerWidth);
  // el is a layout-neutral wrapper: it holds the loading screen, then the game canvas (or an error message).
  const el = h("div", { style: { display: "contents" } });
  const loading = createLoadingScreen({ bredde: containerWidth });
  el.append(loading.el);
  let destroyed = false;
  // Which level to play: a random one among the LEVELS_PER_DIFFICULTY levels of the chosen difficulty.
  const levelIndex = difficulty * LEVELS_PER_DIFFICULTY + Math.floor(Math.random() * LEVELS_PER_DIFFICULTY);
  // Furthest level reached (persisted in localStorage); it decides which costumes are unlocked.
  let progress = (() => {
    try {
      return Number(localStorage.getItem("platform-naaet-v1")) || 0;
    }
    catch {
      return 0;
    }
  })();
  let canvas = null;
  let level = null;
  let sounds = null;
  let tutorial = null;
  let input = null;
  let stopGame = null;   // cleanup of the running level (render loop, sounds, key listeners)
  // Create the level, sounds, tutorial, input handlers and the animation-frame loop.
  const start = (assets, levelData) => {
    level = new Level(levelData, assets.anims, assets.index.baggrund);
    level.aabne = unlockedCostumes(progress);
    let rewardGiven = false;
    sounds = createSoundBank(Object.values(PLATFORM_SOUNDS));
    sounds.saetTil(soundOn);
    tutorial = assets.vejledning ? createTutorial(assets.vejledning, font) : null;
    const ctx = canvas.getContext("2d");
    input = { venstre: false, hoejre: false, hop: false, hopTrykket: false, fire: false };
    const onKeyDown = (event) => {
      if (paused) {
        return;
      }
      if (tutorial && tutorial.pauser) {
        if (KEY_ACTIONS[event.code] === "hop" || event.code === "Enter") {
          event.preventDefault();
          if (!event.repeat) {
            input.fire = true;
          }
        }
        return;
      }
      const costumeKey = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[event.code];
      if (costumeKey !== void 0) {
        event.preventDefault();
        level.skiftKostume(costumeKey);
        return;
      }
      const action = KEY_ACTIONS[event.code];
      if (action) {
        event.preventDefault();
        if (action === "hop" && !input.hop) {
          input.hopTrykket = true;
        }
        input[action] = true;
      }
    }, onKeyUp = (event) => {
      const action = KEY_ACTIONS[event.code];
      if (action) {
        event.preventDefault();
        input[action] = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    let rafId, lastTime = performance.now(), accumulator = 0, endTime = 0;
    const frame = (now) => {
      for (paused || (accumulator += Math.min(250, now - lastTime)), lastTime = now; accumulator >= STEP_MS;) {
        if (tutorial) {
          tutorial.trin(STEP_MS, input.fire);
        }
        input.fire = false;
        if (!tutorial || !tutorial.pauser) {
          level.step(input);
        }
        input.hopTrykket = false;
        accumulator -= STEP_MS;
      }
      for (const soundName of level.lyde.splice(0)) {
        sounds.spil(PLATFORM_SOUNDS[soundName]);
      }
      if (level.tilstand === "vundet" && !rewardGiven) {
        rewardGiven = true;
        const nextProgress = levelIndex === progress ? levelIndex + 1 : progress;
        if (nextProgress !== progress) {
          progress = nextProgress;
          try {
            localStorage.setItem("platform-naaet-v1", String(nextProgress));
          }
          catch {
          }
          level.aabne = unlockedCostumes(nextProgress);
        }
      }
      if ((level.tilstand === "vundet" || level.tilstand === "slut") && !endTime) {
        endTime = now;
      }
      if (endTime && now - endTime > 2e3 && endTime > 0) {
        endTime = -1;
        onFinish({ vundet: level.tilstand === "vundet", beloenning: level.mynterTaget });
      }
      drawWorld(ctx, level, assets.manifest, assets.images);
      if (assets.hud) {
        ctx.save();
        ctx.globalAlpha = tutorial ? tutorial.hudAlfa : 1;
        drawHud(ctx, level, assets.manifest, assets.images);
        ctx.restore();
      }
      if (tutorial) {
        tutorial.dialog.tegn(ctx, (spriteId, x, y) => drawSprite(ctx, assets.manifest, assets.images, spriteId, x, y, false, 1));
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      sounds.stopAlle();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  };
  const onPointerDown = (event) => {
    if (paused || !level) {
      return;
    }
    if (tutorial && tutorial.pauser) {
      if (input) {
        input.fire = true;
      }
      return;
    }
    const rect = canvas.getBoundingClientRect(), scale = Math.min(rect.width / viewWidth, rect.height / VIEW_HEIGHT), px = (event.clientX - rect.left - (rect.width - viewWidth * scale) / 2) / scale, py = (event.clientY - rect.top - (rect.height - VIEW_HEIGHT * scale) / 2) / scale;
    for (let buttonIndex = 0; buttonIndex < 4; buttonIndex++) {
      const buttonPos = costumeButtonPos(buttonIndex);
      if (Math.hypot(px - buttonPos.x, py - buttonPos.y) < 50) {
        level.skiftKostume(buttonIndex);
      }
    }
  };
  loadPlatformAssets().then((assets) => {
    if (destroyed) {
      return;
    }
    loading.destroy();
    canvas = h("canvas", { width: viewWidth, height: VIEW_HEIGHT, style: { objectFit: "contain", background: "#000", touchAction: "none" }, onPointerDown: onPointerDown });
    setChildren(el, h("div", { className: "spilflade" }, canvas));
    // Load the JSON for the chosen level, then start it.
    const levelEntry = assets.index.baner[levelIndex];
    const levelFile = levelEntry == null ? void 0 : levelEntry.navn;
    if (!levelFile) {
      return;
    }
    fetch(`data/platform/${levelFile}.json`).then((response) => response.json()).then((levelData) => {
      if (!destroyed) {
        stopGame = start(assets, levelData);
      }
    });
  }, (error) => {
    if (destroyed) {
      return;
    }
    loading.destroy();
    setChildren(el, h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-platform.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
  });
  return {
    el,
    update(next = {}) {
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
      }
    },
    destroy() {
      destroyed = true;
      if (stopGame) {
        stopGame();
        stopGame = null;
      }
      loading.destroy();
      removeEl(el);
    },
  };
}
export { createPlatformGame as default, costumeButtonPos as totemPos };
