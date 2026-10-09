// 雲霧: which cells of the world the player has seen. The save keeps a
// base64 bitset; the live copy is a byte per cell plus per-region counts.

import { COLS, ROWS, CELL } from './geo.js';
import { world, REGION_IDS, idxOf, colOf, rowOf, cellX, cellY } from './terrain.js';

const N = COLS * ROWS;
const live = new WeakMap();

function decode(b64) {
  const bits = new Uint8Array(N);
  if (!b64) return bits;
  let bin;
  try {
    bin = atob(b64);
  } catch {
    return bits;
  }
  for (let k = 0; k < N; k++) {
    const byte = bin.charCodeAt(k >> 3) || 0;
    if (byte & (1 << (k & 7))) bits[k] = 1;
  }
  return bits;
}

function encode(bits) {
  const bytes = new Uint8Array(Math.ceil(N / 8));
  for (let k = 0; k < N; k++) if (bits[k]) bytes[k >> 3] |= 1 << (k & 7);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** The live fog for a save: { bits, counts }. */
export function fogOf(s) {
  let f = live.get(s.world);
  if (f) return f;
  const g = world();
  const bits = decode(s.world.fog);
  const counts = {};
  for (let k = 0; k < N; k++) {
    if (!bits[k] || !g.reach[k]) continue;
    const id = REGION_IDS[g.reg[k]];
    counts[id] = (counts[id] || 0) + 1;
  }
  f = { bits, counts, version: 0, recent: [] };
  live.set(s.world, f);
  return f;
}

/** Write the live fog back into the save (before serializing). */
export function syncFog(s) {
  if (!s.world) return;
  const f = live.get(s.world);
  if (f) s.world.fog = encode(f.bits);
}

export function isRevealed(s, x, y) {
  return !!fogOf(s).bits[idxOf(colOf(x), rowOf(y))];
}

export function cellRevealed(s, k) {
  return !!fogOf(s).bits[k];
}

/** Share of a region's walkable ground that has been seen, 0–100 (95% seen counts as all). */
export function exploredPct(s, id) {
  const total = world().regionCells[id];
  if (!total) return 0;
  return Math.min(100, Math.floor((100 * (fogOf(s).counts[id] || 0)) / (total * 0.95)));
}

/**
 * Clear the clouds in a circle. Returns how many cells were newly seen and
 * which regions just became fully explored; keeps s.nodes[*].explore in step
 * so event conditions can read it.
 */
export function reveal(s, x, y, r) {
  const g = world();
  const f = fogOf(s);
  const fresh = [];
  const i0 = colOf(x - r);
  const i1 = colOf(x + r);
  const j0 = rowOf(y - r);
  const j1 = rowOf(y + r);
  const touched = new Set();
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const k = idxOf(i, j);
      if (f.bits[k]) continue;
      const dx = cellX(i) - x;
      const dy = cellY(j) - y;
      if (dx * dx + dy * dy > (r + CELL * 0.35) ** 2) continue;
      f.bits[k] = 1;
      fresh.push(k);
      if (g.reach[k]) {
        const id = REGION_IDS[g.reg[k]];
        f.counts[id] = (f.counts[id] || 0) + 1;
        touched.add(id);
      }
    }
  }
  if (fresh.length) {
    f.version += 1;
    // the painter drains this to clear its cloud layer bit by bit
    if (f.recent.length < 20000) for (const k of fresh) f.recent.push(k);
  }
  const done = [];
  for (const id of touched) {
    const n = s.nodes[id];
    if (!n) continue;
    const before = n.explore || 0;
    n.explore = exploredPct(s, id);
    if (before < 100 && n.explore >= 100) done.push(id);
  }
  return { fresh: fresh.length, done };
}

/** A random unseen walkable cell in a region (for "you wander somewhere new"). */
export function unseenSpot(s, id, rnd) {
  const g = world();
  const f = fogOf(s);
  const ridx = REGION_IDS.indexOf(id);
  const list = [];
  for (let k = 0; k < N; k++) if (g.reg[k] === ridx && g.reach[k] && !f.bits[k]) list.push(k);
  if (!list.length) return null;
  const k = list[Math.floor(rnd() * list.length)];
  return [cellX(k % COLS), cellY(Math.floor(k / COLS))];
}
