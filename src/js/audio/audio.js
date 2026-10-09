// Audio volume handling and narrator loading.
//
// - A global volume (0..1, persisted in localStorage) set by the player's volume slider.
// - Per-sound loudness normalisation: every sound file is analysed once (RMS) so that all effects play
//   at roughly the same loudness, then scaled by the master gain and the global volume.
// - Loading/creating the "fortaeller" (narrator) character used by minigames for spoken intros.
//
// Obscure export names (proposed renames in exportmaps): Gh = MASTER_GAIN, Vc = TARGET_RMS,
// Wh = FALLBACK_GAIN, Ba = computeElementVolume, Ln = registerAudioElement, b1 = POP_MUSIC_LATENCY_MS.
import { ScriptedCharacter } from '../render/script-player.js';
// Master gain (was 0.05). Final element volume = normalisedGain * MASTER_GAIN * volume * 2, clamped to 1.
// Raise MASTER_GAIN for louder sound, lower it for quieter.
export const MASTER_GAIN = 0.5; // MASTER_GAIN
// Target loudness (RMS) every sound effect is normalised to (was 0.05).
export const TARGET_RMS = 0.1; // TARGET_RMS
// Fallback gain used until a sound file has been analysed.
export const FALLBACK_GAIN = 0.25; // FALLBACK_GAIN
// localStorage key of the saved global volume.
export const VOLUME_STORAGE_KEY = "lydstyrke-v1";
// Global volume 0..1 (default 0.5 when nothing valid is stored).
let volume = (() => {
  try {
    const stored = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
    return Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : 0.5;
  }
  catch {
    return 0.5;
  }
})();
// Callbacks to run when the global volume changes (see onVolumeChange).
const volumeListeners = new Set();
// Audio elements currently playing -> the relative volume they were started with,
// so their real volume can be recomputed when the global volume changes.
const playingElements = new Map();
// Current global volume (0..1).
export function getVolume() {
  return volume;
}
// Set the global volume (clamped to 0..1), persist it, update all playing sounds and notify listeners.
export function setVolume(newVolume) {
  if (newVolume = Math.max(0, Math.min(1, newVolume)), newVolume !== volume) {
    volume = newVolume;
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    }
    catch {
    }
    for (const [element, relativeVolume] of playingElements) {
      if (element.ended || element.paused) {
        playingElements.delete(element);
      } else {
        element.volume = computeElementVolume(element.src, relativeVolume);
      }
    }
    for (const listener of volumeListeners) {
      listener(volume);
    }
  }
}
// Subscribe to volume changes; returns an unsubscribe function.
export function onVolumeChange(listener) {
  volumeListeners.add(listener);
  return () => volumeListeners.delete(listener);
}
// url -> normalisation gain (TARGET_RMS / measured RMS, at most 1) once the file has been analysed.
const soundGains = new Map();
// url -> promise of the analysis still running.
const pendingAnalyses = new Map();
let audioContext = null;
// Starts (once per url) fetching and decoding a sound to measure its loudness and store its normalisation gain.
function loadSoundBuffer(url) {
  if (soundGains.has(url) || pendingAnalyses.has(url)) {
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
  const analysis = fetch(url).then((response) => response.arrayBuffer()).then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer)).then((audioBuffer) => {
    // Loudness (RMS) of the file, sampled at every 4th sample of every channel.
    let sumSquares = 0, sampleCount = 0;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const samples = audioBuffer.getChannelData(channel);
      for (let index = 0; index < samples.length; index += 4) {
        sumSquares += samples[index] * samples[index];
        sampleCount++;
      }
    }
    // Gain that brings this file to TARGET_RMS (never boosts above 1; silent files fall back to TARGET_RMS).
    const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount)) || TARGET_RMS;
    soundGains.set(url, Math.min(1, TARGET_RMS / rms));
  }).catch(() => soundGains.set(url, FALLBACK_GAIN)).finally(() => pendingAnalyses.delete(url));
  pendingAnalyses.set(url, analysis);
}
// Real element volume (0..1) for a sound file: normalisation gain * relative volume * master gain
// * global volume * 2. Triggers the loudness analysis if the file is not known yet.
export function computeElementVolume(url, relativeVolume = 1) {
  loadSoundBuffer(url);
  return Math.min(1, Math.max(0, Math.min(1, (soundGains.has(url) ? soundGains.get(url) : FALLBACK_GAIN) * relativeVolume)) * MASTER_GAIN * volume * 2);
}
// Prepare an <audio> element for playback: sets its volume, tracks it so that global volume changes
// reach it, and refreshes the volume once the loudness analysis of `url` finishes. Returns the element.
// relativeVolume: 0..1 multiplier for this particular playback.
export function registerAudioElement(element, url, relativeVolume = 1) {
  element.volume = computeElementVolume(url, relativeVolume);
  playingElements.set(element, relativeVolume);
  element.addEventListener("ended", () => playingElements.delete(element), { once: true });
  const pending = pendingAnalyses.get(url);
  if (pending) {
    pending.then(() => {
      element.volume = computeElementVolume(url, relativeVolume);
    });
  }
  return element;
}
// URL of a sound file: <folder>/lyd<id>.wav for the shared folder "data/lyd", otherwise .mp3.
export const soundUrl = (folder, id) => `${folder}/lyd${id}.${folder === "data/lyd" ? "wav" : "mp3"}`;
// Delay (ms) between a Pop music track's audio clock and the game's song clock: 1105 samples at 8 kHz.
export const POP_MUSIC_LATENCY_MS = 1105 / 8e3 * 1e3;

// Loads data/<game>/fortaeller.json plus its animation manifest and textures.
// Resolves to the narrator data (with `spil`, `manifest`, `images` added) or null when the game has no narrator.
export async function loadNarratorData(game) {
  try {
    const narrator = await fetch(`data/${game}/fortaeller.json`).then((response) => response.ok ? response.json() : null);
    if (!narrator) {
      return null;
    }
    let manifest = { sprites: [], animations: [], textures: {} };
    if (narrator.anims.length) {
      const manifestResponse = await fetch(`data/${game}/fortaeller/manifest.json`);
      if (manifestResponse.ok) {
        manifest = await manifestResponse.json();
      }
    }
    const images = {};
    await Promise.all(Object.entries(manifest.textures).map(([textureId, texture]) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        images[textureId] = image;
        resolve();
      };
      image.onerror = () => resolve();
      image.src = `data/${game}/fortaeller/tex/${texture.file}`;
    })));
    return { ...narrator, spil: game, manifest: manifest, images: images };
  }
  catch {
    return null;
  }
}
// Builds the on-screen narrator character from data returned by loadNarratorData (null -> null).
// forskydning: horizontal offset in px of the narrator on screen.
export function createNarrator(narratorData, forskydning = 128) {
  return narratorData ? new ScriptedCharacter({ liste: narratorData.liste, hvile: narratorData.hvile, tilfaeldig: narratorData.tilfaeldig, anims: new Map(narratorData.manifest.animations.map((animation) => [animation.id, animation])), manifest: narratorData.manifest, images: narratorData.images, lydSti: `data/fortaeller-lyd/${narratorData.spil}`, forskydning }) : null;
}
