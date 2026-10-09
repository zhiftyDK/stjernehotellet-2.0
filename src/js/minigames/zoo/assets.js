// Zoo minigame: loading of data files (spil/baggrund/tekster JSON), animations and textures.

import { loadNarratorData } from '../../audio/audio.js';
import { serializeZooState } from '../../game/world.js';
import { createTextureLoader } from '../../render/canvas-helpers.js';
import { SAVE_KEY, zooSessionRef } from './session.js';

/** Decodes an exported animation: the flat `ins` number array becomes a list of instruction objects.
 *  Instructions are 5 numbers (target, curve 15 = constant, prop, t0, value) or 7 numbers
 *  (target, curve, prop, t0, v0, t1, v1) for interpolated curves. */
function decodeAnimation(rawAnimation) {
  const instructions = [];
  const flat = rawAnimation.ins;
  for (let i = 0; i < flat.length;) {
    const [target, curve, prop, startTime] = [flat[i], flat[i + 1], flat[i + 2], flat[i + 3]];
    if (curve === 15) {
      instructions.push({ target: target, curve: curve, prop: prop, t0: startTime, v: flat[i + 4] });
      i += 5;
    } else {
      instructions.push({ target: target, curve: curve, prop: prop, t0: startTime, v0: flat[i + 4], t1: flat[i + 5], v1: flat[i + 6] });
      i += 7;
    }
  }
  return { id: rawAnimation.id, duration: rawAnimation.duration, loop: rawAnimation.loop, loopFrom: rawAnimation.loopFrom, parts: rawAnimation.parts, instructions: instructions };
}
/** Fetches a JSON file below data/zoo/ (rejects on HTTP errors). */
const fetchZooJson = (file) => fetch(`data/zoo/${file}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`${file}: ${response.status}`)));
/** Loads the zoo manifest + animations and returns the asset facade used by the game:
 *  { manifest, anims, I (textures), lyt, forhaand(animIds, spriteIds) = start loading,
 *    vent(animIds, spriteIds, timeoutMs) = promise that resolves when those textures are loaded,
 *    hentType(type) = lazily load an animal type's own animation file, harType(type) }. */
async function loadZooAssets() {
  const manifest = await fetchZooJson("manifest.json");
  /** Decoded animations by id. */
  const animationsById = new Map(manifest.animations.map((animationJson) => [animationJson.id, decodeAnimation(animationJson)]));
  const textureLoader = createTextureLoader("data/zoo", manifest);
  /** Pending/finished loads of per-animal-type data files (type -> promise of success). */
  const typeLoads = new Map();
  /** Lists the texture (asset) ids used by the first sprite of each given animation plus the given sprite indexes. */
  const collectAssetIds = (animationIds, spriteIds = []) => {
    const assetIds = new Set();
    for (const animationId of animationIds) {
      const animation = animationsById.get(animationId);
      if (animation) {
        for (const instruction of animation.instructions) {
          if (instruction.prop !== 0 || instruction.target >= 254) {
            continue;
          }
          const sprite = manifest.sprites[(instruction.curve === 15 ? instruction.v : instruction.v0) & 65535];
          if (sprite) {
            assetIds.add(sprite.assetId);
          }
        }
      }
    }
    for (const spriteIndex of spriteIds) {
      const sprite = manifest.sprites[spriteIndex];
      if (sprite) {
        assetIds.add(sprite.assetId);
      }
    }
    return [...assetIds];
  };
  /** Starts loading the textures needed by the animations/sprites (touching `I[id]` triggers the lazy load). */
  const preload = (animationIds, spriteIds = []) => {
    for (const assetId of collectAssetIds(animationIds, spriteIds)) {
      textureLoader.I[assetId];
    }
  };
  /** Resolves when all those textures have loaded (or failed), or after `timeoutMs` at the latest. */
  const waitForLoaded = (animationIds, spriteIds, timeoutMs = 5e3) => Promise.race([Promise.all(collectAssetIds(animationIds, spriteIds).map((assetId) => new Promise((resolve) => {
      textureLoader.I[assetId];
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = `data/zoo/tex/${manifest.textures[assetId].file}`;
    }))), new Promise((resolve) => {
      setTimeout(resolve, timeoutMs);
    })]);
  return { manifest: manifest, anims: animationsById, I: textureLoader.I, lyt: textureLoader.lyt, forhaand: preload, vent: waitForLoaded, hentType(type) {
      if (!typeLoads.has(type)) {
        typeLoads.set(type, fetchZooJson(`dyr/${type}.json`).then((typeData) => {
          for (const animation of typeData.animations) {
            animationsById.set(animation.id, decodeAnimation(animation));
          }
          for (const textureId of typeData.teksturer) {
            textureLoader.I[textureId];
          }
          return true;
        }).catch(() => {
          typeLoads.delete(type);
          return false;
        }));
      }
      return typeLoads.get(type);
    }, harType: (type) => typeLoads.has(type) };
}
/** Loads game data, backgrounds, texts, narrator data and assets, and preloads the textures
 *  needed for the first frame. Resolves to { spil, bg, tekster, fortaeller, zoo }; rejects on error. */
export async function loadZooData() {
  const fetchJson = (file) => fetch(`data/zoo/${file}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`${file}: ${response.status}`)));
  // spil = game config, baggrund = background tile map, tekster = texts; plus narrator voice data and the animation assets.
  const [gameData, backgroundData, texts, narratorData, zooAssets] = await Promise.all([fetchJson("spil.json"), fetchJson("baggrund.json"), fetchJson("tekster.json"), loadNarratorData("zoo"), loadZooAssets()]);
  const attractionCfg = gameData.sevaerdighed;
  const backgroundSpriteIds = [...new Set(backgroundData.felter.flat().filter((cell) => cell))].map((fieldId) => gameData.baggrund.base + fieldId);
  let savedTypes = [];
  try {
    const savedZoo = zooSessionRef.current ? serializeZooState(zooSessionRef.current.s) : JSON.parse(localStorage.getItem(SAVE_KEY));
    savedTypes = (savedZoo && Array.isArray(savedZoo.sev) ? savedZoo.sev : []).map((attraction) => attraction.type);
  }
  catch {
  }
  // Wait for everything visible in the first frames (sign, saved attractions, construction, signs, coin sprites).
  await zooAssets.vent([texts.skilt && texts.skilt.film, ...new Set([0, ...savedTypes].map((typeIndex) => attractionCfg.film[typeIndex])), ...attractionCfg.byg.slice(0, 2), attractionCfg.pengeskilt.film, attractionCfg.hjerteskilt.film, gameData.bod.film[0], gameData.bod.skilt.film].filter(Boolean), [...backgroundSpriteIds, ...Array.from({ length: attractionCfg.moent.antal }, (unusedItem, index) => attractionCfg.moent.sprite + index)]);
  return { spil: gameData, bg: backgroundData, tekster: texts, fortaeller: narratorData, zoo: zooAssets };
}
