import { HUD_SHIFT, GAME_WIDTH, WIDTH_EXTRA } from '../engine/constants.js';
import { AnimationPlayer } from '../engine/animation.js';
import { drawSpriteFrame, createFigureOverlay, drawSprite, drawAnimation } from './canvas-helpers.js';
import { Ln, soundUrl } from '../audio/audio.js';
const Mv = Math.round((GAME_WIDTH - 1024) / 2), randomInt = (e, t) => e + Math.floor(Math.random() * (t - e + 1));
class ScriptInterpreter {
  constructor(t) {
    this.kode = t;
    this.e();
  }
  e() {
    const t = this.kode[0];
    this.pladser = new Array(t).fill(null);
    this.vars = new Array(10).fill(0);
    this.f();
  }
  f() {
    this.pc = 1;
    this.venterAnim = -1;
    this.ventTil = 0;
    this.venterLyd = -1;
    this.tid = 0;
  }
  optaget() {
    return this.ventTil > 0 || this.venterAnim >= 0 || this.venterLyd >= 0;
  }
  faerdig() {
    return this.pc >= this.kode.length && !this.optaget();
  }
  tik(t, n) {
    if (this.faerdig()) {
      return true;
    }
    this.tid += t;
    const r = this.kode;
    if (this.optaget()) {
      if (this.ventTil && this.ventTil < this.tid && (this.ventTil = 0), this.venterAnim >= 0) {
        const l = this.pladser[this.venterAnim];
        if (!l || !l.spiller || l.spiller.finished) {
          this.venterAnim = -1;
        }
      }
      if (this.venterLyd >= 0 && !n.lydSpiller(this.venterLyd)) {
        this.venterLyd = -1;
      }
    } else {
      let l = true;
      for (; l && this.pc < r.length;) {
        const i = this.pc;
        switch (r[i]) {
          case 0:
            this.ventTil = this.tid + r[i + 1] * 10;
            this.pc += 2;
            break;
          case 1:
            this.pc += 1;
            l = false;
            break;
          case 2: {
            const o = r[i + 2], s = n.anims.get(r[i + 1]), a = s ? new AnimationPlayer(s) : null;
            if (a) {
              a.advance(0);
            }
            this.pladser[o] = { id: r[i + 1], spiller: a, x: (n.forskydning !== undefined ? n.forskydning : Mv) + (r[i + 3] & 65535) * 1024 / 65536, y: (r[i + 4] & 65535) * 768 / 65536 };
            this.pc += 6;
            break;
          }
          case 3: {
            const o = r[i + 1];
            if (this.venterAnim === o) {
              this.venterAnim = -1;
            }
            if (this.pladser[o]) {
              this.pladser[o] = null;
            }
            this.pc += 2;
            break;
          }
          case 4:
            this.venterAnim = r[i + 1];
            this.pc += 2;
            break;
          case 5:
            n.spilLyd(r[i + 1]);
            this.lyd = r[i + 1];
            this.pc += 2;
            l = false;
            break;
          case 6:
            n.stopLyd(r[i + 1]);
            this.pc += 2;
            break;
          case 7:
            this.venterLyd = r[i + 1];
            this.pc += 2;
            break;
          case 8: {
            const o = this.vars[r[i + 1]], s = r[i + 2], a = r[i + 3];
            if (!(s === 0 ? o > a : s === 1 ? o < a : s === 2 ? o === a : s === 3 && o !== a)) {
              this.pc += r[i + 4];
            }
            this.pc += 5;
            break;
          }
          case 20:
          case 22:
            this.pc += 1;
            break;
          case 10:
          case 11:
            if (n.figur) {
              n.figur(r[i + 1], r[i] === 10 ? 1 : 0);
            }
            this.pc += 2;
            break;
          default:
            this.pc += 2;
            break;
        }
      }
    }
    for (const l of this.pladser) {
      if (l && l.spiller) {
        l.spiller.advance(t);
      }
    }
    return this.faerdig();
  }
  afbryd(t) {
    if (this.lyd !== void 0) {
      t.stopLyd(this.lyd);
    }
    this.e();
  }
}
export class ScriptedCharacter {
  constructor({ liste: t, hvile: n, tilfaeldig: r, anims: l, manifest: i = null, images: o = {}, lydSti: s = "data/lyd", antalHvile: a = 3, forskydning: fs }) {
    this.forskydning = fs;
    this.anims = l;
    this.manifest = i;
    this.images = o;
    this.lydSti = s;
    this.lydTil = true;
    this.lyde = new Map();
    this.scripts = t.map((u) => new ScriptInterpreter(u));
    this.hvile = n >= 0 ? this.scripts[n] : null;
    this.tilfaeldig = this.scripts[r];
    this.antalHvile = a;
    this.nu = 0;
    this.fVar = 0;
    this.tilHvile();
  }
  tilHvile() {
    this.cur = this.hvile;
    if (this.hvile) {
      this.hvile.vars[0] = randomInt(0, 3);
    }
    this.timer = this.nu + randomInt(15e3, 23e3);
    this.iHvile = true;
    this.afbrydelig = true;
  }
  spil(t, n = true, r = true) {
    const l = this.scripts[t];
    if (!(!l || this.cur === l || !this.afbrydelig)) {
      if ((r || this.cur === this.tilfaeldig) && this.cur) {
        this.cur.afbryd(this);
      }
      this.iHvile = false;
      this.cur = l;
      this.afbrydelig = n;
      l.e();
    }
  }
  skift(t, n) {
    if (this.cur) {
      this.cur.afbryd(this);
    }
    this.hvile = t >= 0 ? this.scripts[t] : null;
    this.tilfaeldig = this.scripts[n];
    if (this.hvile) {
      this.hvile.e();
    }
    this.tilHvile();
  }
  startForfra(t, n = {}) {
    const r = this.scripts[t];
    if (r) {
      if (this.cur) {
        this.cur.afbryd(this);
      }
      this.iHvile = false;
      this.cur = r;
      this.afbrydelig = true;
      r.e();
      for (const [l, i] of Object.entries(n)) {
        r.vars[l] = i;
      }
      this.slump();
    }
  }
  saet(t, n) {
    if (this.cur) {
      this.cur.vars[t] = n;
    }
  }
  slump(t = 0) {
    for (const n of [5, 7, 8, 9]) {
      this.saet(n, randomInt(0, 98));
    }
    this.saet(6, 0);
    this.tik(t);
  }
  optaget() {
    return !this.iHvile;
  }
  get taler() {
    return !!this.cur && this.cur !== this.hvile;
  }
  poke() {
    if (this.iHvile && this.cur !== this.tilfaeldig) {
      this.timer = this.nu + randomInt(15e3, 23e3);
    }
  }
  spring() {
    if (!(this.cur === this.hvile || this.cur === this.tilfaeldig)) {
      this.cur.afbryd(this);
      this.tilHvile();
    }
  }
  tik(t) {
    if (this.nu += t, this.koe && this.koe.length && !this.optaget() && (this.spil(this.koe.shift()), this.slump()), this.iHvile && this.nu >= this.timer) {
      this.cur = this.tilfaeldig;
      this.saet(0, this.fVar);
      for (const n of [5, 7, 8, 9]) {
        this.saet(n, randomInt(0, 98));
      }
      this.cur.f();
      this.timer = this.nu + 23e3;
      if (this.hvile) {
        this.hvile.vars[0] = randomInt(0, this.antalHvile - 1);
      }
      this.iHvile = true;
      this.afbrydelig = true;
    }
    if (this.cur && this.cur.tik(t, this)) {
      if (this.cur === this.tilfaeldig || !this.iHvile) {
        this.tilHvile();
      } else {
        this.cur.f();
      }
    }
  }
  tegn(t, n = [], r = -1) {
    if (!(!this.cur || !this.manifest)) {
      this.cur.pladser.forEach((l, i) => {
        if (!(!l || !l.spiller || n.includes(i))) {
          for (const o of l.spiller.drawList("invers")) {
            if (o.sprite === r) {
              continue;
            }
            const s = this.manifest.sprites[o.sprite], a = s && this.images[s.assetId];
            if (a) {
              t.save();
              t.translate(l.x + o.x, l.y + o.y);
              t.rotate((o.rot || 0) * Math.PI * 2);
              t.scale(o.scaleX * (o.flip ? -1 : 1), o.scaleY);
              drawSpriteFrame(t, a, s, o.alpha);
              t.restore();
            }
          }
        }
      });
    }
  }
  pladsAnim(t) {
    const n = this.cur && this.cur.pladser[t];
    return n ? n.id : -1;
  }
  kaede(t) {
    this.koe = [...t];
  }
  introAktiv() {
    return this.koe && this.koe.length > 0 || this.optaget();
  }
  spilLyd(t) {
    if (!this.lydTil) {
      return;
    }
    this.stopLyd(t);
    const n = Ln(new Audio(soundUrl(this.lydSti, t)), soundUrl(this.lydSti, t));
    n.play().catch(() => {
      this.lyde.delete(t);
    });
    this.lyde.set(t, n);
  }
  stopLyd(t) {
    const n = this.lyde.get(t);
    if (n) {
      n.pause();
      this.lyde.delete(t);
    }
  }
  lydSpiller(t) {
    const n = this.lyde.get(t);
    return !!n && !n.ended && !n.error;
  }
  saetLyd(t) {
    if (this.lydTil = t, !t) {
      for (const n of [...this.lyde.keys()]) {
        this.stopLyd(n);
      }
    }
  }
  stop() {
    for (const t of [...this.lyde.keys()]) {
      this.stopLyd(t);
    }
  }
}
export function Hc(e, t) {
  const n = [0, 0], r = new Map();
  let l = true, i = null;
  const o = { anims: new Map(), figur(u, h) {
      if (u >= 0 && u < n.length) {
        n[u] = h;
      }
    }, spilLyd(u) {
      if (!l) {
        return;
      }
      o.stopLyd(u);
      const h = new Audio(soundUrl(t, u));
      Ln(h, h.src);
      h.play().catch(() => {
        r.delete(u);
      });
      r.set(u, h);
    }, stopLyd(u) {
      const h = r.get(u);
      if (h) {
        h.pause();
        r.delete(u);
      }
    }, lydSpiller(u) {
      const h = r.get(u);
      return !!h && !h.ended && !h.error;
    } }, s = e.liste.map((u) => new ScriptInterpreter(u)), a = () => Math.floor(Math.random() * 99);
  return { tilstand: n, get taler() {
      return !!i;
    }, start(u, { v0: h, v1: m, param: g = 0 } = {}) {
      const v = s[u];
      if (v) {
        if (i) {
          i.afbryd(o);
        }
        i = v;
        v.e();
        n[0] = 0;
        n[1] = 0;
        v.vars[5] = a();
        v.vars[6] = g;
        v.vars[7] = a();
        v.vars[8] = a();
        v.vars[9] = a();
        if (h !== void 0) {
          v.vars[0] = h;
        }
        if (m !== void 0) {
          v.vars[1] = m;
        }
      }
    }, haendelse(u, h) {
      const m = e.haendelser[u];
      if (m !== void 0) {
        this.start(m, h);
      }
    }, tik(u) {
      if (i && i.tik(u, o)) {
        i = null;
        n[0] = 0;
        n[1] = 0;
      }
    }, stop() {
      if (i) {
        i.afbryd(o);
      }
      i = null;
      n[0] = 0;
      n[1] = 0;
    }, lyd(u) {
      if (l = u, !u) {
        for (const h of [...r.keys()]) {
          o.stopLyd(h);
        }
      }
    }, spilLyd(u) {
      if (!l) {
        return;
      }
      const h = new Audio(soundUrl(t, u));
      Ln(h, h.src);
      h.play().catch(() => {
      });
    } };
}
export function Tv({ K: e, M: t, I: n, forgrund: r, baggrund: l, hud: i, HV: o, hoveder: s, skrift: a }) {
  const m = t.sprites[e.forgrund.base].w, g = t.sprites[e.baggrund.base].w, v = (j) => {
    const _ = t.sprites[j];
    if (_) {
      n[_.assetId];
    }
  };
  for (let j = 1; j <= e.forgrund.antal; j++) {
    v(e.forgrund.base + j);
  }
  for (let j = 1; j <= e.baggrund.antal; j++) {
    v(e.baggrund.base + j);
  }
  e.skyer.billeder.flat().forEach(v);
  const c = r.kolonner * m, p = r.raekker * m, k = { x: Math.trunc((c - GAME_WIDTH) / 2), y: Math.trunc((p - 768) / 4) }, d = (j, _) => j + Math.floor(Math.random() * (_ - j + 1)), f = (j) => `rgb(${j[0]},${j[1]},${j[2]})`, y = new Set(), w = new Map(t.animations.map((j) => [j.id, j])), S = (j) => {
    const _ = w.get(j), x = _ ? new AnimationPlayer(_) : null;
    if (x) {
      x.advance(0);
    }
    return x;
  }, P = e.minispil.map((j) => ({ ...j, ro: S(j.film[0]), frem: null })), M = () => true, E = e.skyer, N = Array.from({ length: E.antal }, () => ({})), C = (j, _) => {
    j.type = d(0, 2);
    const x = E.typer[j.type], T = E.billeder[j.type];
    j.sprite = T[d(0, T.length - 1)];
    j.x = _ ? d(E.start[0], E.start[1]) : E.ind;
    j.y = d(x.y[0], x.y[1]);
    j.fart = d(x.fart[0], x.fart[1]);
  }, I = () => N.sort((j, _) => j.fart - _.fart);
  N.forEach((j) => C(j, true));
  I();
  let O = 0;
  const F = createFigureOverlay(i.M, i.I, o, WIDTH_EXTRA);
  let V = 0, K = -1, W = [];
  const ae = (j, _, x, T, R, z) => {
    for (let q = 0; q < _.raekker; q++) {
      const D = z + q * T;
      if (!(D <= -T || D >= 768)) {
        for (let Ce = 0; Ce < _.kolonner; Ce++) {
          const we = R + Ce * T, re = _.felter[q][Ce];
          if (re > 0 && we > -T && we < GAME_WIDTH) {
            drawSprite(j, t, n, x + re, we, D);
          }
        }
      }
    }
  };
  return { kam: k, get tilstand() {
      return V;
    }, vis() {
      V = 0;
      K = -1;
      s.start(e.scripts.start);
    }, klem() {
      k.x = Math.max(0, Math.min(c - GAME_WIDTH, k.x));
      k.y = Math.max(0, Math.min(p - 768, k.y));
    }, fremad(j, _) {
      s.tik(j);
      F.fremad(j, s.taler);
      for (const x of P) {
        if (x.ro) {
          x.ro.advance(j);
        }
        if (x.frem) {
          x.frem.advance(j);
          if (x.frem.finished) {
            x.frem = null;
          }
        }
      }
      for (O += Math.min(250, j); O >= 33;) {
        O -= 33;
        let x = false;
        for (const T of N) {
          T.x += T.fart;
          if (T.x >= E.ude) {
            C(T, false);
            x = true;
          }
        }
        if (x) {
          I();
        }
      }
      if (V === 2 && !s.taler) {
        V = 0;
        const x = K;
        K = -1;
        _(x);
      }
    }, tegn(j, { penge: _, rubiner: x }) {
      this.klem();
      const T = Math.round(k.x), R = Math.round(k.y);
      j.fillStyle = f(e.hav);
      j.fillRect(0, 0, GAME_WIDTH, 768);
      ae(j, l, e.baggrund.base, g, 0, -R);
      const z = k.x * E.kamera.x, q = k.y + E.kamera.dy;
      for (const we of N) {
        drawSprite(j, t, n, we.sprite, Math.trunc(we.x * GAME_WIDTH / 65536) - z, Math.trunc(we.y * 768 / 65536) - q);
      }
      ae(j, r, e.forgrund.base, m, -T, -R);
      for (const we of e.raekkefoelge) {
        const re = P[we], We = !y.has(we);
        drawAnimation(j, t, n, re.frem || re.ro, re.x - T, re.y - R, false, We ? 1 : 128 / 255);
        if (!We) {
          drawSprite(j, t, n, e.laas, re.x - T, re.y - R);
        }
      }
      W = [];
      j.save();
      j.translate(-HUD_SHIFT, 0);
      const D = (we) => {
        const [re, We, Ye] = e.hud[we];
        drawSprite(j, i.M, i.I, re, We, Ye);
        const pe = i.M.sprites[re];
        if (pe) {
          W.push({ navn: we, x0: We - pe.ox - HUD_SHIFT, y0: Ye - pe.oy, x1: We - pe.ox + pe.w - HUD_SHIFT, y1: Ye - pe.oy + pe.h });
        }
      };
      D("tavle");
      D("rubin");
      D("moent");
      D("plus");
      const Ce = (we, [re, We, , Ye]) => a.tegn(j, we, re, We + Ye / 2, { str: 37 });
      Ce(String(Math.round(_)), e.hud.penge);
      Ce(String(x), e.hud.rubiner);
      j.restore();
      F.tegn(j, s.tilstand);
    }, klik(j) {
      const _ = [...W].reverse().find((z) => j.x >= z.x0 && j.x <= z.x1 && j.y >= z.y0 && j.y <= z.y1);
      if (_) {
        return _.navn === "plus" || _.navn === "rubin" ? { art: "rubiner" } : { art: "hud" };
      }
      if (V !== 0) {
        return null;
      }
      const x = j.x + k.x, T = j.y + k.y, R = P.find((z) => M(z.nr) && x >= z.x - z.b / 2 && x <= z.x + z.b / 2 && T >= z.y - z.h / 2 && T <= z.y + z.h / 2);
      return R ? y.has(R.nr) ? { art: "laast", nr: R.nr } : (s.spilLyd(e.trykLyd), R.frem = S(R.film[1]), s.start(e.scripts.valgt, { v0: R.nr }), K = R.nr, V = 2, { art: "valgt", nr: R.nr }) : null;
    }, stop() {
      s.stop();
    } };
}
