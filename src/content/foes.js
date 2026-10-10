// 敵人: what you fight, and how it fights. A fight's strength comes from
// the difficulty its event always asked of you (the 戰力 of the old check),
// spread over whoever stands against you, so the odds the stories were
// written for still hold: an even match is an even fight.

/**
 * name: what it is called on the field
 * draw: how it is painted — a beast ('wolf', 'snake', …), 'person:<look>' or 'npc:<id>'
 * range: 'melee' fights up close; 'ranged' strikes from anywhere on the field
 * spd: 身法 (who acts first, and how often)
 * worth: how much a point of its power is worth in a fight (its skills, its speed),
 *   found by simulation so that an even match is an even fight
 * pack: worth again, by how many fight together (a pack fights as one)
 * hp, atk, def: shape of its strength (1 = an ordinary foe of its power; tough or fierce, not stronger)
 * skills: what it does besides a plain attack (see battle.js)
 * spirit: a thing of spirit — blades bite it less; fire, fox fire and talismans bite it fully
 * mortal: no 靈力 at all
 * boss: a fight of its own (harder to run from; more to learn from)
 * loot: [[chance, item, count]] if you win
 * says: how it strikes, in the battle's narration
 * rt: how it fights in real time (即時戰鬥, see world/combat.js) —
 *   tier: its 境界 (1 一階 = a match for 煉氣, 2 二階 = 築基, …); a higher tier than yours presses down on you
 *   speed: running (world units a second; you walk about 160 in 煉氣), walk: ambling about its ground
 *   sight: how far off it sees you; lose: how far you must get to slip it (for loseT seconds);
 *   leash: how far from home it will chase; body: its size for blows; bulk: thick wood slows it this much more than you
 *   tall: how high its head stands (for marks over it); notice: how long it stares before it comes
 *   moves: what it does (content/moves.js); hop: after a bite, how often it springs back out of reach;
 *   howl: below this share of its blood it howls and turns savage
 */
export const FOES = {
  wolf: {
    name: '灰狼', worth: 1.12, pack: [1, 1, 1.03, 1.4, 1.6], draw: 'wolf', range: 'melee', spd: 17, hp: 0.85, atk: 1, def: 0.7,
    skills: ['pounce', 'howl'], loot: [[0.5, 'wolf_pelt', 1]], says: ['撲了上來', '一口咬住'],
  },
  demon_wolf: {
    name: '妖狼', worth: 1.05, pack: [1, 1, 1.13, 1.5], draw: 'demon_wolf', range: 'melee', spd: 16, hp: 1.25, atk: 1.05, def: 1,
    skills: ['pounce', 'rend'], loot: [[0.7, 'beast_core', 1], [0.8, 'wolf_pelt', 1]], says: ['撲了上來', '血口一張'],
    rt: {
      tier: 1, speed: 176, walk: 58, sight: 240, lose: 470, loseT: 1.4, leash: 900, body: 15, bulk: 1.4, tall: 26,
      notice: 0.55, moves: ['bite', 'pounce'], hop: 0.45, howl: 0.5, night: 1.3, noon: 0.75,
    },
  },
  wolf_king: {
    name: '狼王', worth: 1.11, draw: 'wolf_king', range: 'melee', spd: 16, hp: 1.5, atk: 1.1, def: 1.2, boss: true,
    skills: ['pounce', 'rend', 'kinghowl'], loot: [[1, 'wolf_pelt', 2]], says: ['撲了上來', '巨口咬下'],
  },
  snake: {
    name: '青鱗蛇', worth: 1.1, draw: 'snake', range: 'melee', spd: 19, hp: 0.75, atk: 1, def: 0.9,
    skills: ['venom'], loot: [[0.6, 'snake_gall', 1]], says: ['竄了過來', '一口咬下'],
  },
  python: {
    name: '靈溪蟒', worth: 0.59, draw: 'python', range: 'melee', spd: 11, hp: 1.55, atk: 1.1, def: 1.35, boss: true,
    skills: ['constrict', 'venom_breath'], says: ['甩尾橫掃', '張口咬來'],
  },
  bear: {
    name: '鐵背熊', worth: 0.46, draw: 'bear', range: 'melee', spd: 9, hp: 1.5, atk: 1.25, def: 1.3,
    skills: ['maul'], loot: [[0.6, 'beast_core', 1]], says: ['一掌拍下', '人立而起'],
  },
  bandit: {
    name: '山賊', worth: 0.59, draw: 'bandit', range: 'melee', spd: 12, hp: 1, atk: 1, def: 1,
    skills: [], says: ['一刀砍來', '掄刀便劈'],
  },
  bandit_chief: {
    name: '獨眼龍', worth: 0.78, draw: 'bandit', range: 'melee', spd: 13, hp: 1.3, atk: 1.15, def: 1.1,
    skills: ['heavy'], says: ['掄起大刀', '一刀劈下'],
  },
  masked: {
    name: '蒙面人', worth: 0.68, draw: 'person:thief', range: 'melee', spd: 13, hp: 1, atk: 1, def: 0.9,
    skills: [], says: ['一刀刺來', '欺身而上'],
  },
  thug: {
    name: '地痞', worth: 0.49, draw: 'person:villager', range: 'melee', spd: 10, hp: 1, atk: 0.9, def: 0.6, mortal: true,
    skills: [], says: ['一拳打來', '撲了上來'],
  },
  cultivator: {
    name: '修士', worth: 0.74, draw: 'person:foe', range: 'melee', spd: 14, hp: 1, atk: 1, def: 1,
    skills: ['swordqi', 'guard'], says: ['一劍刺來', '劍光一閃'],
  },
  enforcer: {
    name: '執法弟子', worth: 0.83, draw: 'person:disciple', range: 'melee', spd: 14, hp: 1, atk: 1, def: 1.1,
    skills: ['swordqi'], says: ['一劍刺來', '劍光一閃'],
  },
  blood_robe: {
    name: '血袍人', worth: 1.09, draw: 'person:foe', range: 'melee', spd: 15, hp: 1.3, atk: 1.15, def: 1.1, boss: true,
    skills: ['swordqi', 'drain'], says: ['一掌拍來', '血光一閃'],
  },
  swordsman: {
    name: '武人', worth: 0.7, draw: 'person:sanxiu', range: 'melee', spd: 18, hp: 0.9, atk: 1.1, def: 0.8, mortal: true,
    skills: [], says: ['一招遞來', '欺身而上'],
  },
  escort: {
    name: '鏢師', worth: 0.6, draw: 'person:guard', range: 'melee', spd: 12, hp: 1.1, atk: 0.9, def: 1,
    skills: [], says: ['一刀砍去', '大喝一聲'],
  },
  ghost: {
    name: '殘魂', worth: 1.52, draw: 'ghost', range: 'ranged', spd: 15, hp: 0.9, atk: 1, def: 0.2, spirit: true,
    skills: ['drain'], says: ['飄了過來', '一爪抓向你的心口'],
  },
  skeleton: {
    name: '骷髏將軍', worth: 0.36, draw: 'skeleton', range: 'melee', spd: 8, hp: 1.8, atk: 1.25, def: 1.5, boss: true,
    skills: ['sweep'], loot: [[1, 'beast_core', 1]], says: ['斷戟橫掃', '一戟劈下'],
  },
  fox_spirit: {
    name: '胡三娘', worth: 2.15, draw: 'npc:hu_sanniang', range: 'ranged', spd: 21, hp: 1.1, atk: 1.1, def: 0.8, boss: true,
    skills: ['foxfire', 'blink'], says: ['袖子一拂', '狐火一閃'],
  },
};

/**
 * How strong each of a group should be, so that the group as a whole asks
 * what the story asked: alone, the full difficulty; in a pack, less each.
 */
export const GROUP_SHARE = [0, 1, 0.552, 0.393, 0.266, 0.223];
