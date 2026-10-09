// Platform minigame: draw-list construction for a Level.
//
// Produces the list of sprites/animations to draw for the current camera position; drawWorld() in
// render.js turns the list into canvas draw calls. Mixed into Level.prototype by level.js.
import { PIXEL_SCALE, TILE, VIEW_HEIGHT, VIEW_HEIGHT_UNITS, SPRITE_ID_OFFSET } from './constants.js';
import { viewWidth, viewWidthUnits } from './view.js';
import { ENEMY_SPRITES, DUST_SPRITES } from './sprites.js';

export const renderMethods = {
  // Builds this frame's draw list (back to front): parallax backgrounds, solid tiles, moving platforms, spikes,
  // animated scenery, coins, goal, enemies and projectiles, the player (blinking while invulnerable) and dust.
  // Each item is {sprite|anim, x, y, flip?, alpha?} in screen pixels.
  tegneliste() {
    var shotRef;
    const drawList = [], cam = this.kam, toScreenX = (worldX) => (worldX - cam.x) * PIXEL_SCALE, toScreenY = (worldY) => (worldY - cam.y) * PIXEL_SCALE;
    for (const [layer, parallax] of [[this.baggrund.fjern, 0.25], [this.baggrund.naer, 0.5]]) {
      const layout = layer.layout, cellSize = 256, layoutWidth = layout[0].length, scrollX = cam.x * PIXEL_SCALE * parallax, topY = VIEW_HEIGHT + (this.Hu - (cam.y + VIEW_HEIGHT_UNITS)) * PIXEL_SCALE * parallax - layout.length * cellSize;
      for (let col = Math.floor(scrollX / cellSize) - 1; col * cellSize - scrollX < viewWidth + cellSize; col++) {
        for (let row = 0; row < layout.length; row++) {
          const cell = layout[row][(col % layoutWidth + layoutWidth) % layoutWidth];
          if (cell) {
            drawList.push({ sprite: layer.sprite + SPRITE_ID_OFFSET + cell - 1, x: col * cellSize - scrollX + cellSize / 2, y: topY + row * cellSize });
          }
        }
      }
    }
    const firstCol = Math.max(0, Math.floor(cam.x / TILE) - 1), lastCol = Math.min(this.W, Math.ceil((cam.x + viewWidthUnits) / TILE) + 1), firstRow = Math.max(0, Math.floor(cam.y / TILE) - 1), lastRow = Math.min(this.H, Math.ceil((cam.y + VIEW_HEIGHT_UNITS) / TILE) + 2);
    for (let row = firstRow; row < lastRow; row++) {
      const rowData = this.bane.materiale[row];
      for (let col = firstCol; col < lastCol; col++) {
        const material = rowData[col];
        if (material) {
          drawList.push({ sprite: 312 + SPRITE_ID_OFFSET + material - 9, x: toScreenX(col * TILE + TILE / 2), y: toScreenY(row * TILE) });
        }
      }
    }
    const isNearCamera = (wx, wy, margin = 80) => wx > cam.x - margin && wx < cam.x + viewWidthUnits + margin && wy > cam.y - margin && wy < cam.y + VIEW_HEIGHT_UNITS + margin;
    for (const platform of this.platforme) {
      if (isNearCamera(platform.sti.x[1], platform.sti.y[1], 160)) {
        platform.tegn(drawList, toScreenX, toScreenY);
      }
    }
    for (const spikeRow of this.pigge) {
      for (let index = 0; index < spikeRow.n; index++) {
        const vertical = spikeRow.dir === 1 || spikeRow.dir === 3, spikeX = spikeRow.x + (vertical ? 0 : TILE * index), spikeY = spikeRow.y + (vertical ? TILE * index : 0);
        if (isNearCamera(spikeX, spikeY)) {
          drawList.push({ sprite: ENEMY_SPRITES.pig[spikeRow.dir], x: toScreenX(spikeX), y: toScreenY(spikeY) });
        }
      }
    }
    for (const item of this.fast) {
      const anim = this.delte.get(item.id);
      if (anim && isNearCamera(item.x, item.y)) {
        drawList.push({ anim: anim, x: toScreenX(item.x), y: toScreenY(item.y) });
      }
    }
    const coinAnim = this.delte.get(12861);
    if (coinAnim) {
      for (const coin of this.mynter) {
        if (!coin.taget && isNearCamera(coin.x, coin.y)) {
          drawList.push({ anim: coinAnim, x: toScreenX(coin.x), y: toScreenY(coin.y) });
        }
      }
    }
    const goalAnim = this.delte.get(12869);
    if (goalAnim) {
      drawList.push({ anim: goalAnim, x: toScreenX(this.maal.x), y: toScreenY(this.maal.y) });
    }
    for (const enemy of this.fjender) {
      if ((shotRef = enemy.skud) != null && shotRef.aktiv && drawList.push({ sprite: ENEMY_SPRITES.skud, x: toScreenX(enemy.skud.x), y: toScreenY(enemy.skud.y) }), enemy.vaek || !isNearCamera(enemy.x, enemy.y)) {
        continue;
      }
      const sx = toScreenX(enemy.x), sy = toScreenY(enemy.y);
      if (enemy.art === "gaaer") {
        if (enemy.tilst === "doed") {
          drawList.push({ sprite: ENEMY_SPRITES.gaaerDoed, x: sx, y: sy });
        } else if (enemy.anim) {
          drawList.push({ anim: enemy.anim, x: sx, y: sy });
        }
      } else if (enemy.art === "hopper") {
        if (enemy.tilst === 0) {
          drawList.push({ sprite: ENEMY_SPRITES.hopperFald, x: sx, y: sy });
        } else if (enemy.tilst === 5) {
          drawList.push({ sprite: ENEMY_SPRITES.hopperDoed, x: sx, y: sy });
        } else if (enemy.anims[enemy.tilst]) {
          drawList.push({ anim: enemy.anims[enemy.tilst], x: sx, y: sy });
        }
      } else if (enemy.art === "kaster") {
        if (enemy.tilst === "lammet") {
          const anim = enemy.vaagner ? enemy.vaagn : enemy.lam;
          if (anim) {
            drawList.push({ anim: anim, x: sx, y: sy, flip: enemy.dir === 0 });
          }
        } else {
          drawList.push({ sprite: ENEMY_SPRITES.kaster[enemy.vis], x: sx, y: sy, flip: enemy.dir !== 0 });
        }
      } else if (enemy.art === "popper") {
        if (enemy.tilst === "op" && enemy.trakker && enemy.trak) {
          drawList.push({ anim: enemy.trak, x: sx, y: sy });
        } else {
          drawList.push({ sprite: ENEMY_SPRITES.popper[enemy.vis], x: sx, y: sy });
        }
      }
    }
    const hiddenByBlink = this.usaarlig && !this.frys && Math.floor(this.blinkTid / (this.blinkTid > 1e3 ? 120 : 60)) % 2 === 1;
    if (this.fig.anim && !hiddenByBlink) {
      if (this.fig.hoejre) {
        drawList.push({ anim: this.p.face === 0 ? this.fig.anim : this.fig.hoejre, x: toScreenX(this.p.x), y: toScreenY(this.p.y), flip: false });
      } else {
        drawList.push({ anim: this.fig.anim, x: toScreenX(this.p.x), y: toScreenY(this.p.y), flip: this.p.face === 0 });
      }
    }
    for (const particle of this.partikler) {
      drawList.push({ sprite: DUST_SPRITES[Math.floor(particle.tid / 66)], x: toScreenX(particle.x), y: toScreenY(particle.y) });
    }
    return drawList;
  },
};
