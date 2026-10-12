// 勢力 and the boards of work: standing with 落霞坊市, 青雲宗 and 黑風寨, what
// it does (prices, a greeting, a blade), and the 懸賞榜 and 任務堂.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import * as A from '../src/core/actions.js';
import * as Q from '../src/world/quests.js';
import { FACTIONS, repOf, addRep, standing, priceShare } from '../src/world/factions.js';
import { startEvent } from '../src/core/events.js';
import { newReport } from '../src/core/time.js';
import { serialize, parseSave } from '../src/core/save.js';
import { POI_BY_ID } from '../src/world/places.js';
import { ITEMS } from '../src/content/items.js';
import { FOES } from '../src/content/foes.js';
import { fresh, resolvePending, goToPoi } from './helpers.js';

test('standing: tiers, kept in the save, and what the 坊市 charges by it', () => {
  const s = fresh(1);
  assert.equal(repOf(s, 'market'), 0);
  assert.equal(standing(s, 'market').name, '生面孔');
  assert.equal(priceShare(s), 1);
  const report = newReport();
  addRep(s, 'market', 30, report);
  assert.equal(standing(s, 'market').name, '熟客');
  assert.ok(report.toasts.some((t) => t.includes('熟客')), 'told when you go up a tier');
  assert.equal(priceShare(s), 0.95);
  goToPoi(s, 'talisman_stall');
  resolvePending(s);
  s.player.ls = 1000;
  const price = A.priceOf(s, 'fire_talisman');
  assert.ok(price < ITEMS.fire_talisman.price, 'cheaper for a regular');
  A.buy(s, 'fire_talisman');
  assert.equal(s.player.ls, 1000 - price);
  addRep(s, 'market', -100);
  assert.ok(A.priceOf(s, 'fire_talisman') > ITEMS.fire_talisman.price, 'dearer for one they frown on');
  const t = parseSave(serialize(s));
  assert.equal(repOf(t, 'market'), repOf(s, 'market'));
});

test('the 懸賞榜: the same work all through a posting, new work after; take up to three', () => {
  const s = fresh(2);
  const a = Q.postings(s, 'market');
  assert.equal(a.length, 3);
  assert.deepEqual(Q.postings(s, 'market').map((w) => w.key), a.map((w) => w.key), 'the same while it is up');
  s.day += Q.BOARDS.market.every;
  const b = Q.postings(s, 'market');
  assert.notDeepEqual(b.map((w) => w.key), a.map((w) => w.key), 'new work later');
  assert.ok(Q.take(s, 'market', b[0].key));
  assert.ok(!Q.take(s, 'market', b[0].key), 'not the same twice');
  assert.ok(Q.take(s, 'market', b[1].key));
  assert.ok(Q.take(s, 'market', b[2].key));
  s.day += Q.BOARDS.market.every;
  assert.ok(!Q.take(s, 'market', Q.postings(s, 'market')[0].key), 'three at most');
  assert.ok(Q.drop(s, b[2].key));
  assert.equal(Q.takenOf(s).length, 2);
});

test('bringing in what is asked: the things go, the pay and the standing come', () => {
  const s = fresh(3);
  // find a posting that asks for something brought
  let w = null;
  for (let k = 0; k < 40 && !w; k++) {
    w = Q.postings(s, 'market').find((x) => x.kind === 'bring');
    if (!w) s.day += Q.BOARDS.market.every;
  }
  assert.ok(w, 'some work asks for things');
  assert.ok(Q.take(s, 'market', w.key));
  assert.equal(Q.handIn(s, w.key), null, 'not before you have them');
  s.player.items[w.item] = w.n + 1;
  const ls = s.player.ls;
  const report = Q.handIn(s, w.key);
  assert.ok(report);
  assert.equal(s.player.items[w.item], 1, 'the things handed over');
  assert.equal(s.player.ls, ls + w.ls);
  assert.equal(repOf(s, 'market'), w.rep);
  assert.equal(Q.takenOf(s).length, 0);
  assert.ok(Q.wasTaken(s, w.key), 'gone from the board');
});

test('beating what is named: only what falls after you take the work counts', () => {
  const s = fresh(4);
  let w = null;
  for (let k = 0; k < 40 && !w; k++) {
    w = Q.postings(s, 'market').find((x) => x.kind === 'slay');
    if (!w) s.day += Q.BOARDS.market.every;
  }
  assert.ok(w);
  s.vars.kills = { [w.beasts[0]]: 10 };
  Q.take(s, 'market', w.key);
  const q = Q.takenOf(s)[0];
  assert.equal(Q.progress(s, q).have, 0, 'the ten before do not count');
  s.vars.kills[w.beasts[0]] += w.n;
  assert.ok(Q.progress(s, q).done);
  assert.ok(Q.askOf(w).includes(`×${w.n}`));
  assert.ok(Q.handIn(s, w.key));
});

test('the 任務堂 is for the sect\'s own; its work pays in 貢獻', () => {
  const s = fresh(5);
  assert.ok(Q.boardLock(s, 'sect'));
  assert.ok(!Q.take(s, 'sect', Q.postings(s, 'sect')[0].key));
  s.flags.sect_member = true;
  assert.equal(Q.boardLock(s, 'sect'), null);
  const w = Q.postings(s, 'sect')[0];
  assert.ok(Q.take(s, 'sect', w.key));
  if (w.kind === 'bring') s.player.items[w.item] = w.n;
  else s.vars.kills = { [w.beasts[0]]: w.n };
  const gx = s.vars.contribution || 0;
  assert.ok(Q.handIn(s, w.key));
  assert.equal(s.vars.contribution, gx + w.gx);
});

test('the boards stand where you can walk to them; a tap opens them', () => {
  const s = fresh(6);
  goToPoi(s, 'bounty_board');
  resolvePending(s);
  E.takeSignals(s);
  E.interact(s, { kind: 'poi', id: 'bounty_board', ...POI_BY_ID.bounty_board, reach: 70 });
  assert.ok(E.takeSignals(s).some((x) => x.open === 'board' && x.board === 'market'));
  for (const [id, B] of Object.entries(Q.BOARDS)) assert.equal(POI_BY_ID[B.poi]?.board, id);
  // every piece of work names real things
  for (const list of Object.values(Q.WORK)) {
    for (const w of list) {
      if (w.kind === 'bring') assert.ok(ITEMS[w.item], w.id);
      else for (const k of w.beasts) assert.ok(FOES[k], `${w.id}: ${k}`);
    }
  }
});

test('the 黑風寨: cut down their men and they remember; join them and they let you by', () => {
  const s = fresh(7);
  Object.assign(s.player, { realm: 1, stage: 3 });
  // joining
  startEvent(s, 'forest_bandits');
  const join = s.pending.choices.find((c) => c.text.includes('入夥'));
  assert.ok(join);
  resolvePending(s, (opts) => opts.find((c) => c.text.includes('入夥')) || opts[0]);
  assert.ok(repOf(s, 'bandits') >= 30, 'friends of the road');
  // the next time they stop you, you can say so
  delete s.flags.bandit_joined;
  startEvent(s, 'forest_bandits');
  assert.ok(s.pending.choices.some((c) => c.text.includes('道上的朋友') && !c.disabled));
  resolvePending(s, (opts) => opts.find((c) => c.text.includes('道上的朋友')) || opts[0]);
  // blood between you: they do not stop to talk
  addRep(s, 'bandits', -200);
  assert.equal(standing(s, 'bandits').name, '血仇');
  E.placeAt(s, 2120, 1760);
  resolvePending(s);
  for (let t = 0; t < 1; t += 1 / 30) E.step(s, 1 / 30, null);
  const men = CB.beastsInWorld(s, 2000).filter((b) => b.def.id === 'bandits_a');
  assert.ok(men.length && men.every((b) => !b.talker), 'no words this time');
});

test('joining the sect, the sect thinks better of you', () => {
  const s = fresh(8);
  s.player.root = { type: 'three', els: ['金', '木', '水'] };
  s.flags.recruit_open = true;
  startEvent(s, 'sect_recruit');
  resolvePending(s, (opts) => opts.find((c) => c.text.includes('排隊')) || opts.find((c) => c.text.includes('外門')) || opts[0]);
  assert.ok(s.flags.sect_member);
  assert.ok(repOf(s, 'sect') >= 30);
  assert.ok(Object.keys(FACTIONS).every((id) => standing(s, id).name));
});
