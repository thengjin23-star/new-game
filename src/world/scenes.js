// 現場: things happening out in the world that you can see before you are
// in them. A merchant resting by the road, villagers kneeling at a village
// gate, a dead porter in a ditch, a rival reaching for the same ginseng.
// Each scene is drawn where it happens; walk up to it (or, for some, just
// come close) and its event begins. Walk on, and it is gone.
//
// A scene names its event (content/events), where it can happen, what kind
// of ground it needs, when, and who and what stands there.

/** Regions where the road is the thing (the old 'travel' encounters happen here). */
export const ROAD_REGIONS = ['wilds', 'farmland', 'mirror_lake', 'crane_ferry', 'fox_shrine'];

/**
 * ground: road | roadside | wild | forest | street | water | any
 * when: day | night | any
 * start: 'touch' (walk up and act on it) | 'near' (begins as you come within radius)
 * after: what it does once its event is over: 'leave' (walk off) | 'stay' | 'vanish'
 * life: game hours it lingers if you leave it be
 * actors: [{ a: 'person'|'beast'|'prop', look|beast|prop, pose, at: [dx, dy] }]
 * move: { speed, east } walks off east or west; { speed, toward } runs straight at you
 * orient: the actors' `at` turns with the scene: +y points away from you (who chases whom)
 * faceWater: everyone in it faces the nearest water
 */
export const SCENES = [
  {
    id: 'merchant',
    event: 'travel_merchant',
    regions: ROAD_REGIONS,
    ground: 'roadside',
    when: 'day',
    start: 'touch',
    name: '行商',
    verb: '上前',
    bubble: '…',
    after: 'leave',
    life: 6,
    actors: [
      { a: 'prop', prop: 'canopy', at: [0, -6] },
      { a: 'person', look: 'merchant', pose: 'sit', at: [-4, 0] },
      { a: 'prop', prop: 'mule', at: [30, 8] },
      { a: 'prop', prop: 'crates', at: [-26, 6] },
    ],
  },
  {
    id: 'old_friend',
    event: 'travel_old_friend',
    regions: ROAD_REGIONS,
    ground: 'road',
    when: 'any',
    start: 'near',
    radius: 90,
    name: '故人',
    verb: '上前',
    bubble: '！',
    after: 'leave',
    life: 4,
    actors: [{ a: 'person', look: 'sanxiu', pose: 'wave', at: [0, 0] }],
  },
  {
    id: 'corpse',
    event: 'travel_corpse',
    regions: ROAD_REGIONS,
    ground: 'roadside',
    when: 'any',
    start: 'touch',
    name: '路倒',
    verb: '查看',
    after: 'vanish',
    life: 24,
    actors: [
      { a: 'person', look: 'porter', pose: 'lie', at: [0, 0] },
      { a: 'prop', prop: 'pole', at: [10, 8] },
      { a: 'beast', beast: 'crow', at: [-16, -6] },
      { a: 'beast', beast: 'crow', at: [18, -10] },
    ],
  },
  {
    id: 'village',
    event: 'travel_village_demon',
    regions: ROAD_REGIONS,
    ground: 'roadside',
    when: 'day',
    start: 'near',
    radius: 110,
    name: '山村',
    bubble: '！',
    after: 'leave',
    life: 8,
    actors: [
      { a: 'person', look: 'elder', pose: 'kneel', at: [0, 0] },
      { a: 'person', look: 'villager', pose: 'kneel', at: [-22, -10] },
      { a: 'person', look: 'villager_f', pose: 'kneel', at: [20, -12] },
      { a: 'person', look: 'child', pose: 'stand', at: [32, -2] },
      { a: 'prop', prop: 'hut', at: [-6, -70] },
    ],
  },
  {
    id: 'ginseng',
    event: 'forest_rival',
    regions: ['black_forest'],
    ground: 'forest',
    when: 'any',
    start: 'touch',
    name: '血參',
    verb: '查看',
    after: 'leave',
    life: 8,
    fx: 'herb',
    actors: [
      { a: 'prop', prop: 'ginseng', at: [0, 0] },
      { a: 'person', look: 'sanxiu', pose: 'stand', at: [26, -4] },
    ],
  },
  {
    id: 'old_foe',
    event: 'forest_ambush_old_foe',
    regions: ['black_forest'],
    ground: 'any',
    when: 'any',
    start: 'near',
    radius: 130,
    name: '舊怨',
    bubble: '！',
    after: 'vanish',
    life: 3,
    actors: [{ a: 'person', look: 'foe', pose: 'sword', at: [0, 0] }],
  },
  {
    id: 'white_fox',
    event: 'town_fox_night',
    regions: ['qingshi_town'],
    ground: 'street',
    when: 'night',
    start: 'touch',
    name: '白狐',
    verb: '跟上',
    after: 'vanish',
    life: 1.5,
    fx: 'foxfire',
    move: { speed: 16, east: true },
    actors: [{ a: 'beast', beast: 'fox', at: [0, 0] }],
  },
];


// ── the town and the market ──

SCENES.push(
  {
    id: 'performer',
    event: 'town_performer',
    regions: ['qingshi_town'],
    ground: 'street',
    when: 'day',
    start: 'touch',
    name: '賣藝',
    verb: '看看',
    bubble: '…',
    after: 'stay',
    life: 4,
    actors: [
      { a: 'person', look: 'performer', pose: 'fight', at: [0, 0] },
      { a: 'person', look: 'child', pose: 'stand', at: [-28, 6], face: 1 },
      { a: 'prop', prop: 'drum', at: [-42, 0] },
      { a: 'person', look: 'villager', pose: 'stand', at: [26, 22], face: -1 },
      { a: 'person', look: 'villager_f', pose: 'stand', at: [-8, 28], face: 1 },
      { a: 'person', look: 'elder', pose: 'stand', at: [36, 4], face: -1 },
    ],
  },
  {
    // a thief running straight at you, the shopkeeper puffing along behind
    id: 'thief',
    event: 'town_thief',
    regions: ['qingshi_town'],
    ground: 'street',
    when: 'any',
    start: 'near',
    radius: 100,
    orient: true,
    name: '小賊',
    bubble: '！',
    after: 'leave',
    life: 1,
    move: { speed: 50, toward: true },
    actors: [
      { a: 'person', look: 'thief', pose: 'stand', at: [0, 0] },
      { a: 'person', look: 'merchant', pose: 'stand', at: [6, 46] },
    ],
  },
  {
    id: 'duel',
    event: 'market_duel',
    regions: ['luoxia_market'],
    ground: 'street',
    when: 'day',
    start: 'touch',
    name: '鬥法',
    verb: '圍觀',
    bubble: '！',
    after: 'leave',
    life: 3,
    actors: [
      { a: 'person', look: 'disciple', pose: 'fight', at: [-16, 0], face: 1 },
      { a: 'person', look: 'sanxiu', pose: 'fight', at: [16, 2], face: -1 },
      { a: 'person', look: 'vendor', pose: 'stand', at: [-36, 22], face: 1 },
      { a: 'person', look: 'villager', pose: 'stand', at: [32, 24], face: -1 },
      { a: 'person', look: 'elder', pose: 'stand', at: [2, 32], face: 1 },
    ],
  },
  {
    id: 'sword_seller',
    event: 'market_sword_seller',
    regions: ['luoxia_market'],
    ground: 'street',
    when: 'day',
    start: 'touch',
    name: '賣劍的人',
    verb: '上前',
    after: 'stay',
    life: 6,
    actors: [
      { a: 'person', look: 'wounded', pose: 'sit', at: [0, 0], face: 1 },
      { a: 'prop', prop: 'mat', at: [16, 6] },
      { a: 'prop', prop: 'sword', at: [16, 5] },
    ],
  },
);

// ── the road, the water, the old battlefield ──

SCENES.push(
  {
    id: 'escort',
    event: 'travel_escort',
    regions: ROAD_REGIONS,
    ground: 'road',
    when: 'day',
    start: 'near',
    radius: 130,
    name: '劫鏢',
    bubble: '！',
    after: 'vanish',
    life: 2,
    actors: [
      { a: 'prop', prop: 'cart', at: [-36, -14] },
      { a: 'person', look: 'guard', pose: 'fight', at: [-8, 2], face: 1 },
      { a: 'person', look: 'guard', pose: 'fight', at: [-20, 16], face: 1 },
      { a: 'person', look: 'thief', pose: 'fight', at: [18, 0], face: -1 },
      { a: 'person', look: 'thief', pose: 'fight', at: [12, 20], face: -1 },
      { a: 'person', look: 'thief', pose: 'fight', at: [32, 10], face: -1 },
    ],
  },
  {
    id: 'wounded',
    event: 'travel_wounded',
    regions: ROAD_REGIONS,
    ground: 'roadside',
    when: 'any',
    start: 'touch',
    name: '負傷的人',
    verb: '上前',
    after: 'stay',
    life: 8,
    actors: [
      { a: 'person', look: 'wounded', pose: 'sit', at: [0, 0] },
      { a: 'prop', prop: 'sword', at: [26, 10] },
    ],
  },
  {
    id: 'trap',
    event: 'travel_trap',
    regions: ROAD_REGIONS,
    ground: 'wild',
    when: 'day',
    start: 'touch',
    name: '獸夾',
    verb: '查看',
    after: 'vanish',
    life: 10,
    actors: [
      { a: 'beast', beast: 'fox_trapped', at: [0, 0] },
      { a: 'prop', prop: 'trap', at: [-10, 2] },
    ],
  },
  {
    id: 'fisher',
    event: 'lake_fisher',
    regions: ['mirror_lake'],
    ground: 'water',
    when: 'any',
    start: 'touch',
    faceWater: true,
    name: '漁翁',
    verb: '上前',
    after: 'stay',
    life: 5,
    actors: [
      { a: 'person', look: 'fisher', pose: 'fish', at: [0, 0] },
      { a: 'prop', prop: 'basket', at: [-14, 8] },
    ],
  },
  {
    id: 'wisps',
    event: 'ruins_wisps',
    regions: ['ancient_ruins'],
    ground: 'any',
    when: 'night',
    start: 'touch',
    name: '鬼火',
    verb: '查看',
    after: 'vanish',
    life: 2,
    actors: [
      { a: 'prop', prop: 'wisp', at: [0, -4] },
      { a: 'prop', prop: 'wisp', at: [-36, 12] },
      { a: 'prop', prop: 'wisp', at: [34, 16] },
    ],
  },
  {
    id: 'crate',
    event: 'ferry_crate',
    regions: ['crane_ferry'],
    ground: 'water',
    when: 'day',
    start: 'touch',
    name: '浮箱',
    verb: '查看',
    after: 'stay',
    life: 12,
    actors: [{ a: 'prop', prop: 'box', at: [0, 0] }],
  },
  {
    id: 'spirit_deer',
    event: 'valley_deer',
    regions: ['lingxi_valley'],
    ground: 'wild',
    when: 'any',
    start: 'touch',
    name: '靈鹿',
    verb: '跟上',
    after: 'vanish',
    life: 3,
    actors: [{ a: 'beast', beast: 'spirit_deer', at: [0, 0] }],
  },
);

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((d) => [d.id, d]));
export const SCENE_OF_EVENT = Object.fromEntries(SCENES.map((d) => [d.event, d]));
