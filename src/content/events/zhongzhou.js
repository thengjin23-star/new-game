// 中州・臨江一帶 (1.0「渡江」): the far bank of the great river. 鶴歸渡 where the
// old ferryman puts in (and takes you back to 東荒 whenever you like — the
// thing in the river does not eat those going home).
import { flag, night, variant } from '../helpers.js';

const HG = ['heguidu'];

export default [
  // ── 鶴歸渡 ──
  {
    id: 'hg_arrive',
    trigger: 'arrive',
    nodes: HG,
    once: true,
    title: '鶴歸渡',
    text: (s) =>
      [
        flag(s, 'zz_smuggled')
          ? '貨船靠上鶴歸渡下游的野岸。船老大把你推上岸，船頭一調，又鑽回霧裡去了，連句話都沒留。'
          : '船頭輕輕一震，靠上了鶴歸渡的棧橋。老船夫把纜繩往木樁上一套，打了個結：「到了。」',
        '這一頭的渡口比白鶴渡大得多。棧橋伸進江裡十幾丈，橋頭立著一塊碑，碑上兩個大字：鶴歸。岸上的茶棚裡坐滿了人，說話的口音你一半聽不懂。',
        '往東北望，是一道看不到頭的城牆，城門樓上掛著燈籠。城牆後頭，山一重疊著一重；山頂的雲裡，一道一道的劍光像流星一樣劃過去，一刻也沒停過。',
        ...(flag(s, 'crane_friend') ? ['頸上有金羽的白鶴在碑頂上落了腳，抖了抖羽毛，把頭埋進翅膀底下。看樣子，牠不打算走了。'] : []),
        '叮——第二章「中州」。',
      ].join('\n\n'),
    choices: [
      {
        text: '上岸。',
        out: {
          text: (s) =>
            flag(s, 'zz_smuggled')
              ? '你擰乾了衣角，往茶棚走去。茶棚的夥計看了你一眼：「打東荒來的？」他倒了一碗粗茶，「這年頭，偷渡過來的可不少。城裡查得緊，別說是我說的。」'
              : '老船夫蹲在船頭點旱煙：「回東荒的時候，來這裡找我。要捎什麼話，也來找我。」\n\n他頓了頓，又說：「江裡的東西，不吃往回走的人。」',
          effects: (s) => [['sysexp', 10], ['discover', 'linjiang'], ['log', '到了中州：鶴歸渡'], ...(flag(s, 'crane_friend') ? [['flag', 'crane_in_zhongzhou']] : [])],
        },
      },
    ],
  },

  {
    id: 'hg_cross',
    trigger: 'explore',
    poi: 'hg_pier',
    nodes: HG,
    priority: 10,
    title: '回東荒',
    text: (s) =>
      s.player.realm < 2
        ? '老船夫蹲在船頭抽旱煙，看了你一眼：「回東荒？築基以下，老頭子本來是不載的。」\n\n他把旱煙在船舷上磕了磕：「往回走的，倒是可以——江裡的東西，不吃往回走的人。」'
        : variant(s, [
            '老船夫蹲在船頭抽旱煙：「回東荒？」',
            '老船夫正在棧橋上曬漁網，看見你，把網一捲：「回去看看？」',
            '老船夫在船艙裡打盹。你剛走上棧橋，船艙裡就傳出一句：「上船。」',
          ]),
    choices: [
      {
        text: '上船，回東荒。',
        out: {
          text: (s) =>
            night(s)
              ? '船離了岸。夜裡的江面黑得像墨，臨江城的燈火一點一點地沉進霧裡。\n\n江心那一段，船底下有什麼東西翻了個身，又沒了動靜。'
              : variant(s, [
                  '船離了岸。中州的城牆和劍光一點一點沉進霧裡；霧散開的時候，對岸是白鶴渡的老柳樹。',
                  '船離了岸。老船夫一路不說話，只是搖櫓。快到白鶴渡的時候，他說：「東荒的豆花，比中州的好吃。」',
                ]),
          effects: [['cross', 'heguidu']],
        },
      },
      { text: '再待一陣。', out: {} },
    ],
  },
];
