// 第一章完善 (0.25): the history the stones keep, the people of 東荒 whose stories had only begun, and
// the book of where every thread you are in has come to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { startEvent } from '../src/core/events.js';
import { EVENTS } from '../src/content/index.js';
import { POI_BY_ID } from '../src/world/places.js';
import { WINDOWS } from '../src/world/arcs.js';
import { storiesOf, STORIES, GROUPS } from '../src/content/stories.js';
import { annalsOf, ANNALS, ERAS } from '../src/content/annals.js';
import { pastOf } from '../src/world/npcs.js';
import { zoneOf } from '../src/world/crafts.js';
import { RECIPES } from '../src/content/crafts.js';
import { fresh, resolvePending, goToPoi, goTo, pickText, waitUntil } from './helpers.js';

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

const thread = (s, id) => storiesOf(s).find((t) => t.id === id);

test('孫掌櫃: what happened thirty years ago; his master\'s grave by 鏡湖 and the letter in it; brought back, he goes into seclusion for the first time in thirty years — and comes out a layer up', () => {
  const s = fresh(201);
  Object.assign(s.player, { realm: 1, stage: 2 });
  s.flags.sun_revealed = true;
  Object.assign(s.npcs.sun_zg, { met: true, favor: 20 });
  assert.equal(thread(s, 'sun').next, '他好像還有話沒說。（交情再深一點）');
  assert.ok(!POI_BY_ID.ge_grave.show(s), 'the grave is no place you would know of yet');
  goTo(s, 'qingshi_town');
  resolvePending(s);
  startEvent(s, 'town_pharmacy');
  pickText(s, '三十年前');
  resolvePending(s);
  assert.ok(s.flags.sun_past && POI_BY_ID.ge_grave.show(s));
  assert.match(thread(s, 'sun').next, /鏡湖/);
  at(s, 'ge_grave', '打開鐵盒');
  assert.ok(s.flags.ge_letter_found && s.player.items.ge_letter === 1);
  assert.ok(pastOf(s, 'sun_zg').some((l) => l.includes('孫長春')), 'and now you know his name');
  goTo(s, 'qingshi_town');
  resolvePending(s);
  startEvent(s, 'town_pharmacy');
  pickText(s, '字條交給');
  resolvePending(s);
  assert.ok(s.flags.sun_master_done && s.player.items.ge_danjing === 1 && !(s.player.items.ge_letter > 0));
  // his master's book: the fire is easier to hold
  assert.ok(zoneOf(s, 'juqi_pill') > RECIPES.juqi_pill.zone);
  waitUntil(s, s.day + 95);
  resolvePending(s);
  assert.ok(s.flags.sun_out && s.npcs.sun_zg.stage >= 2, 'out of seclusion, a layer up');
  assert.ok(s.rumors.some((r) => r.text.includes('孫掌櫃出關')));
  const t = thread(s, 'sun');
  assert.ok(t.done && t.steps.length === t.of);
});

test('錢半仙: two tales from where nobody in 東荒 has been become his new stories; then he tells his own — the sword light he looked at once, fifty years ago', () => {
  const s = fresh(202);
  s.flags.gu_cleared = true;
  s.flags.palace_seen = true;
  goToPoi(s, 'teahouse_market');
  resolvePending(s);
  startEvent(s, 'market_storyteller');
  assert.ok(!s.pending.choices.some((c) => c.text.includes('北原')), 'nothing to tell of 北原 yet');
  pickText(s, '南嶺');
  resolvePending(s);
  startEvent(s, 'market_storyteller');
  pickText(s, '西漠');
  resolvePending(s);
  assert.ok(s.flags.banxian_tale_nl && s.flags.banxian_tale_xm);
  assert.ok(s.rumors.some((r) => r.text.includes('南嶺除蠱')), 'the tale goes round');
  startEvent(s, 'market_storyteller');
  pickText(s, '劍仙斷天河');
  resolvePending(s);
  assert.ok(s.flags.banxian_past);
  assert.ok(annalsOf(s).have.some((a) => a.id === 'banxian'));
  assert.ok(thread(s, 'banxian').steps.some((x) => x.label === '他看見的那道劍光'));
});

test('沈清歌: the nights after the three years, under the old locust; she tore it herself — and, told so, writes her own: a year on, 築基', () => {
  const s = fresh(203);
  assert.ok(!EVENTS.town_shen_night.cond(s), 'not before the three years are up');
  waitUntil(s, WINDOWS.pact[1] + 2);
  resolvePending(s);
  s.tod = 23;
  goToPoi(s, 'old_locust');
  resolvePending(s);
  assert.ok(EVENTS.town_shen_night.cond(s), 'a night after the three years, by the tree');
  startEvent(s, 'town_shen_night');
  pickText(s, '你撕的是婚書');
  resolvePending(s);
  assert.ok(s.flags.shen_talked && s.flags.shen_own_path);
  assert.ok(pastOf(s, 'shen_qingge').some((l) => l.includes('墊腳石')));
  assert.ok(!EVENTS.town_shen_night.cond(s) || s.flags.shen_talked, 'once only');
  waitUntil(s, WINDOWS.pact[1] + 310);
  resolvePending(s);
  assert.ok(s.flags.shen_zhuji && s.npcs.shen_qingge.realm >= 2);
  assert.ok(thread(s, 'shen').done);
});

test('the stones: the sword tomb on 古戰場 (it was a hand, and a sword cut a finger off it) and 青雲宗\'s founding stone — both go into the 史冊', () => {
  const s = fresh(204);
  Object.assign(s.player, { realm: 2, stage: 0 });
  at(s, 'sword_tomb', '拜三拜');
  assert.ok(s.flags.sword_stele_read, 'the sword tomb read');
  at(s, 'sect_stele', '讀完');
  assert.ok(s.flags.sect_stele_read, 'the founding stone read');
  const { have, total } = annalsOf(s);
  assert.ok(have.some((a) => a.id === 'swordtomb') && have.some((a) => a.id === 'founder'));
  assert.ok(total === ANNALS.length && have.length < total);
});

test('the 史冊 and the people page fill from what you have seen or heard: the ghost on 古戰場, 胡三娘\'s stories, the rumours of 林塵', () => {
  const s = fresh(205);
  // every entry sits in a known era, and has somewhere it is read
  for (const a of ANNALS) assert.ok(ERAS.includes(a.era) && a.where && a.text, a.id);
  assert.equal(pastOf(s, 'lin_chen').length, 0);
  s.rumors.unshift({ day: s.day, text: '林家少爺林塵被沈家當眾退婚。沈家小姐親手撕了婚書。', kind: 'arc', ref: 'lin_chen', read: false });
  assert.ok(pastOf(s, 'lin_chen')[0].includes('退婚'), 'heard told is known');
  // the soul on the old battlefield: see its memory through
  s.player.attrs.xinxing = 30;
  for (let k = 0; k < 6 && !s.flags.ghost_memory; k++) {
    startEvent(s, 'ruins_soul');
    pickText(s, '守住心神');
    resolvePending(s);
  }
  assert.ok(s.flags.ghost_memory && annalsOf(s).have.some((a) => a.id === 'swordlight'));
  // 胡三娘: whichever of her three stories it is today
  s.player.attrs.wuxing = 30;
  Object.assign(s.npcs.hu_sanniang, { met: true, favor: 30 });
  for (let k = 0; k < 6 && !['hu_story_hunter', 'hu_story_crack', 'hu_story_founder'].some((f) => s.flags[f]); k++) {
    startEvent(s, 'shrine_visit');
    pickText(s, '三百年前的事');
    resolvePending(s);
  }
  assert.ok(['hu_story_hunter', 'hu_story_crack', 'hu_story_founder'].some((f) => s.flags[f]));
  assert.ok(pastOf(s, 'hu_sanniang').length >= 1);
});

test('故事: only the threads you are in, the steps you have reached (never ahead), and what you might do next; groups in order', () => {
  const s = fresh(206);
  const list = storiesOf(s);
  const main = list.find((t) => t.id === 'main');
  assert.ok(main && main.steps.length >= 1 && main.next, 'the main line from the first day');
  assert.ok(!list.some((t) => t.id === 'by_mine'), 'nothing of 北原 before you are in it');
  for (const t of STORIES) assert.ok(GROUPS.includes(t.group), t.id);
  s.flags.mine_asked = true;
  const mine = thread(s, 'by_mine');
  assert.equal(mine.steps.length, 0);
  assert.match(mine.next, /深巷/);
  s.flags.mine_deep_open = true;
  s.vars.kills = { silk_queen: 1 };
  assert.equal(thread(s, 'by_mine').steps.length, 2);
  s.flags.cocoons_cut = true;
  s.flags.mine_cleared = true;
  assert.ok(thread(s, 'by_mine').done && thread(s, 'by_mine').next === null);
});

test('斷劍峰: 葉孤寒 at the scar, once you have read it yourself; told of the sword tomb, he tells where 天劍宗\'s first move came from', () => {
  const s = fresh(207);
  Object.assign(s.player, { realm: 2, stage: 1 });
  assert.ok(!EVENTS.air_ye_guhan.cond(s), 'not before you have looked at the scar yourself');
  s.flags.sword_scar_read = true;
  s.flags.sword_stele_read = true;
  startEvent(s, 'air_ye_guhan');
  pickText(s, '一起看');
  resolvePending(s);
  assert.ok(s.flags.ye_met && s.flags.ye_lineage && s.npcs.ye_guhan.met);
  assert.ok(annalsOf(s).have.some((a) => a.id === 'tianjian') && annalsOf(s).have.some((a) => a.id === 'cleft'));
  assert.ok(pastOf(s, 'ye_guhan').some((l) => l.includes('天劍宗')));
});

test('豆花攤: 趙虎, a year or two after the alley, pushing 老李頭\'s millstone — with nobody behind him any more', () => {
  const s = fresh(208);
  s.flags.beat_zhao = true;
  s.flags.zhao_done = true;
  assert.ok(!EVENTS.town_zhao_changed.cond(s), 'not so soon');
  waitUntil(s, 2 * 360 + 5);
  resolvePending(s);
  assert.ok(EVENTS.town_zhao_changed.cond(s));
  startEvent(s, 'town_zhao_changed');
  pickText(s, '豆花');
  resolvePending(s);
  assert.ok(s.flags.zhao_changed && pastOf(s, 'zhao_hu').some((l) => l.includes('推磨')));
});
