// Pointer (mouse/touch) handling for the game canvas: dragging scrolls the hotel/map camera or the top window's list,
// and a short press without dragging is forwarded as a click.

/**
 * Builds the pointer handlers for the game canvas.
 * @param gameData   loaded game data (for the canvas logical size)
 * @param canvasRef  ref to the canvas element
 * @param sessionRef ref to the UI objects created by GameScreen (windows, map, scene)
 * @param hotelRef   ref to the live hotel state
 * @param dragRef    ref holding the drag in progress, if any
 * @param handleClick click handler called with canvas coordinates
 */
export function createPointerHandlers({ gameData, canvasRef, sessionRef, hotelRef, dragRef, handleClick }) {
  // Converts a pointer event to canvas (world screen) coordinates; the canvas is CSS-scaled, hence the scale factor.
  const toWorldPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = gameData.verden.skaerm.hoejde / rect.height;
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
  };
  // The camera being dragged: the map's while on the map, otherwise the hotel's.
  const getCamera = () => sessionRef.current && sessionRef.current.scene.navn === "kort" ? sessionRef.current.kort.kam : hotelRef.current.kam;
  // Starts a drag: either a drag inside the top window (scroll bars, sliders: dragCallback) or a camera/list scroll.
  const onPointerDown = (event) => {
    const camera = getCamera();
    const topMenu = sessionRef.current && sessionRef.current.menuer.top();
    const point = toWorldPoint(event);
    const dragCallback = topMenu ? sessionRef.current.menuer.traekStart(sessionRef.current.kit, point) : null;
    if (dragCallback) {
      dragCallback(point);
    }
    // p = start point, x/y = camera start, flyttet = moved beyond the click threshold, rul = start scroll of the window.
    dragRef.current = { p: point, x: camera.x, y: camera.y, flyttet: false, menu: topMenu, rul: topMenu && topMenu.rul || 0, skyder: dragCallback };
    hotelRef.current.kamMaal = null;
    if (canvasRef.current.setPointerCapture) {
      canvasRef.current.setPointerCapture(event.pointerId);
    }
  };
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || !hotelRef.current) {
      return;
    }
    const point = toWorldPoint(event);
    if (drag.skyder) {
      drag.skyder(point);
      return;
    }
    // Movement of 8 px or less still counts as a click (see onPointerUp).
    if (Math.hypot(point.x - drag.p.x, point.y - drag.p.y) > 8) {
      drag.flyttet = true;
    }
    if (!drag.flyttet) {
      return;
    }
    if (drag.menu) {
      drag.menu.rul = drag.rul - (point.y - drag.p.y);
      return;
    }
    const camera = getCamera();
    camera.x = drag.x - (point.x - drag.p.x);
    camera.y = drag.y - (point.y - drag.p.y);
  };
  // Pointer released: a short press without dragging counts as a click.
  const onPointerUp = (event) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.flyttet && !drag.skyder && event.type === "pointerup") {
      handleClick(toWorldPoint(event));
    }
  };
  return { onPointerDown, onPointerMove, onPointerUp };
}
