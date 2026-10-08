import { AnimationPlayer } from '../engine/animation.js';
export function p1(e, t) {
  const n = [0, 1, 2].map((u) => e.skrifter[u]), r = (u) => n.filter((m) => m.linjeH >= u).sort((m, g) => m.linjeH - g.linjeH)[0] || n[0], l = (u) => u.charCodeAt(0), i = (u, h) => {
    let m = 0;
    for (const g of h) {
      const v = l(g) < 256 ? u.glyffer[l(g)] : null;
      m += v ? v[2] + u.kerning : u.mellemrum;
    }
    return m;
  };
  let o = null;
  const s = (u, h, m, g, v, c) => {
    const p = t[h.billede];
    if (!p) {
      return;
    }
    let k = g;
    for (const d of m) {
      const f = l(d) < 256 ? h.glyffer[l(d)] : null;
      if (f) {
        u.drawImage(p, f[0], f[1] * h.linjeH, f[2], h.hoejde, k, v, f[2] * c, h.hoejde * c);
        k += (f[2] + h.kerning) * c;
      } else {
        k += h.mellemrum * c;
      }
    }
  }, a = {
    linjer(u, h, m) {
      const g = r(h), v = h / g.linjeH, c = [];
      for (const p of String(u).split(`
`)) {
        if (!m) {
          c.push(p);
          continue;
        }
        let k = "";
        for (const d of p.split(" ")) {
          const f = k ? `${k} ${d}` : d;
          if (i(g, f) * v > m && k) {
            c.push(k);
            k = d;
          } else {
            k = f;
          }
        }
        c.push(k);
      }
      return c;
    },
    linjeStarter(u, h, m) {
      const g = e.skrifter[h], v = [0];
      let c = 0, p = -1;
      for (let k = 0; k < u.length; k++) {
        if (u[k] === " ") {
          p = k;
        }
        if (i(g, u.substring(c, k + 1)) > m && p > c) {
          c = p + 1;
          v.push(c);
        }
      }
      return v;
    },
    bredde(u, h, m = null) {
      const g = m != null && e.skrifter[m] ? e.skrifter[m] : r(h);
      return i(g, u) * (h ? h / g.linjeH : 1);
    },
    tegn(u, h, m, g, { str: v = null, font: c = null, midt: p = false, hoejre: k = false, bredde: d = 0, op: f = false, farve: y = null, alfa: w = 1 } = {}) {
      const S = c != null && e.skrifter[c] ? e.skrifter[c] : r(v || 30), P = v || (c != null ? S.linjeH : 30), M = P / S.linjeH, E = c != null ? String(h).split(`
`) : a.linjer(h, P, d), N = (S.linjeH + S.linjeafstand) * M;
      E.forEach((C, I) => {
        const O = i(S, C) * M, F = p ? m - O / 2 : k ? m - O : m, V = (f ? g : g - S.hoejde * M / 2) + I * N;
        if (!y) {
          u.save();
          u.globalAlpha *= w;
          s(u, S, C, F, V, M);
          u.restore();
          return;
        }
        if (!o) {
          o = document.createElement("canvas");
        }
        o.width = Math.ceil(O) + 2;
        o.height = Math.ceil(S.hoejde * M) + 2;
        const K = o.getContext("2d");
        s(K, S, C, 0, 0, M);
        K.globalCompositeOperation = "source-atop";
        K.globalAlpha = 0.6;
        K.fillStyle = y;
        K.fillRect(0, 0, o.width, o.height);
        u.save();
        u.globalAlpha *= w;
        u.drawImage(o, F, V);
        u.restore();
      });
      return E.length * N;
    }
  };
  return a;
}
export function h1({ V: e, nr: t, pakke: n, laes: r = () => {
}, lukket: l = null }) {
  const i = e.nr[t];
  let o = 0, s = null, a = performance.now();
  r(i.script, o);
  return { titel: e.titel, lukket: l, tegn(u, h) {
      const m = performance.now(), g = Math.min(250, m - a);
      a = m;
      const v = i.sider[o];
      if (s) {
        s.advance(g);
      } else {
        const c = u.pakker[n] && u.pakker[n].anims.get(v.film);
        s = c ? new AnimationPlayer(c) : null;
        if (s) {
          s.advance(0);
        }
      }
      u.anim(n, s, h.x + e.film.x, h.y + e.film.y, e.film.skala);
      u.tekst(v.tekst, h.x + e.tekst.x + e.tekst.w / 2, h.y + e.tekst.y + 8, { midt: true, bredde: e.tekst.w - 128, str: 22, op: true });
      if (o < i.sider.length - 1) {
        u.spriteKnap(e.naeste.ikon, h.x + e.naeste.x, h.y + e.naeste.y, () => {
          o += 1;
          s = null;
          r(i.script, o);
        }, { bag: e.naeste.bag });
      }
    } };
}
