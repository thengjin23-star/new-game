import { NODES, route, canSecludeAt } from '../world/map.js';
import { ITEMS, SHOPS, displayItem } from '../content/items.js';
import { TECHS } from '../content/techniques.js';
import { DEDUCE, DEDUCE_FALLBACK, sysGain } from '../world/system.js';
import { advance, newReport, resetLifeWarnings } from './time.js';
import { applyEffects, logLife, techValue } from './effects.js';
import { pickEvent, startEvent, takeDue, notice } from './events.js';
import { breakthroughInfo, realmLabel, REALMS, stageReq } from './cultivation.js';
import { rand, randInt, chance, pick, pickWeighted } from './rng.js';
import { fmtDuration, cnNum } from './calendar.js';
import { checkChance } from './checks.js';

export const MS_PER_DAY = 3000;

function busy(s) {
  return !!(s.pending || s.secl || s.dead);
}

function pre(report) {
  return {
    days: report.days,
    xw: Math.round(report.xw),
    stageUps: report.stageUps,
    toasts: report.toasts,
  };
}

/** After time passes at a node, fire a due 因果 event if there is one. */
function fireDue(s, report) {
  const due = takeDue(s, s.player.loc);
  if (!due) return false;
  startEvent(s, due.id, { data: due.data, pre: pre(report) });
  return true;
}

export function explore(s) {
  if (busy(s)) return;
  const node = s.player.loc;
  const report = newReport();
  advance(s, randInt(s, 2, 4), 'active', report);
  if (s.dead) return finishDeath(s, report);
  const st = s.nodes[node];
  const gain = randInt(s, 6, 11) + Math.floor(s.player.attrs.jiyuan / 3);
  const before = st.explore;
  st.explore = Math.min(100, st.explore + gain);
  if (before < 100 && st.explore >= 100) {
    sysGain(s, 8, report);
    report.toasts.push(`叮——${NODES[node].name}已探索完畢。`);
  }
  s.stats.explores += 1;
  if (fireDue(s, report)) return;
  const id = pickEvent(s, 'explore', node) || 'generic_explore';
  startEvent(s, id, { pre: pre(report) });
}

export function inquire(s) {
  if (busy(s)) return;
  const node = s.player.loc;
  if (!NODES[node].inquire) return;
  const report = newReport();
  advance(s, 1, 'active', report);
  if (s.dead) return finishDeath(s, report);
  if (fireDue(s, report)) return;
  const id = pickEvent(s, 'inquire', node) || 'generic_inquire';
  startEvent(s, id, { pre: pre(report) });
}

export function travel(s, to) {
  if (busy(s) || to === s.player.loc) return;
  const r = route(s, s.player.loc, to);
  if (!r) return;
  const report = newReport();
  const from = s.player.loc;
  advance(s, r.days, 'active', report);
  if (s.dead) return finishDeath(s, report);
  s.player.loc = to;
  s.stats.travels += 1;
  const st = s.nodes[to];
  const first = !st.visited;
  st.visited = true;
  if (first) {
    sysGain(s, 5, report);
    logLife(s, `初到${NODES[to].name}`);
  }
  // A road event first, then whatever waits at the destination.
  const queue = [];
  if (r.days >= 2 && chance(s, 0.4)) {
    const tid = pickEvent(s, 'travel', to, { from });
    if (tid) queue.push(tid);
  }
  const due = takeDue(s, to);
  if (due) queue.push(due.id);
  const aid = pickEvent(s, 'arrive', to);
  if (aid) queue.push(aid);
  if (queue.length) {
    startEvent(s, queue[0], { pre: pre(report) });
    s.queue.push(...queue.slice(1));
  } else {
    notice(s, NODES[to].name, `${fmtDuration(r.days)}之後，你到了${NODES[to].name}。\n\n${NODES[to].desc}`, {
      pre: pre(report),
    });
  }
}

export function visit(s, npcId) {
  if (busy(s)) return;
  const npc = s.npcs[npcId];
  if (!npc || !npc.alive || npc.loc !== s.player.loc) return;
  const report = newReport();
  advance(s, 1, 'active', report);
  if (s.dead) return finishDeath(s, report);
  if (fireDue(s, report)) return;
  const id = pickEvent(s, 'visit', s.player.loc, { npc: npcId });
  if (id) return startEvent(s, id, { npcId, pre: pre(report) });
  const last = s.vars['chat_' + npcId] || -999;
  const chips = [];
  if (s.day - last >= 30) {
    s.vars['chat_' + npcId] = s.day;
    npc.favor = Math.min(100, npc.favor + 1);
    chips.push({ text: `${npc.name} 好感上升`, tone: 'good' });
  }
  notice(s, npc.name, pick(s, CHAT_LINES)(npc), { chips, pre: pre(report) });
}

const CHAT_LINES = [
  (n) => `你和${n.name}閒聊了半日，說些天氣、收成和遠方的傳聞。`,
  (n) => `${n.name}正忙，招呼你坐了一會兒，給你倒了碗茶。`,
  (n) => `${n.name}看見你，點了點頭。你們都沒說什麼，卻也不覺得尷尬。`,
  (n) => `${n.name}問起你最近的修行。你說了一些，留了一些。`,
];

// ── 閉關 ──

export const SECLUSION_OPTIONS = [
  { days: 30, label: '一個月' },
  { days: 180, label: '半年' },
  { days: 360, label: '一年' },
  { days: 1080, label: '三年' },
  { days: 3600, label: '十年' },
];

export function seclusionBlocker(s) {
  if (s.pending || s.dead) return '眼下脫不開身。';
  if (s.secl) return '已在閉關中。';
  return canSecludeAt(s, s.player.loc);
}

export function startSeclusion(s, days, now, speed = 1) {
  if (seclusionBlocker(s)) return;
  s.secl = {
    start: now,
    days,
    done: 0,
    msPerDay: MS_PER_DAY / speed,
    node: s.player.loc,
    startDay: s.day,
    xw: 0,
    stageUps: [],
    lines: [],
    toasts: [],
    rumorsBefore: s.rumors.length,
    interrupt: null,
  };
}

/** Progress a seclusion to the current real time. Returns true when it ended. */
export function tickSeclusion(s, now) {
  const x = s.secl;
  if (!x) return false;
  const target = Math.min(x.days, Math.floor((now - x.start) / x.msPerDay));
  while (x.done < target && !s.dead && !x.interrupt) {
    const toBoundary = 30 - (x.done % 30);
    const chunk = Math.min(target - x.done, toBoundary);
    const report = newReport();
    advance(s, chunk, 'seclusion', report);
    x.done += chunk;
    x.xw += report.xw;
    x.stageUps.push(...report.stageUps);
    x.toasts.push(...report.toasts);
    s.stats.seclDays += chunk;
    if (x.done % 30 === 0) seclusionMonth(s, x);
    if (s.dead) break;
  }
  if (x.done >= x.days || s.dead || x.interrupt) {
    finishSeclusion(s);
    return true;
  }
  return false;
}

export function endSeclusionEarly(s, now) {
  if (!s.secl) return;
  tickSeclusion(s, now);
  if (s.secl) finishSeclusion(s);
}

function seclusionMonth(s, x) {
  const p = s.player;
  const report = newReport();
  const risk = NODES[x.node].secludeRisk || 0;
  const guard = TECHS[p.tech]?.mindGuard || 0;
  // 頓悟
  if (chance(s, 0.012 + p.attrs.wuxing * 0.003)) {
    const bonus = Math.round(stageReq(s) * 0.08);
    applyEffects(s, [['insight', 1], ['buff', 'epiphany', 60], ['xw', bonus]], {}, report);
    x.lines.push(pick(s, EPIPHANY));
  }
  // 心魔
  const demon = Math.max(0.005, 0.025 + (50 - p.mind) / 1000 + risk * 0.03 - guard * 0.05);
  if (chance(s, demon)) {
    const ok = rand(s) < checkChance(s, { kind: 'xinxing', diff: 5 });
    if (ok) {
      applyEffects(s, [['mind', 3]], {}, report);
      x.lines.push('心魔幻象纏身數日，你守住靈台一點清明，終將它斬滅。心境反而更穩了。');
    } else {
      applyEffects(s, [['mind', -8], ['hurt', 1, '心魔反噬']], {}, report);
      x.lines.push('心魔趁虛而入。你在幻象裡看見了最怕的東西，醒來時嘴角全是血。');
    }
  }
  // 外擾
  if (risk && chance(s, risk * 0.12)) {
    const foe = 12 + NODES[x.node].danger * 12;
    const ok = rand(s) < checkChance(s, { kind: 'power', diff: foe });
    if (ok) {
      applyEffects(s, [['ls', randInt(s, 3, 12)]], {}, report);
      x.lines.push('一頭妖獸循著靈氣摸到洞口。你提前驚覺，將它斬殺，順手剝了妖核換靈石。');
    } else {
      applyEffects(s, [['hurt', 1, '閉關時遭妖獸襲擊']], {}, report);
      x.lines.push('一頭妖獸闖進你閉關的地方。你倉促出手，負傷將它逼退，閉關被迫中止。');
      x.interrupt = 'beast';
    }
  }
  // 長久靜坐，心境漸穩
  if (p.mind < 70 && chance(s, 0.3)) p.mind += 1;
  x.toasts.push(...report.toasts);
}

const EPIPHANY = [
  '某夜聽見洞外雨聲，一滴、兩滴……你忽然明白了靈氣流轉的道理。（頓悟）',
  '你在吐納間看見體內經脈如江河，有一處淤塞，忽然就通了。（頓悟）',
  '靜坐到第九十日，你想起小時候母親揉麵的手勢，竟從中悟出一絲運氣的法門。（頓悟）',
];

function finishSeclusion(s) {
  const x = s.secl;
  s.secl = null;
  const p = s.player;
  const lines = [];
  lines.push(`閉關 ${fmtDuration(x.done)}。${x.interrupt ? '（被迫中止）' : ''}`);
  if (x.stageUps.length) lines.push(`境界提升：${x.stageUps.join('、')}。`);
  if (x.lines.length) lines.push('', ...x.lines);
  const fresh = s.rumors.length - x.rumorsBefore;
  const newRumors = s.rumors.slice(0, Math.max(0, Math.min(fresh, 6)));
  if (newRumors.length) {
    lines.push('', '出關後，你聽說了這些事：');
    for (const r of newRumors) lines.push(`・${r.text}`);
    if (fresh > newRumors.length) lines.push(`・……還有 ${fresh - newRumors.length} 則傳聞，記在見聞錄裡。`);
  }
  const chips = [{ text: `修為 +${Math.round(x.xw)}`, tone: 'good' }];
  if (s.dead) {
    s.pending = null;
    return;
  }
  logLife(s, `於${NODES[x.node].name}閉關${fmtDuration(x.done)}`);
  notice(s, '出關', lines.join('\n'), { chips, toasts: x.toasts });
  const due = takeDue(s, p.loc);
  if (due) s.queue.push(due.id);
}

// ── 突破 ──

export function attemptBreakthrough(s, pills = 0) {
  if (busy(s)) return;
  const info = breakthroughInfo(s, { pills });
  if (!info.ready) return;
  const p = s.player;
  const report = newReport();
  // pills: real ones first; a fake one does nothing (and you find out the hard way)
  let usedFake = 0;
  if (p.realm === 1 && info.kind === 'major' && pills > 0) {
    const usable = Math.min(2, pills, (p.items.zhuji_pill || 0) + (p.items.fake_zhuji || 0));
    const real = Math.min(usable, p.items.zhuji_pill || 0);
    usedFake = usable - real;
    if (real) applyEffects(s, [['item', 'zhuji_pill', -real]], {}, report);
    if (usedFake) {
      applyEffects(s, [['item', 'fake_zhuji', -usedFake]], {}, report);
      s.sys.known.fake_zhuji = true;
    }
  }
  const ok = rand(s) < info.chance;
  s.stats.breakthroughs += 1;
  const fakeLine = usedFake ? '\n\n吞下「築基丹」的那一刻，你嚐到一股熟悉的甜味——是蜂蜜和麵粉。你被騙了。\n' : '';
  if (ok) {
    if (info.kind === 'major') {
      p.realm += 1;
      p.stage = 0;
      p.xw = 0;
      resetLifeWarnings(s);
      sysGain(s, p.realm === 1 ? 5 : 30, report);
      logLife(s, `突破至${realmLabel(p)}`);
      const text = MAJOR_TEXT[p.realm] || `你突破到了${realmLabel(p)}。`;
      report.chips.push({ text: `境界：${realmLabel(p)}`, tone: 'good' });
      if (p.realm >= 2) report.chips.push({ text: `壽元上限 ${REALMS[p.realm].lifespan} 歲`, tone: 'good' });
      notice(s, '突破成功', fakeLine + text, { chips: report.chips, toasts: report.toasts });
    } else {
      p.stage += 1;
      p.xw = 0;
      logLife(s, `突破至${realmLabel(p)}`);
      report.chips.push({ text: `境界：${realmLabel(p)}`, tone: 'good' });
      notice(s, '突破成功', `瓶頸應聲而破。你踏入了${realmLabel(p)}。`, { chips: report.chips, toasts: report.toasts });
    }
    return;
  }
  const lossRate = info.kind === 'major' ? 0.3 : 0.2;
  const lost = Math.round(p.xw * lossRate);
  p.xw -= lost;
  report.chips.push({ text: `修為 -${lost}`, tone: 'bad' });
  const effects = info.kind === 'major' ? [['mind', -10], ['hurt', 1, '突破失敗，經脈盡碎']] : [['mind', -4]];
  if (info.kind === 'major' && rand(s) < 0.3) effects.push(['hurt', 1, '突破失敗，經脈盡碎']);
  applyEffects(s, effects, {}, report);
  logLife(s, `衝擊${info.next}失敗`);
  if (s.dead) return;
  const text =
    info.kind === 'major'
      ? '靈氣衝到最後一關，像撞上一堵看不見的牆。反震之力讓你噴出一口鮮血。\n\n失敗了。但你還活著，還能再試。'
      : '差了一點。就差那麼一點。';
  notice(s, '突破失敗', fakeLine + text, { chips: report.chips, toasts: report.toasts });
}

const MAJOR_TEXT = {
  1: '一縷靈氣破開閉塞的經脈，沉入丹田，化作一點溫熱。\n\n世界的聲音變了。你聽見草葉上露水滾動，聽見十丈外的蟲子振翅。\n\n你踏入了煉氣一層。從今天起，你是修士了。\n\n叮——恭喜宿主踏入修行之路。本系統溫馨提示：煉氣期壽元約一百二十年，請合理規劃。',
  2: '丹田中的靈氣液化、凝實，最終化為一方圓融的道台。\n\n天地在你眼中忽然清晰了數倍。壽元的枷鎖，鬆開了一截。\n\n你築基了。\n\n在這東荒邊陲，築基修士，已是能開宗立派的人物。而你，是命簿上沒有名字的那個人。\n\n叮——恭喜宿主築基成功。壽元上限提升至二百二十歲。本系統……有點感動。',
  3: '道台崩塌，又在烈火中重鑄，最終凝成一顆金燦燦的丹。\n\n你結丹了。',
};

// ── 物品 ──

export function useItem(s, id) {
  if (busy(s)) return;
  const it = ITEMS[id];
  if (!it?.use || !(s.player.items[id] > 0)) return;
  const report = newReport();
  if (!it.keep) applyEffects(s, [['item', id, -1]], {}, report);
  applyEffects(s, it.use.effects, {}, report);
  if (s.dead) return;
  notice(s, displayItem(s, id).name, it.use.text || '你用了它。', { chips: report.chips, toasts: report.toasts });
}

export function equip(s, id) {
  if (busy(s)) return;
  if (ITEMS[id]?.kind !== 'weapon' || !(s.player.items[id] > 0)) return;
  s.player.weapon = s.player.weapon === id ? null : id;
}

export function setTech(s, id) {
  if (busy(s) || !s.player.techs.includes(id)) return;
  s.player.tech = id;
}

export function shopHere(s) {
  return NODES[s.player.loc].shop ? SHOPS[NODES[s.player.loc].shop] : null;
}

export function buy(s, id) {
  if (busy(s)) return;
  const shop = shopHere(s);
  const it = ITEMS[id];
  if (!shop || !shop.stock.includes(id) || !it?.price || s.player.ls < it.price) return;
  s.player.ls -= it.price;
  s.player.items[id] = (s.player.items[id] || 0) + 1;
}

export function sellPrice(s, id) {
  const it = ITEMS[id];
  if (!it) return 0;
  // A disguised fake sells like the real thing only to someone who cannot tell.
  if (it.disguise && !s.sys.known[id]) return 0;
  return it.sell || 0;
}

export function sell(s, id) {
  if (busy(s) || !shopHere(s)) return;
  const price = sellPrice(s, id);
  if (!price || !(s.player.items[id] > 0)) return;
  s.player.items[id] -= 1;
  if (!s.player.items[id]) delete s.player.items[id];
  if (s.player.weapon === id && !s.player.items[id]) s.player.weapon = null;
  s.player.ls += price;
}

export function identifyCost(s) {
  return s.sys.bound && s.sys.lv >= 2 ? 0 : 10;
}

export function canIdentify(s, id) {
  const it = ITEMS[id];
  if (!it || !(s.player.items[id] > 0)) return false;
  const needs = it.identify || (it.disguise && !s.sys.known[id]);
  if (!needs) return false;
  if (identifyCost(s) === 0) return true;
  return s.player.loc === 'luoxia_market' && s.player.ls >= 10;
}

export function identify(s, id) {
  if (busy(s) || !canIdentify(s, id)) return;
  const it = ITEMS[id];
  const report = newReport();
  const cost = identifyCost(s);
  if (cost) applyEffects(s, [['ls', -cost]], {}, report);
  const who = cost ? '坊市的鑑定師瞇著眼看了半天：' : '叮——鑑定完成：';
  if (it.disguise) {
    s.sys.known[id] = true;
    notice(s, '鑑定', `${who}這是${it.name}。${it.desc}`, { chips: report.chips });
    return;
  }
  const res = pickWeighted(s, it.identify, (r) => r.w);
  applyEffects(s, [['item', id, -1], ...res.effects], {}, report);
  notice(s, '鑑定', `${who}${res.text}`, { chips: report.chips, toasts: report.toasts });
}

// ── 系統：推演 ──

export function deduceReady(s) {
  return s.sys.bound && s.sys.lv >= 2 && s.day - s.sys.lastDeduce >= 30 && !busy(s);
}

export function deduce(s) {
  if (!deduceReady(s)) return;
  s.sys.lastDeduce = s.day;
  const report = newReport();
  const hint = DEDUCE.find((d) => d.cond(s));
  if (hint) {
    applyEffects(s, hint.effects, {}, report);
    notice(s, '推演', `叮——推演結果：${hint.text}`, { chips: report.chips, toasts: report.toasts });
  } else {
    notice(s, '推演', `叮——${pick(s, DEDUCE_FALLBACK)}`);
  }
}

// ── 死亡 ──

function finishDeath(s, report) {
  s.pending = null;
  return report;
}

export function lifeSummary(s) {
  const p = s.player;
  return {
    name: p.name,
    age: Math.floor(p.age0 + (s.dead ? s.dead.day : s.day) / 360),
    realm: realmLabel(p),
    cause: s.dead?.cause,
    days: s.day,
    explores: s.stats.explores,
    met: Object.values(s.npcs).filter((n) => n.met).length,
    places: Object.values(s.nodes).filter((n) => n.visited).length,
  };
}

export { cnNum, techValue };
