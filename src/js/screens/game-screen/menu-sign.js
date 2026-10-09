// The home-menu sign (a house sign) is drawn by the HUD in the top-right corner of the canvas, in the hotel,
// on the map and over running minigames. The render loop stores its screen rectangle here every frame
// (`menuSign.region = { x0, y0, x1, y1 }`, or null) so that clicks can be tested against it.
export const menuSign = { region: null };

/** True when `point` (canvas coordinates) is on the home-menu sign. */
export const hitMenuButton = (point) => !!menuSign.region && point.x >= menuSign.region.x0 && point.x <= menuSign.region.x1 && point.y >= menuSign.region.y0 && point.y <= menuSign.region.y1;
