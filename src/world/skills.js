// 技能 (0.19): every move there is and what of it is yours (技能收藏庫); what
// you carry into a fight (快捷欄): sets of slots you fill from what you know
// and switch between; 心法 (passive skills) held in mind; and how well you
// know each move (熟練度), which changes it as it grows.
//
// What you know is never stored: it follows from what you have learned (功法、
// 法術), the weapon in your hand, your 根骨, your realm and the 法器 you wear.
// Only your choices and your practice are kept: s.player.hotbar (the sets),
// s.player.passives (the 心法 held), s.player.skillXp (practice, move by move).

import { MOVES, KIT_ORDER, TRIAL_KIT } from '../content/moves.js';
import { PASSIVES, PASSIVE_SLOTS } from '../content/passives.js';
import { TECHS } from '../content/techniques.js';
import { ITEMS } from '../content/items.js';

/** Moves in a set (a fight shows one set at a time). */
export const SLOTS = 4;
/** Sets there are: two to begin with, the third once 築基. */
export const SETS = 3;
export const setsOpen = (s) => (s.player.realm >= 2 ? SETS : 2);

const REALM_WORD = ['', '需引氣入體', '需築基', '需結丹'];
const knows = (p, ids) => ids.some((a) => (p.arts || []).includes(a) || (p.techs || []).includes(a) || p.tech === a);
const pad = (ids) => Array.from({ length: SLOTS }, (_, i) => (ids[i] && MOVES[ids[i]] ? ids[i] : null));

// ── what is yours ──

/** Why a move is out of reach (null: it is yours). */
export function lockOf(s, m) {
  const p = s.player;
  const realm = m.realm ?? 1;
  if (p.realm < realm) return REALM_WORD[realm] || '境界不足';
  // what a 法器 does, you can do while you wear it
  if (m.relic) return p.gear?.relic === m.relic ? null : `需戴${ITEMS[m.relic]?.name || m.relic}`;
  // a move of the body comes to you at 築基, whatever else it asks
  if (m.school === '體修' && p.realm >= 2) return null;
  if (!m.learn && !m.weapon && !m.gengu) return null;
  if (m.learn && knows(p, m.learn)) return null;
  if (m.weapon && m.weapon.includes(p.weapon)) return null;
  if (m.gengu && (p.attrs.gengu ?? 0) >= m.gengu) return null;
  const ways = [];
  if (m.learn) ways.push(`習得${m.learn.map((a) => TECHS[a]?.name || a).join('或')}`);
  if (m.weapon) ways.push(`手持${m.weapon.map((w) => ITEMS[w]?.name || w).join('或')}`);
  if (m.gengu) ways.push(`根骨達${m.gengu}`);
  return `需${ways.join('，或')}`;
}

// ── 熟練度: practice in real fights (not the system's 試煉) ──

export const MASTERY = [
  { name: '初學', xp: 0 },
  { name: '小成', xp: 15 },
  { name: '精通', xp: 50 },
  { name: '大成', xp: 120 },
  { name: '圓滿', xp: 300 },
];

/** How well you know a move: lv 1 … 5, its name, practice so far and the next mark. */
export function masteryOf(s, id) {
  const xp = s.player.skillXp?.[id] || 0;
  let lv = 1;
  while (lv < MASTERY.length && xp >= MASTERY[lv].xp) lv++;
  return { lv, name: MASTERY[lv - 1].name, xp, next: MASTERY[lv]?.xp ?? null };
}

/** A cast in a real fight: practice. Returns the new mastery's name if it went up. */
export function practise(s, id, n = 1) {
  if (!MOVES[id]) return null;
  const before = masteryOf(s, id).lv;
  s.player.skillXp ||= {};
  s.player.skillXp[id] = (s.player.skillXp[id] || 0) + n;
  const after = masteryOf(s, id);
  return after.lv > before ? after.name : null;
}

// ── 心法 ──

/** Why a 心法 is out of reach (null: you can hold it). */
export function passiveLock(s, id) {
  const d = PASSIVES[id];
  if (!d) return '沒有這門心法';
  const p = s.player;
  const n = d.needs || {};
  const ways = [];
  if (n.realm && p.realm < n.realm) ways.push(REALM_WORD[n.realm] || '境界不足');
  if (n.learn && !knows(p, n.learn)) ways.push(`需習得${n.learn.map((a) => TECHS[a]?.name || a).join('或')}`);
  if (n.gengu && (p.attrs.gengu ?? 0) < n.gengu) ways.push(`需根骨達${n.gengu}`);
  return ways.length ? ways.join('；') : null;
}

/** How many 心法 you can hold now. */
export const passiveSlots = (s) => PASSIVE_SLOTS[Math.min(s.player.realm, PASSIVE_SLOTS.length - 1)] || 0;

/** The 心法 you hold (and can: one you no longer meet the needs of falls quiet). */
export function heldPassives(s) {
  return (s.player.passives || []).filter((id) => PASSIVES[id] && !passiveLock(s, id)).slice(0, passiveSlots(s));
}

/** Take up a 心法, or put it down. Returns false (and why) if it cannot be held. */
export function holdPassive(s, id, on = true) {
  const p = s.player;
  p.passives = (p.passives || []).filter((x) => PASSIVES[x] && x !== id);
  if (!on) return { ok: true };
  const why = passiveLock(s, id);
  if (why) return { ok: false, why };
  if (heldPassives(s).length >= passiveSlots(s)) return { ok: false, why: passiveSlots(s) ? '心法欄已滿' : '引氣入體之後才能修心法' };
  p.passives.push(id);
  return { ok: true };
}

const NONE = Object.freeze({ dmg: { all: 0, school: {}, el: {} }, mpCost: 0, cd: { all: 0, el: {}, id: {} }, heal: 0, def: 0, regenFight: 0, regen: 0, dashCd: 0, speed: 0, crit: 0, chain: 0 });

/** All the 心法 you hold, added up (see content/passives.js for what each means). */
export function passiveStats(s) {
  const held = heldPassives(s);
  if (!held.length) return NONE;
  const out = { dmg: { all: 0, school: {}, el: {} }, mpCost: 0, cd: { all: 0, el: {}, id: {} }, heal: 0, def: 0, regenFight: 0, regen: 0, dashCd: 0, speed: 0, crit: 0, chain: 0 };
  const addMap = (to, from) => { for (const [k, v] of Object.entries(from || {})) to[k] = (to[k] || 0) + v; };
  for (const id of held) {
    const st = PASSIVES[id].stats || {};
    for (const [k, v] of Object.entries(st)) {
      if (k === 'dmg') {
        out.dmg.all += v.all || 0;
        addMap(out.dmg.school, v.school);
        addMap(out.dmg.el, v.el);
      } else if (k === 'cd') {
        out.cd.all += v.all || 0;
        addMap(out.cd.el, v.el);
        addMap(out.cd.id, v.id);
      } else out[k] += v;
    }
  }
  return out;
}

// ── a move as you would use it ──

/**
 * A move as it stands for you: stronger if you know the art behind it, as
 * practice has made it, as the 心法 you hold change it; and why it is out of
 * reach, if it is. lend: a move lent you (the 試煉), as it comes, unpractised.
 */
export function moveOf(s, id, lend = false) {
  const p = s.player;
  const m = MOVES[id];
  const good = knows(p, m.arts || []);
  const k = { ...m, ...(good ? m.better : null), id, good, locked: lend ? null : lockOf(s, m) };
  // practice: a little stronger and quicker at each mark, and at some marks a change of its own
  const M = lend ? { lv: 1, name: MASTERY[0].name } : masteryOf(s, id);
  k.lv = M.lv;
  k.mastery = M.name;
  if (M.lv > 1) {
    if (k.mult) k.mult *= 1 + 0.05 * (M.lv - 1);
    k.cd *= 1 - 0.03 * (M.lv - 1);
    for (const [at, change] of m.mastery || []) if (M.lv >= at) Object.assign(k, change);
  }
  if (lend) return k;
  // what you hold in mind
  const P = passiveStats(s);
  if (P === NONE) return k;
  k.mp = Math.max(0, Math.round(k.mp * (1 + P.mpCost)));
  k.cd = Math.max(k.cd * 0.5, k.cd * (1 + P.cd.all + (P.cd.el[k.el] || 0) + (P.cd.id[id] || 0)));
  if (k.mult) k.mult *= 1 + P.dmg.all + (P.dmg.school[k.school] || 0) + (P.dmg.el[k.el] || 0);
  if (k.heal) k.heal *= 1 + P.heal;
  return k;
}

/** Every move there is, as it stands for you. */
export function movesOf(s) {
  return Object.keys(MOVES).map((id) => moveOf(s, id));
}

// ── 快捷欄: the sets ──

/** The sets as kept (made the first time they are asked for: a save from before 0.19 brings its three in). */
export function hotbarState(s) {
  const p = s.player;
  let hb = p.hotbar;
  if (!hb || !Array.isArray(hb.sets)) {
    // the three you chose before there were sets: the first set, the empty fourth filled the usual way
    const chosen = (p.kit || []).filter((id) => MOVES[id]);
    hb = p.hotbar = { cur: 0, sets: [] };
    if (chosen.length) {
      const ids = pad(chosen);
      const more = KIT_ORDER.find((id) => !ids.includes(id) && !lockOf(s, MOVES[id]));
      const gap = ids.indexOf(null);
      if (more && gap >= 0) ids[gap] = more;
      hb.sets.push({ ids, auto: false });
    }
    delete p.kit;
  }
  // (put in shape once — a new save, a loaded one — not every time it is asked for)
  if (!hb.ok) {
    while (hb.sets.length < SETS) hb.sets.push({ ids: pad([]), auto: true });
    hb.sets = hb.sets.slice(0, SETS).map((set) => ({ ids: pad(set?.ids || []), auto: !!set?.auto }));
    Object.defineProperty(hb, 'ok', { value: true, enumerable: false, configurable: true });
  }
  if (hb.cur >= setsOpen(s) || !(hb.cur >= 0)) hb.cur = 0;
  return hb;
}

/** What a set left to choose itself shows: the moves you can use that the sets before it do not, in the usual order. */
function autoIds(s, set) {
  const hb = s.player.hotbar;
  const taken = new Set();
  for (let i = 0; i < set; i++) for (const id of idsOf(s, i)) if (id) taken.add(id);
  const ids = [];
  for (const id of KIT_ORDER) {
    if (ids.length >= SLOTS) break;
    if (!taken.has(id) && MOVES[id] && !lockOf(s, MOVES[id])) ids.push(id);
  }
  // (the first set, with nothing yet to fill it, shows what is coming)
  if (set === 0) for (const id of TRIAL_KIT) if (ids.length < SLOTS && !ids.includes(id) && ids.filter(Boolean).length < 3) ids.push(id);
  return pad(ids);
}

/** The ids in a set (chosen, or as a self-choosing set shows them now). */
export function idsOf(s, set) {
  const hb = hotbarState(s);
  const S = hb.sets[set];
  if (!S) return pad([]);
  return S.auto ? autoIds(s, set) : S.ids;
}

/** A set as it stands: SLOTS places, each a move (as moveOf; it may be out of reach) or null. 試煉: the system lends its own three. */
export function hotbarOf(s, set = hotbarState(s).cur, trial = false) {
  if (trial) return pad(TRIAL_KIT).map((id) => (id ? moveOf(s, id, true) : null));
  return idsOf(s, set).map((id) => (id ? moveOf(s, id) : null));
}

/** Put a move in a place of a set (null: empty it). A move already in the set trades places with what was there. */
export function assignSlot(s, set, slot, id) {
  const hb = hotbarState(s);
  if (set < 0 || set >= setsOpen(s) || slot < 0 || slot >= SLOTS) return false;
  if (id && !MOVES[id]) return false;
  const S = hb.sets[set];
  if (S.auto) {
    // from what it showed: the sets after it keep showing what they did
    S.ids = autoIds(s, set);
    S.auto = false;
  }
  if (id) {
    const was = S.ids.indexOf(id);
    if (was >= 0) S.ids[was] = S.ids[slot];
  }
  S.ids[slot] = id || null;
  return true;
}

/** Let a set choose itself again. */
export function autoSet(s, set) {
  const hb = hotbarState(s);
  if (!hb.sets[set]) return false;
  hb.sets[set] = { ids: pad([]), auto: true };
  return true;
}

/** Bring another set to hand. */
export function useSet(s, set) {
  const hb = hotbarState(s);
  if (set < 0 || set >= setsOpen(s)) return false;
  hb.cur = set;
  return true;
}

/** Where a move sits in your sets: [[set, slot], …]. */
export function placesOf(s, id) {
  const out = [];
  for (let set = 0; set < setsOpen(s); set++) idsOf(s, set).forEach((x, slot) => x === id && out.push([set, slot]));
  return out;
}

// ── 技能收藏庫 ──

/** What sort of move it is, to sort them by in the library. */
export function kindOf(m) {
  if (m.aim === 'self') return m.heal ? '療傷' : m.swords ? '劍陣' : '護身';
  if (m.aim === 'dash') return '身法';
  if (m.chill || m.hold || m.stun >= 1) return '控制';
  if (m.aim === 'ground' || m.aim === 'around') return '範圍';
  return '攻擊';
}

/** How it goes off, in a word. */
export const AIM_WORD = { line: '直線', ground: '落點', self: '自身', dash: '突進', around: '周身', seek: '追蹤', melee: '近身', bolt: '天雷' };

/**
 * The library: every move and every 心法, as each stands for you. q: words to
 * look for (name, school, element, what it does); school / kind / state
 * ('known' | 'locked') to narrow it; sort: 'order' | 'mp' | 'cd' | 'name'.
 */
export function libraryOf(s, { q = '', school = null, kind = null, state = null, sort = 'order' } = {}) {
  const moves = Object.keys(MOVES).map((id) => {
    const k = moveOf(s, id);
    return { type: 'move', ...k, kind: kindOf(k), known: !k.locked, places: placesOf(s, id), xp: masteryOf(s, id) };
  });
  const held = heldPassives(s);
  const passives = Object.entries(PASSIVES).map(([id, d]) => ({ type: 'passive', id, ...d, kind: '心法', locked: passiveLock(s, id), known: !passiveLock(s, id), held: held.includes(id) }));
  const words = q.trim().toLowerCase();
  const match = (x) => {
    if (school && x.school !== school) return false;
    if (kind && x.kind !== kind) return false;
    if (state === 'known' && !x.known) return false;
    if (state === 'locked' && x.known) return false;
    if (!words) return true;
    return [x.name, x.school, x.el, x.kind, x.desc, AIM_WORD[x.aim]].filter(Boolean).join(' ').toLowerCase().includes(words);
  };
  const order = (list) => {
    if (sort === 'mp') return list.sort((a, b) => (a.mp ?? 0) - (b.mp ?? 0));
    if (sort === 'cd') return list.sort((a, b) => (a.cd ?? 0) - (b.cd ?? 0));
    if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
    // usual: what you can use first, in the order they come to hand
    return list.sort((a, b) => Number(b.known) - Number(a.known));
  };
  return { moves: order(moves.filter(match)), passives: order(passives.filter(match)) };
}
