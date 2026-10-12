// 故事裡的戰鬥: fought out where you stand, with those the story names, and
// the story picks up the way the fight went.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import { startEvent, choose, continueEvent } from '../src/core/events.js';
import { serialize, parseSave, migrate } from '../src/core/save.js';
import { stageScene, meetScene } from '../src/world/director.js';
import { FOES } from '../src/content/foes.js';
import { BEAST_MOVES, PILL_CD } from '../src/content/moves.js';
import { ITEMS } from '../src/content/items.js';
import { EVENT_LIST } from '../src/content/index.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;
const MEADOW = [1426, 3782];

/** A cultivator on open ground by day, with nothing on screen. */
function ready(seed, realm = 1, stage = 6) {
  const s = fresh(seed);
  Object.assign(s.player, { realm, stage, weapon: 'chaidao', arts: [], tech: null, injury: 0 });
  E.placeAt(s, ...MEADOW);
  resolvePending(s);
  s.tod = 14;
  CB.hero(s).hp = CB.hero(s).cap;
  return s;
}

/** Fight on — striking at whoever is nearest, or standing there — until the story has something to say. */
function fightOn(s, secs = 90, strike = true) {
  for (let t = 0; t < secs && !s.pending && !s.dead; t += DT) {
    if (strike) CB.attackCmd(s);
    E.step(s, DT, null);
  }
}

/** Start an event and choose to fight; the first frame after puts them in front of you. */
function fight(s, id) {
  startEvent(s, id);
  const c = s.pending.choices.find((x) => x.fight);
  assert.ok(c && !c.disabled, `${id} has a fight to choose`);
  choose(s, c.i);
  assert.equal(s.pending, null, 'no dice: the card goes, and it is fought');
  assert.ok(s.rtFight?.story);
  E.step(s, DT, null);
  return CB.beastsInWorld(s, 2000).filter((b) => b.story);
}

test('every fight in the stories is fought where you stand: those in it exist and can fight, and it ends either way', () => {
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
        for (const [kind] of [...c.fight.foes, ...(c.fight.allies || [])]) {
          assert.ok(FOES[kind]?.rt, `${where}: ${kind} fights in real time`);
          for (const m of FOES[kind].rt.moves) assert.ok(BEAST_MOVES[m], `${kind}: ${m}`);
        }
      }
    }
  }
  assert.equal(n, 23);
  for (const f of Object.values(FOES)) for (const [, item] of f.loot || []) assert.ok(ITEMS[item], `loot ${item}`);
});

test('choose to fight, and they are in front of you; win, and the story goes on as won', () => {
  const s = ready(5, 1, 7);
  const foes = fight(s, 'zhao_revenge');
  assert.equal(foes.length, 2);
  assert.ok(CB.inCombat(s), 'it comes to blows at once');
  assert.ok(foes.every((b) => b.aggro && b.side !== 'ally'));
  assert.ok(foes.some((b) => b.name === '陰沉的中年人'), 'named as the story names them');
  const w = s.world;
  assert.ok(foes.every((b) => Math.hypot(b.x - w.x, b.y - w.y) < 220), 'up close, as the story has it');
  // the bully you know is the one you fight: not also standing about in town
  assert.ok(CB.fightingPeople(s).has('zhao_hu'));
  fightOn(s);
  const r = s.pending?.result;
  assert.equal(r?.check?.fight, 'win');
  assert.ok(r.check.ok);
  continueEvent(s);
  for (let k = 0; k < 150; k++) E.step(s, DT, null);
  assert.ok(!CB.fightingPeople(s).has('zhao_hu'), 'and when it is over they go on their way');
});

test('lose, and the story goes on as lost: you come to, hurt, not dead', () => {
  const s = ready(6, 0, 0);
  const foes = fight(s, 'town_bully');
  assert.equal(foes.length, 3);
  fightOn(s, 120, false);
  const r = s.pending?.result;
  assert.equal(r?.check?.fight, 'lose');
  assert.ok(!s.dead);
  assert.ok(CB.hero(s).hp >= 1);
});

test('a fight that breaks out where you meet it: the people there are the ones fighting, and yours fight beside you', () => {
  const s = ready(3, 1, 7);
  s.tod = 10;
  // on the road south of the market
  E.placeAt(s, 4010, 3180);
  resolvePending(s);
  const L = E.liveOf(s);
  L.heading = [0.55, 0.85];
  const sc = stageScene(s, L, 'travel_escort');
  assert.ok(sc, 'there was room on the road');
  assert.ok(meetScene(s, L, sc));
  choose(s, s.pending.choices.find((c) => c.fight).i);
  E.step(s, DT, null);
  const all = CB.beastsInWorld(s, 3000).filter((b) => b.story);
  const foes = all.filter((b) => b.side !== 'ally');
  const allies = all.filter((b) => b.side === 'ally');
  assert.equal(foes.length, 3);
  assert.equal(allies.length, 2);
  const people = sc.actors.filter((ac) => ac.side);
  for (const b of all) assert.ok(people.some((ac) => Math.hypot(b.x - ac.x, b.y - ac.y) < 30), `${b.name} stands where one of the scene stood`);
  assert.ok(people.every((ac) => ac.fought), 'and the scene no longer draws them');
  // you stand back: the guards go for the thieves on their own
  fightOn(s, 3, false);
  assert.ok(foes.some((b) => b.hp < b.maxHp), 'the guards land blows');
  fightOn(s);
  assert.equal(s.pending?.result?.check?.fight, 'win');
  // knocked down or not, they are on their feet when it is over
  assert.ok(allies.every((b) => b.state === 'talk'));
});

test('sparring is not to the death: beaten, you are bested (and only the bruise the story tells of); winning, they yield', () => {
  const s = ready(8, 0, 0);
  const [lin] = fight(s, 'town_lin_visit');
  assert.ok(lin && lin.def.spar);
  const said = [];
  for (let t = 0; t < 120 && !s.pending; t += DT) {
    E.step(s, DT, null);
    said.push(...E.takeFeed(s).map((f) => f.text));
  }
  assert.equal(s.pending?.result?.check?.fight, 'lose');
  assert.ok(said.includes('你輸了這一場。'), 'bested, not felled');
  assert.equal(s.player.injury, 1, 'the one bruise the story gives, no more');
  assert.ok(!s.dead);
  const t = ready(9, 1, 6);
  const [lin2] = fight(t, 'town_lin_visit');
  fightOn(t);
  assert.equal(t.pending?.result?.check?.fight, 'win');
  assert.ok(['yield', 'talk'].includes(lin2.state), 'he gives way, alive');
  assert.ok(lin2.hp > 0);
});

test('close the game in the middle of a story fight, and it ends as if you had got away', () => {
  const s = ready(4, 1, 6);
  fight(s, 'valley_cultivators');
  for (let k = 0; k < 20; k++) E.step(s, DT, null);
  assert.ok(CB.inCombat(s));
  const t = parseSave(serialize(s));
  assert.ok(t.rtFight?.on, 'the fight was on when it was saved');
  E.step(t, DT, null);
  assert.equal(t.rtFight, null);
  assert.equal(t.pending?.result?.check?.fight, 'flee');
});

test('a save from when fights were taken in turns: the story waits on the choice again', () => {
  const s = ready(2);
  startEvent(s, 'valley_cultivators');
  const old = JSON.parse(serialize(s));
  old.battle = { units: [], turn: 'me' };
  old.pending.fight = 0;
  const t = migrate(old);
  assert.equal(t.battle, undefined);
  assert.equal(t.pending.fight, null);
  assert.ok(t.pending.choices.some((c) => c.fight && !c.disabled), 'you can choose to fight again');
});

test('a pill in the thick of it: the best you have, used up, one every few breaths; poisoned, the one that clears it', () => {
  const s = ready(7);
  s.player.items = { heal_pill: 2, zhixue_grass: 1, detox_pill: 1 };
  const me = CB.hero(s);
  assert.equal(CB.pillCmd(s), false, 'not while you are whole');
  me.hp = Math.round(me.cap * 0.3);
  assert.equal(CB.pillOf(s), 'heal_pill');
  assert.ok(CB.pillCmd(s));
  assert.equal(s.player.items.heal_pill, 1);
  assert.ok(me.hp > me.cap * 0.7, 'most of your blood back at once');
  me.hp = 10;
  assert.equal(CB.pillCmd(s), false, 'not again so soon');
  for (let t = 0; t < PILL_CD + 0.1; t += DT) E.step(s, DT, null);
  me.poison = { left: 5, dps: 2, tick: 0.5 };
  assert.equal(CB.pillOf(s), 'detox_pill');
  assert.ok(CB.pillCmd(s));
  assert.equal(me.poison, null);
  assert.equal(s.player.items.detox_pill, undefined, 'the last one gone');
});
