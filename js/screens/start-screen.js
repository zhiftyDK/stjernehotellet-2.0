import React from 'react';
import * as J from 'react/jsx-runtime';
import { GAME_WIDTH, GAME_HEIGHT, backdropPlacement } from '../engine/constants.js';
import { createTextureLoader } from '../render/canvas-helpers.js';
import { p1 } from '../ui/panels.js';
import { createUiKit } from '../minigames/ui-kit.js';
import { prepareThemeMusic, startThemeMusic } from '../loaders/data-loaders.js';
import { listSlots, createSlot, deleteSlot, MAX_SLOTS, MAX_NAME_LENGTH } from '../storage/saves.js';

const j = (url) => fetch(url).then((r) => r.json());
const loadImage = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

// Loads only what the start screen needs (UI frames + bitmap font + backdrop).
async function loadStartAssets() {
  const [uiJson, uiManifest, fontJson, fontManifest] = await Promise.all([
    j("data/ui/ui.json"), j("data/ui/manifest.json"), j("data/skrift/skrift.json"), j("data/skrift/manifest.json"),
  ]);
  const images = {};
  await Promise.all(fontJson.skrifter.map(async (f) => {
    const sprite = fontManifest.sprites[f.billede];
    images[f.billede] = await loadImage(`data/skrift/tex/${fontManifest.textures[sprite.assetId].file}`);
  }));
  prepareThemeMusic(await j("data/musik/musik.json"));
  const backdrop = cleanBackdrop(await loadImage("data/vent/vent.webp"));
  const logos = { pixeline: await loadImage("img/logo-pixeline.svg"), hotel: await loadImage("img/logo-stjernehotellet.svg") };
  return { logos, U: uiJson, ui: { M: uiManifest, T: createTextureLoader("data/ui", uiManifest) }, skrift: p1(fontJson, images), backdrop };
}

// The loading image has "Vent venligst..." baked into the sky. Paint the sky back over it
// by stretching a text-free pixel column across the text rows, so we get a clean island scene.
function cleanBackdrop(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  if (img.naturalWidth === 1024 && img.naturalHeight === 768) {
    g.drawImage(img, 40, 150, 1, 130, 90, 150, 850, 130);
  }
  return c;
}

const NAME_CHAR = /^[A-ZÆØÅ0-9 \-]$/;
const ROW_H = 92;
const LIST_ROWS = 3;

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function StartScreen({ onSelect }) {
  const canvasRef = React.useRef(null);
  const [assets, setAssets] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let dead = false;
    loadStartAssets().then((a) => { if (!dead) setAssets(a); }).catch((e) => { if (!dead) setError(e.message); });
    return () => { dead = true; };
  }, []);

  React.useEffect(() => {
    if (!assets) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { U, ui, skrift, backdrop, logos } = assets;
    const kit = createUiKit(ctx, { ui: { M: ui.M, I: ui.T.I } }, U, skrift);
    let skipTitle = false;
    try {
      skipTitle = sessionStorage.getItem("stjernehotellet-spring-titel") === "1";
      sessionStorage.removeItem("stjernehotellet-spring-titel");
    } catch {}
    const st = { slots: listSlots(), mode: skipTitle ? "liste" : "titel", navn: "", slet: null, liste: {}, tid: 0 };
    startThemeMusic();
    const refresh = () => { st.slots = listSlots(); };

    const hidden = document.createElement("input");
    Object.assign(hidden.style, { position: "fixed", left: "-1000px", top: "0", opacity: "0" });
    hidden.setAttribute("autocapitalize", "characters");
    document.body.appendChild(hidden);

    const addChar = (c) => {
      c = c.toUpperCase();
      if (NAME_CHAR.test(c) && st.navn.length < MAX_NAME_LENGTH) st.navn += c;
    };
    const confirmName = () => {
      const id = createSlot(st.navn);
      if (id) onSelect(id);
    };
    const startGame = () => {
      startThemeMusic();
      st.mode = "liste";
    };
    const onKey = (e) => {
      if (st.mode === "titel" && (e.key === "Enter" || e.key === " ")) { startGame(); e.preventDefault(); return; }
      if (st.mode !== "ny" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") { confirmName(); e.preventDefault(); }
      else if (e.key === "Escape") { st.mode = "liste"; e.preventDefault(); }
      else if (e.key === "Backspace") { st.navn = st.navn.slice(0, -1); e.preventDefault(); }
      else if (e.key.length === 1 && e.target !== hidden) { addChar(e.key); e.preventDefault(); }
    };
    hidden.addEventListener("input", () => { for (const c of hidden.value) addChar(c); hidden.value = ""; });
    window.addEventListener("keydown", onKey);

    const win = (w, h) => ({ x: Math.round((GAME_WIDTH - w) / 2), y: (GAME_HEIGHT - h) / 2 + 40, w, h });

    const drawLogo = (img, w, y) => {
      if (!img) return;
      const h = w * img.height / img.width;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.35)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(img, Math.round((GAME_WIDTH - w) / 2), y, w, h);
      ctx.restore();
    };

    const drawTitle = () => {
      const w = 420, h = 88, x = Math.round((GAME_WIDTH - w) / 2), y = 520;
      kit.ramme("punkt", x, y, w, h);
      kit.tekst("START SPIL", GAME_WIDTH / 2, y + h / 2, { str: 34, midt: true });
      kit.knap({ x0: x, y0: y, x1: x + w, y1: y + h }, startGame);
    };

    const drawList = () => {
      const p = win(704, 448);
      kit.ramme("hoved", p.x, p.y, p.w, p.h);
      kit.overskrift(st.slots.length ? "VÆLG SPILLER" : "VELKOMMEN", p.x + p.w / 2, p.y - 16);
      const lx = p.x + 40, ly = p.y + 40, lw = p.w - 80, lh = ROW_H * LIST_ROWS;
      if (!st.slots.length) {
        kit.tekst("Du har ingen gemte spil endnu. Opret en ny spiller for at begynde.", lx + 16, ly + 24, { bredde: lw - 32, str: 22, op: true });
      } else {
        kit.rulleliste(st.liste, lx, ly, lw, lh, st.slots.length * ROW_H, (top) => {
          st.slots.forEach((s, i) => {
            const y = top + i * ROW_H;
            kit.ramme("punkt", lx, y, lw - 12, ROW_H - 8);
            kit.tekst(s.navn, lx + 24, y + 28, { str: 26 });
            const info = s.etager != null ? `${s.etager} ETAGER  ·  ${s.penge ?? 0} KR.  ·  ${formatDate(s.sidst)}` : `NYT SPIL  ·  ${formatDate(s.oprettet)}`;
            kit.tekst(info, lx + 24, y + 58, { str: 16, op: false });
            kit.knap({ x0: lx, y0: y, x1: lx + lw - 80, y1: y + ROW_H - 8 }, () => onSelect(s.id));
            kit.spriteKnap(U.ikoner.nejLille, lx + lw - 56, y + (ROW_H - 8) / 2, () => { st.slet = s; st.mode = "slet"; });
          });
        });
      }
      const full = st.slots.length >= MAX_SLOTS;
      kit.tekstKnap(full ? "FULDT" : "NYT SPIL", p.x + p.w / 2 - 150, p.y + p.h - 92, 300, 64, () => {
        st.mode = "ny"; st.navn = ""; hidden.focus();
      }, { aktiv: !full });
    };

    const drawNew = () => {
      const p = win(704, 320);
      kit.ramme("hoved", p.x, p.y, p.w, p.h);
      kit.overskrift("NY SPILLER", p.x + p.w / 2, p.y - 16);
      kit.tekst("Skriv et navn:", p.x + p.w / 2, p.y + 52, { str: 22, midt: true });
      kit.ramme("punkt", p.x + 112, p.y + 90, p.w - 224, 64);
      const blink = Math.floor(st.tid / 500) % 2 === 0 ? "_" : "";
      kit.tekst(st.navn + blink, p.x + p.w / 2, p.y + 122, { str: 28, midt: true });
      kit.knap({ x0: p.x + 112, y0: p.y + 90, x1: p.x + p.w - 112, y1: p.y + 154 }, () => hidden.focus());
      kit.tekstKnap("START", p.x + 60, p.y + p.h - 92, 270, 64, confirmName, { aktiv: st.navn.trim().length > 0 });
      kit.tekstKnap("TILBAGE", p.x + p.w - 330, p.y + p.h - 92, 270, 64, () => { st.mode = "liste"; });
    };

    const drawDelete = () => {
      const p = win(576, 288);
      kit.ramme("hoved", p.x, p.y, p.w, p.h);
      kit.overskrift("SLET SPILLER?", p.x + p.w / 2, p.y - 16);
      kit.tekst(`${st.slet.navn} og alle gemte data slettes for altid.`, p.x + p.w / 2, p.y + 60, { midt: true, bredde: p.w - 96, str: 22, op: true });
      kit.tekstKnap("JA", p.x + 48, p.y + p.h - 92, 220, 64, () => { deleteSlot(st.slet.id); refresh(); st.mode = "liste"; });
      kit.tekstKnap("NEJ", p.x + p.w - 268, p.y + p.h - 92, 220, 64, () => { st.mode = "liste"; });
    };

    let raf = 0, last = performance.now();
    const frame = (now) => {
      st.tid = now; last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      if (backdrop) {
        const pl = backdropPlacement(GAME_WIDTH);
        ctx.drawImage(backdrop, 0, pl.y + 40, backdrop.width * pl.scale, backdrop.height * pl.scale);
      }
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      kit.start();
      const big = st.mode === "titel";
      const pw = big ? 560 : 380, hw = big ? 500 : 340;
      const ph = logos.pixeline ? pw * logos.pixeline.height / logos.pixeline.width : 0;
      drawLogo(logos.pixeline, pw, big ? 18 : 6);
      drawLogo(logos.hotel, hw, (big ? 18 : 6) + ph + (big ? 0 : -4));
      if (big) {
        drawTitle();
      }
      if (st.mode === "titel") { /* drawn above */ } else if (st.mode === "liste") drawList(); else if (st.mode === "ny") drawNew(); else drawDelete();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const pos = (e) => {
      const r = canvas.getBoundingClientRect(), k = GAME_HEIGHT / r.height;
      return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
    };
    let drag = null;
    const down = (e) => { drag = { p: pos(e), rul: st.liste.rul || 0, flyttet: false }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (!drag) return;
      const q = pos(e);
      if (Math.hypot(q.x - drag.p.x, q.y - drag.p.y) > 8) drag.flyttet = true;
      if (drag.flyttet && st.mode === "liste") st.liste.rul = drag.rul - (q.y - drag.p.y);
    };
    const up = (e) => { if (drag && !drag.flyttet) kit.klik(pos(e)); drag = null; };
    const wheel = (e) => { if (st.mode === "liste") { e.preventDefault(); st.liste.rul = (st.liste.rul || 0) + e.deltaY; } };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
      hidden.remove();
    };
  }, [assets, onSelect]);

  if (error) return J.jsxs("div", { className: "msg", children: ["Kunne ikke indlæse: ", error] });
  return J.jsx("div", { className: "spil uden-panel", children: J.jsx("div", { className: "skaerm", children: J.jsx("canvas", { ref: canvasRef, width: GAME_WIDTH, height: GAME_HEIGHT, style: { cursor: "default" } }) }) });
}
