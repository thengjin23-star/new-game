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
