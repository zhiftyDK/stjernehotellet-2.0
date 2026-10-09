// Platform minigame: tutorial dialogs ("vejledning").
//
// A scripted sequence of speech-box messages shown at the start of a level. Contains the small
// building blocks: a spring and a linear tween for sliding the box in/out, the dialog box itself
// (typewriter text, wait for key press or a timer), a script interpreter that drives the dialog box,
// and createTutorial(), which ties them together and fades the HUD while a dialog is open.
// All times are milliseconds unless noted; positions use 16.16 fixed-point numbers.
import { fixedMul } from './constants.js';

// Slides the speech box in with a damped spring (starts at the off-screen position, settles at the target).
// `saet(fromX, fromY, toX, toY)` restarts the motion; `trin(dt)` advances it by dt ms; `faerdig` is true when at rest.
export function createSpring({ stiv: stiffness = 26e3, daemp: damping = 23e3, maks: maxVelocity = 75e5 } = {}) {
  let targetX = 0, targetY = 0, offsetX = 0, offsetY = 0, velocityX = 0, velocityY = 0;
  const spring = { saet(fromX, fromY, toX, toY) {
      targetX = toX;
      targetY = toY;
      offsetX = fromX - toX;
      offsetY = fromY - toY;
    }, get faerdig() {
      return Math.abs(velocityX) < 1e3 && Math.abs(velocityY) < 1e3;
    }, trin(dt) {
      let substeps = 1;
      if (dt >= 34) {
        substeps = dt > 152 ? 8 : Math.trunc(dt / 17);
      }
      for (let iteration = 0; iteration < substeps; iteration++) {
        let forceX = fixedMul(stiffness, -offsetX) + velocityX, forceY = fixedMul(stiffness, -offsetY) + velocityY;
        forceX -= fixedMul(damping, forceX);
        forceY -= fixedMul(damping, forceY);
        velocityX = Math.max(-maxVelocity, Math.min(maxVelocity, forceX));
        velocityY = Math.max(-maxVelocity, Math.min(maxVelocity, forceY));
        offsetX += Math.floor(Math.trunc(velocityX * 64 / 33) * dt / 64);
        offsetY += Math.floor(Math.trunc(velocityY * 64 / 33) * dt / 64);
      }
      if (spring.faerdig) {
        offsetX = 0;
        offsetY = 0;
      }
    }, get x() {
      return targetX + offsetX;
    }, get y() {
      return targetY + offsetY;
    } };
  return spring;
}

// Slides the speech box out with a linear tween over `durationMs`.
// `saet(fromX, fromY, toX, toY)` restarts; `trin(dt)` advances; `faerdig` when finished.
export function createLinearTween(durationMs = 500) {
  let startX = 0, startY = 0, deltaX = 0, deltaY = 0, elapsed = durationMs, currentDx = 0, currentDy = 0;
  return { saet(fromX, fromY, toX, toY) {
      startX = fromX;
      startY = fromY;
      deltaX = toX - fromX;
      deltaY = toY - fromY;
      elapsed = 0;
      currentDx = 0;
      currentDy = 0;
    }, get faerdig() {
      return elapsed >= durationMs;
    }, trin(dt) {
      if (elapsed >= durationMs) {
        return;
      }
      if (elapsed += dt, elapsed >= durationMs) {
        elapsed = durationMs;
        currentDx = deltaX;
        currentDy = deltaY;
        return;
      }
      const progress = Math.floor(elapsed * 65536 / durationMs);
      currentDx = fixedMul(deltaX, progress);
      currentDy = fixedMul(deltaY, progress);
    }, get x() {
      return startX + currentDx;
    }, get y() {
      return startY + currentDy;
    } };
}

// The speech box: slides in, types the text out character by character, waits for a key press or a
// timer (depending on `mode` bit flags: 1 = key press, 2 = timed), and slides out.
// Phases (internal): -1 hidden, 0 sliding in, 1 typing, 2 waiting, 3 read by key, 4 read by timer, 5 sliding out.
// `tegn(ctx, drawPanel)` draws the panel via the drawPanel(spriteId, x, y) callback plus the text with `font`.
export function createDialogBox({ tekster: texts, skrift: font, x: x = 480, y: y = 130, bredde: width = 400 }) {
  const hiddenYs = [242, 218], hiddenIndex = 0, slideIn = createSpring(), slideOut = createLinearTween();
  let mover = null, phase = -1, mode = 3, text = "", textLength = 0, autoAdvanceMs = 0, charTimer = 0, charsShown = 0, lineStarts = [0];
  const toFixedPoint = (value) => value * 65536;
  return { get aktiv() {
      return phase !== -1;
    }, get aaben() {
      return phase !== -1 && phase !== 5;
    }, get laestTryk() {
      return phase === 3;
    }, get laestTid() {
      return phase === 4;
    }, start(newMode) {
      mode = newMode;
      phase = 0;
      mover = slideIn;
      mover.saet(toFixedPoint(x), -toFixedPoint(hiddenYs[hiddenIndex]), toFixedPoint(x), toFixedPoint(y));
    }, skub(textIndex) {
      text = String(texts[textIndex] ?? "");
      textLength = text.length;
      autoAdvanceMs = textLength * 33 + 2e3;
      charTimer = 8;
      charsShown = 0;
      if (phase >= 2 && phase <= 4) {
        phase = 1;
      }
      lineStarts = font ? font.linjeStarter(text, 1, width) : [0];
    }, slut() {
      phase = 5;
      mover = slideOut;
      mover.saet(toFixedPoint(x), toFixedPoint(y), toFixedPoint(x), -toFixedPoint(hiddenYs[hiddenIndex]));
    }, trin(dt, pressed) {
      if (mover && mover.trin(dt), phase === 0) {
        if (mover.faerdig) {
          phase = 1;
        }
      } else if (phase === 1) {
        if (charsShown < textLength) {
          if (mode & 1 && pressed) {
            charsShown = textLength;
          } else if (charTimer -= dt, charTimer < 1) {
            let remainder = 8 - charTimer;
            for (; remainder >= 8 && charsShown < textLength;) {
              remainder -= 8;
              charsShown += 1;
            }
            charTimer = remainder + 8;
          }
        }
        if (charsShown >= textLength) {
          phase = 2;
        }
      } else if (phase === 2) {
        if (mode & 1 && pressed) {
          phase = 3;
          return;
        }
        if (mode & 2) {
          autoAdvanceMs -= dt;
          if (autoAdvanceMs <= 0) {
            phase = 4;
          }
        }
      } else if (phase === 5 && mover.faerdig) {
        phase = -1;
      }
    }, tegn(ctx, drawPanel) {
      if (phase === -1 || !mover) {
        return;
      }
      const panelX = Math.floor(mover.x / 65536), panelY = Math.floor(mover.y / 65536);
      if (drawPanel(2, panelX, panelY), phase < 1 || phase > 5 || !font) {
        return;
      }
      let lineY = panelY - 46;
      for (let lineIndex = 0; lineIndex < lineStarts.length; lineIndex++, lineY += 35) {
        if (charsShown < lineStarts[lineIndex]) {
          continue;
        }
        const lineEnd = lineIndex < lineStarts.length - 1 ? Math.min(charsShown, lineStarts[lineIndex + 1] - 1) : Math.min(charsShown, textLength);
        font.tegn(ctx, text.substring(lineStarts[lineIndex], lineEnd), panelX - 140, lineY, { font: 1, op: true });
      }
    } };
}

// Interpreter for one tutorial script (array of numeric ops):
//   0 n = wait n*10 ms, 1 = yield, 12 = wait for key press, 13 i = show text i, 14 = wait until text has been read.
export function createScriptRunner(ops, dialog) {
  let pc = 1, elapsed = 0, waitUntil = 0, waitForPress = false, waitForRead = false;
  const isDone = () => pc >= ops.length && !waitForPress && waitUntil <= 0 && !waitForRead, runOps = () => {
    for (; pc < ops.length;) {
      const op = ops[pc];
      if (op === 0) {
        waitUntil = elapsed + ops[pc + 1] * 10;
        pc += 2;
      } else if (op === 1) {
        pc += 1;
        return;
      } else if (op === 12) {
        waitForPress = true;
        pc += 1;
      } else if (op === 13) {
        if (!dialog.aaben) {
          dialog.start(3);
        }
        dialog.skub(ops[pc + 1]);
        pc += 2;
      } else if (op === 14) {
        waitForRead = true;
        pc += 2;
      } else {
        throw new Error(`MGPFScript: op ${op} er ikke porteret`);
      }
    }
  };
  return { get faerdig() {
      return isDone();
    }, trin(dt, pressed) {
      if (isDone()) {
        return true;
      }
      elapsed += dt;
      if (!waitForPress && waitUntil <= 0 && !waitForRead) {
        runOps();
      } else {
        if (waitUntil !== 0 && waitUntil < elapsed) {
          waitUntil = 0;
        }
        if (waitForPress && pressed) {
          waitForPress = false;
        }
        if (waitForRead && (dialog.laestTid || dialog.laestTryk)) {
          waitForRead = false;
        }
      }
      return isDone() ? (dialog.aaben && dialog.slut(), true) : false;
    } };
}

// Creates the tutorial controller from the tutorial JSON ({tekster, scripts}). Runs the scripts one after
// another; `pauser` is true while the dialog is open (the game pauses), `hudAlfa` fades the HUD out meanwhile.
export function createTutorial(data, font) {
  const dialog = createDialogBox({ tekster: data.tekster, skrift: font }), runners = data.scripts.map((script) => createScriptRunner(script, dialog));
  let current = 0, hudAlpha = 1;
  return { dialog: dialog, get hudAlfa() {
      return hudAlpha;
    }, trin(dt, pressed) {
      dialog.trin(dt, pressed);
      const fade = dt * 15887 / 64 / 65536;
      hudAlpha = dialog.aktiv ? Math.max(0, hudAlpha - fade) : Math.min(1, hudAlpha + fade);
      const runner = runners[current];
      if (runner) {
        runner.trin(dt, pressed);
        if (runner.faerdig && !dialog.aktiv) {
          current += 1;
          if (!runners[current]) {
            runners.length = 0;
            current = 0;
          }
        }
      }
    }, get pauser() {
      return dialog.aktiv;
    } };
}
