// 手感 (0.20): what the screen does as blows land. The fight (world/combat.js)
// only says what landed and how hard (C.hits); here that becomes a moment's
// stop as a blow bites, a shake of the world (never of the buttons), a red
// edge as you are hurt, and the world slowing as the last of them falls.
// Layered: a plain blow barely stops anything, a heavy one or a telling one
// more, a kill more again — and none of it long enough to get between you and
// what you do next (the world still runs, slowly, through a stop; what you
// press is taken at once). The player can turn the shake down, or off, and the
// stops off (系統 → 戰鬥手感).

const KEY = 'yijie-feel';

/** How much the world shakes, by the player's choice. */
export const SHAKE_LEVELS = [
  ['strong', '強', 1.5],
  ['normal', '標準', 1],
  ['weak', '弱', 0.5],
  ['off', '關', 0],
];

/** The player's choices (kept on this device). Asked for less motion: no shaking unless chosen. */
export function feelSettings() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    saved = null;
  }
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { shake: still ? 'off' : 'normal', stop: true, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function setFeel(patch) {
  const next = { ...feelSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: it holds for this visit */
  }
  return next;
}

/**
 * What each kind of landing does: [stop (seconds the world all but stands),
 * shake (pixels)]. A blow's share of the beast's blood adds to its shake.
 */
const WEIGHT = {
  strike: [0.02, 0],
  array: [0, 0],
  skill: [0.035, 1.6],
  heavy: [0.06, 2.6],
  crit: [0.075, 3.4],
  kill: [0.07, 3],
  block: [0, 1.2],
  dodge: [0, 0],
  phase: [0, 5],
};

/** The world during a stop: barely moving (not quite still, so nothing waits on it). */
const STOP_PACE = 0.04;

/**
 * The feel of a fight, for one screen. canvases(): what to shake (the
 * world and what is drawn over it — never the buttons); edge: the red rim.
 * Each frame, frame(C, dt) takes in what landed and says how fast the world
 * should run this frame (1 as usual).
 */
export function createFeel({ canvases, edge }) {
  const seen = new WeakSet();
  let set = feelSettings();
  let stop = 0;
  let quietUntil = 0;
  let slow = 0;
  let slowPace = 1;
  let amp = 0;
  let red = 0;
  let clock = 0;
  let shaken = false;
  let reddened = -1;
  const phase = Math.random() * 10;

  function take(h) {
    const k = SHAKE_LEVELS.find(([id]) => id === set.shake)?.[2] ?? 1;
    let [st, sh] = WEIGHT[h.kind] || [0, 0];
    if (h.kind === 'hurt') {
      // the harder it hurt, the more the world reels (and the redder the edge)
      st = h.share > 0.12 ? 0.05 : 0;
      sh = 1.5 + Math.min(8, 22 * h.share);
      red = Math.max(red, Math.min(0.9, 0.3 + 2.6 * h.share));
    } else if (h.kind === 'kill') {
      if (h.boss) {
        st = 0.16;
        sh = 8;
        slow = Math.max(slow, 0.9);
        slowPace = 0.28;
      } else if (h.last) {
        // the last of them: the world slows as it falls
        slow = Math.max(slow, 0.45);
        slowPace = 0.35;
      }
      if (h.soft) [st, sh] = [st * 0.5, sh * 0.5];
    } else if (h.share) sh += Math.min(3, h.share * 10);
    if (h.boss && h.kind !== 'kill' && h.kind !== 'hurt') sh *= 0.8;
    if (set.stop && st > 0) {
      // (a light stop right after another is let go: blow on blow should not stutter)
      if (st >= 0.05 || clock >= quietUntil) stop = Math.max(stop, st);
    }
    amp = Math.max(amp, sh * k);
  }

  return {
    /** The player changed their mind (系統 → 戰鬥手感). */
    reload() {
      set = feelSettings();
    },

    frame(C, dt) {
      clock += dt;
      for (const h of C.hits) {
        if (seen.has(h)) continue;
        seen.add(h);
        take(h);
      }
      if (!set.stop) slow = 0;
      // how fast the world runs this frame
      let pace = 1;
      if (stop > 0) {
        stop -= dt;
        pace = STOP_PACE;
        if (stop <= 0) quietUntil = clock + 0.12;
      } else if (slow > 0) {
        slow -= dt;
        // (easing back in as it ends — and never faster than the world runs)
        const left = Math.max(0, slow);
        pace = left > 0.15 ? slowPace : slowPace + (1 - slowPace) * (1 - left / 0.15);
      }
      // the shake: quick, dying away
      amp *= Math.exp(-dt * 15);
      const list = canvases();
      if (amp > 0.3) {
        const x = amp * Math.sin(clock * 91 + phase);
        const y = amp * 0.8 * Math.cos(clock * 77 + phase * 1.7);
        // (grown a little, so no edge of the page shows as it moves)
        const grow = 1 + (2 * amp + 2) / 360;
        for (const c of list) c.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${grow.toFixed(3)})`;
        shaken = true;
      } else if (shaken) {
        for (const c of list) c.style.transform = '';
        shaken = false;
      }
      // the red edge of being hurt, fading
      red *= Math.exp(-dt * 3);
      const r = red > 0.02 ? Math.round(red * 100) / 100 : 0;
      if (edge && r !== reddened) {
        edge.style.opacity = String(r);
        reddened = r;
      }
      return pace;
    },

    /** Nothing in a fight any more (a page opened, the fight over): everything back still. */
    calm() {
      stop = 0;
      slow = 0;
      amp = 0;
      red = 0;
      if (shaken) for (const c of canvases()) c.style.transform = '';
      shaken = false;
      if (edge && reddened !== 0) edge.style.opacity = '0';
      reddened = 0;
    },
  };
}
