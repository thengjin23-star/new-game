// 西漠・月泉一帶: west of 東荒, out through 西風口 past 古戰場. Sand. A
// pass at the foot of the mountains where a fort stands empty (落日關); a
// spring in the dunes the shape of a new moon, and the caravans that come
// and go by it (月泉); a stony waste the caravan road crosses, where
// bandits keep a fort of mud (黑戈壁); sand that swallows what stands on it,
// where the old sea's last 蛟 swims (流沙); a canyon with a temple in it
// whose monks died sitting (沙陀寺); and far in the north-west, half under
// the dunes, a city older than any book (沉沙古城) — and under that, what
// it kept (地宮). Everything here is this map's own (world/atlas.js puts it
// in place when you cross over); the region ids are its own too.

import { T } from '../geo.js';
import { fbm } from '../noise.js';

// ── the land ──

/** The spring (月泉): a crescent of small pools along an arc, horns to the north. Each [cx, cy, rx, ry, level]. */
const SPRING_LEVEL = 14;
const SPRING = [
  [3720, 1985, 74, 34],
  [3636, 1964, 58, 30],
  [3804, 1964, 58, 30],
  [3578, 1914, 40, 25],
  [3862, 1914, 40, 25],
  [3552, 1862, 26, 18],
  [3888, 1862, 26, 18],
].map(([x, y, rx, ry]) => [x, y, rx, ry, SPRING_LEVEL]);

/** Quicksand in 流沙: [cx, cy, r] (the ground there is 流沙; walk in, and you sink). */
export const QUICKSAND = [
  [620, 1960, 150], [1020, 1820, 130], [1500, 2040, 150], [700, 2520, 160],
  [1420, 2640, 140], [940, 2880, 140], [1640, 2860, 130], [430, 2260, 120],
];

/** Regions, in priority order (the first shape containing a cell owns it). */
const REGION_SHAPES = [
  // under the 觀星台: found, not walked into
  { id: 'underpalace', circle: [950, 520, 64], requires: 'palace_open' },
  // up where no road goes (see AIRY)
  { id: 'wanghe_terrace', ellipse: [2960, 1860, 92, 68] },
  { id: 'luori_pass', poly: [[4500, 1380], [5200, 1380], [5200, 1960], [4480, 1960]] },
  { id: 'yuequan', poly: [[3150, 1250], [4250, 1230], [4320, 2180], [3200, 2220]] },
  { id: 'shatuo_temple', ellipse: [2700, 3620, 430, 380] },
  { id: 'gobi', poly: [[1850, 880], [3150, 840], [3200, 2050], [1900, 2100]] },
  { id: 'lost_city', poly: [[220, 220], [1700, 200], [1760, 1180], [240, 1240]] },
  { id: 'quicksand', poly: [[240, 1660], [1820, 1600], [1940, 3020], [280, 3100]] },
  { id: 'ximo_wilds', default: true },
];

/** Rock that stands up out of the sand: [cx, cy, rx, ry]. */
const PEAKS = [
  // either side of the way down from the mountains
  [4720, 1180, 200, 150],
  [4760, 2140, 210, 150],
  // 黑戈壁's mesas
  [2140, 1050, 110, 90],
  [3010, 1120, 100, 80],
  [2320, 1900, 90, 80],
  // (望河臺's mesa: its flat top is cut out of it, AIRY)
  [2960, 1860, 190, 150],
  // round the city: the old shore, gone to rock
  [1900, 520, 130, 160],
  [160, 1500, 120, 140],
  // 魔鬼城: rock the wind has cut into rows, out in the south-east
  [4300, 3000, 60, 140],
  [4460, 3160, 50, 120],
  [4150, 3260, 70, 110],
  [4560, 2900, 55, 130],
  [4360, 3420, 60, 100],
  [4020, 3060, 45, 90],
  // the south and the west
  [1400, 3850, 220, 140],
  [600, 3500, 160, 180],
  [3600, 4050, 240, 150],
  [4800, 3700, 200, 220],
  [2050, 2650, 110, 90],
];

/** 沙陀寺: a canyon walled by cliffs, open only at its gorge to the north, where the path comes down. */
const VALLEY = { cx: 2700, cy: 3620, rx: 430, ry: 380, ring: 0.16, gorge: [2700, 3200], gorgeHalf: 0.28 };

/** Paths: down from the mountains to the spring, the caravan road west, out to the fort, the city, the temple. */
const ROADS = [
  // 古道: down from the gap past 落日關 to the spring
  { kind: 'trail', width: 34, pts: [[5190, 1650], [4880, 1660], [4560, 1700], [4300, 1720], [4060, 1716]] },
  // 月泉's street, along the north of the spring
  { kind: 'lane', width: 30, pts: [[4060, 1716], [3900, 1700], [3720, 1690], [3540, 1700], [3380, 1730]] },
  // 駝道: the caravan road west across 黑戈壁, between the city and the quicksand, to where the sand runs on
  { kind: 'trail', width: 36, pts: [[3380, 1730], [3150, 1640], [2900, 1540], [2560, 1470], [2200, 1440], [1800, 1430], [1300, 1440], [800, 1450], [300, 1440], [20, 1440]] },
  // up to the bandits' fort
  { kind: 'trail', width: 26, pts: [[2560, 1470], [2560, 1320], [2560, 1160]] },
  // north into 沉沙古城, to the foot of the 觀星台
  { kind: 'trail', width: 28, pts: [[1300, 1440], [1200, 1260], [1080, 1000], [960, 760]] },
  // the city's old avenues, half under the sand
  { kind: 'lane', width: 30, pts: [[460, 700], [700, 690], [950, 700], [1200, 690], [1460, 700]] },
  { kind: 'lane', width: 30, pts: [[950, 300], [960, 520], [950, 700], [960, 900], [960, 1120]] },
  // south from the road, between the mesas, to 沙陀寺's gorge and down into it
  { kind: 'trail', width: 28, pts: [[2600, 1480], [2610, 1800], [2650, 2200], [2700, 2700], [2720, 3150], [2700, 3420], [2700, 3560]] },
];

/** The edge of the map: mountains all round; the way in from the east, and the caravan road out to the west. */
const BORDER = {
  north: 170, west: 150, south: 4370, east: 5050,
  gaps: [{ side: 'east', at: 1650, half: 170, depth: 360 }, { side: 'west', at: 1440, half: 150, depth: 300 }],
};

/**
 * The lie of the land: the mountains high in the east, the spring in a
 * hollow, 流沙 the lowest of all (it was the floor of the 西海), the city
 * on what was its shore.
 */
const UPLAND = [
  [4900, 1650, 140, 320], [3720, 1800, 18, 260], [2550, 1450, 62, 420], [950, 700, 76, 420],
  [1050, 2350, 6, 520], [2700, 3620, 30, 300], [4100, 3300, 56, 600], [1500, 3700, 44, 500],
  [3400, 600, 84, 520], [4300, 2400, 60, 380], [2300, 2600, 40, 360],
];

/** The flat top of a mesa in 黑戈壁 (望河臺), where only the flying come; level: how high its ground stands. */
const AIRY = [{ id: 'wanghe_terrace', kind: 'summit', at: [2960, 1860], r: [92, 68], level: 250 }];

export const XIMO_GEO = {
  REGION_SHAPES,
  PEAKS, AIRY, CLIFF_LINES: [], VALLEY, SECT: null, RIVERS: [], LAKES: SPRING, ROADS, MARKET_WALL: [2400, 980, 2720, 1240], WALL_LOOK: { mud: true, name: '禿鷲寨' }, BORDER,
  EDGE_RIVER: null, RIVER_REGION: null, HOME_REGION: 'ximo_wilds', REACH_FROM: [3720, 1690], UPLAND,
};

const inQuick = (x, y) => QUICKSAND.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r * (0.92 + 0.16 * fbm(x / 60, y / 60, 731)));

// ── what grows on it, and how it lies (by region; merged into the tables kept elsewhere) ──

/** The ground of each region (terrain.js BASE). */
const ground = {
  luori_pass: (x, y) => {
    const n = fbm(x / 140, y / 140, 701);
    return n > 0.6 ? T.HILL : n < 0.42 ? T.DUNE : T.WASTE;
  },
  yuequan: (x, y) => {
    const n = fbm(x / 120, y / 120, 702);
    // green round the spring, sand further off
    const d = Math.hypot((x - 3720) / 520, (y - 1840) / 360);
    if (d > 1 + (n - 0.5) * 0.5) return T.DUNE;
    return n > 0.62 ? T.TALLGRASS : n < 0.3 ? T.FARM : T.GRASS;
  },
  gobi: (x, y) => (fbm(x / 160, y / 160, 703) > 0.62 ? T.HILL : fbm(x / 90, y / 90, 704) > 0.7 ? T.DUNE : T.WASTE),
  lost_city: (x, y) => (fbm(x / 150, y / 150, 705) > 0.55 ? T.SAND : T.DUNE),
  quicksand: (x, y) => (inQuick(x, y) ? T.QUICK : T.DUNE),
  shatuo_temple: (x, y) => (fbm(x / 110, y / 110, 706) > 0.6 ? T.DUNE : T.WASTE),
  underpalace: () => T.WASTE,
  wanghe_terrace: () => T.WASTE,
  ximo_wilds: (x, y) => {
    const n = fbm(x / 260, y / 260, 707);
    if (n < 0.3) return T.WASTE;
    return T.DUNE;
  },
};

/** Which trees (terrain.js TREE_MIX): 胡楊 by the water, 紅柳 where there is a little. */
const trees = {
  luori_pass: [['dead', 60], ['tamarisk', 40]],
  yuequan: [['poplar', 70], ['tamarisk', 30]],
  gobi: [['tamarisk', 60], ['dead', 40]],
  lost_city: [['deadpoplar', 100]],
  quicksand: [['deadpoplar', 100]],
  shatuo_temple: [['poplar', 40], ['deadpoplar', 60]],
  wanghe_terrace: [['dead', 100]],
  ximo_wilds: [['deadpoplar', 60], ['tamarisk', 40]],
};

/** Settled ground sits level (height.js SETTLED): [height, roll]. */
const settled = { yuequan: [22, 3] };

/** How much wild ground rolls (height.js ROLL), and how high the dunes stand on it (height.js DUNES). */
const roll = { luori_pass: 26, gobi: 16, lost_city: 10, quicksand: 5, shatuo_temple: 6, underpalace: 4, ximo_wilds: 30 };
const dunes = { ximo_wilds: 24, quicksand: 12, lost_city: 10, yuequan: 6, luori_pass: 8 };

/** Under a mountain, the ground is the land's (art/worldview.js): sand and stone, not grass. */
const under = { luori_pass: T.WASTE, yuequan: T.DUNE, gobi: T.WASTE, lost_city: T.DUNE, quicksand: T.DUNE, shatuo_temple: T.WASTE, wanghe_terrace: T.WASTE, ximo_wilds: T.DUNE };

/** Dry country (world/weather.js ARID): no rain falls and no mist lies; what would be rain is a wind full of sand, and a clear noon is a furnace. */
const arid = { luori_pass: 1, yuequan: 1, gobi: 1, lost_city: 1, quicksand: 1, shatuo_temple: 1, wanghe_terrace: 1, ximo_wilds: 1 };

/** The oasis grows its 胡楊 thick; the city lies strewn with what is left of it (terrain.js GROVE, STREWN). */
const grove = { yuequan: 0.1, shatuo_temple: 0.04 };
const strewn = { lost_city: [['ruin', 0.05], ['pillar', 0.02], ['bones', 0.008]], gobi: [['bones', 0.004]] };

/** What each region sounds like (audio/director.js PLACE). */
const sound = {
  luori_pass: 'fort', yuequan: 'oasis', gobi: 'gobi', quicksand: 'desert', shatuo_temple: 'deadtemple',
  lost_city: 'lostcity', underpalace: 'tomb', wanghe_terrace: 'peak', ximo_wilds: 'desert',
};

export const XIMO_LAND_BASE = { ground, trees, settled, roll, dunes, under, arid, grove, strewn, sound };

// ── places ──

/** The regions as places (map.js NODES). Nobody in 東荒 has been here; the fort at the foot of the mountains is what you see first. */
export const XIMO_NODES = {
  luori_pass: {
    name: '落日關', kind: 'pass', qi: 0.7, danger: 1, at: [4820, 1700], label: [4820, 1500],
    desc: '山口下的一座土城，城門朝西，城頭上的旗早就沒了。再往西，就只剩沙。',
  },
  yuequan: {
    name: '月泉', kind: 'town', qi: 1.2, danger: 0, at: [3720, 1700], label: [3720, 1560],
    desc: '沙丘環抱著的一彎泉水，形狀像初三的月亮，千百年來不乾不涸。駝隊在這裡歇腳，泉邊就長出了一個小小的集。',
  },
  gobi: {
    name: '黑戈壁', kind: 'waste', qi: 0.6, danger: 3, secludeRisk: 0.3, at: [2560, 1470], label: [2600, 1720],
    desc: '一望無際的黑石子地，太陽一曬，石子燙得能烙餅。駝道從中間穿過去；北邊的土堡裡，住著一夥沙盜。',
  },
  quicksand: {
    name: '流沙', kind: 'desert', qi: 0.7, danger: 4, secludeRisk: 0.5, at: [1100, 1720], label: [1100, 2300],
    desc: '駝道南邊一大片低窪的沙地。看著和別處的沙一樣，一腳踩下去，就再也拔不出來。駝隊寧可繞三天的路。',
  },
  shatuo_temple: {
    name: '沙陀寺', kind: 'ruins', qi: 1.3, danger: 3, secludeRisk: 0.5, at: [2700, 3520], label: [2700, 3330],
    desc: '峽谷裡的一座古寺。六十年前，寺裡的和尚一夜之間全死了，死的時候都坐著。從那以後，再也沒人敢進去。',
  },
  lost_city: {
    name: '沉沙古城', kind: 'ruins', qi: 1.4, danger: 4, secludeRisk: 0.4, at: [960, 800], label: [950, 330],
    desc: '沙海深處，一座埋了大半的古城。城牆只露出垛口，街巷被沙填平了，只剩城中央一座高台還立著。沒人知道它叫什麼名字。',
  },
  underpalace: {
    name: '地宮', kind: 'cave', qi: 1.8, danger: 0, at: [950, 520],
    desc: '觀星台底下的石室。沙子進不來，風也進不來；穹頂上嵌著一片星圖，在黑暗裡微微發亮。',
  },
  wanghe_terrace: {
    name: '望河臺', kind: 'peak', air: true, qi: 1.5, danger: 0, at: [2960, 1860],
    desc: '黑戈壁裡最高的一座石台，頂上平得像一張桌子，只有飛得上去。台面上刻著一道一道的線，全指著天。',
  },
  ximo_wilds: {
    name: '沙海', kind: 'desert', qi: 0.6, danger: 3, secludeRisk: 0.35, at: [3720, 2600], label: [4000, 2750],
    desc: '沙丘一道接著一道，像凝住的浪。白天燙得落不了腳，夜裡冷得結霜。風一起，沙丘就挪了地方。',
  },
};

const XIMO_STRUCTURES = [];
const XIMO_POIS = [
  { id: 'luori_gate', region: 'luori_pass', x: 5150, y: 1650, name: '山口', verb: '回東荒', text: '山口那頭，是東荒。' },
];
const XIMO_BEASTS = [];

export const XIMO_PLACES = { STRUCTURES: XIMO_STRUCTURES, POIS: XIMO_POIS, BEASTS: XIMO_BEASTS };
export const XIMO_PEOPLE = {};
export const XIMO_LAND = { ...XIMO_LAND_BASE };
