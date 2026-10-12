// 首領: a fight of its own — marks where it changes, a rage near the end, blows
// all round it and where you stand, ground that burns, coils, a pack called in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import { startEvent, choose } from '../src/core/events.js';
import { BEASTS } from '../src/world/places.js';
import { regionIdAt, isReachable, nearestOpen } from '../src/world/terrain.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;
const MEADOW = [1426, 3782];

function ready(seed, realm = 1, stage = 8) {
  const s = fresh(seed);
  Object.assign(s.player, { realm, stage, weapon: 'chaidao', arts: [], tech: null, injury: 0 });
  E.placeAt(s, ...MEADOW);
  resolvePending(s);
  s.tod = 14;
  CB.hero(s).hp = CB.hero(s).cap;
  return s;
}

/** A boss from a story, in front of you. */
function boss(s, id) {
  startEvent(s, id);
  choose(s, s.pending.choices.find((c) => c.fight).i);
  E.step(s, DT, null);
  const b = CB.beastsInWorld(s, 2000).find((x) => x.K.boss);
  assert.ok(b && CB.inCombat(s));
  return b;
}

function steps(s, secs, input = null) {
  for (let t = 0; t < secs && !s.pending && !s.dead; t += DT) E.step(s, DT, input);
}

/** Make it gather itself for a move right now (as it would have chosen it), at you. */
function gather(s, b, move, wind = 0.15) {
  const w = s.world;
  const d = Math.hypot(w.x - b.x, w.y - b.y) || 1;
  Object.assign(b, { state: 'windup', st: 0, move, wind, moving: false, aim: [(w.x - b.x) / d, (w.y - b.y) / d], from: [b.x, b.y], combo: 0, kb: null });
  return d;
}

/** Stand at (x, y) off it. */
function standOff(s, b, dx, dy) {
  E.placeAt(s, b.x + dx, b.y + dy);
}

/** Walk up to the fire tiger's den (whatever the old battlefield has to say on the way, said) and let it see you. */
function toDen(s, dx = 60, dy = 40) {
  const def = BEASTS.find((b) => b.id === 'fire_tiger_a');
  E.placeAt(s, ...nearestOpen(s, def.x + dx, def.y + dy));
  resolvePending(s);
  s.tod = 14;
  CB.hero(s).hp = CB.hero(s).cap;
  steps(s, 2);
  const tiger = CB.beastsInWorld(s, 800).find((b) => b.kind === 'fire_tiger');
  assert.ok(tiger?.aggro, 'it has seen you');
  return tiger;
}

test('a boss worn past its marks fights another way — and near the end, in a rage; the bar across the top shows it', () => {
  const s = ready(11);
  const king = boss(s, 'forest_wolf_king');
  const bar = CB.bossOf(s);
  assert.equal(bar.name, '狼王');
  assert.deepEqual(bar.marks, [0.6, 0.3], 'marked where it will change');
  const seen = [];
  const said = [];
  for (let t = 0; t < 120 && !s.pending && !s.dead; t += DT) {
    CB.attackCmd(s);
    CB.hero(s).hp = CB.hero(s).cap;
    E.step(s, DT, null);
    said.push(...E.takeFeed(s).map((f) => f.text));
    const B = CB.bossOf(s);
    if (B && seen[seen.length - 1] !== B.phase) seen.push(B.phase);
    if (B?.phase === 1) assert.ok(king.moves.includes('kingpounce'), 'it springs again and again');
  }
  assert.deepEqual(seen, [0, 1, 2]);
  assert.ok(said.some((x) => x.includes('一撲接著一撲')) && said.some((x) => x.includes('發狂')), 'and you are told');
  assert.equal(s.pending?.result?.check?.fight, 'win');
});

test('a blow all round it catches you and throws you back; stepping aside in time, it misses', () => {
  const s = ready(12);
  const sk = boss(s, 'valley_python');
  const me = CB.hero(s);
  standOff(s, sk, 50, 0);
  gather(s, sk, 'tail');
  const hp = me.hp;
  const x0 = s.world.x;
  steps(s, 0.25);
  assert.ok(me.hp < hp, 'caught');
  steps(s, 0.4);
  assert.ok(s.world.x > x0 + 20, 'and thrown back');
  // again: this time a step aside as it lands
  sk.cds.tail = 0;
  standOff(s, sk, 50, 0);
  gather(s, sk, 'tail', 0.2);
  CB.dashCmd(s, [0, 1]);
  const hp2 = me.hp;
  steps(s, 0.25);
  assert.equal(me.hp, hp2);
});

test('the ground where you stood bursts, and the venom lies there a while: it hurts (and poisons) only while you stand in it', () => {
  const s = ready(13);
  const py = boss(s, 'valley_python');
  const C = CB.combatOf(s);
  const me = CB.hero(s);
  standOff(s, py, 160, 0);
  gather(s, py, 'spit');
  py.zones = [[s.world.x, s.world.y]];
  const hp = me.hp;
  steps(s, 0.2);
  assert.ok(me.hp < hp, 'it burst under you');
  assert.equal(C.pools.length, 1);
  assert.equal(C.pools[0].kind, 'venom');
  // keep it busy elsewhere, and stand in the venom
  py.cds = { tail: 9, bite: 9, spit: 9 };
  Object.assign(py, { state: 'stun', st: 0, stunT: 99 });
  me.hp = me.cap;
  steps(s, 1.6);
  assert.ok(me.hp < me.cap, 'standing in it hurts');
  assert.ok(me.poison, 'and poisons');
  // out of it: it does not reach you
  E.placeAt(s, C.pools[0].x + 140, C.pools[0].y);
  me.poison = null;
  me.hp = me.cap;
  steps(s, 1.2);
  assert.equal(me.hp, me.cap);
  // and it dries up
  steps(s, 5);
  assert.equal(C.pools.length, 0);
});

test('a run of blows: claws three times running, each turned to you again', () => {
  const s = ready(14);
  const w = s.world;
  const tiger = toDen(s, 40, 20);
  const me = CB.hero(s);
  standOff(s, tiger, 30, 0);
  Object.assign(tiger, { state: 'chase', st: 0, cds: { fireclaw: 0, firepounce: 99 } });
  me.hp = me.cap;
  const blows = new Set();
  const before = new Set(CB.combatOf(s).fx.map((f) => f.t0));
  for (let t = 0; t < 3; t += DT) {
    E.step(s, DT, null);
    me.hp = me.cap;
    standOff(s, tiger, 30 * Math.sign(w.x - tiger.x || 1), 0);
    for (const f of CB.combatOf(s).fx) if (f.kind === 'claw' && !before.has(f.t0)) blows.add(f.t0);
    if (tiger.state === 'recover' && blows.size >= 3) break;
  }
  assert.equal(blows.size, 3);
});

test('coiled: you cannot walk away, it squeezes — and a step aside breaks free', () => {
  const s = ready(15);
  const py = boss(s, 'valley_python');
  const me = CB.hero(s);
  standOff(s, py, 110, 0);
  py.cds = { tail: 9, bite: 9, spit: 9, constrict: 0 };
  gather(s, py, 'constrict');
  py.len = 140;
  steps(s, 0.6);
  assert.ok(me.held, 'caught in its coils');
  const at = [s.world.x, s.world.y];
  const hp = me.hp;
  steps(s, 0.7, { x: -1, y: 0 });
  assert.ok(Math.hypot(s.world.x - at[0], s.world.y - at[1]) < 2, 'you cannot walk');
  assert.ok(me.hp < hp, 'it squeezes');
  me.cds.dash = 0;
  assert.ok(CB.dashCmd(s, [0, 1]));
  assert.equal(me.held, null, 'free');
  steps(s, 0.3);
  assert.ok(Math.hypot(s.world.x - at[0], s.world.y - at[1]) > 40);
});

test('the wolf king calls its pack: they fight for it, and run when it falls — leaving nothing, and not remembered', () => {
  const s = ready(16);
  const king = boss(s, 'forest_wolf_king');
  const mobs = JSON.stringify(s.world.mobs);
  gather(s, king, 'packcall');
  steps(s, 0.3);
  const called = CB.beastsInWorld(s, 2000).filter((b) => b.summon);
  assert.equal(called.length, 2);
  assert.ok(called.every((b) => b.master === king && b.aggro && b.kind === 'wolf'));
  // no more than three of them at once
  king.cds.packcall = 0;
  gather(s, king, 'packcall');
  steps(s, 0.3);
  assert.equal(CB.beastsInWorld(s, 2000).filter((b) => b.summon && b.state !== 'flee').length, 3);
  // it falls: they run
  king.hp = 1;
  standOff(s, king, 30, 0);
  for (let t = 0; t < 3 && king.state !== 'dead'; t += DT) {
    CB.strikeAt(s, king.uid);
    CB.hero(s).hp = CB.hero(s).cap;
    E.step(s, DT, null);
  }
  assert.equal(king.state, 'dead');
  steps(s, 4);
  resolvePending(s);
  steps(s, 4);
  assert.ok(!CB.beastsInWorld(s, 2000).some((b) => b.summon), 'gone');
  assert.equal(JSON.stringify(s.world.mobs), mobs, 'nothing kept of them in the save');
});

test('she is gone from where she stood when you come close — the other side of you, at her distance', () => {
  const s = ready(17);
  const fox = boss(s, 'shrine_meet');
  standOff(s, fox, 40, 0);
  const w = s.world;
  const before = [fox.x, fox.y];
  gather(s, fox, 'blink');
  steps(s, 0.2);
  const d = Math.hypot(fox.x - w.x, fox.y - w.y);
  assert.ok(Math.hypot(fox.x - before[0], fox.y - before[1]) > 100, 'she moved');
  assert.ok(d > 120, `and stands off (${Math.round(d)})`);
});

test('a boss that gives up the chase starts over: its marks, its rage, its blood', () => {
  const s = ready(18);
  const def = BEASTS.find((b) => b.id === 'fire_tiger_a');
  const tiger = toDen(s);
  tiger.hp = tiger.maxHp * 0.3;
  CB.hero(s).hp = CB.hero(s).cap;
  CB.attackCmd(s);
  for (let t = 0; t < 2 && tiger.phase < 2; t += DT) {
    CB.attackCmd(s);
    E.step(s, DT, null);
  }
  assert.equal(tiger.phase, 2);
  assert.ok(tiger.enraged);
  // far away, out of its reach: it goes home and heals
  E.placeAt(s, ...nearestOpen(s, def.x + 1200, def.y + 900));
  resolvePending(s);
  steps(s, 30);
  assert.equal(tiger.phase, 0);
  assert.equal(tiger.moves, null);
  assert.ok(!tiger.enraged);
});

test('the fire tiger keeps to the scorched ground north of the old battlefield, and leaves its pelt', () => {
  const def = BEASTS.find((b) => b.id === 'fire_tiger_a');
  assert.equal(regionIdAt(def.x, def.y), 'ancient_ruins');
  assert.ok(isReachable(def.x, def.y));
  const s = ready(19, 2, 1);
  toDen(s);
  for (let t = 0; t < 120 && !s.pending && !s.dead; t += DT) {
    CB.attackCmd(s);
    CB.hero(s).hp = CB.hero(s).cap;
    E.step(s, DT, null);
    if (CB.combatOf(s).outcome === 'won') break;
  }
  assert.equal(CB.combatOf(s).outcome, 'won');
  assert.equal(s.player.items.fire_tiger_pelt, 1);
  assert.ok(s.player.items.beast_core >= 2);
});
