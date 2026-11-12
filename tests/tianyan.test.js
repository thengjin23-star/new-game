// 中州 1.2「天衍城」: the capital, three days east of 官道關 on the 官道, or a moment through the 傳送陣 from
// 臨江城. Papers at the pass and the array — or, by night, money or the hills, and no papers to show in the
// capital after; the white peak the first time; the way back; the 禁軍 whose sky it is; the 皇城 on its
// terrace up the face of 玉指峰, and the finger's top only for the flying (those the 大陣 lets through).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as A from '../src/core/actions.js';
import * as SV from '../src/core/save.js';
import { continueEvent } from '../src/core/events.js';
import { useMap, CROSSINGS } from '../src/world/atlas.js';
import { NODES, mapOf } from '../src/world/map.js';
import { POI_BY_ID } from '../src/world/places.js';
import { findPath, regionIdAt } from '../src/world/terrain.js';
import { heightAt } from '../src/world/height.js';
import { flyBlocked } from '../src/world/air.js';
import { FACTIONS } from '../src/world/factions.js';
import { fresh, finish, pickText, waitUntil } from './helpers.js';

const tick = (s) => E.step(s, 0.05, null);

/** A 築基 cultivator over the river (off the boat at 鶴歸渡), the years gone by to `day`. */
function over(seed, day = 8 * 360, more = {}) {
  const s = fresh(seed);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 2, stage: 6, hp: 99999 });
  waitUntil(s, day);
  Object.assign(s.flags, { chapter1_done: true, zhongzhou_crossed: true }, more);
  s.world.cross = 'crane_ferry';
  tick(s);
  assert.equal(s.world.map, 'zhongzhou');
  finish(s);
  return s;
}

/** Walk up to a place at an hour (what the walk brings played out first), and see to it. */
function at(s, id, want, tod = 12) {
  const p = POI_BY_ID[id];
  s.tod = tod;
  E.placeAt(s, p.x, p.y + 30);
  finish(s);
  s.tod = tod;
  E.interact(s, { kind: 'poi', id });
  assert.equal(s.pending?.id, want, `${id} brings up ${want}`);
}

/** Over to another map by the way a story just set (the crossing is taken on the next step), and what meets you there. */
function onward(s) {
  finish(s);
  tick(s);
  finish(s);
}

test('the ways: 官道關 and the 傳送陣 lead to 天衍城 and back; the map page has a word for each', () => {
  assert.equal(mapOf('ty_road'), 'tianyan');
  assert.deepEqual([CROSSINGS.guandao_guan.to, CROSSINGS.ty_road.to, CROSSINGS.linjiang.to, CROSSINGS.waicheng.to], ['tianyan', 'zhongzhou', 'tianyan', 'zhongzhou']);
  assert.ok(CROSSINGS.guandao_guan.hours >= 48, 'the road is days');
  assert.ok(CROSSINGS.linjiang.hours <= 1, 'the array a moment');
  for (const [from, way] of Object.entries(CROSSINGS)) {
    useMap(way.to);
    try {
      assert.ok(regionIdAt(...way.at), `${from}: you come out on open ground`);
    } finally {
      useMap('donghuang');
    }
  }
  assert.ok(FACTIONS.tianyan.show({ flags: { ty_arrived: true } }) && !FACTIONS.tianyan.show({ flags: {} }));
});

test('官道關 without papers: no way through by day, and the guard says where papers are; by night, money takes you over — and you have none to show after', () => {
  const s = over(601);
  try {
    at(s, 'gd_gate', 'gd_gate', 12);
    assert.ok(!s.pending.choices.some((c) => /過關/.test(c.text)), 'no papers, no passing');
    assert.ok(!s.pending.choices.some((c) => /三百/.test(c.text) || /山上/.test(c.text)), 'nothing to be done by day');
    pickText(s, '令牌怎麼辦');
    assert.match(s.pending.result.text, /城主府/);
    assert.match(s.pending.result.text, /夜裡來/);
    finish(s);
    assert.ok(s.flags.ty_pass_asked);
    s.player.ls = 400;
    at(s, 'gd_gate', 'gd_gate', 22);
    pickText(s, '三百');
    onward(s);
    assert.equal(s.world.map, 'tianyan');
    assert.equal(regionIdAt(s.world.x, s.world.y), 'ty_road');
    assert.equal(s.player.ls, 100);
    assert.ok(s.flags.ty_nopass && s.flags.ty_arrived, 'over, the white peak seen, no papers');
  } finally {
    useMap('donghuang');
  }
});

test('by night over the hills round 官道關: the 關兵 catch you — beat them and you are over, and 臨江城 remembers it', () => {
  const s = over(604);
  try {
    s.player.attrs.jiyuan = 0;
    at(s, 'gd_gate', 'gd_gate', 22);
    pickText(s, '山上繞過去');
    assert.ok(s.pending.result.next === 'caught', 'the hills went badly');
    continueEvent(s);
    assert.equal(s.pending.step, 'caught');
    pickText(s, '拔劍');
    assert.ok(s.rtFight, 'fought where you stand');
    onward(s);
    assert.equal(s.world.map, 'tianyan');
    assert.ok(s.flags.ty_nopass && s.flags.gg_fought);
    assert.ok((s.rep.linjiang || 0) <= -10);
  } finally {
    useMap('donghuang');
  }
});

test('papers from the 城主府 for a name the 懸賞堂 knows; the 傳送陣 takes you to the capital in a moment, and back out without a question', () => {
  const s = over(602);
  try {
    at(s, 'lj_lord', 'lj_lord');
    pickText(s, '不登記');
    finish(s);
    at(s, 'lj_lord', 'lj_pass');
    assert.ok(!s.pending.choices.some((c) => /辦一塊/.test(c.text)), 'a nobody gets none');
    finish(s);
    s.rep = { ...(s.rep || {}), linjiang: 30 };
    s.player.ls = 500;
    at(s, 'lj_lord', 'lj_pass');
    pickText(s, '辦一塊');
    finish(s);
    assert.equal(s.player.items.tongxing_ling, 1);
    assert.equal(s.player.ls, 300);
    const day = s.day;
    at(s, 'lj_array', 'lj_array');
    pickText(s, '付靈石');
    finish(s);
    tick(s);
    assert.equal(s.world.map, 'tianyan');
    assert.equal(regionIdAt(s.world.x, s.world.y), 'waicheng');
    assert.equal(s.pending?.id, 'ty_first');
    assert.match(s.pending.text, /陣光散了/);
    assert.match(s.pending.text, /玉指峰/);
    finish(s);
    assert.ok(s.flags.ty_arrived && !s.flags.ty_nopass);
    assert.ok(s.day <= day + 1, 'a moment, not days');
    // the save keeps you in the capital
    const t = SV.migrate(SV.parseSave(SV.serialize(s)));
    E.ensureWorld(t);
    assert.equal(t.world.map, 'tianyan');
    at(s, 'wc_array', 'wc_array');
    pickText(s, '一百');
    finish(s);
    tick(s);
    assert.equal(s.world.map, 'zhongzhou');
    assert.equal(regionIdAt(s.world.x, s.world.y), 'linjiang');
    assert.equal(s.player.ls, 300 - 150 - 100);
  } finally {
    useMap('donghuang');
  }
});

test('上官瑾 gives one turned back at 官道關 (and whom 上官家 owes) its convoys\' papers; the pass lets you by, and the road there and back is three days', () => {
  const s = over(603, 8 * 360, { sg_met: true, sg_boat_owed: true, ty_pass_asked: true });
  try {
    A.visit(s, 'shangguan_jin', { near: true });
    assert.equal(s.pending?.id, 'sg_pass');
    assert.match(s.pending.text, /欠你的那一回/);
    finish(s);
    assert.equal(s.player.items.tongxing_ling, 1);
    const day = s.day;
    at(s, 'gd_gate', 'gd_gate');
    pickText(s, '過關');
    onward(s);
    assert.equal(s.world.map, 'tianyan');
    assert.ok(s.day >= day + 3, 'three days on the road');
    at(s, 'ty_west', 'ty_west');
    pickText(s, '往西走');
    finish(s);
    tick(s);
    assert.equal(s.world.map, 'zhongzhou');
    assert.equal(regionIdAt(s.world.x, s.world.y), 'guandao_guan');
  } finally {
    useMap('donghuang');
  }
});

test('the sky over the capital is the 禁軍\'s: hang over the 外城 and they bring you down', () => {
  const s = over(605);
  try {
    s.world.cross = 'guandao_guan';
    onward(s);
    assert.equal(s.world.map, 'tianyan');
    s.player.items.feisuo = 1;
    E.placeAt(s, 2700, 3000);
    finish(s);
    s.player.mp = 9999;
    assert.ok(E.takeOff(s));
    for (let k = 0; k < 120 && !s.pending; k++) E.step(s, 0.1, null);
    assert.equal(s.pending?.id, 'ty_nofly');
    assert.ok(!E.airborne(s), 'down in the street');
    pickText(s, '認罰');
    finish(s);
    assert.ok((s.rep.tianyan || 0) < 0);
  } finally {
    useMap('donghuang');
  }
});

test('the 皇城 stands on a terrace up 玉指峰\'s face, walked to by its stair; the finger\'s top is only flown to, by those the 大陣 lets through', () => {
  useMap('tianyan');
  try {
    const foot = NODES.waicheng.at;
    assert.ok(findPath({ flags: {} }, ...foot, ...NODES.huangcheng.at), 'up the 御階');
    assert.ok(findPath({ flags: {} }, ...foot, ...NODES.qintianjian.at), 'on to 欽天監 at the back of the terrace');
    assert.equal(findPath({ flags: {} }, ...foot, ...NODES.yuzhi.at), null, 'no walk to the top');
    assert.ok(heightAt(...NODES.huangcheng.at) > heightAt(...foot) + 100, 'the terrace stands high over the city');
    assert.ok(heightAt(...NODES.yuzhi.at) > heightAt(...NODES.qintianjian.at) + 200, 'and the finger far higher');
    const s = { flags: {}, player: { realm: 2 } };
    assert.match(flyBlocked(s, ...NODES.yuzhi.at, 'sword') || '', /護城大陣/);
    s.flags.huangcheng_pass = true;
    assert.equal(flyBlocked(s, ...NODES.yuzhi.at, 'sword'), null, 'with the 皇城\'s token, up');
  } finally {
    useMap('donghuang');
  }
});
