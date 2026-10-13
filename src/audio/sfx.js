// One-shot sounds: the page (a sheet turned, a brush, a seal), word coming
// to you (系統's 叮, a find, good news and bad), a fight (a swing, a blow
// landing, being hit, a step aside, each spell and each beast's move), your
// feet on the ground, going up and coming down. Each is a few of the
// pieces in audio/voices.js; where the thing happened sets left or right
// and how near.

import { ctx, buzz } from './engine.js';
import { pluck, bell, drum, whoosh, sweep, burst, crackle, harmonic } from './voices.js';

const t0 = () => ctx().currentTime + 0.012;
const S = (o = {}) => ({ bus: 'sfx', ...o });

const last = {};
/** At most one of these every so often (a flurry of blows is not a wall of noise). */
function every(name, secs) {
  const c = ctx();
  if (!c) return false;
  const t = c.currentTime;
  if (last[name] !== undefined && t - last[name] < secs) return false;
  last[name] = t;
  return true;
}

// ── the page ──

export function tap() {
  if (!ctx() || !every('tap', 0.05)) return;
  burst(t0(), S({ hz: 2600, q: 1.4, vel: 0.1, len: 0.012 }));
}

/** A story opens: a sheet of paper turned. */
export function page() {
  if (!ctx() || !every('page', 0.3)) return;
  const t = t0();
  whoosh(t, S({ from: 1600, to: 4600, dur: 0.24, vel: 0.13, q: 0.7, peak: 0.6 }));
  burst(t + 0.2, S({ hz: 3000, q: 0.8, vel: 0.05, len: 0.03 }));
}

export function open() {
  if (!ctx()) return;
  whoosh(t0(), S({ from: 900, to: 2800, dur: 0.18, vel: 0.09 }));
}

export function close() {
  if (!ctx()) return;
  whoosh(t0(), S({ from: 2600, to: 900, dur: 0.16, vel: 0.07 }));
}

/** A choice made: a brush stroke, and a soft note. */
export function choose() {
  if (!ctx()) return;
  const t = t0();
  whoosh(t, S({ from: 2400, to: 1200, dur: 0.12, vel: 0.08, q: 0.6 }));
  pluck('zheng', 79, t + 0.03, S({ vel: 0.22, dur: 0.4 }));
}

// ── word ──

/** 系統: 叮. */
export function ding() {
  if (!ctx() || !every('ding', 0.8)) return;
  bell('qing', 81, t0(), S({ vel: 0.5 }));
}

/** Something found: up a fifth on the 箏. */
export function find() {
  if (!ctx() || !every('find', 0.5)) return;
  const t = t0();
  pluck('zheng', 76, t, S({ vel: 0.45 }));
  pluck('zheng', 83, t + 0.13, S({ vel: 0.5 }));
}

/** Good news: three notes up. */
export function good() {
  if (!ctx() || !every('good', 0.5)) return;
  const t = t0();
  [72, 76, 79].forEach((m, k) => pluck('zheng', m, t + k * 0.09, S({ vel: 0.38 })));
}

/** Bad news: two low notes, down. */
export function bad() {
  if (!ctx() || !every('bad', 0.6)) return;
  const t = t0();
  pluck('pipa', 52, t, S({ vel: 0.45, dur: 0.5 }));
  pluck('pipa', 47, t + 0.16, S({ vel: 0.5, dur: 0.8 }));
}

/** A step up inside a realm (煉氣 two to three…). */
export function stageUp() {
  if (!ctx()) return;
  const t = t0();
  [62, 69, 74].forEach((m, k) => pluck('guqin', m, t + k * 0.14, S({ vel: 0.55 })));
  harmonic(86, t + 0.5, S({ vel: 0.6 }));
}

/** A breakthrough, made or failed. */
export function breakthrough(ok) {
  if (!ctx()) return;
  const t = t0();
  if (ok) {
    [50, 57, 62, 69, 74].forEach((m, k) => pluck('guqin', m, t + k * 0.12, S({ vel: 0.6, slide: k === 4 ? 1 : 0 })));
    bell('zhong', 50, t + 0.62, S({ vel: 0.6 }));
    harmonic(86, t + 0.8, S({ vel: 0.7 }));
    harmonic(93, t + 1.05, S({ vel: 0.5 }));
    buzz([30, 60, 30]);
  } else {
    drum('dagu', t, S({ vel: 0.7 }));
    pluck('pipa', 46, t + 0.05, S({ vel: 0.55 }));
    pluck('pipa', 47, t + 0.07, S({ vel: 0.5 }));
    buzz(90);
  }
}

// ── a fight ──

export function fightStart() {
  if (!ctx() || !every('fstart', 1)) return;
  const t = t0();
  drum('dagu', t, S({ vel: 0.75 }));
  drum('tanggu', t + 0.2, S({ vel: 0.5 }));
}

export function fightWon() {
  if (!ctx()) return;
  const t = t0();
  [69, 74, 76, 81].forEach((m, k) => pluck('zheng', m, t + k * 0.08, S({ vel: 0.42 })));
}

export function rage() {
  if (!ctx()) return;
  const t = t0();
  drum('dagu', t, S({ vel: 0.9 }));
  drum('dagu', t + 0.25, S({ vel: 0.8 }));
  buzz([40, 50, 40]);
}

export function escaped() {
  if (!ctx()) return;
  whoosh(t0(), S({ from: 500, to: 1600, dur: 0.4, vel: 0.15 }));
}

/** Something drew near you to hurt you, and it hurt (your blood). */
export function hurt(pan = 0) {
  if (!ctx() || !every('hurt', 0.09)) return;
  const t = t0();
  sweep(t, S({ from: 130, to: 48, dur: 0.13, vel: 0.6, pan }));
  burst(t, S({ type: 'lowpass', hz: 900, q: 0.7, vel: 0.35, len: 0.05, pan }));
  buzz(22);
}

/** You land a blow (crit: a ring on top; weak: softer). */
export function hit(kind = 'dmg', pan = 0, near = 1) {
  if (!ctx() || !every('hit', 0.045)) return;
  const t = t0();
  const v = (kind === 'crit' ? 0.62 : kind === 'weak' ? 0.3 : 0.45) * near;
  sweep(t, S({ from: 175, to: 62, dur: 0.09, vel: v, pan }));
  burst(t, S({ hz: 2300, q: 0.9, vel: v * 0.45, len: 0.016, pan }));
  if (kind === 'crit') {
    bell('qing', 93, t + 0.01, S({ vel: 0.25, pan }));
    buzz(10);
  }
}

export function dodge(pan = 0) {
  if (!ctx() || !every('dodge', 0.12)) return;
  whoosh(t0(), S({ from: 2200, to: 600, dur: 0.2, vel: 0.16, pan }));
}

export function block(pan = 0) {
  if (!ctx() || !every('block', 0.1)) return;
  const t = t0();
  bell('qing', 86, t, S({ vel: 0.32, pan }));
  burst(t, S({ hz: 3200, q: 2, vel: 0.2, len: 0.02, pan }));
}

export function heal() {
  if (!ctx() || !every('heal', 1.2)) return;
  const t = t0();
  pluck('zheng', 83, t, S({ vel: 0.25 }));
  harmonic(91, t + 0.08, S({ vel: 0.35 }));
}

export function pill() {
  if (!ctx()) return;
  const t = t0();
  sweep(t, S({ from: 300, to: 620, dur: 0.08, vel: 0.2, type: 'sine' }));
  bell('chime', 88, t + 0.1, S({ vel: 0.5 }));
}

export function talisman() {
  if (!ctx()) return;
  const t = t0();
  crackle(t, S({ dur: 0.45, count: 16, vel: 0.28 }));
  whoosh(t + 0.05, S({ from: 400, to: 1800, dur: 0.3, vel: 0.16 }));
}

/** An effect in a fight, by its kind (yours or a beast's). */
export function effect(kind, pan = 0, near = 1) {
  if (!ctx()) return;
  const t = t0();
  const v = near;
  const o = (x) => S({ pan, ...x });
  switch (kind) {
    case 'slash':
    case 'cut':
    case 'claw':
    case 'punch':
      if (every(`fx:${kind}`, 0.08)) whoosh(t, o({ from: kind === 'punch' ? 500 : 800, to: kind === 'punch' ? 1500 : 3000, dur: 0.15, vel: 0.2 * v }));
      break;
    case 'bite':
      if (every('fx:bite', 0.1)) {
        burst(t, o({ hz: 1700, q: 1.2, vel: 0.28 * v, len: 0.02 }));
        sweep(t + 0.01, o({ from: 220, to: 90, dur: 0.06, vel: 0.3 * v }));
      }
      break;
    case 'dash':
      whoosh(t, o({ from: 500, to: 1900, dur: 0.24, vel: 0.24 }));
      break;
    case 'slashline':
    case 'swordstep':
    case 'charge':
      whoosh(t, o({ from: 900, to: 3600, dur: 0.22, vel: 0.26 * v, q: 1.6 }));
      break;
    case 'sweep':
      whoosh(t, o({ from: 350, to: 1300, dur: 0.3, vel: 0.24 }));
      break;
    case 'impact':
    case 'land':
      sweep(t, o({ from: 120, to: 45, dur: 0.14, vel: 0.45 * v }));
      burst(t, o({ type: 'lowpass', hz: 700, q: 0.7, vel: 0.25 * v, len: 0.06 }));
      break;
    case 'boom':
      burst(t, o({ type: 'lowpass', hz: 420, q: 0.6, vel: 0.65 * v, len: 0.35 }));
      sweep(t, o({ from: 95, to: 34, dur: 0.3, vel: 0.55 * v }));
      crackle(t + 0.05, o({ dur: 0.5, count: 10, vel: 0.2 * v }));
      break;
    case 'shield':
      sweep(t, o({ from: 700, to: 1500, dur: 0.5, vel: 0.12, type: 'sine', attack: 0.08 }));
      bell('chime', 91, t + 0.06, o({ vel: 0.45 }));
      break;
    case 'iron':
      bell('zhong', 45, t, o({ vel: 0.5 }));
      break;
    case 'bell':
      bell('zhong', 50, t, o({ vel: 0.7 }));
      break;
    case 'mend':
      pluck('zheng', 79, t, o({ vel: 0.25 }));
      pluck('zheng', 86, t + 0.1, o({ vel: 0.22 }));
      harmonic(91, t + 0.2, o({ vel: 0.3 }));
      break;
    case 'sense':
      sweep(t, o({ from: 300, to: 1400, dur: 0.9, vel: 0.1, type: 'sine', attack: 0.3 }));
      bell('chime', 93, t + 0.6, o({ vel: 0.35 }));
      break;
    case 'roar':
      // a throat: noise low and rough, with a growl under it
      burst(t, o({ type: 'lowpass', hz: 520, q: 1.2, vel: 0.55 * v, len: 0.55 }));
      sweep(t, o({ type: 'sawtooth', from: 120, to: 72, dur: 0.6, vel: 0.22 * v, attack: 0.06, lp: 700 }));
      break;
    case 'howl': {
      const f0 = 360 + Math.random() * 60;
      sweep(t, o({ type: 'sine', from: f0, to: f0 * 1.7, dur: 0.55, vel: 0.13 * v, attack: 0.15, lp: 1600 }));
      sweep(t + 0.55, o({ type: 'sine', from: f0 * 1.7, to: f0 * 1.2, dur: 0.8, vel: 0.12 * v, attack: 0.03, lp: 1600 }));
      break;
    }
    case 'ring':
    case 'quake':
    case 'bloodring':
      burst(t, o({ type: 'lowpass', hz: 150, q: 0.7, vel: 0.6 * v, len: 0.6 }));
      sweep(t, o({ from: 70, to: 32, dur: 0.5, vel: 0.5 * v }));
      break;
    case 'blink':
      sweep(t, o({ type: 'sine', from: 1700, to: 280, dur: 0.22, vel: 0.14 * v }));
      break;
    case 'grasp':
      sweep(t, o({ type: 'sawtooth', from: 130, to: 92, dur: 0.5, vel: 0.12 * v, lp: 600, attack: 0.05 }));
      break;
    case 'breath':
      whoosh(t, o({ from: 250, to: 900, dur: 0.7, vel: 0.3 * v, peak: 0.25 }));
      crackle(t + 0.1, o({ dur: 0.6, count: 12, vel: 0.2 * v }));
      break;
    case 'soul':
      sweep(t, o({ type: 'sine', from: 620, to: 410, dur: 0.9, vel: 0.09 * v, attack: 0.3 }));
      break;
    default:
      break;
  }
}

/** Something loosed: yours (a 劍氣, a 火球…) or theirs (venom, a bolt). */
export function shot(kind, foe, pan = 0, near = 1) {
  if (!ctx() || !every(`shot:${kind}`, 0.06)) return;
  const t = t0();
  const o = (x) => S({ pan, ...x });
  const v = near;
  if (kind === 'arrow') whoosh(t, o({ from: 2600, to: 4200, dur: 0.12, vel: 0.14 * v, q: 2 }));
  else if (kind === 'swordqi') {
    sweep(t, o({ type: 'sine', from: 1300, to: 2700, dur: 0.22, vel: 0.1 * v }));
    whoosh(t, o({ from: 1800, to: 5200, dur: 0.2, vel: 0.15 * v, q: 1.8 }));
  } else if (kind === 'fire') {
    whoosh(t, o({ from: 260, to: 900, dur: 0.3, vel: 0.22 * v }));
    crackle(t, o({ dur: 0.3, count: 6, vel: 0.15 * v }));
  } else if (kind === 'foxfire') sweep(t, o({ type: 'sine', from: 900 + Math.random() * 300, to: 1500, dur: 0.25, vel: 0.07 * v }));
  else if (kind === 'mirror') {
    bell('chime', 93, t, o({ vel: 0.4 * v }));
    sweep(t, o({ type: 'sine', from: 2000, to: 3000, dur: 0.18, vel: 0.07 * v }));
  } else if (kind === 'venom') burst(t, o({ type: 'highpass', hz: 4200, q: 0.6, vel: 0.2 * v, len: 0.16 }));
  else sweep(t, o({ type: 'sine', from: foe ? 700 : 900, to: foe ? 1100 : 1600, dur: 0.18, vel: 0.09 * v })); // 靈力外放, foe bolts
}

/** Fire or venom left on the ground. */
export function pool(kind, pan = 0) {
  if (!ctx() || !every('pool', 0.3)) return;
  const t = t0();
  if (kind === 'poison') for (let k = 0; k < 4; k++) burst(t + k * 0.09, S({ type: 'lowpass', hz: 350 + Math.random() * 300, q: 4, vel: 0.15, len: 0.05, pan }));
  else crackle(t, S({ dur: 0.6, count: 12, vel: 0.22, pan }));
}

// ── going about ──

/** A step, by what is underfoot. */
export function step(ground, pan = 0) {
  if (!ctx()) return;
  const t = t0();
  const o = (x) => S({ pan, ...x });
  if (ground === 'stone') {
    burst(t, o({ hz: 2800, q: 1.2, vel: 0.05, len: 0.018 }));
    sweep(t, o({ from: 170, to: 90, dur: 0.04, vel: 0.07 }));
  } else if (ground === 'wood') {
    sweep(t, o({ from: 260, to: 150, dur: 0.05, vel: 0.08 }));
    burst(t, o({ hz: 1200, q: 1.5, vel: 0.05, len: 0.02 }));
  } else if (ground === 'leaves') crackle(t, o({ dur: 0.07, count: 4, vel: 0.06 }));
  else if (ground === 'sand') burst(t, o({ hz: 3600, q: 0.5, vel: 0.045, len: 0.06 }));
  else if (ground === 'snow') {
    burst(t, o({ hz: 1300, q: 0.8, vel: 0.07, len: 0.07 }));
    burst(t + 0.03, o({ hz: 600, q: 0.8, vel: 0.05, len: 0.05 }));
  } else if (ground === 'water') {
    whoosh(t, o({ from: 600, to: 1700, dur: 0.15, vel: 0.08 }));
    burst(t + 0.05, o({ hz: 950, q: 2, vel: 0.06, len: 0.05 }));
  } else if (ground === 'dirt') {
    burst(t, o({ hz: 1300, q: 0.7, vel: 0.05, len: 0.04 }));
    sweep(t, o({ from: 140, to: 80, dur: 0.04, vel: 0.05 }));
  } else burst(t, o({ hz: 1900, q: 0.6, vel: 0.045, len: 0.05 })); // grass
}

export function leap() {
  if (!ctx()) return;
  whoosh(t0(), S({ from: 400, to: 1500, dur: 0.3, vel: 0.16 }));
}

export function landing() {
  if (!ctx() || !every('landing', 0.3)) return;
  const t = t0();
  sweep(t, S({ from: 110, to: 50, dur: 0.1, vel: 0.3 }));
  burst(t, S({ type: 'lowpass', hz: 800, q: 0.7, vel: 0.15, len: 0.05 }));
}

/** Up into the air: a sword rings, a boat hums, the wind takes you. */
export function takeoff(by) {
  if (!ctx()) return;
  const t = t0();
  whoosh(t, S({ from: 300, to: 1600, dur: 0.6, vel: 0.2, peak: 0.6 }));
  if (by === 'sword') bell('chime', 86, t + 0.1, S({ vel: 0.6 }));
  else if (by === 'boat') sweep(t, S({ type: 'sawtooth', from: 100, to: 140, dur: 0.8, vel: 0.08, lp: 500, attack: 0.2 }));
}

// ── the crafts (0.15) ──

/** The furnace takes: fire catching, a low roar. */
export function flame() {
  if (!ctx()) return;
  const t = t0();
  whoosh(t, S({ from: 160, to: 640, dur: 0.6, vel: 0.2, q: 0.5, peak: 0.5 }));
  crackle(t + 0.15, S({ dur: 0.5, count: 9, vel: 0.18 }));
}

/** The fire taken at a moment: just right (a clear chime), or off (a dull knock, a spit of sparks). */
export function fireMark(hit) {
  if (!ctx()) return;
  const t = t0();
  if (hit) bell('chime', 86, t, S({ vel: 0.45 }));
  else {
    drum('muyu', t, S({ vel: 0.5 }));
    crackle(t, S({ dur: 0.2, count: 6, vel: 0.15 }));
  }
}

/** A brush on paper (soft; at most so often while it moves). */
export function brush() {
  if (!ctx() || !every('brush', 0.09)) return;
  burst(t0(), S({ hz: 2200 + Math.random() * 1200, q: 0.8, vel: 0.035, len: 0.05 }));
}

export function seclusion(start) {
  if (!ctx()) return;
  const t = t0();
  if (start) bell('qing', 69, t, S({ vel: 0.5 }));
  else {
    bell('qing', 74, t, S({ vel: 0.45 }));
    harmonic(86, t + 0.4, S({ vel: 0.5 }));
  }
}

export function death() {
  if (!ctx()) return;
  const t = t0();
  bell('zhong', 43, t, S({ vel: 0.7 }));
}
