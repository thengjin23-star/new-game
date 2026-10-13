// 世界大事 that you can be there for: a 獸潮 on 青石鎮, a treasure out of
// the sky. When they come: world/happenings.js.
import { tideTonight, omenNear, takeOmen, OMEN_WHERE } from '../../world/happenings.js';
import { POI_BY_ID } from '../../world/places.js';
import { power } from '../../core/cultivation.js';

/** This 獸潮 is over for you, one way or another. */
const tideDone = (s) => {
  s.vars.tideFought = tideTonight(s);
};

/** The treasure you came for is gone now (yours or theirs). */
const omenGone = (s) => {
  const spot = omenNear(s, s.world?.x ?? 0, s.world?.y ?? 0, POI_BY_ID);
  if (spot) takeOmen(s, spot);
};

const OMEN_LOOT = [
  [3, [['ls', [80, 150]]]],
  [3, [['item', 'juqi_pill', 3]]],
  [2, [['item', 'lake_pearl', 2]]],
  [2, [['item', 'zhaoyao_mirror', 1]]],
  [2, [['item', 'jade_pendant', 1]]],
  [1, [['item', 'zhuji_pill', 1]]],
];

export default [
  {
    id: 'world_beast_tide',
    trigger: ['arrive', 'scheduled'],
    nodes: ['qingshi_town'],
    priority: 30,
    cond: (s) => tideTonight(s) !== null && s.vars.tideFought !== tideTonight(s),
    title: '獸潮',
    text: '半夜，鎮北響起了銅鑼聲。\n\n「狼——狼來了！」\n\n黑壓壓的一片影子從青石山上衝下來，眼睛在夜裡發著綠光。鎮上的獵戶抄起了獵叉和柴刀，擋在鎮口的石橋前，有人的手在抖。',
    choices: [
      {
        text: '拔劍，跟他們一起守住鎮口。',
        check: { kind: 'power', diff: (s) => Math.max(14, Math.round(power(s) * 0.95)) },
        fight: { foes: [['demon_wolf', 2], ['wolf', 3]], allies: [['escort', 2, { name: '獵戶' }]] },
        ok: {
          text: '天亮的時候，狼群退回了山裡。鎮口的石橋下橫七豎八躺著十幾具狼屍，獵戶們坐在地上喘氣，看你的眼神不一樣了。\n\n賣豆花的老李頭給每個人都盛了一碗，你那碗加了兩勺糖。',
          effects: [['ls', 30], ['mind', 6], ['sysexp', 10], ['rumor', '獸潮夜襲青石鎮，有個年輕修士守在鎮口，一夜沒退。', 'world'], ['log', '在獸潮之夜守住了青石鎮'], ['flag', 'tide_held'], tideDone],
        },
        fail: {
          text: '狼太多了。你被撲倒在石橋上，等你醒過來，狼已經退了，鎮上少了好幾頭牛，兩個獵戶受了重傷。\n\n沒有人怪你。可是你自己知道。',
          effects: [['hurt', 1], ['mind', -3], tideDone],
        },
      },
      {
        text: '關緊門窗，等天亮。',
        out: {
          text: '你聽了一夜的狼嚎和慘叫。天亮之後，鎮上少了好幾頭牛，還有兩個獵戶受了重傷。\n\n有人往你的門上啐了一口。',
          effects: [['mind', -5], tideDone],
        },
      },
    ],
  },

  {
    id: 'world_omen',
    trigger: 'explore',
    poi: ['omen_wilds', 'omen_forest', 'omen_hill', 'omen_south', 'omen_east'],
    priority: 20,
    cond: (s) => !!omenNear(s, s.world?.x ?? 0, s.world?.y ?? 0, POI_BY_ID),
    title: '異寶出世',
    text: (s) =>
      `${OMEN_WHERE[omenNear(s, s.world?.x ?? 0, s.world?.y ?? 0, POI_BY_ID)] || '這裡'}，寶光落下的地方。地上砸出了一個淺坑，坑底有東西在發亮。\n\n你不是第一個到的：兩個散修已經站在坑邊，一個拔出了劍，一個在打量你。`,
    choices: [
      {
        text: '動手。',
        check: { kind: 'power', diff: (s) => Math.max(14, Math.round(power(s) * 0.9)) },
        fight: { foes: [['cultivator', 2, { name: '散修' }]] },
        ok: { text: '他們跑了。你跳進坑裡，把那團光撈了起來。', effects: [['pick', OMEN_LOOT], ['sysexp', 5], ['flag', 'omen_won'], omenGone] },
        fail: { text: '你被他們聯手打翻在地。等你爬起來，坑裡的東西早就不見了。', effects: [['hurt', 1], omenGone] },
      },
      {
        text: '趁他們對峙，搶先跳下去。',
        check: { kind: 'jiyuan', diff: 6 },
        ok: { text: '你一把抓起那團光，滾出坑外，頭也不回地跑了。身後罵聲一片。', effects: [['pick', OMEN_LOOT], ['flag', 'omen_won'], omenGone] },
        fail: { text: '你剛跳下去，兩把劍就同時架在了你脖子上。你只好空著手爬了出來。', effects: [['mind', -2], omenGone] },
      },
      { text: '讓給他們。', out: { text: '你轉身走開。身後傳來兵刃相交的聲音。', effects: [['mind', 1], omenGone] } },
    ],
  },
];
