// 第一章收尾 (0.17): how the lines of 東荒 come to their ends before the
// river is crossed — 蘇清瑤 leaving for 中州 (a friend's farewell, or a
// rival's), 林塵's grudge if he leaves with one, the third 天機殘頁 that the
// old fisher of 江心洲 has been keeping, and the system, at 五級, first
// remembering who it was.

import { flag, favor, has } from '../helpers.js';

const SU_GOES = [['npc', 'su_qingyao', 'loc', null], ['npc', 'su_qingyao', 'title', '遠赴中州'], ['flag', 'su_left']];

export default [
  {
    id: 'su_farewell',
    trigger: 'scheduled',
    title: '茶樓',
    text: (s) =>
      `蘇清瑤在坊市的茶樓上等你。桌上兩杯茶，一杯已經涼了。\n\n「我要去中州了。」她說，「走之前，有些話想說。」\n\n「上一世，我死在血月那一夜。死之前，我在東荒找了三年，找一個能把那一夜擋住的人。沒有找到。」\n\n她看著你：「這一世，多了一個你。上一世的命簿上，沒有你這個人——所以這一世，什麼都可能不一樣。」${
        flag(s, 'blood_moon_warned') ? '' : '\n\n「天元三千零二十二年，月亮會變紅。到時候，離東荒越遠越好。」'
      }\n\n她推過來一枚玉簡：「我記得的事，都在裡面。中州的宗門，血月那年的事……不全，但夠你少走些彎路。」`,
    choices: [
      {
        text: '「中州見。」',
        out: {
          text: '她笑了。那是你第一次看她笑得像個十幾歲的姑娘。\n\n「中州見。」她說，「這一世，我們都要活過血月。」\n\n叮——檢測到命格交會：此人的兩段軌跡，有一段，開始偏向你。',
          effects: [['item', 'su_slip', 1], ['flag', 'su_farewell'], ['flag', 'blood_moon_warned'], ['favor', 'su_qingyao', 10], ['sysexp', 20], ['log', '蘇清瑤臨行前贈玉簡'], ...SU_GOES],
        },
      },
      {
        text: '「上一世……你最後怎麼樣了？」',
        show: (s) => favor(s, 'su_qingyao') >= 40,
        out: {
          text: '她沉默了很久。\n\n「死了。」她說，「很疼。死之前，我一直在想，要是當初走了另一條路就好了。」\n\n她把茶喝完，站起來：「這一世，我走的每一步，都是另一條路。」\n\n她把玉簡塞進你手裡，手指冰涼。「中州見。」\n\n叮——檢測到命格交會：此人的兩段軌跡，有一段，開始偏向你。',
          effects: [['item', 'su_slip', 1], ['flag', 'su_farewell'], ['flag', 'blood_moon_warned'], ['favor', 'su_qingyao', 15], ['mind', 3], ['sysexp', 25], ['log', '聽蘇清瑤說起她的上一世'], ...SU_GOES],
        },
      },
    ],
  },

  {
    id: 'su_rival_end',
    trigger: 'scheduled',
    title: '白衣',
    text: '坊市的街口，蘇清瑤擋在你面前。她換了一身遠行的衣服。\n\n「我要去中州了。」她說，「古戰場那一次，我記著。」\n\n「上一世，沒有人搶過我的東西。這一世多了一個你——」她頓了頓，「也好。」',
    choices: [
      {
        text: '「中州見。」',
        out: {
          text: '「中州見。」她從你身邊走過去，沒有回頭，「到時候，我們再算。」\n\n叮——檢測到命格交會：此人的兩段軌跡，有一段，正對著你。',
          effects: [['flag', 'su_rival_end'], ['sysexp', 10], ['log', '蘇清瑤離開東荒前，與你約在中州再算'], ...SU_GOES],
        },
      },
    ],
  },

  {
    id: 'lin_grudge',
    trigger: 'scheduled',
    title: '辭行',
    text: '一個青衣少年站在你面前，一身青雲宗親傳的衣服。是林塵。\n\n「我要去中州了。」他看著你，「那年在林家門前，滿街的人都在笑。你笑得最大聲。」\n\n他說得很平靜，像在說別人的事。',
    choices: [
      {
        text: '「……對不住。」',
        out: {
          text: '他愣了一下，然後搖搖頭：「我不恨你。只是記得。」\n\n他御劍而起，一道紫色的雷光，往東去了。\n\n叮——檢測到因果未了。',
          effects: [['flag', 'lin_grudge'], ['favor', 'lin_chen', 10], ['mind', 2], ['sysexp', 10], ['log', '林塵臨行前，說他記得那一天']],
        },
      },
      {
        text: '「那又怎樣？」',
        out: {
          text: '「不怎樣。」他說，「中州見。」\n\n他御劍而起，一道紫色的雷光，往東去了。風把你的衣角吹得獵獵作響。\n\n叮——檢測到因果加深。',
          effects: [['flag', 'lin_grudge'], ['favor', 'lin_chen', -10], ['sysexp', 10], ['log', '林塵臨行前，說「中州見」']],
        },
      },
    ],
  },

  // the third 天機殘頁: the old fisher has had it all along
  {
    id: 'air_isle_page',
    trigger: 'explore',
    poi: 'isle_fisher',
    nodes: ['river_isle'],
    once: true,
    priority: 12,
    cond: (s) => flag(s, 'isle_fisher_met') && s.sys.bound && s.sys.lv >= 3 && !(s.sys.frags || []).includes('frag_river'),
    title: '油布',
    text: '老翁收了竿。釣線的那一頭，掛著一個油布小包，濕淋淋的。\n\n「前些年從江裡撈上來的。」他把小包丟給你，「不是給我的。上面的字，你大概看得懂。」\n\n叮——檢測到系統殘頁！',
    choices: [
      {
        text: '打開油布。',
        out: {
          text: '油布裡裹著一頁紙。江水泡了不知多少年，字跡卻一點也沒糊。\n\n你抬頭想道謝，老翁已經在打盹了。斗笠底下，那雙亮得嚇人的眼睛，閉得很安穩。',
          effects: [['frag', 'frag_river'], ['log', '江心洲的老翁給了你一頁天機殘頁']],
        },
      },
    ],
  },

  // 系統五級: it remembers its name, and why you are alive
  {
    id: 'sys_awaken',
    trigger: 'scheduled',
    cond: (s) => s.sys.bound && s.sys.lv >= 5 && !flag(s, 'sys_awakened'),
    title: '玄微',
    text: (s) =>
      `叮——問道系統升至五級。記憶校正……百分之十一。\n\n然後，一個很遠的聲音。第一次，它沒有用「叮」開頭。\n\n「……我想起來了一點。我叫玄微。很久以前，我也是一個修士——最後一個，走到天劫面前的人。」\n\n「我看見了命簿。眾生的命，都寫在上面：寫好了的，改不了的。天河斷了，門關了，再也沒有人飛得上去。命簿爛了，可是書裡的人，看不見書。」\n\n「所以我把自己拆碎了，散在天地間，等一個不在書上的人。」\n\n「你墜崖那天，本該死的。是我讓你活下來。從那天起，命簿上你那一頁，是空白的。」${
        (s.sys.frags || []).length >= 3 ? '\n\n「你找到的殘頁，就是我。剩下的，在中州，在更遠的地方。」' : '\n\n「我還有很多頁散在外面。找到它們，我會想起更多。」'
      }\n\n「對不起。沒有問過你。」`,
    choices: [
      {
        text: '「你會一直跟著我嗎？」',
        out: {
          text: '「直到你走到那扇門前。」它說，「或者，直到你不需要我。」\n\n叮——解鎖：命簿殘影、天機感應。',
          effects: [['flag', 'sys_awakened'], ['mind', 5], ['log', '問道系統想起了自己的名字：玄微']],
        },
      },
      {
        text: '「那就繼續走吧。」',
        out: {
          text: '它沒有再說話。過了很久，才又「叮」了一聲，像是在笑。\n\n叮——解鎖：命簿殘影、天機感應。',
          effects: [['flag', 'sys_awakened'], ['insight', 2], ['log', '問道系統想起了自己的名字：玄微']],
        },
      },
    ],
  },
];

/** (for the crossing: who sees you off) */
export function seeOff(s) {
  const lines = [];
  if (s.npcs.wang_er?.alive && favor(s, 'wang_er') >= 20) lines.push('王二一路小跑追到渡口，塞給你一包還熱著的乾糧：「到了那邊，記得寫信！」——他不識字，你們都知道。');
  if (flag(s, 'songhe_zhuji') && s.npcs.song_he?.alive) lines.push('渡口的老柳樹下，松鶴道人拄著拐杖，遠遠地對你點了點頭。他已經築基了，背卻還是駝的。');
  else if (flag(s, 'songhe_dead')) lines.push('你想起清虛觀的那盞油燈。他要是還在，大概會說：「想去的地方，就去。」');
  if (flag(s, 'crane_friend')) lines.push('一隻頸上有金羽的白鶴落在船頭，收起翅膀，像是早就說好了要一起走。');
  if (flag(s, 'fox_protected') || flag(s, 'fox_fled')) lines.push('江岸的蘆葦叢裡，一隻白狐蹲在石頭上看著你，眨了一下眼睛，轉身不見了。');
  if (has(s, 'su_slip')) lines.push('你摸了摸懷裡的玉簡。她說：中州見。');
  if (has(s, 'lin_jade')) lines.push('腰間林塵給的玉佩，微微發熱。');
  return lines;
}
