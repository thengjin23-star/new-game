// The ground of the world: a grid of terrain and regions built from geo.js,
// and what stands on it (trees, mountains, herb spots). Pure, deterministic
// data, built once on first use; the save never stores any of it.

import {
  WORLD_W, WORLD_H, CELL, COLS, ROWS, T, TERRAIN, REGION_SHAPES, PEAKS, CLIFF_LINES,
  VALLEY, SECT, RIVERS, LAKES, ROADS, BORDER, MARKET_WALL,
} from './geo.js';
import { STRUCTURES, POIS, GATHER, NPC_SPOTS } from './places.js';

export const PLAYER_R = 12;

// ── noise ──

export function hash2(i, j, salt = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(salt | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function vnoise(x, y, salt = 0) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j, salt);
  const b = hash2(i + 1, j, salt);
  const c = hash2(i, j + 1, salt);
  const d = hash2(i + 1, j + 1, salt);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, salt = 0) {
  return 0.55 * vnoise(x, y, salt) + 0.3 * vnoise(x * 2.1, y * 2.1, salt + 7) + 0.15 * vnoise(x * 4.3, y * 4.3, salt + 13);
}

// ── geometry ──

/** Catmull-Rom through the points, so roads and rivers bend instead of kinking. */
export function smoothPath(pts, steps = 6) {
  if (pts.length < 3) return pts.map((p) => [p[0], p[1]]);
  const out = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[k - 1] || pts[k];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[k + 2] || pts[k + 1];
    for (let n = 0; n < steps; n++) {
      const t = n / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const last = pts[pts.length - 1];
  out.push([last[0], last[1]]);
  return out;
}

export function insidePoly(poly, x, y) {
  let inside = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a];
    const [xb, yb] = poly[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
}

function ellipseE(cx, cy, rx, ry, x, y) {
  return Math.hypot((x - cx) / rx, (y - cy) / ry);
}

export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inShape(r, x, y) {
  if (r.poly) return insidePoly(r.poly, x, y);
  if (r.circle) return Math.hypot(x - r.circle[0], y - r.circle[1]) <= r.circle[2];
  if (r.ellipse) return ellipseE(...r.ellipse, x, y) <= 1;
  return false;
}

// ── the grid ──

export const REGION_IDS = REGION_SHAPES.map((r) => r.id);
const RIDX = Object.fromEntries(REGION_IDS.map((id, k) => [id, k]));
const NATURAL = new Set([T.GRASS, T.TALLGRASS, T.HILL, T.FOREST, T.DEEP, T.FARM, T.WASTE, T.SAND]);

export const idxOf = (i, j) => j * COLS + i;
export const cellX = (i) => (i + 0.5) * CELL;
export const cellY = (j) => (j + 0.5) * CELL;
export const colOf = (x) => Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));
export const rowOf = (y) => Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)));

const BASE = {
  qingshi_town: () => T.GRASS,
  luoxia_market: () => T.PAVED,
  qingxu_temple: () => T.GRASS,
  fox_shrine: (x, y) => (fbm(x / 160, y / 160, 3) > 0.6 ? T.GRASS : T.TALLGRASS),
  mirror_lake: (x, y) => (fbm(x / 200, y / 200, 4) > 0.6 ? T.TALLGRASS : T.GRASS),
  crane_ferry: (x, y) => (fbm(x / 180, y / 180, 5) > 0.52 ? T.GRASS : T.SAND),
  farmland: () => T.FARM,
  lingxi_valley: (x, y) => (fbm(x / 140, y / 140, 6) > 0.58 ? T.FOREST : T.GRASS),
  qingyun_sect: (x, y) => (fbm(x / 200, y / 200, 7) > 0.55 ? T.FOREST : T.GRASS),
  ancient_ruins: (x, y) => (fbm(x / 220, y / 220, 8) > 0.64 ? T.TALLGRASS : T.WASTE),
  black_forest: (x, y) => (fbm(x / 260, y / 260, 9) > 0.55 ? T.DEEP : T.FOREST),
  qingshi_hill: (x, y) => {
    const n = fbm(x / 240, y / 240, 10);
    return n > 0.58 ? T.FOREST : n < 0.36 ? T.GRASS : T.HILL;
  },
  wilds: (x, y) => {
    const n = fbm(x / 320, y / 320, 11);
    const m = fbm(x / 180, y / 180, 12);
    if (n > 0.63) return T.FOREST;
    if (m > 0.62) return T.TALLGRASS;
    if (n < 0.34) return T.HILL;
    return T.GRASS;
  },
};

let G = null;

/** The built world (lazily). */
export function world() {
  if (!G) G = build();
  return G;
}

function build() {
  const N = COLS * ROWS;
  const terr = new Uint8Array(N).fill(T.GRASS);
  const reg = new Uint8Array(N).fill(RIDX.wilds);
  const greatRiver = new Uint8Array(N);
  const statics = REGION_SHAPES.filter((r) => !r.requires && !r.default && !r.fromTerrain);

  // regions and their ground
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const x = cellX(i);
      const y = cellY(j);
      let id = 'wilds';
      for (const r of statics) {
        if (inShape(r, x, y)) {
          id = r.id;
          break;
        }
      }
      const k = idxOf(i, j);
      reg[k] = RIDX[id];
      terr[k] = (BASE[id] || BASE.wilds)(x, y);
    }
  }

  const each = (fn) => {
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) fn(idxOf(i, j), cellX(i), cellY(j), i, j);
  };

  // the world's edge: mountains north, west and south
  each((k, x, y) => {
    const north = BORDER.north + 80 * vnoise(x / 300, 1.5, 21);
    const west = BORDER.west + 80 * vnoise(y / 300, 2.5, 22);
    const south = BORDER.south - 80 * vnoise(x / 300, 3.5, 23);
    if (y < north || x < west || y > south) terr[k] = T.PEAK;
  });

  // mountains
  for (const [cx, cy, rx, ry] of PEAKS) {
    each((k, x, y) => {
      if (Math.abs(x - cx) > rx * 1.3 || Math.abs(y - cy) > ry * 1.3) return;
      const wob = 0.86 + 0.28 * fbm(x / 90, y / 90, 31);
      if (ellipseE(cx, cy, rx, ry, x, y) < wob) terr[k] = T.PEAK;
    });
  }

  // 青雲宗: the massif, its plateau
  each((k, x, y) => {
    if (insidePoly(SECT.massif, x, y)) terr[k] = T.PEAK;
    const e = ellipseE(...SECT.plateau, x, y);
    if (e < 1) terr[k] = e < 0.5 ? T.PAVED : fbm(x / 120, y / 120, 41) > 0.6 ? T.FOREST : T.GRASS;
  });

  // 靈溪谷's ring of cliffs, open at the gorge
  const gorgeAng = Math.atan2(VALLEY.gorge[1] - VALLEY.cy, VALLEY.gorge[0] - VALLEY.cx);
  each((k, x, y) => {
    const e = ellipseE(VALLEY.cx, VALLEY.cy, VALLEY.rx, VALLEY.ry, x, y);
    if (e < 1 || e > 1 + VALLEY.ring) return;
    const a = Math.atan2(y - VALLEY.cy, x - VALLEY.cx);
    let d = Math.abs(a - gorgeAng);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > VALLEY.gorgeHalf) terr[k] = T.CLIFF;
  });

  // 斷魂崖
  for (const [[ax, ay], [bx, by], thick] of CLIFF_LINES) {
    each((k, x, y) => {
      if (segDist(x, y, ax, ay, bx, by) < thick / 2 + 4) terr[k] = T.CLIFF;
    });
  }

  // lakes, with a sandy rim
  for (const [cx, cy, rx, ry] of LAKES) {
    each((k, x, y) => {
      if (Math.abs(x - cx) > rx * 1.3 || Math.abs(y - cy) > ry * 1.3) return;
      const e = ellipseE(cx, cy, rx, ry, x, y);
      const edge = 0.9 + 0.1 * fbm(x / 70, y / 70, 51);
      if (e < edge) terr[k] = T.WATER;
      else if (e < 1.12 && NATURAL.has(terr[k])) terr[k] = T.SAND;
    });
  }

  // rivers
  const rivers = RIVERS.map((r) => ({ ...r, path: smoothPath(r.pts, 8) }));
  for (const r of rivers) {
    const hw = r.width / 2;
    const reach = r.id === 'great' ? hw + 55 : hw;
    stamp(r.path, reach, (k, d) => {
      if (d < hw) {
        terr[k] = T.WATER;
        if (r.id === 'great') greatRiver[k] = 1;
      } else if (NATURAL.has(terr[k])) terr[k] = T.SAND;
    });
  }
  // beyond the great river: mist
  for (let j = 0; j < ROWS; j++) {
    let last = -1;
    for (let i = 0; i < COLS; i++) if (greatRiver[idxOf(i, j)]) last = i;
    if (last < 0) continue;
    for (let i = last + 1; i < COLS; i++) {
      terr[idxOf(i, j)] = T.VOID;
      greatRiver[idxOf(i, j)] = 1;
    }
  }

  // 落霞坊市's walls
  const [wx0, wy0, wx1, wy1] = MARKET_WALL;
  each((k, x, y) => {
    if (x < wx0 || x > wx1 || y < wy0 || y > wy1) return;
    if (x - wx0 < CELL || wx1 - x < CELL || y - wy0 < CELL || wy1 - y < CELL) terr[k] = T.WALL;
  });

  // roads and trails carve through everything; over water they are bridges
  const roads = ROADS.map((r) => ({ ...r, path: smoothPath(r.pts, 6) }));
  const ROAD_T = { road: T.ROAD, trail: T.TRAIL, lane: T.PAVED, pier: T.BRIDGE };
  for (const r of roads) {
    const rad = Math.max(r.width / 2, CELL * 0.72);
    stamp(r.path, rad, (k) => {
      const t = terr[k];
      if (t === T.WATER) terr[k] = T.BRIDGE;
      else if (r.kind === 'pier') {
        if (t !== T.BRIDGE) terr[k] = t === T.VOID ? T.VOID : T.SAND;
      } else if (t !== T.BRIDGE && t !== T.VOID) terr[k] = ROAD_T[r.kind];
    });
  }

  // painted areas (courtyards, platforms)
  for (const st of STRUCTURES) {
    if (!st.paint) continue;
    each((k, x, y) => {
      if (Math.abs(x - st.x) <= st.w / 2 && Math.abs(y - st.y) <= st.h / 2) terr[k] = st.paint;
    });
  }

  // 青雲宗's gate
  each((k, x, y) => {
    if (Math.abs(y - SECT.gateY) < 22 && x >= SECT.gateX[0] && x <= SECT.gateX[1] && terr[k] === T.ROAD) terr[k] = T.GATE;
  });

  // the great river is a region of its own
  for (let k = 0; k < N; k++) if (greatRiver[k]) reg[k] = RIDX.great_river;

  // buildings are solid rectangles
  const solids = STRUCTURES.filter((st) => st.sprite && st.block !== false).map((st) => ({
    x0: st.x - st.w / 2, y0: st.y - st.h / 2, x1: st.x + st.w / 2, y1: st.y + st.h / 2,
  }));
  const solidCell = new Uint8Array(N);
  for (const r of solids) {
    for (let j = rowOf(r.y0 - PLAYER_R); j <= rowOf(r.y1 + PLAYER_R); j++) {
      for (let i = colOf(r.x0 - PLAYER_R); i <= colOf(r.x1 + PLAYER_R); i++) {
        const x = cellX(i);
        const y = cellY(j);
        if (x > r.x0 - PLAYER_R && x < r.x1 + PLAYER_R && y > r.y0 - PLAYER_R && y < r.y1 + PLAYER_R) solidCell[idxOf(i, j)] = 1;
      }
    }
  }

  const g = { terr, reg, solids, solidCell, rivers, roads };
  g.reach = reachable(g);
  g.regionCells = countRegionCells(g);
  g.decor = makeDecor(g);
  g.mountains = makeMountains(g);
  g.herbs = makeHerbs(g);
  return g;

  /** Call fn(k, distance) for cells whose centre lies within rad of a path. */
  function stamp(path, rad, fn) {
    const best = new Map();
    for (let n = 1; n < path.length; n++) {
      const [ax, ay] = path[n - 1];
      const [bx, by] = path[n];
      const i0 = colOf(Math.min(ax, bx) - rad);
      const i1 = colOf(Math.max(ax, bx) + rad);
      const j0 = rowOf(Math.min(ay, by) - rad);
      const j1 = rowOf(Math.max(ay, by) + rad);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const d = segDist(cellX(i), cellY(j), ax, ay, bx, by);
          if (d > rad) continue;
          const k = idxOf(i, j);
          const prev = best.get(k);
          if (prev === undefined || d < prev) best.set(k, d);
        }
      }
    }
    for (const [k, d] of best) fn(k, d);
  }
}

/** Cells the player can ever stand on, flooding out from the temple (gate open). */
function reachable(g) {
  const N = COLS * ROWS;
  const seen = new Uint8Array(N);
  const start = idxOf(colOf(1060), rowOf(3205));
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const k = queue.pop();
    const i = k % COLS;
    const j = (k - i) / COLS;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue;
      const nk = idxOf(ni, nj);
      if (seen[nk] || !cellOpen(g, nk, true)) continue;
      seen[nk] = 1;
      queue.push(nk);
    }
  }
  return seen;
}

function cellOpen(g, k, gateOpen) {
  const t = g.terr[k];
  if (t === T.GATE) return gateOpen;
  return TERRAIN[t].pass && !g.solidCell[k];
}

function countRegionCells(g) {
  const counts = {};
  for (let k = 0; k < g.terr.length; k++) {
    if (!g.reach[k]) continue;
    const id = REGION_IDS[g.reg[k]];
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

// ── queries ──

export function regionIdAt(x, y) {
  const g = world();
  return REGION_IDS[g.reg[idxOf(colOf(x), rowOf(y))]];
}

const HIDDEN_REGIONS = REGION_SHAPES.filter((r) => r.requires);

/** The region the player counts as being in (hidden ones appear once their flag is set). */
export function regionAt(s, x, y) {
  for (const r of HIDDEN_REGIONS) if (s.flags[r.requires] && inShape(r, x, y)) return r.id;
  return regionIdAt(x, y);
}

export function terrainAt(x, y) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return T.VOID;
  return world().terr[idxOf(colOf(x), rowOf(y))];
}

export function speedAt(x, y) {
  return TERRAIN[terrainAt(x, y)].speed || 0.5;
}

/** Is this cell a wall for this player (the sect gate opens for members)? */
function cellBlocked(g, i, j, gateOpen) {
  if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return true;
  const t = g.terr[idxOf(i, j)];
  if (t === T.GATE) return !gateOpen;
  return !TERRAIN[t].pass;
}

/** Does a circle at (x, y) overlap anything solid? */
export function collides(s, x, y, r = PLAYER_R) {
  const g = world();
  const gateOpen = !!s?.flags?.sect_member;
  if (x - r < 0 || y - r < 0 || x + r >= WORLD_W || y + r >= WORLD_H) return true;
  const i0 = colOf(x - r);
  const i1 = colOf(x + r);
  const j0 = rowOf(y - r);
  const j1 = rowOf(y + r);
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      if (!cellBlocked(g, i, j, gateOpen)) continue;
      const nx = Math.max(i * CELL, Math.min(x, (i + 1) * CELL));
      const ny = Math.max(j * CELL, Math.min(y, (j + 1) * CELL));
      if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
    }
  }
  for (const b of g.solids) {
    if (x + r < b.x0 || x - r > b.x1 || y + r < b.y0 || y - r > b.y1) continue;
    const nx = Math.max(b.x0, Math.min(x, b.x1));
    const ny = Math.max(b.y0, Math.min(y, b.y1));
    if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
  }
  return false;
}

/** Can the player ever stand here (ignoring the gate)? */
export function isReachable(x, y) {
  const g = world();
  return !!g.reach[idxOf(colOf(x), rowOf(y))];
}

function pathOpen(g, k, gateOpen) {
  const t = g.terr[k];
  if (t === T.GATE) return gateOpen;
  return TERRAIN[t].pass && !g.solidCell[k];
}

/** The nearest open spot to (x, y), searching outwards cell by cell. */
export function nearestOpen(s, x, y, maxRing = 12) {
  const g = world();
  const gateOpen = !!s?.flags?.sect_member;
  const ci = colOf(x);
  const cj = rowOf(y);
  if (pathOpen(g, idxOf(ci, cj), gateOpen) && !collides(s, x, y)) return [x, y];
  for (let ring = 1; ring <= maxRing; ring++) {
    let best = null;
    let bd = Infinity;
    for (let j = cj - ring; j <= cj + ring; j++) {
      for (let i = ci - ring; i <= ci + ring; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== ring) continue;
        if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
        if (!pathOpen(g, idxOf(i, j), gateOpen)) continue;
        const px = cellX(i);
        const py = cellY(j);
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < bd && !collides(s, px, py)) {
          bd = d;
          best = [px, py];
        }
      }
    }
    if (best) return best;
  }
  return null;
}

// A* over cells; roads are cheaper, so paths follow them like people do.
const MAX_SPEED = 1.3;

export function findPath(s, x0, y0, x1, y1) {
  const g = world();
  const gateOpen = !!s?.flags?.sect_member;
  const goal = nearestOpen(s, x1, y1);
  if (!goal) return null;
  const [gx, gy] = goal;
  const si = colOf(x0);
  const sj = rowOf(y0);
  const gi = colOf(gx);
  const gj = rowOf(gy);
  const N = COLS * ROWS;
  const start = idxOf(si, sj);
  const target = idxOf(gi, gj);
  if (start === target) return [[gx, gy]];
  const cost = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = new Heap();
  cost[start] = 0;
  heap.push(start, 0);
  const h = (i, j) => (Math.hypot(i - gi, j - gj) * CELL) / MAX_SPEED;
  let found = false;
  let guard = 0;
  while (heap.size && guard++ < N * 2) {
    const k = heap.pop();
    if (k === target) {
      found = true;
      break;
    }
    if (closed[k]) continue;
    closed[k] = 1;
    const i = k % COLS;
    const j = (k - i) / COLS;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue;
        const nk = idxOf(ni, nj);
        if (closed[nk] || (!pathOpen(g, nk, gateOpen) && nk !== start)) continue;
        if (di && dj && (!pathOpen(g, idxOf(i + di, j), gateOpen) || !pathOpen(g, idxOf(i, j + dj), gateOpen))) continue;
        const step = (di && dj ? Math.SQRT2 : 1) * CELL;
        const sp = (TERRAIN[g.terr[k]].speed + TERRAIN[g.terr[nk]].speed) / 2 || 0.5;
        const c = cost[k] + step / sp;
        if (c < cost[nk]) {
          cost[nk] = c;
          prev[nk] = k;
          heap.push(nk, c + h(ni, nj));
        }
      }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = target; k !== -1 && k !== start; k = prev[k]) cells.push(k);
  cells.reverse();
  const pts = cells.map((k) => [cellX(k % COLS), cellY(Math.floor(k / COLS))]);
  pts[pts.length - 1] = [gx, gy];
  return smoothWaypoints(s, [x0, y0], pts);
}

/** Drop waypoints the walker can skip without leaving equally fast ground. */
function smoothWaypoints(s, from, pts) {
  const out = [];
  let cur = from;
  let a = 0;
  while (a < pts.length) {
    let b = a;
    for (let k = pts.length - 1; k > a; k--) {
      if (k - a > 14) continue;
      if (clearLine(s, cur, pts[k], minSpeed(pts, a, k))) {
        b = k;
        break;
      }
    }
    out.push(pts[b]);
    cur = pts[b];
    a = b + 1;
  }
  return out;
}

function minSpeed(pts, a, b) {
  let m = Infinity;
  for (let k = a; k <= b; k++) m = Math.min(m, speedAt(pts[k][0], pts[k][1]));
  return m;
}

export function clearLine(s, [ax, ay], [bx, by], needSpeed = 0) {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(d / 10));
  for (let k = 1; k <= n; k++) {
    const x = ax + ((bx - ax) * k) / n;
    const y = ay + ((by - ay) * k) / n;
    if (collides(s, x, y)) return false;
    if (needSpeed && speedAt(x, y) < needSpeed - 1e-6) return false;
  }
  return true;
}

class Heap {
  constructor() {
    this.k = [];
    this.p = [];
  }
  get size() {
    return this.k.length;
  }
  push(key, pri) {
    const { k, p } = this;
    k.push(key);
    p.push(pri);
    let n = k.length - 1;
    while (n > 0) {
      const up = (n - 1) >> 1;
      if (p[up] <= p[n]) break;
      [k[up], k[n]] = [k[n], k[up]];
      [p[up], p[n]] = [p[n], p[up]];
      n = up;
    }
  }
  pop() {
    const { k, p } = this;
    const top = k[0];
    const lk = k.pop();
    const lp = p.pop();
    if (k.length) {
      k[0] = lk;
      p[0] = lp;
      let n = 0;
      for (;;) {
        const l = 2 * n + 1;
        const r = l + 1;
        let m = n;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === n) break;
        [k[m], k[n]] = [k[n], k[m]];
        [p[m], p[n]] = [p[n], p[m]];
        n = m;
      }
    }
    return top;
  }
}

// ── what stands on the ground ──

/** Places that should stay clear of trees: POIs, people, buildings. */
function clearings() {
  const pts = POIS.map((p) => [p.x, p.y, 60]);
  for (const spots of Object.values(NPC_SPOTS)) for (const [x, y] of Object.values(spots)) pts.push([x, y, 50]);
  for (const st of STRUCTURES) pts.push([st.x, st.y, Math.max(st.w, st.h) / 2 + 30]);
  return pts;
}

function nearAny(list, x, y) {
  for (const [px, py, r] of list) if ((px - x) ** 2 + (py - y) ** 2 < r * r) return true;
  return false;
}

const TREE_MIX = {
  black_forest: [['pine', 50], ['dark', 25], ['leaf', 15], ['dead', 10]],
  qingshi_hill: [['pine', 55], ['leaf', 45]],
  lingxi_valley: [['bamboo', 45], ['leaf', 35], ['pine', 20]],
  qingyun_sect: [['pine', 75], ['leaf', 25]],
  ancient_ruins: [['dead', 100]],
  wilds: [['leaf', 60], ['pine', 40]],
  qingshi_town: [['willow', 60], ['leaf', 40]],
  farmland: [['willow', 70], ['leaf', 30]],
  mirror_lake: [['willow', 70], ['leaf', 30]],
  fox_shrine: [['leaf', 50], ['dead', 20], ['pine', 30]],
  crane_ferry: [['willow', 60], ['leaf', 40]],
  qingxu_temple: [['pine', 70], ['leaf', 30]],
};

function pickMix(mix, r) {
  let total = 0;
  for (const [, w] of mix) total += w;
  let x = r * total;
  for (const [k, w] of mix) {
    x -= w;
    if (x < 0) return k;
  }
  return mix[mix.length - 1][0];
}

function makeDecor(g) {
  const out = [];
  const clear = clearings();
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const k = idxOf(i, j);
      const t = g.terr[k];
      const region = REGION_IDS[g.reg[k]];
      const mix = TREE_MIX[region] || TREE_MIX.wilds;
      const r0 = hash2(i, j, 101);
      const place = (kind, n, salt, scale = 1) => {
        for (let m = 0; m < n; m++) {
          const x = cellX(i) + (hash2(i, j, salt + m * 3) - 0.5) * CELL * 0.9;
          const y = cellY(j) + (hash2(i, j, salt + m * 3 + 1) - 0.5) * CELL * 0.9;
          if (nearAny(clear, x, y)) continue;
          out.push({ kind, x, y, v: Math.floor(hash2(i, j, salt + m * 3 + 2) * 8), s: scale * (0.8 + hash2(i, j, salt + m + 9) * 0.45) });
        }
      };
      const nearWater = hasNeighbor(g, i, j, (nt) => nt === T.WATER);
      switch (t) {
        case T.FOREST:
          place(pickMix(mix, r0), r0 < 0.75 ? 1 : 2, 110);
          if (hash2(i, j, 120) < 0.3) place('bush', 1, 130, 0.9);
          break;
        case T.DEEP:
          place(region === 'black_forest' ? pickMix([['dark', 60], ['pine', 40]], r0) : pickMix(mix, r0), 2, 140, 1.15);
          if (r0 < 0.4) place('dark', 1, 150, 1.25);
          break;
        case T.HILL:
          if (r0 < 0.16) place(pickMix(mix, hash2(i, j, 160)), 1, 161);
          else if (r0 < 0.28) place('rock', 1, 162);
          else if (r0 < 0.5) place('tuft', 1, 163);
          break;
        case T.GRASS:
          if (r0 < 0.035) place(pickMix(mix, hash2(i, j, 170)), 1, 171);
          else if (r0 < 0.08) place('bush', 1, 172);
          else if (r0 < 0.26 && region !== 'qingshi_town') place('tuft', 1, 173);
          else if (r0 < 0.3 && nearWater) place('reed', 2, 174);
          break;
        case T.TALLGRASS:
          if (r0 < 0.55) place('reed', r0 < 0.2 ? 2 : 1, 180);
          else if (r0 < 0.6) place('bush', 1, 181);
          else if (r0 < 0.63) place(pickMix(mix, hash2(i, j, 182)), 1, 183);
          break;
        case T.WASTE:
          if (region === 'ancient_ruins') {
            if (r0 < 0.24) place('sword', r0 < 0.08 ? 2 : 1, 190);
            else if (r0 < 0.27) place('pillar', 1, 191);
            else if (r0 < 0.32) place('bones', 1, 192);
            else if (r0 < 0.36) place('dead', 1, 193);
            else if (r0 < 0.46) place('rock', 1, 194);
          } else if (r0 < 0.1) place('rock', 1, 195);
          break;
        case T.SAND:
          if (nearWater && r0 < 0.3) place('reed', 2, 200);
          else if (r0 < 0.07) place('rock', 1, 201, 0.8);
          break;
        case T.FARM:
          if (r0 < 0.008) place('scarecrow', 1, 210);
          else if (r0 < 0.02) place('willow', 1, 211);
          break;
        default:
          break;
      }
    }
  }
  return out;
}

function hasNeighbor(g, i, j, test) {
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const ni = i + di;
      const nj = j + dj;
      if ((di || dj) && ni >= 0 && nj >= 0 && ni < COLS && nj < ROWS && test(g.terr[idxOf(ni, nj)])) return true;
    }
  }
  return false;
}

/**
 * Mountains are drawn the way old maps draw them: little upright peaks
 * standing on the land. One per stretch of mountain edge, bigger ones inside.
 */
function makeMountains(g) {
  const out = [];
  const solid = (i, j) => {
    if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return true;
    const t = g.terr[idxOf(i, j)];
    return t === T.PEAK || t === T.CLIFF || t === T.VOID;
  };
  const isPeak = (i, j) => i >= 0 && j >= 0 && i < COLS && j < ROWS && g.terr[idxOf(i, j)] === T.PEAK;
  const isCliff = (i, j) => i >= 0 && j >= 0 && i < COLS && j < ROWS && g.terr[idxOf(i, j)] === T.CLIFF;
  // distance (in cells) to the nearest open cell, up to 6
  const depth = (i, j) => {
    for (let d = 1; d <= 6; d++) {
      for (let dj = -d; dj <= d; dj++) {
        for (let di = -d; di <= d; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== d) continue;
          if (!solid(i + di, j + dj)) return d;
        }
      }
    }
    return 7;
  };
  const taken = [];
  const free = (x, y, r) => !taken.some(([tx, ty, tr]) => (tx - x) ** 2 + (ty - y) ** 2 < (r + tr) ** 2 * 0.36);
  // how far the mountain may spread sideways before it would cover open ground in its row
  const span = (i, j) => {
    let l = 0;
    while (l < 8 && solid(i - l - 1, j)) l++;
    let r = 0;
    while (r < 8 && solid(i + r + 1, j)) r++;
    return [l, r];
  };
  // edge peaks: a south-facing edge (open ground below) gets a peak standing on it
  for (let j = ROWS - 1; j >= 0; j--) {
    for (let i = 0; i < COLS; i++) {
      if (!isPeak(i, j)) continue;
      const edge = !solid(i, j + 1) || !solid(i - 1, j) || !solid(i + 1, j);
      const d = edge ? 1 : depth(i, j);
      const n = hash2(i, j, 300);
      const x = cellX(i) + (n - 0.5) * CELL * 0.6;
      const y = cellY(j) + CELL * 0.35;
      const [l, r] = span(i, j);
      const maxHalf = (Math.min(l, r) + 1.2) * CELL;
      let w;
      if (d <= 1) w = 120 + n * 110;
      else if (d <= 3) w = 190 + n * 130;
      else w = 260 + n * 160;
      w = Math.min(w, maxHalf * 2 + 60);
      if (w < 90) continue;
      const rr = w * 0.5;
      if (!free(x, y, rr)) continue;
      taken.push([x, y, rr]);
      const h = w * (0.62 + hash2(i, j, 301) * 0.42) + (d > 3 ? 60 : 0);
      out.push({ kind: 'mount', x, y, w, h, v: Math.floor(hash2(i, j, 302) * 12) });
    }
  }
  // cliffs
  for (let j = ROWS - 1; j >= 0; j--) {
    for (let i = 0; i < COLS; i++) {
      if (!isCliff(i, j)) continue;
      const x = cellX(i);
      const y = cellY(j) + CELL * 0.3;
      if (!free(x, y, 46)) continue;
      taken.push([x, y, 46]);
      const n = hash2(i, j, 310);
      out.push({ kind: 'cliff', x, y, w: 96 + n * 40, h: 80 + n * 50, v: Math.floor(hash2(i, j, 311) * 6) });
    }
  }
  // 斷魂崖 stands taller than the rest
  for (const [[ax, ay], [bx, by]] of CLIFF_LINES) {
    out.push({ kind: 'bigcliff', x: (ax + bx) / 2, y: Math.max(ay, by) + 14, w: Math.hypot(bx - ax, by - ay) + 90, h: 300, v: 0 });
  }
  return out;
}

function makeHerbs(g) {
  const clear = clearings();
  const GOOD = new Set([T.GRASS, T.HILL, T.FOREST, T.DEEP, T.TALLGRASS, T.SAND, T.FARM]);
  const out = [];
  for (const [region, conf] of Object.entries(GATHER)) {
    const cand = [];
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const k = idxOf(i, j);
        if (REGION_IDS[g.reg[k]] !== region || !GOOD.has(g.terr[k]) || !g.reach[k] || g.solidCell[k]) continue;
        if (hasNeighbor(g, i, j, (t) => t === T.ROAD || t === T.PAVED)) continue;
        const x = cellX(i) + (hash2(i, j, 400) - 0.5) * CELL * 0.5;
        const y = cellY(j) + (hash2(i, j, 401) - 0.5) * CELL * 0.5;
        if (nearAny(clear, x, y)) continue;
        cand.push({ x, y, r: hash2(i, j, 402) });
      }
    }
    cand.sort((a, b) => a.r - b.r);
    const chosen = [];
    for (const c of cand) {
      if (chosen.length >= conf.n) break;
      if (chosen.some((o) => (o.x - c.x) ** 2 + (o.y - c.y) ** 2 < 200 * 200)) continue;
      chosen.push(c);
    }
    for (const c of chosen) out.push({ id: out.length, region, x: Math.round(c.x), y: Math.round(c.y) });
  }
  return out;
}

/** For tools and tests: one character per cell. */
export function asciiMap() {
  const g = world();
  const ch = {
    [T.VOID]: ' ', [T.GRASS]: '.', [T.ROAD]: '=', [T.FARM]: '"', [T.FOREST]: 'f', [T.DEEP]: 'F', [T.HILL]: ',',
    [T.PEAK]: '^', [T.CLIFF]: '#', [T.WATER]: '~', [T.SAND]: ':', [T.WASTE]: '_', [T.PAVED]: '+', [T.BRIDGE]: 'H',
    [T.WALL]: '|', [T.GATE]: 'G', [T.TRAIL]: '-', [T.TALLGRASS]: ';',
  };
  const lines = [];
  for (let j = 0; j < ROWS; j++) {
    let line = '';
    for (let i = 0; i < COLS; i++) {
      const k = idxOf(i, j);
      line += g.solidCell[k] && TERRAIN[g.terr[k]].pass ? 'B' : ch[g.terr[k]];
    }
    lines.push(line);
  }
  return lines.join('\n');
}
