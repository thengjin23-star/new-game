// 身法 and flight: a 輕功's leaps over water, cliff and wall; going up on a
// 飛行法器, a sword, a 御風符's wind; the places up where no road goes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import * as AR from '../src/world/arts.js';
import { bodyArt, leapLanding, flyMeans, flyBlocked, canLand, FLIGHT } from '../src/world/air.js';
import { learnTech } from '../src/core/effects.js';
import { pools } from '../src/core/body.js';
import { newReport } from '../src/core/time.js';
import { serialize, parseSave } from '../src/core/save.js';
import { isAiry, isReachable, terrainAt, regionIdAt, findPath, canStand, collides } from '../src/world/terrain.js';
import { heightAt } from '../src/world/height.js';
import { NODES } from '../src/world/map.js';
import { T } from '../src/world/geo.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;

/** A cultivator of the given realm, with the 身法 given, standing at (x, y) at midday. */
function ready(seed, { realm = 1, stage = 5, arts = [], at = [2400, 3575] } = {}) {
  const s = fresh(seed);
  Object.assign(s.player, { realm, stage, injury: 0 });
  for (const id of arts) learnTech(s, id, newReport());
  E.placeAt(s, ...at);
  resolvePending(s);
  s.tod = 12;
  s.player.mp = pools(s).maxMp;
  return s;
}

function steps(s, secs, input = null) {
  for (let t = 0; t < secs && !s.pending && !s.dead; t += DT) E.step(s, DT, input);
}

/** Walk from (x, y) along (dx, dy) to the last spot before the way is blocked. */
function edge(s, x, y, dx, dy) {
  for (let d = 0; d < 400; d += 2) {
    const px = x + dx * (d + 8);
    const py = y + dy * (d + 8);
    if (collides(s, px, py)) return [x + dx * d, y + dy * d];
  }
  return null;
}

const STREAM_N = [2400, 3575]; // the north bank of 靈溪, where it runs through the fields
const CLIFF_TOP = [1300, 2560]; // 斷魂崖: above its lip, and at its foot
const CLIFF_FOOT = [1300, 2680];
const RIVER_BANK = [4650, 2150]; // the west bank of the great river, across from the sandbar

test('a 身法 is learned from a book, and is no use before 引氣入體', () => {
  const s = ready(1, { realm: 0 });
  learnTech(s, 'qingshen', newReport());
  assert.ok(s.player.arts.includes('qingshen'), 'it goes with the 術 you know');
  assert.ok(!s.player.techs.includes('qingshen'), 'not a way of cultivating');
  assert.equal(bodyArt(s), null, 'a mortal has no 靈力 to lift himself with');
  s.player.realm = 1;
  assert.equal(bodyArt(s).id, 'qingshen');
  learnTech(s, 'tayun', newReport());
  assert.equal(bodyArt(s).id, 'tayun', 'the better one is the one you use');
});

test('輕身術: pushing on into a stream, you leap it (and pay a little 靈力)', () => {
  const s = ready(2, { arts: ['qingshen'], at: STREAM_N });
  const mp0 = s.player.mp;
  steps(s, 1.5, { x: 0, y: 1 });
  assert.ok(s.world.y > 3640, `over on the far bank (${Math.round(s.world.y)})`);
  assert.ok(canStand(s, s.world.x, s.world.y));
  assert.ok(s.player.mp <= mp0 - 2 + 0.5, 'a leap costs 靈力');
  // without one, the water stops you
  const t = ready(2, { at: STREAM_N });
  steps(t, 1.5, { x: 0, y: 1 });
  assert.ok(t.world.y < 3600, 'no 輕功: you stand at the water');
});

test('a 輕功 makes you a little faster, and rough ground holds you back less', () => {
  const a = ready(3, { at: [1500, 1700] });
  const b = ready(3, { arts: ['qingshen'], at: [1500, 1700] });
  assert.ok(E.walkMult(b) > E.walkMult(a));
  assert.equal(terrainAt(1500, 1700) === T.FOREST || terrainAt(1500, 1700) === T.DEEP, true, 'in the woods');
  steps(a, 2, { x: 1, y: 0 });
  steps(b, 2, { x: 1, y: 0 });
  assert.ok(b.world.x - 1500 > (a.world.x - 1500) * 1.15, `through the woods quicker (${Math.round(b.world.x - 1500)} vs ${Math.round(a.world.x - 1500)})`);
});

test('a tap across the water: the path leaps it', () => {
  const s = ready(4, { arts: ['qingshen'], at: STREAM_N });
  const goal = [2400, 3700];
  const walk = findPath(s, ...STREAM_N, ...goal);
  assert.ok(E.walkTo(s, ...goal));
  const path = E.pathOf(s);
  assert.ok(path.some((p) => p.leap), 'the path has a leap in it');
  assert.ok(!walk || walk.length > path.length, 'shorter than the way round by the bridge');
  let n = 0;
  while ((E.pathOf(s) || E.liftOf(s).leap) && !s.pending && n++ < 600) E.step(s, DT, null);
  assert.ok(Math.hypot(s.world.x - goal[0], s.world.y - goal[1]) < 20, `got there (${Math.round(s.world.x)}, ${Math.round(s.world.y)})`);
});

test('斷魂崖: 輕身術 leaps down it, not up; 踏雲步 goes up it too', () => {
  const s = ready(5, { arts: ['qingshen'], at: CLIFF_TOP });
  const lip = edge(s, ...CLIFF_TOP, 0, 1);
  const foot = edge(s, ...CLIFF_FOOT, 0, -1);
  const down = leapLanding(s, ...lip, 0, 1);
  assert.ok(down && down[1] > 2640, 'down off the lip');
  assert.equal(leapLanding(s, ...foot, 0, -1), null, 'not up the face');
  const t = ready(5, { arts: ['tayun'], at: CLIFF_FOOT });
  const up = leapLanding(t, ...foot, 0, -1);
  assert.ok(up && up[1] < 2600 && heightAt(...up) > heightAt(...CLIFF_FOOT) + 60, 'up on top');
  steps(t, 1.5, { x: 0, y: -1 });
  assert.ok(t.world.y < 2600, 'and so you go');
});

test('the sandbar in the river: 踏雲步 gets you there, 輕身術 does not', () => {
  const a = ready(6, { arts: ['qingshen'], at: RIVER_BANK });
  assert.equal(leapLanding(a, ...edge(a, ...RIVER_BANK, 1, 0), 1, 0), null);
  const b = ready(6, { arts: ['tayun'], at: RIVER_BANK });
  steps(b, 1.5, { x: 1, y: 0 });
  assert.ok(isAiry(b.world.x, b.world.y), `on the sandbar (${Math.round(b.world.x)})`);
  assert.equal(regionIdAt(b.world.x, b.world.y), 'river_isle');
  assert.equal(b.player.loc, 'river_isle');
  // and back
  steps(b, 1.5, { x: -1, y: 0 });
  assert.ok(b.world.x < 4680 && isReachable(b.world.x, b.world.y), 'back on the bank');
});

test('what you fly on: a 飛梭 from 引氣入體, a sword at 築基 (in your hand)', () => {
  const s = ready(7, { realm: 0 });
  assert.equal(flyMeans(s).by, null);
  s.player.items.feisuo = 1;
  assert.equal(flyMeans(s).by, null, 'a mortal cannot drive it');
  assert.ok(flyMeans(s).why);
  s.player.realm = 1;
  assert.equal(flyMeans(s).by, 'boat');
  s.player.realm = 2;
  assert.equal(flyMeans(s).by, 'boat', 'no sword in hand');
  s.player.items.qinggang_sword = 1;
  s.player.weapon = 'qinggang_sword';
  assert.equal(flyMeans(s).by, 'sword');
  s.player.items.iron_saber = 1;
  s.player.weapon = 'iron_saber';
  assert.equal(flyMeans(s).by, 'boat', 'a saber is no sword');
});

test('flying: over the water and the woods, faster, 靈力 going; nothing on the ground gets at you', () => {
  const s = ready(8, { at: [2400, 2300] });
  s.player.items.feisuo = 1;
  assert.ok(E.takeOff(s));
  assert.ok(E.airborne(s));
  const mp0 = s.player.mp;
  steps(s, 4, null);
  assert.ok(E.liftOf(s).z > 30, 'up off the ground');
  assert.ok(!CB.inCombat(s), 'the wolf below never comes for you');
  assert.ok(s.player.mp < mp0 - 3, '靈力 goes as you hang there');
  // across the lake (no bridge needed)
  E.placeAt(s, 2930, 3600);
  s.player.mp = pools(s).maxMp;
  assert.ok(E.takeOff(s));
  const tod = s.tod;
  steps(s, 6, { x: 1, y: 0.25 });
  assert.ok(s.world.x > 3400, `across the water (${Math.round(s.world.x)})`);
  assert.ok(!s.pending, 'no one stops you up there');
  const hours = (s.tod - tod + 24) % 24;
  assert.ok(hours < (s.world.x - 2930) / E.UNITS_PER_HOUR, 'the way takes less of the day than walking it');
  assert.ok(E.land(s));
  steps(s, 3);
  assert.ok(!E.airborne(s), 'down again');
  assert.ok(canStand(s, s.world.x, s.world.y));
});

test('a 飛梭 reaches 孤鶴峰, but not 斷劍峰; a sword reaches both', () => {
  const s = ready(9, { at: [1620, 2030] });
  s.player.items.feisuo = 1;
  assert.ok(E.takeOff(s));
  assert.ok(E.walkTo(s, ...NODES.crane_peak.at));
  steps(s, 6);
  assert.ok(E.land(s));
  steps(s, 3);
  assert.ok(!E.airborne(s) && isAiry(s.world.x, s.world.y), 'down on the summit');
  assert.equal(s.player.loc, 'crane_peak');
  assert.ok(s.nodes.crane_peak.visited);
  // the higher peak
  assert.ok(flyBlocked(s, 3620, 425, 'boat'), 'too high for a 飛梭');
  assert.equal(flyBlocked(s, 3620, 425, 'sword'), null);
  const t = ready(9, { realm: 2, stage: 1, at: [3620, 760] });
  t.player.items.qinggang_sword = 1;
  t.player.weapon = 'qinggang_sword';
  t.player.mp = pools(t).maxMp;
  assert.ok(E.takeOff(t));
  assert.equal(t.world.fly.by, 'sword');
  E.walkTo(t, ...NODES.sword_peak.at);
  steps(t, 6);
  E.land(t);
  steps(t, 3);
  assert.equal(t.player.loc, 'sword_peak', 'on 斷劍峰');
  assert.ok(isAiry(t.world.x, t.world.y));
});

test('where you cannot fly: over the sect (unless you are of it), across the river, off the edge of the world', () => {
  const s = ready(10, { at: [4235, 1800] });
  assert.ok(flyBlocked(s, 4300, 1100, 'sword'), 'the sect keeps its air');
  s.flags.sect_member = true;
  assert.equal(flyBlocked(s, 4300, 1100, 'sword'), null, 'its own fly in');
  assert.ok(flyBlocked(s, 5150, 2600, 'sword'), 'beyond the river: mist');
  assert.ok(flyBlocked(s, 2600, 120, 'sword'), 'the mountains at the edge of the world');
  assert.ok(!canLand(s, 4860, 1900), 'nowhere to come down on the open river');
  // the 護山大陣 stops you in the air
  const t = ready(10, { realm: 2, stage: 3, at: [4235, 1800] });
  t.player.items.qinggang_sword = 1;
  t.player.weapon = 'qinggang_sword';
  t.player.mp = pools(t).maxMp;
  E.takeOff(t);
  steps(t, 6, { x: 0, y: -1 });
  assert.ok(t.world.y > 1400, `held off (${Math.round(t.world.y)})`);
});

test('when the 靈力 gives out you come down, on ground you can stand on', () => {
  const s = ready(11, { at: RIVER_BANK });
  s.player.items.feisuo = 1;
  E.takeOff(s);
  steps(s, 1.2, { x: 1, y: 0 });
  s.player.mp = 1;
  steps(s, 8, { x: 1, y: 0 });
  assert.ok(!E.airborne(s), 'down');
  assert.ok(canStand(s, s.world.x, s.world.y), `on ground (${Math.round(s.world.x)}, ${Math.round(s.world.y)})`);
});

test('a 御風符: even a mortal flies a while, then the wind sets you down', () => {
  const s = ready(12, { realm: 0, at: [2930, 3600] });
  s.player.items.wind_talisman = 1;
  assert.ok(AR.artsOf(s).some((a) => a.id === 'wind_talisman'), 'it is among what you can burn');
  assert.ok(AR.castArt(s, 'wind_talisman'));
  assert.equal(s.player.items.wind_talisman || 0, 0, 'burnt');
  assert.ok(E.airborne(s));
  assert.equal(s.world.fly.by, 'wind');
  assert.ok(!AR.castArt(s, 'wind_talisman'), 'not twice at once');
  steps(s, 30, { x: 1, y: 0 });
  assert.ok(E.airborne(s), 'still up after half a minute');
  steps(s, 40, null);
  assert.ok(!E.airborne(s), 'the wind gives out');
  assert.ok(canStand(s, s.world.x, s.world.y));
});

test('up in the air when you save: still up when you come back', () => {
  const s = ready(13, { at: [2930, 3600] });
  s.player.items.feisuo = 1;
  E.takeOff(s);
  steps(s, 3, { x: 1, y: 0 });
  const t = parseSave(serialize(s));
  assert.ok(E.airborne(t), 'flying');
  assert.ok(Math.abs(t.world.x - s.world.x) < 1);
  E.step(t, DT, null);
  assert.ok(E.airborne(t));
  // a save made mid-leap over the water: you come down on a bank
  const u = ready(14, { arts: ['qingshen'], at: STREAM_N });
  u.world.y = 3615;
  const v = parseSave(serialize(u));
  E.ensureWorld(v);
  assert.ok(canStand(v, v.world.x, v.world.y), 'not left standing in the stream');
});

test('the places up in the air can be come down on, and walked about', () => {
  for (const id of ['crane_peak', 'sword_peak', 'river_isle']) {
    const s = ready(15, { at: NODES[id].at });
    assert.equal(s.player.loc, id);
    assert.ok(canLand(s, ...NODES[id].at));
    steps(s, 0.5, { x: 1, y: 0 });
    assert.ok(isAiry(s.world.x, s.world.y), `${id}: still up there after a few steps`);
    // and you cannot walk off it
    steps(s, 4, { x: 1, y: 0 });
    assert.ok(isAiry(s.world.x, s.world.y), `${id}: the edge holds`);
  }
});

test('the 飛梭 and the books are for sale; the 符 too', async () => {
  const { SHOPS, ITEMS } = await import('../src/content/items.js');
  for (const id of ['feisuo', 'wind_talisman', 'book_qingshen']) {
    assert.ok(ITEMS[id], id);
    assert.ok(Object.values(SHOPS).some((sh) => sh.stock.includes(id)), `${id} is sold somewhere`);
  }
  assert.ok(FLIGHT.boat.ceil < heightAt(3620, 425) + FLIGHT.boat.clear, 'the high peak is above a 飛梭');
  assert.ok(FLIGHT.boat.ceil >= heightAt(...NODES.crane_peak.at) + FLIGHT.boat.clear, 'the low one is not');
});
