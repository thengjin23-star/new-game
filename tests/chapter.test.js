// 第一章收尾 (0.17): the lines of 東荒 coming to their ends — 蘇清瑤 leaving
// for 中州, 林塵 leaving with a grudge, the third 天機殘頁, the system at
// 五級 remembering its name — and the crossing at 白鶴渡 that ends the
// chapter, with what became of everyone you knew.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startEvent } from '../src/core/events.js';
import { newReport } from '../src/core/time.js';
import { migrate } from '../src/core/save.js';
import * as A from '../src/core/actions.js';
import { WINDOWS } from '../src/world/arcs.js';
import { sysGain, SYS_LEVELS, SYS_FEATURES } from '../src/world/system.js';
import { FRAGMENTS } from '../src/content/fragments.js';
import { EVENTS } from '../src/content/index.js';
import { checkFeats } from '../src/world/feats.js';
import { nextGoal } from '../src/world/guide.js';
import { chapterFates, chapterSelf, chapterSystem, fateLine } from '../src/world/ending.js';
import * as E from '../src/world/explore.js';
import { fresh, resolvePending, waitUntil, goToPoi, pickText, finish } from './helpers.js';

const due = (s, ev) => s.sched.find((x) => x.ev === ev);

test('系統五級: it remembers its name (once); a save already at 五級 is given the remembering too', () => {
  const s = fresh(90);
  assert.ok(SYS_FEATURES.some((f) => f.lv === 5), 'something comes with 五級');
  sysGain(s, SYS_LEVELS[4] - s.sys.exp + 1, newReport());
  assert.equal(s.sys.lv, 5);
  assert.ok(due(s, 'sys_awaken'), 'its remembering is set to come');
  startEvent(s, 'sys_awaken');
  assert.match(s.pending.text, /玄微/);
  finish(s);
  assert.ok(s.flags.sys_awakened);
  checkFeats(s);
  assert.ok(s.vars.feats.xuanwei !== undefined, '成就：玄微');
  // a save from before 0.17, already at 五級
  const old = fresh(91);
  old.sys.exp = 900;
  old.sys.lv = 5;
  migrate(old);
  migrate(old);
  assert.equal(old.sched.filter((x) => x.ev === 'sys_awaken').length, 1, 'set to come, and only once');
});

test('天機感應: at 五級, 推演 tells you where a missing page lies', () => {
  const s = fresh(92);
  s.sys.exp = 900;
  s.sys.lv = 5;
  s.sys.frags = ['frag_well', 'frag_ruins'];
  s.sys.lastDeduce = -999;
  A.deduce(s);
  assert.match(s.pending?.text || '', /江心洲/);
});

test('the third page: the old fisher of 江心洲 has kept it for you', () => {
  assert.ok(FRAGMENTS.frag_river);
  const s = fresh(93);
  s.flags.isle_fisher_met = true;
  s.sys.lv = 3;
  const ev = EVENTS.air_isle_page;
  assert.ok(ev.cond(s));
  startEvent(s, 'air_isle_page');
  finish(s);
  assert.ok(s.sys.frags.includes('frag_river'));
  assert.ok(!ev.cond(s), 'once');
});

test('蘇清瑤 leaves for 中州: a friend is waited for at the teahouse; a rival is faced; a stranger only hears of it', () => {
  const friend = fresh(94);
  Object.assign(friend.npcs.su_qingyao, { met: true, favor: 40 });
  waitUntil(friend, WINDOWS.suLeave[0] + 1);
  const x = due(friend, 'su_farewell');
  assert.ok(x && x.node === 'luoxia_market', 'she waits at the market');
  startEvent(friend, 'su_farewell');
  pickText(friend, '上一世');
  finish(friend);
  assert.ok(friend.player.items.su_slip && friend.flags.su_farewell && friend.flags.blood_moon_warned);
  assert.equal(friend.npcs.su_qingyao.loc, null, 'and she is gone');

  const rival = fresh(95);
  Object.assign(rival.npcs.su_qingyao, { met: true, favor: -30 });
  rival.flags.su_rival = true;
  waitUntil(rival, WINDOWS.suLeave[0] + 1);
  assert.ok(due(rival, 'su_rival_end'));

  const stranger = fresh(96);
  waitUntil(stranger, WINDOWS.suLeave[0] + 1);
  assert.ok(stranger.flags.su_left && stranger.npcs.su_qingyao.loc === null);
  assert.ok(stranger.rumors.some((r) => r.text.includes('白衣女修')));

  // a farewell never had: she goes all the same, in a year
  const late = fresh(97);
  Object.assign(late.npcs.su_qingyao, { met: true, favor: 40 });
  waitUntil(late, WINDOWS.suLeave[1] + 1);
  assert.ok(late.flags.su_left);
});

test('林塵 leaves with a grudge, if he has one', () => {
  const s = fresh(98);
  Object.assign(s.npcs.lin_chen, { met: true, favor: -50 });
  waitUntil(s, WINDOWS.songheEnd[0] + 100);
  assert.ok(due(s, 'lin_grudge') || s.flags.lin_grudge, 'he comes to say so');
  startEvent(s, 'lin_grudge');
  finish(s);
  assert.ok(s.flags.lin_grudge);
});

test('白鶴渡: once 築基, the goal is the river; the crossing ends the chapter, and the ending tells what became of them', () => {
  const s = fresh(99);
  s.flags.opening_done = true;
  s.player.realm = 2;
  s.player.stage = 0;
  s.player.hp = 9999;
  assert.equal(nextGoal(s)?.key, 'ferry');
  s.flags.crane_friend = true;
  s.player.items.lin_jade = 1;
  Object.assign(s.npcs.wang_er, { favor: 40 });
  goToPoi(s, 'ferry_pier');
  resolvePending(s);
  E.interact(s, { kind: 'poi', id: 'ferry_pier' });
  for (let k = 0; k < 4 && s.pending?.id !== 'ferry_cross'; k++) {
    resolvePending(s);
    E.interact(s, { kind: 'poi', id: 'ferry_pier' });
  }
  assert.equal(s.pending?.id, 'ferry_cross');
  assert.match(s.pending.text, /白鶴落在船頭/);
  assert.match(s.pending.text, /王二/);
  assert.match(s.pending.text, /玉佩/);
  finish(s);
  assert.ok(s.flags.chapter1_done && s.flags.chapter1_ending, 'the chapter is done, and its ending is shown');
  checkFeats(s);
  assert.ok(s.vars.feats.chapter1 !== undefined, '成就：東荒行盡');
  assert.notEqual(nextGoal(s)?.key, 'ferry');
  // the ending: you, them, the system
  assert.match(chapterSelf(s).line, new RegExp(s.player.name));
  const fates = Object.fromEntries(chapterFates(s));
  for (const who of ['林塵', '蘇清瑤', '松鶴道人', '王二']) assert.ok(fates[who], who);
  assert.match(fates['林塵'], /玉佩/);
  assert.ok(chapterSystem(s).line.includes('天機殘頁'));
  assert.ok(!EVENTS.ferry_cross.cond(s), 'it ends once');
});

test('the fates read what you did: 松鶴 saved and 築基, 蘇清瑤 a rival, 胡三娘 betrayed', () => {
  const s = fresh(100);
  s.flags.songhe_zhuji = true;
  s.flags.su_rival = true;
  s.npcs.su_qingyao.met = true;
  s.npcs.hu_sanniang.met = true;
  s.flags.fox_betrayed = true;
  const fates = Object.fromEntries(chapterFates(s));
  assert.match(fates['松鶴道人'], /築基/);
  assert.match(fates['蘇清瑤'], /再算/);
  assert.match(fates['胡三娘'], /賣給了青雲宗/);
  s.npcs.song_he.alive = false;
  s.flags.songhe_zhuji = false;
  s.flags.legacy_taken = true;
  assert.match(Object.fromEntries(chapterFates(s))['松鶴道人'], /手札/);
});

test('命簿殘影: only at 五級, a line for each of the named', () => {
  const s = fresh(101);
  assert.equal(fateLine(s, 'lin_chen'), null, 'not before 五級');
  s.sys.lv = 5;
  for (const id of ['lin_chen', 'su_qingyao', 'song_he', 'wang_er', 'hu_sanniang']) assert.match(fateLine(s, id), /^命簿：/, id);
  s.npcs.wang_er.alive = false;
  assert.match(fateLine(s, 'wang_er'), /寫完了/);
});
