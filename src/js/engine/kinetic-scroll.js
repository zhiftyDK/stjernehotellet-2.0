// Kinetic (touch-style) scrolling with inertia and a rubber-band at both ends.
//
// createKineticScroll(min, max) returns a controller for a one-dimensional scroll position
// that is kept within [min, max]. Typical use: press -> move (drag) -> release (fling) -> tick every frame.
//   tryk(pointer)   "press": start dragging at pointer coordinate
//   flyt(pointer)   "move":  drag; overscroll beyond the ends is halved (rubber-band)
//   slip()          "release": convert the last drag movement into a fling velocity
//   tik(dtMs)       "tick": advance by dtMs milliseconds, returns the integer scroll position
//   flytTil(value)  jump straight to a position (no animation)
//   maal(value)     animate towards a position (clamped)
//   maalet          current target position
//   pos             current integer position
function createKineticScroll(min, max) {
  let position = 0;          // displayed scroll position
  let target = 0;            // where the position is easing towards (follows the finger while dragging)
  let velocity = 0;          // fling velocity of the target in px/s
  let dragging = false;
  let dragStartPointer = 0;  // pointer coordinate when the press began
  let dragStartPosition = 0; // position when the press began
  const clamp = (value) => Math.max(min, Math.min(max, value));
  return { tryk(pointer) {
      dragStartPointer = pointer;
      dragStartPosition = position;
      target = position;
      dragging = true;
    }, flyt(pointer) {
      let rawTarget = dragStartPosition - (pointer - dragStartPointer);
      // Rubber-band: only half of the movement beyond either end counts.
      if (rawTarget < min) {
        rawTarget = min + (rawTarget - min) * 0.5;
      }
      if (rawTarget > max) {
        rawTarget = max + (rawTarget - max) * 0.5;
      }
      target = rawTarget;
    }, slip() {
      // 23 is the same follow-rate used in tik(), so the fling continues at the speed the finger left at.
      velocity = (target - position) * 23;
      dragging = false;
    }, tik(dtMs) {
      const dt = dtMs * 1e-3;
      if (!dragging) {
        // Inertia: move the target by its velocity, bouncing back when it is outside [min, max].
        let pos = target, vel = velocity, step = vel * dt;
        if (pos < min) {
          if (pos + step < min) {
            vel += 18 * (min - pos) * dt; // spring back towards the lower end
          } else {
            vel = 0;
            step = min - pos; // lands exactly on the edge
          }
        }
        if (pos > max) {
          if (pos + step > max) {
            vel -= 18 * (pos - max) * dt; // spring back towards the upper end
          } else {
            vel = 0;
            step = max - pos;
          }
        }
        pos += step;
        target = pos;
        // Friction: stronger while overscrolled (10) than inside the range (4).
        const damping = pos < min && vel < 0 || pos > max && vel > 0 ? 10 : 4;
        vel -= vel * damping * dt;
        velocity = pos >= min && pos <= max && Math.abs(vel) < 0.01 ? 0 : vel;
      }
      // The displayed position eases towards the target (never overshooting it).
      const lag = target - position;
      if (lag !== 0) {
        let catchUp = lag * 23 * dt;
        if (Math.abs(catchUp) > Math.abs(lag)) {
          catchUp = lag;
        }
        position += catchUp;
      }
      position = clamp(position);
      return Math.trunc(position);
    }, flytTil(value) {
      position = clamp(Math.min(value, Math.trunc(max)));
      target = position;
      velocity = 0;
    }, maal(value) {
      target = clamp(value);
    }, get maalet() {
      return target;
    }, get pos() {
      return Math.trunc(position);
    } };
}
export { createKineticScroll };
