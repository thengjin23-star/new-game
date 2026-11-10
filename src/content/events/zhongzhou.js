// 中州・臨江一帶 (1.0「渡江」): the far bank of the great river. 鶴歸渡 where the
// old ferryman puts in (and takes you back to 東荒 whenever you like — the
// thing in the river does not eat those going home). 臨江城 and its 天驕榜,
// where whoever you beat, the 星官 cannot find you in the book; 蘇清瑤 at the
// 榜樓 in a 星官's robe, 葉孤寒 at the gate of his sect; the storyteller who
// tells 錢半仙's tale the other way round; the old observatory and the page
// of 玄微's that was left there; a letter from 王二; and, on 七月十五 of 3022,
// the moon (only an omen, until the night itself is written: 1.3).
import { flag, night, variant, alive, met, favor, has } from '../helpers.js';
import { dayAt } from '../../core/calendar.js';
import { power } from '../../core/cultivation.js';
import { FRAGMENTS } from '../fragments.js';
import { RENT, TERMS, rentCost, extendRent, rentUntil } from '../../world/caves.js';

const HG = ['heguidu'];
const LJ = ['linjiang'];
const LD = ['linjiang_docks'];
const GS = ['guishi'];
const SG = ['shangguan'];
const GX = ['guanxing'];
const TJ = ['tianjian'];
const XJ = ['xiejia'];
const JD = ['jiangdi'];
const YM = ['yunmeng'];
const BC = ['baicao'];
const LT = ['lingtian'];
const LG = ['longji'];
const GG = ['guandao_guan'];

/** The system has woken and remembers its name: it speaks as 玄微. */
const awake = (s) => flag(s, 'sys_awakened');
/** 林塵 is in 中州 (he left 東荒 in 三月 of 3016, unless he never got the chance to). */
const linAbroad = (s) => alive(s, 'lin_chen') && !flag(s, 'lin_ruined') && s.day >= dayAt(4, 3);
/** Where he stands on the 天驕榜: he climbed it fast (a 客卿 of 上官家 from that autumn). */
const linRank = (s) => (!linAbroad(s) || s.day < dayAt(4, 9) ? null : s.day < dayAt(5, 6) ? 91 : s.day < dayAt(6, 1) ? 37 : 3);
/** 蘇清瑤 is in 臨江城 — and from 3018 a 星官 of 欽天監, keeping the 天驕榜. */
const suHere = (s) => alive(s, 'su_qingyao') && s.npcs.su_qingyao.loc === 'linjiang';
const suStar = (s) => s.day >= dayAt(6, 1);
const suFriend = (s) => flag(s, 'su_farewell');
const suRival = (s) => flag(s, 'su_rival_end') || flag(s, 'su_rival') || flag(s, 'su_enemy');
/** Who sits under the board with the book: her, once she is a 星官 and there; else a stranger. */
const boardStar = (s) => (suHere(s) && suStar(s) ? 'su' : 'other');
/** A 青雲宗 disciple — 中州 has not heard of it. */
const qingyun = (s) => flag(s, 'sect_member');
/** The night of the blood moon (1.0–1.2: only the omen; the night itself is 1.3's). */
export const BLOOD_DAY = dayAt(10, 7, 15); // (world/arcs.js WINDOWS.bloodMoon)

/** The 天驕榜 as it hangs today. */
function boardText(s) {
  const lin = linRank(s);
  const rows = ['第一名：葉孤寒（天劍宗劍子）'];
  if (lin === 3) rows.push('第三名：林塵（上官家客卿）——名字後頭，有人用小字補了一句：東荒來的。');
  if (lin === 37) rows.push('第三十七名：林塵（上官家客卿）');
  rows.push('第五十名：南宮燕（南宮家）');
  rows.push('第六十七名：謝玄朗（天劍宗外門・謝家）');
  if (lin === 91) rows.push('第九十一名：林塵（上官家客卿）');
  rows.push('第一百名：石敢當（散修）');
  if (flag(s, 'bang_blank')) rows.push('第一百零一名：　　　　（空白。旁邊蓋著欽天監的大印）');
  return rows.join('\n');
}

/** Beaten someone on the board: the 星官 looks you up in the book, and you are not in it. */
function notInBook(s) {
  if (boardStar(s) === 'su')
    return '榜下的星官拿起冊子——是蘇清瑤。她問了你的名字，一頁一頁地翻，翻到最後一頁，合上了。\n\n「查無此人。」她說，嘴角動了一下。';
  return variant(s, [
    '榜下的星官拿起冊子，問了你的名字。他翻了一頁，又翻了一頁，又翻了一頁。\n\n「……查無此人。」\n\n他把筆擱下，看了你很久：「你上不了榜。」',
    '榜下的星官翻著冊子，翻了一炷香的工夫，額頭上出了汗。\n\n「查無此人。」他說，又翻了一遍，「……查無此人。」',
  ]);
}

/** The board's challengers: [flag, place, name, what they are like, 戰力 to beat, stones]. */
const CHALLENGERS = [
  ['bang_100', '第一百名', '石敢當', '一個扛著鐵棍的大漢，築基中期，散修出身。他在第一百名上待了三年，誰來挑戰都接。', 150, 30],
  ['bang_50', '第五十名', '南宮燕', '南宮家的小姐，築基圓滿，一手軟劍使得像水一樣。她上台之前，先把你從頭到腳看了一遍。', 280, 80],
  ['bang_10', '第十名', '慕容長風', '慕容家的少主，金丹初期。他上台的時候，台下的人自己往後退了三步。', 560, 200],
];

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
          effects: (s) => [['sysexp', 10], ['discover', 'linjiang'], (x) => { x.vars.zz_first ??= x.day; }, ['log', '到了中州：鶴歸渡'], ...(flag(s, 'crane_friend') ? [['flag', 'crane_in_zhongzhou']] : [])],
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

  // a month after you first came over: the ferryman has a letter for you (王二 cannot write; 錢半仙 wrote it for him)
  {
    id: 'hg_letter',
    trigger: 'explore',
    poi: 'hg_pier',
    nodes: HG,
    priority: 12,
    once: true,
    cond: (s) => alive(s, 'wang_er') && s.day >= (s.vars.zz_first ?? Infinity) + 30,
    title: '東荒來的信',
    text: (s) => {
      const lines = [
        '老船夫看見你，從懷裡摸出一封信，信封皺巴巴的，沾著一點豆花的味道：「東荒捎來的。那個賣豆花的，在渡口等了我三天。」',
        '信是錢半仙代寫的。字寫得很漂亮，說的話卻是王二的，一句一句，囉囉嗦嗦：',
      ];
      const home = [];
      home.push('「你過江那天，我在渡口站到天黑。回去以後，豆花賣了一半，剩下一半，我自己吃了。」');
      if (flag(s, 'wanger_married')) home.push(s.day >= 2 * 360 + 60 ? '「翠花問你在那邊吃得好不好。小石會叫叔叔了，我教的，就是叫得不太準。」' : '「翠花問你在那邊吃得好不好。我說你是仙師，仙師不用吃飯。她打了我一下。」');
      if (flag(s, 'zhao_changed')) home.push('「趙虎還在老李頭那裡推磨。上個月下大雨，他一個人把攤子搬進了屋。我請他吃了一碗豆花，他吃完，哭了。」');
      if (alive(s, 'song_he') && flag(s, 'songhe_zhuji')) home.push('「清虛觀的老道長來買過一回豆花，問你好。他走路比從前直了。」');
      if (s.day >= dayAt(5, 9)) home.push('「鎮上的老人說，這兩年夜裡的月亮，邊上老是帶一圈紅。我不懂這些。你在那邊，自己小心。」');
      home.push('「中州的豆花要是不好吃，你就回來。豆花管夠。」');
      home.push('——王二（錢半仙代筆。錢半仙說，代筆不收錢，但要你回來的時候，給他講一段中州的書。）');
      return [...lines, home.join('\n\n')].join('\n\n');
    },
    choices: [
      {
        text: '託老船夫捎一封回信。',
        out: {
          text: '你借了茶棚的紙筆，寫了半天，寫來寫去，都是些「我很好」、「勿念」。最後你加了一句：「中州的豆花，沒有你的好吃。」\n\n老船夫把信揣進懷裡：「我回東荒的時候，給他念。」',
          effects: [['flag', 'wanger_letter1'], ['flag', 'wanger_reply'], ['favor', 'wang_er', 10], ['mind', 3], ['sysexp', 8], ['log', '收到王二託老船夫捎來的信，回了一封']],
        },
      },
      {
        text: '把信收好。',
        out: { text: '你把信折好，收進懷裡。信封上的豆花味道，好幾天都沒散。', effects: [['flag', 'wanger_letter1'], ['mind', 2]] },
      },
    ],
  },

  // ── 臨江城 ──
  {
    id: 'lj_arrive',
    trigger: 'arrive',
    nodes: LJ,
    once: true,
    title: '臨江城',
    text: (s) =>
      [
        '城門洞裡擠滿了人：挑擔的、趕車的、落地收劍的，一個挨一個往裡走。守門的兵丁穿著鐵甲，眼睛只看人腰上的牌子。',
        qingyun(s)
          ? '他拿起你腰上青雲宗的令牌，翻過來看了看背面：「青雲宗？」他把令牌扔回給你，「沒聽說過。進去吧。城裡禁空，別御劍。」'
          : '「打哪兒來的？」\n\n「東荒。」\n\n他頭也不抬：「進去吧。城裡禁空，別御劍。」',
        '城裡的街比青石鎮外的河還寬，石板鋪得平平整整。兩邊的鋪子一家挨一家，招牌上寫著你沒見過的東西：「萬年寒玉」、「金丹以上入內」、「謝氏錢莊」。街上走的修士，十個裡頭有三個，你看不出深淺。',
        awake(s)
          ? '叮——偵測到大量氣運之子。\n\n玄微頓了一頓，又說：「低調些。這裡的人，命簿上寫得比東荒的厚。」'
          : '叮——偵測到大量氣運之子。本系統建議宿主：低調。',
      ].join('\n\n'),
    choices: [
      {
        text: '進城。',
        out: {
          text: '你在街口站了一會兒。沒有人多看你一眼：在這裡，你是東荒來的散修，沒有宗門，沒有家世。\n\n城門邊的牆上貼著一張告示：「城內洞府，按月收租。」底下還有人用炭寫了一行小字：「住不起的，西南牆外鬼市。」',
          effects: [['discover', 'guishi'], ['discover', 'linjiang_docks'], ['sysexp', 10], ['log', '進了臨江城']],
        },
      },
    ],
  },

  {
    id: 'lj_board',
    title: '天驕榜',
    trigger: 'explore',
    poi: 'lj_board',
    nodes: LJ,
    steps: {
      start: {
        text: (s) =>
          `榜樓的牆上貼著一張大榜，從第一名一直排到第一百名。榜頭蓋著欽天監的大印。\n\n${boardText(s)}\n\n其餘的名字，你一個也不認得。\n\n${
            boardStar(s) === 'su'
              ? '榜下坐著一個穿星官衣服的女子，在冊子上寫著什麼。你看了一眼她的側臉——是蘇清瑤。'
              : '榜下坐著一個穿星官衣服的中年人，在冊子上寫著什麼。看榜的人說，欽天監每個月改一次榜，誰上誰下，星官說了算。'
          }\n\n榜樓前搭著一座擂台。榜上的人，誰來挑戰都得接——這是欽天監定的規矩。`,
        choices: [
          { text: '上擂台，挑戰榜上的人。', out: { next: 'duel' } },
          { text: '看完了。', out: { effects: [['flag', 'lj_board_seen']] } },
        ],
      },
      duel: {
        text: '擂台邊的執事問你：「挑哪一位？」\n\n台下的人圍了上來。有人認出了你的口音：「東荒來的？」',
        choices: [
          ...CHALLENGERS.map(([key, rank, name, what, diff, ls], k) => ({
            text: `${rank}：${name}。`,
            show: (s) => !flag(s, key) && (k === 0 || flag(s, CHALLENGERS[k - 1][0])),
            check: { kind: 'power', diff },
            fight: { foes: [['swordsman', 1, { name }]], spar: true },
            ok: {
              text: (s) => `${what}\n\n一炷香以後，你收了劍。台下靜了一會兒，才有人叫好。\n\n${notInBook(s)}\n\n執事把彩頭塞給你，小聲說：「這些年，你是頭一個。」`,
              effects: (s) => [['flag', key], ['flag', 'bang_beaten'], ['ls', ls], ['sysexp', 15], ['mind', 2], (x) => { x.vars.bang_day ??= x.day; }, ['log', `在臨江城的擂台上，打贏了天驕榜${rank}的${name}；星官查無此人`]],
            },
            fail: {
              text: `${what}\n\n你輸了。${name}收了兵器，拱了拱手：「承讓。」\n\n台下有人笑，也有人說：「東荒來的，能撐這麼久，不容易。」`,
              effects: [['mind', -1]],
            },
          })),
          {
            text: '第六十七名：謝玄朗。',
            show: (s) => flag(s, 'bang_100'),
            out: { text: '執事的臉色變了：「謝少主？」他壓低聲音，「謝少主……今天不在。明天也不在。你明白嗎？」' },
          },
          { text: '算了。', out: {} },
        ],
      },
    },
  },

  // a week after you first beat one of them: the 欽天監 has noticed (1.0's last scene)
  {
    id: 'bang_blank',
    trigger: 'explore',
    poi: 'lj_board',
    nodes: LJ,
    priority: 8,
    once: true,
    cond: (s) => flag(s, 'bang_beaten') && s.day >= (s.vars.bang_day ?? Infinity) + 7,
    title: '第一百零一名',
    text: (s) =>
      [
        '天驕榜換了。',
        '新榜貼出來那天，榜樓下圍了一圈人，指指點點。你擠進去一看：榜從第一名排到第一百名，跟從前一樣——只是第一百名底下，多了一行。',
        '那一行只有一個名次：第一百零一名。名次後頭是空的，一個字也沒寫。空白旁邊，蓋著欽天監的大印。',
        '看榜的人都在猜，那是誰。',
        boardStar(s) === 'su' && suFriend(s)
          ? '蘇清瑤從你身邊走過去，像是不認識你。走過去以後，她的聲音輕輕落在你耳邊：「他們在找你。」'
          : boardStar(s) === 'su'
            ? '蘇清瑤坐在榜下，抬頭看了你一眼，又低下頭，在冊子上寫了什麼。'
            : '榜下的星官抬起頭，往人群裡看了一眼。你覺得，他看的是你。',
        awake(s)
          ? '「他們看見你了。」玄微說，「看不見你的名字——可他們知道，書裡少了一個字。」'
          : '叮——偵測到窺探。來源：欽天監。\n\n叮——本系統建議宿主：……本系統也不知道該建議什麼。',
      ].join('\n\n'),
    choices: [
      {
        text: '轉身走開。',
        out: {
          text: '你從人群裡擠出來，沒有回頭。\n\n身後，那一行空白在太陽底下，白得刺眼。',
          effects: [['flag', 'bang_blank'], ['sysexp', 30], ['insight', 2], ['log', '天驕榜最下面，多了一個空白的位置：欽天監注意到你了'], ['rumor', '臨江城的天驕榜多了一行：第一百零一名，空白，蓋著欽天監的大印。']],
        },
      },
    ],
  },

  // 蘇清瑤, in 臨江城 (from 3018 a 星官 of 欽天監): a friend's reunion, or the reckoning she promised
  {
    id: 'su_zz',
    title: '蘇清瑤',
    trigger: 'visit',
    npc: 'su_qingyao',
    nodes: LJ,
    steps: {
      start: {
        text: (s) => {
          const robe = suStar(s) ? '她穿著欽天監的星官服，深青色的，袖口繡著二十八宿。' : '她還是一身素白，每天都來榜樓下看榜，一看就是一整天。';
          if (flag(s, 'su_zz_met')) {
            if (flag(s, 'su_zz_ally')) return `${robe}\n\n她看見你，沒有抬頭，只把冊子往旁邊挪了挪，讓出半張凳子。`;
            if (suRival(s) && !flag(s, 'su_zz_beaten')) return `${robe}\n\n她看見你，把筆擱下：「又來了？」`;
            return `${robe}\n\n她看見你，點了點頭。`;
          }
          if (suFriend(s)) return `榜樓下坐著一個女子，正在冊子上寫字。你走近了，她抬起頭——是蘇清瑤。\n\n${robe}\n\n她看見你，筆停了一下，又寫了下去，聲音壓得很低：「這裡說話不方便。天黑以後，茶樓二樓。」`;
          if (suRival(s)) return `榜樓下坐著一個女子，正在冊子上寫字。你走近了，她抬起頭，看見是你，把筆擱下了。\n\n${robe}\n\n「中州見。」她站起來，「我說過，到時候，我們再算。」`;
          if (met(s, 'su_qingyao')) return `榜樓下坐著一個女子。你走近了，認出了她——蘇清瑤，落霞坊市茶樓上那個白衣女修。\n\n${robe}\n\n「是你。」她看了你一會兒，「東荒那個。」`;
          return `榜樓下坐著一個女子，在冊子上寫著什麼。${robe}\n\n你從她身邊走過去的時候，她抬頭看了你一眼，又低下頭。過了一會兒，她又抬起頭，盯著你看。\n\n「……你不在冊子上。」她說。`;
        },
        choices: [
          // a friend: the teahouse, after dark
          {
            text: '天黑以後，去茶樓二樓。',
            show: (s) => !flag(s, 'su_zz_met') && suFriend(s),
            out: { effects: [['meet', 'su_qingyao'], (x) => { const su = x.npcs.su_qingyao; if (su.realm < 2) Object.assign(su, { realm: 2, stage: 1 }); }], next: 'tea' },
          },
          // a rival: blades first
          {
            text: '拔劍。',
            show: (s) => suRival(s) && !flag(s, 'su_zz_beaten'),
            check: { kind: 'power', diff: (s) => Math.max(140, Math.round(power(s) * 1.05)) },
            fight: { foes: [['swordsman', 1, 'su_qingyao']], spar: true },
            ok: {
              text: '她退了三步，劍尖垂了下來。\n\n「好。」她收了劍，看了你很久，「這一世，你確實不一樣。」\n\n她坐回凳子上，把冊子翻開，又合上：「古戰場那一次，算我們兩清。」她頓了頓，「有一件事，我只說一次：天元三千零二十二年七月十五，別待在東荒。」',
              effects: [['meet', 'su_qingyao'], ['flag', 'su_zz_met'], ['flag', 'su_zz_beaten'], ['flag', 'blood_moon_warned'], ['favor', 'su_qingyao', 15], ['sysexp', 15], ['log', '在臨江城的榜樓下，跟蘇清瑤算了古戰場那筆帳'], (x) => { const su = x.npcs.su_qingyao; if (su.realm < 2) Object.assign(su, { realm: 2, stage: 1 }); }],
            },
            fail: {
              text: '她的劍停在你喉前三寸。\n\n「還差得遠。」她收了劍，坐回去，又拿起了筆，「等你打得過我，我再跟你說話。」',
              effects: [['meet', 'su_qingyao'], ['flag', 'su_zz_met'], (x) => { const su = x.npcs.su_qingyao; if (su.realm < 2) Object.assign(su, { realm: 2, stage: 1 }); }],
            },
          },
          {
            text: '「好久不見。」',
            show: (s) => !flag(s, 'su_zz_met') && !suFriend(s) && !suRival(s) && met(s, 'su_qingyao'),
            out: {
              text: '「好久不見。」她說，「你也來中州了。」\n\n她看了一眼榜，又看了一眼天：「這裡的天，比東荒的低。」\n\n你不知道她指的是什麼。她也沒有解釋。',
              effects: [['flag', 'su_zz_met'], ['favor', 'su_qingyao', 3]],
            },
          },
          {
            text: '「什麼冊子？」',
            show: (s) => !flag(s, 'su_zz_met') && !met(s, 'su_qingyao'),
            out: {
              text: '她沒有回答，只是把冊子合上了。\n\n「我叫蘇清瑤。」她說，「你最好記住這個名字。」\n\n「為什麼？」\n\n「因為我會記住你的。」她說，「你是我見過的第一個，不在冊子上的人。」',
              effects: [['meet', 'su_qingyao'], ['flag', 'su_zz_met'], ['sysexp', 10]],
            },
          },
          // later
          {
            text: '「那一夜，到底會發生什麼？」',
            show: (s) => flag(s, 'su_zz_ally') && !flag(s, 'su_told_night'),
            out: {
              text: '她沉默了很久。\n\n「月亮會變紅。」她說，「天上會攤開一本書，所有人都看得見。然後，有一支筆從天上落下來，落在東荒。」\n\n「然後呢？」\n\n「然後，東荒就沒有了。」她看著窗外，「上一世，我就看到這裡。」',
              effects: [['flag', 'su_told_night'], ['insight', 2], ['sysexp', 10]],
            },
          },
          {
            text: '「你查到了什麼？」',
            show: (s) => flag(s, 'su_zz_ally') && flag(s, 'su_told_night'),
            out: {
              text: (s) =>
                variant(s, [
                  '「還不夠。」她說，「欽天監的冊子，我看得到的只有抄本。真本在天衍城，監正自己收著。」',
                  '「他們在數東荒的人。」她低聲說，「一個一個地數，像在點貨。」',
                  '「別問。」她把冊子合上，「知道得越多，你的名字就越容易被他們看見。」',
                ]),
              effects: [['favor', 'su_qingyao', 1]],
            },
          },
          { text: '陪她看一會兒榜。', show: (s) => flag(s, 'su_zz_met'), out: { text: '你們看著榜上的名字，誰也沒有說話。看榜的人來了又走，太陽從榜樓的這一頭，移到了那一頭。', effects: [['favor', 'su_qingyao', 2], ['mind', 2]] } },
          { text: '走開。', out: {} },
        ],
      },
      tea: {
        text: (s) =>
          `茶樓二樓靠窗的位子，她已經在了。桌上兩杯茶，跟那年在落霞坊市一樣。\n\n「${
            suStar(s) ? '我進了欽天監。' : '欽天監在招星官，我想進去。'
          }」她說，「上一世我記得的事，一件一件地發生了：誰會突破，誰會死，哪一天下雨。${
            suStar(s) ? '我把它們寫下來交上去——欽天監說，我的推演和他們的命簿一字不差。他們當我是奇才。' : '我把它們寫下來，就是最好的投名狀。'
          }」\n\n「我要在裡面查一件事：那一夜，是誰下的筆。」\n\n她看著你：「上一世，欽天監的冊子上沒有你。這一世，我翻遍了，也沒有你。」她笑了一下，「這是好事。他們看不見你。」${
            flag(s, 'bang_beaten') ? '\n\n她頓了頓：「你上擂台了。」不是問句，「……他們已經在找了。」' : '\n\n「別上天驕榜。」她說，「上了榜，他們就會開始找你。」'
          }`,
        choices: [
          {
            text: '「我能幫你什麼？」',
            out: {
              text: '「現在，什麼也別做。」她說，「活著，變強，別讓人看見你。」\n\n「等我查到了，我來找你。」\n\n她把一杯茶推到你面前。茶還是熱的。\n\n叮——檢測到命格交會：此人的兩段軌跡，偏向你的那一段，又深了一些。',
              effects: [['flag', 'su_zz_met'], ['flag', 'su_zz_ally'], ['favor', 'su_qingyao', 10], ['sysexp', 15], ['log', '在臨江城的茶樓上，與蘇清瑤重逢：她在欽天監裡，查那一夜是誰下的筆']],
            },
          },
        ],
      },
    },
  },

  // the 中州 storyteller: 錢半仙's tale, the other way round
  {
    id: 'lj_tale',
    trigger: 'explore',
    poi: 'lj_teller',
    nodes: LJ,
    cooldown: 10,
    title: '說書',
    text: '茶樓門口支著一張桌子。說書人一拍醒木：「今兒個說一段——天劍宗祖師，逼死劍仙！」\n\n「三千年前，劍仙一劍斷天河，闖下了滔天大禍。天上降下罪來，劍仙的大弟子為了保住自己，在東荒的孤峰上親手逼死了師父，奪了師父的劍道，跑到中州，開了天劍宗！」\n\n「諸位想想，天劍宗的劍，為什麼個個都是快劍、狠劍？那是逼死師父的劍！」\n\n茶客們一陣叫好。門邊有兩個背劍的年輕人，臉色鐵青，扔下茶錢走了。',
    choices: [
      {
        text: '「不對。劍冢碑上寫的，不是這樣。」',
        show: (s) => flag(s, 'sword_stele_read') && !flag(s, 'zz_tale_stele'),
        out: {
          text: (s) =>
            `散場以後，你把古戰場那塊碑上的字，一個一個念給他聽：「世人皆言吾師一劍斷天河。非也。是夜，天外有手，探入天河……吾師劍折，人不知所終……不肖弟子，謹書。」\n\n說書人的臉白了。\n\n「不肖弟子……」他念了一遍，「我一直以為，『不肖』說的是他逼死了師父。」\n\n「原來，是他沒能救下師父。」\n\n他把醒木收進袖子裡，看了看四周：「這段話，在臨江城裡說不得。天劍宗的人聽了要拔劍——欽天監的人聽了，要拔舌頭。」${
              met(s, 'qian_banxian') ? '\n\n你想起東荒的錢半仙。一個說劍仙斷了天河，一個說弟子逼死了師父——兩邊的書對起來，真的那一半，刻在古戰場的石頭上。' : ''
            }`,
          effects: (s) => [['flag', 'zz_tale_stele'], ...(met(s, 'qian_banxian') ? [['flag', 'two_tales']] : []), ['insight', 2], ['sysexp', 12], ['mind', 2], ['log', '把劍冢碑的碑文念給臨江城的說書人聽']],
        },
      },
      {
        text: '「東荒的說書人，說的是另一個版本。」',
        show: (s) => met(s, 'qian_banxian') && !flag(s, 'zz_tale_banxian'),
        out: {
          text: (s) =>
            `「哦？東荒怎麼說？」\n\n你學著錢半仙的腔調：「三千年前，有位劍仙在古戰場一劍斷天河——此後三千年，再無一人飛升！」\n\n說書人摸著下巴想了半天：「一個說他斷了天河，一個說他被徒弟逼死……」他嘿嘿一笑，「兩個都是說書的，兩個都只說了一半。」\n\n「另一半呢？」\n\n「另一半，」他說，「大概在說書的人不敢去的地方。」${
              flag(s, 'sword_stele_read') ? '' : '\n\n叮——偵測到線索：古戰場，斷劍林的盡頭。'
            }`,
          effects: (s) => [['flag', 'zz_tale_banxian'], ...(flag(s, 'zz_tale_stele') ? [['flag', 'two_tales']] : []), ['insight', 1], ['sysexp', 8]],
        },
      },
      { text: '扔兩個銅板，聽完。', out: { text: '說書人說到劍仙咽氣那一段，滿堂鴉雀無聲。你走出茶樓的時候，天都黑了。', effects: [['mind', 1]] } },
    ],
  },

  {
    id: 'lj_lord',
    trigger: 'explore',
    poi: 'lj_lord',
    nodes: LJ,
    once: true,
    title: '城主府',
    text: '城主府的照壁上貼著告示：\n\n「一、城上禁空，違者拿問。\n二、外地散修入城，須至府前登記。\n三、城內私鬥，以傷論罪；上擂台者不在此列。」\n\n府前坐著一個書吏，面前攤著兩本冊子。',
    choices: [
      {
        text: '去登記。',
        out: {
          text: '書吏問了你的名字、籍貫，寫在第一本冊子上。寫完，他又翻開第二本冊子——那一本的封皮是深青色的，蓋著欽天監的印——對著查了半天，皺起了眉頭。\n\n「怪了。」他說，「……算了，登記上了就行。下一個！」',
          effects: [['flag', 'lj_registered'], ['sysexp', 5]],
        },
      },
      { text: '不登記了。', out: { text: '你從照壁前走了過去。書吏抬頭看了你一眼，沒有叫住你。' } },
    ],
  },

  {
    id: 'lj_lane',
    trigger: 'explore',
    poi: 'lj_lane',
    nodes: LJ,
    cooldown: 20,
    title: '散修巷',
    text: (s) =>
      variant(s, [
        '散修巷窄得兩個人錯不開身。兩邊的門上都掛著木牌：「洞府出租，月付」、「代煉丹藥，材料自備」、「收各種妖獸材料，價格面議」。\n\n一個老散修蹲在門口曬太陽，看見你，招了招手：「新來的？洞府行的價錢，比這裡貴三成。要住，先到這巷子裡問問。」',
        '巷子深處有人在吵架，為的是一株三十年的靈芝。吵到最後，兩個人一起蹲下來，數著靈石平分了。\n\n「中州的散修，」旁邊的人跟你說，「打不起，只吵得起。」',
        '巷口貼著一張懸賞：「尋人：東荒來的散修張某，三月前進城，至今未歸。」紙已經黃了，沒人揭。',
      ]),
    choices: [{ text: '走過巷子。', out: { effects: [['mind', 1]] } }],
  },

  // 租洞府 (world/caves.js): the 洞府行 in the city, and the hole behind the 鬼市's lean-to
  ...['linjiang', 'guishi'].map((at) => ({
    id: at === 'linjiang' ? 'lj_cave' : 'gs_lean',
    trigger: 'explore',
    poi: at === 'linjiang' ? 'lj_cave' : 'gs_lean',
    nodes: [at],
    title: at === 'linjiang' ? '洞府行' : '破棚子',
    text: (s) => {
      const until = rentUntil(s, at);
      const head =
        at === 'linjiang'
          ? `洞府行的掌櫃把一張城圖攤在櫃台上，上頭圈著一個一個能租的洞府：「城北靠山那一排，地下引了靈脈，每一間都布了聚靈陣。一個月，${RENT.linjiang.month} 塊靈石。」\n\n他抬眼看你：「東荒的靈石，我們也收。」`
          : `破棚子後頭的牆根下，挖著一排洞，洞口掛著草簾子。看棚子的老婆婆說：「一個月，${RENT.guishi.month} 塊靈石。靈氣是沒有城裡的好——可也沒人問你是誰。」`;
      return until ? `${head}\n\n（你租的洞府，還有 ${Math.ceil((until - s.day) / 30)} 個月左右到期。）` : head;
    },
    choices: [
      ...TERMS.map(([months]) => ({
        text: `${months === 1 ? '租一個月' : months === 6 ? '租半年' : '租一年'}（${rentCost(at, months)} 靈石）。`,
        need: (s) => (s.player.ls >= rentCost(at, months) ? null : `靈石不足（需 ${rentCost(at, months)}）`),
        out: {
          text: at === 'linjiang' ? '掌櫃收了靈石，從牆上摘下一塊木牌給你：「城北，第七間。門上的禁制認牌不認人，別弄丟了。」' : '老婆婆把一塊缺了角的木牌塞給你：「最裡頭那一間。漏雨的時候，自己拿盆接。」',
          effects: [['ls', -rentCost(at, months)], (s) => { extendRent(s, at, months); }, ['sysexp', 3]],
        },
      })),
      { text: '不租了。', out: {} },
    ],
  })),

  // (world/explore.js cityWatch) flown over 臨江城 too long: the watch has brought you down
  {
    id: 'lj_nofly',
    trigger: 'scheduled',
    title: '城上禁空',
    text: '你剛落地，四個巡城衛就圍了上來，槍尖對著你。\n\n「城上禁空，」領頭的說，「告示貼在城門口，你不識字？」',
    choices: [
      {
        text: '認罰。',
        need: (s) => (s.player.ls >= 20 ? null : '靈石不足（需 20）'),
        out: { text: '他收了二十塊靈石，在冊子上記了一筆：「下不為例。」\n\n巡城衛散開了。看熱鬧的人也散開了。', effects: [['ls', -20], ['rep', 'linjiang', -2]] },
      },
      {
        text: '動手。',
        check: { kind: 'power', diff: (s) => Math.max(160, Math.round(power(s) * 0.9)) },
        fight: { foes: [['city_guard', 2]], close: true },
        ok: {
          text: '巡城衛倒了一地。遠處又響起了哨子，一聲接一聲，往這邊來了。\n\n你最好在更多人趕到以前離開。',
          effects: [['rep', 'linjiang', -15], ['flag', 'lj_fought_watch'], ['log', '在臨江城打倒了攔你的巡城衛']],
        },
        fail: {
          text: '你被按在了地上，捆了個結實，押進城主府的牢裡關了三天。\n\n出來的時候，你身上的靈石少了一半。牢頭說：「這是飯錢。」',
          effects: [['halfls'], ['hours', 72], ['rep', 'linjiang', -5]],
        },
      },
      {
        text: '跑。',
        check: { kind: 'jiyuan', diff: 6 },
        ok: { text: '你一矮身，從兩桿槍中間鑽了過去，拐進一條小巷，又拐進一條小巷。身後的哨子聲，越來越遠了。', effects: [['rep', 'linjiang', -6]] },
        fail: { text: '你沒跑出三步，就被一桿槍絆倒了。\n\n罰了四十塊靈石，還挨了一頓訓。', effects: [['ls', -40], ['rep', 'linjiang', -4]] },
      },
    ],
  },

  // what the city talks about over its tea (the places of 臨江一帶, one by one)
  {
    id: 'zz_inq_sword',
    trigger: 'inquire',
    nodes: LJ,
    once: true,
    title: '劍光',
    text: '「天上那些劍光？天劍宗的。」茶樓的夥計給你續上茶，「城東北那座劍山，三千級劍階，從山腳一直鋪到雲裡。宗裡的弟子每天往返臨江城，比走路還勤快。」\n\n「東荒來的？想拜師？」他笑了，「天劍宗不收外人。你要是金丹了，倒是能去當個客卿。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'tianjian']] } }],
  },
  {
    id: 'zz_inq_star',
    trigger: 'inquire',
    nodes: LJ,
    once: true,
    title: '荒山上的石台',
    text: '「城北那座光禿禿的山？上頭有個塌了的石台，說是三千年前欽天監的第一座觀星台。」一個老茶客說，「欽天監搬進都城以後，那裡就荒了。」\n\n他壓低了聲音：「夜裡上去的人，都說看見台邊那隻石獸動了。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'guanxing']] } }],
  },
  {
    id: 'zz_inq_xie',
    trigger: 'inquire',
    nodes: LJ,
    once: true,
    title: '謝家',
    text: '「謝家？」茶客們互相看了一眼，聲音都低了下去。\n\n「臨江城一半的田、一半的鋪子，都是謝家的。城東官道北邊那座莊子，牆比城牆矮不了多少。」\n\n「謝家的少主謝玄朗，天劍宗的外門弟子，天驕榜上六十幾名。」有人嗤笑一聲，「六十幾名？他要是姓張，連一百名都排不上。」\n\n說話的人被旁邊的人踩了一腳，不吭聲了。',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'xiejia']] } }],
  },
  {
    id: 'zz_inq_fields',
    trigger: 'inquire',
    nodes: LJ,
    once: true,
    title: '城南',
    text: '「出了南門，是千畝靈田，種靈稻的。田是世家的，種田的是佃農。」茶樓掌櫃說，「再往南，山口進去，是百草谷——中州丹師的宗門。谷主這些年閉關，不見客。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'lingtian'], ['discover', 'baicao']] } }],
  },
  {
    id: 'zz_inq_lin',
    trigger: 'inquire',
    nodes: LJ,
    cooldown: 120,
    cond: (s) => linRank(s) !== null && met(s, 'lin_chen'),
    title: '姓林的',
    text: (s) =>
      linRank(s) === 3
        ? '「天驕榜第三名，那個姓林的，你聽說了沒？東荒來的，雷靈根。上個月在擂台上，一劍把南宮家的老二劈下了台。」\n\n「他現在是上官家的客卿。謝家請了他三回，他一回都沒去。」\n\n「這麼不給謝家面子？」\n\n「所以說嘛，」說話的人搖搖頭，「這個人，在中州活不長。」'
        : `「上官家請了一個東荒來的客卿，姓林。」茶客們說，「雷靈根，脾氣倔，打擂台從來不留手。天驕榜上，已經排到第${linRank(s)}名了。」\n\n「東荒能出這樣的人？」\n\n「東荒的人都這樣，」有人說，「窮怕了，拚命。」`,
    choices: [{ text: '聽著。', out: { effects: [['sysexp', 3]] } }],
  },
  {
    id: 'zz_inq_docks',
    trigger: 'inquire',
    nodes: LD,
    once: true,
    title: '碼頭上的話',
    text: '腳夫們歇晌的時候，你跟他們蹲在一起，分了一包花生。\n\n「江邊往北，是上官家的商棧，樓船三層高，江上就數它最氣派。」\n\n「再往北，就是江堤蘆蕩了。蕩子裡夜裡有東西走，割葦子的天不黑就收工。」\n\n「往東南走三天，是雲夢大澤。」一個老腳夫說，「大澤裡有一條蛟，三百年沒人見過牠的全身。見過的，都沒回來。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'shangguan'], ['discover', 'jiangdi'], ['discover', 'yunmeng']] } }],
  },

  // ── 鬼市 ──
  {
    id: 'gs_stalls',
    trigger: 'explore',
    poi: 'gs_stalls',
    nodes: GS,
    cooldown: 3,
    title: '鬼市',
    text: (s) =>
      night(s)
        ? variant(s, [
            '天一黑，牆根下的空地上就亮起了燈。散修們提著燈來擺攤，一盞燈一個攤，賣什麼的都有：缺了角的法器、沒有名字的丹藥、一張不知道從哪座古墓裡挖出來的地圖。\n\n你問一個攤主東西是哪裡來的，他把燈往你臉上一照：「你是買東西的，還是查案的？」',
            '鬼市的燈一盞一盞地亮著，走在裡頭的人，臉都藏在斗笠底下。有人用三顆築基丹換一隻獨眼的貓；有人賣一把劍，說是天劍宗長老的佩劍，開價十塊靈石。\n\n一個蒙著臉的女修從你身邊走過，往你手裡塞了一張紙條：「洞府，便宜，不問來歷。」',
          ])
        : '白天的鬼市只有幾根木樁和一地雞毛。牆根下坐著幾個曬太陽的散修，誰也不理誰。\n\n天黑以後再來。',
    choices: [
      { text: '逛一圈。', show: (s) => night(s), out: { text: '你在燈影裡轉了一圈，什麼也沒買，倒是聽了一肚子的閒話。', effects: [['mind', 1]] } },
      { text: '走了。', out: {} },
    ],
  },

  // 蕭七: how a 散修 lives in a great city
  {
    id: 'xiaoqi_talk',
    trigger: 'visit',
    npc: 'xiao_qi',
    nodes: GS,
    text: (s) =>
      flag(s, 'xiaoqi_met')
        ? variant(s, [
            '蕭七還在破棚子底下剝花生，一隻手剝得飛快。「坐。」',
            '蕭七靠著棚柱打盹。你剛走近，他就睜開了一隻眼睛：「又來了。」',
          ])
        : '破棚子底下坐著一個獨臂的老頭，正用一隻手剝花生，剝得飛快。左邊的袖子空蕩蕩的，打了個結。\n\n「東荒來的？」他頭也不抬，「看你走路的樣子就知道。東荒的人走路，眼睛老是往天上看。」',
    title: '蕭七',
    choices: [
      {
        text: '「在中州當散修，有什麼規矩？」',
        show: (s) => !flag(s, 'xiaoqi_met'),
        out: {
          text: '「規矩？」他把一顆花生扔進嘴裡，「三件事。」\n\n「一，洞府按月租，別欠。欠了，房東不找你，懸賞堂找你。」\n\n「二，懸賞堂的單子，挑沒人接的接。有人搶的，都是有人等著你接的。」\n\n「三——」他用花生殼指了指城裡謝府的方向，「別惹世家。」\n\n「要是惹了呢？」\n\n他抬起那隻空袖子晃了晃：「那就跑。往北跑，蒼梧林；往東跑，龍脊嶺。跑不掉，」他咧嘴一笑，「就像我一樣，留點東西下來。」',
          effects: [['meet', 'xiao_qi'], ['flag', 'xiaoqi_met'], ['favor', 'xiao_qi', 5], ['discover', 'cangwu'], ['discover', 'longji'], ['sysexp', 10], ['log', '在鬼市認識了獨臂的散修蕭七']],
        },
      },
      {
        text: '「你的胳膊，是怎麼沒的？」',
        show: (s) => flag(s, 'xiaoqi_met') && favor(s, 'xiao_qi') >= 10 && !flag(s, 'xiaoqi_arm'),
        out: {
          text: '他剝花生的手停了一下。\n\n「四十年前，雲夢大澤裡長了一株九葉蓮。我跟一個世家的公子同時看見。」他說，「我先摘到手的。」\n\n「後來呢？」\n\n「後來那株蓮，在他手裡。我的胳膊，在他家的狗肚子裡。」他又剝起了花生，「我換回一顆金丹，他換回一條狗。這筆帳，你說誰賺了？」\n\n你沒有說話。他也沒有再說。',
          effects: [['flag', 'xiaoqi_arm'], ['favor', 'xiao_qi', 8], ['insight', 1]],
        },
      },
      {
        text: '陪他剝一會兒花生。',
        show: (s) => flag(s, 'xiaoqi_met'),
        out: {
          text: (s) =>
            variant(s, [
              '你們剝了一下午的花生。他給你講臨江城的事：哪家的洞府漏雨，哪個懸賞是坑，哪個星官收錢。',
              '他說，中州的散修活不過五十歲的，一半死在世家手裡，一半死在搶東西的路上。「剩下的，」他說，「就像我一樣，在鬼市剝花生。」',
              '他教你在鬼市怎麼還價：先問三家，再走開，走到第七步，攤主一定叫你。你試了一下，第五步就叫了。',
            ]),
          effects: [['favor', 'xiao_qi', 2], ['mind', 2]],
        },
      },
      { text: '走了。', out: {} },
    ],
  },

  // ── 上官商棧 ──
  {
    id: 'shangguan_talk',
    trigger: 'visit',
    npc: 'shangguan_jin',
    nodes: SG,
    title: '上官瑾',
    text: (s) =>
      flag(s, 'sg_met')
        ? '上官瑾在帳房裡打算盤，看見你，笑著起身：「來了？坐，喝茶。」'
        : '商棧的帳房裡，一個穿著利落的女子正在打算盤，算珠撥得劈啪響。夥計通報了一聲，她抬起頭，上下打量了你一眼，笑了。\n\n「東荒來的？」她說，「我們上官家做了一百年的江上生意，還是頭一回有東荒的修士，自己找上門來。」',
    choices: [
      {
        text: '「東荒的東西，在中州賣得出去嗎？」',
        show: (s) => !flag(s, 'sg_met'),
        out: {
          text: (s) =>
            `「賣得出去。」她把算盤推到一邊，「東荒的靈草，年份足，藥性野，在中州能賣三倍的價錢——就是路太遠，江裡有東西，船家不肯走。」\n\n她從抽屜裡取出一張名帖，推到你面前：「拿著。在上官家的鋪子裡，報這張帖子，價錢好說。」${
              linAbroad(s) && s.day >= dayAt(4, 9)
                ? '\n\n她頓了頓，又說：「說起來，我們家去年也請了一個東荒來的客卿，姓林，雷靈根。你認識嗎？」\n\n「……他還好嗎？」\n\n「好。」她笑著搖搖頭，「就是太好了。謝家請了他三回，他一回都不去。」'
                : ''
            }`,
          effects: [['meet', 'shangguan_jin'], ['flag', 'sg_met'], ['favor', 'shangguan_jin', 5], ['sysexp', 8], ['log', '在上官商棧見了上官家的當家上官瑾']],
        },
      },
      {
        text: '「謝家和上官家，是怎麼回事？」',
        show: (s) => flag(s, 'sg_met') && !flag(s, 'sg_longji'),
        out: {
          text: '她撥了一顆算珠，又撥回去。\n\n「龍脊嶺底下有一條靈脈，挖出來的靈石成色極好。嶺是兩家一起買下的，脈卻只有一條。」她笑了笑，「官司打了三年，還沒打完。」\n\n「謝家想要整條脈。上官家想要的，」她又撥了一顆算珠，「是謝家別想要整條脈。」',
          effects: [['flag', 'sg_longji'], ['discover', 'longji'], ['favor', 'shangguan_jin', 2]],
        },
      },
      { text: '喝一杯茶。', show: (s) => flag(s, 'sg_met'), out: { text: '她泡的茶很香。她說，這茶是用東荒的野茶樹做的，一年只得三斤。', effects: [['favor', 'shangguan_jin', 2], ['mind', 1]] } },
      { text: '告辭。', out: {} },
    ],
  },
  {
    id: 'sg_boat',
    trigger: 'explore',
    poi: 'sg_boat',
    nodes: SG,
    once: true,
    title: '樓船',
    text: '上官家的樓船泊在碼頭上，三層高，船頭雕著一隻鷁鳥，桅杆上掛著「上官」兩個字的旗。\n\n船上的管事說，這艘船裝得下三百人，從臨江城到天衍城，順水只要兩天。\n\n「東荒？」他搖搖頭，「不去。大江往西那一段，船家都不去。江裡有東西。」',
    choices: [{ text: '看了一會兒。', out: { effects: [['sysexp', 3]] } }],
  },

  // ── 謝玄朗 ──
  {
    id: 'xie_talk',
    trigger: 'visit',
    npc: 'xie_xuanlang',
    nodes: LJ,
    title: '謝玄朗',
    text: (s) =>
      flag(s, 'xie_met')
        ? '謝玄朗被一群人圍著，看見你，眉毛挑了一下：「又是你。」'
        : '一個錦衣的年輕人從街那頭走過來，身後跟著七八個人。街上的人紛紛讓路。他經過你身邊的時候，停了一下。\n\n「生面孔。」他上下打量你，「打哪兒來的？」\n\n「東荒。」\n\n他笑了，身後的人也跟著笑：「東荒？那個種靈米的地方？」',
    choices: [
      {
        text: '「種靈米怎麼了？」',
        show: (s) => !flag(s, 'xie_met'),
        out: {
          text: (s) =>
            `「沒怎麼。」他說，「東荒的靈米好吃。沈家的靈米，我們家一年要買三千石。」\n\n他湊近了一點，聲音低了下去，笑容沒變：「說起來，沈家的生意，我爹看上很久了。」\n\n他拍了拍你的肩膀，走了。身後的人跟著走了，街上的人又合攏了。${
              met(s, 'shen_qingge') ? '\n\n你想起青雲宗外門的沈清歌。' : ''
            }\n\n叮——偵測到氣運之子……不對。偵測到的是，借來的氣運。`,
          effects: [['meet', 'xie_xuanlang'], ['flag', 'xie_met'], ['flag', 'xie_shen_heard'], ['sysexp', 10], ['log', '在臨江城的街上碰見謝家少主謝玄朗：他說，沈家的生意，他爹看上了']],
        },
      },
      {
        text: '不理他，走開。',
        show: (s) => !flag(s, 'xie_met'),
        out: { text: '你從他身邊走了過去。身後傳來一陣笑聲，你沒有回頭。', effects: [['meet', 'xie_xuanlang'], ['flag', 'xie_met']] },
      },
      { text: '點點頭，走開。', show: (s) => flag(s, 'xie_met'), out: { text: '他也沒再說什麼。他身後的人看了你一眼，又看了一眼。' } },
    ],
  },

  {
    id: 'lj_xie',
    trigger: 'explore',
    poi: 'lj_xie',
    nodes: LJ,
    cooldown: 30,
    title: '謝府',
    text: (s) =>
      s.day >= dayAt(7, 1)
        ? '謝府門口停著一溜大車，車上的箱子都封著，封條上的記號你認得——是東荒沈家的。\n\n家丁們一箱一箱地往裡搬。門房站在台階上點數，點一箱，就在冊子上劃一筆。'
        : '謝府的大門朱紅色的，門釘比拳頭還大。門口蹲著兩座石獅子，獅子嘴裡的石球被人摸得發亮。\n\n門房看了你一眼，又低頭嗑他的瓜子。',
    choices: [{ text: '走了。', out: {} }],
  },

  // ── 臨江碼頭 ──
  {
    id: 'ld_wharf',
    trigger: 'explore',
    poi: 'ld_wharf',
    nodes: LD,
    cooldown: 15,
    title: '碼頭',
    text: (s) =>
      variant(s, [
        '碼頭上的桅杆像一片林子。腳夫們扛著貨，一船一船地上，一船一船地下。一個管事站在跳板上吆喝：「上官家的貨靠左！謝家的靠右！誰放錯了，扣半個月工錢！」',
        '一條漁船靠了岸，船艙裡的魚還在跳。漁家說，今天的魚都往東游，往西的一條也沒有。「江那頭，」他朝西邊努了努嘴，「魚都不去。」',
        '幾個天劍宗的弟子從天上落下來，收了劍，上了一條快船。船夫一篙子撐出去，船像箭一樣射進了江霧裡。',
      ]),
    choices: [{ text: '看了一會兒。', out: { effects: [['mind', 1]] } }],
  },

  // ── 天劍宗 ──
  {
    id: 'tianjian_arrive',
    trigger: 'arrive',
    nodes: TJ,
    once: true,
    title: '天劍宗',
    text: '劍山拔地而起，山壁直得像是一劍削出來的。三千級劍階從山腳一直鋪到雲裡，每一級的石面上，都刻著一道劍痕。\n\n山門上一塊匾，兩個字：天劍。字也是用劍刻的，筆畫裡的劍氣，隔著十丈還割得人臉疼。\n\n雲裡不時有劍光落下，又有劍光升起，像一群歸巢的鳥。',
    choices: [{ text: '抬頭看了很久。', out: { effects: [['sysexp', 10], ['mind', 2], ['log', '到了天劍宗的山門下']] } }],
  },
  {
    id: 'tj_gate',
    trigger: 'explore',
    poi: 'tj_gate',
    nodes: TJ,
    cooldown: 10,
    title: '山門',
    text: (s) =>
      qingyun(s) && !flag(s, 'tj_gate_seen')
        ? '山門下站著兩個守門的弟子，劍都沒有出鞘，人卻像兩把劍。\n\n「青雲宗？」一個弟子看了看你腰上的令牌，「東荒那個？」他把令牌還給你，客客氣氣地說：「本宗不收外宗的弟子，也不見外宗的客。請回。」'
        : `山門下站著兩個守門的弟子，劍都沒有出鞘，人卻像兩把劍。\n\n「本宗不收外人為徒。」一個弟子說，「金丹以上的散修，可以掛名做客卿——${
            s.player.realm >= 3 ? '你是金丹？' : '你還不是金丹。'
          }長老閉關，今年不見客。」`,
    choices: [
      { text: '抬頭看那三千級劍階。', out: { text: '劍階一級一級往上，沒進了雲裡。雲裡偶爾有劍光一閃，像是有人在上面練劍，練了三千年，還沒練完。', effects: [['flag', 'tj_gate_seen'], ['mind', 1]] } },
      { text: '走了。', out: { effects: [['flag', 'tj_gate_seen']] } },
    ],
  },
  {
    id: 'tj_motto',
    trigger: 'explore',
    poi: 'tj_stele',
    nodes: TJ,
    once: true,
    title: '門規碑',
    text: (s) =>
      `山門邊立著一塊門規碑，刻著天劍宗的九條門規：不得同門相殘，不得私授劍訣，不得以劍欺凡人……\n\n最後一條，字比前八條都大，筆畫深得能塞進一根手指：\n\n「指在一日，劍不入鞘。」\n\n碑底下有一行小字註著：「指，劍指也。劍指之訣，一日不可廢。」${
        flag(s, 'sword_stele_read')
          ? '\n\n你想起古戰場的劍冢碑：「是夜，天外有手，探入天河。吾師登東北孤峰，仰天一劍，斬其一指。」\n\n劍指？\n\n你看著那個「指」字，看了很久。'
          : '\n\n天劍宗的弟子，大概每天都要練這一手劍指。'
      }`,
    choices: [
      {
        text: '把碑文記下來。',
        out: {
          text: (s) => (flag(s, 'sword_stele_read') ? (awake(s) ? '「三千年，」玄微低聲說，「他們把師父的話，讀成了一條手訣。」' : '叮——偵測到兩段文字之間存在關聯。關聯度：……計算中。') : '你把碑文記了下來。'),
          effects: (s) => [['flag', 'tj_motto_read'], ...(flag(s, 'sword_stele_read') ? [['flag', 'motto_doubt'], ['insight', 2], ['sysexp', 12]] : [['sysexp', 4]]), ['log', '讀了天劍宗山門前的門規碑：指在一日，劍不入鞘']],
        },
      },
    ],
  },

  // 葉孤寒, at the gate of his sect: 「中州見」
  {
    id: 'ye_zz',
    trigger: 'visit',
    npc: 'ye_guhan',
    nodes: TJ,
    title: '葉孤寒',
    text: (s) => {
      if (flag(s, 'ye_zz_met')) return variant(s, ['葉孤寒坐在山門外的石階上擦劍，擦了一遍又一遍。', '葉孤寒站在山門外，看著雲裡的劍光，一動不動。', '葉孤寒在劍階底下練劍，一招一式都慢得出奇。看見你，他停了下來。']);
      if (flag(s, 'ye_lineage')) return '山門外的石階上坐著一個背劍的年輕人，背上的劍比人還高。\n\n他聽見腳步聲，頭也沒回：「你來了。」\n\n是葉孤寒。他站起來，看了看你，又看了看你的劍：「中州見——我說過的。」';
      if (met(s, 'ye_guhan')) return '山門外的石階上坐著一個背劍的年輕人。他聽見腳步聲，回過頭，看了你很久。\n\n「斷劍峰。」他說。';
      return '山門外的劍階底下，有個背著長劍的年輕人在練劍。一招一式都慢得出奇，慢得你看得清他劍尖上的每一點寒光——你看著看著，背上出了一層冷汗。\n\n他收了劍：「看夠了？」';
    },
    choices: [
      {
        text: '「你說的『中州見』，我來了。」',
        show: (s) => !flag(s, 'ye_zz_met') && flag(s, 'ye_lineage'),
        out: {
          text: '「本宗不收外人。」他說，「劍冢碑的事，我跟長老說了。長老說：東荒來的散修，說什麼都行。」\n\n他說得很平靜，像在說別人的事。\n\n「我不信長老。」他說，「我信那道劍痕。」\n\n他看著山門裡的劍階，沉默了一會兒：「改天，我帶你上去看一樣東西。現在還不行。」\n\n說完，他又坐下來擦劍了。',
          effects: [['flag', 'ye_zz_met'], ['flag', 'ye_promise'], ['favor', 'ye_guhan', 10], ['sysexp', 12], ['log', '在天劍宗山門外與葉孤寒重逢：他說，改天帶你上去看一樣東西']],
        },
      },
      {
        text: '「你還記得我。」',
        show: (s) => !flag(s, 'ye_zz_met') && !flag(s, 'ye_lineage') && met(s, 'ye_guhan'),
        out: {
          text: '「你看了一天一夜的劍痕。」他說，「我記得。」\n\n他回過頭去，看著山門裡的劍階：「你很好。」\n\n還是那句話。這一回，他說完沒有走。',
          effects: [['flag', 'ye_zz_met'], ['favor', 'ye_guhan', 5], ['sysexp', 6]],
        },
      },
      {
        text: '「你的劍，太慢了。」',
        show: (s) => !flag(s, 'ye_zz_met') && !met(s, 'ye_guhan'),
        out: {
          text: '他愣了一下，然後——你很難說那是不是笑——嘴角動了一下。\n\n「三千年來，」他說，「你是第二個這麼說的人。」\n\n「第一個呢？」\n\n「刻那道劍痕的人。」他把劍背回背上，「我叫葉孤寒。」',
          effects: [['meet', 'ye_guhan'], ['flag', 'ye_met'], ['flag', 'ye_zz_met'], ['favor', 'ye_guhan', 8], ['sysexp', 10], ['log', '在天劍宗山門外，認識了劍子葉孤寒']],
        },
      },
      {
        text: '「林塵在中州。你見過他嗎？」',
        show: (s) => flag(s, 'ye_zz_met') && met(s, 'lin_chen') && linAbroad(s) && !flag(s, 'ye_lin_asked'),
        out: {
          text: '他擦劍的手停了一下。\n\n「上個月，他在山門外站了一整天。」他說，「沒有進來，也沒有說話。天黑了，就走了。」\n\n「他想做什麼？」\n\n「跟我打一場。」葉孤寒說，「我知道。他也知道我知道。」\n\n他把劍收回鞘裡：「還不到時候。」',
          effects: [['flag', 'ye_lin_asked'], ['insight', 1], ['sysexp', 8]],
        },
      },
      { text: '看他練一會兒劍。', show: (s) => flag(s, 'ye_zz_met'), out: { text: '他練了一個時辰，你看了一個時辰。他的劍越來越慢，慢到最後，你覺得那一劍好像一直停在那裡，從來沒有動過。', effects: [['favor', 'ye_guhan', 2], ['insight', 1]] } },
      { text: '走了。', out: {} },
    ],
  },

  // ── 舊觀星台 ──
  {
    id: 'gx_arrive',
    trigger: 'arrive',
    nodes: GX,
    once: true,
    title: '舊觀星台',
    text: '山頂光禿禿的，連草都長不高。石台塌了一半，台上的石板裂成一塊一塊，縫裡長著青苔。\n\n台邊蹲著一隻石獸，頭朝著天，背上落滿了鳥糞。\n\n你站在台下往上看。這裡離天，好像比別處近一些。',
    choices: [{ text: '繞著石台走一圈。', out: { effects: [['sysexp', 8], ['log', '上了臨江城北的舊觀星台']] } }],
  },
  {
    id: 'gx_platform',
    title: '觀星台',
    trigger: 'explore',
    poi: 'gx_platform',
    nodes: GX,
    priority: 6,
    steps: {
      start: {
        text: (s) => {
          if (!flag(s, 'gx_guard_down')) {
            return night(s)
              ? '你踏上石台。台上的星光亮得出奇，亮得你看清了石板上刻著的每一道線：一張星圖，一顆星一個小坑。\n\n你的腳剛落在台中央，台邊的石獸，睜開了眼睛。\n\n牠的眼睛裡，也是星光。'
              : '白天的觀星台，只是一堆石頭。台邊的石獸頭朝著天，一動不動。\n\n可你總覺得，牠在看你。\n\n夜裡再來。';
          }
          if (!flag(s, 'gx_page'))
            return night(s)
              ? '石獸倒在台邊，碎成了幾塊。台中央的石板裂開了一道縫，縫裡透出一點光——不是星光，是一頁紙。'
              : '石台上安安靜靜的。台中央的石板裂開了一道縫，縫裡黑漆漆的。\n\n要等星光照進去，才看得見。';
          return night(s) ? '你躺在石台上看星。星星低得像是伸手就摘得到。' : '白天的觀星台，只是一堆石頭。';
        },
        choices: [
          {
            text: '拔劍。',
            show: (s) => !flag(s, 'gx_guard_down') && night(s),
            check: { kind: 'power', diff: 300 },
            fight: { foes: [['star_beast', 1]], close: true },
            ok: {
              text: '石獸撲倒在台邊，身上的星光一點一點暗了下去。牠最後一次抬起頭，看了看天，然後碎成了幾塊。\n\n台中央的石板，喀的一聲，裂開了一道縫。',
              effects: [['flag', 'gx_guard_down'], ['sysexp', 25], ['log', '打碎了舊觀星台上的守台石獸']],
              next: 'start',
            },
            fail: {
              text: '石獸的爪子把你從台上掃了下去。你一路滾到半山腰，撞在一塊石頭上，才停了下來。\n\n山頂上，石獸又蹲回了台邊，頭朝著天。',
              effects: [['wound', 0.35]],
            },
          },
          {
            text: '伸手去拿。',
            show: (s) => flag(s, 'gx_guard_down') && !flag(s, 'gx_page') && night(s),
            out: {
              text: (s) =>
                `紙很舊了，字卻一看就懂——跟接天城地宮裡那一頁，是同一個人的筆跡。\n\n${FRAGMENTS.frag_star.text}\n\n${
                  awake(s)
                    ? '玄微很久沒有說話。\n\n「我教他們看星。」他終於說，「他們學會了看命簿。」\n\n「後來，他們想替天寫。」'
                    : '叮——記憶校正：百分之……\n\n系統的聲音停住了，像一個人說到一半，想起了不該想起的事。'
                }`,
              effects: [['frag', 'frag_star'], ['flag', 'gx_page'], ['insight', 3], ['mind', 5], ['sysexp', 40], ['log', '在舊觀星台的石縫裡，找到玄微留下的一頁天機殘頁']],
            },
          },
          { text: '躺下來看星。', show: (s) => flag(s, 'gx_page') && night(s), out: { text: '你看了一夜的星。天快亮的時候，你忽然覺得，那些星星排成的，像是字。', effects: [['mind', 2], ['insight', 1]] } },
          { text: '下山。', out: {} },
        ],
      },
    },
  },
  {
    id: 'gx_stele',
    trigger: 'explore',
    poi: 'gx_stele',
    nodes: GX,
    once: true,
    title: '斷碑',
    text: '石台下立著一塊斷碑，上半截不知去向，下半截上還剩幾行字：\n\n「……監正□□，率弟子七人，壘石為台，夜觀天象。台成之夜，天降星雨，七日不絕。監正曰：天有書，星其字也……」\n\n「監正」後頭那兩個字的地方，被人用鑿子鑿掉了，鑿得乾乾淨淨。',
    choices: [
      {
        text: '用手摸那兩個鑿掉的字。',
        out: {
          text: (s) => (awake(s) ? '你的手指摸過那兩個坑。腦子裡的聲音，很久很久沒有說話。' : '坑很淺，摸不出原來是什麼字。\n\n叮——……\n\n系統叮了一聲，什麼也沒說。'),
          effects: [['flag', 'gx_stele_read'], ['insight', 1], ['sysexp', 8], ['log', '讀了舊觀星台下的斷碑：監正的名字被人鑿掉了']],
        },
      },
    ],
  },

  // ── 謝家莊、龍脊嶺、百草谷、雲夢、靈田、蘆蕩、官道關: what each is, for now ──
  {
    id: 'xj_gate',
    trigger: 'explore',
    poi: 'xj_gate',
    nodes: XJ,
    cooldown: 30,
    title: '謝家莊',
    text: '莊門口站著四個家丁，腰上都掛著刀。你還沒走近，一個家丁就迎了上來：「謝家莊，閒人免進。」\n\n牆裡傳出絲竹聲，一陣一陣的，是在辦什麼宴席。',
    choices: [{ text: '走了。', out: {} }],
  },
  {
    id: 'lg_mine',
    trigger: 'explore',
    poi: 'lg_mine',
    nodes: LG,
    cooldown: 30,
    title: '靈石礦',
    text: '礦口立著兩塊界碑，一塊刻著「謝」，一塊刻著「上官」，中間隔著三步遠。兩家的護衛各站一邊，誰也不看誰。\n\n礦口黑漆漆的，往外冒著一股涼氣。涼氣裡，是很濃的靈氣。',
    choices: [{ text: '走了。', out: { effects: [['flag', 'lg_seen']] } }],
  },
  {
    id: 'bc_mouth',
    trigger: 'explore',
    poi: 'bc_mouth',
    nodes: BC,
    cooldown: 30,
    title: '百草谷',
    text: (s) =>
      `谷口的石頭上刻著三個字：百草谷。谷裡飄出來的風，一年四季都是香的。\n\n藥廬門口貼著一張告示：「谷主閉關，百草谷暫不收客。」${
        flag(s, 'ge_story') || has(s, 'ge_book') ? '\n\n你想起孫掌櫃說過，葛老是從中州來的。' : ''
      }`,
    choices: [{ text: '在谷口站了一會兒。', out: { effects: [['mind', 1]] } }],
  },
  {
    id: 'ym_hut',
    trigger: 'explore',
    poi: 'ym_hut',
    nodes: YM,
    once: true,
    title: '漁屋',
    text: '澤邊有一間漁屋，屋簷下掛著一張破網。一個老漁夫坐在門檻上補網。\n\n「大澤裡的蛟？」他頭也不抬，「我爺爺見過牠的尾巴，我爹見過牠的爪子，我見過牠的一隻眼睛。」\n\n「下一個，」他說，「該見牠的嘴了。」',
    choices: [{ text: '記下了。', out: { effects: [['flag', 'ym_heard'], ['sysexp', 5]] } }],
  },
  {
    id: 'lt_wheel',
    trigger: 'explore',
    poi: 'lt_wheel',
    nodes: LT,
    cooldown: 20,
    title: '水車',
    text: (s) =>
      variant(s, [
        '水車吱呀吱呀地轉著，把江水一斗一斗地送進田裡。田埂上蹲著一個佃農，在算今年的收成：「一年的靈稻，七成交租。剩下三成，夠吃，不夠活。」',
        '一群孩子在田埂上追著蜻蜓跑。一個孩子跑著跑著摔進了田裡，爬起來，渾身是泥，手裡還捏著那隻蜻蜓。',
      ]),
    choices: [{ text: '走了。', out: { effects: [['mind', 1]] } }],
  },
  {
    id: 'jd_reeds',
    trigger: 'explore',
    poi: 'jd_reeds',
    nodes: JD,
    once: true,
    title: '蘆蕩深處',
    text: '蘆葦比人還高。你撥開蘆葦往裡走，走到腳下的泥沒過了腳踝。\n\n泥裡半埋著一塊石頭，青黑色的，上面刻著一隻眼睛。刻得很粗，卻很像——像你渡江的時候，在江心看見的那一隻。\n\n石頭前面擺著幾個爛了的果子，是有人供在這裡的。',
    choices: [
      {
        text: '也放一點東西在石頭前。',
        out: { text: '你放下一塊乾糧。蘆葦叢裡起了一陣風，嘩啦啦的，像有什麼很大的東西翻了個身。', effects: [['flag', 'river_eye_stone'], ['mind', 3], ['sysexp', 6]] },
      },
      { text: '走開。', out: { effects: [['flag', 'river_eye_stone']] } },
    ],
  },
  {
    id: 'gd_gate',
    trigger: 'explore',
    poi: 'gd_gate',
    nodes: GG,
    cooldown: 10,
    title: '官道關',
    text: (s) =>
      s.day >= dayAt(9, 1)
        ? '關門緊閉，關樓上的兵丁比從前多了一倍。「天衍城戒嚴，」守關的校尉說，「欽天監的令：天象有變，關上只出不進。」\n\n「什麼天象？」\n\n他看了你一眼：「我要是知道，就不在這裡守關了。」'
        : '關樓上插著大衍皇朝的旗。關門開著，卻沒有人往東走——過關要通行令牌。\n\n「令牌？」守關的校尉說，「城主府發的。這兩年不發了。」他朝東邊努了努嘴，「天衍城那邊的意思。說是欽天監算出來，天象要變。」',
    choices: [{ text: '往東看了一眼。', out: { text: '官道往東，鑽進了兩座山之間。山那頭，是天衍城。', effects: [['flag', 'gg_seen']] } }],
  },

  // ── 天元三千零二十二年七月十五 (1.0–1.2: only the omen — the stroke does not fall) ──
  {
    id: 'blood_moon_omen',
    trigger: 'scheduled',
    once: true,
    // (world/arcs.js recurring schedules it for 子時 that night, wherever you are)
    cond: (s) => s.day === BLOOD_DAY + 1 && s.tod < 5,
    title: '血月',
    text: (s) =>
      [
        '子時，月亮升到了頭頂。月亮是紅的。',
        '不是邊上帶一圈紅——是整個兒的紅，紅得像一隻浸在血裡的眼睛。四下裡的蟲聲一下子停了，連風都停了。',
        (s.world?.map || 'donghuang') === 'zhongzhou'
          ? '天上裂開了一道縫，在西邊，在大江那頭，在東荒的頭頂上。縫裡亮了一下，像有人提起了一支筆。'
          : '天上裂開了一道縫，就在頭頂上。縫裡亮了一下，像有人提起了一支筆。',
        '你等著。所有人都在等著。',
        '那一筆，沒有落下來。',
        awake(s)
          ? '縫慢慢合上了。月亮一點一點地白了回去。\n\n「……停住了。」玄微說。他的聲音很輕，像怕驚動了什麼，「這一回，停住了。」'
          : '縫慢慢合上了。月亮一點一點地白了回去。\n\n叮——偵測到天象異常。\n\n叮——異常已消失。原因：不明。',
      ].join('\n\n'),
    choices: [{ text: '看著天，直到天亮。', out: { effects: [['flag', 'blood_moon_omen'], ['insight', 2], ['sysexp', 30], ['log', '天元三千零二十二年七月十五，月亮紅了；天上的那一筆，沒有落下來']] } }],
  },
];
