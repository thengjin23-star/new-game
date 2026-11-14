// 血月那一夜 (1.3「血月」): the cards of the night (world/night.js; the watches themselves are fought in
// world/combat.js beginNight). Three days before, the system's warning (it wakes you out of a seclusion:
// core/actions.js). At dusk wherever you are, the moon rises red and the book opens across the sky; between
// the watches, a card (and a place to stand, if the game is closed); dawn. A save that came to 1.3 with the
// night already behind it (the stroke never fell) is told the night is put off to the next 七月十五.
import { flag } from '../helpers.js';
import {
  nightOf, nightDate, nextWatch, leaveField, hoursToWatchEnd, hoursToDawn, settle, fieldOf, PLACES, WATCH_NAME, WATCHES, nightDay,
} from '../../world/night.js';

/** The system has woken and remembers its name: it speaks as 玄微. */
const awake = (s) => flag(s, 'sys_awakened');
/** You know what the night is for (欽天監's 抄本閣: content/events/tianyan.js). */
const knows = (s) => flag(s, 'ty_truth');
/** The place you are fighting at. */
const fieldName = (s) => fieldOf(s).name;
/** Hours to dawn, as an effect. */
const toDawn = (x) => [['hours', hoursToDawn(x)]];
/** Into the next watch; come to it after the last is over (late), dawn is next. */
function onward(x) {
  if (nextWatch(x) > WATCHES) x.queue.push('night_dawn');
}

/** The moon, from where you are: overhead in 東荒; from anywhere else, the crack is over 東荒. */
function moonText(s) {
  const n = nightOf(s);
  const east = n.place !== 'away' && n.place !== 'peak';
  return [
    '戌時，月亮升了起來。是紅的。',
    '不是邊上帶一圈紅——是整個兒的紅，紅得像一隻浸在血裡的眼睛。四下裡的蟲聲一下子停了，連風都停了。',
    east
      ? '天上裂開了一道縫，就在頭頂上。縫裡，一本書慢慢攤開，攤滿了半邊天。書頁上一行一行的字亮了起來——是東荒，是青石鎮，是你認得的每一個人。'
      : n.place === 'peak'
        ? '玉指峰的峰頂上紅光大作。天上裂開了一道縫，在西邊，在大江那頭，在東荒的頭頂上。縫裡，一本書慢慢攤開。'
        : '天上裂開了一道縫，在東荒的方向。縫裡，一本書慢慢攤開，攤滿了半邊天。你在這裡，看得見，搆不著。',
    '一支朱紅的筆，從縫裡探了出來。',
  ].join('\n\n');
}

/** What the system says as it begins. */
function systemText(s) {
  if (awake(s)) {
    return knows(s)
      ? '玄微的聲音很低：「來了。……它找不到你的字，可是找得到他們的。站到他們前面去。」'
      : '玄微的聲音很低：「我不知道它要做什麼。可是我認得那支筆。」';
  }
  return '叮——偵測到大範圍天象異常。本系統……無法解析。';
}

export default [
  // ── three days before ──
  {
    id: 'night_warn',
    trigger: 'scheduled',
    once: true,
    cond: (s) => !s.vars?.night,
    title: '天象',
    text: (s) =>
      `叮——天象異常。\n\n${
        awake(s)
          ? `玄微說：「三天以後，${nightDate(s).replace('天元', '')}。月亮會紅。」${
              knows(s) ? '\n\n「名冊上的人，安排好了嗎？那一夜你在哪裡，就在哪裡。」' : '\n\n「我不知道那一夜會落下什麼。可是我記得那個顏色。」'
            }`
          : '叮——三日後，月相異常。本系統建議宿主：留意。'
      }`,
    choices: [{ text: '記下了。', out: { effects: [['flag', 'night_warned'], ['sysexp', 5]] } }],
  },

  // ── (a save that came to 1.3 with the night already behind it) put off to the next 七月十五 ──
  {
    id: 'night_delayed',
    trigger: 'scheduled',
    once: true,
    title: '天上的縫',
    text: (s) =>
      `夜裡，天上那道縫又亮了一下，像有人在縫後頭翻書。\n\n${
        awake(s) ? `玄微說：「上一回，墨不夠。他們在等墨滿。」他停了停，「下一回，是${nightDate(s)}。」` : `叮——偵測到：天象將再度異常。預計：${nightDate(s)}。`
      }`,
    choices: [{ text: '記下了。', out: { effects: [['flag', 'night_delay_told']] } }],
  },

  // ── dusk: the moon rises, wherever you are ──
  {
    id: 'night_rise',
    trigger: 'scheduled',
    title: '血月',
    text: (s) => {
      const n = nightOf(s);
      const parts = [moonText(s), systemText(s)];
      if (PLACES[n.place]) parts.push(`${fieldName(s)}外頭的山坡上，一雙一雙紅色的眼睛亮了起來。`);
      else if (n.place === 'east') parts.push('筆尖對著的方向，是青石鎮。');
      return parts.join('\n\n');
    },
    choices: [
      {
        text: (s) => `守住${fieldName(s)}。`,
        show: (s) => !!PLACES[nightOf(s).place],
        out: { effects: [(x) => { onward(x); }, ['log', '血月那一夜，守在東荒']] },
      },
      {
        text: '趕去青石鎮。',
        show: (s) => nightOf(s).place === 'east',
        out: {
          text: '你朝青石鎮跑過去。路上，天上那支筆落下了第一筆，落在你看不見的地方。',
          effects: [['hours', 1], (x) => {
            const n = nightOf(x);
            n.place = 'qingshi';
            n.late = true;
            x.world.x = PLACES.qingshi.at[0];
            x.world.y = PLACES.qingshi.at[1] + 40;
            x.world.region = null;
            x.world.moved = true;
            onward(x);
          }, ['log', '血月那一夜，趕回青石鎮']],
        },
      },
      {
        text: '看著天，直到天亮。',
        show: (s) => !PLACES[nightOf(s).place] && nightOf(s).place !== 'east',
        out: {
          text: '你看了一夜。那支筆一筆一筆往下落，每落一筆，天上的書就暗一行。',
          effects: (x) => [(y) => { leaveField(y); }, ...toDawn(x), (y) => { y.queue.push('night_dawn'); }],
        },
      },
      {
        text: '躲起來，等天亮。',
        show: (s) => !!PLACES[nightOf(s).place] || nightOf(s).place === 'east',
        out: {
          text: '你找了個地方躲起來，捂住耳朵。外頭的聲音，你聽了一夜。',
          effects: (x) => [(y) => { leaveField(y); }, ['mind', -5], ...toDawn(x), (y) => { y.queue.push('night_dawn'); }],
        },
      },
    ],
  },

  // ── between the watches (world/combat.js endNight) ──
  {
    id: 'night_watch',
    trigger: 'scheduled',
    title: (s) => `${WATCH_NAME[nightOf(s)?.phase || 1]}過去了`,
    text: (s) => {
      const n = nightOf(s);
      const lines = [
        n.phase === 1
          ? '山坡上的獸退了一步，在黑暗裡喘氣。天上的書翻過了一頁，下一頁的字更密。'
          : '東邊的天還是黑的。天上的書只剩最後幾頁，字密得像一片血。',
      ];
      if (awake(s)) lines.push(n.phase === 1 ? '玄微說：「還有兩更。」' : '玄微說：「最後一更了。撐住。」');
      return lines.join('\n\n');
    },
    choices: [
      {
        text: '接著守。',
        out: { effects: (x) => [['hours', hoursToWatchEnd(x, nightOf(x).phase)], (y) => { onward(y); }] },
      },
      {
        text: '走。',
        out: {
          text: '你轉身走了。身後，天上的筆一筆一筆落下去，沒有人擋。',
          effects: (x) => [(y) => { leaveField(y); }, ['mind', -5], ...toDawn(x), (y) => { y.queue.push('night_dawn'); }],
        },
      },
    ],
  },

  // ── you left the field in the middle of a watch (world/combat.js nightTick) ──
  {
    id: 'night_fled',
    trigger: 'scheduled',
    title: '離開戰場',
    text: '你跑出了很遠才停下來。回頭看，天上的書還攤著，那支筆一筆一筆往下落。\n\n這一夜剩下的時間，那裡沒有你。',
    choices: [{ text: '等天亮。', out: { effects: (x) => [...toDawn(x), (y) => { y.queue.push('night_dawn'); }] } }],
  },

  // ── you went down in the middle of a watch (world/combat.js nightFell) ──
  {
    id: 'night_fell',
    trigger: 'scheduled',
    title: '倒下',
    text: (s) =>
      `${fieldName(s)}的地上很冷。你倒下去的時候，看見天上那支筆停了一停，像是在找什麼——然後接著往下落。\n\n眼前一黑。`,
    choices: [{ text: '……', out: { effects: (x) => [...toDawn(x), (y) => { y.queue.push('night_dawn'); }] } }],
  },

  // ── dawn ──
  {
    id: 'night_dawn',
    trigger: 'scheduled',
    title: '天亮',
    text: (s) => {
      const n = nightOf(s);
      const lines = ['寅時，月亮一點一點白了回去。天上那道縫慢慢合上，像一隻閉上的眼睛。'];
      if (n?.place === 'slept') lines.unshift('你醒過來的時候，天已經亮了。外頭的人都在說同一件事：昨夜月亮是紅的，天上攤開了一本書。');
      else if (n?.place === 'secl') lines.unshift('你出關的時候，七月十五已經過去了。外頭的人都在說同一件事：那一夜，月亮是紅的，天上攤開了一本書。');
      else if (n?.fell) lines.unshift('你醒過來的時候，天快亮了。身上的傷口結了痂，四下裡一片狼藉。');
      lines.push(awake(s) ? '玄微很久沒有說話。' : '叮——天象異常結束。');
      return lines.join('\n\n');
    },
    choices: [
      {
        text: '天亮了。',
        out: {
          effects: (x) => [
            ...toDawn(x),
            (y) => { settle(y); },
            ['sysexp', 40],
            ['log', '血月那一夜，過去了'],
            ['rumor', '七月十五那一夜，月亮紅得像血，天上攤開了一本書，有一支朱紅的筆一筆一筆往下落。', 'arc'],
          ],
        },
      },
    ],
  },
];

/** (for tests and the 名冊) the night's day for a save */
export const theNight = nightDay;
