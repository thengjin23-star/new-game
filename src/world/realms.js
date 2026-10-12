// 秘境: worlds folded away inside this one, that open for a while and close
// again. 古戰場秘境 opened once in the story (the second spring); after that
// it opens every third year, in the first month. 鏡湖水府 opens each year
// at 中秋, when the full moon lies on the lake. Inside you go down room by
// room (content/events/realms.js); each opening, you get one way through.

import { dateOf, dayAt, DAYS_PER_YEAR } from '../core/calendar.js';

/**
 * The realms. poi: where its door is; when(day): the opening it is in
 * (an index), or null when shut; foes: who you meet (by kind of room); the
 * guardian at the bottom. depth: rooms before the guardian.
 */
export const SECRET_REALMS = {
  ruins: {
    name: '古戰場秘境',
    event: 'realm_ruins',
    poi: 'realm_gate',
    region: 'ancient_ruins',
    depth: 3,
    when(day) {
      // three years after the story's opening (the third spring), and every third year after: the first month
      const y = Math.floor(day / DAYS_PER_YEAR);
      if (y < 5 || (y - 5) % 3 !== 0) return null;
      return dateOf(day).month === 1 ? y : null;
    },
    next(day) {
      let y = Math.max(5, Math.floor(day / DAYS_PER_YEAR));
      while ((y - 5) % 3 !== 0 || dayAt(y, 2, 1) <= day) y++;
      return dayAt(y, 1, 1);
    },
    foes: {
      fight: [['ghost', 2, { name: '殘魂' }]],
      rival: [['cultivator', 2, { name: '散修' }]],
      boss: [['skeleton', 1, { name: '骷髏將軍' }], ['ghost', 1, { name: '殘魂' }]],
    },
  },
  lake: {
    name: '鏡湖水府',
    event: 'realm_lake',
    poi: 'lake_pavilion',
    region: 'mirror_lake',
    depth: 3,
    when(day) {
      const { month, day: d } = dateOf(day);
      return month === 8 && d >= 14 && d <= 16 ? Math.floor(day / DAYS_PER_YEAR) : null;
    },
    next(day) {
      let y = Math.floor(day / DAYS_PER_YEAR);
      if (dayAt(y, 8, 17) <= day) y++;
      return dayAt(y, 8, 14);
    },
    foes: {
      fight: [['snake', 2, { name: '水府青蛇' }]],
      rival: [['cultivator', 2, { name: '摸金散修' }]],
      boss: [['python', 1, { name: '湖底老蛟' }]],
    },
  },
};

/** Is a realm open today? (The opening's index, or null.) */
export function realmOpen(s, id, day = s.day) {
  return SECRET_REALMS[id].when(day);
}

/** Have you already been through it this opening? */
export function realmDone(s, id) {
  const k = realmOpen(s, id);
  return k !== null && s.vars.realmDone?.[id] === k;
}

/** The run you are on now: { realm, depth, rooms, haul } (in the save, so a reload keeps your place). */
export function runOf(s) {
  return s.vars.realmRun || null;
}

/** Step through the door. */
export function beginRun(s, id) {
  s.vars.realmRun = { realm: id, depth: 0, rooms: [], haul: 0 };
}

/** Out again (one way through each opening). */
export function endRun(s) {
  const R = runOf(s);
  if (!R) return;
  s.vars.realmDone ||= {};
  const k = realmOpen(s, R.realm);
  if (k !== null) s.vars.realmDone[R.realm] = k;
  s.vars.realmRun = null;
}

function h1(seed, n) {
  let h = Math.imul(n | 0, 374761393) ^ Math.imul(seed | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const ROOMS = ['fight', 'fight', 'trap', 'chest', 'rival', 'spring'];

/** Down to the next room: which kind it is (the guardian, once deep enough). */
export function nextRoom(s) {
  const R = runOf(s);
  if (!R) return 'out';
  R.depth += 1;
  const def = SECRET_REALMS[R.realm];
  if (R.depth > def.depth) return 'boss';
  // no two alike in a row; the dice are this opening's, so a reload does not change the way
  let kind = null;
  for (let k = 0; k < 8 && (!kind || kind === R.rooms.at(-1)); k++) {
    kind = ROOMS[Math.floor(h1((s.seed | 0) + R.realm.length * 131 + (realmOpen(s, R.realm) ?? 0) * 17, R.depth * 7 + k) * ROOMS.length)];
  }
  R.rooms.push(kind);
  return kind;
}

/** How hard a fight is down here: against how strong you are, harder the deeper. */
export function realmDiff(s, power, boss = false) {
  const d = runOf(s)?.depth || 1;
  return Math.max(12, Math.round(power * (boss ? 1.15 : 0.65 + 0.12 * d)));
}

/**
 * What you find (by how deep you are, and in which realm): effects. Each
 * table: [weight, effects]. The guardian's hoard is richest.
 */
const HAUL = {
  ruins: [
    [[5, [['ls', [20, 40]]]], [3, [['item', 'heal_pill', 1]]], [3, [['item', 'ningqi_grass', 3]]], [2, [['item', 'fire_talisman', 2]]]],
    [[4, [['ls', [40, 80]]]], [3, [['item', 'juqi_pill', 2]]], [3, [['item', 'beast_core', 1]]], [2, [['item', 'gold_talisman', 2]]]],
    [[4, [['ls', [70, 120]]]], [3, [['item', 'juqi_pill', 3]]], [2, [['item', 'zhaoyao_mirror', 1]]], [2, [['item', 'beast_core', 2]]]],
  ],
  lake: [
    [[5, [['ls', [20, 40]]]], [3, [['item', 'golden_carp', 1]]], [3, [['item', 'ningqi_grass', 3]]], [2, [['item', 'wind_talisman', 2]]]],
    [[4, [['ls', [40, 80]]]], [3, [['item', 'lake_pearl', 1]]], [3, [['item', 'juqi_pill', 2]]], [2, [['item', 'golden_carp', 2]]]],
    [[4, [['ls', [70, 120]]]], [3, [['item', 'lake_pearl', 2]]], [2, [['item', 'jade_pendant', 1]]], [2, [['item', 'juqi_pill', 3]]]],
  ],
};

const HOARD = {
  ruins: [['ls', [150, 260]], ['item', 'juqi_pill', 3], ['maybe', 0.3, [['item', 'zhuji_pill', 1]]], ['maybe', 0.5, [['item', 'zhaoyao_mirror', 1]]]],
  lake: [['ls', [150, 260]], ['item', 'lake_pearl', 3], ['maybe', 0.3, [['item', 'zhuji_pill', 1]]], ['maybe', 0.5, [['item', 'jade_pendant', 1]]]],
};

/** What this room gives up: a pick from the table for this depth. */
export function haul(s) {
  const R = runOf(s);
  if (!R) return [];
  const table = HAUL[R.realm][Math.min(2, Math.max(0, R.depth - 1))];
  R.haul += 1;
  return [['pick', table]];
}

/** The guardian's hoard. */
export function hoard(s) {
  const R = runOf(s);
  return R ? HOARD[R.realm] : [];
}
