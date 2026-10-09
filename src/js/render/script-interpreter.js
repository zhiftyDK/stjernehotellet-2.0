// Bytecode interpreter for character animation scripts. Used by ScriptedCharacter and the heads
// script runner (see script-player.js).
import { GAME_WIDTH } from '../engine/constants.js';
import { AnimationPlayer } from '../engine/animation.js';
// Default x offset that centres a 1024px wide scripted scene in the game width.
const defaultOffsetX = Math.round((GAME_WIDTH - 1024) / 2);
// Interpreter for one animation script (`kode` = array of numbers).
// kode[0] = number of animation slots (`pladser`); the program starts at index 1.
// Opcodes (operand words follow the opcode):
//   0 t       wait t*10 ms          1         yield until next tick
//   2 a s x y place animation `a` in slot `s` at (x,y) (16-bit fractions of 1024x768; 6 words total)
//   3 s       remove slot s         4 s       wait until slot s's animation has finished
//   5 id      play sound (yields)   6 id      stop sound
//   7 id      wait until sound id has finished
//   8 v op n skip   if !(vars[v] <op> n) jump over `skip` words; op: 0 >, 1 <, 2 ==, 3 !=
//   10 / 11 f set head figure f to talking / silent   20, 22: no-op   other: skipped (2 words)
// vars[] holds 10 script variables (set from outside, e.g. random numbers in 5,7,8,9).
export class ScriptInterpreter {
  constructor(code) {
    this.kode = code;
    this.e();
  }
  // Reset completely: allocate empty slots and variables, then restart (vars cleared to 0).
  e() {
    const slotCount = this.kode[0];
    this.pladser = new Array(slotCount).fill(null);
    this.vars = new Array(10).fill(0);
    this.f();
  }
  // Restart from the beginning but keep slots and variables.
  f() {
    this.pc = 1;
    this.venterAnim = -1;
    this.ventTil = 0;
    this.venterLyd = -1;
    this.tid = 0;
  }
  // True while waiting on a timer, an animation or a sound.
  optaget() {
    return this.ventTil > 0 || this.venterAnim >= 0 || this.venterLyd >= 0;
  }
  // True when the program has run to the end and nothing is being waited for.
  faerdig() {
    return this.pc >= this.kode.length && !this.optaget();
  }
  // Advances the script by dtMs. `host` supplies anims (id -> animation data), spilLyd/stopLyd/lydSpiller
  // for sounds, optional figur(index, talking) and optional forskydning (x offset).
  // Returns true once the script is finished.
  tik(dtMs, host) {
    if (this.faerdig()) {
      return true;
    }
    this.tid += dtMs;
    const code = this.kode;
    if (this.optaget()) {
      if (this.ventTil && this.ventTil < this.tid && (this.ventTil = 0), this.venterAnim >= 0) {
        const slot = this.pladser[this.venterAnim];
        if (!slot || !slot.spiller || slot.spiller.finished) {
          this.venterAnim = -1;
        }
      }
      if (this.venterLyd >= 0 && !host.lydSpiller(this.venterLyd)) {
        this.venterLyd = -1;
      }
    } else {
      let running = true;
      for (; running && this.pc < code.length;) {
        const pc = this.pc;
        switch (code[pc]) {
          case 0:
            this.ventTil = this.tid + code[pc + 1] * 10;
            this.pc += 2;
            break;
          case 1:
            this.pc += 1;
            running = false;
            break;
          case 2: {
            const slotIndex = code[pc + 2];
            const animationData = host.anims.get(code[pc + 1]);
            const player = animationData ? new AnimationPlayer(animationData) : null;
            if (player) {
              player.advance(0);
            }
            this.pladser[slotIndex] = { id: code[pc + 1], spiller: player, x: (host.forskydning !== undefined ? host.forskydning : defaultOffsetX) + (code[pc + 3] & 65535) * 1024 / 65536, y: (code[pc + 4] & 65535) * 768 / 65536 };
            this.pc += 6;
            break;
          }
          case 3: {
            const slotIndex = code[pc + 1];
            if (this.venterAnim === slotIndex) {
              this.venterAnim = -1;
            }
            if (this.pladser[slotIndex]) {
              this.pladser[slotIndex] = null;
            }
            this.pc += 2;
            break;
          }
          case 4:
            this.venterAnim = code[pc + 1];
            this.pc += 2;
            break;
          case 5:
            host.spilLyd(code[pc + 1]);
            this.lyd = code[pc + 1];
            this.pc += 2;
            running = false;
            break;
          case 6:
            host.stopLyd(code[pc + 1]);
            this.pc += 2;
            break;
          case 7:
            this.venterLyd = code[pc + 1];
            this.pc += 2;
            break;
          case 8: {
            const varValue = this.vars[code[pc + 1]];
            const comparison = code[pc + 2];
            const operand = code[pc + 3];
            if (!(comparison === 0 ? varValue > operand : comparison === 1 ? varValue < operand : comparison === 2 ? varValue === operand : comparison === 3 && varValue !== operand)) {
              this.pc += code[pc + 4];
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
            if (host.figur) {
              host.figur(code[pc + 1], code[pc] === 10 ? 1 : 0);
            }
            this.pc += 2;
            break;
          default:
            this.pc += 2;
            break;
        }
      }
    }
    for (const slot of this.pladser) {
      if (slot && slot.spiller) {
        slot.spiller.advance(dtMs);
      }
    }
    return this.faerdig();
  }
  // Abort: stop the last started sound and reset.
  afbryd(host) {
    if (this.lyd !== void 0) {
      host.stopLyd(this.lyd);
    }
    this.e();
  }
}
