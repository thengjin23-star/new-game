// Everything that stands up in the world, painted once into small canvases:
// trees, rocks, mountains drawn the way old maps draw them, buildings seen
// from above and in front, and the odd things you find off the road.
// Sizes are in world units; a sprite's foot is where it touches the ground.

import { stream, hashStr } from '../core/rng.js';
import { INK, RED, PAPER, rgba } from './ink.js';

const RES = 2; // canvas pixels per world unit
const FONT = "'LXGW WenKai TC', 'Kaiti TC', 'STKaiti', 'BiauKai', serif";

const WOOD = [96, 64, 42];
const PLASTER = [238, 232, 216];
const TILE = [66, 72, 80];
const TILE_RED = [146, 56, 42];
const STRAW = [178, 150, 98];
const STONE = [158, 152, 140];
const GOLD = [196, 158, 78];
const SNOW = [250, 250, 252];

const LEAF = {
  spring: [[118, 156, 96], [140, 172, 108]],
  summer: [[66, 112, 86], [84, 128, 94]],
  autumn: [[184, 112, 52], [168, 68, 44], [196, 150, 70]],
  winter: [[128, 132, 124]],
};
const PINE = { spring: [52, 84, 70], summer: [42, 74, 62], autumn: [56, 80, 66], winter: [60, 76, 72] };

const cache = new Map();
let fontsReady = false;

/** Text on signs needs the brush font; re-paint signs once it has loaded. */
if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => {
    fontsReady = true;
    for (const k of [...cache.keys()]) if (k.startsWith('st:')) cache.delete(k);
  });
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * RES));
  c.height = Math.max(1, Math.ceil(h * RES));
  const ctx = c.getContext('2d');
  ctx.scale(RES, RES);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return [c, ctx];
}

/** Painting switches: no shadow when a sprite stands as a card in the 3D world. */
export const SPRITE = { shadows: true };

/** Paint a sprite once: w×h world units, foot at (fx, fy). */
function bake(key0, w, h, fx, fy, draw) {
  const key = SPRITE.shadows ? key0 : `${key0}:ns`;
  let sp = cache.get(key);
  if (sp) return sp;
  const [c, ctx] = canvas(w, h);
  draw(ctx, stream(hashStr(key)));
  sp = { c, w, h, fx, fy };
  cache.set(key, sp);
  return sp;
}

export function clearSprites() {
  cache.clear();
}

// ── brush helpers ──

/** A tapered brush stroke along a quadratic curve. */
function stroke(ctx, x0, y0, cx, cy, x1, y1, w0, w1, color) {
  const n = 14;
  const L = [];
  const R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
    const len = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    L.push([x - (dy / len) * w, y + (dx / len) * w]);
    R.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** A soft round dab of wash. */
function dab(ctx, x, y, r, c, a, squash = 0.8) {
  ctx.fillStyle = rgba(c, a);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * squash, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A soft shadow where a thing meets the ground. */
function shadow(ctx, x, y, rx, ry, a = 0.18) {
  if (!SPRITE.shadows) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, rgba(INK, a));
  g.addColorStop(1, rgba(INK, 0));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
  ctx.restore();
}

function line(ctx, pts, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

// ── trees and plants ──

function pineTree(ctx, rnd, fx, fy, H, season, dark = 1) {
  shadow(ctx, fx, fy, H * 0.22, H * 0.07);
  const lean = (rnd() - 0.5) * H * 0.18;
  const top = [fx + lean, fy - H * 0.94];
  stroke(ctx, fx, fy, fx - lean * 0.5, fy - H * 0.5, top[0], top[1], H * 0.07, H * 0.02, rgba(INK, 0.85 * dark));
  const col = PINE[season];
  const tiers = 4 + Math.floor(rnd() * 2);
  for (let i = 0; i < tiers; i++) {
    const t = 0.32 + (i / tiers) * 0.62;
    const u = 1 - t;
    const bx = u * u * fx + 2 * u * t * (fx - lean * 0.5) + t * t * top[0];
    const by = u * u * fy + 2 * u * t * (fy - H * 0.5) + t * t * top[1];
    const side = i === tiers - 1 ? 0 : i % 2 ? 1 : -1;
    const reach = H * (0.3 - t * 0.14) * (0.8 + rnd() * 0.4);
    const px = bx + side * reach * 0.55;
    const py = by - H * 0.02;
    if (side) line(ctx, [[bx, by + 2], [px, py + 1]], Math.max(1, H * 0.018), rgba(INK, 0.7 * dark));
    // the needle pad: a flat dark wash with needles fanning up
    dab(ctx, px, py, reach * 0.62, col, 0.75 * dark, 0.34);
    dab(ctx, px - reach * 0.1, py - reach * 0.06, reach * 0.42, INK, 0.28 * dark, 0.3);
    ctx.strokeStyle = rgba(INK, 0.55 * dark);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let k = 0; k < 9; k++) {
      const nx = px + (rnd() - 0.5) * reach * 1.1;
      const ny = py + reach * 0.08;
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + (rnd() - 0.5) * 3, ny - reach * (0.22 + rnd() * 0.18));
    }
    ctx.stroke();
    if (season === 'winter') dab(ctx, px, py - reach * 0.16, reach * 0.5, SNOW, 0.85, 0.22);
  }
}

function leafyTree(ctx, rnd, fx, fy, H, season, v, opts = {}) {
  shadow(ctx, fx, fy, H * 0.3, H * 0.08);
  const lean = (rnd() - 0.5) * H * 0.12;
  const crownY = fy - H * 0.62;
  stroke(ctx, fx, fy, fx + lean, fy - H * 0.3, fx + lean * 0.6, crownY, H * 0.085, H * 0.035, rgba(INK, 0.82));
  const branches = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < branches; i++) {
    const a = -Math.PI / 2 + (i / (branches - 1) - 0.5) * 1.9 + (rnd() - 0.5) * 0.3;
    const len = H * (0.22 + rnd() * 0.12);
    const bx = fx + lean * 0.6;
    stroke(ctx, bx, crownY + 4, bx + Math.cos(a) * len * 0.5, crownY + Math.sin(a) * len * 0.4, bx + Math.cos(a) * len, crownY + Math.sin(a) * len * 0.8, H * 0.03, H * 0.008, rgba(INK, 0.75));
  }
  const bare = season === 'winter' && !opts.evergreen;
  if (bare) {
    for (let i = 0; i < 5; i++) dab(ctx, fx + (rnd() - 0.5) * H * 0.5, crownY - H * (0.05 + rnd() * 0.25), H * 0.06, SNOW, 0.8, 0.35);
    return;
  }
  const pal = opts.palette || LEAF[season];
  const blossom = season === 'spring' && (opts.blossom ?? v % 3 === 0);
  const cx = fx + lean * 0.6;
  const cy = crownY - H * 0.12;
  const R = H * 0.3;
  // clusters of wash, then 米點 on top
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * R * 0.6;
    dab(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, R * (0.45 + rnd() * 0.25), pal[i % pal.length], 0.42, 0.8);
  }
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * R;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.75;
    if (blossom && rnd() < 0.45) dab(ctx, x, y, H * 0.022, [222, 150, 160], 0.85, 1);
    else dab(ctx, x, y, H * (0.018 + rnd() * 0.02), rnd() < 0.5 ? INK : pal[0], 0.28 + rnd() * 0.35, 0.6);
  }
}

function darkTree(ctx, rnd, fx, fy, H, season) {
  shadow(ctx, fx, fy, H * 0.3, H * 0.08, 0.3);
  const lean = (rnd() - 0.5) * H * 0.2;
  stroke(ctx, fx - H * 0.05, fy, fx + lean, fy - H * 0.35, fx + lean * 0.3, fy - H * 0.62, H * 0.13, H * 0.05, rgba(INK, 0.92));
  // roots
  for (const s of [-1, 1]) stroke(ctx, fx, fy - 3, fx + s * H * 0.08, fy - 1, fx + s * H * 0.16, fy + 2, H * 0.04, 0.5, rgba(INK, 0.8));
  const cx = fx + lean * 0.3;
  const cy = fy - H * 0.72;
  const R = H * 0.32;
  const col = season === 'autumn' ? [70, 60, 44] : season === 'winter' ? [70, 74, 72] : [34, 50, 42];
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * R * 0.55;
    dab(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, R * (0.5 + rnd() * 0.3), col, 0.4, 0.75);
  }
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * R * 1.05;
    dab(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, H * (0.015 + rnd() * 0.022), INK, 0.35 + rnd() * 0.35, 0.55);
  }
  // hanging vines
  ctx.strokeStyle = rgba(INK, 0.45);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    const x = cx + (rnd() - 0.5) * R * 1.6;
    const y = cy + R * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 2, y + H * 0.1, x - 1, y + H * (0.12 + rnd() * 0.12));
    ctx.stroke();
  }
  if (season === 'winter') dab(ctx, cx, cy - R * 0.45, R * 0.7, SNOW, 0.7, 0.25);
}

function branchOut(ctx, rnd, x, y, a, len, w, depth) {
  const x1 = x + Math.cos(a) * len;
  const y1 = y + Math.sin(a) * len;
  stroke(ctx, x, y, x + Math.cos(a + (rnd() - 0.5) * 0.6) * len * 0.5, y + Math.sin(a) * len * 0.5, x1, y1, w, w * 0.5, rgba(INK, 0.8));
  if (depth <= 0) return;
  const n = 2 + (rnd() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) branchOut(ctx, rnd, x1, y1, a + (rnd() - 0.5) * 1.3, len * (0.55 + rnd() * 0.2), w * 0.55, depth - 1);
}

function deadTree(ctx, rnd, fx, fy, H, season) {
  shadow(ctx, fx, fy, H * 0.22, H * 0.06);
  branchOut(ctx, rnd, fx, fy, -Math.PI / 2 + (rnd() - 0.5) * 0.3, H * 0.42, H * 0.08, 3);
  if (season === 'winter') dab(ctx, fx, fy - H * 0.55, H * 0.12, SNOW, 0.6, 0.3);
}

function bambooClump(ctx, rnd, fx, fy, H, season) {
  shadow(ctx, fx, fy, H * 0.25, H * 0.06);
  const col = season === 'autumn' ? [112, 120, 70] : season === 'winter' ? [92, 108, 96] : [70, 110, 82];
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const x = fx + (rnd() - 0.5) * H * 0.3;
    const h = H * (0.7 + rnd() * 0.3);
    const lean = (rnd() - 0.5) * H * 0.15;
    stroke(ctx, x, fy, x + lean * 0.4, fy - h * 0.5, x + lean, fy - h, 2.2, 1.2, rgba(col, 0.95));
    // nodes
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 0.6;
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      const nx = x + lean * t * t;
      const ny = fy - h * t;
      ctx.beginPath();
      ctx.moveTo(nx - 1.4, ny);
      ctx.lineTo(nx + 1.4, ny);
      ctx.stroke();
    }
    // 个 leaves near the top
    for (let k = 0; k < 4; k++) {
      const lx = x + lean * 0.9 + (rnd() - 0.5) * H * 0.3;
      const ly = fy - h * (0.6 + rnd() * 0.4);
      for (const da of [-0.5, 0, 0.5]) {
        const a = Math.PI * 0.5 + da + (rnd() - 0.5) * 0.3;
        stroke(ctx, lx, ly, lx + Math.cos(a) * 4, ly + Math.sin(a) * 3, lx + Math.cos(a) * 8, ly + Math.sin(a) * 6, 1.8, 0.3, rgba(INK, 0.6));
      }
    }
  }
}

function willowTree(ctx, rnd, fx, fy, H, season) {
  shadow(ctx, fx, fy, H * 0.3, H * 0.08);
  const crownY = fy - H * 0.66;
  stroke(ctx, fx, fy, fx + (rnd() - 0.5) * 8, fy - H * 0.35, fx, crownY, H * 0.09, H * 0.05, rgba(INK, 0.85));
  const col = season === 'spring' ? [150, 178, 100] : season === 'summer' ? [96, 140, 92] : season === 'autumn' ? [176, 160, 80] : [140, 140, 128];
  const strands = season === 'winter' ? 14 : 26;
  for (let i = 0; i < strands; i++) {
    const sx = fx + (rnd() - 0.5) * H * 0.55;
    const sy = crownY - rnd() * H * 0.12;
    const len = H * (0.3 + rnd() * 0.32);
    ctx.strokeStyle = rgba(season === 'winter' ? INK : col, season === 'winter' ? 0.35 : 0.85);
    ctx.lineWidth = season === 'winter' ? 0.5 : 1.3;
    ctx.beginPath();
    ctx.moveTo(fx, crownY - 4);
    ctx.quadraticCurveTo(sx, sy - H * 0.12, sx + (rnd() - 0.5) * 4, sy + len);
    ctx.stroke();
  }
}

function bush(ctx, rnd, fx, fy, H, season) {
  shadow(ctx, fx, fy, H * 0.7, H * 0.2);
  const pal = season === 'winter' ? [[130, 132, 124]] : LEAF[season];
  for (let i = 0; i < 7; i++) dab(ctx, fx + (rnd() - 0.5) * H * 1.1, fy - H * (0.25 + rnd() * 0.45), H * (0.28 + rnd() * 0.18), pal[i % pal.length], 0.55, 0.75);
  for (let i = 0; i < 14; i++) dab(ctx, fx + (rnd() - 0.5) * H * 1.2, fy - H * (0.2 + rnd() * 0.6), H * 0.06, INK, 0.45, 0.6);
  if (season === 'winter') dab(ctx, fx, fy - H * 0.7, H * 0.4, SNOW, 0.8, 0.35);
}

function tuft(ctx, rnd, fx, fy, H, season) {
  const col = season === 'autumn' ? [170, 130, 70] : season === 'winter' ? [150, 146, 130] : [96, 130, 84];
  for (let i = 0; i < 7; i++) {
    const x = fx + (rnd() - 0.5) * H * 0.9;
    const lean = (rnd() - 0.5) * H * 0.7;
    stroke(ctx, x, fy, x + lean * 0.3, fy - H * 0.5, x + lean, fy - H * (0.6 + rnd() * 0.4), 1.4, 0.2, rgba(rnd() < 0.5 ? INK : col, 0.6));
  }
}

function reeds(ctx, rnd, fx, fy, H, season) {
  const col = season === 'winter' ? [150, 140, 120] : season === 'autumn' ? [176, 150, 96] : [110, 136, 90];
  for (let i = 0; i < 9; i++) {
    const x = fx + (rnd() - 0.5) * H * 0.7;
    const lean = (rnd() - 0.5) * H * 0.4;
    const h = H * (0.6 + rnd() * 0.4);
    stroke(ctx, x, fy, x + lean * 0.3, fy - h * 0.5, x + lean, fy - h, 1.2, 0.3, rgba(rnd() < 0.4 ? INK : col, 0.7));
    if (rnd() < 0.45) dab(ctx, x + lean, fy - h - 2, 1.6, [120, 90, 60], 0.85, 2.2);
  }
}

function rockLump(ctx, rnd, fx, fy, W, H, season, moss = true) {
  shadow(ctx, fx, fy, W * 0.6, H * 0.25, 0.22);
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI + t * Math.PI;
    const r = 0.75 + rnd() * 0.3;
    pts.push([fx + Math.cos(a) * W * 0.5 * r, fy + Math.sin(a) * H * r]);
  }
  const g = ctx.createLinearGradient(0, fy - H, 0, fy);
  g.addColorStop(0, rgba(INK, 0.6));
  g.addColorStop(1, rgba(INK, 0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 皴: a few dry strokes
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    const x = fx + (rnd() - 0.5) * W * 0.7;
    const y = fy - H * (0.2 + rnd() * 0.6);
    ctx.strokeStyle = rgba(INK, 0.4 + rnd() * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 3, y + H * 0.25);
    ctx.stroke();
  }
  if (moss) for (let i = 0; i < 5; i++) dab(ctx, fx + (rnd() - 0.5) * W * 0.6, fy - H * (0.7 + rnd() * 0.2), 1.3, INK, 0.75, 1);
  if (season === 'winter') dab(ctx, fx, fy - H * 0.85, W * 0.38, SNOW, 0.85, 0.3);
}

function swordProp(ctx, rnd, fx, fy, H) {
  const lean = (rnd() - 0.5) * H * 0.5;
  const tx = fx + lean;
  const ty = fy - H;
  line(ctx, [[fx, fy], [tx, ty]], 1.6, rgba([70, 66, 60], 0.95));
  line(ctx, [[fx + lean * 0.2 - 4, fy - H * 0.78], [fx + lean * 0.2 + 4, fy - H * 0.8]], 1.6, rgba(INK, 0.9));
  line(ctx, [[fx, fy], [fx + lean * 0.12, fy - H * 0.55]], 0.8, rgba([150, 90, 60], 0.5));
  shadow(ctx, fx, fy, 5, 2);
}

function pillarProp(ctx, rnd, fx, fy, H) {
  shadow(ctx, fx, fy, 12, 4, 0.25);
  const w = 12;
  ctx.fillStyle = rgba(STONE, 0.95);
  ctx.beginPath();
  ctx.moveTo(fx - w / 2, fy);
  ctx.lineTo(fx - w / 2, fy - H * 0.7);
  for (let i = 0; i <= 4; i++) ctx.lineTo(fx - w / 2 + (w * i) / 4, fy - H * (0.7 + rnd() * 0.3));
  ctx.lineTo(fx + w / 2, fy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  for (let i = 0; i < 3; i++) line(ctx, [[fx - w / 2 + 3 + i * 3, fy - 2], [fx - w / 2 + 3 + i * 3, fy - H * 0.6]], 0.5, rgba(INK, 0.3));
}

function bonesProp(ctx, rnd, fx, fy) {
  ctx.strokeStyle = rgba([230, 226, 214], 0.95);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const x = fx + (rnd() - 0.5) * 16;
    const y = fy - rnd() * 4;
    const a = rnd() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 2);
    ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 2);
    ctx.stroke();
  }
  dab(ctx, fx + 6, fy - 3, 3, [230, 226, 214], 1, 0.85);
  dab(ctx, fx + 5, fy - 3.5, 0.9, INK, 0.9, 1);
}

function scarecrow(ctx, rnd, fx, fy, H) {
  shadow(ctx, fx, fy, 8, 2.5);
  line(ctx, [[fx, fy], [fx, fy - H * 0.9]], 1.6, rgba(WOOD, 0.95));
  line(ctx, [[fx - H * 0.3, fy - H * 0.62], [fx + H * 0.3, fy - H * 0.6]], 1.4, rgba(WOOD, 0.95));
  ctx.fillStyle = rgba([150, 120, 90], 0.9);
  ctx.fillRect(fx - 5, fy - H * 0.66, 10, H * 0.3);
  dab(ctx, fx, fy - H * 0.84, 4, [214, 196, 160], 1, 1);
  ctx.fillStyle = rgba(STRAW, 0.95);
  ctx.beginPath();
  ctx.moveTo(fx - 9, fy - H * 0.86);
  ctx.lineTo(fx, fy - H * 1.02);
  ctx.lineTo(fx + 9, fy - H * 0.86);
  ctx.closePath();
  ctx.fill();
}

const DECOR = {
  pine: { w: 56, h: 100, fx: 28, fy: 96, draw: (c, r, s, v) => pineTree(c, r, 28, 96, 92, s) },
  leaf: { w: 64, h: 84, fx: 32, fy: 80, draw: (c, r, s, v) => leafyTree(c, r, 32, 80, 78, s, v) },
  dark: { w: 84, h: 124, fx: 42, fy: 120, draw: (c, r, s) => darkTree(c, r, 42, 120, 114, s) },
  dead: { w: 60, h: 80, fx: 30, fy: 76, draw: (c, r, s) => deadTree(c, r, 30, 76, 72, s) },
  bamboo: { w: 56, h: 98, fx: 28, fy: 94, draw: (c, r, s) => bambooClump(c, r, 28, 94, 90, s) },
  willow: { w: 70, h: 90, fx: 35, fy: 86, draw: (c, r, s) => willowTree(c, r, 35, 86, 82, s) },
  bush: { w: 40, h: 28, fx: 20, fy: 26, draw: (c, r, s) => bush(c, r, 20, 26, 20, s) },
  tuft: { w: 24, h: 18, fx: 12, fy: 16, draw: (c, r, s) => tuft(c, r, 12, 16, 14, s) },
  reed: { w: 30, h: 34, fx: 15, fy: 32, draw: (c, r, s) => reeds(c, r, 15, 32, 28, s) },
  rock: { w: 40, h: 28, fx: 20, fy: 25, draw: (c, r, s) => rockLump(c, r, 20, 25, 34, 20, s) },
  sword: { w: 30, h: 34, fx: 15, fy: 31, draw: (c, r) => swordProp(c, r, 15, 31, 26) },
  pillar: { w: 30, h: 50, fx: 15, fy: 47, draw: (c, r) => pillarProp(c, r, 15, 47, 42) },
  bones: { w: 30, h: 12, fx: 15, fy: 10, draw: (c, r) => bonesProp(c, r, 13, 10) },
  scarecrow: { w: 40, h: 48, fx: 20, fy: 45, draw: (c, r) => scarecrow(c, r, 20, 45, 42) },
};

/** A tree, rock or prop (8 variants each, per season). */
export function decorSprite(kind, v, season) {
  const d = DECOR[kind] || DECOR.bush;
  return bake(`d:${kind}:${v}:${season}`, d.w, d.h, d.fx, d.fy, (ctx, rnd) => d.draw(ctx, rnd, season, v));
}

// ── mountains ──

/**
 * A mountain in the old-map manner: a silhouette with one to three peaks,
 * ink fading towards the foot, dry strokes, moss dots, snow in winter.
 */
function mountain(ctx, rnd, W, H, season, v) {
  const peaks = [];
  const n = 1 + (v % 3);
  for (let i = 0; i < n; i++) {
    const px = W * (0.22 + (n === 1 ? 0.28 : (i / (n - 1)) * 0.56) + (rnd() - 0.5) * 0.08);
    const ph = H * (i === Math.floor(n / 2) ? 0.92 : 0.55 + rnd() * 0.3);
    const pw = W * (n === 1 ? 0.5 : 0.32 + rnd() * 0.1);
    peaks.push([px, ph, pw]);
  }
  // the flanks must come down to the ground before the sprite's edge
  const edge = (x) => {
    const e = Math.min(x, W - x) / (W * 0.2);
    return e >= 1 ? 1 : e <= 0 ? 0 : e * e * (3 - 2 * e);
  };
  const top = (x) => {
    let y = 0;
    for (const [px, ph, pw] of peaks) {
      const u = Math.abs(x - px) / pw;
      if (u < 1) y = Math.max(y, ph * Math.pow(1 - u, 1.25));
    }
    return y * edge(x);
  };
  const pts = [];
  for (let x = 2; x <= W - 2; x += 3) {
    const bump = (Math.sin(x * 0.19 + v) + Math.sin(x * 0.07 + v * 3)) * H * 0.012;
    pts.push([x, H - Math.max(0, top(x) + bump)]);
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(2, H);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(W - 2, H);
  ctx.closePath();
  const minY = Math.min(...pts.map((p) => p[1]));
  const g = ctx.createLinearGradient(0, minY, 0, H);
  g.addColorStop(0, rgba(INK, 0.78));
  g.addColorStop(0.5, rgba(INK, 0.5));
  g.addColorStop(1, rgba(INK, 0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // seasonal wash on the lower slopes
  const tint = { spring: [96, 140, 96, 0.22], summer: [64, 110, 92, 0.24], autumn: [170, 110, 60, 0.26], winter: [200, 204, 210, 0.2] }[season];
  const tg = ctx.createLinearGradient(0, minY, 0, H);
  tg.addColorStop(0, rgba(tint, 0));
  tg.addColorStop(0.6, rgba(tint, tint[3]));
  tg.addColorStop(1, rgba(tint, tint[3] * 0.6));
  ctx.fillStyle = tg;
  ctx.fillRect(0, minY, W, H - minY);
  // 皴: dry strokes running down the slopes
  for (let i = 0; i < 120; i++) {
    const x = 6 + rnd() * (W - 12);
    const ty = H - top(x);
    const y = ty + rnd() * (H - ty) * 0.75;
    const len = 4 + rnd() * 12;
    const slope = (top(x - 3) - top(x + 3)) / 6;
    ctx.strokeStyle = rgba(INK, 0.18 + rnd() * 0.35);
    ctx.lineWidth = 0.5 + rnd() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + slope * len * 0.4, y + len * 0.5, x + slope * len, y + len);
    ctx.stroke();
  }
  // inner ridges from each peak
  for (const [px, ph] of peaks) {
    for (const s of [-1, 1]) {
      ctx.strokeStyle = rgba(INK, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, H - ph + 2);
      ctx.quadraticCurveTo(px + s * W * 0.04, H - ph * 0.55, px + s * W * (0.08 + rnd() * 0.06), H - ph * 0.15);
      ctx.stroke();
    }
  }
  if (season === 'winter') {
    for (const [px, ph, pw] of peaks) {
      ctx.fillStyle = rgba(SNOW, 0.92);
      ctx.beginPath();
      ctx.moveTo(px - pw * 0.42, H - ph * 0.62);
      for (let x = px - pw * 0.42; x <= px + pw * 0.42; x += 3) ctx.lineTo(x, H - top(x) - 1);
      ctx.lineTo(px + pw * 0.42, H - ph * 0.62);
      for (let x = px + pw * 0.42; x >= px - pw * 0.42; x -= 6) ctx.lineTo(x, H - ph * (0.66 + 0.06 * Math.sin(x)));
      ctx.closePath();
      ctx.fill();
    }
  }
  // the foot dissolves into the ground
  ctx.globalCompositeOperation = 'destination-out';
  const fg = ctx.createLinearGradient(0, H - H * 0.22, 0, H);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, H - H * 0.22, W, H * 0.22);
  ctx.restore();
  // the ridge line, brushed
  for (let i = 1; i < pts.length; i++) {
    ctx.strokeStyle = rgba(INK, 0.9);
    ctx.lineWidth = 0.8 + 1.8 * Math.abs(Math.sin(i * 0.13 + v));
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  // moss dots and little pines along the ridge
  for (let i = 0; i < 26; i++) {
    const p = pts[Math.floor(rnd() * pts.length)];
    if (H - p[1] < H * 0.2) continue;
    dab(ctx, p[0] + (rnd() - 0.5) * 4, p[1] + 2 + rnd() * 6, 1.2 + rnd() * 1.4, INK, 0.75, 0.7);
  }
  for (let i = 0; i < 3; i++) {
    const p = pts[Math.floor((0.2 + rnd() * 0.6) * pts.length)];
    pineTree(ctx, rnd, p[0], p[1] + 6, 14 + rnd() * 8, season, 0.9);
  }
}

function cliffFace(ctx, rnd, W, H, season, tall) {
  const pts = [];
  const steps = 10;
  const inset = W * 0.08;
  // top edge, roughly flat
  for (let i = 0; i <= steps; i++) pts.push([inset + ((W - 2 * inset) * i) / steps, H * (tall ? 0.04 : 0.12) + rnd() * H * 0.08]);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(2, H);
  ctx.lineTo(inset * 0.5, pts[0][1] + H * 0.1);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(W - inset * 0.5, pts[steps][1] + H * 0.1);
  ctx.lineTo(W - 2, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(INK, 0.55));
  g.addColorStop(0.35, rgba(INK, 0.72));
  g.addColorStop(1, rgba(INK, 0.4));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // 披麻皴: long vertical strokes
  for (let i = 0; i < (tall ? 160 : 60); i++) {
    const x = rnd() * W;
    const y = H * 0.1 + rnd() * H * 0.8;
    const len = H * (0.08 + rnd() * 0.2);
    ctx.strokeStyle = rgba(INK, 0.2 + rnd() * 0.45);
    ctx.lineWidth = 0.6 + rnd() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 4, y + len * 0.5, x + (rnd() - 0.5) * 6, y + len);
    ctx.stroke();
  }
  // lit top face
  ctx.fillStyle = rgba(season === 'winter' ? SNOW : [150, 160, 120], season === 'winter' ? 0.85 : 0.35);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) ctx.lineTo(x, y + 2);
  for (let i = steps; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + H * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  const fg = ctx.createLinearGradient(0, H * 0.85, 0, H);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, H * 0.85, W, H * 0.15);
  ctx.restore();
  line(ctx, pts, tall ? 2.4 : 1.6, rgba(INK, 0.9));
  for (let i = 0; i < (tall ? 3 : 1); i++) {
    const p = pts[1 + Math.floor(rnd() * (steps - 1))];
    pineTree(ctx, rnd, p[0], p[1] + 3, tall ? 34 + rnd() * 16 : 16, season, 0.95);
  }
}

/** Mountains and cliffs (from terrain.js's list). */
export function mountainSprite(kind, v, season) {
  if (kind === 'cliff') return bake(`m:cliff:${v % 6}:${season}`, 120, 110, 60, 104, (ctx, rnd) => cliffFace(ctx, rnd, 120, 110, season, false));
  if (kind === 'bigcliff') return bake(`m:big:${season}`, 380, 300, 190, 294, (ctx, rnd) => cliffFace(ctx, rnd, 380, 300, season, true));
  return bake(`m:mount:${v % 12}:${season}`, 260, 230, 130, 226, (ctx, rnd) => mountain(ctx, rnd, 260, 230, season, v % 12));
}

// ── buildings ──

/** Roof seen from above-front: an eave line, a ridge further back, tiles between. */
function roofShape(ctx, x0, x1, eaveY, depth, color, o = {}) {
  const w = x1 - x0;
  const ov = o.overhang ?? w * 0.1;
  const lift = o.lift ?? 5;
  const ridgeY = eaveY - depth;
  const inset = o.inset ?? w * 0.14;
  ctx.fillStyle = rgba(color, 0.96);
  ctx.beginPath();
  ctx.moveTo(x0 - ov, eaveY - lift);
  ctx.quadraticCurveTo(x0 - ov * 0.3, eaveY + 1, x0 + w * 0.12, eaveY + 1.5);
  ctx.lineTo(x1 - w * 0.12, eaveY + 1.5);
  ctx.quadraticCurveTo(x1 + ov * 0.3, eaveY + 1, x1 + ov, eaveY - lift);
  ctx.lineTo(x1 - inset, ridgeY);
  ctx.lineTo(x0 + inset, ridgeY);
  ctx.closePath();
  ctx.fill();
  // shading: darker towards the ridge
  const g = ctx.createLinearGradient(0, ridgeY, 0, eaveY);
  g.addColorStop(0, rgba(INK, 0.32));
  g.addColorStop(1, rgba(INK, 0.04));
  ctx.fillStyle = g;
  ctx.fill();
  // tile rows
  if (!o.straw) {
    ctx.strokeStyle = rgba(INK, 0.28);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const n = Math.max(4, Math.floor(w / 5));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      ctx.moveTo(x0 - ov * 0.6 + (w + ov * 1.2) * t, eaveY);
      ctx.lineTo(x0 + inset + (w - 2 * inset) * t, ridgeY + 1);
    }
    ctx.stroke();
  } else {
    ctx.strokeStyle = rgba([120, 96, 56], 0.5);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const y = ridgeY + ((eaveY - ridgeY) * (k + 1)) / 5;
      ctx.moveTo(x0 + inset * (1 - (k + 1) / 5) - 2, y);
      ctx.lineTo(x1 - inset * (1 - (k + 1) / 5) + 2, y);
    }
    ctx.stroke();
  }
  if (o.snow) {
    ctx.fillStyle = rgba(SNOW, 0.82);
    ctx.beginPath();
    ctx.moveTo(x0 + inset, ridgeY + 1);
    ctx.lineTo(x1 - inset, ridgeY + 1);
    ctx.lineTo(x1 - w * 0.06, eaveY - depth * 0.25);
    ctx.lineTo(x0 + w * 0.06, eaveY - depth * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  // eave and ridge lines
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x0 - ov, eaveY - lift);
  ctx.quadraticCurveTo(x0 - ov * 0.3, eaveY + 1, x0 + w * 0.12, eaveY + 1.5);
  ctx.lineTo(x1 - w * 0.12, eaveY + 1.5);
  ctx.quadraticCurveTo(x1 + ov * 0.3, eaveY + 1, x1 + ov, eaveY - lift);
  ctx.stroke();
  ctx.lineWidth = o.straw ? 1.4 : 2.4;
  ctx.beginPath();
  ctx.moveTo(x0 + inset - 3, ridgeY - (o.straw ? 0 : 2.5));
  ctx.lineTo(x0 + inset, ridgeY);
  ctx.lineTo(x1 - inset, ridgeY);
  ctx.lineTo(x1 - inset + 3, ridgeY - (o.straw ? 0 : 2.5));
  ctx.stroke();
  if (o.ornament) {
    for (const s of [-1, 1]) {
      const x = s < 0 ? x0 + inset - 3 : x1 - inset + 3;
      ctx.fillStyle = rgba(o.ornament, 0.95);
      ctx.beginPath();
      ctx.arc(x, ridgeY - 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function wall(ctx, x0, x1, top, base, color = PLASTER) {
  ctx.fillStyle = rgba(color, 0.98);
  ctx.fillRect(x0, top, x1 - x0, base - top);
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 0.9;
  ctx.strokeRect(x0, top, x1 - x0, base - top);
}

function pillars(ctx, x0, x1, top, base, n, color = WOOD) {
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    line(ctx, [[x, top], [x, base]], 1.6, rgba(color, 0.95));
  }
  line(ctx, [[x0, top + 1.5], [x1, top + 1.5]], 1.6, rgba(color, 0.9));
}

function door(ctx, x, base, w, h, color = WOOD) {
  ctx.fillStyle = rgba(color, 0.95);
  ctx.fillRect(x - w / 2, base - h, w, h);
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x - w / 2, base - h, w, h);
  line(ctx, [[x, base - h], [x, base]], 0.6, rgba(INK, 0.6));
}

function lattice(ctx, x, y, w, h) {
  ctx.fillStyle = rgba([212, 200, 170], 0.95);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rgba(WOOD, 0.85);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(x + (w * i) / 3, y);
    ctx.lineTo(x + (w * i) / 3, y + h);
    ctx.moveTo(x, y + (h * i) / 3);
    ctx.lineTo(x + w, y + (h * i) / 3);
  }
  ctx.stroke();
  ctx.strokeRect(x, y, w, h);
}

function lantern(ctx, x, y, r = 2.6) {
  line(ctx, [[x, y - r * 1.8], [x, y - r]], 0.6, rgba(INK, 0.8));
  dab(ctx, x, y, r, RED, 0.95, 1.2);
  line(ctx, [[x - r * 0.6, y + r * 1.1], [x + r * 0.6, y + r * 1.1]], 0.8, rgba(GOLD, 0.9));
}

function plaque(ctx, x, y, text, w, color = INK, ink = GOLD) {
  const h = 8;
  ctx.fillStyle = rgba(color, 0.95);
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = rgba(GOLD, 0.8);
  ctx.lineWidth = 0.6;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  if (text && fontsReady) {
    ctx.fillStyle = rgba(ink, 0.98);
    ctx.font = `700 6.2px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.4);
  }
}

function flag(ctx, x, base, h, text, color = [70, 110, 140]) {
  line(ctx, [[x, base], [x, base - h]], 1.2, rgba(WOOD, 0.95));
  ctx.fillStyle = rgba(color, 0.92);
  ctx.beginPath();
  ctx.moveTo(x, base - h + 1);
  ctx.lineTo(x + 9, base - h + 2);
  ctx.lineTo(x + 8, base - h + 18);
  ctx.lineTo(x + 4.5, base - h + 15);
  ctx.lineTo(x, base - h + 18);
  ctx.closePath();
  ctx.fill();
  if (text && fontsReady) {
    ctx.fillStyle = rgba(PAPER, 0.95);
    ctx.font = `700 6px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 4.5, base - h + 8.5);
  }
}

function stoneBase(ctx, x0, x1, base, h) {
  ctx.fillStyle = rgba(STONE, 0.95);
  ctx.fillRect(x0, base - h, x1 - x0, h);
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 0.7;
  ctx.strokeRect(x0, base - h, x1 - x0, h);
  ctx.beginPath();
  for (let x = x0 + 8; x < x1; x += 10) {
    ctx.moveTo(x, base - h);
    ctx.lineTo(x, base);
  }
  ctx.stroke();
}

/**
 * A building on a footprint w×d. Returns its sprite; the foot is the middle
 * of the footprint's front edge.
 */
function buildingSprite(key, st, season) {
  const { w, h: d, sprite } = st;
  const snow = season === 'winter';
  const tall = { teahouse: 2, auction: 3, tower: 2, bighall: 2, pagoda: 1 }[sprite] || 1;
  const wallH = { mansion: 24, house: 17, shop: 20, teahouse: 18, auction: 18, hall: 26, bighall: 28, farmhouse: 15, shrine_small: 11, shrine: 18, hut: 14, tower: 18, teashed: 16 }[sprite] || 16;
  const extraTop = sprite === 'pagoda' ? 150 : sprite === 'bigtree' ? 130 : 0;
  const W = sprite === 'bigtree' ? 130 : w * 1.4 + 24;
  const H = wallH * tall + d * 0.95 + 26 + extraTop;
  const fx = W / 2;
  const fy = H - 4;
  return bake(key, W, H, fx, fy, (ctx, rnd) => {
    const x0 = fx - w / 2;
    const x1 = fx + w / 2;
    const base = fy;
    const draw = BUILD[sprite];
    if (draw) draw(ctx, rnd, { x0, x1, base, w, d, wallH, snow, fx, season, st });
  });
}

const BUILD = {
  house(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.62, 7, 0.22);
    wall(ctx, b.x0 + 2, b.x1 - 2, b.base - b.wallH, b.base);
    pillars(ctx, b.x0 + 2, b.x1 - 2, b.base - b.wallH, b.base, 3);
    door(ctx, b.fx, b.base, 8, b.wallH * 0.7);
    if (b.w > 55) lattice(ctx, b.x0 + 7, b.base - b.wallH * 0.75, 8, 7);
    roofShape(ctx, b.x0, b.x1, b.base - b.wallH, b.d * 0.72, rnd() < 0.5 ? TILE : [84, 80, 76], { snow: b.snow });
  },
  mansion(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.62, 8, 0.24);
    // courtyard walls either side
    for (const s of [-1, 1]) {
      const wx0 = s < 0 ? b.x0 : b.fx + b.w * 0.26;
      const wx1 = s < 0 ? b.fx - b.w * 0.26 : b.x1;
      wall(ctx, wx0, wx1, b.base - 15, b.base, [226, 220, 204]);
      ctx.fillStyle = rgba(TILE, 0.95);
      ctx.fillRect(wx0 - 1, b.base - 18, wx1 - wx0 + 2, 4);
      if (b.snow) {
        ctx.fillStyle = rgba(SNOW, 0.85);
        ctx.fillRect(wx0 - 1, b.base - 19, wx1 - wx0 + 2, 2);
      }
    }
    // the main hall behind
    const hx0 = b.fx - b.w * 0.34;
    const hx1 = b.fx + b.w * 0.34;
    roofShape(ctx, hx0, hx1, b.base - b.d * 0.5, b.d * 0.42, TILE, { snow: b.snow, ornament: GOLD });
    // gatehouse in front
    const gx0 = b.fx - b.w * 0.24;
    const gx1 = b.fx + b.w * 0.24;
    stoneBase(ctx, gx0 - 3, gx1 + 3, b.base, 4);
    wall(ctx, gx0, gx1, b.base - 4 - b.wallH, b.base - 4);
    pillars(ctx, gx0, gx1, b.base - 4 - b.wallH, b.base - 4, 4, [140, 48, 36]);
    door(ctx, b.fx, b.base - 4, 16, b.wallH * 0.78, [140, 48, 36]);
    for (const s of [-1, 1]) dab(ctx, b.fx + s * 4, b.base - 4 - b.wallH * 0.4, 0.9, GOLD, 1, 1);
    roofShape(ctx, gx0, gx1, b.base - 4 - b.wallH, 22, TILE, { snow: b.snow, ornament: GOLD });
    plaque(ctx, b.fx, b.base - 4 - b.wallH + 6, b.st.x < 2300 ? '林府' : '沈府', 16);
    lantern(ctx, gx0 + 4, b.base - 4 - b.wallH + 10);
    lantern(ctx, gx1 - 4, b.base - 4 - b.wallH + 10);
  },
  shop(ctx, rnd, b) {
    BUILD.house(ctx, rnd, b);
    const name = b.st.x > 3000 ? (b.st.y > 2600 ? '丹坊' : '百草堂') : '回春堂';
    plaque(ctx, b.fx, b.base - b.wallH + 4, name, Math.min(28, b.w * 0.42));
    flag(ctx, b.x1 + 3, b.base, 40, b.st.y > 2600 && b.st.x > 3000 ? '丹' : '藥');
  },
  teahouse(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.62, 8, 0.22);
    wall(ctx, b.x0 + 2, b.x1 - 2, b.base - b.wallH, b.base);
    pillars(ctx, b.x0 + 2, b.x1 - 2, b.base - b.wallH, b.base, 5, [140, 52, 40]);
    door(ctx, b.fx, b.base, 12, b.wallH * 0.75);
    lattice(ctx, b.x0 + 8, b.base - b.wallH * 0.8, 10, 8);
    lattice(ctx, b.x1 - 18, b.base - b.wallH * 0.8, 10, 8);
    // mid eave, upper floor
    const up = b.base - b.wallH;
    roofShape(ctx, b.x0 - 2, b.x1 + 2, up, 8, TILE, { snow: b.snow, lift: 3 });
    const ux0 = b.x0 + b.w * 0.12;
    const ux1 = b.x1 - b.w * 0.12;
    wall(ctx, ux0, ux1, up - 8 - b.wallH * 0.8, up - 8);
    for (let x = ux0 + 5; x < ux1 - 8; x += 12) lattice(ctx, x, up - 8 - b.wallH * 0.65, 8, 7);
    roofShape(ctx, ux0, ux1, up - 8 - b.wallH * 0.8, b.d * 0.6, TILE, { snow: b.snow, ornament: GOLD });
    plaque(ctx, b.fx, up - 4, b.st.x > 3000 ? (b.st.x < 3800 ? '酒肆' : '茶樓') : '茶館', 18);
    lantern(ctx, b.x0 + 2, up + 6);
    lantern(ctx, b.x1 - 2, up + 6);
  },
  auction(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.62, 9, 0.24);
    stoneBase(ctx, b.x0, b.x1, b.base, 5);
    let y = b.base - 5;
    let x0 = b.x0 + 3;
    let x1 = b.x1 - 3;
    for (let k = 0; k < 3; k++) {
      const hh = b.wallH * (k ? 0.85 : 1);
      wall(ctx, x0, x1, y - hh, y);
      pillars(ctx, x0, x1, y - hh, y, 6, [150, 46, 36]);
      if (!k) door(ctx, b.fx, y, 14, hh * 0.78, [150, 46, 36]);
      else for (let x = x0 + 5; x < x1 - 8; x += 11) lattice(ctx, x, y - hh * 0.75, 7, 7);
      roofShape(ctx, x0 - 3, x1 + 3, y - hh, k === 2 ? b.d * 0.55 : 9, TILE, { snow: b.snow, lift: 4, ornament: k === 2 ? GOLD : null });
      y -= hh + 9;
      x0 += b.w * 0.09;
      x1 -= b.w * 0.09;
    }
    plaque(ctx, b.fx, b.base - 5 - b.wallH + 4, '聚寶閣', 26, [120, 30, 24]);
    lantern(ctx, b.x0 + 4, b.base - 5 - b.wallH + 10);
    lantern(ctx, b.x1 - 4, b.base - 5 - b.wallH + 10);
  },
  farmhouse(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.62, 7, 0.2);
    wall(ctx, b.x0 + 3, b.x1 - 3, b.base - b.wallH, b.base, [196, 170, 128]);
    door(ctx, b.fx - 6, b.base, 8, b.wallH * 0.75);
    lattice(ctx, b.fx + 6, b.base - b.wallH * 0.75, 8, 6);
    roofShape(ctx, b.x0 - 2, b.x1 + 2, b.base - b.wallH, b.d * 0.9, STRAW, { straw: true, lift: 1, snow: b.snow });
    // a little fence
    ctx.strokeStyle = rgba(WOOD, 0.85);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let x = b.x0 - 8; x <= b.x0 + 8; x += 4) {
      ctx.moveTo(x, b.base + 3);
      ctx.lineTo(x, b.base - 5);
    }
    ctx.moveTo(b.x0 - 9, b.base - 2);
    ctx.lineTo(b.x0 + 9, b.base - 2);
    ctx.stroke();
  },
  hut(ctx, rnd, b) {
    BUILD.farmhouse(ctx, rnd, b);
  },
  shrine_small(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.6, 5, 0.2);
    stoneBase(ctx, b.x0 + 4, b.x1 - 4, b.base, 3);
    wall(ctx, b.x0 + 8, b.x1 - 8, b.base - 3 - b.wallH, b.base - 3, [210, 196, 170]);
    door(ctx, b.fx, b.base - 3, 7, b.wallH * 0.75, [60, 40, 30]);
    roofShape(ctx, b.x0 + 3, b.x1 - 3, b.base - 3 - b.wallH, b.d * 0.6, TILE_RED, { snow: b.snow, lift: 4 });
    // incense burner
    dab(ctx, b.fx, b.base + 4, 3, INK, 0.7, 0.6);
    line(ctx, [[b.fx - 1, b.base + 2], [b.fx - 2, b.base - 6]], 0.4, rgba(INK, 0.4));
    line(ctx, [[b.fx + 1, b.base + 2], [b.fx + 2, b.base - 7]], 0.4, rgba(INK, 0.4));
  },
  shrine(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.62, 7, 0.24);
    stoneBase(ctx, b.x0 + 2, b.x1 - 2, b.base, 4);
    wall(ctx, b.x0 + 6, b.x1 - 6, b.base - 4 - b.wallH, b.base - 4, [204, 190, 166]);
    pillars(ctx, b.x0 + 6, b.x1 - 6, b.base - 4 - b.wallH, b.base - 4, 3, [150, 70, 56]);
    // one door panel left, hanging
    ctx.fillStyle = rgba(WOOD, 0.95);
    ctx.save();
    ctx.translate(b.fx - 6, b.base - 4);
    ctx.rotate(-0.12);
    ctx.fillRect(0, -b.wallH * 0.72, 6, b.wallH * 0.72);
    ctx.restore();
    ctx.fillStyle = rgba(INK, 0.85);
    ctx.fillRect(b.fx, b.base - 4 - b.wallH * 0.72, 6, b.wallH * 0.72);
    roofShape(ctx, b.x0, b.x1, b.base - 4 - b.wallH, b.d * 0.7, TILE_RED, { snow: b.snow, lift: 5 });
    // missing tiles
    for (let i = 0; i < 3; i++) dab(ctx, b.x0 + b.w * (0.3 + rnd() * 0.4), b.base - 4 - b.wallH - b.d * (0.2 + rnd() * 0.3), 3, INK, 0.7, 0.5);
    plaque(ctx, b.fx, b.base - 4 - b.wallH + 4, '狐仙廟', 18, [90, 40, 30]);
  },
  hall(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.64, 9, 0.26);
    stoneBase(ctx, b.x0, b.x1, b.base, 6);
    // steps
    ctx.fillStyle = rgba([180, 174, 162], 1);
    ctx.fillRect(b.fx - 9, b.base - 6, 18, 6);
    wall(ctx, b.x0 + 6, b.x1 - 6, b.base - 6 - b.wallH, b.base - 6, [214, 182, 130]);
    pillars(ctx, b.x0 + 6, b.x1 - 6, b.base - 6 - b.wallH, b.base - 6, 6, [156, 50, 38]);
    door(ctx, b.fx, b.base - 6, 14, b.wallH * 0.75, [130, 46, 34]);
    lattice(ctx, b.x0 + 14, b.base - 6 - b.wallH * 0.72, 10, 10);
    lattice(ctx, b.x1 - 24, b.base - 6 - b.wallH * 0.72, 10, 10);
    roofShape(ctx, b.x0 - 4, b.x1 + 4, b.base - 6 - b.wallH, b.d * 0.85, TILE, { snow: b.snow, lift: 7, ornament: GOLD });
    plaque(ctx, b.fx, b.base - 6 - b.wallH + 5, '清虛觀', 22);
  },
  bighall(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.66, 10, 0.28);
    stoneBase(ctx, b.x0 - 6, b.x1 + 6, b.base, 10);
    ctx.fillStyle = rgba([226, 222, 212], 1);
    ctx.fillRect(b.fx - 14, b.base - 10, 28, 10);
    ctx.strokeStyle = rgba(INK, 0.4);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let y = b.base - 8; y < b.base; y += 2.5) {
      ctx.moveTo(b.fx - 14, y);
      ctx.lineTo(b.fx + 14, y);
    }
    ctx.stroke();
    const top = b.base - 10 - b.wallH;
    wall(ctx, b.x0 + 4, b.x1 - 4, top, b.base - 10, [222, 196, 150]);
    pillars(ctx, b.x0 + 4, b.x1 - 4, top, b.base - 10, 8, [160, 46, 36]);
    door(ctx, b.fx, b.base - 10, 18, b.wallH * 0.8, [140, 40, 30]);
    roofShape(ctx, b.x0 - 6, b.x1 + 6, top, 12, TILE, { snow: b.snow, lift: 6 });
    const ux0 = b.x0 + b.w * 0.14;
    const ux1 = b.x1 - b.w * 0.14;
    wall(ctx, ux0, ux1, top - 12 - 14, top - 12, [222, 196, 150]);
    pillars(ctx, ux0, ux1, top - 26, top - 12, 6, [160, 46, 36]);
    roofShape(ctx, ux0 - 6, ux1 + 6, top - 26, b.d * 0.7, TILE, { snow: b.snow, lift: 9, ornament: GOLD });
    plaque(ctx, b.fx, top - 19, '青雲殿', 24, [40, 50, 70]);
  },
  pagoda(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base + 1, b.w * 0.8, 7, 0.24);
    stoneBase(ctx, b.x0 - 4, b.x1 + 4, b.base, 5);
    let y = b.base - 5;
    let half = b.w * 0.5;
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const hh = i ? 12 : 18;
      wall(ctx, b.fx - half * 0.72, b.fx + half * 0.72, y - hh, y, [226, 216, 196]);
      if (!i) door(ctx, b.fx, y, 7, 12, [120, 44, 34]);
      else dab(ctx, b.fx, y - hh * 0.5, 1.8, INK, 0.7, 1.4);
      roofShape(ctx, b.fx - half * 0.9, b.fx + half * 0.9, y - hh, 7, TILE, { snow: b.snow, lift: 4, overhang: half * 0.3 });
      y -= hh + 7;
      half *= 0.86;
    }
    line(ctx, [[b.fx, y + 6], [b.fx, y - 14]], 1.8, rgba(INK, 0.9));
    for (let k = 0; k < 3; k++) dab(ctx, b.fx, y - 2 - k * 4, 2.2 - k * 0.4, GOLD, 0.95, 0.6);
  },
  well(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, 16, 5, 0.2);
    ctx.fillStyle = rgba(STONE, 1);
    ctx.beginPath();
    ctx.ellipse(b.fx, b.base - 6, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(b.fx - 12, b.base - 6, 24, 6);
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = rgba(INK, 0.85);
    ctx.beginPath();
    ctx.ellipse(b.fx, b.base - 6, 9, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, [[b.fx - 11, b.base - 4], [b.fx - 10, b.base - 26]], 1.4, rgba(WOOD, 1));
    line(ctx, [[b.fx + 11, b.base - 4], [b.fx + 10, b.base - 26]], 1.4, rgba(WOOD, 1));
    line(ctx, [[b.fx - 13, b.base - 25], [b.fx + 13, b.base - 25]], 1.6, rgba(WOOD, 1));
    line(ctx, [[b.fx + 2, b.base - 25], [b.fx + 2, b.base - 12]], 0.5, rgba(INK, 0.8));
    ctx.fillStyle = rgba(WOOD, 1);
    ctx.fillRect(b.fx, b.base - 13, 4, 4);
  },
  tent(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, b.w * 0.6, 6, 0.22);
    ctx.fillStyle = rgba([150, 120, 86], 0.97);
    ctx.beginPath();
    ctx.moveTo(b.fx - b.w * 0.42, b.base);
    ctx.lineTo(b.fx - 4, b.base - 26);
    ctx.lineTo(b.fx + 4, b.base - 26);
    ctx.lineTo(b.fx + b.w * 0.42, b.base);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = rgba(INK, 0.8);
    ctx.beginPath();
    ctx.moveTo(b.fx - 6, b.base);
    ctx.lineTo(b.fx, b.base - 18);
    ctx.lineTo(b.fx + 6, b.base);
    ctx.fill();
    // drying rack with a pelt
    line(ctx, [[b.x1 + 6, b.base + 2], [b.x1 + 6, b.base - 22]], 1, rgba(WOOD, 1));
    line(ctx, [[b.x1 + 22, b.base + 2], [b.x1 + 22, b.base - 22]], 1, rgba(WOOD, 1));
    line(ctx, [[b.x1 + 4, b.base - 21], [b.x1 + 24, b.base - 21]], 1, rgba(WOOD, 1));
    dab(ctx, b.x1 + 14, b.base - 13, 7, [140, 110, 80], 0.95, 1.1);
    // the fire ring
    for (let a = 0; a < Math.PI * 2; a += 0.8) dab(ctx, b.x0 - 12 + Math.cos(a) * 6, b.base + 2 + Math.sin(a) * 2.4, 1.8, STONE, 1, 0.8);
    dab(ctx, b.x0 - 12, b.base + 2, 3, INK, 0.8, 0.6);
  },
  stall(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, b.w * 0.6, 4, 0.16);
    ctx.fillStyle = rgba(WOOD, 0.95);
    ctx.fillRect(b.x0, b.base - 9, b.w, 3);
    line(ctx, [[b.x0 + 2, b.base - 6], [b.x0 + 2, b.base]], 1.1, rgba(WOOD, 1));
    line(ctx, [[b.x1 - 2, b.base - 6], [b.x1 - 2, b.base]], 1.1, rgba(WOOD, 1));
    for (let i = 0; i < 6; i++) dab(ctx, b.x0 + 4 + rnd() * (b.w - 8), b.base - 10.5, 1.6, [[170, 80, 60], [200, 180, 120], [90, 120, 90]][i % 3], 0.95, 0.8);
    // awning
    line(ctx, [[b.x0, b.base - 9], [b.x0, b.base - 26]], 1, rgba(WOOD, 1));
    line(ctx, [[b.x1, b.base - 9], [b.x1, b.base - 26]], 1, rgba(WOOD, 1));
    const col = [[70, 100, 130], [160, 70, 56], [190, 170, 120]][Math.floor(rnd() * 3)];
    ctx.fillStyle = rgba(col, 0.92);
    ctx.beginPath();
    ctx.moveTo(b.x0 - 3, b.base - 24);
    ctx.lineTo(b.x1 + 3, b.base - 24);
    ctx.lineTo(b.x1 + 1, b.base - 31);
    ctx.lineTo(b.x0 - 1, b.base - 31);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 0.6;
    ctx.stroke();
  },
  tower(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, b.w * 0.7, 5, 0.22);
    stoneBase(ctx, b.x0 - 3, b.x1 + 3, b.base, 22);
    wall(ctx, b.x0 + 1, b.x1 - 1, b.base - 22 - 14, b.base - 22, [210, 200, 180]);
    lattice(ctx, b.fx - 4, b.base - 33, 8, 7);
    roofShape(ctx, b.x0 - 3, b.x1 + 3, b.base - 36, 18, TILE, { snow: b.snow, lift: 4 });
  },
  paifang(ctx, rnd, b) {
    const posts = [b.x0, b.fx - b.w * 0.18, b.fx + b.w * 0.18, b.x1];
    for (const x of posts) {
      shadow(ctx, x, b.base, 5, 2, 0.25);
      line(ctx, [[x, b.base], [x, b.base - 44]], 3, rgba([150, 48, 38], 1));
      ctx.fillStyle = rgba(STONE, 1);
      ctx.fillRect(x - 3, b.base - 4, 6, 4);
    }
    line(ctx, [[b.x0 - 4, b.base - 36], [b.x1 + 4, b.base - 36]], 2.4, rgba([150, 48, 38], 1));
    line(ctx, [[b.fx - b.w * 0.24, b.base - 46], [b.fx + b.w * 0.24, b.base - 46]], 2.4, rgba([150, 48, 38], 1));
    roofShape(ctx, b.x0 - 6, b.fx - b.w * 0.2, b.base - 38, 6, TILE, { snow: b.snow, lift: 3, inset: 3 });
    roofShape(ctx, b.fx + b.w * 0.2, b.x1 + 6, b.base - 38, 6, TILE, { snow: b.snow, lift: 3, inset: 3 });
    roofShape(ctx, b.fx - b.w * 0.26, b.fx + b.w * 0.26, b.base - 48, 9, TILE, { snow: b.snow, lift: 4, ornament: GOLD });
    plaque(ctx, b.fx, b.base - 41, b.st.name || '青雲', 18, [40, 50, 70]);
  },
  stonegate(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, b.w * 0.62, 8, 0.28);
    for (const s of [-1, 1]) {
      const x = b.fx + s * b.w * 0.32;
      const hgt = s < 0 ? 70 : 46;
      ctx.fillStyle = rgba([128, 124, 116], 1);
      ctx.beginPath();
      ctx.moveTo(x - 9, b.base);
      ctx.lineTo(x - 9, b.base - hgt);
      ctx.lineTo(x - 2, b.base - hgt - 6);
      ctx.lineTo(x + 9, b.base - hgt + 3);
      ctx.lineTo(x + 9, b.base);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.85);
      ctx.lineWidth = 1;
      ctx.stroke();
      for (let k = 0; k < 5; k++) line(ctx, [[x - 6, b.base - 10 - k * 11], [x + 6, b.base - 8 - k * 11]], 0.5, rgba(INK, 0.35));
      // faded runes
      for (let k = 0; k < 4; k++) dab(ctx, x + (rnd() - 0.5) * 8, b.base - 14 - k * 12, 1.4, [90, 120, 170], 0.5, 1);
    }
    // the lintel, fallen and leaning
    ctx.save();
    ctx.translate(b.fx + 8, b.base - 18);
    ctx.rotate(0.38);
    ctx.fillStyle = rgba([120, 116, 108], 1);
    ctx.fillRect(-b.w * 0.36, -6, b.w * 0.72, 12);
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.strokeRect(-b.w * 0.36, -6, b.w * 0.72, 12);
    ctx.restore();
    for (let i = 0; i < 6; i++) rockLump(ctx, rnd, b.fx + (rnd() - 0.5) * b.w, b.base + 2, 10 + rnd() * 8, 5 + rnd() * 4, b.season, false);
  },
  stele(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, 12, 3, 0.24);
    ctx.fillStyle = rgba(STONE, 1);
    ctx.fillRect(b.fx - 10, b.base - 6, 20, 6);
    ctx.fillStyle = rgba([136, 132, 124], 1);
    ctx.fillRect(b.fx - 7, b.base - 34, 14, 28);
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(b.fx - 7, b.base - 34, 14, 28);
    ctx.fillStyle = rgba(INK, 0.85);
    ctx.font = `700 7px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [...(b.st.name || '')].forEach((ch, i) => ctx.fillText(ch, b.fx, b.base - 28 + i * 8));
  },
  torii(ctx, rnd, b) {
    for (const s of [-1, 1]) {
      const x = b.fx + s * b.w * 0.36;
      shadow(ctx, x, b.base, 4, 1.6);
      line(ctx, [[x, b.base], [x, b.base - 34]], 2.4, rgba([164, 60, 44], 0.92));
    }
    line(ctx, [[b.x0 - 6, b.base - 34], [b.x1 + 6, b.base - 36]], 2.6, rgba([164, 60, 44], 0.92));
    line(ctx, [[b.x0, b.base - 27], [b.x1, b.base - 28]], 1.6, rgba([164, 60, 44], 0.85));
    // weathered
    line(ctx, [[b.x0 + 4, b.base - 34], [b.x0 + 14, b.base - 35]], 1.2, rgba(INK, 0.4));
  },
  boat(ctx, rnd, b) {
    ctx.fillStyle = rgba([120, 150, 160], 0.25);
    ctx.beginPath();
    ctx.ellipse(b.fx, b.base, 30, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(WOOD, 0.95);
    ctx.beginPath();
    ctx.moveTo(b.fx - 28, b.base - 6);
    ctx.quadraticCurveTo(b.fx, b.base + 4, b.fx + 28, b.base - 7);
    ctx.quadraticCurveTo(b.fx, b.base - 1, b.fx - 28, b.base - 6);
    ctx.fill();
    ctx.fillStyle = rgba([60, 50, 40], 0.9);
    ctx.beginPath();
    ctx.moveTo(b.fx - 6, b.base - 4);
    ctx.quadraticCurveTo(b.fx + 2, b.base - 15, b.fx + 12, b.base - 5);
    ctx.fill();
    line(ctx, [[b.fx - 18, b.base - 4], [b.fx - 26, b.base - 26]], 0.9, rgba(INK, 0.9));
    // the old ferryman
    dab(ctx, b.fx + 18, b.base - 10, 3, INK, 0.9, 1.2);
    ctx.fillStyle = rgba(STRAW, 1);
    ctx.beginPath();
    ctx.moveTo(b.fx + 12, b.base - 13);
    ctx.lineTo(b.fx + 18, b.base - 18);
    ctx.lineTo(b.fx + 24, b.base - 13);
    ctx.closePath();
    ctx.fill();
  },
  pavilion(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, b.w * 0.6, 6, 0.22);
    stoneBase(ctx, b.x0 + 2, b.x1 - 2, b.base, 4);
    const top = b.base - 4 - 26;
    for (const t of [0.12, 0.38, 0.62, 0.88]) line(ctx, [[b.x0 + b.w * t, b.base - 4], [b.x0 + b.w * t, top]], 1.8, rgba([160, 52, 40], 1));
    // bench rail
    line(ctx, [[b.x0 + b.w * 0.1, b.base - 11], [b.x1 - b.w * 0.1, b.base - 11]], 1.4, rgba(WOOD, 1));
    // pointed roof
    ctx.fillStyle = rgba(TILE, 0.97);
    ctx.beginPath();
    ctx.moveTo(b.x0 - 10, top + 2);
    ctx.quadraticCurveTo(b.fx, top - 4, b.x1 + 10, top + 2);
    ctx.quadraticCurveTo(b.fx + 6, top - 10, b.fx, top - 28);
    ctx.quadraticCurveTo(b.fx - 6, top - 10, b.x0 - 10, top + 2);
    ctx.fill();
    if (b.snow) dab(ctx, b.fx, top - 10, 12, SNOW, 0.8, 0.6);
    ctx.strokeStyle = rgba(INK, 0.9);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    line(ctx, [[b.fx, top - 28], [b.fx, top - 36]], 1.4, rgba(INK, 0.9));
    dab(ctx, b.fx, top - 36, 2, GOLD, 1, 1);
  },
  bigtree(ctx, rnd, b) {
    // 老槐樹: older than the town, wider than three men can reach around
    ctx.save();
    ctx.translate(b.fx, b.base);
    ctx.scale(1.35, 1.1);
    leafyTree(ctx, rnd, 0, 0, 110, b.season, 1, { blossom: false, evergreen: false });
    ctx.restore();
    stroke(ctx, b.fx - 6, b.base, b.fx - 2, b.base - 30, b.fx + 2, b.base - 70, 16, 8, rgba(INK, 0.9));
  },
  teashed(ctx, rnd, b) {
    shadow(ctx, b.fx, b.base, b.w * 0.6, 5, 0.18);
    const top = b.base - b.wallH - 4;
    for (const x of [b.x0 + 3, b.x1 - 3]) line(ctx, [[x, b.base], [x, top]], 1.4, rgba(WOOD, 1));
    roofShape(ctx, b.x0 - 2, b.x1 + 2, top, b.d * 0.7, STRAW, { straw: true, lift: 1, snow: b.snow });
    ctx.fillStyle = rgba(WOOD, 0.95);
    ctx.fillRect(b.fx - 10, b.base - 8, 20, 2.5);
    line(ctx, [[b.fx - 8, b.base - 6], [b.fx - 8, b.base]], 0.9, rgba(WOOD, 1));
    line(ctx, [[b.fx + 8, b.base - 6], [b.fx + 8, b.base]], 0.9, rgba(WOOD, 1));
    dab(ctx, b.fx - 3, b.base - 10, 2.4, INK, 0.85, 0.8);
    dab(ctx, b.fx + 4, b.base - 9.5, 1.2, [220, 214, 200], 1, 0.8);
    flag(ctx, b.x1 + 6, b.base, 36, '茶', [150, 60, 46]);
  },
};

/** A building or painted object from places.js STRUCTURES (by its index). */
export function structureSprite(st, index, season) {
  return buildingSprite(`st:${index}:${season}`, st, season);
}

/** A stretch of the market's wall, one cell long: 'h' runs across, 'v' runs away from you. */
export function wallSprite(dir, season) {
  if (dir === 'v') {
    return bake(`w:v:${season}`, 22, 66, 11, 62, (ctx) => {
      ctx.fillStyle = rgba([150, 144, 132], 1);
      ctx.fillRect(4, 8, 14, 54);
      ctx.strokeStyle = rgba(INK, 0.7);
      ctx.lineWidth = 0.8;
      ctx.strokeRect(4, 8, 14, 54);
      ctx.fillStyle = rgba(TILE, 1);
      ctx.fillRect(2, 2, 18, 8);
      if (season === 'winter') {
        ctx.fillStyle = rgba(SNOW, 0.9);
        ctx.fillRect(2, 1, 18, 3);
      }
    });
  }
  return bake(`w:h:${season}`, 44, 40, 22, 36, (ctx) => {
    shadow(ctx, 22, 36, 24, 3, 0.2);
    ctx.fillStyle = rgba([156, 150, 138], 1);
    ctx.fillRect(1, 12, 42, 24);
    ctx.strokeStyle = rgba(INK, 0.45);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let y = 18; y < 36; y += 6) {
      ctx.moveTo(1, y);
      ctx.lineTo(43, y);
    }
    for (let y = 12, k = 0; y < 36; y += 6, k++) {
      for (let x = k % 2 ? 6 : 1; x < 43; x += 10) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 6);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(INK, 0.75);
    ctx.lineWidth = 0.9;
    ctx.strokeRect(1, 12, 42, 24);
    // crenels
    ctx.fillStyle = rgba(TILE, 1);
    for (let x = 1; x < 43; x += 9) ctx.fillRect(x, 6, 6, 7);
    if (season === 'winter') {
      ctx.fillStyle = rgba(SNOW, 0.9);
      for (let x = 1; x < 43; x += 9) ctx.fillRect(x, 5, 6, 2.5);
    }
  });
}

// ── things found off the road ──

const PROPS = {
  crane_hurt: { w: 44, h: 30, fx: 22, fy: 27, draw(ctx) {
    ctx.fillStyle = rgba([248, 248, 246], 1);
    ctx.beginPath();
    ctx.ellipse(22, 20, 12, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // one wing spread on the ground, bloodied
    ctx.fillStyle = rgba([240, 240, 236], 1);
    ctx.beginPath();
    ctx.moveTo(18, 20);
    ctx.quadraticCurveTo(6, 26, 2, 22);
    ctx.quadraticCurveTo(10, 18, 18, 18);
    ctx.fill();
    ctx.stroke();
    dab(ctx, 10, 22, 3, [170, 40, 36], 0.75, 0.6);
    line(ctx, [[32, 18], [36, 8], [40, 6]], 1.2, rgba(INK, 0.85));
    dab(ctx, 39, 6, 1.3, [190, 40, 36], 1, 1);
    line(ctx, [[40, 6], [44, 7]], 0.9, rgba(INK, 0.9));
    line(ctx, [[20, 26], [22, 27]], 0.8, rgba(INK, 0.8));
  } },
  lin_down: { w: 46, h: 22, fx: 23, fy: 18, draw(ctx) {
    shadow(ctx, 23, 16, 20, 4, 0.2);
    ctx.fillStyle = rgba([60, 70, 90], 0.95);
    ctx.beginPath();
    ctx.ellipse(22, 13, 15, 4.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    dab(ctx, 38, 12, 3.6, [226, 206, 176], 1, 1);
    dab(ctx, 39, 10, 2.6, INK, 0.9, 0.8);
    dab(ctx, 24, 15, 2.5, [160, 40, 36], 0.6, 0.6);
    line(ctx, [[8, 14], [3, 17]], 1.4, rgba([60, 70, 90], 0.95));
  } },
  stele: { w: 26, h: 40, fx: 13, fy: 37, draw(ctx, rnd) {
    shadow(ctx, 13, 37, 12, 3, 0.25);
    ctx.fillStyle = rgba([132, 128, 118], 1);
    ctx.beginPath();
    ctx.moveTo(5, 37);
    ctx.lineTo(5, 14);
    ctx.lineTo(9, 10);
    ctx.lineTo(14, 16);
    ctx.lineTo(20, 9);
    ctx.lineTo(21, 37);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let y = 18; y < 34; y += 4) line(ctx, [[9, y], [17, y]], 0.6, rgba(INK, 0.35));
    for (let i = 0; i < 4; i++) dab(ctx, 6 + rnd() * 14, 30 + rnd() * 6, 1.4, [70, 100, 70], 0.8, 1);
  } },
  stele_fallen: { w: 44, h: 18, fx: 22, fy: 15, draw(ctx) {
    shadow(ctx, 22, 14, 20, 4, 0.25);
    ctx.fillStyle = rgba([128, 124, 114], 1);
    ctx.save();
    ctx.translate(22, 10);
    ctx.rotate(0.08);
    ctx.fillRect(-18, -4, 36, 8);
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 1;
    ctx.strokeRect(-18, -4, 36, 8);
    ctx.restore();
  } },
  lightning_tree: { w: 60, h: 80, fx: 30, fy: 76, draw(ctx, rnd) {
    shadow(ctx, 30, 76, 18, 5, 0.25);
    stroke(ctx, 28, 76, 22, 50, 14, 22, 7, 2, rgba([30, 26, 24], 0.95));
    stroke(ctx, 32, 76, 38, 48, 46, 26, 7, 2, rgba([30, 26, 24], 0.95));
    branchOut(ctx, rnd, 14, 24, -2.2, 10, 1.6, 1);
    branchOut(ctx, rnd, 46, 28, -0.9, 10, 1.6, 1);
    // the split, still glowing
    line(ctx, [[30, 74], [30, 52]], 1.2, rgba([140, 170, 230], 0.8));
    // the crack at its roots
    line(ctx, [[30, 76], [36, 80], [42, 79]], 1.2, rgba(INK, 0.9));
  } },
  cave: { w: 80, h: 60, fx: 40, fy: 56, draw(ctx, rnd) {
    rockLump(ctx, rnd, 40, 56, 76, 40, 'summer', true);
    ctx.fillStyle = rgba([12, 10, 10], 0.95);
    ctx.beginPath();
    ctx.moveTo(32, 56);
    ctx.quadraticCurveTo(31, 36, 40, 34);
    ctx.quadraticCurveTo(49, 36, 48, 56);
    ctx.closePath();
    ctx.fill();
  } },
  wolfking: { w: 70, h: 54, fx: 35, fy: 50, draw(ctx, rnd) {
    rockLump(ctx, rnd, 35, 52, 64, 22, 'summer', true);
    // a huge grey wolf sitting on the rock
    ctx.fillStyle = rgba([92, 92, 96], 1);
    ctx.beginPath();
    ctx.moveTo(24, 34);
    ctx.quadraticCurveTo(26, 16, 38, 14);
    ctx.lineTo(42, 6);
    ctx.lineTo(45, 13);
    ctx.lineTo(52, 16);
    ctx.lineTo(46, 20);
    ctx.quadraticCurveTo(48, 30, 46, 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 1;
    ctx.stroke();
    dab(ctx, 45, 15, 0.9, [230, 200, 80], 1, 1);
    dab(ctx, 40, 11, 2.4, [230, 230, 236], 0.9, 0.6);
    line(ctx, [[24, 32], [16, 34], [12, 31]], 2.4, rgba([92, 92, 96], 1));
  } },
  corpse: { w: 44, h: 34, fx: 22, fy: 30, draw(ctx, rnd) {
    darkTree(ctx, rnd, 30, 30, 40, 'autumn');
    ctx.fillStyle = rgba([90, 80, 70], 0.95);
    ctx.beginPath();
    ctx.ellipse(18, 26, 6, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    dab(ctx, 19, 18, 3, [190, 176, 150], 1, 1);
    dab(ctx, 13, 28, 2.2, [110, 100, 80], 1, 0.8);
  } },
  girl: { w: 24, h: 26, fx: 12, fy: 23, draw(ctx) {
    shadow(ctx, 12, 23, 8, 2, 0.2);
    ctx.fillStyle = rgba([170, 80, 70], 0.95);
    ctx.beginPath();
    ctx.ellipse(12, 18, 5.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    dab(ctx, 12, 10, 3.2, [226, 206, 176], 1, 1);
    dab(ctx, 12, 8.6, 3, INK, 0.9, 0.6);
  } },
  python: { w: 90, h: 50, fx: 45, fy: 46, draw(ctx) {
    ctx.strokeStyle = rgba([40, 60, 54], 0.96);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.ellipse(45, 36, 30, 10, 0, 0.2, Math.PI * 2 - 0.2);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(45, 30, 18, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(60, 28);
    ctx.quadraticCurveTo(70, 14, 62, 6);
    ctx.stroke();
    dab(ctx, 60, 6, 5.5, [40, 60, 54], 1, 0.8);
    dab(ctx, 61, 3, 1.8, [70, 90, 80], 1, 1);
    dab(ctx, 63, 5, 0.9, [230, 200, 80], 1, 1);
    ctx.strokeStyle = rgba(INK, 0.35);
    ctx.lineWidth = 0.6;
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      ctx.beginPath();
      ctx.arc(45 + Math.cos(a) * 30, 36 + Math.sin(a) * 10, 2, 0, Math.PI);
      ctx.stroke();
    }
  } },
  sword_glint: { w: 40, h: 34, fx: 20, fy: 31, draw(ctx, rnd) {
    rockLump(ctx, rnd, 20, 31, 30, 14, 'summer', false);
    line(ctx, [[20, 20], [21, 8]], 2.2, rgba([210, 220, 230], 1));
    line(ctx, [[20, 20], [21, 8]], 0.6, rgba(INK, 0.6));
  } },
  herb: { w: 20, h: 22, fx: 10, fy: 20, draw(ctx, rnd) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45;
      stroke(ctx, 10, 20, 10 + Math.cos(a) * 4, 20 + Math.sin(a) * 6, 10 + Math.cos(a) * 8, 20 + Math.sin(a) * 12, 2.4, 0.4, rgba([70, 130, 90], 0.95));
    }
    dab(ctx, 10, 8, 1.8, [240, 236, 200], 1, 1);
  } },
};

export function propSprite(kind) {
  const p = PROPS[kind];
  if (!p) return null;
  return bake(`p:${kind}`, p.w, p.h, p.fx, p.fy, (ctx, rnd) => p.draw(ctx, rnd));
}
