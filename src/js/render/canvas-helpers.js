// Canvas drawing helpers shared by the game screens and minigames:
// sprite / animation drawing, lazy texture loading, the point-level curve,
// the character-heads overlay and the in-game HUD renderer.
// Most draw functions take (ctx, manifest, images, ...) where `manifest` holds the
// sprite/animation tables and `images` maps asset ids to loaded images.
import { HUD_SHIFT, WIDTH_EXTRA } from '../engine/constants.js';
import { AnimationPlayer } from '../engine/animation.js';
// Draws one sprite frame at the current ctx origin.
// `frame` is a manifest sprite entry {u,v,w,h,ox,oy,flags}: (u,v,w,h) is the rectangle in the
// atlas image, (ox,oy) the pivot. `flags` packs: bit 0 = flipped, bits 1-2 = quarter turns,
// bits 8-15 = alpha (0..255); the special value 0xFF00 in the low 16 bits means "no transform, full alpha".
// `alpha` multiplies the existing ctx alpha; `mirrored` toggles the horizontal flip.
export function drawSpriteFrame(ctx, image, frame, alpha = 1, mirrored = false) {
  const isAlphaOnlyFrame = (frame.flags & 65535) === 65280;
  const flippedByFlag = !isAlphaOnlyFrame && (frame.flags & 1) > 0;
  const quarterTurns = isAlphaOnlyFrame ? 0 : (frame.flags & 6) >> 1;
  const frameAlpha = isAlphaOnlyFrame ? 1 : ((frame.flags & 65280) >> 8) / 255;
  ctx.save();
  if (quarterTurns) {
    ctx.rotate(quarterTurns * Math.PI / 2);
  }
  if (mirrored !== flippedByFlag) {
    ctx.scale(-1, 1);
  }
  ctx.globalAlpha = Math.max(0, Math.min(1, ctx.globalAlpha * alpha * frameAlpha));
  ctx.drawImage(image, frame.u, frame.v, frame.w, frame.h, -frame.ox, -frame.oy, frame.w, frame.h);
  ctx.restore();
}
// Draws a sprite looked up by id at (x, y); silently skips unknown sprites or unloaded images.
export function drawSprite(ctx, manifest, images, spriteId, x, y, alpha = 1) {
  const frame = manifest.sprites[spriteId];
  const image = frame && images[frame.assetId];
  if (image) {
    ctx.save();
    ctx.translate(x, y);
    drawSpriteFrame(ctx, image, frame, alpha);
    ctx.restore();
  }
}
// Draws the current pose of an AnimationPlayer at (x, y). Each part of the player's draw list
// carries position, rotation (in turns), scale, flip and alpha. `scale` scales the whole animation
// (and `mirrored` flips it horizontally); `spriteOverrides` optionally maps sprite id -> replacement sprite id.
export function drawAnimation(ctx, manifest, images, player, x, y, mirrored = false, alpha = 1, scale = 1, spriteOverrides = null) {
  if (player) {
    ctx.save();
    ctx.translate(x, y);
    if (mirrored || scale !== 1) {
      ctx.scale(mirrored ? -scale : scale, scale);
    }
    for (const part of player.drawList("invers")) {
      const frame = manifest.sprites[spriteOverrides && spriteOverrides[part.sprite] || part.sprite];
      const image = frame && images[frame.assetId];
      if (image) {
        ctx.save();
        ctx.translate(part.x, part.y);
        ctx.rotate((part.rot || 0) * Math.PI * 2);
        ctx.scale(part.scaleX * (part.flip ? -1 : 1), part.scaleY);
        drawSpriteFrame(ctx, image, frame, part.alpha * alpha);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
// Bounding box {x0,y0,x1,y1} of the current pose of an animation (relative to its origin),
// or null when it has no visible parts.
export function getAnimationBounds(manifest, player, spriteOverrides = null) {
  let minX = 1 / 0;
  let minY = 1 / 0;
  let maxX = -1 / 0;
  let maxY = -1 / 0;
  if (player) {
    for (const part of player.drawList("invers")) {
      const frame = manifest.sprites[spriteOverrides && spriteOverrides[part.sprite] || part.sprite];
      if (!frame) {
        continue;
      }
      const absScaleX = Math.abs(part.scaleX);
      const absScaleY = Math.abs(part.scaleY);
      const left = part.x - frame.ox * absScaleX;
      const top = part.y - frame.oy * absScaleY;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + frame.w * absScaleX);
      maxY = Math.max(maxY, top + frame.h * absScaleY);
    }
  }
  return minX === 1 / 0 ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY };
}
// Creates a lazy texture loader for `${baseUrl}/tex/<file>`.
// Returns { I, lyt }: `I` is a Proxy mapping texture name -> loaded image (or null while still
// loading; loading starts on first access), and `lyt(listener)` subscribes to "something finished
// loading" notifications (debounced 40 ms) and returns an unsubscribe function.
export function createTextureLoader(baseUrl, manifest) {
  const imageCache = new Map();
  const changeListeners = new Set();
  let notifyTimer = null;
  const scheduleNotify = () => {
    if (!notifyTimer) {
      notifyTimer = setTimeout(() => {
        notifyTimer = null;
        changeListeners.forEach((listener) => listener());
      }, 40);
    }
  };
  const getImage = (textureName) => {
    const cached = imageCache.get(textureName);
    if (cached) {
      return cached.complete && cached.naturalWidth ? cached : null;
    }
    const entry = manifest.textures[textureName];
    if (!entry) {
      return null;
    }
    const image = new Image();
    image.onload = scheduleNotify;
    image.src = `${baseUrl}/tex/${entry.file}`;
    imageCache.set(textureName, image);
    return null;
  };
  return { I: new Proxy({}, { get: (target, textureName) => typeof textureName == "string" ? getImage(textureName) : void 0 }), lyt: (listener) => {
      changeListeners.add(listener);
      return () => changeListeners.delete(listener);
    } };
}
// Points needed to reach each player level (index = level).
const POINT_LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3e3, 6e3, 12e3, 25e3, 5e4];
// Converts a point total into { antal: level, fremskridt: 0..1 progress to the next level }.
export function pointLevel(points) {
  const levelIndex = POINT_LEVEL_THRESHOLDS.filter((threshold) => points >= threshold).length - 1;
  const levelStart = POINT_LEVEL_THRESHOLDS[levelIndex];
  const nextLevelStart = POINT_LEVEL_THRESHOLDS[levelIndex + 1];
  return { antal: levelIndex, fremskridt: nextLevelStart ? (points - levelStart) / (nextLevelStart - levelStart) : 1 };
}
// Lazily creates one AnimationPlayer per animation id (advanced to time 0 on creation).
// The returned getter has a `.fremad(dtMs)` method that advances every created player.
function createAnimationCache(manifest) {
  const animationById = new Map(manifest.animations.map((animation) => [animation.id, animation]));
  const players = new Map();
  const getPlayer = (animationId) => {
    if (!players.has(animationId)) {
      const animation = animationById.get(animationId);
      const player = animation ? new AnimationPlayer(animation) : null;
      if (player) {
        player.advance(0);
      }
      players.set(animationId, player);
    }
    return players.get(animationId);
  };
  getPlayer.fremad = (dtMs) => {
    for (const player of players.values()) {
      if (player) {
        player.advance(dtMs);
      }
    }
  };
  return getPlayer;
}
// The two character heads that slide up from the bottom of the screen while a character speaks.
// `config.y` has the hidden/visible Y positions and slide frame count, `config.figurer` the two
// figures (x position + idle/talking animation ids). `extra` is an additional x shift for the right head.
// fremad(dtMs, visible) animates the slide; tegn(ctx, talking) draws, `talking` = [leftTalks, rightTalks].
export function createFigureOverlay(manifest, images, config, extra = 0) {
  const animations = createAnimationCache(manifest);
  let currentY = config.y.skjult;
  return { fremad(dtMs, visible) {
      animations.fremad(dtMs);
      const targetY = visible ? config.y.synlig : config.y.skjult;
      const maxStep = Math.abs(config.y.skjult - config.y.synlig) / (config.y.billeder * (1e3 / 30)) * dtMs;
      currentY = targetY > currentY ? Math.min(targetY, currentY + maxStep) : Math.max(targetY, currentY - maxStep);
    }, tegn(ctx, talking = [0, 0]) {
      if (currentY >= config.y.skjult) {
        return;
      }
      const [leftFigure, rightFigure] = config.figurer;
      const leftX = leftFigure.x;
      drawAnimation(ctx, manifest, images, animations(rightFigure.film[talking[1] ? 1 : 0]), rightFigure.x + leftX + extra, currentY);
      drawAnimation(ctx, manifest, images, animations(leftFigure.film[talking[0] ? 1 : 0]), leftFigure.x - leftX, currentY);
    } };
}
// Draws just the money / ruby counters of the HUD (board, icons, plus button and the two numbers).
export function drawCurrencyHud(ctx, layout, manifest, images, font, money, rubies = 0) {
  const sprites = layout.billeder;
  ctx.save();
  ctx.translate(-HUD_SHIFT, 0);
  for (const name of ["tavle", "rubin", "moent", "plus"]) {
    drawSprite(ctx, manifest, images, sprites[name].sprite, sprites[name].x, sprites[name].y);
  }
  if (font) {
    for (const [amount, [textX, textY, , textHeight]] of [[money, layout.tekst.penge], [rubies, layout.tekst.rubiner]]) {
      font.tegn(ctx, String(Math.round(amount)), textX, textY + textHeight / 2, { str: 37 });
    }
  }
  ctx.restore();
}
// Creates the full in-game HUD renderer from the HUD layout (`layout`).
// fremad(dtMs, figuresVisible) animates; menuKnap(ctx, shift) draws the menu button;
// tegn(ctx, state) draws the whole HUD for `state` {penge, rubiner, point, synes, hoveder, nyPost}
// and returns the clickable hitboxes [{navn, x0, y0, x1, y1}].
export function createHudRenderer(layout, manifest, images, font, figures = null) {
  const animations = createAnimationCache(manifest);
  const figureOverlay = figures ? createFigureOverlay(manifest, images, figures, WIDTH_EXTRA) : null;
  const toRgb = (color) => `rgb(${color[0]},${color[1]},${color[2]})`;
  // Draws HUD text inside the box [x, y, width, height]; `centered` centres it horizontally, vertically it is always centred.
  const drawText = (ctx, text, [boxX, boxY, boxWidth, boxHeight], { str: fontSize = 37, midt: centered = false } = {}) => {
    font.tegn(ctx, text, centered ? boxX + boxWidth / 2 : boxX, boxY + boxHeight / 2, { str: fontSize, midt: centered });
  };
  return { fremad(dtMs, figuresVisible = false) {
      animations.fremad(dtMs);
      if (figureOverlay) {
        figureOverlay.fremad(dtMs, figuresVisible);
      }
    }, menuKnap(ctx, shift = WIDTH_EXTRA) {
      const signs = layout.skilte;
      const menuAnimation = animations(signs.menu);
      const menuX = signs.x + signs.dx + shift;
      const menuY = signs.y;
      drawAnimation(ctx, manifest, images, menuAnimation, menuX, menuY);
      const bounds = getAnimationBounds(manifest, menuAnimation);
      return bounds ? { navn: "menu", x0: menuX + bounds.x0, y0: menuY + bounds.y0, x1: menuX + bounds.x1, y1: menuY + bounds.y1 } : null;
    }, tegn(ctx, state) {
      // addSprite / addAnimation draw an element and register its hitbox (shifted by hitboxOffsetX,
      // since parts of the HUD are drawn translated).
      const sprites = layout.billeder;
      const hitboxes = [];
      let hitboxOffsetX = 0;
      const addSprite = (name) => {
        const entry = sprites[name];
        drawSprite(ctx, manifest, images, entry.sprite, entry.x, entry.y);
        const frame = manifest.sprites[entry.sprite];
        if (frame) {
          hitboxes.push({ navn: name, x0: entry.x - frame.ox + hitboxOffsetX, y0: entry.y - frame.oy, x1: entry.x - frame.ox + frame.w + hitboxOffsetX, y1: entry.y - frame.oy + frame.h });
        }
      };
      const addAnimation = (name, animationId, animX, animY) => {
        const player = animations(animationId);
        drawAnimation(ctx, manifest, images, player, animX, animY);
        const bounds = getAnimationBounds(manifest, player);
        if (bounds) {
          hitboxes.push({ navn: name, x0: animX + bounds.x0 + hitboxOffsetX, y0: animY + bounds.y0, x1: animX + bounds.x1 + hitboxOffsetX, y1: animY + bounds.y1 });
        }
      };
      ctx.save();
      ctx.translate(-HUD_SHIFT, 0);
      hitboxOffsetX = -HUD_SHIFT;
      // Top-left block (shifted by HUD_SHIFT): board, ruby and coin icons, plus button, then the numbers
      // and the points progress bar with the current level star.
      addSprite("tavle");
      addSprite("rubin");
      addSprite("moent");
      addSprite("plus");
      drawText(ctx, String(Math.round(state.penge)), layout.tekst.penge);
      drawText(ctx, String(state.rubiner), layout.tekst.rubiner);
      // Points progress bar: background, fill proportional to progress to the next level, then frame.
      const level = pointLevel(state.point);
      const bar = layout.bjaelkeFelt;
      ctx.fillStyle = toRgb(bar.bag);
      ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
      ctx.fillStyle = toRgb(bar.fyld);
      ctx.fillRect(bar.x, bar.y, Math.round(bar.w * level.fremskridt), bar.h);
      addSprite("bjaelke");
      addSprite("bjaelkeKant");
      addSprite("bedoemmelse");
      drawText(ctx, String(Math.round(state.point)), [layout.tekst.point[0], bar.y - 8, layout.tekst.point[2], bar.h + 16], { str: 27, midt: true });
      // The level star is drawn half transparent until level 1 is reached.
      const star = sprites.stjerne;
      ctx.save();
      if (level.antal < 1) {
        ctx.globalAlpha = 0.5;
      }
      drawSprite(ctx, manifest, images, star.sprite, star.x, star.y);
      ctx.restore();
      if (level.antal >= 1) {
        drawText(ctx, String(level.antal), [star.x + 9, star.y + 9, 45, 46], { str: 27, midt: true });
      }
      drawText(ctx, String(state.synes), [layout.tekst.synes[0], 0, layout.tekst.synes[2], 44], { str: 27, midt: true });
      ctx.restore();
      hitboxOffsetX = 0;
      // Character heads (speaking figures) are drawn in unshifted coordinates.
      if (figureOverlay) {
        figureOverlay.tegn(ctx, state.hoveder);
      }
      ctx.save();
      ctx.translate(WIDTH_EXTRA, 0);
      hitboxOffsetX = WIDTH_EXTRA;
      addSprite("tilToppen");
      addSprite("tilLobbyen");
      ctx.restore();
      hitboxOffsetX = 0;
      ctx.save();
      ctx.translate(-HUD_SHIFT, 0);
      hitboxOffsetX = -HUD_SHIFT;
      // Mailbox (shifted by HUD_SHIFT), then the right-hand signs (zoo and exit), shifted by WIDTH_EXTRA.
      addAnimation("post", layout.post.film[state.nyPost ? 1 : 0], layout.post.x, layout.post.y);
      ctx.restore();
      hitboxOffsetX = 0;
      const signs = layout.skilte;
      ctx.save();
      ctx.translate(WIDTH_EXTRA, 0);
      hitboxOffsetX = WIDTH_EXTRA;
      addAnimation("zoo", signs.zoo, signs.x - signs.dx, signs.y);
      addAnimation("udgang", signs.udgang[0], signs.x, signs.y);
      ctx.restore();
      hitboxOffsetX = 0;
      return hitboxes;
    } };
}
