// 心法: passive skills (0.19). They are not cast: kept in mind (心法欄), they
// change how you fight, move and recover for as long as they are held. Each
// comes from something you learned or became — a 功法, a realm, your 根骨 —
// and the number you can hold grows with your realm.
//
// Fields:
//   name, school (流派, as moves), desc
//   needs: { learn: [功法/法術 ids, any one], realm, gengu } — all that are given must hold
//   stats: what it changes while held —
//     dmg: { all, school: {劍修: 0.12}, el: {火: 0.15} }   damage of your moves, a share more
//     mpCost: -0.1        靈力 a move costs, a share
//     cd: { all, el: {木: -0.15}, id: {mend: …} }         cooldowns, a share
//     heal: 0.3           what healing moves give, a share more
//     def: 0.08           a share of every blow kept off (with gear, capped as gear is)
//     regenFight: 0.004   blood back each second of a fight (a share of all you hold)
//     regen: 0.25         blood back out of a fight, that much faster
//     dashCd: -0.25       stepping aside again, that much sooner
//     speed: 0.08         on foot, that much quicker
//     crit: 0.04          more often a telling blow
//     chain: 0.1          相生 follow-ups that much stronger again

export const PASSIVES = {
  changchun: {
    name: '長春護體', school: '通用',
    desc: '長春功運轉不息：戰鬥中氣血每秒回復半成之一（0.4%），出了戰鬥回得更快。',
    needs: { learn: ['changchun'] },
    stats: { regenFight: 0.004, regen: 0.25 },
  },
  jianxin: {
    name: '劍心', school: '劍修',
    desc: '心在劍上，劍在心上：劍修招式傷害 +12%，暴擊 +3%。',
    needs: { learn: ['qingyuan_sword', 'jianzhen'] },
    stats: { dmg: { school: { 劍修: 0.12 } }, crit: 0.03 },
  },
  huohou: {
    name: '火候', school: '法修',
    desc: '烈焰訣的火候：火系招式傷害 +15%，靈力消耗 −10%。',
    needs: { learn: ['lieyan', 'fox_fire'] },
    stats: { dmg: { el: { 火: 0.15 } }, mpCost: -0.1 },
  },
  qingmu: {
    name: '青木生生', school: '法修',
    desc: '草木生生不息：療傷的招式多回三成，木系招式冷卻 −15%。',
    needs: { learn: ['qingmu', 'songhe'] },
    stats: { heal: 0.3, cd: { el: { 木: -0.15 } } },
  },
  xuanshui: {
    name: '玄水凝神', school: '法修',
    desc: '心如止水：所有招式靈力消耗 −12%。',
    needs: { learn: ['xuanshui'] },
    stats: { mpCost: -0.12 },
  },
  tongpi: {
    name: '銅皮鐵骨', school: '體修',
    desc: '筋骨打熬過：受到的傷害減少 8%。',
    needs: { gengu: 7 },
    stats: { def: 0.08 },
  },
  tayun: {
    name: '踏雲身', school: '身法',
    desc: '踏雲步練到身上：閃避冷卻 −25%，腳程 +6%。',
    needs: { learn: ['tayun'] },
    stats: { dashCd: -0.25, speed: 0.06 },
  },
  lingtai: {
    name: '靈台清明', school: '通用',
    desc: '築基之後，靈台一片清明：所有招式冷卻 −10%。',
    needs: { realm: 2 },
    stats: { cd: { all: -0.1 } },
  },
  wuxing: {
    name: '五行流轉', school: '通用',
    desc: '五行相生，一氣呵成：相生連招的加成再 +10%。',
    needs: { realm: 2, learn: ['qingmu', 'xuanshui', 'lieyan'] },
    stats: { chain: 0.1 },
  },
};

/** How many 心法 you can hold at once, by realm: none before 引氣入體. */
export const PASSIVE_SLOTS = [0, 1, 2, 3, 4];
