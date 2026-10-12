// 即時戰鬥的招式：你的普攻、法術、閃避，和敵人的撲咬、刀劍、暗算。
//
// aim — how a move is aimed:
//   'melee'  a swing in front of you: reach (world units), arc (radians, the whole fan)
//   'line'   flies straight out: range, width, speed; pierce: through everyone it meets
//   'ground' flies to a spot on the ground and bursts there: range, radius, speed
//   'dash'   you go along the line yourself (untouchable while you do): range, width;
//            first: you stop at the first one you meet, rather than cutting through them all
//   'around' all about you: radius
//   'seek'   count flames that find their own way to whoever is near: range, speed
//   'self'   on yourself
// mp: 靈力 it costs; cd: seconds before it can be used again; cast: seconds of
// casting before it goes off (you move slowly meanwhile); mult: damage as a
// multiple of a plain blow; burn: seconds it burns on; stun: seconds it leaves
// them reeling; push: how far it throws them; shield, heal, ward: a share of
// your blood held off (for last seconds), given back (over last seconds), or a
// share of every blow held off (for last seconds); cure: venom gone.

/** Your plain blow, by what you hold. every: seconds between blows. */
export const STRIKES = {
  fists: { name: '拳腳', aim: 'melee', reach: 42, arc: 1.9, every: 0.45, windup: 0.08, mult: 0.75, fx: 'punch' },
  chaidao: { name: '劈砍', aim: 'melee', reach: 54, arc: 2.2, every: 0.6, windup: 0.11, mult: 1, fx: 'slash' },
  qinggang_sword: { name: '劍擊', aim: 'melee', reach: 62, arc: 2, every: 0.5, windup: 0.09, mult: 1.1, fx: 'slash' },
  hunting_bow: { name: '射箭', aim: 'line', range: 380, width: 8, speed: 720, every: 0.8, windup: 0.16, mult: 0.9, fx: 'arrow' },
};

/** The schools a move belongs to, in the order they are shown. */
export const SCHOOLS = ['通用', '劍修', '法修', '體修'];

/**
 * What you can call on in a fight, by school: 通用 anyone's, 劍修 the sword,
 * 法修 spells, 體修 the body. You carry three into a fight (修煉 → 戰鬥招式).
 *
 * Who can use one — realm: the least realm it asks (a move of the body asks
 * none, and costs no 靈力: a 凡人 can learn to throw a man); then, if it names
 * any, one of: learn (an art or 功法 that teaches it), weapon (holding one of
 * these), gengu (a body this strong, 根骨). Every move of the body comes to
 * you at 築基, when the body is remade. arts + better: what it becomes once you
 * know one of those arts.
 */
export const MOVES = {
  qi: {
    name: '靈力外放', school: '通用', aim: 'line', mp: 4, cd: 1.6, cast: 0.1, range: 260, width: 14, speed: 620, mult: 1.1, fx: 'qi',
    desc: '把靈力打出去。煉氣士人人都會，又快又省。',
  },
  guard: {
    name: '護體', school: '通用', aim: 'self', mp: 10, cd: 12, cast: 0, shield: 0.3, last: 5, fx: 'shield',
    arts: ['xuanshui'], better: { name: '玄水盾', shield: 0.45 },
    desc: '靈力護住周身，擋下一部分傷害，維持五秒。',
  },
  swordqi: {
    name: '劍氣', school: '劍修', aim: 'line', mp: 6, cd: 3, cast: 0.12, range: 300, width: 20, speed: 560, mult: 1.6, pierce: true, fx: 'swordqi',
    arts: ['qingyuan_sword', 'qingyun'], better: { mult: 2, range: 360 },
    desc: '一道劍氣直直斬出，穿過途中所有敵人。',
  },
  swordstep: {
    name: '劍影', school: '劍修', aim: 'dash', mp: 8, cd: 7, cast: 0.05, range: 150, width: 36, mult: 1.5, fx: 'swordstep',
    learn: ['qingyuan_sword'], weapon: ['qinggang_sword'],
    desc: '人隨劍走，一閃而過，沿途的敵人各挨一劍。閃身之時，刀槍不入。',
  },
  fireball: {
    name: '火球', school: '法修', aim: 'ground', mp: 8, cd: 5, cast: 0.28, range: 290, radius: 64, speed: 430, mult: 1.4, burn: 3, fx: 'fire',
    arts: ['lieyan'], better: { mult: 1.8, radius: 76 },
    desc: '火球飛向落點，炸開一片，燒著的敵人還會再灼傷一陣。',
  },
  foxfire: {
    name: '狐火', school: '法修', aim: 'seek', mp: 9, cd: 6, cast: 0.2, range: 320, count: 3, speed: 280, mult: 0.8, burn: 1.5, fx: 'foxfire',
    learn: ['fox_fire'],
    desc: '三朵幽藍的狐火，自己找上身邊的敵人。專灼魂魄，對殘魂之類尤其管用。',
  },
  mend: {
    name: '回春術', school: '法修', aim: 'self', mp: 12, cd: 14, cast: 0.3, heal: 0.3, last: 3, cure: true, fx: 'mend',
    learn: ['qingmu', 'songhe'],
    desc: '青木生機，止血生肌：三息之內回復三成氣血，也化去身上的毒。',
  },
  sweep: {
    name: '掃腿', school: '體修', aim: 'around', mp: 0, cd: 5, cast: 0.16, radius: 58, mult: 0.6, stun: 0.9, fx: 'sweep', realm: 0,
    learn: ['wild_boxing'], gengu: 6,
    desc: '鄉下打架的絆子，一腿掃一圈，把身邊的都絆個踉蹌。不耗靈力。',
  },
  charge: {
    name: '衝撞', school: '體修', aim: 'dash', mp: 0, cd: 6, cast: 0.08, range: 170, width: 30, mult: 1.3, stun: 1.2, push: 60, first: true, fx: 'charge', realm: 0,
    gengu: 7,
    desc: '一肩撞過去：撞上的第一個被撞飛出去，半天爬不起來。不耗靈力。',
  },
  iron: {
    name: '金剛', school: '體修', aim: 'self', mp: 0, cd: 16, cast: 0.2, ward: 0.5, last: 4, fx: 'iron', realm: 0,
    gengu: 8,
    desc: '一口氣沉下去，渾身筋骨繃得像鐵，四息之內受的傷減半。不耗靈力。',
  },
};

/** Which three a cultivator takes into a fight unless told otherwise: the first of these they can use. */
export const KIT_ORDER = ['swordqi', 'fireball', 'guard', 'foxfire', 'swordstep', 'charge', 'sweep', 'mend', 'iron', 'qi'];

/** What 戰鬥試煉 lends you (and what a 凡人 sees waiting, before 引氣入體). */
export const TRIAL_KIT = ['swordqi', 'fireball', 'guard'];

/** 閃避: a quick step aside, untouchable while it lasts. */
export const DASH = { name: '閃避', dist: 120, time: 0.18, inv: 0.24, cd: 2.2 };

/**
 * 丹藥: what you can swallow in the thick of it (one button takes the best
 * you have — poisoned, the one that clears it). heal: the share of your
 * blood it brings back at once; cure: it clears poison. One every PILL_CD seconds.
 */
export const PILLS = {
  heal_pill: { heal: 0.45 },
  blood_ginseng: { heal: 0.35 },
  zhixue_grass: { heal: 0.15 },
  detox_pill: { heal: 0.1, cure: true },
};
export const PILL_CD = 8;

/**
 * What those you fight can do. Every move is seen coming: windup is how long
 * it gathers itself (its mark on the ground filling) before it lands; recover
 * is how long it stands open afterwards — your moment.
 *
 * shape — the mark it leaves on the ground before it lands:
 *   'fan'  a blow in front of it: reach, arc (the whole fan); lunge: how far it steps into it
 *   'leap' a straight rush along a line: from min to max off, at speed, width wide, carrying on overshoot
 *   'shot' something loosed along a line: from min to max off, flying range at speed, width wide
 * mult: as a multiple of its plain blow. poison: [seconds, share of a blow each second] it leaves
 * in you; drain: the share of what it takes that it keeps as its own blood. fx: how the blow looks.
 */
export const BEAST_MOVES = {
  // 妖狼 — 撕咬: a short lunge with the jaws
  bite: { shape: 'fan', reach: 54, arc: 1.5, windup: 0.4, recover: 0.45, cd: 1.15, mult: 1, lunge: 12, fx: 'bite' },
  // 撲擊: crouch, then a long straight leap
  pounce: { shape: 'leap', min: 95, max: 235, windup: 0.72, speed: 640, width: 36, overshoot: 46, recover: 0.85, cd: 5.5, mult: 1.8 },
  // 灰狼: smaller jaws, a shorter spring
  nip: { shape: 'fan', reach: 46, arc: 1.4, windup: 0.38, recover: 0.55, cd: 1.4, mult: 1, lunge: 10, fx: 'bite' },
  lunge: { shape: 'leap', min: 80, max: 185, windup: 0.66, speed: 560, width: 28, overshoot: 34, recover: 0.8, cd: 6, mult: 1.5 },
  // 青鱗蛇: from coiled, quick and short, and the venom stays in you
  strike: { shape: 'leap', min: 0, max: 125, windup: 0.36, speed: 780, width: 22, overshoot: 18, recover: 0.95, cd: 2.4, mult: 1, poison: [4, 0.2] },
  // 山賊: a cut of the blade; a running cut
  slash: { shape: 'fan', reach: 52, arc: 1.7, windup: 0.42, recover: 0.5, cd: 1.3, mult: 1, lunge: 8, fx: 'cut' },
  rush: { shape: 'leap', min: 90, max: 200, windup: 0.6, speed: 520, width: 30, overshoot: 30, recover: 0.75, cd: 6.5, mult: 1.4 },
  // 獨眼龍: the great blade swung two-handed
  cleave: { shape: 'fan', reach: 68, arc: 2.5, windup: 0.8, recover: 0.85, cd: 4.5, mult: 1.9, lunge: 6, fx: 'cut' },
  // 劫修: sword qi from afar
  qi: { shape: 'shot', min: 70, max: 300, range: 340, windup: 0.55, speed: 430, width: 18, recover: 0.4, cd: 2.8, mult: 1.1, fx: 'foeqi' },
  // 地痞: a fist
  punch: { shape: 'fan', reach: 40, arc: 1.4, windup: 0.36, recover: 0.5, cd: 1.2, mult: 1, lunge: 8, fx: 'punch' },
  // 鐵背熊: a swipe of the paw; a charge with its whole weight
  maul: { shape: 'fan', reach: 60, arc: 1.8, windup: 0.6, recover: 0.7, cd: 2.2, mult: 1.6, lunge: 10, fx: 'claw' },
  bearcharge: { shape: 'leap', min: 90, max: 220, windup: 0.8, speed: 520, width: 40, overshoot: 30, recover: 1, cd: 7, mult: 1.8 },
  // 殘魂: a slow bolt of cold that drinks what it takes; a clutch at your heart
  soul: { shape: 'shot', min: 40, max: 260, range: 300, windup: 0.62, speed: 230, width: 22, recover: 0.5, cd: 2.4, mult: 1, drain: 0.5, fx: 'soul' },
  grasp: { shape: 'fan', reach: 50, arc: 1.6, windup: 0.5, recover: 0.6, cd: 2, mult: 1.1, lunge: 16, drain: 0.5, fx: 'grasp' },
};
