import { dayAt } from '../../core/calendar.js';
import { has, flag, alive, season, variant } from '../helpers.js';

const H = ['qingshi_hill'];

export default [
  {
    id: 'hill_herbs',
    trigger: 'explore',
    nodes: H,
    cooldown: 6,
    weight: 14,
    title: '採藥',
    text: (s) =>
      ({
        spring: '春雨過後，向陽的坡上冒出一片嫩綠。你蹲下來撥開草葉，葉脈裡有微光流轉——凝氣草。',
        summer: '密林裡又悶又熱，蚊蟲嗡嗡作響。你順著溪邊找，石縫裡長著幾株凝氣草。',
        autumn: '滿山的樹葉黃了。凝氣草在這時候靈氣最足，葉尖泛著一點銀白。',
        winter: '雪地裡，只有背風的岩縫下，還頑強地長著幾株凝氣草。',
      })[season(s)],
    choices: [
      {
        text: '仔細採摘。',
        out: {
          text: '你小心地連根挖起，用濕苔蘚包好，放進竹簍。',
          effects: [['days', 1], ['item', 'ningqi_grass', [2, 4]], ['maybe', 0.3, [['item', 'zhixue_grass', 1]]]],
        },
      },
      {
        text: '往更深處找找。',
        check: { kind: 'jiyuan', diff: 6 },
        ok: {
          text: '你在一處沒人走過的山坳裡，找到了一大片。還有一株你不認識的草，摸上去冰冰涼涼的。',
          effects: [['days', 2], ['item', 'ningqi_grass', [4, 6]], ['maybe', 0.15, [['item', 'mystery', 1]]]],
        },
        fail: {
          text: '你在山裡繞了兩天，只找到兩株。回來時天都黑了。',
          effects: [['days', 2], ['item', 'ningqi_grass', 2]],
        },
      },
    ],
  },

  {
    id: 'hill_wolves',
    trigger: 'explore',
    mob: true,
    nodes: H,
    cooldown: 60,
    weight: 8,
    title: '狼',
    text: '林子裡忽然安靜下來。\n\n三雙綠油油的眼睛，從灌木後面亮起。是狼，餓了一個冬天的狼。',
    choices: [
      {
        text: '拔刀迎戰。',
        check: { kind: 'power', diff: 20 },
        ok: { text: '你砍翻了領頭的那一頭，剩下兩頭夾著尾巴跑了。狼皮拿到鎮上，能換幾塊靈石。', effects: [['ls', [3, 6]], ['mind', 2]] },
        fail: { text: '你被撲倒在地，肩膀被撕下一塊肉，拼了命才把狼趕走。', effects: [['hurt', 1]] },
      },
      {
        text: '爬上樹。',
        check: { kind: 'gengu', diff: 4 },
        ok: { text: '你在樹上蹲了一夜。天亮時，狼群終於散了。', effects: [['days', 1]] },
        fail: { text: '爬到一半，腳下一滑——', effects: [['hurt', 1]] },
      },
      {
        text: '點起火把。',
        check: { kind: 'wuxing', diff: 5 },
        ok: { text: '你用火摺子點燃了一把枯枝。火光一起，狼群退了。', effects: [] },
        fail: { text: '火摺子受了潮，怎麼也點不著。狼撲上來了。', effects: [['hurt', 1]] },
      },
    ],
  },

  {
    id: 'hill_hunter',
    trigger: 'explore',
    poi: 'hunter_camp',
    auto: true,
    nodes: H,
    once: true,
    title: '老獵戶',
    text: (s) =>
      `山道上遇見了老獵戶趙大叔，他背上扛著一頭剛打的山羊。${s.player.origin === 'hunter' ? '\n\n「是你小子！」他認出了你，「你爹要是知道你從斷魂崖摔下來還活著，得在墳裡笑醒。」' : ''}\n\n「往北別去了。」他說，「翻過兩道梁就是黑風林。上個月劉家老三進去採藥，就沒出來。」\n\n他頓了頓，壓低聲音：「我年輕時在林子邊上，見過會飛的人。」`,
    choices: [
      {
        text: '打聽黑風林的事。',
        out: {
          text: '「林子裡有劫道的，也有吃人的東西。」趙大叔說，「那些會飛的人，好像就是去林子裡找什麼。找到的人少，死在裡面的人多。」',
          effects: [['discover', 'black_forest']],
        },
      },
      {
        text: '打聽會飛的人。',
        out: {
          text: '「踩著一把劍，嗖地一下就過去了。」趙大叔比劃著，「後來我在落霞坊市那邊見過一回，說是修士的集市，凡人進不去。」\n\n他看了你一眼：「你小子……眼神跟以前不一樣了。」',
          effects: [['discover', 'black_forest'], ['insight', 1]],
        },
      },
    ],
  },

  {
    id: 'hill_crane',
    trigger: 'explore',
    poi: 'creek_crane',
    nodes: H,
    once: true,
    title: '白鶴',
    text: '溪邊的蘆葦叢裡，有一隻白鶴。\n\n牠的翅膀被獵人的鐵夾夾斷了，血把半邊羽毛染成了紅色。看見你，牠掙扎了一下，又無力地趴了回去。\n\n那雙眼睛很亮，亮得不像一隻鳥。',
    choices: [
      {
        text: '拆下鐵夾，替牠包紮。',
        karma: true,
        out: {
          text: '你在溪邊守了三天，替牠換藥、餵魚。第四天清晨，牠站了起來，繞著你走了三圈，振翅飛進雲裡。\n\n一根白羽，飄落在你腳邊。',
          effects: [
            ['days', 3], ['flag', 'crane_saved'], ['mind', 5], ['item', 'crane_feather', 1],
            ['sched', 'crane_return', 720, 1800, { expire: 3600 }], ['log', '救了一隻白鶴'],
          ],
        },
      },
      {
        text: '拔下牠的翎羽拿去賣。',
        karma: true,
        out: {
          text: '白鶴沒有叫。牠只是看著你。\n\n你拔完了羽毛，牠還在看著你。',
          effects: [['item', 'crane_feather', 3], ['flag', 'crane_harmed'], ['mind', -6]],
        },
      },
      { text: '不關我的事。', out: { text: '你走開了。那天夜裡，下了一場雨。' } },
    ],
  },

  {
    id: 'hill_lin_cliff',
    trigger: 'explore',
    poi: 'cliff_bottom',
    auto: true,
    nodes: H,
    once: true,
    cond: (s) => s.day >= dayAt(0, 3) && s.day < dayAt(2, 8) && alive(s, 'lin_chen'),
    title: '崖下的少年',
    text: '斷崖下的亂石堆裡，躺著一個人。\n\n是林塵。他渾身是傷，像是從崖上摔下來的，手裡還死死攥著半截藥草的莖。\n\n「別碰我……」他咬著牙，「我自己能走。」\n\n他站起來，走了兩步，倒了。\n\n他手上那枚黑戒指，有一絲微弱的光在流轉。',
    choices: [
      {
        text: '把他背回鎮上。',
        out: {
          text: '他比看上去輕。一路上，他昏昏沉沉地說胡話：什麼「三年」、「老師」、「戒指」。\n\n到了鎮口，他醒了，自己掙扎著下來。\n\n「我欠你一次。」他說，然後頭也不回地走了。',
          effects: [['days', 2], ['favor', 'lin_chen', 25], ['meet', 'lin_chen'], ['flag', 'lin_saved'], ['mind', 4], ['log', '把林塵從崖下背了回來']],
        },
      },
      {
        text: '留下乾糧和傷藥。',
        out: {
          text: '你把乾糧放在他身邊。他沒道謝，但也沒推開。',
          effects: [['favor', 'lin_chen', 12], ['meet', 'lin_chen'], ['maybe', 1, [['item', 'zhixue_grass', -1]]]],
        },
      },
      {
        text: '取下那枚戒指看看。',
        karma: true,
        check: { kind: 'xinxing', diff: 7 },
        ok: {
          text: '你的手剛碰到戒指，一股陰冷的氣息直衝識海——\n\n「放肆！」一個蒼老的聲音在你腦中炸開。\n\n你踉蹌後退。戒指還在林塵手上，他昏迷著，什麼都不知道。\n\n叮——警告：檢測到不明殘魂。建議宿主遠離此人。',
          effects: [['mind', -5], ['flag', 'ring_touched'], ['meet', 'lin_chen'], ['sysexp', 8]],
        },
        fail: {
          text: '一股陰冷的力量順著指尖鑽進經脈。你慘叫一聲，在地上滾了半天才緩過來。\n\n叮——警告：檢測到不明殘魂。',
          effects: [['hurt', 1], ['mind', -8], ['flag', 'ring_touched'], ['meet', 'lin_chen']],
        },
      },
      { text: '不關我的事。', out: { text: '你繞開了。走出很遠，回頭看，他還躺在那裡。' } },
    ],
  },

  {
    id: 'hill_stele',
    trigger: 'explore',
    poi: 'stele',
    nodes: H,
    once: true,
    title: '斷碑',
    text: '半山腰的樹叢裡，藏著一塊斷了半截的石碑。\n\n碑上的字被風雨磨得模糊，你只辨認出開頭幾個：「……天道有缺，命簿有漏……」\n\n叮——檢測到與本系統相關的資訊殘留。',
    choices: [
      {
        text: '拓下碑文，慢慢參悟。',
        check: { kind: 'wuxing', diff: 6 },
        ok: {
          text: '你在碑前坐了三天。字跡漸漸清晰，又漸漸模糊。最後你只記住了一句：\n\n「命外之人，可問天道。」',
          effects: [['days', 3], ['insight', 2], ['sysexp', 15], ['flag', 'stele_read'], ['log', '在青石山斷碑前參悟三日']],
        },
        fail: {
          text: '三天下來，你只覺得頭昏腦脹，碑上的字像蟲子一樣爬來爬去。',
          effects: [['days', 3], ['insight', 1], ['sysexp', 5]],
        },
      },
      { text: '記下位置，以後再說。', out: { text: '你在旁邊的樹上刻了個記號。', effects: [] } },
    ],
  },

  {
    id: 'hill_lightning_tree',
    trigger: 'explore',
    poi: 'lightning_tree',
    nodes: H,
    once: true,
    title: '雷擊木',
    text: '山坳裡有一株被雷劈開的老桃樹。焦黑的樹幹上，隱隱有細小的電光遊走。\n\n樹根旁邊，有一道裂縫，往山腹裡延伸。冷風從裡面吹出來。',
    choices: [
      {
        text: '砍下一段雷擊木。',
        check: { kind: 'gengu', diff: 5 },
        ok: { text: '你砍下一截手臂粗的雷擊木，用布包好。', effects: [['item', 'lightning_wood', 1], ['flag', 'cave_hint']] },
        fail: {
          text: '電光順著刀身竄上來，你整條手臂麻了半天。不過，木頭還是砍下來了。',
          effects: [['item', 'lightning_wood', 1], ['mind', -2], ['flag', 'cave_hint']],
        },
      },
      {
        text: '探一探那道裂縫。',
        show: (s) => !flag(s, 'cave_found'),
        out: { text: '裂縫很窄，只容一人側身通過。裡面黑漆漆的，有風。', effects: [['flag', 'cave_hint']], goto: 'hill_cave' },
      },
    ],
  },

  {
    id: 'hill_cave',
    trigger: 'explore',
    poi: 'cave_entrance',
    nodes: H,
    priority: 6,
    cond: (s) => flag(s, 'cave_hint') && !flag(s, 'cave_found'),
    title: '山腹',
    steps: {
      start: {
        text: (s) =>
          `${has(s, 'beggar_map') ? '你對照著老乞丐給的紙片，在雷擊木下找到了那道裂縫。\n\n' : ''}你側著身子，在黑暗裡往山腹深處走了很久。\n\n盡頭是一扇半掩的石門。門上刻著四個古篆：\n\n「後來者，止步。」\n\n叮——前方有陣法殘留。危險等級：中。`,
        choices: [
          {
            text: '推門。',
            check: { kind: 'jiyuan', diff: 5 },
            ok: { text: '石門無聲地滑開。門上的陣紋閃了閃，熄滅了——年代太久，早已失效。', next: 'inner' },
            fail: { text: '門開的瞬間，一道劍氣迎面斬來！你本能地側身，肩頭還是被削去了一片皮肉。', effects: [['hurt', 1, '死於上古劍陣']], next: 'inner' },
          },
          {
            text: '用雷擊木試探陣法。',
            show: (s) => has(s, 'lightning_wood'),
            out: { text: '雷擊木上的電光與陣紋相觸，劈啪作響。陣法的光芒閃了閃，熄了。', effects: [['item', 'lightning_wood', -1]], next: 'inner' },
          },
          { text: '退回去。', out: { text: '你退了出來。那扇門，會一直在那裡等你。' } },
        ],
      },
      inner: {
        text: '石室不大。正中央盤坐著一具枯骨，身上的道袍早已朽爛，膝上橫著一卷竹簡。\n\n石壁上刻滿了劍痕。角落的石縫裡，長著一株紫色的靈芝，菌蓋上雲紋流轉。\n\n叮——檢測到濃郁的氣運殘留。此地機緣，似乎與某人因果相連。',
        choices: [
          {
            text: '竹簡和靈芝，全部帶走。',
            karma: true,
            out: {
              text: '你向枯骨拜了三拜，取走了竹簡和紫雲芝。\n\n轉身的時候，你似乎聽見一聲嘆息。\n\n也許是風。',
              effects: [
                ['item', 'book_qingyuan', 1], ['item', 'ziyun_zhi', 1], ['flag', 'cave_found'], ['flag', 'lin_opportunity_taken'],
                ['favor', 'lin_chen', -10], ['discover', 'hidden_cave'], ['sysexp', 15], ['log', '在山腹洞府得到前輩遺澤'],
              ],
            },
          },
          {
            text: '先安葬前輩，只帶走竹簡。',
            karma: true,
            out: {
              text: '你在石室外挖了個坑，將前輩的遺骨安葬。立碑時才發現，竹簡下壓著一行小字：\n\n「得吾劍者，當護一方。」\n\n那株靈芝，你沒有動。有些東西，或許是留給別人的。',
              effects: [
                ['days', 1], ['item', 'book_qingyuan', 1], ['flag', 'cave_found'], ['flag', 'cave_buried'], ['flag', 'ziyun_left'],
                ['mind', 8], ['insight', 2], ['discover', 'hidden_cave'], ['sysexp', 15], ['log', '安葬了山腹洞府中的無名前輩'],
              ],
            },
          },
        ],
      },
    },
  },

  {
    id: 'hill_snake',
    trigger: 'explore',
    mob: true,
    nodes: H,
    cooldown: 90,
    weight: 6,
    cond: (s) => season(s) === 'summer' || season(s) === 'autumn',
    title: '青鱗蛇',
    text: '你剛撥開一叢灌木，一條手臂粗的青鱗蛇就從樹上垂了下來，蛇信子幾乎舔到你的鼻尖。',
    choices: [
      {
        text: '出手斬蛇。',
        check: { kind: 'power', diff: 24 },
        ok: { text: '刀光一閃，蛇頭落地。你剖出蛇膽，用油紙包好。', effects: [['item', 'snake_gall', 1]] },
        fail: {
          text: '你慢了一步，手腕上多了兩個血洞。',
          effects: [(s, ctx, r) => {
            if (s.player.items.detox_pill) {
              s.player.items.detox_pill -= 1;
              if (!s.player.items.detox_pill) delete s.player.items.detox_pill;
              r.chips.push({ text: '自動服下解毒丹', tone: 'neutral' });
            } else {
              r.chips.push({ text: '中毒', tone: 'bad' });
              s.player.injury = Math.min(3, s.player.injury + 1);
              s.player.injuryDays = 30;
            }
          }],
        },
      },
      { text: '慢慢後退。', out: { text: '你一點一點地往後挪。蛇看了你一會兒，縮回了樹上。' } },
    ],
  },

  {
    id: 'hill_mist',
    trigger: 'explore',
    nodes: H,
    cooldown: 45,
    weight: 5,
    title: '山霧',
    text: (s) =>
      variant(s, [
        '起霧了。三步之外就什麼也看不見，連自己的腳都是模糊的。',
        '山霧從谷底漫上來，像一鍋煮沸的牛奶。你迷路了。',
      ]),
    choices: [
      {
        text: '原地靜坐，等霧散。',
        check: { kind: 'xinxing', diff: 5 },
        ok: { text: '你在霧中靜坐了一夜。萬籟俱寂，心裡也跟著靜了。天亮時霧散了，你覺得自己好像明白了什麼。', effects: [['days', 1], ['insight', 1], ['mind', 3]] },
        fail: { text: '你坐不住。總覺得霧裡有東西在看你。', effects: [['days', 1], ['mind', -2]] },
      },
      {
        text: '憑感覺往下走。',
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '你誤打誤撞，走到了一處從沒來過的山坳。', effects: [['explore', 6], ['item', 'ningqi_grass', 2]] },
        fail: { text: '你在霧裡兜了兩天圈子，又回到了原地。', effects: [['days', 2]] },
      },
    ],
  },

  {
    id: 'crane_return',
    trigger: 'scheduled',
    title: '鶴歸',
    cond: (s) => flag(s, 'crane_saved'),
    text: '一聲清唳從雲中傳來。\n\n一隻雪白的大鶴落在你面前，頸上多了一圈金色的羽毛。牠歪著頭看你，眼神你很熟悉。\n\n是當年那隻白鶴。牠開了靈智。\n\n牠低下頭，把嘴裡銜著的東西放在你腳邊：一株紫色的靈芝。',
    choices: [
      {
        text: '摸摸牠的頭。',
        out: {
          text: '牠讓你摸了。然後振翅而起，在你頭頂繞了三圈，飛走了。\n\n叮——檢測到善緣回響。',
          effects: [['item', 'ziyun_zhi', 1], ['mind', 6], ['sysexp', 10], ['flag', 'crane_friend'], ['log', '當年救下的白鶴回來報恩']],
        },
      },
    ],
  },
];
