// Walking the world: movement, the passing of the day, the clouds, and
// everything you run into on the way — places, people, beasts, herbs, the
// road itself. The UI feeds it input every frame; it changes the save and
// starts events, and leaves notes (toasts, banners) for the UI to show.

import { CELL, COLS, ROWS, WORLD_W, WORLD_H } from './geo.js';
import { world, regionAt, collides, speedAt, findPath, nearestOpen, hash2, REGION_IDS, idxOf, cellX, cellY, PLAYER_R } from './terrain.js';
import { POIS, POI_BY_ID, NPC_SPOTS, NPC_SHOW, MOBS, GATHER, GATHER_RESPAWN, WANDERERS } from './places.js';
import { NODES, PEOPLE_PLACES } from './map.js';
import { NAMED } from './npcs.js';
import { reveal, fogOf } from './fog.js';
import { sysGain } from './system.js';
import { EVENTS } from '../content/index.js';
import { ITEMS, displayItem } from '../content/items.js';
import { pickEvent, startEvent, takeDue, notice } from '../core/events.js';
import { inquire, visit } from '../core/actions.js';
import { spendHours, newReport } from '../core/time.js';
import { applyEffects, logLife } from '../core/effects.js';
import { rand, chance, pickWeighted } from '../core/rng.js';
import { fmtDuration } from '../core/calendar.js';

export const WALK_SPEED = 150; // world units per second, on grass, as a mortal
export const UNITS_PER_HOUR = 375; // a full day of walking covers 9000 units
export const REACH = { poi: 70, npc: 60, herb: 48, folk: 52 };

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
  updateFolk(s, L, dt);
  if (updateMobs(s, L, dt)) return;
  let dx = 0;
  let dy = 0;
  let mag = 0;
  if (input && (input.x || input.y)) {
    L.path = null;
    L.then = null;
    L.resume = null;
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
    return;
  }
  const want = WALK_SPEED * speedAt(w.x, w.y) * walkMult(s) * mag * dt;
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
  if (L.path) {
    if (moved < want * 0.25) {
      L.stuck += dt;
      if (L.stuck > 0.6) repath(s, L);
    } else L.stuck = 0;
  }
  if (moved > 0) afterMove(s, L, moved);
}

function afterMove(s, L, moved) {
  const w = s.world;
  w.walked += moved;
  passHours(s, L, moved / UNITS_PER_HOUR);
  if (s.dead) return;
  if (!L.lastReveal || Math.hypot(w.x - L.lastReveal[0], w.y - L.lastReveal[1]) > 16) {
    L.lastReveal = [w.x, w.y];
    clearClouds(s, L, w.x, w.y, revealRadius(s));
  }
  const region = regionAt(s, w.x, w.y);
  if (region !== w.region) {
    enterRegion(s, L, region);
    if (s.pending) return;
  }
  findHidden(s, L, 1);
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

function enterRegion(s, L, to) {
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
  if (id) {
    stopWalking(L);
    startEvent(s, id);
  } else ambient(s, L);
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

const npcPlace = new Map();

/** A fixed-for-the-month spot for a stranger you know, somewhere in their region. */
function strangerSpot(s, npc) {
  const month = Math.floor(s.day / 30);
  const key = `${npc.id}:${npc.loc}:${month}`;
  if (npcPlace.has(key)) return npcPlace.get(key);
  const g = world();
  const ridx = REGION_IDS.indexOf(npc.loc);
  const at = NODES[npc.loc].at;
  let best = null;
  for (let tries = 0; tries < 60 && !best; tries++) {
    const a = hash2(month, tries, npc.id.length * 97 + Number(npc.id.slice(1)) || 1) * Math.PI * 2;
    const r = 60 + hash2(tries, month, 7) * 360;
    const x = at[0] + Math.cos(a) * r;
    const y = at[1] + Math.sin(a) * r;
    if (x < CELL || y < CELL || x > WORLD_W - CELL || y > WORLD_H - CELL) continue;
    const k = idxOf(Math.floor(x / CELL), Math.floor(y / CELL));
    if (g.reg[k] !== ridx || !g.reach[k]) continue;
    if (collides(null, x, y, PLAYER_R + 4)) continue;
    best = [Math.round(x), Math.round(y)];
  }
  const spot = best || at;
  npcPlace.set(key, spot);
  return spot;
}

/** Everyone standing somewhere in the world right now. */
export function peopleInWorld(s) {
  const out = [];
  for (const npc of Object.values(s.npcs)) {
    if (!npc.alive || !npc.loc) continue;
    if (npc.named) {
      const spot = NPC_SPOTS[npc.id]?.[npc.loc];
      if (!spot) continue;
      if (NPC_SHOW[npc.id] && !NPC_SHOW[npc.id](s)) continue;
      const [x, y] = typeof spot === 'function' ? spot(s) : spot;
      out.push({ id: npc.id, x, y, named: true, met: npc.met, name: npc.met ? npc.name : npc.title, npc });
    } else if (npc.met && PEOPLE_PLACES.includes(npc.loc)) {
      const [x, y] = strangerSpot(s, npc);
      out.push({ id: npc.id, x, y, named: false, met: true, name: npc.name, npc });
    }
  }
  return out;
}

// ── herbs ──

export function herbReady(s, h) {
  const t = s.world.herbs[h.id];
  return t === undefined || s.day - t >= GATHER_RESPAWN;
}

// ── townsfolk ──

const FOLK_LINES = {
  qingshi_town: [
    '今年的雨水不錯，稻子長得好。', '聽說林家那個少爺……唉，可惜了。', '王二那小子又去河邊摸魚了。',
    '回春堂的孫掌櫃，收草藥從不壓價。', '趙虎那幫人又在街口收份子錢了。', '夜裡別往鎮東走，那邊的荒廟不乾淨。',
  ],
  luoxia_market: [
    '一顆聚氣丹三十塊？搶錢啊。', '聽說黑風林最近又死了人。', '茶樓的錢半仙，嘴裡沒一句真話，可就是好聽。',
    '拍賣會每年十月開，壓軸的東西，一年比一年邪乎。', '別在坊市裡動手，執法隊可不是吃素的。', '想去中州？先活到築基再說吧。',
  ],
  farmland: ['靈溪的水澆出來的稻子，特別香。', '前些天田埂邊挖出個瓦罐，可惜是空的。', '天要下雨了，得趕緊收。'],
  qingyun_sect: ['外門大比快到了，師兄們都在閉關。', '藏經閣的老執事，脾氣古怪得很。', '聽說丹房又炸爐了。'],
};

function folkOf(s, L) {
  if (L.folk) return L.folk;
  const g = world();
  L.folk = [];
  for (const [region, n] of Object.entries(WANDERERS)) {
    const ridx = REGION_IDS.indexOf(region);
    const at = NODES[region].at;
    const cand = [];
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const k = idxOf(i, j);
        if (g.reg[k] !== ridx || !g.reach[k] || g.solidCell[k]) continue;
        const x = cellX(i);
        const y = cellY(j);
        if (Math.hypot(x - at[0], y - at[1]) > 520) continue;
        cand.push([x, y]);
      }
    }
    for (let m = 0; m < n && cand.length; m++) {
      const [x, y] = cand[Math.floor(hash2(m, ridx, 77) * cand.length)];
      const look = Math.floor(hash2(m, ridx, 78) * 6);
      L.folk.push({ region, x, y, hx: x, hy: y, tx: x, ty: y, wait: hash2(m, ridx, 79) * 4, look, face: 1, line: Math.floor(hash2(m, ridx, 80) * 99), id: `${region}:${m}` });
    }
  }
  return L.folk;
}

export function folkInWorld(s) {
  return folkOf(s, liveOf(s));
}

function updateFolk(s, L, dt) {
  const w = s.world;
  for (const f of folkOf(s, L)) {
    if (Math.abs(f.x - w.x) > 1100 || Math.abs(f.y - w.y) > 1400) continue;
    if (f.wait > 0) {
      f.wait -= dt;
      f.moving = false;
      continue;
    }
    const d = Math.hypot(f.tx - f.x, f.ty - f.y);
    if (d < 4) {
      f.wait = 1.5 + Math.random() * 5;
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 150;
      f.tx = f.hx + Math.cos(a) * r;
      f.ty = f.hy + Math.sin(a) * r;
      continue;
    }
    const sp = 38 * dt;
    const nx = f.x + ((f.tx - f.x) / d) * sp;
    const ny = f.y + ((f.ty - f.y) / d) * sp;
    if (collides(s, nx, ny, 9) || regionAt(s, nx, ny) !== f.region) {
      f.tx = f.x;
      f.ty = f.y;
      continue;
    }
    if (Math.abs(nx - f.x) > 0.01) f.face = nx < f.x ? -1 : 1;
    f.x = nx;
    f.y = ny;
    f.moving = true;
  }
}

// ── beasts and robbers ──

const AGGRO = { wolf: 210, snake: 80, bandit: 230, ghost: 170 };

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
    const range = AGGRO[def.kind] * (isNight(s) ? 1.25 : 1);
    m.t += dt;
    for (const b of m.members) {
      const dp = Math.hypot(w.x - b.x, w.y - b.y);
      if (m.state === 'idle' && dp < range) {
        m.state = 'chase';
        m.t = 0;
        L.feed.push({ kind: 'bad', text: { wolf: '狼！', snake: '草叢裡有東西！', bandit: '有人衝了過來！', ghost: '一道影子朝你飄了過來……' }[def.kind] });
      }
      if (m.state === 'chase' && dp < 22 + PLAYER_R) {
        s.world.mobs[def.id] = s.day + def.respawn;
        homeMembers(m);
        stopWalking(L);
        startEvent(s, def.event);
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
  for (const f of folkOf(s, liveOf(s))) {
    if (Math.abs(f.x - w.x) > radius || Math.abs(f.y - w.y) > radius) continue;
    add({ kind: 'folk', id: f.id, x: f.x, y: f.y, name: '路人', verb: '搭話', reach: REACH.folk, folk: f });
  }
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
  if (Math.hypot(then.x - w.x, then.y - w.y) <= then.reach + 24) interact(s, then);
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
  if (t.kind === 'poi') return usePoi(s, L, POI_BY_ID[t.id]);
  if (t.kind === 'npc') return meetNpc(s, L, t.id);
  if (t.kind === 'herb') return gather(s, L, world().herbs[t.id]);
  if (t.kind === 'folk') return chatFolk(s, L, t.folk);
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
  const lines = FOLK_LINES[f.region] || FOLK_LINES.qingshi_town;
  const fresh = s.rumors.find((r) => !r.read && r.kind !== 'npc');
  let text;
  f.line += 1;
  if (fresh && f.line % 3 === 0) {
    text = `「聽說了嗎？」${fresh.text}`;
    fresh.read = true;
  } else text = `「${lines[f.line % lines.length]}」`;
  L.signals.push({ caption: { title: '路人', text } });
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
