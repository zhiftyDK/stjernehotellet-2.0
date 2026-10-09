// Ambient backdrop shown behind a running minigame.
import { h } from '../../dom.js';

// Blurred copy of the running minigame, stretched across the 16:9 screen behind the (1280px wide) minigame, instead of black bars.
// Every 66 ms (~15 fps) the minigame's own canvas is copied (downscaled to 171x96) onto this small canvas. The blur is applied while
// drawing at that tiny size (1px there ~ 10px on screen), which is far cheaper than a CSS blur filter on a full-screen layer.
export function createMinigameAmbient() {
  const canvas = h("canvas", { width: 171, height: 96, style: { width: "100%", height: "100%", borderRadius: 0, background: "transparent", transform: "scale(1.1)" } });
  const el = h("div", { "aria-hidden": "true", style: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" } }, canvas);
  const ctx = canvas.getContext("2d");
  ctx.filter = "blur(1px) brightness(.8)";
  const redrawTimer = setInterval(() => {
    // The minigame canvas is the first canvas in the minigame area that is neither the frame nor a "vent" (loading) canvas.
    const sourceCanvas = [...document.querySelectorAll(".minispil-flade canvas")].find((candidate) => !candidate.classList.contains("minispil-ramme") && !candidate.classList.contains("vent"));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sourceCanvas && sourceCanvas.width > 0) {
      try {
        ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      } catch {}
    }
  }, 66);
  return { el, destroy() { clearInterval(redrawTimer); } };
}
