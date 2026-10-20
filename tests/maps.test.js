// 天下輿圖 (0.21): more than one map, one at a time. Over the pass south of
// 鎮南田野 lies 南嶺: crossing takes most of a day, puts its land in place
// (and nothing of 東荒's on it), and each map keeps what you saw of it; a
// save made on the far side opens there; an old save opens in 東荒.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import { world, regionIdAt, isReachable } from '../src/world/terrain.js';
import { POIS } from '../src/world/places.js';
import { NODES, mapOf } from '../src/world/map.js';
import { mapId, useMap, CROSSINGS } from '../src/world/atlas.js';
import { isRevealed, exploredPct } from '../src/world/fog.js';
import { serialize, parseSave, migrate } from '../src/core/save.js';
import { SAVE_VERSION } from '../src/core/state.js';
import { fresh, resolvePending, goToPoi, pickText } from './helpers.js';

/** Walk up to a way over and take it (as a 煉氣 cultivator), then let the next frame carry you across. */
function cross(s, gate, pick = '翻過去') {
  goToPoi(s, gate, -40);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: gate });
  assert.ok(s.pending, `the way over at ${gate} asks`);
  pickText(s, pick);
  resolvePending(s);
  E.step(s, 0.05, null);
}

test('a mortal cannot cross into 南嶺; a cultivator can, and comes out on its side of the pass', () => {
  const s = fresh(3);
  assert.equal(s.world.map, 'donghuang');
  assert.equal(mapOf('qingshi_town'), 'donghuang');
  assert.equal(mapOf('qingzhu_village'), 'nanling');
  // a mortal: the way is barred
  goToPoi(s, 'south_pass_gate', -40);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'south_pass_gate' });
  const go = s.pending.choices.find((c) => c.text.includes('翻過去'));
  assert.ok(go.disabled, 'a mortal is turned back');
  pickText(s, '改天');
  resolvePending(s);
  // a cultivator goes over
  Object.assign(s.player, { realm: 1, stage: 6 });
  const day = s.day + s.tod / 24;
  cross(s, 'south_pass_gate');
  assert.equal(s.world.map, 'nanling');
  assert.equal(mapId(), 'nanling');
  assert.equal(s.player.loc, 'ling_pass');
  assert.equal(regionIdAt(s.world.x, s.world.y), 'ling_pass');
  assert.ok(Math.hypot(s.world.x - CROSSINGS.south_pass.at[0], s.world.y - CROSSINGS.south_pass.at[1]) < 60, 'at the top of the pass, on the far side');
  assert.ok(s.day + s.tod / 24 - day > 0.2, 'most of a day on the way');
  assert.ok(s.flags.nanling_crossed);
  // the first sight of 南嶺
  assert.equal(s.pending?.id, 'nanling_arrive');
  resolvePending(s);
  assert.ok(s.nodes.ling_pass.visited);
});

test('on 南嶺, nothing of 東荒 stands about: its places, people, beasts and townsfolk stay behind', () => {
  const s = fresh(4);
  Object.assign(s.player, { realm: 1, stage: 6 });
  cross(s, 'south_pass_gate');
  resolvePending(s);
  for (const p of POIS) assert.equal(mapOf(p.region), 'nanling', `${p.id} is 南嶺's`);
  for (let k = 0; k < 60; k++) E.step(s, 0.1, null);
  for (const n of E.peopleInWorld(s)) assert.equal(mapOf(n.npc.loc), 'nanling', `${n.id} belongs here`);
  for (const f of E.folkInWorld(s)) assert.equal(mapOf(f.region), 'nanling', `${f.id} belongs here`);
  for (const b of CB.beastsInWorld(s, 99999)) assert.equal(b.def.map || 'nanling', 'nanling', `${b.def.id} belongs here`);
  for (const t of E.targetsNear(s, 9999)) if (t.kind === 'poi') assert.equal(mapOf(POIS.find((p) => p.id === t.id).region), 'nanling');
  // the ground under you is 南嶺's
  assert.ok(isReachable(...NODES.qingzhu_village.at));
  assert.equal(regionIdAt(...NODES.qingzhu_village.at), 'qingzhu_village');
});

test('each map keeps what you saw of it; back over the pass, 東荒 is as you left it', () => {
  const s = fresh(5);
  Object.assign(s.player, { realm: 1, stage: 6 });
  const town = NODES.qingshi_town.at;
  E.placeAt(s, ...town);
  resolvePending(s);
  assert.ok(isRevealed(s, ...town));
  const pctTown = exploredPct(s, 'qingshi_town');
  cross(s, 'south_pass_gate');
  resolvePending(s);
  // 南嶺: only round the pass is seen
  assert.ok(isRevealed(s, s.world.x, s.world.y));
  assert.ok(!isRevealed(s, ...NODES.qingzhu_village.at), 'the village is still under cloud');
  // (a place left behind keeps how much of it you saw)
  assert.equal(exploredPct(s, 'qingshi_town'), pctTown);
  E.placeAt(s, ...NODES.qingzhu_village.at);
  resolvePending(s);
  assert.ok(s.nodes.qingzhu_village.visited);
  // and back
  cross(s, 'ling_pass_gate', '回東荒');
  resolvePending(s);
  assert.equal(s.world.map, 'donghuang');
  assert.equal(s.player.loc, 'south_pass');
  assert.ok(isRevealed(s, ...town), '東荒 as you saw it');
  assert.ok(s.world.away.nanling?.fog, '南嶺 kept for when you go back');
  // over again: the village is where you saw it
  cross(s, 'south_pass_gate');
  resolvePending(s);
  assert.ok(isRevealed(s, ...NODES.qingzhu_village.at), '南嶺 as you saw it');
});

test('a save made on 南嶺 opens there; an old save (from before there were maps) opens in 東荒', () => {
  const s = fresh(6);
  Object.assign(s.player, { realm: 1, stage: 6 });
  cross(s, 'south_pass_gate');
  resolvePending(s);
  E.placeAt(s, ...NODES.qingzhu_village.at);
  resolvePending(s);
  const json = serialize(s);
  useMap('donghuang');
  const t = parseSave(json);
  E.ensureWorld(t);
  assert.equal(t.world.map, 'nanling');
  assert.equal(mapId(), 'nanling');
  assert.ok(isRevealed(t, ...NODES.qingzhu_village.at));
  assert.equal(regionIdAt(t.world.x, t.world.y), 'qingzhu_village');
  // an old save: no map at all
  const u = fresh(7);
  E.placeAt(u, ...NODES.qingshi_town.at);
  resolvePending(u);
  const old = JSON.parse(serialize(u));
  delete old.world.map;
  delete old.world.away;
  old.v = 1;
  useMap('nanling');
  const v = parseSave(JSON.stringify(old));
  assert.equal(v.v, SAVE_VERSION);
  assert.equal(v.world.map, 'donghuang', 'it was on 東荒');
  assert.deepEqual(v.world.away, {});
  // (a save is filled in the same, however often)
  assert.deepEqual(JSON.parse(JSON.stringify(migrate(JSON.parse(JSON.stringify(v))))), JSON.parse(JSON.stringify(v)));
  E.ensureWorld(v);
  assert.equal(v.world.map, 'donghuang');
  assert.equal(mapId(), 'donghuang');
  assert.ok(isRevealed(v, ...NODES.qingshi_town.at), 'what you saw is still seen');
  assert.equal(regionIdAt(v.world.x, v.world.y), 'qingshi_town');
  assert.ok(world().regionCells.qingshi_town > 0);
});
