import { StartScreen } from '../screens/start-screen.js';
import { getActiveSlotId, activateSlot } from '../storage/saves.js';
import React from 'react';
import * as J from 'react/jsx-runtime';
import { openInfo, hasUnseenNews, onNewsSeen, openNews } from './news-and-info.js';
import { GameScreen } from '../screens/game-screen.js';
const HOVER_QUERY = "(hover: hover) and (pointer: fine)", id = ["Velkommen til Stjernehotellet!", "Nyt: Skru op og ned for lyden i Indstillinger!", "Dette projekt er work in progress.", "Tak for at spille :)", "Husk at drikke vand!", "Et fanprojekt, ikke det officielle spil.", "Genskabt ud fra det originale spil.", "Der kommer nye ting hele tiden.", "Lavet med kærlighed til Pixeline.", "Bygget i min fritid.", "Del spillet med en ven!", "Hav en god dag!", "Husk at holde en pause!", "Godt at se dig!"], M1 = 2500, j1 = 6e3, Bs = [15e3, 3e4];
function useHasHover() {
  const [e, t] = React.useState(() => window.matchMedia(HOVER_QUERY).matches);
  React.useEffect(() => {
    const n = window.matchMedia(HOVER_QUERY), r = () => t(n.matches);
    n.addEventListener("change", r);
    return () => n.removeEventListener("change", r);
  }, []);
  return e;
}
function DesktopProfile() {
  return useHasHover() ? J.jsx(ProfileCheat, {}) : null;
}
function InfoButton() {
  return useHasHover() ? J.jsx("button", { type: "button", className: "nyheder-knap", onClick: openInfo, children: "Info" }) : null;
}
function NewsButton() {
  const e = useHasHover(), [t, n] = React.useState(hasUnseenNews);
  React.useEffect(() => onNewsSeen(() => n(hasUnseenNews())), []);
  return e ? J.jsxs("button", { type: "button", className: "nyheder-knap", onClick: openNews, children: ["Nyheder", t && J.jsx("span", { className: "nyheder-prik", "aria-label": "Nyt" })] }) : null;
}
function ProfileCheat() {
  const [e, t] = React.useState(0), [n, r] = React.useState(false), l = React.useRef(null), i = React.useRef(0), o = React.useRef({ n: 0, sidst: 0 }), s = React.useRef(null), [a, u] = React.useState(false), [h, m] = React.useState(""), g = () => {
    const d = Date.now(), f = o.current;
    f.n = d - f.sidst > 1500 ? 1 : f.n + 1;
    f.sidst = d;
    if (f.n >= 10) {
      f.n = 0;
      u(true);
      m("");
    }
    const y = s.current;
    if (y) {
      y.style.setProperty("--ryst", String(Math.min(1 + f.n * 1.5, 16)));
      y.classList.remove("ryster");
      y.offsetWidth;
      y.classList.add("ryster");
    }
    p();
  }, v = () => window.__snyd && window.__snyd.s, c = [["+1.000 kr.", () => {
        const d = v();
        if (d) {
          d.penge += 1e3;
          return "Du fik 1.000 kr.";
        }
        return "Åbn spillet først";
      }], ["+10.000 kr.", () => {
        const d = v();
        if (d) {
          d.penge += 1e4;
          return "Du fik 10.000 kr.";
        }
        return "Åbn spillet først";
      }], ["+1 stjerne", () => {
        const d = v();
        if (!d) {
          return "Åbn spillet først";
        }
        const y = [0, 100, 300, 700, 1500, 3e3, 6e3, 12e3, 25e3, 5e4].find((w) => w > d.hentet);
        if (y === void 0) {
          return "Du har alle stjerner";
        }
        d.hentet = y;
        return "En stjerne mere!";
      }], ["Alle totemer", () => {
        try {
          localStorage.setItem("platform-naaet-v1", "12");
        }
        catch {
        }
        return "Totemerne er låst op";
      }]], p = () => {
    clearTimeout(l.current);
    t(i.current);
    i.current = (i.current + 1) % id.length;
    r(true);
    l.current = setTimeout(k, j1);
  }, k = () => {
    r(false);
    l.current = setTimeout(p, Bs[0] + Math.random() * (Bs[1] - Bs[0]));
  };
  React.useEffect(() => {
    l.current = setTimeout(p, M1);
    return () => clearTimeout(l.current);
  }, []);
  return J.jsxs("aside", { className: "profil", "aria-label": "Profil", children: [J.jsxs("div", { className: n ? "profil-snak vist" : "profil-snak", "aria-hidden": !n, children: [J.jsx("img", { src: "profil/boble.webp", alt: "", draggable: false }), J.jsx("p", { className: "profil-tekst", role: "status", children: id[e] })] }), J.jsx("img", { ref: s, onAnimationEnd: (d) => d.currentTarget.classList.remove("ryster"), className: "profil-hoved", src: "profil/hoved.webp", alt: "Profilbillede", title: "Klik for en besked", draggable: false, onClick: g }), a && J.jsxs("div", { className: "profil-snyd", role: "dialog", "aria-label": "Snydemenu", children: [J.jsx("b", { children: "Snydemenu" }), c.map(([d, f]) => J.jsx("button", { type: "button", onClick: () => m(f()), children: d }, d)), h && J.jsx("small", { children: h }), J.jsx("button", { type: "button", onClick: () => u(false), children: "Luk" })] })] });
}
export function App() {
  const [slot, setSlot] = React.useState(() => {
    const id = getActiveSlotId();
    if (id) {
      activateSlot(id);
    }
    return id;
  });
  const choose = React.useCallback((id) => {
    activateSlot(id);
    setSlot(id);
  }, []);
  return J.jsxs("div", { className: "ramme", children: [slot ? J.jsx(GameScreen, {}) : J.jsx(StartScreen, { onSelect: choose }), J.jsxs("div", { className: "under-spil", children: [J.jsx(NewsButton, {}), J.jsx(InfoButton, {}), J.jsx(DesktopProfile, {})] }), J.jsxs("div", { className: "vend", role: "alert", children: [J.jsxs("svg", { viewBox: "0 0 64 64", width: "96", height: "96", "aria-hidden": "true", children: [J.jsx("rect", { className: "vend-telefon", x: "20", y: "8", width: "24", height: "48", rx: "4" }), J.jsx("circle", { cx: "32", cy: "50", r: "2" })] }), J.jsx("p", { children: "Vend telefonen" }), J.jsx("p", { className: "vend-lille", children: "Spillet er lavet til liggende format." })] })] });
}
const HOVER_QUERY_2 = "(hover: hover) and (pointer: fine)";
export function setupFirstInteractionHandler() {
  if (window.matchMedia(HOVER_QUERY_2).matches) {
    return;
  }
  const e = document.documentElement, t = e.requestFullscreen || e.webkitRequestFullscreen;
  if (!t) {
    return;
  }
  const n = () => {
    if (!(window.matchMedia(HOVER_QUERY_2).matches || document.fullscreenElement || document.webkitFullscreenElement)) {
      Promise.resolve(t.call(e, { navigationUI: "hide" })).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape")).catch(() => {
      });
    }
  };
  window.addEventListener("pointerup", n);
  window.addEventListener("keydown", n);
}
