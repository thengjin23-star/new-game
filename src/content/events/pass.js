// The ways out of 東荒: the pass over the southern hills (南嶺 on the other
// side), and the gap in the western mountains past 古戰場 (西漠). Each way
// takes most of a day or more; on the far side the map is another (a 'cross'
// effect: world/atlas.js CROSSINGS, world/explore.js crossTo).
import { flag } from '../helpers.js';

export default [
  {
    id: 'south_pass_arrive',
    trigger: 'arrive',
    nodes: ['south_pass'],
    once: true,
    title: '南嶺山隘',
    text: '田野到了盡頭，小路一折，鑽進兩座山頭中間。越往上走，風越涼，路邊的樹也越來越矮。\n\n山隘最高處立著一塊界碑，上頭的字被風雨磨得只剩一半，還認得出一個「嶺」字。\n\n往南望下去，是一片看不到邊的林子，林子上浮著一層淡淡的霧，綠得發黑。',
    choices: [{ text: '看了一會兒。', out: { effects: [['sysexp', 5]] } }],
  },

  {
    id: 'pass_to_nanling',
    trigger: 'explore',
    poi: 'south_pass_gate',
    nodes: ['south_pass'],
    priority: 10,
    title: '翻過山隘',
    text: (s) =>
      flag(s, 'nanling_crossed')
        ? '山隘那頭，是南嶺。這一趟翻過去，又得走上大半天。'
        : '山隘那頭，就是南嶺了。\n\n鎮上的老人說，南嶺的林子裡終年有瘴氣，吸多了，人會發暈、發燒，最後倒在路邊再也起不來。那邊的人養蠱，說的話也跟這邊不一樣。\n\n凡人進了南嶺，很少有回來的。修士進去，也得小心。\n\n翻過去，得走上大半天。',
    choices: [
      {
        text: '翻過去。',
        need: (s) => (s.player.realm >= 1 ? null : '凡人過不了瘴林——得先引氣入體'),
        out: {
          text: (s) =>
            flag(s, 'nanling_crossed')
              ? '你又一次翻過了山隘。'
              : '你翻過山隘，一路往南。\n\n山路先是往上，然後一直往下，往下。空氣越來越濕，越來越暖，帶著一股說不清的甜味。走到天色變了，腳下的路才平了。',
          effects: (s) => [['cross', 'south_pass'], ...(flag(s, 'nanling_crossed') ? [] : [['flag', 'nanling_crossed'], ['sysexp', 20], ['log', '翻過南嶺山隘，進了南嶺']])],
        },
      },
      { text: '改天吧。', out: {} },
    ],
  },

  {
    id: 'pass_to_donghuang',
    trigger: 'explore',
    poi: 'ling_pass_gate',
    nodes: ['ling_pass'],
    priority: 10,
    title: '山隘',
    text: '山隘那頭，是東荒：青石鎮、鎮南的田、你熟悉的一切。翻回去，得走上大半天。',
    choices: [
      { text: '回東荒。', out: { text: '你翻過山隘，一路往北。', effects: [['cross', 'ling_pass']] } },
      { text: '再待一陣。', out: {} },
    ],
  },

  // ── 西風口: out to the desert (0.22) ──
  {
    id: 'west_pass_arrive',
    trigger: 'arrive',
    nodes: ['west_pass'],
    once: true,
    title: '西風口',
    text: '古道越走越窄，最後鑽進兩座光禿禿的山之間。風從前面灌過來，一陣緊似一陣，打在臉上，是細細的沙。\n\n山口下立著一座烽燧，土夯的，塌了一角，頂上沒有柴。\n\n風是從西邊來的。西邊，是西漠。',
    choices: [{ text: '迎著風站了一會兒。', out: { effects: [['sysexp', 5]] } }],
  },

  {
    id: 'pass_to_ximo',
    trigger: 'explore',
    poi: 'west_pass_gate',
    nodes: ['west_pass'],
    priority: 10,
    title: '出西風口',
    text: (s) =>
      flag(s, 'ximo_crossed')
        ? '山口那頭，是西漠。這一趟出去，要走上一天一夜。'
        : '山口那頭，就是西漠了。\n\n古戰場上的散修說，出了西風口，先是一天的山路，然後就只有沙：沙丘一道接著一道，白天燙得落不了腳，夜裡冷得結霜，沒有水。\n\n凡人進去，三天就成了乾屍；煉氣的修士，也撐不過十天。只有築基、辟了穀的人，才走得過那片沙。\n\n沙海裡有一眼泉，駝隊在那裡歇腳。再往西，就沒人說得清了。',
    choices: [
      {
        text: '出關。',
        need: (s) => (s.player.realm >= 2 ? null : '還沒築基，辟不了穀，走不過沙海'),
        out: {
          text: (s) =>
            flag(s, 'ximo_crossed')
              ? '你又一次出了西風口。'
              : '你出了西風口，一路往西。\n\n山路先是往上，然後往下，一直往下。樹越來越少，草越來越黃，最後連草也沒有了。走到第二天的黃昏，眼前忽然一空：\n\n天和地之間，只剩下沙。',
          effects: (s) => [['cross', 'west_pass'], ...(flag(s, 'ximo_crossed') ? [] : [['flag', 'ximo_crossed'], ['sysexp', 25], ['log', '出了西風口，進了西漠']])],
        },
      },
      { text: '改天吧。', out: {} },
    ],
  },

  {
    id: 'pass_to_donghuang_w',
    trigger: 'explore',
    poi: 'luori_gate',
    nodes: ['luori_pass'],
    priority: 10,
    title: '山口',
    text: '山口那頭，是東荒：古戰場、黑風林、青石鎮，你熟悉的一切。翻回去，要走上一天一夜。',
    choices: [
      { text: '回東荒。', out: { text: '你翻過山口，一路往東。', effects: [['cross', 'luori_pass']] } },
      { text: '再待一陣。', out: {} },
    ],
  },

  {
    id: 'ximo_arrive',
    trigger: 'arrive',
    nodes: ['luori_pass'],
    once: true,
    title: '西漠',
    text: '山路的盡頭，是一座土城。\n\n城牆是土夯的，被風削得圓了邊角，城樓上的瓦掉了一半。城門朝西開著，門外就是沙——一道一道的沙丘，金黃的，一直排到天邊，排到落日底下。\n\n城門洞裡坐著一個老兵，抱著一桿生了鏽的長槍，抬頭看了你一眼。\n\n叮——檢測到新地圖：西漠。\n\n……\n\n叮——本系統……好像，來過這裡。',
    choices: [{ text: '走過去。', out: { effects: [['sysexp', 10]] } }],
  },

  {
    id: 'nanling_arrive',
    trigger: 'arrive',
    nodes: ['ling_pass'],
    once: true,
    title: '南嶺',
    text: '山從這裡開始變了樣。\n\n東荒的山是一整片連著的；南嶺的山卻是一根一根的，像筍，像指頭，從底下的林子裡直直拔起來，頂上披著綠，腰上纏著霧。林子密得看不見地，只聽得見水聲，和一些說不出名字的鳥叫。\n\n山腰上有幾縷炊煙，順著山路下去，大概有人家。\n\n叮——檢測到新地圖：南嶺。本系統的推演，在這裡只剩一半。宿主小心。',
    choices: [{ text: '往下走。', out: { effects: [['sysexp', 10]] } }],
  },
];
