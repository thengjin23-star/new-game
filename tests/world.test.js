// The open world: its ground, walking it, and what you run into.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, collides, isReachable, isAiry, canStand, regionIdAt, regionAt, findPath, nearestOpen, REGION_IDS, terrainAt } from '../src/world/terrain.js';
import { POIS, NPC_SPOTS, BEASTS, STRUCTURES } from '../src/world/places.js';
import * as CB from '../src/world/combat.js';
import { NODES, mapOf } from '../src/world/map.js';
import { T, REGION_SHAPES, RIVER_REGION } from '../src/world/geo.js';
import { MAPS, useMap } from '../src/world/atlas.js';
import { exploredPct, isRevealed } from '../src/world/fog.js';
import { serialize, parseSave } from '../src/core/save.js';
import * as E from '../src/world/explore.js';
import { fresh, resolvePending, goToPoi, goTo } from './helpers.js';

const member = { flags: { sect_member: true } };

function standable(x, y) {
  const p = nearestOpen(member, x, y, 2);
  return !!p && Math.hypot(p[0] - x, p[1] - y) <= 50 && isReachable(p[0], p[1]);
}

/** Up where no road goes: open ground you can come down on, that no walk reaches. */
function airStandable(x, y) {
  return canStand(member, x, y) && isAiry(x, y) && !isReachable(x, y);
}

/** Step the world until the walk is over (or something happens). */
function walk(s, x, y, then = null, maxSteps = 4000) {
  assert.ok(E.walkTo(s, x, y, then), `a path to (${x}, ${y})`);
  let n = 0;
  while (E.pathOf(s) && !s.pending && n++ < maxSteps) E.step(s, 0.05, null);
  return n;
}

test('every region of every map has ground you can walk to (from the temple, in 東荒)', () => {
  for (const map of Object.keys(MAPS)) {
    useMap(map);
    const g = world();
    // (a region found, not walked into, is the ground around it until then)
    const hidden = new Set(REGION_SHAPES.filter((r) => r.requires).map((r) => r.id));
    for (const id of REGION_IDS) {
      if (id === RIVER_REGION || hidden.has(id) || NODES[id].air) continue;
      assert.ok(g.regionCells[id] > 40, `${map}/${id} has reachable ground (${g.regionCells[id]})`);
    }
    for (const [id, n] of Object.entries(NODES)) {
      if (!n.at || mapOf(id) !== map) continue;
      assert.ok(REGION_IDS.includes(id), `${id} is a region of ${map}`);
      assert.ok(n.air ? airStandable(...n.at) : standable(...n.at), `${map}/${id}: its spot ${n.at} is open`);
      if (!hidden.has(id)) assert.equal(regionIdAt(...n.at), id, `${map}/${id}: its spot lies inside it`);
    }
  }
  useMap('donghuang');
});

test('up where no road goes: the summits and the sandbar stand apart, with room to stand', () => {
  const g = world();
  for (const [id, n] of Object.entries(NODES)) {
    if (!n.air) continue;
    assert.ok(g.regionCells[id] >= 10, `${id} has room (${g.regionCells[id]} cells)`);
    assert.equal(findPath({ flags: {} }, ...NODES.qingxu_temple.at, ...n.at), null, `no walk reaches ${id}`);
  }
  // every cell of the air is in an air region, and none of them is walked to
  for (let k = 0; k < g.air.length; k++) {
    if (!g.air[k]) continue;
    assert.ok(NODES[REGION_IDS[g.reg[k]]]?.air, `air cell ${k} lies in an air region`);
    assert.ok(!g.reach[k]);
  }
});

test('every place, person and beast stands somewhere reachable, in its region (on every map)', () => {
  // (a place hidden until it is found — behind the falls — reads as the region about it till then)
  const found = { flags: { falls_cave_found: true } };
  try {
    for (const map of Object.keys(MAPS)) {
      useMap(map);
      for (const p of POIS) {
        assert.ok(NODES[p.region]?.air ? airStandable(p.x, p.y) : standable(p.x, p.y), `${p.id} can be walked up to`);
        assert.equal(regionAt(found, p.x, p.y), p.region, `${p.id} lies in ${p.region}`);
      }
      for (const [id, spots] of Object.entries(NPC_SPOTS)) {
        for (const [region, [x, y]] of Object.entries(spots)) {
          if (mapOf(region) !== map) continue;
          assert.ok(standable(x, y), `${id} at ${region}`);
          assert.equal(regionIdAt(x, y), region, `${id} stands in ${region}`);
        }
      }
      for (const m of BEASTS) assert.ok(isReachable(m.x, m.y) && !collides(member, m.x, m.y, 12), `${m.id} roams reachable ground`);
      for (const h of world().herbs) assert.ok(isReachable(h.x, h.y) && !collides(member, h.x, h.y), `herb ${h.id}`);
      for (const st of STRUCTURES.filter((x) => x.sprite && x.block !== false)) {
        assert.ok(collides(member, st.x, st.y), `building at ${st.x},${st.y} is solid`);
      }
    }
  } finally {
    useMap('donghuang');
  }
});

test('the roads join the towns, and bridges cross the water', () => {
  const s = { flags: {} };
  const p = findPath(s, ...NODES.qingxu_temple.at, ...NODES.luoxia_market.at);
  assert.ok(p && p.length > 2, 'temple to market');
  assert.ok(findPath(s, ...NODES.qingshi_town.at, ...NODES.lingxi_valley.at), 'town to the valley, through the gorge');
  assert.ok(findPath(s, ...NODES.qingshi_town.at, ...NODES.ancient_ruins.at), 'town to the ruins, through the forest');
  assert.ok(findPath(s, ...NODES.luoxia_market.at, 3260, 3622), 'out to the pavilion on the lake');
  assert.equal(terrainAt(1795, 3150), T.BRIDGE, 'the stone bridge at the town gate');
});

test('the sect gate only opens for disciples', () => {
  const outsider = { flags: {} };
  assert.equal(findPath(outsider, ...NODES.luoxia_market.at, 4300, 1150), null, 'outsiders cannot climb past the gate');
  assert.ok(findPath(member, ...NODES.luoxia_market.at, 4300, 1150), 'disciples can');
});

test('walking takes time, clears the clouds, and roads are quicker than woods', () => {
  const s = fresh(2);
  const tod0 = s.tod;
  assert.ok(!isRevealed(s, ...NODES.qingshi_town.at), 'the town starts under cloud');
  walk(s, ...NODES.qingshi_town.at);
  resolvePending(s);
  E.resume(s);
  walk(s, ...NODES.qingshi_town.at);
  assert.equal(s.player.loc, 'qingshi_town');
  assert.ok(s.tod > tod0, 'the day moved on');
  assert.ok(isRevealed(s, ...NODES.qingshi_town.at), 'the town is seen');
  assert.ok(exploredPct(s, 'qingshi_town') > 10);
  assert.ok(s.nodes.qingshi_town.visited);
  // speed: the same stretch of time covers more road than forest
  const road = E.WALK_SPEED * 1.3;
  const wood = E.WALK_SPEED * 0.55;
  assert.ok(road > wood * 2);
});

test('the first walk into town brings 王二 running', () => {
  const s = fresh(3);
  goTo(s, 'qingshi_town');
  assert.equal(s.pending?.id, 'town_return');
  resolvePending(s);
  assert.ok(s.npcs.wang_er.met);
});

test('hidden places show themselves only when you come close', () => {
  const s = fresh(4);
  const stele = POIS.find((p) => p.id === 'stele');
  assert.ok(!E.targetsNear(s, 99999).some((t) => t.id === 'stele'));
  goToPoi(s, 'stele', 60);
  resolvePending(s);
  assert.ok('stele' in s.world.found, 'found it');
  const t = E.targetsNear(s, 200).find((x) => x.id === 'stele');
  assert.ok(t, 'now it can be looked at');
  E.interact(s, t);
  assert.equal(s.pending?.id, 'hill_stele');
  assert.ok(stele.hidden.r < 200);
});

test('wolves come for you when you walk into their hills', () => {
  const s = fresh(5);
  const wolves = BEASTS.find((m) => m.id === 'wolves_a');
  const spot = nearestOpen(s, wolves.x + 120, wolves.y + 120);
  E.placeAt(s, ...spot);
  resolvePending(s);
  s.tod = 22;
  let n = 0;
  while (!CB.inCombat(s) && n++ < 400) E.step(s, 0.05, null);
  assert.ok(CB.inCombat(s), 'the pack came for you');
  assert.equal(s.pending, null, 'and the fight is where you stand');
});

test('a gathered herb takes a while to grow back', () => {
  const s = fresh(6);
  const h = world().herbs.find((x) => x.region === 'qingshi_hill');
  const spot = nearestOpen(s, h.x + 20, h.y);
  E.placeAt(s, ...spot);
  resolvePending(s);
  const t = E.targetsNear(s, 100).find((x) => x.kind === 'herb' && x.id === h.id);
  assert.ok(t, 'the herb is in reach');
  const before = Object.values(s.player.items).reduce((a, b) => a + b, 0);
  E.interact(s, t);
  const after = Object.values(s.player.items).reduce((a, b) => a + b, 0);
  assert.ok(after > before, 'you picked something');
  assert.ok(!E.herbReady(s, h), 'it is gone for now');
});

test('a save keeps your place in the world and the clouds you cleared', () => {
  const s = fresh(7);
  goTo(s, 'qingshi_town');
  resolvePending(s);
  const back = parseSave(serialize(s));
  assert.equal(back.world.x, s.world.x);
  assert.equal(back.player.loc, 'qingshi_town');
  assert.ok(isRevealed(back, ...NODES.qingshi_town.at));
  assert.equal(exploredPct(back, 'qingshi_town'), exploredPct(s, 'qingshi_town'));
});

test('a save from before the open world is given a place in it', () => {
  const s = fresh(8);
  delete s.world;
  s.player.loc = 'luoxia_market';
  s.nodes.luoxia_market.visited = true;
  const back = parseSave(serialize(s));
  E.ensureWorld(back);
  assert.deepEqual([back.world.x, back.world.y], NODES.luoxia_market.at);
  assert.ok(isRevealed(back, ...NODES.luoxia_market.at));
  assert.ok(isRevealed(back, ...NODES.qingxu_temple.at), 'places visited before are not under cloud');
});

test('an event in the way of a long walk does not cancel it', () => {
  const s = fresh(9);
  E.walkTo(s, ...NODES.qingshi_town.at);
  let n = 0;
  while (!s.pending && E.pathOf(s) && n++ < 3000) E.step(s, 0.05, null);
  assert.equal(s.pending?.id, 'town_return');
  resolvePending(s);
  assert.ok(E.canResume(s));
  assert.ok(E.resume(s));
});
