// 血月名冊 (1.2: made ready; the night itself settles it): the named people of 東荒, and what you have
// arranged for each against 天元三千零二十二年七月十五 — over the river on 上官家's 樓船, into 清虛觀 or
// the 狐仙廟, a 護身符, or left with someone who has said they will be there. Each needs something real:
// the boat lent (上官瑾), and the one going willing to go; a shelter with someone keeping it (松鶴 at his
// temple, 胡三娘 on her hill); a charm in your bag; one who has given their word (林塵, for his 玉佩's
// favour; 天劍宗, through 葉孤寒; 蕭七, for the 散修). Who is not on it, or left to themselves, is left
// to the night. The list opens once you know what the night is for (content/events/tianyan.js: ty_roster).
// Kept in s.vars.roster: { person: plan }.

import { dayAt } from '../core/calendar.js';
import { mapOf } from './map.js';

/** The night the list is for (world/arcs.js WINDOWS.bloodMoon). */
const NIGHT = dayAt(10, 7, 15);

const f = (s, k) => !!s.flags?.[k];
const npc = (s, id) => s.npcs?.[id];
const alive = (s, id) => !!npc(s, id)?.alive;

/**
 * Who is on it, and whether each would go over the river (null: they would; else what they say).
 * home: the shelter that is theirs already (松鶴's temple, 胡三娘's shrine).
 */
export const ROSTER = [
  { id: 'wang_er', name: '王二一家', go: () => '「我的家在這裡。」王二說。他娘在屋裡咳嗽，他媳婦抱著孩子站在門口，「要走，也是你走。」' },
  { id: 'sun_zg', name: '孫掌櫃', go: (s) => (f(s, 'sun_to_baicao') ? null : '「回春堂開了三十年，」孫掌櫃說，「藥櫃子搬不走，人就不走。」') },
  { id: 'song_he', name: '松鶴道人', home: 'qingxu', go: () => '「貧道守了這座觀一百年。」松鶴道人說，「觀在，貧道在。」' },
  { id: 'hu_sanniang', name: '胡三娘', home: 'fox', go: () => '胡三娘笑了：「狐狸離了自己的山，就是一張皮。」' },
  { id: 'shen_qingge', name: '沈家', go: () => null },
  { id: 'zhao_hu', name: '趙虎', go: (s) => (f(s, 'zhao_changed') ? null : '趙虎把頭一扭：「老子哪兒也不去。天塌下來，有個子高的頂著。」') },
  { id: 'qian_banxian', name: '錢半仙', go: () => null },
];

/** What can be done for one of them: [id, name, what it means]. */
export const PLANS = [
  ['evacuate', '撤到中州', '七月十三，坐上官家的樓船過江。那一夜，人在中州。'],
  ['qingxu', '躲進清虛觀', '松鶴道人守著觀門。'],
  ['fox', '躲進狐仙廟', '胡三娘守著她的山。'],
  ['charm', '給一張護身符', '天衍觀的護身符。擋不擋得住朱筆，誰也不知道。'],
  ['lin', '託林塵照看', '林塵回青石鎮，守那一夜。'],
  ['tianjian', '託天劍宗照看', '葉孤寒派弟子過江。'],
  ['xiao', '託蕭七照看', '鬼市的散修過江去。'],
];
const PLAN_NAME = Object.fromEntries(PLANS.map(([id, name]) => [id, name]));

/** How many each can take. */
export const ROOM = { evacuate: 4, qingxu: 3, fox: 3, lin: 3, tianjian: 2, xiao: 2, charm: 99 };

/** Is the list open (you know what the night is for)? */
export const rosterOpen = (s) => f(s, 'ty_roster');

const planOf = (s, id) => s.vars?.roster?.[id] || null;

/** How many are down for a plan. */
export function countOf(s, plan) {
  return Object.values(s.vars?.roster || {}).filter((p) => p === plan).length;
}

/** Is someone in 東荒 still (and so on the page that is to be torn)? */
function onThePage(s, id) {
  const loc = npc(s, id)?.loc;
  return !loc || mapOf(loc) === 'donghuang';
}

/** Why a plan cannot be made for someone now (null: it can). */
export function planBlocked(s, id, plan) {
  const entry = ROSTER.find((r) => r.id === id);
  if (!entry || !alive(s, id)) return '已經不在了';
  if (planOf(s, id) === plan) return null;
  if (countOf(s, plan) >= ROOM[plan]) return '人已經滿了';
  switch (plan) {
    case 'evacuate': {
      if (!f(s, 'roster_boat')) return '要先跟上官瑾借樓船';
      return entry.go(s) ? '不肯走' : null;
    }
    case 'qingxu':
      // (松鶴 keeps his temple while he lives; if he is gone, whoever has said they will watch 青石鎮 can keep its gate)
      return (alive(s, 'song_he') && npc(s, 'song_he').loc === 'qingxu_temple') || (f(s, 'roster_lin') && alive(s, 'lin_chen')) || f(s, 'roster_tj') ? null : '清虛觀沒有人守';
    case 'fox':
      if (!alive(s, 'hu_sanniang') || f(s, 'fox_betrayed')) return '狐仙廟沒有人守';
      return f(s, 'roster_fox') ? null : '要先去狐仙廟問胡三娘';
    case 'charm':
      return (s.player.items.hushen_fu || 0) > 0 ? null : '身上沒有護身符（天衍觀有）';
    case 'lin':
      return f(s, 'roster_lin') && alive(s, 'lin_chen') ? null : '林塵還沒答應';
    case 'tianjian':
      return f(s, 'roster_tj') ? null : '天劍宗還沒答應';
    case 'xiao':
      return f(s, 'roster_xiao') ? null : '蕭七還沒答應';
    default:
      return '不行';
  }
}

/** Put someone down for a plan (null to take them off). A 護身符 is given when you write it, and given back if you change it. */
export function setPlan(s, id, plan) {
  if (plan && planBlocked(s, id, plan)) return planBlocked(s, id, plan);
  s.vars.roster ||= {};
  const was = s.vars.roster[id] || null;
  if (was === plan) return null;
  if (was === 'charm') s.player.items.hushen_fu = (s.player.items.hushen_fu || 0) + 1;
  if (plan === 'charm') {
    s.player.items.hushen_fu -= 1;
    if (!s.player.items.hushen_fu) delete s.player.items.hushen_fu;
  }
  if (plan) s.vars.roster[id] = plan;
  else delete s.vars.roster[id];
  return null;
}

/** The list as it stands: each person, where they are, what is written for them, and what could be. */
export function rosterOf(s) {
  return ROSTER.map((r) => {
    const n = npc(s, r.id);
    const here = alive(s, r.id) && onThePage(s, r.id);
    return {
      id: r.id,
      name: r.name,
      alive: alive(s, r.id),
      away: alive(s, r.id) && !onThePage(s, r.id),
      plan: planOf(s, r.id),
      planName: PLAN_NAME[planOf(s, r.id)] || '不管',
      refuse: here ? r.go(s) : null,
      options: here ? PLANS.map(([id, name, desc]) => ({ id, name, desc, why: planBlocked(s, r.id, id) })) : [],
      met: !!n?.met,
    };
  });
}

/** Who has said yes (and what is still to be asked). */
export function helpersOf(s) {
  return [
    ['樓船', f(s, 'roster_boat'), '上官瑾'],
    ['清虛觀', alive(s, 'song_he') || (f(s, 'roster_lin') && alive(s, 'lin_chen')) || f(s, 'roster_tj'), alive(s, 'song_he') ? '松鶴道人' : '林塵或天劍宗'],
    ['狐仙廟', f(s, 'roster_fox') && alive(s, 'hu_sanniang') && !f(s, 'fox_betrayed'), '胡三娘'],
    ['林塵', f(s, 'roster_lin') && alive(s, 'lin_chen'), '林塵'],
    ['天劍宗', f(s, 'roster_tj'), '葉孤寒'],
    ['蕭七', f(s, 'roster_xiao'), '蕭七'],
  ].map(([name, yes, who]) => ({ name, yes, who }));
}

/** Days left to the night (0 once it has come). */
export const daysLeft = (s) => Math.max(0, NIGHT - s.day);

/** In a word: how many of those still on the page have something written for them. */
export function rosterSummary(s) {
  const list = rosterOf(s).filter((r) => r.alive && !r.away);
  return { done: list.filter((r) => r.plan).length, of: list.length };
}
