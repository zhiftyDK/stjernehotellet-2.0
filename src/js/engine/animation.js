// Keyframe animation player for the game's original (Flash-like) sprite animations.
//
// An animation (from the data manifests) has `parts` (sprite layers), a `duration` in clock units,
// optional looping (`loop`, `loopFrom`) and a time-sorted list of `instructions`. Each instruction
// changes one property of one part, either instantly (curve 15) or by interpolating from v0 to v1
// between times t0 and t1. The player is advanced with advance(ticks) and drawList() returns the
// visible parts (sprite id, position, rotation, ...) ready for the renderer.

// Raw positions are fixed-point; multiply by this (= 1/81.92) to get pixels.
const POSITION_SCALE = 0.0122070312;
// Raw scale value that means 100% (fixed-point 4096 = 1.0).
const SCALE_ONE = 4096;
// Raw rotation units for one full turn (rotation is stored as a fraction of a turn).
const ROTATION_UNITS_PER_TURN = 14400;
// Property ids used by animation instructions (the `prop` field).
const ANIM_PROP = { SPRITE: 0, X: 1, Y: 2, SCALE: 3, ROT: 4, FLIP: 5, VISIBLE: 6, ZORDER: 7, ALPHA: 8, SCALE_X: 9, SCALE_Y: 10, ROT2: 11 };
// Notes: instruction curve 15 means "set immediately, no interpolation"; the animation clock
// advances once per 10 ticks (clock = floor(ticks / 10)).

// Value at time `elapsed` of an interpolation from `from` to `to` lasting `duration`.
// curve: 0 linear, 1 ease-in (cosine), 2 ease-out (sine), 3 ease-in-out, 4 ease-in (alternative sine form).
function interpolate(curve, from, to, elapsed, duration) {
  if (duration <= 0 || elapsed >= duration) {
    return to;
  }
  if (elapsed <= 0) {
    return from;
  }
  const progress = elapsed / duration, delta = to - from;
  switch (curve) {
    case 0:
      return from + delta * progress;
    case 1:
      return from + delta * (1 - Math.cos(progress * Math.PI / 2));
    case 2:
      return from + delta * Math.sin(progress * Math.PI / 2);
    case 3:
      return from + delta * (0.5 - Math.cos(progress * Math.PI) / 2);
    case 4:
      return from + delta * (1 - Math.sin((1 - progress) * Math.PI / 2));
    default:
      return from + delta * progress;
  }
}
// Initial state of one animation part (layer): no sprite, origin, 100% scale, visible, opaque.
function createAnimPart() {
  return { sprite: 0, x: 0, y: 0, scaleX: SCALE_ONE, scaleY: SCALE_ONE, rot: 0, flip: false, visible: true, alpha: 255 };
}
// Plays one animation. Public state: `finished`, `parts`, `order` (draw order of part indices).
export class AnimationPlayer {
  constructor(anim) {
    this.anim = anim;
    this.instructions = [...anim.instructions];
    this.reset();
  }
  // Restart from the beginning with fresh parts.
  reset() {
    const partCount = Math.max(1, this.anim.parts);
    this.ticks = 0; // elapsed time in ticks
    this.clock = 0; // elapsed time in animation clock units
    this.cursor = 0; // index of the next instruction to start
    this.parts = Array.from({ length: partCount }, createAnimPart);
    this.order = this.parts.map((_part, index) => index);
    this.active = []; // interpolating instructions that have started but not yet ended
    this.finished = false;
  }
  // Apply a (raw, fixed-point) property value to a part. Part ids 254/255 are special markers and ignored.
  setProp(partIndex, prop, value) {
    if (partIndex === 255 || partIndex === 254) {
      return;
    }
    const part = this.parts[partIndex];
    if (part) {
      switch (prop) {
        case ANIM_PROP.SPRITE:
          part.sprite = value & 65535;
          break;
        case ANIM_PROP.X:
          part.x = value;
          break;
        case ANIM_PROP.Y:
          part.y = value;
          break;
        case ANIM_PROP.SCALE:
          part.scaleX = value & 65535;
          part.scaleY = value & 65535;
          break;
        case ANIM_PROP.ROT:
          part.rot = value / ROTATION_UNITS_PER_TURN;
          break;
        case ANIM_PROP.FLIP:
          part.flip = value === 1;
          break;
        case ANIM_PROP.VISIBLE:
          part.visible = value === 1;
          break;
        case ANIM_PROP.ZORDER:
          this.reorder(partIndex, value);
          break;
        case ANIM_PROP.ALPHA:
          part.alpha = value;
          break;
        case ANIM_PROP.SCALE_X:
          part.scaleX = value & 65535;
          break;
        case ANIM_PROP.SCALE_Y:
          part.scaleY = value & 65535;
          break;
        case ANIM_PROP.ROT2:
          part.rot = value / ROTATION_UNITS_PER_TURN;
          break;
      }
    }
  }
  // Move a part `offset` slots up/down in the draw order (z-order change); out-of-range moves are ignored.
  reorder(partIndex, offset) {
    let fromSlot = this.order.indexOf(partIndex);
    if (fromSlot < 0) {
      fromSlot = 0;
    }
    const toSlot = fromSlot + offset;
    if (!(toSlot < 0 || toSlot >= this.order.length)) {
      if (offset < 0) {
        for (let slot = fromSlot; slot > toSlot; slot--) {
          this.order[slot] = this.order[slot - 1];
        }
      }
      if (offset > 0) {
        for (let slot = fromSlot; slot < toSlot; slot++) {
          this.order[slot] = this.order[slot + 1];
        }
      }
      this.order[toSlot] = partIndex;
    }
  }
  // Execute one instruction at the current clock. Returns true while it is still interpolating
  // (and must be run again next advance), false when it is finished.
  run(instruction) {
    if (instruction.curve === 15 /* set immediately */) {
      let scaledValue = instruction.v;
      if (instruction.prop === ANIM_PROP.ROT) {
        scaledValue *= 40; // rotation is authored in 1/40 units
      }
      this.setProp(instruction.target, instruction.prop, scaledValue);
      return false;
    }
    let fromValue = instruction.v0, toValue = instruction.v1;
    if (instruction.prop === ANIM_PROP.ROT) {
      fromValue *= 40;
      toValue *= 40;
    }
    if (instruction.prop === ANIM_PROP.SCALE || instruction.prop === ANIM_PROP.SCALE_X || instruction.prop === ANIM_PROP.SCALE_Y) {
      fromValue &= 65535;
      toValue &= 65535;
    }
    this.setProp(instruction.target, instruction.prop, interpolate(instruction.curve, fromValue, toValue, this.clock - instruction.t0, instruction.t1 - instruction.t0));
    return this.clock < instruction.t1;
  }
  // Advance by `deltaTicks`, handling looping/finishing and starting/updating instructions.
  advance(deltaTicks) {
    if (!this.finished) {
      if (this.ticks += deltaTicks, this.clock = Math.floor(this.ticks / 10), this.clock >= this.anim.duration) {
        if (this.anim.loop) {
          const loopEndTicks = this.anim.duration * 10;
          const loopStartTicks = this.anim.loopFrom * 10;
          const loopLengthTicks = Math.max(1, loopEndTicks - loopStartTicks);
          // Wrap back into the loop section [loopFrom, duration).
          const wrappedTicks = (this.ticks - loopEndTicks) % loopLengthTicks + loopStartTicks;
          this.reset();
          this.ticks = wrappedTicks;
          this.clock = Math.floor(wrappedTicks / 10);
        } else {
          this.clock = this.anim.duration;
          this.finished = true;
        }
      }
      for (this.active = this.active.filter((activeInstruction) => this.run(activeInstruction)); this.cursor < this.instructions.length && this.clock >= this.instructions[this.cursor].t0;) {
        const next = this.instructions[this.cursor];
        if (this.run(next)) {
          this.active.push(next);
        }
        this.cursor++;
      }
    }
  }
  // Visible parts in draw order, each as { part, sprite, x, y, rot, flip, alpha, scaleX, scaleY }
  // (positions in px, scale 1 = 100%, alpha 0..1, rot in turns).
  //   mode "invers" (default): order is interpreted as a z-index per part (inverse permutation)
  //   mode "direkte": order lists part indices back-to-front; "ingen": plain part index order
  //   mirrored: flip the whole animation horizontally
  drawList(mode = "invers", mirrored = false) {
    let partOrder;
    if (mode === "direkte") {
      partOrder = this.order;
    } else if (mode === "ingen") {
      partOrder = this.parts.map((_part, index) => index);
    } else {
      const inverse = new Array(this.order.length);
      for (let slot = 0; slot < this.order.length; slot++) {
        inverse[this.order[slot]] = slot;
      }
      partOrder = inverse.map((position, index) => position === void 0 ? index : position);
    }
    return partOrder.map((partIndex) => {
      const part = this.parts[partIndex];
      return !part || !part.visible || part.alpha <= 0 || part.scaleX <= 0 || part.scaleY <= 0 ? null : { part: partIndex, sprite: part.sprite, x: (mirrored ? -part.x : part.x) * POSITION_SCALE, y: part.y * POSITION_SCALE, rot: mirrored ? 1 - part.rot : part.rot, flip: mirrored ? !part.flip : part.flip, alpha: part.alpha / 255, scaleX: part.scaleX / SCALE_ONE, scaleY: part.scaleY / SCALE_ONE };
    }).filter(Boolean);
  }
}
