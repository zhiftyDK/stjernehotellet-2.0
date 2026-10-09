// Random gifts that pop up on hotel floors; the player taps them to collect GIFT_COIN_VALUE coins.
// Gift state lives on the hotel state: gaver (active gifts), gaveTid (ms until next spawn),
// gaveNulstil (ms until the "arrived" counter resets), gaverAktive / gaverKommet (counts).
import { Tween } from '../engine/tween.js';
import { addMoney } from './furniture-and-kitchen.js';
// Coins awarded for opening a gift.
const GIFT_COIN_VALUE = 25;
// Duration of one game tick in ms (~30 fps).
const TICK_MS = 33;
// Random integer in [min, max] inclusive.
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
// Hop animation: `e` frames following a parabola 0 -> 1 -> 0 (scaled by the data's hop strength), ending at 0.
const hopCurve = (frames) => Array.from({ length: frames }, (_unused, frame) => frame === frames - 1 ? 0 : 1 - (-1 + 2 * frame / (frames - 1)) ** 2);
// At most one gift per 3 floors (rounded down after +2) can be on screen / arrive per reset period.
const maxGifts = (state) => Math.trunc((state.etager.length + 2) / 3);
// Creates one gift on floor `floorIndex` at a random x, with a random skin and start delay.
function spawnGift(state, floorIndex) {
  const giftData = state.data.gave, worldWidth = state.data.verdensBredde;
  state.gaveId = (state.gaveId || 0) + 1;
  const skinIndex = randomInt(0, giftData.skins[0].length - 1);
  state.gaver.push({ id: state.gaveId, etage: floorIndex, i: skinIndex, x: state.data.etage.x + randomInt(Math.trunc(worldWidth / 16), Math.trunc(worldWidth / 2)), start: randomInt(0, giftData.maksTick), hop: giftData.hop.n, hopAcc: 0, alfa: new Tween(255, giftData.alfaBilleder), aabnet: false, aabnTid: 0 });
}
// Vertical scale factor of a gift's bouncing animation at its current hop frame (1 = at rest).
export function giftHopScale(state, gift) {
  const giftData = state.data.gave, curve = hopCurve(giftData.hop.n);
  return 1 + (gift.hop < giftData.hop.n ? curve[gift.hop] * giftData.hop.styrke : 0);
}
// Per-tick gift update: spawn new gifts on a timer (within the per-hotel limit), advance hops and fades, remove opened gifts once faded and their open animation has played.
export function updateGifts(state) {
  const giftData = state.data.gave;
  if (!giftData) {
    return;
  }
  if (!state.gaver) {
    Object.assign(state, { gaver: [], gaveTid: 0, gaveNulstil: 0, gaverAktive: 0, gaverKommet: 0 });
  }
  const limit = maxGifts(state);
  state.gaveTid -= TICK_MS;
  if (state.gaveTid < 0) {
    if (state.gaverAktive < limit && state.gaverKommet < limit) {
      spawnGift(state, randomInt(0, Math.max(0, state.etager.length - 2)));
      state.gaverAktive++;
      state.gaverKommet++;
    }
    state.gaveTid = giftData.hver;
  }
  state.gaveNulstil -= TICK_MS;
  if (state.gaveNulstil < 0) {
    state.gaverKommet = state.gaverAktive;
    state.gaveNulstil = giftData.nulstil;
  }
  const openAnimationMs = state.filmTid && state.filmTid.get(giftData.aabn[0][0]) || 0;
  for (const gift of [...state.gaver]) {
    if (gift.hop < giftData.hop.n) {
      gift.hop++;
    }
    gift.alfa.trin();
    if (gift.aabnet) {
      gift.aabnTid += TICK_MS;
      if (gift.alfa.v <= 4 && gift.aabnTid >= openAnimationMs) {
        state.gaver.splice(state.gaver.indexOf(gift), 1);
      }
    }
  }
}
// Opens a tapped gift: starts its fade, frees a gift slot and pays GIFT_COIN_VALUE. Returns the coins (0 if already opened).
export function openGift(state, gift) {
  if (gift.aabnet) {
    return 0;
  }
  gift.aabnet = true;
  gift.hop = 0;
  gift.alfa.mod(0);
  state.gaverAktive = Math.max(0, state.gaverAktive - 1);
  state.gaveNulstil = state.data.gave.nulstil;
  addMoney(state, GIFT_COIN_VALUE);
  state.hentet += GIFT_COIN_VALUE;
  return GIFT_COIN_VALUE;
}
