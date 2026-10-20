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
  miasma_forest: (x, y) => {
    const n = fbm(x / 240, y / 240, 606);
    return n > 0.55 ? T.DEEP : n < 0.32 ? T.TALLGRASS : T.FOREST;
  },
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
  miasma_forest: [['dark', 35], ['bamboo', 30], ['leaf', 35]],
  water_cave: [['bamboo', 100]],
  nanling_wilds: [['leaf', 50], ['bamboo', 30], ['pine', 20]],
};

/** Settled ground sits level (height.js SETTLED): [height, roll]. */
const settled = { qingzhu_village: [124, 4] };

/** How much wild ground rolls (height.js ROLL). */
const roll = { nanling_wilds: 24, ling_pass: 20, miasma_forest: 18, poison_marsh: 4, wangu_valley: 8, jade_pool: 12, water_cave: 8 };

/** Which herbs grow where, and how many spots (places.js GATHER). */
const gather = {
  miasma_forest: { n: 14, give: [[55, 'zhangling_zhi', 1, 1], [35, 'ningqi_grass', 1, 2], [10, 'blood_ginseng', 1, 1]] },
  poison_marsh: { n: 8, give: [[60, 'zhixue_grass', 1, 2], [40, 'ningqi_grass', 1, 2]] },
  wangu_valley: { n: 5, give: [[70, 'zhangling_zhi', 1, 2], [30, 'blood_ginseng', 1, 1]] },
  jade_pool: { n: 6, give: [[80, 'ningqi_grass', 1, 3], [20, 'blood_ginseng', 1, 1]] },
  nanling_wilds: { n: 18, give: [[70, 'ningqi_grass', 1, 2], [20, 'zhixue_grass', 1, 1], [10, 'zhangling_zhi', 1, 1]] },
  qingzhu_village: { n: 2, give: [[100, 'zhixue_grass', 1, 1]] },
};

/** How many villagers walk about (places.js WANDERERS), what they say, and what they call out (world/people.js). */
const wanderers = { qingzhu_village: 6 };
const folk = {
  qingzhu_village: [
    '今年的蠱蟲，比往年多。', '別往萬蠱谷那邊走，那是蠱母的地方。', '阿蘿姐的藥，比山外的郎中靈。',
    '寨井的水，最近有點苦……', '東荒來的？你們那邊的人，說話都快。', '阿山又進山了，一去就是半個月。',
  ],
};
const calls = {
  qingzhu_village: ['阿妹——回家吃飯咯——', '竹筒飯，香噴噴的竹筒飯！', '牛跑了，牛跑了！', '今晚有人吹蘆笙。', '又要去山溝裡挑水了……'],
};

/** Villagers with a place and an hour of their own (world/people.js EXTRAS). */
const extras = [
  {
    id: 'zhai_rice', region: 'qingzhu_village', name: '賣竹筒飯的阿妹', look: 'villager_f', at: [3000, 1140], face: 1, hours: [7, 19], act: 'stand',
    calls: ['竹筒飯——香噴噴的竹筒飯！', '一文錢一筒，自家的糯米！'],
    chat: ['「東荒來的客人？嚐一筒竹筒飯吧，一文錢。」她把竹筒劈開，糯米飯的香氣一下子冒了出來。', '「寨井的水苦了，我們現在都要走好遠，去山溝裡挑水。」'],
  },
  {
    id: 'zhai_lusheng', region: 'qingzhu_village', name: '吹蘆笙的老人', look: 'elder', at: [3440, 1176], face: -1, hours: [18, 22.5], act: 'sit',
    calls: ['（蘆笙嗚嗚地響）'],
    chat: ['老人吹完一曲，才抬起頭：「這調子，叫〈送蠱〉。從前送蠱母進谷的時候吹的。」'],
  },
];

/** The small lives of each region (world/wildlife.js WILDLIFE); in 瘴林 and 萬蠱谷 nothing small lives long. */
const wildlife = {
  ling_pass: { n: 2, kinds: [['crow', 2, 'day', 'wild', [1, 2]], ['deer', 1, 'day', 'wild', [1, 1]]] },
  qingzhu_village: { n: 2, kinds: [['crow', 2, 'day', 'wild', [1, 2]], ['rabbit', 1, 'any', 'wild', [1, 1]]] },
  nanling_wilds: { n: 4, kinds: [['deer', 3, 'day', 'wild', [1, 2]], ['rabbit', 3, 'any', 'wild', [1, 1]], ['egret', 2, 'day', 'water', [1, 2]], ['redfox', 2, 'night', 'wild', [1, 1]]] },
  jade_pool: { n: 4, kinds: [['egret', 4, 'day', 'water', [1, 3]], ['crane', 2, 'day', 'water', [1, 1]], ['deer', 2, 'day', 'wild', [1, 2]]] },
  poison_marsh: { n: 3, kinds: [['egret', 3, 'day', 'water', [1, 2]], ['crow', 2, 'day', 'any', [2, 3]]] },
};

/** How often fog lies over a region (world/weather.js MISTY). */
const misty = { miasma_forest: 0.15, poison_marsh: 0.14, wangu_valley: 0.12, jade_pool: 0.1, ling_pass: 0.08 };

/** How far you walk before something may happen, and how likely it is (world/explore.js ENCOUNTER). */
const encounter = {
  ling_pass: [1400, 0.3], qingzhu_village: [1600, 0.35], miasma_forest: [1000, 0.5], poison_marsh: [1100, 0.45],
  wangu_valley: [1000, 0.35], jade_pool: [1600, 0.35], nanling_wilds: [1400, 0.45], water_cave: [900, 0],
};

/** What you notice as you walk (world/explore.js; by region, before the lines kept by kind of place). */
const ambient = {
  ling_pass: ['往北望，東荒的田野只剩一片淡淡的青。', '風從山隘裡灌過來，一邊乾，一邊濕。'],
  qingzhu_village: ['竹樓上有人在織布，梭子聲一下一下的。', '一群孩子光著腳跑過去，回頭偷偷看你。', '火塘的煙從竹樓頂上冒出來。', '有人在吹蘆笙，調子聽不懂，卻好聽。'],
  miasma_forest: ['霧是淡紫色的，聞起來甜得發膩。', '頭頂的樹冠上掛著一團一團的白絲。', '有什麼東西在落葉底下爬過去了。', '林子裡的鳥叫，聽起來像人在笑。'],
  poison_marsh: ['死水上冒起一個泡，啵的一聲破了。', '蘆葦叢裡有東西在咕咕地叫。', '一腳踩下去，泥一直沒到腳踝。', '水面上浮著一層油亮的光。'],
  wangu_valley: ['石壁上爬滿了蟲殼，風一吹，沙沙地響。', '嗡嗡聲忽遠忽近。', '地上有一道拖過的痕跡，比水桶還粗。'],
  jade_pool: ['瀑布的聲音大得蓋過了一切。', '水霧撲在臉上，涼絲絲的。', '潭水綠得像一塊玉。', '水霧裡掛著一道淡淡的虹。'],
  water_cave: ['水簾把外面隔成一片白。', '石壁上的字，在水光裡一閃一閃。'],
  nanling_wilds: ['石峰一根一根從林子裡拔起來，像插在地上的筍。', '山腰上的霧慢慢地流。', '一隻猴子蹲在石峰上看著你。', '遠處有人在唱山歌，一句也聽不懂。'],
};

/** Looking around properly (content/events/generic.js): what you find, by region. */
const flavor = {
  qingzhu_village: [
    '你在寨子裡轉了半天。竹樓底下拴著牛，樓上晾著藍布，火塘的煙熏得人眼睛發酸。',
    '你坐在銅鼓坪邊上，看一群孩子跳竹竿。竹竿一開一合，他們的腳一點也不怕。',
    '寨子裡的婦人坐在竹樓上織布，一邊織，一邊唱。調子你聽不懂，卻聽得心裡發軟。',
  ],
  ling_pass: ['你在嶺口的石頭上坐了一會兒。風從北邊來，帶著東荒的乾爽；又從南邊來，帶著南嶺的濕甜。'],
  miasma_forest: ['你在瘴林裡摸索了半天，衣服濕透了，分不清是汗還是霧。樹根底下，長著幾朵紫黑色的靈芝。', '林子裡的光是綠的。你走著走著，發現自己在繞圈子。'],
  poison_marsh: ['你沿著蘆葦叢走了半天，鞋子裡全是泥。遠處的石人，好像一直在看著你。', '死水上浮著一層油亮的光。你用樹枝撥了撥，底下有東西縮了回去。'],
  wangu_valley: ['你貼著石壁走，不敢弄出聲音。到處都是蟲殼，踩上去咔嚓咔嚓地響。'],
  jade_pool: ['你在潭邊坐了很久。瀑布的聲音大得像要把人吞下去，坐久了，反而覺得很靜。', '潭水綠得像一塊玉。你伸手撈了一把，涼得手指發疼。'],
  water_cave: ['洞裡很靜。石壁上的字，在水光裡一閃一閃。'],
  nanling_wilds: [
    '你在石峰之間繞了半天。每一根石峰，看起來都差不多；每一根，又都不一樣。',
    '你在一片竹林裡歇腳，竹葉沙沙地響。一隻竹雞從腳邊竄過去，嚇了你一跳。',
    '山腰上有一座小小的竹棚，棚裡沒人，桌上擺著一碗清水，像是留給過路人的。',
  ],
};
const loot = {
  qingzhu_village: [['mind', 1]],
  miasma_forest: [['maybe', 0.5, [['item', 'zhangling_zhi', 1]]], ['maybe', 0.1, [['item', 'mystery', 1]]]],
  poison_marsh: [['maybe', 0.4, [['item', 'zhixue_grass', [1, 2]]]]],
  wangu_valley: [['maybe', 0.3, [['item', 'zhangling_zhi', 1]]], ['mind', -1]],
  jade_pool: [['mind', 2]],
  water_cave: [['mind', 2]],
  nanling_wilds: [['maybe', 0.4, [['item', 'ningqi_grass', 1]]]],
};

/**
 * Their days (world/people.js ROUTINES): [from hour, [x, y], what they do, facing?]. 岩伯 sits a while
 * before the 山神 of a morning; 阿蘿 keeps her shop; 阿山 is off to the edge of the village at first
 * light and back to see to his bow. At night, indoors (they come to the door if you call).
 */
const routines = {
  yan_bo: {
    qingzhu_village: [
      [0, [3080, 1087], 'home'],
      [6, [3080, 1095], 'stand'],
      [8, [2800, 1200], 'sit'],
      [10, [3080, 1095], 'stand'],
      [19.5, [3080, 1087], 'home'],
    ],
  },
  a_luo: {
    qingzhu_village: [
      [0, [3190, 1261], 'home'],
      [7, [3100, 1300], 'stand'],
      [20, [3190, 1261], 'home'],
    ],
  },
  a_shan: {
    qingzhu_village: [
      [0, [3400, 1095], 'home'],
      [5, [3480, 1330], 'stand', -1],
      [8, [3420, 1110], 'sit'],
      [20, [3400, 1095], 'home'],
    ],
  },
};

/** Where the people of 南嶺 stand, by the region they are in (places.js NPC_SPOTS). */
const spots = {
  yan_bo: { qingzhu_village: [3080, 1095] },
  a_luo: { qingzhu_village: [3100, 1300] },
  a_shan: { qingzhu_village: [3420, 1110] },
  han_san: { ling_pass: [2690, 520] },
};

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

export const NANLING_LAND = { ground, trees, settled, roll, sound, moods, gather, wanderers, folk, calls, extras, wildlife, misty, encounter, ambient, flavor, loot, spots, routines };

// ── who lives here ──

/** The people of 南嶺 (world/npcs.js NAMED). Nobody here has heard of you. */
export const NANLING_PEOPLE = {
  yan_bo: {
    name: '岩伯', title: '青竹寨寨老', gender: '男', age: 74, realm: 0, stage: 0, loc: 'qingzhu_village',
    bio: '青竹寨的寨老，白鬍子垂到胸口。說話慢，眼睛卻利。寨子裡的大事小事，最後都要他點頭。',
  },
  a_luo: {
    name: '阿蘿', title: '百藥鋪的蠱婆', gender: '女', age: 38, realm: 1, stage: 3, loc: 'qingzhu_village',
    bio: '寨子裡懂蠱的女人，開著一間百藥鋪。外人都怕她；寨子裡的人生了病，卻都來找她。手腕上纏著一條細細的青蛇。',
  },
  a_shan: {
    name: '阿山', title: '青竹寨的獵戶', gender: '男', age: 24, realm: 0, stage: 0, loc: 'qingzhu_village',
    bio: '寨子裡最好的獵手，弓不離身，一年有半年睡在山裡。話少。弟弟阿水，是他唯一的親人。',
  },
  han_san: {
    name: '韓三', title: '落難散修', gender: '男', age: 41, realm: 1, stage: 4, loc: 'ling_pass',
    bio: '從東荒翻過山隘來找機緣的散修，在瘴林裡丟了半條命。如今在嶺口搭了個草棚，給過路的人指路，自己卻再也不敢往下走。',
  },
};

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
  { x: 2990, y: 1190, w: 26, h: 20, sprite: 'well' },
  // the boundary stone at the top of the pass, and 韓三's lean-to below it
  { x: 2560, y: 230, w: 30, h: 22, sprite: 'stele', block: false },
  { x: 2750, y: 468, w: 54, h: 36, sprite: 'hut' },
  // the stone at the mouth of 萬蠱谷; the old altar at the end of the trail through 瘴林
  { x: 3880, y: 2066, w: 30, h: 22, sprite: 'stele', block: false },
  { x: 830, y: 1848, w: 44, h: 36, sprite: 'shrine_small' },
  // the stone men of 毒沼, sunk to the waist
  { x: 1470, y: 3330, w: 18, h: 10, sprite: 'stele', block: false },
  { x: 1530, y: 3342, w: 18, h: 10, sprite: 'stele', block: false },
];

const lit = (s) => s.tod >= 19.5 || s.tod < 5;

/** Places you can walk up to (places.js POIS, for this map). */
const POIS = [
  {
    id: 'ling_pass_gate', region: 'ling_pass', x: 2615, y: 92, name: '山隘', verb: '翻回東荒',
    text: '山隘那頭，是東荒。',
  },
  { id: 'han_shed', region: 'ling_pass', x: 2750, y: 500, name: '草棚', verb: '歇腳', rest: true, text: '竹子和芭蕉葉搭的草棚，棚下一個火塘，火塘邊鋪著乾草。風從山隘那頭灌過來，棚子吱吱地響。' },
  // 青竹寨
  {
    id: 'zhai_well', region: 'qingzhu_village', x: 2990, y: 1216, name: '寨井', verb: '查看',
    text: (s) => (s.flags.gu_cleared ? '井水又清又甜。打水的人排著隊，說說笑笑。' : '井沿上的石頭被繩子磨出了一道道溝。井水黑沉沉的，聞著有一股苦味。'),
  },
  { id: 'zhai_shop', region: 'qingzhu_village', x: 3190, y: 1270, name: '百藥鋪', verb: '購物', action: 'shop', shop: 'qingzhu' },
  { id: 'zhai_drum', region: 'qingzhu_village', x: 3460, y: 1215, name: '銅鼓坪', verb: '打聽', action: 'inquire', glow: lit },
  { id: 'zhai_shrine', region: 'qingzhu_village', x: 2780, y: 1186, name: '山神龕', verb: '查看', rest: true, text: '竹子搭的小龕，供著一塊黑石頭，石頭上纏著紅布。龕前的竹筒裡插著山花，是新的。' },
  // 瘴林
  { id: 'gu_altar', region: 'miasma_forest', x: 830, y: 1880, name: '古祭壇', verb: '查看', text: '長滿青苔的石台，台上刻著一圈一圈的蟲紋。供在台上的陶罐早就碎了。' },
  { id: 'han_pack', region: 'miasma_forest', x: 1290, y: 1380, name: '掛在樹上的包袱', verb: '查看', hidden: { r: 100 }, show: (s) => !s.flags.han_pack_found, text: '樹枝上空空的。' },
  {
    id: 'web_hollow', region: 'miasma_forest', x: 1620, y: 2480, name: '白絲洞', verb: '查看', auto: 150,
    show: (s) => !!s.flags.a_shui_lost && !s.flags.a_shui_found,
    text: '兩棵老樹之間，掛滿了白絲，絲裡裹著一團一團的東西。',
  },
  { id: 'zl_miasma_a', region: 'miasma_forest', x: 880, y: 1020, name: '瘴氣', zone: 160, auto: 160 },
  { id: 'zl_miasma_b', region: 'miasma_forest', x: 1900, y: 1150, name: '瘴氣', zone: 150, auto: 150 },
  { id: 'zl_miasma_c', region: 'miasma_forest', x: 480, y: 2420, name: '瘴氣', zone: 170, auto: 170 },
  { id: 'zl_miasma_d', region: 'miasma_forest', x: 1300, y: 2400, name: '瘴氣', zone: 150, auto: 150 },
  // 毒沼
  { id: 'stone_men', region: 'poison_marsh', x: 1500, y: 3376, name: '石人', verb: '查看', text: '兩尊石人陷在泥裡，只露出上半身，臉都朝著沼地正中。石頭上長滿了黑苔。' },
  {
    id: 'marsh_lotus', region: 'poison_marsh', x: 1480, y: 3826, name: '沼心蓮', verb: '查看', hidden: { r: 120 }, glow: () => true,
    treasure: { text: '死水正中，一朵白蓮開得好好的，蓮心一點金。四周的泥水油亮發黑，蓮瓣上卻一點污跡也沒有。\n\n你踩著石人的肩膀，把它摘了下來。', effects: [['item', 'marsh_lotus', 1], ['sysexp', 10], ['log', '在毒沼正中摘得沼心蓮']] },
  },
  { id: 'zz_miasma_a', region: 'poison_marsh', x: 620, y: 3420, name: '瘴氣', zone: 170, auto: 170 },
  { id: 'zz_miasma_b', region: 'poison_marsh', x: 2150, y: 3560, name: '瘴氣', zone: 150, auto: 150 },
  // 碧潭: the falls, and what is behind them
  { id: 'falls', region: 'jade_pool', x: 3760, y: 3340, name: '瀑布', verb: '查看', text: '碧水從斷崖上直落下來，砸進潭裡，水霧騰起一丈多高。' },
  {
    id: 'cave_carvings', region: 'water_cave', x: 3905, y: 3286, name: '石壁刻字', verb: '參悟', sprite: 'stele', rest: true,
    show: (s) => !!s.flags.falls_cave_found,
    text: '石壁上的字，你已經讀過了。水簾外的轟響聽起來很遠。這裡適合閉關。',
  },
  // 萬蠱谷
  { id: 'valley_stele', region: 'wangu_valley', x: 3880, y: 2098, name: '谷口石碑', verb: '查看', text: '石碑上刻著四個大字，字縫裡塞滿了蟲殼：「生人勿入」。' },
  {
    id: 'gu_nest', region: 'wangu_valley', x: 4330, y: 1830, name: '蠱巢', verb: '查看', auto: 130,
    text: (s) => (s.flags.gu_nest_burned ? '一片焦黑的土坑。風吹過來，帶著一點灰。' : '石壁底下一個大洞，洞口堆滿了蟲殼，比人還高。'),
  },
  { id: 'gu_miasma_a', region: 'wangu_valley', x: 4480, y: 1640, name: '瘴氣', zone: 150, auto: 150 },
  { id: 'gu_miasma_b', region: 'wangu_valley', x: 4100, y: 2250, name: '瘴氣', zone: 140, auto: 140 },
  // 南嶺山野: small things found off the road
  { id: 'find_nl_hollow', region: 'nanling_wilds', x: 3020, y: 1800, name: '石峰下的小洞', verb: '查看', hidden: { r: 90 }, treasure: { text: '石峰腳下一個小洞，洞口被藤蔓遮著。洞裡乾燥，有人在這裡藏過東西：一個油布包，裡面幾塊靈石，三株曬乾的凝氣草。', effects: [['ls', 12], ['item', 'ningqi_grass', 3]] } },
  { id: 'find_nl_basket', region: 'nanling_wilds', x: 2480, y: 2700, name: '倒在路邊的背簍', verb: '查看', hidden: { r: 90 }, treasure: { text: '一個竹背簍倒在路邊，簍子裡的藥草撒了一地，人卻不知道哪裡去了。你把還能用的撿了起來，又在簍子邊插了一根樹枝，好讓它的主人認得。', effects: [['item', 'zhangling_zhi', 1], ['item', 'blood_ginseng', 1], ['mind', 1]] } },
  { id: 'find_nl_peak', region: 'nanling_wilds', x: 3300, y: 2380, name: '石峰頂', verb: '查看', hidden: { r: 90 }, treasure: { text: '你攀上一根矮些的石峰。往四面看，石峰一根一根，像一片插在綠海裡的筍。霧在峰與峰之間慢慢地流，流到天邊，和雲接在一起。\n\n你在峰頂坐了很久。', effects: [['insight', 1], ['mind', 3]] } },
];

/** What roams 南嶺 (places.js BEASTS, for this map). */
const BEASTS = [
  // 瘴林: nests of spiders; a pair of 山魈 where the jungle meets the rocks
  { id: 'spiders_a', kind: 'spider', n: 3, title: '毒蛛', x: 1200, y: 1300, r: 140, respawn: 30, power: 38 },
  { id: 'spiders_b', kind: 'spider', n: 3, title: '毒蛛', x: 1850, y: 2250, r: 140, respawn: 30, power: 38 },
  { id: 'spiders_c', kind: 'spider', n: 2, title: '毒蛛', x: 700, y: 2050, r: 120, respawn: 30, power: 34 },
  { id: 'shanxiao_nl', kind: 'shanxiao', n: 2, title: '山魈', x: 2200, y: 1950, r: 150, respawn: 40, power: 36 },
  // 毒沼: toads by the pools; the old one by the lotus
  { id: 'toads_a', kind: 'toad', n: 2, title: '巨蟾', x: 1000, y: 3500, r: 110, respawn: 25, power: 38 },
  { id: 'toads_b', kind: 'toad', n: 1, x: 1900, y: 3850, r: 100, respawn: 25, power: 30 },
  { id: 'toad_king_a', kind: 'toad_king', title: '毒蟾王', x: 1480, y: 3900, r: 120, respawn: 40, power: 72 },
  // 萬蠱谷: swarms on the valley floor; the mother at her nest (once killed, gone for good)
  { id: 'swarm_a', kind: 'swarm', n: 2, title: '蠱蟲', x: 4080, y: 2050, r: 140, respawn: 15, power: 38 },
  { id: 'swarm_b', kind: 'swarm', n: 2, title: '蠱蟲', x: 4400, y: 2150, r: 120, respawn: 15, power: 36 },
  { id: 'gu_mother_a', kind: 'gu_mother', title: '蠱母', x: 4330, y: 1780, r: 120, respawn: 60, power: 84, cond: (s) => !(s.vars.kills?.gu_mother > 0) },
];

export const NANLING_PLACES = { STRUCTURES, POIS, BEASTS };
