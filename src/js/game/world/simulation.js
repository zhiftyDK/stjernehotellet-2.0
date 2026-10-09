/**
 * Zoo minigame: the fixed-step simulation loop (one step every TICK_MS) and clip advancing.
 */

import { updateAnimal } from './animals.js';
import { TICK_MS } from './common.js';
import { updateLotAnimation } from './lots.js';
import { ensureGuests, moveGuest, spawnBalloons } from './visitors.js';

/** One fixed simulation step: slot fades, animals, lot animation, balloons and guests. */
function simulationStep(zoo, now) {
  for (const slot of [...zoo.sev, ...zoo.boder]) {
    if (!slot.klar && now > slot.slut) {
      slot.klar = true;
      slot.alfa.mod(255);
    } else if (slot.klar && now <= slot.slut) {
      slot.klar = false;
      slot.alfa.mod(0);
    }
    slot.alfa.trin();
  }
  for (const animal of zoo.dyr) {
    animal.alfa.mod(zoo.sev[animal.sev].bygger ? 0 : 255);
    animal.alfa.trin();
    if (animal.leveret && !animal.spiller) {
      animal.spiller = zoo.film(animal.filmId);
      if (animal.spiller) {
        animal.spiller.advance(0);
      }
    }
    updateAnimal(zoo, animal);
  }
  updateLotAnimation(zoo, now);
  spawnBalloons(zoo, now);
  for (const balloon of [...zoo.balloner]) {
    if (balloon.film > 0 && (!balloon.spiller || balloon.spiller.finished)) {
      zoo.balloner.splice(zoo.balloner.indexOf(balloon), 1);
    }
  }
  ensureGuests(zoo);
  for (const guest of zoo.gaester) {
    moveGuest(zoo, guest);
  }
  for (const visitor of [...zoo.gaester, ...zoo.balloner]) {
    if (!visitor.spiller) {
      visitor.spiller = zoo.film(visitor.filmId);
      if (visitor.spiller) {
        visitor.spiller.advance(0);
      }
    }
  }
}

// Per-frame update: advances clip players by `elapsedMs` and runs as many fixed simulation steps as fit (max 250 ms catch-up).
export function updateZoo(zoo, elapsedMs, now) {
  for (const animal of zoo.dyr) {
    if (animal.spiller) {
      animal.spiller.advance(elapsedMs);
    }
    if (animal.poof) {
      animal.poof.advance(elapsedMs);
      if (animal.poof.finished) {
        animal.poof = null;
      }
    }
  }
  for (const visitor of [...zoo.gaester, ...zoo.balloner]) {
    if (visitor.spiller) {
      visitor.spiller.advance(elapsedMs);
    }
  }
  for (zoo.rest += Math.min(elapsedMs, 250); zoo.rest >= TICK_MS;) {
    zoo.rest -= TICK_MS;
    simulationStep(zoo, now);
  }
}
