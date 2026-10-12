// 秘境: when they open, and going down through one, room by room.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { SECRET_REALMS, realmOpen, realmDone, runOf } from '../src/world/realms.js';
import { startEvent, choose } from '../src/core/events.js';
import { advance, newReport } from '../src/core/time.js';
import { dayAt } from '../src/core/calendar.js';
import { serialize, parseSave } from '../src/core/save.js';
import { POI_BY_ID } from '../src/world/places.js';
import { EVENTS } from '../src/content/index.js';
import { fresh, resolvePending, goToPoi } from './helpers.js';

test('when they open: the old battlefield every third year from the sixth, the lake each 中秋', () => {
  const s = fresh(1);
  assert.equal(realmOpen(s, 'ruins', dayAt(2, 1, 5)), null, 'the story has the second year\'s opening');
  assert.equal(realmOpen(s, 'ruins', dayAt(5, 1, 5)), 5);
  assert.equal(realmOpen(s, 'ruins', dayAt(5, 2, 5)), null, 'a month only');
  assert.equal(realmOpen(s, 'ruins', dayAt(8, 1, 20)), 8);
  assert.equal(realmOpen(s, 'ruins', dayAt(6, 1, 20)), null);
  assert.equal(realmOpen(s, 'lake', dayAt(0, 8, 15)), 0);
  assert.equal(realmOpen(s, 'lake', dayAt(3, 8, 13)), null);
  assert.equal(SECRET_REALMS.lake.next(dayAt(1, 8, 20)), dayAt(2, 8, 14));
  assert.equal(SECRET_REALMS.ruins.next(dayAt(0, 3, 1)), dayAt(5, 1, 1));
  for (const R of Object.values(SECRET_REALMS)) {
    assert.ok(POI_BY_ID[R.poi]?.region === R.region, `${R.name}: its door`);
    assert.ok(EVENTS[R.event], `${R.name}: its event`);
  }
});

test('word goes round a week before a 秘境 opens', () => {
  const s = fresh(2);
  s.day = dayAt(0, 8, 1);
  advance(s, 10, 'active', newReport());
  assert.ok(s.rumors.some((r) => r.text.includes('水府')));
});

test('going down the lake\'s 水府: rooms, then the guardian, then out — once each opening', () => {
  const s = fresh(3);
  Object.assign(s.player, { realm: 1, stage: 6 });
  s.player.attrs.wuxing = 10;
  s.player.attrs.jiyuan = 10;
  s.player.attrs.xinxing = 10;
  s.day = dayAt(0, 8, 15);
  goToPoi(s, 'lake_pavilion');
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'lake_pavilion', ...POI_BY_ID.lake_pavilion, reach: 70 });
  assert.equal(s.pending?.id, 'realm_lake');
  const items = Object.values(s.player.items).reduce((a, b) => a + b, 0);
  const ls = s.player.ls;
  const seen = [];
  resolvePending(s, (opts) => {
    seen.push(s.pending.step);
    return opts.find((c) => /進去|往深處|迎上去|解開|打開|動手|歇一歇|拚了/.test(c.text)) || opts[0];
  }, 'won');
  assert.ok(seen.includes('boss'), `down to the guardian (${seen.join(' → ')})`);
  assert.equal(runOf(s), null, 'out again');
  assert.ok(realmDone(s, 'lake'), 'once this opening');
  assert.ok(s.player.ls > ls + 100, 'the hoard');
  assert.ok(Object.values(s.player.items).reduce((a, b) => a + b, 0) > items);
  E.interact(s, { kind: 'poi', id: 'lake_pavilion', ...POI_BY_ID.lake_pavilion, reach: 70 });
  assert.notEqual(s.pending?.id, 'realm_lake', 'not twice');
  // next year, again
  s.day = dayAt(1, 8, 15);
  assert.ok(!realmDone(s, 'lake'));
});

test('the rooms are the opening\'s: a reload does not change the way down; leave when you like', () => {
  const s = fresh(4);
  Object.assign(s.player, { realm: 1, stage: 6 });
  s.day = dayAt(5, 1, 10);
  startEvent(s, 'realm_ruins');
  choose(s, s.pending.choices.find((c) => c.text.includes('進去')).i);
  const first = s.pending.result.next;
  const t = parseSave(serialize(s));
  assert.equal(runOf(t).realm, 'ruins');
  const u = fresh(4);
  Object.assign(u.player, { realm: 1, stage: 6 });
  u.day = dayAt(5, 1, 10);
  startEvent(u, 'realm_ruins');
  choose(u, u.pending.choices.find((c) => c.text.includes('進去')).i);
  assert.equal(u.pending.result.next, first, 'the same first room');
  // walk out at the first chance
  resolvePending(s, (opts) => opts.find((c) => /出秘境|退出去|改天|不碰|繞過去/.test(c.text)) || opts[0], 'won');
  assert.equal(runOf(s), null);
  assert.ok(realmDone(s, 'ruins'));
});
