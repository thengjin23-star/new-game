// 身: your blood (氣血) and 靈力, and what you wear into the world (裝備).
//
// Both pools are yours, kept in the save (s.player.hp, mp), and the same in
// the world and in a fight: what a fight took, you carry away from it, and
// win back slowly as you walk, quickly as you rest. How deep they are comes
// from your 戰力 (blood), your realm (靈力) and what you have on.

import { ITEMS } from '../content/items.js';
import { fightPower } from './cultivation.js';
import { refineMult } from './refine.js';
import { nodeQi } from '../world/map.js';
import { passiveStats } from '../world/skills.js';

/** The places you wear things, and what each is called. */
export const SLOTS = { weapon: '兵器', robe: '衣袍', charm: '佩飾', relic: '法器' };

/** How much of your blood a wound leaves you (無傷 … 瀕死). */
export const HP_CAP = [1, 0.75, 0.5, 0.3];

/** What gear can give, and how it reads. */
export const STAT_WORD = {
  hp: (v) => `氣血 +${Math.round(v * 100)}%`,
  mp: (v) => `靈力 +${Math.round(v)}`,
  def: (v) => `減傷 ${Math.round(v * 100)}%`,
  regen: (v) => `氣血回復 +${Math.round(v * 100)}%`,
  mpRegen: (v) => `靈力回復 +${Math.round(v * 100)}%`,
  crit: (v) => `暴擊 +${Math.round(v * 100)}%`,
  speed: (v) => `腳程 ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`,
  sense: (v) => `神識 +${Math.round(v * 100)}%`,
  fire: (v) => `抗火 ${Math.round(v * 100)}%`,
  venom: (v) => `抗毒 ${Math.round(v * 100)}%`,
  // (西漠) the sun cannot burn you; the sandstorm's wind turns aside
  cool: () => '不畏烈日',
  wind: () => '定風',
  // (北原) the cold does not get in
  warm: () => '禦寒',
};

/** What you have on, place by place (the weapon in your hand counts). */
export function gearOf(s) {
  const p = s.player;
  const g = p.gear || {};
  return { weapon: p.weapon || null, robe: g.robe || null, charm: g.charm || null, relic: g.relic || null };
}

/**
 * All your gear gives you, added up: hp (a share more blood), mp (more
 * 靈力), def (a share of every blow kept off), regen / mpRegen (blood and
 * 靈力 back that much faster), crit, speed (on foot), sense (神識 reaches
 * further), fire (a share of fire kept off), venom (of venom: what lingers in you, and pools of it),
 * cool (西漠's noon sun cannot burn you), wind (a sandstorm's wind turns aside from you).
 */
export function gearStats(s) {
  const out = { hp: 0, mp: 0, def: 0, regen: 0, mpRegen: 0, crit: 0, speed: 0, sense: 0, fire: 0, venom: 0, cool: 0, wind: 0, warm: 0 };
  for (const id of Object.values(gearOf(s))) {
    const st = id && ITEMS[id]?.stats;
    if (!st) continue;
    // (refined at the 百煉坊: its gifts that much more)
    const m = refineMult(s, id);
    for (const [k, v] of Object.entries(st)) out[k] = (out[k] || 0) + v * m;
  }
  out.def = Math.min(0.5, out.def);
  out.fire = Math.min(0.8, out.fire);
  out.venom = Math.min(0.8, out.venom);
  return out;
}

/** 靈力 of your own: none for a mortal, then by realm and layer. */
function ownMp(p) {
  return p.realm === 0 ? 0 : p.realm === 1 ? 18 + 4 * p.stage : p.realm === 2 ? 90 + 15 * p.stage : 260;
}

/**
 * How deep your pools are: blood (and what a wound leaves of it), 靈力; your
 * 戰力 and gear with them. baseHp: your blood without what your gear adds
 * (what those you fight size their blows by, so gear is a help, not a wash).
 */
export function vitals(s) {
  const p = s.player;
  const G = gearStats(s);
  // what the 心法 you hold add (world/skills.js): not gear, but counted with it here
  const S = passiveStats(s);
  if (S.def || S.regen || S.crit) {
    G.def = Math.min(0.6, G.def + S.def);
    G.regen += S.regen;
    G.crit += S.crit;
  }
  const P = Math.max(3, fightPower(s));
  const baseHp = Math.round(20 + 2.6 * P);
  const maxHp = Math.round(baseHp * (1 + G.hp));
  const own = ownMp(p);
  const maxMp = own > 0 ? own + G.mp : 0;
  const cap = Math.max(1, Math.round(maxHp * HP_CAP[p.injury || 0]));
  return { P, baseHp, maxHp, cap, maxMp, G };
}

/** Your blood and 靈力 now (a life just begun, or a save from before they were kept, starts full). */
export function pools(s) {
  const p = s.player;
  const V = vitals(s);
  if (!(p.hp >= 0)) p.hp = V.cap;
  if (!(p.mp >= 0)) p.mp = V.maxMp;
  return { hp: Math.min(p.hp, V.cap), mp: Math.min(p.mp, V.maxMp), ...V };
}

/** Blood (a share of what a wound leaves you) and 靈力 (a share of all you hold) back. Returns how much of each. */
export function restore(s, hp = 0, mp = 0) {
  const p = s.player;
  const V = pools(s);
  const before = [p.hp, p.mp];
  if (hp) p.hp = Math.max(p.hp, Math.min(V.cap, p.hp + V.cap * hp));
  if (mp) p.mp = Math.max(p.mp, Math.min(V.maxMp, p.mp + V.maxMp * mp));
  return [Math.round(p.hp - before[0]), Math.round(p.mp - before[1])];
}

/** Hours of rest: blood and 靈力 come back (靈力 the quicker where 靈氣 gathers). */
export function rested(s, hours) {
  const qi = nodeQi(s, s.player.loc);
  return restore(s, Math.min(1, 0.2 * hours), Math.min(1, 0.35 * hours * qi));
}

/** Spend 靈力, if you have it. */
export function spendMp(s, n) {
  const p = s.player;
  pools(s);
  if (p.mp < n) return false;
  p.mp -= n;
  return true;
}

/** Can this be worn, and where? */
export function slotOf(id) {
  const it = ITEMS[id];
  if (!it) return null;
  if (it.kind === 'weapon') return 'weapon';
  return it.kind === 'gear' ? it.slot || null : null;
}

/** Put it on (taking off whatever was there), or take it off if it is on. */
export function wear(s, id) {
  const p = s.player;
  const slot = slotOf(id);
  if (!slot || !(p.items[id] > 0)) return false;
  if (slot === 'weapon') {
    p.weapon = p.weapon === id ? null : id;
    return true;
  }
  p.gear ||= {};
  p.gear[slot] = p.gear[slot] === id ? null : id;
  return true;
}

/** Something gone from your bag: if it was on you, it is off. */
export function unwearGone(s) {
  const p = s.player;
  if (p.weapon && !(p.items[p.weapon] > 0)) p.weapon = null;
  for (const k of Object.keys(p.gear || {})) if (p.gear[k] && !(p.items[p.gear[k]] > 0)) p.gear[k] = null;
}
