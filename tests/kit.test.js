// The 3D building kit: every kind of building can be built, and comes out
// the right size, standing on its footprint, with no broken numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Kit } from '../src/art/gl/kit.js';
import { BUILD } from '../src/art/gl/buildings.js';
import { STRUCTURES } from '../src/world/places.js';
import { stream } from '../src/core/rng.js';

// decals need a canvas; for geometry, any rectangle of the atlas will do
const decals = new Proxy({}, { get: () => () => [0, 0, 1, 1] });

test('every building in the world has a builder', () => {
  for (const st of STRUCTURES) {
    if (!st.sprite || st.sprite === 'bigtree') continue;
    assert.ok(BUILD[st.sprite], `a 3D builder for ${st.sprite}`);
  }
});

test('each building stands on its footprint at a sensible height', () => {
  for (const [i, st] of STRUCTURES.entries()) {
    const make = BUILD[st.sprite];
    if (!make) continue;
    const kit = new Kit();
    kit.at(0, 0, 0, 0);
    make(kit, decals, st, stream(i + 1));
    const { main, hull } = kit.build();
    const p = main.attributes.position.array;
    assert.ok(p.length > 0, `${st.sprite} has a body`);
    assert.ok(hull.attributes.position.count > 0, `${st.sprite} has an ink outline`);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = 0; k < p.length; k += 3) {
      assert.ok(Number.isFinite(p[k]) && Number.isFinite(p[k + 1]) && Number.isFinite(p[k + 2]), `${st.sprite}: no broken numbers`);
      x0 = Math.min(x0, p[k]); x1 = Math.max(x1, p[k]);
      y0 = Math.min(y0, p[k + 1]); y1 = Math.max(y1, p[k + 1]);
      z0 = Math.min(z0, p[k + 2]); z1 = Math.max(z1, p[k + 2]);
    }
    const span = Math.max(st.w, st.h);
    assert.ok(x1 - x0 < span * 2 + 60, `${st.sprite} is not far wider than its footprint (${(x1 - x0).toFixed(0)})`);
    assert.ok(y0 > -8, `${st.sprite} does not sink into the ground`);
    assert.ok(y1 > 8 && y1 < 220, `${st.sprite} stands a sensible height (${y1.toFixed(0)})`);
  }
});
