import assert from 'node:assert/strict';
import { newGame, rollFate } from '../src/core/state.js';
import { startEvent, choose, continueEvent, endRealFight } from '../src/core/events.js';
import { advance, newReport } from '../src/core/time.js';
import { ensureWorld, placeAt } from '../src/world/explore.js';
import { nearestOpen, collides, regionIdAt } from '../src/world/terrain.js';
import { beastsInWorld } from '../src/world/combat.js';
import { POI_BY_ID } from '../src/world/places.js';
import { NODES } from '../src/world/map.js';

/**
 * Play out whatever is on screen, picking choices with pickChoice. A fight
 * (fought out in the world: tests/storyfights.test.js) goes the way `fight` says.
 */
export function resolvePending(s, pickChoice = (opts) => opts[0], fight = 'won') {
  let guard = 0;
  while ((s.pending || s.rtFight) && !s.dead) {
    if (++guard > 200) throw new Error('pending loop');
    if (s.rtFight) endRealFight(s, fight);
    else if (s.pending.notice || s.pending.result) continueEvent(s);
    else {
      const opts = s.pending.choices.filter((c) => !c.disabled);
      assert.ok(!opts.some((c) => c.fallback), `content gives no usable choice in ${s.pending.id}.${s.pending.step}`);
      choose(s, pickChoice(opts).i);
    }
  }
}

/**
 * A new life, through the opening, standing in the temple courtyard. The
 * sky is held clear (weather is tested on its own: tests/sky.test.js).
 */
export function fresh(seed = 1, origin = 'farmer') {
  const s = newGame({ name: '測試', gender: '男', origin, fate: rollFate(seed), seed });
  s.vars.sky = 'clear';
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
  while ((s.pending || s.rtFight) && guard++ < 50) {
    if (s.rtFight) endRealFight(s, 'won');
    else if (s.pending.result || s.pending.notice) continueEvent(s);
    else choose(s, s.pending.choices.find((c) => !c.disabled).i);
  }
}

/** Open ground in the wilds south-west of 青石鎮. */
export const MEADOW = [1426, 3782];

/**
 * Stand on open ground with members of a group of beasts (def: a BEASTS
 * entry) set about you at (dx, dy) each, still for now but meaning to fight.
 */
export function among(s, def, spots, tod = 15) {
  let at = null;
  for (let r = 0; r < 500 && !at; r += 30) {
    for (let a = 0; a < 6.28 && !at; a += 0.5) {
      const x = MEADOW[0] + Math.cos(a) * r;
      const y = MEADOW[1] + Math.sin(a) * r;
      const home = regionIdAt(x, y);
      let ok = !collides(s, x, y, 16);
      for (let q = 0; q < 6.28 && ok; q += 0.4) {
        for (let d = 10; d <= 240 && ok; d += 10) {
          const px = x + Math.cos(q) * d;
          const py = y + Math.sin(q) * d;
          if (collides(s, px, py, 12) || regionIdAt(px, py) !== home) ok = false;
        }
      }
      if (ok) at = [x, y];
    }
  }
  assert.ok(at, 'open ground');
  placeAt(s, at[0], at[1]);
  resolvePending(s);
  s.tod = tod;
  const w = s.world;
  const list = beastsInWorld(s, 99999).filter((b) => b.def.id === def.id);
  spots.forEach(([dx, dy], i) => Object.assign(list[i], { x: w.x + dx, y: w.y + dy, state: 'recover', st: 0, rec: 99, aggro: true }));
  return list.slice(0, spots.length);
}
