// 水墨 2.5D: procedurally painted ink-wash scenes in parallax layers.
// Every place has its own seed, so each corner of the world looks different.

import { stream, hashStr } from '../core/rng.js';

export const INK = [36, 33, 30];
export const RED = [168, 50, 42];
export const PAPER = [239, 233, 219];

export const SEASONS = {
  spring: { sky: ['#f1f1e6', '#e8ebdc'], tint: [104, 146, 102], sun: [206, 112, 92, 0.42], particle: 'petal' },
  summer: { sky: ['#eef1ea', '#e1e9e2'], tint: [72, 124, 112], sun: [196, 108, 78, 0.36], particle: 'seed' },
  autumn: { sky: ['#f3e9d6', '#eadbc0'], tint: [172, 112, 56], sun: [178, 58, 40, 0.7], particle: 'leaf' },
  winter: { sky: ['#eeeeee', '#e3e5e7'], tint: [118, 126, 134], sun: [196, 196, 200, 0.55], particle: 'snow' },
};

export const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ── noise & shapes ──

export function noise1D(rnd, n) {
  const v = Array.from({ length: n + 2 }, () => rnd());
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const t = (1 - Math.cos(f * Math.PI)) / 2;
    const a = v[((i % v.length) + v.length) % v.length];
    const b = v[(((i + 1) % v.length) + v.length) % v.length];
    return a * (1 - t) + b * t;
  };
}

/** Ridge points [[x,y]...] across width w. */
export function ridge(rnd, w, { base, amp, scale = 200, sharp = 0.75, peakiness = 1.5 }) {
  const n0 = noise1D(rnd, Math.ceil(w / scale) + 3);
  const n1 = noise1D(rnd, Math.ceil((w / scale) * 2.3) + 3);
  const n2 = noise1D(rnd, Math.ceil((w / scale) * 5.1) + 3);
  const pts = [];
  for (let x = -4; x <= w + 4; x += 3) {
    const r0 = 1 - Math.abs(2 * n0(x / scale) - 1) * sharp;
    const v = 0.62 * r0 + 0.26 * n1((x / scale) * 2.3) + 0.12 * n2((x / scale) * 5.1);
    pts.push([x, base - amp * Math.pow(Math.max(0, v), peakiness)]);
  }
  return pts;
}

function yAt(pts, x) {
  const i = Math.max(0, Math.min(pts.length - 1, Math.round((x + 4) / 3)));
  return pts[i][1];
}

function mountainRange(ctx, rnd, w, h, o) {
  const pts = ridge(rnd, w, o);
  let minY = Infinity;
  for (const [, y] of pts) minY = Math.min(minY, y);
  const bottom = o.base + (o.depth ?? h * 0.25);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-4, h);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(w + 4, h);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, minY, 0, bottom);
  g.addColorStop(0, rgba(INK, o.alpha));
  g.addColorStop(0.45, rgba(INK, o.alpha * 0.6));
  g.addColorStop(1, rgba(INK, o.fadeTo ?? 0));
  ctx.fillStyle = g;
  ctx.fill();
  if (o.wash) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = rgba(o.wash[0], o.wash[1]);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  // the brush line along the ridge
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(INK, Math.min(0.95, o.alpha * 1.25));
  const wn = noise1D(rnd, 60);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = (o.line ?? 1.2) * (0.35 + 1.1 * wn(i / 9));
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  // 皴法: short dry strokes down the slopes
  const strokes = o.texture ?? 0;
  ctx.lineWidth = 0.8;
  for (let k = 0; k < strokes; k++) {
    const x = rnd() * w;
    const y0 = yAt(pts, x) + 2 + rnd() * (bottom - yAt(pts, x)) * 0.45;
    const len = 4 + rnd() * 14;
    const lean = (rnd() - 0.5) * 6;
    ctx.strokeStyle = rgba(INK, o.alpha * (0.25 + rnd() * 0.4));
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.quadraticCurveTo(x + lean * 0.5, y0 + len * 0.5, x + lean, y0 + len);
    ctx.stroke();
  }
  if (o.snow) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const [x, y] of pts) ctx.lineTo(x, y + 2.2);
    ctx.stroke();
  }
  ctx.restore();
  return pts;
}

function mistBand(ctx, w, y, hgt, alpha) {
  const g = ctx.createLinearGradient(0, y - hgt / 2, 0, y + hgt / 2);
  g.addColorStop(0, rgba(PAPER, 0));
  g.addColorStop(0.5, rgba(PAPER, alpha));
  g.addColorStop(1, rgba(PAPER, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - hgt / 2, w, hgt);
}

/** Distant woods as 米點: clusters of soft ink dots along a ridge. */
function farTrees(ctx, rnd, pts, count, size, alpha) {
  for (let i = 0; i < count; i++) {
    const p = pts[Math.floor(rnd() * pts.length)];
    const n = 3 + Math.floor(rnd() * 5);
    for (let j = 0; j < n; j++) {
      const x = p[0] + (rnd() - 0.5) * size * 2.2;
      const y = p[1] + 1 + rnd() * size * 0.7;
      const r = size * (0.16 + rnd() * 0.16);
      ctx.fillStyle = rgba(INK, alpha * (0.35 + rnd() * 0.5));
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** One pine in the 松針 manner: a leaning trunk, branches, and fans of needles. */
export function pine(ctx, rnd, x, y, size, alpha, tint) {
  ctx.save();
  ctx.lineCap = 'round';
  const lean = (rnd() - 0.5) * size * 0.4;
  const top = [x + lean, y - size];
  const trunkAt = (t) => {
    const u = 1 - t;
    // quadratic bezier through a bend
    const cx = x - lean * 0.6;
    const cy = y - size * 0.55;
    return [u * u * x + 2 * u * t * cx + t * t * top[0], u * u * y + 2 * u * t * cy + t * t * top[1]];
  };
  // trunk: a few overlapping strokes so it reads as brushed bark
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = rgba(INK, alpha * (k === 0 ? 0.9 : 0.35));
    ctx.lineWidth = Math.max(1.2, Math.min(7, size * (0.06 - k * 0.016)));
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const [px, py] = trunkAt(i / 20);
      const j = k ? (rnd() - 0.5) * size * 0.012 : 0;
      if (i === 0) ctx.moveTo(px + j, py);
      else ctx.lineTo(px + j, py);
    }
    ctx.stroke();
  }
  // branches with needle fans, alternating sides, shorter towards the top
  const pads = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < pads; i++) {
    const t = 0.4 + (i / pads) * 0.6;
    const [bx, by] = trunkAt(t);
    const side = i % 2 ? 1 : -1;
    const reach = size * (0.42 - t * 0.22) * (0.75 + rnd() * 0.5);
    const ex = bx + side * reach;
    const ey = by - reach * (0.08 + rnd() * 0.12);
    ctx.strokeStyle = rgba(INK, alpha * 0.85);
    ctx.lineWidth = Math.max(0.8, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + side * reach * 0.5, by + reach * 0.12, ex, ey);
    ctx.stroke();
    // a soft wash under the needles gives the pad its mass
    ctx.fillStyle = rgba(tint || INK, (tint ? 0.22 : 0.16) * alpha);
    ctx.beginPath();
    ctx.ellipse(ex - side * reach * 0.15, ey - reach * 0.05, reach * 0.62, reach * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // needle fans
    const fans = 2 + Math.floor(rnd() * 2);
    for (let f = 0; f < fans; f++) {
      const fx = ex - side * reach * (0.1 + f * 0.32);
      const fy = ey - reach * 0.04 + (rnd() - 0.5) * reach * 0.06;
      const len = reach * (0.22 + rnd() * 0.12);
      ctx.strokeStyle = rgba(INK, alpha * (0.55 + rnd() * 0.35));
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let a = -Math.PI * 0.95; a <= -Math.PI * 0.05; a += Math.PI / 11) {
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len * 0.55);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function leafTree(ctx, rnd, x, y, size, alpha, tint) {
  ctx.save();
  ctx.strokeStyle = rgba(INK, alpha);
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + size * 0.08, y - size * 0.4, x - size * 0.04, y - size * 0.62);
  ctx.moveTo(x + size * 0.02, y - size * 0.4);
  ctx.lineTo(x + size * 0.2, y - size * 0.6);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * size * 0.32;
    const cx = x + Math.cos(a) * r;
    const cy = y - size * 0.72 + Math.sin(a) * r * 0.6;
    const rr = size * (0.12 + rnd() * 0.12);
    ctx.fillStyle = tint && rnd() < 0.5 ? rgba(tint, alpha * 0.55) : rgba(INK, alpha * (0.3 + rnd() * 0.3));
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function roof(ctx, x, y, w, rise, alpha, color = INK) {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - w * 0.16, y + rise * 0.15);
  ctx.quadraticCurveTo(x - w / 2, y - rise * 0.05, x - w / 2 + w * 0.12, y - rise);
  ctx.lineTo(x + w / 2 - w * 0.12, y - rise);
  ctx.quadraticCurveTo(x + w / 2, y - rise * 0.05, x + w / 2 + w * 0.16, y + rise * 0.15);
  ctx.quadraticCurveTo(x, y - rise * 0.25, x - w / 2 - w * 0.16, y + rise * 0.15);
  ctx.fill();
}

export function house(ctx, x, y, s, alpha, opts = {}) {
  const w = 30 * s;
  const hgt = 15 * s;
  ctx.fillStyle = rgba(PAPER, 0.96);
  ctx.fillRect(x - w / 2, y - hgt, w, hgt);
  ctx.strokeStyle = rgba(INK, alpha * 0.8);
  ctx.lineWidth = 0.9;
  ctx.strokeRect(x - w / 2, y - hgt, w, hgt);
  ctx.fillStyle = rgba(INK, alpha * 0.8);
  ctx.fillRect(x - 3 * s, y - hgt * 0.62, 6 * s, hgt * 0.62);
  if (opts.window) ctx.fillRect(x + w * 0.22, y - hgt * 0.7, 5 * s, 4 * s);
  roof(ctx, x, y - hgt, w, 8 * s, alpha, opts.roof || INK);
  if (opts.lantern) {
    ctx.fillStyle = rgba(RED, 0.85);
    ctx.beginPath();
    ctx.ellipse(x - w * 0.42, y - hgt + 3 * s, 2.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function hall(ctx, x, y, s, alpha) {
  house(ctx, x, y, s * 1.5, alpha, { window: true });
  roof(ctx, x, y - 15 * s * 1.5 - 7 * s, 30 * s, 7 * s, alpha);
}

export function pagoda(ctx, x, y, s, alpha, tiers = 5) {
  let w = 22 * s;
  let yy = y;
  for (let i = 0; i < tiers; i++) {
    const hh = 8 * s;
    ctx.fillStyle = rgba(PAPER, 0.95);
    ctx.fillRect(x - w * 0.32, yy - hh, w * 0.64, hh);
    ctx.strokeStyle = rgba(INK, alpha * 0.7);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x - w * 0.32, yy - hh, w * 0.64, hh);
    roof(ctx, x, yy - hh, w, 5 * s, alpha);
    yy -= hh + 4.5 * s;
    w *= 0.84;
  }
  ctx.strokeStyle = rgba(INK, alpha);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, yy + 4 * s);
  ctx.lineTo(x, yy - 6 * s);
  ctx.stroke();
}

export function swordInGround(ctx, x, y, len, alpha, lean) {
  ctx.strokeStyle = rgba(INK, alpha);
  ctx.lineWidth = 1.1;
  const tx = x + lean;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, y - len);
  ctx.moveTo(tx - 3.5, y - len * 0.78);
  ctx.lineTo(tx + 3.5, y - len * 0.8);
  ctx.stroke();
}

export function brokenPillar(ctx, rnd, x, y, w, hgt, alpha) {
  ctx.fillStyle = rgba(INK, alpha * 0.55);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - hgt);
  for (let i = 0; i <= 4; i++) ctx.lineTo(x - w / 2 + (w * i) / 4, y - hgt - rnd() * w * 0.8);
  ctx.lineTo(x + w / 2, y);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, alpha * 0.9);
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x - w / 2, y - hgt, w, hgt);
}

export function grass(ctx, rnd, w, y0, count, alpha, tint) {
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = y0 + rnd() * 18;
    const hgt = 6 + rnd() * 16;
    const lean = (rnd() - 0.5) * 10;
    ctx.strokeStyle = tint && rnd() < 0.35 ? rgba(tint, alpha * 0.8) : rgba(INK, alpha * (0.4 + rnd() * 0.5));
    ctx.lineWidth = 0.6 + rnd() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.3, y - hgt * 0.6, x + lean, y - hgt);
    ctx.stroke();
  }
}

function water(ctx, rnd, w, y0, y1, alpha) {
  ctx.strokeStyle = rgba(INK, alpha);
  ctx.lineCap = 'round';
  for (let y = y0; y < y1; y += 5 + rnd() * 6) {
    for (let k = 0; k < 3; k++) {
      const x = rnd() * w;
      const len = 14 + rnd() * 60 * ((y - y0) / (y1 - y0) + 0.3);
      ctx.lineWidth = 0.6 + ((y - y0) / (y1 - y0)) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len / 2, y - 1.5, x + len, y);
      ctx.stroke();
    }
  }
}

export function boat(ctx, x, y, s, alpha) {
  ctx.fillStyle = rgba(INK, alpha);
  ctx.beginPath();
  ctx.moveTo(x - 22 * s, y - 3 * s);
  ctx.quadraticCurveTo(x, y + 6 * s, x + 22 * s, y - 4 * s);
  ctx.quadraticCurveTo(x, y + 1 * s, x - 22 * s, y - 3 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 6 * s, y - 2 * s);
  ctx.lineTo(x + 9 * s, y - 13 * s);
  ctx.lineTo(x + 12 * s, y - 2 * s);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, alpha);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y - 2 * s);
  ctx.lineTo(x - 20 * s, y - 16 * s);
  ctx.stroke();
}

export function crane(ctx, x, y, s, alpha) {
  ctx.strokeStyle = rgba(INK, alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y - 2 * s);
  ctx.quadraticCurveTo(x - 4 * s, y - 6 * s, x, y);
  ctx.quadraticCurveTo(x + 4 * s, y - 6 * s, x + 9 * s, y - 2 * s);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 5 * s, y + 1 * s);
  ctx.stroke();
}

function shrine(ctx, x, y, s, alpha) {
  // gate
  ctx.strokeStyle = rgba(RED, 0.85);
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 46 * s, y);
  ctx.lineTo(x - 46 * s, y - 30 * s);
  ctx.moveTo(x - 26 * s, y);
  ctx.lineTo(x - 26 * s, y - 30 * s);
  ctx.moveTo(x - 51 * s, y - 30 * s);
  ctx.lineTo(x - 21 * s, y - 31 * s);
  ctx.moveTo(x - 49 * s, y - 24 * s);
  ctx.lineTo(x - 23 * s, y - 24 * s);
  ctx.stroke();
  house(ctx, x + 6 * s, y, s * 1.1, alpha, { roof: RED });
  // blue lantern
  const g = ctx.createRadialGradient(x - 14 * s, y - 8 * s, 0, x - 14 * s, y - 8 * s, 14 * s);
  g.addColorStop(0, 'rgba(120,170,230,0.55)');
  g.addColorStop(1, 'rgba(120,170,230,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 30 * s, y - 24 * s, 32 * s, 32 * s);
  ctx.fillStyle = 'rgba(70,120,190,0.9)';
  ctx.beginPath();
  ctx.ellipse(x - 14 * s, y - 8 * s, 2.4 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function waterfall(ctx, rnd, x, top, bottom, w, alpha) {
  ctx.fillStyle = rgba(PAPER, 0.92);
  ctx.fillRect(x - w / 2, top, w, bottom - top);
  ctx.strokeStyle = rgba(INK, alpha * 0.35);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 14; i++) {
    const xx = x - w / 2 + rnd() * w;
    const y0 = top + rnd() * (bottom - top) * 0.6;
    ctx.beginPath();
    ctx.moveTo(xx, y0);
    ctx.lineTo(xx + (rnd() - 0.5) * 2, y0 + 20 + rnd() * 50);
    ctx.stroke();
  }
}

/** A textured rock face: noisy outline, ink gradient, dry brush strokes. */
export function rockFace(ctx, rnd, outline, alpha, { strokes = 90, edge = null } = {}) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of outline) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  ctx.save();
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, minY, 0, maxY);
  g.addColorStop(0, rgba(INK, alpha));
  g.addColorStop(0.7, rgba(INK, alpha * 0.55));
  g.addColorStop(1, rgba(INK, alpha * 0.15));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < strokes; i++) {
    const x = minX + rnd() * (maxX - minX);
    const y = minY + rnd() * (maxY - minY);
    const len = 6 + rnd() * 20;
    ctx.strokeStyle = rgba(INK, alpha * (0.3 + rnd() * 0.6));
    ctx.lineWidth = 0.6 + rnd() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 4, y + len * 0.5, x + (rnd() - 0.5) * 6, y + len);
    ctx.stroke();
  }
  ctx.restore();
  if (edge) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(INK, Math.min(0.95, alpha * 1.6));
    for (let i = edge[0] + 1; i <= edge[1]; i++) {
      ctx.lineWidth = 0.8 + rnd() * 2.2;
      ctx.beginPath();
      ctx.moveTo(outline[i - 1][0], outline[i - 1][1]);
      ctx.lineTo(outline[i][0], outline[i][1]);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Points down one side of a cliff, wobbling with noise. */
function cliffEdge(rnd, x0, y0, x1, y1, steps, wobble) {
  const n = noise1D(rnd, steps + 2);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([x0 + (x1 - x0) * t + (n(i * 0.8) - 0.5) * wobble, y0 + (y1 - y0) * t]);
  }
  return pts;
}

// ── scene recipes ──

function recipe(kind, rnd, W, H, season) {
  const S = SEASONS[season];
  const tint = S.tint;
  const snow = season === 'winter';
  const L = [];
  const far = (o = {}) => (ctx, w, h) =>
    mountainRange(ctx, rnd, w, h, { base: H * 0.5, amp: H * 0.24, scale: 190, alpha: 0.2, texture: 40, line: 0.9, depth: H * 0.2, snow, ...o });
  const mid = (o = {}) => (ctx, w, h) => {
    const pts = mountainRange(ctx, rnd, w, h, { base: H * 0.66, amp: H * 0.3, scale: 150, alpha: 0.42, texture: 110, line: 1.3, depth: H * 0.22, snow, wash: [tint, 0.06], ...o });
    farTrees(ctx, rnd, pts, 28, 9, 0.5);
    return pts;
  };
  const mist = (y, a = 0.9, hh = 0.12) => (ctx, w) => mistBand(ctx, w, H * y, H * hh, a);

  switch (kind) {
    case 'town':
      L.push({ d: 0.12, draw: far() }, { d: 0.18, draw: mist(0.52) });
      L.push({ d: 0.3, draw: mid({ base: H * 0.7, amp: H * 0.18, alpha: 0.32 }) }, { d: 0.35, draw: mist(0.7, 0.8) });
      L.push({
        d: 0.55,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = mountainRange(ctx, rnd, w, h, { base: H * 0.86, amp: H * 0.05, scale: 260, alpha: 0.22, texture: 30, line: 0.8, depth: H * 0.25 });
          const cx = w / 2;
          for (let i = 0; i < 9; i++) {
            const x = cx - w * 0.36 + (i / 8) * w * 0.72 + (rnd() - 0.5) * 30;
            if (Math.abs(x - cx) < 22) continue;
            house(ctx, x, yAt(pts, x) + 3, 0.8 + rnd() * 0.35, 0.82, { window: rnd() < 0.5, lantern: rnd() < 0.25 });
          }
          leafTree(ctx, rnd, cx + w * 0.22, yAt(pts, cx + w * 0.22) + 2, 70, 0.7, season === 'autumn' ? tint : null);
          return pts;
        },
      });
      L.push({ d: 0.85, draw: (ctx, w, h) => grass(ctx, rnd, w, H * 0.94, 80, 0.55, tint) });
      break;
    case 'mountain':
      L.push({ d: 0.1, draw: far({ amp: H * 0.3 }) }, { d: 0.16, draw: mist(0.5) });
      L.push({ d: 0.3, draw: mid({ amp: H * 0.38, sharp: 0.9, peakiness: 1.8 }) }, { d: 0.36, draw: mist(0.7, 0.85) });
      L.push({
        d: 0.6,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = mountainRange(ctx, rnd, w, h, { base: H * 0.93, amp: H * 0.16, scale: 230, alpha: 0.5, texture: 80, line: 1.6, depth: H * 0.15 });
          for (let i = 0; i < 6; i++) {
            const x = rnd() * w;
            if (Math.abs(x - w / 2) < 30) continue;
            pine(ctx, rnd, x, yAt(pts, x) + 4, 40 + rnd() * 50, 0.8, tint);
          }
          return pts;
        },
      });
      L.push({ d: 0.95, draw: (ctx, w) => pine(ctx, rnd, w * 0.2, H * 1.04, H * 0.5, 0.88, tint) });
      break;
    case 'temple':
      L.push({ d: 0.1, draw: far() }, { d: 0.16, draw: mist(0.5) });
      L.push({
        d: 0.3,
        draw: (ctx, w, h) => {
          const pts = mid({ amp: H * 0.28 })(ctx, w, h);
          const x = w * 0.62;
          pagoda(ctx, x, yAt(pts, x) + 6, 0.75, 0.75, 5);
          return pts;
        },
      });
      L.push({ d: 0.36, draw: mist(0.72, 0.85) });
      L.push({
        d: 0.58,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = mountainRange(ctx, rnd, w, h, { base: H * 0.88, amp: H * 0.08, scale: 260, alpha: 0.3, texture: 40, line: 1, depth: H * 0.2 });
          hall(ctx, w * 0.5 + 60, yAt(pts, w * 0.5 + 60) + 3, 0.9, 0.85);
          pine(ctx, rnd, w * 0.5 - 70, yAt(pts, w * 0.5 - 70) + 4, 110, 0.85, tint);
          return pts;
        },
      });
      L.push({ d: 0.9, draw: (ctx, w) => grass(ctx, rnd, w, H * 0.95, 60, 0.5, tint) });
      break;
    case 'market':
      L.push({ d: 0.12, draw: far({ alpha: 0.16 }) }, { d: 0.18, draw: mist(0.55) });
      L.push({
        d: 0.35,
        draw: (ctx, w, h) => {
          for (let i = 0; i < 16; i++) house(ctx, (i / 15) * w, H * 0.74 + (i % 2) * 6, 0.9, 0.42, { window: true });
        },
      });
      L.push({
        d: 0.6,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = ridge(rnd, w, { base: H * 0.9, amp: 4, scale: 300 });
          for (let i = 0; i < 9; i++) {
            const x = (i / 8) * w + (rnd() - 0.5) * 20;
            if (Math.abs(x - w / 2) < 26) continue;
            house(ctx, x, H * 0.9, 1.1, 0.85, { window: true, lantern: true });
          }
          ctx.strokeStyle = rgba(INK, 0.5);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(0, H * 0.62);
          ctx.quadraticCurveTo(w / 2, H * 0.7, w, H * 0.62);
          ctx.stroke();
          for (let i = 1; i < 14; i++) {
            const x = (i / 14) * w;
            const y = H * 0.62 + Math.sin((i / 14) * Math.PI) * H * 0.06;
            ctx.fillStyle = rgba(RED, 0.8);
            ctx.beginPath();
            ctx.ellipse(x, y + 5, 2.6, 3.4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          return pts;
        },
      });
      break;
    case 'forest':
      L.push({
        d: 0.06,
        draw: (ctx, w, h) => {
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, rgba(INK, 0.22));
          g.addColorStop(0.6, rgba(INK, 0.05));
          g.addColorStop(1, rgba(INK, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        },
      });
      L.push({ d: 0.18, draw: (ctx, w) => { for (let i = 0; i < 34; i++) pine(ctx, rnd, rnd() * w, H * 0.62, H * (0.18 + rnd() * 0.14), 0.22, null); } });
      L.push({ d: 0.24, draw: mist(0.6, 0.8, 0.22) });
      L.push({ d: 0.4, draw: (ctx, w) => { for (let i = 0; i < 16; i++) pine(ctx, rnd, rnd() * w, H * 0.8, H * (0.3 + rnd() * 0.18), 0.45, tint); } });
      L.push({ d: 0.46, draw: mist(0.82, 0.65, 0.16) });
      L.push({
        d: 0.7,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = mountainRange(ctx, rnd, w, h, { base: H * 0.95, amp: H * 0.06, scale: 200, alpha: 0.5, texture: 60, line: 1.4, depth: H * 0.1 });
          for (let i = 0; i < 7; i++) {
            const x = (i + 0.5) / 7 * w + (rnd() - 0.5) * 40;
            if (Math.abs(x - w / 2) < 46) continue;
            pine(ctx, rnd, x, yAt(pts, x) + 6, H * (0.55 + rnd() * 0.3), 0.8, tint);
          }
          grass(ctx, rnd, w, H * 0.94, 50, 0.5, tint);
          return pts;
        },
      });
      break;
    case 'valley':
      L.push({ d: 0.1, draw: far({ amp: H * 0.2 }) }, { d: 0.16, draw: mist(0.48) });
      L.push({
        d: 0.32,
        draw: (ctx, w, h) => {
          const cx = w / 2;
          waterfall(ctx, rnd, cx, H * 0.16, H * 0.78, 22, 0.6);
          const leftIn = cliffEdge(rnd, cx - w * 0.05, H * 0.1, cx - w * 0.1, H, 14, w * 0.06);
          const rightIn = cliffEdge(rnd, cx + w * 0.05, H * 0.14, cx + w * 0.11, H, 14, w * 0.06);
          const left = [[0, H], [0, H * 0.2], [cx - w * 0.24, H * 0.06], ...leftIn.map((p) => [p[0], p[1]])];
          const right = [[w, H], [w, H * 0.24], [cx + w * 0.26, H * 0.1], ...rightIn];
          rockFace(ctx, rnd, left, 0.42, { strokes: 120, edge: [3, left.length - 1] });
          rockFace(ctx, rnd, right, 0.38, { strokes: 120, edge: [3, right.length - 1] });
          farTrees(ctx, rnd, [[cx - w * 0.3, H * 0.07], [cx - w * 0.18, H * 0.08], [cx + w * 0.2, H * 0.11], [cx + w * 0.32, H * 0.12]], 10, 8, 0.6);
          pine(ctx, rnd, cx - w * 0.12, H * 0.14, H * 0.18, 0.75, tint);
          pine(ctx, rnd, cx + w * 0.16, H * 0.17, H * 0.15, 0.7, tint);
        },
      });
      L.push({ d: 0.38, draw: mist(0.74, 0.92, 0.14) });
      L.push({
        d: 0.6,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = mountainRange(ctx, rnd, w, h, { base: H * 0.9, amp: H * 0.07, scale: 220, alpha: 0.32, texture: 30, line: 1, depth: H * 0.2 });
          water(ctx, rnd, w, H * 0.92, H, 0.35);
          return pts;
        },
      });
      L.push({ d: 0.9, draw: (ctx, w) => grass(ctx, rnd, w, H * 0.96, 50, 0.5, tint) });
      break;
    case 'sect':
      L.push({ d: 0.1, draw: far({ amp: H * 0.2 }) }, { d: 0.15, draw: mist(0.56) });
      L.push({
        d: 0.3,
        draw: (ctx, w, h) => {
          const x = w / 2;
          const leftSide = cliffEdge(rnd, x - w * 0.22, H, x - 20, H * 0.19, 16, w * 0.05);
          const rightSide = cliffEdge(rnd, x + 24, H * 0.17, x + w * 0.24, H, 16, w * 0.05);
          const peak = [...leftSide, ...rightSide];
          rockFace(ctx, rnd, peak, 0.44, { strokes: 160, edge: [0, peak.length - 1] });
          pine(ctx, rnd, x - w * 0.12, H * 0.62, H * 0.16, 0.7, tint);
          pine(ctx, rnd, x + w * 0.14, H * 0.42, H * 0.13, 0.7, tint);
          hall(ctx, x, H * 0.18, 0.7, 0.85);
          pagoda(ctx, x - w * 0.09, H * 0.42, 0.45, 0.75, 4);
          hall(ctx, x + w * 0.1, H * 0.5, 0.5, 0.8);
          ctx.strokeStyle = rgba(PAPER, 0.9);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x, H);
          for (let i = 1; i <= 8; i++) ctx.lineTo(x + (i % 2 ? 26 : -26) * (1 - i / 10), H - (i / 8) * H * 0.78);
          ctx.stroke();
        },
      });
      L.push({ d: 0.36, draw: mist(0.4, 0.95, 0.1) }, { d: 0.4, draw: mist(0.66, 0.95, 0.16) });
      L.push({
        d: 0.62,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = mountainRange(ctx, rnd, w, h, { base: H * 0.94, amp: H * 0.06, scale: 240, alpha: 0.35, texture: 40, line: 1, depth: H * 0.1 });
          pine(ctx, rnd, w * 0.5 + 90, yAt(pts, w * 0.5 + 90) + 4, 90, 0.85, tint);
          return pts;
        },
      });
      break;
    case 'ruins':
      L.push({ d: 0.05, draw: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, rgba(INK, 0.22)); g.addColorStop(1, rgba(INK, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } });
      L.push({ d: 0.12, draw: far({ alpha: 0.14, amp: H * 0.12, base: H * 0.58 }) });
      L.push({
        d: 0.3,
        draw: (ctx, w, h) => {
          for (let i = 0; i < 60; i++) swordInGround(ctx, rnd() * w, H * 0.64 + rnd() * H * 0.08, 10 + rnd() * 12, 0.35, (rnd() - 0.5) * 6);
          brokenPillar(ctx, rnd, w * 0.3, H * 0.7, 14, 40, 0.6);
          brokenPillar(ctx, rnd, w * 0.72, H * 0.69, 12, 28, 0.6);
        },
      });
      L.push({ d: 0.38, draw: mist(0.7, 0.6, 0.12) });
      L.push({
        d: 0.62,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = ridge(rnd, w, { base: H * 0.92, amp: 6, scale: 280 });
          for (let i = 0; i < 26; i++) {
            const x = rnd() * w;
            if (Math.abs(x - w / 2) < 30) continue;
            swordInGround(ctx, x, H * 0.9 + rnd() * H * 0.08, 24 + rnd() * 26, 0.8, (rnd() - 0.5) * 12);
          }
          ctx.strokeStyle = rgba(INK, 0.8);
          ctx.lineWidth = 2;
          const tx = w * 0.18;
          ctx.beginPath();
          ctx.moveTo(tx, H * 0.95);
          ctx.quadraticCurveTo(tx + 6, H * 0.75, tx - 10, H * 0.6);
          ctx.moveTo(tx + 2, H * 0.78);
          ctx.lineTo(tx + 26, H * 0.66);
          ctx.moveTo(tx - 4, H * 0.68);
          ctx.lineTo(tx - 24, H * 0.62);
          ctx.stroke();
          return pts;
        },
      });
      break;
    case 'shrine':
      L.push({ d: 0.1, draw: far({ alpha: 0.16 }) }, { d: 0.16, draw: mist(0.54) });
      L.push({ d: 0.3, draw: mid({ base: H * 0.74, amp: H * 0.16, alpha: 0.3 }) });
      L.push({
        d: 0.58,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = ridge(rnd, w, { base: H * 0.88, amp: 8, scale: 260 });
          shrine(ctx, w * 0.5 + 70, H * 0.88, 1.15, 0.85);
          leafTree(ctx, rnd, w * 0.5 - 110, H * 0.89, 90, 0.7, season === 'autumn' ? tint : null);
          return pts;
        },
      });
      L.push({ d: 0.88, draw: (ctx, w) => grass(ctx, rnd, w, H * 0.93, 140, 0.55, tint) });
      break;
    case 'ferry':
      L.push({ d: 0.08, draw: far({ alpha: 0.1, amp: H * 0.1, base: H * 0.5 }) }, { d: 0.12, draw: mist(0.5, 0.95, 0.14) });
      L.push({
        d: 0.3,
        draw: (ctx, w, h) => {
          water(ctx, rnd, w, H * 0.56, H * 0.86, 0.22);
          boat(ctx, w * 0.36, H * 0.7, 0.8, 0.7);
          for (let i = 0; i < 4; i++) crane(ctx, w * (0.55 + i * 0.07), H * (0.3 + (i % 2) * 0.05), 0.9, 0.55);
        },
      });
      L.push({
        d: 0.6,
        ground: true,
        draw: (ctx, w, h) => {
          const pts = ridge(rnd, w, { base: H * 0.92, amp: 5, scale: 260 });
          ctx.fillStyle = rgba(INK, 0.6);
          ctx.fillRect(w * 0.5 + 40, H * 0.86, 120, 4);
          for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.5 + 44 + i * 28, H * 0.86, 3, 26);
          grass(ctx, rnd, w, H * 0.94, 60, 0.5, tint);
          return pts;
        },
      });
      break;
    case 'cave':
    default:
      // inside the mountain: rock all around, a shaft of light, sword marks on the walls
      L.push({
        d: 0.1,
        draw: (ctx, w, h) => {
          ctx.fillStyle = rgba(INK, 0.18);
          ctx.fillRect(0, 0, w, h);
          const g = ctx.createLinearGradient(w * 0.35, 0, w * 0.55, H);
          g.addColorStop(0, 'rgba(250,244,228,0.75)');
          g.addColorStop(1, 'rgba(250,244,228,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(w * 0.4, 0);
          ctx.lineTo(w * 0.5, 0);
          ctx.lineTo(w * 0.64, H);
          ctx.lineTo(w * 0.42, H);
          ctx.fill();
        },
      });
      L.push({
        d: 0.3,
        draw: (ctx, w, h) => {
          ctx.lineCap = 'round';
          for (let i = 0; i < 26; i++) {
            const left = i % 2 === 0;
            const x = left ? w * (0.12 + rnd() * 0.18) : w * (0.7 + rnd() * 0.18);
            const y = H * (0.2 + rnd() * 0.45);
            const len = 20 + rnd() * 34;
            const ang = (rnd() - 0.5) * 1.2;
            ctx.strokeStyle = rgba(INK, 0.55);
            ctx.lineWidth = 1 + rnd();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            ctx.stroke();
          }
        },
      });
      L.push({
        d: 0.6,
        ground: true,
        draw: (ctx, w, h) => {
          const top = cliffEdge(rnd, 0, H * 0.06, w, H * 0.06, 20, H * 0.12);
          const frameL = cliffEdge(rnd, w * 0.1, 0, w * 0.04, H, 12, w * 0.08);
          const frameR = cliffEdge(rnd, w * 0.9, 0, w * 0.96, H, 12, w * 0.08);
          rockFace(ctx, rnd, [[0, 0], [w, 0], ...top.slice().reverse()], 0.7, { strokes: 60 });
          rockFace(ctx, rnd, [[0, 0], ...frameL, [0, H]], 0.72, { strokes: 60, edge: [1, frameL.length] });
          rockFace(ctx, rnd, [[w, 0], ...frameR, [w, H]], 0.72, { strokes: 60, edge: [1, frameR.length] });
          ctx.fillStyle = rgba(INK, 0.5);
          ctx.beginPath();
          ctx.ellipse(w / 2, H * 0.93, 46, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          return ridge(rnd, w, { base: H * 0.91, amp: 2, scale: 300 });
        },
      });
  }
  return L;
}

export function figure(ctx, x, y, s, pose, t, still) {
  ctx.save();
  ctx.fillStyle = rgba(INK, 0.9);
  const sway = still ? 0 : Math.sin(t / 1100) * 1.2 * s;
  if (pose === 'sit') {
    const pulse = still ? 0 : Math.sin(t / 900) * 3 * s;
    const g = ctx.createRadialGradient(x, y - 12 * s, 2, x, y - 12 * s, 30 * s + pulse);
    g.addColorStop(0, 'rgba(232,206,150,0.45)');
    g.addColorStop(1, 'rgba(232,206,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 40 * s, y - 50 * s, 80 * s, 60 * s);
    ctx.fillStyle = rgba(INK, 0.9);
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, y);
    ctx.quadraticCurveTo(x, y - 3 * s, x + 12 * s, y);
    ctx.lineTo(x + 5 * s, y - 14 * s);
    ctx.lineTo(x - 5 * s, y - 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 18 * s, 3.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 22.6 * s, 1.9 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 3.6 * s, y - 22 * s);
    ctx.lineTo(x + 3.6 * s, y - 22 * s);
    ctx.quadraticCurveTo(x + 6 * s, y - 10 * s, x + 7.5 * s + sway, y);
    ctx.lineTo(x - 6.5 * s + sway, y);
    ctx.quadraticCurveTo(x - 6 * s, y - 10 * s, x - 3.6 * s, y - 22 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 25.5 * s, 3.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 0.5 * s, y - 29.6 * s, 1.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.55);
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y - 25 * s);
    ctx.quadraticCurveTo(x - 9 * s + sway * 2, y - 21 * s, x - 13 * s + sway * 3, y - 24 * s);
    ctx.stroke();
  }
  ctx.restore();
}

export function makeParticles(kind, rnd, W, H, count) {
  return Array.from({ length: count }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    v: 0.2 + rnd() * 0.6,
    r: kind === 'snow' ? 1 + rnd() * 1.8 : 2 + rnd() * 2.5,
    ph: rnd() * Math.PI * 2,
    rot: rnd() * Math.PI,
  }));
}

export function drawParticles(ctx, kind, list, W, H, dt, t, still) {
  if (!list.length) return;
  for (const p of list) {
    if (!still && (kind === 'mote' || kind === 'firefly')) {
      // spirit motes rise; fireflies wander
      if (kind === 'mote') p.y -= p.v * dt * 0.012;
      p.x += Math.sin(t / 900 + p.ph) * (kind === 'firefly' ? 0.45 : 0.18);
      p.y += kind === 'firefly' ? Math.cos(t / 1100 + p.ph * 2) * 0.3 : 0;
      if (p.y < -6) {
        p.y = H + 6;
        p.x = Math.random() * W;
      }
      if (p.x > W + 6) p.x = -6;
      if (p.x < -6) p.x = W + 6;
    } else if (!still) {
      p.y += p.v * dt * (kind === 'snow' ? 0.03 : 0.025);
      p.x += Math.sin(t / 1300 + p.ph) * 0.25 + (kind === 'leaf' || kind === 'ash' ? 0.12 : 0.05);
      p.rot += 0.01;
      if (p.y > H + 6) {
        p.y = -6;
        p.x = Math.random() * W;
      }
      if (p.x > W + 6) p.x = -6;
    }
    if (kind === 'mote' || kind === 'firefly') {
      const a = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t / (kind === 'firefly' ? 380 : 700) + p.ph * 3));
      const c = kind === 'mote' ? [214, 240, 226] : [226, 240, 130];
      const r = kind === 'mote' ? p.r * 1.6 : p.r * 1.3;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
      g.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.5})`);
      g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(p.x - r * 2.4, p.y - r * 2.4, r * 4.8, r * 4.8);
      continue;
    }
    if (kind === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = 'rgba(60,60,60,0.12)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = kind === 'petal' ? 'rgba(206,132,132,0.75)' : kind === 'leaf' ? 'rgba(170,104,48,0.75)' : kind === 'darkleaf' ? 'rgba(70,84,60,0.7)' : kind === 'ash' ? 'rgba(110,104,98,0.5)' : 'rgba(120,120,110,0.45)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, p.rot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function createScene(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let opts = { kind: 'town', seed: 1, season: 'spring', pose: 'stand' };
  let key = '';
  let W = 0;
  let H = 0;
  let dpr = 1;
  let layers = [];
  let sky = null;
  let grain = null;
  let grainPattern = null;
  let groundPts = null;
  let groundDepth = 0.6;
  let particles = [];
  let pan = 0;
  let vel = 0;
  let dragging = null;
  let raf = 0;
  let last = 0;
  let running = false;

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const rnd = stream(hashStr(opts.kind + ':' + opts.seed));
    const S = SEASONS[opts.season] || SEASONS.spring;
    // sky
    sky = document.createElement('canvas');
    sky.width = canvas.width;
    sky.height = canvas.height;
    const sc = sky.getContext('2d');
    sc.scale(dpr, dpr);
    const g = sc.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, S.sky[0]);
    g.addColorStop(1, S.sky[1]);
    sc.fillStyle = g;
    sc.fillRect(0, 0, W, H);
    const sunX = W * (0.62 + rnd() * 0.25);
    const sunY = H * (0.16 + rnd() * 0.1);
    if (!['cave', 'forest', 'valley'].includes(opts.kind)) {
      sc.fillStyle = rgba(S.sun, S.sun[3]);
      sc.beginPath();
      sc.arc(sunX, sunY, Math.min(W, H) * 0.075, 0, Math.PI * 2);
      sc.fill();
    }
    // layers, each wider than the view so they can slide
    const LW = Math.round(W * 1.4);
    layers = recipe(opts.kind, rnd, LW, H, opts.season).map((L) => {
      const c = document.createElement('canvas');
      c.width = Math.round(LW * dpr);
      c.height = canvas.height;
      const lc = c.getContext('2d');
      lc.scale(dpr, dpr);
      const pts = L.draw(lc, LW, H);
      if (L.ground && Array.isArray(pts)) {
        groundPts = pts;
        groundDepth = L.d;
      }
      return { c, d: L.d, ground: !!L.ground };
    });
    // paper grain
    grain = document.createElement('canvas');
    grain.width = 160;
    grain.height = 160;
    const gc = grain.getContext('2d');
    const gr = stream(7);
    for (let i = 0; i < 1400; i++) {
      gc.fillStyle = gr() < 0.5 ? 'rgba(80,60,30,0.06)' : 'rgba(255,255,255,0.08)';
      gc.fillRect(gr() * 160, gr() * 160, 1, 1);
    }
    grainPattern = ctx.createPattern(grain, 'repeat');
    const kind = S.particle;
    particles = reduce ? [] : makeParticles(kind, rnd, W, H, kind === 'snow' ? 70 : kind === 'seed' ? 12 : 26);
    draw(performance.now(), true);
  }

  function draw(t, force) {
    const dt = Math.min(64, t - (last || t));
    last = t;
    if (!dragging && !reduce) {
      pan += vel;
      vel *= 0.92;
      pan = Math.max(-1, Math.min(1, pan));
    }
    const drift = reduce ? 0 : Math.sin(t / 9000) * 0.3;
    const cam = Math.max(-1.2, Math.min(1.2, pan + drift));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(sky, 0, 0, W, H);
    const LW = W * 1.4;
    const base = -(LW - W) / 2;
    for (const L of layers) {
      const off = base + cam * L.d * W * 0.16;
      ctx.drawImage(L.c, off, 0, LW, H);
      if (L.ground && groundPts) {
        // the player stands in the middle of the ground layer
        const lx = W / 2 - off;
        const gy = yAt(groundPts, lx);
        figure(ctx, W / 2, Math.min(H - 6, gy + 4), Math.max(0.9, H / 300), opts.pose, t, reduce);
      }
    }
    // drifting mist
    if (!reduce) {
      for (let i = 0; i < 3; i++) {
        const x = ((t / (60 + i * 25) + i * 300) % (W + 400)) - 200;
        const y = H * (0.45 + i * 0.12);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 160);
        g.addColorStop(0, rgba(PAPER, 0.32));
        g.addColorStop(1, rgba(PAPER, 0));
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(2.4, 0.35);
        ctx.translate(-x, -y);
        ctx.fillRect(x - 160, y - 160, 320, 320);
        ctx.restore();
      }
    }
    drawParticles(ctx, SEASONS[opts.season]?.particle, particles, W, H, dt, t, reduce || force);
    if (grainPattern) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function loop(t) {
    if (!running) return;
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, pan };
    vel = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.x;
    const next = Math.max(-1, Math.min(1, dragging.pan - dx / (W * 0.5)));
    vel = next - pan;
    pan = next;
  });
  window.addEventListener('pointerup', () => {
    dragging = null;
  });

  return {
    set(next) {
      opts = { ...opts, ...next };
      const k = `${opts.kind}|${opts.seed}|${opts.season}`;
      if (k !== key) {
        key = k;
        if (canvas.isConnected) build();
      } else if (!running) draw(performance.now(), true);
    },
    resize() {
      if (!canvas.isConnected) return;
      const rect = canvas.getBoundingClientRect();
      if (Math.round(rect.width) !== W || Math.round(rect.height) !== H) build();
    },
    start() {
      if (running || reduce) {
        if (reduce) draw(performance.now(), true);
        return;
      }
      running = true;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
