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
  [3720, 2000, 84, 36],
  [3628, 1976, 64, 32],
  [3812, 1976, 64, 32],
  [3566, 1924, 44, 27],
  [3874, 1924, 44, 27],
  [3540, 1866, 28, 19],
  [3900, 1866, 28, 19],
].map(([x, y, rx, ry]) => [x, y, rx, ry, SPRING_LEVEL]);

/** Quicksand in 流沙: [cx, cy, r] (the ground there is 流沙; walk in, and you sink). */
export const QUICKSAND = [
  [620, 1960, 150], [1020, 1820, 130], [1500, 2040, 150], [700, 2520, 160],
  [1420, 2640, 140], [940, 2880, 140], [1640, 2860, 130], [430, 2260, 120],
];

/** Regions, in priority order (the first shape containing a cell owns it). */
const REGION_SHAPES = [
  // under the 觀星台: found, not walked into
  { id: 'underpalace', circle: [950, 440, 60], requires: 'palace_open' },
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
  // north into 沉沙古城, through its south gate
  { kind: 'trail', width: 28, pts: [[1300, 1440], [1200, 1300], [1040, 1180], [958, 1120]] },
  // the city's old avenues, half under the sand: across in front of the 觀星台, and down from it to the south gate
  { kind: 'lane', width: 30, pts: [[460, 720], [700, 712], [950, 722], [1200, 712], [1460, 720]] },
  { kind: 'lane', width: 30, pts: [[956, 722], [962, 900], [958, 1120]] },
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
    // green round the spring, melon fields either side of it, packed sand where the town stands, dunes beyond
    const d = Math.hypot((x - 3720) / 360, (y - 1900) / 230);
    if (d < 0.78 + (n - 0.5) * 0.4) return n > 0.6 ? T.TALLGRASS : T.GRASS;
    if (d < 1.2 + (n - 0.5) * 0.3 && y > 1790) return n > 0.58 ? T.FARM : T.GRASS;
    if (y < 1790 && x > 3330 && x < 4130) return n > 0.66 ? T.GRASS : T.SAND;
    return T.DUNE;
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

/** Where the noon sun and a sandstorm do not wear on you (world/explore.js exposure): the town, the fort, the canyon, under the ground. */
const shade = { yuequan: 1, luori_pass: 1, shatuo_temple: 1, underpalace: 1 };

export const XIMO_LAND_BASE = { ground, trees, settled, roll, dunes, under, arid, grove, strewn, sound, shade };

/** The desert's own ground colours (art/worldview.js): dark gravel for its stony waste, dry grass, sandy hills. */
export const XIMO_PALETTE = {
  [T.WASTE]: { all: [128, 116, 100] },
  [T.HILL]: { all: [186, 160, 120] },
  [T.GRASS]: { spring: [172, 180, 128], summer: [164, 172, 116], autumn: [194, 178, 118], winter: [204, 198, 176] },
  [T.TALLGRASS]: { spring: [150, 162, 104], summer: [142, 152, 96], autumn: [186, 160, 96], winter: [196, 186, 160] },
  [T.FARM]: { spring: [150, 176, 104], summer: [136, 166, 90], autumn: [206, 178, 96], winter: [200, 190, 166] },
  [T.SAND]: { all: [214, 194, 152] },
};

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
    name: '沉沙古城', kind: 'ruins', qi: 1.4, danger: 4, secludeRisk: 0.4, at: [958, 1080], label: [950, 330],
    desc: '沙海深處，一座埋了大半的古城。城牆只露出垛口，街巷被沙填平了，只剩城中央一座高台還立著。沒人知道它叫什麼名字。',
  },
  underpalace: {
    name: '地宮', kind: 'cave', qi: 1.8, danger: 0, at: [950, 440],
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

/** Buildings, places to walk up to, and what roams (places.js STRUCTURES / POIS / BEASTS, for this map). */
const STRUCTURES = [
  // 落日關: the fort the garrison left, its beacon tower, the stone at the foot of the pass
  { x: 4800, y: 1560, w: 170, h: 70, sprite: 'fort', name: '落日關', landmark: true },
  { x: 4610, y: 1470, w: 34, h: 34, sprite: 'beacon', landmark: true },
  { x: 5000, y: 1706, w: 18, h: 8, sprite: 'stele', block: false, name: '落日關' },
  // 月泉: the post-house, houses of mud brick along the north of the spring, a caravan's tents to the east
  { x: 3720, y: 1615, w: 130, h: 60, sprite: 'adobe' },
  { x: 3520, y: 1625, w: 64, h: 40, sprite: 'adobe' },
  { x: 3920, y: 1625, w: 64, h: 40, sprite: 'adobe' },
  { x: 3415, y: 1632, w: 56, h: 38, sprite: 'adobe' },
  { x: 4030, y: 1640, w: 56, h: 38, sprite: 'adobe' },
  { x: 3592, y: 1540, w: 50, h: 34, sprite: 'adobe' },
  { x: 3852, y: 1545, w: 50, h: 34, sprite: 'adobe' },
  { x: 3655, y: 1740, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 3790, y: 1742, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 4062, y: 1862, w: 50, h: 30, sprite: 'tent' },
  { x: 4120, y: 1940, w: 50, h: 30, sprite: 'tent' },
  { x: 4020, y: 2010, w: 50, h: 30, sprite: 'tent' },
  { x: 3360, y: 1880, w: 26, h: 18, sprite: 'bigpoplar', landmark: true },
  { x: 4110, y: 1676, w: 18, h: 8, sprite: 'stele', block: false, name: '月泉' },
  // 黑戈壁: inside the bandits' walls, mud houses, a tent, a lookout
  { x: 2480, y: 1060, w: 60, h: 40, sprite: 'adobe' },
  { x: 2650, y: 1068, w: 56, h: 38, sprite: 'adobe' },
  { x: 2500, y: 1170, w: 50, h: 30, sprite: 'tent' },
  { x: 2670, y: 1170, w: 30, h: 30, sprite: 'beacon' },
  // 沙陀寺: the hall, its stupa, the monks' cells; the stone at the head of the gorge
  { x: 2700, y: 3700, w: 130, h: 70, sprite: 'hall', name: '沙陀寺', landmark: true },
  { x: 2950, y: 3620, w: 40, h: 40, sprite: 'pagoda', landmark: true },
  { x: 2470, y: 3630, w: 70, h: 40, sprite: 'adobe' },
  { x: 2480, y: 3760, w: 70, h: 40, sprite: 'adobe' },
  { x: 2700, y: 3300, w: 18, h: 8, sprite: 'stele', block: false, name: '沙陀寺' },
  // 沉沙古城: what stands of its walls, and in the middle the 觀星台, with a paved court behind it
  { x: 950, y: 440, w: 130, h: 110, paint: T.PAVED },
  { x: 950, y: 610, w: 150, h: 100, sprite: 'observatory', landmark: true },
  { x: 520, y: 296, w: 170, h: 26, sprite: 'ruinwall' },
  { x: 790, y: 292, w: 120, h: 26, sprite: 'ruinwall' },
  { x: 1150, y: 296, w: 190, h: 26, sprite: 'ruinwall' },
  { x: 1420, y: 306, w: 110, h: 26, sprite: 'ruinwall' },
  { x: 540, y: 1150, w: 170, h: 26, sprite: 'ruinwall' },
  { x: 770, y: 1156, w: 90, h: 26, sprite: 'ruinwall' },
  { x: 1150, y: 1150, w: 160, h: 26, sprite: 'ruinwall' },
  { x: 1400, y: 1144, w: 110, h: 26, sprite: 'ruinwall' },
  { x: 420, y: 560, w: 26, h: 160, sprite: 'ruinwall' },
  { x: 430, y: 900, w: 26, h: 120, sprite: 'ruinwall' },
  { x: 1500, y: 520, w: 26, h: 130, sprite: 'ruinwall' },
  { x: 1510, y: 880, w: 26, h: 150, sprite: 'ruinwall' },
];

const lit = (s) => s.tod >= 19 || s.tod < 5;

/** Quicksand: walk into one and you sink (content/events/ximo.js). */
const QUICK_POIS = QUICKSAND.map(([x, y, r], k) => ({ id: `qs_${'abcdefgh'[k]}`, region: 'quicksand', x, y, name: '流沙', zone: r, auto: r }));

/** Places you can walk up to (places.js POIS, for this map). */
const POIS = [
  // 落日關
  { id: 'luori_gate', region: 'luori_pass', x: 5150, y: 1650, name: '山口', verb: '回東荒', text: '山口那頭，是東荒。' },
  {
    id: 'luori_fort', region: 'luori_pass', x: 4800, y: 1612, name: '關城', verb: '歇腳', rest: true,
    text: '城門洞裡陰涼。牆上刻滿了名字，有的刻得深，有的刻得淺，最早的一個，已經認不出來了。',
  },
  { id: 'beacon_fire', region: 'luori_pass', x: 4610, y: 1510, name: '烽燧', verb: '查看', glow: lit, text: '烽燧頂上堆著乾柴，用石頭壓著，一根也沒有濕。' },
  // 月泉
  {
    id: 'yq_spring', region: 'yuequan', x: 3720, y: 1925, name: '月泉', verb: '查看', rest: true,
    text: '泉水清得看得見底下的沙，沙裡一顆一顆的黑石子，像星星。泉的兩頭彎彎地翹起來，真像一彎新月。',
  },
  { id: 'yq_inn', region: 'yuequan', x: 3720, y: 1668, name: '月泉驛', verb: '打聽', action: 'inquire', glow: lit },
  { id: 'yq_store', region: 'yuequan', x: 3812, y: 1668, name: '雜貨', verb: '購物', action: 'shop', shop: 'yuequan' },
  { id: 'yq_caravan', region: 'yuequan', x: 4010, y: 1940, name: '駝隊貨攤', verb: '購物', action: 'shop', shop: 'caravan' },
  // 黑戈壁: the way into the bandits' fort; what they left on the road
  {
    id: 'bandit_gate', region: 'gobi', x: 2560, y: 1290, name: '禿鷲寨', verb: '上前',
    text: (s) => (s.flags.vulture_done ? '寨門開著，裡面空空蕩蕩。風把一面破旗吹得啪啪響。' : '土牆有兩丈高，牆頭上插著削尖的木樁。門關著，牆頭有人影一晃。'),
  },
  {
    id: 'dead_caravan', region: 'gobi', x: 2200, y: 1478, name: '倒斃的駝隊', verb: '查看',
    text: '幾具駱駝的骨架半埋在沙裡，散了一地的貨箱，箱子全被撬開了。',
  },
  // 流沙: the old 蛟's hollow; the sand that swallows
  {
    id: 'jiao_lair', region: 'quicksand', x: 1100, y: 2350, name: '沙渦', verb: '查看',
    text: (s) => ((s.vars.kills?.sand_jiao || 0) > 0 ? '沙渦平了。風吹過去，什麼也沒有。' : '沙地中間陷下去一個大坑，坑底的沙慢慢地轉，像一口不見底的井。坑邊上，有一截白森森的骨頭。'),
  },
  ...QUICK_POIS,
  // 沙陀寺
  {
    id: 'shatuo_hall', region: 'shatuo_temple', x: 2700, y: 3745, name: '大殿', verb: '進殿',
    text: (s) => (s.flags.shatuo_rest ? '殿裡打掃過了。佛前點著一盞小小的油燈，了空坐在燈下唸經。' : '殿門半開，裡面黑沉沉的。一排一排的蒲團上，坐著一排一排的人，一動不動。'),
  },
  {
    id: 'shatuo_caves', region: 'shatuo_temple', x: 2640, y: 3950, name: '千佛窟', verb: '查看', sprite: 'cave',
    text: '崖壁上鑿出一排石窟，窟裡的佛像有的缺了手，有的沒了頭，壁上的彩畫被風沙磨得只剩淡淡的影子。',
  },
  {
    id: 'shatuo_stupa', region: 'shatuo_temple', x: 2950, y: 3660, name: '舍利塔', verb: '查看',
    text: '塔不高，塔門用泥封著。泥上按著一個手印，乾裂了。',
  },
  // 沉沙古城: five steles; the gate behind the 觀星台; under it, the chamber
  { id: 'stele_city', region: 'lost_city', x: 1060, y: 1080, name: '城碑', verb: '查看', sprite: 'stele', text: '石碑上的字，你已經讀過了。' },
  { id: 'stele_ferry', region: 'lost_city', x: 560, y: 790, name: '渡碑', verb: '查看', sprite: 'stele', text: '石碑上的字，你已經讀過了。' },
  { id: 'stele_star', region: 'lost_city', x: 1360, y: 800, name: '星官碑', verb: '查看', sprite: 'stele', text: '石碑上的字，你已經讀過了。' },
  { id: 'stele_break', region: 'lost_city', x: 640, y: 440, name: '斷河碑', verb: '查看', sprite: 'stele', text: '石碑上的字，你已經讀過了。' },
  { id: 'stele_farewell', region: 'lost_city', x: 1290, y: 450, name: '辭城碑', verb: '查看', sprite: 'stele', text: '石碑上的字，你已經讀過了。' },
  {
    id: 'star_gate', region: 'lost_city', x: 950, y: 528, name: '星門', verb: '查看',
    text: (s) => (s.flags.palace_open ? '石門開著，往下的台階一級一級沒進黑暗裡。' : '觀星台背後，一扇半埋在沙裡的石門。門上刻著一片星圖，星與星之間連著線。'),
  },
  {
    id: 'palace_bier', region: 'underpalace', x: 950, y: 418, name: '星官石台', verb: '查看', rest: true,
    show: (s) => !!s.flags.palace_open,
    text: '石台上空了。穹頂的星圖在黑暗裡微微發亮，這裡很靜，靜得能聽見自己的心跳。這裡適合閉關。',
  },
  // 望河臺: lines cut into the top of the mesa, all pointing at the sky
  { id: 'wanghe_lines', region: 'wanghe_terrace', x: 2960, y: 1850, name: '刻線', verb: '參悟', sprite: 'sword_scar', text: '台面上的刻線，一道一道，全指著天上同一個地方。' },
  // 沙海
  { id: 'yq_sing', region: 'ximo_wilds', x: 3720, y: 2390, name: '鳴沙', verb: '聆聽', text: '沙丘的背風面又陡又滑。風從沙丘頂上吹過去的時候，沙子會唱歌。' },
  { id: 'yardang_wind', region: 'ximo_wilds', x: 4330, y: 3200, name: '魔鬼城', verb: '聆聽', text: '一排一排的土台，被風削成了城牆、樓閣、人的模樣。風從縫裡穿過去，嗚嗚地響，像有人在哭。' },
  { id: 'west_road_end', region: 'ximo_wilds', x: 90, y: 1440, name: '西去的駝道', verb: '眺望', text: '駝道往西，一直沒進黃沙裡。再往西，是駝隊才走得到的地方——康老大說，要走半年。' },
  // small things found off the road
  { id: 'find_xm_skull', region: 'ximo_wilds', x: 3220, y: 2900, name: '駝骨', verb: '查看', hidden: { r: 90 }, treasure: { text: '一副駱駝的骨架，半埋在沙丘背後。肋骨底下壓著一個羊皮口袋，口袋裡是幾塊靈石，和一株曬乾的鎖陽。\n\n不知道牠的主人，最後走到了哪裡。', effects: [['ls', 30], ['item', 'suoyang', 1]] } },
  { id: 'find_xm_jar', region: 'ximo_wilds', x: 4500, y: 2520, name: '里程石', verb: '查看', hidden: { r: 90 }, treasure: { text: '一塊倒在沙裡的里程石，上面刻著「西去接天城　二百里」。石頭底下埋著一個陶罐，罐裡是一把古錢，和幾塊溫潤的靈石。\n\n接天城？你沒聽過這個名字。', effects: [['ls', 45], ['flag', 'heard_jietian'], ['sysexp', 8]] } },
  { id: 'find_xm_poplar', region: 'ximo_wilds', x: 2200, y: 3000, name: '刻字的枯胡楊', verb: '查看', hidden: { r: 90 }, treasure: { text: '一棵死了不知多少年的胡楊，樹幹上刻著兩個名字，中間一顆心。刻痕被風沙磨得很淺了，還認得出。\n\n胡楊活著一千年不死，死了一千年不倒，倒了一千年不朽。刻名字的人，大概也是這麼想的。', effects: [['mind', 4], ['insight', 1]] } },
  { id: 'find_xm_cache', region: 'gobi', x: 2060, y: 1760, name: '石堆', verb: '查看', hidden: { r: 90 }, treasure: { text: '一堆壘得整整齊齊的石頭，底下藏著一個油布包：幾瓶丹藥，一袋靈石。大概是哪個沙盜偷偷攢下的。', effects: [['ls', 40], ['item', 'heal_pill', 2]] } },
];

const dark = (s) => s.tod >= 19.5 || s.tod < 5;
const killed = (s, kind) => (s.vars.kills?.[kind] || 0) > 0;

/**
 * What roams (places.js BEASTS, for this map): 沙蠍 under the sand of 黑戈壁 and the 沙海; 沙狼 out on
 * the dunes; 禿鷲寨's men on the caravan road below their fort, and their master inside it (they talk
 * first; once he is dealt with, they are gone); the dead monks of 沙陀寺 up and walking by night (until
 * they are at rest), and their abbot before his hall; the old 蛟 in its hollow in 流沙 (once killed, gone
 * for good); stone guards along the avenue of 沉沙古城. (The 石翁仲 at the 星門 is the steles' story's.)
 */
const BEASTS = [
  { id: 'scorpions_a', kind: 'scorpion', n: 3, title: '沙蠍', x: 2150, y: 1720, r: 140, respawn: 20, power: 110 },
  { id: 'scorpions_b', kind: 'scorpion', n: 3, title: '沙蠍', x: 3300, y: 2700, r: 150, respawn: 20, power: 110 },
  { id: 'scorpions_c', kind: 'scorpion', n: 2, title: '沙蠍', x: 4100, y: 2650, r: 130, respawn: 20, power: 96 },
  { id: 'sand_wolves_a', kind: 'sand_wolf', n: 3, title: '沙狼', x: 3800, y: 3300, r: 160, respawn: 30, power: 180 },
  { id: 'sand_wolves_b', kind: 'sand_wolf', n: 3, title: '沙狼', x: 1700, y: 3500, r: 160, respawn: 30, power: 180 },
  { id: 'sand_bandits_a', kind: 'sand_bandit', n: 3, title: '沙盜', x: 2330, y: 1480, r: 170, event: 'xm_bandits', respawn: 20, power: 120, cond: (s) => !s.flags.vulture_done },
  { id: 'vulture_a', kind: 'vulture', title: '禿鷲', x: 2570, y: 1120, r: 110, event: 'xm_vulture', respawn: 999, power: 230, cond: (s) => !s.flags.vulture_done },
  { id: 'mummies_a', kind: 'mummy', n: 3, title: '乾屍', x: 2640, y: 3460, r: 150, respawn: 5, power: 100, cond: (s) => dark(s) && !s.flags.shatuo_rest },
  { id: 'kuchan_a', kind: 'kuchan', title: '枯禪', x: 2700, y: 3790, r: 90, respawn: 999, power: 240, cond: (s) => dark(s) && !killed(s, 'kuchan') },
  { id: 'sand_jiao_a', kind: 'sand_jiao', title: '沙蛟', x: 1100, y: 2350, r: 140, respawn: 999, power: 260, cond: (s) => !killed(s, 'sand_jiao') },
  { id: 'stone_puppets_a', kind: 'stone_puppet', n: 2, title: '石傀', x: 660, y: 760, r: 120, respawn: 15, power: 160 },
  { id: 'stone_puppets_b', kind: 'stone_puppet', n: 2, title: '石傀', x: 1240, y: 760, r: 120, respawn: 15, power: 160 },
];

export const XIMO_PLACES = { STRUCTURES, POIS, BEASTS };

// ── who lives here ──

/** The people of 西漠 (world/npcs.js NAMED). Nobody here has heard of you. */
export const XIMO_PEOPLE = {
  lao_qin: {
    name: '老秦', title: '守燧人', gender: '男', age: 72, realm: 0, stage: 0, loc: 'luori_pass',
    bio: '落日關的最後一個兵。四十年前朝廷撤了關，他沒走：烽燧總得有人點。每天傍晚，他都爬上烽燧，看一眼西邊，再看一眼東邊。',
  },
  kang_tuotou: {
    name: '康駝頭', title: '駝隊的頭', gender: '男', age: 52, realm: 1, stage: 5, loc: 'yuequan',
    bio: '從更西邊來的胡商，鼻樑高，眼窩深，說一口帶腔調的官話。一年走兩趟沙海，手下三十頭駱駝。精明，但說話算話。',
  },
  yue_niang: {
    name: '月娘', title: '月泉驛的老闆娘', gender: '女', age: 41, realm: 0, stage: 0, loc: 'yuequan',
    bio: '月泉邊上那間驛站的老闆娘。丈夫十年前跟著駝隊出去，沒有回來。她一個人守著驛站，給來來往往的人煮茶、補鞋、指路。',
  },
  song_fuzi: {
    name: '宋夫子', title: '抄碑的老書生', gender: '男', age: 67, realm: 0, stage: 0, loc: 'yuequan',
    bio: '中州來的老書生。三十年前為了看一眼沉沙古城的碑，跟著駝隊進了沙海，就再沒回去。他抄了一屋子的碑文，一個字也不認得。',
  },
  liao_kong: {
    name: '了空', title: '老和尚', gender: '男', age: 81, realm: 1, stage: 2, loc: 'yuequan',
    bio: '月泉西頭那棵老胡楊底下坐著的老和尚，每天對著西南邊唸經。六十年前，他是沙陀寺的小沙彌。',
  },
};

// ── the rest of how it lives (by region; merged into the tables kept elsewhere) ──

/** Which herbs grow where, and how many spots (places.js GATHER). */
const gather = {
  yuequan: { n: 5, give: [[70, 'shaji', 1, 3], [30, 'ningqi_grass', 1, 2]] },
  ximo_wilds: { n: 16, give: [[60, 'suoyang', 1, 1], [30, 'shaji', 1, 2], [10, 'congrong', 1, 1]] },
  gobi: { n: 8, give: [[70, 'suoyang', 1, 2], [30, 'congrong', 1, 1]] },
  lost_city: { n: 4, give: [[60, 'suoyang', 1, 1], [40, 'congrong', 1, 1]] },
  shatuo_temple: { n: 3, give: [[100, 'ningqi_grass', 1, 2]] },
};

/** How many people walk about (places.js WANDERERS), what they say, and what they call out (world/people.js). */
const wanderers = { yuequan: 5 };
const folk = {
  yuequan: [
    '沙暴要來之前，駱駝會先跪下。', '月泉的水，一千年沒乾過。', '別一個人往西南邊的峽谷走。', '康老大的駝隊，這回在泉邊歇了一個月了。',
    '戈壁上那夥沙盜，越來越凶了。', '宋夫子又進古城去了？那老頭不要命。', '夜裡別看天上的天河，看久了，心裡會空。',
  ],
};
const calls = {
  yuequan: ['葡萄乾——西邊來的葡萄乾！', '喝水的這邊排隊！', '駱駝要喂了！', '誰的羊跑了？', '今晚驛站有人彈琵琶。'],
};

/** People with a place and an hour of their own (world/people.js EXTRAS). */
const extras = [
  {
    id: 'yq_raisins', region: 'yuequan', name: '賣葡萄乾的小販', look: 'vendor', at: [3640, 1758], face: 1, hours: [8, 18], act: 'stand',
    calls: ['葡萄乾——西邊來的葡萄乾！', '嚐一顆，不甜不要錢！'],
    chat: ['「客官，嚐嚐？西邊火州來的葡萄，曬了一整個夏天。」他抓了一把塞給你，「甜吧？那邊的太陽，比這裡還毒。」'],
  },
  {
    id: 'yq_pipa', region: 'yuequan', name: '彈琵琶的胡姬', look: 'villager_f', at: [3770, 1684], face: -1, hours: [19, 23.5], act: 'sit',
    calls: ['（琵琶聲叮叮咚咚）'],
    chat: ['她彈完一曲，抬頭笑了笑：「這曲子叫〈過沙〉。駝隊走沙海的時候唱的，唱一句，走一步。」'],
  },
  {
    id: 'yq_drover', region: 'yuequan', name: '駝夫', look: 'porter', at: [4092, 1902], face: -1, hours: [6, 20], act: 'stand',
    calls: ['駱駝要喂了！', '慢點，別驚了牠。'],
    chat: ['「駱駝這東西，」駝夫拍拍身邊的駱駝，「比人懂沙。沙暴來之前，牠先知道。」'],
  },
];

/** The small lives of each region (world/wildlife.js WILDLIFE). */
const wildlife = {
  yuequan: { n: 4, kinds: [['camel', 4, 'day', 'wild', [1, 2]], ['egret', 2, 'day', 'water', [1, 2]], ['crow', 1, 'day', 'wild', [1, 2]]] },
  luori_pass: { n: 2, kinds: [['crow', 3, 'day', 'wild', [1, 3]], ['rabbit', 1, 'night', 'wild', [1, 1]]] },
  gobi: { n: 2, kinds: [['crow', 3, 'day', 'any', [2, 3]], ['redfox', 1, 'night', 'wild', [1, 1]]] },
  ximo_wilds: { n: 3, kinds: [['rabbit', 2, 'night', 'wild', [1, 1]], ['redfox', 2, 'night', 'wild', [1, 1]], ['crow', 1, 'day', 'any', [1, 2]]] },
  shatuo_temple: { n: 1, kinds: [['crow', 3, 'day', 'any', [2, 4]]] },
};

/** How far you walk before something may happen, and how likely it is (world/explore.js ENCOUNTER). */
const encounter = {
  luori_pass: [1500, 0.3], yuequan: [1600, 0.35], gobi: [1100, 0.45], quicksand: [1000, 0.4], shatuo_temple: [1000, 0.3],
  lost_city: [1100, 0.4], ximo_wilds: [1300, 0.45], underpalace: [900, 0], wanghe_terrace: [700, 0],
};

/** What you notice as you walk (world/explore.js; by region, before the lines kept by kind of place). */
const ambient = {
  luori_pass: ['風從關城的城門洞裡灌過去，嗚的一聲。', '往東看，山口那頭是東荒；往西看，只有沙。', '城頭上落著一隻烏鴉，歪著頭看你。'],
  yuequan: ['駝鈴叮噹叮噹地響，一隊駱駝慢慢走到泉邊。', '泉邊的胡楊葉子沙沙地響。', '驛站的煙囪冒著煙，一股烤餅的香味。', '幾個孩子在泉邊的沙坡上往下滑，笑成一團。'],
  gobi: ['黑石子在太陽底下燙得發亮。', '遠處的土台上，有人影一晃就不見了。', '風捲起一股沙，打著旋兒從你身邊過去。'],
  quicksand: ['沙地平得出奇，連一個腳印也留不住。', '不遠處的沙子慢慢地往下陷，陷出一個淺淺的坑。', '一副駱駝的骨架，只露出半截脖子。'],
  shatuo_temple: ['峽谷裡的風，吹得簷角的鐵馬叮叮地響。', '崖壁上的石窟，一個一個像黑洞洞的眼睛。', '地上的沙，被人掃過——不知道是誰。'],
  lost_city: ['沙丘底下露出半截城牆，牆磚比你的人還大。', '風吹過殘牆的缺口，像有人在吹塤。', '腳下踩到一塊石板，上面刻著半朵蓮花。'],
  underpalace: ['穹頂上的星圖，一顆一顆，慢慢地亮了。', '這裡聽不見風。'],
  wanghe_terrace: ['四面都是沙海，沙丘一道一道排到天邊。', '風很大。往下看，駝道細得像一根線。'],
  ximo_wilds: ['沙丘一道接著一道，像凝住的浪。', '日頭底下，遠處的沙丘在晃，像隔著一層水。', '風在沙丘頂上揚起一縷白煙。', '一行足跡從沙丘那邊過來，又被風抹平了。'],
};

/** Looking around properly (content/events/generic.js): what you find, by region. */
const flavor = {
  luori_pass: ['你在關城裡轉了一圈。營房的門都倒了，灶台還在，灶裡有一窩鳥蛋。牆上用炭畫著一道一道的槓，數不清有多少天。'],
  yuequan: [
    '你沿著泉邊走了一圈。泉水清得能看見底下的沙，沙裡一顆一顆黑石子，像星星落在裡面。',
    '你在驛站的檐下坐了一會兒。駝夫們在卸貨，駱駝跪在沙裡，慢慢地嚼著乾草。',
    '你在集上轉了一圈：葡萄乾、毛氈、玉石、銅壺。賣東西的人說著你聽不懂的話，數錢的時候倒是一個比一個快。',
  ],
  gobi: ['你在戈壁上走了半天，鞋底燙得發軟。黑石子底下，偶爾壓著一株鎖陽，紫紅紫紅的。', '你在一座土台底下歇腳，看見台壁上刻著幾個箭頭，全指著北邊的土堡。'],
  quicksand: ['你沿著流沙的邊緣走，每一步都先用樹枝探一探。沙地底下，好像有什麼東西在慢慢地動。'],
  shatuo_temple: ['你在寺裡轉了一圈。經堂裡的經書全被沙埋了，你抽出一本，紙一碰就碎了。', '你在千佛窟前站了很久。窟裡的佛像都缺了臉，壁畫上的飛天，飄帶還是紅的。'],
  lost_city: ['你在殘牆之間走了半天。沙子底下，是一條一條筆直的街，街邊的房子只剩下牆根。', '你撿起一塊陶片，上面畫著一條魚。這裡，從前有水。'],
  underpalace: ['你在石室裡坐了很久。穹頂的星圖慢慢地轉，轉到一個地方，停住了。'],
  wanghe_terrace: ['你在台上坐到天黑。星星一顆一顆出來，天河橫過頭頂——中間斷了一截，黑得像一道疤。'],
  ximo_wilds: [
    '你爬上一道沙丘，又一道沙丘。沙丘的背後，還是沙丘。',
    '你在沙窩裡歇腳，挖開表面的熱沙，底下的沙是涼的。一隻沙鼠從洞裡探出頭來，又縮了回去。',
    '日頭底下，遠處好像有一片湖，湖邊有樹。你走過去，湖就往後退。',
  ],
};
const loot = {
  luori_pass: [['mind', 1]],
  yuequan: [['mind', 2]],
  gobi: [['maybe', 0.4, [['item', 'suoyang', 1]]]],
  quicksand: [['maybe', 0.15, [['item', 'mystery', 1]]]],
  shatuo_temple: [['mind', 1], ['maybe', 0.2, [['item', 'ningqi_grass', 1]]]],
  lost_city: [['maybe', 0.3, [['item', 'mystery', 1]]]],
  underpalace: [['mind', 3]],
  wanghe_terrace: [['insight', 1]],
  ximo_wilds: [['maybe', 0.3, [['item', 'shaji', [1, 2]]]]],
};

/**
 * Their days (world/people.js ROUTINES): [from hour, [x, y], what they do, facing?]. 老秦 keeps the
 * gate by day and goes up to his beacon at dusk; 月娘 is at her door; 宋夫子 sits copying in front of
 * his house; 了空 under the old 胡楊; 康駝頭 among his camels. At night, indoors.
 */
const routines = {
  lao_qin: {
    luori_pass: [
      [0, [4800, 1612], 'home'],
      [6, [4762, 1640], 'stand'],
      [18, [4610, 1528], 'stand'],
      [21.5, [4800, 1612], 'home'],
    ],
  },
  yue_niang: {
    yuequan: [
      [0, [3700, 1668], 'home'],
      [6, [3680, 1690], 'stand'],
      [22, [3700, 1668], 'home'],
    ],
  },
  song_fuzi: {
    yuequan: [
      [0, [3520, 1668], 'home'],
      [7, [3548, 1684], 'sit'],
      [19, [3520, 1668], 'home'],
    ],
  },
  liao_kong: {
    yuequan: [
      [0, [3404, 1916], 'sit'],
    ],
  },
  kang_tuotou: {
    yuequan: [
      [0, [4062, 1898], 'home'],
      [6, [3990, 1890], 'stand'],
      [21, [4062, 1898], 'home'],
    ],
  },
};

/** Where the people of 西漠 stand, by the region they are in (places.js NPC_SPOTS). */
const spots = {
  lao_qin: { luori_pass: [4762, 1640] },
  yue_niang: { yuequan: [3680, 1690] },
  song_fuzi: { yuequan: [3548, 1684] },
  liao_kong: { yuequan: [3404, 1916], shatuo_temple: [2700, 3790] },
  kang_tuotou: { yuequan: [3990, 1890] },
};

/** The air of each region in the 3D world (art/world3d.js MOODS): the haze it tints, how dim, what drifts. */
const moods = {
  luori_pass: { tint: [0.92, 0.84, 0.72], amount: 0.2, dim: 1.02, motes: null },
  yuequan: { tint: [0.9, 0.92, 0.84], amount: 0.14, dim: 1.02, motes: null },
  gobi: { tint: [0.84, 0.78, 0.68], amount: 0.24, dim: 1, motes: null },
  quicksand: { tint: [0.94, 0.84, 0.64], amount: 0.3, dim: 1.03, motes: null },
  shatuo_temple: { tint: [0.82, 0.74, 0.64], amount: 0.34, dim: 0.9, motes: 'ash' },
  lost_city: { tint: [0.9, 0.82, 0.68], amount: 0.3, dim: 0.97, motes: 'ash' },
  underpalace: { tint: [0.24, 0.28, 0.44], amount: 0.7, dim: 0.5, sun: 0.3, motes: 'mote' },
  wanghe_terrace: { tint: [0.92, 0.88, 0.8], amount: 0.2, dim: 1.04, motes: null },
  ximo_wilds: { tint: [0.95, 0.86, 0.66], amount: 0.26, dim: 1.04, motes: null },
};

export const XIMO_LAND = { ...XIMO_LAND_BASE, gather, wanderers, folk, calls, extras, wildlife, encounter, ambient, flavor, loot, routines, spots, moods };
