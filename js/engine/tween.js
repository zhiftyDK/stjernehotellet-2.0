export const FRAME_MS = 1e3 / 30, easeInOut = (e) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, e)));
export class Tween {
  constructor(t, n) {
    this.n = n;
    this.saet(t);
  }
  saet(t) {
    this.v = t;
    this.fra = t;
    this.maal = t;
    this.f = this.n;
  }
  mod(t) {
    if (t !== this.maal) {
      this.fra = this.v;
      this.maal = t;
      this.f = 0;
    }
  }
  trin() {
    this.f++;
    this.v = this.f < this.n ? this.fra + (this.maal - this.fra) * easeInOut(this.f / this.n) : this.maal;
  }
  get bevaeger() {
    return this.f < this.n;
  }
}
export class AcceleratingValue {
  constructor(t, n, r) {
    this.v = t;
    this.maal = t;
    this.fart = 0;
    this.maks = n;
    this.deler = r;
  }
  saet(t) {
    this.v = t;
    this.maal = t;
    this.fart = 0;
  }
  trin() {
    const t = Math.abs(this.maal - this.v);
    if (t < 1 / 65536) {
      this.fart = 0;
      return;
    }
    if (this.fart < this.maks) {
      this.fart += 1;
    }
    const n = Math.min(t / this.deler, this.maks, this.fart);
    this.fart = n;
    this.v += Math.sign(this.maal - this.v) * n;
  }
  get bevaeger() {
    return Math.abs(this.maal - this.v) > 1;
  }
}
