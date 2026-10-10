// 戰鬥: fights you can see, decided by strength, choices and a little luck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../src/core/battle.js';
import * as E from '../src/world/explore.js';
import { startEvent, choose, continueEvent, finishFight } from '../src/core/events.js';
import { serialize, parseSave } from '../src/core/save.js';
import { MOBS } from '../src/world/places.js';
import { FOES } from '../src/content/foes.js';
import { ITEMS } from '../src/content/items.js';
import { EVENT_LIST } from '../src/content/index.js';
import { nearestOpen } from '../src/world/terrain.js';
import { fresh, resolvePending, fightOut } from './helpers.js';

function cultivator(seed, stage = 2) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 1, stage, weapon: null, arts: [], tech: null, injury: 0, items: {} });
  return s;
}

/** Fight a battle out with a plain plan; returns how it ended. */
function bout(s, spec, diff, plan = () => ({ kind: 'attack' })) {
  B.startBattle(s, spec, { diff });
  for (let k = 0; k < 400 && !s.battle.over; k++) B.act(s, plan(s, B.options(s)));
  return s.battle.over;
}

test('every fight in the stories is a real fight: its foes exist, and it has an ending either way', () => {
  let n = 0;
  for (const ev of EVENT_LIST) {
    const steps = ev.steps || { start: { choices: ev.choices } };
    for (const [sid, st] of Object.entries(steps)) {
      for (const c of st.choices || []) {
        if (!c.fight) continue;
        n++;
        const where = `${ev.id}.${sid} 「${c.text}」`;
        assert.equal(c.check?.kind, 'power', `${where} keeps its 戰力 difficulty`);
        assert.ok(c.ok && c.fail, `${where} has both endings`);
        for (const [kind] of [...c.fight.foes, ...(c.fight.allies || [])]) assert.ok(FOES[kind], `${where}: ${kind}`);
      }
    }
  }
  assert.equal(n, 23);
  for (const f of Object.values(FOES)) for (const [, item] of f.loot || []) assert.ok(ITEMS[item], `loot ${item}`);
});

test('a fight goes the same way for the same save and the same moves', () => {
  const run = () => {
    const s = cultivator(41);
    return [bout(s, { foes: [['wolf', 2]] }, 22), s.battle.units.map((u) => u.hp).join(',')];
  };
  assert.deepEqual(run(), run());
});

test('an even match is about even; far stronger nearly always wins; far weaker seldom', () => {
  const rate = (ratio, spec) => {
    let won = 0;
    // against a ghost, blades are half wasted: put 靈力 into it instead
    const plan = (s, o) => (spec.foes[0][0] === 'ghost' && o.skills.some((k) => k.id === 'qi' && !k.why) ? { kind: 'skill', id: 'qi' } : { kind: 'attack' });
    for (let i = 0; i < 160; i++) {
      const s = cultivator(100 + i, 3);
      s.rng = (i * 7919 + 17) >>> 0;
      if (bout(s, spec, B.fightPower(s) / ratio, plan) === 'win') won++;
    }
    return won / 160;
  };
  for (const spec of [{ foes: [['wolf', 1]] }, { foes: [['bandit_chief', 1], ['bandit', 2]] }, { foes: [['ghost', 1]] }]) {
    const even = rate(1, spec);
    assert.ok(even > 0.3 && even < 0.68, `${spec.foes[0][0]}: an even match (${even})`);
    assert.ok(rate(2, spec) > 0.85, `${spec.foes[0][0]}: twice as strong`);
    assert.ok(rate(0.5, spec) < 0.12, `${spec.foes[0][0]}: half as strong`);
  }
});

test('what you can do: strike, skills that cost 靈力, pills that are used up, guard, step back, run', () => {
  const s = cultivator(42);
  s.player.items = { heal_pill: 1 };
  s.player.arts = ['qingyuan_sword'];
  B.startBattle(s, { foes: [['bandit', 2]] }, { diff: 26, first: 'me' });
  let o = B.options(s);
  assert.ok(o.skills.some((k) => k.id === 'swordqi') && o.skills.some((k) => k.id === 'qi'), 'your art and plain 靈力');
  const me = () => B.unitOf(s.battle, 'me');
  const mp = me().mp;
  const beats = B.act(s, { kind: 'skill', id: 'swordqi', target: o.targets[0] });
  assert.ok(beats.length && beats[0].name === '青元劍氣' && beats[0].fx === 'swordqi');
  if (!s.battle.over) {
    assert.ok(me().mp < mp || s.battle.over, 'it cost 靈力');
    me().hp = Math.round(me().maxHp * 0.3);
    B.act(s, { kind: 'item', id: 'heal_pill' });
    assert.equal(s.player.items.heal_pill, undefined, 'the pill is gone');
  }
  if (!s.battle.over) {
    const t0 = me().t;
    B.act(s, { kind: 'back' });
    assert.ok(me().t < t0 || s.battle.over, 'a step back');
  }
  if (!s.battle.over) {
    B.act(s, { kind: 'defend' });
    assert.ok(B.options(s) || s.battle.over);
  }
  // running works, sooner or later
  for (let k = 0; k < 40 && !s.battle.over; k++) B.act(s, { kind: 'flee' });
  assert.ok(s.battle.over);
});

test('the wolves that catch you are the wolves you fight, and the story ends the way the fight did', () => {
  const s = cultivator(43, 4);
  const def = MOBS.find((m) => m.id === 'wolves_a');
  s.tod = 22;
  const [x, y] = nearestOpen(s, def.x, def.y + 300, 4);
  E.placeAt(s, x, y);
  resolvePending(s);
  E.walkTo(s, def.x, def.y);
  for (let k = 0; k < 600 && !s.pending; k++) E.step(s, 0.05, null);
  for (let k = 0; k < 20 && s.pending && s.pending.id !== 'hill_wolves'; k++) {
    resolvePending(s);
    E.walkTo(s, def.x, def.y);
    for (let j = 0; j < 600 && !s.pending; j++) E.step(s, 0.05, null);
  }
  assert.equal(s.pending?.id, 'hill_wolves');
  assert.equal(s.pending.ctx.data.mob, 'wolves_a');
  const fight = s.pending.choices.find((c) => c.text === '拔刀迎戰。');
  assert.ok(fight.hint === null || fight.hint.fight, 'it is marked as a fight');
  choose(s, fight.i);
  assert.ok(s.battle, 'a fight, not a roll');
  assert.equal(s.battle.units.filter((u) => u.side === 'foe').length, def.n, 'the whole pack');
  assert.ok(E.battleField(s).arena, 'on the ground where you stand');
  fightOut(s);
  assert.ok(!s.battle);
  const r = s.pending.result;
  assert.equal(r.check.kind, '戰鬥');
  const ev = EVENT_LIST.find((e) => e.id === 'hill_wolves');
  assert.equal(r.text, r.check.ok ? ev.choices[0].ok.text : r.check.fight === 'lose' ? ev.choices[0].fail.text : '你且戰且退，總算脫了身。');
  continueEvent(s);
});

test('you can go for them first', () => {
  const s = cultivator(44, 6);
  const def = MOBS.find((m) => m.id === 'snake_a');
  s.day = 200; // the snakes are out in summer and autumn
  s.tod = 12;
  const [x, y] = nearestOpen(s, def.x + 200, def.y, 4);
  E.placeAt(s, x, y);
  resolvePending(s);
  const t = E.targetsNear(s, 300).find((x) => x.kind === 'mob' && x.id === 'snake_a');
  assert.ok(t && t.verb === '出手');
  E.interact(s, t);
  assert.ok(s.battle, 'the fight is on');
  assert.equal(s.battle.first, 'me');
  assert.equal(s.pending.ctx.data.first, 'me');
  fightOut(s);
  assert.ok(s.pending.result);
});

test('sparring is not to the death', () => {
  for (let i = 0; i < 30; i++) {
    const s = cultivator(200 + i, 0);
    s.player.realm = 0;
    s.npcs.lin_chen.met = true;
    s.player.injury = 2;
    startEvent(s, 'town_lin_visit');
    const c = s.pending.choices.find((x) => x.text.includes('陪你練練'));
    if (!c) continue;
    choose(s, c.i);
    assert.ok(s.battle?.spar);
    fightOut(s);
    assert.ok(!s.dead, 'nobody dies in a spar');
    continueEvent(s);
  }
});

test('a fight in progress survives saving and loading', () => {
  const s = cultivator(45);
  startEvent(s, 'travel_escort');
  const c = s.pending.choices.find((x) => x.text === '拔刀相助。');
  choose(s, c.i);
  assert.equal(s.battle.units.filter((u) => u.side === 'ally').length, 2, 'the two escorts fight beside you');
  B.act(s, { kind: 'attack' });
  const t = parseSave(serialize(s));
  assert.ok(t.battle && t.pending.fight !== null);
  fightOut(t);
  assert.ok(!t.battle && t.pending.result);
});

test('a win teaches you something and may leave you something; a near thing leaves a wound', () => {
  let xw = 0;
  let pelts = 0;
  let hurt = 0;
  let close = 0;
  for (let i = 0; i < 40; i++) {
    const s = cultivator(300 + i, 6);
    s.rng = (i * 104729 + 7) >>> 0;
    startEvent(s, 'hill_wolves');
    choose(s, 0);
    // every other fight starts badly hurt
    if (i % 2) B.unitOf(s.battle, 'me').hp = Math.ceil(B.unitOf(s.battle, 'me').maxHp * 0.3);
    const before = s.player.xw;
    fightOut(s);
    if (!s.pending.result.check.ok) continue;
    if (s.player.xw > before) xw++;
    if (s.player.items.wolf_pelt) pelts++;
    if (i % 2) {
      close++;
      if (s.player.injury > 0) hurt++;
    }
  }
  assert.ok(xw > 0 && pelts > 0, `cultivation (${xw}) and pelts (${pelts})`);
  assert.ok(close === 0 || hurt > 0, 'the narrow wins left wounds');
});
