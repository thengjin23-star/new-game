// 精煉 (0.15): a piece of gear refined at the 百煉坊 gives that much more
// (content/crafts.js REFINE: a share for each level, up to +3).
import { REFINE } from '../content/crafts.js';

/** How far this piece has been refined (0: not at all). */
export function refineLevel(s, id) {
  return Math.min(REFINE.max, s.player?.refine?.[id] || 0);
}

/** What its gifts are multiplied by. */
export function refineMult(s, id) {
  return 1 + REFINE.each * refineLevel(s, id);
}
