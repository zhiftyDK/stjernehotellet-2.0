// Platform minigame: asset loading.
//
// loadPlatformAssets() is an async function that loads the sprite manifest, the level index, the textures,
// the optional HUD and dialog texture packs and the tutorial script from data/platform/. It resolves to the
// asset object below (and rejects with an Error on failure).

// Loads all platform data. The result holds: manifest (sprites/animations), index (level list and
// backgrounds), images (loaded textures by id), anims (animation data by id), hud (HUD pack loaded?) and
// vejledning (tutorial script data or null).
export async function loadPlatformAssets() {
  const [manifest, index] = await Promise.all([fetch("data/platform/manifest.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`manifest.json: ${response.status}`))), fetch("data/platform/index.json").then((response) => response.ok ? response.json() : Promise.reject(new Error(`index.json: ${response.status}`)))]), images = {};
  await Promise.all(Object.entries(manifest.textures).map(([textureId, textureInfo]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      images[textureId] = image;
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `data/platform/tex/${textureInfo.file}`;
  })));
  const loadExtraPack = async (packName) => {
    const packManifest = await fetch(`data/platform/${packName}/manifest.json`).then((response) => response.ok ? response.json() : null).catch(() => null);
    if (!packManifest) {
      return false;
    }
    for (const [spriteId, spriteDef] of Object.entries(packManifest.sprites)) {
      if (!manifest.sprites[spriteId]) {
        manifest.sprites[spriteId] = spriteDef;
      }
    }
    for (const animation of packManifest.animations) {
      if (!manifest.animations.some((existing) => existing.id === animation.id)) {
        manifest.animations.push(animation);
      }
    }
    await Promise.all(Object.entries(packManifest.textures).map(([textureId, textureInfo]) => new Promise((resolve) => {
      if (images[textureId]) {
        resolve();
        return;
      }
      const image = new Image();
      image.onload = () => {
        images[textureId] = image;
        resolve();
      };
      image.onerror = () => resolve();
      image.src = `data/platform/${packName}/tex/${textureInfo.file}`;
    })));
    return true;
  }, [hudLoaded, , tutorialData] = await Promise.all([loadExtraPack("hud"), loadExtraPack("dialog"), fetch("data/platform/vejledning.json").then((response) => response.ok ? response.json() : null).catch(() => null)]), animById = new Map(manifest.animations.map((anim) => [anim.id, anim]));
  return { manifest: manifest, index: index, images: images, anims: animById, hud: hudLoaded, vejledning: tutorialData };
}
