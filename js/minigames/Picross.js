import React from 'react';
import * as x from 'react/jsx-runtime';
import { rd as rd_, hk as hk_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
import { drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
const re = 5, T = { SPILLER: "spiller", VUNDET: "vundet", TABT: "tabt" };
function oe(e, o = 0, f = null) {
  const i = e.opgaver.length;
  let c;
  if (f != null) {
    c = Math.max(0, Math.min(i - 1, f));
  } else {
    const n = Math.floor(i * o / 3), r = o === 2 ? i - 1 : Math.floor(i * (o + 1) / 3);
    c = n + Math.floor(Math.random() * Math.max(1, r - n));
  }
  const a = e.opgaver[c];
  return { data: e, opgave: a, n: e.gitter, loesning: new Set(a.celler), klikket: new Set(), ramt: new Set(), fejl: new Set(), liv: e.liv ?? re, tilstand: T.SPILLER, beloenning: 0 };
}
function ae(e, o) {
  if (e.tilstand !== T.SPILLER || o < 0 || o >= e.n * e.n || e.klikket.has(o)) {
    return e;
  }
  const f = e.loesning.has(o), i = new Set(e.klikket).add(o), c = new Set(e.ramt), a = new Set(e.fejl);
  let { liv: n, tilstand: r, beloenning: h } = e;
  if (f) {
    c.add(o);
    if (c.size >= e.loesning.size) {
      r = T.VUNDET;
      h = (e.data.beloenning || [60, 100, 140])[e.opgave.svaer] ?? 0;
    }
  } else {
    a.add(o);
    n -= 1;
    if (n <= 0) {
      n = 0;
      r = T.TABT;
    }
  }
  return { ...e, klikket: i, ramt: c, fejl: a, liv: n, tilstand: r, beloenning: h };
}
const O = 1280, G = 768, I = 554, D = 256, k = 58, ie = 4, y = k + ie, le = [1638, 1639], z = { rigtig: 13233, forkert: 13234 }, C = { sprite: 476, x: 58, y: 32, afstand: 28 }, fe = 3;
function ce() {
  const [e, o] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let f = false;
    (async () => {
      try {
        const [i, c, a] = await Promise.all([fetch("data/picross.json").then((r) => r.ok ? r.json() : Promise.reject(new Error(`picross.json: ${r.status}`))), fetch("data/nonogram/manifest.json").then((r) => r.ok ? r.json() : Promise.reject(new Error(`manifest.json: ${r.status}`))), Sv_("nonogram")]), n = {};
        await Promise.all(Object.entries(c.textures).map(([r, h]) => new Promise((P) => {
          const E = new Image();
          E.onload = () => {
            n[r] = E;
            P();
          };
          E.onerror = () => P();
          E.src = `data/nonogram/tex/${h.file}`;
        })));
        if (!f) {
          o({ status: "ready", opg: i, manifest: c, images: n, fortaeller: a });
        }
      }
      catch (i) {
        if (!f) {
          o({ status: "error", error: i.message });
        }
      }
    })();
    return () => {
      f = true;
    };
  }, []);
  return e;
}
function H(e, o, f, i, c, a) {
  const n = o.sprites[i], r = n && f[n.assetId];
  if (r) {
    e.save();
    e.translate(c, a);
    Ql_(e, r, n);
    e.restore();
  }
}
function ue(e, o, f, i, c, a) {
  if (i) {
    for (const n of i.drawList("invers")) {
      const r = o.sprites[n.sprite], h = r && f[r.assetId];
      if (h) {
        e.save();
        e.translate(c + n.x, a + n.y);
        e.rotate((n.rot || 0) * Math.PI * 2);
        e.scale(n.scaleX * (n.flip ? -1 : 1), n.scaleY);
        Ql_(e, h, r, n.alpha);
        e.restore();
      }
    }
  }
}
const K = (e, o) => ({ x: I + y * (e % o) + k / 2, y: D + y * Math.floor(e / o) + k / 2 });
function PicrossGame({ svaer: e = 0, pause: o = false, lydTil: f = true, skrift: i = null, paaSlut: c = () => {
} }) {
  const a = ce(), n = React.useRef(o);
  n.current = o;
  const r = React.useRef(c);
  r.current = c;
  const h = React.useRef(null), P = React.useRef(null), E = React.useRef(null);
  React.useEffect(() => {
    if (a.status !== "ready") {
      return;
    }
    const v = a.manifest, S = a.images, j = rd_(Object.values(hk_));
    j.saetTil(f);
    E.current = j;
    const W = new Map(v.animations.map((p) => [p.id, p])), t = { fase: "intro", opgaveNr: 0, liv: a.opg.liv ?? 5, spil: null, celler: new Map(), beloenning: 0 };
    P.current = t;
    const Y = () => {
      t.spil = { ...oe(a.opg, e), liv: t.liv };
      t.celler = new Map();
      t.fase = "spiller";
    }, l = Ev_(a.fortaeller);
    t.fortaeller = l;
    const N = (p, M) => {
      if (l) {
        l.spil(p);
        if (M !== void 0) {
          l.saet(0, M);
        }
        l.slump();
      }
    };
    if (l) {
      l.saetLyd(f);
      l.kaede([1, 2, 3]);
    } else {
      Y();
    }
    t.klik = (p, M) => {
      if (n.current) {
        return;
      }
      if (t.fase !== "spiller") {
        if (l) {
          l.spring();
        }
        return;
      }
      const R = t.spil, d = Math.floor((p - I) / y), u = Math.floor((M - D) / y);
      if (d < 0 || u < 0 || d >= R.n || u >= R.n || (p - I) % y > k || (M - D) % y > k) {
        return;
      }
      const s = u * R.n + d;
      if (R.klikket.has(s)) {
        return;
      }
      j.spil(hk_.klik);
      const g = ae(R, s), L = g.loesning.has(s), b = W.get(L ? z.rigtig : z.forkert);
      if (b) {
        const m = new Xe_(b);
        m.advance(0);
        t.celler.set(s, m);
      }
      if (t.spil = g, t.liv = g.liv, L) {
        if (g.tilstand === T.VUNDET) {
          t.fase = "loest";
          t.venter = 1e3;
          j.spil(hk_.vundet);
          N(8);
        } else if (Math.random() < 0.5) {
          N(5);
        }
      } else if (g.tilstand === T.TABT) {
        t.fase = "tabt";
        j.spil(hk_.tabt);
        N(7);
      } else {
        const m = R.n, F = g.loesning;
        let U = s % m > 0 && s % m < m - 1 && F.has(s - 1) && F.has(s + 1);
        if (s >= m && s < m * m - m) {
          U = U || F.has(s - m) && F.has(s + m);
        }
        N(6, U && Math.random() < 0.25 ? 1 : 0);
      }
    };
    const w = h.current.getContext("2d");
    let _, X = performance.now(), B = 0, $ = false;
    const q = (p) => {
      const M = n.current ? 0 : Math.min(250, p - X);
      X = p;
      if (l && M > 0) {
        l.tik(M);
      }
      const R = l ? l.introAktiv() : false;
      t.venter = (t.venter || 0) - M;
      if (t.fase === "intro" && !R) {
        N(4);
        Y();
      } else if (t.fase === "loest" && !R && t.venter <= 0) {
        t.opgaveNr += 1;
        if (t.opgaveNr >= fe) {
          t.fase = "vundet";
          t.beloenning = (a.opg.beloenning || [60, 100, 140])[e];
          N(9);
        } else {
          Y();
        }
      }
      for (const u of t.celler.values()) {
        u.advance(M);
      }
      w.fillStyle = "#3a2a1a";
      w.fillRect(0, 0, O, G);
      for (const u of le) {
        H(w, v, S, u, O / 2, G / 2);
      }
      const d = t.spil;
      if (d) {
        for (const [u, s] of t.celler) {
          const g = K(u, d.n);
          ue(w, v, S, s, g.x, g.y);
        }
        if (t.fase === "tabt") {
          w.fillStyle = "rgba(60,40,20,.35)";
          for (const u of d.loesning) {
            if (!d.klikket.has(u)) {
              const s = K(u, d.n);
              w.fillRect(s.x - k / 2 + 6, s.y - k / 2 + 6, k - 12, k - 12);
            }
          }
        }
        if (i) {
          for (let s = 0; s < d.n; s++) {
            const g = d.opgave.raekker[s];
            let L = I - 14;
            for (let b = g.length - 1; b >= 0; b--) {
              i.tegn(w, String(g[b]), L, D + y * s + k / 2 + 2, { font: 3, str: 44, hoejre: true });
              L -= i.bredde(String(g[b]), 44, 3) + 14;
            }
          }
          for (let s = 0; s < d.n; s++) {
            const g = d.opgave.kolonner[s];
            g.forEach((L, b) => i.tegn(w, String(L), I + y * s + k / 2, D - 26 - (g.length - 1 - b) * 42, { font: 3, str: 44, midt: true }));
          }
        }
      }
      for (let u = 0; u < t.liv; u++) {
        H(w, v, S, C.sprite, C.x + u * C.afstand, C.y);
      }
      if (l) {
        l.tegn(w);
      }
      if ((t.fase === "vundet" || t.fase === "tabt") && !B) {
        B = p;
      }
      if (B && !$ && p - B > 2500 && !(l && l.introAktiv())) {
        $ = true;
        r.current({ vundet: t.fase === "vundet", beloenning: t.fase === "vundet" ? t.beloenning : 0 });
      }
      _ = requestAnimationFrame(q);
    };
    _ = requestAnimationFrame(q);
    return () => {
      cancelAnimationFrame(_);
      j.stopAlle();
      if (l) {
        l.stop();
      }
    };
  }, [a, e, i]);
  React.useEffect(() => {
    if (E.current) {
      E.current.saetTil(f);
    }
    const v = P.current;
    if (v && v.fortaeller) {
      v.fortaeller.saetLyd(f);
    }
  }, [f]);
  const Q = (v) => {
    const S = h.current.getBoundingClientRect(), j = P.current;
    if (j && j.klik) {
      j.klik((v.clientX - S.left) * O / S.width, (v.clientY - S.top) * G / S.height);
    }
  };
  return a.status === "loading" ? x.jsx(Ka_, { bredde: 1280 }) : a.status === "error" ? x.jsxs("div", { className: "msg error", children: [x.jsxs("p", { children: ["Kunne ikke indlæse: ", a.error] }), x.jsxs("p", { className: "hint", children: ["Kør ", x.jsx("code", { children: "node Tools/extract-picross.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] }) : x.jsx("div", { className: "spilflade", children: x.jsx("canvas", { ref: h, width: O, height: G, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: Q }) });
}
export { PicrossGame as default };
