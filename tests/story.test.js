// The time-windowed story beats, walked through on purpose in the world
// (random play rarely lands inside their windows).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choose, continueEvent } from '../src/core/events.js';
import * as A from '../src/core/actions.js';
import * as E from '../src/world/explore.js';
import { WINDOWS } from '../src/world/arcs.js';
import { dayAt } from '../src/core/calendar.js';
import { POI_BY_ID } from '../src/world/places.js';
import { fresh as born, resolvePending, waitUntil, goTo, goToPoi, pickText, finish } from './helpers.js';

function fresh(seed = 21) {
  const s = born(seed);
  s.player.realm = 1;
  s.player.stage = 4;
  return s;
}

/** Walk up to a place and press the button. */
function useAt(s, poi) {
  goToPoi(s, poi);
  if (s.pending) return;
  const t = E.targetsNear(s, 200).find((x) => x.kind === 'poi' && x.id === poi);
  assert.ok(t, `${poi} is there to use`);
  E.interact(s, t);
}

test('the broken engagement happens at the 林家 gate in the second month', () => {
  const s = fresh();
  waitUntil(s, WINDOWS.breakup[0]);
  goTo(s, 'qingshi_town');
  assert.equal(s.pending?.id, 'town_return', '王二 first');
  resolvePending(s);
  assert.ok(POI_BY_ID.lin_gate.crowd(s), 'a crowd at the gate');
  goToPoi(s, 'lin_gate');
  assert.equal(s.pending?.id, 'town_breakup');
  pickText(s, '公道話');
  finish(s);
  assert.ok(s.flags.lin_defended);
  assert.ok(s.npcs.lin_chen.favor >= 30);
});

test('the auction opens every autumn at the market', () => {
  const s = fresh();
  s.player.ls = 600;
  goTo(s, 'luoxia_market');
  resolvePending(s);
  waitUntil(s, dayAt(0, 10, 11));
  assert.equal(s.flags.auction_open, true);
  useAt(s, 'auction_house');
  assert.equal(s.pending?.id, 'market_auction');
  pickText(s, '五百');
  finish(s);
  assert.equal(s.player.items.zhuji_pill, 1);
});

test('the secret realm opens in year three and can be walked to the end', () => {
  const s = fresh();
  waitUntil(s, WINDOWS.realm[0] + 1);
  assert.equal(s.flags.realm_open, true);
  goTo(s, 'ancient_ruins');
  resolvePending(s);
  goToPoi(s, 'realm_gate');
  assert.equal(s.pending?.id, 'ruins_realm');
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
  E.search(s);
  assert.equal(s.pending?.id, 'lin_farewell');
  finish(s);
  assert.equal(s.player.items.zhuji_pill, 1);
  assert.ok(s.flags.lin_advice);
});

test('saving 松鶴 with a longevity fruit leads to his second attempt', () => {
  const s = fresh();
  s.player.items.longevity_fruit = 1;
  waitUntil(s, 1000);
  A.visit(s, 'song_he');
  assert.equal(s.pending?.id, 'temple_lesson');
  pickText(s, '壽元果');
  finish(s);
  assert.ok(s.flags.songhe_saved);
  waitUntil(s, s.sched.find((x) => x.ev === 'songhe_retry').due);
  E.rest(s, 2);
  assert.equal(s.pending?.id, 'songhe_retry');
  finish(s);
  assert.ok(s.flags.songhe_zhuji || s.flags.songhe_dead);
});

test('sect recruitment shows 林塵 awakening his thunder root', () => {
  const s = fresh();
  waitUntil(s, WINDOWS.recruit[0] + 2);
  goTo(s, 'qingyun_sect');
  resolvePending(s);
  goToPoi(s, 'sect_gate');
  assert.equal(s.pending?.id, 'sect_recruit');
  pickText(s, '排隊測試');
  continueEvent(s);
  choose(s, s.pending.choices[0].i);
  continueEvent(s);
  assert.equal(s.pending.step, 'lin');
  assert.match(s.pending.text, /雷靈根/);
  finish(s);
  assert.ok(s.flags.recruit_attended);
});

test('the three-year pact can be witnessed at the 沈家 gate', () => {
  const s = fresh();
  s.seen.town_return = { n: 1, last: 0 };
  waitUntil(s, WINDOWS.pact[0] + 1);
  goTo(s, 'qingshi_town');
  resolvePending(s);
  goToPoi(s, 'shen_gate');
  assert.equal(s.pending?.id, 'town_lin_pact');
  finish(s);
  assert.ok(s.flags.pact_seen);
});

test('the hidden cave: hear of it, find the tree, open the door', () => {
  const s = fresh();
  s.flags.cave_hint = true;
  goTo(s, 'qingshi_hill');
  resolvePending(s);
  goToPoi(s, 'cave_entrance', 40);
  resolvePending(s);
  assert.ok('cave_entrance' in s.world.found, 'with the hint, the crack in the rock is noticed');
  useAt(s, 'cave_entrance');
  assert.equal(s.pending?.id, 'hill_cave');
  pickText(s, '推門');
  continueEvent(s);
  pickText(s, '安葬');
  finish(s);
  assert.ok(s.flags.cave_found);
  goToPoi(s, 'cave_entrance', 14);
  assert.equal(s.player.loc, 'hidden_cave', 'standing at the door is standing in the cave');
  assert.equal(A.seclusionBlocker(s), null, 'and it is a fine place to sit');
});
