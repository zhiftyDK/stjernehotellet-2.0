import React from 'react';
import * as I from 'react/jsx-runtime';
import { Tween as pn_, FRAME_MS as zc_ } from '../engine/tween.js';
import { rd as rd_, gk as gk_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
const p = { NY_ORDRE: "ny_ordre", SPILLER: "spiller", FAERDIG: "faerdig", SKIFT: "skift", SLUT: "slut" }, A = (e, t) => e + Math.floor(Math.random() * (t - e + 1));
function ve(e, t) {
  return { v: e, fra: e, til: e, trin: t, i: t, rest: 0 };
}
function q(e, t) {
  if (e.til !== t) {
    e.fra = e.v;
    e.til = t;
    e.i = 0;
  }
}
function ie(e, t) {
  for (e.rest += t; e.rest > 33;) {
    if (e.rest -= 33, e.i++, e.i < e.trin) {
      const i = e.i / (e.trin - 1);
      e.v = e.fra + (e.til - e.fra) * ((1 - Math.cos(Math.PI * i)) / 2);
    } else {
      e.v = e.til;
    }
  }
  return e.v !== e.til;
}
function le(e, t) {
  const i = e.gaest.anims[0].length;
  let s;
  do {
    s = A(0, i - 1);
  } while (s === t && i > 1);
  return s;
}
function Re(e, t) {
  const i = e.svaerhed[t].kugler + A(0, 1), s = [];
  for (let o = 0; o < i; o++) {
    s.push(A(0, 7));
  }
  s.push(A(8, 10));
  return { ordre: s, kugler: i };
}
function xe(e, t) {
  const i = (s) => t && t.sprites[s];
  return e.is.sprites.map((s, o) => {
    const n = i(o === 11 ? e.is.kegleDisk : s);
    return n && n.w && n.h ? [n.ox / n.w, n.oy / n.h] : [0.5, 0.5];
  });
}
function je(e, t = 0, i = null) {
  const s = { data: e, svaer: t, tilstand: p.NY_ORDRE, ordre: [], kugler: 0, stabel: [], haand: null, ske: { type: 0, x: 0, y: 0, alfa: new pn_(0, e.is.haandFade), acc: 0 }, svup: false, anker: xe(e, i), point: 0, tid: e.tid.ialt, ordreTid: e.svaerhed[t].straf ? e.tid.pr : -1, gaest: le(e, 0), glid: ve(e.gaest.fra, e.gaest.trin), gaestX: e.gaest.fra };
  q(s.glid, e.gaest.x);
  return s;
}
function oe(e) {
  const t = [];
  e.baljer.forEach(([i, s], o) => t.push({ type: o, x: i, y: s, b: e.baljeFelt[0], h: e.baljeFelt[1] }));
  e.krukker.forEach(([i, s], o) => t.push({ type: 8 + o, x: i, y: s, b: e.krukkeFelt[0], h: e.krukkeFelt[1] }));
  return t;
}
const Fe = (e, t, i) => t > e.x - e.b / 2 && t < e.x + e.b / 2 && i > e.y - e.h / 2 && i < e.y + e.h / 2, se = (e, t, [i, s], [o, n], f, l) => {
  const d = e - Math.trunc(i * o), g = t - Math.trunc(s * n);
  return f > d && f < d + i && l > g && l < g + s;
};
function H(e, t, i, s, o) {
  const n = e.is.hoejder;
  let f = n[11];
  for (const g of t) {
    f += n[g];
  }
  let l = o ? s - f / 2 : s - f;
  const d = [];
  for (let g = t.length - 1; g >= 0; g--) {
    d.unshift({ type: t[g], x: g % 2 === 0 ? i + 1 : i - 1, y: l });
    l += n[t[g]];
  }
  return { kugler: d, kegle: { x: i, y: l + n[11] }, hoejde: f };
}
function Ie(e, t, i, s = 0) {
  if (e.tilstand !== p.SPILLER || e.haand) {
    return null;
  }
  for (const o of oe(e.data)) {
    if (Fe(o, t, i)) {
      e.haand = { type: o.type, x: t, y: i, tid: s };
      Object.assign(e.ske, { type: o.type, x: t, y: i });
      e.ske.alfa.mod(255);
      return o.type;
    }
  }
  return null;
}
function Ee(e, t, i, s = 0, o = false) {
  if (!e.haand) {
    return false;
  }
  const n = Math.trunc(Math.hypot(t - e.haand.x, i - e.haand.y)), f = Math.round(s - e.haand.tid);
  e.haand.x = t;
  e.haand.y = i;
  e.haand.tid = s;
  e.ske.x = t;
  e.ske.y = i;
  const l = e.data.svup;
  if (f < 1) {
    return false;
  }
  if (e.svup) {
    if (n < Math.trunc(l.ned / f)) {
      e.svup = false;
    }
  } else if (n > Math.trunc(l.op / f) && !o) {
    e.svup = true;
    return true;
  }
  return false;
}
function Le(e, t, i) {
  if (!e.haand) {
    return null;
  }
  const s = e.haand.type;
  if (e.haand = null, e.svup = false, e.ske.alfa.mod(0), e.tilstand !== p.SPILLER) {
    return null;
  }
  const o = H(e.data, e.stabel, e.data.stabel.x, e.data.stabel.y, false);
  if (!(o.kugler.some((l) => se(l.x, l.y, e.data.is.kugleFelt, e.anker[l.type], t, i)) || se(o.kegle.x, o.kegle.y, e.data.is.kegleFelt, e.anker[11], t, i))) {
    return null;
  }
  const f = s === e.ordre[e.stabel.length];
  if (f) {
    e.stabel = [...e.stabel, s];
    if (e.stabel.length === e.ordre.length) {
      e.beloeb = e.kugler * e.data.point;
      e.point += e.beloeb;
      e.tilstand = p.FAERDIG;
      e.skiftTid = 1e3;
    }
  } else {
    e.stabel = [];
  }
  return { type: s, rigtig: f };
}
function we(e, t) {
  for (e.ske.acc += t; e.ske.acc >= zc_;) {
    e.ske.acc -= zc_;
    e.ske.alfa.trin();
  }
  if (e.tilstand !== p.SLUT) {
    if (e.tid = Math.max(0, e.tid - t), e.tilstand === p.NY_ORDRE) {
      const i = ie(e.glid, t);
      if (e.gaestX = e.glid.v, !i) {
        const s = Re(e.data, e.svaer);
        e.ordre = s.ordre;
        e.kugler = s.kugler;
        e.stabel = [];
        e.ordreTid = e.data.svaerhed[e.svaer].straf ? e.data.tid.pr : -1;
        e.tilstand = p.SPILLER;
      }
    } else if (e.tilstand === p.SPILLER) {
      if (e.ordreTid > 0) {
        e.ordreTid -= t;
        if (e.ordreTid <= 0) {
          e.tilstand = p.FAERDIG;
          e.skiftTid = 1e3;
        }
      }
    } else if (e.tilstand === p.FAERDIG) {
      e.skiftTid -= t;
      if (e.skiftTid <= 0) {
        if (e.haand) {
          e.ske.alfa.mod(0);
        }
        e.tilstand = p.SKIFT;
        e.stabel = [];
        e.haand = null;
        e.svup = false;
        q(e.glid, e.data.gaest.fra);
      }
    } else if (e.tilstand === p.SKIFT) {
      const i = ie(e.glid, t);
      if (e.gaestX = e.glid.v, !i) {
        if (e.tid <= 0) {
          e.tilstand = p.SLUT;
          return;
        }
        e.gaest = le(e.data, e.gaest);
        q(e.glid, e.data.gaest.x);
        e.tilstand = p.NY_ORDRE;
      }
    }
  }
}
function De(e, t) {
  return e.tid.fyld - Math.floor(Math.min(t, e.tid.ialt - 1) / e.tid.trin);
}
function Pe() {
  const [e, t] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let i = false;
    (async () => {
      try {
        const [s, o, n] = await Promise.all([fetch("data/is/spil.json").then((l) => l.ok ? l.json() : Promise.reject(new Error(`spil.json: ${l.status}`))), fetch("data/is/manifest.json").then((l) => l.ok ? l.json() : Promise.reject(new Error(`manifest.json: ${l.status}`))), Sv_("is")]), f = {};
        await Promise.all(Object.entries(o.textures).map(([l, d]) => new Promise((g) => {
          const E = new Image();
          E.onload = () => {
            f[l] = E;
            g();
          };
          E.onerror = () => g();
          E.src = `data/is/tex/${d.file}`;
        })));
        if (!i) {
          t({ status: "ready", spil: s, manifest: o, images: f, fortaeller: n });
        }
      }
      catch (s) {
        if (!i) {
          t({ status: "error", error: s.message });
        }
      }
    })();
    return () => {
      i = true;
    };
  }, []);
  return e;
}
function j(e, t, i, s, o, n, f = 1) {
  const l = t.sprites[s], d = l && i[l.assetId];
  if (!(!d || f <= 0)) {
    e.save();
    e.translate(o, n);
    Ql_(e, d, l, f);
    e.restore();
  }
}
function $(e, t, i, s, o, n, f = 1) {
  if (!(!s || f <= 0)) {
    for (const l of s.drawList("invers")) {
      const d = t.sprites[l.sprite], g = d && i[d.assetId];
      if (g) {
        e.save();
        e.translate(o + l.x, n + l.y);
        e.rotate((l.rot || 0) * Math.PI * 2);
        e.scale(l.scaleX * (l.flip ? -1 : 1), l.scaleY);
        e.globalAlpha = l.alpha * f;
        Ql_(e, g, d);
        e.restore();
      }
    }
  }
}
function IceCreamGame({ svaer: e = 0, pause: t = false, lydTil: i = true, paaSlut: s = () => {
}, pengeEffekt: o = () => {
} }) {
  const n = Pe(), f = React.useRef(null), l = React.useRef(null), d = React.useRef(null), g = React.useRef(null), E = React.useRef(false), D = React.useRef(t);
  D.current = t;
  const z = React.useRef(s);
  z.current = s;
  const J = React.useRef(o);
  J.current = o;
  React.useEffect(() => {
    if (d.current) {
      d.current.saetTil(i);
    }
    if (g.current) {
      g.current.saetLyd(i);
    }
  }, [i]);
  React.useEffect(() => {
    if (n.status !== "ready") {
      return;
    }
    const r = n.spil, y = r.skaerm.bredde, R = r.skaerm.hoejde, a = je(r, e, n.manifest);
    l.current = a;
    const x = rd_(Object.values(gk_));
    x.saetTil(i);
    d.current = x;
    const F = new Map(n.manifest.animations.map((k) => [k.id, k])), X = (k) => {
      const v = F.get(k);
      if (!v) {
        return null;
      }
      const C = new Xe_(v);
      C.advance(0);
      return C;
    }, ce = r.gaest.anims.map((k) => k.map(X)), de = r.is.haand.map(X), Y = r.pixeline ? X(r.pixeline.hvile) : null, pe = n.fortaeller, u = Ev_(pe);
    g.current = u;
    if (u) {
      u.saetLyd(i);
      u.spil(1);
      u.slump();
    }
    a.fortaeller = u;
    let Z = true;
    const c = { boble: new pn_(0, r.boble.fade), is: new pn_(0, r.boble.fade), ur: new pn_(0, r.tid.fade), fase: 0, acc: 0 };
    c.ur.mod(255);
    const ge = (k) => {
      for (c.acc += k; c.acc >= zc_;) {
        c.acc -= zc_;
        c.boble.trin();
        c.is.trin();
        c.ur.trin();
        if (c.fase === 1 && !c.boble.bevaeger) {
          c.fase = 2;
          c.is.mod(255);
        }
      }
    }, h = f.current.getContext("2d");
    let K, ee = performance.now(), U = a.tilstand, _ = 0, te = false;
    const ne = (k) => {
      const v = D.current ? 0 : Math.min(100, k - ee);
      ee = k;
      if (!(u && a.intro !== false && u.optaget()) && v > 0) {
        a.intro = false;
        we(a, v);
      }
      if (u && v > 0) {
        u.tik(v);
      }
      if (v > 0) {
        ge(v);
      }
      const L = ce[r.svaerhed[a.svaer].gaest][a.gaest];
      if (L) {
        L.advance(v);
      }
      if (Y && !u) {
        Y.advance(v);
      }
      const S = a.ske.alfa.v > 0 ? de[a.ske.type] : null;
      if (S) {
        S.advance(v);
      }
      h.fillStyle = "#8fd0ef";
      h.fillRect(0, 0, y, R);
      for (const m of r.baggrund.sprites) {
        j(h, n.manifest, n.images, m, r.baggrund.x, r.baggrund.y);
      }
      if (j(h, n.manifest, n.images, r.disk.sprite, r.disk.x, r.disk.y), $(h, n.manifest, n.images, L, a.gaestX, r.gaest.y), j(h, n.manifest, n.images, r.kant.sprite, r.kant.x, r.kant.y), u ? u.tegn(h) : r.pixeline && $(h, n.manifest, n.images, Y, r.pixeline.x, r.pixeline.y), c.boble.v > 0) {
        const m = c.boble.v / 255, re = c.is.v / 255;
        for (const P of r.boble.sprites) {
          j(h, n.manifest, n.images, P, r.boble.x, r.boble.y, m);
        }
        const V = H(r, a.ordre, r.boble.x, r.boble.y, true);
        for (const P of V.kugler) {
          j(h, n.manifest, n.images, r.is.sprites[P.type], P.x, P.y, re);
        }
        j(h, n.manifest, n.images, r.is.sprites[11], V.kegle.x, V.kegle.y, re);
      }
      const B = H(r, a.stabel, r.stabel.x, r.stabel.y, false);
      for (const m of B.kugler) {
        j(h, n.manifest, n.images, r.is.sprites[m.type], m.x, m.y);
      }
      if (j(h, n.manifest, n.images, r.is.kegleDisk, B.kegle.x, B.kegle.y), S && $(h, n.manifest, n.images, S, a.ske.x, a.ske.y + r.is.haandDy, a.ske.alfa.v / 255), j(h, n.manifest, n.images, r.tid.sprite, r.tid.x, r.tid.y, c.ur.v / 255), j(h, n.manifest, n.images, De(r, a.tid), r.tid.fyldX, r.tid.y, c.ur.v / 255), E.current) {
        h.strokeStyle = "rgba(0,255,0,.9)";
        for (const m of oe(r)) {
          h.strokeRect(m.x - m.b / 2, m.y - m.h / 2, m.b, m.h);
        }
      }
      if (a.tilstand !== U && u) {
        if (a.tilstand === p.SPILLER) {
          u.spil(Z ? 2 : 6);
          u.slump();
          Z = false;
        }
        if (a.tilstand === p.SLUT) {
          u.spil(7);
          u.slump();
        }
      }
      if (a.tilstand !== U) {
        if (a.tilstand === p.SPILLER) {
          c.boble.mod(255);
          c.is.mod(0);
          c.fase = 1;
        }
        if (a.tilstand === p.FAERDIG) {
          c.boble.mod(0);
          c.is.mod(0);
          c.fase = 3;
        }
        if (a.tilstand === p.FAERDIG && a.stabel.length === a.ordre.length) {
          x.spil(gk_.faerdig);
          J.current(a.beloeb);
          if (L) {
            L.reset();
            L.advance(0);
          }
        }
        if (a.tilstand === p.SLUT) {
          _ = k;
        }
        U = a.tilstand;
      }
      if (_ && !te && k - _ > 1500 && !(u && u.optaget())) {
        te = true;
        z.current({ vundet: true, beloenning: a.point });
      }
      K = requestAnimationFrame(ne);
    };
    K = requestAnimationFrame(ne);
    return () => {
      cancelAnimationFrame(K);
      x.stopAlle();
      if (u) {
        u.stop();
      }
    };
  }, [n, e]);
  const G = (r) => {
    const y = f.current.getBoundingClientRect(), R = n.spil;
    return [(r.clientX - y.left) * R.skaerm.bredde / y.width, (r.clientY - y.top) * R.skaerm.hoejde / y.height];
  }, T = React.useRef(null), N = (r) => T.current === null || T.current === r.pointerId, fe = (r) => {
    if (!N(r)) {
      return;
    }
    T.current = r.pointerId;
    const [y, R] = G(r), a = l.current;
    if (!(!a || D.current)) {
      if (a.intro !== false && a.fortaeller) {
        a.fortaeller.spring();
        return;
      }
      Ie(a, y, R, performance.now());
      try {
        if (f.current.setPointerCapture) {
          f.current.setPointerCapture(r.pointerId);
        }
      }
      catch {
      }
    }
  }, ue = (r) => {
    if (!N(r) || !l.current || D.current) {
      return;
    }
    const [y, R] = G(r), a = d.current;
    if (Ee(l.current, y, R, performance.now(), !!a && a.spiller(gk_.skub)) && a) {
      a.spil(gk_.skub);
    }
  }, Q = (r) => {
    if (!N(r)) {
      return;
    }
    T.current = null;
    const [y, R] = G(r), a = l.current;
    if (!a || D.current) {
      return;
    }
    const x = Le(a, y, R), F = a.fortaeller;
    if (x && F) {
      if (x.rigtig) {
        if (a.tilstand === p.FAERDIG) {
          F.spil(5);
          F.slump();
        } else if (!a.rostFoer) {
          F.spil(3);
          F.slump();
        }
      } else if (Math.random() < 0.1) {
        F.spil(4);
        F.slump();
      }
      if (x.rigtig) {
        a.rostFoer = true;
      }
    }
    if (x && d.current) {
      d.current.spil(x.type < 8 ? gk_.kugle : gk_.topping);
    }
  };
  if (n.status === "loading") {
    return I.jsx(Ka_, { bredde: 1280 });
  }
  if (n.status === "error") {
    return I.jsxs("div", { className: "msg error", children: [I.jsxs("p", { children: ["Kunne ikke indlæse: ", n.error] }), I.jsxs("p", { className: "hint", children: ["Kør ", I.jsx("code", { children: "node Tools/export-is.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] });
  }
  const W = n.spil;
  return I.jsx("div", { className: "spilflade", children: I.jsx("canvas", { ref: f, width: W.skaerm.bredde, height: W.skaerm.hoejde, style: { touchAction: "none", cursor: "grab" }, onPointerDown: fe, onPointerMove: ue, onPointerUp: Q, onPointerCancel: Q }) });
}
export { IceCreamGame as default };
