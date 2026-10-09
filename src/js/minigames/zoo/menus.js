// Zoo minigame: the buy/upgrade popup menus (land lots, attractions, animals, shops, wares, items, nests).

import { AnimationPlayer } from '../../engine/animation.js';
import { createDialogs, createFittedAnimationDrawer, drawPriceTag } from '../../game/world-init.js';
import { animalConfig, attractionUnlockLevel, buyAnimal, buyAttraction, buyLot, buyShop, changeShopWare, countStoredItems, countStoredWares, formatDuration, isLockedAtLevel, itemConfig, itemInSlot, itemSlotsOf, itemUnlockLevel, nestClip, nextLot, pendingAnimalFor, placeItem, shopUnlockLevel, shopWare, tapAnimal, unlockNest, wareConfig, wareUnlockLevel } from '../../game/world.js';
import { nowSeconds } from './session.js';

/**
 * Builds every popup menu of the zoo game. A menu is a plain object { titel, tegn(ui, rect, windows) } that the
 * WindowStack draws; the tap handler opens them. `ctx` is the shared zoo context created in Zoo.js.
 */
export function createZooMenus(ctx) {
  const { config, texts, zooAssets, attractionCfg, wallet, zoo, narratorCfg, narrator, figureValues, playNarratorEvent, uiPack } = ctx;

  const { dialog: confirmDialog, besked: messageDialog } = createDialogs(uiPack);
  /** Draws an animation scaled to fit a box (ui, "zoo", animationId, x, y, w, h, alpha). */
  const drawFittedAnimation = createFittedAnimationDrawer();
  /** Small icon followed by a text label (ui, iconSprite, text, x, y, color). */
  const drawIconText = (kit, icon, text, x, y, color = "#fff") => {
    kit.sprite("ui", icon, x + 18, y, { skala: 0.55 });
    kit.tekst(text, x + 40, y, { str: 19, farve: color });
  };
  /** UI sprite for the build-time clock. */
  const clockIcon = uiPack.ikoner.ur;
  /** UI sprite for the payout-time hourglass. */
  const hourglassIcon = uiPack.ikoner.timeglas;
  /** Sprite id of the coin icon used next to income amounts. */
  const COIN_ICON = 4193;
  const levelCfg = config.niveau;
  /** Draws a list-entry frame with a lock and the level needed to unlock it (ui, level, x, y, w, h). */
  const drawLockBadge = (kit, level, x, y, w, h) => {
    kit.ramme("punkt", x, y, w, h);
    const lockX = x + w + levelCfg.laasXY[0];
    const lockY = y + h + levelCfg.laasXY[1];
    kit.sprite("ui", levelCfg.laas, lockX, lockY, { skala: 0.6 });
    kit.tekst(String(level), lockX + 22, lockY, { str: 22 });
  };
  const expansionMenuCfg = config.udvidelse.menu;
  let expansionAnimation = null;
  /** Popup that offers buying the next land lot (zoo expansion): price, build time, yes/no. */
  const createExpansionMenu = () => {
    const lot = nextLot(zoo);
    playNarratorEvent("udvidelse");
    return { titel: texts.udvidelse, bredde: 704, hoejde: 448, luk: false, tegn(kit, box, stack) {
        if (!expansionAnimation) {
          const animationData = zooAssets.anims.get(expansionMenuCfg.film);
          expansionAnimation = animationData ? new AnimationPlayer(animationData) : null;
          if (expansionAnimation) {
            expansionAnimation.advance(0);
          }
        }
        kit.anim("zoo", expansionAnimation, box.x + expansionMenuCfg.filmXY[0], box.y + expansionMenuCfg.filmXY[1]);
        drawPriceTag(kit, lot.pris, box.x + expansionMenuCfg.pris[0], box.y + expansionMenuCfg.pris[1], wallet.penge >= lot.pris);
        drawIconText(kit, clockIcon, formatDuration(lot.byggetid), box.x + expansionMenuCfg.tid[0], box.y + expansionMenuCfg.tid[1]);
        kit.tekst(texts.udvid, box.x + box.w / 2, box.y + expansionMenuCfg.tekst[1] + 4, { midt: true, bredde: box.w - 90, str: 24, op: true });
        kit.spriteKnap(uiPack.ikoner.ja, box.x + box.w / 2 - 90, box.y + box.h - 62, () => {
          if (buyLot(zoo, wallet, nowSeconds()) === "penge") {
            stack.luk();
            stack.aabn(messageDialog(texts.udvidelse, texts.ikkeNok));
          } else {
            stack.lukAlle();
          }
        });
        kit.spriteKnap(uiPack.ikoner.nej, box.x + box.w / 2 + 90, box.y + box.h - 62, () => stack.luk());
      } };
  };
  /** Buyable attraction types (those with rules in the config), cheapest first, as { r: rules, type }. */
  const attractionEntries = config.regler.sevaerdigheder.map((rules, type) => ({ r: rules, type: type })).filter((entry) => entry.r).sort((first, second) => first.r.pris - second.r.pris);
  /** Scrolling list of attractions to build on the empty ground at attraction slot `s`. */
  const createAttractionListMenu = (slot) => ({ titel: texts.dyr, tegn(kit, box, stack) {
      kit.rulleliste(stack.top(), box.x + 40, box.y + 40, box.w - 80, box.h - 72, attractionEntries.length * 112, (listTop) => {
        attractionEntries.forEach(({ r: rules, type: type }, index) => {
          const rowY = listTop + index * 112;
          const affordable = wallet.penge >= rules.pris;
          const unlockLevel = attractionUnlockLevel(config, type);
          const locked = isLockedAtLevel(zoo, unlockLevel);
          kit.ramme("punkt", box.x + 40, rowY, box.w - 92, 104);
          drawFittedAnimation(kit, "zoo", attractionCfg.film[type], box.x + 50, rowY + 4, 200, 96);
          drawPriceTag(kit, rules.pris, box.x + 270, rowY + 28, affordable);
          drawIconText(kit, clockIcon, formatDuration(rules.byggetid), box.x + 270, rowY + 72);
          drawIconText(kit, hourglassIcon, formatDuration(rules.udbetalingstid), box.x + 450, rowY + 28);
          drawIconText(kit, COIN_ICON, String(animalConfig(config, type, 0).udbetaling), box.x + 450, rowY + 72);
          if (locked) {
            drawLockBadge(kit, unlockLevel, box.x + 40, rowY, box.w - 92, 104);
          }
          kit.knap({ x0: box.x + 40, y0: rowY, x1: box.x + box.w - 52, y1: rowY + 112 - 8 }, () => {
            if (locked) {
              stack.aabn(messageDialog(texts.dyr, texts.laastDyr));
              return;
            }
            stack.aabn(confirmDialog(texts.koebDyr, () => {
              const result = buyAttraction(zoo, wallet, slot, type, nowSeconds());
              if (result === "penge") {
                stack.aabn(messageDialog(texts.dyr, texts.ikkeNok));
              } else if (result) {
                stack.lukAlle();
                zooAssets.hentType(type);
                playNarratorEvent("sevaerdighed");
              }
            }, { titel: texts.dyr }));
          });
        });
      });
    } });
  /** Confirmation popup for buying an animal (offer `n`) for attraction `s`; `e` = nest number, -1 = any. */
  const createAnimalPurchaseMenu = (slot, offer, nestNumber = -1) => {
    const animal = animalConfig(config, offer.type, offer.f);
    playNarratorEvent("flereDyr");
    return { titel: texts.dyr, bredde: 640, hoejde: 340, luk: false, tegn(kit, box, stack) {
        drawFittedAnimation(kit, "zoo", config.dyr.film[offer.type][offer.f][0], box.x + 40, box.y + 40, 220, 170);
        drawPriceTag(kit, animal.pris, box.x + 290, box.y + 70, wallet.penge >= animal.pris);
        drawIconText(kit, clockIcon, formatDuration(animal.byggetid), box.x + 290, box.y + 118);
        drawIconText(kit, COIN_ICON, String(animal.udbetaling), box.x + 290, box.y + 166);
        kit.tekst(texts.koebDyr, box.x + box.w / 2, box.y + 226, { midt: true, str: 22 });
        kit.spriteKnap(uiPack.ikoner.ja, box.x + box.w / 2 - 90, box.y + box.h - 62, () => {
          if (buyAnimal(zoo, wallet, slot, nowSeconds(), nestNumber) === "penge") {
            stack.luk();
            stack.aabn(messageDialog(texts.dyr, texts.ikkeNok));
          } else {
            stack.lukAlle();
          }
        });
        kit.spriteKnap(uiPack.ikoner.nej, box.x + box.w / 2 + 90, box.y + box.h - 62, () => stack.luk());
      } };
  };
  /** Size [w, h] of one cell in the item/ware shop grids. */
  const itemCellSize = config.genstand.celle;
  const shopCfg = config.bod;
  /** Buyable shop types, as { r: rules, type }. */
  const shopEntries = config.regler.boder.map((rules, type) => ({ r: rules, type: type })).filter((entry) => entry.r);
  /** Scrolling list of shop types to build on the empty shop slot `s`. */
  const createShopListMenu = (slot) => {
    playNarratorEvent("bodButik");
    return { titel: texts.bodButik, tegn(kit, box, stack) {
        kit.rulleliste(stack.top(), box.x + 40, box.y + 40, box.w - 80, box.h - 72, shopEntries.length * 112, (listTop) => {
          shopEntries.forEach(({ r: rules, type: type }, index) => {
            const rowY = listTop + index * 112;
            const unlockLevel = shopUnlockLevel(config, type);
            const locked = isLockedAtLevel(zoo, unlockLevel);
            kit.ramme("punkt", box.x + 40, rowY, box.w - 92, 104);
            drawFittedAnimation(kit, "zoo", shopCfg.film[type], box.x + 50, rowY + 4, 200, 96);
            drawPriceTag(kit, rules.pris, box.x + 270, rowY + 28, wallet.penge >= rules.pris);
            drawIconText(kit, clockIcon, formatDuration(rules.byggetid), box.x + 270, rowY + 72);
            if (locked) {
              drawLockBadge(kit, unlockLevel, box.x + 40, rowY, box.w - 92, 104);
            }
            kit.knap({ x0: box.x + 40, y0: rowY, x1: box.x + box.w - 52, y1: rowY + 112 - 8 }, () => {
              if (locked) {
                stack.aabn(messageDialog(texts.bodButik, texts.laastBod));
                return;
              }
              stack.aabn(confirmDialog(texts.koebBod, () => {
                const result = buyShop(zoo, wallet, slot, type, nowSeconds());
                if (result === "penge") {
                  stack.aabn(messageDialog(texts.bodButik, texts.ikkeNok));
                } else if (result) {
                  stack.lukAlle();
                  playNarratorEvent("bod");
                  zooAssets.forhaand(shopCfg.vare.film[type]);
                }
              }, { titel: texts.bodButik }));
            });
          });
        });
      } };
  };
  /** Menu to choose or buy the ware sold by the built shop in slot `s`. */
  const createWareMenu = (shopSlot) => {
    const shop = zoo.boder[shopSlot];
    const currentWare = shopWare(zoo, shopSlot);
    const wareIndexes = shopCfg.vare.film[shop.type].map((ware, wareIndex) => wareIndex).filter((candidate) => !(currentWare && currentWare.f === candidate));
    playNarratorEvent("vareButik");
    const handleResult = (result, stack) => {
      if (result === "penge") {
        stack.luk();
        stack.aabn(messageDialog(texts.bodButik, texts.ikkeNok));
        return;
      }
      stack.lukAlle();
      if (result && narrator) {
        figureValues.fill(0);
        narrator.startForfra(narratorCfg.haendelser.vare, { 0: shop.type });
      }
    };
    return { titel: texts.bodButik, tegn(kit, box, stack) {
        const gridLeft = box.x + (box.w - 2 * itemCellSize[0] - 24) / 2;
        kit.rulleliste(stack.top(), box.x + 20, box.y + 30, box.w - 40, box.h - 50, Math.ceil(wareIndexes.length / 2) * (itemCellSize[1] + 16), (listTop) => {
          wareIndexes.forEach((wareIndex, position) => {
            const cellX = gridLeft + position % 2 * (itemCellSize[0] + 24);
            const cellY = listTop + Math.trunc(position / 2) * (itemCellSize[1] + 16);
            const wareCfg = wareConfig(config, shop.type, wareIndex);
            const storedCount = countStoredWares(zoo, shop.type, wareIndex);
            kit.ramme("punkt", cellX, cellY, itemCellSize[0], itemCellSize[1]);
            drawFittedAnimation(kit, "zoo", shopCfg.vare.film[shop.type][wareIndex], cellX + 15, cellY + 10, itemCellSize[0] - 30, itemCellSize[1] - 100);
            drawIconText(kit, hourglassIcon, formatDuration(wareCfg.udbetalingstid), cellX + 20, cellY + itemCellSize[1] - 74);
            drawIconText(kit, COIN_ICON, String(wareCfg.udbetaling), cellX + 140, cellY + itemCellSize[1] - 74);
            if (storedCount > 0) {
              kit.tekst(`x ${storedCount}`, cellX + itemCellSize[0] / 2, cellY + itemCellSize[1] - 30, { midt: true, str: 22 });
            } else {
              drawPriceTag(kit, wareCfg.pris, cellX + 70, cellY + itemCellSize[1] - 30, wallet.penge >= wareCfg.pris);
            }
            const unlockLevel = wareUnlockLevel(config, shop.type, wareIndex);
            const locked = isLockedAtLevel(zoo, unlockLevel);
            if (locked) {
              drawLockBadge(kit, unlockLevel, cellX, cellY, itemCellSize[0], itemCellSize[1]);
            }
            kit.knap({ x0: cellX, y0: cellY, x1: cellX + itemCellSize[0], y1: cellY + itemCellSize[1] }, () => {
              if (locked) {
                stack.aabn(messageDialog(texts.bodButik, texts.laastVare));
                return;
              }
              if (storedCount > 0) {
                handleResult(changeShopWare(zoo, wallet, shopSlot, wareIndex, nowSeconds()), stack);
                return;
              }
              stack.aabn(confirmDialog(texts.koebVare, () => handleResult(changeShopWare(zoo, wallet, shopSlot, wareIndex, nowSeconds()), stack), { titel: texts.bodButik }));
            });
          });
        });
      } };
  };
  /** Handles the outcome of buying an item: not enough money shows a message, success closes all windows. */
  const handleItemPurchaseResult = (result, stack) => {
    if (result === "penge") {
      stack.luk();
      stack.aabn(messageDialog(texts.butik, texts.ikkeNok));
      return;
    }
    stack.lukAlle();
    if (result) {
      playNarratorEvent("genstand");
    }
  };
  /** Menu to buy a decoration item for item slot `n` of attraction `s`. */
  const createItemMenu = (attractionNr, slotIndex) => {
    const slot = itemSlotsOf(zoo, attractionNr)[slotIndex];
    const currentItem = itemInSlot(zoo, attractionNr, slotIndex);
    const itemIndexes = config.genstand.film[slot.kat].map((item, index) => index).filter((candidate) => !(currentItem && currentItem.kat === slot.kat && currentItem.f === candidate));
    playNarratorEvent("butik");
    return { titel: texts.butik, tegn(kit, box, stack) {
        const gridLeft = box.x + (box.w - 2 * itemCellSize[0] - 24) / 2;
        const rowCount = Math.ceil(itemIndexes.length / 2);
        kit.rulleliste(stack.top(), box.x + 20, box.y + 30, box.w - 40, box.h - 50, rowCount * (itemCellSize[1] + 16), (listTop) => {
          itemIndexes.forEach((itemIndex, position) => {
            const cellX = gridLeft + position % 2 * (itemCellSize[0] + 24);
            const cellY = listTop + Math.trunc(position / 2) * (itemCellSize[1] + 16);
            const itemCfg = itemConfig(config, slot.kat, itemIndex);
            const storedCount = countStoredItems(zoo, slot.kat, itemIndex);
            kit.ramme("punkt", cellX, cellY, itemCellSize[0], itemCellSize[1]);
            drawFittedAnimation(kit, "zoo", config.genstand.film[slot.kat][itemIndex], cellX + 15, cellY + 10, itemCellSize[0] - 30, itemCellSize[1] - 70);
            if (storedCount > 0) {
              kit.tekst(`x ${storedCount}`, cellX + itemCellSize[0] / 2, cellY + itemCellSize[1] - 34, { midt: true, str: 22 });
            } else {
              drawPriceTag(kit, itemCfg.pris, cellX + 20, cellY + itemCellSize[1] - 34, wallet.penge >= itemCfg.pris);
              drawIconText(kit, clockIcon, formatDuration(itemCfg.byggetid), cellX + 130, cellY + itemCellSize[1] - 34);
            }
            const unlockLevel = itemUnlockLevel(config, slot.kat, itemIndex);
            const locked = isLockedAtLevel(zoo, unlockLevel);
            if (locked) {
              drawLockBadge(kit, unlockLevel, cellX, cellY, itemCellSize[0], itemCellSize[1]);
            }
            kit.knap({ x0: cellX, y0: cellY, x1: cellX + itemCellSize[0], y1: cellY + itemCellSize[1] }, () => {
              if (locked) {
                stack.aabn(messageDialog(texts.butik, texts.laastGenstand));
                return;
              }
              if (storedCount > 0) {
                handleItemPurchaseResult(placeItem(zoo, wallet, attractionNr, slotIndex, itemIndex, nowSeconds()), stack);
                return;
              }
              stack.aabn(confirmDialog(texts.koebGenstand, () => handleItemPurchaseResult(placeItem(zoo, wallet, attractionNr, slotIndex, itemIndex, nowSeconds()), stack), { titel: texts.butik }));
            });
          });
        });
      } };
  };
  /** Size [w, h] of one nest cell. */
  const nestCellSize = config.rede.celle;
  /** Draws one nest cell (ui, nest, x, y, showPrice); locked nests are dimmed and show a lock or their unlock price. */
  const drawNestCell = (kit, nest, x, y, showPrice = false) => {
    kit.ramme("punkt", x, y, nestCellSize[0], nestCellSize[1]);
    drawFittedAnimation(kit, "zoo", nestClip(zoo, nest), x + 10, y + 10, nestCellSize[0] - 20, nestCellSize[1] - 20, nest.laast ? 0.45 : 1);
    if (nest.laast) {
      if (showPrice) {
        drawPriceTag(kit, config.regler.reder[nest.nr], x + nestCellSize[0] / 2 - 50, y + nestCellSize[1] - 30, wallet.penge >= config.regler.reder[nest.nr]);
      } else {
        kit.sprite("zoo", config.rede.laas, x + nestCellSize[0] / 2, y + nestCellSize[1] / 2);
      }
    }
  };
  /** Popup asking whether to unlock (buy) the locked nest `s`. */
  const createNestUnlockMenu = (nest) => ({ titel: texts.redeMenu, bredde: 576, hoejde: 400, luk: false, tegn(kit, box, stack) {
      drawNestCell(kit, nest, box.x + (box.w - nestCellSize[0]) / 2, box.y + 30, true);
      kit.tekst(texts.nyRede, box.x + box.w / 2, box.y + 262, { midt: true, str: 22 });
      kit.spriteKnap(uiPack.ikoner.ja, box.x + box.w / 2 - 90, box.y + box.h - 62, () => {
        stack.luk();
        if (unlockNest(zoo, wallet, nest.nr) === "penge") {
          stack.aabn(messageDialog(texts.redeMenu, texts.ikkeNok));
        }
      });
      kit.spriteKnap(uiPack.ikoner.nej, box.x + box.w / 2 + 90, box.y + box.h - 62, () => stack.luk());
    } });
  /** Nest overview for the attraction `s` with its pending animal offer `n`: pick a free nest, unlock locked ones, or collect a finished animal. */
  const createNestMenu = (attractionNr, offer) => ({ titel: texts.redeMenu, tegn(kit, box, stack) {
      const gridLeft = box.x + (box.w - 3 * nestCellSize[0] - 80) / 2;
      const gridTop = box.y + (box.h - 2 * nestCellSize[1] - 16) / 2;
      zoo.reder.forEach((nest, index) => {
        const cellX = gridLeft + Math.trunc(index / 2) * (nestCellSize[0] + 40);
        const cellY = gridTop + index % 2 * (nestCellSize[1] + 16);
        drawNestCell(kit, nest, cellX, cellY);
        kit.knap({ x0: cellX, y0: cellY, x1: cellX + nestCellSize[0], y1: cellY + nestCellSize[1] }, () => {
          if (nest.laast) {
            stack.aabn(createNestUnlockMenu(nest));
            return;
          }
          if (nest.sev < 0) {
            stack.aabn(createAnimalPurchaseMenu(attractionNr, offer, nest.nr));
            return;
          }
          const pending = pendingAnimalFor(zoo, nest);
          if (pending && nowSeconds() >= pending.slut) {
            tapAnimal(zoo, pending, nowSeconds());
            stack.lukAlle();
          }
        });
      });
    } });

  return { createExpansionMenu, createAttractionListMenu, createAnimalPurchaseMenu, createShopListMenu, createWareMenu, createItemMenu, createNestMenu };
}
