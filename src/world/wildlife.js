// 生靈: the small lives of the wild. Deer at the edge of the woods, a hare
// in the grass, egrets in the shallows, crows over the old battlefield, a
// fox crossing the road at night. They are only ever around you — they come
// into being out of sight and are gone once you have walked on — and they
// keep their distance: come too close and they bolt, or take wing.
//
// Nothing here is saved, and nothing here touches the save.

import { WORLD_W, WORLD_H, CELL } from './geo.js';
import { regionAt, collides, isReachable } from './terrain.js';
import { groundOk } from './director.js';

const isNight = (s) => s.tod >= 19.5 || s.tod < 5;

/** What lives where: [kind, weight, when, ground, how many together]; cond: only once it holds. */
export const WILDLIFE = {
  qingshi_hill: { n: 4, kinds: [['deer', 3, 'day', 'wild', [1, 2]], ['rabbit', 4, 'any', 'wild', [1, 1]], ['crow', 2, 'day', 'wild', [2, 3]]] },
  black_forest: { n: 2, kinds: [['crow', 4, 'day', 'forest', [2, 4]], ['deer', 1, 'day', 'forest', [1, 1]]] },
  wilds: { n: 4, kinds: [['rabbit', 4, 'any', 'wild', [1, 2]], ['crow', 3, 'day', 'wild', [2, 3]], ['egret', 2, 'day', 'water', [1, 2]], ['deer', 2, 'day', 'wild', [1, 2]], ['redfox', 3, 'night', 'wild', [1, 1]]] },
  farmland: { n: 4, kinds: [['egret', 4, 'day', 'water', [1, 3]], ['crow', 3, 'day', 'wild', [2, 4]], ['rabbit', 2, 'any', 'wild', [1, 1]]] },
  mirror_lake: { n: 4, kinds: [['egret', 4, 'day', 'water', [1, 3]], ['crane', 2, 'day', 'water', [1, 2]]] },
  crane_ferry: { n: 3, kinds: [['crane', 4, 'day', 'water', [1, 3]], ['egret', 2, 'day', 'water', [1, 2]]] },
  // too quiet while the great python rules the pool: no birds, no insects. Once it is settled, they come back.
  lingxi_valley: { n: 4, cond: (s) => !!s.flags.valley_safe, kinds: [['spirit_deer', 2, 'any', 'wild', [1, 1]], ['deer', 3, 'day', 'wild', [1, 3]], ['crane', 2, 'day', 'water', [1, 2]]] },
  fox_shrine: { n: 3, kinds: [['fox', 4, 'night', 'wild', [1, 1]], ['rabbit', 3, 'day', 'wild', [1, 1]], ['crow', 1, 'day', 'wild', [1, 2]]] },
  ancient_ruins: { n: 3, kinds: [['crow', 5, 'day', 'any', [2, 4]]] },
  qingxu_temple: { n: 1, kinds: [['crane', 1, 'day', 'any', [1, 1]], ['rabbit', 2, 'any', 'wild', [1, 1]]] },
};

/** How close you can come before they go, and how they go. */
const SHY = {
  deer: { r: 140, run: 170 },
  spirit_deer: { r: 170, run: 190 },
  rabbit: { r: 90, run: 150 },
  fox: { r: 120, run: 140 },
  redfox: { r: 130, run: 150 },
  egret: { r: 110, fly: true },
  crane: { r: 120, fly: true },
  crow: { r: 100, fly: true },
};
const BIRDS = new Set(['egret', 'crane', 'crow']);

function critters(L) {
  if (!L.critters) L.critters = [];
  return L.critters;
}

/** Put a creature (or a few) down at x, y: for the spawner, and for tests. */
export function spawnCritter(L, kind, x, y, n = 1) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const r = k ? 14 + Math.random() * 20 : 0;
    L.critterSeq = (L.critterSeq || 0) + 1;
    const c = { id: L.critterSeq, kind, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, hx: x, hy: y, face: Math.random() < 0.5 ? -1 : 1, moving: false, fly: 0, fade: 0, state: 'idle', wait: Math.random() * 3, t: 0, seed: Math.random() * 10 };
    critters(L).push(c);
    out.push(c);
  }
  return out;
}

function pickKind(s, conf) {
  const night = isNight(s);
  const ok = conf.kinds.filter(([, , when]) => when === 'any' || (when === 'night') === night);
  const total = ok.reduce((a, k) => a + k[1], 0);
  let r = Math.random() * total;
  for (const k of ok) if ((r -= k[1]) <= 0) return k;
  return null;
}

/** Somewhere out of the way to set a creature down: around you, not on top of you. */
function spawnSpot(s, region, ground) {
  const w = s.world;
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * Math.PI * 2;
    const d = 350 + Math.random() * 450;
    const x = w.x + Math.cos(a) * d;
    const y = w.y + Math.sin(a) * d;
    if (x < 2 * CELL || y < 2 * CELL || x > WORLD_W - 2 * CELL || y > WORLD_H - 2 * CELL) continue;
    if (regionAt(s, x, y) !== region || !isReachable(x, y) || collides(s, x, y, 8)) continue;
    if (!groundOk(ground, x, y)) continue;
    return [x, y];
  }
  return null;
}

function updateSpawns(s, L, dt) {
  L.wildT = (L.wildT ?? 0.5) - dt;
  if (L.wildT > 0) return;
  L.wildT = 1.2 + Math.random();
  const w = s.world;
  const conf = WILDLIFE[regionAt(s, w.x, w.y)];
  if (!conf || (conf.cond && !conf.cond(s))) return;
  const near = critters(L).filter((c) => Math.hypot(c.x - w.x, c.y - w.y) < 900 && c.state !== 'gone').length;
  // fewer about at night
  const want = isNight(s) ? Math.ceil(conf.n / 2) : conf.n;
  if (near >= want) return;
  const pick = pickKind(s, conf);
  if (!pick) return;
  const [kind, , , ground, [lo, hi]] = pick;
  const spot = spawnSpot(s, regionAt(s, w.x, w.y), ground);
  if (!spot) return;
  spawnCritter(L, kind, spot[0], spot[1], lo + Math.floor(Math.random() * (hi - lo + 1)));
}

function updateCritter(s, c, dt, walking) {
  const w = s.world;
  const shy = SHY[c.kind];
  const d = Math.hypot(c.x - w.x, c.y - w.y);
  c.t += dt;
  if (c.state === 'idle') {
    // too close: off they go (someone walking startles them sooner than someone standing still)
    if (d < shy.r * (walking ? 1 : 0.6)) {
      c.state = 'flee';
      c.t = 0;
      c.face = c.x < w.x ? -1 : 1;
    } else {
      if (c.wait > 0) {
        c.wait -= dt;
        c.moving = false;
        return;
      }
      if (BIRDS.has(c.kind) && c.kind !== 'crow') {
        // waders stand; now and then a step
        c.wait = 2 + Math.random() * 5;
        return;
      }
      if (!c.tx) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 60;
        c.tx = c.hx + Math.cos(a) * r;
        c.ty = c.hy + Math.sin(a) * r;
      }
      const dd = Math.hypot(c.tx - c.x, c.ty - c.y);
      if (dd < 2 || collides(s, c.x + ((c.tx - c.x) / dd) * 3, c.y + ((c.ty - c.y) / dd) * 3, 6)) {
        c.tx = null;
        c.wait = 1.5 + Math.random() * 4;
        c.moving = false;
        return;
      }
      const sp = (c.kind === 'rabbit' ? 30 : 16) * dt;
      c.x += ((c.tx - c.x) / dd) * sp;
      c.y += ((c.ty - c.y) / dd) * sp;
      c.face = c.tx < c.x ? -1 : 1;
      c.moving = true;
      return;
    }
  }
  if (c.state === 'flee') {
    const vx = (c.x - w.x) / (d || 1);
    const vy = (c.y - w.y) / (d || 1);
    if (shy.fly) {
      // take wing: up and away
      c.fly = Math.min(1, c.fly + dt * 1.4);
      c.x += vx * 110 * dt;
      c.y += vy * 110 * dt - 20 * dt;
      c.moving = true;
      if (c.t > 1.6) c.fade += dt * 1.2;
    } else {
      const nx = c.x + vx * shy.run * dt;
      const ny = c.y + vy * shy.run * dt;
      if (!collides(s, nx, ny, 6)) {
        c.x = nx;
        c.y = ny;
      } else if (!collides(s, nx, c.y, 6)) c.x = nx;
      else if (!collides(s, c.x, ny, 6)) c.y = ny;
      c.moving = true;
      if (c.t > 2) c.fade += dt * 1.5;
    }
    c.face = vx < 0 ? -1 : 1;
    if (c.fade >= 1) c.state = 'gone';
  }
}

/** The wild around you, for a frame. */
export function updateWild(s, L, dt) {
  const walking = !!L.moving;
  const w = s.world;
  updateSpawns(s, L, dt);
  const list = critters(L);
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    // walked on and left behind: gone; and the fox goes home at dawn
    if (c.state === 'gone' || Math.hypot(c.x - w.x, c.y - w.y) > 1100 || ((c.kind === 'fox' || c.kind === 'redfox') && !isNight(s) && c.state === 'idle')) {
      list.splice(i, 1);
      continue;
    }
    updateCritter(s, c, dt, walking);
  }
}

/** The creatures around you now (for drawing). */
export function wildNow(L) {
  return critters(L);
}
