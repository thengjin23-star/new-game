import assert from 'node:assert/strict';
import { newGame, rollFate } from '../src/core/state.js';
import { startEvent, choose, continueEvent, finishFight } from '../src/core/events.js';
import { act as fightAct, options as fightOptions } from '../src/core/battle.js';
import { advance, newReport } from '../src/core/time.js';
import { ensureWorld, placeAt } from '../src/world/explore.js';
import { nearestOpen } from '../src/world/terrain.js';
import { POI_BY_ID } from '../src/world/places.js';
import { NODES } from '../src/world/map.js';

/** Play out whatever is on screen, picking choices with pickChoice. */
export function resolvePending(s, pickChoice = (opts) => opts[0]) {
  let guard = 0;
  while (s.pending && !s.dead) {
    if (++guard > 200) throw new Error('pending loop');
    if (s.battle) fightOut(s);
    else if (s.pending.notice || s.pending.result) continueEvent(s);
    else {
      const opts = s.pending.choices.filter((c) => !c.disabled);
      assert.ok(!opts.some((c) => c.fallback), `content gives no usable choice in ${s.pending.id}.${s.pending.step}`);
      choose(s, pickChoice(opts).i);
    }
  }
}

/** Fight a battle through to the end, plainly: strike the nearest foe; heal when low. */
export function fightOut(s, policy = null) {
  for (let k = 0; k < 400 && s.battle && !s.battle.over; k++) {
    const o = fightOptions(s);
    if (!o) break;
    const me = s.battle.units.find((u) => u.id === 'me');
    const pill = o.items.find((x) => x.id === 'heal_pill');
    fightAct(s, (policy && policy(s, o)) || (pill && me.hp < me.maxHp * 0.3 ? { kind: 'item', id: 'heal_pill' } : { kind: 'attack' }));
  }
  finishFight(s);
}

/** A new life, through the opening, standing in the temple courtyard. */
export function fresh(seed = 1, origin = 'farmer') {
  const s = newGame({ name: '測試', gender: '男', origin, fate: rollFate(seed), seed });
  startEvent(s, 'intro_fall');
  resolvePending(s);
  ensureWorld(s);
  return s;
}

/** Jump the calendar forward like a long seclusion would. */
export function waitUntil(s, day) {
  if (day > s.day) advance(s, day - s.day, 'seclusion', newReport());
}

/** Stand next to a place (as if you had walked there). */
export function goToPoi(s, id, dy = 30) {
  const p = POI_BY_ID[id];
  const spot = nearestOpen(s, p.x, p.y + dy) || [p.x, p.y];
  placeAt(s, spot[0], spot[1]);
}

/** Arrive in a region at its usual spot. */
export function goTo(s, region) {
  placeAt(s, ...NODES[region].at);
}

export function pickText(s, text) {
  const c = s.pending.choices.find((x) => x.text.includes(text));
  assert.ok(c, `choice "${text}" in ${s.pending.id}.${s.pending.step}: ${s.pending.choices.map((x) => x.text).join(' / ')}`);
  choose(s, c.i);
}

/** Finish the open event with the first usable choices. */
export function finish(s) {
  let guard = 0;
  while (s.pending && guard++ < 50) {
    if (s.pending.result || s.pending.notice) continueEvent(s);
    else choose(s, s.pending.choices.find((c) => !c.disabled).i);
  }
}
