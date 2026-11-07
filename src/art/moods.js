// Each region's own air, for both the 3D and the flat view: a tint the distance leans toward (and, in the
// flat view, the whole picture a little), how dim it is, how much of the sun gets in, and what drifts
// in it (motes, dark leaves, ash).

import { landTable } from '../world/maps/index.js';

/**
 * Each region has its own air: the valley breathes spirit, the forest broods, the ruins are dusty.
 * sun: how much of the sun gets in (under the ground, little: 西漠's 地宮).
 */
const MOODS = {
  lingxi_valley: { tint: [0.8, 0.93, 0.9], amount: 0.38, dim: 1, motes: 'mote' },
  black_forest: { tint: [0.5, 0.58, 0.52], amount: 0.42, dim: 0.86, motes: 'darkleaf' },
  ancient_ruins: { tint: [0.86, 0.74, 0.6], amount: 0.36, dim: 0.95, motes: 'ash' },
  qingyun_sect: { tint: [0.9, 0.94, 0.99], amount: 0.3, dim: 1.02, motes: null },
  mirror_lake: { tint: [0.82, 0.88, 0.93], amount: 0.3, dim: 1, motes: null },
  fox_shrine: { tint: [0.86, 0.82, 0.9], amount: 0.26, dim: 0.96, motes: null },
  hidden_cave: { tint: [0.6, 0.62, 0.66], amount: 0.3, dim: 0.9, motes: null },
  // the other maps' regions
  ...landTable('moods'),
};

const NONE = { tint: [0, 0, 0], amount: 0, dim: 1, sun: 1, motes: null };

/** The air of a region (none: the plain air). */
export function moodOf(loc) {
  return MOODS[loc] || NONE;
}
