/**
 * Popstars ("Pop") minigame: the player runs a pop band. In the shop view they buy stage items, clothes and new
 * band members and pick a song; in the concert view notes fall down four lanes and must be tapped in time.
 * Earnings, points and levels are saved in localStorage (see pop/band-state.js).
 *
 * This file is the entry point (default export createPopGame) and holds the factory with the big game
 * closure (assets -> state -> windows -> per-frame update/draw). The pieces live in ./pop/:
 *   constants.js          shared constants          song-engine.js     rhythm/song state machine
 *   band-state.js         save data + purchases     levels.js          level & leaderboard maths
 *   scenery.js            sky and crowd             assets.js          data/texture loading     
 *   sprite-draw.js        canvas draw helpers       input.js           pointer + keyboard handling
 *   shop-windows.js, band-windows.js, leaderboard-window.js   UI windows
 */
import { HUD_SHIFT } from '../engine/constants.js';
import { createSoundBank } from '../loaders/data-loaders.js';
import { createNarrator, registerAudioElement, soundUrl, POP_MUSIC_LATENCY_MS, computeElementVolume } from '../audio/audio.js';
import { createFigureOverlay, getAnimationBounds, drawCurrencyHud } from '../render/canvas-helpers.js';
import { createUiKit, WindowStack, createLoadingScreen, centeredUi } from './ui-kit.js';
import { Tween, FRAME_MS, AcceleratingValue } from '../engine/tween.js';
import { AnimationPlayer } from '../engine/animation.js';
import { tutorials } from '../game/save.js';
import { formatDuration } from '../game/world.js';
import { createInstructionPanel } from '../ui/panels.js';
import { drawPriceTag, createDialogs } from '../game/world-init.js';
import { createKineticScroll } from '../engine/kinetic-scroll.js';
import { SONG_PHASE, SOUND_DIR, STAGE_SOUNDS, CLICK_SOUND, ROADIE_SPOT, SONGBOOK_SPOT } from './pop/constants.js';
import { randomBetween } from './pop/util.js';
import { createSongState, startSongPlay, computeNotePose, advanceSong, pressLane, claimPayout } from './pop/song-engine.js';
import { loadSave, persistSave, nowSeconds, isUnderConstruction, constructionSecondsLeft, memberOutfit, bandInstruments, useConcertAttempt, concertCooldownLeft, recordConcertResult, buySong, createLocalWallet } from './pop/band-state.js';
import { levelFromPoints, levelProgress, leaderboardRank } from './pop/levels.js';
import { createSky, createAudience } from './pop/scenery.js';
import { drawSprite, drawAnimation, drawTileGrid } from './pop/sprite-draw.js';
import { createShopWindows } from './pop/shop-windows.js';
import { createBandWindows } from './pop/band-windows.js';
import { createLeaderboardWindow } from './pop/leaderboard-window.js';
import { h, removeEl } from '../dom.js';
import { loadPopAssets } from './pop/assets.js';
import { createPopInput } from './pop/input.js';

// Module state that survives re-mounting the minigame within one page session:
// whether the welcome narration was played, the last concert score (for the better/worse arrow) and the camera position.
let welcomePlayed = false;
let lastConcertScore = 0;
let savedCameraPos = null;

/**
 * @param {object} props
 * @param {number} props.bredde  canvas width (the height is always 768)
 * @param {boolean} props.pause  host game is paused
 * @param {boolean} props.lydTil  sound enabled
 * @param {object} props.skrift  bitmap font renderer
 * @param {object} props.ui  loaded UI package ({pakke, hud})
 * @param {object} props.pung  shared wallet (balance `penge`, brug(), faa())
 * @param {object} props.skilt  hook object whose skift(fn) registers the leave-minigame handler
 */
function createPopGame(props = {}) {
  const screenWidth = props.bredde ?? 1280;
  let paused = props.pause ?? false;
  let soundOn = props.lydTil ?? true;
  let font = props.skrift ?? null;
  let ui = props.ui ?? null;
  let sharedWallet = props.pung ?? null;
  let leaveHook = props.skilt ?? null;
  // Plain variables the long-lived animation-frame closure and the input handlers read (they replace the old
  // refs that mirrored props): `assets` once loaded, the interface `api` the running game publishes (see
  // pop/input.js) and the narrator of the running game.
  let assets = null;
  let api = null;
  let currentNarrator = null;
  let canvas = null;
  let stopGame = null;
  let input = null;
  let destroyed = false;
  // el is a stable root; display: contents keeps the loading canvas / message / play surface laid out exactly as if
  // they were direct children of the minigame area.
  const el = h("div", { style: { display: "contents" } });
  let loading = createLoadingScreen({ bredde: screenWidth });
  el.append(loading.el);
  // Starts the whole game once assets and the UI package are ready. Returns a cleanup that stops audio, the frame
  // loop and listeners.
  const startGame = () => {
    // --- Game data and persistent state ---
    const gameData = assets.spil;
    const manifest = assets.manifest;
    const images = assets.images;
    const texts = assets.tekster;
    const bandData = gameData.butik;
    const wallet = sharedWallet || createLocalWallet(bandData.startPenge);
    const itemData = gameData.genstande;
    const clothingData = gameData.toej;
    const save = loadSave(itemData, clothingData);
    const persist = () => persistSave(save);
    const sounds = createSoundBank([...Object.values(STAGE_SOUNDS), CLICK_SOUND, ...gameData.lyde.falsk.filter(Boolean), gameData.lyde.hitliste, gameData.lyde.niveau, gameData.lyde.publikum, gameData.lyde.ventetidSlut]);
    sounds.saetTil(soundOn);
    // --- Sound: looping crowd noise whose volume depends on the phase (shop / song / after) ---
    let audienceVolume = gameData.lyde.publikumStyrke.scene;
    const startAudienceLoop = () => {
      sounds.loekke(gameData.lyde.publikum);
      sounds.volumen(gameData.lyde.publikum, audienceVolume);
    };
    startAudienceLoop();
    // --- Narrator (speech with talking figures) ---
    // `say(eventKeyOrId, startOffset)` plays a narrator line by event name (index into narratorCfg.haendelser) or numeric id.
    const narratorCfg = texts.hoveder;
    const narrator = createNarrator(assets.fortaeller, Math.round((screenWidth - 1024) / 2));
    const figureTalk = [0, 0, 0, 0, 0];
    if (narrator) {
      narrator.saetLyd(soundOn);
      narrator.figur = (figureIndex, value) => {
        if (figureIndex >= 0 && figureIndex < figureTalk.length) {
          figureTalk[figureIndex] = value;
        }
      };
    }
    currentNarrator = narrator;
    const figureOverlay = createFigureOverlay(manifest, images, narratorCfg, screenWidth - 1280);
    const say = (eventKey, startOffset) => {
      const eventId = typeof eventKey == "number" ? eventKey : narratorCfg.haendelser[eventKey];
      if (!(!narrator || eventId === void 0)) {
        figureTalk.fill(0);
        narrator.spil(eventId);
        if (startOffset !== void 0) {
          narrator.saet(0, startOffset);
        }
        narrator.slump();
      }
    };
    // --- Animation helpers ---
    // animCache: one shared player per cache key (advanced every frame in `frame`); makeAnim: fresh independent player.
    const animById = new Map(manifest.animations.map((anim) => [anim.id, anim]));
    const animCache = new Map();
    const cachedAnim = (cacheKey, animId) => {
      let entry = animCache.get(cacheKey);
      if (!entry || entry.id !== animId) {
        const animDef = animById.get(animId);
        entry = { id: animId, p: animDef ? new AnimationPlayer(animDef) : null };
        if (entry.p) {
          entry.p.advance(0);
        }
        animCache.set(cacheKey, entry);
      }
      return entry.p;
    };
    const makeAnim = (animId, advanceMs = 0) => {
      const animDef = animById.get(animId);
      const player = animDef ? new AnimationPlayer(animDef) : null;
      if (player) {
        player.advance(advanceMs);
      }
      return player;
    };
    // Sprite replacement map that dresses a band member: for every worn clothing piece, swap the base figure's part
    // sprite for the piece's variant sprite.
    const outfitOverrides = (pieces) => {
      const overrides = new Map();
      for (const piece of pieces) {
        for (const partKey of clothingData.typeDele[piece.type] || []) {
          overrides.set(clothingData.kilde[partKey], clothingData.dele[partKey][piece.f % clothingData.dele[partKey].length]);
        }
      }
      return overrides;
    };
    // Index into the member films for the instrument worn (0 when none).
    const instrumentFilmIndex = (pieces) => {
      const instrumentPiece = pieces.find((piece) => piece.type >= 7);
      return instrumentPiece ? clothingData.instrumentFilm[instrumentPiece.type] : 0;
    };
    // --- Backdrop: random crowd reaction animations at the roadie and songbook spots, sky and audience ---
    const crowdReactors = [ROADIE_SPOT, SONGBOOK_SPOT].map((spot) => ({ C: spot, nr: 0, tid: 0, p: cachedAnim(`crowd${spot.x}`, spot.film[0]) }));
    const roadieLight = cachedAnim("roadielys", ROADIE_SPOT.lys);
    const sky = createSky(gameData.himmel, makeAnim, screenWidth);
    const audience = createAudience(gameData.publikum, makeAnim);
    const tickCrowdReactors = (dtMs) => {
      for (const reactor of crowdReactors) {
        reactor.tid += dtMs;
        if (reactor.tid > reactor.C.skift) {
          reactor.tid -= reactor.C.skift;
          if (reactor.nr === 0 && randomBetween(0, reactor.C.chance) === 0) {
            reactor.nr = randomBetween(1, reactor.C.film.length - 1);
            reactor.p = cachedAnim(`crowd${reactor.C.x}-${reactor.nr}`, reactor.C.film[reactor.nr]);
            if (reactor.p) {
              reactor.p.reset();
              reactor.p.advance(0);
            }
          }
        }
        if (reactor.nr !== 0 && (!reactor.p || reactor.p.finished)) {
          reactor.nr = 0;
          reactor.p = cachedAnim(`crowd${reactor.C.x}`, reactor.C.film[0]);
        }
      }
    };
    // --- Canvas, UI kit and window stack ---
    // `windows` is the stack of modal windows (shop, songbook, member, leaderboard ...) drawn above the scene.
    const ctx = canvas.getContext("2d");
    const uiPackage = ui.pakke.U;
    const uiKit = createUiKit(ctx, { ui: { M: ui.pakke.M, I: ui.pakke.I }, pop: { M: manifest, I: images, anims: animById } }, uiPackage, font);
    const windows = new WindowStack(centeredUi(uiPackage, screenWidth));
    // Instruction (tutorial) panel; opening it makes the narrator replay the matching speech.
    const instructionWindow = (page, onClosed = null) => createInstructionPanel({ V: texts.vejledning, nr: page, pakke: "pop", lukket: onClosed, laes: (step, extra) => {
        if (narrator) {
          figureTalk.fill(0);
          narrator.startForfra(step, { 0: extra });
        }
      } });
    // Opens tutorial page `tutorialNumber` the first time only. Returns true if it was opened.
    const showTutorialOnce = (tutorialNumber, onClosed = null) => tutorials.har(`pop${tutorialNumber}`) ? false : (tutorials.saet(`pop${tutorialNumber}`), windows.aabn(instructionWindow(tutorialNumber, onClosed)), true);
    if (!showTutorialOnce(6) && !welcomePlayed) {
      welcomePlayed = true;
      say("velkomst");
    }
    // --- Generic dialogs and shop helpers ---
    const { dialog: confirmDialog, besked: messageBox } = createDialogs(uiPackage);
    // Yes/no dialog that runs `action()` (a purchase returning true | false | "penge" = not enough money);
    // on success it saves, closes all windows and calls `afterSuccess`.
    const purchaseDialog = (title, question, action, afterSuccess = null) => confirmDialog(question, () => {
      const result = action();
      if (result === "penge") {
        windows.aabn(messageBox(title, texts.ikkeNok));
      } else if (result) {
        persist();
        windows.lukAlle();
        if (afterSuccess) {
          afterSuccess();
        }
      }
    }, { titel: title });
    // Slot helpers: slots are positions on the stage (world coordinates are offset by the stage origin 512,256).
    const kronerPerPoint = itemData.kronerPrPoint;
    const findSlot = (slotId) => itemData.pladser.find((slot) => slot.id === slotId);
    const slotWorldPos = (slot) => ({ x: 512 + slot.x, y: 256 + slot.y });
    // Items currently placed on the stage, back to front.
    const placedItems = () => save.genstande.filter((item) => item.plads >= 0 && findSlot(item.plads)).sort((itemA, itemB) => itemData.z[itemA.type] - itemData.z[itemB.type] || itemA.plads - itemB.plads);
    // True when the ware needs a higher player level than the player has.
    const isLockedByLevel = (ware) => ware.niveau > levelFromPoints(gameData.niveau.graenser, save.point);
    // Small icon followed by a text label (used for build time).
    const drawIconText = (draw, iconSprite, text, x, y) => {
      draw.sprite("ui", iconSprite, x + 18, y, { skala: 0.55 });
      draw.tekst(text, x + 40, y, { str: 19 });
    };
    // Stage shop windows (buy/place items, skip build wait / concert cooldown).
    const { itemShopWindow, roadieWindow, skipBuildWindow, skipCooldownWindow } = createShopWindows({ itemData, makeAnim, save, wallet, drawIconText, uiPackage, isLockedByLevel, texts, findSlot, messageBox, persist, say, gameData, manifest, placedItems, font });
    // Starts a concert: consumes an attempt; when the cooldown is active offers to skip it instead.
    // The first-ever concert shows the concert tutorial before starting.
    const startConcertAttempt = (songIndex, windowStack) => {
      const attempt = useConcertAttempt(gameData.koncert, save, nowSeconds());
      if (persist(), attempt === "vent") {
        windowStack.aabn(skipCooldownWindow());
        return;
      }
      windowStack.lukAlle();
      if (!showTutorialOnce(9, () => beginConcert(songIndex))) {
        beginConcert(songIndex);
      }
    };
    // --- Songbook: 30 s preview clips and the song list window ---
    let previewAudio = null;
    let previewSongIndex = -1;
    const togglePreview = (songIndex) => {
      const wasPlaying = previewAudio && !previewAudio.paused && !previewAudio.ended;
      if (previewAudio && previewAudio.pause(), wasPlaying && previewSongIndex === songIndex) {
        previewSongIndex = -1;
        return;
      }
      const file = texts.forhaand[songIndex];
      if (!(!file || !soundOn)) {
        previewAudio = registerAudioElement(new Audio(soundUrl(SOUND_DIR, file)), soundUrl(SOUND_DIR, file));
        previewSongIndex = songIndex;
        previewAudio.play().catch(() => {
        });
      }
    };
    // Song list: preview button, title, length, and either a price tag (locked) or play on tap.
    const songbookWindow = () => ({ titel: texts.sangbog, tegn(draw, rect, windowStack) {
        gameData.sange.forEach((song, songIndex) => {
          const rowY = rect.y + 40 + songIndex * 72;
          const owned = save.sange[songIndex];
          draw.ramme("punkt", rect.x + 40, rowY, rect.w - 92, 64);
          draw.spriteKnap(uiPackage.ikoner.afspil, rect.x + 40 + 64 / 2, rowY + 64 / 2, () => togglePreview(songIndex));
          draw.tekst(texts.sange[songIndex], rect.x + 128, rowY + 24, { str: 22 });
          draw.tekst(`${song.laengde} s`, rect.x + 128, rowY + 48, { str: 16 });
          if (owned) {
            draw.sprite("ui", uiPackage.ikoner.jaLille, rect.x + rect.w - 100, rowY + 72 / 2 - 4);
          } else {
            drawPriceTag(draw, bandData.sangPris[songIndex], rect.x + rect.w - 190, rowY + 72 / 2 - 4, wallet.penge >= bandData.sangPris[songIndex]);
          }
          draw.knap({ x0: rect.x + 120, y0: rowY, x1: rect.x + rect.w - 52, y1: rowY + 72 - 8 }, () => {
            if (previewAudio) {
              previewAudio.pause();
            }
            if (owned) {
              windowStack.aabn(confirmDialog(texts.spilSang, () => startConcertAttempt(songIndex, windowStack), { titel: texts.koncert }));
            } else {
              say("koebSang");
              windowStack.aabn(purchaseDialog(texts.sangbog, texts.koebSang, () => buySong(bandData, save, wallet, songIndex, kronerPerPoint)));
            }
          });
        });
      } });
    // Band member windows (dress a member, hire a new one).
    const { memberWindow, newMemberWindow } = createBandWindows({ bandData, instrumentFilmIndex, cachedAnim, manifest, ctx, images, outfitOverrides, clothingData, save, wallet, persist, say, kronerPerPoint, messageBox, texts, uiPackage, sounds });
    // Hit-list window shown after a concert.
    const leaderboardWindow = createLeaderboardWindow({ gameData, say, sounds, font, ctx, ui });
    // --- Level bar HUD (progress to the next star) and floating money effects ---
    const levelCfg = gameData.niveau;
    const levelFx = { point: -1, stjerner: 0, fx: new Tween(0, levelCfg.fremskridtBilleder), acc: 0 };
    // Animates the bar towards the current points and announces new stars with a narrator line + sound.
    const updateLevelBar = (dtMs) => {
      const points = save.point;
      const starLevel = Math.min(levelFromPoints(levelCfg.graenser, points), levelCfg.graenser.length - 1);
      if (levelFx.point <= 0 && (levelFx.point = points, levelFx.stjerner = starLevel, levelFx.fx.mod(levelProgress(levelCfg.graenser, points))), levelFx.point !== points) {
        if (levelFx.point = points, starLevel > levelFx.stjerner) {
          const milestoneIndex = levelCfg.milepaele.indexOf(starLevel);
          say(levelCfg.script, milestoneIndex < 0 ? 0 : milestoneIndex);
          sounds.spil(gameData.lyde.niveau);
        }
        levelFx.stjerner = levelFromPoints(levelCfg.graenser, points);
        levelFx.fx.mod(levelProgress(levelCfg.graenser, points));
      }
      for (levelFx.acc += dtMs; levelFx.acc >= FRAME_MS;) {
        levelFx.acc -= FRAME_MS;
        levelFx.fx.trin();
      }
    };
    // Draws the level bar, point counter and star number (in HUD coordinates, shifted by the caller).
    const drawLevelBar = () => {
      const { H: hudCfg, M: hudManifest, I: hudImages } = ui.hud;
      const barImages = hudCfg.billeder;
      const barRect = levelCfg.bjaelke;
      const barColors = hudCfg.bjaelkeFelt;
      ctx.fillStyle = `rgb(${barColors.bag.join(",")})`;
      ctx.fillRect(barRect.x, barRect.y, barRect.w, barRect.h);
      ctx.fillStyle = `rgb(${barColors.fyld.join(",")})`;
      ctx.fillRect(barRect.x, barRect.y, Math.trunc(barRect.w * levelFx.fx.v), barRect.h);
      drawSprite(ctx, hudManifest, hudImages, barImages.bjaelke.sprite, barImages.bjaelke.x, barImages.bjaelke.y);
      drawSprite(ctx, hudManifest, hudImages, barImages.bjaelkeKant.sprite, barImages.bjaelkeKant.x, barImages.bjaelkeKant.y);
      const pointsRect = levelCfg.point;
      if (font) {
        font.tegn(ctx, String(Math.max(0, levelFx.point)), pointsRect[0] + pointsRect[2] / 2, barRect.y + barRect.h / 2, { str: 27, midt: true });
      }
      const starCfg = levelCfg.stjerne;
      uiKit.sprite("ui", starCfg.sprite, starCfg.x, starCfg.y, { alfa: levelFx.stjerner >= 1 ? 1 : 0.5 });
      if (levelFx.stjerner >= 1 && font) {
        font.tegn(ctx, String(levelFx.stjerner), starCfg.tekst[0] + starCfg.tekst[2] / 2, starCfg.tekst[1] + starCfg.tekst[3] / 2, { str: 27, midt: true });
      }
    };
    const moneyFx = gameData.pengeEffekt;
    const moneyEffects = [];
    // Starts a floating "+coins" effect (rising, fading, growing) at a stage position.
    const spawnMoneyEffect = (amount, x, y) => {
      const frames = Math.trunc(moneyFx.tid / 33);
      const effect = { beloeb: amount, tid: 0, acc: 0, x: new Tween(x, frames), y: new Tween(y, frames), alfa: new AcceleratingValue(moneyFx.alfa[0], moneyFx.maks, Math.trunc(moneyFx.tid / 100)), skala: new AcceleratingValue(moneyFx.skala[0], moneyFx.maks, Math.trunc(moneyFx.tid / 100)) };
      effect.y.mod(y + moneyFx.dy);
      effect.alfa.maal = moneyFx.alfa[1];
      effect.skala.maal = moneyFx.skala[1];
      moneyEffects.push(effect);
    };
    // --- Camera: kinetic scrolling in the shop; fixed on the stage during a concert ---
    const cameraCfg = gameData.kamera;
    const scrollX = createKineticScroll(0, cameraCfg.verden[0] - screenWidth);
    const scrollY = createKineticScroll(0, cameraCfg.verden[1] - gameData.skaerm.hoejde);
    const camera = savedCameraPos || { x: cameraCfg.x, y: cameraCfg.y };
    scrollX.flytTil(camera.x);
    scrollY.flytTil(camera.y);
    savedCameraPos = camera;
    // --- Shop / concert state ---
    // view: "butik" (shop) or "koncert"; song: current song state (song-engine.js) or null;
    // trackAudios: one <audio> per instrument track of the song.
    let view = "butik";
    let song = null;
    let trackAudios = [];
    let wasPaused = false;
    let afterConcertQueued = false;
    const lanesFade = new Tween(0, gameData.spor.alfaBilleder);
    let lanesFadeAcc = 0;
    const stageAnims = new Map();
    const memberAnims = [null, null, null, null];
    const hitFlashAnims = gameData.knapper.anims.map((animId) => animById.get(animId) ? new AnimationPlayer(animById.get(animId)) : null);
    // Stops and releases the song audio elements.
    const stopTrackAudios = () => trackAudios.forEach((audio) => {
      audio.pause();
      audio.src = "";
    });
    // Returns to the shop view and clears all concert state.
    const leaveConcert = () => {
      view = "butik";
      song = null;
      afterConcertQueued = false;
      stopTrackAudios();
      trackAudios = [];
      stageAnims.clear();
      lanesFade.mod(0);
      if (leaveHook) {
        leaveHook.skift(null);
      }
    };
    let lastResult = null;
    // Pays out the concert once, records the result for the leaderboard and saves.
    const settleConcert = () => {
      const payout = claimPayout(song);
      if (payout == null) {
        return 0;
      }
      lastResult = { sang: song.sang, point: payout, bedre: payout > lastConcertScore, vaerre: payout < lastConcertScore };
      lastConcertScore = payout;
      recordConcertResult(save, wallet, payout);
      if (payout >= 1) {
        sounds.spil(STAGE_SOUNDS.penge);
      }
      persist();
      return payout;
    };
    // Back button during a concert: skips the intro speech, or abandons a running song (still paying what was earned).
    const onBackPressed = () => {
      if (song) {
        if (song.tilstand === SONG_PHASE.INTRO) {
          if (narrator) {
            narrator.spring();
          }
          return;
        }
        if (song.tilstand === SONG_PHASE.SPILLER) {
          settleConcert();
          leaveConcert();
        }
      }
    };
    // Enters the concert view for a song: creates the song state and audio elements, centres the camera on the stage.
    const beginConcert = (songIndex) => {
      stopTrackAudios();
      song = createSongState(gameData, songIndex, bandInstruments(save));
      trackAudios = song.S.spor.map((file) => {
        const audio = new Audio(soundUrl(SOUND_DIR, file));
        audio.preload = "auto";
        return audio;
      });
      view = "koncert";
      afterConcertQueued = false;
      lanesFade.mod(255);
      scrollX.maal(cameraCfg.x);
      scrollY.maal(cameraCfg.y);
      if (leaveHook) {
        leaveHook.skift(onBackPressed);
      }
      say("koncert");
    };
    // Intro finished: starts the song clock and music and starts the item animations.
    const startPlayback = () => {
      startSongPlay(song);
      trackAudios.forEach((audio) => {
        audio.currentTime = 0;
        audio.play().catch(() => {
        });
      });
      for (const item of placedItems()) {
        const animId = itemData.aktiv[item.type][item.f];
        stageAnims.set(item.plads, animId ? makeAnim(animId, randomBetween(0, 3e3)) : null);
      }
    };
    // Screen rectangle of the lane button `lane`.
    const buttonRect = (lane) => {
      const sprite = manifest.sprites[gameData.knapper.basis];
      const x = gameData.knapper.x[lane];
      const y = gameData.knapper.y;
      return { x0: x - sprite.ox, y0: y - sprite.oy, x1: x - sprite.ox + sprite.w, y1: y - sprite.oy + sprite.h };
    };
    // Hit test callback for pressLane: does the falling note overlap the lane button?
    const noteOverlapsButton = (lane, note) => {
      const pose = computeNotePose(song, lane, note);
      const sprite = manifest.sprites[gameData.noder.sprites[lane]];
      const noteRect = { x0: pose.x - sprite.ox * pose.skala, y0: pose.y - sprite.oy * pose.skala, x1: pose.x + (sprite.w - sprite.ox) * pose.skala, y1: pose.y + (sprite.h - sprite.oy) * pose.skala };
      const btnRect = buttonRect(lane);
      return noteRect.x0 < btnRect.x1 && noteRect.x1 > btnRect.x0 && noteRect.y0 < btnRect.y1 && noteRect.y1 > btnRect.y0;
    };
    // Rectangle of a sprite drawn at (x, y) using its origin offsets.
    const spriteRect = (spriteId, x, y, spriteManifest = manifest) => {
      const sprite = spriteManifest.sprites[spriteId];
      return sprite && { x0: x - sprite.ox, y0: y - sprite.oy, x1: x - sprite.ox + sprite.w, y1: y - sprite.oy + sprite.h };
    };
    const pointInRect = (rect, px, py) => rect && px >= rect.x0 && px <= rect.x1 && py >= rect.y0 && py <= rect.y1;
    // Band member animation sets per mode: shop idle, resting on stage, playing.
    const memberFilms = { butik: bandData.medlemFilm.butik, hvile: bandData.medlemFilm.koncertHvile, spiller: bandData.medlemFilm.spiller };
    // Animation player for a band member; in a concert it restarts whenever the song state bumps the member's `nr`.
    const memberAnimation = (memberIndex) => {
      const instrumentIndex = instrumentFilmIndex(memberOutfit(save, memberIndex));
      if (view === "butik" || !song) {
        return cachedAnim(`medlem${memberIndex}-${memberFilms.butik[instrumentIndex]}`, memberFilms.butik[instrumentIndex]);
      }
      const memberState = song.medlem[memberIndex];
      const cached = memberAnims[memberIndex];
      if (!cached || cached.nr !== memberState.nr || cached.s !== song) {
        memberAnims[memberIndex] = { nr: memberState.nr, s: song, p: makeAnim(memberFilms[memberState.mode][instrumentIndex], randomBetween(0, 500)) };
      }
      return memberAnims[memberIndex].p;
    };
    const memberBoxFilm = (memberIndex) => bandData.medlemFilm.butik[instrumentFilmIndex(memberOutfit(save, memberIndex))];
    // Concert tap/keypress: finds the lane button under (x, y) and forwards to pressLane; plays the hit flash on success.
    const pressLaneAt = (x, y) => {
      if (view !== "koncert" || !song || song.tilstand !== SONG_PHASE.SPILLER) {
        return;
      }
      const lane = gameData.knapper.x.findIndex((_x, laneIndex) => {
        const rect = buttonRect(laneIndex);
        return x > rect.x0 && x < rect.x1 && y > rect.y0 && y < rect.y1;
      });
      if (pressLane(song, lane, noteOverlapsButton) === "rigtigt" && hitFlashAnims[lane]) {
        hitFlashAnims[lane].reset();
        hitFlashAnims[lane].advance(0);
        hitFlashAnims[lane].vis = true;
      }
    };
    // A completed tap (not a drag) at screen coords (x, y). During a concert it only skips the intro speech.
    // In the shop it tests, front to back: the info button, roadie, songbook, band members (and the empty member slot)
    // and finally the stage items; the matching window is opened.
    const handleTap = (x, y) => {
      if (view === "koncert") {
        if (song && song.tilstand === SONG_PHASE.INTRO && narrator) {
          narrator.spring();
        }
        return;
      }
      const worldX = x + camera.x;
      const worldY = y + camera.y;
      const openWindow = (windowDef) => {
        sounds.spil(CLICK_SOUND);
        windows.aabn(windowDef);
      };
      if (pointInRect(spriteRect(texts.info.sprite, texts.info.x + (screenWidth - 1280), texts.info.y, ui.pakke.M), x, y)) {
        sounds.spil(CLICK_SOUND);
        windows.aabn(instructionWindow(5));
        return;
      }
      if (pointInRect(spriteRect(ROADIE_SPOT.billede, ROADIE_SPOT.x, ROADIE_SPOT.y), worldX, worldY)) {
        return openWindow(roadieWindow());
      }
      if (pointInRect(spriteRect(SONGBOOK_SPOT.billede, SONGBOOK_SPOT.x, SONGBOOK_SPOT.y), worldX, worldY)) {
        say("sangbog");
        openWindow(songbookWindow());
        showTutorialOnce(8);
        return;
      }
      for (let memberSlot = bandData.medlemPos.length - 1; memberSlot >= 0; memberSlot--) {
        const [posX, posY] = bandData.medlemPos[memberSlot];
        const film = memberSlot < save.band.length ? memberBoxFilm(memberSlot) : bandData.medlemFilm.butik[0];
        const bounds = getAnimationBounds(manifest, cachedAnim(`boks${film}`, film));
        if (bounds && worldX >= posX + bounds.x0 && worldX <= posX + bounds.x1 && worldY >= posY + bounds.y0 && worldY <= posY + bounds.y1) {
          if (memberSlot < save.band.length) {
            say("medlem");
            openWindow(memberWindow(memberSlot));
            showTutorialOnce(7);
            return;
          }
          if (memberSlot === save.band.length) {
            say("nytMedlem");
            return openWindow(newMemberWindow());
          }
        }
      }
      for (const item of placedItems()) {
        const slot = findSlot(item.plads);
        const pos = slotWorldPos(slot);
        const tree = itemData.traef[slot.type];
        if (worldX >= pos.x - tree.ox && worldX <= pos.x - tree.ox + tree.w && worldY >= pos.y - tree.oy && worldY <= pos.y - tree.oy + tree.h) {
          windows.aabn(isUnderConstruction(item, nowSeconds()) ? skipBuildWindow(item) : itemShopWindow(item.plads));
          return;
        }
      }
    };
    // --- Pointer handling for the game view (windows are handled in input.js) ---
    // A release within a small distance of the press counts as a tap.
    let pressStart = null;
    const isConcertView = () => view === "koncert";
    const onPointerDownGame = (x, y) => {
      if (!isConcertView()) {
        scrollX.tryk(x);
        scrollY.tryk(y);
      }
      pressStart = [x, y];
      pressLaneAt(x, y);
    };
    // Camera drag in the shop; ignored during a concert.
    const onDrag = (x, y) => {
      if (!isConcertView()) {
        scrollX.flyt(x);
        scrollY.flyt(y);
      }
    };
    const onRelease = (x, y) => {
      if (!isConcertView()) {
        scrollX.slip();
        scrollY.slip();
      }
      const start = pressStart;
      pressStart = null;
      if (start && Math.hypot((x - start[0]) * cameraCfg.faktor[0], (y - start[1]) * cameraCfg.faktor[1]) <= cameraCfg.tryk) {
        handleTap(x, y);
      }
    };
    const onCancel = () => {
      if (!isConcertView()) {
        scrollX.slip();
        scrollY.slip();
      }
      pressStart = null;
    };
    api = { menuer: windows, kit: uiKit, ned: onPointerDownGame, traekTil: onDrag, slip: onRelease, afbryd: onCancel, trykNed: pressLaneAt, get visning() {
        return view;
      } };
    // --- Frame loop ---
    // Each frame: sync pause/sound state, advance the song and all animations, then draw back to front:
    // sky, background tiles, stage items, band, foreground, crowd, lanes and notes, HUD, figure overlay, money effects, windows.
    let rafId;
    let lastFrameTime = performance.now();
    let skyAcc = 0;
    let lastSoundOn = soundOn;
    let lastPhase = null;
    let lastCooldown = null;
    // One animation frame. `timestamp` is the rAF time; dtMs is clamped to 250 ms and is 0 while paused.
    const frame = (timestamp) => {
      const dtMs = paused ? 0 : Math.min(250, timestamp - lastFrameTime);
      lastFrameTime = timestamp;
      if (paused !== wasPaused) {
        wasPaused = paused;
        if (song && song.tilstand === SONG_PHASE.SPILLER) {
          trackAudios.forEach((audio) => wasPaused ? audio.pause() : audio.play().catch(() => {
          }));
        }
        if (wasPaused) {
          sounds.stop(gameData.lyde.publikum);
        } else {
          startAudienceLoop();
        }
      }
      if (soundOn !== lastSoundOn) {
        lastSoundOn = soundOn;
        sounds.saetTil(lastSoundOn);
        if (lastSoundOn && !wasPaused) {
          startAudienceLoop();
        }
      }
      const phase = song ? song.tilstand : null;
      if (phase !== lastPhase && (lastPhase = phase, (phase === SONG_PHASE.SPILLER || phase === SONG_PHASE.SLUT) && (audienceVolume = phase === SONG_PHASE.SPILLER ? gameData.lyde.publikumStyrke.sang : gameData.lyde.publikumStyrke.scene, sounds.volumen(gameData.lyde.publikum, audienceVolume))), camera.x = scrollX.tik(dtMs), camera.y = scrollY.tik(dtMs), song) {
        if (song.tilstand === SONG_PHASE.INTRO && !(narrator && narrator.taler) && startPlayback(), advanceSong(song, dtMs), song.tilstand === SONG_PHASE.SPILLER && trackAudios[0] && !trackAudios[0].paused && trackAudios[0].currentTime > 0) {
          const audioMs = trackAudios[0].currentTime * 1e3 - POP_MUSIC_LATENCY_MS;
          if (Math.abs(audioMs - song.ur) > 80) {
            song.ur = audioMs;
          }
        }
        if (trackAudios.forEach((audio, trackIndex) => {
          audio.volume = soundOn ? computeElementVolume(audio.src, song.spor[trackIndex] * (gameData.instrumentVolumen[trackIndex] / 255)) : 0;
        }), song.tilstand !== SONG_PHASE.SPILLER && song.tilstand !== SONG_PHASE.INTRO && trackAudios.forEach((audio) => audio.pause()), song.effekt && (song.baner.forEach((laneTrack, laneIndex) => {
          if (laneTrack != null) {
            spawnMoneyEffect(song.effekt.beloeb, gameData.knapper.x[laneIndex], gameData.knapper.y);
          }
        }), song.effekt = null), song.tilstand === SONG_PHASE.SLUT && !song.betalt) {
          const payout = settleConcert();
          const rank = leaderboardRank(payout);
          say("efterKoncert", rank < 10 ? 0 : rank < 45 ? 1 : 2);
          afterConcertQueued = true;
        } else if (song.tilstand === SONG_PHASE.SLUT && afterConcertQueued && !(narrator && narrator.taler)) {
          const result = lastResult;
          leaveConcert();
          if (result) {
            windows.aabn(leaderboardWindow(result));
          }
        }
        if (song) {
          for (const sound of song.lyde.splice(0)) {
            sounds.spil(typeof sound == "string" ? STAGE_SOUNDS[sound] : gameData.lyde.falsk[sound.falsk]);
          }
        }
      }
      for (lanesFadeAcc += dtMs; lanesFadeAcc >= FRAME_MS;) {
        lanesFadeAcc -= FRAME_MS;
        lanesFade.trin();
      }
      hitFlashAnims.forEach((anim) => {
        if (anim && anim.vis) {
          anim.advance(dtMs);
        }
      });
      for (const entry of animCache.values()) {
        if (entry.p) {
          entry.p.advance(dtMs);
        }
      }
      for (const [slot, anim] of stageAnims) {
        if (anim) {
          anim.advance(dtMs);
          if (anim.finished) {
            stageAnims.delete(slot);
          }
        }
      }
      for (const memberAnim of memberAnims) {
        if (memberAnim && memberAnim.p) {
          memberAnim.p.advance(dtMs);
        }
      }
      if (tickCrowdReactors(dtMs), view === "butik") {
        const cooldownLeft = save.ventTil - nowSeconds();
        if (cooldownLeft === 0 && lastCooldown === 1) {
          sounds.spil(gameData.lyde.ventetidSlut);
        }
        lastCooldown = cooldownLeft;
      }
      for (audience.film(song && song.tilstand === SONG_PHASE.SPILLER ? gameData.publikum.jubler : gameData.publikum.venter), audience.tik(dtMs), skyAcc += dtMs; skyAcc >= FRAME_MS;) {
        skyAcc -= FRAME_MS;
        sky.trin();
      }
      sky.tik(dtMs);
      updateLevelBar(dtMs);
      if (narrator) {
        narrator.tik(dtMs);
      }
      figureOverlay.fremad(dtMs, !!narrator && narrator.taler);
      const drawAnimAt = (anim, x, y) => drawAnimation(ctx, manifest, images, anim, x, y);
      sky.tegn(camera, (sprite, x, y) => drawSprite(ctx, manifest, images, sprite, x, y), drawAnimAt);
      drawTileGrid(ctx, manifest, images, assets.bg, gameData.baggrund.base, Math.trunc(camera.x * gameData.baggrund.parallakse), Math.trunc(camera.y * gameData.baggrund.parallakse));
      const toScreenX = (worldX) => worldX - camera.x;
      const toScreenY = (worldY) => worldY - camera.y;
      const nowSec = nowSeconds();
      const concertPlaying = view === "koncert" && !!song && song.tilstand === SONG_PHASE.SPILLER;
      for (const item of placedItems()) {
        const pos = slotWorldPos(findSlot(item.plads));
        const building = isUnderConstruction(item, nowSec);
        if (!(building && concertPlaying)) {
          if (stageAnims.has(item.plads)) {
            const anim = stageAnims.get(item.plads);
            if (anim) {
              drawAnimAt(anim, toScreenX(pos.x), toScreenY(pos.y));
            }
          } else {
            drawAnimation(ctx, manifest, images, cachedAnim(`gen${item.plads}-${item.type}-${item.f}`, itemData.film[item.type][item.f]), toScreenX(pos.x), toScreenY(pos.y), building ? itemData.byg.alfa / 255 : 1);
          }
          if (building) {
            const buildAnim = cachedAnim(`sav${item.plads}`, itemData.byg.film);
            const buildBounds = getAnimationBounds(manifest, buildAnim);
            drawAnimAt(buildAnim, toScreenX(pos.x), toScreenY(pos.y));
            if (font) {
              font.tegn(ctx, formatDuration(constructionSecondsLeft(item, nowSec)), toScreenX(pos.x), toScreenY(pos.y) + (buildBounds ? buildBounds.y0 : 0) + itemData.byg.tekstDy, { font: 2, midt: true });
            }
          }
          if (concertPlaying && item.type === 3 && item.f >= 1) {
            drawAnimAt(cachedAnim(`hfx${item.plads}`, itemData.hoejttaler), toScreenX(pos.x), toScreenY(pos.y));
          }
        }
      }
      if (save.band.forEach((_member, memberIndex) => drawAnimation(ctx, manifest, images, memberAnimation(memberIndex), toScreenX(bandData.medlemPos[memberIndex][0]), toScreenY(bandData.medlemPos[memberIndex][1]), 1, outfitOverrides(memberOutfit(save, memberIndex)))), view === "butik") {
        const memberCount = save.band.length;
        if (memberCount < bandData.medlemPos.length) {
          drawAnimation(ctx, manifest, images, cachedAnim("ledig", bandData.medlemFilm.butik[0]), toScreenX(bandData.medlemPos[memberCount][0]), toScreenY(bandData.medlemPos[memberCount][1]), 0.45);
        }
      }
      drawTileGrid(ctx, manifest, images, assets.fg, gameData.forgrund.base, camera.x, camera.y);
      if (view === "butik") {
        drawAnimAt(crowdReactors[1].p, toScreenX(SONGBOOK_SPOT.x), toScreenY(SONGBOOK_SPOT.y));
      }
      drawAnimAt(roadieLight, toScreenX(ROADIE_SPOT.x), toScreenY(ROADIE_SPOT.y));
      if (view === "butik") {
        drawAnimAt(crowdReactors[0].p, toScreenX(ROADIE_SPOT.x), toScreenY(ROADIE_SPOT.y));
      }
      audience.tegn(camera, drawAnimAt);
      const cooldown = view === "butik" ? concertCooldownLeft(save, nowSec) : 0;
      if (cooldown >= 1 && font) {
        const cooldownCfg = gameData.koncert.nedtaelling;
        font.tegn(ctx, formatDuration(cooldown), toScreenX(SONGBOOK_SPOT.x + cooldownCfg.dx + cooldownCfg.b / 2), toScreenY(SONGBOOK_SPOT.y + cooldownCfg.dy + cooldownCfg.h / 2), { font: cooldownCfg.skrift, midt: true });
      }
      const lanesAlpha = lanesFade.v / 255;
      if (lanesAlpha > 0 && drawSprite(ctx, manifest, images, gameData.spor.sprite, gameData.spor.x, gameData.spor.y, 1, lanesAlpha), song && view === "koncert") {
        for (let lane = 0; lane < 4; lane++) {
          const note = song.noder[lane];
          if (!note) {
            continue;
          }
          const pose = computeNotePose(song, lane, note);
          drawSprite(ctx, manifest, images, gameData.noder.sprites[lane], pose.x, pose.y, pose.skala, pose.alfa);
        }
      }
      if (lanesAlpha > 0 && drawSprite(ctx, manifest, images, gameData.knapper.sprite, gameData.spor.x, gameData.knapper.y, 1, lanesAlpha), view === "koncert" && hitFlashAnims.forEach((anim, laneIndex) => {
        if (anim && anim.vis) {
          drawAnimation(ctx, manifest, images, anim, gameData.knapper.x[laneIndex], gameData.knapper.y);
        }
      }), view === "butik") {
        if (ui.hud) {
          drawCurrencyHud(ctx, ui.hud.H, ui.hud.M, ui.hud.I, font, wallet.penge);
          ctx.save();
          ctx.translate(-HUD_SHIFT, 0);
          drawLevelBar();
          ctx.restore();
        }
        uiKit.sprite("ui", texts.info.sprite, texts.info.x + (screenWidth - 1280), texts.info.y);
      } else if (song) {
        const hudCfg = gameData.hud;
        drawAnimation(ctx, manifest, images, cachedAnim("forlad", hudCfg.forlad.film), hudCfg.forlad.x + (screenWidth - 1280), hudCfg.forlad.y);
        uiKit.sprite("ui", hudCfg.taeller.sprite, hudCfg.taeller.x, hudCfg.taeller.y);
        const counterSprite = ui.pakke.M.sprites[hudCfg.taeller.sprite];
        if (font && counterSprite) {
          const [offX, offY] = hudCfg.taeller.tekst;
          font.tegn(ctx, String(song.rigtige), hudCfg.taeller.x + counterSprite.w * offX + counterSprite.w / 2, hudCfg.taeller.y + counterSprite.h * offY, { font: 1, midt: true, op: true });
        }
      }
      figureOverlay.tegn(ctx, narratorCfg.figurTale.map((figureId) => figureId >= 0 ? figureTalk[figureId] : 0));
      for (const effect of [...moneyEffects]) {
        for (effect.acc += dtMs; effect.acc >= FRAME_MS;) {
          effect.acc -= FRAME_MS;
          effect.x.trin();
          effect.y.trin();
          effect.alfa.trin();
          effect.skala.trin();
        }
        if (effect.tid += dtMs, effect.tid > moneyFx.tid) {
          moneyEffects.splice(moneyEffects.indexOf(effect), 1);
          continue;
        }
        const scale = effect.skala.v / 256;
        const frameSprite = moneyFx.sprite + Math.floor(effect.tid / (1e3 / moneyFx.hudFps)) % moneyFx.antal;
        drawSprite(ctx, manifest, images, frameSprite, effect.x.v, effect.y.v, scale, Math.min(255, effect.alfa.v + 128) / 255);
        if (font) {
          font.tegn(ctx, String(effect.beloeb), effect.x.v + moneyFx.tekstDx, effect.y.v + moneyFx.tekstDy, { font: 3, str: 57 * scale, alfa: Math.max(0, effect.alfa.v) / 255 });
        }
      }
      windows.tegn(uiKit, ctx, screenWidth, 768);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    // Mouse wheel scrolls the topmost window.
    const onWheel = (event) => {
      if (windows.aaben) {
        event.preventDefault();
        windows.rul(event.deltaY);
      }
    };
    const canvasEl = canvas;
    canvasEl.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(rafId);
      sounds.stopAlle();
      stopTrackAudios();
      if (previewAudio) {
        previewAudio.pause();
      }
      if (narrator) {
        narrator.stop();
      }
      if (leaveHook) {
        leaveHook.skift(null);
      }
      canvasEl.removeEventListener("wheel", onWheel);
      api = null;
      currentNarrator = null;
    };
  };
  // Starts (or restarts, when ui/font/wallet/leave hook changed) the game if everything it needs is there.
  const maybeStart = () => {
    if (destroyed || !assets || !canvas || stopGame || !ui || !ui.pakke) {
      return;
    }
    stopGame = startGame();
  };
  const restart = () => {
    if (stopGame) {
      stopGame();
      stopGame = null;
    }
    maybeStart();
  };
  loadPopAssets().then((loaded) => {
    if (destroyed) {
      return;
    }
    assets = loaded;
    loading.destroy();
    removeEl(loading.el);
    loading = null;
    canvas = h("canvas", { width: screenWidth, height: 768, style: { touchAction: "none", cursor: "pointer" } });
    el.append(h("div", { className: "spilflade" }, canvas));
    input = createPopInput({ canvas, getApi: () => api, isPaused: () => paused, getNarrator: () => currentNarrator, screenWidth, assets });
    maybeStart();
  }, (err) => {
    if (destroyed) {
      return;
    }
    loading.destroy();
    removeEl(loading.el);
    loading = null;
    el.append(h("div", { className: "msg error" }, h("p", null, "Kunne ikke indlæse: ", err.message), h("p", { className: "hint" }, "Kør ", h("code", null, "node Tools/export-pop.js"), " og ", h("code", null, "node Tools/export-minispil-tekster.js"), ".")));
  });
  return {
    el,
    // Applies the props that change over time: pause and sound flags are read by the frame loop; replaced
    // ui/font/wallet/leave hook restart the game (as the old effect dependencies did).
    update(next = {}) {
      if ("pause" in next) {
        paused = !!next.pause;
      }
      if ("lydTil" in next && next.lydTil !== soundOn) {
        soundOn = next.lydTil;
        if (currentNarrator) {
          currentNarrator.saetLyd(soundOn);
        }
      }
      let changed = false;
      if ("skrift" in next && next.skrift !== font) {
        font = next.skrift;
        changed = true;
      }
      if ("ui" in next && next.ui !== ui) {
        ui = next.ui;
        changed = true;
      }
      if ("pung" in next && next.pung !== sharedWallet) {
        sharedWallet = next.pung;
        changed = true;
      }
      if ("skilt" in next && next.skilt !== leaveHook) {
        leaveHook = next.skilt;
        changed = true;
      }
      if (changed) {
        restart();
      }
    },
    destroy() {
      destroyed = true;
      if (stopGame) {
        stopGame();
        stopGame = null;
      }
      if (input) {
        input.destroy();
        input = null;
      }
      if (loading) {
        loading.destroy();
        loading = null;
      }
      removeEl(el);
    }
  };
}
export { createPopGame as default };
