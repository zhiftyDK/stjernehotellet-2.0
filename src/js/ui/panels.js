// Bitmap-font text renderer and the paged "instructions" (vejledning) panel.
//
// - createBitmapTextRenderer: builds a text API on top of the game's sprite-sheet fonts (data/skrift).
//   Used by the start screen, the data loaders and (through the UI kit) every canvas screen.
// - createInstructionPanel: builds the animated, multi-page "how to play" panel shown by the hotel
//   and the Zoo / Pop minigames.
import { AnimationPlayer } from '../engine/animation.js';

/**
 * Creates the text renderer.
 * @param fontData parsed skrift.json; `skrifter` holds the font definitions
 *   (glyph table `glyffer`, line height `linjeH`, `kerning`, `mellemrum` = space width ...)
 * @param images map from font sheet name (`billede`) to the loaded sprite-sheet image
 * @returns { linjer, linjeStarter, bredde, tegn } (Danish: lines, line starts, width, draw)
 */
export function createBitmapTextRenderer(fontData, images) {
  // The three font sizes the game ships with.
  const fonts = [0, 1, 2].map((index) => fontData.skrifter[index]);
  // Smallest font whose native line height is at least `minHeight` (falls back to the first font).
  const pickFont = (minHeight) => fonts.filter((font) => font.linjeH >= minHeight).sort((fontA, fontB) => fontA.linjeH - fontB.linjeH)[0] || fonts[0];
  // Glyph tables only cover Latin-1 (char codes below 256).
  const charCode = (char) => char.charCodeAt(0);
  // Width of `text` in native font pixels: glyph widths + kerning, or the space width for unknown glyphs.
  const measureText = (font, text) => {
    let width = 0;
    for (const char of text) {
      const glyph = charCode(char) < 256 ? font.glyffer[charCode(char)] : null;
      width += glyph ? glyph[2] + font.kerning : font.mellemrum;
    }
    return width;
  };
  // Scratch canvas reused for tinted text (created lazily).
  let tintCanvas = null;
  // Draws one line of glyphs from the font sheet at (x, y), scaled by `scale`.
  const drawGlyphs = (ctx, font, text, x, y, scale) => {
    const sheet = images[font.billede];
    if (!sheet) {
      return;
    }
    let cursorX = x;
    for (const char of text) {
      const glyph = charCode(char) < 256 ? font.glyffer[charCode(char)] : null;
      if (glyph) {
        ctx.drawImage(sheet, glyph[0], glyph[1] * font.linjeH, glyph[2], font.hoejde, cursorX, y, glyph[2] * scale, font.hoejde * scale);
        cursorX += (glyph[2] + font.kerning) * scale;
      } else {
        cursorX += font.mellemrum * scale;
      }
    }
  };
  const renderer = {
    // Splits `text` into lines for a font of pixel height `size`. Explicit newlines always
    // break; if `maxWidth` is given, words are wrapped greedily to fit.
    linjer(text, size, maxWidth) {
      const font = pickFont(size);
      const scale = size / font.linjeH;
      const lines = [];
      for (const paragraph of String(text).split(`
`)) {
        if (!maxWidth) {
          lines.push(paragraph);
          continue;
        }
        let line = "";
        for (const word of paragraph.split(" ")) {
          const candidate = line ? `${line} ${word}` : word;
          if (measureText(font, candidate) * scale > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = candidate;
          }
        }
        lines.push(line);
      }
      return lines;
    },
    // Character indices where each wrapped line starts when `text` is wrapped to `maxWidth`
    // using font `fontIndex` (the first start is always 0).
    linjeStarter(text, fontIndex, maxWidth) {
      const font = fontData.skrifter[fontIndex];
      const starts = [0];
      let lineStart = 0;
      let lastSpace = -1;
      for (let pos = 0; pos < text.length; pos++) {
        if (text[pos] === " ") {
          lastSpace = pos;
        }
        if (measureText(font, text.substring(lineStart, pos + 1)) > maxWidth && lastSpace > lineStart) {
          lineStart = lastSpace + 1;
          starts.push(lineStart);
        }
      }
      return starts;
    },
    // Pixel width of `text`; with `size` it is scaled to that line height.
    bredde(text, size, fontIndex = null) {
      const font = fontIndex != null && fontData.skrifter[fontIndex] ? fontData.skrifter[fontIndex] : pickFont(size);
      return measureText(font, text) * (size ? size / font.linjeH : 1);
    },
    // Draws (possibly multi-line, wrapped) text at (x, y) and returns the total height drawn.
    // Options (Danish keys): str = pixel height, font = explicit font index (no wrapping),
    // midt = centre on x, hoejre = right-align at x, bredde = wrap width, op = y is the top of
    // the first line (default: y is its vertical centre), farve = tint colour, alfa = opacity.
    tegn(ctx, text, x, y, { str: size = null, font: fontIndex = null, midt: centered = false, hoejre: rightAligned = false, bredde: maxWidth = 0, op: topAligned = false, farve: tint = null, alfa: alpha = 1 } = {}) {
      const font = fontIndex != null && fontData.skrifter[fontIndex] ? fontData.skrifter[fontIndex] : pickFont(size || 30);
      const fontSize = size || (fontIndex != null ? font.linjeH : 30);
      const scale = fontSize / font.linjeH;
      const lines = fontIndex != null ? String(text).split(`
`) : renderer.linjer(text, fontSize, maxWidth);
      // Distance between baselines of consecutive lines.
      const lineStep = (font.linjeH + font.linjeafstand) * scale;
      lines.forEach((line, lineIndex) => {
        const lineWidth = measureText(font, line) * scale;
        const lineX = centered ? x - lineWidth / 2 : rightAligned ? x - lineWidth : x;
        const lineY = (topAligned ? y : y - font.hoejde * scale / 2) + lineIndex * lineStep;
        // Untinted text is drawn straight onto the target canvas.
        if (!tint) {
          ctx.save();
          ctx.globalAlpha *= alpha;
          drawGlyphs(ctx, font, line, lineX, lineY, scale);
          ctx.restore();
          return;
        }
        // Tinted text: render glyphs to the scratch canvas, recolour only the opaque pixels
        // (source-atop at 60% alpha), then draw the result.
        if (!tintCanvas) {
          tintCanvas = document.createElement("canvas");
        }
        tintCanvas.width = Math.ceil(lineWidth) + 2;
        tintCanvas.height = Math.ceil(font.hoejde * scale) + 2;
        const tintCtx = tintCanvas.getContext("2d");
        drawGlyphs(tintCtx, font, line, 0, 0, scale);
        tintCtx.globalCompositeOperation = "source-atop";
        tintCtx.globalAlpha = 0.6;
        tintCtx.fillStyle = tint;
        tintCtx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.drawImage(tintCanvas, lineX, lineY);
        ctx.restore();
      });
      return lines.length * lineStep;
    }
  };
  return renderer;
}
/**
 * Creates the paged instruction panel ("vejledning"): each page shows an animation
 * (`film`) plus a text, with a next-page button until the last page.
 * @param V       layout/config: title, screen positions (film, tekst, naeste) and the guides in `nr`
 * @param nr      index of the guide to show
 * @param pakke   name of the asset pack holding the page animations
 * @param laes    callback(script, pageIndex) fired on each page (starts the narrated voice-over)
 * @param lukket  callback fired when the panel is closed
 * @returns a panel object { titel, lukket, tegn(ui, origin) } drawn every frame by the host
 */
export function createInstructionPanel({ V: layout, nr: guideNumber, pakke: packName, laes: onPage = () => {
}, lukket: onClosed = null }) {
  const guide = layout.nr[guideNumber];
  let pageIndex = 0;
  let player = null; // AnimationPlayer for the current page
  let lastTime = performance.now();
  onPage(guide.script, pageIndex);
  return { titel: layout.titel, lukket: onClosed, tegn(ui, origin) {
      // Clamp the frame delta (ms) so a stalled tab does not fast-forward the animation.
      const now = performance.now();
      const deltaMs = Math.min(250, now - lastTime);
      lastTime = now;
      const page = guide.sider[pageIndex];
      if (player) {
        player.advance(deltaMs);
      } else {
        const animation = ui.pakker[packName] && ui.pakker[packName].anims.get(page.film);
        player = animation ? new AnimationPlayer(animation) : null;
        if (player) {
          player.advance(0);
        }
      }
      ui.anim(packName, player, origin.x + layout.film.x, origin.y + layout.film.y, layout.film.skala);
      ui.tekst(page.tekst, origin.x + layout.tekst.x + layout.tekst.w / 2, origin.y + layout.tekst.y + 8, { midt: true, bredde: layout.tekst.w - 128, str: 22, op: true });
      if (pageIndex < guide.sider.length - 1) {
        ui.spriteKnap(layout.naeste.ikon, origin.x + layout.naeste.x, origin.y + layout.naeste.y, () => {
          pageIndex += 1;
          player = null;
          onPage(guide.script, pageIndex);
        }, { bag: layout.naeste.bag });
      }
    } };
}
