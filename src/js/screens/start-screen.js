// Start screen: title -> save-slot list -> "new player" / "delete player" dialogs.
// Rendered on its own canvas (same bitmap font and UI kit as the game) before the main
// game assets are loaded. Calls onSelect(slotId) when the player picks or creates a slot.
// screenState.mode is one of "titel" (title), "liste" (slot list), "ny" (name entry),
// "slet" (delete confirmation).
import { h } from '../dom.js';
import { GAME_WIDTH, GAME_HEIGHT, backdropPlacement } from '../engine/constants.js';
import { createTextureLoader } from '../render/canvas-helpers.js';
import { createBitmapTextRenderer } from '../ui/panels.js';
import { createUiKit } from '../minigames/ui-kit.js';
import { prepareThemeMusic, startThemeMusic } from '../loaders/data-loaders.js';
import { listSlots, createSlot, deleteSlot, MAX_SLOTS, MAX_NAME_LENGTH } from '../storage/saves.js';

// Fetches and parses a JSON file.
const fetchJson = (url) => fetch(url).then((response) => response.json());
// Loads an image; resolves to null (instead of rejecting) if it fails.
const loadImage = (src) => new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = src; });

// Loads only what the start screen needs (UI frames + bitmap font + backdrop).
async function loadStartAssets() {
  const [uiJson, uiManifest, fontJson, fontManifest] = await Promise.all([
    fetchJson("data/ui/ui.json"), fetchJson("data/ui/manifest.json"), fetchJson("data/skrift/skrift.json"), fetchJson("data/skrift/manifest.json"),
  ]);
  const images = {};
  await Promise.all(fontJson.skrifter.map(async (fontEntry) => {
    const sprite = fontManifest.sprites[fontEntry.billede];
    images[fontEntry.billede] = await loadImage(`data/skrift/tex/${fontManifest.textures[sprite.assetId].file}`);
  }));
  prepareThemeMusic(await fetchJson("data/musik/musik.json"));
  const backdrop = cleanBackdrop(await loadImage("data/vent/vent.webp"));
  const logos = { pixeline: await loadImage("img/logo-pixeline.svg"), hotel: await loadImage("img/logo-stjernehotellet.svg") };
  return { logos, U: uiJson, ui: { M: uiManifest, T: createTextureLoader("data/ui", uiManifest) }, skrift: createBitmapTextRenderer(fontJson, images), backdrop };
}

// The loading image has "Vent venligst..." baked into the sky. Paint the sky back over it
// by stretching a text-free pixel column across the text rows, so we get a clean island scene.
function cleanBackdrop(image) {
  if (!image) return null;
  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = image.naturalWidth; scratchCanvas.height = image.naturalHeight;
  const scratchCtx = scratchCanvas.getContext("2d");
  scratchCtx.drawImage(image, 0, 0);
  if (image.naturalWidth === 1024 && image.naturalHeight === 768) {
    scratchCtx.drawImage(image, 40, 150, 1, 130, 90, 150, 850, 130);
  }
  return scratchCanvas;
}

// Characters allowed in a player name (names are shown in the all-caps bitmap font).
const NAME_CHAR = /^[A-ZÆØÅ0-9 \-]$/;
const ROW_H = 92; // height of one save-slot row, px
const LIST_ROWS = 3; // number of slot rows visible before the list scrolls

// Formats a timestamp as d/m/yyyy.
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

// Loads the start assets, then runs the canvas UI. Returns { el, destroy }.
export function createStartScreen({ onSelect }) {
  const canvas = h("canvas", { width: GAME_WIDTH, height: GAME_HEIGHT, style: { cursor: "default" } });
  const handle = { el: h("div", { className: "spil uden-panel" }, h("div", { className: "skaerm" }, canvas)), destroy };
  let destroyed = false, stopUi = null;

  function destroy() {
    destroyed = true;
    if (stopUi) stopUi();
    stopUi = null;
    if (handle.el && handle.el.parentNode) handle.el.parentNode.removeChild(handle.el);
  }

  loadStartAssets().then((loadedAssets) => {
    if (destroyed) return;
    stopUi = run(loadedAssets);
  }).catch((err) => {
    if (destroyed) return;
    const message = h("div", { className: "msg" }, "Kunne ikke indlæse: ", err.message);
    handle.el.replaceWith(message);
    handle.el = message;
  });

  // Runs the canvas UI once the assets are loaded; returns the cleanup function.
  function run(assets) {
    const ctx = canvas.getContext("2d");
    const { U: uiDefs, ui: uiTextures, skrift, backdrop, logos } = assets;
    const kit = createUiKit(ctx, { ui: { M: uiTextures.M, I: uiTextures.T.I } }, uiDefs, skrift);
    let skipTitle = false;
    try {
      skipTitle = sessionStorage.getItem("stjernehotellet-spring-titel") === "1";
      sessionStorage.removeItem("stjernehotellet-spring-titel");
    } catch {}
    const screenState = { slots: listSlots(), mode: skipTitle ? "liste" : "titel", navn: "", slet: null, liste: {}, tid: 0 };
    startThemeMusic();
    const refresh = () => { screenState.slots = listSlots(); };

    // Invisible <input> so touch devices get an on-screen keyboard while typing a name.
    const hidden = document.createElement("input");
    Object.assign(hidden.style, { position: "fixed", left: "-1000px", top: "0", opacity: "0" });
    hidden.setAttribute("autocapitalize", "characters");
    document.body.appendChild(hidden);

    const addChar = (char) => {
      char = char.toUpperCase();
      if (NAME_CHAR.test(char) && screenState.navn.length < MAX_NAME_LENGTH) screenState.navn += char;
    };
    const confirmName = () => {
      const slotId = createSlot(screenState.navn);
      if (slotId) onSelect(slotId);
    };
    const startGame = () => {
      startThemeMusic();
      screenState.mode = "liste";
    };
    const onKey = (event) => {
      if (screenState.mode === "titel" && (event.key === "Enter" || event.key === " ")) { startGame(); event.preventDefault(); return; }
      if (screenState.mode !== "ny" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter") { confirmName(); event.preventDefault(); }
      else if (event.key === "Escape") { screenState.mode = "liste"; event.preventDefault(); }
      else if (event.key === "Backspace") { screenState.navn = screenState.navn.slice(0, -1); event.preventDefault(); }
      else if (event.key.length === 1 && event.target !== hidden) { addChar(event.key); event.preventDefault(); }
    };
    hidden.addEventListener("input", () => { for (const char of hidden.value) addChar(char); hidden.value = ""; });
    window.addEventListener("keydown", onKey);

    // Centred dialog rectangle of the given size, nudged 40px down to leave room for the logos.
    const centeredWindow = (width, height) => ({ x: Math.round((GAME_WIDTH - width) / 2), y: (GAME_HEIGHT - height) / 2 + 40, w: width, h: height });

    // Draws a logo centred horizontally at y with width `width` (aspect ratio kept) and a soft shadow.
    const drawLogo = (image, width, y) => {
      if (!image) return;
      const height = width * image.height / image.width;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.35)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(image, Math.round((GAME_WIDTH - width) / 2), y, width, height);
      ctx.restore();
    };

    // Title mode: the big "START SPIL" button.
    const drawTitle = () => {
      const width = 420, height = 88, x = Math.round((GAME_WIDTH - width) / 2), y = 520;
      kit.ramme("punkt", x, y, width, height);
      kit.tekst("START SPIL", GAME_WIDTH / 2, y + height / 2, { str: 34, midt: true });
      kit.knap({ x0: x, y0: y, x1: x + width, y1: y + height }, startGame);
    };

    // Slot list: scrollable save slots (name, floors, money, last played) + delete icons + "new player" button.
    const drawList = () => {
      const panel = centeredWindow(704, 448);
      kit.ramme("hoved", panel.x, panel.y, panel.w, panel.h);
      kit.overskrift(screenState.slots.length ? "VÆLG SPILLER" : "VELKOMMEN", panel.x + panel.w / 2, panel.y - 16);
      const listX = panel.x + 40, listY = panel.y + 40, listWidth = panel.w - 80, listHeight = ROW_H * LIST_ROWS;
      if (!screenState.slots.length) {
        kit.tekst("Du har ingen gemte spil endnu. Opret en ny spiller for at begynde.", listX + 16, listY + 24, { bredde: listWidth - 32, str: 22, op: true });
      } else {
        kit.rulleliste(screenState.liste, listX, listY, listWidth, listHeight, screenState.slots.length * ROW_H, (listTop) => {
          screenState.slots.forEach((slot, index) => {
            const rowY = listTop + index * ROW_H;
            kit.ramme("punkt", listX, rowY, listWidth - 12, ROW_H - 8);
            kit.tekst(slot.navn, listX + 24, rowY + 28, { str: 26 });
            const info = slot.etager != null ? `${slot.etager} ETAGER  ·  ${slot.penge ?? 0} KR.  ·  ${formatDate(slot.sidst)}` : `NYT SPIL  ·  ${formatDate(slot.oprettet)}`;
            kit.tekst(info, listX + 24, rowY + 58, { str: 16, op: false });
            kit.knap({ x0: listX, y0: rowY, x1: listX + listWidth - 80, y1: rowY + ROW_H - 8 }, () => onSelect(slot.id));
            kit.spriteKnap(uiDefs.ikoner.nejLille, listX + listWidth - 56, rowY + (ROW_H - 8) / 2, () => { screenState.slet = slot; screenState.mode = "slet"; });
          });
        });
      }
      const full = screenState.slots.length >= MAX_SLOTS;
      kit.tekstKnap(full ? "FULDT" : "NYT SPIL", panel.x + panel.w / 2 - 150, panel.y + panel.h - 92, 300, 64, () => {
        screenState.mode = "ny"; screenState.navn = ""; hidden.focus();
      }, { aktiv: !full });
    };

    // Name-entry dialog with a blinking cursor (toggles every 500 ms).
    const drawNew = () => {
      const panel = centeredWindow(704, 320);
      kit.ramme("hoved", panel.x, panel.y, panel.w, panel.h);
      kit.overskrift("NY SPILLER", panel.x + panel.w / 2, panel.y - 16);
      kit.tekst("Skriv et navn:", panel.x + panel.w / 2, panel.y + 52, { str: 22, midt: true });
      kit.ramme("punkt", panel.x + 112, panel.y + 90, panel.w - 224, 64);
      const blink = Math.floor(screenState.tid / 500) % 2 === 0 ? "_" : "";
      kit.tekst(screenState.navn + blink, panel.x + panel.w / 2, panel.y + 122, { str: 28, midt: true });
      kit.knap({ x0: panel.x + 112, y0: panel.y + 90, x1: panel.x + panel.w - 112, y1: panel.y + 154 }, () => hidden.focus());
      kit.tekstKnap("START", panel.x + 60, panel.y + panel.h - 92, 270, 64, confirmName, { aktiv: screenState.navn.trim().length > 0 });
      kit.tekstKnap("TILBAGE", panel.x + panel.w - 330, panel.y + panel.h - 92, 270, 64, () => { screenState.mode = "liste"; });
    };

    // Confirmation dialog for deleting the selected slot.
    const drawDelete = () => {
      const panel = centeredWindow(576, 288);
      kit.ramme("hoved", panel.x, panel.y, panel.w, panel.h);
      kit.overskrift("SLET SPILLER?", panel.x + panel.w / 2, panel.y - 16);
      kit.tekst(`${screenState.slet.navn} og alle gemte data slettes for altid.`, panel.x + panel.w / 2, panel.y + 60, { midt: true, bredde: panel.w - 96, str: 22, op: true });
      kit.tekstKnap("JA", panel.x + 48, panel.y + panel.h - 92, 220, 64, () => { deleteSlot(screenState.slet.id); refresh(); screenState.mode = "liste"; });
      kit.tekstKnap("NEJ", panel.x + panel.w - 268, panel.y + panel.h - 92, 220, 64, () => { screenState.mode = "liste"; });
    };

    // Main render loop: backdrop, logos (large in title mode), then the current mode's UI.
    let animationFrameId = 0, last = performance.now();
    const frame = (timestamp) => {
      screenState.tid = timestamp; last = timestamp;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      if (backdrop) {
        const placement = backdropPlacement(GAME_WIDTH);
        ctx.drawImage(backdrop, 0, placement.y + 40, backdrop.width * placement.scale, backdrop.height * placement.scale);
      }
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      kit.start();
      const isTitleMode = screenState.mode === "titel";
      const pixelineLogoWidth = isTitleMode ? 560 : 380, hotelLogoWidth = isTitleMode ? 500 : 340;
      const pixelineLogoHeight = logos.pixeline ? pixelineLogoWidth * logos.pixeline.height / logos.pixeline.width : 0;
      drawLogo(logos.pixeline, pixelineLogoWidth, isTitleMode ? 18 : 6);
      drawLogo(logos.hotel, hotelLogoWidth, (isTitleMode ? 18 : 6) + pixelineLogoHeight + (isTitleMode ? 0 : -4));
      if (isTitleMode) {
        drawTitle();
      }
      if (screenState.mode === "titel") { /* drawn above */ } else if (screenState.mode === "liste") drawList(); else if (screenState.mode === "ny") drawNew(); else drawDelete();
      animationFrameId = requestAnimationFrame(frame);
    };
    animationFrameId = requestAnimationFrame(frame);

    // Converts a pointer event to game-canvas coordinates (canvas is CSS-scaled).
    const pointerPosition = (event) => {
      const rect = canvas.getBoundingClientRect(), scale = GAME_HEIGHT / rect.height;
      return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
    };
    // Drag-to-scroll the slot list; a press that moved < 8px counts as a click on the UI kit.
    let drag = null;
    const onPointerDown = (event) => { drag = { p: pointerPosition(event), rul: screenState.liste.rul || 0, flyttet: false }; canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId); };
    const onPointerMove = (event) => {
      if (!drag) return;
      const current = pointerPosition(event);
      if (Math.hypot(current.x - drag.p.x, current.y - drag.p.y) > 8) drag.flyttet = true;
      if (drag.flyttet && screenState.mode === "liste") screenState.liste.rul = drag.rul - (current.y - drag.p.y);
    };
    const onPointerUp = (event) => { if (drag && !drag.flyttet) kit.klik(pointerPosition(event)); drag = null; };
    const onWheel = (event) => { if (screenState.mode === "liste") { event.preventDefault(); screenState.liste.rul = (screenState.liste.rul || 0) + event.deltaY; } };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      hidden.remove();
    };
  }
  return handle;
}
