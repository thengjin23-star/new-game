// 中州 1.1「靈脈之爭」: 林塵 over the river as 上官家's 客卿; 沈家 eaten by 謝家, and 沈清歌's
// letter (taken over the river in time, or three years late); the 生死約戰 outside 天劍宗's gate —
// fought as the 命簿 has it, or not; and, for one who was not there, what is said of it after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as A from '../src/core/actions.js';
import { EVENTS } from '../src/content/index.js';
import { NODES } from '../src/world/map.js';
import { useMap } from '../src/world/atlas.js';
import { WINDOWS } from '../src/world/arcs.js';
import { duelOf } from '../src/world/duel.js';
import { fateLine } from '../src/world/ending.js';
import { nextGoal } from '../src/world/guide.js';
import { continueEvent } from '../src/core/events.js';
import { POI_BY_ID } from '../src/world/places.js';
import { breakthroughInfo } from '../src/core/cultivation.js';
import { canSecludeAt } from '../src/world/map.js';
import { shopHere, priceOf } from '../src/core/actions.js';
import { SHOPS } from '../src/content/items.js';
import { lockOf } from '../src/world/skills.js';
import { MOVES } from '../src/content/moves.js';
import { PASSIVES } from '../src/content/passives.js';
import { fresh, resolvePending, pickText, finish, waitUntil } from './helpers.js';

const tick = (s) => E.step(s, 0.05, null);

/** A 築基 cultivator, the years gone by to `day`, standing on 鶴歸渡's landing. */
function overAt(seed, day, more = {}) {
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

/** Take a choice that leads on to another step of the story. */
function goOn(s, text) {
  pickText(s, text);
  if (s.pending?.result?.next) continueEvent(s);
}

test('林塵 goes over the river to be 上官家\'s 客卿 the autumn after he left; a friend finds him glad of it', () => {
  const s = fresh(501);
  s.player.items.lin_jade = 1;
  waitUntil(s, WINDOWS.linToZz + 2);
  const L = s.npcs.lin_chen;
  assert.equal(L.loc, 'shangguan');
  assert.equal(L.title, '上官家客卿');
  assert.ok(L.realm >= 2, '築基 by now');
  Object.assign(s.flags, { chapter1_done: true, zhongzhou_crossed: true });
  s.world.cross = 'crane_ferry';
  tick(s);
  finish(s);
  try {
    A.visit(s, 'lin_chen', { near: true });
    assert.equal(s.pending?.id, 'lin_zz');
    assert.match(s.pending.text, /你真的來了/);
    pickText(s, '過得怎麼樣');
    finish(s);
    assert.ok(s.flags.lin_zz_met);
    // (one ruined in 東荒 never goes)
    const t = fresh(502);
    t.flags.lin_ruined = true;
    waitUntil(t, WINDOWS.linToZz + 2);
    assert.notEqual(t.npcs.lin_chen.loc, 'shangguan');
  } finally {
    useMap('donghuang');
  }
});

test('沈家 is eaten by 謝家; 沈清歌 gives you her letter; there in time, 林塵 does not drink — and it goes by even without you', () => {
  const s = fresh(503);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 2, stage: 2, hp: 99999 });
  waitUntil(s, WINDOWS.shenFall + 2);
  assert.ok(s.flags.shen_fall);
  assert.ok(s.rumors.some((r) => r.text.includes('謝')), 'the 東荒 hears of it');
  assert.equal(nextGoal(s)?.key, 'ferry', 'not over yet: the river first');
  Object.assign(s.flags, { chapter1_done: true, zhongzhou_crossed: true });
  assert.equal(nextGoal(s)?.key, 'shen_letter', 'been over and back: the goal is her');
  A.visit(s, 'shen_qingge', { near: true });
  assert.equal(s.pending?.id, 'shen_letter');
  pickText(s, '我替你送');
  finish(s);
  assert.ok(s.player.items.shen_letter > 0);
  // over the river, to him
  Object.assign(s.flags, { chapter1_done: true, zhongzhou_crossed: true });
  s.world.cross = 'crane_ferry';
  tick(s);
  finish(s);
  try {
    s.nodes.linjiang.visited = true;
    assert.equal(nextGoal(s)?.key, 'zz:letter2');
    A.visit(s, 'lin_chen', { near: true });
    pickText(s, s.pending.choices.find((c) => !c.disabled && c.text.length > 1).text);
    finish(s);
    A.visit(s, 'lin_chen', { near: true });
    pickText(s, '沈清歌託我');
    finish(s);
    assert.ok(s.flags.shen_letter_given && s.flags.lin_warned);
    assert.match(fateLine({ ...s, sys: { ...s.sys, lv: 5 } }, 'shen_qingge'), /沒有遲/);
    // the duel day goes by without you: he does not drink, and it is even
    waitUntil(s, WINDOWS.duel + 2);
    assert.equal(duelOf(s), 'draw');
    assert.ok(s.rumors.some((r) => r.text.includes('平手')));
    assert.match(fateLine({ ...s, sys: { ...s.sys, lv: 5 } }, 'lin_chen'), /平/);
    assert.match(fateLine({ ...s, sys: { ...s.sys, lv: 5 } }, 'ye_guhan'), /「平」字/);
  } finally {
    useMap('donghuang');
  }
});

test('nobody takes the letter: the duel goes as the 命簿 has it, and the letter gets there three years late', () => {
  const s = fresh(504);
  waitUntil(s, WINDOWS.duel + 2);
  assert.equal(duelOf(s), 'ye');
  assert.ok(s.npcs.lin_chen.alive, '葉孤寒 does not kill him');
  waitUntil(s, WINDOWS.shenLetterLate + 2);
  assert.ok(s.flags.shen_letter_late);
  assert.ok(s.rumors.some((r) => r.text.includes('小心謝家的茶')));
});

test('at the gate that day: 「看著」 and he drinks — 葉孤寒 will not kill him; leap up between them and he remembers it', () => {
  for (const [seed, pick, saved] of [[505, '看著', false], [506, '跳上台', true]]) {
    const s = overAt(seed, WINDOWS.duelNotice + 2);
    try {
      assert.ok(s.flags.duel_notice);
      s.nodes.linjiang.visited = true;
      assert.equal(nextGoal(s)?.key, 'zz:duel');
      s.day = WINDOWS.duel;
      E.placeAt(s, ...NODES.tianjian.at);
      for (let k = 0; k < 4 && s.pending?.id !== 'zz_duel'; k++) finish(s);
      assert.equal(s.pending?.id, 'zz_duel', 'the duel, at the gate, on its day');
      goOn(s, '看著');
      assert.match(s.pending.text, /單膝跪在了台上/);
      goOn(s, pick);
      finish(s);
      assert.equal(duelOf(s), 'ye');
      assert.ok(s.npcs.lin_chen.alive);
      assert.equal(!!s.flags.lin_saved_duel, saved);
    } finally {
      useMap('donghuang');
    }
  }
});

test('at the gate that day, knowing of the 軟筋散 (蕭七 heard of it at the lamps): call it out, and it is a fair fight — even', () => {
  const s = overAt(507, WINDOWS.duelNotice + 2);
  try {
    // 蕭七 says what was bought
    Object.assign(s.flags, { xiaoqi_met: true });
    A.visit(s, 'xiao_qi', { near: true });
    pickText(s, '新鮮事');
    finish(s);
    assert.ok(s.flags.xie_trap_known);
    s.day = WINDOWS.duel;
    E.placeAt(s, ...NODES.tianjian.at);
    for (let k = 0; k < 4 && s.pending?.id !== 'zz_duel'; k++) finish(s);
    goOn(s, '那杯茶有毒');
    assert.match(s.pending.text, /三十招/);
    finish(s);
    assert.equal(duelOf(s), 'draw');
    assert.ok(s.flags.xie_exposed);
  } finally {
    useMap('donghuang');
  }
});

test('one who comes over after it is long done hears of it, and 林塵 talks of it', () => {
  const s = overAt(508, WINDOWS.duel + 40);
  try {
    assert.equal(duelOf(s), 'ye');
    A.visit(s, 'lin_chen', { near: true });
    pickText(s, s.pending.choices.find((c) => !c.disabled).text);
    finish(s);
    A.visit(s, 'lin_chen', { near: true });
    pickText(s, '那一戰');
    assert.match(s.pending.result.text, /我輸了/);
    finish(s);
    assert.ok(!EVENTS.zz_duel.cond(s) || s.flags.duel_done);
  } finally {
    useMap('donghuang');
  }
});

// ── 龍脊嶺's vein ──

function goToPoiAt(s, id) {
  const p = POI_BY_ID[id];
  E.placeAt(s, p.x, p.y + 30);
  finish(s);
}

test('龍脊嶺 for 上官家: through the gallery, 謝家\'s men out of the 靈眼, 謝家老祖 beaten — the case is won, the river-boat owes you, the 靈眼 helps a 結丹', () => {
  const s = overAt(511, 7 * 360 + 30, { sg_met: true, sg_longji: true });
  try {
    A.visit(s, 'shangguan_jin', { near: true });
    pickText(s, '龍脊嶺的事');
    finish(s);
    assert.ok(s.flags.lg_job_sg);
    goToPoiAt(s, 'lg_mine');
    for (let k = 0; k < 4 && s.pending?.id !== 'lg_mine'; k++) {
      finish(s);
      E.interact(s, { kind: 'poi', id: 'lg_mine' });
    }
    goOn(s, '下礦');
    pickText(s, '拔劍');
    // won in the gallery, on to the 靈眼; 謝家's men out; the old man comes; beaten
    resolvePending(s, (opts) => opts.find((c) => c.text.includes('謝家的人')) || opts.find((c) => c.text.includes('拔劍')) || opts[0], 'won');
    assert.ok(s.flags.lg_clear_sg && s.flags.xie_ancestor_beaten, 'cleared, and the ancestor beaten');
    A.visit(s, 'shangguan_jin', { near: true });
    pickText(s, '從礦底出來了');
    finish(s);
    assert.equal(s.flags.lg_side, 'shangguan');
    assert.ok(s.flags.sg_boat_owed && s.flags.lg_eye_open);
    // a 築基圓滿 at the ridge: the 靈眼 counts for the 結丹
    Object.assign(s.player, { realm: 2, stage: 3 });
    s.player.loc = 'longji';
    assert.ok(breakthroughInfo(s).parts.some(([n]) => n === '龍脊靈眼'));
  } finally {
    useMap('donghuang');
  }
});

test('龍脊嶺 for 謝家: 上官家\'s miners driven off for 謝玄朗 — and then his paper of powder, and 林塵 dead on the stage (the 命簿 broken)', () => {
  const s = overAt(512, 7 * 360 + 30, { xie_met: true });
  try {
    A.visit(s, 'xie_xuanlang', { near: true });
    pickText(s, '謝少主找我');
    finish(s);
    assert.ok(s.flags.lg_job_xie);
    goToPoiAt(s, 'lg_mine');
    for (let k = 0; k < 4 && s.pending?.id !== 'lg_mine'; k++) {
      finish(s);
      E.interact(s, { kind: 'poi', id: 'lg_mine' });
    }
    goOn(s, '下礦');
    pickText(s, '拔劍');
    resolvePending(s, (opts) => opts.find((c) => c.text.includes('上官家的人')) || opts[0], 'won');
    assert.ok(s.flags.lg_clear_xie);
    A.visit(s, 'xie_xuanlang', { near: true });
    pickText(s, '下山了');
    finish(s);
    assert.equal(s.flags.lg_side, 'xie');
    // his favour, before the 生死約戰
    A.visit(s, 'xie_xuanlang', { near: true });
    assert.equal(s.pending?.id, 'xie_ask');
    pickText(s, '收下紙包');
    finish(s);
    assert.ok(s.flags.xie_ally);
    waitUntil(s, WINDOWS.duelNotice + 2);
    s.day = WINDOWS.duel;
    E.placeAt(s, ...NODES.tianjian.at);
    for (let k = 0; k < 4 && s.pending?.id !== 'zz_duel'; k++) finish(s);
    goOn(s, '謝玄朗交代');
    finish(s);
    assert.equal(duelOf(s), 'lin_dead');
    assert.ok(!s.npcs.lin_chen.alive);
    assert.match(fateLine({ ...s, sys: { ...s.sys, lv: 5 } }, 'ye_guhan'), /洇開/);
  } finally {
    useMap('donghuang');
  }
});

test('龍脊嶺 for yourself: the 靈髓 taken while they fought; 謝家老祖 beaten, it is yours (and counts at your 結丹)', () => {
  const s = overAt(513, 7 * 360 + 30);
  try {
    goToPoiAt(s, 'lg_mine');
    for (let k = 0; k < 4 && s.pending?.id !== 'lg_mine'; k++) {
      finish(s);
      E.interact(s, { kind: 'poi', id: 'lg_mine' });
    }
    goOn(s, '下礦');
    pickText(s, '拔劍');
    resolvePending(s, (opts) => opts.find((c) => c.text.includes('靈髓')) || opts.find((c) => c.text.includes('拔劍')) || opts[0], 'won');
    assert.equal(s.flags.lg_side, 'self');
    assert.ok(s.player.items.lingsui > 0);
    Object.assign(s.player, { realm: 2, stage: 3 });
    assert.ok(breakthroughInfo(s).parts.some(([n]) => n === '龍脊靈髓'));
  } finally {
    useMap('donghuang');
  }
});

test('nobody takes a hand in it: 謝家 has the vein by 3021; one who played both houses is found out by then', () => {
  const s = fresh(514);
  waitUntil(s, WINDOWS.veinDone + 2);
  assert.equal(s.flags.lg_side, 'xie_default');
  const t = fresh(515);
  t.flags.lg_side = 'both';
  const before = t.npcs.shangguan_jin.favor;
  waitUntil(t, WINDOWS.veinDone + 2);
  assert.ok(t.flags.lg_both_found);
  assert.ok(t.npcs.shangguan_jin.favor < before);
});

// ── 天劍宗 ──

test('天劍宗\'s 客卿: a 金丹 who gets past the gatekeeper\'s sword is let up the steps (its vault, its 結丹洞, a place to sit)', () => {
  const s = overAt(521, 30);
  try {
    Object.assign(s.player, { realm: 3, stage: 0 });
    E.placeAt(s, ...NODES.tianjian.at);
    finish(s);
    goToPoiAt(s, 'tj_gate');
    for (let k = 0; k < 4 && s.pending?.id !== 'tj_gate'; k++) {
      finish(s);
      E.interact(s, { kind: 'poi', id: 'tj_gate' });
    }
    pickText(s, '掛名做客卿');
    resolvePending(s, (o) => o[0], 'won');
    assert.ok(s.flags.tianjian_guest);
    assert.equal(canSecludeAt(s, 'tianjian'), null, 'a guest may sit there');
    goToPoiAt(s, 'tj_vault');
    assert.equal(shopHere(s), SHOPS.tianjian);
    assert.ok(SHOPS.tianjian.stock.includes('ningjin_pill') && priceOf(s, 'ningjin_pill') > 0, '凝金丹, for its guests');
    // a 築基 sitting at its gate for 金丹: the 結丹洞 counts
    Object.assign(s.player, { realm: 2, stage: 3 });
    s.player.loc = 'tianjian';
    assert.ok(breakthroughInfo(s).parts.some(([n]) => n === '天劍宗結丹洞'));
  } finally {
    useMap('donghuang');
  }
});

test('葉孤寒 takes one who read the 劍冢碑 and carries the shard up to the 祖師堂; at the pool the 劍靈 gives the sword back whole, and 斷天 with it', () => {
  const s = overAt(522, 30, { ye_promise: true, sword_stele_read: true, ye_zz_met: true });
  try {
    s.player.items.broken_sword = 1;
    A.visit(s, 'ye_guhan', { near: true });
    assert.equal(s.pending?.id, 'ye_climb');
    goOn(s, '跟他上去');
    assert.match(s.pending.text, /玉指峰/, 'the founder\'s rule: the finger, fallen in 中州');
    pickText(s, '劍池還認得它嗎');
    finish(s);
    assert.ok(s.flags.tj_ancestors_seen && s.flags.tianjian_guest);
    assert.ok(s.world.y < 1200, 'up on the plateau');
    goToPoiAt(s, 'tj_pool');
    for (let k = 0; k < 4 && s.pending?.id !== 'tj_pool'; k++) {
      finish(s);
      E.interact(s, { kind: 'poi', id: 'tj_pool' });
    }
    pickText(s, '古劍殘片放進劍池');
    resolvePending(s, (o) => o[0], 'won');
    assert.ok(s.flags.duantian_forged);
    assert.ok(s.player.items.duantian_sword > 0 && !(s.player.items.broken_sword > 0));
    assert.ok(s.player.arts.includes('duantian'));
    assert.equal(lockOf(s, MOVES.duantian), null, '斷天 is yours');
  } finally {
    useMap('donghuang');
  }
});

test('the 試劍崖: a month apart, three bouts won, and 天劍訣 is learned (its 心法 劍意 with it)', () => {
  const s = overAt(523, 30, { tianjian_guest: true });
  try {
    Object.assign(s.player, { realm: 3, stage: 1 });
    for (let k = 0; k < 3; k++) {
      goToPoiAt(s, 'tj_hall');
      for (let j = 0; j < 4 && s.pending?.id !== 'tj_hall'; j++) {
        finish(s);
        E.interact(s, { kind: 'poi', id: 'tj_hall' });
      }
      pickText(s, '論劍');
      resolvePending(s, (o) => o[0], 'won');
      s.day += 31;
    }
    assert.equal(s.vars.tj_spars, 3);
    assert.ok(s.player.arts.includes('tianjian_sword'));
    assert.ok(PASSIVES.jianyi.needs.learn.includes('tianjian_sword'));
  } finally {
    useMap('donghuang');
  }
});
