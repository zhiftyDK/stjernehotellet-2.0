/**
 * Minigolf minigame (entry point, default export = createMinigolfGame factory).
 *
 * Up to three golfers play a few holes. Flow (see Phase in golf/physics.js):
 * intro narration -> choose players in the clubhouse -> per turn: aim
 * (rotate with the arrow buttons / keys), press the action button to start
 * the accuracy pendulum, press again to stop it, press again to set the power
 * -> the ball rolls and bounces -> after each hole a scoreboard is shown ->
 * finale. The reward is paid out via onFinish.
 *
 * The code is split into modules in minigames/golf/:
 *   physics.js   - rules and ball physics (pure game state, no drawing)
 *   camera.js    - scrolling camera
 *   clubhouse.js - clubhouse scene (figures, start button, clouds, bushes, scoreboard)
 *   draw.js      - small canvas drawing helpers
 *   data.js      - data / image loading
 * This file ties them together: it owns the narrator script, the HUD (swing
 * pendulum and power bar), input handling and the render loop.
 */
import { h, setChildren, removeEl } from '../dom.js';
import { FRAME_MS } from '../engine/tween.js';
import { createSoundBank, GOLF_SOUNDS } from '../loaders/data-loaders.js';
import { createNarrator } from '../audio/audio.js';
import { createLoadingScreen } from './ui-kit.js';
import { Phase, createGame, togglePlayer, confirmPlayers, advanceGame, rotateAim, pressAction } from './golf/physics.js';
import { setCanvasWidth, createCamera } from './golf/camera.js';
import { createFigures, createStartButton, drawClubhouseTiles, createClouds, drawBushes, drawScoreboard } from './golf/clubhouse.js';
import { drawSpriteAt, drawTileLayer } from './golf/draw.js';
import { loadGolfData } from './golf/data.js';

// Layout of the two HUD panels that slide up from the bottom of the screen
// (pixels): the swing pendulum arc (bueX, drejX/drejY = arc centre, radius)
// and the power bar (kraft). `skjult` = y offset when hidden, `glid` = slide
// duration in ms.
const HUD_LAYOUT = { y: 672, bueX: 640, drejX: 640, drejY: 860, radius: 240, kraft: { x: 396, dy: -12, b: 504, h: 72, rammeX: 648, rammeDy: 24 }, skjult: 384, glid: 10 * (1e3 / 30) };
/** Ease-in-out (cosine) of progress clamped to 0..1. */
const smoothstep = (progress) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, progress)));
// 16.16 fixed-point representation of 1.0 used by the game data.
const FIXED_POINT_SCALE = 65536;
// Random integer in [min, max] inclusive.
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
/**
 * The minigame factory: createMinigolfGame(props) -> { el, update(partial), destroy }.
 * Props: bredde = logical canvas width (default 1280), svaer = difficulty,
 * pause, lydTil = sound on, skrift = bitmap font renderer,
 * paaSlut({vundet, beloenning}) = called once at the end.
 * update({ pause, lydTil, paaSlut }) applies the props that change while the game runs.
 */
function createMinigolfGame({ bredde: width = 1280, svaer: difficulty = 0, pause: paused = false, lydTil: soundOn = true, skrift: font = null, paaSlut: onFinish = () => {
} } = {}) {
  setCanvasWidth(width);
  // el is a layout-neutral wrapper: it holds the loading screen, then the game canvas (or an error message).
  const el = h("div", { style: { display: "contents" } });
  const loading = createLoadingScreen({ bredde: width });
  el.append(loading.el);
  let destroyed = false;
  let handle = null;           // {s: game, vaelg(x, y), aktiver()} used by the pointer handlers
  let sounds = null;
  let stopGame = null;         // cleanup of the running game (render loop, sounds, narrator)
  let canvas = null;
  let aimDirection = 0;        // -1 / 0 / 1: aim rotation held by button or arrow key
  // Build the game, narrator script and render loop once data is ready.
  const start = (data) => {
    const config = data.spil;
    const manifest = data.manifest;
    const images = data.images;
    const clubhouse = config.klubhus;
    const phases = Phase;
    const game = createGame(config, difficulty);
    sounds = createSoundBank(Object.values(GOLF_SOUNDS));
    sounds.saetTil(soundOn);
    // Clubhouse camera; cameraLook(i) pans to preset view i (0 = line-up, 1 = start, 2 = aim, 3 = scoreboard).
    const camera = createCamera({ verdenB: clubhouse.top.kolonner * clubhouse.top.flise, verdenH: clubhouse.top.raekker * clubhouse.top.flise, ...clubhouse.kamera.top });
    const cameraLook = (index) => camera.maal(...clubhouse.kamera.maal[index]);
    cameraLook(0);
    const figures = createFigures(clubhouse, manifest);
    const startButton = createStartButton(clubhouse);
    const clouds = createClouds(clubhouse);
    let scoreboardVisible = false;
    // Camera over the current course; starts focused on the ball.
    const createCourseCamera = () => {
      const background = game.bane.bag;
      const tileSize = manifest.sprites[background.base] ? manifest.sprites[background.base].w : 256;
      const courseCam = createCamera({ verdenB: background.kolonner * tileSize, verdenH: background.raekker * tileSize, ...clubhouse.kamera.bane });
      courseCam.tvang(game.bold.x, game.bold.y);
      return courseCam;
    };
    let courseCamera = createCourseCamera();
    let currentCourse = game.bane;
    const narrator = createNarrator(data.fortaeller, Math.round((width - 1024) / 2));
    // talkingFlags[i] = 1 while the narrator voices figure i (switches that figure to its talking animation).
    const talkingFlags = [0, 0, 0, 0];
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.figur = (figureIndex, talking) => {
        if (figureIndex >= 0 && figureIndex < talkingFlags.length) {
          talkingFlags[figureIndex] = talking;
        }
      };
    }
    // Skip the current narration line.
    const skipNarration = () => {
      if (narrator) {
        narrator.spring();
        talkingFlags.fill(0);
      }
    };
    // Jump the narrator to another range of lines (used to pick the lines for the current player).
    const switchNarration = (fromLine, toLine) => {
      if (narrator) {
        narrator.skift(fromLine, toLine);
        talkingFlags.fill(0);
      }
    };
    const narratorBusy = () => !!narrator && narrator.optaget();
    // A narrator line to play as soon as the figures have settled (see fixedStep).
    let pendingLine = null;
    const queueLine = (line) => {
      pendingLine = line;
    };
    let currentPlayer = 0;
    // Character index of the player whose turn it is.
    const getCurrentPlayer = () => currentPlayer;
    const updateCurrentPlayer = () => {
      currentPlayer = game.spillere[game.tur] ?? 0;
    };
    // Which one-time narrator hints have been given already.
    const hintsGiven = { hul: true, sigt: false, slag: false };
    queueLine(1); // intro line
    let clock = 0;               // ms since start, advanced in FRAME_MS steps
    let waitUntil = 0;           // clock value before which the game must not advance (small pauses)
    let finishReported = false;
    // Called when the game enters a new phase: sets camera, figures and narrator lines.
    const onPhaseEnter = (phase, previousPhase) => {
      switch (phase) {
        case phases.START:
          startButton.vis(false);
          updateCurrentPlayer();
          switchNarration(getCurrentPlayer() + 19, getCurrentPlayer() + 22);
          if (hintsGiven.hul) {
            hintsGiven.hul = false;
            queueLine(4);
          } else if (randomInt(0, 3) === 0) {
            queueLine(2);
          }
          waitUntil = clock + 1500;
          cameraLook(1);
          figures.saet(1, getCurrentPlayer());
          break;
        case phases.SIGTER:
          if (previousPhase === phases.RULLER) {
            queueLine(10);
          }
          if (!hintsGiven.sigt) {
            hintsGiven.sigt = true;
            queueLine(6);
          }
          cameraLook(2);
          scoreboardVisible = false;
          break;
        case phases.PENDUL:
          if (randomInt(0, 4) === 0) {
            queueLine(7);
          }
          break;
        case phases.KRAFT:
          if (randomInt(0, 4) === 0) {
            queueLine(8);
          }
          break;
        case phases.RULLER:
          if (!hintsGiven.slag) {
            hintsGiven.slag = true;
            queueLine(9);
          }
          break;
        case phases.HULLET:
          queueLine(game.bold.iHul ? game.slag === 1 ? 12 : 11 : 10);
          hintsGiven.slag = false;
          waitUntil = clock + 1500;
          cameraLook(1);
          break;
        case phases.TAVLE:
          updateCurrentPlayer();
          switchNarration(getCurrentPlayer() + 25, getCurrentPlayer() + 28);
          queueLine(14);
          cameraLook(3);
          scoreboardVisible = true;
          figures.saet(2, getCurrentPlayer());
          break;
        case phases.SLUT:
          figures.saet(3, getCurrentPlayer());
          cameraLook(0);
          queueLine(17);
          break;
      }
    };
    // One fixed animation step (FRAME_MS): plays queued narration, runs the phase state machine and steps all animations.
    const fixedStep = () => {
      clock += FRAME_MS;
      if (pendingLine !== null && figures.alleStille()) {
        if (narrator) {
          narrator.spil(pendingLine);
          narrator.saet(0, getCurrentPlayer());
          narrator.saet(1, 0);
          narrator.slump();
        }
        pendingLine = null;
      }
      const settled = clock > waitUntil && !narratorBusy() && !camera.bevaeger && pendingLine === null;
      switch (game.tilstand) {
        case phases.INTRO:
          if (!narratorBusy() && pendingLine === null) {
            game.tilstand = phases.VAELG;
          }
          break;
        case phases.VAELG:
          startButton.vis(game.valgt.some(Boolean));
          break;
        case phases.START:
          if (game.bane !== currentCourse) {
            courseCamera = createCourseCamera();
            currentCourse = game.bane;
          }
          if (settled) {
            courseCamera.tvang(game.bold.x, game.bold.y);
            game.tilstand = phases.SIGTER;
          }
          break;
        case phases.SIGTER:
        case phases.PENDUL:
        case phases.KRAFT:
          courseCamera.maal(game.bold.x, game.bold.y);
          break;
        case phases.RULLER: {
          // Look ahead in the rolling direction so the camera leads the ball.
          const rollDistance = 16 * game.bold.fart / FIXED_POINT_SCALE;
          const rollAngle = game.bold.retning * Math.PI / 180;
          courseCamera.maal(game.bold.x + rollDistance * Math.cos(rollAngle), game.bold.y + rollDistance * Math.sin(rollAngle));
          break;
        }
        case phases.HULLET:
          if (settled) {
            game.tilstand = phases.TAVLE;
          }
          break;
        case phases.SLUT:
          if (!narratorBusy() && pendingLine === null) {
            game.tilstand = phases.FAERDIG;
            waitUntil = clock + 1e3;
          }
          break;
        case phases.FAERDIG:
          if (!finishReported && clock > waitUntil) {
            finishReported = true;
            onFinish({ vundet: true, beloenning: game.beloenning });
          }
          break;
      }
      camera.trin();
      courseCamera.trin();
      clouds.trin();
      figures.trin(talkingFlags);
    };
    // Action button: advance the game (aim -> swing -> power; or continue from the scoreboard).
    const activate = () => {
      if (game.tilstand === phases.TAVLE) {
        if (!camera.bevaeger && pendingLine === null) {
          pressAction(game);
        }
      } else if (game.tilstand >= phases.SIGTER && game.tilstand <= phases.KRAFT) {
        pressAction(game);
      }
    };
    // Click at canvas point (x, y): skips narration, or in the choose-players phase picks a figure / starts the game.
    const handleSelectClick = (x, y) => {
      if (game.tilstand === phases.INTRO || game.tilstand === phases.TAVLE || game.tilstand === phases.SLUT) {
        skipNarration();
        return;
      }
      if (game.tilstand !== phases.VAELG) {
        return;
      }
      const worldX = x + camera.x;
      const worldY = y + camera.y;
      const figureIndex = figures.ramt(worldX, worldY);
      if (startButton.ramt(worldX, worldY)) {
        if (confirmPlayers(game)) {
          queueLine(3);
        }
        return;
      }
      if (togglePlayer(game, figureIndex)) {
        figures.marker(figureIndex, game.valgt[figureIndex]);
      }
    };
    handle = { s: game, vaelg: handleSelectClick, aktiver: activate };
    const ctx = canvas.getContext("2d");
    let rafId;
    let lastTime = performance.now();
    let aimAccumulator = 0;   // ms, aim rotates one degree per 33 ms step while a direction is held
    let stepAccumulator = 0;  // ms towards the next FRAME_MS step
    let lastPhase = null;
    // HUD panels sliding in / out: slide = {fra: from y offset, til: to y offset, t: ms elapsed}.
    const hud = { praec: { fra: HUD_LAYOUT.skjult, til: HUD_LAYOUT.skjult, t: 1e9 }, kraft: { fra: HUD_LAYOUT.skjult, til: HUD_LAYOUT.skjult, t: 1e9 } };
    const slideValue = (slide) => slide.fra + (slide.til - slide.fra) * smoothstep(slide.t / HUD_LAYOUT.glid);
    const slideTo = (slide, target) => {
      if (slide.til !== target) {
        slide.fra = slideValue(slide);
        slide.til = target;
        slide.t = 0;
      }
    };
    const canvasW = width;
    const canvasH = config.skaerm.hoejde;
    // One animation frame: advance aiming / physics / animations, then draw everything.
    const frame = (now) => {
      const dt = paused ? 0 : Math.min(250, now - lastTime);
      if (lastTime = now, aimDirection) {
        for (aimAccumulator += dt; aimAccumulator >= 33;) {
          aimAccumulator -= 33;
          rotateAim(game, aimDirection);
        }
      } else {
        aimAccumulator = 0;
      }
      if (dt > 0) {
        advanceGame(game, dt);
      }
      for (const soundKey of game.lyde.splice(0)) {
        sounds.spil(GOLF_SOUNDS[soundKey]);
      }
      for (game.tilstand !== lastPhase && (onPhaseEnter(game.tilstand, lastPhase), lastPhase = game.tilstand), stepAccumulator += dt; stepAccumulator >= FRAME_MS;) {
        stepAccumulator -= FRAME_MS;
        fixedStep();
        if (game.tilstand !== lastPhase) {
          onPhaseEnter(game.tilstand, lastPhase);
          lastPhase = game.tilstand;
        }
      }
      if (dt > 0) {
        if (narrator) {
          narrator.tik(dt);
        }
        startButton.trin(dt);
      }
      ctx.fillStyle = `rgb(${config.himmel.join(",")})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
      clouds.tegn(ctx, manifest, images, camera);
      const groundTop = Math.max(0, canvasH - camera.y);
      if (groundTop < canvasH) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, groundTop, canvasW, canvasH - groundTop);
        ctx.clip();
        drawTileLayer(ctx, manifest, images, game.bane.bag, courseCamera.x, courseCamera.y);
        const [holeX, holeY] = game.bane.kollision.hul;
        drawSpriteAt(ctx, manifest, images, config.sprites.hul, holeX - courseCamera.x, holeY - courseCamera.y);
        if (!game.bold.iHul) {
          drawSpriteAt(ctx, manifest, images, config.sprites.bold, game.bold.x - courseCamera.x, game.bold.y - courseCamera.y);
        }
        drawTileLayer(ctx, manifest, images, game.bane.for, courseCamera.x, courseCamera.y);
        if (game.tilstand === phases.SIGTER || game.tilstand === phases.PENDUL || game.tilstand === phases.KRAFT) {
          drawSpriteAt(ctx, manifest, images, config.sprites.pil, game.bold.x - courseCamera.x, game.bold.y - courseCamera.y, { vinkel: game.sigte });
        }
        ctx.restore();
      }
      drawClubhouseTiles(ctx, manifest, images, clubhouse, camera);
      drawSpriteAt(ctx, manifest, images, startButton.billede, clubhouse.start.x - camera.x, clubhouse.start.y - camera.y);
      figures.tegn(ctx, images, camera);
      if (scoreboardVisible) {
        drawScoreboard(ctx, manifest, images, clubhouse, camera, game.point, font);
      }
      drawBushes(ctx, manifest, images, clubhouse, camera);
      slideTo(hud.praec, game.tilstand === phases.PENDUL ? 0 : HUD_LAYOUT.skjult);
      slideTo(hud.kraft, game.tilstand === phases.KRAFT ? 0 : HUD_LAYOUT.skjult);
      hud.praec.t += dt;
      hud.kraft.t += dt;
      const buttons = { ...config.knapper, hoejre: config.knapper.hoejre + (width - 1280), midt: config.knapper.midt + (width - 1280) / 2 };
      if (game.tilstand === phases.SIGTER) {
        drawSpriteAt(ctx, manifest, images, config.sprites.knapper[0], buttons.venstre, buttons.y);
        drawSpriteAt(ctx, manifest, images, config.sprites.knapper[1], buttons.hoejre, buttons.y);
        drawSpriteAt(ctx, manifest, images, config.sprites.knapper[2], buttons.midt, buttons.y);
      }
      const arcSlide = slideValue(hud.praec);
      if (arcSlide < HUD_LAYOUT.skjult) {
        const arcY = HUD_LAYOUT.y + arcSlide;
        if (drawSpriteAt(ctx, manifest, images, config.sprites.praecRamme[0], HUD_LAYOUT.bueX, arcY), drawSpriteAt(ctx, manifest, images, config.sprites.praecRamme[1], HUD_LAYOUT.bueX, arcY), game.tilstand === phases.PENDUL) {
          // The pendulum marker swings along the arc from 225 to 315 degrees with the meter value.
          const angleDeg = 225 + 90 * game.maaler;
          const angleRad = angleDeg * Math.PI / 180;
          drawSpriteAt(ctx, manifest, images, config.sprites.praecMaerke, HUD_LAYOUT.drejX + HUD_LAYOUT.radius * Math.cos(angleRad), HUD_LAYOUT.drejY + arcSlide + HUD_LAYOUT.radius * Math.sin(angleRad), { vinkel: angleDeg + 90 });
        }
      }
      const powerSlide = slideValue(hud.kraft);
      if (powerSlide < HUD_LAYOUT.skjult) {
        const barY = HUD_LAYOUT.y + powerSlide;
        const bar = HUD_LAYOUT.kraft;
        ctx.fillStyle = "#000";
        ctx.fillRect(bar.x, barY + bar.dy, bar.b, bar.h);
        ctx.fillStyle = "#f00";
        ctx.fillRect(bar.x, barY + bar.dy, Math.round(bar.b * (game.tilstand === phases.KRAFT ? game.maaler : game.kraft)), bar.h);
        drawSpriteAt(ctx, manifest, images, config.sprites.kraftRamme, bar.rammeX, barY + bar.rammeDy);
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
  // Convert a pointer event to canvas coordinates.
  const toCanvasCoords = (data, event) => {
    const rect = canvas.getBoundingClientRect();
    const config = data.spil;
    return [(event.clientX - rect.left) * width / rect.width, (event.clientY - rect.top) * config.skaerm.hoejde / rect.height];
  };
  // Pointer down: pick a figure / press the action button, or start rotating the aim with the on-screen arrow buttons.
  const onPointerDown = (data, event) => {
    if (!handle || paused) {
      return;
    }
    const [px, py] = toCanvasCoords(data, event);
    handle.vaelg(px, py);
    const buttons = { ...data.spil.knapper, hoejre: data.spil.knapper.hoejre + (width - 1280), midt: data.spil.knapper.midt + (width - 1280) / 2 };
    if (handle.s.tilstand === Phase.SIGTER) {
      if (Math.abs(py - buttons.y) >= 57) {
        return;
      }
      if (Math.abs(px - buttons.venstre) < 51) {
        aimDirection = -1;
        rotateAim(handle.s, -1);
        return;
      }
      if (Math.abs(px - buttons.hoejre) < 51) {
        aimDirection = 1;
        rotateAim(handle.s, 1);
        return;
      }
      if (Math.abs(px - buttons.midt) < 51) {
        handle.aktiver();
      }
      return;
    }
    handle.aktiver();
  };
  // Pointer released / left: stop rotating the aim.
  const onPointerUp = () => {
    aimDirection = 0;
  };
  const onKey = (event) => {
    if (!(!handle || paused)) {
      if (event.type === "keydown") {
        if (event.key === "ArrowLeft") {
          aimDirection = -1;
        } else if (event.key === "ArrowRight") {
          aimDirection = 1;
        } else if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          if (!event.repeat) {
            handle.aktiver();
          }
        }
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        aimDirection = 0;
      }
    }
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  loadGolfData().then((data) => {
    if (destroyed) {
      return;
    }
    loading.destroy();
    canvas = h("canvas", { width: width, height: data.spil.skaerm.hoejde, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: (event) => onPointerDown(data, event), onPointerUp: onPointerUp, onPointerLeave: onPointerUp, onPointerCancel: onPointerUp });
    setChildren(el, h("div", { className: "spilflade" }, canvas));
    stopGame = start(data);
  }, (error) => {
    if (destroyed) {
      return;
    }
    loading.destroy();
    setChildren(el, h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-golf.js --out spil/public/data/golf"), ".")));
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
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      if (stopGame) {
        stopGame();
        stopGame = null;
      }
      loading.destroy();
      removeEl(el);
    },
  };
}
export { createMinigolfGame as default };
