// 故事 (0.25): every thread you are part of, and how far each has come — the main line, the people of
// 東荒 and their years, the stories of each land. A thread shows once you are in it; its steps show as
// you reach them (never ahead: what is to come is told only as the next thing you might do).
// Each: { id, group, title, start(s), steps: [[label, done(s)]], end(s) → a closing line or null,
// next(s) → what you might do now, or null }.

import { WINDOWS } from '../world/arcs.js';

const f = (k) => (s) => !!s.flags[k];
const heard = (s, piece) => (s.rumors || []).some((r) => r.text.includes(piece));
const met = (id) => (s) => !!s.npcs[id]?.met;
const dead = (s, id) => s.npcs[id] && !s.npcs[id].alive;
const kills = (s, k) => (s.vars.kills?.[k] || 0) > 0;
const frags = (s) => (s.sys?.frags || []).length;
const visited = (s, id) => !!s.nodes[id]?.visited;
const STELES = ['stele_city', 'stele_ferry', 'stele_star', 'stele_break', 'stele_farewell'];
const steles = (s) => STELES.filter((id) => s.flags[`read_${id}`]).length;
const TALES = ['banxian_tale_nl', 'banxian_tale_xm', 'banxian_tale_by'];

export const GROUPS = ['主線', '人物', '東荒', '南嶺', '西漠', '北原'];

export const STORIES = [
  // ── 主線 ──
  {
    id: 'main', group: '主線', title: '命外之人',
    start: f('opening_done'),
    steps: [
      ['墜崖，在清虛觀醒來', f('opening_done')],
      ['引氣入體', (s) => s.player.realm >= 1],
      ['找到第一頁天機殘頁', (s) => frags(s) >= 1],
      ['系統想起了自己的名字', f('sys_awakened')],
      ['築基', (s) => s.player.realm >= 2],
      ['在白鶴渡渡江', f('chapter1_done')],
    ],
    end: (s) => (s.flags.chapter1_done ? '第一章「東荒」，完。' : null),
    next: (s) =>
      s.player.realm < 1 ? '閉關，攢夠修為，引氣入體。'
        : s.player.realm < 2 ? `修到築基。天機殘頁已找到 ${frags(s)}／9 頁，散在各地的遺跡裡。`
          : '到白鶴渡，渡江。',
  },
  // ── 人物 ──
  {
    id: 'lin', group: '人物', title: '林塵',
    start: (s) => met('lin_chen')(s) || heard(s, '被沈家當眾退婚'),
    steps: [
      ['被沈家當眾退婚', (s) => !!s.flags.lin_breakup_seen || heard(s, '被沈家當眾退婚')],
      ['族比上被打下擂台', (s) => !!s.flags.lin_test_seen || heard(s, '一掌打下擂台')],
      ['測出雷靈根，入青雲宗', (s) => heard(s, '雷靈根')],
      ['三年之約', (s) => !!s.flags.pact_seen || heard(s, '三年之約')],
      ['去了中州', (s) => heard(s, '林塵離開東荒')],
    ],
    end: (s) => (heard(s, '林塵離開東荒') ? '他走了，走進了他自己的故事。' : null),
    next: () => null,
  },
  {
    id: 'shen', group: '人物', title: '沈清歌',
    start: (s) => met('shen_qingge')(s),
    steps: [
      ['撕了婚書', (s) => !!s.flags.lin_breakup_seen || heard(s, '被沈家當眾退婚')],
      ['三年之約，敗了', (s) => !!s.flags.pact_seen || heard(s, '三年之約')],
      ['老槐樹下，說起那一天', f('shen_talked')],
      ['「我不做誰的墊腳石」', f('shen_own_path')],
      ['自己築了基', f('shen_zhuji')],
    ],
    end: (s) => (s.flags.shen_zhuji ? '她自己寫了自己的那一頁。' : s.flags.shen_talked && !s.flags.shen_own_path ? '她走了，沒有回頭。' : null),
    next: (s) => (!s.flags.shen_talked && s.day >= WINDOWS.pact[1] && !s.flags.lin_ruined ? '三年之約以後，她夜裡常到青石鎮的老槐樹下坐一坐。' : null),
  },
  {
    id: 'songhe', group: '人物', title: '松鶴道人',
    start: met('song_he'),
    steps: [
      ['傳你《長春功》', f('opening_done')],
      ['說起六十年前的那一次築基', f('songhe_story')],
      ['壽元將盡', (s) => !!(s.flags.songhe_dying || s.flags.songhe_saved || s.flags.songhe_dead)],
      ['吃了壽元果', f('songhe_saved')],
      ['再衝一次築基', (s) => !!(s.flags.songhe_zhuji || (s.flags.songhe_saved && s.flags.songhe_dead))],
    ],
    end: (s) => (s.flags.songhe_zhuji ? '六十年後，他終於築基了。' : s.flags.songhe_dead ? '他坐化了。觀裡的老松，落光了針葉。' : null),
    next: (s) =>
      s.flags.songhe_dying && !s.flags.songhe_saved ? '他的壽元快盡了。聽說世上有一種壽元果。'
        : !s.flags.songhe_story ? '常回清虛觀看看他。他年輕時的事，要交情深了才肯說。' : null,
  },
  {
    id: 'su', group: '人物', title: '蘇清瑤',
    start: met('su_qingyao'),
    steps: [
      ['坊市裡的白衣女修', met('su_qingyao')],
      ['古戰場的秘境', (s) => !!s.flags.su_ruins_met || heard(s, '帶出了一卷古經')],
      ['「血月」', f('blood_moon_warned')],
      ['臨別的茶', f('su_farewell')],
    ],
    end: (s) => (s.flags.su_left ? '她去了中州。' : null),
    next: () => null,
  },
  {
    id: 'hu', group: '人物', title: '胡三娘',
    start: met('hu_sanniang'),
    steps: [
      ['三百年前的獵戶', f('hu_story_hunter')],
      ['天上的縫', f('hu_story_crack')],
      ['偷雞的祖師', f('hu_story_founder')],
      ['青雲宗的人來獵狐', (s) => !!(s.flags.fox_protected || s.flags.fox_betrayed || s.flags.fox_fled)],
    ],
    end: (s) => (s.flags.fox_protected ? '你護住了她。' : s.flags.fox_betrayed ? '你把她賣了。' : s.flags.fox_fled ? '她走了，狐仙廟空了。' : null),
    next: (s) => (['hu_story_hunter', 'hu_story_crack', 'hu_story_founder'].some((k) => !s.flags[k]) ? '她講的三百年前的事，每回不一樣。' : null),
  },
  {
    id: 'wanger', group: '人物', title: '王二',
    start: met('wang_er'),
    steps: [
      ['成親', f('wanger_married')],
      ['當爹', (s) => heard(s, '取名王小石')],
      ['兒子也成親了', (s) => heard(s, '王二的背')],
      ['老了', (s) => !!s.flags.wanger_dying || dead(s, 'wang_er')],
    ],
    end: (s) => (dead(s, 'wang_er') ? '他過完了他的一生。' : null),
    next: () => null,
  },
  {
    id: 'sun', group: '人物', title: '孫掌櫃',
    start: f('sun_revealed'),
    steps: [
      ['他也是修士', f('sun_revealed')],
      ['三十年前的那一爐丹', f('sun_past')],
      ['鏡湖邊的墳', f('ge_letter_found')],
      ['師父的字條', f('sun_master_done')],
      ['出關', f('sun_out')],
    ],
    end: (s) => (s.flags.sun_out ? '三十年後，他又往前走了一步。' : null),
    next: (s) =>
      !s.flags.sun_past ? '他好像還有話沒說。（交情再深一點）'
        : !s.flags.ge_letter_found ? '到鏡湖邊的柳樹底下，替他給葛老上一炷香。'
          : !s.flags.sun_master_done ? '把葛老的字條交給孫掌櫃。'
            : !s.flags.sun_out ? '他在閉關。過幾個月再看。' : null,
  },
  {
    id: 'banxian', group: '人物', title: '錢半仙',
    start: met('qian_banxian'),
    steps: [
      ['看穿了白衣女修', f('banxian_secret')],
      ['〈南嶺除蠱〉', f('banxian_tale_nl')],
      ['〈沉沙古城〉', f('banxian_tale_xm')],
      ['〈寒鐵礦〉', f('banxian_tale_by')],
      ['他看見的那道劍光', f('banxian_past')],
    ],
    end: (s) => (s.flags.banxian_past ? '他說了五十年，第一次有人信。' : null),
    next: (s) =>
      TALES.filter((k) => s.flags[k]).length >= 2 ? '問問他：那段「劍仙斷天河」，是聽誰說的。'
        : '散場後，給他講講你在南嶺、西漠、北原的見聞。',
  },
  // ── 東荒 ──
  {
    id: 'chen', group: '東荒', title: '陳家的信',
    start: f('chen_met'),
    steps: [
      ['小石在門口望著北邊', f('chen_met')],
      ['寒鐵堡：問霍堡主', f('huo_chen')],
      ['雪嶺口下山的路邊', f('frozen_found')],
      ['把信送回陳家', f('chen_letter')],
    ],
    end: (s) => (s.flags.chen_letter ? '信送到了。' : null),
    next: (s) => (!s.flags.huo_chen ? '翻過雁回嶺，到北原的寒鐵堡問問。' : !s.flags.frozen_found ? '雪嶺口到寒鐵堡的路邊，留意。' : !s.flags.chen_letter ? '把信帶回鎮南田野的陳家。' : null),
  },
  {
    id: 'hermit', group: '東荒', title: '荒草裡的老散修',
    start: f('hermit_met'),
    steps: [
      ['三回築基', f('hermit_met')],
      ['聽他說完', f('hermit_told')],
      ['把外面的天下說給他聽', f('hermit_world')],
    ],
    end: (s) => (s.flags.hermit_world ? '他說，夠了。' : null),
    next: (s) => (!s.flags.hermit_told ? '再去聽他說說。' : !s.flags.hermit_world ? '築基以後，走遍南嶺、西漠、北原，回來說給他聽。' : null),
  },
  {
    id: 'home', group: '東荒', title: '山腹洞府',
    start: f('cave_found'),
    steps: [
      ['找到前人坐化的洞府', f('cave_found')],
      ['收拾成自己的', f('home_claimed')],
    ],
    end: (s) => (s.flags.home_claimed ? '這裡是你的洞府了。' : null),
    next: (s) => (!s.flags.home_claimed ? '走到石縫前查看，收拾一下。' : null),
  },
  {
    id: 'sect', group: '東荒', title: '青雲宗',
    start: (s) => !!(s.flags.sect_member || s.flags.recruit_declined),
    steps: [
      ['入門', f('sect_member')],
      ['宗門大比奪魁', f('tourney_champion')],
    ],
    end: (s) => (s.flags.recruit_declined && !s.flags.sect_member ? '你選了繼續做散修。' : null),
    next: () => null,
  },
  // ── 南嶺 ──
  {
    id: 'nl_well', group: '南嶺', title: '寨井發苦',
    start: (s) => !!(s.flags.well_seen || s.flags.gu_task),
    steps: [
      ['井裡的死蟲', (s) => !!(s.flags.well_seen || s.flags.gu_task)],
      ['阿蘿說：是蠱', f('luo_told')],
      ['萬蠱谷：除蠱母', (s) => kills(s, 'gu_mother')],
      ['燒了蠱巢', f('gu_nest_burned')],
      ['回寨子', f('gu_cleared')],
    ],
    end: (s) => (s.flags.gu_cleared ? '寨井的水，又甜了。' : null),
    next: (s) => (!s.flags.luo_told ? '問百藥鋪的阿蘿，井裡的蟲是什麼。' : !kills(s, 'gu_mother') ? '萬蠱谷深處，除了蠱母。' : !s.flags.gu_nest_burned ? '到谷底的蠱巢前，一把火燒乾淨。' : !s.flags.gu_cleared ? '回青竹寨，告訴岩伯。' : null),
  },
  {
    id: 'nl_shui', group: '南嶺', title: '阿水',
    start: f('a_shui_lost'),
    steps: [
      ['困在瘴林的白絲洞', f('a_shui_lost')],
      ['找到了', f('a_shui_found')],
      ['帶回寨子', f('a_shui_saved')],
    ],
    end: (s) => (s.flags.a_shui_saved ? '阿水回家了。' : null),
    next: (s) => (!s.flags.a_shui_found ? '瘴林南邊的白絲洞。記得帶避瘴丹。' : !s.flags.a_shui_saved ? '回寨子見阿山。' : null),
  },
  {
    id: 'nl_falls', group: '南嶺', title: '瀑布後面',
    start: f('falls_hint'),
    steps: [
      ['瀑布後面有光', f('falls_hint')],
      ['水簾洞', f('falls_cave_found')],
      ['讀完石壁', f('houtu_read')],
    ],
    end: (s) => (s.flags.houtu_read ? '你學會了《厚土訣》。' : null),
    next: (s) => (!s.flags.falls_cave_found ? '到碧潭的瀑布前看看。' : !s.flags.houtu_read ? '水簾洞的石壁上刻滿了字。' : null),
  },
  {
    id: 'nl_han', group: '南嶺', title: '韓三的包袱',
    start: (s) => !!(s.player.items.han_pack || s.flags.han_pack_returned),
    steps: [['把包袱還給韓三', f('han_pack_returned')]],
    end: (s) => (s.flags.han_pack_returned ? '包袱物歸原主。' : null),
    next: (s) => (!s.flags.han_pack_returned ? '韓三在嶺口的草棚裡。' : null),
  },
  // ── 西漠 ──
  {
    id: 'xm_kang', group: '西漠', title: '康家駝隊',
    start: f('kang_asked'),
    steps: [
      ['康駝頭的煩心事', f('kang_asked')],
      ['禿鷲寨', f('vulture_done')],
      ['回月泉', f('kang_paid')],
    ],
    end: (s) => (s.flags.kang_paid ? '駝隊又上路了。' : null),
    next: (s) => (!s.flags.vulture_done ? '黑戈壁北邊的禿鷲寨。' : !s.flags.kang_paid ? '回月泉告訴康駝頭。' : null),
  },
  {
    id: 'xm_temple', group: '西漠', title: '沙陀寺',
    start: f('shatuo_task'),
    steps: [
      ['了空的師父', f('shatuo_task')],
      ['夜裡的大殿：枯禪', (s) => kills(s, 'kuchan')],
      ['僧人們安息了', f('shatuo_rest')],
      ['告訴了空', f('liaokong_told')],
      ['藏經窟', f('dari_read')],
    ],
    end: (s) => (s.flags.liaokong_told && s.flags.dari_read ? '沙陀寺安靜了。' : null),
    next: (s) => (!kills(s, 'kuchan') ? '沙陀寺的大殿，夜裡去。陰屍怕火、怕符。' : !s.flags.shatuo_rest ? '回大殿再看一眼。' : !s.flags.liaokong_told ? '回月泉，老胡楊底下的了空。' : !s.flags.dari_read && s.flags.shatuo_key ? '千佛窟最裡頭的藏經窟。' : null),
  },
  {
    id: 'xm_city', group: '西漠', title: '接天城',
    start: (s) => visited(s, 'lost_city'),
    steps: [
      [(s) => `讀碑（${steles(s)}／5）`, (s) => steles(s) >= 5],
      ['星門開了', f('palace_open')],
      ['地宮', f('palace_seen')],
    ],
    end: (s) => (s.flags.palace_seen ? '你在地宮的星圖底下站過了。' : null),
    next: (s) => (steles(s) < 5 ? '古城裡還有沒讀過的石碑。' : !s.flags.palace_open ? '觀星台背後的星門，守門的石翁仲很強。' : !s.flags.palace_seen ? '走下星門的台階。' : null),
  },
  {
    id: 'xm_beacon', group: '西漠', title: '落日關的老秦',
    start: f('laoqin_promise'),
    steps: [['西風口的烽燧亮了', f('west_beacon_lit')]],
    end: (s) => (s.flags.west_beacon_lit ? '四十年後，東邊的烽燧亮了。' : null),
    next: (s) => (!s.flags.west_beacon_lit ? '到西風口的烽燧下，等天黑了，點一把火。' : null),
  },
  // ── 北原 ──
  {
    id: 'by_mine', group: '北原', title: '寒鐵礦',
    start: f('mine_asked'),
    steps: [
      ['深巷裡的歌聲', f('mine_deep_open')],
      ['冰蠶母', (s) => kills(s, 'silk_queen')],
      ['三個冰繭', f('cocoons_cut')],
      ['礦開了', f('mine_cleared')],
    ],
    end: (s) => (s.flags.mine_cleared ? '寒鐵堡又響起了鎬聲。' : null),
    next: (s) => (!s.flags.mine_deep_open ? '撬開深巷的木板。' : !kills(s, 'silk_queen') ? '深巷盡頭的冰蠶母。' : !s.flags.cocoons_cut ? '石頂上吊著的三個繭。' : !s.flags.mine_cleared ? '回堡主府見霍堡主。' : null),
  },
  {
    id: 'by_kun', group: '北原', title: '北冥有魚',
    start: f('bingsou_met'),
    steps: [
      ['冰叟等了一輩子', f('bingsou_met')],
      ['看見了冰底下的魚', f('kun_seen')],
      ['告訴冰叟', f('bingsou_told')],
    ],
    end: (s) => (s.flags.bingsou_told ? '他等到了。' : null),
    next: (s) => (!s.flags.kun_seen ? '北冥正中的冰心：夜裡去，或放出神識往下探。' : !s.flags.bingsou_told ? '回漁屋告訴冰叟。' : null),
  },
  {
    id: 'by_qilin', group: '北原', title: '靈脈裂谷的冰麟',
    start: f('hanyi_met'),
    steps: [
      ['石洞裡的寒衣', f('hanyi_met')],
      ['冰麟讓開了靈脈結', (s) => !!(s.flags.node_open || s.flags.qilin_fed || s.flags.qilin_slain || kills(s, 'ice_qilin'))],
      ['寒衣的傳授', f('hanyi_taught')],
    ],
    end: (s) => (s.flags.hanyi_taught ? (s.flags.qilin_fed ? '冰麟吃了雪蓮，讓開了路。' : '靈脈結開了。') : null),
    next: (s) => (!(s.flags.node_open || s.flags.qilin_fed || s.flags.qilin_slain || kills(s, 'ice_qilin')) ? `冰麟喜歡雪蓮（${s.player.items.xuelian || 0}／3）——或者，拔劍。` : !s.flags.hanyi_taught ? '回石洞見寒衣。' : null),
  },
  {
    id: 'by_alan', group: '北原', title: '阿蘭的阿爹',
    start: f('alan_asked'),
    steps: [
      ['三年前追白狼王去了', f('alan_asked')],
      ['冰原東邊的雪丘', (s) => !!(s.player.items.alan_knife || s.flags.alan_closure)],
      ['把獵刀還給阿蘭', f('alan_closure')],
    ],
    end: (s) => (s.flags.alan_closure ? '阿蘭把阿爹的狼皮裘給了你。' : null),
    next: (s) => (!(s.player.items.alan_knife || s.flags.alan_closure) ? '冰原東邊，白狼王出沒的一帶。小心。' : !s.flags.alan_closure ? '回白狼部，把獵刀還給阿蘭。' : null),
  },
];

/** The threads you are in, each with the steps you have reached, its close (or what might come next). */
export function storiesOf(s) {
  return STORIES.filter((t) => t.start(s)).map((t) => {
    const steps = t.steps.map(([label, done]) => ({ label: typeof label === 'function' ? label(s) : label, done: !!done(s) }));
    const end = t.end(s);
    const reached = steps.filter((x) => x.done);
    return { id: t.id, group: t.group, title: t.title, steps: reached, of: steps.length, end, next: end ? null : t.next(s), done: !!end };
  });
}
