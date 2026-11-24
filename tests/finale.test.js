// 上玉指峰了結 (1.3「血月」): after the night, the 天梯 is open and 衛長庚 waits on the 觀星台 — past the beast that
// keeps the peak, past him, the finger: destroy it, seal it back for 天劍宗, take it, or give it to the court; 殘頁・指
// whichever. And what each leaves the world like: the small blood moons, 中州's 靈氣, 衛長庚's line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { REALMS } from '../src/core/cultivation.js';
import { continueEvent, choose, endRealFight } from '../src/core/events.js';
import { dateOf } from '../src/core/calendar.js';
import { useMap } from '../src/world/atlas.js';
import { nodeQi, nodesOn } from '../src/world/map.js';
import { regionIdAt, collides } from '../src/world/terrain.js';
import { CELL } from '../src/world/geo.js';
import { bloodMoon } from '../src/world/weather.js';
import { fateLine } from '../src/world/ending.js';
import { nextGoal } from '../src/world/guide.js';
import { FRAGMENTS } from '../src/content/fragments.js';
import { ITEMS } from '../src/content/items.js';
import { BEAST_NOTES } from '../src/content/codex.js';
import { BIG_BEASTS } from '../src/art/scenery.js';
import { DAYS_PER_YEAR } from '../src/core/calendar.js';
import * as N from '../src/world/night.js';
import { fresh, resolvePending, finish, waitUntil, pickText } from './helpers.js';

/** 金丹後期 in 天衍城, a few days after the night of the blood moon (seen from afar), in front of 欽天監. */
function afterTheNight(seed) {
  const s = fresh(seed);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 3, stage: 3, xw: REALMS[3].req[3], injury: 0, weapon: 'qinggang_sword', hp: 99999 });
  waitUntil(s, N.BLOOD_DAY - 8);
  resolvePending(s);
  Object.assign(s.flags, { chapter1_done: true, zhongzhou_crossed: true, night_warned: true });
  s.world.cross = 'crane_ferry';
  E.step(s, 0.05, null);
  finish(s);
  s.world.cross = 'guandao_guan';
  finish(s);
  E.step(s, 0.05, null);
  finish(s);
  assert.equal(s.world.map, 'tianyan');
  waitUntil(s, N.BLOOD_DAY + 3);
  s.sched = [];
  N.openNight(s, 'away');
  N.missNight(s, 'away');
  N.settle(s);
  s.pending = null;
  s.queue = [];
  E.placeAt(s, 2700, 1620);
  resolvePending(s);
  s.tod = 12;
  return s;
}

/** Past a card that says what you did (and on to whatever comes after it). */
function onward(s) {
  for (let k = 0; k < 5 && (s.pending?.result || s.pending?.notice); k++) continueEvent(s);
}

/** Up the 天梯 and on to the 觀星台; past the beast and the 監正 (both fights won): the finger is yours to see to. */
function upAndThrough(s) {
  E.interact(s, { kind: 'poi', id: 'qt_stair' });
  assert.equal(s.pending?.id, 'fz_stair');
  assert.match(s.pending.text, /監正在上面等你/);
  pickText(s, '爬上去');
  onward(s);
  assert.equal(s.pending?.id, 'fz_top');
  assert.equal(regionIdAt(s.world.x, s.world.y), 'yuzhi', 'on the top of the peak');
  pickText(s, '那根手指');
  assert.match(s.pending.result.text, /他斬的是手/);
  onward(s);
  pickText(s, '動手');
  // the fights won, every step taken — up to the finger
  for (let k = 0; k < 40 && (s.pending || s.rtFight) && s.pending?.step !== 'finger'; k++) {
    if (s.rtFight) endRealFight(s, 'won');
    else if (s.pending.result || s.pending.notice) continueEvent(s);
    else choose(s, s.pending.choices.find((c) => !c.disabled).i);
  }
  assert.equal(s.pending?.step, 'finger');
}

/** The full moons (the fifteenth of each month) from some day on: n of them. */
function fullMoons(from, n) {
  let d = from;
  while (dateOf(d).day !== 15) d++;
  return Array.from({ length: n }, (_, k) => d + k * 30);
}
/** How many of them are red. */
const red = (s, from, n) => fullMoons(from, n).filter((d) => bloodMoon(s, d)).length;

test('the top of 玉指峰 is big enough now for what waits on it (only that ground changed); the beast and the 監正 are in the 圖鑑 and drawn', () => {
  const s = fresh(801);
  useMap('tianyan');
  try {
    let open = 0;
    for (let y = 1000; y <= 1420; y += CELL) for (let x = 2440; x <= 2960; x += CELL) if (regionIdAt(x, y) === 'yuzhi' && !collides(s, x, y, 12)) open++;
    assert.ok(open >= 35, `room to fight on top (${open} cells)`);
  } finally {
    useMap('donghuang');
  }
  for (const k of ['xiezhi', 'wei_boss']) assert.ok(BEAST_NOTES[k]?.note, `${k}: a page in the 圖鑑`);
  assert.ok(BIG_BEASTS.has('xiezhi'));
  assert.ok(ITEMS.yuzhi && ITEMS.qintian_jinpai);
  assert.match(FRAGMENTS.frag_finger.text, /他斬的是那隻手/);
});

test('after the night: up the open 天梯 to the 觀星台 — the beast, then 衛長庚 — and the finger is yours: destroy it, and 中州\'s 靈氣 thins over five years; no more small blood moons; 殘頁・指', () => {
  const s = afterTheNight(802);
  try {
    // (before the finger is seen to, the small blood moons go on)
    assert.ok(red(s, s.day + 1, 60) > 0, 'small blood moons, still');
    const qi0 = nodeQi(s, 'linjiang');
    s.flags.ty_arrived = true;
    s.player.xw = 0;
    assert.equal(nextGoal(s)?.key, 'peak', 'the guide says where');
    assert.match(nextGoal(s).text, /衛長庚/);
    upAndThrough(s);
    assert.ok(s.flags.fz_beast_down && s.flags.wei_beaten);
    assert.match(s.pending.text, /你打算怎麼辦/);
    assert.deepEqual(s.pending.choices.map((c) => c.text), ['毀了它。', '封回去，交給天劍宗。', '帶走。', '交給皇朝。']);
    pickText(s, '毀了它');
    finish(s);
    assert.ok(s.flags.finger_done && s.flags.finger_destroyed);
    assert.notEqual(nextGoal(s)?.key, 'peak', 'and no more');
    assert.ok(s.sys.frags.includes('frag_finger'), '殘頁・指');
    assert.equal(s.npcs.wei_changgeng.loc, 'yuzhi', 'he stays, to watch it blow away');
    // no more small blood moons
    assert.equal(red(s, s.day + 1, 120), 0);
    // 中州's 靈氣, thinning: five years on, to 0.85
    assert.ok(Math.abs(nodeQi(s, 'linjiang') - qi0) < 1e-9, 'not at once');
    const later = { ...s, day: s.day + 5 * DAYS_PER_YEAR + 10 };
    for (const id of nodesOn('zhongzhou').slice(0, 5)) assert.ok(Math.abs(nodeQi(later, id) / nodeQi(s, id) - 0.85) < 1e-9, `${id}: 0.85`);
    assert.equal(nodeQi(later, 'qingshi_town'), nodeQi(s, 'qingshi_town'), '東荒 as it was');
    // 衛長庚's line
    s.sys.lv = 5;
    s.npcs.wei_changgeng.named = true;
    assert.match(fateLine(s, 'wei_changgeng') || '', /吹乾淨/);
    // the top after: as it was left
    E.interact(s, { kind: 'poi', id: 'yz_platform' });
    assert.equal(s.pending?.id, 'fz_after');
    assert.match(s.pending.text, /白色的灰/);
    finish(s);
  } finally {
    useMap('donghuang');
  }
});

test('the other three: sealed back (天劍宗 keeps it, 欽天監 is no more), taken (the 玉指 in your bag, the ink on you), given to the court (靈石, the gold plate, the small blood moons rarer)', () => {
  for (const [choice, check] of [
    ['封回去', (s) => {
      assert.ok(s.flags.finger_sealed && s.flags.qintian_disbanded && s.flags.tj_rule_done);
      assert.equal(red(s, s.day + 1, 120), 0, 'no more small blood moons');
    }],
    ['帶走', (s) => {
      assert.ok(s.flags.finger_taken);
      assert.equal(s.player.items.yuzhi, 1);
      assert.equal(red(s, s.day + 1, 120), 0);
    }],
    ['交給皇朝', (s) => {
      assert.ok(s.flags.finger_court);
      assert.equal(s.player.items.qintian_jinpai, 1);
      const moons = red(s, s.day + 1, 400);
      assert.ok(moons > 0 && moons < 400 * 0.25, `rarer, but they come (${moons} of 400)`);
    }],
  ]) {
    const s = afterTheNight(803);
    try {
      const ls = s.player.ls;
      upAndThrough(s);
      pickText(s, choice);
      finish(s);
      assert.ok(s.flags.finger_done && s.sys.frags.includes('frag_finger'), `${choice}: 殘頁・指`);
      check(s);
      if (choice === '交給皇朝') assert.equal(s.player.ls, ls + 5000);
    } finally {
      useMap('donghuang');
    }
  }
});

test('the climb can wait (no hurry, and no way round them): beaten by the beast, you are thrown down the 天梯 — and can go up again', () => {
  const s = afterTheNight(804);
  try {
    E.interact(s, { kind: 'poi', id: 'qt_stair' });
    pickText(s, '爬上去');
    onward(s);
    pickText(s, '動手');
    resolvePending(s, (o) => o[0], 'lost');
    assert.ok(!s.flags.fz_beast_down);
    assert.notEqual(regionIdAt(s.world.x, s.world.y), 'yuzhi', 'thrown down');
    assert.ok(!s.flags.finger_done);
    // and before the night, the top was as 1.2 had it (nothing of this)
    E.interact(s, { kind: 'poi', id: 'qt_stair' });
    assert.equal(s.pending?.id, 'fz_stair', 'up again, when you will');
    finish(s);
  } finally {
    useMap('donghuang');
  }
});
