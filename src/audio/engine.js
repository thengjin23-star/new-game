// 聲音 (0.13): one AudioContext for the whole game, made on the first touch
// (a browser will not let a page make a sound before that). Three buses —
// music, ambience, effects — each with its own volume, all into a soft
// limiter. The music and the effects also send to a little reverb (a stone
// hall, a valley): most of what makes a plucked string sound like a 琴 and
// not a toy. Every sound is made here, by the program: no sound files.
//
// Nothing here runs without a browser: under node (the tests) there is no
// AudioContext and every call is a quiet no-op.

const KEY = 'yijie-sound';
const DEFAULTS = { music: 0.65, amb: 0.65, sfx: 0.8, mute: false, buzz: true };

const A = { ctx: null, bus: null, noise: null, live: false, wanted: true, listeners: new Set() };

/** The player's sound settings (kept on this device). */
export function settings() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    saved = null;
  }
  return { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

/** Change a setting or two; the buses follow at once. */
export function setSettings(patch) {
  const next = { ...settings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: it holds for this visit */
  }
  applyLevels(next);
  return next;
}

/** The context, once there is one (null before the first touch, and under node). */
export function ctx() {
  return A.ctx;
}

/** Can a sound be made right now? */
export function ready() {
  return !!A.bus && (!A.live || A.ctx.state === 'running');
}

/** A bus to play into: 'music' | 'amb' | 'sfx'. */
export function bus(name) {
  return A.bus?.[name] || null;
}

/** Two seconds of white noise, shared by everything that hisses, blows or splashes. */
export function noise() {
  return A.noise;
}

/** Tell me when the sound comes on (the first touch), so music can start then. */
export function onReady(fn) {
  A.listeners.add(fn);
  if (A.bus && ready()) fn();
  return () => A.listeners.delete(fn);
}

function levelOf(set, name) {
  if (set.mute) return 0;
  // (a level is felt on a curve: half the slider is well under half the loudness)
  const v = Math.max(0, Math.min(1, set[name]));
  return v * v;
}

function applyLevels(set = settings()) {
  if (!A.bus) return;
  const t = A.ctx.currentTime;
  for (const name of ['music', 'amb', 'sfx']) A.bus[`${name}Vol`].gain.setTargetAtTime(levelOf(set, name) * BUS_GAIN[name], t, 0.08);
}

const BUS_GAIN = { music: 0.9, amb: 0.8, sfx: 1 };

/**
 * Build the buses on a context: a live one, or an OfflineAudioContext (to
 * hear — that is, to measure — how something sounds without a speaker).
 */
export function attach(context, { live = true } = {}) {
  A.ctx = context;
  A.live = live;
  const c = context;
  const g = (v = 1) => {
    const n = c.createGain();
    n.gain.value = v;
    return n;
  };
  // the end of the line: everything meets here, and a limiter keeps it from clipping
  const master = g(1);
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 8;
  comp.ratio.value = 8;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;
  const out = g(0.92);
  master.connect(comp).connect(out).connect(c.destination);
  // the reverb: a short, dark hall, made from noise that dies away
  const verb = c.createConvolver();
  verb.buffer = impulse(c, 2.2);
  const verbOut = g(0.55);
  verb.connect(verbOut).connect(master);
  const set = settings();
  const bus = { master, verb };
  for (const [name, send] of [['music', 0.38], ['amb', 0.08], ['sfx', 0.16]]) {
    const input = g(1);
    const vol = g(levelOf(set, name) * BUS_GAIN[name]);
    const duck = g(1);
    input.connect(vol).connect(duck).connect(master);
    const wet = g(send);
    duck.connect(wet).connect(verb);
    bus[name] = input;
    bus[`${name}Vol`] = vol;
    bus[`${name}Duck`] = duck;
  }
  // the ambience can be muffled (snow, fog, seclusion) by a filter on its way out
  const muffle = c.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 18000;
  muffle.Q.value = 0.4;
  bus.amb.disconnect();
  bus.amb.connect(muffle).connect(bus.ambVol);
  bus.ambMuffle = muffle;
  A.bus = bus;
  A.noise = whiteNoise(c, 2);
  return bus;
}

/** Lower (or bring back) a bus for a while: the music under a story, under a fight. */
export function duck(name, level, secs = 0.6) {
  if (!A.bus) return;
  A.bus[`${name}Duck`].gain.setTargetAtTime(level, A.ctx.currentTime, secs / 3);
}

/** Muffle the ambience (cutoff in Hz; high: clear). */
export function muffle(hz, secs = 1.5) {
  if (!A.bus) return;
  A.bus.ambMuffle.frequency.setTargetAtTime(hz, A.ctx.currentTime, secs / 3);
}

function impulse(c, secs) {
  const sr = c.sampleRate;
  const len = Math.floor(sr * secs);
  const buf = c.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // darker as it dies (the air takes the highs first)
      const k = 0.9 - 0.75 * Math.min(1, t / secs);
      lp += ((Math.random() * 2 - 1) - lp) * k;
      // a few early reflections, then the tail
      const early = t < 0.08 ? (Math.random() < 0.004 ? 1.6 : 0) : 0;
      d[i] = (lp + early * (Math.random() - 0.5)) * Math.exp(-t * 3.1) * (t < 0.006 ? t / 0.006 : 1);
    }
  }
  return buf;
}

function whiteNoise(c, secs) {
  const len = Math.floor(c.sampleRate * secs);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Start the sound on the first touch (or key), and keep it in step with
 * the page: quiet while it is hidden, back when it shows again.
 */
export function unlockOn(target = typeof window !== 'undefined' ? window : null) {
  if (!target || typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const go = () => {
    if (!A.ctx) {
      try {
        attach(new AC({ latencyHint: 'interactive' }));
      } catch {
        return;
      }
    }
    if (A.ctx.state !== 'running' && document.visibilityState === 'visible') {
      A.ctx.resume().then(fire, () => {});
    } else fire();
  };
  const fire = () => {
    if (A.ctx?.state === 'running') for (const fn of A.listeners) fn();
  };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) target.addEventListener(ev, go, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx || !A.live) return;
    if (document.visibilityState === 'visible') A.ctx.resume().catch(() => {});
    else A.ctx.suspend().catch(() => {});
  });
}

/** A short buzz of the phone (where it can, and the player wants it). */
export function buzz(pattern) {
  if (!settings().buzz) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not here */
  }
}
