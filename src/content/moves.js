// 即時戰鬥的招式：你的普攻、法術、閃避，和妖獸的撲咬。
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
 * A beast's moves. Every one is seen coming: windup is how long it gathers
 * itself (its mark on the ground filling) before it strikes; recover is how
 * long it stands open afterwards — your moment.
 */
export const BEAST_MOVES = {
  // 撕咬: a short lunge with the jaws, a fan in front of it
  bite: { reach: 54, arc: 1.5, windup: 0.4, recover: 0.45, cd: 1.15, mult: 1, lunge: 12 },
  // 撲擊: crouch, then a long straight leap — a line on the ground
  pounce: { min: 95, max: 235, windup: 0.72, speed: 640, width: 36, overshoot: 46, recover: 0.85, cd: 5.5, mult: 1.8 },
};
