// 白鶴渡 (東荒's side of the great river). The first time over is the end of
// 第一章: the farewells, the eye in the river, the ending screen — and then
// (1.0) the boat really does put in at 鶴歸渡 on the far bank (a 'cross'
// effect: world/atlas.js CROSSINGS, world/explore.js crossTo; it is taken
// once the ending screen is closed). After that the old ferryman takes you
// over whenever you like. He takes no one below 築基 — the thing in the river
// — but the river has other boats, for those who will chance it.
import { flag, night, variant } from '../helpers.js';
import { seeOff } from './chapter.js';

const C = ['crane_ferry'];

/** Over to 中州 (the way is world/atlas.js CROSSINGS.crane_ferry). */
const over = [['cross', 'crane_ferry'], ['flag', 'zhongzhou_crossed']];
/** The first time over, however you went: 第一章 is done, and the ending screen comes up before the boat puts in. */
const chapterEnd = (s, log) => (flag(s, 'chapter1_done') ? [] : [['flag', 'chapter1_done'], ['flag', 'chapter1_ending'], ['sysexp', 50], ['log', log]]);

export default [
  {
    id: 'ferry_arrive',
    trigger: 'arrive',
    nodes: C,
    once: true,
    title: '白鶴渡',
    text: '大江橫在眼前，寬得看不見對岸。江面上霧氣蒸騰，偶爾有一兩隻白鶴從霧裡飛出來，又飛回霧裡。\n\n渡口只有一條船，船頭坐著一個戴斗笠的老船夫，正在抽旱煙。\n\n「去中州？」他頭也不抬，「江裡有東西，築基以下，老頭子不載。」',
    choices: [
      {
        text: '「江裡有什麼？」',
        out: {
          text: '老船夫吐了個煙圈：「上個月有個煉氣九層的愣頭青，自己御劍過江。」\n\n「然後呢？」\n\n「然後江裡的東西，打了個飽嗝。」',
          effects: [['sysexp', 5]],
        },
      },
    ],
  },

  {
    id: 'ferry_cross',
    trigger: 'explore',
    poi: 'ferry_pier',
    nodes: C,
    priority: 10,
    cond: (s) => s.player.realm >= 2 && !flag(s, 'chapter1_done'),
    title: '過江',
    text: (s) =>
      [
        '老船夫看了你一眼，把旱煙在船舷上磕了磕：「築基了？上船吧。」',
        ...seeOff(s),
        '船離了岸。東荒在身後，一點一點沉進霧裡：青石山、黑風林、落霞坊市的燈火……你在那裡活了一場。',
        '船行到江心，霧氣忽然散開。你看見江底有一隻比山還大的眼睛，緩緩睜開，看了你一眼，又緩緩閉上了。',
        '對岸，是連綿不絕的城池與山峰，無數道劍光在雲間穿梭，像一場永不停歇的流星雨。\n\n中州。',
      ].join('\n\n'),
    choices: [
      {
        text: '踏上中州的土地。',
        out: {
          text: '叮——恭喜宿主完成第一章「東荒」。\n\n船頭輕輕一震，靠上了對岸的棧橋。',
          effects: (s) => [...chapterEnd(s, '渡過大江，到了中州。第一章「東荒」完'), ...over],
        },
      },
    ],
  },

  // ── after the first time: over whenever you like (an old save that saw the ending before 1.0 was brought back; now it goes) ──
  {
    id: 'ferry_again',
    trigger: 'explore',
    poi: 'ferry_pier',
    nodes: C,
    priority: 10,
    cond: (s) => s.player.realm >= 2 && flag(s, 'chapter1_done'),
    title: '過江',
    text: (s) =>
      flag(s, 'zhongzhou_crossed')
        ? variant(s, [
            '老船夫把旱煙在船舷上磕了磕：「過江？」',
            '老船夫正在補漁網，看見你，把網往船艙裡一塞：「又要過去了？」',
            '老船夫躺在船艙裡打盹，斗笠蓋在臉上。你還沒開口，斗笠底下就傳出一句：「上船。」',
          ])
        : '老船夫看見你，把旱煙在船舷上磕了磕：「上回送你到江心，又把你送了回來。」他咧嘴一笑，「我說過，中州不急，它又不會跑。」\n\n「現在呢？」\n\n「現在，它也沒跑。」\n\n叮——中州地圖推演完成。本系統建議宿主：對岸是大地方，遍地都是氣運之子。低調。',
    choices: [
      {
        text: '上船，過江。',
        out: {
          text: (s) =>
            night(s)
              ? '船離了岸。夜裡的江面黑得像墨，只有船頭一盞風燈，照著三尺遠的霧。\n\n江心那一段，船底下有什麼東西翻了個身。老船夫的櫓停了一停，又搖了起來。'
              : variant(s, [
                  '船離了岸。白鶴從霧裡飛出來，跟著船飛了一程，又飛回霧裡去了。',
                  '船離了岸。老船夫一路不說話，只是搖櫓。江心那一段，他把旱煙也掐了。',
                  '船離了岸。霧氣一層一層地合上來，東荒不見了；又一層一層地散開，對岸的城牆露了出來。',
                ]),
          effects: over,
        },
      },
      { text: '改天吧。', out: {} },
    ],
  },

  {
    id: 'ferry_wait',
    trigger: 'explore',
    poi: 'ferry_pier',
    nodes: C,
    cooldown: 20,
    cond: (s) => s.player.realm < 2,
    title: '江邊',
    text: (s) =>
      flag(s, 'crane_friend')
        ? '你坐在江邊發呆。一隻頸上有金羽的白鶴落在你身邊，陪你看了一下午的江。\n\n「你也想去對岸看看嗎？」你問牠。\n\n牠歪著頭看你，像是在說：等你築基了，我們一起去。'
        : '你坐在江邊，看著霧氣裡若隱若現的對岸。\n\n老船夫說：「築基了再來。」\n\n你點點頭。江風很大，吹得人眼睛發酸。',
    choices: [
      { text: '回去修煉。', out: { effects: [['mind', 2]] } },
      // (1.0) no wall in the way: the ferryman will not take you, but 劉家's night barge will — and the river may not let you by
      {
        text: '去下游找劉家的貨船（十塊靈石，江裡有東西）。',
        need: (s) => (s.player.ls >= 10 ? null : '靈石不足（需 10）'),
        check: { kind: 'xinxing', diff: 6 },
        ok: {
          text: '劉家的貨船半夜才開。船老大收了你十塊靈石，把你塞進艙底，跟一堆麻袋擠在一起：「江心那一段，不管聽見什麼，都別出聲。」\n\n船到江心，四下裡忽然靜了。船底下有什麼東西慢慢地游過去，游了很久很久，久得你以為牠沒有盡頭。艙板縫裡透進一點光——是一隻眼睛，比這條船還大。\n\n你屏住了氣，一動不動。\n\n那隻眼睛看了一會兒，閉上了。\n\n天亮的時候，船靠了岸。船老大掀開艙板，臉色比你還白：「到了。中州。」',
          effects: (s) => [['ls', -10], ['mind', 3], ...chapterEnd(s, '搭劉家的貨船偷渡大江，到了中州。第一章「東荒」完'), ['flag', 'zz_smuggled'], ...over],
        },
        fail: {
          text: '劉家的貨船半夜才開。船老大收了你十塊靈石，把你塞進艙底：「江心那一段，不管聽見什麼，都別出聲。」\n\n船到江心，艙板縫裡透進一點光——是一隻眼睛，比這條船還大。你沒忍住，倒抽了一口氣。\n\n下一刻，整條船被頂得飛了起來。\n\n……\n\n你醒過來的時候，趴在白鶴渡下游的蘆葦叢裡，嘴裡全是泥沙。貨船不見了，船老大也不見了。\n\n老船夫蹲在旁邊抽旱煙：「說了，築基以下，不載。」',
          effects: [['ls', -10], ['wound', 0.45], ['hours', 6], ['log', '偷渡大江，船在江心翻了，被沖回白鶴渡']],
        },
      },
    ],
  },

  {
    id: 'ferry_crate',
    trigger: 'explore',
    nodes: C,
    cooldown: 60,
    weight: 6,
    cond: (s) => s.tod >= 6 && s.tod < 19,
    title: '浮箱',
    text: '江水把一隻木箱沖上了岸，卡在蘆葦叢裡。箱子上的漆已經泡掉了，鎖倒是還在。',
    choices: [
      {
        text: '撬開看看。',
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '箱子裡墊著油布，油布裡裹著兩個瓷瓶。拔開塞子一聞——是聚氣丹。不知道是哪條沉船上的。', effects: [['item', 'juqi_pill', 2]] },
        fail: { text: '箱子裡是半箱泡爛的書，字都糊了。你翻了半天，翻出一條死魚。', effects: [['mind', -1]] },
      },
      {
        text: '交給渡口的船家。',
        out: { text: '船家看了看箱子上的記號：「上游劉家貨棧的。」他咧嘴一笑，「我替你捎回去，劉掌櫃最講究，少不了你的好處。」\n\n過了幾天，劉家真托人捎來了三塊靈石。', effects: [['ls', 3], ['mind', 2]] },
      },
      { text: '不關我的事。', out: { text: '你看著箱子在蘆葦叢裡一起一伏，走開了。' } },
    ],
  },
];
