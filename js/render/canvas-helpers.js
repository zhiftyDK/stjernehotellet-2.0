import { HUD_SHIFT, WIDTH_EXTRA } from '../engine/constants.js';
import { AnimationPlayer } from '../engine/animation.js';
export function drawSpriteFrame(e, t, n, r = 1, l = false) {
  const i = (n.flags & 65535) === 65280, o = !i && (n.flags & 1) > 0, s = i ? 0 : (n.flags & 6) >> 1, a = i ? 1 : ((n.flags & 65280) >> 8) / 255;
  e.save();
  if (s) {
    e.rotate(s * Math.PI / 2);
  }
  if (l !== o) {
    e.scale(-1, 1);
  }
  e.globalAlpha = Math.max(0, Math.min(1, e.globalAlpha * r * a));
  e.drawImage(t, n.u, n.v, n.w, n.h, -n.ox, -n.oy, n.w, n.h);
  e.restore();
}
export function drawSprite(e, t, n, r, l, i, o = 1) {
  const s = t.sprites[r], a = s && n[s.assetId];
  if (a) {
    e.save();
    e.translate(l, i);
    drawSpriteFrame(e, a, s, o);
    e.restore();
  }
}
export function drawAnimation(e, t, n, r, l, i, o = false, s = 1, a = 1, u = null) {
  if (r) {
    e.save();
    e.translate(l, i);
    if (o || a !== 1) {
      e.scale(o ? -a : a, a);
    }
    for (const h of r.drawList("invers")) {
      const m = t.sprites[u && u[h.sprite] || h.sprite], g = m && n[m.assetId];
      if (g) {
        e.save();
        e.translate(h.x, h.y);
        e.rotate((h.rot || 0) * Math.PI * 2);
        e.scale(h.scaleX * (h.flip ? -1 : 1), h.scaleY);
        drawSpriteFrame(e, g, m, h.alpha * s);
        e.restore();
      }
    }
    e.restore();
  }
}
export function getAnimationBounds(e, t, n = null) {
  let r = 1 / 0, l = 1 / 0, i = -1 / 0, o = -1 / 0;
  if (t) {
    for (const s of t.drawList("invers")) {
      const a = e.sprites[n && n[s.sprite] || s.sprite];
      if (!a) {
        continue;
      }
      const u = Math.abs(s.scaleX), h = Math.abs(s.scaleY), m = s.x - a.ox * u, g = s.y - a.oy * h;
      r = Math.min(r, m);
      l = Math.min(l, g);
      i = Math.max(i, m + a.w * u);
      o = Math.max(o, g + a.h * h);
    }
  }
  return r === 1 / 0 ? null : { x0: r, y0: l, x1: i, y1: o };
}
export function createTextureLoader(e, t) {
  const n = new Map(), r = new Set();
  let l = null;
  const i = () => {
    if (!l) {
      l = setTimeout(() => {
        l = null;
        r.forEach((s) => s());
      }, 40);
    }
  }, o = (s) => {
    const a = n.get(s);
    if (a) {
      return a.complete && a.naturalWidth ? a : null;
    }
    const u = t.textures[s];
    if (!u) {
      return null;
    }
    const h = new Image();
    h.onload = i;
    h.src = `${e}/tex/${u.file}`;
    n.set(s, h);
    return null;
  };
  return { I: new Proxy({}, { get: (s, a) => typeof a == "string" ? o(a) : void 0 }), lyt: (s) => {
      r.add(s);
      return () => r.delete(s);
    } };
}
const POINT_LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3e3, 6e3, 12e3, 25e3, 5e4];
export function pointLevel(e) {
  const t = POINT_LEVEL_THRESHOLDS.filter((l) => e >= l).length - 1, n = POINT_LEVEL_THRESHOLDS[t], r = POINT_LEVEL_THRESHOLDS[t + 1];
  return { antal: t, fremskridt: r ? (e - n) / (r - n) : 1 };
}
function createAnimationCache(e) {
  const t = new Map(e.animations.map((l) => [l.id, l])), n = new Map(), r = (l) => {
    if (!n.has(l)) {
      const i = t.get(l), o = i ? new AnimationPlayer(i) : null;
      if (o) {
        o.advance(0);
      }
      n.set(l, o);
    }
    return n.get(l);
  };
  r.fremad = (l) => {
    for (const i of n.values()) {
      if (i) {
        i.advance(l);
      }
    }
  };
  return r;
}
export function createFigureOverlay(e, t, n, extra = 0) {
  const r = createAnimationCache(e);
  let l = n.y.skjult;
  return { fremad(i, o) {
      r.fremad(i);
      const s = o ? n.y.synlig : n.y.skjult, a = Math.abs(n.y.skjult - n.y.synlig) / (n.y.billeder * (1e3 / 30)) * i;
      l = s > l ? Math.min(s, l + a) : Math.max(s, l - a);
    }, tegn(i, o = [0, 0]) {
      if (l >= n.y.skjult) {
        return;
      }
      const [s, a] = n.figurer, u = s.x;
      drawAnimation(i, e, t, r(a.film[o[1] ? 1 : 0]), a.x + u + extra, l);
      drawAnimation(i, e, t, r(s.film[o[0] ? 1 : 0]), s.x - u, l);
    } };
}
export function drawCurrencyHud(e, t, n, r, l, i, o = 0) {
  const s = t.billeder;
  e.save();
  e.translate(-HUD_SHIFT, 0);
  for (const a of ["tavle", "rubin", "moent", "plus"]) {
    drawSprite(e, n, r, s[a].sprite, s[a].x, s[a].y);
  }
  if (l) {
    for (const [a, [u, h, , m]] of [[i, t.tekst.penge], [o, t.tekst.rubiner]]) {
      l.tegn(e, String(Math.round(a)), u, h + m / 2, { str: 37 });
    }
  }
  e.restore();
}
export function createHudRenderer(e, t, n, r, l = null) {
  const i = createAnimationCache(t), o = l ? createFigureOverlay(t, n, l, WIDTH_EXTRA) : null, s = (u) => `rgb(${u[0]},${u[1]},${u[2]})`, a = (u, h, [m, g, v, c], { str: p = 37, midt: k = false } = {}) => {
    r.tegn(u, h, k ? m + v / 2 : m, g + c / 2, { str: p, midt: k });
  };
  return { fremad(u, h = false) {
      i.fremad(u);
      if (o) {
        o.fremad(u, h);
      }
    }, menuKnap(u, shift = WIDTH_EXTRA) {
      const f = e.skilte, M = i(f.menu), S = f.x + f.dx + shift, P = f.y;
      drawAnimation(u, t, n, M, S, P);
      const E = getAnimationBounds(t, M);
      return E ? { navn: "menu", x0: S + E.x0, y0: P + E.y0, x1: S + E.x1, y1: P + E.y1 } : null;
    }, tegn(u, h) {
      const m = e.billeder, g = [];
      let off = 0;
      const v = (y) => {
        const w = m[y];
        drawSprite(u, t, n, w.sprite, w.x, w.y);
        const S = t.sprites[w.sprite];
        if (S) {
          g.push({ navn: y, x0: w.x - S.ox + off, y0: w.y - S.oy, x1: w.x - S.ox + S.w + off, y1: w.y - S.oy + S.h });
        }
      }, c = (y, w, S, P) => {
        const M = i(w);
        drawAnimation(u, t, n, M, S, P);
        const E = getAnimationBounds(t, M);
        if (E) {
          g.push({ navn: y, x0: S + E.x0 + off, y0: P + E.y0, x1: S + E.x1 + off, y1: P + E.y1 });
        }
      };
      u.save();
      u.translate(-HUD_SHIFT, 0);
      off = -HUD_SHIFT;
      v("tavle");
      v("rubin");
      v("moent");
      v("plus");
      a(u, String(Math.round(h.penge)), e.tekst.penge);
      a(u, String(h.rubiner), e.tekst.rubiner);
      const p = pointLevel(h.point), k = e.bjaelkeFelt;
      u.fillStyle = s(k.bag);
      u.fillRect(k.x, k.y, k.w, k.h);
      u.fillStyle = s(k.fyld);
      u.fillRect(k.x, k.y, Math.round(k.w * p.fremskridt), k.h);
      v("bjaelke");
      v("bjaelkeKant");
      v("bedoemmelse");
      a(u, String(Math.round(h.point)), [e.tekst.point[0], k.y - 8, e.tekst.point[2], k.h + 16], { str: 27, midt: true });
      const d = m.stjerne;
      u.save();
      if (p.antal < 1) {
        u.globalAlpha = 0.5;
      }
      drawSprite(u, t, n, d.sprite, d.x, d.y);
      u.restore();
      if (p.antal >= 1) {
        a(u, String(p.antal), [d.x + 9, d.y + 9, 45, 46], { str: 27, midt: true });
      }
      a(u, String(h.synes), [e.tekst.synes[0], 0, e.tekst.synes[2], 44], { str: 27, midt: true });
      u.restore();
      off = 0;
      if (o) {
        o.tegn(u, h.hoveder);
      }
      u.save();
      u.translate(WIDTH_EXTRA, 0);
      off = WIDTH_EXTRA;
      v("tilToppen");
      v("tilLobbyen");
      u.restore();
      off = 0;
      u.save();
      u.translate(-HUD_SHIFT, 0);
      off = -HUD_SHIFT;
      c("post", e.post.film[h.nyPost ? 1 : 0], e.post.x, e.post.y);
      u.restore();
      off = 0;
      const f = e.skilte;
      u.save();
      u.translate(WIDTH_EXTRA, 0);
      off = WIDTH_EXTRA;
      c("zoo", f.zoo, f.x - f.dx, f.y);
      c("udgang", f.udgang[0], f.x, f.y);
      u.restore();
      off = 0;
      return g;
    } };
}
