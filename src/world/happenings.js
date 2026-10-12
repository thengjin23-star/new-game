// 世界大事: what is happening in 青石一帶, and what is coming. Some keep the
// calendar (a 靈潮, a 秘境 opening, the 坊市's auction, the sect's 大比 and
// its recruitment); some come out of the blue, told of only a little
// before: a 獸潮, when the wolves of 黑風林 come down on 青石鎮 in the
// night; 異寶出世, when a light falls out of the sky and everyone who sees
// it runs for it. All come from the save's seed: the same life, the same
// years.

import { dayAt, DAYS_PER_YEAR } from '../core/calendar.js';
import { inTide } from './weather.js';
import { SECRET_REALMS } from './realms.js';
import { WINDOWS } from './arcs.js';

function h1(seed, n) {
  let h = Math.imul(n | 0, 374761393) ^ Math.imul(seed | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ── 獸潮 ──

/** The night of this year's 獸潮 (from the second year; most years have one), or null. */
export function tideNight(s, year) {
  if (year < 1 || h1((s.seed | 0) + 3, year) > 0.7) return null;
  const month = 2 + Math.floor(h1((s.seed | 0) + 4, year) * 9);
  const d = 10 + Math.floor(h1((s.seed | 0) + 6, year) * 10);
  return dayAt(year, month, d);
}

/** Is it the night of a 獸潮 now (from dusk on its day to dawn after)? The year it is, if so. */
export function tideTonight(s) {
  const y = Math.floor(s.day / DAYS_PER_YEAR);
  for (const yy of [y, y - 1]) {
    const n = tideNight(s, yy);
    if (n === null) continue;
    if ((s.day === n && s.tod >= 19) || (s.day === n + 1 && s.tod < 5)) return yy;
  }
  return null;
}

// ── 異寶出世 ──

/** Where a treasure may come down: POIs (world/places.js 'omen_*'), one each. */
export const OMEN_SPOTS = ['omen_wilds', 'omen_forest', 'omen_hill', 'omen_south', 'omen_east'];
const OMEN_DAYS = 5;

/** The treasures that come down this year: [{ day, spot }] (three a year, from the first autumn on). */
export function omensOf(s, year) {
  const out = [];
  for (let k = 0; k < 3; k++) {
    const day = dayAt(year, 1, 1) + Math.floor(h1((s.seed | 0) + 9, year * 3 + k) * (DAYS_PER_YEAR - OMEN_DAYS));
    if (day < dayAt(0, 7, 1)) continue;
    out.push({ day, spot: OMEN_SPOTS[Math.floor(h1((s.seed | 0) + 11, year * 3 + k) * OMEN_SPOTS.length)], key: `${year}:${k}` });
  }
  return out.sort((a, b) => a.day - b.day);
}

/** The treasure down now at a spot, if any (and not yet taken): { day, spot, key }. */
export function omenAt(s, spot) {
  const y = Math.floor(s.day / DAYS_PER_YEAR);
  for (const yy of [y, y - 1]) {
    for (const o of omensOf(s, yy)) {
      if (o.spot !== spot || s.day < o.day || s.day >= o.day + OMEN_DAYS) continue;
      if (s.vars.omensTaken?.[o.key]) continue;
      return o;
    }
  }
  return null;
}

/** The treasure down now nearest to (x, y): its spot, or null. */
export function omenNear(s, x, y, places) {
  let best = null;
  let bd = Infinity;
  for (const spot of OMEN_SPOTS) {
    if (!omenAt(s, spot)) continue;
    const p = places[spot];
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) {
      bd = d;
      best = spot;
    }
  }
  return best;
}

/** It is yours (or gone): it will not show again. */
export function takeOmen(s, spot) {
  const o = omenAt(s, spot);
  if (!o) return;
  s.vars.omensTaken ||= {};
  s.vars.omensTaken[o.key] = s.day;
}

// ── the calendar ──

/**
 * What is going on now and what is coming, within `days`: [{ name, from,
 * to, where, note }] (to: the last day, inclusive), soonest first. A 獸潮
 * shows only once the signs are out (five days before); a treasure only
 * once it has come down.
 */
export function happenings(s, days = 240) {
  const out = [];
  const end = s.day + days;
  const year = Math.floor(s.day / DAYS_PER_YEAR);
  // 靈潮: the next two
  let found = 0;
  for (let d = s.day - 3; d < end && found < 2; d++) {
    if (!inTide(d) || inTide(d - 1)) continue;
    if (d + 2 >= s.day) {
      out.push({ name: '靈潮', from: d, to: d + 2, where: '天下', note: '天地靈氣漲潮，修煉事半功倍。' });
      found++;
    }
  }
  // 秘境
  for (const R of Object.values(SECRET_REALMS)) {
    let from = null;
    for (let d = s.day; d >= s.day - 31 && from === null; d--) if (R.when(d) !== null && R.when(d - 1) === null) from = d;
    if (from === null || R.when(s.day) === null) from = R.next(s.day);
    let to = from;
    while (R.when(to + 1) !== null) to++;
    if (from < end) out.push({ name: `${R.name}開啟`, from, to, where: R.name === '古戰場秘境' ? '古戰場遺跡' : '鏡湖・湖心亭', note: '每次開啟，只能闖一回。' });
  }
  // the auction (from the first autumn), the 大比, the recruitment
  for (const y of [year, year + 1]) {
    const a = dayAt(y, 10, 10);
    if (a >= 200 && a + 14 >= s.day && a < end) out.push({ name: '聚寶閣拍賣會', from: a, to: a + 14, where: '落霞坊市', note: '一年一度，壓軸的據說是築基丹。' });
    const t = dayAt(y, 6, 1);
    if (t + 9 >= s.day && t < end) out.push({ name: '青雲宗大比', from: t, to: t + 9, where: '青雲宗・任務堂', note: '只有青雲宗弟子能上台。' });
  }
  for (let k = 0; k < 3; k++) {
    const r = WINDOWS.recruit[0] + k * 10 * DAYS_PER_YEAR;
    if (r + 29 >= s.day && r < end) out.push({ name: '青雲宗開山收徒', from: r, to: r + 29, where: '青雲宗山門', note: '十年一回。' });
  }
  // a 獸潮, once the signs are out
  for (const y of [year, year + 1]) {
    const n = tideNight(s, y);
    if (n !== null && n - s.day <= 5 && n + 1 >= s.day) out.push({ name: '獸潮', from: n, to: n, where: '青石鎮', note: '黑風林的狼要下山了。入夜之後，鎮北。' });
  }
  // a treasure, once it has come down
  for (const spot of OMEN_SPOTS) {
    const o = omenAt(s, spot);
    if (o) out.push({ name: '異寶出世', from: o.day, to: o.day + OMEN_DAYS - 1, where: OMEN_WHERE[spot], note: '寶光落下的地方，各路散修都趕過去了。', spot });
  }
  return out.filter((x) => x.to >= s.day).sort((a, b) => a.from - b.from);
}

/** Where each treasure spot is, in words. */
export const OMEN_WHERE = {
  omen_wilds: '東荒野地北邊',
  omen_forest: '黑風林東緣',
  omen_hill: '青石山東麓',
  omen_south: '東荒野地南邊',
  omen_east: '黑風林深處',
};

/** In words: how far off it is. */
export function whenWord(s, h) {
  if (h.from <= s.day && s.day <= h.to) return '正在進行';
  const n = h.from - s.day;
  return n === 1 ? '明天' : `還有 ${n} 天`;
}

