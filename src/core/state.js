import { NODES } from '../world/map.js';
import { initNpcs } from '../world/npcs.js';

export const SAVE_VERSION = 1;

export const ORIGINS = {
  farmer: {
    name: '農家子', mods: { gengu: 1 }, items: { chaidao: 1 }, weapon: 'chaidao',
    blurb: '青石鎮外的佃農之子。手上有繭，肩上有擔子。',
  },
  hunter: {
    name: '獵戶之子', mods: { gengu: 1, jiyuan: -1 }, items: { hunting_bow: 1 }, weapon: 'hunting_bow', arts: ['wild_boxing'],
    blurb: '跟著父親在青石山長大，認得每一條獸道。',
  },
  scholar: {
    name: '落第書生', mods: { wuxing: 2, gengu: -1 }, items: {},
    blurb: '讀了十年書，三次落第。字認得多，路走得少。',
  },
  apprentice: {
    name: '藥鋪學徒', mods: { wuxing: 1 }, items: { zhixue_grass: 2 }, ls: 0,
    blurb: '在回春堂當了五年學徒，認得百來種草藥。',
  },
  orphan: {
    name: '街頭孤兒', mods: { xinxing: 1, jiyuan: 1, gengu: -1 }, items: {},
    blurb: '沒有家，也就沒有什麼好失去的。',
  },
};

export const ATTRS = {
  gengu: '根骨',
  wuxing: '悟性',
  xinxing: '心性',
  jiyuan: '機緣',
};

export function attrWord(v) {
  if (v <= 2) return '下下';
  if (v <= 4) return '下';
  if (v <= 6) return '中';
  if (v <= 8) return '上';
  return '上上';
}

/** Roll attributes and 靈根 with an independent seed (before the save exists). */
export function rollFate(seed) {
  let x = seed | 0;
  const r = () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), x | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const d = (n) => Math.floor(r() * n);
  const attrs = {
    gengu: 2 + d(4) + d(4),
    wuxing: 2 + d(4) + d(4),
    xinxing: 2 + d(4) + d(4),
    jiyuan: 2 + d(4) + d(4),
  };
  const roll = r();
  const type = roll < 0.35 ? 'five' : roll < 0.75 ? 'four' : roll < 0.95 ? 'three' : 'dual';
  const count = { five: 5, four: 4, three: 3, dual: 2 }[type];
  const all = ['金', '木', '水', '火', '土'];
  const els = [];
  while (els.length < count) {
    const e = all[d(5)];
    if (!els.includes(e)) els.push(e);
  }
  els.sort((a, b) => all.indexOf(a) - all.indexOf(b));
  return { attrs, root: { type, els } };
}

export function newGame({ name, gender, origin, fate, seed, meta }) {
  const o = ORIGINS[origin];
  const attrs = { ...fate.attrs };
  for (const [k, v] of Object.entries(o.mods)) attrs[k] = Math.max(1, Math.min(10, attrs[k] + v));
  const nodes = {};
  for (const [id, n] of Object.entries(NODES)) {
    nodes[id] = { known: !!n.start, visited: false, explore: 0 };
  }
  const s = {
    v: SAVE_VERSION,
    seed,
    rng: (seed ^ 0x9e3779b9) | 0,
    day: 0,
    player: {
      name,
      gender,
      origin,
      age0: 16,
      attrs,
      root: fate.root,
      realm: 0,
      stage: 0,
      xw: 0,
      mind: 55,
      injury: 0,
      injuryDays: 0,
      insight: 0,
      tech: null,
      techs: [],
      arts: [...(o.arts || [])],
      ls: o.ls || 0,
      items: { ...o.items },
      weapon: o.weapon || null,
      loc: 'qingshi_hill',
      lifeBonus: 0,
      buffs: {},
    },
    sys: {
      lv: 1,
      exp: meta?.sysExp || 0,
      subs: 1,
      subsMax: 1,
      rechargeAt: null,
      lastDeduce: -9999,
      frags: [...(meta?.frags || [])],
      known: {},
      bound: false,
    },
    flags: {},
    vars: { npcSeq: 1 },
    nodes,
    seen: {},
    sched: [],
    queue: [],
    npcs: {},
    rumors: [],
    log: [],
    arcIdx: 0,
    secl: null,
    pending: null,
    dead: null,
    stats: { explores: 0, events: 0, travels: 0, seclDays: 0, breakthroughs: 0 },
    meta: { life: (meta?.life || 0) + 1, past: [...(meta?.past || [])] },
  };
  initNpcs(s);
  return s;
}
