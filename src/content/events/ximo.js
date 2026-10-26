// 西漠 (0.22): the desert past 西風口. What the sand itself does to you — the
// noon sun, a sandstorm, the quicksand — and 禿鷲寨: its men on the caravan
// road, and their master in his fort of mud.
import { has, flag, variant, mpNow } from '../helpers.js';
import { weatherNow, hoursToClear } from '../../world/weather.js';

/** Out on the sand, where the sky wears on you (world/explore.js exposure: not in the town, the fort or the canyon). */
const OPEN = ['ximo_wilds', 'gobi', 'quicksand', 'lost_city', 'wanghe_terrace'];
const GOBI = ['gobi'];
const QUICK = ['qs_a', 'qs_b', 'qs_c', 'qs_d', 'qs_e', 'qs_f', 'qs_g', 'qs_h'];
/** A body art you have (輕身術, 踏雲步). */
const knows = (s, art) => (s.player.arts || []).includes(art);

export default [
  // ── the noon sun ──
  {
    id: 'xm_heat',
    trigger: 'sky',
    nodes: OPEN,
    cooldown: 1,
    cond: (s) => !!weatherNow(s).heat,
    title: '烈日',
    text: (s) =>
      variant(s, [
        '日頭正當頭，沙子燙得隔著鞋底都烙腳。你的嘴唇早就裂了，舌頭乾得像一塊皮子；眼前的沙丘一晃一晃的，像隔著一層水。\n\n再這麼走下去，你會倒在這裡。',
        '天上一絲雲也沒有。太陽白得發黑，曬得你頭皮發麻，汗一出來就乾了，只在衣服上留下一圈一圈的白鹽。\n\n你的腿開始發軟。',
        '你停下來喘氣，發現自己已經好一會兒沒出汗了。耳朵裡嗡嗡地響，遠處的沙丘上，好像有一片湖。\n\n那不是湖。',
      ]),
    choices: [
      {
        text: '喝幾口水。',
        show: (s) => has(s, 'water_skin'),
        out: { text: '你拔開水囊，灌了幾大口。水是溫的，帶著羊皮的膻味——可你這輩子沒喝過這麼好的東西。眼前的沙丘不晃了。', effects: [['item', 'water_skin', -1], ['hp', 0.1], ['shade']] },
      },
      {
        text: '服一顆冰心丹。',
        show: (s) => has(s, 'bingxin_pill'),
        out: { text: '丹藥入口，一股涼氣從舌根一直沉到丹田。日頭還是那個日頭，可曬在身上，像隔了一層冰。', effects: [['item', 'bingxin_pill', -1], ['buff', 'bingxin', 3], ['shade']] },
      },
      {
        text: '嚼幾顆沙棘果。',
        show: (s) => has(s, 'shaji', 2),
        out: { text: '酸得你整張臉都皺了起來。嘴裡生了津，喉嚨裡那團火總算壓下去一些。', effects: [['item', 'shaji', -2], ['shade', 0.6]] },
      },
      {
        text: '運起靈力，把暑氣壓下去。',
        show: (s) => s.player.realm >= 1,
        need: (s) => (mpNow(s) >= 20 ? null : '靈力不足（需 20）'),
        out: { text: '你一邊走，一邊運轉周天，把一股一股的燥熱逼出體外。到了日頭偏西，丹田空了一大截，人總算沒有倒下。', effects: [['mp', -20], ['shade']] },
      },
      {
        text: '找個沙丘背陰的地方，躺到太陽偏西。',
        out: {
          text: '你在一道沙丘的背陰面刨了個淺坑，躺了進去。底下的沙是涼的。你閉著眼，聽著風從沙丘頂上吹過去，一直躺到日頭偏西。',
          effects: (s) => [['hours', Math.max(1, Math.ceil(16 - (s.tod ?? 12)))], ['hp', 0.1], ['shade']],
        },
      },
      {
        text: '咬著牙接著走。',
        check: { kind: 'gengu', diff: 7 },
        ok: { text: '你把衣襟拉起來蒙住頭，一步一步往前挪。不知道走了多久，日頭總算偏西了。你還站著。', effects: [['shade']] },
        fail: {
          text: '走著走著，腳下的沙子忽然翻了起來，撲到你臉上——你倒了。\n\n醒來的時候，太陽已經落了。你趴在沙上，嘴裡全是沙子，渾身燙得像一塊炭。',
          effects: [['wound', 0.35], ['hours', 3], ['hurt', 1, '渴死在沙海裡'], ['shade']],
        },
      },
    ],
  },

  // ── a sandstorm ──
  {
    id: 'xm_sandstorm',
    trigger: 'sky',
    nodes: OPEN,
    cooldown: 1,
    cond: (s) => !!weatherNow(s).sand,
    title: '沙暴',
    text: (s) =>
      variant(s, [
        '天邊先是黃了，然後黑了。風一下子大起來，沙子打在臉上像針扎；天地之間只剩一片昏黃，你連自己伸出去的手都快看不見了。\n\n沙暴。',
        '沙丘頂上揚起的白煙越來越高，連成了一堵牆，朝你壓了過來。轉眼之間，太陽就不見了。\n\n沙暴。',
      ]),
    choices: [
      {
        text: '找個沙丘背風的地方蹲下，等它過去。',
        out: {
          text: '你背對著風，蜷在沙丘底下，把衣襟蒙在頭上。沙子一層一層地蓋上來，你一次一次地抖掉。風吼了不知多久，總算小了。',
          effects: (s) => [['hours', Math.max(1, hoursToClear(s))], ['wound', 0.08], ['shade']],
        },
      },
      {
        text: '放出神識，摸著方向走。',
        show: (s) => s.player.realm >= 1,
        need: (s) => (mpNow(s) >= 15 ? null : '靈力不足（需 15）'),
        out: { text: '你閉上眼，神識鋪了出去。風沙裡，沙丘的起伏、腳下的硬地、遠處的一塊石頭，一一浮現出來。你就這麼閉著眼，一步一步走了出去。', effects: [['mp', -15], ['shade']] },
      },
      {
        text: '頂著風往前闖。',
        check: { kind: 'gengu', diff: 8 },
        ok: { text: '你低著頭，一步一步頂著風走。沙子灌進領口、袖口、鞋裡。等風小下來，你回頭看，自己的腳印已經一個也不剩了。', effects: [['wound', 0.06], ['shade']] },
        fail: {
          text: '一陣風把你掀翻在地。你爬起來，又被掀翻。等風過去，你已經不知道自己在哪裡了：渾身是傷，水囊也不知被吹到了哪裡。',
          effects: [['wound', 0.3], ['hours', 4], ['item', 'water_skin', -1], ['hurt', 1, '埋在了沙暴裡'], ['shade']],
        },
      },
    ],
  },

  // ── the quicksand ──
  {
    id: 'xm_quicksand',
    trigger: 'explore',
    poi: QUICK,
    auto: true,
    nodes: ['quicksand'],
    title: '流沙',
    text: (s) =>
      variant(s, [
        '腳下的沙忽然一軟，你的腿一下子陷到了膝蓋。你想拔出來，越動，陷得越深。\n\n流沙。',
        '沙地平得出奇。你剛覺得不對，人已經往下沉了——沙子像水一樣，慢慢地漫過你的小腿、你的大腿。\n\n流沙。',
      ]),
    choices: [
      {
        text: '提氣，拔身而起。',
        show: (s) => knows(s, 'qingshen') || knows(s, 'tayun'),
        need: (s) => (mpNow(s) >= 10 ? null : '靈力不足（需 10）'),
        out: { text: '你一口氣提上來，腳下一點——沙子「噗」的一聲，把你吐了出來。你在沙面上連點幾步，落到了硬地上。', effects: [['mp', -10]] },
      },
      {
        text: '往後一倒，平躺在沙上，一點一點挪出去。',
        check: { kind: 'wuxing', diff: 6 },
        ok: { text: '越掙扎，沉得越快——你往後一倒，張開手腳平躺在沙上，下沉停住了。你一寸一寸地往外挪，挪了半個時辰，總算摸到了硬地。', effects: [['hours', 1]] },
        fail: { text: '你往後一倒，沙子卻漫上了你的胸口。你拚命地划，拚命地爬；等爬出來，已經精疲力竭，身上的東西也掉了好幾樣。', effects: [['wound', 0.2], ['hours', 2], ['maybe', 0.5, [['halfls']]]] },
      },
      {
        text: '拚命掙出來。',
        check: { kind: 'gengu', diff: 8 },
        ok: { text: '你咬緊牙關，一條腿一條腿地往外拔。沙子死死地吸著你；你拔出來的時候，鞋子沒了一隻。', effects: [['wound', 0.05]] },
        fail: {
          text: '你越掙扎，沉得越快。沙子漫過了你的胸口、你的肩膀、你的下巴——\n\n不知過了多久，你被什麼東西從沙裡拖了出來，扔在了硬地上。你回頭看，沙面平平的，什麼也沒有。',
          effects: [['wound', 0.4], ['hours', 3], ['hurt', 1, '沉進了流沙'], ['halfls']],
        },
      },
    ],
  },

  // ── 禿鷲寨 ──
  {
    id: 'xm_bandits',
    trigger: 'explore',
    mob: true,
    nodes: ['gobi', 'ximo_wilds'],
    cooldown: 2,
    cond: (s) => !flag(s, 'vulture_done'),
    title: '沙盜',
    text: '三個蒙著臉的人從土台後面轉了出來，手裡的彎刀明晃晃的。\n\n「過路的，」為首的拉下蒙臉布，露出一口黃牙，「這是禿鷲寨的地界。三十塊靈石，買你一條路。」',
    choices: [
      {
        text: '給他三十塊靈石。',
        show: (s) => s.player.ls >= 30,
        out: { text: '為首的掂了掂錢袋，咧嘴一笑，讓開了路：「識相。」', effects: [['ls', -30]] },
      },
      {
        text: '動手。',
        check: { kind: 'power', diff: 120 },
        fight: { foes: [['sand_bandit', 3]], close: true },
        ok: { text: '最後一個沙盜扔下刀，跑得比沙狼還快。地上落著一個錢袋，和一把豁了口的彎刀。', effects: [['ls', [15, 30]], ['flag', 'beat_sand_bandits'], ['sysexp', 4]] },
        fail: { text: '彎刀從四面八方砍過來。你倒在沙地上；他們搜走了你身上一半的靈石，臨走還踢了你兩腳。', effects: [['hurt', 1], ['halfls']] },
      },
      {
        text: '「康家駝隊的人，你們也敢攔？」',
        show: (s) => flag(s, 'kang_friend'),
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '為首的愣了一下，啐了一口：「算你運氣好。」三個人退回了土台後面。', effects: [] },
        fail: { text: '「康駝頭？」為首的大笑，「康駝頭的駝隊，也得給禿鷲爺爺交錢！」他們搜走了你身上一半的靈石。', effects: [['halfls']] },
      },
      {
        text: '轉身就跑。',
        check: { kind: 'jiyuan', diff: 6 },
        run: true,
        ok: { text: '你轉身鑽進沙丘之間，七拐八拐，把他們甩在了後頭。', effects: [] },
        fail: { text: '沙地上跑不快。他們追上來，把你按在地上搜了個遍。', effects: [['hurt', 1], ['halfls']] },
      },
    ],
  },

  {
    id: 'xm_vulture',
    trigger: 'explore',
    mob: true,
    nodes: GOBI,
    cond: (s) => !flag(s, 'vulture_done'),
    title: '禿鷲',
    steps: {
      start: {
        text: (s) =>
          (flag(s, 'beat_sand_bandits')
            ? '寨子裡的人一見你，全拔出了刀。\n\n一個高大的漢子從土屋裡走出來：黑布纏頭，黑布蒙臉，背上一把彎刀，比別人的長出一半。他走到你面前站定，上下打量著你。\n\n「戈壁上打我兄弟的，就是你？」他的聲音從蒙臉布後面傳出來，悶悶的。「好。我禿鷲在這片戈壁上二十年，還沒人敢打上門來。」'
            : '寨子裡的人一見你，全拔出了刀。\n\n一個高大的漢子從土屋裡走出來：黑布纏頭，黑布蒙臉，背上一把彎刀，比別人的長出一半。他走到你面前站定，上下打量著你。\n\n「東邊來的修士？」他說，「到我禿鷲寨來，做什麼？」') + '\n\n他身上的靈壓，是築基。',
        choices: [
          {
            text: '「你的人在駝道上劫道。我來討個說法。」',
            check: { kind: 'power', diff: 230 },
            fight: { foes: [['vulture', 1]], close: true },
            ok: {
              text: '禿鷲的彎刀脫了手，插在沙地上。他單膝跪下，扯掉蒙臉布，吐了一口血沫，抬頭看著你。\n\n那是一張被風沙刻得溝溝壑壑的臉，左邊臉頰上一道刀疤，一直劃到嘴角。\n\n「要殺就殺。」',
              next: 'beaten',
            },
            fail: { text: '禿鷲的刀太快了。你只看見一道白光，人就飛了出去。\n\n醒來時，你被扔在了戈壁邊上，身上的東西被翻過一遍。風裡，還聽得見寨子裡的笑聲。', effects: [['hurt', 2, '死在禿鷲的刀下'], ['halfls']] },
          },
          { text: '退出寨子。', out: { text: '禿鷲沒有追。他抱著胳膊站在寨門口，看著你走遠，在你背後笑了一聲。', effects: [] } },
        ],
      },
      beaten: {
        text: '寨子裡的沙盜圍成了一圈，沒有一個人敢上前。',
        choices: [
          {
            text: '「我不殺你。駝道上的事，從今往後，到此為止。」',
            out: {
              text: '禿鷲看了你很久。\n\n「好。」他站起來，拔出插在地上的刀，雙手捧著遞給你，「禿鷲寨的刀，從今往後不碰駝隊。你什麼時候覺得我說話不算話，就拿這把刀砍我的頭。」\n\n你沒有接。他把刀插回背上，轉身對手下吼了一聲。那天晚上，禿鷲寨的人把搶來的貨，一駝一駝地送回了月泉。',
              effects: [['flag', 'vulture_done'], ['flag', 'vulture_spared'], ['mind', 5], ['sysexp', 30], ['log', '在禿鷲寨打敗了禿鷲，饒了他一命：駝道從此太平']],
            },
          },
          {
            text: '一刀了結他。',
            karma: true,
            out: {
              text: '你的刀落了下去。\n\n寨子裡的沙盜一哄而散，牽著駱駝，往四面八方逃進了沙海。你在禿鷲的土屋裡找到一箱靈石，還有一本賬簿，記著這些年劫過的每一支駝隊。\n\n十年前的那一頁上，有一個名字被劃了一道紅線。',
              effects: [['flag', 'vulture_done'], ['flag', 'vulture_killed'], ['ls', 120], ['mind', -6], ['sysexp', 30], ['log', '在禿鷲寨殺了禿鷲：駝道從此太平']],
            },
          },
        ],
      },
    },
  },
];
