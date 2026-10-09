/**
 * Band member windows of the Popstars minigame: dressing a member (clothes, instrument) and hiring new members.
 * Created by createBandWindows(env), which closes over the running game's data and helpers.
 */
import { drawPriceTag } from '../../game/world-init.js';
import { getAnimationBounds } from '../../render/canvas-helpers.js';
import { drawAnimation } from './sprite-draw.js';
import { CLICK_SOUND } from './constants.js';
import { createMemberOutfit, buyBandMember, equipClothing, memberOutfit, instrumentsTakenByOthers, ownsClothing } from './band-state.js';

export function createBandWindows(env) {
  // Runtime values of the surrounding game closure that these windows need.
  const { bandData, instrumentFilmIndex, cachedAnim, manifest, ctx, images, outfitOverrides, clothingData, save, wallet, persist, say, kronerPerPoint, messageBox, texts, uiPackage, sounds } = env;

  // Draws a band member preview (their film dressed in `pieces`) scaled to fit the box x,y,w,h.
  const drawOutfitPreview = (pieces, x, y, w, h) => {
    const filmId = bandData.medlemFilm.butik[instrumentFilmIndex(pieces)];
    const anim = cachedAnim(`vis${filmId}`, filmId);
    const bounds = getAnimationBounds(manifest, anim);
    if (!anim || !bounds) {
      return;
    }
    const scale = Math.min(1, w / (bounds.x1 - bounds.x0), h / (bounds.y1 - bounds.y0));
    ctx.save();
    ctx.translate(x + w / 2 - (bounds.x0 + bounds.x1) / 2 * scale, y + h / 2 - (bounds.y0 + bounds.y1) / 2 * scale);
    ctx.scale(scale, scale);
    drawAnimation(ctx, manifest, images, anim, 0, 0, 1, outfitOverrides(pieces));
    ctx.restore();
  };
  // Window for choosing a variant of one clothing/instrument `type` for a member: scrolling grid of variants on the left,
  // live preview on the right, buy/equip button. Paid variants ask for confirmation first.
  const accessoryWindow = (memberIndex, type) => {
    let selected = -1;
    const cellSize = { b: clothingData.celle.b[type], h: clothingData.celle.h[type] };
    const drawCell = (draw, variant, x, y, highlighted) => {
      draw.ramme("punkt", x, y, cellSize.b, cellSize.h);
      if (highlighted) {
        draw.ramme("punkt", x, y, cellSize.b, cellSize.h);
      }
      draw.spriteIKasse("pop", clothingData.ikoner[type][variant], x + 8, y + 8, cellSize.b - 16, cellSize.h - 40);
      const price = clothingData.priser[type][variant];
      if (!ownsClothing(save, type, variant) && price >= 1) {
        drawPriceTag(draw, price, x + 8, y + cellSize.h - 20, wallet.penge >= price);
      }
    };
    const afterPurchase = (windowStack, closeList) => {
      persist();
      if (closeList) {
        windowStack.luk();
        if (windowStack.top() === listWindow) {
          windowStack.luk();
        }
      }
    };
    const confirmPurchase = (windowStack) => {
      const isFirstPurchase = !ownsClothing(save, type, selected);
      say(clothingData.scripts.koebt);
      const result = equipClothing(clothingData, save, wallet, memberIndex, type, selected, kronerPerPoint);
      if (result === "penge") {
        windowStack.aabn(messageBox(texts.tilbehoer, texts.ikkeNok));
      } else if (result) {
        afterPurchase(windowStack, isFirstPurchase);
      }
    };
    const confirmWindow = () => ({ titel: texts.tilbehoer, bredde: 576, hoejde: 400, luk: false, tegn(draw, rect, windowStack) {
        drawCell(draw, selected, rect.x + (rect.w - cellSize.b) / 2, rect.y + 30, false);
        draw.tekst(texts.koebTilbehoer, rect.x + rect.w / 2, rect.y + 30 + cellSize.h + 30, { midt: true, str: 24 });
        draw.spriteKnap(uiPackage.ikoner.ja, rect.x + rect.w / 2 - 90, rect.y + rect.h - 62, () => confirmPurchase(windowStack));
        draw.spriteKnap(uiPackage.ikoner.nej, rect.x + rect.w / 2 + 90, rect.y + rect.h - 62, () => windowStack.luk());
      } });
    const listWindow = { titel: texts.tilbehoer, tegn(draw, rect, windowStack) {
        const ownedPiece = memberOutfit(save, memberIndex).find((piece) => piece.type === type);
        const variants = clothingData.ikoner[type].map((_variant, variantIndex) => variantIndex).filter((variant) => !(ownedPiece && ownedPiece.f === variant));
        const listWidth = 380;
        const perRow = Math.max(1, Math.trunc(listWidth / (cellSize.b + 8)));
        draw.rulleliste(listWindow, rect.x + 30, rect.y + 30, listWidth, rect.h - 50, Math.ceil(variants.length / perRow) * (cellSize.h + 8), (scrollTop) => {
          variants.forEach((variant, index) => {
            const x = rect.x + 30 + index % perRow * (cellSize.b + 8);
            const y = scrollTop + Math.trunc(index / perRow) * (cellSize.h + 8);
            drawCell(draw, variant, x, y, variant === selected);
            draw.knap({ x0: x, y0: y, x1: x + cellSize.b, y1: y + cellSize.h }, () => {
              selected = variant;
              say(clothingData.scripts.valgt);
            });
          });
        });
        const previewPieces = memberOutfit(save, memberIndex).filter((piece) => selected < 0 || (type >= 7 ? piece.type < 7 : piece.type !== type));
        if (selected >= 0) {
          previewPieces.push({ type: type, f: selected, medlem: memberIndex });
        }
        draw.ramme("punkt", rect.x + 430, rect.y + 30, 240, 300);
        drawOutfitPreview(previewPieces, rect.x + 440, rect.y + 40, 220, 280);
        draw.spriteKnap(uiPackage.ikoner.ja, rect.x + 550, rect.y + rect.h - 50, () => {
          if (selected < 0) {
            return;
          }
          if (ownsClothing(save, type, selected)) {
            confirmPurchase(windowStack);
            return;
          }
          const price = clothingData.priser[type][selected];
          if (wallet.penge < price) {
            windowStack.aabn(messageBox(texts.tilbehoer, texts.ikkeNok));
            return;
          }
          if (price >= 1) {
            windowStack.aabn(confirmWindow());
          } else {
            confirmPurchase(windowStack);
          }
        });
      } };
    return listWindow;
  };
  // Band member window: a grid of clothing categories (types 1..11; instruments already taken by others are hidden)
  // with a live preview; tapping a category opens accessoryWindow.
  const memberWindow = (memberIndex) => ({ titel: texts.tilbehoer, tegn(draw, rect, windowStack) {
      const takenByOthers = instrumentsTakenByOthers(save, memberIndex);
      const types = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((type) => type < 7 || !takenByOthers.has(type));
      const tileSize = 92;
      types.forEach((type, index) => {
        const x = rect.x + 30 + index % 4 * (tileSize + 8);
        const y = rect.y + 30 + Math.trunc(index / 4) * (tileSize + 8);
        draw.ramme("punkt", x, y, tileSize, tileSize);
        draw.spriteIKasse("pop", clothingData.knapper[type], x + 6, y + 6, tileSize - 12, tileSize - 12);
        draw.knap({ x0: x, y0: y, x1: x + tileSize, y1: y + tileSize }, () => {
          sounds.spil(CLICK_SOUND);
          windowStack.aabn(accessoryWindow(memberIndex, type));
        });
      });
      draw.ramme("punkt", rect.x + 430, rect.y + 30, 240, 340);
      drawOutfitPreview(memberOutfit(save, memberIndex), rect.x + 440, rect.y + 40, 220, 320);
    } });
  // Offer to hire the next band member for a price.
  const newMemberWindow = () => {
    const memberIndex = save.band.length;
    return { titel: texts.nytMedlem, bredde: 576, hoejde: 288, luk: false, tegn(draw, rect, windowStack) {
        drawOutfitPreview(createMemberOutfit(clothingData, save, memberIndex), rect.x + 60, rect.y + 30, 150, 170);
        draw.tekst(texts.nytMedlem, rect.x + 240, rect.y + 80, { str: 22 });
        drawPriceTag(draw, bandData.medlemPris[memberIndex], rect.x + 232, rect.y + 130, wallet.penge >= bandData.medlemPris[memberIndex]);
        draw.spriteKnap(uiPackage.ikoner.ja, rect.x + rect.w / 2 - 90, rect.y + rect.h - 62, () => {
          windowStack.luk();
          const result = buyBandMember(bandData, clothingData, save, wallet, kronerPerPoint);
          if (result === "penge") {
            windowStack.aabn(messageBox(texts.nytMedlem, texts.ikkeNok));
          } else if (result) {
            persist();
          }
        });
        draw.spriteKnap(uiPackage.ikoner.nej, rect.x + rect.w / 2 + 90, rect.y + rect.h - 62, () => windowStack.luk());
      } };
  };

  return { drawOutfitPreview, memberWindow, newMemberWindow };
}
