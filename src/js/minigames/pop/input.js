/**
 * Pointer and keyboard input for the Popstars minigame.
 *
 * createPopInput installs the four canvas pointer handlers and the keyboard shortcuts and returns { destroy }.
 * `getApi()` returns the small interface the running game publishes (menuer = window stack, kit = UI kit,
 * ned/traekTil/slip/afbryd = game pointer down/drag/up/cancel, trykNed = press a lane, visning = current view),
 * or null while no game runs.
 * A pointer gesture is either a "menu" gesture (a window is open: drag scrolls, a short tap clicks) or a game gesture
 * (camera drag in the shop, lane taps during a concert).
 */

/**
 * @param {object} p
 * @param {HTMLCanvasElement} p.canvas  the game canvas
 * @param {() => object|null} p.getApi  interface published by the game closure (see file header)
 * @param {() => boolean} p.isPaused  true while the host game is paused
 * @param {() => object|null} p.getNarrator  narrator, poked on every press so it can skip speech
 * @param {number} p.screenWidth  logical canvas width (height is always 768)
 * @param {object} p.assets  loaded assets (used for the lane button positions)
 */
export function createPopInput({ canvas, getApi, isPaused, getNarrator, screenWidth, assets }) {
  let pointer = null;
  const toCanvasCoords = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * screenWidth / rect.width, (event.clientY - rect.top) * 768 / rect.height];
  };
  const onPointerDown = (event) => {
    const api = getApi();
    if (!api || isPaused()) {
      return;
    }
    const narrator = getNarrator();
    if (narrator) {
      narrator.poke();
    }
    const [px, py] = toCanvasCoords(event);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    catch {
    }
    if (api.menuer.aaben) {
      pointer = { menu: true, x: px, y: py, flyttet: 0 };
      return;
    }
    pointer = { menu: false };
    api.ned(px, py);
  };
  const onPointerMove = (event) => {
    const api = getApi();
    if (!pointer || !api) {
      return;
    }
    const [px, py] = toCanvasCoords(event);
    if (!pointer.menu) {
      api.traekTil(px, py);
      return;
    }
    if (api.menuer.aaben) {
      api.menuer.rul(pointer.y - py);
    }
    pointer.flyttet += Math.abs(px - pointer.x) + Math.abs(py - pointer.y);
    pointer.x = px;
    pointer.y = py;
  };
  const onPointerUp = (event) => {
    const api = getApi();
    const gesture = pointer;
    pointer = null;
    if (!gesture || !api) {
      return;
    }
    const [px, py] = toCanvasCoords(event);
    if (!gesture.menu) {
      api.slip(px, py);
      return;
    }
    if (!(gesture.flyttet > 12 || isPaused())) {
      api.menuer.klik(api.kit, { x: px, y: py });
    }
  };
  const onPointerCancel = () => {
    const api = getApi();
    const gesture = pointer;
    pointer = null;
    if (gesture && !gesture.menu && api) {
      api.afbryd();
    }
  };
  const keyToLane = { d: 0, f: 1, j: 2, k: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
  const onKeyDown = (event) => {
    const api = getApi();
    if (event.repeat || !api || api.visning !== "koncert" || isPaused() || api.menuer.aaben) {
      return;
    }
    const lane = keyToLane[event.key.toLowerCase()];
    if (lane !== void 0) {
      api.trykNed(assets.spil.knapper.x[lane], assets.spil.knapper.y - 40);
    }
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("keydown", onKeyDown);
  return {
    destroy() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
