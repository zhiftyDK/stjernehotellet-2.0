import { Tween } from '../engine/tween.js';
import { addMoney } from './furniture-and-kitchen.js';
const GIFT_COIN_VALUE = 25, Os = 33, randomInt = (e, t) => e + Math.floor(Math.random() * (t - e + 1)), hopCurve = (e) => Array.from({ length: e }, (t, n) => n === e - 1 ? 0 : 1 - (-1 + 2 * n / (e - 1)) ** 2), maxGifts = (e) => Math.trunc((e.etager.length + 2) / 3);
function spawnGift(e, t) {
  const n = e.data.gave, r = e.data.verdensBredde;
  e.gaveId = (e.gaveId || 0) + 1;
  const l = randomInt(0, n.skins[0].length - 1);
  e.gaver.push({ id: e.gaveId, etage: t, i: l, x: e.data.etage.x + randomInt(Math.trunc(r / 16), Math.trunc(r / 2)), start: randomInt(0, n.maksTick), hop: n.hop.n, hopAcc: 0, alfa: new Tween(255, n.alfaBilleder), aabnet: false, aabnTid: 0 });
}
export function giftHopScale(e, t) {
  const n = e.data.gave, r = hopCurve(n.hop.n);
  return 1 + (t.hop < n.hop.n ? r[t.hop] * n.hop.styrke : 0);
}
export function updateGifts(e) {
  const t = e.data.gave;
  if (!t) {
    return;
  }
  if (!e.gaver) {
    Object.assign(e, { gaver: [], gaveTid: 0, gaveNulstil: 0, gaverAktive: 0, gaverKommet: 0 });
  }
  const n = maxGifts(e);
  e.gaveTid -= Os;
  if (e.gaveTid < 0) {
    if (e.gaverAktive < n && e.gaverKommet < n) {
      spawnGift(e, randomInt(0, Math.max(0, e.etager.length - 2)));
      e.gaverAktive++;
      e.gaverKommet++;
    }
    e.gaveTid = t.hver;
  }
  e.gaveNulstil -= Os;
  if (e.gaveNulstil < 0) {
    e.gaverKommet = e.gaverAktive;
    e.gaveNulstil = t.nulstil;
  }
  const r = e.filmTid && e.filmTid.get(t.aabn[0][0]) || 0;
  for (const l of [...e.gaver]) {
    if (l.hop < t.hop.n) {
      l.hop++;
    }
    l.alfa.trin();
    if (l.aabnet) {
      l.aabnTid += Os;
      if (l.alfa.v <= 4 && l.aabnTid >= r) {
        e.gaver.splice(e.gaver.indexOf(l), 1);
      }
    }
  }
}
export function openGift(e, t) {
  if (t.aabnet) {
    return 0;
  }
  t.aabnet = true;
  t.hop = 0;
  t.alfa.mod(0);
  e.gaverAktive = Math.max(0, e.gaverAktive - 1);
  e.gaveNulstil = e.data.gave.nulstil;
  addMoney(e, GIFT_COIN_VALUE);
  e.hentet += GIFT_COIN_VALUE;
  return GIFT_COIN_VALUE;
}
