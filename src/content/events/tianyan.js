// 中州・天衍城 (1.2「天衍城」): the capital of 大衍. The ways there and back: the 官道 east from 官道關 (three
// days; papers at the pass — or not, and the risk of it: content/events/zhongzhou.js gd_gate), the 傳送陣
// between 臨江城 and the 外城 (a moment, for 靈石; papers going in, none going out); the first sight of the
// white peak the city is built round; and the 禁軍, whose sky it is.
import { flag, has, needLs } from '../helpers.js';
import { power } from '../../core/cultivation.js';
import { repOf } from '../../world/factions.js';

const TR = ['ty_road'];
const WC = ['waicheng'];
const LJ = ['linjiang'];

/** The system has woken and remembers its name: it speaks as 玄微. */
const awake = (s) => flag(s, 'sys_awakened');

/** Papers for the shut capital: a 通行令牌, 欽天監's token, or the word of 天劍宗 for one of its 客卿. */
export const papers = (s) => has(s, 'tongxing_ling') || has(s, 'qintian_token') || flag(s, 'tianjian_guest');

/** What you show, said the way you would show it. */
export const paperName = (s) => (has(s, 'qintian_token') ? '欽天監的腰牌' : has(s, 'tongxing_ling') ? '通行令牌' : '天劍宗客卿的名號');

/** Where papers are to be had, as those who check them tell it. */
export function passHint(s) {
  const lines = ['「令牌？臨江城的城主府發。這兩年發得少了，得是城裡叫得出名號的人——懸賞堂裡揭過幾張榜的——還得花錢。」'];
  lines.push(flag(s, 'sg_boat_owed') ? '「上官家的船跑京城，他們家押貨的牌子也算數。聽說上官家還欠著你一回？」' : '「上官家的船跑京城，他們家押貨的牌子也算數。」');
  lines.push('「天劍宗的客卿？那不用牌子，報個名號就行。」');
  if (repOf(s, 'linjiang') >= 25) lines.push('「你在臨江城有些名號了，去城主府問問吧。」');
  return lines.join('\n\n');
}

export default [
  // ── 臨江城 → 天衍城: the 傳送陣 by the 城主府 (world/atlas.js CROSSINGS.linjiang) ──
  {
    id: 'lj_array',
    trigger: 'explore',
    poi: 'lj_array',
    nodes: LJ,
    title: '傳送陣',
    text: (s) =>
      `陣師是個瘦老頭，坐在陣邊的小凳上打盹。聽見腳步聲，他睜開一隻眼睛：「往天衍城？一百五十塊靈石。」\n\n他又伸出一隻手：${
        papers(s) ? '「令牌。」' : '「還有令牌。京師戒嚴，沒有令牌，陣不開——開了，那邊的禁軍也會把你原樣送回來。」'
      }`,
    choices: [
      {
        text: (s) => `付靈石，報上${paperName(s)}。`,
        show: papers,
        need: needLs(150),
        out: {
          text: '陣師收了靈石，看了一眼你的令牌，往陣紋裡撒了一把碎靈石。\n\n陣紋亮了起來，光從腳底下往上漫，漫過膝蓋、腰、頭頂——你眼前一白。',
          effects: [['ls', -150], ['cross', 'linjiang'], ['sysexp', 3]],
        },
      },
      { text: '「令牌哪裡辦？」', show: (s) => !papers(s), out: { text: (s) => `陣師打了個哈欠。\n\n${passHint(s)}`, effects: [['flag', 'ty_pass_asked']] } },
      { text: '不坐了。', out: {} },
    ],
  },

  // ── 天衍城 → 臨江城: going out of the capital, nobody asks (world/atlas.js CROSSINGS.waicheng) ──
  {
    id: 'wc_array',
    trigger: 'explore',
    poi: 'wc_array',
    nodes: WC,
    title: '傳送陣',
    text: '陣師是個胖子，坐在陣邊數靈石。「往臨江城？一百塊。」他頭也不抬，「出京不驗牌——只出不進嘛。」',
    choices: [
      {
        text: '付一百塊靈石，上陣。',
        need: needLs(100),
        out: { text: '陣紋亮了起來。你眼前一白——再睜開眼，臨江城的城主府就在旁邊，街上的吆喝聲一下子湧了過來。', effects: [['ls', -100], ['cross', 'waicheng']] },
      },
      { text: '不坐了。', out: {} },
    ],
  },

  // ── back west along the 官道, three days to 官道關 (world/atlas.js CROSSINGS.ty_road) ──
  {
    id: 'ty_west',
    trigger: 'explore',
    poi: 'ty_west',
    nodes: TR,
    title: '往西的官道',
    text: '官道往西，鑽進了兩座山之間。三天的路，走回去就是官道關；再往西，是臨江城。',
    choices: [
      {
        text: '往西走，回臨江一帶。',
        out: { text: '你沿著官道往西走。玉指峰在身後一點一點矮下去，第三天的傍晚，官道關的關樓從山口後面露了出來。\n\n出關不驗牌。守關的校尉看了你一眼，揮了揮手。', effects: [['cross', 'ty_road']] },
      },
      { text: '再待一陣。', out: {} },
    ],
  },

  // ── the first time: the white peak ──
  {
    id: 'ty_first',
    trigger: 'arrive',
    nodes: [...TR, ...WC],
    once: true,
    priority: 20,
    title: '天衍城',
    text: (s) =>
      [
        s.player.loc === 'waicheng'
          ? '陣光散了。你站在一片石板廣場上，四周的人來來往往，沒有一個人多看你一眼——每天從這座陣裡走出來的人，比臨江城一天進城的人還多。'
          : '出了官道關，往東走了三天。第三天的早上，山勢緩了下來，官道兩邊的田多了起來。',
        '然後你看見了它。',
        '北邊的天底下，立著一座孤峰。白的，白得像玉；直的，直得像一根豎起來的指頭——指節的地方，還有一道一道的橫紋。峰腰上一座高台，台上的屋頂金光閃閃；峰頂罩著一層雲，雲是淡紅色的。',
        '玉指峰。天衍城就圍著它建：城牆一眼望不到頭，城裡的屋頂一片連著一片，像魚鱗。',
        awake(s)
          ? '腦子裡，玄微很久沒有說話。\n\n「……原來在這裡。」他終於說，「我來過這裡。很久以前，我在這座山底下，教人看星星。」'
          : '叮——偵測到巨大的氣運匯聚。偵測到……\n\n系統卡住了。過了很久，才跳出一行字：「此物，不在命簿上。」',
      ].join('\n\n'),
    choices: [
      {
        text: '往城裡走。',
        out: { effects: [['flag', 'ty_arrived'], ['discover', 'waicheng'], ['sysexp', 30], ['log', '到了天衍城，看見了玉指峰']] },
      },
    ],
  },

  // (world/explore.js cityWatch) flown over the 外城 too long: the 禁軍 have brought you down
  {
    id: 'ty_nofly',
    trigger: 'scheduled',
    title: '京師禁空',
    text: '你剛落地，一隊禁軍就圍了上來。黑甲，紅纓，十二桿槍，一桿也沒有抖。\n\n「京師禁空，」領頭的校尉說，「天衍城的天，是皇上的天。你飛得上去，倒是好本事。」',
    choices: [
      {
        text: '認罰。',
        need: needLs(60),
        out: {
          text: '校尉收了六十塊靈石，翻開冊子要記你的名字。他寫了一筆，墨跡浮在紙上，滲不下去；又寫一筆，還是一樣。\n\n「怪事。」他把冊子合上，盯著你看了很久，「……走吧。下一回，是箭。」',
          effects: [['ls', -60], ['rep', 'tianyan', -3]],
        },
      },
      {
        text: '動手。',
        check: { kind: 'power', diff: (s) => Math.max(260, Math.round(power(s))) },
        fight: { foes: [['jinjun', 3]], close: true },
        ok: {
          text: '三個禁軍倒在地上。城頭上的鼓響了，一聲接一聲，整座城的禁軍都往這邊來了。\n\n你最好在他們趕到以前，消失在巷子裡。',
          effects: [['rep', 'tianyan', -20], ['flag', 'ty_fought_jinjun'], ['log', '在天衍城打倒了攔你的禁軍']],
        },
        fail: {
          text: '你被按在地上，捆了，押進京兆府的大牢，關了五天。\n\n出來的時候，你身上的靈石少了一半。牢頭說，那是「食宿」。',
          effects: [['halfls'], ['hours', 120], ['rep', 'tianyan', -6]],
        },
      },
      {
        text: '跑。',
        check: { kind: 'jiyuan', diff: 7 },
        ok: { text: '你一矮身，從兩桿槍中間鑽了過去，鑽進了坊市的人堆裡。身後的鼓聲響了很久。', effects: [['rep', 'tianyan', -8]] },
        fail: { text: '你沒跑出三步，一桿槍橫掃過來，掃在你的腿彎上。\n\n罰了一百塊靈石，還挨了二十板子。', effects: [['ls', -100], ['wound', 0.1], ['rep', 'tianyan', -5]] },
      },
    ],
  },
];
