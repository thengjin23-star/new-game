// 敵人: what you fight, and how it fights. A fight's strength comes from
// the difficulty its event always asked of you (the 戰力 of the old check),
// spread over whoever stands against you, so the odds the stories were
// written for still hold: an even match is an even fight.

/**
 * name: what it is called
 * hp, atk: shape of its strength (1 = an ordinary foe of its power; tough or fierce, not stronger)
 * spirit: a thing of spirit — blades bite it less; fire, fox fire and talismans bite it fully
 * el: what it is of the 五行 (content/wuxing.js): a move of the element that overcomes it bites deeper
 * boss: a fight of its own (more to learn from)
 * loot: [[chance, item, count]] if you win
 * rt: how it fights (即時戰鬥, see world/combat.js) —
 *   tier: its 境界 (1 一階 = a match for 煉氣, 2 二階 = 築基, …); a higher tier than yours presses down on you
 *   person: a person, not a beast (named by realm: 凡人, 煉氣…); rank: the realm to name, if it is known;
 *     look, weapon: how a person is drawn (a look from art/scenery.js, what they hold)
 *   speed: running (world units a second; you walk about 160 in 煉氣), walk: ambling about its ground
 *   sight: how far off it sees you (night, noon, day: by how much more or less then);
 *   lose: how far you must get to slip it (for loseT seconds); leash: how far from home it will chase
 *   body: its size for blows; bulk: thick wood slows it this much more than you; tall: how high its head stands
 *   notice: how long it stares before it comes
 *   moves: what it does (content/moves.js), tried in that order; hop: after a blow up close, how often it
 *     springs back out of reach; howl: below this share of its blood it howls and turns savage
 *   share: how strong each of a group is, against the usual share (by simulation)
 *   keep: [near, far] — it fights from this far off (falling back if you close in)
 *   tokens: how many of a group go at you at once (the rest circle at ring, waiting their turn)
 *   pack: it runs once more than half the pack is down; mourn: one falls, and the rest turn savage
 *   flee / yield: below this share of its blood it runs for it, or throws down its blade and begs
 *   ambush: it lies hidden until you come close, and strikes first
 *   talk: it comes up to have a word first (its event), from this far off
 *   warn: what you hear before it comes; cry: what you see as it does; scared: what it does instead
 *     when you are far too much for it ([alone, a group]); broke: when a group gives up
 *   phases (a boss): worn down to a share of its blood (at), it roars and fights another way —
 *     moves: what it does from then on; enrage: in a rage (quicker, harder); line: what you see
 */
export const FOES = {
  wolf: {
    name: '灰狼', el: '木', hp: 0.85, atk: 1, loot: [[0.5, 'wolf_pelt', 1]],
    rt: {
      share: 1.3, tier: 0, speed: 166, walk: 50, sight: 210, lose: 420, loseT: 1.4, leash: 760, body: 11, bulk: 1.25, tall: 19,
      notice: 0.45, moves: ['nip', 'lunge'], hop: 0.4, night: 1.25, noon: 0.7, pack: true, mourn: true, tokens: 2, ring: 100,
      warn: '遠處傳來狼嚎。', cry: '狼！', scared: ['那頭狼夾著尾巴跑了。', '狼群夾著尾巴跑了。'], broke: '剩下的狼夾著尾巴跑了。',
    },
  },
  demon_wolf: {
    name: '妖狼', el: '木', hp: 1.25, atk: 1.05, loot: [[0.7, 'beast_core', 1], [0.8, 'wolf_pelt', 1]],
    rt: {
      tier: 1, speed: 176, walk: 58, sight: 240, lose: 470, loseT: 1.4, leash: 900, body: 15, bulk: 1.4, tall: 26,
      notice: 0.55, moves: ['bite', 'pounce'], hop: 0.45, howl: 0.5, night: 1.3, noon: 0.75,
    },
  },
  wolf_king: {
    name: '狼王', el: '木', hp: 1.5, atk: 1.1, boss: true, loot: [[1, 'wolf_pelt', 2]],
    rt: {
      tier: 1, speed: 190, walk: 50, sight: 300, lose: 520, loseT: 1.6, leash: 1000, body: 20, bulk: 1.6, tall: 36,
      notice: 0.6, moves: ['bite', 'pounce', 'packcall'], hop: 0.3, cry: '狼王仰起頭，一聲長嚎震得樹葉簌簌直落！',
      phases: [
        { at: 0.6, moves: ['bite', 'kingpounce', 'packcall'], line: '狼王弓起了背，眼裡透出凶光——牠要一撲接著一撲了！' },
        { at: 0.3, enrage: true, line: '狼王仰天長嚎，渾身的毛都豎了起來——牠發狂了！' },
      ],
    },
  },
  snake: {
    name: '青鱗蛇', el: '木', hp: 0.75, atk: 1, loot: [[0.6, 'snake_gall', 1]],
    rt: {
      tier: 0, speed: 84, walk: 0, sight: 78, lose: 170, loseT: 1.2, leash: 240, body: 9, bulk: 0.8, tall: 14,
      notice: 0, moves: ['strike'], ambush: true, night: 0.7,
      warn: '草叢裡沙沙作響。', cry: '草叢裡竄出一條青鱗蛇！', scared: ['那條蛇一扭身，鑽進了石縫。', '那幾條蛇一扭身，鑽進了石縫。'],
    },
  },
  python: {
    name: '靈溪蟒', el: '水', hp: 1.55, atk: 1.1, boss: true,
    rt: {
      tier: 1, speed: 105, walk: 30, sight: 260, lose: 400, loseT: 1.6, leash: 700, body: 22, bulk: 0.9, tall: 30,
      notice: 0.6, moves: ['tail', 'bite', 'spit'], cry: '大蟒昂起頭，豎瞳死死盯住了你！',
      phases: [
        { at: 0.55, moves: ['tail', 'bite', 'constrict', 'spitrain'], line: '大蟒吃痛，毒涎四濺，身子一圈圈盤了起來！' },
        { at: 0.25, enrage: true, line: '靈溪蟒狂怒地翻騰起來，攪得溪水都渾了！' },
      ],
    },
  },
  bear: {
    name: '鐵背熊', el: '土', hp: 1.5, atk: 1.25, loot: [[0.6, 'beast_core', 1]],
    rt: {
      tier: 1, speed: 150, walk: 40, sight: 220, lose: 420, loseT: 1.5, leash: 800, body: 18, bulk: 1.5, tall: 30,
      notice: 0.5, moves: ['maul', 'bearcharge'],
    },
  },
  bandit: {
    name: '山賊', hp: 1, atk: 1,
    rt: {
      share: 1.5, tier: 0, person: true, speed: 150, walk: 40, sight: 230, lose: 400, loseT: 1.5, leash: 700, body: 10, tall: 37,
      notice: 0.5, moves: ['slash', 'rush'], night: 1.15, tokens: 2, ring: 92, talk: 80,
      warn: '林子裡有人在低聲說話。', cry: '有人衝了過來！', scared: ['那人看了你一眼，扭頭就跑。', '那幾個人看了你一眼，扭頭就跑。'], broke: '剩下的人見勢不妙，扭頭就跑。',
    },
  },
  bandit_chief: {
    name: '獨眼龍', hp: 1.3, atk: 1.15,
    rt: {
      share: 1.5, tier: 1, person: true, rank: '煉氣四層', speed: 146, walk: 36, sight: 230, lose: 400, loseT: 1.5, leash: 700, body: 12, bulk: 1.1, tall: 39,
      notice: 0.5, moves: ['cleave', 'slash'], night: 1.15, tokens: 2, ring: 80, yield: 0.2, talk: 80,
      warn: '林子裡有人在低聲說話。', cry: '獨眼龍一揮手：「上！」', scared: ['那人看了你一眼，扭頭就跑。', '那幾個人看了你一眼，扭頭就跑。'], broke: '剩下的人見勢不妙，扭頭就跑。',
    },
  },
  masked: {
    name: '蒙面人', hp: 1, atk: 1,
    rt: {
      share: 1.3, tier: 0, person: true, look: 'thief', weapon: 'chaidao', speed: 152, walk: 40, sight: 230, lose: 400, loseT: 1.5, leash: 700,
      body: 10, tall: 37, notice: 0.4, moves: ['slash', 'rush'], tokens: 2, ring: 90, flee: 0.25, broke: '剩下的蒙面人見勢不妙，扭頭就跑。',
    },
  },
  thug: {
    name: '地痞', hp: 1, atk: 0.9,
    rt: {
      share: 1.4, tier: 0, person: true, look: 'villager', weapon: 'fists', speed: 140, walk: 40, sight: 200, lose: 380, loseT: 1.5, leash: 600,
      body: 10, tall: 37, notice: 0.4, moves: ['punch'], tokens: 2, ring: 80, flee: 0.3, broke: '剩下的跟班一哄而散。',
    },
  },
  cultivator: {
    name: '修士', hp: 1, atk: 1,
    rt: {
      share: 1.25, tier: 1, person: true, look: 'foe', speed: 176, walk: 40, sight: 240, lose: 380, loseT: 1.4, leash: 650, body: 10, tall: 37,
      notice: 0.4, moves: ['slash', 'qi'], keep: [130, 230], flee: 0.3, talk: 80,
      cry: '{name}冷笑一聲，劍已出鞘。', scared: ['那人看了你一眼，扭頭就跑。', '那幾個人看了你一眼，扭頭就跑。'],
    },
  },
  enforcer: {
    name: '執法弟子', hp: 1, atk: 1,
    rt: {
      share: 1.2, tier: 1, person: true, look: 'disciple', weapon: 'qinggang_sword', speed: 170, walk: 40, sight: 240, lose: 400, loseT: 1.5, leash: 700,
      body: 10, tall: 37, notice: 0.4, moves: ['slash', 'qi'], tokens: 2, ring: 100, flee: 0.25, broke: '剩下的弟子不敢戀戰，退走了。',
    },
  },
  blood_robe: {
    name: '血袍人', hp: 1.3, atk: 1.15, boss: true,
    rt: {
      tier: 1, person: true, look: 'foe', weapon: 'fists', speed: 182, walk: 40, sight: 280, lose: 460, loseT: 1.6, leash: 900, body: 11, tall: 37,
      notice: 0.4, moves: ['grasp', 'bloodqi'], keep: [110, 210], cry: '血袍人的袖子一抖，一股血腥氣撲面而來！',
      phases: [
        { at: 0.5, moves: ['bloodring', 'grasp', 'bloodfan', 'bloodqi'], line: '血袍人渾身血氣翻湧，周身亮起一圈血光！' },
        { at: 0.25, enrage: true, line: '血袍人咬破舌尖，一口血霧噴出——他拚命了！' },
      ],
    },
  },
  swordsman: {
    name: '武人', hp: 0.9, atk: 1.1,
    rt: {
      tier: 0, person: true, look: 'sanxiu', weapon: 'qinggang_sword', speed: 178, walk: 40, sight: 240, lose: 400, loseT: 1.5, leash: 700,
      body: 10, tall: 37, notice: 0.3, moves: ['slash', 'rush'], hop: 0.5,
    },
  },
  escort: {
    name: '鏢師', hp: 1.1, atk: 0.9,
    rt: {
      tier: 0, person: true, look: 'guard', weapon: 'chaidao', speed: 150, walk: 40, sight: 230, lose: 400, loseT: 1.5, leash: 700,
      body: 10, tall: 37, notice: 0.4, moves: ['slash', 'rush'], flee: 0.25,
    },
  },
  ghost: {
    name: '殘魂', hp: 0.9, atk: 1, spirit: true,
    rt: {
      share: 1.15, tier: 1, speed: 118, walk: 26, sight: 170, lose: 360, loseT: 1.6, leash: 600, body: 10, bulk: 0.6, tall: 41,
      notice: 0.6, moves: ['grasp', 'soul'], keep: [100, 210], night: 1.5, day: 0.6, talk: 90,
      warn: '一陣陰風吹過，你打了個寒顫。', cry: '殘魂嘶吼著撲了過來！', scared: ['那道影子一顫，散進了風裡。', '那些影子一顫，散進了風裡。'],
    },
  },
  skeleton: {
    name: '骷髏將軍', el: '金', hp: 1.8, atk: 1.25, boss: true, loot: [[1, 'beast_core', 1]],
    rt: {
      tier: 1, speed: 118, walk: 30, sight: 260, lose: 420, loseT: 1.6, leash: 800, body: 15, bulk: 1.3, tall: 70,
      notice: 0.6, moves: ['whirl', 'cleave', 'bonecharge'], cry: '骷髏將軍的眼眶裡燃起兩點鬼火，斷戟一橫！',
      phases: [
        { at: 0.5, moves: ['whirl', 'cleave', 'smash', 'bonecharge'], line: '骷髏將軍把斷戟往地上一頓——大地裂開了！' },
        { at: 0.25, enrage: true, line: '骷髏將軍眼中的鬼火暴漲，渾身骨節咯咯作響！' },
      ],
    },
  },
  fox_spirit: {
    name: '胡三娘', el: '火', hp: 1.1, atk: 1.1, boss: true,
    rt: {
      tier: 1, person: true, look: 'foe', weapon: 'fists', speed: 190, walk: 40, sight: 300, lose: 480, loseT: 1.6, leash: 900, body: 10, tall: 37,
      notice: 0.4, moves: ['blink', 'grasp', 'foxvolley'], keep: [120, 230], flee: 0.2, cry: '白衣女子笑了一聲，指尖燃起一朵藍火。',
      phases: [{ at: 0.55, moves: ['blink', 'phantoms', 'grasp', 'foxvolley'], line: '白衣女子輕笑一聲，身影晃了晃。' }],
    },
  },
  // 胡三娘 made twice over: shadows of her that cast fox fire and go to nothing at a touch
  fox_phantom: {
    name: '狐影', el: '火', hp: 0.5, atk: 0.8,
    rt: {
      tier: 1, person: true, look: 'foe', weapon: 'fists', speed: 170, walk: 40, sight: 300, lose: 600, loseT: 3, leash: 2000, body: 10, tall: 37,
      notice: 0, moves: ['foxbolt', 'grasp'], keep: [110, 220],
    },
  },
  // 古戰場北緣的焦土上: a tiger of fire. Worn down, it roars and breathes flame; near the end, in a rage
  fire_tiger: {
    name: '赤炎妖虎', el: '火', hp: 1.6, atk: 1.2, boss: true, loot: [[1, 'beast_core', 2], [1, 'fire_tiger_pelt', 1]],
    rt: {
      tier: 1, speed: 196, walk: 46, sight: 250, lose: 520, loseT: 1.8, leash: 900, body: 22, bulk: 1.5, tall: 38,
      notice: 0.7, moves: ['fireclaw', 'firepounce'], hop: 0.2,
      phases: [
        { at: 0.66, moves: ['roar', 'fireclaw', 'breath', 'firepounce'], line: '赤炎妖虎渾身騰起烈焰，一聲咆哮震得你耳中嗡嗡作響！' },
        { at: 0.33, enrage: true, line: '赤炎妖虎的皮毛燒得通紅——牠發狂了！' },
      ],
      warn: '空氣裡一股焦糊味，地上的草全都枯黃了。', cry: '赤炎妖虎一聲咆哮，從焦土上撲了過來！',
      scared: ['那頭大虎看了你一眼，慢慢走開了。', '那頭大虎看了你一眼，慢慢走開了。'],
    },
  },
  // ── 0.16 ──
  // 古戰場西邊的亂石地: imps of the mountain, a pair of them, throwing rocks
  shanxiao: {
    name: '山魈', el: '土', hp: 1.1, atk: 1.05, loot: [[0.45, 'beast_core', 1]],
    rt: {
      share: 1.35, tier: 1, speed: 160, walk: 44, sight: 230, lose: 430, loseT: 1.5, leash: 740, body: 13, bulk: 1.1, tall: 30,
      notice: 0.5, moves: ['apeswipe', 'stomp', 'rockthrow'], hop: 0.35, pack: true, tokens: 2, ring: 110,
      warn: '亂石堆裡有石頭滾下來，還有一陣尖細的笑聲。', cry: '山魈從石頭後面跳了出來，手裡抓著石頭！',
      scared: ['那隻山魈尖叫一聲，竄上了山崖。', '那兩隻山魈尖叫著，竄上了山崖。'], broke: '剩下的山魈尖叫著逃上了山崖。',
    },
  },
  // 黑風林深處，只在夜裡: a dead tree that is not dead
  mumei: {
    name: '木魅', el: '木', hp: 1.05, atk: 1, spirit: true, loot: [[0.6, 'ningqi_grass', 2], [0.35, 'blood_ginseng', 1]],
    rt: {
      tier: 1, speed: 118, walk: 0, sight: 150, lose: 360, loseT: 1.4, leash: 480, body: 13, bulk: 0.6, tall: 36,
      notice: 0.3, moves: ['vinewhip', 'rootgrab', 'sporecloud'], night: 1.2,
      warn: '林子裡的樹，好像在你背後動了一下。', cry: '一棵枯樹忽然睜開了眼睛——是木魅！',
      scared: ['那東西縮回了樹影裡。', '那些東西縮回了樹影裡。'],
    },
  },
  // 鏡湖東岸: the old black tortoise of the lake, as big as a millstone
  xuan_turtle: {
    name: '玄龜', el: '水', hp: 1.75, atk: 1.15, boss: true, loot: [[1, 'beast_core', 2], [1, 'turtle_shell', 1]],
    rt: {
      tier: 1, speed: 96, walk: 16, sight: 170, lose: 420, loseT: 1.6, leash: 460, body: 24, bulk: 0.8, tall: 30,
      notice: 0.8, moves: ['shellbite', 'jet', 'whirlpool'],
      phases: [
        { at: 0.6, moves: ['shellbite', 'jetfan', 'whirlrain', 'tide'], line: '玄龜縮頸一吼，背後的湖水跟著翻了起來！' },
        { at: 0.28, enrage: true, line: '玄龜的背甲上泛起一層黑光——牠發狂了！' },
      ],
      warn: '湖面上一圈一圈的漣漪，像有什麼大東西在水底下翻身。', cry: '湖水嘩地分開，一隻磨盤大的玄龜爬上了岸！',
      scared: ['那隻大龜慢慢沉回了湖底。', '那隻大龜慢慢沉回了湖底。'],
    },
  },
};
