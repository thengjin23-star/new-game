// 即時戰鬥的招式：你的普攻、法術、閃避，和敵人的撲咬、刀劍、暗算。
//
// aim — how a move is aimed:
//   'melee'  a swing in front of you: reach (world units), arc (radians, the whole fan)
//   'line'   flies straight out: range, width, speed; pierce: through everyone it meets
//   'ground' flies to a spot on the ground and bursts there: range, radius, speed
//   'self'   on yourself
// mp: 靈力 it costs; cd: seconds before it can be used again; cast: seconds of
// casting before it goes off (you move slowly meanwhile); mult: damage as a
// multiple of a plain blow. better: what it becomes once you have learned the
// art it comes from (arts: 功法 that strengthen it).

/** Your plain blow, by what you hold. every: seconds between blows. */
export const STRIKES = {
  fists: { name: '拳腳', aim: 'melee', reach: 42, arc: 1.9, every: 0.45, windup: 0.08, mult: 0.75, fx: 'punch' },
  chaidao: { name: '劈砍', aim: 'melee', reach: 54, arc: 2.2, every: 0.6, windup: 0.11, mult: 1, fx: 'slash' },
  qinggang_sword: { name: '劍擊', aim: 'melee', reach: 62, arc: 2, every: 0.5, windup: 0.09, mult: 1.1, fx: 'slash' },
  hunting_bow: { name: '射箭', aim: 'line', range: 380, width: 8, speed: 720, every: 0.8, windup: 0.16, mult: 0.9, fx: 'arrow' },
};

/** The three a cultivator can call on (煉氣 and up), and the step aside anyone can take. */
export const MOVES = {
  swordqi: {
    name: '劍氣', key: '1', aim: 'line', mp: 6, cd: 3, cast: 0.12, range: 300, width: 20, speed: 560, mult: 1.6, pierce: true, fx: 'swordqi',
    arts: ['qingyuan_sword', 'qingyun'], better: { mult: 2, range: 360 },
    desc: '一道劍氣直直斬出，穿過途中所有敵人。',
  },
  fireball: {
    name: '火球', key: '2', aim: 'ground', mp: 8, cd: 5, cast: 0.28, range: 290, radius: 64, speed: 430, mult: 1.4, burn: 3, fx: 'fire',
    arts: ['lieyan', 'fox_fire'], better: { mult: 1.8, radius: 76 },
    desc: '火球飛向落點，炸開一片，燒著的敵人還會再灼傷一陣。',
  },
  guard: {
    name: '護體', key: '3', aim: 'self', mp: 10, cd: 12, cast: 0, shield: 0.3, last: 5, fx: 'shield',
    arts: ['xuanshui'], better: { shield: 0.45 },
    desc: '靈力護住周身，擋下一部分傷害，維持五秒。',
  },
};

/** 閃避: a quick step aside, untouchable while it lasts. */
export const DASH = { name: '閃避', dist: 120, time: 0.18, inv: 0.24, cd: 2.2 };

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
  // 殘魂: a slow bolt of cold that drinks what it takes; a clutch at your heart
  soul: { shape: 'shot', min: 40, max: 260, range: 300, windup: 0.62, speed: 230, width: 22, recover: 0.5, cd: 2.4, mult: 1, drain: 0.5, fx: 'soul' },
  grasp: { shape: 'fan', reach: 50, arc: 1.6, windup: 0.5, recover: 0.6, cd: 2, mult: 1.1, lunge: 16, drain: 0.5, fx: 'grasp' },
};
