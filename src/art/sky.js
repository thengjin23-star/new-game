// The sky over the picture, for both the 3D and the flat view: what falls
// (rain, snow, or the season's petals and leaves), the grey of a wet day,
// the white of a fog, a blood moon's red, and the flash of lightning.

import { weatherNow, moonTonight } from '../world/weather.js';
import { flashOf, liveOf } from '../world/explore.js';

const SEASON_FALL = { spring: 'petal', summer: 'seed', autumn: 'leaf', winter: null };

/** What falls now (a particle kind; null: nothing), and how many of them on the screen. */
export function fallOf(s, season) {
  const w = weatherNow(s);
  if (w.id === 'rain') return ['rain', 80];
  if (w.id === 'storm') return ['storm', 150];
  if (w.id === 'snow') return ['snow', 70];
  if (w.id === 'fog') return [null, 0];
  const kind = SEASON_FALL[season];
  return [kind, kind === 'seed' ? 10 : 22];
}

/** How the weather changes the light (for the 3D view): { amb, sun } multipliers, a haze colour to lean toward and how far, a haze reach. */
export function skyLight(s) {
  const w = weatherNow(s);
  const blood = moonTonight(s, 'bloodmoon');
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
  const w = weatherNow(s);
  if (w.fog) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(238,236,228,0.55)');
    g.addColorStop(0.5, 'rgba(238,236,228,0.25)');
    g.addColorStop(1, 'rgba(238,236,228,0.4)');
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
