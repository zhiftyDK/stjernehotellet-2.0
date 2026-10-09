/**
 * Song/rhythm engine of the Popstars minigame.
 *
 * A song is a list of timed notes spread over four lanes (one per band member). The state object
 * returned by createSongState is advanced in fixed TICK_MS steps (advanceSong) while the player taps
 * the lane buttons (pressLane). Notes fall from `fra` to `til` over `tabtid` ticks and may be hit when
 * they overlap the lane button. The module is pure game logic: no canvas, no audio, no DOM.
 *
 * State field cheat-sheet (Danish names are kept because they are shared with the JSON game data):
 *   tilstand = phase (SONG_PHASE), ur = song clock in ms, naeste = index of next note to spawn,
 *   rest = leftover ms below one tick, noder = active note per lane, succes = lane already pressed,
 *   lys = hit glow timer per lane, medlem = band member animation modes, rigtige/forkerte = hits/misses,
 *   sidenJubel = hits since last cheer, spor = per-track volume flag (0 after a miss), lyde = sound queue,
 *   effekt = pending payout effect, betalt = payout already claimed.
 */
import { SONG_PHASE, TICK_MS } from './constants.js';

// Easing for a falling note: slightly accelerating (t in 0..1).
const fallEasing = (t) => 2 * t - Math.sin(Math.PI / 2 * t);
// Smooth cosine fade 0..1 used for the note alpha.
const fadeInEasing = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
// Creates the mutable state for one song. `gameData` is data/pop/spil.json, `songIndex` picks the song,
// `lanes` maps the four screen lanes to instrument ids (7..10 are the playable instruments; lower ids are non-playing).
export function createSongState(gameData, songIndex = 0, lanes = [7, 8, 9, 10]) {
  const song = gameData.sange[songIndex];
  return { data: gameData, sang: songIndex, S: song, baner: lanes, tilstand: SONG_PHASE.INTRO, ur: 0, naeste: 0, rest: 0, noder: [null, null, null, null], succes: [false, false, false, false], lys: [-1, -1, -1, -1], medlem: [0, 1, 2, 3].map(() => ({ mode: "butik", tid: 0, nr: 0 })), rigtige: 0, forkerte: 0, sidenJubel: 0, spor: song.spor.map(() => 1), jubelTid: 0, lyde: [], effekt: null, betalt: false };
}
// Switches a band member animation mode ("butik" = shop idle, "hvile" = resting on stage, "spiller" = playing)
// and bumps `nr` so the renderer restarts the animation.
export const setMemberMode = (state, memberIndex, mode) => {
  const member = state.medlem[memberIndex];
  if (member.mode !== mode) {
    member.mode = mode;
    member.nr += 1;
  }
  member.tid = 0;
};
// Leaves the INTRO phase: starts the clock and puts every active member into the resting pose.
export function startSongPlay(state) {
  state.tilstand = SONG_PHASE.SPILLER;
  state.ur = 0;
  state.naeste = 0;
  for (let lane = 0; lane < 4; lane++) {
    if (state.baner[lane] != null) {
      setMemberMode(state, lane, "hvile");
    }
  }
}
// Coins earned so far: correct hits times the song's coin value per hit.
export const songEarnings = (state) => state.rigtige * state.S.moenter;
// Position, scale and alpha of the falling note `note` in `lane`, interpolated along the lane path
// (`fra` -> `til`, `skala` is a 16.16 fixed-point scale range).
export function computeNotePose(state, lane, note) {
  const noteCfg = state.data.noder;
  const progress = fallEasing(Math.min(1, note.trin / state.S.tabtid));
  const [fromX, fromY] = noteCfg.fra[lane];
  const [toX, toY] = noteCfg.til[lane];
  const [scaleFrom, scaleTo] = noteCfg.skala;
  return { x: fromX + (toX - fromX) * progress, y: fromY + (toY - fromY) * progress, skala: (scaleFrom + (scaleTo - scaleFrom) * progress) / 65536, alfa: fadeInEasing(note.trin / noteCfg.alfaTrin) };
}
// True while the lane still has a note that has not finished falling.
export const isNoteFalling = (state, lane) => !!state.noder[lane] && state.noder[lane].trin < state.S.tabtid;
// Spawns a new note in `lane` unless a note is still falling there; resets the lane's "already pressed" flag.
function spawnNote(state, lane) {
  if (!isNoteFalling(state, lane)) {
    state.noder[lane] = { trin: 0 };
    state.succes[lane] = false;
  }
}
// Advances the song by exactly one TICK_MS step: moves notes, glow timers and member animations,
// spawns notes that are due, and switches to JUBEL/SLUT when the song length is reached.
function advanceTick(state) {
  const songsData = state.data;
  for (let lane = 0; lane < 4; lane++) {
    const note = state.noder[lane];
    if (note && note.trin < state.S.tabtid) {
      note.trin += 1;
    }
    if (state.lys[lane] >= 0) {
      state.lys[lane] += TICK_MS;
    }
    const member = state.medlem[lane];
    member.tid += TICK_MS;
    if (member.mode === "spiller" && member.tid >= songsData.medlemSpiller) {
      member.mode = "hvile";
      member.nr += 1;
    }
  }
  if (state.tilstand === SONG_PHASE.SPILLER) {
    const songNotes = state.S.noder;
    for (; state.naeste < songNotes.length && songNotes[state.naeste][1] < state.ur + TICK_MS;) {
      const [noteTrack] = songNotes[state.naeste];
      for (let lane = 0; lane < 4; lane++) {
        if (state.baner[lane] === noteTrack) {
          spawnNote(state, lane);
        }
      }
      state.naeste += 1;
    }
    if (state.ur += TICK_MS, state.ur > state.S.laengde * 1e3) {
      state.tilstand = SONG_PHASE.JUBEL;
      state.jubelTid = 0;
      state.lyde.push("jubel");
      for (let lane = 0; lane < 4; lane++) {
        if (state.baner[lane] != null) {
          setMemberMode(state, lane, "butik");
        }
      }
      state.effekt = { beloeb: songEarnings(state) };
    }
  } else if (state.tilstand === SONG_PHASE.JUBEL) {
    state.jubelTid += TICK_MS;
    if (state.jubelTid >= songsData.efterSang) {
      state.tilstand = SONG_PHASE.SLUT;
    }
  }
}
// Advances the song by `dtMs` (clamped to 250 ms so a stalled tab cannot fast-forward), in fixed ticks.
export function advanceSong(state, dtMs) {
  for (state.rest += Math.min(dtMs, 250); state.rest >= TICK_MS;) {
    state.rest -= TICK_MS;
    advanceTick(state);
  }
}
// Handles a tap on `lane`. Each lane can be pressed once per note. `noteHitsButton(lane, note)` tells whether the
// falling note currently overlaps the lane button. Returns "rigtigt" (hit), "forkert" (miss) or null (ignored).
// A hit may queue a crowd cheer; a miss queues a "wrong note" sound and mutes that instrument track.
export function pressLane(state, lane, noteHitsButton) {
  if (state.tilstand !== SONG_PHASE.SPILLER || lane < 0 || state.succes[lane]) {
    return null;
  }
  state.succes[lane] = true;
  const track = state.baner[lane];
  if (track == null || track < 7) {
    return null;
  }
  const trackIndex = track - 7;
  if (state.noder[lane] && noteHitsButton(lane, state.noder[lane])) {
    state.lys[lane] = 0;
    setMemberMode(state, lane, "spiller");
    state.spor[trackIndex] = 1;
    state.rigtige += 1;
    state.sidenJubel += 1;
    const cheerCfg = state.data.jubel;
    if (state.sidenJubel >= cheerCfg.rigtige && Math.floor(Math.random() * cheerCfg.chance) === 0) {
      state.lyde.push("jubel");
      state.sidenJubel = 0;
    }
    return "rigtigt";
  }
  setMemberMode(state, lane, "butik");
  state.lyde.push({ falsk: trackIndex + 1 });
  state.spor[trackIndex] = 0;
  state.forkerte += 1;
  return "forkert";
}
// Returns the coins to pay out (once per song) or null if already paid.
export function claimPayout(state) {
  if (state.betalt) {
    return null;
  }
  state.betalt = true;
  return songEarnings(state);
}
