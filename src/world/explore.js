// Walking the world: movement, the passing of the day, the clouds, and
// everything you run into on the way — places, people, beasts, herbs, the
// road itself. The UI feeds it input every frame; it changes the save and
// starts events, and leaves notes (toasts, banners) for the UI to show.

import { world, regionAt, collides, speedAt, findPath, nearestOpen, hash2, PLAYER_R } from './terrain.js';
import { heightAt } from './height.js';
import { POIS, POI_BY_ID, MOBS, GATHER, GATHER_RESPAWN } from './places.js';
import { NODES } from './map.js';
import { NAMED } from './npcs.js';
import { reveal, fogOf } from './fog.js';
import { stageScene, updateScenes, sceneTargets, sceneByUid, meetScene, scenesOf } from './director.js';
import { peopleNow, folkNow, folkChat, updatePeople } from './people.js';
import { updateWild, wildNow, spawnCritter } from './wildlife.js';
import { power } from '../core/cultivation.js';
import { sysGain } from './system.js';
import { EVENTS } from '../content/index.js';
import { ITEMS, displayItem } from '../content/items.js';
import { pickEvent, startEvent, takeDue, notice, choose, fightChoice } from '../core/events.js';
import { arenaOf, placeOf } from './arena.js';
import { updateCombat, beastTargets, strikeAt, FIGHT_HOURS } from './combat.js';
import { inquire, visit } from '../core/actions.js';
import { spendHours, newReport } from '../core/time.js';
import { applyEffects, logLife } from '../core/effects.js';
import { rand, chance, pickWeighted } from '../core/rng.js';
import { fmtDuration } from '../core/calendar.js';

export const WALK_SPEED = 150; // world units per second, on grass, as a mortal
export const UNITS_PER_HOUR = 375; // a full day of walking covers 9000 units
export const REACH = { poi: 70, npc: 60, herb: 48, folk: 52 };
/** Someone at home comes to the door when you are this close. */
export const DOOR = 150;

export const isNight = (s) => s.tod >= 19.5 || s.tod < 5;

/** 時辰 for an hour of the day. */
export function shichen(tod) {
  const names = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return names[Math.floor(((tod + 1) % 24) / 2)] + '時';
}

/** How the light falls: 0 full day … 1 deep night, with dusk/dawn in between. */
export function darkness(tod) {
  if (tod >= 6.5 && tod < 17.5) return 0;
  if (tod >= 17.5 && tod < 20) return (tod - 17.5) / 2.5;
  if (tod >= 20 || tod < 4.5) return 1;
  return 1 - (tod - 4.5) / 2;
}

// ── the save's world part ──

/** Make sure a save has its place in the world (new games and old saves alike). */
export function ensureWorld(s) {
  if (s.tod === undefined || s.tod === null) s.tod = 8;
  if (s.world) return s.world;
  const loc = NODES[s.player.loc]?.at ? s.player.loc : 'qingxu_temple';
  const [x, y] = NODES[loc].at;
  s.world = { x, y, face: 1, fog: '', found: {}, taken: {}, herbs: {}, mobs: {}, walked: 0, enc: 0, region: loc };
  s.player.loc = loc;
  // a save from before the world was open: you have seen the places you have been
  for (const [id, n] of Object.entries(s.nodes)) if (n.visited && NODES[id]?.at) reveal(s, NODES[id].at[0], NODES[id].at[1], 420);
  reveal(s, x, y, revealRadius(s));
  return s.world;
}

// ── live state (never saved) ──

const LIVE = new WeakMap();

export function liveOf(s) {
  let L = LIVE.get(s);
  if (!L) {
    L = { t: 0, path: null, then: null, stuck: 0, lastReveal: null, inAuto: new Set(), mobs: null, folk: null, feed: [], signals: [], banner: null, moving: false, dayTurned: false, npcCache: new Map() };
    LIVE.set(s, L);
  }
  return L;
}

function busy(s) {
  return !!(s.pending || s.secl || s.dead);
}

/** Toasts and stage-ups from time passing go to the feed. */
function flush(s, L, report) {
  for (const t of report.toasts) L.feed.push({ kind: 'sys', text: t });
  for (const u of report.stageUps) L.feed.push({ kind: 'good', text: `境界提升：${u}` });
  for (const c of report.chips) if (c.tone === 'good' || c.tone === 'bad') L.feed.push({ kind: c.tone, text: c.text });
  if (L.feed.length > 30) L.feed.splice(0, L.feed.length - 30);
}

/** Notes for the UI: toasts since last asked. */
export function takeFeed(s) {
  const L = liveOf(s);
  const out = L.feed;
  L.feed = [];
  return out;
}

/** Things the UI should do (open the shop, show a caption) since last asked. */
export function takeSignals(s) {
  const L = liveOf(s);
  const out = L.signals;
  L.signals = [];
  return out;
}

function passHours(s, L, hours) {
  const report = newReport();
  const days = spendHours(s, hours, report);
  if (days) L.dayTurned = true;
  flush(s, L, report);
  return report;
}

export function walkMult(s) {
  const p = s.player;
  let m = 1;
  if (p.realm === 1) m = 1.08 + p.stage * 0.015;
  else if (p.realm === 2) m = 1.6;
  else if (p.realm >= 3) m = 2;
  return m * [1, 0.9, 0.75, 0.6][p.injury || 0];
}

function revealRadius(s) {
  const base = isNight(s) ? 170 : 260;
  return base + 20 * Math.min(4, s.player.realm);
}

// ── the frame step ──

/**
 * Advance the world by dt seconds. input: {x, y} from the stick (any length,
 * clamped to 1) or null; with no input the player follows a path if one is set.
 */
export function step(s, dt, input) {
  const w = ensureWorld(s);
  const L = liveOf(s);
  dt = Math.min(dt, 0.1);
  L.t += dt;
  if (busy(s)) {
    L.moving = false;
    return;
  }
  updatePeople(s, L, dt);
  updateWild(s, L, dt);
  // a fight goes on in the world as it is: the beasts out there, on this ground, on this clock
  const fight = updateCombat(s, dt, { input, feed: (kind, text) => L.feed.push({ kind, text }), signal: (x) => L.signals.push(x) });
  if (busy(s)) {
    // you went down
    stopWalking(L);
    L.moving = false;
    return;
  }
  if (fight.on) {
    // while it lasts, time runs at the fight's pace, and nothing else comes up
    L.fightHours = (L.fightHours || 0) + dt * FIGHT_HOURS;
    if (L.fightHours >= 0.02) {
      passHours(s, L, L.fightHours);
      L.fightHours = 0;
      if (busy(s)) return;
    }
    L.fought = true;
  } else {
    if (L.fought) {
      // over: what was waiting for you in this place can come now
      L.fought = false;
      if (afterFight(s, L)) return;
    }
    if (updateMobs(s, L, dt)) return;
    if (updateScenes(s, L, dt)) {
      stopWalking(L);
      L.moving = false;
      return;
    }
  }
  if (fight.hold) {
    // a dash or a blow is carrying you
    L.moving = fight.moved > 0.01;
    if (fight.moved > 0) afterMove(s, L, fight.moved, fight.on);
    return;
  }
  let dx = 0;
  let dy = 0;
  let mag = 0;
  if (fight.steer) {
    // walking up to whoever you went for
    L.path = null;
    L.then = null;
    [dx, dy] = fight.steer;
    mag = 1;
  } else if (input && (input.x || input.y)) {
    L.path = null;
    L.then = null;
    L.resume = null;
    L.chase = 0;
    const len = Math.hypot(input.x, input.y);
    mag = Math.min(1, len);
    dx = input.x / len;
    dy = input.y / len;
  } else if (L.path?.length) {
    const [tx, ty] = L.path[0];
    const d = Math.hypot(tx - w.x, ty - w.y);
    if (d < 7) {
      L.path.shift();
      if (!L.path.length) {
        L.path = null;
        L.moving = false;
        arrive(s, L);
        return;
      }
    } else {
      dx = (tx - w.x) / d;
      dy = (ty - w.y) / d;
      mag = 1;
    }
  }
  if (!mag) {
    L.moving = false;
    if (fight.moved > 0) afterMove(s, L, fight.moved, fight.on);
    return;
  }
  const want = WALK_SPEED * speedAt(w.x, w.y) * walkMult(s) * mag * dt * climb(w.x, w.y, dx, dy) * fight.mult;
  const n = Math.max(1, Math.ceil(want / 5));
  let moved = 0;
  for (let k = 0; k < n; k++) {
    const sx = (dx * want) / n;
    const sy = (dy * want) / n;
    if (!collides(s, w.x + sx, w.y + sy)) {
      w.x += sx;
      w.y += sy;
      moved += Math.hypot(sx, sy);
    } else if (sx && !collides(s, w.x + sx, w.y)) {
      w.x += sx;
      moved += Math.abs(sx);
    } else if (sy && !collides(s, w.x, w.y + sy)) {
      w.y += sy;
      moved += Math.abs(sy);
    } else break;
  }
  if (Math.abs(dx) > 0.2) w.face = dx < 0 ? -1 : 1;
  L.moving = moved > 0.01;
  // which way you are going (the director sets scenes ahead of you)
  if (L.moving) {
    const h = L.heading || [dx, dy];
    L.heading = [h[0] * 0.9 + dx * 0.1, h[1] * 0.9 + dy * 0.1];
  }
  if (L.path) {
    if (moved < want * 0.25) {
      L.stuck += dt;
      if (L.stuck > 0.6) repath(s, L);
    } else L.stuck = 0;
  }
  if (moved + fight.moved > 0) afterMove(s, L, moved + fight.moved, fight.on);
}

/** Going uphill is slower: a long stair takes its toll; downhill is no faster. */
export function climb(x, y, dx, dy) {
  const grade = (heightAt(x + dx * 10, y + dy * 10) - heightAt(x, y)) / 10;
  return grade > 0 ? Math.max(0.6, 1 / (1 + grade * 0.9)) : 1;
}

/** After moving: the clouds part, places come into view; and (unless you are fighting) time passes and things happen. */
function afterMove(s, L, moved, fighting = false) {
  const w = s.world;
  w.walked += moved;
  if (!fighting) passHours(s, L, moved / UNITS_PER_HOUR);
  if (s.dead) return;
  if (!L.lastReveal || Math.hypot(w.x - L.lastReveal[0], w.y - L.lastReveal[1]) > 16) {
    L.lastReveal = [w.x, w.y];
    clearClouds(s, L, w.x, w.y, revealRadius(s));
  }
  const region = regionAt(s, w.x, w.y);
  if (region !== w.region) {
    enterRegion(s, L, region, fighting);
    if (s.pending) return;
  }
  findHidden(s, L, 1);
  if (fighting) return;
  if (autoTriggers(s, L)) return;
  if (L.dayTurned) {
    L.dayTurned = false;
    if (fireDue(s, L)) return;
  }
  encounter(s, L, moved);
}

function clearClouds(s, L, x, y, r) {
  const res = reveal(s, x, y, r);
  for (const id of res.done) {
    const report = newReport();
    sysGain(s, 8, report);
    L.feed.push({ kind: 'sys', text: `叮——${NODES[id].name}已探索完畢。` });
    flush(s, L, report);
  }
}

/** Into another region. quiet: in the middle of a fight — what waits here comes once it is over. */
function enterRegion(s, L, to, quiet = false) {
  const w = s.world;
  w.region = to;
  s.player.loc = to;
  const node = NODES[to];
  const n = s.nodes[to];
  if (!node || !n) return;
  const report = newReport();
  let first = false;
  if (!n.known) {
    n.known = true;
    sysGain(s, 10, report);
  }
  if (!n.visited) {
    n.visited = true;
    first = true;
    s.stats.travels += 1;
    sysGain(s, 5, report);
    logLife(s, `初到${node.name}`);
  }
  if (!L.banner || L.banner.id !== to || L.t - L.banner.t > 20) L.banner = { id: to, name: node.name, first, t: L.t };
  flush(s, L, report);
  if (quiet) {
    L.arriveLater = to;
    return;
  }
  arrivals(s, L, to);
}

/** What waits for you on arriving somewhere: something scheduled, something that happens here. */
function arrivals(s, L, to) {
  const queue = [];
  const due = takeDue(s, to);
  if (due) queue.push(due);
  const aid = pickEvent(s, 'arrive', to);
  if (aid) queue.push({ id: aid });
  if (queue.length) {
    stopWalking(L);
    startEvent(s, queue[0].id, { data: queue[0].data || null });
    for (const q of queue.slice(1)) s.queue.push(q.id);
  }
}

/** A fight is over: if you came somewhere new while it lasted, what waits there comes now. */
function afterFight(s, L) {
  const to = L.arriveLater;
  L.arriveLater = null;
  if (!to || to !== s.world.region) return false;
  arrivals(s, L, to);
  return !!s.pending;
}

function fireDue(s, L) {
  const due = takeDue(s, s.player.loc);
  if (!due) return false;
  stopWalking(L);
  startEvent(s, due.id, { data: due.data });
  return true;
}

function stopWalking(L) {
  // something got in the way of a long walk: remember where we were going
  if (L.path?.length && L.goal) L.resume = { goal: L.goal, then: L.then };
  L.path = null;
  L.then = null;
  L.moving = false;
}

/** After an event interrupted an auto-walk, carry on to where we were going. */
export function resume(s) {
  const L = liveOf(s);
  const r = L.resume;
  L.resume = null;
  if (!r || busy(s)) return false;
  return walkTo(s, r.goal[0], r.goal[1], r.then);
}

export function canResume(s) {
  return !!liveOf(s).resume;
}

// ── places ──

export function poiVisible(s, p) {
  const w = s.world;
  if (p.hidden && !(p.id in w.found)) return false;
  if (p.treasure && p.id in w.taken) return false;
  if (p.show && !p.show(s)) return false;
  return true;
}

export function poiName(s, p) {
  return p.rename?.(s) || p.name;
}

function hiddenRange(s, p) {
  return p.hidden.r * (1 + 0.12 * Math.min(4, s.player.realm));
}

/** Notice hidden things close by (searching looks further). */
function findHidden(s, L, mult) {
  const w = s.world;
  for (const p of POIS) {
    if (!p.hidden || p.id in w.found) continue;
    if (p.hidden.cond && !p.hidden.cond(s)) continue;
    if (Math.hypot(p.x - w.x, p.y - w.y) > hiddenRange(s, p) * mult) continue;
    w.found[p.id] = s.day;
    const report = newReport();
    sysGain(s, 2, report);
    L.feed.push({ kind: 'find', text: `發現：${poiName(s, p)}` });
    flush(s, L, report);
  }
}

function autoTriggers(s, L) {
  const w = s.world;
  for (const p of POIS) {
    if (!p.auto) continue;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d > p.auto * 1.2) {
      L.inAuto.delete(p.id);
      continue;
    }
    if (d > p.auto || L.inAuto.has(p.id)) continue;
    L.inAuto.add(p.id);
    if (!poiVisible(s, p)) continue;
    const id = pickEvent(s, 'explore', p.region, { poi: p.id, auto: true });
    if (id) {
      stopWalking(L);
      startEvent(s, id);
      return true;
    }
  }
  return false;
}

// ── the road ──

const ENCOUNTER = {
  qingshi_hill: [1300, 0.5],
  black_forest: [1000, 0.55],
  wilds: [1500, 0.45],
  farmland: [1900, 0.3],
  mirror_lake: [1800, 0.35],
  fox_shrine: [1700, 0.3],
  crane_ferry: [2000, 0.3],
  ancient_ruins: [1600, 0.25],
  lingxi_valley: [1700, 0.25],
  qingshi_town: [1500, 0.5],
  luoxia_market: [1400, 0.4],
};
const ON_THE_ROAD = new Set(['wilds', 'farmland', 'mirror_lake', 'crane_ferry', 'fox_shrine']);

function encounterPick(s, region) {
  return pickEvent(s, ON_THE_ROAD.has(region) ? ['explore', 'travel'] : 'explore', region);
}

function encounter(s, L, moved) {
  const w = s.world;
  const conf = ENCOUNTER[w.region];
  if (!conf) return;
  w.enc += moved;
  if (w.enc < conf[0]) return;
  w.enc = -rand(s) * conf[0] * 0.5;
  if (!chance(s, conf[1] * (isNight(s) ? 1.2 : 1))) {
    ambient(s, L);
    return;
  }
  const id = encounterPick(s, w.region);
  if (!id) return ambient(s, L);
  // something out there: if it can be seen, set it ahead of you and let you choose
  if (stageScene(s, L, id)) return;
  stopWalking(L);
  startEvent(s, id);
}

const AMBIENT = {
  town: ['巷子裡飄來飯菜的香味。', '幾個小孩追著一隻狗跑過去。', '有人在吵架，為了一隻雞。'],
  mountain: ['松濤一陣一陣地響。', '遠處傳來幾聲獵犬的叫聲。', '一隻松鼠從你腳邊竄過。', '山風很涼。'],
  forest: ['林子裡有東西在看你。', '一根枯枝在你身後斷了。', '樹葉沙沙響，可是沒有風。'],
  wilds: ['風吹過荒草，像海浪一樣。', '天上有一隻鷹在盤旋。', '路邊有一座無名的墳。', '遠處有炊煙，不知是哪個村子。'],
  farm: ['田裡的稻子低著頭。', '一個農夫直起腰，朝你點了點頭。', '青蛙叫成一片。'],
  lake: ['湖面上有魚跳了一下。', '一隻白鷺從蘆葦叢裡飛起來。'],
  ruins: ['風從劍林裡穿過，像有人在哭。', '你踩到了什麼東西。是一截白骨。'],
  valley: ['溪水叮咚。', '霧氣在谷裡慢慢地流。'],
  shrine: ['荒草裡有一雙發亮的眼睛，一眨就不見了。'],
  ferry: ['江風很大。'],
};
const NIGHT_AMBIENT = ['夜很靜。你聽得見自己的腳步聲。', '月亮被雲遮住了。', '遠處有一點燈火。', '貓頭鷹叫了兩聲。'];

function ambient(s, L) {
  if (!chance(s, 0.5)) return;
  const kind = NODES[s.world.region]?.kind;
  const list = isNight(s) && chance(s, 0.5) ? NIGHT_AMBIENT : AMBIENT[kind];
  if (list) L.feed.push({ kind: 'ambient', text: list[Math.floor(rand(s) * list.length)] });
}

// ── people ──

/** Everyone standing somewhere in the world right now (at home, behind their door, too). */
export function peopleInWorld(s) {
  return peopleNow(s, liveOf(s));
}

/** What someone (a person or a passer-by) is saying right now, if anything. */
export function sayingOf(s, ent) {
  if (ent.sayUntil === undefined) return ent.say || null; // already worked out (peopleInWorld)
  return ent.sayUntil > liveOf(s).t ? ent.say : null;
}

// ── herbs ──

export function herbReady(s, h) {
  const t = s.world.herbs[h.id];
  return t === undefined || s.day - t >= GATHER_RESPAWN;
}

// ── a fight ──

/**
 * The ground a fight is on, and everyone's place on it: { arena, at(u) → [x, y] }.
 * The line runs toward where they came from (the pack, the scene), else the way you face.
 */
export function battleField(s) {
  if (!s.battle) return null;
  const data = s.pending?.ctx?.data || {};
  let toward = data.at || null;
  if (!toward && data.scene) {
    const sc = scenesOf(liveOf(s)).find((x) => x.def.id === data.scene);
    if (sc) toward = [sc.x, sc.y];
  }
  const arena = arenaOf(s, toward);
  return { arena, at: (u) => placeOf(arena, u) };
}

// ── townsfolk ──

export function folkInWorld(s) {
  return folkNow(s, liveOf(s));
}

// ── the wild ──

/** Deer, hares, birds and the rest around you now (for drawing). */
export function wildInWorld(s) {
  return wildNow(liveOf(s));
}

/** Set a creature down near you (tools and tests; the wild does this itself). */
export function addCritter(s, kind, x, y, n = 1) {
  return spawnCritter(liveOf(s), kind, x, y, n);
}

// ── beasts and robbers ──

const AGGRO = { wolf: 210, snake: 80, bandit: 230, ghost: 170 };
/** You hear them before they come. */
const WARN = { wolf: '遠處傳來狼嚎。', snake: '草叢裡沙沙作響。', bandit: '林子裡有人在低聲說話。', ghost: '一陣陰風吹過，你打了個寒顫。' };
/** And when you are far too much for them, they know it. */
const FLEE = { wolf: '狼群夾著尾巴跑了。', snake: '那條蛇一扭身，鑽進了石縫。', bandit: '那幾個人看了你一眼，扭頭就跑。', ghost: '那道影子一顫，散進了風裡。' };
const FAR_STRONGER = 2.2;

/** How far off they notice you: wolves hunt by night and doze at noon; the dead walk after dark. */
function aggroOf(s, kind) {
  const night = isNight(s);
  const noon = s.tod >= 10 && s.tod < 15;
  const k = { wolf: night ? 1.25 : noon ? 0.7 : 1, ghost: night ? 1.5 : 0.6, snake: night ? 0.7 : 1 }[kind] ?? (night ? 1.15 : 1);
  return AGGRO[kind] * k;
}

function mobsOf(s, L) {
  if (L.mobs) return L.mobs;
  L.mobs = MOBS.map((def, n) => ({
    def,
    state: 'idle',
    t: 0,
    members: Array.from({ length: def.n }, (_, k) => {
      const a = hash2(k, n, 501) * Math.PI * 2;
      const r = hash2(k, n, 502) * def.r * 0.7;
      const x = def.x + Math.cos(a) * r;
      const y = def.y + Math.sin(a) * r;
      return { x, y, tx: x, ty: y, wait: hash2(k, n, 503) * 3, face: 1, moving: false };
    }),
  }));
  return L.mobs;
}

export function mobsInWorld(s) {
  const L = liveOf(s);
  return mobsOf(s, L).filter((m) => mobActive(s, m));
}

function mobActive(s, m) {
  const until = s.world.mobs[m.def.id];
  if (until !== undefined && s.day < until) return false;
  const ev = EVENTS[m.def.event];
  if (!ev) return false;
  if (ev.cond && !ev.cond(s)) return false;
  return true;
}

function centroid(list) {
  const n = list.length || 1;
  return [Math.round(list.reduce((a, b) => a + b.x, 0) / n), Math.round(list.reduce((a, b) => a + b.y, 0) / n)];
}

const MOB_NAME = { wolf: ['灰狼', '狼群'], snake: ['青鱗蛇', '蛇群'], bandit: ['劫修', '山賊'], ghost: ['殘魂', '殘魂'] };

/** Beasts you could go for first (before they come for you). */
function mobTargets(s, L) {
  const w = s.world;
  const out = [];
  for (const m of mobsOf(s, L)) {
    if (m.state === 'flee' || !mobActive(s, m)) continue;
    let near = null;
    for (const b of m.members) if (!near || Math.hypot(b.x - w.x, b.y - w.y) < Math.hypot(near.x - w.x, near.y - w.y)) near = b;
    if (!near) continue;
    out.push({ kind: 'mob', id: m.def.id, x: near.x, y: near.y, name: MOB_NAME[m.def.kind][m.members.length > 1 ? 1 : 0], verb: '出手', reach: 260 });
  }
  return out;
}

/** Go for them first: the fight starts where you stand, and you have the first move. */
function strikeFirst(s, L, id) {
  const m = mobsOf(s, L).find((x) => x.def.id === id);
  if (!m || !mobActive(s, m)) return;
  const def = m.def;
  const first = m.state === 'chase' ? null : 'me';
  s.world.mobs[def.id] = s.day + def.respawn;
  const at = centroid(m.members);
  homeMembers(m);
  startEvent(s, def.event, { data: { mob: def.id, at, first } });
  const pend = s.pending;
  const i = pend.choices.findIndex((c) => !c.disabled && fightChoice(pend, c.i));
  if (i < 0) return;
  if (first) pend.text = '你看準了時機，搶先出手。';
  choose(s, pend.choices[i].i);
}

/** Running from someone far too strong: away, out of sight, and not back today. */
function fleeStep(s, m, dt) {
  const w = s.world;
  for (const b of m.members) {
    const d = Math.hypot(b.x - w.x, b.y - w.y) || 1;
    const nx = b.x + ((b.x - w.x) / d) * m.def.speed * 1.1 * dt;
    const ny = b.y + ((b.y - w.y) / d) * m.def.speed * 1.1 * dt;
    if (!collides(s, nx, ny, 9)) {
      b.x = nx;
      b.y = ny;
    } else if (!collides(s, nx, b.y, 9)) b.x = nx;
    else if (!collides(s, b.x, ny, 9)) b.y = ny;
    b.face = b.x < w.x ? -1 : 1;
    b.moving = true;
  }
  if (m.t > 1.8) m.fade = (m.fade || 0) + dt * 1.4;
  if (m.fade >= 1) {
    s.world.mobs[m.def.id] = s.day + 1;
    m.fade = 0;
    m.members.forEach((b, k) => {
      const a = hash2(k, m.def.x, 501) * Math.PI * 2;
      const r = hash2(k, m.def.y, 502) * m.def.r * 0.7;
      b.x = m.def.x + Math.cos(a) * r;
      b.y = m.def.y + Math.sin(a) * r;
    });
    homeMembers(m);
  }
}

function homeMembers(m) {
  m.state = 'idle';
  m.t = 0;
  for (const b of m.members) {
    b.tx = b.x;
    b.ty = b.y;
    b.wait = 1 + Math.random() * 3;
  }
}

/** Move beasts; returns true if one reached the player and an event began. */
function updateMobs(s, L, dt) {
  const w = s.world;
  for (const m of mobsOf(s, L)) {
    const def = m.def;
    if (Math.abs(def.x - w.x) > 1500 || Math.abs(def.y - w.y) > 1700) {
      if (m.state !== 'idle') homeMembers(m);
      continue;
    }
    if (!mobActive(s, m)) continue;
    const range = aggroOf(s, def.kind);
    m.t += dt;
    if (m.state === 'flee') {
      fleeStep(s, m, dt);
      continue;
    }
    // before they come for you, you hear them; close by, they have seen you
    const dmin = Math.min(...m.members.map((b) => Math.hypot(w.x - b.x, w.y - b.y)));
    if (m.state === 'idle') {
      if (dmin < range + 160 && !m.warned) {
        m.warned = true;
        L.feed.push({ kind: 'ambient', text: WARN[def.kind] });
      }
      if (dmin > range + 400) m.warned = false;
      m.alert = dmin < range + 110;
    } else m.alert = false;
    for (const b of m.members) {
      const dp = Math.hypot(w.x - b.x, w.y - b.y);
      if (m.state === 'idle' && dp < range) {
        m.t = 0;
        if (power(s) >= (def.power || 20) * FAR_STRONGER) {
          m.state = 'flee';
          L.feed.push({ kind: 'good', text: def.n > 1 || def.kind !== 'bandit' ? FLEE[def.kind] : '那人看了你一眼，扭頭就跑。' });
          break;
        }
        m.state = 'chase';
        L.feed.push({ kind: 'bad', text: { wolf: '狼！', snake: '草叢裡有東西！', bandit: '有人衝了過來！', ghost: '一道影子朝你飄了過來……' }[def.kind] });
      }
      if (m.state === 'chase' && dp < 22 + PLAYER_R) {
        s.world.mobs[def.id] = s.day + def.respawn;
        const at = centroid(m.members);
        homeMembers(m);
        stopWalking(L);
        // they are upon you: if it comes to a fight, it is with them, from where they came
        startEvent(s, def.event, { data: { mob: def.id, at } });
        return true;
      }
    }
    if (m.state === 'chase') {
      const far = m.members.every((b) => Math.hypot(b.x - def.x, b.y - def.y) > def.r + 520);
      if (far || m.t > 14 || (def.kind === 'snake' && m.t > 1.5)) {
        m.state = 'return';
        m.t = 0;
      }
    }
    for (const b of m.members) {
      let tx;
      let ty;
      let sp;
      if (m.state === 'chase') {
        tx = w.x;
        ty = w.y;
        sp = def.speed * speedAt(b.x, b.y);
      } else if (m.state === 'return') {
        tx = def.x;
        ty = def.y;
        sp = def.speed * 0.6;
        if (Math.hypot(b.x - def.x, b.y - def.y) < def.r * 0.6) {
          b.tx = b.x;
          b.ty = b.y;
          continue;
        }
      } else {
        if (m.alert) {
          // they have seen you: still, watching
          b.moving = false;
          b.face = w.x < b.x ? -1 : 1;
          continue;
        }
        if (b.wait > 0) {
          b.wait -= dt;
          b.moving = false;
          continue;
        }
        if (Math.hypot(b.tx - b.x, b.ty - b.y) < 4) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * def.r;
          b.tx = def.x + Math.cos(a) * r;
          b.ty = def.y + Math.sin(a) * r;
          b.wait = 1 + Math.random() * 4;
          continue;
        }
        tx = b.tx;
        ty = b.ty;
        sp = def.speed * 0.3;
      }
      const d = Math.hypot(tx - b.x, ty - b.y);
      if (d < 1) continue;
      const stepLen = Math.min(d, sp * dt);
      const nx = b.x + ((tx - b.x) / d) * stepLen;
      const ny = b.y + ((ty - b.y) / d) * stepLen;
      b.moving = true;
      if (Math.abs(nx - b.x) > 0.05) b.face = nx < b.x ? -1 : 1;
      if (!collides(s, nx, ny, 9)) {
        b.x = nx;
        b.y = ny;
      } else if (!collides(s, nx, b.y, 9)) b.x = nx;
      else if (!collides(s, b.x, ny, 9)) b.y = ny;
      else if (m.state !== 'chase') {
        b.tx = b.x;
        b.ty = b.y;
      }
    }
    if (m.state === 'return' && m.members.every((b) => Math.hypot(b.x - def.x, b.y - def.y) < def.r * 0.7)) homeMembers(m);
  }
  return false;
}

// ── what is in reach ──

/** Everything you could interact with, nearest first, each with its distance. */
export function targetsNear(s, radius = 160) {
  const w = s.world;
  const out = [];
  const add = (t) => {
    t.d = Math.hypot(t.x - w.x, t.y - w.y);
    if (t.d <= radius) out.push(t);
  };
  for (const p of POIS) {
    if (!p.verb || !poiVisible(s, p)) continue;
    if (Math.abs(p.x - w.x) > radius || Math.abs(p.y - w.y) > radius) continue;
    add({ kind: 'poi', id: p.id, x: p.x, y: p.y, name: poiName(s, p), verb: p.treasure ? '查看' : p.verb, reach: REACH.poi });
  }
  for (const n of peopleInWorld(s)) {
    if (Math.abs(n.x - w.x) > radius || Math.abs(n.y - w.y) > radius) continue;
    add({ kind: 'npc', id: n.id, x: n.x, y: n.y, name: n.name, verb: n.met ? '拜訪' : '上前', reach: REACH.npc });
  }
  for (const h of world().herbs) {
    if (Math.abs(h.x - w.x) > radius || Math.abs(h.y - w.y) > radius || !herbReady(s, h)) continue;
    add({ kind: 'herb', id: h.id, x: h.x, y: h.y, name: '靈草', verb: '採集', reach: REACH.herb });
  }
  for (const f of folkNow(s, liveOf(s))) {
    if (Math.abs(f.x - w.x) > radius || Math.abs(f.y - w.y) > radius) continue;
    add({ kind: 'folk', id: f.id, x: f.x, y: f.y, name: f.name || '路人', verb: '搭話', reach: REACH.folk, folk: f });
  }
  for (const t of sceneTargets(s, liveOf(s))) add(t);
  for (const t of mobTargets(s, liveOf(s))) add(t);
  for (const t of beastTargets(s)) add(t);
  out.sort((a, b) => a.d / a.reach - b.d / b.reach);
  return out;
}

/** The one thing the act button would act on, if any. */
export function nearestTarget(s) {
  const list = targetsNear(s, 120);
  return list.find((t) => t.d <= t.reach) || null;
}

// ── doing things ──

/** Walk (by path) to a point; `then` is a target to act on when you get there. */
export function walkTo(s, x, y, then = null) {
  if (busy(s)) return false;
  const w = ensureWorld(s);
  const L = liveOf(s);
  const path = findPath(s, w.x, w.y, x, y);
  if (!path || !path.length) {
    L.feed.push({ kind: 'ambient', text: '那邊過不去。' });
    return false;
  }
  if (then) {
    // stop at arm's length rather than on top of it
    const last = path[path.length - 1];
    const d = Math.hypot(last[0] - then.x, last[1] - then.y);
    if (d < 4) {
      const prev = path.length > 1 ? path[path.length - 2] : [w.x, w.y];
      const back = Math.hypot(prev[0] - last[0], prev[1] - last[1]) || 1;
      const k = Math.min(1, (then.reach * 0.6) / back);
      const stop = [last[0] + (prev[0] - last[0]) * k, last[1] + (prev[1] - last[1]) * k];
      if (!collides(s, stop[0], stop[1])) path[path.length - 1] = stop;
    }
  }
  L.path = path;
  L.then = then;
  L.stuck = 0;
  L.goal = [x, y];
  L.resume = null;
  return true;
}

function repath(s, L) {
  L.stuck = 0;
  const w = s.world;
  const goal = L.goal || L.path?.[L.path.length - 1];
  if (!goal) return stopWalking(L);
  const path = findPath(s, w.x, w.y, goal[0], goal[1]);
  if (!path || (L.path && path.length >= L.path.length + 3 && L.repaths > 2)) return stopWalking(L);
  L.repaths = (L.repaths || 0) + 1;
  L.path = path;
}

function arrive(s, L) {
  const then = L.then;
  L.then = null;
  L.repaths = 0;
  L.goal = null;
  if (!then) return;
  const w = s.world;
  // people move: act on them where they are now, or follow a little way
  const t = whereNow(s, L, then);
  if (!t) return;
  const d = Math.hypot(t.x - w.x, t.y - w.y);
  if (d <= t.reach + 24) interact(s, t);
  else if ((L.chase = (L.chase || 0) + 1) <= 3 && d < 600) walkTo(s, t.x, t.y, t);
}

/** A target as it is now (a person who has walked on, a scene that has moved). */
function whereNow(s, L, t) {
  if (t.kind === 'npc') {
    const n = peopleInWorld(s).find((p) => p.id === t.id);
    return n ? { ...t, x: n.x, y: n.y } : null;
  }
  if (t.kind === 'folk') return t.folk && folkNow(s, L).includes(t.folk) ? { ...t, x: t.folk.x, y: t.folk.y } : null;
  if (t.kind === 'scene') {
    const sc = sceneByUid(L, t.id);
    return sc && sc.state === 'idle' ? { ...t, x: sc.x, y: sc.y } : null;
  }
  return t;
}

export function stop(s) {
  stopWalking(liveOf(s));
}

/** Put the player somewhere as if they had just walked there (tools, tests). */
export function placeAt(s, x, y) {
  const w = ensureWorld(s);
  const L = liveOf(s);
  stopWalking(L);
  w.x = x;
  w.y = y;
  L.lastReveal = [x, y];
  clearClouds(s, L, x, y, revealRadius(s));
  const region = regionAt(s, x, y);
  if (region !== w.region) {
    enterRegion(s, L, region);
    if (s.pending) return;
  }
  findHidden(s, L, 1);
  autoTriggers(s, L);
}

/**
 * Act on a target (from targetsNear). Starts events, or leaves a signal for
 * the UI: { caption: {title, text, rest?} } or { open: 'shop' }.
 */
export function interact(s, t) {
  if (busy(s) || !t) return;
  const L = liveOf(s);
  stopWalking(L);
  L.resume = null;
  L.chase = 0;
  if (t.kind === 'poi') return usePoi(s, L, POI_BY_ID[t.id]);
  if (t.kind === 'npc') return meetNpc(s, L, t.id);
  if (t.kind === 'herb') return gather(s, L, world().herbs[t.id]);
  if (t.kind === 'folk') return chatFolk(s, L, t.folk);
  if (t.kind === 'scene') return meetScene(s, L, sceneByUid(L, t.id));
  if (t.kind === 'mob') return strikeFirst(s, L, t.id);
  if (t.kind === 'beast') return strikeAt(s, t.id);
}

/** Set an event's scene near you (tools and tests; the director does this as you walk). */
export function stage(s, eventId, around = true) {
  return stageScene(s, liveOf(s), eventId, { around });
}

/** The scenes out in the world right now (for drawing). */
export function scenesInWorld(s) {
  return scenesOf(liveOf(s));
}

function usePoi(s, L, p) {
  if (!p || !poiVisible(s, p)) return;
  if (p.treasure) {
    const report = newReport();
    s.world.taken[p.id] = s.day;
    applyEffects(s, p.treasure.effects, {}, report);
    logLife(s, `在${NODES[p.region]?.name || '野外'}發現了${p.name}`);
    sysGain(s, 3, report);
    notice(s, p.name, p.treasure.text, { chips: report.chips, toasts: report.toasts });
    return;
  }
  if (p.action === 'shop') {
    L.signals.push({ open: 'shop', poi: p.id });
    return;
  }
  if (p.action === 'inquire') return inquire(s, p.region);
  const id = pickEvent(s, 'explore', p.region, { poi: p.id });
  if (id) {
    passHours(s, L, 0.5);
    if (s.dead) return;
    startEvent(s, id);
    return;
  }
  const text = typeof p.text === 'function' ? p.text(s) : p.text;
  L.signals.push({ caption: { title: poiName(s, p), text: text || '這裡沒什麼特別的。', rest: !!p.rest } });
}

function meetNpc(s, L, id) {
  const npc = s.npcs[id];
  if (!npc?.alive) return;
  if (npc.named && !npc.met) {
    const report = newReport();
    applyEffects(s, [['meet', id]], {}, report);
    const d = NAMED[id];
    notice(s, npc.name, `${d.title}，${npc.name}。\n\n${d.bio}`, { chips: report.chips, toasts: report.toasts });
    return;
  }
  visit(s, id, { near: true });
}

function gather(s, L, h) {
  if (!h || !herbReady(s, h)) return;
  const conf = GATHER[h.region];
  passHours(s, L, 1);
  if (s.dead) return;
  s.world.herbs[h.id] = s.day;
  const report = newReport();
  const [, item, lo, hi] = pickWeighted(s, conf.give, (g) => g[0]);
  const n = lo + Math.floor(rand(s) * (hi - lo + 1));
  applyEffects(s, [['item', item, n]], {}, report);
  L.feed.push({ kind: 'good', text: `採得${displayItem(s, item).name}${n > 1 ? ' ×' + n : ''}` });
}

function chatFolk(s, L, f) {
  L.signals.push({ caption: { title: f.name || '路人', text: folkChat(s, f) } });
}

/** Look around properly: two hours, a wide look, maybe something turns up. */
export function search(s) {
  if (busy(s)) return;
  const w = ensureWorld(s);
  const L = liveOf(s);
  stopWalking(L);
  const report = passHours(s, L, 2);
  if (s.dead) return;
  s.stats.explores += 1;
  clearClouds(s, L, w.x, w.y, revealRadius(s) + 180);
  findHidden(s, L, 2.4);
  if (fireDue(s, L)) return;
  const pre = report.days ? { days: report.days, xw: Math.round(report.xw), stageUps: report.stageUps, toasts: [] } : null;
  if (ENCOUNTER[w.region] && chance(s, 0.45)) {
    const id = encounterPick(s, w.region);
    if (id && stageScene(s, L, id, { around: true })) {
      L.feed.push({ kind: 'find', text: '附近好像有動靜。' });
      return;
    }
    if (id) return startEvent(s, id, { pre });
  }
  startEvent(s, 'generic_explore', { pre });
}

/** Sit and let time pass until 'dusk', 'night', 'dawn', or for n hours. */
export function rest(s, until) {
  if (busy(s)) return;
  const L = liveOf(s);
  stopWalking(L);
  const target = { dusk: 18, night: 21, dawn: 6 }[until];
  const hours = typeof until === 'number' ? until : (target - s.tod + 24) % 24 || 24;
  passHours(s, L, hours);
  if (s.dead) return;
  if (s.player.mind < 60 && chance(s, 0.3)) s.player.mind += 1;
  L.feed.push({ kind: 'ambient', text: until === 'dawn' ? '天亮了。' : until === 'dusk' ? '太陽落山了。' : until === 'night' ? '夜深了。' : '你歇了一會兒。' });
  L.dayTurned = false;
  fireDue(s, L);
}

/** The banner to show for the region you just walked into (and when). */
export function bannerOf(s) {
  return liveOf(s).banner;
}

export function pathOf(s) {
  return liveOf(s).path;
}

export { fmtDuration };
