// The sky over the picture, for both the 3D and the flat view: what falls
// (rain, snow, blown sand, a blizzard's snow, or the season's petals and
// leaves), the grey of a wet day, the white of a fog or a blizzard, the brown
// of a sandstorm, a desert noon's glare, a blood moon's red, and the flash of
// lightning.

import { weatherNow, moonTonight, arid } from '../world/weather.js';
import { flashOf, liveOf } from '../world/explore.js';
import { landTable } from '../world/maps/index.js';

/** Under the ground (a region whose air lets in little of the sun: 西漠's 地宮, 北原's mine): no sky over you, nothing falls. */
const UNDER = new Set(Object.entries(landTable('moods')).filter(([, m]) => (m.sun ?? 1) < 0.5).map(([id]) => id));
const underground = (s) => UNDER.has(s.player?.loc);

const SEASON_FALL = { spring: 'petal', summer: 'seed', autumn: 'leaf', winter: null };

/** What falls now (a particle kind; null: nothing), and how many of them on the screen. */
export function fallOf(s, season) {
  if (underground(s)) return [null, 0];
  const w = weatherNow(s);
  if (w.id === 'rain') return ['rain', 80];
  if (w.id === 'storm') return ['storm', 150];
  if (w.blizzard) return ['blizzard', 210];
  if (w.id === 'snow') return ['snow', 70];
  if (w.id === 'fog') return [null, 0];
  if (w.sand) return ['sand', 150];
  // (over the sand nothing drifts down but now and then a little dust)
  if (w.heat || arid(s.player?.loc)) return [null, 0];
  const kind = SEASON_FALL[season];
  return [kind, kind === 'seed' ? 10 : 22];
}

/** How the weather changes the light (for the 3D view): { amb, sun } multipliers, a haze colour to lean toward and how far, a haze reach. */
export function skyLight(s) {
  const w = weatherNow(s);
  const blood = moonTonight(s, 'bloodmoon');
  // blown sand: a brown dusk at noon, and nothing far off; a burning noon: white light, the distance shimmering
  if (w.sand) return { amb: 0.92, sun: 0.55, haze: [0.8, 0.66, 0.46], lean: 0.66, reach: 0.4 };
  // a blizzard: white on white, the sun a smudge, nothing far off
  if (w.blizzard) return { amb: 0.96, sun: 0.45, haze: [0.86, 0.9, 0.95], lean: 0.72, reach: 0.36 };
  if (w.heat) return { amb: 1.06, sun: 1.12, haze: [0.98, 0.92, 0.78], lean: 0.2, reach: 0.85 };
  return {
    amb: 1 - 0.3 * w.dim,
    sun: 1 - 0.75 * w.dim,
    haze: w.fog ? [0.9, 0.9, 0.88] : blood ? [0.56, 0.36, 0.33] : [0.72, 0.74, 0.76],
    lean: w.fog ? 0.55 : blood ? 0.35 : w.dim * 0.7,
    reach: w.fog ? 0.45 : w.wet ? 0.8 : 1,
  };
}

/** Over the whole picture: a grey wash in the rain, a white veil in fog, red under a blood moon, white when the lightning strikes. t: seconds. */
export function drawSkyVeil(ctx, s, W, H, t) {
  if (underground(s)) {
    drawUnder(ctx, s, W, H);
    return;
  }
  const w = weatherNow(s);
  if (w.fog) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(238,236,228,0.55)');
    g.addColorStop(0.5, 'rgba(238,236,228,0.25)');
    g.addColorStop(1, 'rgba(238,236,228,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (w.sand) {
    // blown sand: brown-gold over everything, thickest low down, rolling
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const pulse = 0.04 * Math.sin(t * 0.0013);
    g.addColorStop(0, `rgba(176,140,90,${0.32 + pulse})`);
    g.addColorStop(0.6, `rgba(190,150,96,${0.42 + pulse})`);
    g.addColorStop(1, `rgba(170,128,80,${0.5 + pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (w.blizzard) {
    // a blizzard: a white veil, thickest low down, rolling
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const pulse = 0.05 * Math.sin(t * 0.0017);
    g.addColorStop(0, `rgba(226,234,242,${0.34 + pulse})`);
    g.addColorStop(0.6, `rgba(234,240,246,${0.46 + pulse})`);
    g.addColorStop(1, `rgba(240,244,248,${0.56 + pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (w.heat) {
    // a burning noon: white glare from above
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,248,226,0.3)');
    g.addColorStop(0.5, 'rgba(255,244,214,0.08)');
    g.addColorStop(1, 'rgba(255,240,206,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (w.dim > 0) {
    ctx.fillStyle = `rgba(70,76,84,${w.dim * 0.3})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (moonTonight(s, 'bloodmoon')) {
    ctx.fillStyle = 'rgba(150,30,20,0.09)';
    ctx.fillRect(0, 0, W, H);
  }
  // (1.3) the crack the night of the blood moon left over 東荒, never closed: a red seam across the top of the dark
  if (s.vars?.night_crack === 'open' && (s.world?.map || 'donghuang') === 'donghuang' && (s.tod >= 19 || s.tod < 5)) {
    const a = 0.22 + 0.06 * Math.sin(t * 0.0009);
    const u = Math.max(1, W / 900);
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const q = i / 14;
      pts.push([W * (0.1 + 0.8 * q), H * (0.02 + 0.13 * q) + Math.sin(i * 2.3 + 0.7) * H * 0.012 * (1 - Math.abs(q - 0.5))]);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [wd, col] of [[12, `rgba(160,18,14,${a * 0.3})`], [3.2, `rgba(196,36,30,${a})`], [1.1, `rgba(255,176,156,${a * 0.9})`]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wd * u;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.restore();
  }
  // lightning: now and then in a storm, and when it strikes near you
  let flash = 0;
  if (w.thunder) {
    const ph = (t * 0.13 + (s.seed % 97) / 97) % 1;
    if (ph < 0.025) flash = 0.35 * (1 - ph / 0.025);
  }
  const since = liveOf(s).t - flashOf(s);
  if (since >= 0 && since < 0.6) flash = Math.max(flash, 0.75 * (1 - since / 0.6));
  if (flash > 0) {
    ctx.fillStyle = `rgba(250,250,255,${flash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ── (0.24) under the ground ──

/** The star map set in 地宮's dome: a handful of figures, stars joined by faint lines (where on the dome: 0..1). */
const DOME = (() => {
  let seed = 20240907;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const figures = [];
  for (let f = 0; f < 8; f++) {
    const cx = 0.06 + (f / 8) * 0.9 + (rnd() - 0.5) * 0.06;
    const cy = 0.05 + rnd() * 0.22;
    const stars = [];
    const n = 4 + Math.floor(rnd() * 4);
    let x = cx;
    let y = cy;
    for (let k = 0; k < n; k++) {
      stars.push([x, y, 0.8 + rnd() * 1.4]);
      x += (rnd() - 0.45) * 0.07;
      y += (rnd() - 0.5) * 0.06;
    }
    figures.push(stars);
  }
  return figures;
})();

/**
 * Under the ground (地宮, the mine): the dark closing in round the edges, a roof of rock darkest along
 * the top of the picture; in 地宮 the star map on the dome above, glowing faintly, drifting a little as
 * you walk under it.
 */
function drawUnder(ctx, s, W, H) {
  const roof = ctx.createLinearGradient(0, 0, 0, H * 0.34);
  roof.addColorStop(0, 'rgba(12,12,20,0.66)');
  roof.addColorStop(1, 'rgba(12,12,20,0)');
  ctx.fillStyle = roof;
  ctx.fillRect(0, 0, W, H * 0.34);
  const g = ctx.createRadialGradient(W / 2, H * 0.56, Math.min(W, H) * 0.32, W / 2, H * 0.56, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(10,10,16,0)');
  g.addColorStop(1, 'rgba(10,10,16,0.58)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (s.player?.loc !== 'underpalace') return;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const ox = -((s.world?.x || 0) - 950) * 0.12;
  const oy = -((s.world?.y || 0) - 440) * 0.06;
  ctx.save();
  ctx.lineWidth = 0.8;
  DOME.forEach((stars, f) => {
    const pts = stars.map(([x, y]) => [x * W + ox, y * H + oy]);
    ctx.strokeStyle = 'rgba(214,196,140,0.22)';
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    stars.forEach(([, , r], k) => {
      const [x, y] = pts[k];
      const a = 0.45 + 0.35 * Math.sin(now * (0.8 + ((f + k) % 3) * 0.4) + f * 2.1 + k);
      ctx.fillStyle = `rgba(236,220,170,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  ctx.restore();
}
