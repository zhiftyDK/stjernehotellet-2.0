# Stjernehotellet – no build step

Plain HTML + CSS + native ES modules. Edit a file, refresh the browser. No npm, no Vite.

## Run
1. Copy `data/` and `profil/` from your original build folder into this folder (next to `index.html`).
2. Serve the folder with any static web server (browsers block ES modules on `file://`), e.g.:

       python3 -m http.server 8000      # then open http://localhost:8000
   or `npx serve`, or VS Code "Live Server".

## Layout
- `index.html` – page + import map (maps `react` to `vendor/react.js`).
- `css/index.css`, `custom.css` – styles.
- `js/main.js` – entry point. `js/ui`, `js/screens`, `js/game`, `js/engine`, `js/render`, `js/audio`, `js/minigames` – the game.
- `vendor/react.js` – React 18.3.1 + ReactDOM as one file (third-party, don't edit).

## Notes
- The code is de-minified but local variables are still short (`e`, `t`, `n`), and there are no comments.
- Components are written as `J.jsx(...)` calls rather than JSX tags, so no compiler is needed.
- Vercel analytics was removed (it did nothing outside Vercel).
- The game still uses React for its UI. Replacing React with hand-written DOM code would mean rewriting every screen and minigame component.


## Start screen & multiple saves

On launch the game shows a start screen (island backdrop, game-style frames and font):
- pick a saved player to continue, **NYT SPIL** to create a new one (type a name, Enter/START),
  or the red X to delete one (with confirmation). Up to 8 saves.
- In-game, **Indstillinger → SKIFT SPILLER** saves and returns to the start screen.
- Existing single-save progress is automatically moved into a first slot called "SPILLER 1".

Code: `js/storage/saves.js` (slots; redirects the game's localStorage keys to `slot:<id>:<key>`),
`js/screens/start-screen.js` (canvas UI), wiring in `js/ui/app.js`.
Saves live in the browser's localStorage for the origin (address + port) you serve from.

Startup flow: title screen with **START SPIL** (this click is also what lets the browser play the theme
music immediately) → player selection → game. The theme track carries on seamlessly into the game.
The house-shaped menu sign (top right, always shown) opens the home menu from both the hotel and the map view whenever no window is open
(`menuKnap` in `js/render/canvas-helpers.js` and `hitMenuButton` in `js/screens/game-screen.js`).

The home menu also has **Skift spiller** (back to the start screen) and **Luk spillet** (closes the app when run inside
Electron via `window.electronAPI.closeApp()`, otherwise returns to the start screen). The old × button is gone.
Electron note: to let the title-screen music start without any click, create the window with
`webPreferences: { autoplayPolicy: 'no-user-gesture-required' }`.

HUD layout: the top-left HUD (coins, rubies, star bar, mail) is shifted left by `HUD_SHIFT` (`js/engine/constants.js`) in the hotel,
map, Zoo and Pop. "Skift spiller" returns to the player list (skipping the title screen); "Luk spillet" returns to the title screen.

The house (menu) sign is also shown during minigames: `GameScreen`'s canvas becomes a transparent overlay while a minigame runs,
and the minigame is paused (`ekstraPause` prop on `MinigameHost`) while the home menu is open.

16:9: the main screen (hotel, map, menus, start screen) is now 1365x768 (`GAME_WIDTH` in `js/engine/constants.js`); right-hand HUD elements
are offset by `WIDTH_EXTRA`. Minigames keep their 1280x768 canvas and are centred (CSS `.minispil` in `css/index.css`).

Title/player screens use the logos in `img/` (hand-built vector SVGs, crisp at any size; replace
`img/logo-pixeline.svg` and `img/logo-stjernehotellet.svg` with your own artwork any time).
During minigames a blurred copy of the game is stretched behind the 1280px playfield (`MinigameAmbient` in `js/screens/game-screen.js`) so the 16:9 screen has no black bars.

## Per-game 16:9 widening
`WIDE_MINIGAMES` in `js/engine/constants.js` lists minigames rendered at true 16:9 (currently Golf, Platform, Zoo, Pop). Each receives a `bredde` prop. All other minigames stay 1280 wide, centred, with a blurred ambient fill.

## Where saves live
- **Website:** plain `localStorage` (per origin). `js/storage/persist.js` only asks the browser to keep the data (`navigator.storage.persist`).
- **Electron:** `localStorage` is just a cache. The real copy is `saves.json` (+ `saves.json.bak`) in Electron's user-data folder, written by the main process through `window.electronAPI.storage` (see the Electron `app.js` / `preload.js`). The port/origin the game is served from no longer matters.  Nothing is ever read from the browser's own storage in Electron: only the file counts (old localhost saves are not imported).
