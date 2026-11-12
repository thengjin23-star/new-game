// 生死約戰 (1.1): 天元三千零二十年九月十五, outside the gate of 天劍宗 — 葉孤寒,
// first on the 天驕榜, and 林塵, third, under a 生死狀 that 謝家 put up. 謝家's
// tea is poisoned. The 命簿 has written it already: 林塵 loses, 葉孤寒 will not
// kill him (the first of their three fights). 沈清歌's letter, there in time,
// or a word to him of the 軟筋散 bought at the 鬼市, and he does not drink —
// a fair bout, and it is even. And there is a way to see him dead (content/
// events/zhongzhou.js zz_duel; offscreen, world/arcs.js recurring).

/** How it went: 'draw' (he did not drink), 'ye' (as the 命簿 has it), 'lin_dead' (it did not stop at the 命簿). */
export function resolveDuel(s, how) {
  if (s.flags.duel_done) return;
  s.flags.duel_done = true;
  s.vars.duel = how;
  const lin = s.npcs.lin_chen;
  if (how === 'lin_dead' && lin) {
    lin.alive = false;
    lin.loc = null;
    s.flags.lin_dead = true;
  }
}

/** How it went (null: not yet, or never). */
export const duelOf = (s) => (s.flags.duel_done ? s.vars.duel || 'ye' : null);
