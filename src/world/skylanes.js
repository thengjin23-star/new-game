// 天上的劍光 (1.0 中州): in 中州 somebody is always flying over — sword-light by
// day, a lamp by night — on the ways between the city and the sects (and out
// along the 官道 toward 天衍城). Nobody you can reach: what the sky of a great
// land looks like (art/world3d.js draws them). Each map that has them lists
// its lanes: [from, to, how many flying it at once].

const LANES = {
  zhongzhou: [
    [[1700, 2900], [4450, 1150], 4], // 臨江城 ⇄ 天劍宗
    [[1750, 2650], [4950, 2700], 3], // 臨江城 ⇄ 官道關 (and on to 天衍城)
    [[4450, 1150], [4250, 3650], 2], // 天劍宗 ⇄ 雲夢大澤
    [[1700, 2900], [1750, 1100], 2], // 臨江城 ⇄ 舊觀星台
  ],
};

/** World units a second, flying a sword. */
const SPEED = 380;

/**
 * Who is up there now (t: seconds of real time): { id, x, y, alt (above the ground), dx, dy (the way
 * they go, unit), alpha (rising off the ground, coming down at the end) } for the map's lanes.
 */
export function swordLights(map, t) {
  const lanes = LANES[map];
  if (!lanes) return [];
  const out = [];
  lanes.forEach(([a, b, n], li) => {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const D = Math.hypot(vx, vy);
    for (let k = 0; k < n; k++) {
      // half of them each way, spread along the lane
      const back = k % 2 === 1;
      let u = ((t * SPEED) / D + k / n + li * 0.37) % 1;
      if (back) u = 1 - u;
      const dir = back ? -1 : 1;
      out.push({
        id: `${li}:${k}`,
        x: a[0] + vx * u,
        y: a[1] + vy * u,
        alt: 150 + ((li * 53 + k * 29) % 70),
        dx: (vx / D) * dir,
        dy: (vy / D) * dir,
        alpha: Math.min(1, u * 8, (1 - u) * 8),
      });
    }
  });
  return out;
}

/** Does this map's sky have them? */
export function hasSwordLights(map) {
  return !!LANES[map];
}
