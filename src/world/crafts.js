// 修仙百藝 (0.15): brewing pills, drawing 符, refining gear, and the cave
// that becomes your 洞府. The rules here; the hands-on part (holding the
// fire steady, tracing the glyph) is the page's (ui/app.js), which says how
// well you did: hits of the fire (0–3), or how true the strokes ran (0–1).

import { ITEMS } from '../content/items.js';
import { RECIPES, GLYPHS, DRAW_COST, REFINE, ARRAY } from '../content/crafts.js';
import { applyEffects, addItem } from '../core/effects.js';
import { notice } from '../core/events.js';
import { newReport } from '../core/time.js';
import { pools, gearOf } from '../core/body.js';
import { refineLevel } from '../core/refine.js';
import { shopHere } from '../core/actions.js';
import { passTime } from './explore.js';
import * as CB from './combat.js';

const has = (s, id, n = 1) => (s.player.items[id] || 0) >= n;

/** Something in the way of any craft right now (in a fight, a story, the air, seclusion). */
function busyWhy(s) {
  if (s.pending || s.dead) return '現在不行。';
  if (s.secl) return '閉關中。';
  if (CB.inCombat(s)) return '戰鬥中，無暇他顧。';
  if (s.world?.fly) return '在天上，沒處擺爐子。';
  return null;
}

/** What you lack of a list of things, in words (null: nothing). */
function lacking(s, items) {
  const short = Object.entries(items || {}).filter(([k, n]) => !has(s, k, n));
  return short.length ? `還缺${short.map(([k, n]) => `${ITEMS[k].name}（${s.player.items[k] || 0}/${n}）`).join('、')}` : null;
}

// ── 洞府 ──

/** Is the cave yours? */
export function hasHome(s) {
  return !!s.flags.home_claimed;
}

/** Are you in it? */
export function atHome(s) {
  return hasHome(s) && s.player.loc === 'hidden_cave';
}

/** The cave was found: make it yours (its furnace and its desk come with it). */
export function claimHome(s) {
  if (!s.flags.cave_found || s.flags.home_claimed) return;
  s.flags.home_claimed = true;
  applyEffects(s, [['log', '在青石山腹佔了一處洞府']], {}, newReport());
  notice(s, '洞府', '你把洞府裡外收拾了一遍：前人的石床還在，牆角一尊積了灰的丹爐，案上一方乾了的硯台。\n\n擦乾淨了，就是你的了。\n\n（在洞府裡「坐」下，就能煉丹、畫符，不必另備丹爐和符筆；也可以在這裡布聚靈陣。）');
}

export function arrayLevel(s) {
  return s.vars.array || 0;
}

/** The next level of the 聚靈陣: { level, cost, qi, why } (null: it is as strong as it gets). */
export function arrayNext(s) {
  const level = arrayLevel(s) + 1;
  const A = ARRAY[level];
  if (!A) return null;
  const why = !atHome(s) ? '要在洞府裡布陣。' : s.player.ls < A.ls ? `靈石不夠（${s.player.ls}/${A.ls}）` : lacking(s, A.items);
  return { level, cost: A, qi: A.qi, why };
}

/** Lay (or strengthen) the array. */
export function buildArray(s) {
  const next = arrayNext(s);
  if (!next || next.why || busyWhy(s)) return false;
  const report = newReport();
  applyEffects(s, [['ls', -next.cost.ls], ...Object.entries(next.cost.items).map(([k, n]) => ['item', k, -n])], {}, report);
  s.vars.array = next.level;
  passTime(s, 6);
  notice(s, '聚靈陣', `你照著陣圖，把妖獸內丹一顆顆埋進洞府的四角，再用靈力一筆筆連起來。最後一筆落下，洞府裡的靈氣像退潮又漲潮一樣，慢慢聚了過來。\n\n聚靈陣・${['', '一', '二', '三'][next.level]}重：洞府的靈氣多了 ${next.qi}。`, { chips: report.chips });
  return true;
}

// ── 煉丹 ──

/** A furnace to hand: your own (in the 行囊), or the cave's. */
export function hasFurnace(s) {
  return has(s, 'danlu') || atHome(s);
}

/** The 丹方 you know (築基丹 only once its 丹方 is read). */
export function recipesKnown(s) {
  return Object.keys(RECIPES).filter((id) => !RECIPES[id].book || s.flags.recipe_zhuji);
}

/** Why you cannot brew this now (null: you can). */
export function brewWhy(s, id) {
  const R = RECIPES[id];
  if (!R) return '沒有這個丹方。';
  const busy = busyWhy(s);
  if (busy) return busy;
  if (!hasFurnace(s)) return '身邊沒有丹爐。';
  if (s.player.realm < 1) return '凡人控不住爐火，要先引氣入體。';
  if (R.book && !s.flags.recipe_zhuji) return '不懂這個丹方。';
  if (pools(s).mp < R.mp) return `靈力不夠（要 ${R.mp}）。`;
  return lacking(s, R.in);
}

/** The grade a fire held this well gives. */
export function brewGrade(hits) {
  return ['炸爐', '下品', '中品', '上品'][Math.max(0, Math.min(3, hits))];
}

/**
 * Brew it: the herbs go in, the fire is held (hits: 0–3 of the three
 * moments it had to be right), two 時辰 pass, and out comes what comes.
 */
export function brew(s, id, hits) {
  if (brewWhy(s, id)) return null;
  const R = RECIPES[id];
  const report = newReport();
  s.player.mp = Math.max(0, s.player.mp - R.mp);
  applyEffects(s, Object.entries(R.in).map(([k, n]) => ['item', k, -n]), {}, report);
  passTime(s, 4);
  const grade = brewGrade(hits);
  let n = 0;
  if (hits >= (R.min || 1)) n = Math.max(1, R.out + (hits === 3 ? 1 : hits === 1 ? -1 : 0));
  if (id === 'zhuji_pill') n = hits >= 2 ? 1 + (hits === 3 && Math.random() < 0.3 ? 1 : 0) : 0;
  if (n) addItem(s, id, n, report);
  if (!hits) applyEffects(s, [['hp', -0.12]], {}, report);
  s.vars.brewed = (s.vars.brewed || 0) + (n ? 1 : 0);
  const name = ITEMS[id].name;
  const text = !hits
    ? '爐火猛地竄了起來——砰的一聲，爐蓋飛了出去。一爐藥材全成了焦炭，你被燎掉了半邊眉毛。'
    : !n
      ? `火候差了一點。開爐時，爐底只有一團黏糊糊的藥渣，看不出是${name}。`
      : `${grade}。開爐時一股藥香撲面而來，爐底躺著 ${n} 顆${name}${hits === 3 ? '，顆顆圓潤，丹紋清晰' : ''}。`;
  notice(s, `煉丹・${name}`, text, { chips: report.chips });
  return { grade, n };
}

// ── 畫符 ──

/** A brush to hand: your own, or the cave's desk. */
export function hasBrush(s) {
  return has(s, 'fubi') || atHome(s);
}

/** The 符 you can draw: those you have had before (you know what they look like). */
export function drawable(s) {
  return Object.keys(GLYPHS).filter((id) => s.vars.seen?.[id]);
}

/** Why you cannot draw this now (null: you can). */
export function drawWhy(s, id) {
  const G = GLYPHS[id];
  if (!G) return '不會畫這個。';
  const busy = busyWhy(s);
  if (busy) return busy;
  if (!hasBrush(s)) return '身邊沒有符筆。';
  if (s.player.realm < 1) return '凡人畫的符沒有靈力，要先引氣入體。';
  if (!s.vars.seen?.[id]) return '沒見過這種符，不知道怎麼畫。';
  if (pools(s).mp < G.mp) return `靈力不夠（要 ${G.mp}）。`;
  return lacking(s, DRAW_COST);
}

/** How well a drawing came out, from how true it ran (0–1): '上品' | '成' | '廢'. */
export function drawGrade(score) {
  return score >= 0.85 ? '上品' : score >= 0.6 ? '成' : '廢';
}

/** Points along a line of points, about `step` apart (a long stroke counts for more than a short one). */
function along(points, step = 0.02) {
  const out = [];
  points.forEach(([x, y], k) => {
    if (!k) return out.push([x, y]);
    const [px, py] = points[k - 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / step));
    for (let j = 1; j <= n; j++) out.push([px + ((x - px) * j) / n, py + ((y - py) * j) / n]);
  });
  return out;
}

const near = (pts, [x, y], r) => pts.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 <= r * r);

/** How long a set of strokes is, laid end to end. */
function lengthOf(strokes) {
  let len = 0;
  for (const st of strokes) for (let k = 1; k < st.length; k++) len += Math.hypot(st[k][0] - st[k - 1][0], st[k][1] - st[k - 1][1]);
  return len;
}

/** How long the glyph is to draw (in its unit square). */
export function glyphLength(id) {
  return lengthOf(GLYPHS[id]?.strokes || []);
}

/** Seconds the 硃砂 stays wet once the brush first touches the paper (a longer glyph, longer). */
export function drawTime(id) {
  return Math.round(3 + 2.5 * glyphLength(id));
}

/**
 * How true a drawing ran (0–1): how much of the glyph the brush went over,
 * and how much of what the brush did was on the glyph. Ink far beyond the
 * glyph's own length (a page scribbled all over) is not the glyph; and
 * every stroke must be there — a 符 with one missing is not that 符.
 * strokes: what was drawn, in the glyph's unit square, stroke by stroke.
 */
export function traceScore(id, strokes) {
  const G = GLYPHS[id];
  const lines = (strokes || []).filter((st) => st?.length);
  const drawn = lines.flatMap((st) => along(st));
  if (!G || drawn.length < 2) return 0;
  const parts = G.strokes.map((st) => along(st));
  const glyph = parts.flat();
  const cover = (pts) => pts.filter((p) => near(drawn, p, 0.06)).length / pts.length;
  const onIt = drawn.filter((p) => near(glyph, p, 0.08)).length / drawn.length;
  const spill = Math.max(0, Math.min(1, 1 - (lengthOf(lines) / glyphLength(id) - 1.5) / 1.5));
  let score = cover(glyph) * (0.4 + 0.6 * onIt) * spill;
  if (parts.some((part) => cover(part) < 0.5)) score = Math.min(score, 0.5);
  return Math.round(score * 100) / 100;
}

/** Draw it: paper, 硃砂 and 靈力 spent, a 時辰 passes; a good hand makes one (or two). */
export function drawFu(s, id, score) {
  if (drawWhy(s, id)) return null;
  const G = GLYPHS[id];
  const report = newReport();
  s.player.mp = Math.max(0, s.player.mp - G.mp);
  applyEffects(s, Object.entries(DRAW_COST).map(([k, n]) => ['item', k, -n]), {}, report);
  passTime(s, 2);
  const grade = drawGrade(score);
  const n = grade === '上品' ? 2 : grade === '成' ? 1 : 0;
  if (n) addItem(s, id, n, report);
  s.vars.drawn = (s.vars.drawn || 0) + n;
  const name = ITEMS[id].name;
  const text = n === 2
    ? `一筆到底，符紋上的硃砂微微發亮。上品${name}——這一張靈氣足，剩下的硃砂又多畫了一張。`
    : n === 1
      ? `最後一筆收住，符紙輕輕一顫。成了一張${name}。`
      : '筆走偏了。靈力從斷了的符紋裡漏了出去，這張符廢了。';
  notice(s, `畫符・${name}`, text, { chips: report.chips });
  return { grade, n };
}

// ── 精煉 ──

/** What you have on that can be refined here: [{ id, slot, level, next: { cost, why } }]. */
export function refinable(s) {
  const shop = shopHere(s);
  const out = [];
  for (const [slot, id] of Object.entries(gearOf(s))) {
    if (!id || !(ITEMS[id]?.stats || ITEMS[id]?.power)) continue;
    const level = refineLevel(s, id);
    const cost = REFINE.cost[level + 1] || null;
    let why = null;
    if (!shop?.recipes) why = '要到百煉坊。';
    else if (!cost) why = '已經精煉到頭了。';
    else if (s.player.ls < cost.ls) why = `靈石不夠（${s.player.ls}/${cost.ls}）`;
    else why = lacking(s, cost.items);
    out.push({ id, slot, level, cost, why });
  }
  return out;
}

/** Have it refined one level. */
export function refine(s, id) {
  const r = refinable(s).find((x) => x.id === id);
  if (!r || r.why || busyWhy(s)) return false;
  const report = newReport();
  applyEffects(s, [['ls', -r.cost.ls], ...Object.entries(r.cost.items).map(([k, n]) => ['item', k, -n])], {}, report);
  s.player.refine ||= {};
  s.player.refine[id] = r.level + 1;
  notice(s, '精煉', `老韓把${ITEMS[id].name}放回爐裡，燒紅、捶打、淬火，又把妖獸內丹磨成粉撒了上去。\n\n「好了。」他把東西遞回給你，「比原來強了一截。」\n\n${ITEMS[id].name} +${r.level + 1}：它給你的，多了${Math.round(REFINE.each * 100)}%。`, { chips: report.chips });
  return true;
}
