// 生靈與野獸: creatures keep their distance; beasts warn you, keep their
// hours, and know when you are far too much for them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { WILDLIFE } from '../src/world/wildlife.js';
import { MOBS } from '../src/world/places.js';
import { regionIdAt, nearestOpen } from '../src/world/terrain.js';
import { fresh, resolvePending } from './helpers.js';

function idle(s, n = 1) {
  for (let k = 0; k < n && !s.pending; k++) E.step(s, 0.05, null);
}

function walkToward(s, x, y, n = 400) {
  for (let k = 0; k < n && !s.pending; k++) {
    const dx = x - s.world.x;
    const dy = y - s.world.y;
    if (Math.hypot(dx, dy) < 10) break;
    E.step(s, 0.05, { x: dx, y: dy });
  }
}

/** Walk there by road (as you would, tapping the map), playing through anything on the way but `stopAt`. */
function approach(s, x, y, stopAt = null, n = 800) {
  E.walkTo(s, x, y);
  for (let k = 0; k < n; k++) {
    if (s.pending) {
      if (s.pending.id === stopAt) return;
      resolvePending(s);
      E.walkTo(s, x, y);
      continue;
    }
    E.step(s, 0.05, null);
    if (!s.pending && !E.liveOf(s).path) return;
  }
}

function standAt(s, x, y, tod) {
  s.tod = tod;
  const [px, py] = nearestOpen(s, x, y, 4);
  E.placeAt(s, px, py);
  resolvePending(s);
  s.tod = tod;
  E.liveOf(s).critters = [];
}

test('deer bolt and birds take wing when you come close, then they are gone', () => {
  const s = fresh(21);
  standAt(s, 3180, 3420, 9); // the meadow by the lake
  const w = s.world;
  const [deer] = E.addCritter(s, 'deer', w.x + 260, w.y);
  const [egret] = E.addCritter(s, 'egret', w.x - 260, w.y);
  idle(s, 5);
  assert.equal(deer.state, 'idle', 'from afar, the deer grazes');
  walkToward(s, deer.x, deer.y, 60);
  assert.equal(deer.state, 'flee', 'closer, and it bolts');
  const d0 = Math.hypot(deer.x - w.x, deer.y - w.y);
  idle(s, 20);
  assert.ok(Math.hypot(deer.x - w.x, deer.y - w.y) > d0, 'away from you');
  idle(s, 80);
  assert.ok(!E.wildInWorld(s).includes(deer), 'and then it is gone');
  walkToward(s, egret.x, egret.y, 120);
  assert.equal(egret.state, 'flee');
  idle(s, 10);
  assert.ok(egret.fly > 0.5, 'the egret takes wing');
});

test('the wild fills in around you, with what lives there and at its hour', () => {
  for (const [region, x, y] of [['wilds', 3150, 2380], ['farmland', 2250, 3660], ['mirror_lake', 3200, 3420]]) {
    const s = fresh(22);
    standAt(s, x, y, 10);
    idle(s, 400);
    const seen = E.wildInWorld(s);
    assert.ok(seen.length >= 2, `${region} has creatures about (${seen.length})`);
    const kinds = WILDLIFE[region].kinds.filter((k) => k[2] !== 'night').map((k) => k[0]);
    for (const c of seen) assert.ok(kinds.includes(c.kind), `a ${c.kind} belongs in ${region} by day`);
    for (const c of seen) assert.equal(regionIdAt(c.hx, c.hy), region);
  }
  // by night: the fox comes out; the day birds have gone to roost
  const s = fresh(23);
  standAt(s, 3150, 2380, 23);
  idle(s, 600);
  const night = E.wildInWorld(s);
  assert.ok(night.every((c) => c.kind === 'redfox' || c.kind === 'rabbit'), `only night creatures: ${night.map((c) => c.kind)}`);
});

test('靈溪谷 stays silent until the python is settled', () => {
  const s = fresh(24);
  standAt(s, 700, 1800, 10);
  idle(s, 400);
  assert.equal(E.wildInWorld(s).length, 0, 'no birds, no deer');
  s.flags.valley_safe = true;
  idle(s, 400);
  assert.ok(E.wildInWorld(s).length > 0, 'and then life comes back');
});

test('you hear wolves before they come, and they see you before they run at you', () => {
  const s = fresh(25);
  const def = MOBS.find((m) => m.id === 'wolves_a');
  standAt(s, def.x, def.y + 520, 22);
  E.takeFeed(s);
  approach(s, def.x, def.y, 'hill_wolves');
  const feed = E.takeFeed(s).map((f) => f.text);
  const heard = feed.indexOf('遠處傳來狼嚎。');
  const seen = feed.indexOf('狼！');
  assert.ok(heard >= 0, `a howl first (${feed.join(' / ')})`);
  assert.ok(seen > heard, 'then they come');
  assert.equal(s.pending?.id, 'hill_wolves', 'and you are in it');
});

test('wolves doze at noon: you can pass closer by day than by night', () => {
  const def = MOBS.find((m) => m.id === 'wolves_a');
  const chased = (tod) => {
    const s = fresh(26);
    standAt(s, def.x, def.y + 330, tod);
    const m = E.mobsInWorld(s).find((x) => x.def.id === def.id);
    // the pack at rest, together, not wandering; you, standing 185 off
    for (const b of m.members) {
      b.x = def.x;
      b.y = def.y;
      b.wait = 999;
    }
    let spot = null;
    for (let a = 0; a < 6.28 && !spot; a += 0.2) {
      const x = def.x + Math.cos(a) * 185;
      const y = def.y + Math.sin(a) * 185;
      const p = nearestOpen(s, x, y, 0);
      if (p && Math.abs(Math.hypot(p[0] - def.x, p[1] - def.y) - 185) < 6) spot = p;
    }
    assert.ok(spot, 'somewhere to stand');
    E.placeAt(s, spot[0], spot[1]);
    resolvePending(s);
    s.tod = tod;
    idle(s, 3);
    return m.state === 'chase' || s.pending?.id === 'hill_wolves';
  };
  assert.equal(chased(12.5), false, 'at noon they let you by');
  assert.equal(chased(23), true, 'at night they come');
});

test('far too strong for them, and they run instead', () => {
  const s = fresh(27);
  s.player.realm = 2;
  s.player.stage = 1;
  const def = MOBS.find((m) => m.id === 'bandits_a');
  standAt(s, def.x, def.y + 520, 14);
  E.takeFeed(s);
  approach(s, def.x, def.y, 'forest_bandits');
  const feed = E.takeFeed(s).map((f) => f.text);
  assert.ok(feed.includes('那幾個人看了你一眼，扭頭就跑。'), feed.join(' / '));
  assert.equal(s.pending, null, 'no fight');
  idle(s, 120);
  assert.ok(!E.mobsInWorld(s).some((m) => m.def.id === def.id), 'and they are gone for the day');
  assert.equal(s.world.mobs[def.id], s.day + 1);
});
