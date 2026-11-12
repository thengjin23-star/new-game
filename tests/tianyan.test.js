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
import { findPath, regionIdAt, regionAt } from '../src/world/terrain.js';
import { WINDOWS } from '../src/world/arcs.js';
import { bloodMoon } from '../src/world/weather.js';
import { fragmentText } from '../src/content/fragments.js';
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

// ── 1.2's story: 欽天監's 抄本閣 (with 蘇清瑤, or with 衛長庚), the 御階 by night, the peak's ink, the 皇陵 ──

/** On the capital's map (over the 官道 from 官道關), at `day`, with what more is so. */
function inCapital(seed, day = 9 * 360 + 60, more = {}) {
  const s = over(seed, day, more);
  s.world.cross = 'guandao_guan';
  onward(s);
  assert.equal(s.world.map, 'tianyan');
  return s;
}

/** Take a choice that leads on to another step of the story. */
function goOn(s, text) {
  pickText(s, text);
  if (s.pending?.result?.next) continueEvent(s);
}

test('蘇清瑤 finds what she was looking for: back to 欽天監 with a token for you; up the 御階, into the 抄本閣 — 東荒\'s page, the date, the ink, the roster — and 衛長庚 at the door', () => {
  const s = over(611, 8 * 360 + 300, { su_zz_met: true, su_zz_ally: true, su_told_night: true });
  try {
    const su = s.npcs.su_qingyao;
    Object.assign(su, { alive: true, loc: 'linjiang', met: true });
    waitUntil(s, WINDOWS.suFound + 3);
    assert.equal(su.loc, 'qintianjian', 'back to the capital');
    E.placeAt(s, 1700, 2960);
    for (let k = 0; k < 4 && s.pending?.id !== 'su_token'; k++) {
      finish(s);
      E.placeAt(s, 1700 + 40 * k, 3000);
    }
    assert.equal(s.pending?.id, 'su_token');
    assert.match(s.pending.text, /我查到了/);
    finish(s);
    assert.ok(s.player.items.qintian_token && s.flags.huangcheng_pass);
    s.world.cross = 'linjiang';
    s.player.ls = 1000;
    onward(s);
    assert.equal(s.world.map, 'tianyan');
    // up the stair: nobody stops the token
    E.placeAt(s, 2700, 2380);
    assert.notEqual(s.pending?.id, 'hc_guard');
    finish(s);
    E.placeAt(s, 2600, 1660);
    finish(s);
    A.visit(s, 'su_qingyao', { near: true });
    assert.equal(s.pending?.id, 'su_archive');
    goOn(s, '跟她進去');
    goOn(s, '我的那一行');
    assert.equal(s.pending.step, 'east');
    assert.match(s.pending.text, /天元三千零二十二年七月十五，玉指峰朱墨足，當除此頁/);
    assert.match(s.pending.text, /蘇清瑤，歿/);
    goOn(s, '劃掉了');
    assert.equal(s.pending.step, 'ink');
    assert.match(s.pending.text, /墨池/);
    goOn(s, '我們怎麼辦');
    assert.ok(s.flags.ty_truth && s.flags.yz_ink_known && s.flags.ty_roster);
    assert.equal(s.pending.step, 'door');
    assert.match(s.pending.text, /衛長庚/);
    pickText(s, '去找那隻手');
    finish(s);
    assert.ok(s.npcs.wei_changgeng.met && s.flags.wei_met);
  } finally {
    useMap('donghuang');
  }
});

test('with nobody to take you in, 衛長庚 sends down for you from the 天驕閣: his 抄本, your missing line, the tenth page — and down again by dawn', () => {
  const s = inCapital(612);
  try {
    at(s, 'wc_board', 'wc_board');
    assert.match(s.pending.text, /監正請你上山/);
    goOn(s, '跟他上山');
    assert.equal(s.pending.step, 'wei');
    assert.ok(s.flags.hc_in);
    assert.match(s.pending.text, /找你自己/);
    assert.match(s.pending.text, /第十頁/);
    goOn(s, '為什麼');
    assert.equal(s.pending.step, 'end');
    pickText(s, '下山');
    finish(s);
    assert.ok(s.flags.ty_truth && s.flags.wei_met && !s.flags.hc_in);
    tick(s);
    finish(s);
    assert.equal(regionIdAt(s.world.x, s.world.y), 'waicheng', 'down at the foot of the stair');
    // one 蘇清瑤 means to bring is left for her
    const t = inCapital(613, 9 * 360 + 60, { su_zz_ally: true });
    t.npcs.su_qingyao.alive = true;
    at(t, 'wc_board', 'wc_board');
    assert.doesNotMatch(t.pending.text, /監正請你上山/);
    finish(t);
  } finally {
    useMap('donghuang');
  }
});

test('the 御階 without a token: turned back by day; by night, past the 禁軍 in the dark — inside, nobody asks again until you are out', () => {
  const s = inCapital(614);
  try {
    s.tod = 12;
    E.placeAt(s, 2700, 2380);
    assert.equal(s.pending?.id, 'hc_guard');
    assert.ok(!s.pending.choices.some((c) => /摸上去/.test(c.text)), 'nothing to be done in daylight but turn back or fight');
    pickText(s, '轉身下去');
    finish(s);
    tick(s);
    finish(s);
    assert.equal(regionIdAt(s.world.x, s.world.y), 'waicheng');
    s.player.attrs.jiyuan = 12;
    s.tod = 23;
    E.placeAt(s, 2700, 2380);
    assert.equal(s.pending?.id, 'hc_guard');
    pickText(s, '摸上去');
    finish(s);
    assert.ok(s.flags.hc_in);
    E.placeAt(s, 2700, 1960);
    finish(s);
    E.placeAt(s, 2600, 1660);
    assert.notEqual(s.pending?.id, 'hc_guard');
    finish(s);
    E.placeAt(s, 2700, 2560);
    finish(s);
    assert.ok(!s.flags.hc_in, 'out again: stopped again next time');
  } finally {
    useMap('donghuang');
  }
});

test('why the peak is sealed, seen for yourself: by night under its north face the 星衛 catch the ink it seeps; at the top, the ink will not stay on your hand — and the 天梯 takes you down', () => {
  const s = inCapital(615);
  try {
    s.player.attrs.jiyuan = 12;
    at(s, 'hl_face', 'hl_face', 23);
    assert.match(s.pending.text, /是墨/);
    pickText(s, '躲在柏樹後面');
    finish(s);
    assert.ok(s.flags.yz_ink_seen && s.flags.yz_ink_known);
    s.flags.huangcheng_pass = true;
    E.placeAt(s, ...NODES.yuzhi.at);
    finish(s);
    E.interact(s, { kind: 'poi', id: 'yz_platform' });
    assert.equal(s.pending?.id, 'yz_platform');
    pickText(s, '碰一碰');
    assert.match(s.pending.result.text, /一滴也沒有留下/);
    finish(s);
    E.interact(s, { kind: 'poi', id: 'yz_platform' });
    pickText(s, '順著天梯');
    finish(s);
    tick(s);
    finish(s);
    assert.equal(regionIdAt(s.world.x, s.world.y), 'qintianjian', 'down at 欽天監');
  } finally {
    useMap('donghuang');
  }
});

test('the 皇陵: the stone tortoise at the 陵門, beaten, lets you down to the 地宮 — the founder was 玄微\'s student, and 殘頁・星 is whole', () => {
  const s = inCapital(616);
  try {
    s.sys.frags.push('frag_star');
    at(s, 'hl_gate', 'hl_gate');
    pickText(s, '拔劍');
    assert.ok(s.rtFight);
    finish(s);
    assert.ok(s.flags.hl_open && s.nodes.hl_gong.known);
    assert.equal(regionAt(s, 1180, 640), 'hl_gong');
    at(s, 'hlg_coffin', 'hlg_coffin');
    assert.match(s.pending.text, /他當了皇帝/);
    finish(s);
    assert.ok(s.flags.hl_seen && s.flags.frag_star_whole);
    assert.match(fragmentText(s, 'frag_star'), /他當了皇帝/);
    assert.doesNotMatch(fragmentText(s, 'frag_star'), /整整齊齊地裁掉了/);
    at(s, 'hlg_mural', 'hlg_mural');
    assert.match(s.pending.text, /少了一根指頭/);
    finish(s);
  } finally {
    useMap('donghuang');
  }
});

test('small blood moons come oftener as 3022 comes nearer (欽天監 trying its brush)', () => {
  const count = (y) => {
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) for (let m = 0; m < 12; m++) if (bloodMoon({ seed }, y * 360 + m * 30 + 14)) n++;
    return n;
  };
  assert.ok(count(6) < count(9), `3018 (${count(6)}) fewer than 3021 (${count(9)})`);
  assert.ok(count(9) > 40 * 12 * 0.45, 'by 3021, more than half the months');
});

test('no papers in the capital: the 京兆府\'s men ask when you come into the 外城; a name the capital knows makes it right', () => {
  const s = over(617);
  try {
    s.player.ls = 1000;
    at(s, 'gd_gate', 'gd_gate', 22);
    pickText(s, '三百');
    onward(s);
    assert.ok(s.flags.ty_nopass);
    E.placeAt(s, 2700, 3240);
    assert.equal(s.pending?.id, 'ty_check');
    pickText(s, '認罰');
    finish(s);
    s.rep.tianyan = 30;
    at(s, 'wc_yamen', 'wc_pass');
    pickText(s, '補辦');
    finish(s);
    assert.ok(s.player.items.tongxing_ling && !s.flags.ty_nopass);
  } finally {
    useMap('donghuang');
  }
});
