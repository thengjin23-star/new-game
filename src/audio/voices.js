// The instruments, all made by the program (audio/engine.js holds the context).
//
// - Plucked strings (古琴, 古箏, 琵琶): Karplus–Strong — a burst of noise
//   going round a delay line, a little duller each time round, exactly as
//   a plucked string loses its brightness. Worked out once per note into a
//   buffer, then played at the right speed; a 琴 can slide into a note or
//   sway on it (the buffer's speed bends).
// - Breath (簫, 笛子, 塤, 笙, 嗩吶) and the bowed 二胡: oscillators with
//   breath noise, a vibrato that comes in late, a soft start.
// - Struck things (磬, 編鐘, 風鈴, 鼓, 梆子, 木魚, 鑼): partials that die
//   away, each at its own pace.
// - A pad: slow, detuned triangles under a moving filter (閉關, 秘境).
// And the pieces effects are made of: whooshes, thumps, clicks, crackles.

import { ctx, bus, noise } from './engine.js';

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const STRING_SR = 24000;

/** Each instrument's body: the filters it is heard through. [type, Hz, Q, dB] */
const BODY = {
  guqin: [['lowpass', 3200, 0.5], ['peaking', 190, 1, 4]],
  zheng: [['highpass', 90, 0.7], ['peaking', 2600, 1, 2.5]],
  pipa: [['highpass', 150, 0.7], ['peaking', 1300, 1.2, 4], ['lowpass', 8500, 0.5]],
  xiao: [['highpass', 120, 0.7]],
  dizi: [['highpass', 220, 0.7], ['peaking', 3200, 1.5, 3]],
  xun: [['lowpass', 1800, 0.6]],
  sheng: [['lowpass', 2400, 0.6]],
  suona: [['highpass', 300, 0.7], ['peaking', 1800, 2, 6], ['lowpass', 4200, 0.6]],
  erhu: [['highpass', 180, 0.7], ['peaking', 950, 1.4, 5], ['peaking', 2600, 2, 3], ['lowpass', 4200, 0.6]],
  bell: [['highpass', 80, 0.7]],
  drum: [['lowpass', 5000, 0.5]],
  pad: [['lowpass', 2400, 0.4]],
  fx: [],
};

const CHANS = new WeakMap();

/** An instrument's way into a node (a bus, or a piece's own fader): made once per node. */
function chan(kind, target) {
  const c = ctx();
  let m = CHANS.get(target);
  if (!m) CHANS.set(target, (m = new Map()));
  let node = m.get(kind);
  if (node) return node;
  const input = c.createGain();
  let last = input;
  for (const [type, hz, q, db] of BODY[kind] || []) {
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    f.Q.value = q;
    if (db !== undefined) f.gain.value = db;
    last.connect(f);
    last = f;
  }
  last.connect(target);
  m.set(kind, input);
  return input;
}

/** Where a note goes: its instrument's body (into o.node, or the bus o.bus), panned if it has a place. */
function dest(kind, o) {
  const c = ctx();
  const into = chan(kind, o.node || bus(o.bus || 'music'));
  if (!o.pan) return into;
  const p = c.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, o.pan));
  p.connect(into);
  return p;
}

// ── plucked strings ──

/** secs: how long a note can ring; decay: how much a trip round the string keeps; bright: the pluck's edge; pick: where on the string. */
const PLUCK = {
  guqin: { secs: 3.4, decay: 0.9986, bright: 0.32, pick: 0.17, gain: 0.62 },
  zheng: { secs: 2.6, decay: 0.9972, bright: 0.62, pick: 0.11, gain: 0.46 },
  pipa: { secs: 1.4, decay: 0.993, bright: 0.85, pick: 0.08, gain: 0.42 },
};

const STRINGS = new WeakMap();

/** A note on a string, worked out once (per context) and kept. */
function stringNote(c, kind, midi) {
  let m = STRINGS.get(c);
  if (!m) STRINGS.set(c, (m = new Map()));
  const key = `${kind}:${midi}`;
  let b = m.get(key);
  if (b) return b;
  const P = PLUCK[kind];
  const sr = STRING_SR;
  const f = mtof(midi);
  const N = Math.max(2, Math.round(sr / f - 0.5));
  const len = Math.floor(sr * P.secs);
  const buffer = c.createBuffer(1, len, sr);
  const out = buffer.getChannelData(0);
  const ring = new Float32Array(N);
  // the pluck: noise, softened (a fingertip) or not (a plectrum)
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += (Math.random() * 2 - 1 - lp) * P.bright;
    ring[i] = lp;
  }
  // where along the string it was plucked: a comb on the burst
  const at = Math.max(1, Math.round(N * P.pick));
  const burst = ring.slice();
  for (let i = 0; i < N; i++) ring[i] = burst[i] - 0.85 * burst[(i + at) % N];
  let mean = 0;
  for (let i = 0; i < N; i++) mean += ring[i];
  mean /= N;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    ring[i] -= mean;
    peak = Math.max(peak, Math.abs(ring[i]));
  }
  for (let i = 0; i < N; i++) ring[i] /= peak || 1;
  // round and round, a little duller each time
  let idx = 0;
  for (let n = 0; n < len; n++) {
    const a = ring[idx];
    const nx = idx + 1 === N ? 0 : idx + 1;
    out[n] = a;
    ring[idx] = P.decay * 0.5 * (a + ring[nx]);
    idx = nx;
  }
  const fade = Math.floor(sr * 0.08);
  for (let n = 0; n < fade; n++) out[len - 1 - n] *= n / fade;
  b = { buffer, rate: (f * (N + 0.5)) / sr };
  m.set(key, b);
  return b;
}

/**
 * Pluck a string. o: { vel, dur (damped after), slide (semitones up into
 * the note, a 琴's 綽), sway (a 琴's 吟), pan, bus }.
 */
export function pluck(kind, midi, t, o = {}) {
  const c = ctx();
  if (!c || !PLUCK[kind]) return;
  const P = PLUCK[kind];
  const s = stringNote(c, kind, Math.round(midi));
  const src = c.createBufferSource();
  src.buffer = s.buffer;
  const rate = s.rate * Math.pow(2, (midi - Math.round(midi)) / 12);
  const pr = src.playbackRate;
  if (o.slide) {
    pr.setValueAtTime(rate * Math.pow(2, -o.slide / 12), t);
    pr.exponentialRampToValueAtTime(rate, t + 0.16);
  } else pr.setValueAtTime(rate, t);
  const ring = Math.min(s.buffer.duration / rate, o.dur ? o.dur + 0.4 : 99);
  if (o.sway && ring > 0.8) {
    // a slow sway on the note, a few cents each way, coming in after it speaks
    const n = 32;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) curve[i] = rate * Math.pow(2, (Math.sin((i / (n - 1)) * Math.PI * 2 * 3) * 9 * (i / n)) / 1200);
    pr.setValueCurveAtTime(curve, t + 0.3, Math.max(0.3, ring - 0.4));
  }
  const g = c.createGain();
  const v = (o.vel ?? 0.8) * P.gain;
  g.gain.setValueAtTime(v, t);
  if (o.dur) {
    g.gain.setValueAtTime(v, t + o.dur);
    g.gain.setTargetAtTime(0, t + o.dur, 0.07);
  }
  src.connect(g).connect(dest(kind, o));
  src.start(t);
  src.stop(t + ring + 0.05);
}

/** A 琴's harmonic (泛音): a pure, bell-like tone. */
export function harmonic(midi, t, o = {}) {
  const c = ctx();
  if (!c) return;
  const f = mtof(midi);
  const v = (o.vel ?? 0.7) * 0.2;
  const into = dest('guqin', o);
  for (const [r, a, d] of [[1, 1, 2.4], [2, 0.22, 1.2], [3, 0.06, 0.6]]) {
    const osc = c.createOscillator();
    osc.frequency.value = f * r;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * a, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.004, d / 6.9);
    osc.connect(g).connect(into);
    osc.start(t);
    osc.stop(t + d + 0.1);
  }
}

// ── breath and bow ──

/** wave, overtones, breath, the vibrato (fraction of a semitone's worth, and rate), the swell, the loudness. */
const WIND = {
  xiao: { wave: 'sine', parts: [[1, 1], [2, 0.12], [3, 0.04]], breath: 0.22, chiff: 0.25, vib: 12, vibRate: 4.8, attack: 0.13, release: 0.35, gain: 0.3 },
  dizi: { wave: 'triangle', parts: [[1, 1], [2, 0.2], [3, 0.08]], breath: 0.09, chiff: 0.35, vib: 15, vibRate: 5.6, attack: 0.05, release: 0.18, gain: 0.22 },
  xun: { wave: 'sine', parts: [[1, 1], [2, 0.03]], breath: 0.16, chiff: 0.08, vib: 7, vibRate: 4.2, attack: 0.22, release: 0.5, gain: 0.32 },
  sheng: { wave: 'sawtooth', parts: [[1, 1], [1.5, 0.8], [2, 0.6]], breath: 0.03, chiff: 0.05, vib: 3, vibRate: 5, attack: 0.2, release: 0.45, gain: 0.05 },
  suona: { wave: 'sawtooth', parts: [[1, 1]], breath: 0.03, chiff: 0.2, vib: 22, vibRate: 6.2, attack: 0.03, release: 0.12, gain: 0.11 },
  erhu: { wave: 'sawtooth', parts: [[1, 1]], breath: 0.05, chiff: 0.04, vib: 20, vibRate: 5.4, attack: 0.1, release: 0.28, gain: 0.15, glide: true },
};

/** Breathe (or bow) a note. o: { vel, from (a note to glide from), pan, bus }. */
export function blow(kind, midi, t, dur, o = {}) {
  const c = ctx();
  const W = WIND[kind];
  if (!c || !W || !noise()) return;
  const f = mtof(midi);
  const v = (o.vel ?? 0.8) * W.gain;
  const env = c.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(v, t + W.attack);
  env.gain.setValueAtTime(v, t + Math.max(W.attack, dur));
  env.gain.setTargetAtTime(0, t + Math.max(W.attack, dur), W.release / 3);
  const end = t + Math.max(W.attack, dur) + W.release * 2.5;
  env.connect(dest(kind, o));
  // the vibrato: late, gentle, on every partial (in cents, so it scales)
  const lfo = c.createOscillator();
  lfo.frequency.value = W.vibRate * (0.92 + Math.random() * 0.16);
  const depth = c.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(0, t + 0.25);
  depth.gain.linearRampToValueAtTime(W.vib, t + 0.7);
  lfo.connect(depth);
  lfo.start(t);
  lfo.stop(end);
  for (const [r, a] of W.parts) {
    const osc = c.createOscillator();
    osc.type = r === 1 || kind === 'sheng' ? W.wave : 'sine';
    if (o.from && W.glide) {
      osc.frequency.setValueAtTime(mtof(o.from) * r, t);
      osc.frequency.exponentialRampToValueAtTime(f * r, t + 0.09);
    } else osc.frequency.setValueAtTime(f * r, t);
    depth.connect(osc.detune);
    const g = c.createGain();
    g.gain.value = a;
    osc.connect(g).connect(env);
    osc.start(t);
    osc.stop(end);
  }
  // breath: noise round the note, and a puff as it starts
  const n = c.createBufferSource();
  n.buffer = noise();
  n.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f * 1.02;
  bp.Q.value = 2.5;
  const ng = c.createGain();
  ng.gain.value = W.breath;
  n.connect(bp).connect(ng).connect(env);
  if (W.chiff) {
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = Math.min(9000, f * 4);
    const cg = c.createGain();
    cg.gain.setValueAtTime(0, t);
    cg.gain.linearRampToValueAtTime(W.chiff, t + 0.012);
    cg.gain.setTargetAtTime(0, t + 0.02, 0.025);
    n.connect(hp).connect(cg).connect(env);
  }
  n.start(t, Math.random() * 1.5);
  n.stop(end);
}

// ── struck things ──

/** [ratio, loudness, seconds to die away] for each partial. */
const BELL = {
  qing: { parts: [[1, 1, 2.6], [2.32, 0.55, 1.7], [4.25, 0.32, 1.1], [6.63, 0.18, 0.7], [9.38, 0.08, 0.4]], gain: 0.3, tick: 3 },
  zhong: { parts: [[1, 1, 4.2], [1.19, 0.42, 3.2], [2, 0.5, 2.4], [2.68, 0.3, 1.6], [3.29, 0.2, 1.1], [4.6, 0.12, 0.7]], gain: 0.27, tick: 2.2 },
  chime: { parts: [[1, 1, 1.5], [2.76, 0.4, 0.7], [5.4, 0.18, 0.35]], gain: 0.1, tick: 0 },
  gong: { parts: [[1, 1, 2], [1.62, 0.5, 1.4], [2.4, 0.4, 1], [3.1, 0.25, 0.7]], gain: 0.16, tick: 1.5, rise: 0.05 },
};

/** Strike a bell, a stone chime, a gong. */
export function bell(kind, midi, t, o = {}) {
  const c = ctx();
  const B = BELL[kind];
  if (!c || !B) return;
  const f = mtof(midi);
  const v = (o.vel ?? 0.8) * B.gain;
  const into = dest('bell', o);
  for (const [r, a, d] of B.parts) {
    const osc = c.createOscillator();
    osc.frequency.setValueAtTime(f * r, t);
    if (B.rise) osc.frequency.linearRampToValueAtTime(f * r * (1 + B.rise), t + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * a, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.003, d / 6.9);
    osc.connect(g).connect(into);
    osc.start(t);
    osc.stop(t + d + 0.1);
  }
  if (B.tick && noise()) burst(t, { hz: Math.min(9000, f * B.tick), q: 3, vel: v * 0.6, len: 0.012, into });
}

/** A drum, a clapper, a wooden fish, a heartbeat. */
export function drum(kind, t, o = {}) {
  const c = ctx();
  if (!c) return;
  const v = o.vel ?? 0.8;
  const into = dest('drum', o);
  const tone = (from, to, glide, decay, gain, type = 'sine') => {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + glide);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * v, t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.004, decay);
    osc.connect(g).connect(into);
    osc.start(t);
    osc.stop(t + decay * 7 + 0.05);
  };
  if (kind === 'tanggu') {
    tone(155, 74, 0.1, 0.1, 0.9);
    tone(230, 200, 0.05, 0.04, 0.2, 'triangle');
    burst(t, { hz: 1100, q: 0.7, type: 'lowpass', vel: v * 0.35, len: 0.03, into });
  } else if (kind === 'dagu') {
    tone(96, 48, 0.2, 0.24, 1);
    burst(t, { hz: 600, q: 0.7, type: 'lowpass', vel: v * 0.4, len: 0.05, into });
  } else if (kind === 'bangzi') {
    tone(1250, 1250, 0, 0.018, 0.35);
    tone(1880, 1880, 0, 0.012, 0.2);
    burst(t, { hz: 2600, q: 2, vel: v * 0.25, len: 0.006, into });
  } else if (kind === 'muyu') {
    tone(520, 500, 0.04, 0.05, 0.4);
    tone(830, 820, 0.03, 0.03, 0.15);
    burst(t, { hz: 900, q: 2, vel: v * 0.2, len: 0.01, into });
  } else if (kind === 'heart') {
    tone(62, 50, 0.08, 0.06, 0.8);
  }
}

// ── slow and wide ──

/** A held chord that swells and fades (seconds). */
export function pad(midis, t, dur, o = {}) {
  const c = ctx();
  if (!c) return;
  const v = (o.vel ?? 0.7) * 0.045;
  const into = dest('pad', o);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = o.cut || 900;
  lp.Q.value = 0.7;
  const sweep = c.createOscillator();
  sweep.frequency.value = 0.07 + Math.random() * 0.05;
  const sg = c.createGain();
  sg.gain.value = (o.cut || 900) * 0.3;
  sweep.connect(sg).connect(lp.frequency);
  const env = c.createGain();
  const att = Math.min(dur * 0.4, o.attack ?? 2.5);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(v, t + att);
  env.gain.setValueAtTime(v, t + dur);
  env.gain.setTargetAtTime(0, t + dur, (o.release ?? 3) / 3);
  const end = t + dur + (o.release ?? 3) * 2.5;
  lp.connect(env).connect(into);
  sweep.start(t);
  sweep.stop(end);
  for (const m of midis) {
    for (const det of [-7, 7]) {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = mtof(m);
      osc.detune.value = det + (Math.random() - 0.5) * 4;
      osc.connect(lp);
      osc.start(t);
      osc.stop(end);
    }
  }
}

// ── the stuff of effects ──

/** A short burst of filtered noise (a tick, a thud's edge, a drop). */
export function burst(t, o = {}) {
  const c = ctx();
  if (!c || !noise()) return;
  const n = c.createBufferSource();
  n.buffer = noise();
  const f = c.createBiquadFilter();
  f.type = o.type || 'bandpass';
  f.frequency.value = o.hz || 2000;
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  const len = o.len || 0.03;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.vel ?? 0.5, t + Math.min(0.004, len / 3));
  g.gain.setTargetAtTime(0, t + Math.min(0.004, len / 3), len / 2.5);
  n.connect(f).connect(g).connect(o.into || dest('fx', { bus: o.bus || 'sfx', pan: o.pan }));
  n.start(t, Math.random() * 1.5);
  n.stop(t + len * 3 + 0.05);
}

/** Air moving: noise through a band that slides (a swing, a dash, wind past the ear). */
export function whoosh(t, o = {}) {
  const c = ctx();
  if (!c || !noise()) return;
  const dur = o.dur || 0.25;
  const n = c.createBufferSource();
  n.buffer = noise();
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = o.q ?? 1.2;
  f.frequency.setValueAtTime(o.from || 600, t);
  f.frequency.exponentialRampToValueAtTime(o.to || 2400, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.vel ?? 0.4, t + dur * (o.peak ?? 0.35));
  g.gain.linearRampToValueAtTime(0, t + dur);
  n.connect(f).connect(g).connect(o.into || dest('fx', { bus: o.bus || 'sfx', pan: o.pan }));
  n.start(t, Math.random() * 1.5);
  n.stop(t + dur + 0.05);
}

/** A tone that drops (a blow landing, a body hitting the ground) or rises. */
export function sweep(t, o = {}) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  osc.type = o.type || 'sine';
  const dur = o.dur || 0.12;
  osc.frequency.setValueAtTime(o.from || 160, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to || 55), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.vel ?? 0.6, t + (o.attack ?? 0.003));
  g.gain.setTargetAtTime(0, t + (o.attack ?? 0.003), dur / 2.5);
  let into = o.into || dest('fx', { bus: o.bus || 'sfx', pan: o.pan });
  if (o.lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    f.connect(into);
    into = f;
  }
  osc.connect(g).connect(into);
  osc.start(t);
  osc.stop(t + dur * 3 + 0.05);
}

/** Many tiny cracks (a fire, a 符 catching). */
export function crackle(t, o = {}) {
  const n = o.count || 14;
  const dur = o.dur || 0.5;
  for (let k = 0; k < n; k++) {
    const at = t + Math.random() * dur;
    burst(at, { hz: 1500 + Math.random() * 4000, q: 4, vel: (o.vel ?? 0.3) * (0.4 + Math.random() * 0.6), len: 0.004 + Math.random() * 0.006, bus: o.bus, pan: o.pan });
  }
}
