import { EVENTS, EVENT_LIST } from '../content/index.js';
import { applyEffects } from './effects.js';
import { checkChance, CHECK_NAME } from './checks.js';
import { rand, pickWeighted } from './rng.js';
import { newReport } from './time.js';
import { NODES } from '../world/map.js';
import { MOBS } from '../world/places.js';
import { startBattle, aftermath, endBattle, fightPower } from './battle.js';

/** Resolve a text field: a string with {name}/{npc}/{loc} tokens, or a function. */
export function resolve(x, s, ctx = {}) {
  let t = typeof x === 'function' ? x(s, ctx) : x;
  if (typeof t !== 'string') return t;
  const npc = (ctx.npcId ? s.npcs[ctx.npcId] : null) || ctx.npc || null;
  return t
    .replaceAll('{name}', s.player.name)
    .replaceAll('{npc}', npc ? npc.name : '那人')
    .replaceAll('{npcTitle}', npc ? npc.title : '')
    .replaceAll('{loc}', NODES[s.player.loc]?.name || '');
}

function stepsOf(ev) {
  return ev.steps || { start: { text: ev.text, choices: ev.choices, effects: ev.effects } };
}

/**
 * Can this event happen now? `trigger` may be a list (any of them will do).
 * Where in the world: an event with `poi` happens (for the explore trigger)
 * only at that place — opts.poi; `auto` ones start by themselves when you
 * walk up (opts.auto). Events with `mob` only come with the creature.
 */
export function eligible(s, ev, trigger, node, opts = {}) {
  if (Array.isArray(trigger)) return trigger.some((t) => eligible(s, ev, t, node, opts));
  if (Array.isArray(ev.trigger) ? !ev.trigger.includes(trigger) : ev.trigger !== trigger) return false;
  if (ev.nodes && !ev.nodes.includes(node)) return false;
  if (ev.npc && trigger === 'visit' && ev.npc !== opts.npc) return false;
  if (!ev.npc && trigger === 'visit') return false;
  if (trigger === 'explore') {
    if (ev.poi) {
      const at = Array.isArray(ev.poi) ? ev.poi : [ev.poi];
      if (!at.includes(opts.poi)) return false;
      if (opts.auto && !ev.auto) return false;
    } else if (opts.poi) return false;
  }
  if (ev.mob && !opts.mob) return false;
  const seen = s.seen[ev.id];
  if (ev.once && seen) return false;
  if (seen && ev.cooldown && s.day - seen.last < ev.cooldown) return false;
  if (ev.minExplore && (s.nodes[node]?.explore || 0) < ev.minExplore) return false;
  if (ev.realm && (s.player.realm < ev.realm[0] || s.player.realm > ev.realm[1])) return false;
  if (ev.cond && !ev.cond(s)) return false;
  return true;
}

/** Pick an event for a trigger at a node. Story events (priority > 0) come first. */
export function pickEvent(s, trigger, node, opts = {}) {
  const list = EVENT_LIST.filter((ev) => eligible(s, ev, trigger, node, opts));
  if (!list.length) return null;
  const top = Math.max(...list.map((e) => e.priority || 0));
  const pool = top > 0 ? list.filter((e) => (e.priority || 0) === top) : list;
  const ev = pickWeighted(s, pool, (e) => (typeof e.weight === 'function' ? e.weight(s) : e.weight ?? 10));
  return ev ? ev.id : null;
}

/** Take the first scheduled event that has come due and may fire here. */
export function takeDue(s, node) {
  for (let i = 0; i < s.sched.length; i++) {
    const x = s.sched[i];
    if (x.due > s.day) continue;
    const ev = EVENTS[x.ev];
    if (!ev) {
      s.sched.splice(i--, 1);
      continue;
    }
    if (x.node && x.node !== node) continue;
    if (!x.node && ev.nodes && !ev.nodes.includes(node)) continue;
    if (ev.cond && !ev.cond(s)) continue;
    s.sched.splice(i, 1);
    return { id: x.ev, data: x.data };
  }
  return null;
}

function hintFor(s, c, ctx) {
  if (!s.sys.bound) return null;
  const lv = s.sys.lv;
  let h = null;
  if (c.fight) {
    // a fight: how you measure up against what you face
    const diff = typeof c.check.diff === 'function' ? c.check.diff(s, ctx) : c.check.diff;
    const r = (fightPower(s) * [1, 0.8, 0.6, 0.4][s.player.injury || 0]) / diff;
    const [kind, word] = r >= 1.5 ? ['good', '穩操勝券'] : r >= 1.15 ? ['good', '佔上風'] : r >= 0.87 ? ['mid', '勢均力敵'] : r >= 0.65 ? ['bad', '落下風'] : ['bad', '凶多吉少'];
    h = { kind, label: lv >= 2 ? word : { good: '吉', mid: '平', bad: '凶' }[kind], fight: true };
  } else if (c.check) {
    const p = checkChance(s, c.check, ctx);
    const kind = p >= 0.7 ? 'good' : p >= 0.4 ? 'mid' : 'bad';
    const label = lv >= 2 ? `${CHECK_NAME[c.check.kind]} ${Math.round(p * 100)}%` : p >= 0.7 ? '吉' : p >= 0.4 ? '平' : '凶';
    h = { kind, label };
  } else if (c.tag === 'danger') h = { kind: 'bad', label: '凶' };
  else if (c.tag === 'safe') h = { kind: 'good', label: '吉' };
  if (c.karma && lv >= 3) h = { ...(h || { kind: 'mid', label: '' }), karma: true };
  return h;
}

export function startEvent(s, id, { data = null, pre = null, npcId = null } = {}) {
  const ev = EVENTS[id];
  if (!ev) throw new Error(`Unknown event: ${id}`);
  const prev = s.seen[id];
  s.seen[id] = { n: (prev?.n || 0) + 1, last: s.day };
  s.stats.events += 1;
  const ctx = { data, npcId };
  if (npcId) ctx.npc = s.npcs[npcId];
  s.pending = { id, title: '', step: null, ctx, pre, text: '', choices: [], result: null };
  s.pending.title = resolve(ev.title, s, ctx);
  enterStep(s, 'start');
}

export function enterStep(s, stepId) {
  const pend = s.pending;
  const ev = EVENTS[pend.id];
  const st = stepsOf(ev)[stepId];
  if (!st) throw new Error(`Event ${pend.id} has no step ${stepId}`);
  const ctx = pend.ctx;
  // ctx.npc must point into s.npcs (a reloaded save holds a stale copy)
  if (ctx.npcId) ctx.npc = s.npcs[ctx.npcId];
  const report = newReport();
  if (st.effects) applyEffects(s, st.effects, ctx, report);
  pend.step = stepId;
  pend.text = resolve(st.text, s, ctx);
  pend.enterChips = report.chips;
  pend.toasts = report.toasts;
  const raw = st.choices && st.choices.length ? st.choices : [{ text: '繼續', out: {} }];
  pend.choices = raw
    .map((c, i) => {
      if (c.show && !c.show(s, ctx)) return null;
      const reason = c.need ? c.need(s, ctx) : null;
      return { i, text: resolve(c.text, s, ctx), hint: hintFor(s, c, ctx), disabled: reason || null };
    })
    .filter(Boolean);
  // Safety net: never leave the player with nothing they can press.
  if (!pend.choices.some((c) => !c.disabled)) pend.choices.push({ i: -1, text: '離開。', hint: null, disabled: null, fallback: true });
  pend.result = null;
  if (s.dead) pend.result = { text: '', chips: [], toasts: [], died: true };
}

export function choose(s, i) {
  const pend = s.pending;
  if (!pend || pend.result || pend.notice || s.battle) return;
  if (i === -1) {
    pend.result = { text: '', check: null, chips: [], toasts: [], next: null, goto: null, saved: false, died: false };
    return;
  }
  const ev = EVENTS[pend.id];
  const st = stepsOf(ev)[pend.step];
  const raw = st.choices && st.choices.length ? st.choices : [{ text: '繼續', out: {} }];
  const c = raw[i];
  const ctx = pend.ctx;
  if (ctx.npcId) ctx.npc = s.npcs[ctx.npcId];
  if (!c || (c.show && !c.show(s, ctx)) || (c.need && c.need(s, ctx))) return;
  // a fight is fought, not rolled: the battle decides which way the story goes
  if (c.fight) {
    const diff = typeof c.check.diff === 'function' ? c.check.diff(s, ctx) : c.check.diff;
    startBattle(s, fightSpec(c, ctx), { diff, npc: ctx.npc || null, origin: { event: pend.id, step: pend.step, choice: i }, first: ctx.data?.first || null });
    pend.fight = i;
    return;
  }
  let out = c.out || {};
  let check = null;
  if (c.check) {
    const p = checkChance(s, c.check, ctx);
    const ok = rand(s) < p;
    out = (ok ? c.ok : c.fail) || {};
    check = { ok, p, kind: CHECK_NAME[c.check.kind] };
  }
  settle(s, c, out, check);
}

/** Is this choice (of the open step) a fight? */
export function fightChoice(pend, i) {
  const st = stepsOf(EVENTS[pend.id])[pend.step];
  return !!(st.choices || [])[i]?.fight;
}

/** What a fight choice puts against you: its own foes, or whatever caught you. */
function fightSpec(c, ctx) {
  const spec = typeof c.fight === 'function' ? c.fight(ctx) : c.fight;
  const mob = spec.mob && MOBS.find((m) => m.id === ctx.data?.mob);
  if (!mob) return spec;
  return { ...spec, foes: [[spec.foes[0][0], mob.n]], close: ctx.data?.first !== 'me' };
}

/** The fight is over: its result takes the story on (and brings what it left you). */
export function finishFight(s) {
  const b = s.battle;
  const pend = s.pending;
  if (!b?.over || !pend || pend.fight === undefined || pend.fight === null) return;
  const st = stepsOf(EVENTS[pend.id])[pend.step];
  const c = (st.choices || [])[pend.fight];
  const outcome = b.over;
  const out = (outcome === 'win' ? c.ok : outcome === 'lose' ? c.fail : c.flee || { text: '你且戰且退，總算脫了身。' }) || {};
  const spoils = aftermath(s);
  endBattle(s);
  pend.fight = null;
  settle(s, c, out, { ok: outcome === 'win', kind: '戰鬥', fight: outcome }, spoils);
}

/** Apply a choice's outcome and set the result card. */
function settle(s, c, out, check, more = []) {
  const pend = s.pending;
  const ctx = pend.ctx;
  const report = newReport();
  let effects = typeof out.effects === 'function' ? out.effects(s, ctx) : [...(out.effects || [])];
  effects.push(...more);
  let extra = '';
  const harmful = (e) => Array.isArray(e) && (e[0] === 'hurt' || e[0] === 'death');
  if (check && !check.ok && check.fight !== 'flee' && c.check?.kind === 'power' && s.player.items.foxfire_talisman > 0 && effects.some(harmful)) {
    effects = effects.filter((e) => !harmful(e));
    effects.push(['item', 'foxfire_talisman', -1]);
    extra = '\n\n危急關頭，懷中的狐火符自行燃起。幽藍火光一卷，你已在十丈之外。';
  }
  applyEffects(s, effects, ctx, report);
  pend.result = {
    text: resolve(out.text || '', s, ctx) + extra,
    check,
    chips: report.chips,
    toasts: report.toasts,
    next: out.next || null,
    goto: ctx.goto || out.goto || null,
    saved: !!report.saved,
    died: !!s.dead,
  };
  ctx.goto = null;
  if (report.days) pend.result.chips.unshift({ text: `經過 ${report.days} 天`, tone: 'neutral' });
}

/** Advance past a finished step or notice: next step, chained event, queued event, or close. */
export function continueEvent(s) {
  const pend = s.pending;
  if (!pend) return;
  if (s.dead) {
    s.pending = null;
    return;
  }
  if (!pend.notice && pend.result) {
    const { next, goto } = pend.result;
    if (next) {
      enterStep(s, next);
      return;
    }
    if (goto) {
      s.pending = null;
      startEvent(s, goto, { npcId: pend.ctx.npcId || null, data: pend.ctx.data });
      return;
    }
  }
  s.pending = null;
  if (s.queue.length) {
    const nextId = s.queue.shift();
    if (EVENTS[nextId]) startEvent(s, nextId);
  }
}

/** A plain message box (results of actions such as 突破 or 出關). */
export function notice(s, title, text, { chips = [], toasts = [], pre = null } = {}) {
  s.pending = { notice: true, title, text, chips, toasts, pre };
}
