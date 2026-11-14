// 血月那一夜 (1.3「血月」): 天元三千零二十二年七月十五. The 欽天監 means to strike 東荒's page out of the
// 命簿 with the ink 玉指峰 has seeped; from 戌時 to dawn the book lies open across the sky, and its red brush
// comes down, stroke by stroke, on the people and the places of 東荒. Where you stand at dusk is where you
// fight: in 東荒 (青石鎮, 清虛觀, 狐仙廟, 落霞坊市), at 白鶴渡 (where the old one under the river may eat the
// strokes that fly over it), in 天衍城 (up 玉指峰, to stop the brush early) — or somewhere else, where all
// there is to do is watch. The night goes in three watches (三更), each a fight of its own (world/combat.js
// beginNight) with a card between (content/events/bloodnight.js), and each a place to stand if the game is
// closed: a watch broken off begins again. Dawn settles it (world/night.js settle → 1.3's reckoning).
//
// s.vars.bloodNight: the night's day for this life (3022/7/15; a save already past it when 1.3 came: the
// next 七月十五 at least 30 days off — docs/1.3血月做法.md). s.vars.night: { day, phase, place, ink, landed,
// blocked, cut, eaten, stoppedAt, fled, fell, held, from, late, done } (phase 0: not begun; 1–3: the watch; 4:
// past the last of them; done once dawn is reckoned). held: the watches you stood through to their end. landed:
// the strokes that came down on the page, by place and mark ('qingshi.wanger'); ink: what you took on standing in
// the way of them (0–8); from: where the night stood when this watch began (a watch begun again starts from it).

import { dayAt, DAYS_PER_YEAR, START_YEAR } from '../core/calendar.js';

/** The night (world/arcs.js WINDOWS.bloodMoon). */
export const BLOOD_DAY = dayAt(10, 7, 15);
/** The moon rises at 戌時; the night is over at 寅時. */
export const DUSK = 19;
export const DAWN = 5;
/** Ink you can take on, standing in the way of the brush, before the book begins to write you. */
export const INK_MAX = 8;
/** The three watches: 一更、二更、三更 (the hours each ends at, from the night's day: 22:00, 1:00, 4:00). */
export const WATCHES = 3;
export const WATCH_END = [null, 22, 25, 28];
export const WATCH_NAME = [null, '一更', '二更', '三更'];
/** A watch, fought: about a minute and a half. */
export const WATCH_SECONDS = 85;
/** Days of warning a postponed night gives at the least. */
const NOTICE = 30;
/** (the clock is hours added up: what lands a hair short of the hour is on it) */
const EPS = 1e-6;

/** Where the night may be fought, by the region you stand in at dusk (the rest of 東荒: run to 青石鎮). */
export const PLACES = {
  qingshi: { region: 'qingshi_town', name: '青石鎮', at: [2300, 3150] },
  qingxu: { region: 'qingxu_temple', name: '清虛觀', at: [1060, 3205] },
  fox: { region: 'fox_shrine', name: '狐仙廟', at: [3040, 3040] },
  luoxia: { region: 'luoxia_market', name: '落霞坊市', at: [3960, 2600] },
  ferry: { region: 'crane_ferry', name: '白鶴渡', at: [4440, 3800] },
};
const BY_REGION = Object.fromEntries(Object.entries(PLACES).map(([id, p]) => [p.region, id]));

/**
 * Where the brush comes down at each place: never on you (you are not in the book), but on 東荒's people and its
 * places — the doors of its houses, the temple's and the shrine's gates, the town's tree and its shrine, the stalls
 * of the market, the pier. who: whose door it is (the reckoning at dawn: world/night.js).
 */
export const MARKS = {
  qingshi: [
    { id: 'wanger', name: '王二家', at: [2545, 3375], who: 'wang_er' },
    { id: 'huichun', name: '回春堂', at: [2215, 3220], who: 'sun_zg' },
    { id: 'shen', name: '沈家', at: [2475, 3098], who: 'shen_qingge' },
    { id: 'zhaohu', name: '趙虎家', at: [2330, 2992], who: 'zhao_hu' },
    { id: 'lin', name: '林家', at: [2010, 3096] },
    { id: 'tudi', name: '土地廟', at: [2000, 3332] },
    { id: 'huaishu', name: '老槐樹', at: [2420, 3220] },
    { id: 'tofu', name: '豆花攤', at: [2305, 3162] },
  ],
  qingxu: [
    { id: 'guan', name: '清虛觀', at: [1060, 3190], who: 'song_he' },
    { id: 'jing', name: '古井', at: [1150, 3142] },
    { id: 'yuan', name: '觀裡的庭院', at: [1000, 3226] },
  ],
  fox: [
    { id: 'miao', name: '狐仙廟', at: [3110, 3035], who: 'hu_sanniang' },
    { id: 'jie', name: '廟前的石階', at: [3020, 3090] },
    { id: 'dong', name: '狐狸洞', at: [3200, 3080] },
  ],
  luoxia: [
    { id: 'banxian', name: '錢半仙的攤子', at: [4100, 2560], who: 'qian_banxian' },
    { id: 'lukou', name: '坊市路口', at: [3960, 2630] },
    { id: 'chalou', name: '茶樓', at: [4090, 2526] },
    { id: 'baicao', name: '百草堂', at: [3820, 2534] },
    { id: 'jubao', name: '聚寶閣', at: [4220, 2471] },
    { id: 'jiusi', name: '酒肆', at: [3690, 2484] },
  ],
  ferry: [
    { id: 'dukou', name: '白鶴渡口', at: [4590, 3980] },
    { id: 'chuanjia', name: '船家的屋子', at: [4380, 3900] },
    { id: 'liu', name: '江邊的老柳', at: [4480, 4050] },
  ],
};

/** A stroke came down on the page (at a place, on a mark). */
export function strokeLanded(s, place, mark) {
  const n = nightOf(s);
  if (!n) return 0;
  const key = `${place}.${mark}`;
  n.landed[key] = (n.landed[key] || 0) + 1;
  return n.landed[key];
}

/** How many came down at a place (or on one mark of it). */
export function landedAt(s, place, mark = null) {
  const n = nightOf(s);
  if (!n) return 0;
  if (mark) return n.landed[`${place}.${mark}`] || 0;
  return Object.entries(n.landed).filter(([k]) => k.startsWith(`${place}.`)).reduce((a, [, v]) => a + v, 0);
}

/**
 * A watch begins: where the night stands is kept; and if this watch was begun before (the game was closed in the
 * middle of it), the night goes back to where it stood then, and the watch is fought again from there.
 */
export function watchBegins(s) {
  const n = nightOf(s);
  if (!n) return;
  const keep = (x) => ({ landed: { ...x.landed }, ink: x.ink, blocked: x.blocked, cut: x.cut, eaten: x.eaten, kills: x.kills || 0, down: { ...(x.down || {}) }, inked: { ...(x.inked || {}) } });
  if (n.from?.phase === n.phase) Object.assign(n, keep(n.from));
  else n.from = { phase: n.phase, ...keep(n) };
}

/**
 * Those who said they would be there that night, at the place you stand, and fight at your side (and are in the
 * book: the brush can find them): 林塵, 天劍宗's disciples and 蕭七's 散修 in 青石鎮 (the 名冊: world/roster.js);
 * 松鶴道人 at his temple; 胡三娘's foxes on her hill. One who went down in a watch is not in the next.
 * [{ id, kind, who: an npc id, or { name } }]
 */
export function helpersAt(s, place) {
  const f = (k) => !!s.flags?.[k];
  const alive = (id) => !!s.npcs?.[id]?.alive;
  const down = nightOf(s)?.down || {};
  const out = [];
  const add = (id, kind, who) => {
    if (!down[id]) out.push({ id, kind, who });
  };
  if (place === 'qingshi') {
    if (f('roster_lin') && alive('lin_chen')) add('lin_chen', 'cultivator', 'lin_chen');
    if (f('roster_tj') && !f('roster_ye_star')) {
      add('tj1', 'tj_disciple', { name: '天劍宗弟子' });
      add('tj2', 'tj_disciple', { name: '天劍宗弟子' });
    }
    if (f('roster_xiao')) {
      add('xiao1', 'cultivator', { name: '鬼市的散修' });
      add('xiao2', 'cultivator', { name: '鬼市的散修' });
    }
  }
  if (place === 'qingxu' && alive('song_he') && s.npcs.song_he.loc === 'qingxu_temple') add('song_he', 'cultivator', 'song_he');
  if (place === 'fox' && f('roster_fox') && alive('hu_sanniang') && !f('fox_betrayed')) {
    add('fox1', 'fox_phantom', { name: '狐影' });
    add('fox2', 'fox_phantom', { name: '狐影' });
  }
  return out;
}

/** The night's day for this life (worked out once; a save past it when this came, the next 七月十五 at least a month off). */
export function nightDay(s) {
  s.vars ||= {};
  if (s.vars.bloodNight == null) s.vars.bloodNight = firstNight(s);
  return s.vars.bloodNight;
}

function firstNight(s) {
  const day = s.day || 0;
  const tod = s.tod ?? 8;
  // not yet come (or in the middle of it now)
  if (day <= BLOOD_DAY || (day === BLOOD_DAY + 1 && tod < DAWN && !s.flags?.blood_moon_omen)) return BLOOD_DAY;
  // gone by already, in a build where the stroke never fell: 「未竟。墨不足。」 — the next 七月十五, a month off at the least
  let d = BLOOD_DAY + DAYS_PER_YEAR;
  while (d < day + NOTICE) d += DAYS_PER_YEAR;
  return d;
}

/** Was the night put off for this save (it came when the night was already past)? */
export const postponed = (s) => nightDay(s) !== BLOOD_DAY;

/** The night as it stands (null before it begins). */
export const nightOf = (s) => s.vars?.night || null;

/** Is it over (dawn has come and been reckoned)? */
export const nightDone = (s) => !!s.vars?.night?.done;

/** Is it the night now (from dusk on its day to dawn after)? */
export function inNightHours(s) {
  const d = nightDay(s);
  return (s.day === d && s.tod >= DUSK - EPS) || (s.day === d + 1 && s.tod < DAWN - EPS);
}

/** Is the night past, by the clock (dawn of the day after)? */
export function pastNight(s) {
  const d = nightDay(s);
  return s.day > d + 1 || (s.day === d + 1 && s.tod >= DAWN - EPS);
}

/** Where you are, as the night has it: a place of 東荒 to fight at, 東荒 elsewhere ('east'), 天衍城 ('peak'), or anywhere else ('away'). */
export function placeOf(s) {
  const map = s.world?.map || 'donghuang';
  if (map === 'tianyan') return 'peak';
  if (map !== 'donghuang') return 'away';
  return BY_REGION[s.player.loc] || 'east';
}

/** Which watch the clock is in now (1–3; 4 once the last is over; 0 before dusk). */
export function watchNow(s) {
  const d = nightDay(s);
  const h = (s.day - d) * 24 + s.tod + EPS;
  if (h < DUSK) return 0;
  for (let k = 1; k <= WATCHES; k++) if (h < WATCH_END[k]) return k;
  return WATCHES + 1;
}

/**
 * What the night wants of the world now (world/explore.js step): 'rise' at dusk on its day (it opens wherever you
 * are); 'missed' when it went by unopened (slept, rested or travelled through); 'dawn' when it is past, or past its
 * last watch, and not yet reckoned (the card was lost, or the clock ran on); else null.
 */
export function nightWants(s) {
  if (nightDone(s)) return null;
  const n = nightOf(s);
  if (!n) return inNightHours(s) ? 'rise' : pastNight(s) ? 'missed' : null;
  return pastNight(s) || n.phase > WATCHES ? 'dawn' : null;
}

/** Begin it: where you stand decides what it is (the card that opens it: content/events/bloodnight.js night_rise). */
export function openNight(s, place = placeOf(s)) {
  s.vars.night = {
    day: nightDay(s), phase: 0, place, ink: 0,
    landed: {}, blocked: 0, cut: 0, eaten: 0, stoppedAt: null, fled: false, fell: 0, held: {},
    late: s.tod >= WATCH_END[1] || s.day > nightDay(s), done: false,
  };
  return s.vars.night;
}

/** Is a watch being fought where you stand now (world/combat.js begins it if it is not under way)? */
export function watchOn(s) {
  const n = nightOf(s);
  return !!n && !n.done && !n.fled && n.phase >= 1 && n.phase <= WATCHES && !!PLACES[n.place] && !pastNight(s);
}

/** The place the watch is fought at: its middle, and its name. */
export function fieldOf(s) {
  const n = nightOf(s);
  const P = PLACES[n?.place] || PLACES.qingshi;
  return P;
}

/** Into the next watch — the one the clock is in, if you come to it late (past the last: dawn is next). */
export function nextWatch(s) {
  const n = nightOf(s);
  if (!n) return null;
  n.phase = Math.min(WATCHES + 1, Math.max(n.phase + 1, watchNow(s)));
  return n.phase;
}

/** You left the field (ran, or hid till dawn): the rest of the night goes on without you. */
export function leaveField(s) {
  const n = nightOf(s);
  if (n) n.fled = true;
}

/** Hours from now to the end of this watch (for the card between watches). */
export function hoursToWatchEnd(s, phase) {
  const n = nightOf(s);
  const end = n.day * 24 + WATCH_END[phase];
  const now = s.day * 24 + s.tod;
  return Math.max(0, end - now);
}

/** Hours from now to dawn. */
export function hoursToDawn(s) {
  const n = nightOf(s) || { day: nightDay(s) };
  const end = (n.day + 1) * 24 + DAWN;
  const now = s.day * 24 + s.tod;
  return Math.max(0, end - now);
}

/** The night went by without you in it (slept or rested through: 'slept'; sat through in seclusion: 'secl'). */
export function missNight(s, why = 'slept') {
  const n = nightOf(s) || openNight(s, why);
  n.place = why;
  n.fled = true;
  n.phase = WATCHES + 1;
  return n;
}

/** Up 玉指峰 that night (content/events/bloodnight.js night_climb): you came to its top, and the brush stopped with the watch you came up in. */
export function stopBrush(s) {
  const n = nightOf(s);
  if (!n) return null;
  n.stoppedAt = Math.max(1, Math.min(WATCHES + 1, watchNow(s)));
  return n.stoppedAt;
}

/** Dawn: what came of it (1.3 reckons each of 東荒's people from this: world/night.js settle). */
export function settle(s) {
  const n = nightOf(s);
  if (!n || n.done) return n;
  n.phase = WATCHES + 1;
  n.done = true;
  s.flags.blood_night_done = true;
  // (the book began to write you: kept, for what is to come)
  if (n.ink >= INK_MAX) s.flags.night_ink_full = true;
  return n;
}

// ── words ──

const CN = '〇一二三四五六七八九';

/** A year of 天元 written out (三千零二十二). */
export function yearText(y) {
  const th = Math.floor(y / 1000);
  const h = Math.floor(y / 100) % 10;
  const t = Math.floor(y / 10) % 10;
  const o = y % 10;
  let out = `${CN[th]}千`;
  if (h) out += `${CN[h]}百`;
  else if (t || o) out += '零';
  if (t) out += `${CN[t]}十`;
  else if (o && h) out += '零';
  if (o) out += CN[o];
  return out;
}

/** The night's date, written out: 天元三千零二十二年七月十五. */
export function nightDate(s) {
  const d = nightDay(s);
  return `天元${yearText(START_YEAR + Math.floor(d / DAYS_PER_YEAR))}年七月十五`;
}
