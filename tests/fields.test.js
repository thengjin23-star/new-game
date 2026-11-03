// 東荒's fields and wilds, filled in (0.23): the 陳 family, and the letter
// carried home from the north; the scarecrow; the old 散修 in his hut; a land
// god's shrine and a sword's grave, found only by those who come close.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as A from '../src/core/actions.js';
import { startEvent } from '../src/core/events.js';
import { EVENTS } from '../src/content/index.js';
import { POI_BY_ID } from '../src/world/places.js';
import { NODES } from '../src/world/map.js';
import { nextGoal } from '../src/world/guide.js';
import { fresh, resolvePending, goToPoi, pickText } from './helpers.js';

/** Walk up to a place and see to it (whatever it starts, played out with the choice named). */
function at(s, id, pick = null) {
  goToPoi(s, id);
  resolvePending(s);
  E.step(s, 0.05, { x: 1, y: 0 });
  if (!s.pending) E.step(s, 0.05, { x: -1, y: 0 });
  resolvePending(s);
  E.interact(s, { kind: 'poi', id });
  if (pick) pickText(s, pick);
  resolvePending(s);
}

/** Over 雁回嶺 and back (a 築基). */
function north(s) {
  goToPoi(s, 'yanhui_gate', 0);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'yanhui_gate' });
  pickText(s, '翻過去');
  resolvePending(s);
  E.step(s, 0.05, null);
  resolvePending(s);
  assert.equal(s.world.map, 'beiyuan');
}
function south(s) {
  goToPoi(s, 'xueling_gate', 0);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'xueling_gate' });
  pickText(s, '回東荒');
  resolvePending(s);
  E.step(s, 0.05, null);
  resolvePending(s);
  assert.equal(s.world.map, 'donghuang');
}

test('陳家: a boy at the gate looks north for his father, gone over 雁回嶺 to the mines; 霍堡主 remembers him; by the road down from the pass, under the snow, his letter — carried home', () => {
  const s = fresh(91);
  Object.assign(s.player, { realm: 2, stage: 1 });
  at(s, 'chen_house', '北邊有什麼');
  assert.ok(s.flags.chen_met && s.nodes.yanhui_pass.known);
  north(s);
  E.placeAt(s, ...NODES.hantie_fort.at);
  resolvePending(s);
  A.visit(s, 'huo_bao', { near: true });
  pickText(s, '姓陳的礦工');
  resolvePending(s);
  assert.ok(s.flags.huo_chen);
  // (the master of the fort first: his mine)
  s.flags.mine_cleared = true;
  assert.equal(nextGoal(s)?.key, 'by:chen');
  at(s, 'frozen_man', '取出那封信');
  assert.ok(s.flags.frozen_found && s.player.items.frozen_letter === 1);
  south(s);
  assert.equal(nextGoal(s)?.key, 'chen', 'the line at the top: the 陳 family');
  at(s, 'chen_house', '把信交給他們');
  assert.ok(s.flags.chen_letter && !(s.player.items.frozen_letter > 0));
  assert.ok(POI_BY_ID.chen_house.text(s).includes('小石在餵雞'), 'and life goes on at the 陳 house');
});

test('the scarecrow walks the furrows by moonlight: watched, it bows; burned, the boars come — and it walks no more', () => {
  const s = fresh(92);
  E.placeAt(s, ...NODES.farmland.at);
  resolvePending(s);
  s.tod = 22;
  startEvent(s, 'fl_scarecrow');
  pickText(s, '站著別動');
  resolvePending(s);
  s.day += 61;
  s.tod = 22;
  startEvent(s, 'fl_scarecrow');
  pickText(s, '一把火');
  resolvePending(s);
  assert.ok(s.flags.scarecrow_burned);
  assert.equal(EVENTS.fl_scarecrow.cond(s), false, 'it walks no more');
});

test('the wilds: an old 散修 in a hut you come on only close by, who never made 築基 and tells you how he lost; a land god\'s shrine in the dykes and a sword\'s grave with no name, found by walking near', () => {
  const s = fresh(93);
  Object.assign(s.player, { realm: 1, stage: 7 });
  assert.ok(!E.poiVisible(s, POI_BY_ID.wd_hut), 'not seen from afar');
  at(s, 'wd_hut', '一個人住在這裡');
  assert.ok(s.flags.hermit_met);
  at(s, 'wd_hut', '那三回');
  assert.ok(s.flags.hermit_told);
  const ins = s.player.insight;
  at(s, 'find_landgod');
  at(s, 'find_grave');
  assert.ok(s.player.insight >= ins + 3, 'something learned from each');
});
