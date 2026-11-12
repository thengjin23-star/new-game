// 中州・天衍城 (1.2): the capital of 大衍, three days east of 官道關 on the 官道 (or a moment through the
// 傳送陣 from 臨江城). The road comes in from the west between low hills, past the boundary stone and the
// 十里亭, to the west gate of the 外城 — the biggest city under heaven: the 驛館, the 傳送陣's plaza, the
// 拍賣行, the 天驕閣 where the capital's 天驕榜 hangs, the 京兆府, the markets, the 散修's lane. North of
// its walls a white peak stands up alone out of the plain — 玉指峰, "shaped like a finger" — and on a
// terrace cut into its south face, three hundred steps up, the 皇城 (the 禁軍 keep its stair, the 大陣 its
// air); at the back of the terrace, under the cliff, 欽天監. The top of the peak, the 觀星台, is sealed
// (1.2) and only the flying reach it. North-west, the founder's tomb (大衍皇陵) at the end of its 神道,
// and behind the peak the long slope under its north face; east, the 禁苑, the hunting park of the
// emperors, round its lake; south, the capital's fields. Region ids are this map's own.

import { T } from '../geo.js';
import { fbm } from '../noise.js';

// ── the land ──

/** The 外城's walls: [x0, y0, x1, y1] (the ring of cells just inside it is wall; the roads make its four gates). */
const CITY = [1600, 2640, 3800, 3840];

/** 玉指峰's mass, and the terrace of the 皇城 on its south face (the SECT below). */
const MASSIF = [[2060, 900], [3340, 900], [3380, 2440], [2020, 2440]];

/** Regions, in priority order (the first shape containing a cell owns it). */
const REGION_SHAPES = [
  // the founder's 地宮, behind the 陵門 (it reads as the 皇陵 till the way down is open)
  { id: 'hl_gong', circle: [1180, 640, 90], requires: 'hl_open' },
  // the top of the finger: up where no road goes (for those the 皇城's 大陣 lets through the air)
  { id: 'yuzhi', ellipse: [2700, 1210, 150, 112] },
  // 欽天監: the back of the terrace, under the cliff of the peak
  { id: 'qintianjian', ellipse: [2700, 1580, 340, 120] },
  { id: 'huangcheng', poly: MASSIF },
  // the 外城, and the plaza north of its wall before the 御階 (午門外)
  { id: 'waicheng', poly: [[CITY[0], 2440], [CITY[2], 2440], [CITY[2], CITY[3]], [CITY[0], CITY[3]]] },
  { id: 'ty_road', poly: [[150, 2600], [1580, 2760], [1580, 3700], [150, 3300]] },
  // the 皇陵: the hills north-west, and the long slope behind the peak
  { id: 'huangling', poly: [[420, 250], [3430, 250], [3430, 880], [1990, 880], [1990, 2380], [440, 2380]] },
  { id: 'jinyuan', poly: [[3430, 250], [5050, 250], [5050, 3200], [3840, 3200], [3840, 2440], [3430, 2440]] },
  { id: 'jingjiao', poly: [[1300, 3880], [4300, 3880], [4400, 4380], [1200, 4380]] },
  { id: 'ty_wilds', default: true },
];

/** Rock: [cx, cy, rx, ry]. */
const PEAKS = [
  // the finger itself, standing up out of its massif behind the terrace
  [2700, 1230, 240, 210],
  // the mound over the founder's tomb
  [1180, 420, 240, 130],
  // the 皇陵's hills
  [620, 900, 180, 140],
  [760, 1750, 150, 120],
  [2150, 470, 150, 100],
  // north-east, over the 禁苑
  [4400, 520, 210, 130],
  [4900, 1250, 120, 180],
  [4900, 2850, 110, 150],
  // the hills the 官道 comes in between
  [600, 2420, 180, 120],
  [720, 3480, 200, 120],
  // the south
  [1000, 4150, 220, 120],
  [4700, 4150, 240, 120],
  [380, 3950, 150, 120],
];

/**
 * The 皇城: a terrace on the south face of 玉指峰 (its massif), the palace on it, the 御階 up to it from
 * the 外城's north gate. No gate in the road: the 禁軍 at the foot of the stair are the gate (content/
 * events/tianyan.js); the 大陣 keeps the air over the terrace and the peak (world/air.js) for those with
 * the 皇城's token. level: the terrace stands lower than a sect's mountaintop.
 */
const SECT = {
  massif: MASSIF,
  plateau: [2700, 1760, 460, 260],
  gateY: 2240,
  gateX: null,
  level: 150,
  // the 御階 climbs evenly from the foot of the terrace to the 午門 (height.js)
  stair: { endY: 1990, footY: 2440 },
  name: '皇城',
  ward: '護城大陣',
  member: 'huangcheng_pass',
};

/** 禁苑's lake (太液池), a pond in it, and one in the fields: [cx, cy, rx, ry, level?]. */
const LAKES = [
  [4480, 1800, 320, 200],
  [4100, 2700, 120, 80],
  [3500, 4170, 130, 70],
];

/** The top of the finger (玉指峰's 觀星台), where only the flying come; level: how high its ground stands. */
const AIRY = [{ id: 'yuzhi', kind: 'summit', at: [2700, 1210], r: [140, 104], level: 460 }];

/** Roads, lanes, trails (a road through a wall is a gate). */
const ROADS = [
  // the 官道, in from the west between the hills, to the west gate
  { kind: 'road', width: 56, pts: [[110, 2900], [600, 2960], [1100, 3110], [1400, 3200], [1600, 3240]] },
  // the 外城's streets: the 長街 gate to gate, the 御街 from the south gate to the north, the lanes between the blocks
  { kind: 'lane', width: 44, pts: [[1600, 3240], [2700, 3240], [3800, 3240]] },
  { kind: 'lane', width: 56, pts: [[2700, 3840], [2700, 3240], [2700, 2640]] },
  { kind: 'lane', width: 30, pts: [[1640, 2950], [3760, 2950]] },
  { kind: 'lane', width: 30, pts: [[1640, 3530], [3760, 3530]] },
  { kind: 'lane', width: 30, pts: [[2160, 2680], [2160, 3800]] },
  { kind: 'lane', width: 30, pts: [[3240, 2680], [3240, 3800]] },
  // the 御階: out of the north gate, across the plaza, up the face of the terrace to the 午門
  { kind: 'road', width: 50, pts: [[2700, 2660], [2700, 2440], [2700, 2240], [2700, 1990]] },
  // the 神道: off the 官道 at the west gate, north to the founder's tomb
  { kind: 'road', width: 44, pts: [[1450, 3200], [1430, 2700], [1340, 2200], [1230, 1700], [1190, 1200], [1180, 820]] },
  // on past the tomb under the north face of the peak, and down into the 禁苑
  { kind: 'trail', width: 30, pts: [[1190, 1060], [1600, 980], [2100, 820], [2700, 800], [3200, 820], [3650, 980], [4000, 1300]] },
  // out of the east gate to the 禁苑, its lodge, and the lake
  { kind: 'road', width: 44, pts: [[3800, 3240], [4050, 3180], [4250, 2950], [4400, 2650], [4450, 2420]] },
  { kind: 'trail', width: 28, pts: [[4450, 2420], [4250, 2150], [4120, 1700], [4000, 1300]] },
  { kind: 'trail', width: 28, pts: [[4450, 2420], [4780, 2200], [4850, 1700], [4750, 1200]] },
  // out of the south gate to the fields
  { kind: 'road', width: 44, pts: [[2700, 3840], [2700, 4060], [2400, 4200], [2000, 4250]] },
  { kind: 'trail', width: 28, pts: [[2700, 4060], [3100, 4120], [3700, 4000], [4200, 3700]] },
];

/** The edge: mountains all round; the way in is the 官道 from the west (from 官道關, on 中州's other map). */
const BORDER = {
  north: 170, west: 150, south: 4370, east: 5050,
  gaps: [{ side: 'west', at: 2900, half: 170, depth: 360 }],
};

/**
 * The lie of the land: the capital's plain, low and level; the 皇陵's hills high in the north-west, the
 * slope behind the peak higher; the 禁苑 round its lake; the hills the road comes in through.
 */
const UPLAND = [
  [2700, 3240, 22, 800], [1100, 1300, 90, 520], [2700, 560, 84, 460], [600, 2950, 46, 420], [4480, 1800, 24, 520],
  [4600, 700, 86, 400], [2700, 4150, 14, 600], [4700, 3800, 36, 420], [600, 4000, 40, 420], [3900, 2700, 28, 320],
  [1500, 2500, 40, 320], [3600, 2200, 34, 300],
];

export const TIANYAN_GEO = {
  REGION_SHAPES,
  PEAKS, AIRY, CLIFF_LINES: [], VALLEY: null, SECT, RIVERS: [], LAKES, ROADS,
  MARKET_WALL: CITY, WALL_LOOK: { mud: false, name: '天衍' }, BORDER,
  EDGE_RIVER: null, RIVER_REGION: null,
  MIST_SAY: '雲霧太濃，辨不清方向。',
  // the sky over the 外城 is the 禁軍's (world/explore.js cityWatch; content/events/tianyan.js ty_nofly)
  NO_FLY: { region: 'waicheng', name: '天衍城', event: 'ty_nofly' },
  // the capital builds as 中州 does: white stone and lime plaster under deep slate tile
  BUILD_PALETTE: { plaster: [240, 238, 232], wallCream: [234, 230, 220], tile: [50, 56, 68], tile2: [62, 64, 72], stone: [208, 206, 198], stoneDark: [160, 158, 150] },
  HOME_REGION: 'ty_wilds', REACH_FROM: [400, 2930], UPLAND,
};

// ── what lies on it, and how (by region; merged into the tables kept elsewhere) ──

/** The ground of each region (terrain.js BASE). */
const ground = {
  ty_road: (x, y) => {
    const n = fbm(x / 120, y / 120, 1201);
    return n > 0.64 ? T.HILL : n < 0.3 ? T.TALLGRASS : T.GRASS;
  },
  // inside the walls: flagstones, and the gardens of the houses
  waicheng: (x, y) => (fbm(x / 70, y / 70, 1202) > 0.66 ? T.GRASS : T.PAVED),
  huangcheng: () => T.PAVED,
  qintianjian: () => T.PAVED,
  yuzhi: () => T.HILL,
  // the old cypress woods round the tomb
  huangling: (x, y) => {
    const n = fbm(x / 130, y / 130, 1203);
    return n > 0.56 ? T.FOREST : fbm(x / 90, y / 90, 1204) > 0.66 ? T.HILL : T.GRASS;
  },
  hl_gong: () => T.PAVED,
  jinyuan: (x, y) => {
    const n = fbm(x / 150, y / 150, 1205);
    return n > 0.54 ? T.FOREST : n < 0.3 ? T.TALLGRASS : T.GRASS;
  },
  jingjiao: (x, y) => (fbm(x / 200, y / 200, 1206) > 0.78 ? T.GRASS : T.FARM),
  ty_wilds: (x, y) => {
    const n = fbm(x / 260, y / 260, 1207);
    const m = fbm(x / 150, y / 150, 1208);
    if (n > 0.66) return T.FOREST;
    if (m > 0.7) return T.HILL;
    return n < 0.3 ? T.TALLGRASS : T.GRASS;
  },
};

/** Which trees (terrain.js TREE_MIX). */
const trees = {
  ty_road: [['pine', 60], ['leaf', 40]],
  waicheng: [['willow', 40], ['leaf', 60]],
  huangcheng: [['pine', 70], ['leaf', 30]],
  qintianjian: [['pine', 100]],
  yuzhi: [['pine', 100]],
  huangling: [['pine', 60], ['dark', 40]],
  hl_gong: [['dead', 100]],
  jinyuan: [['leaf', 50], ['pine', 25], ['bamboo', 25]],
  jingjiao: [['willow', 70], ['leaf', 30]],
  ty_wilds: [['leaf', 60], ['pine', 40]],
};

/** Settled ground sits level (height.js SETTLED): [height, roll]. */
const settled = { waicheng: [22, 2], jingjiao: [16, 1] };

/** How much wild ground rolls (height.js ROLL). */
const roll = { ty_road: 20, huangling: 24, jinyuan: 14, ty_wilds: 22, yuzhi: 4, hl_gong: 2, huangcheng: 6, qintianjian: 4 };

/** Under a mountain, the ground is the land's (art/worldview.js). */
const under = {
  ty_road: T.HILL, waicheng: T.PAVED, huangcheng: T.HILL, qintianjian: T.HILL, yuzhi: T.HILL, huangling: T.HILL, hl_gong: T.HILL,
  jinyuan: T.GRASS, jingjiao: T.FARM, ty_wilds: T.GRASS,
};

/** Woods in the open (terrain.js GROVE): a tree now and then. */
const grove = { ty_wilds: 0.03, ty_road: 0.025, jingjiao: 0.008, jinyuan: 0.03, huangling: 0.03 };

/** What each region sounds like (audio/director.js PLACE). */
const sound = {
  ty_road: 'hill', waicheng: 'city', huangcheng: 'palace', qintianjian: 'starhall', yuzhi: 'peak', huangling: 'tomb', hl_gong: 'tomb',
  jinyuan: 'forest', jingjiao: 'farm', ty_wilds: 'hill',
};

export const TIANYAN_LAND_BASE = { ground, trees, settled, roll, under, grove, sound };

/** The capital's own colours (art/worldview.js): its flagstones pale, its fields green. */
export const TIANYAN_PALETTE = {
  [T.PAVED]: { all: [212, 208, 198] },
  [T.FARM]: { spring: [170, 188, 120], summer: [146, 172, 104], autumn: [204, 184, 112], winter: [214, 210, 196] },
};

// ── places ──

/** The regions as places (map.js NODES). */
export const TIANYAN_NODES = {
  ty_road: {
    name: '天衍官道', kind: 'pass', qi: 0.9, danger: 1, at: [520, 2950], label: [560, 2780],
    desc: '出了官道關，往東走了三天，山勢緩了下來，官道兩邊的田多了起來。路邊的界碑上刻著兩個字：天衍。再往東，就看得見那座白色的山了。',
  },
  waicheng: {
    name: '天衍城', kind: 'town', qi: 1.2, danger: 0, at: [2700, 3240], label: [2700, 2700],
    desc: '大衍皇朝的都城，天下第一大城。城牆一眼望不到頭，街比臨江城的寬一倍。往北看，城的盡頭立著一座孤峰，白得像玉——玉指峰；峰腰的高台上，是皇城。',
  },
  huangcheng: {
    name: '皇城', kind: 'palace', qi: 1.5, danger: 2, at: [2700, 1960], label: [2700, 2160],
    desc: '玉指峰南面山腰上的一座高台，台上是大衍的宮城。御階從外城的北門一直通到午門，三百級，每一級都站著禁軍。',
  },
  qintianjian: {
    name: '欽天監', kind: 'temple', qi: 1.8, danger: 2, at: [2700, 1640], label: [2700, 1470],
    desc: '皇城高台的最裡頭，貼著玉指峰的山壁，是欽天監的星官署。天下的天驕榜，都是從這裡發出去的。',
  },
  yuzhi: {
    name: '玉指峰', kind: 'summit', air: true, qi: 2.4, danger: 4, secludeRisk: 0.5, at: [2640, 1230], label: [2700, 1050],
    desc: '玉指峰的峰頂。白色的石頭溫潤得像玉，摸上去卻是涼的。峰頂上是欽天監的觀星台；三千年來，大衍的星官在這裡看天。',
  },
  huangling: {
    name: '大衍皇陵', kind: 'tomb', qi: 1.6, danger: 3, secludeRisk: 0.35, at: [1240, 1480], label: [1200, 1880],
    desc: '城西北的山裡，大衍開國皇帝的陵。一條神道筆直地往北，兩邊站著石人石馬，盡頭是陵門。陵門後面的土丘上長滿了柏樹，三千年沒有人上去過。',
  },
  hl_gong: {
    name: '皇陵地宮', kind: 'cave', qi: 1.9, danger: 4, secludeRisk: 0.4, at: [1180, 650],
    desc: '陵門後面，往下走九十九級台階，是開國皇帝的地宮。穹頂上畫著星圖，星與星之間連著線，有一條線斷在半路。',
  },
  jinyuan: {
    name: '禁苑', kind: 'forest', qi: 1.5, danger: 3, secludeRisk: 0.35, at: [4400, 2500], label: [4500, 2300],
    desc: '城東的皇家獵場，圍著一片大湖（太液池）。林子裡養著天下各地進貢來的珍禽異獸，有的養了幾百年，比禁軍還老。閒人止步。',
  },
  jingjiao: {
    name: '京郊', kind: 'farm', qi: 1.0, danger: 1, at: [2620, 4150], label: [2700, 4000],
    desc: '城南的田，是皇莊。田埂筆直，水渠筆直，連田裡的佃戶走路都是直的。',
  },
  ty_wilds: {
    name: '京畿', kind: 'wilds', qi: 1.0, danger: 2, secludeRisk: 0.25, at: [4500, 3700], label: [4500, 3550],
    desc: '都城四周的野地。路上的人比別處多：進京的、出京的、趕考的、告狀的。頭頂上的劍光，到了城牆邊就都落了下來。',
  },
};

/** Buildings, places to walk up to (places.js STRUCTURES / POIS, for this map). */
const STRUCTURES = [
  // 天衍官道: the boundary stone, the tea shed, the 十里亭
  { x: 330, y: 2850, w: 18, h: 8, sprite: 'stele', block: false, name: '天衍', landmark: true },
  { x: 720, y: 3070, w: 70, h: 44, sprite: 'teashed' },
  { x: 1170, y: 3020, w: 44, h: 44, sprite: 'pavilion', landmark: true },
  // the 外城 — the gate towers over the four gates
  { x: 1600, y: 3240, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  { x: 3800, y: 3240, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  { x: 2700, y: 3840, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  { x: 2700, y: 2640, w: 26, h: 26, sprite: 'tower', block: false, landmark: true },
  // north-west block: houses, a well
  { x: 1760, y: 2790, w: 70, h: 44, sprite: 'house' },
  { x: 1960, y: 2800, w: 70, h: 44, sprite: 'house' },
  { x: 1860, y: 2880, w: 18, h: 18, sprite: 'well', block: false },
  // by the north gate: the 京兆府 (its courtyard, its gate), and the 天驕閣
  { x: 2420, y: 2810, w: 300, h: 200, paint: T.PAVED },
  { x: 2420, y: 2780, w: 180, h: 90, sprite: 'bighall', name: '京兆府', landmark: true },
  { x: 2420, y: 2890, w: 90, h: 10, sprite: 'paifang', block: false },
  { x: 2980, y: 2790, w: 56, h: 56, sprite: 'pagoda', name: '天驕閣', landmark: true },
  { x: 3120, y: 2810, w: 80, h: 50, sprite: 'hall' },
  // north-east block: the town houses of the 世家
  { x: 3430, y: 2800, w: 170, h: 90, sprite: 'mansion' },
  { x: 3650, y: 2810, w: 150, h: 86, sprite: 'mansion' },
  // by the west gate: the 驛館
  { x: 1800, y: 3080, w: 130, h: 64, sprite: 'hall', name: '驛館', landmark: true },
  { x: 1990, y: 3070, w: 70, h: 44, sprite: 'house' },
  // the 傳送陣's plaza
  { x: 2430, y: 3090, w: 280, h: 200, paint: T.PAVED },
  { x: 2430, y: 3060, w: 60, h: 14, sprite: 'skygate', block: false, name: '傳送陣', landmark: true },
  { x: 2320, y: 3140, w: 18, h: 8, sprite: 'stele', block: false },
  { x: 2540, y: 3140, w: 18, h: 8, sprite: 'stele', block: false },
  // the 拍賣行
  { x: 2960, y: 3080, w: 160, h: 80, sprite: 'auction', name: '天衍拍賣行', landmark: true },
  { x: 3150, y: 3020, w: 70, h: 44, sprite: 'shop' },
  // east of the 長街's crossing: a mansion, houses
  { x: 3480, y: 3080, w: 170, h: 90, sprite: 'mansion' },
  { x: 3680, y: 3060, w: 70, h: 44, sprite: 'house' },
  // south-west of the crossing: the inn
  { x: 1820, y: 3380, w: 110, h: 60, sprite: 'teahouse', name: '客棧' },
  { x: 2030, y: 3340, w: 60, h: 40, sprite: 'house' },
  { x: 2030, y: 3450, w: 60, h: 40, sprite: 'house' },
  // the 坊市: stalls, shops
  { x: 2260, y: 3320, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 2370, y: 3310, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 2480, y: 3320, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 2300, y: 3440, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 2420, y: 3450, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 2590, y: 3330, w: 60, h: 40, sprite: 'shop' },
  { x: 2590, y: 3450, w: 60, h: 40, sprite: 'shop' },
  // the 醉仙樓, and the shops beside it
  { x: 2900, y: 3380, w: 120, h: 64, sprite: 'teahouse', name: '醉仙樓', landmark: true },
  { x: 3120, y: 3330, w: 80, h: 46, sprite: 'shop' },
  { x: 3120, y: 3450, w: 80, h: 46, sprite: 'shop' },
  // the 天衍觀 in its court
  { x: 3500, y: 3390, w: 260, h: 200, paint: T.PAVED },
  { x: 3500, y: 3370, w: 140, h: 80, sprite: 'shrine', name: '天衍觀', landmark: true },
  { x: 3690, y: 3420, w: 40, h: 40, sprite: 'pagoda' },
  // the south-west block: the lane of the 散修, the 洞府行
  { x: 1720, y: 3640, w: 60, h: 40, sprite: 'house' },
  { x: 1830, y: 3640, w: 60, h: 40, sprite: 'house' },
  { x: 1720, y: 3740, w: 50, h: 34, sprite: 'hut' },
  { x: 1990, y: 3740, w: 80, h: 44, sprite: 'shop', name: '洞府行' },
  // the 懸賞堂, houses
  { x: 2350, y: 3660, w: 120, h: 60, sprite: 'hall', name: '懸賞堂' },
  { x: 2570, y: 3640, w: 70, h: 44, sprite: 'house' },
  { x: 2570, y: 3750, w: 60, h: 36, sprite: 'house' },
  // the smith, houses
  { x: 2880, y: 3660, w: 90, h: 50, sprite: 'smithy', name: '兵器鋪' },
  { x: 3080, y: 3650, w: 70, h: 44, sprite: 'house' },
  { x: 3420, y: 3660, w: 70, h: 44, sprite: 'house' },
  { x: 3600, y: 3670, w: 70, h: 44, sprite: 'house' },
  // 午門外: the arch at the foot of the stair, the stone that says get down off your horse
  { x: 2700, y: 2470, w: 120, h: 10, sprite: 'paifang', block: false, name: '皇城', landmark: true },
  { x: 2590, y: 2560, w: 18, h: 8, sprite: 'stele', block: false, name: '下馬' },
  // the 皇城: the 午門 at the top of the stair, the great hall, its side halls, the 禁軍's barracks, the garden
  { x: 2700, y: 2040, w: 30, h: 30, sprite: 'tower', block: false, name: '午門', landmark: true },
  { x: 2700, y: 1830, w: 200, h: 100, sprite: 'bighall', name: '太極殿', landmark: true },
  { x: 2950, y: 1910, w: 110, h: 56, sprite: 'hall' },
  { x: 2450, y: 1910, w: 110, h: 56, sprite: 'hall', name: '禁軍營' },
  { x: 3070, y: 1790, w: 44, h: 44, sprite: 'pavilion' },
  { x: 2330, y: 1790, w: 44, h: 44, sprite: 'pavilion' },
  // 欽天監, under the cliff: the 星官署, the 抄本閣, the stone of its rule, the arch at the sealed stair up the peak
  { x: 2560, y: 1620, w: 120, h: 56, sprite: 'hall', name: '星官署', landmark: true },
  { x: 2850, y: 1600, w: 50, h: 50, sprite: 'pagoda', name: '抄本閣', landmark: true },
  { x: 2700, y: 1690, w: 18, h: 8, sprite: 'stele', block: false, name: '欽天' },
  { x: 2700, y: 1540, w: 60, h: 10, sprite: 'paifang', block: false, name: '天梯' },
  // 玉指峰: the 觀星台 on its top
  { x: 2700, y: 1150, w: 90, h: 60, sprite: 'observatory', name: '觀星台', landmark: true },
  // 大衍皇陵: the arch at the start of the 神道, the stone men along it, the tablet's pavilion, the 陵門
  { x: 1340, y: 2150, w: 100, h: 10, sprite: 'paifang', block: false, name: '大衍', landmark: true },
  { x: 1170, y: 1800, w: 14, h: 8, sprite: 'stele', block: false },
  { x: 1300, y: 1800, w: 14, h: 8, sprite: 'stele', block: false },
  { x: 1140, y: 1560, w: 14, h: 8, sprite: 'stele', block: false },
  { x: 1280, y: 1560, w: 14, h: 8, sprite: 'stele', block: false },
  { x: 1120, y: 1320, w: 14, h: 8, sprite: 'stele', block: false },
  { x: 1260, y: 1320, w: 14, h: 8, sprite: 'stele', block: false },
  { x: 1290, y: 1130, w: 50, h: 50, sprite: 'pavilion' },
  { x: 1180, y: 780, w: 90, h: 20, sprite: 'stonegate', block: false, landmark: true },
  // behind the peak: what is left of the walls of the 陪葬 tombs
  { x: 2400, y: 700, w: 90, h: 20, sprite: 'ruinwall' },
  { x: 3050, y: 690, w: 80, h: 20, sprite: 'ruinwall' },
  // 禁苑: its arch on the road, the hunting lodge, the pavilion on the lake, the keeper's cabin
  { x: 4220, y: 3010, w: 90, h: 10, sprite: 'paifang', block: false, name: '禁苑', landmark: true },
  { x: 4520, y: 2350, w: 120, h: 60, sprite: 'hall', name: '行宮', landmark: true },
  { x: 4130, y: 1620, w: 44, h: 44, sprite: 'pavilion' },
  { x: 4720, y: 2620, w: 60, h: 40, sprite: 'cabin' },
  // 京郊: the 皇莊's farmhouses
  { x: 2400, y: 4100, w: 70, h: 44, sprite: 'farmhouse' },
  { x: 3050, y: 4200, w: 70, h: 44, sprite: 'farmhouse' },
  { x: 3850, y: 4000, w: 70, h: 44, sprite: 'farmhouse' },
];

/** Places you can walk up to (places.js POIS, for this map). */
const POIS = [
  // 天衍官道
  { id: 'ty_west', region: 'ty_road', x: 250, y: 2900, name: '往西的官道', verb: '回頭', text: '官道往西，鑽進了兩座山之間。三天的路，走回去就是官道關。' },
  { id: 'ty_stele', region: 'ty_road', x: 330, y: 2880, name: '界碑', verb: '查看', text: '界碑上刻著「天衍」兩個大字。碑的背面還有一行小字，被人用刀刮掉了，只剩下最後兩個字：「四九」。' },
  { id: 'ty_shed', region: 'ty_road', x: 720, y: 3120, name: '茶棚', verb: '打聽', action: 'inquire' },
  { id: 'ty_pavilion', region: 'ty_road', x: 1170, y: 3070, name: '十里亭', verb: '歇腳', rest: true, text: '十里亭裡，送行的人在這裡分手，接人的人在這裡等。亭柱上寫滿了字，有的是詩，有的是名字。' },
  // 天衍城
  { id: 'wc_array', region: 'waicheng', x: 2430, y: 3110, name: '傳送陣', verb: '坐陣', glow: () => true, text: '兩根黑石柱子立在廣場正中，柱子中間的地面上刻著一圈一圈的陣紋，陣紋裡的光像水一樣流。陣師說：往臨江城，一百塊靈石。' },
  { id: 'wc_post', region: 'waicheng', x: 1800, y: 3130, name: '驛館', verb: '歇腳', rest: true, text: '驛館的院子裡拴著十幾匹馬，驛丞坐在門口翻冊子。住一晚，要看令牌；沒有令牌的，加錢。' },
  { id: 'wc_board', region: 'waicheng', x: 2980, y: 2840, name: '天驕榜', verb: '看榜', crowd: (s) => s.tod >= 8 && s.tod < 19, text: '天驕閣的牆上貼著天下的天驕榜，比臨江城的那一張大三倍，榜頭的欽天監大印紅得發亮。' },
  { id: 'wc_yamen', region: 'waicheng', x: 2420, y: 2850, name: '京兆府', verb: '查看', text: '京兆府的門口站著兩排衙役。照壁上貼著告示：「京師戒嚴，凡入城者，驗看令牌。」' },
  { id: 'wc_auction', region: 'waicheng', x: 2960, y: 3135, name: '拍賣行', verb: '看看', text: '拍賣行的門口掛著一塊牌子：「本月十五，拍凝金丹一枚。」門口排隊的人，從台階一直排到了街上。' },
  { id: 'wc_market', region: 'waicheng', x: 2400, y: 3380, name: '坊市', verb: '逛逛', crowd: (s) => s.tod >= 7 && s.tod < 20, text: '坊市裡人擠著人，賣什麼的都有：符、丹、法器、妖獸的皮、不知道哪一朝的古錢。叫賣的口音天南地北。' },
  { id: 'wc_tavern', region: 'waicheng', x: 2900, y: 3455, name: '醉仙樓', verb: '打聽', action: 'inquire', glow: (s) => s.tod >= 17 || s.tod < 2 },
  { id: 'wc_inn', region: 'waicheng', x: 1820, y: 3452, name: '客棧', verb: '歇腳', rest: true, text: '客棧的掌櫃說：「京城的店錢，臨江城的兩倍。不還價。」' },
  { id: 'wc_temple', region: 'waicheng', x: 3500, y: 3455, name: '天衍觀', verb: '查看', text: '天衍觀的正殿裡供的不是三清，是一座白玉雕的小山，形如一指。香客跪在山前，求的都是同一件事：命好。' },
  { id: 'wc_lane', region: 'waicheng', x: 1780, y: 3690, name: '散修巷', verb: '查看', text: '京城也有散修巷，比臨江城的更窄、更擠。巷口的牆上寫著一行字，被人刷了三遍白灰，還是看得出來：「命不由天」。' },
  { id: 'wc_plaza', region: 'waicheng', x: 2700, y: 2560, name: '午門外', verb: '查看', text: '外城北門外是一片石板廣場，廣場盡頭，御階順著山壁一直往上，通到雲裡的午門。下馬碑上刻著：「文武官員至此下馬」。' },
  // 皇城
  { id: 'hc_steps', region: 'huangcheng', x: 2700, y: 2380, name: '御階', verb: '查看', text: '御階一級一級往上，兩邊站著披甲的禁軍，一動不動，像兩排石像。' },
  { id: 'hc_gate', region: 'huangcheng', x: 2700, y: 2075, name: '午門', verb: '查看', text: '午門的城樓壓在御階的盡頭，門洞深得看不見另一頭。門上的匾，是開國皇帝的御筆：「天衍」。' },
  { id: 'hc_hall', region: 'huangcheng', x: 2700, y: 1895, name: '太極殿', verb: '查看', text: '太極殿前的廣場鋪著白玉，跟玉指峰是一樣的白。殿門緊閉，門前的銅鶴伸著脖子，望著北邊的山頂。' },
  { id: 'hc_barracks', region: 'huangcheng', x: 2460, y: 1976, name: '禁軍營', verb: '查看', text: '禁軍營的門口插著一排長槍，槍纓是紅的。操練的禁軍喊著號子，一刀一刀劈下去，整齊得像一個人。' },
  { id: 'hc_garden', region: 'huangcheng', x: 3070, y: 1840, name: '御花園', verb: '查看', text: '御花園裡種的花，你一種也叫不出名字。亭子底下有一口井，井口蓋著鐵蓋，蓋上貼著欽天監的封條。' },
  // 欽天監
  { id: 'qt_hall', region: 'qintianjian', x: 2560, y: 1670, name: '星官署', verb: '拜訪', text: '星官署的門開著，裡頭的星官們低著頭抄寫，一屋子都是翻紙的聲音。沒有人抬頭看你。' },
  { id: 'qt_archive', region: 'qintianjian', x: 2850, y: 1645, name: '抄本閣', verb: '查看', text: '抄本閣的門上掛著三把鎖，門前的星衛按著劍。閣頂上的窗開著，夜裡會亮燈。' },
  { id: 'qt_stele', region: 'qintianjian', x: 2700, y: 1700, name: '監規碑', verb: '查看', text: '碑上只刻了四個字：「照簿行事」。' },
  { id: 'qt_stair', region: 'qintianjian', x: 2700, y: 1560, name: '天梯', verb: '查看', text: '星官署後面，一道石階貼著山壁往上爬，爬進了雲裡。石階口橫著一道鐵柵，柵上掛著一塊木牌：「奉監正令，封山。」' },
  // 玉指峰
  { id: 'yz_platform', region: 'yuzhi', x: 2700, y: 1250, name: '觀星台', verb: '登台', text: '觀星台的台面上刻著星圖，比舊觀星台的那一張大，也新。台心有一口圓池，池子是乾的，池底一層紅色的垢，刮不下來。' },
  // 大衍皇陵
  { id: 'hl_arch', region: 'huangling', x: 1340, y: 2190, name: '神道', verb: '查看', text: '牌坊上的字是「大衍」。牌坊後面，一條石板神道筆直地往北，兩邊站著石人石馬，一對一對的，一直排到山裡。' },
  { id: 'hl_statues', region: 'huangling', x: 1235, y: 1600, name: '石像生', verb: '查看', text: '石人的臉都被風雨磨平了，只剩下手裡的笏板和刀。有一尊石人的眼睛是新鑿的，鑿得很深，像是有人想讓它看見什麼。' },
  { id: 'hl_stele', region: 'huangling', x: 1290, y: 1185, name: '聖德碑', verb: '查看', text: '碑亭裡立著開國皇帝的聖德碑，碑文很長，說的都是天命：天命所歸，天命不可違，天命如此。' },
  { id: 'hl_gate', region: 'huangling', x: 1180, y: 830, name: '陵門', verb: '查看', text: '陵門是兩根石柱，門楣塌了一半。門後的台階往下沒進黑暗裡，台階口趴著一隻很大的石龜，背上馱著一塊無字碑。' },
  { id: 'hl_face', region: 'huangling', x: 2700, y: 850, name: '峰背', verb: '查看', text: '從北面看，玉指峰更像一根指頭了：白，直，指節的地方有一道一道的橫紋。山腳的石縫裡長著一叢紅草，別處都沒有。' },
  // 皇陵地宮 (once the way down is open)
  { id: 'hlg_coffin', region: 'hl_gong', x: 1180, y: 610, name: '梓宮', verb: '查看', show: (s) => !!s.flags.hl_open, text: '地宮正中停著一口石棺，棺蓋上刻著一個人，閉著眼睛，手裡握著一支筆。' },
  { id: 'hlg_mural', region: 'hl_gong', x: 1110, y: 670, name: '壁畫', verb: '查看', show: (s) => !!s.flags.hl_open, text: '地宮的牆上畫著壁畫：七個人坐在一座白色的山下，聽一個人講星星。講的人背對著畫外，看不見臉。' },
  // 禁苑
  { id: 'jy_gate', region: 'jinyuan', x: 4220, y: 3050, name: '禁苑', verb: '查看', text: '牌坊上兩個字：禁苑。牌坊底下立著一塊鐵牌：「擅入者，以盜論。」鐵牌上有幾道爪痕，很深。' },
  { id: 'jy_lodge', region: 'jinyuan', x: 4520, y: 2410, name: '行宮', verb: '查看', text: '皇帝打獵時住的行宮，一年住不了一回。看守的老太監坐在台階上打瞌睡，腳邊趴著一隻比狗還大的白貓。' },
  { id: 'jy_lake', region: 'jinyuan', x: 4180, y: 1940, name: '太液池', verb: '查看', text: '太液池的水是綠的，綠得發亮。湖心有一座小島，島上的樹開著白花，花瓣落進水裡，就沉了下去。' },
  // 京郊
  { id: 'jj_field', region: 'jingjiao', x: 2400, y: 4150, name: '皇莊', verb: '查看', text: '皇莊的田埂上立著一塊石牌：「御田」。田裡的佃戶彎著腰插秧，一行一行，像用尺量過。' },
];

/** What roams (places.js BEASTS, for this map): 1.2's foes come with the content (content/foes.js). */
const BEASTS = [];

export const TIANYAN_PLACES = { STRUCTURES, POIS, BEASTS };

// ── who lives here ──

/** The people of the capital (world/npcs.js NAMED). */
export const TIANYAN_PEOPLE = {
  wei_changgeng: {
    name: '衛長庚', title: '欽天監監正', gender: '男', age: 412, realm: 4, stage: 1, loc: 'qintianjian',
    bio: '欽天監的監正，看上去不過五十，鬢角白了一半。管了天下的星象兩百年，天驕榜上的每一個名字，都是他點過頭的。說話很慢，像是每一個字都先在命簿上查過。',
  },
};

// ── the rest of how it lives (by region; merged into the tables kept elsewhere) ──

/** Which herbs grow where, and how many spots (places.js GATHER). */
const gather = {
  ty_wilds: { n: 12, give: [[70, 'longxu_grass', 1, 2], [30, 'ningqi_grass', 1, 2]] },
  ty_road: { n: 5, give: [[100, 'longxu_grass', 1, 1]] },
  huangling: { n: 8, give: [[60, 'longxu_grass', 1, 2], [40, 'zizhi', 1, 1]] },
  jinyuan: { n: 10, give: [[50, 'zizhi', 1, 1], [30, 'longxu_grass', 1, 2], [20, 'jiangli', 1, 2]] },
  jingjiao: { n: 3, give: [[100, 'ningqi_grass', 1, 1]] },
};

/** How many people walk about (places.js WANDERERS), what they say, and what they call out (world/people.js). */
const wanderers = { waicheng: 12, jingjiao: 3, ty_road: 2 };
const folk = {
  waicheng: [
    '玉指峰封山快一年了，欽天監說是天象。', '今年的血月，聽說又多了兩回。', '拍賣行這個月拍凝金丹，起價三千。',
    '別在城上飛，禁軍的箭可不長眼。', '天驕榜換了，第一名還是葉孤寒。', '京兆府又在查令牌了，沒令牌的都被趕出城了。',
    '世家這兩年都在囤靈石，囤來做什麼？', '東荒？東荒在哪兒？', '欽天監的星官，走路都是看天的。',
  ],
  jingjiao: ['御田的米，進宮的。', '欽天監說今年有大雨，叫我們早點收。', '收工嘍，天黑了別往皇陵那邊走。'],
  ty_road: ['往京城去的？令牌帶好。', '過了十里亭，就看得見玉指峰了。'],
};
const calls = {
  waicheng: ['糖人兒——', '看榜嘍——天下的天驕榜！', '讓道！讓道！', '上好的符紙，京城的貨！', '算命——算不準不要錢——'],
  jingjiao: ['（水車吱呀）'],
};

/** People with a place and an hour of their own (world/people.js EXTRAS). */
const extras = [
  {
    id: 'wc_array_master', region: 'waicheng', name: '陣師', look: 'elder', at: [2490, 3050], face: -1, hours: [6, 22], act: 'stand',
    calls: ['往臨江城的——上陣了——'],
    chat: ['陣師捻著鬍子：「這座陣是三千年前欽天監的人畫的，畫陣的人叫什麼，冊子上沒寫。」他壓低了聲音，「我師父說，陣紋的畫法，跟東荒那邊的一座古陣一模一樣。」'],
  },
  {
    id: 'hc_captain', region: 'waicheng', name: '禁軍校尉', look: 'guard', at: [2770, 2480], face: -1, hours: [0, 24], act: 'stand',
    calls: ['（按著刀，一動不動）'],
    chat: ['禁軍校尉看都不看你：「腰牌。」'],
  },
  {
    id: 'wc_crier', region: 'waicheng', name: '看榜的', look: 'villager', at: [2940, 2870], face: 1, hours: [7, 21], act: 'stand',
    calls: ['新榜！天下的新榜！'],
    chat: ['看榜的人說：「臨江城的榜？那是抄本的抄本。這裡的，才是欽天監親筆的。」他指著榜上的一個空位，「你看，第一百名後面多了一格，空的。欽天監從來不留空格。」'],
  },
  {
    id: 'ty_shed_keeper', region: 'ty_road', name: '茶棚老闆', look: 'villager', at: [770, 3110], face: -1, hours: [6, 20], act: 'stand',
    calls: ['喝碗茶再走——'],
    chat: ['茶棚老闆給你倒了一碗茶：「進京的？前兩年還好，這一年，令牌查得嚴。」他朝東努了努嘴，「玉指峰封了山，欽天監的人說，是要下大雨。下什麼雨，要封山？」'],
  },
];

/** The small lives of each region (world/wildlife.js WILDLIFE). */
const wildlife = {
  ty_wilds: { n: 4, kinds: [['rabbit', 4, 'any', 'wild', [1, 2]], ['crow', 3, 'day', 'wild', [2, 3]], ['deer', 2, 'day', 'wild', [1, 2]]] },
  ty_road: { n: 2, kinds: [['crow', 3, 'day', 'wild', [2, 3]], ['rabbit', 2, 'any', 'wild', [1, 1]]] },
  huangling: { n: 3, kinds: [['crow', 5, 'day', 'any', [2, 4]], ['deer', 1, 'day', 'forest', [1, 1]]] },
  jinyuan: { n: 4, kinds: [['deer', 4, 'day', 'forest', [1, 3]], ['crane', 3, 'day', 'water', [1, 2]], ['egret', 2, 'day', 'water', [1, 2]]] },
  jingjiao: { n: 3, kinds: [['egret', 3, 'day', 'water', [1, 3]], ['crow', 3, 'day', 'wild', [2, 4]]] },
};

/** How far you walk before something may happen, and how likely it is (world/explore.js ENCOUNTER). */
const encounter = {
  ty_road: [1500, 0.3], waicheng: [1500, 0.3], huangcheng: [1600, 0.2], qintianjian: [1600, 0.2], yuzhi: [1200, 0],
  huangling: [1000, 0.45], hl_gong: [900, 0.4], jinyuan: [1000, 0.45], jingjiao: [1400, 0.3], ty_wilds: [1200, 0.4],
};

/** What you notice as you walk (world/explore.js; by region, before the lines kept by kind of place). */
const ambient = {
  ty_road: ['東邊的天底下，立著一座白色的山，像一根指頭。', '一隊車馬從身邊過去，車上插著小旗，旗上一個「衍」字。', '十里亭裡，有人在哭著送行。'],
  waicheng: ['頭頂上沒有劍光——京城上空，誰也不敢飛。', '一隊禁軍走過去，甲片嘩啦嘩啦響，街上的人都往兩邊讓。', '往北看，玉指峰白得發亮，峰頂上罩著一層雲。', '茶樓裡有人在說血月，說到一半被人拉住了袖子。'],
  huangcheng: ['御階兩邊的禁軍一動不動，連眼珠子都不轉。', '風從玉指峰上刮下來，帶著一股說不出的味道，像墨。', '午門上的鐘響了一聲。'],
  qintianjian: ['星官署裡翻紙的聲音，一刻也不停。', '山壁就在頭頂上，白得刺眼。', '一個年輕的星官捧著一摞冊子跑過去，頭也不抬。'],
  yuzhi: ['峰頂的風很大，吹得人站不穩。', '往下看，天衍城小得像一張棋盤。', '腳下的白石頭裡，好像有什麼東西在慢慢地跳。'],
  huangling: ['柏樹林裡一點風也沒有，連鳥都不叫。', '神道兩邊的石人，一尊一尊地看著你走過去。', '山上的烏鴉，比別處的大。'],
  hl_gong: ['地宮裡很冷，你呼出的氣都是白的。', '穹頂上的星圖，在黑暗裡發著淡淡的光。'],
  jinyuan: ['林子裡有什麼東西跑過去，快得看不清。', '太液池上的霧，一直不散。', '樹上掛著一塊鐵牌：「擅入者，以盜論。」'],
  jingjiao: ['田埂筆直，筆直得讓人不舒服。', '佃戶們抬頭看了你一眼，又低下頭去。'],
  ty_wilds: ['往京城去的人，一個接一個。', '路邊的告示上寫著：「京師戒嚴」。'],
};

/** Looking around properly (content/events/generic.js): what you find, by region. */
const flavor = {
  ty_road: ['你在界碑前站了一會兒。碑背面被刮掉的那一行字，最後兩個是「四九」。大道五十，天衍四九——你想起了這句話的後半句：人遁其一。'],
  waicheng: [
    '你在天衍城的街上走了半天。這裡的人走路都很快，像是每個人都知道自己要去哪裡、這輩子要做什麼。',
    '你在醉仙樓坐了一會兒。鄰桌在說天驕榜，說誰的命好；再鄰桌在說玉指峰，說封山。兩桌人誰也沒聽見誰。',
  ],
  huangcheng: ['你在御階上回頭看。天衍城一格一格的，街是直的，牆是直的，連人都是一行一行的。'],
  qintianjian: ['你在星官署的門外站了一會兒。裡頭的星官在念：「某年某月，某人，退婚；某年某月，某人，三年之約……」念得像在念經。'],
  yuzhi: ['你在峰頂上蹲下來，摸了摸腳下的石頭。石頭是溫的，像一隻手。'],
  huangling: ['你在神道上走了一段。石人石馬的影子很長，長得不像是這個時辰的太陽照出來的。'],
  hl_gong: ['你在地宮裡轉了一圈。牆角堆著幾百支禿了的筆，筆桿上都刻著同一個字：衍。'],
  jinyuan: ['你在林子裡看見一頭鹿，白色的，頭上的角是透明的。牠看了你一眼，沒有跑。'],
  jingjiao: ['你在田埂上走了一段。御田的稻子長得一樣高，一根也不多，一根也不少。'],
  ty_wilds: ['你在路邊歇了一會兒。一個趕考的書生問你，京城還有多遠。你指了指那座白山。'],
};
const loot = {
  ty_road: [['mind', 1]],
  waicheng: [['mind', 1]],
  huangcheng: [['insight', 1]],
  qintianjian: [['insight', 1]],
  yuzhi: [['insight', 2]],
  huangling: [['maybe', 0.25, [['item', 'zizhi', 1]]]],
  hl_gong: [['insight', 1]],
  jinyuan: [['maybe', 0.3, [['item', 'zizhi', 1]]]],
  jingjiao: [['mind', 1]],
  ty_wilds: [['maybe', 0.3, [['item', 'longxu_grass', 1]]]],
};

/** Their days (world/people.js ROUTINES): [from hour, [x, y], what they do, facing?]. */
const routines = {
  wei_changgeng: {
    qintianjian: [
      [0, [2850, 1660], 'home'],
      [9, [2660, 1670], 'stand'],
      [20, [2700, 1610], 'stand'],
    ],
  },
  // (1.2) 蘇清瑤, when she is at 欽天監 (and not at 臨江城's 榜樓): by the 星官署 all day, under the cliff at night
  su_qingyao: {
    qintianjian: [
      [0, [2470, 1650], 'home'],
      [8, [2500, 1660], 'stand'],
      [19, [2650, 1560], 'stand'],
      [23, [2470, 1650], 'home'],
    ],
  },
};

/** Where they stand, by the region they are in (places.js NPC_SPOTS). */
const spots = {
  wei_changgeng: { qintianjian: [2660, 1670] },
  su_qingyao: { qintianjian: [2500, 1660] },
};

/** The air of each region in the 3D world (art/world3d.js MOODS). */
const moods = {
  ty_road: { tint: [0.94, 0.92, 0.88], amount: 0.16, dim: 1.02, motes: null },
  waicheng: { tint: [0.95, 0.92, 0.86], amount: 0.14, dim: 1.03, motes: null },
  huangcheng: { tint: [0.96, 0.92, 0.84], amount: 0.18, dim: 1.04, motes: 'mote' },
  qintianjian: { tint: [0.86, 0.88, 0.96], amount: 0.24, dim: 0.98, motes: 'mote' },
  yuzhi: { tint: [0.96, 0.9, 0.9], amount: 0.3, dim: 1.06, motes: 'mote' },
  huangling: { tint: [0.78, 0.8, 0.76], amount: 0.34, dim: 0.88, motes: 'ash' },
  hl_gong: { tint: [0.6, 0.62, 0.72], amount: 0.5, dim: 0.62, sun: 0.4, motes: 'mote' },
  jinyuan: { tint: [0.84, 0.92, 0.84], amount: 0.26, dim: 0.98, motes: 'mote' },
  jingjiao: { tint: [0.96, 0.94, 0.84], amount: 0.14, dim: 1.04, motes: null },
  ty_wilds: { tint: [0.92, 0.94, 0.9], amount: 0.16, dim: 1.02, motes: null },
};

export const TIANYAN_LAND = { ...TIANYAN_LAND_BASE, gather, wanderers, folk, calls, extras, wildlife, encounter, ambient, flavor, loot, routines, spots, moods };
