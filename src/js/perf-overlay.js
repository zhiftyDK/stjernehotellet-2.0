// Optional performance overlay for diagnosing slowness on a particular computer.
// Toggle with F3 (or open the page with ?fps in the address). Shows frames per second, the average and the
// worst frame time of the last second, and how many animation-frame loops are scheduled (should be 1-2).
let overlay = null;
let running = false;

export function setupPerfOverlay() {
  const toggle = () => {
    if (overlay) {
      overlay.remove();
      overlay = null;
    } else {
      overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;left:6px;top:6px;z-index:99999;padding:4px 8px;background:rgba(0,0,0,.7);color:#7CFC00;font:12px/1.4 monospace;pointer-events:none;white-space:pre";
      document.body.append(overlay);
      if (!running) {
        running = true;
        last = windowStart = performance.now();
        requestAnimationFrame(tick);
      }
    }
  };
  window.addEventListener("keydown", (event) => {
    if (event.key === "F3") {
      event.preventDefault();
      toggle();
    }
  });
  if (new URLSearchParams(location.search).has("fps")) toggle();

  let frames = 0, worst = 0, sum = 0, last = 0, windowStart = 0;
  function tick(now) {
    if (!overlay) {
      running = false;
      return;
    }
    const frameTime = now - last;
    last = now;
    frames++;
    sum += frameTime;
    if (frameTime > worst) worst = frameTime;
    if (now - windowStart >= 1000) {
      if (overlay) overlay.textContent = `${frames} fps\navg ${(sum / frames).toFixed(1)} ms\nworst ${worst.toFixed(0)} ms`;
      frames = 0;
      sum = 0;
      worst = 0;
      windowStart = now;
    }
    requestAnimationFrame(tick);
  }
}
