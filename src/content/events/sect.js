import { flag } from '../helpers.js';
import { power } from '../../core/cultivation.js';
import { rankOf } from '../../world/sect.js';
import { DAYS_PER_YEAR } from '../../core/calendar.js';

/** This year's 大比 is over for you (won, lost, or watched). */
const doneThisYear = (s) => {
  s.vars.tourneyYear = Math.floor(s.day / DAYS_PER_YEAR);
};
/** How hard the one across the stage is, against how strong you are now. */
const match = (k) => (s) => Math.max(10, Math.round(power(s) * k));

const S = ['qingyun_sect'];

function rootLine(s) {
  switch (s.player.root.type) {
    case 'five':
      return '測靈石亮起五色微光，混成一片灰濛濛的顏色。\n\n「五靈根。」負責測試的執事頭也不抬，「下一個。」';
    case 'four':
      return '測靈石亮起四種顏色，彼此打架似的閃爍不定。\n\n「四靈根，雜。」執事頭也不抬，「下一個。」';
    case 'three':
      return '測靈石亮起三色光芒，雖不耀眼，卻還算清晰。\n\n執事抬起頭看了你一眼：「三靈根。可入外門。」';
    default:
      return '測靈石亮起兩道清亮的光！\n\n執事坐直了身子：「雙靈根！好苗子，可入內門！」';
  }
}

export default [
  {
    id: 'sect_gate',
    trigger: 'explore',
    poi: 'sect_gate',
    auto: true,
    nodes: S,
    once: true,
    title: '青雲峰',
    text: '青雲峰拔地而起，山腰以上全被雲霧遮住。三千級石階從山腳一直鋪進雲裡，盡頭隱約可見飛簷翹角。\n\n守山的弟子攔住了你：「非本宗弟子，不得上山。」\n\n「怎樣才能成為弟子？」\n\n「十年一次開山收徒。」他上下打量你，「等著吧。」',
    choices: [{ text: '記下了。', out: { effects: [['sysexp', 3]] } }],
  },

  {
    id: 'sect_recruit',
    trigger: 'explore',
    poi: 'sect_gate',
    auto: true,
    nodes: S,
    cooldown: 3000,
    priority: 10,
    cond: (s) => flag(s, 'recruit_open') && !flag(s, 'sect_member'),
    title: '開山收徒',
    steps: {
      start: {
        text: '開山收徒的日子。\n\n山門前的廣場上擠滿了人，大多是十來歲的少年少女，也有幾個鬍子一大把的，在人群裡顯得格格不入。廣場正中央立著一塊一人高的白玉石碑——測靈石。\n\n隊伍排得很長。',
        choices: [
          { text: '排隊測試。', out: { next: 'test' } },
          { text: '只是來看熱鬧。', out: { next: 'lin' } },
        ],
      },
      test: {
        text: (s) => `輪到你了。你把手按在冰涼的石碑上。\n\n${rootLine(s)}`,
        choices: [
          {
            text: '請求做雜役弟子。',
            show: (s) => ['five', 'four'].includes(s.player.root.type),
            out: {
              text: '執事終於抬起頭：「雜役弟子？管吃管住，砍柴挑水，三年後可考外門。」他在冊子上畫了一筆，「去後山報到吧。」',
              effects: [['flag', 'sect_member'], ['rep', 'sect', 30], ['flag', 'sect_servant'], ['log', '成為青雲宗雜役弟子']],
              next: 'lin',
            },
          },
          {
            text: '入外門。',
            show: (s) => s.player.root.type === 'three',
            out: {
              text: '你領到了一身青色的外門弟子服，和一冊《青雲心法》。',
              effects: [['flag', 'sect_member'], ['rep', 'sect', 30], ['tech', 'qingyun'], ['log', '成為青雲宗外門弟子']],
              next: 'lin',
            },
          },
          {
            text: '入內門。',
            show: (s) => s.player.root.type === 'dual',
            out: {
              text: '一位長老親自走下台來，看了你一眼，點點頭：「跟我來。」',
              effects: [['flag', 'sect_member'], ['rep', 'sect', 30], ['tech', 'qingyun'], ['ls', 50], ['log', '成為青雲宗內門弟子']],
              next: 'lin',
            },
          },
          {
            text: '轉身離開，繼續做散修。',
            out: { text: '你走出人群。散修就散修吧，天地這麼大。', effects: [['mind', 3], ['flag', 'recruit_declined']], next: 'lin' },
          },
        ],
      },
      lin: {
        text: (s) =>
          s.npcs.lin_chen.realm >= 1 || flag(s, 'recruit_attended') || flag(s, 'lin_ruined')
            ? '收徒大典熱熱鬧鬧地進行到了黃昏。'
            : '就在這時，人群忽然安靜下來。\n\n「林塵？那個廢物也來了？」\n\n林塵走到測靈石前，把手按了上去。\n\n一息，兩息。測靈石毫無反應。有人笑出了聲。\n\n然後——轟！\n\n一團刺目的紫色雷光從石碑裡炸開，整個廣場都被映成了紫色。\n\n「雷、雷靈根！」執事從椅子上跳了起來。\n\n高台上，一直閉目養神的大長老睜開了眼睛。\n\n叮——檢測到極高濃度的氣運爆發。',
        choices: [
          {
            text: '……',
            out: {
              effects: [
                (s) => {
                  if (s.npcs.lin_chen.realm === 0 && !s.flags.lin_ruined) {
                    s.flags.recruit_attended = true;
                    s.npcs.lin_chen.met = true;
                  }
                },
                ['sysexp', 10],
              ],
            },
          },
        ],
      },
    },
  },

  {
    id: 'sect_chores',
    trigger: 'explore',
    poi: 'sect_woodshed',
    nodes: S,
    cooldown: 60,
    cond: (s) => flag(s, 'sect_servant'),
    title: '雜役',
    text: '雜役弟子的日子：天不亮起床挑水，上午砍柴，下午給靈田除草，晚上才有一個時辰可以修煉。\n\n管事的師兄說：「積夠了貢獻，可以去藏經閣換功法。」',
    choices: [
      {
        text: '老老實實幹活。',
        out: {
          text: '三個月下來，你的手又粗了一圈。貢獻點，攢了一些。',
          effects: [['days', 90], ['gx', 30], ['mind', 2]],
        },
      },
      {
        text: '用貢獻換《青雲心法》。',
        show: (s) => (s.vars.contribution || 0) >= 60 && !s.player.techs.includes('qingyun'),
        out: {
          text: '藏經閣的老執事把書遞給你，多看了你兩眼：「雜役弟子換心法的，你是今年第一個。」',
          effects: [['var', 'contribution', -60], ['tech', 'qingyun']],
        },
      },
      {
        text: '用貢獻換兩顆聚氣丹。',
        show: (s) => (s.vars.contribution || 0) >= 30,
        out: { text: '丹房的師姐給了你兩顆聚氣丹，還附贈了一個白眼。', effects: [['var', 'contribution', -30], ['item', 'juqi_pill', 2]] },
      },
    ],
  },

  {
    id: 'sect_tourney',
    trigger: 'explore',
    poi: 'sect_task_hall',
    nodes: S,
    priority: 20,
    cond: (s) => flag(s, 'tourney_open') && rankOf(s) >= 1 && s.vars.tourneyYear !== Math.floor(s.day / DAYS_PER_YEAR),
    title: '宗門大比',
    steps: {
      start: {
        text: '一年一度的宗門大比。\n\n任務堂前的廣場上搭起了三座擂台，外門、內門的弟子擠得水洩不通。高台上坐著幾位長老，有人在打瞌睡，有人在看名冊。\n\n連勝三場，就是今年的魁首。',
        choices: [
          { text: '報名上台。', out: { next: 'r1' } },
          { text: '在台下看熱鬧。', out: { text: '你在台下看了一整天。看別人打，也是一種修行。', effects: [['insight', 1], doneThisYear] } },
        ],
      },
      r1: {
        text: '第一場。對面是個外門的師兄，劍還沒出鞘，先衝你抱了抱拳。',
        choices: [
          {
            text: '抱拳還禮，出手。',
            check: { kind: 'power', diff: match(0.8) },
            fight: { foes: [['swordsman', 1, { name: '外門師兄' }]], spar: true },
            ok: { text: '他退了三步，收劍：「承讓。」台下有人叫好。', effects: [['gx', 30]], next: 'r2' },
            fail: { text: '你被他一劍點在胸口，止步第一場。\n\n執事在名冊上給你記了一筆：「勇氣可嘉。」', effects: [['gx', 10], doneThisYear] },
          },
        ],
      },
      r2: {
        text: '第二場。對面是內門的師姐，出手比剛才那位快了一倍不止。',
        choices: [
          {
            text: '再戰。',
            check: { kind: 'power', diff: match(1) },
            fight: { foes: [['swordsman', 1, { name: '內門師姐' }]], spar: true },
            ok: { text: '最後一招，你的劍停在她喉前三寸。她看了你一眼，收劍下台。', effects: [['gx', 60], ['item', 'juqi_pill', 1]], next: 'r3' },
            fail: { text: '她的劍太快了。你輸得心服口服。', effects: [['gx', 20], doneThisYear] },
          },
        ],
      },
      r3: {
        text: '決賽。擂台四周忽然安靜了。對面那人一直閉著眼睛，直到你走上台，才睜開。\n\n高台上打瞌睡的長老，也醒了。',
        choices: [
          {
            text: '拔劍。',
            check: { kind: 'power', diff: match(1.15) },
            fight: { foes: [['swordsman', 1, { name: '內門首席' }]], spar: true },
            ok: {
              text: '一炷香之後，你站在擂台中央，台下的歡呼聲像潮水一樣湧上來。\n\n長老親手把魁首的玉牌掛在你腰上：「好。」',
              effects: [['gx', 150], ['rep', 'sect', 15], ['flag', 'tourney_champion'], ['log', '奪得青雲宗大比魁首'], doneThisYear],
            },
            fail: { text: '你撐到了最後一招，終究差了一線。\n\n他扶你起來：「明年再來。」', effects: [['gx', 40], ['rep', 'sect', 5], doneThisYear] },
          },
        ],
      },
    },
  },

  {
    id: 'sect_lin_visit',
    trigger: 'visit',
    npc: 'lin_chen',
    nodes: S,
    cooldown: 90,
    title: '林塵',
    text: (s) =>
      s.npcs.lin_chen.favor >= 20
        ? '林塵住在青雲峰頂的獨院裡，院子裡種了一棵槐樹，是從青石鎮移過來的。\n\n「坐。」他給你倒了杯茶，「宗門裡的人，說話都繞。跟你說話，不累。」'
        : '林塵的獨院外站著兩個守門的弟子。通報之後，他出來看了你一眼：「有事？」',
    choices: [
      {
        text: '向他請教修行。',
        show: (s) => s.npcs.lin_chen.favor >= 20,
        check: { kind: 'wuxing', diff: 6 },
        ok: { text: '他講得很簡單，卻每句都打在你最困惑的地方。', effects: [['insight', 2], ['favor', 'lin_chen', 3]] },
        fail: { text: '他講的東西，太高了。你只聽懂了一句：「別回頭。」', effects: [['insight', 1]] },
      },
      { text: '聊聊青石鎮。', out: { text: '說起老槐樹、豆花攤和趙虎，他難得笑了一下。', effects: [['favor', 'lin_chen', 3], ['mind', 2]] } },
    ],
  },
];
