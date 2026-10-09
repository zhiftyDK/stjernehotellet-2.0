// Byttespil ("swap puzzle"): a picture is cut into tiles and shuffled; the player taps two
// tiles to swap them until the picture is restored before the timer runs out.
// Default export createSwapGame is a plain-DOM factory that draws everything on a 1280x768 canvas.
// Saved/game-state property names (brikker, valgt, tilstand, ...) are Danish and must stay.
import { h } from '../dom.js';
import { loadNarratorData, createNarrator } from '../audio/audio.js';
import { createSoundBank, SWAP_GAME_SOUNDS } from '../loaders/data-loaders.js';
import { createLoadingScreen } from './ui-kit.js';
// Phases of one round: playing, solved in time, or timer ran out.
const GameState = { SPILLER: "spiller", VUNDET: "vundet", TID_UDE: "tid_ude" };
// Per difficulty: tile count, grid size, time limit (seconds) and coin reward for winning.
const DIFFICULTY_LEVELS = [
  { brikker: 12, kolonner: 4, raekker: 3, sekunder: 60, beloenning: 60 },
  { brikker: 16, kolonner: 4, raekker: 4, sekunder: 70, beloenning: 80 },
  { brikker: 24, kolonner: 4, raekker: 6, sekunder: 90, beloenning: 100 }
];
// Clamp a difficulty number to the three available levels (0..2).
function getDifficulty(level) {
  return DIFFICULTY_LEVELS[Math.max(0, Math.min(2, level))];
}
// Random permutation of 0..count-1 in which no tile starts in its correct place.
// order[slot] = index of the picture piece shown in that slot.
function shuffleWithoutFixedPoints(count) {
  const order = Array.from({ length: count }, (item, index) => index);
  const hasFixedPoint = () => order.some((item, index) => item === index);
  let attempts = 0;
  // Swap random pairs until nothing is in place (attempts is a safety cap).
  for (; hasFixedPoint() && attempts++ < 1e4;) {
    const a = Math.floor(Math.random() * count);
    let b = Math.floor(Math.random() * count);
    for (; b === a;) {
      b = Math.floor(Math.random() * count);
    }
    [order[a], order[b]] = [order[b], order[a]];
  }
  return order;
}
// Create a fresh round: random (or given) picture, shuffled tiles, full timer.
// `j` is the shuffled order, `valgt` the selected tile (-1 = none), `byt` the swap count.
function createGame(level = 0, imageIndex = null, imageCount = 9) {
  const config = getDifficulty(level);
  return { svaer: level, ...config, billede: imageIndex ?? Math.floor(Math.random() * imageCount), j: shuffleWithoutFixedPoints(config.brikker), valgt: -1, tilstand: GameState.SPILLER, msTilbage: config.sekunder * 1e3, byt: 0 };
}
// True when every tile sits at its own index.
const isSolved = (order) => order.every((value, index) => value === index);
// Handle a tap on a tile: first tap selects, tapping it again deselects,
// tapping another tile swaps the two. Returns a new game state (immutable update).
function selectOrSwapTile(game, tileIndex) {
  if (game.tilstand !== GameState.SPILLER || tileIndex < 0 || tileIndex >= game.brikker) {
    return game;
  }
  if (game.valgt === -1) {
    return { ...game, valgt: tileIndex };
  }
  if (game.valgt === tileIndex) {
    return { ...game, valgt: -1 };
  }
  const tiles = [...game.j];
  [tiles[game.valgt], tiles[tileIndex]] = [tiles[tileIndex], tiles[game.valgt]];
  const solved = isSolved(tiles);
  return { ...game, j: tiles, valgt: -1, byt: game.byt + 1, tilstand: solved ? GameState.VUNDET : game.tilstand };
}
// Advance the countdown by dtMs milliseconds; switches to TID_UDE at zero.
function tickTimer(game, dtMs) {
  if (game.tilstand !== GameState.SPILLER) {
    return game;
  }
  const remainingMs = game.msTilbage - dtMs;
  return remainingMs <= 0 ? { ...game, msTilbage: 0, tilstand: GameState.TID_UDE } : { ...game, msTilbage: remainingMs };
}
// Layout (canvas is 1280x768): the source picture is 512x192 px, drawn at 2x and centred.
const PUZZLE_SRC_WIDTH = 512;
const PUZZLE_SRC_HEIGHT = 192;
const DRAW_SCALE = 2;
const PUZZLE_LEFT = 640 - PUZZLE_SRC_WIDTH * DRAW_SCALE / 2;
const PUZZLE_TOP = 208;
// Where the timer badge and its number are drawn.
const TIMER_POSITION = { x: 256, y: 60, tekstY: 70 };
// Load the picture manifest and the narrator (voice line) data. Throws on failure.
async function loadSwapAssets() {
  const [manifest, narratorData] = await Promise.all([
    fetch("data/puslespil/index.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`index.json: ${response.status}`))),
    loadNarratorData("puslespil")
  ]);
  return { manifest, narratorData };
}
// Props: difficulty (0..2), paused, soundOn, font (bitmap text renderer), ui (frame/badge helpers),
// onFinish({ vundet, beloenning }) called ~2 s after the round ends.
// Returns { el, update(partialProps), destroy() }; `el` is the loading screen at first and is swapped
// (in place) for the game canvas once the assets are loaded.
function createSwapGame(props = {}) {
  let difficulty = props.svaer ?? 0;
  let paused = props.pause ?? false;
  let soundOn = props.lydTil ?? true;
  let font = props.skrift ?? null;
  let ui = props.ui ?? null;
  let onFinish = props.paaSlut ?? (() => {
  });
  let destroyed = false;
  let assets = null;
  let canvas = null;
  let stopRound = null;
  let sounds = null;
  let narrator = null;
  // Tap handler of the running round (receives canvas coordinates).
  let tryk = null;
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
  // Forward a canvas click to the active game's tap handler.
  const handlePointerDown = (event) => {
    // Convert the pointer position from CSS pixels to 1280x768 canvas coordinates.
    const rect = canvas.getBoundingClientRect();
    if (tryk) {
      tryk((event.clientX - rect.left) * 1280 / rect.width, (event.clientY - rect.top) * 768 / rect.height);
    }
  };
  // (Re)starts a round with the current difficulty/font/ui. Returns a cleanup function.
  const startRound = () => {
    var imageEntry;
    const manifest = assets.manifest;
    sounds = createSoundBank(Object.values(SWAP_GAME_SOUNDS));
    const roundSounds = sounds;
    roundSounds.saetTil(soundOn);
    let game = createGame(difficulty, null, manifest.billeder.length);
    const image = new Image();
    // Puzzle picture for this round (falls back to the first picture if the manifest entry is missing).
    image.src = `data/puslespil/${((imageEntry = manifest.billeder[game.billede]) == null ? void 0 : imageEntry.fil) ?? "billede0.webp"}`;
    const roundNarrator = createNarrator(assets.narratorData);
    narrator = roundNarrator;
    if (roundNarrator) {
      roundNarrator.saetLyd(soundOn);
      roundNarrator.kaede([1, 2]);
      roundNarrator.foersteValg = true;
      roundNarrator.foersteByt = true;
    }
    // Play a narrator voice line (if a narrator exists) followed by narrator.slump().
    const narratorSay = (lineId) => {
      if (roundNarrator) {
        roundNarrator.spil(lineId);
        roundNarrator.slump();
      }
    };
    // Looping background track.
    roundSounds.loekke(SWAP_GAME_SOUNDS.bag, 0.3);
    // Also triggers occasional narrator comments (first select, first swap, random quips).
    tryk = (clickX, clickY) => {
      if (paused || game.tilstand !== GameState.SPILLER) {
        return;
      }
      if (roundNarrator && roundNarrator.koe && roundNarrator.koe.length > 0) {
        roundNarrator.spring();
        return;
      }
      // Convert the canvas click position to a grid cell.
      const cellWidth = PUZZLE_SRC_WIDTH / game.kolonner * DRAW_SCALE;
      const cellHeight = PUZZLE_SRC_HEIGHT / game.raekker * DRAW_SCALE;
      const col = Math.floor((clickX - PUZZLE_LEFT) / cellWidth);
      const row = Math.floor((clickY - PUZZLE_TOP) / cellHeight);
      if (col < 0 || row < 0 || col >= game.kolonner || row >= game.raekker) {
        return;
      }
      const tileIndex = row * game.kolonner + col;
      if (roundNarrator) {
        if (game.valgt === -1) {
          if (roundNarrator.foersteValg) {
            narratorSay(3);
            roundNarrator.foersteValg = false;
          } else if (Math.random() < 0.05) {
            narratorSay(4);
          }
        } else if (game.valgt === tileIndex) {
          narratorSay(7);
        } else if (roundNarrator.foersteByt) {
          narratorSay(5);
          roundNarrator.foersteByt = false;
        } else if (Math.random() < 0.05) {
          narratorSay(6);
        }
      }
      roundSounds.spil(SWAP_GAME_SOUNDS.vaelg);
      game = selectOrSwapTile(game, tileIndex);
    };
    const ctx = canvas.getContext("2d");
    let frameId;
    let lastTime = performance.now();
    let lastState = game.tilstand;
    // endTime: timestamp when the round ended (0 = still running); finished: onFinish already fired.
    let endTime = 0;
    let finished = false;
    // One animation frame: advance timers, detect end of round, then draw.
    const frame = (now) => {
      const dt = paused ? 0 : Math.min(250, now - lastTime);
      if (lastTime = now, roundNarrator && dt > 0 && roundNarrator.tik(dt), dt > 0 && game.tilstand === GameState.SPILLER && !(roundNarrator && roundNarrator.koe && roundNarrator.koe.length > 0)) {
        game = tickTimer(game, dt);
        if (Math.random() < dt / 4e3) {
          roundSounds.spil(SWAP_GAME_SOUNDS.tilfaeldig, 0.5);
        }
      }
      if (game.tilstand !== lastState) {
        if (game.tilstand === GameState.VUNDET) {
          roundSounds.spil(SWAP_GAME_SOUNDS.vundet);
          narratorSay(8);
        }
        if (game.tilstand !== GameState.SPILLER) {
          roundSounds.stop(SWAP_GAME_SOUNDS.bag);
          endTime = now;
        }
        lastState = game.tilstand;
      }
      if (endTime && !finished && now - endTime > 2e3 && !(roundNarrator && roundNarrator.optaget())) {
        finished = true;
        onFinish({ vundet: game.tilstand === GameState.VUNDET, beloenning: game.tilstand === GameState.VUNDET ? game.beloenning : 0 });
      }
      ctx.fillStyle = "#f2d69c";
      ctx.fillRect(0, 0, 1280, 768);
      const boardWidth = PUZZLE_SRC_WIDTH * DRAW_SCALE;
      const boardHeight = PUZZLE_SRC_HEIGHT * DRAW_SCALE;
      if (ui) {
        ui.ramme(ctx, PUZZLE_LEFT - 48, PUZZLE_TOP - 48, boardWidth + 96, boardHeight + 96);
      }
      // After the round ends the solved picture is shown (tiles in their right places).
      const revealed = game.tilstand !== GameState.SPILLER;
      const srcTileW = PUZZLE_SRC_WIDTH / game.kolonner;
      const srcTileH = PUZZLE_SRC_HEIGHT / game.raekker;
      if (image.complete && image.naturalWidth) {
        ctx.imageSmoothingEnabled = false;
        for (let i = 0; i < game.brikker; i++) {
          const srcIndex = revealed ? i : game.j[i];
          const srcX = srcIndex % game.kolonner * srcTileW;
          const srcY = Math.floor(srcIndex / game.kolonner) * srcTileH;
          const dstX = PUZZLE_LEFT + i % game.kolonner * srcTileW * DRAW_SCALE;
          const dstY = PUZZLE_TOP + Math.floor(i / game.kolonner) * srcTileH * DRAW_SCALE;
          ctx.drawImage(image, srcX, srcY, srcTileW, srcTileH, dstX, dstY, srcTileW * DRAW_SCALE, srcTileH * DRAW_SCALE);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.strokeStyle = "rgba(0,0,0,.35)";
        ctx.lineWidth = 2;
        for (let i = 0; i < game.brikker && !revealed; i++) {
          ctx.strokeRect(PUZZLE_LEFT + i % game.kolonner * srcTileW * DRAW_SCALE, PUZZLE_TOP + Math.floor(i / game.kolonner) * srcTileH * DRAW_SCALE, srcTileW * DRAW_SCALE, srcTileH * DRAW_SCALE);
        }
        if (game.valgt >= 0 && !revealed) {
          ctx.strokeStyle = "#ffd24a";
          ctx.lineWidth = 6;
          ctx.strokeRect(PUZZLE_LEFT + game.valgt % game.kolonner * srcTileW * DRAW_SCALE + 3, PUZZLE_TOP + Math.floor(game.valgt / game.kolonner) * srcTileH * DRAW_SCALE + 3, srcTileW * DRAW_SCALE - 6, srcTileH * DRAW_SCALE - 6);
        }
      }
      if (ui) {
        ui.faelles(ctx, 1733, TIMER_POSITION.x, TIMER_POSITION.y);
      }
      if (font) {
        font.tegn(ctx, String(Math.max(0, Math.ceil(game.msTilbage / 1e3))), TIMER_POSITION.x, TIMER_POSITION.tekstY, { str: 73, midt: true, op: true });
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      tryk = null;
      roundSounds.stopAlle();
      if (roundNarrator) {
        roundNarrator.stop();
      }
    };
  };
  loadSwapAssets().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    canvas = h("canvas", { width: 1280, height: 768, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: handlePointerDown });
    swapRoot(h("div", { className: "spilflade" }, canvas));
    stopRound = startRound();
  }).catch((error) => {
    if (destroyed) {
      return;
    }
    swapRoot(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse billederne: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/extract-puzzlepics.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
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
      if ("skrift" in next) {
        font = next.skrift;
      }
      if ("ui" in next) {
        ui = next.ui;
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
export { createSwapGame as default };
