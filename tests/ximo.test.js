// 西漠 (0.22): what lies out past 西風口 — its beasts and its four masters, the
// noon sun and the sandstorm and the quicksand, the people of 月泉 and 落日關
// and what they ask of you; the five steles of the city under the sand, the
// gate under its tower and what 玄微 left there; 沙陀寺 and its abbot; and how it
// ties back into a cultivator's road (a 功法 and its 大日輪, a book for 金丹).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import * as A from '../src/core/actions.js';
import * as SK from '../src/world/skills.js';
import { FOES } from '../src/content/foes.js';
import { BEAST_MOVES } from '../src/content/moves.js';
import { BEAST_NOTES } from '../src/content/codex.js';
import { SHOPS, ITEMS } from '../src/content/items.js';
import { FRAGMENTS } from '../src/content/fragments.js';
import { WUXING } from '../src/content/wuxing.js';
import { BIG_BEASTS } from '../src/art/scenery.js';
import { BEASTS, POI_BY_ID } from '../src/world/places.js';
import { NODES, mapOf } from '../src/world/map.js';
import { NAMED } from '../src/world/npcs.js';
import { useMap } from '../src/world/atlas.js';
import { regionAt, collides, isReachable } from '../src/world/terrain.js';
import { gearStats, wear } from '../src/core/body.js';
import { breakthroughInfo } from '../src/core/cultivation.js';
import { serialize, parseSave } from '../src/core/save.js';
import { checkFeats } from '../src/world/feats.js';
import { nextGoal } from '../src/world/guide.js';
import { startEvent } from '../src/core/events.js';
import { fresh, resolvePending, goToPoi, pickText } from './helpers.js';

const NEW = ['scorpion', 'sand_wolf', 'sand_bandit', 'vulture', 'mummy', 'kuchan', 'sand_jiao', 'stone_puppet', 'stone_general'];
const STELES = ['stele_city', 'stele_ferry', 'stele_star', 'stele_break', 'stele_farewell'];

/** A 築基 cultivator, out through 西風口 and standing at 月泉 (the first sights of the desert said). */
function out(seed) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 2, stage: 0 });
  goToPoi(s, 'west_pass_gate', 0);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'west_pass_gate' });
  pickText(s, '出關');
  resolvePending(s);
  E.step(s, 0.05, null);
  resolvePending(s);
  assert.equal(s.world.map, 'ximo');
  // (the beasts and the hours keep out of the way of the stories, unless a test wants them)
  s.world.mobs = { ...(s.world.mobs || {}), stone_puppets_a: s.day + 999, stone_puppets_b: s.day + 999 };
  E.placeAt(s, ...NODES.yuequan.at);
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

/** Walk east over open sand until something comes of it (or not): what comes, and what was said on the way. */
function walkOut(s, steps = 400) {
  const said = [];
  s.world.enc = -1e9;
  for (let k = 0; k < steps; k++) {
    E.step(s, 0.1, { x: k % 200 < 100 ? 1 : -1, y: 0 });
    said.push(...(E.takeFeed(s) || []).map((f) => f.text));
    if (s.pending) return { id: s.pending.id, said };
  }
  return { id: null, said };
}

test('the beasts of 西漠 are whole: an element (or a man), a page in the 圖鑑, moves that exist, a drawing; each roams open ground, none in the town', () => {
  for (const kind of NEW) {
    const F = FOES[kind];
    assert.ok(F.rt.person || WUXING.includes(F.el), `${kind}: an element`);
    assert.ok(BEAST_NOTES[kind]?.note, `${kind}: a page in the 圖鑑`);
    assert.ok(F.rt.person || BIG_BEASTS.has(kind), `${kind}: drawn`);
    for (const id of [...F.rt.moves, ...(F.rt.phases || []).flatMap((p) => p.moves || [])]) assert.ok(BEAST_MOVES[id], `${kind}: ${id}`);
  }
  assert.equal(BEAST_MOVES.monkcall.call.kind, 'mummy', '枯禪 calls up his monks');
  assert.equal(BEAST_MOVES.stonecall.call.kind, 'stone_puppet', '石翁仲 wakes the stone guards');
  useMap('ximo');
  try {
    for (const def of BEASTS) {
      assert.equal(mapOf(regionAt({ flags: {} }, def.x, def.y)), 'ximo');
      assert.ok(isReachable(def.x, def.y) && !collides(null, def.x, def.y, 12), `${def.id} stands on open ground`);
      assert.ok(!['yuequan', 'luori_pass'].includes(regionAt({ flags: {} }, def.x, def.y)), `${def.id} keeps out of the town and the fort`);
    }
    for (const kind of NEW.filter((k) => k !== 'stone_general')) assert.ok(BEASTS.some((b) => b.kind === kind || b.lead === kind), `${kind} is out there somewhere`);
  } finally {
    useMap('donghuang');
  }
});

test('西風口 lets only a 築基 through; past it, 月泉 and its people, and two shops of its own', () => {
  const s = fresh(51);
  Object.assign(s.player, { realm: 1, stage: 8 });
  goToPoi(s, 'west_pass_gate', 0);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'west_pass_gate' });
  assert.equal(s.pending?.id, 'pass_to_ximo');
  assert.ok(s.pending.choices.find((c) => c.text.includes('出關')).disabled, '煉氣 cannot cross the sand');
  resolvePending(s, (o) => o.find((c) => c.text.includes('改天')));
  const t = out(52);
  assert.ok(t.flags.ximo_crossed && t.seen.ximo_arrive && t.seen.yq_arrive, 'out, and the first sights said');
  for (let k = 0; k < 10; k++) E.step(t, 0.1, null);
  const here = E.peopleInWorld(t).map((p) => p.id);
  for (const id of ['kang_tuotou', 'yue_niang', 'song_fuzi', 'liao_kong']) assert.ok(here.includes(id), `${id} is at 月泉`);
  for (const id of ['lao_qin', 'kang_tuotou', 'yue_niang', 'song_fuzi', 'liao_kong']) assert.equal(mapOf(NAMED[id].loc), 'ximo');
  goToPoi(t, 'yq_store');
  resolvePending(t);
  assert.equal(A.shopHere(t), SHOPS.yuequan);
  assert.ok(A.priceOf(t, 'water_skin') > 0 && A.priceOf(t, 'bingxin_pill') > 0);
  goToPoi(t, 'yq_caravan');
  resolvePending(t);
  assert.equal(A.shopHere(t), SHOPS.caravan);
  const full = A.priceOf(t, 'hanyu_pendant');
  t.flags.vulture_done = true;
  assert.ok(A.priceOf(t, 'hanyu_pendant') < full, 'cheaper once the road is safe');
});

test('the noon sun wears on you out on the sand: a warning, then it takes you — not in the shade of the town, not with 寒玉佩 on; a sandstorm the same, not with 定風珠', () => {
  const s = out(53);
  E.placeAt(s, 3600, 2480);
  resolvePending(s);
  s.vars.sky = 'heat';
  s.tod = 12;
  const a = walkOut(s);
  assert.ok(a.said.some((t) => t.includes('日頭毒得像火')), 'warned first');
  assert.equal(a.id, 'xm_heat', 'and then it takes you');
  pickText(s, '躺到太陽偏西');
  resolvePending(s);
  assert.ok(s.tod >= 15.9, 'lay up till the sun went over');
  assert.equal(s.world.exposed || 0, 0);
  // in the town's shade it does not build up
  E.placeAt(s, ...NODES.yuequan.at);
  resolvePending(s);
  s.tod = 12;
  s.day += 1;
  const b = walkOut(s, 150);
  assert.equal(b.id, null);
  assert.equal(s.world.exposed || 0, 0, 'no sun in the shade');
  // a pendant of cold jade, and the sun cannot touch you
  s.player.items.hanyu_pendant = 1;
  wear(s, 'hanyu_pendant');
  assert.ok(gearStats(s).cool >= 1 && E.sunproof(s));
  E.placeAt(s, 3600, 2480);
  resolvePending(s);
  s.tod = 12;
  assert.equal(walkOut(s).id, null, 'kept cool');
  // a sandstorm
  s.vars.sky = 'sandstorm';
  s.day += 1;
  const c = walkOut(s);
  assert.equal(c.id, 'xm_sandstorm');
  pickText(s, '等它過去');
  resolvePending(s);
  s.player.items.dingfeng_pearl = 1;
  wear(s, 'dingfeng_pearl');
  assert.ok(E.windproof(s));
  s.day += 1;
  assert.equal(walkOut(s).id, null, 'the wind turns aside');
});

test('the quicksand takes you as you walk into it; lying back and edging out works for the one who keeps a cool head', () => {
  const s = out(54);
  goToPoi(s, 'qs_b', 0);
  resolvePending(s, (o) => o[0]);
  if (s.pending?.id !== 'xm_quicksand') nudge(s);
  assert.equal(s.pending?.id, 'xm_quicksand');
  const ls = s.player.ls;
  pickText(s, '往後一倒');
  resolvePending(s);
  assert.ok(s.player.ls <= ls);
});

test('禿鷲寨: 康駝頭 asks; 禿鷲 is beaten and spared — his men leave the road, the caravan pays, and 月娘 learns where her husband went', () => {
  const s = out(55);
  assert.equal(nextGoal(s)?.key, 'xm:caravan', 'the line at the top: the caravan');
  call(s, 'kang_tuotou', '什麼忙');
  assert.ok(s.flags.kang_asked);
  assert.equal(nextGoal(s)?.key, 'xm:vulture');
  call(s, 'yue_niang', '一個人撐著');
  assert.ok(s.flags.yue_story);
  // the bandits on the road: their master's men, until he is dealt with
  useMap('ximo');
  const banditsOut = () => CB.beastsInWorld(s, 99999).some((b) => b.kind === 'sand_bandit');
  assert.ok(banditsOut());
  startEvent(s, 'xm_vulture');
  pickText(s, '討個說法');
  resolvePending(s);
  assert.ok(s.flags.vulture_done && s.flags.vulture_spared, 'beaten, and spared');
  assert.ok(!banditsOut(), 'the bandits are gone from the road');
  assert.equal(nextGoal(s)?.key, 'xm:kang');
  const ls = s.player.ls;
  call(s, 'kang_tuotou', '駝道從此太平');
  assert.ok(s.flags.kang_paid && s.flags.kang_friend && s.player.ls === ls + 200);
  call(s, 'yue_niang', '都送回來了');
  assert.ok(s.flags.yue_closure && s.player.items.bingxin_pill >= 3);
  checkFeats(s);
  assert.ok(s.vars.feats.ximo !== undefined && s.vars.feats.vulture !== undefined, '西出 and 駝道太平 earned');
});

test('the city under the sand: five steles read one by one (the system knows the script), the gate opens on the 石翁仲, and under it — a page of 玄微 and the star official\'s notes', () => {
  const s = out(56);
  call(s, 'song_fuzi', '寫的是什麼');
  assert.ok(s.nodes.lost_city.known);
  E.placeAt(s, ...NODES.lost_city.at);
  resolvePending(s);
  assert.equal(nextGoal(s)?.key, 'xm:read');
  // the gate is only a gate until the steles are read
  at(s, 'star_gate');
  assert.ok(!s.flags.palace_open);
  for (const [k, id] of STELES.entries()) {
    at(s, id, '記下來');
    assert.ok(s.flags[`read_${id}`], `${id} read`);
    if (k < 4) assert.equal(nextGoal(s)?.key, 'xm:steles');
  }
  assert.ok(s.flags.steles_read && s.seen.xm_stele_star);
  call(s, 'song_fuzi', '讀得懂');
  assert.ok(s.flags.song_told);
  // the gate, and what guards it
  assert.equal(nextGoal(s)?.key, 'xm:gate');
  goToPoi(s, 'star_gate');
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'star_gate' });
  assert.equal(s.pending?.id, 'xm_star_gate');
  pickText(s, '迎上去');
  resolvePending(s);
  assert.ok(s.flags.palace_open && E.poiVisible(s, POI_BY_ID.palace_bier));
  // down into it
  at(s, 'palace_bier', '讀那頁紙');
  assert.equal(regionAt(s, s.world.x, s.world.y), 'underpalace');
  assert.ok(s.sys.frags.includes('frag_sand') && FRAGMENTS.frag_sand.text.includes('接天城'));
  assert.equal(s.player.items.xingguan_notes, 1);
  // the notes, at the gate of 金丹
  Object.assign(s.player, { realm: 2, stage: 3 });
  const with_ = breakthroughInfo(s);
  delete s.player.items.xingguan_notes;
  const without = breakthroughInfo(s);
  assert.ok(Math.abs(with_.chance - without.chance - 0.08) < 1e-9, '+8% toward 金丹');
  checkFeats(s);
  assert.ok(s.vars.feats.steles !== undefined && s.vars.feats.jietian !== undefined, '讀碑 and 接天 earned');
});

test('沙陀寺: 了空 asks after his master; by night the dead walk and the abbot sits before his hall; he falls, the monks lie down at last, 了空 goes home — and the scripture cave gives 大日心經, and 大日輪 with it', () => {
  const s = out(57);
  call(s, 'liao_kong', '為誰唸經');
  assert.ok(s.flags.shatuo_task && s.nodes.shatuo_temple.known);
  assert.equal(nextGoal(s)?.key, 'xm:kuchan');
  E.placeAt(s, ...NODES.shatuo_temple.at);
  resolvePending(s);
  // by day the dead sit still
  s.tod = 11;
  at(s, 'shatuo_hall', '退出去');
  assert.ok(s.flags.shatuo_seen);
  // (what is out at an hour comes out as the world goes on: a breath of it)
  const out_ = (kind) => {
    E.step(s, 0.05, null);
    return CB.beastsInWorld(s, 99999).some((b) => b.kind === kind);
  };
  assert.ok(!out_('mummy') && !out_('kuchan'), 'not by day');
  s.tod = 22;
  assert.ok(out_('mummy') && out_('kuchan'), 'by night');
  // the abbot falls (and leaves his relic)
  s.vars.kills = { ...(s.vars.kills || {}), kuchan: 1 };
  s.player.items.sarira = 1;
  assert.equal(nextGoal(s)?.key, 'xm:hall');
  s.tod = 10;
  at(s, 'shatuo_hall', '安放好');
  assert.ok(s.flags.shatuo_rest && s.flags.shatuo_key);
  s.tod = 22;
  assert.ok(!out_('mummy') && !out_('kuchan'), 'the dead lie down for good');
  s.tod = 10;
  call(s, 'liao_kong', '都安息了');
  assert.equal(s.npcs.liao_kong.loc, 'shatuo_temple', '了空 goes home to light the lamps');
  call(s, 'liao_kong', '舍利交給他');
  assert.ok(s.flags.sarira_given && !s.player.items.sarira);
  // the scripture
  assert.ok(SK.lockOf(s, SK.moveOf(s, 'sunwheel')), '大日輪 not yet');
  at(s, 'shatuo_caves', '坐下來讀');
  assert.ok(s.player.techs.includes('dari'), '大日心經 learned');
  assert.equal(SK.lockOf(s, SK.moveOf(s, 'sunwheel')), null, '大日輪 is yours');
  checkFeats(s);
  assert.ok(s.vars.feats.shatuo !== undefined);
});

test('老秦\'s beacon: light the dead one at 西風口 at night and the west answers; he has waited forty years', () => {
  const s = fresh(58);
  goToPoi(s, 'wp_beacon');
  resolvePending(s);
  s.tod = 12;
  E.interact(s, { kind: 'poi', id: 'wp_beacon' });
  assert.equal(s.pending?.id, 'wp_beacon_light');
  assert.ok(s.pending.choices.find((c) => c.text.includes('點起來')).disabled, 'a fire by day shows nobody anything');
  pickText(s, '走開');
  resolvePending(s);
  s.tod = 20;
  E.interact(s, { kind: 'poi', id: 'wp_beacon' });
  pickText(s, '點起來');
  resolvePending(s);
  assert.ok(s.flags.west_beacon_lit);
  // over in the west
  const t = out(59);
  call(t, 'lao_qin', '一個人守著');
  call(t, 'lao_qin', '點一把火');
  assert.ok(t.flags.laoqin_promise);
  t.flags.west_beacon_lit = true;
  call(t, 'lao_qin', '是我點的');
  assert.ok(t.flags.laoqin_beacon && t.player.items.qin_token === 1 && ITEMS.qin_token.keep);
});

test('a save in 西漠 keeps its people and your doings; an old save gains the people of 西漠, not met', () => {
  const s = out(60);
  call(s, 'kang_tuotou', '什麼忙');
  s.npcs.liao_kong.loc = 'shatuo_temple';
  const t = parseSave(serialize(s));
  assert.ok(t.flags.kang_asked && t.npcs.liao_kong.loc === 'shatuo_temple', 'what you asked of them, and where they went');
  const old = JSON.parse(serialize(fresh(61)));
  const PEOPLE = ['lao_qin', 'kang_tuotou', 'yue_niang', 'song_fuzi', 'liao_kong'];
  for (const id of PEOPLE) delete old.npcs[id];
  const u = parseSave(JSON.stringify(old));
  for (const id of PEOPLE) assert.ok(u.npcs[id] && !u.npcs[id].met, `${id} is there to meet`);
});
