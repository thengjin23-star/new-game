// Boards of work: the 懸賞榜 in 落霞坊市 (for anyone) and the 任務堂 on
// 青雲峰 (for the sect's own). Each puts up a few pieces of work at a time,
// new ones every so many days; you take up to three at once. Bring what is
// asked for, or beat so many of what is named (world/combat.js counts what
// falls by your hand), then come back to the board for the reward.

import { ITEMS } from '../content/items.js';
import { FOES } from '../content/foes.js';
import { addItem, applyEffects } from '../core/effects.js';
import { newReport } from '../core/time.js';
import { addRep } from './factions.js';

/** The boards. every: days between postings; size: how many at a time; member: only for the sect's own. */
export const BOARDS = {
  market: { name: '懸賞榜', faction: 'market', every: 10, size: 3, who: '坊市的管事', poi: 'bounty_board' },
  sect: { name: '任務堂', faction: 'sect', every: 7, size: 3, who: '任務堂的執事', poi: 'sect_task_hall', member: true },
};

/**
 * Work that can be put up. bring: hand in n of an item; slay: beat n of
 * these kinds (from when you take it up). ls: 靈石; rep: standing with the
 * board's faction; gx: the sect's 貢獻. realm: the least realm it asks.
 */
export const WORK = {
  market: [
    { id: 'm_pelts', title: '收狼皮', text: '百煉坊的老韓要做幾件狼皮襖，收狼皮。', kind: 'bring', item: 'wolf_pelt', n: 3, ls: 30, rep: 5 },
    { id: 'm_herbs', title: '收凝氣草', text: '丹鋪缺凝氣草，價錢好說。', kind: 'bring', item: 'ningqi_grass', n: 4, ls: 26, rep: 5 },
    { id: 'm_core', title: '收妖獸內丹', text: '有位丹師高價收妖獸內丹，不問來路。', kind: 'bring', item: 'beast_core', n: 1, ls: 45, rep: 6 },
    { id: 'm_wolves', title: '除狼患', text: '青石山的狼又咬死了獵戶的狗。打退牠們。', kind: 'slay', beasts: ['wolf', 'demon_wolf'], n: 4, ls: 45, rep: 8 },
    { id: 'm_robber', title: '緝拿劫修', text: '往坊市的路上有劫修攔路，商隊都不敢走了。', kind: 'slay', beasts: ['cultivator'], whom: '劫修', n: 1, ls: 60, rep: 10 },
    { id: 'm_ghosts', title: '超度殘魂', text: '古戰場的殘魂夜夜作祟，過路的散修丟了好幾個。', kind: 'slay', beasts: ['ghost'], n: 3, ls: 70, rep: 10, realm: 1 },
    { id: 'm_bandits', title: '剿黑風寨', text: '黑風寨又劫了一支商隊。誰能教訓他們，商會重謝。', kind: 'slay', beasts: ['bandit', 'bandit_chief'], whom: '黑風寨的山賊', n: 3, ls: 80, rep: 12, also: { sect: 4 } },
    { id: 'm_scale', title: '收靈溪蟒鱗', text: '百煉坊收蟒鱗打甲，有多少收多少。', kind: 'bring', item: 'python_scale', n: 1, ls: 90, rep: 8 },
  ],
  sect: [
    { id: 's_herbs', title: '藥園採收', text: '藥園的凝氣草該收了，交到丹房。', kind: 'bring', item: 'ningqi_grass', n: 3, gx: 15, rep: 3 },
    { id: 's_patrol', title: '巡山', text: '山下有妖狼出沒，下山巡一遍，打退兩頭。', kind: 'slay', beasts: ['wolf', 'demon_wolf'], n: 2, gx: 18, rep: 3 },
    { id: 's_pelts', title: '庫房收皮', text: '庫房要狼皮縫冬衣。', kind: 'bring', item: 'wolf_pelt', n: 2, gx: 14, rep: 2 },
    { id: 's_core', title: '交妖獸內丹', text: '丹房煉丹要用妖獸內丹。', kind: 'bring', item: 'beast_core', n: 2, gx: 30, rep: 4 },
    { id: 's_ghosts', title: '古戰場除魂', text: '古戰場的殘魂越來越多，宗門派人去清一清。', kind: 'slay', beasts: ['ghost'], n: 3, gx: 30, rep: 5, realm: 1 },
    { id: 's_bandits', title: '清剿山賊', text: '黑風寨的人越來越猖狂，劫到宗門的商隊頭上了。', kind: 'slay', beasts: ['bandit', 'bandit_chief'], whom: '黑風寨的山賊', n: 3, gx: 35, rep: 6 },
    { id: 's_robber', title: '捉拿劫修', text: '有劫修冒充本宗弟子在路上搶劫，壞了宗門的名聲。', kind: 'slay', beasts: ['cultivator'], whom: '劫修', n: 1, gx: 28, rep: 5 },
  ],
};

/** Most you can have taken at once. */
export const MAX_TAKEN = 3;

function h1(seed, n) {
  let h = Math.imul(n | 0, 374761393) ^ Math.imul(seed | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** What is up on a board now (the same all through a posting; different for each life). Each: a WORK entry with a key. */
export function postings(s, boardId) {
  const B = BOARDS[boardId];
  const period = Math.floor(s.day / B.every);
  const pool = WORK[boardId].filter((w) => (w.realm ?? 0) <= s.player.realm);
  const picked = [];
  for (let k = 0; picked.length < Math.min(B.size, pool.length) && k < 40; k++) {
    const w = pool[Math.floor(h1((s.seed | 0) + boardId.length * 977, period * 41 + k) * pool.length)];
    if (!picked.includes(w)) picked.push(w);
  }
  return picked.map((w) => ({ ...w, key: `${boardId}:${period}:${w.id}`, board: boardId }));
}

/** Can you take work from this board? (Why not, if not.) */
export function boardLock(s, boardId) {
  if (BOARDS[boardId].member && !s.flags.sect_member) return '只有本宗弟子才能接任務堂的任務。';
  return null;
}

/** The work you have taken. */
export function takenOf(s) {
  return s.quests || [];
}

/** Has this posting been taken (or done) already? */
export function wasTaken(s, key) {
  return takenOf(s).some((q) => q.key === key) || s.vars.questsDone?.[key] !== undefined;
}

/** Take up a piece of work. Returns whether you did. */
export function take(s, boardId, key) {
  if (boardLock(s, boardId) || wasTaken(s, key) || takenOf(s).length >= MAX_TAKEN) return false;
  const w = postings(s, boardId).find((p) => p.key === key);
  if (!w) return false;
  s.quests ||= [];
  s.quests.push({ key, board: boardId, id: w.id, day: s.day, from: w.kind === 'slay' ? killsOf(s, w.beasts) : 0 });
  return true;
}

/** Mark a posting done (and forget the ones long since taken down). */
function markDone(s, key) {
  s.vars.questsDone ||= {};
  for (const [k, day] of Object.entries(s.vars.questsDone)) if (day < s.day - 60) delete s.vars.questsDone[k];
  s.vars.questsDone[key] = s.day;
}

function killsOf(s, kinds) {
  return kinds.reduce((a, k) => a + (s.vars.kills?.[k] || 0), 0);
}

/** A piece of work you have taken, as written, with how far along it is: { ...work, have, need, done }. */
export function progress(s, q) {
  const w = WORK[q.board].find((x) => x.id === q.id);
  if (!w) return null;
  const have = w.kind === 'bring' ? s.player.items[w.item] || 0 : killsOf(s, w.beasts) - q.from;
  return { ...w, ...q, have: Math.min(have, w.n), need: w.n, done: have >= w.n };
}

/** What it asks, in a few words. */
export function askOf(w) {
  if (w.kind === 'bring') return `交${ITEMS[w.item]?.name || w.item} ×${w.n}`;
  const names = w.whom || [...new Set(w.beasts.map((k) => FOES[k]?.name || k))].join('或');
  return `打倒${names} ×${w.n}`;
}

/** What it pays. */
export function payOf(w) {
  return [w.ls ? `${w.ls} 靈石` : null, w.gx ? `貢獻 ${w.gx}` : null].filter(Boolean).join('、');
}

/** Hand in a piece of work at its board. Returns the report (chips) if done, else null. */
export function handIn(s, key) {
  const q = takenOf(s).find((x) => x.key === key);
  const P = q && progress(s, q);
  if (!P?.done) return null;
  const report = newReport();
  if (P.kind === 'bring') addItem(s, P.item, -P.n, report);
  const gains = [];
  if (P.ls) gains.push(['ls', P.ls]);
  if (P.gx) gains.push(['var', 'contribution', P.gx]);
  applyEffects(s, gains, {}, report);
  if (P.gx) report.chips.push({ text: `宗門貢獻 +${P.gx}`, tone: 'good' });
  if (P.rep) addRep(s, BOARDS[q.board].faction, P.rep, report);
  for (const [f, n] of Object.entries(P.also || {})) addRep(s, f, n, report);
  s.quests = takenOf(s).filter((x) => x.key !== key);
  markDone(s, key);
  s.stats.quests = (s.stats.quests || 0) + 1;
  return report;
}

/** Give up a piece of work (no harm done, but it is gone from the board). */
export function drop(s, key) {
  if (!takenOf(s).some((q) => q.key === key)) return false;
  s.quests = takenOf(s).filter((q) => q.key !== key);
  markDone(s, key);
  return true;
}
