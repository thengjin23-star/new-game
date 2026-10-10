// 即時戰鬥: fights that happen where you stand, while you move.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as C from '../src/world/combat.js';
import { BEASTS } from '../src/world/places.js';
import { NODES } from '../src/world/map.js';
import { BEAST_MOVES } from '../src/content/moves.js';
import { nearestOpen, regionAt, collides } from '../src/world/terrain.js';
import { fresh, resolvePending } from './helpers.js';

const DEF = BEASTS.find((b) => b.id === 'demon_wolf_a');
const DT = 1 / 30;

function cultivator(seed, stage = 3, extra = {}) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 1, stage, weapon: 'chaidao', arts: [], tech: null, injury: 0 }, extra);
  s.tod = 15;
  return s;
}

/** Stand on the edge of the wolf's ground. */
function near(s, dx = 200, dy = 60) {
  const [x, y] = nearestOpen(s, DEF.x + dx, DEF.y + dy, 6);
  E.placeAt(s, x, y);
  resolvePending(s);
}

const wolfOf = (s) => C.beastsInWorld(s, 5000).find((b) => b.uid === DEF.id) || null;
const toward = (s, b) => {
  const dx = b.x - s.world.x;
  const dy = b.y - s.world.y;
  const d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d, d];
};

/** A way from where you stand with nothing in it for len (to set things out along). */
function openWay(s, len) {
  const w = s.world;
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    let clear = true;
    for (let r = 0; r <= len && clear; r += 8) if (collides(s, w.x + Math.cos(a) * r, w.y + Math.sin(a) * r, 16)) clear = false;
    if (clear) return [Math.cos(a), Math.sin(a)];
  }
  throw new Error('no open ground here');
}

/** Run the world for up to secs: brain(s) steers (and presses buttons); stop when done(s). */
function play(s, secs, brain = () => null, done = () => false) {
  for (let k = 0; k < secs / DT; k++) {
    E.step(s, DT, brain(s));
    if (done(s)) return true;
  }
  return false;
}

/** Walk up to it until it comes for you. */
function provoke(s) {
  return play(s, 12, (x) => {
    const b = wolfOf(x);
    if (!b || C.inCombat(x)) return null;
    const [ux, uy] = toward(x, b);
    return { x: ux, y: uy };
  }, (x) => C.inCombat(x));
}

/** A player who watches: steps aside from what is coming, casts when ready, strikes in between. */
function dodger(s) {
  const b = wolfOf(s);
  const me = C.combatOf(s).me;
  if (!b || !C.inCombat(s)) return null;
  const [ux, uy, d] = toward(s, b);
  if (b.state === 'windup' && b.st > b.wind - (b.move === 'pounce' ? 0.25 : 0.2) && !(me.cds.dash > 0)) {
    C.dashCmd(s, b.move === 'pounce' ? [-uy, ux] : [-ux, -uy]);
    return null;
  }
  if (me.hp < me.cap * 0.5 && !me.shield) C.castCmd(s, 'guard');
  if (d > 90) C.castCmd(s, 'swordqi');
  C.castCmd(s, 'fireball');
  C.attackCmd(s);
  return null;
}

/** A player who just stands there and strikes. */
function statue(s) {
  if (C.inCombat(s)) C.attackCmd(s);
  return null;
}

/** A player who turns and runs, stepping aside when it springs. */
function runner(s) {
  const b = wolfOf(s);
  if (!b || !C.inCombat(s)) return null;
  const [ux, uy] = toward(s, b);
  const me = C.combatOf(s).me;
  if (b.state === 'windup' && b.st > b.wind - 0.22 && !(me.cds.dash > 0)) C.dashCmd(s, [-ux, -uy]);
  return { x: -ux, y: -uy };
}

const over = (s) => !!s.pending || (C.combatOf(s).outcome !== null && !C.inCombat(s));

test('a beast that sees you comes for you, and the fight happens where you stand', () => {
  const s = cultivator(11);
  near(s);
  const b = wolfOf(s);
  assert.ok(b, 'the demon wolf is out on its ground');
  assert.ok(provoke(s), 'it saw you and came');
  assert.equal(s.pending, null, 'no story card, nothing stops');
  assert.equal(wolfOf(s), b, 'the very wolf that was out there, where it was');
  assert.ok(Math.hypot(b.x - DEF.x, b.y - DEF.y) < 500);
  // you still walk as you please
  const x0 = s.world.x;
  play(s, 0.5, () => ({ x: -1, y: 0 }));
  assert.ok(s.world.x < x0, 'free to move in the middle of it');
});

test('your blow lands on what is in reach; spells fly, burst and burn, cost 靈力, and wait on their cooldown', () => {
  const s = cultivator(12, 4);
  near(s, 260, 160);
  const b = wolfOf(s);
  const w = s.world;
  const [ox, oy] = openWay(s, 230);
  const at = (r) => Object.assign(b, { x: w.x + ox * r, y: w.y + oy * r });
  const hold = () => Object.assign(b, { state: 'recover', st: 0, rec: 99, aggro: true });
  // close by, in front of you
  at(40);
  hold();
  C.attackCmd(s, null, false);
  play(s, 0.4);
  assert.ok(b.armed && b.hp < b.maxHp, 'the swing landed');
  const me = C.combatOf(s).me;
  // sword qi, out along a line
  let hp = b.hp;
  at(200);
  hold();
  const mp = me.mp;
  assert.ok(C.castCmd(s, 'swordqi', [b.x, b.y]));
  assert.equal(me.mp, mp - 6, 'it cost 靈力');
  assert.ok(!C.castCmd(s, 'swordqi', [b.x, b.y]), 'and has to cool down');
  play(s, 0.8);
  assert.ok(b.hp < hp, 'the sword qi reached it');
  // a fireball bursts where it lands, and keeps burning
  hp = b.hp;
  at(170);
  hold();
  assert.ok(C.castCmd(s, 'fireball', [b.x, b.y]));
  play(s, 0.9);
  assert.ok(b.hp < hp && b.burn, 'burst and set alight');
  hp = b.hp;
  play(s, 1.5);
  assert.ok(b.hp < hp, 'the fire keeps biting');
  // 護體 takes a bite for you
  assert.ok(C.castCmd(s, 'guard'));
  play(s, 0.1);
  assert.ok(me.shield > 0, 'a shield of 靈力');
});

test('before 煉氣 you have no spells; a 凡人 can only strike and step aside', () => {
  const s = cultivator(13, 0, { realm: 0 });
  near(s);
  assert.ok(C.kitOf(s).every((k) => k.locked), 'all three out of reach');
  assert.ok(!C.castCmd(s, 'fireball'));
  assert.ok(C.dashCmd(s, [1, 0]), 'anyone can step aside');
});

test('what you see coming you can get out of the way of', () => {
  const pounceAt = (dodge) => {
    const s = cultivator(14, 3);
    near(s, 260, 160);
    const b = wolfOf(s);
    const w = s.world;
    const [ox, oy] = openWay(s, 200);
    Object.assign(b, { x: w.x + ox * 150, y: w.y + oy * 150 });
    // it crouches, its leap marked on the ground toward you
    const M = BEAST_MOVES.pounce;
    Object.assign(b, { state: 'windup', st: 0, move: 'pounce', aim: [-ox, -oy], wind: M.windup, len: 150 + M.overshoot, from: [b.x, b.y], aggro: true });
    C.updateCombat(s, 0, { input: null, feed() {}, signal() {} });
    const me = C.combatOf(s).me;
    const hp0 = me.hp;
    play(s, 1.4, (x) => {
      if (dodge && b.state === 'windup' && b.st > M.windup - 0.25) C.dashCmd(x, [-oy, ox]);
      return null;
    });
    return hp0 - me.hp;
  };
  assert.ok(pounceAt(false) > 0, 'standing there, you take it');
  assert.equal(pounceAt(true), 0, 'stepping aside, it misses');
});

test('fight well and it falls: its pelt, maybe its core, a little cultivation; another comes days later', () => {
  const s = cultivator(15, 3);
  near(s);
  const xw = s.player.xw;
  assert.ok(provoke(s));
  assert.ok(play(s, 60, dodger, over), 'the fight ends');
  assert.equal(C.combatOf(s).outcome, 'won');
  assert.ok(!C.inCombat(s));
  assert.ok(s.player.xw > xw, 'something learned');
  assert.ok(s.world.mobs[DEF.id] > s.day, 'its ground is empty for a while');
  assert.ok(!wolfOf(s) || wolfOf(s).state === 'dead', 'it lies there (or is gone)');
  s.day += DEF.respawn + 1;
  play(s, 0.2);
  assert.ok(wolfOf(s)?.state === 'idle', 'another one roams there again');
});

test('stand there and trade blows with a stronger beast, and it fells you: you wake later, hurt', () => {
  const s = cultivator(16, 0);
  near(s);
  const tod = s.tod;
  assert.ok(provoke(s));
  play(s, 60, statue, over);
  assert.equal(C.combatOf(s).outcome, 'fell');
  assert.equal(s.pending?.title, '倒下');
  assert.equal(s.player.injury, 1, 'a wound');
  assert.ok((s.tod - tod + 24) % 24 >= 3, 'some hours lost');
  assert.ok(['return', 'idle'].includes(wolfOf(s).state), 'it has gone back to its ground');
  resolvePending(s);
});

test('run, and keep out of its way, and it gives up on you', () => {
  for (const [seed, stage, realm] of [[17, 3, 1], [18, 0, 0]]) {
    const s = cultivator(seed, stage, { realm });
    near(s);
    assert.ok(provoke(s));
    assert.ok(play(s, 60, runner, over), 'the chase ends');
    assert.equal(C.combatOf(s).outcome, 'escaped', `got away (${realm ? '煉氣' : '凡人'})`);
    assert.ok(['return', 'idle'].includes(wolfOf(s).state));
    assert.equal(s.player.injury, 0);
  }
});

test('it will not follow you into a town', () => {
  const s = cultivator(19, 3);
  near(s);
  assert.ok(provoke(s));
  // the edge of 青石鎮, north side
  const [tx, ty] = NODES.qingshi_town.at;
  let y = ty;
  while (NODES[regionAt(s, tx, y)]?.kind === 'town' && y > ty - 1500) y -= 10;
  const inside = nearestOpen(s, tx, y + 40, 6);
  const b = wolfOf(s);
  Object.assign(b, nearestOpen(s, tx, y - 70, 6).reduce((o, v, i) => Object.assign(o, i ? { y: v } : { x: v }), {}));
  E.placeAt(s, inside[0], inside[1]);
  resolvePending(s);
  let entered = false;
  play(s, 6, () => null, (x) => {
    if (NODES[regionAt(x, b.x, b.y)]?.kind === 'town') entered = true;
    return !C.inCombat(x);
  });
  assert.ok(!entered, 'it stopped at the edge');
  assert.ok(!C.inCombat(s), 'and gave up');
});

test('a realm above yours presses down on you', () => {
  const blow = (realm, stage) => {
    const s = cultivator(20, stage, { realm });
    near(s);
    assert.ok(provoke(s));
    return wolfOf(s);
  };
  const mortal = blow(0, 0);
  const lianqi = blow(1, 2);
  assert.equal(mortal.gap, 1);
  assert.equal(lianqi.gap, 0);
  assert.ok(mortal.taken < 0.5, 'most of what a mortal does it shrugs off');
  assert.ok(mortal.speed > lianqi.speed, 'and it is quicker on its feet');
});

test('a fight passes little time; walking passes a great deal', () => {
  const s = cultivator(21, 3);
  near(s);
  assert.ok(provoke(s));
  const tod = s.tod;
  play(s, 10, dodger, over);
  const fought = (s.tod - tod + 24) % 24;
  assert.ok(fought < 0.2, `a fight of ten seconds or so is minutes, not hours (${fought.toFixed(2)} h)`);
});

test('the same fight, fought the same way, goes the same way', () => {
  const once = () => {
    const s = cultivator(22, 3);
    near(s);
    provoke(s);
    play(s, 60, dodger, over);
    return [C.combatOf(s).outcome, C.combatOf(s).me.hp, s.player.xw].join(',');
  };
  assert.equal(once(), once());
});

test('the system conjures a phantom to practise on: it costs you nothing, and leaves nothing', () => {
  const s = cultivator(23, 0, { realm: 0 });
  near(s, -900, 600);
  const items = JSON.stringify(s.player.items);
  assert.ok(C.startTrial(s));
  assert.ok(C.kitOf(s).every((k) => !k.locked), 'its three moves lent you');
  assert.ok(C.combatOf(s).me.maxMp > 0, 'and some 靈力');
  const phantom = C.beastsInWorld(s).find((b) => b.phantom);
  assert.ok(phantom);
  assert.ok(play(s, 4, () => null, (x) => C.inCombat(x)), 'it comes for you');
  play(s, 60, statue, over);
  assert.ok(['won', 'fell'].includes(C.combatOf(s).outcome));
  assert.equal(s.pending, null, 'no waking up hurt');
  assert.equal(s.player.injury, 0);
  assert.equal(JSON.stringify(s.player.items), items, 'nothing gained');
  play(s, 2);
  assert.ok(!C.beastsInWorld(s).some((b) => b.phantom), 'the phantom is gone');
  assert.ok(C.kitOf(s).every((k) => k.locked), 'and what it lent you');
});
