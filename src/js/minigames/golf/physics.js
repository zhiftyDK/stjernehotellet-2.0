/**
 * Minigolf rules and ball physics (no rendering).
 *
 * The game state object ("game") holds the course, the ball, whose turn it is
 * and the scores. It is advanced in fixed 33 ms steps (advanceGame ->
 * stepGame -> moveBall) and driven by player actions (pressAction,
 * rotateAim, togglePlayer, confirmPlayers). Many property names are Danish
 * and are data keys, so they are kept: bold = ball, bane = course, hul = hole,
 * slag = strokes, sigte = aim angle, maaler = swing meter, kraft = power.
 * Angles are in degrees (0 = +x axis, y points down), speeds in pixels per
 * step; some config values are 16.16 fixed-point (FIXED_ONE = 1.0).
 */
/**
 * Phases of the game: intro narration, choosing players (VAELG), start of a
 * turn (START), aiming (SIGTER), swing-accuracy meter (PENDUL), power meter
 * (KRAFT), ball rolling (RULLER), ball in the hole (HULLET), scoreboard
 * (TAVLE), final narration (SLUT) and done (FAERDIG).
 */
export const Phase = { INTRO: 0, VAELG: 1, START: 2, SIGTER: 3, PENDUL: 4, KRAFT: 5, RULLER: 6, HULLET: 7, TAVLE: 8, SLUT: 9, FAERDIG: 10 };
// 16.16 fixed-point representation of 1.0 used by the game data.
const FIXED_ONE = 65536;
const DEG_TO_RAD = Math.PI / 180;
/** Round to whole degrees and wrap into [0, 360). */
const normalizeAngle = (degrees) => (Math.round(degrees) % 360 + 360) % 360;
/** Direction (degrees) of the vector (dx, dy). */
const angleOf = (dx, dy) => normalizeAngle(Math.atan2(dy, dx) / DEG_TO_RAD);
/**
 * Turn the course's collision polygon into wall segments. Each wall has its
 * endpoints a/b, direction v, outward normal angle n and a copy of the edge
 * pushed out along the normal by the ball radius/wall thickness (sa/sb),
 * which is what the ball centre collides with.
 */
function buildWalls(data, course) {
  const points = course.kollision.punkter, wallThickness = data.bold.vaegTyk / FIXED_ONE;
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const edgeAngle = angleOf(next[0] - point[0], next[1] - point[1]);
    const normalAngle = (edgeAngle + 90) % 360;
    const offsetX = wallThickness * Math.cos(normalAngle * DEG_TO_RAD);
    const offsetY = wallThickness * Math.sin(normalAngle * DEG_TO_RAD);
    return { a: point, b: next, v: edgeAngle, n: normalAngle, sa: [point[0] + offsetX, point[1] + offsetY], sb: [next[0] + offsetX, next[1] + offsetY] };
  });
}
/** Set up the current hole: pick the course (difficulty shifts which courses are used), build its walls, put the ball on the tee aimed at the hole. */
function startHole(game) {
  const data = game.data;
  game.bane = data.baner[game.hul + data.svaerhed[game.svaer].forskyd];
  game.vaegge = buildWalls(data, game.bane);
  const [startX, startY] = game.bane.kollision.start;
  game.bold = { x: startX, y: startY, fart: 0, retning: 0, ruller: false, iHul: false };
  game.sigte = angleOf(game.bane.kollision.hul[0] - startX, game.bane.kollision.hul[1] - startY);
  game.slag = 0;
}
/** Create a fresh game state in the INTRO phase for the given difficulty index. */
export function createGame(data, difficulty = 0) {
  const game = { data: data, svaer: difficulty, spillere: [], valgt: [false, false, false], hul: 0, tur: 0, point: [], maaler: 0, maalerRet: 1, pendul: 0.5, kraft: 0, rest: 0, lyde: [], beloenning: 0, tilstand: Phase.INTRO };
  startHole(game);
  return game;
}
/** (Choose-players phase) select / deselect player `index`. Returns whether anything changed. */
export function togglePlayer(game, index) {
  if (game.tilstand !== Phase.VAELG || index < 0 || index >= game.valgt.length) {
    return false;
  }
  game.valgt[index] = !game.valgt[index];
  return true;
}
/** (Choose-players phase) lock in the selected players and start. Needs at least one player. */
export function confirmPlayers(game) {
  if (game.tilstand !== Phase.VAELG || !game.valgt.some(Boolean)) {
    return false;
  }
  game.spillere = game.valgt.flatMap((selected, index) => selected ? [index] : []);
  game.point = game.spillere.map(() => Array(game.data.huller).fill(0));
  game.tur = 0;
  game.tilstand = Phase.START;
  return true;
}
/**
 * Move the ball one step: travels `speed` pixels along its direction,
 * bouncing off walls (up to 8 reflections per step) and off wall corners
 * (circles of radius 8), then applies friction. If it is slow enough and
 * close enough to the hole it drops in.
 */
function moveBall(game) {
  const data = game.data, ball = game.bold;
  let x = ball.x;
  let y = ball.y;
  let direction = ball.retning;
  let speed = ball.fart / FIXED_ONE;
  const startDirection = ball.retning;
  for (let iteration = 0; speed > 0 && iteration < 8; iteration++) {
    const nextX = x + speed * Math.cos(direction * DEG_TO_RAD);
    const nextY = y + speed * Math.sin(direction * DEG_TO_RAD);
    // Nearest collision along the path: wall hit {p, dist, ny: wall normal} or corner hit {p, dist, hjoerne}.
    let hit = null;
    for (const wall of game.vaegge) {
      // Only walls facing the ball (angle to the normal >= 90 degrees) can be hit from the front.
      let angleDiff = Math.abs(normalizeAngle(direction) - wall.n) % 360;
      if (angleDiff > 180 && (angleDiff = 360 - angleDiff), angleDiff >= 90) {
        const crossing = segmentIntersection([x, y], [nextX, nextY], wall.sa, wall.sb);
        if (crossing) {
          const dist = Math.hypot(crossing[0] - x, crossing[1] - y);
          if (!hit || dist < hit.dist) {
            hit = { p: crossing, dist: dist, ny: wall.n };
          }
        }
      }
      const cornerHit = segmentCircleHit([x, y], [nextX, nextY], wall.b, 8);
      if (cornerHit && cornerHit.dist > 1 / FIXED_ONE && (!hit || cornerHit.dist < hit.dist)) {
        hit = { p: cornerHit.p, dist: cornerHit.dist, hjoerne: wall.b };
      }
    }
    if (!hit) {
      x = nextX;
      y = nextY;
      break;
    }
    // Step 1px back from the hit point, reflect the direction about the surface normal and use up the travelled distance.
    const reverse = normalizeAngle(direction + 180);
    const backX = hit.p[0] + Math.cos(reverse * DEG_TO_RAD);
    const backY = hit.p[1] + Math.sin(reverse * DEG_TO_RAD);
    const reflectNormal = hit.hjoerne ? angleOf(hit.hjoerne[0] - backX, hit.hjoerne[1] - backY) : hit.ny;
    direction = normalizeAngle((reflectNormal - reverse) * 2 + reverse);
    speed -= hit.dist - 1;
    x = backX;
    y = backY;
  }
  // Store the new position, play a sound on bounce, apply friction (per 33 ms step), stop when too slow, and check for the hole.
  if (ball.x = x, ball.y = y, ball.retning = direction, direction !== startDirection && game.lyde.push("vaeg"), ball.fart = Math.max(0, ball.fart - data.bold.friktion * 33), ball.fart < data.bold.minFart && (ball.fart = 0, ball.ruller = false), ball.fart <= data.bold.hulFart) {
    const [holeX, holeY] = game.bane.kollision.hul;
    if (Math.hypot(ball.x - holeX, ball.y - holeY) < data.bold.hulRadius) {
      game.lyde.push("hul");
      ball.x = holeX;
      ball.y = holeY;
      ball.fart = 0;
      ball.ruller = false;
      ball.iHul = true;
    }
  }
}
/** Intersection point of segments p1-p2 and q1-q2, or null if they do not cross (or are parallel). */
function segmentIntersection(p1, p2, q1, q2) {
  const d1 = [p2[0] - p1[0], p2[1] - p1[1]];
  const d2 = [q2[0] - q1[0], q2[1] - q1[1]];
  const cross = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(cross) < 1e-9) {
    return null;
  }
  const tParam = ((q1[0] - p1[0]) * d2[1] - (q1[1] - p1[1]) * d2[0]) / cross;
  const uParam = ((q1[0] - p1[0]) * d1[1] - (q1[1] - p1[1]) * d1[0]) / cross;
  return tParam < 0 || tParam > 1 || uParam < 0 || uParam > 1 ? null : [p1[0] + tParam * d1[0], p1[1] + tParam * d1[1]];
}
/** First point where segment p1-p2 enters the circle (center, radius): {p, dist} or null. Solves the quadratic for the line/circle intersection. */
function segmentCircleHit(p1, p2, center, radius) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const fx = p1[0] - center[0];
  const fy = p1[1] - center[1];
  const quadA = dx * dx + dy * dy;
  if (quadA < 1e-9) {
    return null;
  }
  const quadB = 2 * (fx * dx + fy * dy);
  const quadC = fx * fx + fy * fy - radius * radius;
  const discriminant = quadB * quadB - 4 * quadA * quadC;
  if (discriminant < 0) {
    return null;
  }
  const sqrtDisc = Math.sqrt(discriminant);
  const roots = [(-quadB - sqrtDisc) / (2 * quadA), (-quadB + sqrtDisc) / (2 * quadA)].filter((root) => root >= 0 && root <= 1);
  if (!roots.length) {
    return null;
  }
  const firstRoot = Math.min(...roots);
  return { p: [p1[0] + firstRoot * dx, p1[1] + firstRoot * dy], dist: firstRoot * Math.sqrt(quadA) };
}
/**
 * One fixed 33 ms step. Bounces the swing meter (0..1 back and forth) while
 * in the PENDUL / KRAFT phases, and while the ball rolls moves it; once it
 * stops the hole is finished (ball in hole or max strokes reached) or the
 * player aims again.
 */
function stepGame(game) {
  const data = game.data;
  if (game.tilstand === Phase.PENDUL || game.tilstand === Phase.KRAFT) {
    game.maaler += game.maalerRet / 29;
    if (game.maaler >= 1) {
      game.maaler = 1;
      game.maalerRet = -1;
    }
    if (game.maaler <= 0) {
      game.maaler = 0;
      game.maalerRet = 1;
    }
  }
  if (game.tilstand === Phase.RULLER) {
    moveBall(game);
    if (!game.bold.ruller) {
      if (game.bold.iHul || game.slag >= data.maxSlag) {
        game.point[game.tur][game.hul] = game.slag;
        if (game.bold.iHul && Math.random() < 0.75) {
          game.lyde.push("jubel");
        }
        game.tilstand = Phase.HULLET;
      } else {
        game.sigte = angleOf(game.bane.kollision.hul[0] - game.bold.x, game.bane.kollision.hul[1] - game.bold.y);
        game.tilstand = Phase.SIGTER;
      }
    }
  }
}
/** Advance the simulation by dtMs (capped at 250) in fixed 33 ms steps. */
export function advanceGame(game, dtMs) {
  for (game.rest += Math.min(dtMs, 250); game.rest >= 33;) {
    game.rest -= 33;
    stepGame(game);
  }
}
/** Rotate the aim direction by `delta` degrees (only while aiming). */
export function rotateAim(game, delta) {
  if (game.tilstand === Phase.SIGTER) {
    game.sigte = normalizeAngle(game.sigte + delta);
  }
}
/**
 * The player's single action button (also tap / Space / Enter). Depending on
 * the phase it: starts the swing meter ("pendul"), locks accuracy and starts
 * the power meter ("kraft"), hits the ball ("slag") or continues from the
 * scoreboard to the next turn / hole / the end ("videre"). Returns null if
 * the button does nothing in the current phase.
 */
export function pressAction(game) {
  const data = game.data;
  switch (game.tilstand) {
    case Phase.SIGTER:
      game.slag += 1;
      game.maaler = 0;
      game.maalerRet = 1;
      game.tilstand = Phase.PENDUL;
      return "pendul";
    case Phase.PENDUL:
      game.pendul = game.maaler;
      game.maaler = 0;
      game.maalerRet = 1;
      game.tilstand = Phase.KRAFT;
      return "kraft";
    case Phase.KRAFT: {
      game.kraft = game.maaler;
      // Ball speed scales with power; accuracy (meter value at the pendulum stop, 0.5 = straight) sets a sideways deviation in degrees.
      const speed = data.slag.min + (data.slag.max - data.slag.min) * game.kraft;
      const deviation = data.slag.spredning / FIXED_ONE * (game.pendul - 0.5);
      game.bold.fart = speed;
      game.bold.retning = normalizeAngle(game.sigte + deviation);
      game.bold.ruller = true;
      game.lyde.push(speed > data.slag.max / 2 ? "haardt" : speed > data.slag.max / 4 ? "mellem" : "blødt");
      game.tilstand = Phase.RULLER;
      return "slag";
    }
    case Phase.TAVLE:
      game.tur += 1;
      if (game.tur >= game.spillere.length) {
        game.tur = 0;
        game.hul += 1;
      }
      if (game.hul < data.huller) {
        startHole(game);
        game.tilstand = Phase.START;
      } else {
        game.tilstand = Phase.SLUT;
        game.beloenning = data.beloenning;
        game.lyde.push("vundet");
      }
      return "videre";
    default:
      return null;
  }
}
