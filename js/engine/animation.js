const POSITION_SCALE = 0.0122070312, SCALE_ONE = 4096, ROTATION_UNITS_PER_TURN = 14400, ANIM_PROP = { SPRITE: 0, X: 1, Y: 2, SCALE: 3, ROT: 4, FLIP: 5, VISIBLE: 6, ZORDER: 7, ALPHA: 8, SCALE_X: 9, SCALE_Y: 10, ROT2: 11 };
function interpolate(e, t, n, r, l) {
  if (l <= 0 || r >= l) {
    return n;
  }
  if (r <= 0) {
    return t;
  }
  const i = r / l, o = n - t;
  switch (e) {
    case 0:
      return t + o * i;
    case 1:
      return t + o * (1 - Math.cos(i * Math.PI / 2));
    case 2:
      return t + o * Math.sin(i * Math.PI / 2);
    case 3:
      return t + o * (0.5 - Math.cos(i * Math.PI) / 2);
    case 4:
      return t + o * (1 - Math.sin((1 - i) * Math.PI / 2));
    default:
      return t + o * i;
  }
}
function createAnimPart() {
  return { sprite: 0, x: 0, y: 0, scaleX: SCALE_ONE, scaleY: SCALE_ONE, rot: 0, flip: false, visible: true, alpha: 255 };
}
export class AnimationPlayer {
  constructor(t) {
    this.anim = t;
    this.instructions = [...t.instructions];
    this.reset();
  }
  reset() {
    const t = Math.max(1, this.anim.parts);
    this.ticks = 0;
    this.clock = 0;
    this.cursor = 0;
    this.parts = Array.from({ length: t }, createAnimPart);
    this.order = this.parts.map((n, r) => r);
    this.active = [];
    this.finished = false;
  }
  setProp(t, n, r) {
    if (t === 255 || t === 254) {
      return;
    }
    const l = this.parts[t];
    if (l) {
      switch (n) {
        case ANIM_PROP.SPRITE:
          l.sprite = r & 65535;
          break;
        case ANIM_PROP.X:
          l.x = r;
          break;
        case ANIM_PROP.Y:
          l.y = r;
          break;
        case ANIM_PROP.SCALE:
          l.scaleX = r & 65535;
          l.scaleY = r & 65535;
          break;
        case ANIM_PROP.ROT:
          l.rot = r / ROTATION_UNITS_PER_TURN;
          break;
        case ANIM_PROP.FLIP:
          l.flip = r === 1;
          break;
        case ANIM_PROP.VISIBLE:
          l.visible = r === 1;
          break;
        case ANIM_PROP.ZORDER:
          this.reorder(t, r);
          break;
        case ANIM_PROP.ALPHA:
          l.alpha = r;
          break;
        case ANIM_PROP.SCALE_X:
          l.scaleX = r & 65535;
          break;
        case ANIM_PROP.SCALE_Y:
          l.scaleY = r & 65535;
          break;
        case ANIM_PROP.ROT2:
          l.rot = r / ROTATION_UNITS_PER_TURN;
          break;
      }
    }
  }
  reorder(t, n) {
    let r = this.order.indexOf(t);
    if (r < 0) {
      r = 0;
    }
    const l = r + n;
    if (!(l < 0 || l >= this.order.length)) {
      if (n < 0) {
        for (let i = r; i > l; i--) {
          this.order[i] = this.order[i - 1];
        }
      }
      if (n > 0) {
        for (let i = r; i < l; i++) {
          this.order[i] = this.order[i + 1];
        }
      }
      this.order[l] = t;
    }
  }
  run(t) {
    if (t.curve === 15) {
      let l = t.v;
      if (t.prop === ANIM_PROP.ROT) {
        l *= 40;
      }
      this.setProp(t.target, t.prop, l);
      return false;
    }
    let n = t.v0, r = t.v1;
    if (t.prop === ANIM_PROP.ROT) {
      n *= 40;
      r *= 40;
    }
    if (t.prop === ANIM_PROP.SCALE || t.prop === ANIM_PROP.SCALE_X || t.prop === ANIM_PROP.SCALE_Y) {
      n &= 65535;
      r &= 65535;
    }
    this.setProp(t.target, t.prop, interpolate(t.curve, n, r, this.clock - t.t0, t.t1 - t.t0));
    return this.clock < t.t1;
  }
  advance(t) {
    if (!this.finished) {
      if (this.ticks += t, this.clock = Math.floor(this.ticks / 10), this.clock >= this.anim.duration) {
        if (this.anim.loop) {
          const n = this.anim.duration * 10, r = this.anim.loopFrom * 10, l = Math.max(1, n - r), i = (this.ticks - n) % l + r;
          this.reset();
          this.ticks = i;
          this.clock = Math.floor(i / 10);
        } else {
          this.clock = this.anim.duration;
          this.finished = true;
        }
      }
      for (this.active = this.active.filter((n) => this.run(n)); this.cursor < this.instructions.length && this.clock >= this.instructions[this.cursor].t0;) {
        const n = this.instructions[this.cursor];
        if (this.run(n)) {
          this.active.push(n);
        }
        this.cursor++;
      }
    }
  }
  drawList(t = "invers", n = false) {
    let r;
    if (t === "direkte") {
      r = this.order;
    } else if (t === "ingen") {
      r = this.parts.map((l, i) => i);
    } else {
      const l = new Array(this.order.length);
      for (let i = 0; i < this.order.length; i++) {
        l[this.order[i]] = i;
      }
      r = l.map((i, o) => i === void 0 ? o : i);
    }
    return r.map((l) => {
      const i = this.parts[l];
      return !i || !i.visible || i.alpha <= 0 || i.scaleX <= 0 || i.scaleY <= 0 ? null : { part: l, sprite: i.sprite, x: (n ? -i.x : i.x) * POSITION_SCALE, y: i.y * POSITION_SCALE, rot: n ? 1 - i.rot : i.rot, flip: n ? !i.flip : i.flip, alpha: i.alpha / 255, scaleX: i.scaleX / SCALE_ONE, scaleY: i.scaleY / SCALE_ONE };
    }).filter(Boolean);
  }
}
