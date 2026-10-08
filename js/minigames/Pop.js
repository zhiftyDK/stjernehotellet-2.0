import { HUD_SHIFT } from '../engine/constants.js';
import React from 'react';
import * as ce from 'react/jsx-runtime';
import { rd as rd_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_, Ln as Ln_, soundUrl as rr_, b1 as b1_, Ba as Ba_ } from '../audio/audio.js';
import { createFigureOverlay as Ph_, getAnimationBounds as ht_, drawCurrencyHud as C1_, drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
import { createUiKit as Ua_, WindowStack as Jh_, LoadingScreen as Ka_, centeredUi } from './ui-kit.js';
import { Tween as pn_, FRAME_MS as zc_, AcceleratingValue as $c_ } from '../engine/tween.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { tutorials as nd_ } from '../game/save.js';
import { formatDuration as Ga_ } from '../game/world.js';
import { h1 as h1_ } from '../ui/panels.js';
import { f1 as f1_, c1 as c1_ } from '../game/world-init.js';
import { l as l_ } from '../engine/kinetic-scroll.js';
const O = { INTRO: "intro", SPILLER: "spiller", JUBEL: "jubel", SLUT: "slut" }, je = 33, lr = (e) => 2 * e - Math.sin(Math.PI / 2 * e), or = (e) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, e)));
function ir(e, l = 0, s = [7, 8, 9, 10]) {
  const i = e.sange[l];
  return { data: e, sang: l, S: i, baner: s, tilstand: O.INTRO, ur: 0, naeste: 0, rest: 0, noder: [null, null, null, null], succes: [false, false, false, false], lys: [-1, -1, -1, -1], medlem: [0, 1, 2, 3].map(() => ({ mode: "butik", tid: 0, nr: 0 })), rigtige: 0, forkerte: 0, sidenJubel: 0, spor: i.spor.map(() => 1), jubelTid: 0, lyde: [], effekt: null, betalt: false };
}
const Qe = (e, l, s) => {
  const i = e.medlem[l];
  if (i.mode !== s) {
    i.mode = s;
    i.nr += 1;
  }
  i.tid = 0;
};
function cr(e) {
  e.tilstand = O.SPILLER;
  e.ur = 0;
  e.naeste = 0;
  for (let l = 0; l < 4; l++) {
    if (e.baner[l] != null) {
      Qe(e, l, "hvile");
    }
  }
}
const un = (e) => e.rigtige * e.S.moenter;
function Wt(e, l, s) {
  const i = e.data.noder, p = lr(Math.min(1, s.trin / e.S.tabtid)), [b, j] = i.fra[l], [S, m] = i.til[l], [P, N] = i.skala;
  return { x: b + (S - b) * p, y: j + (m - j) * p, skala: (P + (N - P) * p) / 65536, alfa: or(s.trin / i.alfaTrin) };
}
const ur = (e, l) => !!e.noder[l] && e.noder[l].trin < e.S.tabtid;
function fr(e, l) {
  if (!ur(e, l)) {
    e.noder[l] = { trin: 0 };
    e.succes[l] = false;
  }
}
function dr(e) {
  const l = e.data;
  for (let s = 0; s < 4; s++) {
    const i = e.noder[s];
    if (i && i.trin < e.S.tabtid) {
      i.trin += 1;
    }
    if (e.lys[s] >= 0) {
      e.lys[s] += je;
    }
    const p = e.medlem[s];
    p.tid += je;
    if (p.mode === "spiller" && p.tid >= l.medlemSpiller) {
      p.mode = "hvile";
      p.nr += 1;
    }
  }
  if (e.tilstand === O.SPILLER) {
    const s = e.S.noder;
    for (; e.naeste < s.length && s[e.naeste][1] < e.ur + je;) {
      const [i] = s[e.naeste];
      for (let p = 0; p < 4; p++) {
        if (e.baner[p] === i) {
          fr(e, p);
        }
      }
      e.naeste += 1;
    }
    if (e.ur += je, e.ur > e.S.laengde * 1e3) {
      e.tilstand = O.JUBEL;
      e.jubelTid = 0;
      e.lyde.push("jubel");
      for (let i = 0; i < 4; i++) {
        if (e.baner[i] != null) {
          Qe(e, i, "butik");
        }
      }
      e.effekt = { beloeb: un(e) };
    }
  } else if (e.tilstand === O.JUBEL) {
    e.jubelTid += je;
    if (e.jubelTid >= l.efterSang) {
      e.tilstand = O.SLUT;
    }
  }
}
function pr(e, l) {
  for (e.rest += Math.min(l, 250); e.rest >= je;) {
    e.rest -= je;
    dr(e);
  }
}
function mr(e, l, s) {
  if (e.tilstand !== O.SPILLER || l < 0 || e.succes[l]) {
    return null;
  }
  e.succes[l] = true;
  const i = e.baner[l];
  if (i == null || i < 7) {
    return null;
  }
  const p = i - 7;
  if (e.noder[l] && s(l, e.noder[l])) {
    e.lys[l] = 0;
    Qe(e, l, "spiller");
    e.spor[p] = 1;
    e.rigtige += 1;
    e.sidenJubel += 1;
    const b = e.data.jubel;
    if (e.sidenJubel >= b.rigtige && Math.floor(Math.random() * b.chance) === 0) {
      e.lyde.push("jubel");
      e.sidenJubel = 0;
    }
    return "rigtigt";
  }
  Qe(e, l, "butik");
  e.lyde.push({ falsk: p + 1 });
  e.spor[p] = 0;
  e.forkerte += 1;
  return "forkert";
}
function yr(e) {
  if (e.betalt) {
    return null;
  }
  e.betalt = true;
  return un(e);
}
const fn = "popstars-gem-v1", fe = () => Math.floor(Date.now() / 1e3);
function We(e, l, s) {
  const i = e.standard[s], p = new Set(l.toej.filter((j) => j.medlem >= 0 && j.type >= 7).map((j) => j.type)), b = [i.instrument, 7, 8, 9, 10, 11].find((j) => !p.has(j));
  return [...[1, 2, 3, 4, 5, 6].map((j) => ({ type: j, f: i[j] || 0, medlem: s })), { type: b, f: 0, medlem: s }];
}
function kr(e) {
  const l = { genstande: [], toej: [], band: [{}], sange: [true, false, false, false, false], koncerter: 0, point: 0, rekord: 0, forsoeg: 0, ventTil: 0 };
  l.toej.push(...We(e, l, 0));
  return l;
}
function hr(e, l) {
  let s = kr(l);
  try {
    const i = JSON.parse(localStorage.getItem(fn));
    if (i && i.band) {
      const { penge: p, scene: b, ...j } = i;
      s = { ...s, ...j };
      if (!i.toej) {
        s.toej = [];
        s.band.forEach((S, m) => {
          s.toej.push(...We(l, s, m));
          if (S.instrument != null) {
            s.toej.find((P) => P.medlem === m && P.type >= 7).type = 7 + S.instrument;
          }
          delete S.instrument;
        });
      }
    }
  }
  catch {
  }
  br(e, s);
  return s;
}
function gr(e) {
  try {
    localStorage.setItem(fn, JSON.stringify(e));
  }
  catch {
  }
}
function He(e, l, s, i) {
  if (l.brug(s)) {
    e.point += Math.trunc(s / i) || (s > 0 ? 1 : 0);
    return true;
  }
  return false;
}
function br(e, l) {
  for (const s of e.pladser) {
    if (!vt(l, s.id)) {
      l.genstande.push({ plads: s.id, type: s.standard[0], f: s.standard[1], slut: 0 });
    }
  }
}
const vt = (e, l) => e.genstande.find((s) => s.plads === l), Ht = (e, l, s) => e.genstande.filter((i) => i.plads < 0 && i.type === l && i.f === s).length, _t = (e, l) => e.slut - l >= 1, en = (e, l) => Math.max(0, e.slut - l);
function tn(e, l, s, i, p, b) {
  const j = e.pladser.find((N) => N.id === i), S = vt(l, i);
  if (S && S.type === j.type && S.f === p) {
    return false;
  }
  const m = l.genstande.find((N) => N.plads < 0 && N.type === j.type && N.f === p), P = e.varer[j.type][p];
  if (!m && !He(l, s, P.pris, e.kronerPrPoint)) {
    return "penge";
  }
  if (S) {
    if (S.type === 0) {
      l.genstande.splice(l.genstande.indexOf(S), 1);
    } else {
      S.plads = -1;
    }
  }
  if (m) {
    m.plads = i;
  } else {
    l.genstande.push({ plads: i, type: j.type, f: p, slut: b + P.byggetid });
  }
  return true;
}
function xr(e, l, s, i, p) {
  const b = s.band.length;
  return b >= 4 ? false : He(s, i, e.medlemPris[b], p) ? (s.toej.push(...We(l, s, b)), s.band.push({}), true) : "penge";
}
const ve = (e, l) => e.toej.filter((s) => s.medlem === l), jr = (e, l) => {
  const s = e.toej.find((i) => i.medlem === l && i.type >= 7);
  return s ? s.type : null;
}, Mr = (e, l) => new Set(e.toej.filter((s) => s.medlem >= 0 && s.medlem !== l && s.type >= 7).map((s) => s.type)), Mt = (e, l, s) => e.toej.some((i) => i.medlem < 0 && i.type === l && i.f === s);
function wr(e, l, s, i, p, b, j) {
  const S = l.toej.find((m) => m.medlem < 0 && m.type === p && m.f === b);
  if (!S && !He(l, s, e.priser[p][b], j)) {
    return "penge";
  }
  for (const m of l.toej) {
    if (m.medlem === i && (p >= 7 ? m.type >= 7 : m.type === p)) {
      m.medlem = -1;
    }
  }
  if (S) {
    S.medlem = i;
  } else {
    l.toej.push({ type: p, f: b, medlem: i });
  }
  return true;
}
function Sr(e, l, s, i, p) {
  return l.sange[i] ? false : He(l, s, e.sangPris[i], p) ? (l.sange[i] = true, true) : "penge";
}
function Pr(e, l, s) {
  if (l.forsoeg >= 1) {
    l.forsoeg -= 1;
    return true;
  }
  if (s < l.ventTil) {
    return "vent";
  }
  l.ventTil = s + e.ventetid;
  l.forsoeg = e.forsoeg;
  return true;
}
const vr = (e, l) => e.forsoeg <= 0 ? Math.max(0, e.ventTil - l) : 0, Lr = (e) => [0, 1, 2, 3].map((l) => e.band[l] ? jr(e, l) : null);
function Er(e, l, s) {
  if (s > 0) {
    l.faa(s);
  }
  e.koncerter += 1;
  e.point += s;
  if (s > e.rekord) {
    e.rekord = s;
  }
  return s;
}
function $e(e, l) {
  const s = e.length, i = e[s - 1];
  if (i <= l) {
    return Math.min(99, s + Math.trunc((l - i) / (i - e[s - 2])));
  }
  for (let p = 0; p < s - 1; p++) {
    if (e[p] > l) {
      return p;
    }
  }
  return s - 1;
}
function nn(e, l) {
  const s = e.length;
  return l < 1 ? 0 : l <= s ? e[l - 1] : e[s - 1] + (e[s - 1] - e[s - 2]) * (l - s);
}
function rn(e, l) {
  const s = $e(e, l), i = nn(e, s), p = nn(e, s + 1);
  return Math.min(1, (l - i) / (p - i));
}
const te = (e, l) => e + Math.floor(Math.random() * (l - e + 1));
function Tr(e, l, bw = 1280) {
  const s = e.skyer, i = (m, P) => {
    const N = te(0, 5), Y = N === 1 ? s.mellem : s.store;
    m.sprite = Y[te(0, Y.length - 1)];
    m.x = P ? te(s.start[0], s.start[1]) : s.ind;
    const D = s.typer[Math.min(N, 2)];
    m.y = te(D.y[0], D.y[1]);
    m.fart = te(D.fart[0], D.fart[1]);
  }, p = Array.from({ length: s.antal }, () => {
    const m = {};
    i(m, true);
    return m;
  }), b = () => p.sort((m, P) => m.fart - P.fart);
  b();
  const j = (m) => ({ x: te(0, e.felt), y: te(0, e.felt), p: l(m, te(0, e.tick)) }), S = [...Array.from({ length: e.stjerner.antal }, () => j(e.stjerner.film)), ...Array.from({ length: e.smaaStjerner.antal }, () => j(e.smaaStjerner.film))];
  return { skyer: p, trin() {
      for (const m of p) {
        m.x += m.fart;
        if (m.x >= s.ude) {
          i(m, false);
          b();
        }
      }
    }, tik(m) {
      for (const P of S) {
        if (P.p) {
          P.p.advance(m);
        }
      }
    }, tegn(m, P, N) {
      for (let B = 0; B < bw; B += e.skridt) {
        P(e.stribe, B, 0);
      }
      const Y = Math.trunc(m.x / e.kamera), D = Math.trunc(m.y / e.kamera);
      for (const B of S) {
        N(B.p, B.x - Y, B.y - D);
      }
      for (const B of p) {
        P(B.sprite, Math.trunc(B.x / s.skala[0]) - Y, Math.trunc(B.y / s.skala[1]) - D);
      }
    } };
}
function Ir(e, l) {
  const s = Math.trunc(e.x / e.antal), i = Array.from({ length: e.antal }, (p, b) => ({ x: b * s + te(0, s), y: e.y + te(e.ymin, e.ymax), film: e.venter, p: l(e.film[e.venter], te(0, e.tick)) }));
  for (let p = i.length - 1; p > 0; p--) {
    const b = te(0, p);
    [i[p], i[b]] = [i[b], i[p]];
  }
  return { folk: i, film(p) {
      for (const b of i) {
        if (b.film !== p) {
          b.film = p;
          b.p = l(e.film[p], 0);
        }
      }
    }, tik(p) {
      for (const b of i) {
        if (b.p) {
          b.p.advance(p);
        }
      }
    }, tegn(p, b) {
      const j = Math.trunc(p.x * e.parallakse);
      for (const S of i) {
        b(S.p, S.x - j, S.y - p.y);
      }
    } };
}
let sn = false, wt = 0, an = null;
const St = "data/pop/lyd", Pt = { jubel: 995, penge: 976 }, ze = 984, ie = { x: 1229, y: 932, film: [15912, 15913, 15915], lys: 15914, billede: 4088, skift: 1e3, chance: 5 }, de = { x: 973, y: 1016, film: [15846, 15849, 15847, 15848], billede: 7338, skift: 800, chance: 4 }, Ze = (e, l) => e + Math.floor(Math.random() * (l - e + 1)), ln = (e) => Math.max(0, 50 - Math.trunc((e + 15) / 15));
function Rr() {
  const [e, l] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let s = false;
    (async () => {
      try {
        const i = (Y) => fetch(`data/pop/${Y}`).then((D) => D.ok ? D.json() : Promise.reject(new Error(`${Y}: ${D.status}`))), [[p, b, j, S, m], P] = await Promise.all([Promise.all(["spil.json", "manifest.json", "forgrund.json", "baggrund.json", "tekster.json"].map(i)), Sv_("pop")]), N = {};
        await Promise.all(Object.entries(b.textures).map(([Y, D]) => new Promise((B) => {
          const Me = new Image();
          Me.onload = () => {
            N[Y] = Me;
            B();
          };
          Me.onerror = () => B();
          Me.src = `data/pop/tex/${D.file}`;
        })));
        if (!s) {
          l({ status: "ready", spil: p, manifest: b, images: N, fg: j, bg: S, tekster: m, fortaeller: P });
        }
      }
      catch (i) {
        if (!s) {
          l({ status: "error", error: i.message });
        }
      }
    })();
    return () => {
      s = true;
    };
  }, []);
  return e;
}
function pe(e, l, s, i, p, b, j = 1, S = 1) {
  const m = l.sprites[i], P = m && s[m.assetId];
  if (!(!P || S <= 0)) {
    e.save();
    e.translate(p, b);
    e.scale(j, j);
    Ql_(e, P, m, Math.min(1, S));
    e.restore();
    e.globalAlpha = 1;
  }
}
function xe(e, l, s, i, p, b, j = 1, S = null) {
  if (i) {
    for (const m of i.drawList("invers")) {
      const P = l.sprites[S && S.has(m.sprite) ? S.get(m.sprite) : m.sprite], N = P && s[P.assetId];
      if (N) {
        e.save();
        e.translate(p + m.x, b + m.y);
        e.rotate((m.rot || 0) * Math.PI * 2);
        e.scale(m.scaleX * (m.flip ? -1 : 1), m.scaleY);
        e.globalAlpha = 1;
        Ql_(e, N, P, m.alpha * j);
        e.restore();
      }
    }
  }
}
function on(e, l, s, i, p, b, j) {
  for (let S = 0; S < i.raekker; S++) {
    for (let m = 0; m < i.kolonner; m++) {
      const P = i.felter[S][m];
      if (P) {
        pe(e, l, s, p + P, m * 128 - b, S * 128 - j);
      }
    }
  }
}
const Ar = (e) => ({ penge: e, brug(l) {
    if (this.penge < l) {
      return false;
    }
    this.penge -= l;
    return true;
  }, faa(l) {
    this.penge += l;
  } });
function PopstarsGame({ bredde: BW = 1280, pause: e = false, lydTil: l = true, skrift: s = null, ui: i = null, pung: p = null, skilt: b = null }) {
  const j = Rr(), S = React.useRef(null), m = React.useRef(null), P = React.useRef(e);
  P.current = e;
  const N = React.useRef(l);
  N.current = l;
  const Y = React.useRef(null);
  React.useEffect(() => {
    if (Y.current) {
      Y.current.saetLyd(l);
    }
  }, [l]);
  React.useEffect(() => {
    if (j.status !== "ready" || !i || !i.pakke) {
      return;
    }
    const d = j.spil, x = j.manifest, T = j.images, g = j.tekster, I = d.butik, W = p || Ar(I.startPenge), R = d.genstande, V = d.toej, v = hr(R, V), me = () => gr(v), Z = rd_([...Object.values(Pt), ze, ...d.lyde.falsk.filter(Boolean), d.lyde.hitliste, d.lyde.niveau, d.lyde.publikum, d.lyde.ventetidSlut]);
    Z.saetTil(l);
    let _e = d.lyde.publikumStyrke.scene;
    const et = () => {
      Z.loekke(d.lyde.publikum);
      Z.volumen(d.lyde.publikum, _e);
    };
    et();
    const tt = g.hoveder, K = Ev_(j.fortaeller, Math.round((BW - 1024) / 2)), Le = [0, 0, 0, 0, 0];
    if (K) {
      K.saetLyd(l);
      K.figur = (n, t) => {
        if (n >= 0 && n < Le.length) {
          Le[n] = t;
        }
      };
    }
    Y.current = K;
    const Lt = Ph_(x, T, tt, BW - 1280), J = (n, t) => {
      const a = typeof n == "number" ? n : tt.haendelser[n];
      if (!(!K || a === void 0)) {
        Le.fill(0);
        K.spil(a);
        if (t !== void 0) {
          K.saet(0, t);
        }
        K.slump();
      }
    }, Ee = new Map(x.animations.map((n) => [n.id, n])), nt = new Map(), H = (n, t) => {
      let a = nt.get(n);
      if (!a || a.id !== t) {
        const o = Ee.get(t);
        a = { id: t, p: o ? new Xe_(o) : null };
        if (a.p) {
          a.p.advance(0);
        }
        nt.set(n, a);
      }
      return a.p;
    }, Te = (n, t = 0) => {
      const a = Ee.get(n), o = a ? new Xe_(a) : null;
      if (o) {
        o.advance(t);
      }
      return o;
    }, Et = (n) => {
      const t = new Map();
      for (const a of n) {
        for (const o of V.typeDele[a.type] || []) {
          t.set(V.kilde[o], V.dele[o][a.f % V.dele[o].length]);
        }
      }
      return t;
    }, rt = (n) => {
      const t = n.find((a) => a.type >= 7);
      return t ? V.instrumentFilm[t.type] : 0;
    }, st = [ie, de].map((n) => ({ C: n, nr: 0, tid: 0, p: H(`crowd${n.x}`, n.film[0]) })), yn = H("roadielys", ie.lys), at = Tr(d.himmel, Te, BW), lt = Ir(d.publikum, Te), kn = (n) => {
      for (const t of st) {
        t.tid += n;
        if (t.tid > t.C.skift) {
          t.tid -= t.C.skift;
          if (t.nr === 0 && Ze(0, t.C.chance) === 0) {
            t.nr = Ze(1, t.C.film.length - 1);
            t.p = H(`crowd${t.C.x}-${t.nr}`, t.C.film[t.nr]);
            if (t.p) {
              t.p.reset();
              t.p.advance(0);
            }
          }
        }
        if (t.nr !== 0 && (!t.p || t.p.finished)) {
          t.nr = 0;
          t.p = H(`crowd${t.C.x}`, t.C.film[0]);
        }
      }
    }, L = S.current.getContext("2d"), X = i.pakke.U, Ie = Ua_(L, { ui: { M: i.pakke.M, I: i.pakke.I }, pop: { M: x, I: T, anims: Ee } }, X, s), ne = new Jh_(centeredUi(X, BW)), Tt = (n, t = null) => h1_({ V: g.vejledning, nr: n, pakke: "pop", lukket: t, laes: (a, o) => {
        if (K) {
          Le.fill(0);
          K.startForfra(a, { 0: o });
        }
      } }), Oe = (n, t = null) => nd_.har(`pop${n}`) ? false : (nd_.saet(`pop${n}`), ne.aabn(Tt(n, t)), true);
    if (!Oe(6) && !sn) {
      sn = true;
      J("velkomst");
    }
    const { dialog: It, besked: ye } = c1_(X), hn = (n, t, a, o = null) => It(t, () => {
      const c = a();
      if (c === "penge") {
        ne.aabn(ye(n, g.ikkeNok));
      } else if (c) {
        me();
        ne.lukAlle();
        if (o) {
          o();
        }
      }
    }, { titel: n }), ot = R.kronerPrPoint, Re = (n) => R.pladser.find((t) => t.id === n), Rt = (n) => ({ x: 512 + n.x, y: 256 + n.y }), Fe = () => v.genstande.filter((n) => n.plads >= 0 && Re(n.plads)).sort((n, t) => R.z[n.type] - R.z[t.type] || n.plads - t.plads), At = (n) => n.niveau > $e(d.niveau.graenser, v.point), gn = (n, t, a, o, c) => {
      n.sprite("ui", t, o + 18, c, { skala: 0.55 });
      n.tekst(a, o + 40, c, { str: 19 });
    }, F = R.celle, it = new Map(), Nt = (n, t, a, o, c) => {
      const u = R.varer[t][a], y = R.film[t][a];
      if (!it.has(y)) {
        it.set(y, Te(y));
      }
      const k = it.get(y);
      n.ramme("punkt", o, c, F.b, F.h);
      const w = F.kasse[0][t], h = F.kasse[1][t], r = o + (F.b - w) / 2;
      if (k) {
        n.anim("pop", k, r + w * F.anker[0][t] / 100, c + h * F.anker[1][t] / 100, F.skala[t]);
      }
      const f = Ht(v, t, a);
      if (f > 0 ? n.tekst(`x ${f}`, o + F.b / 2, c + F.h - 22, { midt: true, str: 22 }) : (u.pris >= 1 && f1_(n, u.pris, o + 8, c + F.h - 22, W.penge >= u.pris), u.byggetid >= 1 && gn(n, X.ikoner.ur, Ga_(u.byggetid), o + 130, c + F.h - 22)), At(u)) {
        n.ramme("punkt", r, c, w, h);
        const E = r + w + F.niveauXY[0], C = c + h + F.niveauXY[1];
        n.sprite("ui", F.niveau, E, C);
        n.tekst(String(u.niveau), E + 22, C, { str: 22 });
      }
    }, bn = (n, t) => ({ titel: g.koebGenstand, bredde: 576, hoejde: 400, luk: false, tegn(a, o, c) {
        Nt(a, Re(n).type, t, o.x + (o.w - F.b) / 2, o.y + 40);
        a.spriteKnap(X.ikoner.ja, o.x + o.w / 2 - 90, o.y + o.h - 62, () => {
          const u = tn(R, v, W, n, t, fe());
          if (u === "penge") {
            c.aabn(ye(g.butik, g.ikkeNok));
            return;
          }
          if (u) {
            me();
            J(R.scripts.koebt);
            c.lukAlle();
          }
        });
        a.spriteKnap(X.ikoner.nej, o.x + o.w / 2 + 90, o.y + o.h - 62, () => c.luk());
      } }), Kt = (n) => {
      const t = Re(n).type, a = vt(v, n), o = $e(d.niveau.graenser, v.point), c = R.varer[t].map((u, y) => y).filter((u) => !(a && a.type === t && a.f === u)).sort((u, y) => {
        const k = R.varer[t][u], w = R.varer[t][y], h = k.niveau > o, r = w.niveau > o;
        return h !== r ? h ? 1 : -1 : h && k.niveau !== w.niveau ? k.niveau - w.niveau : k.pris - w.pris || k.byggetid - w.byggetid;
      });
      J(R.scripts.butik);
      return { titel: g.butik, tegn(u, y, k) {
          const r = y.x + (y.w - 2 * F.b - 24) / 2;
          u.rulleliste(k.top(), y.x + 20, y.y + 30, y.w - 40, y.h - 50, Math.ceil(c.length / 2) * (F.h + 16), (f) => {
            c.forEach((E, C) => {
              const $ = r + C % 2 * (F.b + 24), z = f + Math.trunc(C / 2) * (F.h + 16);
              Nt(u, t, E, $, z);
              u.knap({ x0: $, y0: z, x1: $ + F.b, y1: z + F.h }, () => {
                if (Ht(v, t, E) > 0) {
                  if (tn(R, v, W, n, E, fe())) {
                    me();
                    k.lukAlle();
                  }
                  return;
                }
                if (At(R.varer[t][E])) {
                  k.aabn(ye(g.butik, g.laast));
                  return;
                }
                J(R.scripts.valgt);
                k.aabn(bn(n, E));
              });
            });
          });
        } };
    }, xn = () => {
      J(R.scripts.butik);
      return { titel: g.sceneButik, tegn(n, t, a) {
          const [o, c, u] = R.vindue;
          for (const y of R.roadie) {
            const k = t.x + o, w = t.y + y.y, h = x.sprites[y.billede];
            n.ramme("punkt", k, w, c, u);
            if (h) {
              n.sprite("pop", y.billede, k + c / 2 - (h.w / 2 - h.ox) * y.skala, w + u / 2 - (h.h / 2 - h.oy) * y.skala, { skala: y.skala });
            }
            n.knap({ x0: k, y0: w, x1: k + c, y1: w + u }, () => {
              const r = Fe().find((f) => f.type === y.type);
              if (r) {
                a.aabn(Kt(r.plads));
              }
            });
          }
        } };
    }, $t = (n, t, a) => {
      J(n);
      const o = t >= 1 ? Math.trunc(t * (R.rubinerPrDoegn / 86400)) + 1 : 0;
      return { titel: "", bredde: 576, hoejde: 320, luk: false, tegn(c, u, y) {
          const k = `${g.springOver[0]}${o} `, w = s ? s.bredde(k, Math.round(24 * 1.3)) : 200, h = u.x + (u.w - w - 34) / 2;
          c.tekst(k, h, u.y + 60, { str: 24 });
          c.sprite("ui", X.ikoner.rubin, h + w + 15, u.y + 60, { skala: 0.7 });
          c.tekst(a.trim(), u.x + u.w / 2, u.y + 100, { midt: true, str: 24, bredde: u.w - 90, op: true });
          c.spriteKnap(X.ikoner.ja, u.x + u.w / 2 - 90, u.y + u.h - 62, () => y.aabn(ye("", g.ikkeRubiner)));
          c.spriteKnap(X.ikoner.nej, u.x + u.w / 2 + 90, u.y + u.h - 62, () => y.luk());
        } };
    }, jn = (n) => $t(R.scripts.bygger, en(n, fe()), g.springOver[1]), Mn = () => $t(d.koncert.scripts.vent, Math.max(0, v.ventTil - fe()), g.springOverKoncert), wn = (n, t) => {
      const a = Pr(d.koncert, v, fe());
      if (me(), a === "vent") {
        t.aabn(Mn());
        return;
      }
      t.lukAlle();
      if (!Oe(9, () => Ct(n))) {
        Ct(n);
      }
    };
    let re = null, ct = -1;
    const Sn = (n) => {
      const t = re && !re.paused && !re.ended;
      if (re && re.pause(), t && ct === n) {
        ct = -1;
        return;
      }
      const a = g.forhaand[n];
      if (!(!a || !N.current)) {
        re = Ln_(new Audio(rr_(St, a)), rr_(St, a));
        ct = n;
        re.play().catch(() => {
        });
      }
    }, Pn = () => ({ titel: g.sangbog, tegn(n, t, a) {
        d.sange.forEach((c, u) => {
          const y = t.y + 40 + u * 72, k = v.sange[u];
          n.ramme("punkt", t.x + 40, y, t.w - 92, 64);
          n.spriteKnap(X.ikoner.afspil, t.x + 40 + 64 / 2, y + 64 / 2, () => Sn(u));
          n.tekst(g.sange[u], t.x + 128, y + 24, { str: 22 });
          n.tekst(`${c.laengde} s`, t.x + 128, y + 48, { str: 16 });
          if (k) {
            n.sprite("ui", X.ikoner.jaLille, t.x + t.w - 100, y + 72 / 2 - 4);
          } else {
            f1_(n, I.sangPris[u], t.x + t.w - 190, y + 72 / 2 - 4, W.penge >= I.sangPris[u]);
          }
          n.knap({ x0: t.x + 120, y0: y, x1: t.x + t.w - 52, y1: y + 72 - 8 }, () => {
            if (re) {
              re.pause();
            }
            if (k) {
              a.aabn(It(g.spilSang, () => wn(u, a), { titel: g.koncert }));
            } else {
              J("koebSang");
              a.aabn(hn(g.sangbog, g.koebSang, () => Sr(I, v, W, u, ot)));
            }
          });
        });
      } }), ut = (n, t, a, o, c) => {
      const u = I.medlemFilm.butik[rt(n)], y = H(`vis${u}`, u), k = ht_(x, y);
      if (!y || !k) {
        return;
      }
      const w = Math.min(1, o / (k.x1 - k.x0), c / (k.y1 - k.y0));
      L.save();
      L.translate(t + o / 2 - (k.x0 + k.x1) / 2 * w, a + c / 2 - (k.y0 + k.y1) / 2 * w);
      L.scale(w, w);
      xe(L, x, T, y, 0, 0, 1, Et(n));
      L.restore();
    }, vn = (n, t) => {
      let a = -1;
      const o = { b: V.celle.b[t], h: V.celle.h[t] }, c = (h, r, f, E, C) => {
        h.ramme("punkt", f, E, o.b, o.h);
        if (C) {
          h.ramme("punkt", f, E, o.b, o.h);
        }
        h.spriteIKasse("pop", V.ikoner[t][r], f + 8, E + 8, o.b - 16, o.h - 40);
        const $ = V.priser[t][r];
        if (!Mt(v, t, r) && $ >= 1) {
          f1_(h, $, f + 8, E + o.h - 20, W.penge >= $);
        }
      }, u = (h, r) => {
        me();
        if (r) {
          h.luk();
          if (h.top() === w) {
            h.luk();
          }
        }
      }, y = (h) => {
        const r = !Mt(v, t, a);
        J(V.scripts.koebt);
        const f = wr(V, v, W, n, t, a, ot);
        if (f === "penge") {
          h.aabn(ye(g.tilbehoer, g.ikkeNok));
        } else if (f) {
          u(h, r);
        }
      }, k = () => ({ titel: g.tilbehoer, bredde: 576, hoejde: 400, luk: false, tegn(h, r, f) {
          c(h, a, r.x + (r.w - o.b) / 2, r.y + 30, false);
          h.tekst(g.koebTilbehoer, r.x + r.w / 2, r.y + 30 + o.h + 30, { midt: true, str: 24 });
          h.spriteKnap(X.ikoner.ja, r.x + r.w / 2 - 90, r.y + r.h - 62, () => y(f));
          h.spriteKnap(X.ikoner.nej, r.x + r.w / 2 + 90, r.y + r.h - 62, () => f.luk());
        } }), w = { titel: g.tilbehoer, tegn(h, r, f) {
          const E = ve(v, n).find((A) => A.type === t), C = V.ikoner[t].map((A, _) => _).filter((A) => !(E && E.f === A)), $ = 380, z = Math.max(1, Math.trunc($ / (o.b + 8)));
          h.rulleliste(w, r.x + 30, r.y + 30, $, r.h - 50, Math.ceil(C.length / z) * (o.h + 8), (A) => {
            C.forEach((_, ee) => {
              const be = r.x + 30 + ee % z * (o.b + 8), Ne = A + Math.trunc(ee / z) * (o.h + 8);
              c(h, _, be, Ne, _ === a);
              h.knap({ x0: be, y0: Ne, x1: be + o.b, y1: Ne + o.h }, () => {
                a = _;
                J(V.scripts.valgt);
              });
            });
          });
          const ge = ve(v, n).filter((A) => a < 0 || (t >= 7 ? A.type < 7 : A.type !== t));
          if (a >= 0) {
            ge.push({ type: t, f: a, medlem: n });
          }
          h.ramme("punkt", r.x + 430, r.y + 30, 240, 300);
          ut(ge, r.x + 440, r.y + 40, 220, 280);
          h.spriteKnap(X.ikoner.ja, r.x + 550, r.y + r.h - 50, () => {
            if (a < 0) {
              return;
            }
            if (Mt(v, t, a)) {
              y(f);
              return;
            }
            const A = V.priser[t][a];
            if (W.penge < A) {
              f.aabn(ye(g.tilbehoer, g.ikkeNok));
              return;
            }
            if (A >= 1) {
              f.aabn(k());
            } else {
              y(f);
            }
          });
        } };
      return w;
    }, Ln = (n) => ({ titel: g.tilbehoer, tegn(t, a, o) {
        const c = Mr(v, n), u = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((k) => k < 7 || !c.has(k)), y = 92;
        u.forEach((k, w) => {
          const h = a.x + 30 + w % 4 * (y + 8), r = a.y + 30 + Math.trunc(w / 4) * (y + 8);
          t.ramme("punkt", h, r, y, y);
          t.spriteIKasse("pop", V.knapper[k], h + 6, r + 6, y - 12, y - 12);
          t.knap({ x0: h, y0: r, x1: h + y, y1: r + y }, () => {
            Z.spil(ze);
            o.aabn(vn(n, k));
          });
        });
        t.ramme("punkt", a.x + 430, a.y + 30, 240, 340);
        ut(ve(v, n), a.x + 440, a.y + 40, 220, 320);
      } }), En = () => {
      const n = v.band.length;
      return { titel: g.nytMedlem, bredde: 576, hoejde: 288, luk: false, tegn(t, a, o) {
          ut(We(V, v, n), a.x + 60, a.y + 30, 150, 170);
          t.tekst(g.nytMedlem, a.x + 240, a.y + 80, { str: 22 });
          f1_(t, I.medlemPris[n], a.x + 232, a.y + 130, W.penge >= I.medlemPris[n]);
          t.spriteKnap(X.ikoner.ja, a.x + a.w / 2 - 90, a.y + a.h - 62, () => {
            o.luk();
            const c = xr(I, V, v, W, ot);
            if (c === "penge") {
              o.aabn(ye(g.nytMedlem, g.ikkeNok));
            } else if (c) {
              me();
            }
          });
          t.spriteKnap(X.ikoner.nej, a.x + a.w / 2 + 90, a.y + a.h - 62, () => o.luk());
        } };
    }, Tn = ({ sang: n, point: t, bedre: a, vaerre: o }) => {
      const c = d.hitliste, u = ln(t), [y, k, w, h] = c.lærred, [r, f] = c.raekke;
      J(c.scripts.aabn);
      if (u === 0) {
        Z.spil(d.lyde.hitliste);
      }
      const E = ($, z, ge) => {
        if (!s || s.bredde($, null, z) <= ge) {
          return $;
        }
        let A = $;
        for (; A.length > 1 && s.bredde(`${A}...`, null, z) > ge;) {
          A = A.slice(0, -1);
        }
        return `${A}...`;
      }, C = { titel: c.titel, rul: Math.max(0, u * f + f - c.midt), lukket: () => J(c.scripts.luk), tegn($, z) {
          $.rulleliste(C, z.x + y, z.y + k, w, h, 50 * f, (ge) => {
            const A = z.x + y;
            for (let _ = 0; _ < 50; _++) {
              const ee = ge + _ * f;
              if (ee + f < z.y + k || ee > z.y + k + h) {
                continue;
              }
              const be = _ === u;
              if ($.ramme("punkt", A, ee, r, f), be && $.ramme("punkt", A, ee, r, f), !s) {
                continue;
              }
              const [Ne, , Jn] = c.plads.kasse, [Yn, , Xn] = c.navn.kasse;
              s.tegn(L, String(_ + 1), A + Ne + Jn / 2, ee + f / 2, { font: c.plads.skrift, midt: true });
              const Gn = be ? c.sange[n] : c.navne[_];
              if (s.tegn(L, E(Gn, c.navn.skrift, c.navn.bredde), A + Yn + Xn / 2, ee + f / 2, { font: c.navn.skrift, midt: true }), be) {
                const Pe = c.point, Xe = i.pakke.M.sprites[Pe.sprite];
                $.sprite("ui", Pe.sprite, A + Pe.x, ee + Pe.y);
                s.tegn(L, String(t), A + Pe.x + (Xe ? Xe.ox : 0), ee + Pe.y + (Xe ? Xe.oy : 0), { font: 1, op: true });
                const Ke = c.pile;
                $.sprite("pop", a ? Ke.bedre : o ? Ke.vaerre : Ke.samme, A + Ke.x, ee + Ke.y);
              }
            }
          });
        } };
      return C;
    }, se = d.niveau, U = { point: -1, stjerner: 0, fx: new pn_(0, se.fremskridtBilleder), acc: 0 }, In = (n) => {
      const t = v.point, a = Math.min($e(se.graenser, t), se.graenser.length - 1);
      if (U.point <= 0 && (U.point = t, U.stjerner = a, U.fx.mod(rn(se.graenser, t))), U.point !== t) {
        if (U.point = t, a > U.stjerner) {
          const o = se.milepaele.indexOf(a);
          J(se.script, o < 0 ? 0 : o);
          Z.spil(d.lyde.niveau);
        }
        U.stjerner = $e(se.graenser, t);
        U.fx.mod(rn(se.graenser, t));
      }
      for (U.acc += n; U.acc >= zc_;) {
        U.acc -= zc_;
        U.fx.trin();
      }
    }, Rn = () => {
      const { H: n, M: t, I: a } = i.hud, o = n.billeder, c = se.bjaelke, u = n.bjaelkeFelt;
      L.fillStyle = `rgb(${u.bag.join(",")})`;
      L.fillRect(c.x, c.y, c.w, c.h);
      L.fillStyle = `rgb(${u.fyld.join(",")})`;
      L.fillRect(c.x, c.y, Math.trunc(c.w * U.fx.v), c.h);
      pe(L, t, a, o.bjaelke.sprite, o.bjaelke.x, o.bjaelke.y);
      pe(L, t, a, o.bjaelkeKant.sprite, o.bjaelkeKant.x, o.bjaelkeKant.y);
      const y = se.point;
      if (s) {
        s.tegn(L, String(Math.max(0, U.point)), y[0] + y[2] / 2, c.y + c.h / 2, { str: 27, midt: true });
      }
      const k = se.stjerne;
      Ie.sprite("ui", k.sprite, k.x, k.y, { alfa: U.stjerner >= 1 ? 1 : 0.5 });
      if (U.stjerner >= 1 && s) {
        s.tegn(L, String(U.stjerner), k.tekst[0] + k.tekst[2] / 2, k.tekst[1] + k.tekst[3] / 2, { str: 27, midt: true });
      }
    }, G = d.pengeEffekt, De = [], An = (n, t, a) => {
      const o = Math.trunc(G.tid / 33), c = { beloeb: n, tid: 0, acc: 0, x: new pn_(t, o), y: new pn_(a, o), alfa: new $c_(G.alfa[0], G.maks, Math.trunc(G.tid / 100)), skala: new $c_(G.skala[0], G.maks, Math.trunc(G.tid / 100)) };
      c.y.mod(a + G.dy);
      c.alfa.maal = G.alfa[1];
      c.skala.maal = G.skala[1];
      De.push(c);
    }, oe = d.kamera, ke = l_(0, oe.verden[0] - BW), he = l_(0, oe.verden[1] - d.skaerm.hoejde), Q = an || { x: oe.x, y: oe.y };
    ke.flytTil(Q.x);
    he.flytTil(Q.y);
    an = Q;
    let q = "butik", M = null, ae = [], Ae = false, Ce = false;
    const Be = new pn_(0, d.spor.alfaBilleder);
    let ft = 0;
    const we = new Map(), Ve = [null, null, null, null], Se = d.knapper.anims.map((n) => Ee.get(n) ? new Xe_(Ee.get(n)) : null), dt = () => ae.forEach((n) => {
      n.pause();
      n.src = "";
    }), Ot = () => {
      q = "butik";
      M = null;
      Ce = false;
      dt();
      ae = [];
      we.clear();
      Be.mod(0);
      if (b) {
        b.skift(null);
      }
    };
    let Ft = null;
    const Dt = () => {
      const n = yr(M);
      if (n == null) {
        return 0;
      }
      Ft = { sang: M.sang, point: n, bedre: n > wt, vaerre: n < wt };
      wt = n;
      Er(v, W, n);
      if (n >= 1) {
        Z.spil(Pt.penge);
      }
      me();
      return n;
    }, Nn = () => {
      if (M) {
        if (M.tilstand === O.INTRO) {
          if (K) {
            K.spring();
          }
          return;
        }
        if (M.tilstand === O.SPILLER) {
          Dt();
          Ot();
        }
      }
    }, Ct = (n) => {
      dt();
      M = ir(d, n, Lr(v));
      ae = M.S.spor.map((t) => {
        const a = new Audio(rr_(St, t));
        a.preload = "auto";
        return a;
      });
      q = "koncert";
      Ce = false;
      Be.mod(255);
      ke.maal(oe.x);
      he.maal(oe.y);
      if (b) {
        b.skift(Nn);
      }
      J("koncert");
    }, Kn = () => {
      cr(M);
      ae.forEach((n) => {
        n.currentTime = 0;
        n.play().catch(() => {
        });
      });
      for (const n of Fe()) {
        const t = R.aktiv[n.type][n.f];
        we.set(n.plads, t ? Te(t, Ze(0, 3e3)) : null);
      }
    }, Bt = (n) => {
      const t = x.sprites[d.knapper.basis], a = d.knapper.x[n], o = d.knapper.y;
      return { x0: a - t.ox, y0: o - t.oy, x1: a - t.ox + t.w, y1: o - t.oy + t.h };
    }, $n = (n, t) => {
      const a = Wt(M, n, t), o = x.sprites[d.noder.sprites[n]], c = { x0: a.x - o.ox * a.skala, y0: a.y - o.oy * a.skala, x1: a.x + (o.w - o.ox) * a.skala, y1: a.y + (o.h - o.oy) * a.skala }, u = Bt(n);
      return c.x0 < u.x1 && c.x1 > u.x0 && c.y0 < u.y1 && c.y1 > u.y0;
    }, pt = (n, t, a, o = x) => {
      const c = o.sprites[n];
      return c && { x0: t - c.ox, y0: a - c.oy, x1: t - c.ox + c.w, y1: a - c.oy + c.h };
    }, mt = (n, t, a) => n && t >= n.x0 && t <= n.x1 && a >= n.y0 && a <= n.y1, yt = { butik: I.medlemFilm.butik, hvile: I.medlemFilm.koncertHvile, spiller: I.medlemFilm.spiller }, On = (n) => {
      const t = rt(ve(v, n));
      if (q === "butik" || !M) {
        return H(`medlem${n}-${yt.butik[t]}`, yt.butik[t]);
      }
      const a = M.medlem[n], o = Ve[n];
      if (!o || o.nr !== a.nr || o.s !== M) {
        Ve[n] = { nr: a.nr, s: M, p: Te(yt[a.mode][t], Ze(0, 500)) };
      }
      return Ve[n].p;
    }, Fn = (n) => I.medlemFilm.butik[rt(ve(v, n))], Vt = (n, t) => {
      if (q !== "koncert" || !M || M.tilstand !== O.SPILLER) {
        return;
      }
      const a = d.knapper.x.findIndex((o, c) => {
        const u = Bt(c);
        return n > u.x0 && n < u.x1 && t > u.y0 && t < u.y1;
      });
      if (mr(M, a, $n) === "rigtigt" && Se[a]) {
        Se[a].reset();
        Se[a].advance(0);
        Se[a].vis = true;
      }
    }, Dn = (n, t) => {
      if (q === "koncert") {
        if (M && M.tilstand === O.INTRO && K) {
          K.spring();
        }
        return;
      }
      const a = n + Q.x, o = t + Q.y, c = (u) => {
        Z.spil(ze);
        ne.aabn(u);
      };
      if (mt(pt(g.info.sprite, g.info.x + (BW - 1280), g.info.y, i.pakke.M), n, t)) {
        Z.spil(ze);
        ne.aabn(Tt(5));
        return;
      }
      if (mt(pt(ie.billede, ie.x, ie.y), a, o)) {
        return c(xn());
      }
      if (mt(pt(de.billede, de.x, de.y), a, o)) {
        J("sangbog");
        c(Pn());
        Oe(8);
        return;
      }
      for (let u = I.medlemPos.length - 1; u >= 0; u--) {
        const [y, k] = I.medlemPos[u], w = u < v.band.length ? Fn(u) : I.medlemFilm.butik[0], h = ht_(x, H(`boks${w}`, w));
        if (h && a >= y + h.x0 && a <= y + h.x1 && o >= k + h.y0 && o <= k + h.y1) {
          if (u < v.band.length) {
            J("medlem");
            c(Ln(u));
            Oe(7);
            return;
          }
          if (u === v.band.length) {
            J("nytMedlem");
            return c(En());
          }
        }
      }
      for (const u of Fe()) {
        const y = Re(u.plads), k = Rt(y), w = R.traef[y.type];
        if (a >= k.x - w.ox && a <= k.x - w.ox + w.w && o >= k.y - w.oy && o <= k.y - w.oy + w.h) {
          ne.aabn(_t(u, fe()) ? jn(u) : Kt(u.plads));
          return;
        }
      }
    };
    let Ue = null;
    const Je = () => q === "koncert", Cn = (n, t) => {
      if (!Je()) {
        ke.tryk(n);
        he.tryk(t);
      }
      Ue = [n, t];
      Vt(n, t);
    }, Bn = (n, t) => {
      if (!Je()) {
        ke.flyt(n);
        he.flyt(t);
      }
    }, Vn = (n, t) => {
      if (!Je()) {
        ke.slip();
        he.slip();
      }
      const a = Ue;
      Ue = null;
      if (a && Math.hypot((n - a[0]) * oe.faktor[0], (t - a[1]) * oe.faktor[1]) <= oe.tryk) {
        Dn(n, t);
      }
    }, Un = () => {
      if (!Je()) {
        ke.slip();
        he.slip();
      }
      Ue = null;
    };
    m.current = { menuer: ne, kit: Ie, ned: Cn, traekTil: Bn, slip: Vn, afbryd: Un, trykNed: Vt, get visning() {
        return q;
      } };
    let kt, Ut = performance.now(), ht = 0, Ye = l, Jt = null, Yt = null;
    const Xt = (n) => {
      const t = P.current ? 0 : Math.min(250, n - Ut);
      Ut = n;
      if (P.current !== Ae) {
        Ae = P.current;
        if (M && M.tilstand === O.SPILLER) {
          ae.forEach((r) => Ae ? r.pause() : r.play().catch(() => {
          }));
        }
        if (Ae) {
          Z.stop(d.lyde.publikum);
        } else {
          et();
        }
      }
      if (N.current !== Ye) {
        Ye = N.current;
        Z.saetTil(Ye);
        if (Ye && !Ae) {
          et();
        }
      }
      const a = M ? M.tilstand : null;
      if (a !== Jt && (Jt = a, (a === O.SPILLER || a === O.SLUT) && (_e = a === O.SPILLER ? d.lyde.publikumStyrke.sang : d.lyde.publikumStyrke.scene, Z.volumen(d.lyde.publikum, _e))), Q.x = ke.tik(t), Q.y = he.tik(t), M) {
        if (M.tilstand === O.INTRO && !(K && K.taler) && Kn(), pr(M, t), M.tilstand === O.SPILLER && ae[0] && !ae[0].paused && ae[0].currentTime > 0) {
          const r = ae[0].currentTime * 1e3 - b1_;
          if (Math.abs(r - M.ur) > 80) {
            M.ur = r;
          }
        }
        if (ae.forEach((r, f) => {
          r.volume = N.current ? Ba_(r.src, M.spor[f] * (d.instrumentVolumen[f] / 255)) : 0;
        }), M.tilstand !== O.SPILLER && M.tilstand !== O.INTRO && ae.forEach((r) => r.pause()), M.effekt && (M.baner.forEach((r, f) => {
          if (r != null) {
            An(M.effekt.beloeb, d.knapper.x[f], d.knapper.y);
          }
        }), M.effekt = null), M.tilstand === O.SLUT && !M.betalt) {
          const r = Dt(), f = ln(r);
          J("efterKoncert", f < 10 ? 0 : f < 45 ? 1 : 2);
          Ce = true;
        } else if (M.tilstand === O.SLUT && Ce && !(K && K.taler)) {
          const r = Ft;
          Ot();
          if (r) {
            ne.aabn(Tn(r));
          }
        }
        if (M) {
          for (const r of M.lyde.splice(0)) {
            Z.spil(typeof r == "string" ? Pt[r] : d.lyde.falsk[r.falsk]);
          }
        }
      }
      for (ft += t; ft >= zc_;) {
        ft -= zc_;
        Be.trin();
      }
      Se.forEach((r) => {
        if (r && r.vis) {
          r.advance(t);
        }
      });
      for (const r of nt.values()) {
        if (r.p) {
          r.p.advance(t);
        }
      }
      for (const [r, f] of we) {
        if (f) {
          f.advance(t);
          if (f.finished) {
            we.delete(r);
          }
        }
      }
      for (const r of Ve) {
        if (r && r.p) {
          r.p.advance(t);
        }
      }
      if (kn(t), q === "butik") {
        const r = v.ventTil - fe();
        if (r === 0 && Yt === 1) {
          Z.spil(d.lyde.ventetidSlut);
        }
        Yt = r;
      }
      for (lt.film(M && M.tilstand === O.SPILLER ? d.publikum.jubler : d.publikum.venter), lt.tik(t), ht += t; ht >= zc_;) {
        ht -= zc_;
        at.trin();
      }
      at.tik(t);
      In(t);
      if (K) {
        K.tik(t);
      }
      Lt.fremad(t, !!K && K.taler);
      const o = (r, f, E) => xe(L, x, T, r, f, E);
      at.tegn(Q, (r, f, E) => pe(L, x, T, r, f, E), o);
      on(L, x, T, j.bg, d.baggrund.base, Math.trunc(Q.x * d.baggrund.parallakse), Math.trunc(Q.y * d.baggrund.parallakse));
      const c = (r) => r - Q.x, u = (r) => r - Q.y, y = fe(), k = q === "koncert" && !!M && M.tilstand === O.SPILLER;
      for (const r of Fe()) {
        const f = Rt(Re(r.plads)), E = _t(r, y);
        if (!(E && k)) {
          if (we.has(r.plads)) {
            const C = we.get(r.plads);
            if (C) {
              o(C, c(f.x), u(f.y));
            }
          } else {
            xe(L, x, T, H(`gen${r.plads}-${r.type}-${r.f}`, R.film[r.type][r.f]), c(f.x), u(f.y), E ? R.byg.alfa / 255 : 1);
          }
          if (E) {
            const C = H(`sav${r.plads}`, R.byg.film), $ = ht_(x, C);
            o(C, c(f.x), u(f.y));
            if (s) {
              s.tegn(L, Ga_(en(r, y)), c(f.x), u(f.y) + ($ ? $.y0 : 0) + R.byg.tekstDy, { font: 2, midt: true });
            }
          }
          if (k && r.type === 3 && r.f >= 1) {
            o(H(`hfx${r.plads}`, R.hoejttaler), c(f.x), u(f.y));
          }
        }
      }
      if (v.band.forEach((r, f) => xe(L, x, T, On(f), c(I.medlemPos[f][0]), u(I.medlemPos[f][1]), 1, Et(ve(v, f)))), q === "butik") {
        const r = v.band.length;
        if (r < I.medlemPos.length) {
          xe(L, x, T, H("ledig", I.medlemFilm.butik[0]), c(I.medlemPos[r][0]), u(I.medlemPos[r][1]), 0.45);
        }
      }
      on(L, x, T, j.fg, d.forgrund.base, Q.x, Q.y);
      if (q === "butik") {
        o(st[1].p, c(de.x), u(de.y));
      }
      o(yn, c(ie.x), u(ie.y));
      if (q === "butik") {
        o(st[0].p, c(ie.x), u(ie.y));
      }
      lt.tegn(Q, o);
      const w = q === "butik" ? vr(v, y) : 0;
      if (w >= 1 && s) {
        const r = d.koncert.nedtaelling;
        s.tegn(L, Ga_(w), c(de.x + r.dx + r.b / 2), u(de.y + r.dy + r.h / 2), { font: r.skrift, midt: true });
      }
      const h = Be.v / 255;
      if (h > 0 && pe(L, x, T, d.spor.sprite, d.spor.x, d.spor.y, 1, h), M && q === "koncert") {
        for (let r = 0; r < 4; r++) {
          const f = M.noder[r];
          if (!f) {
            continue;
          }
          const E = Wt(M, r, f);
          pe(L, x, T, d.noder.sprites[r], E.x, E.y, E.skala, E.alfa);
        }
      }
      if (h > 0 && pe(L, x, T, d.knapper.sprite, d.spor.x, d.knapper.y, 1, h), q === "koncert" && Se.forEach((r, f) => {
        if (r && r.vis) {
          xe(L, x, T, r, d.knapper.x[f], d.knapper.y);
        }
      }), q === "butik") {
        if (i.hud) {
          C1_(L, i.hud.H, i.hud.M, i.hud.I, s, W.penge);
          L.save();
          L.translate(-HUD_SHIFT, 0);
          Rn();
          L.restore();
        }
        Ie.sprite("ui", g.info.sprite, g.info.x + (BW - 1280), g.info.y);
      } else if (M) {
        const r = d.hud;
        xe(L, x, T, H("forlad", r.forlad.film), r.forlad.x + (BW - 1280), r.forlad.y);
        Ie.sprite("ui", r.taeller.sprite, r.taeller.x, r.taeller.y);
        const f = i.pakke.M.sprites[r.taeller.sprite];
        if (s && f) {
          const [E, C] = r.taeller.tekst;
          s.tegn(L, String(M.rigtige), r.taeller.x + f.w * E + f.w / 2, r.taeller.y + f.h * C, { font: 1, midt: true, op: true });
        }
      }
      Lt.tegn(L, tt.figurTale.map((r) => r >= 0 ? Le[r] : 0));
      for (const r of [...De]) {
        for (r.acc += t; r.acc >= zc_;) {
          r.acc -= zc_;
          r.x.trin();
          r.y.trin();
          r.alfa.trin();
          r.skala.trin();
        }
        if (r.tid += t, r.tid > G.tid) {
          De.splice(De.indexOf(r), 1);
          continue;
        }
        const f = r.skala.v / 256, E = G.sprite + Math.floor(r.tid / (1e3 / G.hudFps)) % G.antal;
        pe(L, x, T, E, r.x.v, r.y.v, f, Math.min(255, r.alfa.v + 128) / 255);
        if (s) {
          s.tegn(L, String(r.beloeb), r.x.v + G.tekstDx, r.y.v + G.tekstDy, { font: 3, str: 57 * f, alfa: Math.max(0, r.alfa.v) / 255 });
        }
      }
      ne.tegn(Ie, L, BW, 768);
      kt = requestAnimationFrame(Xt);
    };
    kt = requestAnimationFrame(Xt);
    const Gt = (n) => {
      if (ne.aaben) {
        n.preventDefault();
        ne.rul(n.deltaY);
      }
    }, qt = S.current;
    qt.addEventListener("wheel", Gt, { passive: false });
    return () => {
      cancelAnimationFrame(kt);
      Z.stopAlle();
      dt();
      if (re) {
        re.pause();
      }
      if (K) {
        K.stop();
      }
      if (b) {
        b.skift(null);
      }
      qt.removeEventListener("wheel", Gt);
    };
  }, [j, i, s, p, b]);
  const D = React.useRef(null), B = (d) => {
    const x = S.current.getBoundingClientRect();
    return [(d.clientX - x.left) * BW / x.width, (d.clientY - x.top) * 768 / x.height];
  }, Me = (d) => {
    const x = m.current;
    if (!x || P.current) {
      return;
    }
    if (Y.current) {
      Y.current.poke();
    }
    const [T, g] = B(d);
    try {
      d.currentTarget.setPointerCapture(d.pointerId);
    }
    catch {
    }
    if (x.menuer.aaben) {
      D.current = { menu: true, x: T, y: g, flyttet: 0 };
      return;
    }
    D.current = { menu: false };
    x.ned(T, g);
  }, dn = (d) => {
    const x = D.current, T = m.current;
    if (!x || !T) {
      return;
    }
    const [g, I] = B(d);
    if (!x.menu) {
      T.traekTil(g, I);
      return;
    }
    if (T.menuer.aaben) {
      T.menuer.rul(x.y - I);
    }
    x.flyttet += Math.abs(g - x.x) + Math.abs(I - x.y);
    x.x = g;
    x.y = I;
  }, pn = (d) => {
    const x = D.current, T = m.current;
    if (D.current = null, !x || !T) {
      return;
    }
    const [g, I] = B(d);
    if (!x.menu) {
      T.slip(g, I);
      return;
    }
    if (!(x.flyttet > 12 || P.current)) {
      T.menuer.klik(T.kit, { x: g, y: I });
    }
  }, mn = () => {
    const d = D.current, x = m.current;
    D.current = null;
    if (d && !d.menu && x) {
      x.afbryd();
    }
  };
  React.useEffect(() => {
    const d = { d: 0, f: 1, j: 2, k: 3, 1: 0, 2: 1, 3: 2, 4: 3 }, x = (T) => {
      const g = m.current;
      if (T.repeat || !g || g.visning !== "koncert" || P.current || g.menuer.aaben) {
        return;
      }
      const I = d[T.key.toLowerCase()];
      if (I !== void 0) {
        g.trykNed(j.spil.knapper.x[I], j.spil.knapper.y - 40);
      }
    };
    window.addEventListener("keydown", x);
    return () => window.removeEventListener("keydown", x);
  }, [j]);
  return j.status === "loading" ? ce.jsx(Ka_, { bredde: BW }) : j.status === "error" ? ce.jsxs("div", { className: "msg error", children: [ce.jsxs("p", { children: ["Kunne ikke indlæse: ", j.error] }), ce.jsxs("p", { className: "hint", children: ["Kør ", ce.jsx("code", { children: "node Tools/export-pop.js" }), " og ", ce.jsx("code", { children: "node Tools/export-minispil-tekster.js" }), "."] })] }) : ce.jsx("div", { className: "spilflade", children: ce.jsx("canvas", { ref: S, width: BW, height: 768, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: Me, onPointerMove: dn, onPointerUp: pn, onPointerCancel: mn }) });
}
export { PopstarsGame as default };
