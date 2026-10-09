/**
 * Zoo minigame: animals and nests.
 *
 * Animals live at an attraction and go through forms 0..3 (the next form is bought per attraction in order).
 * Forms >= 2 are babies that need a free nest while they grow ("leveret" = delivered, i.e. fully arrived).
 * A delivered animal runs a small state machine (see setAnimalState / updateAnimal).
 */

import { Tween } from '../../engine/tween.js';
import { TICK_MS, randomInt } from './common.js';
import { attractionSlotPosition, animalConfig, isAdultStage } from './config-lookups.js';
import { spendAndScore } from './score-and-levels.js';

/** Creates the nests; only the first one starts unlocked. */
export function createNests(zooConfig) {
  return Array.from({ length: zooConfig.rede.antal }, (_slot, index) => ({ nr: index, laast: index > 0, sev: -1, f: -1 }));
}

/** All animals living at the given attraction slot. */
export const animalsAtAttraction = (zoo, attractionIndex) => zoo.dyr.filter((animal) => animal.sev === attractionIndex);

/** Walking path of an animal (list of [x, y] points), depending on adult/baby stage. */
export const animalPath = (zoo, animal) => zoo.Z.dyr.stier[isAdultStage(animal.f) ? "voksen" : "unger"][animal.type];

/** Creates the runtime animal object from saved data. */
export function createAnimal(zoo, data) {
  const path = zoo.Z.dyr.stier[isAdultStage(data.f) ? "voksen" : "unger"][data.type];
  const animal = {
    ...data,
    maal: 0, // walking target x (relative to the path start)
    pos: randomInt(0, path[path.length - 1][0] - path[0][0]), // random start x along the path
    tilstand: data.leveret ? 1 : 0, // behaviour state, see setAnimalState
    naeste: 1, // state to enter after the current walk/clip
    tael: 0, // idle tick counter
    spejl: Math.random() < 0.5, // mirrored (facing left)
    film: 0,
    spiller: null,
    filmId: 0,
    alfa: new Tween(0, 15), // fade in/out while the attraction is being built
    poof: null, // "poof" smoke clip played when the animal arrives
  };
  if (animal.leveret) {
    playAnimalClip(zoo, animal, 0);
  }
  return animal;
}

/** Switches the animal to animation clip `clipIndex` of its type/form and restarts it. */
function playAnimalClip(zoo, animal, clipIndex) {
  const clipId = zoo.Z.dyr.film[animal.type][animal.f][clipIndex];
  animal.film = clipIndex;
  animal.filmId = clipId;
  animal.spiller = zoo.film(clipId);
  if (animal.spiller) {
    animal.spiller.advance(0);
  }
}

// Enters a behaviour state: 1 idle, 2 and 4 one-off animations, 3 walking to the target,
// 5/6 special actions at the right/left end of the path (lock the attraction action while playing).
function setAnimalState(zoo, animal, newState) {
  animal.tilstand = newState;
  const attraction = zoo.sev[animal.sev];
  if (newState === 1) {
    playAnimalClip(zoo, animal, 0);
  } else if (newState === 2) {
    playAnimalClip(zoo, animal, 1);
  } else if (newState === 3) {
    animal.spejl = animal.maal < animal.pos;
    playAnimalClip(zoo, animal, 2);
  } else if (newState === 4) {
    playAnimalClip(zoo, animal, 3);
  } else if (newState === 5) {
    attraction.handling[0] = true;
    animal.spejl = false;
    playAnimalClip(zoo, animal, 4);
  } else if (newState === 6) {
    attraction.handling[1] = true;
    animal.spejl = false;
    playAnimalClip(zoo, animal, 5);
  }
}

/** True if the animal has no clip or its clip has finished. */
const isClipFinished = (animal) => !animal.spiller || animal.spiller.finished;

/** Current position of an animal (or of its heart sign while it has not been delivered). */
export function animalPosition(zoo, animal) {
  const slotPos = attractionSlotPosition(zoo.Z, animal.sev);
  // Not delivered yet: the animal is represented by a "heart sign" next to the attraction.
  if (!animal.leveret) {
    const signOffset = zoo.Z.sevaerdighed.hjerteskilt;
    return { x: slotPos.x + signOffset.x, y: slotPos.y + signOffset.y };
  }
  const path = animalPath(zoo, animal);
  const x = Math.max(animal.pos + path[0][0], path[0][0] + 1);
  // Find the path segment containing x and interpolate y linearly inside it.
  let segment = 1;
  for (; segment < path.length - 1 && path[segment][0] < x;) {
    segment++;
  }
  const [prevPoint, nextPoint] = [path[segment - 1], path[segment]];
  return {
    x: slotPos.x + x,
    y: slotPos.y + prevPoint[1] + (x - prevPoint[0]) * (nextPoint[1] - prevPoint[1]) / (nextPoint[0] - prevPoint[0]),
  };
}

/** One simulation step of an animal: idle timer, random choice of next action, walking and clip handling. */
export function updateAnimal(zoo, animal) {
  const attraction = zoo.sev[animal.sev];
  if (!animal.leveret) {
    return;
  }
  const path = animalPath(zoo, animal);
  const pathLength = path[path.length - 1][0] - path[0][0];
  switch (animal.tilstand) {
    case 1: {
      if (animal.tael += 1, animal.tael < zoo.Z.dyr.ventetal || (animal.tael = 0, randomInt(0, 16) !== 0)) {
        break;
      }
      const roll = randomInt(0, 65536) / 65536;
      if (roll < 0.33) {
        animal.maal = randomInt(0, pathLength);
        setAnimalState(zoo, animal, 3);
      } else if (roll < 0.5) {
        setAnimalState(zoo, animal, 2);
      } else if (roll < 0.7) {
        setAnimalState(zoo, animal, 4);
      } else if (roll < 0.85) {
        if (!attraction.handling[0]) {
          animal.maal = pathLength;
          setAnimalState(zoo, animal, 3);
          animal.naeste = 5;
        }
      } else if (!attraction.handling[1]) {
        animal.maal = 0;
        setAnimalState(zoo, animal, 3);
        animal.naeste = 6;
      }
      break;
    }
    case 3:
      if (animal.maal !== animal.pos) {
        const stepSize = Math.max(1, Math.trunc(Math.min(Math.abs(animal.maal - animal.pos), zoo.Z.dyr.fart) * (TICK_MS / 33)));
        animal.pos += animal.maal > animal.pos ? stepSize : -stepSize;
        if ((animal.maal - animal.pos) * (animal.maal > animal.pos ? 1 : -1) < 0) {
          animal.pos = animal.maal;
        }
      } else {
        setAnimalState(zoo, animal, animal.naeste);
        animal.naeste = 1;
      }
      break;
    case 2:
    case 4:
      if (isClipFinished(animal)) {
        setAnimalState(zoo, animal, animal.naeste);
        animal.naeste = 1;
      }
      break;
    case 5:
    case 6:
      if (isClipFinished(animal)) {
        attraction.handling[animal.tilstand - 5] = false;
        setAnimalState(zoo, animal, animal.naeste);
        animal.naeste = 1;
      }
      break;
  }
}

/** The next animal form that can be bought for this attraction ({type, f}), or null when all are owned. */
export function nextAnimalOffer(zoo, attractionIndex) {
  const attraction = zoo.sev[attractionIndex];
  if (!attraction || attraction.type === 0) {
    return null;
  }
  const nextForm = Math.max(-1, ...animalsAtAttraction(zoo, attractionIndex).map((animal) => animal.f)) + 1;
  return nextForm > 3 ? null : { type: attraction.type, f: nextForm };
}

/** True if the attraction has an animal to buy or one still waiting to be delivered (shows the heart sign). */
export const hasAnimalActions = (zoo, attractionIndex) =>
  !!nextAnimalOffer(zoo, attractionIndex) || animalsAtAttraction(zoo, attractionIndex).some((animal) => !animal.leveret);

// Buys the next animal for an attraction. Babies (form >= 2) need a free, unlocked nest. Returns true / false / "penge".
export function buyAnimal(zoo, player, attractionIndex, now, nestIndex = -1) {
  const offer = nextAnimalOffer(zoo, attractionIndex);
  if (!offer) {
    return false;
  }
  const nest = zoo.reder[nestIndex];
  if (!isAdultStage(offer.f) && (!nest || nest.laast || nest.sev >= 0)) {
    return false;
  }
  const animalCfg = animalConfig(zoo.Z, offer.type, offer.f);
  if (spendAndScore(zoo, player, animalCfg.pris)) {
    zoo.naesteId += 1;
    zoo.dyr.push(createAnimal(zoo, { id: zoo.naesteId, sev: attractionIndex, ...offer, slut: now + animalCfg.byggetid, leveret: false }));
    if (!isAdultStage(offer.f)) {
      nest.sev = attractionIndex;
      nest.f = offer.f;
    }
    return true;
  }
  return "penge";
}

/** Unlocks a nest for money. Returns true / false / "penge". */
export function unlockNest(zoo, player, nestIndex) {
  const nest = zoo.reder[nestIndex];
  if (!nest || !nest.laast) {
    return false;
  }
  if (!spendAndScore(zoo, player, zoo.Z.regler.reder[nestIndex])) {
    return "penge";
  }
  nest.laast = false;
  return true;
}

/** The bought-but-not-yet-delivered animal matching an offer, or null. */
export const pendingAnimalFor = (zoo, offer) =>
  offer.sev < 0 ? null : zoo.dyr.find((animal) => animal.sev === offer.sev && animal.f === offer.f && !animal.leveret) || null;

/** Animation clip for a nest, depending on the attraction type it is used for. */
export function nestClip(zoo, nest) {
  const nestClips = zoo.Z.rede.film;
  const attractionType = nest.sev >= 0 && zoo.sev[nest.sev] ? zoo.sev[nest.sev].type : 0;
  return nestClips[attractionType] || nestClips[0];
}

/** Handles a tap on an animal: delivers it when its timer has finished, otherwise plays the reaction animation. */
export function tapAnimal(zoo, animal, now) {
  if (animal.tilstand !== 4) {
    if (!animal.leveret) {
      if (now < animal.slut) {
        return;
      }
      if (animal.leveret = true, animal.slut = 0, !isAdultStage(animal.f)) {
        const nest = zoo.reder.find((candidate) => candidate.sev === animal.sev);
        if (nest) {
          nest.sev = -1;
          nest.f = -1;
        }
      }
      animal.poof = zoo.film(zoo.Z.sevaerdighed.byg[2]);
      if (animal.poof) {
        animal.poof.advance(0);
      }
      setAnimalState(zoo, animal, 1);
      zoo.lyde.push(zoo.Z.lyde.faerdig);
      return;
    }
    animal.naeste = 1;
    playAnimalClip(zoo, animal, 3);
    animal.tilstand = 4;
    zoo.lyde.push(zoo.Z.dyr.lyd[animal.type]);
  }
}
