// 青雲宗 for its own: rank and 貢獻, the 任務堂's work, the 寶庫, the 月例,
// the 御劍訣, and the yearly 大比.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as SECT from '../src/world/sect.js';
import { flyMeans } from '../src/world/air.js';
import { startEvent } from '../src/core/events.js';
import { advance, newReport } from '../src/core/time.js';
import { dayAt } from '../src/core/calendar.js';
import { applyEffects } from '../src/core/effects.js';
import { fresh, resolvePending, goToPoi } from './helpers.js';

function disciple(seed, rank = 1) {
  const s = fresh(seed);
  s.flags.sect_member = true;
  s.vars.sectRank = rank;
  return s;
}

test('rank: read from how you came in, raised by 貢獻 earned and cultivation', () => {
  const s = fresh(1);
  assert.equal(SECT.rankOf(s), -1);
  s.flags.sect_member = true;
  s.flags.sect_servant = true;
  assert.equal(SECT.rankName(s), '雜役弟子');
  assert.ok(SECT.nextRank(s).why, 'not yet');
  assert.equal(SECT.promote(s), null);
  applyEffects(s, [['gx', 120]], {}, newReport());
  Object.assign(s.player, { realm: 1, stage: 1 });
  assert.equal(SECT.nextRank(s).why, null);
  const report = SECT.promote(s);
  assert.ok(report);
  assert.equal(SECT.rankName(s), '外門弟子');
  assert.ok(!s.flags.sect_servant);
  assert.ok(s.player.techs.includes('qingyun'), 'the 外門 learn the sect\'s 心法');
  // spending 貢獻 does not undo what you earned
  s.vars.contribution = 0;
  assert.equal(SECT.gxOf(s).total, 120);
});

test('the 寶庫: 貢獻 buys things, some only from 內門 up', () => {
  const s = disciple(2, 1);
  applyEffects(s, [['gx', 800]], {}, newReport());
  assert.ok(SECT.exchange(s, 'juqi_pill'));
  assert.equal(s.player.items.juqi_pill, 1);
  assert.equal(SECT.gxOf(s).now, 780);
  assert.ok(!SECT.exchange(s, 'zhuji_pill'), '築基丹 is for the 內門');
  s.vars.sectRank = 2;
  assert.ok(SECT.exchange(s, 'zhuji_pill'));
  assert.equal(s.player.items.zhuji_pill, 1);
  assert.ok(!SECT.exchange(s, 'zhuji_pill'), 'not without the 貢獻');
});

test('the 月例 comes each month, by rank', () => {
  const s = disciple(3, 2);
  s.day = dayAt(0, 2, 25);
  const ls = s.player.ls;
  const pills = s.player.items.juqi_pill || 0;
  advance(s, 10, 'active', newReport());
  assert.equal(s.player.ls, ls + SECT.RANKS[2].pay);
  assert.equal(s.player.items.juqi_pill, pills + SECT.RANKS[2].pills);
});

test('the 御劍訣: a sword flown from 煉氣七層', () => {
  const s = disciple(4, 2);
  Object.assign(s.player, { realm: 1, stage: 6 });
  s.player.items.qinggang_sword = 1;
  s.player.weapon = 'qinggang_sword';
  assert.notEqual(flyMeans(s).by, 'sword');
  s.player.items.book_yujian = 1;
  applyEffects(s, [['tech', 'yujian']], {}, newReport());
  assert.equal(flyMeans(s).by, 'sword');
  s.player.stage = 5;
  assert.notEqual(flyMeans(s).by, 'sword', 'not below 七層');
});

test('the 大比: once a year, three rounds; win them all and you are 魁首', () => {
  const s = disciple(5, 1);
  Object.assign(s.player, { realm: 1, stage: 4 });
  s.day = dayAt(0, 6, 3);
  advance(s, 1, 'active', newReport());
  assert.ok(s.flags.tourney_open);
  goToPoi(s, 'sect_task_hall');
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'sect_task_hall', x: 4200, y: 1120, reach: 70 });
  assert.equal(s.pending?.id, 'sect_tourney');
  const gx = SECT.gxOf(s).total;
  resolvePending(s, (opts) => opts.find((c) => c.text.includes('報名')) || opts[0], 'won');
  assert.ok(s.flags.tourney_champion);
  assert.ok(SECT.gxOf(s).total >= gx + 240);
  // not twice in a year
  E.takeSignals(s);
  E.interact(s, { kind: 'poi', id: 'sect_task_hall', x: 4200, y: 1120, reach: 70 });
  assert.notEqual(s.pending?.id, 'sect_tourney');
  // lose the first round: a little for trying, and that is this year
  const t = disciple(6, 1);
  t.day = dayAt(0, 6, 3);
  advance(t, 1, 'active', newReport());
  startEvent(t, 'sect_tourney');
  resolvePending(t, (opts) => opts.find((c) => c.text.includes('報名')) || opts[0], 'lost');
  assert.ok(!t.flags.tourney_champion);
  assert.equal(t.vars.tourneyYear, 0);
});
