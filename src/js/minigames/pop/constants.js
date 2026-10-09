/**
 * Shared constants for the Popstars minigame: song phases, simulation tick length,
 * sound locations and the two clickable stage spots (roadie and songbook).
 */
// Phases of one song (concert): INTRO = narrator talks / audio loads, SPILLER = notes are falling and
// the player taps, JUBEL = crowd cheers after the last note, SLUT = finished, payout shown.
// (Property values are Danish strings that are also compared elsewhere; do not change them.)
export const SONG_PHASE = { INTRO: "intro", SPILLER: "spiller", JUBEL: "jubel", SLUT: "slut" };
// Fixed simulation step in milliseconds (the song logic runs at ~30 Hz regardless of frame rate).
export const TICK_MS = 33;
// Folder (relative to the page) holding the Popstars music tracks and preview clips.
export const SOUND_DIR = "data/pop/lyd";
// Sound ids (keys into the sound bank) used by the song logic: crowd cheer and coin payout.
export const STAGE_SOUNDS = { jubel: 995, penge: 976 };
// Sound id of the generic UI click.
export const CLICK_SOUND = 984;
// World position + animation ids of the roadie/lighting rig on the stage. Clicking it opens the stage shop.
// `film` = idle/reaction animations, `lys` = light animation, `billede` = sprite used as click target,
// `skift` = ms between random reaction attempts, `chance` = 1-in-N chance of a reaction per attempt.
export const ROADIE_SPOT = { x: 1229, y: 932, film: [15912, 15913, 15915], lys: 15914, billede: 4088, skift: 1e3, chance: 5 };
// Same as ROADIE_SPOT but for the songbook stand (opens the song list).
export const SONGBOOK_SPOT = { x: 973, y: 1016, film: [15846, 15849, 15847, 15848], billede: 7338, skift: 800, chance: 4 };
