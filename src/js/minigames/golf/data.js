/**
 * Loads everything the minigolf needs: game config
 * (spil.json), the sprite manifest, narrator data and all texture images.
 */
import { loadNarratorData } from '../../audio/audio.js';

/**
 * Resolves to {spil, manifest, images, fortaeller}; rejects with an Error when something fails to load.
 */
export async function loadGolfData() {
  const [gameConfig, manifest, narratorData] = await Promise.all([fetch("data/golf/spil.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`spil.json: ${response.status}`))), fetch("data/golf/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))), loadNarratorData("golf")]), images = {};
  // Load all textures; a texture that fails to load is simply skipped.
  await Promise.all(Object.entries(manifest.textures).map(([id, entry]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[id] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `data/golf/tex/${entry.file}`;
  })));
  return { spil: gameConfig, manifest: manifest, images: images, fortaeller: narratorData };
}
