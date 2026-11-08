// 修煉體系 (0.26): the whole ladder to 化神 (the ceiling of this age), the grade of a 金丹, the 劫 at the
// gates of 元嬰 (心魔劫) and 化神 (雷劫), 元嬰出竅, 入定, and the 靈氣 the high realms want.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as C from '../src/world/combat.js';
import * as A from '../src/core/actions.js';
import * as SV from '../src/core/save.js';
import { REALMS, TOP_REALM, BEYOND, CORE, atBottleneck, atCeiling, breakthroughInfo, basePower, rateParts, coreGrade, qiNeed } from '../src/core/cultivation.js';
import { pools } from '../src/core/body.js';
import { die } from '../src/core/effects.js';
import { rise, openJie, jieOver } from '../src/core/jie.js';
import { newReport } from '../src/core/time.js';
import { NODES } from '../src/world/map.js';
import { weatherAt } from '../src/world/weather.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;

function at(s, realm, stage, extra = {}) {
  Object.assign(s.player, { realm, stage, xw: 0, injury: 0 }, extra);
  return s;
}
const full = (s) => {
  s.player.xw = REALMS[s.player.realm].req[s.player.stage];
  return s;
};

test('the ladder: 元嬰 in four stages (its first as it always was), 化神 the top, and what lies past it', () => {
  const ying = REALMS[4];
  assert.equal(ying.name, '元嬰');
  assert.equal(ying.stages.length, 4);
  assert.equal(ying.req[0], 400000, 'a save already at 元嬰初期 stands where it stood');
  assert.equal(REALMS[5].name, '化神');
  assert.equal(TOP_REALM, 5);
  assert.deepEqual(BEYOND.map((r) => r.name), ['煉虛', '合體', '大乘', '渡劫']);
  for (const r of REALMS.slice(2)) assert.equal(r.minor.length, r.stages.length - 1, `${r.name}: odds for each small gate`);
  for (let k = 1; k < REALMS.length; k++) assert.ok(REALMS[k].lifespan > REALMS[k - 1].lifespan, 'each realm lives longer');
});

test('nothing you already had is less: 靈力 and 戰力 for every realm and stage are what they were, or more', () => {
  // (as they were in 0.25)
  const oldMp = (p) => (p.realm === 0 ? 0 : p.realm === 1 ? 18 + 4 * p.stage : p.realm === 2 ? 90 + 15 * p.stage : 260);
  const oldPower = (p) => [3 + p.attrs.gengu * 0.4, 10 + 6 * (p.stage + 1), 100 + 40 * p.stage, 320 + 120 * p.stage][p.realm] ?? 1000;
  const s = fresh(31);
  for (let realm = 0; realm < REALMS.length; realm++) {
    for (let stage = 0; stage < REALMS[realm].stages.length; stage++) {
      at(s, realm, stage);
      s.player.hp = undefined;
      s.player.mp = undefined;
      const V = pools(s);
      if (realm <= 4) assert.ok(V.maxMp >= oldMp(s.player), `${realm}/${stage}: 靈力`);
      if (realm <= 4) assert.ok(basePower(s.player) >= oldPower(s.player), `${realm}/${stage}: 戰力`);
    }
  }
  at(s, 3, 3);
  assert.ok(pools(s).maxMp > 260, '金丹 grows by stage now');
  at(s, 5, 0);
  assert.ok(basePower(s.player) > 1900, '化神 well above 元嬰');
});

test('the gates: 元嬰初期 full is a gate now, 化神 has its small gates, and 化神圓滿 is the ceiling', () => {
  const s = fresh(32);
  full(at(s, 4, 0));
  assert.ok(atBottleneck(s), '元嬰初期 → 中期');
  assert.equal(breakthroughInfo(s).next, '元嬰中期');
  full(at(s, 4, 3));
  const info = breakthroughInfo(s);
  assert.equal(info.next, '化神初期');
  assert.equal(info.jie, 'leijie', 'past the odds, the 雷劫');
  full(at(s, 3, 3));
  assert.equal(breakthroughInfo(s).jie, 'xinmo', 'at the gate of 元嬰, the 心魔劫');
  full(at(s, 2, 3));
  assert.equal(breakthroughInfo(s).jie, null, '結丹 is the odds alone');
  full(at(s, 5, 1));
  assert.ok(atBottleneck(s));
  assert.ok(!atCeiling(s));
  full(at(s, 5, 3));
  assert.ok(!atBottleneck(s), 'no gate to try');
  assert.ok(atCeiling(s), 'the top of this age');
});

test('悟道: at the gate of 化神, what you understand counts up to 40', () => {
  const s = fresh(33);
  full(at(s, 4, 3, { insight: 40, mind: 50 }));
  const part = breakthroughInfo(s).parts.find(([label]) => label === '悟道');
  assert.ok(part && Math.abs(part[1] - 0.4) < 1e-9);
  full(at(s, 3, 3, { insight: 40, mind: 50 }));
  assert.ok(Math.abs(breakthroughInfo(s).parts.find(([label]) => label === '感悟')[1] - 0.2) < 1e-9, 'elsewhere it stops at 20');
});

test('金丹的成色: settled as the core forms; it sets how fast 金丹 goes and how the gate of 元嬰 stands', () => {
  const s = fresh(34);
  s.player.mind = 50;
  assert.equal(coreGrade(s, { chance: 0.05, pills: 0 }, 0), 0, 'a bare chance and no luck: 下品');
  assert.equal(coreGrade(s, { chance: 0.95, pills: 2 }, 1), 3, 'all for it, and luck: 極品');
  at(s, 2, 3);
  rise(s, newReport(), { chance: 0.6, pills: 1 });
  assert.equal(s.player.realm, 3);
  assert.ok(s.player.core >= 0 && s.player.core <= 3);
  s.player.core = 0;
  const low = rateParts(s).total;
  s.player.core = 3;
  const high = rateParts(s).total;
  assert.ok(Math.abs(high / low - CORE[3].rate / CORE[0].rate) < 1e-9);
  full(at(s, 3, 3, { core: 3, insight: 0, mind: 50 }));
  assert.ok(breakthroughInfo(s).parts.some(([label, v]) => label.startsWith('金丹成色') && v === CORE[3].ying));
});

test('a save from before grades: its 金丹 is 中品; one at 元嬰 stands where it stood', () => {
  const s = fresh(35);
  full(at(s, 3, 1));
  delete s.player.core;
  const back = SV.migrate(SV.parseSave(SV.serialize(s)));
  assert.equal(back.player.core, 1);
  full(at(s, 4, 0));
  const ying = SV.migrate(SV.parseSave(SV.serialize(s)));
  assert.equal(ying.player.realm, 4);
  assert.equal(ying.player.stage, 0);
  assert.equal(ying.player.xw, 400000);
  assert.ok(atBottleneck(ying), 'and now has a way on');
});

test('元嬰中期 on wants thick 靈氣: where it is thin, slower again (never below a third); nothing below is touched', () => {
  const s = fresh(36);
  s.player.loc = 'qingxu_temple';
  const qi = NODES.qingxu_temple.qi;
  at(s, 4, 0);
  assert.equal(qiNeed(s.player), 0);
  assert.equal(rateParts(s).thin, 1);
  at(s, 4, 1);
  assert.ok(Math.abs(rateParts(s).thin - Math.max(0.35, qi / 1.6)) < 1e-9);
  at(s, 5, 0);
  assert.ok(Math.abs(rateParts(s).thin - Math.max(0.35, qi / 2.2)) < 1e-9);
  for (const r of [0, 1, 2, 3]) {
    at(s, r, 0);
    assert.equal(rateParts(s).thin, 1, `${REALMS[r].name}: untouched`);
  }
});

test('入定: a day of seclusion is shorter in real time from 元嬰 on', () => {
  const s = fresh(37);
  for (const [r, ms] of [[1, 3000], [3, 3000], [4, 1000], [5, 250]]) {
    at(s, r, 0);
    assert.equal(A.dayMs(s), ms);
  }
  at(s, 4, 0);
  A.startSeclusion(s, 30, 0);
  assert.equal(s.secl.msPerDay, 1000);
});

test('at the gate of 元嬰, the odds coming up only open the 心魔劫; failing the odds is a failing as before', () => {
  let opened = 0;
  let failed = 0;
  for (let seed = 40; seed < 120 && (!opened || !failed); seed++) {
    const s = fresh(seed);
    full(at(s, 3, 3, { core: 3, insight: 20, mind: 100 }));
    A.attemptBreakthrough(s, 0);
    if (s.jie) {
      opened++;
      assert.equal(s.jie.kind, 'xinmo');
      assert.equal(s.player.realm, 3, 'not yet 元嬰');
      assert.ok(s.pending?.notice && s.pending.title === '碎丹成嬰');
      assert.equal(s.pending.ok, '轉過身去。');
    } else {
      failed++;
      assert.equal(s.player.realm, 3);
      assert.ok(s.pending?.title === '突破失敗');
    }
  }
  assert.ok(opened && failed);
});

test('how a 劫 ends: won, you come into the realm; lost, it costs 修為, 心境, wounds and years', () => {
  const s = fresh(41);
  full(at(s, 3, 3, { mind: 60 }));
  openJie(s, 'xinmo');
  s.pending = null;
  jieOver(s, 'won', newReport());
  assert.equal(s.player.realm, 4);
  assert.equal(s.jie, null);
  assert.ok(s.pending.text.includes('你結嬰了'));

  const t = fresh(42);
  full(at(t, 3, 3, { mind: 60 }));
  const xw = t.player.xw;
  openJie(t, 'xinmo');
  t.pending = null;
  jieOver(t, 'lost', newReport());
  assert.equal(t.player.realm, 3);
  assert.equal(t.player.xw, xw - Math.round(xw * 0.3));
  assert.equal(t.player.mind, 45);
  assert.equal(t.player.injury, 1);
  assert.equal(t.player.lifeBonus, -10);

  const u = fresh(43);
  full(at(u, 4, 3, { mind: 60 }));
  openJie(u, 'leijie');
  u.pending = null;
  jieOver(u, 'lost', newReport());
  assert.equal(u.player.realm, 4);
  assert.equal(u.player.injury, 2, '雷劫: badly hurt');
  assert.equal(u.player.lifeBonus, -30);

  // (a 劫 is settled only at the gate it was fought for)
  const v = fresh(48);
  full(at(v, 3, 3));
  jieOver(v, 'won', newReport(), 'leijie');
  assert.equal(v.player.realm, 3, 'a 雷劫 does not make a 金丹 into anything');
});

test('元嬰出竅: from 元嬰 on, the body can die and you need not — once in a long while', () => {
  const s = fresh(44);
  at(s, 4, 1, { xw: 300000 });
  s.sys.subs = 0;
  const report = newReport();
  assert.equal(die(s, '試劍', report), false);
  assert.ok(!s.dead);
  assert.equal(s.player.injury, 3, 'near death');
  assert.equal(s.player.xw, 210000);
  assert.ok(s.player.lifeBonus < 0);
  assert.ok(s.player.buffs.reborn > 0, 'a body not yet up to much');
  assert.ok(report.chips.some((c) => c.text.includes('元嬰出竅')));
  assert.equal(die(s, '再一次', newReport()), true, 'not again so soon');
  const t = fresh(45);
  at(t, 3, 3);
  t.sys.subs = 0;
  assert.equal(die(t, '試劍', newReport()), true, 'a 金丹 has no 元嬰 to get away');
});

/** Run the world: brain(s) steers. */
function play(s, secs, brain = () => null, done = () => false) {
  for (let k = 0; k < secs / DT; k++) {
    E.step(s, DT, brain(s));
    if (done(s)) return true;
  }
  return false;
}

/** Somewhere with open ground about it (the temple courtyard). */
function openSpot(s) {
  s.tod = 12;
  E.placeAt(s, ...NODES.qingxu_temple.at);
  resolvePending(s);
}

test('心魔劫: a phantom of you comes for you where you stand; how it ends settles the gate', () => {
  const s = fresh(46);
  openSpot(s);
  full(at(s, 3, 3, { weapon: 'qinggang_sword' }));
  openJie(s, 'xinmo');
  resolvePending(s);
  play(s, 1);
  const demon = C.beastsInWorld(s, 2000).find((b) => b.kind === 'xinmo');
  assert.ok(demon, 'it is there');
  assert.ok(demon.phantom);
  assert.ok(demon.weaponSet, 'holding what you hold');
  assert.equal(demon.def.title, '心魔劫');
  assert.ok(C.inCombat(s));
  // a player who stands and strikes
  play(s, 240, (x) => {
    if (C.inCombat(x)) C.attackCmd(x);
    return null;
  }, (x) => !x.jie);
  assert.equal(s.jie, null, 'over');
  assert.ok(s.pending?.notice);
  assert.ok(['突破成功', '心魔劫失敗'].includes(s.pending.title));
  assert.equal(s.player.realm, s.pending.title === '突破成功' ? 4 : 3);
});

test('雷劫: the cloud is the sky — unseen, untouched; it strikes all over where you are, and thins away', () => {
  const s = fresh(47);
  openSpot(s);
  full(at(s, 4, 3, { weapon: 'qinggang_sword' }));
  openJie(s, 'leijie');
  resolvePending(s);
  play(s, 1);
  const cloud = C.combatOf(s).beasts.find((b) => b.kind === 'jieyun');
  assert.ok(cloud);
  assert.ok(!C.beastsInWorld(s, 5000).includes(cloud), 'not drawn, not pointed at');
  assert.equal(C.bossOf(s)?.name, '劫雲', 'its bar is what is left of it');
  const hp0 = cloud.hp;
  // a player who sees where it will fall and steps out of it
  let struck = 0;
  const brain = (x) => {
    const b = C.combatOf(x).beasts.find((y) => y.kind === 'jieyun');
    if (!b || b.state !== 'windup' || !b.zones) return null;
    const w = x.world;
    for (const [zx, zy] of b.zones) {
      const d = Math.hypot(w.x - zx, w.y - zy);
      if (d < 50 + 30) {
        struck++;
        return { x: (w.x - zx) / (d || 1), y: (w.y - zy) / (d || 1) };
      }
    }
    return null;
  };
  play(s, 1.5, brain);
  assert.ok(cloud.hp < hp0, 'it thins');
  play(s, 90, brain, (x) => !x.jie);
  assert.equal(s.jie, null, 'over within its time');
  assert.ok(['突破成功', '雷劫失敗'].includes(s.pending?.title));
  assert.ok(struck > 0, 'it fell all about you');
});

test('while a 雷劫 is under way, the sky is storm (dark, rain, thunder)', () => {
  const s = fresh(49);
  delete s.vars.sky;
  s.day = 200;
  s.jie = { kind: 'leijie', day: s.day };
  const before = weatherAt(s);
  s.jie.on = true;
  assert.equal(weatherAt(s), 'storm');
  s.jie = null;
  assert.equal(weatherAt(s), before, 'and as it was, after');
});
