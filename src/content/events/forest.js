import { dayAt } from '../../core/calendar.js';
import { has, flag, alive, needLs, npcPower, variant } from '../helpers.js';

const F = ['black_forest'];

export default [
  {
    id: 'forest_arrive',
    trigger: 'arrive',
    nodes: F,
    once: true,
    title: '黑風林',
    text: '走進黑風林的那一刻，天就暗了。\n\n樹冠密得透不進光，腳下的落葉不知積了多少年，一腳踩下去，陷到腳踝。遠處有什麼東西在叫，聽不出是鳥還是別的。\n\n叮——此地危險等級：高。本系統建議宿主：別逞強。',
    choices: [{ text: '握緊手中的兵器。', out: { effects: [['sysexp', 3]] } }],
  },

  {
    id: 'forest_bandits',
    trigger: 'explore',
    mob: true,
    nodes: F,
    cooldown: 90,
    weight: 10,
    cond: (s) => !flag(s, 'bandit_joined'),
    title: '攔路',
    text: '「此路是我開——」\n\n三個蒙面人從樹後跳出來。為首的是個獨眼龍，煉氣四層的靈壓毫不掩飾地壓了過來。\n\n「把儲物袋交出來，留你一條命。」',
    choices: [
      {
        text: '交出一半靈石。',
        show: (s) => s.player.ls > 0,
        out: { text: '獨眼龍掂了掂，啐了一口：「窮鬼。」放你走了。', effects: [['halfls'], ['mind', -3]] },
      },
      {
        text: '拼了。',
        check: { kind: 'power', diff: 32 },
        fight: { foes: [['bandit_chief', 1, { name: '獨眼龍' }], ['bandit', 2]], close: true },
        ok: {
          text: '你一劍挑飛了獨眼龍的刀，另外兩個人見勢不妙，扭頭就跑。\n\n獨眼龍跪在地上求饒。你搜出了他身上的靈石，然後放他走了。',
          effects: [['ls', [12, 28]], ['flag', 'beat_bandits'], ['mind', 3], ['sysexp', 3]],
        },
        fail: { text: '三打一，你很快就倒在了血泊裡。醒來時，身上所有的靈石都不見了。', effects: [['hurt', 2, '死於劫修刀下'], ['allls']] },
      },
      {
        text: '「我是青雲宗弟子。」',
        check: { kind: 'jiyuan', diff: 6 },
        ok: { text: '獨眼龍的臉色變了變，罵罵咧咧地帶人走了。\n\n你的後背全是冷汗。', effects: [] },
        fail: { text: '「青雲宗？」獨眼龍大笑，「青雲宗的弟子，會窮成這副德性？」', effects: [['hurt', 1], ['halfls']] },
      },
      {
        text: '「我想入夥。」',
        show: (s) => s.player.realm >= 1,
        karma: true,
        out: {
          text: '獨眼龍打量你半天，笑了：「有意思。」\n\n那天晚上，你跟著他們劫了一支商隊。分到的靈石，比你過去一年攢的都多。\n\n你沒有回頭看那些商人的臉。',
          effects: [['flag', 'bandit_joined'], ['ls', 40], ['mind', -12], ['log', '加入了黑風寨'], ['sched', 'bandit_purge', 180, 420, { expire: 720 }]],
        },
      },
    ],
  },

  {
    id: 'bandit_purge',
    trigger: 'scheduled',
    nodes: ['black_forest', 'luoxia_market', 'qingshi_town'],
    cond: (s) => flag(s, 'bandit_joined'),
    title: '清剿',
    text: '「黑風寨餘孽，站住！」\n\n三個穿青雲宗服飾的執法弟子攔住了你。為首的手裡拿著一張畫像——畫的是你。\n\n「黑風寨昨夜已被我宗剿滅。」他冷冷地說，「獨眼龍臨死前，供出了你。」',
    choices: [
      {
        text: '殺出去。',
        check: { kind: 'power', diff: 48 },
        fight: { foes: [['enforcer', 3]] },
        ok: {
          text: '你殺出了一條血路，逃進了深山。從此以後，青雲宗的通緝令上，多了你的名字。',
          effects: [['flag', 'sect_wanted'], ['unflag', 'bandit_joined'], ['mind', -6], ['log', '被青雲宗通緝']],
        },
        fail: { text: '他們的劍陣配合得天衣無縫。你被一劍穿胸。', effects: [['death', '被青雲宗執法弟子斬殺']] },
      },
      {
        text: '跪地認罪。',
        out: {
          text: '你被廢去了一層修為，關了三個月的禁閉。出來時，執法弟子說：「念你初犯。下不為例。」',
          effects: [['days', 90], ['xw', -300], ['hurt', 1], ['unflag', 'bandit_joined'], ['mind', 4], ['log', '向青雲宗認罪伏法']],
        },
      },
      {
        text: '交出所有贓物，求他們放過。',
        need: needLs(60),
        out: {
          text: '為首的弟子掂了掂靈石，和同伴對視一眼。\n\n「我們今天，沒見過你。」\n\n原來名門正派，也是這樣。',
          effects: [['ls', -60], ['unflag', 'bandit_joined'], ['mind', -4]],
        },
      },
    ],
  },

  {
    id: 'forest_wolf_king',
    trigger: 'explore',
    poi: 'wolf_lair',
    auto: true,
    nodes: F,
    once: true,
    title: '狼王',
    text: '月光下，一頭比牛還大的灰狼蹲在岩石上，額頭有一撮銀毛。\n\n牠沒有叫。牠只是看著你，像看一頓送上門的晚餐。\n\n叮——警告：一階上品妖獸。建議宿主立即撤離。',
    choices: [
      {
        text: '戰。',
        tag: 'danger',
        check: { kind: 'power', diff: 70 },
        fight: { foes: [['wolf_king', 1]] },
        ok: {
          text: '這一戰打了整整一夜。天亮時，狼王倒在血泊裡，你也只剩半條命。\n\n你從牠的腦袋裡剖出了一顆拳頭大的妖丹。',
          effects: [['item', 'wolf_core', 1], ['hurt', 1], ['sysexp', 10], ['mind', 5], ['log', '斬殺黑風林狼王']],
        },
        fail: { text: '你連牠的動作都看不清。', effects: [['death', '葬身狼腹']] },
      },
      {
        text: '慢慢後退。',
        check: { kind: 'xinxing', diff: 5 },
        ok: { text: '你一步一步往後退，不敢轉身，不敢喘氣。狼王一直看著你，直到你消失在樹林裡。', effects: [['mind', 2]] },
        fail: { text: '你的腿在發抖。狼王察覺到了你的恐懼，撲了上來。', effects: [['hurt', 2, '葬身狼腹']] },
      },
      {
        text: '扔下乾肉，轉身就跑。',
        check: { kind: 'jiyuan', diff: 4 },
        ok: { text: '狼王低頭聞了聞乾肉。就這一瞬間，你已經跑出了百丈。', effects: [] },
        fail: { text: '牠根本沒看那塊肉。', effects: [['hurt', 1]] },
      },
    ],
  },

  {
    id: 'forest_corpse',
    trigger: 'explore',
    poi: 'forest_corpse',
    nodes: F,
    once: true,
    title: '樹下的屍體',
    text: '一具屍體靠坐在樹根下，已經被野獸啃得面目全非。從殘破的衣著看，是個修士。\n\n他手裡還攥著一個灰撲撲的小布袋——儲物袋。',
    choices: [
      {
        text: '取走儲物袋。',
        karma: true,
        out: {
          text: '袋子裡有四十塊靈石、一本《青木訣》，和一塊刻著血色骷髏的鐵牌。\n\n鐵牌摸上去，是溫的。',
          effects: [
            ['ls', 40], ['item', 'book_qingmu', 1], ['item', 'xuesha_token', 1], ['flag', 'took_corpse_bag'],
            ['sched', 'xuesha_inquiry', 180, 540, { expire: 1080 }],
          ],
        },
      },
      {
        text: '先埋了他，再取儲物袋。',
        karma: true,
        out: {
          text: '你挖了個淺坑，把他埋了，在墳前插了一根樹枝。\n\n袋子裡有四十塊靈石、一本《青木訣》，和一塊刻著血色骷髏的鐵牌。\n\n鐵牌摸上去，是溫的。',
          effects: [
            ['days', 1], ['mind', 3], ['flag', 'buried_corpse'], ['ls', 40], ['item', 'book_qingmu', 1], ['item', 'xuesha_token', 1],
            ['flag', 'took_corpse_bag'], ['sched', 'xuesha_inquiry', 180, 540, { expire: 1080 }],
          ],
        },
      },
      {
        text: '埋了他，不碰他的東西。',
        out: { text: '你把他和他的儲物袋一起埋了。入土為安。', effects: [['days', 1], ['mind', 6], ['flag', 'buried_corpse']] },
      },
    ],
  },

  {
    id: 'forest_poison',
    trigger: 'explore',
    poi: ['miasma_a', 'miasma_b'],
    auto: true,
    nodes: F,
    cooldown: 60,
    weight: 7,
    title: '瘴氣',
    text: '一股甜膩的香味飄過來。等你察覺不對的時候，四周已經被淡紫色的霧氣包圍了。\n\n瘴氣。',
    choices: [
      {
        text: '服下解毒丹。',
        show: (s) => has(s, 'detox_pill'),
        out: { text: '丹藥入口，一股辛辣直衝腦門。你屏住呼吸，衝出了瘴氣。', effects: [['item', 'detox_pill', -1]] },
      },
      {
        text: '閉氣衝出去。',
        check: { kind: 'gengu', diff: 6 },
        ok: { text: '你憋著一口氣跑了半里地，衝出瘴氣時，臉都青了。', effects: [] },
        fail: { text: '你吸進了一口。眼前一黑，再醒來時，已經不知道過了多久。', effects: [['days', 3], ['hurt', 1, '毒發身亡']] },
      },
    ],
  },

  {
    id: 'forest_rival',
    trigger: 'explore',
    nodes: F,
    cooldown: 120,
    weight: 9,
    title: '血參',
    steps: {
      start: {
        effects: [['newnpc', 'sanxiu']],
        text: '一株三葉血參長在倒木底下。你剛伸出手，另一隻手也伸了過來。\n\n是個{npcTitle}，名叫{npc}。看上去，境界和你差不多。\n\n「我先看見的。」{npc}說。',
        choices: [
          {
            text: '「一人一半。」',
            out: {
              text: '{npc}愣了一下，笑了：「爽快。」\n\n你們把血參分了。臨別時，{npc}說：「以後在這林子裡遇上麻煩，報我的名字。」',
              effects: [['item', 'blood_ginseng', 1], ['favor', 'npc', 15]],
            },
          },
          {
            text: '讓給{npc}。',
            out: { text: '{npc}有點意外，拱了拱手：「承情了。」', effects: [['favor', 'npc', 25], ['mind', 2]] },
          },
          {
            text: '動手搶。',
            karma: true,
            check: { kind: 'power', diff: (s, ctx) => npcPower(ctx.npc) },
            fight: { foes: [['cultivator', 1, 'npc']], close: true },
            ok: { text: '{npc}捂著傷口退走了，臨走時死死地盯著你，像要把你的臉刻進腦子裡。', effects: [['item', 'blood_ginseng', 2], ['favor', 'npc', -40]] },
            fail: { text: '{npc}的劍比你快。你捂著傷口，看著對方拿走了血參。', effects: [['hurt', 1], ['favor', 'npc', -15]] },
          },
        ],
      },
    },
  },

  {
    id: 'forest_lost_girl',
    trigger: 'explore',
    poi: 'lost_girl',
    auto: true,
    nodes: F,
    once: true,
    cond: (s) => alive(s, 'wang_er') && s.day < dayAt(12),
    title: '哭聲',
    text: '林子深處，傳來小女孩的哭聲。\n\n你循聲找過去，一個七八歲的女孩縮在樹洞裡，臉上全是泥。是王二的妹妹，王小妹。\n\n「我、我來採蘑菇……」她抽抽搭搭地說，「找不到路了……」\n\n遠處，傳來狼嚎。',
    choices: [
      {
        text: '背起她就走。',
        check: { kind: 'power', diff: 18 },
        fight: { foes: [['wolf', 2]] },
        ok: {
          text: '一路上你打退了兩頭狼。把王小妹送回家時，王二撲通一聲給你跪下了。',
          effects: [['favor', 'wang_er', 25], ['mind', 6], ['log', '把王二的妹妹從黑風林背了回來']],
        },
        fail: {
          text: '狼群追了你們半夜。你用後背替她擋了好幾口，總算把她送回了家。',
          effects: [['hurt', 1], ['favor', 'wang_er', 30], ['mind', 8], ['log', '把王二的妹妹從黑風林背了回來']],
        },
      },
    ],
  },

  {
    id: 'forest_ambush_old_foe',
    trigger: 'explore',
    nodes: F,
    cooldown: 200,
    weight: 6,
    cond: (s) => Object.values(s.npcs).some((n) => !n.named && n.alive && n.favor <= -30),
    title: '舊怨',
    steps: {
      start: {
        effects: [(s, ctx) => {
          const foes = Object.values(s.npcs).filter((n) => !n.named && n.alive && n.favor <= -30);
          ctx.npc = foes[0];
          ctx.npcId = foes[0].id;
        }],
        text: '「找你很久了。」\n\n{npc}從樹後走出來，手裡的劍閃著寒光。\n\n你想起來了——那一次，你們結下了梁子。',
        choices: [
          {
            text: '迎戰。',
            check: { kind: 'power', diff: (s, ctx) => npcPower(ctx.npc) * 1.1 },
            fight: { foes: [['cultivator', 1, 'npc']], close: true },
            ok: { text: '{npc}倒下了。你站在原地喘著粗氣，心裡說不出是什麼滋味。', effects: [['npc', 'npc', 'alive', false], ['mind', -3], ['ls', [10, 30]]] },
            fail: { text: '{npc}的劍抵在你喉嚨上，停了很久，最後收了回去：「這次，算扯平了。」', effects: [['hurt', 2], ['favor', 'npc', 30]] },
          },
          {
            text: '道歉。',
            check: { kind: 'xinxing', diff: 6 },
            ok: { text: '{npc}盯著你看了很久，嘆了口氣，收起了劍：「算了。」', effects: [['favor', 'npc', 40], ['mind', 3]] },
            fail: { text: '「現在才道歉？」{npc}冷笑一聲，出手了。', effects: [['hurt', 1], ['favor', 'npc', 10]] },
          },
        ],
      },
    },
  },
];
