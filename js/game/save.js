import { createFloorFurniture } from './furniture-and-kitchen.js';
export const TUTORIALS_SEEN_KEY = "vejledninger-set-v1", readTutorialsSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(TUTORIALS_SEEN_KEY)) || {};
  }
  catch {
    return {};
  }
}, tutorials = { har(e) {
    return !!readTutorialsSeen()[e];
  }, saet(e) {
    const t = readTutorialsSeen();
    t[e] = true;
    try {
      localStorage.setItem(TUTORIALS_SEEN_KEY, JSON.stringify(t));
    }
    catch {
    }
  } }, SAVE_KEY = "stjernehotellet-gemt-v1", m1 = (e, t) => ({ nr: t.dyr.nr, navn: t.dyr.navn, point: t.dyr.point, klarRest: Math.max(0, t.dyr.klarTid - e.tid), varer: t.varer.map((n) => ({ type: n.type, f: n.f, rest: n.rest })) }), y1 = (e, t) => ({ type: t.type, status: t.status, byggeTid: t.byggeTid, moebler: t.moebler, ...t.cafe ? { cafe: t.cafe } : {}, ...t.kaeledyr ? { kaeledyr: m1(e, t.kaeledyr) } : t.kaeledyrGemt ? { kaeledyr: t.kaeledyrGemt } : {} });
export function serializeHotel(e) {
  const t = { penge: e.penge, hentet: e.hentet, tid: e.tid, musik: e.musik, bedrifter: e.bedrifter || [], pengeskab: e.pengeskab || [], etager: e.etager.map((n) => y1(e, n)), kendte: e.etager.flatMap((n) => n.gaester).filter((n) => n.vip != null && n.fase !== "ud").map((n) => ({ vip: n.vip, etage: n.til, rest: n.fase === "ophold" ? Math.max(0, n.opholdTid) : null })) };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(t));
  }
  catch {
  }
}
export function deserializeHotel(e) {
  let t;
  try {
    t = JSON.parse(localStorage.getItem(SAVE_KEY));
  }
  catch {
    t = null;
  }
  if (!t || !Array.isArray(t.etager) || !t.etager.length) {
    return false;
  }
  e.penge = t.penge ?? e.penge;
  e.hentet = t.hentet ?? e.hentet;
  e.tid = t.tid ?? e.tid;
  if (t.musik !== void 0) {
    e.musik = t.musik;
  }
  if (Array.isArray(t.bedrifter)) {
    e.bedrifter = t.bedrifter;
  }
  if (Array.isArray(t.pengeskab)) {
    e.pengeskab = t.pengeskab;
  }
  if (Array.isArray(t.kendte) && t.kendte.length) {
    e.kendteGemt = t.kendte;
  }
  e.etager = t.etager.map((n, r) => {
    const l = [...n.moebler || []], i = createFloorFurniture(n.type).map((h) => {
      const m = l.findIndex((v) => v && v.type === h.type);
      if (m < 0) {
        return h;
      }
      const g = l[m];
      l[m] = null;
      return { ...g, x: h.x, y: h.y, fast: h.fast, iBrug: false };
    }), { naeste: o, paaVej: s, kaeledyr: a, ...u } = n;
    return { ...u, gaester: [], moebler: i, ...a ? { kaeledyrGemt: a } : {} };
  });
  return true;
}
const ALL_STORAGE_KEYS = [SAVE_KEY, "zoo-gemt-v1", "zoo-gemt-v2", "popstars-gem-v1", "platform-naaet-v1", "vejledninger-set-v1"];
export function clearAllSavedData() {
  for (const e of ALL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(e);
    }
    catch {
    }
  }
}
