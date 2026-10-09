# Teknisk dokumentation (på engelsk)

Udviklernoter til Stjernehotellet. Se [README.md](../README.md) for den almindelige præsentation.

Plain HTML + CSS + native ES modules (no framework). The game lives in `src/` and runs as-is: edit a file, refresh the browser.

## Run
```
npm install
npm run serve        # http://127.0.0.1:5500 (browsers block ES modules on file://)
```
(Any static server pointed at `src/` works too, e.g. VS Code "Live Server".) See "Project layout, build and packaging" below for `npm run build web|windows`.

## Layout of src/
- `index.html` – the page; loads `js/main.js` as an ES module (no import map, no third-party libraries).
- `css/index.css`, `custom.css` – styles.
- `js/main.js` – entry point. `js/ui`, `js/screens`, `js/game`, `js/engine`, `js/render`, `js/audio`, `js/minigames` – the game.
- `js/dom.js` – tiny `h(tag, props, ...children)` helper for building DOM elements.

## Notes
- Screens and minigames are plain factories: `createXxx(props) -> { el, update(partial), destroy() }` (see `js/dom.js`). State lives in ordinary variables and the DOM is updated explicitly. Minigames are loaded with dynamic `import()` by `js/minigames/host.js`.
- Vercel analytics was removed (it did nothing outside Vercel).
- The game uses only HTML, CSS and JavaScript; React has been removed.


## Start screen & multiple saves

On launch the game shows a start screen (island backdrop, game-style frames and font):
- pick a saved player to continue, **NYT SPIL** to create a new one (type a name, Enter/START),
  or the red X to delete one (with confirmation). Up to 8 saves.
- In-game, **Indstillinger → SKIFT SPILLER** saves and returns to the start screen.
- Existing single-save progress is automatically moved into a first slot called "SPILLER 1".

Code: `src/js/storage/saves.js` (slots; redirects the game's localStorage keys to `slot:<id>:<key>`),
`src/js/screens/start-screen.js` (canvas UI), wiring in `src/js/ui/app.js`.
Saves live in the browser's localStorage for the origin (address + port) you serve from.

Startup flow: title screen with **START SPIL** (this click is also what lets the browser play the theme
music immediately) → player selection → game. The theme track carries on seamlessly into the game.
The house-shaped menu sign (top right, always shown) opens the home menu from both the hotel and the map view whenever no window is open
(`menuKnap` in `src/js/render/canvas-helpers.js` and `hitMenuButton` in `src/js/screens/game-screen.js`).

The home menu also has **Skift spiller** (back to the start screen) and **Luk spillet** (closes the app when run inside
Electron via `window.electronAPI.closeApp()`, otherwise returns to the start screen). The old × button is gone.
Electron note: to let the title-screen music start without any click, create the window with
`webPreferences: { autoplayPolicy: 'no-user-gesture-required' }`.

HUD layout: the top-left HUD (coins, rubies, star bar, mail) is shifted left by `HUD_SHIFT` (`src/js/engine/constants.js`) in the hotel,
map, Zoo and Pop. "Skift spiller" returns to the player list (skipping the title screen); "Luk spillet" returns to the title screen.

The house (menu) sign is also shown during minigames: `GameScreen`'s canvas becomes a transparent overlay while a minigame runs,
and the minigame is paused (`ekstraPause` prop on `MinigameHost`) while the home menu is open.

16:9: the main screen (hotel, map, menus, start screen) is now 1365x768 (`GAME_WIDTH` in `src/js/engine/constants.js`); right-hand HUD elements
are offset by `WIDTH_EXTRA`. Minigames keep their 1280x768 canvas and are centred (CSS `.minispil` in `css/index.css`).

Title/player screens use the logos in `img/` (hand-built vector SVGs, crisp at any size; replace
`img/logo-pixeline.svg` and `img/logo-stjernehotellet.svg` with your own artwork any time).
During minigames a blurred copy of the game is stretched behind the 1280px playfield (`MinigameAmbient` in `src/js/screens/game-screen.js`) so the 16:9 screen has no black bars.

## Per-game 16:9 widening
`WIDE_MINIGAMES` in `src/js/engine/constants.js` lists minigames rendered at true 16:9 (currently Golf, Platform, Zoo, Pop). Each receives a `bredde` prop. All other minigames stay 1280 wide, centred, with a blurred ambient fill.

## Where saves live
- **Website:** plain `localStorage` (per origin). `src/js/storage/persist.js` only asks the browser to keep the data (`navigator.storage.persist`).
- **Electron:** `localStorage` is just a cache. The real copy is `saves.json` (+ `saves.json.bak`) in Electron's user-data folder, written by the main process through `window.electronAPI.storage` (see `electron/main.cjs` / `electron/preload.cjs`). The port/origin the game is served from no longer matters.  Nothing is ever read from the browser's own storage in Electron: only the file counts (old localhost saves are not imported).

## Code layout (after the readability refactor)

Every source file starts with a header comment; functions are commented; local names are descriptive. Large modules are split into a folder, with the original file kept as a thin entry that re-exports it, so import paths stay stable.

| Path | What it holds |
|---|---|
| `src/js/main.js` | Entry point |
| `src/js/ui/` | App shell (`app.js`), news/info windows, bitmap-font text renderer and instruction panel (`panels.js`) |
| `src/js/screens/` | Start screen; `game-screen.js` (hotel/map screen) with helpers in `game-screen/` (click handling, pointer input, sky, menu sign, minigame ambient) |
| `src/js/game/` | Hotel simulation (`hotel.js` + `hotel/`), Zoo state logic (`world.js` + `world/`), menus (`world-init.js` + `world-menus/`), pets, gifts, furniture and kitchen, save serialisation |
| `src/js/engine/` | Constants, tweens, animation player, kinetic scrolling |
| `src/js/render/` | Canvas helpers, script interpreter/player (`script-interpreter.js`, `script-player.js`), map screen |
| `src/js/audio/`, `src/js/loaders/`, `src/js/storage/` | Audio + volume, data/asset loading, save slots and persistence |
| `src/js/minigames/` | `host.js` (opens a minigame), `ui-kit.js`, one file per minigame; Golf, Platform, Zoo and Pop are split into `golf/`, `platform/`, `zoo/`, `pop/` |

Object property names (e.g. `kaeledyr`, `tilstand`) were deliberately left unchanged: they are shared with the game data JSON and the save files.

## Project layout, build and packaging

```
src/        the game: index.html, css, custom.css, img, profil, data, js   (editable source, runs as-is)
electron/   main.cjs (local web server + save file), preload.cjs, icon.ico/png
installer/  installer.iss (Inno Setup)
scripts/    build.mjs (CLI), lib/{bundle,web,windows,paths}.mjs, serve.mjs
dist/       build output (git-ignored): web/, app/, installer/
```

One root `package.json`; `npm install` once.

- `npm run serve [-- dir]` – static server for `src/` (or a build folder), default port 5500.
- `npm start` – run the Electron wrapper straight from `src/`.
- `npm run build web` – `dist/web`: JavaScript bundled and minified with esbuild (one small main file plus one lazily loaded chunk per minigame), everything else copied.
- `npm run build windows` – bundle -> minimal Electron project (`dist/_stage`) -> `@electron/packager` (win32/x64; game files go to `resources/`, where `main.cjs` serves them) -> `dist/app/Stjernehotellet-win32-x64` -> Inno Setup (`ISCC`, found via `$ISCC`, the usual install folders or PATH; `installer.iss` receives `MyAppVersion`, `SourceDir`, `OutputDir`, `IconFile` as defines) -> `dist/installer/Stjernehotellet-Setup.exe`. The version comes from `package.json`.

Never edit `dist/`.

## Performance diagnosis

Press **F3** in the game (or add `?fps` to the address) to show an overlay with fps, average and worst frame time. The blurred backdrop behind the minigames is drawn pre-blurred on a tiny canvas (see `src/js/screens/game-screen/minigame-ambient.js`) instead of using a CSS blur filter on a full-screen layer.
