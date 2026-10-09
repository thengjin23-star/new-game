import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_LIST, EVENTS } from '../src/content/index.js';
import { ITEMS } from '../src/content/items.js';
import { TECHS } from '../src/content/techniques.js';
import { NODES } from '../src/world/map.js';
import { NAMED } from '../src/world/npcs.js';

const TRIGGERS = new Set(['intro', 'explore', 'arrive', 'travel', 'inquire', 'visit', 'scheduled', 'fallback']);

function stepsOf(ev) {
  return ev.steps || { start: { text: ev.text, choices: ev.choices, effects: ev.effects } };
}

function* walkEffects(list) {
  if (!Array.isArray(list)) return;
  for (const e of list) {
    if (!Array.isArray(e)) continue;
    yield e;
    if (e[0] === 'maybe') yield* walkEffects(e[2]);
    if (e[0] === 'pick') for (const [, sub] of e[1]) yield* walkEffects(sub);
  }
}

function* allOutcomes(ev) {
  for (const [stepId, st] of Object.entries(stepsOf(ev))) {
    yield { stepId, effects: st.effects };
    for (const c of st.choices || []) {
      for (const k of ['out', 'ok', 'fail']) if (c[k]) yield { stepId, ...c[k] };
    }
  }
}

test('event ids are unique', () => {
  assert.equal(EVENT_LIST.length, Object.keys(EVENTS).length);
});

test('every event is well formed', () => {
  for (const ev of EVENT_LIST) {
    const triggers = Array.isArray(ev.trigger) ? ev.trigger : [ev.trigger];
    for (const t of triggers) assert.ok(TRIGGERS.has(t), `${ev.id}: bad trigger ${t}`);
    for (const n of ev.nodes || []) assert.ok(NODES[n], `${ev.id}: unknown node ${n}`);
    if (ev.npc) assert.ok(NAMED[ev.npc], `${ev.id}: unknown npc ${ev.npc}`);
    const steps = stepsOf(ev);
    assert.ok(steps.start, `${ev.id}: no start step`);
    for (const [sid, st] of Object.entries(steps)) {
      assert.ok(st.text !== undefined, `${ev.id}.${sid}: no text`);
      for (const c of st.choices || []) {
        assert.ok(c.text, `${ev.id}.${sid}: choice without text`);
        if (c.check) assert.ok(c.ok && c.fail, `${ev.id}.${sid}: check needs ok and fail`);
        else assert.ok(c.out, `${ev.id}.${sid}: choice "${c.text}" needs out`);
      }
    }
  }
});

test('every reference in content points at something real', () => {
  for (const ev of EVENT_LIST) {
    const steps = stepsOf(ev);
    for (const o of allOutcomes(ev)) {
      if (o.next) assert.ok(steps[o.next], `${ev.id}: next → missing step ${o.next}`);
      if (o.goto) assert.ok(EVENTS[o.goto], `${ev.id}: goto → missing event ${o.goto}`);
      for (const e of walkEffects(o.effects)) {
        const [op, a] = e;
        const where = `${ev.id}.${o.stepId}: ${op}`;
        if (op === 'item' || op === 'sellall') assert.ok(ITEMS[a], `${where} unknown item ${a}`);
        if (op === 'tech') assert.ok(TECHS[a], `${where} unknown tech ${a}`);
        if (op === 'discover' || op === 'move') assert.ok(NODES[a], `${where} unknown node ${a}`);
        if (['favor', 'meet', 'npc'].includes(op) && a !== 'npc') assert.ok(NAMED[a], `${where} unknown npc ${a}`);
        if (op === 'sched' || op === 'goto' || op === 'queue') assert.ok(EVENTS[a], `${where} unknown event ${a}`);
        if (op === 'sched') assert.equal(EVENTS[a].trigger, 'scheduled', `${where} ${a} should be trigger 'scheduled'`);
      }
    }
  }
});

test('items reference real techniques and effects', () => {
  for (const [id, it] of Object.entries(ITEMS)) {
    for (const e of walkEffects(it.use?.effects)) {
      if (e[0] === 'tech') assert.ok(TECHS[e[1]], `${id}: unknown tech ${e[1]}`);
      if (e[0] === 'item') assert.ok(ITEMS[e[1]], `${id}: unknown item ${e[1]}`);
    }
    for (const r of it.identify || []) for (const e of walkEffects(r.effects)) if (e[0] === 'item') assert.ok(ITEMS[e[1]], `${id}: identify → ${e[1]}`);
    if (it.disguise) assert.ok(ITEMS[it.disguise], `${id}: disguise → ${it.disguise}`);
  }
});
