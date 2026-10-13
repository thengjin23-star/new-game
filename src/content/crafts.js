// 修仙百藝 (0.15): what you can make yourself. 丹方 (what goes into the
// furnace, and what comes out), the 符 you can draw (each with the strokes
// of its glyph), what refining a piece of gear takes, and the 聚靈陣 that
// makes a cave a 洞府.

/**
 * 丹方. in: herbs and the rest, by count; out: the pill and how many (at
 * 中品; 上品 gives one more, 下品 one fewer); mp: 靈力 to hold the fire;
 * zone: how wide the sweet spot of the fire is (narrower: harder);
 * book: a 丹方 you must have read first; min: the least grade that makes it.
 */
export const RECIPES = {
  juqi_pill: { in: { ningqi_grass: 3 }, out: 2, mp: 8, zone: 0.26 },
  heal_pill: { in: { zhixue_grass: 2, blood_ginseng: 1 }, out: 2, mp: 8, zone: 0.24 },
  detox_pill: { in: { snake_gall: 1, zhixue_grass: 1 }, out: 2, mp: 6, zone: 0.26 },
  qingxin_pill: { in: { ziyun_zhi: 1, ningqi_grass: 2 }, out: 1, mp: 12, zone: 0.2 },
  zhuji_pill: { in: { ziyun_zhi: 2, blood_ginseng: 2, beast_core: 3, lake_pearl: 1 }, out: 1, mp: 30, zone: 0.14, book: 'book_zhuji_recipe', min: 2 },
};

/**
 * The 符 you can draw: 靈力 for each, and the glyph — strokes in a unit
 * square, each a list of points (drawn in order, each stroke without
 * lifting the brush). Made from a few curves, so a hand can follow them.
 */
const arc = (cx, cy, r, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, k) => {
  const a = a0 + ((a1 - a0) * k) / n;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});
const line = (x0, y0, x1, y1, n = 8) => Array.from({ length: n + 1 }, (_, k) => [x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
const wave = (x0, x1, y, amp, waves, n = 24) => Array.from({ length: n + 1 }, (_, k) => {
  const t = k / n;
  return [x0 + (x1 - x0) * t, y + Math.sin(t * Math.PI * 2 * waves) * amp];
});
const spiral = (cx, cy, r0, r1, turns, n = 40) => Array.from({ length: n + 1 }, (_, k) => {
  const t = k / n;
  const a = -Math.PI / 2 + t * Math.PI * 2 * turns;
  const r = r0 + (r1 - r0) * t;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});

export const GLYPHS = {
  // 火符: a flame — a tall stroke and two that lick up beside it
  fire_talisman: { mp: 6, strokes: [line(0.5, 0.9, 0.5, 0.15), arc(0.32, 0.55, 0.2, Math.PI * 0.5, Math.PI * 1.35, 10), arc(0.68, 0.55, 0.2, Math.PI * 0.5, -Math.PI * 0.35, 10)] },
  // 金光符: a ring, and a cross through it
  gold_talisman: { mp: 8, strokes: [arc(0.5, 0.5, 0.32, -Math.PI / 2, Math.PI * 1.5, 24), line(0.5, 0.12, 0.5, 0.88), line(0.12, 0.5, 0.88, 0.5)] },
  // 驅邪符: a lightning zigzag under a bar
  exorcise_talisman: { mp: 5, strokes: [line(0.2, 0.18, 0.8, 0.18), [[0.62, 0.28], [0.38, 0.5], [0.6, 0.55], [0.36, 0.86]]] },
  // 神行符: an arrow flying right, and the wind under it
  swift_talisman: { mp: 5, strokes: [line(0.15, 0.45, 0.85, 0.45), [[0.65, 0.28], [0.85, 0.45], [0.65, 0.62]], wave(0.2, 0.8, 0.75, 0.05, 2)] },
  // 斂息符: a spiral drawing inward (a breath held)
  hide_talisman: { mp: 6, strokes: [spiral(0.5, 0.5, 0.38, 0.05, 2.2)] },
  // 避瘴符: three waves of clean air
  miasma_talisman: { mp: 4, strokes: [wave(0.15, 0.85, 0.3, 0.06, 2), wave(0.15, 0.85, 0.5, 0.06, 2), wave(0.15, 0.85, 0.7, 0.06, 2)] },
  // 御風符: a swirl rising out of a line
  wind_talisman: { mp: 10, strokes: [line(0.15, 0.85, 0.85, 0.85), spiral(0.5, 0.45, 0.05, 0.3, 1.4)] },
  // 歸元符: a square spiral home
  return_talisman: { mp: 10, strokes: [[[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85], [0.15, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7], [0.3, 0.45], [0.55, 0.45]]] },
};

/** One 符紙 and one 硃砂 for each 符 you draw (failed or not). */
export const DRAW_COST = { fu_paper: 1, cinnabar: 1 };

/**
 * Refining a piece of gear at the 百煉坊 (up to +3): each level, its gifts
 * a share stronger. What it takes, by the level it goes to.
 */
export const REFINE = {
  max: 3,
  each: 0.15,
  cost: [
    null,
    { ls: 60, items: { beast_core: 1 } },
    { ls: 150, items: { beast_core: 2 } },
    { ls: 320, items: { beast_core: 3, lightning_wood: 1 } },
  ],
};

/** The 聚靈陣 in your 洞府: what each level takes, and how much 靈氣 it draws in. */
export const ARRAY = [
  null,
  { ls: 120, items: { beast_core: 2 }, qi: 0.3 },
  { ls: 360, items: { beast_core: 4, lightning_wood: 1 }, qi: 0.6 },
  { ls: 900, items: { beast_core: 6, xuanyin_stone: 1, lake_pearl: 1 }, qi: 1.0 },
];
