import test from 'node:test';
import assert from 'node:assert/strict';
import { nextGoal, coachFor, COACH } from '../src/world/guide.js';
import { FEATS, checkFeats } from '../src/world/feats.js';
import { BEAST_NOTES, NOT_IN_BOOK } from '../src/content/codex.js';
import { GUIDE } from '../src/content/guide.js';
import { FOES } from '../src/content/foes.js';
import { weatherAt } from '../src/world/weather.js';
import { newGame, rollFate } from '../src/core/state.js';
import { migrate } from '../src/core/save.js';
import { fresh } from './helpers.js';

test('the goal line: nothing while the opening leads, then what to do next', () => {
  const s = fresh();
  s.flags.opening_done = false;
  assert.equal(nextGoal(s), null);
  s.flags.opening_done = true;
  s.player.realm = 0;
  s.player.xw = 0;
  let g = nextGoal(s);
  assert.equal(g.key, 'secl0', 'a mortal: sit and gather 修為');
  s.player.xw = 99999;
  g = nextGoal(s);
  assert.equal(g.key, 'qi', 'enough: draw in the qi');
  s.player.realm = 1;
  s.player.stage = 0;
  s.player.xw = 0;
  s.player.injury = 1;
  assert.equal(nextGoal(s).key, 'hurt');
  s.player.injury = 0;
  s.player.hp = 9999;
  g = nextGoal(s);
  assert.ok(g && g.text && g.why, 'there is always something to suggest');
  // in seclusion, no goal line
  s.secl = { node: 'qingxu_temple', days: 30, done: 0, start: 0, msPerDay: 3000, xw: 0 };
  assert.equal(nextGoal(s), null);
});

test('the pointers: each once, only when it applies', () => {
  const s = fresh();
  s.flags.opening_done = true;
  const seen = {};
  const c = coachFor(s, { act: true }, seen);
  assert.equal(c.id, 'act');
  seen.act = true;
  assert.notEqual(coachFor(s, { act: true }, seen)?.id, 'act');
  assert.equal(coachFor(s, { cbtReady: true }, seen)?.id, 'fight');
  s.pending = { id: 'x' };
  assert.equal(coachFor(s, { cbtReady: true }, {}), null, 'never over a story');
  for (const k of COACH) assert.ok(k.text && k.at && typeof k.when === 'function');
});

test('成就: earned once, kept with the day; an old save catches up quietly', () => {
  const s = fresh();
  delete s.vars.feats;
  s.player.realm = 1;
  assert.deepEqual(checkFeats(s), [], 'the first look says nothing');
  assert.ok(s.vars.feats.qi !== undefined, 'but keeps what was already earned');
  s.flags.sect_member = true;
  const got = checkFeats(s).map((f) => f.id);
  assert.ok(got.includes('sect'));
  assert.deepEqual(checkFeats(s), [], 'and never twice');
  const ids = new Set();
  for (const f of FEATS) {
    assert.ok(!ids.has(f.id));
    ids.add(f.id);
    assert.ok(f.name && f.desc);
  }
});

test('圖鑑: every foe you can meet has its notes; the guide has its topics', () => {
  for (const k of Object.keys(FOES)) {
    if (NOT_IN_BOOK.has(k)) continue;
    assert.ok(BEAST_NOTES[k]?.note, `${k} has a note`);
  }
  assert.ok(GUIDE.length >= 8);
  for (const g of GUIDE) assert.ok(g.title && g.text.length > 20);
});

test('a life opens on fair days', () => {
  for (let seed = 1; seed < 60; seed++) {
    const s = migrate(newGame({ name: 't', gender: '男', origin: 'farmer', fate: rollFate(seed), seed }));
    for (let hour = 0; hour < 72; hour += 3) assert.equal(weatherAt(s, 'qingshi_town', hour), 'clear');
  }
});
