import { bg, $l, createPetEntry, awardPetAchievements, updatePet } from './pets.js';
import { createFloorFurniture, createRestaurant, plateSlotPosition, sellPortion, br, addMoney, updateRestaurant, tickFurnitureDeliveries, kitchenLevel, isCookIncomeReady, maxStovesForLevel, maxTableForLevel, dishInfo } from './furniture-and-kitchen.js';
import { pointLevel, drawSpriteFrame, getAnimationBounds, drawAnimation } from '../render/canvas-helpers.js';
import { Tween, AcceleratingValue, FRAME_MS } from '../engine/tween.js';
import { updateGifts } from './gifts.js';
import { AnimationPlayer } from '../engine/animation.js';
export const Qg = (e) => bg[e] || 0, randomInt = (e, t) => e + Math.floor(Math.random() * (t - e + 1)), FLOOR_TYPES = { 2: { pris: 0, leje: 24 }, 3: { pris: 200, leje: 32 }, 10: { pris: 2400, leje: 72 }, 4: { pris: 800, leje: 44 }, 9: { pris: 350, leje: 0 }, 5: { pris: 1200, leje: 52 }, 6: { pris: 1e3, leje: 48 }, 8: { pris: 0, leje: 0 } }, newFloorPrice = (e) => 200 + (e - 1) * 150, BUILD_TIME_MS = 12e3, bh = 9, createFloor = (e, t) => ({ type: e, status: t, byggeTid: t === "bygger" ? BUILD_TIME_MS : 0, gaester: [], moebler: createFloorFurniture(e), ...e === bh ? { cafe: createRestaurant() } : {} });
export function createHotel(e, t, n) {
  return { data: e, kat: t, C: n, penge: 500, tid: 0, rest: 0, etager: e.start.map((r) => createFloor(r, "faerdig")), kam: { x: 0, y: 0 }, hentet: 0, gaestTid: 0, lyde: [] };
}
export const hotelHeight = (e) => (e.etager.length + e.data.ekstraEtager) * e.data.etage.hoejde, floorTopY = (e, t) => hotelHeight(e) - e.data.etage.foersteY - (t - 1) * e.data.etage.hoejde, kn = (e, t) => floorTopY(e, t) - e.data.etage.hoejde, floorSprite = (e, t) => e.data.moduler[t.status === "bygger" ? e.data.byggeplads : t.type].sprite;
export function qg(e, t) {
  const n = FLOOR_TYPES[t];
  if (!n) {
    return false;
  }
  const r = newFloorPrice(e.etager.length) + n.pris;
  if (e.penge < r) {
    return false;
  }
  e.penge -= r;
  e.etager.push(createFloor(t, "bygger"));
  e.kam.y += e.data.etage.hoejde;
  return true;
}
export const Dh = (e, t) => newFloorPrice(e.etager.length) + FLOOR_TYPES[$l].pris + Qg(t);
export function ev(e, t) {
  const n = Dh(e, t);
  if (!e.kd || e.penge < n) {
    return false;
  }
  e.penge -= n;
  const r = createFloor($l, "bygger");
  r.kaeledyr = createPetEntry(e, t);
  e.etager.push(r);
  e.kam.y += e.data.etage.hoejde;
  return true;
}
const Ah = 4, Oh = { 0: [2], 3: [7], 18: [7], 1: [4], 5: [4], 9: [5], 10: [5], 12: [6], 13: [6], 8: [3], 11: [3] }, Kc = [18e4, 3e5];
function rn(e, t, n, r) {
  n.anim = r;
  n.animTid = 0;
  n.loeft.mod(r === 2 ? e.data.gaest.sidY : 0);
  if (r === 2 || r === 7) {
    n.spejl = false;
  } else if (r === 4) {
    n.spejl = true;
  }
  if (r === 7) {
    t.aktiv = (t.aktiv || 0) + 1;
  }
}
function zh(e, t) {
  if (t.moebel >= 0 && e.moebler[t.moebel]) {
    e.moebler[t.moebel].iBrug = false;
  }
  t.moebel = -1;
}
export const $h = (e, t) => t.vip != null ? e.data.vip.film[t.vip] : e.data.gaesterAnims[t.art], tv = (e, t) => {
  const n = $h(e, t)[t.anim], r = e.filmTid && e.filmTid.get(n) || 1e3;
  return t.animTid >= r;
}, Fh = (e, t) => t.alfa.v < 255 ? 0 : Math.min(16, Math.trunc(e.data.gaest.fart * TICK_MS / 1e3));
function nv(e, t, n) {
  const r = e.data, l = r.gaest;
  if (n.animTid += TICK_MS, n.anim === 0) {
    if (n.venter >= 1) {
      rn(e, t, n, n.venter);
      n.venter = -1;
      return;
    }
    if (n.vilSpise && t.cafe && randomInt(0, 200) === 0) {
      const i = t.cafe.paaBordet.filter((o) => o.flyt >= 1);
      if (!i.length) {
        return;
      }
      n.mad = i[randomInt(0, i.length - 1)];
      n.maal = plateSlotPosition(e.C, t.cafe.bord, n.mad.tallerken).x;
      n.venter = 8;
      rn(e, t, n, 1);
      return;
    }
    if (randomInt(0, 150) === 0) {
      n.maal = r.doerDx + randomInt(0, r.etage.bredde);
      n.vilSpise = !!t.cafe;
      rn(e, t, n, 1);
      return;
    }
    if (randomInt(0, 150) === 0) {
      const i = l.handlinger.filter((u) => u !== 8), o = i[randomInt(0, i.length - 1)], s = t.moebler.map((u, h) => h).filter((u) => {
        const h = t.moebler[u];
        return !h.iBrug && h.feature >= 0 && (Oh[h.type] || []).includes(o);
      });
      if (!s.length) {
        return;
      }
      n.moebel = s[randomInt(0, s.length - 1)];
      t.moebler[n.moebel].iBrug = true;
      let a = t.moebler[n.moebel].x + (o === 2 || o === 4 ? l.sidX : 0);
      a = Math.max(r.doerDx, Math.min(r.doerDx + r.etage.bredde, a));
      n.maal = a;
      n.venter = o;
      rn(e, t, n, 1);
    }
    return;
  }
  if (n.anim === 1) {
    const i = n.maal - n.x;
    if (Math.abs(i) <= 3) {
      rn(e, t, n, 0);
      return;
    }
    n.spejl = i < 0;
    n.x += Math.sign(i) * Math.min(Fh(e, n), Math.abs(i));
    return;
  }
  if (tv(e, n)) {
    if (n.anim === 8 && t.cafe) {
      sellPortion(e, t.cafe, n.mad);
    }
    n.mad = null;
    zh(t, n);
    rn(e, t, n, 0);
  }
}
const Vi = (e) => {
  e.doer = (e.doer || 0) + 1;
}, allGuests = (e) => e.etager.flatMap((t) => t.gaester), isGuestInside = (e) => e.fase === "ind" || e.fase === "ophold", floorCapacity = (e, t) => t && t.status === "faerdig" && t.type >= 2 && t.type !== e.data.lobby && t.type !== $l ? Ah : 0, guestsHeadingToFloor = (e, t) => allGuests(e).filter((n) => n.til === t && isGuestInside(n)).length, freeRooms = (e) => e.etager.reduce((t, n, r) => t + floorCapacity(e, n) - guestsHeadingToFloor(e, r), 0);
function rv(e) {
  const t = e.etager.map((n, r) => r).filter((n) => floorCapacity(e, e.etager[n]) > guestsHeadingToFloor(e, n));
  return t.length ? t[randomInt(0, t.length - 1)] : 0;
}
function lv(e) {
  const t = e.data.gaest.typer, n = t[Math.min(pointLevel(e.hentet).antal, t.length - 1)];
  let r = randomInt(0, 99);
  for (let l = 0; l < n.length; l++) {
    if (r -= n[l], r < 1) {
      return l;
    }
  }
  return 0;
}
const Kh = (e) => e.data.doerDx + e.data.verdensBredde + e.data.gaest.bredde;
function $a(e, t, n = null) {
  const r = e.data.gaest, l = lv(e), i = r.varianter[l] || [l];
  e.gaestId = (e.gaestId || 0) + 1;
  const o = { id: e.gaestId, art: i[randomInt(0, i.length - 1)], vip: n, til: rv(e), fase: "ind", x: Kh(e) + Math.trunc(r.fart * t / 1e3), anim: 1, animTid: 0, spejl: true, venter: -1, moebel: -1, iElevator: false, alfa: new Tween(0, r.alfaBilleder), loeft: new Tween(0, r.loeftBilleder) };
  o.alfa.mod(255);
  e.etager[0].gaester.push(o);
  return o;
}
function iv(e) {
  const t = e.data.gaest;
  if (e.gaestTid -= TICK_MS, e.gaestTid > 0) {
    return;
  }
  if (e.gaestTid = t.bestilHver, e.vipVenter != null) {
    if (freeRooms(e) >= 1) {
      $a(e, 0, e.vipVenter);
      e.vipVenter = null;
    }
    return;
  }
  const n = Ah * e.etager.length, r = allGuests(e).filter(isGuestInside).length;
  if (r >= n) {
    return;
  }
  const l = Math.min(n - r - 1, t.hoejstPrBestilling, freeRooms(e) - 1);
  for (let i = 0; i < l; i++) {
    $a(e, i * t.bestilHver);
  }
}
function Uh(e, t, n, r) {
  n.gaester.splice(n.gaester.indexOf(t), 1);
  e.etager[r].gaester.push(t);
}
function Vh(e, t, n, r) {
  const l = e.data;
  r.iElevator = false;
  r.alfa.mod(255);
  r.loeft.mod(0);
  const i = e.etager[r.til];
  if (!i || i.status !== "faerdig") {
    r.fase = "ud";
    r.spejl = false;
    return;
  }
  if (n !== r.til) {
    Uh(e, r, t, r.til);
    Vi(i);
  }
  Object.assign(r, { fase: "ophold", venter: 1, maal: l.doerDx + randomInt(0, l.etage.bredde), opholdTid: randomInt(Kc[0], Kc[1]), vilSpise: !!i.cafe, betaler: FLOOR_TYPES[i.type] ? FLOOR_TYPES[i.type].leje : 0 });
  if (r.vip != null) {
    Object.assign(r, { opholdTid: VIP_TIERS[r.vip].tid, betaler: VIP_TIERS[r.vip].betaling });
  }
  rn(e, i, r, 0);
}
function ov(e, t, n, r) {
  const l = e.data.gaest;
  if (r.alfa.trin(), r.loeft.trin(), r.fase === "ophold") {
    r.opholdTid -= TICK_MS;
    nv(e, t, r);
    if (r.opholdTid <= 0 && !r.klar) {
      r.klar = true;
    }
    return;
  }
  r.animTid += TICK_MS;
  const i = Fh(e, r);
  if (r.fase === "ind") {
    if (r.x > br) {
      r.spejl = true;
      r.x -= i;
      return;
    }
    if (!r.iElevator && n !== r.til) {
      r.iElevator = true;
      r.alfa.mod(0);
      r.loeft.mod(l.elevatorLoeft);
      Vi(t);
      return;
    }
    if (r.alfa.v > 0 && (r.iElevator || n !== r.til)) {
      return;
    }
    Vh(e, t, n, r);
    return;
  }
  if (r.fase === "hjem") {
    if (r.x < br ? !r.spejl : r.spejl) {
      r.spejl = r.x > br;
      r.x += r.spejl ? -i : i;
      return;
    }
    if (!r.iElevator) {
      r.iElevator = true;
      r.alfa.mod(0);
      r.loeft.mod(l.elevatorLoeft);
      Vi(t);
      return;
    }
    if (r.alfa.v > 0) {
      return;
    }
    r.iElevator = false;
    r.alfa.mod(255);
    r.loeft.mod(0);
    if (n !== 0) {
      Uh(e, r, t, 0);
      Vi(e.etager[0]);
    }
    r.fase = "ud";
    return;
  }
  if (r.spejl = false, r.x > Kh(e)) {
    t.gaester.splice(t.gaester.indexOf(r), 1);
    return;
  }
  r.x += i;
}
const TICK_MS = 33;
export function sv(e, t, n) {
  if (n.klar) {
    n.klar = false;
    return n.vip != null ? (n.opholdTid = VIP_TIERS[n.vip].tid, addMoney(e, n.betaler), e.hentet += n.betaler, n.betaler) : (zh(t, n), addMoney(e, n.betaler), e.hentet += n.betaler, Object.assign(n, { fase: "hjem", venter: -1 }), rn(e, t, n, 1), n.spejl = n.x > br, n.betaler);
  }
  return 0;
}
export function av(e, t, n) {
  if (n.fase !== "ophold" || n.klar) {
    return false;
  }
  n.spejl = false;
  if (n.venter < 0) {
    rn(e, t, n, 3);
  }
  return n.vip != null ? (n.visTil = e.tid + e.data.vip.visTid * 1e3, true) : false;
}
export const VIP_TIERS = Array.from({ length: 13 }, (e, t) => ({ pris: 500 + 300 * t, betaling: 60 + 40 * t, tid: (120 + 30 * t) * 1e3 })), isVipStaying = (e, t) => allGuests(e).some((n) => n.vip === t);
export function vipStatus(e, t) {
  return isVipStaying(e, t) ? "bor" : e.vipVenter != null ? "venter" : e.penge < VIP_TIERS[t].pris ? "penge" : freeRooms(e) < 1 ? "plads" : (e.penge -= VIP_TIERS[t].pris, e.vipVenter = t, e.gaestTid = 0, true);
}
function fv(e, t, n) {
  const r = e.data, l = t.kaeledyr && t.kaeledyr.dyr;
  if (!l || !e.kd) {
    return false;
  }
  const i = r.etage.x + e.kd.dyr.gulvDx + l.x - e.kam.x, o = kn(e, n) + e.kd.dyr.gulvDy - e.kam.y;
  return i > -100 && i < r.skaerm.bredde + 100 && o > -50 && o < r.skaerm.hoejde + 150;
}
function cv(e, t) {
  const n = t.kaeledyrGemt;
  if (t.kaeledyrGemt = null, !e.kd.dyr.film[n.nr]) {
    return;
  }
  const r = createPetEntry(e, n.nr);
  if (n.navn) {
    r.dyr.navn = n.navn;
  }
  r.dyr.point = n.point || 0;
  r.dyr.klarTid = e.tid + Math.max(0, n.klarRest || 0);
  r.varer = (n.varer || []).filter((l) => l.rest > 0).map((l) => ({ type: l.type, f: l.f, rest: l.rest, aktiv: false }));
  t.kaeledyr = r;
}
function dv(e) {
  const t = e.kendteGemt;
  e.kendteGemt = null;
  for (const n of t) {
    if (n.vip == null || !VIP_TIERS[n.vip] || isVipStaying(e, n.vip)) {
      continue;
    }
    const r = e.etager[n.etage];
    if (!r || floorCapacity(e, r) <= guestsHeadingToFloor(e, n.etage)) {
      continue;
    }
    const l = $a(e, 0, n.vip);
    l.til = n.etage;
    l.x = br;
    l.alfa.saet(255);
    Vh(e, e.etager[0], 0, l);
    if (l.fase === "ophold") {
      l.opholdTid = Math.max(0, n.rest ?? l.opholdTid);
    }
  }
}
function tickHotel(e) {
  e.tid += TICK_MS;
  if (e.kendteGemt) {
    dv(e);
  }
  e.bedriftTid = (e.bedriftTid || 0) - TICK_MS;
  if (e.bedriftTid <= 0) {
    e.bedriftTid = 1e3;
    awardPetAchievements(e);
  }
  updateGifts(e);
  iv(e);
  const t = e.etager.flatMap((n, r) => n.gaester.map((l) => [n, r, l]));
  e.etager.forEach((n, r) => {
    if (n.status === "bygger") {
      n.byggeTid -= TICK_MS;
      if (n.byggeTid <= 0) {
        n.status = "faerdig";
        n.byggeTid = 0;
      }
      return;
    }
    if (n.cafe) {
      updateRestaurant(e.C, n.cafe, TICK_MS);
    }
    if (n.kaeledyrGemt && e.kd) {
      cv(e, n);
    }
    if (n.kaeledyr) {
      updatePet(e, n, Oh, fv(e, n, r));
    }
  });
  for (const [n, r, l] of t) {
    ov(e, n, r, l);
  }
}
export function advanceHotel(e, t) {
  for (e.rest += Math.min(250, t); e.rest >= TICK_MS;) {
    e.rest -= TICK_MS;
    tickHotel(e);
    tickFurnitureDeliveries(e, TICK_MS);
  }
}
export function Hi(e, t, n, r, l, i, o, s = 1) {
  const a = t.sprites[r], u = a && n[a.assetId];
  if (!(!u || s <= 0)) {
    e.save();
    e.translate(l, i);
    e.scale(o, o);
    drawSpriteFrame(e, u, a, s);
    e.restore();
  }
}
export function Hh(e, t, n, r) {
  let l = [];
  return { tilfoej(i, o = 640, s = 384) {
      const a = e.effekt, u = Math.trunc(a.tid / 33), h = { beloeb: i, tid: 0, acc: 0, x: new Tween(o, u), y: new Tween(s, u), alfa: new AcceleratingValue(a.alfa[0], a.maks, Math.trunc(a.tid / 100)), skala: new AcceleratingValue(a.skala[0], a.maks, Math.trunc(a.tid / 100)) };
      h.y.mod(s + a.dy);
      h.alfa.maal = a.alfa[1];
      h.skala.maal = a.skala[1];
      l.push(h);
    }, fremad(i) {
      const o = e.effekt;
      l = l.filter((s) => {
        for (s.acc += i; s.acc >= FRAME_MS;) {
          s.acc -= FRAME_MS;
          s.x.trin();
          s.y.trin();
          s.alfa.trin();
          s.skala.trin();
        }
        s.tid += i;
        return s.tid <= o.tid;
      });
    }, tegn(i) {
      const o = e.effekt;
      for (const s of l) {
        const a = s.skala.v / 256, u = e.billede + Math.floor(s.tid / (1e3 / e.hudFps)) % e.antal;
        Hi(i, t, n, u, s.x.v, s.y.v, a, Math.min(255, s.alfa.v + 128) / 255);
        r.tegn(i, String(s.beloeb), s.x.v + o.tekstDx, s.y.v + o.tekstDy, { font: 3, str: 57 * a, alfa: Math.max(0, s.alfa.v) / 255 });
      }
    }, get antal() {
      return l.length;
    } };
}
const mv = new Set([0, 1, 3, 5, 8, 9, 10, 11, 15, 18]), Uc = new Set([2]), yv = 60;
export function gv(e) {
  const t = new Map();
  return (n, r) => {
    if (!mv.has(n) && !Uc.has(n)) {
      return 0;
    }
    if (t.has(r)) {
      return t.get(r);
    }
    const l = e.anims.get(r);
    if (!l) {
      return 0;
    }
    const i = new AnimationPlayer(l);
    i.advance(0);
    for (const c of i.drawList("invers")) {
      const p = e.M.sprites[c.sprite];
      if (p && !e.T.I[p.assetId]) {
        return 0;
      }
    }
    const o = getAnimationBounds(e.M, i);
    if (!o) {
      t.set(r, 0);
      return 0;
    }
    const s = Math.ceil(o.x1 - o.x0) + 2, a = Math.ceil(o.y1 - o.y0) + 2, u = document.createElement("canvas");
    u.width = s;
    u.height = a;
    const h = u.getContext("2d", { willReadFrequently: true });
    drawAnimation(h, e.M, e.T.I, i, -o.x0 + 1, -o.y0 + 1);
    const m = h.getImageData(0, 0, s, a).data, g = (c) => {
      for (let p = 0; p < s; p++) {
        if (m[(c * s + p) * 4 + 3] > yv) {
          return true;
        }
      }
      return false;
    };
    let v = 0;
    if (Uc.has(n)) {
      let c = 0;
      for (; c < a && !g(c);) {
        c++;
      }
      if (c < a) {
        v = -Math.round(c - 1 + o.y0);
      }
    } else {
      let c = a - 1;
      for (; c >= 0 && !g(c);) {
        c--;
      }
      if (c >= 0) {
        v = -Math.round(c - 1 + o.y0);
      }
    }
    t.set(r, v);
    return v;
  };
}
export function vv(e, t, n) {
  const r = new Map(t.animations.map((m) => [m.id, m])), l = new Map(), i = (m, g, v = 0) => {
    if (!l.has(m)) {
      const c = r.get(g), p = c ? new AnimationPlayer(c) : null;
      if (p) {
        p.advance(v);
      }
      l.set(m, p);
    }
    return l.get(m);
  }, o = new Map();
  let s = 0;
  const a = (m, g, v, c, p, k = 1) => {
    m.save();
    m.translate(v, c);
    m.scale(p, p);
    drawAnimation(m, t, n.I, g, 0, 0, false, k);
    m.restore();
  }, u = (m, g, v, c = 1) => {
    const p = getAnimationBounds(t, m);
    return p && { x0: g + p.x0 * c, y0: v + p.y0 * c, x1: g + p.x1 * c, y1: v + p.y1 * c };
  }, h = (m, g, v, c, p, k = 92) => {
    m.fillStyle = "rgba(20,14,26,.75)";
    m.fillRect(g - k / 2, v, k, 12);
    m.fillStyle = "#ffd46b";
    m.fillRect(g - k / 2 + 2, v + 2, (k - 4) * Math.max(0, Math.min(1, c)), 8);
    if (p) {
      m.font = "bold 22px system-ui, sans-serif";
      m.textAlign = "center";
      m.lineWidth = 4;
      m.strokeStyle = "rgba(20,14,26,.8)";
      m.fillStyle = "#fff";
      m.strokeText(p, g, v + 36);
      m.fillText(p, g, v + 36);
    }
  };
  return { fremad(m) {
      for (const g of l.values()) {
        if (g) {
          g.advance(m);
        }
      }
      for (s += Math.min(250, m); s >= 33;) {
        s -= 33;
        for (const g of o.values()) {
          if (g.film === 0 && Math.floor(Math.random() * (e.kok.skift + 1)) === 0) {
            g.film = 1 + Math.floor(Math.random() * (e.kok.film[g.kok].length - 1));
            g.spiller = new AnimationPlayer(r.get(e.kok.film[g.kok][g.film]));
            g.spiller.advance(0);
          }
        }
      }
      for (const g of o.values()) {
        if (g.film !== 0) {
          g.spiller.advance(m);
          if (g.spiller.finished) {
            g.film = 0;
          }
        }
      }
    }, tegn(m, g, v, c, p, k, d = null) {
      const f = g.cafe, y = kitchenLevel(f.tjent);
      if (d && isCookIncomeReady(f)) {
        d(c + e.kok.x, p + e.kok.y);
      }
      let w = o.get(v);
      if (!w || w.kok !== f.kok) {
        w = { kok: f.kok, film: 0, spiller: null };
        o.set(v, w);
      }
      const S = w.film === 0 ? i(`kok-${f.kok}`, e.kok.film[f.kok][0]) : w.spiller;
      a(m, S, c + e.kok.x, p + e.kok.y, e.kok.skala);
      const P = u(S, c + e.kok.x, p + e.kok.y, e.kok.skala);
      if (P) {
        k.push({ ...P, nr: v, art: "kok" });
      }
      const M = f.komfurer.length, E = Math.min(e.komfur.max, M < maxStovesForLevel(y) ? M + 1 : M), N = Array.from({ length: E }, (V, K) => K).sort((V, K) => e.komfur.x[V] - e.komfur.x[K]);
      for (const V of N) {
        const K = c + e.komfur.x[V], W = p + e.komfur.y, ae = V < M && f.komfurer[V].mad && f.komfurer[V].mad.tilstand === 2, j = i(`komfur-${ae ? 1 : 0}`, e.komfur.film[ae ? 1 : 0]);
        drawAnimation(m, t, n.I, j, K, W, false, V < M ? 1 : 0.4);
        const _ = u(j, K, W);
        if (V >= M) {
          drawAnimation(m, t, n.I, i("pil", e.komfur.pil), K - 24, W - 43);
          if (_) {
            k.push({ ..._, nr: v, art: "nytKomfur" });
          }
        } else if (_) {
          k.push({ ..._, nr: v, art: "komfur", i: V });
        }
      }
      const C = c + e.bord.x, I = p + e.bord.y, O = i(`bord-${f.bord}`, e.bord.film[f.bord]);
      drawAnimation(m, t, n.I, O, C, I);
      const F = u(O, C, I);
      if (F) {
        k.push({ ...F, nr: v, art: "bord" });
      }
      if (maxTableForLevel(y) > f.bord && F) {
        drawAnimation(m, t, n.I, i("pil", e.komfur.pil), F.x1 - 20, F.y0 + 10);
      }
      f.komfurer.forEach((V, K) => {
        const W = V.mad;
        if (!W) {
          return;
        }
        const ae = [e.mad.ingrediens1, e.mad.ingrediens2, e.mad.koger, e.mad.faerdig][W.tilstand][W.ret], j = c + e.komfur.x[K], _ = p + e.komfur.y + e.komfur.madDy, x = i(`mad-${ae}`, ae);
        drawAnimation(m, t, n.I, x, j, _);
        const T = u(x, j, _);
        if (T && k.push({ ...T, nr: v, art: "mad", i: K }), W.tilstand === 2) {
          const R = dishInfo(W.ret);
          h(m, j, _ + 12, 1 - W.tid / R.tid, `${Math.ceil(W.tid / 1e3)} s`);
        }
      });
      for (const V of f.paaBordet) {
        const K = plateSlotPosition(e, f.bord, V.tallerken), W = c + e.komfur.x[V.fraKomfur], ae = p + e.komfur.y + e.komfur.madDy, j = c + K.x, _ = p + K.y, x = V.flyt, T = W + (j - W) * x, R = ae + (_ - ae) * x, z = e.mad.skalaKomfur + (e.mad.skalaBord - e.mad.skalaKomfur) * x, q = i(`salg-${V.ret}`, e.mad.salg[V.ret]);
        a(m, q, T, R, z);
        if (x >= 1) {
          h(m, T, R + 14, V.portioner / dishInfo(V.ret).portioner, null, 50);
        }
      }
    } };
}
