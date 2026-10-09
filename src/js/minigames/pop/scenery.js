/**
 * Animated backdrop of the Popstars stage: the drifting sky (clouds + twinkling stars) and the
 * crowd of people standing in front of the stage.
 */
import { randomInt } from './util.js';

// Creates the sky. `createAnim(filmId, startMs)` makes an animation player. Clouds scroll right at different speeds
// (sorted slowest first so faster ones draw on top) and respawn at the entry edge when they leave the screen.
// Methods: trin() move clouds one frame, tik(dt) advance star animations, tegn(camera, drawSpriteAt, drawAnimationAt).
export function createSky(skyCfg, createAnim, screenWidth = 1280) {
  const clouds = skyCfg.skyer;
  const placeCloud = (cloud, initial) => {
    const cloudKind = randomInt(0, 5);
    const spritePool = cloudKind === 1 ? clouds.mellem : clouds.store;
    cloud.sprite = spritePool[randomInt(0, spritePool.length - 1)];
    cloud.x = initial ? randomInt(clouds.start[0], clouds.start[1]) : clouds.ind;
    const cloudType = clouds.typer[Math.min(cloudKind, 2)];
    cloud.y = randomInt(cloudType.y[0], cloudType.y[1]);
    cloud.fart = randomInt(cloudType.fart[0], cloudType.fart[1]);
  };
  const cloudList = Array.from({ length: clouds.antal }, () => {
    const cloud = {};
    placeCloud(cloud, true);
    return cloud;
  });
  const sortClouds = () => cloudList.sort((a, b) => a.fart - b.fart);
  sortClouds();
  const makeStar = (filmId) => ({ x: randomInt(0, skyCfg.felt), y: randomInt(0, skyCfg.felt), p: createAnim(filmId, randomInt(0, skyCfg.tick)) });
  const stars = [...Array.from({ length: skyCfg.stjerner.antal }, () => makeStar(skyCfg.stjerner.film)), ...Array.from({ length: skyCfg.smaaStjerner.antal }, () => makeStar(skyCfg.smaaStjerner.film))];
  return { skyer: cloudList, trin() {
      for (const cloud of cloudList) {
        cloud.x += cloud.fart;
        if (cloud.x >= clouds.ude) {
          placeCloud(cloud, false);
          sortClouds();
        }
      }
    }, tik(dtMs) {
      for (const star of stars) {
        if (star.p) {
          star.p.advance(dtMs);
        }
      }
    }, tegn(camera, drawSpriteAt, drawAnimationAt) {
      for (let x = 0; x < screenWidth; x += skyCfg.skridt) {
        drawSpriteAt(skyCfg.stribe, x, 0);
      }
      const camX = Math.trunc(camera.x / skyCfg.kamera);
      const camY = Math.trunc(camera.y / skyCfg.kamera);
      for (const star of stars) {
        drawAnimationAt(star.p, star.x - camX, star.y - camY);
      }
      for (const cloud of cloudList) {
        drawSpriteAt(cloud.sprite, Math.trunc(cloud.x / clouds.skala[0]) - camX, Math.trunc(cloud.y / clouds.skala[1]) - camY);
      }
    } };
}
// Creates the crowd. Each person has an animation; film(name) switches everybody between the waiting and
// cheering animation sets; tegn draws them with horizontal parallax relative to the camera.
export function createAudience(audienceCfg, createAnim) {
  const slotWidth = Math.trunc(audienceCfg.x / audienceCfg.antal);
  const people = Array.from({ length: audienceCfg.antal }, (_person, index) => ({ x: index * slotWidth + randomInt(0, slotWidth), y: audienceCfg.y + randomInt(audienceCfg.ymin, audienceCfg.ymax), film: audienceCfg.venter, p: createAnim(audienceCfg.film[audienceCfg.venter], randomInt(0, audienceCfg.tick)) }));
  for (let idx = people.length - 1; idx > 0; idx--) {
    const swapIdx = randomInt(0, idx);
    [people[idx], people[swapIdx]] = [people[swapIdx], people[idx]];
  }
  return { folk: people, film(film) {
      for (const person of people) {
        if (person.film !== film) {
          person.film = film;
          person.p = createAnim(audienceCfg.film[film], 0);
        }
      }
    }, tik(dtMs) {
      for (const person of people) {
        if (person.p) {
          person.p.advance(dtMs);
        }
      }
    }, tegn(camera, drawAnimationAt) {
      const shift = Math.trunc(camera.x * audienceCfg.parallakse);
      for (const person of people) {
        drawAnimationAt(person.p, person.x - shift, person.y - camera.y);
      }
    } };
}
