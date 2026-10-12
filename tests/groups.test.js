// 野外的敵人: packs that take turns and break, a snake in the grass, robbers
// and the restless dead who come up to have a word — and when it comes to
// blows, it is fought where you stand, and the story ends the way it went.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as C from '../src/world/combat.js';
import { BEASTS } from '../src/world/places.js';
import { EVENTS } from '../src/content/index.js';
import { BEAST_MOVES } from '../src/content/moves.js';
import { choose, continueEvent, resolve } from '../src/core/events.js';
import { serialize, parseSave } from '../src/core/save.js';
import { nearestOpen, collides } from '../src/world/terrain.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;
const DEF = (id) => BEASTS.find((b) => b.id === id);

function cultivator(seed, stage = 3, extra = {}) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 1, stage, weapon: 'chaidao', arts: [], tech: null, injury: 0, ls: 40 }, extra);
  s.tod = 15;
  return s;
}

function standNear(s, def, dx, dy) {
  const [x, y] = nearestOpen(s, def.x + dx, def.y + dy, 6);
  E.placeAt(s, x, y);
  resolvePending(s);
}

const groupOf = (s, id) => C.beastsInWorld(s, 5000).filter((b) => b.def.id === id);
const OUT = new Set(['dead', 'gone', 'flee', 'yield', 'leave', 'hide', 'talk']);

function play(s, secs, brain = () => null, done = () => false) {
  for (let k = 0; k < secs / DT; k++) {
    E.step(s, DT, brain(s));
    if (done(s)) return true;
  }
  return false;
}

/** Walk at them (by road) until they come up to you or come for you (whatever else turns up on the way, dealt with). */
function meet(s, def) {
  for (let k = 0; k < 40 / DT; k++) {
    if (s.pending && s.pending.ctx?.data?.beast !== def.id) resolvePending(s);
    if (s.pending || C.inCombat(s)) return true;
    if (!E.liveOf(s).path) E.walkTo(s, def.x, def.y);
    E.step(s, DT, null);
  }
  return false;
}

/** Put someone of theirs right in front of you, standing still. */
function before(s, b, d = 40) {
  const w = s.world;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x = w.x + Math.cos(a) * d;
    const y = w.y + Math.sin(a) * d;
    if (!collides(s, x, y, 14)) return Object.assign(b, { x, y });
  }
  throw new Error('no room');
}

/** A player who watches: steps aside from what is coming, casts when ready, strikes the nearest of them. */
function fighter(id) {
  return (s) => {
    const live = groupOf(s, id).filter((b) => !OUT.has(b.state));
    const me = C.combatOf(s).me;
    if (!live.length || !C.inCombat(s)) return null;
    const w = s.world;
    const b = live.reduce((a, x) => (Math.hypot(x.x - w.x, x.y - w.y) < Math.hypot(a.x - w.x, a.y - w.y) ? x : a));
    const d = Math.hypot(b.x - w.x, b.y - w.y) || 1;
    const [ux, uy] = [(b.x - w.x) / d, (b.y - w.y) / d];
    const threat = live.some((o) => o.state === 'windup' && o.st > o.wind - 0.22) || C.combatOf(s).shots.some((sh) => sh.foe && Math.hypot(sh.x - w.x, sh.y - w.y) < 60);
    if (threat && !(me.cds.dash > 0)) {
      C.dashCmd(s, [-uy, ux]);
      return null;
    }
    if (me.hp < me.cap * 0.5 && !me.shield) C.castCmd(s, 'guard');
    if (d > 90) C.castCmd(s, 'swordqi');
    C.castCmd(s, 'fireball');
    C.attackCmd(s);
    return null;
  };
}

/** A player who turns and runs from them, stepping aside from what is coming. */
function runner(id) {
  return (s) => {
    const live = groupOf(s, id).filter((b) => !OUT.has(b.state));
    const me = C.combatOf(s).me;
    if (!live.length) return null;
    const w = s.world;
    const b = live[0];
    const d = Math.hypot(b.x - w.x, b.y - w.y) || 1;
    const [ux, uy] = [(b.x - w.x) / d, (b.y - w.y) / d];
    const threat = live.some((o) => o.state === 'windup' && o.st > o.wind - 0.22) || C.combatOf(s).shots.some((sh) => sh.foe && Math.hypot(sh.x - w.x, sh.y - w.y) < 70);
    if (threat && !(me.cds.dash > 0)) C.dashCmd(s, [-ux, -uy]);
    return { x: -ux, y: -uy };
  };
}

test('robbers come up to have a word; choose to fight, and it is fought where you stand, and the story ends the way the fight did', () => {
  const s = cultivator(31, 3);
  const def = DEF('bandits_a');
  standNear(s, def, 0, 420);
  assert.ok(meet(s, def), 'they came up to you');
  assert.equal(s.pending?.id, 'forest_bandits');
  assert.equal(s.pending.ctx.data.beast, def.id);
  const gang = groupOf(s, def.id);
  assert.equal(gang.length, 3);
  assert.ok(gang.every((b) => b.state === 'talk'), 'standing there, waiting on your answer');
  assert.ok(!C.inCombat(s), 'not yet a fight');
  choose(s, s.pending.choices.find((c) => c.text === '拼了。').i);
  assert.equal(s.pending, null, 'no roll, no card: it comes to blows');
  play(s, 0.1);
  assert.ok(C.inCombat(s), 'right there');
  assert.ok(gang.every((b) => b.aggro), 'all three of them');
  assert.equal(gang[0].name, '獨眼龍', 'led by the one the story names');
  assert.equal(C.rankOf(gang[0]), '煉氣四層');
  assert.ok(play(s, 90, fighter(def.id), (x) => !!x.pending), 'it ends');
  const r = s.pending.result;
  assert.ok(r, 'and the story picks up');
  assert.equal(r.check.kind, '戰鬥');
  const c = EVENTS.forest_bandits.choices.find((x) => x.text === '拼了。');
  assert.equal(r.text, r.check.fight === 'win' ? c.ok.text : r.check.fight === 'lose' ? c.fail.text : '你且戰且退，總算脫了身。');
  if (r.check.fight === 'win') assert.ok(s.flags.beat_bandits, 'with what it leaves you');
  continueEvent(s);
  play(s, 4);
  assert.ok(!groupOf(s, def.id).some((b) => b.state !== 'dead'), 'and they are on their way');
  assert.ok(s.world.mobs[def.id] > s.day, 'not back for a while');
});

test('the leader beaten to his knees, the rest of them run', () => {
  const s = cultivator(32, 3);
  const def = DEF('bandits_a');
  standNear(s, def, 0, 420);
  assert.ok(meet(s, def));
  choose(s, s.pending.choices.find((c) => c.text === '拼了。').i);
  play(s, 0.1);
  const [chief, ...rest] = groupOf(s, def.id);
  E.takeFeed(s);
  chief.hp = Math.ceil(chief.maxHp * 0.21);
  before(s, chief);
  Object.assign(chief, { state: 'recover', st: 0, rec: 99 });
  C.strikeAt(s, chief.uid);
  play(s, 1.2, () => null, (x) => chief.state === 'yield');
  assert.equal(chief.state, 'yield', 'he throws down his blade');
  play(s, 0.1);
  assert.ok(rest.every((b) => b.state === 'flee'), 'and his men run');
  const feed = E.takeFeed(s).map((f) => f.text);
  assert.ok(feed.includes('獨眼龍扔下了刀，跪地求饒！'), feed.join(' / '));
  assert.ok(play(s, 3, () => null, (x) => !!x.pending));
  assert.equal(s.pending.result.check.fight, 'win', 'you won');
});

test('pay them off, and they go on their way', () => {
  const s = cultivator(33, 3);
  const def = DEF('bandits_a');
  standNear(s, def, 0, 420);
  assert.ok(meet(s, def));
  const ls = s.player.ls;
  choose(s, s.pending.choices.find((c) => c.text === '交出一半靈石。').i);
  assert.ok(s.pending.result, 'settled with a word');
  continueEvent(s);
  play(s, 0.2);
  assert.ok(!C.inCombat(s), 'no fight');
  assert.ok(groupOf(s, def.id).every((b) => b.state === 'leave'), 'they turn and go');
  play(s, 4);
  assert.equal(groupOf(s, def.id).length, 0, 'gone');
  assert.ok(s.player.ls < ls);
});

test('go for them before a word is said, and the story starts as the fight', () => {
  const s = cultivator(34, 3);
  const def = DEF('bandits_a');
  standNear(s, def, 0, 700);
  const b = groupOf(s, def.id)[1];
  before(s, b);
  E.takeFeed(s);
  C.attackCmd(s);
  play(s, 0.5, () => null, () => C.inCombat(s));
  assert.equal(s.pending, null, 'no card');
  assert.ok(s.rtFight?.on, 'their story, as a fight');
  assert.equal(EVENTS.forest_bandits.choices[s.rtFight.choice].text, '拼了。');
  assert.ok(C.inCombat(s));
  assert.ok(E.takeFeed(s).some((f) => f.text === '你搶先出手！'));
});

test('run from a robber: get away, and it went as running should', () => {
  const s = cultivator(35, 3);
  const def = DEF('robber_road');
  standNear(s, def, 0, 380);
  assert.ok(meet(s, def));
  assert.equal(s.pending?.id, 'travel_robber');
  const npc = s.pending.ctx.npc;
  const run = s.pending.choices.find((c) => c.text === '跑。');
  assert.equal(run.hint, null, 'no odds for your legs');
  choose(s, run.i);
  assert.equal(s.pending, null);
  play(s, 0.1);
  assert.ok(C.inCombat(s), 'he comes after you');
  const [robber] = groupOf(s, def.id);
  assert.equal(robber.name, npc.name, 'he is who the story says');
  assert.ok(play(s, 90, runner(def.id), (x) => !!x.pending), 'it ends');
  const r = s.pending.result;
  const c = EVENTS.travel_robber.steps.start.choices.find((x) => x.text === '跑。');
  const fight = EVENTS.travel_robber.steps.start.choices.find((x) => x.fight);
  const ctx = s.pending.ctx;
  const want = { flee: c.ok.text, lose: c.fail.text, win: fight.ok.text }[r.check.fight];
  assert.equal(r.text, resolve(want, s, ctx));
  assert.equal(r.check.fight, 'flee', 'you got away');
});

test('a pack takes turns at you, circles while it waits, and breaks once most of it is down', () => {
  const s = cultivator(36, 2);
  const def = DEF('wolves_a');
  s.tod = 23;
  standNear(s, def, 0, 300);
  s.tod = 23;
  assert.ok(meet(s, def));
  assert.ok(C.inCombat(s) && !s.pending, 'it comes for you, no card');
  const pack = groupOf(s, def.id);
  let most = 0;
  play(s, 8, () => null, () => {
    const at = pack.filter((b) => b.state === 'windup' || b.state === 'leap').length;
    most = Math.max(most, at);
    return !C.inCombat(s);
  });
  assert.ok(most >= 1, 'they went at you');
  assert.ok(most <= pack[0].R.tokens, `no more than ${pack[0].R.tokens} at once (${most})`);
  // one falls: the rest howl and turn savage
  E.takeFeed(s);
  const [a, b2, c] = pack;
  const hold = (x) => Object.assign(x, { state: 'recover', st: 0, rec: 99 });
  for (const x of pack) hold(x);
  C.combatOf(s).me.hp = C.combatOf(s).me.cap;
  a.hp = 1;
  before(s, a);
  C.strikeAt(s, a.uid);
  play(s, 1, () => null, () => a.state === 'dead');
  assert.equal(a.state, 'dead');
  assert.ok([b2, c].every((x) => x.state === 'howl'), 'the rest howl');
  play(s, 1);
  assert.ok([b2, c].every((x) => x.enraged), 'and turn savage');
  // a second: the last one runs
  hold(b2);
  hold(c);
  b2.hp = 1;
  before(s, b2);
  C.strikeAt(s, b2.uid);
  play(s, 1, () => null, () => b2.state === 'dead');
  assert.equal(c.state, 'flee', 'the last one runs for it');
  const feed = E.takeFeed(s).map((f) => f.text);
  assert.ok(feed.includes('剩下的狼夾著尾巴跑了。'), feed.join(' / '));
  play(s, 1.5);
  assert.equal(C.combatOf(s).outcome, 'won');
  assert.ok(s.world.mobs[a.uid] > s.day && s.world.mobs[b2.uid] > s.day, 'each that fell is gone a while');
});

test('fall to the wolves on the hill, and their story says how it went', () => {
  const s = cultivator(37, 0, { realm: 0, weapon: null });
  const def = DEF('wolves_a');
  s.tod = 23;
  standNear(s, def, 0, 300);
  s.tod = 23;
  assert.ok(meet(s, def));
  play(s, 90, (x) => (C.inCombat(x) && C.attackCmd(x), null), (x) => !!x.pending);
  assert.equal(s.pending?.title, '倒下');
  assert.equal(s.pending.text, EVENTS.hill_wolves.choices[0].fail.text);
  assert.equal(s.player.injury, 1);
  resolvePending(s);
});

test('a snake lies hidden in the long grass and strikes first; its venom stays in you a while', () => {
  const s = cultivator(38, 1);
  s.day = 200; // summer: the snakes are out
  const def = DEF('snake_a');
  standNear(s, def, 0, 260);
  const [snake] = groupOf(s, def.id);
  assert.equal(snake.state, 'hide');
  assert.ok(!E.targetsNear(s, 3000).some((t) => t.id === snake.uid), 'nothing there to see');
  // walk into the grass where it lies
  before(s, snake, 70);
  play(s, 0.15);
  assert.ok(C.inCombat(s), 'it was waiting for you');
  assert.ok(snake.state === 'windup' || snake.state === 'leap', 'and strikes first');
  assert.ok(snake.wind < BEAST_MOVES.strike.windup, 'quicker than when it is seen coming');
  const me = C.combatOf(s).me;
  play(s, 1.2, () => null, () => !!me.poison);
  assert.ok(me.poison, 'its venom in you');
  Object.assign(snake, { state: 'recover', st: 0, rec: 99 });
  me.hp = 3;
  const hurt = me.hurtT;
  play(s, 5);
  assert.ok(me.hurtT > hurt, 'it ate at you a while');
  assert.ok(me.hp >= 1, 'but did not finish you');
  assert.equal(me.poison, null, 'and wore off');
});

test('the restless dead: a blade goes through it, fire does not; its cold drinks your blood', () => {
  const s = cultivator(39, 4);
  s.tod = 23;
  const def = DEF('ghost_a');
  standNear(s, def, 0, 260);
  s.tod = 23;
  assert.ok(meet(s, def), 'it came up to you');
  assert.equal(s.pending?.id, 'ruins_soul');
  choose(s, s.pending.choices.find((c) => c.text === '用兵器斬散他。').i);
  play(s, 0.1);
  const [ghost] = groupOf(s, def.id);
  const hold = () => Object.assign(ghost, { state: 'recover', st: 0, rec: 99 });
  hold();
  before(s, ghost);
  const C0 = C.combatOf(s);
  E.takeFeed(s);
  C.strikeAt(s, ghost.uid);
  play(s, 0.5);
  assert.ok(C0.pops.some((p) => p.kind === 'weak'), 'the blade barely bites');
  assert.ok(E.takeFeed(s).some((f) => f.text.includes('法術才管用')), 'and you are told what will');
  C.stopStriking(s);
  const hp = ghost.hp;
  hold();
  assert.ok(C.castCmd(s, 'fireball', [ghost.x, ghost.y]));
  play(s, 0.8);
  assert.ok(ghost.hp < hp && !C0.pops.filter((p) => p.t0 > C0.t - 0.5).some((p) => p.kind === 'weak'), 'fire burns it full');
  // its bolt of cold: what it takes from you, it keeps
  ghost.hp = Math.round(ghost.maxHp * 0.5);
  const me = C0.me;
  me.hp = me.cap;
  me.inv = 0;
  const w = s.world;
  const d = Math.hypot(w.x - ghost.x, w.y - ghost.y);
  Object.assign(ghost, { state: 'windup', st: 0, move: 'soul', aim: [(w.x - ghost.x) / d, (w.y - ghost.y) / d], wind: 0.1, from: [ghost.x, ghost.y], len: 300 });
  const gh = ghost.hp;
  play(s, 1, () => null, () => me.hp < me.cap);
  assert.ok(me.hp < me.cap, 'it struck you');
  assert.ok(ghost.hp > gh, 'and drank of it');
});

test('close the game in the middle of a fight from a story, and it ends as if you had got away', () => {
  const s = cultivator(40, 3);
  const def = DEF('bandits_a');
  standNear(s, def, 0, 420);
  assert.ok(meet(s, def));
  choose(s, s.pending.choices.find((c) => c.text === '拼了。').i);
  play(s, 1);
  assert.ok(C.inCombat(s));
  const t = parseSave(serialize(s));
  assert.ok(t.rtFight?.on, 'the fight was on when it was saved');
  E.step(t, DT, null);
  assert.equal(t.rtFight, null);
  assert.equal(t.pending?.result?.text, '你且戰且退，總算脫了身。');
  continueEvent(t);
  E.step(t, DT, null);
  assert.ok(!groupOf(t, def.id).length, 'they are not standing there waiting');
});
