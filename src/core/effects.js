import { ITEMS, displayItem } from '../content/items.js';
import { TECHS } from '../content/techniques.js';
import { NODES } from '../world/map.js';
import { genNpc } from '../world/npcs.js';
import { rumor } from '../world/rumors.js';
import { sysGain, trySubstitute } from '../world/system.js';
import { reveal, unseenSpot } from '../world/fog.js';
import { addXiuwei, stageReq, INJURY } from './cultivation.js';
import { advance } from './time.js';
import { schedule, unschedule } from './schedule.js';
import { rand, randInt, pickWeighted } from './rng.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sign = (n) => (n > 0 ? '+' : '');

function chip(report, text, tone = 'neutral') {
  report.chips.push({ text, tone });
}

export function logLife(s, text) {
  s.log.unshift({ day: s.day, text });
  if (s.log.length > 300) s.log.length = 300;
}

export function techValue(s, id) {
  const t = TECHS[id];
  if (!t) return 0;
  let v = t.mult || 0;
  if (t.element && s.player.root.els.includes(t.element)) v += t.elemBonus || 0;
  return v;
}

export function learnTech(s, id, report) {
  const t = TECHS[id];
  const p = s.player;
  if (!t) return;
  if (t.kind === 'combat') {
    if (!p.arts.includes(id)) {
      p.arts.push(id);
      chip(report, `習得：${t.name}`, 'good');
      logLife(s, `習得${t.name}`);
    }
    return;
  }
  if (!p.techs.includes(id)) {
    p.techs.push(id);
    chip(report, `習得：${t.name}`, 'good');
    logLife(s, `習得${t.name}`);
  }
  if (!p.tech || techValue(s, id) > techValue(s, p.tech)) p.tech = id;
}

export function addItem(s, id, n, report) {
  const p = s.player;
  const it = ITEMS[id];
  if (!it) return;
  const before = p.items[id] || 0;
  const after = Math.max(0, before + n);
  if (after) p.items[id] = after;
  else delete p.items[id];
  const shown = displayItem(s, id).name;
  if (n > 0) chip(report, `獲得：${shown}${n > 1 ? ' ×' + n : ''}`, 'good');
  else if (before > 0) chip(report, `失去：${shown}${-n > 1 ? ' ×' + -n : ''}`, 'bad');
  if (n > 0 && it.disguise && s.sys.lv >= 2 && s.sys.bound && !s.sys.known[id]) {
    s.sys.known[id] = true;
    report.toasts.push(`叮——鑑定：這顆「${ITEMS[it.disguise].name}」是假的。`);
  }
}

/** Death, unless the system's 替死 intervenes. Returns true if the player died. */
export function die(s, cause, report) {
  if (trySubstitute(s, report)) {
    report.saved = true;
    chip(report, '替死觸發：重傷瀕死', 'bad');
    logLife(s, `險死還生（${cause}）`);
    return false;
  }
  s.dead = { cause, day: s.day };
  report.died = s.dead;
  return true;
}

export function discover(s, id, report) {
  const n = s.nodes[id];
  if (!n || n.known) return;
  n.known = true;
  // the map shows a glimpse of where it is
  if (s.world && NODES[id].at) reveal(s, NODES[id].at[0], NODES[id].at[1], 240);
  chip(report, `發現：${NODES[id].name}`, 'good');
  logLife(s, `得知了${NODES[id].name}`);
  sysGain(s, 10, report);
}

/** Put the player somewhere in the world (the story carried them there). */
export function moveTo(s, id) {
  const p = s.player;
  p.loc = id;
  s.nodes[id].known = true;
  s.nodes[id].visited = true;
  if (s.world && NODES[id].at) {
    s.world.x = NODES[id].at[0];
    s.world.y = NODES[id].at[1];
    s.world.region = id;
    reveal(s, s.world.x, s.world.y, 260);
  }
}

/** A count that may be a fixed number or a [min, max] range. */
function amountOf(s, v) {
  return Array.isArray(v) ? randInt(s, v[0], v[1]) : v;
}

export function applyEffects(s, effects, ctx, report) {
  const p = s.player;
  for (const eff of effects || []) {
    if (s.dead) return;
    if (typeof eff === 'function') {
      eff(s, ctx, report);
      continue;
    }
    const [op, a0, b0, c, d] = eff;
    const a = op === 'ls' || op === 'xw' ? amountOf(s, a0) : a0;
    const b = op === 'item' ? amountOf(s, b0 ?? 1) : b0;
    switch (op) {
      case 'maybe':
        if (rand(s) < a) applyEffects(s, b, ctx, report);
        break;
      case 'pick': {
        const branch = pickWeighted(s, a, (x) => x[0]);
        if (branch) applyEffects(s, branch[1], ctx, report);
        break;
      }
      case 'pickmet': {
        const pool = Object.values(s.npcs).filter((n) => !n.named && n.alive && n.met && n.id !== ctx.npcId);
        if (pool.length) {
          ctx.npc = pool[Math.floor(rand(s) * pool.length)];
          ctx.npcId = ctx.npc.id;
          ctx.npc.loc = p.loc;
        }
        break;
      }
      case 'sellall': {
        const n = p.items[a] || 0;
        if (n > 0) {
          delete p.items[a];
          p.ls += n * b;
          chip(report, `賣出：${ITEMS[a].name} ×${n}`, 'neutral');
          chip(report, `靈石 +${n * b}`, 'good');
        }
        break;
      }
      case 'halfls': {
        const lost = Math.ceil(p.ls / 2);
        if (lost) {
          p.ls -= lost;
          chip(report, `靈石 -${lost}`, 'bad');
        }
        break;
      }
      case 'allls': {
        const lost = p.ls;
        if (lost) {
          p.ls = 0;
          chip(report, `靈石 -${lost}`, 'bad');
        }
        break;
      }
      case 'xw': {
        const amount = a === 'full' ? Math.max(0, stageReq(s) - p.xw) : a;
        addXiuwei(s, amount, report);
        if (amount) chip(report, `修為 ${sign(amount)}${Math.round(amount)}`, amount > 0 ? 'good' : 'bad');
        break;
      }
      case 'ls': {
        const before = p.ls;
        p.ls = Math.max(0, p.ls + a);
        const diff = p.ls - before;
        if (diff) chip(report, `靈石 ${sign(diff)}${diff}`, diff > 0 ? 'good' : 'bad');
        break;
      }
      case 'item':
        addItem(s, a, b ?? 1, report);
        break;
      case 'flag':
        s.flags[a] = b === undefined ? true : b;
        break;
      case 'unflag':
        delete s.flags[a];
        break;
      case 'var':
        s.vars[a] = (s.vars[a] || 0) + b;
        break;
      case 'favor': {
        const npc = a === 'npc' ? ctx.npc : s.npcs[a];
        if (!npc) break;
        npc.favor = clamp(npc.favor + b, -100, 100);
        chip(report, `${npc.name} 好感${b > 0 ? '上升' : '下降'}`, b > 0 ? 'good' : 'bad');
        break;
      }
      case 'meet': {
        const npc = a === 'npc' ? ctx.npc : s.npcs[a];
        if (npc && !npc.met) {
          npc.met = true;
          chip(report, `結識：${npc.name}`, 'neutral');
          sysGain(s, npc.luck ? 10 : 5, report);
        }
        break;
      }
      case 'hurt': {
        const lv = p.injury + a;
        if (lv > 3) {
          die(s, b || '傷重不治', report);
          break;
        }
        p.injury = lv;
        p.injuryDays = INJURY[lv].days;
        chip(report, `受傷：${INJURY[lv].name}`, 'bad');
        break;
      }
      case 'heal': {
        if (p.injury === 0) break;
        p.injury = Math.max(0, p.injury - a);
        p.injuryDays = INJURY[p.injury].days;
        chip(report, p.injury ? `傷勢減輕：${INJURY[p.injury].name}` : '傷勢痊癒', 'good');
        break;
      }
      case 'healdays':
        if (p.injury > 0) {
          p.injuryDays = Math.max(1, p.injuryDays - a);
          chip(report, '傷口好轉', 'good');
        }
        break;
      case 'mind': {
        const before = p.mind;
        p.mind = clamp(p.mind + a, 0, 100);
        const diff = p.mind - before;
        if (diff) chip(report, `心境 ${sign(diff)}${diff}`, diff > 0 ? 'good' : 'bad');
        break;
      }
      case 'insight':
        p.insight = Math.max(0, p.insight + a);
        chip(report, `感悟 ${sign(a)}${a}`, a > 0 ? 'good' : 'bad');
        break;
      case 'attr': {
        const names = { gengu: '根骨', wuxing: '悟性', xinxing: '心性', jiyuan: '機緣' };
        p.attrs[a] = clamp(p.attrs[a] + b, 1, 10);
        chip(report, `${names[a]} ${sign(b)}${b}`, b > 0 ? 'good' : 'bad');
        break;
      }
      case 'days':
        advance(s, a, 'active', report);
        chip(report, `耗時 ${a} 天`, 'neutral');
        break;
      case 'discover':
        discover(s, a, report);
        break;
      case 'explore': {
        // wandering off somewhere new: clear the clouds over an unseen corner
        const id = b || p.loc;
        const spot = s.world ? unseenSpot(s, id, () => rand(s)) : null;
        if (spot) reveal(s, spot[0], spot[1], 120 + a * 30);
        else if (s.nodes[id]) s.nodes[id].explore = clamp(s.nodes[id].explore + a, 0, 100);
        break;
      }
      case 'sysexp':
        sysGain(s, a, report);
        break;
      case 'rumor':
        rumor(s, typeof a === 'function' ? a(s, ctx) : a, b || 'world');
        break;
      case 'log':
        logLife(s, typeof a === 'function' ? a(s, ctx) : a);
        break;
      case 'sched':
        schedule(s, a, b, c ?? b, d || {});
        break;
      case 'unsched':
        unschedule(s, a);
        break;
      case 'life':
        p.lifeBonus += a;
        chip(report, `壽元 ${sign(a)}${a} 年`, a > 0 ? 'good' : 'bad');
        break;
      case 'tech':
        learnTech(s, a, report);
        break;
      case 'equip':
        p.weapon = a;
        break;
      case 'death':
        die(s, a, report);
        break;
      case 'npc': {
        const npc = a === 'npc' ? ctx.npc : s.npcs[a];
        if (npc) npc[b] = c;
        break;
      }
      case 'newnpc':
        ctx.npc = genNpc(s, a);
        ctx.npcId = ctx.npc.id;
        break;
      case 'frag':
        if (!s.sys.frags.includes(a)) {
          s.sys.frags.push(a);
          chip(report, '獲得：天機殘頁', 'karma');
          report.toasts.push('叮——檢測到系統殘頁。記憶校正中……');
          sysGain(s, 30, report);
          logLife(s, '尋得一頁天機殘頁');
        }
        break;
      case 'move':
        moveTo(s, a);
        break;
      case 'buff':
        p.buffs[a] = Math.max(p.buffs[a] || 0, b);
        break;
      case 'goto':
        ctx.goto = a;
        break;
      case 'queue':
        s.queue.push(a);
        break;
      case 'realm':
        p.realm = a;
        p.stage = b;
        p.xw = 0;
        break;
      case 'bind':
        s.sys.bound = true;
        break;
      case 'toast':
        report.toasts.push(a);
        break;
      case 'chip':
        chip(report, a, b || 'neutral');
        break;
      default:
        throw new Error(`Unknown effect op: ${op}`);
    }
  }
}
