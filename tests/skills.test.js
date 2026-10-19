// 技能 (0.19): what you know is not what you carry. The library holds every
// move and 心法; the 快捷欄 holds sets of four you fill from what you know and
// switch between (two sets, a third at 築基); 心法 are held in their own
// places; practice (熟練度) changes a move as it grows. All of it is kept in
// the save, and a save from before keeps the three it chose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as SK from '../src/world/skills.js';
import * as CB from '../src/world/combat.js';
import * as E from '../src/world/explore.js';
import { MOVES, KIT_ORDER } from '../src/content/moves.js';
import { PASSIVES } from '../src/content/passives.js';
import { TECHS } from '../src/content/techniques.js';
import { EVENTS } from '../src/content/index.js';
import { serialize, parseSave, migrate } from '../src/core/save.js';
import { vitals } from '../src/core/body.js';
import { BEASTS } from '../src/world/places.js';
import { startEvent } from '../src/core/events.js';
import { fresh, finish, among } from './helpers.js';

const DT = 1 / 30;

/** A 煉氣 cultivator who knows a good many things. */
function adept(seed = 1, realm = 1) {
  const s = fresh(seed);
  Object.assign(s.player, { realm, stage: 5 });
  s.player.techs = ['qingmu', 'xuanshui', 'fox_fire', 'leifa'];
  return s;
}

/** A practice fight under way (the phantom comes at you first). */
function trial(s) {
  assert.ok(CB.startTrial(s));
  for (let f = 0; f < 60 && !CB.inCombat(s); f++) E.step(s, DT, null);
  assert.ok(CB.inCombat(s));
  return CB.combatOf(s);
}

/** A real fight: wolves about you that will not fall soon. */
function realFight(s) {
  const wolves = among(s, BEASTS.find((b) => b.id === 'wolves_a'), [[0, 110], [130, 0]]);
  for (const b of wolves) Object.assign(b, { hp: 9999, maxHp: 9999 });
  const C = CB.combatOf(s);
  C.on = true;
  for (let f = 0; f < 5; f++) E.step(s, DT, null);
  return C;
}

test('the library and the 快捷欄 are two things: every move and 心法 is in the one; the other holds sets of four', () => {
  const s = adept(1);
  const lib = SK.libraryOf(s);
  assert.equal(lib.moves.length, Object.keys(MOVES).length, 'every move is in the library');
  assert.equal(lib.passives.length, Object.keys(PASSIVES).length, 'and every 心法');
  const known = lib.moves.filter((m) => m.known).length;
  assert.ok(known > SK.SLOTS, `you can know more (${known}) than one set holds (${SK.SLOTS})`);
  assert.equal(SK.hotbarOf(s).length, SK.SLOTS);
  assert.equal(SK.setsOpen(s), 2, 'two sets at 煉氣');
  s.player.realm = 2;
  assert.equal(SK.setsOpen(s), 3, 'a third at 築基');
  // a set left to itself shows the moves you can use, the next set the ones after
  const a = SK.idsOf(s, 0);
  const b = SK.idsOf(s, 1);
  assert.deepEqual(a, KIT_ORDER.filter((id) => !SK.lockOf(s, MOVES[id])).slice(0, SK.SLOTS));
  assert.ok(b.filter(Boolean).every((id) => !a.includes(id)), 'the second set takes what the first does not');
});

test('the library can be searched, narrowed and sorted', () => {
  const s = adept(2);
  assert.ok(SK.libraryOf(s, { q: '劍' }).moves.every((m) => /劍/.test([m.name, m.school, m.desc].join(''))));
  assert.ok(SK.libraryOf(s, { school: '法修' }).moves.every((m) => m.school === '法修'));
  assert.ok(SK.libraryOf(s, { state: 'locked' }).moves.every((m) => !m.known));
  assert.ok(SK.libraryOf(s, { kind: '控制' }).moves.length > 0);
  const byMp = SK.libraryOf(s, { sort: 'mp' }).moves.map((m) => m.mp);
  assert.deepEqual(byMp, [...byMp].sort((x, y) => x - y));
  assert.ok(SK.libraryOf(s, { q: '心法' }).passives.length === Object.keys(PASSIVES).length, '心法 by their kind');
});

test('filling the sets: a move placed, a move moved within a set, a set given back to itself; the third set only at 築基', () => {
  const s = adept(3);
  assert.ok(SK.assignSlot(s, 1, 0, 'frost'));
  assert.equal(SK.idsOf(s, 1)[0], 'frost');
  assert.ok(SK.assignSlot(s, 1, 2, 'frost'), 'the same move again in the set: it moves');
  assert.equal(SK.idsOf(s, 1)[2], 'frost');
  assert.equal(SK.idsOf(s, 1).filter((x) => x === 'frost').length, 1);
  assert.ok(SK.assignSlot(s, 1, 2, null), 'emptied');
  assert.equal(SK.idsOf(s, 1)[2], null);
  assert.equal(SK.assignSlot(s, 2, 0, 'frost'), false, 'no third set before 築基');
  assert.equal(SK.useSet(s, 2), false);
  assert.ok(SK.autoSet(s, 1));
  assert.ok(SK.hotbarState(s).sets[1].auto);
});

test('casting from the sets: the fourth place casts; a move out of reach, 靈力 short or a move cooling cannot; changing sets keeps the cooldowns', () => {
  const s = adept(4);
  SK.assignSlot(s, 0, 0, 'swordqi');
  SK.assignSlot(s, 0, 1, 'fireball');
  SK.assignSlot(s, 0, 2, 'guard');
  SK.assignSlot(s, 0, 3, 'frost');
  SK.assignSlot(s, 1, 0, 'thunder');
  SK.assignSlot(s, 1, 1, 'feijian'); // (築基 and a sword: out of reach)
  realFight(s);
  const C = CB.combatOf(s);
  const me = C.me;
  me.mp = 999;
  assert.ok(CB.castCmd(s, 'frost'), 'the fourth place');
  assert.equal(CB.castCmd(s, 'frost'), false, 'not twice at once (cooling)');
  for (let f = 0; f < 20; f++) E.step(s, DT, null);
  assert.ok(CB.useSetCmd(s, 1), 'to the second set');
  assert.ok((me.cds.frost || 0) > 0, 'frost is still cooling after the change');
  const mp0 = me.mp;
  assert.equal(CB.castCmd(s, 'feijian'), false, 'out of reach');
  assert.equal(me.mp, mp0, 'and nothing spent');
  me.mp = 2;
  assert.equal(CB.castCmd(s, 'thunder'), false, '靈力 short');
  me.mp = 999;
  assert.ok(CB.castCmd(s, 'thunder'), 'and with enough');
  assert.equal(CB.castCmd(s, 'mend'), false, 'a move in no set is not cast');
});

test('掌心雷: lightning struck where you aim, all within its reach at once, left reeling', () => {
  const s = adept(5);
  SK.assignSlot(s, 0, 0, 'thunder');
  realFight(s);
  const C = CB.combatOf(s);
  C.me.mp = 999;
  const b = C.beasts.find((x) => x.hp > 0);
  const hp0 = b.hp;
  assert.ok(CB.castCmd(s, 'thunder', [b.x, b.y]));
  for (let f = 0; f < 30; f++) E.step(s, DT, null);
  assert.ok(b.hp < hp0, 'struck');
  assert.ok(C.fx.some((f) => f.kind === 'thunder'), 'and seen to strike');
  assert.ok(TECHS.leifa && EVENTS.hill_thunder, 'learned at the 雷擊木');
});

test('雷擊木: a cultivator who has been there before comes back in a storm and takes the thunder into his palm', () => {
  const s = fresh(6);
  Object.assign(s.player, { realm: 1, stage: 2 });
  s.seen.hill_lightning_tree = { n: 1, last: s.day };
  s.vars.sky = 'storm';
  assert.ok(EVENTS.hill_thunder.cond(s));
  startEvent(s, 'hill_thunder');
  finish(s);
  assert.ok(s.player.arts.includes('leifa'), 'a 功法 of fighting: kept with the arts');
  assert.ok(!SK.lockOf(s, MOVES.thunder), '掌心雷 is yours');
  assert.ok(!EVENTS.hill_thunder.cond(s), 'once');
});

test('心法: held in places of their own (one at 煉氣, two at 築基), only when you meet what they need; they change moves, blows and steps', () => {
  const s = adept(7);
  s.player.attrs.gengu = 8;
  assert.equal(SK.passiveSlots(s), 1);
  assert.equal(SK.holdPassive(s, 'lingtai').ok, false, '靈台清明 wants 築基');
  const mp0 = SK.moveOf(s, 'frost').mp;
  assert.ok(SK.holdPassive(s, 'xuanshui').ok);
  assert.ok(SK.moveOf(s, 'frost').mp < mp0, '玄水凝神: less 靈力');
  assert.equal(SK.holdPassive(s, 'tongpi').ok, false, 'one place only, at 煉氣');
  s.player.realm = 2;
  assert.equal(SK.passiveSlots(s), 2);
  assert.ok(SK.holdPassive(s, 'tongpi').ok);
  assert.ok(SK.passiveStats(s).def > 0);
  const cd0 = SK.moveOf(s, 'swordqi').cd;
  SK.holdPassive(s, 'tongpi', false);
  assert.ok(SK.holdPassive(s, 'lingtai').ok);
  assert.ok(SK.moveOf(s, 'swordqi').cd < cd0, '靈台清明: quicker again');
  // what you no longer meet the needs of falls quiet (but is kept)
  s.player.techs = [];
  assert.ok(!SK.heldPassives(s).includes('xuanshui'));
  assert.ok(s.player.passives.includes('xuanshui'));
});

test('心法 in a fight: blows kept off, blood back as you fight, a quicker step aside', () => {
  const s = adept(8, 2);
  s.player.attrs.gengu = 8;
  s.player.techs.push('tayun', 'changchun');
  const plain = adept(8, 2);
  plain.player.attrs.gengu = 8;
  plain.player.techs.push('tayun', 'changchun');
  SK.holdPassive(s, 'tongpi');
  SK.holdPassive(s, 'tayun');
  assert.ok(CB.dashCd(s) < CB.dashCd(plain), '踏雲身');
  assert.ok(vitals(s).G.def > vitals(plain).G.def, '銅皮鐵骨: a share of every blow kept off');
  realFight(s);
  const a = CB.combatOf(s).me;
  SK.holdPassive(s, 'tongpi', false);
  SK.holdPassive(s, 'changchun');
  a.hp = 50;
  a.hurtT = -99;
  const before = a.hp;
  CB.combatOf(s).beasts.forEach((b) => Object.assign(b, { state: 'recover', rec: 99 }));
  for (let f = 0; f < 60; f++) E.step(s, DT, null);
  assert.ok(a.hp > before, '長春護體: blood back while fighting');
});

test('熟練度: casting in real fights (not the 試煉) makes a move better; at 大成 some change their ways', () => {
  const practice = adept(9);
  const t = trial(practice);
  t.me.mp = 999;
  assert.ok(CB.castCmd(practice, 'swordqi'));
  for (let f = 0; f < 20; f++) E.step(practice, DT, null);
  assert.equal(SK.masteryOf(practice, 'swordqi').xp, 0, 'no practice from the 試煉');
  const s = adept(9);
  SK.assignSlot(s, 0, 0, 'fireball');
  const base = SK.moveOf(s, 'fireball');
  assert.equal(base.lv, 1);
  realFight(s);
  const C = CB.combatOf(s);
  C.me.mp = 999;
  C.me.cds = {};
  assert.ok(CB.castCmd(s, 'fireball'));
  for (let f = 0; f < 20; f++) E.step(s, DT, null);
  assert.equal(SK.masteryOf(s, 'fireball').xp, 1, 'a cast in earnest');
  s.player.skillXp.fireball = SK.MASTERY[3].xp;
  const big = SK.moveOf(s, 'fireball');
  assert.equal(big.mastery, '大成');
  assert.ok(big.mult > base.mult && big.cd < base.cd, 'stronger and quicker');
  assert.ok(big.burn > base.burn, 'and at 大成 it burns longer');
});

test('kept in the save: the sets, the set in hand, the 心法 held, the practice; a save from before keeps the three it chose', () => {
  const s = adept(10, 2);
  SK.assignSlot(s, 1, 3, 'frost');
  SK.useSet(s, 1);
  SK.holdPassive(s, 'xuanshui');
  SK.practise(s, 'frost', 7);
  const t = migrate(parseSave(serialize(s)));
  assert.equal(SK.idsOf(t, 1)[3], 'frost');
  assert.equal(SK.hotbarState(t).cur, 1);
  assert.deepEqual(SK.heldPassives(t), ['xuanshui']);
  assert.equal(SK.masteryOf(t, 'frost').xp, 7);
  // before 0.19: three chosen, kept as `kit`
  const old = adept(11);
  old.player.kit = ['fireball', 'guard', 'frost'];
  delete old.player.hotbar;
  const o = migrate(parseSave(serialize(old)));
  const ids = SK.idsOf(o, 0);
  assert.deepEqual(ids.slice(0, 3), ['fireball', 'guard', 'frost']);
  assert.ok(ids[3] && !['fireball', 'guard', 'frost'].includes(ids[3]), 'and a fourth, the usual way');
  assert.equal(o.player.kit, undefined);
});
