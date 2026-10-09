// Platform minigame: heads-up display.
//
// Shows the hearts, the coin counter and the four costume buttons (greyed out while locked, ringed
// when selected). costumeButtonPos() is also exported by Platform.js as `totemPos`, because the host
// uses it to place the costume buttons.
import { viewWidth } from './view.js';

// x position of the coin panel before widening.
const HUD_COIN_PANEL_X = 458;
// Costume button sprite ids (normal / selected / locked), first button position, spacing and scale.
const COSTUME_BUTTONS = { normal: [412, 409, 410, 411], valgt: [416, 413, 414, 415], laast: 417, x: 760, y: 588, trin: 104, skala: 0.9 };
// Screen position of costume button `index` (0-3); the buttons are anchored to the right edge.
export const costumeButtonPos = (index) => ({ x: COSTUME_BUTTONS.x - (3 - index) * COSTUME_BUTTONS.trin + (viewWidth - 960), y: COSTUME_BUTTONS.y });

// Draws the HUD for `level` using sprites from the HUD texture pack.
export function drawHud(ctx, level, manifest, images) {
  if (!manifest) {
    return;
  }
  const drawHudSprite = (spriteId, x, y, scale = 1) => {
    const def = manifest.sprites[spriteId], image = def && images[def.assetId];
    if (image) {
      ctx.drawImage(image, def.u, def.v, def.w, def.h, x - def.ox * scale, y - def.oy * scale, def.w * scale, def.h * scale);
    }
  };
  drawHudSprite(406, 0, 0);
  [40, 100, 160].forEach((x, heartIndex) => drawHudSprite(heartIndex < level.helbred ? 401 : 402, x, 27, 2));
  const coinPanelX = HUD_COIN_PANEL_X + (viewWidth - 960) / 2;
  drawHudSprite(408, coinPanelX, 0);
  const coinText = String(level.mynterTaget);
  ctx.font = "bold 44px system-ui, sans-serif";
  const textWidth = ctx.measureText(coinText).width, textLeft = coinPanelX - (textWidth + 96) / 2;
  drawHudSprite(403, textLeft + 27, 30);
  drawHudSprite(405, textLeft + 54, 30);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#5a3a10";
  ctx.fillStyle = "#fff6d0";
  ctx.strokeText(coinText, textLeft + 96, 32);
  ctx.fillText(coinText, textLeft + 96, 32);
  for (let buttonIndex = 0; buttonIndex < 4; buttonIndex++) {
    const { x: bx, y: by } = costumeButtonPos(buttonIndex), selected = level.kostume === buttonIndex;
    if (level.aabne && !level.aabne[buttonIndex]) {
      drawHudSprite(COSTUME_BUTTONS.laast, bx, by, COSTUME_BUTTONS.skala);
      continue;
    }
    drawHudSprite(selected ? COSTUME_BUTTONS.valgt[buttonIndex] : COSTUME_BUTTONS.normal[buttonIndex], bx, by, selected ? 1.05 : COSTUME_BUTTONS.skala);
    if (selected) {
      ctx.strokeStyle = "#fff6d0";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(bx, by, 52, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
