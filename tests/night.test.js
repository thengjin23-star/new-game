// 血月那一夜 (1.3「血月」), its bones (world/night.js; the watches in world/combat.js; the cards in
// content/events/bloodnight.js): the night's day (and a save past it, put off a year); three days' warning,
// that wakes you out of a seclusion; dusk, wherever you are; three watches, each a fight with a card between
// (and a place to stand if the game is closed); leaving the field, going down in it; dawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as C from '../src/world/combat.js';
import * as A from '../src/core/actions.js';
import { serialize, parseSave, migrate } from '../src/core/save.js';
import { startEvent, continueEvent, takeDue } from '../src/core/events.js';
import { DAYS_PER_YEAR } from '../src/core/calendar.js';
import {
  BLOOD_DAY, DAWN, PLACES, MARKS, INK_MAX, nightDay, postponed, nightOf, nightDone, openNight, placeOf, watchNow, nightDate, landedAt, helpersAt,
} from '../src/world/night.js';
import { setPlan, planBlocked, starWatch, setStarWatch } from '../src/world/roster.js';
import { useMap } from '../src/world/atlas.js';
import { FRAGMENTS } from '../src/content/fragments.js';
import { collides } from '../src/world/terrain.js';
import { fresh, resolvePending, pickText, finish, waitUntil, goTo } from './helpers.js';

const DT = 0.1;

/** The world takes steps (brain: what you do each one; done: stop when it says so). */
function play(s, secs, brain = () => null, done = () => false) {
  for (let k = 0; k < secs / DT; k++) {
    E.step(s, DT, brain(s));
    if (done(s)) return true;
  }
  return false;
}

/** What is on screen, played through without choosing (a result, a notice). */
function onward(s) {
  for (let k = 0; k < 10 && (s.pending?.result || s.pending?.notice); k++) continueEvent(s);
}

/** One who stands and strikes, and is kept on their feet (the watch is what is being tested, not the fighting). */
function stand(x) {
  x.player.hp = C.hero(x).cap;
  if (C.inCombat(x)) C.attackCmd(x);
  return null;
}

/** 金丹, on the night's day, in the middle of 青石鎮, a little before dusk. */
function onTheNight(seed, region = 'qingshi_town') {
  const s = fresh(seed);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 3, stage: 1, xw: 0, injury: 0, weapon: 'qinggang_sword' });
  waitUntil(s, BLOOD_DAY);
  resolvePending(s);
  s.sched = [];
  goTo(s, region);
  resolvePending(s);
  s.tod = 18.9;
  return s;
}

/** Dusk comes (the clock runs as you go about: here, it is put on): the moon rises. */
function dusk(s) {
  play(s, 1);
  assert.ok(!s.pending, 'not yet');
  s.tod = 19.05;
  play(s, 1, () => null, (x) => !!x.pending);
  assert.equal(s.pending?.id, 'night_rise', 'the moon rises');
}

test('the night\'s day: 天元三千零二十二年七月十五 for a new life; a save that comes to 1.3 past it has it put off to a 七月十五 a month off at the least, and is told so', () => {
  const s = fresh(501);
  assert.equal(nightDay(s), BLOOD_DAY);
  assert.ok(!postponed(s));
  assert.equal(nightDate(s), '天元三千零二十二年七月十五');
  // a save from before 1.3, forty days past the night (the stroke never fell: 「未竟。墨不足。」)
  const old = JSON.parse(serialize(s));
  old.day = BLOOD_DAY + 40;
  delete old.vars.bloodNight;
  old.sched.push({ ev: 'blood_moon_omen', due: BLOOD_DAY + 1, node: null, expire: null, data: null });
  const back = migrate(old);
  assert.equal(nightDay(back), BLOOD_DAY + DAYS_PER_YEAR, 'the next 七月十五');
  assert.ok(postponed(back));
  assert.ok(!back.sched.some((x) => x.ev === 'blood_moon_omen'), 'the old omen is not waited on');
  assert.equal(back.sched.filter((x) => x.ev === 'night_delayed').length, 1, 'told, once');
  const due = takeDue(back, back.player.loc);
  assert.equal(due?.id, 'night_delayed');
  startEvent(back, due.id);
  assert.match(back.pending.text, /三千零二十三年七月十五/);
  finish(back);
  assert.ok(back.flags.night_delay_told);
  assert.ok(!migrate(JSON.parse(serialize(back))).sched.some((x) => x.ev === 'night_delayed'), 'and not again');
  // ten days short of the next one: a year on from that (a month's notice at the least)
  const near = JSON.parse(serialize(s));
  near.day = BLOOD_DAY + DAYS_PER_YEAR - 10;
  delete near.vars.bloodNight;
  const later = migrate(near);
  assert.equal(nightDay(later), BLOOD_DAY + 2 * DAYS_PER_YEAR);
  assert.ok(nightDay(later) - later.day >= 30);
  // closed in the small hours of that very night (and the old omen not yet come): it is still that night
  const mid = JSON.parse(serialize(s));
  mid.day = BLOOD_DAY + 1;
  mid.tod = 2;
  delete mid.vars.bloodNight;
  assert.equal(nightDay(migrate(mid)), BLOOD_DAY);
  // and a save from before it, well before: as it was
  const before = JSON.parse(serialize(s));
  delete before.vars.bloodNight;
  assert.equal(nightDay(migrate(before)), BLOOD_DAY);
});

test('three days before, the system wakes you out of a seclusion; sit down again and you sit through it — and come out to hear of it', () => {
  const s = fresh(502);
  s.flags.opening_done = true;
  waitUntil(s, BLOOD_DAY - 20);
  resolvePending(s);
  s.sched = [];
  A.startSeclusion(s, 60, 0);
  assert.ok(s.secl, 'sat down');
  A.tickSeclusion(s, 1e12);
  assert.equal(s.secl, null);
  assert.equal(s.day, BLOOD_DAY - 3, 'woken three days before');
  assert.ok(s.flags.night_warned);
  assert.equal(s.pending?.title, '出關');
  assert.match(s.pending.text, /天象異常/);
  assert.match(s.pending.text, /被迫中止/);
  continueEvent(s);
  assert.equal(s.pending?.id, 'night_warn', 'and what it is, after');
  assert.match(s.pending.text, /三日後|三天以後/);
  finish(s);
  // sit down again: no waking this time
  A.startSeclusion(s, 30, 0);
  assert.ok(s.secl);
  A.tickSeclusion(s, 1e12);
  assert.equal(s.secl, null);
  assert.ok(s.day > BLOOD_DAY + 1, 'sat through it');
  assert.equal(nightOf(s)?.place, 'secl');
  finish(s);
  play(s, 1);
  assert.equal(s.pending?.id, 'night_dawn');
  assert.match(s.pending.text, /出關的時候/);
  finish(s);
  assert.ok(nightDone(s));
  assert.ok(s.flags.blood_night_done);
});

test('dusk on 青石鎮: the moon rises; you stand, and three watches are fought (the book\'s blood is the time left, wolves out of the hills), with a card between — then dawn', () => {
  const s = onTheNight(503);
  assert.equal(placeOf(s), 'qingshi');
  dusk(s);
  assert.match(s.pending.text, /紅的/);
  assert.match(s.pending.text, /紅色的眼睛/);
  pickText(s, '守住青石鎮');
  onward(s);
  assert.equal(nightOf(s).phase, 1);
  let wolves = 0;
  const seen = new Set();
  const count = (x) => {
    for (const b of C.combatOf(x).beasts || []) if (b.def.nightPack && !seen.has(b.uid)) {
      seen.add(b.uid);
      wolves++;
    }
    return stand(x);
  };
  play(s, 3, count);
  assert.equal(C.nightFight(s)?.phase, 1);
  assert.equal(C.nightFight(s)?.name, '一更');
  const book = C.combatOf(s).beasts.find((b) => b.def.night === 1);
  assert.ok(book, 'the book is over the field');
  assert.ok(!C.beastsInWorld(s, 5000).includes(book), 'the sky, not a thing to strike');
  assert.match(C.bossOf(s)?.name || '', /天上的書/, 'its bar is the time left in the watch');
  const hp0 = book.hp;
  play(s, 2, count);
  assert.ok(book.hp < hp0, 'it runs down');
  // the first watch, to its end
  play(s, 120, count, (x) => !!x.pending);
  assert.equal(s.pending?.id, 'night_watch');
  assert.equal(s.pending.title, '一更過去了');
  assert.ok(wolves >= 4, `the hills came down on the town (${wolves})`);
  assert.ok(nightOf(s).held[1]);
  assert.ok(!C.combatOf(s).beasts.some((b) => b.def.nightPack && b.state !== 'dead' && b.state !== 'vanished' && b.state !== 'vanish'), 'what was left went back up into the hills');
  pickText(s, '接著守');
  onward(s);
  assert.equal(nightOf(s).phase, 2);
  assert.equal(watchNow(s), 2, 'the clock is at 亥時: the second watch');
  play(s, 120, count, (x) => !!x.pending);
  assert.equal(s.pending?.title, '二更過去了');
  pickText(s, '接著守');
  onward(s);
  assert.equal(nightOf(s).phase, 3);
  play(s, 120, count, (x) => !!x.pending);
  assert.equal(s.pending?.id, 'night_dawn', 'the third watch over: dawn');
  finish(s);
  assert.ok(nightDone(s));
  assert.deepEqual(nightOf(s).held, { 1: true, 2: true, 3: true });
  assert.equal(s.day, BLOOD_DAY + 1);
  assert.ok(s.tod >= DAWN - 1e-6, 'dawn by the clock');
  assert.equal(C.nightFight(s), null);
  // and the world goes on
  play(s, 2);
  assert.ok(!s.pending || !s.pending.id?.startsWith('night_'));
});

test('the game closed in the middle of a watch: that watch begins again (the card between watches is a place to stand)', () => {
  const s = onTheNight(504);
  dusk(s);
  pickText(s, '守住');
  onward(s);
  play(s, 20, stand);
  assert.equal(C.nightFight(s)?.phase, 1);
  const back = parseSave(serialize(s));
  assert.ok(back);
  assert.equal(nightOf(back).phase, 1);
  assert.equal(C.nightFight(back), null, 'nothing of the fight is saved');
  play(back, 1, stand);
  assert.equal(C.nightFight(back)?.phase, 1, 'the watch begins again');
  const book = C.combatOf(back).beasts.find((b) => b.def.night === 1);
  assert.ok(book.hp > book.maxHp * 0.9, 'its full time again');
  // closed with the card between watches up: it is there again
  play(back, 120, stand, (x) => !!x.pending);
  assert.equal(back.pending?.id, 'night_watch');
  const again = parseSave(serialize(back));
  assert.equal(again.pending?.id, 'night_watch');
  pickText(again, '接著守');
  onward(again);
  play(again, 1, stand);
  assert.equal(C.nightFight(again)?.phase, 2);
});

test('leave the field in the middle of a watch and the night goes on without you; go down in it, and you come to at dawn', () => {
  const s = onTheNight(505);
  dusk(s);
  pickText(s, '守住');
  onward(s);
  play(s, 5, stand);
  assert.ok(C.nightFight(s));
  const F = PLACES.qingshi;
  // away over the fields, far past the edge of the town: a moment out there is not leaving (a chase can carry you
  // over the edge); a few seconds is
  E.placeAt(s, F.at[0] - 1300, F.at[1] + 200);
  play(s, 2, () => null, (x) => !!x.pending);
  assert.ok(!s.pending && C.nightFight(s), 'not yet');
  play(s, 4, () => null, (x) => !!x.pending);
  assert.equal(s.pending?.id, 'night_fled');
  assert.equal(C.nightFight(s), null);
  finish(s);
  assert.ok(nightDone(s));
  assert.ok(nightOf(s).fled);
  assert.ok(!nightOf(s).held[1], 'the first watch was not held');
  assert.ok(s.tod >= DAWN - 1e-6 && s.day === BLOOD_DAY + 1);

  // down in the middle of a watch
  const t = onTheNight(506);
  dusk(t);
  pickText(t, '守住');
  onward(t);
  play(t, 60, (x) => {
    x.player.hp = Math.min(x.player.hp, 1);
    return null;
  }, (x) => !!x.pending);
  assert.equal(t.pending?.id, 'night_fell');
  assert.ok(!t.dead);
  finish(t);
  assert.ok(nightDone(t));
  assert.equal(nightOf(t).fell, 1);
  assert.ok(t.tod >= DAWN && t.day === BLOOD_DAY + 1);
});

test('where you stand at dusk decides the night: elsewhere in 東荒 you may run to 青石鎮; far away you can only watch; come to it late, and you come into the watch the clock is in', () => {
  // the wilds: run to the town (an hour), or hide
  const s = onTheNight(507, 'wilds');
  assert.equal(placeOf(s), 'east');
  dusk(s);
  assert.match(s.pending.text, /青石鎮/);
  pickText(s, '趕去青石鎮');
  onward(s);
  assert.equal(nightOf(s).place, 'qingshi');
  assert.ok(nightOf(s).late);
  assert.equal(nightOf(s).phase, 1);
  play(s, 1, stand);
  assert.equal(C.nightFight(s)?.phase, 1, 'fought at the town');
  assert.ok(Math.hypot(s.world.x - PLACES.qingshi.at[0], s.world.y - PLACES.qingshi.at[1]) < 300);

  // somewhere else (another map): the crack is over 東荒, and all there is to do is watch
  const t = onTheNight(508);
  t.tod = 20;
  openNight(t, 'away');
  startEvent(t, 'night_rise');
  assert.match(t.pending.text, /搆不著/);
  assert.deepEqual(t.pending.choices.filter((c) => !c.disabled).map((c) => c.text), ['看著天，直到天亮。']);
  finish(t);
  assert.ok(nightDone(t));
  assert.ok(t.tod >= DAWN && t.day === BLOOD_DAY + 1);

  // come to it late (an hour before midnight): into the second watch
  const u = onTheNight(509);
  u.tod = 23;
  play(u, 1, () => null, (x) => !!x.pending);
  assert.equal(u.pending?.id, 'night_rise');
  assert.ok(nightOf(u).late);
  pickText(u, '守住');
  onward(u);
  assert.equal(nightOf(u).phase, 2);

  // no seclusion while it is on
  assert.match(A.seclusionBlocker(u) || '', /血月當空/);
});

// ── 朱筆 (V2) ──

/** Stand at dusk and into the first watch; then the world steps until the brush has a ring reddening. */
function intoWatch(seed, lv = 1) {
  const s = onTheNight(seed);
  s.sys.lv = lv;
  dusk(s);
  pickText(s, '守住');
  onward(s);
  play(s, 1, stand);
  assert.ok(C.nightFight(s));
  return s;
}

/** Steps until a ring of the brush is on the ground (keeping you on your feet, not striking). */
function untilRing(s, secs = 20) {
  play(s, secs, (x) => {
    x.player.hp = C.hero(x).cap;
    return null;
  }, (x) => C.strokesOf(x).length > 0);
  const k = C.strokesOf(s)[0];
  assert.ok(k, 'a ring reddens');
  return k;
}

test('the red brush: a ring reddens on a door of the town (never on you), and two seconds on the stroke falls on the page', () => {
  const s = intoWatch(511);
  const k = untilRing(s);
  const mark = MARKS.qingshi.find((m) => m.id === k.mark);
  assert.ok(mark, 'on one of the marks of 青石鎮');
  assert.deepEqual([k.x, k.y], mark.at);
  assert.ok(Math.abs(k.wind - 2) < 1e-9, 'two seconds');
  // keep well away from it
  s.world.x = k.x + 300;
  s.world.y = k.y;
  play(s, 2.5, (x) => {
    x.player.hp = C.hero(x).cap;
    return null;
  }, (x) => !C.strokesOf(x).some((y) => y.id === k.id));
  assert.equal(landedAt(s, 'qingshi', k.mark), 1, 'it came down on the page');
  assert.equal(nightOf(s).ink, 0);
  assert.ok(C.combatOf(s).fx.some((f) => f.kind === 'zhumo'), 'a blot of red where it fell');
  // every mark of every place stands on open ground (you can get into its ring)
  for (const [place, list] of Object.entries(MARKS)) {
    for (const m of list) assert.ok(!collides(s, m.at[0], m.at[1], 12), `${place}.${m.id} on open ground`);
  }
});

test('stand in the ring and the stroke finds no word: it is gone, at a drop of ink — eight, and the book begins to write you; after that, it hurts', () => {
  const s = intoWatch(512);
  const n = nightOf(s);
  const me = C.hero(s);
  let blocks = 0;
  let hurt = 0;
  for (let guard = 0; guard < 400 && blocks < INK_MAX + 1; guard++) {
    // (a watch over: on into the next)
    if (s.pending?.id === 'night_watch') {
      pickText(s, '接著守');
      onward(s);
      play(s, 1, stand);
    }
    play(s, 30, (x) => {
      x.player.hp = C.hero(x).cap;
      return null;
    }, (x) => !!x.pending || C.strokesOf(x).length > 0);
    if (s.pending) continue;
    const k = C.strokesOf(s)[0];
    s.world.x = k.x;
    s.world.y = k.y;
    const ink = n.ink;
    s.player.hp = me.cap;
    const before = s.player.hp;
    play(s, 3, () => {
      s.world.x = k.x;
      s.world.y = k.y;
      return null;
    }, (x) => !C.strokesOf(x).some((y) => y.id === k.id));
    blocks++;
    assert.equal(landedAt(s, 'qingshi', k.mark), 0, `${k.name}: nothing came down`);
    if (ink < INK_MAX) {
      assert.equal(n.ink, ink + 1, 'a drop of ink');
    } else {
      assert.equal(n.ink, INK_MAX);
      hurt = before - s.player.hp;
    }
    // (the rest of this watch, kept clear of the wolves' teeth: only the brush is being tested)
    for (const b of C.combatOf(s).beasts) if (b.def.nightPack) Object.assign(b, { state: 'dead', hp: 0 });
  }
  assert.equal(blocks, INK_MAX + 1, 'nine stood in');
  assert.equal(n.blocked, INK_MAX + 1);
  assert.ok(hurt >= me.cap * 0.15, `the ninth hurt (${hurt} of ${me.cap})`);
  assert.ok(!s.flags.night_ink_full, 'kept only once the night is over');
});

test('斷天 through a ring that has not come down: the stroke is cut in the air — no ink', () => {
  const s = intoWatch(513);
  Object.assign(s.player, { realm: 3, stage: 1 });
  s.player.arts = [...new Set([...(s.player.arts || []), 'duantian'])];
  C.setKit(s, ['duantian']);
  const k = untilRing(s);
  s.world.x = k.x - 200;
  s.world.y = k.y;
  s.player.mp = C.hero(s).maxMp;
  assert.ok(C.castCmd(s, 'duantian', [k.x, k.y]), 'cast');
  play(s, 1.5, (x) => {
    x.player.hp = C.hero(x).cap;
    return null;
  }, (x) => nightOf(x).cut > 0);
  const n = nightOf(s);
  assert.equal(n.cut, 1, 'cut');
  assert.equal(n.ink, 0, 'no ink');
  assert.equal(landedAt(s, 'qingshi', k.mark), 0);
  assert.ok(!C.strokesOf(s).some((y) => y.id === k.id));
});

test('朱筆預警 (系統六級): the ring reddens sooner; and a watch begun again after the game was closed starts from where the night stood when it began', () => {
  const s = intoWatch(514, 6);
  assert.ok(C.nightFight(s).warn);
  const k = untilRing(s);
  assert.ok(Math.abs(k.wind - 2.6) < 1e-9, 'six tenths of a second sooner');
  // let a few come down, then close the game
  s.world.x = PLACES.qingshi.at[0] - 600;
  play(s, 25, (x) => {
    x.player.hp = C.hero(x).cap;
    return null;
  });
  const n = nightOf(s);
  const fell = Object.values(n.landed).reduce((a, b) => a + b, 0);
  assert.ok(fell >= 1, 'some came down');
  const back = parseSave(serialize(s));
  assert.equal(Object.values(nightOf(back).landed).reduce((a, b) => a + b, 0), fell, 'saved as it stood');
  play(back, 1, stand);
  assert.equal(C.nightFight(back)?.phase, 1);
  assert.deepEqual(nightOf(back).landed, {}, 'the watch begun again: what came down in it, undone');
  assert.equal(nightOf(back).ink, 0);
});

// ── 東荒的戰場 (V3) ──

test('the night\'s beasts are the place\'s own, red-eyed and fiercer; never more than eight on the field; killing them teaches, but gives no spoils', () => {
  const s = intoWatch(521);
  const own = new Set(['wolf', 'demon_wolf', 'snake', 'zhumo_kui']);
  const xw = s.player.xw;
  let most = 0;
  const seen = new Set();
  play(s, 70, (x) => {
    const list = C.combatOf(x).beasts.filter((b) => b.def.nightPack && b.hp > 0 && !['dead', 'vanish', 'vanished'].includes(b.state));
    most = Math.max(most, list.length);
    for (const b of list) seen.add(b);
    return stand(x);
  }, (x) => !!x.pending);
  assert.ok(seen.size >= 4, `they came (${seen.size})`);
  for (const b of seen) {
    assert.ok(own.has(b.kind), `${b.kind}: 青石鎮's own`);
    if (b.kind !== 'zhumo_kui') assert.ok(b.enraged, `${b.kind}: red-eyed`);
  }
  assert.ok(most <= 8, `no more than eight at once (${most})`);
  const n = nightOf(s);
  assert.ok(n.kills >= 1, `some went down (${n.kills})`);
  assert.ok(s.player.xw > xw, 'what a fight teaches');
});

test('朱墨傀: a stroke come down on the page may bring one up out of the ink — slow, hard, ink where it walks; gone when the page turns', () => {
  const s = intoWatch(522);
  const F = PLACES.qingshi;
  let kui = null;
  for (let guard = 0; guard < 6 && !kui; guard++) {
    if (s.pending?.id === 'night_watch') {
      pickText(s, '接著守');
      onward(s);
    }
    // out of the way of the brush (it comes down on the page), at the edge of the town
    play(s, 100, (x) => {
      x.player.hp = C.hero(x).cap;
      x.world.x = F.at[0];
      x.world.y = F.at[1] + 420;
      return null;
    }, (x) => !!x.pending || C.combatOf(x).beasts.some((b) => b.kind === 'zhumo_kui' && b.hp > 0));
    kui = C.combatOf(s).beasts.find((b) => b.kind === 'zhumo_kui' && b.hp > 0) || null;
  }
  assert.ok(kui, 'up out of the ink');
  assert.ok(kui.speed < 100, `slow (${kui.speed})`);
  const wolf = C.combatOf(s).beasts.find((b) => b.kind === 'wolf' && b.def.nightPack);
  assert.ok(!wolf || kui.maxHp > wolf.maxHp * 1.5, `hard (${kui.maxHp} against a wolf's ${wolf?.maxHp})`);
  play(s, 6, stand);
  assert.ok(C.combatOf(s).pools.some((p) => p.kind === 'ink'), 'ink where it walked');
  play(s, 120, (x) => {
    x.player.hp = C.hero(x).cap;
    return null;
  }, (x) => !!x.pending);
  assert.ok(['night_watch', 'night_dawn'].includes(s.pending?.id), 'the page turned');
  assert.ok(!C.combatOf(s).beasts.some((b) => b.kind === 'zhumo_kui' && b.hp > 0 && !['vanish', 'vanished', 'dead'].includes(b.state)), 'back into the ink');
});

test('the 名冊 that night: 林塵, 天劍宗\'s and 蕭七\'s people at your side in 青石鎮 (松鶴 at his temple, 胡三娘\'s foxes on her hill) — and a stroke that finds one of them hurts them badly', () => {
  const s = onTheNight(523);
  Object.assign(s.flags, { roster_lin: true, roster_tj: true, roster_xiao: true, roster_fox: true });
  assert.ok(s.npcs.lin_chen?.alive);
  // (ten years on, 松鶴 may be gone; here he keeps his temple still)
  Object.assign(s.npcs.song_he, { alive: true, loc: 'qingxu_temple' });
  assert.deepEqual(helpersAt(s, 'qingshi').map((h) => h.id), ['lin_chen', 'tj1', 'tj2', 'xiao1', 'xiao2']);
  assert.deepEqual(helpersAt(s, 'qingxu').map((h) => h.id), ['song_he']);
  assert.deepEqual(helpersAt(s, 'fox').map((h) => h.id), ['fox1', 'fox2']);
  assert.deepEqual(helpersAt(s, 'luoxia'), []);
  dusk(s);
  pickText(s, '守住');
  onward(s);
  play(s, 1, stand);
  const allies = C.combatOf(s).beasts.filter((b) => b.side === 'ally' && b.def.nightAlly);
  assert.equal(allies.length, 5, 'five at your side');
  assert.ok(allies.some((a) => a.npcId === 'lin_chen'));
  assert.ok(allies.filter((a) => a.name === '天劍宗弟子').length === 2);
  // a ring, and one of them in it when it comes down
  const k = untilRing(s, 40);
  const a = allies.find((x) => x.hp > 0);
  const hp0 = a.hp;
  s.world.x = k.x + 200;
  s.world.y = k.y;
  play(s, 3, (x) => {
    x.player.hp = C.hero(x).cap;
    a.x = k.x;
    a.y = k.y;
    return null;
  }, (x) => !C.strokesOf(x).some((y) => y.id === k.id));
  assert.equal(nightOf(s).inked[a.helper], 1, 'it found them');
  assert.ok(a.hp <= hp0 - a.maxHp * 0.4 || a.state === 'down', `badly hurt (${hp0} → ${a.hp} of ${a.maxHp})`);
  // one who goes down is not in the next watch
  a.hp = 0;
  a.state = 'down';
  play(s, 120, (x) => {
    x.player.hp = C.hero(x).cap;
    x.world.x = PLACES.qingshi.at[0];
    x.world.y = PLACES.qingshi.at[1];
    return null;
  }, (x) => !!x.pending);
  assert.equal(s.pending?.id, 'night_watch');
  const down = nightOf(s).down;
  assert.ok(down[a.helper]);
  pickText(s, '接著守');
  onward(s);
  play(s, 1, stand);
  const second = C.combatOf(s).beasts.filter((b) => b.side === 'ally' && b.def.nightAlly && !['vanish', 'vanished'].includes(b.state));
  assert.equal(second.length, 5 - Object.keys(down).length, 'those still on their feet');
  assert.ok(!second.some((b) => b.helper === a.helper), `${a.name} is not`);
});

test('七月十三: 上官家\'s boat goes over the river with those down for it on the 名冊 — and after that, nobody gets on or off', () => {
  const s = fresh(524);
  s.flags.opening_done = true;
  Object.assign(s.flags, { ty_roster: true, roster_boat: true });
  assert.equal(setPlan(s, 'shen_qingge', 'evacuate'), null);
  assert.equal(setPlan(s, 'qian_banxian', 'evacuate'), null);
  waitUntil(s, BLOOD_DAY - 3);
  resolvePending(s);
  assert.ok(!s.flags.night_boat);
  waitUntil(s, BLOOD_DAY - 2);
  assert.ok(s.flags.night_boat, 'the boat went');
  assert.deepEqual(s.vars.night_evac, ['shen_qingge', 'qian_banxian']);
  const due = takeDue(s, s.player.loc);
  assert.ok(due?.id === 'night_boat' || due?.id === 'night_warn');
  if (due.id !== 'night_boat') {
    s.sched = s.sched.filter((x) => x.ev !== 'night_warn');
  }
  s.sched = s.sched.filter((x) => x.ev === 'night_boat');
  startEvent(s, 'night_boat');
  assert.match(s.pending.text, /沈家/);
  assert.match(s.pending.text, /錢半仙/);
  finish(s);
  assert.equal(planBlocked(s, 'zhao_hu', 'evacuate'), '樓船已經開走了');
  assert.equal(setPlan(s, 'shen_qingge', null), '人已經在船上了');
  assert.equal(s.vars.roster.shen_qingge, 'evacuate');
});

test('a life whose seed is past 2³¹ (as a new game\'s may be) has its brush all the same: the night\'s dice never come up negative', () => {
  const s = intoWatch(3_000_000_123);
  assert.ok(s.seed > 2 ** 31);
  const k = untilRing(s);
  assert.ok(MARKS.qingshi.some((m) => m.id === k.mark));
  play(s, 30, (x) => {
    x.player.hp = C.hero(x).cap;
    return null;
  });
  assert.ok(Object.values(nightOf(s).landed).reduce((a, b) => a + b, 0) >= 1);
});

// ── 白鶴渡、天衍城、殘頁・月、觀星台 (V4) ──

test('白鶴渡: met the old man on the 江心洲, and the old one under the river wakes that night — it swallows strokes as they come over the water; not met, it sleeps', () => {
  for (const met of [true, false]) {
    const s = onTheNight(531, 'crane_ferry');
    if (met) s.flags.isle_fisher_met = true;
    assert.equal(placeOf(s), 'ferry');
    dusk(s);
    pickText(s, '守住白鶴渡');
    onward(s);
    play(s, 120, (x) => {
      x.player.hp = C.hero(x).cap;
      x.world.x = PLACES.ferry.at[0] - 250;
      x.world.y = PLACES.ferry.at[1] - 150;
      return null;
    }, (x) => !!x.pending);
    const n = nightOf(s);
    const fell = landedAt(s, 'ferry');
    if (met) {
      assert.ok(n.eaten >= 1, `swallowed (${n.eaten}), and ${fell} came down`);
      assert.ok(C.combatOf(s).fx.some((f) => f.kind === 'gulp') || n.eaten >= 1);
    } else {
      assert.equal(n.eaten, 0, 'asleep');
      assert.ok(fell >= 1);
    }
  }
});

/** 金丹 in 天衍城 (over the river, the 官道), on the night's day, in the 外城, a little before dusk. */
function onThePeak(seed, more = {}) {
  const s = fresh(seed);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 3, stage: 1, xw: 0, injury: 0, weapon: 'qinggang_sword', hp: 99999 });
  waitUntil(s, BLOOD_DAY - 8);
  resolvePending(s);
  Object.assign(s.flags, { chapter1_done: true, zhongzhou_crossed: true, night_warned: true }, more);
  s.world.cross = 'crane_ferry';
  E.step(s, 0.05, null);
  finish(s);
  s.world.cross = 'guandao_guan';
  finish(s);
  E.step(s, 0.05, null);
  finish(s);
  assert.equal(s.world.map, 'tianyan');
  assert.ok(s.day < BLOOD_DAY);
  waitUntil(s, BLOOD_DAY);
  s.sched = [];
  resolvePending(s);
  E.placeAt(s, 2700, 3240);
  resolvePending(s);
  s.tod = 19.05;
  return s;
}

test('天衍城 that night: up 玉指峰 — the 御階, 欽天監, the 天梯 — and at its top 衛長庚 stops the brush (the sooner there, the sooner it stops); 蘇清瑤 up there is not alone', () => {
  const s = onThePeak(532, { su_archive: true });
  try {
    s.npcs.su_qingyao.alive = true;
    play(s, 1, () => null, (x) => !!x.pending);
    assert.equal(s.pending?.id, 'night_rise');
    assert.equal(nightOf(s).place, 'peak');
    assert.match(s.pending.text, /玉指峰的峰頂/);
    pickText(s, '闖上玉指峰');
    onward(s);
    assert.equal(s.pending?.id, 'night_climb');
    assert.match(s.pending.text, /御階/);
    // fight up it, every fight won
    resolvePending(s, (o) => o[0], 'won');
    const n = nightOf(s);
    assert.ok(s.flags.night_summit, 'at the top');
    assert.ok(n.stoppedAt >= 1 && n.stoppedAt <= 3, `the brush stopped in the watch you came up in (${n.stoppedAt})`);
    assert.ok(s.flags.su_star_kept, '蘇清瑤 was not alone');
    assert.ok(nightDone(s));
    assert.ok(s.sys.frags.includes('frag_moon'), '殘頁・月 found you');
    assert.ok(Math.hypot(s.world.x - 2700, s.world.y - 1280) < 60, 'on the 觀星台');
  } finally {
    useMap('donghuang');
  }
});

test('the climb is fought, and can be lost: thrown down, you may go at it again (an hour gone each time) or watch till dawn', () => {
  const s = onThePeak(533);
  try {
    play(s, 1, () => null, (x) => !!x.pending);
    pickText(s, '闖上玉指峰');
    onward(s);
    let tries = 0;
    resolvePending(s, (o) => {
      if (o[0].text === '再闖一次。') tries++;
      return o[0];
    }, 'lost');
    // (thrown each time, and up again each time — an hour gone each time — until the last watch is out)
    assert.ok(tries >= 3, `went at it again (${tries})`);
    assert.ok(nightDone(s));
    assert.ok(!s.flags.night_summit, 'never got to the top');
    assert.equal(nightOf(s).stoppedAt, null);
    assert.equal(s.day, BLOOD_DAY + 1);
    assert.ok(s.tod >= DAWN - 1e-6, 'dawn');
  } finally {
    useMap('donghuang');
  }
});

test('殘頁・月: at 子時 a page drifts down out of the book (after the second watch) — and one who slept through it finds it on the pillow', () => {
  const s = intoWatch(534);
  play(s, 120, stand, (x) => !!x.pending);
  pickText(s, '接著守');
  onward(s);
  assert.ok(!s.sys.frags.includes('frag_moon'), 'not yet');
  play(s, 1, stand);
  play(s, 120, stand, (x) => !!x.pending);
  assert.equal(s.pending?.title, '二更過去了');
  assert.match(s.pending.text, /子時/);
  pickText(s, '接著守');
  assert.ok(s.sys.frags.includes('frag_moon'));
  assert.match(FRAGMENTS.frag_moon.text, /墨不夠了/);
  // slept through
  const t = fresh(535);
  t.flags.opening_done = true;
  waitUntil(t, BLOOD_DAY + 2);
  play(t, 1);
  assert.equal(t.pending?.id, 'night_dawn');
  assert.match(t.pending.text, /枕邊/);
  finish(t);
  assert.ok(t.sys.frags.includes('frag_moon'));
});

test('the 名冊\'s 觀星台: 葉孤寒 can be asked to stand with 蘇清瑤 up there that night — and then 天劍宗\'s people do not go over the river', () => {
  const s = fresh(536);
  assert.equal(starWatch(s).open, false, 'not a thing to think of before you know what the night is for');
  Object.assign(s.flags, { su_archive: true });
  s.npcs.su_qingyao.alive = true;
  assert.equal(starWatch(s).open, true);
  assert.match(setStarWatch(s, true), /葉孤寒/, 'he has to have said yes first');
  s.flags.roster_tj = true;
  s.npcs.ye_guhan.alive = true;
  assert.equal(setStarWatch(s, true), null);
  assert.ok(s.flags.roster_ye_star);
  assert.ok(!helpersAt(s, 'qingshi').some((h) => h.kind === 'tj_disciple'), '天劍宗 stays this side of the river');
  assert.equal(setStarWatch(s, false), null);
  assert.ok(helpersAt(s, 'qingshi').some((h) => h.kind === 'tj_disciple'));
  // once the night has come, nothing more can be arranged
  openNight(s, 'away');
  assert.ok(setStarWatch(s, true));
});
