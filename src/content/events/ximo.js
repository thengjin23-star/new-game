// 西漠 (0.22): the desert past 西風口. What the sand itself does to you — the
// noon sun, a sandstorm, the quicksand; 禿鷲寨, its men on the caravan road and
// their master in his fort of mud; the people of 月泉 and 落日關 (康駝頭 and his
// caravan, 月娘 at her post-house, 宋夫子 and his copies, 了空 under his tree,
// 老秦 at his beacon); 沙陀寺, and the abbot who sat down sixty years ago and
// never got up; and the city under the sand — its five steles, the gate under
// its tower, and what 玄微 left there when he was nineteen.
import { has, flag, favor, variant, mpNow, night } from '../helpers.js';
import { weatherNow, hoursToClear, moonTonight } from '../../world/weather.js';
import { FRAGMENTS } from '../fragments.js';

/** Out on the sand, where the sky wears on you (world/explore.js exposure: not in the town, the fort or the canyon). */
const OPEN = ['ximo_wilds', 'gobi', 'quicksand', 'lost_city', 'wanghe_terrace'];
const GOBI = ['gobi'];
const SPRING = ['yuequan'];
const FORT = ['luori_pass'];
const TEMPLE = ['shatuo_temple'];
const CITY = ['lost_city'];
const WILDS = ['ximo_wilds'];
const QUICK = ['qs_a', 'qs_b', 'qs_c', 'qs_d', 'qs_e', 'qs_f', 'qs_g', 'qs_h'];
/** A body art you have (輕身術, 踏雲步). */
const knows = (s, art) => (s.player.arts || []).includes(art);
/** Killed (by your hand; it does not come back). */
const killed = (s, kind) => (s.vars.kills?.[kind] || 0) > 0;
/** The system has woken and remembers its name (content/events/chapter.js sys_awaken): it speaks as 玄微. */
const awake = (s) => flag(s, 'sys_awakened');

/** The five steles of 沉沙古城, and how many you have read. */
const STELES = ['stele_city', 'stele_ferry', 'stele_star', 'stele_break', 'stele_farewell'];
const readCount = (s) => STELES.filter((id) => flag(s, `read_${id}`)).length;
/** The old star-script: the system reads it for you (it seems to know it). */
const canRead = (s) => !!s.sys.bound;

/**
 * Each stele: where it stands, what it says (in the system's reading), and what
 * the system makes of it — less and less sure, the more it reads.
 */
const STELE = {
  stele_city: {
    title: '城碑',
    where: '南門口立著一塊石碑，半截埋在沙裡。碑上的字彎彎曲曲，一筆一筆，像星星連成的線。',
    says: '「接天城。\n西海之濱，天河之渡。\n星官所居，萬里來朝。」',
    then: () => '叮——……本系統好像，認得這種字。',
  },
  stele_ferry: {
    title: '渡碑',
    where: '城西的沙裡，露出一排石樁，樁上磨出一道一道的繩痕。這裡從前是碼頭——有水的時候。碼頭邊立著一塊碑。',
    says: '「天河一甲子一垂，垂於西海之上。是夜，有道者乘舟，自海溯河，登天而去。\n自建城以來，渡者三千七百二十一人。」',
    then: () => '叮——……一甲子，六十年。乘舟登天。本系統的資料庫裡，沒有這樣的記載。',
  },
  stele_star: {
    title: '星官碑',
    where: '觀星台東側的碑，比別的碑都高。碑上密密麻麻刻滿了名字，一行一行，被風沙磨得只剩一半。',
    says: '「歷代星官……\n（一長串名字，大半已經認不出了）\n……\n末代星官：玄微。年十九。」',
    then: (s) =>
      awake(s)
        ? '你腦子裡，很久沒有聲音。\n\n「……那是我的名字。」玄微說，聲音很輕，輕得像怕驚動了什麼。「我都忘了，我也十九歲過。」'
        : '叮——……\n\n系統沉默了很久。\n\n叮——資料庫中，查無此人。',
  },
  stele_break: {
    title: '斷河碑',
    where: '觀星台西側的碑，從中間裂開了一道縫。',
    says: '「某年七月初七，夜半，天河自中而斷，星墜如雨。\n西海一夜而涸，舟膠於沙，渡絕。\n或曰：非天自斷，有物斷之。」',
    then: (s) => (awake(s) ? '「那一夜，我就站在觀星台上。」玄微說。他沒有再說下去。' : '叮——七月初七。……本系統，不記得了。'),
  },
  stele_farewell: {
    title: '辭城碑',
    where: '觀星台背後，星門旁邊，一塊小小的碑。碑上的字，比別的碑都淺，像是一個人自己一刀一刀刻上去的。',
    says: '「城中人盡散。末代星官玄微，獨守空城三年，刻星圖於地宮，乃辭城東去。\n臨行，書於此碑：\n『我去問天。』」',
    then: (s) =>
      awake(s)
        ? '「我去問天。」玄微重複了一遍，很久，才又說：「問到了一半，就把自己拆了。」'
        : '叮——記憶校正……失敗。\n\n叮——……問天。問道。本系統，叫問道系統。',
  },
};

/** Reading one of the steles (the fifth wakes the gate). */
function steleEvent(id) {
  const T = STELE[id];
  return {
    id: `xm_${id}`,
    trigger: 'explore',
    poi: id,
    nodes: CITY,
    priority: 5,
    cond: (s) => !flag(s, `read_${id}`),
    title: T.title,
    text: (s) => (canRead(s) ? `${T.where}\n\n你一個字也不認得。可是你一看，腦子裡就「叮」了一聲：\n\n叮——古篆，星官體。翻譯中……\n\n${T.says}\n\n${T.then(s)}` : `${T.where}\n\n你一個字也不認得。`),
    choices: [
      {
        text: '把碑文記下來。',
        show: canRead,
        out: {
          text: (s) => (readCount(s) === 4 ? '你記下了最後一塊碑。五塊碑，五句話，在你腦子裡排成了一行。\n\n觀星台背後，星門上的星圖，好像亮了一下。' : '你把碑文一字一字記在心裡。'),
          effects: (s) => [
            ['flag', `read_${id}`],
            ['insight', 1],
            ['sysexp', 6],
            ...(readCount(s) === 4 ? [['flag', 'steles_read'], ['sysexp', 20], ['log', '讀完了沉沙古城的五塊石碑：這座城，叫接天城']] : []),
          ],
        },
      },
      { text: '走開。', show: (s) => !canRead(s), out: {} },
    ],
  };
}

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

  // ── the first time in each place ──
  {
    id: 'yq_arrive',
    trigger: 'arrive',
    nodes: SPRING,
    once: true,
    title: '月泉',
    text: '翻過最後一道沙丘，眼前忽然一綠。\n\n沙丘環抱著一彎泉水，彎彎的，兩頭翹起來，像初三的月亮。泉邊長著一排胡楊，葉子嘩嘩地響。泉的北岸是一排土坯房子，房前拴著駱駝，炊煙一縷一縷地升起來。\n\n駝鈴叮噹。驛站門口站著一個女人，朝你這邊望了望。\n\n叮——偵測到大量水氣。……宿主，喝口水吧。',
    choices: [{ text: '走下沙丘。', out: { effects: [['sysexp', 5]] } }],
  },
  {
    id: 'gobi_arrive',
    trigger: 'arrive',
    nodes: GOBI,
    once: true,
    title: '黑戈壁',
    text: '沙子到了這裡，忽然變成了黑的。\n\n一地的黑石子，大的像拳頭，小的像豆子，被太陽曬得發亮，燙得能烙餅。遠遠近近立著幾座平頂的土台，像一張一張的桌子。\n\n北邊的土台上，有一座土堡。堡頂插著一面旗，旗上畫著一隻禿鷲。',
    choices: [{ text: '把衣襟拉起來，擋住臉。', out: { effects: [['sysexp', 3]] } }],
  },
  {
    id: 'quicksand_arrive',
    trigger: 'arrive',
    nodes: ['quicksand'],
    once: true,
    title: '流沙',
    text: '沙地往下陷了一大片，平平的，連一道沙丘也沒有。風吹過去，沙面上連一絲痕跡也不留。\n\n這裡太平了。平得不對。\n\n叮——警告：前方地面承重異常。宿主，每一步都踩實了再走。',
    choices: [{ text: '撿一根枯枝，探著路走。', out: { effects: [['sysexp', 3]] } }],
  },
  {
    id: 'shatuo_arrive',
    trigger: 'arrive',
    nodes: TEMPLE,
    once: true,
    title: '沙陀寺',
    text: '峽谷越走越窄，兩邊的崖壁越來越高，最後只剩頭頂一線天。轉過一個彎，崖壁忽然往兩邊退開——\n\n谷底是一座寺。殿頂的瓦被沙埋了一半，簷角還掛著鐵馬，風一吹，叮叮地響。崖壁上鑿著一排一排的石窟，窟裡的佛像都缺了臉。\n\n寺裡很靜。可是地上的沙，像是被人掃過。',
    choices: [{ text: '合掌，走進去。', out: { effects: [['sysexp', 3]] } }],
  },
  {
    id: 'city_arrive',
    trigger: 'arrive',
    nodes: CITY,
    once: true,
    title: '沉沙古城',
    text: '沙丘的背後，露出半截城牆。\n\n城牆是石頭砌的，每一塊石頭都比你的人還高。牆頭只剩下垛口，像一排斷了的牙。城門洞被沙填了一半，你得彎著腰才鑽得過去。\n\n城裡的街巷全被沙填平了，只有城中央還立著一座高台，台頂的架子被風削得只剩幾根骨頭，像一隻伸向天空的手。\n\n叮——……\n\n系統響了一聲，就沒有下文了。',
    choices: [{ text: '往高台走。', out: { effects: [['sysexp', 5]] } }],
  },
  {
    id: 'wilds_arrive',
    trigger: 'arrive',
    nodes: WILDS,
    once: true,
    title: '沙海',
    text: '沙丘一道接著一道，像凝住的浪，一直排到天邊。\n\n太陽底下，沙是金的。風吹過沙丘頂，揚起一縷一縷的白煙。腳下的沙又細又軟，每走一步，都往下陷半寸。\n\n你回頭看，自己的腳印，已經被風抹去了一半。',
    choices: [{ text: '接著走。', out: { effects: [['sysexp', 3]] } }],
  },
  {
    id: 'wanghe_arrive',
    trigger: 'arrive',
    nodes: ['wanghe_terrace'],
    once: true,
    title: '望河臺',
    text: '石台頂上平得像一張桌子。四面都是沙海，沙丘一道一道排到天邊，駝道細得像一根線。\n\n台面上刻滿了線，一道一道，深深淺淺，全指著天上的同一個地方。',
    choices: [{ text: '落下來。', out: { effects: [['sysexp', 5]] } }],
  },
  {
    id: 'palace_arrive',
    trigger: 'arrive',
    nodes: ['underpalace'],
    once: true,
    title: '地宮',
    text: '台階一級一級往下，走了很久。\n\n底下是一間石室。沙子進不來，風也進不來，靜得能聽見自己的心跳。穹頂上嵌著一片星圖，星星一顆一顆，在黑暗裡微微地亮著。\n\n星圖正中，是一條河。河從東邊流過來，流到穹頂正中——斷了。\n\n石室中央，有一座石台。',
    choices: [{ text: '走到石台前。', out: { effects: [['sysexp', 5]] } }],
  },

  // ── 月泉驛: what they tell you round the fire ──
  {
    id: 'yq_inquire',
    trigger: 'inquire',
    nodes: SPRING,
    cooldown: 3,
    title: '月泉驛',
    text: '驛站的大堂裡坐滿了人：駝夫、行商、背著劍的散修，還有幾個說著你聽不懂的話的胡人。大家圍著火塘，喝著奶茶，說著沙海裡的事。',
    choices: [
      {
        text: '打聽古城。',
        out: {
          text: '「沉沙古城？在西北邊，駝道往北岔出去。」一個駝夫說，「城裡有石頭人，會動的！我親眼看見的。」\n\n「那是你喝多了。」旁邊的人笑他。\n\n「宋夫子天天往那裡跑，怎麼沒被石頭人吃了？」',
          effects: [['discover', 'lost_city']],
        },
      },
      {
        text: '打聽沙陀寺。',
        out: {
          text: '「沙陀寺？在西南的峽谷裡。」一個老行商壓低了聲音，「白天去，沒事。夜裡千萬別去——寺裡的和尚，夜裡會起來走路。」\n\n「都死了六十年了。」\n\n「所以才叫你別去。」',
          effects: [['discover', 'shatuo_temple']],
        },
      },
      {
        text: '打聽流沙。',
        out: {
          text: '「駝道南邊那一大片低窪地，就是流沙。」驛站的夥計說，「看著平平的，踩進去就拔不出來。要是陷進去了，千萬別掙，往後一倒，平躺著，慢慢挪。」\n\n他想了想，又說：「流沙正中有個沙渦。駝隊的人說，底下住著一條蛟。」',
          effects: [['discover', 'quicksand']],
        },
      },
      {
        text: '打聽禿鷲寨。',
        out: {
          text: '「黑戈壁北邊的土堡。」一個駝夫啐了一口，「禿鷲那個人，刀快，心狠，說話倒是算話。他說要你三十塊，就不會要你四十塊。」',
          effects: [['discover', 'gobi']],
        },
      },
      {
        text: '打聽望河臺。',
        show: (s) => flag(s, 'steles_read') || flag(s, 'song_told'),
        out: {
          text: '「黑戈壁東南邊那座最高的石台，頂上平得像桌子。」宋夫子正好也在，插嘴說，「台頂上好像刻著什麼。我爬了三回，三回都摔下來了。」\n\n他嘆了口氣：「只有會飛的，才上得去。」',
          effects: [['discover', 'wanghe_terrace']],
        },
      },
    ],
  },

  // ── 康駝頭 ──
  {
    id: 'xm_kang',
    trigger: 'visit',
    npc: 'kang_tuotou',
    nodes: SPRING,
    title: '康駝頭',
    text: (s) => {
      if (flag(s, 'kang_paid')) return '康駝頭正在給駱駝餵豆子。看見你，他把手在衣襟上擦了擦，迎了上來：「朋友！喝茶，喝茶。」';
      if (flag(s, 'vulture_done') && flag(s, 'kang_asked')) return '康駝頭遠遠就看見了你，三步併作兩步走過來，一把抓住你的手。\n\n「禿鷲寨的事，我聽說了！」';
      if (flag(s, 'kang_asked')) return '康駝頭蹲在貨堆旁邊算賬，算一筆，嘆一口氣。';
      return '康駝頭蹲在貨堆旁邊算賬：鼻樑高，眼窩深，鬍子捲捲的。他抬頭打量了你一眼。\n\n「朋友，」他用帶著腔調的官話說，「有件事，想請你幫個忙。」';
    },
    choices: [
      {
        text: '「什麼忙？」',
        show: (s) => !flag(s, 'kang_asked') && !flag(s, 'vulture_done'),
        out: {
          text: '「黑戈壁上有一夥沙盜，頭子叫禿鷲，是個築基的刀客。」康駝頭伸出兩根手指，「今年，他劫了我兩趟貨。人死了三個，駱駝死了十幾頭。」\n\n「我的駝隊在月泉歇了一個月了，不敢走。往西的貨、往東的貨，全壓在這裡。」\n\n他看著你：「我出兩百塊靈石。你去禿鷲寨，跟他討個說法，讓駝道太平。怎麼討，你說了算。」',
          effects: [['flag', 'kang_asked'], ['discover', 'gobi'], ['sysexp', 5], ['log', '答應康駝頭，去禿鷲寨討個說法']],
        },
      },
      {
        text: '「禿鷲答應了：駝道從此太平。」',
        show: (s) => flag(s, 'vulture_spared') && !flag(s, 'kang_paid'),
        out: {
          text: '康駝頭愣了一下，大笑起來：「你沒殺他？好！好！」\n\n他從貨堆裡搬出一個沉甸甸的錢箱：「兩百靈石，說好的。禿鷲那個人，說話向來算話——他說不劫，就不劫。」他又壓低聲音：「其實，殺了他，戈壁上會冒出十個小禿鷲。你這樣，最好。」\n\n「從今往後，你就是康家駝隊的朋友。駝隊的東西，你來買，打八五折。」',
          effects: [
            ['flag', 'kang_paid'], ['flag', 'kang_friend'], ['ls', 200], ['favor', 'kang_tuotou', 30], ['sysexp', 20],
            ['rumor', '聽說黑戈壁的禿鷲寨收了刀，駝道又通了。是一個東邊來的修士辦成的。'], ['log', '禿鷲寨的事了了：成了康家駝隊的朋友'],
          ],
        },
      },
      {
        text: '「禿鷲死了。」',
        show: (s) => flag(s, 'vulture_killed') && !flag(s, 'kang_paid'),
        out: {
          text: '康駝頭沉默了一會兒，嘆了口氣：「殺了也好。他手上的人命，夠他死十回了。」\n\n他搬出一個沉甸甸的錢箱：「兩百靈石，說好的。」\n\n「從今往後，你就是康家駝隊的朋友。駝隊的東西，你來買，打八五折。」',
          effects: [
            ['flag', 'kang_paid'], ['flag', 'kang_friend'], ['ls', 200], ['favor', 'kang_tuotou', 25], ['sysexp', 20],
            ['rumor', '聽說黑戈壁的禿鷲寨散了夥，禿鷲死在一個東邊來的修士刀下。'], ['log', '禿鷲寨的事了了：成了康家駝隊的朋友'],
          ],
        },
      },
      {
        text: '「再往西，是什麼地方？」',
        show: (s) => favor(s, 'kang_tuotou') >= 10 && !flag(s, 'kang_west'),
        out: {
          text: '康駝頭望著西邊，眼睛瞇了起來。\n\n「再往西半年，有一座城，城牆是白玉的，城裡的人眼睛是綠的。我爺爺去過，我沒去過。」\n\n「再往西呢？」\n\n「再往西……」他笑了笑，「我爺爺說，再往西，天就低了，低得伸手就摸得到。駝隊裡的老人都說，那是接天城的地方。」\n\n「可是接天城，早就埋在沙子底下了。古城，你去過沒有？就是它。」',
          effects: [['flag', 'kang_west'], ['flag', 'heard_jietian'], ['discover', 'lost_city'], ['insight', 1]],
        },
      },
      {
        text: '幫駝隊卸一天貨。',
        out: {
          text: (s) =>
            variant(s, [
              '你幫駝夫們卸了一整天的貨：葡萄乾、毛氈、銅壺、一捆一捆的絲綢。傍晚，康駝頭數了幾塊靈石給你，又塞給你一把葡萄乾。',
              '駱駝跪下來的時候，貨才卸得下來；駱駝不想跪的時候，誰也沒辦法。你和一頭倔駱駝耗了大半天。康駝頭在旁邊笑得直不起腰。',
            ]),
          effects: [['days', 1], ['ls', 6], ['favor', 'kang_tuotou', 2]],
        },
      },
    ],
  },

  // ── 月娘 ──
  {
    id: 'xm_yueniang',
    trigger: 'visit',
    npc: 'yue_niang',
    nodes: SPRING,
    title: '月娘',
    text: (s) =>
      flag(s, 'yue_closure')
        ? '月娘在驛站門口擇菜，鬢邊別著一朵小小的白花。看見你，她笑了笑：「來啦。茶在爐上，自己倒。」'
        : '月娘在驛站門口擇菜，手腳麻利。看見你，她抬起頭：「打尖還是住店？要水的話，泉邊自己打，不要錢。」',
    choices: [
      {
        text: '「這驛站，你一個人撐著？」',
        show: (s) => !flag(s, 'yue_story'),
        out: {
          text: '月娘手裡的菜停了一下。\n\n「十年前，我男人跟著駝隊去西邊販葡萄乾，說好了秋天回來。」她說，「駝隊回來了，他沒有。駝隊的人說，在黑戈壁上走散了。」\n\n「我不信他死了。」她把擇好的菜放進籃子裡，「驛站開著，他回來，就知道往哪裡走。」',
          effects: [['flag', 'yue_story'], ['favor', 'yue_niang', 5]],
        },
      },
      {
        text: '把禿鷲賬簿上的那一頁，交給她。',
        show: (s) => flag(s, 'yue_story') && flag(s, 'vulture_killed') && !flag(s, 'yue_closure'),
        out: {
          text: '月娘接過那一頁紙，看了很久。十年前的那一頁上，有一個名字被劃了一道紅線。她用手指摸著那道紅線，摸了一遍，又一遍。\n\n她沒有哭。她把紙折好，放進懷裡，站起來，進了驛站。\n\n傍晚，驛站門口多了一盞白燈籠。月娘端出一碗麵放在你面前：「吃吧。」她的眼睛是紅的，「謝謝你。……讓我知道了。」',
          effects: [['flag', 'yue_closure'], ['favor', 'yue_niang', 25], ['mind', 4], ['item', 'bingxin_pill', 3], ['log', '把禿鷲賬簿上的那一頁，交給了月娘']],
        },
      },
      {
        text: '「禿鷲寨把搶來的貨，都送回來了。」',
        show: (s) => flag(s, 'yue_story') && flag(s, 'vulture_spared') && !flag(s, 'yue_closure'),
        out: {
          text: '月娘去看了禿鷲寨送回來的貨。\n\n貨堆了半個泉邊，一駝一駝的，有的箱子上的封條，已經是十年前的了。她在貨堆裡翻了很久，最後抱出來一把琵琶：琴頸斷了，琴身上刻著一個「月」字。\n\n她抱著琵琶，在泉邊坐了一整個下午。\n\n傍晚，她端出一碗麵放在你面前：「吃吧。」她的眼睛是紅的，「他到過黑戈壁。……我知道了。」',
          effects: [['flag', 'yue_closure'], ['favor', 'yue_niang', 25], ['mind', 4], ['item', 'bingxin_pill', 3], ['log', '月娘在禿鷲寨送回的貨裡，找到了她男人的琵琶']],
        },
      },
      {
        text: '喝碗茶，歇歇腳。',
        out: {
          text: (s) =>
            variant(s, [
              '月娘給你倒了一碗茶，茶裡泡著沙棘果，酸酸的。她一邊擇菜，一邊跟你說泉邊的事：誰家的駱駝下了崽，哪支駝隊又要出發了。',
              '你在驛站的檐下歇了一會兒。月娘在灶前烙餅，滿屋子都是麥子的香味。她塞給你一個餅：「路上吃。」',
              '月娘問你從哪裡來。你說東荒。她問：「東荒有海嗎？」你說沒有，只有一條大江。她說：「那也好。有水的地方，都好。」',
            ]),
          effects: [['favor', 'yue_niang', 2], ['hp', 0.2], ['shade']],
        },
      },
    ],
  },

  // ── 宋夫子 ──
  {
    id: 'xm_songfuzi',
    trigger: 'visit',
    npc: 'song_fuzi',
    nodes: SPRING,
    title: '宋夫子',
    text: (s) =>
      readCount(s) >= 1 && !flag(s, 'song_told')
        ? '宋夫子坐在門前抄書，鼻子都快貼到紙上了。你走過去，看見他抄的，正是你在古城裡讀過的碑。'
        : '宋夫子坐在門前的小凳上，膝上攤著一大疊紙，紙上全是抄下來的碑文：一筆一畫，工工整整。\n\n「後生，」他抬起頭，「你也是來看古城的？」',
    choices: [
      {
        text: '「你抄的這些，寫的是什麼？」',
        show: (s) => !flag(s, 'song_story'),
        out: {
          text: '「不知道。」宋夫子笑了，笑得有點苦。\n\n「三十年前，我在中州的書院裡讀到一本殘書。書上說，西漠的沙子底下，有一座比任何書都老的城，城裡的碑，寫的是星星的字。」\n\n「我就來了。」他拍了拍膝上的紙，「抄了三十年，一個字也沒認出來。」\n\n「城裡還立著五塊碑：南門一塊，西邊的舊碼頭一塊，觀星台附近三塊。後生，你要是認得，告訴我。我死也甘心。」',
          effects: [['flag', 'song_story'], ['discover', 'lost_city'], ['favor', 'song_fuzi', 5]],
        },
      },
      {
        text: '「我讀得懂那些字。」',
        show: (s) => readCount(s) >= 1 && !flag(s, 'song_told'),
        out: {
          text: '宋夫子手裡的筆掉在了地上。\n\n你把讀過的碑，一句一句念給他聽。他一邊聽，一邊在紙上記，記著記著，手開始抖。\n\n「接天城……」他喃喃地說，「接天城。原來它叫接天城。」\n\n他抬起頭，老淚縱橫：「三十年。三十年啊。」',
          effects: [['flag', 'song_told'], ['flag', 'heard_jietian'], ['favor', 'song_fuzi', 25], ['insight', 2], ['sysexp', 10], ['log', '把碑文念給了宋夫子聽']],
        },
      },
      {
        text: '「最後一塊碑上，刻著一個名字：玄微。」',
        show: (s) => flag(s, 'song_told') && flag(s, 'read_stele_farewell') && !flag(s, 'song_last'),
        out: {
          text: (s) =>
            `宋夫子在紙上寫下「玄微」兩個字，看了很久。\n\n「『我去問天。』」他念了一遍，搖搖頭，又念了一遍，「一個十九歲的孩子，看著天河斷了，一個人守著一座空城，守了三年。然後說：我去問天。」\n\n他放下筆：「後生，你說，他問到了沒有？」\n\n${awake(s) ? '你沒有回答。腦子裡，玄微也沒有。' : '你沒有回答。腦子裡，系統很久沒有響。'}`,
          effects: [['flag', 'song_last'], ['mind', 3], ['insight', 1]],
        },
      },
      {
        text: '幫他抄一天碑。',
        out: {
          text: (s) =>
            variant(s, [
              '你陪宋夫子在門前抄了一天的碑。他的手抖，一個字要描三遍，可是一筆也不肯錯。傍晚，他請你喝了一碗他自己釀的、酸得要命的葡萄酒。',
              '宋夫子給你講中州的書院：講經的老先生、藏書閣裡的灰、他年輕時背過的書。講著講著，他說：「後生，你知道嗎，我三十年沒回去了。」',
            ]),
          effects: [['days', 1], ['favor', 'song_fuzi', 3], ['mind', 2]],
        },
      },
    ],
  },

  // ── 了空 ──
  {
    id: 'xm_liaokong',
    trigger: 'visit',
    npc: 'liao_kong',
    nodes: [...SPRING, ...TEMPLE],
    title: '了空',
    text: (s) => {
      if (flag(s, 'liaokong_told')) return '了空坐在佛前的蒲團上，面前點著一盞小小的油燈。他睜開眼，對你合了合掌。';
      if (flag(s, 'shatuo_rest')) return '了空坐在老胡楊底下，手裡的念珠停了。他望著西南邊，好像已經知道了什麼。';
      if (flag(s, 'liaokong_story')) return '了空坐在老胡楊底下，對著西南邊唸經。';
      return '老胡楊底下坐著一個老和尚，瘦得只剩一把骨頭，僧衣洗得發白。他對著西南邊唸經，聲音很輕，像怕吵醒什麼人。\n\n唸完一遍，他才轉過頭來看你。';
    },
    choices: [
      {
        text: '「大師在為誰唸經？」',
        show: (s) => !flag(s, 'liaokong_story') && !flag(s, 'shatuo_rest'),
        out: {
          text: '「為我師父。」了空說，「還有我的師兄們。」\n\n「六十年前，我是沙陀寺的小沙彌，九歲。那年冬天，師父枯禪說要入定，坐上大殿的蒲團，閉上了眼睛。」\n\n「一天，兩天，七天。師父沒有起來。第八天早上，我去送水，看見師兄們一個一個，也都坐在蒲團上，不動了。」\n\n「我害怕，跑了。跑到月泉，再也沒敢回去。」他撥著念珠，「後來駝隊的人說，沙陀寺裡，夜裡有人走動。」\n\n他看著你：「施主若是路過沙陀寺，替老衲看一眼師父。他……還坐在那裡嗎？」',
          effects: [['flag', 'liaokong_story'], ['flag', 'shatuo_task'], ['discover', 'shatuo_temple'], ['favor', 'liao_kong', 5], ['log', '了空請你去沙陀寺，看一眼他的師父枯禪']],
        },
      },
      {
        text: '「沙陀寺的師父們，都安息了。」',
        show: (s) => flag(s, 'shatuo_rest') && !flag(s, 'liaokong_told'),
        out: {
          text: '了空手裡的念珠斷了，珠子滾了一地。他沒有去撿。\n\n「師父他……」\n\n你把大殿裡的事告訴了他。他聽完，閉著眼睛，坐了很久很久。然後他站了起來——這是你第一次看見他站起來——朝著西南邊，深深地拜了下去。\n\n「六十年了。」他說，「老衲該回去了。寺裡的燈，總得有人點。」',
          effects: [['flag', 'liaokong_told'], ['npc', 'liao_kong', 'loc', 'shatuo_temple'], ['favor', 'liao_kong', 25], ['mind', 5], ['sysexp', 20], ['log', '了空回沙陀寺去了，去點寺裡的燈']],
        },
      },
      {
        text: '把師父的舍利交給他。',
        show: (s) => flag(s, 'liaokong_told') && has(s, 'sarira') && !flag(s, 'sarira_given') && !flag(s, 'sarira_kept'),
        out: {
          text: '了空雙手接過舍利，捧在掌心。舍利在油燈底下泛著溫溫的金光。\n\n「師父一生想求一個『定』字。」他說，「坐了六十年，原來還是沒有定下來。」\n\n他把舍利供進舍利塔，封上塔門，在六十年前那個乾裂的手印旁邊，按上了自己的手印。\n\n「施主，」他回過頭，「謝謝你。」',
          effects: [['item', 'sarira', -1], ['flag', 'sarira_given'], ['favor', 'liao_kong', 20], ['mind', 8], ['insight', 2], ['log', '把枯禪的舍利交給了了空，供進了舍利塔']],
        },
      },
      {
        text: '「這顆舍利，我想帶在身邊。」',
        show: (s) => flag(s, 'liaokong_told') && has(s, 'sarira') && !flag(s, 'sarira_given') && !flag(s, 'sarira_kept'),
        out: {
          text: '了空看著你手裡的舍利，看了很久，點了點頭。\n\n「也好。」他說，「師父坐了六十年，也該出去走走了。」',
          effects: [['flag', 'sarira_kept'], ['favor', 'liao_kong', 5]],
        },
      },
      {
        text: '陪他唸一會兒經。',
        out: {
          text: (s) =>
            variant(s, [
              '你在他身邊坐下。他唸，你聽。經文你一句也不懂，可是聽著聽著，心裡那些亂七八糟的念頭，一個一個地沉了下去。',
              '了空唸完經，給你講沙陀寺從前的樣子：殿前有一棵胡楊，春天的時候，整棵樹都是綠的；寺裡的師兄們，每天傍晚在樹下掃沙。',
            ]),
          effects: [['favor', 'liao_kong', 2], ['mind', 3]],
        },
      },
    ],
  },

  // ── 老秦 ──
  {
    id: 'xm_laoqin',
    trigger: 'visit',
    npc: 'lao_qin',
    nodes: FORT,
    title: '老秦',
    text: (s) => {
      if (flag(s, 'laoqin_beacon')) return '老秦坐在城門洞裡，抱著那桿生鏽的長槍，嘴裡哼著一支聽不清的小調。看見你，他咧開沒剩幾顆牙的嘴笑了。';
      if (flag(s, 'west_beacon_lit')) return '老秦一看見你，就從城門洞裡站了起來，連槍都扔了。\n\n「東邊的烽燧——」他的聲音在發抖，「前些天夜裡，東邊的烽燧，亮了！」';
      return '老秦坐在城門洞的陰涼裡，抱著一桿生了鏽的長槍。他抬眼看了看你，又看了看你來的方向。\n\n「東荒來的？」他說，「好些年沒見著東邊來的人了。」';
    },
    choices: [
      {
        text: '「你一個人守著這座關？」',
        show: (s) => !flag(s, 'laoqin_story'),
        out: {
          text: '「朝廷四十年前就撤了關。」老秦說，「兵走了，官走了，連城頭上的旗也拔走了。我沒走。」\n\n「為什麼？」\n\n他指了指城頭的烽燧：「烽燧總得有人點。燧一滅，西邊的駝隊夜裡就認不得路，東邊的人也就當西邊沒人了。」\n\n「東邊——西風口那頭，也有一座燧。四十年前，它每天夜裡都回一把火。後來，就不回了。」他望著東邊的山，「那邊的人，大概都走光了吧。」',
          effects: [['flag', 'laoqin_story'], ['favor', 'lao_qin', 5]],
        },
      },
      {
        text: '「我回東荒的時候，替你在西風口點一把火。」',
        show: (s) => flag(s, 'laoqin_story') && !flag(s, 'laoqin_promise') && !flag(s, 'west_beacon_lit'),
        out: {
          text: '老秦看了你很久。\n\n「天黑了再點。」他說，「燧頂上的柴，得自己背上去。」\n\n他頓了頓，又說：「我天天傍晚都在燧上。你點了，我就看得見。」',
          effects: [['flag', 'laoqin_promise'], ['favor', 'lao_qin', 5], ['log', '答應老秦，回東荒時在西風口點起烽燧']],
        },
      },
      {
        text: '「是我點的。」',
        show: (s) => flag(s, 'west_beacon_lit') && !flag(s, 'laoqin_beacon'),
        out: {
          text: '「我就知道！」老秦抓住你的手，抓得很緊，「四十年了。我每天傍晚點燧，點了四十年，東邊一次也沒有回過。我還當……我還當那邊沒人了。」\n\n他的眼眶紅了，又笑了。他從懷裡摸出一塊銅牌，塞到你手裡，牌子上刻著「落日關　戍卒秦」。\n\n「拿著。四十年，就剩這個了。」',
          effects: [['flag', 'laoqin_beacon'], ['favor', 'lao_qin', 30], ['mind', 6], ['insight', 1], ['item', 'qin_token', 1], ['sysexp', 15], ['log', '西風口的烽燧亮了：落日關的老秦，等了四十年']],
        },
      },
      {
        text: '陪他坐一會兒。',
        out: {
          text: (s) =>
            variant(s, [
              '老秦給你講關上從前的事：多少兵，多少馬，哪一年的沙暴把城門埋了一半，哪一年的冬天凍死了三個哨兵。講著講著，他就睡著了，槍還抱在懷裡。',
              '你們坐在城門洞裡，看著西邊的太陽一點一點沉進沙海。老秦說：「落日關，落日關。在這裡看了四十年的落日，看不膩。」',
            ]),
          effects: [['favor', 'lao_qin', 2], ['mind', 2]],
        },
      },
    ],
  },
  {
    id: 'xm_beacon',
    trigger: 'explore',
    poi: 'beacon_fire',
    nodes: FORT,
    cooldown: 1,
    cond: (s) => s.tod >= 17 && s.tod < 21,
    title: '烽燧',
    text: (s) =>
      flag(s, 'laoqin_beacon')
        ? '老秦已經在燧頂上了。看見你，他招招手：「上來！」\n\n乾柴點著了，火苗一下子竄起來。老秦望著東邊的山口，望了很久，嘴角一直翹著。\n\n「那天夜裡，東邊亮了。」他說，「我知道了，那邊有人。」'
        : '老秦背著一捆柴，一步一步爬上烽燧。你跟了上去。\n\n他把柴架好，點著了。火苗竄起來，照亮了他滿臉的皺紋。他望著東邊的山口，望了很久。\n\n東邊黑沉沉的，什麼也沒有。',
    choices: [{ text: '陪他看一會兒。', out: { effects: [['favor', 'lao_qin', 2], ['mind', 2]] } }],
  },

  // ── 沉沙古城: the five steles, the gate under the tower, the chamber under that ──
  ...STELES.map(steleEvent),
  {
    id: 'xm_star_gate',
    trigger: 'explore',
    poi: 'star_gate',
    nodes: CITY,
    priority: 6,
    cond: (s) => flag(s, 'steles_read') && !flag(s, 'palace_open'),
    title: '星門',
    text: '觀星台背後的石門上，刻著一片星圖。讀完了城裡的五塊碑，再看這片星圖，星與星之間連著的線，你忽然看懂了：那是天河。河從東邊流過來，流到正中，斷了。\n\n你伸手按在斷口上。\n\n五顆星，一顆接一顆地亮了。石門裡傳來一陣沉悶的轟響——門前的沙地裂開，一尊一丈多高的石像，從沙裡站了起來。\n\n石翁仲。它手裡的石戟，指著你。',
    choices: [
      {
        text: '迎上去。',
        check: { kind: 'power', diff: 300 },
        fight: { foes: [['stone_general', 1]], close: true },
        ok: {
          text: '石翁仲的石戟斷成了兩截。它晃了晃，單膝跪了下來，眼裡的星光一點一點地暗了。\n\n它就那樣跪在星門前，不動了。像在替什麼人守著，又像在迎什麼人回來。\n\n石門，緩緩地開了。台階一級一級往下，沒進黑暗裡。',
          effects: [['flag', 'palace_open'], ['discover', 'underpalace'], ['sysexp', 30], ['log', '打倒了星門前的石翁仲：星門開了']],
        },
        fail: {
          text: '石戟掃中了你，你飛出去，撞在殘牆上。\n\n醒來時，天已經黑了。星門前的石翁仲又沉回了沙裡，五顆星也暗了。只能改天再來。',
          effects: [['hurt', 1, '死在星門前']],
        },
      },
      { text: '先退回去。', out: { text: '你退了幾步。石翁仲沒有追，又慢慢地沉回了沙裡。星門上的五顆星，還亮著。' } },
    ],
  },
  {
    id: 'xm_palace',
    trigger: 'explore',
    poi: 'palace_bier',
    nodes: ['underpalace'],
    priority: 6,
    cond: (s) => !flag(s, 'palace_seen'),
    title: '星官石台',
    text: (s) =>
      `石台上放著兩樣東西：一本用油布包著的冊子，和一頁紙。\n\n紙很舊了，上面的字卻一看就懂——和古城碑上的字一樣，又不一樣：碑上的字是刻的，這頁紙上的，是一個人一筆一筆寫的。\n\n你拿起那頁紙。腦子裡，系統響了，又不像是系統。${
        awake(s) ? '\n\n「……原來在這裡。」玄微說。' : '\n\n叮——偵測到……偵測到……\n\n叮——記憶校正：百分之……'
      }`,
    choices: [
      {
        text: '讀那頁紙。',
        out: {
          text: (s) =>
            `${FRAGMENTS.frag_sand.text}\n\n${
              awake(s)
                ? '玄微很久沒有說話。\n\n「我在這裡坐了三年。」他終於說，「每天夜裡抬頭，看那條斷了的河。我想，總得有人去問一問。」\n\n「後來，我問到了一半。剩下的一半，」他頓了頓，「大概要靠你了。」'
                : '系統沒有說話。過了很久，才「叮」了一聲，像是想說什麼，又忘了。'
            }\n\n你把那本冊子也收了起來。封皮上寫著：《星官手記》。`,
          effects: [['frag', 'frag_sand'], ['item', 'xingguan_notes', 1], ['flag', 'palace_seen'], ['insight', 3], ['mind', 5], ['sysexp', 40], ['log', '在接天城的地宮裡，找到玄微留下的一頁天機殘頁']],
        },
      },
    ],
  },

  // ── 沙陀寺: the hall by day; after the abbot falls; the scripture cave; the stupa ──
  {
    id: 'xm_shatuo_day',
    trigger: 'explore',
    poi: 'shatuo_hall',
    nodes: TEMPLE,
    priority: 5,
    cond: (s) => !killed(s, 'kuchan') && !flag(s, 'shatuo_rest') && !night(s),
    title: '大殿',
    text: '殿門半開。你側身進去，等眼睛慣了裡面的暗，才看清楚：\n\n一排一排的蒲團上，坐著一排一排的僧人。他們的僧衣褪成了沙子的顏色，皮肉乾得緊貼在骨頭上，可是一個個坐得筆直，雙手結印，像還在入定。\n\n正中的蒲團上，坐著一個老僧。他的袈裟還是紅的，金線還在發亮。他的臉很安詳，嘴角像是在笑。\n\n你走近了一步——他的眼皮，動了一下。',
    choices: [
      { text: '退出去。', out: { text: '你退出了大殿。身後，什麼聲音也沒有。\n\n白天，他們一動也不動。夜裡呢？', effects: [['flag', 'shatuo_seen']] } },
      {
        text: '合掌，對他拜一拜。',
        out: { text: '你在老僧面前合掌拜了一拜。殿裡很靜，靜得聽得見沙子從殿頂的瓦縫裡漏下來的聲音。\n\n他沒有再動。', effects: [['flag', 'shatuo_seen'], ['mind', 2]] },
      },
    ],
  },
  {
    id: 'xm_shatuo_after',
    trigger: 'explore',
    poi: 'shatuo_hall',
    nodes: TEMPLE,
    priority: 6,
    cond: (s) => killed(s, 'kuchan') && !flag(s, 'shatuo_rest'),
    title: '大殿',
    text: '殿裡的蒲團上，僧人們都倒下了。\n\n他們倒得很安靜，像是終於累了，側著身子，蜷著，像睡著的孩子。乾了六十年的僧衣，一碰就化成了灰。\n\n正中的蒲團上，只剩下一襲紅色的袈裟，疊得整整齊齊。袈裟上，放著一把銅鑰匙。',
    choices: [
      {
        text: '把他們一個一個安放好。',
        out: {
          text: '你把倒下的僧人一個一個扶正，讓他們躺在自己的蒲團上，把灰掃攏，把殿門掩上。\n\n你走出大殿的時候，簷角的鐵馬響了一聲。風停了。\n\n叮——……本系統什麼也沒有偵測到。只是覺得，這裡安靜了。',
          effects: [['flag', 'shatuo_rest'], ['flag', 'shatuo_key'], ['mind', 5], ['sysexp', 20], ['log', '沙陀寺的僧人們，終於安息了']],
        },
      },
    ],
  },
  {
    id: 'xm_scripture',
    trigger: 'explore',
    poi: 'shatuo_caves',
    nodes: TEMPLE,
    priority: 5,
    cond: (s) => flag(s, 'shatuo_key') && !flag(s, 'dari_read'),
    title: '藏經窟',
    text: '千佛窟的最裡頭，有一扇小小的石門，門上掛著一把銅鎖。枯禪留下的鑰匙，正好開得了它。\n\n窟裡很乾，乾得一點沙也沒有。四壁上鑿著架子，架上整整齊齊碼著經卷，一卷一卷，用黃布包著。\n\n正中的石台上，單獨放著一部經，封皮上寫著四個字：《大日心經》。',
    choices: [
      {
        text: '坐下來讀。',
        out: {
          text: '你在窟裡坐了七天。\n\n經上說：心如大日，照破長夜。日不避暗，故暗不能藏；心不避念，故念不能亂。\n\n讀到最後一頁，頁邊有一行小字，墨色淡了，字跡是一個老人的：\n\n「坐了一輩子，原來大日不在天上。」',
          effects: [['days', 7], ['tech', 'dari'], ['flag', 'dari_read'], ['insight', 2], ['sysexp', 20], ['log', '在沙陀寺的藏經窟，讀了枯禪留下的《大日心經》']],
        },
      },
    ],
  },
  {
    id: 'xm_stupa',
    trigger: 'explore',
    poi: 'shatuo_stupa',
    nodes: TEMPLE,
    once: true,
    cond: (s) => flag(s, 'sarira_given'),
    title: '舍利塔',
    text: '塔門上新按了一個手印，按在六十年前那個乾裂的手印旁邊。塔裡隱隱透出一點金光，暖暖的，像冬天的太陽。',
    choices: [{ text: '合掌。', out: { effects: [['mind', 3]] } }],
  },

  // ── small things on the sand ──
  {
    id: 'xm_mirage',
    trigger: 'explore',
    nodes: ['ximo_wilds', 'gobi'],
    cooldown: 20,
    weight: 8,
    cond: (s) => !night(s),
    title: '海市',
    text: '日頭底下，遠處的沙丘上忽然浮起一座城：城牆、樓閣、塔，還有一片湖，湖邊一排一排的樹。城門口好像有人在走動。\n\n可是那座城，一點聲音也沒有。',
    choices: [
      { text: '走過去看看。', out: { text: '你走了一個時辰，城一直在前頭，不遠也不近。你停下來，它也停下來。再一眨眼，就只剩沙了。', effects: [['hours', 2]] } },
      {
        text: '站著看它散去。',
        check: { kind: 'wuxing', diff: 6 },
        ok: { text: '你站著看了很久。那座城一層一層地淡下去，最後淡成一片晃動的光。\n\n你忽然想：這座城大概是真的——只是不在這裡，也不在現在。', effects: [['insight', 1], ['mind', 2]] },
        fail: { text: '你看了一會兒，眼睛被太陽晃得發花。城散了。', effects: [] },
      },
    ],
  },
  {
    id: 'xm_sky_river',
    trigger: 'explore',
    nodes: [...OPEN, ...SPRING, ...FORT],
    once: true,
    weight: 40,
    cond: (s) => night(s) && !weatherNow(s).sand,
    title: '天河',
    text: (s) =>
      `夜裡的沙海冷得結霜。你抬起頭——\n\n這裡的天比東荒的低，星星又大又亮，伸手就摸得到似的。一條天河從東邊流過來，白茫茫的，流到頭頂正中——\n\n斷了。\n\n斷口黑得像一道疤，連一顆星也沒有。再往西，天河又接著流，可是細了，淡了，像是流不動了。${
        flag(s, 'read_stele_break') ? '\n\n你想起斷河碑上的字：「非天自斷，有物斷之。」' : ''
      }${awake(s) ? '\n\n玄微沒有說話。可是你覺得，他也在看。' : '\n\n叮——……'}`,
    choices: [{ text: '看了很久。', out: { effects: [['insight', 1], ['mind', 2]] } }],
  },
  {
    id: 'xm_singing_sand',
    trigger: 'explore',
    poi: 'yq_sing',
    nodes: WILDS,
    cooldown: 10,
    title: '鳴沙',
    text: '你爬上沙丘頂，坐下來，順著背風的陡坡往下一滑——\n\n沙子在你身下響了起來：嗡——像有人在很遠的地方敲鐘，又像千百根琴弦一起震。你停下來，聲音也停了。你再滑，它又響了。',
    choices: [
      {
        text: '再滑一次。',
        out: {
          text: (s) => variant(s, ['你一口氣滑到底，渾身是沙，笑得像個孩子。', '沙子響了很久。你躺在沙丘底下，聽它一點一點地靜下去，心裡也一點一點地靜下去。']),
          effects: [['mind', 3]],
        },
      },
    ],
  },
  {
    id: 'xm_yardang',
    trigger: 'explore',
    poi: 'yardang_wind',
    nodes: WILDS,
    cooldown: 10,
    title: '魔鬼城',
    text: (s) =>
      night(s)
        ? '夜裡的魔鬼城，風聲比白天大了十倍。一排一排的土台，在月光底下像一座座城樓，像一個個披甲的人。\n\n風從縫裡穿過去，嗚——嗚——\n\n聽著聽著，你覺得那不是風。那是很多人，在很遠的地方，喊著同一個字。'
        : '一排一排的土台，被風削成了城牆、樓閣、人的模樣。風從縫裡穿過去，嗚嗚地響，像有人在哭。',
    choices: [
      {
        text: '閉上眼，仔細聽。',
        show: night,
        check: { kind: 'wuxing', diff: 7 },
        ok: { text: '你閉上眼，聽了很久。\n\n是「渡」。他們喊的，是「渡」。\n\n叮——……本系統什麼也沒有聽見。', effects: [['insight', 2], ['flag', 'yardang_heard']] },
        fail: { text: '風太大了，你什麼也聽不清，只覺得後背一陣一陣地發涼。', effects: [['mind', -2]] },
      },
      { text: '離開。', out: {} },
    ],
  },
  {
    id: 'xm_moon_spring',
    trigger: 'explore',
    poi: 'yq_spring',
    nodes: SPRING,
    cooldown: 20,
    cond: (s) => moonTonight(s, 'fullmoon'),
    title: '月泉映月',
    text: '十五的夜裡，月亮升到正中，泉水裡也有一個月亮。\n\n天上的是圓的，泉裡的也是圓的——可是泉是彎的，彎得像初三的月亮。一圓一彎，套在一起，靜靜地浮在水上。\n\n泉邊的駝夫說，這叫月泉映月，一個月就這一夜。',
    choices: [
      {
        text: '在泉邊打坐到天亮。',
        out: { text: '你在泉邊坐了一夜。月光落進水裡，又從水裡升起來，一絲一絲地沉進你的丹田。天亮的時候，你覺得自己像被泉水洗過一遍。', effects: [['hours', 7], ['xw', [200, 320]], ['mind', 4]] },
      },
      { text: '看一會兒就走。', out: { effects: [['mind', 2]] } },
    ],
  },
  {
    id: 'xm_wanghe',
    trigger: 'explore',
    poi: 'wanghe_lines',
    nodes: ['wanghe_terrace'],
    priority: 5,
    cond: (s) => !flag(s, 'wanghe_read'),
    title: '刻線',
    text: (s) =>
      `台面上的刻線，一道一道，深深淺淺，全指著天上的同一個地方。你順著刻線往上看——\n\n${night(s) ? '那裡，是天河的斷口。' : '那裡什麼也沒有，只有一片白晃晃的天。等到夜裡，那裡是天河的斷口。'}`,
    choices: [
      {
        text: '坐下來，順著刻線參悟。',
        out: {
          text: '你在台上坐了一天一夜。\n\n刻線是星官們留下的：每一道，都是某一年、某一夜，天河垂下來的地方。一甲子一道，一道比一道深。\n\n最後一道刻得最深，刻到一半，斷了——像刻線的人刻著刻著，手停住了。',
          effects: [['days', 1], ['insight', 3], ['mind', 3], ['flag', 'wanghe_read'], ['sysexp', 15], ['log', '在望河臺上，參悟了星官們的刻線']],
        },
      },
    ],
  },
  {
    id: 'xm_lost_merchant',
    trigger: 'explore',
    nodes: WILDS,
    cooldown: 60,
    weight: 6,
    cond: (s) => !night(s),
    title: '迷路的行商',
    text: '沙丘背後躺著一個人，嘴唇裂得滲血，駱駝跪在他身邊，也快不行了。他看見你，掙扎著抬起手：「水……」',
    choices: [
      {
        text: '把水囊給他。',
        show: (s) => has(s, 'water_skin'),
        out: { text: '他抱著水囊，喝得嗆了好幾口。緩過來以後，他從懷裡掏出一個錢袋，硬塞給你：「救命的恩，不能不報。」\n\n你把他扶上駱駝，給他指了月泉的方向。', effects: [['item', 'water_skin', -1], ['ls', [30, 60]], ['mind', 4], ['sysexp', 5]] },
      },
      {
        text: '送他到月泉。',
        out: { text: '你架著他，牽著駱駝，往月泉走。走了大半天，總算看見了泉邊的胡楊。\n\n月娘迎出來，把他扶進了驛站。第二天他醒過來，千恩萬謝，塞給你一包靈石。', effects: [['hours', 6], ['ls', [20, 40]], ['mind', 5], ['favor', 'yue_niang', 3]] },
      },
      { text: '走開。', out: { text: '你走過了那道沙丘。身後，很久都沒有聲音。', effects: [['mind', -4]] } },
    ],
  },
  {
    id: 'xm_dead_caravan',
    trigger: 'explore',
    poi: 'dead_caravan',
    nodes: GOBI,
    once: true,
    title: '倒斃的駝隊',
    text: '幾具駱駝的骨架半埋在沙裡，貨箱散了一地，全被撬開了。箱子上的封條，印著一個「康」字。\n\n沙裡還埋著幾個人。他們的手，都朝著東邊——月泉的方向。',
    choices: [
      {
        text: '把他們埋了。',
        out: { text: '你在沙丘背後挖了一個坑，把他們埋了，又壘了幾塊石頭做記號。\n\n在一個人的懷裡，你找到一個羊皮口袋，袋口繡著一個「康」字。', effects: [['mind', 3], ['ls', [10, 25]], ['flag', 'dead_caravan_buried']] },
      },
      { text: '走開。', out: {} },
    ],
  },
  {
    id: 'xm_west_road',
    trigger: 'explore',
    poi: 'west_road_end',
    nodes: WILDS,
    once: true,
    title: '西去的駝道',
    text: '駝道往西，一直沒進黃沙裡。風從西邊吹過來，帶著一股說不出的味道，像是很遠很遠的地方，下過一場雨。\n\n叮——西去的路，本系統一片空白。',
    choices: [{ text: '再看一眼。', out: { effects: [['insight', 1]] } }],
  },
];
