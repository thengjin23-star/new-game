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
import { mapOf } from './map.js';
import { rumor } from './rumors.js';

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
/** The brush on a field: seconds between strokes by watch (a place thick with names: 青石鎮; thinner, fewer), the first a few seconds in. */
export const STROKE_EVERY = [null, 12, 8.5, 6.5];
export const STROKE_FIRST = 6;
export const DENSITY = { qingshi: 1, luoxia: 0.5, qingxu: 0.15, fox: 0.2, ferry: 0.2 };
/** How many strokes come down on a place in a watch, with nobody there to stand in the way. */
export function strokesIn(place, phase) {
  return Math.round(1 + ((WATCH_SECONDS - STROKE_FIRST) * (DENSITY[place] || 0.4)) / STROKE_EVERY[phase]);
}
/** (狐仙廟) 胡三娘's hill: 「三百年沒讓那支筆碰過」 — half the strokes that come down on it are turned aside, while she keeps it. */
export const hillHolds = (s) => !!s.npcs?.hu_sanniang?.alive && !s.flags?.fox_betrayed;
/** (白鶴渡) the old one under the river, woken (you met the old man on the 江心洲): half the strokes over the water, swallowed. */
export const oldOneWakes = (s) => !!s.flags?.isle_fisher_met;
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
export function helpersAt(s, place, all = false) {
  const f = (k) => !!s.flags?.[k];
  const alive = (id) => !!s.npcs?.[id]?.alive;
  const down = all ? {} : nightOf(s)?.down || {};
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

/** Dawn: what came of it — the strokes where nobody stood, then each of 東荒's people (reckon). */
export function settle(s) {
  const n = nightOf(s);
  if (!n || n.done) return n;
  n.phase = WATCHES + 1;
  n.done = true;
  s.flags.blood_night_done = true;
  // (the book began to write you: kept, for what is to come)
  if (n.ink >= INK_MAX) s.flags.night_ink_full = true;
  reckon(s);
  applyNight(s);
  return n;
}

// ── dawn: the reckoning ──

/** Where each of the 名冊's people lives (the mark on their door). */
const HOME = {};
for (const [place, list] of Object.entries(MARKS)) for (const m of list) if (m.who) HOME[m.who] = { place, mark: m.id };
/** The people of the 名冊 (world/roster.js ROSTER), in its order. */
export const NIGHT_PEOPLE = ['wang_er', 'sun_zg', 'song_he', 'hu_sanniang', 'shen_qingge', 'zhao_hu', 'qian_banxian'];
/** Strokes on one's own mark: from this many, one does not live; from one, one is hurt. */
const DEADLY = 3;

/**
 * Where one of them is that night: over the river (上官家's boat on 七月十三), or gone from 東荒 already (null);
 * in a shelter on the 名冊 (清虛觀's courtyard, the fox's den on 胡三娘's hill); else at home.
 */
export function nightSpot(s, id) {
  const p = s.npcs?.[id];
  if (!p?.alive) return null;
  if ((s.vars.night_evac || []).includes(id)) return null;
  if (p.loc && mapOf(p.loc) !== 'donghuang') return null;
  const plan = s.vars.roster?.[id];
  if (plan === 'qingxu') return { place: 'qingxu', mark: 'yuan' };
  if (plan === 'fox') return { place: 'fox', mark: 'dong' };
  return HOME[id] || null;
}

/** The night's own dice for the reckoning (a life's seed, kept positive). */
function dice(s) {
  let seed = ((s.seed >>> 0) % 2147483646) + 1;
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/** Was a watch at a place stood through by you (and so its strokes came down as you saw them)? */
const heldThere = (n, place, k) => n.place === place && !!n.held?.[k];

/**
 * The strokes where nobody stood: every place of 東荒, every watch you were not there to see (up to the one the
 * brush stopped in, if you got to the top of 玉指峰) — less what 胡三娘's hill turned aside and what the old one
 * under the river swallowed. Then each of the 名冊's people, and those who fought at your side.
 */
export function reckon(s) {
  const n = nightOf(s);
  if (!n || n.reckoned) return n;
  n.reckoned = true;
  const roll = dice(s);
  n.turned ||= 0;
  for (const place of Object.keys(PLACES)) {
    const marks = MARKS[place];
    for (let k = 1; k <= WATCHES; k++) {
      if (n.stoppedAt && k > n.stoppedAt) continue;
      if (heldThere(n, place, k)) continue;
      let count = strokesIn(place, k);
      // (a watch left in the middle: only what was still to come of it)
      if (n.left?.place === place && n.left.phase === k) count = Math.round(count * n.left.frac);
      for (let i = 0; i < count; i++) {
        const m = marks[Math.min(marks.length - 1, Math.floor(roll() * marks.length))];
        if (place === 'ferry' && oldOneWakes(s) && roll() < 0.5) {
          n.eaten += 1;
          continue;
        }
        if (place === 'fox' && hillHolds(s) && roll() < 0.5) {
          n.turned += 1;
          continue;
        }
        strokeLanded(s, place, m.id);
        // (those who said they would be in 青石鎮, there without you: in the book, the brush can find them)
        if (place === 'qingshi' && roll() < 0.12) {
          const hs = helpersAt(s, 'qingshi');
          if (hs.length) {
            const h = hs[Math.min(hs.length - 1, Math.floor(roll() * hs.length))];
            (n.inked ||= {})[h.id] = (n.inked[h.id] || 0) + 1;
          }
        }
      }
    }
  }
  n.fates = {};
  for (const id of NIGHT_PEOPLE) {
    const p = s.npcs?.[id];
    if (!p?.alive) continue;
    n.fates[id] = fateOfNight(s, n, id, roll);
  }
  // those at your side in 青石鎮
  for (const h of helpersAt(s, 'qingshi', true)) {
    const hits = n.inked?.[h.id] || 0;
    n.fates[`helper:${h.id}`] = { fate: hits >= 2 ? 'dead' : hits || n.down?.[h.id] ? 'hurt' : 'fine', strokes: hits, helper: true, who: h.who };
  }
  // 蘇清瑤 on the 觀星台
  if (suOnTop(s)) n.fates.su_qingyao = { fate: s.flags.su_star_kept || s.flags.roster_ye_star ? 'fine' : 'dead', place: 'peak', with: s.flags.su_star_kept ? 'you' : s.flags.roster_ye_star ? 'ye' : null };
  n.total = Object.values(n.landed).reduce((a, b) => a + b, 0);
  return n;
}

/** Above this many strokes on the page in all, the crack in the sky over 東荒 does not close. */
const CRACK_OPEN = 30;
/** A place struck this hard: for a year after, what lives about it is fiercer. */
const SCARRED = 10;
/** The names of the places, for what is said of them. */
const PLACE_NAME = Object.fromEntries(Object.entries(PLACES).map(([id, p]) => [id, p.name]));
/** What each of them is called on the 名冊. */
const ROSTER_NAME = { wang_er: '王二一家', sun_zg: '孫掌櫃', song_he: '松鶴道人', hu_sanniang: '胡三娘', shen_qingge: '沈家', zhao_hu: '趙虎', qian_banxian: '錢半仙' };

/**
 * Dawn come and reckoned: those it took are gone (and the 命簿 has their page torn out), those it hurt are hurt;
 * the crack in the sky closes, or does not; the places struck hardest are wild for a year; and it is talked of.
 */
export function applyNight(s) {
  const n = nightOf(s);
  if (!n?.fates || n.applied) return n;
  n.applied = true;
  for (const [id, F] of Object.entries(n.fates)) {
    if (F.helper) continue;
    const p = s.npcs[id];
    if (!p) continue;
    if (F.fate === 'dead') {
      p.alive = false;
      p.diedDay = s.day;
      p.nightTorn = true;
      s.flags[`night_dead_${id}`] = true;
      rumor(s, id === 'su_qingyao' ? '天衍城的人說，七月十五那一夜，欽天監的蘇星官從觀星台上下來以後，就再也沒有醒過來。' : `東荒的人說，七月十五那一夜，${ROSTER_NAME[id] || p.name}沒有熬過去。`, 'arc', id);
    } else if (F.fate === 'hurt') {
      s.flags[`night_hurt_${id}`] = true;
    }
  }
  const lin = n.fates['helper:lin_chen'];
  if (lin?.fate === 'dead' && s.npcs.lin_chen?.alive) {
    s.npcs.lin_chen.alive = false;
    s.npcs.lin_chen.diedDay = s.day;
    s.npcs.lin_chen.nightTorn = true;
    s.flags.night_dead_lin_chen = true;
    rumor(s, '青石鎮的人說，七月十五那一夜，林家少爺守在鎮口，一直守到天亮。天亮的時候，他倒在那裡，再也沒有起來。', 'arc', 'lin_chen');
  }
  // the crack in the sky
  s.vars.night_crack = n.total > CRACK_OPEN ? 'open' : 'closed';
  rumor(s, s.vars.night_crack === 'open'
    ? '東荒的夜空裡多了一道紅痕，像一道沒有長好的疤。老人們說，那是天上那本書，撕了一半。'
    : '七月十五那一夜，天上裂開的那道縫，天亮的時候合上了。只是月亮，從此有一點點紅。', 'arc');
  // the places struck hardest: wild for a year
  s.vars.night_scar = {};
  for (const place of Object.keys(PLACES)) {
    const k = landedAt(s, place);
    if (k >= SCARRED) {
      s.vars.night_scar[place] = s.day + DAYS_PER_YEAR;
      rumor(s, `${PLACE_NAME[place]}那一夜落了${k}筆。山裡的東西，一年之內都紅著眼睛。`, 'hint');
    }
  }
  return n;
}

/** Is (x, y) near a place struck hard that night, within the year after (its beasts are fiercer)? */
export function scarredAt(s, x, y) {
  const scar = s.vars?.night_scar;
  if (!scar || (s.world?.map || 'donghuang') !== 'donghuang') return false;
  for (const [place, until] of Object.entries(scar)) {
    if (s.day >= until) continue;
    const P = PLACES[place];
    if (Math.hypot(x - P.at[0], y - P.at[1]) < 1500) return true;
  }
  return false;
}

/** 蘇清瑤 is up on the 觀星台 that night (she found it out, and is back at 欽天監). */
export const suOnTop = (s) => !!s.npcs?.su_qingyao?.alive && (!!s.flags?.su_archive || !!s.flags?.su_token);

/** One of them, by what came down on them and who was with them. */
function fateOfNight(s, n, id, roll) {
  const spot = nightSpot(s, id);
  const plan = s.vars.roster?.[id] || null;
  if (!spot) return { fate: 'safe', plan };
  let strokes = landedAt(s, spot.place, spot.mark);
  // a 護身符 takes the first that finds them
  const charm = plan === 'charm' && strokes > 0;
  if (charm) strokes -= 1;
  const out = { place: spot.place, mark: spot.mark, strokes, charm, plan };
  if (strokes >= DEADLY) return { ...out, fate: 'dead' };
  if (strokes >= 1) return { ...out, fate: 'hurt' };
  // nothing came down on them: what came down out of the hills is another matter, with nobody keeping it off
  const kept = !!plan && plan !== 'charm' || n.place === spot.place || helpersAt(s, spot.place, true).length > 0 || id === 'song_he' || id === 'hu_sanniang';
  return { ...out, fate: !kept && roll() < 0.5 ? 'hurt' : 'fine', beasts: !kept };
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
