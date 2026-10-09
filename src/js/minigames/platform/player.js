// Platform minigame: player methods of the Level class.
//
// Contains the player's animation state, movement states (ground / air / skid), costume switching,
// path and tile collision, dust particles and the camera. These object-literal methods are mixed into
// Level.prototype by level.js, so `this` is the Level instance.
import { STEP_MS, GRAVITY, MAX_FALL_SPEED, TILE, FIXED_EPSILON, VIEW_HEIGHT_UNITS, smoothstepScaled, clamp, STATE_IDLE, STATE_WALK, STATE_SKID, STATE_AIR, STATE_DEAD } from './constants.js';
import { activeCostume, setActiveCostume, COSTUMES, PLAYER_ANIM_IDS, UNINTERRUPTIBLE_ANIM_STATES } from './costumes.js';
import { DUST_SPRITES, createAnimation } from './sprites.js';
import { viewWidthUnits } from './view.js';

export const playerMethods = {
  // Requests a player animation state. If the current animation is locked (must finish first) the
  // request is queued in fig.venter unless `force` is set.
  vis(animState, force = false) {
    const figure = this.fig;
    if (!figure.laast || force) {
      figure.venter = -1;
      this.visStart(animState);
    } else {
      figure.venter = animState;
    }
  },
  // Starts the animation for the given state immediately, using the current costume's animation set.
  visStart(animState) {
    const figure = this.fig;
    figure.tilst = animState;
    figure.anim = createAnimation(this.anims, PLAYER_ANIM_IDS[this.kostume || 0][animState]);
    figure.hoejre = this.kostume === 3 && (animState === 1 || animState === 2) ? createAnimation(this.anims, 12825) : null;
    figure.laast = UNINTERRUPTIBLE_ANIM_STATES.has(animState);
  },
  // Advances the player animation one step (walking animation speed follows the horizontal speed).
  visStep() {
    const figure = this.fig;
    if (!figure.anim) {
      return;
    }
    const dt = figure.tilst === 1 ? STEP_MS * Math.abs(this.p.vx) / activeCostume.vmax : STEP_MS;
    figure.anim.advance(dt);
    if (figure.hoejre) {
      figure.hoejre.advance(dt);
    }
    if (figure.laast && figure.anim.finished) {
      figure.laast = false;
      if (figure.venter >= 0) {
        this.visStart(figure.venter);
        figure.venter = -1;
      }
    }
  },
  // Changes the player movement state (idle / walk / skid / air / dead) and runs the entry actions
  // for the new state: resets speeds, picks animations, detaches from the current path, and (for costume 3)
  // kicks up dust when landing.
  saet(newState) {
    var pathUnder;
    if (this.tilst === STATE_DEAD) {
      return;
    }
    if (this.tilst === STATE_AIR) {
      if (this.holdTid = activeCostume.hold, this.kostume === 3 && this.sti && newState !== STATE_AIR && newState !== STATE_DEAD) {
        const { x: px, y: py } = this.p;
        for (const [offsetX, puffVx, puffVy] of [[-2, -4, -5], [-1, -2, -4], [0, 0, -5], [1, 2, -4]]) {
          this.stoev(px + offsetX, py, puffVx, puffVy);
        }
      }
      this.vis(5);
    }
    this.tilst = newState;
    const player = this.p;
    switch (newState) {
      case STATE_IDLE:
        player.vx = 0;
        player.vy = 0;
        this.vis(0);
        break;
      case STATE_WALK:
        player.vy = 0;
        this.paaIs = !!((pathUnder = this.sti) != null && pathUnder.is);
        this.glider = false;
        this.vis(this.paaIs ? 0 : 1);
        break;
      case STATE_SKID:
        this.vis(6);
        player.vx = player.face === 0 ? -activeCostume.glid : activeCostume.glid;
        break;
      case STATE_AIR: {
        const oldPath = this.sti;
        if (player.vy >= 0) {
          this.vis(4);
          this.stiger = false;
          this.kanHolde = false;
        } else {
          if (oldPath) {
            player.vx += oldPath.dx / 2;
            player.vy += oldPath.dy < 0 ? oldPath.dy / 2 : 0;
          }
          this.vis(3);
          this.stiger = true;
          this.kanHolde = true;
        }
        if (oldPath) {
          oldPath.staar = false;
        }
        this.sti = null;
        break;
      }
      case STATE_DEAD:
        this.vis(4, true);
        if (this.sti) {
          this.sti.staar = false;
        }
        this.sti = null;
        break;
    }
  },
  // Spawns a dust particle (at most 30 alive at a time).
  stoev(x, y, vx, vy) {
    if (!(this.partikler.length >= 30)) {
      this.partikler.push({ x: x, y: y, vx: vx, vy: vy, tid: 0 });
    }
  },
  // Moves the dust particles with gravity and removes the ones whose animation is over.
  partikelStep() {
    for (const particle of this.partikler) {
      particle.tid += STEP_MS;
      particle.vy = Math.min(MAX_FALL_SPEED, particle.vy + GRAVITY);
      particle.x += particle.vx;
      particle.y += particle.vy;
    }
    this.partikler = this.partikler.filter((particle) => Math.floor(particle.tid / 66) < DUST_SPRITES.length);
  },
  // Starts a jump: applies the costume's jump impulse, plays the jump sound and enters the air state.
  hop() {
    this.p.vy = activeCostume.hop;
    this.lyde.push(this.kostume ? `hop${this.kostume}` : "hop");
    this.saet(STATE_AIR);
  },
  // Tries to switch to costume `costumeIndex`. Fails (with a 'nej' sound) if the costume is locked or
  // there is not enough headroom for the new hitbox, unless `force` is set. Returns true on success.
  skiftKostume(costumeIndex, force = false) {
    if (costumeIndex === this.kostume || this.tilst === STATE_DEAD || this.tilstand !== "spiller") {
      return false;
    }
    if (!force && this.aabne && !this.aabne[costumeIndex]) {
      this.lyde.push("nej");
      return false;
    }
    const costume = COSTUMES[costumeIndex], player = this.p;
    if (!force && (this.massiv(player.x, player.y - costume.h) || this.massiv(player.x - costume.hb, player.y - costume.h) || this.massiv(player.x + costume.hb, player.y - costume.h))) {
      this.lyde.push("nej");
      return false;
    }
    this.kostume = costumeIndex;
    setActiveCostume(costume);
    player.vx = Math.max(-activeCostume.vmax, Math.min(activeCostume.vmax, player.vx));
    this.lyde.push("forvandl");
    const currentAnimState = this.fig.tilst;
    this.fig.laast = false;
    this.visStart(currentAnimState < 0 ? 0 : currentAnimState);
    return true;
  },
  // Puts the player on a path segment found by land() and snaps the position to it.
  saetPaaSti(landing) {
    this.sti = landing.sti;
    this.seg = landing.seg;
    this.dist = landing.dist;
    landing.sti.staar = true;
    const [px, py] = landing.sti.pos(landing.seg, landing.dist, activeCostume.hb);
    this.p.x = px;
    this.p.y = py;
  },
  // Finds the first active path that the point (x, y) crosses from above when moving by (dx, dy)
  // (taking the path's own movement into account). Returns {sti, seg, dist} or null.
  land(x, y, dx, dy, halfWidth = activeCostume.hb) {
    for (const path of this.stier) {
      if (!path.aktiv) {
        continue;
      }
      const targetX = x + dx - path.dx, targetY = y + dy - path.dy;
      for (let segIndex = 0; segIndex < path.n; segIndex++) {
        const [ax, ay, bx, by] = path.ender(segIndex, halfWidth), segDx = bx - ax, segDy = by - ay;
        if (segDx <= 0) {
          continue;
        }
        const sideStart = (x - ax) * segDy - (y - ay) * segDx, sideEnd = (targetX - ax) * segDy - (targetY - ay) * segDx;
        if (!(sideStart >= 0 && sideEnd < 0)) {
          continue;
        }
        const crossT = sideStart / (sideStart - sideEnd), hitX = x + (targetX - x) * crossT, hitY = y + (targetY - y) * crossT, along = ((hitX - ax) * segDx + (hitY - ay) * segDy) / (segDx * segDx + segDy * segDy);
        if (!(along < 0 || along > 1)) {
          return { sti: path, seg: segIndex, dist: along * Math.hypot(segDx, segDy) };
        }
      }
    }
    return null;
  },
  // Returns the bounds {l, r, t, b} of the solid tile at world position (x, y), or null if there is none
  // (or the position is outside the level).
  massiv(x, y) {
    const col = Math.floor(x / TILE), row = Math.floor(y / TILE);
    return col < 0 || row < 0 || col >= this.W || row >= this.H ? null : this.bane.fast[row][col] === "1" ? { l: col * TILE, r: (col + 1) * TILE, t: row * TILE, b: (row + 1) * TILE } : null;
  },
  // Player control while standing on a path: handles starting to walk, skidding, ice sliding,
  // acceleration/friction and jumping.
  jord(input) {
    const player = this.p, left = input.venstre && !input.hoejre, right = input.hoejre && !input.venstre;
    if (this.tilst === STATE_IDLE) {
      if (input.hopTrykket) {
        this.hop();
        return;
      }
      if (left) {
        player.face = 0;
        this.saet(STATE_WALK);
      } else if (right) {
        player.face = 1;
        this.saet(STATE_WALK);
      }
      return;
    }
    if (this.tilst === STATE_SKID) {
      if (player.vx > 0) {
        player.vx -= activeCostume.bremse;
        if (player.vx <= 0) {
          player.vx = 0;
          this.saet(STATE_IDLE);
        }
      } else {
        player.vx += activeCostume.bremse;
        if (player.vx >= 0) {
          player.vx = 0;
          this.saet(STATE_IDLE);
        }
      }
      if (input.hopTrykket) {
        this.hop();
      }
      return;
    }
    if (this.paaIs) {
      if (left || right) {
        if (!this.glider) {
          this.vis(2);
        }
        this.glider = true;
        if (player.face === 0) {
          if (left) {
            if (player.vx > -activeCostume.vmax) {
              player.vx -= activeCostume.isAcc;
            }
          } else {
            player.face = 1;
          }
        } else if (right) {
          if (player.vx < activeCostume.vmax) {
            player.vx += activeCostume.isAcc;
          }
        } else {
          player.face = 0;
        }
      } else {
        player.vx *= activeCostume.isFrik;
        if (this.glider) {
          this.vis(0);
        }
        this.glider = false;
      }
    } else if (left || right) {
      if (player.face === 0) {
        if (left) {
          if (player.vx > -activeCostume.vmax) {
            player.vx -= activeCostume.acc;
          }
        } else if (player.vx < -activeCostume.glid) {
          this.saet(STATE_SKID);
        } else {
          player.face = 1;
          player.vx = 0;
        }
      } else if (right) {
        if (player.vx < activeCostume.vmax) {
          player.vx += activeCostume.acc;
        }
      } else if (player.vx > activeCostume.glid) {
        this.saet(STATE_SKID);
      } else {
        player.face = 0;
        player.vx = 0;
      }
    } else if (player.vx > 0) {
      player.vx -= activeCostume.acc;
      if (player.vx <= 0) {
        player.vx = 0;
        this.saet(STATE_IDLE);
      }
    } else {
      player.vx += activeCostume.acc;
      if (player.vx >= 0) {
        player.vx = 0;
        this.saet(STATE_IDLE);
      }
    }
    if (input.hopTrykket && this.tilst !== STATE_AIR) {
      this.hop();
    }
  },
  // Player control and physics while airborne: steering, variable jump height, gravity, landing on
  // paths and collision with solid tiles and the level edges.
  luft(input) {
    const player = this.p, left = input.venstre && !input.hoejre, right = input.hoejre && !input.venstre;
    if (left) {
      if (player.vx > -activeCostume.vmax) {
        player.vx -= activeCostume.acc;
      }
      player.face = 0;
    } else if (right) {
      if (player.vx < activeCostume.vmax) {
        player.vx += activeCostume.acc;
      }
      player.face = 1;
    } else if (player.vx > 0) {
      player.vx = Math.max(0, player.vx - activeCostume.acc);
    } else if (player.vx < 0) {
      player.vx = Math.min(0, player.vx + activeCostume.acc);
    }
    player.vx = clamp(player.vx, -activeCostume.vmax, activeCostume.vmax);
    let applyGravity = true;
    if (this.stiger) {
      if ((input.hop || input.hopTrykket) && this.holdTid > 0 && this.kanHolde) {
        this.holdTid -= STEP_MS;
        applyGravity = false;
      } else {
        this.kanHolde = false;
      }
      if (player.vy >= 0) {
        this.stiger = false;
        this.vis(4);
      }
    }
    if (applyGravity) {
      player.vy = Math.min(activeCostume.maxFald, player.vy + activeCostume.tyngde);
    }
    const landing = this.land(player.x, player.y, player.vx, player.vy);
    if (landing) {
      this.saetPaaSti(landing);
      this.saet(player.vx === 0 ? STATE_IDLE : STATE_WALK);
      return;
    }
    let nextX = player.x + player.vx, nextY = player.y + player.vy;
    const halfWidth = activeCostume.hb;
    let hitBlock = this.massiv(nextX - halfWidth, nextY) || this.massiv(nextX - halfWidth, nextY - activeCostume.h / 2);
    if (hitBlock) {
      nextX = hitBlock.r + halfWidth + FIXED_EPSILON;
      player.vx = 0;
    }
    hitBlock = this.massiv(nextX + halfWidth, nextY) || this.massiv(nextX + halfWidth, nextY - activeCostume.h / 2);
    if (hitBlock) {
      nextX = hitBlock.l - halfWidth - FIXED_EPSILON;
      player.vx = 0;
    }
    if (this.stiger) {
      hitBlock = this.massiv(nextX + halfWidth, nextY - activeCostume.h) || this.massiv(nextX - halfWidth, nextY - activeCostume.h);
      if (hitBlock) {
        nextY = hitBlock.b + activeCostume.h + FIXED_EPSILON;
        player.vy = 0;
      }
    }
    if (nextX - halfWidth < 0) {
      nextX = halfWidth;
      player.vx = 0;
    }
    if (nextX + halfWidth > this.Wu) {
      nextX = this.Wu - halfWidth;
      player.vx = 0;
    }
    player.x = nextX;
    player.y = nextY;
  },
  // Moves the player along the current path (crossing segment boundaries) and pushes back out of walls and level edges.
  gaa() {
    const path = this.sti, player = this.p;
    if (!path) {
      return;
    }
    if (!path.aktiv) {
      this.saet(STATE_AIR);
      return;
    }
    const halfWidth = activeCostume.hb;
    let segment = this.seg, distance = this.dist + player.vx, leaveEnd = false;
    if (segment === 0) {
      if (distance < 0) {
        leaveEnd = true;
      } else if (distance > halfWidth) {
        segment = 1;
        distance -= halfWidth;
      }
    } else if (segment === path.n - 1) {
      if (distance < 0) {
        segment--;
        distance += segment === 0 ? halfWidth : path.len[segment];
      } else if (distance > halfWidth) {
        leaveEnd = true;
      }
    } else if (distance < 0) {
      segment--;
      distance += segment === 0 ? halfWidth : path.len[segment];
    } else if (distance > path.len[segment]) {
      segment++;
      distance -= path.len[segment - 1];
    }
    const placeOnPath = () => {
      [player.x, player.y] = path.pos(segment, distance, halfWidth);
    };
    placeOnPath();
    let block = this.massiv(player.x - halfWidth, player.y - activeCostume.h / 2) || this.massiv(player.x - halfWidth, player.y - activeCostume.h);
    if (block) {
      distance += block.r - (player.x - halfWidth);
      placeOnPath();
      player.vx = 0;
    }
    block = this.massiv(player.x + halfWidth, player.y - activeCostume.h / 2) || this.massiv(player.x + halfWidth, player.y - activeCostume.h);
    if (block) {
      distance -= player.x + halfWidth - block.l;
      placeOnPath();
      player.vx = 0;
    }
    if (player.x - halfWidth < 0) {
      distance += halfWidth - player.x;
      placeOnPath();
      player.vx = 0;
    }
    if (player.x + halfWidth > this.Wu) {
      distance -= player.x + halfWidth - this.Wu;
      placeOnPath();
      player.vx = 0;
    }
    this.seg = segment;
    this.dist = distance;
    if (leaveEnd) {
      this.saet(STATE_AIR);
    }
  },
  // Updates the camera: it looks a bit ahead in the direction of movement (eased with a smoothstep) and follows
  // the player vertically with a slight bias, clamped to the level.
  kamera() {
    var inputLeft, inputRight;
    const cam = this.kam, player = this.p, lookThreshold = activeCostume.vmax / 2;
    let lookDir = 1, lookOffset = 0;
    if (player.vx <= -lookThreshold || (inputLeft = this.inp) != null && inputLeft.venstre) {
      lookDir = 0;
      lookOffset = -50;
    } else if (player.vx >= lookThreshold || (inputRight = this.inp) != null && inputRight.hoejre) {
      lookDir = 2;
      lookOffset = 50;
    }
    if (lookDir !== cam.g) {
      cam.h = cam.f;
      cam.i = lookOffset - cam.h;
      cam.j = 0;
      cam.g = lookDir;
    }
    if (cam.j < 1) {
      cam.j = Math.min(1, cam.j + (STEP_MS * 1745 >> 6) / 65536);
      cam.f = cam.h + smoothstepScaled(cam.j, cam.i);
    }
    const verticalBias = (1 - player.y / this.Hu) * (VIEW_HEIGHT_UNITS / 4);
    cam.x = clamp(player.x - viewWidthUnits / 2 + cam.f, 0, this.Wu - viewWidthUnits);
    cam.y = clamp(player.y - VIEW_HEIGHT_UNITS / 2 * 1.5 + verticalBias, 0, this.Hu - VIEW_HEIGHT_UNITS);
  },
};
