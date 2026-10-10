// 現場: the road sets what it has ahead of you, and you choose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { stageScene, groundOk, scenesOf } from '../src/world/director.js';
import { SCENES } from '../src/world/scenes.js';
import { EVENTS } from '../src/content/index.js';
import { regionIdAt, isReachable } from '../src/world/terrain.js';
import { NODES } from '../src/world/map.js';
import { eligible, startEvent, choose, continueEvent } from '../src/core/events.js';
import { fresh, resolvePending } from './helpers.js';

/** Walk straight towards a point for up to n frames, or until something happens. */
function walkToward(s, x, y, n = 600) {
  for (let k = 0; k < n && !s.pending; k++) {
    const dx = x - s.world.x;
    const dy = y - s.world.y;
    if (Math.hypot(dx, dy) < 8) break;
    E.step(s, 0.05, { x: dx, y: dy });
  }
}

test('every scene plays a real event that can happen out in the open', () => {
  for (const def of SCENES) {
    const ev = EVENTS[def.event];
    assert.ok(ev, `${def.id} plays ${def.event}`);
    const trig = [].concat(ev.trigger);
    assert.ok(trig.includes('explore') || trig.includes('travel'), `${def.event} happens while walking`);
    assert.ok(!ev.poi && !ev.mob, `${def.event} is not tied to a place or a beast`);
    assert.ok(def.actors.length > 0, `${def.id} has someone or something to see`);
  }
});

test('a merchant is set by the road ahead, waits, and begins when you go up to him', () => {
  const s = fresh(3);
  s.tod = 10;
  // on the road south of the market, heading for the ferry
  E.placeAt(s, 4010, 3180);
  resolvePending(s);
  const L = E.liveOf(s);
  L.heading = [0.55, 0.85];
  const sc = stageScene(s, L, 'travel_merchant');
  assert.ok(sc, 'there was room for him by the road');
  assert.ok((sc.x - s.world.x) * 0.55 + (sc.y - s.world.y) * 0.85 > 150, 'ahead of you, the way you were going');
  assert.ok(groundOk('roadside', sc.x, sc.y) && isReachable(sc.x, sc.y));
  // walking past at a distance does not start it
  assert.equal(s.pending, null);
  walkToward(s, sc.x, sc.y + 30);
  const t = E.targetsNear(s, 200).find((x) => x.kind === 'scene');
  assert.ok(t && t.name === '行商', 'he is there to talk to');
  E.interact(s, t);
  assert.equal(s.pending?.id, 'travel_merchant');
  resolvePending(s);
  E.step(s, 0.05, null);
  assert.equal(scenesOf(L)[0].state, 'after', 'and afterwards he goes on his way');
});

test('a scene you leave behind is forgotten', () => {
  const s = fresh(4);
  s.tod = 10;
  E.placeAt(s, 4010, 3180);
  resolvePending(s);
  const L = E.liveOf(s);
  L.heading = [1, 0];
  assert.ok(stageScene(s, L, 'travel_merchant'));
  E.placeAt(s, 1700, 3700);
  resolvePending(s);
  E.step(s, 0.05, null);
  assert.equal(scenesOf(L).length, 0);
});

test('some scenes come to you: villagers at their gate stop you as you pass', () => {
  const s = fresh(5);
  s.tod = 11;
  s.player.realm = 1;
  // on the road south of the market, heading for the ferry
  E.placeAt(s, 4010, 3180);
  resolvePending(s);
  const L = E.liveOf(s);
  L.heading = [0.55, 0.85];
  const sc = stageScene(s, L, 'travel_village_demon');
  assert.ok(sc, 'the village was set by the road');
  walkToward(s, sc.x, sc.y);
  assert.equal(s.pending?.id, 'travel_village_demon', 'they stopped you');
});

test('the director only sets scenes on ground that suits them, in their regions', () => {
  const s = fresh(6);
  s.tod = 10;
  const L = E.liveOf(s);
  let n = 0;
  for (const [x, y] of [[3020, 3112], [2300, 3700], [3500, 2200], [4300, 3300]]) {
    E.placeAt(s, x, y);
    resolvePending(s);
    for (const def of SCENES) {
      if (def.when === 'night') continue;
      L.scenes = [];
      const sc = stageScene(s, L, def.event, { around: true });
      if (!sc) continue;
      n++;
      assert.ok(def.regions.includes(regionIdAt(sc.x, sc.y)), `${def.id} in its region`);
      assert.ok(groundOk(def.ground, sc.x, sc.y), `${def.id} on ${def.ground}`);
    }
  }
  assert.ok(n >= 6, `scenes found room (${n})`);
});

test('every scene can be set somewhere in its own country, at its hour', () => {
  for (const def of SCENES) {
    const s = fresh(31);
    s.player.realm = 1;
    s.flags.valley_safe = true;
    const region = def.regions[0];
    const tod = def.when === 'night' ? 22 : 10;
    s.tod = tod;
    E.placeAt(s, ...NODES[region].at);
    resolvePending(s);
    s.tod = tod;
    const L = E.liveOf(s);
    let sc = null;
    for (let k = 0; k < 8 && !sc; k++) {
      L.scenes = [];
      sc = stageScene(s, L, def.event, { around: true });
    }
    assert.ok(sc, `${def.id} finds room in ${region}`);
  }
});

test('a scene of the night is not met by day, as a story with no picture', () => {
  for (const def of SCENES.filter((d) => d.when === 'night')) {
    const s = fresh(32);
    s.tod = 12;
    const ev = EVENTS[def.event];
    assert.equal(eligible(s, ev, ['explore', 'travel'], def.regions[0]), false, `${def.event} waits for dark`);
  }
});

test('a thief runs straight at you, the shopkeeper behind him', () => {
  const s = fresh(33);
  s.tod = 17;
  E.placeAt(s, 2300, 3150);
  resolvePending(s);
  s.tod = 17;
  const L = E.liveOf(s);
  L.heading = [1, 0];
  const sc = stageScene(s, L, 'town_thief');
  assert.ok(sc, 'there was room in the street');
  const [thief, keeper] = sc.actors;
  const d = (a) => Math.hypot(a.x - s.world.x, a.y - s.world.y);
  assert.ok(d(keeper) > d(thief), 'the shopkeeper is behind him, further from you');
  const d0 = d(thief);
  for (let k = 0; k < 6; k++) E.step(s, 0.05, null);
  assert.ok(d(thief) < d0, 'he comes at you');
  for (let k = 0; k < 200 && !s.pending; k++) E.step(s, 0.05, null);
  assert.equal(s.pending?.id, 'town_thief', 'and you are in it');
});

test('the fox you let out of the trap is remembered at the shrine', () => {
  const s = fresh(34);
  s.tod = 10;
  startEvent(s, 'travel_trap');
  choose(s, 0);
  resolvePending(s);
  assert.ok(s.flags.freed_fox);
  assert.equal(s.npcs.hu_sanniang.favor, 10, 'she knows, though you have not met');
  assert.ok(!s.npcs.hu_sanniang.met);
  startEvent(s, 'shrine_meet');
  choose(s, 0);
  continueEvent(s);
  assert.equal(s.pending.step, 'talk');
  assert.match(s.pending.text, /獸夾/, 'and she says so');
});
