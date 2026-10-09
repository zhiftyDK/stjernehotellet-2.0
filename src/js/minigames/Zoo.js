// Zoo minigame (entry point): a canvas zoo-building game. This file wires the loaded data, sound, narrator and UI
// together and runs the frame loop; the pieces live in ./zoo/ (assets, session, menus, tap-handler, scene-renderer,
// level-hud, money-effects, pointer-input). The game rules/state themselves are in ../game/world.js.

import { h, removeEl } from '../dom.js';
import { createNarrator } from '../audio/audio.js';
import { AnimationPlayer } from '../engine/animation.js';
import { HUD_SHIFT } from '../engine/constants.js';
import { tutorials } from '../game/save.js';
import { clearVisitors, createZooState, loadZooState, updateZoo } from '../game/world.js';
import { createSoundBank } from '../loaders/data-loaders.js';
import { createFigureOverlay, drawCurrencyHud } from '../render/canvas-helpers.js';
import { createInstructionPanel } from '../ui/panels.js';
import { createLoadingScreen, WindowStack, centeredUi, createUiKit } from './ui-kit.js';
import { loadZooData } from './zoo/assets.js';
import { createWallet } from './zoo/draw-utils.js';
import { createLevelHud } from './zoo/level-hud.js';
import { createZooMenus } from './zoo/menus.js';
import { createMoneyEffects } from './zoo/money-effects.js';
import { createPointerHandlers } from './zoo/pointer-input.js';
import { createAttractionAnchor } from './zoo/positions.js';
import { createSceneRenderer } from './zoo/scene-renderer.js';
import { SAVE_KEY, nowSeconds, saveZooToStorage, sessionFlags, zooSessionRef } from './zoo/session.js';
import { createTapHandler } from './zoo/tap-handler.js';

/**
 * The Zoo minigame. Props: bredde = canvas width, pause, lydTil = sound on, skrift = bitmap font,
 * ui = shared UI package ({ pakke, hud }), pung = optional shared wallet.
 * Returns { el, update({ pause, lydTil }), destroy }. While the assets load the element shows the vent loading screen;
 * afterwards the canvas game (or an error message) replaces it. The root is a `display: contents` wrapper so the
 * layout is the same as if the loading screen / game flade were direct children of the host.
 */
function createZooGame({ bredde: canvasWidth = 1280, pause: paused = false, lydTil: soundOn = true, skrift: bitmapFont = null, ui: ui = null, pung: sharedWallet = null } = {}) {
  const el = h("div", { style: { display: "contents" } });
  let destroyed = false;
  let loadingScreen = createLoadingScreen({ bredde: canvasWidth });
  el.append(loadingScreen.el);
  /** Live game object { menuer, kit, poke, tryk } used by the pointer handlers. */
  const gameRef = { current: null };
  const soundBankRef = { current: null };
  const narratorRef = { current: null };
  /** Camera position {x, y} in world pixels (the visible area's top-left corner). */
  const cameraRef = { current: { x: 0, y: 0 } };
  /** Pointer gesture in progress (start position, moved distance, whether it began on a menu). */
  const dragRef = { current: null };
  const pausedRef = { current: paused };
  const canvasRef = { current: null };
  /** Stops the frame loop, sounds and timers of the running game (set by startGame). */
  let stopGame = null;
  const removeLoadingScreen = () => {
    if (loadingScreen) {
      loadingScreen.destroy();
      removeEl(loadingScreen.el);
      loadingScreen = null;
    }
  };
  /** Builds the canvas and starts the game once the data has loaded. */
  const startGame = (loadState) => {
    const canvasPointer = createPointerHandlers({ canvasRef, gameRef, dragRef, pausedRef, cameraRef, loadState, canvasWidth });
    const canvas = h("canvas", { width: canvasWidth, height: 768, style: { touchAction: "none", cursor: "grab" }, onPointerDown: canvasPointer.onPointerDown, onPointerMove: canvasPointer.onPointerMove, onPointerUp: canvasPointer.onPointerUp, onPointerCancel: canvasPointer.onPointerUp });
    canvasRef.current = canvas;
    removeLoadingScreen();
    el.append(h("div", { className: "spilflade" }, canvas));
    if (!ui || !ui.pakke) {
      return;
    }
    // Shortcuts into the loaded data: game rules/config, texts, assets and the animation table.
    const config = loadState.spil;
    const texts = loadState.tekster;
    const zooAssets = loadState.zoo;
    const manifest = zooAssets.manifest;
    const textures = zooAssets.I;
    const animations = zooAssets.anims;
    const attractionCfg = config.sevaerdighed;
    const wallet = sharedWallet || createWallet(config.regler.startPenge);
    // First mount: restore the saved zoo from localStorage, or start a new one.
    if (!zooSessionRef.current) {
      let savedState = null;
      try {
        savedState = JSON.parse(localStorage.getItem(SAVE_KEY));
      }
      catch {
      }
      zooSessionRef.current = { s: savedState ? loadZooState(config, savedState) : createZooState(config), kam: savedState && savedState.kam || { x: 0, y: 0 } };
    }
    const zoo = zooSessionRef.current.s;
    // The game state keeps a reference to the config, and a factory for animation players.
    zoo.Z = config;
    zoo.film = (animationId) => {
      const animationData = animations.get(animationId);
      return animationData ? new AnimationPlayer(animationData) : null;
    };
    cameraRef.current = zooSessionRef.current.kam;
    for (const attraction of zoo.sev) {
      if (attraction.type) {
        zooAssets.hentType(attraction.type);
      }
    }
    // Start loading the textures the first frames will need.
    zooAssets.forhaand([...config.dyr.ikkeAktiv, attractionCfg.byg[2], ...config.rede.film, ...config.genstand.film[0], config.genstand.sav, ...config.bod.film, ...config.bod.byg, ...config.balloner.film.flat()], [config.rede.laas]);
    for (const shop of zoo.boder) {
      if (shop.type >= 1) {
        zooAssets.forhaand(config.bod.vare.film[shop.type]);
      }
    }
    for (const item of zoo.genstande) {
      if (item.sev >= 0) {
        zooAssets.forhaand([config.genstand.film[item.kat][item.f]]);
      }
    }
    const sounds = createSoundBank([...new Set([...Object.values(config.lyde), ...config.dyr.lyd, ...config.balloner.lyde.flat(), config.niveau.lyd])]);
    sounds.saetTil(soundOn);
    soundBankRef.current = sounds;
    // Narrator (the talking mascot): `figureValues` = current mouth/pose value per figure slot.
    const narratorCfg = texts.hoveder;
    const narrator = createNarrator(loadState.fortaeller, Math.round((canvasWidth - 1024) / 2));
    const figureValues = [0, 0, 0, 0, 0];
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.figur = (figureIndex, value) => {
        if (figureIndex >= 0 && figureIndex < figureValues.length) {
          figureValues[figureIndex] = value;
        }
      };
    }
    narratorRef.current = narrator;
    const figureOverlay = ui.hud ? createFigureOverlay(ui.hud.M, ui.hud.I, narratorCfg, canvasWidth - 1280) : null;
    /** Makes the narrator say the line registered for game event `s` (e.g. "velkomst", "bod"). */
    const playNarratorEvent = (eventName) => {
      const line = narratorCfg.haendelser[eventName];
      if (!(!narrator || line === void 0)) {
        figureValues.fill(0);
        narrator.spil(line);
        narrator.slump();
      }
    };
    const canvasCtx = canvas.getContext("2d");
    const uiPack = ui.pakke.U;
    const uiKit = createUiKit(canvasCtx, { ui: { M: ui.pakke.M, I: ui.pakke.I }, zoo: { M: manifest, I: textures, anims: animations } }, uiPack, bitmapFont);
    /** Stack of popup windows (menus, dialogs, tutorials). */
    const windows = new WindowStack(centeredUi(uiPack, canvasWidth));
    /** Builds the instruction (tutorial) panel number `s`; its "read aloud" button starts the matching narrator line. */
    const instructionPanel = (panelNumber) => createInstructionPanel({ V: texts.vejledning, nr: panelNumber, pakke: "zoo", laes: (speechId, figureArg) => {
        if (narrator) {
          figureValues.fill(0);
          narrator.startForfra(speechId, { 0: figureArg });
        }
      } });
    // First visit shows tutorial 2; later sessions play the welcome line once.
    if (!tutorials.har("zoo2") && zoo.sev.every((attraction) => attraction.type === 0)) {
      tutorials.saet("zoo2");
      windows.aabn(instructionPanel(2));
    } else if (!sessionFlags.welcomeShown) {
      sessionFlags.welcomeShown = true;
      playNarratorEvent("velkomst");
    }
    // Shared context handed to the helper modules (menus, tap handler, renderers, HUD).
    const ctx = { config, texts, zooAssets, manifest, textures, animations, attractionCfg, wallet, zoo, sounds, narratorCfg, narrator, figureValues, playNarratorEvent, canvasCtx, uiPack, uiKit, windows, instructionPanel, cameraRef, bitmapFont, ui, canvasWidth, loadState, pausedRef };
    ctx.menus = createZooMenus(ctx);
    ctx.moneyEffects = createMoneyEffects(ctx);
    ctx.attractionAnchor = createAttractionAnchor(config);
    gameRef.current = {
      menuer: windows,
      kit: uiKit,
      poke() {
        if (narrator) {
          narrator.poke();
        }
      },
      tryk: createTapHandler(ctx),
    };
    const { updateLevelBar, drawLevelHud } = createLevelHud(ctx);
    clearVisitors(zoo);
    const scene = createSceneRenderer(ctx);
    let animationFrameId, lastTimestamp = performance.now();
    /** One animation frame: advance the simulation (max 250 ms per step, 0 while paused), then draw everything. */
    const frame = (timestamp) => {
      const dtMs = pausedRef.current ? 0 : Math.min(250, timestamp - lastTimestamp);
      lastTimestamp = timestamp;
      const nowSec = nowSeconds();
      if (dtMs > 0) {
        updateZoo(zoo, dtMs, nowSec);
      }
      if (narrator) {
        narrator.tik(dtMs);
      }
      if (figureOverlay) {
        figureOverlay.fremad(dtMs, !!narrator && narrator.taler);
      }
      for (const soundName of zoo.lyde.splice(0)) {
        sounds.spil(soundName);
      }
      scene.advancePlayers(dtMs);
      scene.draw(timestamp, nowSec);
      if (ui.hud) {
        drawCurrencyHud(canvasCtx, ui.hud.H, ui.hud.M, ui.hud.I, bitmapFont, wallet.penge);
      }
      updateLevelBar(dtMs);
      if (ui.hud) {
        canvasCtx.save();
        canvasCtx.translate(-HUD_SHIFT, 0);
        drawLevelHud();
        canvasCtx.restore();
      }
      if (figureOverlay) {
        figureOverlay.tegn(canvasCtx, narratorCfg.figurTale.map((figureIndex) => figureIndex >= 0 ? figureValues[figureIndex] : 0));
      }
      ctx.moneyEffects.updateAndDraw(dtMs);
      windows.tegn(uiKit, canvasCtx, canvasWidth, 768);
      animationFrameId = requestAnimationFrame(frame);
    };
    animationFrameId = requestAnimationFrame(frame);
    // The mouse wheel scrolls the open menu (non-passive so the page does not scroll).
    const onWheel = (wheelEvent) => {
      if (windows.aaben) {
        wheelEvent.preventDefault();
        windows.rul(wheelEvent.deltaY);
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    const saveTimer = setInterval(saveZooToStorage, 5e3);
    window.addEventListener("beforeunload", saveZooToStorage);
    stopGame = () => {
      cancelAnimationFrame(animationFrameId);
      sounds.stopAlle();
      if (narrator) {
        narrator.stop();
      }
      canvas.removeEventListener("wheel", onWheel);
      saveZooToStorage();
      clearInterval(saveTimer);
      window.removeEventListener("beforeunload", saveZooToStorage);
    };
  };
  /** Shows the load error message. */
  const showError = (error) => {
    removeLoadingScreen();
    el.append(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-zoo.js"), " og ", h("code", null, "node Tools/export-minispil-tekster.js"), ".")));
  };
  loadZooData().then((loadState) => {
    if (!destroyed) {
      startGame(loadState);
    }
  }, (error) => {
    if (!destroyed) {
      showError(error);
    }
  });
  return {
    el,
    update(next = {}) {
      if ("pause" in next) {
        paused = !!next.pause;
        pausedRef.current = paused;
      }
      if ("lydTil" in next) {
        soundOn = next.lydTil;
        if (soundBankRef.current) {
          soundBankRef.current.saetTil(soundOn);
        }
        if (narratorRef.current) {
          narratorRef.current.saetLyd(soundOn);
        }
      }
    },
    destroy() {
      destroyed = true;
      removeLoadingScreen();
      if (stopGame) {
        stopGame();
        stopGame = null;
      }
    },
  };
}
export { createZooGame as default };
