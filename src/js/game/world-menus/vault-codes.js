// Secret codes that can be typed into the in-game safe ("pengeskab") menu.
// Each code can be redeemed once per save and pays out a number of "solkroner" (the game's currency).

// Known codes (upper case) -> reward amount and the name of the "sender" shown in the confirmation text.
const VAULT_CODES = { PIXELINE: { solkroner: 250, fra: "Pixeline" }, STJERNEHOTELLET: { solkroner: 500, fra: "Stjernehotellet" }, SOLØ: { solkroner: 150, fra: "Ib" } };

// True when every character is an allowed code character: Latin-1 letters/digits/space-ish
// (rejects control chars, code points above 255, and the punctuation blocks between digits/letters).
function isValidCodeText(text) {
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code > 255 || code < 32 || code >= 58 && code <= 64 || code >= 91 && code <= 96 || code >= 123 && code <= 159) {
      return false;
    }
  }
  return true;
}

// Try to redeem `text` for the hotel `state`. Returns the code's reward entry ({ solkroner, fra })
// and pays it out, or null when the text is invalid, unknown, or was already redeemed.
export function redeemVaultCode(state, text) {
  if (!isValidCodeText(text)) {
    return null;
  }
  const code = text.trim().toUpperCase(), reward = VAULT_CODES[code];
  state.pengeskab = state.pengeskab || [];
  return !reward || state.pengeskab.includes(code) ? null : (state.pengeskab.push(code), state.penge += reward.solkroner, reward);
}
