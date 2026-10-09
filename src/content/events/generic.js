import { NODES } from '../../world/map.js';
import { flag, variant } from '../helpers.js';

const FLAVOR = {
  town: [
    '你在鎮上轉了兩天。豆花攤、鐵匠鋪、老槐樹下下棋的老頭。凡人的日子，慢得像一碗放涼的茶。',
    '集市上人聲鼎沸。你買了一串糖葫蘆，邊走邊吃，想起了小時候。',
    '你在鎮口的石橋上坐了一下午，看河水流過去。',
  ],
  mountain: [
    '你在山裡走了幾天，認識了幾種新的草藥，也被幾種不認識的蟲子咬了。',
    '山路越走越窄，最後消失在一片灌木叢裡。你在一塊大石頭上坐了一夜，聽了一夜的松濤。',
  ],
  temple: ['觀裡很靜。老松樹的影子，從東牆慢慢移到西牆。', '你替老道把觀裡的經書都曬了一遍。書頁裡夾著幾片乾枯的松針。'],
  market: [
    '你在坊市裡逛了兩天，看了很多東西，買不起大部分。',
    '街角有兩個修士在鬥法，圍觀的人比看戲還熱鬧。最後兩人都被坊市的執法隊抓走了。',
    '你在一個攤子前看了很久的一把劍，最後還是放下了。攤主說：「它會等你的。」',
  ],
  forest: ['林子裡什麼都沒有。正因為什麼都沒有，才讓人心裡發毛。', '你在一棵大樹的樹洞裡過了一夜，外面有東西走來走去，一直到天亮。'],
  valley: ['溪水叮咚。你在溪邊的石頭上坐了很久，什麼也沒想。', '谷裡的霧氣早晚不同。早上是白的，傍晚是金的。'],
  sect: ['你在山門外看了一會兒。來來往往的弟子們都穿著青色的衣服，沒有一個人看你。', '石階上，一個掃地的老雜役衝你點了點頭，又低頭繼續掃。'],
  ruins: ['荒原上的風一直在吹，一直在哭。你在一柄斷劍旁邊坐了一夜。', '你在劍林裡走了很久。每一柄劍，曾經都屬於一個人。'],
  shrine: ['荒廟裡空蕩蕩的。供桌上的灰，好像被人擦過。', '你在廟門口坐了一會兒。有一瞬間，你覺得有誰在背後看著你。'],
  ferry: ['江水滔滔。你數了一下午的船，一共三條，都是往這邊來的，沒有往那邊去的。'],
  cave: ['洞府裡很安靜，只有石壁上的劍痕，在黑暗裡隱隱發光。'],
};

const LOOT = {
  mountain: [['maybe', 0.6, [['item', 'ningqi_grass', [1, 2]]]]],
  forest: [['maybe', 0.5, [['item', 'ningqi_grass', [1, 3]]]], ['maybe', 0.1, [['item', 'mystery', 1]]]],
  valley: [['maybe', 0.6, [['item', 'ningqi_grass', [2, 3]]]]],
  ruins: [['maybe', 0.2, [['ls', [3, 10]]]], ['mind', -1]],
  town: [['mind', 1]],
  temple: [['mind', 1]],
  shrine: [['mind', 1]],
};

export const GENERIC_EXPLORE = {
  id: 'generic_explore',
  trigger: 'fallback',
  title: (s) => NODES[s.player.loc].name,
  text: (s) => variant(s, FLAVOR[NODES[s.player.loc].kind] || FLAVOR.town, s.stats.explores),
  choices: [{ text: '繼續', out: { effects: (s) => LOOT[NODES[s.player.loc].kind] || [] } }],
};

export default [
  {
    id: 'lin_farewell',
    trigger: 'scheduled',
    title: '辭行',
    text: (s) =>
      `一個青衣少年站在你面前。是林塵。\n\n「我要去中州了。」他說，「走之前，想來見見你。」\n\n${
        flag(s, 'lin_defended')
          ? '「那年在林家門前，滿街的人都在笑。只有你站出來了。」他頓了頓，「我一直記得。」\n\n'
          : flag(s, 'lin_saved')
            ? '「那年在崖下，要不是你，我已經是一堆骨頭了。」\n\n'
            : ''
      }他把一個玉瓶放在你手裡：「築基丹。宗門賞的，我用不著。」\n\n又解下腰間的一枚玉佩：「以後到了中州，遇上麻煩，拿著它來找我。」\n\n他轉身要走，又停下來：「修行的路很長。別死了。」`,
    choices: [
      {
        text: '「你也是。」',
        out: {
          text: '他笑了一下，御劍而起，化作一道紫色的雷光，消失在東邊的天際。\n\n叮——檢測到善緣回響。',
          effects: [['item', 'zhuji_pill', 1], ['item', 'lin_jade', 1], ['flag', 'lin_advice'], ['favor', 'lin_chen', 10], ['sysexp', 15], ['log', '林塵臨行前贈築基丹與玉佩']],
        },
      },
    ],
  },
];
