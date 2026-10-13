// 秘境, gone down room by room: a fight, a trap, a chest, others who came
// for the same thing, a spring; at the bottom, the guardian and its hoard.
// Each realm's opening and dice: world/realms.js.
import { SECRET_REALMS, realmOpen, realmDone, runOf, beginRun, endRun, nextRoom, realmDiff, haul, hoard } from '../../world/realms.js';
import { power } from '../../core/cultivation.js';

/** What a realm looks like, room by room. */
const LOOK = {
  ruins: {
    door: '古戰場中央那座斷了一半的石門又亮了。門裡是一片永夜的荒原，天上掛著兩輪殘月。\n\n門前三三兩兩站著些散修，誰也不看誰。',
    fight: '斷牆後飄出兩團慘白的影子，帶著一股透骨的寒氣朝你撲來。',
    trap: '腳下的石板刻滿了符文，有幾塊亮著，有幾塊暗著。走錯一步，大概就是一道雷。',
    chest: '一具盤坐的骸骨懷裡抱著一個鐵匣，匣上的封條還沒爛。',
    rival: '轉過一道斷牆，兩個散修正蹲在地上分一堆東西。他們抬起頭，手按上了刀柄。',
    spring: '荒原中間有一眼泉，泉水是溫的，冒著淡淡的靈氣。',
    boss: '最深處是一座塌了一半的將台。台上站著一具一丈高的骷髏，手裡握著一柄斷戟——它轉過頭來。',
    won: '它轟然倒塌，斷戟插進了土裡。將台後面的石室，門開了。',
  },
  lake: {
    door: '中秋的月亮正正地落在鏡湖中央。湖心亭下的湖水無聲地分開，露出一道往下的石階，石階上還滴著水。\n\n亭子裡已經有人了，正往下看。',
    fight: '水府的長廊裡積著齊踝的水。水裡有什麼東西在遊——兩條青蛇抬起了頭。',
    trap: '一道水簾擋在門前，水簾後隱約有光。水簾上浮著幾個字，像是一道謎。',
    chest: '一個長滿青苔的大蚌殼半開著，裡面有光。',
    rival: '兩個濕淋淋的散修從另一條甬道鑽出來，看見你，愣了一下，然後慢慢地散開。',
    spring: '一間乾燥的小石室，石床上鋪著乾淨的草蓆，牆角的石缸裡是清甜的水。',
    boss: '水府正殿。殿中央的水池裡盤著一條巨大的老蛟，鱗片像一片片青瓦。牠睜開了眼睛。',
    won: '老蛟沉回了池底，再也沒有浮上來。正殿後面的寶庫，門開了。',
  },
};

/** How strong those down here are, against you (the guardian: stronger). */
const diff = (boss = false) => (s) => realmDiff(s, power(s), boss);

/** A realm's run, as one event: its door, then room after room. */
function realmEvent(id) {
  const R = SECRET_REALMS[id];
  const L = LOOK[id];
  const out = { text: '你沿著來時的路退了出去。身後的門，慢慢暗了。', effects: [endRun] };
  return {
    id: R.event,
    trigger: 'explore',
    poi: R.poi,
    nodes: [R.region],
    priority: 15,
    cond: (s) => realmOpen(s, id) !== null && !realmDone(s, id),
    title: R.name,
    steps: {
      start: {
        text: L.door,
        choices: [
          { text: '進去。', out: { effects: [(s) => beginRun(s, id)], next: (s) => nextRoom(s) } },
          { text: '改天再說。', out: { text: '你在門前站了一會兒，轉身走了。這扇門開不了幾天。' } },
        ],
      },
      fight: {
        text: L.fight,
        choices: [
          {
            text: '迎上去。',
            check: { kind: 'power', diff: diff() },
            fight: { foes: R.foes.fight },
            ok: { text: '它們倒下了。你在角落裡找到了一點東西。', effects: (s) => haul(s), next: 'onward' },
            fail: { text: '你被打得退出了秘境，一身是傷。', effects: [['hurt', 1], endRun] },
          },
          { text: '退出去。', out },
        ],
      },
      trap: {
        text: L.trap,
        choices: [
          {
            text: '試著解開它。',
            check: { kind: 'wuxing', diff: (s) => 4 + (runOf(s)?.depth || 1) },
            ok: { text: '最後一道符文暗了下去，門開了。門後有前人留下的東西。', effects: (s) => haul(s), next: 'onward' },
            fail: { text: '一道光炸開，把你掀了個跟頭。你爬起來，渾身發麻，所幸還能走。', effects: [['hurt', 1]], next: 'onward' },
          },
          { text: '繞過去。', out: { text: '你找了另一條路。', next: 'onward' } },
        ],
      },
      chest: {
        text: L.chest,
        choices: [
          {
            text: '打開它。',
            check: { kind: 'jiyuan', diff: (s) => 4 + (runOf(s)?.depth || 1) },
            ok: { text: '裡面的東西還在。', effects: (s) => haul(s), next: 'onward' },
            fail: { text: '裡面是空的，只有一股腥風撲面而來。你被嗆得眼淚直流。', effects: [['mind', -2]], next: 'onward' },
          },
          { text: '不碰它。', out: { next: 'onward' } },
        ],
      },
      rival: {
        text: L.rival,
        choices: [
          {
            text: '動手，東西歸我。',
            check: { kind: 'power', diff: diff() },
            fight: { foes: R.foes.rival },
            ok: { text: '他們跑了，東西留了下來。', effects: (s) => [...haul(s), ...haul(s)], next: 'onward' },
            fail: { text: '二打一，你吃了虧，被他們趕出了秘境。', effects: [['hurt', 1], endRun] },
          },
          {
            text: '「各取所需，井水不犯河水。」',
            check: { kind: 'xinxing', diff: 5 },
            ok: { text: '他們對視一眼，分了一份給你，各自走開。', effects: (s) => haul(s), next: 'onward' },
            fail: { text: '他們不信你，你也不信他們。雙方慢慢退開。', next: 'onward' },
          },
        ],
      },
      spring: {
        text: L.spring,
        choices: [{ text: '歇一歇。', out: { text: '你歇了一會兒，氣血、靈力都回來了不少。', effects: [['hp', 0.5], ['mp', 0.5]], next: 'onward' } }],
      },
      onward: {
        text: (s) => `第 ${runOf(s)?.depth || 1} 層。${(runOf(s)?.depth || 1) >= R.depth ? '再往下，就是最深處了。' : '再往下，還有路。'}`,
        choices: [
          { text: '往深處走。', out: { next: (s) => nextRoom(s) } },
          { text: '見好就收，出秘境。', out },
        ],
      },
      boss: {
        text: L.boss,
        choices: [
          {
            text: '拚了。',
            check: { kind: 'power', diff: diff(true) },
            fight: { foes: R.foes.boss },
            ok: {
              text: L.won,
              effects: (s) => [...hoard(s), ['sysexp', 20], ['log', `闖過${R.name}，打倒了守在最深處的東西`], (x) => {
                x.vars.realmCleared ||= {};
                x.vars.realmCleared[id] = (x.vars.realmCleared[id] || 0) + 1;
              }, endRun],
            },
            fail: { text: '你被打出了秘境，摔在門外，半天爬不起來。', effects: [['hurt', 2], endRun] },
          },
          { text: '不自量力，退出去。', out: { text: '你退了出去。最深處的那雙眼睛，一直看著你走。', effects: [endRun] } },
        ],
      },
    },
  };
}

export default [realmEvent('ruins'), realmEvent('lake')];
