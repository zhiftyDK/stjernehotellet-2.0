import React from 'react';
import * as T from 'react/jsx-runtime';
import { rd as rd_, pk as pk_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
import { drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
const L = 1280, S = 768, v = -56, A = { lava: [1787 + v, 1788 + v], rum: [1790 + v, 1791 + v], termometer: 1786 + v, ramme: 1789 + v, vare: (t) => 1792 + v + t }, c = { KLAR: 0, SPILLER: 2, VUNDET: 3, TABT: 4 }, V = 33, O = 80 * 2, I = 640 / 80 + 2, z = 574, at = [8192, 8192, 12288].map((t) => t / 65536 * 2), it = [6e4, 45e3, 3e4], st = [60, 100, 140], C = [2, 2, 2, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 2, 0, 2, 2], G = ["papir", "glas", "metal"], $ = [[298, 207, 377, 340], [380, 259, 454, 498], [737, 208, 895, 524]], X = 9830 / 65536, ot = 6553 / 65536, lt = 3276 / 65536, ft = 64225 / 65536, N = { x: 534, bund: 490, b: 56, h: 316 }, ct = (t) => t * t * (3 - 2 * t);
class w {
  constructor(e, r) {
    this.n = r;
    this.saet(e);
  }
  saet(e) {
    this.v = e;
    this.fra = e;
    this.maal = e;
    this.f = this.n;
  }
  mod(e) {
    if (e !== this.maal) {
      this.fra = this.v;
      this.maal = e;
      this.f = 0;
    }
  }
  step() {
    this.f++;
    this.v = this.f < this.n ? this.fra + (this.maal - this.fra) * ct(this.f / this.n) : this.maal;
  }
}
function ut(t = 0) {
  const e = [];
  for (let r = 0; r < I; r++) {
    e.push({ synlig: false, type: 0, x: new w(L, 4), y: new w(S / 2, 8), skala: new w(1, 15) });
  }
  return { svaer: t, tilstand: c.KLAR, tid: it[t], acc: 0, pos: e.map((r, o) => O * o), hoved: 0, fart: new w(0, 30), maalerMaal: X, maaler: new w(0, 30), vare: e, traek: -1, peger: { x: 0, y: 0 }, rigtige: 0, forkerte: 0, beloenning: 0 };
}
function Y(t) {
  t.tilstand = c.SPILLER;
  t.fart.mod(at[t.svaer]);
}
const H = (t, e) => t.pos[e] - O;
function dt(t, e) {
  if (e === t.traek) {
    return;
  }
  const r = t.vare[e];
  r.synlig = e % 2 === 0;
  if (r.synlig) {
    r.type = Math.floor(Math.random() * 18);
  }
  r.x.saet(H(t, e));
  r.y.saet(z);
  r.skala.saet(1);
}
function mt(t) {
  if (t.tilstand === c.SPILLER) {
    t.tid -= V;
    t.fart.step();
    for (let e = 0; e < I; e++) {
      t.pos[e] -= t.fart.v * V;
    }
    if (t.pos[t.hoved] < 0) {
      t.pos[t.hoved] += I * O;
      dt(t, t.hoved);
      t.hoved = (t.hoved + 1) % I;
    }
    t.maaler.mod(t.maalerMaal);
    if (t.maalerMaal >= ft) {
      t.tilstand = c.VUNDET;
      t.beloenning = st[t.svaer];
      t.traek = -1;
    } else if (t.tid <= 0) {
      t.tid = 0;
      t.tilstand = c.TABT;
      t.traek = -1;
    }
  }
  t.maaler.step();
  t.vare.forEach((e, r) => {
    if (e.skala.maal >= 1) {
      if (r === t.traek) {
        e.x.mod(t.peger.x);
        e.y.mod(t.peger.y);
      } else {
        e.x.mod(H(t, r));
        e.y.mod(z);
      }
    }
    e.x.step();
    e.y.step();
    e.skala.step();
  });
}
function pt(t, e) {
  for (t.acc += Math.min(e, 250); t.acc >= V;) {
    t.acc -= V;
    mt(t);
  }
}
let W = () => null;
function ht(t) {
  W = t;
}
function gt(t, e, r) {
  if (t.tilstand === c.SPILLER) {
    for (let o = 0; o < I; o++) {
      const f = t.vare[o];
      if (!f.synlig || f.skala.maal < 1) {
        continue;
      }
      const s = W(f.type);
      if (s && e >= f.x.v + s.x0 && e <= f.x.v + s.x1 && r >= f.y.v + s.y0 && r <= f.y.v + s.y1) {
        t.traek = o;
        t.peger = { x: e, y: r };
        return;
      }
    }
  }
}
function yt(t, e, r) {
  if (t.traek >= 0) {
    t.peger = { x: e, y: r };
  }
}
function Rt(t, e, r) {
  const o = t.traek;
  if (o < 0 || (t.traek = -1, t.tilstand !== c.SPILLER)) {
    return null;
  }
  const f = $.findIndex(([i, d, p, m]) => e >= i && e <= p && r >= d && r <= m);
  if (f < 0) {
    return null;
  }
  const s = t.vare[o], u = C[s.type] === f;
  if (u) {
    t.maalerMaal = Math.min(1, t.maalerMaal + ot);
    t.rigtige++;
  } else {
    t.maalerMaal = Math.max(X, t.maalerMaal - lt);
    t.forkerte++;
  }
  s.skala.mod(0);
  return { rigtigt: u, zone: f, kasse: G[C[s.type]] };
}
function kt() {
  const [t, e] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let r = false;
    (async () => {
      try {
        const o = await fetch("data/sortering/manifest.json");
        if (!o.ok) {
          throw new Error(`manifest.json: ${o.status}`);
        }
        const f = await o.json(), s = await Sv_("sortering"), u = {};
        await Promise.all(Object.entries(f.textures).map(([i, d]) => new Promise((p) => {
          const m = new Image();
          m.onload = () => {
            u[i] = m;
            p();
          };
          m.onerror = () => p();
          m.src = `data/sortering/tex/${d.file}`;
        })));
        if (!r) {
          e({ status: "ready", manifest: f, images: u, fortaeller: s });
        }
      }
      catch (o) {
        if (!r) {
          e({ status: "error", error: o.message });
        }
      }
    })();
    return () => {
      r = true;
    };
  }, []);
  return t;
}
function M(t, e, r, o, f, s = 1) {
  const u = e.manifest.sprites[r], i = u && e.images[u.assetId];
  if (!(!i || s <= 0)) {
    t.save();
    t.translate(o, f);
    t.scale(s, s);
    Ql_(t, i, u);
    t.restore();
  }
}
const j = { x: 256, y: 384, tekstY: 394 };
function q(t, e, r, o, f) {
  t.fillStyle = "#2a1a10";
  t.fillRect(0, 0, L, S);
  for (const i of A.lava) {
    M(t, r, i, L / 2, S / 2);
  }
  for (const i of A.rum) {
    M(t, r, i, L / 2, S / 2);
  }
  t.fillStyle = "#ff0000";
  const s = Math.round(N.h * e.maaler.v);
  if (t.fillRect(N.x, N.bund - s, N.b, s), M(t, r, A.termometer, L / 2, S / 2), e.fortaeller && e.fortaeller.tegn(t), e.vare.forEach((i, d) => {
    if (i.synlig && d !== e.traek) {
      M(t, r, A.vare(i.type), i.x.v, i.y.v, i.skala.v);
    }
  }), e.traek >= 0) {
    const i = e.vare[e.traek];
    M(t, r, A.vare(i.type), i.x.v, i.y.v, 1.08);
  }
  M(t, r, A.ramme, j.x, j.y);
  const u = String(Math.max(0, Math.ceil(e.tid / 1e3)));
  if (f) {
    f.tegn(t, u, j.x, j.tekstY, { str: 73, midt: true, op: true });
  }
  if (o || e.traek >= 0) {
    t.lineWidth = 4;
    $.forEach(([i, d, p, m], D) => {
      t.strokeStyle = o ? "rgba(80,255,120,.9)" : "rgba(255,255,255,.55)";
      t.strokeRect(i, d, p - i, m - d);
      if (o) {
        t.fillStyle = "rgba(80,255,120,.95)";
        t.font = "bold 28px system-ui, sans-serif";
        t.fillText(G[D], (i + p) / 2, d - 20);
      }
    });
  }
}
function SortingGame({ svaer: t = 0, pause: e = false, lydTil: r = true, skrift: o = null, paaSlut: f = () => {
} }) {
  const s = kt(), u = React.useRef(null), i = React.useRef(null), d = React.useRef(null), p = React.useRef(false), m = React.useRef(e);
  m.current = e;
  const D = React.useRef(f);
  D.current = f;
  React.useEffect(() => {
    if (s.status !== "ready") {
      return;
    }
    ht((y) => {
      const k = s.manifest.sprites[A.vare(y)];
      return k && { x0: -k.ox, y0: -k.oy, x1: k.w - k.ox, y1: k.h - k.oy };
    });
    const n = ut(t);
    i.current = n;
    const a = rd_(Object.values(pk_));
    a.saetTil(r);
    d.current = a;
    let h = n.tilstand;
    const l = Ev_(s.fortaeller);
    n.fortaeller = l;
    if (l) {
      l.saetLyd(r);
      l.kaede([1, 2]);
    }
    const g = (y) => {
      if (l) {
        l.spil(y);
        l.slump();
      }
    };
    n.fortSpil = g;
    const b = u.current.getContext("2d");
    let P, x = performance.now(), K = 0, _ = false;
    const B = (y) => {
      if (m.current) {
        x = y;
        q(b, n, s, p.current, o);
        P = requestAnimationFrame(B);
        return;
      }
      if (l) {
        l.tik(y - x);
        if (n.tilstand === c.KLAR && !l.introAktiv()) {
          Y(n);
          a.loekke(pk_.baand, 0.35);
          g(4);
        }
      }
      pt(n, y - x);
      x = y;
      q(b, n, s, p.current, o);
      if (n.tilstand !== h) {
        if (n.tilstand !== c.SPILLER) {
          a.stop(pk_.baand);
        }
        if (n.tilstand === c.VUNDET) {
          a.spil(pk_.jingle);
          g(12);
        }
        if (n.tilstand === c.TABT) {
          g(13);
        }
        if (n.tilstand === c.VUNDET || n.tilstand === c.TABT) {
          K = y;
        }
        h = n.tilstand;
      }
      if (K && !_ && y - K > 1500 && !(l && l.optaget())) {
        _ = true;
        D.current({ vundet: n.tilstand === c.VUNDET, beloenning: n.tilstand === c.VUNDET ? n.beloenning : 0 });
      }
      P = requestAnimationFrame(B);
    };
    P = requestAnimationFrame(B);
    return () => {
      cancelAnimationFrame(P);
      a.stopAlle();
      if (l) {
        l.stop();
      }
    };
  }, [s, t, o]);
  React.useEffect(() => {
    var n, a, h;
    if ((n = d.current) != null) {
      n.saetTil(r);
    }
    if ((h = (a = i.current) == null ? void 0 : a.fortaeller) != null) {
      h.saetLyd(r);
    }
  }, [r]);
  const F = (n) => {
    const a = u.current.getBoundingClientRect();
    return [(n.clientX - a.left) * L / a.width, (n.clientY - a.top) * S / a.height];
  }, J = (n) => {
    var h, l, g;
    const a = i.current;
    if (!(!a || m.current)) {
      if (a.fortaeller && a.tilstand !== c.SPILLER) {
        a.fortaeller.spring();
        return;
      }
      if (a.tilstand === c.KLAR) {
        Y(a);
        if ((h = d.current) != null) {
          h.loekke(pk_.baand, 0.35);
        }
        return;
      }
      try {
        if ((g = (l = u.current).setPointerCapture) != null) {
          g.call(l, n.pointerId);
        }
      }
      catch {
      }
      gt(a, ...F(n));
    }
  }, Q = (n) => {
    const a = i.current;
    if (a && !m.current) {
      yt(a, ...F(n));
    }
  }, U = (n) => {
    var g, b;
    const a = i.current;
    if (!a || m.current) {
      return;
    }
    const h = a.traek >= 0 && a.tilstand === c.SPILLER, l = Rt(a, ...F(n));
    if (a.fortSpil && h) {
      a.fortSpil(l ? l.zone + (l.rigtigt ? 5 : 8) : 11);
    }
    if (l) {
      if ((g = d.current) != null) {
        g.spil(pk_.slip);
      }
      if (!(l.rigtigt || (b = d.current) == null)) {
        b.spil(pk_.forkert);
      }
    }
  };
  return s.status === "loading" ? T.jsx(Ka_, { bredde: 1280 }) : s.status === "error" ? T.jsxs("div", { className: "msg error", children: [T.jsxs("p", { children: ["Kunne ikke indlæse: ", s.error] }), T.jsx("p", { className: "hint", children: "Kopiér dataene fra web/public/data til spil/public/data." })] }) : T.jsx("div", { className: "spilflade", children: T.jsx("canvas", { ref: u, width: L, height: S, style: { touchAction: "none", cursor: "grab" }, onPointerDown: J, onPointerMove: Q, onPointerUp: U, onPointerCancel: U }) });
}
export { SortingGame as default };
