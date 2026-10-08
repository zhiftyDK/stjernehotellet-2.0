import { GAME_WIDTH } from '../engine/constants.js';
import React from 'react';
import * as J from 'react/jsx-runtime';
import { useGameData, rd, x1 } from '../loaders/data-loaders.js';
import { createHotel, Hh, vv, hotelHeight, gv, advanceHotel, floorTopY, floorSprite, kn, Hi, $h, sv, av } from '../game/hotel.js';
import { deserializeHotel, clearAllSavedData, tutorials, serializeHotel } from '../game/save.js';
import { Hc, Tv } from '../render/script-player.js';
import { createHudRenderer, createTextureLoader, pointLevel, drawSprite, drawAnimation, getAnimationBounds } from '../render/canvas-helpers.js';
import { createUiKit, WindowStack, LoadingScreen } from '../minigames/ui-kit.js';
import { COIN_SOUND_ID, Oc, Ac, kitchenLevel, stoveAction, collectCookIncome } from '../game/furniture-and-kitchen.js';
import { h1 } from '../ui/panels.js';
import { isMinigame, MinigameHost } from '../minigames/host.js';
import { d1 } from '../game/world-init.js';
import { registerNewsOpener, registerInfoOpener } from '../ui/news-and-info.js';
import { AnimationPlayer } from '../engine/animation.js';
import { petTrophyLevel, petLevel, Bi, $s, petComfortLevel, collectPetReward } from '../game/pets.js';
import { giftHopScale, openGift } from '../game/gifts.js';
import { WIDE_MINIGAMES, WIDTH_EXTRA } from '../engine/constants.js';
import { formatDuration } from '../game/world.js';
// Blurred copy of the running minigame, stretched across the 16:9 screen behind the (1280px wide) minigame, instead of black bars.
function MinigameAmbient() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    const timer = setInterval(() => {
      const src = [...document.querySelectorAll(".minispil-flade canvas")].find((c) => !c.classList.contains("minispil-ramme") && !c.classList.contains("vent"));
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (src && src.width > 0) {
        try {
          ctx.drawImage(src, 0, 0, cv.width, cv.height);
        } catch {}
      }
    }, 66);
    return () => clearInterval(timer);
  }, []);
  return J.jsx("div", { "aria-hidden": "true", style: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }, children: J.jsx("canvas", { ref, width: 171, height: 96, style: { width: "100%", height: "100%", borderRadius: 0, background: "transparent", filter: "blur(10px) brightness(.8)", transform: "scale(1.1)" } }) });
}
// Home-menu sign, always drawn in the top-right corner (hotel and map). Region is set every frame.
let menuRegion = null;
const hitMenuButton = (p) => !!menuRegion && p.x >= menuRegion.x0 && p.x <= menuRegion.x1 && p.y >= menuRegion.y0 && p.y <= menuRegion.y1;
export function GameScreen() {
  const [ov, setOv] = React.useState(false), [signBox, setSignBox] = React.useState(null), ovRef = React.useRef(false);
  const e = useGameData(), [t, n] = React.useState(null), r = React.useRef(null), l = React.useRef(null), i = React.useRef(null), o = React.useRef([]), s = React.useRef([]), a = React.useRef([]), u = React.useRef(null), h = React.useRef([]), m = React.useRef([]), g = React.useRef({}), v = React.useRef(null), c = React.useRef(null), [p, k] = React.useState(null), [d, f] = React.useState(null), [y, w] = React.useState(true), S = React.useRef(null), P = React.useRef(null), M = React.useRef([]);
  React.useEffect(() => {
    if (e.status !== "klar") {
      return;
    }
    const x = e.verden, T = e.manifest, R = e.billeder, z = e.moebler, q = e.cafe, D = createHotel(x, z.kat, q.C);
    v.current = Hh(x.moent, T, R, e.skrift);
    D.kd = e.kaeledyr;
    deserializeHotel(D);
    let Ce = false;
    const we = vv(q.C, q.M, q.T), re = Hc(e.hoveder, "data/hoveder/lyd"), We = createHudRenderer(e.hud.H, e.hud.M, e.hud.T.I, e.skrift, e.hoveder), Ye = createUiKit(l.current.getContext("2d"), { ui: { M: e.ui.M, I: e.ui.T.I }, hotel: { M: T, I: R, anims: new Map(T.animations.map((A) => [A.id, A])) }, moebler: { M: z.M, I: z.T.I, anims: z.anims }, cafe: { M: q.M, I: q.T.I, anims: q.anims }, vejledning: { M: e.vejledning.M, I: e.vejledning.T.I, anims: e.vejledning.anims } }, e.ui.U, e.skrift), pe = new WindowStack({ ...e.ui.U, menu: { ...e.ui.U.menu, venstre: Math.round((GAME_WIDTH - e.ui.U.menu.skaerm[0]) / 2) } }), ne = { klar: false, henter: false }, Rt = () => {
      if (!ne.henter) {
        ne.henter = true;
        fetch("data/kaeledyr/manifest.json").then((A) => A.json()).then((A) => {
          const te = createTextureLoader("data/kaeledyr", A);
          Object.assign(ne, { M: A, I: te.I, anims: new Map(A.animations.map((ge) => [ge.id, ge])), klar: true });
          Ye.pakker.kaeledyr = { M: A, I: te.I, anims: ne.anims };
        }).catch(() => {
          ne.henter = false;
        });
      }
    }, he = e.kaeledyr.dyr.lyde, sr = rd([...new Set([...he.goe.flat(), ...he.spis, he.bad, he.moebel, he.leg, ...e.kaeledyr.boder.levering, COIN_SOUND_ID])]), Qr = (A, te = null) => pe.aabn(h1({ V: e.vejledning.V, nr: A, pakke: "vejledning", laes: (ge, se) => re.start(ge, { v0: se }), lukket: te })), Ut = e.kort, Xl = Hc({ liste: Ut.K.scripts.liste, haendelser: {} }, "data/kort/lyd"), Vt = Tv({ K: Ut.K, M: Ut.M, I: Ut.T.I, forgrund: Ut.forgrund, baggrund: Ut.baggrund, hud: { M: e.hud.M, I: e.hud.T.I }, HV: e.hoveder, hoveder: Xl, skrift: e.skrift }), U = { navn: "hotel" }, me = x1(e.musik);
    me.spil(0);
    const Ke = () => {
      re.stop();
      U.navn = "kort";
      Vt.vis();
      me.oe();
    }, Ct = (A) => {
      if (A === 0) {
        Vt.stop();
        U.navn = "hotel";
        re.haendelse("tilbage");
        me.spil(0);
        return;
      }
      if (!isMinigame(A)) {
        pe.aabn(mn.besked(Ut.K.minispil[A].titel, "Minispillet findes ikke endnu."));
        return;
      }
      re.stop();
      Vt.stop();
      S.current = A;
      f(A);
      me.spil(A);
    }, mn = d1({ s: D, D: x, MB: z, CF: q, U: e.ui.U, vis: (A) => W.current(A), nulstil: () => {
        Ce = true;
        clearAllSavedData();
        window.location.reload();
      }, hoved: (A, te) => re.haendelse(A, te), tilKort: Ke, kaeledyr: () => {
        Rt();
        return ne.klar;
      }, tastatur: () => Xt.focus(), vejledning: Qr }), h0 = () => {
      if (tutorials.har("post1")) {
        pe.aabn(mn.post());
        return;
      }
      tutorials.saet("post1");
      Qr(1, () => pe.aabn(mn.post()));
    };
    c.current = { kit: Ye, menuer: pe, M: mn, hoveder: re, kort: Vt, scene: U, startMinispil: Ct, aabnPost: h0, vejled: Qr, musik: me, pengeLyd: () => sr.spil(COIN_SOUND_ID) };
    Ke();
    pe.aabn(mn.guide());
    registerNewsOpener(() => {
      if (S.current != null) {
        P.current = "nyheder";
        return;
      }
      pe.aabn(mn.nyheder());
    });
    registerInfoOpener(() => {
      if (S.current != null) {
        P.current = "info";
        return;
      }
      pe.aabn(mn.info());
    });
    const Xt = document.createElement("input");
    Object.assign(Xt.style, { position: "fixed", left: "-1000px", top: "0", opacity: "0" });
    Xt.setAttribute("autocapitalize", "characters");
    document.body.appendChild(Xt);
    Xt.addEventListener("input", () => {
      for (const A of Xt.value) {
        pe.tast(A);
      }
      Xt.value = "";
    });
    const of = (A) => {
      if (!(!pe.aaben || A.ctrlKey || A.metaKey || A.altKey || A.target === Xt && A.key.length === 1)) {
        if (pe.tast(A.key)) {
          A.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", of);
    const sf = (A) => {
      if (pe.aaben) {
        A.preventDefault();
        pe.rul(A.deltaY);
      }
    };
    l.current.addEventListener("wheel", sf, { passive: false });
    r.current = D;
    window.__snyd = { s: D };
    let Xo = pointLevel(D.hentet).antal;
    const ar = x.flise, Jo = e.forgrund.raekker * ar, m0 = e.baggrund.raekker * ar, qo = e.forgrund.kolonner * ar;
    D.kam.x = Math.round((qo - x.skaerm.bredde) / 2);
    D.kam.y = hotelHeight(D) - x.skaerm.hoejde;
    const Jl = new Map(T.animations.map((A) => [A.id, A]));
    D.filmTid = new Map(T.animations.map((A) => [A.id, A.duration * 10]));
    u.current = rd([x.lyde.gave]);
    const ql = new Map(), ei = new Map(), yn = (A, te, ge = 0) => {
      let se = ei.get(A);
      if (!se || se.id !== te || se.nr !== ge) {
        const ce = ne.anims.get(te);
        se = { id: te, nr: ge, p: ce ? new AnimationPlayer(ce) : null };
        if (se.p) {
          se.p.advance(0);
        }
        ei.set(A, se);
      }
      se.brugt = true;
      return se.p;
    }, ti = new Map(), ni = new Map(), ri = (A, te) => {
      if (!ni.has(A)) {
        const ge = Jl.get(te), se = ge ? new AnimationPlayer(ge) : null;
        if (se) {
          se.advance(0);
        }
        ni.set(A, se);
      }
      return ni.get(A);
    }, li = new Map(), ii = (A, te) => {
      if (!li.has(A)) {
        const ge = z.anims.get(te), se = ge ? new AnimationPlayer(ge) : null;
        if (se) {
          se.advance(Jt(0, 1e3));
        }
        li.set(A, se);
      }
      return li.get(A);
    }, y0 = gv(z), es = new Map(), g0 = (A, te, ge, se) => {
      let ce = es.get(te);
      if ((A.doer || 0) !== (ce ? ce.taeller : 0)) {
        const wt = z.anims.get(z.kat[4].aktiv[ge.feature]);
        ce = { taeller: A.doer || 0, spiller: wt ? new AnimationPlayer(wt) : null };
        if (ce.spiller) {
          ce.spiller.advance(0);
        }
        es.set(te, ce);
      }
      return ce && ce.spiller && !ce.spiller.finished ? ce.spiller : se;
    }, af = (A, te, ge, se) => {
      for (let ce = 0; ce < A.raekker; ce++) {
        const wt = se + ce * ar;
        if (!(wt <= -ar || wt >= x.skaerm.hoejde)) {
          for (let Te = 0; Te < A.kolonner; Te++) {
            const lt = A.felter[ce][Te];
            if (lt > 0) {
              drawSprite(Y, T, R, te + lt, ge + Te * ar, wt);
            }
          }
        }
      }
    }, uf = (A) => `rgb(${A[0]},${A[1]},${A[2]})`, Jt = (A, te) => A + Math.floor(Math.random() * (te - A + 1)), ff = (A, te) => {
      const ge = Jt(0, 5), se = x.skyer.typer[Math.min(ge, 2)], ce = ge === 1 ? x.skyer.mellem : x.skyer.store;
      A.sprite = ce[Jt(0, ce.length - 1)];
      A.x = te ? Jt(-32768, 131072) : -16384;
      A.y = Jt(se.y[0], se.y[1]);
      A.fart = Jt(se.fart[0], se.fart[1]);
    }, ts = Array.from({ length: x.skyer.antal }, () => {
      const A = {};
      ff(A, true);
      return A;
    }), cf = () => ts.sort((A, te) => A.fart - te.fart);
    cf();
    let ns = 0;
    const df = x.stjerner.flatMap((A) => Array.from({ length: A.antal }, () => ({ anim: A.anim, x: Jt(0, 1920), y: Jt(0, 1920) })));
    df.forEach((A, te) => {
      const ge = ri(`stjerne-${te}`, A.anim);
      if (ge) {
        ge.advance(Jt(0, 7e3));
      }
    });
    const Y = l.current.getContext("2d");
    let Zr, pf = performance.now(), hf = 0;
    const oi = (A) => {
      const te = A - pf;
      if (pf = A, advanceHotel(D, te), me.til(D.musik !== false), S.current != null) {
        // A minigame is running: this canvas is a transparent overlay that only shows the house sign
        // and, when opened from it, the home-menu windows.
        Y.clearRect(0, 0, x.skaerm.bredde, x.skaerm.hoejde);
        menuRegion = We.menuKnap(Y, WIDE_MINIGAMES.has(S.current) ? WIDTH_EXTRA : WIDTH_EXTRA / 2);
        if (menuRegion && !ovRef.current) {
          setSignBox((b) => b && b.x0 === menuRegion.x0 && b.y0 === menuRegion.y0 ? b : { ...menuRegion });
        }
        pe.tegn(Ye, Y, x.skaerm.bredde, x.skaerm.hoejde);
        if (ovRef.current !== pe.aaben) {
          ovRef.current = pe.aaben;
          setOv(pe.aaben);
        }
        Zr = requestAnimationFrame(oi);
        return;
      }
      if (ovRef.current) {
        ovRef.current = false;
        setOv(false);
      }
      for (const L of ni.values()) {
        if (L) {
          L.advance(te);
        }
      }
      for (const [L, B] of ql) {
        if (!B.brugt) {
          ql.delete(L);
          continue;
        }
        B.brugt = false;
        if (B.p) {
          B.p.advance(te);
        }
        if (B.aabn && (D.gaver || []).some((ee) => ee.id === L && ee.aabnet)) {
          B.aabn.advance(te);
        }
      }
      for (const [L, B] of ei) {
        if (!B.brugt) {
          ei.delete(L);
          continue;
        }
        B.brugt = false;
        if (B.p) {
          B.p.advance(te);
        }
      }
      if (D.praemier && D.praemier.length && !pe.aaben && U.navn === "hotel") {
        pe.aabn(mn.praemie(D.praemier.shift()));
      }
      for (const L of D.lyde.splice(0)) {
        if (U.navn === "hotel") {
          sr.spil(L);
        }
      }
      for (const [L, B] of ti) {
        if (!B.brugt) {
          ti.delete(L);
          continue;
        }
        B.brugt = false;
        if (B.p) {
          B.p.advance(te);
        }
      }
      for (const L of li.values()) {
        if (L) {
          L.advance(te);
        }
      }
      for (const L of es.values()) {
        if (L.spiller) {
          L.spiller.advance(te);
        }
      }
      if (U.navn === "kort") {
        Xo = pointLevel(D.hentet).antal;
        Vt.fremad(te, Ct);
        Vt.tegn(Y, { penge: D.penge, rubiner: 0 });
        M.current = [];
        menuRegion = We.menuKnap(Y);
        pe.tegn(Ye, Y, x.skaerm.bredde, x.skaerm.hoejde);
        Zr = requestAnimationFrame(oi);
        return;
      }
      we.fremad(te);
      re.tik(te);
      We.fremad(te, re.taler);
      const ge = pointLevel(D.hentet).antal;
      if (ge > Xo) {
        const L = e.hoveder.talerNiveauer.indexOf(ge);
        re.haendelse("stjerne", { v0: L + 1 });
        re.spilLyd(e.hoveder.stjerneLyd);
      }
      Xo = ge;
      for (const L of D.etager) {
        if (L.cafe) {
          for (const B of L.cafe.komfurer) {
            if (B.mad && B.mad.tilstand === 3 && !B.mad.meldt) {
              B.mad.meldt = true;
              re.haendelse("mad", { v0: 3 });
            }
          }
        }
      }
      for (D.kamMaal != null && (D.kam.y += (D.kamMaal - D.kam.y) * Math.min(1, te / 120), Math.abs(D.kamMaal - D.kam.y) < 1 && (D.kam.y = D.kamMaal, D.kamMaal = null)), ns += Math.min(250, te); ns >= 33;) {
        ns -= 33;
        for (const L of ts) {
          L.x += L.fart;
          if (L.x >= x.skyer.ude) {
            ff(L, false);
            cf();
          }
        }
      }
      const se = x.skaerm.bredde, ce = x.skaerm.hoejde, wt = hotelHeight(D);
      D.kam.x = Math.max(0, Math.min(qo - se, D.kam.x));
      D.kam.y = Math.max(0, Math.min(wt - ce, D.kam.y));
      const Te = Math.round(D.kam.x), lt = Math.round(D.kam.y), rs = Math.trunc(2 * lt / 3), yf = Math.trunc(-(rs - wt + Jo) / 6) - Jo;
      Y.fillStyle = uf(x.himmel.nat);
      Y.fillRect(0, 0, se, ce);
      Y.fillStyle = uf(x.himmel.dag);
      Y.fillRect(0, yf + 1024, se, 1024);
      for (let L = 0; L < se; L += 128) {
        drawSprite(Y, T, R, x.himmel.gradient, L, yf);
      }
      const gf = Math.trunc(Math.trunc(2 * Te / 3) / 2), vf = Math.trunc(rs / 2);
      df.forEach((L, B) => drawAnimation(Y, T, R, ri(`stjerne-${B}`, L.anim), L.x - gf, L.y - vf));
      drawSprite(Y, T, R, x.himmel.maane, Math.trunc(2 * qo / 3) - gf, 512 - vf);
      for (const L of ts) {
        drawSprite(Y, T, R, L.sprite, Math.trunc(L.x / x.skyer.skala[0]) - Math.trunc(2 * Te / 3), Math.trunc(L.y / x.skyer.skala[1]) - rs);
      }
      af(e.baggrund, x.baggrund.base, -Math.trunc(3 * Te / 4), -(Math.trunc(3 * m0 / 2) - wt + Math.trunc(3 * lt / 4) + Math.trunc(wt / 4)));
      af(e.forgrund, x.forgrund.base, -Te, wt - Jo - lt);
      D.etager.forEach((L, B) => {
        const ee = floorTopY(D, B) - lt;
        if (!(ee < 0 || ee - x.etage.hoejde > ce)) {
          drawSprite(Y, T, R, floorSprite(D, L), x.etage.x - Te, ee);
        }
      });
      const kf = ri("tag", x.tag), wf = x.etage.x - Te, xf = floorTopY(D, D.etager.length) - lt;
      drawAnimation(Y, T, R, kf, wf, xf);
      const Jr = [];
      if (getAnimationBounds(T, kf)) {
        const L = wf + Math.trunc(x.etage.bredde / 2), B = xf - 160, ee = ii("ramme", z.kat[16].film[0]);
        drawAnimation(Y, z.M, z.T.I, ee, L, B);
        const X = getAnimationBounds(z.M, ee);
        if (X) {
          Jr.push({ art: "ramme", x0: L + X.x0, y0: B + X.y0, x1: L + X.x1, y1: B + X.y1 });
        }
      }
      D.etager.forEach((L, B) => {
        const ee = kn(D, B) - lt;
        if (L.status !== "faerdig" || ee > ce || ee + x.etage.hoejde < 0) {
          return;
        }
        const X = (G) => z.kat[G.feature >= 0 ? G.type : Oc].z, le = L.moebler.map((G, Z) => ({ pl: G, idx: Z })).filter((G) => G.pl.feature >= 0 || Ac[G.pl.type]).sort((G, Z) => X(G.pl) - X(Z.pl));
        for (const { pl: G, idx: Z } of le) {
          if (G.feature < 0) {
            const [be, Ht] = Ac[G.type], St = ii(`${B}-${Z}-tom`, z.kat[Oc].film[be]), ss = x.etage.x + G.x + Ht - Te, as = ee + G.y;
            drawAnimation(Y, z.M, z.T.I, St, ss, as);
            const qr = getAnimationBounds(z.M, St);
            if (qr) {
              Jr.push({ nr: B, idx: Z, x0: ss + qr.x0, y0: as + qr.y0, x1: ss + qr.x1, y1: as + qr.y1 });
            }
            continue;
          }
          const Ee = z.kat[G.type].film[G.feature];
          let $e = ii(`${B}-${Z}-${Ee}`, Ee);
          if (G.type === 4) {
            $e = g0(L, B, G, $e);
          }
          const ve = x.etage.x + G.x - Te, ye = ee + G.y + y0(G.type, Ee);
          if (drawAnimation(Y, z.M, z.T.I, $e, ve, ye, false, G.leveres > 0 ? 0.35 : 1), G.type === 17 && !(G.leveres > 0)) {
            const be = pointLevel(D.hentet).antal;
            if (be > 10) {
              drawSprite(Y, z.M, z.T.I, 4441, ve, ye);
              e.skrift.tegn(Y, String(be), ve, ye - 18, { font: 1, midt: true, op: true });
            } else {
              const Ht = Math.trunc(254 / (be + 1));
              for (let St = 1; St <= be; St++) {
                drawSprite(Y, z.M, z.T.I, 4442, ve - 127 + Ht * St, ye);
              }
            }
          }
          const _e = getAnimationBounds(z.M, $e);
          if (!_e) {
            continue;
          }
          const xt = { nr: B, idx: Z, x0: ve + _e.x0, y0: ye + _e.y0, x1: ve + _e.x1, y1: ye + _e.y1 };
          if (Jr.push(xt), G.leveres > 0) {
            const be = (xt.x0 + xt.x1) / 2, Ht = (xt.y0 + xt.y1) / 2;
            drawAnimation(Y, z.M, z.T.I, ii("levering", z.levering), be - 28, Ht);
            Y.font = "bold 26px system-ui, sans-serif";
            Y.textAlign = "center";
            Y.lineWidth = 5;
            Y.strokeStyle = "rgba(20,14,26,.8)";
            Y.fillStyle = "#ffd46b";
            const St = `${Math.ceil(G.leveres / 1e3)} s`;
            Y.strokeText(St, be, Ht + 50);
            Y.fillText(St, be, Ht + 50);
          }
        }
      });
      const bt = x.moent, ls = bt.billede + Math.floor(A / (1e3 / bt.fps)) % bt.antal;
      D.etager.forEach((L, B) => {
        const ee = kn(D, B) - lt;
        if (!(!L.cafe || L.status !== "faerdig" || ee > ce || ee + x.etage.hoejde < 0)) {
          we.tegn(Y, L, B, x.etage.x - Te, ee, Jr, (X, le) => {
            const G = le - x.gaest.hoejde * bt.hoejde;
            Hi(Y, T, R, ls, X, G, bt.skala);
            g.current[B] = { x: X, y: G };
          });
        }
      });
      o.current = Jr;
      const ur = D.kd, Sf = [], si = D.etager.map((L, B) => ({ e: L, nr: B, top: kn(D, B) - lt })).filter(({ e: L, top: B }) => L.kaeledyr && L.status === "faerdig" && B < ce && B + x.etage.hoejde > 0);
      if (si.length && Rt(), ne.klar) {
        const L = ur.tavle;
        for (const { e: B, nr: ee, top: X } of si) {
          const le = B.kaeledyr.dyr, G = ur.dyr.film[le.nr].type, Z = x.etage.x - Te + Math.trunc(x.etage.bredde * L.tavlePos[0] / 100), oe = X + Math.trunc(x.etage.hoejde * L.tavlePos[1] / 100), Ee = x.etage.x - Te + Math.trunc(x.etage.bredde * L.hyldePos[0] / 100), $e = X + Math.trunc(x.etage.hoejde * L.hyldePos[1] / 100);
          drawAnimation(Y, ne.M, ne.I, yn(`${ee}-tavle`, L.film[G]), Z, oe);
          drawAnimation(Y, ne.M, ne.I, yn(`${ee}-hylde`, L.hylde[G]), Ee, $e);
          const ve = yn(`${ee}-pokal`, L.pokaler[G][petTrophyLevel(le.point)]);
          if (ve && !ve.startet) {
            ve.startet = true;
            ve.advance(Math.floor(Math.random() * 10001));
          }
          drawAnimation(Y, ne.M, ne.I, ve, Ee, $e);
          const ye = ne.M.sprites[L.tavleBillede].h, _e = -10, xt = 13;
          e.skrift.tegn(Y, le.navn, Z, oe + ye * L.navnDy / 100 + _e, { font: 2, midt: true, op: true });
          e.skrift.tegn(Y, `${L.niveauTekst}${petLevel(le.point)}`, Z, oe + ye * L.niveauDy / 100 + xt, { font: 2, midt: true, op: true });
          const be = L.bjaelke, Ht = Z + be.dx, St = oe + ye * be.dy / 100;
          Y.fillStyle = `rgb(${be.farve.join(",")})`;
          Y.fillRect(Ht, St, Math.trunc(be.bredde * le.bjaelke.v), be.hoejde);
          drawSprite(Y, ne.M, ne.I, L.bjaelkeBillede, Ht, St);
        }
        for (const { e: B, nr: ee, top: X } of si) {
          const le = B.kaeledyr, G = (Z, oe, Ee) => yn(`${ee}-bod${oe}-${Ee}`, ur.boder[Ee][Z.film][Z.type], Z.nr);
          le.boder.forEach((Z, oe) => {
            const Ee = x.etage.x - Te + Bi[oe], $e = X + $s, ve = G(Z, oe, "film");
            drawAnimation(Y, ne.M, ne.I, ve, Ee, $e);
            const ye = getAnimationBounds(ne.M, ve);
            if (ye) {
              Sf.push({ nr: ee, i: oe, felt: { x0: Ee + ye.x0 - 25, x1: Ee + ye.x1 + 25, y0: $e + ye.y0 - 25, y1: $e + ye.y1 + 25 } });
            }
          });
          le.varer.forEach((Z, oe) => {
            if (Z.aktiv) {
              return;
            }
            const Ee = ur.forbrug.film[Z.type][Z.f];
            drawAnimation(Y, ne.M, ne.I, yn(`${ee}-vare${oe}`, Ee), x.etage.x - Te + Bi[Z.type] + ur.forbrug.dx[Z.type], X + $s);
          });
          le.boder.forEach((Z, oe) => drawAnimation(Y, ne.M, ne.I, G(Z, oe, "forrest"), x.etage.x - Te + Bi[oe], X + $s));
        }
      }
      m.current = Sf;
      const gn = x.gave, Ef = [];
      for (const L of D.gaver || []) {
        let B = ql.get(L.id);
        if (!B) {
          const Z = Jl.get(gn.film), oe = Jl.get(gn.aabn[0][L.i]);
          B = { p: Z ? new AnimationPlayer(Z) : null, aabn: oe ? new AnimationPlayer(oe) : null };
          if (B.p) {
            B.p.advance(L.start);
          }
          if (B.aabn) {
            B.aabn.advance(0);
          }
          ql.set(L.id, B);
        }
        B.brugt = true;
        const ee = L.x - Te, X = floorTopY(D, L.etage) - lt;
        if (X < -100 || X - 100 > ce) {
          continue;
        }
        const le = { [gn.basis]: gn.skins[0][L.i] };
        drawAnimation(Y, T, R, B.p, ee, X, false, L.alfa.v / 255, giftHopScale(D, L), le);
        if (L.aabnet) {
          drawAnimation(Y, T, R, B.aabn, ee, X);
        }
        const G = !L.aabnet && getAnimationBounds(T, B.p, le);
        if (G) {
          Ef.push({ g: L, mx: ee, my: X, felt: { x0: ee + G.x0 - gn.tryk, x1: ee + G.x1 + gn.tryk, y0: X + G.y0 - gn.tryk, y1: X + G.y1 + gn.tryk } });
        }
      }
      a.current = Ef;
      const is = [];
      D.etager.forEach((L, B) => {
        const ee = kn(D, B) + x.gulvDy - lt;
        if (!(ee < -50 || ee - x.gaest.hoejde > ce)) {
          L.gaester.forEach((X) => {
            const le = $h(D, X)[X.anim ?? 1];
            let G = ti.get(X.id);
            if (!G || G.id !== le || G.anim !== X.anim) {
              const _e = Jl.get(le);
              G = { id: le, anim: X.anim, p: _e ? new AnimationPlayer(_e) : null };
              if (G.p) {
                G.p.advance(0);
              }
              ti.set(X.id, G);
            }
            G.brugt = true;
            const Z = x.etage.x + X.x - Te, oe = ee - (X.loeft ? X.loeft.v : 0), Ee = x.gaest.skala || 1;
            drawAnimation(Y, T, R, G.p, Z, oe, !!X.spejl, X.alfa ? X.alfa.v / 255 : 1, Ee);
            const $e = oe - x.gaest.hoejde * bt.hoejde, ve = getAnimationBounds(T, G.p), ye = ve ? { x0: Z + Ee * (X.spejl ? -ve.x1 : ve.x0) - 25, x1: Z + Ee * (X.spejl ? -ve.x0 : ve.x1) + 25, y0: oe + Ee * ve.y0 - 25, y1: oe + Ee * ve.y1 + 25 } : { x0: Z - 25, x1: Z + 25, y0: oe - 25, y1: oe + 25 };
            if (X.klar) {
              Hi(Y, T, R, ls, Z, $e, bt.skala);
              const _e = T.sprites[bt.billede];
              ye.x0 = Math.min(ye.x0, Z - _e.ox * bt.skala - 25);
              ye.x1 = Math.max(ye.x1, Z + (_e.w - _e.ox) * bt.skala + 25);
              ye.y0 = Math.min(ye.y0, $e - _e.oy * bt.skala - 25);
            }
            is.push({ nr: B, g: X, felt: ye, mx: Z, my: $e });
          });
        }
      });
      s.current = is;
      const Mf = [];
      if (ne.klar) {
        const L = ur.dyr;
        for (const { e: B, nr: ee, top: X } of si) {
          const le = B.kaeledyr.dyr, G = L.film[le.nr], Z = x.etage.x - Te + L.gulvDx + le.x, oe = X + L.gulvDy, Ee = yn(`${ee}-dyr`, G.film[le.film], le.animNr);
          drawAnimation(Y, ne.M, ne.I, Ee, Z, oe, !le.venstre, 1, L.skala);
          const $e = Z + L.bredde * 0.8 * L.skala, ve = oe - L.hoejde * 1.3 * L.skala;
          drawAnimation(Y, ne.M, ne.I, yn(`${ee}-boble`, L.behov[G.type][le.boble.film], le.boble), $e, ve);
          const ye = oe - L.hoejde * 1.3 * L.skala;
          if (le.klar) {
            Hi(Y, T, R, ls, Z, ye, L.skala / 2, le.moentAlfa.v / 255);
          }
          drawSprite(Y, ne.M, ne.I, L.smileys[petComfortLevel(D, B)], Z, oe - L.hoejde * L.skala);
          if (le.hjerte.vis) {
            drawAnimation(Y, ne.M, ne.I, yn(`${ee}-hjerte`, L.hjerte, le.hjerte), $e, ve);
          }
          const _e = getAnimationBounds(ne.M, Ee), xt = L.skala, be = _e ? { x0: Z + xt * (le.venstre ? _e.x0 : -_e.x1) - 25, x1: Z + xt * (le.venstre ? _e.x1 : -_e.x0) + 25, y0: oe + xt * _e.y0 - 25, y1: oe + xt * _e.y1 + 25 } : { x0: Z - 50, x1: Z + 50, y0: oe - 90, y1: oe + 25 };
          if (le.klar) {
            be.y0 = Math.min(be.y0, ye - 40);
          }
          Mf.push({ nr: ee, felt: be, mx: Z, my: ye });
        }
      }
      h.current = Mf;
      for (const L of is) {
        const B = L.g;
        if (B.vip == null || B.klar || !(B.visTil > D.tid)) {
          continue;
        }
        const ee = formatDuration(Math.max(0, Math.ceil(B.opholdTid / 1e3))), X = e.skrift.bredde(ee, 26, 2), le = L.mx - X / 2, G = L.my - x.vip.dy;
        Ye.sprite("ui", x.vip.ikon, le, G);
        e.skrift.tegn(Y, ee, L.mx, G + 13, { font: 2, midt: true });
      }
      const os = x.postkasse;
      drawAnimation(Y, T, R, ri("postkasse", os.film[0]), x.etage.x + Math.trunc(x.etage.bredde * os.x) - Te, kn(D, 0) + Math.trunc(x.etage.hoejde * os.y) - lt);
      M.current = We.tegn(Y, { penge: D.penge, rubiner: 0, point: D.hentet, synes: 0, nyPost: false, hoveder: re.tilstand });
      v.current.fremad(te);
      v.current.tegn(Y);
      menuRegion = We.menuKnap(Y);
      pe.tegn(Ye, Y, se, ce);
      if (A - hf > 150) {
        hf = A;
        n({ penge: Math.round(D.penge), hentet: Math.round(D.hentet), etager: D.etager.map((L) => ({ type: L.type, status: L.status, byggeTid: L.byggeTid, gaester: L.gaester.length, huer: L.cafe ? kitchenLevel(L.cafe.tjent) : null })) });
      }
      Zr = requestAnimationFrame(oi);
    };
    Zr = requestAnimationFrame(oi);
    const v0 = l.current, Xr = () => {
      if (!Ce) {
        serializeHotel(D);
      }
    }, k0 = setInterval(Xr, 5e3), mf = () => {
      if (document.visibilityState === "hidden") {
        Xr();
      }
    };
    window.addEventListener("beforeunload", Xr);
    document.addEventListener("visibilitychange", mf);
    return () => {
      registerNewsOpener(null);
      registerInfoOpener(null);
      cancelAnimationFrame(Zr);
      v0.removeEventListener("wheel", sf);
      window.removeEventListener("keydown", of);
      Xt.remove();
      re.stop();
      Vt.stop();
      me.stop();
      Xr();
      clearInterval(k0);
      window.removeEventListener("beforeunload", Xr);
      document.removeEventListener("visibilitychange", mf);
    };
  }, [e]);
  const E = (x) => {
    const T = l.current.getBoundingClientRect(), R = e.verden.skaerm.hoejde / T.height;
    return { x: (x.clientX - T.left) * R, y: (x.clientY - T.top) * R };
  }, N = () => c.current && c.current.scene.navn === "kort" ? c.current.kort.kam : r.current.kam, C = (x) => {
    const T = N(), R = c.current && c.current.menuer.top(), z = E(x), q = R ? c.current.menuer.traekStart(c.current.kit, z) : null;
    if (q) {
      q(z);
    }
    i.current = { p: z, x: T.x, y: T.y, flyttet: false, menu: R, rul: R && R.rul || 0, skyder: q };
    r.current.kamMaal = null;
    if (l.current.setPointerCapture) {
      l.current.setPointerCapture(x.pointerId);
    }
  }, I = (x) => {
    const T = i.current;
    if (!T || !r.current) {
      return;
    }
    const R = E(x);
    if (T.skyder) {
      T.skyder(R);
      return;
    }
    if (Math.hypot(R.x - T.p.x, R.y - T.p.y) > 8 && (T.flyttet = true), !T.flyttet) {
      return;
    }
    if (T.menu) {
      T.menu.rul = T.rul - (R.y - T.p.y);
      return;
    }
    const z = N();
    z.x = T.x - (R.x - T.p.x);
    z.y = T.y - (R.y - T.p.y);
  }, O = React.useMemo(() => ({ get penge() {
      return r.current ? r.current.penge : 0;
    }, brug(x) {
      const T = r.current;
      if (!T || T.penge < x) {
        return false;
      }
      T.penge -= x;
      return true;
    }, faa(x) {
      if (r.current) {
        r.current.penge += x;
      }
    } }), []), F = React.useMemo(() => e.status === "klar" ? { D: e.verden.moent, M: e.manifest, I: e.billeder } : null, [e]), V = (x = 0) => {
    S.current = null;
    f(null);
    const T = c.current;
    if (x > 0 && (r.current.penge += x, T.pengeLyd()), T.scene.navn = "kort", T.kort.vis(), T.musik.oe(), P.current) {
      const R = P.current;
      P.current = null;
      T.menuer.aabn(T.M[R]());
    }
  }, K = (x) => {
    k(x);
    setTimeout(() => k((T) => T === x ? null : T), 2500);
  }, W = React.useRef(K);
  W.current = K;
  const ae = (x) => {
    const T = r.current, R = e.verden, { kit: z, menuer: q, M: D, kort: Ce, scene: we } = c.current;
    if (q.klik(z, x)) {
      return;
    }
    if (!q.aaben && hitMenuButton(x)) {
      q.aabn(D.hovedmenu());
      return;
    }
    if (we.navn === "kort") {
      const U = Ce.klik(x);
      if (U && U.art === "rubiner") {
        q.aabn(D.rubiner());
      }
      return;
    }
    const re = [...M.current].reverse().find((U) => x.x >= U.x0 && x.x <= U.x1 && x.y >= U.y0 && x.y <= U.y1);
    if (re) {
      const U = R.skaerm.hoejde;
      if (re.navn === "tilToppen") {
        T.kamMaal = 0;
      } else if (re.navn === "tilLobbyen") {
        T.kamMaal = hotelHeight(T) - U;
      } else if (re.navn === "menu") {
        q.aabn(D.hovedmenu());
      } else if (re.navn === "plus" || re.navn === "rubin") {
        q.aabn(D.rubiner());
      } else if (re.navn === "post") {
        c.current.aabnPost();
      } else if (re.navn === "zoo") {
        c.current.startMinispil(11);
      } else if (re.navn === "udgang") {
        q.aabn(D.udgang());
      }
      return;
    }
    {
      const U = R.postkasse, me = e.manifest.sprites[U.billede], Ke = R.etage.x + Math.trunc(R.etage.bredde * U.x) - Math.round(T.kam.x), Ct = kn(T, 0) + Math.trunc(R.etage.hoejde * U.y) - Math.round(T.kam.y);
      if (me && x.x + 25 >= Ke - me.ox && x.x - 25 <= Ke - me.ox + me.w && x.y + 25 >= Ct - me.oy && x.y - 25 <= Ct - me.oy + me.h) {
        c.current.aabnPost();
        return;
      }
    }
    const We = (U, me, Ke) => v.current.tilfoej(U, me, Ke), Ye = a.current.find((U) => x.x >= U.felt.x0 && x.x <= U.felt.x1 && x.y >= U.felt.y0 && x.y <= U.felt.y1);
    if (Ye) {
      const U = openGift(T, Ye.g);
      if (U > 0) {
        u.current.spil(R.lyde.gave);
        We(U, Ye.mx, Ye.my);
      }
      return;
    }
    const pe = (U) => x.x >= U.felt.x0 && x.x <= U.felt.x1 && x.y >= U.felt.y0 && x.y <= U.felt.y1, ne = h.current.find(pe);
    if (ne) {
      const U = collectPetReward(T, T.etager[ne.nr]);
      if (U > 0) {
        We(U, ne.mx, ne.my);
      }
      if (T.nyPokal) {
        T.nyPokal = false;
        c.current.hoveder.haendelse("pokal");
      }
      return;
    }
    const Rt = [...s.current].reverse().find((U) => x.x >= U.felt.x0 && x.x <= U.felt.x1 && x.y >= U.felt.y0 && x.y <= U.felt.y1);
    if (Rt) {
      const U = T.etager[Rt.nr];
      if (Rt.g.klar) {
        const me = sv(T, U, Rt.g);
        if (me > 0) {
          We(me, Rt.mx, Rt.my);
        }
      } else if (av(T, U, Rt.g)) {
        c.current.hoveder.haendelse("gaest", { v0: Rt.g.vip });
      }
      return;
    }
    const he = [...o.current].reverse().find((U) => (U.art || T.etager[U.nr].moebler[U.idx].type !== 7) && x.x >= U.x0 && x.x <= U.x1 && x.y >= U.y0 && x.y <= U.y1);
    if (he && he.art === "ramme") {
      c.current.hoveder.haendelse("etageramme");
      q.aabn(D.etagebutik());
      return;
    }
    if (he && he.art) {
      const U = T.etager[he.nr].cafe;
      if (he.art === "mad" || he.art === "komfur" && U.komfurer[he.i].mad) {
        const me = U.komfurer[he.i].mad, Ke = me ? me.tilstand : -1, Ct = stoveAction(T.C, U, he.i);
        if (Ct === "fuldt") {
          c.current.hoveder.haendelse("mad", { v0: 5 });
        } else if (Ct === "ok" && Ke === 1) {
          c.current.hoveder.haendelse("mad", { v0: 2 });
        } else if (Ct === "ok" && Ke === 3) {
          c.current.hoveder.haendelse("mad", { v0: 4 });
        }
        return;
      }
      if (he.art === "komfur") {
        q.aabn(D.mad(U, he.i));
      } else if (he.art === "nytKomfur") {
        q.aabn(D.nytKomfur(U));
      } else if (he.art === "bord") {
        q.aabn(D.bord(U));
      } else if (he.art === "kok") {
        const me = collectCookIncome(T, U), Ke = g.current[he.nr];
        if (me > 0) {
          if (Ke) {
            We(me, Ke.x, Ke.y);
          }
        } else {
          q.aabn(D.kokke(U));
        }
      }
      return;
    }
    if (he && T.etager[he.nr].moebler[he.idx].type === 15) {
      c.current.hoveder.haendelse("pengeskab");
      q.aabn(D.pengeskab());
      return;
    }
    if (he) {
      q.aabn(D.inventar(T.etager[he.nr].moebler[he.idx]));
      return;
    }
    const sr = m.current.find(pe);
    if (sr) {
      q.aabn(D.bod(T.etager[sr.nr], sr.i));
      return;
    }
    const Qr = Math.round(T.kam.y), Ut = Math.round(T.kam.x), Xl = T.etager.findIndex((U, me) => {
      const Ke = kn(T, me) - Qr, Ct = e.manifest.sprites[R.moduler[R.start[1]].sprite].w;
      return U.status === "faerdig" && x.y >= Ke && x.y <= Ke + R.etage.hoejde && x.x >= R.etage.x - Ut && x.x <= R.etage.x - Ut + Ct;
    }), Vt = Xl >= 0 ? T.etager[Xl].moebler.find((U) => U.type === 7) : null;
    if (Vt) {
      q.aabn(D.inventar(Vt));
    }
  }, j = (x) => {
    const T = i.current;
    i.current = null;
    if (T && !T.flyttet && !T.skyder && x.type === "pointerup") {
      ae(E(x));
    }
  };
  if (e.status === "henter") {
    return J.jsx(LoadingScreen, {});
  }
  if (e.status === "fejl") {
    return J.jsxs("div", { className: "msg", children: ["Kunne ikke indlæse: ", e.fejl, ". Kør ", J.jsx("code", { children: "node Tools/export-spil.js" }), " først."] });
  }
  const _ = e.verden;
  const pct = (v, t) => `${v / t * 100}%`;
  return J.jsxs("div", { className: "spil uden-panel", style: { position: "relative" }, children: [d != null && J.jsx(MinigameAmbient, {}), d != null && J.jsx(MinigameHost, { nr: d, ui: e.ui, skrift: e.skrift, hud: e.hud, pung: O, moent: F, tilbage: V, ekstraPause: ov }), d != null && !ov && signBox && J.jsx("div", { className: "minispil-menuskilt", onPointerDown: () => {
      const cc = c.current;
      if (cc && !cc.menuer.aaben) {
        cc.menuer.aabn(cc.M.hovedmenu());
      }
    }, style: { position: "absolute", zIndex: 6, cursor: "pointer", left: pct(signBox.x0, _.skaerm.bredde), top: pct(Math.max(0, signBox.y0), _.skaerm.hoejde), width: pct(signBox.x1 - signBox.x0, _.skaerm.bredde), height: pct(signBox.y1 - Math.max(0, signBox.y0), _.skaerm.hoejde) } }), J.jsxs("div", { className: "skaerm", style: d != null ? { position: "absolute", left: 0, top: 0, right: 0, zIndex: 5, pointerEvents: ov ? "auto" : "none" } : void 0, children: [J.jsx("canvas", { ref: l, width: _.skaerm.bredde, height: _.skaerm.hoejde, style: d != null ? { background: "transparent", borderRadius: 0 } : void 0, onPointerDown: C, onPointerMove: I, onPointerUp: j, onPointerCancel: j }), p && J.jsx("div", { className: "besked", children: p }), y && J.jsx(LoadingScreen, { ud: true, efter: () => w(false) })] })] });
}
