import { HUD_SHIFT } from '../engine/constants.js';
import React from 'react';
import * as ce from 'react/jsx-runtime';
import { createTextureLoader as Sn_, createFigureOverlay as Ph_, drawAnimation as fe_, drawCurrencyHud as C1_, drawSpriteFrame as Ql_ } from '../render/canvas-helpers.js';
import { loadZooState as B1_, createZooState as Hv_, sk as sk_, ak as ak_, uk as uk_, tf as tf_, r1 as r1_, n1 as n1_, Y1 as Y1_, tk as tk_, lk as lk_, Zv as Zv_, ik as ik_, a0 as a0_, o0 as o0_, V1 as V1_, K1 as K1_, ek as ek_, Q1 as Q1_, c0 as c0_, Kl as Kl_, W1 as W1_, fk as fk_, formatDuration as Ga_, ck as ck_, Uv as Uv_, i0 as i0_, Ju as Ju_, U1 as U1_, Z1 as Z1_, Vv as Vv_, rk as rk_, Zo as Zo_, Ul as Ul_, nk as nk_, z1 as z1_, ok as ok_, u0 as u0_, Wa as Wa_, H1 as H1_, O1 as O1_, G1 as G1_, J1 as J1_, dk as dk_, $1 as $1_, serializeZooState as F1_, q1 as q1_, X1 as X1_, A1 as A1_, D1 as D1_, l0 as l0_ } from '../game/world.js';
import { AnimationPlayer as Xe_ } from '../engine/animation.js';
import { rd as rd_ } from '../loaders/data-loaders.js';
import { createNarrator as Ev_, loadNarratorData as Sv_ } from '../audio/audio.js';
import { createUiKit as Ua_, WindowStack as Jh_, LoadingScreen as Ka_, centeredUi } from './ui-kit.js';
import { tutorials as nd_ } from '../game/save.js';
import { Tween as pn_, AcceleratingValue as $c_, FRAME_MS as zc_ } from '../engine/tween.js';
import { h1 as h1_ } from '../ui/panels.js';
import { f1 as f1_, c1 as c1_, u1 as u1_ } from '../game/world-init.js';
function xt(M) {
  const S = [], m = M.ins;
  for (let k = 0; k < m.length;) {
    const [V, B, F, z] = [m[k], m[k + 1], m[k + 2], m[k + 3]];
    if (B === 15) {
      S.push({ target: V, curve: B, prop: F, t0: z, v: m[k + 4] });
      k += 5;
    } else {
      S.push({ target: V, curve: B, prop: F, t0: z, v0: m[k + 4], t1: m[k + 5], v1: m[k + 6] });
      k += 7;
    }
  }
  return { id: M.id, duration: M.duration, loop: M.loop, loopFrom: M.loopFrom, parts: M.parts, instructions: S };
}
const kt = (M) => fetch(`data/zoo/${M}`).then((S) => S.ok ? S.json() : Promise.reject(new Error(`${M}: ${S.status}`)));
async function jn() {
  const M = await kt("manifest.json"), S = new Map(M.animations.map((z) => [z.id, xt(z)])), m = Sn_("data/zoo", M), k = new Map(), V = (z, T = []) => {
    const w = new Set();
    for (const L of z) {
      const G = S.get(L);
      if (G) {
        for (const K of G.instructions) {
          if (K.prop !== 0 || K.target >= 254) {
            continue;
          }
          const Y = M.sprites[(K.curve === 15 ? K.v : K.v0) & 65535];
          if (Y) {
            w.add(Y.assetId);
          }
        }
      }
    }
    for (const L of T) {
      const G = M.sprites[L];
      if (G) {
        w.add(G.assetId);
      }
    }
    return [...w];
  }, B = (z, T = []) => {
    for (const w of V(z, T)) {
      m.I[w];
    }
  }, F = (z, T, w = 5e3) => Promise.race([Promise.all(V(z, T).map((L) => new Promise((G) => {
      m.I[L];
      const K = new Image();
      K.onload = G;
      K.onerror = G;
      K.src = `data/zoo/tex/${M.textures[L].file}`;
    }))), new Promise((L) => {
      setTimeout(L, w);
    })]);
  return { manifest: M, anims: S, I: m.I, lyt: m.lyt, forhaand: B, vent: F, hentType(z) {
      if (!k.has(z)) {
        k.set(z, kt(`dyr/${z}.json`).then((T) => {
          for (const w of T.animations) {
            S.set(w.id, xt(w));
          }
          for (const w of T.teksturer) {
            m.I[w];
          }
          return true;
        }).catch(() => {
          k.delete(z);
          return false;
        }));
      }
      return k.get(z);
    }, harType: (z) => k.has(z) };
}
let re = null;
const Oe = "zoo-gemt-v2", De = () => {
  if (!re) {
    return;
  }
  const { s: M, kam: S } = re;
  try {
    localStorage.setItem(Oe, JSON.stringify({ ...F1_(M), kam: S }));
  }
  catch {
  }
};
let ht = false;
const J = () => Math.floor(Date.now() / 1e3);
function Mn() {
  const [M, S] = React.useState({ status: "loading" });
  React.useEffect(() => {
    let m = false;
    (async () => {
      try {
        const k = (K) => fetch(`data/zoo/${K}`).then((Y) => Y.ok ? Y.json() : Promise.reject(new Error(`${K}: ${Y.status}`))), [V, B, F, z, T] = await Promise.all([k("spil.json"), k("baggrund.json"), k("tekster.json"), Sv_("zoo"), jn()]), w = V.sevaerdighed, L = [...new Set(B.felter.flat().filter((K) => K))].map((K) => V.baggrund.base + K);
        let G = [];
        try {
          const K = re ? F1_(re.s) : JSON.parse(localStorage.getItem(Oe));
          G = (K && Array.isArray(K.sev) ? K.sev : []).map((Y) => Y.type);
        }
        catch {
        }
        await T.vent([F.skilt && F.skilt.film, ...new Set([0, ...G].map((K) => w.film[K])), ...w.byg.slice(0, 2), w.pengeskilt.film, w.hjerteskilt.film, V.bod.film[0], V.bod.skilt.film].filter(Boolean), [...L, ...Array.from({ length: w.moent.antal }, (K, Y) => w.moent.sprite + Y)]);
        if (!m) {
          S({ status: "ready", spil: V, bg: B, tekster: F, fortaeller: z, zoo: T });
        }
      }
      catch (k) {
        if (!m) {
          S({ status: "error", error: k.message });
        }
      }
    })();
    return () => {
      m = true;
    };
  }, []);
  return M;
}
function xe(M, S, m, k, V, B, F = 1, z = 1) {
  const T = S.sprites[k], w = T && m[T.assetId];
  if (!(!w || z <= 0)) {
    M.save();
    M.translate(V, B);
    M.scale(F, F);
    Ql_(M, w, T, z);
    M.restore();
  }
}
function se(M, S, m, k, V, B, F, z = null, T = false) {
  const w = M.sprites[S];
  if (!w) {
    return false;
  }
  const [L, G] = z || [w.ox, w.oy], K = T ? m - (w.w - L) : m - L, Y = k - G;
  return V + F >= K && V - F <= K + w.w && B + F >= Y && B - F <= Y + w.h;
}
const wn = (M) => ({ penge: M, brug(S) {
    if (this.penge < S) {
      return false;
    }
    this.penge -= S;
    return true;
  }, faa(S) {
    this.penge += S;
  } });
function ZooGame({ bredde: BW = 1280, pause: M = false, lydTil: S = true, skrift: m = null, ui: k = null, pung: V = null }) {
  const B = Mn(), F = React.useRef(null), z = React.useRef(null), T = React.useRef(null), w = React.useRef(null), L = React.useRef({ x: 0, y: 0 }), G = React.useRef(null), K = React.useRef(M);
  K.current = M;
  React.useEffect(() => {
    if (B.status !== "ready" || !k || !k.pakke) {
      return;
    }
    const f = B.spil, u = B.tekster, D = B.zoo, x = D.manifest, I = D.I, ae = D.anims, v = f.sevaerdighed, P = V || wn(f.regler.startPenge);
    if (!re) {
      let s = null;
      try {
        s = JSON.parse(localStorage.getItem(Oe));
      }
      catch {
      }
      re = { s: s ? B1_(f, s) : Hv_(f), kam: s && s.kam || { x: 0, y: 0 } };
    }
    const o = re.s;
    o.Z = f;
    o.film = (s) => {
      const n = ae.get(s);
      return n ? new Xe_(n) : null;
    };
    L.current = re.kam;
    for (const s of o.sev) {
      if (s.type) {
        D.hentType(s.type);
      }
    }
    D.forhaand([...f.dyr.ikkeAktiv, v.byg[2], ...f.rede.film, ...f.genstand.film[0], f.genstand.sav, ...f.bod.film, ...f.bod.byg, ...f.balloner.film.flat()], [f.rede.laas]);
    for (const s of o.boder) {
      if (s.type >= 1) {
        D.forhaand(f.bod.vare.film[s.type]);
      }
    }
    for (const s of o.genstande) {
      if (s.sev >= 0) {
        D.forhaand([f.genstand.film[s.kat][s.f]]);
      }
    }
    const oe = rd_([...new Set([...Object.values(f.lyde), ...f.dyr.lyd, ...f.balloner.lyde.flat(), f.niveau.lyd])]);
    oe.saetTil(S);
    T.current = oe;
    const ke = u.hoveder, N = Ev_(B.fortaeller, Math.round((BW - 1024) / 2)), fe = [0, 0, 0, 0, 0];
    if (N) {
      N.saetLyd(S);
      N.figur = (s, n) => {
        if (s >= 0 && s < fe.length) {
          fe[s] = n;
        }
      };
    }
    w.current = N;
    const Me = k.hud ? Ph_(k.hud.M, k.hud.I, ke, BW - 1280) : null, ee = (s) => {
      const n = ke.haendelser[s];
      if (!(!N || n === void 0)) {
        fe.fill(0);
        N.spil(n);
        N.slump();
      }
    }, he = new Map(), C = (s, n, e = true) => {
      let r = he.get(s);
      if (!r || r.id !== n || !r.p && ae.has(n)) {
        const l = ae.get(n);
        r = { id: n, p: l ? new Xe_(l) : null };
        if (r.p && e) {
          r.p.advance(Math.random() * 5e3);
        }
        he.set(s, r);
      }
      r.brugt = true;
      return r.p;
    }, b = F.current.getContext("2d"), Q = k.pakke.U, Pe = Ua_(b, { ui: { M: k.pakke.M, I: k.pakke.I }, zoo: { M: x, I, anims: ae } }, Q, m), Z = new Jh_(centeredUi(Q, BW)), we = (s) => h1_({ V: u.vejledning, nr: s, pakke: "zoo", laes: (n, e) => {
        if (N) {
          fe.fill(0);
          N.startForfra(n, { 0: e });
        }
      } });
    if (!nd_.har("zoo2") && o.sev.every((s) => s.type === 0)) {
      nd_.saet("zoo2");
      Z.aabn(we(2));
    } else if (!ht) {
      ht = true;
      ee("velkomst");
    }
    const { dialog: Ie, besked: W } = c1_(Q), ye = u1_(), te = (s, n, e, r, l, a = "#fff") => {
      s.sprite("ui", n, r + 18, l, { skala: 0.55 });
      s.tekst(e, r + 40, l, { str: 19, farve: a });
    }, be = Q.ikoner.ur, Xe = Q.ikoner.timeglas, Ee = 4193, le = f.niveau, $e = (s, n, e, r, l, a) => {
      s.ramme("punkt", e, r, l, a);
      const p = e + l + le.laasXY[0], i = r + a + le.laasXY[1];
      s.sprite("ui", le.laas, p, i, { skala: 0.6 });
      s.tekst(String(n), p + 22, i, { str: 22 });
    }, ie = f.udvidelse.menu;
    let me = null;
    const jt = () => {
      const s = n1_(o);
      ee("udvidelse");
      return { titel: u.udvidelse, bredde: 704, hoejde: 448, luk: false, tegn(n, e, r) {
          if (!me) {
            const l = D.anims.get(ie.film);
            me = l ? new Xe_(l) : null;
            if (me) {
              me.advance(0);
            }
          }
          n.anim("zoo", me, e.x + ie.filmXY[0], e.y + ie.filmXY[1]);
          f1_(n, s.pris, e.x + ie.pris[0], e.y + ie.pris[1], P.penge >= s.pris);
          te(n, be, Ga_(s.byggetid), e.x + ie.tid[0], e.y + ie.tid[1]);
          n.tekst(u.udvid, e.x + e.w / 2, e.y + ie.tekst[1] + 4, { midt: true, bredde: e.w - 90, str: 24, op: true });
          n.spriteKnap(Q.ikoner.ja, e.x + e.w / 2 - 90, e.y + e.h - 62, () => {
            if (ck_(o, P, J()) === "penge") {
              r.luk();
              r.aabn(W(u.udvidelse, u.ikkeNok));
            } else {
              r.lukAlle();
            }
          });
          n.spriteKnap(Q.ikoner.nej, e.x + e.w / 2 + 90, e.y + e.h - 62, () => r.luk());
        } };
    }, Ze = f.regler.sevaerdigheder.map((s, n) => ({ r: s, type: n })).filter((s) => s.r).sort((s, n) => s.r.pris - n.r.pris), Mt = (s) => ({ titel: u.dyr, tegn(n, e, r) {
        n.rulleliste(r.top(), e.x + 40, e.y + 40, e.w - 80, e.h - 72, Ze.length * 112, (a) => {
          Ze.forEach(({ r: p, type: i }, c) => {
            const y = a + c * 112, t = P.penge >= p.pris, d = Uv_(f, i), g = i0_(o, d);
            n.ramme("punkt", e.x + 40, y, e.w - 92, 104);
            ye(n, "zoo", v.film[i], e.x + 50, y + 4, 200, 96);
            f1_(n, p.pris, e.x + 270, y + 28, t);
            te(n, be, Ga_(p.byggetid), e.x + 270, y + 72);
            te(n, Xe, Ga_(p.udbetalingstid), e.x + 450, y + 28);
            te(n, Ee, String(Ju_(f, i, 0).udbetaling), e.x + 450, y + 72);
            if (g) {
              $e(n, d, e.x + 40, y, e.w - 92, 104);
            }
            n.knap({ x0: e.x + 40, y0: y, x1: e.x + e.w - 52, y1: y + 112 - 8 }, () => {
              if (g) {
                r.aabn(W(u.dyr, u.laastDyr));
                return;
              }
              r.aabn(Ie(u.koebDyr, () => {
                const h = U1_(o, P, s, i, J());
                if (h === "penge") {
                  r.aabn(W(u.dyr, u.ikkeNok));
                } else if (h) {
                  r.lukAlle();
                  D.hentType(i);
                  ee("sevaerdighed");
                }
              }, { titel: u.dyr }));
            });
          });
        });
      } }), qe = (s, n, e = -1) => {
      const r = Ju_(f, n.type, n.f);
      ee("flereDyr");
      return { titel: u.dyr, bredde: 640, hoejde: 340, luk: false, tegn(l, a, p) {
          ye(l, "zoo", f.dyr.film[n.type][n.f][0], a.x + 40, a.y + 40, 220, 170);
          f1_(l, r.pris, a.x + 290, a.y + 70, P.penge >= r.pris);
          te(l, be, Ga_(r.byggetid), a.x + 290, a.y + 118);
          te(l, Ee, String(r.udbetaling), a.x + 290, a.y + 166);
          l.tekst(u.koebDyr, a.x + a.w / 2, a.y + 226, { midt: true, str: 22 });
          l.spriteKnap(Q.ikoner.ja, a.x + a.w / 2 - 90, a.y + a.h - 62, () => {
            if (Z1_(o, P, s, J(), e) === "penge") {
              p.luk();
              p.aabn(W(u.dyr, u.ikkeNok));
            } else {
              p.lukAlle();
            }
          });
          l.spriteKnap(Q.ikoner.nej, a.x + a.w / 2 + 90, a.y + a.h - 62, () => p.luk());
        } };
    }, $ = f.genstand.celle, E = f.bod, Ce = f.regler.boder.map((s, n) => ({ r: s, type: n })).filter((s) => s.r), wt = (s) => {
      ee("bodButik");
      return { titel: u.bodButik, tegn(n, e, r) {
          n.rulleliste(r.top(), e.x + 40, e.y + 40, e.w - 80, e.h - 72, Ce.length * 112, (a) => {
            Ce.forEach(({ r: p, type: i }, c) => {
              const y = a + c * 112, t = Vv_(f, i), d = i0_(o, t);
              n.ramme("punkt", e.x + 40, y, e.w - 92, 104);
              ye(n, "zoo", E.film[i], e.x + 50, y + 4, 200, 96);
              f1_(n, p.pris, e.x + 270, y + 28, P.penge >= p.pris);
              te(n, be, Ga_(p.byggetid), e.x + 270, y + 72);
              if (d) {
                $e(n, t, e.x + 40, y, e.w - 92, 104);
              }
              n.knap({ x0: e.x + 40, y0: y, x1: e.x + e.w - 52, y1: y + 112 - 8 }, () => {
                if (d) {
                  r.aabn(W(u.bodButik, u.laastBod));
                  return;
                }
                r.aabn(Ie(u.koebBod, () => {
                  const g = rk_(o, P, s, i, J());
                  if (g === "penge") {
                    r.aabn(W(u.bodButik, u.ikkeNok));
                  } else if (g) {
                    r.lukAlle();
                    ee("bod");
                    D.forhaand(E.vare.film[i]);
                  }
                }, { titel: u.bodButik }));
              });
            });
          });
        } };
    }, It = (s) => {
      const n = o.boder[s], e = Zo_(o, s), r = E.vare.film[n.type].map((a, p) => p).filter((a) => !(e && e.f === a));
      ee("vareButik");
      const l = (a, p) => {
        if (a === "penge") {
          p.luk();
          p.aabn(W(u.bodButik, u.ikkeNok));
          return;
        }
        p.lukAlle();
        if (a && N) {
          fe.fill(0);
          N.startForfra(ke.haendelser.vare, { 0: n.type });
        }
      };
      return { titel: u.bodButik, tegn(a, p, i) {
          const t = p.x + (p.w - 2 * $[0] - 24) / 2;
          a.rulleliste(i.top(), p.x + 20, p.y + 30, p.w - 40, p.h - 50, Math.ceil(r.length / 2) * ($[1] + 16), (d) => {
            r.forEach((g, h) => {
              const j = t + h % 2 * ($[0] + 24), R = d + Math.trunc(h / 2) * ($[1] + 16), A = Ul_(f, n.type, g), ne = nk_(o, n.type, g);
              a.ramme("punkt", j, R, $[0], $[1]);
              ye(a, "zoo", E.vare.film[n.type][g], j + 15, R + 10, $[0] - 30, $[1] - 100);
              te(a, Xe, Ga_(A.udbetalingstid), j + 20, R + $[1] - 74);
              te(a, Ee, String(A.udbetaling), j + 140, R + $[1] - 74);
              if (ne > 0) {
                a.tekst(`x ${ne}`, j + $[0] / 2, R + $[1] - 30, { midt: true, str: 22 });
              } else {
                f1_(a, A.pris, j + 70, R + $[1] - 30, P.penge >= A.pris);
              }
              const ge = z1_(f, n.type, g), ve = i0_(o, ge);
              if (ve) {
                $e(a, ge, j, R, $[0], $[1]);
              }
              a.knap({ x0: j, y0: R, x1: j + $[0], y1: R + $[1] }, () => {
                if (ve) {
                  i.aabn(W(u.bodButik, u.laastVare));
                  return;
                }
                if (ne > 0) {
                  l(ok_(o, P, s, g, J()), i);
                  return;
                }
                i.aabn(Ie(u.koebVare, () => l(ok_(o, P, s, g, J()), i), { titel: u.bodButik }));
              });
            });
          });
        } };
    }, He = (s, n) => {
      if (s === "penge") {
        n.luk();
        n.aabn(W(u.butik, u.ikkeNok));
        return;
      }
      n.lukAlle();
      if (s) {
        ee("genstand");
      }
    }, $t = (s, n) => {
      const e = a0_(o, s)[n], r = u0_(o, s, n), l = f.genstand.film[e.kat].map((a, p) => p).filter((a) => !(r && r.kat === e.kat && r.f === a));
      ee("butik");
      return { titel: u.butik, tegn(a, p, i) {
          const t = p.x + (p.w - 2 * $[0] - 24) / 2, d = Math.ceil(l.length / 2);
          a.rulleliste(i.top(), p.x + 20, p.y + 30, p.w - 40, p.h - 50, d * ($[1] + 16), (g) => {
            l.forEach((h, j) => {
              const R = t + j % 2 * ($[0] + 24), A = g + Math.trunc(j / 2) * ($[1] + 16), ne = Wa_(f, e.kat, h), ge = H1_(o, e.kat, h);
              a.ramme("punkt", R, A, $[0], $[1]);
              ye(a, "zoo", f.genstand.film[e.kat][h], R + 15, A + 10, $[0] - 30, $[1] - 70);
              if (ge > 0) {
                a.tekst(`x ${ge}`, R + $[0] / 2, A + $[1] - 34, { midt: true, str: 22 });
              } else {
                f1_(a, ne.pris, R + 20, A + $[1] - 34, P.penge >= ne.pris);
                te(a, be, Ga_(ne.byggetid), R + 130, A + $[1] - 34);
              }
              const ve = O1_(f, e.kat, h), et = i0_(o, ve);
              if (et) {
                $e(a, ve, R, A, $[0], $[1]);
              }
              a.knap({ x0: R, y0: A, x1: R + $[0], y1: A + $[1] }, () => {
                if (et) {
                  i.aabn(W(u.butik, u.laastGenstand));
                  return;
                }
                if (ge > 0) {
                  He(G1_(o, P, s, n, h, J()), i);
                  return;
                }
                i.aabn(Ie(u.koebGenstand, () => He(G1_(o, P, s, n, h, J()), i), { titel: u.butik }));
              });
            });
          });
        } };
    }, q = f.rede.celle, Ue = (s, n, e, r, l = false) => {
      s.ramme("punkt", e, r, q[0], q[1]);
      ye(s, "zoo", q1_(o, n), e + 10, r + 10, q[0] - 20, q[1] - 20, n.laast ? 0.45 : 1);
      if (n.laast) {
        if (l) {
          f1_(s, f.regler.reder[n.nr], e + q[0] / 2 - 50, r + q[1] - 30, P.penge >= f.regler.reder[n.nr]);
        } else {
          s.sprite("zoo", f.rede.laas, e + q[0] / 2, r + q[1] / 2);
        }
      }
    }, St = (s) => ({ titel: u.redeMenu, bredde: 576, hoejde: 400, luk: false, tegn(n, e, r) {
        Ue(n, s, e.x + (e.w - q[0]) / 2, e.y + 30, true);
        n.tekst(u.nyRede, e.x + e.w / 2, e.y + 262, { midt: true, str: 22 });
        n.spriteKnap(Q.ikoner.ja, e.x + e.w / 2 - 90, e.y + e.h - 62, () => {
          r.luk();
          if (X1_(o, P, s.nr) === "penge") {
            r.aabn(W(u.redeMenu, u.ikkeNok));
          }
        });
        n.spriteKnap(Q.ikoner.nej, e.x + e.w / 2 + 90, e.y + e.h - 62, () => r.luk());
      } }), zt = (s, n) => ({ titel: u.redeMenu, tegn(e, r, l) {
        const i = r.x + (r.w - 3 * q[0] - 80) / 2, c = r.y + (r.h - 2 * q[1] - 16) / 2;
        o.reder.forEach((y, t) => {
          const d = i + Math.trunc(t / 2) * (q[0] + 40), g = c + t % 2 * (q[1] + 16);
          Ue(e, y, d, g);
          e.knap({ x0: d, y0: g, x1: d + q[0], y1: g + q[1] }, () => {
            if (y.laast) {
              l.aabn(St(y));
              return;
            }
            if (y.sev < 0) {
              l.aabn(qe(s, n, y.nr));
              return;
            }
            const h = J1_(o, y);
            if (h && J() >= h.slut) {
              ek_(o, h, J());
              l.lukAlle();
            }
          });
        });
      } }), H = f.pengeEffekt, Se = [], Ae = (s, n, e) => {
      const r = Math.trunc(H.tid / 33), l = { beloeb: s, tid: 0, acc: 0, x: new pn_(n, r), y: new pn_(e, r), alfa: new $c_(H.alfa[0], H.maks, Math.trunc(H.tid / 100)), skala: new $c_(H.skala[0], H.maks, Math.trunc(H.tid / 100)) };
      l.y.mod(e + H.dy);
      l.alfa.maal = H.alfa[1];
      l.skala.maal = H.skala[1];
      Se.push(l);
    }, Fe = (s) => {
      const n = o0_(f, s);
      return { p: n, x: n.x + v.forskyd[0], y: n.y + v.forskyd[1] };
    }, ze = (s, n) => ({ x: s.x + n.x, y: s.y + n.y });
    z.current = { menuer: Z, kit: Pe, poke() {
        if (N) {
          N.poke();
        }
      }, tryk(s, n) {
        const e = J(), r = v.tryk;
        for (const i of o.balloner) {
          const c = sk_(o, i);
          if (!ak_(i) || !se(x, f.balloner.hit, c.x, c.y, s, n, 0)) {
            continue;
          }
          const y = uk_(o, P, i);
          if (y >= 1) {
            oe.spil(f.lyde.penge);
          }
          const t = L.current;
          Ae(y, c.x - t.x, c.y - t.y);
          return;
        }
        const l = u.skilt;
        if (l && se(x, l.billede, l.x, l.y, s, n, l.tryk)) {
          Z.aabn(we(l.vejledning));
          return;
        }
        const a = f.udvidelse, p = tf_(o);
        if (o.lotFilm !== 2 && p >= 1 && se(x, a.skilt, p + a.dx, Math.trunc(f.verden.hoejde * a.y), s, n, a.tryk)) {
          if (!r1_(o, e) && n1_(o)) {
            Z.aabn(jt());
          }
          return;
        }
        for (const i of o.sev) {
          if (i.type < 1 || i.bygger) {
            continue;
          }
          const { p: c } = Fe(i.nr), y = ze(c, v.pengeskilt), t = x.sprites[v.moent.sprite], d = v.moent.skala, g = t && y.x - t.ox * d, h = t && y.y + v.moent.dy - t.oy * d, j = t && s + r >= g && s - r <= g + t.w * d && n + r >= h && n - r <= h + t.h * d;
          if (se(x, 5718, y.x, y.y, s, n, r) || j) {
            const R = Y1_(o, P, i.nr, e);
            if (R > 0) {
              oe.spil(f.lyde.penge);
              const A = L.current;
              Ae(R, y.x - A.x, y.y + v.moent.dy - A.y);
            }
            return;
          }
        }
        for (const i of o.boder) {
          const c = tk_(f, i.nr), y = c.x + E.forskyd[0], t = c.y + E.forskyd[1], d = { x: c.x + E.skilt.x, y: c.y + E.skilt.y };
          if (!(!(i.type >= 1 && !i.bygger && se(x, 5718, d.x, d.y, s, n, r)) && !se(x, E.hit + i.type, y, t, s, n, r))) {
            if (i.type < 1) {
              Z.aabn(wt(i.nr));
              if (!nd_.har("zoo4") && !o.varer.length) {
                nd_.saet("zoo4");
                Z.aabn(we(4));
              }
            } else if (i.bygger) {
              lk_(o, i.nr, e);
            } else if (Zv_(i, e)) {
              const h = ik_(o, P, i.nr, e);
              if (h > 0) {
                oe.spil(f.lyde.penge);
                const j = L.current;
                Ae(h, d.x - j.x, d.y + E.moentDy - j.y);
              }
            } else {
              Z.aabn(It(i.nr));
            }
            return;
          }
        }
        for (const i of [...o.genstande].reverse()) {
          if (i.sev < 0 || !o.sev[i.sev] || o.sev[i.sev].bygger) {
            continue;
          }
          const c = a0_(o, i.sev)[i.plads];
          if (!c) {
            continue;
          }
          const y = o0_(f, i.sev);
          if (se(x, f.genstand.hit + c.kat, y.x + c.x, y.y + c.y, s, n, r)) {
            if (!V1_(i, e)) {
              Z.aabn($t(i.sev, i.plads));
            }
            return;
          }
        }
        for (const i of [...o.dyr].reverse()) {
          if (i.alfa.v <= 0) {
            continue;
          }
          const c = K1_(o, i);
          if (se(x, 5738, c.x, c.y, s, n, r, f.dyr.anker, i.spejl)) {
            ek_(o, i, e);
            return;
          }
        }
        for (const i of o.sev) {
          if (i.type < 1 || i.bygger || !Q1_(o, i.nr)) {
            continue;
          }
          const c = ze(o0_(f, i.nr), v.hjerteskilt);
          if (!se(x, 5718, c.x, c.y, s, n, r)) {
            continue;
          }
          const y = c0_(o, i.nr);
          if (y && Kl_(y.f)) {
            Z.aabn(qe(i.nr, y));
          } else if (y) {
            Z.aabn(zt(i.nr, y));
            if (!nd_.har("zoo3")) {
              nd_.saet("zoo3");
              Z.aabn(we(3));
            }
          }
          return;
        }
        for (const i of o.sev) {
          const { x: c, y } = Fe(i.nr);
          if (se(x, 5669, c, y, s, n, r)) {
            if (i.type === 0) {
              ee("grund");
              Z.aabn(Mt(i.nr));
            } else if (i.bygger) {
              W1_(o, i.nr, e);
            }
            return;
          }
        }
      } };
    const X = { score: -1, poter: 0, fx: new pn_(0, le.glid), acc: 0 }, Kt = (s) => {
      if (X.score <= 0 && (X.score = o.score, X.poter = A1_(o), X.fx.mod(D1_(f, o.score))), X.score !== o.score) {
        X.score = o.score;
        const n = A1_(o);
        if (n > X.poter) {
          const e = le.pawSpeak.indexOf(n);
          if (N) {
            fe.fill(0);
            N.startForfra(ke.haendelser.niveau, { 0: e < 0 ? 0 : e });
          }
          oe.spil(le.lyd);
        }
        X.fx.mod(D1_(f, o.score));
        X.poter = l0_(o);
      }
      for (X.acc += s; X.acc >= zc_;) {
        X.acc -= zc_;
        X.fx.trin();
      }
    }, Rt = () => {
      const { H: s, M: n, I: e } = k.hud, r = s.billeder, l = s.bjaelkeFelt;
      b.fillStyle = `rgb(${l.bag.join(",")})`;
      b.fillRect(l.x, l.y, l.w, l.h);
      b.fillStyle = `rgb(${l.fyld.join(",")})`;
      b.fillRect(l.x, l.y, Math.trunc(l.w * X.fx.v), l.h);
      xe(b, n, e, r.bjaelke.sprite, r.bjaelke.x, r.bjaelke.y);
      xe(b, n, e, r.bjaelkeKant.sprite, r.bjaelkeKant.x, r.bjaelkeKant.y);
      const a = s.tekst.point;
      if (m) {
        m.tegn(b, String(o.score), a[0] + a[2] / 2, l.y + l.h / 2, { str: 27, midt: true });
      }
      Pe.sprite("ui", le.pote, r.stjerne.x, r.stjerne.y, { alfa: X.poter >= 1 ? 1 : 0.5 });
      const p = le.potetekst;
      if (X.poter >= 1 && m) {
        m.tegn(b, String(X.poter), p[0] + p[2] / 2, p[1] + p[3] / 2, { str: 27, midt: true });
      }
    };
    fk_(o);
    const ue = (s, n, e, r) => {
      if (m) {
        m.tegn(b, s, n, e + r / 2, { font: 2, midt: true });
      }
    };
    let Te, Je = performance.now();
    const Qe = (s) => {
      const n = K.current ? 0 : Math.min(250, s - Je);
      Je = s;
      const e = J();
      if (n > 0) {
        dk_(o, n, e);
      }
      if (N) {
        N.tik(n);
      }
      if (Me) {
        Me.fremad(n, !!N && N.taler);
      }
      for (const c of o.lyde.splice(0)) {
        oe.spil(c);
      }
      for (const c of he.values()) {
        if (c.p) {
          c.p.advance(n);
        }
        c.brugt = false;
      }
      const r = L.current, l = (c) => c - r.x, a = (c) => c - r.y;
      b.fillStyle = "#5aa02c";
      b.fillRect(0, 0, BW, 768);
      const p = B.bg, i = p.kolonner * 128;
      for (let c = Math.max(0, Math.floor(r.x / i)); c < f.verden.gentag && c * i < r.x + BW; c++) {
        for (let y = 0; y < p.raekker; y++) {
          for (let t = 0; t < p.kolonner; t++) {
            const d = p.felter[y][t], g = c * i + t * 128 - r.x, h = y * 128 - r.y;
            if (d && g > -128 && g < BW && h > -128 && h < 768) {
              xe(b, x, I, f.baggrund.base + d, g, h);
            }
          }
        }
      }
      if (u.skilt) {
        fe_(b, x, I, C("skilt", u.skilt.film), l(u.skilt.x), a(u.skilt.y));
      }
      for (let c = 0; c < 2; c++) {
        for (const t of o.sev) {
          if ($1_(t.nr) !== c) {
            continue;
          }
          const { p: d, x: g, y: h } = Fe(t.nr);
          if (g + 640 < r.x || g - 640 > r.x + BW) {
            continue;
          }
          if (t.bygger) {
            fe_(b, x, I, C(`byg${t.nr}-${e < t.slut ? 0 : 1}`, v.byg[e < t.slut ? 0 : 1]), l(g), a(h));
            if (t.slut - e >= 1) {
              ue(Ga_(t.slut - e), l(g), a(h), v.nedtaelling.hoejde[0]);
            }
            continue;
          }
          if (fe_(b, x, I, C(`sev${t.nr}-${t.type}`, v.film[t.type]), l(g), a(h)), t.type < 1) {
            continue;
          }
          const j = ze(d, v.pengeskilt), R = ze(d, v.hjerteskilt);
          fe_(b, x, I, C(`penge${t.nr}`, v.pengeskilt.film, false), l(j.x), a(j.y));
          if (Q1_(o, t.nr)) {
            fe_(b, x, I, C(`hjerte${t.nr}`, v.hjerteskilt.film, false), l(R.x), a(R.y));
          }
          const A = v.moent.sprite + Math.floor(s / (1e3 / v.moent.fps)) % v.moent.antal;
          xe(b, x, I, A, l(j.x), a(j.y + v.moent.dy), v.moent.skala, t.alfa.v / 255);
          if (t.visTil > e && t.slut - e >= 1) {
            ue(Ga_(t.slut - e), l(j.x), a(j.y + v.nedtaelling.dyPenge), v.nedtaelling.hoejde[1]);
          }
        }
        const y = f.genstand.z;
        for (const t of o.genstande.filter((d) => d.sev >= 0 && $1_(d.sev) === c && o.sev[d.sev] && !o.sev[d.sev].bygger).sort((d, g) => y[d.kat] - y[g.kat] || d.plads - g.plads)) {
          const d = a0_(o, t.sev)[t.plads];
          if (!d) {
            continue;
          }
          const g = o0_(f, t.sev), h = g.x + d.x, j = g.y + d.y;
          if (h + 300 < r.x || h - 300 > r.x + BW) {
            continue;
          }
          const R = V1_(t, e);
          fe_(b, x, I, C(`gen${t.sev}-${t.plads}-${t.kat}-${t.f}`, f.genstand.film[t.kat][t.f]), l(h), a(j), false, R ? 85 / 255 : 1);
          if (R) {
            fe_(b, x, I, C(`sav${t.sev}-${t.plads}`, f.genstand.sav), l(h), a(j));
            ue(Ga_(t.slut - e), l(h), a(j - 60), 25);
          }
        }
        for (const t of o.dyr) {
          if ($1_(t.sev) !== c) {
            continue;
          }
          const d = K1_(o, t);
          if (!(d.x + 400 < r.x || d.x - 400 > r.x + BW)) {
            if (!t.leveret) {
              const g = e >= t.slut, h = f.dyr.ikkeAktiv[g ? Kl_(t.f) ? 1 : 2 : 0];
              if (g) {
                fe_(b, x, I, C(`ikkeaktiv${t.id}-${h}`, h), l(d.x), a(d.y));
              } else if (t.slut - e >= 1) {
                ue(Ga_(t.slut - e), l(d.x), a(d.y - 74), 25);
              }
              continue;
            }
            if (t.alfa.v > 0 && fe_(b, x, I, t.spiller, l(d.x), a(d.y), t.spejl, t.alfa.v / 255, f.dyr.skala[t.type][t.f]), t.poof) {
              const g = o0_(f, t.sev);
              fe_(b, x, I, t.poof, l(g.x + 640), a(g.y + 320));
            }
          }
        }
        for (const t of o.boder) {
          if ($1_(t.nr) !== c) {
            continue;
          }
          const d = tk_(f, t.nr), g = d.x + E.forskyd[0], h = d.y + E.forskyd[1];
          if (g + 400 < r.x || g - 400 > r.x + BW) {
            continue;
          }
          if (t.bygger) {
            const ne = e <= t.slut ? 0 : 1;
            fe_(b, x, I, C(`bodbyg${t.nr}-${ne}`, E.byg[ne]), l(g), a(h));
            if (t.slut - e >= 1) {
              ue(Ga_(t.slut - e), l(g), a(h), 64);
            }
            continue;
          }
          if (fe_(b, x, I, C(`bod${t.nr}-${t.type}`, E.film[t.type]), l(g), a(h)), t.type < 1) {
            continue;
          }
          const j = { x: d.x + E.skilt.x, y: d.y + E.skilt.y };
          fe_(b, x, I, C(`bodskilt${t.nr}`, E.skilt.film, false), l(j.x), a(j.y));
          const R = v.moent.sprite + Math.floor(s / (1e3 / v.moent.fps)) % v.moent.antal;
          xe(b, x, I, R, l(j.x), a(j.y + E.moentDy), v.moent.skala, t.alfa.v / 255);
          if (t.slut - e >= 1) {
            ue(Ga_(t.slut - e), l(j.x), a(j.y + E.tid.dy), E.tid.hoejde);
          }
          const A = Zo_(o, t.nr);
          if (A) {
            fe_(b, x, I, C(`vare${t.nr}-${A.f}`, E.vare.film[A.type][A.f]), l(d.x + E.vare.x), a(d.y + E.vare.y));
          }
        }
        {
          const t = f.udvidelse, d = tf_(o), g = f.verden.hoejde;
          if (d >= 1 && d + t.filmDx - 640 < r.x + BW) {
            fe_(b, x, I, C(`grundT-${o.lotFilm}`, t.film.T[o.lotFilm]), l(d + t.filmDx), a(Math.trunc(g * t.filmY[0])));
            fe_(b, x, I, C(`grundB-${o.lotFilm}`, t.film.B[o.lotFilm]), l(d + t.filmDx), a(Math.trunc(g * t.filmY[1])));
            if (o.lotSlut - e >= 1) {
              ue(Ga_(o.lotSlut - e), l(d + t.dx), a(Math.trunc(g * t.y) + t.tid.dy), t.tid.h);
            }
          }
        }
        for (const t of o.balloner) {
          if (t.raekke !== c || !t.spiller) {
            continue;
          }
          const d = sk_(o, t);
          if (!(d.x + 320 < r.x || d.x - 320 > r.x + BW)) {
            fe_(b, x, I, t.spiller, l(d.x), a(d.y));
          }
        }
        for (const t of o.gaester) {
          if (!(t.raekke !== c || !t.spiller || t.x + 320 < r.x || t.x - 320 > r.x + BW)) {
            fe_(b, x, I, t.spiller, l(t.x), a(f.gaester.y[c]), t.venstre, 1, f.gaester.skala);
          }
        }
      }
      for (const [c, y] of he) {
        if (!y.brugt) {
          he.delete(c);
        }
      }
      if (k.hud) {
        C1_(b, k.hud.H, k.hud.M, k.hud.I, m, P.penge);
      }
      Kt(n);
      if (k.hud) {
        b.save();
        b.translate(-HUD_SHIFT, 0);
        Rt();
        b.restore();
      }
      if (Me) {
        Me.tegn(b, ke.figurTale.map((c) => c >= 0 ? fe[c] : 0));
      }
      for (const c of [...Se]) {
        for (c.acc += n; c.acc >= zc_;) {
          c.acc -= zc_;
          c.x.trin();
          c.y.trin();
          c.alfa.trin();
          c.skala.trin();
        }
        if (c.tid += n, c.tid > H.tid) {
          Se.splice(Se.indexOf(c), 1);
          continue;
        }
        const y = c.skala.v / 256, t = v.moent.sprite + Math.floor(c.tid / (1e3 / H.hudFps)) % v.moent.antal;
        xe(b, x, I, t, c.x.v, c.y.v, y, Math.min(255, c.alfa.v + 128) / 255);
        if (m) {
          m.tegn(b, String(c.beloeb), c.x.v + H.tekstDx, c.y.v + H.tekstDy, { font: 3, str: 57 * y, alfa: Math.max(0, c.alfa.v) / 255 });
        }
      }
      Z.tegn(Pe, b, BW, 768);
      Te = requestAnimationFrame(Qe);
    };
    Te = requestAnimationFrame(Qe);
    const We = (s) => {
      if (Z.aaben) {
        s.preventDefault();
        Z.rul(s.deltaY);
      }
    }, _e = F.current;
    _e.addEventListener("wheel", We, { passive: false });
    const Bt = setInterval(De, 5e3);
    window.addEventListener("beforeunload", De);
    return () => {
      cancelAnimationFrame(Te);
      oe.stopAlle();
      if (N) {
        N.stop();
      }
      _e.removeEventListener("wheel", We);
      De();
      clearInterval(Bt);
      window.removeEventListener("beforeunload", De);
    };
  }, [B, k, m, V]);
  React.useEffect(() => {
    if (T.current) {
      T.current.saetTil(S);
    }
    if (w.current) {
      w.current.saetLyd(S);
    }
  }, [S]);
  const Y = (f) => {
    const u = F.current.getBoundingClientRect();
    return [(f.clientX - u.left) * BW / u.width, (f.clientY - u.top) * 768 / u.height];
  }, mt = (f) => {
    const u = z.current;
    if (!u || K.current) {
      return;
    }
    u.poke();
    const [D, x] = Y(f);
    if (u.menuer.aaben) {
      G.current = { x: D, y: x, flyttet: 0, menu: true };
      return;
    }
    G.current = { x: D, y: x, flyttet: 0 };
    try {
      F.current.setPointerCapture(f.pointerId);
    }
    catch {
    }
  }, vt = (f) => {
    const u = G.current, D = z.current;
    if (!u || !D) {
      return;
    }
    const [x, I] = Y(f);
    if (u.menu) {
      if (D.menuer.aaben) {
        D.menuer.rul(u.y - I);
      }
      u.flyttet += Math.abs(x - u.x) + Math.abs(I - u.y);
      u.x = x;
      u.y = I;
      return;
    }
    const ae = B.spil, v = L.current, P = re && re.s, o = P ? tf_(P) - BW / 2 : 0;
    v.x = Math.max(0, Math.min(o, v.x - (x - u.x)));
    v.y = Math.max(0, Math.min(ae.verden.hoejde - 768, v.y - (I - u.y)));
    u.flyttet += Math.abs(x - u.x) + Math.abs(I - u.y);
    u.x = x;
    u.y = I;
  }, Ye = (f) => {
    const u = G.current;
    G.current = null;
    const D = z.current;
    if (!u || !D || u.flyttet > 12 || K.current) {
      return;
    }
    const [x, I] = Y(f);
    if (u.menu) {
      if (D.menuer.aaben) {
        D.menuer.klik(D.kit, { x, y: I });
      }
      return;
    }
    const ae = L.current;
    D.tryk(x + ae.x, I + ae.y);
  };
  return B.status === "loading" ? ce.jsx(Ka_, { bredde: BW }) : B.status === "error" ? ce.jsxs("div", { className: "msg error", children: [ce.jsxs("p", { children: ["Kunne ikke indlæse: ", B.error] }), ce.jsxs("p", { className: "hint", children: ["Kør ", ce.jsx("code", { children: "node Tools/export-zoo.js" }), " og ", ce.jsx("code", { children: "node Tools/export-minispil-tekster.js" }), "."] })] }) : ce.jsx("div", { className: "spilflade", children: ce.jsx("canvas", { ref: F, width: BW, height: 768, style: { touchAction: "none", cursor: "grab" }, onPointerDown: mt, onPointerMove: vt, onPointerUp: Ye, onPointerCancel: Ye }) });
}
export { ZooGame as default };
