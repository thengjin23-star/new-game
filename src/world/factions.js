// 勢力: who in 青石一帶 has an opinion of you, and what it is. 落霞坊市's
// traders and the 散修 who drink there; 青雲宗; the 黑風寨 in the forest.
// Standing comes from what you do (a bounty brought in, a robber driven
// off, a bandit cut down, a hand given to the sect) and does something: a
// price, a greeting, a blade drawn or left in its sheath.

export const FACTIONS = {
  market: {
    name: '落霞坊市',
    who: '坊市的商家與散修',
    desc: '方圓數百里唯一的修士坊市。名聲好了，掌櫃們給你的價錢也就好看些。',
    // [from standing, name, what it means]
    tiers: [
      [-999, '冷眼', '掌櫃們看見你就皺眉，東西都貴一成。'],
      [-20, '生面孔', ''],
      [25, '熟客', '坊市的東西打九五折。'],
      [70, '老主顧', '打九折。'],
      [140, '坊市貴客', '打八五折。'],
    ],
  },
  sect: {
    name: '青雲宗',
    who: '青雲宗的師長與弟子',
    desc: '東荒的小宗門。弟子以貢獻換功法、丹藥、法器；外人做的好事，山上也記得。',
    tiers: [
      [-999, '不受歡迎', '守山弟子看你的眼神不太友善。'],
      [-20, '外人', ''],
      [30, '有些交情', '山上的人記得你。'],
      [80, '宗門之友', '收徒時，執事會多看你一眼。'],
    ],
  },
  bandits: {
    name: '黑風寨',
    who: '黑風林裡的山賊',
    desc: '獨眼龍的人。殺了他們的人，他們記仇；入了他們的夥，就是自己人。',
    tiers: [
      [-999, '血仇', '寨裡的人見了你，二話不說就動手。'],
      [-30, '結怨', '他們記得你殺過他們的人。'],
      [-5, '不相干', ''],
      [30, '道上朋友', '在黑風林裡遇上，他們讓你過去。'],
      [80, '自己人', '山賊見了你，抱拳叫一聲「當家的」。'],
    ],
  },
};

const RANGE = [-200, 300];

/** Your standing with a faction. */
export function repOf(s, id) {
  return s.rep?.[id] || 0;
}

/** Where you stand with them: { name, note, at } (the tier you are in). */
export function standing(s, id) {
  const v = repOf(s, id);
  let t = FACTIONS[id].tiers[0];
  for (const tier of FACTIONS[id].tiers) if (v >= tier[0]) t = tier;
  return { name: t[1], note: t[2], at: v };
}

/** Change your standing (a chip in the report says so). */
export function addRep(s, id, n, report = null) {
  if (!FACTIONS[id] || !n) return;
  s.rep ||= {};
  const before = standing(s, id).name;
  s.rep[id] = Math.max(RANGE[0], Math.min(RANGE[1], repOf(s, id) + n));
  if (report) {
    report.chips.push({ text: `${FACTIONS[id].name}聲望 ${n > 0 ? '+' : ''}${n}`, tone: n > 0 ? 'good' : 'bad' });
    const after = standing(s, id).name;
    if (after !== before) report.toasts.push(`在${FACTIONS[id].name}，你如今是「${after}」。`);
  }
}

/** What the 坊市's shops charge you, as a share of the price (1: as marked). */
export function priceShare(s) {
  const v = repOf(s, 'market');
  if (v >= 140) return 0.85;
  if (v >= 70) return 0.9;
  if (v >= 25) return 0.95;
  if (v < -20) return 1.1;
  return 1;
}

/** Will the 黑風寨 let you pass? (Friends of the road, and their own.) */
export function banditsFriendly(s) {
  return repOf(s, 'bandits') >= 30;
}

/** Do they come at you on sight? (Those who have spilled enough of their blood.) */
export function banditsHostile(s) {
  return repOf(s, 'bandits') < -30;
}

/**
 * What it does to your standing when you beat one of them: a bandit cut
 * down (the 寨 remembers; the 坊市 is glad), a road robber driven off (the
 * 坊市 is glad).
 */
export function onBeaten(s, kind, report = null) {
  if (kind === 'bandit' || kind === 'bandit_chief') {
    addRep(s, 'bandits', kind === 'bandit_chief' ? -15 : -5, report);
    addRep(s, 'market', 1, report);
  } else if (kind === 'cultivator') addRep(s, 'market', 2, report);
}
