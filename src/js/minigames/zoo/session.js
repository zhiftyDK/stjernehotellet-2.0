// Zoo minigame: session persistence (save/load key, live session holder, clock).

import { serializeZooState } from '../../game/world.js';

/** Holder for the live zoo; it outlives the game element so the game resumes where it was after a remount.
 *  `s` = zoo game state, `kam` = camera position {x, y}. */
export const zooSessionRef = { current: null };

/** localStorage key under which the zoo is persisted. */
export const SAVE_KEY = "zoo-gemt-v2";

/** Saves the live zoo state plus camera position to localStorage (storage errors are ignored). */
export const saveZooToStorage = () => {
  if (!zooSessionRef.current) {
    return;
  }
  const { s: zooState, kam: camera } = zooSessionRef.current;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...serializeZooState(zooState), kam: camera }));
  }
  catch {
  }
};

/** Flags that live for the whole page session. `welcomeShown`: the narrator's welcome line was already played. */
export const sessionFlags = { welcomeShown: false };

/** Current wall-clock time in whole seconds (the zoo's timers are stored as epoch seconds). */
export const nowSeconds = () => Math.floor(Date.now() / 1e3);
