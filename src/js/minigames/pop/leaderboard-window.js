/**
 * Leaderboard ("hitliste") window shown after a Popstars concert.
 * Created by createLeaderboardWindow(env), which closes over the running game's data and helpers.
 */
import { leaderboardRank } from './levels.js';

export function createLeaderboardWindow(env) {
  // Runtime values of the surrounding game closure that these windows need.
  const { gameData, say, sounds, font, ctx, ui } = env;

  // Hit-list window shown after a concert: a scrolling list of 50 fake chart positions with the player's song
  // highlighted at the rank their score earned. `better`/`worse` pick the arrow that compares with the previous score.
  // Names are cut with "..." when wider than the name box.
  const leaderboardWindow = ({ sang: songIndex, point: points, bedre: better, vaerre: worse }) => {
    const cfg = gameData.hitliste;
    const rank = leaderboardRank(points);
    const [canvasX, canvasY, canvasW, canvasH] = cfg.lærred;
    const [rowW, rowH] = cfg.raekke;
    say(cfg.scripts.aabn);
    if (rank === 0) {
      sounds.spil(gameData.lyde.hitliste);
    }
    const fitText = (text, fontSize, maxWidth) => {
      if (!font || font.bredde(text, null, fontSize) <= maxWidth) {
        return text;
      }
      let shortened = text;
      for (; shortened.length > 1 && font.bredde(`${shortened}...`, null, fontSize) > maxWidth;) {
        shortened = shortened.slice(0, -1);
      }
      return `${shortened}...`;
    };
    const listWindow = { titel: cfg.titel, rul: Math.max(0, rank * rowH + rowH - cfg.midt), lukket: () => say(cfg.scripts.luk), tegn(draw, rect) {
        draw.rulleliste(listWindow, rect.x + canvasX, rect.y + canvasY, canvasW, canvasH, 50 * rowH, (scrollTop) => {
          const listX = rect.x + canvasX;
          for (let rowIndex = 0; rowIndex < 50; rowIndex++) {
            const rowY = scrollTop + rowIndex * rowH;
            if (rowY + rowH < rect.y + canvasY || rowY > rect.y + canvasY + canvasH) {
              continue;
            }
            const isPlayerRow = rowIndex === rank;
            if (draw.ramme("punkt", listX, rowY, rowW, rowH), isPlayerRow && draw.ramme("punkt", listX, rowY, rowW, rowH), !font) {
              continue;
            }
            const [placeX, , placeW] = cfg.plads.kasse;
            const [nameX, , nameW] = cfg.navn.kasse;
            font.tegn(ctx, String(rowIndex + 1), listX + placeX + placeW / 2, rowY + rowH / 2, { font: cfg.plads.skrift, midt: true });
            const label = isPlayerRow ? cfg.sange[songIndex] : cfg.navne[rowIndex];
            if (font.tegn(ctx, fitText(label, cfg.navn.skrift, cfg.navn.bredde), listX + nameX + nameW / 2, rowY + rowH / 2, { font: cfg.navn.skrift, midt: true }), isPlayerRow) {
              const pointCfg = cfg.point;
              const pointSprite = ui.pakke.M.sprites[pointCfg.sprite];
              draw.sprite("ui", pointCfg.sprite, listX + pointCfg.x, rowY + pointCfg.y);
              font.tegn(ctx, String(points), listX + pointCfg.x + (pointSprite ? pointSprite.ox : 0), rowY + pointCfg.y + (pointSprite ? pointSprite.oy : 0), { font: 1, op: true });
              const arrowCfg = cfg.pile;
              draw.sprite("pop", better ? arrowCfg.bedre : worse ? arrowCfg.vaerre : arrowCfg.samme, listX + arrowCfg.x, rowY + arrowCfg.y);
            }
          }
        });
      } };
    return listWindow;
  };

  return leaderboardWindow;
}
