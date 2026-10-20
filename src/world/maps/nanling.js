// 南嶺・青竹一帶: south of 東荒, over the pass in the hills beyond 鎮南田野.
// Close country: towers of karst rock standing up out of the jungle, a
// stream that falls over a cliff into a green pool, a marsh of reeds and
// standing water to the south-west, a valley ringed by cliffs where nobody
// goes, and up on its terraces a village of bamboo. Everything here is this
// map's own (world/atlas.js puts it in place when you cross over); the
// region ids are its own too, so the tables kept by region elsewhere (who
// stands where, what grows, what music plays) hold 南嶺's entries beside
// 東荒's.

import { T } from '../geo.js';
import { fbm } from '../noise.js';

// ── the land ──

/** Regions, in priority order (the first shape containing a cell owns it). */
const REGION_SHAPES = [
  // behind the falls: found, not walked into
  { id: 'water_cave', circle: [3905, 3292, 64], requires: 'falls_cave_found' },
  { id: 'ling_pass', poly: [[2420, 0], [2840, 0], [2860, 660], [2400, 660]] },
  { id: 'qingzhu_village', poly: [[2720, 800], [3520, 780], [3580, 1400], [2760, 1440]] },
  { id: 'wangu_valley', ellipse: [4250, 1950, 470, 520] },
  { id: 'jade_pool', poly: [[3320, 2980], [4320, 2960], [4360, 3820], [3260, 3840]] },
  { id: 'poison_marsh', poly: [[260, 3000], [2300, 2960], [2480, 4260], [280, 4300]] },
  { id: 'miasma_forest', poly: [[200, 680], [2300, 660], [2520, 1500], [2420, 2920], [240, 2960]] },
  { id: 'nanling_wilds', default: true },
];

/** Towers of rock (喀斯特 peaks): [cx, cy, rx, ry]. */
const PEAKS = [
  // either side of the pass
  [2200, 430, 190, 250],
  [3070, 470, 210, 250],
  // in the jungle
  [820, 1250, 140, 170],
  [1560, 1080, 120, 130],
  [1500, 2120, 150, 130],
  [650, 2420, 130, 150],
  [1980, 2550, 110, 120],
  // the middle country
  [2900, 1900, 140, 120],
  [2520, 2250, 100, 110],
  [3320, 2500, 110, 100],
  [2950, 2950, 120, 110],
  // the east
  [4800, 900, 200, 300],
  [4700, 2950, 210, 200],
  [4650, 3950, 230, 190],
  [3900, 900, 160, 130],
  // the south
  [3000, 4120, 240, 140],
  [1250, 4170, 220, 130],
  [2100, 3300, 110, 100],
];

/** 萬蠱谷: walled by cliffs, open only at its gorge on the west side, where its stream comes out. */
const VALLEY = { cx: 4250, cy: 1950, rx: 470, ry: 520, ring: 0.14, gorge: [3760, 2080], gorgeHalf: 0.24 };

/** The falls: the stream drops over this cliff into 碧潭 (the high side is north). */
const CLIFF_LINES = [[[3560, 3262], [4180, 3236], 34]];

/** Lakes: [cx, cy, rx, ry, level?]. 0: the pool in 萬蠱谷; 1: 碧潭 under the falls; 2–6: the marsh. */
const LAKES = [
  [4230, 1930, 92, 62],
  [3840, 3520, 170, 118],
  [1480, 3640, 250, 150],
  [880, 3380, 140, 88],
  [1080, 3930, 160, 96],
  [1920, 4010, 118, 78],
  [560, 3800, 118, 86],
];

/** 碧水: out of 萬蠱谷 by the gorge, over the falls into 碧潭; on from 碧潭 west into the marsh. */
const RIVERS = [
  { id: 'bishui', width: 46, from: 0, toLake: 1, pts: [[4210, 1940], [3990, 2010], [3760, 2090], [3600, 2290], [3610, 2640], [3740, 2950], [3850, 3180], [3866, 3320], [3846, 3460]] },
  { id: 'bishui_low', width: 50, from: 1, toLake: 2, pts: [[3700, 3600], [3320, 3760], [2820, 3730], [2340, 3680], [1940, 3660], [1700, 3650]] },
];

/** Paths: the pass down to the village, out from it every way; bridges where they cross water. */
const ROADS = [
  // over the pass: down from the hills to 青竹寨
  { kind: 'trail', width: 34, pts: [[2620, 30], [2610, 300], [2650, 600], [2770, 820], [2900, 990], [3080, 1090]] },
  // the village street
  { kind: 'lane', width: 32, pts: [[2860, 1150], [3060, 1140], [3360, 1120]] },
  // south from the village, by the stream, round the end of the falls to 碧潭
  { kind: 'trail', width: 30, pts: [[3100, 1300], [3150, 1700], [3330, 2080], [3480, 2420], [3470, 2800], [3420, 3150], [3430, 3380], [3560, 3560], [3660, 3640]] },
  // into the gorge of 萬蠱谷
  { kind: 'trail', width: 26, pts: [[3330, 2080], [3560, 2120], [3720, 2140], [3850, 2120]] },
  // west into 瘴林, to the old altar
  { kind: 'trail', width: 28, pts: [[2770, 1200], [2420, 1380], [2000, 1480], [1500, 1600], [1080, 1720], [820, 1850]] },
  // from the jungle down to the marsh
  { kind: 'trail', width: 26, pts: [[1500, 1600], [1360, 2050], [1200, 2600], [1180, 3000], [1240, 3300]] },
  // along the stream from 碧潭 into the marsh
  { kind: 'trail', width: 26, pts: [[3560, 3560], [3200, 3560], [2700, 3540], [2300, 3470], [1900, 3420], [1500, 3360], [1240, 3300]] },
  // the stepping-stones across the low stream, below the falls
  { kind: 'pier', width: 26, pts: [[2580, 3600], [2600, 3790]] },
];

/** The edge of the map: mountains all round; the pass is cut through them at the top. */
const BORDER = { north: 170, west: 150, south: 4370, east: 5050, gaps: [{ side: 'north', at: 2615, half: 170, depth: 360 }] };

/** The lie of the land: high in the north and the east, falling to the marsh in the south-west. */
const UPLAND = [
  [2600, 300, 210, 320], [1200, 520, 185, 420], [4000, 480, 190, 420],
  [3060, 1100, 124, 300], [1150, 1500, 128, 420], [2150, 1800, 104, 380],
  [3400, 2200, 112, 340], [4250, 1950, 142, 300], [4700, 1500, 168, 300],
  [3850, 2900, 108, 260], [3850, 3560, 44, 260], [1200, 2600, 70, 420],
  [1350, 3700, 12, 460], [2400, 3700, 28, 340], [3000, 4150, 40, 300],
  [4500, 3900, 62, 340], [650, 4100, 16, 300],
];

export const NANLING_GEO = {
  REGION_SHAPES, PEAKS, AIRY: [], CLIFF_LINES, VALLEY, SECT: null, RIVERS, LAKES, ROADS, MARKET_WALL: null, BORDER,
  EDGE_RIVER: null, RIVER_REGION: null, HOME_REGION: 'nanling_wilds', REACH_FROM: [3080, 1100], UPLAND,
};

// ── what grows on it, and how it lies (by region; merged into the tables kept elsewhere) ──

/** The ground of each region (terrain.js BASE). */
const ground = {
  ling_pass: (x, y) => (fbm(x / 140, y / 140, 601) > 0.55 ? T.HILL : T.GRASS),
  qingzhu_village: (x, y) => (fbm(x / 150, y / 150, 602) > 0.63 ? T.FARM : T.GRASS),
  wangu_valley: (x, y) => (fbm(x / 160, y / 160, 603) > 0.5 ? T.FOREST : T.TALLGRASS),
  jade_pool: (x, y) => (fbm(x / 170, y / 170, 604) > 0.56 ? T.FOREST : T.GRASS),
  poison_marsh: (x, y) => {
    const n = fbm(x / 150, y / 150, 605);
    return n > 0.56 ? T.TALLGRASS : n < 0.38 ? T.SAND : T.GRASS;
  },
  miasma_forest: (x, y) => (fbm(x / 240, y / 240, 606) > 0.46 ? T.DEEP : T.FOREST),
  water_cave: () => T.GRASS,
  nanling_wilds: (x, y) => {
    const n = fbm(x / 300, y / 300, 607);
    const m = fbm(x / 170, y / 170, 608);
    if (n > 0.58) return T.FOREST;
    if (m > 0.62) return T.TALLGRASS;
    if (n < 0.33) return T.HILL;
    return T.GRASS;
  },
};

/** Which trees (terrain.js TREE_MIX). */
const trees = {
  ling_pass: [['pine', 70], ['leaf', 30]],
  qingzhu_village: [['bamboo', 65], ['leaf', 35]],
  wangu_valley: [['dark', 60], ['dead', 20], ['leaf', 20]],
  jade_pool: [['bamboo', 35], ['leaf', 45], ['willow', 20]],
  poison_marsh: [['willow', 45], ['dead', 35], ['leaf', 20]],
  miasma_forest: [['dark', 45], ['bamboo', 25], ['leaf', 30]],
  water_cave: [['bamboo', 100]],
  nanling_wilds: [['leaf', 50], ['bamboo', 30], ['pine', 20]],
};

/** Settled ground sits level (height.js SETTLED): [height, roll]. */
const settled = { qingzhu_village: [124, 4] };

/** How much wild ground rolls (height.js ROLL). */
const roll = { nanling_wilds: 24, ling_pass: 20, miasma_forest: 18, poison_marsh: 4, wangu_valley: 8, jade_pool: 12, water_cave: 8 };

/** What each region sounds like (audio/director.js PLACE). */
const sound = {
  ling_pass: 'hill', qingzhu_village: 'village', miasma_forest: 'jungle', poison_marsh: 'marsh',
  wangu_valley: 'gu', jade_pool: 'falls', water_cave: 'cave', nanling_wilds: 'nanwilds',
};

/** The air of each region in the 3D world (art/world3d.js MOODS): the haze it tints, how dim, what drifts. */
const moods = {
  miasma_forest: { tint: [0.62, 0.7, 0.42], amount: 0.48, dim: 0.84, motes: 'darkleaf' },
  poison_marsh: { tint: [0.6, 0.66, 0.5], amount: 0.4, dim: 0.9, motes: null },
  wangu_valley: { tint: [0.62, 0.55, 0.62], amount: 0.42, dim: 0.85, motes: 'ash' },
  jade_pool: { tint: [0.78, 0.9, 0.88], amount: 0.32, dim: 1, motes: 'mote' },
  water_cave: { tint: [0.62, 0.7, 0.72], amount: 0.3, dim: 0.9, motes: null },
  qingzhu_village: { tint: [0.86, 0.92, 0.84], amount: 0.15, dim: 1, motes: null },
  nanling_wilds: { tint: [0.78, 0.86, 0.78], amount: 0.2, dim: 0.97, motes: null },
};

export const NANLING_LAND = { ground, trees, settled, roll, sound, moods };

// ── places ──

/**
 * The regions as places (map.js NODES). Nobody in 東荒 has been here, so
 * none is known before you cross; the pass is what you see first.
 */
export const NANLING_NODES = {
  ling_pass: {
    name: '嶺口', kind: 'pass', qi: 0.8, danger: 1, at: [2640, 560], label: [2640, 420],
    desc: '翻過山隘，山勢一路往南低下去。霧從底下的林子裡升上來，帶著一股說不清的甜腥味。',
  },
  qingzhu_village: {
    name: '青竹寨', kind: 'town', qi: 0.9, danger: 0, at: [3080, 1100], label: [3120, 960],
    desc: '半山腰的竹寨，吊腳樓一層一層疊上去。寨子裡的人養蠱、採藥，也打獵。對外人客氣，但不親近。',
  },
  miasma_forest: {
    name: '瘴林', kind: 'forest', qi: 1.1, danger: 3, secludeRisk: 0.4, at: [1500, 1600], label: [1300, 1400],
    desc: '終年瘴氣不散的老林子。白天也是昏的，空氣又濕又甜，吸久了頭會發暈。',
  },
  poison_marsh: {
    name: '毒沼', kind: 'marsh', qi: 1.0, danger: 3, secludeRisk: 0.3, at: [1240, 3300], label: [1300, 3500],
    desc: '一望無際的蘆葦和死水。水面上浮著油亮的光，底下咕嘟咕嘟地冒泡。',
  },
  wangu_valley: {
    name: '萬蠱谷', kind: 'valley', qi: 1.3, danger: 4, secludeRisk: 0.6, at: [3860, 2110], label: [4250, 1760],
    desc: '四面峭壁的深谷，只有西邊一道峽口。寨子裡的人說，谷裡養著一窩誰也不敢碰的東西。',
  },
  jade_pool: {
    name: '碧潭', kind: 'lake', qi: 1.2, danger: 2, secludeRisk: 0.1, at: [3660, 3640], label: [3840, 3700],
    desc: '碧水從斷崖上直落下來，砸進一潭深綠的水裡。水聲大得說話都要用喊的。',
  },
  water_cave: {
    name: '水簾洞', kind: 'cave', qi: 1.7, danger: 0, at: [3905, 3300],
    desc: '瀑布後面的石洞。水簾把外面隔成一片白，洞裡卻乾燥、清涼，石壁上刻著字。',
  },
  nanling_wilds: {
    name: '南嶺山野', kind: 'wilds', qi: 0.9, danger: 2, secludeRisk: 0.25, at: [3330, 2080], label: [2700, 2050],
    desc: '石峰一根一根從林子裡拔起來，像插在地上的筍。山路在峰與峰之間繞來繞去。',
  },
};

/** Buildings, places to walk up to, and what roams (places.js STRUCTURES / POIS / BEASTS, for this map). */
const STRUCTURES = [
  // 青竹寨: the elder's house at the top of the street, houses up and down the slope
  { x: 3080, y: 1020, w: 160, h: 86, sprite: 'mansion', name: '寨老' },
  { x: 2890, y: 1070, w: 70, h: 44, sprite: 'house' },
  { x: 3250, y: 1050, w: 70, h: 44, sprite: 'house' },
  { x: 3400, y: 1060, w: 64, h: 42, sprite: 'house' },
  { x: 2900, y: 1230, w: 70, h: 44, sprite: 'house' },
  { x: 3190, y: 1222, w: 90, h: 50, sprite: 'shop', name: '百藥鋪' },
  { x: 3330, y: 1215, w: 70, h: 44, sprite: 'house' },
  { x: 3040, y: 1300, w: 54, h: 38, sprite: 'hut' },
  { x: 2780, y: 1150, w: 44, h: 36, sprite: 'shrine_small', name: '山神' },
  // the boundary stone at the top of the pass
  { x: 2560, y: 230, w: 30, h: 22, sprite: 'stele', block: false },
];

const POIS = [
  {
    id: 'ling_pass_gate', region: 'ling_pass', x: 2615, y: 92, name: '山隘', verb: '翻回東荒',
    text: '山隘那頭，是東荒。',
  },
];

const BEASTS = [];

export const NANLING_PLACES = { STRUCTURES, POIS, BEASTS };
