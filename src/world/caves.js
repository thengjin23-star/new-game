// 租來的洞府 (1.0 中州): in a great city nobody gives you a cave. 臨江城's 洞府行
// rents one by the month — quiet, a 聚靈陣 laid, and dear; the 鬼市's lean-to
// rents a hole in the wall behind it for a fraction of that. While the rent is
// paid the place is fit to sit in, and its 靈氣 is the cave's (world/map.js
// nodeQi); when the rent runs out — even in the middle of a long seclusion — it
// is the street again.

import { DAYS_PER_MONTH } from '../core/calendar.js';

/** What can be rented, by the place it is in: its name, its 靈氣, the rent for a month (靈石). */
export const RENT = {
  linjiang: { name: '城中洞府', qi: 1.9, month: 60 },
  guishi: { name: '鬼市後頭的洞府', qi: 1.45, month: 12 },
  // (1.2) 天衍城: up against the foot of 玉指峰, where the 靈氣 the finger seeps comes up through the ground
  waicheng: { name: '京中洞府', qi: 2.0, month: 90 },
};

/** The terms on offer: [months, the share of the monthly rent each month costs]. */
export const TERMS = [
  [1, 1],
  [6, 0.95],
  [12, 0.85],
];

/** Is the cave at this place yours just now? */
export function rented(s, id) {
  return (s.vars?.caves?.[id] ?? -1) > s.day;
}

/** The day the rent there runs out (or null). */
export function rentUntil(s, id) {
  const d = s.vars?.caves?.[id];
  return d != null && d > s.day ? d : null;
}

/** What so many months there cost. */
export function rentCost(id, months) {
  const share = TERMS.find(([m]) => m === months)?.[1] ?? 1;
  return Math.round(RENT[id].month * months * share);
}

/** So many months more (from today, or from when the rent already paid runs out). */
export function extendRent(s, id, months) {
  s.vars.caves ||= {};
  s.vars.caves[id] = Math.max(s.day, s.vars.caves[id] ?? 0) + months * DAYS_PER_MONTH;
}

/** Pay for so many months more. Returns whether you could. */
export function payRent(s, id, months) {
  const cost = rentCost(id, months);
  if (!RENT[id] || s.player.ls < cost) return false;
  s.player.ls -= cost;
  extendRent(s, id, months);
  return true;
}
