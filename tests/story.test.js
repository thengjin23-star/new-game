// The time-windowed story beats, walked through on purpose
// (random play rarely lands inside their windows).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, rollFate } from '../src/core/state.js';
import { startEvent, choose, continueEvent } from '../src/core/events.js';
import * as A from '../src/core/actions.js';
import { advance, newReport } from '../src/core/time.js';
import { WINDOWS } from '../src/world/arcs.js';
import { dayAt } from '../src/core/calendar.js';

function fresh(seed = 21) {
  const s = newGame({ name: '測試', gender: '女', origin: 'farmer', fate: rollFate(seed), seed });
  startEvent(s, 'intro_fall');
  while (s.pending) {
    if (s.pending.result || s.pending.notice) continueEvent(s);
    else choose(s, s.pending.choices[0].i);
  }
  s.player.realm = 1;
  s.player.stage = 4;
  return s;
}

/** Jump the calendar forward like a long seclusion would. */
function waitUntil(s, day) {
  advance(s, day - s.day, 'seclusion', newReport());
}

function pickText(s, text) {
  const c = s.pending.choices.find((x) => x.text.includes(text));
  assert.ok(c, `choice "${text}" in ${s.pending.id}.${s.pending.step}: ${s.pending.choices.map((x) => x.text).join(' / ')}`);
  choose(s, c.i);
}

function finish(s) {
  let guard = 0;
  while (s.pending && guard++ < 50) {
    if (s.pending.result || s.pending.notice) continueEvent(s);
    else choose(s, s.pending.choices.find((c) => !c.disabled).i);
  }
}

test('the broken engagement happens in 青石鎮 in the second month', () => {
  const s = fresh();
  waitUntil(s, WINDOWS.breakup[0]);
  A.travel(s, 'qingshi_town');
  const seen = [];
  while (s.pending) {
    seen.push(s.pending.id);
    if (s.pending.id === 'town_breakup' && !s.pending.result) pickText(s, '公道話');
    else if (s.pending.result || s.pending.notice) continueEvent(s);
    else choose(s, s.pending.choices[0].i);
  }
  if (!seen.includes('town_breakup')) {
    A.explore(s);
    assert.equal(s.pending.id, 'town_breakup');
    pickText(s, '公道話');
    finish(s);
  }
  assert.ok(s.flags.lin_defended);
  assert.ok(s.npcs.lin_chen.favor >= 30);
});

test('the auction opens every autumn at the market', () => {
  const s = fresh();
  s.player.loc = 'luoxia_market';
  s.player.ls = 600;
  waitUntil(s, dayAt(0, 10, 11));
  assert.equal(s.flags.auction_open, true);
  A.explore(s);
  assert.equal(s.pending.id, 'market_auction');
  pickText(s, '五百');
  finish(s);
  assert.equal(s.player.items.zhuji_pill, 1);
});

test('the secret realm opens in year three and can be walked to the end', () => {
  const s = fresh();
  s.nodes.ancient_ruins.known = true;
  s.nodes.black_forest.known = true;
  s.player.loc = 'black_forest';
  waitUntil(s, WINDOWS.realm[0] + 1);
  assert.equal(s.flags.realm_open, true);
  A.travel(s, 'ancient_ruins');
  while (s.pending && s.pending.id !== 'ruins_realm') continueEvent(s) || (s.pending && !s.pending.result && !s.pending.notice && choose(s, 0));
  if (!s.pending) A.explore(s);
  assert.equal(s.pending.id, 'ruins_realm');
  pickText(s, '跟著人群');
  continueEvent(s);
  pickText(s, '往右');
  continueEvent(s);
  finish(s);
  assert.ok(s.flags.realm_entered);
});

test('a friend of 林塵 gets a farewell gift before he leaves for 中州', () => {
  const s = fresh();
  s.npcs.lin_chen.favor = 40;
  waitUntil(s, dayAt(4, 3) + 6);
  assert.ok(!s.npcs.lin_chen.loc, 'he has left');
  A.explore(s);
  assert.equal(s.pending.id, 'lin_farewell');
  finish(s);
  assert.equal(s.player.items.zhuji_pill, 1);
  assert.ok(s.flags.lin_advice);
});

test('saving 松鶴 with a longevity fruit leads to his second attempt', () => {
  const s = fresh();
  s.player.items.longevity_fruit = 1;
  waitUntil(s, 1000);
  s.player.loc = 'qingxu_temple';
  A.visit(s, 'song_he');
  assert.equal(s.pending.id, 'temple_lesson');
  pickText(s, '壽元果');
  finish(s);
  assert.ok(s.flags.songhe_saved);
  waitUntil(s, s.sched.find((x) => x.ev === 'songhe_retry').due);
  A.explore(s);
  assert.equal(s.pending.id, 'songhe_retry');
  finish(s);
  assert.ok(s.flags.songhe_zhuji || s.flags.songhe_dead);
});

test('sect recruitment shows 林塵 awakening his thunder root', () => {
  const s = fresh();
  s.nodes.qingyun_sect.known = true;
  s.player.loc = 'luoxia_market';
  waitUntil(s, WINDOWS.recruit[0] + 2);
  A.travel(s, 'qingyun_sect');
  while (s.pending && s.pending.id !== 'sect_recruit') {
    if (s.pending.result || s.pending.notice) continueEvent(s);
    else choose(s, s.pending.choices[0].i);
  }
  if (!s.pending) A.explore(s);
  assert.equal(s.pending.id, 'sect_recruit');
  pickText(s, '排隊測試');
  continueEvent(s);
  choose(s, s.pending.choices[0].i);
  continueEvent(s);
  assert.equal(s.pending.step, 'lin');
  assert.match(s.pending.text, /雷靈根/);
  finish(s);
  assert.ok(s.flags.recruit_attended);
});

test('the three-year pact can be witnessed', () => {
  const s = fresh();
  s.player.loc = 'qingshi_town';
  s.seen.town_return = { n: 1, last: 0 };
  waitUntil(s, WINDOWS.pact[0] + 1);
  A.explore(s);
  assert.equal(s.pending.id, 'town_lin_pact');
  finish(s);
  assert.ok(s.flags.pact_seen);
});
