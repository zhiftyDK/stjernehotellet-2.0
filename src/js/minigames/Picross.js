// Picross (nonogram) minigame: fill the cells of an N x N grid that match the row/column clues.
// Each correct cell is a "hit"; each wrong cell costs a life. Solve PUZZLES_PER_RUN puzzles to win,
// lose all lives to lose. Rendered on a 1280x768 canvas with sprites from data/nonogram/.
// Default export createPicrossGame is a plain-DOM factory. Property names such as opgave, loesning,
// klikket, liv, tilstand are Danish game-data keys and must not change.
import { h } from '../dom.js';
import { createSoundBank, PICROSS_SOUNDS } from '../loaders/data-loaders.js';
import { createNarrator, loadNarratorData } from '../audio/audio.js';
import { AnimationPlayer } from '../engine/animation.js';
import { createLoadingScreen } from './ui-kit.js';
import { drawSpriteFrame } from '../render/canvas-helpers.js';
const DEFAULT_LIVES = 5;
// Phase of a single puzzle: playing, solved, or out of lives.
const GameState = { SPILLER: "spiller", VUNDET: "vundet", TABT: "tabt" };
// Pick a puzzle from data.opgaver (puzzle list) and build its initial state.
// difficulty 0..2 selects the easy/medium/hard third of the list; forcedIndex overrides it.
function createPuzzleState(data, difficulty = 0, forcedIndex = null) {
  const puzzleCount = data.opgaver.length;
  let puzzleIndex;
  if (forcedIndex != null) {
    puzzleIndex = Math.max(0, Math.min(puzzleCount - 1, forcedIndex));
  } else {
    // Choose randomly inside the third of the puzzle list that matches the difficulty.
    const rangeStart = Math.floor(puzzleCount * difficulty / 3);
    const rangeEnd = difficulty === 2 ? puzzleCount - 1 : Math.floor(puzzleCount * (difficulty + 1) / 3);
    puzzleIndex = rangeStart + Math.floor(Math.random() * Math.max(1, rangeEnd - rangeStart));
  }
  const puzzle = data.opgaver[puzzleIndex];
  return { data: data, opgave: puzzle, n: data.gitter, loesning: new Set(puzzle.celler), klikket: new Set(), ramt: new Set(), fejl: new Set(), liv: data.liv ?? DEFAULT_LIVES, tilstand: GameState.SPILLER, beloenning: 0 };
}
// Player clicks a cell: returns the new puzzle state (hit => counts toward the solution,
// miss => costs a life; all hits => VUNDET, no lives left => TABT). Immutable update.
function revealCell(state, cellIndex) {
  if (state.tilstand !== GameState.SPILLER || cellIndex < 0 || cellIndex >= state.n * state.n || state.klikket.has(cellIndex)) {
    return state;
  }
  const isHit = state.loesning.has(cellIndex);
  const clicked = new Set(state.klikket).add(cellIndex);
  const hits = new Set(state.ramt);
  const mistakes = new Set(state.fejl);
  let { liv: lives, tilstand: phase, beloenning: reward } = state;
  if (isHit) {
    hits.add(cellIndex);
    if (hits.size >= state.loesning.size) {
      phase = GameState.VUNDET;
      reward = (state.data.beloenning || [60, 100, 140])[state.opgave.svaer] ?? 0;
    }
  } else {
    mistakes.add(cellIndex);
    lives -= 1;
    if (lives <= 0) {
      lives = 0;
      phase = GameState.TABT;
    }
  }
  return { ...state, klikket: clicked, ramt: hits, fejl: mistakes, liv: lives, tilstand: phase, beloenning: reward };
}
// Layout, in canvas pixels (canvas is 1280x768).
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 768;
// Top-left corner of the grid and the size of one cell / the gap between cells.
const GRID_LEFT = 554;
const GRID_TOP = 256;
const CELL_SIZE = 58;
const CELL_GAP = 4;
const CELL_PITCH = CELL_SIZE + CELL_GAP;
// Sprite ids (from the nonogram manifest) drawn as the centred background.
const BACKGROUND_SPRITES = [1638, 1639];
// Animation ids played on a cell when the guess is right / wrong.
const CELL_ANIMATIONS = { rigtig: 13233, forkert: 13234 };
// Remaining-lives icons: sprite id, position of the first, and spacing between icons.
const LIFE_ICON = { sprite: 476, x: 58, y: 32, afstand: 28 };
// How many puzzles must be solved in a row to win the whole minigame.
const PUZZLES_PER_RUN = 3;
// Loads puzzle data, the nonogram manifest, narrator data and all textures.
// Resolves to { opg, manifest, images, fortaeller }; throws on error.
async function loadPicrossAssets() {
  const [puzzleData, manifest, narratorData] = await Promise.all([
    fetch("data/picross.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`picross.json: ${response.status}`))),
    fetch("data/nonogram/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))),
    loadNarratorData("nonogram")
  ]);
  // Texture images by name; a texture that fails to load is simply left out.
  const images = {};
  await Promise.all(Object.entries(manifest.textures).map(([textureName, textureInfo]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[textureName] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `data/nonogram/tex/${textureInfo.file}`;
  })));
  return { opg: puzzleData, manifest: manifest, images: images, fortaeller: narratorData };
}
// Draw one manifest sprite (by id) with its origin translated to (x, y).
function drawSprite(ctx, manifest, images, spriteId, x, y) {
  const sprite = manifest.sprites[spriteId];
  const image = sprite && images[sprite.assetId];
  if (image) {
    ctx.save();
    ctx.translate(x, y);
    drawSpriteFrame(ctx, image, sprite);
    ctx.restore();
  }
}
// Draw the current frame(s) of an AnimationPlayer ("invers" draw list) at (x, y).
function drawAnimation(ctx, manifest, images, player, x, y) {
  if (player) {
    for (const item of player.drawList("invers")) {
      const sprite = manifest.sprites[item.sprite];
      const image = sprite && images[sprite.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x + item.x, y + item.y);
        ctx.rotate((item.rot || 0) * Math.PI * 2);
        ctx.scale(item.scaleX * (item.flip ? -1 : 1), item.scaleY);
        drawSpriteFrame(ctx, image, sprite, item.alpha);
        ctx.restore();
      }
    }
  }
}
// Canvas position of the centre of the cell with the given index in a gridSize x gridSize grid.
const cellCenter = (cellIndex, gridSize) => ({ x: GRID_LEFT + CELL_PITCH * (cellIndex % gridSize) + CELL_SIZE / 2, y: GRID_TOP + CELL_PITCH * Math.floor(cellIndex / gridSize) + CELL_SIZE / 2 });
// Props: difficulty (0..2), paused, soundOn, font (bitmap text renderer for clues),
// onFinish({ vundet, beloenning }) called ~2.5 s after the run ends.
// `run` is the mutable state of the whole run: phase ("intro" | "spiller" |
// "loest" | "vundet" | "tabt"), puzzle number, lives and per-cell animations.
// Returns { el, update(partialProps), destroy() }; `el` is the loading screen at first and is swapped
// (in place) for the game canvas once the assets are loaded.
function createPicrossGame(props = {}) {
  let difficulty = props.svaer ?? 0;
  let paused = props.pause ?? false;
  let soundOn = props.lydTil ?? true;
  let font = props.skrift ?? null;
  let onFinish = props.paaSlut ?? (() => {
  });
  let destroyed = false;
  let assets = null;
  let canvas = null;
  let stopRun = null;
  let sounds = null;
  let run = null;
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
  const handlePointerDown = (event) => {
    // Convert pointer position from CSS pixels to canvas coordinates.
    const rect = canvas.getBoundingClientRect();
    if (run && run.klik) {
      run.klik((event.clientX - rect.left) * CANVAS_WIDTH / rect.width, (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height);
    }
  };
  // (Re)starts the run with the current difficulty/font. Returns a cleanup function.
  const startRun = () => {
    const manifest = assets.manifest;
    const images = assets.images;
    const runSounds = createSoundBank(Object.values(PICROSS_SOUNDS));
    sounds = runSounds;
    runSounds.saetTil(soundOn);
    const animationsById = new Map(manifest.animations.map((animation) => [animation.id, animation]));
    // Mutable run state: phase, index of the current puzzle, lives, current puzzle state, cell animations.
    const currentRun = { fase: "intro", opgaveNr: 0, liv: assets.opg.liv ?? 5, spil: null, celler: new Map(), beloenning: 0 };
    run = currentRun;
    // Begin the next puzzle; lives carry over between puzzles.
    const startPuzzle = () => {
      currentRun.spil = { ...createPuzzleState(assets.opg, difficulty), liv: currentRun.liv };
      currentRun.celler = new Map();
      currentRun.fase = "spiller";
    };
    const narrator = createNarrator(assets.fortaeller);
    currentRun.fortaeller = narrator;
    // Play a narrator voice line; `mood` (optional) is stored as narrator variable 0 first.
    const narratorSay = (lineId, mood) => {
      if (narrator) {
        narrator.spil(lineId);
        if (mood !== void 0) {
          narrator.saet(0, mood);
        }
        narrator.slump();
      }
    };
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.kaede([1, 2, 3]);
    } else {
      startPuzzle();
    }
    // Click handler (canvas coordinates). Ignored while paused; during intro/solved phases it skips narrator speech.
    currentRun.klik = (clickX, clickY) => {
      if (paused) {
        return;
      }
      if (currentRun.fase !== "spiller") {
        if (narrator) {
          narrator.spring();
        }
        return;
      }
      const puzzle = currentRun.spil;
      // Which grid cell was clicked (clicks in the gap between cells are rejected below).
      const col = Math.floor((clickX - GRID_LEFT) / CELL_PITCH);
      const row = Math.floor((clickY - GRID_TOP) / CELL_PITCH);
      if (col < 0 || row < 0 || col >= puzzle.n || row >= puzzle.n || (clickX - GRID_LEFT) % CELL_PITCH > CELL_SIZE || (clickY - GRID_TOP) % CELL_PITCH > CELL_SIZE) {
        return;
      }
      const cell = row * puzzle.n + col;
      if (puzzle.klikket.has(cell)) {
        return;
      }
      runSounds.spil(PICROSS_SOUNDS.klik);
      const nextPuzzle = revealCell(puzzle, cell);
      const isHit = nextPuzzle.loesning.has(cell);
      const animationDef = animationsById.get(isHit ? CELL_ANIMATIONS.rigtig : CELL_ANIMATIONS.forkert);
      if (animationDef) {
        const player = new AnimationPlayer(animationDef);
        player.advance(0);
        currentRun.celler.set(cell, player);
      }
      if (currentRun.spil = nextPuzzle, currentRun.liv = nextPuzzle.liv, isHit) {
        if (nextPuzzle.tilstand === GameState.VUNDET) {
          currentRun.fase = "loest";
          currentRun.venter = 1e3;
          runSounds.spil(PICROSS_SOUNDS.vundet);
          narratorSay(8);
        } else if (Math.random() < 0.5) {
          narratorSay(5);
        }
      } else if (nextPuzzle.tilstand === GameState.TABT) {
        currentRun.fase = "tabt";
        runSounds.spil(PICROSS_SOUNDS.tabt);
        narratorSay(7);
      } else {
        const gridSize = puzzle.n;
        const solution = nextPuzzle.loesning;
        // A wrong click squeezed between solution cells (horizontally or vertically) gets a special narrator mood.
        let flankedByHits = cell % gridSize > 0 && cell % gridSize < gridSize - 1 && solution.has(cell - 1) && solution.has(cell + 1);
        if (cell >= gridSize && cell < gridSize * gridSize - gridSize) {
          flankedByHits = flankedByHits || solution.has(cell - gridSize) && solution.has(cell + gridSize);
        }
        narratorSay(6, flankedByHits && Math.random() < 0.25 ? 1 : 0);
      }
    };
    const ctx = canvas.getContext("2d");
    let frameId;
    let lastTime = performance.now();
    // endTime: timestamp when the run ended (0 = running); finished: onFinish already fired.
    let endTime = 0;
    let finished = false;
    // One animation frame: advance narrator/animations/phases, then draw.
    const frame = (now) => {
      const dt = paused ? 0 : Math.min(250, now - lastTime);
      lastTime = now;
      if (narrator && dt > 0) {
        narrator.tik(dt);
      }
      // Phase changes: intro -> first puzzle; solved puzzle (after a 1 s pause) -> next puzzle or victory.
      const introActive = narrator ? narrator.introAktiv() : false;
      currentRun.venter = (currentRun.venter || 0) - dt;
      if (currentRun.fase === "intro" && !introActive) {
        narratorSay(4);
        startPuzzle();
      } else if (currentRun.fase === "loest" && !introActive && currentRun.venter <= 0) {
        currentRun.opgaveNr += 1;
        if (currentRun.opgaveNr >= PUZZLES_PER_RUN) {
          currentRun.fase = "vundet";
          currentRun.beloenning = (assets.opg.beloenning || [60, 100, 140])[difficulty];
          narratorSay(9);
        } else {
          startPuzzle();
        }
      }
      for (const player of currentRun.celler.values()) {
        player.advance(dt);
      }
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      for (const spriteId of BACKGROUND_SPRITES) {
        drawSprite(ctx, manifest, images, spriteId, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }
      const puzzle = currentRun.spil;
      if (puzzle) {
        for (const [cell, player] of currentRun.celler) {
          const center = cellCenter(cell, puzzle.n);
          drawAnimation(ctx, manifest, images, player, center.x, center.y);
        }
        // After losing, dim the solution cells the player never clicked.
        if (currentRun.fase === "tabt") {
          ctx.fillStyle = "rgba(60,40,20,.35)";
          for (const cell of puzzle.loesning) {
            if (!puzzle.klikket.has(cell)) {
              const center = cellCenter(cell, puzzle.n);
              ctx.fillRect(center.x - CELL_SIZE / 2 + 6, center.y - CELL_SIZE / 2 + 6, CELL_SIZE - 12, CELL_SIZE - 12);
            }
          }
        }
        // Clues: row clues right-aligned left of the grid, column clues stacked above it.
        if (font) {
          for (let rowIndex = 0; rowIndex < puzzle.n; rowIndex++) {
            const rowClues = puzzle.opgave.raekker[rowIndex];
            let x = GRID_LEFT - 14;
            for (let clueIndex = rowClues.length - 1; clueIndex >= 0; clueIndex--) {
              font.tegn(ctx, String(rowClues[clueIndex]), x, GRID_TOP + CELL_PITCH * rowIndex + CELL_SIZE / 2 + 2, { font: 3, str: 44, hoejre: true });
              x -= font.bredde(String(rowClues[clueIndex]), 44, 3) + 14;
            }
          }
          for (let colIndex = 0; colIndex < puzzle.n; colIndex++) {
            const colClues = puzzle.opgave.kolonner[colIndex];
            colClues.forEach((clue, clueIndex) => font.tegn(ctx, String(clue), GRID_LEFT + CELL_PITCH * colIndex + CELL_SIZE / 2, GRID_TOP - 26 - (colClues.length - 1 - clueIndex) * 42, { font: 3, str: 44, midt: true }));
          }
        }
      }
      // Remaining lives.
      for (let lifeIndex = 0; lifeIndex < currentRun.liv; lifeIndex++) {
        drawSprite(ctx, manifest, images, LIFE_ICON.sprite, LIFE_ICON.x + lifeIndex * LIFE_ICON.afstand, LIFE_ICON.y);
      }
      if (narrator) {
        narrator.tegn(ctx);
      }
      // Report the result 2.5 s after the run ends (once the narrator has finished talking).
      if ((currentRun.fase === "vundet" || currentRun.fase === "tabt") && !endTime) {
        endTime = now;
      }
      if (endTime && !finished && now - endTime > 2500 && !(narrator && narrator.introAktiv())) {
        finished = true;
        onFinish({ vundet: currentRun.fase === "vundet", beloenning: currentRun.fase === "vundet" ? currentRun.beloenning : 0 });
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      if (run === currentRun) {
        run = null;
      }
      runSounds.stopAlle();
      if (narrator) {
        narrator.stop();
      }
    };
  };
  loadPicrossAssets().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    canvas = h("canvas", { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: handlePointerDown });
    swapRoot(h("div", { className: "spilflade" }, canvas));
    stopRun = startRun();
  }).catch((error) => {
    if (destroyed) {
      return;
    }
    swapRoot(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", error.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/extract-picross.js"), " og kopiér dataene fra web/public/data til spil/public/data.")));
  });
  return {
    get el() {
      return rootEl;
    },
    // Applies changed props: pause/sound take effect immediately, a new difficulty restarts the run.
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
      if ("lydTil" in next) {
        soundOn = next.lydTil;
        if (sounds) {
          sounds.saetTil(soundOn);
        }
        if (run && run.fortaeller) {
          run.fortaeller.saetLyd(soundOn);
        }
      }
      if ("svaer" in next && next.svaer !== difficulty) {
        difficulty = next.svaer;
        if (stopRun) {
          stopRun();
          stopRun = startRun();
        }
      }
    },
    destroy() {
      destroyed = true;
      if (stopRun) {
        stopRun();
        stopRun = null;
      }
      if (loadingScreen) {
        loadingScreen.destroy();
        loadingScreen = null;
      }
      rootEl.remove();
    }
  };
}
export { createPicrossGame as default };
