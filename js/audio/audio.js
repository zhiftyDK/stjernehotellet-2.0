import { ScriptedCharacter } from '../render/script-player.js';
// Master gain (was 0.05). Final element volume = normalisedGain * MASTER_GAIN * volume * 2, clamped to 1.
// Raise MASTER_GAIN for louder sound, lower it for quieter.
export const Gh = 0.5;
// Target loudness (RMS) every sound effect is normalised to (was 0.05).
export const Vc = 0.1;
// Fallback gain used until a sound file has been analysed.
export const Wh = 0.25;
export const VOLUME_STORAGE_KEY = "lydstyrke-v1";
let volume = (() => {
  try {
    const e = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
    return Number.isFinite(e) ? Math.max(0, Math.min(1, e)) : 0.5;
  }
  catch {
    return 0.5;
  }
})();
const Fa = new Set(), Po = new Map();
export function getVolume() {
  return volume;
}
export function setVolume(e) {
  if (e = Math.max(0, Math.min(1, e)), e !== volume) {
    volume = e;
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    }
    catch {
    }
    for (const [t, n] of Po) {
      if (t.ended || t.paused) {
        Po.delete(t);
      } else {
        t.volume = Ba(t.src, n);
      }
    }
    for (const t of Fa) {
      t(volume);
    }
  }
}
export function onVolumeChange(e) {
  Fa.add(e);
  return () => Fa.delete(e);
}
const xl = new Map(), Gi = new Map();
let audioContext = null;
function loadSoundBuffer(e) {
  if (xl.has(e) || Gi.has(e)) {
    return;
  }
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    catch {
      return;
    }
  }
  const t = fetch(e).then((n) => n.arrayBuffer()).then((n) => audioContext.decodeAudioData(n)).then((n) => {
    let r = 0, l = 0;
    for (let o = 0; o < n.numberOfChannels; o++) {
      const s = n.getChannelData(o);
      for (let a = 0; a < s.length; a += 4) {
        r += s[a] * s[a];
        l++;
      }
    }
    const i = Math.sqrt(r / Math.max(1, l)) || Vc;
    xl.set(e, Math.min(1, Vc / i));
  }).catch(() => xl.set(e, Wh)).finally(() => Gi.delete(e));
  Gi.set(e, t);
}
export function Ba(e, t = 1) {
  loadSoundBuffer(e);
  return Math.min(1, Math.max(0, Math.min(1, (xl.has(e) ? xl.get(e) : Wh) * t)) * Gh * volume * 2);
}
export function Ln(e, t, n = 1) {
  e.volume = Ba(t, n);
  Po.set(e, n);
  e.addEventListener("ended", () => Po.delete(e), { once: true });
  const r = Gi.get(t);
  if (r) {
    r.then(() => {
      e.volume = Ba(t, n);
    });
  }
  return e;
}
export const soundUrl = (e, t) => `${e}/lyd${t}.${e === "data/lyd" ? "wav" : "mp3"}`, b1 = 1105 / 8e3 * 1e3;
export async function loadNarratorData(e) {
  try {
    const t = await fetch(`data/${e}/fortaeller.json`).then((l) => l.ok ? l.json() : null);
    if (!t) {
      return null;
    }
    let n = { sprites: [], animations: [], textures: {} };
    if (t.anims.length) {
      const l = await fetch(`data/${e}/fortaeller/manifest.json`);
      if (l.ok) {
        n = await l.json();
      }
    }
    const r = {};
    await Promise.all(Object.entries(n.textures).map(([l, i]) => new Promise((o) => {
      const s = new Image();
      s.onload = () => {
        r[l] = s;
        o();
      };
      s.onerror = () => o();
      s.src = `data/${e}/fortaeller/tex/${i.file}`;
    })));
    return { ...t, spil: e, manifest: n, images: r };
  }
  catch {
    return null;
  }
}
export function createNarrator(e, forskydning = 128) {
  return e ? new ScriptedCharacter({ liste: e.liste, hvile: e.hvile, tilfaeldig: e.tilfaeldig, anims: new Map(e.manifest.animations.map((t) => [t.id, t])), manifest: e.manifest, images: e.images, lydSti: `data/fortaeller-lyd/${e.spil}`, forskydning }) : null;
}
