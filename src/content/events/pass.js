// The pass over the southern hills: 東荒 on one side, 南嶺 on the other. The
// way takes most of a day; on the far side the map is another (a 'cross'
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
