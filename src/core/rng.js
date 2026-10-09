// Seeded randomness. The game's RNG state lives inside the save (s.rng),
// so reloading a save never rerolls an outcome.

function step(x) {
  let t = (x + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [t, ((r ^ (r >>> 14)) >>> 0) / 4294967296];
}

/** Next float in [0,1) from the save's RNG stream. */
export function rand(s) {
  const [next, v] = step(s.rng);
  s.rng = next;
  return v;
}

export function randInt(s, a, b) {
  return a + Math.floor(rand(s) * (b - a + 1));
}

export function chance(s, p) {
  return rand(s) < p;
}

export function pick(s, arr) {
  return arr[Math.floor(rand(s) * arr.length)];
}

/** Pick from items using weight(item); returns null when every weight is 0. */
export function pickWeighted(s, items, weight) {
  let total = 0;
  const ws = items.map((it) => {
    const w = Math.max(0, weight(it));
    total += w;
    return w;
  });
  if (total <= 0) return null;
  let r = rand(s) * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Independent stream for things derived from a seed (art, names) that must not touch the save's stream. */
export function stream(seed) {
  let x = seed | 0;
  const next = () => {
    const [n, v] = step(x);
    x = n;
    return v;
  };
  next.int = (a, b) => a + Math.floor(next() * (b - a + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

/** Stable 32-bit hash of a string, for seeding streams by id. */
export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
