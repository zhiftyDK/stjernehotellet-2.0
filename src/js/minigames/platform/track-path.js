// Platform minigame: TrackPath, a polyline that entities can walk on.
//
// A path is a list of points; the player and enemies stand on the segments between them.
// Moving platforms translate their path every step (dx/dy record the last movement so riders follow).
import { fromFixed } from './constants.js';

// A walkable polyline (property `is` = icy surface, `aktiv` = solid, `staar` = something stands on it). Points x/y, per-point slope (cx, cy) and segment lengths (len) come from the level data.
// The first and last segment are extended by the walker's half width so the edges can be stood on.
export class TrackPath {
  constructor(pathData, isIcy) {
    this.x = pathData.punkter.map((point) => fromFixed(point[0]));
    this.y = pathData.punkter.map((point) => fromFixed(point[1]));
    this.cx = pathData.ctrl.map((point) => fromFixed(point[0]));
    this.cy = pathData.ctrl.map((point) => fromFixed(point[1]));
    this.len = pathData.v.map(fromFixed);
    this.n = this.len.length;
    this.is = !!isIcy; // true for slippery (ice) paths
    this.aktiv = true;
    this.staar = false;
    this.dx = 0;
    this.dy = 0;
  }
  flyt(dx, dy) {
    for (let i = 0; i < this.x.length; i++) {
      this.x[i] += dx;
      this.y[i] += dy;
    }
    this.dx += dx;
    this.dy += dy;
  }
  pos(segment, distance, halfWidth) {
    const pointCount = this.n;
    return segment <= 0 ? [this.x[1] - halfWidth + distance, this.y[1]] : segment >= pointCount - 1 ? [this.x[pointCount - 1] + distance, this.y[pointCount - 1]] : [this.x[segment] + distance * this.cx[segment], this.y[segment] + distance * this.cy[segment]];
  }
  ender(segment, halfWidth) {
    const pointCount = this.n;
    return segment === 0 ? [this.x[1] - halfWidth, this.y[1], this.x[1], this.y[1]] : segment === pointCount - 1 ? [this.x[pointCount - 1], this.y[pointCount - 1], this.x[pointCount - 1] + halfWidth, this.y[pointCount - 1]] : [this.x[segment], this.y[segment], this.x[segment + 1], this.y[segment + 1]];
  }
}
