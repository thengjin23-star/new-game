// 修士的本錢: blood and 靈力 that go with you, what you wear, the 術 you cast
// as you go, and the 符 you burn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import * as A from '../src/core/actions.js';
import * as AR from '../src/world/arts.js';
import { pools, vitals, gearOf, wear } from '../src/core/body.js';
import { startEvent, choose } from '../src/core/events.js';
import { serialize, parseSave } from '../src/core/save.js';
import { POI_BY_ID, BEASTS } from '../src/world/places.js';
import { NODES } from '../src/world/map.js';
import { nearestOpen } from '../src/world/terrain.js';
import { ITEMS, SHOPS } from '../src/content/items.js';
import { MOVES } from '../src/content/moves.js';
import { SPELLS, TALISMANS } from '../src/content/arts.js';
import { fresh, resolvePending, goToPoi } from './helpers.js';

const DT = 1 / 30;
const MEADOW = [1426, 3782];

function ready(seed, realm = 1, stage = 4) {
  const s = fresh(seed);
  Object.assign(s.player, { realm, stage, injury: 0 });
  E.placeAt(s, ...MEADOW);
  resolvePending(s);
  s.tod = 14;
  return s;
}

function steps(s, secs, input = null) {
  for (let t = 0; t < secs && !s.pending && !s.dead; t += DT) E.step(s, DT, input);
}

test('blood and 靈力 are yours: kept in the save, the same in a fight and out of it', () => {
  const s = ready(1);
  const V = pools(s);
  assert.equal(V.hp, V.cap, 'a life starts whole');
  assert.ok(V.maxMp > 0);
  const me = CB.hero(s);
  me.hp = 20;
  me.mp = 3;
  assert.equal(s.player.hp, 20, 'what the fight does to you is what happens to you');
  const t = parseSave(serialize(s));
  assert.equal(t.player.hp, 20);
  assert.equal(t.player.mp, 3);
  assert.equal(CB.hero(t).hp, 20, 'and still so after a reload');
});

test('walking brings them back slowly; rest, quickly; 閉關, fully', () => {
  const s = ready(2);
  const V = pools(s);
  s.player.hp = 10;
  s.player.mp = 0;
  steps(s, 10, { x: 1, y: 0 });
  assert.ok(s.player.hp > 10 && s.player.hp < V.cap * 0.25, `slowly as you go (${Math.round(s.player.hp)})`);
  assert.ok(s.player.mp > 0);
  E.rest(s, 2);
  assert.ok(s.player.hp > V.cap * 0.45, 'two hours of rest: a good part of it back');
  s.player.hp = 1;
  s.player.mp = 0;
  A.startSeclusion(s, 30, 0, 1);
  A.tickSeclusion(s, 1e12);
  resolvePending(s);
  assert.equal(s.player.hp, vitals(s).cap);
  assert.equal(s.player.mp, vitals(s).maxMp);
});

test('a pill or a herb from the bag gives blood back', () => {
  const s = ready(3);
  s.player.items.heal_pill = 1;
  const V = pools(s);
  s.player.hp = 10;
  A.useItem(s, 'heal_pill');
  resolvePending(s);
  assert.ok(s.player.hp >= 10 + V.cap * 0.44);
  assert.equal(s.player.items.heal_pill, undefined);
});

test('what you wear: a robe, a charm, a 法器 — more blood, blows kept off; off again; gone if you sell it', () => {
  const s = ready(4);
  const before = vitals(s);
  Object.assign(s.player.items, { wolf_coat: 1, peace_buckle: 1, zijin_bell: 1 });
  for (const id of ['wolf_coat', 'peace_buckle', 'zijin_bell']) A.equip(s, id);
  assert.deepEqual(gearOf(s), { weapon: s.player.weapon, robe: 'wolf_coat', charm: 'peace_buckle', relic: 'zijin_bell' });
  const after = vitals(s);
  assert.ok(after.maxHp > before.maxHp * 1.1, 'more blood');
  assert.ok(Math.abs(after.G.def - 0.12) < 1e-9, 'a share of every blow kept off');
  // what a 法器 lets you do, you can do only while you wear it
  const bell = () => CB.movesOf(s).find((m) => m.id === 'bell');
  assert.equal(bell().locked, null);
  A.equip(s, 'zijin_bell');
  assert.ok(bell().locked?.includes('紫金鈴'));
  // the coat goes with what you sell
  goToPoi(s, 'smithy_stall', 20);
  resolvePending(s);
  A.sell(s, 'wolf_coat');
  assert.equal(gearOf(s).robe, null);
});

test('gear keeps blows off in a fight; fire, what keeps fire off', () => {
  // (not so strong that the wolves will not come)
  const s = ready(5, 1, 1);
  const def = BEASTS.find((b) => b.id === 'wolves_a');
  E.placeAt(s, ...nearestOpen(s, def.x + 60, def.y));
  resolvePending(s);
  s.tod = 22;
  for (let k = 0; k < 300 && !CB.inCombat(s); k++) {
    E.step(s, DT, null);
    resolvePending(s);
  }
  const me = CB.hero(s);
  const wolf = CB.beastsInWorld(s, 600).find((b) => b.def.id === 'wolves_a' && b.aggro);
  // the rest of the pack held off, so it is one wolf's blow every time
  for (const x of CB.beastsInWorld(s, 3000)) if (x !== wolf) Object.assign(x, { state: 'stun', st: 0, stunT: 999 });
  const w = s.world;
  // the same blow, again and again, from right beside you
  const blows = (move) => {
    let sum = 0;
    for (let k = 0; k < 30; k++) {
      me.hp = me.cap;
      me.inv = 0;
      // (no fire left lying about from the last one)
      CB.combatOf(s).pools = [];
      E.placeAt(s, wolf.x + 20, wolf.y);
      const d = Math.hypot(w.x - wolf.x, w.y - wolf.y);
      Object.assign(wolf, { state: 'windup', st: 0, move, wind: 0.001, aim: [(w.x - wolf.x) / d, (w.y - wolf.y) / d], from: [wolf.x, wolf.y], combo: 0 });
      E.step(s, DT, null);
      sum += me.cap - me.hp;
    }
    return sum;
  };
  const bare = blows('nip');
  const bareFire = blows('breath');
  s.player.items.tiger_robe = 1;
  wear(s, 'tiger_robe');
  CB.hero(s);
  const robed = blows('nip');
  assert.ok(robed < bare * 0.97, `the robe keeps some of a blow off (${robed} < ${bare})`);
  assert.ok(blows('breath') < bareFire * 0.55, 'and half of fire');
});

test('the smithy makes gear from what you bring', () => {
  const s = ready(6);
  goToPoi(s, 'smithy_stall', 20);
  resolvePending(s);
  s.player.ls = 100;
  assert.ok(SHOPS.smithy.recipes.includes('wolf_coat'));
  assert.equal(A.canCraft(s, 'wolf_coat'), false, 'not without the pelts');
  s.player.items.wolf_pelt = 5;
  assert.ok(A.canCraft(s, 'wolf_coat'));
  A.craft(s, 'wolf_coat');
  resolvePending(s);
  assert.equal(s.player.items.wolf_coat, 1);
  assert.equal(s.player.items.wolf_pelt, 1);
  assert.equal(s.player.ls, 70);
});

test('every piece of gear is worn somewhere, gives something, and can be had (bought, made, or given)', async () => {
  const sold = new Set(Object.values(SHOPS).flatMap((x) => [...x.stock, ...(x.recipes || [])]));
  // (or some story gives it to you)
  const { EVENT_LIST } = await import('../src/content/index.js');
  const given = JSON.stringify(EVENT_LIST, (k, v) => (typeof v === 'function' ? undefined : v));
  for (const id of Object.keys(ITEMS)) if (given.includes(`["item","${id}"`)) sold.add(id);
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.kind !== 'gear') continue;
    assert.ok(['robe', 'charm', 'relic'].includes(it.slot), `${id}: where`);
    assert.ok(Object.keys(it.stats || {}).length || it.move, `${id}: what`);
    assert.ok(sold.has(id), `${id}: where to get it`);
    if (it.move) assert.equal(MOVES[it.move]?.relic, id, `${id}: its move`);
    for (const k of Object.keys(it.craft?.items || {})) assert.ok(ITEMS[k], `${id}: made from ${k}`);
  }
  for (const id of Object.keys(TALISMANS)) assert.equal(ITEMS[id]?.kind, 'talisman', id);
});

test('神識: what lies hidden within reach shows itself (a place, a snake in the grass); it costs 靈力 and needs a breath', () => {
  const s = ready(7, 1, 6);
  const stele = POI_BY_ID.stele;
  E.placeAt(s, ...nearestOpen(s, stele.x + 200, stele.y + 20));
  resolvePending(s);
  assert.ok(!(stele.id in s.world.found), 'not seen yet');
  const mp = pools(s).mp;
  assert.ok(AR.castArt(s, 'sense'));
  assert.ok(stele.id in s.world.found, 'the 斷碑, found');
  assert.equal(pools(s).mp, mp - SPELLS.sense.mp);
  assert.equal(AR.castArt(s, 'sense'), false, 'not again at once');
  // a snake lying in wait shows itself
  const def = BEASTS.find((b) => b.id === 'snake_a');
  s.day = 150;
  E.placeAt(s, ...nearestOpen(s, def.x + 120, def.y));
  resolvePending(s);
  steps(s, 0.2);
  const snake = CB.beastsInWorld(s, 600).find((b) => b.def.id === 'snake_a');
  assert.equal(snake?.state, 'hide');
  assert.ok(!CB.sensed(s, snake));
  CB.hero(s).cds['art:sense'] = 0;
  AR.castArt(s, 'sense');
  assert.ok(CB.sensed(s, snake), 'marked where it lies');
  // a mortal has no 神識 to speak of
  const m = ready(8, 0, 0);
  assert.ok(AR.spellLock(m, 'sense'));
  assert.equal(AR.castArt(m, 'sense'), false);
});

test('斂息: a beast has to come right up to you before it notices; striking breaks it', () => {
  const s = ready(9, 1, 3);
  s.player.techs.push('lianxi');
  const def = BEASTS.find((b) => b.id === 'wolves_a');
  s.tod = 14;
  E.placeAt(s, ...nearestOpen(s, def.x + 170, def.y));
  resolvePending(s);
  assert.ok(AR.castArt(s, 'conceal'));
  steps(s, 2);
  assert.ok(!CB.inCombat(s), 'they let you be');
  CB.attackCmd(s);
  assert.equal(CB.hero(s).hidden, 0);
});

test('符 out in the world: 神行 quickens your step; 歸元 takes you back to a town you know', () => {
  const s = ready(10);
  s.player.items.swift_talisman = 1;
  const slow = E.walkMult(s);
  assert.ok(AR.castArt(s, 'swift_talisman'));
  assert.ok(E.walkMult(s) > slow * 1.4);
  assert.equal(s.player.items.swift_talisman, undefined);
  s.player.items.return_talisman = 1;
  E.placeAt(s, 2900, 2500);
  resolvePending(s);
  s.nodes.qingshi_town.visited = true;
  s.nodes.luoxia_market.visited = false;
  AR.castArt(s, 'return_talisman');
  const [tx, ty] = NODES.qingshi_town.at;
  assert.ok(Math.hypot(s.world.x - tx, s.world.y - ty) < 120, 'back in 青石鎮, the nearest you know');
});

test('符 in a fight: burnt from its own button, gone after, and no 靈力 spent', () => {
  const s = ready(11, 1, 1);
  const def = BEASTS.find((b) => b.id === 'wolves_a');
  E.placeAt(s, ...nearestOpen(s, def.x + 60, def.y));
  resolvePending(s);
  s.tod = 22;
  for (let k = 0; k < 300 && !CB.inCombat(s); k++) {
    E.step(s, DT, null);
    resolvePending(s);
  }
  assert.ok(CB.inCombat(s));
  s.player.items.fire_talisman = 2;
  const mp = pools(s).mp;
  assert.equal(CB.talismanOf(s), 'fire_talisman');
  assert.ok(CB.talismanCmd(s));
  assert.equal(s.player.items.fire_talisman, 1);
  assert.equal(pools(s).mp, mp);
  assert.equal(CB.talismanCmd(s), false, 'not two at once');
});

test('瘴氣: a 避瘴符, or 靈力 to seal yourself against it', () => {
  const s = ready(12, 1, 2);
  s.player.items.miasma_talisman = 1;
  startEvent(s, 'forest_poison');
  const texts = s.pending.choices.map((c) => c.text);
  assert.ok(texts.some((t) => t.includes('避瘴符')) && texts.some((t) => t.includes('靈力')));
  s.player.mp = 5;
  startEvent(s, 'forest_poison');
  const seal = s.pending.choices.find((c) => c.text.includes('靈力'));
  assert.ok(seal.disabled, 'not with 5 靈力');
  const full = pools(s).maxMp;
  s.player.mp = full;
  startEvent(s, 'forest_poison');
  choose(s, s.pending.choices.find((c) => c.text.includes('靈力')).i);
  assert.equal(s.player.mp, full - 12);
});
