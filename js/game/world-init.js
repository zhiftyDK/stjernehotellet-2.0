import { clearActiveSlot } from '../storage/saves.js';
import { AnimationPlayer } from '../engine/animation.js';
import { getAnimationBounds, pointLevel } from '../render/canvas-helpers.js';
import { hasUnseenNews, INFO_SECTIONS, markNewsSeen, NEWS } from '../ui/news-and-info.js';
import { VIP_TIERS, isVipStaying, vipStatus, newFloorPrice, FLOOR_TYPES, qg, bh, Dh, ev } from './hotel.js';
import { formatDuration } from './world.js';
import { getVolume, setVolume } from '../audio/audio.js';
import { COIN_SOUND_ID, FURNITURE_TYPE_NAMES, featurePrice, DELIVERY_TIME_MS, buyFurnitureFeature, kitchenLevel, dishInfo, startDish, stovePrice, maxStovesForLevel, buyStove, maxTableForLevel, tablePrice, upgradeTable, COOK_NAMES, COOK_PRICES, hireCook } from './furniture-and-kitchen.js';
import { $l, petItemStats, buyPetItem } from './pets.js';
const o1 = { PIXELINE: { solkroner: 250, fra: "Pixeline" }, STJERNEHOTELLET: { solkroner: 500, fra: "Stjernehotellet" }, SOLØ: { solkroner: 150, fra: "Ib" } };
function s1(e) {
  for (const t of e) {
    const n = t.charCodeAt(0);
    if (n > 255 || n < 32 || n >= 58 && n <= 64 || n >= 91 && n <= 96 || n >= 123 && n <= 159) {
      return false;
    }
  }
  return true;
}
function a1(e, t) {
  if (!s1(t)) {
    return null;
  }
  const n = t.trim().toUpperCase(), r = o1[n];
  e.pengeskab = e.pengeskab || [];
  return !r || e.pengeskab.includes(n) ? null : (e.pengeskab.push(n), e.penge += r.solkroner, r);
}
export function u1() {
  const e = new Map();
  return (t, n, r, l, i, o, s, a = 1) => {
    const u = t.pakker[n], h = `${n}-${r}`;
    if (!e.has(h)) {
      const c = u && u.anims.get(r), p = c ? new AnimationPlayer(c) : null;
      if (p) {
        p.advance(0);
      }
      e.set(h, p);
    }
    const m = e.get(h), g = getAnimationBounds(u.M, m);
    if (!g) {
      return;
    }
    const v = Math.min(1, o / (g.x1 - g.x0), s / (g.y1 - g.y0));
    t.anim(n, m, l + o / 2 - (g.x0 + g.x1) / 2 * v, i + s / 2 - (g.y0 + g.y1) / 2 * v, v, a);
  };
}
export function f1(e, t, n, r, l = true) {
  e.sprite("ui", e.U.ikoner.moent, n + 22, r, { skala: 0.6 });
  e.tekst(String(t), n + 42, r, { str: 20, farve: l ? "#fff" : "#ff9c9c" });
}
export function c1(e) {
  const t = (n, r, { titel: l = "", ok: i = false, lukket: o = null } = {}) => ({ titel: l, bredde: 576, hoejde: 288, luk: false, tegn(s, a, u) {
      s.tekst(n, a.x + a.w / 2, a.y + 60, { midt: true, bredde: a.w - 90, str: 24, op: true });
      if (i) {
        s.tekstKnap(e.tekster.slet[4], a.x + a.w / 2 - 80, a.y + a.h - 90, 160, 56, () => {
          u.luk();
          if (o) {
            o();
          }
        });
      } else {
        s.spriteKnap(e.ikoner.ja, a.x + a.w / 2 - 90, a.y + a.h - 62, () => {
          u.luk();
          r();
        });
        s.spriteKnap(e.ikoner.nej, a.x + a.w / 2 + 90, a.y + a.h - 62, () => u.luk());
      }
    } });
  return { dialog: t, besked: (n, r, l = null) => t(r, null, { titel: n, ok: true, lukket: l }) };
}
export function d1(e) {
  const t = e.U, n = t.tekster, r = t.ikoner, l = u1(), i = f1, o = {}, s = c1(t);
  o.dialog = s.dialog;
  o.besked = s.besked;
  o.hovedmenu = () => ({ titel: n.hovedmenu, hoejde: 620, tegn(c, p, k) {
      const d = t.hovedmenu;
      d.knapper.forEach((P, M) => {
        const E = p.x + p.w * d.kolonner[M % 4] / 100, N = p.y + d.raekker[Math.floor(M / 4)];
        c.spriteKnap(P.sprite, E, N, () => k.aabn(o[P.menu]()), { bag: d.bag, skala: 0.95 });
      });
      const f = 260, y = 24, w = p.x + (p.w - 2 * f - y) / 2, S = p.y + p.h - 192;
      c.tekstKnap("Nyheder", w, S, f, 60, () => k.aabn(o.nyheder()));
      if (hasUnseenNews()) {
        a(c.ctx, w + f - 6, S + 6);
      }
      c.tekstKnap("Info", w + f + y, S, f, 60, () => k.aabn(o.info()));
      c.tekstKnap("Skift spiller", w, S + 84, f, 60, () => {
        clearActiveSlot();
        try {
          sessionStorage.setItem("stjernehotellet-spring-titel", "1");
        } catch {}
        window.location.reload();
      });
      c.tekstKnap("Luk spillet", w + f + y, S + 84, f, 60, () => {
        if (window.electronAPI) {
          window.electronAPI.closeApp();
        } else {
          clearActiveSlot();
          window.location.reload();
        }
      });
    } });
  const a = (c, p, k) => {
    c.save();
    c.fillStyle = "#e8322b";
    c.strokeStyle = "#fff";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(p, k, 13, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  };
  o.info = () => ({ titel: "Info", bredde: 704, hoejde: 448, tegn(c, p, k) {
      const d = k.top(), f = p.x + 48, y = p.w - 96, w = p.y + 44, S = p.h - 44 - 108;
      c.rulleliste(d, f, w, y, S, d.indholdH || S, (P) => {
        let M = P;
        INFO_SECTIONS.forEach((E, N) => {
          if (N > 0) {
            M += 18;
          }
          M += c.tekst(E.titel, f, M, { str: 24, op: true }) + 6;
          for (const C of E.tekst) {
            M += c.tekst(C, f, M, { str: 19, op: true, bredde: y - 16 }) + 8;
          }
        });
        d.indholdH = M - P;
      });
      c.tekstKnap(n.fortsaet, p.x + p.w / 2 - 110, p.y + p.h - 88, 220, 60, () => k.luk());
    } });
  o.nyheder = () => {
    markNewsSeen();
    return { titel: "Nyheder", bredde: 704, hoejde: 448, tegn(c, p, k) {
        const d = k.top(), f = p.x + 48, y = p.w - 96, w = p.y + 44, S = p.h - 44 - 108;
        c.rulleliste(d, f, w, y, S, d.indholdH || S, (P) => {
          let M = P;
          NEWS.forEach((E, N) => {
            if (N > 0) {
              M += 18;
            }
            M += c.tekst(E.dato, f, M, { str: 24, op: true }) + 6;
            for (const C of E.punkter) {
              c.tekst("-", f + 4, M, { str: 19, op: true });
              M += c.tekst(C, f + 28, M, { str: 19, op: true, bredde: y - 28 - 16 }) + 6;
            }
          });
          d.indholdH = M - P;
        });
        c.tekstKnap(n.fortsaet, p.x + p.w / 2 - 110, p.y + p.h - 88, 220, 60, () => k.luk());
      } };
  };
  const u = (c) => () => o.besked(c, n.forbindelse[1]);
  o.topliste = u(n.forbindelse[0]);
  o.venner = u("Venner");
  o.bedoemmelser = u("Bedømmelser");
  o.kaeledyr = () => o.besked(n.kaeledyr[0], n.kaeledyr[1]);
  o.kendte = () => {
    e.hoved("kendte", { v0: 0 });
    return { titel: n.kendte[0], tegn(c, p, k) {
        const d = e.D.vip.film, f = 4, y = 150, w = 270;
        c.rulleliste(k.top(), p.x + 40, p.y + 40, p.w - 80, p.h - 72, Math.ceil(d.length / f) * w, (S) => {
          d.forEach((P, M) => {
            const E = p.x + 52 + M % f * (y + 6), N = S + Math.floor(M / f) * w, C = VIP_TIERS[M], I = isVipStaying(e.s, M);
            if (c.ramme("punkt", E, N, y, w - 8), l(c, "hotel", P[0], E + 8, N + 8, y - 16, 150, I ? 0.5 : 1), c.sprite("ui", r.moent, E + 30, N + 178, { skala: 0.6 }), c.tekst(`+${C.betaling}`, E + 50, N + 178, { str: 18 }), c.sprite("ui", r.timeglas, E + 30, N + 206, { skala: 0.6 }), c.tekst(formatDuration(C.tid / 1e3), E + 50, N + 206, { str: 18 }), I) {
              c.sprite("ui", r.jaLille, E + y / 2, N + 238);
              return;
            }
            i(c, C.pris, E + 14, N + 238, e.s.penge >= C.pris);
            c.knap({ x0: E, y0: N, x1: E + y, y1: N + w - 8 }, () => {
              if (e.s.vipVenter != null) {
                k.aabn(o.besked(n.kendte[0], n.kendte[5]));
                return;
              }
              k.aabn(o.dialog(n.kendte[1], () => {
                const O = vipStatus(e.s, M);
                if (O === "penge") {
                  e.hoved("kendte", { v0: 2 });
                  e.vis(n.kendte[3]);
                } else if (O === "plads") {
                  e.vis(n.kendte[2]);
                } else if (O === "bor") {
                  e.vis(n.kendte[6]);
                } else if (O === "venter") {
                  e.vis(n.kendte[5]);
                } else {
                  e.hoved("kendtKommer", { v0: M, v1: 0 });
                  k.lukAlle();
                }
              }));
            });
          });
        });
      } };
  };
  o.indstillinger = () => ({ titel: n.indstillinger[0], hoejde: 536, tegn(c, p, k) {
      const d = p.x + 152, f = 400, y = 60;
      let w = p.y + 64;
      c.tekstKnap(e.s.musik === false ? n.indstillinger[2] : n.indstillinger[1], d, w, f, y, () => {
        e.s.musik = e.s.musik === false;
      });
      w += 84;
      c.tekstKnap(n.indstillinger[7], d, w, f, y, () => k.aabn(o.besked(n.indstillinger[7], n.indstillinger[8])));
      w += 84;
      const S = e.s.etager.length > 2;
      c.tekstKnap(n.indstillinger[5], d, w, f, y, () => k.aabn(o.dialog(n.indstillinger[6], () => {
        e.s.etager.pop();
        e.s.kam.y -= e.D.etage.hoejde;
      })), { aktiv: S });
      w += 84;
      c.tekstKnap(n.indstillinger[3], d, w, f, y, () => k.aabn(o.dialog(n.indstillinger[4], () => {
        k.lukAlle();
        e.nulstil();
      })));
      w += 84;
      h(c, d, w, f);
    } });
  const h = (c, p, k, d) => {
    const f = c.ctx, y = 150, w = p + y, S = d - y - 70, P = k + 30, M = 10, E = getVolume();
    c.tekst("Lyd", p + 8, P, { str: 22 });
    f.save();
    f.lineCap = "round";
    f.lineWidth = 14;
    f.strokeStyle = "rgba(0,0,0,.35)";
    f.beginPath();
    f.moveTo(w, P);
    f.lineTo(w + S, P);
    f.stroke();
    if (E > 0) {
      f.strokeStyle = "#ffb92e";
      f.beginPath();
      f.moveTo(w, P);
      f.lineTo(w + S * E, P);
      f.stroke();
    }
    f.fillStyle = "#fff";
    f.strokeStyle = "#a3620f";
    f.lineWidth = 4;
    f.beginPath();
    f.arc(w + S * E, P, 16, 0, Math.PI * 2);
    f.fill();
    f.stroke();
    f.restore();
    c.tekst(`${Math.round(E * 200)}%`, p + d, P, { str: 22, hoejre: true });
    c.traek({ x0: w - 24, y0: P - 30, x1: w + S + 24, y1: P + 30 }, (N) => {
      setVolume(Math.round(Math.max(0, Math.min(1, (N.x - w) / S)) * M) / M);
    });
  }, m = (c) => {
    const p = e.s, k = pointLevel(p.hentet).antal, d = p.etager.length - 1;
    return [k >= 1, k >= 5, k >= 10, d >= 2, d >= 11, d >= 20, false, false, p.hentet >= 1e3, p.hentet >= 5e3, p.hentet >= 5e4][c] || (p.bedrifter || []).includes(c);
  };
  o.bedrifter = () => ({ titel: n.bedrifter[0], tegn(c, p, k) {
      const d = (n.bedrifter.length - 1) / 2, f = 76;
      c.rulleliste(k.top(), p.x + 40, p.y + 40, p.w - 80, p.h - 72, d * f, (y) => {
        for (let w = 0; w < d; w++) {
          const S = y + w * f, P = m(w);
          c.ramme("punkt", p.x + 40, S, p.w - 92, f - 8);
          c.sprite("ui", P ? r.pokaler[2] : r.laas, p.x + 84, S + 34, { alfa: P ? 1 : 0.6, skala: 0.8 });
          c.tekst(n.bedrifter[1 + 2 * w], p.x + 124, S + 22, { str: 22, farve: P ? "#ffe36b" : "#fff" });
          c.tekst(n.bedrifter[2 + 2 * w], p.x + 124, S + 48, { str: 17, vaegt: 700 });
        }
      });
    } });
  o.rubiner = () => ({ titel: n.rubinButik[0], tegn(c, p, k) {
      const d = r.rubinPakker, f = 4, y = 150, w = 150, S = Math.ceil(d.length / f);
      c.rulleliste(k.top(), p.x + 40, p.y + 40, p.w - 80, p.h - 72, S * w, (P) => {
        d.forEach((M, E) => {
          const N = p.x + 52 + E % f * (y + 6), C = P + Math.floor(E / f) * w;
          c.ramme("punkt", N, C, y, w - 8);
          c.spriteIKasse("ui", M, N + 8, C + 6, y - 16, w - 50);
          c.tekst(n.rubinPakker[E], N + y / 2, C + w - 28, { str: 16, midt: true });
          c.knap({ x0: N, y0: C, x1: N + y, y1: C + w - 8 }, () => k.aabn(o.besked(n.rubinButik[0], `${n.rubinButik[4]}.`)));
        });
      });
    } });
  o.post = () => o.besked(n.post[0], n.post[1]);
  o.pengeskab = () => {
    const c = n.pengeskab;
    let p = "";
    const k = (d) => {
      const f = a1(e.s, p);
      if (p = "", !f) {
        d.aabn(o.besked(c[0], c[3]));
        return;
      }
      d.aabn(o.besked(c[0], `${c[4]}${f.solkroner}${c[6]}${f.fra}. ${c[7]}`));
    };
    return { titel: c[0], tegn(d, f, y) {
        d.tekst(c[1], f.x + 80 + 272, f.y + 64 + 92, { str: 24, midt: true, bredde: 544 });
        d.ramme("punkt", f.x + 80, f.y + 324, 544, 48);
        const w = Math.floor(performance.now() / 500) % 2 ? "_" : " ";
        d.tekst(p + w, f.x + 80 + 272, f.y + 324 + 24, { str: 24, midt: true });
        d.knap({ x0: f.x + 80, y0: f.y + 324, x1: f.x + 624, y1: f.y + 372 }, () => e.tastatur && e.tastatur());
        d.sprite("ui", 4439, f.x + 748, f.y + 224);
        d.spriteKnap(r.laas, f.x + f.w, f.y + f.h, () => k(y));
      }, tast(d, f) {
        if (d === "Backspace") {
          p = p.slice(0, -1);
          return true;
        }
        if (d === "Enter") {
          k(f);
          return true;
        }
        if (d.length === 1 && p.length < 24) {
          p += d;
          return true;
        }
        return false;
      } };
  };
  o.praemie = ({ i: c, beloeb: p }) => {
    const k = e.s.kd.tekster.praemie;
    return o.besked(k[0], `${k[1]}${k[2 + c]}
+${p} solkroner`, () => {
      if (p >= 1) {
        e.s.lyde.push(COIN_SOUND_ID);
      }
    });
  };
  o.udgang = () => ({ bredde: 576, hoejde: 288, luk: false, tegn(c, p, k) {
      c.tekstKnap(n.bliv, p.x + 88, p.y + 60, 400, 64, () => k.luk());
      c.tekstKnap(n.forlad, p.x + 88, p.y + 150, 400, 64, () => {
        k.luk();
        e.tilKort();
      });
    } });
  o.guide = () => ({ titel: n.guide, bredde: 704, hoejde: 448, tegn(c, p, k) {
      c.tekst(n.hjaelp, p.x + 48, p.y + 56, { bredde: p.w - 96, str: 21, op: true, vaegt: 700 });
      c.tekstKnap(n.fortsaet, p.x + p.w / 2 - 110, p.y + p.h - 88, 220, 60, () => {
        k.luk();
        if (!e.s.budt) {
          e.s.budt = true;
          e.hoved("velkomst");
        }
      });
    } });
  o.etagebutik = () => ({ titel: n.etager[0], tegn(c, p, k) {
      const d = e.D.kanBygges, f = 96, y = newFloorPrice(e.s.etager.length);
      c.rulleliste(k.top(), p.x + 40, p.y + 40, p.w - 80, p.h - 72, d.length * f, (w) => {
        d.forEach((S, P) => {
          const M = w + P * f, E = y + FLOOR_TYPES[S].pris, N = e.s.penge >= E;
          c.ramme("punkt", p.x + 40, M, p.w - 92, f - 8);
          c.spriteIKasse("hotel", e.D.moduler[S].sprite, p.x + 52, M + 8, 170, f - 24);
          c.tekst(e.D.moduler[S].navn, p.x + 240, M + 28, { str: 22 });
          if (S !== $l) {
            c.tekst(`${FLOOR_TYPES[S].leje} kr. pr. gæst`, p.x + 240, M + 58, { str: 17, vaegt: 700 });
          }
          i(c, E, p.x + p.w - 190, M + f / 2 - 4, N);
          c.knap({ x0: p.x + 40, y0: M, x1: p.x + p.w - 52, y1: M + f - 8 }, () => {
            if (!N) {
              e.vis("Du har ikke nok solkroner.");
              return;
            }
            if (S === $l) {
              k.aabn(o.dyrehandel());
              return;
            }
            k.aabn(o.dialog(n.etager[1], () => {
              qg(e.s, S);
              k.lukAlle();
              if (S === bh && e.vejledning) {
                e.vejledning(0);
              }
            }));
          });
        });
      });
    } });
  o.dyrehandel = () => {
    e.hoved("dyrehandel");
    const c = e.s.kd.tekster.dyrehandel;
    return { titel: c[0], tegn(p, k, d) {
        if (!e.kaeledyr()) {
          p.tekst("Vent...", k.x + k.w / 2, k.y + k.h / 2, { str: 24, midt: true });
          return;
        }
        const f = e.s.kd.dyr.film, y = 4, w = 150, S = 220;
        p.rulleliste(d.top(), k.x + 40, k.y + 40, k.w - 80, k.h - 72, Math.ceil(f.length / y) * S, (P) => {
          f.forEach((M, E) => {
            const N = k.x + 52 + E % y * (w + 6), C = P + Math.floor(E / y) * S, I = Dh(e.s, E);
            p.ramme("punkt", N, C, w, S - 8);
            l(p, "kaeledyr", M.film[0], N + 8, C + 8, w - 16, S - 60);
            i(p, I, N + 14, C + S - 34, e.s.penge >= I);
            p.knap({ x0: N, y0: C, x1: N + w, y1: C + S - 8 }, () => d.aabn(o.dialog(c[1], () => {
              if (!ev(e.s, E)) {
                e.vis("Du har ikke nok solkroner.");
                return;
              }
              e.hoved("nytDyr");
              d.lukAlle();
            })));
          });
        });
      } };
  };
  o.bod = (c, p) => {
    const k = e.s.kd.tekster.butik;
    return { titel: k[1 + p], tegn(d, f, y) {
        const w = e.s.kd.forbrug.film[p], S = pointLevel(e.s.hentet).antal, P = 5, M = 118, E = 170;
        d.rulleliste(y.top(), f.x + 40, f.y + 40, f.w - 80, f.h - 72, Math.ceil(w.length / P) * E, (N) => {
          w.forEach((C, I) => {
            const O = f.x + 46 + I % P * (M + 5), F = N + Math.floor(I / P) * E, V = petItemStats(p, I), K = S < V.stjerner;
            d.ramme("punkt", O, F, M, E - 8);
            l(d, "kaeledyr", C, O + 8, F + 6, M - 16, 70, K ? 0.5 : 1);
            d.tekst(`+${V.kvalitet}`, O + 12, F + 92, { str: 16 });
            d.sprite("ui", r.timeglas, O + M / 2 + 4, F + 92, { skala: 0.5 });
            d.tekst(formatDuration(V.levetid / 1e3), O + M / 2 + 18, F + 92, { str: 14 });
            if (K) {
              d.sprite("ui", r.laas, O + M / 2 - 14, F + E - 34, { skala: 0.6 });
              d.sprite("ui", r.stjerne, O + M / 2 + 14, F + E - 34, { skala: 0.5 });
              d.tekst(String(V.stjerner), O + M / 2 + 28, F + E - 34, { str: 16 });
            } else {
              i(d, V.pris, O + 8, F + E - 34, e.s.penge >= V.pris);
            }
            d.knap({ x0: O, y0: F, x1: O + M, y1: F + E - 8 }, () => {
              if (K) {
                y.aabn(o.besked(k[1 + p], k[5]));
                return;
              }
              y.aabn(o.dialog(k[4], () => {
                const W = buyPetItem(e.s, c, p, I);
                if (!W) {
                  e.vis("Du har ikke nok solkroner.");
                  return;
                }
                e.hoved(W.script, W.v0 != null ? { v0: W.v0 } : void 0);
                y.lukAlle();
              }));
            });
          });
        });
      } };
  };
  o.inventar = (c) => ({
    titel: `${n.inventar[0]}: ${FURNITURE_TYPE_NAMES[c.type] || c.type}`,
    tegn(p, k, d) {
      const f = e.MB.kat[c.type].film, y = 5, w = 118, S = 132;
      p.rulleliste(d.top(), k.x + 40, k.y + 40, k.w - 80, k.h - 72, Math.ceil(f.length / y) * S, (P) => {
        f.forEach((M, E) => {
          const N = k.x + 46 + E % y * (w + 5), C = P + Math.floor(E / y) * S, I = E === c.feature, O = e.s.penge >= featurePrice(E);
          p.ramme("punkt", N, C, w, S - 8);
          l(p, "moebler", M, N + 8, C + 6, w - 16, S - 46);
          if (I) {
            p.sprite("ui", r.jaLille, N + w - 20, C + 18);
          } else {
            i(p, featurePrice(E), N + 8, C + S - 26, O);
          }
          if (!I) {
            p.knap({ x0: N, y0: C, x1: N + w, y1: C + S - 8 }, () => {
              if (!O) {
                e.vis("Du har ikke nok solkroner.");
                return;
              }
              d.aabn(o.dialog(`${n.inventar[1]}
${n.leveres[1]}${DELIVERY_TIME_MS / 1e3} sekunder.`, () => {
                buyFurnitureFeature(e.s, c, E);
                e.hoved("moebelLeveres", { v0: 0 });
                d.lukAlle();
              }));
            });
          }
        });
      });
    }
  });
  const g = () => e.CF.C, v = (c, p, k) => {
    const d = kitchenLevel(p.tjent);
    c.sprite("ui", r.kokkehue, k.x + 60, k.y + k.h - 36, { skala: 0.6 });
    c.tekst(`${d} · tjent ${Math.round(p.tjent)} kr.`, k.x + 84, k.y + k.h - 36, { str: 18, vaegt: 700 });
  };
  o.mad = (c, p) => ({ titel: g().tekster.mad, tegn(k, d, f) {
      const w = kitchenLevel(c.tjent);
      k.rulleliste(f.top(), d.x + 40, d.y + 40, d.w - 80, d.h - 96, g().mad.salg.length * 84, (S) => {
        g().mad.salg.forEach((P, M) => {
          const E = S + M * 84, N = dishInfo(M), C = N.huer > w, I = !C && e.s.penge >= N.pris;
          k.ramme("punkt", d.x + 40, E, d.w - 92, 76);
          l(k, "cafe", P, d.x + 50, E + 4, 90, 68, C ? 0.4 : 1);
          k.tekst(N.navn, d.x + 150, E + 24, { str: 22, farve: C ? "#bbb" : "#fff" });
          k.tekst(C ? `Låst: ${N.huer} kokkehuer` : `${N.portioner} × ${N.prisPrPortion} kr. · ${N.tid / 1e3} s`, d.x + 150, E + 52, { str: 17, vaegt: 700 });
          if (C) {
            k.sprite("ui", r.laas, d.x + d.w - 110, E + 84 / 2 - 4, { skala: 0.6 });
          } else {
            i(k, N.pris, d.x + d.w - 180, E + 84 / 2 - 4, I);
          }
          k.knap({ x0: d.x + 40, y0: E, x1: d.x + d.w - 52, y1: E + 84 - 8 }, () => {
            if (C) {
              e.vis(g().tekster.laast);
              return;
            }
            if (!I) {
              e.vis(n.mad[2]);
              return;
            }
            f.aabn(o.dialog(n.mad[1], () => {
              startDish(e.s, c, p, M);
              f.lukAlle();
            }));
          });
        });
      });
      v(k, c, d);
    } });
  o.nytKomfur = (c) => {
    const p = c.komfurer.length;
    return o.dialog(`${g().tekster.komfurer}: ${stovePrice(p)} kr.

Vil du købe dette komfur?`, () => {
      if (p >= maxStovesForLevel(kitchenLevel(c.tjent))) {
        e.vis(g().tekster.vejledning[9]);
      } else if (buyStove(e.s, c)) {
        e.hoved("komfur", { v0: 2, v1: 1 });
      } else {
        e.vis("Du har ikke nok solkroner.");
      }
    }, { titel: g().tekster.komfurer });
  };
  o.bord = (c) => ({ titel: g().tekster.borde, tegn(p, k, d) {
      const f = g().bord.film, y = kitchenLevel(c.tjent), w = 150, S = 160;
      f.forEach((P, M) => {
        const E = k.x + 48 + M % 4 * (w + 6), N = k.y + 44 + Math.floor(M / 4) * (S + 6), C = M <= c.bord, I = M > maxTableForLevel(y);
        p.ramme("punkt", E, N, w, S);
        l(p, "cafe", P, E + 8, N + 8, w - 16, S - 60, I ? 0.4 : 1);
        p.tekst(`${g().bord.pladser[M]} tallerkener`, E + w / 2, N + S - 40, { str: 16, midt: true, vaegt: 700 });
        if (M === c.bord) {
          p.sprite("ui", r.jaLille, E + w / 2, N + S - 16);
        } else if (I) {
          p.tekst(`${M} kokkehuer`, E + w / 2, N + S - 16, { str: 16, midt: true, farve: "#bbb" });
        } else if (!C) {
          i(p, tablePrice(M), E + 34, N + S - 16, e.s.penge >= tablePrice(M));
        }
        if (!C && !I) {
          p.knap({ x0: E, y0: N, x1: E + w, y1: N + S }, () => d.aabn(o.dialog("Vil du købe dette bord?", () => {
            if (upgradeTable(g(), e.s, c, M)) {
              e.hoved("bord", { v0: 2 });
              d.lukAlle();
            } else {
              e.vis("Du har ikke nok solkroner.");
            }
          })));
        }
      });
      v(p, c, k);
    } });
  o.kokke = (c) => ({ titel: g().tekster.kokke, tegn(p, k, d) {
      g().kok.film.forEach((f, y) => {
        const S = k.x + 52 + y * 124, P = k.y + 60;
        p.ramme("punkt", S, P, 118, 300);
        l(p, "cafe", f[0], S + 6, P + 8, 106, 220);
        p.tekst(COOK_NAMES[y], S + 118 / 2, P + 248, { str: 16, midt: true });
        if (y === c.kok) {
          p.sprite("ui", r.jaLille, S + 118 / 2, P + 278);
        } else {
          i(p, COOK_PRICES[y], S + 14, P + 278, e.s.penge >= COOK_PRICES[y]);
        }
        if (y !== c.kok) {
          p.knap({ x0: S, y0: P, x1: S + 118, y1: P + 300 }, () => d.aabn(o.dialog("Vil du invitere denne kok?", () => {
            if (hireCook(e.s, c, y)) {
              e.hoved("kok", { v0: y });
              d.lukAlle();
            } else {
              e.vis("Du har ikke nok solkroner til at invitere den kendte kok.");
            }
          })));
        }
      });
    } });
  return o;
}
