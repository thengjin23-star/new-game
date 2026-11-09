// 中州 (1.0「渡江」): the boat really goes over now. The first time is still
// the end of 第一章 (the ending screen, then 鶴歸渡); a save that saw the
// ending before the far bank was open is taken over now; one below 築基 may
// chance 劉家's night barge; and the old ferryman takes anyone home.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { EVENTS } from '../src/content/index.js';
import { NODES } from '../src/world/map.js';
import { useMap, CROSSINGS } from '../src/world/atlas.js';
import { nextGoal } from '../src/world/guide.js';
import { serialize, parseSave } from '../src/core/save.js';
import { fresh, resolvePending, goToPoi, pickText, finish } from './helpers.js';

/** Up to a pier and see to it, until the event wanted comes up (what the first visit says comes first). */
function atPier(s, poi, want) {
  goToPoi(s, poi);
  resolvePending(s);
  for (let k = 0; k < 6 && s.pending?.id !== want; k++) {
    resolvePending(s);
    E.interact(s, { kind: 'poi', id: poi });
  }
  assert.equal(s.pending?.id, want, `${want} at ${poi}`);
}

/** The world takes a step (a way over, taken, is gone over on the next one). */
const tick = (s) => E.step(s, 0.05, null);

/** 築基, at 白鶴渡. */
function zhuji(seed) {
  const s = fresh(seed);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 2, stage: 0, hp: 9999 });
  return s;
}

test('the first time over: 第一章 ends, the ending screen comes up, and once it is closed the boat puts in at 鶴歸渡', () => {
  const s = zhuji(201);
  s.flags.crane_friend = true;
  try {
    atPier(s, 'ferry_pier', 'ferry_cross');
    pickText(s, '踏上中州');
    assert.doesNotMatch(s.pending.result.text, /推演中/, 'no more 「中州地圖尚在推演中」');
    finish(s);
    assert.ok(s.flags.chapter1_done && s.flags.chapter1_ending && s.flags.zhongzhou_crossed);
    assert.equal(s.world.cross, 'crane_ferry', 'the boat is on the river while the ending is shown');
    assert.equal(s.world.map, 'donghuang');
    // the UI closes the ending (app.js endingScreen) — and the world goes on
    delete s.flags.chapter1_ending;
    const day = s.day;
    const tod = s.tod;
    tick(s);
    assert.equal(s.world.map, 'zhongzhou', 'over the river');
    assert.ok((s.day - day) * 24 + (s.tod - tod) >= CROSSINGS.crane_ferry.hours - 0.01, 'half a day on the water');
    assert.equal(s.player.loc, 'heguidu');
    assert.equal(s.pending?.id, 'hg_arrive', 'the far bank says what it is like');
    assert.match(s.pending.text, /鶴歸/);
    assert.match(s.pending.text, /白鶴/, 'the crane came along');
    finish(s);
    assert.ok(s.flags.crane_in_zhongzhou);
    assert.ok(s.nodes.linjiang?.known, 'the city wall is in sight: 臨江城 is on the map');
    assert.equal(nextGoal(s)?.key, 'zz:city');
    // a save made over here comes back over here
    const back = parseSave(serialize(s));
    assert.equal(back.world.map, 'zhongzhou');
    assert.equal(back.player.loc, 'heguidu');
    // and home again, whenever you like
    atPier(s, 'hg_pier', 'hg_cross');
    pickText(s, '回東荒');
    finish(s);
    tick(s);
    assert.equal(s.world.map, 'donghuang');
    assert.equal(s.player.loc, 'crane_ferry');
    resolvePending(s);
    // and over again: no second ending
    atPier(s, 'ferry_pier', 'ferry_again');
    pickText(s, '過江');
    finish(s);
    assert.ok(!s.flags.chapter1_ending);
    tick(s);
    assert.equal(s.world.map, 'zhongzhou');
    assert.equal(s.player.loc, 'heguidu');
  } finally {
    useMap('donghuang');
  }
});

test('a save that saw the ending before 1.0 (sent back from mid-river) is taken over now, and its goal says so', () => {
  const s = zhuji(202);
  s.flags.chapter1_done = true;
  try {
    assert.equal(nextGoal(s)?.key, 'ferry');
    assert.match(nextGoal(s).text, /中州/);
    atPier(s, 'ferry_pier', 'ferry_again');
    assert.match(s.pending.text, /推演完成/);
    assert.match(s.pending.text, /它也沒跑/);
    pickText(s, '過江');
    finish(s);
    assert.ok(!s.flags.chapter1_ending, 'the ending was seen already');
    tick(s);
    assert.equal(s.world.map, 'zhongzhou');
    finish(s);
    assert.notEqual(nextGoal(s)?.key, 'ferry');
  } finally {
    useMap('donghuang');
  }
});

test('below 築基: the ferryman will not take you, 劉家\'s night barge will — and the river may not let you by', () => {
  const seen = { ok: 0, fail: 0 };
  try {
    for (let seed = 300; seed < 340 && (!seen.ok || !seen.fail); seed++) {
      const s = fresh(seed);
      s.flags.opening_done = true;
      Object.assign(s.player, { realm: 1, stage: 5, ls: 30 });
      atPier(s, 'ferry_pier', 'ferry_wait');
      assert.ok(!EVENTS.ferry_cross.cond(s) && !EVENTS.ferry_again.cond(s), 'no ferry for 煉氣');
      pickText(s, '劉家的貨船');
      const ok = s.pending.result.check.ok;
      finish(s);
      assert.equal(s.player.ls, 20, 'ten stones to the barge master, either way');
      if (ok) {
        seen.ok++;
        assert.ok(s.flags.chapter1_done && s.flags.chapter1_ending && s.flags.zz_smuggled, 'over by the barge: 第一章 is done all the same');
        delete s.flags.chapter1_ending;
        tick(s);
        assert.equal(s.world.map, 'zhongzhou');
        assert.match(s.pending?.text || '', /貨船/, 'the barge put you ashore');
        finish(s);
        // the way home does not ask your realm
        atPier(s, 'hg_pier', 'hg_cross');
        assert.match(s.pending.text, /往回走/);
        pickText(s, '回東荒');
        finish(s);
        tick(s);
        assert.equal(s.world.map, 'donghuang');
      } else {
        seen.fail++;
        assert.ok(!s.flags.chapter1_done && !s.world.cross, 'thrown back on 東荒\'s bank');
        assert.equal(s.world.map, 'donghuang');
      }
      useMap('donghuang');
    }
  } finally {
    useMap('donghuang');
  }
  assert.ok(seen.ok && seen.fail, `both ways it can go (${seen.ok} over, ${seen.fail} thrown back)`);
});

test('the ways over: each way lands on open ground at the pier of the other bank', () => {
  for (const [from, way] of Object.entries(CROSSINGS)) {
    if (!['crane_ferry', 'heguidu'].includes(from)) continue;
    useMap(way.to);
    try {
      const at = NODES[from === 'crane_ferry' ? 'heguidu' : 'crane_ferry'].at;
      assert.ok(Math.hypot(way.at[0] - at[0], way.at[1] - at[1]) < 200, `${from} puts you in by the pier`);
    } finally {
      useMap('donghuang');
    }
  }
});
