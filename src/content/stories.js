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
/** (1.3) where you were that night, as the story has it */
const NIGHT_WHERE = {
  qingshi: '守在青石鎮', qingxu: '守在清虛觀', fox: '守在狐仙廟', luoxia: '守在落霞坊市', ferry: '守在白鶴渡',
  peak: '在天衍城，闖玉指峰', away: '在遠處，看著天', slept: '睡過去了', secl: '在閉關，坐過去了', east: '在東荒的野地裡',
};

export const GROUPS = ['主線', '人物', '東荒', '南嶺', '西漠', '北原', '中州'];

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
  // (1.0) 第二章: the first act, 「渡江」
  {
    id: 'main2', group: '主線', title: '中州',
    start: (s) => !!s.flags.zhongzhou_crossed || !!s.flags.chapter1_done,
    steps: [
      ['在鶴歸渡上岸', f('zhongzhou_crossed')],
      ['進了臨江城', (s) => visited(s, 'linjiang')],
      ['擂台上，查無此人', f('bang_beaten')],
      ['天驕榜的第一百零一名', f('bang_blank')],
      // (1.2) 第三幕「天衍城」
      ['到了天衍城，看見玉指峰', f('ty_arrived')],
      ['欽天監的抄本閣：東荒那一頁', f('ty_book_seen')],
      ['為那一夜，寫下名冊', (s) => Object.keys(s.vars.roster || {}).length > 0],
    ],
    end: (s) => (s.flags.ty_truth && Object.keys(s.vars.roster || {}).length ? '天元三千零二十二年七月十五，欽天監要撕掉東荒那一頁。你知道了，也做了準備。' : null),
    next: (s) =>
      !s.flags.zhongzhou_crossed ? '到白鶴渡，坐老船夫的船過江。'
        : !visited(s, 'linjiang') ? '鶴歸渡往東北，是臨江城。'
          : !s.flags.bang_beaten ? '榜樓前的擂台上，榜上的人誰來挑戰都得接。'
            : !s.flags.ty_arrived ? '官道關往東三天，是天衍城：關上要令牌。臨江城的城主府旁邊，也有傳送陣。'
              : !s.flags.ty_book_seen ? '天驕榜是從哪裡抄出來的？答案在欽天監的抄本閣裡。'
                : '見聞裡的名冊：東荒的人，誰撤，誰躲，託給誰。',
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
      // (1.1) over the river
      ['上官家的客卿', f('lin_zz_met')],
      ['「別喝謝家的東西」', f('lin_warned')],
      ['天劍宗山門外的生死約戰', f('duel_done')],
    ],
    end: (s) =>
      s.flags.lin_dead ? '他死在天劍宗山門外的台上。'
        : s.vars.duel === 'draw' ? '第一戰，平。他說，下一回在劍池邊上打。'
          : s.vars.duel === 'ye' ? '第一戰，他輸了。葉孤寒沒有殺他。'
            : null,
    next: (s) =>
      !s.flags.lin_zz ? null
        : !s.flags.zhongzhou_crossed ? '他在中州，上官家請他當了客卿。'
          : !s.flags.lin_zz_met ? '上官商棧後頭的空地上，常有人在練劍。'
            : s.flags.duel_notice && !s.flags.lin_warned ? '九月十五，謝家牽頭的那一場。他不知道那杯茶裡有什麼。' : null,
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
      // (1.1) 沈家 eaten by 謝家; a letter for 林塵
      ['沈家敗落', f('shen_fall')],
      ['託你帶過江的信', f('shen_letter_offered')],
      ['信送到了', f('shen_letter_given')],
    ],
    end: (s) =>
      s.flags.shen_letter_given && s.flags.lin_warned ? '那封信，沒有遲。'
        : s.flags.shen_letter_late ? '那封信，遲了三年。'
          : s.flags.shen_zhuji && !s.flags.shen_fall ? '她自己寫了自己的那一頁。'
            : s.flags.shen_talked && !s.flags.shen_own_path && !s.flags.shen_fall ? '她走了，沒有回頭。' : null,
    next: (s) =>
      s.flags.shen_fall && !s.flags.shen_letter_offered && !s.flags.duel_done ? '沈家敗落了。她有話，要託人帶過江。'
        : s.player.items.shen_letter > 0 ? '把信交給中州上官商棧的林塵。'
          : !s.flags.shen_talked && s.day >= WINDOWS.pact[1] && !s.flags.lin_ruined ? '三年之約以後，她夜裡常到青石鎮的老槐樹下坐一坐。' : null,
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
      // (1.0) and on, in 中州
      ['臨江城的榜樓', f('su_zz_met')],
      ['茶樓二樓：她在查那一夜是誰下的筆', f('su_zz_ally')],
      ['「然後，東荒就沒有了」', f('su_told_night')],
      // (1.2) she found it
      ['一塊腰牌：「我查到了」', f('su_token')],
      ['抄本閣：她那一行的兩段字跡', f('su_archive')],
    ],
    end: (s) => (dead(s, 'su_qingyao') ? '她沒有活過這一世。' : null),
    next: (s) =>
      !s.flags.su_left ? null
        : !s.flags.zhongzhou_crossed ? '她去了中州。'
          : !s.flags.su_zz_met ? '她在中州。臨江城的榜樓下，也許找得到她。'
            : s.flags.su_token && !s.flags.su_archive ? '天衍城，欽天監，星官署。'
              : s.flags.su_archive ? '那一夜，她在觀星台上。' : null,
  },
  // (1.2) 欽天監's 監正
  {
    id: 'wei', group: '人物', title: '衛長庚',
    start: met('wei_changgeng'),
    steps: [
      ['欽天監監正', met('wei_changgeng')],
      ['「撕掉一頁，救一本書」', f('wei_met')],
      ['「找到了，告訴我」', f('wei_hand')],
    ],
    end: () => null,
    next: () => '那一夜，他在玉指峰頂下筆。',
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
      // (1.0) a letter across the river
      ['過江的信：豆花管夠', f('wanger_letter1')],
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
      // (1.1) his master's sister writes from 百草谷
      ['師門的信', f('sun_to_baicao')],
    ],
    end: (s) => (s.flags.sun_to_baicao ? '三十年後，他又往前走了一步。再過幾年，他要自己關了回春堂，去中州的百草谷。' : null),
    next: (s) =>
      !s.flags.sun_past ? '他好像還有話沒說。（交情再深一點）'
        : !s.flags.ge_letter_found ? '到鏡湖邊的柳樹底下，替他給葛老上一炷香。'
          : !s.flags.sun_master_done ? '把葛老的字條交給孫掌櫃。'
            : !s.flags.sun_out ? '他在閉關。過幾個月再看。'
            : s.player.items.ge_invite > 0 ? '把葛雲蘅的信交給他。' : '他的師父葛老，是從中州來的。《葛氏丹經》，也許有人認得。',
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
  // ── 中州 (1.0) ──
  {
    id: 'zz_star', group: '中州', title: '舊觀星台',
    start: (s) => visited(s, 'guanxing'),
    steps: [
      ['荒山上的石台', (s) => visited(s, 'guanxing')],
      ['斷碑：被鑿掉的名字', f('gx_stele_read')],
      ['守台石獸', f('gx_guard_down')],
      ['殘頁・星', f('gx_page')],
    ],
    end: (s) => (s.flags.gx_page ? '他教他們看星。他們學會了看命簿。' : null),
    next: (s) => (!s.flags.gx_guard_down ? '夜裡再上石台。台邊的石獸，夜裡才醒。' : '夜裡，星光照得進石縫的時候。'),
  },
  {
    id: 'zz_tales', group: '中州', title: '兩個說書人',
    start: (s) => !!(s.flags.zz_tale_stele || s.flags.zz_tale_banxian),
    steps: [
      ['臨江城的說書人：弟子逼死了師父', (s) => !!(s.flags.zz_tale_stele || s.flags.zz_tale_banxian)],
      ['錢半仙的版本：一劍斷天河', f('zz_tale_banxian')],
      ['劍冢碑：斬其一指', f('zz_tale_stele')],
    ],
    end: (s) => (s.flags.two_tales ? '兩邊的書對起來，真的那一半，刻在古戰場的石頭上。' : null),
    next: (s) => (!s.flags.zz_tale_stele ? (s.flags.sword_stele_read ? '把劍冢碑的碑文，念給臨江城的說書人聽。' : '古戰場的斷劍林盡頭，有一塊碑。') : '跟他說說東荒的錢半仙。'),
  },
  {
    id: 'zz_sword', group: '中州', title: '天劍宗',
    start: (s) => visited(s, 'tianjian'),
    steps: [
      ['三千級劍階', (s) => visited(s, 'tianjian')],
      ['門規碑：指在一日，劍不入鞘', f('tj_motto_read')],
      ['山門外的葉孤寒', f('ye_zz_met')],
      ['「改天，我帶你上去看一樣東西」', f('ye_promise')],
      // (1.1) up the steps
      ['掛名的客卿', f('tianjian_guest')],
      ['祖師堂：指，是那根手指', f('tj_ancestors_seen')],
      ['劍池：斷天', f('duantian_forged')],
    ],
    end: (s) => (s.flags.duantian_forged ? '古劍接回來了。孤峰上的那一劍，你也學會了。' : null),
    next: (s) =>
      !s.flags.tj_motto_read ? '看看山門邊的門規碑。'
        : !s.flags.ye_zz_met ? '山門外，常有個背劍的年輕人。'
          : !s.flags.tianjian_guest ? (s.flags.ye_promise && !(s.flags.sword_stele_read && s.player.items.broken_sword > 0) ? '他要帶你上去看的東西，和古戰場的劍冢碑、那截古劍殘片有關。' : s.flags.ye_promise ? '帶著古劍殘片，去山門外找葉孤寒。' : '金丹以後，過了守門師兄的劍，可以掛名做客卿。')
            : !s.flags.tj_ancestors_seen ? '祖師堂不見外人，除非有人帶著師祖的劍來。'
              : s.player.items.broken_sword > 0 ? '把古劍殘片帶到劍池。' : null,
  },
  {
    id: 'zz_vein', group: '中州', title: '龍脊嶺之爭',
    start: (s) => !!(s.flags.lg_job_sg || s.flags.lg_job_xie || s.flags.lg_side || s.flags.sg_longji),
    steps: [
      ['兩家爭一條靈脈', (s) => !!(s.flags.sg_longji || s.flags.lg_job_sg || s.flags.lg_job_xie)],
      ['上官瑾的請託', f('lg_job_sg')],
      ['謝玄朗的四百靈石', f('lg_job_xie')],
      ['礦底的靈眼', (s) => !!(s.flags.lg_clear_sg || s.flags.lg_clear_xie || s.flags.lg_took_marrow || s.flags.lg_side)],
      ['出關的謝家老祖', f('xie_ancestor_beaten')],
    ],
    end: (s) =>
      ({
        shangguan: '官司上官家贏了。上官家的樓船，欠你一回。',
        xie: '你替謝家把上官家的人趕下了山。',
        self: '靈髓在你懷裡。兩家誰也沒拿到。',
        both: s.flags.lg_both_found ? '兩家對了帳，才知道請的是同一個人。' : '兩邊都以為你是自己人。',
        none: '兩邊都看穿了你。',
        xie_default: '沒有人插手，官司判給了謝家。',
      })[s.flags.lg_side] || null,
    next: (s) => (s.flags.lg_clear_sg ? '回上官商棧，告訴上官瑾。' : s.flags.lg_clear_xie ? '去找謝玄朗領賞。' : '龍脊嶺的礦口，封條撕開過。'),
  },
  {
    id: 'zz_baicao', group: '中州', title: '百草谷',
    start: met('ge_yunheng'),
    steps: [
      ['百草谷的谷主', met('ge_yunheng')],
      ['她的哥哥', (s) => !!(s.flags.ge_asked || s.flags.ge_book_known)],
      ['《葛氏丹經》回到了百草谷', f('ge_book_known')],
      ['捎給孫長春的信', f('sun_to_baicao')],
    ],
    end: (s) => (s.flags.sun_to_baicao ? '回春堂的門，他打算自己關。' : null),
    next: (s) =>
      !s.flags.ge_book_known ? (s.player.items.ge_danjing > 0 ? '把《葛氏丹經》給她看。' : '她哥哥的丹經，在東荒回春堂的孫掌櫃那裡。')
        : s.player.items.ge_invite > 0 ? '把信交給東荒回春堂的孫掌櫃。' : null,
  },
  // (1.2) 天衍城
  {
    id: 'zz_capital', group: '中州', title: '天衍城',
    start: f('ty_arrived'),
    steps: [
      ['第一眼看見玉指峰', f('ty_arrived')],
      ['上了御階', (s) => visited(s, 'huangcheng')],
      ['欽天監的抄本閣', f('ty_book_seen')],
      ['玉指峰為什麼封山', f('yz_ink_known')],
      ['親眼看見峰裡滲出來的墨', f('yz_ink_seen')],
      ['墨沾不上你的手', f('yz_ink_touched')],
    ],
    end: (s) => (s.flags.yz_ink_touched ? '朱筆劃不到你，墨也沾不上你。' : null),
    next: (s) =>
      !visited(s, 'huangcheng') ? '御階在外城的北門外。禁軍只認腰牌——或者夜裡的黑。'
        : !s.flags.ty_book_seen ? '欽天監的抄本閣，三把鎖。'
          : !s.flags.yz_ink_seen ? '峰背的柏樹林，夜裡有星衛提著罐子；峰頂只有飛得上去。' : '峰頂的墨池。',
  },
  {
    id: 'zz_tomb', group: '中州', title: '大衍皇陵',
    start: (s) => visited(s, 'huangling'),
    steps: [
      ['神道上的石人', (s) => visited(s, 'huangling')],
      ['陵門前的贔屭', f('hl_open')],
      ['梓宮上的半張紙', f('hl_seen')],
      ['壁畫上少了一根指頭的手', f('hl_mural_seen')],
    ],
    end: (s) => (s.flags.hl_seen ? '開國皇帝是玄微的學生。他用玉指峰的墨，給自己寫了一行字。' : null),
    next: (s) => (!s.flags.hl_open ? '陵門口的石龜，三千年沒讓人過去。' : '走下九十九級台階。'),
  },
  {
    id: 'zz_roster', group: '中州', title: '血月名冊',
    start: f('ty_roster'),
    steps: [
      ['一張東荒的名單', f('ty_roster')],
      ['上官家的樓船', f('roster_boat')],
      ['林塵回青石鎮', f('roster_lin')],
      ['天劍宗的人過江', f('roster_tj')],
      ['鬼市的散修過江', f('roster_xiao')],
      ['狐仙廟護著三個人', f('roster_fox')],
      ['葉孤寒上觀星台', f('roster_ye_star')],
      ['七月十三，樓船過江', f('night_boat')],
    ],
    end: (s) => (s.flags.blood_night_done ? '名冊上寫的，見分曉了。' : null),
    next: (s) => (Object.keys(s.vars.roster || {}).length ? '名冊上寫的，那一夜見分曉。' : '見聞裡的名冊：一個一個寫上去。'),
  },
  // (1.3) the night itself
  {
    id: 'zz_bloodnight', group: '中州', title: '血月那一夜',
    start: (s) => !!s.vars.night,
    steps: [
      ['月亮紅了，天上的書攤開了', (s) => !!s.vars.night],
      [(s) => NIGHT_WHERE[s.vars.night?.place] || '那一夜', (s) => !!s.vars.night],
      ['站進紅圈，擋下一筆', (s) => (s.vars.night?.blocked || 0) > 0],
      ['斷天，斬斷一筆', (s) => (s.vars.night?.cut || 0) > 0],
      ['墨滿：命簿開始寫你的名字', f('night_ink_full')],
      ['闖上玉指峰頂，朱筆停了', f('night_summit')],
      ['子時：殘頁・月', (s) => (s.sys?.frags || []).includes('frag_moon')],
      ['天亮', f('blood_night_done')],
    ],
    end: (s) => {
      const n = s.vars.night;
      if (!n?.done || !n.fates) return null;
      const lost = Object.entries(n.fates).filter(([id, F]) => !id.startsWith('helper:') && F.fate === 'dead').length;
      return `東荒的紙上落了${n.total}筆。${lost ? `名冊上，${lost}個人沒有熬過去。` : '名冊上的人，都熬過去了。'}`;
    },
    next: (s) => (s.vars.night && !s.vars.night.done ? '天亮以前，那一夜還沒有完。' : null),
  },
  {
    id: 'zz_xiaoqi', group: '中州', title: '鬼市的蕭七',
    start: met('xiao_qi'),
    steps: [
      ['在中州當散修的三條規矩', f('xiaoqi_met')],
      ['那條胳膊', f('xiaoqi_arm')],
    ],
    end: (s) => (s.flags.xiaoqi_arm ? '他換回一顆金丹；那個人換回一條狗。' : null),
    next: (s) => (!s.flags.xiaoqi_arm ? '交情再深一點，他也許會說那條胳膊是怎麼沒的。' : null),
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
