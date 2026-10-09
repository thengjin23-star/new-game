import { flag } from '../helpers.js';

const C = ['crane_ferry'];

export default [
  {
    id: 'ferry_arrive',
    trigger: 'arrive',
    nodes: C,
    once: true,
    title: '白鶴渡',
    text: '大江橫在眼前，寬得看不見對岸。江面上霧氣蒸騰，偶爾有一兩隻白鶴從霧裡飛出來，又飛回霧裡。\n\n渡口只有一條船，船頭坐著一個戴斗笠的老船夫，正在抽旱煙。\n\n「去中州？」他頭也不抬，「江裡有東西，築基以下，老頭子不載。」',
    choices: [
      {
        text: '「江裡有什麼？」',
        out: {
          text: '老船夫吐了個煙圈：「上個月有個煉氣九層的愣頭青，自己御劍過江。」\n\n「然後呢？」\n\n「然後江裡的東西，打了個飽嗝。」',
          effects: [['sysexp', 5]],
        },
      },
    ],
  },

  {
    id: 'ferry_cross',
    trigger: 'explore',
    nodes: C,
    priority: 10,
    cond: (s) => s.player.realm >= 2 && !flag(s, 'chapter1_done'),
    title: '過江',
    text: '老船夫看了你一眼，把旱煙在船舷上磕了磕：「築基了？上船吧。」\n\n船行到江心，霧氣忽然散開。你看見江底有一隻比山還大的眼睛，緩緩睜開，看了你一眼，又緩緩閉上了。\n\n對岸，是連綿不絕的城池與山峰，無數道劍光在雲間穿梭，像一場永不停歇的流星雨。\n\n中州。',
    choices: [
      {
        text: '踏上中州的土地。',
        out: {
          text: '叮——恭喜宿主完成第一章「東荒」。\n\n叮——中州地圖尚在推演中，暫未開放。本系統建議宿主：先回東荒，把該了的因果了一了。\n\n老船夫又把你送了回去。「中州不急，」他說，「它又不會跑。」\n\n（第一章 完。感謝試玩！你可以繼續在東荒修煉、探索，看看那些人的故事會怎麼走下去。）',
          effects: [['flag', 'chapter1_done'], ['sysexp', 50], ['log', '渡過大江，望見中州']],
        },
      },
    ],
  },

  {
    id: 'ferry_wait',
    trigger: 'explore',
    nodes: C,
    cooldown: 20,
    cond: (s) => s.player.realm < 2,
    title: '江邊',
    text: (s) =>
      flag(s, 'crane_friend')
        ? '你坐在江邊發呆。一隻頸上有金羽的白鶴落在你身邊，陪你看了一下午的江。\n\n「你也想去對岸看看嗎？」你問牠。\n\n牠歪著頭看你，像是在說：等你築基了，我們一起去。'
        : '你坐在江邊，看著霧氣裡若隱若現的對岸。\n\n老船夫說：「築基了再來。」\n\n你點點頭。江風很大，吹得人眼睛發酸。',
    choices: [{ text: '回去修煉。', out: { effects: [['mind', 2]] } }],
  },
];
