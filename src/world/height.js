// How high the ground is, everywhere. The land rises from the great river in
// the south-east to the uplands of the north-west; mountains stand up where
// the terrain grid says no one can walk; 靈溪谷 is a basin walled by cliffs;
// 斷魂崖 drops sheer to the south; the stream only ever runs downhill; roads
// keep an even grade and towns sit level. Built once from the same data as
// the grid, so what you see and where you can walk always agree.

import { WORLD_W, WORLD_H, CELL, COLS, ROWS, T, CLIFF_LINES, SECT, VALLEY, LAKES, PEAKS, BORDER } from './geo.js';
import { STRUCTURES } from './places.js';
import { world, REGION_IDS, idxOf, cellX, cellY, colOf, rowOf, vnoise, fbm, segDist, insidePoly } from './terrain.js';

export const HS = 20; // spacing of height samples
export const HW = WORLD_W / HS + 1;
export const HH = WORLD_H / HS + 1;

/** Settled ground sits level: [height, roll]. */
const SETTLED = {
  qingshi_town: [12, 2],
  luoxia_market: [16, 1],
  farmland: [6, 2],
  mirror_lake: [5, 3],
  crane_ferry: [6, 2],
  fox_shrine: [24, 6],
  qingxu_temple: [44, 6],
  great_river: [-24, 0],
};

/** How much wild ground rolls, by region. */
const ROLL = { wilds: 18, black_forest: 20, qingshi_hill: 22, ancient_ruins: 14, lingxi_valley: 4, qingyun_sect: 10, hidden_cave: 8 };

/** The lie of the wild land: [x, y, height, reach]. */
const UPLAND = [
  // the north-west uplands and the old battlefield
  [700, 600, 205, 450], [1500, 550, 195, 400], [2600, 650, 170, 450], [3500, 700, 160, 350], [4150, 350, 140, 300], [4550, 350, 30, 220],
  // 黑風林
  [1250, 1500, 150, 350], [2300, 1550, 125, 380], [3200, 1600, 95, 350],
  // 靈溪谷 and the high side of 青石山
  [600, 1820, 150, 260], [1000, 2150, 135, 220], [1350, 2350, 118, 220], [1800, 2300, 100, 250],
  // the low side of 青石山, under 斷魂崖
  [1300, 2820, 50, 180], [850, 2850, 58, 220], [2000, 2700, 40, 180],
  // the open wilds, falling east to the river
  [2600, 2250, 55, 300], [3200, 2350, 40, 300], [3700, 1950, 48, 300], [4300, 1950, 40, 260], [4650, 1200, 60, 260],
  [4500, 2900, 18, 300], [3800, 3300, 20, 280], [4700, 420, 5, 260],
  // west and south
  [350, 3500, 75, 350], [1300, 3700, 30, 300], [2400, 4150, 15, 300], [3500, 4200, 12, 300], [4500, 4300, 8, 300],
];

/** Fixed levels: the great river's surface, the sect's plateau, the lake. */
export const LEVEL = { river: -12, sect: 236, lake: 3 };

/** 斷魂崖: how far the lip stands above the land, and the foot below it. */
const CLIFF_UP = 58;
const CLIFF_DOWN = 32;

let HG = null;

/** The height grid and the water (built on first use). */
export function heights() {
  if (!HG) HG = buildHeights();
  return HG;
}

export function heightAt(x, y) {
  return bilerp(heights().h, x, y);
}

/** The surface of the water at a point (null where there is none). */
export function waterAt(x, y) {
  const k = idxOf(colOf(x), rowOf(y));
  const w = heights().water[k];
  return w > -1e5 ? w : null;
}

/** Slope of the ground between two points (rise over run). */
export function slopeBetween(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  if (d < 1e-6) return 0;
  return (heightAt(x1, y1) - heightAt(x0, y0)) / d;
}

function bilerp(h, x, y) {
  const fx = Math.max(0, Math.min(HW - 1.001, x / HS));
  const fy = Math.max(0, Math.min(HH - 1.001, y / HS));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const u = fx - i;
  const v = fy - j;
  const a = h[j * HW + i];
  const b = h[j * HW + i + 1];
  const c = h[(j + 1) * HW + i];
  const d = h[(j + 1) * HW + i + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** A cell field read at a point (cell centres are the samples). */
function sampleCell(field, x, y) {
  const fx = Math.max(0, Math.min(COLS - 1.001, x / CELL - 0.5));
  const fy = Math.max(0, Math.min(ROWS - 1.001, y / CELL - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const u = fx - i;
  const v = fy - j;
  const a = field[j * COLS + i];
  const b = field[j * COLS + i + 1];
  const c = field[(j + 1) * COLS + i];
  const d = field[(j + 1) * COLS + i + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Box blur of a cell field, a few passes (≈ gaussian). */
function blur(src, r, passes) {
  const w = COLS;
  const h = ROWS;
  let a = Float32Array.from(src);
  const b = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += a[j * w + Math.max(0, Math.min(w - 1, i + k))];
        b[j * w + i] = sum / (2 * r + 1);
      }
    }
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += b[Math.max(0, Math.min(h - 1, j + k)) * w + i];
        a[j * w + i] = sum / (2 * r + 1);
      }
    }
  }
  return a;
}

function upland(x, y) {
  let sw = 0;
  let sz = 0;
  for (const [ux, uy, uz, r] of UPLAND) {
    const w = Math.exp(-((x - ux) ** 2 + (y - uy) ** 2) / (2 * r * r)) + 1e-9;
    sw += w;
    sz += w * uz;
  }
  return sz / sw;
}

function ridged(x, y) {
  return 1 - Math.abs(2 * fbm(x / 260, y / 260, 71) - 1);
}

/** Smooth maximum: like max, but rounded where the two meet. */
function smax(a, b, k) {
  if (a <= 0 || b <= 0) return Math.max(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

/** Distance from a point inside a polygon to its nearest edge. */
function polyDepth(poly, x, y) {
  let d = Infinity;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) d = Math.min(d, segDist(x, y, poly[b][0], poly[b][1], poly[a][0], poly[a][1]));
  return d;
}

function buildHeights() {
  const g = world();
  const N = COLS * ROWS;
  const h = new Float32Array(HW * HH);
  const eachIn = (x0, y0, x1, y1, fn) => {
    const i0 = Math.max(0, Math.floor(x0 / HS));
    const i1 = Math.min(HW - 1, Math.ceil(x1 / HS));
    const j0 = Math.max(0, Math.floor(y0 / HS));
    const j1 = Math.min(HH - 1, Math.ceil(y1 / HS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * HW + i, i * HS, j * HS);
  };
  const cellAt = (x, y) => g.terr[idxOf(colOf(x), rowOf(y))];
  const isWet = (t) => t === T.WATER || t === T.BRIDGE || t === T.VOID;

  // 1. the lie of the land: settled ground level, wild ground following the uplands
  const base = new Float32Array(N);
  const roll = new Float32Array(N);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const k = idxOf(i, j);
      const id = REGION_IDS[g.reg[k]];
      const set = SETTLED[id];
      base[k] = set ? set[0] : upland(cellX(i), cellY(j));
      roll[k] = set ? set[1] : ROLL[id] ?? ROLL.wilds;
    }
  }
  const baseB = blur(base, 2, 3);
  const rollB = blur(roll, 2, 2);

  // 2. mountains, raised from the same shapes the grid was cut from (the rim
  //    of the world, the peaks, the sect's massif, 靈溪谷's ring), so they rise
  //    as smooth peaks rather than blocks of cells. Wherever a foot can stand
  //    the rock is held down, so the ground there stays level.
  const gorgeAng = Math.atan2(VALLEY.gorge[1] - VALLEY.cy, VALLEY.gorge[0] - VALLEY.cx);
  const rockAt = (x, y) => {
    let m = 0;
    const dn = BORDER.north + 80 * vnoise(x / 300, 1.5, 21) - y;
    const dw = BORDER.west + 80 * vnoise(y / 300, 2.5, 22) - x;
    const ds = y - (BORDER.south - 80 * vnoise(x / 300, 3.5, 23));
    const d = Math.max(dn, dw, ds);
    if (d > 0) m = 430 * (1 - Math.exp(-d / 200)) * (d / (d + 40)) * (0.65 + 0.6 * ridged(x, y));
    for (const [cx, cy, rx, ry] of PEAKS) {
      if (Math.abs(x - cx) > rx * 1.2 || Math.abs(y - cy) > ry * 1.2) continue;
      const wob = 0.86 + 0.28 * fbm(x / 90, y / 90, 31);
      // a touch inside the cells' outline, so the foot is not cut square by the grid
      const t = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry) / (wob * 0.95);
      if (t <= 0) continue;
      const H = (60 + (0.9 * (rx + ry)) / 2) * (0.75 + 0.5 * fbm(x / 140, y / 140, 81));
      m = smax(m, H * (0.5 * t + 0.5 * t ** 2.4) + 0.25 * H * t * (ridged(x * 1.7, y * 1.7) - 0.5), 30);
    }
    if (insidePoly(SECT.massif, x, y)) {
      const dm = Math.max(0, polyDepth(SECT.massif, x, y) - 30 * fbm(x / 120, y / 120, 83));
      m = smax(m, 330 * (1 - Math.exp(-dm / 190)) * (dm / (dm + 50)) * (0.8 + 0.4 * ridged(x, y)), 30);
    }
    const e = Math.hypot((x - VALLEY.cx) / VALLEY.rx, (y - VALLEY.cy) / VALLEY.ry);
    if (e > 0.98 && e < 1.5) {
      let a = Math.abs(Math.atan2(y - VALLEY.cy, x - VALLEY.cx) - gorgeAng);
      if (a > Math.PI) a = 2 * Math.PI - a;
      const open = smoothstep(VALLEY.gorgeHalf * 0.95, VALLEY.gorgeHalf * 1.2, a);
      const wall = smoothstep(0.99, 1.04, e) * (1 - smoothstep(1.16, 1.48, e));
      m = smax(m, 175 * wall * open * (0.85 + 0.3 * vnoise(x / 70, y / 70, 75)), 20);
    }
    return m;
  };
  const isRock = (k) => g.terr[k] === T.PEAK || g.terr[k] === T.CLIFF;
  /** Call fn(k, i, j) for each cell a sample point touches (1, 2 or 4 of them). */
  const touching = (x, y, fn) => {
    const ci = x / CELL;
    const cj = y / CELL;
    const i0 = Number.isInteger(ci) ? ci - 1 : Math.floor(ci);
    const j0 = Number.isInteger(cj) ? cj - 1 : Math.floor(cj);
    for (let j = Math.max(0, j0); j <= Math.min(ROWS - 1, Math.floor(cj)); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(COLS - 1, Math.floor(ci)); i++) fn(idxOf(i, j), i, j);
    }
  };
  /** How far into the rock a point is: 0 if it touches open ground. */
  const rockDepth = (x, y) => {
    let open = false;
    touching(x, y, (k) => {
      if (!isRock(k)) open = true;
    });
    if (open) return 0;
    const ci = colOf(x);
    const cj = rowOf(y);
    let best = 2 * CELL;
    for (let j = Math.max(0, cj - 2); j <= Math.min(ROWS - 1, cj + 2); j++) {
      for (let i = Math.max(0, ci - 2); i <= Math.min(COLS - 1, ci + 2); i++) {
        if (isRock(idxOf(i, j))) continue;
        const dx = Math.max(i * CELL - x, 0, x - (i + 1) * CELL);
        const dy = Math.max(j * CELL - y, 0, y - (j + 1) * CELL);
        best = Math.min(best, Math.hypot(dx, dy));
      }
    }
    return best;
  };

  eachIn(0, 0, WORLD_W, WORLD_H, (k, x, y) => {
    const z = sampleCell(baseB, x, y) + (fbm(x / 520, y / 520, 61) - 0.5) * 2 * sampleCell(rollB, x, y);
    let m = rockAt(x, y);
    // rock rises sheer from the edge of open ground, never out over it
    if (m > 0) m = Math.min(m, rockDepth(x, y) * 8);
    h[k] = z + m;
  });

  // 3. 斷魂崖: the land north of it stands up to a lip and drops sheer to the
  //    foot; past its ends the step eases into an ordinary slope
  for (const [[ax, ay], [bx, by]] of CLIFF_LINES) {
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    const nx = uy; // across > 0: north of the line, the high side
    const ny = -ux;
    eachIn(Math.min(ax, bx) - 420, Math.min(ay, by) - 420, Math.max(ax, bx) + 420, Math.max(ay, by) + 420, (k, x, y) => {
      const along = (x - ax) * ux + (y - ay) * uy;
      const across = (x - ax) * nx + (y - ay) * ny;
      const fade = smoothstep(-170, 0, along) * (1 - smoothstep(len, len + 170, along));
      if (fade <= 0) return;
      const out = along < 0 ? -along : along > len ? along - len : 0;
      const w = Math.min(1, out / 150) * 220; // the face softens past the ends
      let face = smoothstep(-3 - w, 3 + w, across);
      // along the cliff, ground you can stand on is wholly above or below it
      if (!out) {
        touching(x, y, (c, i, j) => {
          if (g.terr[c] === T.CLIFF) return;
          face = (cellX(i) - ax) * nx + (cellY(j) - ay) * ny > 0 ? 1 : 0;
        });
      }
      const up = CLIFF_UP * (1 - smoothstep(40, 330, across)) + 8 * (1 - smoothstep(4, 40, across)) * smoothstep(-4, 4, across);
      const down = -CLIFF_DOWN * (1 - smoothstep(30, 280, -across));
      h[k] += (face * up + (1 - face) * down) * fade;
    });
  }

  // 4. water. Lakes keep a level; the stream runs from the valley's pool to
  //    the lake and never uphill; the great river cuts a broad bed.
  const water = new Float32Array(N).fill(-1e6);
  const lakes = LAKES.map(([cx, cy, rx, ry], n) => ({ cx, cy, rx, ry, level: n === 0 ? LEVEL.lake : bilerp(h, cx, cy) - 1 }));

  const streams = [];
  for (const r of g.rivers) {
    const hw = r.width / 2;
    const great = r.id === 'great';
    const steps = sampleAlong(r.path, 20);
    let surf;
    if (great) surf = steps.map(() => LEVEL.river);
    else {
      const top = lakes[1] ? lakes[1].level : bilerp(h, steps[0][0], steps[0][1]);
      surf = [];
      let run = top;
      for (const [x, y] of steps) {
        run = Math.min(run, bilerp(h, x, y) - 2);
        surf.push(Math.max(run, LEVEL.lake));
      }
      surf = movingAverage(surf, 2);
      surf[0] = top;
      surf[surf.length - 1] = LEVEL.lake;
    }
    const arc = steps.map((_, n) => n * 20);
    arc[arc.length - 1] = pathLength(r.path);
    const surfAt = (s) => {
      const n = Math.min(surf.length - 2, Math.floor(s / 20));
      const t = Math.max(0, Math.min(1, (s - arc[n]) / Math.max(1e-6, arc[n + 1] - arc[n])));
      return surf[n] + (surf[n + 1] - surf[n]) * t;
    };
    const reach = great ? hw + 260 : hw + 200;
    const depth = great ? 28 : 8;
    const bankSlope = great ? 0.22 : 0.32;
    const [bx0, by0, bx1, by1] = bbox(r.path, reach);
    eachIn(bx0, by0, bx1, by1, (k, x, y) => {
      const near = nearestOnPath(r.path, x, y, reach);
      if (!near) return;
      const [d, s] = near;
      const level = surfAt(s);
      if (d <= hw) {
        const bed = level - depth * (1 - smoothstep(hw * 0.4, hw, d)) - 2;
        h[k] = Math.min(h[k], bed);
        return;
      }
      // low land slopes gently to the water; high ground meets it in a bluff
      const slope = bankSlope + 1.1 * smoothstep(40, 140, h[k] - level);
      const bank = level + 2 + (d - hw) * slope;
      if (bank < h[k]) h[k] += (bank - h[k]) * (1 - smoothstep(reach * 0.65, reach, d));
    });
    // the water level of each wet cell along this river
    const [cx0, cy0, cx1, cy1] = bbox(r.path, great ? 1e4 : hw + 60);
    for (let j = rowOf(cy0); j <= rowOf(cy1); j++) {
      for (let i = colOf(cx0); i <= colOf(cx1); i++) {
        const k = idxOf(i, j);
        if (!isWet(g.terr[k])) continue;
        const near = nearestOnPath(r.path, cellX(i), cellY(j), great ? 1e4 : hw + 60);
        if (!near) continue;
        if (great && water[k] > -1e5) continue;
        water[k] = surfAt(near[1]);
      }
    }
    streams.push({ id: r.id, width: r.width, pts: steps.map(([x, y], n) => [x, y, surf[n]]) });
  }
  for (const L of lakes) {
    eachIn(L.cx - L.rx * 1.7, L.cy - L.ry * 1.7, L.cx + L.rx * 1.7, L.cy + L.ry * 1.7, (k, x, y) => {
      const e = Math.hypot((x - L.cx) / L.rx, (y - L.cy) / L.ry);
      if (e > 1.6) return;
      if (e < 1) h[k] = Math.min(h[k], L.level - 3 - 20 * (1 - e));
      else h[k] = Math.min(h[k], L.level + 2 + (e - 1) * 110);
    });
    for (let j = rowOf(L.cy - L.ry * 1.2); j <= rowOf(L.cy + L.ry * 1.2); j++) {
      for (let i = colOf(L.cx - L.rx * 1.2); i <= colOf(L.cx + L.rx * 1.2); i++) {
        if (Math.hypot((cellX(i) - L.cx) / L.rx, (cellY(j) - L.cy) / L.ry) < 1.15) water[idxOf(i, j)] = L.level;
      }
    }
  }
  // beyond the great river there is only mist and water
  for (let k = 0; k < N; k++) if (g.terr[k] === T.VOID) water[k] = LEVEL.river;

  // 5. 青雲宗: the plateau sits level on top of its massif; peaks stand behind it,
  //    and the front of the massif never rises above it (or it would hide it)
  const [px, py, prx, pry] = SECT.plateau;
  const massif = SECT.massif;
  eachIn(px - prx * 3, py - pry * 3, px + prx * 3, py + pry * 3, (k, x, y) => {
    const e = Math.hypot((x - px) / prx, (y - py) / pry);
    let onPlateau = e < 1;
    if (!onPlateau && e < 1.2) {
      touching(x, y, (c, i, j) => {
        if (!isRock(c) && !isWet(g.terr[c]) && Math.hypot((cellX(i) - px) / prx, (cellY(j) - py) / pry) < 1) onPlateau = true;
      });
    }
    if (onPlateau) {
      h[k] = LEVEL.sect + 4 * (vnoise(x / 80, y / 80, 77) - 0.5);
      return;
    }
    if (!insidePoly(massif, x, y) && e > 1.15) return;
    if (isWet(cellAt(x, y))) return;
    const north = smoothstep(0.3, -0.6, (y - py) / (pry * e)); // 1 behind the plateau, 0 in front
    const cap = LEVEL.sect + 6 + (e - 1) * (north * 260 - (1 - north) * 50) + 30 * north * (vnoise(x / 110, y / 110, 79) - 0.3) * Math.min(1, e - 1);
    if (h[k] > cap) h[k] = cap;
    if (e < 1.35) h[k] = Math.max(h[k], LEVEL.sect + 2 + (e - 1) * 40 * north);
  });

  // 6. roads keep an even grade; over water they are bridges; the sect's
  //    stair climbs straight up the mountain
  const profiles = [];
  for (const r of g.roads) {
    const steps = sampleAlong(r.path, 20);
    const wet = steps.map(([x, y]) => isWet(cellAt(x, y)));
    let prof = steps.map(([x, y]) => bilerp(h, x, y));
    prof = bridgeOver(prof, wet);
    prof = movingAverage(prof, r.kind === 'road' ? 6 : 3);
    if (r.kind === 'pier') {
      const lv = Math.max(...steps.map(([x, y]) => water[idxOf(colOf(x), rowOf(y))]));
      prof = prof.map(() => lv + 4);
    }
    profiles.push({ road: r, steps, prof, wet });
  }
  const stair = profiles.find((p) => p.road.pts[p.road.pts.length - 1][1] === 1330);
  if (stair) {
    const foot = Math.max(0, stair.steps.findIndex(([, y]) => y < 1800));
    const top = stair.steps.length - 1;
    const h0 = stair.prof[foot];
    for (let n = foot; n <= top; n++) stair.prof[n] = h0 + (LEVEL.sect - h0) * smoothstep(foot, top + 1, n + 1) ** 0.9;
  }
  const bridges = [];
  for (const p of profiles) {
    const hwid = Math.max(p.road.width / 2, 14);
    const pad = hwid + 50;
    const [bx0, by0, bx1, by1] = bbox(p.steps, pad);
    eachIn(bx0, by0, bx1, by1, (k, x, y) => {
      if (isWet(cellAt(x, y))) return;
      const near = nearestStep(p.steps, x, y, pad);
      if (!near) return;
      const [d, n] = near;
      const w = 1 - smoothstep(hwid * 0.8, pad, d);
      h[k] += (p.prof[n] - h[k]) * w;
    });
    // where the road runs over water: the deck of a bridge (or a pier)
    let run = null;
    p.steps.forEach(([x, y], n) => {
      const wl = water[idxOf(colOf(x), rowOf(y))];
      if (p.wet[n]) {
        if (!run) run = { kind: p.road.kind, width: p.road.width, pts: n > 0 ? [[...p.steps[n - 1], p.prof[n - 1]]] : [] };
        run.pts.push([x, y, Math.max(p.prof[n] + (p.road.kind === 'pier' ? 0 : 3), wl + 6)]);
      } else if (run) {
        run.pts.push([x, y, p.prof[n]]);
        bridges.push(run);
        run = null;
      }
    });
    if (run) bridges.push(run);
  }

  // 7. buildings and courtyards stand on level ground (each point follows the
  //    building it is closest to, so neighbours never tilt one another)
  const sites = STRUCTURES.filter((st) => st.paint !== T.BRIDGE).map((st) => ({
    x: st.x, y: st.y, hw: st.w / 2 + 12, hh: st.h / 2 + 12, level: bilerp(h, st.x, st.y),
  }));
  // buildings close enough to share ground share one level
  const root = sites.map((_, n) => n);
  const find = (n) => (root[n] === n ? n : (root[n] = find(root[n])));
  sites.forEach((a, n) => {
    for (let m = 0; m < n; m++) {
      const b = sites[m];
      if (Math.abs(a.x - b.x) < a.hw + b.hw + 30 && Math.abs(a.y - b.y) < a.hh + b.hh + 30) root[find(n)] = find(m);
    }
  });
  const groups = new Map();
  sites.forEach((st, n) => {
    const r = find(n);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(st);
  });
  for (const members of groups.values()) {
    const level = members.reduce((a, st) => a + st.level, 0) / members.length;
    for (const st of members) st.level = level;
  }
  const pull = new Map();
  for (const st of sites) {
    eachIn(st.x - st.hw - 30, st.y - st.hh - 30, st.x + st.hw + 30, st.y + st.hh + 30, (k, x, y) => {
      const w = 1 - smoothstep(0, 30, Math.max(Math.abs(x - st.x) - st.hw, Math.abs(y - st.y) - st.hh));
      const prev = pull.get(k);
      if (w > 0 && (!prev || w > prev[0])) pull.set(k, [w, st.level]);
    });
  }
  for (const [k, [w, level]] of pull) h[k] += (level - h[k]) * w;

  return { h, water, bridges, streams, lakes };
}

function bbox(pts, pad) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

function pathLength(path) {
  let L = 0;
  for (let n = 1; n < path.length; n++) L += Math.hypot(path[n][0] - path[n - 1][0], path[n][1] - path[n - 1][1]);
  return L;
}

/** [distance, arc length] to the nearest point of a path, or null if farther than max. */
function nearestOnPath(path, x, y, max) {
  let best = null;
  let s = 0;
  for (let n = 1; n < path.length; n++) {
    const [ax, ay] = path[n - 1];
    const [bx, by] = path[n];
    const len = Math.hypot(bx - ax, by - ay);
    if (Math.min(ax, bx) - max <= x && x <= Math.max(ax, bx) + max && Math.min(ay, by) - max <= y && y <= Math.max(ay, by) + max) {
      const d = segDist(x, y, ax, ay, bx, by);
      if (d <= max && (!best || d < best[0])) {
        const t = len ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len))) : 0;
        best = [d, s + t * len];
      }
    }
    s += len;
  }
  return best;
}

/** Points every `step` units along a path (and its last point). */
function sampleAlong(path, step) {
  const out = [];
  let carry = 0;
  for (let n = 1; n < path.length; n++) {
    const [ax, ay] = path[n - 1];
    const [bx, by] = path[n];
    const len = Math.hypot(bx - ax, by - ay);
    let d = carry;
    for (; d < len; d += step) out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]);
    carry = d - len;
  }
  const last = path[path.length - 1];
  out.push([last[0], last[1]]);
  return out;
}

/** [distance from the road's centre line, step index] for the nearest step within max. */
function nearestStep(steps, x, y, max) {
  let best = null;
  for (let n = 0; n < steps.length; n++) {
    const dx = steps[n][0] - x;
    const dy = steps[n][1] - y;
    if (Math.abs(dx) > max + 20 || Math.abs(dy) > max + 20) continue;
    const d = Math.hypot(dx, dy);
    if (d <= max + 10 && (!best || d < best[0])) best = [d, n];
  }
  if (best) best[0] = Math.max(0, best[0] - 10);
  return best;
}

function movingAverage(a, r) {
  return a.map((_, n) => {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, n - r); k <= Math.min(a.length - 1, n + r); k++) {
      s += a[k];
      c++;
    }
    return s / c;
  });
}

/** Across water, carry the road at the height of the banks on either side. */
function bridgeOver(prof, wet) {
  const out = prof.slice();
  let n = 0;
  while (n < out.length) {
    if (!wet[n]) {
      n++;
      continue;
    }
    let m = n;
    while (m < out.length && wet[m]) m++;
    const left = n > 0 ? out[n - 1] : out[m] ?? 0;
    const right = m < out.length ? out[m] : left;
    for (let k = n; k < m; k++) out[k] = left + ((right - left) * (k - n + 1)) / (m - n + 1);
    n = m;
  }
  return out;
}
