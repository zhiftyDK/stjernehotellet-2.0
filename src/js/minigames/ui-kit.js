// Shared UI toolkit for the minigames: a canvas "kit" of sprite/frame/text/button helpers with hit-testing,
// a stack of modal windows drawn with that kit, the vent loading screen, and a few timing helpers.
// Used by host.js, by the minigame files and by the main game screens.
import { h } from '../dom.js';
import { backdropPlacement, GAME_WIDTH, GAME_HEIGHT } from '../engine/constants.js';
import { drawSpriteFrame, drawAnimation } from '../render/canvas-helpers.js';
// Lazily created image of the vent shown while a minigame is loading.
let loadingImage = null;
const getLoadingImage = () => {
  if (!loadingImage) {
    loadingImage = new Image();
    loadingImage.src = "data/vent/vent.webp";
  }
  return loadingImage;
};
// Full-canvas vent picture shown while something loads.
// ud: plays the "leave" animation and calls efter (onExited) when it ends; bredde: canvas width in px.
// update({ ud, efter }) changes the exiting flag / callback after creation.
export function createLoadingScreen({ bredde: width = GAME_WIDTH, ud: exiting = false, efter: onExited } = {}) {
  const el = h("canvas", { width, height: GAME_HEIGHT, className: exiting ? "vent ud" : "vent", "aria-label": "Vent venligst…" });
  const ctx = el.getContext("2d"), image = getLoadingImage(), drawLoadingImage = () => {
    if (!(!image.complete || !image.naturalWidth)) {
      const placement = backdropPlacement(width);
      ctx.drawImage(image, 0, placement.y, image.naturalWidth * placement.scale, image.naturalHeight * placement.scale);
    }
  };
  const onAnimationEnd = () => { if (exiting && onExited) onExited(); };
  drawLoadingImage();
  image.addEventListener("load", drawLoadingImage);
  el.addEventListener("animationend", onAnimationEnd);
  return {
    el,
    update(next = {}) {
      if ("efter" in next) onExited = next.efter;
      if ("ud" in next) {
        exiting = !!next.ud;
        el.setAttribute("class", exiting ? "vent ud" : "vent");
      }
    },
    destroy() {
      image.removeEventListener("load", drawLoadingImage);
      el.removeEventListener("animationend", onAnimationEnd);
    },
  };
}
// Builds the drawing/hit-testing kit around a 2D context.
//   ctx: canvas context; packs: { packName: { M: manifest, I: images } } sprite packs;
//   uiDefs: ui layout definitions (frame tile ids etc.); font: bitmap text renderer.
// Call kit.start() at the beginning of every frame: it clears the clickable regions registered last frame.
// Draw helpers that take a click handler register a clickable rect (buttons) or drag zone (dragZones).
export function createUiKit(ctx, packs, uiDefs, font) {
  let buttons = [], dragZones = [];
  // Danish method names are part of the API used by minigames: sprite/anim draw, ramme = frame,
  // overskrift = heading banner, tekst = text, knap = register button, traek = register drag zone,
  // rulleliste = scrolling list, klik = dispatch click.
  const kit = { ctx: ctx, U: uiDefs, pakker: packs, skrift: font, start() {
      buttons = [];
      dragZones = [];
    }, sprite(packName, spriteName, x, y, { alfa: alpha = 1, skala: scale = 1 } = {}) {
      const pack = packs[packName], frame = pack && pack.M.sprites[spriteName], image = frame && pack.I[frame.assetId];
      if (image) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        drawSpriteFrame(ctx, image, frame, alpha);
        ctx.restore();
        return { x0: x - frame.ox * scale, y0: y - frame.oy * scale, x1: x + (frame.w - frame.ox) * scale, y1: y + (frame.h - frame.oy) * scale };
      }
      return null;
    }, spriteIKasse(packName, spriteName, boxX, boxY, boxW, boxH, alpha = 1) {
      const frame = packs[packName] && packs[packName].M.sprites[spriteName];
      if (!frame) {
        return;
      }
      const fitScale = Math.min(1, boxW / frame.w, boxH / frame.h);
      kit.sprite(packName, spriteName, boxX + (boxW - frame.w * fitScale) / 2 + frame.ox * fitScale, boxY + (boxH - frame.h * fitScale) / 2 + frame.oy * fitScale, { skala: fitScale, alfa: alpha });
    }, anim(packName, player, x, y, scale = 1, alpha = 1) {
      const pack = packs[packName];
      if (!(!pack || !player)) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        drawAnimation(ctx, pack.M, pack.I, player, 0, 0, false, alpha);
        ctx.restore();
      }
    }, ramme(frameName, x, y, width, height) {
      const parts = uiDefs.ramme[frameName], tile = uiDefs.ramme[`${frameName}Flise`], tileRegion = (spriteId, regionX, regionY, regionW, regionH) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(regionX, regionY, regionW, regionH);
        ctx.clip();
        for (let tileY = regionY; tileY < regionY + regionH; tileY += tile) {
          for (let tileX = regionX; tileX < regionX + regionW; tileX += tile) {
            kit.sprite("ui", spriteId, tileX, tileY);
          }
        }
        ctx.restore();
      }, [topLeft, top, topRight, right, bottomRight, bottom, bottomLeft, left, center] = parts;
      tileRegion(center, x + tile, y + tile, width - 2 * tile, height - 2 * tile);
      tileRegion(top, x + tile, y, width - 2 * tile, tile);
      tileRegion(bottom, x + tile, y + height - tile, width - 2 * tile, tile);
      tileRegion(left, x, y + tile, tile, height - 2 * tile);
      tileRegion(right, x + width - tile, y + tile, tile, height - 2 * tile);
      kit.sprite("ui", topLeft, x, y);
      kit.sprite("ui", topRight, x + width - tile, y);
      kit.sprite("ui", bottomLeft, x, y + height - tile);
      kit.sprite("ui", bottomRight, x + width - tile, y + height - tile);
    }, overskrift(text, centerX, y) {
      const tile = uiDefs.ramme.overskriftFlise, tileCount = Math.round(font.bredde(text, 37) / tile + 2.5), left = centerX - tileCount * tile / 2, [leftCap, middle, rightCap] = uiDefs.ramme.overskrift;
      kit.sprite("ui", leftCap, left, y);
      for (let k = 1; k < tileCount - 1; k++) {
        kit.sprite("ui", middle, left + k * tile, y);
      }
      kit.sprite("ui", rightCap, left + (tileCount - 1) * tile, y);
      font.tegn(ctx, text, centerX, y + tile / 2, { str: 37, midt: true });
    }, tekst(text, x, y, { str: size = 22, farve: color = null, midt: centered = false, bredde: width = 0, op: up = false, hoejre: rightAligned = false } = {}) {
      const tint = color && color !== "#fff" ? color : null;
      return font.tegn(ctx, text, x, y, { str: Math.round(size * 1.3), midt: centered, hoejre: rightAligned, bredde: width, op: up, farve: tint });
    }, knap(rect, onClick) {
      if (rect) {
        buttons.push({ ...rect, fn: onClick });
      }
      return rect;
    }, traek(rect, onDrag) {
      dragZones.push({ ...rect, fn: onDrag });
      return kit.knap(rect, onDrag);
    }, traekVed(point) {
      const zone = [...dragZones].reverse().find((z) => point.x >= z.x0 && point.x <= z.x1 && point.y >= z.y0 && point.y <= z.y1);
      return zone ? zone.fn : null;
    }, spriteKnap(spriteId, x, y, onClick, { bag: backId = 0, alfa: alpha = 1, skala: scale = 1 } = {}) {
      let backRect = null;
      if (backId) {
        backRect = kit.sprite("ui", backId, x, y, { skala: scale });
      }
      const frontRect = kit.sprite("ui", spriteId, x, y, { alfa: alpha, skala: scale });
      return kit.knap(backRect || frontRect, onClick);
    }, tekstKnap(label, x, y, width, height, onClick, { aktiv: active = true } = {}) {
      ctx.save();
      if (!active) {
        ctx.globalAlpha = 0.5;
      }
      kit.ramme("punkt", x, y, width, height);
      kit.tekst(label, x + width / 2, y + height / 2, { str: 22, midt: true });
      ctx.restore();
      return active ? kit.knap({ x0: x, y0: y, x1: x + width, y1: y + height }, onClick) : null;
    }, rulleliste(list, x, y, width, height, contentHeight, drawContent) {
      list.rul = Math.max(0, Math.min(Math.max(0, contentHeight - height), list.rul || 0));
      list.rulFelt = { x0: x, y0: y, x1: x + width, y1: y + height };
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      const buttonsBefore = buttons.length;
      if (drawContent(y - list.rul), buttons = buttons.filter((button, index) => index < buttonsBefore || button.y1 > y && button.y0 < y + height), ctx.restore(), contentHeight > height) {
        const visibleFraction = height / contentHeight;
        ctx.fillStyle = "rgba(255,255,255,.55)";
        ctx.fillRect(x + width - 6, y + list.rul / contentHeight * height, 4, height * visibleFraction);
      }
    }, klik(point) {
      const button = [...buttons].reverse().find((b) => point.x >= b.x0 && point.x <= b.x1 && point.y >= b.y0 && point.y <= b.y1);
      if (button) {
        button.fn(point);
      }
      return !!button;
    } };
  return kit;
}
// Stack of modal windows (aabn = open, luk = close, lukAlle = close all). Each window object has
// { titel, luk, bredde, hoejde, tegn(kit, rect, stack), tast(key, stack), lukket() }. Only the top one is drawn
// and receives input. `utegnet` = "not drawn yet", so a click on the same frame the window opened is ignored.
export class WindowStack {
  constructor(ui) {
    this.U = ui;
    this.stak = [];
    this.utegnet = false;
  }
  get aaben() {
    return this.stak.length > 0;
  }
  aabn(window) {
    this.stak.push(window);
    this.utegnet = true;
  }
  luk() {
    const closed = this.stak.pop();
    this.utegnet = true;
    if (closed && closed.lukket) {
      closed.lukket();
    }
  }
  lukAlle() {
    const windows = this.stak;
    this.stak = [];
    this.utegnet = true;
    for (const w of windows.reverse()) {
      if (w.lukket) {
        w.lukket();
      }
    }
  }
  top() {
    return this.stak[this.stak.length - 1];
  }
  tast(key) {
    const window = this.top();
    return !!(window && window.tast && window.tast(key, this));
  }
  vindue(options) {
    const { bredde: defaultWidth, hoejde: defaultHeight, skaerm: screen, venstre: left } = this.U.menu, width = options.bredde || defaultWidth, height = options.hoejde || defaultHeight;
    return { x: left + (screen[0] - width) / 2, y: (screen[1] - height) / 2, w: width, h: height };
  }
  tegn(kit, ctx, width, height) {
    const topWindow = this.top();
    if (kit.start(), !topWindow) {
      return;
    }
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fillRect(0, 0, width, height);
    kit.knap({ x0: 0, y0: 0, x1: width, y1: height }, () => {
    });
    const frame = this.vindue(topWindow);
    kit.ramme("hoved", frame.x, frame.y, frame.w, frame.h);
    topWindow.tegn(kit, frame, this);
    if (topWindow.titel) {
      kit.overskrift(topWindow.titel, frame.x + frame.w / 2, frame.y - 16);
    }
    if (topWindow.luk !== false) {
      kit.spriteKnap(this.U.hovedmenu.luk, frame.x + frame.w - 8, frame.y + 8, () => this.luk());
    }
    this.utegnet = false;
  }
  klik(kit, point) {
    if (this.aaben) {
      if (!this.utegnet) {
        kit.klik(point);
      }
      return true;
    }
    return false;
  }
  traekStart(kit, point) {
    return this.aaben && !this.utegnet ? kit.traekVed(point) : null;
  }
  rul(delta) {
    const window = this.top();
    if (window && window.rulFelt) {
      window.rul = (window.rul || 0) + delta;
    }
  }
}
// FRAME_MS (proposed export name Rv): duration of one 30 fps animation frame in ms.
// easeInOutSine (proposed export name Cv): easing 0..1 -> 0..1 (input clamped), slow at both ends.
export const FRAME_MS = 1e3 / 30;
export const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

// Same ui definitions, but with the centred-window origin moved for a canvas wider than 1280.
// width: canvas width in px; the window origin ('venstre') is only shifted for canvases wider than 1280.
export function centeredUi(ui, width) {
  return width > 1280 ? { ...ui, menu: { ...ui.menu, venstre: Math.round((width - ui.menu.skaerm[0]) / 2) } } : ui;
}
