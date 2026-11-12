// 本命法寶 (1.1): from 金丹 on, one piece of what you carry — a weapon, a robe, a
// charm, a 法器 — made yours to the root. Fed with materials it grows with you:
// its gifts a tenth more for each 重 (five 重 in all; as 精煉 is, core/refine.js),
// and at the third 重 it learns to strike on its own (本命一擊, content/moves.js).
// Things of 第一章 serve as well as any: the 斷天劍, a 玄甲衣, a 寒玉佩. Another
// piece made 本命 starts again from the first 重.

import { ITEMS } from '../content/items.js';

/** The most 重 a 本命 grows to; what it takes to reach each (by 重); the 重 that brings its move. */
export const BM_MAX = 5;
export const BM_NEED = [0, 0, 240, 600, 1200, 2400];
export const BM_MOVE_AT = 3;
export const BM_EACH = 0.1;

const BINDABLE = (it) => it?.kind === 'weapon' || (it?.kind === 'gear' && !!it.slot);

/** Your 本命 ({ id, lv, xp }), or null. */
export function benming(s) {
  return s.player.bm || null;
}

/** Why this piece cannot be made your 本命 (null: it can). */
export function bindLock(s, id) {
  const p = s.player;
  if (p.realm < 3) return '金丹以後，才養得了本命法寶。';
  if (!BINDABLE(ITEMS[id])) return '只有兵器與穿戴的東西，才能當本命。';
  if (!(p.items[id] > 0)) return '你身上沒有這件東西。';
  if (p.bm?.id === id) return '它已經是你的本命了。';
  return null;
}

/** Make it your 本命 (another, if you had one, is let go: it starts again from the first 重). Returns whether it was. */
export function bindBenming(s, id) {
  if (bindLock(s, id)) return false;
  s.player.bm = { id, lv: 1, xp: 0 };
  return true;
}

/** What one of these is worth to a 本命 (only materials feed it). */
export function feedValue(id) {
  const it = ITEMS[id];
  return it?.kind === 'material' ? Math.max(5, it.sell || 0) : 0;
}

/** Feed it one of these. Returns { lv, up } (up: the 重 it rose to, if it rose), or null if it would not take it. */
export function feedBenming(s, id) {
  const p = s.player;
  const bm = p.bm;
  const v = feedValue(id);
  if (!bm || !v || !(p.items[id] > 0) || bm.lv >= BM_MAX) return null;
  p.items[id] -= 1;
  if (p.items[id] <= 0) delete p.items[id];
  bm.xp += v;
  let up = null;
  while (bm.lv < BM_MAX && bm.xp >= BM_NEED[bm.lv + 1]) {
    bm.lv += 1;
    up = bm.lv;
  }
  if (bm.lv >= BM_MOVE_AT) p.arts = [...new Set([...(p.arts || []), 'benming'])];
  return { lv: bm.lv, up };
}

/** What its gifts are multiplied by, for being your 本命. */
export function bmMult(s, id) {
  const bm = s.player?.bm;
  return bm && bm.id === id ? 1 + BM_EACH * bm.lv : 1;
}

/** How far to the next 重: [have, need] (null at the top). */
export function bmNext(s) {
  const bm = s.player.bm;
  if (!bm || bm.lv >= BM_MAX) return null;
  return [bm.xp, BM_NEED[bm.lv + 1]];
}
