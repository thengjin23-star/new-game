// 青雲宗, for its own: your place in it (雜役 → 外門 → 內門 → 真傳), the
// 貢獻 you earn (the 任務堂, chores) and spend (the 寶庫), the 月例 each
// month, and the yearly 宗門大比 (content/events/sect.js).

import { ITEMS } from '../content/items.js';
import { applyEffects, logLife } from '../core/effects.js';
import { newReport } from '../core/time.js';
import { realmLabel } from '../core/cultivation.js';

/**
 * Ranks. pay: 靈石 a month; pills: 聚氣丹 a month; need: what it takes to
 * be raised to it (貢獻 earned in all, and how far you have cultivated).
 */
export const RANKS = [
  { name: '雜役弟子', pay: 0, pills: 0 },
  { name: '外門弟子', pay: 10, pills: 0, need: { gx: 100, realm: 1, stage: 0 } },
  { name: '內門弟子', pay: 30, pills: 1, need: { gx: 400, realm: 1, stage: 6 } },
  { name: '真傳弟子', pay: 80, pills: 2, need: { gx: 1000, realm: 2, stage: 0 } },
];

/** What 貢獻 buys at the 寶庫, and the least rank that may have it. */
export const TREASURY = [
  { item: 'juqi_pill', gx: 20, rank: 0 },
  { item: 'heal_pill', gx: 20, rank: 0 },
  { item: 'wind_talisman', gx: 15, rank: 0 },
  { item: 'book_qingshen', gx: 50, rank: 1 },
  { item: 'jade_pendant', gx: 140, rank: 1 },
  { item: 'qinggang_sword', gx: 120, rank: 1 },
  { item: 'feisuo', gx: 200, rank: 1 },
  { item: 'book_yujian', gx: 350, rank: 2 },
  { item: 'zhuji_pill', gx: 600, rank: 2 },
];

/** Your rank in the sect (-1: not of it). Saves from before ranks were kept read it from how you came in. */
export function rankOf(s) {
  if (!s.flags.sect_member) return -1;
  if (s.vars.sectRank !== undefined) return s.vars.sectRank;
  if (s.flags.sect_servant) return 0;
  return s.player.root?.type === 'dual' ? 2 : 1;
}

export function rankName(s) {
  const r = rankOf(s);
  return r < 0 ? null : RANKS[r].name;
}

/** 貢獻 to spend now, and earned in all (what a rise in rank is weighed by). */
export function gxOf(s) {
  return { now: s.vars.contribution || 0, total: Math.max(s.vars.gxTotal || 0, s.vars.contribution || 0) };
}

/** The next rank up and what it takes: { to, name, need, why } (why: what is still lacking; null: ready). null at the top. */
export function nextRank(s) {
  const r = rankOf(s);
  if (r < 0 || r >= RANKS.length - 1) return null;
  const to = r + 1;
  const need = RANKS[to].need;
  const p = s.player;
  const lacks = [];
  if (gxOf(s).total < need.gx) lacks.push(`累計貢獻 ${gxOf(s).total}/${need.gx}`);
  if (p.realm < need.realm || (p.realm === need.realm && p.stage < need.stage)) lacks.push(`修為需${realmLabel({ realm: need.realm, stage: need.stage })}`);
  return { to, name: RANKS[to].name, need, why: lacks.length ? lacks.join('、') : null };
}

/** Be raised a rank, if you have earned it. Returns the report, or null. */
export function promote(s) {
  const n = nextRank(s);
  if (!n || n.why) return null;
  s.vars.sectRank = n.to;
  if (n.to >= 1) delete s.flags.sect_servant;
  const report = newReport();
  report.chips.push({ text: `晉升：${n.name}`, tone: 'good' });
  const gifts = n.to === 1 ? [['ls', 20]] : n.to === 2 ? [['ls', 60], ['item', 'juqi_pill', 2]] : [['ls', 150], ['item', 'juqi_pill', 3]];
  if (n.to === 1 && !s.player.techs.includes('qingyun')) gifts.push(['tech', 'qingyun']);
  applyEffects(s, gifts, {}, report);
  logLife(s, `晉升青雲宗${n.name}`);
  return report;
}

/** Trade 貢獻 for something from the 寶庫. Returns whether you did. */
export function exchange(s, item) {
  const t = TREASURY.find((x) => x.item === item);
  if (!t || rankOf(s) < t.rank || gxOf(s).now < t.gx || !ITEMS[item]) return false;
  s.vars.contribution -= t.gx;
  applyEffects(s, [['item', item, 1]], {}, newReport());
  return true;
}

/** The 月例 at the turn of each month: 靈石, and 聚氣丹 from 內門 up. */
export function stipend(s, report) {
  const r = rankOf(s);
  if (r < 0 || s.flags.sect_wanted) return;
  const R = RANKS[r];
  if (!R.pay && !R.pills) return;
  const gains = [];
  if (R.pay) gains.push(['ls', R.pay]);
  if (R.pills) gains.push(['item', 'juqi_pill', R.pills]);
  applyEffects(s, gains, {}, report);
  report.toasts.push(`青雲宗的月例到了：${R.pay} 靈石${R.pills ? `、聚氣丹 ${R.pills} 顆` : ''}。`);
}
