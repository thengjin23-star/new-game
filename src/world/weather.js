// 天時: the weather over the land, hour by hour, and the signs in the sky.
// It comes from the save's seed, not from chance: the same save at the
// same hour always has the same sky. A front passes over the whole of
// 青石一帶 at once, though the valley, the lake and the river keep their
// mists longer, and the high peaks stand above the clouds.

import { seasonOf, dateOf, dayAt } from '../core/calendar.js';
import { NODES } from './map.js';
import { landTable } from './maps/index.js';

/**
 * Kinds of weather. walk: how fast you go on foot in it; see: how far you
 * (and anything looking for you) can see; dim: how much it darkens the day;
 * wet: fire burns weaker in it; thunder: lightning finds what flies.
 */
export const WEATHER = {
  clear: { name: '晴', walk: 1, see: 1, dim: 0 },
  cloudy: { name: '陰', walk: 1, see: 0.95, dim: 0.14 },
  rain: { name: '雨', walk: 0.92, see: 0.8, dim: 0.28, wet: true },
  storm: { name: '雷雨', walk: 0.86, see: 0.65, dim: 0.42, wet: true, thunder: true },
  fog: { name: '霧', walk: 0.97, see: 0.55, dim: 0.12, fog: true },
  snow: { name: '雪', walk: 0.88, see: 0.8, dim: 0.16, snow: true },
  // dry country's (西漠, 0.22): a noon sun that burns, a wind that is all sand (nothing flies in it)
  heat: { name: '烈日', walk: 0.94, see: 0.94, dim: 0, heat: true },
  sandstorm: { name: '沙暴', walk: 0.7, see: 0.4, dim: 0.36, sand: true },
};

/** Signs in the sky. */
export const SIGNS = {
  fullmoon: { name: '月圓', desc: '十五的月亮。月華如水，打坐的人覺得靈氣格外清透；陰物也格外躁動。' },
  bloodmoon: { name: '血月', desc: '月亮邊上一圈血紅。老人們說這不是好兆頭：山裡的東西今夜都紅了眼。' },
  tide: { name: '靈潮', desc: '天地靈氣漲潮的日子，一年兩回。這幾天修煉，事半功倍。' },
};

function h1(seed, n) {
  let h = Math.imul(n | 0, 374761393) ^ Math.imul(seed | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth noise along one line (time). */
function noise1(seed, x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return h1(seed, i) + (h1(seed, i + 1) - h1(seed, i)) * u;
}

/** How each season leans: wetter or drier, how much of its rain is storm, how misty. */
const LEAN = {
  spring: { wet: 0.02, storm: 0.25, fog: 0.02 },
  summer: { wet: 0.02, storm: 0.6, fog: -0.02 },
  autumn: { wet: -0.04, storm: 0.12, fog: 0.04 },
  winter: { wet: 0.02, storm: 0, fog: 0.03 },
};

/** Places that keep their mists. */
const MISTY = { lingxi_valley: 0.12, mirror_lake: 0.1, black_forest: 0.05, river_isle: 0.12, great_river: 0.12, crane_ferry: 0.08, ...landTable('misty') };

/** Dry country (another map's, world/maps/): no rain and no mist there. */
const ARID = landTable('arid');

/** The hour of the world, counted from the first morning. */
const hourOf = (s) => s.day * 24 + (s.tod ?? 8);

/** The weather over a region at an hour (now, here, if not said). */
export function weatherAt(s, region = s.player?.loc, hour = hourOf(s)) {
  // (tools and tests can hold the sky still)
  if (s.vars?.sky && WEATHER[s.vars.sky]) return s.vars.sky;
  const seed = (s.seed | 0) ^ 0x5bd1e995;
  const day = Math.floor(hour / 24);
  // the first three days of a life are fair (a first look at the world should be a clear one)
  if (day < 3) return 'clear';
  const season = seasonOf(day);
  const L = LEAN[season];
  // up on a high peak you stand above it all
  if (NODES[region]?.kind === 'peak') return 'clear';
  const wet = noise1(seed, hour / 14) * 0.7 + noise1(seed + 7, hour / 5) * 0.3 + L.wet;
  if (ARID[region]) return dryWeather(seed, hour, wet, season);
  if (wet > 0.66) {
    if (season === 'winter') return 'snow';
    return wet > 0.72 && noise1(seed + 29, hour / 6) < L.storm ? 'storm' : 'rain';
  }
  const tod = ((hour % 24) + 24) % 24;
  const morning = tod >= 4 && tod < 10 ? 0.1 : 0;
  if (noise1(seed + 41, hour / 9) + (MISTY[region] || 0) + L.fog + morning > 0.9) return 'fog';
  if (noise1(seed + 13, hour / 20) > 0.7 || wet > 0.6) return 'cloudy';
  return 'clear';
}

/**
 * Over dry country the same front brings no rain: where it would rain hard
 * the wind gets up and fills with sand; a little less, and the sky is only
 * dull with dust. A clear day burns from late morning to the middle of the
 * afternoon (not in winter: the desert's winter sun is thin).
 */
function dryWeather(seed, hour, wet, season) {
  if (wet > 0.8) return 'sandstorm';
  if (wet > 0.72 || noise1(seed + 13, hour / 20) > 0.8) return 'cloudy';
  const tod = ((hour % 24) + 24) % 24;
  if (tod >= 11 && tod < 16 && season !== 'winter') return 'heat';
  return 'clear';
}

/** The weather now, with what it does. */
export function weatherNow(s, region) {
  const id = weatherAt(s, region);
  return { id, ...WEATHER[id] };
}

/** How many hours until it stops raining (or snowing, or blowing sand) here: at most a day. */
export function hoursToClear(s, region = s.player?.loc) {
  const h0 = hourOf(s);
  for (let k = 1; k <= 24; k++) {
    const w = WEATHER[weatherAt(s, region, h0 + k)];
    if (!w.wet && !w.snow && !w.sand) return k;
  }
  return 24;
}

/** Is it a 靈潮 day (twice a year: the tenth to the twelfth of the third and ninth months)? */
export function inTide(day) {
  const { month, day: d } = dateOf(day);
  return (month === 3 || month === 9) && d >= 10 && d <= 12;
}

/** Is the full moon tonight a blood moon? (Only now and then, and only from the sixth year: a sign of what is to come.) */
export function bloodMoon(s, day = s.day) {
  if (day < dayAt(5, 9) || dateOf(day).day !== 15) return false;
  return h1((s.seed | 0) + 77, Math.floor(day / 30)) < 0.3;
}

/**
 * Signs in the sky today: the full moon (the fifteenth; a blood moon, now
 * and then, in later years), a 靈潮. night: only those that show at night
 * are moons.
 */
export function skySigns(s, day = s.day) {
  const out = [];
  if (dateOf(day).day === 15) out.push(bloodMoon(s, day) ? 'bloodmoon' : 'fullmoon');
  if (inTide(day)) out.push('tide');
  return out;
}

/** Is it night under a moon of this kind ('fullmoon' or 'bloodmoon')? */
export function moonTonight(s, kind) {
  const night = s.tod >= 18.5 || s.tod < 5;
  // (the small hours belong to the night before)
  const day = s.tod < 5 ? s.day - 1 : s.day;
  return night && skySigns(s, day).includes(kind);
}

/** The next time a sign comes, from today: { sign, day }, for each sign (within a year). */
export function nextSigns(s) {
  const out = {};
  for (let d = s.day; d < s.day + 360 && Object.keys(out).length < 3; d++) {
    for (const k of skySigns(s, d)) if (!out[k]) out[k] = d;
  }
  return out;
}
