import React from 'react';
import * as J from 'react/jsx-runtime';
import { Rv, Cv, WindowStack, createUiKit, LoadingScreen, centeredUi } from './ui-kit.js';
import { GAME_WIDTH, WIDE_MINIGAMES, MINIGAME_OFFSET } from '../engine/constants.js';
import { AnimationPlayer } from '../engine/animation.js';
import { getAnimationBounds, drawSprite, drawAnimation, createTextureLoader } from '../render/canvas-helpers.js';
import { Ln, soundUrl, loadNarratorData, createNarrator } from '../audio/audio.js';
import { Hh } from '../game/hotel.js';
function createTimedTween(e, t, n) {
  return { fra: e, til: t, t: 0, n: n * Rv, get v() {
      return this.fra + (this.til - this.fra) * Cv(this.t / this.n);
    }, get faerdig() {
      return this.t >= this.n;
    } };
}
function createMinigameShell({ bw: BW = 1280, MU: e, M: t, I: n, fort: r, kit: l, U: i, nr: o, lydSti: s, haendelse: a, effekter: u = null }) {
  const OFF = BW > 1280 ? MINIGAME_OFFSET : 0, RIGHT = BW - 1280, SKX = RIGHT, h = new WindowStack(centeredUi(i, BW)), m = new Map(t.animations.map((I) => [I.id, I])), g = (I) => {
    const O = m.get(I), F = O ? new AnimationPlayer(O) : null;
    if (F) {
      F.advance(0);
    }
    return F;
  }, v = g(e.skilt.film), c = v ? getAnimationBounds(t, v) : null, p = e.afslut.film[o + 1] > 0 ? g(e.afslut.film[o + 1]) : null, k = e.intro;
  let d = k.udenIntro.includes(o) ? "spil" : "intro", f = 0, y = createTimedTween(255, 0, k.fade.billeder);
  const w = k.knapper.map((I, O) => ({ id: I, i: O, x: createTimedTween(k.ude[0], k.ude[0], 1), y: createTimedTween(k.ude[1], k.ude[1], 1) }));
  let S = -1;
  const P = (I, [O, F]) => {
    I.x = createTimedTween(I.x.v, O, k.glid);
    I.y = createTimedTween(I.y.v, F, k.glid);
  };
  if (d === "intro" && r) {
    r.spil(k.scripts.spoerg);
    r.slump();
  }
  const M = () => !!r && r.optaget();
  let E = null;
  const N = (I) => {
    if (I) {
      Ln(new Audio(soundUrl(s, I)), soundUrl(s, I)).play().catch(() => {
      });
    }
  };
  return { get fase() {
      return d;
    }, get aktiv() {
      return d === "intro" || h.aaben;
    }, skiltFelt: c && { x0: e.skilt.x + c.x0 + SKX, y0: e.skilt.y + c.y0, x1: e.skilt.x + c.x1 + SKX, y1: e.skilt.y + c.y1 }, skiftSkilt(I) {
      E = I || null;
    }, skiltTryk() {
      if (E) {
        E();
        return true;
      }
      return false;
    }, fremad(I) {
      if (u && u.fremad(I), v && v.advance(I), p && p.advance(I), d === "intro") {
        if (r) {
          r.tik(I);
        }
        y.t += I;
        for (const O of w) {
          O.x.t += I;
          O.y.t += I;
        }
        if (f === 0 && y.v <= 0) {
          w.forEach((O) => P(O, k.maal[O.i]));
          f = 1;
        } else if (f === 2 && !M()) {
          y = createTimedTween(0, 255, k.fade.billeder);
          f = 3;
        } else if (f === 3 && y.faerdig) {
          f = 4;
        } else if (f === 4 && !M()) {
          d = "spil";
          if (r) {
            r.stop();
          }
          a({ art: "start", svaer: S });
        }
      }
    }, tegn(I) {
      if (I.clearRect(0, 0, BW, 768), d === "intro") {
        I.fillStyle = "#000";
        I.fillRect(0, 0, BW, 768);
        I.save();
        I.translate(OFF, 0);
        const [O, F, V] = k.baggrund;
        drawSprite(I, t, n, O, F, V);
        if (r) {
          r.tegn(I);
        }
        for (const W of w) {
          drawSprite(I, t, n, W.id, W.x.v, W.y.v);
        }
        I.restore();
        const K = y.v;
        if (K > 0) {
          I.fillStyle = `rgba(0,0,0,${Math.min(1, K / 255)})`;
          I.fillRect(0, 0, BW, 768);
        }
      } else if (v && !E) {
        drawAnimation(I, t, n, v, e.skilt.x + SKX, e.skilt.y);
      }
      if (u && d !== "intro") {
        u.tegn(I);
      }
      h.tegn(l, I, BW, 768);
    }, klik(I) {
      if (h.klik(l, I)) {
        return true;
      }
      if (d === "intro") {
        if (f !== 1) {
          return true;
        }
        I = { x: I.x - OFF, y: I.y };
        const O = w.find((F) => {
          const V = t.sprites[F.id];
          if (!V) {
            return false;
          }
          const K = F.x.v - V.ox, W = F.y.v - V.oy;
          return I.x >= K && I.x <= K + V.w && I.y >= W && I.y <= W + V.h;
        });
        if (O) {
          S = O.i;
          if (r) {
            r.spil(k.scripts.valgt);
            r.saet(0, O.i);
            r.slump();
          }
          w.forEach((F) => {
            if (F !== O) {
              P(F, k.ude);
            }
          });
          f = 2;
        }
        return true;
      }
      return false;
    }, pause() {
      if (h.aaben || d !== "spil") {
        return;
      }
      N(e.pauseLyde[o]);
      const I = e.afslut;
      h.aabn({ titel: I.spoergsmaal, luk: false, tegn(O, F, V) {
          if (p) {
            O.anim("mui", p, F.x + I.anim[0], F.y + I.anim[1], I.anim[2]);
          }
          const K = () => {
            V.luk();
            a({ art: "fortsaet" });
          };
          O.spriteKnap(I.nej[0], F.x + I.nej[1], F.y + I.nej[2], K);
          O.spriteKnap(I.ja[0], F.x + I.ja[1], F.y + I.ja[2], () => {
            V.luk();
            a({ art: "afslut" });
          });
          O.spriteKnap(I.luk[0], F.x + I.luk[1], F.y + I.luk[2], K);
        } });
    }, slut(I) {
      if (d !== "slut") {
        d = "slut";
        h.lukAlle();
        h.aabn({ titel: e.tekster.beloenning, luk: false, bredde: 576, hoejde: 288, tegn(O, F, V) {
            const K = String(I), W = O.skrift ? O.skrift.bredde(K, 73) : 0, ae = F.x + F.w / 2 - (W + 70) / 2;
            O.sprite("ui", i.ikoner.moent, ae + 30, F.y + 120);
            if (O.skrift) {
              O.skrift.tegn(O.ctx, K, ae + 70, F.y + 120, { str: 73 });
            }
            O.spriteKnap(i.ikoner.ja, F.x + F.w / 2, F.y + F.h - 64, () => {
              V.luk();
              a({ art: "faerdig", beloenning: I });
            });
          } });
      }
    } };
}
export const MINIGAME_COMPONENTS = { 1: React.lazy(() => import("./Findting.js")), 2: React.lazy(() => import("./Sortering.js")), 3: React.lazy(() => import("./Luftpost.js")), 4: React.lazy(() => import("./Kuffert.js")), 5: React.lazy(() => import("./Golf.js")), 6: React.lazy(() => import("./Is.js")), 7: React.lazy(() => import("./Byttespil.js")), 8: React.lazy(() => import("./Picross.js")), 9: React.lazy(() => import("./Baad.js")), 10: React.lazy(() => import("./Platform.js")), 11: React.lazy(() => import("./Zoo.js")), 12: React.lazy(() => import("./Pop.js")) }, isMinigame = (e) => e in MINIGAME_COMPONENTS;
function useMinigameUi() {
  const [e, t] = React.useState({ status: "henter" });
  React.useEffect(() => {
    let n = false;
    (async () => {
      try {
        const [r, l, i] = await Promise.all([fetch("data/minispil-ui/minispil-ui.json").then((o) => o.json()), fetch("data/minispil-ui/manifest.json").then((o) => o.json()), loadNarratorData("intro")]);
        if (!n) {
          t({ status: "klar", MU: r, M: l, T: createTextureLoader("data/minispil-ui", l), intro: i });
        }
      }
      catch (r) {
        if (!n) {
          t({ status: "fejl", fejl: r.message });
        }
      }
    })();
    return () => {
      n = true;
    };
  }, []);
  return e;
}
export function MinigameHost({ nr: e, ui: t, skrift: n, hud: r = null, pung: l = null, moent: i = null, tilbage: o, ekstraPause: xp = false }) {
  const s = useMinigameUi(), [a, u] = React.useState(null), [h, m] = React.useState(0), [g, v] = React.useState(false), [c, p] = React.useState(true), [k, d] = React.useState(null), f = React.useRef(null), y = React.useRef(null), w = React.useRef(null), S = React.useRef(o);
  S.current = o;
  const BW = WIDE_MINIGAMES.has(e) ? GAME_WIDTH : 1280;
  React.useEffect(() => {
    if (s.status !== "klar" || !f.current) {
      return;
    }
    const K = f.current.getContext("2d"), W = createUiKit(K, { ui: { M: t.M, I: t.T.I }, mui: { M: s.M, I: s.T.I } }, t.U, n), ae = i ? Hh(i.D, i.M, i.I, n) : null;
    w.current = ae;
    const j = createMinigameShell({ bw: BW, effekter: ae, MU: s.MU, M: s.M, I: s.T.I, fort: createNarrator(s.intro), kit: W, U: t.U, nr: e, lydSti: "data/minispil-ui/lyd", haendelse: (z) => {
        if (z.art === "start") {
          m(z.svaer);
          u("spil");
        } else if (z.art === "fortsaet") {
          v(false);
        } else if (z.art === "afslut") {
          S.current(0);
        } else if (z.art === "faerdig") {
          S.current(z.beloenning);
        }
      } });
    y.current = j;
    u(j.fase);
    d(j.skiltFelt);
    let _, x = performance.now(), T = null;
    const R = (z) => {
      j.fremad(Math.min(250, z - x));
      x = z;
      j.tegn(K);
      if (j.aktiv !== T) {
        T = j.aktiv;
        p(T);
      }
      _ = requestAnimationFrame(R);
    };
    _ = requestAnimationFrame(R);
    return () => cancelAnimationFrame(_);
  }, [s, e, t, n, i, BW]);
  const P = (K) => {
    const W = f.current.getBoundingClientRect();
    return { x: (K.clientX - W.left) * BW / W.width, y: (K.clientY - W.top) * 768 / W.height };
  }, M = (K) => {
    if (y.current) {
      y.current.klik(P(K));
    }
  }, E = () => {
    if (y.current) {
      if (!y.current.skiltTryk()) {
        y.current.pause();
        v(true);
      }
    }
  }, N = React.useMemo(() => ({ skift: (K) => {
      if (y.current) {
        y.current.skiftSkilt(K);
      }
    } }), []), C = React.useMemo(() => (K, W, ae) => {
    if (w.current) {
      w.current.tilfoej(K, W, ae);
    }
  }, []), I = ({ beloenning: K = 0 } = {}) => {
    if (y.current) {
      y.current.slut(K);
      v(true);
    }
  }, O = React.useMemo(() => ({ ramme(K, W, ae, j, _, x = "hoved") {
      createUiKit(K, { ui: { M: t.M, I: t.T.I } }, t.U, n).ramme(x, W, ae, j, _);
    }, sprite(K, W, ae, j) {
      drawSprite(K, t.M, t.T.I, W, ae, j);
    }, faelles(K, W, ae, j) {
      if (s.status === "klar") {
        drawSprite(K, s.M, s.T.I, W, ae, j);
      }
    }, U: t.U, pakke: { M: t.M, I: t.T.I, U: t.U }, hud: r && { H: r.H, M: r.M, I: r.T.I } }), [t, n, s, r]), F = MINIGAME_COMPONENTS[e], V = (K, W) => `${K / W * 100}%`;
  return J.jsx("div", { className: BW > 1280 ? "minispil bred" : "minispil", children: J.jsxs("div", { className: "minispil-flade", style: { aspectRatio: `${BW} / 768` }, children: [s.status === "fejl" && J.jsxs("p", { className: "msg", children: ["Kunne ikke indlæse minispillets ramme: ", s.fejl] }), a && a !== "intro" && F && J.jsx(React.Suspense, { fallback: J.jsx(LoadingScreen, { bredde: BW }), children: J.jsx(F, { bredde: BW, svaer: h, pause: g || xp, lydTil: true, skrift: n, ui: O, pung: l, paaSlut: I, skilt: N, pengeEffekt: C }) }), J.jsx("canvas", { ref: f, width: BW, height: 768, className: "minispil-ramme", style: { pointerEvents: c ? "auto" : "none" }, onPointerDown: M }), !c && k && J.jsx("div", { className: "minispil-skilt", onPointerDown: E, style: { left: V(k.x0, BW), top: V(Math.max(0, k.y0), 768), width: V(k.x1 - k.x0, BW), height: V(k.y1 - Math.max(0, k.y0), 768) } })] }) });
}
