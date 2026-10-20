// 手感 (0.20): a blow that lands says how hard it landed (the screen stops a
// moment and shakes by it, the fight does not); a beast checked by your blow
// flinches — not a boss, not again at once, and a heavy blow breaks off what
// it gathers itself for; worn down, some fight another way; some see your
// shots coming and spring aside.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import { BEASTS } from '../src/world/places.js';
import { createFeel } from '../src/ui/feel.js';
import { fresh, among } from './helpers.js';

const DT = 1 / 30;

/** A 煉氣 cultivator with a blade, and a group (def) just now seeing them at these places. */
function staged(defId, spots, seed = 3, stage = 5) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 1, stage, weapon: 'chaidao', injury: 0 });
  s.player.items.chaidao = 1;
  const list = among(s, BEASTS.find((b) => b.id === defId), spots);
  for (const b of list) Object.assign(b, { state: 'notice', st: 0, aggro: false, stay: true, home: [b.x, b.y] });
  const me = CB.hero(s);
  me.hp = me.cap;
  me.mp = me.maxMp;
  return { s, C: CB.combatOf(s), list };
}

/** Run the fight a while: brain(s) presses buttons; stop when done(s). */
function run(s, secs, brain = () => {}, done = () => false) {
  for (let k = 0; k < secs / DT; k++) {
    brain(s);
    E.step(s, DT, null);
    if (done(s)) return true;
  }
  return false;
}

test('a blow that lands says how hard: a strike, the heavy third of a run, a kill — the last of them — and you hurt', () => {
  const { s, C, list } = staged('wolves_a', [[0, 110], [120, 0], [-100, -50]]);
  const seen = new Set();
  const lasts = [];
  let heavyPop = false;
  run(s, 60, (x) => {
    CB.attackCmd(x, null, true);
    for (const h of C.hits) {
      seen.add(h.kind);
      if (h.kind === 'kill') lasts.push(h.last);
    }
    if (C.pops.some((p) => p.kind === 'heavy')) heavyPop = true;
  }, () => list.every((b) => ['dead', 'gone', 'flee'].includes(b.state)) && !CB.inCombat(s));
  assert.ok(seen.has('strike'), `strikes land (${[...seen]})`);
  assert.ok(seen.has('heavy') && heavyPop, 'the heavy third of a run is told apart (and its number)');
  assert.ok(seen.has('kill'), 'a kill');
  assert.ok(seen.has('hurt'), 'and the wolves got their teeth in');
  assert.ok(lasts.includes(true), 'the fall that ends it is the last');
  // the hits fade with the fight's own time, like the rest of what it shows
  run(s, 1);
  assert.equal(C.hits.length, 0);
});

test('checked by a blow: it flinches as it comes at you — not again at once, not a boss; a heavy blow breaks off what it gathers itself for', () => {
  const { s, C, list } = staged('demon_wolf_a', [[0, 60]]);
  const b = list[0];
  run(s, 3, () => {}, () => CB.inCombat(s));
  // coming at you: your blow stops it a moment
  run(s, 2, (x) => CB.attackCmd(x, null, true), () => b.state === 'flinch');
  assert.equal(b.state, 'flinch', 'it flinches');
  const poise = b.poise;
  assert.ok(poise > C.t, 'and steadies itself a while');
  run(s, 0.3);
  assert.notEqual(b.state, 'flinch', 'a moment, then on again');
  // gathering itself: a plain blow does not break it off; a heavy one does (and not again for longer)
  Object.assign(b, { poise: 0, state: 'windup', st: 0, wind: 9, move: b.R.moves[0], aim: [0, 1] });
  b.hp = b.maxHp;
  C.me.run = 0;
  C.me.runT = -9;
  let broke = false;
  run(s, 6, (x) => {
    if (b.state !== 'windup' && b.state !== 'stun') Object.assign(b, { state: 'windup', st: 0, wind: 9 });
    CB.attackCmd(x, null, true);
  }, () => {
    if (b.state === 'stun') broke = true;
    return broke;
  });
  assert.ok(broke, 'the heavy third of a run breaks it off');
  assert.ok(b.poise - C.t > 2, 'and it is not broken off again soon');
});

test('a boss is never checked by a blow', () => {
  const { s, list } = staged('fire_tiger_a', [[0, 60]], 4, 8);
  const b = list[0];
  run(s, 3, () => {}, () => CB.inCombat(s));
  let flinched = false;
  run(s, 6, (x) => {
    CB.attackCmd(x, null, true);
    if (b.state === 'flinch') flinched = true;
  });
  assert.ok(b.hp < b.maxHp, 'struck');
  assert.ok(!flinched, 'and never flinched');
});

test('worn down, a beast that rages comes on harder (and says so)', () => {
  const { s, C, list } = staged('shanxiao_a', [[0, 70], [90, 0]], 5, 7);
  const [a] = list;
  run(s, 3, () => {}, () => CB.inCombat(s));
  a.hp = a.maxHp * 0.32;
  const told = [];
  run(s, 4, (x) => {
    CB.attackCmd(x, null, true);
    for (const f of E.takeFeed(x)) told.push(f.text);
  }, () => a.lowDone);
  for (const f of E.takeFeed(s)) told.push(f.text);
  assert.ok(a.lowDone && a.enraged, 'worn past its mark, it rages');
  assert.ok(told.some((t) => t.includes('沒命地砸')), 'and you see it');
  assert.ok(C.on, 'the fight goes on');
});

test('one that sees your shots coming springs aside', () => {
  const { s, C, list } = staged('robber_road', [[0, 200]], 6, 6);
  const b = list[0];
  // (it talks first: go for it, and it fights)
  s.player.arts = ['qingyuan_sword'];
  run(s, 4, (x) => CB.castCmd(x, 'swordqi'), (x) => CB.inCombat(x) && b.state === 'chase');
  assert.ok(CB.inCombat(s), 'a fight');
  b.R = { ...b.R, dodge: 1 };
  b.dodgeT = 0;
  const me = C.me;
  let sprang = false;
  run(s, 6, (x) => {
    me.mp = me.maxMp;
    if (b.state === 'chase' && !(me.cds.swordqi > 0)) CB.castCmd(x, 'swordqi', [b.x, b.y]);
    if (b.state === 'hop') sprang = true;
  }, () => sprang);
  assert.ok(sprang, 'it springs aside from the sword qi');
});

test('掌心雷 left to find its mark catches a wolf running at you (it is struck where the wolf will be)', () => {
  const { s, C, list } = staged('wolves_a', [[0, 240]], 7, 6);
  const b = list[0];
  s.player.arts = ['leifa'];
  const me = C.me || CB.hero(s);
  // running at you, flat out, still well off
  const running = run(s, 4, () => {}, () => CB.inCombat(s) && b.state === 'chase' && Math.hypot(b.vx, b.vy) > 150 && Math.hypot(b.x - s.world.x, b.y - s.world.y) > 140);
  assert.ok(running, 'it comes at you');
  me.mp = me.maxMp;
  const hp = b.hp;
  assert.ok(CB.castCmd(s, 'thunder'), 'cast');
  let struck = false;
  run(s, 0.8, () => {
    if (C.fx.some((f) => f.kind === 'hitfx' && f.of === 'thunder')) struck = true;
  });
  assert.ok(struck && b.hp < hp, 'the bolt finds it');
});

test('the screen: a heavy blow stops it a moment, the last fall slows it, and the shake is the player’s to turn off', () => {
  const canvas = { style: { transform: '' } };
  const edge = { style: { opacity: '' } };
  const feel = createFeel({ canvases: () => [canvas], edge });
  const C = { hits: [] };
  assert.equal(feel.frame(C, 1 / 60), 1, 'nothing landed: the world runs');
  C.hits.push({ kind: 'heavy', t0: 0, share: 0.2 });
  const paces = [];
  const shook = [];
  for (let k = 0; k < 12; k++) {
    paces.push(feel.frame(C, 1 / 60));
    shook.push(canvas.style.transform);
  }
  assert.ok(paces[0] < 0.1, 'a heavy blow stops the world a moment');
  assert.equal(paces.at(-1), 1, 'and only a moment');
  assert.ok(shook[0].includes('translate3d'), 'and it shakes');
  for (let k = 0; k < 60; k++) feel.frame(C, 1 / 60);
  assert.equal(canvas.style.transform, '', 'then is still again');
  C.hits.push({ kind: 'kill', t0: 1, last: true });
  const slow = [];
  for (let k = 0; k < 40; k++) slow.push(feel.frame(C, 1 / 60));
  assert.ok(slow.some((p) => p > 0.3 && p < 0.4), 'the last one falling slows it');
  assert.ok(slow.every((p) => p <= 1), 'never faster than it runs');
  C.hits.push({ kind: 'hurt', t0: 2, share: 0.2 });
  feel.frame(C, 1 / 60);
  assert.ok(+edge.style.opacity > 0.3, 'hurt badly: the edge goes red');
  feel.calm();
  assert.equal(edge.style.opacity, '0');
});
