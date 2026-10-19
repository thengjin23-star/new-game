// 技能流派: what you can call on in a fight comes from what you have learned,
// what you hold, and the body you were born with; you carry three of them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as C from '../src/world/combat.js';
import { BEASTS } from '../src/world/places.js';
import { MOVES, TRIAL_KIT } from '../src/content/moves.js';
import { serialize, parseSave } from '../src/core/save.js';
import { nearestOpen, collides, regionIdAt } from '../src/world/terrain.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;
const WOLVES = BEASTS.find((b) => b.id === 'wolves_a');
const GHOST = BEASTS.find((b) => b.id === 'ghost_a');

function cultivator(seed, extra = {}, attrs = {}) {
  const s = fresh(seed);
  Object.assign(s.player, { realm: 1, stage: 3, weapon: 'chaidao', arts: [], techs: [], tech: null, injury: 0 }, extra);
  Object.assign(s.player.attrs, { gengu: 4 }, attrs);
  s.tod = 15;
  return s;
}

const ids = (s) => C.kitOf(s).map((k) => k.id);
const open = (s) => C.movesOf(s).filter((m) => !m.locked).map((m) => m.id);

function play(s, secs, done = () => false) {
  for (let k = 0; k < secs / DT; k++) {
    E.step(s, DT, null);
    if (done(s)) return true;
  }
  return false;
}

/** Open ground in the wilds south-west of 青石鎮: nothing in the way for a good way round, all of it one region. */
const MEADOW = [1426, 3782];

/** Stand in the open, with members of a group set about you (dx, dy each), still and waiting to be hit. */
function among(s, def, spots) {
  let at = null;
  for (let r = 0; r < 500 && !at; r += 30) {
    for (let a = 0; a < 6.28 && !at; a += 0.5) {
      const x = MEADOW[0] + Math.cos(a) * r;
      const y = MEADOW[1] + Math.sin(a) * r;
      const home = regionIdAt(x, y);
      let ok = !collides(s, x, y, 16);
      for (let q = 0; q < 6.28 && ok; q += 0.4) {
        for (let d = 10; d <= 200 && ok; d += 10) {
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
  s.tod = 15;
  const w = s.world;
  const list = C.beastsInWorld(s, 99999).filter((b) => b.def.id === def.id);
  spots.forEach(([dx, dy], i) => Object.assign(list[i], { x: w.x + dx, y: w.y + dy, state: 'recover', st: 0, rec: 99, aggro: true }));
  return list.slice(0, spots.length);
}

/** An open way out from where you stand, len long. */
function clearWay(s, len) {
  const w = s.world;
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    let ok = true;
    for (let r = 0; r <= len && ok; r += 8) if (collides(s, w.x + Math.cos(a) * r, w.y + Math.sin(a) * r, 16)) ok = false;
    if (ok) return [Math.cos(a), Math.sin(a)];
  }
  throw new Error('no open ground');
}

test('a 煉氣 cultivator who has learned nothing carries 劍氣, 火球, 護體 as before, and 靈力外放 in the fourth place; a 凡人 sees the three waiting', () => {
  const s = cultivator(51);
  assert.deepEqual(ids(s), ['swordqi', 'fireball', 'guard', 'qi']);
  assert.ok(C.kitOf(s).every((k) => !k.locked));
  assert.ok(open(s).includes('qi'), '靈力外放 is anyone’s');
  const m = cultivator(52, { realm: 0, stage: 0 });
  assert.deepEqual(ids(m), TRIAL_KIT);
  assert.ok(C.kitOf(m).every((k) => k.locked === '需引氣入體'));
});

test('what you learn, what you hold and the body you have open the rest', () => {
  const s = cultivator(53);
  for (const id of ['swordstep', 'foxfire', 'mend', 'sweep', 'charge', 'iron']) assert.ok(!open(s).includes(id), `${id} is not yours yet`);
  assert.match(C.movesOf(s).find((m) => m.id === 'swordstep').locked, /青元劍訣/, 'it says what it asks');
  s.player.arts.push('qingyuan_sword');
  assert.ok(open(s).includes('swordstep'), 'an art');
  assert.ok(C.movesOf(s).find((m) => m.id === 'swordqi').good, 'and 劍氣 is the stronger for it');
  const t = cultivator(54, { weapon: 'qinggang_sword' });
  assert.ok(open(t).includes('swordstep'), 'a sword in hand');
  const f = cultivator(55, { arts: ['fox_fire'], techs: ['qingmu'] });
  assert.ok(open(f).includes('foxfire') && open(f).includes('mend'), 'fox fire from 胡三娘, 回春 from 青木訣');
  const body = cultivator(56, { realm: 0, stage: 0 }, { gengu: 7 });
  assert.ok(open(body).includes('sweep') && open(body).includes('charge'), 'a strong body, even a 凡人');
  assert.ok(!open(body).includes('iron'));
  assert.ok(ids(body).includes('charge') && ids(body).includes('sweep'), 'and a 凡人 carries them');
  const farmer = cultivator(57, { realm: 0, stage: 0, arts: ['wild_boxing'] });
  assert.ok(open(farmer).includes('sweep'), '莊稼把式 teaches the sweep');
  const zhuji = cultivator(58, { realm: 2, stage: 0 });
  for (const id of ['sweep', 'charge', 'iron']) assert.ok(open(zhuji).includes(id), `${id}: at 築基 the body is remade`);
});

test('fill the first set: it is what you carry (and what the keys call), and a save keeps it', () => {
  const s = cultivator(59, { arts: ['fox_fire'] }, { gengu: 7 });
  C.setKit(s, ['charge', 'qi', 'foxfire']);
  assert.deepEqual(ids(s), ['charge', 'qi', 'foxfire']);
  // one you cannot use keeps its place, out of reach and saying why — and is not cast
  C.setKit(s, ['mend', 'qi']);
  assert.equal(C.kitOf(s)[0].id, 'mend');
  assert.match(C.kitOf(s)[0].locked, /青木訣/);
  assert.equal(C.castCmd(s, 'mend'), false);
  C.setKit(s, ['charge', 'qi', 'foxfire']);
  const t = parseSave(serialize(s));
  assert.deepEqual(ids(t), ['charge', 'qi', 'foxfire'], 'kept');
  C.setKit(t, null);
  assert.deepEqual(ids(t), ['swordqi', 'fireball', 'guard', 'foxfire'], 'and given back to the system to choose');
  assert.equal(t.player.kit, undefined);
});

test('a sweep trips everyone about you; a charge throws the first one back; a sword-step cuts through them all', () => {
  const s = cultivator(60, { arts: ['qingyuan_sword'] }, { gengu: 7 });
  C.setKit(s, ['sweep', 'charge', 'swordstep']);
  const [a, b, c] = among(s, WOLVES, [[30, 0], [-28, 10], [0, 160]]);
  const hurt = (x) => x.armed && x.hp < x.maxHp;
  assert.ok(C.castCmd(s, 'sweep'));
  play(s, 0.25);
  assert.ok(hurt(a) && hurt(b), 'the two close by are hit');
  assert.ok(!hurt(c), 'the one further off is not');
  assert.ok(a.state === 'stun' && b.state === 'stun', 'and they reel');
  assert.equal(C.combatOf(s).me.mp, C.combatOf(s).me.maxMp, 'a move of the body: no 靈力');
  play(s, 1.2);
  assert.ok(a.state !== 'stun', 'then come to');
  // the charge: along an open way, the first it meets thrown back
  const t = cultivator(61, {}, { gengu: 7 });
  C.setKit(t, ['charge']);
  const [x] = among(t, WOLVES, [[0, 0]]);
  const w = t.world;
  const [ux, uy] = clearWay(t, 200);
  Object.assign(x, { x: w.x + ux * 110, y: w.y + uy * 110 });
  const x0 = [x.x, x.y];
  assert.ok(C.castCmd(t, 'charge', [x.x, x.y]));
  play(t, 0.6);
  assert.ok(hurt(x), 'struck');
  assert.ok((x.x - x0[0]) * ux + (x.y - x0[1]) * uy > 20, 'and thrown back');
  // the sword-step: through a line of them, each cut once
  const u = cultivator(62, { arts: ['qingyuan_sword'] });
  C.setKit(u, ['swordstep']);
  const pair = among(u, WOLVES, [[0, 0], [0, 0]]);
  const v = u.world;
  const [vx, vy] = clearWay(u, 200);
  Object.assign(pair[0], { x: v.x + vx * 50, y: v.y + vy * 50 });
  Object.assign(pair[1], { x: v.x + vx * 105, y: v.y + vy * 105 });
  const start = [v.x, v.y];
  assert.ok(C.castCmd(u, 'swordstep', [v.x + vx * 150, v.y + vy * 150]));
  play(u, 0.1);
  assert.ok(C.combatOf(u).me.inv > 0, 'untouchable as you go');
  play(u, 0.5);
  assert.ok(pair.every((p) => hurt(p)), 'both cut');
  assert.ok(Math.hypot(v.x - start[0], v.y - start[1]) > 120, 'and you are past them');
});

test('fox fire finds its own way, and burns the dead worse than a blade', () => {
  const s = cultivator(63, { arts: ['fox_fire'] });
  s.tod = 23;
  C.setKit(s, ['foxfire']);
  const [x, y] = nearestOpen(s, GHOST.x + 200, GHOST.y + 160, 6);
  E.placeAt(s, x, y);
  resolvePending(s);
  s.tod = 15;
  const ghost = C.beastsInWorld(s, 3000).find((b) => b.def.id === GHOST.id);
  const w = s.world;
  const [ux, uy] = clearWay(s, 140);
  // off to the side of where you face: the flames go round to it
  Object.assign(ghost, { x: w.x + ux * 110, y: w.y + uy * 110, state: 'recover', st: 0, rec: 99, aggro: true });
  C.hero(s).dir = [-uy, ux];
  C.hero(s).target = null;
  const hp = ghost.hp ?? null;
  // (going for it starts its story as a fight; that is all right here)
  assert.ok(C.castCmd(s, 'foxfire', [w.x - uy * 100, w.y + ux * 100]));
  play(s, 1.2, () => !!s.pending);
  assert.ok(ghost.armed && ghost.hp < (hp ?? ghost.maxHp), 'they found it');
  assert.ok(C.combatOf(s).pops.some((p) => p.kind === 'dmg' || p.kind === 'crit'), 'and burned it full, not as a blade would');
});

test('回春 brings blood back and clears venom; 金剛 halves what you take', () => {
  const s = cultivator(64, { techs: ['qingmu'] }, { gengu: 8 });
  C.setKit(s, ['mend', 'iron']);
  const me = C.hero(s);
  me.hp = Math.round(me.cap * 0.3);
  me.poison = { left: 4, dps: 1, tick: 0.5 };
  const h0 = me.hp;
  assert.ok(C.castCmd(s, 'mend'));
  play(s, 3.5);
  assert.ok(me.hp > h0 + me.cap * 0.2, `blood back (${h0} → ${Math.round(me.hp)})`);
  assert.equal(me.poison, null, 'the venom gone');
  // what a bite does, braced and not
  const bites = (braced) => {
    const t = cultivator(65, {}, { gengu: 8 });
    C.setKit(t, ['iron']);
    const [wolf] = among(t, WOLVES, [[30, 0]]);
    const m = C.hero(t);
    let took = 0;
    for (let i = 0; i < 12; i++) {
      m.hp = m.cap;
      m.inv = 0;
      if (braced) {
        m.cds = {};
        C.castCmd(t, 'iron');
        play(t, 0.25);
      }
      const before = m.hp;
      const w = t.world;
      const d = Math.hypot(w.x - wolf.x, w.y - wolf.y);
      Object.assign(wolf, { state: 'windup', st: 0, move: 'nip', aim: [(w.x - wolf.x) / d, (w.y - wolf.y) / d], wind: 0.05 });
      play(t, 0.15);
      took += before - m.hp;
      Object.assign(wolf, { state: 'recover', st: 0, rec: 99, x: w.x + 30, y: w.y });
    }
    return took;
  };
  const plain = bites(false);
  const braced = bites(true);
  assert.ok(plain > 0);
  assert.ok(braced < plain * 0.65, `braced, much less (${braced} vs ${plain})`);
});

test('every move there is has what it needs to be used', () => {
  for (const [id, m] of Object.entries(MOVES)) {
    assert.ok(m.name && m.school && m.desc, `${id}: named, in a school, described`);
    assert.ok(m.cd > 0 && m.mp >= 0, `${id}: a cooldown and a cost`);
    if (m.school === '體修') assert.equal(m.mp, 0, `${id}: a move of the body costs no 靈力`);
    if (['line', 'ground', 'dash', 'seek'].includes(m.aim)) assert.ok(m.range > 0, `${id}: range`);
    if (m.aim === 'around') assert.ok(m.radius > 0, `${id}: radius`);
    if (m.aim === 'seek') assert.ok(m.count > 0 && m.speed > 0, `${id}: how many, how fast`);
  }
});
