// Small value-animation helpers used by the UI and the hotel scene.
// Both classes are stepped once per game frame via `trin()` ("step").
// Property names (v, fra, maal, f, n, fart, maks, deler, bevaeger) are used by other modules; keep them.

// Duration of one logic frame in milliseconds (the game logic runs at 30 fps).
export const FRAME_MS = 1e3 / 30;

// Smooth ease-in/ease-out curve: maps progress 0..1 to 0..1 (input is clamped to 0..1).
export const easeInOut = (progress) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, progress)));

// A number that glides from its current value to a new target over a fixed number of frames.
//   v        current value        fra  value the glide started from
//   maal     target value         f    frames elapsed in the current glide
//   n        glide length in frames
export class Tween {
  constructor(initialValue, frameCount) {
    this.n = frameCount;
    this.saet(initialValue);
  }
  // "set": jump to `value` immediately (no animation).
  saet(value) {
    this.v = value;
    this.fra = value;
    this.maal = value;
    this.f = this.n; // glide already finished
  }
  // "mod": start gliding towards `newTarget` (does nothing if it is already the target).
  mod(newTarget) {
    if (newTarget !== this.maal) {
      this.fra = this.v;
      this.maal = newTarget;
      this.f = 0;
    }
  }
  // Advance one frame.
  trin() {
    this.f++;
    this.v = this.f < this.n ? this.fra + (this.maal - this.fra) * easeInOut(this.f / this.n) : this.maal;
  }
  // "moving": true while a glide is still in progress.
  get bevaeger() {
    return this.f < this.n;
  }
}

// A number that chases a target with a speed that ramps up by 1 per frame, up to `maks`,
// and slows down as it gets close (speed never exceeds distance / deler).
//   v current value, maal target, fart current speed (units/frame),
//   maks max speed, deler braking divisor.
export class AcceleratingValue {
  constructor(initialValue, maxSpeed, divisor) {
    this.v = initialValue;
    this.maal = initialValue;
    this.fart = 0;
    this.maks = maxSpeed;
    this.deler = divisor;
  }
  // Jump to `value` and stop.
  saet(value) {
    this.v = value;
    this.maal = value;
    this.fart = 0;
  }
  // Advance one frame.
  trin() {
    const distance = Math.abs(this.maal - this.v);
    if (distance < 1 / 65536) {
      // Close enough: stop.
      this.fart = 0;
      return;
    }
    if (this.fart < this.maks) {
      this.fart += 1;
    }
    const step = Math.min(distance / this.deler, this.maks, this.fart);
    this.fart = step;
    this.v += Math.sign(this.maal - this.v) * step;
  }
  // True while more than one unit away from the target.
  get bevaeger() {
    return Math.abs(this.maal - this.v) > 1;
  }
}
