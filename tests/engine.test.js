import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, rollFate, ORIGINS } from '../src/core/state.js';
import { startEvent } from '../src/core/events.js';
import * as A from '../src/core/actions.js';
import * as E from '../src/world/explore.js';
import { atBottleneck, realmLabel, REALMS } from '../src/core/cultivation.js';
import { exportCode, importCode, migrate } from '../src/core/save.js';
import { canSecludeAt, NODES } from '../src/world/map.js';
import { POIS, MOBS, NPC_SPOTS } from '../src/world/places.js';
import { world, nearestOpen } from '../src/world/terrain.js';
import { stream } from '../src/core/rng.js';
import { EVENT_LIST } from '../src/content/index.js';
import { ITEMS } from '../src/content/items.js';
import { resolvePending, fresh } from './helpers.js';

test('opening binds the system, teaches 長春功, and leaves you at the temple', () => {
  const s = fresh();
  assert.equal(s.sys.bound, true);
  assert.equal(s.player.tech, 'changchun');
  assert.equal(s.player.loc, 'qingxu_temple');
  assert.equal(s.npcs.song_he.met, true);
  assert.deepEqual([s.world.x, s.world.y], NODES.qingxu_temple.at);
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

test('export and import round-trip a save', () => {
  const s = fresh(11);
  E.search(s);
  resolvePending(s);
  const back = importCode(exportCode(s));
  assert.deepEqual(back.player, s.player);
  assert.equal(back.day, s.day);
  assert.equal(back.world.x, s.world.x);
  assert.throws(() => migrate({}));
});

// Play many random lives in the world and make sure nothing throws and state stays sane.
function playRandom(seed, steps) {
  const origins = Object.keys(ORIGINS);
  const rnd = stream(seed * 97 + 13);
  const s = newGame({ name: '路人', gender: rnd() < 0.5 ? '男' : '女', origin: origins[seed % origins.length], fate: rollFate(seed), seed });
  startEvent(s, 'intro_fall');
  const pick = (opts) => opts[Math.floor(rnd() * opts.length)];
  resolvePending(s, pick);
  E.ensureWorld(s);
  const spots = [
    ...POIS.map((p) => [p.x, p.y + 30, p.id]),
    ...POIS.filter((p) => p.action === 'inquire').map((p) => [p.x, p.y + 30, p.id]),
    ...MOBS.map((m) => [m.x + 140, m.y + 100]),
    ...Object.entries(NPC_SPOTS).flatMap(([id, spots]) => Object.values(spots).map(([x, y]) => [x, y + 24, id])),
    ...Object.values(NODES).filter((n) => n.at).map((n) => n.at),
    ...world().herbs.filter((_, k) => k % 4 === 0).map((h) => [h.x + 20, h.y]),
  ];
  for (let i = 0; i < steps && !s.dead; i++) {
    if (s.pending) {
      resolvePending(s, pick);
      if (rnd() < 0.5) E.resume(s);
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
    if (r < 0.22) {
      const [x, y, poi] = pick(spots);
      const spot = nearestOpen(s, x, y, 4);
      if (spot) E.placeAt(s, spot[0], spot[1]);
      // and often walk straight up to whatever is there
      const t = poi && !s.pending && rnd() < 0.6 && E.targetsNear(s, 120).find((x) => x.id === poi);
      if (t) E.interact(s, t);
    } else if (r < 0.36) {
      const a = rnd() * Math.PI * 2;
      for (let k = 0; k < 40 && !s.pending; k++) E.step(s, 0.1, { x: Math.cos(a), y: Math.sin(a) });
      for (let k = 0; k < 20 && !s.pending; k++) E.step(s, 0.1, null);
    } else if (r < 0.52) {
      const t = E.nearestTarget(s) || E.targetsNear(s, 150)[0];
      if (t) {
        if (t.d > t.reach) {
          E.walkTo(s, t.x, t.y, t);
          for (let k = 0; k < 200 && E.pathOf(s) && !s.pending; k++) E.step(s, 0.1, null);
        } else E.interact(s, t);
      }
      for (const sig of E.takeSignals(s)) {
        if (sig.open === 'shop') {
          const shop = A.shopHere(s);
          if (shop && rnd() < 0.5) A.buy(s, pick(shop.stock));
        }
      }
    } else if (r < 0.58) E.search(s);
    else if (r < 0.62) E.rest(s, pick(['dusk', 'night', 'dawn', 2]));
    else if (r < 0.76) {
      if (!canSecludeAt(s, s.player.loc)) A.startSeclusion(s, pick(A.SECLUSION_OPTIONS).days, 0);
    } else if (r < 0.84) {
      const usable = Object.keys(s.player.items).filter((id) => ITEMS[id]?.use);
      if (usable.length) A.useItem(s, pick(usable));
    } else if (r < 0.88) {
      for (const id of Object.keys(s.player.items)) if (A.canIdentify(s, id)) A.identify(s, id);
      A.deduce(s);
    } else if (r < 0.92) {
      const shop = A.shopHere(s);
      const sellable = Object.keys(s.player.items).filter((id) => A.sellPrice(s, id) > 0);
      if (shop && sellable.length) A.sell(s, pick(sellable));
    } else {
      // teleport-free long walk across the map
      const [x, y] = pick(spots);
      if (E.walkTo(s, x, y)) for (let k = 0; k < 600 && E.pathOf(s) && !s.pending; k++) E.step(s, 0.1, null);
    }
    E.takeFeed(s);
    const p = s.player;
    assert.ok(p.ls >= 0, 'spirit stones never negative');
    assert.ok(p.injury >= 0 && p.injury <= 3, 'injury in range');
    assert.ok(p.mind >= 0 && p.mind <= 100, 'mind in range');
    assert.ok(p.realm >= 0 && p.realm < REALMS.length, 'realm in range');
    assert.ok(Number.isFinite(p.xw) && p.xw >= 0, 'xw finite');
    assert.ok(s.tod >= 0 && s.tod < 24, 'hour of day in range');
    assert.ok(Number.isFinite(s.world.x) && Number.isFinite(s.world.y), 'position finite');
    assert.ok(NODES[s.player.loc], `standing in a known region (${s.player.loc})`);
    for (const [id, n] of Object.entries(p.items)) assert.ok(n > 0 && ITEMS[id], `item ${id} count ${n}`);
  }
  return s;
}

test('random lives in the open world never break the engine', () => {
  const seen = new Set();
  const outcomes = [];
  for (let seed = 1; seed <= 16; seed++) {
    const s = playRandom(seed, 1400);
    for (const id of Object.keys(s.seen)) seen.add(id);
    outcomes.push(`${realmLabel(s.player)}${s.dead ? '†' : ''} 第${Math.floor(s.day / 360) + 1}年`);
  }
  const all = EVENT_LIST.filter((e) => e.trigger !== 'intro').map((e) => e.id);
  const missing = all.filter((id) => !seen.has(id));
  console.log(`coverage ${all.length - missing.length}/${all.length}; never fired: ${missing.join(', ') || '—'}`);
  console.log(`lives: ${outcomes.join(' | ')}`);
});
