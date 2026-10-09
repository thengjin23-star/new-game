import { power } from './cultivation.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Probability that a check succeeds. kind: power | gengu | wuxing | xinxing | jiyuan */
export function checkChance(s, check, ctx) {
  const diff = typeof check.diff === 'function' ? check.diff(s, ctx) : check.diff;
  if (check.kind === 'power') {
    const P = power(s);
    return clamp((P * P) / (P * P + diff * diff), 0.03, 0.97);
  }
  const v = s.player.attrs[check.kind] ?? 5;
  let p = 0.5 + (v - diff) * 0.1;
  if (check.kind === 'xinxing') p += (s.player.mind - 50) / 500;
  return clamp(p, 0.05, 0.95);
}

export const CHECK_NAME = { power: '戰力', gengu: '根骨', wuxing: '悟性', xinxing: '心性', jiyuan: '機緣' };
