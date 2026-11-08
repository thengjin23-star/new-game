import { TECHS } from '../content/techniques.js';
import { ITEMS } from '../content/items.js';
import { nodeQi } from '../world/map.js';
import { DAYS_PER_YEAR } from './calendar.js';
import { skySigns } from '../world/weather.js';
import { refineMult } from './refine.js';

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
  // (0.26) 元嬰 in four (初期 asks what it always asked: a save already there stands where it stood)
  {
    id: 'yuanying', name: '元嬰', stages: ['初期', '中期', '後期', '圓滿'],
    req: [400000, 600000, 900000, 1400000], base: 14, lifespan: 1020, auto: false, minor: [0.65, 0.55, 0.45],
  },
  // 化神: the ceiling of this age. 玄微 was the last to go past it; in the three thousand years since,
  // no one has (the 命簿 only copies what it wrote before, and there are no pages past this one).
  {
    id: 'huashen', name: '化神', stages: ['初期', '中期', '後期', '圓滿'],
    req: [4000000, 5500000, 7000000, 9500000], base: 30, lifespan: 2500, auto: false, minor: [0.6, 0.5, 0.4],
  },
];

export const TOP_REALM = REALMS.length - 1;

/**
 * Past 化神: the realms outside the 命簿 (煉虛, 合體, 大乘, 渡劫). No one of this age has seen them; each
 * will be a thing that happens in the story, not a bar to fill. Shown, for now, as what lies beyond.
 */
export const BEYOND = [
  { name: '煉虛', hint: '天上的縫' },
  { name: '合體', hint: '天門' },
  { name: '大乘', hint: '天河' },
  { name: '渡劫', hint: '渡' },
];

/**
 * (0.26) 金丹的成色: how well the core was made, judged as it forms. It sets how fast 金丹 goes (rate)
 * and how the gate of 元嬰 stands (ying: added to the odds there). A save that formed its core before
 * there were grades holds a 中品 one.
 */
export const CORE = [
  { name: '下品', rate: 0.9, ying: -0.05 },
  { name: '中品', rate: 1.0, ying: 0 },
  { name: '上品', rate: 1.1, ying: 0.05 },
  { name: '極品', rate: 1.25, ying: 0.1 },
];

/** Your core's grade (from 金丹 on), else null. */
export function coreOf(p) {
  return p.realm >= 3 ? CORE[p.core ?? 1] || CORE[1] : null;
}

/** The grade a core forms with: the odds you came to it with, the 凝金丹 you took, where, how steady you were, and luck. */
export function coreGrade(s, { chance = 0.3, pills = 0 } = {}, roll = Math.random()) {
  const p = s.player;
  let q = Math.min(0.95, chance) * 0.6 + roll * 0.4 + pills * 0.05;
  if (nodeQi(s, p.loc) >= 2) q += 0.05;
  if (p.mind >= 80) q += 0.05;
  return q < 0.35 ? 0 : q < 0.6 ? 1 : q < 0.82 ? 2 : 3;
}

/**
 * (0.26) 元嬰 from its middle stage on, and 化神, want thick 靈氣: where it is thinner than that,
 * cultivation goes slower again (never below a third). Nothing below 元嬰中期 is touched.
 */
export function qiNeed(p) {
  if (p.realm === 4 && p.stage >= 1) return 1.6;
  if (p.realm >= 5) return 2.2;
  return 0;
}

/** At the top of this age: 化神圓滿, full. There is no gate to try. */
export function atCeiling(s) {
  const p = s.player;
  const r = REALMS[p.realm];
  return p.realm === TOP_REALM && p.stage === r.stages.length - 1 && p.xw >= r.req[p.stage];
}

/** The 劫 that waits past the odds at the gate of the next realm, if one does: 心魔劫 at 元嬰, 雷劫 at 化神. */
export function jieAt(p) {
  const r = REALMS[p.realm];
  if (p.stage !== r.stages.length - 1 || r.auto) return null;
  return p.realm === 3 ? 'xinmo' : p.realm === 4 ? 'leijie' : null;
}

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
  // 避瘴丹 (南嶺): the miasma does not touch you while it lasts (it does nothing for cultivation)
  bizhang: { name: '避瘴', mult: 1 },
  // 冰心丹 (西漠): the noon sun does not touch you while it lasts
  bingxin: { name: '冰心', mult: 1 },
  // 暖身丹 (北原): the cold does not touch you while it lasts
  nuanshen: { name: '暖身', mult: 1 },
  // (0.26) 元嬰出竅: the body you are growing back is not yet a vessel for much
  reborn: { name: '肉身重塑', mult: 0.6 },
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

/**
 * (0.23) 地利: each land beyond 東荒 is of one of the 五行 — 南嶺's green 木, 西漠's sun 火, 北原's ice
 * 水. Cultivating there with a 功法 of the same element goes faster; with a 靈根 of it, a little.
 */
export const LAND_EL = { nanling: '木', ximo: '火', beiyuan: '水' };
export function landBonus(s) {
  const el = LAND_EL[s.world?.map];
  if (!el) return 1;
  const t = techOf(s);
  if (t?.element === el) return 1.15;
  return (s.player.root?.els || []).includes(el) ? 1.05 : 1;
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
  // the sky: a 靈潮 (half as fast again), the full moon's light (a little)
  const signs = skySigns(s);
  const sky = (signs.includes('tide') ? 1.5 : 1) * (signs.includes('fullmoon') || signs.includes('bloodmoon') ? 1.15 : 1);
  const land = landBonus(s);
  // (0.26) 金丹: as good as the core you made; 元嬰中期 on: where the 靈氣 is too thin for you, slower again
  const core = p.realm === 3 ? coreOf(p).rate : 1;
  const need = qiNeed(p);
  const thin = need ? Math.max(0.35, Math.min(1, qi / need)) : 1;
  const total = r.base * root * tech * qi * mind * injury * buff * sky * land * core * thin;
  return { base: r.base, root, tech, qi, mind, injury, buff, sky, land, core, thin, need, total };
}

export function dailyRate(s, nodeId) {
  return rateParts(s, nodeId).total;
}

/** True when the current stage is full and only a manual breakthrough can continue. */
export function atBottleneck(s) {
  const p = s.player;
  const r = REALMS[p.realm];
  if (p.xw < r.req[p.stage]) return false;
  // (化神圓滿: the top of this age — full, and no gate to try)
  if (p.realm === TOP_REALM && p.stage === r.stages.length - 1) return false;
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
  if (p.weapon && ITEMS[p.weapon]?.power) bonus += ITEMS[p.weapon].power * refineMult(s, p.weapon);
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
    // (0.26) 元嬰 grows by stage from where it always stood (1000); 化神 well above it
    case 4: return 1000 + 300 * p.stage;
    case 5: return 2800 + 800 * p.stage;
    default: return 1000;
  }
}

/** 戰力 before injuries (a wound shows as blood already lost, not as weakness): what a fight measures you by. */
export function fightPower(s) {
  const p = s.player;
  const body = 0.8 + p.attrs.gengu * 0.04;
  return basePower(p) * body * (1 + weaponPower(s) + artPower(s));
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
    // 西漠 (0.22): the star official's notes, at the gate of 金丹
    if (p.realm === 2 && p.items.xingguan_notes) {
      parts.push(['星官手記', 0.08]);
      chance += 0.08;
    }
    // 北原 (0.23): 凝金丹 (寒衣's recipe), the knot of the veins, and 寒衣 standing by you there
    if (p.realm === 2) {
      const usable = Math.min(2, pills, p.items.ningjin_pill || 0);
      if (usable > 0) {
        parts.push([`凝金丹 ×${usable}`, usable * 0.15]);
        chance += usable * 0.15;
      }
      if (p.loc === 'lingmai_node') {
        parts.push(['靈脈結', 0.1]);
        chance += 0.1;
        if (s.flags.hanyi_guard) {
          parts.push(['寒衣護法', 0.05]);
          chance += 0.05;
        }
      }
    }
    // (0.26) at the gate of 元嬰: as good as the core you made
    if (p.realm === 3) {
      const g = coreOf(p);
      if (g.ying) {
        parts.push([`金丹成色・${g.name}`, g.ying]);
        chance += g.ying;
      }
    }
  }
  if (p.realm > 0) {
    // (0.26) at the gate of 化神, what you have come to understand counts for twice as much (悟道)
    const dao = p.realm === 4 && kind === 'major';
    const ins = Math.min(dao ? 40 : 20, p.insight) * 0.01;
    if (ins) {
      parts.push([dao ? '悟道' : '感悟', ins]);
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
  // (0.26) past the odds at the gates of 元嬰 and 化神, a 劫 to live through
  return { kind, chance, parts, next, ready: atBottleneck(s), jie: kind === 'major' ? jieAt(p) : null };
}
