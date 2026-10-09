// Night/day sky of the hotel scene: colour bands, gradient strip, twinkling stars, the moon and drifting clouds.
// All layers scroll slower than the hotel (parallax), so the sky appears far away.
import { drawSprite, drawAnimation } from '../../render/canvas-helpers.js';
import { rgbString, randomInt } from './helpers.js';

/**
 * Creates the sky. Must be created once, after the scenery animation cache exists (the stars use it).
 * @param world               world constants (himmel = sky colours/sprites, skyer = clouds, stjerner = stars)
 * @param spriteManifest/spriteImages  hotel sprite pack the sky sprites come from
 * @param getSceneryPlayer    (key, animId) => animation player (cached, shared with the rest of the scene)
 * @param foregroundWidth     width in px of the foreground tile map (the moon sits at 2/3 of it)
 * @returns {{ advance(dt: number): void, draw(ctx, camX, skyScrollY, skyGradientY, viewWidth, viewHeight): void }}
 */
export function createSky({ world, spriteManifest, spriteImages, getSceneryPlayer, foregroundWidth }) {
  // Re-rolls a cloud: random sprite (big or medium), height and speed. New clouds enter from the left edge (x = -16384),
  // initial ones are scattered over the whole sky. x/speed are in sky units (divided by world.skyer.skala when drawn).
  const resetCloud = (cloud, scatterAcrossSky) => {
    const roll = randomInt(0, 5), cloudType = world.skyer.typer[Math.min(roll, 2)], spritePool = roll === 1 ? world.skyer.mellem : world.skyer.store;
    cloud.sprite = spritePool[randomInt(0, spritePool.length - 1)];
    cloud.x = scatterAcrossSky ? randomInt(-32768, 131072) : -16384;
    cloud.y = randomInt(cloudType.y[0], cloudType.y[1]);
    cloud.fart = randomInt(cloudType.fart[0], cloudType.fart[1]);
  };
  const clouds = Array.from({ length: world.skyer.antal }, () => {
    const newCloud = {};
    resetCloud(newCloud, true);
    return newCloud;
  });
  // Slowest (farthest) clouds first, so faster ones are drawn on top.
  const sortCloudsBySpeed = () => clouds.sort((a, b) => a.fart - b.fart);
  sortCloudsBySpeed();
  let cloudTimeAccum = 0; // ms accumulated towards the next 33 ms cloud step
  const stars = world.stjerner.flatMap((starGroup) => Array.from({ length: starGroup.antal }, () => ({ anim: starGroup.anim, x: randomInt(0, 1920), y: randomInt(0, 1920) })));
  // Give every star a random start time so they do not twinkle in sync.
  stars.forEach((star, starIndex) => {
    const starPlayer = getSceneryPlayer(`stjerne-${starIndex}`, star.anim);
    if (starPlayer) {
      starPlayer.advance(randomInt(0, 7e3));
    }
  });
  return {
    /** Moves the clouds. They move in fixed 33 ms steps (at most 250 ms of catch-up per frame). */
    advance(dt) {
      cloudTimeAccum += Math.min(250, dt);
      while (cloudTimeAccum >= 33) {
        cloudTimeAccum -= 33;
        for (const cloud of clouds) {
          cloud.x += cloud.fart;
          if (cloud.x >= world.skyer.ude) {
            resetCloud(cloud, false);
            sortCloudsBySpeed();
          }
        }
      }
    },
    /**
     * Draws the sky for the given camera. camX = camera x in px, skyScrollY = vertical sky scroll (2/3 of camera y),
     * skyGradientY = y of the day/night gradient strip.
     */
    draw(ctx, camX, skyScrollY, skyGradientY, viewWidth, viewHeight) {
      // Night colour everywhere, day colour from the gradient strip downwards, and the gradient sprite tiled between them.
      ctx.fillStyle = rgbString(world.himmel.nat);
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = rgbString(world.himmel.dag);
      ctx.fillRect(0, skyGradientY + 1024, viewWidth, 1024);
      for (let gradientX = 0; gradientX < viewWidth; gradientX += 128) {
        drawSprite(ctx, spriteManifest, spriteImages, world.himmel.gradient, gradientX, skyGradientY);
      }
      const starOffsetX = Math.trunc(Math.trunc(2 * camX / 3) / 2);
      const starOffsetY = Math.trunc(skyScrollY / 2);
      // Stars, moon and clouds each scroll at their own parallax speed.
      stars.forEach((star, starIndex) => drawAnimation(ctx, spriteManifest, spriteImages, getSceneryPlayer(`stjerne-${starIndex}`, star.anim), star.x - starOffsetX, star.y - starOffsetY));
      drawSprite(ctx, spriteManifest, spriteImages, world.himmel.maane, Math.trunc(2 * foregroundWidth / 3) - starOffsetX, 512 - starOffsetY);
      for (const cloud of clouds) {
        drawSprite(ctx, spriteManifest, spriteImages, cloud.sprite, Math.trunc(cloud.x / world.skyer.skala[0]) - Math.trunc(2 * camX / 3), Math.trunc(cloud.y / world.skyer.skala[1]) - skyScrollY);
      }
    }
  };
}
