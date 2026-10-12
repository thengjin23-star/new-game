// 術: what you can do with 靈力 out in the world (not in a fight), and what a
// 符 does when you burn it. (Moves for a fight are content/moves.js.)

/**
 * Spells you cast as you go (the 術 button, or F). mp: 靈力 it costs; cd:
 * seconds before it can be cast again; realm: the least realm it asks;
 * learn: an art or 功法 that teaches it (any of these); last: how long it
 * holds (seconds, 息).
 */
export const SPELLS = {
  sense: {
    name: '神識', mp: 8, cd: 12, realm: 1,
    desc: '神識往四周一掃：藏著的地方、草叢裡伏著的東西都瞞不過你，雲霧也散開一片。境界越高、戴著照妖鏡，掃得越遠。',
  },
  mend: {
    name: '回春術', mp: 12, cd: 14, realm: 1, learn: ['qingmu', 'songhe'], last: 3,
    desc: '三息之內回三成氣血，也化去身上的毒。',
  },
  conceal: {
    name: '斂息術', mp: 15, cd: 45, realm: 1, learn: ['lianxi'], last: 90,
    desc: '收斂氣息九十息：野獸要走到跟前才發覺你。一出手就破了。',
  },
};

/**
 * What a 符 does when you burn it. field: out in the world — swift (faster
 * on foot), hide (as 斂息術), exorcise (the dead keep away), return (back to
 * the nearest town you know); last: how long (seconds). fight: in a fight —
 * a move, as content/moves.js has them, that costs no 靈力 (the 符 is gone
 * instead). only: it touches only the things of spirit.
 */
export const TALISMANS = {
  fire_talisman: {
    fight: { name: '火符', aim: 'ground', cast: 0.08, range: 300, radius: 80, speed: 520, mult: 2.6, burn: 3, fx: 'fire' },
  },
  gold_talisman: {
    fight: { name: '金光符', aim: 'self', cast: 0.05, shield: 0.4, last: 8, fx: 'shield' },
  },
  exorcise_talisman: {
    field: 'exorcise', last: 180,
    fight: { name: '驅邪符', aim: 'around', cast: 0.05, radius: 150, mult: 1.2, stun: 2, push: 60, holy: true, only: 'spirit', fx: 'bell' },
  },
  swift_talisman: { field: 'swift', last: 120 },
  hide_talisman: { field: 'hide', last: 90 },
  return_talisman: { field: 'return' },
};

/** The towns a 歸元符 can take you back to (the nearest you have been to). */
export const RETURN_TO = ['qingshi_town', 'luoxia_market', 'qingxu_temple'];
