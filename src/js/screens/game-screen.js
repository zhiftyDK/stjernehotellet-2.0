// The main in-game screen. createGameScreen() owns the canvas and runs the whole game loop:
//  - hotel scene: sky, building, furniture, cafe/kitchen, pets, gifts and guests, HUD and open windows
//  - world map scene (level select), which starts the minigames
//  - while a minigame runs (createMinigameHost) the canvas becomes a transparent overlay showing only the house sign
//    and, when opened from it, the home-menu windows
// Input handling and some drawing live in ./game-screen/*.js:
//   click-handler.js (what a click hits), pointer-input.js (drag/scroll), sky.js, menu-sign.js,
//   minigame-ambient.js (blurred backdrop behind minigames), helpers.js.
// Data keys are Danish (they come from the exported game data), e.g. etager = floors, gaester = guests,
// moebler = furniture, kaeledyr = pets, verden = world constants, kort = world map.
import { GAME_WIDTH, WIDE_MINIGAMES, WIDTH_EXTRA } from '../engine/constants.js';
import { h, removeEl } from '../dom.js';
import { loadGameData, createSoundBank as createSoundPlayer, createMusicPlayer } from '../loaders/data-loaders.js';
import { createHotel, createMoneyPopups as createCoinPopups, createRestaurantView as createCafeRenderer, hotelHeight, createSpriteYOffsetLookup as createFurnitureYOffsetLookup, advanceHotel, floorTopY, floorSprite, floorTopEdgeY as floorCeilingY, drawSpriteAt as drawSpriteScaled, guestAnimationIds } from '../game/hotel.js';
import { deserializeHotel, clearAllSavedData, tutorials, serializeHotel } from '../game/save.js';
import { createCharacterScriptRunner as createHeadsPlayer, createMapScreen } from '../render/script-player.js';
import { createHudRenderer, createTextureLoader, pointLevel, drawSprite, drawAnimation, getAnimationBounds } from '../render/canvas-helpers.js';
import { createUiKit, WindowStack, createLoadingScreen } from '../minigames/ui-kit.js';
import { COIN_SOUND_ID, EMPTY_SLOT_CATEGORY, EMPTY_SLOT_FILM_BY_TYPE as EMPTY_SLOT_FILM_OFFSETS, kitchenLevel } from '../game/furniture-and-kitchen.js';
import { createInstructionPanel as createTutorialWindow } from '../ui/panels.js';
import { isMinigame, createMinigameHost } from '../minigames/host.js';
import { createMenus as createMenuFactory } from '../game/world-init.js';
import { registerNewsOpener, registerInfoOpener } from '../ui/news-and-info.js';
import { AnimationPlayer } from '../engine/animation.js';
import { petTrophyLevel, petLevel, PET_STALL_X, PET_ROW_Y_OFFSET as PET_STALL_Y, petComfortLevel } from '../game/pets.js';
import { giftHopScale } from '../game/gifts.js';
import { formatDuration } from '../game/world.js';
import { createMinigameAmbient } from './game-screen/minigame-ambient.js';
import { menuSign } from './game-screen/menu-sign.js';
import { createSky } from './game-screen/sky.js';
import { createClickHandler } from './game-screen/click-handler.js';
import { createPointerHandlers } from './game-screen/pointer-input.js';
import { randomInt } from './game-screen/helpers.js';


// Returns { el, destroy }. `el` is the loading screen (or the error message) until the game data has loaded, then the
// real screen replaces it in the page (and `handle.el` is updated).
export function createGameScreen() {
  let destroyed = false;
  let teardown = null; // cleanup of the running game
  const loadingScreen = createLoadingScreen();
  const handle = {
    el: loadingScreen.el,
    destroy() {
      destroyed = true;
      if (teardown) {
        teardown();
        teardown = null;
      }
      if (loadingScreen.destroy) {
        loadingScreen.destroy();
      }
    }
  };
  // Replaces the element currently shown with `el`.
  const swapIn = (el) => {
    if (handle.el && handle.el.parentNode) {
      handle.el.replaceWith(el);
    }
    handle.el = el;
  };
  // Builds the whole screen from the loaded data and starts the game loop; returns the cleanup function.
  const start = (gameData) => {
    // Short alias for the world constants.
    const world = gameData.verden;
    const hotelRef = { current: null }; // live hotel state object
    const canvasRef = { current: null };
    const dragRef = { current: null }; // current pointer drag (camera scroll / menu scroll)
    // Clickable regions, rebuilt every frame by the render loop (screen coordinates).
    const furnitureHitsRef = { current: [] };
    const guestHitsRef = { current: [] };
    const giftHitsRef = { current: [] };
    const giftSoundRef = { current: null };
    const petHitsRef = { current: [] };
    const petStallHitsRef = { current: [] };
    const cookCoinPosRef = { current: {} }; // per floor: where a collected cook income coin should pop up
    const coinPopupsRef = { current: null }; // floating "+coins" effects
    // Bundle of UI/scene objects created below, shared with the event handlers.
    const sessionRef = { current: null };
    const pendingOpenerRef = { current: null }; // news/info window requested during a minigame, opened afterwards
    const hudButtonsRef = { current: [] }; // clickable HUD buttons returned by the HUD renderer
    let activeMinigame = null; // number of the running minigame, or null
    let menuOverlayOpen = false; // whether the home-menu windows are open over a running minigame
    let signBox = null; // where the house sign is (for the click overlay)
    let ambient = null;
    let minigameHost = null;
    let signEl = null;
    let toastEl = null;
    let toastMessage = null;
    const handleClick = createClickHandler({ gameData, hotelRef, sessionRef, hudButtonsRef, giftHitsRef, giftSoundRef, petHitsRef, guestHitsRef, furnitureHitsRef, petStallHitsRef, cookCoinPosRef, coinPopupsRef });
    const { onPointerDown, onPointerMove, onPointerUp } = createPointerHandlers({ gameData, canvasRef, sessionRef, hotelRef, dragRef, handleClick });
    // Money interface handed to minigames (they can read the balance, spend and earn coins).
    const wallet = { get penge() {
        return hotelRef.current ? hotelRef.current.penge : 0;
      }, brug(amount) {
        const hotelState = hotelRef.current;
        if (!hotelState || hotelState.penge < amount) {
          return false;
        }
        hotelState.penge -= amount;
        return true;
      }, faa(amount) {
        if (hotelRef.current) {
          hotelRef.current.penge += amount;
        }
      } };
    // Coin sprite info for minigames (world.moent = coin animation config).
    const coinInfo = { D: gameData.verden.moent, M: gameData.manifest, I: gameData.billeder };
    // Converts a value to a CSS percentage of `total`.
    const percent = (value, total) => `${value / total * 100}%`;
    // Layout: optional blurred minigame backdrop, the running minigame, a clickable house-sign overlay (only while a
    // minigame runs), and the game canvas (a transparent overlay during minigames) with toast message and loading cover.
    const canvas = h("canvas", { width: world.skaerm.bredde, height: world.skaerm.hoejde, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp });
    canvasRef.current = canvas;
    const loadingCover = createLoadingScreen({ ud: true, efter: () => {
        if (loadingCover.destroy) {
          loadingCover.destroy();
        }
        removeEl(loadingCover.el);
      } });
    const screenEl = h("div", { className: "skaerm" }, canvas, loadingCover.el);
    const root = h("div", { className: "spil uden-panel", style: { position: "relative" } }, screenEl);
    // Canvas wrapper and canvas styles: a transparent overlay during minigames (clickable only while the menu is open).
    const applyLayout = () => {
      if (activeMinigame != null) {
        Object.assign(screenEl.style, { position: "absolute", left: "0", top: "0", right: "0", zIndex: "5", pointerEvents: menuOverlayOpen ? "auto" : "none" });
        Object.assign(canvas.style, { background: "transparent", borderRadius: "0" });
      } else {
        screenEl.removeAttribute("style");
        canvas.removeAttribute("style");
      }
    };
    // The clickable house-sign overlay exists only while a minigame runs, the menu is closed and the sign position is known.
    const renderSign = () => {
      if (!(activeMinigame != null && !menuOverlayOpen && signBox)) {
        removeEl(signEl);
        signEl = null;
        return;
      }
      if (!signEl) {
        signEl = h("div", { className: "minispil-menuskilt", onPointerDown: () => {
            const session = sessionRef.current;
            if (session && !session.menuer.aaben) {
              session.menuer.aabn(session.M.hovedmenu());
            }
          } });
        root.insertBefore(signEl, screenEl);
      }
      Object.assign(signEl.style, { position: "absolute", zIndex: "6", cursor: "pointer", left: percent(signBox.x0, world.skaerm.bredde), top: percent(Math.max(0, signBox.y0), world.skaerm.hoejde), width: percent(signBox.x1 - signBox.x0, world.skaerm.bredde), height: percent(signBox.y1 - Math.max(0, signBox.y0), world.skaerm.hoejde) });
    };
    const setSignBox = (region) => {
      if (signBox && signBox.x0 === region.x0 && signBox.y0 === region.y0) {
        return;
      }
      signBox = { ...region };
      renderSign();
    };
    const setMenuOverlayOpen = (open) => {
      menuOverlayOpen = open;
      applyLayout();
      renderSign();
      if (minigameHost) {
        minigameHost.update({ ekstraPause: open });
      }
    };
    // Removes the minigame (and its backdrop) from the page; the handles are destroyed right after the current call,
    // because a minigame typically ends the game from inside its own callback.
    const unmountMinigame = (immediate = false) => {
      const oldAmbient = ambient, oldHost = minigameHost;
      ambient = null;
      minigameHost = null;
      const release = () => {
        for (const part of [oldHost, oldAmbient]) {
          if (part) {
            if (part.destroy) {
              part.destroy();
            }
            removeEl(part.el);
          }
        }
      };
      if (immediate) {
        release();
      } else {
        for (const part of [oldHost, oldAmbient]) {
          if (part) {
            removeEl(part.el);
          }
        }
        queueMicrotask(release);
      }
    };
    // Sets the running minigame (number, or null for none) and mounts/unmounts the host and backdrop.
    const setActiveMinigame = (minigameNr) => {
      if (minigameNr === activeMinigame) {
        return;
      }
      activeMinigame = minigameNr;
      if (minigameNr == null) {
        unmountMinigame();
      } else {
        if (minigameHost) {
          const oldHost = minigameHost;
          minigameHost = null;
          removeEl(oldHost.el);
          queueMicrotask(() => oldHost.destroy && oldHost.destroy());
        }
        if (!ambient) {
          ambient = createMinigameAmbient();
          root.insertBefore(ambient.el, root.firstChild);
        }
        minigameHost = createMinigameHost({ nr: minigameNr, ui: gameData.ui, skrift: gameData.skrift, hud: gameData.hud, pung: wallet, moent: coinInfo, tilbage: returnFromMinigame, ekstraPause: menuOverlayOpen });
        root.insertBefore(minigameHost.el, signEl || screenEl);
      }
      applyLayout();
      renderSign();
    };
    // Called by the minigame host when a minigame ends: pays the reward and goes back to the map.
    const returnFromMinigame = (reward = 0) => {
      setActiveMinigame(null);
      const session = sessionRef.current;
      if (reward > 0) {
        hotelRef.current.penge += reward;
        session.pengeLyd();
      }
      session.scene.navn = "kort";
      session.kort.vis();
      session.musik.oe();
      // Open a news/info window that was requested while the minigame was running.
      if (pendingOpenerRef.current) {
        const pendingKey = pendingOpenerRef.current;
        pendingOpenerRef.current = null;
        session.menuer.aabn(session.M[pendingKey]());
      }
    };
    // Shows a message for 2.5 s (unless a newer message replaced it).
    const showToast = (text) => {
      toastMessage = text;
      if (!toastEl) {
        toastEl = h("div", { className: "besked" });
        canvas.after(toastEl);
      }
      toastEl.textContent = text;
      setTimeout(() => {
        if (toastMessage === text) {
          toastMessage = null;
          removeEl(toastEl);
          toastEl = null;
        }
      }, 2500);
    };
    // Swap the loading screen for the real screen now that everything is built (the canvas is already in the tree below).
    swapIn(root);
    // Short aliases for the loaded game data (Danish keys come from the exported data files):
    // world = hotel/world constants, furniture = furniture catalogue, cafe = restaurant/kitchen assets.
    const spriteManifest = gameData.manifest;
    const spriteImages = gameData.billeder;
    const furniture = gameData.moebler;
    const cafe = gameData.cafe;
    const hotel = createHotel(world, furniture.kat, cafe.C);
    coinPopupsRef.current = createCoinPopups(world.moent, spriteManifest, spriteImages, gameData.skrift);
    hotel.kd = gameData.kaeledyr;
    deserializeHotel(hotel);
    // Set when the player resets the game, so the pending autosave does not write the old hotel back.
    let resettingSaves = false;
    const cafeRenderer = createCafeRenderer(cafe.C, cafe.M, cafe.T);
    const headsPlayer = createHeadsPlayer(gameData.hoveder, "data/hoveder/lyd");
    const hud = createHudRenderer(gameData.hud.H, gameData.hud.M, gameData.hud.T.I, gameData.skrift, gameData.hoveder);
    // The UI kit draws buttons/text/windows from several sprite packs (ui, hotel, furniture, cafe, tutorial).
    const uiKit = createUiKit(canvasRef.current.getContext("2d"), {
      ui: { M: gameData.ui.M, I: gameData.ui.T.I },
      hotel: { M: spriteManifest, I: spriteImages, anims: new Map(spriteManifest.animations.map((animation) => [animation.id, animation])) },
      moebler: { M: furniture.M, I: furniture.T.I, anims: furniture.anims },
      cafe: { M: cafe.M, I: cafe.T.I, anims: cafe.anims },
      vejledning: { M: gameData.vejledning.M, I: gameData.vejledning.T.I, anims: gameData.vejledning.anims }
    }, gameData.ui.U, gameData.skrift);
    // Stack of open windows/menus; the main menu window is centred horizontally.
    const windows = new WindowStack({ ...gameData.ui.U, menu: { ...gameData.ui.U.menu, venstre: Math.round((GAME_WIDTH - gameData.ui.U.menu.skaerm[0]) / 2) } });
    // Pet assets (a separate sprite pack) are fetched lazily the first time a pet floor or the pet menu is needed.
    // klar = loaded, henter = fetch started.
    const pets = { klar: false, henter: false };
    const loadPetAssets = () => {
      if (!pets.henter) {
        pets.henter = true;
        fetch("data/kaeledyr/manifest.json").then((response) => response.json()).then((petManifest) => {
          const textures = createTextureLoader("data/kaeledyr", petManifest);
          Object.assign(pets, { M: petManifest, I: textures.I, anims: new Map(petManifest.animations.map((animation) => [animation.id, animation])), klar: true });
          uiKit.pakker.kaeledyr = { M: petManifest, I: textures.I, anims: pets.anims };
        }).catch(() => {
          pets.henter = false;
        });
      }
    };
    const petSoundIds = gameData.kaeledyr.dyr.lyde;
    // One shared sound player for the pet sounds and the coin sound.
    const soundPlayer = createSoundPlayer([...new Set([...petSoundIds.goe.flat(), ...petSoundIds.spis, petSoundIds.bad, petSoundIds.moebel, petSoundIds.leg, ...gameData.kaeledyr.boder.levering, COIN_SOUND_ID])]);
    // Opens tutorial page set nr `tutorialNr` in a window; `onClosed` runs when the player closes it.
    const openTutorial = (tutorialNr, onClosed = null) => windows.aabn(createTutorialWindow({ V: gameData.vejledning.V, nr: tutorialNr, pakke: "vejledning", laes: (script, page) => headsPlayer.start(script, { v0: page }), lukket: onClosed }));
    // The world map (level select) has its own talking-heads player and sounds.
    const mapData = gameData.kort;
    const mapHeads = createHeadsPlayer({ liste: mapData.K.scripts.liste, haendelser: {} }, "data/kort/lyd");
    const mapScreen = createMapScreen({ K: mapData.K, M: mapData.M, I: mapData.T.I, forgrund: mapData.forgrund, baggrund: mapData.baggrund, hud: { M: gameData.hud.M, I: gameData.hud.T.I }, HV: gameData.hoveder, hoveder: mapHeads, skrift: gameData.skrift });
    // Which scene is shown: "hotel" (the hotel) or "kort" (the world map).
    const scene = { navn: "hotel" };
    const music = createMusicPlayer(gameData.musik);
    music.spil(0);
    const showMap = () => {
      headsPlayer.stop();
      scene.navn = "kort";
      mapScreen.vis();
      music.oe();
    };
    // Called by the map when a level is chosen. 0 means "go back to the hotel".
    const startMinigame = (minigameNr) => {
      if (minigameNr === 0) {
        mapScreen.stop();
        scene.navn = "hotel";
        headsPlayer.haendelse("tilbage");
        music.spil(0);
        return;
      }
      if (!isMinigame(minigameNr)) {
        windows.aabn(menus.besked(mapData.K.minispil[minigameNr].titel, "Minispillet findes ikke endnu."));
        return;
      }
      headsPlayer.stop();
      mapScreen.stop();
      setActiveMinigame(minigameNr);
      music.spil(minigameNr);
    };
    // Factory for all menu windows (main menu, shop, kitchen, news ...); these callbacks are its link back to the screen.
    const menus = createMenuFactory({
      s: hotel,
      D: world,
      MB: furniture,
      CF: cafe,
      U: gameData.ui.U,
      vis: (message) => showToast(message),
      nulstil: () => {
        resettingSaves = true;
        clearAllSavedData();
        window.location.reload();
      },
      hoved: (eventName, eventArgs) => headsPlayer.haendelse(eventName, eventArgs),
      tilKort: showMap,
      kaeledyr: () => {
        loadPetAssets();
        return pets.klar;
      },
      tastatur: () => keyboardInput.focus(),
      vejledning: openTutorial
    });
    // The mailbox shows a tutorial the first time it is opened.
    const openMailbox = () => {
      if (tutorials.har("post1")) {
        windows.aabn(menus.post());
        return;
      }
      tutorials.saet("post1");
      openTutorial(1, () => windows.aabn(menus.post()));
    };
    // Shared with the event handlers: kit = UI kit, menuer = window stack, M = menu factory, hoveder = talking heads,
    // kort = world map, scene = current scene, startMinispil = start a minigame by number, aabnPost = open mailbox,
    // vejled = open tutorial, musik = music player, pengeLyd = play the coin sound.
    sessionRef.current = { kit: uiKit, menuer: windows, M: menus, hoveder: headsPlayer, kort: mapScreen, scene: scene, startMinispil: startMinigame, aabnPost: openMailbox, vejled: openTutorial, musik: music, pengeLyd: () => soundPlayer.spil(COIN_SOUND_ID) };
    showMap();
    windows.aabn(menus.guide());
    // News / info windows can be requested from outside this screen; during a minigame they wait (pendingOpenerRef).
    registerNewsOpener(() => {
      if (activeMinigame != null) {
        pendingOpenerRef.current = "nyheder";
        return;
      }
      windows.aabn(menus.nyheder());
    });
    registerInfoOpener(() => {
      if (activeMinigame != null) {
        pendingOpenerRef.current = "info";
        return;
      }
      windows.aabn(menus.info());
    });
    // Hidden text input: focusing it brings up the on-screen keyboard on touch devices (used by text fields in menus).
    // Typed characters are forwarded to the window stack.
    const keyboardInput = document.createElement("input");
    Object.assign(keyboardInput.style, { position: "fixed", left: "-1000px", top: "0", opacity: "0" });
    keyboardInput.setAttribute("autocapitalize", "characters");
    document.body.appendChild(keyboardInput);
    keyboardInput.addEventListener("input", () => {
      for (const char of keyboardInput.value) {
        windows.tast(char);
      }
      keyboardInput.value = "";
    });
    // Physical keyboard: forward keys to the open window unless a modifier is held, or the key came from the hidden
    // input above (which already forwards its own input events).
    const onKeyDown = (event) => {
      if (!(!windows.aaben || event.ctrlKey || event.metaKey || event.altKey || event.target === keyboardInput && event.key.length === 1)) {
        if (windows.tast(event.key)) {
          event.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    // Mouse wheel scrolls lists in open windows (and blocks page scrolling while a window is open).
    const onWheel = (event) => {
      if (windows.aaben) {
        event.preventDefault();
        windows.rul(event.deltaY);
      }
    };
    canvasRef.current.addEventListener("wheel", onWheel, { passive: false });
    hotelRef.current = hotel;
    window.__snyd = { s: hotel }; // debug/cheat hook: exposes the live hotel state to the console
    // Used to detect when the player reaches a new star (point) level.
    let lastPointLevel = pointLevel(hotel.hentet).antal;
    // Background/foreground tile maps: tileSize is the tile edge in px, sizes are the whole map in px.
    const tileSize = world.flise;
    const foregroundHeight = gameData.forgrund.raekker * tileSize;
    const backgroundHeight = gameData.baggrund.raekker * tileSize;
    const foregroundWidth = gameData.forgrund.kolonner * tileSize;
    // Start with the camera centred horizontally, looking at the lobby (bottom of the hotel).
    hotel.kam.x = Math.round((foregroundWidth - world.skaerm.bredde) / 2);
    hotel.kam.y = hotelHeight(hotel) - world.skaerm.hoejde;
    const animsById = new Map(spriteManifest.animations.map((anim) => [anim.id, anim]));
    hotel.filmTid = new Map(spriteManifest.animations.map((anim) => [anim.id, anim.duration * 10]));
    giftSoundRef.current = createSoundPlayer([world.lyde.gave]);
    // Animation player caches. Each cache is keyed by something stable (gift id, "floor-slot" ...). Entries that were not
    // "used" (brugt) during a frame are dropped at the start of the next one, so players disappear with their objects.
    const giftPlayers = new Map();
    const petPlayers = new Map();
    // Player for a pet-pack animation; recreated when the animation id or its variant number changes.
    const getPetPlayer = (key, animId, variant = 0) => {
      let entry = petPlayers.get(key);
      if (!entry || entry.id !== animId || entry.nr !== variant) {
        const anim = pets.anims.get(animId);
        entry = { id: animId, nr: variant, p: anim ? new AnimationPlayer(anim) : null };
        if (entry.p) {
          entry.p.advance(0);
        }
        petPlayers.set(key, entry);
      }
      entry.brugt = true;
      return entry.p;
    };
    const guestPlayers = new Map();
    const sceneryPlayers = new Map(); // stars, roof, mailbox: looping hotel-pack animations
    const getSceneryPlayer = (key, animId) => {
      if (!sceneryPlayers.has(key)) {
        const anim = animsById.get(animId), player = anim ? new AnimationPlayer(anim) : null;
        if (player) {
          player.advance(0);
        }
        sceneryPlayers.set(key, player);
      }
      return sceneryPlayers.get(key);
    };
    const furniturePlayers = new Map();
    // Furniture animations start at a random offset so identical pieces do not animate in lockstep.
    const getFurniturePlayer = (key, animId) => {
      if (!furniturePlayers.has(key)) {
        const anim = furniture.anims.get(animId), player = anim ? new AnimationPlayer(anim) : null;
        if (player) {
          player.advance(randomInt(0, 1e3));
        }
        furniturePlayers.set(key, player);
      }
      return furniturePlayers.get(key);
    };
    const furnitureYOffset = createFurnitureYOffsetLookup(furniture);
    const stovePlayers = new Map();
    // Stoves play a one-shot "active" animation whenever the floor's cook counter (doer) changes;
    // otherwise the normal idle player is used.
    const getStovePlayer = (floor, floorIndex, placement, defaultPlayer) => {
      let entry = stovePlayers.get(floorIndex);
      if ((floor.doer || 0) !== (entry ? entry.taeller : 0)) {
        const anim = furniture.anims.get(furniture.kat[4].aktiv[placement.feature]);
        entry = { taeller: floor.doer || 0, spiller: anim ? new AnimationPlayer(anim) : null };
        if (entry.spiller) {
          entry.spiller.advance(0);
        }
        stovePlayers.set(floorIndex, entry);
      }
      return entry && entry.spiller && !entry.spiller.finished ? entry.spiller : defaultPlayer;
    };
    // Draws a tile layer (rows x columns of sprite offsets from baseSprite) with its top-left at originX/originY,
    // skipping rows that are fully outside the screen. Tile value 0 = empty.
    const drawTileLayer = (layer, baseSprite, originX, originY) => {
      for (let row = 0; row < layer.raekker; row++) {
        const tileY = originY + row * tileSize;
        if (!(tileY <= -tileSize || tileY >= world.skaerm.hoejde)) {
          for (let col = 0; col < layer.kolonner; col++) {
            const tile = layer.felter[row][col];
            if (tile > 0) {
              drawSprite(ctx, spriteManifest, spriteImages, baseSprite + tile, originX + col * tileSize, tileY);
            }
          }
        }
      }
    };
    const sky = createSky({ world, spriteManifest, spriteImages, getSceneryPlayer, foregroundWidth });
    const ctx = canvasRef.current.getContext("2d");
    let animationFrameId;
    let lastFrameTime = performance.now();
    // The main loop: one call per animation frame. `now` is the requestAnimationFrame timestamp (ms), dt the ms since last frame.
    const frame = (now) => {
      const dt = now - lastFrameTime;
      lastFrameTime = now;
      // Advance the simulation (guests, money, deliveries ...) and sync the music with the hotel's music setting.
      advanceHotel(hotel, dt);
      music.til(hotel.musik !== false);
      if (activeMinigame != null) {
        // A minigame is running: this canvas is a transparent overlay that only shows the house sign
        // and, when opened from it, the home-menu windows.
        ctx.clearRect(0, 0, world.skaerm.bredde, world.skaerm.hoejde);
        menuSign.region = hud.menuKnap(ctx, WIDE_MINIGAMES.has(activeMinigame) ? WIDTH_EXTRA : WIDTH_EXTRA / 2);
        if (menuSign.region && !menuOverlayOpen) {
          setSignBox(menuSign.region);
        }
        windows.tegn(uiKit, ctx, world.skaerm.bredde, world.skaerm.hoejde);
        if (menuOverlayOpen !== windows.aaben) {
          setMenuOverlayOpen(windows.aaben);
        }
        animationFrameId = requestAnimationFrame(frame);
        return;
      }
      if (menuOverlayOpen) {
        setMenuOverlayOpen(false);
      }
      // ---- Advance all animation players. Cached players not used in the previous frame are discarded. ----
      for (const player of sceneryPlayers.values()) {
        if (player) {
          player.advance(dt);
        }
      }
      for (const [giftId, entry] of giftPlayers) {
        if (!entry.brugt) {
          giftPlayers.delete(giftId);
          continue;
        }
        entry.brugt = false;
        if (entry.p) {
          entry.p.advance(dt);
        }
        if (entry.aabn && (hotel.gaver || []).some((openedGift) => openedGift.id === giftId && openedGift.aabnet)) {
          entry.aabn.advance(dt);
        }
      }
      for (const [petKey, entry] of petPlayers) {
        if (!entry.brugt) {
          petPlayers.delete(petKey);
          continue;
        }
        entry.brugt = false;
        if (entry.p) {
          entry.p.advance(dt);
        }
      }
      // Show queued reward ("praemie") windows one at a time while the hotel is visible.
      if (hotel.praemier && hotel.praemier.length && !windows.aaben && scene.navn === "hotel") {
        windows.aabn(menus.praemie(hotel.praemier.shift()));
      }
      // Play (and clear) the sounds queued by the simulation, but only while the hotel is shown.
      for (const soundId of hotel.lyde.splice(0)) {
        if (scene.navn === "hotel") {
          soundPlayer.spil(soundId);
        }
      }
      for (const [guestId, entry] of guestPlayers) {
        if (!entry.brugt) {
          guestPlayers.delete(guestId);
          continue;
        }
        entry.brugt = false;
        if (entry.p) {
          entry.p.advance(dt);
        }
      }
      for (const player of furniturePlayers.values()) {
        if (player) {
          player.advance(dt);
        }
      }
      for (const entry of stovePlayers.values()) {
        if (entry.spiller) {
          entry.spiller.advance(dt);
        }
      }
      // The world map replaces the hotel view: draw it and skip the hotel rendering below.
      if (scene.navn === "kort") {
        lastPointLevel = pointLevel(hotel.hentet).antal;
        mapScreen.fremad(dt, startMinigame);
        mapScreen.tegn(ctx, { penge: hotel.penge, rubiner: 0 });
        hudButtonsRef.current = [];
        menuSign.region = hud.menuKnap(ctx);
        windows.tegn(uiKit, ctx, world.skaerm.bredde, world.skaerm.hoejde);
        animationFrameId = requestAnimationFrame(frame);
        return;
      }
      // ---- Hotel scene: update cafe, talking heads and HUD. ----
      cafeRenderer.fremad(dt);
      headsPlayer.tik(dt);
      hud.fremad(dt, headsPlayer.taler);
      // A new point (star) level was reached: let the talking head congratulate.
      const currentPointLevel = pointLevel(hotel.hentet).antal;
      if (currentPointLevel > lastPointLevel) {
        const talkerIndex = gameData.hoveder.talerNiveauer.indexOf(currentPointLevel);
        headsPlayer.haendelse("stjerne", { v0: talkerIndex + 1 });
        headsPlayer.spilLyd(gameData.hoveder.stjerneLyd);
      }
      lastPointLevel = currentPointLevel;
      // The first time a stove finishes a dish (state 3 = ready), the heads comment on it once.
      for (const floor of hotel.etager) {
        if (floor.cafe) {
          for (const stove of floor.cafe.komfurer) {
            if (stove.mad && stove.mad.tilstand === 3 && !stove.mad.meldt) {
              stove.mad.meldt = true;
              headsPlayer.haendelse("mad", { v0: 3 });
            }
          }
        }
      }
      // Smooth camera scroll towards the target set by the "to top"/"to lobby" buttons (kamMaal), easing over ~120 ms.
      if (hotel.kamMaal != null) {
        hotel.kam.y += (hotel.kamMaal - hotel.kam.y) * Math.min(1, dt / 120);
        if (Math.abs(hotel.kamMaal - hotel.kam.y) < 1) {
          hotel.kam.y = hotel.kamMaal;
          hotel.kamMaal = null;
        }
      }
      sky.advance(dt);
      const viewWidth = world.skaerm.bredde;
      const viewHeight = world.skaerm.hoejde;
      const totalHotelHeight = hotelHeight(hotel);
      // Keep the camera inside the world, then use whole pixels for drawing.
      hotel.kam.x = Math.max(0, Math.min(foregroundWidth - viewWidth, hotel.kam.x));
      hotel.kam.y = Math.max(0, Math.min(totalHotelHeight - viewHeight, hotel.kam.y));
      const camX = Math.round(hotel.kam.x);
      const camY = Math.round(hotel.kam.y);
      // ---- Sky: parallax layers move slower than the hotel (2/3, 1/2 ... of the camera movement). ----
      const skyScrollY = Math.trunc(2 * camY / 3);
      const skyGradientY = Math.trunc(-(skyScrollY - totalHotelHeight + foregroundHeight) / 6) - foregroundHeight;
      sky.draw(ctx, camX, skyScrollY, skyGradientY, viewWidth, viewHeight);
      // Background and foreground tile maps (hills / ground), with their own parallax factors.
      drawTileLayer(gameData.baggrund, world.baggrund.base, -Math.trunc(3 * camX / 4), -(Math.trunc(3 * backgroundHeight / 2) - totalHotelHeight + Math.trunc(3 * camY / 4) + Math.trunc(totalHotelHeight / 4)));
      drawTileLayer(gameData.forgrund, world.forgrund.base, -camX, totalHotelHeight - foregroundHeight - camY);
      // ---- Hotel building: the shell sprite of every floor visible on screen. ----
      hotel.etager.forEach((floor, floorIndex) => {
        const floorScreenY = floorTopY(hotel, floorIndex) - camY;
        if (!(floorScreenY < 0 || floorScreenY - world.etage.hoejde > viewHeight)) {
          drawSprite(ctx, spriteManifest, spriteImages, floorSprite(hotel, floor), world.etage.x - camX, floorScreenY);
        }
      });
      // Roof on top of the highest floor.
      const roofPlayer = getSceneryPlayer("tag", world.tag);
      const roofX = world.etage.x - camX;
      const roofY = floorTopY(hotel, hotel.etager.length) - camY;
      drawAnimation(ctx, spriteManifest, spriteImages, roofPlayer, roofX, roofY);
      // Click regions for furniture/cafe objects, rebuilt every frame (later entries are on top).
      const clickRegions = [];
      if (getAnimationBounds(spriteManifest, roofPlayer)) {
        // The picture frame above the roof opens the floor shop.
        const frameX = roofX + Math.trunc(world.etage.bredde / 2);
        const frameY = roofY - 160;
        const framePlayer = getFurniturePlayer("ramme", furniture.kat[16].film[0]);
        drawAnimation(ctx, furniture.M, furniture.T.I, framePlayer, frameX, frameY);
        const frameBounds = getAnimationBounds(furniture.M, framePlayer);
        if (frameBounds) {
          clickRegions.push({ art: "ramme", x0: frameX + frameBounds.x0, y0: frameY + frameBounds.y0, x1: frameX + frameBounds.x1, y1: frameY + frameBounds.y1 });
        }
      }
      // ---- Furniture of every finished floor on screen, drawn back to front by the catalogue's z value. ----
      hotel.etager.forEach((floor, floorIndex) => {
        const floorTop = floorCeilingY(hotel, floorIndex) - camY;
        if (floor.status !== "faerdig" || floorTop > viewHeight || floorTop + world.etage.hoejde < 0) {
          return;
        }
        const zOrderOf = (placement) => furniture.kat[placement.feature >= 0 ? placement.type : EMPTY_SLOT_CATEGORY].z;
        // Placements with feature < 0 are empty slots; only those with a placeholder animation are shown.
        const visiblePlacements = floor.moebler.map((item, itemIndex) => ({ pl: item, idx: itemIndex })).filter((entry) => entry.pl.feature >= 0 || EMPTY_SLOT_FILM_OFFSETS[entry.pl.type]).sort((first, second) => zOrderOf(first.pl) - zOrderOf(second.pl));
        for (const { pl: placement, idx: placementIndex } of visiblePlacements) {
          if (placement.feature < 0) {
            const [filmIndex, xOffset] = EMPTY_SLOT_FILM_OFFSETS[placement.type];
            const emptyPlayer = getFurniturePlayer(`${floorIndex}-${placementIndex}-tom`, furniture.kat[EMPTY_SLOT_CATEGORY].film[filmIndex]);
            const emptyX = world.etage.x + placement.x + xOffset - camX;
            const emptyY = floorTop + placement.y;
            drawAnimation(ctx, furniture.M, furniture.T.I, emptyPlayer, emptyX, emptyY);
            const emptyBounds = getAnimationBounds(furniture.M, emptyPlayer);
            if (emptyBounds) {
              clickRegions.push({ nr: floorIndex, idx: placementIndex, x0: emptyX + emptyBounds.x0, y0: emptyY + emptyBounds.y0, x1: emptyX + emptyBounds.x1, y1: emptyY + emptyBounds.y1 });
            }
            continue;
          }
          const animId = furniture.kat[placement.type].film[placement.feature];
          let player = getFurniturePlayer(`${floorIndex}-${placementIndex}-${animId}`, animId);
          if (placement.type === 4) {
            player = getStovePlayer(floor, floorIndex, placement, player);
          }
          const drawX = world.etage.x + placement.x - camX;
          const drawY = floorTop + placement.y + furnitureYOffset(placement.type, animId);
          // Furniture still being delivered (leveres > 0 ms left) is drawn translucent.
          drawAnimation(ctx, furniture.M, furniture.T.I, player, drawX, drawY, false, placement.leveres > 0 ? 0.35 : 1);
          if (placement.type === 17 && !(placement.leveres > 0)) {
            // Type 17 is the star board: shows the star (point) level as a number above 10, otherwise as small stars.
            const pointCount = pointLevel(hotel.hentet).antal;
            if (pointCount > 10) {
              drawSprite(ctx, furniture.M, furniture.T.I, 4441, drawX, drawY);
              gameData.skrift.tegn(ctx, String(pointCount), drawX, drawY - 18, { font: 1, midt: true, op: true });
            } else {
              const stepX = Math.trunc(254 / (pointCount + 1));
              for (let tick = 1; tick <= pointCount; tick++) {
                drawSprite(ctx, furniture.M, furniture.T.I, 4442, drawX - 127 + stepX * tick, drawY);
              }
            }
          }
          const bounds = getAnimationBounds(furniture.M, player);
          if (!bounds) {
            continue;
          }
          const region = { nr: floorIndex, idx: placementIndex, x0: drawX + bounds.x0, y0: drawY + bounds.y0, x1: drawX + bounds.x1, y1: drawY + bounds.y1 };
          clickRegions.push(region);
          if (placement.leveres > 0) {
            // Delivery countdown ("N s") on top of the box sprite.
            const centerX = (region.x0 + region.x1) / 2;
            const centerY = (region.y0 + region.y1) / 2;
            drawAnimation(ctx, furniture.M, furniture.T.I, getFurniturePlayer("levering", furniture.levering), centerX - 28, centerY);
            ctx.font = "bold 26px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.lineWidth = 5;
            ctx.strokeStyle = "rgba(20,14,26,.8)";
            ctx.fillStyle = "#ffd46b";
            const secondsText = `${Math.ceil(placement.leveres / 1e3)} s`;
            ctx.strokeText(secondsText, centerX, centerY + 50);
            ctx.fillText(secondsText, centerX, centerY + 50);
          }
        }
      });
      // Current frame of the animated coin sprite (moent) that hovers over finished cook income.
      const coinCfg = world.moent;
      const coinSprite = coinCfg.billede + Math.floor(now / (1e3 / coinCfg.fps)) % coinCfg.antal;
      // ---- Cafe/kitchen of each floor. The callback draws the collectable coin and remembers where it is. ----
      hotel.etager.forEach((floor, floorIndex) => {
        const floorTop = floorCeilingY(hotel, floorIndex) - camY;
        if (!(!floor.cafe || floor.status !== "faerdig" || floorTop > viewHeight || floorTop + world.etage.hoejde < 0)) {
          cafeRenderer.tegn(ctx, floor, floorIndex, world.etage.x - camX, floorTop, clickRegions, (anchorX, anchorY) => {
            const coinY = anchorY - world.gaest.hoejde * coinCfg.hoejde;
            drawSpriteScaled(ctx, spriteManifest, spriteImages, coinSprite, anchorX, coinY, coinCfg.skala);
            cookCoinPosRef.current[floorIndex] = { x: anchorX, y: coinY };
          });
        }
      });
      furnitureHitsRef.current = clickRegions;
      // ---- Pet floors (kaeledyr): name/level board, trophy shelf, feeding stalls (boder) and the pet itself. ----
      const petData = hotel.kd;
      const petStallHits = [];
      const petFloors = hotel.etager.map((floor, floorIndex) => ({ e: floor, nr: floorIndex, top: floorCeilingY(hotel, floorIndex) - camY })).filter(({ e: floor, top }) => floor.kaeledyr && floor.status === "faerdig" && top < viewHeight && top + world.etage.hoejde > 0);
      if (petFloors.length) {
        loadPetAssets();
      }
      if (pets.klar) {
        const board = petData.tavle;
        for (const { e: floor, nr: floorIndex, top } of petFloors) {
          const pet = floor.kaeledyr.dyr;
          const petType = petData.dyr.film[pet.nr].type;
          const boardX = world.etage.x - camX + Math.trunc(world.etage.bredde * board.tavlePos[0] / 100);
          const boardY = top + Math.trunc(world.etage.hoejde * board.tavlePos[1] / 100);
          const shelfX = world.etage.x - camX + Math.trunc(world.etage.bredde * board.hyldePos[0] / 100);
          const shelfY = top + Math.trunc(world.etage.hoejde * board.hyldePos[1] / 100);
          drawAnimation(ctx, pets.M, pets.I, getPetPlayer(`${floorIndex}-tavle`, board.film[petType]), boardX, boardY);
          drawAnimation(ctx, pets.M, pets.I, getPetPlayer(`${floorIndex}-hylde`, board.hylde[petType]), shelfX, shelfY);
          // The trophy animation starts at a random time so several pet floors do not look identical.
          const trophy = getPetPlayer(`${floorIndex}-pokal`, board.pokaler[petType][petTrophyLevel(pet.point)]);
          if (trophy && !trophy.startet) {
            trophy.startet = true;
            trophy.advance(Math.floor(Math.random() * 10001));
          }
          drawAnimation(ctx, pets.M, pets.I, trophy, shelfX, shelfY);
          // Pet name and level are printed on the board; the offsets nudge the text (px) into the board's text areas.
          const boardHeight = pets.M.sprites[board.tavleBillede].h;
          const nameOffset = -10;
          const levelOffset = 13;
          gameData.skrift.tegn(ctx, pet.navn, boardX, boardY + boardHeight * board.navnDy / 100 + nameOffset, { font: 2, midt: true, op: true });
          gameData.skrift.tegn(ctx, `${board.niveauTekst}${petLevel(pet.point)}`, boardX, boardY + boardHeight * board.niveauDy / 100 + levelOffset, { font: 2, midt: true, op: true });
          // Progress bar towards the next pet level (pet.bjaelke.v is the animated fill value).
          const bar = board.bjaelke;
          const barX = boardX + bar.dx;
          const barY = boardY + boardHeight * bar.dy / 100;
          ctx.fillStyle = `rgb(${bar.farve.join(",")})`;
          ctx.fillRect(barX, barY, Math.trunc(bar.bredde * pet.bjaelke.v), bar.hoejde);
          drawSprite(ctx, pets.M, pets.I, board.bjaelkeBillede, barX, barY);
        }
        // Stalls (boder): back layer "film", then items (varer) in the stalls, then the front layer "forrest" on top.
        for (const { e: floor, nr: floorIndex, top } of petFloors) {
          const petState = floor.kaeledyr;
          const getStallPlayer = (stall, stallIndex, layer) => getPetPlayer(`${floorIndex}-bod${stallIndex}-${layer}`, petData.boder[layer][stall.film][stall.type], stall.nr);
          petState.boder.forEach((stall, stallIndex) => {
            const stallX = world.etage.x - camX + PET_STALL_X[stallIndex];
            const stallY = top + PET_STALL_Y;
            const stallPlayer = getStallPlayer(stall, stallIndex, "film");
            drawAnimation(ctx, pets.M, pets.I, stallPlayer, stallX, stallY);
            const bounds = getAnimationBounds(pets.M, stallPlayer);
            if (bounds) {
              petStallHits.push({ nr: floorIndex, i: stallIndex, felt: { x0: stallX + bounds.x0 - 25, x1: stallX + bounds.x1 + 25, y0: stallY + bounds.y0 - 25, y1: stallY + bounds.y1 + 25 } });
            }
          });
          petState.varer.forEach((item, itemIndex) => {
            if (item.aktiv) {
              return;
            }
            const animId = petData.forbrug.film[item.type][item.f];
            drawAnimation(ctx, pets.M, pets.I, getPetPlayer(`${floorIndex}-vare${itemIndex}`, animId), world.etage.x - camX + PET_STALL_X[item.type] + petData.forbrug.dx[item.type], top + PET_STALL_Y);
          });
          petState.boder.forEach((stall, stallIndex) => drawAnimation(ctx, pets.M, pets.I, getStallPlayer(stall, stallIndex, "forrest"), world.etage.x - camX + PET_STALL_X[stallIndex], top + PET_STALL_Y));
        }
      }
      petStallHitsRef.current = petStallHits;
      // ---- Gifts lying on the floors: the box animation plus (once opened) the opening animation. ----
      const giftCfg = world.gave;
      const giftHits = [];
      for (const gift of hotel.gaver || []) {
        let players = giftPlayers.get(gift.id);
        if (!players) {
          const boxAnim = animsById.get(giftCfg.film), openAnim = animsById.get(giftCfg.aabn[0][gift.i]);
          players = { p: boxAnim ? new AnimationPlayer(boxAnim) : null, aabn: openAnim ? new AnimationPlayer(openAnim) : null };
          if (players.p) {
            players.p.advance(gift.start);
          }
          if (players.aabn) {
            players.aabn.advance(0);
          }
          giftPlayers.set(gift.id, players);
        }
        players.brugt = true;
        const giftX = gift.x - camX;
        const giftY = floorTopY(hotel, gift.etage) - camY;
        if (giftY < -100 || giftY - 100 > viewHeight) {
          continue;
        }
        // The skin override swaps the base sprite of the box animation for this gift's colour.
        const skinOverride = { [giftCfg.basis]: giftCfg.skins[0][gift.i] };
        drawAnimation(ctx, spriteManifest, spriteImages, players.p, giftX, giftY, false, gift.alfa.v / 255, giftHopScale(hotel, gift), skinOverride);
        if (gift.aabnet) {
          drawAnimation(ctx, spriteManifest, spriteImages, players.aabn, giftX, giftY);
        }
        const bounds = !gift.aabnet && getAnimationBounds(spriteManifest, players.p, skinOverride);
        if (bounds) {
          giftHits.push({ g: gift, mx: giftX, my: giftY, felt: { x0: giftX + bounds.x0 - giftCfg.tryk, x1: giftX + bounds.x1 + giftCfg.tryk, y0: giftY + bounds.y0 - giftCfg.tryk, y1: giftY + bounds.y1 + giftCfg.tryk } });
        }
      }
      giftHitsRef.current = giftHits;
      // ---- Guests walking on each floor (VIP guests use their own animation set). ----
      const guestHits = [];
      hotel.etager.forEach((floor, floorIndex) => {
        const floorY = floorCeilingY(hotel, floorIndex) + world.gulvDy - camY;
        if (!(floorY < -50 || floorY - world.gaest.hoejde > viewHeight)) {
          floor.gaester.forEach((guest) => {
            const animId = guestAnimationIds(hotel, guest)[guest.anim ?? 1];
            let entry = guestPlayers.get(guest.id);
            if (!entry || entry.id !== animId || entry.anim !== guest.anim) {
              const anim = animsById.get(animId);
              entry = { id: animId, anim: guest.anim, p: anim ? new AnimationPlayer(anim) : null };
              if (entry.p) {
                entry.p.advance(0);
              }
              guestPlayers.set(guest.id, entry);
            }
            entry.brugt = true;
            const guestX = world.etage.x + guest.x - camX;
            const guestY = floorY - (guest.loeft ? guest.loeft.v : 0); // loeft = current lift height (jump / float)
            const scale = world.gaest.skala || 1;
            drawAnimation(ctx, spriteManifest, spriteImages, entry.p, guestX, guestY, !!guest.spejl, guest.alfa ? guest.alfa.v / 255 : 1, scale);
            // Click box (felt) = animation bounds (mirrored when the guest faces left) padded by 25 px.
            // Where the guest has paid (klar) a coin is shown above them and the box grows to include it.
            const coinY = guestY - world.gaest.hoejde * coinCfg.hoejde;
            const bounds = getAnimationBounds(spriteManifest, entry.p);
            const hitBox = bounds ? { x0: guestX + scale * (guest.spejl ? -bounds.x1 : bounds.x0) - 25, x1: guestX + scale * (guest.spejl ? -bounds.x0 : bounds.x1) + 25, y0: guestY + scale * bounds.y0 - 25, y1: guestY + scale * bounds.y1 + 25 } : { x0: guestX - 25, x1: guestX + 25, y0: guestY - 25, y1: guestY + 25 };
            if (guest.klar) {
              drawSpriteScaled(ctx, spriteManifest, spriteImages, coinSprite, guestX, coinY, coinCfg.skala);
              const coinSpriteInfo = spriteManifest.sprites[coinCfg.billede];
              hitBox.x0 = Math.min(hitBox.x0, guestX - coinSpriteInfo.ox * coinCfg.skala - 25);
              hitBox.x1 = Math.max(hitBox.x1, guestX + (coinSpriteInfo.w - coinSpriteInfo.ox) * coinCfg.skala + 25);
              hitBox.y0 = Math.min(hitBox.y0, coinY - coinSpriteInfo.oy * coinCfg.skala - 25);
            }
            guestHits.push({ nr: floorIndex, g: guest, felt: hitBox, mx: guestX, my: coinY });
          });
        }
      });
      guestHitsRef.current = guestHits;
      // ---- The pets themselves, with need bubble, coin and comfort smiley. ----
      const petHits = [];
      if (pets.klar) {
        const petCfg = petData.dyr;
        for (const { e: floor, nr: floorIndex, top } of petFloors) {
          const pet = floor.kaeledyr.dyr;
          const petType = petCfg.film[pet.nr];
          const petX = world.etage.x - camX + petCfg.gulvDx + pet.x;
          const petY = top + petCfg.gulvDy;
          const player = getPetPlayer(`${floorIndex}-dyr`, petType.film[pet.film], pet.animNr);
          drawAnimation(ctx, pets.M, pets.I, player, petX, petY, !pet.venstre, 1, petCfg.skala);
          const bubbleX = petX + petCfg.bredde * 0.8 * petCfg.skala;
          const bubbleY = petY - petCfg.hoejde * 1.3 * petCfg.skala;
          drawAnimation(ctx, pets.M, pets.I, getPetPlayer(`${floorIndex}-boble`, petCfg.behov[petType.type][pet.boble.film], pet.boble), bubbleX, bubbleY);
          const coinY = petY - petCfg.hoejde * 1.3 * petCfg.skala;
          if (pet.klar) {
            drawSpriteScaled(ctx, spriteManifest, spriteImages, coinSprite, petX, coinY, petCfg.skala / 2, pet.moentAlfa.v / 255);
          }
          drawSprite(ctx, pets.M, pets.I, petCfg.smileys[petComfortLevel(hotel, floor)], petX, petY - petCfg.hoejde * petCfg.skala);
          if (pet.hjerte.vis) {
            drawAnimation(ctx, pets.M, pets.I, getPetPlayer(`${floorIndex}-hjerte`, petCfg.hjerte, pet.hjerte), bubbleX, bubbleY);
          }
          const bounds = getAnimationBounds(pets.M, player);
          const scale = petCfg.skala;
          const hitBox = bounds ? { x0: petX + scale * (pet.venstre ? bounds.x0 : -bounds.x1) - 25, x1: petX + scale * (pet.venstre ? bounds.x1 : -bounds.x0) + 25, y0: petY + scale * bounds.y0 - 25, y1: petY + scale * bounds.y1 + 25 } : { x0: petX - 50, x1: petX + 50, y0: petY - 90, y1: petY + 25 };
          if (pet.klar) {
            hitBox.y0 = Math.min(hitBox.y0, coinY - 40);
          }
          petHits.push({ nr: floorIndex, felt: hitBox, mx: petX, my: coinY });
        }
      }
      petHitsRef.current = petHits;
      // VIP guests that are staying (not waiting to pay) show a countdown of their remaining stay above their head.
      for (const hit of guestHits) {
        const guest = hit.g;
        if (guest.vip == null || guest.klar || !(guest.visTil > hotel.tid)) {
          continue;
        }
        const timeText = formatDuration(Math.max(0, Math.ceil(guest.opholdTid / 1e3)));
        const textWidth = gameData.skrift.bredde(timeText, 26, 2);
        const textX = hit.mx - textWidth / 2;
        const textY = hit.my - world.vip.dy;
        uiKit.sprite("ui", world.vip.ikon, textX, textY);
        gameData.skrift.tegn(ctx, timeText, hit.mx, textY + 13, { font: 2, midt: true });
      }
      // ---- Mailbox, HUD, floating coin effects and open windows (always on top). ----
      const mailbox = world.postkasse;
      drawAnimation(ctx, spriteManifest, spriteImages, getSceneryPlayer("postkasse", mailbox.film[0]), world.etage.x + Math.trunc(world.etage.bredde * mailbox.x) - camX, floorCeilingY(hotel, 0) + Math.trunc(world.etage.hoejde * mailbox.y) - camY);
      hudButtonsRef.current = hud.tegn(ctx, { penge: hotel.penge, rubiner: 0, point: hotel.hentet, synes: 0, nyPost: false, hoveder: headsPlayer.tilstand });
      coinPopupsRef.current.fremad(dt);
      coinPopupsRef.current.tegn(ctx);
      menuSign.region = hud.menuKnap(ctx);
      windows.tegn(uiKit, ctx, viewWidth, viewHeight);
      animationFrameId = requestAnimationFrame(frame);
    };
    animationFrameId = requestAnimationFrame(frame);
    const canvasEl = canvasRef.current;
    // Autosave every 5 s, when the tab is hidden and when leaving the page (unless the player just reset the game).
    const saveHotel = () => {
      if (!resettingSaves) {
        serializeHotel(hotel);
      }
    };
    const autosaveTimer = setInterval(saveHotel, 5e3);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveHotel();
      }
    };
    window.addEventListener("beforeunload", saveHotel);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      registerNewsOpener(null);
      registerInfoOpener(null);
      cancelAnimationFrame(animationFrameId);
      canvasEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      keyboardInput.remove();
      unmountMinigame(true);
      headsPlayer.stop();
      mapScreen.stop();
      music.stop();
      saveHotel();
      clearInterval(autosaveTimer);
      window.removeEventListener("beforeunload", saveHotel);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  };
  loadGameData().then((gameData) => {
    if (destroyed) {
      return;
    }
    teardown = start(gameData);
  }).catch((error) => {
    if (destroyed) {
      return;
    }
    swapIn(h("div", { className: "msg" }, "Kunne ikke indlæse: ", error.message, ". Kør ", h("code", null, "node Tools/export-spil.js"), " først."));
  });
  return handle;
}
