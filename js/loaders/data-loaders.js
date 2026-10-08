import { GAME_WIDTH } from '../engine/constants.js';
import React from 'react';
import { soundUrl, Ln, Gh, getVolume, onVolumeChange } from '../audio/audio.js';
import { p1 } from '../ui/panels.js';
import { createTextureLoader } from '../render/canvas-helpers.js';
export const pk = { baand: 972, jingle: 976, boble: 979, forkert: 982, slip: 1018 }, hk = { klik: 1012, tabt: 1013, vundet: 976 }, mk = { vaelg: 975, bag: 1016, tilfaeldig: 1010, vundet: 976 }, yk = { hop: 1079, hop1: 1080, hop2: 1081, hop3: 1076, forvandl: 1104, nej: 1094, tramp: 1077, mynt: 1111, slag: 1109, doed: 1078, maal: 1117, fjendehop: 1113, skud: 1114, pigge: 1097 }, gk = { skub: 1018, kugle: 978, topping: 992, faerdig: 976 }, vk = { baand: 973, fly: 1008, pilotTryk: 1009, ud: 977, ud2: 1014, ramt: 1010, penge: 976, pilot: 1011 }, kk = { byt: 1019, vundet: 976, rigtig: 1017, koer: 1e3, tomgang: 1001, bremse: 996 }, wk = { haardt: 985, mellem: 986, blødt: 984, vaeg: 986, hul: 993, jubel: 995, vundet: 976 }, xk = { motor: 981, penge: 976, kiste: 1015 };
export function rd(e, t = "data/lyd") {
  const n = new Map();
  let r = true;
  for (const o of e) {
    const s = new Audio(soundUrl(t, o));
    s.preload = "auto";
    n.set(o, s);
  }
  const l = new Map(), i = new Map();
  return { spil(o, s = 1) {
      const a = n.get(o);
      if (!a || !r) {
        return;
      }
      const u = Ln(a.cloneNode(), a.src);
      u.play().catch(() => {
      });
      i.set(o, u);
    }, spiller(o) {
      const s = i.get(o);
      return !!s && !s.paused && !s.ended;
    }, spilStyrke(o, s) {
      const a = n.get(o);
      if (!a || !r) {
        return;
      }
      const u = Ln(a.cloneNode(), a.src, s);
      u.play().catch(() => {
      });
      i.set(o, u);
    }, loekke(o, s = 0.5) {
      if (!r || l.has(o)) {
        return;
      }
      const a = n.get(o);
      if (!a) {
        return;
      }
      const u = a.cloneNode();
      u.loop = true;
      Ln(u, a.src);
      u.play().catch(() => {
      });
      l.set(o, u);
    }, volumen(o, s) {
      const a = l.get(o);
      if (a) {
        Ln(a, a.src, Math.max(0, Math.min(1, s)));
      }
    }, stop(o) {
      const s = l.get(o);
      if (s) {
        s.pause();
        l.delete(o);
      }
    }, stopAlle() {
      for (const o of l.values()) {
        o.pause();
      }
      l.clear();
    }, saetTil(o) {
      r = o;
      if (!o) {
        this.stopAlle();
      }
    } };
}
// Theme music started from the start screen ("START SPIL" click) and handed on to the game's music player.
export const themeHandoff = { audio: null, file: null };
export function prepareThemeMusic(musik) {
  const file = musik.spil[0];
  const audio = new Audio(`data/musik/${file}.mp3`);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = Math.min(1, musik.lydstyrke * Gh * getVolume() * 2);
  themeHandoff.audio = audio;
  themeHandoff.file = file;
}
// Tries to play right away; browsers block that until the user has interacted with the page,
// so on failure it retries on the first click/key/touch anywhere.
export function startThemeMusic() {
  const a = themeHandoff.audio;
  if (!a || !a.paused) {
    return;
  }
  a.play().catch(() => {
    const retry = () => {
      window.removeEventListener("pointerdown", retry, true);
      window.removeEventListener("keydown", retry, true);
      window.removeEventListener("touchend", retry, true);
      if (a.paused) {
        a.play().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", retry, true);
    window.addEventListener("keydown", retry, true);
    window.addEventListener("touchend", retry, true);
  });
}
export function x1(e) {
  let t = null, n = true;
  const r = () => n ? Math.min(1, e.lydstyrke * Gh * getVolume() * 2) : 0, l = onVolumeChange(() => {
    if (t) {
      t.volume = r();
    }
  }), i = () => {
    if (!(!t || document.hidden)) {
      t.play().catch(() => {
        const a = () => {
          window.removeEventListener("pointerdown", a);
          window.removeEventListener("keydown", a);
          i();
        };
        window.addEventListener("pointerdown", a);
        window.addEventListener("keydown", a);
      });
    }
  }, o = (a, u) => {
    if (t) {
      t.pause();
      t.src = "";
      t = null;
    }
    if (a) {
      if (themeHandoff.audio && themeHandoff.file === a && u) {
        t = themeHandoff.audio;
        themeHandoff.audio = null;
      } else {
        t = new Audio(`data/musik/${a}.mp3`);
      }
      t.loop = u;
      t.volume = r();
      i();
    }
  }, s = () => {
    if (t) {
      if (document.hidden) {
        t.pause();
      } else if (!t.ended) {
        i();
      }
    }
  };
  document.addEventListener("visibilitychange", s);
  return { spil(a) {
      o(e.spil[a], true);
    }, oe() {
      o(e.oe, false);
    }, til(a) {
      if (a !== n) {
        n = a;
        if (t) {
          t.volume = r();
        }
      }
    }, stop() {
      o(null);
      l();
      document.removeEventListener("visibilitychange", s);
    }, info() {
      return t && { fil: t.src.split("/").pop(), spiller: !t.paused, tid: Math.round(t.currentTime), loekke: t.loop, lydstyrke: t.volume };
    } };
}
export function useGameData() {
  const [e, t] = React.useState({ status: "henter" });
  React.useEffect(() => {
    let n = false;
    (async () => {
      try {
        const [r, l, i, o, s, a, u, h, m, g, v, c, p, k, d, f, y, w, S, P, M, E, N] = await Promise.all([fetch("data/hotel/verden.json").then((_) => _.json()), fetch("data/hotel/manifest.json").then((_) => _.json()), fetch("data/hotel/forgrund.json").then((_) => _.json()), fetch("data/hotel/baggrund.json").then((_) => _.json()), fetch("data/moebler/moebler.json").then((_) => _.json()), fetch("data/moebler/manifest.json").then((_) => _.json()), fetch("data/cafe/cafe.json").then((_) => _.json()), fetch("data/cafe/manifest.json").then((_) => _.json()), fetch("data/hud/hud.json").then((_) => _.json()), fetch("data/hud/manifest.json").then((_) => _.json()), fetch("data/ui/ui.json").then((_) => _.json()), fetch("data/ui/manifest.json").then((_) => _.json()), fetch("data/skrift/skrift.json").then((_) => _.json()), fetch("data/skrift/manifest.json").then((_) => _.json()), fetch("data/hoveder/hoveder.json").then((_) => _.json()), fetch("data/kort/kort.json").then((_) => _.json()), fetch("data/kort/manifest.json").then((_) => _.json()), fetch("data/kort/forgrund.json").then((_) => _.json()), fetch("data/kort/baggrund.json").then((_) => _.json()), fetch("data/vejledning/tekster.json").then((_) => _.json()), fetch("data/vejledning/manifest.json").then((_) => _.json()), fetch("data/musik/musik.json").then((_) => _.json()), fetch("data/kaeledyr/kaeledyr.json").then((_) => _.json())]), C = {};
        await Promise.all(p.skrifter.map((_) => new Promise((x) => {
          const T = k.sprites[_.billede], R = new Image();
          R.onload = () => {
            C[_.billede] = R;
            x();
          };
          R.onerror = () => x();
          R.src = `data/skrift/tex/${k.textures[T.assetId].file}`;
        })));
        const I = p1(p, C), O = { U: v, M: c, T: createTextureLoader("data/ui", c) }, F = { H: m, M: g, T: createTextureLoader("data/hud", g) }, V = { K: f, M: y, T: createTextureLoader("data/kort", y), forgrund: w, baggrund: S }, K = { V: P.vejledning, M, anims: new Map(M.animations.map((_) => [_.id, _])), T: createTextureLoader("data/vejledning", M) }, W = { C: u, M: h, anims: new Map(h.animations.map((_) => [_.id, _])), T: createTextureLoader("data/cafe", h) }, ae = { ...s, kat: Object.fromEntries(s.kategorier.map((_) => [_.type, _])), M: a, anims: new Map(a.animations.map((_) => [_.id, _])), T: createTextureLoader("data/moebler", a) }, j = {};
        await Promise.all(Object.entries(l.textures).map(([_, x]) => new Promise((T) => {
          const R = new Image();
          R.onload = () => {
            j[_] = R;
            T();
          };
          R.onerror = () => T();
          R.src = `data/hotel/tex/${x.file}`;
        })));
        if (!n) {
          t({ status: "klar", verden: { ...r, skaerm: { ...r.skaerm, bredde: GAME_WIDTH } }, manifest: l, forgrund: i, baggrund: o, billeder: j, moebler: ae, cafe: W, hud: F, ui: O, skrift: I, hoveder: d, kort: V, vejledning: K, musik: E, kaeledyr: N });
        }
      }
      catch (r) {
        if (!n) {
          t({ status: "fejl", fejl: r.message });
        }
      }
    })();
    return () => {
      n = true;
    };
  }, []);
  return e;
}
