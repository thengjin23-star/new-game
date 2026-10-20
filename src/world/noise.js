// Noise for the lie of the land: the same numbers for the same place, every
// time. Kept apart from terrain.js so a map's own data (maps/*.js) can use it
// without pulling in the built world.

export function hash2(i, j, salt = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(salt | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function vnoise(x, y, salt = 0) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j, salt);
  const b = hash2(i + 1, j, salt);
  const c = hash2(i, j + 1, salt);
  const d = hash2(i + 1, j + 1, salt);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, salt = 0) {
  return 0.55 * vnoise(x, y, salt) + 0.3 * vnoise(x * 2.1, y * 2.1, salt + 7) + 0.15 * vnoise(x * 4.3, y * 4.3, salt + 13);
}
