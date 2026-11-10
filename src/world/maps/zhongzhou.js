// 中州・臨江一帶 (1.0): across the 大江 from 東荒. The river runs down the west of the map and beyond it
// is mist — 東荒, seen from this side. Off the boat at 鶴歸渡, a road runs up to the first great city of
// 中州 (臨江城: walls, gate towers, a market, the 天驕榜's tower, the houses of the 世家), its docks on
// the river and, outside its walls, the night market of the 散修 (鬼市). Up the river, the warehouses
// and the river-boats of 上官家 and the long reedy embankment; north of the city, on a bare hill, the
// ruin of the first 觀星台 the 欽天監 ever built, and an old forest past it (蒼梧林); east, the manor of
// 謝家, the ridge where the 靈脈 comes up out of the ground (龍脊嶺), and the sword mountain of 天劍宗
// in the north-east; south, the fields the 世家 own, a valley of herbs (百草谷) and a great marsh (雲夢大澤);
// at the east edge, the pass the 官道 takes to 天衍城 — shut, for now. The land is laid down once, here,
// with everything that will stand on it: what comes later (1.1, 1.2) adds what happens, not what is.
// Region ids are this map's own.

import { T } from '../geo.js';
import { fbm } from '../noise.js';

// ── the land ──

/** 臨江城's walls: [x0, y0, x1, y1] (the ring of cells just inside it is wall; the roads make its four gates). */
const CITY = [1100, 2400, 2300, 3400];

/** Regions, in priority order (the first shape containing a cell owns it). */
const REGION_SHAPES = [
  { id: 'heguidu', poly: [[520, 3560], [1080, 3560], [1100, 4250], [560, 4260]] },
  { id: 'guishi', poly: [[600, 3260], [1090, 3260], [1090, 3550], [620, 3550]] },
  { id: 'linjiang_docks', poly: [[560, 2520], [1090, 2520], [1090, 3250], [580, 3250]] },
  { id: 'linjiang', poly: [[CITY[0], CITY[1]], [CITY[2], CITY[1]], [CITY[2], CITY[3]], [CITY[0], CITY[3]]] },
  { id: 'shangguan', poly: [[540, 1880], [1150, 1880], [1150, 2510], [560, 2510]] },
  { id: 'jiangdi', poly: [[520, 260], [1250, 260], [1250, 1870], [540, 1870]] },
  { id: 'guanxing', ellipse: [1750, 1050, 330, 260] },
  { id: 'xiejia', ellipse: [2900, 2180, 280, 200] },
  { id: 'tianjian', poly: [[3850, 300], [5050, 300], [5050, 1820], [3880, 1840]] },
  { id: 'cangwu', poly: [[2100, 280], [3820, 280], [3800, 1700], [2150, 1760]] },
  { id: 'longji', poly: [[3300, 1950], [4350, 1900], [4450, 2620], [3360, 2660]] },
  { id: 'guandao_guan', poly: [[4560, 2480], [5200, 2480], [5200, 2960], [4560, 2960]] },
  { id: 'baicao', ellipse: [2700, 4030, 400, 290] },
  { id: 'yunmeng', poly: [[3480, 3150], [5050, 3120], [5050, 4400], [3440, 4400]] },
  { id: 'lingtian', poly: [[1150, 3420], [3350, 3300], [3420, 3720], [3050, 3730], [2300, 3730], [1150, 3900]] },
  { id: 'zz_river', fromTerrain: T.WATER, river: 'great' },
  { id: 'zz_wilds', default: true },
];

/** Rock: [cx, cy, rx, ry]. */
const PEAKS = [
  // behind the old observatory, and between it and the forest
  [1150, 560, 200, 150],
  [2000, 560, 160, 120],
  // 蒼梧林's crags
  [2900, 720, 140, 110],
  [3400, 1150, 150, 120],
  // 龍脊嶺: the spine of the ridge, broken where the ways go through
  [3550, 2120, 130, 90],
  [3920, 2260, 150, 100],
  [4260, 2380, 120, 90],
  // the hills along the south
  [1500, 4300, 240, 120],
  [3250, 4380, 220, 110],
  [4850, 4350, 180, 100],
  // out in the wilds
  [2350, 1960, 100, 80],
  [4180, 2980, 110, 80],
];

/** 天劍宗: a sword mountain, a plateau on its top, three thousand steps up its south face to the gate. */
const SECT = {
  massif: [[3900, 380], [4960, 400], [4970, 1700], [3950, 1740]],
  plateau: [4450, 1020, 360, 280],
  gateY: 1560,
  gateX: [4390, 4510],
  name: '天劍宗',
  member: 'tianjian_guest',
};

/** 百草谷: a valley ringed by cliffs, open to the north where the fields are. */
const VALLEY = { cx: 2700, cy: 4030, rx: 400, ry: 290, ring: 0.15, gorge: [2700, 3720], gorgeHalf: 0.3 };

/** The 大江 (the same river 東荒 looks across), on this side's west; nothing else of its size here. */
const RIVERS = [{ id: 'great', width: 380, pts: [[280, -40], [370, 900], [320, 1900], [400, 2900], [440, 3700], [340, 4640]] }];

/** 雲夢大澤's open water, and two ponds in its reeds: [cx, cy, rx, ry, level?]. */
const LAKES = [
  [4300, 3780, 420, 270, 2],
  [3820, 3480, 120, 80],
  [4820, 3420, 110, 70],
];

/** Roads, lanes, trails, piers (water crossings become bridges; a road through a wall is a gate). */
const ROADS = [
  // 官道: out of 臨江城's east gate, across the plain, to the pass (and 天衍城 beyond)
  { kind: 'road', width: 56, pts: [[2300, 2900], [2800, 2880], [3300, 2860], [3800, 2800], [4300, 2730], [4700, 2700], [5120, 2700]] },
  // off the boat at 鶴歸渡, up to the south gate
  { kind: 'road', width: 52, pts: [[760, 3900], [950, 3820], [1200, 3680], [1480, 3540], [1700, 3440], [1700, 3400]] },
  // the city's streets, gate to gate, and the lanes between the blocks
  { kind: 'lane', width: 40, pts: [[880, 2900], [1100, 2900], [1700, 2900], [2300, 2900]] },
  { kind: 'lane', width: 40, pts: [[1700, 2400], [1700, 2900], [1700, 3400]] },
  { kind: 'lane', width: 30, pts: [[1140, 2650], [2260, 2650]] },
  { kind: 'lane', width: 30, pts: [[1140, 3160], [2260, 3160]] },
  { kind: 'lane', width: 30, pts: [[1420, 2440], [1420, 3360]] },
  { kind: 'lane', width: 30, pts: [[1980, 2440], [1980, 3360]] },
  // north out of the city: up the bare hill to the old observatory
  { kind: 'trail', width: 32, pts: [[1700, 2400], [1700, 2100], [1660, 1700], [1700, 1350], [1750, 1150]] },
  // into 蒼梧林
  { kind: 'trail', width: 28, pts: [[1700, 2100], [2150, 1950], [2600, 1700], [3000, 1450], [3300, 1300]] },
  // up the river bank: the docks, 上官's warehouses, on along the embankment
  { kind: 'trail', width: 30, pts: [[880, 2900], [850, 2500], [860, 2150], [900, 1800], [920, 1300], [900, 800], [880, 400]] },
  // to 天劍宗's gate, past 謝家莊, and up the steps
  { kind: 'road', width: 50, pts: [[2800, 2880], [2980, 2520], [3150, 2200], [3450, 1930], [3900, 1810], [4300, 1800], [4450, 1795], [4450, 1560], [4450, 1260]] },
  { kind: 'lane', width: 30, pts: [[3080, 2340], [2900, 2200]] },
  // up to the mines on 龍脊嶺
  { kind: 'trail', width: 28, pts: [[3800, 2800], [3780, 2600], [3820, 2420]] },
  // out to the marsh
  { kind: 'trail', width: 28, pts: [[3300, 2860], [3550, 3100], [3850, 3350], [4000, 3500]] },
  // through the fields to 百草谷, in at its mouth
  { kind: 'trail', width: 28, pts: [[1480, 3540], [1900, 3600], [2400, 3650], [2700, 3700], [2700, 3900]] },
  // piers: two at the docks, 上官's, the ferry's (each just out over the water at the bank)
  { kind: 'pier', width: 28, pts: [[1000, 2760], [560, 2760]] },
  { kind: 'pier', width: 28, pts: [[1000, 3060], [570, 3060]] },
  { kind: 'pier', width: 26, pts: [[900, 2200], [510, 2200]] },
  { kind: 'pier', width: 26, pts: [[760, 3900], [585, 3910]] },
];

/** The edge: mountains north, south and east (a gap where the 官道 goes through), the river to the west. */
const BORDER = {
  north: 170, south: 4370, east: 5050, westRiver: 'great',
  gaps: [{ side: 'east', at: 2700, half: 170, depth: 360 }],
};

/**
 * The lie of the land: the observatory's bare hill and the north high, the sword mountain highest (its
 * massif), the ridge in the middle of the east; the city on its plain, the fields, the marsh lowest, all
 * falling west to the river.
 */
const UPLAND = [
  [1750, 1050, 150, 330], [1300, 650, 110, 300], [2900, 900, 110, 520], [3400, 1300, 90, 360],
  [3900, 2300, 105, 380], [4800, 2700, 70, 300], [2700, 4030, 40, 260], [2300, 2000, 40, 300],
  [1700, 2900, 20, 700], [4300, 3780, 2, 520], [800, 3000, 6, 500], [2500, 3500, 14, 600], [4700, 4100, 20, 300],
  // the east bank, low all the way down to the water (as 東荒's west bank is)
  [650, 300, 6, 300], [660, 1100, 6, 320], [660, 1900, 6, 320], [700, 3800, 6, 320], [660, 4300, 8, 260],
];

export const ZHONGZHOU_GEO = {
  REGION_SHAPES,
  PEAKS, AIRY: [], CLIFF_LINES: [], VALLEY, SECT, RIVERS, LAKES, ROADS,
  MARKET_WALL: CITY, WALL_LOOK: { mud: false, name: '臨江城' }, BORDER,
  EDGE_RIVER: 'great', RIVER_REGION: 'zz_river', EDGE_SIDE: 'west',
  MIST_SAY: '江那邊雲霧太濃，辨不清方向。那邊是東荒；要回去，到鶴歸渡坐船。',
  // the sky over 臨江城 is the watch's (world/explore.js cityWatch)
  NO_FLY: { region: 'linjiang', name: '臨江城' },
  HOME_REGION: 'zz_wilds', REACH_FROM: [800, 3900], UPLAND,
};

// ── what lies on it, and how (by region; merged into the tables kept elsewhere) ──

/** The ground of each region (terrain.js BASE). */
const ground = {
  heguidu: (x, y) => (x < 700 ? T.SAND : fbm(x / 90, y / 90, 901) > 0.66 ? T.TALLGRASS : T.GRASS),
  guishi: () => T.WASTE,
  linjiang_docks: (x) => (x < 720 ? T.SAND : T.WASTE),
  // inside the walls: flagstones, and the gardens of the houses
  linjiang: (x, y) => (fbm(x / 70, y / 70, 902) > 0.64 ? T.GRASS : T.PAVED),
  shangguan: (x) => (x < 700 ? T.SAND : T.WASTE),
  jiangdi: (x, y) => (fbm(x / 80, y / 80, 903) > 0.45 ? T.TALLGRASS : T.SAND),
  guanxing: (x, y) => (fbm(x / 100, y / 100, 904) > 0.55 ? T.HILL : T.WASTE),
  xiejia: (x, y) => (fbm(x / 90, y / 90, 905) > 0.62 ? T.FOREST : T.GRASS),
  tianjian: (x, y) => (fbm(x / 110, y / 110, 906) > 0.55 ? T.FOREST : T.GRASS),
  cangwu: (x, y) => {
    const n = fbm(x / 160, y / 160, 907);
    return n > 0.5 ? T.DEEP : n > 0.32 ? T.FOREST : T.GRASS;
  },
  longji: (x, y) => (fbm(x / 120, y / 120, 908) > 0.45 ? T.HILL : T.WASTE),
  guandao_guan: (x, y) => (fbm(x / 120, y / 120, 909) > 0.6 ? T.HILL : T.GRASS),
  baicao: (x, y) => {
    const n = fbm(x / 90, y / 90, 910);
    return n > 0.62 ? T.FOREST : n > 0.45 ? T.TALLGRASS : T.GRASS;
  },
  yunmeng: (x, y) => {
    const n = fbm(x / 120, y / 120, 911);
    return n > 0.56 ? T.TALLGRASS : n < 0.3 ? T.SAND : T.GRASS;
  },
  lingtian: (x, y) => (fbm(x / 200, y / 200, 912) > 0.8 ? T.GRASS : T.FARM),
  zz_river: () => T.WATER,
  zz_wilds: (x, y) => {
    const n = fbm(x / 260, y / 260, 913);
    const m = fbm(x / 150, y / 150, 914);
    if (n > 0.66) return T.FOREST;
    if (m > 0.7) return T.HILL;
    return n < 0.3 ? T.TALLGRASS : T.GRASS;
  },
};

/** Which trees (terrain.js TREE_MIX). */
const trees = {
  heguidu: [['willow', 80], ['leaf', 20]],
  guishi: [['willow', 60], ['dead', 40]],
  linjiang_docks: [['willow', 100]],
  linjiang: [['willow', 50], ['leaf', 50]],
  shangguan: [['willow', 100]],
  jiangdi: [['willow', 90], ['leaf', 10]],
  guanxing: [['pine', 50], ['dead', 50]],
  xiejia: [['leaf', 50], ['bamboo', 30], ['willow', 20]],
  tianjian: [['pine', 85], ['leaf', 15]],
  cangwu: [['dark', 45], ['leaf', 30], ['pine', 25]],
  longji: [['pine', 60], ['dead', 40]],
  guandao_guan: [['pine', 60], ['leaf', 40]],
  baicao: [['bamboo', 40], ['leaf', 40], ['pine', 20]],
  yunmeng: [['willow', 60], ['dead', 40]],
  lingtian: [['willow', 70], ['leaf', 30]],
  zz_river: [['willow', 100]],
  zz_wilds: [['leaf', 60], ['pine', 40]],
};

/** Settled ground sits level (height.js SETTLED): [height, roll]. */
const settled = {
  linjiang: [24, 2], linjiang_docks: [18, 0], guishi: [16, 1], heguidu: [12, 1], shangguan: [16, 1], xiejia: [40, 2], lingtian: [20, 1],
};

/** How much wild ground rolls (height.js ROLL). */
const roll = { zz_wilds: 22, cangwu: 26, guanxing: 24, longji: 30, jiangdi: 8, yunmeng: 4, baicao: 10, tianjian: 12, guandao_guan: 18 };

/** Under a mountain, the ground is the land's (art/worldview.js). */
const under = {
  heguidu: T.GRASS, guishi: T.WASTE, linjiang_docks: T.WASTE, linjiang: T.PAVED, shangguan: T.WASTE, jiangdi: T.SAND, guanxing: T.HILL,
  xiejia: T.GRASS, tianjian: T.HILL, cangwu: T.FOREST, longji: T.HILL, guandao_guan: T.HILL, baicao: T.GRASS, yunmeng: T.GRASS,
  lingtian: T.FARM, zz_river: T.SAND, zz_wilds: T.GRASS,
};

/** Woods in the open (terrain.js GROVE): a tree now and then. */
const grove = { zz_wilds: 0.03, lingtian: 0.008, heguidu: 0.02, jiangdi: 0.02, guandao_guan: 0.025 };

/** What each region sounds like (audio/director.js PLACE). */
const sound = {
  heguidu: 'river', guishi: 'nightmarket', linjiang_docks: 'docks', linjiang: 'city', shangguan: 'docks', jiangdi: 'lake',
  guanxing: 'ruins', xiejia: 'town', tianjian: 'swordsect', cangwu: 'forest', longji: 'hill', guandao_guan: 'fort',
  baicao: 'valley', yunmeng: 'marsh', lingtian: 'farm', zz_river: 'river', zz_wilds: 'hill',
};

export const ZHONGZHOU_LAND_BASE = { ground, trees, settled, roll, under, grove, sound };

/** 中州's own colours (art/worldview.js): the flagstones lighter, the fields greener than 東荒's. */
export const ZHONGZHOU_PALETTE = {
  [T.PAVED]: { all: [206, 202, 190] },
  [T.FARM]: { spring: [170, 188, 120], summer: [146, 172, 104], autumn: [204, 184, 112], winter: [214, 210, 196] },
};

// ── places ──

/** The regions as places (map.js NODES). You know the name of 中州 and nothing else; the landing is what you see first. */
export const ZHONGZHOU_NODES = {
  heguidu: {
    name: '鶴歸渡', kind: 'ferry', qi: 0.9, danger: 0, at: [800, 3900], label: [820, 3760],
    desc: '大江東岸的渡口，和白鶴渡隔江相望。碼頭上立著一塊碑，碑上兩個字：鶴歸。白鶴從江霧裡飛過來，在這裡落腳。',
  },
  guishi: {
    name: '鬼市', kind: 'market', qi: 1.0, danger: 1, at: [850, 3400], label: [850, 3310],
    desc: '臨江城西南牆外的一片空地。白天只有幾根木樁和一地雞毛；天一黑，散修們就提著燈來擺攤，賣什麼的都有，問哪裡來的，沒人答。',
  },
  linjiang_docks: {
    name: '臨江碼頭', kind: 'market', qi: 0.9, danger: 0, at: [800, 2900], label: [800, 2580],
    desc: '臨江城西門外的碼頭。樓船、貨船、漁船擠在一起，桅杆像一片林子；腳夫扛著貨，一船一船地上，一船一船地下。',
  },
  linjiang: {
    name: '臨江城', kind: 'town', qi: 1.1, danger: 0, at: [1700, 2960], label: [1700, 2470],
    desc: '中州的第一座大城：城牆三丈高，四面城門，城門樓上掛著燈籠。城裡石板鋪路，街上的修士比東荒一年見到的還多。榜樓上，掛著中州的天驕榜。',
  },
  shangguan: {
    name: '上官商棧', kind: 'market', qi: 0.9, danger: 0, at: [880, 2200], label: [880, 1960],
    desc: '江邊一排高大的貨棧，門上掛著「上官」兩個字。棧前的碼頭泊著上官家的樓船，三層高，船頭雕著一隻鷁鳥。',
  },
  jiangdi: {
    name: '江堤蘆蕩', kind: 'lake', qi: 1.0, danger: 2, secludeRisk: 0.2, at: [900, 1000], label: [900, 760],
    desc: '大江東岸的長堤，堤外是望不到頭的蘆葦蕩。白天有人在蘆葦裡割葦子；天黑以後，漁家都說，蕩子裡有東西在走。',
  },
  guanxing: {
    name: '舊觀星台', kind: 'ruins', qi: 1.6, danger: 3, secludeRisk: 0.35, at: [1750, 1180], label: [1750, 780],
    desc: '城北一座光禿禿的山頭，山頂上是一座塌了一半的石台。臨江城的人說，那是三千年前欽天監的第一座觀星台，後來欽天監搬進了都城，這裡就荒了。',
  },
  xiejia: {
    name: '謝家莊', kind: 'town', qi: 1.2, danger: 0, at: [2900, 2270], label: [2900, 1980],
    desc: '官道北邊一座大莊園，白牆黑瓦，牆比城牆矮不了多少。門口兩座石獅子，門楣上一塊匾：謝。臨江城一半的田、一半的鋪子，都是謝家的。',
  },
  tianjian: {
    name: '天劍宗', kind: 'sect', qi: 1.8, danger: 1, at: [4450, 1760], label: [4450, 1330],
    desc: '東北的劍山拔地而起，山壁直得像劍削出來的。三千級劍階從山腳一直鋪到雲裡，山門上一塊匾，兩個字：天劍。',
  },
  cangwu: {
    name: '蒼梧林', kind: 'forest', qi: 1.3, danger: 3, secludeRisk: 0.35, at: [3000, 1100], label: [2900, 420],
    desc: '城北的老林子，樹老得說不清年歲，一棵就能遮住半畝地。林子裡終年不見太陽，地上的苔蘚厚得像氈子。',
  },
  longji: {
    name: '龍脊嶺', kind: 'mountain', qi: 1.7, danger: 3, secludeRisk: 0.3, at: [3800, 2450], label: [3850, 2000],
    desc: '官道北邊一道長長的石嶺，嶺脊像一條伏著的龍。嶺下有靈脈露出地面，挖出來的靈石成色極好；謝家和上官家為了這條嶺，打了好幾年官司。',
  },
  guandao_guan: {
    name: '官道關', kind: 'pass', qi: 0.9, danger: 1, at: [4720, 2700], label: [4800, 2520],
    desc: '官道往東進山的關口，關樓上插著大衍皇朝的旗。過了關，就是往天衍城的路。',
  },
  baicao: {
    name: '百草谷', kind: 'valley', qi: 1.4, danger: 2, secludeRisk: 0.2, at: [2700, 3980], label: [2700, 3690],
    desc: '靈田南邊，一道山口進去的山谷。谷裡長滿了藥草，一年四季都是香的。谷口的石頭上刻著三個字：百草谷。',
  },
  yunmeng: {
    name: '雲夢大澤', kind: 'lake', qi: 1.2, danger: 4, secludeRisk: 0.4, at: [4100, 3500], label: [4300, 3420],
    desc: '東南的一大片沼澤，水連著水，草連著草，霧一年到頭散不開。漁家說，大澤的深處住著一條蛟，三百年沒有人見過它的全身。',
  },
  lingtian: {
    name: '千畝靈田', kind: 'farm', qi: 1.1, danger: 1, at: [2200, 3560], label: [2300, 3460],
    desc: '城南的靈田，一眼望不到邊。田裡種的是靈稻，稻穗泛著淡淡的光。田是世家的，種田的是佃農；水車一年到頭吱呀吱呀地轉。',
  },
  zz_river: {
    name: '大江', kind: 'river', qi: 0.8, danger: 2, at: [565, 2760],
    desc: '從這一頭看，大江一樣寬得看不見對岸。江霧那邊，是東荒。',
  },
  zz_wilds: {
    name: '中州野地', kind: 'wilds', qi: 1.0, danger: 2, secludeRisk: 0.25, at: [2400, 2300], label: [2450, 2150],
    desc: '城與城、莊與莊之間的野地。路上常有御劍的人從頭頂飛過，留下一道一道的光。這裡的草，都比東荒的綠。',
  },
};

/** Buildings, places to walk up to (places.js STRUCTURES / POIS, for this map). */
const STRUCTURES = [
  // 鶴歸渡: the stele, the ferryman's boat, the tea shed
  { x: 860, y: 3840, w: 18, h: 8, sprite: 'stele', block: false, name: '鶴歸渡', landmark: true },
  { x: 660, y: 3955, w: 60, h: 18, sprite: 'boat', block: false },
  { x: 960, y: 3990, w: 70, h: 44, sprite: 'teashed' },
  // 鬼市: stalls standing empty by day (lit at night), the lantern pole, a lean-to
  { x: 760, y: 3360, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 870, y: 3330, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 980, y: 3370, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 800, y: 3470, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 940, y: 3480, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 1040, y: 3460, w: 50, h: 34, sprite: 'hut' },
  // 臨江碼頭: river-boats at the piers, a warehouse, the dockhands' shed
  { x: 660, y: 2720, w: 110, h: 30, sprite: 'boat', block: false },
  { x: 660, y: 3100, w: 90, h: 26, sprite: 'boat', block: false },
  { x: 900, y: 2660, w: 120, h: 60, sprite: 'hall' },
  { x: 920, y: 3150, w: 70, h: 44, sprite: 'house' },
  // 臨江城 — the gate towers over the four gates
  { x: 1100, y: 2900, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  { x: 2300, y: 2900, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  { x: 1700, y: 3400, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  { x: 1700, y: 2400, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  // the north-west block: the city lord's yamen, its courtyard, its gate
  { x: 1550, y: 2550, w: 240, h: 150, paint: T.PAVED },
  { x: 1550, y: 2540, w: 170, h: 90, sprite: 'bighall', name: '城主府', landmark: true },
  { x: 1550, y: 2620, w: 80, h: 10, sprite: 'paifang', block: false },
  { x: 1260, y: 2530, w: 70, h: 44, sprite: 'house' },
  { x: 1270, y: 2780, w: 70, h: 44, sprite: 'house' },
  { x: 1550, y: 2780, w: 90, h: 50, sprite: 'hall' },
  // the crossroads: the tower of the 天驕榜, and a well
  { x: 1790, y: 2810, w: 44, h: 44, sprite: 'pagoda', name: '榜樓', landmark: true },
  { x: 1640, y: 2960, w: 18, h: 18, sprite: 'well', block: false },
  // the north-east block: the town houses of the 世家
  { x: 2130, y: 2530, w: 170, h: 90, sprite: 'mansion', name: '謝府' },
  { x: 2130, y: 2775, w: 160, h: 86, sprite: 'mansion' },
  { x: 1850, y: 2530, w: 90, h: 50, sprite: 'house' },
  { x: 1850, y: 2700, w: 70, h: 44, sprite: 'house' },
  // the south-east block: the east market — the tea house, shops, the smith, the hall of bounties
  { x: 1850, y: 3030, w: 100, h: 56, sprite: 'teahouse', name: '茶樓', landmark: true },
  { x: 2130, y: 3020, w: 90, h: 50, sprite: 'shop' },
  { x: 2200, y: 3090, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 2060, y: 3100, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 1840, y: 3270, w: 110, h: 60, sprite: 'hall', name: '懸賞堂' },
  { x: 2130, y: 3270, w: 80, h: 44, sprite: 'smithy' },
  { x: 2050, y: 3220, w: 40, h: 20, sprite: 'stall', block: false },
  // the south-west block: the lane of the 散修 — the inn, the 洞府 office, small houses
  { x: 1270, y: 3020, w: 100, h: 56, sprite: 'teahouse', name: '客棧' },
  { x: 1560, y: 3030, w: 90, h: 50, sprite: 'shop', name: '洞府行' },
  { x: 1240, y: 3270, w: 60, h: 40, sprite: 'house' },
  { x: 1340, y: 3270, w: 60, h: 40, sprite: 'house' },
  { x: 1540, y: 3270, w: 60, h: 40, sprite: 'house' },
  { x: 1620, y: 3260, w: 50, h: 36, sprite: 'hut' },
  // 上官商棧: the warehouses, the hall, the great river-boat at its pier
  { x: 1000, y: 2090, w: 140, h: 70, sprite: 'auction', name: '上官商棧', landmark: true },
  { x: 1010, y: 2330, w: 120, h: 60, sprite: 'hall' },
  { x: 625, y: 2150, w: 130, h: 36, sprite: 'boat', block: false, landmark: true },
  // 江堤蘆蕩: a reed-cutter's hut on the embankment
  { x: 1000, y: 1250, w: 52, h: 36, sprite: 'hut' },
  // 舊觀星台: the ruined platform on the hilltop, the broken walls about it, a stele half sunk
  { x: 1750, y: 1060, w: 160, h: 120, sprite: 'observatory', name: '舊觀星台', landmark: true },
  { x: 1580, y: 1180, w: 100, h: 20, sprite: 'ruinwall' },
  { x: 1930, y: 960, w: 90, h: 20, sprite: 'ruinwall' },
  { x: 1690, y: 1210, w: 18, h: 8, sprite: 'stele', block: false },
  // 謝家莊: the manor in its grounds
  { x: 2900, y: 2180, w: 300, h: 200, paint: T.PAVED },
  { x: 2900, y: 2150, w: 180, h: 100, sprite: 'mansion', name: '謝家莊', landmark: true },
  { x: 2760, y: 2240, w: 70, h: 44, sprite: 'house' },
  { x: 3040, y: 2240, w: 70, h: 44, sprite: 'house' },
  { x: 2980, y: 2300, w: 60, h: 10, sprite: 'paifang', block: false },
  // 天劍宗: the gate at the foot of the steps; on the plateau the great hall, the pagoda, the sword pool's pavilion, the ancestors' hall
  { x: 4450, y: 1578, w: 120, h: 10, sprite: 'paifang', block: false, name: '天劍', landmark: true },
  { x: 4530, y: 1770, w: 18, h: 8, sprite: 'stele', block: false },
  { x: 4450, y: 960, w: 170, h: 90, sprite: 'bighall', landmark: true },
  { x: 4250, y: 1050, w: 44, h: 44, sprite: 'pagoda', landmark: true },
  { x: 4650, y: 1100, w: 44, h: 44, sprite: 'pavilion' },
  { x: 4600, y: 880, w: 110, h: 60, sprite: 'hall' },
  // 龍脊嶺: the frame over the mine's mouth, the diggers' shed
  { x: 3820, y: 2400, w: 46, h: 24, sprite: 'minegate', block: false, landmark: true },
  { x: 3700, y: 2520, w: 60, h: 40, sprite: 'cabin' },
  // 官道關: the pass fort across the road
  { x: 4900, y: 2700, w: 170, h: 70, sprite: 'fort', name: '官道關', landmark: true },
  // 百草谷: the herb-masters' houses in the valley
  { x: 2620, y: 4080, w: 110, h: 60, sprite: 'hall', name: '百草谷' },
  { x: 2830, y: 4000, w: 70, h: 44, sprite: 'house' },
  { x: 2560, y: 3930, w: 44, h: 44, sprite: 'pavilion' },
  // 雲夢大澤: a fisherman's hut on stilts at the reed edge
  { x: 3900, y: 3300, w: 52, h: 36, sprite: 'hut' },
  // 千畝靈田: farmhouses of the tenants, a waterwheel's shed
  { x: 2000, y: 3560, w: 70, h: 44, sprite: 'farmhouse' },
  { x: 2550, y: 3470, w: 70, h: 44, sprite: 'farmhouse' },
  { x: 3050, y: 3500, w: 70, h: 44, sprite: 'farmhouse' },
];

/** Places you can walk up to (places.js POIS, for this map). */
const POIS = [
  // 鶴歸渡
  { id: 'hg_pier', region: 'heguidu', x: 700, y: 3906, name: '渡口', verb: '坐船', text: '老船夫的船泊在棧橋頭。江那邊，是東荒。' },
  { id: 'hg_stele', region: 'heguidu', x: 860, y: 3870, name: '渡碑', verb: '查看', text: '碑上刻著「鶴歸」兩個大字，底下一行小字：「天元元年，大衍立渡於此。」' },
  { id: 'hg_shed', region: 'heguidu', x: 960, y: 4050, name: '茶棚', verb: '歇腳', rest: true, text: '茶棚裡擺著幾張條凳，一壺粗茶三文錢。剛下船的人都在這裡歇口氣，打聽城裡的事。' },
  // 鬼市
  { id: 'gs_stalls', region: 'guishi', x: 880, y: 3400, name: '鬼市', verb: '逛逛', glow: (s) => s.tod >= 20 || s.tod < 4, text: (s) => (s.tod >= 20 || s.tod < 4 ? '燈一盞一盞亮著。攤子上擺的東西，有的認得，有的不認得；擺攤的人都戴著斗笠。' : '空地上只有幾根木樁。要等天黑，鬼市才開。') },
  // (1.0) by night only, a stall that sells: content/items.js SHOPS.guishi
  { id: 'gs_shop', region: 'guishi', x: 960, y: 3430, name: '夜攤', verb: '看貨', action: 'shop', shop: 'guishi', show: (s) => s.tod >= 19.5 || s.tod < 5, glow: () => true, text: '一盞燈，一塊布，布上擺著來路不明的東西。' },
  { id: 'gs_lean', region: 'guishi', x: 1040, y: 3500, name: '破棚', verb: '查看', text: '牆根下一間破棚子，門口掛著一塊木牌：「洞府出租，一月十石，不問來歷。」' },
  // 臨江碼頭
  { id: 'ld_wharf', region: 'linjiang_docks', x: 760, y: 2900, name: '碼頭', verb: '查看', text: '碼頭上人聲鼎沸。腳夫扛著貨箱，一路小跑；船家扯著嗓子喊價，十幾種口音混在一起。' },
  { id: 'ld_porters', region: 'linjiang_docks', x: 900, y: 3060, name: '腳夫', verb: '打聽', action: 'inquire' },
  // 臨江城
  { id: 'lj_board', region: 'linjiang', x: 1790, y: 2850, name: '天驕榜', verb: '看榜', text: '榜樓的牆上貼著一張大榜，從第一名一直排到一百名。榜頭蓋著欽天監的大印。' },
  { id: 'lj_lord', region: 'linjiang', x: 1550, y: 2600, name: '城主府', verb: '查看', text: '城主府門口站著兩排衛兵，門前的石階擦得發亮。門房說，城主不見閒人。' },
  { id: 'lj_tea', region: 'linjiang', x: 1850, y: 3100, name: '茶樓', verb: '打聽', action: 'inquire', glow: (s) => s.tod >= 17 || s.tod < 2 },
  { id: 'lj_teller', region: 'linjiang', x: 1810, y: 3080, name: '說書人', verb: '聽書', text: '茶樓裡的說書人一拍醒木：「上回說到，劍仙一劍斷天河……」' },
  { id: 'lj_inn', region: 'linjiang', x: 1270, y: 3060, name: '客棧', verb: '歇腳', rest: true, text: '客棧的掌櫃看了你一眼：「住店？中州的店錢，可比東荒貴。」' },
  { id: 'lj_shop', region: 'linjiang', x: 2130, y: 3058, name: '百貨', verb: '購物', action: 'shop', shop: 'linjiang' },
  { id: 'lj_smith', region: 'linjiang', x: 2130, y: 3334, name: '兵器鋪', verb: '購物', action: 'shop', shop: 'linjiang_smith' },
  { id: 'lj_bounty', region: 'linjiang', x: 1840, y: 3336, name: '懸賞堂', verb: '看榜', action: 'board', board: 'linjiang', text: '懸賞堂的牆上貼滿了告示：某處出了妖獸，某人欠了債，某家丟了東西。賞金從十塊靈石到一千塊不等。' },
  { id: 'lj_cave', region: 'linjiang', x: 1560, y: 3092, name: '洞府行', verb: '租洞府', text: '洞府行的牆上掛著一張城外的圖，圖上一個一個圈著的，是能租的洞府。掌櫃說：「城裡寸土寸金，洞府按月算。」' },
  { id: 'lj_xie', region: 'linjiang', x: 2130, y: 2612, name: '謝府', verb: '查看', text: '謝府的大門緊閉，門口兩個家丁抱著胳膊，看人的眼神像在看一隻螞蟻。' },
  { id: 'lj_lane', region: 'linjiang', x: 1400, y: 3220, name: '散修巷', verb: '查看', text: '一條窄巷，兩邊的房子又矮又擠。巷口蹲著幾個散修，有的在打坐，有的在補衣裳，有的什麼也不做，只是看著街。' },
  // 上官商棧
  { id: 'sg_hall', region: 'shangguan', x: 1000, y: 2170, name: '商棧', verb: '拜訪', text: '商棧裡堆滿了貨，夥計們進進出出。櫃台後面的帳房先生頭也不抬：「找當家的？當家的在船上。」' },
  { id: 'sg_boat', region: 'shangguan', x: 640, y: 2200, name: '樓船', verb: '查看', text: '上官家的樓船泊在碼頭邊，三層高，船頭雕著一隻鷁鳥。船上的人說，這條船從臨江到天衍城，一趟要走十天。' },
  // 江堤蘆蕩
  { id: 'jd_hut', region: 'jiangdi', x: 1000, y: 1290, name: '葦棚', verb: '查看', text: '堤上一間葦子搭的棚，門口曬著一排割下來的蘆葦。棚裡沒人，灶是冷的。' },
  { id: 'jd_reeds', region: 'jiangdi', x: 760, y: 700, name: '蘆蕩深處', verb: '查看', text: '蘆葦比人高，風一吹，嘩啦啦地響成一片。蕩子深處，有一條被踩出來的小路，不知道通到哪裡。' },
  // 舊觀星台
  { id: 'gx_platform', region: 'guanxing', x: 1750, y: 1166, name: '觀星台', verb: '登台', text: '石台塌了一半，台面上刻著一圈一圈的星圖，被風雨磨得只剩淺淺的痕。台心有一個圓坑，像是放過什麼東西。' },
  { id: 'gx_stele', region: 'guanxing', x: 1690, y: 1240, name: '斷碑', verb: '查看', text: '一塊斷碑半埋在土裡，露出來的半截上，有「欽天」兩個字。' },
  // 謝家莊
  { id: 'xj_gate', region: 'xiejia', x: 2980, y: 2320, name: '莊門', verb: '查看', text: '謝家莊的大門上釘著銅釘，門口的石獅子比人還高。門房說：「拜帖呢？」' },
  // 天劍宗
  { id: 'tj_gate', region: 'tianjian', x: 4450, y: 1700, name: '山門', verb: '查看', text: '劍階的盡頭是一座山門，門上的匾寫著「天劍」。守門的弟子背著劍，站得像兩把插在地上的劍。' },
  { id: 'tj_stele', region: 'tianjian', x: 4530, y: 1800, name: '門規碑', verb: '查看', text: '山門邊立著一塊碑，碑上刻著天劍宗的門規。第一條只有八個字：「指在一日，劍不入鞘。」' },
  { id: 'tj_hall', region: 'tianjian', x: 4450, y: 1042, name: '天劍殿', verb: '查看', text: '天劍宗的正殿。殿前的廣場上，幾百個弟子在練劍，劍光像下雨一樣。' },
  { id: 'tj_pool', region: 'tianjian', x: 4650, y: 1140, name: '劍池', verb: '查看', text: '亭子底下是一池水，水是黑的，池底插滿了劍。池邊的石頭上刻著：「劍有靈，人有心。」' },
  { id: 'tj_ancestors', region: 'tianjian', x: 4600, y: 920, name: '祖師堂', verb: '查看', text: '祖師堂的門緊閉著，門上掛著一把生了鏽的鎖。' },
  // 龍脊嶺
  { id: 'lg_mine', region: 'longji', x: 3820, y: 2430, name: '靈石礦', verb: '查看', text: '礦口上架著木頭框，框上貼著兩張封條，一張蓋著謝家的印，一張蓋著上官家的印。' },
  // 官道關
  { id: 'gd_gate', region: 'guandao_guan', x: 4780, y: 2700, name: '關門', verb: '查看', text: '關門緊閉，關樓上的兵丁居高臨下地看著你。門口貼著一張告示：「天衍城戒嚴，閒人止步。」' },
  // 百草谷
  { id: 'bc_mouth', region: 'baicao', x: 2700, y: 3780, name: '谷口', verb: '查看', text: '谷口的石頭上刻著「百草谷」三個字。谷裡飄出來的風，帶著一股說不出的藥香。' },
  { id: 'bc_hall', region: 'baicao', x: 2620, y: 4120, name: '藥廬', verb: '查看', text: '谷裡的藥廬，門口晾著一排一排的藥草。一個背著藥簍的少年從裡頭跑出來，看了你一眼又跑了。' },
  // 雲夢大澤
  { id: 'ym_hut', region: 'yunmeng', x: 3900, y: 3340, name: '漁屋', verb: '查看', text: '蘆葦邊一間高腳漁屋，屋簷下掛著魚網。門口一個老漁婆在補網，頭也不抬：「往裡走？別往裡走。」' },
  { id: 'ym_shore', region: 'yunmeng', x: 4000, y: 3560, name: '澤畔', verb: '查看', text: '大澤的水是黑的，霧貼著水面飄。遠處的水面上，冒起一串很大的氣泡。' },
  // 千畝靈田
  { id: 'lt_wheel', region: 'lingtian', x: 2550, y: 3532, name: '水車', verb: '查看', text: '一架大水車吱呀吱呀地轉，把渠裡的水一斗一斗地舀進田裡。田埂上的木牌寫著：謝。' },
  // 中州野地
  { id: 'zw_post', region: 'zz_wilds', x: 2830, y: 2940, name: '路標', verb: '查看', text: '路口一根石柱，刻著四行字：東，天衍城；北，天劍宗；西，臨江城；南，雲夢大澤。' },
];

const dark = (s) => s.tod >= 19.5 || s.tod < 5;
const killed = (s, kind) => (s.vars.kills?.[kind] || 0) > 0;

/**
 * What roams (places.js BEASTS, for this map): pythons in the reeds north of the docks; the old wood's
 * spirits and its apes; 劫修 on the ways between the towns; after dark, those who follow you out of the
 * 鬼市; and out in the 大澤, the 蛟 (the stone beast of the old observatory is a story's fight:
 * content/events/zhongzhou.js gx_platform).
 */
const BEASTS = [
  { id: 'reed_pythons_a', kind: 'reed_python', n: 2, title: '蘆蕩青蟒', x: 800, y: 600, r: 150, respawn: 30, power: 150 },
  { id: 'reed_pythons_b', kind: 'reed_python', n: 2, title: '蘆蕩青蟒', x: 900, y: 1400, r: 150, respawn: 30, power: 160 },
  { id: 'wood_spirits_a', kind: 'wood_spirit', n: 2, title: '蒼梧木精', x: 2600, y: 900, r: 140, respawn: 30, power: 210 },
  { id: 'wood_spirits_b', kind: 'wood_spirit', n: 2, title: '蒼梧木精', x: 2500, y: 1400, r: 140, respawn: 30, power: 200 },
  { id: 'cangwu_apes_a', kind: 'cangwu_ape', n: 2, title: '蒼梧猿', x: 3200, y: 500, r: 150, respawn: 30, power: 240 },
  { id: 'jie_xiu_a', kind: 'jie_xiu', n: 2, title: '劫修', x: 2000, y: 1900, r: 140, respawn: 40, power: 190 },
  { id: 'jie_xiu_b', kind: 'jie_xiu', n: 2, title: '劫修', x: 3650, y: 2250, r: 140, respawn: 40, power: 220 },
  { id: 'jie_xiu_c', kind: 'jie_xiu', n: 3, title: '劫修', x: 3300, y: 2900, r: 150, respawn: 40, power: 230 },
  { id: 'gs_assassins_a', kind: 'gs_assassin', n: 2, title: '鬼市刺客', x: 1250, y: 4100, r: 140, respawn: 10, power: 220, cond: dark },
  { id: 'yunmeng_jiao_a', kind: 'yunmeng_jiao', title: '雲夢蛟', x: 4600, y: 3400, r: 150, respawn: 999, power: 360, cond: (s) => !killed(s, 'yunmeng_jiao') },
];

export const ZHONGZHOU_PLACES = { STRUCTURES, POIS, BEASTS };

// ── who lives here ──

/** The people of 中州 (world/npcs.js NAMED). Nobody here has heard of you — and the 天驕榜 never will. */
export const ZHONGZHOU_PEOPLE = {
  xiao_qi: {
    name: '蕭七', title: '鬼市的獨臂散修', gender: '男', age: 63, realm: 3, stage: 0, loc: 'guishi',
    bio: '鬼市裡最老的散修，左袖子是空的。年輕時和人爭一株九葉玄蓮，丟了一條胳膊，換回一顆金丹。他說：在中州當散修，第一件事是學會別惹世家。',
  },
  shangguan_jin: {
    name: '上官瑾', title: '上官家的女當家', gender: '女', age: 34, realm: 2, stage: 3, loc: 'shangguan',
    bio: '上官家做江上生意的當家，二十出頭就接下了家裡的樓船。說話客氣，算盤打得比誰都精；謝家的人來，她也笑著請喝茶。',
  },
  xie_xuanlang: {
    name: '謝玄朗', title: '謝家少主', gender: '男', age: 24, realm: 2, stage: 2, loc: 'linjiang',
    bio: '謝家的少主，天劍宗的外門弟子，天驕榜上排在六十幾名。生得一副好相貌，走到哪裡都有人前呼後擁。臨江城裡的人說：謝家看上的東西，從來沒有拿不到的。',
  },
};

// ── the rest of how it lives (by region; merged into the tables kept elsewhere) ──

/** Which herbs grow where, and how many spots (places.js GATHER). */
const gather = {
  zz_wilds: { n: 14, give: [[70, 'longxu_grass', 1, 2], [30, 'ningqi_grass', 1, 2]] },
  jiangdi: { n: 8, give: [[70, 'jiangli', 1, 2], [30, 'longxu_grass', 1, 1]] },
  cangwu: { n: 10, give: [[75, 'longxu_grass', 1, 2], [25, 'zizhi', 1, 1]] },
  guanxing: { n: 4, give: [[60, 'longxu_grass', 1, 1], [40, 'zizhi', 1, 1]] },
  yunmeng: { n: 8, give: [[85, 'jiangli', 1, 2], [15, 'jiuye_lotus', 1, 1]] },
  baicao: { n: 10, give: [[50, 'longxu_grass', 1, 2], [30, 'zizhi', 1, 1], [20, 'jiangli', 1, 2]] },
  longji: { n: 4, give: [[100, 'longxu_grass', 1, 1]] },
  guandao_guan: { n: 3, give: [[100, 'longxu_grass', 1, 1]] },
};

/** How many people walk about (places.js WANDERERS), what they say, and what they call out (world/people.js). */
const wanderers = { linjiang: 9, linjiang_docks: 5, shangguan: 3, lingtian: 3, heguidu: 2, xiejia: 2 };
const folk = {
  linjiang: [
    '天驕榜又換了，第三名換成了一個姓林的。', '謝家的少主昨天在東市打了人，城主府一聲不吭。', '欽天監的星官來了，就住在榜樓上。',
    '洞府又漲價了，一個月三十塊靈石，搶錢啊。', '聽說天衍城戒嚴了，官道關不放人。', '茶樓的說書先生，今天講的是劍仙斷天河。',
    '散修？散修在中州，連條狗都不如。', '東荒來的？東荒那種地方，也出得了修士？',
  ],
  linjiang_docks: ['上官家的樓船又要開了，往天衍城。', '扛一包十文，扛一天，夠吃兩頓。', '江裡那東西，最近夜裡老翻身。', '鶴歸渡那個老船夫，在這江上划了一百年了吧？'],
  shangguan: ['當家的在船上算帳呢。', '龍脊嶺的官司，又打輸了一場。', '謝家的人，又來壓價了。'],
  lingtian: ['靈稻快熟了，謝家的管事又要來收租。', '今年的租，比去年又多了一成。', '水車壞了，要是誤了水，一家人就完了。'],
  heguidu: ['東荒來的？瞧你這身衣裳就知道。', '老船夫說，他年輕時候，江裡沒那東西。'],
  xiejia: ['少主今天又不在莊裡。', '天劍宗的人來過了，跟老太爺說了半天話。'],
};
const calls = {
  linjiang: ['糖葫蘆——', '看榜嘍——新榜！', '讓一讓，讓一讓！', '上好的龍鬚草，十文一把！', '算命——不準不要錢——'],
  linjiang_docks: ['起——錨——', '慢點！那是上官家的貨！', '卸貨了！', '渡江的，鶴歸渡往南走！'],
  shangguan: ['點貨了！', '這一船，往天衍城！'],
  lingtian: ['（水車吱呀）', '收工嘍——'],
};

/** People with a place and an hour of their own (world/people.js EXTRAS). */
const extras = [
  {
    id: 'hg_ferryman', region: 'heguidu', name: '老船夫', look: 'fisher', at: [660, 3930], face: 1, hours: [0, 24], act: 'sit',
    calls: ['（磕了磕旱煙）'],
    chat: ['老船夫吐了個煙圈：「這邊叫鶴歸渡，那邊叫白鶴渡，一條江兩個名字。」他看了你一眼，「回不回去，都隨你。船在這兒。」'],
  },
  {
    id: 'lj_storyteller', region: 'linjiang', name: '說書人', look: 'elder', at: [1812, 3090], face: 1, hours: [9, 22], act: 'tell',
    calls: ['（醒木一拍）', '上回說到——'],
    chat: ['說書人說：「你們東荒的書，說劍仙一劍斷了天河？錯啦！」他把醒木一拍，「我們中州的書說：劍仙是被天劍宗的祖師逼死的——欠了人家一條命，才有天劍宗。」'],
  },
  {
    id: 'lj_crier', region: 'linjiang', name: '看榜的', look: 'villager', at: [1760, 2880], face: 1, hours: [7, 21], act: 'stand',
    calls: ['新榜！新榜！', '第一名還是葉孤寒！'],
    chat: ['看榜的人指著榜說：「你看，第一名，天劍宗葉孤寒；第二名，大衍的三皇子；第三名……這個林塵是誰？去年還沒有他。」'],
  },
  {
    id: 'lt_tenant', region: 'lingtian', name: '佃農', look: 'farmer', at: [2500, 3530], face: -1, hours: [6, 19], act: 'stand',
    calls: ['（擦汗）'],
    chat: ['佃農直起腰：「田是謝家的，水是謝家的，連天上下的雨，都得給謝家交一成。」他笑了笑，又彎下腰去。'],
  },
];

/** The small lives of each region (world/wildlife.js WILDLIFE). */
const wildlife = {
  zz_wilds: { n: 4, kinds: [['rabbit', 4, 'any', 'wild', [1, 2]], ['crow', 3, 'day', 'wild', [2, 3]], ['deer', 2, 'day', 'wild', [1, 2]], ['redfox', 2, 'night', 'wild', [1, 1]]] },
  jiangdi: { n: 4, kinds: [['egret', 4, 'day', 'water', [1, 3]], ['crane', 2, 'day', 'water', [1, 2]]] },
  heguidu: { n: 3, kinds: [['crane', 4, 'day', 'water', [1, 3]], ['egret', 2, 'day', 'water', [1, 2]]] },
  lingtian: { n: 3, kinds: [['egret', 3, 'day', 'water', [1, 3]], ['crow', 3, 'day', 'wild', [2, 4]]] },
  cangwu: { n: 3, kinds: [['deer', 3, 'day', 'forest', [1, 2]], ['crow', 2, 'day', 'forest', [2, 3]]] },
  yunmeng: { n: 3, kinds: [['egret', 4, 'day', 'water', [1, 3]], ['crane', 1, 'day', 'water', [1, 1]]] },
  baicao: { n: 3, kinds: [['deer', 3, 'day', 'wild', [1, 2]], ['crane', 1, 'day', 'any', [1, 1]]] },
  guanxing: { n: 2, kinds: [['crow', 5, 'day', 'any', [2, 4]]] },
};

/** How far you walk before something may happen, and how likely it is (world/explore.js ENCOUNTER). */
const encounter = {
  heguidu: [1600, 0.25], guishi: [1400, 0.3], linjiang_docks: [1600, 0.25], linjiang: [1500, 0.3], shangguan: [1600, 0.25],
  jiangdi: [1100, 0.4], guanxing: [1000, 0.4], xiejia: [1600, 0.25], tianjian: [1500, 0.25], cangwu: [1000, 0.45],
  longji: [1100, 0.4], guandao_guan: [1500, 0.3], baicao: [1200, 0.35], yunmeng: [1000, 0.45], lingtian: [1400, 0.3],
  zz_river: [1200, 0], zz_wilds: [1200, 0.4],
};

/** What you notice as you walk (world/explore.js; by region, before the lines kept by kind of place). */
const ambient = {
  heguidu: ['白鶴從江霧裡飛過來，在棧橋頭落下，又飛走了。', '回頭看，江那邊白茫茫的一片——那邊是東荒。', '茶棚裡飄出一股粗茶的味道。'],
  guishi: ['牆根下蹲著幾個人，壓低了聲音說話。', '風把一盞燈籠吹得直晃。', '地上散著幾片碎符紙，燒了一半。'],
  linjiang_docks: ['一條樓船慢慢靠岸，船上的人扔下纜繩。', '腳夫們喊著號子，一包一包地卸貨。', '江面上的帆，一張連著一張。'],
  linjiang: ['頭頂上一道劍光掠過，街上的人連頭都不抬。', '兩個穿著同樣袍子的弟子並肩走過，袖口上繡著一把劍。', '一頂轎子從街心過去，前頭有人吆喝著開道。', '茶樓裡傳出一陣叫好聲。'],
  shangguan: ['夥計們把一箱一箱的貨抬上樓船。', '帳房先生的算盤，噼哩啪啦響個不停。'],
  jiangdi: ['蘆葦嘩啦啦地響，像有人在裡頭走。', '堤下的水面上，漂著一隻空船。', '遠處，一隻白鶴從蘆葦裡驚起。'],
  guanxing: ['風從石台上刮過，帶起一陣沙土。', '石縫裡長著一叢枯草，在風裡抖。', '站在山頂往南看，臨江城的屋頂一片一片，像魚鱗。'],
  xiejia: ['莊牆裡傳出絲竹聲。', '一隊家丁牽著馬，從莊門裡出來。'],
  tianjian: ['山上傳來一聲劍嘯，在山谷裡迴蕩了很久。', '劍階上，一個弟子背著比他還高的劍，一級一級地往上爬。', '雲從劍山的腰上飄過去。'],
  cangwu: ['頭頂上的樹冠密得不透光，林子裡像黃昏。', '一根比腰還粗的樹根橫在路上，上面長滿了苔蘚。', '林子深處，有什麼東西咔嚓踩斷了一根枯枝。'],
  longji: ['石頭縫裡透出一絲涼氣，帶著靈氣的味道。', '嶺上的石頭，一塊一塊像龍的鱗片。'],
  guandao_guan: ['關樓上的旗子被風吹得獵獵作響。', '官道上的車轍，一直通到關門底下，就斷了。'],
  baicao: ['谷裡的藥香濃得化不開。', '一個背著藥簍的少年從你身邊跑過去。'],
  yunmeng: ['霧貼著水面飄，看不清三丈以外。', '水底下，有什麼東西慢慢游過去，帶起一道水紋。', '一隻水鳥從草叢裡驚起，叫聲像人哭。'],
  lingtian: ['靈稻的稻穗泛著淡淡的光，風一吹，像一片金色的水。', '田埂上的佃農抬頭看了你一眼，又低下頭去。'],
  zz_river: ['江水嘩嘩地流，看不見對岸。'],
  zz_wilds: ['頭頂上一道劍光掠過，眨眼就不見了。', '路邊的界碑上刻著一個字：謝。', '這裡的草，比東荒的綠。'],
};

/** Looking around properly (content/events/generic.js): what you find, by region. */
const flavor = {
  heguidu: ['你在棧橋頭站了一會兒。江霧那邊，什麼也看不見。可是你知道，青石山就在那邊。'],
  guishi: ['你在鬼市的空地上轉了一圈。白天這裡什麼也沒有，只有地上一圈一圈的燈油印子。'],
  linjiang_docks: ['你在碼頭上看了一會兒。一條船卸下來的貨，夠青石鎮吃一年。'],
  linjiang: [
    '你在臨江城的街上走了半天。賣東西的、看熱鬧的、御劍的、坐轎的——人多得像螞蟻。可是沒有一個人多看你一眼。',
    '你在茶樓裡坐了一會兒，一壺茶要十文錢。鄰桌的人在說天驕榜，說得口沫橫飛。',
  ],
  shangguan: ['你在商棧外頭看夥計們搬貨。貨箱上的字，有的是中州的，有的你一個也不認得。'],
  jiangdi: ['你沿著江堤走了一段。堤下的蘆葦裡，有人用葦子紮了一個小小的人，插在泥裡，像是在祭什麼。'],
  guanxing: ['你在石台上找到一塊沒被磨平的星圖。星星連成的線，有一條，斷在半路。'],
  xiejia: ['你繞著謝家莊走了一圈。牆太高了，什麼也看不見；只聽見裡頭有人在笑。'],
  tianjian: ['你在山門外站了很久。山上一道一道的劍光，像有人在天上寫字。'],
  cangwu: ['你在一棵老樹底下坐了一會兒。樹皮上有一道很深的劍痕，劍痕裡長出了新的樹皮。', '你撥開一叢苔蘚，底下露出一截石階，不知道通到哪裡。'],
  longji: ['你在嶺上撿到一塊石頭，石頭裡有一縷藍光，一閃就沒了。'],
  guandao_guan: ['你在關下看了一會兒。關樓上的兵丁換了一班崗。'],
  baicao: ['你在谷口聞了一會兒藥香，覺得腦子都清醒了。'],
  yunmeng: ['你在大澤邊上走了一段。泥裡有一個巨大的印子，像什麼東西的鱗，一片就有臉盆那麼大。'],
  lingtian: ['你在田埂上走了一段。靈稻的稻穗，一粒一粒都是飽的。'],
  zz_wilds: ['你在野地裡走了一陣。頭頂上一道劍光掠過，劍上的人低頭看了你一眼，又飛遠了。'],
};
const loot = {
  heguidu: [['mind', 1]],
  guishi: [['maybe', 0.2, [['item', 'mystery', 1]]]],
  linjiang_docks: [['mind', 1]],
  linjiang: [['mind', 1]],
  shangguan: [['mind', 1]],
  jiangdi: [['maybe', 0.3, [['item', 'jiangli', 1]]]],
  guanxing: [['insight', 1]],
  xiejia: [['mind', 1]],
  tianjian: [['insight', 1]],
  cangwu: [['maybe', 0.25, [['item', 'zizhi', 1]]]],
  longji: [['maybe', 0.3, [['ls', 6]]]],
  guandao_guan: [['mind', 1]],
  baicao: [['maybe', 0.4, [['item', 'longxu_grass', 2]]]],
  yunmeng: [['maybe', 0.2, [['item', 'jiangli', 2]]]],
  lingtian: [['mind', 1]],
  zz_wilds: [['maybe', 0.3, [['item', 'longxu_grass', 1]]]],
};

/** Their days (world/people.js ROUTINES): [from hour, [x, y], what they do, facing?]. */
const routines = {
  xiao_qi: {
    guishi: [
      [0, [900, 3420], 'stand'],
      [4, [1040, 3530], 'home'],
      [20, [900, 3420], 'stand'],
    ],
  },
  shangguan_jin: {
    shangguan: [
      [0, [1000, 2160], 'home'],
      [8, [700, 2210], 'stand'],
      [18, [1000, 2160], 'home'],
    ],
  },
  xie_xuanlang: {
    linjiang: [
      [0, [2130, 2610], 'home'],
      [10, [1900, 3090], 'stand'],
      [16, [1760, 2880], 'stand'],
      [21, [2130, 2610], 'home'],
    ],
  },
  su_qingyao: {
    linjiang: [
      [0, [1790, 2740], 'home'],
      [8, [1810, 2880], 'stand'],
      [19, [1790, 2740], 'home'],
    ],
  },
  ye_guhan: {
    tianjian: [
      [0, [4450, 1770], 'stand'],
    ],
  },
};

/** Where they stand, by the region they are in (places.js NPC_SPOTS). */
const spots = {
  xiao_qi: { guishi: [900, 3420] },
  shangguan_jin: { shangguan: [700, 2210] },
  xie_xuanlang: { linjiang: [1900, 3090] },
  su_qingyao: { linjiang: [1810, 2880] },
  ye_guhan: { tianjian: [4450, 1770] },
};

/** The air of each region in the 3D world (art/world3d.js MOODS). */
const moods = {
  heguidu: { tint: [0.9, 0.92, 0.94], amount: 0.24, dim: 1.02, motes: null },
  guishi: { tint: [0.82, 0.8, 0.8], amount: 0.2, dim: 0.96, motes: null },
  linjiang_docks: { tint: [0.92, 0.9, 0.86], amount: 0.16, dim: 1, motes: null },
  linjiang: { tint: [0.94, 0.9, 0.84], amount: 0.14, dim: 1.02, motes: null },
  shangguan: { tint: [0.92, 0.9, 0.86], amount: 0.16, dim: 1, motes: null },
  jiangdi: { tint: [0.88, 0.92, 0.9], amount: 0.26, dim: 1, motes: null },
  guanxing: { tint: [0.86, 0.84, 0.8], amount: 0.28, dim: 0.96, motes: 'ash' },
  xiejia: { tint: [0.94, 0.9, 0.86], amount: 0.14, dim: 1.02, motes: null },
  tianjian: { tint: [0.9, 0.92, 0.96], amount: 0.22, dim: 1.04, motes: 'mote' },
  cangwu: { tint: [0.6, 0.7, 0.6], amount: 0.42, dim: 0.78, sun: 0.55, motes: 'mote' },
  longji: { tint: [0.86, 0.88, 0.92], amount: 0.2, dim: 1, motes: 'mote' },
  guandao_guan: { tint: [0.9, 0.88, 0.84], amount: 0.2, dim: 1, motes: null },
  baicao: { tint: [0.86, 0.94, 0.84], amount: 0.24, dim: 1.02, motes: 'mote' },
  yunmeng: { tint: [0.74, 0.82, 0.8], amount: 0.46, dim: 0.88, motes: null },
  lingtian: { tint: [0.96, 0.94, 0.84], amount: 0.14, dim: 1.04, motes: null },
  zz_river: { tint: [0.88, 0.9, 0.94], amount: 0.3, dim: 1, motes: null },
  zz_wilds: { tint: [0.92, 0.94, 0.9], amount: 0.16, dim: 1.02, motes: null },
};

export const ZHONGZHOU_LAND = { ...ZHONGZHOU_LAND_BASE, gather, wanderers, folk, calls, extras, wildlife, encounter, ambient, flavor, loot, routines, spots, moods };
