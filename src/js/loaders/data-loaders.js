// Data and sound loaders for the game.
//
// - Per-minigame sound-id tables and the sound bank (rd) that minigames use for sound effects.
// - Theme music handoff from the start screen, and the hotel's background music player (x1).
// - loadGameData(): async function that fetches all hotel/UI/map/tutorial data before the game screen starts.
//
// Obscure export names (see exportmaps): rd = createSoundBank, x1 = createMusicPlayer,
// pk/hk/mk/yk/gk/vk/kk/wk/xk = per-minigame sound tables.
import { GAME_WIDTH } from '../engine/constants.js';
import { soundUrl, registerAudioElement, MASTER_GAIN, getVolume, onVolumeChange } from '../audio/audio.js';
import { createBitmapTextRenderer } from '../ui/panels.js';
import { createTextureLoader } from '../render/canvas-helpers.js';
// Sound-effect id tables, one per minigame: name of the sound -> id of the file lyd<id>.wav/mp3.
// Pass Object.values(table) to rd() (sound bank) and play by id. Proposed export names are in the exportmaps.
// pk: Sortering (sorting game)
export const SORTING_SOUNDS = { baand: 972, jingle: 976, boble: 979, forkert: 982, slip: 1018 };
// hk: Picross
export const PICROSS_SOUNDS = { klik: 1012, tabt: 1013, vundet: 976 };
// mk: Byttespil (swap game)
export const SWAP_GAME_SOUNDS = { vaelg: 975, bag: 1016, tilfaeldig: 1010, vundet: 976 };
// yk: Platform
export const PLATFORM_SOUNDS = { hop: 1079, hop1: 1080, hop2: 1081, hop3: 1076, forvandl: 1104, nej: 1094, tramp: 1077, mynt: 1111, slag: 1109, doed: 1078, maal: 1117, fjendehop: 1113, skud: 1114, pigge: 1097 };
// gk: Is (ice-cream game)
export const ICE_CREAM_SOUNDS = { skub: 1018, kugle: 978, topping: 992, faerdig: 976 };
// vk: Luftpost (airmail)
export const AIRMAIL_SOUNDS = { baand: 973, fly: 1008, pilotTryk: 1009, ud: 977, ud2: 1014, ramt: 1010, penge: 976, pilot: 1011 };
// kk: Kuffert (suitcase)
export const SUITCASE_SOUNDS = { byt: 1019, vundet: 976, rigtig: 1017, koer: 1e3, tomgang: 1001, bremse: 996 };
// wk: Golf
export const GOLF_SOUNDS = { haardt: 985, mellem: 986, blødt: 984, vaeg: 986, hul: 993, jubel: 995, vundet: 976 };
// xk: Baad (boat)
export const BOAT_SOUNDS = { motor: 981, penge: 976, kiste: 1015 };
// Sound bank: preloads the given sound ids from `folder` and returns a small player object.
//   spil(id)            play a sound once (fire and forget)
//   spiller(id)         true while the last instance of `id` is still playing
//   spilStyrke(id, v)   play once at relative volume v (0..1)
//   loekke(id)          start a looping sound (ignored if already looping)
//   volumen(id, v)      change the volume of a running loop
//   stop(id) / stopAlle()  stop one / all loops
//   saetTil(on)         enable/disable all sound for this bank (disabling also stops the loops)
// Volumes go through registerAudioElement() so the global volume and loudness normalisation apply.
export function createSoundBank(soundIds, folder = "data/lyd") {
  const sounds = new Map();
  let enabled = true;
  for (const id of soundIds) {
    const audio = new Audio(soundUrl(folder, id));
    audio.preload = "auto";
    sounds.set(id, audio);
  }
  const loops = new Map(), lastPlayed = new Map();
  return { spil(id, _volume = 1) {
      const template = sounds.get(id);
      if (!template || !enabled) {
        return;
      }
      const instance = registerAudioElement(template.cloneNode(), template.src);
      instance.play().catch(() => {
      });
      lastPlayed.set(id, instance);
    }, spiller(id) {
      const sound = lastPlayed.get(id);
      return !!sound && !sound.paused && !sound.ended;
    }, spilStyrke(id, relativeVolume) {
      const template = sounds.get(id);
      if (!template || !enabled) {
        return;
      }
      const instance = registerAudioElement(template.cloneNode(), template.src, relativeVolume);
      instance.play().catch(() => {
      });
      lastPlayed.set(id, instance);
    }, loekke(id, _volume = 0.5) {
      if (!enabled || loops.has(id)) {
        return;
      }
      const template = sounds.get(id);
      if (!template) {
        return;
      }
      const loopAudio = template.cloneNode();
      loopAudio.loop = true;
      registerAudioElement(loopAudio, template.src);
      loopAudio.play().catch(() => {
      });
      loops.set(id, loopAudio);
    }, volumen(id, relativeVolume) {
      const loopAudio = loops.get(id);
      if (loopAudio) {
        registerAudioElement(loopAudio, loopAudio.src, Math.max(0, Math.min(1, relativeVolume)));
      }
    }, stop(id) {
      const loopAudio = loops.get(id);
      if (loopAudio) {
        loopAudio.pause();
        loops.delete(id);
      }
    }, stopAlle() {
      for (const loopAudio of loops.values()) {
        loopAudio.pause();
      }
      loops.clear();
    }, saetTil(on) {
      enabled = on;
      if (!on) {
        this.stopAlle();
      }
    } };
}
// Theme music started from the start screen ("START SPIL" click) and handed on to the game's music player.
export const themeHandoff = { audio: null, file: null };
// Create (but do not start) the theme music element from musik.json and store it in themeHandoff.
// Volume: relative volume * master gain * global volume * 2, clamped to 1 (same formula as the audio module).
export function prepareThemeMusic(musik) {
  const file = musik.spil[0];
  const audio = new Audio(`data/musik/${file}.mp3`);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = Math.min(1, musik.lydstyrke * MASTER_GAIN * getVolume() * 2);
  themeHandoff.audio = audio;
  themeHandoff.file = file;
}
// Start the prepared theme music. Tries to play right away; browsers block that until the user has interacted with the page,
// so on failure it retries on the first click/key/touch anywhere.
export function startThemeMusic() {
  const audio = themeHandoff.audio;
  if (!audio || !audio.paused) {
    return;
  }
  audio.play().catch(() => {
    const retry = () => {
      window.removeEventListener("pointerdown", retry, true);
      window.removeEventListener("keydown", retry, true);
      window.removeEventListener("touchend", retry, true);
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", retry, true);
    window.addEventListener("keydown", retry, true);
    window.addEventListener("touchend", retry, true);
  });
}
// Background music player for the hotel/game screen. musicConfig = data/musik/musik.json
// ({ spil: [track files], oe: jingle file, lydstyrke: relative volume }).
//   spil(index)  play looping track `index`        oe()  play the one-shot jingle
//   til(on)      mute/unmute                       stop() stop and release listeners
//   info()       debug info about the current track
// The theme started from the start screen (themeHandoff) is reused when the same file is requested.
// Autoplay-blocked playback is retried on the next key press / pointer down; playback pauses while the tab is hidden.
export function createMusicPlayer(musicConfig) {
  let current = null, enabled = true;
  const currentVolume = () => enabled ? Math.min(1, musicConfig.lydstyrke * MASTER_GAIN * getVolume() * 2) : 0, unsubscribeVolume = onVolumeChange(() => {
    if (current) {
      current.volume = currentVolume();
    }
  }), tryPlay = () => {
    if (!(!current || document.hidden)) {
      current.play().catch(() => {
        const resumeOnInput = () => {
          window.removeEventListener("pointerdown", resumeOnInput);
          window.removeEventListener("keydown", resumeOnInput);
          tryPlay();
        };
        window.addEventListener("pointerdown", resumeOnInput);
        window.addEventListener("keydown", resumeOnInput);
      });
    }
  }, switchTrack = (file, loop) => {
    if (current) {
      current.pause();
      current.src = "";
      current = null;
    }
    if (file) {
      if (themeHandoff.audio && themeHandoff.file === file && loop) {
        current = themeHandoff.audio;
        themeHandoff.audio = null;
      } else {
        current = new Audio(`data/musik/${file}.mp3`);
      }
      current.loop = loop;
      current.volume = currentVolume();
      tryPlay();
    }
  }, onVisibilityChange = () => {
    if (current) {
      if (document.hidden) {
        current.pause();
      } else if (!current.ended) {
        tryPlay();
      }
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  return { spil(trackIndex) {
      switchTrack(musicConfig.spil[trackIndex], true);
    }, oe() {
      switchTrack(musicConfig.oe, false);
    }, til(on) {
      if (on !== enabled) {
        enabled = on;
        if (current) {
          current.volume = currentVolume();
        }
      }
    }, stop() {
      switchTrack(null);
      unsubscribeVolume();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }, info() {
      return current && { fil: current.src.split("/").pop(), spiller: !current.paused, tid: Math.round(current.currentTime), loekke: current.loop, lydstyrke: current.volume };
    } };
}
// Loads all JSON/manifest/texture data for the hotel game once. Resolves to
// { verden, manifest, forgrund, baggrund, billeder, moebler, cafe, hud, ui, skrift, hoveder, kort,
//   vejledning, musik, kaeledyr } when ready and throws (rejects) on error.
export async function loadGameData() {
  // Load all JSON files in parallel (order matches the names below).
  const [
    world,
    hotelManifest,
    hotelForeground,
    hotelBackground,
    furnitureData,
    furnitureManifest,
    cafeData,
    cafeManifest,
    hudData,
    hudManifest,
    uiData,
    uiManifest,
    fontData,
    fontManifest,
    heads,
    mapData,
    mapManifest,
    mapForeground,
    mapBackground,
    tutorialTexts,
    tutorialManifest,
    musicData,
    petData
  ] = await Promise.all([
    fetch("data/hotel/verden.json").then((response) => response.json()),
    fetch("data/hotel/manifest.json").then((response) => response.json()),
    fetch("data/hotel/forgrund.json").then((response) => response.json()),
    fetch("data/hotel/baggrund.json").then((response) => response.json()),
    fetch("data/moebler/moebler.json").then((response) => response.json()),
    fetch("data/moebler/manifest.json").then((response) => response.json()),
    fetch("data/cafe/cafe.json").then((response) => response.json()),
    fetch("data/cafe/manifest.json").then((response) => response.json()),
    fetch("data/hud/hud.json").then((response) => response.json()),
    fetch("data/hud/manifest.json").then((response) => response.json()),
    fetch("data/ui/ui.json").then((response) => response.json()),
    fetch("data/ui/manifest.json").then((response) => response.json()),
    fetch("data/skrift/skrift.json").then((response) => response.json()),
    fetch("data/skrift/manifest.json").then((response) => response.json()),
    fetch("data/hoveder/hoveder.json").then((response) => response.json()),
    fetch("data/kort/kort.json").then((response) => response.json()),
    fetch("data/kort/manifest.json").then((response) => response.json()),
    fetch("data/kort/forgrund.json").then((response) => response.json()),
    fetch("data/kort/baggrund.json").then((response) => response.json()),
    fetch("data/vejledning/tekster.json").then((response) => response.json()),
    fetch("data/vejledning/manifest.json").then((response) => response.json()),
    fetch("data/musik/musik.json").then((response) => response.json()),
    fetch("data/kaeledyr/kaeledyr.json").then((response) => response.json())
  ]);
  // Bitmap-font images, keyed by font image name.
  const fontImages = {};
  await Promise.all(fontData.skrifter.map((font) => new Promise((resolve) => {
    const sprite = fontManifest.sprites[font.billede], image = new Image();
    image.onload = () => {
      fontImages[font.billede] = image;
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `data/skrift/tex/${fontManifest.textures[sprite.assetId].file}`;
  })));
  // text renderer for the bitmap fonts
  const fontRenderer = createBitmapTextRenderer(fontData, fontImages);
  // UI sprites
  const ui = { U: uiData, M: uiManifest, T: createTextureLoader("data/ui", uiManifest) };
  // HUD sprites
  const hud = { H: hudData, M: hudManifest, T: createTextureLoader("data/hud", hudManifest) };
  // world map
  const map = { K: mapData, M: mapManifest, T: createTextureLoader("data/kort", mapManifest), forgrund: mapForeground, baggrund: mapBackground };
  // tutorial pages
  const tutorial = { V: tutorialTexts.vejledning, M: tutorialManifest, anims: new Map(tutorialManifest.animations.map((item) => [item.id, item])), T: createTextureLoader("data/vejledning", tutorialManifest) };
  // cafe
  const cafe = { C: cafeData, M: cafeManifest, anims: new Map(cafeManifest.animations.map((item) => [item.id, item])), T: createTextureLoader("data/cafe", cafeManifest) };
  // furniture shop (with categories indexed by type)
  const furniture = { ...furnitureData, kat: Object.fromEntries(furnitureData.kategorier.map((item) => [item.type, item])), M: furnitureManifest, anims: new Map(furnitureManifest.animations.map((item) => [item.id, item])), T: createTextureLoader("data/moebler", furnitureManifest) };
  // decoded hotel textures, keyed by texture id
  const hotelImages = {};
  await Promise.all(Object.entries(hotelManifest.textures).map(([textureId, texture]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      hotelImages[textureId] = image;
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `data/hotel/tex/${texture.file}`;
  })));
  return { verden: { ...world, skaerm: { ...world.skaerm, bredde: GAME_WIDTH } }, manifest: hotelManifest, forgrund: hotelForeground, baggrund: hotelBackground, billeder: hotelImages, moebler: furniture, cafe: cafe, hud: hud, ui: ui, skrift: fontRenderer, hoveder: heads, kort: map, vejledning: tutorial, musik: musicData, kaeledyr: petData };
}
