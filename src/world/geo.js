// The shape of 東荒・青石一帶: one continuous painted world.
// Units are world units; one grid cell is CELL units square.

export const WORLD_W = 5200;
export const WORLD_H = 4600;
export const CELL = 40;
export const COLS = WORLD_W / CELL; // 130
export const ROWS = WORLD_H / CELL; // 115

/** Terrain kinds. pass: can walk; speed: walking speed multiplier. */
export const T = {
  VOID: 0,
  GRASS: 1,
  ROAD: 2,
  FARM: 3,
  FOREST: 4,
  DEEP: 5,
  HILL: 6,
  PEAK: 7,
  CLIFF: 8,
  WATER: 9,
  SAND: 10,
  WASTE: 11,
  PAVED: 12,
  BRIDGE: 13,
  WALL: 14,
  GATE: 15,
  TRAIL: 16,
  TALLGRASS: 17,
};

export const TERRAIN = {
  [T.VOID]: { name: '雲霧', pass: false, speed: 0 },
  [T.GRASS]: { name: '草地', pass: true, speed: 1 },
  [T.ROAD]: { name: '官道', pass: true, speed: 1.3 },
  [T.FARM]: { name: '田野', pass: true, speed: 0.9 },
  [T.FOREST]: { name: '樹林', pass: true, speed: 0.75 },
  [T.DEEP]: { name: '密林', pass: true, speed: 0.55 },
  [T.HILL]: { name: '山坡', pass: true, speed: 0.8 },
  [T.PEAK]: { name: '山峰', pass: false, speed: 0 },
  [T.CLIFF]: { name: '峭壁', pass: false, speed: 0 },
  [T.WATER]: { name: '水', pass: false, speed: 0 },
  [T.SAND]: { name: '河灘', pass: true, speed: 0.85 },
  [T.WASTE]: { name: '荒原', pass: true, speed: 0.9 },
  [T.PAVED]: { name: '石板路', pass: true, speed: 1.15 },
  [T.BRIDGE]: { name: '橋', pass: true, speed: 1.2 },
  [T.WALL]: { name: '牆', pass: false, speed: 0 },
  [T.GATE]: { name: '山門', pass: true, speed: 1 },
  [T.TRAIL]: { name: '小徑', pass: true, speed: 1.1 },
  [T.TALLGRASS]: { name: '荒草', pass: true, speed: 0.8 },
};

/**
 * Regions, in priority order: the first shape containing a cell owns it.
 * `requires` hides a region until a story flag is set (it reads as the
 * region around it until then).
 */
export const REGION_SHAPES = [
  { id: 'hidden_cave', circle: [1176, 2590, 70], requires: 'cave_found' },
  { id: 'qingshi_town', poly: [[1820, 2860], [2700, 2850], [2760, 3420], [1860, 3440], [1760, 3200]] },
  { id: 'luoxia_market', poly: [[3600, 2240], [4320, 2240], [4320, 2880], [3600, 2880]] },
  { id: 'qingxu_temple', poly: [[760, 2960], [1380, 2940], [1420, 3470], [800, 3490]] },
  { id: 'fox_shrine', poly: [[2860, 2820], [3340, 2820], [3360, 3210], [2880, 3230]] },
  { id: 'mirror_lake', poly: [[2880, 3420], [3660, 3420], [3680, 4060], [2880, 4080]] },
  { id: 'crane_ferry', poly: [[4200, 3600], [4700, 3560], [4760, 4320], [4220, 4340]] },
  { id: 'farmland', poly: [[1650, 3420], [2880, 3400], [2880, 3990], [1700, 4000]] },
  { id: 'lingxi_valley', ellipse: [600, 1820, 420, 460] },
  { id: 'qingyun_sect', poly: [[3780, 560], [4720, 600], [4740, 1760], [3820, 1790]] },
  { id: 'ancient_ruins', poly: [[1740, 240], [3460, 210], [3780, 700], [3360, 1130], [1940, 1130], [1580, 700]] },
  { id: 'black_forest', poly: [[940, 1130], [1700, 1070], [3360, 1140], [3520, 1660], [3160, 2090], [2150, 2060], [1140, 2010]] },
  { id: 'qingshi_hill', poly: [[640, 2040], [2060, 2050], [2160, 2840], [1700, 2900], [1360, 2950], [700, 2950]] },
  { id: 'great_river', fromTerrain: T.WATER, river: 'great' },
  { id: 'wilds', default: true },
];

/** Impassable mountain masses inside the playable world: [cx, cy, rx, ry]. */
export const PEAKS = [
  // 青石山
  [1000, 2300, 170, 120],
  [1180, 2470, 110, 90],
  [1620, 2200, 160, 110],
  [1780, 2380, 110, 90],
  [880, 2720, 130, 110],
  [1500, 2800, 90, 70],
  [1960, 2600, 90, 80],
  // 西北群山（靈溪谷外）
  [260, 1100, 220, 260],
  [1050, 1500, 140, 220],
  [300, 2500, 200, 240],
  [520, 2950, 160, 180],
  // 古戰場與青雲宗之間
  [3620, 420, 180, 200],
  // 南方丘陵
  [1250, 4200, 220, 140],
  [2050, 4300, 260, 120],
  [3050, 4300, 200, 120],
  [3900, 4150, 180, 160],
  [600, 3900, 220, 260],
  // 東荒野地裡零星的山頭
  [3350, 1950, 120, 100],
  [2700, 2350, 110, 90],
  [3850, 3300, 120, 110],
];

/** The cliff of 斷魂崖, as a thick line. */
export const CLIFF_LINES = [[[1230, 2625], [1480, 2660], 34]];

/** 靈溪谷 is ringed by cliffs, open only where its stream leaves (the gorge). */
export const VALLEY = { cx: 600, cy: 1820, rx: 420, ry: 460, ring: 0.14, gorge: [1000, 2010], gorgeHalf: 0.24 };

/** 青雲宗: a mountain massif with a plateau on top and stairs up the south face. */
export const SECT = {
  massif: [[3800, 600], [4700, 640], [4720, 1720], [3840, 1760]],
  plateau: [4300, 1080, 330, 240],
  gateY: 1420,
  gateX: [4200, 4320],
};

/** The great river and the stream 靈溪. width in world units. */
export const RIVERS = [
  { id: 'great', width: 380, pts: [[4920, -40], [4830, 900], [4880, 1900], [4800, 2900], [4760, 3700], [4860, 4640]] },
  { id: 'lingxi', width: 52, pts: [[560, 1770], [780, 1890], [950, 2010], [1050, 2110], [1150, 2230], [1260, 2380], [1420, 2560], [1600, 2720], [1740, 2900], [1790, 3120], [1850, 3400], [2300, 3600], [2700, 3650], [2960, 3690]] },
];

/** Lakes: [cx, cy, rx, ry]. */
export const LAKES = [
  [3270, 3740, 320, 230],
  [560, 1760, 95, 62],
];

/** Roads (官道) and trails (小徑). Water crossings become bridges. */
export const ROADS = [
  { kind: 'road', width: 56, pts: [[1060, 3240], [1400, 3220], [1650, 3180], [1840, 3150], [2740, 3140], [2980, 3120], [3250, 3020], [3450, 2800], [3600, 2580]] },
  { kind: 'road', width: 56, pts: [[3600, 2560], [4320, 2560]] },
  { kind: 'road', width: 56, pts: [[3960, 2240], [3960, 2880]] },
  { kind: 'road', width: 52, pts: [[3960, 2240], [4020, 2050], [4130, 1880], [4190, 1760], [4235, 1600], [4260, 1440], [4290, 1330]] },
  { kind: 'road', width: 52, pts: [[3960, 2880], [4000, 3150], [4200, 3450], [4450, 3800], [4590, 3950]] },
  { kind: 'trail', width: 34, pts: [[2150, 2860], [1950, 2760], [1700, 2620], [1460, 2480], [1340, 2300], [1300, 2100], [1500, 1900], [1800, 1750], [2150, 1550], [2450, 1300], [2560, 1130], [2600, 900], [2600, 700]] },
  { kind: 'trail', width: 30, pts: [[1310, 2160], [1180, 2080], [1060, 1990], [900, 1880], [750, 1780]] },
  { kind: 'trail', width: 30, pts: [[2150, 1550], [2700, 1500], [3200, 1650], [3500, 1900], [3800, 2100], [3960, 2240]] },
  { kind: 'trail', width: 26, pts: [[2740, 3140], [2900, 3080], [3040, 3030]] },
  { kind: 'trail', width: 26, pts: [[2980, 3120], [3150, 3300], [3260, 3470]] },
  { kind: 'trail', width: 26, pts: [[2250, 3420], [2250, 3920]] },
  { kind: 'trail', width: 26, pts: [[1760, 3800], [2860, 3790]] },
  { kind: 'trail', width: 24, pts: [[1400, 3220], [1450, 2980], [1700, 2780]] },
  { kind: 'trail', width: 24, pts: [[1060, 3240], [1060, 3120]] },
  { kind: 'trail', width: 24, pts: [[3600, 2580], [3380, 2420], [3100, 2380], [2860, 2300]] },
  // 鎮南的小巷
  { kind: 'lane', width: 30, pts: [[1900, 3303], [2700, 3298]] },
  // 渡口的棧橋，湖心亭的木橋
  { kind: 'pier', width: 28, pts: [[4545, 3935], [4690, 3975]] },
  { kind: 'pier', width: 26, pts: [[3260, 3455], [3260, 3570]] },
];

/** 落霞坊市的城牆: the ring of cells just inside this rectangle. Roads make the gates. */
export const MARKET_WALL = [3600, 2240, 4320, 2880];

/** The world's edge: mountains to the north, west and south, the river to the east. */
export const BORDER = { north: 170, west: 150, south: 4370, eastRiver: 'great' };
