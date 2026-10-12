// 身法 and flight: the leaps a 輕功 gives you (over a stream, a wall, the
// lip of a cliff), and going up into the air — on a flying sword, a 飛行法器,
// a 御風符. The rules only: explore.js moves you, the painters draw you.

import { TECHS } from '../content/techniques.js';
import { ITEMS } from '../content/items.js';
import { T, TERRAIN, WORLD_W, WORLD_H, BORDER, SECT } from './geo.js';
import { world, collides, canStand, terrainAt, insidePoly, idxOf, colOf, rowOf, cellX, cellY } from './terrain.js';
import { heightAt } from './height.js';

// ── 輕功 ──

/** The 身法 you move by: the best you know (none before 引氣入體, when there is no 靈力 to lift you). */
export function bodyArt(s) {
  const p = s.player;
  if (!(p.realm >= 1)) return null;
  let best = null;
  for (const id of p.arts || []) {
    const t = TECHS[id];
    if (t?.kind === 'move' && (!best || t.leap > best.leap)) best = { id, ...t };
  }
  return best;
}

/** What a leap carries you over (anything else in the way, it does not). */
const LEAPABLE = new Set([T.WATER, T.CLIFF, T.WALL]);

/** Is this inside a building? (No leap goes through a house.) */
function inBuilding(x, y) {
  for (const b of world().solids) if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
  return false;
}

/**
 * Where a leap from (x, y), heading (dx, dy), comes down: the first ground you
 * can stand on past water, a cliff or a wall, within the leap's reach, and
 * nothing on the way higher above where you leapt from than it can carry you.
 * null when there is nothing to leap over, or no ground to come down on.
 */
export function leapLanding(s, x, y, dx, dy, art = bodyArt(s)) {
  if (!art) return null;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const z0 = heightAt(x, y);
  const member = !!s.flags?.sect_member;
  let crossed = false;
  for (let d = 8; d <= art.leap; d += 4) {
    const px = x + dx * d;
    const py = y + dy * d;
    if (px < 1 || py < 1 || px >= WORLD_W - 1 || py >= WORLD_H - 1) return null;
    if (heightAt(px, py) - z0 > art.up) return null;
    const t = terrainAt(px, py);
    if (LEAPABLE.has(t)) {
      crossed = true;
      continue;
    }
    if (!TERRAIN[t].pass || (t === T.GATE && !member) || inBuilding(px, py)) return null;
    if (!crossed) {
      // still on this side: it is open, so you would walk, not leap
      if (!collides(s, px, py)) return null;
      continue;
    }
    if (!canStand(s, px, py)) continue;
    // a step further in, if there is room, so you do not come down on the very edge
    const qx = x + dx * Math.min(art.leap, d + 10);
    const qy = y + dy * Math.min(art.leap, d + 10);
    return canStand(s, qx, qy) && heightAt(qx, qy) - z0 <= art.up ? [qx, qy] : [px, py];
  }
  return null;
}

/** Can you leap straight from (x, y) to the point (tx, ty)? (A path that plans a leap uses this.) */
export function leapTo(s, x, y, tx, ty, art = bodyArt(s)) {
  if (!art) return false;
  const d = Math.hypot(tx - x, ty - y);
  // (a little past its reach: a path's leap is planned from the middle of where you stand)
  if (d > art.leap + 12 || d < 1) return false;
  const z0 = heightAt(x, y);
  for (let k = 8; k < d; k += 4) {
    const px = x + ((tx - x) * k) / d;
    const py = y + ((ty - y) * k) / d;
    if (heightAt(px, py) - z0 > art.up) return false;
    const t = terrainAt(px, py);
    if (LEAPABLE.has(t)) continue;
    if (!TERRAIN[t].pass || inBuilding(px, py)) return false;
  }
  return canStand(s, tx, ty) && heightAt(tx, ty) - z0 <= art.up;
}

/** How a leap goes: how long in the air, and how high the arc. */
export function leapShape(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const dz = heightAt(x1, y1) - heightAt(x0, y0);
  return { dur: 0.32 + d / 520 + Math.max(0, dz) / 400, arc: 14 + d * 0.16 + Math.max(0, dz) * 0.5 };
}

/** Terrain rules for a path that may leap: { leap, up } (see terrain.js findPath), or null. */
export function leapRules(s) {
  const art = bodyArt(s);
  return art ? { leap: art.leap, up: art.up, ok: (x0, y0, x1, y1) => leapTo(s, x0, y0, x1, y1, art) } : null;
}

// ── flight ──

/**
 * Ways up into the air. speed: how much faster than walking; time: how much
 * less of the day a stretch of the way takes; mp: 靈力 a second; ceil: how
 * high (above the plain) it can climb; clear: how high over the ground it
 * goes; last: seconds a 御風符 holds you up.
 */
export const FLIGHT = {
  sword: { name: '御劍', speed: 2.8, time: 4, mp: 0.9, ceil: 560, clear: 54 },
  boat: { name: '青木飛梭', speed: 2, time: 2.5, mp: 1.1, ceil: 300, clear: 46, item: 'feisuo' },
  wind: { name: '御風', speed: 1.7, time: 2, mp: 0, ceil: 300, clear: 40, item: 'wind_talisman', last: 60 },
};

/** A sword you could stand on. */
export function isSword(id) {
  const it = ITEMS[id];
  return it?.kind === 'weapon' && /sword/.test(`${id} ${it.strike || ''}`);
}

/** The way you would go up now, of those you need no 符 for (null: none), and why not if none. */
export function flyMeans(s) {
  const p = s.player;
  if (p.realm >= 2 && isSword(p.weapon)) return { by: 'sword' };
  if (p.realm >= 1 && p.items.feisuo > 0) return { by: 'boat' };
  if (p.items.feisuo > 0) return { by: null, why: '飛梭要靈力催動，引氣入體之後才用得上。' };
  if (p.realm >= 2) return { by: null, why: '手上沒有劍，御不了劍。' };
  return { by: null, why: null };
}

/** The air over the sect is the sect's: its 護山大陣 lets only its own through. */
function sectAir(x, y) {
  return insidePoly(SECT.massif, x, y) && y < SECT.gateY + 10;
}

/** Why you cannot fly over (x, y) this way (null: you can). */
export function flyBlocked(s, x, y, by) {
  const F = FLIGHT[by];
  if (x < BORDER.west + 40 || y < BORDER.north + 50 || y > BORDER.south - 40 || x > WORLD_W - 20) return '再往外，是望不到頭的群山。';
  if (terrainAt(x, y) === T.VOID) return '江那邊雲霧太濃，辨不清方向。那是中州，還不是你現在去的地方。';
  if (!s.flags?.sect_member && sectAir(x, y)) return '一層看不見的光幕擋住了你：青雲宗的護山大陣。';
  if (heightAt(x, y) + F.clear > F.ceil) return '山太高了，飛不上去。';
  return null;
}

/** Can you come down here? */
export function canLand(s, x, y) {
  if (!s.flags?.sect_member && sectAir(x, y)) return false;
  return canStand(s, x, y);
}

/** The nearest spot to come down on, looking out from (x, y) ring by ring (null if none within reach). */
export function landingNear(s, x, y, reach = 900) {
  if (canLand(s, x, y)) return [x, y];
  const g = world();
  const ci = colOf(x);
  const cj = rowOf(y);
  const rings = Math.ceil(reach / 40);
  for (let ring = 1; ring <= rings; ring++) {
    let best = null;
    let bd = Infinity;
    for (let j = cj - ring; j <= cj + ring; j++) {
      for (let i = ci - ring; i <= ci + ring; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== ring) continue;
        const k = idxOf(i, j);
        if (i < 0 || j < 0 || k >= g.terr.length || !(g.reach[k] || g.air[k])) continue;
        const px = cellX(i);
        const py = cellY(j);
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < bd && canLand(s, px, py)) {
          bd = d;
          best = [px, py];
        }
      }
    }
    if (best) return best;
  }
  return null;
}
