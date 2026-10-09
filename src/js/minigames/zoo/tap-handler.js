// Zoo minigame: what happens when the player taps the world (collect income, open menus, pop balloons, ...).

import { tutorials } from '../../game/save.js';
import { animalPosition, attractionSlotPosition, balloonPosition, collectAttractionIncome, collectShopIncome, finishAttractionBuild, finishShopBuild, hasAnimalActions, isAdultStage, isBalloonIdle, isBuildTimerRunning, isLotBuilding, isTimerExpired, itemSlotsOf, nextAnimalOffer, nextLot, popBalloon, shopSlotPosition, tapAnimal, worldWidth } from '../../game/world.js';
import { hitsSprite } from './draw-utils.js';
import { offsetPoint } from './positions.js';
import { nowSeconds } from './session.js';

/**
 * Returns the tap handler: tap(worldX, worldY) with world coordinates (screen + camera).
 * Checks, in priority order: balloons, the help sign, the expansion sign, attraction money signs,
 * shops, items, animals, attraction heart signs (animal offers) and finally empty ground / building attractions.
 */
export function createTapHandler(ctx) {
  const { config, texts, manifest, attractionCfg, zoo, wallet, sounds, windows, instructionPanel, cameraRef, playNarratorEvent, attractionAnchor } = ctx;
  const { createExpansionMenu, createAttractionListMenu, createAnimalPurchaseMenu, createShopListMenu, createWareMenu, createItemMenu, createNestMenu } = ctx.menus;
  const { spawnMoneyEffect } = ctx.moneyEffects;
  const shopCfg = config.bod;

  return function tap(worldX, worldY) {
    const nowSec = nowSeconds();
    // Extra tolerance (px) around sprites so fingers can hit them.
    const tapMargin = attractionCfg.tryk;
    // 1. Idle balloons: pop for coins.
    for (const balloon of zoo.balloner) {
      const balloonPos = balloonPosition(zoo, balloon);
      if (!isBalloonIdle(balloon) || !hitsSprite(manifest, config.balloner.hit, balloonPos.x, balloonPos.y, worldX, worldY, 0)) {
        continue;
      }
      const balloonIncome = popBalloon(zoo, wallet, balloon);
      if (balloonIncome >= 1) {
        sounds.spil(config.lyde.penge);
      }
      const camera = cameraRef.current;
      spawnMoneyEffect(balloonIncome, balloonPos.x - camera.x, balloonPos.y - camera.y);
      return;
    }
    // 2. The help sign opens its instruction panel.
    const helpSign = texts.skilt;
    if (helpSign && hitsSprite(manifest, helpSign.billede, helpSign.x, helpSign.y, worldX, worldY, helpSign.tryk)) {
      windows.aabn(instructionPanel(helpSign.vejledning));
      return;
    }
    // 3. The expansion sign at the end of the zoo offers the next land lot.
    const lotCfg = config.udvidelse;
    const lotX = worldWidth(zoo);
    if (zoo.lotFilm !== 2 && lotX >= 1 && hitsSprite(manifest, lotCfg.skilt, lotX + lotCfg.dx, Math.trunc(config.verden.hoejde * lotCfg.y), worldX, worldY, lotCfg.tryk)) {
      if (!isLotBuilding(zoo, nowSec) && nextLot(zoo)) {
        windows.aabn(createExpansionMenu());
      }
      return;
    }
    // 4. Money signs / coins of finished attractions: collect income.
    for (const attraction of zoo.sev) {
      if (attraction.type < 1 || attraction.bygger) {
        continue;
      }
      // The money sign and the spinning coin above it both count as the "collect income" target.
      const { p: slotPos } = attractionAnchor(attraction.nr);
      const moneySignPos = offsetPoint(slotPos, attractionCfg.pengeskilt);
      const coinSprite = manifest.sprites[attractionCfg.moent.sprite];
      const coinScale = attractionCfg.moent.skala;
      const coinLeft = coinSprite && moneySignPos.x - coinSprite.ox * coinScale;
      const coinTop = coinSprite && moneySignPos.y + attractionCfg.moent.dy - coinSprite.oy * coinScale;
      const coinHit = coinSprite && worldX + tapMargin >= coinLeft && worldX - tapMargin <= coinLeft + coinSprite.w * coinScale && worldY + tapMargin >= coinTop && worldY - tapMargin <= coinTop + coinSprite.h * coinScale;
      if (hitsSprite(manifest, 5718, moneySignPos.x, moneySignPos.y, worldX, worldY, tapMargin) || coinHit) {
        const income = collectAttractionIncome(zoo, wallet, attraction.nr, nowSec);
        if (income > 0) {
          sounds.spil(config.lyde.penge);
          const camera = cameraRef.current;
          spawnMoneyEffect(income, moneySignPos.x - camera.x, moneySignPos.y + attractionCfg.moent.dy - camera.y);
        }
        return;
      }
    }
    // 5. Shops: empty slot -> shop list, under construction -> finish, payout ready -> collect, otherwise ware menu.
    for (const shop of zoo.boder) {
      const slotPos = shopSlotPosition(config, shop.nr);
      const shopX = slotPos.x + shopCfg.forskyd[0];
      const shopY = slotPos.y + shopCfg.forskyd[1];
      const signPos = { x: slotPos.x + shopCfg.skilt.x, y: slotPos.y + shopCfg.skilt.y };
      if (!(!(shop.type >= 1 && !shop.bygger && hitsSprite(manifest, 5718, signPos.x, signPos.y, worldX, worldY, tapMargin)) && !hitsSprite(manifest, shopCfg.hit + shop.type, shopX, shopY, worldX, worldY, tapMargin))) {
        if (shop.type < 1) {
          windows.aabn(createShopListMenu(shop.nr));
          if (!tutorials.har("zoo4") && !zoo.varer.length) {
            tutorials.saet("zoo4");
            windows.aabn(instructionPanel(4));
          }
        } else if (shop.bygger) {
          finishShopBuild(zoo, shop.nr, nowSec);
        } else if (isTimerExpired(shop, nowSec)) {
          const income = collectShopIncome(zoo, wallet, shop.nr, nowSec);
          if (income > 0) {
            sounds.spil(config.lyde.penge);
            const camera = cameraRef.current;
            spawnMoneyEffect(income, signPos.x - camera.x, signPos.y + shopCfg.moentDy - camera.y);
          }
        } else {
          windows.aabn(createWareMenu(shop.nr));
        }
        return;
      }
    }
    // 6. Decoration items (topmost first): open the item menu unless still being built.
    for (const item of [...zoo.genstande].reverse()) {
      if (item.sev < 0 || !zoo.sev[item.sev] || zoo.sev[item.sev].bygger) {
        continue;
      }
      const slot = itemSlotsOf(zoo, item.sev)[item.plads];
      if (!slot) {
        continue;
      }
      const attractionPos = attractionSlotPosition(config, item.sev);
      if (hitsSprite(manifest, config.genstand.hit + slot.kat, attractionPos.x + slot.x, attractionPos.y + slot.y, worldX, worldY, tapMargin)) {
        if (!isBuildTimerRunning(item, nowSec)) {
          windows.aabn(createItemMenu(item.sev, item.plads));
        }
        return;
      }
    }
    // 7. Animals (topmost first): interact with the animal.
    for (const animal of [...zoo.dyr].reverse()) {
      if (animal.alfa.v <= 0) {
        continue;
      }
      const animalPos = animalPosition(zoo, animal);
      if (hitsSprite(manifest, 5738, animalPos.x, animalPos.y, worldX, worldY, tapMargin, config.dyr.anker, animal.spejl)) {
        tapAnimal(zoo, animal, nowSec);
        return;
      }
    }
    // 8. Heart signs: buy a new animal (adult offer) or pick a nest (baby offer).
    for (const attraction of zoo.sev) {
      if (attraction.type < 1 || attraction.bygger || !hasAnimalActions(zoo, attraction.nr)) {
        continue;
      }
      const heartSignPos = offsetPoint(attractionSlotPosition(config, attraction.nr), attractionCfg.hjerteskilt);
      if (!hitsSprite(manifest, 5718, heartSignPos.x, heartSignPos.y, worldX, worldY, tapMargin)) {
        continue;
      }
      const offer = nextAnimalOffer(zoo, attraction.nr);
      if (offer && isAdultStage(offer.f)) {
        windows.aabn(createAnimalPurchaseMenu(attraction.nr, offer));
      } else if (offer) {
        windows.aabn(createNestMenu(attraction.nr, offer));
        if (!tutorials.har("zoo3")) {
          tutorials.saet("zoo3");
          windows.aabn(instructionPanel(3));
        }
      }
      return;
    }
    // 9. The attraction itself: empty ground opens the build list, a finished construction can be completed by tapping.
    for (const attraction of zoo.sev) {
      const { x: anchorX, y: anchorY } = attractionAnchor(attraction.nr);
      if (hitsSprite(manifest, 5669, anchorX, anchorY, worldX, worldY, tapMargin)) {
        if (attraction.type === 0) {
          playNarratorEvent("grund");
          windows.aabn(createAttractionListMenu(attraction.nr));
        } else if (attraction.bygger) {
          finishAttractionBuild(zoo, attraction.nr, nowSec);
        }
        return;
      }
    }
  };
}
