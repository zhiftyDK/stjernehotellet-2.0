import React from 'react';
import * as O from 'react/jsx-runtime';
import { Tween as pn_, FRAME_MS as zc_, AcceleratingValue as $c_ } from '../engine/tween.js';
import { drawSprite as De_, drawAnimation as fe_, drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { rd as rd_, wk as wk_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
const R = { INTRO: 0, VAELG: 1, START: 2, SIGTER: 3, PENDUL: 4, KRAFT: 5, RULLER: 6, HULLET: 7, TAVLE: 8, SLUT: 9, FAERDIG: 10 }, rt = 65536, X = Math.PI / 180, _ = (t) => (Math.round(t) % 360 + 360) % 360, lt = (t, r) => _(Math.atan2(r, t) / X);
function $t(t, r) {
  const a = r.kollision.punkter, u = t.bold.vaegTyk / rt;
  return a.map((f, l) => {
    const n = a[(l + 1) % a.length], e = lt(n[0] - f[0], n[1] - f[1]), c = (e + 90) % 360, s = u * Math.cos(c * X), i = u * Math.sin(c * X);
    return { a: f, b: n, v: e, n: c, sa: [f[0] + s, f[1] + i], sb: [n[0] + s, n[1] + i] };
  });
}
function Pt(t) {
  const r = t.data;
  t.bane = r.baner[t.hul + r.svaerhed[t.svaer].forskyd];
  t.vaegge = $t(r, t.bane);
  const [a, u] = t.bane.kollision.start;
  t.bold = { x: a, y: u, fart: 0, retning: 0, ruller: false, iHul: false };
  t.sigte = lt(t.bane.kollision.hul[0] - a, t.bane.kollision.hul[1] - u);
  t.slag = 0;
}
function Yt(t, r = 0) {
  const a = { data: t, svaer: r, spillere: [], valgt: [false, false, false], hul: 0, tur: 0, point: [], maaler: 0, maalerRet: 1, pendul: 0.5, kraft: 0, rest: 0, lyde: [], beloenning: 0, tilstand: R.INTRO };
  Pt(a);
  return a;
}
function Ct(t, r) {
  if (t.tilstand !== R.VAELG || r < 0 || r >= t.valgt.length) {
    return false;
  }
  t.valgt[r] = !t.valgt[r];
  return true;
}
function Jt(t) {
  if (t.tilstand !== R.VAELG || !t.valgt.some(Boolean)) {
    return false;
  }
  t.spillere = t.valgt.flatMap((r, a) => r ? [a] : []);
  t.point = t.spillere.map(() => Array(t.data.huller).fill(0));
  t.tur = 0;
  t.tilstand = R.START;
  return true;
}
function Wt(t) {
  const r = t.data, a = t.bold;
  let u = a.x, f = a.y, l = a.retning, n = a.fart / rt;
  const e = a.retning;
  for (let c = 0; n > 0 && c < 8; c++) {
    const s = u + n * Math.cos(l * X), i = f + n * Math.sin(l * X);
    let h = null;
    for (const k of t.vaegge) {
      let d = Math.abs(_(l) - k.n) % 360;
      if (d > 180 && (d = 360 - d), d >= 90) {
        const x = _t([u, f], [s, i], k.sa, k.sb);
        if (x) {
          const m = Math.hypot(x[0] - u, x[1] - f);
          if (!h || m < h.dist) {
            h = { p: x, dist: m, ny: k.n };
          }
        }
      }
      const g = qt([u, f], [s, i], k.b, 8);
      if (g && g.dist > 1 / rt && (!h || g.dist < h.dist)) {
        h = { p: g.p, dist: g.dist, hjoerne: k.b };
      }
    }
    if (!h) {
      u = s;
      f = i;
      break;
    }
    const b = _(l + 180), L = h.p[0] + Math.cos(b * X), I = h.p[1] + Math.sin(b * X), K = h.hjoerne ? lt(h.hjoerne[0] - L, h.hjoerne[1] - I) : h.ny;
    l = _((K - b) * 2 + b);
    n -= h.dist - 1;
    u = L;
    f = I;
  }
  if (a.x = u, a.y = f, a.retning = l, l !== e && t.lyde.push("vaeg"), a.fart = Math.max(0, a.fart - r.bold.friktion * 33), a.fart < r.bold.minFart && (a.fart = 0, a.ruller = false), a.fart <= r.bold.hulFart) {
    const [c, s] = t.bane.kollision.hul;
    if (Math.hypot(a.x - c, a.y - s) < r.bold.hulRadius) {
      t.lyde.push("hul");
      a.x = c;
      a.y = s;
      a.fart = 0;
      a.ruller = false;
      a.iHul = true;
    }
  }
}
function _t(t, r, a, u) {
  const f = [r[0] - t[0], r[1] - t[1]], l = [u[0] - a[0], u[1] - a[1]], n = f[0] * l[1] - f[1] * l[0];
  if (Math.abs(n) < 1e-9) {
    return null;
  }
  const e = ((a[0] - t[0]) * l[1] - (a[1] - t[1]) * l[0]) / n, c = ((a[0] - t[0]) * f[1] - (a[1] - t[1]) * f[0]) / n;
  return e < 0 || e > 1 || c < 0 || c > 1 ? null : [t[0] + e * f[0], t[1] + e * f[1]];
}
function qt(t, r, a, u) {
  const f = r[0] - t[0], l = r[1] - t[1], n = t[0] - a[0], e = t[1] - a[1], c = f * f + l * l;
  if (c < 1e-9) {
    return null;
  }
  const s = 2 * (n * f + e * l), i = n * n + e * e - u * u, h = s * s - 4 * c * i;
  if (h < 0) {
    return null;
  }
  const b = Math.sqrt(h), L = [(-s - b) / (2 * c), (-s + b) / (2 * c)].filter((K) => K >= 0 && K <= 1);
  if (!L.length) {
    return null;
  }
  const I = Math.min(...L);
  return { p: [t[0] + I * f, t[1] + I * l], dist: I * Math.sqrt(c) };
}
function zt(t) {
  const r = t.data;
  if (t.tilstand === R.PENDUL || t.tilstand === R.KRAFT) {
    t.maaler += t.maalerRet / 29;
    if (t.maaler >= 1) {
      t.maaler = 1;
      t.maalerRet = -1;
    }
    if (t.maaler <= 0) {
      t.maaler = 0;
      t.maalerRet = 1;
    }
  }
  if (t.tilstand === R.RULLER) {
    Wt(t);
    if (!t.bold.ruller) {
      if (t.bold.iHul || t.slag >= r.maxSlag) {
        t.point[t.tur][t.hul] = t.slag;
        if (t.bold.iHul && Math.random() < 0.75) {
          t.lyde.push("jubel");
        }
        t.tilstand = R.HULLET;
      } else {
        t.sigte = lt(t.bane.kollision.hul[0] - t.bold.x, t.bane.kollision.hul[1] - t.bold.y);
        t.tilstand = R.SIGTER;
      }
    }
  }
}
function Qt(t, r) {
  for (t.rest += Math.min(r, 250); t.rest >= 33;) {
    t.rest -= 33;
    zt(t);
  }
}
function ut(t, r) {
  if (t.tilstand === R.SIGTER) {
    t.sigte = _(t.sigte + r);
  }
}
function wt(t) {
  const r = t.data;
  switch (t.tilstand) {
    case R.SIGTER:
      t.slag += 1;
      t.maaler = 0;
      t.maalerRet = 1;
      t.tilstand = R.PENDUL;
      return "pendul";
    case R.PENDUL:
      t.pendul = t.maaler;
      t.maaler = 0;
      t.maalerRet = 1;
      t.tilstand = R.KRAFT;
      return "kraft";
    case R.KRAFT: {
      t.kraft = t.maaler;
      const a = r.slag.min + (r.slag.max - r.slag.min) * t.kraft, u = r.slag.spredning / rt * (t.pendul - 0.5);
      t.bold.fart = a;
      t.bold.retning = _(t.sigte + u);
      t.bold.ruller = true;
      t.lyde.push(a > r.slag.max / 2 ? "haardt" : a > r.slag.max / 4 ? "mellem" : "blødt");
      t.tilstand = R.RULLER;
      return "slag";
    }
    case R.TAVLE:
      t.tur += 1;
      if (t.tur >= t.spillere.length) {
        t.tur = 0;
        t.hul += 1;
      }
      if (t.hul < r.huller) {
        Pt(t);
        t.tilstand = R.START;
      } else {
        t.tilstand = R.SLUT;
        t.beloenning = r.beloenning;
        t.lyde.push("vundet");
      }
      return "videre";
    default:
      return null;
  }
}
let BWG = 1280;
function St({ verdenB: t, verdenH: r, maks: a, deler: u }) {
  const f = (i, h) => [Math.max(0, Math.min(t - BWG, i - BWG / 2)), Math.max(0, Math.min(r - 768, h - 384))], [l, n] = f(0, 0), e = new $c_(l, a, u), c = new $c_(n, a, u), s = { x: l, y: n, maal(i, h) {
      [e.maal, c.maal] = f(i, h);
    }, tvang(i, h) {
      const [b, L] = f(i, h);
      e.saet(b);
      c.saet(L);
      s.x = b;
      s.y = L;
    }, trin() {
      e.trin();
      c.trin();
      s.x = Math.floor(e.v);
      s.y = Math.floor(c.v);
    }, get bevaeger() {
      return e.bevaeger || c.bevaeger;
    } };
  return s;
}
function Zt(t, r) {
  const a = t.figurer, u = new Map(r.animations.map((n) => [n.id, n])), f = (n) => {
    const e = u.get(n), c = e ? new Xe_(e) : null;
    if (c) {
      c.advance(0);
    }
    return c;
  }, l = a.film.map((n, e) => ({ film: n.map(f), nr: 0, x: new pn_(a.intro[e][0], a.glid), y: new pn_(a.intro[e][1], a.glid), alfa: new pn_(0, a.fade), mark: new pn_(0, a.markFade), aktiv: true, ref: r.sprites[a.billeder[e]] }));
  return { figurer: l, saet(n, e = 0) {
      l.forEach((c, s) => {
        c.mark.mod(0);
        const i = n === 0 || n === 3 ? a.intro[s] : n === 1 ? s === e ? a.intro[s] : a.spil[s] : s === e ? a.tavle[s] : a.spil[s];
        c.x.mod(i[0]);
        c.y.mod(i[1]);
        c.aktiv = n === 0 || n === 3 || n === 2 && s === e;
      });
    }, marker(n, e) {
      if (l[n]) {
        l[n].mark.mod(e ? 255 : 0);
      }
    }, trin(n) {
      l.forEach((e, c) => {
        var h, b;
        const s = e.film[e.nr];
        if (s) {
          s.advance(zc_);
        }
        e.alfa.trin();
        e.x.trin();
        e.y.trin();
        e.mark.trin();
        if (e.alfa.v === 0 && e.aktiv) {
          e.alfa.mod(255);
        }
        const i = n[c] ? 1 : 0;
        if (i !== e.nr && e.film[i]) {
          e.nr = i;
          if ((b = (h = e.film[i]).reset) != null) {
            b.call(h);
          }
          e.film[i].advance(0);
        }
      });
    }, alleStille() {
      return l.every((n) => n.x.v === n.x.maal && n.y.v === n.y.maal);
    }, ramt(n, e) {
      return l.findIndex((c) => {
        const s = c.ref;
        if (!s) {
          return false;
        }
        const i = c.x.v - s.ox, h = c.y.v - s.oy;
        return n >= i && n < i + s.w && e >= h && e < h + s.h;
      });
    }, tegn(n, e, c) {
      for (let s = l.length - 1; s >= 0; s--) {
        const i = l[s], h = i.x.v - c.x, b = i.y.v - c.y, L = i.ref ? i.ref.h : 0;
        if (i.mark.v > 0) {
          De_(n, r, e, a.markering, h, b - (s === 1 ? L : Math.trunc(L / 2)), i.mark.v / 255);
        }
        if (i.alfa.v > 0) {
          fe_(n, r, e, i.film[i.nr], h, b, false, i.alfa.v / 255);
        }
      }
    } };
}
function te(t) {
  const r = t.start;
  let a = 0, u = 0, f = false;
  return { vis(l) {
      if (l !== f) {
        f = l;
        a = l ? 1 : 0;
        u = 0;
      }
    }, trin(l) {
      u += l;
    }, get billede() {
      const [l, n, e] = r.film[a];
      return l + Math.min(n - 1, Math.floor(u * e / 1e3));
    }, ramt(l, n) {
      return Math.abs(l - r.x) < r.b / 2 && Math.abs(n - r.y) < r.h / 2;
    } };
}
function ee(t, r, a, u, f) {
  const l = u.top, n = Math.max(0, Math.floor((f.y + l.loeft) / l.flise)), e = Math.min(l.raekker, Math.ceil((f.y + l.loeft + 768) / l.flise)), c = Math.max(0, Math.floor(f.x / l.flise)), s = Math.min(l.kolonner, Math.ceil((f.x + BWG) / l.flise));
  for (let i = n; i < e; i++) {
    for (let h = c; h < s; h++) {
      const b = l.felter[i][h];
      if (!(!b || b >= l.antal)) {
        De_(t, r, a, l.base + b, h * l.flise - f.x, i * l.flise - f.y - l.loeft);
      }
    }
  }
}
function ne(t) {
  const r = t.skyer, a = (n, e) => n + Math.floor(Math.random() * (e - n + 1)), u = (n, e) => {
    const c = a(0, 5), s = c === 1 ? r.mellem : r.store;
    n.sprite = s[a(0, s.length - 1)];
    n.x = e ? a(r.start[0], r.start[1]) : r.ind;
    const i = r.typer[Math.min(c, 2)];
    n.y = a(i.y[0], i.y[1]);
    n.fart = a(i.fart[0], i.fart[1]);
  }, f = Array.from({ length: r.antal }, () => {
    const n = {};
    u(n, true);
    return n;
  }), l = () => f.sort((n, e) => n.fart - e.fart);
  l();
  return { skyer: f, trin() {
      for (const n of f) {
        n.x += n.fart;
        if (n.x >= r.ude) {
          u(n, false);
          l();
        }
      }
    }, tegn(n, e, c, s) {
      for (let b = 0; b < BWG; b += t.himmel.skridt) {
        De_(n, e, c, t.himmel.stribe, b, 0);
      }
      const i = Math.trunc(s.x / 2), h = Math.trunc(s.y / 2) + 768 - r.forskyd;
      for (const b of f) {
        De_(n, e, c, b.sprite, Math.trunc(b.x / r.skala[0]) - i, Math.trunc(b.y / r.skala[1]) - h);
      }
    } };
}
function ae(t, r, a, u, f) {
  const l = Math.trunc(f.x * 5 / 4);
  for (const [n, e] of u.buske.pos) {
    De_(t, r, a, u.buske.sprite, n - l, e - f.y);
  }
}
function re(t, r, a, u, f, l, n) {
  const e = u.tavle;
  l.forEach((c, s) => {
    const i = e.x[s] - f.x;
    De_(t, r, a, e.ikon, i + e.ikonDx, e.y - e.h - f.y);
    let h = 0;
    c.forEach((b, L) => {
      if (!(b <= 0)) {
        h += b;
        if (n) {
          n.tegn(t, String(b), i, e.y + L * e.h - f.y, { font: e.skrift, midt: true, op: true });
        }
      }
    });
    if (h > 0) {
      De_(t, r, a, e.sum, e.sumPos[s][0] - f.x, e.sumPos[s][1] - f.y);
      if (n) {
        n.tegn(t, String(h), i, e.y + c.length * e.h + e.sumDy - f.y, { font: e.skrift, midt: true, op: true });
      }
    }
  });
}
function le() {
  const [t, r] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let a = false;
    (async () => {
      try {
        const [u, f, l] = await Promise.all([fetch("data/golf/spil.json").then((e) => e.ok ? e.json() : Promise.reject(new Error(`spil.json: ${e.status}`))), fetch("data/golf/manifest.json").then((e) => e.ok ? e.json() : Promise.reject(new Error(`manifest.json: ${e.status}`))), Sv_("golf")]), n = {};
        await Promise.all(Object.entries(f.textures).map(([e, c]) => new Promise((s) => {
          const i = new Image();
          i.onload = () => {
            n[e] = i;
            s();
          };
          i.onerror = () => s();
          i.src = `data/golf/tex/${c.file}`;
        })));
        if (!a) {
          r({ status: "ready", spil: u, manifest: f, images: n, fortaeller: l });
        }
      }
      catch (u) {
        if (!a) {
          r({ status: "error", error: u.message });
        }
      }
    })();
    return () => {
      a = true;
    };
  }, []);
  return t;
}
function D(t, r, a, u, f, l, { vinkel: n = 0, alfa: e = 1, spejl: c = false } = {}) {
  const s = r.sprites[u], i = s && a[s.assetId];
  if (!(!i || e <= 0)) {
    t.save();
    t.globalAlpha = e;
    t.translate(f, l);
    if (n) {
      t.rotate(n * Math.PI / 180);
    }
    if (c) {
      t.scale(-1, 1);
    }
    Ql_(t, i, s);
    t.restore();
  }
}
function Dt(t, r, a, u, f, l) {
  const n = r.sprites[u.base], e = n ? n.w : 256;
  for (let c = 0; c < u.raekker; c++) {
    for (let s = 0; s < u.kolonner; s++) {
      const i = u.felter[c][s];
      if (i) {
        D(t, r, a, u.base + i, s * e - f, c * e - l);
      }
    }
  }
}
const E = { y: 672, bueX: 640, drejX: 640, drejY: 860, radius: 240, kraft: { x: 396, dy: -12, b: 504, h: 72, rammeX: 648, rammeDy: 24 }, skjult: 384, glid: 10 * (1e3 / 30) }, se = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t))), ie = 65536, dt = (t, r) => t + Math.floor(Math.random() * (r - t + 1));
function MinigolfGame({ bredde: BW = 1280, svaer: t = 0, pause: r = false, lydTil: a = true, skrift: u = null, paaSlut: f = () => {
} }) {
  BWG = BW;
  const l = le(), n = React.useRef(null), e = React.useRef(null), c = React.useRef(null), s = React.useRef(0), i = React.useRef(r);
  i.current = r;
  const h = React.useRef(f);
  h.current = f;
  React.useEffect(() => {
    if (l.status !== "ready") {
      return;
    }
    const k = l.spil, d = l.manifest, g = l.images, x = k.klubhus, m = R, o = Yt(k, t), Z = rd_(Object.values(wk_));
    Z.saetTil(a);
    c.current = Z;
    const A = St({ verdenB: x.top.kolonner * x.top.flise, verdenH: x.top.raekker * x.top.flise, ...x.kamera.top }), Y = (y) => A.maal(...x.kamera.maal[y]);
    Y(0);
    const G = Zt(x, d), q = te(x), ht = ne(x);
    let st = false;
    const mt = () => {
      const y = o.bane.bag, v = d.sprites[y.base] ? d.sprites[y.base].w : 256, S = St({ verdenB: y.kolonner * v, verdenH: y.raekker * v, ...x.kamera.bane });
      S.tvang(o.bold.x, o.bold.y);
      return S;
    };
    let T = mt(), gt = o.bane;
    const M = Ev_(l.fortaeller, Math.round((BW - 1024) / 2)), z = [0, 0, 0, 0];
    if (M) {
      M.saetLyd(a);
      M.figur = (y, v) => {
        if (y >= 0 && y < z.length) {
          z[y] = v;
        }
      };
    }
    const It = () => {
      if (M) {
        M.spring();
        z.fill(0);
      }
    }, yt = (y, v) => {
      if (M) {
        M.skift(y, v);
        z.fill(0);
      }
    }, it = () => !!M && M.optaget();
    let N = null;
    const w = (y) => {
      N = y;
    };
    let bt = 0;
    const V = () => bt, kt = () => {
      bt = o.spillere[o.tur] ?? 0;
    }, H = { hul: true, sigt: false, slag: false };
    w(1);
    let C = 0, Q = 0, pt = false;
    const vt = (y, v) => {
      switch (y) {
        case m.START:
          q.vis(false);
          kt();
          yt(V() + 19, V() + 22);
          if (H.hul) {
            H.hul = false;
            w(4);
          } else if (dt(0, 3) === 0) {
            w(2);
          }
          Q = C + 1500;
          Y(1);
          G.saet(1, V());
          break;
        case m.SIGTER:
          if (v === m.RULLER) {
            w(10);
          }
          if (!H.sigt) {
            H.sigt = true;
            w(6);
          }
          Y(2);
          st = false;
          break;
        case m.PENDUL:
          if (dt(0, 4) === 0) {
            w(7);
          }
          break;
        case m.KRAFT:
          if (dt(0, 4) === 0) {
            w(8);
          }
          break;
        case m.RULLER:
          if (!H.slag) {
            H.slag = true;
            w(9);
          }
          break;
        case m.HULLET:
          w(o.bold.iHul ? o.slag === 1 ? 12 : 11 : 10);
          H.slag = false;
          Q = C + 1500;
          Y(1);
          break;
        case m.TAVLE:
          kt();
          yt(V() + 25, V() + 28);
          w(14);
          Y(3);
          st = true;
          G.saet(2, V());
          break;
        case m.SLUT:
          G.saet(3, V());
          Y(0);
          w(17);
          break;
      }
    }, Ft = () => {
      C += zc_;
      if (N !== null && G.alleStille()) {
        if (M) {
          M.spil(N);
          M.saet(0, V());
          M.saet(1, 0);
          M.slump();
        }
        N = null;
      }
      const y = C > Q && !it() && !A.bevaeger && N === null;
      switch (o.tilstand) {
        case m.INTRO:
          if (!it() && N === null) {
            o.tilstand = m.VAELG;
          }
          break;
        case m.VAELG:
          q.vis(o.valgt.some(Boolean));
          break;
        case m.START:
          if (o.bane !== gt) {
            T = mt();
            gt = o.bane;
          }
          if (y) {
            T.tvang(o.bold.x, o.bold.y);
            o.tilstand = m.SIGTER;
          }
          break;
        case m.SIGTER:
        case m.PENDUL:
        case m.KRAFT:
          T.maal(o.bold.x, o.bold.y);
          break;
        case m.RULLER: {
          const v = 16 * o.bold.fart / ie, S = o.bold.retning * Math.PI / 180;
          T.maal(o.bold.x + v * Math.cos(S), o.bold.y + v * Math.sin(S));
          break;
        }
        case m.HULLET:
          if (y) {
            o.tilstand = m.TAVLE;
          }
          break;
        case m.SLUT:
          if (!it() && N === null) {
            o.tilstand = m.FAERDIG;
            Q = C + 1e3;
          }
          break;
        case m.FAERDIG:
          if (!pt && C > Q) {
            pt = true;
            h.current({ vundet: true, beloenning: o.beloenning });
          }
          break;
      }
      A.trin();
      T.trin();
      ht.trin();
      G.trin(z);
    }, Ut = () => {
      if (o.tilstand === m.TAVLE) {
        if (!A.bevaeger && N === null) {
          wt(o);
        }
      } else if (o.tilstand >= m.SIGTER && o.tilstand <= m.KRAFT) {
        wt(o);
      }
    }, Gt = (y, v) => {
      if (o.tilstand === m.INTRO || o.tilstand === m.TAVLE || o.tilstand === m.SLUT) {
        It();
        return;
      }
      if (o.tilstand !== m.VAELG) {
        return;
      }
      const S = y + A.x, U = v + A.y, B = G.ramt(S, U);
      if (q.ramt(S, U)) {
        if (Jt(o)) {
          w(3);
        }
        return;
      }
      if (Ct(o, B)) {
        G.marker(B, o.valgt[B]);
      }
    };
    e.current = { s: o, vaelg: Gt, aktiver: Ut };
    const p = n.current.getContext("2d");
    let ot, xt = performance.now(), tt = 0, ft = 0, J = null;
    const W = { praec: { fra: E.skjult, til: E.skjult, t: 1e9 }, kraft: { fra: E.skjult, til: E.skjult, t: 1e9 } }, ct = (y) => y.fra + (y.til - y.fra) * se(y.t / E.glid), Rt = (y, v) => {
      if (y.til !== v) {
        y.fra = ct(y);
        y.til = v;
        y.t = 0;
      }
    }, Mt = BW, et = k.skaerm.hoejde, Et = (y) => {
      const v = i.current ? 0 : Math.min(250, y - xt);
      if (xt = y, s.current) {
        for (tt += v; tt >= 33;) {
          tt -= 33;
          ut(o, s.current);
        }
      } else {
        tt = 0;
      }
      if (v > 0) {
        Qt(o, v);
      }
      for (const F of o.lyde.splice(0)) {
        Z.spil(wk_[F]);
      }
      for (o.tilstand !== J && (vt(o.tilstand, J), J = o.tilstand), ft += v; ft >= zc_;) {
        ft -= zc_;
        Ft();
        if (o.tilstand !== J) {
          vt(o.tilstand, J);
          J = o.tilstand;
        }
      }
      if (v > 0) {
        if (M) {
          M.tik(v);
        }
        q.trin(v);
      }
      p.fillStyle = `rgb(${k.himmel.join(",")})`;
      p.fillRect(0, 0, Mt, et);
      ht.tegn(p, d, g, A);
      const S = Math.max(0, et - A.y);
      if (S < et) {
        p.save();
        p.beginPath();
        p.rect(0, S, Mt, et - S);
        p.clip();
        Dt(p, d, g, o.bane.bag, T.x, T.y);
        const [F, j] = o.bane.kollision.hul;
        D(p, d, g, k.sprites.hul, F - T.x, j - T.y);
        if (!o.bold.iHul) {
          D(p, d, g, k.sprites.bold, o.bold.x - T.x, o.bold.y - T.y);
        }
        Dt(p, d, g, o.bane.for, T.x, T.y);
        if (o.tilstand === m.SIGTER || o.tilstand === m.PENDUL || o.tilstand === m.KRAFT) {
          D(p, d, g, k.sprites.pil, o.bold.x - T.x, o.bold.y - T.y, { vinkel: o.sigte });
        }
        p.restore();
      }
      ee(p, d, g, x, A);
      D(p, d, g, q.billede, x.start.x - A.x, x.start.y - A.y);
      G.tegn(p, g, A);
      if (st) {
        re(p, d, g, x, A, o.point, u);
      }
      ae(p, d, g, x, A);
      Rt(W.praec, o.tilstand === m.PENDUL ? 0 : E.skjult);
      Rt(W.kraft, o.tilstand === m.KRAFT ? 0 : E.skjult);
      W.praec.t += v;
      W.kraft.t += v;
      const U = { ...k.knapper, hoejre: k.knapper.hoejre + (BW - 1280), midt: k.knapper.midt + (BW - 1280) / 2 };
      if (o.tilstand === m.SIGTER) {
        D(p, d, g, k.sprites.knapper[0], U.venstre, U.y);
        D(p, d, g, k.sprites.knapper[1], U.hoejre, U.y);
        D(p, d, g, k.sprites.knapper[2], U.midt, U.y);
      }
      const B = ct(W.praec);
      if (B < E.skjult) {
        const F = E.y + B;
        if (D(p, d, g, k.sprites.praecRamme[0], E.bueX, F), D(p, d, g, k.sprites.praecRamme[1], E.bueX, F), o.tilstand === m.PENDUL) {
          const j = 225 + 90 * o.maaler, Tt = j * Math.PI / 180;
          D(p, d, g, k.sprites.praecMaerke, E.drejX + E.radius * Math.cos(Tt), E.drejY + B + E.radius * Math.sin(Tt), { vinkel: j + 90 });
        }
      }
      const Lt = ct(W.kraft);
      if (Lt < E.skjult) {
        const F = E.y + Lt, j = E.kraft;
        p.fillStyle = "#000";
        p.fillRect(j.x, F + j.dy, j.b, j.h);
        p.fillStyle = "#f00";
        p.fillRect(j.x, F + j.dy, Math.round(j.b * (o.tilstand === m.KRAFT ? o.maaler : o.kraft)), j.h);
        D(p, d, g, k.sprites.kraftRamme, j.rammeX, F + j.rammeDy);
      }
      ot = requestAnimationFrame(Et);
    };
    ot = requestAnimationFrame(Et);
    return () => {
      cancelAnimationFrame(ot);
      Z.stopAlle();
      if (M) {
        M.stop();
      }
    };
  }, [l, t, u]);
  React.useEffect(() => {
    if (c.current) {
      c.current.saetTil(a);
    }
  }, [a]);
  const b = (k) => {
    const d = n.current.getBoundingClientRect(), g = l.spil;
    return [(k.clientX - d.left) * BW / d.width, (k.clientY - d.top) * g.skaerm.hoejde / d.height];
  }, L = (k) => {
    const d = e.current;
    if (!d || i.current) {
      return;
    }
    const [g, x] = b(k);
    d.vaelg(g, x);
    const m = { ...l.spil.knapper, hoejre: l.spil.knapper.hoejre + (BW - 1280), midt: l.spil.knapper.midt + (BW - 1280) / 2 };
    if (d.s.tilstand === R.SIGTER) {
      if (Math.abs(x - m.y) >= 57) {
        return;
      }
      if (Math.abs(g - m.venstre) < 51) {
        s.current = -1;
        ut(d.s, -1);
        return;
      }
      if (Math.abs(g - m.hoejre) < 51) {
        s.current = 1;
        ut(d.s, 1);
        return;
      }
      if (Math.abs(g - m.midt) < 51) {
        d.aktiver();
      }
      return;
    }
    d.aktiver();
  }, I = () => {
    s.current = 0;
  };
  if (React.useEffect(() => {
    const k = (d) => {
      const g = e.current;
      if (!(!g || i.current)) {
        if (d.type === "keydown") {
          if (d.key === "ArrowLeft") {
            s.current = -1;
          } else if (d.key === "ArrowRight") {
            s.current = 1;
          } else if (d.key === " " || d.key === "Enter") {
            d.preventDefault();
            if (!d.repeat) {
              g.aktiver();
            }
          }
        } else if (d.key === "ArrowLeft" || d.key === "ArrowRight") {
          s.current = 0;
        }
      }
    };
    window.addEventListener("keydown", k);
    window.addEventListener("keyup", k);
    return () => {
      window.removeEventListener("keydown", k);
      window.removeEventListener("keyup", k);
    };
  }, []), l.status === "loading") {
    return O.jsx(Ka_, { bredde: BW });
  }
  if (l.status === "error") {
    return O.jsxs("div", { className: "msg error", children: [O.jsxs("p", { children: ["Kunne ikke indlæse: ", l.error] }), O.jsxs("p", { className: "hint", children: ["Kør ", O.jsx("code", { children: "node Tools/export-golf.js --out spil/public/data/golf" }), "."] })] });
  }
  const K = l.spil;
  return O.jsx("div", { className: "spilflade", children: O.jsx("canvas", { ref: n, width: BW, height: K.skaerm.hoejde, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: L, onPointerUp: I, onPointerLeave: I, onPointerCancel: I }) });
}
export { MinigolfGame as default };
