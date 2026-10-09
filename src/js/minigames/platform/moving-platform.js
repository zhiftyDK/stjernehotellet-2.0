// Platform minigame: MovingPlatform, a platform made of tiles with optional motion and timers.
//
// Motion: back-and-forth along a line ("linje") or around a circle ("cirkel").
// Timer behaviour: "blink" platforms fade out and in on a schedule, "smuldre" platforms crumble
// shortly after the player stands on them. The visual kind is picked once in the constructor.
import { STEP_MS, fromFixed, scaleToStep, smoothstepScaled } from './constants.js';
import { PLATFORM_TILE_SPRITES, PLATFORM_ROPE_SPRITE, ICE_SPRITES, createAnimation } from './sprites.js';
import { TrackPath } from './track-path.js';

// Properties: sti = the TrackPath, bev = motion data, timer = blink/crumble data, vis = visual data,
// f = solidity/fade factor (1 = fully there, 0 = gone), e = size variant.
export class MovingPlatform {
  constructor(def, animations) {
    var crumbleTimerCheck, blinkTimerCheck;
    this.sti = new TrackPath(def.sti, def.flag);
    this.e = def.a;
    this.f = 1;
    const extra = def.ekstra || [];
    if (this.bev = null, def.type === 1) {
      this.bev = { art: "linje", rx: fromFixed(extra[0]), ry: fromFixed(extra[1]), afst: fromFixed(extra[2]), fart: scaleToStep(extra[3]), c: 0, frem: true, e: 0, aktiv: !def.flag2 };
    } else if (def.type === 2) {
      const startAngle = fromFixed(extra[3]);
      this.bev = { art: "cirkel", cx: fromFixed(extra[0]), cy: fromFixed(extra[1]), r: fromFixed(extra[2]), v: startAngle, fart: scaleToStep(extra[4] * extra[5]), aktiv: !def.flag2 };
      this.bev.px = this.bev.cx + this.bev.r * Math.cos(startAngle);
      this.bev.py = this.bev.cy + this.bev.r * Math.sin(startAngle);
    }
    const extra2 = def.ekstra2 || [];
    this.timer = null;
    if (def.type2 === 1) {
      this.timer = { art: "blink", vent: extra2[0], fade: extra2[1], vaek: extra2[2], fase: 0, t: extra2[0] };
    } else if (def.type2 === 2) {
      this.timer = { art: "smuldre", fart: scaleToStep(extra2[0]), pause: 0 };
    }
    const tileCount = this.e + 2, pickOne = (optionA, optionB) => Math.random() < 0.5 ? optionA : optionB, randomIceIndex = () => 2 + Math.floor(Math.random() * 4);
    if (((crumbleTimerCheck = this.timer) == null ? void 0 : crumbleTimerCheck.art) === "smuldre") {
      const crumbleBaseAnimId = [12875, 12878, 12881][this.e] ?? 12875;
      this.vis = { art: "k", tilst: 0, a: createAnimation(animations, crumbleBaseAnimId), b: createAnimation(animations, crumbleBaseAnimId + 1), c: createAnimation(animations, crumbleBaseAnimId + 2) };
    } else if (((blinkTimerCheck = this.timer) == null ? void 0 : blinkTimerCheck.art) === "blink") {
      this.vis = { art: "l", a: createAnimation(animations, [12872, 12873, 12874][this.e] ?? 12872) };
    } else if (this.bev) {
      const iceTiles = this.sti.is ? [0, ...Array.from({ length: tileCount - 2 }, randomIceIndex), 1] : null;
      this.vis = { art: "m", antal: tileCount, a: createAnimation(animations, 12870), b: createAnimation(animations, 12871), is: iceTiles };
    } else {
      const tileIds = [pickOne(0, 2), ...Array.from({ length: tileCount - 2 }, () => pickOne(4, 5)), pickOne(1, 3)], iceTiles = this.sti.is ? [0, ...Array.from({ length: tileCount - 2 }, randomIceIndex), 1] : null;
      this.vis = { art: "n", st: tileIds, is: iceTiles };
    }
  }
  step() {
    var crumbleAnimB, crumbleAnimC, bridgeAnimLeft, bridgeAnimRight;
    const path = this.sti, motion = this.bev;
    if (motion) {
      if (!motion.aktiv) {
        if (path.staar) {
          motion.aktiv = true;
        }
      } else if (motion.art === "linje") {
        if (motion.frem) {
          motion.c += motion.fart;
          if (motion.c > 1) {
            motion.c = 1;
            motion.frem = false;
          }
        } else {
          motion.c -= motion.fart;
          if (motion.c < 0) {
            motion.c = 0;
            motion.frem = true;
          }
        }
        const eased = smoothstepScaled(motion.c, motion.afst);
        path.flyt(motion.rx * (eased - motion.e), motion.ry * (eased - motion.e));
        motion.e = eased;
      } else {
        motion.v += motion.fart;
        if (motion.v > Math.PI * 2) {
          motion.v -= Math.PI * 2;
        }
        const newX = motion.cx + motion.r * Math.cos(motion.v), newY = motion.cy + motion.r * Math.sin(motion.v);
        path.flyt(newX - motion.px, newY - motion.py);
        motion.px = newX;
        motion.py = newY;
      }
    }
    const timer = this.timer;
    if ((timer == null ? void 0 : timer.art) === "smuldre") {
      if (this.f <= 0) {
        timer.pause -= STEP_MS;
        if (timer.pause <= 0) {
          this.f = 1;
          path.aktiv = true;
        }
      } else if (path.staar) {
        this.f -= timer.fart;
        if (this.f <= 0) {
          this.f = 0;
          path.aktiv = false;
          timer.pause = 2e3;
        }
      }
    } else if ((timer == null ? void 0 : timer.art) === "blink") {
      timer.t -= STEP_MS;
      if (timer.fase === 0) {
        this.f = 1;
        if (timer.t <= 0) {
          timer.fase = 1;
          timer.t = timer.fade;
        }
      } else if (timer.fase === 1) {
        this.f = Math.max(0, timer.t / timer.fade);
        if (timer.t <= 0) {
          timer.fase = 2;
          timer.t = timer.vaek;
          path.aktiv = false;
          this.f = 0;
        }
      } else if (timer.fase === 2) {
        this.f = 0;
        if (timer.t <= 0) {
          timer.fase = 3;
          timer.t = timer.fade;
          path.aktiv = true;
        }
      } else {
        this.f = 1 - Math.max(0, timer.t / timer.fade);
        if (timer.t <= 0) {
          timer.fase = 0;
          timer.t = timer.vent;
        }
      }
    }
    const visual = this.vis;
    if (visual.art === "k") {
      if (visual.tilst <= 1) {
        visual.tilst = path.staar ? 1 : 0;
        if (visual.tilst === 1) {
          if ((crumbleAnimB = visual.b) != null) {
            crumbleAnimB.advance(STEP_MS);
          }
        }
        if (this.f <= 0) {
          visual.tilst = 2;
        }
      } else if (visual.tilst === 2) {
        if ((crumbleAnimC = visual.c) != null) {
          crumbleAnimC.advance(STEP_MS);
        }
        if (!visual.c || visual.c.finished) {
          visual.tilst = 3;
        }
      } else if (this.f > 0) {
        for (const anim of [visual.a, visual.b, visual.c]) {
          if (anim) {
            anim.reset();
            anim.advance(0);
          }
        }
        visual.tilst = 0;
      }
    } else if (visual.art === "m") {
      if ((bridgeAnimLeft = visual.a) != null) {
        bridgeAnimLeft.advance(STEP_MS);
      }
      if ((bridgeAnimRight = visual.b) != null) {
        bridgeAnimRight.advance(STEP_MS);
      }
    }
  }
  tegn(drawList, toScreenX, toScreenY) {
    const path = this.sti, left = path.x[1], top = path.y[1], visual = this.vis;
    if (visual.art === "n") {
      visual.st.forEach((tileIndex, column) => {
        drawList.push({ sprite: PLATFORM_TILE_SPRITES[tileIndex], x: toScreenX(left + 16 * column + 8), y: toScreenY(top) });
        if (visual.is) {
          drawList.push({ sprite: ICE_SPRITES[visual.is[column]], x: toScreenX(left + 16 * column + 8), y: toScreenY(top) });
        }
      });
    } else if (visual.art === "m") {
      if (visual.a) {
        drawList.push({ anim: visual.a, x: toScreenX(left + 8), y: toScreenY(top + 8) });
      }
      for (let column = 1; column < visual.antal - 1; column++) {
        drawList.push({ sprite: PLATFORM_ROPE_SPRITE, x: toScreenX(left + 8 + 16 * column), y: toScreenY(top) });
      }
      if (visual.b) {
        drawList.push({ anim: visual.b, x: toScreenX(left + 8 + 16 * (visual.antal - 1)), y: toScreenY(top + 8) });
      }
      if (visual.is) {
        visual.is.forEach((iceIndex, column) => drawList.push({ sprite: ICE_SPRITES[iceIndex], x: toScreenX(left + 8 + 16 * column), y: toScreenY(top) }));
      }
    } else if (visual.art === "k") {
      const anim = visual.tilst === 0 ? visual.a : visual.tilst === 1 ? visual.b : visual.c;
      if (anim) {
        drawList.push({ anim: anim, x: toScreenX(left), y: toScreenY(top) });
      }
    } else if (visual.art === "l" && visual.a) {
      drawList.push({ anim: visual.a, x: toScreenX(left), y: toScreenY(top), alpha: (this.f * 225 + 30) / 255 });
    }
  }
}
