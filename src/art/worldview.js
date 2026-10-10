// The world, seen from above and a little in front: a painted ground in
// chunks, everything standing on it sorted by depth, clouds over what you
// have not seen, and the light of the hour.

import { WORLD_W, WORLD_H, CELL, COLS, ROWS, T } from '../world/geo.js';
import { world, idxOf, cellX, cellY, hash2, REGION_IDS, colOf, rowOf } from '../world/terrain.js';
import { STRUCTURES, POIS } from '../world/places.js';
import { NODES } from '../world/map.js';
import { fogOf } from '../world/fog.js';
import * as E from '../world/explore.js';
import { decorSprite, mountainSprite, structureSprite, wallSprite, propSprite } from './sprites.js';
import { drawPerson, drawMob, aura, LOOKS, FOLK_LOOKS, groundShadow } from './figures.js';
import { makeParticles, drawParticles, rgba, INK, PAPER } from './ink.js';
import { drawActor, drawPose, poseOf, lookOf, drawSpeech } from './scenery.js';
import { seasonOf } from '../core/calendar.js';
import { stream } from '../core/rng.js';

const CH = 640; // chunk size in world units
const CHX = Math.ceil(WORLD_W / CH);
const CHY = Math.ceil(WORLD_H / CH);
const GROUND_RES = 1.25; // chunk canvas pixels per world unit
const FONT = "'LXGW WenKai TC', 'Kaiti TC', 'STKaiti', 'BiauKai', serif";

// ── ground colours ──

const GROUND = {
  [T.GRASS]: { spring: [178, 192, 140], summer: [150, 174, 128], autumn: [200, 182, 128], winter: [226, 228, 224] },
  [T.TALLGRASS]: { spring: [164, 174, 112], summer: [142, 158, 104], autumn: [200, 166, 100], winter: [214, 210, 196] },
  [T.HILL]: { spring: [182, 172, 134], summer: [168, 164, 124], autumn: [196, 164, 116], winter: [216, 214, 208] },
  [T.FOREST]: { spring: [122, 146, 110], summer: [104, 132, 100], autumn: [160, 124, 82], winter: [192, 196, 192] },
  [T.DEEP]: { spring: [76, 94, 80], summer: [64, 84, 72], autumn: [96, 84, 66], winter: [150, 156, 152] },
  [T.FARM]: { spring: [170, 196, 124], summer: [128, 170, 96], autumn: [218, 190, 106], winter: [206, 198, 180] },
  [T.WASTE]: { spring: [172, 166, 152], summer: [168, 162, 148], autumn: [176, 164, 146], winter: [212, 212, 208] },
  [T.SAND]: { spring: [216, 202, 164], summer: [218, 204, 162], autumn: [214, 196, 156], winter: [226, 222, 212] },
  [T.PAVED]: { all: [198, 192, 180] },
  [T.WALL]: { all: [198, 192, 180] },
  [T.GATE]: { all: [190, 176, 140] },
  [T.ROAD]: { all: [200, 180, 140] },
  [T.TRAIL]: { all: [192, 178, 142] },
  [T.BRIDGE]: { all: [140, 166, 172] },
  [T.PEAK]: { spring: [160, 156, 128], summer: [150, 150, 124], autumn: [176, 156, 120], winter: [212, 212, 208] },
  [T.CLIFF]: { spring: [150, 146, 122], summer: [142, 142, 118], autumn: [166, 148, 114], winter: [204, 204, 200] },
  [T.WATER]: { spring: [140, 172, 178], summer: [128, 164, 172], autumn: [140, 160, 166], winter: [176, 194, 204] },
  [T.VOID]: { all: [244, 242, 236] },
};

const groundColor = (t, season) => GROUND[t]?.[season] || GROUND[t]?.all || GROUND[T.GRASS][season];

/** Under a mountain the ground is whatever the land around it is. */
const UNDER_MOUNTAIN = { qingshi_hill: T.HILL, black_forest: T.FOREST, ancient_ruins: T.WASTE, qingyun_sect: T.HILL, lingxi_valley: T.GRASS };

const PAPER_BG = { spring: '#e9e5d4', summer: '#e3e3d0', autumn: '#ece0c8', winter: '#efefec' };

// ── soft stamps ──

const stamps = new Map();

function stamp(c) {
  const key = c.join(',');
  let s = stamps.get(key);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = s.height = 64;
  const x = s.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(c, 1));
  g.addColorStop(0.55, rgba(c, 0.8));
  g.addColorStop(1, rgba(c, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  stamps.set(key, s);
  return s;
}

// ── indexes of things to draw (built once) ──

let IDX = null;

function indexes() {
  if (IDX) return IDX;
  const g = world();
  const byChunk = () => Array.from({ length: CHX * CHY }, () => []);
  const decor = byChunk();
  for (const d of g.decor) decor[chunkOf(d.x, d.y)].push(d);
  const mountains = byChunk();
  for (const m of g.mountains) mountains[chunkOf(m.x, m.y)].push(m);
  const walls = byChunk();
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (g.terr[idxOf(i, j)] !== T.WALL) continue;
      const vert = isWall(g, i, j - 1) || isWall(g, i, j + 1);
      const horiz = isWall(g, i - 1, j) || isWall(g, i + 1, j);
      walls[chunkOf(cellX(i), cellY(j))].push({ x: cellX(i), y: cellY(j) + CELL / 2 - 2, dir: horiz || !vert ? 'h' : 'v' });
    }
  }
  IDX = { decor, mountains, walls };
  return IDX;
}

function isWall(g, i, j) {
  return i >= 0 && j >= 0 && i < COLS && j < ROWS && g.terr[idxOf(i, j)] === T.WALL;
}

function chunkOf(x, y) {
  const cx = Math.max(0, Math.min(CHX - 1, Math.floor(x / CH)));
  const cy = Math.max(0, Math.min(CHY - 1, Math.floor(y / CH)));
  return cy * CHX + cx;
}

// ── painting the ground ──

const NATURAL = new Set([T.GRASS, T.TALLGRASS, T.HILL, T.FOREST, T.DEEP, T.WASTE, T.SAND, T.PEAK, T.CLIFF, T.VOID, T.PAVED, T.WALL, T.GATE, T.WATER, T.BRIDGE, T.ROAD, T.TRAIL]);

export function paintGround(ctx, x0, y0, x1, y1, season, detail = 1) {
  const g = world();
  ctx.fillStyle = PAPER_BG[season];
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const i0 = Math.max(0, colOf(x0) - 2);
  const i1 = Math.min(COLS - 1, colOf(x1) + 2);
  const j0 = Math.max(0, rowOf(y0) - 2);
  const j1 = Math.min(ROWS - 1, rowOf(y1) + 2);
  // 1. soft washes, cell by cell, so neighbours bleed into each other
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      let t = g.terr[idxOf(i, j)];
      if (t === T.FARM) continue;
      if (t === T.PEAK || t === T.CLIFF) t = UNDER_MOUNTAIN[REGION_IDS[g.reg[idxOf(i, j)]]] || T.GRASS;
      const c = groundColor(t, season);
      const r = CELL * (t === T.WATER ? 0.95 : 1.12);
      const x = cellX(i) + (hash2(i, j, 1) - 0.5) * 10;
      const y = cellY(j) + (hash2(i, j, 2) - 0.5) * 10;
      ctx.globalAlpha = 0.62;
      ctx.drawImage(stamp(c), x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.globalAlpha = 1;
  // 2. fields: a patchwork with ridges between
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      if (g.terr[idxOf(i, j)] !== T.FARM) continue;
      const base = groundColor(T.FARM, season);
      const v = hash2(i >> 1, j >> 1, 3);
      const c = [base[0] + (v - 0.5) * 26, base[1] + (v - 0.5) * 20, base[2] + (v - 0.5) * 18].map((n) => Math.round(n));
      ctx.fillStyle = rgba(c, 0.92);
      ctx.fillRect(i * CELL, j * CELL, CELL, CELL);
      if (detail) {
        ctx.strokeStyle = rgba(INK, 0.12);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        const across = hash2(i >> 1, j >> 1, 4) < 0.5;
        for (let k = 4; k < CELL; k += 5) {
          if (across) {
            ctx.moveTo(i * CELL + 1, j * CELL + k);
            ctx.lineTo(i * CELL + CELL - 1, j * CELL + k);
          } else {
            ctx.moveTo(i * CELL + k, j * CELL + 1);
            ctx.lineTo(i * CELL + k, j * CELL + CELL - 1);
          }
        }
        ctx.stroke();
      }
      // 田埂
      ctx.strokeStyle = rgba([150, 130, 90], 0.55);
      ctx.lineWidth = 1.2;
      if ((i & 1) === 0) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, j * CELL);
        ctx.lineTo(i * CELL, j * CELL + CELL);
        ctx.stroke();
      }
      if ((j & 1) === 0) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, j * CELL);
        ctx.lineTo(i * CELL + CELL, j * CELL);
        ctx.stroke();
      }
    }
  }
  // 3. small marks: grass, moss dots, cracks, pebbles, flowers, snow
  if (detail) {
    const rnd = stream(Math.floor(x0 * 7 + y0 * 13));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const t = g.terr[idxOf(i, j)];
        const cx = cellX(i);
        const cy = cellY(j);
        if (cx < x0 - CELL || cx > x1 + CELL || cy < y0 - CELL || cy > y1 + CELL) continue;
        groundMarks(ctx, rnd, t, cx, cy, season, REGION_IDS[g.reg[idxOf(i, j)]]);
      }
    }
  }
  // 4. paved areas get flagstones
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const t = g.terr[idxOf(i, j)];
      if (t !== T.PAVED && t !== T.WALL) continue;
      ctx.strokeStyle = rgba(INK, 0.1);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let k = 0; k < CELL; k += 13) {
        ctx.moveTo(i * CELL, j * CELL + k);
        ctx.lineTo(i * CELL + CELL, j * CELL + k);
        const off = ((k / 13) % 2) * 9;
        for (let m = off; m < CELL; m += 18) {
          ctx.moveTo(i * CELL + m, j * CELL + k);
          ctx.lineTo(i * CELL + m, j * CELL + k + 13);
        }
      }
      ctx.stroke();
    }
  }
  // 5. water: rivers and lakes, with inked banks
  waterLayer(ctx, g, x0, y0, x1, y1, season);
  // 6. roads, trails, bridges
  roadLayer(ctx, g, x0, y0, x1, y1, season);
}

function groundMarks(ctx, rnd, t, x, y, season, region) {
  const r = rnd();
  switch (t) {
    case T.GRASS:
    case T.TALLGRASS:
    case T.HILL: {
      const n = t === T.TALLGRASS ? 5 : 2;
      ctx.strokeStyle = rgba(season === 'autumn' ? [150, 110, 60] : season === 'winter' ? [160, 160, 150] : [90, 120, 80], 0.35);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const gx = x + (rnd() - 0.5) * CELL;
        const gy = y + (rnd() - 0.5) * CELL;
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + (rnd() - 0.5) * 3, gy - 3 - rnd() * 4);
      }
      ctx.stroke();
      if (season === 'spring' && r < 0.12) {
        ctx.fillStyle = rgba(rnd() < 0.5 ? [230, 180, 190] : [240, 230, 170], 0.85);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(x + (rnd() - 0.5) * CELL, y + (rnd() - 0.5) * CELL, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (t === T.HILL && r > 0.85) {
        ctx.strokeStyle = rgba(INK, 0.18);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y + 6, 12 + rnd() * 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      break;
    }
    case T.FOREST:
    case T.DEEP: {
      ctx.fillStyle = rgba(INK, t === T.DEEP ? 0.22 : 0.14);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (rnd() - 0.5) * CELL, y + (rnd() - 0.5) * CELL, 2.2, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (season === 'autumn') {
        ctx.fillStyle = rgba([180, 100, 50], 0.4);
        for (let k = 0; k < 3; k++) ctx.fillRect(x + (rnd() - 0.5) * CELL, y + (rnd() - 0.5) * CELL, 2, 1.2);
      }
      break;
    }
    case T.WASTE: {
      if (r < 0.4) {
        ctx.strokeStyle = rgba(INK, 0.22);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        let cx = x + (rnd() - 0.5) * CELL;
        let cy = y + (rnd() - 0.5) * CELL;
        ctx.moveTo(cx, cy);
        for (let k = 0; k < 3; k++) {
          cx += (rnd() - 0.5) * 12;
          cy += (rnd() - 0.5) * 8;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      if (region === 'ancient_ruins' && r > 0.9) {
        ctx.fillStyle = rgba([120, 60, 50], 0.18);
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 5, rnd(), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case T.SAND: {
      ctx.fillStyle = rgba(INK, 0.16);
      for (let k = 0; k < 4; k++) ctx.fillRect(x + (rnd() - 0.5) * CELL, y + (rnd() - 0.5) * CELL, 1.1, 1.1);
      break;
    }
    case T.PEAK:
    case T.CLIFF: {
      ctx.strokeStyle = rgba(INK, 0.3);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const sx = x + (rnd() - 0.5) * CELL;
        const sy = y + (rnd() - 0.5) * CELL;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (rnd() - 0.5) * 4, sy + 6 + rnd() * 6);
      }
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  if (season === 'winter' && (t === T.GRASS || t === T.HILL || t === T.FOREST || t === T.FARM) && r < 0.3) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(x + (rnd() - 0.5) * CELL, y + (rnd() - 0.5) * CELL, 8 + rnd() * 8, 3 + rnd() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function nearBox(path, x0, y0, x1, y1, pad) {
  for (const [x, y] of path) if (x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad) return true;
  return false;
}

function strokePath(ctx, path, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

function waterLayer(ctx, g, x0, y0, x1, y1, season) {
  const wc = groundColor(T.WATER, season);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const r of g.rivers) {
    if (!nearBox(r.path, x0, y0, x1, y1, r.width + 60)) continue;
    strokePath(ctx, r.path, r.width + 6, rgba(INK, 0.32));
    strokePath(ctx, r.path, r.width, rgba(wc, 1));
    strokePath(ctx, r.path, r.width * 0.55, rgba([wc[0] - 14, wc[1] - 8, wc[2] - 4], 0.5));
  }
  // ripples on every water cell in view
  const rnd = stream(Math.floor(x0 * 3 + y0 * 5) + 11);
  ctx.strokeStyle = season === 'winter' ? 'rgba(255,255,255,0.5)' : rgba(INK, 0.16);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let j = Math.max(0, rowOf(y0) - 1); j <= Math.min(ROWS - 1, rowOf(y1) + 1); j++) {
    for (let i = Math.max(0, colOf(x0) - 1); i <= Math.min(COLS - 1, colOf(x1) + 1); i++) {
      if (g.terr[idxOf(i, j)] !== T.WATER) continue;
      for (let k = 0; k < 2; k++) {
        const x = cellX(i) + (rnd() - 0.5) * CELL;
        const y = cellY(j) + (rnd() - 0.5) * CELL;
        const len = 6 + rnd() * 12;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len / 2, y - 1.5, x + len, y);
      }
    }
  }
  ctx.stroke();
}

function roadLayer(ctx, g, x0, y0, x1, y1, season) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const near = g.roads.filter((r) => r.kind !== 'pier' && nearBox(r.path, x0, y0, x1, y1, 80));
  // edges first, then the worn middles, so crossings join cleanly
  for (const r of near) {
    if (r.kind === 'road') strokePath(ctx, r.path, r.width * 1.25, rgba([176, 156, 116], 0.35));
    else if (r.kind === 'trail') strokePath(ctx, r.path, r.width * 0.9, rgba([188, 170, 132], 0.5));
    else if (r.kind === 'lane') strokePath(ctx, r.path, r.width + 2, rgba(INK, 0.12));
  }
  for (const r of near) {
    if (r.kind === 'road') strokePath(ctx, r.path, r.width * 0.95, rgba(season === 'winter' ? [214, 206, 190] : [204, 184, 144], 1));
    else if (r.kind === 'lane') strokePath(ctx, r.path, r.width, rgba([196, 190, 178], 1));
  }
  for (const r of near) {
    if (r.kind === 'road') {
      strokePath(ctx, offsetPath(r.path, r.width * 0.18), 1, rgba(INK, 0.1));
      strokePath(ctx, offsetPath(r.path, -r.width * 0.18), 1, rgba(INK, 0.1));
    } else if (r.kind === 'trail') {
      ctx.setLineDash([3, 7]);
      strokePath(ctx, r.path, 1.2, rgba(INK, 0.2));
      ctx.setLineDash([]);
    }
  }
  // bridges and piers: planks across the way wherever it runs over water
  for (const r of g.roads) {
    if (!nearBox(r.path, x0, y0, x1, y1, 80)) continue;
    const half = r.kind === 'road' ? r.width * 0.55 : r.width * 0.6;
    let over = false;
    for (let n = 1; n < r.path.length; n++) {
      const [ax, ay] = r.path[n - 1];
      const [bx, by] = r.path[n];
      const len = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      for (let d = 0; d < len; d += 4) {
        const x = ax + ux * d;
        const y = ay + uy * d;
        const t = g.terr[idxOf(colOf(x), rowOf(y))];
        if (t !== T.BRIDGE) {
          over = false;
          continue;
        }
        const stone = r.kind === 'road';
        ctx.strokeStyle = stone ? rgba([170, 166, 156], 1) : rgba([132, 98, 64], 1);
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(x - uy * half, y + ux * half);
        ctx.lineTo(x + uy * half, y - ux * half);
        ctx.stroke();
        if (over || true) {
          ctx.strokeStyle = rgba(INK, 0.5);
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(x - uy * half + ux * 2, y + ux * half + uy * 2);
          ctx.lineTo(x + uy * half + ux * 2, y - ux * half + uy * 2);
          ctx.stroke();
        }
        // railings
        ctx.fillStyle = rgba(INK, 0.75);
        ctx.fillRect(x - uy * (half + 1) - 0.8, y + ux * (half + 1) - 0.8, 1.6, 1.6);
        ctx.fillRect(x + uy * (half + 1) - 0.8, y - ux * (half + 1) - 0.8, 1.6, 1.6);
        over = true;
      }
    }
  }
  // the lake pavilion's platform
  for (const st of STRUCTURES) {
    if (st.paint !== T.BRIDGE) continue;
    ctx.fillStyle = rgba([150, 116, 80], 1);
    ctx.fillRect(st.x - st.w / 2, st.y - st.h / 2, st.w, st.h);
    ctx.strokeStyle = rgba(INK, 0.4);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = st.x - st.w / 2; x < st.x + st.w / 2; x += 5) {
      ctx.moveTo(x, st.y - st.h / 2);
      ctx.lineTo(x, st.y + st.h / 2);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 1;
    ctx.strokeRect(st.x - st.w / 2, st.y - st.h / 2, st.w, st.h);
  }
}

function offsetPath(path, d) {
  const out = [];
  for (let n = 0; n < path.length; n++) {
    const a = path[Math.max(0, n - 1)];
    const b = path[Math.min(path.length - 1, n + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    out.push([path[n][0] - ((b[1] - a[1]) / len) * d, path[n][1] + ((b[0] - a[0]) / len) * d]);
  }
  return out;
}

// ── the cloud texture ──

function cloudTile() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#f1efe8';
  x.fillRect(0, 0, 256, 256);
  const rnd = stream(77);
  for (let i = 0; i < 46; i++) {
    const cx = rnd() * 256;
    const cy = rnd() * 256;
    const r = 18 + rnd() * 46;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
      const shade = rnd() < 0.5 ? [214, 212, 206] : [255, 255, 252];
      g.addColorStop(0, rgba(shade, 0.55));
      g.addColorStop(1, rgba(shade, 0));
      x.fillStyle = g;
      x.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
    }
  }
  // a few curling ink lines, like clouds in old paintings
  x.strokeStyle = 'rgba(150,146,138,0.35)';
  x.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * 256;
    const cy = rnd() * 256;
    x.beginPath();
    x.arc(cx, cy, 8 + rnd() * 10, Math.PI * 0.2, Math.PI * 1.6);
    x.arc(cx + 14, cy - 2, 6 + rnd() * 6, Math.PI * 0.9, Math.PI * 2.1);
    x.stroke();
  }
  return c;
}

// ── the view ──

/**
 * opts.onFrame(dt) is called before each frame is drawn (the UI steps the
 * world there). Returns controls for the UI.
 */
export function createWorldView(canvas, { onFrame, idle } = {}) {
  const ctx = canvas.getContext('2d');
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let s = null;
  let W = 1;
  let H = 1;
  let dpr = 1;
  let zoom = 0.82;
  const cam = { x: 1060, y: 3200 };
  let season = 'spring';
  let raf = 0;
  let running = false;
  let last = 0;
  let t = 0;
  const chunks = new Map();
  let chunkQueue = [];
  let fogCanvas = null;
  let fogFor = null;
  let fogLayer = null;
  let cloudPattern = null;
  let cloudCanvas = null;
  let grainPattern = null;
  let particles = [];
  let particleKind = null;
  let highlight = null;
  let tapMark = null;
  let lastPos = null;
  let vel = { x: 0, y: 0 };
  let lastDraw = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    fogLayer = document.createElement('canvas');
    fogLayer.width = canvas.width;
    fogLayer.height = canvas.height;
    particles = [];
    particleKind = null;
  }

  // ── chunks ──

  function chunkKey(cx, cy) {
    return `${cx},${cy},${season}`;
  }

  function getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    const c = chunks.get(key);
    if (c) {
      c.used = t;
      return c.canvas;
    }
    if (!chunkQueue.includes(key)) chunkQueue.push(key);
    return null;
  }

  function buildChunk(key) {
    const [cx, cy, sea] = key.split(',');
    const x0 = Number(cx) * CH;
    const y0 = Number(cy) * CH;
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(CH * GROUND_RES);
    const g = c.getContext('2d');
    g.scale(GROUND_RES, GROUND_RES);
    g.translate(-x0, -y0);
    g.save();
    g.beginPath();
    g.rect(x0, y0, CH, CH);
    g.clip();
    paintGround(g, x0, y0, x0 + CH, y0 + CH, sea);
    g.restore();
    chunks.set(key, { canvas: c, used: t });
    // keep memory in check
    if (chunks.size > 16) {
      const old = [...chunks.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, chunks.size - 16);
      for (const [k] of old) chunks.delete(k);
    }
  }

  // ── clouds ──

  function rebuildFog() {
    const f = fogOf(s);
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = COLS * 2;
    fogCanvas.height = ROWS * 2;
    const g = fogCanvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    g.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < f.bits.length; k++) if (f.bits[k]) clearCell(g, k);
    f.recent.length = 0;
    fogFor = s.world;
  }

  const holeStamp = (() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.9)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 16, 16);
    return c;
  })();

  function clearCell(g, k) {
    const i = k % COLS;
    const j = (k - i) / COLS;
    g.drawImage(holeStamp, i * 2 - 1.6, j * 2 - 1.6, 5.2, 5.2);
  }

  function updateFog() {
    if (!fogCanvas || fogFor !== s.world) return rebuildFog();
    const f = fogOf(s);
    if (!f.recent.length) return;
    const g = fogCanvas.getContext('2d');
    g.globalCompositeOperation = 'destination-out';
    for (const k of f.recent) clearCell(g, k);
    f.recent.length = 0;
  }

  // ── transforms ──

  /** up: how far above the ground (world units), as a standing thing is drawn. */
  function worldToScreen(x, y, up = 0) {
    return [(x - cam.x) * zoom + W / 2, (y - up - cam.y) * zoom + H / 2];
  }

  function screenToWorld(sx, sy) {
    return [(sx - W / 2) / zoom + cam.x, (sy - H / 2) / zoom + cam.y];
  }

  function viewBox(pad = 0) {
    const hw = W / 2 / zoom + pad;
    const hh = H / 2 / zoom + pad;
    return [cam.x - hw, cam.y - hh, cam.x + hw, cam.y + hh];
  }

  function worldTransform() {
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (W / 2 - cam.x * zoom), dpr * (H / 2 - cam.y * zoom));
  }

  // ── frame ──

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    t += dt;
    onFrame?.(dt);
    // while a sheet covers the world, a few frames a second are enough
    if (s && (!idle?.() || now - lastDraw > 180)) {
      draw(Math.min(0.2, (now - (lastDraw || now)) / 1000));
      lastDraw = now;
    }
    raf = requestAnimationFrame(frame);
  }

  function followCamera(dt, snap) {
    const w = s.world;
    if (lastPos && dt > 0) {
      const vx = (w.x - lastPos[0]) / dt;
      const vy = (w.y - lastPos[1]) / dt;
      vel.x += (vx - vel.x) * Math.min(1, dt * 4);
      vel.y += (vy - vel.y) * Math.min(1, dt * 4);
    }
    lastPos = [w.x, w.y];
    const tx = w.x + vel.x * 0.35;
    const ty = w.y + vel.y * 0.35 - 20;
    if (snap || Math.hypot(tx - cam.x, ty - cam.y) > 900) {
      cam.x = tx;
      cam.y = ty;
      vel = { x: 0, y: 0 };
    } else {
      const k = 1 - Math.exp(-dt * 5);
      cam.x += (tx - cam.x) * k;
      cam.y += (ty - cam.y) * k;
    }
    const [vx0, vy0, vx1, vy1] = [W / 2 / zoom, H / 2 / zoom, WORLD_W - W / 2 / zoom, WORLD_H - H / 2 / zoom];
    cam.x = Math.max(vx0, Math.min(vx1, cam.x));
    cam.y = Math.max(vy0, Math.min(vy1, cam.y));
  }

  function draw(dt, snap = false) {
    const nowSeason = seasonOf(s.day);
    if (nowSeason !== season) {
      season = nowSeason;
      chunks.clear();
      chunkQueue = [];
    }
    followCamera(dt, snap);
    updateFog();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER_BG[season];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    worldTransform();
    const [x0, y0, x1, y1] = viewBox(10);
    // ground
    const cx0 = Math.max(0, Math.floor(x0 / CH));
    const cx1 = Math.min(CHX - 1, Math.floor(x1 / CH));
    const cy0 = Math.max(0, Math.floor(y0 / CH));
    const cy1 = Math.min(CHY - 1, Math.floor(y1 / CH));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = getChunk(cx, cy);
        if (c) ctx.drawImage(c, cx * CH, cy * CH, CH, CH);
        else {
          // not painted yet: a quick low-detail wash
          ctx.save();
          ctx.beginPath();
          ctx.rect(cx * CH, cy * CH, CH, CH);
          ctx.clip();
          paintGround(ctx, cx * CH, cy * CH, cx * CH + CH, cy * CH + CH, season, 0);
          ctx.restore();
        }
      }
    }
    // paint one or two waiting chunks per frame
    const budget = snap ? 9 : 2;
    for (let n = 0; n < budget && chunkQueue.length; n++) buildChunk(chunkQueue.shift());
    drawGroundFx();
    const above = drawStanding(x0, y0, x1, y1);
    drawLight();
    drawFog(x0, y0, x1, y1, above);
    drawScreenFx(dt);
  }

  // things on the ground that are not standing: rings, marks, miasma
  function drawGroundFx() {
    const w = s.world;
    if (highlight) {
      const r = 16 + Math.sin(t * 4) * 2;
      ctx.strokeStyle = 'rgba(168,50,42,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(highlight.x, highlight.y + 2, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const path = E.pathOf(s);
    if (path?.length) {
      const [gx, gy] = path[path.length - 1];
      ctx.fillStyle = 'rgba(168,50,42,0.75)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 6, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168,50,42,0.4)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      for (const [px, py] of path.slice(0, 6)) ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (tapMark && t - tapMark.t < 0.6) {
      const k = (t - tapMark.t) / 0.6;
      ctx.strokeStyle = `rgba(168,50,42,${0.6 * (1 - k)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(tapMark.x, tapMark.y, 6 + k * 18, (6 + k * 18) * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // the player's mark, so you never lose yourself in the woods
    ctx.fillStyle = 'rgba(168,50,42,0.18)';
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + 1, 11, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Everything that stands up, sorted by its foot. Returns the faint ones to draw above the clouds. */
  function drawStanding(x0, y0, x1, y1) {
    const idx = indexes();
    const f = fogOf(s);
    const seen = (x, y) => !!f.bits[idxOf(colOf(x), rowOf(y))];
    const list = [];
    const above = [];
    const push = (y, kind, a, b) => list.push({ y, kind, a, b });
    const qx0 = Math.max(0, Math.floor((x0 - 140) / CH));
    const qx1 = Math.min(CHX - 1, Math.floor((x1 + 140) / CH));
    const qy0 = Math.max(0, Math.floor((y0 - 40) / CH));
    const qy1 = Math.min(CHY - 1, Math.floor((y1 + 480) / CH));
    for (let cy = qy0; cy <= qy1; cy++) {
      for (let cx = qx0; cx <= qx1; cx++) {
        const k = cy * CHX + cx;
        for (const d of idx.decor[k]) {
          if (d.x < x0 - 60 || d.x > x1 + 60 || d.y < y0 - 10 || d.y > y1 + 130) continue;
          push(d.y, 'decor', d);
        }
        for (const m of idx.mountains[k]) {
          if (m.x + m.w / 2 < x0 || m.x - m.w / 2 > x1 || m.y < y0 || m.y - m.h > y1) continue;
          if (seen(m.x, m.y - 10)) push(m.y, 'mount', m);
          else above.push(m);
        }
        for (const wl of idx.walls[k]) {
          if (wl.x < x0 - 40 || wl.x > x1 + 40 || wl.y < y0 || wl.y > y1 + 70) continue;
          push(wl.y, 'wall', wl);
        }
      }
    }
    STRUCTURES.forEach((st, i) => {
      if (!st.sprite) return;
      const fy = st.y + st.h / 2;
      if (st.x + st.w < x0 - 40 || st.x - st.w > x1 + 40 || fy < y0 || fy - 300 > y1) return;
      if (st.landmark && !seen(st.x, st.y)) above.push({ st, i });
      push(fy, 'struct', st, i);
    });
    for (const p of POIS) {
      if (p.x < x0 - 120 || p.x > x1 + 120 || p.y < y0 - 40 || p.y > y1 + 160) continue;
      if (!E.poiVisible(s, p)) continue;
      const sprite = p.spriteIf ? (p.spriteIf(s) ? p.sprite : null) : p.sprite;
      if (sprite) push(p.y - 1, 'prop', p, sprite);
      if (p.crowd?.(s)) for (let n = 0; n < 9; n++) push(p.y + 6 + hash2(n, 1, p.x) * 50, 'crowd', p, n);
      if (p.festive?.(s)) push(p.y + 2, 'festive', p);
      if (p.camp?.(s)) for (let n = 0; n < 4; n++) push(p.y + 40 + n * 12, 'camp', p, n);
    }
    for (const h of world().herbs) {
      if (h.x < x0 - 20 || h.x > x1 + 20 || h.y < y0 || h.y > y1 + 30) continue;
      if (E.herbReady(s, h)) push(h.y, 'herb', h);
    }
    for (const n of E.peopleInWorld(s)) {
      if (n.x < x0 - 30 || n.x > x1 + 30 || n.y < y0 || n.y > y1 + 50) continue;
      // at home: they come to the door when you are close
      if (n.inside && Math.hypot(n.x - s.world.x, n.y - s.world.y) > E.DOOR) continue;
      push(n.y, 'npc', n);
    }
    for (const fk of E.folkInWorld(s)) {
      if (fk.x < x0 - 30 || fk.x > x1 + 30 || fk.y < y0 || fk.y > y1 + 50) continue;
      push(fk.y, 'folk', fk);
    }
    for (const m of E.mobsInWorld(s)) {
      for (const b of m.members) {
        if (b.x < x0 - 30 || b.x > x1 + 30 || b.y < y0 || b.y > y1 + 50) continue;
        push(b.y, 'mob', m, b);
      }
    }
    for (const sc of E.scenesInWorld(s)) {
      for (const ac of sc.actors) {
        if (ac.x < x0 - 60 || ac.x > x1 + 60 || ac.y < y0 || ac.y > y1 + 80) continue;
        push(ac.y, 'scene', ac, sc);
      }
    }
    for (const c of E.wildInWorld(s)) {
      if (c.x < x0 - 30 || c.x > x1 + 30 || c.y < y0 || c.y > y1 + 60) continue;
      push(c.y, 'wild', c);
    }
    const w = s.world;
    push(w.y, 'player', w);
    list.sort((a, b) => a.y - b.y);
    for (const it of list) drawItem(it);
    // show the player through anything tall in front of them
    ctx.globalAlpha = 0.3;
    drawItem({ kind: 'player', a: w });
    ctx.globalAlpha = 1;
    drawLabels();
    return above;
  }

  function drawSprite(sp, x, y, w, h) {
    if (!sp) return;
    if (w) ctx.drawImage(sp.c, x - (sp.fx / sp.w) * w, y - (sp.fy / sp.h) * h, w, h);
    else ctx.drawImage(sp.c, x - sp.fx, y - sp.fy, sp.w, sp.h);
  }

  function drawItem(it) {
    switch (it.kind) {
      case 'decor': {
        const d = it.a;
        const sp = decorSprite(d.kind, d.v, season);
        drawSprite(sp, d.x, d.y, sp.w * d.s, sp.h * d.s);
        break;
      }
      case 'mount': {
        const m = it.a;
        drawSprite(mountainSprite(m.kind, m.v, season), m.x, m.y, m.w, m.h);
        break;
      }
      case 'wall':
        drawSprite(wallSprite(it.a.dir, season), it.a.x, it.a.y);
        break;
      case 'struct': {
        const st = it.a;
        drawSprite(structureSprite(st, it.b, season), st.x, st.y + st.h / 2);
        break;
      }
      case 'prop': {
        const p = it.a;
        const sp = propSprite(it.b);
        drawSprite(sp, p.x, p.y);
        if (it.b === 'sword_glint') sparkle(p.x + 1, p.y - 22, 1);
        if (it.b === 'lightning_tree' && Math.sin(t * 3 + p.x) > 0.7) {
          ctx.strokeStyle = 'rgba(150,190,255,0.9)';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(p.x - 2, p.y - 40);
          ctx.lineTo(p.x + 3, p.y - 30);
          ctx.lineTo(p.x - 1, p.y - 22);
          ctx.stroke();
        }
        if (it.b === 'girl') {
          // crying: little lines
          ctx.strokeStyle = 'rgba(80,110,160,0.6)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x + 5, p.y - 20 + Math.sin(t * 6) * 1.5);
          ctx.lineTo(p.x + 9, p.y - 23);
          ctx.stroke();
        }
        break;
      }
      case 'crowd': {
        const p = it.a;
        const n = it.b;
        const x = p.x + (hash2(n, 2, p.x) - 0.5) * 120;
        const y = it.y;
        drawPerson(ctx, x, y, FOLK_LOOKS[n % FOLK_LOOKS.length], { t: t + n, face: x < p.x ? 1 : -1 });
        break;
      }
      case 'festive': {
        const p = it.a;
        for (const dx of [-26, 26]) {
          ctx.strokeStyle = rgba(INK, 0.6);
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x + dx, p.y - 30);
          ctx.lineTo(p.x + dx, p.y - 22);
          ctx.stroke();
          ctx.fillStyle = 'rgba(190,40,34,0.95)';
          ctx.beginPath();
          ctx.ellipse(p.x + dx, p.y - 18, 3.4, 4.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(190,40,34,0.9)';
        ctx.fillRect(p.x - 7, p.y - 34, 14, 10);
        ctx.fillStyle = 'rgba(240,210,120,1)';
        ctx.font = `700 8px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('囍', p.x, p.y - 29);
        break;
      }
      case 'camp': {
        const p = it.a;
        const n = it.b;
        const x = p.x + (n - 1.5) * 46 + (hash2(n, 3, 1) - 0.5) * 16;
        if (n % 2) drawPerson(ctx, x, it.y, FOLK_LOOKS[4], { t: t + n, face: n < 2 ? 1 : -1 });
        else {
          ctx.fillStyle = 'rgba(120,100,80,0.95)';
          ctx.beginPath();
          ctx.moveTo(x - 14, it.y);
          ctx.lineTo(x, it.y - 18);
          ctx.lineTo(x + 14, it.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = rgba(INK, 0.7);
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        break;
      }
      case 'herb': {
        const h = it.a;
        drawSprite(propSprite('herb'), h.x, h.y);
        sparkle(h.x, h.y - 13, 0.8 + 0.4 * Math.sin(t * 3 + h.id));
        break;
      }
      case 'npc': {
        const n = it.a;
        const look = LOOKS[n.id] || LOOKS.stranger;
        const w = s.world;
        const dn = Math.hypot(n.x - w.x, n.y - w.y);
        // busy with something, they face their work; otherwise they turn to you
        const face = n.moving || n.fixed ? n.face : dn < 260 || n.face === undefined ? (n.x > w.x ? -1 : 1) : n.face;
        ctx.save();
        ctx.translate(n.x, n.y);
        drawPose(ctx, look, poseOf(n, E.isNight(s)), { t: t + n.x * 0.01, face, moving: n.moving });
        ctx.restore();
        if (n.id === 'hu_sanniang') glowDot(n.x, n.y - 20, [120, 170, 240], 28, 0.35);
        break;
      }
      case 'folk': {
        const fk = it.a;
        ctx.save();
        ctx.translate(fk.x, fk.y);
        drawPose(ctx, lookOf(fk.look), poseOf(fk, E.isNight(s)), { t: t + fk.line + fk.x * 0.01, moving: fk.moving, face: fk.face });
        ctx.restore();
        break;
      }
      case 'mob': {
        const m = it.a;
        const b = it.b;
        ctx.save();
        ctx.globalAlpha *= 1 - (m.fade || 0);
        drawMob(ctx, m.def.kind, b.x, b.y, { t: t + b.x * 0.01, moving: b.moving, face: b.face });
        ctx.restore();
        if (m.state === 'chase' || m.alert) {
          ctx.fillStyle = m.state === 'chase' ? 'rgba(168,50,42,0.9)' : 'rgba(35,32,27,0.8)';
          ctx.font = `700 10px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText(m.state === 'chase' ? '！' : '？', b.x, b.y - 38);
        }
        break;
      }
      case 'wild': {
        const c = it.a;
        ctx.save();
        ctx.translate(c.x, c.y - c.fly * 34);
        drawActor(ctx, { a: 'beast', beast: c.kind, face: c.face, moving: c.moving, fly: c.fly, n: c.seed }, { t, alpha: 1 - c.fade });
        ctx.restore();
        break;
      }
      case 'scene': {
        const ac = it.a;
        ctx.save();
        ctx.translate(ac.x, ac.y);
        drawActor(ctx, ac, { t, alpha: Math.max(0, 1 - it.b.fade) });
        ctx.restore();
        break;
      }
      case 'player': {
        const w = it.a;
        const sit = !!s.secl;
        if (sit) aura(ctx, w.x, w.y, t, 1);
        const moving = E.liveOf(s).moving;
        drawPerson(ctx, w.x, w.y, LOOKS.player, { t, moving, face: w.face || 1, sit });
        break;
      }
      default:
        break;
    }
  }

  function sparkle(x, y, a) {
    const r = 3 + Math.sin(t * 5 + x) * 1;
    ctx.strokeStyle = `rgba(255,248,210,${0.85 * a})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, y + r);
    ctx.stroke();
    glowDot(x, y, [255, 240, 190], 8, 0.35 * a);
  }

  function glowDot(x, y, c, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** Names over people close by, and over the thing you would act on. */
  function drawLabels() {
    const w = s.world;
    const labels = [];
    const said = [];
    for (const n of E.peopleInWorld(s)) {
      const d = Math.hypot(n.x - w.x, n.y - w.y);
      if (n.inside && d > E.DOOR) continue;
      if (d < 230) labels.push([n.x, n.y - 44, n.name, n.named ? 1 : 0.8]);
      if (n.say) said.push([n.x, n.y - 54, n.say]);
    }
    for (const fk of E.folkInWorld(s)) {
      const say = E.sayingOf(s, fk);
      if (say) said.push([fk.x, fk.y - 50, say]);
    }
    if (highlight && highlight.kind !== 'npc' && highlight.kind !== 'folk') labels.push([highlight.x, highlight.y - (highlight.kind === 'herb' ? 26 : 50), highlight.name, 1]);
    for (const p of POIS) {
      if (!p.verb || highlight?.id === p.id) continue;
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d > 190 || !E.poiVisible(s, p)) continue;
      labels.push([p.x, p.y - 44, E.poiName(s, p), 0.55]);
    }
    // scenes: a name when close, a bubble from afar
    const bubbles = [];
    for (const sc of E.scenesInWorld(s)) {
      if (sc.state !== 'idle') continue;
      const d = Math.hypot(sc.x - w.x, sc.y - w.y);
      const lead = sc.actors.find((a) => a.a !== 'prop') || sc.actors[0];
      const named = d < 230 && sc.def.start === 'touch';
      if (named) labels.push([lead.x, lead.y - 44, sc.def.name, 0.75]);
      if (sc.def.bubble && !named && d < 520 && d > 70) bubbles.push([lead.x, lead.y - 48 + Math.sin(t * 3 + sc.uid) * 2, sc.def.bubble]);
    }
    for (const [x, y, b] of bubbles) {
      ctx.fillStyle = 'rgba(250,246,236,0.95)';
      ctx.strokeStyle = 'rgba(35,32,27,0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 7.5, 0, 0, Math.PI * 2);
      ctx.moveTo(x - 2.5, y + 6.5);
      ctx.lineTo(x, y + 11);
      ctx.lineTo(x + 2.5, y + 6.5);
      ctx.fill();
      ctx.stroke();
      ctx.font = `700 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = b === '！' ? 'rgba(168,50,42,0.95)' : 'rgba(35,32,27,0.9)';
      ctx.fillText(b, x, y + 0.5);
    }
    for (const [x, y, text] of said) drawSpeech(ctx, x, y, text, { font: FONT, size: 9 });
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [x, y, text, a] of labels) {
      const tw = ctx.measureText(text).width + 8;
      ctx.fillStyle = `rgba(239,233,219,${0.82 * a})`;
      ctx.fillRect(x - tw / 2, y - 7, tw, 14);
      ctx.strokeStyle = `rgba(35,32,27,${0.35 * a})`;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(x - tw / 2, y - 7, tw, 14);
      ctx.fillStyle = `rgba(35,32,27,${a})`;
      ctx.fillText(text, x, y + 0.5);
    }
  }

  function drawLight() {
    const dark = E.darkness(s.tod);
    const dusk = s.tod >= 16 && s.tod < 19.5 ? Math.sin(((s.tod - 16) / 3.5) * Math.PI) : s.tod >= 4.5 && s.tod < 7 ? Math.sin(((s.tod - 4.5) / 2.5) * Math.PI) * 0.6 : 0;
    const [x0, y0, x1, y1] = viewBox(20);
    if (dusk > 0.01) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(255,${Math.round(214 - 40 * dusk)},${Math.round(180 - 70 * dusk)},${0.55 * dusk})`;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (dark > 0.01) {
      ctx.globalCompositeOperation = 'multiply';
      const r = Math.round(255 - (255 - 104) * dark);
      const g = Math.round(255 - (255 - 116) * dark);
      const b = Math.round(255 - (255 - 160) * dark);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.globalCompositeOperation = 'lighter';
      const lamp = (x, y, c, rad, a) => {
        if (x < x0 - rad || x > x1 + rad || y < y0 - rad || y > y1 + rad) return;
        glowDot(x, y, c, rad, a * dark);
      };
      for (const st of STRUCTURES) {
        if (!st.sprite) continue;
        // windows and lanterns: small warm pools of light at the doors
        const lit = { mansion: 2, teahouse: 2, auction: 3, shop: 1, house: 1, farmhouse: 1, hall: 1, bighall: 2, tower: 1, teashed: 1, hut: 1, pavilion: 1 }[st.sprite];
        if (lit) {
          const fy = st.y + st.h / 2;
          if (lit > 1) for (const s2 of [-1, 1]) lamp(st.x + s2 * st.w * 0.3, fy - 14, [255, 160, 80], 22, 0.55);
          lamp(st.x, fy - 6, [255, 176, 100], 18 + st.w * 0.12, 0.42);
        }
        if (st.sprite === 'tent') lamp(st.x - st.w / 2 - 12, st.y + st.h / 2, [255, 150, 70], 50, 0.5);
      }
      for (const p of POIS) {
        if (!E.poiVisible(s, p)) continue;
        if (p.glow?.(s)) lamp(p.x, p.y - 14, p.region === 'fox_shrine' ? [110, 160, 255] : p.region === 'ancient_ruins' ? [150, 120, 255] : [240, 230, 190], 60, 0.55);
        if (p.camp?.(s)) lamp(p.x, p.y + 50, [255, 150, 70], 70, 0.55);
      }
      const w = s.world;
      lamp(w.x, w.y - 12, [255, 220, 170], 110 + 20 * Math.min(4, s.player.realm), 0.2);
      // lamps carried at night: the watchman's, and whoever comes to the door
      for (const fk of E.folkInWorld(s)) if (fk.act === 'gong') lamp(fk.x + fk.face * 12, fk.y - 15, [255, 170, 90], 40, 0.6);
      for (const n of E.peopleInWorld(s)) if (n.inside && Math.hypot(n.x - w.x, n.y - w.y) <= E.DOOR) lamp(n.x + (n.x > w.x ? -12 : 12), n.y - 15, [255, 170, 90], 38, 0.55);
      for (const h of world().herbs) if (E.herbReady(s, h)) lamp(h.x, h.y - 10, [210, 255, 210], 16, 0.4);
      for (const c of E.wildInWorld(s)) {
        if (c.kind === 'fox') lamp(c.x + c.face * 13, c.y - 6, [110, 160, 255], 40, 0.6 * (1 - c.fade));
        if (c.kind === 'spirit_deer') lamp(c.x, c.y - 16, [190, 255, 230], 46, 0.5 * (1 - c.fade));
      }
    } else {
      // daytime glows still show, softly
      for (const p of POIS) {
        if (!E.poiVisible(s, p) || !p.glow?.(s)) continue;
        if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        ctx.globalCompositeOperation = 'lighter';
        glowDot(p.x, p.y - 14, [200, 210, 255], 40, 0.18);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // miasma
    for (const p of POIS) {
      if (!p.zone || p.x < x0 - p.zone || p.x > x1 + p.zone || p.y < y0 - p.zone || p.y > y1 + p.zone) continue;
      for (let k = 0; k < 5; k++) {
        const a = t * 0.2 + k * 1.3;
        const x = p.x + Math.cos(a) * p.zone * 0.35;
        const y = p.y + Math.sin(a * 0.8) * p.zone * 0.2;
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.zone * 0.7);
        g.addColorStop(0, 'rgba(130,90,150,0.22)');
        g.addColorStop(1, 'rgba(130,90,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - p.zone, y - p.zone, p.zone * 2, p.zone * 2);
      }
    }
  }

  function drawFog(x0, y0, x1, y1, above) {
    if (!fogCanvas) return;
    if (!cloudCanvas) {
      cloudCanvas = cloudTile();
    }
    const fc = fogLayer.getContext('2d');
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.globalCompositeOperation = 'source-over';
    fc.clearRect(0, 0, fogLayer.width, fogLayer.height);
    fc.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (W / 2 - cam.x * zoom), dpr * (H / 2 - cam.y * zoom));
    fc.imageSmoothingEnabled = true;
    fc.drawImage(fogCanvas, 0, 0, WORLD_W, WORLD_H);
    // the clouds' own texture, drifting
    fc.globalCompositeOperation = 'source-in';
    if (!cloudPattern) cloudPattern = fc.createPattern(cloudCanvas, 'repeat');
    const drift = (t * 6) % 256;
    fc.save();
    fc.translate(drift, drift * 0.3);
    fc.scale(2.2, 2.2);
    fc.fillStyle = cloudPattern;
    fc.fillRect(x0 / 2.2 - 300, y0 / 2.2 - 300, (x1 - x0) / 2.2 + 600, (y1 - y0) / 2.2 + 600);
    fc.restore();
    // night darkens the clouds too
    const dark = E.darkness(s.tod);
    if (dark > 0.01) {
      fc.globalCompositeOperation = 'source-atop';
      fc.fillStyle = `rgba(70,80,116,${0.42 * dark})`;
      fc.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fogLayer, 0, 0);
    // mountains and great buildings show faintly through the clouds
    worldTransform();
    ctx.globalAlpha = 0.32;
    above.sort((a, b) => (a.y ?? a.st.y) - (b.y ?? b.st.y));
    for (const m of above) {
      if (m.st) drawSprite(structureSprite(m.st, m.i, season), m.st.x, m.st.y + m.st.h / 2);
      else drawSprite(mountainSprite(m.kind, m.v, season), m.x, m.y, m.w, m.h);
    }
    ctx.globalAlpha = 1;
    // names of places you have heard of, written over the clouds
    const f = fogOf(s);
    ctx.font = `700 ${Math.round(18 / Math.max(0.6, zoom))}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [id, n] of Object.entries(NODES)) {
      if (!s.nodes[id]?.known || s.nodes[id]?.visited) continue;
      const [lx, ly] = n.label || n.at || [];
      if (lx === undefined || lx < x0 - 200 || lx > x1 + 200 || ly < y0 - 100 || ly > y1 + 100) continue;
      if (f.bits[idxOf(colOf(lx), rowOf(ly))]) continue;
      ctx.fillStyle = 'rgba(80,72,62,0.55)';
      ctx.fillText(n.name, lx, ly);
      ctx.fillStyle = 'rgba(168,50,42,0.5)';
      ctx.fillText('？', lx, ly + 22 / Math.max(0.6, zoom));
    }
  }

  function drawScreenFx(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const kind = { spring: 'petal', summer: 'seed', autumn: 'leaf', winter: 'snow' }[season];
    if (!reduce) {
      if (particleKind !== kind) {
        particleKind = kind;
        particles = makeParticles(kind, stream(5), W, H, kind === 'snow' ? 60 : kind === 'seed' ? 10 : 22);
      }
      drawParticles(ctx, kind, particles, W, H, dt * 1000, t * 1000, false);
    }
    if (!grainPattern) {
      const gc = document.createElement('canvas');
      gc.width = gc.height = 128;
      const g = gc.getContext('2d');
      const r = stream(9);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(80,60,30,0.05)' : 'rgba(255,255,255,0.06)';
        g.fillRect(r() * 128, r() * 128, 1, 1);
      }
      grainPattern = ctx.createPattern(gc, 'repeat');
    }
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, 0, W, H);
    // a soft vignette, like the edge of a scroll
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(60,48,30,0)');
    v.addColorStop(1, 'rgba(60,48,30,0.16)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  return {
    setState(next) {
      s = next;
      if (s) {
        E.ensureWorld(s);
        lastPos = null;
        fogFor = null;
        if (W > 1) {
          followCamera(0, true);
        }
      }
    },
    resize,
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    /** Draw once now (for a still frame, e.g. reduced motion). */
    redraw() {
      if (s) draw(0, true);
    },
    screenToWorld,
    worldToScreen,
    get zoom() {
      return zoom;
    },
    setZoom(z) {
      zoom = Math.max(0.45, Math.min(1.5, z));
    },
    setHighlight(tg) {
      highlight = tg;
    },
    markTap(x, y) {
      tapMark = { x, y, t };
    },
    snap() {
      if (s) followCamera(0, true);
    },
  };
}

// ── the whole map, small ──

/** Paint the entire world at a small scale (for the map and the minimap). */
export function paintWorldThumb(season, scale = 0.12) {
  const c = document.createElement('canvas');
  c.width = Math.round(WORLD_W * scale);
  c.height = Math.round(WORLD_H * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  paintGround(ctx, 0, 0, WORLD_W, WORLD_H, season, 0);
  // mountains as little inked peaks
  const g = world();
  for (const m of [...g.mountains].sort((a, b) => a.y - b.y)) {
    const w = m.w * 0.8;
    const h = Math.min(m.h * 0.7, w * 0.8);
    ctx.fillStyle = rgba(INK, 0.38);
    ctx.beginPath();
    ctx.moveTo(m.x - w / 2, m.y);
    ctx.quadraticCurveTo(m.x - w * 0.1, m.y - h * 0.9, m.x, m.y - h);
    ctx.quadraticCurveTo(m.x + w * 0.1, m.y - h * 0.9, m.x + w / 2, m.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  for (const d of g.decor) {
    if (d.kind === 'tuft' || d.kind === 'reed' || d.kind === 'bones' || d.kind === 'sword') continue;
    ctx.fillStyle = rgba(INK, d.kind === 'rock' ? 0.25 : 0.3);
    ctx.beginPath();
    ctx.arc(d.x, d.y - 10, d.kind === 'bush' ? 8 : 14, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const st of STRUCTURES) {
    if (!st.sprite || st.block === false) continue;
    ctx.fillStyle = rgba([150, 60, 46], 0.85);
    ctx.fillRect(st.x - st.w / 2, st.y - st.h / 2, st.w, st.h);
  }
  return c;
}
