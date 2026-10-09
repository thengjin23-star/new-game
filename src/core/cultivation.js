import { TECHS } from '../content/techniques.js';
import { ITEMS } from '../content/items.js';
import { nodeQi } from '../world/map.js';
import { DAYS_PER_YEAR } from './calendar.js';

export const REALMS = [
  { id: 'fan', name: '凡人', stages: [''], req: [12], base: 1, lifespan: 70, auto: false },
  {
    id: 'lianqi', name: '煉氣',
    stages: ['一層', '二層', '三層', '四層', '五層', '六層', '七層', '八層', '九層'],
    req: [100, 145, 210, 305, 440, 640, 930, 1350, 1950],
    base: 1, lifespan: 120, auto: true,
  },
  {
    id: 'zhuji', name: '築基', stages: ['初期', '中期', '後期', '圓滿'],
    req: [5000, 8000, 12000, 18000], base: 2.6, lifespan: 220, auto: false, minor: [0.8, 0.7, 0.6],
  },
  {
    id: 'jindan', name: '金丹', stages: ['初期', '中期', '後期', '圓滿'],
    req: [40000, 60000, 90000, 140000], base: 6, lifespan: 520, auto: false, minor: [0.7, 0.6, 0.5],
  },
  // The highest realm in this build: cultivation fills up but there is nowhere further to go yet.
  { id: 'yuanying', name: '元嬰', stages: ['初期'], req: [400000], base: 14, lifespan: 1020, auto: false },
];

export const TOP_REALM = REALMS.length - 1;

export const ROOTS = {
  five: { name: '五靈根', mult: 0.5, major: 0.03 },
  four: { name: '四靈根', mult: 0.75, major: 0.06 },
  three: { name: '三靈根', mult: 1.0, major: 0.12 },
  dual: { name: '雙靈根', mult: 1.5, major: 0.25 },
  single: { name: '單靈根', mult: 2.2, major: 0.45 },
};

export const INJURY = [
  { name: '無傷', mult: 1, days: 0 },
  { name: '輕傷', mult: 0.8, days: 30 },
  { name: '重傷', mult: 0.45, days: 90 },
  { name: '瀕死', mult: 0.1, days: 150 },
];

export const BUFFS = {
  juqi: { name: '聚氣丹', mult: 1.5 },
  guided: { name: '松鶴指點', mult: 2.5 },
  valley_spring: { name: '靈泉洗髓', mult: 1.3 },
  epiphany: { name: '頓悟餘韻', mult: 1.4 },
};

export function realmOf(s) {
  return REALMS[s.player.realm];
}

export function realmLabel(p) {
  const r = REALMS[p.realm];
  return r.id === 'fan' ? '凡人' : r.name + r.stages[p.stage];
}

export function stageReq(s) {
  const p = s.player;
  return REALMS[p.realm].req[p.stage];
}

export function age(s) {
  return s.player.age0 + s.day / DAYS_PER_YEAR;
}

export function lifespan(s) {
  return REALMS[s.player.realm].lifespan + (s.player.lifeBonus || 0);
}

export function yearsLeft(s) {
  return lifespan(s) - age(s);
}

export function techOf(s) {
  return TECHS[s.player.tech] || null;
}

export function rateParts(s, nodeId = s.player.loc) {
  const p = s.player;
  const r = REALMS[p.realm];
  const root = ROOTS[p.root.type].mult;
  const t = techOf(s);
  let tech = t ? t.mult : 0.6;
  if (t?.element && p.root.els.includes(t.element)) tech += t.elemBonus || 0;
  const qi = nodeQi(s, nodeId);
  const mind = 0.7 + (p.mind / 100) * 0.6;
  const injury = INJURY[p.injury].mult;
  let buff = 1;
  for (const [id, left] of Object.entries(p.buffs || {})) if (left > 0 && BUFFS[id]) buff *= BUFFS[id].mult;
  const total = r.base * root * tech * qi * mind * injury * buff;
  return { base: r.base, root, tech, qi, mind, injury, buff, total };
}

export function dailyRate(s, nodeId) {
  return rateParts(s, nodeId).total;
}

/** True when the current stage is full and only a manual breakthrough can continue. */
export function atBottleneck(s) {
  const p = s.player;
  const r = REALMS[p.realm];
  if (p.realm === TOP_REALM) return false;
  if (p.xw < r.req[p.stage]) return false;
  return !r.auto || p.stage === r.stages.length - 1;
}

/** Add 修為, auto-advancing 煉氣 layers and capping at a bottleneck. */
export function addXiuwei(s, amount, report) {
  const p = s.player;
  if (amount <= 0) {
    p.xw = Math.max(0, p.xw + amount);
    return;
  }
  p.xw += amount;
  for (;;) {
    const r = REALMS[p.realm];
    const need = r.req[p.stage];
    if (p.xw < need) break;
    if (r.auto && p.stage < r.stages.length - 1) {
      p.xw -= need;
      p.stage += 1;
      report?.stageUps.push(realmLabel(p));
      continue;
    }
    p.xw = need;
    break;
  }
}

export function weaponPower(s) {
  const p = s.player;
  let bonus = 0;
  if (p.weapon && ITEMS[p.weapon]?.power) bonus += ITEMS[p.weapon].power;
  for (const [id, n] of Object.entries(p.items)) {
    const it = ITEMS[id];
    if (n > 0 && it?.kind === 'treasure' && it.power) bonus += it.power;
  }
  return bonus;
}

export function artPower(s) {
  let best = 0;
  for (const id of s.player.arts || []) best = Math.max(best, TECHS[id]?.power || 0);
  return best;
}

export function basePower(p) {
  switch (p.realm) {
    case 0: return 3 + p.attrs.gengu * 0.4;
    case 1: return 10 + 6 * (p.stage + 1);
    case 2: return 100 + 40 * p.stage;
    case 3: return 320 + 120 * p.stage;
    default: return 1000;
  }
}

/** 戰力 */
export function power(s) {
  const p = s.player;
  const body = 0.8 + p.attrs.gengu * 0.04;
  const gear = 1 + weaponPower(s) + artPower(s);
  const hurt = Math.max(0.3, INJURY[p.injury].mult);
  return Math.round(basePower(p) * body * gear * hurt);
}

/** Describe the next breakthrough: what it is and its odds with the chosen pills. */
export function breakthroughInfo(s, { pills = 0 } = {}) {
  const p = s.player;
  const r = REALMS[p.realm];
  const lastStage = p.stage === r.stages.length - 1;
  const parts = [];
  let chance;
  let kind;
  let next;
  if (p.realm === 0) {
    kind = 'major';
    chance = 1;
    next = '煉氣一層';
    parts.push(['引氣入體', 1]);
  } else if (!lastStage && !r.auto) {
    kind = 'minor';
    chance = r.minor[p.stage];
    next = r.name + r.stages[p.stage + 1];
    parts.push(['基礎', chance]);
  } else {
    kind = 'major';
    const nr = REALMS[p.realm + 1];
    next = nr ? nr.name + nr.stages[0] : '？';
    const rootBase = ROOTS[p.root.type].major * (p.realm === 1 ? 1 : 0.6);
    chance = rootBase;
    parts.push([ROOTS[p.root.type].name, rootBase]);
    if (p.realm === 1) {
      const usable = Math.min(2, pills, (p.items.zhuji_pill || 0) + (p.items.fake_zhuji || 0));
      if (usable > 0) {
        // 假丹 shows up in the plan like a real pill; it adds nothing.
        const real = Math.min(usable, p.items.zhuji_pill || 0);
        parts.push([`築基丹 ×${usable}`, real * 0.25]);
        chance += real * 0.25;
      }
      if (p.items.book_songhe) {
        parts.push(['松鶴手札', 0.1]);
        chance += 0.1;
      }
    }
  }
  if (p.realm > 0) {
    const ins = Math.min(20, p.insight) * 0.01;
    if (ins) {
      parts.push(['感悟', ins]);
      chance += ins;
    }
    const mind = ((p.mind - 50) / 50) * 0.1;
    parts.push(['心境', mind]);
    chance += mind;
    if (nodeQi(s, p.loc) >= 1.4) {
      parts.push(['靈脈之地', 0.05]);
      chance += 0.05;
    }
    if (s.flags.lin_advice && p.realm === 1) {
      parts.push(['林塵指點', 0.05]);
      chance += 0.05;
    }
    if (p.injury > 0) {
      const pen = -0.1 * p.injury;
      parts.push(['傷勢', pen]);
      chance += pen;
    }
  }
  chance = Math.max(0.01, Math.min(0.95, chance));
  if (p.realm === 0) chance = 1;
  return { kind, chance, parts, next, ready: atBottleneck(s) };
}
