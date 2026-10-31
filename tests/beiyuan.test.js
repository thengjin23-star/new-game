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
import { fresh, resolvePending, goToPoi, pickText } from './helpers.js';

const NEW = ['ice_wolf', 'snow_leopard', 'ice_silkworm', 'snow_ape', 'snow_wraith', 'bailang_king', 'silk_queen', 'ape_king', 'ice_qilin'];

/** Over 雁回嶺 into 北原 at the realm given, standing below the cairn of 雪嶺口 (the first sights said). */
function over(seed, realm = 2, stage = 5) {
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
function walkOut(s, steps = 600) {
  const said = [];
  s.world.enc = -1e9;
  for (let k = 0; k < steps; k++) {
    E.step(s, 0.1, { x: k % 100 < 50 ? 1 : -1, y: 0 });
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
  assert.equal(walkOut(s, 200).id, null);
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
