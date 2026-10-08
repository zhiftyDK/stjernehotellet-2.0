import { Tween } from '../engine/tween.js';
const Lo = 33, nowSeconds = () => Math.floor(Date.now() / 1e3), r0 = (e, t) => Math.trunc(t / e.regler.kronerPrPoint) || (t > 0 ? 1 : 0);
function or(e, t, n) {
  if (t.brug(n)) {
    e.score += r0(e.Z, n);
    return true;
  }
  return false;
}
function levelForScore(e, t) {
  const n = e.regler.niveauer, r = n.length;
  if (n[r - 1] <= t) {
    return Math.min(99, r + Math.trunc((t - n[r - 1]) / (n[r - 1] - n[r - 2])));
  }
  for (let l = 0; l < r - 1; l++) {
    if (n[l] > t) {
      return l;
    }
  }
  return Math.min(99, r - 1);
}
function Zc(e, t) {
  const n = e.regler.niveauer, r = n.length;
  return t < 1 ? 0 : t <= r ? n[t - 1] : n[r - 1] + (t - r) * (n[r - 1] - n[r - 2]);
}
export function D1(e, t) {
  const n = levelForScore(e, t), r = Zc(e, n), l = Zc(e, n + 1);
  return Math.min(1, l > r ? (t - r) / (l - r) : 0);
}
export const l0 = (e) => levelForScore(e.Z, e.score), A1 = (e) => Math.min(levelForScore(e.Z, e.score), e.Z.regler.niveauer.length - 1), Hr = (e) => e.regler.laas, Uv = (e, t) => Hr(e).sevaerdigheder[t] || 0, O1 = (e, t, n) => Hr(e).genstande[t] && Hr(e).genstande[t][n] || 0, Vv = (e, t) => Hr(e).boder[t] || 0, z1 = (e, t, n) => Hr(e).varer[t] && Hr(e).varer[t][n] || 0, i0 = (e, t) => t > l0(e), randomInt = (e, t) => e + Math.floor(Math.random() * (t - e + 1));
export function o0(e, t) {
  const n = e.sevaerdighed.plads, r = t % 2 === 0;
  return { x: (r ? n.x[0] : n.x[1]) + Math.trunc(t / 2) * n.dx, y: r ? n.y[0] : n.y[1] };
}
export const $1 = (e) => e % 2;
export function formatDuration(e) {
  const t = Math.trunc(e / 3600), n = e - t * 3600, r = Math.trunc(n / 60), l = n - r * 60, i = (o) => o <= 9 ? `0${o}` : String(o);
  return e >= 3600 ? `${t}:${i(r)}:${i(l)}` : n >= 60 ? `${r}:${i(l)}` : String(l);
}
export const Bl = (e, t) => e.regler.sevaerdigheder[t], Ju = (e, t, n) => e.regler.dyr[t][n], Kl = (e) => e < 2, Io = (e) => ({ nr: e, type: 0, bygger: false, slut: 0 });
function Xc(e) {
  if (!e.alfa) {
    e.alfa = new Tween(0, 30);
    e.klar = false;
    e.visTil = 0;
    e.handling = [false, false];
  }
  return e;
}
const Jc = (e, t) => e.grunde - (t < e.lotSlut ? 1 : 0);
function qu(e, t = nowSeconds()) {
  const n = e.Z.sevaerdighed.prGrund * Jc(e, t);
  for (let l = e.sev.length; l < n; l++) {
    e.sev.push(Io(l));
  }
  e.sev.forEach(Xc);
  const r = e.Z.bod.prGrund * Jc(e, t);
  for (let l = e.boder.length; l < r; l++) {
    e.boder.push(Io(l));
  }
  e.boder.forEach(Xc);
}
export function createZooState(e) {
  const t = { Z: e, grunde: 1, sev: [], dyr: [], reder: Gv(e), genstande: [], boder: [], varer: [], naesteId: 0, lyde: [], effekter: [], rest: 0, film: () => null, gaester: [], balloner: [], ballonTid: 0, score: 0, lotSlut: 0, lotFilm: 0 };
  qu(t);
  return t;
}
function Gv(e) {
  return Array.from({ length: e.rede.antal }, (t, n) => ({ nr: n, laast: n > 0, sev: -1, f: -1 }));
}
export function serializeZooState(e) {
  return { grunde: e.grunde, lotSlut: e.lotSlut, score: e.score, naesteId: e.naesteId, sev: e.sev.map(({ type: t, bygger: n, slut: r }) => ({ type: t, bygger: n, slut: r })), dyr: e.dyr.map(({ id: t, sev: n, type: r, f: l, slut: i, leveret: o }) => ({ id: t, sev: n, type: r, f: l, slut: i, leveret: o })), reder: e.reder.map(({ laast: t, sev: n, f: r }) => ({ laast: t, sev: n, f: r })), genstande: e.genstande.map(({ sev: t, plads: n, kat: r, f: l, slut: i }) => ({ sev: t, plads: n, kat: r, f: l, slut: i })), boder: e.boder.map(({ type: t, bygger: n, slut: r }) => ({ type: t, bygger: n, slut: r })), varer: e.varer.map(({ bod: t, type: n, f: r }) => ({ bod: t, type: n, f: r })) };
}
export function loadZooState(e, t, n = nowSeconds()) {
  const r = createZooState(e);
  if (!t || !Array.isArray(t.sev)) {
    return r;
  }
  r.grunde = Math.min(t.grunde || 1, e.regler.grunde.length);
  r.lotSlut = t.lotSlut || 0;
  r.naesteId = t.naesteId || 0;
  r.sev = t.sev.map((l, i) => ({ ...Io(i), ...l }));
  if (Array.isArray(t.boder)) {
    r.boder = t.boder.map((l, i) => ({ ...Io(i), ...l }));
  }
  if (Array.isArray(t.varer)) {
    r.varer = t.varer.filter((l) => e.bod.vare.film[l.type]);
  }
  qu(r, n);
  for (const l of t.dyr || []) {
    if (r.sev[l.sev] && e.dyr.film[l.type]) {
      r.dyr.push(nf(r, l));
    }
  }
  if (Array.isArray(t.reder)) {
    t.reder.forEach((l, i) => {
      if (r.reder[i]) {
        Object.assign(r.reder[i], l);
      }
    });
  }
  if (Array.isArray(t.genstande)) {
    r.genstande = t.genstande.filter((l) => r.Z.genstand.film[l.kat]);
  }
  for (const l of r.sev) {
    if (l.type) {
      f0(r, l.nr, 0);
    }
  }
  r.score = typeof t.score == "number" ? t.score : Wv(r);
  return r;
}
function Wv(e) {
  const t = e.Z, n = (l) => r0(t, l || 0);
  let r = 0;
  for (const l of e.sev) {
    if (l.type) {
      r += n(Bl(t, l.type).pris);
    }
  }
  for (const l of e.dyr) {
    if (l.f > 0) {
      r += n(Ju(t, l.type, l.f).pris);
    }
  }
  e.reder.forEach((l, i) => {
    if (!l.laast && i > 0) {
      r += n(t.regler.reder[i]);
    }
  });
  for (const l of e.genstande) {
    if (l.kat >= 2) {
      r += n((Wa(t, l.kat, l.f) || {}).pris);
    }
  }
  for (const l of e.boder) {
    if (l.type >= 1) {
      r += n(Zi(t, l.type).pris);
    }
  }
  for (const l of e.varer) {
    if (l.f > 0) {
      r += n((Ul(t, l.type, l.f) || {}).pris);
    }
  }
  for (let l = 1; l < e.grunde; l++) {
    r += n(t.regler.grunde[l].pris);
  }
  return r;
}
export const ef = (e, t) => e.dyr.filter((n) => n.sev === t), tf = (e) => o0(e.Z, e.sev.length).x, s0 = (e, t) => e.Z.dyr.stier[Kl(t.f) ? "voksen" : "unger"][t.type];
function nf(e, t) {
  const n = e.Z.dyr.stier[Kl(t.f) ? "voksen" : "unger"][t.type], r = { ...t, maal: 0, pos: randomInt(0, n[n.length - 1][0] - n[0][0]), tilstand: t.leveret ? 1 : 0, naeste: 1, tael: 0, spejl: Math.random() < 0.5, film: 0, spiller: null, filmId: 0, alfa: new Tween(0, 15), poof: null };
  if (r.leveret) {
    En(e, r, 0);
  }
  return r;
}
function En(e, t, n) {
  const r = e.Z.dyr.film[t.type][t.f][n];
  t.film = n;
  t.filmId = r;
  t.spiller = e.film(r);
  if (t.spiller) {
    t.spiller.advance(0);
  }
}
function en(e, t, n) {
  t.tilstand = n;
  const r = e.sev[t.sev];
  if (n === 1) {
    En(e, t, 0);
  } else if (n === 2) {
    En(e, t, 1);
  } else if (n === 3) {
    t.spejl = t.maal < t.pos;
    En(e, t, 2);
  } else if (n === 4) {
    En(e, t, 3);
  } else if (n === 5) {
    r.handling[0] = true;
    t.spejl = false;
    En(e, t, 4);
  } else if (n === 6) {
    r.handling[1] = true;
    t.spejl = false;
    En(e, t, 5);
  }
}
const qc = (e) => !e.spiller || e.spiller.finished;
export function K1(e, t) {
  const n = o0(e.Z, t.sev);
  if (!t.leveret) {
    const a = e.Z.sevaerdighed.hjerteskilt;
    return { x: n.x + a.x, y: n.y + a.y };
  }
  const r = s0(e, t), l = Math.max(t.pos + r[0][0], r[0][0] + 1);
  let i = 1;
  for (; i < r.length - 1 && r[i][0] < l;) {
    i++;
  }
  const [o, s] = [r[i - 1], r[i]];
  return { x: n.x + l, y: n.y + o[1] + (l - o[0]) * (s[1] - o[1]) / (s[0] - o[0]) };
}
function Yv(e, t, n) {
  const r = e.sev[t.sev];
  if (!t.leveret) {
    return;
  }
  const l = s0(e, t), i = l[l.length - 1][0] - l[0][0];
  switch (t.tilstand) {
    case 1: {
      if (t.tael += 1, t.tael < e.Z.dyr.ventetal || (t.tael = 0, randomInt(0, 16) !== 0)) {
        break;
      }
      const o = randomInt(0, 65536) / 65536;
      if (o < 0.33) {
        t.maal = randomInt(0, i);
        en(e, t, 3);
      } else if (o < 0.5) {
        en(e, t, 2);
      } else if (o < 0.7) {
        en(e, t, 4);
      } else if (o < 0.85) {
        if (!r.handling[0]) {
          t.maal = i;
          en(e, t, 3);
          t.naeste = 5;
        }
      } else if (!r.handling[1]) {
        t.maal = 0;
        en(e, t, 3);
        t.naeste = 6;
      }
      break;
    }
    case 3:
      if (t.maal !== t.pos) {
        const o = Math.max(1, Math.trunc(Math.min(Math.abs(t.maal - t.pos), e.Z.dyr.fart) * (Lo / 33)));
        t.pos += t.maal > t.pos ? o : -o;
        if ((t.maal - t.pos) * (t.maal > t.pos ? 1 : -1) < 0) {
          t.pos = t.maal;
        }
      } else {
        en(e, t, t.naeste);
        t.naeste = 1;
      }
      break;
    case 2:
    case 4:
      if (qc(t)) {
        en(e, t, t.naeste);
        t.naeste = 1;
      }
      break;
    case 5:
    case 6:
      if (qc(t)) {
        r.handling[t.tilstand - 5] = false;
        en(e, t, t.naeste);
        t.naeste = 1;
      }
      break;
  }
}
export function U1(e, t, n, r, l) {
  const i = e.sev[n];
  return !i || i.type !== 0 || !e.Z.dyr.film[r] ? false : i0(e, Uv(e.Z, r)) ? "laast" : or(e, t, Bl(e.Z, r).pris) ? (Object.assign(i, { type: r, bygger: true, slut: l + Bl(e.Z, r).byggetid }), e.naesteId += 1, e.dyr.push(nf(e, { id: e.naesteId, sev: n, type: r, f: 0, slut: l, leveret: true })), f0(e, n, l), e.lyde.push(e.Z.lyde.byg), true) : "penge";
}
export const a0 = (e, t) => e.sev[t] && e.sev[t].type ? e.Z.regler.pladser[e.sev[t].type] : [], u0 = (e, t, n) => e.genstande.find((r) => r.sev === t && r.plads === n) || null, Wa = (e, t, n) => e.regler.genstande[t] && e.regler.genstande[t][n], V1 = (e, t) => t < e.slut, H1 = (e, t, n) => e.genstande.filter((r) => r.sev < 0 && r.kat === t && r.f === n).length;
function f0(e, t, n) {
  a0(e, t).forEach((r, l) => {
    if (!u0(e, t, l)) {
      e.genstande.push({ sev: t, plads: l, kat: 0, f: r.tom, slut: n });
    }
  });
}
export function G1(e, t, n, r, l, i) {
  const o = a0(e, n)[r], s = u0(e, n, r);
  if (!o || s && s.kat === o.kat && s.f === l) {
    return false;
  }
  const a = e.genstande.find((u) => u.sev < 0 && u.kat === o.kat && u.f === l);
  if (!a) {
    const u = Wa(e.Z, o.kat, l);
    if (!u || !or(e, t, u.pris)) {
      return "penge";
    }
  }
  if (s) {
    if (s.kat === 0) {
      e.genstande.splice(e.genstande.indexOf(s), 1);
    } else {
      s.sev = -1;
      s.plads = -1;
    }
  }
  if (a) {
    Object.assign(a, { sev: n, plads: r });
  } else {
    e.genstande.push({ sev: n, plads: r, kat: o.kat, f: l, slut: i + Wa(e.Z, o.kat, l).byggetid });
  }
  return true;
}
export function W1(e, t, n) {
  const r = e.sev[t];
  if (!r || !r.bygger || n < r.slut) {
    return false;
  }
  r.bygger = false;
  r.slut = n + Bl(e.Z, r.type).udbetalingstid;
  e.lyde.push(e.Z.lyde.faerdig);
  return true;
}
export function Y1(e, t, n, r) {
  const l = e.sev[n];
  if (r <= l.slut) {
    l.visTil = r + e.Z.sevaerdighed.nedtaelling.vis;
    return 0;
  }
  l.slut = r + Bl(e.Z, l.type).udbetalingstid;
  const i = ef(e, n).filter((o) => r >= o.slut).reduce((o, s) => o + Ju(e.Z, s.type, s.f).udbetaling, 0);
  if (i > 0) {
    t.faa(i);
  }
  return i;
}
export function c0(e, t) {
  const n = e.sev[t];
  if (!n || n.type === 0) {
    return null;
  }
  const r = Math.max(-1, ...ef(e, t).map((l) => l.f)) + 1;
  return r > 3 ? null : { type: n.type, f: r };
}
export const Q1 = (e, t) => !!c0(e, t) || ef(e, t).some((n) => !n.leveret);
export function Z1(e, t, n, r, l = -1) {
  const i = c0(e, n);
  if (!i) {
    return false;
  }
  const o = e.reder[l];
  if (!Kl(i.f) && (!o || o.laast || o.sev >= 0)) {
    return false;
  }
  const s = Ju(e.Z, i.type, i.f);
  if (or(e, t, s.pris)) {
    e.naesteId += 1;
    e.dyr.push(nf(e, { id: e.naesteId, sev: n, ...i, slut: r + s.byggetid, leveret: false }));
    if (!Kl(i.f)) {
      o.sev = n;
      o.f = i.f;
    }
    return true;
  }
  return "penge";
}
export function X1(e, t, n) {
  const r = e.reder[n];
  return !r || !r.laast ? false : or(e, t, e.Z.regler.reder[n]) ? (r.laast = false, true) : "penge";
}
export const J1 = (e, t) => t.sev < 0 ? null : e.dyr.find((n) => n.sev === t.sev && n.f === t.f && !n.leveret) || null;
export function q1(e, t) {
  const n = e.Z.rede.film, r = t.sev >= 0 && e.sev[t.sev] ? e.sev[t.sev].type : 0;
  return n[r] || n[0];
}
export function ek(e, t, n) {
  if (t.tilstand !== 4) {
    if (!t.leveret) {
      if (n < t.slut) {
        return;
      }
      if (t.leveret = true, t.slut = 0, !Kl(t.f)) {
        const r = e.reder.find((l) => l.sev === t.sev);
        if (r) {
          r.sev = -1;
          r.f = -1;
        }
      }
      t.poof = e.film(e.Z.sevaerdighed.byg[2]);
      if (t.poof) {
        t.poof.advance(0);
      }
      en(e, t, 1);
      e.lyde.push(e.Z.lyde.faerdig);
      return;
    }
    t.naeste = 1;
    En(e, t, 3);
    t.tilstand = 4;
    e.lyde.push(e.Z.dyr.lyd[t.type]);
  }
}
export function tk(e, t) {
  const n = e.bod.plads, r = t % 2 === 0;
  return { x: (r ? n.x[0] : n.x[1]) + Math.trunc(t / 2) * n.dx, y: r ? n.y[0] : n.y[1] };
}
export const Zo = (e, t) => e.varer.find((n) => n.bod === t) || null, Zi = (e, t) => e.regler.boder[t], Ul = (e, t, n) => e.regler.varer[t] && e.regler.varer[t][n], nk = (e, t, n) => e.varer.filter((r) => r.bod < 0 && r.type === t && r.f === n).length, Qv = (e, t) => {
  const n = Zo(e, t);
  return n ? Ul(e.Z, n.type, n.f).udbetalingstid : 0;
};
export function rk(e, t, n, r, l) {
  const i = e.boder[n];
  return !i || i.type !== 0 || !Zi(e.Z, r) ? false : i0(e, Vv(e.Z, r)) ? "laast" : or(e, t, Zi(e.Z, r).pris) ? (Object.assign(i, { type: r, bygger: true, slut: l + Zi(e.Z, r).byggetid }), Zo(e, n) || e.varer.push({ bod: n, type: r, f: 0 }), e.lyde.push(e.Z.lyde.byg), true) : "penge";
}
export function lk(e, t, n) {
  const r = e.boder[t];
  if (!r || !r.bygger || n <= r.slut) {
    return false;
  }
  r.bygger = false;
  r.slut = n + Qv(e, t);
  e.lyde.push(e.Z.lyde.faerdig);
  return true;
}
export const Zv = (e, t) => t > e.slut;
export function ik(e, t, n, r) {
  const l = e.boder[n], i = Zo(e, n);
  if (!l || l.bygger || !i || !Zv(l, r)) {
    return 0;
  }
  const o = Ul(e.Z, i.type, i.f);
  t.faa(o.udbetaling);
  l.slut = r + o.udbetalingstid;
  return o.udbetaling;
}
export function ok(e, t, n, r, l) {
  const i = e.boder[n];
  if (!i || i.type < 1) {
    return false;
  }
  const o = Zo(e, n);
  if (o && o.f === r) {
    return false;
  }
  const s = e.varer.find((a) => a.bod < 0 && a.type === i.type && a.f === r);
  if (!s) {
    const a = Ul(e.Z, i.type, r);
    if (!a || !or(e, t, a.pris)) {
      return "penge";
    }
  }
  if (o) {
    o.bod = -1;
  }
  if (s) {
    s.bod = n;
  } else {
    e.varer.push({ bod: n, type: i.type, f: r });
  }
  i.slut = l + Ul(e.Z, i.type, r).udbetalingstid;
  e.lyde.push(e.Z.lyde.byg);
  return true;
}
const d0 = (e) => e.grunde - 1;
function Xv(e) {
  const t = e.Z.gaester, n = t.film[randomInt(0, t.film.length - 1)];
  return { filmId: n[randomInt(0, n.length - 1)], spiller: null, raekke: randomInt(0, 1), x: randomInt(0, tf(e)), venstre: randomInt(0, 1) === 0 };
}
function Jv(e) {
  if (e.gaester.length) {
    return;
  }
  const t = Math.min(8 * d0(e), 64);
  for (let n = 0; n < t; n++) {
    e.gaester.push(Xv(e));
  }
}
function qv(e, t) {
  const n = Math.min(e.Z.gaester.maks, Math.trunc(e.Z.gaester.fart * Lo / 1e3));
  if (t.venstre) {
    t.x -= n;
    if (t.x < 0) {
      t.venstre = false;
    }
  } else {
    t.x += n;
    if (t.x > tf(e)) {
      t.venstre = true;
    }
  }
}
function e1(e) {
  const t = e.Z.balloner, n = randomInt(0, t.film.length - 1);
  return { farve: n, film: 0, filmId: t.film[n][0], spiller: null, raekke: randomInt(0, 1), x: randomInt(t.xMin, tf(e)) };
}
export const sk = (e, t) => ({ x: t.x, y: e.Z.balloner.y[t.raekke] });
function t1(e, t) {
  t = Math.floor(t);
  if (!(t <= e.ballonTid)) {
    e.ballonTid = t + e.Z.balloner.spawn;
    if (e.balloner.length < 2 + Math.trunc((d0(e) + 1) / 2)) {
      e.balloner.push(e1(e));
    }
  }
}
export const ak = (e) => e.film === 0;
export function uk(e, t, n) {
  const r = e.Z.balloner, l = randomInt(0, r.lyde.length - 1);
  e.lyde.push(r.lyde[l][randomInt(0, r.lyde[l].length - 1)]);
  n.film = l + 1;
  n.filmId = r.film[n.farve][n.film];
  n.spiller = e.film(n.filmId);
  if (n.spiller) {
    n.spiller.advance(0);
  }
  const i = l0(e), o = Math.trunc(e.Z.regler.ballonVariabel * i / (i + 10) + 1);
  t.faa(o);
  return o;
}
export function fk(e) {
  e.gaester = [];
  e.balloner = [];
}
export const ed = (e) => e.grunde < e.Z.regler.grunde.length, n1 = (e) => e.Z.regler.grunde[e.grunde] || null, r1 = (e, t) => e.lotSlut - t >= 1;
export function ck(e, t, n) {
  const r = n1(e);
  return !r || r1(e, n) ? false : or(e, t, r.pris) ? (e.grunde += 1, e.lotSlut = n + r.byggetid, e.lyde.push(e.Z.lyde.byg), true) : "penge";
}
function l1(e, t) {
  const n = e.lotSlut - t;
  if (e.lotFilm === 0 && n >= 1) {
    e.lotFilm = 1;
  } else if (e.lotFilm === 1 && n <= 0) {
    qu(e, t);
    e.lotFilm = ed(e) ? 0 : 2;
  } else if (!ed(e) && e.lotFilm === 0) {
    e.lotFilm = 2;
  }
}
function i1(e, t) {
  for (const n of [...e.sev, ...e.boder]) {
    if (!n.klar && t > n.slut) {
      n.klar = true;
      n.alfa.mod(255);
    } else if (n.klar && t <= n.slut) {
      n.klar = false;
      n.alfa.mod(0);
    }
    n.alfa.trin();
  }
  for (const n of e.dyr) {
    n.alfa.mod(e.sev[n.sev].bygger ? 0 : 255);
    n.alfa.trin();
    if (n.leveret && !n.spiller) {
      n.spiller = e.film(n.filmId);
      if (n.spiller) {
        n.spiller.advance(0);
      }
    }
    Yv(e, n);
  }
  l1(e, t);
  t1(e, t);
  for (const n of [...e.balloner]) {
    if (n.film > 0 && (!n.spiller || n.spiller.finished)) {
      e.balloner.splice(e.balloner.indexOf(n), 1);
    }
  }
  Jv(e);
  for (const n of e.gaester) {
    qv(e, n);
  }
  for (const n of [...e.gaester, ...e.balloner]) {
    if (!n.spiller) {
      n.spiller = e.film(n.filmId);
      if (n.spiller) {
        n.spiller.advance(0);
      }
    }
  }
}
export function dk(e, t, n) {
  for (const r of e.dyr) {
    if (r.spiller) {
      r.spiller.advance(t);
    }
    if (r.poof) {
      r.poof.advance(t);
      if (r.poof.finished) {
        r.poof = null;
      }
    }
  }
  for (const r of [...e.gaester, ...e.balloner]) {
    if (r.spiller) {
      r.spiller.advance(t);
    }
  }
  for (e.rest += Math.min(t, 250); e.rest >= Lo;) {
    e.rest -= Lo;
    i1(e, n);
  }
}
