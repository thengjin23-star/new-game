// 戰場: where a fight stands in the world. The battle itself only knows a
// line — how far along it each fighter is, and which side of it — so here
// that line is laid on the ground where you are, across open ground, turned
// toward whoever you are fighting (and, if it can be, side-on to the eye,
// so the two sides face each other across the picture).

import { collides } from './terrain.js';
import { isReachable } from './terrain.js';

const LANE = 40; // how far apart side by side
const WEDGE = 14; // those to the sides stand this much behind the one in front

/** Where to look for ground, around where you stand. */
const ORIGINS = [[0, 0], [0, -45], [45, -30], [-45, -30], [0, 40], [45, 30], [-45, 30], [0, -90], [70, 0], [-70, 0]];

/** The ground a fight takes place on: { x, y } where it started, and its line (dx, dy). */
export function arenaOf(s, toward = null) {
  const b = s.battle;
  if (!b) return null;
  if (b.arena) return b.arena;
  const w = s.world;
  // the way the other side lies, if known; else the way you face
  let pref = toward ? Math.atan2(toward[1] - w.y, toward[0] - w.x) : (w.face || 1) < 0 ? Math.PI : 0;
  // side-on reads best: lean toward left or right
  pref = Math.cos(pref) < 0 ? Math.PI : 0;
  const open = (x, y, r) => isReachable(x, y) && !collides(s, x, y, r);
  // the lines the fighters keep to (each side as its wedge)
  const lanes = [...new Map(b.units.map((u) => [`${u.side === 'foe'}:${u.lane || 0}`, u])).values()];
  let best = null;
  for (const [ox, oy] of ORIGINS) {
    const x0 = w.x + ox;
    const y0 = w.y + oy;
    if (!open(x0, y0, 10)) continue;
    // what stands just in front (toward the eye) would hide the fight
    let hidden = 0;
    for (let fx = -120; fx <= 160; fx += 40) for (const fy of [30, 70]) if (collides(s, x0 + fx, y0 + fy, 6)) hidden++;
    for (let k = 0; k < 16; k++) {
      const a = pref + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
      const arena = { x: x0, y: y0, dx: Math.cos(a), dy: Math.sin(a) };
      // room to move along every line, all the way to the edges of the field
      let room = 0;
      let all = 0;
      for (const u of lanes) {
        for (let t = -125; t <= 150; t += 25) {
          const [x, y] = placeOf(arena, { t, lane: u.lane, side: u.side });
          all++;
          if (open(x, y, 8)) room++;
        }
      }
      // and nobody starts in a river, a wall or a tree
      let blocked = 0;
      for (const u of b.units) if (!open(...placeOf(arena, u), 6)) blocked++;
      // a little in favour of lying across the picture, and of staying where you are
      const score = (room / all) * 33 + Math.abs(arena.dx) * 3 - k * 0.2 - hidden * 1.5 - Math.hypot(ox, oy) * 0.04 - blocked * 12;
      if (!best || score > best.score) best = { score, arena };
    }
  }
  b.arena = best ? best.arena : { x: w.x, y: w.y, dx: 1, dy: 0 };
  return b.arena;
}

/**
 * Where on the ground someone in the fight stands. u: { t, lane, side }; a
 * side stands as a wedge, the middle forward, so no one hides behind another.
 */
export function placeOf(arena, u) {
  const lat = (u.lane || 0) * LANE;
  const t = u.t + (u.side === 'foe' ? 1 : -1) * Math.abs(u.lane || 0) * WEDGE;
  return [arena.x + arena.dx * t - arena.dy * lat, arena.y + arena.dy * t + arena.dx * lat];
}
