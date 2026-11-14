// 血月那一夜 (1.3「血月」): the cards of the night (world/night.js; the watches themselves are fought in
// world/combat.js beginNight). Three days before, the system's warning (it wakes you out of a seclusion:
// core/actions.js). At dusk wherever you are, the moon rises red and the book opens across the sky; between
// the watches, a card (and a place to stand, if the game is closed); dawn. A save that came to 1.3 with the
// night already behind it (the stroke never fell) is told the night is put off to the next 七月十五.
import { flag, has, alive } from '../helpers.js';
import { power } from '../../core/cultivation.js';
import { ROSTER } from '../../world/roster.js';
import {
  nightOf, nightDate, nextWatch, leaveField, hoursToWatchEnd, hoursToDawn, settle, fieldOf, stopBrush, watchNow, PLACES, WATCH_NAME, WATCHES, nightDay,
} from '../../world/night.js';

/** The system has woken and remembers its name: it speaks as 玄微. */
const awake = (s) => flag(s, 'sys_awakened');
/** You know what the night is for (欽天監's 抄本閣: content/events/tianyan.js). */
const knows = (s) => flag(s, 'ty_truth');
/** The place you are fighting at. */
const fieldName = (s) => fieldOf(s).name;
/** Hours to dawn, as an effect. */
const toDawn = (x) => [['hours', hoursToDawn(x)]];
/** Put you somewhere, on your feet (the walk, or the flight, this broke into is over). */
const putAt = (x, X, Y) => {
  x.world.x = X;
  x.world.y = Y;
  x.world.region = null;
  x.world.moved = true;
  x.world.fly = null;
};
/** The 天衍城 climb, where each stage of it is fought: the foot of the 御階, before 欽天監, the 天梯, the 觀星台. */
const CLIMB_AT = { start: [2700, 2520], hall: [2700, 1660], stair: [2700, 1600], summit: [2700, 1280] };
/** Up to a stage of the climb (and there). */
const climbTo = (stage) => (x) => {
  const n = nightOf(x);
  if (n) n.climb = stage;
  putAt(x, ...CLIMB_AT[stage]);
};
/** Watch the sky until dawn (the night goes on without you). */
const watchTillDawn = (x) => [(y) => { leaveField(y); }, ...toDawn(x), (y) => { y.queue.push('night_dawn'); }];
/** 蘇清瑤 is up on the 觀星台 that night (she knows what the night is for, and is 欽天監's). */
const suUp = (s) => alive(s, 'su_qingyao') && flag(s, 'su_archive');
/** 殘頁・月: at 子時, a page drifts down out of the book and finds you, wherever you are. */
const MOON_PAGE = ['frag', 'frag_moon'];
const hasMoonPage = (s) => (s.sys?.frags || []).includes('frag_moon');

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

  // ── two days before (七月十三): 上官家's boat goes over the river with those on the 名冊 for it ──
  {
    id: 'night_boat',
    trigger: 'scheduled',
    once: true,
    title: '七月十三・白鶴渡',
    text: (s) => {
      const who = (s.vars.night_evac || []).map((id) => ROSTER.find((r) => r.id === id)?.name).filter(Boolean);
      return [
        '天還沒亮，上官家的樓船就從白鶴渡開走了。',
        `船上有${who.join('、')}。${who.includes('王二一家') ? '王二抱著他娘，他媳婦抱著孩子，站在船尾，一直望著青石鎮的方向。' : ''}`,
        '上官瑾留了話：「人送到臨江城，住處都安排好了。七月十五那一夜，他們在江這邊。」',
      ].join('\n\n');
    },
    choices: [{ text: '好。', out: { effects: [['log', '七月十三，上官家的樓船載著名冊上的人過了江']] } }],
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
            putAt(x, PLACES.qingshi.at[0], PLACES.qingshi.at[1] + 40);
            onward(x);
          }, ['log', '血月那一夜，趕回青石鎮']],
        },
      },
      {
        text: '闖上玉指峰。',
        show: (s) => nightOf(s).place === 'peak',
        out: {
          text: '你朝玉指峰跑過去。滿城的人都在街上仰著頭，沒有人看你。',
          effects: [climbTo('start'), (x) => { x.queue.push('night_climb'); }, ['log', '血月那一夜，闖玉指峰']],
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
      // 子時: a page out of the book
      if (n.phase === 2 && !hasMoonPage(s)) lines.push('子時。一頁紙從天上那本書裡飄了下來，打著旋，不偏不倚，落在你腳邊。紙上的字，不是朱筆寫的。');
      if (awake(s)) lines.push(n.phase === 1 ? '玄微說：「還有兩更。」' : '玄微說：「最後一更了。撐住。」');
      return lines.join('\n\n');
    },
    choices: [
      {
        text: '接著守。',
        out: { effects: (x) => [...(nightOf(x).phase === 2 ? [MOON_PAGE] : []), ['hours', hoursToWatchEnd(x, nightOf(x).phase)], (y) => { onward(y); }] },
      },
      {
        text: '走。',
        out: {
          text: '你轉身走了。身後，天上的筆一筆一筆落下去，沒有人擋。',
          effects: (x) => [...(nightOf(x).phase === 2 ? [MOON_PAGE] : []), (y) => { leaveField(y); }, ['mind', -5], ...toDawn(x), (y) => { y.queue.push('night_dawn'); }],
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

  // ── 天衍城 that night: up 玉指峰 — the 御階, 欽天監, the 天梯, the 觀星台; the sooner at its top, the sooner the brush stops ──
  {
    id: 'night_climb',
    trigger: 'scheduled',
    title: '闖峰',
    steps: {
      start: {
        text: '玉指峰的峰頂紅光大作，照得半個天衍城都是紅的。外城的人都擠在街上，仰著頭看天。\n\n御階底下的禁軍比平時多了一倍，長戟並排豎著，一直排到午門。\n\n天上的書攤開了。那支筆，正從峰頂上一筆一筆地往東邊落。',
        choices: [
          {
            text: '從御階衝上去。',
            check: { kind: 'power', diff: (s) => Math.max(260, Math.round(power(s) * 0.95)) },
            fight: { foes: [['jinjun', 3]], close: true },
            ok: { text: '最後一個禁軍滾下了御階。你一步三級，衝上了午門，穿過空蕩蕩的皇城。', effects: [['hours', 1], climbTo('hall')], next: 'hall' },
            fail: { text: '禁軍的長戟把你從御階上掃了下來。', effects: [['wound', 0.15], climbTo('start')], next: 'thrown' },
          },
          {
            text: '亮出欽天監的腰牌，從邊門上去。',
            show: (s) => has(s, 'qintian_token') && flag(s, 'huangcheng_pass'),
            out: { text: '守邊門的禁軍看了一眼腰牌，又看了一眼天，讓開了。「今夜……」他沒有說完。', effects: [['hours', 0.5], climbTo('hall')], next: 'hall' },
          },
          { text: '算了。看著天，直到天亮。', out: { effects: (x) => watchTillDawn(x) } },
        ],
      },
      hall: {
        text: '皇城裡空蕩蕩的，所有的人都在看天。\n\n山壁底下，欽天監的星官署門口，兩個星衛橫著劍。他們身後的石縫裡在滲墨——紅的，稠得像血，順著山壁一道一道往下流。流到地上，就站起來了。',
        choices: [
          {
            text: '打進去。',
            check: { kind: 'power', diff: (s) => Math.max(300, Math.round(power(s) * 1.05)) },
            fight: { foes: [['xingwei', 2], ['zhumo_kui', 1]], close: true },
            ok: { text: '星衛倒在台階上，朱墨傀化回了一灘墨。天梯就在星官署後面。', effects: [['hours', 1], climbTo('stair')], next: 'stair' },
            fail: { text: '星衛的劍光把你從台階上掃了下來，一直滾到午門底下。', effects: [['wound', 0.18], climbTo('hall')], next: 'thrown' },
          },
          { text: '退下去。看著天，直到天亮。', out: { effects: (x) => watchTillDawn(x) } },
        ],
      },
      stair: {
        text: '天梯貼著山壁往上爬，爬進了雲裡。封山的鐵柵開著，柵上的木牌掉在地上。\n\n爬到一半，上面有人往下看——又是兩個星衛，劍上的星光一明一滅。\n\n頭頂上，那支筆落下去的聲音一下一下，像有人在敲你的骨頭。',
        choices: [
          {
            text: '爬上去。',
            check: { kind: 'power', diff: (s) => Math.max(320, Math.round(power(s) * 1.1)) },
            fight: { foes: [['xingwei', 2]], close: true },
            ok: { text: '你翻過了峰頂的石欄。', effects: [['hours', 0.5], climbTo('summit')], next: 'summit' },
            fail: { text: '星衛一劍把你從天梯上挑了下去。你撞斷了兩根欄杆，才在欽天監的屋頂上停住。', effects: [['wound', 0.2], climbTo('stair')], next: 'thrown' },
          },
          { text: '退下去。看著天，直到天亮。', out: { effects: (x) => watchTillDawn(x) } },
        ],
      },
      summit: {
        text: (s) => {
          const lines = [
            '峰頂的風裡全是墨的腥氣。\n\n觀星台的台心，那口圓池滿了，紅得發黑。池子上空懸著一根手指——白色的，比人還高，指尖朝下，蘸著池裡的墨，在天上那本書上，一筆一筆地寫。',
            '衛長庚背著手，站在池邊看天。',
          ];
          if (suUp(s)) lines.push('蘇清瑤站在台角，懷裡抱著東荒那一冊——她抄的那一本。她看見你，嘴唇動了動，沒有出聲。');
          lines.push(
            '衛長庚沒有回頭：「你來早了。」\n\n他抬起一隻手。那根手指停在了半空，筆尖上的墨一滴一滴地往下掉，掉進池子裡。',
            '「墨不夠了。」他說，「它找不到你的字，就在你站的地方亂撞，白白灑了一地。」他轉過身來看著你，「今夜，到此為止。」\n\n「天亮以後，你上來。」他說，「我們把話說完。」',
          );
          return lines.join('\n\n');
        },
        choices: [
          {
            text: '等天亮。',
            out: {
              effects: (x) => [
                (y) => { stopBrush(y); },
                ...(suUp(x) ? [['flag', 'su_star_kept'], ['favor', 'su_qingyao', 10]] : []),
                ['flag', 'night_summit'],
                ['sysexp', 60],
                ['log', '血月那一夜，闖上了玉指峰頂：朱筆停了'],
                ...toDawn(x),
                (y) => { y.queue.push('night_dawn'); },
              ],
            },
          },
        ],
      },
      late: {
        text: '東邊的天，已經有點白了。\n\n峰頂上的紅光一點一點暗下去。那支筆落完了最後一筆。',
        choices: [{ text: '等天亮。', out: { effects: (x) => watchTillDawn(x) } }],
      },
      thrown: {
        text: (s) => `你倒在地上，身上的傷口火辣辣地疼。\n\n${watchNow(s) <= WATCHES ? '頭頂上，那支筆還在一筆一筆地往東邊落。' : '東邊的天，已經有點白了。那支筆落完了最後一筆。'}`,
        choices: [
          // (until the last watch is out: after that there is nothing up there to stop)
          {
            text: '再闖一次。',
            show: (s) => watchNow(s) <= WATCHES,
            out: { effects: (x) => [['hours', 1], climbTo(nightOf(x)?.climb || 'start')], next: (s) => (watchNow(s) <= WATCHES ? nightOf(s)?.climb || 'start' : 'late') },
          },
          { text: '算了。看著天，直到天亮。', out: { effects: (x) => watchTillDawn(x) } },
        ],
      },
    },
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
      if (n?.place === 'peak' && n.stoppedAt) lines.push('峰頂的風停了。那根手指縮回了雲裡；池子裡的墨，一點一點地退回了石縫。');
      if (!hasMoonPage(s)) {
        lines.push(n?.place === 'slept' || n?.place === 'secl'
          ? '你的枕邊多了一頁紙。沒有人知道它是什麼時候來的。'
          : '天亮的時候，你在身邊找到了一頁紙——子時從天上那本書裡飄下來的，一直跟著你。');
      }
      lines.push(awake(s) ? '玄微很久沒有說話。' : '叮——天象異常結束。');
      return lines.join('\n\n');
    },
    choices: [
      {
        text: '天亮了。',
        out: {
          effects: (x) => [
            ...(hasMoonPage(x) ? [] : [MOON_PAGE]),
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
