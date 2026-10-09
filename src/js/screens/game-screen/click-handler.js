// Click handling for the hotel scene: decides what a click/tap on the canvas hits and what happens then.
import { hotelHeight, floorTopEdgeY as floorCeilingY, collectGuestPayment, greetGuest as revealVipStayTimer } from '../../game/hotel.js';
import { stoveAction, collectCookIncome } from '../../game/furniture-and-kitchen.js';
import { collectPetReward } from '../../game/pets.js';
import { openGift } from '../../game/gifts.js';
import { hitMenuButton } from './menu-sign.js';

/**
 * Builds the click handler of the game screen.
 * `refs` are the `{ current }` refs / data owned by GameScreen: gameData, hotelRef (live hotel), sessionRef (UI objects),
 * hudButtonsRef, the per-frame hit-region lists (gift/pet/guest/furniture/petStall), cookCoinPosRef,
 * giftSoundRef and coinPopupsRef.
 * @returns {(point: {x: number, y: number}) => void} handler taking canvas coordinates
 */
export function createClickHandler({ gameData, hotelRef, sessionRef, hudButtonsRef, giftHitsRef, giftSoundRef, petHitsRef, guestHitsRef, furnitureHitsRef, petStallHitsRef, cookCoinPosRef, coinPopupsRef }) {
  // A click/tap (pointer released without dragging) at `point` in canvas coordinates. Checked in priority order:
  // open windows, the house sign, the map, HUD buttons, mailbox, gifts, pets, guests, furniture/cafe objects,
  // pet stalls and finally the hotel module itself (type 7 furniture).
  const handleClick = (point) => {
    const hotelState = hotelRef.current;
    const world = gameData.verden;
    const { kit: uiKit, menuer: windows, M: menus, kort: mapScreen, scene: scene } = sessionRef.current;
    if (windows.klik(uiKit, point)) {
      return;
    }
    if (!windows.aaben && hitMenuButton(point)) {
      windows.aabn(menus.hovedmenu());
      return;
    }
    // On the world map only the ruby (gem) button is handled here; the map handles level clicks itself.
    if (scene.navn === "kort") {
      const mapClick = mapScreen.klik(point);
      if (mapClick && mapClick.art === "rubiner") {
        windows.aabn(menus.rubiner());
      }
      return;
    }
    // HUD buttons (topmost last, hence the reverse search).
    const hudButton = [...hudButtonsRef.current].reverse().find((button) => point.x >= button.x0 && point.x <= button.x1 && point.y >= button.y0 && point.y <= button.y1);
    if (hudButton) {
      const screenHeight = world.skaerm.hoejde;
      if (hudButton.navn === "tilToppen") {
        hotelState.kamMaal = 0;
      } else if (hudButton.navn === "tilLobbyen") {
        hotelState.kamMaal = hotelHeight(hotelState) - screenHeight;
      } else if (hudButton.navn === "menu") {
        windows.aabn(menus.hovedmenu());
      } else if (hudButton.navn === "plus" || hudButton.navn === "rubin") {
        windows.aabn(menus.rubiner());
      } else if (hudButton.navn === "post") {
        sessionRef.current.aabnPost();
      } else if (hudButton.navn === "zoo") {
        sessionRef.current.startMinispil(11); // the zoo button starts minigame 11
      } else if (hudButton.navn === "udgang") {
        windows.aabn(menus.udgang());
      }
      return;
    }
    // Mailbox next to the lobby: hit test against its sprite rectangle, padded by 25 px.
    {
      const mailbox = world.postkasse;
      const mailboxSprite = gameData.manifest.sprites[mailbox.billede];
      const boxX = world.etage.x + Math.trunc(world.etage.bredde * mailbox.x) - Math.round(hotelState.kam.x);
      const boxY = floorCeilingY(hotelState, 0) + Math.trunc(world.etage.hoejde * mailbox.y) - Math.round(hotelState.kam.y);
      if (mailboxSprite && point.x + 25 >= boxX - mailboxSprite.ox && point.x - 25 <= boxX - mailboxSprite.ox + mailboxSprite.w && point.y + 25 >= boxY - mailboxSprite.oy && point.y - 25 <= boxY - mailboxSprite.oy + mailboxSprite.h) {
        sessionRef.current.aabnPost();
        return;
      }
    }
    const addCoinPopup = (amount, x, y) => coinPopupsRef.current.tilfoej(amount, x, y);
    // Gift boxes: opening one pays out coins.
    const giftHit = giftHitsRef.current.find((hit) => point.x >= hit.felt.x0 && point.x <= hit.felt.x1 && point.y >= hit.felt.y0 && point.y <= hit.felt.y1);
    if (giftHit) {
      const amount = openGift(hotelState, giftHit.g);
      if (amount > 0) {
        giftSoundRef.current.spil(world.lyde.gave);
        addCoinPopup(amount, giftHit.mx, giftHit.my);
      }
      return;
    }
    const containsPoint = (hit) => point.x >= hit.felt.x0 && point.x <= hit.felt.x1 && point.y >= hit.felt.y0 && point.y <= hit.felt.y1;
    // Pets: collect the coin reward they are holding (and announce a new trophy).
    const petHit = petHitsRef.current.find(containsPoint);
    if (petHit) {
      const amount = collectPetReward(hotelState, hotelState.etager[petHit.nr]);
      if (amount > 0) {
        addCoinPopup(amount, petHit.mx, petHit.my);
      }
      if (hotelState.nyPokal) {
        hotelState.nyPokal = false;
        sessionRef.current.hoveder.haendelse("pokal");
      }
      return;
    }
    // Guests: a guest who has paid (klar) gives coins; otherwise clicking a VIP guest reveals their stay timer.
    const guestHit = [...guestHitsRef.current].reverse().find((hit) => point.x >= hit.felt.x0 && point.x <= hit.felt.x1 && point.y >= hit.felt.y0 && point.y <= hit.felt.y1);
    if (guestHit) {
      const floor = hotelState.etager[guestHit.nr];
      if (guestHit.g.klar) {
        const payment = collectGuestPayment(hotelState, floor, guestHit.g);
        if (payment > 0) {
          addCoinPopup(payment, guestHit.mx, guestHit.my);
        }
      } else if (revealVipStayTimer(hotelState, floor, guestHit.g)) {
        sessionRef.current.hoveder.haendelse("gaest", { v0: guestHit.g.vip });
      }
      return;
    }
    // Furniture and cafe objects. Type 7 furniture (see the end of this function) is excluded here so that
    // clicking anywhere on the hotel module reaches it. Entries with `art` are special cafe objects.
    const furnitureHit = [...furnitureHitsRef.current].reverse().find((hit) => (hit.art || hotelState.etager[hit.nr].moebler[hit.idx].type !== 7) && point.x >= hit.x0 && point.x <= hit.x1 && point.y >= hit.y0 && point.y <= hit.y1);
    if (furnitureHit && furnitureHit.art === "ramme") {
      sessionRef.current.hoveder.haendelse("etageramme");
      windows.aabn(menus.etagebutik());
      return;
    }
    if (furnitureHit && furnitureHit.art) {
      const cafe = hotelState.etager[furnitureHit.nr].cafe;
      if (furnitureHit.art === "mad" || furnitureHit.art === "komfur" && cafe.komfurer[furnitureHit.i].mad) {
        // Clicking a dish / occupied stove: let the heads comment depending on the stove action result and dish state.
        const food = cafe.komfurer[furnitureHit.i].mad;
        const foodState = food ? food.tilstand : -1;
        const action = stoveAction(hotelState.C, cafe, furnitureHit.i);
        if (action === "fuldt") {
          sessionRef.current.hoveder.haendelse("mad", { v0: 5 });
        } else if (action === "ok" && foodState === 1) {
          sessionRef.current.hoveder.haendelse("mad", { v0: 2 });
        } else if (action === "ok" && foodState === 3) {
          sessionRef.current.hoveder.haendelse("mad", { v0: 4 });
        }
        return;
      }
      if (furnitureHit.art === "komfur") {
        windows.aabn(menus.mad(cafe, furnitureHit.i));
      } else if (furnitureHit.art === "nytKomfur") {
        windows.aabn(menus.nytKomfur(cafe));
      } else if (furnitureHit.art === "bord") {
        windows.aabn(menus.bord(cafe));
      } else if (furnitureHit.art === "kok") {
        // The cook: collect accumulated income (coin popup at the cafe coin) or, if nothing to collect, open the kitchen menu.
        const income = collectCookIncome(hotelState, cafe);
        const coinPos = cookCoinPosRef.current[furnitureHit.nr];
        if (income > 0) {
          if (coinPos) {
            addCoinPopup(income, coinPos.x, coinPos.y);
          }
        } else {
          windows.aabn(menus.kokke(cafe));
        }
      }
      return;
    }
    // Type 15 is the safe.
    if (furnitureHit && hotelState.etager[furnitureHit.nr].moebler[furnitureHit.idx].type === 15) {
      sessionRef.current.hoveder.haendelse("pengeskab");
      windows.aabn(menus.pengeskab());
      return;
    }
    if (furnitureHit) {
      windows.aabn(menus.inventar(hotelState.etager[furnitureHit.nr].moebler[furnitureHit.idx]));
      return;
    }
    // Pet stalls open their shop window.
    const stallHit = petStallHitsRef.current.find(containsPoint);
    if (stallHit) {
      windows.aabn(menus.bod(hotelState.etager[stallHit.nr], stallHit.i));
      return;
    }
    // Finally: a click anywhere inside a finished floor opens that floor's type 7 furniture (if any).
    const camY = Math.round(hotelState.kam.y);
    const camX = Math.round(hotelState.kam.x);
    const floorIndex = hotelState.etager.findIndex((floor, index) => {
      const floorTop = floorCeilingY(hotelState, index) - camY;
      const moduleWidth = gameData.manifest.sprites[world.moduler[world.start[1]].sprite].w;
      return floor.status === "faerdig" && point.y >= floorTop && point.y <= floorTop + world.etage.hoejde && point.x >= world.etage.x - camX && point.x <= world.etage.x - camX + moduleWidth;
    });
    const type7Item = floorIndex >= 0 ? hotelState.etager[floorIndex].moebler.find((item) => item.type === 7) : null;
    if (type7Item) {
      windows.aabn(menus.inventar(type7Item));
    }
  };
  return handleClick;
}
