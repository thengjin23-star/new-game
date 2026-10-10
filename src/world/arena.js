// 戰場: where a fight stands in the world. The battle itself only knows a
// line — how far along it each fighter is, and which side of it — so here
// that line is laid on the ground where you are, across open ground, turned
// toward whoever you are fighting (and, if it can be, side-on to the eye,
// so the two sides face each other across the picture).

import { collides } from './terrain.js';
import { isReachable } from './terrain.js';

const LANE = 34; // how far apart side by side

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
  let best = null;
  for (let k = 0; k < 16; k++) {
    const a = pref + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let open = 0;
    for (let t = -110; t <= 150; t += 26) {
      for (const lane of [-1, 0, 1]) {
        const x = w.x + dx * t - dy * lane * LANE;
        const y = w.y + dy * t + dx * lane * LANE;
        if (isReachable(x, y) && !collides(s, x, y, 8)) open++;
      }
    }
    // a little in favour of lying across the picture
    const score = open + Math.abs(dx) * 3 - k * 0.2;
    if (!best || score > best.score) best = { score, dx, dy };
  }
  b.arena = { x: w.x, y: w.y, dx: best.dx, dy: best.dy };
  return b.arena;
}

/** Where on the ground someone in the fight stands. */
export function placeOf(arena, u) {
  const lat = (u.lane || 0) * LANE;
  return [arena.x + arena.dx * u.t - arena.dy * lat, arena.y + arena.dy * u.t + arena.dx * lat];
}
