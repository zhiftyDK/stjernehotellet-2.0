// Platform minigame: the Level simulation class.
//
// A Level holds everything in one level: the paths and tiles, moving platforms, coins, goal, enemies, the
// player and the camera. step(input) advances the simulation, tegneliste() (see level-render.js) builds
// the draw list. The big class is split over several files: this file has construction, per-step logic
// and damage handling, player.js has movement/camera, enemies.js the enemy behaviour and level-render.js
// the draw list. Those are mixed into the prototype at the bottom of this file.
//
// Main properties (names are kept from the original data/save format):
//   bane level data, W/H size in tiles, Wu/Hu size in world units, stier all walkable paths,
//   platforme moving platforms, mynter coins, maal goal position, fast animated scenery objects,
//   delte shared animation players, liv lives left, tilstand game state ("spiller" playing, "sejr" winning,
//   "vundet" won, "slut" game over), p player {x,y,vx,vy,face}, tilst player movement state, sti path under
//   the player, fig player animation, kam camera, kostume costume index, helbred health, fjender enemies,
//   pigge floor spikes, lyde sound names queued for playback, partikler dust particles.
import { STEP_MS, TILE, VIEW_HEIGHT_UNITS, STATE_IDLE, STATE_WALK, STATE_SKID, STATE_AIR, STATE_DEAD, FIXED_EPSILON, fromFixed, boxesOverlap } from './constants.js';
import { activeCostume, setActiveCostume, COSTUMES } from './costumes.js';
import { createAnimation } from './sprites.js';
import { viewWidthUnits } from './view.js';
import { TrackPath } from './track-path.js';
import { MovingPlatform } from './moving-platform.js';
import { playerMethods } from './player.js';
import { enemyMethods } from './enemies.js';
import { renderMethods } from './level-render.js';

export class Level {
  // Builds a level from its JSON data: paths, moving platforms, coins, goal, decorative animations, enemies;
  // then places the player at the start.
  constructor(levelData, animations, background) {
    this.bane = levelData;
    this.anims = animations;
    this.baggrund = background;
    this.W = levelData.bredde;
    this.H = levelData.hoejde;
    this.Wu = this.W * TILE;
    this.Hu = this.H * TILE;
    this.stier = levelData.stier.map((pathDef) => new TrackPath(pathDef, pathDef.loop));
    this.platforme = levelData.bevaegelige.map((platformDef) => new MovingPlatform(platformDef, animations));
    for (const platform of this.platforme) {
      this.stier.push(platform.sti);
    }
    this.mynter = levelData.lister.g2.map(([fx, fy]) => ({ x: fromFixed(fx), y: fromFixed(fy), taget: false }));
    this.mynterIalt = this.mynter.length;
    this.mynterTaget = 0;
    this.maal = { x: fromFixed(levelData.maal[0]), y: fromFixed(levelData.maal[1]) };
    this.fast = [];
    const addTiles = (positions, spriteId) => {
      for (const pos of positions) {
        this.fast.push({ x: fromFixed(pos[0]), y: fromFixed(pos[1]), id: spriteId });
      }
    };
    addTiles(levelData.lister.g1, 12859);
    addTiles(levelData.lister.f, 12863);
    addTiles(levelData.lister.h, 12891);
    addTiles(levelData.lister.d, 12856);
    addTiles(levelData.lister.e, 12865);
    this.delte = new Map();
    for (const animId of [12861, 12869, ...new Set(this.fast.map((tile) => tile.id))]) {
      const anim = createAnimation(animations, animId);
      if (anim) {
        this.delte.set(animId, anim);
      }
    }
    this.liv = 3;
    this.tid = 0;
    this.lyde = [];
    this.partikler = [];
    this.tilstand = "spiller";
    this.p = { x: 0, y: 0, vx: 0, vy: 0, face: 1 };
    this.fig = { tilst: -1, anim: null, laast: false, venter: -1 };
    this.kam = { x: 0, y: 0, f: 0, h: 0, i: 0, j: 1, g: 1 };
    this.startPaaNy();
    this.lavFjender();
  }
  // (Re)starts the player at the level start with full health and the default costume.
  startPaaNy() {
    const player = this.p;
    player.x = fromFixed(this.bane.start[0]);
    player.y = fromFixed(this.bane.start[1]);
    player.vx = 0;
    player.vy = 0;
    player.face = 1;
    this.tilst = -1;
    this.sti = null;
    this.holdTid = activeCostume.hold;
    this.doedTid = 0;
    this.helbred = 3;
    this.kostume = 0;
    setActiveCostume(COSTUMES[0]);
    this.usaarlig = false;
    this.frys = false;
    this.blinkTid = 0;
    const landing = this.land(player.x, player.y, 0, TILE);
    if (landing) {
      this.saetPaaSti(landing);
      this.tilst = STATE_IDLE;
      player.vx = 0;
      player.vy = 0;
      this.vis(0, true);
    } else {
      this.tilst = STATE_AIR;
      this.stiger = false;
      this.vis(4, true);
    }
    const cam = this.kam;
    cam.x = player.x - viewWidthUnits / 2;
    cam.y = player.y - VIEW_HEIGHT_UNITS / 2;
    cam.f = 0;
    cam.j = 1;
    cam.g = 1;
    this.kamera();
  }
  // Checks the player against enemies (stomp from above or get hurt), projectiles and floor spikes.
  kollision() {
    const player = this.p, left = player.x - activeCostume.hb, right = player.x + activeCostume.hb, top = player.y - activeCostume.h, bottom = player.y;
    let hurt = false, stomped = false, stompTop = 1 / 0;
    for (const enemy of this.fjender) {
      if (!this.fjendeAktiv(enemy) || !this.naer(enemy.x, enemy.y)) {
        continue;
      }
      const eLeft = enemy.x - enemy.b / 2, eRight = enemy.x + enemy.b / 2, eTop = enemy.y - enemy.h, eBottom = enemy.y;
      if (!boxesOverlap(left, right, top, bottom, eLeft, eRight, eTop, eBottom)) {
        continue;
      }
      if (this.forrigeY <= enemy.py - enemy.h + 1 && player.vy >= 0) {
        if (enemy.art === "popper" && enemy.farlig) {
          hurt = true;
        } else {
          this.tramp(enemy);
        }
        stomped = true;
        stompTop = Math.min(stompTop, eTop);
      } else {
        hurt = true;
      }
    }
    for (const thrower of this.fjender) {
      const shot = thrower.skud;
      if (shot != null && shot.aktiv && boxesOverlap(left, right, top, bottom, shot.x - 2, shot.x + 2, shot.y - 2, shot.y + 2)) {
        hurt = true;
        shot.aktiv = false;
      }
    }
    for (const spike of this.pigge) {
      const length = spike.n * TILE;
      let box;
      if (spike.dir === 0) {
        box = [spike.x + FIXED_EPSILON, spike.x + length - FIXED_EPSILON, spike.y - 8, spike.y];
      } else if (spike.dir === 2) {
        box = [spike.x + FIXED_EPSILON, spike.x + length - FIXED_EPSILON, spike.y - TILE, spike.y - 8];
      } else {
        box = [spike.x, spike.x + 8, spike.y - TILE + FIXED_EPSILON, spike.y + TILE * (spike.n - 1) - FIXED_EPSILON];
      }
      if (boxesOverlap(left, right, top, bottom, box[0], box[1], box[2], box[3])) {
        hurt = true;
      }
    }
    if (stomped) {
      player.y = Math.min(player.y, stompTop - FIXED_EPSILON);
      player.vy = activeCostume.hop;
      this.saet(STATE_AIR);
    }
    if (hurt) {
      this.skade();
    }
  }
  // The player is hit: first loses the costume, then one health point; dies when health runs out.
  // Grants a period of invulnerability (blinking).
  skade() {
    if (!this.usaarlig) {
      if (this.kostume !== 0) {
        this.skiftKostume(0, true);
        this.usaarlig = true;
        this.blinkTid = 2e3;
        this.lyde.push("slag");
        return;
      }
      if (this.helbred > 1) {
        this.helbred--;
        this.p.vx = 0;
        this.p.vy = 0;
        this.usaarlig = true;
        this.frys = true;
        this.lyde.push("slag");
        this.vis(8, true);
      } else {
        this.helbred = 0;
        this.doe();
      }
    }
  }
  // Kills the player: loses a life and starts the respawn countdown.
  doe() {
    this.lyde.push("doed");
    this.liv--;
    this.saet(STATE_DEAD);
    this.doedTid = 1200;
  }
  // Whether the world position (x, y) is near enough to the camera for entities to be simulated.
  naer(x, y) {
    const cam = this.kam;
    return x >= cam.x - 150 && x <= cam.x + viewWidthUnits + 150 && y >= cam.y - 100 && y <= cam.y + VIEW_HEIGHT_UNITS + 100;
  }
  // Advances the whole level by one simulation step with the given input state:
  // platforms, animations, victory/death timers, player, enemies, collisions, coin pickup, goal check and camera.
  step(input) {
    this.inp = input;
    for (const path of this.stier) {
      path.dx = 0;
      path.dy = 0;
    }
    for (const platform of this.platforme) {
      platform.step();
    }
    for (const anim of this.delte.values()) {
      anim.advance(STEP_MS);
    }
    if (this.tilstand === "sejr" && (this.sejrTid -= STEP_MS, this.sejrTid <= 0 && (this.tilstand = "vundet")), this.partikelStep(), this.tilstand !== "spiller") {
      this.visStep();
      return;
    }
    if (this.tid += STEP_MS, this.tilst === STATE_DEAD) {
      this.doedTid -= STEP_MS;
      if (this.doedTid <= 0) {
        if (this.liv > 0) {
          this.startPaaNy();
        } else {
          this.tilstand = "slut";
        }
      }
      this.visStep();
      return;
    }
    const player = this.p;
    this.forrigeY = player.y;
    if (this.frys) {
      if (!this.fig.laast) {
        this.frys = false;
        this.blinkTid = 2e3;
        this.vis(this.tilst === STATE_AIR ? 4 : this.tilst === STATE_SKID ? 6 : this.tilst === STATE_WALK && !this.paaIs ? 1 : 0, true);
      }
    } else {
      if (this.tilst === STATE_AIR) {
        this.luft(input);
      } else {
        this.jord(input);
      }
      if (this.tilst !== STATE_AIR && this.sti) {
        this.gaa();
      }
    }
    if (this.usaarlig && !this.frys) {
      this.blinkTid -= STEP_MS;
      if (this.blinkTid <= 0) {
        this.usaarlig = false;
      }
    }
    for (const enemy of this.fjender) {
      const shot = enemy.skud;
      if (shot != null && shot.aktiv) {
        shot.x += shot.vx;
        if (--shot.liv <= 0) {
          shot.aktiv = false;
        }
      }
      if (!enemy.vaek && this.naer(enemy.x, enemy.y)) {
        this.fjendeStep(enemy);
      }
    }
    if (player.y - activeCostume.h > this.Hu) {
      this.doe();
    } else {
      this.kollision();
    }
    const pLeft = player.x - activeCostume.hb, pRight = player.x + activeCostume.hb, pTop = player.y - activeCostume.h, pBottom = player.y;
    for (const coin of this.mynter) {
      if (!coin.taget) {
        if (pRight >= coin.x - 7 && pLeft <= coin.x + 7 && pBottom >= coin.y - 7 && pTop <= coin.y + 7) {
          coin.taget = true;
          this.mynterTaget++;
          this.lyde.push("mynt");
        }
      }
    }
    const goal = this.maal;
    if (this.tilst !== STATE_DEAD && this.tilst !== STATE_AIR && this.sti && pRight >= goal.x - 20 && pLeft <= goal.x + 20 && pBottom >= goal.y - 80 && pTop <= goal.y) {
      this.tilstand = "sejr";
      this.lyde.push("maal");
      player.vx = 0;
      player.vy = 0;
      this.usaarlig = false;
      this.vis(9, true);
      this.sejrTid = 3e3;
    }
    if (this.tilst !== STATE_DEAD) {
      this.kamera();
    }
    this.visStep();
  }
}

// Mix the player, enemy and draw-list methods into the Level class.
Object.assign(Level.prototype, playerMethods, enemyMethods, renderMethods);
