// Minigame host: wraps every minigame in a common frame. It loads the shared minigame UI pack
// (data/minispil-ui), runs a canvas overlay (difficulty-selection intro with the narrator, the "pause/quit?"
// sign and dialog, the reward window at the end) and mounts the lazily loaded minigame beneath it.
// Used by the game screen via createMinigameHost / isMinigame.
import { h, setVisible, removeEl } from '../dom.js';
import { FRAME_MS, easeInOutSine, WindowStack, createUiKit, createLoadingScreen, centeredUi } from './ui-kit.js';
import { GAME_WIDTH, WIDE_MINIGAMES, MINIGAME_OFFSET } from '../engine/constants.js';
import { AnimationPlayer } from '../engine/animation.js';
import { getAnimationBounds, drawSprite, drawAnimation, createTextureLoader } from '../render/canvas-helpers.js';
import { registerAudioElement, soundUrl, loadNarratorData, createNarrator } from '../audio/audio.js';
import { createMoneyPopups } from '../game/hotel.js';
// Tween from `from` to `to` over durationFrames (30 fps frames). Advance by adding ms to `.t`;
// `.v` is the eased value (cosine ease in/out), `.faerdig` tells when it has finished.
function createTimedTween(from, to, durationFrames) {
  return { fra: from, til: to, t: 0, n: durationFrames * FRAME_MS, get v() {
      return this.fra + (this.til - this.fra) * easeInOutSine(this.t / this.n);
    }, get faerdig() {
      return this.t >= this.n;
    } };
}
// Builds the controller for the canvas overlay around a minigame (the "shell").
// Phases (`fase`): "intro" (narrator asks for difficulty, buttons slide in/out, fade), "spil" (game running,
// only the pause sign is drawn) and "slut" (reward window shown).
// introStep: 0 = fading in, 1 = waiting for a difficulty click, 2 = narrator answering, 3 = fading out, 4 = waiting for narrator to finish.
// Parameters: bw canvas width; MU shell ui definitions; M/I manifest and images of the shell pack;
// fort narrator; kit ui kit; U ui definitions; nr minigame number; lydSti sound folder;
// haendelse(event) callback ({art: start|fortsaet|afslut|faerdig}); effekter optional money-popup manager.
// Returns { fase, aktiv, skiltFelt, skiftSkilt, skiltTryk, fremad(ms), tegn(ctx), klik(point), pause(), slut(reward) }.
function createMinigameShell({ bw: canvasWidth = 1280, MU: uiConfig, M: manifest, I: images, fort: narrator, kit: kit, U: uiDefs, nr: gameNumber, lydSti: soundDir, haendelse: onEvent, effekter: effects = null }) {
  // Wide minigames are drawn with a horizontal offset in the intro; the sign moves right by the extra width.
  const offsetX = canvasWidth > 1280 ? MINIGAME_OFFSET : 0;
  const extraWidth = canvasWidth - 1280;
  const signShiftX = extraWidth;
  const windows = new WindowStack(centeredUi(uiDefs, canvasWidth));
  const animationsById = new Map(manifest.animations.map((anim) => [anim.id, anim]));
  // Creates an AnimationPlayer for an animation id (or null) and renders its first frame.
  const createPlayer = (animationId) => {
    const animation = animationsById.get(animationId), player = animation ? new AnimationPlayer(animation) : null;
    if (player) {
      player.advance(0);
    }
    return player;
  };
  // Animated pause sign in the corner, the animation shown in the quit dialog, and the intro definitions.
  const signPlayer = createPlayer(uiConfig.skilt.film);
  const signBounds = signPlayer ? getAnimationBounds(manifest, signPlayer) : null;
  const exitPlayer = uiConfig.afslut.film[gameNumber + 1] > 0 ? createPlayer(uiConfig.afslut.film[gameNumber + 1]) : null;
  const intro = uiConfig.intro;
  let phase = intro.udenIntro.includes(gameNumber) ? "spil" : "intro";
  let introStep = 0;
  // Black overlay opacity 255 -> 0 (fade in).
  let fade = createTimedTween(255, 0, intro.fade.billeder);
  // The difficulty buttons (one sprite each); start off-screen at intro.ude and slide to intro.maal.
  const difficultyButtons = intro.knapper.map((spriteId, index) => ({ id: spriteId, i: index, x: createTimedTween(intro.ude[0], intro.ude[0], 1), y: createTimedTween(intro.ude[1], intro.ude[1], 1) }));
  // Index of the clicked difficulty button (-1 = none), reported with the "start" event.
  let chosenDifficulty = -1;
  // Slides a button from its current position to (targetX, targetY).
  const moveButton = (button, [targetX, targetY]) => {
    button.x = createTimedTween(button.x.v, targetX, intro.glid);
    button.y = createTimedTween(button.y.v, targetY, intro.glid);
  };
  if (phase === "intro" && narrator) {
    narrator.spil(intro.scripts.spoerg);
    narrator.slump();
  }
  // True while the narrator is still speaking.
  const isNarratorBusy = () => !!narrator && narrator.optaget();
  // Optional replacement click action for the sign (set by the minigame via signApi.skift).
  let signOverride = null;
  // Plays a one-off sound file from the minigame UI sound folder.
  const playSound = (soundFile) => {
    if (soundFile) {
      registerAudioElement(new Audio(soundUrl(soundDir, soundFile)), soundUrl(soundDir, soundFile)).play().catch(() => {
      });
    }
  };
  return { get fase() {
      return phase;
    }, get aktiv() {
      return phase === "intro" || windows.aaben;
    }, skiltFelt: signBounds && { x0: uiConfig.skilt.x + signBounds.x0 + signShiftX, y0: uiConfig.skilt.y + signBounds.y0, x1: uiConfig.skilt.x + signBounds.x1 + signShiftX, y1: uiConfig.skilt.y + signBounds.y1 }, skiftSkilt(override) {
      signOverride = override || null;
    }, skiltTryk() {
      if (signOverride) {
        signOverride();
        return true;
      }
      return false;
    }, fremad(deltaMs) {
      if (effects && effects.fremad(deltaMs), signPlayer && signPlayer.advance(deltaMs), exitPlayer && exitPlayer.advance(deltaMs), phase === "intro") {
        if (narrator) {
          narrator.tik(deltaMs);
        }
        fade.t += deltaMs;
        for (const button of difficultyButtons) {
          button.x.t += deltaMs;
          button.y.t += deltaMs;
        }
        if (introStep === 0 && fade.v <= 0) {
          difficultyButtons.forEach((button) => moveButton(button, intro.maal[button.i]));
          introStep = 1;
        } else if (introStep === 2 && !isNarratorBusy()) {
          fade = createTimedTween(0, 255, intro.fade.billeder);
          introStep = 3;
        } else if (introStep === 3 && fade.faerdig) {
          introStep = 4;
        } else if (introStep === 4 && !isNarratorBusy()) {
          phase = "spil";
          if (narrator) {
            narrator.stop();
          }
          onEvent({ art: "start", svaer: chosenDifficulty });
        }
      }
    }, tegn(ctx) {
      if (ctx.clearRect(0, 0, canvasWidth, 768), phase === "intro") {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvasWidth, 768);
        ctx.save();
        ctx.translate(offsetX, 0);
        const [bgId, bgX, bgY] = intro.baggrund;
        drawSprite(ctx, manifest, images, bgId, bgX, bgY);
        if (narrator) {
          narrator.tegn(ctx);
        }
        for (const button of difficultyButtons) {
          drawSprite(ctx, manifest, images, button.id, button.x.v, button.y.v);
        }
        ctx.restore();
        const fadeAlpha = fade.v;
        if (fadeAlpha > 0) {
          ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAlpha / 255)})`;
          ctx.fillRect(0, 0, canvasWidth, 768);
        }
      } else if (signPlayer && !signOverride) {
        drawAnimation(ctx, manifest, images, signPlayer, uiConfig.skilt.x + signShiftX, uiConfig.skilt.y);
      }
      if (effects && phase !== "intro") {
        effects.tegn(ctx);
      }
      windows.tegn(kit, ctx, canvasWidth, 768);
    }, klik(point) {
      if (windows.klik(kit, point)) {
        return true;
      }
      if (phase === "intro") {
        if (introStep !== 1) {
          return true;
        }
        point = { x: point.x - offsetX, y: point.y };
        const hitButton = difficultyButtons.find((button) => {
          const sprite = manifest.sprites[button.id];
          if (!sprite) {
            return false;
          }
          const left = button.x.v - sprite.ox, top = button.y.v - sprite.oy;
          return point.x >= left && point.x <= left + sprite.w && point.y >= top && point.y <= top + sprite.h;
        });
        if (hitButton) {
          chosenDifficulty = hitButton.i;
          if (narrator) {
            narrator.spil(intro.scripts.valgt);
            narrator.saet(0, hitButton.i);
            narrator.slump();
          }
          difficultyButtons.forEach((button) => {
            if (button !== hitButton) {
              moveButton(button, intro.ude);
            }
          });
          introStep = 2;
        }
        return true;
      }
      return false;
    }, pause() {
      if (windows.aaben || phase !== "spil") {
        return;
      }
      playSound(uiConfig.pauseLyde[gameNumber]);
      const endMenu = uiConfig.afslut;
      windows.aabn({ titel: endMenu.spoergsmaal, luk: false, tegn(kit, rect, stack) {
          if (exitPlayer) {
            kit.anim("mui", exitPlayer, rect.x + endMenu.anim[0], rect.y + endMenu.anim[1], endMenu.anim[2]);
          }
          const resume = () => {
            stack.luk();
            onEvent({ art: "fortsaet" });
          };
          kit.spriteKnap(endMenu.nej[0], rect.x + endMenu.nej[1], rect.y + endMenu.nej[2], resume);
          kit.spriteKnap(endMenu.ja[0], rect.x + endMenu.ja[1], rect.y + endMenu.ja[2], () => {
            stack.luk();
            onEvent({ art: "afslut" });
          });
          kit.spriteKnap(endMenu.luk[0], rect.x + endMenu.luk[1], rect.y + endMenu.luk[2], resume);
        } });
    }, slut(reward) {
      if (phase !== "slut") {
        phase = "slut";
        windows.lukAlle();
        windows.aabn({ titel: uiConfig.tekster.beloenning, luk: false, bredde: 576, hoejde: 288, tegn(kit, rect, stack) {
            const text = String(reward), textWidth = kit.skrift ? kit.skrift.bredde(text, 73) : 0, startX = rect.x + rect.w / 2 - (textWidth + 70) / 2;
            kit.sprite("ui", uiDefs.ikoner.moent, startX + 30, rect.y + 120);
            if (kit.skrift) {
              kit.skrift.tegn(kit.ctx, text, startX + 70, rect.y + 120, { str: 73 });
            }
            kit.spriteKnap(uiDefs.ikoner.ja, rect.x + rect.w / 2, rect.y + rect.h - 64, () => {
              stack.luk();
              onEvent({ art: "faerdig", beloenning: reward });
            });
          } });
      }
    } };
}
// Minigame number -> loader of the minigame module (its default export is the createXxxGame factory).
export const MINIGAME_COMPONENTS = { 1: () => import("./Findting.js"), 2: () => import("./Sortering.js"), 3: () => import("./Luftpost.js"), 4: () => import("./Kuffert.js"), 5: () => import("./Golf.js"), 6: () => import("./Is.js"), 7: () => import("./Byttespil.js"), 8: () => import("./Picross.js"), 9: () => import("./Baad.js"), 10: () => import("./Platform.js"), 11: () => import("./Zoo.js"), 12: () => import("./Pop.js") }, isMinigame = (gameNumber) => gameNumber in MINIGAME_COMPONENTS;
// Loads the shared minigame UI pack and the intro narrator data. Resolves to { MU, M, T, intro }; rejects on error.
async function loadMinigameUi() {
  const [uiData, manifest, narratorData] = await Promise.all([fetch("data/minispil-ui/minispil-ui.json").then((res) => res.json()), fetch("data/minispil-ui/manifest.json").then((res) => res.json()), loadNarratorData("intro")]);
  return { MU: uiData, M: manifest, T: createTextureLoader("data/minispil-ui", manifest), intro: narratorData };
}
// Creates the host that shows minigame number `nr` with its shell.
// Props: nr minigame number; ui {M, T, U} main ui pack (manifest, textures, definitions); skrift bitmap font;
// hud/moent optional hud pack and coin-popup data; pung wallet info passed on to the game; tilbage(reward)
// called when the player quits (0) or finishes (reward in coins); ekstraPause forces the game to be paused.
// Returns { el, update({ ekstraPause }), destroy }.
export function createMinigameHost({ nr: gameNumber, ui: ui, skrift: font, hud: hud = null, pung: wallet = null, moent: coinSource = null, tilbage: onExit, ekstraPause: extraPause = false }) {
  let shellUi = null;
  let phase = null;
  let difficulty = 0;
  let paused = false;
  // While true the shell canvas captures pointer events (intro/dialogs); otherwise clicks fall through to the game.
  let overlayActive = true;
  let signRect = null;
  let shell = null;
  let popups = null;
  let destroyed = false;
  let frameId = 0;
  let errorEl = null;
  let loadingScreen = null;
  let game = null;
  let gameRequested = false;
  let signEl = null;
  const canvasWidth = WIDE_MINIGAMES.has(gameNumber) ? GAME_WIDTH : 1280;
  const percent = (value, total) => `${value / total * 100}%`;
  const toCanvasPoint = (pointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return { x: (pointerEvent.clientX - box.left) * canvasWidth / box.width, y: (pointerEvent.clientY - box.top) * 768 / box.height };
  };
  const handlePointerDown = (pointerEvent) => {
    if (shell) {
      shell.klik(toCanvasPoint(pointerEvent));
    }
  };
  const syncPause = () => {
    if (game) {
      game.update({ pause: paused || extraPause });
    }
  };
  const setPaused = (value) => {
    paused = value;
    syncPause();
  };
  const handleSignClick = () => {
    if (shell) {
      if (!shell.skiltTryk()) {
        shell.pause();
        setPaused(true);
      }
    }
  };
  const signApi = { skift: (override) => {
      if (shell) {
        shell.skiftSkilt(override);
      }
    } };
  const addMoneyPopup = (amount, x, y) => {
    if (popups) {
      popups.tilfoej(amount, x, y);
    }
  };
  const finish = ({ beloenning: reward = 0 } = {}) => {
    if (shell) {
      shell.slut(reward);
      setPaused(true);
    }
  };
  const uiApi = { ramme(ctx, x, y, width, height, frameName = "hoved") {
      createUiKit(ctx, { ui: { M: ui.M, I: ui.T.I } }, ui.U, font).ramme(frameName, x, y, width, height);
    }, sprite(ctx, spriteId, x, y) {
      drawSprite(ctx, ui.M, ui.T.I, spriteId, x, y);
    }, faelles(ctx, spriteId, x, y) {
      if (shellUi) {
        drawSprite(ctx, shellUi.M, shellUi.T.I, spriteId, x, y);
      }
    }, U: ui.U, pakke: { M: ui.M, I: ui.T.I, U: ui.U }, hud: hud && { H: hud.H, M: hud.M, I: hud.T.I } };
  const canvas = h("canvas", { width: canvasWidth, height: 768, className: "minispil-ramme", style: { pointerEvents: "auto" }, onPointerDown: handlePointerDown });
  const flade = h("div", { className: "minispil-flade", style: { aspectRatio: `${canvasWidth} / 768` } }, canvas);
  const el = h("div", { className: canvasWidth > 1280 ? "minispil bred" : "minispil" }, flade);
  const showError = (message) => {
    if (!errorEl) {
      errorEl = h("p", { className: "msg" });
      flade.insertBefore(errorEl, flade.firstChild);
    }
    errorEl.textContent = message;
  };
  // Shows or hides the pause-sign hit area depending on overlayActive / signRect.
  const syncSign = () => {
    const wanted = !overlayActive && !!signRect;
    if (wanted && !signEl) {
      signEl = h("div", { className: "minispil-skilt", onPointerDown: handleSignClick, style: { left: percent(signRect.x0, canvasWidth), top: percent(Math.max(0, signRect.y0), 768), width: percent(signRect.x1 - signRect.x0, canvasWidth), height: percent(signRect.y1 - Math.max(0, signRect.y0), 768) } });
      flade.append(signEl);
    }
    if (signEl) {
      setVisible(signEl, wanted);
    }
  };
  const setOverlayActive = (value) => {
    overlayActive = value;
    canvas.style.pointerEvents = value ? "auto" : "none";
    syncSign();
  };
  // Once the intro is over: show the loading screen, load the minigame module and mount the game before the canvas.
  const startGame = async () => {
    if (gameRequested) {
      return;
    }
    gameRequested = true;
    loadingScreen = createLoadingScreen({ bredde: canvasWidth });
    flade.insertBefore(loadingScreen.el, canvas);
    try {
      const module = await MINIGAME_COMPONENTS[gameNumber]();
      if (destroyed) {
        return;
      }
      loadingScreen.destroy();
      removeEl(loadingScreen.el);
      loadingScreen = null;
      game = module.default({ bredde: canvasWidth, svaer: difficulty, pause: paused || extraPause, lydTil: true, skrift: font, ui: uiApi, pung: wallet, paaSlut: finish, skilt: signApi, pengeEffekt: addMoneyPopup });
      if (game.el) {
        flade.insertBefore(game.el, canvas);
      }
    }
    catch (error) {
      if (!destroyed) {
        console.error(error);
        showError("Kunne ikke indlæse minispillet: " + error.message);
      }
    }
  };
  const setPhase = (value) => {
    phase = value;
    if (phase && phase !== "intro") {
      startGame();
    }
  };
  const handleShellEvent = (event) => {
    if (event.art === "start") {
      difficulty = event.svaer;
      setPhase("spil");
    } else if (event.art === "fortsaet") {
      setPaused(false);
    } else if (event.art === "afslut") {
      onExit(0);
    } else if (event.art === "faerdig") {
      onExit(event.beloenning);
    }
  };
  const startShell = () => {
    const ctx = canvas.getContext("2d");
    const kit = createUiKit(ctx, { ui: { M: ui.M, I: ui.T.I }, mui: { M: shellUi.M, I: shellUi.T.I } }, ui.U, font);
    popups = coinSource ? createMoneyPopups(coinSource.D, coinSource.M, coinSource.I, font) : null;
    shell = createMinigameShell({ bw: canvasWidth, effekter: popups, MU: shellUi.MU, M: shellUi.M, I: shellUi.T.I, fort: createNarrator(shellUi.intro), kit: kit, U: ui.U, nr: gameNumber, lydSti: "data/minispil-ui/lyd", haendelse: handleShellEvent });
    signRect = shell.skiltFelt;
    setPhase(shell.fase);
    // Render loop; frame time is capped at 250 ms.
    let lastTime = performance.now();
    let lastActive = null;
    const loop = (now) => {
      shell.fremad(Math.min(250, now - lastTime));
      lastTime = now;
      shell.tegn(ctx);
      if (shell.aktiv !== lastActive) {
        lastActive = shell.aktiv;
        setOverlayActive(lastActive);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
  };
  loadMinigameUi().then((loaded) => {
    if (destroyed) {
      return;
    }
    shellUi = loaded;
    startShell();
  }, (error) => {
    if (!destroyed) {
      showError("Kunne ikke indlæse minispillets ramme: " + error.message);
    }
  });
  return { el, update(next = {}) {
      if ("ekstraPause" in next) {
        extraPause = next.ekstraPause;
        syncPause();
      }
    }, destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      if (loadingScreen) {
        loadingScreen.destroy();
        removeEl(loadingScreen.el);
        loadingScreen = null;
      }
      if (game) {
        if (game.destroy) {
          game.destroy();
        }
        removeEl(game.el);
        game = null;
      }
      removeEl(el);
    } };
}
