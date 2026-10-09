// Platform minigame: enemy methods of the Level class.
//
// Enemy kinds: "gaaer" (simple walker), "hopper" (walks and jumps), "kaster" (stands and shoots
// projectiles), "popper" (hides in the ground and pops up). Methods are mixed into Level.prototype by level.js.
import { STEP_MS, GRAVITY, MAX_FALL_SPEED, ENEMY_WALK_SPEED, TILE, fromFixed } from './constants.js';
import { createAnimation } from './sprites.js';

export const enemyMethods = {
  // Creates all enemies from the level data: walkers (gaaer), hoppers, throwers (kaster) and poppers,
  // plus the list of floor spikes (pigge).
  lavFjender() {
    const enemyData = this.bane.fjender, makeEnemy = (kind, pos, width, height) => ({ art: kind, x: fromFixed(pos[0]), y: fromFixed(pos[1]), px: 0, py: 0, b: width, h: height, vx: 0, vy: 0, dir: 1, tilst: 0, t: 0, t2: 0, sti: null, seg: 0, dist: 0, vaek: false });
    this.fjender = [];
    for (const pos of enemyData.i1) {
      const enemy = makeEnemy("gaaer", pos, 15, 10);
      enemy.anim = createAnimation(this.anims, 12833);
      if (this.fjendePlant(enemy)) {
        enemy.tilst = "gaa";
        enemy.vx = ENEMY_WALK_SPEED;
      } else {
        enemy.tilst = "fald";
      }
      this.fjender.push(enemy);
    }
    for (const pos of enemyData.i2) {
      const enemy = makeEnemy("hopper", pos, 15, 10);
      enemy.anims = { 1: createAnimation(this.anims, 12834), 2: createAnimation(this.anims, 12835), 3: createAnimation(this.anims, 12836), 4: createAnimation(this.anims, 12837) };
      this.saetHopper(enemy, this.fjendePlant(enemy) ? 1 : 0);
      this.fjender.push(enemy);
    }
    for (const pos of enemyData.i4) {
      const enemy = makeEnemy("kaster", pos, 15, 26);
      enemy.dir = pos[2] ? 1 : 0;
      enemy.raekke = fromFixed(pos[3]);
      enemy.skud = { aktiv: false, x: 0, y: 0, vx: 0, liv: 0 };
      enemy.lam = createAnimation(this.anims, 12839);
      enemy.vaagn = createAnimation(this.anims, 12840);
      this.saetKaster(enemy, "hvil");
      this.fjender.push(enemy);
    }
    for (const pos of enemyData.i6) {
      const enemy = makeEnemy("popper", pos, 32, 26);
      enemy.trak = createAnimation(this.anims, 12842);
      this.saetPopper(enemy, "hvil");
      this.fjender.push(enemy);
    }
    this.pigge = enemyData.m.map((spike) => ({ x: fromFixed(spike[0]), y: fromFixed(spike[1]), n: spike[2], dir: spike[3] }));
  },
  // Places an enemy on the path below it. Returns false if there is no path to stand on.
  fjendePlant(enemy) {
    const landing = this.land(enemy.x, enemy.y - 1, 0, TILE, enemy.b / 2);
    if (landing) {
      this.fjendeSti(enemy, landing);
      return true;
    }
    return false;
  },
  // Attaches an enemy to the path segment found by land() and snaps it to the path.
  fjendeSti(enemy, landing) {
    enemy.sti = landing.sti;
    enemy.seg = landing.seg;
    enemy.dist = landing.dist;
    [enemy.x, enemy.y] = landing.sti.pos(landing.seg, landing.dist, enemy.b / 2);
  },
  // Walks an enemy along its path; turns around at path ends and walls. Returns false if the enemy walked off the path.
  fjendeGaa(enemy) {
    const path = enemy.sti;
    if (!path || !path.aktiv) {
      return false;
    }
    const halfWidth = enemy.b / 2, pointCount = path.n;
    let segment = enemy.seg, distance = enemy.dist + enemy.vx;
    if (segment === 0) {
      if (distance < 0) {
        return false;
      }
      if (distance > halfWidth) {
        segment = 1;
        distance -= halfWidth;
      }
    } else if (segment === pointCount - 1) {
      if (distance < 0) {
        segment--;
        distance += path.len[segment];
      } else if (distance > halfWidth) {
        return false;
      }
    } else if (distance < 0) {
      segment--;
      if (segment !== 0) {
        distance += path.len[segment];
      } else {
        segment++;
        enemy.vx = -enemy.vx;
        enemy.dir = 1;
      }
    } else if (distance > path.len[segment]) {
      segment++;
      if (segment === pointCount - 1) {
        segment--;
        enemy.vx = -enemy.vx;
        enemy.dir = 0;
      } else {
        distance -= path.len[segment - 1];
      }
    }
    let [px, py] = path.pos(segment, distance, halfWidth);
    const bodyY = py - enemy.h + fromFixed(10);
    let block = this.massiv(px - halfWidth, bodyY);
    if (block) {
      distance += block.r - (px - halfWidth);
      [px, py] = path.pos(segment, distance, halfWidth);
      enemy.vx = -enemy.vx;
      enemy.dir = 1;
    }
    block = this.massiv(px + halfWidth, bodyY);
    if (block) {
      distance -= px + halfWidth - block.l;
      [px, py] = path.pos(segment, distance, halfWidth);
      enemy.vx = -enemy.vx;
      enemy.dir = 0;
    }
    enemy.seg = segment;
    enemy.dist = distance;
    enemy.x = px;
    enemy.y = py;
    return true;
  },
  // Enemy free fall with tile collision; returns true when it lands on a path.
  fjendeFald(enemy) {
    enemy.vy = Math.min(MAX_FALL_SPEED, enemy.vy + GRAVITY);
    const halfWidth = enemy.b / 2, landing = this.land(enemy.x, enemy.y, enemy.vx, enemy.vy, halfWidth);
    if (landing) {
      this.fjendeSti(enemy, landing);
      enemy.vy = 0;
      return true;
    }
    let newX = enemy.x + enemy.vx;
    const newY = enemy.y + enemy.vy;
    let block = this.massiv(newX - halfWidth, newY) || this.massiv(newX - halfWidth, newY - enemy.h);
    if (block) {
      newX = block.r + halfWidth;
      enemy.vx = 0;
    }
    block = this.massiv(newX + halfWidth, newY) || this.massiv(newX + halfWidth, newY - enemy.h);
    if (block) {
      newX = block.l - halfWidth;
      enemy.vx = 0;
    }
    enemy.x = newX;
    enemy.y = newY;
    enemy.sti = null;
    return false;
  },
  // Falling animation of a defeated enemy; marked for removal once below the level.
  fjendeDoedsfald(enemy) {
    enemy.vy = Math.min(MAX_FALL_SPEED, enemy.vy + GRAVITY);
    enemy.y += enemy.vy;
    if (enemy.y - enemy.h > this.Hu) {
      enemy.vaek = true;
    }
  },
  // Switches a hopper state: 0 falling, 1 walking, 2 crouching, 3 jumping, 4 resting, 5 defeated.
  saetHopper(hopper, newState) {
    var animsRef;
    hopper.tilst = newState;
    if (newState === 1) {
      hopper.vx = hopper.dir === 1 ? ENEMY_WALK_SPEED : -ENEMY_WALK_SPEED;
      hopper.vy = 0;
      hopper.t = 1500 + Math.random() * 1500;
    } else if (newState === 2) {
      hopper.vx = 0;
      hopper.vy = 0;
      hopper.t = 1500;
    } else if (newState === 3) {
      hopper.startY = hopper.y;
      this.lyde.push("fjendehop");
    } else if (newState === 4) {
      hopper.t = 2e3;
    } else if (newState === 5) {
      hopper.vx = 0;
      hopper.vy = fromFixed(-25e4);
    }
    const anim = (animsRef = hopper.anims) == null ? void 0 : animsRef[newState];
    if (anim) {
      anim.reset();
      anim.advance(0);
    }
  },
  // Switches a thrower state: hvil (rest), sigt (aiming, then fires), lammet (stomped and stunned).
  saetKaster(thrower, newState) {
    if (thrower.tilst = newState, newState === "hvil") {
      thrower.vis = 0;
      thrower.t = 2300 + Math.random() * 50;
    } else if (newState === "sigt") {
      thrower.vis = 1;
      thrower.t = 500;
      thrower.t2 = 500;
    } else if (newState === "lammet") {
      thrower.t = 1e4;
      thrower.vaagner = false;
      for (const anim of [thrower.lam, thrower.vaagn]) {
        if (anim) {
          anim.reset();
          anim.advance(0);
        }
      }
    }
  },
  // Switches a popper state: hvil (hidden), op (rising, dangerous when fully up), doed (defeated).
  saetPopper(popper, newState) {
    popper.tilst = newState;
    popper.farlig = false;
    if (newState === "hvil") {
      popper.vis = 0;
      popper.t = 3e3 + Math.random() * 3e3;
    } else if (newState === "op") {
      popper.vis = 1;
      popper.t = 1500;
      popper.t2 = 2e3;
      popper.trakker = false;
    } else if (newState === "doed") {
      popper.vis = 1;
      popper.vy = fromFixed(-25e4);
    }
  },
  // Advances one enemy by one simulation step according to its kind and state.
  fjendeStep(enemy) {
    var walkAnimA, walkAnimB, hopperAnims, hopperAnim, throwerSleepAnim, throwerWakeAnim, popperPullAnim;
    if (enemy.px = enemy.x, enemy.py = enemy.y, enemy.art === "gaaer") {
      if (enemy.tilst === "gaa") {
        if (!this.fjendeGaa(enemy)) {
          enemy.tilst = "fald";
        }
        if ((walkAnimA = enemy.anim) != null) {
          walkAnimA.advance(STEP_MS);
        }
      } else if (enemy.tilst === "fald") {
        if (this.fjendeFald(enemy)) {
          enemy.tilst = "gaa";
          enemy.vx = enemy.dir === 1 ? ENEMY_WALK_SPEED : -ENEMY_WALK_SPEED;
        }
        if ((walkAnimB = enemy.anim) != null) {
          walkAnimB.advance(STEP_MS);
        }
      } else {
        this.fjendeDoedsfald(enemy);
      }
    } else if (enemy.art === "hopper") {
      const hopperState = enemy.tilst;
      if (hopperState === 1 || hopperState === 2 || hopperState === 4) {
        enemy.t -= STEP_MS;
        if (hopperState === 1 && enemy.t <= 0) {
          this.saetHopper(enemy, 2);
        } else if (hopperState === 2 && enemy.t <= 0) {
          enemy.vy = fromFixed(-128e4 * STEP_MS >> 6);
          this.saetHopper(enemy, 3);
        } else if (hopperState === 4 && enemy.t <= 0) {
          this.saetHopper(enemy, 1);
        }
        if (enemy.tilst !== 3 && !this.fjendeGaa(enemy)) {
          this.saetHopper(enemy, 0);
        }
      } else if (hopperState === 3) {
        if (enemy.vy += GRAVITY, enemy.y += enemy.vy, enemy.y >= enemy.startY) {
          enemy.y = enemy.startY;
          enemy.vy = 0;
          this.saetHopper(enemy, 1);
        } else if (enemy.vy < 0) {
          const halfWidth = enemy.b / 2, block = this.massiv(enemy.x - halfWidth, enemy.y - enemy.h) || this.massiv(enemy.x + halfWidth, enemy.y - enemy.h);
          if (block) {
            enemy.y = block.b + enemy.h;
            enemy.vy = 0;
          }
        }
      } else if (hopperState === 0) {
        if (this.fjendeFald(enemy)) {
          this.saetHopper(enemy, 1);
        }
      } else {
        this.fjendeDoedsfald(enemy);
      }
      if ((hopperAnim = (hopperAnims = enemy.anims) == null ? void 0 : hopperAnims[enemy.tilst]) != null) {
        hopperAnim.advance(STEP_MS);
      }
    } else if (enemy.art === "kaster") {
      if (enemy.tilst === "hvil") {
        enemy.t -= STEP_MS;
        if (enemy.t <= 0 && !enemy.skud.aktiv) {
          this.saetKaster(enemy, "sigt");
        }
      } else if (enemy.tilst === "sigt") {
        if (enemy.t > 0) {
          if (enemy.t -= STEP_MS, enemy.t <= 0) {
            enemy.vis = 2;
            const shot = enemy.skud;
            shot.aktiv = true;
            shot.x = enemy.x + (enemy.dir === 0 ? -8 : 8);
            shot.y = enemy.y - fromFixed(1507328);
            shot.vx = enemy.dir === 0 ? -2 : 2;
            shot.liv = enemy.raekke / 2;
            this.lyde.push("skud");
          }
        } else {
          enemy.t2 -= STEP_MS;
          if (enemy.t2 <= 0) {
            this.saetKaster(enemy, "hvil");
          }
        }
      } else if (enemy.tilst === "lammet") {
        if (enemy.vaagner) {
          if ((throwerWakeAnim = enemy.vaagn) != null) {
            throwerWakeAnim.advance(STEP_MS);
          }
          if (!enemy.vaagn || enemy.vaagn.finished) {
            this.saetKaster(enemy, "hvil");
          }
        } else {
          if ((throwerSleepAnim = enemy.lam) != null) {
            throwerSleepAnim.advance(STEP_MS);
          }
          enemy.t -= STEP_MS;
          if (enemy.t <= 0) {
            enemy.vaagner = true;
          }
        }
      }
    } else if (enemy.art === "popper") {
      if (enemy.tilst === "hvil") {
        enemy.t -= STEP_MS;
        if (enemy.t <= 0) {
          this.saetPopper(enemy, "op");
        }
      } else if (enemy.tilst === "op") {
        if (enemy.t > 0) {
          enemy.t -= STEP_MS;
          if (enemy.t <= 0) {
            enemy.vis = 2;
            enemy.farlig = true;
            this.lyde.push("pigge");
          }
        } else if (enemy.t2 > 0) {
          enemy.t2 -= STEP_MS;
          if (enemy.t2 <= 0) {
            enemy.trakker = true;
            enemy.farlig = false;
            if (enemy.trak) {
              enemy.trak.reset();
              enemy.trak.advance(0);
            }
          }
        } else {
          if ((popperPullAnim = enemy.trak) != null) {
            popperPullAnim.advance(STEP_MS);
          }
          if (!enemy.trak || enemy.trak.finished) {
            this.saetPopper(enemy, "hvil");
          }
        }
      } else {
        this.fjendeDoedsfald(enemy);
      }
    }
  },
  // Whether an enemy can still hurt or be stomped (not defeated or stunned).
  fjendeAktiv(enemy) {
    return enemy.vaek ? false : enemy.art === "gaaer" ? enemy.tilst !== "doed" : enemy.art === "hopper" ? enemy.tilst !== 5 : enemy.art === "kaster" ? enemy.tilst !== "lammet" : enemy.tilst !== "doed";
  },
  // The player stomps an enemy: plays the sound and puts the enemy into its defeated/stunned state.
  tramp(enemy) {
    this.lyde.push("tramp");
    if (enemy.art === "gaaer") {
      enemy.tilst = "doed";
      enemy.vx = 0;
      enemy.vy = fromFixed(-257575);
    } else if (enemy.art === "hopper") {
      this.saetHopper(enemy, 5);
    } else if (enemy.art === "kaster") {
      this.saetKaster(enemy, "lammet");
    } else {
      this.saetPopper(enemy, "doed");
    }
  },
};
