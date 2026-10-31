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
 *   (0.20, how it takes a blow — world/combat.js:)
 *   low: { at, mode, line } — worn down to a share of its blood, it fights another way: rage
 *     (quicker, harder), wary (keeps its distance, springs back after every blow, sees your shots
 *     coming more often). A pack has its own ways already (mourn, pack).
 *   dodge: how often it sees a shot of yours coming in time, and springs aside
 *   poise: seconds before a blow can check it again (a heavy beast: longer; a boss is never checked)
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
      notice: 0.5, moves: ['maul', 'bearcharge'], poise: 1.8,
      low: { at: 0.3, mode: 'rage', line: '鐵背熊人立而起，一聲怒吼，紅著眼撲了上來！' },
    },
  },
  bandit: {
    name: '山賊', hp: 1, atk: 1,
    rt: {
      share: 1.5, tier: 0, person: true, speed: 150, walk: 40, sight: 230, lose: 400, loseT: 1.5, leash: 700, body: 10, tall: 37,
      notice: 0.5, moves: ['slash', 'rush'], night: 1.15, tokens: 2, ring: 92, talk: 80,
      low: { at: 0.3, mode: 'rage', line: '{name}紅了眼，揮著刀亂砍過來！' },
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
      notice: 0.4, moves: ['slash', 'qi'], keep: [130, 230], flee: 0.3, talk: 80, dodge: 0.35,
      cry: '{name}冷笑一聲，劍已出鞘。', scared: ['那人看了你一眼，扭頭就跑。', '那幾個人看了你一眼，扭頭就跑。'],
    },
  },
  enforcer: {
    name: '執法弟子', hp: 1, atk: 1,
    rt: {
      share: 1.2, tier: 1, person: true, look: 'disciple', weapon: 'qinggang_sword', speed: 170, walk: 40, sight: 240, lose: 400, loseT: 1.5, leash: 700,
      body: 10, tall: 37, notice: 0.4, moves: ['slash', 'qi'], tokens: 2, ring: 100, flee: 0.25, dodge: 0.3, broke: '剩下的弟子不敢戀戰，退走了。',
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
      body: 10, tall: 37, notice: 0.3, moves: ['slash', 'rush'], hop: 0.5, dodge: 0.3,
      low: { at: 0.35, mode: 'wary', line: '{name}退開半步，換了個架勢，盯著你的破綻。' },
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
      notice: 0, moves: ['foxbolt', 'grasp'], keep: [110, 220], dodge: 0.4,
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
      notice: 0.5, moves: ['apeswipe', 'stomp', 'rockthrow'], hop: 0.35, pack: true, tokens: 2, ring: 110, poise: 1.2,
      low: { at: 0.3, mode: 'rage', line: '{name}尖叫一聲，抓起石頭沒命地砸過來！' },
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
  // ── 0.21 南嶺 ──
  // 瘴林: spiders as big as a dog, three together — a bite that leaves venom, a web flung where you
  // stand (it holds you), a spring from the branches
  spider: {
    name: '瘴林毒蛛', el: '木', hp: 0.8, atk: 1.05, loot: [[0.55, 'spider_silk', 1]],
    rt: {
      share: 1.3, tier: 1, speed: 150, walk: 30, sight: 190, lose: 400, loseT: 1.4, leash: 650, body: 11, bulk: 0.6, tall: 14,
      notice: 0.35, moves: ['spiderbite', 'web', 'spiderleap'], hop: 0.45, night: 1.3, noon: 0.8, pack: true, tokens: 2, ring: 96,
      warn: '頭頂的樹枝上掛著一團一團的白絲，絲裡有東西在動。', cry: '樹上垂下幾隻毒蛛，八隻眼睛一齊盯住了你！',
      scared: ['那隻毒蛛順著絲爬回了樹上。', '那些毒蛛順著絲爬回了樹上。'], broke: '剩下的毒蛛順著絲爬回了樹上。',
    },
  },
  // 毒沼: a toad as big as a water jar — its tongue from afar, venom spat where you stand, its whole
  // weight come down on you
  toad: {
    name: '毒沼巨蟾', el: '水', hp: 1.1, atk: 1.3, loot: [[0.6, 'toad_venom', 1]],
    rt: {
      tier: 1, speed: 110, walk: 16, sight: 190, lose: 380, loseT: 1.4, leash: 520, body: 16, bulk: 0.9, tall: 22,
      notice: 0.6, moves: ['tongue', 'toadspit', 'hopslam'], night: 1.1, noon: 0.85, poise: 1.4,
      warn: '蘆葦叢裡傳來一聲悶悶的「咕——」，像有人在敲一面破鼓。', cry: '一隻水缸大的巨蟾從泥水裡撐起身子，鼓著兩腮瞪住了你！',
      scared: ['那隻巨蟾咕的一聲，沉回了泥水裡。', '那兩隻巨蟾咕咕叫著，沉回了泥水裡。'],
    },
  },
  // 毒沼深處, by the 沼心蓮: the lord of the marsh. Worn down, it spits venom all about and its croak
  // throws you back; near the end, in a rage
  toad_king: {
    name: '毒蟾王', el: '水', hp: 1.6, atk: 1.15, boss: true, loot: [[1, 'beast_core', 2], [1, 'toad_venom', 2]],
    rt: {
      tier: 1, speed: 104, walk: 12, sight: 220, lose: 440, loseT: 1.6, leash: 520, body: 26, bulk: 0.9, tall: 34,
      notice: 0.8, moves: ['tongue', 'toadspit', 'hopslam'],
      phases: [
        { at: 0.6, moves: ['tongue', 'toadrain', 'kinghop', 'croak'], line: '毒蟾王鼓起肚子，背上的毒疣一齊冒出白漿！' },
        { at: 0.3, enrage: true, line: '毒蟾王渾身漲成了紫黑色——牠發狂了！' },
      ],
      warn: '沼地裡的蛙聲忽然全停了。', cry: '泥水嘩地翻開，一隻磨盤大的毒蟾王撐起了身子！',
      scared: ['毒蟾王慢慢沉回了泥沼。', '毒蟾王慢慢沉回了泥沼。'],
    },
  },
  // 萬蠱谷: a cloud of 蠱, quick and hard to hit — stings that leave venom, a dart straight at you
  swarm: {
    name: '蠱蟲群', el: '金', hp: 0.75, atk: 0.8,
    rt: {
      share: 1.2, tier: 1, speed: 172, walk: 60, sight: 220, lose: 440, loseT: 1.4, leash: 700, body: 12, bulk: 0.4, tall: 50,
      notice: 0.3, moves: ['sting', 'swarmdart'], night: 0.85, noon: 1.1, pack: true, tokens: 2, ring: 90, dodge: 0.2,
      warn: '嗡嗡聲越來越近，像有人在耳邊搖一面破鑼。', cry: '一團黑雲從石縫裡湧出來——是蠱蟲！',
      scared: ['那團蠱蟲嗡的一聲散了。', '那幾團蠱蟲嗡嗡地散了。'], broke: '剩下的蠱蟲嗡的一聲，散進了林子。',
    },
  },
  // 萬蠱谷深處: the mother of them all, a centipede as long as a boat. Worn down, it calls its brood out
  // of its shell and goes under the ground to come up behind you; near the end, in a rage
  gu_mother: {
    name: '蠱母', el: '金', hp: 1.8, atk: 1.2, boss: true, loot: [[1, 'beast_core', 2], [1, 'gu_shell', 1]],
    rt: {
      tier: 1, speed: 150, walk: 26, sight: 240, lose: 480, loseT: 1.6, leash: 600, body: 24, bulk: 0.8, tall: 34,
      notice: 0.7, moves: ['centbite', 'centcharge', 'venomspray'],
      phases: [
        { at: 0.65, moves: ['centbite', 'broodcall', 'burrow', 'centcharge', 'venomspray'], line: '蠱母的百足一齊刮地，殼縫裡湧出一團一團的蠱蟲！' },
        { at: 0.3, enrage: true, line: '蠱母的甲殼裂開，滲出綠色的血——牠發狂了！' },
      ],
      warn: '石壁上爬滿了蠱蟲，地上鋪著一層薄薄的蟲殼。空氣腥得發甜。', cry: '地底轟隆一聲，一條丈長的百足蠱母破土而出！',
      scared: ['蠱母縮回了地底。', '蠱母縮回了地底。'],
    },
  },
  // ── 0.22 西漠 (二階: a match for 築基) ──
  // 沙海、黑戈壁: scorpions as big as a dog, in threes under the sand — they lie in wait there and come
  // up under you (神識 shows them); two snaps of the pincers, the tail over the back and down on you (the
  // venom stays), a scuttle at you. They keep out of the noon sun.
  scorpion: {
    name: '沙蠍', el: '金', hp: 0.95, atk: 1.1, loot: [[0.5, 'scorpion_tail', 1]],
    rt: {
      share: 1.3, tier: 2, speed: 158, walk: 0, sight: 110, lose: 380, loseT: 1.4, leash: 640, body: 13, bulk: 0.7, tall: 15,
      notice: 0, moves: ['pincer', 'stinger', 'scuttle'], ambush: true, hop: 0.35, night: 1.3, noon: 0.7, pack: true, tokens: 2, ring: 96, poise: 1.2,
      warn: '沙子底下沙沙作響，像有很多隻腳在爬。', cry: '沙子一翻，幾隻黑殼的沙蠍鑽了出來，尾巴高高翹起！',
      scared: ['那隻沙蠍鑽回了沙子底下。', '那些沙蠍鑽回了沙子底下。'], broke: '剩下的沙蠍鑽回了沙子底下。',
    },
  },
  // 沙海: wolves the colour of the sand, three together, worst by night
  sand_wolf: {
    name: '沙狼', el: '土', hp: 0.9, atk: 1.05, loot: [[0.5, 'wolf_pelt', 1]],
    rt: {
      share: 1.3, tier: 2, speed: 182, walk: 54, sight: 230, lose: 460, loseT: 1.4, leash: 820, body: 12, bulk: 1.25, tall: 20,
      notice: 0.45, moves: ['nip', 'lunge'], hop: 0.4, night: 1.35, noon: 0.6, pack: true, mourn: true, tokens: 2, ring: 100,
      warn: '沙丘那邊傳來狼嚎，一聲接著一聲。', cry: '沙丘頂上冒出幾個黃影子——沙狼！',
      scared: ['那頭沙狼夾著尾巴跑了。', '沙狼們夾著尾巴，翻過沙丘跑了。'], broke: '剩下的沙狼翻過沙丘跑了。',
    },
  },
  // 黑戈壁: the bandits of 禿鷲寨 — men with curved blades and their faces wrapped, who fling sand in your eyes
  sand_bandit: {
    name: '沙盜', hp: 1, atk: 1.05,
    rt: {
      share: 1.45, tier: 1, person: true, rank: '煉氣九層', speed: 160, walk: 40, sight: 240, lose: 420, loseT: 1.5, leash: 760, body: 10, tall: 37,
      notice: 0.45, moves: ['sabre', 'sandthrow', 'rush'], night: 1.1, tokens: 2, ring: 92, flee: 0.2, talk: 90,
      low: { at: 0.3, mode: 'rage', line: '{name}紅了眼，揮著彎刀撲了上來！' },
      warn: '土台後面有人在低聲說話，還有刀出鞘的聲音。', cry: '幾個蒙著臉的人從土台後面衝了出來！',
      scared: ['那人看了你一眼，翻身就跑。', '那幾個人看了你一眼，翻身就跑。'], broke: '剩下的沙盜見勢不妙，翻身就跑。',
    },
  },
  // 禿鷲寨's master: a 築基 bandit with a great curved blade — three cuts running, a whirl of sand all
  // round him, a rush; beaten, he throws down his blade
  vulture: {
    name: '禿鷲', hp: 1.4, atk: 1.2, boss: true,
    rt: {
      tier: 2, person: true, rank: '築基中期', speed: 176, walk: 40, sight: 260, lose: 480, loseT: 1.6, leash: 900, body: 12, tall: 40,
      notice: 0.4, moves: ['sabre', 'sandthrow', 'rush'], yield: 0.16,
      phases: [
        { at: 0.6, moves: ['vulturecut', 'sandwhirl', 'sandthrow', 'rush'], line: '禿鷲把彎刀在手裡一轉，腳下的沙子打著旋兒捲了起來！' },
        { at: 0.3, enrage: true, line: '禿鷲扯下蒙臉的布，啐了一口血——他拚命了！' },
      ],
      cry: '禿鷲提著彎刀，一步一步走了過來。',
    },
  },
  // 沙陀寺, by night: the monks who died sitting, up and walking — a clutch that drinks what it takes,
  // dust breathed out of a dead mouth
  mummy: {
    name: '乾屍', el: '土', hp: 1.05, atk: 1, spirit: true,
    rt: {
      share: 1.2, tier: 2, speed: 112, walk: 20, sight: 180, lose: 380, loseT: 1.6, leash: 560, body: 11, bulk: 0.7, tall: 36,
      notice: 0.6, moves: ['grasp', 'dustbreath'], night: 1.3, day: 0.5, tokens: 2, ring: 86,
      warn: '風裡有一股陳年的檀香味，混著塵土。', cry: '一具乾屍搖搖晃晃地走了過來，空空的眼眶對著你。',
      scared: ['那具乾屍停了下來，又慢慢坐回了地上。', '那些乾屍停了下來，又慢慢坐回了地上。'],
    },
  },
  // 沙陀寺's abbot, sixty years dead and sitting still in the hall: a palm of gold, beads flung five at
  // once, a roar like a lion's; worn down, he calls the dead monks up off their cushions
  kuchan: {
    name: '枯禪', el: '金', hp: 1.5, atk: 1.15, boss: true, spirit: true, loot: [[1, 'sarira', 1]],
    rt: {
      tier: 2, speed: 120, walk: 0, sight: 150, lose: 520, loseT: 1.8, leash: 520, body: 13, bulk: 0.8, tall: 40,
      notice: 0.8, moves: ['zenpalm', 'beads'],
      phases: [
        { at: 0.6, moves: ['lionroar', 'zenpalm', 'beads', 'monkcall'], line: '枯禪睜開了眼。一圈金光從他身上盪開，殿裡的乾屍一齊站了起來！' },
        { at: 0.28, enrage: true, line: '枯禪身上的袈裟寸寸碎裂，金光裡透出黑氣——他發狂了！' },
      ],
      warn: '殿裡有人在唸經，聲音乾澀，像風吹過枯葉。', cry: '蒲團上的老僧緩緩抬起了頭。',
    },
  },
  // 流沙: the last 蛟 of the old 西海, that learned to swim in sand when the sea dried — its jaws, its
  // tail swept round, sand spouting where you stand; worn down, it goes under and comes up behind
  // you, and turns the ground about it to quicksand
  sand_jiao: {
    name: '沙蛟', el: '水', hp: 1.7, atk: 1.2, boss: true, loot: [[1, 'beast_core', 3], [1, 'jiao_scale', 3], [1, 'dingfeng_pearl', 1]],
    rt: {
      tier: 2, speed: 150, walk: 24, sight: 260, lose: 520, loseT: 1.8, leash: 640, body: 24, bulk: 0.6, tall: 34,
      notice: 0.7, moves: ['jiaobite', 'tailsweep', 'sandspout'],
      phases: [
        { at: 0.62, moves: ['jiaobite', 'sandsink', 'sandspout', 'quickpool', 'tailsweep'], line: '沙蛟一頭扎進沙裡，四周的沙地一齊轉了起來！' },
        { at: 0.3, enrage: true, line: '沙蛟昂起頭一聲長吟，背上的鱗片根根豎起——牠發狂了！' },
      ],
      warn: '沙地底下有什麼大東西慢慢游過去，沙面隆起長長的一道脊。', cry: '沙渦裡猛地探出一顆頭，頭上兩隻彎角——是沙蛟！',
      scared: ['沙蛟沉回了流沙底下。', '沙蛟沉回了流沙底下。'],
    },
  },
  // 沉沙古城: the stone guards of the old city, slow and heavy, that wake when you come near
  stone_puppet: {
    name: '石傀', el: '土', hp: 1.3, atk: 1.1, loot: [[0.3, 'star_stone', 1]],
    rt: {
      share: 1.25, tier: 2, speed: 104, walk: 0, sight: 170, lose: 380, loseT: 1.4, leash: 440, body: 14, bulk: 0.9, tall: 36,
      notice: 0.9, moves: ['stonefist', 'stomp', 'bearcharge'], poise: 2.2, pack: true, tokens: 2, ring: 90,
      warn: '路邊的石像，好像轉了一下頭。', cry: '石像從底座上走了下來，石頭磨著石頭，咯咯作響！',
      scared: ['那尊石像退回了底座上，一動不動。', '那些石像退回了底座上，一動不動。'],
    },
  },
  // 星門: the stone 翁仲 that guards the way down under the 觀星台 — its halberd swept wide, starlight
  // from its eyes; worn down, the ground split where you stand, and the stone guards called up
  stone_general: {
    name: '石翁仲', el: '土', hp: 1.9, atk: 1.25, boss: true, loot: [[1, 'star_stone', 2]],
    rt: {
      tier: 2, speed: 110, walk: 0, sight: 280, lose: 600, loseT: 2, leash: 520, body: 20, bulk: 0.9, tall: 64,
      notice: 0.9, moves: ['halberd', 'stomp', 'starbeam'],
      phases: [
        { at: 0.6, moves: ['halberd', 'smash', 'starbeam', 'stonecall'], line: '石翁仲的眼裡亮起兩點星光，手裡的石戟嗡嗡作響！' },
        { at: 0.28, enrage: true, line: '石翁仲身上的石皮一片一片剝落，露出底下發光的星紋——它發狂了！' },
      ],
      cry: '星門前的石翁仲，眼裡亮起了光。',
    },
  },
  // ── 0.23 北原 (二階, a match for 築基後期: stronger than the desert's) ──
  // 冰原、北原雪野: wolves white as the snow, three together, worst by night; a bite that leaves the cold in you
  ice_wolf: {
    name: '冰原狼', el: '水', hp: 0.95, atk: 1.05, loot: [[0.6, 'bailang_pelt', 1]],
    rt: {
      share: 1.3, tier: 2, speed: 186, walk: 56, sight: 240, lose: 470, loseT: 1.4, leash: 840, body: 12, bulk: 1.25, tall: 20,
      notice: 0.45, moves: ['nip', 'lunge', 'frostbite'], hop: 0.4, night: 1.35, pack: true, mourn: true, tokens: 2, ring: 100,
      warn: '雪地上一串一串的爪印，還是新的。', cry: '雪坡上冒出幾個白影子——冰原狼！',
      scared: ['那頭冰原狼夾著尾巴跑了。', '冰原狼們夾著尾巴，消失在雪坡後面。'], broke: '剩下的冰原狼消失在雪坡後面。',
    },
  },
  // 雪山、斷雲崖: a cat as white as the snow it lies in, that you do not see till it leaps
  snow_leopard: {
    name: '雪豹', el: '金', hp: 1, atk: 1.2, loot: [[0.4, 'beast_core', 1]],
    rt: {
      share: 1.45, tier: 2, speed: 204, walk: 0, sight: 150, lose: 420, loseT: 1.4, leash: 700, body: 12, bulk: 0.9, tall: 18,
      notice: 0, moves: ['rake', 'snowpounce'], ambush: true, hop: 0.5, tokens: 1, ring: 96, poise: 1.3,
      warn: '雪地上一點聲音也沒有，靜得不對勁。', cry: '雪堆一炸——一頭雪豹從雪底下撲了出來！',
      scared: ['雪豹躍上岩石，一閃就不見了。', '雪豹躍上岩石，一閃就不見了。'],
    },
  },
  // 寒鐵礦: grubs as long as your arm, white as frost, that spit a silk that freezes where it lands
  ice_silkworm: {
    name: '冰蠶', el: '水', hp: 0.9, atk: 0.95, loot: [[0.5, 'bingcan_silk', 1]],
    rt: {
      share: 1.25, tier: 2, speed: 118, walk: 20, sight: 190, lose: 380, loseT: 1.4, leash: 520, body: 11, bulk: 0.7, tall: 12,
      notice: 0.6, moves: ['silkbite', 'frostsilk'], pack: true, tokens: 2, ring: 90,
      warn: '石壁上掛著一縷一縷白絲，結著霜。', cry: '巷道的石縫裡爬出幾條雪白的蟲子，昂起了頭！',
      scared: ['那條冰蠶縮回了石縫裡。', '冰蠶們縮回了石縫裡。'], broke: '剩下的冰蠶縮回了石縫裡。',
    },
  },
  // 雪山: apes taller than a man, white-furred, that heave ice at you and beat the ground
  snow_ape: {
    name: '雪猿', el: '土', hp: 1.3, atk: 1.2, loot: [[0.3, 'beast_core', 1]],
    rt: {
      share: 1.3, tier: 2, speed: 152, walk: 40, sight: 230, lose: 460, loseT: 1.5, leash: 700, body: 15, bulk: 0.9, tall: 34,
      notice: 0.5, moves: ['apeslam', 'iceboulder', 'stomp'], poise: 2, pack: true, tokens: 2, ring: 96,
      low: { at: 0.3, mode: 'rage', line: '雪猿捶著胸口狂吼，撲了上來！' },
      warn: '山坡上的雪被什麼東西踩得亂七八糟，到處是大腳印。', cry: '一頭雪白的大猿從岩石後面站了起來，比人還高！',
      scared: ['雪猿怪叫一聲，翻過山坡跑了。', '雪猿們怪叫著，翻過山坡跑了。'], broke: '剩下的雪猿翻過山坡跑了。',
    },
  },
  // 北冥, by night: the drowned, gone pale in the ice, that rise out of it in the dark (the cold of the dead; gone, and behind you)
  snow_wraith: {
    name: '雪魄', el: '水', hp: 0.95, atk: 1.1, spirit: true,
    rt: {
      share: 1.25, tier: 2, speed: 140, walk: 30, sight: 200, lose: 420, loseT: 1.6, leash: 600, body: 10, bulk: 0.6, tall: 34,
      notice: 0.6, moves: ['chilltouch', 'wraithblink'], night: 1.3, day: 0.5, tokens: 2, ring: 90, dodge: 0.3,
      warn: '冰面底下，好像有一張臉，貼著冰往上看。', cry: '冰面上浮起一個白影子，長頭髮，沒有腳。',
      scared: ['那個白影子沉回了冰裡。', '那些白影子沉回了冰裡。'],
    },
  },
  // 冰原's wolf king: white as a calf, a scar over one eye; his howl brings the pack, his roar freezes the air
  bailang_king: {
    name: '白狼王', el: '水', hp: 1.8, atk: 1.2, boss: true, loot: [[1, 'bailang_king_pelt', 1], [1, 'beast_core', 2]],
    rt: {
      tier: 2, speed: 192, walk: 50, sight: 280, lose: 520, loseT: 1.8, leash: 900, body: 16, bulk: 1.1, tall: 30,
      notice: 0.4, moves: ['lunge', 'frostbite', 'nip'],
      phases: [
        { at: 0.62, moves: ['lunge', 'frostbite', 'wolfcall', 'frostroar'], line: '白狼王退開兩步，仰起頭——一聲長嘯，冰原上的風都停了！' },
        { at: 0.3, enrage: true, line: '白狼王的眼睛紅了，背上的毛根根豎起——牠發狂了！' },
      ],
      warn: '雪地上一行爪印，比碗口還大。', cry: '一頭小牛那麼大的白狼，從雪坡後面慢慢走了出來。牠的左眼上，有一道疤。',
      scared: ['白狼王轉身沒入了風雪裡。', '白狼王轉身沒入了風雪裡。'],
    },
  },
  // 寒鐵礦's deepest gallery: the mother of the silkworms, as thick as a water jar, whose call sounds like
  // a woman singing; frost sprayed, ice spread underfoot, her brood called out of the rock
  silk_queen: {
    name: '冰蠶母', el: '水', hp: 2, atk: 1.15, boss: true, loot: [[1, 'bingcan_silk', 4], [1, 'beast_core', 2]],
    rt: {
      tier: 2, speed: 100, walk: 0, sight: 220, lose: 520, loseT: 1.8, leash: 400, body: 22, bulk: 0.6, tall: 30,
      notice: 0.8, moves: ['silkbite', 'frostspray', 'frostsilk'],
      phases: [
        { at: 0.62, moves: ['silkbite', 'frostspray', 'icepool', 'broodsilk', 'frostsilk'], line: '冰蠶母的身子鼓了起來，背上的冰刺一根一根豎起，石縫裡沙沙作響！' },
        { at: 0.3, enrage: true, line: '冰蠶母發出一聲尖細的長鳴——像一個女人在唱歌——牠發狂了！' },
      ],
      warn: '巷道深處傳來細細的歌聲，一句一句，聽不清唱的是什麼。', cry: '巷道盡頭，一條水缸那麼粗的白蟲抬起了頭。',
      scared: ['冰蠶母縮進了石縫深處。', '冰蠶母縮進了石縫深處。'],
    },
  },
  // 雪山's master: an ape king with a grey mane, who brings the snow down off the slope on you
  ape_king: {
    name: '雪猿王', el: '土', hp: 1.8, atk: 1.25, boss: true, loot: [[1, 'beast_core', 3], [1, 'xuelian', 2]],
    rt: {
      tier: 2, speed: 160, walk: 30, sight: 260, lose: 520, loseT: 1.8, leash: 700, body: 20, bulk: 0.8, tall: 50,
      notice: 0.6, moves: ['apeslam', 'iceboulder', 'stomp'],
      phases: [
        { at: 0.62, moves: ['apeslam', 'iceboulder', 'avalanche', 'apecall', 'beatchest'], line: '雪猿王捶著胸膛狂吼，山坡上的積雪轟隆隆地塌了下來！' },
        { at: 0.3, enrage: true, line: '雪猿王把一塊冰石砸得粉碎，滿嘴是血地吼——牠發狂了！' },
      ],
      warn: '雪坡上散著幾具雪猿的骨頭，啃得乾乾淨淨。', cry: '一頭比熊還大的雪猿從山洞裡鑽了出來，頸上的毛是灰的。',
      scared: ['雪猿王退回了山洞裡。', '雪猿王退回了山洞裡。'],
    },
  },
  // 靈脈裂谷: the qilin of ice that lies on the knot of the veins and drinks what overflows from them;
  // its horn, ice breathed, spikes of ice out of the ground, a charge, a ring of frost
  ice_qilin: {
    name: '冰麟', el: '水', hp: 2, atk: 1.3, boss: true, loot: [[1, 'qilin_horn', 1], [1, 'lingsui', 2], [1, 'bingpo_pearl', 1]],
    rt: {
      tier: 2, speed: 172, walk: 0, sight: 260, lose: 560, loseT: 2, leash: 520, body: 20, bulk: 0.7, tall: 44,
      notice: 0.9, moves: ['qilinhorn', 'icebreath', 'qilincharge'],
      phases: [
        { at: 0.65, moves: ['qilinhorn', 'icespikes', 'icebreath', 'qilincharge', 'frostnova'], line: '冰麟昂起頭，身上的鱗片一片一片亮起藍光——靈脈的光！' },
        { at: 0.3, enrage: true, line: '冰麟發出一聲像玉磬一樣的長鳴，四周的空氣都凍住了——牠發狂了！' },
      ],
      warn: '靈脈的藍光裡，伏著一團白色的東西，一起一伏，在呼吸。', cry: '那團白色的東西站了起來：鹿的身子，龍的鱗，額上一隻冰做的角。',
      scared: ['冰麟退回了靈脈的光裡。', '冰麟退回了靈脈的光裡。'],
    },
  },
};
