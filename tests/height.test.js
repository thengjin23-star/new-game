// The height of the ground: what the 3D world stands on. It has to agree
// with where you can walk, keep water in its bed and towns level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world } from '../src/world/terrain.js';
import { STRUCTURES } from '../src/world/places.js';
import { T, CELL, COLS, ROWS } from '../src/world/geo.js';
import { heights, heightAt, waterAt, LEVEL } from '../src/world/height.js';

test('the ground you can walk on is never a cliff', () => {
  const g = world();
  let walkable = 0;
  let gentle = 0;
  let worst = 0;
  for (let j = 1; j < ROWS - 1; j++) {
    for (let i = 1; i < COLS - 1; i++) {
      if (!g.reach[j * COLS + i]) continue;
      const x = (i + 0.5) * CELL;
      const y = (j + 0.5) * CELL;
      let s = 0;
      for (const [dx, dy] of [[20, 0], [0, 20], [14, 14], [14, -14]]) s = Math.max(s, Math.abs(heightAt(x + dx, y + dy) - heightAt(x - dx, y - dy)) / 40);
      walkable++;
      if (s <= 0.45) gentle++;
      worst = Math.max(worst, s);
    }
  }
  assert.ok(gentle / walkable > 0.99, `${gentle} of ${walkable} walkable cells are gentle`);
  // the steepest are the banks of the falls beside 斷魂崖, where the stream drops to the foot of the cliff
  assert.ok(worst < 1.6, `steepest walkable slope ${worst.toFixed(2)}`);
});

test('mountains stand above the land around them, and the sect sits high', () => {
  assert.ok(heightAt(4300, 1080) > LEVEL.sect - 5, 'the sect plateau is up on its massif');
  assert.ok(heightAt(4190, 1760) < 90, 'the stair starts at the foot of the mountain');
  assert.ok(heightAt(4260, 1440) > 180, 'and climbs to the gate');
  assert.ok(heightAt(1620, 2200) - heightAt(1400, 2200) > 100, 'a peak of 青石山 rises over its foot');
  assert.ok(heightAt(1355, 2615) - heightAt(1360, 2740) > 70, '斷魂崖 drops sheer to where you wake');
  assert.ok(heightAt(600, 1900) > 100, '靈溪谷 is a high valley');
  assert.ok(heightAt(2200, 3150) < 20 && heightAt(3960, 2560) < 25, 'the town and the market sit low and level');
});

test('water lies in its bed, and the stream only runs downhill', () => {
  const g = world();
  const H = heights();
  let wet = 0;
  for (let k = 0; k < COLS * ROWS; k++) {
    if (g.terr[k] !== T.WATER) continue;
    const x = ((k % COLS) + 0.5) * CELL;
    const y = (Math.floor(k / COLS) + 0.5) * CELL;
    const w = waterAt(x, y);
    assert.ok(w !== null, `water at (${x}, ${y}) has a surface`);
    assert.ok(heightAt(x, y) < w, `the bed at (${x}, ${y}) is under the water`);
    wet++;
  }
  assert.ok(wet > 500);
  const stream = H.streams.find((r) => r.id === 'lingxi');
  for (let n = 1; n < stream.pts.length; n++) assert.ok(stream.pts[n][2] <= stream.pts[n - 1][2] + 1e-6, 'the stream never runs uphill');
  assert.ok(stream.pts[0][2] > stream.pts.at(-1)[2] + 100, 'it falls a long way from the valley to the lake');
  for (const b of H.bridges) {
    for (const [x, y, z] of b.pts) {
      const w = waterAt(x, y);
      if (w !== null) assert.ok(z >= w + 3, `the ${b.kind} at (${x.toFixed(0)}, ${y.toFixed(0)}) stands clear of the water`);
    }
  }
});

test('buildings stand on level ground', () => {
  for (const st of STRUCTURES) {
    if (!st.sprite || st.paint === T.BRIDGE) continue;
    const [fw, fh] = st.rot % 180 ? [st.h, st.w] : [st.w, st.h];
    const zs = [];
    for (const fx of [-0.5, 0, 0.5]) for (const fy of [-0.5, 0, 0.5]) zs.push(heightAt(st.x + fx * fw, st.y + fy * fh));
    const spread = Math.max(...zs) - Math.min(...zs);
    assert.ok(spread < 3, `${st.sprite} at (${st.x}, ${st.y}) is level (spread ${spread.toFixed(1)})`);
  }
});

test('climbing is slower than walking the flat', async () => {
  const { climb } = await import('../src/world/explore.js');
  assert.ok(climb(4235, 1650, 0, -1) < 0.85, 'up the stair to the sect');
  assert.equal(climb(4235, 1600, 0, 1), 1, 'down it is no faster, but no slower');
  assert.ok(climb(2300, 3150, 1, 0) > 0.97, 'the high street through town is flat');
});
