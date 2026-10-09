// Zoo minigame: pointer (touch/mouse) input on the canvas: panning, menu scrolling and tap detection.

import { worldWidth } from '../../game/world.js';
import { zooSessionRef } from './session.js';

/** Creates the canvas pointer handlers. `gameRef.current` holds { menuer: windows, kit, poke, tryk }; `dragRef` the gesture in progress. */
export function createPointerHandlers({ canvasRef, gameRef, dragRef, pausedRef, cameraRef, loadState, canvasWidth }) {
  /** Converts a pointer event to canvas coordinates (canvas is 768 px high; may be CSS-scaled). */
  const eventToCanvas = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [(event.clientX - rect.left) * canvasWidth / rect.width, (event.clientY - rect.top) * 768 / rect.height];
  };
  /** Pointer down: starts a drag (map pan) or, when a menu is open, a menu scroll/click gesture. */
  const onPointerDown = (event) => {
    const game = gameRef.current;
    if (!game || pausedRef.current) {
      return;
    }
    game.poke();
    const [canvasX, canvasY] = eventToCanvas(event);
    if (game.menuer.aaben) {
      dragRef.current = { x: canvasX, y: canvasY, flyttet: 0, menu: true };
      return;
    }
    dragRef.current = { x: canvasX, y: canvasY, flyttet: 0 };
    try {
      canvasRef.current.setPointerCapture(event.pointerId);
    }
    catch {
    }
  };
  /** Pointer move: pans the camera (clamped to the world) or scrolls the open menu; accumulates moved distance in `flyttet`. */
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    const game = gameRef.current;
    if (!drag || !game) {
      return;
    }
    const [canvasX, canvasY] = eventToCanvas(event);
    if (drag.menu) {
      if (game.menuer.aaben) {
        game.menuer.rul(drag.y - canvasY);
      }
      drag.flyttet += Math.abs(canvasX - drag.x) + Math.abs(canvasY - drag.y);
      drag.x = canvasX;
      drag.y = canvasY;
      return;
    }
    const config = loadState.spil;
    const camera = cameraRef.current;
    const zooState = zooSessionRef.current && zooSessionRef.current.s;
    const maxCameraX = zooState ? worldWidth(zooState) - canvasWidth / 2 : 0;
    camera.x = Math.max(0, Math.min(maxCameraX, camera.x - (canvasX - drag.x)));
    camera.y = Math.max(0, Math.min(config.verden.hoejde - 768, camera.y - (canvasY - drag.y)));
    drag.flyttet += Math.abs(canvasX - drag.x) + Math.abs(canvasY - drag.y);
    drag.x = canvasX;
    drag.y = canvasY;
  };
  /** Pointer up: a drag of at most 12 px counts as a tap (menu click or world tap). */
  const onPointerUp = (event) => {
    const drag = dragRef.current;
    dragRef.current = null;
    const game = gameRef.current;
    if (!drag || !game || drag.flyttet > 12 || pausedRef.current) {
      return;
    }
    const [canvasX, canvasY] = eventToCanvas(event);
    if (drag.menu) {
      if (game.menuer.aaben) {
        game.menuer.klik(game.kit, { x: canvasX, y: canvasY });
      }
      return;
    }
    const camera = cameraRef.current;
    game.tryk(canvasX + camera.x, canvasY + camera.y);
  };
  return { onPointerDown, onPointerMove, onPointerUp };
}
