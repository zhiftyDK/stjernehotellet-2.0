// Floors: hotel creation, floor geometry and buying new floors (normal and pet floors).
import { PET_PRICES, PET_FLOOR_TYPE, createPetEntry } from '../pets.js';
import { createFloorFurniture, createRestaurant } from '../furniture-and-kitchen.js';
import { FLOOR_TYPES, newFloorPrice, BUILD_TIME_MS, CAFE_FLOOR_TYPE } from './constants.js';

// Price of a pet (0 for unknown pet types).
export const petPrice = (petType) => PET_PRICES[petType] || 0;

// Creates one floor. status "bygger" = under construction, "faerdig" = finished.
// Cafe floors also get a restaurant (kitchen/stoves/tables) object.
export const createFloor = (floorType, status) => ({
  type: floorType,
  status: status,
  byggeTid: status === "bygger" ? BUILD_TIME_MS : 0,
  gaester: [],
  moebler: createFloorFurniture(floorType),
  ...floorType === CAFE_FLOOR_TYPE ? { cafe: createRestaurant() } : {},
});

// Creates the initial hotel state: starting money 500, the starting floors from the
// game data, camera at origin, and counters for time/guests/earnings.
export function createHotel(data, furnitureCatalog, kitchenConfig) {
  return { data: data, kat: furnitureCatalog, C: kitchenConfig, penge: 500, tid: 0, rest: 0, etager: data.start.map((floorType) => createFloor(floorType, "faerdig")), kam: { x: 0, y: 0 }, hentet: 0, gaestTid: 0, lyde: [] };
}

// Total hotel height in pixels, including the reserved extra floors above.
export const hotelHeight = (hotel) => (hotel.etager.length + hotel.data.ekstraEtager) * hotel.data.etage.hoejde;

// Y coordinate of the floor line (bottom edge) of the 1-based floorNumber.
export const floorTopY = (hotel, floorNumber) => hotelHeight(hotel) - hotel.data.etage.foersteY - (floorNumber - 1) * hotel.data.etage.hoejde;

// Y coordinate of the top edge of the floor (one floor height above the floor line).
export const floorTopEdgeY = (hotel, floorNumber) => floorTopY(hotel, floorNumber) - hotel.data.etage.hoejde;

// Sprite for a floor: the construction-site sprite while building, otherwise its module sprite.
export const floorSprite = (hotel, floor) => hotel.data.moduler[floor.status === "bygger" ? hotel.data.byggeplads : floor.type].sprite;

// Buys a new floor of floorType if the player can afford it. The camera is moved up
// by one floor so the view stays put. Returns true on success.
export function buyFloor(hotel, floorType) {
  const floorSpec = FLOOR_TYPES[floorType];
  if (!floorSpec) {
    return false;
  }
  const cost = newFloorPrice(hotel.etager.length) + floorSpec.pris;
  if (hotel.penge < cost) {
    return false;
  }
  hotel.penge -= cost;
  hotel.etager.push(createFloor(floorType, "bygger"));
  hotel.kam.y += hotel.data.etage.hoejde;
  return true;
}

// Total cost of a pet floor holding the given pet type: floor price + floor type + the pet.
export const petFloorCost = (hotel, petType) => newFloorPrice(hotel.etager.length) + FLOOR_TYPES[PET_FLOOR_TYPE].pris + petPrice(petType);

// Buys a pet floor (needs the pet data hotel.kd). Returns true on success.
export function buyPetFloor(hotel, petType) {
  const cost = petFloorCost(hotel, petType);
  if (!hotel.kd || hotel.penge < cost) {
    return false;
  }
  hotel.penge -= cost;
  const floor = createFloor(PET_FLOOR_TYPE, "bygger");
  floor.kaeledyr = createPetEntry(hotel, petType);
  hotel.etager.push(floor);
  hotel.kam.y += hotel.data.etage.hoejde;
  return true;
}
