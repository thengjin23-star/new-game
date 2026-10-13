// 五行 (0.16): 金, 木, 水, 火, 土 — what each move is made of, and what
// each beast is. One overcomes another (相剋): a move of the element that
// overcomes a foe's bites deeper, one the foe's element overcomes bites
// shallower. One gives rise to the next (相生): a move that follows from the
// last one you used comes on stronger, and a run of them stronger still —
// the 連招 of a cultivator. And a move of your own 靈根 comes easiest.

export const WUXING = ['金', '木', '水', '火', '土'];

/** 相生: 木生火，火生土，土生金，金生水，水生木. */
export const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

/** 相剋: 金剋木，木剋土，土剋水，水剋火，火剋金. */
export const KE = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };

/** A move on a foe its element overcomes (over), or that overcomes it (under). */
export const KE_MULT = { over: 1.5, under: 0.7 };

/**
 * 相生連招: within secs of the last move, one that follows from it; the
 * second of a run this much stronger, the third (and on) this much.
 */
export const CHAIN = { secs: 4, mult: [1, 1, 1.3, 1.6] };

/**
 * A move of an element your 靈根 holds, by the 靈根: the purer it is (the
 * fewer elements), the more a move of its own comes to hand.
 */
export const ROOT_MULT = { single: 1.25, dual: 1.2, three: 1.12, four: 1.08, five: 1.05 };

/** How a move of element `att` fares on a foe of element `def`: 'over', 'under' or null. */
export function keOf(att, def) {
  if (!att || !def) return null;
  if (KE[att] === def) return 'over';
  if (KE[def] === att) return 'under';
  return null;
}

/** 木生火 and the like, in words. */
export function shengWord(from, to) {
  return `${from}生${to}`;
}

/** 金剋木 and the like, in words. */
export function keWord(att, def) {
  return keOf(att, def) === 'over' ? `${att}剋${def}` : `${def}剋${att}`;
}
