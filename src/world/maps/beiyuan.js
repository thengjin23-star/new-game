// 北原・寒鐵一帶: north of 東荒, over 雁回嶺 past 古戰場 and 斷劍峰. Snow. The
// way down from the ridge comes out at a cairn hung with rags (雪嶺口); a
// walled town of miners at the foot of an iron mountain, its mine cut deep
// into the rock (寒鐵堡, 寒鐵礦); to the west a lake frozen to the bottom,
// that the old men call a sea (北冥); to the east the open ice, and the felt
// tents of the people who live on it (冰原, 白狼部); to the north the snow
// mountains with a mirror of ice on the highest peak (雪山, 天鏡峰), a
// highland of cliffs and a broken pillar of black stone above them (斷雲崖,
// 不周山), and a rift in the ice where the earth's veins of spirit lie open
// (靈脈裂谷). Everything here is this map's own (world/atlas.js puts it in
// place when you cross over); the region ids are its own too.

import { T } from '../geo.js';
import { fbm } from '../noise.js';

// ── the land ──

/** The frozen lake (北冥): frozen through, it is ground you walk on, not water. [cx, cy, rx, ry] */
const SEA = [1220, 2200, 780, 540];

/** Regions, in priority order (the first shape containing a cell owns it). */
const REGION_SHAPES = [
  // up where no road goes (see AIRY)
  { id: 'buzhou', ellipse: [900, 470, 110, 80] },
  { id: 'tianjing_peak', ellipse: [2620, 760, 96, 70] },
  // the heart of the rift: found (once its guardian is dealt with), not walked into
  { id: 'lingmai_node', circle: [4120, 900, 90], requires: 'node_open' },
  // the mine: a tunnel into the iron mountain, and the gallery at its end
  { id: 'iron_mine', poly: [[1600, 3290], [2230, 3290], [2230, 3600], [1600, 3600]] },
  { id: 'xueling_kou', poly: [[2280, 4060], [2930, 4060], [2960, 4600], [2240, 4600]] },
  { id: 'hantie_fort', poly: [[2180, 3100], [3020, 3100], [3040, 3840], [2160, 3860]] },
  { id: 'bailang_camp', ellipse: [4180, 2960, 300, 210] },
  { id: 'lingmai_rift', ellipse: [4120, 940, 540, 340] },
  { id: 'beiming', ellipse: SEA },
  { id: 'duanyun_cliffs', poly: [[180, 200], [1720, 190], [1760, 1420], [200, 1480]] },
  { id: 'xueshan', poly: [[1800, 180], [3480, 170], [3520, 1500], [1840, 1540]] },
  { id: 'bingyuan', poly: [[3380, 1450], [5050, 1400], [5050, 4100], [3300, 4150]] },
  { id: 'beiyuan_wilds', default: true },
];

/** Rock: [cx, cy, rx, ry]. */
const PEAKS = [
  // 鐵山: the iron mountain west of the town (the mine is cut into it)
  [1880, 3440, 330, 280],
  // 雪山: a crowd of peaks, the highest (天鏡峰) with a mirror of ice on its top (AIRY)
  [2620, 760, 260, 220],
  [2050, 560, 220, 190],
  [3060, 520, 230, 200],
  [2250, 1120, 170, 150],
  [3150, 1080, 190, 160],
  // 不周山: the stump of a pillar, black stone, flat where it broke (AIRY)
  [900, 470, 250, 200],
  // the highland's broken edges
  [480, 1050, 160, 130],
  [1420, 860, 170, 140],
  // out on the snow
  [3700, 2250, 120, 90],
  [4650, 1900, 140, 120],
  [4600, 3650, 160, 130],
  [3520, 3640, 130, 110],
  [1350, 3800, 200, 160],
  [760, 3250, 220, 180],
  [1900, 2950, 110, 90],
  [3300, 4150, 140, 100],
];

/** 靈脈裂谷: a rift walled by cliffs of ice, open only at its throat to the south. */
const VALLEY = { cx: 4120, cy: 940, rx: 540, ry: 340, ring: 0.15, gorge: [4120, 1290], gorgeHalf: 0.26 };

/** Paths: up from the pass to the town, through it, the mine, and out to the lake, the camp, the mountains and the rift. */
const ROADS = [
  // 雪嶺古道: from the gap down to the town's south gate
  { kind: 'trail', width: 32, pts: [[2600, 4590], [2610, 4320], [2590, 4020], [2600, 3700]] },
  // the town's street, gate to gate
  { kind: 'lane', width: 34, pts: [[2600, 3700], [2600, 3450], [2600, 3220]] },
  // to the mine: out the west gate and into the mountain
  { kind: 'lane', width: 32, pts: [[2600, 3450], [2360, 3450]] },
  { kind: 'trail', width: 44, pts: [[2360, 3450], [2140, 3450], [1960, 3440]] },
  // north out of the town to where the ways part
  { kind: 'trail', width: 30, pts: [[2600, 3220], [2590, 2900], [2600, 2520]] },
  // west to the fisherman's hut on the frozen sea's shore
  { kind: 'trail', width: 28, pts: [[2600, 2520], [2300, 2640], [1900, 2780], [1500, 2810], [1380, 2770]] },
  // east across the snow to the camp
  { kind: 'trail', width: 28, pts: [[2600, 2520], [3000, 2610], [3500, 2760], [3900, 2900], [4070, 2950]] },
  // north to the foot of the mountains, and up between the peaks
  { kind: 'trail', width: 28, pts: [[2600, 2520], [2620, 2100], [2600, 1700], [2620, 1420], [2700, 1230], [2700, 1080]] },
  // north-east to the rift, in at its throat
  { kind: 'trail', width: 28, pts: [[2620, 2100], [3000, 1820], [3500, 1600], [3900, 1430], [4120, 1320], [4120, 1120]] },
  // from the sea's north shore up onto the highland
  { kind: 'trail', width: 26, pts: [[1500, 1700], [1300, 1520], [1080, 1300], [960, 1000]] },
];

/** The edge of the map: mountains all round; the way in from the south, over the ridge from 東荒. */
const BORDER = {
  north: 170, west: 150, south: 4370, east: 5050,
  gaps: [{ side: 'south', at: 2600, half: 170, depth: 360 }],
};

/**
 * The lie of the land: the highland and the mountains high in the north,
 * the town on a shelf below the iron mountain, the frozen sea lowest of all,
 * the ice plain rolling away east.
 */
const UPLAND = [
  [2600, 4420, 120, 320], [2600, 2500, 70, 700], [880, 760, 230, 420], [1080, 1460, 120, 260], [2650, 950, 220, 520], [4120, 950, 150, 380],
  [4300, 2600, 70, 700], [4400, 3700, 60, 500], [700, 3300, 90, 500], [1500, 3900, 80, 400], [3400, 1700, 110, 420],
];

/** The flat tops (only the flying come): the mirror of ice on 天鏡峰, the broken top of 不周山. */
const AIRY = [
  { id: 'tianjing_peak', kind: 'summit', at: [2620, 760], r: [96, 70], level: 400 },
  { id: 'buzhou', kind: 'summit', at: [900, 470], r: [110, 80], level: 432 },
];

export const BEIYUAN_GEO = {
  REGION_SHAPES,
  PEAKS, AIRY, CLIFF_LINES: [], VALLEY, SECT: null, RIVERS: [], LAKES: [], ROADS,
  MARKET_WALL: [2360, 3240, 2840, 3680], WALL_LOOK: { mud: false, name: '寒鐵堡' }, BORDER,
  EDGE_RIVER: null, RIVER_REGION: null, HOME_REGION: 'beiyuan_wilds', REACH_FROM: [2600, 3460], UPLAND,
};

const inSea = (x, y, k = 1) => Math.hypot((x - SEA[0]) / SEA[2], (y - SEA[1]) / SEA[3]) < k * (0.92 + 0.12 * fbm(x / 90, y / 90, 811));

// ── what lies on it, and how (by region; merged into the tables kept elsewhere) ──

/** The ground of each region (terrain.js BASE). */
const ground = {
  xueling_kou: (x, y) => (fbm(x / 120, y / 120, 801) > 0.62 ? T.HILL : T.SNOW),
  // inside the walls the snow is trodden to earth; outside it lies deep
  hantie_fort: (x, y) => (x > 2360 && x < 2840 && y > 3240 && y < 3680 ? T.WASTE : fbm(x / 100, y / 100, 802) > 0.66 ? T.HILL : T.SNOW),
  iron_mine: () => T.WASTE,
  // the sea frozen to the bottom; snow along its shores
  beiming: (x, y) => (inSea(x, y, 0.86) ? T.ICE : T.SNOW),
  bingyuan: (x, y) => {
    const n = fbm(x / 220, y / 220, 803);
    if (n < 0.27) return T.ICE;
    return n > 0.7 ? T.HILL : T.SNOW;
  },
  bailang_camp: (x, y) => (Math.hypot((x - 4180) / 220, (y - 2960) / 150) < 1 ? T.GRASS : T.SNOW),
  // where the veins lie open the ground is warm: the snow melts, moss grows (the north has no sand: its 'sand' is moss)
  lingmai_rift: (x, y) => (fbm(x / 110, y / 110, 804) > 0.64 ? T.HILL : T.SAND),
  lingmai_node: () => T.SAND,
  duanyun_cliffs: (x, y) => {
    const n = fbm(x / 140, y / 140, 805);
    return n > 0.6 ? T.HILL : n < 0.36 ? T.WASTE : T.SNOW;
  },
  xueshan: (x, y) => (fbm(x / 130, y / 130, 806) > 0.6 ? T.HILL : T.SNOW),
  tianjing_peak: () => T.SNOW,
  buzhou: () => T.WASTE,
  // between: snow, a wood of snowed-under pines here and there, bare rock where the wind has swept it
  beiyuan_wilds: (x, y) => {
    const n = fbm(x / 300, y / 300, 807);
    const m = fbm(x / 170, y / 170, 808);
    if (n > 0.64) return T.FOREST;
    if (m > 0.68) return T.HILL;
    return T.SNOW;
  },
};

/** Which trees (terrain.js TREE_MIX): pines under the snow, dead trees the frost split. */
const trees = {
  xueling_kou: [['pine', 80], ['dead', 20]],
  hantie_fort: [['pine', 60], ['dead', 40]],
  iron_mine: [['dead', 100]],
  beiming: [['dead', 60], ['pine', 40]],
  bingyuan: [['dead', 100]],
  bailang_camp: [['pine', 100]],
  lingmai_rift: [['pine', 100]],
  lingmai_node: [['pine', 100]],
  duanyun_cliffs: [['pine', 55], ['dead', 45]],
  xueshan: [['pine', 70], ['dead', 30]],
  tianjing_peak: [['pine', 100]],
  buzhou: [['dead', 100]],
  beiyuan_wilds: [['pine', 80], ['dead', 20]],
};

/** Settled ground sits level (height.js SETTLED): [height, roll]. The sea is flat as a floor. */
const settled = { hantie_fort: [74, 3], beiming: [52, 0], bailang_camp: [66, 3], iron_mine: [76, 1] };

/** How much wild ground rolls (height.js ROLL), and the drifts the wind piles on the open snow (height.js DUNES). */
const roll = { xueling_kou: 24, bingyuan: 22, duanyun_cliffs: 28, xueshan: 30, lingmai_rift: 8, lingmai_node: 2, beiyuan_wilds: 24, tianjing_peak: 4, buzhou: 4 };
const dunes = { bingyuan: 9, beiyuan_wilds: 6 };

/** Under a mountain, the ground is the land's (art/worldview.js): snow and stone. */
const under = {
  xueling_kou: T.SNOW, hantie_fort: T.SNOW, iron_mine: T.WASTE, beiming: T.SNOW, bingyuan: T.SNOW, bailang_camp: T.SNOW,
  lingmai_rift: T.HILL, lingmai_node: T.HILL, duanyun_cliffs: T.SNOW, xueshan: T.SNOW, tianjing_peak: T.SNOW, buzhou: T.WASTE, beiyuan_wilds: T.SNOW,
};

/** The frozen country (world/weather.js FRIGID): what would be rain is snow, and a hard wind is a blizzard. (Not down the mine.) */
const frigid = {
  xueling_kou: 1, hantie_fort: 1, beiming: 1, bingyuan: 1, bailang_camp: 1, lingmai_rift: 1, lingmai_node: 1,
  duanyun_cliffs: 1, xueshan: 1, tianjing_peak: 1, buzhou: 1, beiyuan_wilds: 1,
};

/** Woods in the snow (terrain.js GROVE): a pine now and then on open snow. */
const grove = { beiyuan_wilds: 0.035, xueling_kou: 0.03, xueshan: 0.025, bailang_camp: 0.01 };

/** What each region sounds like (audio/director.js PLACE). */
const sound = {
  xueling_kou: 'snowpass', hantie_fort: 'minetown', iron_mine: 'mine', beiming: 'icesea', bingyuan: 'tundra', bailang_camp: 'camp',
  lingmai_rift: 'rift', lingmai_node: 'rift', duanyun_cliffs: 'highland', xueshan: 'snowpeak', tianjing_peak: 'peak', buzhou: 'pillar', beiyuan_wilds: 'tundra',
};

/** Where the cold does not get at you (world/explore.js exposure): under a roof, by a fire, down the mine, where the veins warm the ground. */
const shelter = { hantie_fort: 1, iron_mine: 1, bailang_camp: 1, lingmai_rift: 1, lingmai_node: 1 };

export const BEIYUAN_LAND_BASE = { ground, trees, settled, roll, dunes, under, frigid, grove, sound, shelter };

/** The north's own ground colours (art/worldview.js): snow, ice, grey stone, the moss of the rift (its 'sand'). */
export const BEIYUAN_PALETTE = {
  [T.SNOW]: { all: [238, 241, 244] },
  [T.ICE]: { all: [196, 214, 226] },
  [T.HILL]: { all: [194, 196, 196] },
  [T.WASTE]: { all: [170, 170, 166] },
  [T.GRASS]: { all: [214, 216, 214] },
  [T.FOREST]: { all: [222, 226, 228] },
  [T.SAND]: { all: [150, 172, 140] },
};

// ── places ──

/** The regions as places (map.js NODES). Nobody in 東荒 has been this far north; the cairn at the foot of the ridge is what you see first. */
export const BEIYUAN_NODES = {
  xueling_kou: {
    name: '雪嶺口', kind: 'pass', qi: 0.8, danger: 1, at: [2600, 4300], label: [2600, 4180],
    desc: '雁回嶺北坡的山口。下山的路邊壘著一堆石頭，石頭上插著木杆，杆上繫滿了褪色的布條，在風裡嘩嘩地響。再往北，就只剩雪。',
  },
  hantie_fort: {
    name: '寒鐵堡', kind: 'town', qi: 1.1, danger: 0, at: [2600, 3460], label: [2600, 3150],
    desc: '鐵山腳下的一座石堡。堡裡住的都是挖礦的人：山裡出寒鐵，打成劍，比尋常的鐵利三分，東荒的宗門年年派人來買。',
  },
  iron_mine: {
    name: '寒鐵礦', kind: 'cave', qi: 1.4, danger: 4, at: [1800, 3440], label: [1800, 3300],
    desc: '鐵山的肚子裡，礦工們挖了一百多年的礦洞。越往裡越冷，冷得石壁上都結著霜。最深的那條巷道，今年冬天封了。',
  },
  beiming: {
    name: '北冥', kind: 'lake', qi: 1.3, danger: 2, at: [1220, 2240], label: [1220, 1720],
    desc: '一片凍到底的湖，大得望不見對岸，北原的人管它叫「海」。冰面上積著雪，平得像一張紙；冰底下黑沉沉的，什麼也看不見。',
  },
  bingyuan: {
    name: '冰原', kind: 'plain', qi: 0.8, danger: 3, secludeRisk: 0.35, at: [4300, 2200], label: [4300, 2050],
    desc: '寒鐵堡往東，雪一直鋪到天邊。風在這裡沒有東西擋，一起就是一整天。白狼在這裡打獵；白狼部的人，也在這裡打獵。',
  },
  bailang_camp: {
    name: '白狼部', kind: 'camp', qi: 0.9, danger: 0, at: [4180, 2960], label: [4180, 2780],
    desc: '冰原上的一圈氈帳，中間燒著一堆終年不滅的火。白狼部的人逐獵物而居，冬天就搭在這裡；帳門上掛著白狼的尾巴。',
  },
  duanyun_cliffs: {
    name: '斷雲崖', kind: 'mountain', qi: 1.2, danger: 3, secludeRisk: 0.4, at: [960, 1060], label: [960, 1380],
    desc: '北冥北邊的一片高地，四面都是斷崖，雲從崖下飄過去，像被刀切斷了。崖上住著雪鷹；冬天，崖口掛著一道凍住的瀑布。',
  },
  xueshan: {
    name: '雪山', kind: 'mountain', qi: 1.3, danger: 4, secludeRisk: 0.5, at: [2700, 1300], label: [2700, 1580],
    desc: '北原的脊樑：一座挨著一座的雪峰，最高的那座頂上，有一面冰鏡似的平台，太陽一照，幾十里外都看得見。山裡住著雪猿。',
  },
  tianjing_peak: {
    name: '天鏡峰', kind: 'peak', air: true, qi: 1.9, danger: 0, at: [2620, 760],
    desc: '雪山最高的一座峰，頂上是一片平滑的冰，像一面鏡子朝著天。只有飛得上來。冰縫裡，開著一朵一朵雪白的花。',
  },
  lingmai_rift: {
    name: '靈脈裂谷', kind: 'valley', qi: 1.6, danger: 3, secludeRisk: 0.3, at: [4120, 1060], label: [4120, 560],
    desc: '冰原北邊，大地裂開了一道谷。谷底的雪是化的，石縫裡透出幽幽的藍光，地是溫的——那是大地的靈脈，在這裡露出了地面。',
  },
  lingmai_node: {
    name: '靈脈節點', kind: 'valley', qi: 2.4, danger: 0, at: [4120, 900],
    desc: '裂谷正中，幾條靈脈交匯的地方。藍光從地底湧上來，像泉水一樣。在這裡打坐一天，抵得上在外頭打坐十天——只要你的經脈承受得住。',
  },
  buzhou: {
    name: '不周山', kind: 'peak', air: true, qi: 2.0, danger: 0, at: [900, 470],
    desc: '斷雲崖上，一根黑色的石柱，粗得像一座山，頂上是斷的，斷口平得像被一刀斬過。斷口上，孤零零地立著一道石門。',
  },
  beiyuan_wilds: {
    name: '北原雪野', kind: 'wilds', qi: 0.9, danger: 2, secludeRisk: 0.3, at: [2600, 2520], label: [2900, 2380],
    desc: '寒鐵堡往北的雪野，路在這裡分成三條：往西是北冥，往東是冰原，往北是雪山。雪地上的腳印，一夜就被風抹平了。',
  },
};

/** Buildings, places to walk up to, and what roams (places.js STRUCTURES / POIS / BEASTS, for this map). */
const STRUCTURES = [
  // 雪嶺口: the stone at the head of the way down, the cairn with its rags
  { x: 2560, y: 4380, w: 18, h: 8, sprite: 'stele', block: false, name: '雪嶺口' },
  { x: 2680, y: 4250, w: 30, h: 30, sprite: 'cairn', landmark: true },
  // 寒鐵堡: the master's hall, the tavern, the smithy, the store, the miners' houses; a watchtower; the frame over the mine's mouth
  { x: 2720, y: 3320, w: 110, h: 60, sprite: 'hall', name: '寒鐵堡', landmark: true },
  { x: 2490, y: 3320, w: 96, h: 52, sprite: 'cabin' },
  { x: 2720, y: 3450, w: 80, h: 44, sprite: 'smithy' },
  { x: 2725, y: 3575, w: 76, h: 42, sprite: 'cabin' },
  { x: 2480, y: 3570, w: 84, h: 46, sprite: 'cabin' },
  { x: 2440, y: 3395, w: 50, h: 34, sprite: 'cabin' },
  { x: 2805, y: 3270, w: 26, h: 26, sprite: 'tower', landmark: true },
  { x: 2230, y: 3450, w: 46, h: 24, sprite: 'minegate', block: false, landmark: true },
  // 寒鐵礦: the gallery at the end of the tunnel, hewn out of the rock
  { x: 1780, y: 3440, w: 300, h: 220, paint: T.WASTE },
  // 北冥: the fisherman's hut on the shore
  { x: 1310, y: 2760, w: 52, h: 36, sprite: 'cabin' },
  // 白狼部: felt tents round the fire, a cairn for the sky
  { x: 4070, y: 2900, w: 46, h: 46, sprite: 'yurt' },
  { x: 4240, y: 2860, w: 52, h: 52, sprite: 'yurt' },
  { x: 4330, y: 2990, w: 46, h: 46, sprite: 'yurt' },
  { x: 4060, y: 3050, w: 46, h: 46, sprite: 'yurt' },
  { x: 4200, y: 3110, w: 44, h: 44, sprite: 'yurt' },
  { x: 4320, y: 3110, w: 30, h: 30, sprite: 'cairn' },
  // 不周山: the gate standing alone on the broken top
  { x: 900, y: 440, w: 70, h: 16, sprite: 'skygate', block: false, landmark: true },
];

/** Places you can walk up to (places.js POIS, for this map). */
const POIS = [
  // 雪嶺口
  { id: 'xueling_gate', region: 'xueling_kou', x: 2600, y: 4540, name: '山口', verb: '回東荒', text: '山口那頭，是雁回嶺，再過去是東荒。' },
  { id: 'xl_cairn', region: 'xueling_kou', x: 2680, y: 4300, name: '石堆', verb: '查看', text: '石頭一塊壓一塊，壘得比人還高。布條上寫著字，被風雪磨得只剩一點墨痕。' },
  // 寒鐵堡
  { id: 'ht_hall', region: 'hantie_fort', x: 2720, y: 3362, name: '堡主府', verb: '拜見', text: '堡主府的門開著，堂上燒著一盆炭火，牆上掛著一張弓、一把刀和一張寒鐵礦的圖。' },
  { id: 'ht_tavern', region: 'hantie_fort', x: 2490, y: 3358, name: '酒館', verb: '打聽', action: 'inquire', glow: (s) => s.tod >= 17 || s.tod < 5 },
  { id: 'ht_smithy', region: 'hantie_fort', x: 2720, y: 3484, name: '鐵匠鋪', verb: '購物', action: 'shop', shop: 'hantie_smith' },
  { id: 'ht_store', region: 'hantie_fort', x: 2725, y: 3608, name: '雜貨', verb: '購物', action: 'shop', shop: 'hantie' },
  { id: 'ht_inn', region: 'hantie_fort', x: 2440, y: 3428, name: '火炕', verb: '歇腳', rest: true, text: '酒館後頭有一鋪大炕，燒得燙屁股。挖礦的人下了工，就橫七豎八地睡在上面。' },
  { id: 'mine_mouth', region: 'hantie_fort', x: 2270, y: 3450, name: '礦口', verb: '查看', text: '礦口上架著粗大的木頭框，框上掛著一盞風燈。往裡看，礦道黑沉沉的，一陣一陣的冷風往外吹。' },
  // 寒鐵礦
  { id: 'mine_vein', region: 'iron_mine', x: 1900, y: 3400, name: '礦脈', verb: '查看', text: '石壁上露出一道黑青色的礦脈，摸上去冰得燙手。這就是寒鐵。' },
  { id: 'mine_deep', region: 'iron_mine', x: 1700, y: 3470, name: '深巷', verb: '查看', text: '最深的那條巷道，口上釘著木板，木板上結滿了霜。板縫裡吹出來的風，冷得像刀子。' },
  // 北冥
  { id: 'bm_hut', region: 'beiming', x: 1300, y: 2700, name: '漁屋', verb: '查看', text: '岸邊一間小木屋，屋簷下掛著一串凍得硬邦邦的魚。門口立著一根比人還長的魚叉。' },
  { id: 'bm_hole', region: 'beiming', x: 1260, y: 2640, name: '冰洞', verb: '查看', text: '冰面上鑿開的一個洞，洞口結著薄薄的一層新冰。從洞口往下看，水黑得像墨。' },
  { id: 'bm_middle', region: 'beiming', x: 1220, y: 2150, name: '冰心', verb: '查看', text: '北冥的正中。腳下的冰透明得像琉璃，底下黑沉沉的，什麼也看不見。' },
  // 白狼部
  { id: 'bl_fire', region: 'bailang_camp', x: 4180, y: 2975, name: '營火', verb: '烤火', rest: true, glow: () => true, text: '營火燒的是牛糞和松枝，火苗不高，熱氣卻一直透到骨頭裡。' },
  // 斷雲崖
  { id: 'dy_icefall', region: 'duanyun_cliffs', x: 700, y: 1240, name: '冰瀑', verb: '查看', text: '崖口掛著一道凍住的瀑布，一丈多寬，十幾丈高，冰柱一根挨著一根，像一面倒掛的琴。' },
  // 雪山
  { id: 'xs_shrine', region: 'xueshan', x: 2640, y: 1440, name: '山神龕', verb: '查看', text: '山腳下一個小小的石龕，龕裡的山神像被雪埋了半截。龕前供著一塊凍硬的肉乾。' },
  // 天鏡峰
  { id: 'tj_mirror', region: 'tianjing_peak', x: 2620, y: 770, name: '冰鏡', verb: '查看', text: '峰頂是一整塊平滑的冰，亮得照得見人影。冰縫裡開著雪白的花，一朵一朵，像落在冰上的月光。' },
  // 靈脈裂谷
  { id: 'lm_cave', region: 'lingmai_rift', x: 3880, y: 1000, name: '石洞', verb: '查看', sprite: 'cave', text: '崖腳下一個石洞，洞口掛著一張獸皮當門簾，簾子底下透出火光。' },
  { id: 'lm_vein', region: 'lingmai_rift', x: 4120, y: 1010, name: '靈脈', verb: '查看', text: '石縫裡湧出藍光，一縷一縷，像水裡的煙。光的盡頭，裂谷的正中，伏著一團白色的東西。' },
  // 不周山
  { id: 'bz_gate', region: 'buzhou', x: 900, y: 480, name: '天門', verb: '查看', text: '一道石門，孤零零地立在斷口上。門的這一邊是雪，那一邊也是雪。可是門裡，看不見那一邊。' },
  // 北原雪野
  { id: 'bw_post', region: 'beiyuan_wilds', x: 2640, y: 2540, name: '路標', verb: '查看', text: '一根木杆，杆上釘著三塊木牌：西，北冥；北，雪山；東，白狼部。牌子底下還有一行小字：「莫夜行」。' },
];

const dark = (s) => s.tod >= 19.5 || s.tod < 5;
const killed = (s, kind) => (s.vars.kills?.[kind] || 0) > 0;

/**
 * What roams (places.js BEASTS, for this map): stronger than the desert's, a match for 築基後期 and
 * 金丹. Nothing near the way down or the town; wolves out on the ice, their king out where the ice runs
 * east; cats lying up in the mountains and on the highland, apes among the peaks and their king in his
 * cave up near the ridge; the silkworms in the mine's gallery, their mother behind the boards of its
 * deepest way (once they are down); the drowned on the frozen sea by night; the 冰麟 on the knot of the
 * veins in the rift (till the knot is open).
 */
const BEASTS = [
  { id: 'ice_wolves_a', kind: 'ice_wolf', n: 3, title: '冰原狼', x: 3600, y: 3420, r: 160, respawn: 30, power: 400 },
  { id: 'ice_wolves_b', kind: 'ice_wolf', n: 3, title: '冰原狼', x: 4560, y: 2300, r: 160, respawn: 30, power: 420 },
  { id: 'ice_wolves_c', kind: 'ice_wolf', n: 2, title: '冰原狼', x: 3750, y: 2000, r: 140, respawn: 30, power: 380 },
  { id: 'bailang_king_a', kind: 'bailang_king', title: '白狼王', x: 4800, y: 2550, r: 140, respawn: 999, power: 700, cond: (s) => !killed(s, 'bailang_king') },
  { id: 'snow_leopard_a', kind: 'snow_leopard', n: 1, title: '雪豹', x: 2950, y: 1300, r: 120, respawn: 30, power: 420 },
  { id: 'snow_leopard_b', kind: 'snow_leopard', n: 1, title: '雪豹', x: 700, y: 900, r: 120, respawn: 30, power: 420 },
  { id: 'snow_leopard_c', kind: 'snow_leopard', n: 1, title: '雪豹', x: 1500, y: 600, r: 120, respawn: 30, power: 440 },
  { id: 'snow_apes_a', kind: 'snow_ape', n: 2, title: '雪猿', x: 2200, y: 900, r: 150, respawn: 30, power: 460 },
  { id: 'snow_apes_b', kind: 'snow_ape', n: 2, title: '雪猿', x: 3200, y: 800, r: 150, respawn: 30, power: 460 },
  { id: 'ape_king_a', kind: 'ape_king', title: '雪猿王', x: 2350, y: 380, r: 130, respawn: 999, power: 760, cond: (s) => !killed(s, 'ape_king') },
  { id: 'ice_silkworms_a', kind: 'ice_silkworm', n: 3, title: '冰蠶', x: 1800, y: 3420, r: 100, respawn: 20, power: 340 },
  { id: 'silk_queen_a', kind: 'silk_queen', title: '冰蠶母', x: 1680, y: 3480, r: 90, respawn: 999, power: 640, cond: (s) => !!s.flags.mine_deep_open && !killed(s, 'silk_queen') },
  { id: 'snow_wraiths_a', kind: 'snow_wraith', n: 2, title: '雪魄', x: 950, y: 2050, r: 150, respawn: 5, power: 400, cond: dark },
  { id: 'snow_wraiths_b', kind: 'snow_wraith', n: 2, title: '雪魄', x: 1550, y: 2350, r: 150, respawn: 5, power: 400, cond: dark },
  { id: 'ice_qilin_a', kind: 'ice_qilin', title: '冰麟', x: 4120, y: 880, r: 110, respawn: 999, power: 900, cond: (s) => !s.flags.node_open && !killed(s, 'ice_qilin') },
];

export const BEIYUAN_PLACES = { STRUCTURES, POIS, BEASTS };

// ── who lives here ──

/** The people of 北原 (world/npcs.js NAMED). Nobody here has heard of you. */
export const BEIYUAN_PEOPLE = {
  huo_bao: {
    name: '霍堡主', title: '寒鐵堡的堡主', gender: '男', age: 58, realm: 1, stage: 6, loc: 'hantie_fort',
    bio: '寒鐵堡的堡主，年輕時在邊軍裡當過校尉，左手少了兩根指頭——凍掉的。說話粗，心不粗：堡裡每個礦工的名字，他都叫得出來。',
  },
  a_lan: {
    name: '阿蘭', title: '白狼部的獵人', gender: '女', age: 19, realm: 1, stage: 3, loc: 'bailang_camp',
    bio: '白狼部最好的獵手，弓比她的人還高。三年前，她的阿爹進冰原追一頭白狼王，就再也沒有回來。',
  },
  bing_sou: {
    name: '冰叟', title: '北冥的老漁翁', gender: '男', age: 90, realm: 0, stage: 0, loc: 'beiming',
    bio: '在北冥邊上打了一輩子魚的老人，誰也說不清他多大歲數。他說北冥底下睡著一條魚，大得看不見頭尾——沒有人信他。',
  },
  han_yi: {
    name: '寒衣', title: '裂谷裡的道姑', gender: '女', age: 160, realm: 3, stage: 1, loc: 'lingmai_rift',
    bio: '住在靈脈裂谷石洞裡的道姑，頭髮全白了，臉卻像四十來歲。四十年前來這裡想借靈脈結嬰，沒能成；從那以後就守在這裡，不肯走。',
  },
  gu_yuan: {
    name: '顧遠', title: '青雲宗的外門弟子', gender: '男', age: 22, realm: 2, stage: 0, loc: 'hantie_fort',
    bio: '青雲宗派來寒鐵堡買寒鐵的外門弟子，一個月前就該回去了。礦封了，鐵買不到，他也不敢空手回去，天天坐在酒館裡發愁。',
  },
};

// ── the rest of how it lives (by region; merged into the tables kept elsewhere) ──

/** Which herbs grow where, and how many spots (places.js GATHER). */
const gather = {
  beiyuan_wilds: { n: 12, give: [[70, 'xueshen', 1, 1], [30, 'ningqi_grass', 1, 2]] },
  xueshan: { n: 6, give: [[80, 'xueshen', 1, 2], [20, 'xuelian', 1, 1]] },
  duanyun_cliffs: { n: 5, give: [[75, 'xueshen', 1, 1], [25, 'xuelian', 1, 1]] },
  bingyuan: { n: 6, give: [[100, 'xueshen', 1, 1]] },
  lingmai_rift: { n: 4, give: [[60, 'ningqi_grass', 2, 3], [40, 'xueshen', 1, 2]] },
};

/** How many people walk about (places.js WANDERERS), what they say, and what they call out (world/people.js). */
const wanderers = { hantie_fort: 5, bailang_camp: 3 };
const folk = {
  hantie_fort: [
    '今年冬天，比哪年都冷。', '深巷封了，工錢少了一半。', '半夜裡，礦裡有人唱歌——你信不信？', '青雲宗那個小子，又在酒館裡喝悶酒。',
    '寒鐵打的劍，砍木頭像切豆腐。', '堡主說了，誰也不許再下深巷。', '白狼部的人又拿皮子來換鐵了。',
  ],
  bailang_camp: ['白狼王回來了。', '阿蘭又一個人出去了。', '冰叟說北冥要開了，誰信？', '雪山上的雪猿，今年下山了。'],
};
const calls = {
  hantie_fort: ['熱酒——燒刀子！', '上工了！', '鐵——好鐵——', '誰的鎬頭落在礦口了？'],
  bailang_camp: ['（狗在叫）', '回來了！打著了！', '火別讓它滅了！'],
};

/** People with a place and an hour of their own (world/people.js EXTRAS). */
const extras = [
  {
    id: 'ht_smith', region: 'hantie_fort', name: '鐵匠', look: 'porter', at: [2760, 3486], face: -1, hours: [6, 20], act: 'stand',
    calls: ['（叮——叮——）', '寒鐵要燒白了才打得動！'],
    chat: ['鐵匠掄著大錘，一錘一錘砸在燒白的鐵上，火星濺了一地。「寒鐵這東西，」他抹了一把汗，「燒不夠火候，一錘就碎；燒過了火候，就廢了。跟人一樣。」'],
  },
  {
    id: 'ht_miner', region: 'hantie_fort', name: '老礦工', look: 'villager', at: [2560, 3400], face: 1, hours: [7, 19], act: 'sit',
    calls: ['（咳嗽）'],
    chat: ['老礦工咳了半天，才喘過氣來：「我在礦裡挖了四十年，什麼聲音沒聽過？石頭響，水滴，風……可那個聲音不一樣。那是有人在唱。」'],
  },
  {
    id: 'bl_herder', region: 'bailang_camp', name: '牧人', look: 'porter', at: [4120, 3010], face: 1, hours: [6, 21], act: 'stand',
    calls: ['（吆喝狗）'],
    chat: ['「我們白狼部，不殺白狼。」牧人說，「白狼是天上派下來的。可是那頭白狼王，牠先殺了我們的人。」'],
  },
];

/** The small lives of each region (world/wildlife.js WILDLIFE). */
const wildlife = {
  beiyuan_wilds: { n: 3, kinds: [['rabbit', 3, 'any', 'wild', [1, 2]], ['crow', 1, 'day', 'any', [1, 2]], ['redfox', 1, 'night', 'wild', [1, 1]]] },
  bingyuan: { n: 2, kinds: [['rabbit', 2, 'day', 'wild', [1, 2]], ['crow', 1, 'day', 'any', [2, 3]]] },
  bailang_camp: { n: 2, kinds: [['crow', 2, 'day', 'any', [1, 2]]] },
  xueling_kou: { n: 1, kinds: [['crow', 3, 'day', 'any', [1, 3]]] },
  hantie_fort: { n: 1, kinds: [['crow', 2, 'day', 'any', [1, 2]]] },
};

/** How far you walk before something may happen, and how likely it is (world/explore.js ENCOUNTER). */
const encounter = {
  xueling_kou: [1500, 0.3], hantie_fort: [1600, 0.3], iron_mine: [800, 0.3], beiming: [1200, 0.4], bingyuan: [1100, 0.45],
  bailang_camp: [1600, 0.3], lingmai_rift: [1000, 0.3], lingmai_node: [900, 0], duanyun_cliffs: [1000, 0.4], xueshan: [1000, 0.45],
  tianjing_peak: [700, 0], buzhou: [700, 0], beiyuan_wilds: [1300, 0.4],
};

/** What you notice as you walk (world/explore.js; by region, before the lines kept by kind of place). */
const ambient = {
  xueling_kou: ['風從山口灌下來，布條嘩嘩地響。', '回頭看，雁回嶺的山脊上，雪煙一陣一陣地揚起來。', '雪地上一行腳印，一直往北去了。'],
  hantie_fort: ['鐵匠鋪裡叮叮噹噹地響，火光從門縫裡漏出來。', '堡牆上的哨兵跺著腳，呵出一團一團的白氣。', '一隊礦工扛著鎬頭，低著頭從你身邊走過。', '酒館裡傳出一陣哄笑。'],
  iron_mine: ['頭頂上的石壁滴下一滴水，落到半路就凍成了冰珠。', '礦道深處，有什麼東西沙沙地響。', '風燈的火苗一縮一縮，像是怕冷。'],
  beiming: ['冰面底下，傳來一聲悶響，像有什麼東西翻了個身。', '風把冰面上的雪吹開，露出底下黑沉沉的冰。', '遠處的冰面上，有個小小的黑點——是冰叟在釣魚。'],
  bingyuan: ['風在冰原上跑，沒有東西擋它。', '遠處的雪地上，一群白點慢慢地移動——是白狼。', '天和地一樣白，分不清哪裡是盡頭。'],
  bailang_camp: ['氈帳裡飄出奶茶的香味。', '幾條大狗趴在營火邊，看見你，抬了抬頭又趴下了。', '一個孩子在帳門口剝狼皮，手凍得通紅。'],
  lingmai_rift: ['石縫裡透出的藍光，一明一暗，像在呼吸。', '這裡的地是溫的，雪化成了水，水邊長著苔蘚。', '空氣裡的靈氣濃得發甜，吸一口，渾身的毛孔都張開了。'],
  lingmai_node: ['藍光從腳下湧上來，像泉水。', '你的心跳，不知不覺和地底的脈動合在了一起。'],
  duanyun_cliffs: ['雲從崖下飄過，你站在雲上面。', '一隻雪鷹在崖邊盤旋，叫聲尖得刺耳。', '風大得站不穩，崖下深得看不見底。'],
  xueshan: ['頭頂上的雪坡上，雪簌簌地往下滑了一點。', '山谷裡傳來一聲長嚎，不像狼。', '雪深到膝蓋，每一步都要先把腿拔出來。'],
  tianjing_peak: ['冰鏡裡映著天，天上的雲在冰裡走。', '四面都是雪峰，低頭看，雲海一直鋪到天邊。'],
  buzhou: ['風從石門裡穿過去，發出一聲很長很長的嘆息。', '腳下的石頭黑得發亮，摸上去，是溫的。'],
  beiyuan_wilds: ['雪地上一行狐狸的腳印，彎彎曲曲地鑽進了松林。', '松枝上的雪被風一吹，撲簌簌地落了你一身。', '遠處，雪山的峰頂在雲裡一閃一閃。'],
};

/** Looking around properly (content/events/generic.js): what you find, by region. */
const flavor = {
  xueling_kou: ['你在石堆邊坐了一會兒。布條上的字，有的是名字，有的是一句話：「阿娘，我到了。」「等我回來。」「別等了。」'],
  hantie_fort: [
    '你在堡裡轉了一圈。房子都是石頭砌的，牆厚得像城牆，窗戶小得像槍眼。屋簷下掛著一排一排的冰柱。',
    '你在酒館的角落裡坐了一會兒。礦工們喝的是燒刀子，一口下去，臉就紅到了脖子。',
  ],
  iron_mine: ['你沿著礦道往裡走。石壁上一道一道的鎬痕，新的壓著舊的，不知道是多少代人挖出來的。'],
  beiming: [
    '你在冰面上走了很久。冰透明得能看見底下的水草，凍在冰裡，一動不動，像畫在琉璃上的。',
    '你趴在冰面上往下看。黑沉沉的水底，好像有一個很大很大的影子，慢慢地移過去——你眨了眨眼，什麼也沒有了。',
  ],
  bingyuan: ['你在冰原上走了半天，四面都是一樣的白。要不是天上的太陽，你連東西南北都分不清。', '雪地上散著一堆骨頭，啃得乾乾淨淨。看大小，是一頭野牛。'],
  bailang_camp: ['你在營火邊坐了一會兒。一個老婆婆塞給你一碗奶茶，又鹹又燙，喝下去，渾身都暖了。'],
  lingmai_rift: ['你在裂谷裡走了一圈。石縫裡的藍光照在臉上，暖洋洋的。苔蘚底下，有一種小小的白花，你在別處沒見過。'],
  lingmai_node: ['你在節點邊上坐下。靈氣從地底湧上來，一波一波地沖刷著你的經脈。'],
  duanyun_cliffs: ['你在崖邊站了很久。雲在腳下流，像一條白色的河。'],
  xueshan: ['你在雪山腳下找到一個背風的石窩，窩裡有人生過火，灰還是溫的。'],
  tianjing_peak: ['你在冰鏡上坐到天黑。星星一顆一顆出來，冰鏡裡也一顆一顆亮起來。天上一條河，冰裡也一條河——冰裡那條，沒有斷。'],
  buzhou: ['你繞著石柱的斷口走了一圈。斷口平得像磨過的鏡子；石門上沒有字，只有一個掌印，按得很深。'],
  beiyuan_wilds: ['你在松林裡走了一陣。雪壓得松枝彎到了地上，林子裡靜得只聽得見自己的喘氣聲。', '你撥開雪，底下露出一片凍硬的苔原，苔原上點點紅果——是凍住的越橘。'],
};
const loot = {
  xueling_kou: [['mind', 1]],
  hantie_fort: [['mind', 1]],
  iron_mine: [['maybe', 0.3, [['item', 'hantie_ore', 1]]]],
  beiming: [['maybe', 0.2, [['item', 'mystery', 1]]]],
  bingyuan: [['maybe', 0.3, [['item', 'xueshen', 1]]]],
  bailang_camp: [['mind', 2]],
  lingmai_rift: [['insight', 1]],
  lingmai_node: [['mind', 3]],
  duanyun_cliffs: [['maybe', 0.2, [['item', 'xuelian', 1]]]],
  xueshan: [['maybe', 0.3, [['item', 'xueshen', 1]]]],
  tianjing_peak: [['insight', 1]],
  buzhou: [['mind', 3]],
  beiyuan_wilds: [['maybe', 0.3, [['item', 'xueshen', 1]]]],
};

/**
 * Their days (world/people.js ROUTINES): [from hour, [x, y], what they do, facing?]. 霍堡主 sits in his
 * hall and walks the wall at dusk; 顧遠 drinks in the tavern; 冰叟 fishes at his hole by day; 阿蘭 is
 * at the fire in the morning and out on the ice till dark; 寒衣 sits at the mouth of her cave.
 */
const routines = {
  huo_bao: {
    hantie_fort: [
      [0, [2700, 3366], 'home'],
      [7, [2650, 3400], 'stand'],
      [17, [2625, 3296], 'stand'],
      [20, [2700, 3366], 'home'],
    ],
  },
  gu_yuan: {
    hantie_fort: [
      [0, [2525, 3368], 'home'],
      [9, [2548, 3402], 'sit'],
      [23, [2525, 3368], 'home'],
    ],
  },
  bing_sou: {
    beiming: [
      [0, [1300, 2712], 'home'],
      [6, [1290, 2650], 'fish'],
      [18, [1300, 2712], 'home'],
    ],
  },
  a_lan: {
    bailang_camp: [
      [0, [4240, 2896], 'home'],
      [6, [4150, 2940], 'stand'],
      [10, [4300, 2930], 'stand'],
      [20, [4240, 2896], 'home'],
    ],
  },
  han_yi: {
    lingmai_rift: [
      [0, [3900, 1040], 'sit'],
    ],
  },
};

/** Where the people of 北原 stand, by the region they are in (places.js NPC_SPOTS). */
const spots = {
  huo_bao: { hantie_fort: [2650, 3400] },
  gu_yuan: { hantie_fort: [2548, 3402] },
  bing_sou: { beiming: [1290, 2650] },
  a_lan: { bailang_camp: [4150, 2940] },
  han_yi: { lingmai_rift: [3900, 1040] },
};

/** The air of each region in the 3D world (art/world3d.js MOODS): the haze it tints, how dim, what drifts; sun: how much of it gets in. */
const moods = {
  xueling_kou: { tint: [0.86, 0.9, 0.96], amount: 0.24, dim: 1.02, motes: null },
  hantie_fort: { tint: [0.84, 0.86, 0.9], amount: 0.2, dim: 0.96, motes: null },
  iron_mine: { tint: [0.3, 0.34, 0.42], amount: 0.66, dim: 0.52, sun: 0.35, motes: 'mote' },
  beiming: { tint: [0.84, 0.9, 0.98], amount: 0.28, dim: 1.04, motes: null },
  bingyuan: { tint: [0.88, 0.92, 0.98], amount: 0.3, dim: 1.05, motes: null },
  bailang_camp: { tint: [0.9, 0.88, 0.86], amount: 0.18, dim: 1, motes: null },
  lingmai_rift: { tint: [0.6, 0.8, 0.94], amount: 0.4, dim: 0.94, motes: 'mote' },
  lingmai_node: { tint: [0.52, 0.78, 0.98], amount: 0.5, dim: 0.96, motes: 'mote' },
  duanyun_cliffs: { tint: [0.86, 0.9, 0.96], amount: 0.3, dim: 1.02, motes: null },
  xueshan: { tint: [0.88, 0.92, 0.98], amount: 0.3, dim: 1.04, motes: null },
  tianjing_peak: { tint: [0.9, 0.94, 1], amount: 0.22, dim: 1.08, motes: null },
  buzhou: { tint: [0.7, 0.72, 0.82], amount: 0.36, dim: 0.9, motes: 'ash' },
  beiyuan_wilds: { tint: [0.86, 0.9, 0.96], amount: 0.24, dim: 1.02, motes: null },
};

export const BEIYUAN_LAND = { ...BEIYUAN_LAND_BASE, gather, wanderers, folk, calls, extras, wildlife, encounter, ambient, flavor, loot, routines, spots, moods };
