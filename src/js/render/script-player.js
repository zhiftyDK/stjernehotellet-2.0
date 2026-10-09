// Scripted character animation (the talking "heads" / hotel characters).
//  - ScriptedCharacter: idle / random / queued scripts for one character, plus sound handling.
//  - Hc: lighter script runner used for the speaking heads overlay and event-triggered scripts.
// The bytecode VM lives in script-interpreter.js; the world map screen (Tv) in map-screen.js.
import { drawSpriteFrame } from './canvas-helpers.js';
import { registerAudioElement as registerAudioVolume, soundUrl } from '../audio/audio.js';
import { ScriptInterpreter } from './script-interpreter.js';
export { Tv as createMapScreen } from './map-screen.js';
// Random integer in [min, max], inclusive.
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
// One character driven by scripts. Always plays either its idle script (`hvile`, with a random
// variation var), a occasional random "fidget" script (`tilfaeldig`) or a requested script via spil().
// Scripts requested via kaede() are queued and played one after another.
export class ScriptedCharacter {
  constructor({ liste: scriptCodes, hvile: idleIndex, tilfaeldig: randomIndex, anims: animations, manifest: manifest = null, images: images = {}, lydSti: soundPath = "data/lyd", antalHvile: idleVariantCount = 3, forskydning: offsetX }) {
    this.forskydning = offsetX;
    this.anims = animations;
    this.manifest = manifest;
    this.images = images;
    this.lydSti = soundPath;
    this.lydTil = true;
    this.lyde = new Map();
    this.scripts = scriptCodes.map((code) => new ScriptInterpreter(code));
    this.hvile = idleIndex >= 0 ? this.scripts[idleIndex] : null;
    this.tilfaeldig = this.scripts[randomIndex];
    this.antalHvile = idleVariantCount;
    this.nu = 0;
    this.fVar = 0;
    this.tilHvile();
  }
  // Go back to the idle script and schedule the next random fidget in 15-23 s.
  tilHvile() {
    this.cur = this.hvile;
    if (this.hvile) {
      this.hvile.vars[0] = randomInt(0, 3);
    }
    this.timer = this.nu + randomInt(15e3, 23e3);
    this.iHvile = true;
    this.afbrydelig = true;
  }
  // Start script `scriptIndex` unless it already runs or the current one is not interruptible.
  spil(scriptIndex, interruptible = true, interruptCurrent = true) {
    const script = this.scripts[scriptIndex];
    if (!(!script || this.cur === script || !this.afbrydelig)) {
      if ((interruptCurrent || this.cur === this.tilfaeldig) && this.cur) {
        this.cur.afbryd(this);
      }
      this.iHvile = false;
      this.cur = script;
      this.afbrydelig = interruptible;
      script.e();
    }
  }
  // Replace the idle and random scripts.
  skift(idleIndex, randomIndex) {
    if (this.cur) {
      this.cur.afbryd(this);
    }
    this.hvile = idleIndex >= 0 ? this.scripts[idleIndex] : null;
    this.tilfaeldig = this.scripts[randomIndex];
    if (this.hvile) {
      this.hvile.e();
    }
    this.tilHvile();
  }
  // Restart script `scriptIndex` from scratch with the given initial variables, then randomise vars.
  startForfra(scriptIndex, initialVars = {}) {
    const script = this.scripts[scriptIndex];
    if (script) {
      if (this.cur) {
        this.cur.afbryd(this);
      }
      this.iHvile = false;
      this.cur = script;
      this.afbrydelig = true;
      script.e();
      for (const [varIndex, value] of Object.entries(initialVars)) {
        script.vars[varIndex] = value;
      }
      this.slump();
    }
  }
  // Set a variable of the current script.
  saet(varIndex, value) {
    if (this.cur) {
      this.cur.vars[varIndex] = value;
    }
  }
  // Randomise script variables 5,7,8,9 (0..98), clear 6, and tick.
  slump(dtMs = 0) {
    for (const varIndex of [5, 7, 8, 9]) {
      this.saet(varIndex, randomInt(0, 98));
    }
    this.saet(6, 0);
    this.tik(dtMs);
  }
  optaget() {
    return !this.iHvile;
  }
  get taler() {
    return !!this.cur && this.cur !== this.hvile;
  }
  // Postpone the next random fidget while idle.
  poke() {
    if (this.iHvile && this.cur !== this.tilfaeldig) {
      this.timer = this.nu + randomInt(15e3, 23e3);
    }
  }
  // Skip the current script and return to idle.
  spring() {
    if (!(this.cur === this.hvile || this.cur === this.tilfaeldig)) {
      this.cur.afbryd(this);
      this.tilHvile();
    }
  }
  // Advance time: start queued scripts, trigger a random fidget when the timer expires, run the script.
  tik(dtMs) {
    if (this.nu += dtMs, this.koe && this.koe.length && !this.optaget() && (this.spil(this.koe.shift()), this.slump()), this.iHvile && this.nu >= this.timer) {
      this.cur = this.tilfaeldig;
      this.saet(0, this.fVar);
      for (const varIndex of [5, 7, 8, 9]) {
        this.saet(varIndex, randomInt(0, 98));
      }
      this.cur.f();
      this.timer = this.nu + 23e3;
      if (this.hvile) {
        this.hvile.vars[0] = randomInt(0, this.antalHvile - 1);
      }
      this.iHvile = true;
      this.afbrydelig = true;
    }
    if (this.cur && this.cur.tik(dtMs, this)) {
      if (this.cur === this.tilfaeldig || !this.iHvile) {
        this.tilHvile();
      } else {
        this.cur.f();
      }
    }
  }
  // Draw all slots of the current script at their positions; slots in `skipSlots` and sprite id `skipSprite` are skipped.
  tegn(ctx, skipSlots = [], skipSprite = -1) {
    if (!(!this.cur || !this.manifest)) {
      this.cur.pladser.forEach((slot, slotIndex) => {
        if (!(!slot || !slot.spiller || skipSlots.includes(slotIndex))) {
          for (const part of slot.spiller.drawList("invers")) {
            if (part.sprite === skipSprite) {
              continue;
            }
            const frame = this.manifest.sprites[part.sprite];
            const image = frame && this.images[frame.assetId];
            if (image) {
              ctx.save();
              ctx.translate(slot.x + part.x, slot.y + part.y);
              ctx.rotate((part.rot || 0) * Math.PI * 2);
              ctx.scale(part.scaleX * (part.flip ? -1 : 1), part.scaleY);
              drawSpriteFrame(ctx, image, frame, part.alpha);
              ctx.restore();
            }
          }
        }
      });
    }
  }
  // Animation id in a slot, or -1.
  pladsAnim(slotIndex) {
    const slot = this.cur && this.cur.pladser[slotIndex];
    return slot ? slot.id : -1;
  }
  kaede(scriptIndices) {
    this.koe = [...scriptIndices];
  }
  introAktiv() {
    return this.koe && this.koe.length > 0 || this.optaget();
  }
  // Sound handling: play (restarting if already playing), stop, query, mute toggle.
  spilLyd(soundId) {
    if (!this.lydTil) {
      return;
    }
    this.stopLyd(soundId);
    const audio = registerAudioVolume(new Audio(soundUrl(this.lydSti, soundId)), soundUrl(this.lydSti, soundId));
    audio.play().catch(() => {
      this.lyde.delete(soundId);
    });
    this.lyde.set(soundId, audio);
  }
  stopLyd(soundId) {
    const audio = this.lyde.get(soundId);
    if (audio) {
      audio.pause();
      this.lyde.delete(soundId);
    }
  }
  lydSpiller(soundId) {
    const audio = this.lyde.get(soundId);
    return !!audio && !audio.ended && !audio.error;
  }
  saetLyd(enabled) {
    if (this.lydTil = enabled, !enabled) {
      for (const soundId of [...this.lyde.keys()]) {
        this.stopLyd(soundId);
      }
    }
  }
  stop() {
    for (const soundId of [...this.lyde.keys()]) {
      this.stopLyd(soundId);
    }
  }
}
// Script runner for speaking heads and event scripts. `config.liste` = script codes,
// `config.haendelser` = event name -> script index; sounds come from `soundPath`.
// Returns { tilstand: [leftTalking, rightTalking], taler, start, haendelse, tik, stop, lyd, spilLyd }.
export function createCharacterScriptRunner(config, soundPath) {
  const figureState = [0, 0];
  const sounds = new Map();
  let soundOn = true;
  let current = null;
  const host = { anims: new Map(), figur(figureIndex, talkingFlag) {
      if (figureIndex >= 0 && figureIndex < figureState.length) {
        figureState[figureIndex] = talkingFlag;
      }
    }, spilLyd(soundId) {
      if (!soundOn) {
        return;
      }
      host.stopLyd(soundId);
      const audio = new Audio(soundUrl(soundPath, soundId));
      registerAudioVolume(audio, audio.src);
      audio.play().catch(() => {
        sounds.delete(soundId);
      });
      sounds.set(soundId, audio);
    }, stopLyd(soundId) {
      const audio = sounds.get(soundId);
      if (audio) {
        audio.pause();
        sounds.delete(soundId);
      }
    }, lydSpiller(soundId) {
      const audio = sounds.get(soundId);
      return !!audio && !audio.ended && !audio.error;
    } }, scripts = config.liste.map((code) => new ScriptInterpreter(code)), randomVar = () => Math.floor(Math.random() * 99);
  return { tilstand: figureState, get taler() {
      return !!current;
    }, start(scriptIndex, { v0: var0, v1: var1, param: scriptParam = 0 } = {}) {
      const script = scripts[scriptIndex];
      if (script) {
        if (current) {
          current.afbryd(host);
        }
        current = script;
        script.e();
        figureState[0] = 0;
        figureState[1] = 0;
        script.vars[5] = randomVar();
        script.vars[6] = scriptParam;
        script.vars[7] = randomVar();
        script.vars[8] = randomVar();
        script.vars[9] = randomVar();
        if (var0 !== void 0) {
          script.vars[0] = var0;
        }
        if (var1 !== void 0) {
          script.vars[1] = var1;
        }
      }
    }, haendelse(eventName, options) {
      const scriptIndex = config.haendelser[eventName];
      if (scriptIndex !== void 0) {
        this.start(scriptIndex, options);
      }
    }, tik(dtMs) {
      if (current && current.tik(dtMs, host)) {
        current = null;
        figureState[0] = 0;
        figureState[1] = 0;
      }
    }, stop() {
      if (current) {
        current.afbryd(host);
      }
      current = null;
      figureState[0] = 0;
      figureState[1] = 0;
    }, lyd(enabled) {
      if (soundOn = enabled, !enabled) {
        for (const soundId of [...sounds.keys()]) {
          host.stopLyd(soundId);
        }
      }
    }, spilLyd(soundId) {
      if (!soundOn) {
        return;
      }
      const audio = new Audio(soundUrl(soundPath, soundId));
      registerAudioVolume(audio, audio.src);
      audio.play().catch(() => {
      });
    } };
}
