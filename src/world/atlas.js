// 天下輿圖: the maps of the world, and which one you are on. Every map is the
// same size; only one is loaded at a time. Crossing into another (world/
// explore.js crossTo) puts its land, buildings, places and beasts where the
// last map's were (geo.js, places.js: live bindings), and everything built
// from them — the terrain grid, the heights, the fog, the painted world —
// is built again for it, or taken from what was built the last time you
// were there. Whatever keeps such a thing registers with onMapChange.

import { DONGHUANG_GEO, setGeo } from './geo.js';
import { DONGHUANG_PLACES, setPlaces } from './places.js';
import { LANDS } from './maps/index.js';

/** Every map. home: where you are put down if nowhere else will do (and where a 歸元符 takes you, failing a town). */
export const MAPS = {
  donghuang: { id: 'donghuang', name: '東荒', title: '東荒・青石一帶', geo: DONGHUANG_GEO, places: DONGHUANG_PLACES, home: 'qingxu_temple' },
  ...Object.fromEntries(LANDS.map((m) => [m.id, m])),
};

/**
 * The ways from one map to another, by the region you set off from: where
 * they lead (to), where you come out (at, on that map), and how many hours
 * the way takes.
 */
export const CROSSINGS = {
  south_pass: { to: 'nanling', at: [2614, 210], hours: 6 },
  ling_pass: { to: 'donghuang', at: [2610, 4400], hours: 6 },
  west_pass: { to: 'ximo', at: [5080, 1650], hours: 10 },
  luori_pass: { to: 'donghuang', at: [120, 560], hours: 10 },
  yanhui_pass: { to: 'beiyuan', at: [2600, 4500], hours: 12 },
  xueling_kou: { to: 'donghuang', at: [3070, 60], hours: 12 },
};

let current = 'donghuang';
const hooks = [];

/** The map you are on (the one loaded). */
export function mapId() {
  return current;
}

/** The season the map you are on looks like (the north is winter to look at, whatever the month). */
export function seasonLook(season) {
  return MAPS[current]?.winter ? 'winter' : season;
}

/** Call fn(id) whenever another map is put in place (to drop what was built for the last one). */
export function onMapChange(fn) {
  hooks.push(fn);
}

/** Put a map in place (if it is not already). Returns whether anything changed. */
export function useMap(id) {
  if (!MAPS[id]) id = 'donghuang';
  if (id === current) return false;
  current = id;
  setGeo(MAPS[id].geo);
  setPlaces(MAPS[id].places);
  for (const fn of hooks) fn(id);
  return true;
}
