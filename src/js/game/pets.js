// Pet (kaeledyr) rooms: pet levels and achievements, shop item stats, comfort level,
// per-tick pet behaviour (wandering, eating, bathing, playing) and collecting coin rewards.
// State lives on hotel floors as floor.kaeledyr = { dyr, boder, varer } (see createPetEntry).
import { Tween } from '../engine/tween.js';
import { addMoney } from './furniture-and-kitchen.js';
// Floor type id of the pet shop / pet room floor (see FLOOR_TYPES in hotel.js).
export const PET_FLOOR_TYPE = 8;
// Duration of one game tick in ms (~30 fps); all pet timers advance by this much per update.
export const TICK_MS = 33;
// Random integer in [min, max] inclusive.
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
// Purchase price of each pet species, indexed by pet number.
export const PET_PRICES = [400, 400, 450, 450, 450, 600, 500, 700, 450, 800, 900, 350, 1200, 1e3];
// Delay (ms) before a pet has a coin reward ready to collect again (2 minutes).
export const PET_REWARD_COOLDOWN_MS = 12e4;
// Coins collected from a pet, indexed by its comfort level (0..4).
export const PET_REWARD_BY_COMFORT = [16, 32, 56, 88, 128];
// Comfort points needed for comfort level 0..4 (see petComfortLevel).
export const COMFORT_POINT_THRESHOLDS = [0, 2, 4, 7, 10];
/**
 * Shop stats of pet item number `itemIndex` in stall `stallType` (0 food, 1 bath, 2 toys).
 * pris = price, kvalitet = comfort quality points, levetid = how long it lasts (ms),
 * stjerner = hotel star level needed to unlock it, gruppe = pet kind it is special for (-1 none).
 */
export function petItemStats(stallType, itemIndex) {
  const tier = Math.floor(itemIndex / 10);
  return { pris: 2 * (15 + 5 * itemIndex + 10 * stallType), kvalitet: 1 + tier, levetid: (15 + 15 * tier) * 6e4, stjerner: Math.floor(itemIndex / 6), gruppe: PET_ITEM_GROUPS[stallType] && PET_ITEM_GROUPS[stallType][itemIndex] != null ? PET_ITEM_GROUPS[stallType][itemIndex] : -1 };
}
// Points a pet needs to reach levels 1..10; beyond the last threshold a level is added every
// (last - second-to-last) points up to level 99.
const PET_LEVEL_THRESHOLDS = [20, 60, 120, 200, 300, 450, 650, 900, 1200, 1600];
// Solkroner reward for each pet achievement, indexed like petAchievementFlags.
const ACHIEVEMENT_REWARDS = [50, 100, 200, 75, 150, 300, 100, 200, 500, 750, 1e3];
// Pet items that "belong to" a specific pet kind (gives +1 comfort): [stallType][itemIndex] -> pet type id.
const PET_ITEM_GROUPS = { 0: { 18: 4 }, 1: { 0: 3, 3: 0, 5: 1, 7: 7, 13: 1, 14: 2, 25: 5 }, 2: { 24: 4 } };
// Pet level (0..99) for a pet's accumulated reward points.
export function petLevel(points) {
  const thresholds = PET_LEVEL_THRESHOLDS;
  let level = thresholds.filter((threshold) => threshold < points).length;
  const lastThreshold = thresholds[thresholds.length - 1];
  if (lastThreshold < points) {
    level += Math.trunc((points - lastThreshold) / (lastThreshold - thresholds[thresholds.length - 2]));
  }
  return Math.min(99, level);
}
// Trophy tier shown for a pet: its level capped at 10.
export const petTrophyLevel = (points) => Math.min(petLevel(points), 10);
// Progress 0..1 towards the pet's next level (drives the progress bar).
function petLevelProgress(points) {
  const thresholds = PET_LEVEL_THRESHOLDS, level = petLevel(points);
  if (level < thresholds.length) {
    const levelStart = level > 0 ? thresholds[level - 1] : 0;
    return Math.max(0, Math.min(1, (points - levelStart) / (thresholds[level] - levelStart)));
  }
  const step = thresholds[thresholds.length - 1] - thresholds[thresholds.length - 2];
  return (points - thresholds[thresholds.length - 1]) % step / step;
}
// Pet achievements are stored in state.bedrifter with ids starting at this offset.
const PET_ACHIEVEMENT_ID_OFFSET = 20;
// One boolean per pet achievement: number of pets, pets at max comfort, best pet level, pets at level 10+.
function petAchievementFlags(state) {
  const petFloors = state.etager.filter((floor) => floor.kaeledyr);
  const petCount = petFloors.length;
  const maxComfortCount = petFloors.filter((floor) => petComfortLevel(state, floor) >= COMFORT_POINT_THRESHOLDS.length - 1).length;
  const levels = petFloors.map((floor) => petLevel(floor.kaeledyr.dyr.point));
  const bestLevel = Math.max(0, ...levels);
  const level10Count = levels.filter((level) => level >= 10).length;
  return [petCount >= 1, petCount >= 2, petCount >= 4, maxComfortCount >= 1, maxComfortCount >= 2, maxComfortCount >= 4, bestLevel >= 3, bestLevel >= 5, bestLevel >= 10, level10Count >= 2, level10Count >= 4];
}
// Grants (once) the money and a reward notice (state.praemier) for every newly reached pet achievement.
export function awardPetAchievements(state) {
  if (state.kd) {
    state.bedrifter = state.bedrifter || [];
    state.praemier = state.praemier || [];
    petAchievementFlags(state).forEach((earned, index) => {
      if (!(!earned || state.bedrifter.includes(PET_ACHIEVEMENT_ID_OFFSET + index))) {
        state.bedrifter.push(PET_ACHIEVEMENT_ID_OFFSET + index);
        state.penge += ACHIEVEMENT_REWARDS[index];
        state.praemier.push({ i: index, beloeb: ACHIEVEMENT_REWARDS[index] });
      }
    });
  }
}
const petData = (state) => state.kd.dyr;
// Duration in ms of film (animation clip) number `t`; clip data stores it in 10 ms units.
const filmDurationMs = (state, filmIndex) => state.kd.film[filmIndex] ? state.kd.film[filmIndex][0] * 10 : 0;
// Species definition of a pet, and one of that species' animation clips.
const petAnimSet = (state, pet) => petData(state).film[pet.nr];
const petAnimFilm = (state, pet, filmIndex) => petAnimSet(state, pet).film[filmIndex];
// Creates a new pet of species `petNumber` with a random name and starting position; its reward is ready after REWARD delay.
function createPet(state, petNumber) {
  const petCatalog = petData(state), species = petCatalog.film[petNumber], names = petCatalog.navne[species.type] || [];
  return { nr: petNumber, navn: names.length ? names[randomInt(0, names.length - 1)] : "", x: randomInt(Math.trunc(state.data.verdensBredde / 16), Math.trunc(state.data.verdensBredde / 2)), maal: 0, anim: 0, film: 0, animTid: 0, venter: -1, behov: -1, venstre: true, bod: -1, boble: { film: 0, tid: 0 }, hjerte: { vis: false, tid: 0 }, klar: false, klarTid: state.tid + PET_REWARD_COOLDOWN_MS, point: 0, moentAlfa: new Tween(0, 30), animNr: 0, bjaelke: new Tween(0, 15) };
}
// Pet stall (food / bath / toy booth) state; film = current animation clip.
export const createPetStall = (stallType) => ({ type: stallType, film: 0, tid: 0, aktiv: false, nr: 0 });
// Pet-floor data: the pet itself (dyr), its three stalls (boder) and owned items (varer).
export const createPetEntry = (state, petNumber) => ({ dyr: createPet(state, petNumber), boder: [0, 1, 2].map(createPetStall), varer: [] });
// Comfort level 0..4 of a pet floor: sum of item quality (+1 per item matching the pet's kind) mapped through the thresholds.
export function petComfortLevel(state, floor) {
  if (!floor.kaeledyr) {
    return 0;
  }
  const petKind = petAnimSet(state, floor.kaeledyr.dyr).type, comfortPoints = floor.kaeledyr.varer.reduce((sum, item) => {
    const stats = petItemStats(item.type, item.f);
    return sum + stats.kvalitet + (stats.gruppe === petKind ? 1 : 0);
  }, 0);
  return Math.max(0, COMFORT_POINT_THRESHOLDS.filter((threshold) => threshold <= comfortPoints).length - 1);
}
// Starts (active) or stops a stall's working animation.
function setStallActive(stall, active) {
  stall.film = active ? 1 : 0;
  stall.tid = 0;
  stall.aktiv = active;
  stall.nr++;
}
// Plays the delivery animation of a stall and queues its delivery sound.
function deliverStall(state, stall) {
  stall.film = 2;
  stall.tid = 0;
  stall.aktiv = false;
  stall.nr++;
  state.lyde.push(state.kd.boder.levering[stall.type]);
}
// The owned item of the given stall type, if any.
const findPetItem = (entry, stallType) => stallType >= 0 ? entry.varer.find((item) => item.type === stallType) : null;
// Switches a pet to animation `animation` and plays the matching sound.
// Animation ids: 0 idle, 1 walk, 2/3 small idle acts, 4 eat, 6 waiting with a thought bubble (needs an item), 7 sleepy state, 8 bath, 9 furniture play, 10 toy play.
function setPetAnimation(state, entry, animation) {
  const pet = entry.dyr, sounds = petData(state).lyde;
  if (pet.anim = animation, pet.film = animation, pet.animTid = 0, pet.animNr++, animation === 4 || animation === 8 || animation === 10) {
    if (animation === 4) {
      state.lyde.push(sounds.spis[randomInt(0, sounds.spis.length - 1)]);
    } else if (animation === 8) {
      state.lyde.push(sounds.bad);
    } else {
      state.lyde.push(sounds.leg);
      const item = findPetItem(entry, pet.bod);
      if (item) {
        pet.film = 10 + item.f;
      }
    }
    if (entry.boder[pet.bod]) {
      setStallActive(entry.boder[pet.bod], true);
    }
    pet.venstre = true;
  } else if (animation === 9) {
    state.lyde.push(sounds.moebel);
  }
}
// Picks a random free furniture piece on the floor that suits the wanted behaviour bit.
function findFurnitureForPet(floor, wantedBit, bitsByFurnitureType) {
  const candidates = floor.moebler.filter((furniture) => furniture && !furniture.iBrug && furniture.feature >= 0 && (bitsByFurnitureType[furniture.type] || []).includes(wantedBit));
  return candidates.length ? candidates[randomInt(0, candidates.length - 1)] : null;
}
// One tick of the pet's behaviour state machine (idle wandering, walking to stalls/furniture, using them).
function updatePetBehavior(state, floor, entry, bitsByFurnitureType) {
  const species = petData(state), pet = entry.dyr;
  pet.animTid += TICK_MS;
  pet.boble.tid += TICK_MS;
  if (pet.hjerte.vis) {
    pet.hjerte.tid += TICK_MS;
    if (pet.hjerte.tid >= filmDurationMs(state, species.hjerte)) {
      pet.hjerte.vis = false;
    }
  }
  const animationDone = () => pet.animTid >= filmDurationMs(state, petAnimFilm(state, pet, pet.film));
  switch (pet.anim) {
    case 0: {
      if (pet.venter >= 1) {
        if (pet.venter === 4 || pet.venter === 8 || pet.venter === 10) {
          const item = findPetItem(entry, pet.bod);
          if (item) {
            item.aktiv = true;
            if (petItemStats(item.type, item.f).gruppe === petAnimSet(state, pet).type) {
              pet.hjerte = { vis: true, tid: 0 };
            }
          } else {
            pet.venter = 6;
            pet.boble = { film: entry.boder[pet.bod] ? entry.boder[pet.bod].type : 0, tid: 0 };
          }
        }
        setPetAnimation(state, entry, pet.venter);
        pet.venter = -1;
        return;
      }
      if (randomInt(0, 150) === 0) {
        const randomAnimation = species.tilfaeldige[randomInt(0, species.tilfaeldige.length - 1)];
        if (randomAnimation === 1) {
          pet.maal = randomInt(0, species.laengde);
        }
        setPetAnimation(state, entry, randomAnimation);
        return;
      }
      if (randomInt(0, 500) === 0) {
        const furnitureAnimation = species.moebel[randomInt(0, species.moebel.length - 1)], furniture = findFurnitureForPet(floor, species.moebelBit[furnitureAnimation], bitsByFurnitureType);
        if (!furniture) {
          return;
        }
        pet.maal = Math.max(0, Math.min(species.laengde, furniture.x - species.gulvDx));
        pet.venter = furnitureAnimation;
        setPetAnimation(state, entry, 1);
        return;
      }
      if (pet.behov > -1 || randomInt(0, 150) === 0) {
        const stallIndex = pet.behov > -1 ? pet.behov : randomInt(0, species.boder.length - 1);
        if (pet.behov = -1, !entry.boder[stallIndex]) {
          return;
        }
        pet.maal = Math.max(0, Math.min(species.laengde, getPetStallX(state, stallIndex) - species.gulvDx + species.bodDx[stallIndex]));
        pet.venter = species.boder[stallIndex];
        pet.bod = stallIndex;
        setPetAnimation(state, entry, 1);
      }
      return;
    }
    case 1: {
      const step = Math.min(16, Math.trunc(species.fart * TICK_MS / 1e3));
      if (Math.abs(pet.x - pet.maal) <= 3) {
        setPetAnimation(state, entry, 0);
        return;
      }
      pet.venstre = pet.x > pet.maal;
      pet.x += pet.venstre ? -step : step;
      return;
    }
    case 2:
    case 3:
      if (animationDone()) {
        setPetAnimation(state, entry, pet.venter >= 0 ? 1 : 0);
      }
      return;
    case 4:
    case 8:
    case 10:
      if (pet.venstre = true, entry.boder[pet.bod] && entry.boder[pet.bod].aktiv) {
        return;
      }
      {
        const item = findPetItem(entry, pet.bod);
        if (item) {
          item.aktiv = false;
        }
      }
      setPetAnimation(state, entry, 0);
      return;
    case 6:
      if (randomInt(0, 150) === 0) {
        setPetAnimation(state, entry, 0);
      }
      return;
    case 7:
      if (randomInt(0, 150) === 0) {
        setPetAnimation(state, entry, 2);
      }
      return;
    case 9:
      if (animationDone()) {
        setPetAnimation(state, entry, 0);
      }
      return;
  }
}
// X position of each pet stall (food, bath, toy) on a pet floor.
export const PET_STALL_X = [125, 280, 824];
// Y offset of the stalls and pet row from the floor's top.
export const PET_ROW_Y_OFFSET = 311;
// X position of stall `t` (first argument, the hotel state, is unused).
export const getPetStallX = (state, stallIndex) => PET_STALL_X[stallIndex];
// Advances stalls, owned-item timers and the pet each tick; behaviour only runs when `updateBehavior` is true.
export function updatePet(state, floor, bitsByFurnitureType, updateBehavior = true) {
  const petEntry = floor.kaeledyr;
  if (!petEntry || !state.kd || floor.status !== "faerdig") {
    return;
  }
  for (const stall of petEntry.boder) {
    stall.tid += TICK_MS;
    if (stall.aktiv && stall.tid >= filmDurationMs(state, state.kd.boder.film[1][stall.type])) {
      setStallActive(stall, false);
    }
  }
  petEntry.varer = petEntry.varer.filter((item) => (item.rest -= TICK_MS) > 0);
  const pet = petEntry.dyr;
  pet.moentAlfa.trin();
  pet.bjaelke.mod(petLevelProgress(pet.point));
  pet.bjaelke.trin();
  if (updateBehavior) {
    updatePetBehavior(state, floor, petEntry, bitsByFurnitureType);
    if (!pet.klar && state.tid >= pet.klarTid) {
      pet.klar = true;
      pet.moentAlfa.mod(255);
    }
  }
}
// Player taps the pet: if not ready it just reacts and returns 0, otherwise pays out coins by comfort level and returns the amount.
export function collectPetReward(state, floor) {
  const entry = floor.kaeledyr, pet = entry.dyr;
  if (state.tid < pet.klarTid) {
    setPetAnimation(state, entry, 3);
    const sounds = petData(state).lyde.goe[petAnimSet(state, pet).type] || [], sound = sounds[Math.min(petAnimSet(state, pet).race, sounds.length - 1)];
    if (sound) {
      state.lyde.push(sound);
    }
    const item = findPetItem(entry, pet.bod);
    if (item) {
      item.aktiv = false;
    }
    return 0;
  }
  const reward = PET_REWARD_BY_COMFORT[petComfortLevel(state, floor)], oldTrophyLevel = petTrophyLevel(pet.point);
  addMoney(state, reward);
  state.hentet += reward;
  pet.point += reward;
  if (petTrophyLevel(pet.point) > oldTrophyLevel) {
    state.lyde.push(state.kd.tavle.pokalLyd);
    state.nyPokal = true;
  }
  pet.klar = false;
  pet.moentAlfa.saet(0);
  pet.klarTid = state.tid + PET_REWARD_COOLDOWN_MS;
  return reward;
}
// Buys item `itemIndex` for stall `stallType` on a pet floor. Returns false when too poor, otherwise a script descriptor telling the caller which story script to run.
export function buyPetItem(state, floor, stallType, itemIndex) {
  const entry = floor.kaeledyr, stats = petItemStats(stallType, itemIndex);
  if (state.penge < stats.pris) {
    return false;
  }
  state.penge -= stats.pris;
  const oldComfort = petComfortLevel(state, floor);
  deliverStall(state, entry.boder[stallType]);
  entry.varer.push({ type: stallType, f: itemIndex, rest: stats.levetid, aktiv: false });
  entry.dyr.behov = stallType;
  return petComfortLevel(state, floor) === oldComfort ? { script: "varenSamme" } : { script: "varenBedre", v0: stats.gruppe === petAnimSet(state, entry.dyr).type ? stallType + 1 : 0 };
}
