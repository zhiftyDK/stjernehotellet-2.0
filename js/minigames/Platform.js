import React from 'react';
import * as $ from 'react/jsx-runtime';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { rd as rd_, yk as yk_ } from '../loaders/data-loaders.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
const k = 34, X = 960, C = 640, J = 4, M = 16, U = X / J, N = C / J, F = -4, I = 1 / 65536, x = (c) => c / 65536, L = (c) => x(c * k / 33), st = (c, t, s, e, i, a, n, h, o, r) => ({ acc: L(c), vmax: L(t), glid: L(s), bremse: L(e), isAcc: L(i), isFrik: a / 65536, hop: L(n), hold: h, tyngde: x(67878 * k >> 6), maxFald: x(424288), hb: x(o) / 2, h: x(r) }), Et = new Array(20).fill(0);
function pt(c) {
  return [0, 1, 2, 3].map((t) => t === 0 || c > 11 || Et[c] > t - 1);
}
const ot = [st(23e3, 220840, 163e3, 4e4, 13e3, 64e3, -36e4, 266, 655360, 2031616), st(23e3, 380144, 2e5, 35e3, 13e3, 64e3, -232144, 133, 786432, 983040), st(23e3, 133840, 1e5, 15e3, 13e3, 64e3, -524288, 266, 393216, 2031616), st(5e3, 130304, 95e3, 1e4, 3e3, 64500, -2e5, 100, 1048576, 2031616)];
let d = ot[0];
const et = x(35e3), rt = x(424288), z = L(5e4), Rt = [{ 0: 12805, 1: 12802, 2: 12802, 3: 12803, 4: 12804, 5: 12807, 6: 12806, 7: 12809, 8: 12808, 9: 12810 }, { 0: 12813, 1: 12811, 2: 12811, 3: 12815, 4: 12812, 5: 12817, 6: 12816, 7: 12814, 8: 12808, 9: 12810 }, { 0: 12820, 1: 12818, 2: 12818, 3: 12824, 4: 12819, 5: 12823, 6: 12822, 7: 12821, 8: 12808, 9: 12810 }, { 0: 12828, 1: 12826, 2: 12826, 3: 12831, 4: 12827, 5: 12830, 6: 12832, 7: 12829, 8: 12808, 9: 12810 }], Dt = new Set([5, 7, 8, 9]), yt = [300, 301, 302, 303, 304].map((c) => c - 4), Ft = [392, 393, 394, 395, 390, 391].map((c) => c + F), Ht = 396 + F, mt = [358, 359, 360, 361, 362, 363, 364, 365, 366, 367].map((c) => c + F), B = { gaaerDoed: 281 + F, hopperDoed: 282 + F, hopperFald: 283 + F, kaster: [285, 286, 287].map((c) => c + F), skud: 288 + F, popper: [291, 292, 293].map((c) => c + F), pig: { 0: 294 + F, 1: 295 + F, 2: 297 + F, 3: 296 + F } }, jt = (c, t) => c * c * (3 - 2 * c) * t, nt = (c, t, s) => c < t ? t : c > s ? s : c, lt = (c, t, s, e, i, a, n, h) => t >= i && c <= a && e >= n && s <= h;
class Mt {
  constructor(t, s) {
    this.x = t.punkter.map((e) => x(e[0]));
    this.y = t.punkter.map((e) => x(e[1]));
    this.cx = t.ctrl.map((e) => x(e[0]));
    this.cy = t.ctrl.map((e) => x(e[1]));
    this.len = t.v.map(x);
    this.n = this.len.length;
    this.is = !!s;
    this.aktiv = true;
    this.staar = false;
    this.dx = 0;
    this.dy = 0;
  }
  flyt(t, s) {
    for (let e = 0; e < this.x.length; e++) {
      this.x[e] += t;
      this.y[e] += s;
    }
    this.dx += t;
    this.dy += s;
  }
  pos(t, s, e) {
    const i = this.n;
    return t <= 0 ? [this.x[1] - e + s, this.y[1]] : t >= i - 1 ? [this.x[i - 1] + s, this.y[i - 1]] : [this.x[t] + s * this.cx[t], this.y[t] + s * this.cy[t]];
  }
  ender(t, s) {
    const e = this.n;
    return t === 0 ? [this.x[1] - s, this.y[1], this.x[1], this.y[1]] : t === e - 1 ? [this.x[e - 1], this.y[e - 1], this.x[e - 1] + s, this.y[e - 1]] : [this.x[t], this.y[t], this.x[t + 1], this.y[t + 1]];
  }
}
function w(c, t) {
  const s = c.get(t);
  if (!s) {
    return null;
  }
  const e = new Xe_(s);
  e.advance(0);
  return e;
}
let Kt = class {
  constructor(t, s) {
    var o, r;
    this.sti = new Mt(t.sti, t.flag);
    this.e = t.a;
    this.f = 1;
    const e = t.ekstra || [];
    if (this.bev = null, t.type === 1) {
      this.bev = { art: "linje", rx: x(e[0]), ry: x(e[1]), afst: x(e[2]), fart: L(e[3]), c: 0, frem: true, e: 0, aktiv: !t.flag2 };
    } else if (t.type === 2) {
      const l = x(e[3]);
      this.bev = { art: "cirkel", cx: x(e[0]), cy: x(e[1]), r: x(e[2]), v: l, fart: L(e[4] * e[5]), aktiv: !t.flag2 };
      this.bev.px = this.bev.cx + this.bev.r * Math.cos(l);
      this.bev.py = this.bev.cy + this.bev.r * Math.sin(l);
    }
    const i = t.ekstra2 || [];
    this.timer = null;
    if (t.type2 === 1) {
      this.timer = { art: "blink", vent: i[0], fade: i[1], vaek: i[2], fase: 0, t: i[0] };
    } else if (t.type2 === 2) {
      this.timer = { art: "smuldre", fart: L(i[0]), pause: 0 };
    }
    const a = this.e + 2, n = (l, u) => Math.random() < 0.5 ? l : u, h = () => 2 + Math.floor(Math.random() * 4);
    if (((o = this.timer) == null ? void 0 : o.art) === "smuldre") {
      const l = [12875, 12878, 12881][this.e] ?? 12875;
      this.vis = { art: "k", tilst: 0, a: w(s, l), b: w(s, l + 1), c: w(s, l + 2) };
    } else if (((r = this.timer) == null ? void 0 : r.art) === "blink") {
      this.vis = { art: "l", a: w(s, [12872, 12873, 12874][this.e] ?? 12872) };
    } else if (this.bev) {
      const l = this.sti.is ? [0, ...Array.from({ length: a - 2 }, h), 1] : null;
      this.vis = { art: "m", antal: a, a: w(s, 12870), b: w(s, 12871), is: l };
    } else {
      const l = [n(0, 2), ...Array.from({ length: a - 2 }, () => n(4, 5)), n(1, 3)], u = this.sti.is ? [0, ...Array.from({ length: a - 2 }, h), 1] : null;
      this.vis = { art: "n", st: l, is: u };
    }
  }
  step() {
    var a, n, h, o;
    const t = this.sti, s = this.bev;
    if (s) {
      if (!s.aktiv) {
        if (t.staar) {
          s.aktiv = true;
        }
      } else if (s.art === "linje") {
        if (s.frem) {
          s.c += s.fart;
          if (s.c > 1) {
            s.c = 1;
            s.frem = false;
          }
        } else {
          s.c -= s.fart;
          if (s.c < 0) {
            s.c = 0;
            s.frem = true;
          }
        }
        const r = jt(s.c, s.afst);
        t.flyt(s.rx * (r - s.e), s.ry * (r - s.e));
        s.e = r;
      } else {
        s.v += s.fart;
        if (s.v > Math.PI * 2) {
          s.v -= Math.PI * 2;
        }
        const r = s.cx + s.r * Math.cos(s.v), l = s.cy + s.r * Math.sin(s.v);
        t.flyt(r - s.px, l - s.py);
        s.px = r;
        s.py = l;
      }
    }
    const e = this.timer;
    if ((e == null ? void 0 : e.art) === "smuldre") {
      if (this.f <= 0) {
        e.pause -= k;
        if (e.pause <= 0) {
          this.f = 1;
          t.aktiv = true;
        }
      } else if (t.staar) {
        this.f -= e.fart;
        if (this.f <= 0) {
          this.f = 0;
          t.aktiv = false;
          e.pause = 2e3;
        }
      }
    } else if ((e == null ? void 0 : e.art) === "blink") {
      e.t -= k;
      if (e.fase === 0) {
        this.f = 1;
        if (e.t <= 0) {
          e.fase = 1;
          e.t = e.fade;
        }
      } else if (e.fase === 1) {
        this.f = Math.max(0, e.t / e.fade);
        if (e.t <= 0) {
          e.fase = 2;
          e.t = e.vaek;
          t.aktiv = false;
          this.f = 0;
        }
      } else if (e.fase === 2) {
        this.f = 0;
        if (e.t <= 0) {
          e.fase = 3;
          e.t = e.fade;
          t.aktiv = true;
        }
      } else {
        this.f = 1 - Math.max(0, e.t / e.fade);
        if (e.t <= 0) {
          e.fase = 0;
          e.t = e.vent;
        }
      }
    }
    const i = this.vis;
    if (i.art === "k") {
      if (i.tilst <= 1) {
        i.tilst = t.staar ? 1 : 0;
        if (i.tilst === 1) {
          if ((a = i.b) != null) {
            a.advance(k);
          }
        }
        if (this.f <= 0) {
          i.tilst = 2;
        }
      } else if (i.tilst === 2) {
        if ((n = i.c) != null) {
          n.advance(k);
        }
        if (!i.c || i.c.finished) {
          i.tilst = 3;
        }
      } else if (this.f > 0) {
        for (const r of [i.a, i.b, i.c]) {
          if (r) {
            r.reset();
            r.advance(0);
          }
        }
        i.tilst = 0;
      }
    } else if (i.art === "m") {
      if ((h = i.a) != null) {
        h.advance(k);
      }
      if ((o = i.b) != null) {
        o.advance(k);
      }
    }
  }
  tegn(t, s, e) {
    const i = this.sti, a = i.x[1], n = i.y[1], h = this.vis;
    if (h.art === "n") {
      h.st.forEach((o, r) => {
        t.push({ sprite: Ft[o], x: s(a + 16 * r + 8), y: e(n) });
        if (h.is) {
          t.push({ sprite: mt[h.is[r]], x: s(a + 16 * r + 8), y: e(n) });
        }
      });
    } else if (h.art === "m") {
      if (h.a) {
        t.push({ anim: h.a, x: s(a + 8), y: e(n + 8) });
      }
      for (let o = 1; o < h.antal - 1; o++) {
        t.push({ sprite: Ht, x: s(a + 8 + 16 * o), y: e(n) });
      }
      if (h.b) {
        t.push({ anim: h.b, x: s(a + 8 + 16 * (h.antal - 1)), y: e(n + 8) });
      }
      if (h.is) {
        h.is.forEach((o, r) => t.push({ sprite: mt[o], x: s(a + 8 + 16 * r), y: e(n) }));
      }
    } else if (h.art === "k") {
      const o = h.tilst === 0 ? h.a : h.tilst === 1 ? h.b : h.c;
      if (o) {
        t.push({ anim: o, x: s(a), y: e(n) });
      }
    } else if (h.art === "l" && h.a) {
      t.push({ anim: h.a, x: s(a), y: e(n), alpha: (this.f * 225 + 30) / 255 });
    }
  }
};
const W = 0, Q = 1, tt = 2, K = 3, _ = 4;
class It {
  constructor(t, s, e) {
    this.bane = t;
    this.anims = s;
    this.baggrund = e;
    this.W = t.bredde;
    this.H = t.hoejde;
    this.Wu = this.W * M;
    this.Hu = this.H * M;
    this.stier = t.stier.map((a) => new Mt(a, a.loop));
    this.platforme = t.bevaegelige.map((a) => new Kt(a, s));
    for (const a of this.platforme) {
      this.stier.push(a.sti);
    }
    this.mynter = t.lister.g2.map(([a, n]) => ({ x: x(a), y: x(n), taget: false }));
    this.mynterIalt = this.mynter.length;
    this.mynterTaget = 0;
    this.maal = { x: x(t.maal[0]), y: x(t.maal[1]) };
    this.fast = [];
    const i = (a, n) => {
      for (const h of a) {
        this.fast.push({ x: x(h[0]), y: x(h[1]), id: n });
      }
    };
    i(t.lister.g1, 12859);
    i(t.lister.f, 12863);
    i(t.lister.h, 12891);
    i(t.lister.d, 12856);
    i(t.lister.e, 12865);
    this.delte = new Map();
    for (const a of [12861, 12869, ...new Set(this.fast.map((n) => n.id))]) {
      const n = w(s, a);
      if (n) {
        this.delte.set(a, n);
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
  vis(t, s = false) {
    const e = this.fig;
    if (!e.laast || s) {
      e.venter = -1;
      this.visStart(t);
    } else {
      e.venter = t;
    }
  }
  visStart(t) {
    const s = this.fig;
    s.tilst = t;
    s.anim = w(this.anims, Rt[this.kostume || 0][t]);
    s.hoejre = this.kostume === 3 && (t === 1 || t === 2) ? w(this.anims, 12825) : null;
    s.laast = Dt.has(t);
  }
  visStep() {
    const t = this.fig;
    if (!t.anim) {
      return;
    }
    const s = t.tilst === 1 ? k * Math.abs(this.p.vx) / d.vmax : k;
    t.anim.advance(s);
    if (t.hoejre) {
      t.hoejre.advance(s);
    }
    if (t.laast && t.anim.finished) {
      t.laast = false;
      if (t.venter >= 0) {
        this.visStart(t.venter);
        t.venter = -1;
      }
    }
  }
  saet(t) {
    var e;
    if (this.tilst === _) {
      return;
    }
    if (this.tilst === K) {
      if (this.holdTid = d.hold, this.kostume === 3 && this.sti && t !== K && t !== _) {
        const { x: i, y: a } = this.p;
        for (const [n, h, o] of [[-2, -4, -5], [-1, -2, -4], [0, 0, -5], [1, 2, -4]]) {
          this.stoev(i + n, a, h, o);
        }
      }
      this.vis(5);
    }
    this.tilst = t;
    const s = this.p;
    switch (t) {
      case W:
        s.vx = 0;
        s.vy = 0;
        this.vis(0);
        break;
      case Q:
        s.vy = 0;
        this.paaIs = !!((e = this.sti) != null && e.is);
        this.glider = false;
        this.vis(this.paaIs ? 0 : 1);
        break;
      case tt:
        this.vis(6);
        s.vx = s.face === 0 ? -d.glid : d.glid;
        break;
      case K: {
        const i = this.sti;
        if (s.vy >= 0) {
          this.vis(4);
          this.stiger = false;
          this.kanHolde = false;
        } else {
          if (i) {
            s.vx += i.dx / 2;
            s.vy += i.dy < 0 ? i.dy / 2 : 0;
          }
          this.vis(3);
          this.stiger = true;
          this.kanHolde = true;
        }
        if (i) {
          i.staar = false;
        }
        this.sti = null;
        break;
      }
      case _:
        this.vis(4, true);
        if (this.sti) {
          this.sti.staar = false;
        }
        this.sti = null;
        break;
    }
  }
  stoev(t, s, e, i) {
    if (!(this.partikler.length >= 30)) {
      this.partikler.push({ x: t, y: s, vx: e, vy: i, tid: 0 });
    }
  }
  partikelStep() {
    for (const t of this.partikler) {
      t.tid += k;
      t.vy = Math.min(rt, t.vy + et);
      t.x += t.vx;
      t.y += t.vy;
    }
    this.partikler = this.partikler.filter((t) => Math.floor(t.tid / 66) < yt.length);
  }
  hop() {
    this.p.vy = d.hop;
    this.lyde.push(this.kostume ? `hop${this.kostume}` : "hop");
    this.saet(K);
  }
  startPaaNy() {
    const t = this.p;
    t.x = x(this.bane.start[0]);
    t.y = x(this.bane.start[1]);
    t.vx = 0;
    t.vy = 0;
    t.face = 1;
    this.tilst = -1;
    this.sti = null;
    this.holdTid = d.hold;
    this.doedTid = 0;
    this.helbred = 3;
    this.kostume = 0;
    d = ot[0];
    this.usaarlig = false;
    this.frys = false;
    this.blinkTid = 0;
    const s = this.land(t.x, t.y, 0, M);
    if (s) {
      this.saetPaaSti(s);
      this.tilst = W;
      t.vx = 0;
      t.vy = 0;
      this.vis(0, true);
    } else {
      this.tilst = K;
      this.stiger = false;
      this.vis(4, true);
    }
    const e = this.kam;
    e.x = t.x - BU / 2;
    e.y = t.y - N / 2;
    e.f = 0;
    e.j = 1;
    e.g = 1;
    this.kamera();
  }
  skiftKostume(t, s = false) {
    if (t === this.kostume || this.tilst === _ || this.tilstand !== "spiller") {
      return false;
    }
    if (!s && this.aabne && !this.aabne[t]) {
      this.lyde.push("nej");
      return false;
    }
    const e = ot[t], i = this.p;
    if (!s && (this.massiv(i.x, i.y - e.h) || this.massiv(i.x - e.hb, i.y - e.h) || this.massiv(i.x + e.hb, i.y - e.h))) {
      this.lyde.push("nej");
      return false;
    }
    this.kostume = t;
    d = e;
    i.vx = Math.max(-d.vmax, Math.min(d.vmax, i.vx));
    this.lyde.push("forvandl");
    const a = this.fig.tilst;
    this.fig.laast = false;
    this.visStart(a < 0 ? 0 : a);
    return true;
  }
  saetPaaSti(t) {
    this.sti = t.sti;
    this.seg = t.seg;
    this.dist = t.dist;
    t.sti.staar = true;
    const [s, e] = t.sti.pos(t.seg, t.dist, d.hb);
    this.p.x = s;
    this.p.y = e;
  }
  land(t, s, e, i, a = d.hb) {
    for (const n of this.stier) {
      if (!n.aktiv) {
        continue;
      }
      const h = t + e - n.dx, o = s + i - n.dy;
      for (let r = 0; r < n.n; r++) {
        const [l, u, v, m] = n.ender(r, a), f = v - l, p = m - u;
        if (f <= 0) {
          continue;
        }
        const y = (t - l) * p - (s - u) * f, b = (h - l) * p - (o - u) * f;
        if (!(y >= 0 && b < 0)) {
          continue;
        }
        const P = y / (y - b), O = t + (h - t) * P, g = s + (o - s) * P, j = ((O - l) * f + (g - u) * p) / (f * f + p * p);
        if (!(j < 0 || j > 1)) {
          return { sti: n, seg: r, dist: j * Math.hypot(f, p) };
        }
      }
    }
    return null;
  }
  massiv(t, s) {
    const e = Math.floor(t / M), i = Math.floor(s / M);
    return e < 0 || i < 0 || e >= this.W || i >= this.H ? null : this.bane.fast[i][e] === "1" ? { l: e * M, r: (e + 1) * M, t: i * M, b: (i + 1) * M } : null;
  }
  jord(t) {
    const s = this.p, e = t.venstre && !t.hoejre, i = t.hoejre && !t.venstre;
    if (this.tilst === W) {
      if (t.hopTrykket) {
        this.hop();
        return;
      }
      if (e) {
        s.face = 0;
        this.saet(Q);
      } else if (i) {
        s.face = 1;
        this.saet(Q);
      }
      return;
    }
    if (this.tilst === tt) {
      if (s.vx > 0) {
        s.vx -= d.bremse;
        if (s.vx <= 0) {
          s.vx = 0;
          this.saet(W);
        }
      } else {
        s.vx += d.bremse;
        if (s.vx >= 0) {
          s.vx = 0;
          this.saet(W);
        }
      }
      if (t.hopTrykket) {
        this.hop();
      }
      return;
    }
    if (this.paaIs) {
      if (e || i) {
        if (!this.glider) {
          this.vis(2);
        }
        this.glider = true;
        if (s.face === 0) {
          if (e) {
            if (s.vx > -d.vmax) {
              s.vx -= d.isAcc;
            }
          } else {
            s.face = 1;
          }
        } else if (i) {
          if (s.vx < d.vmax) {
            s.vx += d.isAcc;
          }
        } else {
          s.face = 0;
        }
      } else {
        s.vx *= d.isFrik;
        if (this.glider) {
          this.vis(0);
        }
        this.glider = false;
      }
    } else if (e || i) {
      if (s.face === 0) {
        if (e) {
          if (s.vx > -d.vmax) {
            s.vx -= d.acc;
          }
        } else if (s.vx < -d.glid) {
          this.saet(tt);
        } else {
          s.face = 1;
          s.vx = 0;
        }
      } else if (i) {
        if (s.vx < d.vmax) {
          s.vx += d.acc;
        }
      } else if (s.vx > d.glid) {
        this.saet(tt);
      } else {
        s.face = 0;
        s.vx = 0;
      }
    } else if (s.vx > 0) {
      s.vx -= d.acc;
      if (s.vx <= 0) {
        s.vx = 0;
        this.saet(W);
      }
    } else {
      s.vx += d.acc;
      if (s.vx >= 0) {
        s.vx = 0;
        this.saet(W);
      }
    }
    if (t.hopTrykket && this.tilst !== K) {
      this.hop();
    }
  }
  luft(t) {
    const s = this.p, e = t.venstre && !t.hoejre, i = t.hoejre && !t.venstre;
    if (e) {
      if (s.vx > -d.vmax) {
        s.vx -= d.acc;
      }
      s.face = 0;
    } else if (i) {
      if (s.vx < d.vmax) {
        s.vx += d.acc;
      }
      s.face = 1;
    } else if (s.vx > 0) {
      s.vx = Math.max(0, s.vx - d.acc);
    } else if (s.vx < 0) {
      s.vx = Math.min(0, s.vx + d.acc);
    }
    s.vx = nt(s.vx, -d.vmax, d.vmax);
    let a = true;
    if (this.stiger) {
      if ((t.hop || t.hopTrykket) && this.holdTid > 0 && this.kanHolde) {
        this.holdTid -= k;
        a = false;
      } else {
        this.kanHolde = false;
      }
      if (s.vy >= 0) {
        this.stiger = false;
        this.vis(4);
      }
    }
    if (a) {
      s.vy = Math.min(d.maxFald, s.vy + d.tyngde);
    }
    const n = this.land(s.x, s.y, s.vx, s.vy);
    if (n) {
      this.saetPaaSti(n);
      this.saet(s.vx === 0 ? W : Q);
      return;
    }
    let h = s.x + s.vx, o = s.y + s.vy;
    const r = d.hb;
    let l = this.massiv(h - r, o) || this.massiv(h - r, o - d.h / 2);
    if (l) {
      h = l.r + r + I;
      s.vx = 0;
    }
    l = this.massiv(h + r, o) || this.massiv(h + r, o - d.h / 2);
    if (l) {
      h = l.l - r - I;
      s.vx = 0;
    }
    if (this.stiger) {
      l = this.massiv(h + r, o - d.h) || this.massiv(h - r, o - d.h);
      if (l) {
        o = l.b + d.h + I;
        s.vy = 0;
      }
    }
    if (h - r < 0) {
      h = r;
      s.vx = 0;
    }
    if (h + r > this.Wu) {
      h = this.Wu - r;
      s.vx = 0;
    }
    s.x = h;
    s.y = o;
  }
  gaa() {
    const t = this.sti, s = this.p;
    if (!t) {
      return;
    }
    if (!t.aktiv) {
      this.saet(K);
      return;
    }
    const e = d.hb;
    let i = this.seg, a = this.dist + s.vx, n = false;
    if (i === 0) {
      if (a < 0) {
        n = true;
      } else if (a > e) {
        i = 1;
        a -= e;
      }
    } else if (i === t.n - 1) {
      if (a < 0) {
        i--;
        a += i === 0 ? e : t.len[i];
      } else if (a > e) {
        n = true;
      }
    } else if (a < 0) {
      i--;
      a += i === 0 ? e : t.len[i];
    } else if (a > t.len[i]) {
      i++;
      a -= t.len[i - 1];
    }
    const h = () => {
      [s.x, s.y] = t.pos(i, a, e);
    };
    h();
    let o = this.massiv(s.x - e, s.y - d.h / 2) || this.massiv(s.x - e, s.y - d.h);
    if (o) {
      a += o.r - (s.x - e);
      h();
      s.vx = 0;
    }
    o = this.massiv(s.x + e, s.y - d.h / 2) || this.massiv(s.x + e, s.y - d.h);
    if (o) {
      a -= s.x + e - o.l;
      h();
      s.vx = 0;
    }
    if (s.x - e < 0) {
      a += e - s.x;
      h();
      s.vx = 0;
    }
    if (s.x + e > this.Wu) {
      a -= s.x + e - this.Wu;
      h();
      s.vx = 0;
    }
    this.seg = i;
    this.dist = a;
    if (n) {
      this.saet(K);
    }
  }
  kamera() {
    var h, o;
    const t = this.kam, s = this.p, e = d.vmax / 2;
    let i = 1, a = 0;
    if (s.vx <= -e || (h = this.inp) != null && h.venstre) {
      i = 0;
      a = -50;
    } else if (s.vx >= e || (o = this.inp) != null && o.hoejre) {
      i = 2;
      a = 50;
    }
    if (i !== t.g) {
      t.h = t.f;
      t.i = a - t.h;
      t.j = 0;
      t.g = i;
    }
    if (t.j < 1) {
      t.j = Math.min(1, t.j + (k * 1745 >> 6) / 65536);
      t.f = t.h + jt(t.j, t.i);
    }
    const n = (1 - s.y / this.Hu) * (N / 4);
    t.x = nt(s.x - BU / 2 + t.f, 0, this.Wu - BU);
    t.y = nt(s.y - N / 2 * 1.5 + n, 0, this.Hu - N);
  }
  lavFjender() {
    const t = this.bane.fjender, s = (e, i, a, n) => ({ art: e, x: x(i[0]), y: x(i[1]), px: 0, py: 0, b: a, h: n, vx: 0, vy: 0, dir: 1, tilst: 0, t: 0, t2: 0, sti: null, seg: 0, dist: 0, vaek: false });
    this.fjender = [];
    for (const e of t.i1) {
      const i = s("gaaer", e, 15, 10);
      i.anim = w(this.anims, 12833);
      if (this.fjendePlant(i)) {
        i.tilst = "gaa";
        i.vx = z;
      } else {
        i.tilst = "fald";
      }
      this.fjender.push(i);
    }
    for (const e of t.i2) {
      const i = s("hopper", e, 15, 10);
      i.anims = { 1: w(this.anims, 12834), 2: w(this.anims, 12835), 3: w(this.anims, 12836), 4: w(this.anims, 12837) };
      this.saetHopper(i, this.fjendePlant(i) ? 1 : 0);
      this.fjender.push(i);
    }
    for (const e of t.i4) {
      const i = s("kaster", e, 15, 26);
      i.dir = e[2] ? 1 : 0;
      i.raekke = x(e[3]);
      i.skud = { aktiv: false, x: 0, y: 0, vx: 0, liv: 0 };
      i.lam = w(this.anims, 12839);
      i.vaagn = w(this.anims, 12840);
      this.saetKaster(i, "hvil");
      this.fjender.push(i);
    }
    for (const e of t.i6) {
      const i = s("popper", e, 32, 26);
      i.trak = w(this.anims, 12842);
      this.saetPopper(i, "hvil");
      this.fjender.push(i);
    }
    this.pigge = t.m.map((e) => ({ x: x(e[0]), y: x(e[1]), n: e[2], dir: e[3] }));
  }
  fjendePlant(t) {
    const s = this.land(t.x, t.y - 1, 0, M, t.b / 2);
    if (s) {
      this.fjendeSti(t, s);
      return true;
    }
    return false;
  }
  fjendeSti(t, s) {
    t.sti = s.sti;
    t.seg = s.seg;
    t.dist = s.dist;
    [t.x, t.y] = s.sti.pos(s.seg, s.dist, t.b / 2);
  }
  fjendeGaa(t) {
    const s = t.sti;
    if (!s || !s.aktiv) {
      return false;
    }
    const e = t.b / 2, i = s.n;
    let a = t.seg, n = t.dist + t.vx;
    if (a === 0) {
      if (n < 0) {
        return false;
      }
      if (n > e) {
        a = 1;
        n -= e;
      }
    } else if (a === i - 1) {
      if (n < 0) {
        a--;
        n += s.len[a];
      } else if (n > e) {
        return false;
      }
    } else if (n < 0) {
      a--;
      if (a !== 0) {
        n += s.len[a];
      } else {
        a++;
        t.vx = -t.vx;
        t.dir = 1;
      }
    } else if (n > s.len[a]) {
      a++;
      if (a === i - 1) {
        a--;
        t.vx = -t.vx;
        t.dir = 0;
      } else {
        n -= s.len[a - 1];
      }
    }
    let [h, o] = s.pos(a, n, e);
    const r = o - t.h + x(10);
    let l = this.massiv(h - e, r);
    if (l) {
      n += l.r - (h - e);
      [h, o] = s.pos(a, n, e);
      t.vx = -t.vx;
      t.dir = 1;
    }
    l = this.massiv(h + e, r);
    if (l) {
      n -= h + e - l.l;
      [h, o] = s.pos(a, n, e);
      t.vx = -t.vx;
      t.dir = 0;
    }
    t.seg = a;
    t.dist = n;
    t.x = h;
    t.y = o;
    return true;
  }
  fjendeFald(t) {
    t.vy = Math.min(rt, t.vy + et);
    const s = t.b / 2, e = this.land(t.x, t.y, t.vx, t.vy, s);
    if (e) {
      this.fjendeSti(t, e);
      t.vy = 0;
      return true;
    }
    let i = t.x + t.vx;
    const a = t.y + t.vy;
    let n = this.massiv(i - s, a) || this.massiv(i - s, a - t.h);
    if (n) {
      i = n.r + s;
      t.vx = 0;
    }
    n = this.massiv(i + s, a) || this.massiv(i + s, a - t.h);
    if (n) {
      i = n.l - s;
      t.vx = 0;
    }
    t.x = i;
    t.y = a;
    t.sti = null;
    return false;
  }
  fjendeDoedsfald(t) {
    t.vy = Math.min(rt, t.vy + et);
    t.y += t.vy;
    if (t.y - t.h > this.Hu) {
      t.vaek = true;
    }
  }
  saetHopper(t, s) {
    var i;
    t.tilst = s;
    if (s === 1) {
      t.vx = t.dir === 1 ? z : -z;
      t.vy = 0;
      t.t = 1500 + Math.random() * 1500;
    } else if (s === 2) {
      t.vx = 0;
      t.vy = 0;
      t.t = 1500;
    } else if (s === 3) {
      t.startY = t.y;
      this.lyde.push("fjendehop");
    } else if (s === 4) {
      t.t = 2e3;
    } else if (s === 5) {
      t.vx = 0;
      t.vy = x(-25e4);
    }
    const e = (i = t.anims) == null ? void 0 : i[s];
    if (e) {
      e.reset();
      e.advance(0);
    }
  }
  saetKaster(t, s) {
    if (t.tilst = s, s === "hvil") {
      t.vis = 0;
      t.t = 2300 + Math.random() * 50;
    } else if (s === "sigt") {
      t.vis = 1;
      t.t = 500;
      t.t2 = 500;
    } else if (s === "lammet") {
      t.t = 1e4;
      t.vaagner = false;
      for (const e of [t.lam, t.vaagn]) {
        if (e) {
          e.reset();
          e.advance(0);
        }
      }
    }
  }
  saetPopper(t, s) {
    t.tilst = s;
    t.farlig = false;
    if (s === "hvil") {
      t.vis = 0;
      t.t = 3e3 + Math.random() * 3e3;
    } else if (s === "op") {
      t.vis = 1;
      t.t = 1500;
      t.t2 = 2e3;
      t.trakker = false;
    } else if (s === "doed") {
      t.vis = 1;
      t.vy = x(-25e4);
    }
  }
  fjendeStep(t) {
    var s, e, i, a, n, h, o;
    if (t.px = t.x, t.py = t.y, t.art === "gaaer") {
      if (t.tilst === "gaa") {
        if (!this.fjendeGaa(t)) {
          t.tilst = "fald";
        }
        if ((s = t.anim) != null) {
          s.advance(k);
        }
      } else if (t.tilst === "fald") {
        if (this.fjendeFald(t)) {
          t.tilst = "gaa";
          t.vx = t.dir === 1 ? z : -z;
        }
        if ((e = t.anim) != null) {
          e.advance(k);
        }
      } else {
        this.fjendeDoedsfald(t);
      }
    } else if (t.art === "hopper") {
      const r = t.tilst;
      if (r === 1 || r === 2 || r === 4) {
        t.t -= k;
        if (r === 1 && t.t <= 0) {
          this.saetHopper(t, 2);
        } else if (r === 2 && t.t <= 0) {
          t.vy = x(-128e4 * k >> 6);
          this.saetHopper(t, 3);
        } else if (r === 4 && t.t <= 0) {
          this.saetHopper(t, 1);
        }
        if (t.tilst !== 3 && !this.fjendeGaa(t)) {
          this.saetHopper(t, 0);
        }
      } else if (r === 3) {
        if (t.vy += et, t.y += t.vy, t.y >= t.startY) {
          t.y = t.startY;
          t.vy = 0;
          this.saetHopper(t, 1);
        } else if (t.vy < 0) {
          const l = t.b / 2, u = this.massiv(t.x - l, t.y - t.h) || this.massiv(t.x + l, t.y - t.h);
          if (u) {
            t.y = u.b + t.h;
            t.vy = 0;
          }
        }
      } else if (r === 0) {
        if (this.fjendeFald(t)) {
          this.saetHopper(t, 1);
        }
      } else {
        this.fjendeDoedsfald(t);
      }
      if ((a = (i = t.anims) == null ? void 0 : i[t.tilst]) != null) {
        a.advance(k);
      }
    } else if (t.art === "kaster") {
      if (t.tilst === "hvil") {
        t.t -= k;
        if (t.t <= 0 && !t.skud.aktiv) {
          this.saetKaster(t, "sigt");
        }
      } else if (t.tilst === "sigt") {
        if (t.t > 0) {
          if (t.t -= k, t.t <= 0) {
            t.vis = 2;
            const r = t.skud;
            r.aktiv = true;
            r.x = t.x + (t.dir === 0 ? -8 : 8);
            r.y = t.y - x(1507328);
            r.vx = t.dir === 0 ? -2 : 2;
            r.liv = t.raekke / 2;
            this.lyde.push("skud");
          }
        } else {
          t.t2 -= k;
          if (t.t2 <= 0) {
            this.saetKaster(t, "hvil");
          }
        }
      } else if (t.tilst === "lammet") {
        if (t.vaagner) {
          if ((h = t.vaagn) != null) {
            h.advance(k);
          }
          if (!t.vaagn || t.vaagn.finished) {
            this.saetKaster(t, "hvil");
          }
        } else {
          if ((n = t.lam) != null) {
            n.advance(k);
          }
          t.t -= k;
          if (t.t <= 0) {
            t.vaagner = true;
          }
        }
      }
    } else if (t.art === "popper") {
      if (t.tilst === "hvil") {
        t.t -= k;
        if (t.t <= 0) {
          this.saetPopper(t, "op");
        }
      } else if (t.tilst === "op") {
        if (t.t > 0) {
          t.t -= k;
          if (t.t <= 0) {
            t.vis = 2;
            t.farlig = true;
            this.lyde.push("pigge");
          }
        } else if (t.t2 > 0) {
          t.t2 -= k;
          if (t.t2 <= 0) {
            t.trakker = true;
            t.farlig = false;
            if (t.trak) {
              t.trak.reset();
              t.trak.advance(0);
            }
          }
        } else {
          if ((o = t.trak) != null) {
            o.advance(k);
          }
          if (!t.trak || t.trak.finished) {
            this.saetPopper(t, "hvil");
          }
        }
      } else {
        this.fjendeDoedsfald(t);
      }
    }
  }
  fjendeAktiv(t) {
    return t.vaek ? false : t.art === "gaaer" ? t.tilst !== "doed" : t.art === "hopper" ? t.tilst !== 5 : t.art === "kaster" ? t.tilst !== "lammet" : t.tilst !== "doed";
  }
  tramp(t) {
    this.lyde.push("tramp");
    if (t.art === "gaaer") {
      t.tilst = "doed";
      t.vx = 0;
      t.vy = x(-257575);
    } else if (t.art === "hopper") {
      this.saetHopper(t, 5);
    } else if (t.art === "kaster") {
      this.saetKaster(t, "lammet");
    } else {
      this.saetPopper(t, "doed");
    }
  }
  kollision() {
    const t = this.p, s = t.x - d.hb, e = t.x + d.hb, i = t.y - d.h, a = t.y;
    let n = false, h = false, o = 1 / 0;
    for (const r of this.fjender) {
      if (!this.fjendeAktiv(r) || !this.naer(r.x, r.y)) {
        continue;
      }
      const l = r.x - r.b / 2, u = r.x + r.b / 2, v = r.y - r.h, m = r.y;
      if (!lt(s, e, i, a, l, u, v, m)) {
        continue;
      }
      if (this.forrigeY <= r.py - r.h + 1 && t.vy >= 0) {
        if (r.art === "popper" && r.farlig) {
          n = true;
        } else {
          this.tramp(r);
        }
        h = true;
        o = Math.min(o, v);
      } else {
        n = true;
      }
    }
    for (const r of this.fjender) {
      const l = r.skud;
      if (l != null && l.aktiv && lt(s, e, i, a, l.x - 2, l.x + 2, l.y - 2, l.y + 2)) {
        n = true;
        l.aktiv = false;
      }
    }
    for (const r of this.pigge) {
      const l = r.n * M;
      let u;
      if (r.dir === 0) {
        u = [r.x + I, r.x + l - I, r.y - 8, r.y];
      } else if (r.dir === 2) {
        u = [r.x + I, r.x + l - I, r.y - M, r.y - 8];
      } else {
        u = [r.x, r.x + 8, r.y - M + I, r.y + M * (r.n - 1) - I];
      }
      if (lt(s, e, i, a, u[0], u[1], u[2], u[3])) {
        n = true;
      }
    }
    if (h) {
      t.y = Math.min(t.y, o - I);
      t.vy = d.hop;
      this.saet(K);
    }
    if (n) {
      this.skade();
    }
  }
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
  doe() {
    this.lyde.push("doed");
    this.liv--;
    this.saet(_);
    this.doedTid = 1200;
  }
  naer(t, s) {
    const e = this.kam;
    return t >= e.x - 150 && t <= e.x + BU + 150 && s >= e.y - 100 && s <= e.y + N + 100;
  }
  step(t) {
    this.inp = t;
    for (const o of this.stier) {
      o.dx = 0;
      o.dy = 0;
    }
    for (const o of this.platforme) {
      o.step();
    }
    for (const o of this.delte.values()) {
      o.advance(k);
    }
    if (this.tilstand === "sejr" && (this.sejrTid -= k, this.sejrTid <= 0 && (this.tilstand = "vundet")), this.partikelStep(), this.tilstand !== "spiller") {
      this.visStep();
      return;
    }
    if (this.tid += k, this.tilst === _) {
      this.doedTid -= k;
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
    const s = this.p;
    this.forrigeY = s.y;
    if (this.frys) {
      if (!this.fig.laast) {
        this.frys = false;
        this.blinkTid = 2e3;
        this.vis(this.tilst === K ? 4 : this.tilst === tt ? 6 : this.tilst === Q && !this.paaIs ? 1 : 0, true);
      }
    } else {
      if (this.tilst === K) {
        this.luft(t);
      } else {
        this.jord(t);
      }
      if (this.tilst !== K && this.sti) {
        this.gaa();
      }
    }
    if (this.usaarlig && !this.frys) {
      this.blinkTid -= k;
      if (this.blinkTid <= 0) {
        this.usaarlig = false;
      }
    }
    for (const o of this.fjender) {
      const r = o.skud;
      if (r != null && r.aktiv) {
        r.x += r.vx;
        if (--r.liv <= 0) {
          r.aktiv = false;
        }
      }
      if (!o.vaek && this.naer(o.x, o.y)) {
        this.fjendeStep(o);
      }
    }
    if (s.y - d.h > this.Hu) {
      this.doe();
    } else {
      this.kollision();
    }
    const e = s.x - d.hb, i = s.x + d.hb, a = s.y - d.h, n = s.y;
    for (const o of this.mynter) {
      if (!o.taget) {
        if (i >= o.x - 7 && e <= o.x + 7 && n >= o.y - 7 && a <= o.y + 7) {
          o.taget = true;
          this.mynterTaget++;
          this.lyde.push("mynt");
        }
      }
    }
    const h = this.maal;
    if (this.tilst !== _ && this.tilst !== K && this.sti && i >= h.x - 20 && e <= h.x + 20 && n >= h.y - 80 && a <= h.y) {
      this.tilstand = "sejr";
      this.lyde.push("maal");
      s.vx = 0;
      s.vy = 0;
      this.usaarlig = false;
      this.vis(9, true);
      this.sejrTid = 3e3;
    }
    if (this.tilst !== _) {
      this.kamera();
    }
    this.visStep();
  }
  tegneliste() {
    var m;
    const t = [], s = this.kam, e = (f) => (f - s.x) * J, i = (f) => (f - s.y) * J;
    for (const [f, p] of [[this.baggrund.fjern, 0.25], [this.baggrund.naer, 0.5]]) {
      const y = f.layout, b = 256, P = y[0].length, O = s.x * J * p, j = C + (this.Hu - (s.y + N)) * J * p - y.length * b;
      for (let S = Math.floor(O / b) - 1; S * b - O < BX + b; S++) {
        for (let A = 0; A < y.length; A++) {
          const R = y[A][(S % P + P) % P];
          if (R) {
            t.push({ sprite: f.sprite + F + R - 1, x: S * b - O + b / 2, y: j + A * b });
          }
        }
      }
    }
    const a = Math.max(0, Math.floor(s.x / M) - 1), n = Math.min(this.W, Math.ceil((s.x + BU) / M) + 1), h = Math.max(0, Math.floor(s.y / M) - 1), o = Math.min(this.H, Math.ceil((s.y + N) / M) + 2);
    for (let f = h; f < o; f++) {
      const p = this.bane.materiale[f];
      for (let y = a; y < n; y++) {
        const b = p[y];
        if (b) {
          t.push({ sprite: 312 + F + b - 9, x: e(y * M + M / 2), y: i(f * M) });
        }
      }
    }
    const r = (f, p, y = 80) => f > s.x - y && f < s.x + BU + y && p > s.y - y && p < s.y + N + y;
    for (const f of this.platforme) {
      if (r(f.sti.x[1], f.sti.y[1], 160)) {
        f.tegn(t, e, i);
      }
    }
    for (const f of this.pigge) {
      for (let p = 0; p < f.n; p++) {
        const y = f.dir === 1 || f.dir === 3, b = f.x + (y ? 0 : M * p), P = f.y + (y ? M * p : 0);
        if (r(b, P)) {
          t.push({ sprite: B.pig[f.dir], x: e(b), y: i(P) });
        }
      }
    }
    for (const f of this.fast) {
      const p = this.delte.get(f.id);
      if (p && r(f.x, f.y)) {
        t.push({ anim: p, x: e(f.x), y: i(f.y) });
      }
    }
    const l = this.delte.get(12861);
    if (l) {
      for (const f of this.mynter) {
        if (!f.taget && r(f.x, f.y)) {
          t.push({ anim: l, x: e(f.x), y: i(f.y) });
        }
      }
    }
    const u = this.delte.get(12869);
    if (u) {
      t.push({ anim: u, x: e(this.maal.x), y: i(this.maal.y) });
    }
    for (const f of this.fjender) {
      if ((m = f.skud) != null && m.aktiv && t.push({ sprite: B.skud, x: e(f.skud.x), y: i(f.skud.y) }), f.vaek || !r(f.x, f.y)) {
        continue;
      }
      const p = e(f.x), y = i(f.y);
      if (f.art === "gaaer") {
        if (f.tilst === "doed") {
          t.push({ sprite: B.gaaerDoed, x: p, y });
        } else if (f.anim) {
          t.push({ anim: f.anim, x: p, y });
        }
      } else if (f.art === "hopper") {
        if (f.tilst === 0) {
          t.push({ sprite: B.hopperFald, x: p, y });
        } else if (f.tilst === 5) {
          t.push({ sprite: B.hopperDoed, x: p, y });
        } else if (f.anims[f.tilst]) {
          t.push({ anim: f.anims[f.tilst], x: p, y });
        }
      } else if (f.art === "kaster") {
        if (f.tilst === "lammet") {
          const b = f.vaagner ? f.vaagn : f.lam;
          if (b) {
            t.push({ anim: b, x: p, y, flip: f.dir === 0 });
          }
        } else {
          t.push({ sprite: B.kaster[f.vis], x: p, y, flip: f.dir !== 0 });
        }
      } else if (f.art === "popper") {
        if (f.tilst === "op" && f.trakker && f.trak) {
          t.push({ anim: f.trak, x: p, y });
        } else {
          t.push({ sprite: B.popper[f.vis], x: p, y });
        }
      }
    }
    const v = this.usaarlig && !this.frys && Math.floor(this.blinkTid / (this.blinkTid > 1e3 ? 120 : 60)) % 2 === 1;
    if (this.fig.anim && !v) {
      if (this.fig.hoejre) {
        t.push({ anim: this.p.face === 0 ? this.fig.anim : this.fig.hoejre, x: e(this.p.x), y: i(this.p.y), flip: false });
      } else {
        t.push({ anim: this.fig.anim, x: e(this.p.x), y: i(this.p.y), flip: this.p.face === 0 });
      }
    }
    for (const f of this.partikler) {
      t.push({ sprite: yt[Math.floor(f.tid / 66)], x: e(f.x), y: i(f.y) });
    }
    return t;
  }
}
const V = (c, t) => Math.floor(c * t / 65536);
function Lt({ stiv: c = 26e3, daemp: t = 23e3, maks: s = 75e5 } = {}) {
  let e = 0, i = 0, a = 0, n = 0, h = 0, o = 0;
  const r = { saet(l, u, v, m) {
      e = v;
      i = m;
      a = l - v;
      n = u - m;
    }, get faerdig() {
      return Math.abs(h) < 1e3 && Math.abs(o) < 1e3;
    }, trin(l) {
      let u = 1;
      if (l >= 34) {
        u = l > 152 ? 8 : Math.trunc(l / 17);
      }
      for (let v = 0; v < u; v++) {
        let m = V(c, -a) + h, f = V(c, -n) + o;
        m -= V(t, m);
        f -= V(t, f);
        h = Math.max(-s, Math.min(s, m));
        o = Math.max(-s, Math.min(s, f));
        a += Math.floor(Math.trunc(h * 64 / 33) * l / 64);
        n += Math.floor(Math.trunc(o * 64 / 33) * l / 64);
      }
      if (r.faerdig) {
        a = 0;
        n = 0;
      }
    }, get x() {
      return e + a;
    }, get y() {
      return i + n;
    } };
  return r;
}
function Ot(c = 500) {
  let t = 0, s = 0, e = 0, i = 0, a = c, n = 0, h = 0;
  return { saet(o, r, l, u) {
      t = o;
      s = r;
      e = l - o;
      i = u - r;
      a = 0;
      n = 0;
      h = 0;
    }, get faerdig() {
      return a >= c;
    }, trin(o) {
      if (a >= c) {
        return;
      }
      if (a += o, a >= c) {
        a = c;
        n = e;
        h = i;
        return;
      }
      const r = Math.floor(a * 65536 / c);
      n = V(e, r);
      h = V(i, r);
    }, get x() {
      return t + n;
    }, get y() {
      return s + h;
    } };
}
function Nt({ tekster: c, skrift: t, x: s = 480, y: e = 130, bredde: i = 400 }) {
  const a = [242, 218], n = 0, h = Lt(), o = Ot();
  let r = null, l = -1, u = 3, v = "", m = 0, f = 0, p = 0, y = 0, b = [0];
  const P = (g) => g * 65536;
  return { get aktiv() {
      return l !== -1;
    }, get aaben() {
      return l !== -1 && l !== 5;
    }, get laestTryk() {
      return l === 3;
    }, get laestTid() {
      return l === 4;
    }, start(g) {
      u = g;
      l = 0;
      r = h;
      r.saet(P(s), -P(a[n]), P(s), P(e));
    }, skub(g) {
      v = String(c[g] ?? "");
      m = v.length;
      f = m * 33 + 2e3;
      p = 8;
      y = 0;
      if (l >= 2 && l <= 4) {
        l = 1;
      }
      b = t ? t.linjeStarter(v, 1, i) : [0];
    }, slut() {
      l = 5;
      r = o;
      r.saet(P(s), P(e), P(s), -P(a[n]));
    }, trin(g, j) {
      if (r && r.trin(g), l === 0) {
        if (r.faerdig) {
          l = 1;
        }
      } else if (l === 1) {
        if (y < m) {
          if (u & 1 && j) {
            y = m;
          } else if (p -= g, p < 1) {
            let S = 8 - p;
            for (; S >= 8 && y < m;) {
              S -= 8;
              y += 1;
            }
            p = S + 8;
          }
        }
        if (y >= m) {
          l = 2;
        }
      } else if (l === 2) {
        if (u & 1 && j) {
          l = 3;
          return;
        }
        if (u & 2) {
          f -= g;
          if (f <= 0) {
            l = 4;
          }
        }
      } else if (l === 5 && r.faerdig) {
        l = -1;
      }
    }, tegn(g, j) {
      if (l === -1 || !r) {
        return;
      }
      const S = Math.floor(r.x / 65536), A = Math.floor(r.y / 65536);
      if (j(2, S, A), l < 1 || l > 5 || !t) {
        return;
      }
      let R = A - 46;
      for (let T = 0; T < b.length; T++, R += 35) {
        if (y < b[T]) {
          continue;
        }
        const Y = T < b.length - 1 ? Math.min(y, b[T + 1] - 1) : Math.min(y, m);
        t.tegn(g, v.substring(b[T], Y), S - 140, R, { font: 1, op: true });
      }
    } };
}
function Wt(c, t) {
  let s = 1, e = 0, i = 0, a = false, n = false;
  const h = () => s >= c.length && !a && i <= 0 && !n, o = () => {
    for (; s < c.length;) {
      const r = c[s];
      if (r === 0) {
        i = e + c[s + 1] * 10;
        s += 2;
      } else if (r === 1) {
        s += 1;
        return;
      } else if (r === 12) {
        a = true;
        s += 1;
      } else if (r === 13) {
        if (!t.aaben) {
          t.start(3);
        }
        t.skub(c[s + 1]);
        s += 2;
      } else if (r === 14) {
        n = true;
        s += 2;
      } else {
        throw new Error(`MGPFScript: op ${r} er ikke porteret`);
      }
    }
  };
  return { get faerdig() {
      return h();
    }, trin(r, l) {
      if (h()) {
        return true;
      }
      e += r;
      if (!a && i <= 0 && !n) {
        o();
      } else {
        if (i !== 0 && i < e) {
          i = 0;
        }
        if (a && l) {
          a = false;
        }
        if (n && (t.laestTid || t.laestTryk)) {
          n = false;
        }
      }
      return h() ? (t.aaben && t.slut(), true) : false;
    } };
}
function _t(c, t) {
  const s = Nt({ tekster: c.tekster, skrift: t }), e = c.scripts.map((n) => Wt(n, s));
  let i = 0, a = 1;
  return { dialog: s, get hudAlfa() {
      return a;
    }, trin(n, h) {
      s.trin(n, h);
      const o = n * 15887 / 64 / 65536;
      a = s.aktiv ? Math.max(0, a - o) : Math.min(1, a + o);
      const r = e[i];
      if (r) {
        r.trin(n, h);
        if (r.faerdig && !s.aktiv) {
          i += 1;
          if (!e[i]) {
            e.length = 0;
            i = 0;
          }
        }
      }
    }, get pauser() {
      return s.aktiv;
    } };
}
function Gt() {
  const [c, t] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let s = false;
    (async () => {
      try {
        const [e, i] = await Promise.all([fetch("data/platform/manifest.json").then((l) => l.ok ? l.json() : Promise.reject(new Error(`manifest.json: ${l.status}`))), fetch("data/platform/index.json").then((l) => l.ok ? l.json() : Promise.reject(new Error(`index.json: ${l.status}`)))]), a = {};
        await Promise.all(Object.entries(e.textures).map(([l, u]) => new Promise((v) => {
          const m = new Image();
          m.onload = () => {
            a[l] = m;
            v();
          };
          m.onerror = () => v();
          m.src = `data/platform/tex/${u.file}`;
        })));
        const n = async (l) => {
          const u = await fetch(`data/platform/${l}/manifest.json`).then((v) => v.ok ? v.json() : null).catch(() => null);
          if (!u) {
            return false;
          }
          for (const [v, m] of Object.entries(u.sprites)) {
            if (!e.sprites[v]) {
              e.sprites[v] = m;
            }
          }
          for (const v of u.animations) {
            if (!e.animations.some((m) => m.id === v.id)) {
              e.animations.push(v);
            }
          }
          await Promise.all(Object.entries(u.textures).map(([v, m]) => new Promise((f) => {
            if (a[v]) {
              f();
              return;
            }
            const p = new Image();
            p.onload = () => {
              a[v] = p;
              f();
            };
            p.onerror = () => f();
            p.src = `data/platform/${l}/tex/${m.file}`;
          })));
          return true;
        }, [h, , o] = await Promise.all([n("hud"), n("dialog"), fetch("data/platform/vejledning.json").then((l) => l.ok ? l.json() : null).catch(() => null)]), r = new Map(e.animations.map((l) => [l.id, l]));
        if (!s) {
          t({ status: "ready", manifest: e, index: i, images: a, anims: r, hud: h, vejledning: o });
        }
      }
      catch (e) {
        if (!s) {
          t({ status: "error", error: e.message });
        }
      }
    })();
    return () => {
      s = true;
    };
  }, []);
  return c;
}
function ft(c, t, s, e, i, a, n, h, o = 0, r = 1, l = 1) {
  const u = t.sprites[e];
  if (!u) {
    return;
  }
  const v = s[u.assetId];
  if (!v) {
    return;
  }
  const m = (u.flags & 65535) === 65280, f = !m && (u.flags & 1) > 0, p = m ? 0 : (u.flags & 6) >> 1, y = m ? 1 : ((u.flags & 65280) >> 8) / 255;
  c.save();
  c.translate(i, a);
  c.rotate((o + p * 0.25) * Math.PI * 2);
  c.scale(r * (n !== f ? -1 : 1), l);
  c.globalAlpha = Math.max(0, Math.min(1, h * y));
  c.drawImage(v, u.u, u.v, u.w, u.h, -u.ox, -u.oy, u.w, u.h);
  c.restore();
}
const xt = 1 / 32 / 0.0122070312, gt = 4096 / 6400;
function Yt(c, t, s, e) {
  c.fillStyle = "rgb(150,200,235)";
  c.fillRect(0, 0, BX, C);
  for (const i of t.tegneliste()) {
    if (i.anim) {
      for (const a of i.anim.drawList("invers", false)) {
        ft(c, s, e, a.sprite, i.x + a.x * xt, i.y + a.y * xt, a.flip !== !!i.flip, a.alpha * (i.alpha ?? 1), a.rot, a.scaleX * gt, a.scaleY * gt);
      }
    } else {
      ft(c, s, e, i.sprite, i.x, i.y, !!i.flip, i.alpha ?? 1);
    }
  }
}
let BX = 960, BU = BX / J;
const KT0 = 458, G = { normal: [412, 409, 410, 411], valgt: [416, 413, 414, 415], laast: 417, x: 760, y: 588, trin: 104, skala: 0.9 }, Tt = (c) => ({ x: G.x - (3 - c) * G.trin + (BX - 960), y: G.y });
function $t(c, t, s, e) {
  if (!s) {
    return;
  }
  const i = (o, r, l, u = 1) => {
    const v = s.sprites[o], m = v && e[v.assetId];
    if (m) {
      c.drawImage(m, v.u, v.v, v.w, v.h, r - v.ox * u, l - v.oy * u, v.w * u, v.h * u);
    }
  };
  i(406, 0, 0);
  [40, 100, 160].forEach((o, r) => i(r < t.helbred ? 401 : 402, o, 27, 2));
  const kt = KT0 + (BX - 960) / 2;
  i(408, kt, 0);
  const a = String(t.mynterTaget);
  c.font = "bold 44px system-ui, sans-serif";
  const n = c.measureText(a).width, h = kt - (n + 96) / 2;
  i(403, h + 27, 30);
  i(405, h + 54, 30);
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.lineWidth = 6;
  c.strokeStyle = "#5a3a10";
  c.fillStyle = "#fff6d0";
  c.strokeText(a, h + 96, 32);
  c.fillText(a, h + 96, 32);
  for (let o = 0; o < 4; o++) {
    const { x: r, y: l } = Tt(o), u = t.kostume === o;
    if (t.aabne && !t.aabne[o]) {
      i(G.laast, r, l, G.skala);
      continue;
    }
    i(u ? G.valgt[o] : G.normal[o], r, l, u ? 1.05 : G.skala);
    if (u) {
      c.strokeStyle = "#fff6d0";
      c.lineWidth = 5;
      c.beginPath();
      c.arc(r, l, 52, 0, Math.PI * 2);
      c.stroke();
    }
  }
}
const ht = { ArrowLeft: "venstre", KeyA: "venstre", ArrowRight: "hoejre", KeyD: "hoejre", ArrowUp: "hop", KeyW: "hop", Space: "hop", KeyZ: "hop" }, bt = 4;
function PlatformGame({ bredde: BW = 1280, svaer: c = 0, pause: t = false, lydTil: s = true, skrift: e = null, paaSlut: i = () => {
} }) {
  var O;
  BX = BW > 1280 ? 1136 : 960;
  BU = BX / J;
  const a = Gt(), [n] = React.useState(() => c * bt + Math.floor(Math.random() * bt)), [h, o] = React.useState(null), r = React.useRef((() => {
    try {
      return Number(localStorage.getItem("platform-naaet-v1")) || 0;
    }
    catch {
      return 0;
    }
  })()), l = React.useRef(null), u = React.useRef(null), v = React.useRef(null), m = React.useRef(t);
  m.current = t;
  const f = React.useRef(i);
  f.current = i;
  const p = React.useRef(null), y = React.useRef(null), b = a.status === "ready" ? (O = a.index.baner[n]) == null ? void 0 : O.navn : null;
  if (React.useEffect(() => {
    if (!b) {
      return;
    }
    let g = false;
    o(null);
    fetch(`data/platform/${b}.json`).then((j) => j.json()).then((j) => {
      if (!g) {
        o(j);
      }
    });
    return () => {
      g = true;
    };
  }, [b]), React.useEffect(() => {
    if (a.status !== "ready" || !h) {
      return;
    }
    const g = new It(h, a.anims, a.index.baggrund);
    g.aabne = pt(r.current);
    let j = false;
    u.current = g;
    const S = rd_(Object.values(yk_));
    S.saetTil(s);
    v.current = S;
    const A = a.vejledning ? _t(a.vejledning, e) : null;
    p.current = A;
    const R = l.current.getContext("2d"), T = { venstre: false, hoejre: false, hop: false, hopTrykket: false, fire: false };
    y.current = T;
    const Y = (E) => {
      if (m.current) {
        return;
      }
      if (A && A.pauser) {
        if (ht[E.code] === "hop" || E.code === "Enter") {
          E.preventDefault();
          if (!E.repeat) {
            T.fire = true;
          }
        }
        return;
      }
      const H = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[E.code];
      if (H !== void 0) {
        E.preventDefault();
        g.skiftKostume(H);
        return;
      }
      const Z = ht[E.code];
      if (Z) {
        E.preventDefault();
        if (Z === "hop" && !T.hop) {
          T.hopTrykket = true;
        }
        T[Z] = true;
      }
    }, ct = (E) => {
      const H = ht[E.code];
      if (H) {
        E.preventDefault();
        T[H] = false;
      }
    };
    window.addEventListener("keydown", Y);
    window.addEventListener("keyup", ct);
    let it, ut = performance.now(), at = 0, q = 0;
    const dt = (E) => {
      for (m.current || (at += Math.min(250, E - ut)), ut = E; at >= k;) {
        if (A) {
          A.trin(k, T.fire);
        }
        T.fire = false;
        if (!A || !A.pauser) {
          g.step(T);
        }
        T.hopTrykket = false;
        at -= k;
      }
      for (const H of g.lyde.splice(0)) {
        S.spil(yk_[H]);
      }
      if (g.tilstand === "vundet" && !j) {
        j = true;
        const H = n === r.current ? n + 1 : r.current;
        if (H !== r.current) {
          r.current = H;
          try {
            localStorage.setItem("platform-naaet-v1", String(H));
          }
          catch {
          }
          g.aabne = pt(H);
        }
      }
      if ((g.tilstand === "vundet" || g.tilstand === "slut") && !q) {
        q = E;
      }
      if (q && E - q > 2e3 && q > 0) {
        q = -1;
        f.current({ vundet: g.tilstand === "vundet", beloenning: g.mynterTaget });
      }
      Yt(R, g, a.manifest, a.images);
      if (a.hud) {
        R.save();
        R.globalAlpha = A ? A.hudAlfa : 1;
        $t(R, g, a.manifest, a.images);
        R.restore();
      }
      if (A) {
        A.dialog.tegn(R, (H, Z, St) => ft(R, a.manifest, a.images, H, Z, St, false, 1));
      }
      it = requestAnimationFrame(dt);
    };
    it = requestAnimationFrame(dt);
    return () => {
      cancelAnimationFrame(it);
      S.stopAlle();
      window.removeEventListener("keydown", Y);
      window.removeEventListener("keyup", ct);
    };
  }, [a, h, e]), React.useEffect(() => {
    var g;
    if ((g = v.current) != null) {
      g.saetTil(s);
    }
  }, [s]), a.status === "loading") {
    return $.jsx(Ka_, { bredde: BW });
  }
  if (a.status === "error") {
    return $.jsxs("div", { className: "msg error", children: [$.jsxs("p", { children: ["Kunne ikke indlæse: ", a.error] }), $.jsxs("p", { className: "hint", children: ["Kør ", $.jsx("code", { children: "node Tools/export-platform.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] });
  }
  const P = (g) => {
    if (m.current || !u.current) {
      return;
    }
    if (p.current && p.current.pauser) {
      if (y.current) {
        y.current.fire = true;
      }
      return;
    }
    const j = l.current.getBoundingClientRect(), S = Math.min(j.width / BX, j.height / C), A = (g.clientX - j.left - (j.width - BX * S) / 2) / S, R = (g.clientY - j.top - (j.height - C * S) / 2) / S;
    for (let T = 0; T < 4; T++) {
      const Y = Tt(T);
      if (Math.hypot(A - Y.x, R - Y.y) < 50) {
        u.current.skiftKostume(T);
      }
    }
  };
  return $.jsx("div", { className: "spilflade", children: $.jsx("canvas", { ref: l, width: BX, height: C, onPointerDown: P, style: { objectFit: "contain", background: "#000", touchAction: "none" } }) });
}
export { PlatformGame as default, Tt as totemPos };
