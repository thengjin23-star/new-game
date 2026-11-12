// 中州・天衍城 (1.2「天衍城」): the capital of 大衍. The ways there and back: the 官道 east from 官道關 (three
// days; papers at the pass — or not, and the risk of it: content/events/zhongzhou.js gd_gate), the 傳送陣
// between 臨江城 and the 外城 (a moment, for 靈石; papers going in, none going out); the first sight of the
// white peak the city is built round; and the 禁軍, whose sky it is.
import { flag, has, needLs, night, alive, variant } from '../helpers.js';
import { power } from '../../core/cultivation.js';
import { dayAt } from '../../core/calendar.js';
import { repOf } from '../../world/factions.js';
import { moonTonight } from '../../world/weather.js';

const TR = ['ty_road'];
const WC = ['waicheng'];
const LJ = ['linjiang'];
const HC = ['huangcheng'];
const QT = ['qintianjian'];
const YZ = ['yuzhi'];
const HL = ['huangling'];
const HG = ['hl_gong'];

/** The night of the blood moon (world/arcs.js WINDOWS.bloodMoon): the note on 東荒's page names it. */
const BLOOD = dayAt(10, 7, 15);
/** The small blood moons began in the autumn of 3017: since then the peak has been seeping. */
const SEEPING = dayAt(5, 9);

/** 蘇清瑤 means to take you in herself: a friend made in 臨江城, or a reckoning settled there, and alive. */
const suComing = (s) => alive(s, 'su_qingyao') && (flag(s, 'su_zz_ally') || flag(s, 'su_zz_beaten')) && !flag(s, 'su_archive');

/** Set you down somewhere else on the map (where you are is read again as you next move: world/explore.js afterMove). */
const putAt = (x, X, Y) => {
  x.world.x = X;
  x.world.y = Y;
  x.world.region = null;
};

/** Back down the 御階 to the plaza before it (午門外). */
const backDown = (x) => putAt(x, 2700, 2560);

/** Caught in the 皇城: three days in the 天牢, half your 靈石 for your keep — and someone stands outside the door. */
const JAIL = {
  text: '你被按在御階上，捆了，押進天牢，關了三天。\n\n天牢裡很黑。第二天夜裡，有人在牢門外站了很久，什麼也沒說，又走了。\n\n出來的時候，你身上的靈石少了一半。',
  effects: [['halfls'], ['hours', 72], ['rep', 'tianyan', -8], backDown],
};

/** The note pinned to 東荒's page, in 衛長庚's red (and, the night gone by without the stroke, what was added under it). */
const noteText = (s) =>
  `「東荒一頁，字跡錯亂，腐自此始。天元三千零二十二年七月十五，玉指峰朱墨足，當除此頁。——監正　衛長庚」${
    s.day > BLOOD ? '\n\n紙條底下，又添了一行新的朱字：「未竟。墨不足。」' : ''
  }`;

/** What the copy of three thousand years ago and this year's say, side by side; and what the system makes of it. */
const copyText = (s) =>
  `你看了一會兒，看出來了：兩本寫的是同一套事。退婚，三年之約，宗門大比，秘境奪寶——名字換了，地方換了，一行一行的順序，一模一樣。${
    flag(s, 'sys_awakened')
      ? '\n\n腦子裡，玄微的聲音很低：「斷了一根指頭的手，寫不出新的字了。」他說，「它只能照著舊的，一遍一遍地抄。」'
      : '\n\n叮——檢測到大量重複文本。相似度：百分之九十九點七。'
  }`;

/** What is known, once the 抄本 has been read (by whatever way): the date, the page, the ink. */
const TRUTH = [['flag', 'ty_truth'], ['flag', 'ty_book_seen'], ['flag', 'yz_ink_known']];

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

  // ── 蘇清瑤 has found it (world/arcs.js zhongzhouYears: WINDOWS.suFound): her token and a line, wherever you are in 中州 ──
  {
    id: 'su_token',
    trigger: 'scheduled',
    cond: (s) => ['zhongzhou', 'tianyan'].includes(s.world?.map) && alive(s, 'su_qingyao'),
    title: '一塊腰牌',
    text: (s) =>
      `${night(s) ? '夜裡，' : ''}一個穿深青色袍子的年輕星官找到了你。他四下看了看，把一個布包塞進你手裡，一句話也沒說就走了。\n\n布包裡是一塊白玉腰牌，刻著北斗七星；還有一張字條，字很小，寫得很用力：\n\n「我查到了。\n天衍城，欽天監，星官署。\n腰牌上是我的名字——禁軍看見它，會讓你上御階。\n——清瑤」${
        flag(s, 'su_zz_beaten') && !flag(s, 'su_zz_ally') ? '\n\n字條的背面還有一行：「古戰場那筆帳，兩清了。這一回，算我求你。」' : ''
      }`,
    choices: [{ text: '收好腰牌。', out: { effects: [['item', 'qintian_token', 1], ['flag', 'huangcheng_pass'], ['flag', 'su_token'], ['sysexp', 10], ['log', '蘇清瑤托人送來欽天監的腰牌：「我查到了。」']] } }],
  },

  // ── the 御階: the 禁軍 are its gate (no token: turned back — or, by night, past them in the dark; or through them) ──
  {
    id: 'hc_guard',
    trigger: 'arrive',
    nodes: HC,
    priority: 30,
    cond: (s) => !flag(s, 'huangcheng_pass') && !flag(s, 'hc_in'),
    title: '御階',
    steps: {
      start: {
        text: (s) =>
          `你剛踏上御階，一桿長槍就橫了過來，槍纓是紅的。\n\n「站住。」禁軍校尉說，「皇城重地。腰牌。」${
            night(s) ? '\n\n天黑了。御階上的火把隔十級才有一支，兩支火把之間，是一段一段的黑。' : ''
          }`,
        choices: [
          {
            text: '等巡夜的走過去，貼著山壁摸上去。',
            show: night,
            check: { kind: 'jiyuan', diff: 6 },
            ok: {
              text: '巡夜的禁軍走過去了。你貼著山壁，一級一級往上摸。火把的光從你腳邊掃過去，又掃了回來。\n\n你翻過了午門旁邊的矮牆。皇城裡很靜，只有風從玉指峰上刮下來。\n\n往後在皇城裡，誰看見你，都會喊人。',
              effects: [['flag', 'hc_in'], ['flag', 'hc_snuck'], ['sysexp', 5]],
            },
            fail: { text: '你踩響了一塊鬆動的石頭。\n\n「什麼人！」', next: 'caught' },
          },
          {
            text: '硬闖。',
            check: { kind: 'power', diff: (s) => Math.max(320, Math.round(power(s) * 1.15)) },
            fight: { foes: [['jinjun', 4]], close: true },
            ok: {
              text: '四個禁軍倒在御階上。午門上的鼓響了，一聲接一聲——你闖進了皇城。\n\n從現在起，皇城裡的每一個禁軍，都在找你。',
              effects: [['flag', 'hc_in'], ['flag', 'hc_wanted'], ['rep', 'tianyan', -25], ['log', '打上了御階，闖進了皇城']],
            },
            fail: JAIL,
          },
          { text: '轉身下去。', out: { text: '你轉身走下了御階。校尉的槍收了回去，又一動不動了。', effects: [backDown] } },
        ],
      },
      caught: {
        text: '火把一下子全亮了。三個禁軍從午門裡衝出來，把你堵在御階的半中間。',
        choices: [
          {
            text: '拔劍。',
            check: { kind: 'power', diff: (s) => Math.max(260, Math.round(power(s))) },
            fight: { foes: [['jinjun', 3]], close: true },
            ok: { text: '三個禁軍滾下了御階。你衝過了午門。\n\n身後的鼓聲響了起來——從現在起，皇城裡的禁軍都在找你。', effects: [['flag', 'hc_in'], ['flag', 'hc_wanted'], ['rep', 'tianyan', -15]] },
            fail: JAIL,
          },
          { text: '往下跑。', out: { text: '你轉身就往下跑，三步併作兩步。身後的箭釘在石階上，一支，兩支，第三支擦著你的耳朵過去了。', effects: [['wound', 0.05], backDown] } },
        ],
      },
    },
  },

  // ── 欽天監's 抄本閣, with 蘇清瑤: the 命簿's copies; 東荒's page and the note on it; why the peak is sealed; the night; 衛長庚 at the door ──
  {
    id: 'su_archive',
    trigger: 'visit',
    npc: 'su_qingyao',
    nodes: QT,
    once: true,
    priority: 10,
    cond: (s) => flag(s, 'su_token'),
    title: '抄本閣',
    steps: {
      start: {
        text: '蘇清瑤在星官署的門口等你。她的星官服比在臨江城的那一件更深，袖口的二十八宿是銀線繡的。\n\n「跟我來。」她說，「別說話。」\n\n她帶你穿過星官署。一屋子的星官低著頭抄寫，沒有一個人抬頭。抄本閣的門前站著兩個星衛，看了一眼她的腰牌，又看了一眼你的，讓開了。她從袖子裡摸出三把鑰匙，一把一把地開了鎖。',
        choices: [{ text: '跟她進去。', out: { text: '門在你們身後合上了。', next: 'shelves' } }],
      },
      shelves: {
        text: '抄本閣裡沒有窗。四面都是架子，架子上一摞一摞全是冊子，從地上一直堆到房梁，封皮都是深青色的——跟臨江城那個書吏翻的一樣。\n\n「命簿的抄本。」蘇清瑤說，「天下每個地方一頁，每個人一行。」\n\n她隨手抽出一本，翻開。一行一行的小字：某年某月，某人，生；某人，入某宗；某人，退婚；某人，三年之約；某人，宗門大比，奪魁……\n\n「天驕榜，」她說，「就是從這裡抄出去的：命簿上，字寫得最多的那一百個人。」',
        choices: [
          {
            text: '「我的那一行呢？」',
            out: {
              text: '她把東荒那一冊翻到青石鎮，手指一行一行地往下點。王二，孫長春，林塵，趙虎……點到最後，她停了下來。\n\n「沒有。」她說，「上一世沒有，這一世也沒有。我翻了三年。」\n\n她抬起頭看著你：「所以我才找你。」',
              next: 'east',
            },
          },
        ],
      },
      east: {
        text: (s) =>
          `她把東荒那一冊抱到燈下。這一冊跟別的不一樣：頁邊密密麻麻全是朱筆的批注，有的行劃了又寫，有的行上疊著兩段字——一段墨色舊，一段墨色新。\n\n她指著其中一行。舊的那一段寫著：「天元三千零二十二年七月十五，蘇清瑤，歿。」新的那一段壓在上面：「蘇清瑤，入欽天監。」\n\n「上一世的我，」她說，「和這一世的我。」她的手指在那一行上停了很久，「欽天監說，這就是爛：一個人，寫了兩遍。」\n\n這一冊的第一頁上，別著一張紙條，字是朱紅的：\n\n${noteText(s)}\n\n「除，就是撕。」蘇清瑤說，「血月那一夜，他們要拿玉指峰的墨，把東荒這一頁，整頁劃掉。」`,
        choices: [
          {
            text: '「劃掉了，會怎樣？」',
            out: { text: '「被劃到的地方，人死，獸狂，地裂。」她說，「靈氣倒流回玉指峰。中州的世家都知道——他們這兩年囤靈石，等的就是那一波靈脈。」\n\n「上一世，我就死在那一夜。」', next: 'ink' },
          },
          {
            text: '「為什麼是東荒？」',
            out: { text: '「因為東荒爛得最厲害。」她說，「兩段字跡的人；劍仙的傳人；還有傳說裡的命外之人。」她看著你，「欽天監相信，不撕掉這一頁，整本書都會跟著爛。」', next: 'ink' },
          },
        ],
      },
      ink: {
        text: (s) =>
          `「玉指峰為什麼封山，你知道嗎？」她把冊子合上。\n\n「這幾年，峰頂開始滲墨。紅的，像血。小血月的夜裡滲得最多——」她頓了一下，「不是小血月讓它滲墨。是他們每試一回筆，峰就滲一回。欽天監把滲出來的墨，存在峰頂觀星台的墨池裡。等池子滿了，就是那一夜。」\n\n她又抽出兩本冊子，一本的封皮都脆了，一本是新的，並排攤開：「三千年前的，和今年的。」\n\n${copyText(s)}\n\n「命簿不是在爛，」你說，「是在抄。」\n\n「欽天監不這麼想。」`,
        choices: [
          {
            text: '「那一夜，我們怎麼辦？」',
            out: {
              text: '「你是朱筆劃不到的人。」她說，「筆落在你身上，找不到字，就散了。這一世多了一個你，那一夜，擋得住。」\n\n「可是你只有一個人，」她說，「只能在一個地方。」\n\n她從袖子裡抽出一張摺好的紙，上面是她的字，一個一個的名字：王二一家、孫掌櫃、松鶴道長、胡三娘、沈家、趙虎、錢半仙……\n\n「東荒的人。」她說，「能撤的，先撤；撤不走的，找地方躲；躲不了的，託人照看。剩下的——」她把紙放進你手裡，「看你。」',
              effects: [...TRUTH, ['flag', 'su_archive'], ['flag', 'ty_roster'], ['favor', 'su_qingyao', 10], ['insight', 4], ['sysexp', 80], ['log', '欽天監的抄本閣：天元三千零二十二年七月十五，欽天監要用玉指峰的墨，撕掉東荒那一頁']],
              next: 'door',
            },
          },
        ],
      },
      door: {
        text: '你們走出抄本閣的時候，天已經黑了。\n\n門外的台階上站著一個人，背著手，看著山頂。他看上去不過五十，鬢角白了一半；身上的星官服什麼也沒有繡。\n\n蘇清瑤的腳步停住了：「監正。」\n\n衛長庚轉過身來，看了她一眼，又看著你。看了很久。\n\n「你就是天驕榜底下那一格空白。」他說，聲音很慢，「我找了你三個月。冊子上沒有你。」\n\n他沒有問你在抄本閣裡看見了什麼。\n\n「撕掉一頁，救一本書。」他說，「三千年來，欽天監撕過九頁。每一頁撕下去以前，都有人站在這裡，跟我說不行。」他笑了一下，「他們說得對。可是書還在。」\n\n「你若是我，」他說，「你怎麼做？」',
        choices: [
          {
            text: '「去找那隻手。」',
            out: { text: '衛長庚看著你，眼睛裡有一點東西亮了一下，又滅了。\n\n「找到了，」他說，「告訴我。」\n\n他走下台階，走進了黑暗裡。', effects: [['meet', 'wei_changgeng'], ['flag', 'wei_met'], ['flag', 'wei_hand'], ['favor', 'wei_changgeng', 3], ['sysexp', 20]] },
          },
          {
            text: '「不撕。」',
            out: { text: '「那就看著它爛。」他說，「看著它一頁一頁地爛，爛到你在乎的每一個人身上。」\n\n他走下台階。走了幾步，又停下來：「那一夜，別站在東荒。朱筆劃不到你——也救不了誰。」', effects: [['meet', 'wei_changgeng'], ['flag', 'wei_met'], ['sysexp', 20]] },
          },
          {
            text: '不說話。',
            out: { text: '你什麼也沒說。衛長庚點了點頭，像是你說了什麼。\n\n「蘇星官。」他說，「明天，把東荒那一冊送到觀星台來。」\n\n他走了。蘇清瑤的手指，在袖子裡攥緊了。', effects: [['meet', 'wei_changgeng'], ['flag', 'wei_met'], ['sysexp', 20]] },
          },
        ],
      },
    },
  },

  // ── afterwards, at 欽天監: 蘇清瑤 at her desk; 衛長庚 under the cliff ──
  {
    id: 'su_qt',
    trigger: 'visit',
    npc: 'su_qingyao',
    nodes: QT,
    cond: (s) => flag(s, 'su_archive'),
    title: '蘇清瑤',
    text: (s) =>
      variant(s, [
        '蘇清瑤在星官署的角落裡抄冊子，抄得很慢。看見你，她把筆擱下：「名單上的人，你想好了嗎？」',
        '蘇清瑤站在星官署的屋簷下，看著峰頂。峰頂上的紅光一明一滅。\n\n「他讓我把東荒那一冊送上去，」她說，「我送了。抄了一本假的送的。」',
        '蘇清瑤在數日子。桌上的曆書翻到了七月，七月十五那一天，被她用指甲劃了一道痕。',
      ]),
    choices: [
      { text: '「上一世的那一夜，你在哪裡？」', show: (s) => !flag(s, 'su_last_night'), out: { text: '「在青石鎮。」她說，「我回去找一個人。沒找到，月亮就紅了。」\n\n她低下頭，接著抄：「這一世，我在觀星台上。他們下筆的時候，總得有人在旁邊看著。」', effects: [['flag', 'su_last_night'], ['favor', 'su_qingyao', 2]] } },
      { text: '陪她站一會兒。', out: { text: '你們站在屋簷下，看著峰頂的紅光。誰也沒有說話。', effects: [['favor', 'su_qingyao', 1], ['mind', 1]] } },
      { text: '走開。', out: {} },
    ],
  },
  {
    id: 'wei_talk',
    trigger: 'visit',
    npc: 'wei_changgeng',
    nodes: QT,
    title: '衛長庚',
    text: (s) =>
      flag(s, 'wei_met')
        ? variant(s, [
            '衛長庚站在山壁底下，仰頭看著峰頂，看了很久。\n\n「你又來了。」他沒有回頭，「找到那隻手了嗎？」',
            '衛長庚坐在星官署的台階上，膝上攤著一冊抄本，翻得很慢。\n\n「三千年前的人，也退婚。」他說，「也有三年之約。」他合上冊子，「你說，這是天意，還是抄錯了？」',
            '衛長庚在看星。他指著天上的一顆：「那是你們東荒的天樞星。」又指著它旁邊，「這裡，從前沒有星。」那裡什麼也沒有。',
          ])
        : '一個鬢角斑白的人站在山壁底下，背著手。他身邊的星官說：「監正不見閒人。」',
    choices: [{ text: '走開。', out: {} }],
  },

  // ── 天驕閣: the capital's 天驕榜 — and, for one 蘇清瑤 is not bringing, 衛長庚 sends down for you ──
  {
    id: 'wc_board',
    trigger: 'explore',
    poi: 'wc_board',
    nodes: WC,
    title: '天驕閣',
    steps: {
      start: {
        text: (s) =>
          `天驕閣的牆上貼著天下的天驕榜，比臨江城的那一張大三倍。第一名，天劍宗，葉孤寒；第二名，大衍三皇子；第三名……\n\n${
            flag(s, 'bang_blank') ? '第一百名的下面，多了一格，空的。格子旁邊蓋著欽天監的大印——比臨江城那一張上的，還要紅。' : '一百個名字，一個也不多，一個也不少。'
          }${
            !flag(s, 'ty_book_seen') && !suComing(s) && !flag(s, 'wei_met')
              ? '\n\n你看榜的時候，一個穿深青色袍子的年輕星官走到了你身邊，拱了拱手：「閣下，監正請你上山一趟。」\n\n他遞過來一塊竹符，上面烙著一個「衍」字：「持此符，禁軍不攔。只今夜。」'
              : ''
          }`,
        choices: [
          {
            text: '跟他上山。',
            show: (s) => !flag(s, 'ty_book_seen') && !suComing(s) && !flag(s, 'wei_met'),
            out: {
              text: '你跟著他出了外城的北門，上了御階。禁軍看了一眼竹符，讓開了。\n\n你們穿過皇城，到了玉指峰的山壁底下。',
              effects: [['flag', 'hc_in'], ['hours', 2], (x) => putAt(x, 2700, 1650)],
              next: 'wei',
            },
          },
          { text: '「不去。」', show: (s) => !flag(s, 'ty_book_seen') && !suComing(s) && !flag(s, 'wei_met'), out: { text: '星官也不勉強，收回了竹符：「監正說，閣下不來，他就再等。」' } },
          { text: '看完了。', out: { effects: [['flag', 'wc_board_seen']] } },
        ],
      },
      wei: {
        text: (s) =>
          `抄本閣裡只點了一盞燈。衛長庚坐在燈下，面前攤著一冊命簿的抄本，封皮上寫著：東荒。他看上去不過五十，鬢角白了一半。\n\n「坐。」他說。他把冊子轉過來，推到你面前，「找你自己。」\n\n你一行一行地看下去。青石鎮，落霞坊市，青雲宗，黑風寨……每一個你認得的人都在上面，生，老，病，死，連王二家的雞哪一年被黃鼠狼叼走，都寫著。\n\n沒有你。\n\n「我也找過。」衛長庚說，「三個月。」\n\n他把冊子翻回第一頁。第一頁上別著一張朱紅的紙條，是他的字：\n\n${noteText(s)}\n\n「除，就是撕。」他說得很平靜，像在說明天會下雨，「三千年來，欽天監撕過九頁。這是第十頁。」`,
        choices: [
          {
            text: '「為什麼？」',
            out: {
              text: (s) =>
                `「因為它在爛。」他又抽出兩本冊子，一本三千年前的，一本今年的，並排攤開。\n\n${copyText(s)}\n\n「整本書都在重抄。」他說，「抄錯了，就爛了。東荒錯得最多：兩段字跡的人，劍仙的傳人……」他看著你，「還有你。」\n\n「峰頂這幾年開始滲墨。小血月，是我在試筆；墨存在觀星台的池子裡。等池子滿了，這一頁就撕下去。」`,
              next: 'end',
            },
          },
          {
            text: '「你給我看這個，不怕我去擋？」',
            out: {
              text: '「怕。」他說，「所以給你看。」\n\n他把冊子合上：「你不在書裡。你做的事，書裡也不會寫——我想知道，一個書裡沒有的人，會做什麼。」\n\n「峰頂這幾年開始滲墨，小血月的夜裡滲得最多。我把墨存在觀星台的池子裡；等池子滿了，這一頁就撕下去。」',
              next: 'end',
            },
          },
        ],
      },
      end: {
        text: '他站起來，吹滅了燈。\n\n「竹符天亮就作廢了。」他說，「下山吧。那一夜，別站在東荒——朱筆劃不到你，也救不了誰。」',
        choices: [
          {
            text: '下山。',
            out: {
              effects: [...TRUTH, ['meet', 'wei_changgeng'], ['flag', 'wei_met'], ['flag', 'ty_roster'], ['insight', 4], ['sysexp', 80], ['log', '欽天監監正衛長庚親手給你看了命簿的抄本：天元三千零二十二年七月十五，東荒那一頁要被撕掉'], backDown, (x) => { delete x.flags.hc_in; }],
            },
          },
        ],
      },
    },
  },

  // ── the 抄本閣 on your own: three locks and the 星衛 (by night, the change of the watch) ──
  {
    id: 'qt_archive',
    trigger: 'explore',
    poi: 'qt_archive',
    nodes: QT,
    cond: (s) => !flag(s, 'ty_book_seen'),
    title: '抄本閣',
    steps: {
      start: {
        text: (s) =>
          night(s)
            ? '抄本閣的門上掛著三把鎖。換崗的星衛剛走，下一班還沒來。門縫裡透出一股陳紙的味道。'
            : `抄本閣的門上掛著三把鎖，門前的兩個星衛按著劍，看著你。${suComing(s) && has(s, 'qintian_token') ? '\n\n「蘇星官的人？」一個星衛說，「抄本閣，得她陪著才進得去。」' : ''}`,
        choices: [
          {
            text: '撬鎖。',
            show: night,
            check: { kind: 'wuxing', diff: 6 },
            ok: { text: '三把鎖上都有禁制。你一道一道地拆，拆到第三道，鎖「咔」地一聲開了。', next: 'read' },
            fail: { text: '第二把鎖上的禁制咬了你一口，手指冒起一縷青煙。門外響起了腳步聲。', next: 'caught' },
          },
          { text: '走開。', out: {} },
        ],
      },
      read: {
        text: (s) =>
          `抄本閣裡沒有窗，四面都是架子，一摞一摞的冊子從地上堆到房梁。你摸到標著「東荒」的那一冊，就著窗縫裡的月光翻開。\n\n每一個你認得的人都在上面，一行一行。沒有你。\n\n第一頁上別著一張朱紅的紙條：\n\n${noteText(s)}\n\n你又翻了幾本別的。退婚，三年之約，宗門大比，秘境奪寶——每一冊都是這一套。\n\n門外有腳步聲，越來越近。`,
        choices: [
          {
            text: '把冊子放回去，從後窗走。',
            check: { kind: 'jiyuan', diff: 5 },
            ok: { text: '你從後窗翻了出去，貼著山壁的陰影走了。身後，抄本閣的燈一盞一盞地亮了起來。', effects: [...TRUTH, ['flag', 'ty_roster'], ['insight', 3], ['sysexp', 60], ['log', '夜裡撬開了欽天監的抄本閣：天元三千零二十二年七月十五，東荒那一頁要被撕掉']] },
            fail: { text: '後窗是封死的。門開了。', effects: [...TRUTH, ['flag', 'ty_roster'], ['sysexp', 40]], next: 'caught' },
          },
        ],
      },
      caught: {
        text: '兩個星衛站在門口，劍上亮著星光。\n\n「封山令在此。」一個說，「擅入抄本閣者，死。」',
        choices: [
          {
            text: '拔劍。',
            check: { kind: 'power', diff: (s) => Math.max(280, Math.round(power(s) * 1.05)) },
            fight: { foes: [['xingwei', 2]], close: true },
            ok: { text: '兩個星衛倒在了抄本閣的門口。你從皇城的後牆翻了下去，一路沒有停。', effects: [['rep', 'tianyan', -15], ['flag', 'qt_fought'], ['log', '在欽天監的抄本閣打倒了兩個星衛'], backDown, (x) => { delete x.flags.hc_in; }] },
            fail: JAIL,
          },
        ],
      },
    },
  },

  // ── why the peak is sealed, seen for yourself: its top (flown to, by those the 大陣 lets through), and its north foot (walked to) ──
  {
    id: 'yz_platform',
    trigger: 'explore',
    poi: 'yz_platform',
    nodes: YZ,
    title: '觀星台',
    text: (s) =>
      `觀星台的台心是一口圓池。${
        s.day >= SEEPING
          ? '池子不再是乾的了：池底積著一層暗紅色的東西，稠得像血，又亮得像漆。池邊的白石頭上有一道一道的紅痕，是從峰頂的石縫裡一點一點滲出來，流進池子裡的。'
          : '池子是乾的，池底一層紅色的垢，刮不下來。'
      }\n\n兩個星衛守在池邊，看見你，劍出鞘了一半。${has(s, 'qintian_token') ? '\n\n「蘇星官的腰牌？」一個說，「封山令，連星官也攔。下去。」' : ''}`,
    choices: [
      {
        text: '伸手碰一碰池裡的墨。',
        show: (s) => s.day >= SEEPING && !flag(s, 'yz_ink_touched'),
        out: {
          text: '你蹲下來，伸手碰了碰池裡的墨。\n\n墨沾上你的指尖，又從你的指尖上滑了下去，一滴也沒有留下——像水從油上滑過去。\n\n兩個星衛看著你的手，臉色變了。',
          effects: [['flag', 'yz_ink_seen'], ['flag', 'yz_ink_known'], ['flag', 'yz_ink_touched'], ['insight', 3], ['sysexp', 30], ['log', '在玉指峰頂碰了碰墨池裡的朱墨：墨沾不上你']],
        },
      },
      {
        text: '動手。',
        check: { kind: 'power', diff: (s) => Math.max(300, Math.round(power(s) * 1.1)) },
        fight: { foes: [['xingwei', 2]], close: true },
        ok: { text: '兩個星衛倒在池邊。峰頂的風很大，吹得墨面起了一層細細的紋。\n\n山下的皇城裡，一盞一盞的信燈亮了起來。', effects: [['flag', 'yz_ink_seen'], ['flag', 'yz_ink_known'], ['flag', 'yz_fought'], ['rep', 'tianyan', -12]] },
        fail: { text: '星衛的劍光把你從峰頂掃了下去。你在山壁上撞了幾下，才在欽天監的屋頂上停住。', effects: [['wound', 0.2], (x) => putAt(x, 2700, 1650)] },
      },
      // (whoever is up here can always get down: the 天梯 down the cliff to 欽天監, if not flying)
      { text: '順著天梯爬下去。', out: { text: '你翻過峰頂的石欄，順著天梯一級一級往下爬。爬到欽天監的屋頂上，天都快亮了。', effects: [['flag', 'yz_seen'], ['hours', 2], (x) => putAt(x, 2700, 1600)] } },
      { text: '走。', out: { effects: [['flag', 'yz_seen']] } },
    ],
  },
  {
    id: 'hl_face',
    trigger: 'explore',
    poi: 'hl_face',
    nodes: HL,
    title: '峰背',
    text: (s) =>
      night(s) && s.day >= SEEPING
        ? `從北面看，玉指峰更像一根指頭了：白，直，指節的地方有一道一道的橫紋。\n\n山腳的石縫裡有東西在往外滲。紅的，稠的，一滴一滴，順著白石頭往下流，流到紅草的根上。${
            moonTonight(s, 'bloodmoon') ? '今夜的月亮是紅的，石縫裡的紅流得像一條小溪。' : ''
          }\n\n是墨。\n\n山腰上有燈。一隊星衛提著瓦罐，沿著石縫一個一個地接。`
        : '從北面看，玉指峰更像一根指頭了：白，直，指節的地方有一道一道的橫紋。山腳的石縫裡長著一叢紅草，別處都沒有。',
    choices: [
      {
        text: '躲在柏樹後面看。',
        show: (s) => night(s) && s.day >= SEEPING,
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '星衛接滿了一罐，封上口，又接下一罐。接滿的罐子一個一個背上山去。\n\n天快亮的時候，他們走了。石縫裡的墨，還在一滴一滴地滲。', effects: [['flag', 'yz_ink_seen'], ['flag', 'yz_ink_known'], ['insight', 3], ['sysexp', 30], ['log', '夜裡在玉指峰背後，看見星衛一罐一罐地接峰裡滲出來的墨']] },
        fail: { text: '你踩斷了一根枯枝。山腰上的燈一齊轉了過來。', effects: [['flag', 'yz_ink_seen'], ['flag', 'yz_ink_known']] },
      },
      {
        text: '拔一根紅草。',
        show: (s) => !night(s) || s.day < SEEPING,
        out: { text: '草根是紅的，紅得發黑。捏在手裡，指尖上留下一點紅——你一擦，就掉了，一點痕跡也不留。', effects: [['flag', 'yz_redgrass'], ['mind', 1]] },
      },
      { text: '走開。', out: {} },
    ],
  },
  {
    id: 'qt_stair',
    trigger: 'explore',
    poi: 'qt_stair',
    nodes: QT,
    title: '天梯',
    text: (s) =>
      night(s)
        ? '天梯口的鐵柵鎖著，柵上的木牌在風裡晃：「奉監正令，封山。」\n\n往上看，石階貼著山壁一直爬進雲裡。峰頂上有一點紅光，一明一滅，像在呼吸。'
        : '天梯口的鐵柵鎖著，柵上掛著一塊木牌：「奉監正令，封山。」兩個星衛站在柵前，一動不動。',
    choices: [
      {
        text: '翻過鐵柵，爬上去。',
        show: night,
        check: { kind: 'gengu', diff: 6 },
        ok: {
          text: '你翻過鐵柵，一級一級往上爬。石階越來越窄，到後來只剩一隻腳寬，底下是雲。\n\n你爬到了峰頂。',
          effects: [(x) => putAt(x, 2640, 1230), ['sysexp', 10]],
        },
        fail: { text: '爬到一半，腳下的石階碎了一塊。你抓住了山壁，掛在半空中，好半天才爬了回去。\n\n手掌上全是血。', effects: [['wound', 0.15]] },
      },
      { text: '走開。', out: {} },
    ],
  },

  // ── 大衍皇陵: the 陵門 and the stone tortoise that keeps it; the 地宮 — the founder, and what 玄微 wrote of him ──
  {
    id: 'hl_gate',
    trigger: 'explore',
    poi: 'hl_gate',
    nodes: HL,
    cond: (s) => !flag(s, 'hl_open'),
    title: '陵門',
    text: '陵門是兩根石柱，門楣塌了一半。門後的台階往下沒進黑暗裡。台階口趴著一隻很大的石龜，背上馱著一塊無字碑。\n\n你走近了一步。\n\n石龜的眼睛，睜開了。',
    choices: [
      {
        text: '拔劍。',
        check: { kind: 'power', diff: (s) => Math.max(400, Math.round(power(s) * 1.2)) },
        fight: { foes: [['bixi', 1]] },
        ok: {
          text: '石龜趴回了台階口。牠背上的無字碑裂開了一道縫，縫裡什麼也沒有。\n\n牠看了你一眼，慢慢地閉上了眼睛，像是守完了一班崗。\n\n台階往下，一共九十九級。',
          effects: [['flag', 'hl_open'], ['discover', 'hl_gong'], ['sysexp', 40], ['log', '打倒了大衍皇陵陵門前的守陵贔屭']],
        },
        fail: { text: '石龜的頭一甩，把你甩出了陵門，摔在神道上。', effects: [['wound', 0.25]] },
      },
      { text: '退開。', out: { text: '你退了一步。石龜的眼睛又慢慢合上了。' } },
    ],
  },
  {
    id: 'hlg_coffin',
    trigger: 'explore',
    poi: 'hlg_coffin',
    nodes: HG,
    once: true,
    title: '梓宮',
    text: (s) =>
      `地宮正中停著一口石棺。棺蓋上刻著一個人，閉著眼睛，右手握著一支筆，左手攥著半張紙。\n\n石刻的紙上有字。你湊近了看——字跡你認得。${
        s.sys?.frags?.includes('frag_star') ? '你在舊觀星台的石縫裡，見過同一個人的字。' : '這是系統殘頁上的字。'
      }\n\n「……他們中間最小的那一個，半夜去了東邊那座白色的山。山裡在滲墨，紅的。他拿筆蘸了，在天上那本書裡，給自己寫了一行字。\n第二天，他當了皇帝。\n我走的那天，他在山下送我。他說：先生，你說不能改，可我改了。\n我說：你沒有改。你只是多寫了一行。這本書上的每一個字，都是那隻手寫的；你寫的這一行，它也會照著抄下去，一遍一遍，抄到爛。\n他不懂。\n我也不懂，我為什麼要教他們看星星。」${
        flag(s, 'sys_awakened')
          ? '\n\n腦子裡，玄微很久沒有說話。\n\n「他叫衍。」他終於說，「我想起來了。七個人裡他最小，最聰明，也最怕死。」\n\n「大衍之數五十，其用四十有九。」他說，「他給自己的朝代起名叫大衍：天定四十九，他要當逃掉的那一個。」'
          : '\n\n叮——檢測到殘頁片段。殘頁・星，下半截，補完。'
      }`,
    choices: [
      {
        text: '看著那支筆。',
        out: {
          text: '石刻的筆尖上，有一點紅，三千年了還沒有褪。',
          effects: [['flag', 'hl_seen'], ['flag', 'frag_star_whole'], ['insight', 3], ['sysexp', 60], ['log', '大衍皇陵的地宮：開國皇帝是玄微的學生，用玉指峰的墨，給自己寫了一行天命']],
        },
      },
    ],
  },
  {
    id: 'hlg_mural',
    trigger: 'explore',
    poi: 'hlg_mural',
    nodes: HG,
    once: true,
    title: '壁畫',
    text: '地宮的牆上畫著壁畫，一幅接一幅。\n\n第一幅：七個年輕人坐在江邊荒山的石台下，聽一個人講星星。講的人背對著畫外，看不見臉。\n\n第二幅：七個人裡最小的那一個，獨自走進一座白色的山，手裡提著一支筆。\n\n第三幅：天上攤開一本書，他站在書下，書上多了一行字，字是紅的。\n\n最後一幅，畫的是那座白色的山。山頂上方有一隻很大的手，少了一根指頭。手的旁邊，畫師留了一大片白，什麼也沒有畫。',
    choices: [{ text: '看著那一片白。', out: { effects: [['flag', 'hl_mural_seen'], ['insight', 2], ['sysexp', 20]] } }],
  },

  // ── no papers in the capital (over the hills, or paid past the gate): the 京兆府's men ask ──
  {
    id: 'ty_check',
    trigger: 'arrive',
    nodes: WC,
    cooldown: 6,
    priority: 5,
    cond: (s) => flag(s, 'ty_nopass') && !papers(s) && flag(s, 'ty_arrived'),
    title: '盤查',
    text: '兩個京兆府的衙役攔住了你：「外地來的？令牌。」',
    choices: [
      { text: '認罰。', need: needLs(80), out: { text: '衙役收了八十塊靈石，在你袖子上貼了一張黃紙條：「三日內出京。」\n\n你走過兩條街，把紙條撕了。', effects: [['ls', -80], ['rep', 'tianyan', -2]] } },
      {
        text: '跑。',
        check: { kind: 'jiyuan', diff: 6 },
        ok: { text: '你拐進坊市的人堆裡，兩個衙役在後面喊了幾聲，就不喊了。', effects: [['rep', 'tianyan', -4]] },
        fail: { text: '你被一個衙役揪住了領子。罰了一百二十塊靈石。', effects: [['ls', -120], ['rep', 'tianyan', -4]] },
      },
      {
        text: '動手。',
        check: { kind: 'power', diff: (s) => Math.max(160, Math.round(power(s) * 0.8)) },
        fight: { foes: [['city_guard', 2]], close: true },
        ok: { text: '兩個衙役躺在了地上。街上的人一下子散開了。遠處，有人在喊禁軍。', effects: [['rep', 'tianyan', -12]] },
        fail: { text: '你被捆了，在京兆府的大牢裡關了兩天。\n\n出來的時候，身上的靈石少了一半。', effects: [['halfls'], ['hours', 48], ['rep', 'tianyan', -5]] },
      },
    ],
  },
  // (the 京兆府 makes it right, for a name the capital knows)
  {
    id: 'wc_pass',
    trigger: 'explore',
    poi: 'wc_yamen',
    nodes: WC,
    cond: (s) => flag(s, 'ty_nopass') && !papers(s),
    title: '京兆府',
    text: (s) =>
      `京兆府的書吏從冊子上抬起頭：${
        repOf(s, 'tianyan') >= 25 ? '「補辦令牌？你啊——懸賞堂說起過你。三百塊靈石，工本費，加上罰的。」' : '「補辦令牌？京城裡有誰認得你？懸賞堂裡揭過幾張榜？沒有？那就先去揭。」'
      }`,
    choices: [
      {
        text: '補辦一塊（三百塊靈石）。',
        show: (s) => repOf(s, 'tianyan') >= 25,
        need: needLs(300),
        out: { text: '書吏收了靈石，摸出一塊銅牌，在背面刻你的名字。刻完，他對著冊子看了半天，搖了搖頭：「冊子上還是沒有你。……算了，令牌是真的。」', effects: [['ls', -300], ['item', 'tongxing_ling', 1], (x) => { delete x.flags.ty_nopass; }, ['log', '在京兆府補辦了一塊通行令牌']] },
      },
      { text: '走了。', out: {} },
    ],
  },

  // ── what the capital says over its wine (醉仙樓) and its tea (the shed on the road) ──
  {
    id: 'wc_ask_seal',
    trigger: 'inquire',
    nodes: WC,
    once: true,
    title: '封山',
    text: '「玉指峰？封了。」醉仙樓的夥計給你倒上酒，壓低了聲音，「欽天監說是天象。可封山以後，峰頂夜裡老是亮紅光，一明一滅的，像在喘氣。」\n\n「峰背後那片柏樹林，夜裡別去。有人看見星衛提著罐子，從石縫裡接什麼東西。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'huangling'], ['flag', 'ty_heard_seal']] } }],
  },
  {
    id: 'wc_ask_tomb',
    trigger: 'inquire',
    nodes: WC,
    once: true,
    title: '皇陵',
    text: '「開國皇帝的陵，在城西北的山裡。」一個老酒客說，「三千年了，陵門口那隻石龜還趴著。前朝有個盜墓的，半夜摸進去——第二天，人在神道上，石人的手裡攥著他的頭。」\n\n他喝了一口酒：「也有人說，開國皇帝不是凡人，是天上那本書裡，自己寫上去的。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'huangling']] } }],
  },
  {
    id: 'wc_ask_hoard',
    trigger: 'inquire',
    nodes: WC,
    once: true,
    title: '囤靈石',
    text: '「世家這兩年都在囤靈石。」鄰桌一個商人說，「謝家、上官家、京城的幾家，有多少收多少，價錢翻了一倍也收。」\n\n「囤來做什麼？」\n\n他笑了一下：「欽天監的人說了，過兩年，天下的靈脈要變一變。」他舉起酒杯，「變到誰家，就是誰家的。」',
    choices: [{ text: '記下了。', out: { effects: [['flag', 'ty_heard_hoard']] } }],
  },
  {
    id: 'wc_ask_park',
    trigger: 'inquire',
    nodes: WC,
    once: true,
    title: '禁苑',
    text: '「東門外是禁苑，皇家的獵場。」夥計說，「裡頭養的東西，天下各地進貢來的，有的養了幾百年。」\n\n「白澤，你聽說過嗎？什麼妖怪的名字都叫得出來的那個。聽說禁苑裡就有一頭。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'jinyuan']] } }],
  },
  {
    id: 'ty_ask_road',
    trigger: 'inquire',
    nodes: TR,
    once: true,
    title: '進京',
    text: '「進京的？」茶棚老闆給你倒了一碗茶，「過了十里亭就是西門。城裡禁空——別在城上飛，禁軍的箭可不長眼。」\n\n「北邊那座白山，是玉指峰。皇城就在峰腰上。峰頂，」他往上指了指，「封了。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'waicheng'], ['discover', 'huangcheng']] } }],
  },
];
