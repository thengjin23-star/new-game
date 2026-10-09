import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, rollFate, ORIGINS } from '../src/core/state.js';
import { startEvent, choose, continueEvent } from '../src/core/events.js';
import * as A from '../src/core/actions.js';
import { atBottleneck, realmLabel, REALMS } from '../src/core/cultivation.js';
import { exportCode, importCode, migrate } from '../src/core/save.js';
import { route, canSecludeAt } from '../src/world/map.js';
import { stream } from '../src/core/rng.js';
import { EVENT_LIST } from '../src/content/index.js';
import { ITEMS } from '../src/content/items.js';

function resolvePending(s, pickChoice = (opts) => opts[0]) {
  let guard = 0;
  while (s.pending && !s.dead) {
    if (++guard > 200) throw new Error('pending loop');
    if (s.pending.notice || s.pending.result) continueEvent(s);
    else {
      const opts = s.pending.choices.filter((c) => !c.disabled);
      assert.ok(!opts.some((c) => c.fallback), `content gives no usable choice in ${s.pending.id}.${s.pending.step}`);
      choose(s, pickChoice(opts).i);
    }
  }
}

function fresh(seed = 1, origin = 'farmer') {
  const s = newGame({ name: '測試', gender: '男', origin, fate: rollFate(seed), seed });
  startEvent(s, 'intro_fall');
  resolvePending(s);
  return s;
}

test('opening binds the system and teaches 長春功', () => {
  const s = fresh();
  assert.equal(s.sys.bound, true);
  assert.equal(s.player.tech, 'changchun');
  assert.equal(s.player.loc, 'qingxu_temple');
  assert.equal(s.npcs.song_he.met, true);
});

test('first seclusion leads to 煉氣一層', () => {
  const s = fresh(7, 'orphan');
  assert.equal(A.seclusionBlocker(s), null);
  A.startSeclusion(s, 30, 0);
  const ended = A.tickSeclusion(s, 30 * A.MS_PER_DAY + 5);
  assert.equal(ended, true);
  assert.ok(s.pending?.notice, 'shows 出關 notice');
  resolvePending(s);
  assert.equal(s.day, 30);
  assert.ok(atBottleneck(s), 'mortal stage filled after a guided month');
  A.attemptBreakthrough(s);
  resolvePending(s);
  assert.equal(realmLabel(s.player), '煉氣一層');
});

test('seclusion progresses partially and can end early', () => {
  const s = fresh(3);
  A.startSeclusion(s, 360, 1000);
  assert.equal(A.tickSeclusion(s, 1000 + 50 * A.MS_PER_DAY), false);
  assert.equal(s.secl.done, 50);
  A.endSeclusionEarly(s, 1000 + 60 * A.MS_PER_DAY);
  assert.equal(s.secl, null);
  assert.equal(s.day, 60);
});

test('travel follows known routes only', () => {
  const s = fresh(5);
  assert.equal(route(s, 'qingxu_temple', 'black_forest'), null);
  const r = route(s, 'qingxu_temple', 'luoxia_market');
  assert.ok(r && r.days === 5, 'temple → town → market');
  A.travel(s, 'luoxia_market');
  assert.equal(s.player.loc, 'luoxia_market');
  assert.ok(s.day >= 5);
});

test('export and import round-trip a save', () => {
  const s = fresh(11);
  A.explore(s);
  resolvePending(s);
  const back = importCode(exportCode(s));
  assert.deepEqual(back.player, s.player);
  assert.equal(back.day, s.day);
  assert.throws(() => migrate({}));
});

// Play many random lives and make sure nothing throws and state stays sane.
function playRandom(seed, steps) {
  const origins = Object.keys(ORIGINS);
  const rnd = stream(seed * 97 + 13);
  const s = newGame({ name: '路人', gender: rnd() < 0.5 ? '男' : '女', origin: origins[seed % origins.length], fate: rollFate(seed), seed });
  startEvent(s, 'intro_fall');
  const pick = (opts) => opts[Math.floor(rnd() * opts.length)];
  for (let i = 0; i < steps && !s.dead; i++) {
    if (s.pending) {
      resolvePending(s, pick);
      continue;
    }
    if (s.secl) {
      A.tickSeclusion(s, s.secl.start + s.secl.days * s.secl.msPerDay);
      continue;
    }
    if (atBottleneck(s) && rnd() < 0.7) {
      A.attemptBreakthrough(s, 2);
      continue;
    }
    const r = rnd();
    const here = s.player.loc;
    if (r < 0.34) A.explore(s);
    else if (r < 0.5) {
      const known = Object.keys(s.nodes).filter((k) => s.nodes[k].known && k !== here && route(s, here, k));
      if (known.length) A.travel(s, pick(known));
    } else if (r < 0.58) A.inquire(s);
    else if (r < 0.66) {
      const npcs = Object.values(s.npcs).filter((n) => n.alive && n.met && n.loc === here);
      if (npcs.length) A.visit(s, pick(npcs).id);
    } else if (r < 0.82) {
      if (!canSecludeAt(s, here)) A.startSeclusion(s, pick(A.SECLUSION_OPTIONS).days, 0);
    } else if (r < 0.9) {
      const usable = Object.keys(s.player.items).filter((id) => ITEMS[id]?.use);
      if (usable.length) A.useItem(s, pick(usable));
    } else if (r < 0.94) {
      for (const id of Object.keys(s.player.items)) if (A.canIdentify(s, id)) A.identify(s, id);
      A.deduce(s);
    } else {
      const shop = A.shopHere(s);
      if (shop) {
        if (rnd() < 0.5) A.buy(s, pick(shop.stock));
        else {
          const sellable = Object.keys(s.player.items).filter((id) => A.sellPrice(s, id) > 0);
          if (sellable.length) A.sell(s, pick(sellable));
        }
      }
    }
    const p = s.player;
    assert.ok(p.ls >= 0, 'spirit stones never negative');
    assert.ok(p.injury >= 0 && p.injury <= 3, 'injury in range');
    assert.ok(p.mind >= 0 && p.mind <= 100, 'mind in range');
    assert.ok(p.realm >= 0 && p.realm < REALMS.length, 'realm in range');
    assert.ok(Number.isFinite(p.xw) && p.xw >= 0, 'xw finite');
    for (const [id, n] of Object.entries(p.items)) assert.ok(n > 0 && ITEMS[id], `item ${id} count ${n}`);
  }
  return s;
}

test('random lives never break the engine', () => {
  const seen = new Set();
  const outcomes = [];
  for (let seed = 1; seed <= 24; seed++) {
    const s = playRandom(seed, 2500);
    for (const id of Object.keys(s.seen)) seen.add(id);
    outcomes.push(`${realmLabel(s.player)}${s.dead ? '†' : ''} 第${Math.floor(s.day / 360) + 1}年`);
  }
  const all = EVENT_LIST.filter((e) => e.trigger !== 'intro').map((e) => e.id);
  const missing = all.filter((id) => !seen.has(id));
  console.log(`coverage ${all.length - missing.length}/${all.length}; never fired: ${missing.join(', ') || '—'}`);
  console.log(`lives: ${outcomes.join(' | ')}`);
});
