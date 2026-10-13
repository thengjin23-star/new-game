// 五行 and the new ways to fight (0.16): 相剋 on a foe, 相生 from move to
// move (連招), the third of a run of blows; 飛劍, 劍陣, 玄冰刺, 藤縛; and the
// new foes — 山魈, 木魅 and 玄龜 — with roots that hold you and whirlpools
// that drag at your feet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as C from '../src/world/combat.js';
import { BEASTS } from '../src/world/places.js';
import { FOES } from '../src/content/foes.js';
import { MOVES, BEAST_MOVES } from '../src/content/moves.js';
import { TALISMANS } from '../src/content/arts.js';
import { ITEMS, SHOPS } from '../src/content/items.js';
import { WUXING, SHENG, KE, keOf, CHAIN, ROOT_MULT } from '../src/content/wuxing.js';
import { BEAST_NOTES } from '../src/content/codex.js';
import { EVENTS } from '../src/content/index.js';
import { migrate } from '../src/core/save.js';
import { collides, regionIdAt, regionAt } from '../src/world/terrain.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;
const DEF = (id) => BEASTS.find((b) => b.id === id);

/** A cultivator of the given realm and stage, with nothing learned unless told; a 靈根 of earth alone (no move of theirs is of it, below). */
function cultivator(seed, extra = {}) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 1, stage: 3, weapon: 'chaidao', arts: [], techs: [], tech: null, injury: 0, root: { type: 'single', els: ['土'] } }, extra);
  s.tod = 15;
  return s;
}

function play(s, secs, done = () => false) {
  for (let k = 0; k < secs / DT; k++) {
    E.step(s, DT, null);
    if (done(s)) return true;
  }
  return false;
}

/** Open ground in the wilds south-west of 青石鎮. */
const MEADOW = [1426, 3782];

/** Stand in the open with members of a group set about you (dx, dy each), still and waiting. */
function among(s, def, spots, tod = 15) {
  let at = null;
  for (let r = 0; r < 500 && !at; r += 30) {
    for (let a = 0; a < 6.28 && !at; a += 0.5) {
      const x = MEADOW[0] + Math.cos(a) * r;
      const y = MEADOW[1] + Math.sin(a) * r;
      const home = regionIdAt(x, y);
      let ok = !collides(s, x, y, 16);
      for (let q = 0; q < 6.28 && ok; q += 0.4) {
        for (let d = 10; d <= 240 && ok; d += 10) {
          const px = x + Math.cos(q) * d;
          const py = y + Math.sin(q) * d;
          if (collides(s, px, py, 12) || regionIdAt(px, py) !== home) ok = false;
        }
      }
      if (ok) at = [x, y];
    }
  }
  assert.ok(at, 'open ground');
  E.placeAt(s, at[0], at[1]);
  resolvePending(s);
  s.tod = tod;
  const w = s.world;
  const list = C.beastsInWorld(s, 99999).filter((b) => b.def.id === def.id);
  spots.forEach(([dx, dy], i) => Object.assign(list[i], { x: w.x + dx, y: w.y + dy, state: 'recover', st: 0, rec: 99, aggro: true }));
  return list.slice(0, spots.length);
}

const hurtPops = (s, since = -1) => C.combatOf(s).pops.filter((p) => p.t0 > since && ['dmg', 'crit', 'ke', 'weak'].includes(p.kind));

test('五行: each overcomes one and gives rise to one, round the circle', () => {
  assert.equal(new Set(Object.values(SHENG)).size, 5);
  assert.equal(new Set(Object.values(KE)).size, 5);
  for (const e of WUXING) {
    assert.notEqual(SHENG[e], e);
    assert.notEqual(KE[e], e);
    assert.notEqual(SHENG[e], KE[e], `${e} neither gives rise to and overcomes the same`);
  }
  assert.equal(keOf('金', '木'), 'over');
  assert.equal(keOf('木', '金'), 'under');
  assert.equal(keOf('水', '水'), null);
  assert.equal(keOf(null, '火'), null);
  assert.ok(CHAIN.mult[2] > 1 && CHAIN.mult[3] > CHAIN.mult[2]);
  assert.ok(ROOT_MULT.single > ROOT_MULT.five, 'the purer the 靈根, the more its own moves come to hand');
});

test('every move, foe and 符 of an element is of one of the five; the new foes are whole', () => {
  for (const [id, m] of Object.entries(MOVES)) {
    if (m.el) assert.ok(WUXING.includes(m.el), id);
    if (m.better?.el) assert.ok(WUXING.includes(m.better.el), id);
  }
  for (const [id, f] of Object.entries(FOES)) if (f.el) assert.ok(WUXING.includes(f.el), id);
  for (const [id, t] of Object.entries(TALISMANS)) if (t.fight?.el) assert.ok(WUXING.includes(t.fight.el), id);
  // all five are there to be had among your moves
  assert.deepEqual([...new Set(Object.values(MOVES).flatMap((m) => [m.el, m.better?.el]).filter(Boolean))].sort(), [...WUXING].sort());
  for (const kind of ['shanxiao', 'mumei', 'xuan_turtle']) {
    const F = FOES[kind];
    assert.ok(F.el && BEAST_NOTES[kind], `${kind}: an element, and a page in the 圖鑑`);
    for (const id of [...F.rt.moves, ...(F.rt.phases || []).flatMap((p) => p.moves || [])]) assert.ok(BEAST_MOVES[id], `${kind}: ${id}`);
    const def = BEASTS.find((b) => b.kind === kind);
    assert.ok(def, `${kind} is out there somewhere`);
    const s = fresh(70);
    assert.ok(!collides(s, def.x, def.y, 12), `${kind} stands on open ground`);
    assert.ok(!['qingshi_hill', 'qingshi_town', 'farmland'].includes(regionAt(s, def.x, def.y)), `${kind} is not where a beginner starts`);
  }
  // the tortoise's shell, and what the smithy makes of it
  assert.ok(FOES.xuan_turtle.loot.some(([, item]) => item === 'turtle_shell'));
  assert.ok(SHOPS.smithy.recipes.includes('xuangui_armor') && ITEMS.xuangui_armor.craft.items.turtle_shell);
});

test('相剋: 劍氣 (金) bites deep into a wolf (木), and shallow into the fire tiger (火剋金)', () => {
  const s = cultivator(71);
  C.setKit(s, ['swordqi']);
  const [wolf] = among(s, DEF('wolves_a'), [[0, 90]]);
  E.takeFeed(s);
  assert.ok(C.castCmd(s, 'swordqi', [wolf.x, wolf.y]));
  play(s, 0.6);
  // (a crit shows as a crit)
  assert.ok(C.combatOf(s).pops.some((p) => p.kind === 'ke' || p.kind === 'crit'), 'a blow that overcomes it');
  assert.ok(E.takeFeed(s).some((f) => f.text.includes('金剋木')), 'and you are told why');
  const t = cultivator(72);
  C.setKit(t, ['swordqi']);
  const [tiger] = among(t, DEF('fire_tiger_a'), [[0, 90]]);
  E.takeFeed(t);
  assert.ok(C.castCmd(t, 'swordqi', [tiger.x, tiger.y]));
  play(t, 0.6);
  assert.ok(C.combatOf(t).pops.some((p) => p.kind === 'weak' || p.kind === 'crit'), 'it overcomes the blow');
  assert.ok(E.takeFeed(t).some((f) => f.text.includes('火剋金')));
});

test('相生: 藤縛 (木) then 火球 (火) within a few breaths — the second comes on stronger; a move of no element breaks the run', () => {
  const s = cultivator(73, { techs: ['qingmu'] });
  C.setKit(s, ['vine', 'fireball', 'qi']);
  const [wolf] = among(s, DEF('wolves_a'), [[0, 150]]);
  assert.ok(C.castCmd(s, 'vine', [wolf.x, wolf.y]));
  play(s, 0.5);
  assert.deepEqual([C.chainOf(s).el, C.chainOf(s).n, C.chainOf(s).next], ['木', 1, '火'], 'the run begins, and says what carries it on');
  assert.ok(C.castCmd(s, 'fireball', [wolf.x, wolf.y]));
  play(s, 0.35);
  const ch = C.chainOf(s);
  assert.equal(ch.n, 2, '木生火');
  assert.ok(C.combatOf(s).pops.some((p) => p.kind === 'sheng' && p.text.startsWith('木生火')));
  const fb = C.combatOf(s).shots.find((x) => x.kind === 'fire');
  const me = C.hero(s);
  if (fb) assert.ok(Math.abs(fb.dmg - me.atk * MOVES.fireball.mult * CHAIN.mult[2]) < 1e-6, 'its fire the stronger');
  assert.ok(C.castCmd(s, 'qi', [wolf.x, wolf.y]));
  play(s, 0.2);
  assert.equal(C.chainOf(s), null, 'a move of no element ends the run');
  assert.ok((s.vars.chainBest || 0) >= 2);
});

test('飛劍 flies out through them, and back to your hand, cutting again on the way', () => {
  const s = cultivator(74, { realm: 2, stage: 1, weapon: 'qinggang_sword' });
  assert.ok(C.movesOf(cultivator(75, { weapon: 'qinggang_sword' })).find((m) => m.id === 'feijian').locked, 'not before 築基');
  C.setKit(s, ['feijian']);
  const [tiger] = among(s, DEF('fire_tiger_a'), [[0, 120]]);
  const C0 = C.combatOf(s);
  assert.ok(C.castCmd(s, 'feijian', [tiger.x, tiger.y]));
  let home = false;
  play(s, 3, () => {
    const sh = C0.shots.find((x) => x.kind === 'feijian');
    if (sh?.home) home = true;
    return home && !C0.shots.some((x) => x.kind === 'feijian');
  });
  assert.ok(home, 'it turned for home');
  assert.ok(!C0.shots.some((x) => x.kind === 'feijian'), 'and is back in your hand');
  assert.ok(hurtPops(s).length >= 2, 'it cut going and coming');
});

test('劍陣: blades go round you, cutting whatever comes near, and are gone in their time', () => {
  const s = cultivator(76, { realm: 2, stage: 1, arts: ['jianzhen'] });
  C.setKit(s, ['jianzhen']);
  const pack = among(s, DEF('wolves_a'), [[70, 0], [-50, 50]]);
  for (const b of pack) b.hp = b.maxHp = 9999;
  assert.ok(C.castCmd(s, 'jianzhen'));
  play(s, 1.5);
  const me = C.hero(s);
  assert.ok(me.array, 'the blades are out');
  assert.ok(pack.every((b) => b.hp < 9999), 'both near you are cut');
  play(s, MOVES.jianzhen.last);
  assert.equal(me.array, null, 'and gone in their time');
});

test('劍陣 is learned from the 劍痕 of 斷劍峰 (and a save that read it before has it)', () => {
  const scar = EVENTS.air_sword_scar.choices[0].ok.effects;
  assert.ok(scar.some(([k, v]) => k === 'tech' && v === 'jianzhen'));
  const s = cultivator(77);
  s.flags.sword_scar_read = true;
  migrate(s);
  assert.ok(s.player.arts.includes('jianzhen'));
});

test('玄冰刺 chills: it moves and gathers itself slower a while; 藤縛 holds them where they stand', () => {
  const s = cultivator(78, { techs: ['xuanshui', 'qingmu'] });
  C.setKit(s, ['frost', 'vine']);
  const [a, b] = among(s, DEF('wolves_a'), [[0, 100], [150, 0]]);
  for (const x of [a, b]) x.hp = x.maxHp = 9999;
  assert.ok(C.castCmd(s, 'frost', [a.x, a.y]));
  play(s, 0.5);
  assert.ok(a.chill && a.chill.k < 1, 'chilled');
  play(s, MOVES.frost.chill[0] + 0.2);
  assert.equal(a.chill, null, 'and it wears off');
  play(s, MOVES.frost.cd);
  assert.ok(C.castCmd(s, 'vine', [b.x, b.y]));
  play(s, 0.45);
  assert.equal(b.state, 'stun', 'held fast by the vines');
});

test('the third blow of a run lands heavier', () => {
  const s = cultivator(79);
  const [wolf] = among(s, DEF('wolves_a'), [[0, 30]]);
  wolf.hp = wolf.maxHp = 9999;
  const C0 = C.combatOf(s);
  let heavy = 0;
  C.attackCmd(s, wolf.uid, true);
  play(s, 2.5, () => {
    if (C0.me.act?.heavy) heavy++;
    return false;
  });
  C.attackRelease(s);
  assert.ok(heavy > 0, 'a heavy blow among them');
});

test('木魅 roots you where you stand (a step aside breaks free); 玄龜 drags at your feet with its whirlpools', () => {
  const s = cultivator(80);
  s.tod = 23;
  const [tree] = among(s, DEF('mumei_a'), [[0, 90]], 23);
  assert.ok(C.beastsInWorld(s, 99999).includes(tree));
  const me = C.hero(s);
  const w = s.world;
  me.hp = me.cap;
  Object.assign(tree, { state: 'windup', st: 0, move: 'rootgrab', aim: [0, -1], wind: 0.05, zones: [[w.x, w.y]], armed: true, hp: 999, maxHp: 999, dmg: 1 });
  C.combatOf(s).on = true;
  play(s, 0.2);
  assert.ok(me.held?.root, 'held by the roots');
  play(s, 0.6);
  assert.ok(me.held?.root, 'and still held, whatever the tree does next');
  assert.ok(C.dashCmd(s, [1, 0]));
  assert.equal(me.held, null, 'a step aside, and free');
  // the whirlpool: slower going while you stand in it
  const t = cultivator(81);
  among(t, DEF('wolves_a'), [[0, 300]]);
  const Ct = C.combatOf(t);
  const tw = t.world;
  Ct.on = true;
  Ct.pools.push({ x: tw.x, y: tw.y, r: 48, kind: 'water', t0: Ct.t, until: Ct.t + 4, mult: 0.1, poison: null, by: C.beastsInWorld(t, 99999).find((b) => b.def.id === 'wolves_a'), tick: 0 });
  play(t, 0.3);
  assert.ok(C.hero(t).slow > 0, 'dragged at');
});
