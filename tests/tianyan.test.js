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
import { levelFor, sysGain, SYS_FEATURES } from '../src/world/system.js';
import { fateWet, wetCount } from '../src/world/ending.js';
import { rosterOpen, rosterOf, planBlocked, setPlan, rosterSummary, helpersOf } from '../src/world/roster.js';
import { SHOPS, ITEMS } from '../src/content/items.js';
import { FOES } from '../src/content/foes.js';
import { MOVES } from '../src/content/moves.js';
import { isSword } from '../src/world/air.js';
import { lockOf } from '../src/world/skills.js';
import { postings, WORK } from '../src/world/quests.js';
import { canSecludeAt, nodeQi } from '../src/world/map.js';
import * as CB from '../src/world/combat.js';
import { EXITS } from '../src/world/map.js';
import { nextGoal } from '../src/world/guide.js';
import { storiesOf } from '../src/content/stories.js';
import { annalsOf } from '../src/content/annals.js';
import { FEATS } from '../src/world/feats.js';
import { fateLine } from '../src/world/ending.js';
import { heightAt } from '../src/world/height.js';
import { flyBlocked } from '../src/world/air.js';
import { FACTIONS } from '../src/world/factions.js';
import { fresh, finish, pickText, waitUntil } from './helpers.js';

const tick = (s) => E.step(s, 0.05, null);

/** A 築基 cultivator over the river (off the boat at 鶴歸渡), the years gone by to `day`. */
function over(seed, day = 8 * 360, more = {}) {
  const s = fresh(seed);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 2, stage: 2, hp: 99999 });
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

// ── 系統六級 and the 血月名冊 ──

test('系統六級 at 1600 見聞: 玄微 remembers his forty years in 中州; 命簿全頁 marks the lines you have changed, the ink still wet', () => {
  const s = fresh(621);
  s.sys.bound = true;
  s.flags.sys_awakened = true;
  assert.equal(levelFor(1599), 5);
  assert.equal(levelFor(1600), 6);
  assert.ok(SYS_FEATURES.some((x) => x.lv === 6 && x.name === '命簿全頁') && SYS_FEATURES.some((x) => x.lv === 6 && x.name === '朱筆預警'));
  Object.assign(s.sys, { exp: 1590, lv: 5 });
  sysGain(s, 20, null);
  assert.equal(s.sys.lv, 6);
  assert.ok(s.sched.some((x) => x.ev === 'sys_six'));
  s.npcs.song_he.met = true;
  assert.ok(!fateWet(s, 'song_he'), 'his line as it was written');
  s.flags.songhe_saved = true;
  assert.ok(fateWet(s, 'song_he'), 'saved: the line is yours');
  assert.ok(wetCount(s) >= 1);
  s.sys.lv = 5;
  assert.ok(!fateWet(s, 'song_he'), 'a 五級 system does not see it');
});

test('the 血月名冊 opens with the truth: a plan for each of 東荒\'s people — each needing something real (the boat and their will, a shelter kept, a charm, a promise)', () => {
  const s = fresh(622);
  assert.ok(!rosterOpen(s));
  s.flags.ty_roster = true;
  assert.ok(rosterOpen(s));
  const list = rosterOf(s);
  assert.ok(['wang_er', 'sun_zg', 'song_he', 'hu_sanniang', 'shen_qingge', 'zhao_hu', 'qian_banxian'].every((id) => list.some((r) => r.id === id)));
  assert.match(planBlocked(s, 'qian_banxian', 'evacuate'), /樓船/);
  s.flags.roster_boat = true;
  assert.equal(planBlocked(s, 'qian_banxian', 'evacuate'), null, '錢半仙 is the first on the boat');
  assert.equal(planBlocked(s, 'wang_er', 'evacuate'), '不肯走', '王二: my home is here');
  assert.match(rosterOf(s).find((r) => r.id === 'wang_er').refuse, /我的家在這裡/);
  assert.equal(setPlan(s, 'qian_banxian', 'evacuate'), null);
  assert.equal(s.vars.roster.qian_banxian, 'evacuate');
  // 清虛觀 is kept by 松鶴 while he lives; with him gone, by one who has promised to watch 青石鎮
  s.npcs.song_he.alive = false;
  assert.match(planBlocked(s, 'wang_er', 'qingxu'), /沒有人守/);
  s.flags.roster_lin = true;
  assert.equal(planBlocked(s, 'wang_er', 'qingxu'), null);
  // a charm is given when it is written, and given back if you change your mind
  assert.match(planBlocked(s, 'zhao_hu', 'charm'), /護身符/);
  s.player.items.hushen_fu = 1;
  assert.equal(setPlan(s, 'zhao_hu', 'charm'), null);
  assert.ok(!s.player.items.hushen_fu);
  assert.equal(setPlan(s, 'zhao_hu', null), null);
  assert.equal(s.player.items.hushen_fu, 1);
  // each takes only so many
  for (const id of ['wang_er', 'sun_zg', 'zhao_hu']) assert.equal(setPlan(s, id, 'lin'), null);
  assert.equal(planBlocked(s, 'shen_qingge', 'lin'), '人已經滿了');
  assert.equal(rosterSummary(s).done, 4);
  // the dead are off the page
  assert.ok(!rosterOf(s).find((r) => r.id === 'song_he').options.length);
  // it keeps
  const t = SV.migrate(SV.parseSave(SV.serialize(s)));
  assert.deepEqual(t.vars.roster, s.vars.roster);
});

test('those who can say yes: 上官瑾 lends the 樓船 to one she owes; 林塵 goes home for his 玉佩\'s favour; 葉孤寒 for the founder\'s rule; 蕭七 for the 散修; 胡三娘 hides three on her hill', () => {
  const s = over(623, 9 * 360 + 60, { ty_roster: true, sg_met: true, sg_boat_owed: true, lin_zz: true, tianjian_guest: true, tj_ancestors_seen: true });
  try {
    A.visit(s, 'shangguan_jin', { near: true });
    assert.equal(s.pending?.id, 'roster_boat');
    pickText(s, '借我樓船');
    finish(s);
    assert.ok(s.flags.roster_boat);
    Object.assign(s.npcs.lin_chen, { alive: true, loc: 'shangguan', met: true });
    s.player.items.lin_jade = 1;
    A.visit(s, 'lin_chen', { near: true });
    assert.equal(s.pending?.id, 'roster_lin');
    pickText(s, '玉佩');
    finish(s);
    assert.ok(s.flags.roster_lin && !s.player.items.lin_jade, 'the favour asked, the jade given back');
    Object.assign(s.npcs.ye_guhan, { alive: true, met: true });
    A.visit(s, 'ye_guhan', { near: true });
    assert.equal(s.pending?.id, 'roster_tj');
    pickText(s, '劍不入鞘');
    finish(s);
    assert.ok(s.flags.roster_tj);
    Object.assign(s.npcs.xiao_qi, { alive: true, met: true });
    s.player.ls = 500;
    A.visit(s, 'xiao_qi', { near: true });
    assert.equal(s.pending?.id, 'roster_xiao');
    pickText(s, '我出錢');
    finish(s);
    assert.ok(s.flags.roster_xiao);
    Object.assign(s.npcs.hu_sanniang, { alive: true, met: true });
    A.visit(s, 'hu_sanniang', { near: true });
    assert.equal(s.pending?.id, 'roster_fox');
    pickText(s, '你護著');
    finish(s);
    assert.ok(s.flags.roster_fox);
    assert.ok(helpersOf(s).every((x) => x.yes || x.name === '清虛觀'));
    // 天衍觀 sells the charms
    assert.ok(SHOPS.ty_temple.stock.includes('hushen_fu') && ITEMS.hushen_fu.price > 0);
  } finally {
    useMap('donghuang');
  }
});

// ── 1.2's foes, shops, work and caves in the capital ──

test('the capital\'s shops (the 拍賣行\'s 凝金丹, the smith\'s 衍光劍 — a sword to fly on and fight with), its 懸賞堂, and a cave at the foot of the peak', () => {
  const s = inCapital(631);
  try {
    assert.ok(SHOPS.ty_auction.stock.includes('ningjin_pill'), 'a 凝金丹 for a 結丹');
    assert.ok(SHOPS.ty_smith.stock.includes('yanguang_sword'));
    for (const id of [...SHOPS.ty_auction.stock, ...SHOPS.ty_market.stock, ...SHOPS.ty_smith.stock, ...SHOPS.ty_temple.stock]) assert.ok(ITEMS[id], id);
    assert.ok(isSword('yanguang_sword'), 'stood on to fly');
    s.player.items.yanguang_sword = 1;
    s.player.weapon = 'yanguang_sword';
    assert.equal(lockOf(s, MOVES.swordstep), null, 'the sword moves come with it');
    const work = postings(s, 'tianyan');
    assert.ok(work.length === 3 && work.every((w) => w.board === 'tianyan'));
    for (const w of WORK.tianyan) {
      if (w.kind === 'bring') assert.ok(ITEMS[w.item], w.id);
      else for (const k of w.beasts) assert.ok(FOES[k], w.id);
    }
    // a cave: none in the street, one rented by the month
    assert.ok(canSecludeAt(s, 'waicheng'), 'no seclusion in the street');
    s.player.ls = 2000;
    at(s, 'wc_cave', 'wc_cave');
    pickText(s, '租一個月');
    finish(s);
    assert.equal(canSecludeAt(s, 'waicheng'), null);
    assert.equal(nodeQi(s, 'waicheng'), 2.0);
    assert.ok(canSecludeAt(s, 'huangcheng') && canSecludeAt(s, 'qintianjian'), 'the palace and 欽天監 are not for sitting in');
  } finally {
    useMap('donghuang');
  }
});

test('what is out in the capital: the 皇陵\'s stone men only after dark; the 禁軍 and 星衛 on the terrace only for one without the token; 白澤 once', () => {
  const s = inCapital(632);
  try {
    const out = (id) => {
      tick(s);
      return CB.beastsInWorld(s, 99999).some((b) => b.def.id === id);
    };
    s.tod = 12;
    E.placeAt(s, 1240, 1900);
    finish(s);
    s.tod = 12;
    assert.ok(!out('shiyong_a'), 'by day the stone men stand on their plinths');
    s.tod = 22;
    assert.ok(out('shiyong_a'), 'after dark they walk');
    s.tod = 12;
    s.flags.hc_in = true;
    E.placeAt(s, 2700, 1980);
    finish(s);
    assert.ok(out('hc_patrol_a'), 'an intruder meets the 禁軍');
    s.flags.huangcheng_pass = true;
    assert.ok(!out('hc_patrol_a'), 'not one with the token');
    assert.ok(FOES.baize.boss && FOES.bixi.boss && FOES.shiyong && FOES.jy_leopard && FOES.xingwei && FOES.jinjun);
  } finally {
    useMap('donghuang');
  }
});

// ── what the 見聞 page and the goals say of it; and (1.2) the ways out of 東荒, known from the start ──

test('東荒\'s four ways out are known from the start (and in an old save too); the map page lists them; the goals point at one you are ready for', () => {
  const s = fresh(641);
  for (const id of EXITS) assert.ok(s.nodes[id].known, `${id} known on a new life`);
  const old = fresh(642);
  for (const id of EXITS) old.nodes[id].known = false;
  const t = SV.migrate(SV.parseSave(SV.serialize(old)));
  for (const id of EXITS) assert.ok(t.nodes[id].known, `${id} known in an old save`);
  assert.ok(Object.entries(CROSSINGS).filter(([from, way]) => mapOf(from) === 'donghuang' && s.nodes[from]?.known).length >= 4, 'the map page has a way to each');
  // nothing else to do, and 煉氣: the way south
  Object.assign(s.player, { realm: 1, stage: 3, xw: 0 });
  for (const id of Object.keys(s.nodes)) if (s.nodes[id].known) s.nodes[id].visited = true;
  const g = nextGoal(s);
  assert.equal(g?.key, 'exit:nanling', JSON.stringify(g));
  s.flags.nanling_crossed = true;
  assert.notEqual(nextGoal(s)?.key, 'exit:nanling');
});

test('in the capital the goals lead on (the city, 蘇清瑤 at 欽天監, the 天驕閣, the roster, the 皇陵); the 見聞 page has its threads, histories and marks', () => {
  const s = inCapital(643);
  try {
    s.player.xw = 0;
    assert.equal(nextGoal(s)?.key, 'ty:city');
    E.placeAt(s, ...NODES.waicheng.at);
    finish(s);
    assert.equal(nextGoal(s)?.key, 'ty:board', 'nobody bringing you: see the 天驕閣');
    Object.assign(s.flags, { ty_book_seen: true, ty_truth: true, ty_roster: true, yz_ink_known: true });
    assert.equal(nextGoal(s)?.key, 'ty:roster');
    const threads = storiesOf(s).map((t) => t.id);
    assert.ok(threads.includes('zz_capital') && threads.includes('zz_roster'), threads.join(' '));
    const main2 = storiesOf(s).find((t) => t.id === 'main2');
    assert.ok(main2.steps.some((x) => /抄本閣/.test(x.label)));
    s.flags.hl_seen = true;
    const { have } = annalsOf(s);
    assert.ok(['founder', 'qintian_origin', 'yuzhi_ink', 'copying'].every((id) => have.some((a) => a.id === id)));
    assert.ok(['capital', 'copybook', 'founder', 'six', 'roster', 'nameless', 'inkless'].every((id) => FEATS.some((x) => x.id === id)));
    s.npcs.wei_changgeng.met = true;
    s.sys.lv = 5;
    assert.match(fateLine(s, 'wei_changgeng'), /玉指峰頂執筆/);
  } finally {
    useMap('donghuang');
  }
});
