// The maps beyond 東荒 (東荒's own data stays where it always was: geo.js,
// places.js, map.js). Each gives its land (geo), how its ground lies and what
// grows on it (land), its places (nodes), and what stands on it (places);
// rock: how its stone is tinted in the 3D world (sandstone in the desert);
// palette: its own ground colours, where they are not 東荒's; winter: its
// pictures are winter's in every season (the north).

import { NANLING_GEO, NANLING_LAND, NANLING_NODES, NANLING_PLACES, NANLING_PEOPLE } from './nanling.js';
import { XIMO_GEO, XIMO_LAND, XIMO_NODES, XIMO_PLACES, XIMO_PEOPLE, XIMO_PALETTE } from './ximo.js';
import { BEIYUAN_GEO, BEIYUAN_LAND, BEIYUAN_NODES, BEIYUAN_PLACES, BEIYUAN_PEOPLE, BEIYUAN_PALETTE } from './beiyuan.js';
import { ZHONGZHOU_GEO, ZHONGZHOU_LAND, ZHONGZHOU_NODES, ZHONGZHOU_PLACES, ZHONGZHOU_PEOPLE, ZHONGZHOU_PALETTE } from './zhongzhou.js';
import { TIANYAN_GEO, TIANYAN_LAND, TIANYAN_NODES, TIANYAN_PLACES, TIANYAN_PEOPLE, TIANYAN_PALETTE } from './tianyan.js';

export const LANDS = [
  { id: 'nanling', name: '南嶺', title: '南嶺・青竹一帶', realm: '煉氣中期～築基初期', home: 'qingzhu_village', geo: NANLING_GEO, land: NANLING_LAND, nodes: NANLING_NODES, places: NANLING_PLACES, people: NANLING_PEOPLE },
  { id: 'ximo', name: '西漠', title: '西漠・月泉一帶', realm: '築基初期～中期', home: 'yuequan', rock: [1.24, 1.02, 0.78], palette: XIMO_PALETTE, geo: XIMO_GEO, land: XIMO_LAND, nodes: XIMO_NODES, places: XIMO_PLACES, people: XIMO_PEOPLE },
  // winter: it is always winter to look at (snow on every roof, every tree, every peak), whatever the month
  { id: 'beiyuan', name: '北原', title: '北原・寒鐵一帶', realm: '築基後期～金丹', home: 'hantie_fort', rock: [0.92, 0.97, 1.08], winter: true, palette: BEIYUAN_PALETTE, geo: BEIYUAN_GEO, land: BEIYUAN_LAND, nodes: BEIYUAN_NODES, places: BEIYUAN_PLACES, people: BEIYUAN_PEOPLE },
  // (1.0) 第二章: across the river
  { id: 'zhongzhou', name: '中州', title: '中州・臨江一帶', realm: '築基初期～金丹', home: 'linjiang', palette: ZHONGZHOU_PALETTE, geo: ZHONGZHOU_GEO, land: ZHONGZHOU_LAND, nodes: ZHONGZHOU_NODES, places: ZHONGZHOU_PLACES, people: ZHONGZHOU_PEOPLE },
  // (1.2) 中州's other map: the capital, three days east of 官道關 (its stone pale as jade, like the finger it is built round)
  { id: 'tianyan', name: '天衍城', title: '中州・天衍城', realm: '築基後期～金丹', home: 'waicheng', rock: [1.1, 1.1, 1.08], palette: TIANYAN_PALETTE, geo: TIANYAN_GEO, land: TIANYAN_LAND, nodes: TIANYAN_NODES, places: TIANYAN_PLACES, people: TIANYAN_PEOPLE },
];

/** One table from every map's entries of a kind (by region): e.g. landTable('trees'). */
export function landTable(kind) {
  return Object.assign({}, ...LANDS.map((m) => m.land?.[kind] || {}));
}

/** One list from every map's entries of a kind: e.g. landList('extras'). */
export function landList(kind) {
  return LANDS.flatMap((m) => m.land?.[kind] || []);
}

/**
 * (1.0) A table kept by person (their days, where they stand: { person: { region: … } }), from 東荒's own
 * (base) and every map's: one who is on more than one map (蘇清瑤 in 東荒 and then 中州) keeps the regions of each.
 */
export function landPeopleTable(kind, base) {
  const out = { ...base };
  for (const m of LANDS) for (const [id, byRegion] of Object.entries(m.land?.[kind] || {})) out[id] = { ...(out[id] || {}), ...byRegion };
  return out;
}
