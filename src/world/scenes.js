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
 * move: walks along the nearest road at this speed (units per second)
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

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((d) => [d.id, d]));
export const SCENE_OF_EVENT = Object.fromEntries(SCENES.map((d) => [d.event, d]));
