import React from 'react';
import * as y from 'react/jsx-runtime';
import { loadNarratorData as Sv_, createNarrator as Ev_ } from '../audio/audio.js';
import { rd as rd_, mk as mk_ } from '../loaders/data-loaders.js';
import { LoadingScreen as Ka_ } from './ui-kit.js';
const d = { SPILLER: "spiller", VUNDET: "vundet", TID_UDE: "tid_ude" }, oe = [{ brikker: 12, kolonner: 4, raekker: 3, sekunder: 60, beloenning: 60 }, { brikker: 16, kolonner: 4, raekker: 4, sekunder: 70, beloenning: 80 }, { brikker: 24, kolonner: 4, raekker: 6, sekunder: 90, beloenning: 100 }];
function se(t) {
  return oe[Math.max(0, Math.min(2, t))];
}
function ae(t) {
  const r = Array.from({ length: t }, (c, g) => g), l = () => r.some((c, g) => c === g);
  let k = 0;
  for (; l() && k++ < 1e4;) {
    const c = Math.floor(Math.random() * t);
    let g = Math.floor(Math.random() * t);
    for (; g === c;) {
      g = Math.floor(Math.random() * t);
    }
    [r[c], r[g]] = [r[g], r[c]];
  }
  return r;
}
function ie(t = 0, r = null, l = 9) {
  const k = se(t);
  return { svaer: t, ...k, billede: r ?? Math.floor(Math.random() * l), j: ae(k.brikker), valgt: -1, tilstand: d.SPILLER, msTilbage: k.sekunder * 1e3, byt: 0 };
}
const ce = (t) => t.every((r, l) => r === l);
function fe(t, r) {
  if (t.tilstand !== d.SPILLER || r < 0 || r >= t.brikker) {
    return t;
  }
  if (t.valgt === -1) {
    return { ...t, valgt: r };
  }
  if (t.valgt === r) {
    return { ...t, valgt: -1 };
  }
  const l = [...t.j];
  [l[t.valgt], l[r]] = [l[r], l[t.valgt]];
  const k = ce(l);
  return { ...t, j: l, valgt: -1, byt: t.byt + 1, tilstand: k ? d.VUNDET : t.tilstand };
}
function ue(t, r) {
  if (t.tilstand !== d.SPILLER) {
    return t;
  }
  const l = t.msTilbage - r;
  return l <= 0 ? { ...t, msTilbage: 0, tilstand: d.TID_UDE } : { ...t, msTilbage: l };
}
const D = 512, U = 192, s = 2, j = 640 - D * s / 2, M = 208, S = { x: 256, y: 60, tekstY: 70 };
function SwapGame({ svaer: t = 0, pause: r = false, lydTil: l = true, skrift: k = null, ui: c = null, paaSlut: g = () => {
} }) {
  const [L, H] = React.useState(null), [_, X] = React.useState(null), [I, $] = React.useState(void 0), T = React.useRef(null), p = React.useRef(null), w = React.useRef(null), P = React.useRef(null), V = React.useRef(r);
  V.current = r;
  const Y = React.useRef(g);
  Y.current = g;
  React.useEffect(() => {
    fetch("data/puslespil/index.json").then((o) => o.ok ? o.json() : Promise.reject(new Error(`index.json: ${o.status}`))).then(H).catch((o) => X(o.message));
    Sv_("puslespil").then($);
  }, []);
  React.useEffect(() => {
    var z;
    if (!L || I === void 0) {
      return;
    }
    const o = rd_(Object.values(mk_));
    o.saetTil(l);
    P.current = o;
    let e = ie(t, null, L.billeder.length);
    p.current = e;
    const b = new Image();
    b.src = `data/puslespil/${((z = L.billeder[e.billede]) == null ? void 0 : z.fil) ?? "billede0.webp"}`;
    const n = Ev_(I);
    w.current = n;
    if (n) {
      n.saetLyd(l);
      n.kaede([1, 2]);
      n.foersteValg = true;
      n.foersteByt = true;
    }
    const R = (m) => {
      if (n) {
        n.spil(m);
        n.slump();
      }
    };
    o.loekke(mk_.bag, 0.3);
    p.current.tryk = (m, E) => {
      if (V.current || e.tilstand !== d.SPILLER) {
        return;
      }
      if (n && n.koe && n.koe.length > 0) {
        n.spring();
        return;
      }
      const A = D / e.kolonner * s, F = U / e.raekker * s, v = Math.floor((m - j) / A), f = Math.floor((E - M) / F);
      if (v < 0 || f < 0 || v >= e.kolonner || f >= e.raekker) {
        return;
      }
      const h = f * e.kolonner + v;
      if (n) {
        if (e.valgt === -1) {
          if (n.foersteValg) {
            R(3);
            n.foersteValg = false;
          } else if (Math.random() < 0.05) {
            R(4);
          }
        } else if (e.valgt === h) {
          R(7);
        } else if (n.foersteByt) {
          R(5);
          n.foersteByt = false;
        } else if (Math.random() < 0.05) {
          R(6);
        }
      }
      o.spil(mk_.vaelg);
      e = fe(e, h);
      p.current = Object.assign(e, { tryk: p.current.tryk });
    };
    const a = T.current.getContext("2d");
    let N, W = performance.now(), K = e.tilstand, B = 0, O = false;
    const q = (m) => {
      const E = V.current ? 0 : Math.min(250, m - W);
      if (W = m, n && E > 0 && n.tik(E), E > 0 && e.tilstand === d.SPILLER && !(n && n.koe && n.koe.length > 0)) {
        const i = p.current.tryk;
        e = ue(e, E);
        p.current = Object.assign(e, { tryk: i });
        if (Math.random() < E / 4e3) {
          o.spil(mk_.tilfaeldig, 0.5);
        }
      }
      if (e.tilstand !== K) {
        if (e.tilstand === d.VUNDET) {
          o.spil(mk_.vundet);
          R(8);
        }
        if (e.tilstand !== d.SPILLER) {
          o.stop(mk_.bag);
          B = m;
        }
        K = e.tilstand;
      }
      if (B && !O && m - B > 2e3 && !(n && n.optaget())) {
        O = true;
        Y.current({ vundet: e.tilstand === d.VUNDET, beloenning: e.tilstand === d.VUNDET ? e.beloenning : 0 });
      }
      a.fillStyle = "#f2d69c";
      a.fillRect(0, 0, 1280, 768);
      const A = D * s, F = U * s;
      if (c) {
        c.ramme(a, j - 48, M - 48, A + 96, F + 96);
      }
      const v = e.tilstand !== d.SPILLER, f = D / e.kolonner, h = U / e.raekker;
      if (b.complete && b.naturalWidth) {
        a.imageSmoothingEnabled = false;
        for (let i = 0; i < e.brikker; i++) {
          const C = v ? i : e.j[i], J = C % e.kolonner * f, Q = Math.floor(C / e.kolonner) * h, Z = j + i % e.kolonner * f * s, ee = M + Math.floor(i / e.kolonner) * h * s;
          a.drawImage(b, J, Q, f, h, Z, ee, f * s, h * s);
        }
        a.imageSmoothingEnabled = true;
        a.strokeStyle = "rgba(0,0,0,.35)";
        a.lineWidth = 2;
        for (let i = 0; i < e.brikker && !v; i++) {
          a.strokeRect(j + i % e.kolonner * f * s, M + Math.floor(i / e.kolonner) * h * s, f * s, h * s);
        }
        if (e.valgt >= 0 && !v) {
          a.strokeStyle = "#ffd24a";
          a.lineWidth = 6;
          a.strokeRect(j + e.valgt % e.kolonner * f * s + 3, M + Math.floor(e.valgt / e.kolonner) * h * s + 3, f * s - 6, h * s - 6);
        }
      }
      if (c) {
        c.faelles(a, 1733, S.x, S.y);
      }
      if (k) {
        k.tegn(a, String(Math.max(0, Math.ceil(e.msTilbage / 1e3))), S.x, S.tekstY, { str: 73, midt: true, op: true });
      }
      N = requestAnimationFrame(q);
    };
    N = requestAnimationFrame(q);
    return () => {
      cancelAnimationFrame(N);
      o.stopAlle();
      if (n) {
        n.stop();
      }
    };
  }, [L, I, t, k, c]);
  React.useEffect(() => {
    if (P.current) {
      P.current.saetTil(l);
    }
    if (w.current) {
      w.current.saetLyd(l);
    }
  }, [l]);
  const G = (o) => {
    const e = T.current.getBoundingClientRect(), b = p.current;
    if (b && b.tryk) {
      b.tryk((o.clientX - e.left) * 1280 / e.width, (o.clientY - e.top) * 768 / e.height);
    }
  };
  return _ ? y.jsxs("div", { className: "msg error", children: [y.jsxs("p", { children: ["Kunne ikke indlæse billederne: ", _] }), y.jsxs("p", { className: "hint", children: ["Kør ", y.jsx("code", { children: "node Tools/extract-puzzlepics.js" }), " og kopiér dataene fra web/public/data til spil/public/data."] })] }) : L ? y.jsx("div", { className: "spilflade", children: y.jsx("canvas", { ref: T, width: 1280, height: 768, style: { touchAction: "none", cursor: "pointer" }, onPointerDown: G }) }) : y.jsx(Ka_, { bredde: 1280 });
}
export { SwapGame as default };
