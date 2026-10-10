// 人: the people of the world keep hours, walk the roads, go home at night.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { ROUTINES, EXTRAS, entryAt, doorsOf } from '../src/world/people.js';
import { regionIdAt, collides, isReachable, findPath } from '../src/world/terrain.js';
import { NODES } from '../src/world/map.js';
import { fresh, resolvePending } from './helpers.js';

const HOURS = Array.from({ length: 48 }, (_, k) => k / 2);
const FAR = [1060, 3240]; // the temple: far from the town and the market

/** Let a frame or two pass with you standing still. */
function idle(s, n = 2) {
  for (let k = 0; k < n; k++) E.step(s, 0.05, null);
}

/** Put the clock at an hour, a little later on the same day, as if you had rested. */
function setHour(s, tod) {
  if (tod < s.tod) s.day += 1;
  s.tod = tod;
}

test('everyone has somewhere to stand at every hour, and a road between', () => {
  for (const [id, regions] of Object.entries(ROUTINES)) {
    for (const [region, list] of Object.entries(regions)) {
      assert.equal(list[0][0], 0, `${id}'s day in ${region} starts at midnight`);
      list.forEach(([, [x, y], act], k) => {
        assert.ok(!collides(null, x, y, 9) && isReachable(x, y), `${id} ${region} #${k} (${act}) can be stood on`);
        assert.equal(regionIdAt(x, y), region, `${id} ${region} #${k} is in ${region}`);
        const [, [nx, ny]] = list[(k + 1) % list.length];
        assert.ok(findPath(null, x, y, nx, ny), `${id} can walk from #${k} to the next`);
      });
    }
  }
  for (const x of EXTRAS) {
    for (const [px, py] of x.patrol || [x.at]) {
      assert.ok(!collides(null, px, py, 9) && isReachable(px, py), `${x.id} stands somewhere open`);
      assert.equal(regionIdAt(px, py), x.region, `${x.id} is in ${x.region}`);
    }
  }
  for (const region of ['qingshi_town', 'luoxia_market', 'qingyun_sect']) assert.ok(doorsOf(region).length >= 3, `${region} has doors to go home to`);
});

test('at any hour you can find them where their day says, and call on them', () => {
  for (const tod of HOURS.filter((h) => h % 1.5 === 0)) {
    const s = fresh(11);
    s.tod = tod;
    E.placeAt(s, ...FAR);
    resolvePending(s);
    idle(s);
    for (const [id, regions] of Object.entries(ROUTINES)) {
      const npc = s.npcs[id];
      const list = regions[npc.loc];
      if (!list) continue;
      const e = entryAt(list, s.tod);
      const p = E.peopleInWorld(s).find((x) => x.id === id);
      assert.ok(p, `${id} is somewhere at ${tod}`);
      assert.deepEqual([p.x, p.y], e[1], `${id} at ${tod} is where the hour says`);
      assert.equal(p.inside, e[2] === 'home', `${id} at ${tod}: at home or out`);
      // walk up (as if you had come by road) and call on them
      const s2 = fresh(11);
      s2.tod = tod;
      E.placeAt(s2, e[1][0], e[1][1] + 34);
      resolvePending(s2);
      s2.tod = tod;
      idle(s2);
      const t = E.targetsNear(s2, 120).find((x) => x.kind === 'npc' && x.id === id);
      assert.ok(t, `${id} can be called on at ${tod} (${e[2]})`);
      E.interact(s2, t);
      assert.ok(s2.pending || E.takeSignals(s2).length, `calling on ${id} at ${tod} does something`);
    }
  }
});

test('they walk from place to place while you watch, and wait for you when you come to talk', () => {
  const s = fresh(12);
  s.tod = 5.8;
  E.placeAt(s, 2200, 3170);
  resolvePending(s);
  s.tod = 5.8;
  idle(s);
  const sun = () => E.peopleInWorld(s).find((x) => x.id === 'sun_zg');
  assert.equal(sun().act, 'home');
  // the hour turns: he comes out to sweep, walking, not jumping
  s.tod = 6.02;
  idle(s, 1);
  assert.equal(sun().act, 'walk');
  const start = [sun().x, sun().y];
  idle(s, 6);
  assert.ok(Math.hypot(sun().x - start[0], sun().y - start[1]) > 4, 'he is on his way');
  for (let k = 0; k < 200 && sun().moving; k++) idle(s, 1);
  assert.equal(sun().act, 'sweep', 'and then he sweeps');
  assert.deepEqual([sun().x, sun().y], ROUTINES.sun_zg.qingshi_town[1][1]);

  // later: Wang Er sets off for the 豆花 stall; you go after him to talk, and he waits
  const s2 = fresh(13);
  s2.tod = 9.9;
  E.placeAt(s2, 1900, 3170);
  resolvePending(s2);
  s2.tod = 9.9;
  idle(s2);
  s2.tod = 10.02;
  idle(s2, 3);
  const wang = () => E.peopleInWorld(s2).find((x) => x.id === 'wang_er');
  assert.ok(wang().moving, 'he is walking to the stall');
  E.walkTo(s2, wang().x, wang().y, E.targetsNear(s2, 400).find((x) => x.id === 'wang_er'));
  const at = [wang().x, wang().y];
  idle(s2, 3);
  assert.deepEqual([wang().x, wang().y], at, 'he stops and waits for you');
  for (let k = 0; k < 400 && !s2.pending; k++) idle(s2, 1);
  assert.ok(s2.pending, 'and you get to talk');
});

test('the town goes indoors at night; the watchman walks; morning brings them out', () => {
  const s = fresh(14);
  const town = () => E.folkInWorld(s).filter((f) => f.region === 'qingshi_town');
  s.tod = 13;
  E.placeAt(s, ...NODES.qingshi_town.at);
  resolvePending(s);
  idle(s);
  const day = town();
  assert.ok(day.filter((f) => !f.extra).length >= 6, 'the street is busy by day');
  assert.ok(day.some((f) => f.id === 'chess_a'), 'the old men are at their chess');
  assert.ok(!day.some((f) => f.id === 'watchman'), 'the watchman sleeps by day');
  setHour(s, 23.5);
  idle(s);
  const night = town();
  assert.ok(night.filter((f) => !f.extra).length <= 2, `most are indoors at night (${night.length} out)`);
  assert.ok(night.some((f) => f.id === 'watchman'), 'the watchman is out');
  assert.ok(!night.some((f) => f.id === 'chess_a'));
  // he calls the hours as he goes
  const watch = night.find((f) => f.id === 'watchman');
  E.placeAt(s, watch.x, watch.y + 60);
  resolvePending(s);
  let said = null;
  for (let k = 0; k < 400 && !said; k++) {
    idle(s, 1);
    said = E.sayingOf(s, watch);
  }
  assert.ok(said && /更|火燭|防盜/.test(said), `the watchman calls out (${said})`);
  setHour(s, 8.5);
  idle(s);
  assert.ok(town().filter((f) => !f.extra).length >= 6, 'and in the morning they are out again');
});

test('talking to a passer-by, or to the watchman, gets you their own words', () => {
  const s = fresh(15);
  s.tod = 22;
  E.placeAt(s, ...NODES.qingshi_town.at);
  resolvePending(s);
  s.tod = 22;
  idle(s);
  const watch = E.folkInWorld(s).find((f) => f.id === 'watchman');
  E.placeAt(s, watch.x, watch.y + 30);
  resolvePending(s);
  const t = E.targetsNear(s, 120).find((x) => x.kind === 'folk' && x.folk === watch);
  assert.ok(t && t.name === '更夫');
  E.interact(s, t);
  const sig = E.takeSignals(s).find((x) => x.caption);
  assert.equal(sig.caption.title, '更夫');
  assert.ok(watch.chat.includes(sig.caption.text));
});
