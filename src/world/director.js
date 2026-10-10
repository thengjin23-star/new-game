// The director: when the road has something for you, it sets the scene a
// little way ahead — on the right kind of ground, in the open, where you
// will see it coming — and then lets you choose. Walk up and it begins;
// walk on and, once you are well past, it is gone. Nothing here is saved:
// a scene lives only while you are near it.

import { CELL, T, WORLD_W, WORLD_H } from './geo.js';
import { world, regionAt, collides, isReachable, idxOf, colOf, rowOf } from './terrain.js';
import { POIS, MOBS } from './places.js';
import { SCENE_OF_EVENT } from './scenes.js';
import { EVENTS } from '../content/index.js';
import { eligible, startEvent } from '../core/events.js';

const NATURAL = new Set([T.GRASS, T.TALLGRASS, T.HILL, T.WASTE, T.SAND, T.FARM]);
const WOODS = new Set([T.FOREST, T.DEEP]);
const ROADS = new Set([T.ROAD, T.TRAIL]);
const WATER = new Set([T.WATER]);

const isNight = (s) => s.tod >= 19.5 || s.tod < 5;
/** Game time in hours, for how long a scene has been waiting. */
const clock = (s) => s.day * 24 + (s.tod ?? 12);

function cellT(x, y) {
  return world().terr[idxOf(colOf(x), rowOf(y))];
}

function near(x, y, set, r) {
  const n = Math.ceil(r / CELL);
  const g = world();
  for (let j = rowOf(y) - n; j <= rowOf(y) + n; j++) {
    for (let i = colOf(x) - n; i <= colOf(x) + n; i++) {
      if (i < 0 || j < 0 || i >= 130 || j >= 115) continue;
      if (set.has(g.terr[idxOf(i, j)]) && Math.hypot((i + 0.5) * CELL - x, (j + 0.5) * CELL - y) <= r + CELL * 0.5) return true;
    }
  }
  return false;
}

/** Does this point have the kind of ground a scene asks for? */
export function groundOk(kind, x, y) {
  const t = cellT(x, y);
  switch (kind) {
    case 'road':
      return ROADS.has(t);
    case 'roadside':
      return (NATURAL.has(t) || WOODS.has(t)) && near(x, y, ROADS, 70);
    case 'wild':
      return NATURAL.has(t);
    case 'forest':
      return WOODS.has(t);
    case 'street':
      return t === T.PAVED || t === T.ROAD;
    case 'water':
      return NATURAL.has(t) && near(x, y, WATER, 70);
    default:
      return NATURAL.has(t) || WOODS.has(t) || ROADS.has(t);
  }
}

// trees, bushes, rocks and reeds a scene should not be set on top of
let decorGrid = null;
function decorNear(x, y, r) {
  if (!decorGrid) {
    decorGrid = new Map();
    for (const d of world().decor) {
      if (d.kind === 'tuft') continue;
      const k = idxOf(colOf(d.x), rowOf(d.y));
      if (!decorGrid.has(k)) decorGrid.set(k, []);
      decorGrid.get(k).push(d);
    }
  }
  const n = Math.ceil(r / CELL);
  for (let j = rowOf(y) - n; j <= rowOf(y) + n; j++) {
    for (let i = colOf(x) - n; i <= colOf(x) + n; i++) {
      for (const d of decorGrid.get(idxOf(i, j)) || []) if (Math.hypot(d.x - x, d.y - y) < r) return true;
    }
  }
  return false;
}

function timeOk(s, when) {
  if (when === 'day') return !isNight(s);
  if (when === 'night') return isNight(s);
  return true;
}

export function scenesOf(L) {
  if (!L.scenes) L.scenes = [];
  return L.scenes;
}

/** Somewhere to set a scene: ahead of you (or anywhere around), open, the right ground, not on top of anything. */
function findSpot(s, L, def, around) {
  const w = s.world;
  const [hx, hy] = L.heading || [0, -1];
  const base = Math.atan2(hy, hx);
  const taken = [...scenesOf(L).map((sc) => [sc.x, sc.y]), ...POIS.map((p) => [p.x, p.y]), ...MOBS.map((m) => [m.x, m.y])];
  for (let k = 0; k < 80; k++) {
    const a = around ? Math.random() * Math.PI * 2 : base + (Math.random() - 0.5) * (k < 40 ? 1.1 : 2.2);
    const dist = (around ? 150 : 240) + Math.random() * 170;
    const x = Math.round(w.x + Math.cos(a) * dist);
    const y = Math.round(w.y + Math.sin(a) * dist);
    if (x < 3 * CELL || y < 3 * CELL || x > WORLD_W - 3 * CELL || y > WORLD_H - 3 * CELL) continue;
    if (!def.regions.includes(regionAt(s, x, y))) continue;
    if (!isReachable(x, y) || collides(s, x, y, 18)) continue;
    if (!groundOk(def.ground, x, y)) continue;
    if (taken.some(([px, py]) => Math.hypot(px - x, py - y) < 150)) continue;
    // whoever is in it must have room to stand, and (if it can be had) not behind a bush
    if (def.actors.some((ac) => ac.a !== 'beast' && ac.prop !== 'hut' && collides(s, x + ac.at[0], y + ac.at[1], 6))) continue;
    const room = def.ground === 'forest' ? 12 : 24;
    if (k < 60 && def.actors.some((ac) => ac.prop !== 'hut' && decorNear(x + ac.at[0], y + ac.at[1], room))) continue;
    return [x, y];
  }
  return null;
}

/**
 * Set the scene for an event, if it has one: somewhere ahead of you (or
 * anywhere around, when you stop to look). Returns the scene, or null if it
 * has none or there is nowhere fit for it.
 */
export function stageScene(s, L, eventId, { around = false } = {}) {
  const def = SCENE_OF_EVENT[eventId];
  if (!def || !timeOk(s, def.when)) return null;
  if (scenesOf(L).some((sc) => sc.def === def)) return null;
  const spot = findSpot(s, L, def, around);
  if (!spot) return null;
  const [x, y] = spot;
  L.sceneSeq = (L.sceneSeq || 0) + 1;
  const sc = {
    uid: L.sceneSeq,
    def,
    x,
    y,
    born: clock(s),
    state: 'idle',
    t: 0,
    fade: 0,
    // among trees: drawn through them, faintly, so it can be found
    inWoods: WOODS.has(cellT(x, y)),
    actors: def.actors.map((ac, n) => ({ ...ac, n, x: x + ac.at[0], y: y + ac.at[1], face: ac.face ?? (ac.at[0] > 4 ? -1 : 1), moving: false })),
  };
  scenesOf(L).push(sc);
  return sc;
}

function stillEligible(s, sc) {
  const ev = EVENTS[sc.def.event];
  return !!ev && eligible(s, ev, ['explore', 'travel'], regionAt(s, sc.x, sc.y));
}

/** Begin a scene's event. */
export function meetScene(s, L, sc) {
  if (!sc || sc.state !== 'idle') return false;
  if (!stillEligible(s, sc)) {
    sc.state = 'after';
    sc.leave = 'vanish';
    return false;
  }
  sc.state = 'met';
  startEvent(s, sc.def.event, { data: { scene: sc.def.id } });
  return true;
}

/** Move along a scene that walks (a fox trotting off down the street). */
function moveStep(s, sc, dt) {
  const m = sc.def.move;
  const lead = sc.actors[0];
  const dx = m.east ? 1 : -1;
  const nx = lead.x + dx * m.speed * dt;
  if (collides(s, nx, lead.y, 6) || !groundOk('any', nx, lead.y) && !groundOk('street', nx, lead.y)) {
    lead.moving = false;
    return;
  }
  for (const ac of sc.actors) {
    ac.x += dx * m.speed * dt;
    ac.face = dx;
    ac.moving = true;
  }
  sc.x = lead.x;
}

/** After its event: people walk off, the dead are buried, the strange simply go. */
function afterStep(s, sc, dt) {
  const how = sc.leave || sc.def.after;
  if (how === 'stay') return;
  if (how === 'vanish') {
    sc.fade += dt * 1.6;
    if (sc.fade >= 1) sc.gone = true;
    return;
  }
  // leave: walk away from where you stand, then fade
  const w = s.world;
  sc.t2 = (sc.t2 || 0) + dt;
  for (const ac of sc.actors) {
    if (ac.a === 'prop' && ac.prop !== 'mule') continue;
    const d = Math.hypot(ac.x - w.x, ac.y - w.y) || 1;
    const vx = (ac.x - w.x) / d;
    const vy = (ac.y - w.y) / d;
    const nx = ac.x + vx * 34 * dt;
    const ny = ac.y + vy * 34 * dt;
    if (!collides(s, nx, ny, 6)) {
      ac.x = nx;
      ac.y = ny;
    }
    ac.face = vx < 0 ? -1 : 1;
    ac.moving = true;
    ac.pose = ac.pose === 'lie' ? 'lie' : 'stand';
  }
  if (sc.t2 > 4) sc.fade += dt * 1.2;
  if (sc.fade >= 1) sc.gone = true;
}

/**
 * Run the scenes for a frame. Returns true if one of them began its event
 * (the caller stops walking).
 */
export function updateScenes(s, L, dt) {
  const w = s.world;
  const list = scenesOf(L);
  const now = clock(s);
  for (let i = list.length - 1; i >= 0; i--) {
    const sc = list[i];
    sc.t += dt;
    const d = Math.hypot(sc.x - w.x, sc.y - w.y);
    // forgotten: you walked well away, or it has waited long enough
    if (sc.gone || d > 1300 || (sc.state === 'idle' && now - sc.born > sc.def.life && d > 380)) {
      list.splice(i, 1);
      continue;
    }
    if (sc.state === 'met') {
      if (!s.pending) sc.state = 'after';
      continue;
    }
    if (sc.state === 'after') {
      afterStep(s, sc, dt);
      continue;
    }
    if (sc.def.move) moveStep(s, sc, dt);
    if (sc.def.start === 'near' && d < sc.def.radius && meetScene(s, L, sc)) return true;
  }
  return false;
}

/** Scenes you could walk up to and act on. */
export function sceneTargets(s, L) {
  return scenesOf(L)
    .filter((sc) => sc.state === 'idle' && sc.def.start === 'touch')
    .map((sc) => ({ kind: 'scene', id: sc.uid, x: sc.x, y: sc.y, name: sc.def.name, verb: sc.def.verb || '上前', reach: 72 }));
}

export function sceneByUid(L, uid) {
  return scenesOf(L).find((sc) => sc.uid === uid) || null;
}
