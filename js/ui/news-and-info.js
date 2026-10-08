export const NEWS = [{ dato: "8. oktober", punkter: ["Nyt: Du kan nu have flere gemte spil og vælge mellem dem på en ny startskærm med \"Start spil\", vælg spiller og nyt spil.","Nyt: Temamusikken spiller med det samme på startskærmen og ved valg af spiller.","Nyt: Hovedmenuen kan nu altid åbnes med hus-skiltet øverst til højre – i hotellet, på kortet og i alle minispil.","Nyt: \"Skift spiller\" og \"Luk spillet\" ligger nu i hovedmenuen under Nyheder og Info.","Nyt: Spillet fylder nu hele skærmen i 16:9 uden sorte kanter. Golf, Platform, Zoo og Popstars er gjort bredere, og de øvrige minispil har en sløret kant i siderne.","Nyt: Nye logoer på startskærmen, der ligner originalen mere.","Rettet: Knapper og skilte øverst til højre sidder nu pænt og med samme afstand i alle minispil.","Rettet: Figurernes mundbevægelser sidder igen de rigtige steder i minispillene.","Rettet: Baggrunden flytter sig ikke længere mellem startskærmen og valg af spiller.","Rettet: Motorlyden i Båd-spillet er slået fra, fordi den fik spillet til at hakke."] }, { dato: "6. oktober", punkter: ["Nyt: Skru op og ned for lyden under Indstillinger.", "Nyt: Denne side med nyheder. Den findes i hovedmenuen og ved siden af spillet.", "Rettet: Møblerne står nu på gulvet i stedet for at svæve.", "Isspillet virker nu som originalen: Det er lettere at ramme isen, og den sidste is må gøres færdig.", "Popstars: Tryk på afspil-knappen i sangbogen for at høre sangene, og publikum dækker nu hele bunden af scenen.", "Popstars: Når du vil forlade spillet, vises scenen nu i billedet, ligesom i de andre minispil.", "Kufferter: Kufferterne bliver nu blandet på flere måder, så du skal kigge godt efter hver gang.", "Kufferter: Spillet virker nu mere som originalen: Hele håndtaget kan trykkes, kufferterne skydes op nedefra, og du kan bytte dem, mens lastbilen kører ind."] }, { dato: "5. oktober", punkter: ["Spillet er online!"] }], NEWS_SEEN_KEY = "nyheder-set-v1", newsSignature = () => NEWS[0] ? `${NEWS[0].dato}:${NEWS[0].punkter.length}` : "", newsSeenListeners = new Set();
export function hasUnseenNews() {
  try {
    return localStorage.getItem(NEWS_SEEN_KEY) !== newsSignature();
  }
  catch {
    return false;
  }
}
export function markNewsSeen() {
  try {
    localStorage.setItem(NEWS_SEEN_KEY, newsSignature());
  }
  catch {
  }
  for (const e of newsSeenListeners) {
    e();
  }
}
export function onNewsSeen(e) {
  newsSeenListeners.add(e);
  return () => newsSeenListeners.delete(e);
}
let Yi = null;
export function registerNewsOpener(e) {
  Yi = e;
}
export function openNews() {
  if (Yi) {
    Yi();
  }
  return !!Yi;
}
export const INFO_SECTIONS = [{ titel: "Om spillet", tekst: ["Pixeline - Stjernehotellet er et fanprojekt. Spillet er genskabt ud fra det originale spil, så det kan spilles i browseren igen.", "Det er ikke det officielle spil. Pixeline og alle figurer, tegninger og lyde tilhører de oprindelige ejere."] }, { titel: "Sådan gemmes dit spil", tekst: ["Spillet gemmes automatisk i din browser hvert femte sekund, og når du lukker siden.", "Dit hotel ligger kun i den browser og på den enhed, du spiller på. Sletter du browserens data, forsvinder det."] }];
let Qi = null;
export function registerInfoOpener(e) {
  Qi = e;
}
export function openInfo() {
  if (Qi) {
    Qi();
  }
  return !!Qi;
}
