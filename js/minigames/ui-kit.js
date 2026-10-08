import React from 'react';
import * as J from 'react/jsx-runtime';
import { backdropPlacement, GAME_WIDTH, GAME_HEIGHT } from '../engine/constants.js';
import { drawSpriteFrame, drawAnimation } from '../render/canvas-helpers.js';
let _i = null;
const getLoadingImage = () => {
  if (!_i) {
    _i = new Image();
    _i.src = "data/vent/vent.webp";
  }
  return _i;
};
export function LoadingScreen({ ud: e = false, efter: t, bredde: bw = GAME_WIDTH }) {
  const n = React.useRef(null);
  React.useEffect(() => {
    const r = n.current.getContext("2d"), l = getLoadingImage(), i = () => {
      if (!(!l.complete || !l.naturalWidth)) {
        const pl = backdropPlacement(bw);
        r.drawImage(l, 0, pl.y, l.naturalWidth * pl.scale, l.naturalHeight * pl.scale);
      }
    };
    i();
    l.addEventListener("load", i);
    return () => l.removeEventListener("load", i);
  }, []);
  return J.jsx("canvas", { ref: n, width: bw, height: GAME_HEIGHT, className: e ? "vent ud" : "vent", "aria-label": "Vent venligst…", onAnimationEnd: e ? t : void 0 });
}
export function createUiKit(e, t, n, r) {
  let l = [], i = [];
  const o = { ctx: e, U: n, pakker: t, skrift: r, start() {
      l = [];
      i = [];
    }, sprite(s, a, u, h, { alfa: m = 1, skala: g = 1 } = {}) {
      const v = t[s], c = v && v.M.sprites[a], p = c && v.I[c.assetId];
      if (p) {
        e.save();
        e.translate(u, h);
        e.scale(g, g);
        drawSpriteFrame(e, p, c, m);
        e.restore();
        return { x0: u - c.ox * g, y0: h - c.oy * g, x1: u + (c.w - c.ox) * g, y1: h + (c.h - c.oy) * g };
      }
      return null;
    }, spriteIKasse(s, a, u, h, m, g, v = 1) {
      const c = t[s] && t[s].M.sprites[a];
      if (!c) {
        return;
      }
      const p = Math.min(1, m / c.w, g / c.h);
      o.sprite(s, a, u + (m - c.w * p) / 2 + c.ox * p, h + (g - c.h * p) / 2 + c.oy * p, { skala: p, alfa: v });
    }, anim(s, a, u, h, m = 1, g = 1) {
      const v = t[s];
      if (!(!v || !a)) {
        e.save();
        e.translate(u, h);
        e.scale(m, m);
        drawAnimation(e, v.M, v.I, a, 0, 0, false, g);
        e.restore();
      }
    }, ramme(s, a, u, h, m) {
      const g = n.ramme[s], v = n.ramme[`${s}Flise`], c = (E, N, C, I, O) => {
        e.save();
        e.beginPath();
        e.rect(N, C, I, O);
        e.clip();
        for (let F = C; F < C + O; F += v) {
          for (let V = N; V < N + I; V += v) {
            o.sprite("ui", E, V, F);
          }
        }
        e.restore();
      }, [p, k, d, f, y, w, S, P, M] = g;
      c(M, a + v, u + v, h - 2 * v, m - 2 * v);
      c(k, a + v, u, h - 2 * v, v);
      c(w, a + v, u + m - v, h - 2 * v, v);
      c(P, a, u + v, v, m - 2 * v);
      c(f, a + h - v, u + v, v, m - 2 * v);
      o.sprite("ui", p, a, u);
      o.sprite("ui", d, a + h - v, u);
      o.sprite("ui", S, a, u + m - v);
      o.sprite("ui", y, a + h - v, u + m - v);
    }, overskrift(s, a, u) {
      const h = n.ramme.overskriftFlise, m = Math.round(r.bredde(s, 37) / h + 2.5), g = a - m * h / 2, [v, c, p] = n.ramme.overskrift;
      o.sprite("ui", v, g, u);
      for (let k = 1; k < m - 1; k++) {
        o.sprite("ui", c, g + k * h, u);
      }
      o.sprite("ui", p, g + (m - 1) * h, u);
      r.tegn(e, s, a, u + h / 2, { str: 37, midt: true });
    }, tekst(s, a, u, { str: h = 22, farve: m = null, midt: g = false, bredde: v = 0, op: c = false, hoejre: p = false } = {}) {
      const k = m && m !== "#fff" ? m : null;
      return r.tegn(e, s, a, u, { str: Math.round(h * 1.3), midt: g, hoejre: p, bredde: v, op: c, farve: k });
    }, knap(s, a) {
      if (s) {
        l.push({ ...s, fn: a });
      }
      return s;
    }, traek(s, a) {
      i.push({ ...s, fn: a });
      return o.knap(s, a);
    }, traekVed(s) {
      const a = [...i].reverse().find((u) => s.x >= u.x0 && s.x <= u.x1 && s.y >= u.y0 && s.y <= u.y1);
      return a ? a.fn : null;
    }, spriteKnap(s, a, u, h, { bag: m = 0, alfa: g = 1, skala: v = 1 } = {}) {
      let c = null;
      if (m) {
        c = o.sprite("ui", m, a, u, { skala: v });
      }
      const p = o.sprite("ui", s, a, u, { alfa: g, skala: v });
      return o.knap(c || p, h);
    }, tekstKnap(s, a, u, h, m, g, { aktiv: v = true } = {}) {
      e.save();
      if (!v) {
        e.globalAlpha = 0.5;
      }
      o.ramme("punkt", a, u, h, m);
      o.tekst(s, a + h / 2, u + m / 2, { str: 22, midt: true });
      e.restore();
      return v ? o.knap({ x0: a, y0: u, x1: a + h, y1: u + m }, g) : null;
    }, rulleliste(s, a, u, h, m, g, v) {
      s.rul = Math.max(0, Math.min(Math.max(0, g - m), s.rul || 0));
      s.rulFelt = { x0: a, y0: u, x1: a + h, y1: u + m };
      e.save();
      e.beginPath();
      e.rect(a, u, h, m);
      e.clip();
      const c = l.length;
      if (v(u - s.rul), l = l.filter((p, k) => k < c || p.y1 > u && p.y0 < u + m), e.restore(), g > m) {
        const p = m / g;
        e.fillStyle = "rgba(255,255,255,.55)";
        e.fillRect(a + h - 6, u + s.rul / g * m, 4, m * p);
      }
    }, klik(s) {
      const a = [...l].reverse().find((u) => s.x >= u.x0 && s.x <= u.x1 && s.y >= u.y0 && s.y <= u.y1);
      if (a) {
        a.fn(s);
      }
      return !!a;
    } };
  return o;
}
export class WindowStack {
  constructor(t) {
    this.U = t;
    this.stak = [];
    this.utegnet = false;
  }
  get aaben() {
    return this.stak.length > 0;
  }
  aabn(t) {
    this.stak.push(t);
    this.utegnet = true;
  }
  luk() {
    const t = this.stak.pop();
    this.utegnet = true;
    if (t && t.lukket) {
      t.lukket();
    }
  }
  lukAlle() {
    const t = this.stak;
    this.stak = [];
    this.utegnet = true;
    for (const n of t.reverse()) {
      if (n.lukket) {
        n.lukket();
      }
    }
  }
  top() {
    return this.stak[this.stak.length - 1];
  }
  tast(t) {
    const n = this.top();
    return !!(n && n.tast && n.tast(t, this));
  }
  vindue(t) {
    const { bredde: n, hoejde: r, skaerm: l, venstre: i } = this.U.menu, o = t.bredde || n, s = t.hoejde || r;
    return { x: i + (l[0] - o) / 2, y: (l[1] - s) / 2, w: o, h: s };
  }
  tegn(t, n, r, l) {
    const i = this.top();
    if (t.start(), !i) {
      return;
    }
    n.fillStyle = "rgba(0,0,0,.5)";
    n.fillRect(0, 0, r, l);
    t.knap({ x0: 0, y0: 0, x1: r, y1: l }, () => {
    });
    const o = this.vindue(i);
    t.ramme("hoved", o.x, o.y, o.w, o.h);
    i.tegn(t, o, this);
    if (i.titel) {
      t.overskrift(i.titel, o.x + o.w / 2, o.y - 16);
    }
    if (i.luk !== false) {
      t.spriteKnap(this.U.hovedmenu.luk, o.x + o.w - 8, o.y + 8, () => this.luk());
    }
    this.utegnet = false;
  }
  klik(t, n) {
    if (this.aaben) {
      if (!this.utegnet) {
        t.klik(n);
      }
      return true;
    }
    return false;
  }
  traekStart(t, n) {
    return this.aaben && !this.utegnet ? t.traekVed(n) : null;
  }
  rul(t) {
    const n = this.top();
    if (n && n.rulFelt) {
      n.rul = (n.rul || 0) + t;
    }
  }
}
export const Rv = 1e3 / 30, Cv = (e) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, e)));

// Same ui definitions, but with the centred-window origin moved for a canvas wider than 1280.
export function centeredUi(U, width) {
  return width > 1280 ? { ...U, menu: { ...U.menu, venstre: Math.round((width - U.menu.skaerm[0]) / 2) } } : U;
}
