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

import { collides, speedAt, terrainAt, regionAt, isReachable, findPath, nearestOpen, world, PLAYER_R } from './terrain.js';
import { T } from './geo.js';
import { BEASTS } from './places.js';
import { NODES, nodeQi } from './map.js';
import { npcRealm } from './npcs.js';
import { FOES } from '../content/foes.js';
import { EVENTS } from '../content/index.js';
import { MOVES, STRIKES, DASH, PILLS, PILL_CD, BEAST_MOVES, KIT_ORDER, TRIAL_KIT } from '../content/moves.js';
import { TALISMANS } from '../content/arts.js';
import { TECHS } from '../content/techniques.js';
import { ITEMS } from '../content/items.js';
import { power } from '../core/cultivation.js';
import { pools, gearOf } from '../core/body.js';
import { applyEffects, addItem } from '../core/effects.js';
import { notice, startEvent, choose, fightChoice, endRealFight, resolve } from '../core/events.js';
import { newReport, spendHours } from '../core/time.js';
import { rand } from '../core/rng.js';
import { weatherNow, moonTonight } from './weather.js';
import { onBeaten, banditsHostile } from './factions.js';

/** Blood a wound holds back: 輕傷 leaves you three quarters of it, and so on. */
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
/** Those at your side are about this share of what the fight asks… */
const ALLY_SHARE = 0.55;
/** …and with them there, those against you are made this much stronger for each (as the square root of how many). */
const ALLY_LIFT = 0.45;
/** Far stronger than a beast, and it runs. */
const FAR_STRONGER = 2.2;
/** A boss is a fight of its own: this much more blood than another of its strength (by simulation). */
let BOSS_HP = 2;
/** For tuning by simulation. */
export function tune(k, v) {
  if (k === 'BOSS_HP') BOSS_HP = v;
}
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
const HUNTING = new Set(['chase', 'windup', 'leap', 'recover', 'hop', 'howl', 'roar', 'stun']);
/**
 * Out of the fight: dead and fading, gone until it comes back, running off,
 * on its knees, on its way (the matter settled).
 */
const DOWN = new Set(['dead', 'gone', 'vanish', 'flee', 'yield', 'leave', 'down']);

const FALL_TEXT = {
  demon_wolf: '妖狼把你撲倒在地。牠的牙擦過你的喉嚨，眼前一黑——\n\n醒來時，天色已經變了。那頭狼不見了，大概是嫌你不好吃。你身上多了好幾道血口。',
  fire_tiger: '赤炎妖虎把你撲倒在地，一股熱浪燎得你睜不開眼——\n\n醒來時，你躺在焦土邊上，衣衫燒得破破爛爛，渾身是傷。那頭大虎早已不見蹤影。',
  beast: '你倒下了，眼前一黑——\n\n醒來時，天色已經變了。四下無人，只剩一身的傷。',
};

// ── the fight's own state (never saved: a fight does not outlast closing the game) ──

const LIVE = new WeakMap();

export function combatOf(s) {
  let C = LIVE.get(s);
  if (!C) {
    C = {
      on: false, t: 0, me: null, beasts: null, shots: [], fx: [], pops: [], pools: [], preview: null, notes: [], signals: [],
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

/**
 * You in a fight: cooldowns, what you are doing, what is on you. Your blood
 * and 靈力 are the ones in the save (core/body.js), worked on where they are,
 * so what a fight takes you carry away from it.
 */
export function hero(s, C = combatOf(s)) {
  const p = s.player;
  const V = pools(s);
  const maxMp = Math.max(V.maxMp, C.trial?.lend || 0);
  let me = C.me;
  if (!me) {
    me = C.me = {
      cds: {}, act: null, dash: null, kb: null, inv: 0, shield: 0, shieldT: 0, poison: null, regen: null, ward: null,
      hurtT: -99, flashT: -99, target: null, auto: false, hold: false, press: 0, steer: null, dir: [1, 0], trail: [],
    };
    Object.defineProperty(me, 'hp', { get: () => p.hp, set: (v) => { p.hp = v; }, enumerable: true });
    Object.defineProperty(me, 'mp', { get: () => p.mp, set: (v) => { p.mp = v; }, enumerable: true });
  }
  // grown stronger (a breakthrough, a wound healed, 靈力 lent): the new room comes filled
  if (me.cap > 0 && V.cap > me.cap) me.hp += V.cap - me.cap;
  if (maxMp > (me.maxMp ?? maxMp)) me.mp += maxMp - me.maxMp;
  me.P = V.P;
  me.baseHp = V.baseHp;
  me.maxHp = V.maxHp;
  me.cap = V.cap;
  me.maxMp = maxMp;
  me.gear = V.G;
  me.atk = 1.5 + 0.5 * V.P;
  me.crit = 0.05 + (p.attrs.jiyuan ?? 5) * 0.008 + V.G.crit;
  me.realm = p.realm;
  if (me.hp > V.cap) me.hp = V.cap;
  if (me.mp > maxMp) me.mp = maxMp;
  return me;
}

/** Your plain blow, by what you hold. */
export function strikeOf(s) {
  const w = s.player.weapon;
  return STRIKES[w] || STRIKES[ITEMS[w]?.strike] || STRIKES.fists;
}

/** What your weapon looks like in your hand (one that borrows another's swing looks like it too). */
export function weaponLook(s) {
  const w = s.player.weapon;
  return (w && !STRIKES[w] && ITEMS[w]?.strike) || w;
}

const REALM_WORD = ['', '需引氣入體', '需築基', '需結丹'];

/** Why you cannot use a move yet, or null if you can. */
function lockOf(s, m) {
  const p = s.player;
  const realm = m.realm ?? 1;
  if (p.realm < realm) return REALM_WORD[realm] || '境界不足';
  // what a 法器 does, you can do while you wear it
  if (m.relic) return gearOf(s).relic === m.relic ? null : `需戴${ITEMS[m.relic]?.name || m.relic}`;
  const knows = (ids) => ids.some((a) => (p.arts || []).includes(a) || (p.techs || []).includes(a) || p.tech === a);
  // a move of the body comes to you at 築基, whatever else it asks
  if (m.school === '體修' && p.realm >= 2) return null;
  if (!m.learn && !m.weapon && !m.gengu) return null;
  if (m.learn && knows(m.learn)) return null;
  if (m.weapon && m.weapon.includes(p.weapon)) return null;
  if (m.gengu && (p.attrs.gengu ?? 0) >= m.gengu) return null;
  const ways = [];
  if (m.learn) ways.push(`習得${m.learn.map((a) => TECHS[a]?.name || a).join('或')}`);
  if (m.weapon) ways.push(`手持${m.weapon.map((w) => ITEMS[w]?.name || w).join('或')}`);
  if (m.gengu) ways.push(`根骨達${m.gengu}`);
  return `需${ways.join('，或')}`;
}

/** A move as you would use it: stronger if you have learned the art behind it; why it is out of reach, if it is. */
function moveOf(s, id, lend = false) {
  const p = s.player;
  const m = MOVES[id];
  const knows = (ids) => ids.some((a) => (p.arts || []).includes(a) || (p.techs || []).includes(a) || p.tech === a);
  const good = knows(m.arts || []);
  return { ...m, ...(good ? m.better : null), id, good, locked: lend ? null : lockOf(s, m) };
}

/** Every move there is, as it stands for you (for choosing your three). */
export function movesOf(s) {
  return Object.keys(MOVES).map((id) => moveOf(s, id));
}

/**
 * The three you take into a fight: those you chose (修煉 → 戰鬥招式) that you
 * can use, the rest filled the usual way; short of three, what is still out of
 * reach shows in the empty places. 戰鬥試煉 lends you its own three.
 */
export function kitOf(s) {
  const C = combatOf(s);
  if (C.trial) return TRIAL_KIT.map((id) => moveOf(s, id, true));
  const out = [];
  const take = (id) => {
    if (out.length >= 3 || out.some((k) => k.id === id) || !MOVES[id]) return;
    const k = moveOf(s, id);
    if (!k.locked) out.push(k);
  };
  for (const id of s.player.kit || []) take(id);
  for (const id of KIT_ORDER) take(id);
  for (const id of TRIAL_KIT) if (out.length < 3 && !out.some((k) => k.id === id)) out.push(moveOf(s, id));
  return out;
}

/** Choose the three you take into a fight (null: let them be chosen for you). */
export function setKit(s, ids) {
  s.player.kit = ids ? ids.filter((id) => MOVES[id]).slice(0, 3) : null;
  if (!s.player.kit?.length) delete s.player.kit;
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

/**
 * One of a group (k: which; the first is its leader, if it has one). A group
 * from a story names each of its own: kinds, who (name, realm, the person they
 * are), at (where each stands); side: 'ally' for those who fight beside you.
 */
function spawn(s, def, k = 0) {
  const kind = def.kinds?.[k] ?? (k === 0 && def.lead ? def.lead : def.kind);
  const K = FOES[kind];
  const n = def.n || 1;
  // a group stands about its ground, not on one spot
  let x = def.x;
  let y = def.y;
  if (def.at?.[k]) [x, y] = def.at[k];
  else if (n > 1) {
    const a = (k / n) * Math.PI * 2 + 0.7;
    const nx = def.x + Math.cos(a) * def.r * 0.3;
    const ny = def.y + Math.sin(a) * def.r * 0.3;
    if (!collides(s, nx, ny, 12)) [x, y] = [nx, ny];
  }
  const R = { ...K.rt, ...(def.rt || null) };
  const who = def.who?.[k] || null;
  const b = {
    uid: n > 1 ? `${def.id}:${k}` : def.id, k, def, kind, K, R, phantom: !!def.phantom, story: !!def.story, summon: !!def.summon, side: def.side || 'foe',
    // (the 黑風寨 does not stop to talk with someone who has spilled that much of its blood)
    lead: k === 0 && !!(def.lead || def.leader), talker: !!(R.talk && def.event && !def.story) && !(def.kind === 'bandit' && banditsHostile(s)), cond: (def.event && !def.story && EVENTS[def.event]?.cond) || null,
    baseName: who?.name || (k === 0 && def.name) || K.name, baseRank: who?.rank || null, baseTier: who?.tier ?? null, npcId: who?.npcId || null,
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
  if (b.phantom || b.stay || b.story || b.summon) return true;
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
const hunting = (b) => b.side !== 'ally' && b.aggro && HUNTING.has(b.state);
/** Against you (not one of those at your side). */
const foe = (b) => b.side !== 'ally';

/** The beasts near you, for drawing and for picking whom to strike (the dead fade out among them). */
export function beastsInWorld(s, radius = 1400) {
  const w = s.world;
  return beastsOf(s).filter((b) => b.state !== 'gone' && b.state !== 'vanished' && present(s, b) && Math.abs(b.x - w.x) < radius && Math.abs(b.y - w.y) < radius);
}

/** The people (by id) in a fight the story started, or still standing there after it: drawn as fighters, not where they would be. */
export function fightingPeople(s) {
  return new Set(beastsOf(s).filter((b) => b.story && b.npcId && b.state !== 'vanished').map((b) => b.npcId));
}

/** The boss you are fighting, if it is one (for the bar across the top): its blood, the marks where it changes, its rage. */
export function bossOf(s) {
  const C = combatOf(s);
  if (!C.on) return null;
  const w = s.world;
  let best = null;
  let bd = Infinity;
  for (const b of beastsOf(s, C)) {
    if (!b.K.boss || !foe(b) || !b.aggro || !b.armed || !alive(b) || !present(s, b)) continue;
    const d = Math.hypot(b.x - w.x, b.y - w.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  if (!best) return null;
  return { uid: best.uid, name: best.name, rank: rankOf(best), hp: best.hp, maxHp: best.maxHp, marks: (best.R.phases || []).map((p) => p.at), phase: best.phase, enraged: !!best.enraged, gap: best.gap };
}

/** Beasts you could go for (they show the act button: 出手). */
export function beastTargets(s) {
  return beastsInWorld(s, 700)
    .filter((b) => seen(b) && foe(b))
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
    token: false, rest: 0, pause: 0, stay: false, Dset: null, tierSet: b.baseTier, rank: b.baseRank, name: b.baseName, tgt: null,
    phase: 0, moves: null, combo: 0, zones: null, holding: false,
  });
  // a leap or a shot takes a moment to come: it does not open with one (nor with a call to others)
  b.cds = Object.fromEntries((b.R.moves || []).map((id) => [id, BEAST_MOVES[id].first ?? (BEAST_MOVES[id].shape === 'fan' ? 0 : 1.2)]));
}

/** What it can do now (a boss worn past a mark fights another way). */
function movesNow(b) {
  return b.moves || b.R.moves || [];
}

/**
 * Size a beast against you as you are now: its blood, its bite, its pace, and
 * the gap between your realms. A group shares out what a fight with all of it
 * asks of you (its leader a larger part), as the old fights did.
 */
function arm(s, C, b) {
  if (b.side === 'ally') return armAlly(b);
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
  b.maxHp = Math.max(6, Math.round(((me.atk * HITS * rel * K.hp) / shape) * (K.boss ? BOSS_HP : 1)));
  b.hp = Math.max(1, Math.round(b.maxHp * frac));
  // 境界壓制: a realm above yours bites harder, moves faster, and shrugs off most of what you do
  // (one below yours, a little the other way)
  b.dmg = ((((me.baseHp ?? me.maxHp) / BITES) * rel * K.atk) / shape) * (gap > 0 ? 1 + 0.6 * gap : Math.pow(0.85, -gap));
  // under a blood moon, everything out there has red eyes
  if (!b.story && moonTonight(s, 'bloodmoon')) b.dmg *= 1.15;
  b.speed = R.speed * (gap > 0 ? 1 + 0.08 * gap : 1);
  b.taken = gap > 0 ? Math.pow(0.45, gap) : 1 + 0.15 * -gap;
  b.armed = true;
}

/** Someone at your side: a fighter of their own strength (a share of what the fight asks), like you in the making. */
function armAlly(b) {
  const p = (b.Dset ?? b.def.power ?? 20) * ALLY_SHARE;
  const frac = b.maxHp ? Math.max(0.05, b.hp / b.maxHp) : 1;
  b.D = p;
  b.tier = tierOf(b);
  b.gap = 0;
  b.maxHp = Math.round(20 + 2.6 * p);
  b.hp = Math.max(1, Math.round(b.maxHp * frac));
  b.dmg = 1.5 + 0.5 * p;
  b.speed = b.R.speed;
  b.taken = 1;
  b.armed = true;
}

/** Trees hide you: in a wood a beast sees you later and loses you sooner. */
function cover(s) {
  const t = terrainAt(s.world.x, s.world.y);
  return t === T.DEEP ? 0.65 : t === T.FOREST ? 0.8 : 1;
}

/** How far off a beast sees you: further in its hunting hours, less when it dozes at noon (the dead walk by night). */
function sightOf(s, b) {
  // up in the air, nothing on the ground can get at you
  if (s.world?.fly) return 0;
  const R = b.R;
  const night = s.tod >= 19.5 || s.tod < 5;
  const noon = s.tod >= 10.5 && s.tod < 14.5;
  const me = combatOf(s).me;
  // 斂息: it has to come right up to you; 驅邪: the dead will not look your way
  const hush = me?.hidden > 0 ? 0.3 : 1;
  if (me?.exorcise > 0 && b.K.spirit) return 0;
  // rain and fog hide you a little; the full moon stirs the dead, a blood moon stirs everything
  const sky = Math.pow(weatherNow(s).see, 0.8) * (moonTonight(s, 'bloodmoon') ? 1.4 : b.K.spirit && moonTonight(s, 'fullmoon') ? 1.3 : 1);
  return R.sight * (night ? R.night ?? 1.2 : (noon ? R.noon ?? 1 : 1) * (R.day ?? 1)) * cover(s) * hush * sky;
}

/** Inside a town (a temple, a sect), you are out of a beast's reach. */
function refuge(s, x, y) {
  return REFUGE.has(NODES[regionAt(s, x, y)]?.kind);
}

/** Where you are now, can it get at you? Not in a town, not up in the air. */
function outOfReach(s) {
  return !!s.world.fly || refuge(s, s.world.x, s.world.y);
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
  // it will not come into a town after you (people from a story go where they please)
  if (!b.phantom && !b.story && refuge(s, b.x + ux * Math.min(len + 14, 30), b.y + uy * Math.min(len + 14, 30))) return 0;
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
function hurtBeast(s, C, b, base, io, { kind = 'phys', by = null } = {}) {
  if (!alive(b) || !foe(b)) return false;
  // it turns on whoever struck it
  if (kind !== 'burn') {
    b.tgt = by || s.world;
    b.tgtT = C.t;
  }
  // caught unaware, it takes the first blow full
  const sneak = b.state === 'idle' || b.state === 'hide';
  // going for those who came to talk (or were coming to): it comes to blows, and the story goes the way of the fight
  if (b.talker && !b.phantom && !C.rt && !s.rtFight && !provoke(s, C, b, io)) return false;
  if (!b.armed) arm(s, C, b);
  const me = C.me;
  const crit = kind !== 'burn' && rand(s) < me.crit;
  const roll = kind === 'burn' ? 1 : 0.85 + rand(s) * 0.3;
  // a thing of spirit: a blade goes through it; fire and 靈力 do not
  const spirit = b.K.spirit ? (kind === 'phys' ? 0.5 : kind === 'holy' ? 2.2 : kind === 'fox' ? 1.5 : kind === 'fire' || kind === 'burn' ? 1.3 : 1.15) : 1;
  // fire burns weaker in the rain
  const wet = (kind === 'fire' || kind === 'burn') && weatherNow(s).wet ? 0.75 : 1;
  const dmg = Math.max(1, Math.round(base * roll * (crit ? 1.6 : 1) * b.taken * spirit * wet * (sneak ? 1.5 : 1)));
  b.hp -= dmg;
  b.flashT = C.t;
  pop(C, b.x, b.y, String(dmg), crit ? 'crit' : kind === 'burn' ? 'burn' : spirit < 1 ? 'weak' : 'dmg', b.R.tall);
  if (spirit < 1 && !C.told.spirit) {
    C.told.spirit = true;
    io.feed('sys', `兵刃從${b.name}身上穿了過去，傷不了它多少——法術才管用。`);
  }
  // a spar is not to the death
  if (b.hp <= 0 && b.def.spar) b.hp = 1;
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
  if (R.phases) phaseUp(s, C, b, io);
  return true;
}

/**
 * A boss worn down past a mark (R.phases: { at: its share of blood, moves,
 * enrage, line }): it gathers itself with a roar, and comes on another way —
 * near the end, in a rage.
 */
function phaseUp(s, C, b, io) {
  const P = b.R.phases;
  let up = false;
  while (b.phase < P.length && b.hp <= b.maxHp * P[b.phase].at) {
    const ph = P[b.phase];
    b.phase += 1;
    if (ph.moves) {
      b.moves = ph.moves;
      // what it has newly come to, it comes to soon (not all at once)
      for (const id of ph.moves) if (!(id in b.cds)) b.cds[id] = BEAST_MOVES[id].first ?? 0.8;
    }
    if (ph.enrage) b.enraged = true;
    if (ph.line) io.feed('bad', ph.line);
    up = true;
  }
  if (!up) return;
  Object.assign(b, { state: 'roar', st: 0, moving: false, move: null, combo: 0, zones: null, kb: null });
  C.fx.push({ kind: 'roar', x: b.x, y: b.y, t0: C.t, dur: 0.9 });
  io.signal({ combat: 'phase', name: b.name, phase: b.phase, enraged: b.enraged });
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
  // what you wear keeps some of it off (fire, what keeps fire off)
  const G = me.gear;
  const kept = G ? (1 - G.def) * (M?.fire ? 1 - G.fire : 1) : 1;
  let dmg = Math.max(1, Math.round(b.dmg * mult * (0.85 + rand(s) * 0.3) * (b.enraged ? 1.2 : 1) * kept));
  // 金剛: braced, the body takes only part of it
  if (me.ward) dmg = Math.max(1, Math.round(dmg * (1 - me.ward.k)));
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
    if (b.def.spar) bested(s, C, io);
    else {
      me.hp = 0;
      fallen(s, C, b, io);
    }
  }
  return dmg;
}

/** A blow lands on one of those at your side: they turn on whoever struck them; enough, and they are down. */
function hurtAlly(s, C, a, b, mult, io, M = null) {
  if (!alive(a)) return;
  if (!b.armed) arm(s, C, b);
  const dmg = Math.max(1, Math.round(b.dmg * mult * (0.85 + rand(s) * 0.3) * (b.enraged ? 1.2 : 1)));
  a.hp -= dmg;
  a.flashT = C.t;
  a.tgt = b;
  a.tgtT = C.t;
  pop(C, a.x, a.y, String(dmg), 'ally', a.R.tall);
  if (M?.drain && alive(b)) b.hp = Math.min(b.maxHp, b.hp + Math.max(1, Math.round(dmg * M.drain)));
  if (a.hp > 0) return;
  a.hp = 0;
  Object.assign(a, { state: 'down', st: 0, moving: false, move: null, token: false, burn: null });
  io.feed('bad', `${a.name}倒下了！`);
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
  if (b.summon) {
    io.feed('good', `${b.name}倒下了。`);
    return;
  }
  if (!b.story) away(s, b.uid, b.def.respawn ?? 10);
  const report = newReport();
  tally(s, b, report);
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
  io.feed('good', b.def.spar ? `${b.name}收了手：「好，到此為止。」` : `${b.name}扔下了刀，跪地求饒！`);
  if (!b.def.spar) {
    const report = newReport();
    tally(s, b, report);
    for (const c of report.chips) io.feed(c.tone === 'bad' ? 'bad' : 'good', c.text);
    for (const t of report.toasts) io.feed('sys', t);
  }
  morale(s, C, b, io);
}

/** One more of its kind beaten by your hand (bounties and sect tasks count them); and what the factions make of it. */
function tally(s, b, report) {
  if (b.phantom || b.summon || b.side === 'ally') return;
  const kind = b.kind || b.def.kind;
  s.vars.kills ||= {};
  s.vars.kills[kind] = (s.vars.kills[kind] || 0) + 1;
  if (!b.story) onBeaten(s, kind, report);
}

/** Beaten in a spar: you are bested, not felled — it stops there. */
function bested(s, C, io) {
  const me = C.me;
  me.hp = 1;
  Object.assign(me, { act: null, dash: null, kb: null, auto: false, hold: false, press: 0, steer: null, target: null, poison: null, held: null });
  for (const b of beastsOf(s, C)) if (hunting(b)) Object.assign(b, { state: 'talk', st: 0, aggro: false, moving: false, move: null });
  C.shots = [];
  C.pools = [];
  C.on = false;
  C.outcome = 'fell';
  io.signal({ combat: 'spar' });
  io.feed('bad', '你輸了這一場。');
  if (!C.rt) return;
  C.rt.how = 'lost';
  C.taleAt = C.t + 1.2;
}

/** It runs for it. Beaten, if it was in the fight. */
function rout(s, C, b, io, line = null) {
  if (b.aggro) C.beaten += 1;
  Object.assign(b, { state: 'flee', st: 0, aggro: false, moving: false, move: null, burn: null, token: false });
  untarget(C, b);
  if (line) io.feed('good', line);
}

/** Knocked reeling (whatever it was gathering itself for comes to nothing); push: thrown back along (ux, uy). */
function stagger(b, secs, push = null) {
  if (!alive(b) || b.state === 'talk' || b.state === 'roar') return;
  if (push) b.kb = { ux: push[0], uy: push[1], left: push[2] * (b.K.boss ? 0.35 : 1) };
  if (!(secs > 0)) return;
  Object.assign(b, { state: 'stun', st: 0, stunT: secs * (b.K.boss ? 0.5 : 1), move: null, moving: false });
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
  Object.assign(me, { act: null, dash: null, kb: null, auto: false, hold: false, press: 0, steer: null, target: null, shield: 0, shieldT: 0, poison: null, regen: null, ward: null, held: null });
  for (const x of beastsOf(s, C)) if (hunting(x) || x.state === 'notice') calmDown(x, true);
  C.shots = [];
  C.pools = [];
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
  Object.assign(b, { state: 'return', st: 0, aggro: false, calm: 4, move: null, burn: null, enraged: false, howled: false, lostT: 0, token: false, pause: 0, phase: 0, moves: null, combo: 0, zones: null, holding: false });
  if (heal && b.maxHp) b.hp = b.maxHp;
}

function finish(s, C, io) {
  C.on = false;
  C.pools = [];
  C.me.held = null;
  // won: you beat at least one of them, and none of those you fought is still standing
  const standing = beastsOf(s, C).some((b) => C.foes.has(b.uid) && alive(b) && present(s, b));
  const won = C.beaten > 0 && !standing;
  C.outcome = won ? 'won' : 'escaped';
  Object.assign(C.me, { auto: false, hold: false, press: 0, target: null, steer: null });
  io.signal({ combat: C.outcome });
  if (C.trial) return endTrial(s, C, io, C.outcome);
  if (C.rt) {
    // a moment to see how it ended (on his knees, the rest of them running) before the story picks up
    C.rt.how = C.outcome;
    C.taleAt = C.t + 1.2;
    return;
  }
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
  if (f.story) return beginStory(s, C, io);
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

/**
 * A fight from a story (not with what roams the wild): those against you —
 * and any at your side — are there as the story says, as strong as it asked
 * (made stronger for each at your side), and it starts where you stand.
 */
function beginStory(s, C, io) {
  const f = s.rtFight;
  const spec = f.spec;
  const foes = [];
  const allies = [];
  for (const [kind, n = 1, who = null] of spec.foes) for (let i = 0; i < n; i++) foes.push({ kind, who: whoIs(s, f, kind, who) });
  for (const [kind, n = 1, who = null] of spec.allies || []) for (let i = 0; i < n; i++) allies.push({ kind, who: whoIs(s, f, kind, who) });
  const at = placeTale(s, C, io, f, foes.length, allies.length);
  const D = (f.diff || 20) * (spec.spar ? 1 : 1 + ALLY_LIFT * Math.sqrt(allies.length));
  // a leader with followers: once the first is down, the rest give up
  const leader = spec.foes.length > 1 && (spec.foes[0][1] ?? 1) === 1;
  const group = (side, list, power, extra) => ({
    id: `tale${++C.uid}${side}`, story: true, side, kind: list[0].kind, kinds: list.map((x) => x.kind), who: list.map((x) => x.who), n: list.length,
    at: at[side === 'ally' ? 'allies' : 'foes'], x: 0, y: 0, r: 140, power, ...extra,
  });
  const fdef = group('foe', foes, D, { leader, spar: !!spec.spar, rt: spec.spar ? { yield: 0.25, flee: 0 } : null });
  const made = foes.map((_, k) => spawn(s, fdef, k));
  if (allies.length) {
    const adef = group('ally', allies, f.diff || 20, {});
    made.push(...allies.map((_, k) => spawn(s, adef, k)));
  }
  for (const b of made) {
    arm(s, C, b);
    Object.assign(b, { state: 'chase', st: 0, aggro: true });
    beastsOf(s, C).push(b);
  }
  f.on = true;
  C.rt = f;
  C.tale = made;
  const lead = made[0];
  const line = spec.spar ? `${lead.name}拱了拱手：「請。」` : lead.R.cry || `${lead.name}動手了！`;
  engage(s, C, lead, io, line);
}

/** Who one in a story's fight is: the event's person ('npc'), a named person (their id), or { name }. */
function whoIs(s, f, kind, who) {
  if (!who) return null;
  const person = FOES[kind]?.rt?.person && !FOES[kind].boss;
  const n = who === 'npc' ? (f.npcId ? s.npcs[f.npcId] : null) : typeof who === 'string' ? s.npcs[who] : null;
  if (n) return { name: who === 'npc' || n.met ? n.name : n.title, rank: person ? npcRealm(n) : null, tier: person ? n.realm : null, npcId: n.id };
  return typeof who === 'object' ? { name: who.name || null } : null;
}

/**
 * Where those in a story's fight stand as it begins: in the places of the
 * people of the scene it came from (those it names as fighting), else before
 * you (close: right in front of you), spread across the open way, with those
 * at your side beside you.
 */
function placeTale(s, C, io, f, nFoes, nAllies) {
  const w = s.world;
  const me = hero(s, C);
  const sc = f.scene && io.scene ? io.scene(f.scene) : null;
  const out = { foes: [], allies: [] };
  for (const ac of sc?.actors || []) {
    const list = ac.side === 'foe' ? out.foes : ac.side === 'ally' ? out.allies : null;
    if (!list || list.length >= (ac.side === 'foe' ? nFoes : nAllies)) continue;
    list.push([ac.x, ac.y]);
    ac.fought = true;
  }
  const dist = f.spec.close ? 75 : 165;
  // the way they come from: the scene, else where you face — whichever way is open
  const a0 = sc ? Math.atan2(sc.y - w.y, sc.x - w.x) : Math.atan2(me.dir[1], me.dir[0]);
  let ux = Math.cos(a0);
  let uy = Math.sin(a0);
  for (let k = 0; k < 12; k++) {
    const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 6);
    let clear = true;
    for (let r = 20; r <= dist && clear; r += 15) if (collides(s, w.x + Math.cos(a) * r, w.y + Math.sin(a) * r, 12)) clear = false;
    if (clear) {
      [ux, uy] = [Math.cos(a), Math.sin(a)];
      break;
    }
  }
  const spot = (x, y) => (collides(s, x, y, 12) ? nearestOpen(s, x, y, 4) : null) || [x, y];
  for (let k = out.foes.length; k < nFoes; k++) {
    const side = (k - (nFoes - 1) / 2) * 46;
    out.foes.push(spot(w.x + ux * (dist + Math.abs(side) * 0.3) - uy * side, w.y + uy * (dist + Math.abs(side) * 0.3) + ux * side));
  }
  for (let k = out.allies.length; k < nAllies; k++) {
    const side = (k % 2 ? 1 : -1) * 44;
    out.allies.push(spot(w.x - ux * 18 - uy * side, w.y - uy * 18 + ux * side));
  }
  return out;
}

/** The fight the story started is over: they wait on what comes of it (and then go), and the story picks up. */
function endTale(s, C, how) {
  const f = C.rt;
  C.rt = null;
  const tale = C.tale || [];
  C.tale = null;
  for (const b of beastsOf(s, C)) {
    if (!(f.story ? tale.includes(b) : b.def.id === f.beast)) continue;
    // (one of yours who was knocked down gets up)
    if (!alive(b) && b.state !== 'down') continue;
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
    else if (C.rt !== s.rtFight) endRealFight(s, s.rtFight.how || 'escaped');
    else if (C.rt.how && C.t >= C.taleAt) endTale(s, C, C.rt.how);
    if (s.pending || s.dead) return STILL;
  }
  const steering = !!(io.input && (io.input.x || io.input.y));
  me.press = Math.max(0, me.press - dt);
  // taking the stick yourself ends walking up to someone
  if (steering && !me.hold && me.press <= 0) {
    me.auto = false;
    me.steer = null;
  }
  C.allies = list.filter((b) => b.side === 'ally' && alive(b)).length;
  const heard = new Set();
  for (const b of list) {
    if (!present(s, b)) {
      b.state = 'gone';
      continue;
    }
    if (b.state === 'gone') reset(b);
    // the matter settled (you paid, they spoke, the fight is over): on their way
    if ((b.stay || b.story) && (b.state === 'talk' || b.state === 'yield') && !s.rtFight && !C.rt) leave(b);
    if (!b.phantom && !b.stay && !b.story && !b.summon && !hunting(b) && Math.hypot(b.x - w.x, b.y - w.y) > AWAKE) {
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
  poolsTick(s, C, dt, io);
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
  return { on: C.on, moved, hold: !!(me.dash || me.kb || me.held), mult, steer: me.auto ? me.steer : null };
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
  // one called into the fight: gone with whoever called it (or when its time is up)
  if (b.summon && alive(b) && (!alive(b.master) || !b.master.aggro || (b.until && C.t > b.until))) {
    Object.assign(b, { state: b.phantom ? 'vanish' : 'flee', st: 0, aggro: false, moving: false, move: null, token: false });
    untarget(C, b);
  }
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
  // thrown back by a blow
  if (b.kb) {
    const want = Math.min(b.kb.left, 360 * dt);
    const went = slide(s, b, b.kb.ux, b.kb.uy, want, b.R.body * 0.65);
    b.kb.left -= want;
    if (b.kb.left <= 0.5 || went < want * 0.3) b.kb = null;
  }
  // whom it is after: you, as a rule (with others at your side in it, whoever of you is nearest; for one of them, the nearest against you)
  const tg = b.side === 'ally' || C.allies ? targetFor(s, C, b) : w;
  const at = tg || w;
  const dx = at.x - b.x;
  const dy = at.y - b.y;
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
      if (d < sightOf(s, b) && (b.phantom || !outOfReach(s))) spotted(s, C, b, io, d, ux, uy);
      break;
    }
    case 'notice': {
      // it has seen you: a long look, then it comes
      look(b, ux, uy);
      b.moving = false;
      if (d > sightOf(s, b) * 1.5 || (!b.phantom && outOfReach(s))) {
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
      // one at your side with no one left to fight: stands by
      if (b.side === 'ally' && !tg) {
        b.moving = false;
        break;
      }
      chase(s, C, b, dt, io, d, ux, uy);
      break;
    case 'down': {
      // knocked down: out of it until the fight is over
      b.moving = false;
      break;
    }
    case 'windup': {
      if (b.st < b.wind) break;
      const M = BEAST_MOVES[b.move];
      if (M.shape === 'fan') {
        // the blow lands: a short lunge into it, and whoever is in the fan is caught
        beastStep(s, b, b.aim[0], b.aim[1], M.lunge || 0);
        C.fx.push({ kind: M.fx || 'bite', x: b.x, y: b.y, dir: b.aim, reach: M.reach, arc: M.arc, t0: C.t, dur: M.pool ? 0.5 : 0.3, foe: foe(b) });
        spent(b, M);
        strikeFan(s, C, b, M, io);
        if (M.pool) poolsAlong(C, b, M);
      } else if (M.shape === 'leap') {
        Object.assign(b, { state: 'leap', st: 0, went: 0, hit: false, hitSet: new Set(), from: [b.x, b.y], trailAt: 0 });
        break;
      } else if (M.shape === 'ring') {
        // all round it at once
        C.fx.push({ kind: M.fx || 'ring', x: b.x, y: b.y, r: M.radius, t0: C.t, dur: 0.55 });
        spent(b, M);
        strikeAround(s, C, b, M, b.x, b.y, M.radius, io, M.push || 0);
      } else if (M.shape === 'zone') {
        // the ground bursts where it marked (where you stood)
        spent(b, M);
        for (const [zx, zy] of b.zones || []) {
          C.fx.push({ kind: M.fx || 'quake', x: zx, y: zy, r: M.radius, t0: C.t, dur: 0.6 });
          strikeAround(s, C, b, M, zx, zy, M.radius, io);
          if (s.pending || s.dead) return;
          if (M.pool) pool(C, b, zx, zy, M.pool);
        }
        b.zones = null;
      } else if (M.shape === 'call') {
        spent(b, M);
        summon(s, C, b, M, io);
      } else if (M.shape === 'blink') {
        spent(b, M);
        blinkAway(s, C, b, at);
      } else {
        // loosed (one, or several fanned out): it flies on its own now (one of yours: at them)
        const n = M.count || 1;
        const a0 = Math.atan2(b.aim[1], b.aim[0]);
        for (let k = 0; k < n; k++) {
          const a = a0 + (k - (n - 1) / 2) * (M.spread || 0);
          const [vx, vy] = [Math.cos(a), Math.sin(a)];
          const sh = { kind: M.fx, by: b, move: M, x: b.x + vx * 12, y: b.y + vy * 12, ux: vx, uy: vy, speed: M.speed, left: M.range, r: M.width / 2, mult: M.mult };
          if (foe(b)) sh.foe = true;
          else Object.assign(sh, { dmg: b.dmg * M.mult, hurt: 'spirit', by: b });
          shoot(C, sh);
        }
        spent(b, M);
      }
      if (s.pending || s.dead) break;
      if (b.state === 'recover') again(b, M, ux, uy, d);
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
      strikeLine(s, C, b, M, x0, y0, io);
      if (s.pending || s.dead) break;
      // a rush that sets the ground alight behind it
      if (M.trail && b.went - b.trailAt >= 24) {
        b.trailAt = b.went;
        pool(C, b, b.x, b.y, M.trail, M.trail.width / 2);
      }
      if (b.state === 'leap' && (b.went >= b.len - 0.5 || went < want * 0.3)) {
        spent(b, M);
        b.moving = false;
        C.fx.push({ kind: 'land', x: b.x, y: b.y, t0: C.t, dur: 0.45 });
        // coiled about you: it holds on, where it is, for as long as it has you
        if (b.holding) {
          b.rec = Math.max(b.rec, M.hold[0] + 0.15);
          b.holding = false;
        } else again(b, M, ux, uy, d);
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
    case 'stun': {
      // reeling: it can do nothing, for a moment
      b.moving = false;
      if (b.st >= b.stunT) {
        b.state = 'chase';
        b.st = 0;
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
    case 'roar': {
      // worn past a mark: it gathers itself, and comes on another way
      b.moving = false;
      if (b.st >= 0.85) {
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
      if (b.calm <= 0 && d < sightOf(s, b) * 0.8 && !outOfReach(s)) {
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
        // gone for the day (one from a story, or called in, for good)
        if (!b.story && !b.summon) away(s, b.def.id, 1);
        b.stay = false;
        b.state = b.story || b.summon ? 'vanished' : 'gone';
      }
      break;
    }
    case 'leave': {
      b.moving = beastStep(s, b, -ux, -uy, (R.walk || 40) * 1.6 * dt) > 0.01;
      if (b.st > 1.2) b.fade = Math.min(1, b.fade + dt * 1.2);
      if (b.fade >= 1) {
        b.stay = false;
        b.state = b.story || b.summon ? 'vanished' : 'gone';
      }
      break;
    }
    case 'dead': {
      b.moving = false;
      if (b.st > 0.9) b.fade = Math.min(1, b.fade + dt * 1.2);
      if (b.fade >= 1) {
        b.stay = false;
        b.state = b.phantom || b.story || b.summon ? 'vanished' : 'gone';
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
    const move = movesNow(b)[0];
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
  // lost you (if it was after you: one busy with those at your side fights on)
  if (foe(b) && (!b.tgt || b.tgt === s.world) && lost(s, b, d, dt)) {
    calmDown(b);
    return;
  }
  if (foe(b) && b.K.spirit && C.me?.exorcise > 0 && d < 170 && !b.story) {
    rout(s, C, b, io, `${b.name}畏懼符上的光，退走了。`);
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
  for (const id of movesNow(b)) if (BEAST_MOVES[id].shape === 'fan') reach = Math.min(reach, BEAST_MOVES[id].reach);
  return [0, reach < Infinity ? reach - 12 : 30];
}

/** What it can do from where it stands, if anything (its moves, tried in order). */
function pickMove(s, C, b, d, ux, uy, dt) {
  const w = s.world;
  for (const id of movesNow(b)) {
    const M = BEAST_MOVES[id];
    if ((b.cds[id] || 0) > 0) continue;
    if (M.shape === 'fan') {
      if (d <= M.reach + PLAYER_R * 0.4) return id;
    } else if (M.shape === 'leap') {
      if (d >= M.min && d <= M.max && b.rng() < dt * 2.4 && clearPath(s, b, ux, uy, d)) return id;
    } else if (M.shape === 'ring') {
      if (d <= M.radius * 0.8 && b.rng() < dt * 3) return id;
    } else if (M.shape === 'zone') {
      if (d >= M.min && d <= M.max + 40 && b.rng() < dt * 1.6) return id;
    } else if (M.shape === 'call') {
      if (calledBy(s, C, b) < M.call.max && b.rng() < dt) return id;
    } else if (M.shape === 'blink') {
      if (d < M.near && b.rng() < dt * 4) return id;
    } else if (d >= M.min && d <= M.max && b.rng() < dt * 2 && clearShot(b.x, b.y, w.x, w.y)) return id;
  }
  return null;
}

/** How many it has called into the fight that are still in it. */
function calledBy(s, C, b) {
  let n = 0;
  for (const x of beastsOf(s, C)) if (x.master === b && alive(x)) n++;
  return n;
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

/**
 * It gathers itself for a move (quick: a share of the usual time, for one that
 * was lying in wait; more: the next of a run of blows, which comes quicker).
 */
function windup(b, move, ux, uy, d, quick = 1, more = false) {
  const M = BEAST_MOVES[move];
  Object.assign(b, { state: 'windup', st: 0, move, moving: false, aim: [ux, uy] });
  look(b, ux, uy);
  if (!more) b.combo = M.combo || 0;
  b.wind = (more ? M.again : M.windup) * (b.enraged ? 0.82 : 1) * quick;
  b.from = [b.x, b.y];
  if (M.shape === 'leap') b.len = Math.min(M.max + M.overshoot, d + M.overshoot);
  else if (M.shape === 'shot') b.len = M.range;
  else if (M.shape === 'zone') b.zones = zonesOf(b, M, ux, uy, d);
}

/** One of a run of blows (or springs): straight into the next, turned to whoever it is after. */
function again(b, M, ux, uy, d) {
  if (!(b.combo > 1)) {
    b.combo = 0;
    return;
  }
  b.combo -= 1;
  windup(b, b.last, ux, uy, d, 1, true);
}

/** Where the ground will burst: where whoever it is after stands (as far as it reaches), and the rest round about. */
function zonesOf(b, M, ux, uy, d) {
  const r = Math.min(d, M.max);
  const x = b.x + ux * r;
  const y = b.y + uy * r;
  const out = [[x, y]];
  const n = M.count || 1;
  const a0 = b.rng() * Math.PI * 2;
  for (let k = 1; k < n; k++) {
    const a = a0 + ((k - 1) / (n - 1)) * Math.PI * 2;
    out.push([x + Math.cos(a) * M.spread, y + Math.sin(a) * M.spread]);
  }
  return out;
}

/**
 * Whom it is after. One against you: you — or, with others at your side in
 * the fight, whichever of you is nearest (it keeps to one for a while, and
 * would rather have you). One at your side: the nearest against you.
 */
function targetFor(s, C, b) {
  const w = s.world;
  const keep = b.tgt && C.t - (b.tgtT ?? -9) < 2;
  if (b.side === 'ally') {
    if (keep && b.tgt !== w && alive(b.tgt) && foe(b.tgt) && present(s, b.tgt)) return b.tgt;
    let best = null;
    let bd = Infinity;
    for (const x of beastsOf(s, C)) {
      if (!foe(x) || !alive(x) || !present(s, x) || !x.aggro) continue;
      const d = Math.hypot(x.x - b.x, x.y - b.y);
      if (d < bd) {
        bd = d;
        best = x;
      }
    }
    b.tgt = best;
    b.tgtT = C.t;
    return best;
  }
  if (keep && (b.tgt === w || alive(b.tgt))) return b.tgt;
  let best = w;
  let bd = Math.hypot(w.x - b.x, w.y - b.y) * 0.85;
  for (const a of beastsOf(s, C)) {
    if (a.side !== 'ally' || !alive(a)) continue;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  b.tgt = best;
  b.tgtT = C.t;
  return best;
}

/** A blow in a fan lands on whoever is in it: you and those at your side (or, from one of yours, those against you). */
function strikeFan(s, C, b, M, io) {
  const w = s.world;
  for (const x of beastsOf(s, C)) {
    if (!alive(x) || !present(s, x) || x === b || foe(x) === foe(b)) continue;
    if (!inFan(b.x, b.y, b.aim, M.reach + x.R.body, M.arc, x.x, x.y)) continue;
    if (foe(b)) hurtAlly(s, C, x, b, M.mult, io, M);
    else hurtBeast(s, C, x, b.dmg * M.mult, io, { by: b });
    if (s.pending || s.dead) return;
  }
  if (foe(b) && inFan(b.x, b.y, b.aim, M.reach + PLAYER_R, M.arc, w.x, w.y)) hurtMe(s, C, b, M.mult, io, [b.aim[0], b.aim[1], 16], M);
}

/** A rush along a line catches whoever it passes (each once). */
function strikeLine(s, C, b, M, x0, y0, io) {
  const w = s.world;
  for (const x of beastsOf(s, C)) {
    if (!alive(x) || !present(s, x) || x === b || foe(x) === foe(b) || b.hitSet.has(x.uid)) continue;
    if (segDist(x0, y0, b.x, b.y, x.x, x.y) > b.R.body + x.R.body) continue;
    b.hitSet.add(x.uid);
    if (foe(b)) hurtAlly(s, C, x, b, M.mult, io, M);
    else hurtBeast(s, C, x, b.dmg * M.mult, io, { by: b });
    if (s.pending || s.dead) return;
  }
  if (foe(b) && !b.hit && segDist(x0, y0, b.x, b.y, w.x, w.y) <= b.R.body + PLAYER_R) {
    b.hit = true;
    const took = hurtMe(s, C, b, M.mult, io, M.hold ? null : [b.aim[0], b.aim[1], 34], M);
    if (M.hold && took >= 0 && !s.pending && !s.dead) hold(C, b, M);
  }
}

/** Coiled about you: you cannot go anywhere, and it squeezes — until you step aside out of it. */
function hold(C, b, M) {
  C.me.held = { left: M.hold[0], tick: 0.5, mult: M.hold[1], by: b };
  C.me.kb = null;
  b.holding = true;
  b.went = b.len;
  say(C, 'bad', `${b.name}纏住了你！快閃避掙脫！`);
}

/** Everyone against it within r of (x, y) is caught (and you thrown out from there by push). */
function strikeAround(s, C, b, M, x, y, r, io, push = 12) {
  const w = s.world;
  for (const o of beastsOf(s, C)) {
    if (!alive(o) || !present(s, o) || o === b || foe(o) === foe(b)) continue;
    if (Math.hypot(o.x - x, o.y - y) > r + o.R.body) continue;
    if (foe(b)) hurtAlly(s, C, o, b, M.mult, io, M);
    else hurtBeast(s, C, o, b.dmg * M.mult, io, { by: b });
    if (s.pending || s.dead) return;
  }
  const d = Math.hypot(w.x - x, w.y - y);
  if (!foe(b) || d > r + PLAYER_R) return;
  const [ux, uy] = d > 1 ? [(w.x - x) / d, (w.y - y) / d] : b.aim;
  hurtMe(s, C, b, M.mult, io, push ? [ux, uy, push] : null, M);
}

// ── what a boss does besides ──

/** Ground that hurts a while: venom where it was spat, fire where it burned. */
function pool(C, b, x, y, P, r = P.r) {
  C.pools.push({ x, y, r, kind: P.kind || 'fire', t0: C.t, until: C.t + P.secs, mult: P.dps * 0.5, poison: P.poison || null, by: b, tick: 0.25 });
}

/** A fan that leaves the ground burning: along its reach. */
function poolsAlong(C, b, M) {
  for (const f of [0.35, 0.65, 0.95]) pool(C, b, b.x + b.aim[0] * M.reach * f, b.y + b.aim[1] * M.reach * f, M.pool);
}

/** Whoever stands in it is hurt every half second (stepping through it in a dash, you are not). */
function poolsTick(s, C, dt, io) {
  if (!C.pools.length) return;
  C.pools = C.pools.filter((p) => p.until > C.t);
  const me = C.me;
  const w = s.world;
  for (const p of C.pools) {
    p.tick -= dt;
    if (p.tick > 0) continue;
    p.tick = 0.5;
    for (const a of beastsOf(s, C)) {
      if (a.side !== 'ally' || !alive(a) || Math.hypot(a.x - p.x, a.y - p.y) > p.r + a.R.body * 0.5) continue;
      hurtAlly(s, C, a, p.by, p.mult, io);
    }
    if (!C.on || me.dash || me.inv > 0 || Math.hypot(w.x - p.x, w.y - p.y) > p.r + PLAYER_R * 0.5) continue;
    hurtMe(s, C, p.by, p.mult, io, null, p.poison ? { poison: p.poison } : p.kind === 'fire' ? { fire: true } : null);
    if (s.pending || s.dead) return;
  }
}

/** It calls others into the fight: they come in from about it (no more than max of them at once). */
function summon(s, C, b, M, io) {
  const K = M.call;
  const list = beastsOf(s, C);
  const n = Math.min(K.n, K.max - calledBy(s, C, b));
  if (n <= 0) return;
  for (let k = 0; k < n; k++) {
    const a = b.rng() * Math.PI * 2;
    const [x, y] = nearestOpen(s, b.x + Math.cos(a) * 150, b.y + Math.sin(a) * 150, 6) || [b.x, b.y];
    const def = { id: `${b.uid}~${++C.uid}`, kind: K.kind, n: 1, x, y, r: 60, power: b.D, story: b.story, summon: true, phantom: !!K.phantom, rt: { share: K.share ?? 0.3 } };
    const x2 = spawn(s, def, 0);
    Object.assign(x2, { master: b, until: K.secs ? C.t + K.secs : null, npcId: K.phantom ? b.npcId : null });
    arm(s, C, x2);
    Object.assign(x2, { state: 'chase', st: 0, aggro: true, pause: 0.35 + k * 0.2 });
    list.push(x2);
    C.foes.add(x2.uid);
    C.fx.push({ kind: K.phantom ? 'blink' : 'land', x, y, t0: C.t, dur: 0.6 });
  }
  C.fx.push({ kind: M.fx || 'howl', x: b.x, y: b.y, t0: C.t, dur: 0.9 });
  if (K.line) io.feed('bad', K.line);
}

/** Gone from where it stood, and there: the other side of whoever it is after, at its distance. */
function blinkAway(s, C, b, at) {
  const far = (b.R.keep?.[1] ?? 200) * 0.85;
  const a0 = Math.atan2(b.y - at.y, b.x - at.x) + Math.PI;
  for (let k = 0; k < 9; k++) {
    const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5 + (b.rng() - 0.5) * 0.4;
    const x = at.x + Math.cos(a) * far;
    const y = at.y + Math.sin(a) * far;
    if (collides(s, x, y, 12) || !isReachable(x, y)) continue;
    C.fx.push({ kind: 'blink', x: b.x, y: b.y, t0: C.t, dur: 0.5 });
    Object.assign(b, { x, y, kb: null, path: null });
    C.fx.push({ kind: 'blink', x, y, t0: C.t, dur: 0.5 });
    return;
  }
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
  const away = d > R.lose * cover(s) || b.noWay || (!b.phantom && !b.story && outOfReach(s));
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
  // what a 符 or a 術 gave you, wearing off: faster on foot, hidden, the dead kept away
  for (const k of ['swift', 'hidden', 'exorcise']) if (me[k] > 0) me[k] = Math.max(0, me[k] - dt);
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
  // coiled about: nothing to do but take it — or break free with a step aside
  if (me.held) {
    const H = me.held;
    H.left -= dt;
    H.tick -= dt;
    if (H.tick <= 0 && H.left > 0 && alive(H.by)) {
      H.tick = 0.5;
      hurtMe(s, C, H.by, H.mult, io);
      if (s.pending || s.dead) return 0;
    }
    if (me.held && (H.left <= 0 || !alive(H.by) || H.by.state !== 'recover')) me.held = null;
  }
  // 回春: blood coming back a little at a time; 金剛: braced, for a while
  if (me.regen) {
    me.hp = Math.min(me.cap, me.hp + me.regen.hps * Math.min(dt, me.regen.left));
    me.regen.left -= dt;
    if (me.regen.left <= 0) me.regen = null;
  }
  if (me.ward) {
    me.ward.left -= dt;
    if (me.ward.left <= 0) me.ward = null;
  }
  // 靈力 comes back a little in a fight, and as you go (quicker where 靈氣 gathers); blood only once it is
  // over, and slowly — rest (歇息), a pill or 回春 brings it back faster
  const G = me.gear;
  const qi = C.on ? 1 : (C.qi ??= nodeQi(s, s.player.loc));
  if (!C.on && C.t - (C.qiT ?? -9) > 2) {
    C.qi = nodeQi(s, s.player.loc);
    C.qiT = C.t;
  }
  // (not while it is holding you up in the air)
  if (!w.fly) me.mp = Math.min(me.maxMp, me.mp + me.maxMp * (C.on ? 0.03 : 0.012 * qi * (1 + G.mpRegen)) * dt);
  if (!C.on && C.t - me.hurtT > 3 && me.hp < me.cap) me.hp = Math.min(me.cap, me.hp + me.cap * 0.006 * (1 + G.regen) * dt);
  let moved = 0;
  if (me.dash) {
    const D = me.dash;
    const x0 = w.x;
    const y0 = w.y;
    const want = Math.min((D.dist / D.time) * dt, D.dist - D.went);
    const went = slide(s, w, D.ux, D.uy, want, PLAYER_R);
    D.went += went;
    D.t += dt;
    moved += went;
    me.trail.push({ x: w.x, y: w.y, t0: C.t });
    // a move that carries you: it strikes what you pass (or the first you meet)
    if (D.k) dashHits(s, C, D, x0, y0, io);
    if (s.pending || s.dead) return moved;
    if (me.dash && (D.t >= D.time || D.went >= D.dist - 0.5 || went < want * 0.2)) me.dash = null;
    if (!me.dash && D.k?.fx === 'swordstep') C.fx.push({ kind: 'slashline', x: D.from[0], y: D.from[1], to: [w.x, w.y], t0: C.t, dur: 0.45 });
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
        if (alive(b) && foe(b) && present(s, b) && inFan(w.x, w.y, [a.ux, a.uy], S.reach + b.R.body, S.arc, b.x, b.y)) hurtBeast(s, C, b, me.atk * S.mult, io);
        if (s.pending || s.dead) return;
      }
    } else {
      shoot(C, { kind: 'arrow', x: w.x + a.ux * 10, y: w.y + a.uy * 10, ux: a.ux, uy: a.uy, speed: S.speed, left: S.range, r: S.width / 2, dmg: me.atk * S.mult });
    }
    return;
  }
  const k = a.k;
  if (k.aim === 'line') {
    shoot(C, { kind: k.fx, x: w.x + a.ux * 12, y: w.y + a.uy * 12, ux: a.ux, uy: a.uy, speed: k.speed, left: k.range, r: k.width / 2, dmg: me.atk * k.mult, pierce: !!k.pierce, hurt: k.holy ? 'holy' : 'spirit', stun: k.stun || 0 });
  } else if (k.aim === 'ground') {
    const dx = a.pt[0] - w.x;
    const dy = a.pt[1] - w.y;
    const d = Math.max(20, Math.hypot(dx, dy));
    shoot(C, { kind: 'fire', x: w.x + (dx / d) * 10, y: w.y + (dy / d) * 10, ux: dx / d, uy: dy / d, speed: k.speed, left: d - 10, r: 10, dmg: me.atk * k.mult, radius: k.radius, burn: k.burn ? me.atk * 0.22 : 0, burnT: k.burn || 0, boom: true, hurt: 'fire' });
  } else if (k.aim === 'self') {
    if (k.shield) {
      me.shield = Math.round(me.maxHp * k.shield);
      me.shieldT = k.last;
    }
    if (k.heal) me.regen = { left: k.last, hps: (me.cap * k.heal) / k.last };
    if (k.cure && me.poison) {
      me.poison = null;
      pop(C, w.x - 12, w.y, '解毒', 'status', 52);
    }
    if (k.ward) me.ward = { left: k.last, k: k.ward };
    C.fx.push({ kind: k.fx, x: w.x, y: w.y, t0: C.t, dur: 0.6 });
  } else if (k.aim === 'dash') {
    startDash(s, C, a.ux, a.uy, k);
  } else if (k.aim === 'around') {
    // a sweep all round you (or a bell rung): whoever is in it is caught, and reels
    C.fx.push({ kind: k.fx === 'bell' ? 'bell' : 'sweep', x: w.x, y: w.y, r: k.radius, t0: C.t, dur: k.fx === 'bell' ? 0.6 : 0.4 });
    for (const b of beastsOf(s, C)) {
      const d = Math.hypot(b.x - w.x, b.y - w.y) || 1;
      if (!alive(b) || !foe(b) || !present(s, b) || d > k.radius + b.R.body) continue;
      if (k.only === 'spirit' && !b.K.spirit) continue;
      hurtBeast(s, C, b, me.atk * k.mult, io, { kind: k.holy ? 'holy' : 'phys' });
      if (s.pending || s.dead) return;
      stagger(b, k.stun, [(b.x - w.x) / d, (b.y - w.y) / d, k.push ?? 18]);
    }
    if (k.shield) {
      me.shield = Math.round(me.maxHp * k.shield);
      me.shieldT = k.last;
    }
  } else if (k.aim === 'seek') {
    // flames fanning out, each finding its own way
    const a0 = Math.atan2(a.uy, a.ux);
    for (let n = 0; n < k.count; n++) {
      const an = a0 + (n - (k.count - 1) / 2) * 0.7;
      shoot(C, { kind: k.fx, x: w.x + Math.cos(an) * 12, y: w.y + Math.sin(an) * 12, ux: Math.cos(an), uy: Math.sin(an), speed: k.speed, left: k.range, r: 9, dmg: me.atk * k.mult, hurt: 'fox', seek: n, burn: k.burn ? me.atk * 0.15 : 0, burnT: k.burn || 0 });
    }
  }
}

/** You go along a line, fast (a step aside, or a move that carries you: k). Untouchable while you do. */
function startDash(s, C, ux, uy, k = null) {
  const me = C.me;
  const dist = k ? k.range : DASH.dist;
  const time = k ? Math.max(0.16, dist / 850) : DASH.time;
  me.dash = { ux, uy, t: 0, went: 0, dist, time, k, hit: new Set(), from: [s.world.x, s.world.y] };
  me.inv = k ? time + 0.08 : DASH.inv;
  me.kb = null;
  faceTo(s, me, ux, uy);
  C.fx.push({ kind: 'dash', x: s.world.x, y: s.world.y, dir: [ux, uy], t0: C.t, dur: 0.35 });
}

/** What a move that carries you strikes on the way: everyone it passes, or (first) the first, thrown back. */
function dashHits(s, C, D, x0, y0, io) {
  const k = D.k;
  const w = s.world;
  for (const b of beastsOf(s, C)) {
    if (!alive(b) || !foe(b) || !present(s, b) || D.hit.has(b.uid)) continue;
    if (segDist(x0, y0, w.x, w.y, b.x, b.y) > k.width / 2 + b.R.body) continue;
    D.hit.add(b.uid);
    hurtBeast(s, C, b, C.me.atk * k.mult, io);
    if (s.pending || s.dead) return;
    C.fx.push({ kind: k.first ? 'impact' : 'spark', x: b.x, y: b.y, t0: C.t, dur: 0.35, of: k.fx });
    stagger(b, k.stun, k.push ? [D.ux, D.uy, k.push] : null);
    if (k.first) {
      C.me.dash = null;
      return;
    }
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
    if (sh.seek !== undefined) seek(s, C, sh, dt);
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
        // theirs: at those at your side as much as at you
        const ally = list.find((a) => a.side === 'ally' && alive(a) && Math.hypot(a.x - sh.x, a.y - sh.y) <= sh.r + a.R.body);
        if (ally && sh.by) {
          hurtAlly(s, C, ally, sh.by, sh.mult, io, sh.move);
          sh.done = true;
          C.fx.push({ kind: 'spark', x: sh.x, y: sh.y, t0: C.t, dur: 0.25, of: sh.kind });
          continue;
        }
        // at you: step out of its way, and it flies on past
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
        if (sh.done || !alive(b) || !foe(b) || !present(s, b) || sh.hit.has(b.uid)) continue;
        if (Math.hypot(b.x - sh.x, b.y - sh.y) > sh.r + b.R.body) continue;
        if (sh.boom) {
          burst(s, C, sh, io);
          break;
        }
        sh.hit.add(b.uid);
        hurtBeast(s, C, b, sh.dmg, io, { kind: sh.hurt || 'phys', by: sh.by || null });
        if (s.pending || s.dead) return;
        if (sh.burn && alive(b)) b.burn = { left: sh.burnT, tick: 0.5, dps: sh.burn };
        if (sh.stun && alive(b)) stagger(b, sh.stun);
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

/** A flame that finds its own way: it turns toward whoever is nearest (each of a handful to a different one, if it can). */
function seek(s, C, sh, dt) {
  if (!sh.tgt || !alive(sh.tgt)) {
    const live = beastsOf(s, C)
      .filter((b) => seen(b) && foe(b) && present(s, b) && Math.hypot(b.x - sh.x, b.y - sh.y) < 380)
      .sort((a, b) => Math.hypot(a.x - sh.x, a.y - sh.y) - Math.hypot(b.x - sh.x, b.y - sh.y));
    sh.tgt = live.length ? live[sh.seek % live.length] : null;
  }
  if (!sh.tgt) return;
  const cur = Math.atan2(sh.uy, sh.ux);
  let da = Math.atan2(sh.tgt.y - sh.y, sh.tgt.x - sh.x) - cur;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const turn = Math.max(-7 * dt, Math.min(7 * dt, da));
  sh.ux = Math.cos(cur + turn);
  sh.uy = Math.sin(cur + turn);
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
    if (!alive(b) || !foe(b) || !present(s, b) || Math.hypot(b.x - sh.x, b.y - sh.y) > sh.radius + b.R.body) continue;
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
  const live = beastsInWorld(s, 900).filter((b) => seen(b) && foe(b));
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
  me.hidden = 0;
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
  me.hidden = 0;
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
  me.hidden = 0;
  faceTo(s, me, ux, uy);
  me.act = { kind: 'cast', id, k, t: 0, at: k.cast, dur: k.cast + 0.16, ux, uy, pt: [w.x + ux * reach, w.y + uy * reach], done: false };
  return true;
}

// ── 符 in a fight ──

/** The 符 you would burn in a fight: the one you carry at hand (隨身), else the first you have. */
export function talismanOf(s) {
  const items = s.player.items;
  const ready = s.player.ready;
  if (ready && TALISMANS[ready]?.fight && items[ready] > 0) return ready;
  return Object.keys(TALISMANS).find((id) => TALISMANS[id].fight && items[id] > 0) || null;
}

/** Burn a 符 in a fight: it goes off like a move of its own (no 靈力; the 符 is gone). */
export function talismanCmd(s, aim = null) {
  if (!free(s)) return false;
  const C = combatOf(s);
  const me = hero(s, C);
  const w = s.world;
  const id = talismanOf(s);
  if (!id || me.dash || (me.cds.talisman || 0) > 0 || (me.act?.kind === 'cast' && !me.act.done)) return false;
  const k = { ...TALISMANS[id].fight, id, mp: 0 };
  const pt = aim || autoAim(s, k);
  let [ux, uy] = me.dir;
  const dx = pt[0] - w.x;
  const dy = pt[1] - w.y;
  const d = Math.hypot(dx, dy);
  if (d > 1) [ux, uy] = [dx / d, dy / d];
  const reach = Math.min(d, k.range || 0);
  addItem(s, id, -1, newReport());
  me.cds.talisman = TALISMAN_CD;
  me.hidden = 0;
  faceTo(s, me, ux, uy);
  me.act = { kind: 'cast', id, k, t: 0, at: k.cast, dur: k.cast + 0.16, ux, uy, pt: [w.x + ux * reach, w.y + uy * reach], done: false };
  say(C, 'sys', `你燒了一張${ITEMS[id].name}。`);
  return true;
}

/** Seconds between one 符 and the next. */
export const TALISMAN_CD = 3;

// ── 術 and 符 out in the world (world/arts.js) ──

/** Something a 符 or a 術 gives you for a while (seconds): swift, hidden, exorcise. */
export function bless(s, kind, secs) {
  const me = hero(s);
  me[kind] = Math.max(me[kind] || 0, secs);
}

/** 回春 out in the world: blood back over a few breaths, and the venom gone. */
export function mendSelf(s, share = 0.3, secs = 3) {
  const C = combatOf(s);
  const me = hero(s, C);
  me.regen = { left: secs, hps: (me.cap * share) / secs };
  if (me.poison) me.poison = null;
  C.fx.push({ kind: 'mend', x: s.world.x, y: s.world.y, t0: C.t, dur: 0.6 });
}

/** 神識 passes over whatever lies hidden within r: it shows for a while. Returns their names. */
export function senseBeasts(s, r) {
  const C = combatOf(s);
  const w = s.world;
  const out = [];
  for (const b of beastsOf(s, C)) {
    if (b.state !== 'hide' || !present(s, b) || Math.hypot(b.x - w.x, b.y - w.y) > r) continue;
    b.sensedT = C.t + 15;
    out.push(b.name);
  }
  C.fx.push({ kind: 'sense', x: w.x, y: w.y, r, t0: C.t, dur: 1.1 });
  return out;
}

/** Is it showing to your 神識 just now (one lying hidden)? */
export function sensed(s, b) {
  return b.sensedT > combatOf(s).t;
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
  me.cds.dash = dashCd(s);
  // held fast: a step aside breaks free (and it is slow to come at you again)
  if (me.held) {
    const H = me.held.by;
    if (H.state === 'recover') H.rec = Math.min(H.rec, H.st + 0.5);
    me.held = null;
    say(C, 'good', '你掙脫了！');
  }
  // a dash cuts off what you were only starting
  if (me.act && !me.act.done) me.act = null;
  Object.assign(me, { auto: false, hold: false, press: 0, steer: null });
  startDash(s, C, ux, uy);
  return true;
}

/** The pill you would take now: poisoned, the one that clears it (if you have it); else the strongest you have. */
export function pillOf(s) {
  const items = s.player.items;
  if (combatOf(s).me?.poison && items.detox_pill > 0) return 'detox_pill';
  return Object.keys(PILLS).find((id) => items[id] > 0) || null;
}

/** Swallow a pill: it is used up, and your blood comes back at once (and the poison goes, if it clears it). */
export function pillCmd(s) {
  if (!free(s)) return false;
  const C = combatOf(s);
  const me = hero(s, C);
  const id = pillOf(s);
  if (!id || (me.cds.pill || 0) > 0) return false;
  const P = PILLS[id];
  // nothing for it to mend
  if (me.hp >= me.cap && !(P.cure && me.poison)) return false;
  addItem(s, id, -1, newReport());
  me.cds.pill = PILL_CD;
  const w = s.world;
  const back = Math.min(me.cap - me.hp, Math.round(me.cap * P.heal));
  me.hp += back;
  if (back > 0) pop(C, w.x, w.y, String(back), 'heal', 52);
  if (P.cure && me.poison) {
    me.poison = null;
    pop(C, w.x - 12, w.y, '解毒', 'status', 64);
  }
  C.fx.push({ kind: 'mend', x: w.x, y: w.y, t0: C.t, dur: 0.6 });
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
  Object.assign(me, { poison: null, regen: null, ward: null });
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
  Object.assign(me, { hp: me.cap, mp: me.maxMp, shield: 0, shieldT: 0, poison: null, regen: null, ward: null });
  io.feed('sys', { won: '叮——試煉完成。系統：「不錯。」', escaped: '叮——你甩掉了幻影。系統：「逃得掉，也是本事。」', fell: '叮——試煉失敗。好在只是幻影，你毫髮無傷。' }[how]);
}
