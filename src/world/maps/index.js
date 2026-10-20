// The maps beyond 東荒 (東荒's own data stays where it always was: geo.js,
// places.js, map.js). Each gives its land (geo), how its ground lies and what
// grows on it (land), its places (nodes), and what stands on it (places).

import { NANLING_GEO, NANLING_LAND, NANLING_NODES, NANLING_PLACES } from './nanling.js';

export const LANDS = [
  { id: 'nanling', name: '南嶺', title: '南嶺・青竹一帶', home: 'qingzhu_village', geo: NANLING_GEO, land: NANLING_LAND, nodes: NANLING_NODES, places: NANLING_PLACES },
];

/** One table from every map's entries of a kind (by region): e.g. landTable('trees'). */
export function landTable(kind) {
  return Object.assign({}, ...LANDS.map((m) => m.land?.[kind] || {}));
}
