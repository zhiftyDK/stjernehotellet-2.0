// In-game menu / dialog definitions for the hotel screen.
//
// createMenus(game) returns a registry `menus` whose entries are factories: calling
// `menus.<name>(...args)` builds a window description that the window stack (`win`, see the
// game screen) opens with `win.aabn(...)`. A window description is
//   { titel, bredde?, hoejde?, luk?, tegn(painter, panel, win), tast?(key, win) }
// where `painter` is the UI drawing helper, `panel` the window rectangle {x, y, w, h}, and `win`
// the window-stack controller (aabn = open another window, luk = close this one, lukAlle = close
// all, top = scroll state of this window). Menu names are the Danish ids referenced from the data
// files (e.g. the main-menu button list), so they must not be renamed.
//
// Shared pieces live in ./world-menus/: dialog factories + price tag + animation fitter
// (menu-helpers.js) and the safe code redemption logic (vault-codes.js).
// Prices/cooking/pet rules come from furniture-and-kitchen.js, pets.js and hotel.js.
import { clearActiveSlot } from '../storage/saves.js';
import { pointLevel } from '../render/canvas-helpers.js';
import { hasUnseenNews, INFO_SECTIONS, markNewsSeen, NEWS } from '../ui/news-and-info.js';
import { VIP_TIERS, isVipStaying, vipStatus, newFloorPrice, FLOOR_TYPES, buyFloor, CAFE_FLOOR_TYPE, petFloorCost, buyPetFloor } from './hotel.js';
import { formatDuration } from './world.js';
import { getVolume, setVolume } from '../audio/audio.js';
import { COIN_SOUND_ID, FURNITURE_TYPE_NAMES, featurePrice, DELIVERY_TIME_MS, buyFurnitureFeature, kitchenLevel, dishInfo, startDish, stovePrice, maxStovesForLevel, buyStove, maxTableForLevel, tablePrice, upgradeTable, COOK_NAMES, COOK_PRICES, hireCook } from './furniture-and-kitchen.js';
import { PET_FLOOR_TYPE, petItemStats, buyPetItem } from './pets.js';
import { createFittedAnimationDrawer, drawPriceTag, createDialogs } from './world-menus/menu-helpers.js';
import { redeemVaultCode } from './world-menus/vault-codes.js';

/**
 * Builds the menu registry for a running game.
 * `game` is the game-screen controller: game.s = hotel state, game.D = static hotel data,
 * game.U = UI texts/icons, game.CF.C = cafe (restaurant) data, game.MB.kat = furniture catalog,
 * game.hoved(script, args) runs a scripted story event, game.vis(text) shows a toast.
 */
function createMenus(game) {
  const uiData = game.U, texts = uiData.tekster, icons = uiData.ikoner, drawFittedAnimation = createFittedAnimationDrawer(), priceTag = drawPriceTag, menus = {}, dialogs = createDialogs(uiData);
  // Generic yes/no dialog and OK-only notice (see menu-helpers.js).
  menus.dialog = dialogs.dialog;
  menus.besked = dialogs.besked;
  // Main menu: grid of icon buttons from the UI data plus News / Info / switch-player / quit buttons.
  menus.hovedmenu = () => ({ titel: texts.hovedmenu, hoejde: 620, tegn(painter, panel, win) {
      const layout = uiData.hovedmenu;
      layout.knapper.forEach((button, buttonIndex) => {
        const buttonX = panel.x + panel.w * layout.kolonner[buttonIndex % 4] / 100, buttonY = panel.y + layout.raekker[Math.floor(buttonIndex / 4)];
        painter.spriteKnap(button.sprite, buttonX, buttonY, () => win.aabn(menus[button.menu]()), { bag: layout.bag, skala: 0.95 });
      });
      const buttonW = 260, gap = 24, rowX = panel.x + (panel.w - 2 * buttonW - gap) / 2, rowY = panel.y + panel.h - 192;
      painter.tekstKnap("Nyheder", rowX, rowY, buttonW, 60, () => win.aabn(menus.nyheder()));
      if (hasUnseenNews()) {
        drawUnseenBadge(painter.ctx, rowX + buttonW - 6, rowY + 6);
      }
      painter.tekstKnap("Info", rowX + buttonW + gap, rowY, buttonW, 60, () => win.aabn(menus.info()));
      painter.tekstKnap("Skift spiller", rowX, rowY + 84, buttonW, 60, () => {
        clearActiveSlot();
        try {
          sessionStorage.setItem("stjernehotellet-spring-titel", "1");
        } catch {}
        window.location.reload();
      });
      painter.tekstKnap("Luk spillet", rowX + buttonW + gap, rowY + 84, buttonW, 60, () => {
        if (window.electronAPI) {
          window.electronAPI.closeApp();
        } else {
          clearActiveSlot();
          window.location.reload();
        }
      });
    } });
  // Red dot shown on the News button while there are unread news items.
  const drawUnseenBadge = (ctx, x, y) => {
    ctx.save();
    ctx.fillStyle = "#e8322b";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  // Scrollable info/help text (INFO_SECTIONS); content height is measured while drawing and cached in scroll.indholdH.
  menus.info = () => ({ titel: "Info", bredde: 704, hoejde: 448, tegn(painter, panel, win) {
      const scroll = win.top(), textX = panel.x + 48, textW = panel.w - 96, listY = panel.y + 44, listH = panel.h - 44 - 108;
      painter.rulleliste(scroll, textX, listY, textW, listH, scroll.indholdH || listH, (startY) => {
        let cursorY = startY;
        INFO_SECTIONS.forEach((section, sectionIndex) => {
          if (sectionIndex > 0) {
            cursorY += 18;
          }
          cursorY += painter.tekst(section.titel, textX, cursorY, { str: 24, op: true }) + 6;
          for (const paragraph of section.tekst) {
            cursorY += painter.tekst(paragraph, textX, cursorY, { str: 19, op: true, bredde: textW - 16 }) + 8;
          }
        });
        scroll.indholdH = cursorY - startY;
      });
      painter.tekstKnap(texts.fortsaet, panel.x + panel.w / 2 - 110, panel.y + panel.h - 88, 220, 60, () => win.luk());
    } });
  // Scrollable news list; opening it marks all news as seen.
  menus.nyheder = () => {
    markNewsSeen();
    return { titel: "Nyheder", bredde: 704, hoejde: 448, tegn(painter, panel, win) {
        const scroll = win.top(), textX = panel.x + 48, textW = panel.w - 96, listY = panel.y + 44, listH = panel.h - 44 - 108;
        painter.rulleliste(scroll, textX, listY, textW, listH, scroll.indholdH || listH, (startY) => {
          let cursorY = startY;
          NEWS.forEach((entry, entryIndex) => {
            if (entryIndex > 0) {
              cursorY += 18;
            }
            cursorY += painter.tekst(entry.dato, textX, cursorY, { str: 24, op: true }) + 6;
            for (const bullet of entry.punkter) {
              painter.tekst("-", textX + 4, cursorY, { str: 19, op: true });
              cursorY += painter.tekst(bullet, textX + 28, cursorY, { str: 19, op: true, bredde: textW - 28 - 16 }) + 6;
            }
          });
          scroll.indholdH = cursorY - startY;
        });
        painter.tekstKnap(texts.fortsaet, panel.x + panel.w / 2 - 110, panel.y + panel.h - 88, 220, 60, () => win.luk());
      } };
  };
  // Menus for features that are not available offline: show a notice only.
  const placeholderMenu = (title) => () => menus.besked(title, texts.forbindelse[1]);
  menus.topliste = placeholderMenu(texts.forbindelse[0]);
  menus.venner = placeholderMenu("Venner");
  menus.bedoemmelser = placeholderMenu("Bedømmelser");
  menus.kaeledyr = () => menus.besked(texts.kaeledyr[0], texts.kaeledyr[1]);
  // Celebrity (VIP) guests: grid of cards with payment, stay duration and a price tag; buying invites a VIP.
  menus.kendte = () => {
    game.hoved("kendte", { v0: 0 });
    return { titel: texts.kendte[0], tegn(painter, panel, win) {
        const celebrities = game.D.vip.film, columns = 4, cardW = 150, cardH = 270;
        painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 72, Math.ceil(celebrities.length / columns) * cardH, (startY) => {
          celebrities.forEach((film, tierIndex) => {
            const cardX = panel.x + 52 + tierIndex % columns * (cardW + 6), cardY = startY + Math.floor(tierIndex / columns) * cardH, tier = VIP_TIERS[tierIndex], staying = isVipStaying(game.s, tierIndex);
            if (painter.ramme("punkt", cardX, cardY, cardW, cardH - 8), drawFittedAnimation(painter, "hotel", film[0], cardX + 8, cardY + 8, cardW - 16, 150, staying ? 0.5 : 1), painter.sprite("ui", icons.moent, cardX + 30, cardY + 178, { skala: 0.6 }), painter.tekst(`+${tier.betaling}`, cardX + 50, cardY + 178, { str: 18 }), painter.sprite("ui", icons.timeglas, cardX + 30, cardY + 206, { skala: 0.6 }), painter.tekst(formatDuration(tier.tid / 1e3), cardX + 50, cardY + 206, { str: 18 }), staying) {
              painter.sprite("ui", icons.jaLille, cardX + cardW / 2, cardY + 238);
              return;
            }
            priceTag(painter, tier.pris, cardX + 14, cardY + 238, game.s.penge >= tier.pris);
            painter.knap({ x0: cardX, y0: cardY, x1: cardX + cardW, y1: cardY + cardH - 8 }, () => {
              if (game.s.vipVenter != null) {
                win.aabn(menus.besked(texts.kendte[0], texts.kendte[5]));
                return;
              }
              win.aabn(menus.dialog(texts.kendte[1], () => {
                const status = vipStatus(game.s, tierIndex);
                if (status === "penge") {
                  game.hoved("kendte", { v0: 2 });
                  game.vis(texts.kendte[3]);
                } else if (status === "plads") {
                  game.vis(texts.kendte[2]);
                } else if (status === "bor") {
                  game.vis(texts.kendte[6]);
                } else if (status === "venter") {
                  game.vis(texts.kendte[5]);
                } else {
                  game.hoved("kendtKommer", { v0: tierIndex, v1: 0 });
                  win.lukAlle();
                }
              }));
            });
          });
        });
      } };
  };
  // Settings: music toggle, info, remove top floor (only with more than 2 floors), reset game, volume slider.
  menus.indstillinger = () => ({ titel: texts.indstillinger[0], hoejde: 536, tegn(painter, panel, win) {
      const buttonX = panel.x + 152, buttonW = 400, buttonH = 60;
      let buttonY = panel.y + 64;
      painter.tekstKnap(game.s.musik === false ? texts.indstillinger[2] : texts.indstillinger[1], buttonX, buttonY, buttonW, buttonH, () => {
        game.s.musik = game.s.musik === false;
      });
      buttonY += 84;
      painter.tekstKnap(texts.indstillinger[7], buttonX, buttonY, buttonW, buttonH, () => win.aabn(menus.besked(texts.indstillinger[7], texts.indstillinger[8])));
      buttonY += 84;
      const canRemoveFloor = game.s.etager.length > 2;
      painter.tekstKnap(texts.indstillinger[5], buttonX, buttonY, buttonW, buttonH, () => win.aabn(menus.dialog(texts.indstillinger[6], () => {
        game.s.etager.pop();
        game.s.kam.y -= game.D.etage.hoejde;
      })), { aktiv: canRemoveFloor });
      buttonY += 84;
      painter.tekstKnap(texts.indstillinger[3], buttonX, buttonY, buttonW, buttonH, () => win.aabn(menus.dialog(texts.indstillinger[4], () => {
        win.lukAlle();
        game.nulstil();
      })));
      buttonY += 84;
      drawVolumeSlider(painter, buttonX, buttonY, buttonW);
    } });
  // Volume slider: draws the track and knob at (x, y) and lets the player drag it; volume snaps to 10 steps.
  const drawVolumeSlider = (painter, x, y, width) => {
    const ctx = painter.ctx, labelW = 150, trackX = x + labelW, trackW = width - labelW - 70, trackY = y + 30, steps = 10, volume = getVolume();
    painter.tekst("Lyd", x + 8, trackY, { str: 22 });
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.moveTo(trackX, trackY);
    ctx.lineTo(trackX + trackW, trackY);
    ctx.stroke();
    if (volume > 0) {
      ctx.strokeStyle = "#ffb92e";
      ctx.beginPath();
      ctx.moveTo(trackX, trackY);
      ctx.lineTo(trackX + trackW * volume, trackY);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#a3620f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(trackX + trackW * volume, trackY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    painter.tekst(`${Math.round(volume * 200)}%`, x + width, trackY, { str: 22, hoejre: true });
    painter.traek({ x0: trackX - 24, y0: trackY - 30, x1: trackX + trackW + 24, y1: trackY + 30 }, (pointer) => {
      setVolume(Math.round(Math.max(0, Math.min(1, (pointer.x - trackX) / trackW)) * steps) / steps);
    });
  }, isAchievementUnlocked = (index) => {
    const state = game.s, starCount = pointLevel(state.hentet).antal, floorsBuilt = state.etager.length - 1;
    return [starCount >= 1, starCount >= 5, starCount >= 10, floorsBuilt >= 2, floorsBuilt >= 11, floorsBuilt >= 20, false, false, state.hentet >= 1e3, state.hentet >= 5e3, state.hentet >= 5e4][index] || (state.bedrifter || []).includes(index);
  };
  // Achievements list; locked ones are greyed with a lock icon.
  menus.bedrifter = () => ({ titel: texts.bedrifter[0], tegn(painter, panel, win) {
      const achievementCount = (texts.bedrifter.length - 1) / 2, rowH = 76;
      painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 72, achievementCount * rowH, (startY) => {
        for (let index = 0; index < achievementCount; index++) {
          const rowY = startY + index * rowH, unlocked = isAchievementUnlocked(index);
          painter.ramme("punkt", panel.x + 40, rowY, panel.w - 92, rowH - 8);
          painter.sprite("ui", unlocked ? icons.pokaler[2] : icons.laas, panel.x + 84, rowY + 34, { alfa: unlocked ? 1 : 0.6, skala: 0.8 });
          painter.tekst(texts.bedrifter[1 + 2 * index], panel.x + 124, rowY + 22, { str: 22, farve: unlocked ? "#ffe36b" : "#fff" });
          painter.tekst(texts.bedrifter[2 + 2 * index], panel.x + 124, rowY + 48, { str: 17, vaegt: 700 });
        }
      });
    } });
  // Ruby shop (display only; purchases are not available).
  menus.rubiner = () => ({ titel: texts.rubinButik[0], tegn(painter, panel, win) {
      const packs = icons.rubinPakker, columns = 4, cardW = 150, cardH = 150, rows = Math.ceil(packs.length / columns);
      painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 72, rows * cardH, (startY) => {
        packs.forEach((packIcon, index) => {
          const cardX = panel.x + 52 + index % columns * (cardW + 6), cardY = startY + Math.floor(index / columns) * cardH;
          painter.ramme("punkt", cardX, cardY, cardW, cardH - 8);
          painter.spriteIKasse("ui", packIcon, cardX + 8, cardY + 6, cardW - 16, cardH - 50);
          painter.tekst(texts.rubinPakker[index], cardX + cardW / 2, cardY + cardH - 28, { str: 16, midt: true });
          painter.knap({ x0: cardX, y0: cardY, x1: cardX + cardW, y1: cardY + cardH - 8 }, () => win.aabn(menus.besked(texts.rubinButik[0], `${texts.rubinButik[4]}.`)));
        });
      });
    } });
  menus.post = () => menus.besked(texts.post[0], texts.post[1]);
  // Safe: type a secret code on the keyboard (see vault-codes.js) to receive solkroner once.
  menus.pengeskab = () => {
    const vaultTexts = texts.pengeskab;
    let typedCode = "";
    const submitCode = (win) => {
      const reward = redeemVaultCode(game.s, typedCode);
      if (typedCode = "", !reward) {
        win.aabn(menus.besked(vaultTexts[0], vaultTexts[3]));
        return;
      }
      win.aabn(menus.besked(vaultTexts[0], `${vaultTexts[4]}${reward.solkroner}${vaultTexts[6]}${reward.fra}. ${vaultTexts[7]}`));
    };
    return { titel: vaultTexts[0], tegn(painter, panel, win) {
        painter.tekst(vaultTexts[1], panel.x + 80 + 272, panel.y + 64 + 92, { str: 24, midt: true, bredde: 544 });
        painter.ramme("punkt", panel.x + 80, panel.y + 324, 544, 48);
        const cursor = Math.floor(performance.now() / 500) % 2 ? "_" : " ";
        painter.tekst(typedCode + cursor, panel.x + 80 + 272, panel.y + 324 + 24, { str: 24, midt: true });
        painter.knap({ x0: panel.x + 80, y0: panel.y + 324, x1: panel.x + 624, y1: panel.y + 372 }, () => game.tastatur && game.tastatur());
        painter.sprite("ui", 4439, panel.x + 748, panel.y + 224);
        painter.spriteKnap(icons.laas, panel.x + panel.w, panel.y + panel.h, () => submitCode(win));
      }, tast(key, win) {
        if (key === "Backspace") {
          typedCode = typedCode.slice(0, -1);
          return true;
        }
        if (key === "Enter") {
          submitCode(win);
          return true;
        }
        if (key.length === 1 && typedCode.length < 24) {
          typedCode += key;
          return true;
        }
        return false;
      } };
  };
  // Achievement reward notice; plays the coin sound when money was awarded.
  menus.praemie = ({ i: achievementIndex, beloeb: amount }) => {
    const praemieTexts = game.s.kd.tekster.praemie;
    return menus.besked(praemieTexts[0], `${praemieTexts[1]}${praemieTexts[2 + achievementIndex]}
+${amount} solkroner`, () => {
      if (amount >= 1) {
        game.s.lyde.push(COIN_SOUND_ID);
      }
    });
  };
  // Exit confirmation: stay or leave to the map.
  menus.udgang = () => ({ bredde: 576, hoejde: 288, luk: false, tegn(painter, panel, win) {
      painter.tekstKnap(texts.bliv, panel.x + 88, panel.y + 60, 400, 64, () => win.luk());
      painter.tekstKnap(texts.forlad, panel.x + 88, panel.y + 150, 400, 64, () => {
        win.luk();
        game.tilKort();
      });
    } });
  // Welcome guide shown the first time; closing it starts the intro script once (game.s.budt = already shown).
  menus.guide = () => ({ titel: texts.guide, bredde: 704, hoejde: 448, tegn(painter, panel, win) {
      painter.tekst(texts.hjaelp, panel.x + 48, panel.y + 56, { bredde: panel.w - 96, str: 21, op: true, vaegt: 700 });
      painter.tekstKnap(texts.fortsaet, panel.x + panel.w / 2 - 110, panel.y + panel.h - 88, 220, 60, () => {
        win.luk();
        if (!game.s.budt) {
          game.s.budt = true;
          game.hoved("velkomst");
        }
      });
    } });
  // Floor shop: buy a new floor of each buildable type (pet shop floors open the pet shop instead).
  menus.etagebutik = () => ({ titel: texts.etager[0], tegn(painter, panel, win) {
      const buildable = game.D.kanBygges, rowH = 96, basePrice = newFloorPrice(game.s.etager.length);
      painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 72, buildable.length * rowH, (startY) => {
        buildable.forEach((floorType, index) => {
          const rowY = startY + index * rowH, cost = basePrice + FLOOR_TYPES[floorType].pris, affordable = game.s.penge >= cost;
          painter.ramme("punkt", panel.x + 40, rowY, panel.w - 92, rowH - 8);
          painter.spriteIKasse("hotel", game.D.moduler[floorType].sprite, panel.x + 52, rowY + 8, 170, rowH - 24);
          painter.tekst(game.D.moduler[floorType].navn, panel.x + 240, rowY + 28, { str: 22 });
          if (floorType !== PET_FLOOR_TYPE) {
            painter.tekst(`${FLOOR_TYPES[floorType].leje} kr. pr. gæst`, panel.x + 240, rowY + 58, { str: 17, vaegt: 700 });
          }
          priceTag(painter, cost, panel.x + panel.w - 190, rowY + rowH / 2 - 4, affordable);
          painter.knap({ x0: panel.x + 40, y0: rowY, x1: panel.x + panel.w - 52, y1: rowY + rowH - 8 }, () => {
            if (!affordable) {
              game.vis("Du har ikke nok solkroner.");
              return;
            }
            if (floorType === PET_FLOOR_TYPE) {
              win.aabn(menus.dyrehandel());
              return;
            }
            win.aabn(menus.dialog(texts.etager[1], () => {
              buyFloor(game.s, floorType);
              win.lukAlle();
              if (floorType === CAFE_FLOOR_TYPE && game.vejledning) {
                game.vejledning(0);
              }
            }));
          });
        });
      });
    } });
  // Pet shop: choose which pet to buy (builds a pet floor).
  menus.dyrehandel = () => {
    game.hoved("dyrehandel");
    const petTexts = game.s.kd.tekster.dyrehandel;
    return { titel: petTexts[0], tegn(painter, panel, win) {
        if (!game.kaeledyr()) {
          painter.tekst("Vent...", panel.x + panel.w / 2, panel.y + panel.h / 2, { str: 24, midt: true });
          return;
        }
        const pets = game.s.kd.dyr.film, columns = 4, cardW = 150, cardH = 220;
        painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 72, Math.ceil(pets.length / columns) * cardH, (startY) => {
          pets.forEach((pet, index) => {
            const cardX = panel.x + 52 + index % columns * (cardW + 6), cardY = startY + Math.floor(index / columns) * cardH, price = petFloorCost(game.s, index);
            painter.ramme("punkt", cardX, cardY, cardW, cardH - 8);
            drawFittedAnimation(painter, "kaeledyr", pet.film[0], cardX + 8, cardY + 8, cardW - 16, cardH - 60);
            priceTag(painter, price, cardX + 14, cardY + cardH - 34, game.s.penge >= price);
            painter.knap({ x0: cardX, y0: cardY, x1: cardX + cardW, y1: cardY + cardH - 8 }, () => win.aabn(menus.dialog(petTexts[1], () => {
              if (!buyPetFloor(game.s, index)) {
                game.vis("Du har ikke nok solkroner.");
                return;
              }
              game.hoved("nytDyr");
              win.lukAlle();
            })));
          });
        });
      } };
  };
  // Pet stall shop (food / bath / toys by stallType): items unlock by star level; buying delivers them to the pet.
  menus.bod = (floor, stallType) => {
    const shopTexts = game.s.kd.tekster.butik;
    return { titel: shopTexts[1 + stallType], tegn(painter, panel, win) {
        const items = game.s.kd.forbrug.film[stallType], starLevel = pointLevel(game.s.hentet).antal, columns = 5, cardW = 118, cardH = 170;
        painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 72, Math.ceil(items.length / columns) * cardH, (startY) => {
          items.forEach((itemFilm, itemIndex) => {
            const cardX = panel.x + 46 + itemIndex % columns * (cardW + 5), cardY = startY + Math.floor(itemIndex / columns) * cardH, stats = petItemStats(stallType, itemIndex), locked = starLevel < stats.stjerner;
            painter.ramme("punkt", cardX, cardY, cardW, cardH - 8);
            drawFittedAnimation(painter, "kaeledyr", itemFilm, cardX + 8, cardY + 6, cardW - 16, 70, locked ? 0.5 : 1);
            painter.tekst(`+${stats.kvalitet}`, cardX + 12, cardY + 92, { str: 16 });
            painter.sprite("ui", icons.timeglas, cardX + cardW / 2 + 4, cardY + 92, { skala: 0.5 });
            painter.tekst(formatDuration(stats.levetid / 1e3), cardX + cardW / 2 + 18, cardY + 92, { str: 14 });
            if (locked) {
              painter.sprite("ui", icons.laas, cardX + cardW / 2 - 14, cardY + cardH - 34, { skala: 0.6 });
              painter.sprite("ui", icons.stjerne, cardX + cardW / 2 + 14, cardY + cardH - 34, { skala: 0.5 });
              painter.tekst(String(stats.stjerner), cardX + cardW / 2 + 28, cardY + cardH - 34, { str: 16 });
            } else {
              priceTag(painter, stats.pris, cardX + 8, cardY + cardH - 34, game.s.penge >= stats.pris);
            }
            painter.knap({ x0: cardX, y0: cardY, x1: cardX + cardW, y1: cardY + cardH - 8 }, () => {
              if (locked) {
                win.aabn(menus.besked(shopTexts[1 + stallType], shopTexts[5]));
                return;
              }
              win.aabn(menus.dialog(shopTexts[4], () => {
                const purchase = buyPetItem(game.s, floor, stallType, itemIndex);
                if (!purchase) {
                  game.vis("Du har ikke nok solkroner.");
                  return;
                }
                game.hoved(purchase.script, purchase.v0 != null ? { v0: purchase.v0 } : void 0);
                win.lukAlle();
              }));
            });
          });
        });
      } };
  };
  // Furniture inventory for one furniture slot: pick a feature/variant to buy; delivery takes DELIVERY_TIME_MS.
  menus.inventar = (furniture) => ({
    titel: `${texts.inventar[0]}: ${FURNITURE_TYPE_NAMES[furniture.type] || furniture.type}`,
    tegn(painter, panel, win) {
      const films = game.MB.kat[furniture.type].film, columns = 5, cardW = 118, cardH = 132;
      painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 72, Math.ceil(films.length / columns) * cardH, (startY) => {
        films.forEach((film, featureIndex) => {
          const cardX = panel.x + 46 + featureIndex % columns * (cardW + 5), cardY = startY + Math.floor(featureIndex / columns) * cardH, isCurrent = featureIndex === furniture.feature, affordable = game.s.penge >= featurePrice(featureIndex);
          painter.ramme("punkt", cardX, cardY, cardW, cardH - 8);
          drawFittedAnimation(painter, "moebler", film, cardX + 8, cardY + 6, cardW - 16, cardH - 46);
          if (isCurrent) {
            painter.sprite("ui", icons.jaLille, cardX + cardW - 20, cardY + 18);
          } else {
            priceTag(painter, featurePrice(featureIndex), cardX + 8, cardY + cardH - 26, affordable);
          }
          if (!isCurrent) {
            painter.knap({ x0: cardX, y0: cardY, x1: cardX + cardW, y1: cardY + cardH - 8 }, () => {
              if (!affordable) {
                game.vis("Du har ikke nok solkroner.");
                return;
              }
              win.aabn(menus.dialog(`${texts.inventar[1]}
${texts.leveres[1]}${DELIVERY_TIME_MS / 1e3} sekunder.`, () => {
                buyFurnitureFeature(game.s, furniture, featureIndex);
                game.hoved("moebelLeveres", { v0: 0 });
                win.lukAlle();
              }));
            });
          }
        });
      });
    }
  });
  // Cafe (restaurant) static data shortcut.
  const getCafeData = () => game.CF.C, drawKitchenFooter = (painter, cafe, panel) => {
    const level = kitchenLevel(cafe.tjent);
    painter.sprite("ui", icons.kokkehue, panel.x + 60, panel.y + panel.h - 36, { skala: 0.6 });
    painter.tekst(`${level} · tjent ${Math.round(cafe.tjent)} kr.`, panel.x + 84, panel.y + panel.h - 36, { str: 18, vaegt: 700 });
  };
  // Dish menu for a cafe stove: start cooking a dish (locked behind kitchen level = chef hats).
  menus.mad = (cafe, stoveIndex) => ({ titel: getCafeData().tekster.mad, tegn(painter, panel, win) {
      const level = kitchenLevel(cafe.tjent);
      painter.rulleliste(win.top(), panel.x + 40, panel.y + 40, panel.w - 80, panel.h - 96, getCafeData().mad.salg.length * 84, (startY) => {
        getCafeData().mad.salg.forEach((dishFilm, dishIndex) => {
          const rowY = startY + dishIndex * 84, dish = dishInfo(dishIndex), locked = dish.huer > level, canBuy = !locked && game.s.penge >= dish.pris;
          painter.ramme("punkt", panel.x + 40, rowY, panel.w - 92, 76);
          drawFittedAnimation(painter, "cafe", dishFilm, panel.x + 50, rowY + 4, 90, 68, locked ? 0.4 : 1);
          painter.tekst(dish.navn, panel.x + 150, rowY + 24, { str: 22, farve: locked ? "#bbb" : "#fff" });
          painter.tekst(locked ? `Låst: ${dish.huer} kokkehuer` : `${dish.portioner} × ${dish.prisPrPortion} kr. · ${dish.tid / 1e3} s`, panel.x + 150, rowY + 52, { str: 17, vaegt: 700 });
          if (locked) {
            painter.sprite("ui", icons.laas, panel.x + panel.w - 110, rowY + 84 / 2 - 4, { skala: 0.6 });
          } else {
            priceTag(painter, dish.pris, panel.x + panel.w - 180, rowY + 84 / 2 - 4, canBuy);
          }
          painter.knap({ x0: panel.x + 40, y0: rowY, x1: panel.x + panel.w - 52, y1: rowY + 84 - 8 }, () => {
            if (locked) {
              game.vis(getCafeData().tekster.laast);
              return;
            }
            if (!canBuy) {
              game.vis(texts.mad[2]);
              return;
            }
            win.aabn(menus.dialog(texts.mad[1], () => {
              startDish(game.s, cafe, stoveIndex, dishIndex);
              win.lukAlle();
            }));
          });
        });
      });
      drawKitchenFooter(painter, cafe, panel);
    } });
  // Buy-another-stove confirmation.
  menus.nytKomfur = (cafe) => {
    const stoveCount = cafe.komfurer.length;
    return menus.dialog(`${getCafeData().tekster.komfurer}: ${stovePrice(stoveCount)} kr.

Vil du købe dette komfur?`, () => {
      if (stoveCount >= maxStovesForLevel(kitchenLevel(cafe.tjent))) {
        game.vis(getCafeData().tekster.vejledning[9]);
      } else if (buyStove(game.s, cafe)) {
        game.hoved("komfur", { v0: 2, v1: 1 });
      } else {
        game.vis("Du har ikke nok solkroner.");
      }
    }, { titel: getCafeData().tekster.komfurer });
  };
  // Table upgrades: bigger tables seat more plates and need a higher kitchen level.
  menus.bord = (cafe) => ({ titel: getCafeData().tekster.borde, tegn(painter, panel, win) {
      const films = getCafeData().bord.film, level = kitchenLevel(cafe.tjent), cardW = 150, cardH = 160;
      films.forEach((film, tableIndex) => {
        const cardX = panel.x + 48 + tableIndex % 4 * (cardW + 6), cardY = panel.y + 44 + Math.floor(tableIndex / 4) * (cardH + 6), owned = tableIndex <= cafe.bord, locked = tableIndex > maxTableForLevel(level);
        painter.ramme("punkt", cardX, cardY, cardW, cardH);
        drawFittedAnimation(painter, "cafe", film, cardX + 8, cardY + 8, cardW - 16, cardH - 60, locked ? 0.4 : 1);
        painter.tekst(`${getCafeData().bord.pladser[tableIndex]} tallerkener`, cardX + cardW / 2, cardY + cardH - 40, { str: 16, midt: true, vaegt: 700 });
        if (tableIndex === cafe.bord) {
          painter.sprite("ui", icons.jaLille, cardX + cardW / 2, cardY + cardH - 16);
        } else if (locked) {
          painter.tekst(`${tableIndex} kokkehuer`, cardX + cardW / 2, cardY + cardH - 16, { str: 16, midt: true, farve: "#bbb" });
        } else if (!owned) {
          priceTag(painter, tablePrice(tableIndex), cardX + 34, cardY + cardH - 16, game.s.penge >= tablePrice(tableIndex));
        }
        if (!owned && !locked) {
          painter.knap({ x0: cardX, y0: cardY, x1: cardX + cardW, y1: cardY + cardH }, () => win.aabn(menus.dialog("Vil du købe dette bord?", () => {
            if (upgradeTable(getCafeData(), game.s, cafe, tableIndex)) {
              game.hoved("bord", { v0: 2 });
              win.lukAlle();
            } else {
              game.vis("Du har ikke nok solkroner.");
            }
          })));
        }
      });
      drawKitchenFooter(painter, cafe, panel);
    } });
  // Hire a (celebrity) cook who periodically produces income.
  menus.kokke = (cafe) => ({ titel: getCafeData().tekster.kokke, tegn(painter, panel, win) {
      getCafeData().kok.film.forEach((cookFilm, cookIndex) => {
        const cardX = panel.x + 52 + cookIndex * 124, cardY = panel.y + 60;
        painter.ramme("punkt", cardX, cardY, 118, 300);
        drawFittedAnimation(painter, "cafe", cookFilm[0], cardX + 6, cardY + 8, 106, 220);
        painter.tekst(COOK_NAMES[cookIndex], cardX + 118 / 2, cardY + 248, { str: 16, midt: true });
        if (cookIndex === cafe.kok) {
          painter.sprite("ui", icons.jaLille, cardX + 118 / 2, cardY + 278);
        } else {
          priceTag(painter, COOK_PRICES[cookIndex], cardX + 14, cardY + 278, game.s.penge >= COOK_PRICES[cookIndex]);
        }
        if (cookIndex !== cafe.kok) {
          painter.knap({ x0: cardX, y0: cardY, x1: cardX + 118, y1: cardY + 300 }, () => win.aabn(menus.dialog("Vil du invitere denne kok?", () => {
            if (hireCook(game.s, cafe, cookIndex)) {
              game.hoved("kok", { v0: cookIndex });
              win.lukAlle();
            } else {
              game.vis("Du har ikke nok solkroner til at invitere den kendte kok.");
            }
          })));
        }
      });
    } });
  return menus;
}

export { createMenus };
export { createFittedAnimationDrawer, drawPriceTag, createDialogs };
