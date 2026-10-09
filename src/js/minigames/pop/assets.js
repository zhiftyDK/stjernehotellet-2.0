/**
 * Asset loading for the Popstars minigame.
 */
import { loadNarratorData } from '../../audio/audio.js';

// Loads data/pop/*.json, all sprite textures from the manifest and the narrator data.
// Resolves to {spil, manifest, images, fg, bg, tekster, fortaeller} and rejects with an Error when something fails
// (spil = game data, fg/bg = foreground/background tile maps, tekster = texts, fortaeller = narrator data).
export async function loadPopAssets() {
  const fetchJson = (fileName) => fetch(`data/pop/${fileName}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`${fileName}: ${response.status}`)));
  const [[gameData, manifest, foregroundMap, backgroundMap, texts], narratorData] = await Promise.all([Promise.all(["spil.json", "manifest.json", "forgrund.json", "baggrund.json", "tekster.json"].map(fetchJson)), loadNarratorData("pop")]);
  const images = {};
  await Promise.all(Object.entries(manifest.textures).map(([textureName, texture]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[textureName] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `data/pop/tex/${texture.file}`;
  })));
  return { spil: gameData, manifest: manifest, images: images, fg: foregroundMap, bg: backgroundMap, tekster: texts, fortaeller: narratorData };
}
