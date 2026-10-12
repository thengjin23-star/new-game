// 世界大事: the calendar of what is coming, a 獸潮 on 青石鎮, a treasure out
// of the sky.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { happenings, tideNight, tideTonight, omensOf, omenAt, OMEN_SPOTS, whenWord } from '../src/world/happenings.js';
import { advance, newReport } from '../src/core/time.js';
import { dayAt, DAYS_PER_YEAR } from '../src/core/calendar.js';
import { POI_BY_ID } from '../src/world/places.js';
import { isReachable, regionIdAt } from '../src/world/terrain.js';
import { fresh, resolvePending } from './helpers.js';

test('the calendar: what is coming, soonest first, and what is going on now', () => {
  const s = fresh(1);
  s.day = dayAt(1, 7, 20);
  const list = happenings(s, 200);
  const names = list.map((x) => x.name);
  for (const n of ['靈潮', '鏡湖水府開啟', '聚寶閣拍賣會']) assert.ok(names.includes(n), `${n} is coming (${names.join('、')})`);
  for (let k = 1; k < list.length; k++) assert.ok(list[k].from >= list[k - 1].from, 'soonest first');
  s.day = dayAt(1, 8, 15);
  const now = happenings(s).find((x) => x.name === '鏡湖水府開啟');
  assert.equal(whenWord(s, now), '正在進行');
});

test('a 獸潮: most years have one; the signs come five days before, then the night', () => {
  const s = fresh(2);
  let years = 0;
  for (let y = 1; y < 21; y++) if (tideNight(s, y) !== null) years++;
  assert.ok(years >= 8 && years <= 19, `most years (${years} of 20)`);
  assert.equal(tideNight(s, 0), null, 'not in the first year');
  let y = 1;
  while (tideNight(s, y) === null) y++;
  const n = tideNight(s, y);
  s.day = n - 10;
  advance(s, 6, 'active', newReport());
  assert.ok(s.rumors.some((r) => r.text.includes('獸潮')), 'the signs');
  assert.ok(happenings(s).some((x) => x.name === '獸潮'), 'on the calendar now');
  // in 青石鎮 that night
  s.day = n;
  s.tod = 21;
  assert.equal(tideTonight(s), y);
  E.placeAt(s, 2300, 3150);
  resolvePending(s, (opts) => opts[0], 'won');
  assert.equal(s.vars.tideFought, y, 'fought');
  assert.ok(s.log.some((l) => l.text.includes('獸潮')));
});

test('a treasure out of the sky: it shows where it fell, for a few days; fight for it and it is yours', () => {
  const s = fresh(3);
  Object.assign(s.player, { realm: 1, stage: 4 });
  for (const id of OMEN_SPOTS) {
    const p = POI_BY_ID[id];
    assert.ok(p && isReachable(p.x, p.y) && regionIdAt(p.x, p.y) === p.region, `${id} stands somewhere you can walk`);
  }
  const o = omensOf(s, 1)[0];
  assert.ok(o);
  s.day = o.day - 1;
  assert.equal(omenAt(s, o.spot), null, 'not before it falls');
  s.day = o.day;
  assert.ok(omenAt(s, o.spot));
  assert.ok(happenings(s).some((x) => x.name === '異寶出世'));
  const p = POI_BY_ID[o.spot];
  E.placeAt(s, p.x, p.y + 20);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: o.spot, x: p.x, y: p.y, reach: 70 });
  assert.equal(s.pending?.id, 'world_omen');
  const ls = s.player.ls;
  const items = Object.values(s.player.items).reduce((a, b) => a + b, 0);
  resolvePending(s, (opts) => opts[0], 'won');
  assert.ok(s.player.ls > ls || Object.values(s.player.items).reduce((a, b) => a + b, 0) > items, 'something to show for it');
  assert.equal(omenAt(s, o.spot), null, 'gone');
  // and they last only a few days
  const q = omensOf(s, 2)[0];
  s.day = q.day + 6;
  assert.equal(omenAt(s, q.spot), null);
  assert.ok(omensOf(s, 3).length <= 3 && omensOf(s, 3).every((x) => Math.floor(x.day / DAYS_PER_YEAR) === 3));
});
