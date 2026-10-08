import React from 'react';
import * as E from 'react/jsx-runtime';
import { rd as rd_, vk as vk_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
const z = (t, r) => t + Math.floor(Math.random() * (r - t + 1));
function b(t, r, i = 1) {
  return { v: t, fra: t, til: t, trin: r, i: r, potens: i };
}
function m(t, r) {
  if (!(t.til === r && t.i >= t.trin)) {
    t.fra = t.v;
    t.til = r;
    t.i = 0;
  }
}
function P(t) {
  if (t.i++, t.i < t.trin) {
    const r = t.i / (t.trin - 1), i = t.potens === 3 ? Math.sin(Math.PI / 2 * r) : t.potens === 2 ? (1 - Math.cos(Math.PI * r)) / 2 : r;
    t.v = t.fra + (t.til - t.fra) * i;
  } else {
    t.v = t.til;
  }
}
const Y = (t) => t.v !== t.til, v = { INTRO: "intro", SPILLER: "spiller", SLUT_TALE: "slutTale", TONER: "toner", SLUT: "slut" };
function mt(t, r = 0) {
  const i = t.svaerhed[r], e = { data: t, svaer: r, sv: i, tilstand: v.INTRO, tid: 0, rest: 0, liv: 0, livAlfa: b(0, 30), introFase: 0, taler: false, lydStyrke: (() => {
      const c = b(0, 15, 2);
      m(c, 0.5);
      return c;
    })(), tilstandTid: 0, point: 0, naesteSpawn: 0, pakker: [], greb: null, stykker: [], fugle: [], revner: [], rudeAlfa: b(0, 30), skyer: [], pilot: 0, pilotTid: 0, lyde: [], foersteLevering: false, slutTid: 0 }, { baand: u } = t;
  for (let c = 0; c < u.stykker; c++) {
    const f = i.trin - Math.floor(c * i.trin / 3), x = b(u.zFra + c * (u.zTil - u.zFra) / 3, f);
    m(x, u.zTil);
    const p = b(1 - c / 6, f);
    m(p, 0.5);
    e.stykker.push({ z: x, sk: p });
  }
  const s = t.skyer;
  for (let c = 0; c < s.antal; c++) {
    e.skyer.push({ sprite: s.sprites[z(0, 2)], x: z(-s.x, s.x), y: z(-s.y, s.y), z: z(s.naer, s.fjern) });
  }
  return e;
}
function G(t) {
  t.liv = Math.max(0, t.liv - 1);
}
function bt(t) {
  const r = t.data.fugl;
  if (t.fugle.length >= r.max) {
    return;
  }
  const i = z(r.dxMin, r.dxMax) * (Math.random() < 0.5 ? -1 : 1), e = { x: b(r.x, r.trinFlyt), y: b(r.y, r.trinFlyt) }, u = { x: b(0, r.trinNaerm), y: b(0, r.trinNaerm) };
  m(u.x, i);
  m(u.y, z(r.dyMin, r.dyMax));
  const s = b(r.skalaFra / 65536, r.trinNaerm);
  m(s, 1);
  t.fugle.push({ base: e, off: u, skala: s, tilstand: 0, tid: 0, vent: 0, billede: 0 });
}
const q = (t) => ({ x: t.base.x.v + t.off.x.v, y: t.base.y.v + t.off.y.v });
function Tt(t) {
  const r = t.data.pakker;
  if (t.pakker.length >= r.max) {
    return;
  }
  const i = b(r.zFra, r.trin);
  m(i, r.zTil);
  const e = b(1, r.trin);
  m(e, 0.5);
  t.pakker.push({ type: z(0, 3), bane: r.baner[z(0, 2)], z: i, skala: e });
}
function lt(t, r) {
  return { x: t.pakker.x + r.bane / r.z.v, y: t.pakker.y / r.z.v };
}
function Lt(t) {
  const r = t.data;
  t.tid += r.trin;
  P(t.livAlfa);
  P(t.rudeAlfa);
  P(t.lydStyrke);
  for (const e of t.stykker) {
    P(e.z);
    P(e.sk);
    if (!Y(e.z)) {
      e.z = b(r.baand.zFra, t.sv.trin);
      m(e.z, r.baand.zTil);
      e.sk = b(1, t.sv.trin);
      m(e.sk, 0.5);
    }
  }
  for (const e of t.skyer) {
    e.z -= r.skyer.fart;
    if (e.z <= r.skyer.naer) {
      e.z = r.skyer.fjern;
    }
  }
  if (t.tilstand === v.INTRO) {
    if (t.introFase >= 2 && !t.livSat) {
      t.livSat = true;
      t.liv = t.sv.liv;
    }
    if (t.introFase >= 3) {
      t.tilstand = v.SPILLER;
      t.naesteSpawn = t.tid + r.pakker.hvert;
    }
  } else if (t.tilstand === v.SPILLER) {
    if (t.tid > t.naesteSpawn && !t.taler) {
      Tt(t);
      t.naesteSpawn = t.tid + r.pakker.hvert;
    }
  } else if (t.tilstand === v.SLUT_TALE) {
    if (!t.taler && t.tid > t.tilstandTid) {
      t.tilstand = v.TONER;
      m(t.lydStyrke, 0);
      t.tilstandTid = t.tid + 1e3;
    }
  } else if (t.tilstand === v.TONER && t.tid > t.tilstandTid) {
    t.tilstand = v.SLUT;
  }
  for (const e of [...t.pakker]) {
    P(e.z);
    P(e.skala);
    if (!(t.greb && t.greb.pakke === e)) {
      if (!Y(e.z)) {
        if (e.type !== r.pakker.kage && t.tilstand === v.SPILLER) {
          G(t);
          if (t.fort) {
            t.fort.push(6);
          }
        }
        t.pakker.splice(t.pakker.indexOf(e), 1);
      }
    }
  }
  t.pakker.sort((e, u) => u.z.v - e.z.v);
  let i = false;
  for (const e of [...t.fugle]) {
    const u = r.fugl;
    e.tid += r.trin;
    for (const s of [e.base.x, e.base.y, e.off.x, e.off.y, e.skala]) {
      P(s);
    }
    if (e.tid % Math.round(1e3 / u.fps) < r.trin && (e.billede = (e.billede + 1) % 4), e.tilstand === 0) {
      if (i = true, e.skala.v >= 1) {
        t.lyde.push("ramt");
        if (t.fort && t.tilstand === v.SPILLER && z(0, 3) === 0) {
          t.fort.push(5);
        }
        e.tilstand = 2;
        e.vent = e.tid + u.ventRamt;
        const s = q(e);
        t.revner.push({ x: s.x, y: s.y, alfa: (() => {
            const c = b(255, 300, 3);
            m(c, 0);
            return c;
          })() });
      }
    } else if (e.tilstand === 2 && e.tid > e.vent) {
      m(e.base.y, u.glidY);
      m(e.base.x, q(e).x);
      e.tilstand = 3;
    }
    if ((e.tilstand === 3 || e.tilstand === 1) && !Y(e.base.y) && !Y(e.base.x)) {
      t.fugle.splice(t.fugle.indexOf(e), 1);
    }
  }
  for (const e of [...t.revner]) {
    P(e.alfa);
    if (e.alfa.v <= 0) {
      t.revner.splice(t.revner.indexOf(e), 1);
    }
  }
  m(t.rudeAlfa, i ? 255 : 0);
  if (t.pilot === 1 && t.tid > t.pilotTid) {
    t.pilot = 0;
    if (z(0, 9) === 0) {
      t.lyde.push(["pilot", 0.5]);
    }
  }
  m(t.livAlfa, t.liv * 255);
  if (t.tilstand === v.SPILLER && t.liv <= 0) {
    t.tilstand = v.SLUT_TALE;
    t.tilstandTid = t.tid + 1e3;
    if (t.fort) {
      t.fort.push(8);
    }
  }
}
function St(t, r, i = 600) {
  for (t.pilotVarighed = i, t.rest += Math.min(r, 250); t.rest >= t.data.trin;) {
    t.rest -= t.data.trin;
    Lt(t);
  }
}
const ft = (t, r, i) => !!t && r > t.x - t.ox && r < t.x - t.ox + t.w && i > t.y - t.oy && i < t.y - t.oy + t.h;
function Rt(t) {
  const r = t.tilstand === v.INTRO && (t.introFase === 0 || t.introFase === 2), i = t.fugle.find((e) => e.tilstand === 0);
  if (i) {
    m(i.base.x, q(i).x);
    m(i.base.y, t.data.fugl.vaekY);
    i.tilstand = 1;
    t.lyde.push("penge");
    t.point += t.sv.point;
    return { spring: r, jaget: true, point: t.sv.point };
  }
  return { spring: r, jaget: false };
}
function wt(t, r, i, e, u) {
  if (t.tilstand === v.INTRO || t.tilstand === v.SLUT_TALE) {
    return "spring";
  }
  if (t.tilstand !== v.SPILLER) {
    return null;
  }
  for (let s = t.pakker.length - 1; s >= 0; s--) {
    const c = t.pakker[s], f = lt(t.data, c), [x, p, A, I] = e(c);
    if (r > f.x - A && r < f.x - A + x && i > f.y - I && i < f.y - I + p) {
      t.greb = { pakke: c, x: null, y: null, px: f.x, py: f.y, skala: c.skala.v };
      return "greb";
    }
  }
  if (ft(u, r, i) && z(0, 3) === 0) {
    t.lyde.push("pilotTryk");
  }
  return null;
}
function zt(t, r, i) {
  if (t.greb) {
    t.greb.x = r;
    t.greb.y = i;
  }
}
function At(t, r, i) {
  const e = t.greb;
  if (!e) {
    return null;
  }
  t.greb = null;
  const u = t.data;
  t.pakker.splice(t.pakker.indexOf(e.pakke), 1);
  const [s, c, f, x] = u.doer, p = r > s && r < f && i > c && i < x;
  return e.pakke.type === u.pakker.kage ? p ? (t.fort && t.fort.push(7), G(t), "kage_ud") : "kage_vaek" : p ? (t.lyde.push(["ud", 0.5], ["ud2", 0.5]), t.pilot = 1, t.pilotTid = t.tid + (t.pilotVarighed || 600), t.kast = (t.kast || 0) + 1, bt(t), t.foersteLevering || (t.foersteLevering = true, t.fort && t.fort.push(4)), "leveret") : (G(t), "tabt");
}
function jt() {
  const [t, r] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let i = false;
    (async () => {
      try {
        const [e, u, s] = await Promise.all([fetch("data/luftpost/spil.json").then((f) => f.ok ? f.json() : Promise.reject(new Error(`spil.json: ${f.status}`))), fetch("data/luftpost/manifest.json").then((f) => f.ok ? f.json() : Promise.reject(new Error(`manifest.json: ${f.status}`))), Sv_("luftpost")]), c = {};
        await Promise.all(Object.entries(u.textures).map(([f, x]) => new Promise((p) => {
          const A = new Image();
          A.onload = () => {
            c[f] = A;
            p();
          };
          A.onerror = () => p();
          A.src = `data/luftpost/tex/${x.file}`;
        })));
        if (!i) {
          r({ status: "ready", spil: e, manifest: u, images: c, fortaeller: s });
        }
      }
      catch (e) {
        if (!i) {
          r({ status: "error", error: e.message });
        }
      }
    })();
    return () => {
      i = true;
    };
  }, []);
  return t;
}
function R(t, r, i, e, u, s, c = 1, f = 1) {
  const x = r.sprites[e], p = x && i[x.assetId];
  if (!(!p || f <= 0)) {
    t.globalAlpha = Math.min(1, f);
    t.save();
    t.translate(u, s);
    t.scale(c, c);
    Ql_(t, p, x);
    t.restore();
    t.globalAlpha = 1;
  }
}
function ot(t, r, i, e, u, s, c = -1) {
  if (e) {
    for (const f of e.drawList("invers")) {
      if (f.sprite === c) {
        continue;
      }
      const x = r.sprites[f.sprite], p = x && i[x.assetId];
      if (p) {
        t.save();
        t.translate(u + f.x, s + f.y);
        t.rotate((f.rot || 0) * Math.PI * 2);
        t.scale(f.scaleX * (f.flip ? -1 : 1), f.scaleY);
        t.globalAlpha = f.alpha;
        Ql_(t, p, x);
        t.restore();
      }
    }
  }
}
function AirmailGame({ svaer: t = 0, pause: r = false, lydTil: i = true, paaSlut: e = () => {
}, pengeEffekt: u = () => {
} }) {
  const s = jt(), c = React.useRef(null), f = React.useRef(null), x = React.useRef(false), p = React.useRef(r);
  p.current = r;
  const A = React.useRef(e);
  A.current = e;
  React.useEffect(() => {
    if (s.status !== "ready") {
      return;
    }
    const n = s.spil, a = s.manifest, d = s.images, l = mt(n, t);
    f.current = l;
    const y = rd_(Object.values(vk_));
    y.saetTil(i);
    l.lyd = y;
    let N = -1;
    const tt = () => {
      y.loekke(vk_.fly);
      y.loekke(vk_.baand);
      y.volumen(vk_.fly, l.lydStyrke.v);
      y.volumen(vk_.baand, l.lydStyrke.v);
      N = l.lydStyrke.v;
    };
    tt();
    const K = new Map(a.animations.map((F) => [F.id, F])), T = n.pixeline, U = (F) => {
      const L = K.get(F);
      if (!L) {
        return null;
      }
      const O = new Xe_(L);
      O.advance(0);
      return O;
    }, $ = U(T.hvile), X = U(T.hvileArme);
    let _ = U(T.kast);
    const pt = K.get(T.kast) ? K.get(T.kast).duration * 10 : 600, h = Ev_(s.fortaeller);
    l.fortaeller = h;
    l.fort = [];
    if (h) {
      h.saetLyd(i);
      h.kaede([1, 2, 3]);
    }
    const g = c.current.getContext("2d");
    let B, et = performance.now(), rt = 0, nt = 0, it = false, C = false;
    const at = (F) => {
      const L = p.current ? 0 : F - et;
      if (et = F, p.current !== C && (C = p.current, C ? (y.stop(vk_.fly), y.stop(vk_.baand)) : l.tilstand !== v.SLUT && tt()), l.tilstand === v.INTRO) {
        const o = h && h.koe ? h.koe.length : 0;
        l.introFase = !h || !h.introAktiv() ? 3 : Math.max(0, 2 - o);
      }
      if (l.taler = !!h && h.taler, L > 0 && St(l, L, pt), l.lydStyrke.v !== N && l.tilstand !== v.SLUT && !C && (N = l.lydStyrke.v, y.volumen(vk_.fly, N), y.volumen(vk_.baand, N)), h && L > 0) {
        for (const o of l.fort.splice(0)) {
          h.spil(o);
          h.slump();
        }
        h.tik(L);
      }
      rt += L;
      if (l.kast !== nt) {
        nt = l.kast;
        _ = U(T.kast);
      }
      if ($) {
        $.advance(L);
      }
      if (X) {
        X.advance(L);
      }
      if (_ && l.pilot === 1) {
        _.advance(L);
      }
      for (const o of l.lyde.splice(0)) {
        const [k, M] = Array.isArray(o) ? o : [o, 1];
        if (M === 1) {
          y.spil(vk_[k]);
        } else {
          y.spilStyrke(vk_[k], M);
        }
      }
      if (l.tilstand === v.SLUT) {
        y.stopAlle();
      }
      g.fillStyle = "#7fc4ea";
      g.fillRect(0, 0, n.skaerm.bredde, n.skaerm.hoejde);
      const O = n.skyer;
      for (const o of [...l.skyer].sort((k, M) => M.z - k.z)) {
        const k = O.stoerrelse * O.naer / o.z / 65536, M = Math.min(255, O.naer * 2048 / o.z) / 255;
        R(g, a, d, o.sprite, 2 * o.x / o.z + 640, 2 * o.y / o.z + 384, k, M);
      }
      const V = n.fugl;
      for (const o of l.fugle) {
        const k = q(o);
        if (o.tilstand === 2 || o.tilstand === 3) {
          R(g, a, d, V.ramt, k.x, k.y, o.skala.v);
        } else {
          R(g, a, d, V.krop[o.billede], k.x, k.y, o.skala.v);
          if (o.tilstand === 0) {
            R(g, a, d, V.foedder[o.billede], k.x, k.y, o.skala.v);
          }
        }
      }
      for (const o of l.revner) {
        R(g, a, d, V.revne, o.x, o.y, 1, o.alfa.v / 255);
      }
      R(g, a, d, n.propel.sprites[Math.floor(rt / (1e3 / n.propel.fps)) % 3], n.propel.x, n.propel.y);
      for (const o of n.baggrund.sprites) {
        R(g, a, d, o, n.baggrund.x, n.baggrund.y);
      }
      for (const o of l.stykker) {
        R(g, a, d, n.baand.sprite, n.baand.x, n.baand.y / o.z.v, o.sk.v);
      }
      for (const o of l.pakker) {
        if (l.greb && l.greb.pakke === o) {
          continue;
        }
        const k = lt(n, o);
        R(g, a, d, n.pakker.sprites[o.type], k.x, k.y, o.skala.v);
      }
      const j = l.greb;
      if (j) {
        R(g, a, d, n.pakker.sprites[j.pakke.type], j.x == null ? j.px : j.x, j.x == null ? j.py : j.y - n.pakker.loeft, j.skala);
      }
      for (let o = 0, k = l.livAlfa.v; k > 0; o++, k = Math.max(0, k - 255)) {
        R(g, a, d, n.liv.sprite, n.liv.x + o * n.liv.afstand, n.liv.y, 1, Math.min(255, k) / 255);
      }
      if (h ? h.tegn(g, []) : ot(g, a, d, $, T.x, T.y, T.arme), ot(g, a, d, l.pilot === 1 ? _ : X, T.x, T.y), x.current) {
        g.strokeStyle = "rgba(255,0,255,.9)";
        const [o, k, M, kt] = n.doer;
        g.strokeRect(o, k, M - o, kt - k);
        const D = a.sprites[n.rude.sprite];
        if (D) {
          g.strokeRect(n.rude.x - D.w / 2, n.rude.y - D.h / 2, D.w, D.h);
        }
      }
      if (l.tilstand === v.SLUT && !it) {
        it = true;
        A.current({ vundet: true, beloenning: l.point });
      }
      B = requestAnimationFrame(at);
    };
    B = requestAnimationFrame(at);
    return () => {
      cancelAnimationFrame(B);
      y.stopAlle();
      if (h) {
        h.stop();
      }
    };
  }, [s, t]);
  React.useEffect(() => {
    const n = f.current;
    if (n && n.lyd) {
      n.lyd.saetTil(i);
    }
    if (n && n.fortaeller) {
      n.fortaeller.saetLyd(i);
    }
  }, [i]);
  React.useEffect(() => {
    const n = (a) => {
      if (a.repeat || a.code !== "Space" && a.code !== "Enter") {
        return;
      }
      const d = f.current;
      if (!(!d || p.current)) {
        a.preventDefault();
        Q(d);
      }
    };
    window.addEventListener("keydown", n);
    return () => window.removeEventListener("keydown", n);
  }, []);
  const I = (n) => {
    const a = c.current.getBoundingClientRect(), d = s.spil;
    return [(n.clientX - a.left) * d.skaerm.bredde / a.width, (n.clientY - a.top) * d.skaerm.hoejde / a.height];
  }, ct = (n) => {
    const a = s.manifest.sprites[s.spil.pakker.sprites[n.type]], d = n.skala.v;
    return [a.w * d, a.h * d, a.ox * d, a.oy * d];
  }, H = (n, a, d) => {
    const l = s.manifest.sprites[n];
    return l && { x: a, y: d, w: l.w, h: l.h, ox: l.ox, oy: l.oy };
  }, J = React.useRef(u);
  J.current = u;
  const Q = (n) => {
    const a = Rt(n);
    if (a.spring && n.fortaeller) {
      n.fortaeller.spring();
    }
    if (a.jaget) {
      J.current(a.point);
    }
  }, dt = (n) => {
    const a = f.current;
    if (!a || p.current) {
      return;
    }
    const [d, l] = I(n), y = s.spil;
    if (ft(H(y.rude.sprite, y.rude.x, y.rude.y), d, l)) {
      Q(a);
      return;
    }
    if (wt(a, d, l, ct, H(y.pilot.sprite, y.pilot.x, y.pilot.y)) === "spring") {
      if (a.fortaeller) {
        a.fortaeller.spring();
      }
      return;
    }
    try {
      if (c.current.setPointerCapture) {
        c.current.setPointerCapture(n.pointerId);
      }
    }
    catch {
    }
  }, ut = (n) => {
    if (p.current || !f.current) {
      return;
    }
    const [a, d] = I(n);
    zt(f.current, a, d);
  }, W = (n) => {
    const a = f.current;
    if (!a || p.current) {
      return;
    }
    const [d, l] = I(n);
    At(a, d, l);
  };
  if (s.status === "loading") {
    return E.jsx(Ka_, { bredde: 1280 });
  }
  if (s.status === "error") {
    return E.jsxs("div", { className: "msg error", children: [E.jsxs("p", { children: ["Kunne ikke indlæse: ", s.error] }), E.jsxs("p", { className: "hint", children: ["Kør ", E.jsx("code", { children: "node Tools/export-luftpost.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] });
  }
  const Z = s.spil;
  return E.jsx("div", { className: "spilflade", children: E.jsx("canvas", { ref: c, width: Z.skaerm.bredde, height: Z.skaerm.hoejde, style: { touchAction: "none", cursor: "grab" }, onPointerDown: dt, onPointerMove: ut, onPointerUp: W, onPointerCancel: W }) });
}
export { AirmailGame as default };
