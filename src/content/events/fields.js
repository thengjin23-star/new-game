// 東荒's fields and wilds, filled in (0.23): the 陳 family south of 青石鎮, whose
// father went north over 雁回嶺 to dig iron and whose letters stopped; the
// scarecrow that walks the furrows by moonlight; the harvest; an old 散修 in a
// hut in the wilds who never made 築基; an ox gone astray; a wedding on the road.
import { has, flag, variant, night, season } from '../helpers.js';

const FARM = ['farmland'];
const WILDS = ['wilds'];

export default [
  // ── the 陳 family ──
  {
    id: 'fl_chen',
    trigger: 'explore',
    poi: 'chen_house',
    nodes: FARM,
    priority: 5,
    cond: (s) => !flag(s, 'chen_met'),
    title: '陳家',
    text: '門口的石墩上坐著一個十來歲的孩子，兩手托著下巴，望著北邊的山。你走近了，他才回過頭來。\n\n「你是從北邊來的嗎？」他問。\n\n屋裡走出一個婦人，圍裙上沾著麵粉，一把把孩子拉到身後：「小石，別煩人家。」',
    choices: [
      {
        text: '「北邊有什麼？」',
        out: {
          text: '婦人嘆了口氣，讓你進院子裡坐。\n\n「他爹三年前去了北邊，翻過雁回嶺，到一個叫寒鐵堡的地方挖礦。」她說，「那邊工錢高，挖一年，抵得上種三年地。」\n\n「頭兩年，一個月一封信，信裡夾著錢。今年秋天以後……」她低下頭，搓著圍裙的角，「就沒有信了。」\n\n小石坐在門檻上，還在望著北邊：「爹說，他過年就回來。」',
          effects: [['flag', 'chen_met'], ['discover', 'yanhui_pass'], ['mind', 1], ['sysexp', 4], ['rumor', '鎮南陳家的男人去北邊挖礦，好幾個月沒有信了。'], ['log', '鎮南田野的陳家：小石的爹去了北原的寒鐵堡，好幾個月沒有信']],
        },
      },
    ],
  },
  {
    id: 'fl_chen_letter',
    trigger: 'explore',
    poi: 'chen_house',
    nodes: FARM,
    priority: 6,
    cond: (s) => has(s, 'frozen_letter'),
    title: '陳家',
    text: (s) =>
      flag(s, 'chen_met')
        ? '小石還坐在門口的石墩上，望著北邊。看見你，他一下子站了起來。\n\n你懷裡的那封信，忽然重得像一塊寒鐵。'
        : '一間孤零零的農舍。門口的石墩上坐著一個十來歲的孩子，望著北邊。\n\n你掏出那封信看了一眼：「青石鎮南，陳家小石收。」',
    choices: [
      {
        text: '把信交給他們。',
        out: {
          text: '陳嫂接過信，手一直在抖，抖得拆不開信封。小石搶過去，「嘶」的一聲撕開了。\n\n信是炭條寫的，字歪歪扭扭，有好幾個是畫的圈：\n\n「小石：爹在這邊很好。寒鐵堡冷，可是有火炕。爹給你買了一把小刀，刀柄是寒鐵的，過年帶回去。你要聽娘的話。地裡的事，等爹回去再幹。爹。」\n\n小石唸完了，抬頭看你：「我爹呢？」\n\n你把雪嶺口下面那塊大石頭，石頭底下的那堆石頭，一五一十地說了。\n\n陳嫂沒有哭出聲。她把信疊好，揣進懷裡，按著，按了很久。小石哭了，哭著哭著，又把眼淚擦乾了：「我長大了，去北邊，把爹接回來。」',
          effects: [['item', 'frozen_letter', -1], ['flag', 'chen_letter'], ['flag', 'chen_met'], ['mind', 6], ['insight', 1], ['sysexp', 15], ['rumor', '鎮南陳家的男人，凍死在北原的雪地裡了。是一個修士把信帶回來的。'], ['log', '把北原雪地裡那封信交給了鎮南陳家']],
        },
      },
    ],
  },

  // ── the fields ──
  {
    id: 'fl_scarecrow',
    trigger: 'explore',
    nodes: FARM,
    cooldown: 60,
    cond: (s) => night(s) && !flag(s, 'scarecrow_burned'),
    title: '稻草人',
    text: '月光底下，田裡的稻草人動了。\n\n它從竹竿上滑下來，拖著兩條草紮的腿，一步一步，在田埂上走。走到田頭，揮揮袖子，趕走了兩隻偷吃的野鴨；走到田尾，蹲下來，扶正了一株被風吹倒的稻子。\n\n然後它看見了你。',
    choices: [
      {
        text: '站著別動，看它做什麼。',
        out: {
          text: '稻草人看了你一會兒，朝你彎了彎腰——像是行了個禮——然後走回田中間，爬上竹竿，又成了一個稻草人。\n\n第二天，你聽田裡的人說，今年這片田，野豬一回也沒來過。',
          effects: [['mind', 2], ['sysexp', 3]],
        },
      },
      {
        text: '放出神識探一探。',
        show: (s) => s.player.realm >= 1,
        out: {
          text: '稻草人身上的氣息很淡，淡得像月光。是一點草木之精，吸了十幾年的月華，有了一絲靈性——它不記得自己是誰，只記得自己是看田的。\n\n叮——偵測到：精怪（無害）。建議：不必理會。',
          effects: [['insight', 1], ['sysexp', 4]],
        },
      },
      {
        text: '一把火燒了它。',
        out: {
          text: '火一下子就竄了起來。稻草人沒有跑，也沒有叫，就那樣站在田中間燒著，燒成了一堆灰。\n\n那年秋天，這片田被野豬拱了三回。',
          effects: [['flag', 'scarecrow_burned'], ['mind', -4]],
        },
      },
    ],
  },
  {
    id: 'fl_harvest',
    trigger: 'explore',
    nodes: FARM,
    cooldown: 300,
    cond: (s) => season(s) === 'autumn' && !night(s),
    title: '秋收',
    text: '稻子黃了，一片一片，壓彎了腰。田裡的人從天不亮就下了田，割稻、打穀、挑擔子，忙得連喝口水的工夫都沒有。\n\n一個老農直起腰，擦了把汗，看了你一眼：「後生，搭把手？管飯。」',
    choices: [
      {
        text: '捲起袖子下田。',
        out: {
          text: (s) =>
            variant(s, [
              '你割了一整天的稻子，腰都直不起來了。傍晚，田頭擺開了桌子，新米煮的飯，香得你吃了三大碗。老農塞給你幾塊靈石：「修士也肯下田，難得。」',
              '你挑了一整天的穀擔子。修士的力氣大，一擔頂人家三擔，田裡的人都看呆了。收工的時候，他們非要你帶一袋新米走。',
            ]),
          effects: [['days', 1], ['ls', 10], ['hp', 0.2], ['mind', 2]],
        },
      },
      { text: '笑著搖搖頭，走開。', out: {} },
    ],
  },

  // ── the wilds ──
  {
    id: 'wd_hermit',
    trigger: 'explore',
    poi: 'wd_hut',
    nodes: WILDS,
    priority: 5,
    title: '草屋',
    text: (s) =>
      flag(s, 'hermit_met')
        ? '草屋前，老散修正在劈柴。看見你，他放下斧子，笑了：「又來了？坐。」'
        : '荒草裡藏著一間草屋，屋前有一小塊菜地，種著幾畦蘿蔔。一個老人坐在門口曬太陽，鬍子白了，身上的道袍補了又補。\n\n他睜開一隻眼睛看你：「修士？煉氣幾層了？」',
    choices: [
      {
        text: '「前輩一個人住在這裡？」',
        show: (s) => !flag(s, 'hermit_met'),
        out: {
          text: '「住了四十年了。」老人說，「我年輕的時候，跟你一樣，一心想築基。衝了三回，三回都沒衝過去。第三回傷了經脈，就再也衝不動了。」\n\n他指了指菜地：「後來就種蘿蔔。蘿蔔比瓶頸好說話。」\n\n「你要是想聽，我把那三回是怎麼輸的，說給你聽。」',
          effects: [['flag', 'hermit_met'], ['sysexp', 4]],
        },
      },
      {
        text: '請他說說那三回。',
        show: (s) => flag(s, 'hermit_met') && !flag(s, 'hermit_told'),
        out: {
          text: '「頭一回，太急。修為剛滿就衝，心是浮的。」老人掰著指頭，「第二回，太怕。前一回輸怕了，衝到一半自己先鬆了。第三回……」他笑了笑，「第三回，丹藥是假的。坊市裡買的，蜂蜜和麵粉。」\n\n「記住三件事：心要靜，丹要真，地方要選靈氣濃的。」他拍拍膝蓋，「還有——輸了也不要緊。輸了，還可以種蘿蔔。」',
          effects: [['flag', 'hermit_told'], ['insight', 2], ['mind', 3], ['sysexp', 6]],
        },
      },
      {
        text: '「北邊、西邊、南邊，晚輩都去過了。」',
        show: (s) => flag(s, 'hermit_met') && s.player.realm >= 2 && [s.flags.nanling_crossed, s.flags.ximo_crossed, s.flags.beiyuan_crossed].filter(Boolean).length >= 2 && !flag(s, 'hermit_world'),
        out: {
          text: '你把南嶺的瘴林、西漠的沙海、北原的雪，一樣一樣說給他聽。老人聽得眼睛都亮了，聽完了，很久沒說話。\n\n「我這一輩子，最遠到過古戰場。」他說，「我年輕的時候想，等我築基了，就去看看天下。後來沒築成，就沒去。」\n\n他看著你，笑了：「你替我看了。好，好。」',
          effects: [['flag', 'hermit_world'], ['mind', 4], ['insight', 1], ['sysexp', 8]],
        },
      },
      {
        text: '幫他澆菜，陪他坐一會兒。',
        show: (s) => flag(s, 'hermit_met'),
        out: { text: '你挑水澆了菜，又陪他坐著曬了一會兒太陽。他拔了兩個蘿蔔給你，洗乾淨了，咬一口，甜的。', effects: [['hours', 2], ['hp', 0.1], ['mind', 1]] },
      },
    ],
  },
  {
    id: 'wd_lost_ox',
    trigger: 'explore',
    nodes: WILDS,
    cooldown: 90,
    cond: (s) => !night(s),
    title: '走失的牛',
    text: '荊棘叢裡傳來一聲長長的「哞——」。一頭黃牛被荊棘纏住了，越掙越緊，鼻子上還拴著半截斷了的韁繩。\n\n遠處的田埂上，一個農人正扯著嗓子喊：「大黃——大黃——」',
    choices: [
      {
        text: '把牛從荊棘裡解出來，牽回去。',
        out: {
          text: '你一根一根撥開荊棘，把牛牽了出來。農人跑過來，抱著牛脖子差點哭了：「大黃！你個死東西！」\n\n他非要塞給你幾塊靈石：「這頭牛，比我那間房子還值錢。」',
          effects: [['hours', 1], ['ls', 6], ['mind', 2]],
        },
      },
      { text: '喊那個農人過來。', out: { text: '你朝田埂上揮了揮手。農人跑過來，千恩萬謝地把牛牽走了。', effects: [['mind', 1]] } },
    ],
  },
  {
    id: 'wd_wedding',
    trigger: 'explore',
    nodes: [...WILDS, ...FARM],
    cooldown: 360,
    cond: (s) => season(s) === 'spring' && !night(s),
    title: '迎親',
    text: '路上傳來嗩吶聲。一隊人抬著一頂紅轎子走過來，前頭的人敲鑼，後頭的人挑著擔子，擔子上蓋著紅布。轎簾掀開一角，露出一張紅撲撲的臉，又飛快地放下了。\n\n走在最前頭的老人看見你，笑瞇瞇地從懷裡掏出兩個紅雞蛋：「沾沾喜氣！」',
    choices: [
      { text: '接過紅雞蛋，道一聲恭喜。', out: { text: '你接過紅雞蛋，道了聲恭喜。迎親的隊伍吹吹打打地走遠了，嗩吶聲還在田野上飄了很久。', effects: [['hp', 0.05], ['mind', 3]] } },
    ],
  },
];
