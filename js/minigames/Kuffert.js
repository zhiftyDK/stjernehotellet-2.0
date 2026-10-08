import React from 'react';
import * as N from 'react/jsx-runtime';
import { Tween as pn_ } from '../engine/tween.js';
import { rd as rd_, kk as kk_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
import { drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
const Y = (e, t) => e + Math.floor(Math.random() * (t - e + 1)), he = (e) => Array.from({ length: e }, (t, r) => r === e - 1 ? 0 : 1 - (-1 + 2 * r / (e - 1)) ** 2), le = (e, t) => t < e.lysTabel.length ? e.lysTabel[t] * 255 : 0;
function P(e, t, r = 2) {
  return { v: e, fra: e, til: e, trin: t, i: t, potens: r };
}
function D(e, t) {
  if (e.til !== t) {
    e.fra = e.v;
    e.til = t;
    e.i = 0;
  }
}
function J(e, t) {
  e.v = t;
  e.fra = t;
  e.til = t;
  e.i = e.trin;
}
function C(e) {
  if (e.i++, e.i < e.trin) {
    const t = e.i / (e.trin - 1), r = e.potens === 3 ? Math.sin(Math.PI / 2 * t) : e.potens === 2 ? (1 - Math.cos(Math.PI * t)) / 2 : t;
    e.v = e.fra + (e.til - e.fra) * r;
  } else {
    e.v = e.til;
  }
}
const $ = (e) => e.v !== e.til, h = { KOERER_IND: "ind", SPILLER: "spiller", LAESSER: "laesser", KOERER_UD: "ud", VUNDET: "vundet", TABT: "tabt" }, q = (e, t) => e.lastbil.x[t] - e.lastbil.bredde / 2 + 640, W = (e, t) => e.lastbil.y[t] - e.lastbil.hoejde / 2 + 384;
function ye(e, t) {
  const r = t && t.sprites[e.knap.sprite];
  return r && r.w && r.h ? [r.ox / r.w, r.oy / r.h] : [0.5, 1];
}
function me(e, t = 0, r = null) {
  const l = e.svaerhed[t], u = { haandAnker: ye(e, r), data: e, svaer: t, sv: l, tilstand: h.KOERER_IND, tid: 0, rest: 0, liv: l.liv, omgang: 0, point: 0, bil: { x: P(q(e, 0), e.lastbil.trin), y: P(W(e, 0), e.lastbil.trin), pos: 0 }, gaester: [], kufferter: [], raekke: [0, 1, 2], valgt: -1, kState: 0, hop: 0, hopTid: 0, lysTabel: he(e.lys.blink), groen: e.lys.blink, roed: e.lys.blink, livVis: new pn_(0, e.liv.fade), fjeder: -1, lyde: [] };
  oe(u);
  Q(u, 1);
  u.lyde.push("tomgang");
  return u;
}
function Q(e, t) {
  const r = e.data;
  D(e.bil.x, q(r, t));
  D(e.bil.y, W(r, t));
  e.bil.pos = t;
  if (t === 2) {
    e.lyde.push("koer");
  }
}
function oe(e) {
  const t = e.data, r = e.sv.intervaller, [l, u] = r.length === 1 ? r[0] : e.svaer === 0 ? Y(0, 2) === 0 ? r[0] : r[1] : Y(0, 1) === 0 ? r[0] : r[1], a = [];
  for (; a.length < 3;) {
    const k = Y(l, u);
    if (!a.includes(k)) {
      a.push(k);
    }
  }
  const o = [];
  for (; o.length < 3;) {
    const k = Y(0, t.gaester.hoved.length - 1);
    if (!o.includes(k)) {
      o.push(k);
    }
  }
  e.gaester = a.map((k, R) => ({ form: k, person: o[R] }));
  const p = [[1, 2, 0], [2, 0, 1], [1, 0, 2], [0, 2, 1], [2, 1, 0]];
  e.raekke = [...p[Y(0, p.length - 1)]];
  const g = t.kufferter;
  e.kufferter = a.map((k) => ({ form: k, x: P(0, 15), y: P(g.yFra, 8, 3), skala: P(1, 15) }));
  e.raekke.forEach((k, R) => {
    J(e.kufferter[k].x, g.x[R]);
    D(e.kufferter[k].y, g.yHvile);
  });
  e.kState = 0;
  e.valgt = -1;
  e.hop = g.hop.length - 1;
}
const se = (e, t) => {
  const r = e.kufferter[t];
  let l = r.x.v;
  if (e.kState === 4) {
    l += e.bil.x.v - q(e.data, 1);
  }
  return { x: l, y: r.y.v + e.data.kufferter.hop[e.hop], skala: r.skala.v };
}, be = (e) => ({ x: e.bil.x.v, y: e.bil.y.v });
function ve(e) {
  const t = e.data;
  e.tid += 33;
  C(e.bil.x);
  C(e.bil.y);
  for (const l of e.kufferter) {
    C(l.x);
    C(l.y);
    C(l.skala);
  }
  if (e.groen < e.lysTabel.length) {
    e.groen++;
  }
  if (e.roed < e.lysTabel.length) {
    e.roed++;
  }
  e.livVis.mod(e.liv * 255);
  e.livVis.trin();
  if (e.fjeder >= 0) {
    e.fjeder += 33;
    if (e.fjeder > 9 * 83) {
      e.fjeder = -1;
    }
  }
  const r = t.kufferter;
  if (e.kState === 0 && !$(e.kufferter[0].y)) {
    e.kState = 1;
  } else if (e.kState === 2) {
    if (e.hop >= r.hop.length - 1) {
      e.raekke.forEach((l, u) => {
        D(e.kufferter[l].x, r.maal[u]);
      });
      for (const l of e.kufferter) {
        l.y = P(l.y.v, 8, 3);
        D(l.y, r.yMaal);
        l.skala = P(l.skala.v, 8, 3);
        D(l.skala, 0.5);
      }
      e.kState = 3;
    } else if (e.tid > e.hopTid) {
      e.hop++;
      e.hopTid = e.tid + r.hopTrin;
    }
  } else if (e.kState === 3 && !$(e.kufferter[0].y)) {
    e.kState = 4;
  }
  switch (e.tilstand) {
    case h.KOERER_IND:
      if (!$(e.bil.x)) {
        e.lyde.push("bremse");
        e.tilstand = h.SPILLER;
      }
      break;
    case h.LAESSER:
      if (e.kState === 4) {
        Q(e, 2);
        e.tilstand = h.KOERER_UD;
      }
      break;
    case h.KOERER_UD:
      if (!$(e.bil.x) && !e.replik) {
        if (e.omgang < t.runder) {
          J(e.bil.x, q(t, 0));
          J(e.bil.y, W(t, 0));
          oe(e);
          Q(e, 1);
          e.tilstand = h.KOERER_IND;
        } else {
          e.tilstand = h.VUNDET;
        }
      }
      break;
  }
}
function xe(e, t) {
  for (e.rest += Math.min(t, 250); e.rest >= 33;) {
    e.rest -= 33;
    ve(e);
  }
}
const Ee = (e, t, r, l) => {
  const u = se(e, t), [a, o] = e.data.kufferter.felt;
  return r > u.x - a && r < u.x + a && l > u.y - o && l < u.y + o;
};
function Re(e, t, r) {
  const l = e.tilstand === h.SPILLER;
  if (!l && !(e.tilstand === h.KOERER_IND && e.omgang > 0)) {
    return null;
  }
  const u = e.data;
  if (e.kState === 1) {
    const b = [0, 1, 2].find((v) => Ee(e, v, t, r));
    if (b === void 0) {
      e.valgt = -1;
      for (const v of e.kufferter) {
        D(v.skala, 1);
      }
    } else {
      if (e.valgt < 0) {
        e.valgt = b;
        D(e.kufferter[b].skala, 73728 / 65536);
        return "valgt";
      }
      if (e.valgt !== b) {
        const v = e.valgt, _ = e.kufferter[v].x.til;
        D(e.kufferter[v].x, e.kufferter[b].x.til);
        D(e.kufferter[b].x, _);
        const H = e.raekke.indexOf(v), n = e.raekke.indexOf(b);
        e.raekke[H] = b;
        e.raekke[n] = v;
        e.lyde.push("byt");
      }
      e.valgt = -1;
      for (const v of e.kufferter) {
        D(v.skala, 1);
      }
      return "byttet";
    }
  }
  if (!l) {
    return null;
  }
  const a = u.knap, [o, p] = a.felt, [g, k] = e.haandAnker, R = a.x - Math.trunc(o * g), U = a.y - Math.trunc(p * k);
  return t > R && t < R + o && r > U && r < U + p ? e.raekke.every((v, _) => v === _) ? (e.groen = 0, e.omgang += 1, e.omgang >= u.runder && (e.point = e.sv.beloenning, e.lyde.push("vundet")), e.lyde.push("rigtig"), e.fjeder = 0, e.kState = 2, e.hop = 0, e.hopTid = e.tid + u.kufferter.hopTrin, e.valgt = -1, e.tilstand = h.LAESSER, "rigtigt") : (e.roed = 0, e.liv -= 1, e.liv <= 0 && (e.tilstand = h.TABT), "forkert") : null;
}
function je() {
  const [e, t] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let r = false;
    (async () => {
      try {
        const [l, u, a] = await Promise.all([fetch("data/kuffert/spil.json").then((p) => p.ok ? p.json() : Promise.reject(new Error(`spil.json: ${p.status}`))), fetch("data/kuffert/manifest.json").then((p) => p.ok ? p.json() : Promise.reject(new Error(`manifest.json: ${p.status}`))), Sv_("kuffert")]), o = {};
        await Promise.all(Object.entries(u.textures).map(([p, g]) => new Promise((k) => {
          const R = new Image();
          R.onload = () => {
            o[p] = R;
            k();
          };
          R.onerror = () => k();
          R.src = `data/kuffert/tex/${g.file}`;
        })));
        if (!r) {
          t({ status: "ready", spil: l, manifest: u, images: o, fortaeller: a });
        }
      }
      catch (l) {
        if (!r) {
          t({ status: "error", error: l.message });
        }
      }
    })();
    return () => {
      r = true;
    };
  }, []);
  return e;
}
function E(e, t, r, l, u, a, o = 1, p = 1) {
  const g = t.sprites[l], k = g && r[g.assetId];
  if (!(!k || p <= 0)) {
    e.globalAlpha = Math.min(1, p);
    e.save();
    e.translate(u, a);
    e.scale(o, o);
    Ql_(e, k, g);
    e.restore();
    e.globalAlpha = 1;
  }
}
function V(e, t, r, l, u, a) {
  if (l) {
    for (const o of l.drawList("invers")) {
      const p = t.sprites[o.sprite], g = p && r[p.assetId];
      if (g) {
        e.save();
        e.translate(u + o.x, a + o.y);
        e.rotate((o.rot || 0) * Math.PI * 2);
        e.scale(o.scaleX * (o.flip ? -1 : 1), o.scaleY);
        e.globalAlpha = o.alpha;
        Ql_(e, g, p);
        e.restore();
      }
    }
  }
}
function SuitcaseGame({ svaer: e = 0, pause: t = false, lydTil: r = true, paaSlut: l = () => {
}, pengeEffekt: u = () => {
} }) {
  const a = je(), o = React.useRef(null), p = React.useRef(null), g = React.useRef(null), k = React.useRef(t);
  k.current = t;
  const R = React.useRef(l);
  R.current = l;
  const U = React.useRef(u);
  U.current = u;
  React.useEffect(() => {
    if (a.status !== "ready") {
      return;
    }
    const n = a.spil, s = a.manifest, d = a.images, i = me(n, e, s);
    p.current = i;
    const y = rd_(Object.values(kk_));
    y.saetTil(r);
    g.current = y;
    const O = new Map(s.animations.map((j) => [j.id, j])), A = new Map(), I = (j) => {
      if (!A.has(j)) {
        const L = O.get(j), S = L ? new Xe_(L) : null;
        if (S) {
          S.advance(0);
        }
        A.set(j, S);
      }
      return A.get(j);
    }, m = Ev_(a.fortaeller);
    i.fortaeller = m;
    if (m) {
      m.saetLyd(r);
    }
    const Z = (j) => {
      if (m) {
        m.spil(j);
        m.slump();
      }
    };
    let ee = i.tilstand, G = false;
    const f = o.current.getContext("2d");
    let z, te = performance.now(), X = 0, re = false;
    const ne = (j) => {
      const L = k.current ? 0 : j - te;
      te = j;
      i.replik = !!(m && m.optaget());
      if (L > 0) {
        xe(i, L);
      }
      if (m && i.tilstand !== ee) {
        if (i.tilstand === h.SPILLER && i.omgang === 0) {
          m.kaede([1, 2, 3]);
        }
        if (i.tilstand === h.KOERER_IND && i.omgang > 0) {
          Z(i.omgang + 7);
        }
        if (i.tilstand === h.VUNDET) {
          Z(11);
        }
        ee = i.tilstand;
      }
      if ((i.tilstand === h.VUNDET || i.tilstand === h.TABT) && !X) {
        X = j;
      }
      if (X && !re && j - X > 1500 && !(m && m.optaget())) {
        re = true;
        R.current({ vundet: i.tilstand === h.VUNDET, beloenning: i.tilstand === h.VUNDET ? i.point : 0 });
      }
      if (m && L > 0) {
        m.tik(L);
      }
      for (const c of A.values()) {
        if (c) {
          c.advance(L);
        }
      }
      for (const c of i.lyde.splice(0)) {
        if (c === "koer" || c === "tomgang" || c === "bremse") {
          y.spilStyrke(kk_[c], n.lastbilLyd);
        } else {
          y.spil(kk_[c]);
        }
        if (c === "koer") {
          G = true;
        }
      }
      if (G && !y.spiller(kk_.koer)) {
        y.spilStyrke(kk_.tomgang, n.lastbilLyd);
        G = false;
      }
      f.fillStyle = "#8fd0ef";
      f.fillRect(0, 0, n.skaerm.bredde, n.skaerm.hoejde);
      for (const c of n.baggrund.sprites) {
        E(f, s, d, c, n.baggrund.x, n.baggrund.y);
      }
      const S = be(i);
      E(f, s, d, n.lastbil.sprite, S.x, S.y);
      V(f, s, d, I(n.lastbil.anim), S.x + n.lastbil.animDx, S.y + n.lastbil.animDy);
      i.gaester.forEach((c, K) => {
        const M = S.x + n.gaester.x[K];
        V(f, s, d, I(n.gaester.krop[c.person]), M, n.gaester.y);
        V(f, s, d, I(n.gaester.silhuet[c.form]), M, n.gaester.y);
        V(f, s, d, I(n.gaester.hoved[c.person]), M, n.gaester.y);
      });
      const ie = () => i.kufferter.forEach((c, K) => {
        const M = se(i, K);
        f.save();
        f.translate(M.x, M.y);
        f.scale(M.skala, M.skala);
        V(f, s, d, I(n.kufferter.anims[c.form]), 0, 0);
        f.restore();
      });
      if (i.kState === 4) {
        ie();
      }
      for (const c of n.lastbil.hjul.x) {
        E(f, s, d, n.lastbil.hjul.sprite, S.x + c, S.y + n.lastbil.hjul.dy);
      }
      if (m) {
        m.tegn(f);
      } else if (n.pixeline) {
        V(f, s, d, I(n.pixeline.hvile), n.pixeline.x, n.pixeline.y);
      }
      for (const c of n.overlay) {
        E(f, s, d, c.sprite, c.x, c.y);
      }
      const x = n.lys;
      E(f, s, d, x.ramme, x.x, x.y);
      E(f, s, d, x.gul, x.p1[0], x.p1[1]);
      E(f, s, d, x.gul, x.p2[0], x.p2[1]);
      E(f, s, d, x.groen, x.p1[0], x.p1[1], 1, le(i, i.groen) / 255);
      E(f, s, d, x.roed, x.p2[0], x.p2[1], 1, le(i, i.roed) / 255);
      const F = n.fjeder, fe = i.fjeder >= 0 ? F.skud[Math.min(F.skud.length - 1, Math.floor(i.fjeder / 83))] : F.hvile[0];
      E(f, s, d, fe, F.x, F.y);
      if (i.kState !== 4) {
        ie();
      }
      const w = n.knap;
      E(f, s, d, w.bag.sprite, w.bag.x, w.bag.y);
      E(f, s, d, w.sprite, w.x, w.y);
      E(f, s, d, w.for.sprite, w.for.x, w.for.y);
      for (let c = 0, K = Math.round(i.livVis.v); K > 0; c++, K -= 255) {
        E(f, s, d, n.liv.sprite, n.liv.x + c * n.liv.afstand, n.liv.y, 1, Math.min(K, 255) / 255);
      }
      for (const c of n.forgrund.sprites) {
        E(f, s, d, c, n.forgrund.x, n.forgrund.y);
      }
      z = requestAnimationFrame(ne);
    };
    z = requestAnimationFrame(ne);
    return () => {
      cancelAnimationFrame(z);
      y.stopAlle();
      if (m) {
        m.stop();
      }
    };
  }, [a, e]);
  React.useEffect(() => {
    if (g.current) {
      g.current.saetTil(r);
    }
    const n = p.current;
    if (n && n.fortaeller) {
      n.fortaeller.saetLyd(r);
    }
  }, [r]);
  const b = React.useRef(null), v = (n) => {
    if (b.current === n.pointerId) {
      b.current = null;
    }
  }, _ = (n) => {
    if (b.current !== null && b.current !== n.pointerId) {
      return;
    }
    b.current = n.pointerId;
    const s = o.current.getBoundingClientRect(), d = a.spil, i = p.current;
    if (!i || k.current) {
      return;
    }
    const y = i.fortaeller;
    if (y && (y.koe && y.koe.length > 1 || y.koe && y.koe.length === 1 && y.optaget())) {
      y.spring();
      return;
    }
    const O = Re(i, (n.clientX - s.left) * d.skaerm.bredde / s.width, (n.clientY - s.top) * d.skaerm.hoejde / s.height);
    if (O === "rigtigt" && i.omgang >= d.runder && U.current(i.point, d.pengeEffekt[0], d.pengeEffekt[1]), !y) {
      return;
    }
    const A = (I) => {
      y.spil(I);
      y.slump();
    };
    if (O === "byttet" && Math.random() < 0.1) {
      A(4);
    }
    if (O === "forkert") {
      A(i.liv > 0 ? 6 : 10);
    }
    if (O === "rigtigt") {
      A(7);
    }
  };
  if (a.status === "loading") {
    return N.jsx(Ka_, { bredde: 1280 });
  }
  if (a.status === "error") {
    return N.jsxs("div", { className: "msg error", children: [N.jsxs("p", { children: ["Kunne ikke indlæse: ", a.error] }), N.jsxs("p", { className: "hint", children: ["Kør ", N.jsx("code", { children: "node Tools/export-kuffert.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] });
  }
  const H = a.spil;
  return N.jsx("div", { className: "spilflade", children: N.jsx("canvas", { ref: o, width: H.skaerm.bredde, height: H.skaerm.hoejde, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: _, onPointerUp: v, onPointerCancel: v }) });
}
export { SuitcaseGame as default };
