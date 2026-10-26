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
// el: its element of the 五行 (content/wuxing.js) — 相剋 on a foe, 相生 from
// the move before it; back: it flies out and comes back to your hand (striking
// again on the way); chill: [seconds, pace] — those it strikes move (and
// gather themselves) at that pace for a while; swords, radius, last: blades
// that circle you so long, striking whatever they touch.

/** Your plain blow, by what you hold. every: seconds between blows. */
export const STRIKES = {
  fists: { name: '拳腳', aim: 'melee', reach: 42, arc: 1.9, every: 0.45, windup: 0.08, mult: 0.75, fx: 'punch' },
  chaidao: { name: '劈砍', aim: 'melee', reach: 54, arc: 2.2, every: 0.6, windup: 0.11, mult: 1, fx: 'slash' },
  qinggang_sword: { name: '劍擊', aim: 'melee', reach: 62, arc: 2, every: 0.5, windup: 0.09, mult: 1.1, fx: 'slash' },
  hunting_bow: { name: '射箭', aim: 'line', range: 380, width: 8, speed: 720, every: 0.8, windup: 0.16, mult: 0.9, fx: 'arrow' },
};

/** The schools a move belongs to, in the order they are shown (法器: what a worn 法器 lets you do). */
export const SCHOOLS = ['通用', '劍修', '法修', '體修', '法器'];

/**
 * What you can call on in a fight, by school: 通用 anyone's, 劍修 the sword,
 * 法修 spells, 體修 the body. You carry a set of four into a fight, and
 * can change to another set in it (修煉 → 技能; world/skills.js).
 *
 * Who can use one — realm: the least realm it asks (a move of the body asks
 * none, and costs no 靈力: a 凡人 can learn to throw a man); then, if it names
 * any, one of: learn (an art or 功法 that teaches it), weapon (holding one of
 * these), gengu (a body this strong, 根骨). Every move of the body comes to
 * you at 築基, when the body is remade. arts + better: what it becomes once you
 * know one of those arts. relic: a 法器 you must be wearing (core/body.js).
 * holy: light that burns the things of spirit most of all.
 */
export const MOVES = {
  qi: {
    name: '靈力外放', school: '通用', aim: 'line', mp: 4, cd: 1.6, cast: 0.1, range: 260, width: 14, speed: 620, mult: 1.1, fx: 'qi',
    mastery: [[4, { pierce: true }]],
    desc: '把靈力打出去。煉氣士人人都會，又快又省。',
  },
  guard: {
    name: '護體', school: '通用', aim: 'self', mp: 10, cd: 12, cast: 0, shield: 0.3, last: 5, fx: 'shield',
    arts: ['xuanshui'], better: { name: '玄水盾', shield: 0.45, el: '水' },
    mastery: [[4, { last: 7 }]],
    desc: '靈力護住周身，擋下一部分傷害，維持五秒。',
  },
  swordqi: {
    name: '劍氣', school: '劍修', el: '金', aim: 'line', mp: 6, cd: 3, cast: 0.12, range: 300, width: 20, speed: 560, mult: 1.6, pierce: true, fx: 'swordqi',
    arts: ['qingyuan_sword', 'qingyun'], better: { mult: 2, range: 360 },
    mastery: [[4, { width: 30 }]],
    desc: '一道劍氣直直斬出，穿過途中所有敵人。',
  },
  swordstep: {
    name: '劍影', school: '劍修', el: '金', aim: 'dash', mp: 8, cd: 7, cast: 0.05, range: 150, width: 36, mult: 1.5, fx: 'swordstep',
    learn: ['qingyuan_sword'], weapon: ['qinggang_sword', 'hantie_sword'],
    desc: '人隨劍走，一閃而過，沿途的敵人各挨一劍。閃身之時，刀槍不入。',
  },
  feijian: {
    name: '飛劍', school: '劍修', el: '金', aim: 'line', mp: 10, cd: 4, cast: 0.15, range: 330, width: 22, speed: 720, mult: 1.3, pierce: true, back: true, fx: 'feijian', realm: 2,
    weapon: ['qinggang_sword', 'hantie_sword'],
    desc: '築基之後，劍能離手：飛劍直直射出，穿過途中所有敵人，再飛回你手上——回來的路上，再斬一次。',
  },
  jianzhen: {
    name: '劍陣', school: '劍修', el: '金', aim: 'self', mp: 18, cd: 16, cast: 0.3, swords: 6, radius: 70, last: 6, mult: 0.45, fx: 'jianzhen', realm: 2,
    learn: ['jianzhen'],
    desc: '六道劍影繞身飛轉六息：碰上的敵人，每過半息挨一劍。圍上來的越多，挨的越多。',
  },
  fireball: {
    name: '火球', school: '法修', el: '火', aim: 'ground', mp: 8, cd: 5, cast: 0.28, range: 290, radius: 64, speed: 430, mult: 1.4, burn: 3, fx: 'fire',
    arts: ['lieyan'], better: { mult: 1.8, radius: 76 },
    mastery: [[4, { burn: 5 }], [5, { radius: 80 }]],
    desc: '火球飛向落點，炸開一片，燒著的敵人還會再灼傷一陣。',
  },
  foxfire: {
    name: '狐火', school: '法修', el: '火', aim: 'seek', mp: 9, cd: 6, cast: 0.2, range: 320, count: 3, speed: 280, mult: 0.8, burn: 1.5, fx: 'foxfire',
    learn: ['fox_fire'],
    desc: '三朵幽藍的狐火，自己找上身邊的敵人。專灼魂魄，對殘魂之類尤其管用。',
  },
  mend: {
    name: '回春術', school: '法修', el: '木', aim: 'self', mp: 12, cd: 14, cast: 0.3, heal: 0.3, last: 3, cure: true, fx: 'mend',
    learn: ['qingmu', 'songhe'],
    mastery: [[4, { last: 2 }]],
    desc: '青木生機，止血生肌：三息之內回復三成氣血，也化去身上的毒。',
  },
  vine: {
    name: '藤縛', school: '法修', el: '木', aim: 'ground', mp: 9, cd: 7, cast: 0.25, range: 280, radius: 60, speed: 900, mult: 0.6, stun: 1.8, fx: 'vine',
    learn: ['qingmu'],
    desc: '青藤從落點的地底鑽出，纏住那一片的敵人，一時半刻動彈不得（首領掙得快些）。',
  },
  frost: {
    name: '玄冰刺', school: '法修', el: '水', aim: 'line', mp: 8, cd: 4.5, cast: 0.18, range: 300, width: 18, speed: 600, mult: 1.2, chill: [3, 0.55], fx: 'frost',
    learn: ['xuanshui'],
    mastery: [[4, { chill: [4.5, 0.5] }]],
    desc: '一道寒冰直刺而出：中了的敵人凍得手腳發僵，三息之內，走、撲、出招都慢上將近一半。',
  },
  thunder: {
    name: '掌心雷', school: '法修', el: '木', aim: 'bolt', mp: 10, cd: 6, cast: 0.4, range: 280, radius: 48, mult: 1.7, stun: 0.6, fx: 'thunder',
    learn: ['leifa'],
    mastery: [[4, { radius: 60 }], [5, { stun: 1 }]],
    desc: '掌心引來一道天雷，劈在指定的地方：一圈之內的敵人一起受傷，麻上片刻。雷屬木，接在水系招式之後是相生。',
  },
  dici: {
    name: '地刺', school: '法修', el: '土', aim: 'bolt', mp: 9, cd: 6, cast: 0.35, range: 260, radius: 50, mult: 1.5, stun: 0.8, fx: 'spikes',
    learn: ['houtu'],
    mastery: [[4, { radius: 60 }], [5, { stun: 1.2 }]],
    desc: '一掌按地，指定的地方石刺破土而出：一圈之內的敵人一起受傷、踉蹌片刻。屬土，剋水；接在火系招式之後是相生。',
  },
  sweep: {
    name: '掃腿', school: '體修', el: '土', aim: 'around', mp: 0, cd: 5, cast: 0.16, radius: 58, mult: 0.6, stun: 0.9, fx: 'sweep', realm: 0,
    learn: ['wild_boxing'], gengu: 6,
    desc: '鄉下打架的絆子，一腿掃一圈，把身邊的都絆個踉蹌。不耗靈力。',
  },
  charge: {
    name: '衝撞', school: '體修', el: '土', aim: 'dash', mp: 0, cd: 6, cast: 0.08, range: 170, width: 30, mult: 1.3, stun: 1.2, push: 60, first: true, fx: 'charge', realm: 0,
    gengu: 7,
    mastery: [[4, { stun: 1.8 }]],
    desc: '一肩撞過去：撞上的第一個被撞飛出去，半天爬不起來。不耗靈力。',
  },
  iron: {
    name: '金剛', school: '體修', el: '金', aim: 'self', mp: 0, cd: 16, cast: 0.2, ward: 0.5, last: 4, fx: 'iron', realm: 0,
    gengu: 8,
    desc: '一口氣沉下去，渾身筋骨繃得像鐵，四息之內受的傷減半。不耗靈力。',
  },
  mirror: {
    name: '照妖', school: '法器', aim: 'line', mp: 10, cd: 8, cast: 0.15, range: 300, width: 36, speed: 900, mult: 0.7, pierce: true, stun: 1.2, holy: true, fx: 'mirror',
    relic: 'zhaoyao_mirror',
    desc: '照妖鏡一照，一道鏡光直直射出：照到的都踉蹌；鬼物陰魂被照中，傷得最重。',
  },
  bell: {
    name: '金鐘', school: '法器', el: '金', aim: 'around', mp: 14, cd: 14, cast: 0.1, radius: 92, mult: 0.5, stun: 0.8, push: 50, shield: 0.25, last: 4, fx: 'bell',
    relic: 'zijin_bell',
    desc: '紫金鈴一搖：身邊的都被震開、踉蹌，一層金光護住你四息。',
  },
};

/** The order a set left to choose itself fills its places in (world/skills.js): the first of these you can use. */
export const KIT_ORDER = ['feijian', 'swordqi', 'fireball', 'frost', 'thunder', 'dici', 'guard', 'foxfire', 'vine', 'swordstep', 'jianzhen', 'charge', 'sweep', 'mend', 'iron', 'qi'];

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
 *          (count of them at once, fanned spread apart — in radians)
 *   'ring' a blow all round it, radius wide; push: how far it throws whoever it catches
 *   'zone' the ground where you stand (min to max off) bursts, radius wide (count of them: the rest
 *          spread about you); pool: what it leaves there
 *   'call' it calls others to it: call { kind, n, max (at once), share (of its strength), secs, line };
 *          first: how long into a fight before it first can
 *   'blink' gone from where it stood, and there, the other side of you (when you come within near;
 *          at: how far behind you it comes up, if not at its own distance)
 * mult: as a multiple of its plain blow. poison: [seconds, share of a blow each second] it leaves
 * in you; drain: the share of what it takes that it keeps as its own blood. fx: how the blow looks.
 * combo: it does it this many times running, each after the first gathered in again seconds.
 * pool: ground that hurts a while after — { secs, r, dps (share of a blow each second), kind:
 *   'venom' | 'fire' | 'blood', poison }; on a fan it lies along its reach.
 * trail: a rush that leaves the ground burning behind it ({ secs, width, dps }).
 * hold: a rush (or roots out of the ground: a zone) that, catching you, holds you fast — [seconds,
 *   share of a blow each half-second] (step aside to break free).
 * pool kind 'water': a whirlpool — it drags at your feet (you go slower while you stand in it).
 * fire: it is fire (what you wear against fire keeps some of it off).
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

  // ── bosses ──
  // 狼王: the king's spring, three times running; a howl that brings the pack
  kingpounce: { shape: 'leap', min: 90, max: 240, windup: 0.75, speed: 680, width: 40, overshoot: 40, recover: 1.1, cd: 9, mult: 1.5, combo: 3, again: 0.42 },
  packcall: { shape: 'call', windup: 1, recover: 0.6, cd: 16, first: 5, fx: 'howl', call: { kind: 'wolf', n: 2, max: 3, share: 0.3, line: '狼王一聲長嚎，林子裡又竄出了狼！' } },
  // 靈溪蟒: the tail all round it; venom spat where you stand (it lies there a while); coils
  tail: { shape: 'ring', radius: 80, windup: 0.8, recover: 0.8, cd: 5, mult: 1.4, push: 60, fx: 'ring' },
  spit: { shape: 'zone', min: 60, max: 280, radius: 44, windup: 0.9, recover: 0.6, cd: 4.5, mult: 0.9, fx: 'venom', pool: { secs: 5, r: 44, dps: 0.3, kind: 'venom', poison: [3, 0.12] } },
  spitrain: { shape: 'zone', min: 0, max: 300, radius: 40, windup: 1, recover: 0.7, cd: 8, mult: 0.9, count: 3, spread: 80, fx: 'venom', pool: { secs: 5, r: 40, dps: 0.3, kind: 'venom', poison: [3, 0.12] } },
  constrict: { shape: 'leap', min: 30, max: 160, windup: 0.7, speed: 520, width: 34, overshoot: 20, recover: 1, cd: 9, mult: 0.8, hold: [1.6, 0.35] },
  // 骷髏將軍: the halberd all the way round; the ground where you stand split open; a charge
  whirl: { shape: 'ring', radius: 92, windup: 0.95, recover: 0.9, cd: 6, mult: 1.8, push: 70, fx: 'ring' },
  smash: { shape: 'zone', min: 0, max: 260, radius: 62, windup: 1.05, recover: 0.8, cd: 5, mult: 2.1, fx: 'quake' },
  bonecharge: { shape: 'leap', min: 100, max: 280, windup: 0.9, speed: 560, width: 46, overshoot: 40, recover: 1.1, cd: 8, mult: 1.9 },
  // 血袍人: blood qi that drinks what it takes (three at once, later); a ring of blood about him
  bloodqi: { shape: 'shot', min: 60, max: 300, range: 340, windup: 0.6, speed: 380, width: 20, recover: 0.45, cd: 2.6, mult: 1.1, drain: 0.5, fx: 'bloodqi' },
  bloodfan: { shape: 'shot', min: 40, max: 300, range: 340, windup: 0.75, speed: 380, width: 20, recover: 0.5, cd: 6, mult: 1, drain: 0.5, count: 3, spread: 0.32, fx: 'bloodqi' },
  bloodring: { shape: 'ring', radius: 115, windup: 1, recover: 0.8, cd: 9, mult: 1.3, push: 40, drain: 0.6, fx: 'bloodring' },
  // 胡三娘: fox fire, three at once; gone from where she stood; shadows of herself
  foxvolley: { shape: 'shot', min: 50, max: 300, range: 330, windup: 0.6, speed: 330, width: 18, recover: 0.4, cd: 3.2, mult: 1, count: 3, spread: 0.3, fx: 'foxfire' },
  foxbolt: { shape: 'shot', min: 50, max: 280, range: 300, windup: 0.7, speed: 300, width: 16, recover: 0.5, cd: 3.4, mult: 1, fx: 'foxfire' },
  blink: { shape: 'blink', near: 90, windup: 0.3, recover: 0.3, cd: 6, fx: 'blink' },
  phantoms: { shape: 'call', windup: 0.9, recover: 0.5, cd: 18, first: 2, fx: 'blink', call: { kind: 'fox_phantom', phantom: true, n: 2, max: 2, share: 0.35, secs: 14, line: '白衣女子的身影一晃，分出了兩個一模一樣的她！' } },
  // 赤炎妖虎: claws, three in a row; a spring that leaves the ground burning; a roar that throws you
  // back; fire from its jaws
  fireclaw: { shape: 'fan', reach: 62, arc: 1.7, windup: 0.5, recover: 0.75, cd: 3.2, mult: 1.05, lunge: 12, fx: 'claw', combo: 3, again: 0.26 },
  firepounce: { shape: 'leap', min: 100, max: 250, windup: 0.75, speed: 660, width: 40, overshoot: 40, recover: 0.9, cd: 6.5, mult: 1.6, fire: true, trail: { secs: 3.5, width: 30, dps: 0.3 } },
  roar: { shape: 'ring', radius: 130, windup: 0.8, recover: 0.7, cd: 10, mult: 0.6, push: 110, fx: 'roar' },
  breath: { shape: 'fan', reach: 150, arc: 0.85, windup: 0.95, recover: 1, cd: 8, mult: 1.8, lunge: 0, fire: true, fx: 'breath', pool: { secs: 3, r: 30, dps: 0.3, kind: 'fire' } },

  // ── 0.16 ──
  // 山魈: a swipe of the long arms; the ground stamped where you stand; a rock thrown from afar
  apeswipe: { shape: 'fan', reach: 52, arc: 1.7, windup: 0.42, recover: 0.5, cd: 1.4, mult: 1.1, lunge: 10, fx: 'claw' },
  stomp: { shape: 'zone', min: 0, max: 110, radius: 54, windup: 0.85, recover: 0.7, cd: 5.5, mult: 1.5, fx: 'quake' },
  rockthrow: { shape: 'shot', min: 90, max: 280, range: 320, windup: 0.62, speed: 360, width: 22, recover: 0.5, cd: 3, mult: 1.15, fx: 'rock' },
  // 木魅: a lash of vines; roots up out of the ground where you stand, holding you fast (step aside to
  // break free); spores that hang in the air and sicken
  vinewhip: { shape: 'fan', reach: 66, arc: 1.2, windup: 0.5, recover: 0.6, cd: 1.8, mult: 1, lunge: 0, fx: 'grasp' },
  rootgrab: { shape: 'zone', min: 0, max: 240, radius: 40, windup: 1, recover: 0.6, cd: 6, mult: 0.7, fx: 'vines', hold: [1.6, 0.3] },
  sporecloud: { shape: 'zone', min: 40, max: 220, radius: 50, windup: 0.9, recover: 0.6, cd: 7, mult: 0.5, fx: 'venom', pool: { secs: 4, r: 50, dps: 0.25, kind: 'venom', poison: [3, 0.12] } },
  // 玄龜: a snap of the beak; water spat in jets (three, later five, fanned out); a whirlpool where you
  // stand that drags at your feet; a wave all round it
  shellbite: { shape: 'fan', reach: 58, arc: 1.3, windup: 0.6, recover: 0.7, cd: 2.2, mult: 1.5, lunge: 8, fx: 'bite' },
  jet: { shape: 'shot', min: 60, max: 300, range: 330, windup: 0.7, speed: 420, width: 20, recover: 0.5, cd: 3.2, mult: 1.05, count: 3, spread: 0.26, fx: 'water' },
  jetfan: { shape: 'shot', min: 50, max: 300, range: 330, windup: 0.8, speed: 420, width: 20, recover: 0.55, cd: 5, mult: 1, count: 5, spread: 0.24, fx: 'water' },
  whirlpool: { shape: 'zone', min: 0, max: 280, radius: 48, windup: 1, recover: 0.6, cd: 5.5, mult: 0.9, fx: 'whirl', pool: { secs: 4.5, r: 48, dps: 0.25, kind: 'water' } },
  whirlrain: { shape: 'zone', min: 0, max: 300, radius: 44, windup: 1.05, recover: 0.7, cd: 8.5, mult: 0.9, count: 3, spread: 90, fx: 'whirl', pool: { secs: 4.5, r: 44, dps: 0.25, kind: 'water' } },
  tide: { shape: 'ring', radius: 120, windup: 0.95, recover: 0.8, cd: 9, mult: 1.2, push: 90, fx: 'ring' },

  // ── 0.21 南嶺 ──
  // 瘴林毒蛛: a bite that leaves venom; a web flung where you stand, holding you fast (step aside to
  // break free); a spring from the branches
  spiderbite: { shape: 'fan', reach: 44, arc: 1.4, windup: 0.34, recover: 0.5, cd: 1.3, mult: 0.95, lunge: 12, fx: 'bite', poison: [3, 0.12] },
  web: { shape: 'zone', min: 50, max: 230, radius: 36, windup: 0.75, recover: 0.6, cd: 6.5, mult: 0.4, fx: 'web', hold: [1.2, 0.25] },
  spiderleap: { shape: 'leap', min: 70, max: 170, windup: 0.5, speed: 600, width: 26, overshoot: 24, recover: 0.7, cd: 5, mult: 1.3, poison: [3, 0.12] },
  // 毒沼巨蟾: the tongue, long and narrow, from further off than a bite; venom spat where you stand
  // (it lies there a while); a hop that comes down on you
  tongue: { shape: 'fan', reach: 96, arc: 0.45, windup: 0.42, recover: 0.45, cd: 1.5, mult: 1.05, lunge: 0, fx: 'tongue' },
  toadspit: { shape: 'zone', min: 60, max: 260, radius: 42, windup: 0.85, recover: 0.6, cd: 4.5, mult: 0.85, fx: 'venom', pool: { secs: 5, r: 42, dps: 0.28, kind: 'venom', poison: [3, 0.12] } },
  hopslam: { shape: 'leap', min: 80, max: 210, windup: 0.7, speed: 520, width: 40, overshoot: 20, recover: 0.95, cd: 5, mult: 1.6 },
  // 毒蟾王: venom spat all about you; two hops running; a croak that throws you back
  toadrain: { shape: 'zone', min: 0, max: 300, radius: 40, windup: 1, recover: 0.7, cd: 8, mult: 0.85, count: 4, spread: 90, fx: 'venom', pool: { secs: 5, r: 40, dps: 0.28, kind: 'venom', poison: [3, 0.12] } },
  kinghop: { shape: 'leap', min: 80, max: 240, windup: 0.75, speed: 560, width: 50, overshoot: 20, recover: 1, cd: 8, mult: 1.6, combo: 2, again: 0.5 },
  croak: { shape: 'ring', radius: 125, windup: 0.85, recover: 0.7, cd: 9, mult: 0.7, push: 100, fx: 'croak' },
  // 蠱蟲群: stings all round its front; a dart straight at you, that leaves venom
  sting: { shape: 'fan', reach: 40, arc: 2.2, windup: 0.38, recover: 0.55, cd: 1.5, mult: 0.75, lunge: 14, fx: 'punch' },
  swarmdart: { shape: 'leap', min: 60, max: 200, windup: 0.5, speed: 700, width: 30, overshoot: 30, recover: 0.6, cd: 5.5, mult: 1, poison: [2, 0.08] },
  // 蠱母: its jaws; a rush the length of the valley floor; venom sprayed out in front (it lies along
  // the ground after); its brood called out of its shell; under the ground, and up the other side of you
  centbite: { shape: 'fan', reach: 62, arc: 1.4, windup: 0.5, recover: 0.6, cd: 1.8, mult: 1.25, lunge: 14, fx: 'bite', poison: [3, 0.12] },
  centcharge: { shape: 'leap', min: 100, max: 280, windup: 0.8, speed: 640, width: 44, overshoot: 50, recover: 1, cd: 7, mult: 1.7 },
  venomspray: { shape: 'fan', reach: 140, arc: 0.7, windup: 0.9, recover: 0.9, cd: 8, mult: 1.2, lunge: 0, fx: 'spray', poison: [3, 0.12], pool: { secs: 4, r: 30, dps: 0.25, kind: 'venom', poison: [3, 0.1] } },
  broodcall: { shape: 'call', windup: 1, recover: 0.6, cd: 18, first: 3, fx: 'howl', call: { kind: 'swarm', n: 2, max: 2, share: 0.25, line: '蠱母的殼縫一張，兩團蠱蟲嗡地湧了出來！' } },
  burrow: { shape: 'blink', near: 70, at: 64, windup: 0.6, recover: 0.4, cd: 11, fx: 'burrow' },

  // ── 0.22 西漠 ──
  // 沙蠍: the pincers, two snaps running; the tail brought over its back and down on you (the venom
  // stays in you); a scuttle at you
  pincer: { shape: 'fan', reach: 50, arc: 1.5, windup: 0.36, recover: 0.5, cd: 1.5, mult: 0.85, lunge: 10, fx: 'claw', combo: 2, again: 0.24 },
  stinger: { shape: 'fan', reach: 66, arc: 0.6, windup: 0.62, recover: 0.6, cd: 4.2, mult: 1.35, lunge: 6, fx: 'sting', poison: [4, 0.14] },
  scuttle: { shape: 'leap', min: 70, max: 180, windup: 0.45, speed: 620, width: 28, overshoot: 22, recover: 0.6, cd: 5, mult: 1.2 },
  // 沙盜: a curved blade; sand flung in your eyes (slow: for a moment you stumble, half blind)
  sabre: { shape: 'fan', reach: 56, arc: 1.8, windup: 0.4, recover: 0.5, cd: 1.3, mult: 1.05, lunge: 10, fx: 'cut' },
  sandthrow: { shape: 'fan', reach: 92, arc: 0.9, windup: 0.5, recover: 0.5, cd: 6, mult: 0.5, lunge: 0, fx: 'sand', slow: 1.4 },
  // 禿鷲: his great curved blade, three cuts running; a whirl of sand all round him
  vulturecut: { shape: 'fan', reach: 66, arc: 2.2, windup: 0.55, recover: 0.7, cd: 3.4, mult: 1.15, lunge: 10, fx: 'cut', combo: 3, again: 0.3 },
  sandwhirl: { shape: 'ring', radius: 110, windup: 0.9, recover: 0.8, cd: 8, mult: 1.2, push: 70, fx: 'sandring', slow: 1.2 },
  // 乾屍: dust breathed out of a dead mouth, that sickens (and a clutch that drinks: grasp)
  dustbreath: { shape: 'fan', reach: 84, arc: 0.9, windup: 0.7, recover: 0.7, cd: 6, mult: 0.8, lunge: 0, fx: 'sand', poison: [3, 0.1] },
  // 枯禪: a palm of gold; beads flung, five at once; a roar like a lion's that throws you back; the dead
  // monks called up off their cushions
  zenpalm: { shape: 'fan', reach: 74, arc: 1.3, windup: 0.6, recover: 0.6, cd: 2.4, mult: 1.35, lunge: 14, fx: 'zen' },
  beads: { shape: 'shot', min: 50, max: 300, range: 330, windup: 0.65, speed: 400, width: 16, recover: 0.5, cd: 4.5, mult: 0.85, count: 5, spread: 0.22, fx: 'beads' },
  lionroar: { shape: 'ring', radius: 140, windup: 0.9, recover: 0.8, cd: 10, mult: 0.8, push: 120, fx: 'roar' },
  monkcall: { shape: 'call', windup: 1, recover: 0.6, cd: 20, first: 4, fx: 'howl', call: { kind: 'mummy', n: 2, max: 2, share: 0.3, line: '枯禪的唇動了動。殿裡的蒲團上，兩具乾屍慢慢站了起來。' } },
  // 沙蛟: its jaws; the tail swept all round it; sand spouting up where you stand; down into the sand
  // and up behind you; the sand about it turned to quicksand (it drags at your feet)
  jiaobite: { shape: 'fan', reach: 66, arc: 1.3, windup: 0.5, recover: 0.6, cd: 1.8, mult: 1.35, lunge: 16, fx: 'bite' },
  tailsweep: { shape: 'ring', radius: 96, windup: 0.85, recover: 0.8, cd: 6, mult: 1.5, push: 80, fx: 'sandring' },
  sandspout: { shape: 'zone', min: 0, max: 280, radius: 52, windup: 1, recover: 0.7, cd: 5, mult: 1.6, fx: 'sandspout' },
  sandsink: { shape: 'blink', near: 70, at: 70, windup: 0.6, recover: 0.4, cd: 10, fx: 'burrow' },
  quickpool: { shape: 'zone', min: 0, max: 300, radius: 46, windup: 1, recover: 0.7, cd: 8.5, mult: 0.6, count: 3, spread: 90, fx: 'sandspout', pool: { secs: 5, r: 46, dps: 0.15, kind: 'sand' } },
  // 石傀: a stone fist on a long stone arm (and the ground stamped where you stand: stomp; a head-down charge: bearcharge)
  stonefist: { shape: 'fan', reach: 66, arc: 1.4, windup: 0.6, recover: 0.7, cd: 2, mult: 1.4, lunge: 12, fx: 'punch' },
  // 石翁仲: the halberd swept wide; starlight from its eyes, straight at you; the ground split where you
  // stand (smash); the stone guards called up
  halberd: { shape: 'fan', reach: 84, arc: 2.4, windup: 0.7, recover: 0.9, cd: 3.6, mult: 1.6, lunge: 8, fx: 'cut' },
  starbeam: { shape: 'shot', min: 60, max: 340, range: 380, windup: 0.9, speed: 720, width: 26, recover: 0.6, cd: 5, mult: 1.45, fx: 'star' },
  stonecall: { shape: 'call', windup: 1.1, recover: 0.7, cd: 22, first: 6, fx: 'howl', call: { kind: 'stone_puppet', n: 2, max: 2, share: 0.3, line: '石翁仲把戟往地上一頓。兩旁的石傀，眼裡亮起了光。' } },
};
