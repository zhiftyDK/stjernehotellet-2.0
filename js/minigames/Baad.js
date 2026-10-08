import React from 'react';
import * as I from 'react/jsx-runtime';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { rd as rd_, xk as xk_ } from '../loaders/data-loaders.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
import { drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
const A = (t, n) => t + Math.floor(Math.random() * (n - t + 1)), c = { INTRO: 0, SEJLER: 1, MAAL: 2, TABT: 3, VUNDET: 4 }, l = { MOENT: 1, BOELGE: 2, BOEJE: 3, RAMPE: 4, SPRØJT: 5, STEN1: 6, STEN2: 7, KISTE: 8, MAAL: 9 };
function Y(t, n, r, e = false) {
  const s = { type: n, X: r * 512, Y: t.dybde.Y, z: t.dybde.z0, ramt: false, alder: 0, bane: 0 };
  if (e) {
    s.z -= A(64, 3328);
  }
  return s;
}
function J(t, n) {
  const r = n.X / n.z + t.skaerm.bredde / 2, e = n.Y / n.z + t.dybde.yPlus, s = Math.max(t.dybde.horisont, e), d = Math.max(0, Math.min(255, 255 - (t.dybde.horisont - e) * 32)) / 255;
  return { x: r, y: s, alfa: d, skala: t.dybde.skala / n.z / 65536 };
}
function ct(t, n = 0, r = false) {
  const e = t.svaerhed[n], s = { data: t, sv: e, svaer: n, tilstand: r ? c.INTRO : c.SEJLER, tid: 0, rest: 0, fart: 0, fartMaal: r ? 0 : e.topfart, fartTrin: 0, fartFra: 0, liv: e.liv, point: 0, beloenning: 0, baad: { x: 640, maal: 640, v: 0, hop: -1, hopH: 0, blink: 0, stoed: -1 }, objekter: [], sten: [], oeer: [], naesteSpray: 0, sprayVenstre: false, naesteSpawn: 0, rampeTid: -1, rampeX: 0, maalSat: false, venstre: false, hoejre: false, effekter: [], lyde: [], haendelser: [] };
  for (let d = 0; d < 32; d++) {
    s.sten.push(rt(t, true));
    s.oeer.push(at(t, true));
  }
  return s;
}
function rt(t, n) {
  const r = Y(t, 0, A(-5120, -640), n);
  r.sprite = t.sten[A(0, 1)];
  return r;
}
function at(t, n) {
  const r = Math.min(1, A(0, 4)), e = r === 0 ? A(934, 2560) : A(2560, 10240), s = Y(t, 0, 0, n);
  s.X = e * 512;
  s.sprite = t.oeer[r];
  return s;
}
function z(t, n, r = Math.random()) {
  const e = t.data, s = n === l.MAAL || n === l.BOELGE ? e.spredningBoelge : e.spredning, d = -s / 2 + s * r, h = Y(e, n, d);
  h.bane = r < 0.25 ? 0 : r > 0.75 ? 2 : 1;
  t.objekter.push(h);
}
const pt = (t, n) => n < 0 || n >= 30 ? 0 : t.baad.hop * Math.sin(Math.PI * n / 29), ut = (t, n, r, e) => ({ x0: t - r / 2, y0: n - e / 2, x1: t + r / 2, y1: n + e / 2 }), ht = (t, n) => t.x0 < n.x1 && t.x1 > n.x0 && t.y0 < n.y1 && t.y1 > n.y0;
function mt(t) {
  const n = t.data;
  return ut(t.baad.x, n.baad.y - t.baad.hopH, n.baad.felt[0], n.baad.felt[1]);
}
function yt(t, n, r) {
  const e = J(t.data, n), [s, d, h, f] = r(n);
  return { x0: e.x - h * e.skala, y0: e.y - f * e.skala, x1: e.x - h * e.skala + s * e.skala, y1: e.y - f * e.skala + d * e.skala };
}
function bt(t) {
  if (t.tilstand === c.INTRO) {
    t.tilstand = c.SEJLER;
    t.fartFra = t.fart;
    t.fartMaal = t.sv.topfart;
    t.fartTrin = 0;
  }
}
function Et(t, n) {
  const r = t.data, e = t.baad;
  if (t.tilstand === c.INTRO) {
    return;
  }
  t.tid += 33;
  if (t.fartTrin < 30) {
    t.fartTrin++;
    t.fart = t.fartFra + (t.fartMaal - t.fartFra) * (t.fartTrin / 30);
  }
  const s = t.fart * 2;
  if (t.tilstand === c.SEJLER || t.tilstand === c.MAAL) {
    const i = Math.min(r.svaerhed[1].topfart, t.fart) * 0.85 * 2;
    if (t.venstre && !t.hoejre) {
      e.maal = Math.max(r.baad.min, e.maal - i);
    }
    if (t.hoejre && !t.venstre) {
      e.maal = Math.min(r.baad.max, e.maal + i);
    }
  }
  const d = Math.abs(e.maal - e.x);
  if (d > 0) {
    e.v = Math.min(e.v + 2, r.baad.maxFart, d / 1);
    e.x += Math.sign(e.maal - e.x) * Math.min(e.v, d);
  } else {
    e.v = 0;
  }
  if (e.hop >= 0) {
    e.hop++;
    e.hopH = pt(r, e.hop);
    if (e.hop >= 30) {
      e.hop = -1;
      e.hopH = 0;
    }
  }
  if (e.stoed >= 0) {
    e.stoed += 33;
    if (e.stoed > 1e3) {
      e.stoed = -1;
    }
  }
  const h = e.hop >= 0, f = (i) => {
    i.z -= s;
    i.alder += 33;
    return i.z <= 256;
  };
  t.sten = t.sten.filter((i) => !f(i));
  t.oeer = t.oeer.filter((i) => !f(i));
  if (t.tid % 250 < 33) {
    t.sten.push(rt(r, false));
    t.oeer.push(at(r, false));
  }
  t.objekter = t.objekter.filter((i) => !f(i));
  t.objekter.sort((i, E) => E.z - i.z);
  for (const i of t.effekter) {
    i.tid += 33;
  }
  t.effekter = t.effekter.filter((i) => i.tid < 700);
  const b = (i) => t.objekter.filter((E) => E.type === i).length;
  if (t.tilstand === c.SEJLER && t.tid > t.sv.tid && (t.tilstand = c.MAAL), t.tilstand === c.MAAL && !t.maalSat && b(l.BOELGE) + b(l.RAMPE) + b(l.KISTE) === 0 && (z(t, l.MAAL, 0), z(t, l.MAAL, 1), t.maalSat = true), t.tilstand === c.SEJLER || t.tilstand === c.MAAL) {
    if (t.tid > t.naesteSpray) {
      if (Math.random() < 0.5) {
        t.sprayVenstre = !t.sprayVenstre;
        const i = t.sprayVenstre ? A(-98304, 32768) / 65536 : A(32768, 65536) / 65536;
        z(t, l.SPRØJT, i);
        t.naesteSpray = t.tid + 500;
      }
    } else if (t.tilstand === c.SEJLER && t.tid > t.naesteSpawn) {
      const i = t.sv.tilfaeldig, E = (V, X) => {
        if (A(0, X) === 0) {
          z(t, V);
          t.naesteSpawn = t.tid + 100;
        }
      };
      E(l.MOENT, i / 2);
      E(l.BOEJE, i);
      E(l.STEN1, i);
      E(l.STEN2, i);
      if (b(l.BOELGE) === 0 && A(0, 75) === 0) {
        E(l.BOELGE, 0);
      }
      if (b(l.RAMPE) === 0 && A(0, 75) === 0) {
        t.rampeX = Math.random();
        z(t, l.RAMPE, t.rampeX);
        t.naesteSpawn = t.tid + 100;
        t.rampeTid = t.tid + 500;
      }
      if (t.rampeTid > 0 && t.tid > t.rampeTid) {
        z(t, l.KISTE, t.rampeX);
        t.rampeTid = -1;
      }
    }
  }
  const k = mt(t), m = (i) => {
    for (const E of t.objekter) {
      if (!(E.ramt || E.type !== i) && ht(k, yt(t, E, n))) {
        E.ramt = true;
        return E;
      }
    }
    return null;
  };
  if (t.tilstand !== c.SEJLER && t.tilstand !== c.MAAL) {
    return;
  }
  if (t.objekter.find((i) => i.type === l.MAAL && !i.ramt && J(r, i).y >= k.y0)) {
    t.tilstand = c.VUNDET;
    t.fartFra = t.fart;
    t.fartMaal = 0;
    t.fartTrin = 0;
    t.beloenning = t.point * 4;
    t.lyde.push("penge");
    t.haendelser.push("maal");
    return;
  }
  if (h) {
    const i = m(l.KISTE);
    if (i) {
      t.lyde.push("kiste");
      et(t, 20, i);
    }
    return;
  }
  if (m(l.RAMPE)) {
    e.hop = 0;
    return;
  }
  if (e.stoed < 0 && (m(l.BOEJE) || m(l.BOELGE) || m(l.STEN1) || m(l.STEN2))) {
    if (t.liv -= 1, t.liv <= 0) {
      t.tilstand = c.TABT;
      t.fartFra = t.fart;
      t.fartMaal = 0;
      t.fartTrin = 0;
      t.beloenning = t.point;
      t.haendelser.push("tabt");
      return;
    }
    t.haendelser.push("stoed");
    t.fartFra = 1;
    t.fart = 1;
    t.fartMaal = t.sv.topfart;
    t.fartTrin = 0;
    e.stoed = 0;
    return;
  }
  const F = m(l.MOENT);
  if (F) {
    et(t, 2, F);
  }
}
function et(t, n, r) {
  t.point += n;
  t.lyde.push("penge");
  if (t.point < 250) {
    t.haendelser.push("moent");
  }
  const e = J(t.data, r);
  t.effekter.push({ x: e.x, y: r.type === l.KISTE ? e.y - 164 : e.y, tid: 0 });
}
function kt(t, n, r) {
  for (t.rest += Math.min(n, 250); t.rest >= 33;) {
    t.rest -= 33;
    Et(t, r);
  }
}
function vt() {
  const [t, n] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let r = false;
    (async () => {
      try {
        const [e, s, d] = await Promise.all([fetch("data/baad/spil.json").then((f) => f.ok ? f.json() : Promise.reject(new Error(`spil.json: ${f.status}`))), fetch("data/baad/manifest.json").then((f) => f.ok ? f.json() : Promise.reject(new Error(`manifest.json: ${f.status}`))), Sv_("baad")]), h = {};
        await Promise.all(Object.entries(s.textures).map(([f, b]) => new Promise((k) => {
          const m = new Image();
          m.onload = () => {
            h[f] = m;
            k();
          };
          m.onerror = () => k();
          m.src = `data/baad/tex/${b.file}`;
        })));
        if (!r) {
          n({ status: "ready", spil: e, manifest: s, images: h, fortaeller: d });
        }
      }
      catch (e) {
        if (!r) {
          n({ status: "error", error: e.message });
        }
      }
    })();
    return () => {
      r = true;
    };
  }, []);
  return t;
}
function N(t, n, r, e, s, d, { skala: h = 1, alfa: f = 1, vinkel: b = 0 } = {}) {
  const k = n.sprites[e], m = k && r[k.assetId];
  if (!(!m || f <= 0)) {
    t.save();
    t.globalAlpha = Math.min(1, f);
    t.translate(s, d);
    if (b) {
      t.rotate(b * Math.PI / 180);
    }
    t.scale(h, h);
    Ql_(t, m, k);
    t.restore();
  }
}
function Mt(t, n, r, e, s, d, h = 1) {
  if (e) {
    for (const f of e.drawList("invers")) {
      const b = n.sprites[f.sprite], k = b && r[b.assetId];
      if (k) {
        t.save();
        t.translate(s + f.x * h, d + f.y * h);
        t.rotate((f.rot || 0) * Math.PI * 2);
        t.scale(f.scaleX * h * (f.flip ? -1 : 1), f.scaleY * h);
        t.globalAlpha = f.alpha;
        Ql_(t, k, b);
        t.restore();
      }
    }
  }
}
function U(t, n) {
  const r = t.objekter[n.type];
  if (!r) {
    return n.sprite;
  }
  if (r.sprite) {
    return r.sprite;
  }
  if (r.baner && !r.antal) {
    return r.baner[n.bane];
  }
  const e = Math.floor(n.alder / 83);
  return r.baner ? r.baner[n.bane] + e % r.antal : r.start + e % r.antal;
}
function BoatGame({ svaer: t = 0, pause: n = false, lydTil: r = true, paaSlut: e = () => {
} }) {
  const s = vt(), d = React.useRef(n);
  d.current = n;
  const h = React.useRef(e);
  h.current = e;
  const f = React.useRef(null), b = React.useRef(null), k = React.useRef(null), m = React.useRef(null), w = React.useRef(new Map());
  React.useEffect(() => {
    if (s.status !== "ready") {
      return;
    }
    const a = s.spil, p = s.manifest, M = s.images, y = Ev_(s.fortaeller);
    m.current = y;
    const O = (g) => {
      if (y) {
        y.spil(g);
        y.slump();
      }
    };
    if (y) {
      y.saetLyd(r);
    }
    const u = ct(a, t, !!y);
    b.current = u;
    O(1);
    const P = rd_(Object.values(xk_));
    P.saetTil(r);
    k.current = P;
    // Engine sound disabled (it made the game lag).
    const C = new Map(p.animations.map((g) => [g.id, g])), G = C.get(a.objekter[8].anim) ? new Xe_(C.get(a.objekter[8].anim)) : null, ot = (g) => {
      const v = a.objekter[g.type];
      if (v && v.felt) {
        return [v.felt[0], v.felt[1], v.felt[0] / 2, v.felt[1]];
      }
      const R = p.sprites[U(a, g)];
      return R ? [R.w, R.h, R.ox, R.oy] : [1, 1, 0, 0];
    }, T = f.current.getContext("2d");
    let H, $ = performance.now(), q = 0, K = 0, _ = false;
    const Q = (g) => {
      const v = d.current ? 0 : g - $;
      $ = g;
      q += v;
      if (v > 0) {
        kt(u, v, ot);
      }
      if (y && v > 0) {
        y.tik(v);
      }
      if (u.tilstand === c.INTRO && !(y && y.optaget())) {
        bt(u);
        O(2);
      }
      for (const o of u.haendelser.splice(0)) {
        if (o === "stoed") {
          O(3);
        } else if (o === "tabt") {
          O(6);
        } else if (o === "maal") {
          O(5);
        } else if (o === "moent" && y && !y.optaget() && Math.random() < 0.5) {
          O(4);
        }
      }
      if (G) {
        G.advance(v);
      }
      for (const o of u.lyde.splice(0)) {
        if (xk_[o]) {
          P.spil(xk_[o]);
        }
      }
      T.fillStyle = "#4aa7d8";
      T.fillRect(0, 0, a.skaerm.bredde, a.skaerm.hoejde);
      for (const o of a.baggrund.sprites) {
        N(T, p, M, o, a.baggrund.x, a.baggrund.y);
      }
      const R = (o, x) => {
        const L = J(a, o);
        N(T, p, M, x, L.x, L.y, { skala: L.skala, alfa: L.alfa });
      };
      for (const o of [...u.oeer].sort((x, L) => L.z - x.z)) {
        R(o, o.sprite);
      }
      for (const o of u.objekter) {
        if (o.type === l.SPRØJT) {
          R(o, U(a, o));
        }
      }
      for (const o of [...u.sten].sort((x, L) => L.z - x.z)) {
        R(o, o.sprite);
      }
      const S = u.baad, W = S.stoed < 0 || Math.floor(S.stoed / 100) % 2 === 0, Z = (640 - S.x) * 10 / 640, tt = (o) => o.start + Math.floor(q / (1e3 / o.fps)) % o.antal;
      if (W && S.hop < 0) {
        N(T, p, M, tt(a.baad.kølvand), S.x, a.baad.y, { vinkel: -Z });
      }
      for (const o of u.objekter) {
        if (!(o.type === l.SPRØJT || o.ramt && o.type !== l.RAMPE)) {
          if (o.type === l.KISTE) {
            const x = J(a, o);
            T.globalAlpha = x.alfa;
            Mt(T, p, M, G, x.x, x.y, x.skala);
            T.globalAlpha = 1;
          } else {
            R(o, U(a, o));
          }
        }
      }
      if (W) {
        const o = S.stoed >= 0 ? a.baad.stoed : a.baad.sejl;
        N(T, p, M, tt(o), S.x, a.baad.y - S.hopH, { vinkel: -Z });
      }
      for (let o = 0; o < u.liv; o++) {
        N(T, p, M, a.liv.sprite, a.liv.x + o * a.liv.afstand, a.liv.y);
      }
      N(T, p, M, a.knapper.venstre.sprite, a.knapper.venstre.x, a.knapper.venstre.y, { alfa: u.venstre ? 1 : 0.8 });
      N(T, p, M, a.knapper.hoejre.sprite, a.knapper.hoejre.x, a.knapper.hoejre.y, { alfa: u.hoejre ? 1 : 0.8 });
      if ((u.tilstand === c.TABT || u.tilstand === c.VUNDET) && !K) {
        K = g;
      }
      if (K && !_ && g - K > 2e3 && !(y && y.optaget())) {
        _ = true;
        h.current({ vundet: u.tilstand === c.VUNDET, beloenning: u.beloenning });
      }
      H = requestAnimationFrame(Q);
    };
    H = requestAnimationFrame(Q);
    return () => {
      cancelAnimationFrame(H);
      P.stopAlle();
      if (y) {
        y.stop();
      }
    };
  }, [s, t]);
  React.useEffect(() => {
    if (k.current) {
      k.current.saetTil(r);
    }
    if (m.current) {
      m.current.saetLyd(r);
    }
  }, [r]);
  React.useEffect(() => {
    const a = (p) => {
      const M = b.current;
      if (!M || d.current) {
        return;
      }
      const y = p.type === "keydown";
      if (p.key === "ArrowLeft") {
        M.venstre = y;
        p.preventDefault();
      }
      if (p.key === "ArrowRight") {
        M.hoejre = y;
        p.preventDefault();
      }
    };
    window.addEventListener("keydown", a);
    window.addEventListener("keyup", a);
    return () => {
      window.removeEventListener("keydown", a);
      window.removeEventListener("keyup", a);
    };
  }, []);
  const D = () => {
    const a = b.current;
    if (a) {
      a.venstre = [...w.current.values()].includes("v");
      a.hoejre = [...w.current.values()].includes("h");
    }
  }, F = (a) => {
    const p = f.current.getBoundingClientRect();
    return (a.clientX - p.left) / p.width < 0.5 ? "v" : "h";
  }, i = (a) => {
    const p = b.current;
    if (p && p.tilstand === c.INTRO && m.current && !d.current) {
      m.current.spring();
      return;
    }
    try {
      f.current.setPointerCapture(a.pointerId);
    }
    catch {
    }
    w.current.set(a.pointerId, F(a));
    D();
  }, E = (a) => {
    if (w.current.has(a.pointerId)) {
      w.current.set(a.pointerId, F(a));
      D();
    }
  }, V = (a) => {
    w.current.delete(a.pointerId);
    D();
  };
  if (s.status === "loading") {
    return I.jsx(Ka_, { bredde: 1280 });
  }
  if (s.status === "error") {
    return I.jsxs("div", { className: "msg error", children: [I.jsxs("p", { children: ["Kunne ikke indlæse: ", s.error] }), I.jsxs("p", { className: "hint", children: ["Kør ", I.jsx("code", { children: "node Tools/export-baad.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] });
  }
  const X = s.spil;
  return I.jsx("div", { className: "spilflade", children: I.jsx("canvas", { ref: f, width: X.skaerm.bredde, height: X.skaerm.hoejde, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: i, onPointerMove: E, onPointerUp: V, onPointerCancel: V }) });
}
export { BoatGame as default };
