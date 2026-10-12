import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_LIST, EVENTS } from '../src/content/index.js';
import { ITEMS } from '../src/content/items.js';
import { TECHS } from '../src/content/techniques.js';
import { NODES } from '../src/world/map.js';
import { NAMED } from '../src/world/npcs.js';
import { POI_BY_ID, BEASTS } from '../src/world/places.js';
import { FOES } from '../src/content/foes.js';
import { BEAST_MOVES } from '../src/content/moves.js';

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

test('events placed in the world point at real places and creatures', () => {
  for (const ev of EVENT_LIST) {
    for (const id of [].concat(ev.poi || [])) {
      const p = POI_BY_ID[id];
      assert.ok(p, `${ev.id}: unknown place ${id}`);
      if (ev.nodes) assert.ok(ev.nodes.includes(p.region), `${ev.id}: place ${id} is in ${p.region}, not ${ev.nodes}`);
      if (ev.auto) assert.ok(p.auto, `${ev.id}: starts by itself, but ${id} has no auto radius`);
      const triggers = Array.isArray(ev.trigger) ? ev.trigger : [ev.trigger];
      assert.ok(triggers.includes('explore'), `${ev.id}: a place-bound event needs the explore trigger`);
    }
    if (ev.mob) assert.ok(BEASTS.some((m) => m.event === ev.id), `${ev.id}: no creature brings it`);
  }
  for (const m of BEASTS) if (m.event) assert.ok(EVENTS[m.event]?.mob, `${m.id}: its event ${m.event} should be marked mob`);
});

test('what roams the wild fights in real time; those that come to talk have a fight (and a run) in their story', () => {
  for (const def of BEASTS) {
    for (const kind of [def.kind, def.lead].filter(Boolean)) {
      const R = FOES[kind]?.rt;
      assert.ok(R, `${def.id}: ${kind} has no real-time stats`);
      for (const k of ['speed', 'sight', 'lose', 'body', 'tall']) assert.ok(R[k] > 0, `${kind}: rt.${k}`);
      assert.ok(R.moves?.length, `${kind}: nothing to do`);
      for (const m of R.moves) assert.ok(BEAST_MOVES[m], `${kind}: unknown move ${m}`);
      if (R.keep) assert.ok(R.keep[0] < R.keep[1], `${kind}: keep is [near, far]`);
      if (R.tokens) assert.ok(R.ring > 0, `${kind}: waits its turn, but where?`);
    }
    const ev = def.event && EVENTS[def.event];
    if (def.event) assert.ok(ev, `${def.id}: unknown event ${def.event}`);
    const choices = ev ? stepsOf(ev).start.choices || [] : [];
    if (FOES[def.kind].rt.talk) assert.ok(choices.some((c) => c.fight), `${def.id}: comes to talk, but its story has no fight`);
    for (const c of choices) if (c.run) assert.ok(choices.some((x) => x.fight) && c.ok && c.fail, `${def.id}: a run needs a fight beside it, and both ways out`);
  }
  for (const [id, M] of Object.entries(BEAST_MOVES)) {
    assert.ok(['fan', 'leap', 'shot', 'ring', 'zone', 'call', 'blink'].includes(M.shape), `${id}: shape`);
    assert.ok(M.windup > 0 && M.recover > 0 && M.cd > 0, `${id}: seen coming, open after, not again at once`);
    if (M.shape !== 'call' && M.shape !== 'blink') assert.ok(M.mult > 0, `${id}: it hurts`);
    if (M.shape === 'fan') assert.ok(M.reach > 0 && M.arc > 0, `${id}: reach and arc`);
    else if (M.shape === 'leap' || M.shape === 'shot') assert.ok(M.max > M.min && M.speed > 0 && M.width > 0, `${id}: a line, from min to max`);
    if (M.shape === 'shot') assert.ok(M.range >= M.max, `${id}: it reaches as far as it is thrown from`);
    if (M.shape === 'ring') assert.ok(M.radius > 0, `${id}: how far round`);
    if (M.shape === 'zone') assert.ok(M.max > M.min && M.radius > 0 && (!(M.count > 1) || M.spread > 0), `${id}: where, how wide`);
    if (M.shape === 'call') assert.ok(FOES[M.call.kind]?.rt && M.call.n > 0 && M.call.max >= M.call.n, `${id}: whom it calls`);
    if (M.shape === 'blink') assert.ok(M.near > 0, `${id}: when`);
    if (M.combo) assert.ok(M.combo > 1 && M.again > 0, `${id}: a run of them`);
    for (const P of [M.pool, M.trail].filter(Boolean)) assert.ok(P.secs > 0 && P.dps > 0, `${id}: the ground it leaves`);
  }
  // a boss's marks come one after another, and what it does after each is something it can do
  for (const [kind, K] of Object.entries(FOES)) {
    let last = 1;
    for (const ph of K.rt?.phases || []) {
      assert.ok(ph.at > 0 && ph.at < last, `${kind}: phases in order`);
      last = ph.at;
      for (const m of ph.moves || []) assert.ok(BEAST_MOVES[m], `${kind}: unknown move ${m}`);
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
