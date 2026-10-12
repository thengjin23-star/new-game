// Up where no road goes: 孤鶴峰, 江心洲, 斷劍峰 — reached by flying, or
// (the sandbar) on 踏雲步's leaps. See world/air.js and the AIRY places in
// world/geo.js.
import { flag } from '../helpers.js';

const knows = (s, id) => (s.player.arts || []).includes(id);

export default [
  // ── 孤鶴峰 ──
  {
    id: 'air_crane_arrive',
    trigger: 'arrive',
    nodes: ['crane_peak'],
    once: true,
    title: '孤鶴峰',
    text: '你落在峰頂。\n\n這是一塊像被削平了的石台，四面都是絕壁。往下看，青石山像一圈皺起來的綠綢子，青石鎮小得像一把撒在地上的米，斷魂崖不過是一道淺淺的摺痕。\n\n風很大。峰頂背風的石凹裡，有一個枯枝搭成的大巢；巢對面的石壁上，好像刻著什麼。',
    choices: [
      {
        text: '在峰頂坐一會兒。',
        out: {
          text: '你在峰頂坐了很久。從這裡看下去，那些讓你夜裡睡不著的事，都小得看不見了。',
          effects: [['mind', 4], ['sysexp', 10], ['log', '飛上孤鶴峰']],
        },
      },
    ],
  },

  {
    id: 'air_crane_friend',
    trigger: 'explore',
    poi: 'crane_nest',
    nodes: ['crane_peak'],
    once: true,
    priority: 10,
    cond: (s) => flag(s, 'crane_friend'),
    title: '鶴巢',
    text: '巢邊站著一隻雪白的大鶴，頸上一圈金羽。\n\n是牠。\n\n牠看見你，先是一愣，然後長唳一聲，張著翅膀朝你走過來，像是在問：你怎麼也上來了？',
    choices: [
      {
        text: '「我也會飛了。」',
        out: {
          text: '牠繞著你走了兩圈，低頭在巢裡翻了翻，銜出一根長長的翎羽，放進你手裡。\n\n翎羽是白的，羽根卻是金的，摸上去暖暖的。\n\n叮——檢測到善緣回響。',
          effects: [['item', 'crane_plume', 1], ['mind', 4], ['sysexp', 10], ['log', '在孤鶴峰重逢金頸白鶴']],
        },
      },
    ],
  },

  {
    id: 'air_crane_nest',
    trigger: 'explore',
    poi: 'crane_nest',
    nodes: ['crane_peak'],
    cooldown: 10,
    cond: (s) => !flag(s, 'crane_friend'),
    title: '鶴巢',
    text: '巢裡臥著兩枚青白色的蛋。一隻白鶴單腳立在巢邊，歪著頭打量你，喉嚨裡發出低低的咕嚕聲。',
    choices: [
      {
        text: '遠遠坐下，陪牠看雲。',
        check: { kind: 'xinxing', diff: 5 },
        ok: {
          text: '你在離巢三丈遠的地方坐下，一動也不動。白鶴盯了你半個時辰，終於把另一隻腳也放下來，開始梳理羽毛。\n\n雲從你們腳下流過去。你忽然覺得，自己好像也輕了一些。',
          effects: [['insight', 1], ['mind', 3]],
        },
        fail: {
          text: '你坐不住，一會兒想看看蛋，一會兒想摸摸牠。白鶴不耐煩地拍著翅膀，把你趕到了石台的另一頭。',
          effects: [['mind', -1]],
        },
      },
      {
        text: '伸手去摸鶴蛋。',
        out: {
          text: '你的手還沒碰到蛋，白鶴一嘴啄了下來，正啄在你手背上。\n\n那一嘴，比劫修的刀還準。',
          effects: [['hurt', 1], ['mind', -2]],
        },
      },
      { text: '不打擾牠。', out: { text: '你悄悄退開了。白鶴看著你走遠，才又把頭埋進翅膀裡。' } },
    ],
  },

  {
    id: 'air_tayun',
    trigger: 'explore',
    poi: 'crane_carving',
    nodes: ['crane_peak'],
    cooldown: 3,
    cond: (s) => !knows(s, 'tayun'),
    title: '石壁刻痕',
    text: (s) =>
      '石壁上刻著一串腳印，從左到右，一步比一步淺。最後一步淺得幾乎看不見，像是踩在雲上。\n\n腳印旁邊刻著幾行小字，被風磨得只剩一半：「……身如浮雲……足不沾塵……一步一雲……」' +
      (s.player.realm < 1 ? '\n\n你看了半天，只覺得腳底發癢。這是要靈力才走得動的步子。' : ''),
    choices: [
      {
        text: '照著腳印走一遍。',
        need: (s) => (s.player.realm >= 1 ? null : '需引氣入體'),
        check: { kind: 'wuxing', diff: 5 },
        ok: {
          text: '你踩上第一個腳印，提一口靈力；第二個，再提一口……走到第七步，你忽然覺得腳下一空——不是踩空，是身子輕得踩不實了。\n\n你在石台上來回走了一整天，直到能踏著風，從石台這頭一步跨到那頭。',
          effects: [['tech', 'tayun'], ['days', 1], ['sysexp', 15], ['log', '在孤鶴峰石壁上悟得踏雲步']],
        },
        fail: {
          text: '你照著走了一遍又一遍，腳印是踩對了，那股「輕」卻始終找不到。\n\n天黑了。你把腳印的樣子記在心裡，改天再來。',
          effects: [['days', 1], ['insight', 1]],
        },
      },
      { text: '記下腳印，改天再說。', out: { text: '你把腳印的樣子記在心裡。' } },
    ],
  },

  // ── 江心洲 ──
  {
    id: 'air_isle_arrive',
    trigger: 'arrive',
    nodes: ['river_isle'],
    once: true,
    title: '江心洲',
    text: '沙洲不大，長滿了比人還高的蘆葦。江水從兩邊嘩嘩地流過去，兩岸都隔著一層薄霧。\n\n蘆葦叢的那一頭，有人在釣魚。',
    choices: [{ text: '走過去看看。', out: { effects: [['sysexp', 8], ['log', '到了大江中的江心洲']] } }],
  },

  {
    id: 'air_isle_fisher',
    trigger: 'explore',
    poi: 'isle_fisher',
    nodes: ['river_isle'],
    once: true,
    priority: 10,
    title: '釣魚的老翁',
    text: '老翁坐在一塊石頭上，斗笠壓得很低。他的魚竿是一根青竹，釣線垂進江裡，一動也不動。\n\n沙洲四周，沒有船。\n\n「江心洲上，從來只有白鶴，和我。」他沒有回頭，「你是飛過來的，還是跳過來的？」',
    choices: [
      {
        text: '陪他坐著，釣一會兒魚。',
        out: {
          text: '你在他身邊坐下。老翁遞給你一根竹竿，也不說話。\n\n日頭從東邊挪到西邊，你一條魚也沒釣到。老翁卻在收竿的時候，從江裡提起一條金色的大鯉魚，丟進你懷裡。\n\n「拿去吧。這江裡的魚，喝了一千年的靈氣。」',
          effects: [['item', 'golden_carp', 1], ['mind', 3], ['flag', 'isle_fisher_met']],
        },
      },
      {
        text: '問他，江裡有什麼。',
        out: {
          text: '老翁笑了一聲：「白鶴渡的老船夫沒告訴你？」\n\n他用竿子點了點江面：「江底下睡著一位老前輩，比這江還老。它不吃釣魚的人，也懶得理渡江的船。可是在它頭頂上飛來飛去的……」\n\n他沒有說完。江面上，冒起了一串氣泡。',
          effects: [['flag', 'isle_fisher_met'], ['flag', 'river_warned'], ['sysexp', 8]],
        },
      },
      {
        text: '請他帶你過江。',
        out: {
          text: '「過江？」老翁終於轉過頭來。斗笠底下是一張很普通的臉，眼睛卻亮得嚇人。\n\n「江那邊，不是你現在該去的地方。」他說，「先把這邊的事了了。」\n\n他轉回頭去，再也不理你了。',
          effects: [['flag', 'isle_fisher_met'], ['mind', 1]],
        },
      },
    ],
  },

  {
    id: 'air_isle_fisher_again',
    trigger: 'explore',
    poi: 'isle_fisher',
    nodes: ['river_isle'],
    cooldown: 30,
    cond: (s) => flag(s, 'isle_fisher_met'),
    title: '釣魚的老翁',
    text: '老翁還在釣魚，像是從上次到現在，一直沒動過。',
    choices: [
      {
        text: '陪他釣一會兒。',
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '這一次，你釣上來一條。金色的。\n\n老翁看了一眼：「運氣不錯。」', effects: [['item', 'golden_carp', 1], ['mind', 2]] },
        fail: { text: '你又是一條也沒釣到。\n\n老翁說：「釣不到魚，也是好的。」', effects: [['mind', 3]] },
      },
      { text: '不打擾他。', out: { text: '你在蘆葦叢邊站了一會兒，走開了。' } },
    ],
  },

  // ── 斷劍峰 ──
  {
    id: 'air_sword_arrive',
    trigger: 'arrive',
    nodes: ['sword_peak'],
    once: true,
    title: '斷劍峰',
    text: '你落在雲海之上。\n\n腳下的雲一直鋪到天邊，古戰場、黑風林、青雲宗的山門，全都沉在雲底下，只有幾座山尖像島一樣露出來。\n\n峰頂被一道裂口整個劈開。裂口兩邊的石頭平滑得像鏡子——不是風化出來的，是被什麼東西，一下子切開的。',
    choices: [{ text: '走近那道裂口。', out: { effects: [['sysexp', 12], ['log', '御劍登上斷劍峰']] } }],
  },

  {
    id: 'air_sword_scar',
    trigger: 'explore',
    poi: 'sword_cleft',
    nodes: ['sword_peak'],
    cooldown: 5,
    cond: (s) => !flag(s, 'sword_scar_read'),
    title: '劍痕',
    text: '你在裂口邊坐下。風從裂口深處吹上來，冷得像刀；吹久了，你竟覺得那風裡有一股意志——不甘、不屈，還有一點說不清的悲涼。\n\n這是一劍留下的。很久很久以前，有人站在這裡，向著天，斬了一劍。',
    choices: [
      {
        text: '靜坐，參悟這道劍痕。',
        check: { kind: 'wuxing', diff: 6 },
        ok: {
          text: '你閉上眼睛。\n\n恍惚間，你看見一個人站在峰頂，白衣，背著一把很長的劍。天上壓著一片黑雲，雲裡有什麼東西在看著他——像一本攤開的書。\n\n他拔劍，斬了下去。\n\n雲散了一角。劍斷了。人也不見了。\n\n你睜開眼，天已經黑了三次。\n\n叮——檢測到上古劍意殘留。宿主的感悟大幅提升。',
          effects: [['days', 3], ['insight', 3], ['xw', 150], ['sysexp', 25], ['flag', 'sword_scar_read'], ['log', '在斷劍峰的劍痕前參悟三日']],
        },
        fail: {
          text: '你坐了一天一夜，只覺得那股寒意越來越重，重得喘不過氣，不得不睜開眼睛。\n\n劍痕還是那道劍痕。也許你還不夠格看懂它。',
          effects: [['days', 1], ['insight', 1], ['mind', -1]],
        },
      },
      {
        text: '伸手探進裂口。',
        out: {
          text: '你的指尖剛探進裂口，就像被千萬根針同時扎中，一道血痕從指尖一直劃到手肘。\n\n你縮回手。傷口不深，卻冷得刺骨，三天三夜都暖不過來。',
          effects: [['hurt', 1], ['insight', 1]],
        },
      },
      { text: '離開。', out: { text: '你在裂口邊站了一會兒，轉身走開。風在你身後嗚嗚地響。' } },
    ],
  },
];
