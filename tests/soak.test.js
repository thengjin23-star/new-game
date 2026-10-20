// 長玩 (0.18): random play over a few lives — walking every way, travelling to
// places you know, poking at whatever is near, seclusion, practice fights with
// casts, dashes and blows thrown about, the 推演, the 技能 page (0.19: moves put
// in places and taken out, sets chosen, 心法 held and put down), and saving
// and loading again — and not one exception, whatever comes up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import * as CB from '../src/world/combat.js';
import * as SV from '../src/core/save.js';
import * as A from '../src/core/actions.js';
import * as SK from '../src/world/skills.js';
import { NODES, mapOf } from '../src/world/map.js';
import { fresh, resolvePending, waitUntil, goToPoi, pickText } from './helpers.js';

const ORIGINS = ['farmer', 'hunter', 'scholar', 'apprentice', 'orphan'];

function soak(seed, steps, cultivated, south = false) {
  let r = seed * 7919;
  const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let s = fresh(seed, ORIGINS[seed % ORIGINS.length]);
  if (south) {
    // (0.21) over the pass: the whole of it played on 南嶺
    Object.assign(s.player, { realm: 1, stage: 6 });
    goToPoi(s, 'south_pass_gate', -40);
    resolvePending(s);
    E.interact(s, { kind: 'poi', id: 'south_pass_gate' });
    pickText(s, '翻過去');
    resolvePending(s);
    E.step(s, 0.05, null);
    resolvePending(s);
    assert.equal(s.world.map, 'nanling');
  }
  if (cultivated) {
    // a 築基 cultivator with a sword, a few arts and things to burn: every kind of move gets thrown
    Object.assign(s.player, { realm: 2, stage: 1, weapon: 'qinggang_sword' });
    s.player.items.qinggang_sword = 1;
    s.player.items.fire_talisman = 5;
    s.player.items.huichun_pill = 3;
    s.player.techs = ['qingmu', 'xuanshui', 'fox_fire', 'jianzhen'];
    s.player.arts = [...new Set([...(s.player.arts || []), 'jianzhen'])];
  }
  const tally = { casts: 0, fights: 0, saves: 0, travels: 0, skills: 0 };
  let what = '';
  let k = 0;
  try {
    for (k = 0; k < steps && !s.dead; k++) {
      if (s.pending || s.rtFight) {
        what = `the event ${s.pending?.id || 'fight'}`;
        resolvePending(s, (opts) => opts[Math.floor(rnd() * opts.length)], rnd() < 0.8 ? 'won' : 'lost');
        continue;
      }
      const roll = rnd();
      if (roll < 0.4) {
        what = 'walking';
        const a = rnd() * Math.PI * 2;
        for (let f = 0; f < 45 && !s.pending && !s.dead; f++) E.step(s, 1 / 30, { x: Math.cos(a), y: Math.sin(a) });
      } else if (roll < 0.52) {
        what = 'travelling';
        const known = Object.keys(NODES).filter((id) => s.nodes[id]?.known && NODES[id].at && mapOf(id) === s.world.map);
        E.walkTo(s, ...NODES[known[Math.floor(rnd() * known.length)]].at);
        for (let f = 0; f < 300 && !s.pending && !s.dead; f++) E.step(s, 1 / 30, null);
        tally.travels++;
      } else if (roll < 0.64) {
        what = 'looking at what is near';
        const t = E.nearestTarget(s);
        if (t) E.interact(s, t);
        for (let f = 0; f < 5 && !s.pending; f++) E.step(s, 1 / 30, null);
      } else if (roll < 0.72) {
        what = 'seclusion';
        waitUntil(s, s.day + 5 + Math.floor(rnd() * 90));
      } else if (roll < 0.88) {
        what = 'a practice fight';
        if (!CB.startTrial(s)) continue;
        tally.fights++;
        // (the phantom comes at you first: the fight is on a moment after it is called up)
        for (let f = 0; f < 300 && (CB.combatOf(s).trial || CB.inCombat(s)) && !s.dead && !s.pending; f++) {
          const q = rnd();
          const kit = CB.kitOf(s).filter((m) => !m.locked);
          if (q < 0.05 && kit.length) {
            if (CB.castCmd(s, kit[Math.floor(rnd() * kit.length)].id)) tally.casts++;
          } else if (q < 0.07) CB.dashCmd(s, [rnd() - 0.5, rnd() - 0.5]);
          else if (q < 0.09) CB.strikeAt(s, null);
          else if (q < 0.095) CB.talismanCmd(s);
          else if (q < 0.1) CB.pillCmd(s);
          else if (q < 0.105) CB.useSetCmd(s);
          E.step(s, 1 / 30, rnd() < 0.3 ? { x: rnd() - 0.5, y: rnd() - 0.5 } : null);
        }
      } else if (roll < 0.91) {
        what = 'the 技能 page';
        const lib = SK.libraryOf(s);
        const sets = SK.setsOpen(s);
        const q = rnd();
        if (q < 0.45) SK.assignSlot(s, Math.floor(rnd() * sets), Math.floor(rnd() * SK.SLOTS), rnd() < 0.2 ? null : lib.moves[Math.floor(rnd() * lib.moves.length)].id);
        else if (q < 0.6) SK.autoSet(s, Math.floor(rnd() * sets));
        else if (q < 0.8) SK.useSet(s, Math.floor(rnd() * sets));
        else SK.holdPassive(s, lib.passives[Math.floor(rnd() * lib.passives.length)].id, rnd() < 0.7);
        tally.skills++;
      } else if (roll < 0.94) {
        what = 'the 推演';
        if (A.deduceReady(s)) A.deduce(s);
      } else {
        what = 'saving and loading';
        s = SV.migrate(SV.parseSave(SV.serialize(s)));
        E.ensureWorld(s);
        tally.saves++;
      }
    }
  } catch (e) {
    return { error: `seed ${seed}, step ${k} (${what}), day ${s.day}: ${e.stack}`, tally };
  }
  return { error: null, tally, s };
}

test('長玩：隨機走動、趕路、互動、閉關、戰鬥、推演與存讀檔，不出任何例外', () => {
  let casts = 0;
  for (const [seed, cultivated] of [[21, false], [22, true], [23, true]]) {
    const run = soak(seed, 110, cultivated);
    assert.equal(run.error, null, run.error || '');
    casts += run.tally.casts;
  }
  assert.ok(casts > 0, 'the cultivated ones did cast');
});

test('長玩・南嶺：翻過山隘之後的隨機遊玩（瘴氣、毒蛛、蠱蟲、存讀檔），不出任何例外', () => {
  for (const seed of [24, 25]) {
    const run = soak(seed, 110, true, true);
    assert.equal(run.error, null, run.error || '');
    assert.equal(mapOf(run.s.player.loc), run.s.world.map, 'where you are is on the map you are on');
  }
});
