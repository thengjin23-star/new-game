// 戰鬥: a fight you can see. Everyone on the field acts in turn — the
// quicker, the more often — on a line running between you and them: up
// close, or apart. You strike, use what you have learned, take a pill,
// guard, step back or run; they do what their kind does.
//
// The fight lives in the save (s.battle), so it survives a reload. Each
// call returns what happened as a list of beats for the picture to play.

import { FOES, GROUP_SHARE } from '../content/foes.js';
import { ITEMS } from '../content/items.js';
import { basePower, weaponPower, artPower } from './cultivation.js';
import { rand } from './rng.js';

const NEAR = 58; // within this, blows can land
const CLOSE = 42; // where you stand to strike
const FAR = 104; // where a fight usually starts
const BACK = 60; // a step back
const EDGE = [-125, 150];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** How much stronger those against you are made for each who fights at your side. */
let ALLY_LIFT = 1.04;
/** For tuning by simulation. */
export function setAllyLift(v) {
  ALLY_LIFT = v;
}

// ── what you can do ──

/**
 * 招式 and 法術: from your combat arts, from the method you cultivate, and
 * what any cultivator can do with 靈力.
 * mp: 靈力 it costs; cd: turns before it can be used again;
 * ranged: reaches across the field; kind: 'phys' (blades) | 'spirit' (fire, qi, talismans)
 */
export const SKILLS = {
  trip: { name: '掃腿', from: ['wild_boxing'], mp: 0, cd: 3, mult: 0.6, stun: 0.45, fx: 'kick', desc: '鄉下打架的絆子。打得不重，卻常常把人絆倒。' },
  qi: { name: '靈力外放', realm: 1, mp: 4, mult: 1.1, ranged: true, kind: 'spirit', fx: 'qi', desc: '把靈力打出去。煉氣士人人都會。' },
  swordqi: { name: '青元劍氣', from: ['qingyuan_sword'], mp: 8, mult: 1.7, ranged: true, fx: 'swordqi', desc: '一道青光，三丈之內。' },
  foxfire: { name: '狐火', from: ['fox_fire'], mp: 7, mult: 1.4, ranged: true, kind: 'spirit', burn: 1, fx: 'foxfire', desc: '幽藍的狐火，專灼魂魄。' },
  fireball: { name: '火球術', tech: 'lieyan', realm: 1, mp: 8, mult: 1.5, ranged: true, kind: 'spirit', burn: 0.4, fx: 'fire', desc: '烈焰訣的入門法術。' },
  fingersword: { name: '青雲劍指', tech: 'qingyun', realm: 1, mp: 6, mult: 1.35, ranged: true, fx: 'swordqi', desc: '以指代劍，青雲宗弟子的基本功。' },
  shield: { name: '玄水盾', tech: 'xuanshui', realm: 1, mp: 8, self: true, shield: 0.25, fx: 'shield', desc: '一層水幕護住周身。' },
  mend: { name: '回春術', tech: 'qingmu', realm: 1, mp: 8, self: true, heal: 0.28, fx: 'heal', desc: '青木生機，止血生肌。' },
  calm: { name: '靜心訣', tech: 'songhe', realm: 1, mp: 5, self: true, heal: 0.12, cure: true, fx: 'heal', desc: '松鶴道人的法門：心靜了，毒也散了。' },
};

/** What can be used in a fight, and what it does. */
export const FIGHT_ITEMS = {
  heal_pill: { heal: 0.45, fx: 'heal' },
  blood_ginseng: { heal: 0.35, fx: 'heal' },
  zhixue_grass: { heal: 0.15, fx: 'heal' },
  detox_pill: { heal: 0.1, cure: true, fx: 'heal' },
  foxfire_talisman: { all: true, mult: 2.2, kind: 'spirit', pierce: true, burn: 1, fx: 'talisman' },
};

const WEAPON_VERB = { chaidao: '一刀劈向', qinggang_sword: '一劍刺向', hunting_bow: '一箭射向' };

/** 戰力 before injuries (a wound shows as blood already lost, not as weakness). */
export function fightPower(s) {
  const p = s.player;
  const body = 0.8 + p.attrs.gengu * 0.04;
  return basePower(p) * body * (1 + weaponPower(s) + artPower(s));
}

export function playerSkills(s) {
  const p = s.player;
  const out = [];
  for (const [id, k] of Object.entries(SKILLS)) {
    if (k.realm && p.realm < k.realm) continue;
    if (k.from && !k.from.some((a) => (p.arts || []).includes(a))) continue;
    if (k.tech && p.tech !== k.tech) continue;
    out.push(id);
  }
  return out;
}

// ── who is on the field ──

function playerUnit(s) {
  const p = s.player;
  const P = fightPower(s);
  const maxHp = Math.round(20 + 2.6 * P);
  const maxMp = p.realm === 0 ? 0 : p.realm === 1 ? 18 + 4 * p.stage : p.realm === 2 ? 90 + 15 * p.stage : 260;
  const start = [1, 0.75, 0.5, 0.3][p.injury || 0];
  return {
    id: 'me', side: 'me', name: '你', draw: 'player', p: Math.round(P),
    hp: Math.max(1, Math.round(maxHp * start)), maxHp, mp: maxMp, maxMp,
    atk: 1.5 + 0.5 * P, def: 0,
    spd: 11 + p.realm * 2.5 + p.stage * 0.35 + (p.attrs.gengu ?? 5) * 0.3,
    crit: 0.05 + (p.attrs.jiyuan ?? 5) * 0.008,
    range: ITEMS[p.weapon]?.ranged ? 'ranged' : 'melee',
    t: 0, lane: 0, ct: 0, st: {}, cd: {}, alive: true,
  };
}

/** An even fight lasts about this many blows each way. */
const BLOWS = 3.6;
/** How sharply the gap in strength tells: blows needed go as (their power ÷ yours) to this. */
const GAP = 0.42;

/**
 * Someone against you (or beside you). Their strength is set against yours:
 * at even power you each need about BLOWS blows; the stronger side needs
 * fewer, the weaker more — so a fight between unequals is not a coin toss,
 * but not settled before it starts either.
 */
function foeUnit(id, side, kind, p, me, extra = {}) {
  const K = FOES[kind];
  // a kind is tough or fierce, not stronger: the shape changes, the strength does not
  const shape = Math.sqrt(K.hp * K.atk);
  const rel = Math.pow(p / me.p, GAP) * (extra.share ?? 1);
  const hp = Math.max(4, Math.round((me.atk * BLOWS * rel * K.hp) / shape));
  return {
    id, side, kind, name: extra.name || K.name, draw: extra.draw || K.draw, p: Math.round(p),
    hp, maxHp: hp, mp: K.mortal ? 0 : 40, maxMp: K.mortal ? 0 : 40,
    atk: ((me.maxHp / BLOWS) * rel * K.atk) / shape, def: 0, spd: K.spd, crit: 0.07,
    range: K.range, boss: !!K.boss,
    t: 0, lane: 0, ct: 0, st: {}, cd: {}, alive: true,
  };
}

/** Someone fighting at your side: a person of their own strength. */
function allyUnit(id, kind, p, extra = {}) {
  const K = FOES[kind];
  const hp = Math.round(20 + 2.6 * p);
  return {
    id, side: 'ally', kind, name: extra.name || K.name, draw: extra.draw || K.draw, p: Math.round(p),
    hp, maxHp: hp, mp: 0, maxMp: 0, atk: 1.5 + 0.5 * p, def: 0, spd: K.spd, crit: 0.06,
    range: K.range, t: 0, lane: 0, ct: 0, st: {}, cd: {}, alive: true,
  };
}

const LANES = { 1: [0], 2: [-0.55, 0.55], 3: [-1, 0, 1], 4: [-1.4, -0.5, 0.5, 1.4], 5: [-1.6, -0.8, 0, 0.8, 1.6] };

/**
 * Who a foe (or friend) is: 'npc' — the event's person; a named person's id
 * ('zhao_hu'); or { name, draw }.
 */
function whoOf(s, who, npc) {
  if (!who) return {};
  if (who === 'npc') return npc ? { name: npc.name, npcId: npc.id } : {};
  if (typeof who === 'string') {
    const n = s.npcs?.[who];
    return n ? { name: n.met ? n.name : n.title, npcId: who, draw: `npc:${who}` } : {};
  }
  return who;
}

/**
 * Lay out a fight. spec: { foes: [[kind, count, who?]], allies?, spar?, close? }
 * where `who` 'npc' names that foe after the event's person. diff: the 戰力
 * the story asked of you. first: 'me' if you struck first, 'foe' if they did.
 */
export function startBattle(s, spec, { diff = 20, npc = null, origin = null, first = null } = {}) {
  const groups = spec.foes.map(([kind, n = 1, who = null]) => ({ kind, n, who }));
  const n = groups.reduce((a, g) => a + g.n, 0);
  const allies = (spec.allies || []).map(([kind, k = 1, who = null]) => ({ kind, n: k, who }));
  const nAllies = allies.reduce((a, g) => a + g.n, 0);
  // with others at your side, those against you must be stronger for the same odds
  const D = diff * (1 + ALLY_LIFT * Math.sqrt(nAllies));
  const weights = [];
  for (const g of groups) for (let k = 0; k < g.n; k++) weights.push(g.kind.endsWith('_chief') ? 1.5 : 1);
  const mean = weights.reduce((a, w) => a + w, 0) / weights.length;
  const share = GROUP_SHARE[Math.min(n, GROUP_SHARE.length - 1)] || 0.3;
  const me = playerUnit(s);
  const units = [me];
  let i = 0;
  const lanes = LANES[Math.min(n, 5)] || LANES[5];
  for (const g of groups) {
    for (let k = 0; k < g.n; k++) {
      // a pack fights as one (and grows savage as it thins): each is worth more than one alone
      const pack = FOES[g.kind].pack;
      const worth = (FOES[g.kind].worth || 1) * (pack ? pack[Math.min(n, pack.length - 1)] : 1);
      const who = whoOf(s, g.who, npc);
      const u = foeUnit(`f${i}`, 'foe', g.kind, (D * (weights[i] / mean)) / worth, me, { ...who, share });
      if (who.npcId) u.npcId = who.npcId;
      u.t = spec.close ? CLOSE + 4 * k : FAR + 6 * (i % 2);
      u.lane = lanes[i % lanes.length];
      units.push(u);
      i++;
    }
  }
  let j = 0;
  for (const g of allies) {
    for (let k = 0; k < g.n; k++) {
      const who = whoOf(s, g.who, npc);
      const u = allyUnit(`a${j}`, g.kind, diff * 0.55, who);
      if (who.npcId) u.npcId = who.npcId;
      u.t = -6;
      u.lane = j % 2 ? -1.25 : 1.25;
      units.push(u);
      j++;
    }
  }
  for (const u of units) u.ct = rand(s) * 25 + (first === 'me' && u.side !== 'foe' ? 60 : 0) + (first === 'foe' && u.side === 'foe' ? 35 : 0);
  const b = { v: 1, units, turn: null, over: null, spar: !!spec.spar, origin, first, beats: 0, diff };
  s.battle = b;
  const beats = [];
  if (first === 'me') beats.push({ who: 'me', kind: 'status', text: '你搶先出手！' });
  runUntilPlayer(s, b, beats);
  return beats;
}

export function unitOf(b, id) {
  return b.units.find((u) => u.id === id) || null;
}

const foesOf = (b, side) => b.units.filter((u) => u.alive && (side === 'foe' ? u.side !== 'foe' : u.side === 'foe'));
const isNear = (a, d) => Math.abs(a.t - d.t) <= NEAR;

// ── turns ──

/** Who acts next: whoever's charge fills first. */
function nextActor(b) {
  let best = null;
  let bestT = Infinity;
  for (const u of b.units) {
    if (!u.alive) continue;
    const need = Math.max(0, 100 - u.ct) / u.spd;
    if (need < bestT - 1e-9 || (Math.abs(need - bestT) < 1e-9 && u.side === 'me')) {
      best = u;
      bestT = need;
    }
  }
  for (const u of b.units) if (u.alive) u.ct += u.spd * bestT;
  best.ct -= 100;
  return best;
}

/** The next few to act, for the turn strip (does not change the fight). */
export function upcoming(b, k = 6) {
  const cts = new Map(b.units.filter((u) => u.alive).map((u) => [u.id, u.ct]));
  const out = [];
  if (b.turn) out.push(b.turn);
  while (out.length < k && cts.size) {
    let best = null;
    let bestT = Infinity;
    for (const [id, ct] of cts) {
      const u = unitOf(b, id);
      const need = Math.max(0, 100 - ct) / u.spd;
      if (need < bestT - 1e-9 || (Math.abs(need - bestT) < 1e-9 && id === 'me')) {
        best = id;
        bestT = need;
      }
    }
    for (const [id, ct] of cts) cts.set(id, ct + unitOf(b, id).spd * bestT);
    cts.set(best, cts.get(best) - 100);
    out.push(best);
  }
  return out;
}

/** What happens to someone as their turn comes: wounds that keep bleeding, a stun that holds. True if the turn is lost. */
function startTurn(s, b, u, beats) {
  if (u.st.guard) delete u.st.guard;
  for (const k of Object.keys(u.cd)) if (--u.cd[k] <= 0) delete u.cd[k];
  for (const kind of ['poison', 'burn']) {
    if (!u.st[kind]) continue;
    const dmg = Math.max(1, Math.round(u.maxHp * (kind === 'burn' ? 0.06 : 0.05)));
    u.hp = Math.max(0, u.hp - dmg);
    if (--u.st[kind] <= 0) delete u.st[kind];
    const hit = { id: u.id, dmg, hpAfter: u.hp, dot: kind };
    beats.push({ who: u.id, kind: 'status', fx: kind, hits: [hit], text: `${u.name}${kind === 'burn' ? '身上的火還在燒' : '毒性發作'}。` });
    if (fall(b, u, hit, beats)) return true;
  }
  if (u.st.stun) {
    delete u.st.stun;
    beats.push({ who: u.id, kind: 'status', fx: 'stun', text: `${u.name}還沒緩過來。` });
    return true;
  }
  return false;
}

function runUntilPlayer(s, b, beats) {
  b.turn = null;
  for (let guard = 0; guard < 300 && !b.over; guard++) {
    const u = nextActor(b);
    if (startTurn(s, b, u, beats)) {
      checkOver(b, beats);
      continue;
    }
    if (b.over) return;
    if (u.side === 'me') {
      b.turn = 'me';
      return;
    }
    if (u.side === 'ally') allyAct(s, b, u, beats);
    else foeAct(s, b, u, beats);
    checkOver(b, beats);
  }
}

function checkOver(b, beats) {
  if (b.over) return;
  const me = unitOf(b, 'me');
  if (!me.alive) {
    b.over = 'lose';
    beats.push({ who: 'me', kind: 'end', over: 'lose', text: b.spar ? '你認輸了。' : '你倒下了。' });
  } else if (!b.units.some((u) => u.side === 'foe' && u.alive)) {
    b.over = 'win';
    beats.push({ who: 'me', kind: 'end', over: 'win', text: b.spar ? '對方收了手。' : '勝負已分。' });
  }
}

/** Someone is down (or, in a sparring match, has had enough). */
function fall(b, u, hit, beats) {
  const floor = b.spar ? u.maxHp * 0.25 : 0;
  if (u.hp > floor) return false;
  if (b.spar) u.hp = Math.max(1, u.hp);
  u.alive = false;
  hit.dead = true;
  // a pack that loses one of its own grows savage
  if (u.kind === 'wolf' || u.kind === 'demon_wolf') {
    const pack = b.units.filter((x) => x.alive && x.side === u.side && FOES[x.kind]?.skills.includes('howl') && !x.st.rage);
    if (pack.length) {
      for (const x of pack) x.st.rage = 0.2;
      beats.push({ who: pack[0].id, kind: 'status', fx: 'howl', text: '狼群一陣長嚎，眼睛都紅了。' });
    }
  }
  return true;
}

// ── blows ──

/** One blow from a to d. Returns the hit (for the picture). */
function strike(s, b, a, d, { mult = 1, kind = 'phys', pierce = false, sure = false } = {}) {
  if (!sure) {
    const dodge = clamp(0.08 + (d.spd - a.spd) * 0.012 + (d.st.blink ? 0.15 : 0), 0.03, 0.35) * (kind === 'spirit' ? 0.5 : 1);
    if (rand(s) < dodge) return { id: d.id, miss: true, hpAfter: d.hp };
  }
  let dmg = a.atk * mult * (0.75 + rand(s) * 0.5);
  const crit = rand(s) < (a.crit || 0.05);
  if (crit) dmg *= 1.7;
  if (a.st.rage) dmg *= 1 + a.st.rage;
  if (!pierce) dmg -= d.def;
  if (FOES[d.kind]?.spirit && kind === 'phys') dmg *= 0.5;
  if (d.st.guard) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg));
  let absorbed = 0;
  if (d.st.shield) {
    absorbed = Math.min(d.st.shield, dmg);
    d.st.shield -= absorbed;
    dmg -= absorbed;
    if (d.st.shield <= 0) delete d.st.shield;
  }
  d.hp = Math.max(0, d.hp - dmg);
  return { id: d.id, dmg, crit, absorbed, hpAfter: d.hp };
}

function hitAndFall(s, b, a, d, opts, beats) {
  const hit = strike(s, b, a, d, opts);
  if (!hit.miss) fall(b, d, hit, beats);
  return hit;
}

/** Step up to stand close to someone. */
function closeIn(a, d) {
  a.t = d.t + (a.t <= d.t ? -CLOSE : CLOSE);
  a.t = clamp(a.t, EDGE[0], EDGE[1]);
}

// ── you ──

/** What you could do right now. */
export function options(s) {
  const b = s.battle;
  if (!b || b.over || b.turn !== 'me') return null;
  const me = unitOf(b, 'me');
  const foes = foesOf(b, 'me');
  const skills = playerSkills(s).map((id) => {
    const k = SKILLS[id];
    let why = null;
    if (me.mp < k.mp) why = '靈力不足';
    else if (me.cd[id]) why = `${me.cd[id]} 回合後`;
    return { id, name: k.name, mp: k.mp, self: !!k.self, ranged: !!k.ranged, why, desc: k.desc };
  });
  const items = Object.keys(FIGHT_ITEMS)
    .filter((id) => (s.player.items[id] || 0) > 0)
    .map((id) => ({ id, name: ITEMS[id].name, n: s.player.items[id], all: !!FIGHT_ITEMS[id].all }));
  const far = foes.every((f) => !isNear(me, f));
  return {
    targets: foes.map((f) => f.id),
    attack: { name: s.player.weapon && WEAPON_VERB[s.player.weapon] ? { chaidao: '劈砍', qinggang_sword: '劍擊', hunting_bow: '射箭' }[s.player.weapon] : '拳腳', ranged: me.range === 'ranged' },
    skills,
    items,
    canBack: me.t > EDGE[0] + 10,
    flee: fleeChance(b, me, far),
  };
}

function fleeChance(b, me, far) {
  const foes = foesOf(b, 'me');
  const spd = foes.reduce((a, f) => a + f.spd, 0) / Math.max(1, foes.length);
  const boss = foes.some((f) => f.boss);
  return clamp(0.38 + (me.spd - spd) * 0.02 + (far ? 0.25 : 0) - (boss ? 0.2 : 0), 0.08, 0.92);
}

/**
 * Do something on your turn. action: { kind: 'attack', target } |
 * { kind: 'skill', id, target } | { kind: 'item', id, target } |
 * { kind: 'defend' } | { kind: 'back' } | { kind: 'flee' }.
 * Returns the beats of what happened, until it is your turn again or the fight is over.
 */
export function act(s, action) {
  const b = s.battle;
  if (!b || b.over || b.turn !== 'me') return [];
  const me = unitOf(b, 'me');
  const foes = foesOf(b, 'me');
  const pickTarget = (id) => (id && foes.find((f) => f.id === id)) || foes.slice().sort((x, y) => Math.abs(x.t - me.t) - Math.abs(y.t - me.t) || x.hp - y.hp)[0];
  const beats = [];
  b.turn = null;
  switch (action.kind) {
    case 'attack': {
      const d = pickTarget(action.target);
      const from = me.t;
      if (me.range !== 'ranged' && !isNear(me, d)) closeIn(me, d);
      const verb = WEAPON_VERB[s.player.weapon] || '一拳打向';
      const hit = hitAndFall(s, b, me, d, { mult: me.range === 'ranged' ? 0.95 : 1 }, beats);
      beats.push({ who: 'me', kind: 'attack', fx: me.range === 'ranged' ? 'arrow' : s.player.weapon ? 'slash' : 'punch', target: d.id, from, to: me.t, hits: [hit], text: say(`你${verb}${d.name}`, hit) });
      break;
    }
    case 'skill': {
      const k = SKILLS[action.id];
      if (!k || !playerSkills(s).includes(action.id) || me.mp < k.mp || me.cd[action.id]) {
        b.turn = 'me';
        return [];
      }
      me.mp -= k.mp;
      if (k.cd) me.cd[action.id] = k.cd + 1;
      if (k.self) {
        const hits = [selfCare(me, k)];
        beats.push({ who: 'me', kind: 'skill', name: k.name, fx: k.fx, target: 'me', hits, text: `你施展${k.name}。` });
        break;
      }
      const d = pickTarget(action.target);
      const from = me.t;
      if (!k.ranged && !isNear(me, d)) closeIn(me, d);
      const hit = hitAndFall(s, b, me, d, { mult: k.mult, kind: k.kind || 'phys' }, beats);
      if (!hit.miss && !hit.dead) {
        if (k.stun && rand(s) < k.stun) d.st.stun = 1;
        if (k.burn && rand(s) < k.burn) d.st.burn = 2;
        hit.status = d.st.stun ? 'stun' : d.st.burn ? 'burn' : null;
      }
      beats.push({ who: 'me', kind: 'skill', name: k.name, fx: k.fx, target: d.id, from, to: me.t, hits: [hit], text: say(`你一記${k.name}打向${d.name}`, hit) });
      break;
    }
    case 'item': {
      const it = FIGHT_ITEMS[action.id];
      if (!it || !(s.player.items[action.id] > 0)) {
        b.turn = 'me';
        return [];
      }
      s.player.items[action.id] -= 1;
      if (s.player.items[action.id] <= 0) delete s.player.items[action.id];
      const name = ITEMS[action.id].name;
      if (it.all) {
        const hits = foes.map((d) => {
          const hit = hitAndFall(s, b, me, d, { mult: it.mult, kind: it.kind, pierce: it.pierce, sure: true }, beats);
          if (!hit.dead && it.burn) d.st.burn = 2;
          return hit;
        });
        beats.push({ who: 'me', kind: 'item', name, fx: it.fx, targets: foes.map((d) => d.id), hits, text: `你祭出${name}，幽藍的火光捲向四周！` });
      } else {
        const hits = [selfCare(me, it)];
        beats.push({ who: 'me', kind: 'item', name, fx: it.fx, target: 'me', hits, text: `你服下${name}。` });
      }
      break;
    }
    case 'defend': {
      me.st.guard = 1;
      const mp = Math.min(me.maxMp - me.mp, Math.round(me.maxMp * 0.12));
      me.mp += mp;
      beats.push({ who: 'me', kind: 'guard', fx: 'guard', target: 'me', hits: [{ id: 'me', mp, hpAfter: me.hp }], text: mp ? '你凝神守住門戶，調勻了氣息。' : '你凝神守住門戶。' });
      break;
    }
    case 'back': {
      const from = me.t;
      me.t = Math.max(EDGE[0], me.t - BACK);
      beats.push({ who: 'me', kind: 'move', from, to: me.t, text: '你往後一縱，拉開了距離。' });
      break;
    }
    case 'flee': {
      const far = foes.every((f) => !isNear(me, f));
      if (rand(s) < fleeChance(b, me, far)) {
        b.over = 'flee';
        beats.push({ who: 'me', kind: 'end', over: 'flee', from: me.t, to: me.t - 160, text: '你轉身就跑，總算脫了身。' });
        return beats;
      }
      beats.push({ who: 'me', kind: 'move', fx: 'stumble', from: me.t, to: me.t, text: '你想跑，卻被纏住了。' });
      break;
    }
    default:
      b.turn = 'me';
      return [];
  }
  checkOver(b, beats);
  runUntilPlayer(s, b, beats);
  return beats;
}

function selfCare(u, k) {
  const heal = k.heal ? Math.min(u.maxHp - u.hp, Math.round(u.maxHp * k.heal)) : 0;
  u.hp += heal;
  const hit = { id: u.id, heal, hpAfter: u.hp };
  if (k.cure) {
    delete u.st.poison;
    delete u.st.burn;
    delete u.st.stun;
    hit.status = 'cure';
  }
  if (k.shield) {
    u.st.shield = Math.round(u.maxHp * k.shield);
    hit.status = 'shield';
  }
  return hit;
}

function say(line, hit) {
  if (hit.miss) return `${line}，被躲開了。`;
  if (hit.dead) return `${line}，${hit.crit ? '正中要害，' : ''}對方倒下了！`;
  return `${line}${hit.crit ? '，正中要害！' : '。'}`;
}

// ── them ──

function pickFoeTarget(s, b, u) {
  const mine = foesOf(b, 'foe');
  const me = mine.find((x) => x.side === 'me');
  const allies = mine.filter((x) => x.side === 'ally');
  if (me && (!allies.length || rand(s) < 0.65)) return me;
  return allies[Math.floor(rand(s) * allies.length)] || me;
}

function foeAct(s, b, u, beats) {
  const K = FOES[u.kind];
  const sk = K.skills;
  const d = pickFoeTarget(s, b, u);
  if (!d) return;
  const verb = () => K.says[Math.floor(rand(s) * K.says.length)];
  const blow = (opts, fx, line, extra = {}) => {
    const hit = hitAndFall(s, b, u, d, opts, beats);
    beats.push({ who: u.id, kind: 'attack', fx, target: d.id, from: extra.from ?? u.t, to: u.t, hits: [hit], name: extra.name, text: line(hit) });
    return hit;
  };
  const tell = (hit, what) => (hit.miss ? `${u.name}${what}，${d.side === 'me' ? '你' : d.name}躲開了。` : `${u.name}${what}${hit.crit ? '，正中要害！' : '。'}`);

  // the wolf king's fury, once, when hurt
  if (sk.includes('kinghowl') && !u.st.howled && u.hp < u.maxHp * 0.5) {
    u.st.howled = 1;
    u.st.rage = 0.4;
    const heal = Math.round(u.maxHp * 0.1);
    u.hp = Math.min(u.maxHp, u.hp + heal);
    beats.push({ who: u.id, kind: 'skill', name: '狼王嘯', fx: 'howl', target: u.id, hits: [{ id: u.id, heal, hpAfter: u.hp }], text: '狼王仰天長嘯，渾身的毛都豎了起來！' });
    return;
  }
  if (sk.includes('guard') && u.hp < u.maxHp * 0.35 && rand(s) < 0.3) {
    u.st.guard = 1;
    beats.push({ who: u.id, kind: 'guard', fx: 'guard', target: u.id, hits: [{ id: u.id, hpAfter: u.hp }], text: `${u.name}橫劍護住了周身。` });
    return;
  }
  if (sk.includes('drain') && (u.range === 'ranged' || rand(s) < 0.3)) {
    const hit = hitAndFall(s, b, u, d, { mult: 1, kind: 'spirit' }, beats);
    if (!hit.miss) {
      const heal = Math.min(u.maxHp - u.hp, Math.round((hit.dmg || 0) * 0.5));
      u.hp += heal;
      hit.drain = heal;
    }
    beats.push({ who: u.id, kind: 'skill', name: '噬魂', fx: 'drain', target: d.id, from: u.t, to: u.t, hits: [hit], text: tell(hit, verb()) });
    return;
  }
  if (sk.includes('foxfire') && rand(s) < 0.6) {
    const hit = hitAndFall(s, b, u, d, { mult: 1.3, kind: 'spirit' }, beats);
    if (!hit.miss && !hit.dead) d.st.burn = 2;
    beats.push({ who: u.id, kind: 'skill', name: '狐火', fx: 'foxfire', target: d.id, from: u.t, to: u.t, hits: [hit], text: tell(hit, '指尖一彈，一團狐火飛了過來') });
    return;
  }
  if (sk.includes('swordqi') && u.mp >= 6 && (!isNear(u, d) || rand(s) < 0.35)) {
    u.mp -= 6;
    const hit = hitAndFall(s, b, u, d, { mult: 1.25 }, beats);
    beats.push({ who: u.id, kind: 'skill', name: '劍氣', fx: 'swordqi', target: d.id, from: u.t, to: u.t, hits: [hit], text: tell(hit, '隔空一劍，劍氣破空而來') });
    return;
  }
  if (u.range === 'melee' && !isNear(u, d)) {
    const from = u.t;
    closeIn(u, d);
    if (sk.includes('pounce')) {
      blow({ mult: 0.85 }, 'pounce', (hit) => tell(hit, '猛地撲了上來'), { from });
    } else {
      beats.push({ who: u.id, kind: 'move', from, to: u.t, text: `${u.name}逼了上來。` });
    }
    return;
  }
  if (sk.includes('constrict') && rand(s) < 0.25) {
    const hit = blow({ mult: 0.8 }, 'constrict', (h) => tell(h, '一甩身子纏了上來'), { name: '纏絞' });
    if (!hit.miss && !hit.dead) {
      d.st.stun = 1;
      hit.status = 'stun';
    }
    return;
  }
  if (sk.includes('venom_breath') && rand(s) < 0.25) {
    const hits = foesOf(b, 'foe').map((x) => {
      const hit = hitAndFall(s, b, u, x, { mult: 0.6, kind: 'spirit' }, beats);
      if (!hit.miss && !hit.dead) {
        x.st.poison = 3;
        hit.status = 'poison';
      }
      return hit;
    });
    beats.push({ who: u.id, kind: 'skill', name: '毒霧', fx: 'venom', targets: hits.map((h) => h.id), hits, text: `${u.name}噴出一大團腥臭的毒霧！` });
    return;
  }
  if (sk.includes('sweep') && rand(s) < 0.35) {
    const hits = foesOf(b, 'foe').filter((x) => isNear(u, x)).map((x) => hitAndFall(s, b, u, x, { mult: 1 }, beats));
    if (hits.length) {
      beats.push({ who: u.id, kind: 'skill', name: '橫掃', fx: 'sweep', targets: hits.map((h) => h.id), hits, text: `${u.name}斷戟橫掃，掃倒一片！` });
      return;
    }
  }
  for (const [skill, mult, name] of [['maul', 1.6, '重掌'], ['heavy', 1.5, '劈砍'], ['rend', 1.4, '撕咬']]) {
    if (sk.includes(skill) && rand(s) < 0.3) {
      const hit = blow({ mult }, skill === 'rend' ? 'bite' : 'heavy', (h) => tell(h, verb()), { name });
      if (skill === 'rend' && !hit.miss && !hit.dead) {
        d.st.poison = 2;
        hit.status = 'bleed';
      }
      return;
    }
  }
  const hit = blow({ mult: 1 }, sk.includes('venom') || sk.includes('pounce') || sk.includes('rend') ? 'bite' : 'slash', (h) => tell(h, verb()));
  if (sk.includes('venom') && !hit.miss && !hit.dead) {
    d.st.poison = 3;
    hit.status = 'poison';
  }
}

/** Someone fighting at your side: goes for whoever is weakest. */
function allyAct(s, b, u, beats) {
  const foes = foesOf(b, 'me');
  if (!foes.length) return;
  const d = foes.slice().sort((x, y) => x.hp - y.hp)[0];
  const from = u.t;
  if (!isNear(u, d)) {
    closeIn(u, d);
    beats.push({ who: u.id, kind: 'move', from, to: u.t, text: `${u.name}衝了上去。` });
    return;
  }
  const hit = hitAndFall(s, b, u, d, { mult: 1 }, beats);
  beats.push({ who: u.id, kind: 'attack', fx: 'slash', target: d.id, from, to: u.t, hits: [hit], text: say(`${u.name}攻向${d.name}`, hit) });
}

// ── after ──

/**
 * What a fight leaves you with, as effects: what you learned from it, what
 * you took from them, and the wound it cost you.
 */
export function aftermath(s) {
  const b = s.battle;
  if (!b?.over) return [];
  const me = unitOf(b, 'me');
  const out = [];
  if (b.over === 'win' && !b.spar) {
    const foes = b.units.filter((u) => u.side === 'foe');
    const xw = Math.round(foes.reduce((a, f) => a + f.p * (f.boss ? 0.4 : 0.25), 0));
    if (xw > 0) out.push(['xw', xw]);
    for (const f of foes) for (const [p, item, n] of FOES[f.kind].loot || []) if (rand(s) < p) out.push(['item', item, n]);
    out.push(['sysexp', foes.some((f) => f.boss) ? 3 : 1]);
  }
  // won, but only just: it leaves a mark
  if (b.over !== 'lose' && !b.spar && me.hp < me.maxHp * 0.25) out.push(['hurt', 1]);
  return out;
}

export function endBattle(s) {
  s.battle = null;
}
