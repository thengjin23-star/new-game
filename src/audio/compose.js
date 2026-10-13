// The music is made as it plays, from rules: the 五聲音階, phrases that
// rise and fall and come home, a breath between them, now and then an echo
// of the phrase before. Pure (a phrase is just numbers), so it can be
// tested, and seeded.

/** 宮 商 角 徵 羽: the five notes, in semitones above the 宮. */
export const PENTA = [0, 2, 4, 7, 9];

/** Each mode's home note, above the 宮: 宮調 bright, 商調 bleak, 角調 strange, 徵調 stately, 羽調 far and low. */
export const MODES = { gong: 0, shang: 2, jue: 4, zhi: 7, yu: 9 };

const mod12 = (n) => ((n % 12) + 12) % 12;

/** The scale's notes (宮 on root) from lo to hi (midi numbers), low to high. */
export function scale(root, lo, hi) {
  const out = [];
  for (let m = lo; m <= hi; m++) if (PENTA.includes(mod12(m - root))) out.push(m);
  return out;
}

/** Is m the mode's home note (in any octave)? */
export function isHome(m, root, mode) {
  return mod12(m - root - MODES[mode]) === 0;
}

/** Is m the home note's fifth (the other place a phrase can rest)? */
export function isFifth(m, root, mode) {
  return mod12(m - root - MODES[mode] - 7) === 0;
}

/** The mode's home note nearest to m. */
export function homeNear(m, root, mode) {
  const h = root + MODES[mode];
  const k = Math.round((m - h) / 12);
  return h + 12 * k;
}

function pickWeighted(table, rng) {
  const entries = Object.entries(table);
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return Number(k);
  }
  return Number(entries[entries.length - 1][0]);
}

const between = (rng, [a, b]) => a + Math.floor(rng() * (b - a + 1));

/**
 * A phrase. P: { root, mode, reg: [lo, hi], len: [min, max] notes,
 * rhythm: { beats: weight }, echo (chance to echo prev), slide, harm,
 * sway, trem (ornament chances) }. Returns { notes: [{ at, dur, midi,
 * vel, slide, harm, sway, trem }], beats }.
 */
export function phrase(P, rng = Math.random, prev = null) {
  const notes = scale(P.root, P.reg[0], P.reg[1]);
  if (!notes.length) return { notes: [], beats: 1 };
  // now and then the phrase before, again, a step or two higher or lower (a motif)
  if (prev && prev.notes.length > 2 && rng() < (P.echo ?? 0.3)) {
    const shift = [-2, -1, 1, 2][Math.floor(rng() * 4)];
    const out = prev.notes.map((n) => {
      const i = notes.indexOf(n.midi);
      const j = Math.max(0, Math.min(notes.length - 1, (i < 0 ? nearest(notes, n.midi) : i) + shift));
      return { ...n, midi: notes[j] };
    });
    settle(out, notes, P);
    return { notes: out, beats: prev.beats, echo: true };
  }
  const len = between(rng, P.len || [4, 7]);
  // start near the middle, on the home note or its fifth
  const mid = (P.reg[0] + P.reg[1]) / 2;
  const homes = notes.filter((m) => isHome(m, P.root, P.mode) || isFifth(m, P.root, P.mode));
  let i = notes.indexOf(homes.length ? homes[nearest(homes, mid)] : notes[nearest(notes, mid)]);
  const out = [];
  let at = 0;
  let lastMove = 0;
  for (let k = 0; k < len; k++) {
    const last = k === len - 1;
    const dur = last ? 2 + Math.floor(rng() * 3) * 0.5 : pickWeighted(P.rhythm || { 0.5: 2, 1: 4, 1.5: 1, 2: 2 }, rng);
    if (k > 0) {
      // up in the first half, down in the second (an arch), mostly by step; after a leap, a step back
      const up = k < len / 2 ? 0.62 : 0.36;
      let move;
      const r = rng();
      if (Math.abs(lastMove) >= 3) move = -Math.sign(lastMove);
      else if (r < 0.08) move = 0;
      else if (r < 0.62) move = 1;
      else if (r < 0.88) move = 2;
      else move = 3 + Math.floor(rng() * 2);
      if (move && rng() > up) move = -move;
      i = Math.max(0, Math.min(notes.length - 1, i + move));
      lastMove = move;
    }
    const big = dur >= 1.5;
    out.push({
      at,
      dur,
      midi: notes[i],
      vel: 0.62 + rng() * 0.25 + (k === 0 ? 0.08 : 0),
      slide: big && rng() < (P.slide || 0) ? 1 + Math.floor(rng() * 2) : 0,
      harm: rng() < (P.harm || 0),
      sway: big && rng() < (P.sway || 0),
      trem: big && rng() < (P.trem || 0),
    });
    at += dur;
  }
  settle(out, notes, P);
  return { notes: out, beats: at };
}

/** A phrase ends on the home note (or, sometimes, its fifth), the nearest one. */
function settle(out, notes, P) {
  const last = out[out.length - 1];
  if (!last) return;
  if (isHome(last.midi, P.root, P.mode) || isFifth(last.midi, P.root, P.mode)) return;
  const homes = notes.filter((m) => isHome(m, P.root, P.mode) || isFifth(m, P.root, P.mode));
  if (homes.length) last.midi = homes[nearest(homes, last.midi)];
  last.harm = false;
}

function nearest(list, m) {
  let best = 0;
  for (let k = 1; k < list.length; k++) if (Math.abs(list[k] - m) < Math.abs(list[best] - m)) best = k;
  return best;
}

/** What goes under a phrase: the home note low (or its fifth), held. P.bassReg: [lo, hi]. */
export function ground(P, rng = Math.random) {
  const [lo, hi] = P.bassReg || [P.reg[0] - 12, P.reg[0]];
  const notes = scale(P.root, lo, hi);
  const homes = notes.filter((m) => isHome(m, P.root, P.mode));
  const fifths = notes.filter((m) => isFifth(m, P.root, P.mode));
  const pool = rng() < 0.72 || !fifths.length ? homes : fifths;
  return (pool.length ? pool : notes)[Math.floor(rng() * (pool.length || notes.length))];
}
