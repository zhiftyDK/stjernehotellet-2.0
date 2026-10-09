/**
 * Stage shop windows of the Popstars minigame: buying and placing stage items (instruments, amps ...)
 * and the "skip waiting" offers for build timers and the concert cooldown.
 *
 * Everything is created by createShopWindows(env), which closes over the running game's data and helpers
 * (the windows are plain objects consumed by the shared WindowStack/UI kit: {titel, tegn(draw, rect, windows)}).
 */
import { drawPriceTag } from '../../game/world-init.js';
import { formatDuration } from '../../game/world.js';
import { countStoredItems, findItemAtSlot, placeItem, nowSeconds, constructionSecondsLeft } from './band-state.js';
import { levelFromPoints } from './levels.js';

export function createShopWindows(env) {
  // Runtime values of the surrounding game closure that these windows need.
  const { itemData, makeAnim, save, wallet, drawIconText, uiPackage, isLockedByLevel, texts, findSlot, messageBox, persist, say, gameData, manifest, placedItems, font } = env;

  // Layout of one shop card (width b, height h, per-type picture boxes, anchors, scales).
  const cell = itemData.celle;
  const shopAnimCache = new Map();
  // Draws one purchasable variant as a card: framed animation, then either "x N" (already in storage)
  // or price + build time, plus a level badge if the ware is still locked by player level.
  const drawShopCard = (draw, type, variant, x, y) => {
    const ware = itemData.varer[type][variant];
    const filmId = itemData.film[type][variant];
    if (!shopAnimCache.has(filmId)) {
      shopAnimCache.set(filmId, makeAnim(filmId));
    }
    const player = shopAnimCache.get(filmId);
    draw.ramme("punkt", x, y, cell.b, cell.h);
    const boxW = cell.kasse[0][type];
    const boxH = cell.kasse[1][type];
    const boxX = x + (cell.b - boxW) / 2;
    if (player) {
      draw.anim("pop", player, boxX + boxW * cell.anker[0][type] / 100, y + boxH * cell.anker[1][type] / 100, cell.skala[type]);
    }
    const storedCount = countStoredItems(save, type, variant);
    if (storedCount > 0 ? draw.tekst(`x ${storedCount}`, x + cell.b / 2, y + cell.h - 22, { midt: true, str: 22 }) : (ware.pris >= 1 && drawPriceTag(draw, ware.pris, x + 8, y + cell.h - 22, wallet.penge >= ware.pris), ware.byggetid >= 1 && drawIconText(draw, uiPackage.ikoner.ur, formatDuration(ware.byggetid), x + 130, y + cell.h - 22)), isLockedByLevel(ware)) {
      draw.ramme("punkt", boxX, y, boxW, boxH);
      const levelX = boxX + boxW + cell.niveauXY[0];
      const levelY = y + boxH + cell.niveauXY[1];
      draw.sprite("ui", cell.niveau, levelX, levelY);
      draw.tekst(String(ware.niveau), levelX + 22, levelY, { str: 22 });
    }
  };
  // Confirm-purchase window for putting `variant` in slot `slotId` (yes/no buttons).
  const buyItemWindow = (slotId, variant) => ({ titel: texts.koebGenstand, bredde: 576, hoejde: 400, luk: false, tegn(draw, rect, windowStack) {
      drawShopCard(draw, findSlot(slotId).type, variant, rect.x + (rect.w - cell.b) / 2, rect.y + 40);
      draw.spriteKnap(uiPackage.ikoner.ja, rect.x + rect.w / 2 - 90, rect.y + rect.h - 62, () => {
        const result = placeItem(itemData, save, wallet, slotId, variant, nowSeconds());
        if (result === "penge") {
          windowStack.aabn(messageBox(texts.butik, texts.ikkeNok));
          return;
        }
        if (result) {
          persist();
          say(itemData.scripts.koebt);
          windowStack.lukAlle();
        }
      });
      draw.spriteKnap(uiPackage.ikoner.nej, rect.x + rect.w / 2 + 90, rect.y + rect.h - 62, () => windowStack.luk());
    } });
  // The shop for a stage slot: a scrolling two-column list of every variant of the slot's item type, sorted
  // unlocked first, then by price/build time. Tapping a stored item places it, a locked one shows a message,
  // anything else opens the confirm window.
  const itemShopWindow = (slotId) => {
    const type = findSlot(slotId).type;
    const current = findItemAtSlot(save, slotId);
    const playerLevel = levelFromPoints(gameData.niveau.graenser, save.point);
    const variants = itemData.varer[type].map((_ware, variantIndex) => variantIndex).filter((variantIndex) => !(current && current.type === type && current.f === variantIndex)).sort((variantA, variantB) => {
      const wareA = itemData.varer[type][variantA];
      const wareB = itemData.varer[type][variantB];
      const lockedA = wareA.niveau > playerLevel;
      const lockedB = wareB.niveau > playerLevel;
      return lockedA !== lockedB ? lockedA ? 1 : -1 : lockedA && wareA.niveau !== wareB.niveau ? wareA.niveau - wareB.niveau : wareA.pris - wareB.pris || wareA.byggetid - wareB.byggetid;
    });
    say(itemData.scripts.butik);
    return { titel: texts.butik, tegn(draw, rect, windowStack) {
        const startX = rect.x + (rect.w - 2 * cell.b - 24) / 2;
        draw.rulleliste(windowStack.top(), rect.x + 20, rect.y + 30, rect.w - 40, rect.h - 50, Math.ceil(variants.length / 2) * (cell.h + 16), (scrollTop) => {
          variants.forEach((variant, index) => {
            const cardX = startX + index % 2 * (cell.b + 24);
            const cardY = scrollTop + Math.trunc(index / 2) * (cell.h + 16);
            drawShopCard(draw, type, variant, cardX, cardY);
            draw.knap({ x0: cardX, y0: cardY, x1: cardX + cell.b, y1: cardY + cell.h }, () => {
              if (countStoredItems(save, type, variant) > 0) {
                if (placeItem(itemData, save, wallet, slotId, variant, nowSeconds())) {
                  persist();
                  windowStack.lukAlle();
                }
                return;
              }
              if (isLockedByLevel(itemData.varer[type][variant])) {
                windowStack.aabn(messageBox(texts.butik, texts.laast));
                return;
              }
              say(itemData.scripts.valgt);
              windowStack.aabn(buyItemWindow(slotId, variant));
            });
          });
        });
      } };
  };
  // Stage shop opened from the roadie: one framed picture per item type; tapping one opens that type's shop.
  const roadieWindow = () => {
    say(itemData.scripts.butik);
    return { titel: texts.sceneButik, tegn(draw, rect, windowStack) {
        const [frameDx, frameW, frameH] = itemData.vindue;
        for (const roadie of itemData.roadie) {
          const x = rect.x + frameDx;
          const y = rect.y + roadie.y;
          const sprite = manifest.sprites[roadie.billede];
          draw.ramme("punkt", x, y, frameW, frameH);
          if (sprite) {
            draw.sprite("pop", roadie.billede, x + frameW / 2 - (sprite.w / 2 - sprite.ox) * roadie.skala, y + frameH / 2 - (sprite.h / 2 - sprite.oy) * roadie.skala, { skala: roadie.skala });
          }
          draw.knap({ x0: x, y0: y, x1: x + frameW, y1: y + frameH }, () => {
            const placedItem = placedItems().find((candidate) => candidate.type === roadie.type);
            if (placedItem) {
              windowStack.aabn(itemShopWindow(placedItem.plads));
            }
          });
        }
      } };
  };
  // "Skip waiting" offer: shows the ruby price (proportional to the remaining seconds) with yes/no buttons.
  // Buying with rubies is not implemented in this minigame, so yes always answers "not enough rubies".
  const skipWaitWindow = (scriptId, secondsLeft, question) => {
    say(scriptId);
    const rubies = secondsLeft >= 1 ? Math.trunc(secondsLeft * (itemData.rubinerPrDoegn / 86400)) + 1 : 0;
    return { titel: "", bredde: 576, hoejde: 320, luk: false, tegn(draw, rect, windowStack) {
        const label = `${texts.springOver[0]}${rubies} `;
        const labelWidth = font ? font.bredde(label, Math.round(24 * 1.3)) : 200;
        const labelX = rect.x + (rect.w - labelWidth - 34) / 2;
        draw.tekst(label, labelX, rect.y + 60, { str: 24 });
        draw.sprite("ui", uiPackage.ikoner.rubin, labelX + labelWidth + 15, rect.y + 60, { skala: 0.7 });
        draw.tekst(question.trim(), rect.x + rect.w / 2, rect.y + 100, { midt: true, str: 24, bredde: rect.w - 90, op: true });
        draw.spriteKnap(uiPackage.ikoner.ja, rect.x + rect.w / 2 - 90, rect.y + rect.h - 62, () => windowStack.aabn(messageBox("", texts.ikkeRubiner)));
        draw.spriteKnap(uiPackage.ikoner.nej, rect.x + rect.w / 2 + 90, rect.y + rect.h - 62, () => windowStack.luk());
      } };
  };
  // Skip-waiting window for an item that is still under construction.
  const skipBuildWindow = (item) => skipWaitWindow(itemData.scripts.bygger, constructionSecondsLeft(item, nowSeconds()), texts.springOver[1]);
  // Skip-waiting window shown when no concert attempts are left.
  const skipCooldownWindow = () => skipWaitWindow(gameData.koncert.scripts.vent, Math.max(0, save.ventTil - nowSeconds()), texts.springOverKoncert);

  return { itemShopWindow, roadieWindow, skipBuildWindow, skipCooldownWindow };
}
