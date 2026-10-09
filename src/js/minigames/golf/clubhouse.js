/**
 * The minigolf clubhouse scene: the area above the course where the player
 * characters (figures) stand while choosing who plays and between holes,
 * the start button, parallax clouds / bushes, the clubhouse tile layer and
 * the scoreboard. Each create* function returns a small object with
 * Danish-named methods that the main component drives (trin = step one
 * animation frame, tegn = draw).
 */
import { Tween, FRAME_MS } from '../../engine/tween.js';
import { drawSprite, drawAnimation } from '../../render/canvas-helpers.js';
import { AnimationPlayer } from '../../engine/animation.js';
import { canvasWidth } from './camera.js';

/**
 * The player characters (one per selectable golfer). Each has idle / talking
 * animation "films", animated position (x, y), fade (alfa) and a selection
 * marker (mark).
 *   saet(mode, selected): move figures to their layout positions. Modes 0 and 3
 *     = intro / finale line-up, 1 = on the course (selected one stays at the
 *     intro spot), 2 = scoreboard (selected one goes to the board spot).
 *   marker(index, on): show / hide the selection marker.
 *   trin(talking): advance animations; talking[i] switches figure i to its talking film.
 *   alleStille(): true when all figures have arrived.
 *   ramt(x, y): index of the figure under (x, y) or -1.
 */
export function createFigures(clubhouse, manifest) {
  const figures = clubhouse.figurer;
  const animationsById = new Map(manifest.animations.map((anim) => [anim.id, anim]));
  const makeAnimation = (animId) => {
    const definition = animationsById.get(animId), player = definition ? new AnimationPlayer(definition) : null;
    if (player) {
      player.advance(0);
    }
    return player;
  };
  const characters = figures.film.map((reel, index) => ({ film: reel.map(makeAnimation), nr: 0, x: new Tween(figures.intro[index][0], figures.glid), y: new Tween(figures.intro[index][1], figures.glid), alfa: new Tween(0, figures.fade), mark: new Tween(0, figures.markFade), aktiv: true, ref: manifest.sprites[figures.billeder[index]] }));
  return { figurer: characters, saet(mode, selected = 0) {
      characters.forEach((character, index) => {
        character.mark.mod(0);
        const target = mode === 0 || mode === 3 ? figures.intro[index] : mode === 1 ? index === selected ? figures.intro[index] : figures.spil[index] : index === selected ? figures.tavle[index] : figures.spil[index];
        character.x.mod(target[0]);
        character.y.mod(target[1]);
        character.aktiv = mode === 0 || mode === 3 || mode === 2 && index === selected;
      });
    }, marker(index, on) {
      if (characters[index]) {
        characters[index].mark.mod(on ? 255 : 0);
      }
    }, trin(talking) {
      characters.forEach((character, index) => {
        var filmObj, resetFn;
        const clip = character.film[character.nr];
        if (clip) {
          clip.advance(FRAME_MS);
        }
        character.alfa.trin();
        character.x.trin();
        character.y.trin();
        character.mark.trin();
        if (character.alfa.v === 0 && character.aktiv) {
          character.alfa.mod(255);
        }
        const filmIndex = talking[index] ? 1 : 0;
        if (filmIndex !== character.nr && character.film[filmIndex]) {
          character.nr = filmIndex;
          if ((resetFn = (filmObj = character.film[filmIndex]).reset) != null) {
            resetFn.call(filmObj);
          }
          character.film[filmIndex].advance(0);
        }
      });
    }, alleStille() {
      return characters.every((character) => character.x.v === character.x.maal && character.y.v === character.y.maal);
    }, ramt(x, y) {
      return characters.findIndex((character) => {
        const ref = character.ref;
        if (!ref) {
          return false;
        }
        const left = character.x.v - ref.ox;
        const top = character.y.v - ref.oy;
        return x >= left && x < left + ref.w && y >= top && y < top + ref.h;
      });
    }, tegn(ctx, images, camera) {
      for (let index = characters.length - 1; index >= 0; index--) {
        const character = characters[index];
        const screenX = character.x.v - camera.x;
        const screenY = character.y.v - camera.y;
        const refHeight = character.ref ? character.ref.h : 0;
        if (character.mark.v > 0) {
          drawSprite(ctx, manifest, images, figures.markering, screenX, screenY - (index === 1 ? refHeight : Math.trunc(refHeight / 2)), character.mark.v / 255);
        }
        if (character.alfa.v > 0) {
          drawAnimation(ctx, manifest, images, character.film[character.nr], screenX, screenY, false, character.alfa.v / 255);
        }
      }
    } };
}
/**
 * The "start" button sign in the clubhouse (shown once at least one player
 * is selected). vis(show) switches animation, billede = current sprite id,
 * ramt(x, y) = hit test.
 */
export function createStartButton(clubhouse) {
  const config = clubhouse.start;
  let filmIndex = 0;
  let elapsedMs = 0;
  let visible = false;
  return { vis(show) {
      if (show !== visible) {
        visible = show;
        filmIndex = show ? 1 : 0;
        elapsedMs = 0;
      }
    }, trin(dtMs) {
      elapsedMs += dtMs;
    }, get billede() {
      const [firstFrame, frameCount, fps] = config.film[filmIndex];
      return firstFrame + Math.min(frameCount - 1, Math.floor(elapsedMs * fps / 1e3));
    }, ramt(x, y) {
      return Math.abs(x - config.x) < config.b / 2 && Math.abs(y - config.y) < config.h / 2;
    } };
}
/** Draw the visible part of the clubhouse's main tile layer (`top`) for the given camera. */
export function drawClubhouseTiles(ctx, manifest, images, clubhouse, camera) {
  const layer = clubhouse.top;
  // Visible tile range (layer.loeft = vertical lift of the layer, layer.flise = tile size).
  const firstRow = Math.max(0, Math.floor((camera.y + layer.loeft) / layer.flise));
  const lastRow = Math.min(layer.raekker, Math.ceil((camera.y + layer.loeft + 768) / layer.flise));
  const firstCol = Math.max(0, Math.floor(camera.x / layer.flise));
  const lastCol = Math.min(layer.kolonner, Math.ceil((camera.x + canvasWidth) / layer.flise));
  for (let row = firstRow; row < lastRow; row++) {
    for (let col = firstCol; col < lastCol; col++) {
      const tile = layer.felter[row][col];
      if (!(!tile || tile >= layer.antal)) {
        drawSprite(ctx, manifest, images, layer.base + tile, col * layer.flise - camera.x, row * layer.flise - camera.y - layer.loeft);
      }
    }
  }
}
/**
 * Sky background: a repeating sky stripe plus drifting clouds with parallax
 * (half the camera speed). Clouds move right at their own speed and are
 * re-spawned at the left edge once past config.ude. Sorted by speed so the
 * slow (far) clouds are drawn first.
 */
export function createClouds(clubhouse) {
  const config = clubhouse.skyer;
  const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  // Give a cloud a random sprite / height / speed; `initial` = scatter across the start range instead of entering from the edge.
  const placeCloud = (cloud, initial) => {
    const kind = randomInt(0, 5), spriteList = kind === 1 ? config.mellem : config.store;
    cloud.sprite = spriteList[randomInt(0, spriteList.length - 1)];
    cloud.x = initial ? randomInt(config.start[0], config.start[1]) : config.ind;
    const typeConfig = config.typer[Math.min(kind, 2)];
    cloud.y = randomInt(typeConfig.y[0], typeConfig.y[1]);
    cloud.fart = randomInt(typeConfig.fart[0], typeConfig.fart[1]);
  };
  const clouds = Array.from({ length: config.antal }, () => {
    const cloud = {};
    placeCloud(cloud, true);
    return cloud;
  });
  const sortBySpeed = () => clouds.sort((cloudA, cloudB) => cloudA.fart - cloudB.fart);
  sortBySpeed();
  return { skyer: clouds, trin() {
      for (const cloud of clouds) {
        cloud.x += cloud.fart;
        if (cloud.x >= config.ude) {
          placeCloud(cloud, false);
          sortBySpeed();
        }
      }
    }, tegn(ctx, manifest, images, camera) {
      for (let x = 0; x < canvasWidth; x += clubhouse.himmel.skridt) {
        drawSprite(ctx, manifest, images, clubhouse.himmel.stribe, x, 0);
      }
      const offsetX = Math.trunc(camera.x / 2);
      const offsetY = Math.trunc(camera.y / 2) + 768 - config.forskyd;
      for (const cloud of clouds) {
        drawSprite(ctx, manifest, images, cloud.sprite, Math.trunc(cloud.x / config.skala[0]) - offsetX, Math.trunc(cloud.y / config.skala[1]) - offsetY);
      }
    } };
}
/** Foreground bushes, scrolling 1.25x faster than the camera for a parallax effect. */
export function drawBushes(ctx, manifest, images, clubhouse, camera) {
  const offsetX = Math.trunc(camera.x * 5 / 4);
  for (const [x, y] of clubhouse.buske.pos) {
    drawSprite(ctx, manifest, images, clubhouse.buske.sprite, x - offsetX, y - camera.y);
  }
}
/**
 * Draw the scoreboard: one column per player (points[player][hole] = strokes,
 * 0 = not played yet) with an icon on top and a running total at the bottom.
 * `font` is the bitmap text renderer (may be null).
 */
export function drawScoreboard(ctx, manifest, images, clubhouse, camera, points, font) {
  const board = clubhouse.tavle;
  points.forEach((playerScores, playerIndex) => {
    const columnX = board.x[playerIndex] - camera.x;
    drawSprite(ctx, manifest, images, board.ikon, columnX + board.ikonDx, board.y - board.h - camera.y);
    let total = 0;
    playerScores.forEach((strokes, holeIndex) => {
      if (!(strokes <= 0)) {
        total += strokes;
        if (font) {
          font.tegn(ctx, String(strokes), columnX, board.y + holeIndex * board.h - camera.y, { font: board.skrift, midt: true, op: true });
        }
      }
    });
    if (total > 0) {
      drawSprite(ctx, manifest, images, board.sum, board.sumPos[playerIndex][0] - camera.x, board.sumPos[playerIndex][1] - camera.y);
      if (font) {
        font.tegn(ctx, String(total), columnX, board.y + playerScores.length * board.h + board.sumDy - camera.y, { font: board.skrift, midt: true, op: true });
      }
    }
  });
}
