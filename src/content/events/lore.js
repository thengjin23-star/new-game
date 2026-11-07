// 第一章完善 (0.25): what the stones of 東荒 remember — the sword tomb out on 古戰場 (who drew a sword
// the night the 天河 broke, and at what), the founding stone by 青雲宗's steps — and the people of
// 東荒 whose stories had only been begun: 孫掌櫃's master, under a willow by 鏡湖; 沈清歌, the night
// after the three years were up.

import { flag, has, alive, night } from '../helpers.js';
import { WINDOWS } from '../../world/arcs.js';

const awake = (s) => flag(s, 'sys_awakened');

export default [
  // ── 古戰場: the sword tomb ──
  {
    id: 'ruins_sword_tomb',
    trigger: 'explore',
    poi: 'sword_tomb',
    nodes: ['ancient_ruins'],
    once: true,
    title: '劍冢碑',
    text: (s) =>
      '斷劍林的盡頭，一塊半人高的黑石碑歪在土裡。碑前插著一圈鏽劍，劍尖都朝著碑，像一群跪著的人。\n\n碑文是用劍刻的，一筆一劃都帶著劍氣。三千年了，手指摸上去，還會被割破：\n\n「世人皆言吾師一劍斷天河。非也。\n是夜，天外有手，探入天河。吾師仰天一劍，斬其一指。指斷，河亦斷。\n吾師劍折，人不知所終。\n弟子收師斷劍，插於黑石，立碑於此，以待後來者。\n——不肖弟子 謹書」' +
      (has(s, 'broken_sword') ? '\n\n懷裡的古劍殘片，輕輕地震了一下。' : ''),
    choices: [
      {
        text: '對著石碑拜三拜，把碑文一字一字記下來。',
        out: {
          text: (s) =>
            awake(s)
              ? '你拜完，站起來的時候，腦子裡的聲音很久沒有說話。\n\n「……那一夜，」玄微說，「我只看見了那隻手。原來，還有人拔了劍。」'
              : '叮——檢測到熟悉的劍意。\n\n叮——……本系統的資料庫裡，有一頁，被這樣的劍氣削去過。',
          effects: [['flag', 'sword_stele_read'], ['insight', 2], ['sysexp', 12], ['mind', 2], ['log', '在古戰場讀了劍冢碑']],
        },
      },
      {
        text: '把古劍殘片拿出來，對著石碑。',
        show: (s) => has(s, 'broken_sword'),
        out: {
          text: '殘片上的寒光一下子亮了，又一下子暗下去，像一個人看見了家，又想起家裡已經沒有人了。\n\n你在碑前站了很久，把碑文記了下來。殘片握在手裡，比從前暖了一點。',
          effects: [['flag', 'sword_stele_read'], ['insight', 2], ['sysexp', 15], ['mind', 3], ['log', '在古戰場讀了劍冢碑，古劍殘片有了一絲暖意']],
        },
      },
    ],
  },

  // ── 青雲宗: the founding stone by the steps ──
  {
    id: 'sect_founding_stele',
    trigger: 'explore',
    poi: 'sect_stele',
    nodes: ['qingyun_sect'],
    once: true,
    title: '開山碑',
    text: '石階旁立著一塊青石碑，碑頂長滿了青苔。上山下山的弟子從它旁邊走過，沒有人多看一眼。\n\n「青雲宗。\n天元二千七百六十三年，祖師青雲子開山於此。\n祖師本東荒散修，壯年遠遊北原，見斷柱之上，天門緊閉。歸而歎曰：『天門既閉，不如教人好好活著。』乃擇此峰，收徒傳道。」\n\n碑的背面，還有一行小字，刻得歪歪扭扭，像是誰偷偷加上去的：「祖師少時家貧，嘗盜狐仙廟供雞。」',
    choices: [
      {
        text: '把碑文讀完。',
        out: {
          text: (s) =>
            flag(s, 'hu_story_founder')
              ? '你想起胡三娘說的話，忍不住笑出了聲。守山的弟子瞪了你一眼。\n\n原來是真的。'
              : '二百五十年前的事了。天門緊閉——你想起了在別處聽過的，關於天門的話。',
          effects: [['flag', 'sect_stele_read'], ['insight', 1], ['sysexp', 6]],
        },
      },
    ],
  },

  // ── 鏡湖: 孫掌櫃's master, under the willow ──
  {
    id: 'lake_ge_grave',
    trigger: 'explore',
    poi: 'ge_grave',
    nodes: ['mirror_lake'],
    cond: (s) => flag(s, 'sun_past') && !flag(s, 'ge_letter_found'),
    title: '葛老的墳',
    text: '柳樹長得很高了，垂下來的枝條快碰到水面。樹底下一座小土墳，墳上的草比膝蓋還深。木牌上的字快看不清了：「丹師葛雲山之墓」。\n\n你拔了草，點上香。香燒到一半，你發現木牌底下的土裡，露出一角生鏽的鐵盒。',
    choices: [
      {
        text: '打開鐵盒。',
        out: {
          text: '盒子裡是一張油紙，油紙裡包著一張字條。字跡潦草，像是在很急的時候寫的：\n\n「長春：\n丹不成，非你之過。是為師貪心，多放了一味赤焰花，想讓丹性烈一些，好讓你一次就築成。\n爐要炸了，我跑不掉，也不想跑。\n你天資不差，別因為我，就不修了。\n——師 字」\n\n原來孫掌櫃的名字，叫孫長春。',
          effects: [['item', 'ge_letter', 1], ['flag', 'ge_letter_found'], ['mind', 3], ['log', '在鏡湖邊葛老的墳前，找到一張三十年前的字條']],
        },
      },
      {
        text: '不打擾他了。把鐵盒埋回去。',
        out: { text: '你把土蓋回去，又拜了三拜。湖上起了風，柳枝在你肩上拍了兩下。' },
      },
    ],
  },

  // ── 沈清歌, the nights after the three years were up ──
  {
    id: 'town_shen_night',
    trigger: 'explore',
    poi: 'old_locust',
    nodes: ['qingshi_town'],
    auto: true,
    once: true,
    cond: (s) => s.day >= WINDOWS.pact[1] && !flag(s, 'lin_ruined') && alive(s, 'shen_qingge') && night(s),
    title: '老槐樹下',
    text: (s) =>
      '夜深了。老槐樹下坐著一個人，抱著膝，背靠著樹幹——是沈清歌。\n\n三年之約以後，鎮上的人背地裡都叫她「那個退婚的」。白天她不出門，只有夜裡，才到這棵樹下坐一坐。\n\n她看見你，沒有走。過了很久，她開口了：\n\n「婚書是我自己撕的。我爹要我嫁，林家要我等。我不想等一個廢人等一輩子——我想修仙，就這麼簡單。」\n\n「那句『你如今，配不上我』，也是我自己想的。與其讓他來退，不如我先撕，撕得難看一點。他會恨我。恨，總比被人可憐好。」\n\n她笑了一下：「後來他成了天才，全鎮的人都說我活該。你說，要是那天我沒撕，他還會變成天才嗎？」' +
      (s.sys?.bound && s.sys.lv >= 3 ? '\n\n叮——檢測到命簿標記：「退婚者」。此人在命簿中的位置，是讓另一個人站起來的那一級台階。' : ''),
    choices: [
      {
        text: '「會的。你撕的是婚書，不是他的命。」',
        out: {
          text: '「命？」她愣了一下，「說得好像真有人把命寫好了似的。」\n\n她站起來，拍了拍裙子上的土：「青雲宗的長老說，外門弟子三年之內築不了基，就得下山。我還有一年。」\n\n她走了兩步，又回頭：「我不做誰的墊腳石。」',
          effects: [['meet', 'shen_qingge'], ['flag', 'shen_talked'], ['flag', 'shen_own_path'], ['favor', 'shen_qingge', 10], ['mind', 3]],
        },
      },
      {
        text: '「有人把命寫好了。你只是被寫成了退婚的那個人。」',
        show: (s) => !!s.sys?.bound && s.sys.lv >= 3,
        out: {
          text: '她看著你，像看一個瘋子。看了很久，她問：「那你呢？你被寫成了什麼？」\n\n你答不上來。\n\n「沒寫你？」她忽然笑出了聲，笑得眼淚都出來了，「那真好。真好。」\n\n她擦了擦眼睛，站起來：「那我就自己寫。」',
          effects: [['meet', 'shen_qingge'], ['flag', 'shen_talked'], ['flag', 'shen_own_path'], ['flag', 'shen_knows'], ['favor', 'shen_qingge', 15], ['insight', 1], ['sysexp', 8]],
        },
      },
      {
        text: '「是你自己選的。」',
        out: {
          text: '「對，」她說，「是我自己選的。」\n\n她站起來，走了，沒有回頭。',
          effects: [['meet', 'shen_qingge'], ['flag', 'shen_talked'], ['favor', 'shen_qingge', -5]],
        },
      },
    ],
  },
];
