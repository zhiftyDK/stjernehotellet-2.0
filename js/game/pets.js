import { Tween } from '../engine/tween.js';
import { addMoney } from './furniture-and-kitchen.js';
export const $l = 8, Tr = 33, randomInt = (e, t) => e + Math.floor(Math.random() * (t - e + 1)), bg = [400, 400, 450, 450, 450, 600, 500, 700, 450, 800, 900, 350, 1200, 1e3], Lh = 12e4, Dg = [16, 32, 56, 88, 128], Ih = [0, 2, 4, 7, 10];
export function petItemStats(e, t) {
  const n = Math.floor(t / 10);
  return { pris: 2 * (15 + 5 * t + 10 * e), kvalitet: 1 + n, levetid: (15 + 15 * n) * 6e4, stjerner: Math.floor(t / 6), gruppe: zs[e] && zs[e][t] != null ? zs[e][t] : -1 };
}
const Nh = [20, 60, 120, 200, 300, 450, 650, 900, 1200, 1600], Fc = [50, 100, 200, 75, 150, 300, 100, 200, 500, 750, 1e3], zs = { 0: { 18: 4 }, 1: { 0: 3, 3: 0, 5: 1, 7: 7, 13: 1, 14: 2, 25: 5 }, 2: { 24: 4 } };
export function petLevel(e) {
  const t = Nh;
  let n = t.filter((l) => l < e).length;
  const r = t[t.length - 1];
  if (r < e) {
    n += Math.trunc((e - r) / (r - t[t.length - 2]));
  }
  return Math.min(99, n);
}
export const petTrophyLevel = (e) => Math.min(petLevel(e), 10);
function petLevelProgress(e) {
  const t = Nh, n = petLevel(e);
  if (n < t.length) {
    const l = n > 0 ? t[n - 1] : 0;
    return Math.max(0, Math.min(1, (e - l) / (t[n] - l)));
  }
  const r = t[t.length - 1] - t[t.length - 2];
  return (e - t[t.length - 1]) % r / r;
}
const Bc = 20;
function petAchievementFlags(e) {
  const t = e.etager.filter((s) => s.kaeledyr), n = t.length, r = t.filter((s) => petComfortLevel(e, s) >= Ih.length - 1).length, l = t.map((s) => petLevel(s.kaeledyr.dyr.point)), i = Math.max(0, ...l), o = l.filter((s) => s >= 10).length;
  return [n >= 1, n >= 2, n >= 4, r >= 1, r >= 2, r >= 4, i >= 3, i >= 5, i >= 10, o >= 2, o >= 4];
}
export function awardPetAchievements(e) {
  if (e.kd) {
    e.bedrifter = e.bedrifter || [];
    e.praemier = e.praemier || [];
    petAchievementFlags(e).forEach((t, n) => {
      if (!(!t || e.bedrifter.includes(Bc + n))) {
        e.bedrifter.push(Bc + n);
        e.penge += Fc[n];
        e.praemier.push({ i: n, beloeb: Fc[n] });
      }
    });
  }
}
const petData = (e) => e.kd.dyr, filmDurationMs = (e, t) => e.kd.film[t] ? e.kd.film[t][0] * 10 : 0, petAnimSet = (e, t) => petData(e).film[t.nr], petAnimFilm = (e, t, n) => petAnimSet(e, t).film[n];
function createPet(e, t) {
  const n = petData(e), r = n.film[t], l = n.navne[r.type] || [];
  return { nr: t, navn: l.length ? l[randomInt(0, l.length - 1)] : "", x: randomInt(Math.trunc(e.data.verdensBredde / 16), Math.trunc(e.data.verdensBredde / 2)), maal: 0, anim: 0, film: 0, animTid: 0, venter: -1, behov: -1, venstre: true, bod: -1, boble: { film: 0, tid: 0 }, hjerte: { vis: false, tid: 0 }, klar: false, klarTid: e.tid + Lh, point: 0, moentAlfa: new Tween(0, 30), animNr: 0, bjaelke: new Tween(0, 15) };
}
export const createPetStall = (e) => ({ type: e, film: 0, tid: 0, aktiv: false, nr: 0 }), createPetEntry = (e, t) => ({ dyr: createPet(e, t), boder: [0, 1, 2].map(createPetStall), varer: [] });
export function petComfortLevel(e, t) {
  if (!t.kaeledyr) {
    return 0;
  }
  const n = petAnimSet(e, t.kaeledyr.dyr).type, r = t.kaeledyr.varer.reduce((l, i) => {
    const o = petItemStats(i.type, i.f);
    return l + o.kvalitet + (o.gruppe === n ? 1 : 0);
  }, 0);
  return Math.max(0, Ih.filter((l) => l <= r).length - 1);
}
function setStallActive(e, t) {
  e.film = t ? 1 : 0;
  e.tid = 0;
  e.aktiv = t;
  e.nr++;
}
function deliverStall(e, t) {
  t.film = 2;
  t.tid = 0;
  t.aktiv = false;
  t.nr++;
  e.lyde.push(e.kd.boder.levering[t.type]);
}
const findPetItem = (e, t) => t >= 0 ? e.varer.find((n) => n.type === t) : null;
function setPetAnimation(e, t, n) {
  const r = t.dyr, l = petData(e).lyde;
  if (r.anim = n, r.film = n, r.animTid = 0, r.animNr++, n === 4 || n === 8 || n === 10) {
    if (n === 4) {
      e.lyde.push(l.spis[randomInt(0, l.spis.length - 1)]);
    } else if (n === 8) {
      e.lyde.push(l.bad);
    } else {
      e.lyde.push(l.leg);
      const i = findPetItem(t, r.bod);
      if (i) {
        r.film = 10 + i.f;
      }
    }
    if (t.boder[r.bod]) {
      setStallActive(t.boder[r.bod], true);
    }
    r.venstre = true;
  } else if (n === 9) {
    e.lyde.push(l.moebel);
  }
}
function findFurnitureForPet(e, t, n) {
  const r = e.moebler.filter((l) => l && !l.iBrug && l.feature >= 0 && (n[l.type] || []).includes(t));
  return r.length ? r[randomInt(0, r.length - 1)] : null;
}
function updatePetBehavior(e, t, n, r) {
  const l = petData(e), i = n.dyr;
  i.animTid += Tr;
  i.boble.tid += Tr;
  if (i.hjerte.vis) {
    i.hjerte.tid += Tr;
    if (i.hjerte.tid >= filmDurationMs(e, l.hjerte)) {
      i.hjerte.vis = false;
    }
  }
  const o = () => i.animTid >= filmDurationMs(e, petAnimFilm(e, i, i.film));
  switch (i.anim) {
    case 0: {
      if (i.venter >= 1) {
        if (i.venter === 4 || i.venter === 8 || i.venter === 10) {
          const s = findPetItem(n, i.bod);
          if (s) {
            s.aktiv = true;
            if (petItemStats(s.type, s.f).gruppe === petAnimSet(e, i).type) {
              i.hjerte = { vis: true, tid: 0 };
            }
          } else {
            i.venter = 6;
            i.boble = { film: n.boder[i.bod] ? n.boder[i.bod].type : 0, tid: 0 };
          }
        }
        setPetAnimation(e, n, i.venter);
        i.venter = -1;
        return;
      }
      if (randomInt(0, 150) === 0) {
        const s = l.tilfaeldige[randomInt(0, l.tilfaeldige.length - 1)];
        if (s === 1) {
          i.maal = randomInt(0, l.laengde);
        }
        setPetAnimation(e, n, s);
        return;
      }
      if (randomInt(0, 500) === 0) {
        const s = l.moebel[randomInt(0, l.moebel.length - 1)], a = findFurnitureForPet(t, l.moebelBit[s], r);
        if (!a) {
          return;
        }
        i.maal = Math.max(0, Math.min(l.laengde, a.x - l.gulvDx));
        i.venter = s;
        setPetAnimation(e, n, 1);
        return;
      }
      if (i.behov > -1 || randomInt(0, 150) === 0) {
        const s = i.behov > -1 ? i.behov : randomInt(0, l.boder.length - 1);
        if (i.behov = -1, !n.boder[s]) {
          return;
        }
        i.maal = Math.max(0, Math.min(l.laengde, Hg(e, s) - l.gulvDx + l.bodDx[s]));
        i.venter = l.boder[s];
        i.bod = s;
        setPetAnimation(e, n, 1);
      }
      return;
    }
    case 1: {
      const s = Math.min(16, Math.trunc(l.fart * Tr / 1e3));
      if (Math.abs(i.x - i.maal) <= 3) {
        setPetAnimation(e, n, 0);
        return;
      }
      i.venstre = i.x > i.maal;
      i.x += i.venstre ? -s : s;
      return;
    }
    case 2:
    case 3:
      if (o()) {
        setPetAnimation(e, n, i.venter >= 0 ? 1 : 0);
      }
      return;
    case 4:
    case 8:
    case 10:
      if (i.venstre = true, n.boder[i.bod] && n.boder[i.bod].aktiv) {
        return;
      }
      {
        const s = findPetItem(n, i.bod);
        if (s) {
          s.aktiv = false;
        }
      }
      setPetAnimation(e, n, 0);
      return;
    case 6:
      if (randomInt(0, 150) === 0) {
        setPetAnimation(e, n, 0);
      }
      return;
    case 7:
      if (randomInt(0, 150) === 0) {
        setPetAnimation(e, n, 2);
      }
      return;
    case 9:
      if (o()) {
        setPetAnimation(e, n, 0);
      }
      return;
  }
}
export const Bi = [125, 280, 824], $s = 311, Hg = (e, t) => Bi[t];
export function updatePet(e, t, n, r = true) {
  const l = t.kaeledyr;
  if (!l || !e.kd || t.status !== "faerdig") {
    return;
  }
  for (const o of l.boder) {
    o.tid += Tr;
    if (o.aktiv && o.tid >= filmDurationMs(e, e.kd.boder.film[1][o.type])) {
      setStallActive(o, false);
    }
  }
  l.varer = l.varer.filter((o) => (o.rest -= Tr) > 0);
  const i = l.dyr;
  i.moentAlfa.trin();
  i.bjaelke.mod(petLevelProgress(i.point));
  i.bjaelke.trin();
  if (r) {
    updatePetBehavior(e, t, l, n);
    if (!i.klar && e.tid >= i.klarTid) {
      i.klar = true;
      i.moentAlfa.mod(255);
    }
  }
}
export function collectPetReward(e, t) {
  const n = t.kaeledyr, r = n.dyr;
  if (e.tid < r.klarTid) {
    setPetAnimation(e, n, 3);
    const o = petData(e).lyde.goe[petAnimSet(e, r).type] || [], s = o[Math.min(petAnimSet(e, r).race, o.length - 1)];
    if (s) {
      e.lyde.push(s);
    }
    const a = findPetItem(n, r.bod);
    if (a) {
      a.aktiv = false;
    }
    return 0;
  }
  const l = Dg[petComfortLevel(e, t)], i = petTrophyLevel(r.point);
  addMoney(e, l);
  e.hentet += l;
  r.point += l;
  if (petTrophyLevel(r.point) > i) {
    e.lyde.push(e.kd.tavle.pokalLyd);
    e.nyPokal = true;
  }
  r.klar = false;
  r.moentAlfa.saet(0);
  r.klarTid = e.tid + Lh;
  return l;
}
export function buyPetItem(e, t, n, r) {
  const l = t.kaeledyr, i = petItemStats(n, r);
  if (e.penge < i.pris) {
    return false;
  }
  e.penge -= i.pris;
  const o = petComfortLevel(e, t);
  deliverStall(e, l.boder[n]);
  l.varer.push({ type: n, f: r, rest: i.levetid, aktiv: false });
  l.dyr.behov = n;
  return petComfortLevel(e, t) === o ? { script: "varenSamme" } : { script: "varenBedre", v0: i.gruppe === petAnimSet(e, l.dyr).type ? n + 1 : 0 };
}
