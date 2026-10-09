/**
 * Zoo minigame: ambient visitors - guests walking around and balloons floating by (tap a balloon to pop it for coins).
 */

import { TICK_MS, randomInt } from './common.js';
import { worldWidth, builtLotCount } from './lots.js';
import { currentLevel } from './score-and-levels.js';

/** A random walking guest. */
function createGuest(zoo) {
  const guestCfg = zoo.Z.gaester;
  const clips = guestCfg.film[randomInt(0, guestCfg.film.length - 1)];
  return {
    filmId: clips[randomInt(0, clips.length - 1)],
    spiller: null,
    raekke: randomInt(0, 1), // row (front/back)
    x: randomInt(0, worldWidth(zoo)),
    venstre: randomInt(0, 1) === 0, // walking left
  };
}

/** Spawns the initial guests (8 per built lot, at most 64) when there are none. */
export function ensureGuests(zoo) {
  if (zoo.gaester.length) {
    return;
  }
  const count = Math.min(8 * builtLotCount(zoo), 64);
  for (let index = 0; index < count; index++) {
    zoo.gaester.push(createGuest(zoo));
  }
}

/** Moves a guest one step and turns it around at the world edges. */
export function moveGuest(zoo, guest) {
  const step = Math.min(zoo.Z.gaester.maks, Math.trunc(zoo.Z.gaester.fart * TICK_MS / 1e3));
  if (guest.venstre) {
    guest.x -= step;
    if (guest.x < 0) {
      guest.venstre = false;
    }
  } else {
    guest.x += step;
    if (guest.x > worldWidth(zoo)) {
      guest.venstre = true;
    }
  }
}

/** A new random balloon. */
function createBalloon(zoo) {
  const balloonCfg = zoo.Z.balloner;
  const colorIndex = randomInt(0, balloonCfg.film.length - 1);
  return {
    farve: colorIndex, // colour
    film: 0, // 0 = floating, >0 = popping clip
    filmId: balloonCfg.film[colorIndex][0],
    spiller: null,
    raekke: randomInt(0, 1),
    x: randomInt(balloonCfg.xMin, worldWidth(zoo)),
  };
}

/** Screen position of a balloon. */
export const balloonPosition = (zoo, balloon) => ({ x: balloon.x, y: zoo.Z.balloner.y[balloon.raekke] });

/** Spawns a new balloon when the spawn timer is over and there are fewer than the allowed maximum. */
export function spawnBalloons(zoo, now) {
  now = Math.floor(now);
  if (!(now <= zoo.ballonTid)) {
    zoo.ballonTid = now + zoo.Z.balloner.spawn;
    if (zoo.balloner.length < 2 + Math.trunc((builtLotCount(zoo) + 1) / 2)) {
      zoo.balloner.push(createBalloon(zoo));
    }
  }
}

/** True while the balloon is floating (not yet popped). */
export const isBalloonIdle = (balloon) => balloon.film === 0;

// Pops a balloon: plays a random sound, starts the pop clip and gives the player a level-dependent coin reward (returned).
export function popBalloon(zoo, player, balloon) {
  const balloonCfg = zoo.Z.balloner;
  const soundGroup = randomInt(0, balloonCfg.lyde.length - 1);
  zoo.lyde.push(balloonCfg.lyde[soundGroup][randomInt(0, balloonCfg.lyde[soundGroup].length - 1)]);
  balloon.film = soundGroup + 1;
  balloon.filmId = balloonCfg.film[balloon.farve][balloon.film];
  balloon.spiller = zoo.film(balloon.filmId);
  if (balloon.spiller) {
    balloon.spiller.advance(0);
  }
  // Reward grows with the player's level but saturates towards ballonVariabel.
  const level = currentLevel(zoo);
  const reward = Math.trunc(zoo.Z.regler.ballonVariabel * level / (level + 10) + 1);
  player.faa(reward);
  return reward;
}

/** Removes all guests and balloons (e.g. when leaving the zoo). */
export function clearVisitors(zoo) {
  zoo.gaester = [];
  zoo.balloner = [];
}
