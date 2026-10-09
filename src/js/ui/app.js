// Root of the game page: picks between the start screen (choose/create a
// save slot) and the game itself, and renders the desktop-only buttons and profile head
// next to the game plus the "rotate your phone" overlay.
import { h, setChildren, removeEl } from '../dom.js';
import { createStartScreen } from '../screens/start-screen.js';
import { getActiveSlotId, activateSlot } from '../storage/saves.js';
import { openInfo, hasUnseenNews, onNewsSeen, openNews } from './news-and-info.js';
import { createGameScreen } from '../screens/game-screen.js';
// Desktop-style input: a mouse-like pointer that can hover. Touch devices fail this query.
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

// Little speech-bubble messages the Pixeline profile head shows (Danish, player-facing).
const PROFILE_MESSAGES = [
  "Velkommen til Stjernehotellet!",
  "Nyt: Skru op og ned for lyden i Indstillinger!",
  "Dette projekt er work in progress.",
  "Tak for at spille :)",
  "Husk at drikke vand!",
  "Et fanprojekt, ikke det officielle spil.",
  "Genskabt ud fra det originale spil.",
  "Der kommer nye ting hele tiden.",
  "Lavet med kærlighed til Pixeline.",
  "Bygget i min fritid.",
  "Del spillet med en ven!",
  "Hav en god dag!",
  "Husk at holde en pause!",
  "Godt at se dig!",
];
// Timing (ms): delay before the first bubble, how long a bubble stays up,
// and the [min, max] random pause between bubbles.
const FIRST_MESSAGE_DELAY_MS = 2500;
const MESSAGE_VISIBLE_MS = 6e3;
const NEXT_MESSAGE_DELAY_RANGE_MS = [15e3, 3e4];
// Opens the info dialog (about / how saving works); desktop only.
function createInfoButton() {
  return h("button", { type: "button", className: "nyheder-knap", onClick: openInfo }, "Info");
}
// Opens the news dialog; a dot marks unread news. Desktop only.
// Returns { el, destroy }; the dot follows hasUnseenNews() via onNewsSeen.
function createNewsButton() {
  let dot = null;
  const el = h("button", { type: "button", className: "nyheder-knap", onClick: openNews }, "Nyheder");
  const syncDot = () => {
    if (hasUnseenNews()) {
      if (!dot) {
        dot = h("span", { className: "nyheder-prik", "aria-label": "Nyt" });
        el.append(dot);
      }
    } else {
      removeEl(dot);
      dot = null;
    }
  };
  syncDot();
  const unsubscribe = onNewsSeen(syncDot);
  return { el, destroy() { unsubscribe(); } };
}
// The Pixeline head beside the game. Shows rotating speech bubbles; clicking it 10 times,
// each tap less than 1.5 s after the previous one, opens a hidden cheat menu (money, stars, totems) that edits the
// running game via window.__snyd.s ("snyd" = cheat). Desktop only.
function createProfileCheat() {
  let timer = null;
  let nextMessage = 0;
  const taps = { n: 0, sidst: 0 }; // tap counter and time of the last tap
  let cheatMenu = null;
  let cheatStatus = "";
  const messageText = h("p", { className: "profil-tekst", role: "status" }, PROFILE_MESSAGES[0]);
  const bubble = h("div", { className: "profil-snak", "aria-hidden": "true" }, h("img", { src: "profil/boble.webp", alt: "", draggable: false }), messageText);
  const head = h("img", { onAnimationEnd: (event) => event.currentTarget.classList.remove("ryster"), className: "profil-hoved", src: "profil/hoved.webp", alt: "Profilbillede", title: "Klik for en besked", draggable: false, onClick: onHeadClick });
  const el = h("aside", { className: "profil", "aria-label": "Profil" }, bubble, head);
  // The live game state exposed by the game screen for cheating (undefined before the game opens).
  const getCheatState = () => window.__snyd && window.__snyd.s;
  // [button label, action returning a status message]. penge = money, hentet = earned total (stars).
  const cheatActions = [["+1.000 kr.", () => {
        const state = getCheatState();
        if (state) {
          state.penge += 1e3;
          return "Du fik 1.000 kr.";
        }
        return "Åbn spillet først";
      }], ["+10.000 kr.", () => {
        const state = getCheatState();
        if (state) {
          state.penge += 1e4;
          return "Du fik 10.000 kr.";
        }
        return "Åbn spillet først";
      }], ["+1 stjerne", () => {
        const state = getCheatState();
        if (!state) {
          return "Åbn spillet først";
        }
        // Star thresholds on the total earned; jump to the next one above the current total.
      const nextThreshold = [0, 100, 300, 700, 1500, 3e3, 6e3, 12e3, 25e3, 5e4].find((threshold) => threshold > state.hentet);
        if (nextThreshold === void 0) {
          return "Du har alle stjerner";
        }
        state.hentet = nextThreshold;
        return "En stjerne mere!";
      }], ["Alle totemer", () => {
        try {
          localStorage.setItem("platform-naaet-v1", "12");
        }
        catch {
        }
        return "Totemerne er låst op";
      }]];
  // (Re)builds the cheat menu from the current status text, or removes it when closed.
  function renderCheatMenu(open) {
    removeEl(cheatMenu);
    cheatMenu = null;
    if (!open) return;
    cheatMenu = h("div", { className: "profil-snyd", role: "dialog", "aria-label": "Snydemenu" }, h("b", null, "Snydemenu"), cheatActions.map(([label, action]) => h("button", { type: "button", onClick: () => { cheatStatus = action(); renderCheatMenu(true); } }, label)), cheatStatus && h("small", null, cheatStatus), h("button", { type: "button", onClick: () => renderCheatMenu(false) }, "Luk"));
    el.append(cheatMenu);
  }
  // Head click: counts rapid taps, restarts the "shake" animation, opens the cheat menu at 10.
  function onHeadClick() {
    const now = Date.now();
    taps.n = now - taps.sidst > 1500 ? 1 : taps.n + 1;
    taps.sidst = now;
    if (taps.n >= 10) {
      taps.n = 0;
      cheatStatus = "";
      renderCheatMenu(true);
    }
    head.style.setProperty("--ryst", String(Math.min(1 + taps.n * 1.5, 16)));
    head.classList.remove("ryster");
    head.offsetWidth;
    head.classList.add("ryster");
    showNextMessage();
  }
  // Show the next message in sequence, hide it again after MESSAGE_VISIBLE_MS.
  function showNextMessage() {
    clearTimeout(timer);
    messageText.textContent = PROFILE_MESSAGES[nextMessage];
    nextMessage = (nextMessage + 1) % PROFILE_MESSAGES.length;
    bubble.className = "profil-snak vist";
    bubble.setAttribute("aria-hidden", "false");
    timer = setTimeout(hideMessage, MESSAGE_VISIBLE_MS);
  }
  function hideMessage() {
    bubble.className = "profil-snak";
    bubble.setAttribute("aria-hidden", "true");
    timer = setTimeout(showNextMessage, NEXT_MESSAGE_DELAY_RANGE_MS[0] + Math.random() * (NEXT_MESSAGE_DELAY_RANGE_MS[1] - NEXT_MESSAGE_DELAY_RANGE_MS[0]));
  }
  timer = setTimeout(showNextMessage, FIRST_MESSAGE_DELAY_MS);
  return { el, destroy() { clearTimeout(timer); } };
}
// Mounts the app into `container`. Restores the last active save slot, if any, and switches
// to the game; choosing a slot on the start screen swaps the start screen for the game screen.
export function mountApp(container) {
  const initialSlot = getActiveSlotId();
  if (initialSlot) {
    activateSlot(initialSlot);
  }
  let screen = null; // current { el, destroy } (start screen or game screen)
  const underGame = h("div", { className: "under-spil" });
  const rotateHint = h("div", { className: "vend", role: "alert" }, h("svg", { viewBox: "0 0 64 64", width: "96", height: "96", "aria-hidden": "true" }, h("rect", { className: "vend-telefon", x: "20", y: "8", width: "24", height: "48", rx: "4" }), h("circle", { cx: "32", cy: "50", r: "2" })), h("p", null, "Vend telefonen"), h("p", { className: "vend-lille" }, "Spillet er lavet til liggende format."));
  const frame = h("div", { className: "ramme" }, underGame, rotateHint);
  container.append(frame);
  // Replaces the current screen; the new one goes before .under-spil (DOM order: screen, .under-spil, .vend).
  const showScreen = (next) => {
    if (screen) {
      screen.destroy();
      removeEl(screen.el);
    }
    screen = next;
    if (screen.el) frame.insertBefore(screen.el, underGame);
  };
  const choose = (id) => {
    activateSlot(id);
    showScreen(createGameScreen());
  };
  showScreen(initialSlot ? createGameScreen() : createStartScreen({ onSelect: choose }));
  // Desktop-only widgets (news, info, profile); built when a hovering pointer is present and torn down otherwise.
  const mediaQuery = window.matchMedia(HOVER_QUERY);
  let widgets = [];
  const syncHover = () => {
    for (const widget of widgets) if (widget.destroy) widget.destroy();
    widgets = [];
    if (!mediaQuery.matches) {
      setChildren(underGame);
      return;
    }
    const news = createNewsButton();
    const info = { el: createInfoButton() };
    const profile = createProfileCheat();
    widgets = [news, info, profile];
    setChildren(underGame, news.el, info.el, profile.el);
  };
  syncHover();
  mediaQuery.addEventListener("change", syncHover);
}
const HOVER_QUERY_2 = "(hover: hover) and (pointer: fine)";
// On touch devices, the first tap/key press switches the page to fullscreen and locks
// landscape (the game is landscape-only). Not used on desktop.
export function setupFirstInteractionHandler() {
  if (window.matchMedia(HOVER_QUERY_2).matches) {
    return;
  }
  const root = document.documentElement;
  const requestFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!requestFullscreen) {
    return;
  }
  const onFirstInteraction = () => {
    if (!(window.matchMedia(HOVER_QUERY_2).matches || document.fullscreenElement || document.webkitFullscreenElement)) {
      Promise.resolve(requestFullscreen.call(root, { navigationUI: "hide" })).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape")).catch(() => {
      });
    }
  };
  window.addEventListener("pointerup", onFirstInteraction);
  window.addEventListener("keydown", onFirstInteraction);
}
