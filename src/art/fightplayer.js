// Playing a fight back. The battle decides each exchange at once; this lets
// it be seen a blow at a time: who steps in, when the blow lands, the
// numbers rising off the one who took it, the fallen fading. What it shows
// trails what is decided, and catches up beat by beat.

const DUR = { attack: 0.8, skill: 0.9, item: 0.85, move: 0.45, guard: 0.5, status: 0.6, end: 0.75 };
const IMPACT = { attack: 0.45, skill: 0.52, item: 0.5, move: 1, guard: 0.3, status: 0.25, end: 1 };
/** When in its beat a dash covers its ground (attack) — a plain move takes the whole beat. */
const DASH = 0.32;

export function createFightPlayer() {
  const v = {
    queue: [],
    beat: null,
    bt: 0,
    dur: 0,
    landed: false,
    shown: new Map(), // id → { hp, t, alive, deadT, flashT, hitT, from }
    pops: [], // { id, text, kind, t0 }
    over: null,
    text: '',
    t: 0,
    marks: null, // id → what ails or guards them, as of the last beat shown
  };

  const pop = (id, text, kind) => v.pops.push({ id, text, kind, t0: v.t });

  /** Show everyone as the fight stands, then undo the beats not yet seen. */
  function rewind(b, beats) {
    for (const u of b.units) {
      const old = v.shown.get(u.id);
      v.shown.set(u.id, { hp: u.hp, t: u.t, alive: u.alive, deadT: old?.deadT ?? (u.alive ? null : -9), flashT: -9, hitT: -9, from: null });
    }
    for (let i = beats.length - 1; i >= 0; i--) {
      const bt = beats[i];
      for (const h of bt.hits || []) {
        const sh = v.shown.get(h.id);
        if (!sh) continue;
        if (h.hpBefore !== undefined) sh.hp = h.hpBefore;
        if (h.dead) {
          sh.alive = true;
          sh.deadT = null;
        }
        if (h.drain) {
          const a = v.shown.get(bt.who);
          if (a) a.hp = h.drainFrom;
        }
      }
      if (bt.from !== undefined && v.shown.get(bt.who)) v.shown.get(bt.who).t = bt.from;
    }
  }

  /** New beats from the battle (b: the battle as it now stands). */
  v.feed = (b, beats) => {
    if (!v.marks) v.marks = beats.length ? {} : Object.fromEntries(b.units.map((u) => [u.id, { ...u.st }]));
    if (!v.shown.size) rewind(b, beats);
    if (!beats.length) return;
    if (!v.beat && !v.queue.length) rewind(b, beats);
    v.queue.push(...beats);
  };

  function land(beat) {
    if (beat.marks) v.marks = beat.marks;
    for (const h of beat.hits || []) {
      const sh = v.shown.get(h.id);
      if (!sh) continue;
      sh.hp = h.hpAfter;
      if (h.miss) pop(h.id, '閃', 'miss');
      else if (h.heal) pop(h.id, `+${h.heal}`, 'heal');
      else if (h.dmg !== undefined) {
        pop(h.id, `${h.dmg}`, h.crit ? 'crit' : h.dot || 'dmg');
        sh.flashT = v.t;
        sh.hitT = v.t;
        sh.from = beat.who;
      }
      if (h.absorbed) pop(h.id, `擋 ${h.absorbed}`, 'block');
      if (h.mp) pop(h.id, `靈力 +${h.mp}`, 'mp');
      if (h.status === 'stun') pop(h.id, '暈', 'status');
      if (h.status === 'poison' || h.status === 'bleed') pop(h.id, h.status === 'bleed' ? '流血' : '中毒', 'poison');
      if (h.status === 'burn') pop(h.id, '灼燒', 'burn');
      if (h.dead) {
        sh.alive = false;
        sh.deadT = v.t;
      }
      if (h.drain) {
        const a = v.shown.get(beat.who);
        if (a) a.hp = h.drainFrom + h.drain;
        pop(beat.who, `+${h.drain}`, 'drain');
      }
    }
  }

  /** Move the picture on by dt seconds. */
  v.update = (dt) => {
    v.t += dt;
    v.pops = v.pops.filter((p) => v.t - p.t0 < 1.2);
    if (!v.beat && v.queue.length) {
      v.beat = v.queue.shift();
      v.bt = 0;
      v.dur = DUR[v.beat.kind] || 0.6;
      v.landed = false;
      if (v.beat.text) v.text = v.beat.text;
    }
    if (!v.beat) return;
    v.bt += dt;
    const p = v.bt / v.dur;
    if (!v.landed && p >= (IMPACT[v.beat.kind] ?? 0.5)) {
      land(v.beat);
      v.landed = true;
    }
    if (p >= 1) {
      const sh = v.shown.get(v.beat.who);
      if (sh && v.beat.to !== undefined) sh.t = v.beat.to;
      if (v.beat.kind === 'end') v.over = v.beat.over;
      v.beat = null;
    }
  };

  /** Nothing left to show. */
  v.idle = () => !v.beat && !v.queue.length;

  /** What ails or guards someone as shown: as of the last beat, or (caught up) as it stands. */
  v.marksOf = (u) => (v.idle() ? u.st : v.marks?.[u.id]) || {};

  /** How far into the current beat (0…1), or -1. */
  v.progress = () => (v.beat ? Math.min(1, v.bt / v.dur) : -1);

  /** Where along the line someone stands right now (between steps as they move). */
  v.tOf = (id) => {
    const sh = v.shown.get(id);
    if (!sh) return 0;
    const b = v.beat;
    if (b && b.who === id && b.from !== undefined && b.to !== undefined && b.from !== b.to) {
      const p = v.bt / v.dur;
      const span = b.kind === 'move' || b.kind === 'end' ? 1 : DASH;
      const q = Math.min(1, p / span);
      const e = q * q * (3 - 2 * q);
      return b.from + (b.to - b.from) * e;
    }
    return sh.t;
  };

  return v;
}

/** When, in its beat, a blow is thrown (for lunges and things in flight): [start, impact]. */
export function swingOf(beat) {
  const impact = IMPACT[beat.kind] ?? 0.5;
  return [Math.max(0, impact - 0.22), impact];
}
