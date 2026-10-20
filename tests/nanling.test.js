// 南嶺 (0.21): what lives over the pass — its people, its beasts, its well gone
// bitter and the 蠱母 at the bottom of it, a hunter's lost brother, what is
// behind the falls, the miasma over half of it; and how it ties back into a
// cultivator's road (a 功法 and its 地刺, a 丹方, armour against venom).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import * as A from '../src/core/actions.js';
import * as SK from '../src/world/skills.js';
import { refinable, recipesKnown } from '../src/world/crafts.js';
import { FOES } from '../src/content/foes.js';
import { BEAST_MOVES } from '../src/content/moves.js';
import { BEAST_NOTES } from '../src/content/codex.js';
import { SHOPS } from '../src/content/items.js';
import { EVENTS } from '../src/content/index.js';
import { WUXING } from '../src/content/wuxing.js';
import { BIG_BEASTS } from '../src/art/scenery.js';
import { BEASTS, POI_BY_ID } from '../src/world/places.js';
import { NODES, mapOf } from '../src/world/map.js';
import { NAMED } from '../src/world/npcs.js';
import { useMap } from '../src/world/atlas.js';
import { regionAt, collides, isReachable, nearestOpen } from '../src/world/terrain.js';
import { gearStats, wear } from '../src/core/body.js';
import { serialize, parseSave } from '../src/core/save.js';
import { checkFeats } from '../src/world/feats.js';
import { nextGoal } from '../src/world/guide.js';
import { startEvent } from '../src/core/events.js';
import { fresh, resolvePending, goToPoi, pickText } from './helpers.js';

const NEW = ['spider', 'toad', 'toad_king', 'swarm', 'gu_mother'];

/** A 煉氣 cultivator, over the pass and standing in 青竹寨 (its welcome said). */
function over(seed) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 1, stage: 6 });
  goToPoi(s, 'south_pass_gate', -40);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'south_pass_gate' });
  pickText(s, '翻過去');
  resolvePending(s);
  E.step(s, 0.05, null);
  resolvePending(s);
  assert.equal(s.world.map, 'nanling');
  E.placeAt(s, ...NODES.qingzhu_village.at);
  resolvePending(s);
  return s;
}

/** A step this way and back: what is near is looked at again (as walking does). */
function nudge(s) {
  E.step(s, 0.05, { x: 1, y: 0 });
  if (!s.pending) E.step(s, 0.05, { x: -1, y: 0 });
}

/** Walk up to a place and see to it (whatever it starts, played out with the choice named). */
function at(s, id, pick = null) {
  goToPoi(s, id);
  // (the first time somewhere: what it is like, said first; then a step about, as you would)
  resolvePending(s);
  nudge(s);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id });
  if (pick) pickText(s, pick);
  resolvePending(s);
}

/** Call on someone and take the choice named. */
function call(s, npc, pick) {
  A.visit(s, npc, { near: true });
  assert.ok(s.pending, `${npc} has something to say`);
  pickText(s, pick);
  resolvePending(s);
}

test('the beasts of 南嶺 are whole: an element, a page in the 圖鑑, moves that exist, a drawing; each roams open ground, none in the village', () => {
  for (const kind of NEW) {
    const F = FOES[kind];
    assert.ok(WUXING.includes(F.el), `${kind}: an element`);
    assert.ok(BEAST_NOTES[kind]?.note, `${kind}: a page in the 圖鑑`);
    assert.ok(BIG_BEASTS.has(kind), `${kind}: drawn`);
    for (const id of [...F.rt.moves, ...(F.rt.phases || []).flatMap((p) => p.moves || [])]) assert.ok(BEAST_MOVES[id], `${kind}: ${id}`);
  }
  assert.equal(BEAST_MOVES.broodcall.call.kind, 'swarm', '蠱母 calls her brood');
  useMap('nanling');
  try {
    for (const def of BEASTS) {
      assert.equal(mapOf(regionAt({ flags: {} }, def.x, def.y)), 'nanling');
      assert.ok(isReachable(def.x, def.y) && !collides(null, def.x, def.y, 12), `${def.id} stands on open ground`);
      assert.ok(!['qingzhu_village', 'ling_pass'].includes(regionAt({ flags: {} }, def.x, def.y)), `${def.id} keeps out of the village and off the pass`);
    }
    for (const kind of NEW) assert.ok(BEASTS.some((b) => b.kind === kind), `${kind} is out there somewhere`);
  } finally {
    useMap('donghuang');
  }
});

test('青竹寨: its elder meets you, its people stand where they live, and 阿蘿 keeps a shop of her own (her own prices; she weaves, she does not refine)', () => {
  const s = over(31);
  assert.ok(s.seen.qingzhu_arrive, 'welcomed at the gate');
  assert.ok(s.npcs.yan_bo.met, '岩伯 meets you');
  for (let k = 0; k < 10; k++) E.step(s, 0.1, null);
  const here = E.peopleInWorld(s).map((p) => p.id);
  for (const id of ['yan_bo', 'a_luo', 'a_shan']) assert.ok(here.includes(id), `${id} is in the village`);
  for (const id of ['yan_bo', 'a_luo', 'a_shan', 'han_san']) assert.equal(mapOf(NAMED[id].loc), 'nanling');
  goToPoi(s, 'zhai_shop');
  resolvePending(s);
  assert.equal(A.shopHere(s), SHOPS.qingzhu);
  assert.equal(A.priceOf(s, 'bizhang_pill'), 30, 'not the 坊市 price, whatever your standing there');
  s.player.ls = 200;
  s.player.items.spider_silk = 4;
  assert.ok(A.canCraft(s, 'silk_vest'));
  A.craft(s, 'silk_vest');
  resolvePending(s);
  assert.equal(s.player.items.silk_vest, 1);
  assert.equal(s.player.items.spider_silk || 0, 0);
  wear(s, 'silk_vest');
  assert.ok(refinable(s).every((r) => r.why === '要到百煉坊。'), 'refining is the 百煉坊\'s');
  s.flags.gu_cleared = true;
  assert.ok(A.priceOf(s, 'bizhang_pill') < 30, 'cheaper for the one who cleared the valley');
});

test('the miasma takes you unprotected; a 避瘴丹 keeps it off for days', () => {
  const s = over(32);
  goToPoi(s, 'zl_miasma_b', 0);
  assert.equal(s.pending?.id, 'zl_arrive', 'the first sight of 瘴林');
  resolvePending(s);
  nudge(s);
  assert.equal(s.pending?.id, 'nl_miasma', 'the miasma closes round you');
  pickText(s, '閉氣');
  resolvePending(s);
  // a pill, and the next patch of it cannot touch you
  s.player.items.bizhang_pill = 1;
  A.useItem(s, 'bizhang_pill');
  resolvePending(s);
  assert.ok(s.player.buffs.bizhang > 0);
  goToPoi(s, 'zl_miasma_d', 0);
  nudge(s);
  assert.notEqual(s.pending?.id, 'nl_miasma', 'kept off');
  resolvePending(s);
});

test('the well gone bitter: 岩伯 asks, 阿蘿 knows, the 蠱母 dies, its nest burns — the well runs sweet, and the miasma never touches you again', () => {
  const s = over(33);
  at(s, 'zhai_well', '撈一隻死蟲');
  assert.ok(s.flags.well_seen);
  call(s, 'yan_bo', '寨井的事');
  assert.ok(s.flags.gu_task);
  assert.equal(nextGoal(s)?.key, 'nl:ask', 'the line at the top: ask 阿蘿');
  call(s, 'a_luo', '寨井裡的死蟲');
  assert.ok(s.flags.luo_told);
  assert.equal(nextGoal(s)?.key, 'nl:mother');
  // 萬蠱谷: the mother is there until she is dead, and then never again
  E.placeAt(s, ...nearestOpen(s, 4330, 1900));
  resolvePending(s);
  assert.ok(CB.beastsInWorld(s, 2000).some((b) => b.kind === 'gu_mother'), 'the 蠱母 at her nest');
  s.vars.kills = { ...(s.vars.kills || {}), gu_mother: 1 };
  assert.ok(!CB.beastsInWorld(s, 2000).some((b) => b.kind === 'gu_mother'), 'gone for good');
  // not done until the nest is burned
  assert.equal(nextGoal(s)?.key, 'nl:nest');
  call(s, 'yan_bo', '蠱母死了。');
  assert.ok(!s.flags.gu_cleared);
  at(s, 'gu_nest');
  assert.ok(s.flags.gu_nest_burned, 'the nest burned');
  const ls = s.player.ls;
  call(s, 'yan_bo', '巢也燒了');
  assert.ok(s.flags.gu_cleared && s.player.ls > ls);
  call(s, 'a_luo', '有東西要給我');
  assert.ok(s.flags.bizhang_gu, '避瘴蠱 in your blood');
  // the well, and the miasma
  at(s, 'zhai_well');
  assert.ok(s.seen.zhai_well_sweet);
  goToPoi(s, 'zl_miasma_a', 0);
  resolvePending(s);
  nudge(s);
  assert.notEqual(s.pending?.id, 'nl_miasma');
  resolvePending(s);
  checkFeats(s);
  assert.ok(s.vars.feats.nanling !== undefined && s.vars.feats.gu_mother !== undefined, '過嶺 and 除蠱 earned');
});

test('阿山\'s brother: lost in 瘴林, found in the 白絲洞 (a fight), brought home — and what he saw behind the falls; through it, 厚土訣 on the cave wall, and 地刺 with it', () => {
  const s = over(34);
  assert.ok(!E.poiVisible(s, POI_BY_ID.web_hollow), 'nothing to find yet');
  call(s, 'a_shan', '我去找');
  assert.ok(s.flags.a_shui_lost && E.poiVisible(s, POI_BY_ID.web_hollow));
  goToPoi(s, 'web_hollow');
  if (s.pending?.id === 'zl_arrive') resolvePending(s);
  nudge(s);
  assert.equal(s.pending?.id, 'zl_a_shui', 'the hollow, by itself as you come');
  pickText(s, '動手');
  resolvePending(s);
  assert.ok(s.flags.a_shui_found);
  call(s, 'a_shan', '阿水好些了');
  assert.ok(s.flags.a_shui_saved && s.flags.falls_hint && s.player.items.spider_silk >= 3);
  // the falls: through, and in
  assert.ok(!SK.movesOf(s).find((m) => m.id === 'dici').usable, '地刺 not yet');
  at(s, 'falls', '穿過水簾');
  assert.ok(s.flags.falls_cave_found);
  assert.equal(regionAt(s, s.world.x, s.world.y), 'water_cave', 'in the cave behind the water');
  at(s, 'cave_carvings', '從頭讀起');
  assert.ok(s.player.techs.includes('houtu'), '厚土訣 learned');
  assert.equal(SK.lockOf(s, SK.moveOf(s, 'dici')), null, '地刺 is yours');
  assert.ok(NODES.water_cave.qi > NODES.wangu_valley.qi, 'the best place in 南嶺 to sit');
});

test('韓三\'s pack: carried out of 瘴林 and given back, or emptied', () => {
  const s = over(35);
  at(s, 'han_pack', '取下來');
  assert.ok(s.player.items.han_pack);
  E.placeAt(s, ...NODES.ling_pass.at);
  resolvePending(s);
  s.npcs.han_san.met = true;
  call(s, 'han_san', '把包袱還給他');
  assert.ok(!s.player.items.han_pack && s.flags.han_pack_returned);
  assert.ok(s.player.items.book_lianxi || s.player.ls > 0);
});

test('what you wear keeps venom off: a spider\'s bite leaves less of it in you under 金蠱甲', () => {
  const left = (armour) => {
    const s = over(36);
    if (armour) {
      s.player.items.gu_armor = 1;
      wear(s, 'gu_armor');
    }
    assert.equal(gearStats(s).venom, armour ? 0.5 : 0);
    E.placeAt(s, ...nearestOpen(s, 1200, 1300 + 120));
    resolvePending(s);
    s.tod = 14;
    const me = CB.hero(s);
    me.hp = me.cap;
    const w = s.world;
    const spider = CB.beastsInWorld(s, 2000).find((b) => b.kind === 'spider');
    assert.ok(spider);
    // a bite at you, right now, from beside you
    Object.assign(spider, { x: w.x + 30, y: w.y, aggro: true });
    for (let k = 0; k < 4; k++) E.step(s, 1 / 30, null);
    Object.assign(spider, { state: 'windup', st: 0, move: 'spiderbite', wind: 0.1, moving: false, aim: [-1, 0], combo: 0, kb: null });
    for (let k = 0; k < 20 && !me.poison; k++) E.step(s, 1 / 30, null);
    assert.ok(me.poison, 'bitten, and the venom in you');
    return me.poison.dps / spider.dmg;
  };
  const bare = left(false);
  const armoured = left(true);
  assert.ok(Math.abs(armoured - bare * 0.5) < 1e-9, `half the venom (${bare} → ${armoured})`);
});

test('a save on 南嶺 keeps its people and your doings there; an old save gains the people of 南嶺; 東荒\'s sights wait till you are back', () => {
  const s = over(37);
  call(s, 'yan_bo', '寨井的事');
  const t = parseSave(serialize(s));
  assert.ok(t.flags.gu_task && t.npcs.yan_bo.met);
  // a save from before 南嶺: its people are filled in, not met
  const old = JSON.parse(serialize(fresh(38)));
  for (const id of ['yan_bo', 'a_luo', 'a_shan', 'han_san']) delete old.npcs[id];
  const u = parseSave(JSON.stringify(old));
  for (const id of ['yan_bo', 'a_luo', 'a_shan', 'han_san']) assert.ok(u.npcs[id] && !u.npcs[id].met, `${id} is there to meet`);
  // a sight of 東荒 does not come to you over the hills
  s.flags.songhe_saved = true;
  s.flags.crane_saved = true;
  assert.ok(!EVENTS.songhe_retry.cond(s) && !EVENTS.crane_return.cond(s));
  startEvent(s, 'pass_to_donghuang');
  assert.ok(s.pending);
  resolvePending(s);
});

test('青竹寨 keeps hours: by day 阿蘿 minds her shop and 岩伯 sits before the 山神 of a morning; at night they are indoors', () => {
  const s = over(39);
  const at = (tod) => {
    if (tod < s.tod) s.day += 1;
    s.tod = tod;
    for (let k = 0; k < 3; k++) E.step(s, 0.05, null);
    return Object.fromEntries(E.peopleInWorld(s).map((p) => [p.id, p]));
  };
  let P = at(10);
  assert.ok(!P.a_luo.inside && Math.hypot(P.a_luo.x - 3100, P.a_luo.y - 1300) < 1, '阿蘿 out by her shop');
  P = at(8.5);
  assert.equal(P.yan_bo.act, 'sit', '岩伯 sitting before the 山神');
  P = at(23);
  assert.ok(P.a_luo.inside && P.yan_bo.inside && P.a_shan.inside, 'indoors at night');
});
