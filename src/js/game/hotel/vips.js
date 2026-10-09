// VIP guests: inviting a VIP and restoring VIPs that were staying when the game was saved.
import { ELEVATOR_X } from '../furniture-and-kitchen.js';
import { VIP_TIERS } from './constants.js';
import { allGuests, freeRooms, floorCapacity, guestsHeadingToFloor, spawnGuest, admitGuest } from './guests.js';

// True while the VIP of this tier is in the hotel.
export const isVipStaying = (hotel, tier) => allGuests(hotel).some((guest) => guest.vip === tier);

// Tries to invite the VIP of `tier`. Returns a failure reason string: "bor" (already staying),
// "venter" (another VIP is already on the way), "penge" (not enough money), "plads"
// (no free room); or true on success, after paying and queueing the VIP for spawning.
export function vipStatus(hotel, tier) {
  return isVipStaying(hotel, tier) ? "bor" : hotel.vipVenter != null ? "venter" : hotel.penge < VIP_TIERS[tier].pris ? "penge" : freeRooms(hotel) < 1 ? "plads" : (hotel.penge -= VIP_TIERS[tier].pris, hotel.vipVenter = tier, hotel.gaestTid = 0, true);
}

// Re-creates VIPs recorded in a save (hotel.kendteGemt): each one skips the street walk,
// appears directly at the lobby elevator and is admitted to its saved floor with its
// remaining stay time. Entries for tiers already present or floors without room are dropped.
export function restoreSavedVips(hotel) {
  const saved = hotel.kendteGemt;
  hotel.kendteGemt = null;
  for (const entry of saved) {
    if (entry.vip == null || !VIP_TIERS[entry.vip] || isVipStaying(hotel, entry.vip)) {
      continue;
    }
    const floor = hotel.etager[entry.etage];
    if (!floor || floorCapacity(hotel, floor) <= guestsHeadingToFloor(hotel, entry.etage)) {
      continue;
    }
    const guest = spawnGuest(hotel, 0, entry.vip);
    guest.til = entry.etage;
    guest.x = ELEVATOR_X;
    guest.alfa.saet(255);
    admitGuest(hotel, hotel.etager[0], 0, guest);
    if (guest.fase === "ophold") {
      guest.opholdTid = Math.max(0, entry.rest ?? guest.opholdTid);
    }
  }
}
