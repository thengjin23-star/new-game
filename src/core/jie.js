// 突破 (0.26): what comes of a breakthrough, and the 劫 past the odds at the gates of 元嬰 and 化神.
//
// attemptBreakthrough (core/actions.js) rolls the odds. At most gates the roll is the whole of it; at
// the gate of 元嬰 (心魔劫) and of 化神 (雷劫) a roll that comes up only opens the 劫: you live through
// it in the world (world/combat.js beginJie), and how it ends comes back here (jieOver).

import { REALMS, realmLabel, coreGrade, CORE } from './cultivation.js';
import { applyEffects, logLife } from './effects.js';
import { notice } from './events.js';
import { resetLifeWarnings } from './time.js';
import { sysGain } from '../world/system.js';
import { rand } from './rng.js';

/** What you feel as you come into a realm. */
export const RISE_TEXT = {
  1: '一縷靈氣破開閉塞的經脈，沉入丹田，化作一點溫熱。\n\n世界的聲音變了。你聽見草葉上露水滾動，聽見十丈外的蟲子振翅。\n\n你踏入了煉氣一層。從今天起，你是修士了。\n\n叮——恭喜宿主踏入修行之路。本系統溫馨提示：煉氣期壽元約一百二十年，請合理規劃。',
  2: '丹田中的靈氣液化、凝實，最終化為一方圓融的道台。\n\n天地在你眼中忽然清晰了數倍。壽元的枷鎖，鬆開了一截。\n\n你築基了。\n\n在這東荒邊陲，築基修士，已是能開宗立派的人物。而你，是命簿上沒有名字的那個人。\n\n叮——恭喜宿主築基成功。壽元上限提升至二百二十歲。本系統……有點感動。',
  3: '道台崩塌，又在烈火中重鑄，最終凝成一顆金燦燦的丹。\n\n你結丹了。',
  4: '心魔散了。散之前，它看了你一眼，像是鬆了一口氣。\n\n丹田裡那個小小的人，睜開了眼睛。\n\n你結嬰了。\n\n叮——恭喜宿主踏入元嬰。壽元上限提升至一千零二十歲。從今以後，肉身若毀，元嬰尚可出竅。\n\n叮——本系統替你記下了這一戰。',
  5: '最後一道雷落下來，劫雲散了。\n\n雲後面是天。你望著它，第一次覺得，它也在望著你。\n\n你化神了。\n\n叮——恭喜宿主踏入化神。壽元上限提升至二千五百歲。\n\n叮——……本系統提醒宿主：三千年來，沒有人過得了這一境的下一境。',
};

/** What a core of each grade is like, as it forms. */
const CORE_TEXT = [
  '丹成了，色澤卻有些暗，丹紋也淺。不算好，但總歸是成了。',
  '丹色均勻，丹紋清楚。是一顆扎扎實實的金丹。',
  '丹成的那一刻，丹田裡亮了一下。丹紋細密，像是自己長出來的。',
  '丹成的那一刻，洞裡的燈火全都朝你這邊彎了過去。丹上九道丹紋，一道不少。',
];

/**
 * Come into the next realm (a breakthrough that held). how: { chance, pills } — the odds you came to it
 * with and the 凝金丹 you took (they set the grade of a core). Returns the text to show.
 */
export function rise(s, report, how = {}) {
  const p = s.player;
  p.realm += 1;
  p.stage = 0;
  p.xw = 0;
  resetLifeWarnings(s);
  sysGain(s, p.realm === 1 ? 5 : 30, report);
  let text = RISE_TEXT[p.realm] || `你突破到了${realmLabel(p)}。`;
  // (0.26) a core has a grade, settled as it forms
  if (p.realm === 3) {
    p.core = coreGrade(s, how, rand(s));
    text += `\n\n${CORE_TEXT[p.core]}\n\n叮——金丹成色：${CORE[p.core].name}。`;
    report.chips.push({ text: `金丹成色：${CORE[p.core].name}`, tone: p.core >= 2 ? 'good' : 'sys' });
  }
  logLife(s, `突破至${realmLabel(p)}${p.realm === 3 ? `（${CORE[p.core].name}金丹）` : ''}`);
  report.chips.push({ text: `境界：${realmLabel(p)}`, tone: 'good' });
  if (p.realm >= 2) report.chips.push({ text: `壽元上限 ${REALMS[p.realm].lifespan} 歲`, tone: 'good' });
  return text;
}

/** A breakthrough that did not hold: 修為 lost, the heart shaken, and (at a great gate) a wound. */
export function fallBack(s, kind, report) {
  const p = s.player;
  const lost = Math.round(p.xw * (kind === 'major' ? 0.3 : 0.2));
  p.xw -= lost;
  report.chips.push({ text: `修為 -${lost}`, tone: 'bad' });
  const effects = kind === 'major' ? [['mind', -10], ['hurt', 1, '突破失敗，經脈盡碎']] : [['mind', -4]];
  if (kind === 'major' && rand(s) < 0.3) effects.push(['hurt', 1, '突破失敗，經脈盡碎']);
  applyEffects(s, effects, {}, report);
}

/**
 * The 劫: what opens it, how it is fought, and what it costs to fail.
 * open: shown when the odds come up (before the fight); won, lost: how it ended.
 * lost costs: the share of this stage's 修為 gone, 心境, wounds, and years of life.
 */
export const JIE = {
  xinmo: {
    name: '心魔劫',
    title: '碎丹成嬰',
    open: '金丹在丹田裡一寸一寸裂開。裂縫裡透出的光，慢慢凝成一個很小的人形——閉著眼，和你長得一模一樣。\n\n就在它要睜眼的那一刻，四周靜了下來。\n\n有人在你身後笑了一聲。是你自己的聲音。\n\n叮——警告：心魔劫。本系統……幫不了你。這一關，只能宿主自己過。',
    go: '轉過身去。',
    lost: '你倒下的時候，心魔蹲下來，在你耳邊說了一句話。醒來的時候，你已經記不得是什麼了，只記得那是你自己的聲音。\n\n裂開的金丹又合上了，比之前暗了一些。\n\n失敗了。修為與心境都退了一截，人也像老了十年。',
    cost: { xw: 0.3, mind: -15, hurt: 1, years: 10 },
  },
  leijie: {
    name: '雷劫',
    title: '劫雲',
    open: '元嬰在體內坐定的那一刻，天色暗了下來。\n\n劫雲從四面八方湧過來，壓在你頭頂上，黑得像墨。雲裡有雷在滾，一聲比一聲近。\n\n奇怪的是，那些雷像是找不到人。它們在雲裡轉來轉去，最後落下的，是一整片地方。\n\n叮——警告：雷劫。命簿上沒有宿主的名字，天雷鎖不住你，只能把這一片地方都劈一遍。本系統建議宿主：看清楚落點，跑。',
    go: '抬頭。',
    lost: '雷落在你身上的那一刻，你什麼也聽不見了。\n\n醒來的時候，四周一片焦土，劫雲早就散了。元嬰縮在丹田裡，一動也不動。\n\n失敗了。傷得很重，壽元也少了三十年。',
    cost: { xw: 0.3, mind: -10, hurt: 2, years: 30 },
  },
};

/** The odds came up at a gate with a 劫: it waits for you, and begins as soon as you face it. */
export function openJie(s, kind) {
  s.jie = { kind, day: s.day };
  const J = JIE[kind];
  notice(s, J.title, J.open, { ok: J.go });
}

/**
 * The 劫 is over: won (you come into the realm) or not (it costs you). kind: the 劫 that was fought (the
 * fight knows; if none is said, the one that was waiting). Settled only at the gate it was fought for.
 */
export function jieOver(s, how, report, kind = s.jie?.kind) {
  const J = JIE[kind];
  s.jie = null;
  const p = s.player;
  const gate = { xinmo: 3, leijie: 4 }[kind];
  if (!J || p.realm !== gate || p.stage !== REALMS[p.realm].stages.length - 1) return;
  if (how === 'won') {
    const text = rise(s, report);
    notice(s, '突破成功', text, { chips: report.chips, toasts: report.toasts });
    return;
  }
  const c = J.cost;
  const lost = Math.round(p.xw * c.xw);
  p.xw -= lost;
  report.chips.push({ text: `修為 -${lost}`, tone: 'bad' });
  // (years gone, never leaving less than five)
  const left = REALMS[p.realm].lifespan + (p.lifeBonus || 0) - (p.age0 + s.day / 360);
  const years = Math.max(0, Math.min(c.years, Math.floor(left - 5)));
  if (years) {
    p.lifeBonus = (p.lifeBonus || 0) - years;
    report.chips.push({ text: `壽元 -${years} 年`, tone: 'bad' });
  }
  applyEffects(s, [['mind', c.mind], ['hurt', c.hurt, `${J.name}失敗`]], {}, report);
  logLife(s, `渡${J.name}失敗`);
  if (s.dead) return;
  notice(s, `${J.name}失敗`, J.lost, { chips: report.chips, toasts: report.toasts });
}
