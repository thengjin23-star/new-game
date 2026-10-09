import { DAYS_PER_MONTH } from './calendar.js';
import { addXiuwei, dailyRate, age, lifespan, INJURY } from './cultivation.js';
import { runArcs, recurring } from '../world/arcs.js';
import { simulateNpcs, pruneNpcs } from '../world/npcs.js';
import { ambientRumor, rumor } from '../world/rumors.js';
import { rechargeTick } from '../world/system.js';

export function newReport() {
  return { days: 0, xw: 0, stageUps: [], toasts: [], logs: [], chips: [], rumorsBefore: null, died: null };
}

/**
 * Let `days` pass. mode 'seclusion' cultivates at full rate; 'active'
 * (exploring, travelling) at 20%, the nights spent meditating.
 */
export function advance(s, days, mode, report) {
  if (report.rumorsBefore === null) report.rumorsBefore = s.rumors.length;
  const factor = mode === 'seclusion' ? 1 : 0.2;
  const p = s.player;
  for (let i = 0; i < days; i++) {
    if (s.dead) break;
    const gain = dailyRate(s) * factor;
    addXiuwei(s, gain, report);
    report.xw += gain;
    s.day += 1;
    report.days += 1;
    // injuries heal one level at a time
    if (p.injury > 0) {
      p.injuryDays -= 1;
      if (p.injuryDays <= 0) {
        p.injury -= 1;
        p.injuryDays = INJURY[p.injury].days;
      }
    }
    for (const k of Object.keys(p.buffs)) {
      p.buffs[k] -= 1;
      if (p.buffs[k] <= 0) delete p.buffs[k];
    }
    runArcs(s);
    recurring(s);
    if (s.day % DAYS_PER_MONTH === 0) monthTick(s, report);
    if (age(s) >= lifespan(s)) {
      s.dead = { cause: '壽元耗盡，坐化', day: s.day };
      report.died = s.dead;
    }
  }
}

function monthTick(s, report) {
  simulateNpcs(s, report, rumor);
  if (s.day % 360 === 0) pruneNpcs(s);
  ambientRumor(s);
  rechargeTick(s, report);
  // drop scheduled events whose window has passed
  s.sched = s.sched.filter((x) => x.expire === null || x.expire >= s.day);
  const left = lifespan(s) - age(s);
  const warn = s.vars.lifeWarn || 0;
  if (s.sys.bound && left < 10 && warn < 2) {
    s.vars.lifeWarn = 2;
    report.toasts.push(`叮——警告：宿主壽元僅餘 ${Math.max(0, Math.floor(left))} 年。`);
  } else if (s.sys.bound && left < 30 && warn < 1) {
    s.vars.lifeWarn = 1;
    report.toasts.push(`叮——提醒：宿主壽元餘 ${Math.floor(left)} 年。請考慮突破。`);
  }
}

/**
 * Let hours of the day pass (walking, talking, resting). Crossing midnight
 * runs whole days through advance(). Returns how many days turned.
 */
export function spendHours(s, hours, report, mode = 'active') {
  if (!(hours > 0)) return 0;
  s.tod = (s.tod ?? 8) + hours;
  let days = 0;
  while (s.tod >= 24) {
    s.tod -= 24;
    days += 1;
  }
  if (days) advance(s, days, mode, report);
  return days;
}

/** Reset the lifespan warnings after a breakthrough extends life. */
export function resetLifeWarnings(s) {
  s.vars.lifeWarn = 0;
}
