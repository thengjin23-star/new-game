// 北原 (0.23): north of 東荒, over 雁回嶺 — the way over (a 築基 goes as he
// likes; one below it may, and pays for it in frostbite), the beasts of the
// north and their four masters, what the cold does to you out on the snow, a
// blizzard, the thin ice of 北冥, the snow brought down off the slopes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { FOES } from '../src/content/foes.js';
import { BEAST_MOVES } from '../src/content/moves.js';
import { BEAST_NOTES } from '../src/content/codex.js';
import { WUXING } from '../src/content/wuxing.js';
import { BIG_BEASTS } from '../src/art/scenery.js';
import { BEASTS, POI_BY_ID } from '../src/world/places.js';
import { NODES, mapOf } from '../src/world/map.js';
import { useMap } from '../src/world/atlas.js';
import { regionAt, collides, isReachable } from '../src/world/terrain.js';
import { wear, pools } from '../src/core/body.js';
import { startEvent } from '../src/core/events.js';
import * as A from '../src/core/actions.js';
import * as CB from '../src/world/combat.js';
import * as SK from '../src/world/skills.js';
import { nextGoal } from '../src/world/guide.js';
import { checkFeats } from '../src/world/feats.js';
import { recipesKnown } from '../src/world/crafts.js';
import { FRAGMENTS } from '../src/content/fragments.js';
import { MAPS } from '../src/world/atlas.js';
import { rateParts, breakthroughInfo } from '../src/core/cultivation.js';
import { advance, newReport } from '../src/core/time.js';
import { fresh, resolvePending, goToPoi, pickText } from './helpers.js';

const NEW = ['ice_wolf', 'snow_leopard', 'ice_silkworm', 'snow_ape', 'snow_wraith', 'bailang_king', 'silk_queen', 'ape_king', 'ice_qilin'];

/** Over 雁回嶺 into 北原 at the realm given, standing below the cairn of 雪嶺口 (the first sights said). */
function over(seed, realm = 2, stage = 2) {
  const s = fresh(seed);
  Object.assign(s.player, { realm, stage });
  goToPoi(s, 'yanhui_gate', 0);
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'yanhui_gate' });
  assert.equal(s.pending?.id, 'pass_to_beiyuan');
  pickText(s, realm >= 2 ? '翻過去' : '還是要過去');
  resolvePending(s);
  E.step(s, 0.05, null);
  resolvePending(s);
  assert.equal(s.world.map, 'beiyuan');
  return s;
}

/** Walk to and fro over open snow until something comes of it (or not): what comes, and what was said on the way. */
function walkOut(s, steps = 600, swing = 50) {
  const said = [];
  s.world.enc = -1e9;
  for (let k = 0; k < steps; k++) {
    E.step(s, 0.1, { x: k % (swing * 2) < swing ? 1 : -1, y: 0 });
    said.push(...(E.takeFeed(s) || []).map((f) => f.text));
    if (s.pending) return { id: s.pending.id, said };
  }
  return { id: null, said };
}

/** Walk east onto a place from a little way west of it (an auto place: it comes of itself). */
function walkOnto(s, id) {
  const p = POI_BY_ID[id];
  E.placeAt(s, p.x - p.auto - 60, p.y);
  resolvePending(s);
  for (let k = 0; k < 120 && !s.pending; k++) E.step(s, 0.05, { x: 1, y: 0 });
  return s.pending?.id;
}

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

/** Call on someone and take the choice named. */
function call(s, npc, pick) {
  A.visit(s, npc, { near: true });
  assert.ok(s.pending, `${npc} has something to say`);
  pickText(s, pick);
  resolvePending(s);
}

/** Is one of these out in the world now (after a breath of it)? */
function about(s, kind) {
  E.step(s, 0.05, null);
  return CB.beastsInWorld(s, 99999).some((b) => b.kind === kind);
}

/** Out on open snow, nothing laired near (between the ways to the camp and to the rift). */
const SNOWFIELD = [2900, 2300];

test('雁回嶺: a 築基 crosses as he likes; one below it may cross too, and pays for it — and comes out at 雪嶺口', () => {
  const s = over(61);
  assert.ok(s.flags.beiyuan_crossed && s.seen.beiyuan_arrive, 'over, and the first sight said');
  assert.equal(regionAt(s, s.world.x, s.world.y), 'xueling_kou');
  const t = fresh(62);
  Object.assign(t.player, { realm: 1, stage: 8 });
  goToPoi(t, 'yanhui_gate', 0);
  resolvePending(t);
  E.interact(t, { kind: 'poi', id: 'yanhui_gate' });
  assert.ok(t.pending.text.includes('本系統提醒'), 'warned');
  assert.ok(!t.pending.choices.some((c) => c.text === '翻過去。'), 'not the easy way');
  const hp = pools(t).hp;
  pickText(t, '還是要過去');
  resolvePending(t);
  E.step(t, 0.05, null);
  resolvePending(t);
  assert.equal(t.world.map, 'beiyuan', 'free to go');
  assert.ok(t.player.injury > 0 || t.player.hp < hp, 'and it cost him');
});

test('the beasts of 北原 are whole: an element, a page in the 圖鑑, moves that exist, a drawing; each on open ground, none in the fort, the camp or at the way down', () => {
  for (const kind of NEW) {
    const F = FOES[kind];
    assert.ok(WUXING.includes(F.el), `${kind}: an element`);
    assert.ok(BEAST_NOTES[kind]?.note, `${kind}: a page in the 圖鑑`);
    assert.ok(BIG_BEASTS.has(kind), `${kind}: drawn`);
    assert.equal(F.rt.tier, 2, `${kind}: a beast of the second order`);
    for (const id of [...F.rt.moves, ...(F.rt.phases || []).flatMap((p) => p.moves || [])]) assert.ok(BEAST_MOVES[id], `${kind}: ${id}`);
  }
  assert.equal(BEAST_MOVES.wolfcall.call.kind, 'ice_wolf', '白狼王 calls his pack');
  assert.equal(BEAST_MOVES.broodsilk.call.kind, 'ice_silkworm', '冰蠶母 calls her brood');
  assert.equal(BEAST_MOVES.apecall.call.kind, 'snow_ape', '雪猿王 calls his apes');
  useMap('beiyuan');
  try {
    for (const def of BEASTS) {
      const here = regionAt({ flags: { node_open: false } }, def.x, def.y);
      assert.equal(mapOf(here), 'beiyuan');
      assert.ok(isReachable(def.x, def.y) && !collides(null, def.x, def.y, 12), `${def.id} stands on open ground`);
      assert.ok(!['hantie_fort', 'bailang_camp', 'xueling_kou'].includes(here), `${def.id} keeps out of the fort, the camp and the way down`);
    }
    for (const kind of NEW) assert.ok(BEASTS.some((b) => b.kind === kind), `${kind} is out there somewhere`);
  } finally {
    useMap('donghuang');
  }
});

test('the cold gets into you out on the snow: a warning, then it takes you — not in the fort, not in a wolf-fur coat (but for a blizzard), not at all past 金丹', () => {
  const s = over(63);
  E.placeAt(s, ...SNOWFIELD);
  resolvePending(s);
  s.vars.sky = 'clear';
  s.tod = 11;
  const a = walkOut(s);
  assert.ok(a.said.some((t) => t.includes('寒氣一陣一陣地往骨頭裡鑽')), 'warned first');
  assert.equal(a.id, 'by_cold', 'and then it takes you');
  pickText(s, '背風的大石頭');
  resolvePending(s);
  assert.ok((s.world.exposed || 0) < 1500 * 0.5, 'eased');
  // in the fort, by its fires, it does not build up
  E.placeAt(s, ...NODES.hantie_fort.at);
  resolvePending(s);
  s.day += 1;
  s.world.exposed = 0;
  s.tod = 11;
  assert.equal(walkOut(s, 200, 12).id, null);
  assert.equal(s.world.exposed || 0, 0, 'no cold by the fire');
  // a coat of white wolf's fur: the cold stays out (a blizzard's only halfway)
  s.player.items.langqiu = 1;
  wear(s, 'langqiu');
  assert.equal(E.coldRate(s), 0);
  E.placeAt(s, ...SNOWFIELD);
  resolvePending(s);
  s.day += 1;
  s.tod = 11;
  assert.equal(walkOut(s).id, null, 'kept warm');
  s.vars.sky = 'blizzard';
  assert.ok(E.coldRate(s) > 0, 'a blizzard gets through the fur, half of it');
  s.day += 1;
  s.tod = 11;
  const b = walkOut(s, 900);
  assert.equal(b.id, 'by_blizzard');
  pickText(s, '挖個雪洞');
  resolvePending(s);
  // 寒暑不侵
  s.player.realm = 3;
  s.player.stage = 0;
  assert.equal(E.coldRate(s), 0, 'past 金丹 the cold cannot touch you');
  // one not yet past 築基 feels it the more
  const t = over(64, 1, 8);
  t.vars.sky = 'clear';
  t.tod = 11;
  const u = over(65);
  u.vars.sky = 'clear';
  u.tod = 11;
  assert.ok(E.coldRate(t) > E.coldRate(u), '煉氣 feels it more');
});

test('北冥\'s thin ice: dark where it is thin, and it gives as you walk onto it; edging back or running for it, or a light foot over it', () => {
  const s = over(66);
  assert.equal(walkOnto(s, 'ti_b'), 'by_thin_ice');
  pickText(s, '趴下來');
  resolvePending(s);
  // a light foot (輕身術) is over it before it can give
  const t = over(67);
  t.player.arts = [...(t.player.arts || []), 'qingshen'];
  assert.equal(walkOnto(t, 'ti_c'), 'by_thin_ice');
  const injury = t.player.injury;
  pickText(t, '點冰而過');
  resolvePending(t);
  assert.equal(t.player.injury, injury, 'not a scratch');
});

test('雪山: the snow comes down off the slope — run across its way, or get behind a rock; a sword under you, and you are above it', () => {
  const s = over(68);
  E.placeAt(s, 2700, 1300);
  resolvePending(s);
  assert.equal(regionAt(s, s.world.x, s.world.y), 'xueshan');
  startEvent(s, 'by_avalanche');
  assert.equal(s.pending?.id, 'by_avalanche');
  assert.ok(!s.pending.choices.some((c) => c.text.includes('御劍')), 'no sword art, no flying');
  pickText(s, '往橫裡跑');
  resolvePending(s);
  s.player.arts = [...(s.player.arts || []), 'yujian'];
  s.player.weapon ||= 'qinggang_sword';
  s.player.items[s.player.weapon] = 1;
  s.day += 3;
  startEvent(s, 'by_avalanche');
  const injury = s.player.injury;
  pickText(s, '御劍飛起來');
  resolvePending(s);
  assert.equal(s.player.injury, injury);
});

test('寒鐵礦: 霍堡主 asks; the boards come off the deepest way and the 冰蠶母 is there; one of the three in her cocoons still breathes; the mine opens, the smith is cheaper, and 顧遠 can go home with his iron', () => {
  const s = over(71);
  E.placeAt(s, ...NODES.hantie_fort.at);
  resolvePending(s);
  assert.equal(nextGoal(s)?.key, 'by:fort', 'the line at the top: the master of the fort');
  call(s, 'gu_yuan', '怎麼跑到北原');
  assert.ok(s.flags.guyuan_met);
  call(s, 'huo_bao', '出了什麼事');
  assert.ok(s.flags.mine_asked);
  assert.equal(nextGoal(s)?.key, 'by:deep');
  useMap('beiyuan');
  assert.ok(!about(s, 'silk_queen'), 'not while the boards are up');
  at(s, 'mine_deep', '撬開木板');
  assert.ok(s.flags.mine_deep_open);
  assert.ok(about(s, 'silk_queen'), 'and there she is');
  assert.equal(nextGoal(s)?.key, 'by:queen');
  // she falls
  s.vars.kills = { ...(s.vars.kills || {}), silk_queen: 1 };
  assert.equal(nextGoal(s)?.key, 'by:cocoons');
  const silk = s.player.items.bingcan_silk || 0;
  at(s, 'mine_deep', '剖開');
  assert.ok(s.flags.miner_saved && s.player.items.bingcan_silk === silk + 2, 'one of them still breathes');
  assert.equal(nextGoal(s)?.key, 'by:huo');
  const price = A.priceOf(s, 'hantie_sword');
  const ls = s.player.ls;
  call(s, 'huo_bao', '死了');
  assert.ok(s.flags.mine_cleared && s.player.ls === ls + 300 && s.player.items.hantie_ore >= 3);
  goToPoi(s, 'ht_smithy');
  resolvePending(s);
  assert.ok(A.priceOf(s, 'hantie_sword') <= price, 'the smith asks no more of you');
  // the smithy and the store stand side by side: each is its own shop
  assert.equal(A.shopHere(s)?.name, '鐵匠鋪');
  goToPoi(s, 'ht_store');
  resolvePending(s);
  assert.ok(A.shopHere(s)?.stock.includes('shaodaozi'), 'at the store, the store');
  assert.equal(nextGoal(s)?.key, 'by:guyuan');
  call(s, 'gu_yuan', '回家去吧');
  assert.ok(s.flags.guyuan_done);
  assert.equal(s.npcs.gu_yuan.loc, 'qingyun_sect', 'home to 青雲宗');
  checkFeats(s);
  assert.ok(s.vars.feats.beiyuan !== undefined && s.vars.feats.mine !== undefined, '北上 and 寒鐵 earned');
  useMap('donghuang');
});

test('北冥: 冰叟 has waited all his life to see what sleeps under the ice; by day the ice is only dark — 神識 (or the night) shows it; told, he gives you the feather', () => {
  const s = over(72);
  E.placeAt(s, ...NODES.beiming.at);
  resolvePending(s);
  call(s, 'bing_sou', '釣了多少年');
  assert.ok(s.flags.bingsou_met);
  assert.equal(nextGoal(s)?.key, 'by:kun');
  s.tod = 11;
  at(s, 'bm_middle', '趴在冰上');
  assert.ok(!s.flags.kun_seen, 'by day, only the dark');
  s.day += 1;
  at(s, 'bm_middle', '放出神識');
  assert.ok(s.flags.kun_seen, 'and something vast turns to look at you');
  assert.equal(nextGoal(s)?.key, 'by:bingsou');
  call(s, 'bing_sou', '我看見了');
  assert.ok(s.flags.bingsou_told && s.player.items.peng_feather === 1, 'the feather');
  checkFeats(s);
  assert.ok(s.vars.feats.kun !== undefined);
});

test('靈脈裂谷, the flower: 寒衣 says the 冰麟 likes snow lotus; three of them, and it gives up the knot — 寒魄訣 and its 冰魄寒獄, the 凝金丹 recipe, her promise; a drop of 靈髓 from it now and then', () => {
  const s = over(73);
  E.placeAt(s, ...NODES.lingmai_rift.at);
  resolvePending(s);
  useMap('beiyuan');
  assert.ok(about(s, 'ice_qilin'), 'it lies on the knot');
  call(s, 'han_yi', '一個人住在這裡');
  assert.ok(s.flags.hanyi_met && s.nodes.tianjing_peak.known);
  assert.equal(nextGoal(s)?.key, 'by:lotus');
  s.player.items.xuelian = 3;
  assert.equal(nextGoal(s)?.key, 'by:feed');
  startEvent(s, 'lm_qilin');
  assert.ok(s.pending.choices.some((c) => c.text.includes('雪蓮')) && s.pending.choices.some((c) => c.text.includes('拔劍')), 'a flower, or a sword');
  pickText(s, '雪蓮');
  resolvePending(s);
  assert.ok(s.flags.qilin_fed && s.flags.node_open && !(s.player.items.xuelian > 0));
  assert.ok(!about(s, 'ice_qilin'), 'it lies at the foot of the cliff now, not on the knot');
  assert.equal(regionAt(s, 4120, 900), 'lingmai_node', 'the knot is open');
  assert.equal(nextGoal(s)?.key, 'by:hanyi');
  assert.ok(SK.lockOf(s, SK.moveOf(s, 'hanyu')), '冰魄寒獄 not yet');
  call(s, 'han_yi', '冰麟讓開了');
  assert.ok(s.player.techs.includes('hanpo'), '寒魄訣 learned');
  assert.equal(SK.lockOf(s, SK.moveOf(s, 'hanyu')), null, '冰魄寒獄 is yours');
  assert.ok(s.flags.recipe_ningjin && recipesKnown(s).includes('ningjin_pill'), 'the 凝金丹 recipe');
  assert.ok(s.flags.hanyi_guard, 'and she will stand by you when you form your 金丹');
  at(s, 'lm_vein', '撿起靈髓');
  assert.equal(s.player.items.lingsui, 1, 'a drop of 靈髓');
  // one of 寒魄訣 feels the cold far less
  s.vars.sky = 'clear';
  s.player.tech = 'qingmu';
  const was = E.coldRate(s);
  s.player.tech = 'hanpo';
  assert.ok(E.coldRate(s) < was * 0.5);
  checkFeats(s);
  assert.ok(s.vars.feats.qilin !== undefined && s.vars.feats.qilin_fed !== undefined);
  useMap('donghuang');
});

test('靈脈裂谷, the sword: fought and beaten, the knot is open all the same; 寒衣 gives the recipe and no more — and killed out in the world, the knot opens at the vein', () => {
  const s = over(74, 2, 3);
  E.placeAt(s, ...NODES.lingmai_rift.at);
  resolvePending(s);
  call(s, 'han_yi', '一個人住在這裡');
  startEvent(s, 'lm_qilin');
  pickText(s, '拔劍');
  resolvePending(s);
  assert.ok(s.flags.node_open && s.flags.qilin_slain && !s.flags.qilin_fed);
  call(s, 'han_yi', '冰麟死了');
  assert.ok(s.flags.recipe_ningjin && !s.player.techs.includes('hanpo') && !s.flags.hanyi_guard, 'the recipe, and no more');
  // killed in the world, not through its story
  const t = over(75, 2, 3);
  t.vars.kills = { ...(t.vars.kills || {}), ice_qilin: 1 };
  E.placeAt(t, ...NODES.lingmai_rift.at);
  resolvePending(t);
  assert.equal(nextGoal(t)?.key, 'by:node');
  at(t, 'lm_vein', '走上靈脈結');
  assert.ok(t.flags.node_open);
});

test('白狼部: 阿蘭\'s father went east after the 白狼王 three years ago; under a mound of snow out east, his bones and his knife; she has his coat for you', () => {
  const s = over(76);
  E.placeAt(s, ...NODES.bailang_camp.at);
  resolvePending(s);
  assert.equal(nextGoal(s)?.key, 'by:camp');
  call(s, 'a_lan', '這張弓');
  assert.ok(s.flags.alan_asked);
  assert.equal(nextGoal(s)?.key, 'by:remains');
  // (the king of the wolves keeps out of the way, this once)
  s.world.mobs = { ...(s.world.mobs || {}), bailang_king_a: s.day + 999, ice_wolves_b: s.day + 999 };
  at(s, 'bl_remains', '獵刀');
  assert.equal(s.player.items.alan_knife, 1);
  assert.equal(nextGoal(s)?.key, 'by:alan');
  E.placeAt(s, ...NODES.bailang_camp.at);
  resolvePending(s);
  const coats = s.player.items.langqiu || 0;
  call(s, 'a_lan', '獵刀給她');
  assert.ok(s.flags.alan_closure && !(s.player.items.alan_knife > 0) && s.player.items.langqiu === coats + 1);
});

test('不周山: up on the broken pillar (only the flying come), the gate — and under its threshold, a page of 玄微\'s; the system says where it lies, at its fifth level', () => {
  const s = over(77);
  s.sys.lv = 5;
  s.sys.frags = s.sys.frags || [];
  assert.ok(s.sys.frags.length < 9);
  at(s, 'bz_gate', '取出來');
  assert.ok(s.sys.frags.includes('frag_snow') && FRAGMENTS.frag_snow.text.includes('天柱'));
  checkFeats(s);
  assert.ok(s.vars.feats.tianmen !== undefined);
});

test('寒鐵堡\'s tavern: ask after the places of the north, and you know where they are; a dead man out on the snow has a letter for 青石鎮', () => {
  const s = over(78);
  E.placeAt(s, ...NODES.hantie_fort.at);
  resolvePending(s);
  startEvent(s, 'ht_inquire');
  pickText(s, '打聽裂谷');
  resolvePending(s);
  assert.ok(s.nodes.lingmai_rift.known);
  startEvent(s, 'by_frozen_miner');
  pickText(s, '取出那封信');
  resolvePending(s);
  assert.equal(s.player.items.frozen_letter, 1);
});

test('the lands and the road of a cultivator: each says what it is a match for; 地利 where your 功法 is of the land\'s element; 金丹 is easier with 凝金丹, on the knot of the veins, with 寒衣 standing by', () => {
  for (const [id, M] of Object.entries(MAPS)) assert.ok(M.realm, `${id} says what it is a match for`);
  // 地利: 北原 is of 水
  const s = over(81, 2, 3);
  s.player.techs = [...new Set([...(s.player.techs || []), 'xuanshui', 'qingmu'])];
  s.player.root = { ...s.player.root, els: ['金'] };
  s.player.tech = 'xuanshui';
  assert.equal(rateParts(s).land, 1.15, '玄水真經 in the north');
  s.player.tech = 'qingmu';
  assert.equal(rateParts(s).land, 1, '青木訣 is not of the north');
  s.player.root = { ...s.player.root, els: ['水'] };
  assert.equal(rateParts(s).land, 1.05, 'a 水 root, a little');
  // 金丹: 凝金丹 (each a share, two at most), the knot, 寒衣
  s.player.xw = 1e9;
  s.player.items.ningjin_pill = 3;
  const bare = breakthroughInfo(s).chance;
  const two = breakthroughInfo(s, { pills: 3 });
  assert.ok(two.parts.some(([k, v]) => k === '凝金丹 ×2' && Math.abs(v - 0.3) < 1e-9), 'two pills at most, 一成五 each');
  assert.ok(two.chance > bare);
  s.flags.node_open = true;
  E.placeAt(s, 4120, 900);
  resolvePending(s);
  assert.equal(s.player.loc, 'lingmai_node');
  s.flags.hanyi_guard = true;
  const parts = breakthroughInfo(s).parts.map(([k]) => k);
  assert.ok(parts.includes('靈脈結') && parts.includes('寒衣護法'));
  A.attemptBreakthrough(s, 2);
  resolvePending(s);
  assert.equal(s.player.items.ningjin_pill, 1, 'two taken, whatever came of it');
});

test('secluded on the knot of the veins before 築基, the 靈氣 comes in faster than the meridians can take it — a wound now and then; past 築基, none', () => {
  const s = over(82, 1, 8);
  s.flags.node_open = true;
  E.placeAt(s, 4120, 900);
  s.player.loc = 'lingmai_node';
  s.player.injury = 0;
  const r = newReport();
  advance(s, 120, 'seclusion', r);
  assert.ok(r.toasts.some((t) => t.includes('經脈受損')), 'the meridians torn');
  const t = over(83, 2, 0);
  t.flags.node_open = true;
  t.player.loc = 'lingmai_node';
  t.player.injury = 0;
  const r2 = newReport();
  advance(t, 120, 'seclusion', r2);
  assert.ok(!r2.toasts.some((x) => x.includes('經脈受損')), 'a 築基 takes it');
});

test('a save in 北原 keeps its people and your doings (and where 顧遠 went); an old save gains the people of 北原, not met', async () => {
  const { serialize, parseSave } = await import('../src/core/save.js');
  const s = over(84);
  E.placeAt(s, ...NODES.hantie_fort.at);
  resolvePending(s);
  call(s, 'huo_bao', '出了什麼事');
  s.npcs.gu_yuan.loc = 'qingyun_sect';
  const t = parseSave(serialize(s));
  assert.ok(t.flags.mine_asked && t.npcs.gu_yuan.loc === 'qingyun_sect', 'what you asked of them, and where they went');
  assert.equal(t.world.map, 'beiyuan', 'still in the north');
  const old = JSON.parse(serialize(fresh(85)));
  const PEOPLE = ['huo_bao', 'a_lan', 'bing_sou', 'han_yi', 'gu_yuan'];
  for (const id of PEOPLE) delete old.npcs[id];
  const u = parseSave(JSON.stringify(old));
  for (const id of PEOPLE) assert.ok(u.npcs[id] && !u.npcs[id].met, `${id} is there to meet`);
});
