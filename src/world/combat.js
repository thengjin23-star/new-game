// 即時戰鬥: a fight that happens where you stand, while you move. A beast
// that sees you comes for you; it gathers itself before it strikes (you can
// see it on the ground) and stands open after; you strike, cast, step aside.
// If it is too much for you, you run — far enough, into thick wood, into a
// town — and it gives up. All in world units and seconds, on the same ground
// and the same clock as walking: explore.js runs it every frame, and the
// beast you fight is the beast that was out there, not a copy of it.
//
// What roams comes alone or in a group: a pack takes turns at you and
// circles while it waits, and breaks once enough of it is down; a snake lies
// hidden and strikes first; robbers and the restless dead come up to have a
// word (their event) — and if you choose to fight, or to run, it plays out
// here, and the story ends the way the fight did (core/events.js).

import { collides, speedAt, terrainAt, regionAt, isReachable, findPath, world, PLAYER_R } from './terrain.js';
import { T } from './geo.js';
import { BEASTS } from './places.js';
import { NODES } from './map.js';
import { npcRealm } from './npcs.js';
import { FOES } from '../content/foes.js';
import { EVENTS } from '../content/index.js';
import { MOVES, STRIKES, DASH, BEAST_MOVES } from '../content/moves.js';
import { fightPower } from '../core/battle.js';
import { power } from '../core/cultivation.js';
import { applyEffects } from '../core/effects.js';
import { notice, startEvent, choose, fightChoice, endRealFight, resolve } from '../core/events.js';
import { newReport, spendHours } from '../core/time.js';
import { rand } from '../core/rng.js';

/** Blood a wound holds back: 輕傷 leaves you three quarters of it, and so on. */
const HP_CAP = [1, 0.75, 0.5, 0.3];
/** A beast of your own strength falls to about this many plain blows… */
const HITS = 18;
/** …and fells you with about this many bites, if you never get out of the way. */
const BITES = 8;
/** How sharply a gap in strength tells (as in the old fights). */
const GAP = 0.42;
/**
 * How strong each of a group is, as a share of one alone of the group's power:
 * fewer of them go at you at once than in the old fights, and a group gives up
 * before the last of it falls, so each is a larger share than it was there.
 */
const SHARE = [0, 1, 0.58, 0.5, 0.42, 0.37];
/** Far stronger than a beast, and it runs. */
const FAR_STRONGER = 2.2;
/** Further off than this, a beast rests at home and is not thought about. */
const AWAKE = 1700;
/** Ground a beast will not follow you onto. */
const REFUGE = new Set(['town', 'market', 'sect', 'temple']);
/** The fight's clock: game hours that pass for each second of fighting (walking passes far more). */
export const FIGHT_HOURS = 1 / 120;
/** A beast's 境界, as it is named. */
export const TIER_NAME = ['凡獸', '一階', '二階', '三階', '四階'];
/** A person's, likewise. */
const PERSON_RANK = ['凡人', '煉氣', '築基', '金丹', '元嬰'];

/** What a beast is doing that means it is after you. */
const HUNTING = new Set(['chase', 'windup', 'leap', 'recover', 'hop', 'howl']);
/**
 * Out of the fight: dead and fading, gone until it comes back, running off,
 * on its knees, on its way (the matter settled).
 */
const DOWN = new Set(['dead', 'gone', 'vanish', 'flee', 'yield', 'leave']);

const FALL_TEXT = {
  demon_wolf: '妖狼把你撲倒在地。牠的牙擦過你的喉嚨，眼前一黑——\n\n醒來時，天色已經變了。那頭狼不見了，大概是嫌你不好吃。你身上多了好幾道血口。',
  beast: '你倒下了，眼前一黑——\n\n醒來時，天色已經變了。四下無人，只剩一身的傷。',
};

// ── the fight's own state (never saved: a fight does not outlast closing the game) ──

const LIVE = new WeakMap();

export function combatOf(s) {
  let C = LIVE.get(s);
  if (!C) {
    C = {
      on: false, t: 0, me: null, beasts: null, shots: [], fx: [], pops: [], preview: null, notes: [], signals: [],
      beaten: 0, foes: new Set(), quiet: 0, outcome: null, trial: null, rt: null, heard: {}, told: {}, uid: 0,
    };
    LIVE.set(s, C);
  }
  return C;
}

/** Are you in a fight right now? */
export function inCombat(s) {
  return combatOf(s).on;
}

// ── you ──

/** Your blood, 靈力, cooldowns: they go with you from fight to fight, and come back as you rest. */
export function hero(s, C = combatOf(s)) {
  const p = s.player;
  const P = Math.max(3, fightPower(s));
  const maxHp = Math.round(20 + 2.6 * P);
  const own = p.realm === 0 ? 0 : p.realm === 1 ? 18 + 4 * p.stage : p.realm === 2 ? 90 + 15 * p.stage : 260;
  const maxMp = Math.max(own, C.trial?.lend || 0);
  const cap = Math.max(1, Math.round(maxHp * HP_CAP[p.injury || 0]));
  let me = C.me;
  if (!me) {
    me = C.me = {
      hp: cap, mp: maxMp, cds: {}, act: null, dash: null, kb: null, inv: 0, shield: 0, shieldT: 0, poison: null,
      hurtT: -99, flashT: -99, target: null, auto: false, hold: false, press: 0, steer: null, dir: [1, 0], trail: [],
    };
  }
  // grown stronger (a breakthrough, a wound healed, 靈力 lent): the new room comes filled
  if (me.cap > 0 && cap > me.cap) me.hp += cap - me.cap;
  if (maxMp > (me.maxMp ?? maxMp)) me.mp += maxMp - me.maxMp;
  me.P = P;
  me.maxHp = maxHp;
  me.cap = cap;
  me.maxMp = maxMp;
  me.atk = 1.5 + 0.5 * P;
  me.crit = 0.05 + (p.attrs.jiyuan ?? 5) * 0.008;
  me.realm = p.realm;
  if (me.hp > cap) me.hp = cap;
  if (me.mp > maxMp) me.mp = maxMp;
  return me;
}

/** Your plain blow, by what you hold. */
export function strikeOf(s) {
  return STRIKES[s.player.weapon] || STRIKES.fists;
}

/** The three moves of a cultivator: stronger if you have learned the art behind one; out of reach before 煉氣. */
export function kitOf(s) {
  const C = combatOf(s);
  const p = s.player;
  const knows = (ids) => ids.some((a) => (p.arts || []).includes(a) || p.tech === a);
  const able = p.realm >= 1 || !!C.trial;
  return Object.entries(MOVES).map(([id, m]) => {
    const good = knows(m.arts || []);
    return { ...m, ...(good ? m.better : null), id, good, locked: able ? null : '需引氣入體' };
  });
}

/** How soon you can step aside again: quicker as your cultivation deepens. */
export function dashCd(s) {
  const p = s.player;
  return p.realm === 0 ? 2.6 : p.realm === 1 ? DASH.cd - p.stage * 0.03 : p.realm === 2 ? 1.7 : 1.4;
}

// ── the beasts ──

function seedOf(def, k) {
  return (Math.abs(Math.round(def.x * 7919 + def.y * 104729 + k * 7177)) % 2147483646) + 1;
}

/** Where it rests when it is not after anyone: a snake lies hidden in the grass. */
function homeState(b) {
  return b.R.ambush ? 'hide' : 'idle';
}

/** One of a group (k: which; the first is its leader, if it has one). */
function spawn(s, def, k = 0) {
  const kind = k === 0 && def.lead ? def.lead : def.kind;
  const K = FOES[kind];
  const n = def.n || 1;
  // a group stands about its ground, not on one spot
  let x = def.x;
  let y = def.y;
  if (n > 1) {
    const a = (k / n) * Math.PI * 2 + 0.7;
    const nx = def.x + Math.cos(a) * def.r * 0.3;
    const ny = def.y + Math.sin(a) * def.r * 0.3;
    if (!collides(s, nx, ny, 12)) [x, y] = [nx, ny];
  }
  const R = { ...K.rt, ...(def.rt || null) };
  const b = {
    uid: n > 1 ? `${def.id}:${k}` : def.id, k, def, kind, K, R, name: (k === 0 && def.name) || K.name, phantom: !!def.phantom,
    lead: k === 0 && !!def.lead, talker: !!(R.talk && def.event), cond: (def.event && EVENTS[def.event]?.cond) || null,
    home: [x, y], x, y, vx: 0, vy: 0, face: 1, dir: [1, 0], moving: false,
    state: 'idle', st: 0, wait: 1 + k * 0.7, tx: x, ty: y, cds: {}, hp: null, maxHp: null, armed: false, aggro: false,
    strafe: k % 2 ? -1 : 1, lostT: 0, calm: 0, flashT: -99, burn: null, enraged: false, howled: false, fade: 0,
    token: false, rest: 0, pause: 0, stay: false, seed: seedOf(def, k),
  };
  // its own dice for how it moves and what it tries (the save's dice are left for the story)
  b.rng = () => (b.seed = (b.seed * 16807) % 2147483647) / 2147483647;
  reset(b);
  return b;
}

function beastsOf(s, C = combatOf(s)) {
  if (!C.beasts) C.beasts = BEASTS.flatMap((def) => Array.from({ length: def.n || 1 }, (_, k) => spawn(s, def, k)));
  return C.beasts;
}

/** It and the rest of its group. */
function groupOf(s, C, b) {
  return beastsOf(s, C).filter((x) => x.def === b.def);
}

/**
 * Out there now: not killed (or run off) and waiting to come back, and its
 * story could happen now (the season for snakes; robbers who have not taken
 * you in). Those you are dealing with stay until the matter is settled.
 */
function present(s, b) {
  if (b.phantom || b.stay) return true;
  const m = s.world.mobs || {};
  if (s.day < (m[b.def.id] ?? -1)) return false;
  if (b.uid !== b.def.id && s.day < (m[b.uid] ?? -1)) return false;
  return !b.cond || !!b.cond(s);
}

/** Keep it away for a while (the longer of what is already set and this). */
function away(s, key, days) {
  const m = s.world.mobs;
  m[key] = Math.max(m[key] ?? 0, s.day + days);
}

const alive = (b) => !DOWN.has(b.state) && b.state !== 'vanished';
/** Alive, and not hidden: something you can see to go for. */
const seen = (b) => alive(b) && b.state !== 'hide';
const hunting = (b) => b.aggro && HUNTING.has(b.state);

/** The beasts near you, for drawing and for picking whom to strike (the dead fade out among them). */
export function beastsInWorld(s, radius = 1400) {
  const w = s.world;
  return beastsOf(s).filter((b) => b.state !== 'gone' && b.state !== 'vanished' && present(s, b) && Math.abs(b.x - w.x) < radius && Math.abs(b.y - w.y) < radius);
}

/** Beasts you could go for (they show the act button: 出手). */
export function beastTargets(s) {
  return beastsInWorld(s, 700)
    .filter((b) => seen(b))
    .map((b) => ({ kind: 'beast', id: b.uid, x: b.x, y: b.y, name: b.name, verb: '出手', reach: 300 }));
}

function tierOf(b) {
  return b.tierSet ?? b.def.tier ?? b.R.tier ?? 1;
}

/** What it is, as a fighter: a beast's 階, a person's realm. */
export function rankOf(b) {
  if (b.phantom) return '';
  return b.rank || b.R.rank || (b.R.person ? PERSON_RANK : TIER_NAME)[tierOf(b)] || '';
}

/** Back home and calm, as if nothing happened (and as it was before any story touched it). */
function reset(b) {
  Object.assign(b, {
    x: b.home[0], y: b.home[1], tx: b.home[0], ty: b.home[1], state: homeState(b), st: 0, wait: 1, aggro: false,
    hp: b.maxHp, armed: false, burn: null, enraged: false, howled: false, fade: 0, lostT: 0, calm: 0, move: null, moving: false,
    token: false, rest: 0, pause: 0, stay: false, Dset: null, tierSet: null, rank: null, name: (b.k === 0 && b.def.name) || b.K.name,
  });
  // a leap or a shot takes a moment to come: it does not open with one
  b.cds = Object.fromEntries((b.R.moves || []).map((id) => [id, BEAST_MOVES[id].shape === 'fan' ? 0 : 1.2]));
}

/**
 * Size a beast against you as you are now: its blood, its bite, its pace, and
 * the gap between your realms. A group shares out what a fight with all of it
 * asks of you (its leader a larger part), as the old fights did.
 */
function arm(s, C, b) {
  const me = hero(s, C);
  const K = b.K;
  const R = b.R;
  const def = b.def;
  const n = def.n || 1;
  const mean = def.lead && n > 1 ? (n + 0.5) / n : 1;
  const D = ((b.Dset ?? def.power ?? 20) * (b.lead ? 1.5 : 1)) / mean;
  const share = SHARE[Math.min(n, SHARE.length - 1)] * (R.share ?? 1);
  const shape = Math.sqrt(K.hp * K.atk);
  const rel = Math.pow(D / me.P, GAP) * share;
  const tier = tierOf(b);
  const gap = tier - me.realm;
  const frac = b.maxHp ? Math.max(0.05, b.hp / b.maxHp) : 1;
  b.D = D;
  b.tier = tier;
  b.gap = gap;
  b.maxHp = Math.max(6, Math.round((me.atk * HITS * rel * K.hp) / shape));
  b.hp = Math.max(1, Math.round(b.maxHp * frac));
  // 境界壓制: a realm above yours bites harder, moves faster, and shrugs off most of what you do
  // (one below yours, a little the other way)
  b.dmg = (((me.maxHp / BITES) * rel * K.atk) / shape) * (gap > 0 ? 1 + 0.6 * gap : Math.pow(0.85, -gap));
  b.speed = R.speed * (gap > 0 ? 1 + 0.08 * gap : 1);
  b.taken = gap > 0 ? Math.pow(0.45, gap) : 1 + 0.15 * -gap;
  b.armed = true;
}

/** Trees hide you: in a wood a beast sees you later and loses you sooner. */
function cover(s) {
  const t = terrainAt(s.world.x, s.world.y);
  return t === T.DEEP ? 0.65 : t === T.FOREST ? 0.8 : 1;
}

/** How far off a beast sees you: further in its hunting hours, less when it dozes at noon (the dead walk by night). */
function sightOf(s, b) {
  const R = b.R;
  const night = s.tod >= 19.5 || s.tod < 5;
  const noon = s.tod >= 10.5 && s.tod < 14.5;
  return R.sight * (night ? R.night ?? 1.2 : (noon ? R.noon ?? 1 : 1) * (R.day ?? 1)) * cover(s);
}

/** Inside a town (a temple, a sect), you are out of a beast's reach. */
function refuge(s, x, y) {
  return REFUGE.has(NODES[regionAt(s, x, y)]?.kind);
}

/** Move something (with x, y) along (ux, uy) by len, sliding along whatever it bumps into. Returns how far it went. */
function slide(s, o, ux, uy, len, r) {
  if (!(len > 0)) return 0;
  const n = Math.max(1, Math.ceil(len / 6));
  let moved = 0;
  for (let k = 0; k < n; k++) {
    const sx = (ux * len) / n;
    const sy = (uy * len) / n;
    if (!collides(s, o.x + sx, o.y + sy, r)) {
      o.x += sx;
      o.y += sy;
      moved += Math.hypot(sx, sy);
    } else if (sx && !collides(s, o.x + sx, o.y, r)) {
      o.x += sx;
      moved += Math.abs(sx);
    } else if (sy && !collides(s, o.x, o.y + sy, r)) {
      o.y += sy;
      moved += Math.abs(sy);
    } else break;
  }
  return moved;
}

/** A beast's pace over this ground: thick wood slows a big body more than it slows you. */
function paceOf(b) {
  return Math.pow(speedAt(b.x, b.y), b.R.bulk ?? 1);
}

function beastStep(s, b, ux, uy, len) {
  // it will not come into a town after you
  if (!b.phantom && refuge(s, b.x + ux * Math.min(len + 14, 30), b.y + uy * Math.min(len + 14, 30))) return 0;
  const moved = slide(s, b, ux, uy, len, b.R.body * 0.65);
  if (Math.abs(ux) > 0.15) b.face = ux < 0 ? -1 : 1;
  return moved;
}

function look(b, ux, uy) {
  b.dir = [ux, uy];
  if (Math.abs(ux) > 0.15) b.face = ux < 0 ? -1 : 1;
}

/** Is (px, py) inside the fan of a blow from (x, y) toward dir? */
export function inFan(x, y, dir, reach, arc, px, py) {
  const dx = px - x;
  const dy = py - y;
  const d = Math.hypot(dx, dy);
  if (d > reach) return false;
  if (d < 1) return true;
  return (dx * dir[0] + dy * dir[1]) / d >= Math.cos(arc / 2);
}

/** How close a point comes to a stretch of line. */
function segDist(x0, y0, x1, y1, px, py) {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const L2 = vx * vx + vy * vy;
  const k = L2 ? Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / L2)) : 0;
  return Math.hypot(px - (x0 + vx * k), py - (y0 + vy * k));
}

/** Nothing in the way of a leap (or a run straight at you). */
function clearPath(s, b, ux, uy, d) {
  for (let k = 12; k < d; k += 12) if (collides(s, b.x + ux * k, b.y + uy * k, b.R.body * 0.6)) return false;
  return true;
}

/** What stops a shot: rock, a cliff, a wall, a building. (It flies over water and between trees.) */
function stopsShot(x, y) {
  const t = terrainAt(x, y);
  if (t === T.PEAK || t === T.CLIFF || t === T.WALL || t === T.VOID) return true;
  for (const r of world().solids) if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true;
  return false;
}

/** Could a shot get from one point to the other? */
function clearShot(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  for (let k = 14; k < d; k += 14) if (stopsShot(x0 + ((x1 - x0) * k) / d, y0 + ((y1 - y0) * k) / d)) return false;
  return true;
}

function pop(C, x, y, text, kind, up) {
  C.pops.push({ x, y, up, text, kind, t0: C.t });
}

// ── blows ──

/** You land a blow (or a spell) on a beast. kind: 'phys' | 'fire' | 'spirit' | 'burn'. */
function hurtBeast(s, C, b, base, io, { kind = 'phys' } = {}) {
  if (!alive(b)) return false;
  // caught unaware, it takes the first blow full
  const sneak = b.state === 'idle' || b.state === 'hide';
  // going for those who came to talk (or were coming to): it comes to blows, and the story goes the way of the fight
  if (b.talker && !b.phantom && !C.rt && !s.rtFight && !provoke(s, C, b, io)) return false;
  if (!b.armed) arm(s, C, b);
  const me = C.me;
  const crit = kind !== 'burn' && rand(s) < me.crit;
  const roll = kind === 'burn' ? 1 : 0.85 + rand(s) * 0.3;
  // a thing of spirit: a blade goes through it; fire and 靈力 do not
  const spirit = b.K.spirit ? (kind === 'phys' ? 0.5 : kind === 'fire' || kind === 'burn' ? 1.3 : 1.15) : 1;
  const dmg = Math.max(1, Math.round(base * roll * (crit ? 1.6 : 1) * b.taken * spirit * (sneak ? 1.5 : 1)));
  b.hp -= dmg;
  b.flashT = C.t;
  pop(C, b.x, b.y, String(dmg), crit ? 'crit' : kind === 'burn' ? 'burn' : spirit < 1 ? 'weak' : 'dmg', b.R.tall);
  if (spirit < 1 && !C.told.spirit) {
    C.told.spirit = true;
    io.feed('sys', `兵刃從${b.name}身上穿了過去，傷不了它多少——法術才管用。`);
  }
  if (b.hp <= 0) {
    fell(s, C, b, io);
    return true;
  }
  const R = b.R;
  if (R.yield && b.hp <= b.maxHp * R.yield) {
    giveUp(s, C, b, io);
    return true;
  }
  if (R.flee && b.hp <= b.maxHp * R.flee) {
    rout(s, C, b, io, `${b.name}捂著傷口逃了！`);
    morale(s, C, b, io);
    return true;
  }
  if (sneak) {
    // it reels a moment, then it is on you
    b.state = 'recover';
    b.st = 0;
    b.rec = 0.7;
    b.move = null;
    engage(s, C, b, io, '你搶先出手！');
  } else if (!HUNTING.has(b.state)) {
    b.state = 'chase';
    b.st = 0;
    engage(s, C, b, io);
  }
  return true;
}

/**
 * A blow reaches you — unless you are not there to take it. push: [ux, uy,
 * distance] it knocks you; M: the move (its venom, what it drinks). Returns
 * the blood it took, or -1 if you stepped out of it.
 */
function hurtMe(s, C, b, mult, io, push = null, M = null) {
  const me = C.me;
  const w = s.world;
  if (!b.armed) arm(s, C, b);
  if (me.inv > 0) {
    pop(C, w.x, w.y, '閃', 'miss', 40);
    return -1;
  }
  let dmg = Math.max(1, Math.round(b.dmg * mult * (0.85 + rand(s) * 0.3) * (b.enraged ? 1.2 : 1)));
  if (me.shield > 0) {
    const held = Math.min(me.shield, dmg);
    me.shield -= held;
    dmg -= held;
    pop(C, w.x + 10, w.y, `擋 ${held}`, 'block', 46);
    if (me.shield <= 0) {
      me.shield = 0;
      me.shieldT = 0;
    }
  }
  if (dmg > 0) {
    me.hp -= dmg;
    me.hurtT = C.t;
    me.flashT = C.t;
    pop(C, w.x, w.y, String(dmg), 'hurt', 40);
    if (M?.poison) {
      if (!me.poison) pop(C, w.x - 12, w.y, '中毒', 'status', 52);
      me.poison = { left: M.poison[0], dps: b.dmg * M.poison[1], tick: 0.5 };
    }
    if (M?.drain && alive(b)) {
      const back = Math.max(1, Math.round(dmg * M.drain));
      b.hp = Math.min(b.maxHp, b.hp + back);
      pop(C, b.x, b.y, String(back), 'heal', b.R.tall);
    }
  }
  if (push && !me.dash) me.kb = { ux: push[0], uy: push[1], left: push[2] };
  if (me.hp <= 0) {
    me.hp = 0;
    fallen(s, C, b, io);
  }
  return dmg;
}

/** It is no longer the one you were going for. */
function untarget(C, b) {
  if (C.me?.target !== b.uid) return;
  C.me.target = null;
  C.me.auto = false;
  C.me.steer = null;
}

/** It goes down: what it leaves, what you learn from it. */
function fell(s, C, b, io) {
  Object.assign(b, { hp: 0, state: 'dead', st: 0, burn: null, moving: false, aggro: false, token: false });
  C.beaten += 1;
  untarget(C, b);
  if (b.phantom) {
    io.feed('good', `${b.name}散成了一縷青煙。`);
    return;
  }
  away(s, b.uid, b.def.respawn ?? 10);
  const report = newReport();
  const gains = [['xw', Math.max(1, Math.round(b.D * (b.K.boss ? 0.4 : 0.25)))]];
  for (const [p, item, n] of b.K.loot || []) if (rand(s) < p) gains.push(['item', item, n]);
  gains.push(['sysexp', b.K.boss ? 3 : 1]);
  applyEffects(s, gains, {}, report);
  io.feed('good', b.K.spirit ? `${b.name}化為飛灰。` : `${b.name}倒下了。`);
  for (const c of report.chips) io.feed(c.tone === 'bad' ? 'bad' : 'good', c.text);
  for (const t of report.toasts) io.feed('sys', t);
  morale(s, C, b, io);
}

/** It throws down its blade and begs: beaten, though it lives. */
function giveUp(s, C, b, io) {
  Object.assign(b, { state: 'yield', st: 0, aggro: false, moving: false, move: null, burn: null, token: false });
  C.beaten += 1;
  untarget(C, b);
  io.feed('good', `${b.name}扔下了刀，跪地求饒！`);
  morale(s, C, b, io);
}

/** It runs for it. Beaten, if it was in the fight. */
function rout(s, C, b, io, line = null) {
  if (b.aggro) C.beaten += 1;
  Object.assign(b, { state: 'flee', st: 0, aggro: false, moving: false, move: null, burn: null, token: false });
  untarget(C, b);
  if (line) io.feed('good', line);
}

/**
 * One of a group is down: with its leader gone, or more than half a pack,
 * the rest give up and run; a pack that loses one of its own turns savage.
 */
function morale(s, C, b, io) {
  const rest = groupOf(s, C, b).filter((x) => x !== b && alive(x) && x.aggro);
  if (!rest.length) return;
  if (b.lead || (b.R.pack && rest.length * 2 < (b.def.n || 1))) {
    for (const x of rest) rout(s, C, x, io);
    io.feed('good', b.R.broke || '剩下的一哄而散。');
    return;
  }
  if (!b.R.mourn) return;
  let howled = false;
  for (const x of rest) {
    if (x.enraged || x.state === 'leap') continue;
    Object.assign(x, { state: 'howl', st: 0, moving: false, howled: true, move: null });
    C.fx.push({ kind: 'howl', x: x.x, y: x.y, t0: C.t, dur: 0.9 });
    howled = true;
  }
  if (howled) io.feed('bad', '狼群一陣長嚎，眼睛都紅了！');
}

/** You go down. The beasts lose interest; you wake later, hurt (and the story, if there is one, says how). */
function fallen(s, C, b, io) {
  const me = C.me;
  Object.assign(me, { act: null, dash: null, kb: null, auto: false, hold: false, press: 0, steer: null, target: null, shield: 0, shieldT: 0, poison: null });
  for (const x of beastsOf(s, C)) if (hunting(x) || x.state === 'notice') calmDown(x, true);
  C.shots = [];
  C.on = false;
  C.outcome = 'fell';
  io.signal({ combat: 'fell' });
  if (C.trial) return endTrial(s, C, io, 'fell');
  hero(s, C);
  me.hp = Math.max(1, Math.round(me.cap * 0.5));
  me.mp = Math.round(me.maxMp * 0.5);
  if (C.rt) return endTale(s, C, 'lost');
  const report = newReport();
  // you lie there a while
  spendHours(s, 3, report);
  // what it did to you, as its story tells it (the wolves on the hill, the snake in the grass)
  const ev = b?.def.event ? EVENTS[b.def.event] : null;
  const fail = ev ? fightOf(ev)?.fail : null;
  const hurt = fail ? (typeof fail.effects === 'function' ? fail.effects(s, {}) : fail.effects || []) : [['hurt', (b?.gap || 0) > 0 ? 2 : 1]];
  applyEffects(s, hurt, {}, report);
  if (s.dead) return;
  hero(s, C);
  me.hp = Math.max(1, Math.round(me.cap * 0.5));
  const text = fail?.text ? resolve(fail.text, s) : FALL_TEXT[b?.kind] || FALL_TEXT.beast;
  notice(s, '倒下', text, { chips: report.chips, toasts: report.toasts });
}

/** The fight in an event's first step, if it has one. */
function fightOf(ev) {
  const st = ev.steps ? ev.steps.start : ev;
  return (st.choices || []).find((c) => c.fight) || null;
}

// ── the fight begins and ends ──

/** It (and its whole group) is after you now. */
function engage(s, C, b, io, line = null) {
  const start = !C.on;
  if (start) {
    C.on = true;
    C.beaten = 0;
    C.quiet = 0;
    C.outcome = null;
    C.foes = new Set();
  }
  for (const x of groupOf(s, C, b)) {
    if (!alive(x) || !present(s, x)) continue;
    if (!x.armed) arm(s, C, x);
    x.aggro = true;
    x.lostT = 0;
    C.foes.add(x.uid);
    if (x !== b && !HUNTING.has(x.state)) {
      x.state = 'chase';
      x.st = -x.rng() * 0.3;
    }
  }
  if (!start) return;
  io.signal({ combat: 'start', name: b.def.title || b.name, rank: rankOf(b), tier: b.tier, gap: b.gap, phantom: b.phantom });
  io.feed('bad', (line || b.R.cry || '{name}盯上了你！').replaceAll('{name}', b.name));
  if (b.gap > 0) {
    const [who, him] = b.R.person ? ['對方', '他'] : b.K.spirit ? ['它', '它'] : ['牠', '牠'];
    io.feed('bad', `境界壓制：${who}高出你一個大境界，你的攻擊很難傷到${him}。`);
  }
}

/** It gives up on you and goes home (and its wounds close as it goes). */
function calmDown(b, heal = false) {
  Object.assign(b, { state: 'return', st: 0, aggro: false, calm: 4, move: null, burn: null, enraged: false, howled: false, lostT: 0, token: false, pause: 0 });
  if (heal && b.maxHp) b.hp = b.maxHp;
}

function finish(s, C, io) {
  C.on = false;
  // won: you beat at least one of them, and none of those you fought is still standing
  const standing = beastsOf(s, C).some((b) => C.foes.has(b.uid) && alive(b) && present(s, b));
  const won = C.beaten > 0 && !standing;
  C.outcome = won ? 'won' : 'escaped';
  Object.assign(C.me, { auto: false, hold: false, press: 0, target: null, steer: null });
  io.signal({ combat: C.outcome });
  if (C.trial) return endTrial(s, C, io, C.outcome);
  if (C.rt) return endTale(s, C, C.outcome);
  io.feed(won ? 'good' : 'sys', won ? '戰鬥結束。' : '已脫離戰鬥。');
}

// ── the story: those who come to talk, and the fights that come of it ──

/** Close enough for a word: they stop in front of you, and their event begins. */
function parley(s, C, b) {
  for (const x of groupOf(s, C, b)) {
    if (!alive(x) || !present(s, x)) continue;
    Object.assign(x, { state: 'talk', st: 0, moving: false, stay: true, aggro: false });
    look(x, s.world.x - x.x, s.world.y - x.y);
  }
  // whatever comes of it, they will not be back for a while
  away(s, b.def.id, b.def.respawn ?? 10);
  startEvent(s, b.def.event, { data: { beast: b.def.id } });
}

/** You went for them before a word was said: the event begins as a fight (as if you had chosen to fight). */
function provoke(s, C, b, io) {
  for (const x of groupOf(s, C, b)) if (alive(x) && present(s, x)) x.stay = true;
  away(s, b.def.id, b.def.respawn ?? 10);
  startEvent(s, b.def.event, { data: { beast: b.def.id, first: 'me' } });
  const pend = s.pending;
  const c = pend?.choices.find((x) => !x.disabled && fightChoice(pend, x.i));
  if (!c) {
    for (const x of groupOf(s, C, b)) x.stay = false;
    return false;
  }
  choose(s, c.i);
  if (!s.rtFight) return false;
  beginTale(s, C, io, true);
  return true;
}

/**
 * The fight (or the run) you chose in their event begins: they are what the
 * story said they were (as strong as it asked, named as it named them).
 */
function beginTale(s, C, io, first = false) {
  const f = s.rtFight;
  const group = beastsOf(s, C).filter((b) => b.def.id === f.beast && alive(b) && present(s, b));
  if (!group.length) return endRealFight(s, 'escaped');
  f.on = true;
  C.rt = f;
  const npc = f.npcId ? s.npcs[f.npcId] : null;
  for (const b of group) {
    b.stay = true;
    if (f.diff) b.Dset = f.diff;
    if (npc && b.k === 0 && b.R.person) {
      b.name = npc.name;
      b.rank = npcRealm(npc);
      b.tierSet = npc.realm;
    }
    b.armed = false;
    b.maxHp = null;
    arm(s, C, b);
    // running for it: a moment before they see what you are about
    Object.assign(b, { state: 'chase', st: 0, lostT: 0, calm: 0, pause: f.run ? 0.8 : 0, cds: { ...b.cds } });
  }
  const lead = group[0];
  engage(s, C, lead, io, first ? '你搶先出手！' : f.run ? `你轉身就跑——${lead.name}追了上來！` : lead.R.cry);
}

/** The fight the story started is over: they wait on what comes of it (and then go), and the story picks up. */
function endTale(s, C, how) {
  const f = C.rt;
  C.rt = null;
  for (const b of beastsOf(s, C)) {
    if (b.def.id !== f.beast || !alive(b)) continue;
    Object.assign(b, { state: 'talk', st: 0, aggro: false, moving: false, move: null, burn: null, token: false });
  }
  C.shots = C.shots.filter((sh) => !sh.foe);
  endRealFight(s, how);
}

/** On their way, the matter settled. */
function leave(b) {
  Object.assign(b, { state: 'leave', st: 0, aggro: false, moving: false, move: null, token: false });
}

// ── the frame ──

const STILL = { on: false, moved: 0, hold: false, mult: 1, steer: null };

/**
 * One frame of fighting (explore.step calls it while the world runs).
 * io: { input, feed(kind, text), signal(x) }. Returns:
 *   on — whether you are in a fight;
 *   moved — how far the fight itself moved you (a dash, a blow that knocked you back);
 *   hold — the fight is moving you this frame (walking waits);
 *   mult — how fast you can walk (slower while casting or swinging);
 *   steer — which way to go if you are walking up to whoever you went for.
 */
export function updateCombat(s, dt, io) {
  const C = combatOf(s);
  C.t += dt;
  for (const n of C.notes.splice(0)) io.feed(n.kind, n.text);
  for (const g of C.signals.splice(0)) io.signal(g);
  const me = hero(s, C);
  const w = s.world;
  const list = beastsOf(s, C);
  // a fight (or a run) chosen in an event; one from before the game was closed is long over
  if (s.rtFight) {
    if (!s.rtFight.on) beginTale(s, C, io, s.rtFight.pend?.ctx?.data?.first === 'me');
    else if (C.rt !== s.rtFight) endRealFight(s, 'escaped');
    if (s.pending || s.dead) return STILL;
  }
  const steering = !!(io.input && (io.input.x || io.input.y));
  me.press = Math.max(0, me.press - dt);
  // taking the stick yourself ends walking up to someone
  if (steering && !me.hold && me.press <= 0) {
    me.auto = false;
    me.steer = null;
  }
  const heard = new Set();
  for (const b of list) {
    if (!present(s, b)) {
      b.state = 'gone';
      continue;
    }
    if (b.state === 'gone') reset(b);
    // the matter settled (you paid, they spoke, the fight is over): on their way
    if (b.stay && (b.state === 'talk' || b.state === 'yield') && !s.rtFight && !C.rt) leave(b);
    if (!b.phantom && !b.stay && !hunting(b) && Math.hypot(b.x - w.x, b.y - w.y) > AWAKE) {
      if (b.state !== homeState(b) || b.x !== b.home[0]) reset(b);
      continue;
    }
    if (!heard.has(b.def) && (b.state === 'idle' || b.state === 'hide')) {
      heard.add(b.def);
      hearing(s, C, b, io);
    }
    const x0 = b.x;
    const y0 = b.y;
    think(s, C, b, dt, io);
    if (dt > 0) {
      b.vx += ((b.x - x0) / dt - b.vx) * Math.min(1, dt * 8);
      b.vy += ((b.y - y0) / dt - b.vy) * Math.min(1, dt * 8);
    }
    if (s.pending || s.dead) return STILL;
  }
  // phantoms that are done, gone
  if (list.some((b) => b.state === 'vanished')) C.beasts = list.filter((b) => b.state !== 'vanished');
  const moved = heroTick(s, C, dt, io);
  if (s.pending || s.dead) return STILL;
  flyShots(s, C, dt, io);
  if (s.pending || s.dead) return STILL;
  C.fx = C.fx.filter((f) => C.t - f.t0 < (f.dur || 0.6));
  C.pops = C.pops.filter((p) => C.t - p.t0 < 1.1);
  if (C.on) {
    const still = beastsOf(s, C).some((b) => hunting(b) && present(s, b));
    C.quiet = still ? 0 : C.quiet + dt;
    if (C.quiet > 0.6) finish(s, C, io);
    if (s.pending || s.dead) return STILL;
  }
  const act = me.act;
  const mult = act && !act.done ? (act.kind === 'cast' ? 0.35 : 0.55) : act ? 0.75 : 1;
  return { on: C.on, moved, hold: !!(me.dash || me.kb), mult, steer: me.auto ? me.steer : null };
}

/** You hear them before they come (once, as you draw near a group). */
function hearing(s, C, b, io) {
  const R = b.R;
  if (!R.warn || b.phantom) return;
  const w = s.world;
  let near = Infinity;
  for (const x of groupOf(s, C, b)) if (alive(x)) near = Math.min(near, Math.hypot(x.x - w.x, x.y - w.y));
  const sight = sightOf(s, b);
  if (near < sight + 160) {
    if (!C.heard[b.def.id]) {
      C.heard[b.def.id] = true;
      // (two groups of the same about you: you hear it once)
      if (C.t - (C.heard[R.warn] ?? -99) > 20) io.feed('ambient', R.warn);
      C.heard[R.warn] = C.t;
    }
  } else if (near > sight + 400) C.heard[b.def.id] = false;
}

// ── what a beast does ──

function think(s, C, b, dt, io) {
  const w = s.world;
  const R = b.R;
  b.st += dt;
  for (const k of Object.keys(b.cds)) b.cds[k] = Math.max(0, b.cds[k] - dt);
  if (b.burn && alive(b)) {
    b.burn.left -= dt;
    b.burn.tick -= dt;
    if (b.burn.tick <= 0) {
      b.burn.tick = 0.5;
      hurtBeast(s, C, b, b.burn.dps * 0.5, io, { kind: 'burn' });
    }
    if (b.burn && b.burn.left <= 0) b.burn = null;
  }
  const dx = w.x - b.x;
  const dy = w.y - b.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  switch (b.state) {
    case 'idle':
    case 'hide': {
      // (a snake lies still in the grass: you see it only when it moves)
      if (b.state === 'idle') wander(s, b, dt);
      if (b.calm > 0) {
        b.calm -= dt;
        break;
      }
      if (d < sightOf(s, b) && (b.phantom || !refuge(s, w.x, w.y))) spotted(s, C, b, io, d, ux, uy);
      break;
    }
    case 'notice': {
      // it has seen you: a long look, then it comes
      look(b, ux, uy);
      b.moving = false;
      if (d > sightOf(s, b) * 1.5 || (!b.phantom && refuge(s, w.x, w.y))) {
        b.state = homeState(b);
        b.st = 0;
        break;
      }
      if (b.st >= (R.notice ?? 0.5)) {
        b.st = 0;
        if (b.talker && !C.rt) b.state = 'approach';
        else {
          b.state = 'chase';
          engage(s, C, b, io);
        }
      }
      break;
    }
    case 'approach': {
      // coming up to have a word with you (while you are fighting something else, they hang back and watch)
      look(b, ux, uy);
      if (lost(s, b, d, dt)) {
        calmDown(b);
        break;
      }
      if (C.on || s.rtFight) {
        b.moving = false;
        break;
      }
      if (d <= R.talk) {
        parley(s, C, b);
        break;
      }
      const [gx, gy] = route(s, C, b, d, ux, uy);
      b.moving = beastStep(s, b, gx, gy, Math.min(d - R.talk * 0.9, (R.walk || 40) * 2.6 * paceOf(b) * dt)) > 0.01;
      break;
    }
    case 'talk':
    case 'yield': {
      // waiting on what you will do (or, on its knees, on what you will do with it)
      b.moving = false;
      look(b, ux, uy);
      break;
    }
    case 'chase':
      chase(s, C, b, dt, io, d, ux, uy);
      break;
    case 'windup': {
      if (b.st < b.wind) break;
      const M = BEAST_MOVES[b.move];
      if (M.shape === 'fan') {
        // the blow lands: a short lunge into it, and whoever is in the fan is caught
        beastStep(s, b, b.aim[0], b.aim[1], M.lunge || 0);
        C.fx.push({ kind: M.fx || 'bite', x: b.x, y: b.y, dir: b.aim, reach: M.reach, arc: M.arc, t0: C.t, dur: 0.3, foe: true });
        spent(b, M);
        if (inFan(b.x, b.y, b.aim, M.reach + PLAYER_R, M.arc, w.x, w.y)) hurtMe(s, C, b, M.mult, io, [b.aim[0], b.aim[1], 16], M);
      } else if (M.shape === 'leap') {
        Object.assign(b, { state: 'leap', st: 0, went: 0, hit: false, from: [b.x, b.y] });
      } else {
        // loosed: it flies on its own now
        shoot(C, { kind: M.fx, foe: true, by: b, move: M, x: b.x + b.aim[0] * 12, y: b.y + b.aim[1] * 12, ux: b.aim[0], uy: b.aim[1], speed: M.speed, left: M.range, r: M.width / 2, mult: M.mult });
        spent(b, M);
      }
      break;
    }
    case 'leap': {
      const M = BEAST_MOVES[b.move];
      const want = Math.min(M.speed * dt, b.len - b.went);
      const x0 = b.x;
      const y0 = b.y;
      const went = slide(s, b, b.aim[0], b.aim[1], want, R.body * 0.65);
      b.went += went;
      b.moving = true;
      if (!b.hit && segDist(x0, y0, b.x, b.y, w.x, w.y) <= R.body + PLAYER_R) {
        b.hit = true;
        hurtMe(s, C, b, M.mult, io, [b.aim[0], b.aim[1], 34], M);
      }
      if (b.state === 'leap' && (b.went >= b.len - 0.5 || went < want * 0.3)) {
        spent(b, M);
        b.moving = false;
        C.fx.push({ kind: 'land', x: b.x, y: b.y, t0: C.t, dur: 0.45 });
      }
      break;
    }
    case 'recover': {
      // spent: open to you for a moment
      b.moving = false;
      if (b.st >= b.rec) {
        const M = BEAST_MOVES[b.last];
        // its turn is over: it falls back and lets another of the pack go
        if (b.token) {
          b.token = false;
          b.rest = 0.5 + b.rng() * 0.8;
        }
        if (M?.shape === 'fan' && b.rng() < (R.hop ?? 0)) {
          b.state = 'hop';
          b.hopDir = [-ux, -uy];
        } else b.state = 'chase';
        b.st = 0;
        b.last = null;
      }
      break;
    }
    case 'hop': {
      // a quick spring back out of your reach, still facing you
      b.moving = beastStep(s, b, b.hopDir[0], b.hopDir[1], 300 * dt) > 0.01;
      look(b, ux, uy);
      if (b.st >= 0.26) {
        b.state = 'chase';
        b.st = 0;
        b.strafe = b.rng() < 0.5 ? 1 : -1;
      }
      break;
    }
    case 'howl': {
      b.moving = false;
      if (b.st >= 0.9) {
        b.enraged = true;
        b.state = 'chase';
        b.st = 0;
      }
      break;
    }
    case 'return': {
      const hx = b.home[0] - b.x;
      const hy = b.home[1] - b.y;
      const hd = Math.hypot(hx, hy);
      if (b.maxHp) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.08 * dt);
      if (b.calm > 0) b.calm -= dt;
      if (b.phantom) {
        b.state = 'vanish';
        b.st = 0;
        break;
      }
      if (hd < (b.def.r ?? 120) * 0.5 || (b.st > 12 && !b.moving)) {
        Object.assign(b, { state: homeState(b), st: 0, wait: 1, tx: b.x, ty: b.y, moving: false });
        break;
      }
      b.moving = beastStep(s, b, hx / hd, hy / hd, Math.min(hd, (R.walk || 40) * 2.2 * dt)) > 0.01;
      // seeing you again on its way home, once its temper has cooled
      if (b.calm <= 0 && d < sightOf(s, b) * 0.8 && !refuge(s, w.x, w.y)) {
        b.state = 'notice';
        b.st = 0;
      }
      break;
    }
    case 'flee': {
      b.moving = beastStep(s, b, -ux, -uy, R.speed * 1.1 * dt) > 0.01;
      if (!b.moving) b.moving = beastStep(s, b, -uy * b.strafe, ux * b.strafe, R.speed * dt) > 0.01;
      if (b.st > 1.6) b.fade = Math.min(1, b.fade + dt * 1.5);
      if (b.fade >= 1) {
        // gone for the day
        away(s, b.def.id, 1);
        b.stay = false;
        b.state = 'gone';
      }
      break;
    }
    case 'leave': {
      b.moving = beastStep(s, b, -ux, -uy, (R.walk || 40) * 1.6 * dt) > 0.01;
      if (b.st > 1.2) b.fade = Math.min(1, b.fade + dt * 1.2);
      if (b.fade >= 1) {
        b.stay = false;
        b.state = 'gone';
      }
      break;
    }
    case 'dead': {
      b.moving = false;
      if (b.st > 0.9) b.fade = Math.min(1, b.fade + dt * 1.2);
      if (b.fade >= 1) {
        b.stay = false;
        b.state = b.phantom ? 'vanished' : 'gone';
      }
      break;
    }
    case 'vanish': {
      b.moving = false;
      b.fade = Math.min(1, b.fade + dt * 1.8);
      if (b.fade >= 1) b.state = 'vanished';
      break;
    }
    default:
      break;
  }
}

/** It has seen you (and its group with it) — or, far too strong for it, it runs; or, lying in wait, it strikes. */
function spotted(s, C, b, io, d, ux, uy) {
  const group = groupOf(s, C, b).filter((x) => alive(x) && present(s, x));
  if (!b.phantom && power(s) >= (b.def.power ?? 20) * FAR_STRONGER) {
    for (const x of group) Object.assign(x, { state: 'flee', st: 0, moving: false, aggro: false });
    const sc = b.R.scared;
    io.feed('good', Array.isArray(sc) ? sc[group.length > 1 ? 1 : 0] : sc || `${b.name}看了你一眼，夾著尾巴跑了。`);
    return;
  }
  if (b.R.ambush) {
    // it was waiting for you: it strikes before you know it is there
    b.state = 'chase';
    engage(s, C, b, io);
    const move = (b.R.moves || [])[0];
    if (move) windup(b, move, ux, uy, d, 0.75);
    return;
  }
  for (const x of group) {
    if (x.state !== 'idle' && x.state !== 'hide' && x.state !== 'return') continue;
    // the rest of them look up a moment later
    Object.assign(x, { state: 'notice', st: x === b ? 0 : -x.rng() * 0.3, moving: false });
    look(x, s.world.x - x.x, s.world.y - x.y);
  }
}

/** After you: closing in, waiting its turn, striking. */
function chase(s, C, b, dt, io, d, ux, uy) {
  const R = b.R;
  look(b, ux, uy);
  if (lost(s, b, d, dt)) {
    calmDown(b);
    return;
  }
  if (b.pause > 0) {
    // a moment before it sees what you are about
    b.pause -= dt;
    b.moving = false;
    return;
  }
  if (R.howl && !b.howled && b.hp <= b.maxHp * R.howl) {
    Object.assign(b, { howled: true, state: 'howl', st: 0, moving: false });
    io.feed('bad', `${b.name}仰天長嚎，眼睛紅了！`);
    C.fx.push({ kind: 'howl', x: b.x, y: b.y, t0: C.t, dur: 0.9 });
    return;
  }
  if (b.rest > 0) b.rest -= dt;
  // in a group, only so many go at you at once: the rest circle, waiting their turn
  if (R.tokens && !b.token && b.rest <= 0 && turnFree(s, C, b)) b.token = true;
  const may = !R.tokens || b.token;
  const move = may ? pickMove(s, C, b, d, ux, uy, dt) : null;
  if (move) {
    windup(b, move, ux, uy, d);
    return;
  }
  const [near, far] = standOff(b, may);
  if (d > far) {
    const pace = b.speed * paceOf(b) * (b.enraged ? 1.15 : 1);
    const [gx, gy] = route(s, C, b, d, ux, uy);
    b.moving = beastStep(s, b, gx, gy, Math.min(d - far + 1, pace * dt)) > 0.01;
  } else if (d < near) {
    // too close for how it fights: it backs off, still facing you
    b.moving = beastStep(s, b, -ux, -uy, b.speed * 0.7 * dt) > 0.01;
    if (!b.moving) b.moving = beastStep(s, b, -uy * b.strafe, ux * b.strafe, 60 * dt) > 0.01;
    look(b, ux, uy);
  } else {
    // where it wants to be: it edges round you
    b.moving = beastStep(s, b, -uy * b.strafe, ux * b.strafe, (may ? 46 : 64) * dt) > 0.01;
    if (!b.moving) b.strafe = -b.strafe;
    look(b, ux, uy);
  }
}

/** Is there a turn free in its group (fewer than its tokens of them at you)? */
function turnFree(s, C, b) {
  let n = 0;
  for (const x of groupOf(s, C, b)) if (x !== b && x.token && hunting(x)) n++;
  return n < b.R.tokens;
}

/** How far off it wants to be: on you (its shortest reach), at its ring while it waits, or at its distance if it fights from afar. */
function standOff(b, may) {
  const R = b.R;
  if (R.keep) return R.keep;
  if (!may) return [R.ring - 14, R.ring + 14];
  let reach = Infinity;
  for (const id of R.moves || []) if (BEAST_MOVES[id].shape === 'fan') reach = Math.min(reach, BEAST_MOVES[id].reach);
  return [0, reach < Infinity ? reach - 12 : 30];
}

/** What it can do from where it stands, if anything (its moves, tried in order). */
function pickMove(s, C, b, d, ux, uy, dt) {
  const w = s.world;
  for (const id of b.R.moves || []) {
    const M = BEAST_MOVES[id];
    if ((b.cds[id] || 0) > 0) continue;
    if (M.shape === 'fan') {
      if (d <= M.reach + PLAYER_R * 0.4) return id;
    } else if (M.shape === 'leap') {
      if (d >= M.min && d <= M.max && b.rng() < dt * 2.4 && clearPath(s, b, ux, uy, d)) return id;
    } else if (d >= M.min && d <= M.max && b.rng() < dt * 2 && clearShot(b.x, b.y, w.x, w.y)) return id;
  }
  return null;
}

/** Ambling about its own ground. */
function wander(s, b, dt) {
  if (b.wait > 0) {
    b.wait -= dt;
    b.moving = false;
    return;
  }
  const dx = b.tx - b.x;
  const dy = b.ty - b.y;
  const d = Math.hypot(dx, dy);
  if (d < 4 || !b.R.walk) {
    const a = b.rng() * Math.PI * 2;
    const r = Math.sqrt(b.rng()) * (b.def.r ?? 120);
    b.tx = b.home[0] + Math.cos(a) * r;
    b.ty = b.home[1] + Math.sin(a) * r;
    b.wait = 1.5 + b.rng() * 3.5;
    b.moving = false;
    return;
  }
  b.moving = beastStep(s, b, dx / d, dy / d, Math.min(d, b.R.walk * dt)) > 0.01;
  if (!b.moving) {
    b.tx = b.x;
    b.ty = b.y;
  }
}

/** It gathers itself for a move (quick: a share of the usual time, for one that was lying in wait). */
function windup(b, move, ux, uy, d, quick = 1) {
  const M = BEAST_MOVES[move];
  Object.assign(b, { state: 'windup', st: 0, move, moving: false, aim: [ux, uy] });
  look(b, ux, uy);
  b.wind = M.windup * (b.enraged ? 0.82 : 1) * quick;
  b.from = [b.x, b.y];
  if (M.shape === 'leap') b.len = Math.min(M.max + M.overshoot, d + M.overshoot);
  else if (M.shape === 'shot') b.len = M.range;
}

/** Its move is spent: open to you for a moment, and the move must wait to come again. */
function spent(b, M) {
  b.cds[b.move] = M.cd;
  b.state = 'recover';
  b.st = 0;
  b.rec = M.recover;
  b.last = b.move;
}

/**
 * Which way to run at you: straight, if nothing is in between; else along a
 * way round (worked out again every little while, as you move).
 */
function route(s, C, b, d, ux, uy) {
  const w = s.world;
  if (clearPath(s, b, ux, uy, d)) {
    b.path = null;
    b.noWay = false;
    return [ux, uy];
  }
  if (!b.path || C.t - b.pathT > 0.6) {
    b.path = findPath(s, b.x, b.y, w.x, w.y);
    b.pathT = C.t;
    b.noWay = !b.path;
  }
  while (b.path?.length && Math.hypot(b.path[0][0] - b.x, b.path[0][1] - b.y) < 10) b.path.shift();
  if (!b.path?.length) return [ux, uy];
  const dx = b.path[0][0] - b.x;
  const dy = b.path[0][1] - b.y;
  const n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
}

/** Has it lost you: too far for too long, out of its reach, or too far from home? */
function lost(s, b, d, dt) {
  const R = b.R;
  const away = d > R.lose * cover(s) || b.noWay || (!b.phantom && refuge(s, s.world.x, s.world.y));
  b.lostT = away ? b.lostT + dt : 0;
  const strayed = !b.phantom && Math.hypot(b.x - b.home[0], b.y - b.home[1]) > (R.leash ?? 900);
  return b.lostT > (R.loseT ?? 1.4) || strayed;
}

// ── what you do ──

function heroTick(s, C, dt, io) {
  const me = C.me;
  const w = s.world;
  for (const k of Object.keys(me.cds)) me.cds[k] = Math.max(0, me.cds[k] - dt);
  me.inv = Math.max(0, me.inv - dt);
  if (me.shieldT > 0) {
    me.shieldT -= dt;
    if (me.shieldT <= 0) {
      me.shield = 0;
      me.shieldT = 0;
    }
  }
  // venom in you: it eats at you a while (it will not finish you, but it leaves you little)
  if (me.poison) {
    const P = me.poison;
    P.left -= dt;
    P.tick -= dt;
    if (P.tick <= 0) {
      P.tick = 0.5;
      const dmg = Math.min(me.hp - 1, Math.max(1, Math.round(P.dps * 0.5)));
      if (dmg > 0) {
        me.hp -= dmg;
        me.hurtT = C.t;
        pop(C, w.x, w.y, String(dmg), 'poison', 40);
      }
    }
    if (P.left <= 0) me.poison = null;
  }
  // 靈力 comes back slowly in a fight, quickly out of one; blood only once it is over
  me.mp = Math.min(me.maxMp, me.mp + me.maxMp * (C.on ? 0.03 : 0.1) * dt);
  if (!C.on && C.t - me.hurtT > 3 && me.hp < me.cap) me.hp = Math.min(me.cap, me.hp + me.cap * 0.05 * dt);
  let moved = 0;
  if (me.dash) {
    const D = me.dash;
    const want = Math.min((DASH.dist / DASH.time) * dt, DASH.dist - D.went);
    const went = slide(s, w, D.ux, D.uy, want, PLAYER_R);
    D.went += went;
    D.t += dt;
    moved += went;
    me.trail.push({ x: w.x, y: w.y, t0: C.t });
    if (D.t >= DASH.time || D.went >= DASH.dist - 0.5 || went < want * 0.2) me.dash = null;
  } else if (me.kb) {
    const want = Math.min(me.kb.left, 280 * dt);
    const went = slide(s, w, me.kb.ux, me.kb.uy, want, PLAYER_R);
    me.kb.left -= want;
    moved += went;
    if (me.kb.left <= 0.5 || went < want * 0.3) me.kb = null;
  }
  if (me.trail.length) me.trail = me.trail.filter((p) => C.t - p.t0 < 0.3);
  if (me.act) {
    const a = me.act;
    a.t += dt;
    if (!a.done && a.t >= a.at) {
      a.done = true;
      release(s, C, a, io);
      if (s.pending || s.dead) return moved;
    }
    if (a.t >= a.dur) me.act = null;
  }
  if (me.auto) keepStriking(s, C);
  return moved;
}

function faceTo(s, me, ux, uy) {
  me.dir = [ux, uy];
  if (Math.abs(ux) > 0.15) s.world.face = ux < 0 ? -1 : 1;
}

function targetOf(s, C) {
  const id = C.me.target;
  return id ? beastsOf(s, C).find((b) => b.uid === id && seen(b) && present(s, b)) || null : null;
}

/** Walk up to whoever you went for, and strike whenever they are in reach. */
function keepStriking(s, C) {
  const me = C.me;
  const w = s.world;
  const b = targetOf(s, C);
  if (!b) {
    me.auto = false;
    me.steer = null;
    return;
  }
  const S = strikeOf(s);
  const dx = b.x - w.x;
  const dy = b.y - w.y;
  const d = Math.hypot(dx, dy) || 1;
  const reach = S.aim === 'melee' ? S.reach + b.R.body * 0.5 : S.range * 0.92;
  if (d > 650) {
    me.auto = false;
    me.steer = null;
    return;
  }
  if (d <= reach) {
    me.steer = null;
    if (!me.act && !me.dash && !(me.cds.strike > 0)) startStrike(s, C, dx / d, dy / d);
    return;
  }
  // straight up to it — unless something is in between (then it is for you to find a way)
  for (let k = 14; k < d - reach; k += 14) {
    if (collides(s, w.x + (dx / d) * k, w.y + (dy / d) * k, PLAYER_R * 0.8)) {
      me.auto = false;
      me.steer = null;
      return;
    }
  }
  me.steer = [dx / d, dy / d];
}

function startStrike(s, C, ux, uy) {
  const me = C.me;
  const S = strikeOf(s);
  me.act = { kind: 'strike', id: 'strike', t: 0, at: S.windup, dur: Math.max(S.windup + 0.14, S.every * 0.7), ux, uy, done: false };
  me.cds.strike = S.every;
  faceTo(s, me, ux, uy);
}

/** The moment a swing lands or a spell leaves your hand. */
function release(s, C, a, io) {
  const me = C.me;
  const w = s.world;
  if (a.kind === 'strike') {
    const S = strikeOf(s);
    if (S.aim === 'melee') {
      C.fx.push({ kind: S.fx, x: w.x, y: w.y, dir: [a.ux, a.uy], reach: S.reach, arc: S.arc, t0: C.t, dur: 0.24 });
      for (const b of beastsOf(s, C)) {
        if (alive(b) && present(s, b) && inFan(w.x, w.y, [a.ux, a.uy], S.reach + b.R.body, S.arc, b.x, b.y)) hurtBeast(s, C, b, me.atk * S.mult, io);
        if (s.pending || s.dead) return;
      }
    } else {
      shoot(C, { kind: 'arrow', x: w.x + a.ux * 10, y: w.y + a.uy * 10, ux: a.ux, uy: a.uy, speed: S.speed, left: S.range, r: S.width / 2, dmg: me.atk * S.mult });
    }
    return;
  }
  const k = a.k;
  if (k.aim === 'line') {
    shoot(C, { kind: k.fx, x: w.x + a.ux * 12, y: w.y + a.uy * 12, ux: a.ux, uy: a.uy, speed: k.speed, left: k.range, r: k.width / 2, dmg: me.atk * k.mult, pierce: !!k.pierce, hurt: 'spirit' });
  } else if (k.aim === 'ground') {
    const dx = a.pt[0] - w.x;
    const dy = a.pt[1] - w.y;
    const d = Math.max(20, Math.hypot(dx, dy));
    shoot(C, { kind: 'fire', x: w.x + (dx / d) * 10, y: w.y + (dy / d) * 10, ux: dx / d, uy: dy / d, speed: k.speed, left: d - 10, r: 10, dmg: me.atk * k.mult, radius: k.radius, burn: k.burn ? me.atk * 0.22 : 0, burnT: k.burn || 0, boom: true, hurt: 'fire' });
  } else if (k.aim === 'self') {
    me.shield = Math.round(me.maxHp * k.shield);
    me.shieldT = k.last;
    C.fx.push({ kind: 'shield', x: w.x, y: w.y, t0: C.t, dur: 0.6 });
  }
}

function shoot(C, sh) {
  sh.t0 = C.t;
  sh.went = 0;
  sh.hit = new Set();
  sh.done = false;
  C.shots.push(sh);
}

function flyShots(s, C, dt, io) {
  if (!C.shots.length) return;
  const w = s.world;
  const list = beastsOf(s, C);
  for (const sh of C.shots) {
    if (sh.done) continue;
    const step = Math.min(sh.speed * dt, Math.max(0, sh.left - sh.went));
    const n = Math.max(1, Math.ceil(step / 8));
    for (let k = 0; k < n && !sh.done; k++) {
      sh.x += (sh.ux * step) / n;
      sh.y += (sh.uy * step) / n;
      sh.went += step / n;
      // into rock, a cliff, a wall
      if (stopsShot(sh.x, sh.y)) {
        burst(s, C, sh, io);
        break;
      }
      if (sh.foe) {
        // theirs, at you: step out of its way, and it flies on past
        if (sh.missed || !C.on || Math.hypot(w.x - sh.x, w.y - sh.y) > sh.r + PLAYER_R) continue;
        const took = hurtMe(s, C, sh.by, sh.mult, io, [sh.ux, sh.uy, 12], sh.move);
        if (took < 0) sh.missed = true;
        else {
          sh.done = true;
          C.fx.push({ kind: 'spark', x: sh.x, y: sh.y, t0: C.t, dur: 0.25, of: sh.kind });
        }
        if (s.pending || s.dead) return;
        continue;
      }
      for (const b of list) {
        if (sh.done || !alive(b) || !present(s, b) || sh.hit.has(b.uid)) continue;
        if (Math.hypot(b.x - sh.x, b.y - sh.y) > sh.r + b.R.body) continue;
        if (sh.boom) {
          burst(s, C, sh, io);
          break;
        }
        sh.hit.add(b.uid);
        hurtBeast(s, C, b, sh.dmg, io, { kind: sh.hurt || 'phys' });
        if (s.pending || s.dead) return;
        C.fx.push({ kind: 'spark', x: sh.x, y: sh.y, t0: C.t, dur: 0.25, of: sh.kind });
        if (!sh.pierce) sh.done = true;
      }
      if (s.pending || s.dead) return;
    }
    if (!sh.done && sh.went >= sh.left - 0.01) {
      if (sh.boom) burst(s, C, sh, io);
      else sh.done = true;
    }
    if (s.pending || s.dead) return;
  }
  C.shots = C.shots.filter((x) => !x.done);
}

/** A shot comes to its end: a fireball bursts over everyone near; anything else just stops. */
function burst(s, C, sh, io) {
  sh.done = true;
  if (!sh.boom) {
    C.fx.push({ kind: 'spark', x: sh.x, y: sh.y, t0: C.t, dur: 0.25, of: sh.kind });
    return;
  }
  C.fx.push({ kind: 'boom', x: sh.x, y: sh.y, r: sh.radius, t0: C.t, dur: 0.6 });
  for (const b of beastsOf(s, C)) {
    if (!alive(b) || !present(s, b) || Math.hypot(b.x - sh.x, b.y - sh.y) > sh.radius + b.R.body) continue;
    hurtBeast(s, C, b, sh.dmg, io, { kind: 'fire' });
    if (s.pending || s.dead) return;
    if (sh.burn && alive(b)) b.burn = { left: sh.burnT, tick: 0.5, dps: sh.burn };
  }
}

// ── commands (from the buttons, keys, taps) ──

/** A word for the feed — not again and again while a button is held down. */
function say(C, kind, text) {
  if (C.t - (C.told[text] ?? -9) < 1.5) return;
  C.told[text] = C.t;
  C.notes.push({ kind, text });
}

function free(s) {
  return !(s.pending || s.dead || s.secl);
}

/** Who a blow or a spell should go for: near the aim, or whoever you are after, or the nearest. */
function pickTarget(s, C, aim = null, range = 320) {
  const w = s.world;
  const live = beastsInWorld(s, 900).filter((b) => seen(b));
  if (aim) {
    let best = null;
    let bd = 90;
    for (const b of live) {
      const d = Math.hypot(b.x - aim[0], b.y - aim[1]);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (best) return best;
  }
  const cur = targetOf(s, C);
  if (cur && Math.hypot(cur.x - w.x, cur.y - w.y) < range * 1.3) return cur;
  let best = null;
  let bd = range;
  for (const b of live) {
    const d = Math.hypot(b.x - w.x, b.y - w.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

/**
 * 普攻. With someone near, you go for them (walking up if you must) and keep
 * striking while you hold it, or until you move off; with no one, a swing at
 * the air in front of you. aim: a point of the ground (the mouse), if any.
 */
export function attackCmd(s, aim = null, hold = true) {
  if (!free(s)) return false;
  const C = combatOf(s);
  const me = hero(s, C);
  const w = s.world;
  const b = pickTarget(s, C, aim);
  me.hold = hold;
  if (b) {
    me.target = b.uid;
    me.auto = true;
    me.press = 0.5;
    keepStriking(s, C);
    return true;
  }
  if (me.act || me.dash || me.cds.strike > 0) return false;
  let [ux, uy] = me.dir;
  if (aim) {
    const d = Math.hypot(aim[0] - w.x, aim[1] - w.y);
    if (d > 1) [ux, uy] = [(aim[0] - w.x) / d, (aim[1] - w.y) / d];
  }
  startStrike(s, C, ux, uy);
  return true;
}

/** Let go of the attack button: carry on only if you were not steering. */
export function attackRelease(s) {
  const me = combatOf(s).me;
  if (me) me.hold = false;
}

/** A tap on a beast: go for it. */
export function strikeAt(s, uid) {
  if (!free(s)) return false;
  const C = combatOf(s);
  const me = hero(s, C);
  const b = beastsOf(s, C).find((x) => x.uid === uid && seen(x));
  if (!b) return false;
  me.target = b.uid;
  me.auto = true;
  me.hold = false;
  me.press = 0.6;
  keepStriking(s, C);
  return true;
}

/** Stop going for anyone (you walked off somewhere). */
export function stopStriking(s) {
  const me = combatOf(s).me;
  if (me) Object.assign(me, { auto: false, hold: false, press: 0, steer: null });
}

/** Where a spell aimed for you goes: at whoever you are after (a little ahead of them, if they are moving), else straight ahead. */
export function autoAim(s, k) {
  const C = combatOf(s);
  const me = hero(s, C);
  const w = s.world;
  const range = k.range || 140;
  const b = pickTarget(s, C, null, range * 1.4);
  if (!b) return [w.x + me.dir[0] * range, w.y + me.dir[1] * range];
  const d = Math.hypot(b.x - w.x, b.y - w.y);
  const lead = k.speed ? (d / k.speed) * 0.8 : 0;
  return [b.x + b.vx * lead, b.y + b.vy * lead];
}

/** Cast one of your three. aim: a point of the ground, or null to let it find its mark. */
export function castCmd(s, id, aim = null) {
  if (!free(s)) return false;
  const C = combatOf(s);
  const me = hero(s, C);
  const w = s.world;
  const k = kitOf(s).find((x) => x.id === id);
  if (!k) return false;
  if (k.locked) {
    say(C, 'sys', `${k.name}：${k.locked}`);
    return false;
  }
  if (me.dash || (me.cds[id] || 0) > 0) return false;
  if (me.mp < k.mp) {
    say(C, 'bad', '靈力不足。');
    return false;
  }
  if (me.act?.kind === 'cast' && !me.act.done) return false;
  const pt = aim || autoAim(s, k);
  let [ux, uy] = me.dir;
  const dx = pt[0] - w.x;
  const dy = pt[1] - w.y;
  const d = Math.hypot(dx, dy);
  if (d > 1) [ux, uy] = [dx / d, dy / d];
  const reach = Math.min(d, k.range || 0);
  if (aim || k.aim !== 'self') {
    const t = pickTarget(s, C, pt, k.range || 300);
    if (t) me.target = t.uid;
  }
  me.mp -= k.mp;
  me.cds[id] = k.cd;
  faceTo(s, me, ux, uy);
  me.act = { kind: 'cast', id, k, t: 0, at: k.cast, dur: k.cast + 0.16, ux, uy, pt: [w.x + ux * reach, w.y + uy * reach], done: false };
  return true;
}

/** Step aside: a quick dash (where you are steering, else where you face), untouchable while it lasts. */
export function dashCmd(s, dir = null) {
  if (!free(s)) return false;
  const C = combatOf(s);
  const me = hero(s, C);
  if (me.dash || (me.cds.dash || 0) > 0) return false;
  let [ux, uy] = dir && (dir[0] || dir[1]) ? dir : me.dir;
  const n = Math.hypot(ux, uy) || 1;
  ux /= n;
  uy /= n;
  me.dash = { ux, uy, t: 0, went: 0 };
  me.inv = DASH.inv;
  me.cds.dash = dashCd(s);
  me.kb = null;
  // a dash cuts off what you were only starting
  if (me.act && !me.act.done) me.act = null;
  Object.assign(me, { auto: false, hold: false, press: 0, steer: null });
  faceTo(s, me, ux, uy);
  C.fx.push({ kind: 'dash', x: s.world.x, y: s.world.y, dir: [ux, uy], t0: C.t, dur: 0.35 });
  return true;
}

/** What you are aiming, for the picture (the UI sets it while you drag a button or move the mouse). */
export function setPreview(s, p) {
  combatOf(s).preview = p;
}

// ── 戰鬥試煉: the system conjures a beast for you to practise on ──

/**
 * A phantom demon wolf, as strong as you, a little way off. It cannot hurt you
 * for real, and leaves nothing behind; the system lends you its three moves
 * (and 靈力, if you have none yet) for as long as it lasts.
 */
export function startTrial(s) {
  if (!free(s)) return false;
  const C = combatOf(s);
  if (C.on || C.trial) return false;
  const w = s.world;
  const me = hero(s, C);
  const a0 = Math.atan2(me.dir[1], me.dir[0]);
  let spot = null;
  for (let k = 0; k < 16 && !spot; k++) {
    const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
    const x = w.x + Math.cos(a) * 190;
    const y = w.y + Math.sin(a) * 190;
    let clear = isReachable(x, y) && !collides(s, x, y, 16);
    for (let r = 14; clear && r < 190; r += 14) if (collides(s, w.x + Math.cos(a) * r, w.y + Math.sin(a) * r, 12)) clear = false;
    if (clear) spot = [x, y];
  }
  if (!spot) {
    C.notes.push({ kind: 'sys', text: '這裡太窄，施展不開。換個空曠的地方吧。' });
    return false;
  }
  C.trial = { lend: 30 };
  hero(s, C);
  me.hp = me.cap;
  me.mp = me.maxMp;
  me.cds = {};
  me.poison = null;
  const def = { id: `trial_${++C.uid}`, kind: 'demon_wolf', name: '幻影妖狼', x: spot[0], y: spot[1], r: 100, power: Math.max(4, Math.round(me.P)), tier: s.player.realm, phantom: true, rt: { lose: 560 } };
  const b = spawn(s, def);
  b.state = 'notice';
  look(b, w.x - b.x, w.y - b.y);
  beastsOf(s, C).push(b);
  C.notes.push({ kind: 'sys', text: '叮——戰鬥試煉。系統在你面前幻化出一頭妖狼。' });
  if (!s.player.realm) C.notes.push({ kind: 'sys', text: '系統暫借你三十點靈力，和三門法術。' });
  return true;
}

function endTrial(s, C, io, how) {
  C.trial = null;
  for (const b of beastsOf(s, C)) if (b.phantom && b.state !== 'dead') {
    b.state = 'vanish';
    b.st = 0;
  }
  const me = hero(s, C);
  Object.assign(me, { hp: me.cap, mp: me.maxMp, shield: 0, shieldT: 0, poison: null });
  io.feed('sys', { won: '叮——試煉完成。系統：「不錯。」', escaped: '叮——你甩掉了幻影。系統：「逃得掉，也是本事。」', fell: '叮——試煉失敗。好在只是幻影，你毫髮無傷。' }[how]);
}
