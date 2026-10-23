// The sound of a place: beds that run all the time (wind, leaves, a
// stream, a big river, rain, a crowd, insects, blown sand, a low drone, a shimmer), each
// at a level audio/director.js sets from where you are and what the sky is
// doing; and things that happen now and then over them (a bird, thunder, a
// wind chime, a far bell, the night watchman's clapper, a drop of water in
// a cave, a wolf far off, a caravan's bells). A bed that has been silent a while is put to
// sleep, and woken when it is wanted again.

import { ctx, bus, noise } from './engine.js';
import { bell, burst, drum, sweep } from './voices.js';

/** How each bed is made: noise through filters (with a wobble), or tones. */
const BEDS = {
  wind: { filters: [['lowpass', 520, 0.6]], wob: [[0.07, 0.35], [0.19, 0.2]], sweepHz: 260, gain: 0.4 },
  leaves: { filters: [['bandpass', 4200, 0.7]], wob: [[0.31, 0.5], [0.83, 0.3]], gain: 0.12 },
  stream: { filters: [['bandpass', 1300, 1.1], ['peaking', 600, 1, 6]], wob: [[6.3, 0.18], [9.1, 0.14], [0.21, 0.25]], gain: 0.15 },
  river: { filters: [['lowpass', 380, 0.7]], wob: [[0.11, 0.25]], gain: 0.5 },
  rain: { filters: [['highpass', 1100, 0.6], ['lowpass', 7500, 0.5]], wob: [[0.13, 0.12]], gain: 0.21 },
  crowd: { filters: [['bandpass', 480, 0.9], ['peaking', 1100, 1.4, 5]], wob: [[0.23, 0.4], [0.57, 0.25]], gain: 0.17 },
  // crickets: a narrow, high hiss, trilled fast and swelling slow
  insects: { filters: [['bandpass', 4600, 9], ['peaking', 4600, 3, 9]], wob: [[23, 0.85], [0.55, 0.5]], gain: 0.08 },
  // blown sand: a dry hiss, high up, that comes and goes with the gusts
  sand: { filters: [['highpass', 2600, 0.5], ['lowpass', 7000, 0.6]], wob: [[0.09, 0.5], [0.33, 0.3]], gain: 0.1 },
  drone: { tones: [55, 82.4, 110.2], gain: 0.05 },
  shimmer: { tones: [2093, 2637, 3136], wobTone: 0.17, gain: 0.006 },
};

const A = { beds: {}, levels: {}, events: {}, last: 0 };

function makeBed(name) {
  const c = ctx();
  const B = BEDS[name];
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(bus('amb'));
  const stop = [];
  if (B.filters) {
    const n = c.createBufferSource();
    n.buffer = noise();
    n.loop = true;
    let last = n;
    let first = null;
    for (const [type, hz, q, db] of B.filters) {
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = hz;
      f.Q.value = q;
      if (db) f.gain.value = db;
      last.connect(f);
      last = f;
      first ||= f;
    }
    const shape = c.createGain();
    shape.gain.value = 1;
    last.connect(shape).connect(out);
    // the wobble: slow (gusts, a murmur) or quick (water babbling)
    for (const [hz, depth] of B.wob || []) {
      const lfo = c.createOscillator();
      lfo.frequency.value = hz * (0.9 + Math.random() * 0.2);
      const d = c.createGain();
      d.gain.value = depth;
      lfo.connect(d).connect(shape.gain);
      lfo.start();
      stop.push(lfo);
    }
    if (B.sweepHz && first) {
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.04;
      const d = c.createGain();
      d.gain.value = B.sweepHz;
      lfo.connect(d).connect(first.frequency);
      lfo.start();
      stop.push(lfo);
    }
    n.start(0, Math.random() * 1.5);
    stop.push(n);
  } else if (B.tones) {
    for (const hz of B.tones) {
      const osc = c.createOscillator();
      osc.frequency.value = hz;
      osc.detune.value = (Math.random() - 0.5) * 10;
      const g = c.createGain();
      g.gain.value = 1 / B.tones.length;
      if (B.wobTone) {
        const lfo = c.createOscillator();
        lfo.frequency.value = B.wobTone * (0.7 + Math.random() * 0.6);
        const d = c.createGain();
        d.gain.value = 0.5 / B.tones.length;
        lfo.connect(d).connect(g.gain);
        lfo.start();
        stop.push(lfo);
      }
      osc.connect(g).connect(out);
      osc.start();
      stop.push(osc);
    }
  }
  return { out, stop, quietSince: 0 };
}

/**
 * Set the beds: { wind, leaves, stream, river, rain, crowd, insects,
 * drone, shimmer } from 0 to 1 (missing: 0). They glide to it.
 */
export function setBeds(levels) {
  const c = ctx();
  if (!c) return;
  const now = c.currentTime;
  for (const name of Object.keys(BEDS)) {
    const want = Math.max(0, Math.min(1.5, levels[name] || 0)) * BEDS[name].gain;
    let bed = A.beds[name];
    if (want > 0.0005 && !bed) bed = A.beds[name] = makeBed(name);
    if (!bed) continue;
    bed.out.gain.setTargetAtTime(want, now, 1.2);
    if (want > 0.0005) bed.quietSince = 0;
    else if (!bed.quietSince) bed.quietSince = now;
    else if (now - bed.quietSince > 12) {
      // silent a while: put it to sleep
      for (const n of bed.stop) {
        try {
          n.stop();
        } catch {
          /* already */
        }
      }
      bed.out.disconnect();
      delete A.beds[name];
    }
  }
  A.levels = levels;
}

/**
 * Now and then: odds per second of each thing happening (set with the
 * beds), rolled each call. ev: { birds, thunder, chimes, bell, clapper,
 * drip, howl, owl, frogs, moonbell }.
 */
export function happen(ev, dt) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + 0.05;
  for (const [name, rate] of Object.entries(ev)) {
    if (!rate || Math.random() > rate * dt) continue;
    const pan = (Math.random() - 0.5) * 1.4;
    const o = { bus: 'amb', pan };
    if (name === 'birds') {
      // a few quick chirps
      const base = 2400 + Math.random() * 1800;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) sweep(t + k * (0.08 + Math.random() * 0.06), { ...o, type: 'sine', from: base * (1 + Math.random() * 0.3), to: base * (0.7 + Math.random() * 0.5), dur: 0.06 + Math.random() * 0.05, vel: 0.06 });
    } else if (name === 'thunder') {
      // a crack, then the long roll
      burst(t, { ...o, type: 'lowpass', hz: 2500, q: 0.5, vel: 0.35, len: 0.12 });
      for (let k = 0; k < 6; k++) burst(t + 0.1 + k * 0.35 + Math.random() * 0.3, { ...o, type: 'lowpass', hz: 140 + Math.random() * 120, q: 0.7, vel: 0.5 - k * 0.06, len: 0.9 });
    } else if (name === 'chimes') {
      const top = 84 + Math.floor(Math.random() * 5);
      for (let k = 0; k < 3; k++) bell('chime', top + [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)], t + k * (0.15 + Math.random() * 0.25), { ...o, vel: 0.5 });
    } else if (name === 'bell') {
      bell('zhong', 43 + Math.floor(Math.random() * 3) * 2, t, { ...o, vel: 0.45 });
    } else if (name === 'clapper') {
      // the watchman: two knocks, a pause, two more
      for (const at of [0, 0.32, 1.1, 1.42]) drum('bangzi', t + at, { ...o, vel: 0.28 });
    } else if (name === 'drip') {
      sweep(t, { ...o, from: 1700 + Math.random() * 900, to: 900, dur: 0.05, vel: 0.12 });
    } else if (name === 'howl') {
      // far off: a voice rising and falling
      const f0 = 330 + Math.random() * 80;
      sweep(t, { ...o, type: 'sine', from: f0, to: f0 * 1.6, dur: 0.9, vel: 0.05, attack: 0.3, lp: 1200 });
      sweep(t + 0.9, { ...o, type: 'sine', from: f0 * 1.6, to: f0 * 1.1, dur: 1.2, vel: 0.05, attack: 0.05, lp: 1200 });
    } else if (name === 'owl') {
      for (const at of [0, 0.42, 0.62]) sweep(t + at, { ...o, type: 'sine', from: 410, to: 360, dur: 0.22, vel: 0.06, attack: 0.04 });
    } else if (name === 'frogs') {
      for (let k = 0; k < 3; k++) burst(t + k * 0.14, { ...o, hz: 700 + Math.random() * 200, q: 6, vel: 0.12, len: 0.05 });
    } else if (name === 'moonbell') {
      bell('chime', 88 + Math.floor(Math.random() * 3), t, { ...o, vel: 0.35 });
    } else if (name === 'camelbell') {
      // a caravan far off: a dull bell, once with each step of the beast
      const top = 74 + Math.floor(Math.random() * 3);
      for (let k = 0; k < 4; k++) bell('chime', top + (k % 2 ? 0 : 2), t + k * 0.64, { ...o, vel: 0.3 - k * 0.05 });
    }
  }
}
