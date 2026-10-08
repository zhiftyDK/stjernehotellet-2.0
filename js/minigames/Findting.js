import React from 'react';
import * as X from 'react/jsx-runtime';
import { Tween as pn_, FRAME_MS as zc_ } from '../engine/tween.js';
import { drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
import { rd as rd_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { l as l_ } from '../engine/kinetic-scroll.js';
const N = 1280, U = 768, w = { SPILLER: "spiller", VUNDET: "vundet", TID_UDE: "tid_ude", VENTER: "venter", SLUT: "slut" }, ee = [640, 384], O = [984, 688, 1024, 728], de = 99, q = (e, i) => e + Math.floor(Math.random() * (i - e + 1));
function me(e, i = 0) {
  const o = e.svaerhed[i], l = q(o.min, o.max), s = q(0, 11), u = [];
  for (; u.length < l;) {
    const c = q(0, e.genstande.pladser.length - 1);
    if (!u.includes(c)) {
      u.push(c);
    }
  }
  const [f, n] = e.genstande.stoerrelser[s], g = u.map((c) => {
    const [L, E] = e.genstande.pladser[c];
    return { x: L, y: E, bredde: f, hoejde: n, fundet: false };
  });
  return { scene: e, svaer: i, type: s, antal: l, genstande: g, fundet: 0, tilstand: w.SPILLER, tid: o.tid, ur: 0, slutTid: 0, taler: false, effekt: null, beloenning: 0, lyde: [], fort: [], kam: { x: Math.trunc((e.verden.bredde - N) / 2), y: Math.trunc((e.verden.hoejde - U) / 2) }, taster: { op: false, ned: false, venstre: false, hoejre: false } };
}
function K(e) {
  if (!e.rulX) {
    e.rulX = l_(0, e.scene.verden.bredde - N);
    e.rulY = l_(0, e.scene.verden.hoejde - U);
    e.rulX.flytTil(e.kam.x);
    e.rulY.flytTil(e.kam.y);
  }
  return e;
}
function pe(e, i, o) {
  K(e);
  e.rulX.tryk(i);
  e.rulY.tryk(o);
}
function ge(e, i, o) {
  K(e);
  e.rulX.flyt(i);
  e.rulY.flyt(o);
}
function ke(e) {
  K(e);
  e.rulX.slip();
  e.rulY.slip();
}
function he(e, i) {
  K(e);
  const o = i >= 1e3 ? 400 : Math.trunc(i * 0.4), l = e.taster;
  if (l.op) {
    e.rulY.maal(e.rulY.maalet - o);
  }
  if (l.ned) {
    e.rulY.maal(e.rulY.maalet + o);
  }
  if (l.venstre) {
    e.rulX.maal(e.rulX.maalet - o);
  }
  if (l.hoejre) {
    e.rulX.maal(e.rulX.maalet + o);
  }
  e.kam.x = e.rulX.tik(i);
  e.kam.y = e.rulY.tik(i);
}
function te(e, i, o) {
  if (e.tilstand !== w.SPILLER) {
    return null;
  }
  const l = i + e.kam.x, s = o + e.kam.y;
  for (const u of e.genstande) {
    if (!u.fundet && l >= u.x - u.bredde / 2 && l <= u.x + u.bredde / 2 && s >= u.y - u.hoejde / 2 && s <= u.y + u.hoejde / 2) {
      u.fundet = true;
      e.fundet++;
      if (e.fundet !== e.antal) {
        e.fort.push(4);
      }
      e.lyde.push("fundet");
      if (e.fundet === e.antal) {
        e.tilstand = w.VUNDET;
        e.beloenning = e.scene.beloenning;
        e.fort.push(5);
        e.lyde.push("vundet");
        e.effekt = { beloeb: e.beloenning, x: e.scene.effekt[0], y: e.scene.effekt[1] };
      }
      return { traf: true, faerdig: e.tilstand === w.VUNDET };
    }
  }
  return { traf: false, faerdig: false };
}
const ye = (e, i) => e >= O[0] && e <= O[2] && i >= O[1] && i <= O[3];
function ve(e, i) {
  e.ur += i;
  if (e.tilstand === w.SPILLER) {
    if (e.tid >= 0) {
      e.tid -= i;
      if (e.tid <= 0) {
        e.tid = 0;
        e.tilstand = w.TID_UDE;
      }
    }
  } else if (e.tilstand === w.VUNDET || e.tilstand === w.TID_UDE) {
    if (!e.taler) {
      e.tilstand = w.VENTER;
      e.slutTid = e.ur + 1e3;
    }
  } else if (e.tilstand === w.VENTER && e.ur > e.slutTid) {
    e.tilstand = w.SLUT;
  }
}
const xe = (e) => Math.trunc((e.tid + 500) / 1e3);
function we(e) {
  const i = [], o = e.scene, l = (s) => {
    const u = -e.kam.x * s.parallakse + (s.navn === "forrest", 0), f = s.navn === "forrest" ? -s.dy - e.kam.y * s.parallakse : -(e.kam.y + s.dy);
    for (let n = 0; n < s.raekker; n++) {
      for (let g = 0; g < s.kolonner; g++) {
        const c = s.felter[n][g];
        if (c <= 0 || c >= s.antal) {
          continue;
        }
        const L = g * o.flise + u, E = n * o.flise + f;
        if (!(L <= -o.flise || L >= N || E <= -o.flise || E >= U)) {
          i.push({ sprite: s.base + c, x: L, y: E });
        }
      }
    }
  };
  l(o.lag[0]);
  for (const s of e.genstande) {
    i.push({ anim: (s.fundet ? 12 : 0) + e.type, x: s.x - e.kam.x, y: s.y - e.kam.y });
  }
  l(o.lag[1]);
  l(o.lag[2]);
  return i;
}
const Ee = 348, Re = 170, be = 410, ne = 591, re = 1602, Le = 1612;
function Te(e) {
  const i = new pn_(768, 15);
  i.mod(ne);
  const o = [], l = [], s = [], u = [];
  for (let r = 0; r < 10; r++) {
    o.push({ x: new pn_(r * be - 1920, 30), y: new pn_(864, 30) });
    l.push({ x: new pn_(0, 10), y: new pn_(0, 10) });
    s.push(new pn_(1, 10));
    u.push(new pn_(0, 10));
  }
  let f = o;
  const n = new pn_(-1, 30);
  let g = null, c = 0;
  const L = () => Math.floor(n.v), E = () => {
    const r = L();
    if (g !== r) {
      if (r >= 0) {
        let d = Ee;
        for (let y = 0; y < 10; y++) {
          if (y >= 1) {
            const T = e.sprites[re + y], Y = T ? T.w : 0;
            d += (r === y || r + 1 === y ? Math.floor(Y * 3 / 2) : Y) + 1;
          }
          f[y].x.mod(d);
          f[y].y.mod(Re + ne);
          s[y].mod(r === y ? 2 : 1);
        }
      }
      g = r;
    }
  };
  return { visTal() {
      n.saet(-3);
      n.mod(-1);
    }, hurtigt() {
      if (f !== l) {
        for (let r = 0; r < 10; r++) {
          for (const d of ["x", "y"]) {
            l[r][d].saet(f[r][d].v);
            l[r][d].mod(f[r][d].maal);
          }
        }
        f = l;
      }
    }, vaelg(r) {
      n.mod(r - 1);
    }, fremhaev(r) {
      u.forEach((d, y) => d.mod(y <= r - 1 ? 255 : 0));
    }, get y() {
      return i.v;
    }, trin(r) {
      for (c += r; c >= zc_;) {
        c -= zc_;
        i.trin();
        n.trin();
        for (let d = 0; d < 10; d++) {
          f[d].x.trin();
          f[d].y.trin();
          s[d].trin();
          u[d].trin();
        }
        E();
      }
    }, tegn(r, d, y) {
      const T = (R, t, m, v = 1, D = 1) => {
        const k = e.sprites[R], a = k && d[k.assetId];
        if (!(!a || D <= 0)) {
          r.save();
          r.translate(t, m);
          if (v !== 1) {
            r.scale(v, v);
          }
          Ql_(r, a, k, D);
          r.restore();
        }
      };
      for (const R of [1598, 1599, 1601, 1600]) {
        T(R, 640, 384);
      }
      r.fillStyle = "#000";
      r.fillRect(0, 0, 1280, 234);
      r.fillRect(0, 534, 1280, 234);
      r.fillRect(0, 234, 384, 300);
      r.fillRect(896, 234, 384, 300);
      const Y = i.v;
      T(1594, 640, Y);
      T(1595, 640, Y);
      T(1597, 1200, Y);
      y(1200, Y);
      for (let R = 0; R < 10; R++) {
        const t = f[R].x.v, m = f[R].y.v, v = s[R].v;
        T(re + R, t, m, v);
        T(Le + R, t, m, v, u[R].v / 255);
      }
      T(1596, 640, 384);
    } };
}
const ie = { fundet: 994, vundet: 976 };
function je() {
  const [e, i] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let o = false;
    (async () => {
      try {
        const [l, s, u, f] = await Promise.all([fetch("data/findting/scene.json").then((c) => c.ok ? c.json() : Promise.reject(new Error(`scene.json: ${c.status}`))), fetch("data/findting/manifest.json").then((c) => c.ok ? c.json() : Promise.reject(new Error(`manifest.json: ${c.status}`))), Sv_("findting"), fetch("data/findting/kikkert/manifest.json").then((c) => c.ok ? c.json() : null).catch(() => null)]), n = {}, g = (c, L) => Promise.all(Object.entries(L).map(([E, S]) => new Promise((r) => {
          const d = new Image();
          d.onload = () => {
            n[E] = d;
            r();
          };
          d.onerror = () => r();
          d.src = `data/findting/${c}${S.file}`;
        })));
        await Promise.all([g("tex/", s.textures), f ? g("kikkert/tex/", f.textures) : null]);
        if (!o) {
          i({ status: "ready", scene: l, manifest: s, images: n, fortaeller: u, kikkert: f });
        }
      }
      catch (l) {
        if (!o) {
          i({ status: "error", error: l.message });
        }
      }
    })();
    return () => {
      o = true;
    };
  }, []);
  return e;
}
function H(e, i, o, l, s, u) {
  const f = i.sprites[l], n = f && o[f.assetId];
  if (n) {
    e.save();
    e.translate(s, u);
    Ql_(e, n, f);
    e.restore();
  }
}
function G(e, i, o, l, s, u) {
  if (l) {
    for (const f of l.drawList("invers")) {
      const n = i.sprites[f.sprite], g = n && o[n.assetId];
      if (g) {
        e.save();
        e.translate(s + f.x, u + f.y);
        e.rotate((f.rot || 0) * Math.PI * 2);
        e.scale(f.scaleX * (f.flip ? -1 : 1), f.scaleY);
        e.globalAlpha = 1;
        Ql_(e, g, n, f.alpha);
        e.restore();
      }
    }
  }
}
const A = { x: 1016, y: 548, b: 232, h: 196 }, V = { x: 256, y: 96, tekstY: 106 };
function FindThingsGame({ svaer: e = 0, pause: i = false, lydTil: o = true, skrift: l = null, ui: s = null, paaSlut: u = () => {
}, pengeEffekt: f = () => {
} }) {
  const n = je(), g = React.useRef(i);
  g.current = i;
  const c = React.useRef(u);
  c.current = u;
  const L = React.useRef(f);
  L.current = f;
  const E = React.useRef(null), S = React.useRef(null), r = React.useRef(null), d = React.useRef(null);
  React.useEffect(() => {
    if (n.status !== "ready") {
      return;
    }
    const t = me(n.scene, e);
    S.current = t;
    const m = rd_(Object.values(ie));
    m.saetTil(o);
    r.current = m;
    const v = new Map(n.manifest.animations.map((F) => [F.id, F])), D = (F) => {
      const b = v.get(n.scene.genstande.anims[F]);
      if (!b) {
        return null;
      }
      const h = new Xe_(b);
      h.advance(0);
      return h;
    }, k = { 0: D(t.type), 12: D(t.type + 12) }, a = Ev_(n.fortaeller);
    t.fortaeller = a;
    if (a) {
      a.saetLyd(o);
      a.spil(1);
      a.slump();
      t.intro = true;
    }
    const p = n.kikkert ? Te(n.kikkert) : null, P = new pn_(255, 30);
    P.mod(0);
    let I = t.intro && p ? 0 : 2, $ = 0;
    const oe = () => {
      if (p) {
        I = 1;
        P.mod(255);
        p.hurtigt();
        p.vaelg(t.antal);
      }
    };
    if (p) {
      p.visTal();
      if (!t.intro) {
        p.hurtigt();
        p.vaelg(t.antal);
      }
    }
    let C = t.fundet;
    const x = E.current.getContext("2d");
    let B, J = performance.now(), Q = false;
    const W = (F) => {
      const b = g.current ? 0 : F - J;
      J = F;
      if (b > 0 && a && t.intro && !a.optaget()) {
        t.intro = false;
        a.spil(2);
        a.saet(0, t.antal - 2);
        a.saet(1, t.type);
        a.slump();
        oe();
      }
      if (b > 0) {
        he(t, b);
      }
      t.taler = !!a && a.taler;
      if (!t.intro && b > 0) {
        ve(t, b);
        te(t, ee[0], ee[1]);
      }
      for (const h of t.lyde.splice(0)) {
        m.spil(ie[h]);
      }
      if (t.effekt && (L.current(t.effekt.beloeb, t.effekt.x, t.effekt.y), t.effekt = null), a) {
        for (const h of t.fort.splice(0)) {
          a.spil(h);
          a.slump();
        }
      } else {
        t.fort.length = 0;
      }
      if (a && b > 0) {
        a.tik(b);
      }
      for (const h of Object.values(k)) {
        if (h) {
          h.advance(b);
        }
      }
      if (p) {
        for (t.fundet !== C && (C = t.fundet, p.fremhaev(C)), $ += b; $ >= zc_;) {
          $ -= zc_;
          P.trin();
        }
        if (I === 1 && !P.bevaeger) {
          I = 2;
          P.mod(0);
        }
        if (I === 2) {
          p.trin(b);
        }
      }
      if (I < 2) {
        x.fillStyle = "#000";
        x.fillRect(0, 0, N, U);
        H(x, n.kikkert, n.images, 1634, 640, 384);
        H(x, n.kikkert, n.images, 1635, 640, 384);
      } else {
        x.fillStyle = "#8fd0ef";
        x.fillRect(0, 0, N, U);
        for (const h of we(t)) {
          if (h.anim !== void 0) {
            G(x, n.manifest, n.images, k[h.anim >= 12 ? 12 : 0], h.x, h.y);
          } else {
            H(x, n.manifest, n.images, h.sprite, h.x, h.y);
          }
        }
      }
      if (a && (I < 2 || !p)) {
        a.tegn(x);
      }
      if (p && I === 2) {
        p.tegn(x, n.images, (h, se) => G(x, n.manifest, n.images, k[0], h, se));
      } else if (!p) {
        if (s) {
          s.ramme(x, A.x, A.y, A.b, A.h, "punkt");
        }
        G(x, n.manifest, n.images, k[0], A.x + A.b / 2, A.y + 84);
        if (l) {
          l.tegn(x, `${t.fundet} / ${t.antal}`, A.x + A.b / 2, A.y + A.h - 30, { str: 37, midt: true });
        }
      }
      if (t.tid >= 0 && I === 2) {
        if (s) {
          s.faelles(x, 1733, V.x, V.y);
        }
        if (l) {
          l.tegn(x, String(xe(t)), V.x, V.tekstY, { str: 73, midt: true, op: true });
        }
      }
      if (p && P.v > 0) {
        x.fillStyle = `rgba(0,0,0,${P.v / 255})`;
        x.fillRect(0, 0, N, U);
      }
      if (t.tilstand === w.SLUT && !Q) {
        Q = true;
        c.current({ vundet: t.beloenning > 0, beloenning: t.beloenning });
      }
      B = requestAnimationFrame(W);
    };
    B = requestAnimationFrame(W);
    return () => {
      cancelAnimationFrame(B);
      m.stopAlle();
      if (a) {
        a.stop();
      }
    };
  }, [n, e, l, s]);
  React.useEffect(() => {
    if (r.current) {
      r.current.saetTil(o);
    }
    const t = S.current;
    if (t && t.fortaeller) {
      t.fortaeller.saetLyd(o);
    }
  }, [o]);
  React.useEffect(() => {
    const t = { ArrowUp: "op", ArrowDown: "ned", ArrowLeft: "venstre", ArrowRight: "hoejre" }, m = (a) => (p) => {
      const P = t[p.code], I = S.current;
      if (!(!P || !I)) {
        p.preventDefault();
        I.taster[P] = a;
      }
    }, v = m(true), D = m(false), k = () => {
      const a = S.current;
      if (a) {
        for (const p of Object.keys(a.taster)) {
          a.taster[p] = false;
        }
      }
    };
    window.addEventListener("keydown", v);
    window.addEventListener("keyup", D);
    window.addEventListener("blur", k);
    return () => {
      window.removeEventListener("keydown", v);
      window.removeEventListener("keyup", D);
      window.removeEventListener("blur", k);
    };
  }, []);
  const y = (t) => {
    const m = E.current.getBoundingClientRect();
    return [(t.clientX - m.left) * N / m.width, (t.clientY - m.top) * U / m.height];
  }, T = (t) => {
    if (g.current) {
      return;
    }
    const [m, v] = y(t);
    d.current = { t0: performance.now() };
    pe(S.current, m, v);
    try {
      if (E.current.setPointerCapture) {
        E.current.setPointerCapture(t.pointerId);
      }
    }
    catch {
    }
  }, Y = (t) => {
    if (!d.current || g.current) {
      return;
    }
    const [m, v] = y(t);
    ge(S.current, m, v);
  }, R = (t) => {
    const m = d.current;
    if (d.current = null, m && ke(S.current), !m || performance.now() - m.t0 > de) {
      return;
    }
    const [v, D] = y(t), k = S.current, a = k.fortaeller;
    if (ye(v, D)) {
      if (a && k.intro) {
        a.spring();
      } else if (a && k.tilstand === w.SPILLER) {
        a.spil(6);
        a.slump();
      }
      return;
    }
    if (k.intro || k.tilstand === w.VUNDET || k.tilstand === w.TID_UDE) {
      if (a) {
        a.spring();
      }
      return;
    }
    if (k.tilstand === w.SPILLER) {
      te(k, v, D);
    }
  };
  return n.status === "loading" ? X.jsx(Ka_, { bredde: 1280 }) : n.status === "error" ? X.jsxs("div", { className: "msg error", children: [X.jsxs("p", { children: ["Kunne ikke indlæse: ", n.error] }), X.jsxs("p", { className: "hint", children: ["Kør ", X.jsx("code", { children: "node Tools/export-findting.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] }) : X.jsx("div", { className: "spilflade", children: X.jsx("canvas", { ref: E, width: N, height: U, style: { touchAction: "none", cursor: "grab" }, onPointerDown: T, onPointerMove: Y, onPointerUp: R, onPointerCancel: R }) });
}
export { FindThingsGame as default };
