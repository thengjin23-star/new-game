// 北原 (0.23): north of 東荒, over 雁回嶺. What the north itself does to you —
// the cold that gets into your bones out on the snow, a blizzard, the thin
// ice of 北冥, the snow brought down off the slopes of 雪山; 寒鐵堡 and the
// thing that sings in the deepest gallery of its mine; 冰叟 at his hole in
// the ice of 北冥, and what sleeps under it; 寒衣 in the rift, and the 冰麟
// on the knot of the veins (a flower, or a sword); 阿蘭 of 白狼部 and her
// father, who went after the 白狼王; the gate on the broken pillar of 不周山,
// and the page under its threshold; a dead man's letter for 東荒.
import { has, flag, favor, mpNow, variant, night } from '../helpers.js';
import { weatherNow, hoursToClear } from '../../world/weather.js';
import { FRAGMENTS } from '../fragments.js';

/** Out in the open, where the cold gets at you (world/explore.js exposure: not in the fort, the mine, the camp or the rift). */
const OPEN = ['xueling_kou', 'beiming', 'bingyuan', 'duanyun_cliffs', 'xueshan', 'tianjing_peak', 'buzhou', 'beiyuan_wilds'];
/** The thin places on 北冥's ice (world/maps/beiyuan.js THIN_ICE). */
const THIN = ['ti_a', 'ti_b', 'ti_c', 'ti_d', 'ti_e', 'ti_f'];
const FORT = ['hantie_fort'];
const MINE = ['iron_mine'];
const SEA = ['beiming'];
const CAMP = ['bailang_camp'];
const RIFT = ['lingmai_rift', 'lingmai_node'];
/** A body art you have (輕身術, 踏雲步). */
const knows = (s, art) => (s.player.arts || []).includes(art);
/** Killed (by your hand; it does not come back). */
const killed = (s, kind) => (s.vars.kills?.[kind] || 0) > 0;
/** The system has woken and remembers its name (content/events/chapter.js sys_awaken): it speaks as 玄微. */
const awake = (s) => flag(s, 'sys_awakened');

export default [
  // ── the cold ──
  {
    id: 'by_cold',
    trigger: 'sky',
    nodes: OPEN,
    cooldown: 1,
    cond: (s) => !weatherNow(s).blizzard,
    title: '嚴寒',
    text: (s) =>
      variant(s, [
        '你的手指頭先是疼，後來就不疼了——不疼，是因為已經沒有知覺了。眉毛和睫毛上結了一層白霜，呼出去的氣，落下來就是冰碴子。\n\n再這麼走下去，你會凍死在這裡。',
        '寒氣從腳底板往上爬，爬過膝蓋，爬過腰，一直爬進了心口。你的牙齒格格地打架，停都停不下來。\n\n你忽然很想坐下來，歇一會兒——你知道，在雪地裡坐下來的人，就再也站不起來了。',
        '風一吹，你身上那點熱氣就被刮得乾乾淨淨。你的腳已經凍得像兩塊木頭，每走一步，都不知道踩在了哪裡。\n\n得想個辦法了。',
      ]),
    choices: [
      {
        text: '灌一口燒刀子。',
        show: (s) => has(s, 'shaodaozi'),
        out: { text: '酒一下肚，就像吞下了一團火，從喉嚨一路燒到肚子裡。你打了個哆嗦，臉上熱了，手指頭也一點一點地疼回來了。', effects: [['item', 'shaodaozi', -1], ['hp', 0.05], ['shade']] },
      },
      {
        text: '服一顆暖身丹。',
        show: (s) => has(s, 'nuanshen_pill'),
        out: { text: '丹藥一下肚，丹田裡就燒起一團火，熱氣順著經脈一直走到手指頭、腳趾頭。你身上冒起了白氣。', effects: [['item', 'nuanshen_pill', -1], ['buff', 'nuanshen', 3], ['shade']] },
      },
      {
        text: '運起靈力，把寒氣逼出去。',
        show: (s) => s.player.realm >= 1,
        need: (s) => (mpNow(s) >= 20 ? null : '靈力不足（需 20）'),
        out: { text: '你一邊走，一邊運轉周天，靈力在經脈裡轉了一圈又一圈，把鑽進骨頭裡的寒氣一絲一絲地逼了出來。丹田空了一大截，身上總算暖了。', effects: [['mp', -20], ['shade']] },
      },
      {
        text: '找塊背風的大石頭，蜷著等身子緩過來。',
        out: {
          text: '你在一塊大石頭的背風處蹲下來，把自己縮成一團，搓手、跺腳、往手心裡呵氣。過了很久，身上總算有了一點熱氣。',
          effects: [['hours', 2], ['wound', 0.05], ['shade', 0.6]],
        },
      },
      {
        text: '咬著牙接著走。',
        check: { kind: 'gengu', diff: 7 },
        ok: { text: '你把衣領豎起來，一步一步往前挪。不知道走了多久，腳底下終於又有了知覺——疼得鑽心。疼，是好事。', effects: [['shade', 0.5]] },
        fail: {
          text: '走著走著，你覺得不冷了，反倒有點暖和，暖和得讓人想睡……\n\n你是被凍醒的。不知道在雪地裡躺了多久，半邊身子埋在雪裡，手腳僵得像別人的。',
          effects: [['wound', 0.35], ['hours', 3], ['hurt', 1, '凍死在北原的雪地裡'], ['shade']],
        },
      },
    ],
  },

  // ── a blizzard ──
  {
    id: 'by_blizzard',
    trigger: 'sky',
    nodes: OPEN,
    cooldown: 1,
    cond: (s) => !!weatherNow(s).blizzard,
    title: '暴風雪',
    text: (s) =>
      variant(s, [
        '風一下子大了起來，雪不是往下落，是橫著飛，打在臉上像刀子割。天地之間只剩下一片白，你連自己的腳都快看不見了。\n\n暴風雪。',
        '北邊的天先是灰了，然後黑了，一堵白牆從雪山上壓下來。轉眼之間，風雪就吞沒了一切。\n\n暴風雪。',
      ]),
    choices: [
      {
        text: '挖個雪洞鑽進去，等它過去。',
        out: {
          text: '你用手、用劍，在一道雪坡底下刨出一個洞，鑽了進去，再用雪把洞口堵上一半。外頭的風吼了不知多久；洞裡黑沉沉的，倒是比外頭暖和。',
          effects: (s) => [['hours', Math.max(1, hoursToClear(s))], ['wound', 0.08], ['shade']],
        },
      },
      {
        text: '放出神識，摸著方向走。',
        show: (s) => s.player.realm >= 1,
        need: (s) => (mpNow(s) >= 15 ? null : '靈力不足（需 15）'),
        out: { text: '你閉上眼，神識鋪了出去。風雪裡，雪坡的起伏、腳下的冰、遠處的一塊大石頭，一一浮現出來。你就這麼閉著眼，一步一步走了出去。', effects: [['mp', -15], ['shade', 0.5]] },
      },
      {
        text: '頂著風雪往前闖。',
        check: { kind: 'gengu', diff: 8 },
        ok: { text: '你低著頭，一步一步頂著風走。雪灌進領口、袖口、靴子裡。等風小下來，你回頭看，自己的腳印早就被雪填平了。', effects: [['wound', 0.06], ['shade', 0.5]] },
        fail: {
          text: '一陣風把你掀翻在雪地上。你爬起來，又被掀翻。等風雪過去，你已經不知道自己在哪裡了：渾身凍得發紫，手腳都不聽使喚。',
          effects: [['wound', 0.3], ['hours', 4], ['hurt', 1, '埋在了北原的暴風雪裡'], ['shade']],
        },
      },
    ],
  },

  // ── the thin ice of 北冥 ──
  {
    id: 'by_thin_ice',
    trigger: 'explore',
    poi: THIN,
    auto: true,
    nodes: ['beiming'],
    title: '薄冰',
    text: (s) =>
      variant(s, [
        '腳下「咔」的一聲。你低頭一看，冰面上裂開了一道白線，正一點一點地往你腳下爬。\n\n這裡的冰，是薄的。',
        '冰面的顏色不對：黑沉沉的，看得見底下的水在動。你剛想退，腳下的冰已經往下一沉——',
      ]),
    choices: [
      {
        text: '提氣，點冰而過。',
        show: (s) => knows(s, 'qingshen') || knows(s, 'tayun'),
        need: (s) => (mpNow(s) >= 10 ? null : '靈力不足（需 10）'),
        out: { text: '你一口氣提上來，腳尖在冰面上連點幾下。身後的冰一塊一塊地塌進了水裡；你落在了厚冰上，連鞋底都沒濕。', effects: [['mp', -10]] },
      },
      {
        text: '趴下來，一點一點挪回厚冰上。',
        check: { kind: 'wuxing', diff: 6 },
        ok: { text: '你慢慢地趴下，把身子攤平，一寸一寸地往後挪。冰在你身下嘎吱嘎吱地響，響了半個時辰，你總算摸到了白色的厚冰。', effects: [['hours', 1]] },
        fail: {
          text: '你剛趴下，冰面就在你身下碎了。水冷得像刀子，一下子扎進了骨頭裡，你連喊都喊不出來……\n\n你不知道自己是怎麼爬上來的。爬上來的時候，衣服已經凍成了一層硬殼。',
          effects: [['wound', 0.3], ['hours', 2], ['hurt', 1, '掉進了北冥的冰窟窿']],
        },
      },
      {
        text: '拔腿就跑。',
        check: { kind: 'gengu', diff: 7 },
        ok: { text: '你拔腿就跑。冰在你身後一路碎過來，「咔、咔、咔」，像追著你咬。你撲到厚冰上，回頭一看，身後是一條黑沉沉的水路。', effects: [['wound', 0.03]] },
        fail: {
          text: '跑了沒兩步，腳下一空——你整個人掉進了冰窟窿裡。水冷得讓你的心都停了一下。\n\n你扒著冰沿，爬了三次，才爬上來。',
          effects: [['wound', 0.25], ['hours', 2], ['hurt', 1, '掉進了北冥的冰窟窿']],
        },
      },
    ],
  },

  // ── the snow off the slopes of 雪山 ──
  {
    id: 'by_avalanche',
    trigger: 'explore',
    nodes: ['xueshan', 'duanyun_cliffs'],
    cooldown: 2,
    title: '雪崩',
    text: (s) =>
      variant(s, [
        '頭頂上傳來一聲悶響，像有人在很遠的地方擂了一下鼓。你抬起頭——整片雪坡，正在往下滑。\n\n雪崩！',
        '先是幾團雪從坡上滾下來，越滾越大。然後，整面山坡都動了，白煙騰起來，轟隆隆地朝你壓下來。\n\n雪崩！',
      ]),
    choices: [
      {
        text: '御劍飛起來。',
        show: (s) => knows(s, 'yujian') && !!s.player.weapon,
        need: (s) => (mpNow(s) >= 15 ? null : '靈力不足（需 15）'),
        out: { text: '劍光一起，你已經在半空中了。腳下，雪浪轟隆隆地滾過去，把你剛才站的地方埋了三丈深。', effects: [['mp', -15]] },
      },
      {
        text: '往橫裡跑，跑出它的路。',
        check: { kind: 'gengu', diff: 7 },
        ok: { text: '你不往下跑，往橫裡跑——雪崩是往下走的。你拚命地跑，雪浪擦著你的後背衝了下去，濺了你一身雪粉。', effects: [['wound', 0.04]] },
        fail: {
          text: '你跑得不夠快。雪浪從背後撲上來，把你捲了進去，翻了不知多少個跟頭——\n\n等一切停下來，你被埋在雪裡，四周一片黑，分不清哪邊是上、哪邊是下。你吐了一口唾沫，看它往哪邊流，再朝反方向一點一點地刨。刨出來的時候，天都黑了。',
          effects: [['wound', 0.35], ['hours', 4], ['hurt', 1, '埋在了雪山的雪崩底下']],
        },
      },
      {
        text: '躲到大石頭後面。',
        check: { kind: 'wuxing', diff: 6 },
        ok: { text: '你一眼看見坡上有塊大石頭，撲過去，死死地貼在它的下坡那一面。雪浪從石頭兩邊分開，轟隆隆地滾了過去。', effects: [] },
        fail: {
          text: '你躲到了石頭後面——可那塊石頭也被雪推動了。你和石頭一起，被雪浪推出去老遠。',
          effects: [['wound', 0.25], ['hours', 2], ['hurt', 1, '埋在了雪山的雪崩底下']],
        },
      },
    ],
  },

  // ── 寒鐵堡: the master and his mine ──
  {
    id: 'ht_master',
    trigger: 'visit',
    npc: 'huo_bao',
    nodes: FORT,
    title: '霍堡主',
    text: (s) => {
      if (flag(s, 'mine_cleared')) return '霍堡主正站在堡牆上，看著礦口進進出出的人。看見你，他咧開嘴笑了，少了兩根指頭的左手朝你揮了揮：「上來喝一杯！」';
      if (killed(s, 'silk_queen')) return '霍堡主在堂上踱來踱去。看見你進門，他一下子站住了，盯著你的臉。';
      if (flag(s, 'mine_asked')) return '霍堡主坐在炭盆邊，手裡攥著那張礦圖，攥得皺巴巴的。';
      return '堂上燒著一盆炭火。一個五十來歲的漢子坐在火邊，左手少了兩根指頭，正拿一根鐵條撥炭。他抬起頭，打量了你一眼。\n\n「修士？」他說，「北原這地方，修士可不常來。」';
    },
    choices: [
      {
        text: '「堡裡出了什麼事？」',
        show: (s) => !flag(s, 'mine_asked') && !flag(s, 'mine_cleared'),
        out: {
          text: '霍堡主把鐵條往炭盆裡一插，嘆了口氣。\n\n「一個月前，深巷裡少了三個人。老趙、二柱，還有石頭——石頭才十七。」他伸出三根指頭，「我帶人下去找，巷道盡頭結了一層霜，霜上全是白絲，人影子都沒有。」\n\n「從那天起，半夜裡，礦裡就有人唱歌。一個女人的聲音，細細的，一句一句。我們這堡裡，一個女人都沒有。」\n\n「我把深巷封了。礦停了一半，工錢發不出，堡裡的人一天比一天少。」他抬起頭看著你：「你是修士。你敢不敢下去看一看？」',
          effects: [['flag', 'mine_asked'], ['discover', 'iron_mine'], ['sysexp', 5], ['log', '答應霍堡主，下寒鐵礦的深巷看一看']],
        },
      },
      {
        text: '「深巷裡的東西，死了。」',
        show: (s) => killed(s, 'silk_queen') && !flag(s, 'mine_cleared'),
        out: {
          text: (s) =>
            `你把礦裡的事說了：冰蠶，冰蠶母，還有那歌聲。${flag(s, 'miner_saved') ? '\n\n說到石頭的時候，霍堡主的手抖了一下。「石頭還活著？」他一把抓住你的胳膊，「活著就好……活著就好。」' : '\n\n霍堡主聽完，半天沒有說話。'}\n\n「老趙和二柱，我會叫人抬出來，埋在堡後頭。」他站起來，從牆上的櫃子裡搬出一個鐵箱，「三百塊靈石，堡裡能湊出來的都在這裡了。還有這三塊寒鐵——拿去，打一把好劍。」\n\n「從今往後，寒鐵堡就是你的家。鐵匠鋪那邊我去說：你的活兒，算便宜些。」`,
          effects: [
            ['flag', 'mine_cleared'], ['ls', 300], ['item', 'hantie_ore', 3], ['favor', 'huo_bao', 30], ['sysexp', 25],
            ['rumor', '聽說寒鐵堡的礦又開了。深巷裡那個會唱歌的東西，被一個南邊來的修士殺了。'], ['log', '除了寒鐵礦深巷裡的冰蠶母：寒鐵堡的礦開了'],
          ],
        },
      },
      {
        text: '「寒鐵堡是怎麼來的？」',
        show: (s) => favor(s, 'huo_bao') >= 10 && !flag(s, 'huo_story'),
        out: {
          text: '「六十年前，這裡是邊軍的一個哨所。」霍堡主往炭盆裡添了一塊炭，「後來朝廷不要北原了，兵撤了，有幾個人沒走：在鐵山裡挖出了寒鐵。」\n\n「寒鐵打的劍，砍木頭像切豆腐；寒鐵打的鍋，燒不化。南邊的人出大價錢買。」他笑了笑，「我爹是那幾個沒走的人裡頭的一個。我這兩根指頭，是十二歲那年，跟他守夜凍掉的。」',
          effects: [['flag', 'huo_story'], ['favor', 'huo_bao', 3]],
        },
      },
      {
        text: '幫堡裡鏟一天雪。',
        out: {
          text: (s) =>
            variant(s, [
              '你跟著堡裡的人鏟了一整天的雪：堡牆上的、屋頂上的、礦口前的。鏟完這邊，那邊又落滿了。傍晚，霍堡主扔給你幾塊靈石和一壺燒刀子。',
              '夜裡下了一場大雪，礦口給埋了半截。你和礦工們挖了大半天，才把礦口挖出來。霍堡主拍了拍你的肩膀：「修士也肯幹這個，難得。」',
            ]),
          effects: [['days', 1], ['ls', 8], ['item', 'shaodaozi', 1], ['favor', 'huo_bao', 2]],
        },
      },
    ],
  },
  {
    id: 'mine_deep',
    trigger: 'explore',
    poi: 'mine_deep',
    nodes: MINE,
    priority: 6,
    cond: (s) => !flag(s, 'mine_deep_open'),
    title: '深巷',
    text: (s) =>
      `最深的那條巷道，口上釘著一排木板，木板上結滿了霜。板縫裡吹出來的風，冷得像刀子。${
        night(s) ? '\n\n板子那頭，有人在唱歌。\n\n一個女人的聲音，細細的，一句一句，唱的是北原人哄孩子的小調。' : '\n\n你把耳朵貼在木板上。板子那頭，什麼聲音也沒有——又好像有，很遠很遠，像是有什麼東西在石頭上拖著走。'
      }`,
    choices: [
      {
        text: '撬開木板，下去。',
        show: (s) => s.player.realm >= 1,
        out: {
          text: '你把木板一塊一塊撬下來。一股冷風撲出來，吹得風燈的火苗縮成了一點。\n\n巷道往下斜，石壁上掛滿了白絲，絲上結著霜，在燈光裡一閃一閃。越往裡走，絲越密，到後來，整條巷道像是裹在一個白繭裡。\n\n盡頭，有一團白色的東西，比水缸還粗，慢慢地抬起了頭。\n\n歌聲停了。',
          effects: [['flag', 'mine_deep_open'], ['sysexp', 5], ['log', '撬開了寒鐵礦深巷的木板']],
        },
      },
      { text: '先回去。', out: { text: (s) => (night(s) ? '你退了回去。身後的歌聲又唱了一句，停了，像是在等你。' : '你退了回去。') } },
    ],
  },
  {
    id: 'mine_cocoons',
    trigger: 'explore',
    poi: 'mine_deep',
    nodes: MINE,
    priority: 6,
    cond: (s) => killed(s, 'silk_queen') && !flag(s, 'cocoons_cut'),
    title: '冰繭',
    text: '冰蠶母死了，巷道裡靜得只聽得見滴水聲。\n\n巷道盡頭的石頂上，吊著三個白色的繭，一人多長，凍得硬邦邦的，像三根冰柱。\n\n繭裡，隱隱約約，是人的形狀。',
    choices: [
      {
        text: '把繭剖開。',
        out: {
          text: '你一個一個剖開。\n\n頭一個繭裡，是個鬍子花白的漢子，眼睛閉著，凍得像一塊青石。第二個繭裡，是個壯實的年輕人，手裡還攥著鎬頭。他們都沒有氣了。\n\n第三個繭裡，是個半大的孩子，臉白得像紙。你把手指放在他鼻子底下——還有一絲熱氣，細得像一根線。\n\n冰蠶絲把他凍住了，也把他留住了。你把他背了出來。\n\n叮——偵測到……冰蠶母以絲封存獵物，可保其生機月餘不散。本系統的推演裡，沒有這一筆。',
          effects: [['flag', 'cocoons_cut'], ['flag', 'miner_saved'], ['item', 'bingcan_silk', 2], ['mind', 4], ['sysexp', 15], ['log', '從冰蠶母的繭裡救出了礦工石頭']],
        },
      },
    ],
  },

  // ── 寒鐵堡's tavern: what they say round the fire ──
  {
    id: 'ht_inquire',
    trigger: 'inquire',
    nodes: FORT,
    cooldown: 3,
    title: '酒館',
    text: '酒館裡又暗又熱，烤肉的油煙和燒刀子的酒氣混在一起，嗆得人睜不開眼。礦工、獵人、白狼部來換鐵的牧人，擠在幾張長桌邊上，說著北原的事。',
    choices: [
      {
        text: '打聽北冥。',
        out: {
          text: '「北冥？西邊那個凍到底的湖。」一個獵人說，「湖邊住著一個冰叟，誰也不知道他多大歲數。他說湖底下睡著一條魚，大得看不見頭尾。」\n\n「你信？」\n\n「我爺爺小時候，冰叟就在那裡釣魚了。」獵人喝了一口酒，「他說什麼，我都信。」',
          effects: [['discover', 'beiming']],
        },
      },
      {
        text: '打聽白狼部。',
        out: {
          text: '「東邊冰原上放牧的人家，住氈帳的。」一個礦工說，「他們拿狼皮、羊皮來換鐵。他們那裡有個姑娘叫阿蘭，箭射得比男人還準。」\n\n「冰原上有一頭白狼王，小牛那麼大。」旁邊的人壓低聲音，「白狼部的人管牠叫天狼，不許人打。阿蘭的爹不信這個邪，追進冰原，就再也沒回來。」',
          effects: [['discover', 'bailang_camp'], ['discover', 'bingyuan']],
        },
      },
      {
        text: '打聽雪山。',
        out: {
          text: '「北邊那一片雪峰，最高的叫天鏡峰，峰頂是一面冰鏡。」一個老礦工說，「冰鏡的縫裡長著雪蓮。我年輕的時候想上去採，爬到半山腰，就被雪猿趕下來了。」\n\n「雪猿有個頭兒，住在山洞裡，比熊還大。」他搖搖頭，「今年冬天，雪猿下山了好幾回。」',
          effects: [['discover', 'xueshan'], ['discover', 'tianjing_peak']],
        },
      },
      {
        text: '打聽裂谷。',
        out: {
          text: '「東北邊有一道裂谷，谷裡的雪是化的，地是熱的。」一個背著劍的散修說，「那是靈脈露出地面的地方。北原的修士，都想去那裡閉關。」\n\n「谷裡住著一個道姑，叫寒衣，頭髮全白了。」他苦笑了一下，「谷的正中伏著一頭冰麟。我去過一回，那東西看了我一眼，我就跑了。」',
          effects: [['discover', 'lingmai_rift']],
        },
      },
      {
        text: '打聽不周山。',
        show: (s) => !!s.nodes.duanyun_cliffs?.visited || flag(s, 'hanyi_met'),
        out: {
          text: '「斷雲崖上那根黑石頭柱子？」一個老牧人說，「我們白狼部的老人說，那是天柱，天塌下來的時候折斷的。柱頂上有一道門。」\n\n「門？」\n\n「門。」老牧人點點頭，「只有會飛的人，才上得去。上去的人，有的回來了，有的沒有。回來的人，誰也不肯說，門裡是什麼。」',
          effects: [['discover', 'duanyun_cliffs'], ['discover', 'buzhou']],
        },
      },
    ],
  },

  // ── 顧遠, sent for iron ──
  {
    id: 'ht_guyuan',
    trigger: 'visit',
    npc: 'gu_yuan',
    nodes: FORT,
    title: '顧遠',
    text: (s) => {
      if (flag(s, 'guyuan_done')) return '顧遠在收拾行李，一捆一捆的寒鐵用油布包好，碼在雪橇上。看見你，他放下手裡的繩子，朝你抱了抱拳。';
      if (flag(s, 'mine_cleared')) return '顧遠從酒館裡衝出來，差點撞在你身上。「礦開了！礦開了！」他抓著你的袖子，「是你吧？堡裡的人都說，是你！」';
      return '酒館角落裡坐著一個穿青雲宗外門弟子服的年輕人，面前擺著一壺燒刀子，喝一口，嘆一口氣。';
    },
    choices: [
      {
        text: '「青雲宗的人，怎麼跑到北原來了？」',
        show: (s) => !flag(s, 'guyuan_met') && !flag(s, 'mine_cleared'),
        out: {
          text: '「宗裡的煉器堂要寒鐵，派我來買。」顧遠苦笑，「來的時候，礦還開著。我前腳到，後腳深巷就出了事，礦封了一半，鐵一斤都買不到。」\n\n「一個月前就該回去了。空著手回去，執事非罵死我不可……」他又灌了一口酒，「我一個築基初期，礦裡的東西，我不敢去碰。」',
          effects: [['flag', 'guyuan_met'], ['favor', 'gu_yuan', 3]],
        },
      },
      {
        text: '「買你的鐵，回家去吧。」',
        show: (s) => flag(s, 'mine_cleared') && !flag(s, 'guyuan_done'),
        out: {
          text: (s) =>
            `顧遠買足了鐵，在酒館裡請你喝了一頓。\n\n「這份人情，我記下了。」他說，「回了宗裡，我一定跟執事說清楚：鐵是怎麼買來的。」${
              flag(s, 'sect_member') ? '\n\n「你也是青雲宗的？那更好辦——這份功勞，算你一份！」' : '\n\n「你要是哪天想入青雲宗，報我的名字。我雖然只是個外門弟子，說話還是有人聽的。」'
            }\n\n第二天一早，他拉著雪橇，往雁回嶺去了。走出很遠，還回過頭來朝你揮手。`,
          effects: (s) => [
            ['flag', 'guyuan_done'], ['favor', 'gu_yuan', 20], ['rep', 'sect', 15], ['sysexp', 10],
            ...(flag(s, 'sect_member') ? [['gx', 60]] : []),
            ['npc', 'gu_yuan', 'loc', 'qingyun_sect'], ['log', '顧遠買足了寒鐵，回青雲宗去了'],
          ],
        },
      },
      {
        text: '陪他喝兩杯。',
        show: (s) => !flag(s, 'guyuan_done'),
        out: { text: '你陪顧遠喝了兩杯。他說起青雲宗的事：山門前的雲海，煉器堂的爐火，還有一個總是罵他的執事。說著說著，他趴在桌上睡著了。', effects: [['hours', 2], ['favor', 'gu_yuan', 2]] },
      },
    ],
  },

  // ── 北冥: the old fisherman, and what sleeps under the ice ──
  {
    id: 'bm_bingsou',
    trigger: 'visit',
    npc: 'bing_sou',
    nodes: SEA,
    title: '冰叟',
    text: (s) =>
      flag(s, 'bingsou_told')
        ? '冰叟坐在冰洞邊上，手裡握著釣竿，眼睛望著冰面。他的嘴角帶著一點笑，像是剛剛做了一個好夢。'
        : '冰洞邊坐著一個老人，裹著一件看不出顏色的皮襖，鬍子上結滿了冰碴子。他手裡握著一根釣竿，線垂進冰洞裡，一動也不動。\n\n他沒有回頭。「坐吧，」他說，「魚還沒來。」',
    choices: [
      {
        text: '「老人家，在這裡釣了多少年魚了？」',
        show: (s) => !flag(s, 'bingsou_met'),
        out: {
          text: '「七十年？八十年？」冰叟想了想，「記不清了。我爹在這裡釣，我爺爺也在這裡釣。」\n\n「我爹說，北冥底下睡著一條魚。」他終於轉過頭來看你，眼睛渾濁得像兩塊舊冰，「大得看不見頭，看不見尾。牠一翻身，整個北冥的冰都會響。」\n\n「我爹等了一輩子，沒見著。我也等了一輩子。」他又轉回去，看著冰洞，「我就想在死之前，看牠一眼。」',
          effects: [['flag', 'bingsou_met'], ['favor', 'bing_sou', 3], ['sysexp', 3]],
        },
      },
      {
        text: '「我看見了。冰底下的那條魚。」',
        show: (s) => flag(s, 'kun_seen') && !flag(s, 'bingsou_told'),
        out: {
          text: '冰叟的手抖了一下，釣竿掉在了冰上。\n\n他沒有去撿。他看著你，看了很久，眼淚從那兩塊舊冰一樣的眼睛裡流出來，流到鬍子上，凍成了冰珠。\n\n「真的有。」他說，「真的有……」\n\n他從懷裡摸出一個油布包，一層一層打開。裡面是一根羽毛，比人還長，白中帶青。\n\n「六十年前的一個夜裡，北冥的冰響了一整夜。第二天早上，冰上落著這根羽毛。」他把羽毛放在你手裡，「我爹說，魚化成了鳥，飛走了一條；底下還睡著一條。」\n\n「我留著它，是想等。現在不用等了。給你吧——你看見了牠，牠也看見了你。」',
          effects: [['flag', 'bingsou_told'], ['item', 'peng_feather', 1], ['favor', 'bing_sou', 30], ['mind', 4], ['sysexp', 20], ['rumor', '聽說北冥的冰叟哭了一場。他說北冥底下真的有一條魚。'], ['log', '把冰下的鯤告訴了冰叟：他給了你一根鵬羽']],
        },
      },
      {
        text: '陪他釣一天魚。',
        out: {
          text: (s) =>
            variant(s, [
              '你在冰洞邊陪冰叟坐了一整天。他一句話也沒說，你也沒說。傍晚，他從冰洞裡拎起一條銀白的魚，扔給你：「烤著吃。」',
              '冰叟教你在冰上鑿洞、下線。你鑿了半天，鑿出一個歪歪扭扭的洞。他看了一眼，笑了：「比我爹第一回鑿的強。」',
            ]),
          effects: [['days', 1], ['hp', 0.1], ['favor', 'bing_sou', 2], ['mind', 1]],
        },
      },
    ],
  },
  {
    id: 'bm_kun',
    trigger: 'explore',
    poi: 'bm_middle',
    nodes: SEA,
    priority: 5,
    cond: (s) => !flag(s, 'kun_seen'),
    title: '冰心',
    text: (s) =>
      `北冥的正中。腳下的冰透明得像琉璃，底下黑沉沉的，什麼也看不見。${
        night(s) ? '\n\n夜裡的冰面上沒有風。你聽見冰底下傳來一聲很低很低的響動，低得像是從你自己的胸口裡發出來的。' : ''
      }`,
    choices: [
      {
        text: '放出神識，往冰底下探。',
        show: (s) => s.player.realm >= 2,
        need: (s) => (mpNow(s) >= 20 ? null : '靈力不足（需 20）'),
        out: {
          text: (s) =>
            `你的神識穿過冰層，沉進黑沉沉的水裡。一丈，十丈，百丈——\n\n你碰到了什麼。\n\n那東西大得沒有邊。你的神識沿著它走了很久，走不到頭，也走不到尾；它的身上覆著一層一層的鱗，每一片都比寒鐵堡的堡牆還寬。\n\n它動了一下。\n\n整個北冥的冰，「轟」的一聲響了，從你腳下一直響到天邊。一隻眼睛，在冰底下慢慢地睜開，比月亮還大，看著你。\n\n然後，又慢慢地閉上了。${
              awake(s) ? '\n\n「北冥有魚，其名為鯤。」玄微的聲音很輕，「我小時候，在接天城的書裡讀過這一句。原來是真的。」' : '\n\n叮——偵測到……超出偵測範圍。超出偵測範圍。超出——\n\n系統沉默了很久。'
            }`,
          effects: [['mp', -20], ['flag', 'kun_seen'], ['insight', 3], ['mind', 3], ['sysexp', 30], ['log', '在北冥的冰心，看見了冰底下的鯤']],
        },
      },
      {
        text: '趴在冰上，往下看。',
        out: {
          text: (s) =>
            night(s)
              ? '你趴在冰上，把臉貼著冰面往下看。底下黑得像墨。\n\n忽然，那片黑動了。一道影子從你身下滑過去——不，不是一道影子，是一整片黑暗在動，從冰心的這一頭，一直動到看不見的那一頭。滑了很久，很久。\n\n冰面「嗡」地響了一聲。你爬起來的時候，手腳都在抖。'
              : '你趴在冰上，把臉貼著冰面往下看。底下黑得像墨，什麼也看不見。\n\n也許夜裡再來，會不一樣。',
          effects: (s) => (night(s) ? [['flag', 'kun_seen'], ['insight', 2], ['sysexp', 20], ['log', '在北冥的冰心，看見了冰底下的鯤']] : []),
        },
      },
      { text: '走開。', out: {} },
    ],
  },

  // ── 天鏡峰: the mirror of ice, and the snow lotus in its cracks ──
  {
    id: 'tj_mirror',
    trigger: 'explore',
    poi: 'tj_mirror',
    nodes: ['tianjing_peak'],
    cooldown: 60,
    title: '冰鏡',
    text: '峰頂是一整塊平滑的冰，亮得照得見人影。冰縫裡開著雪白的花，一朵一朵，像落在冰上的月光。\n\n冰鏡裡的你，也在看你。',
    choices: [
      {
        text: '採幾朵雪蓮。',
        out: { text: '你小心地把雪蓮從冰縫裡挖出來，連著根。花瓣涼得像雪，聞起來，卻有一點甜。冰縫裡還留著幾朵，你沒有採完。', effects: [['item', 'xuelian', 2], ['sysexp', 4]] },
      },
      {
        text: '對著冰鏡坐一會兒。',
        out: {
          text: (s) =>
            variant(s, [
              '你在冰鏡前坐下。鏡裡的你也坐下。你看著他，他看著你；看了很久，你忽然覺得，他比你知道的多一點。',
              '冰鏡裡映著天，天上的雲在冰裡走。你看著看著，分不清自己是坐在冰上，還是坐在雲上。',
            ]),
          effects: [['hours', 2], ['mind', 3], ['insight', 1]],
        },
      },
    ],
  },

  // ── 不周山: the gate on the broken pillar, and a page under its threshold ──
  {
    id: 'bz_gate',
    trigger: 'explore',
    poi: 'bz_gate',
    nodes: ['buzhou'],
    priority: 6,
    cond: (s) => !(s.sys.frags || []).includes('frag_snow'),
    title: '天門',
    text: (s) =>
      `斷口平得像被刀削過，黑石頭上一點雪也不積。正中立著一道石門，孤零零的，沒有牆，也沒有路。\n\n從門的這一邊看過去，那一邊是雪，是斷雲崖，是北原。\n\n可是從門裡看過去——門裡是夜。滿天的星，一條星河從東邊流過來，流到門的正中，斷了。\n\n門檻底下，凍著一頁紙。${
        awake(s) ? '\n\n「……我來過這裡。」玄微說。' : '\n\n叮——偵測到……偵測到……記憶校正：百分之……'
      }`,
    choices: [
      {
        text: '把那頁紙從冰裡取出來。',
        out: {
          text: (s) =>
            `${FRAGMENTS.frag_snow.text}\n\n${
              awake(s)
                ? '玄微很久沒有說話。\n\n「我在門前跪了七天。」他終於說，「門裡的人說，他是看門的。我問他，天河是誰斷的。他不肯說。」\n\n「後來我想明白了：他不是不肯說。他是不敢。」'
                : '系統沒有說話。過了很久，才「叮」了一聲，很輕，像是有人在很遠的地方嘆了一口氣。'
            }`,
          effects: [['frag', 'frag_snow'], ['flag', 'tianmen_seen'], ['insight', 3], ['mind', 5], ['sysexp', 40], ['log', '在不周山的天門底下，找到玄微留下的一頁天機殘頁']],
        },
      },
    ],
  },

  // ── 靈脈裂谷: 寒衣, and the 冰麟 on the knot of the veins ──
  {
    id: 'lm_hanyi',
    trigger: 'visit',
    npc: 'han_yi',
    nodes: RIFT,
    title: '寒衣',
    text: (s) => {
      if (flag(s, 'qilin_fed')) return '寒衣坐在石洞口，膝上橫著一柄拂塵，看著崖腳下伏在雪裡的冰麟。看見你，她笑了一下——你頭一回看見她笑。';
      if (killed(s, 'ice_qilin') || flag(s, 'qilin_slain')) return '寒衣站在石洞口，望著空蕩蕩的靈脈結，臉上什麼表情也沒有。';
      if (flag(s, 'hanyi_met')) return '寒衣坐在石洞口，閉著眼，像一尊雪做的像。';
      return '石洞口掛著一張獸皮。你還沒走近，簾子就掀開了：一個道姑站在洞口，頭髮全白了，臉卻像四十來歲，眼睛冷得像北冥的冰。\n\n「又一個來借靈脈的。」她說。';
    },
    choices: [
      {
        text: '「前輩一個人住在這裡？」',
        show: (s) => !flag(s, 'hanyi_met'),
        out: {
          text: '「四十年了。」寒衣說，「四十年前，我來這裡結嬰——北原只有靈脈結上的靈氣，濃得夠結嬰。可是結上伏著一頭冰麟。」\n\n「我想殺牠。打了三天三夜，沒打過。」她撩起袖子，小臂上一道白色的疤，像一道冰紋，「後來我就不想殺牠了。我在這裡住下來，看著牠，一看就是四十年。」\n\n「牠伏在結上，喝結裡溢出來的靈氣，吐出來的是靈髓。」她看著你，「你要靈脈結，有兩個辦法：殺了牠，或者讓牠自己讓開。」\n\n「讓開？」\n\n「牠喜歡雪蓮。」寒衣說，「天鏡峰頂上，冰鏡縫裡長的那種，三朵。」',
          effects: [['flag', 'hanyi_met'], ['discover', 'tianjing_peak'], ['favor', 'han_yi', 3], ['sysexp', 5], ['log', '寒衣說：冰麟喜歡雪蓮']],
        },
      },
      {
        text: '「冰麟讓開了。」',
        show: (s) => flag(s, 'qilin_fed') && !flag(s, 'hanyi_taught'),
        out: {
          text: '寒衣沉默了很久。\n\n「四十年，」她說，「我只想過殺牠，從來沒想過給牠一朵花。」\n\n她轉身進了石洞，拿出一卷冰一樣涼的帛書：「這是我在冰下坐了四十年，坐出來的一點東西，叫《寒魄訣》。你拿去。」\n\n「還有一張丹方。靈髓為主藥，雪蓮為引，煉出來的叫凝金丹，結丹的時候服下，能把一身真元凝得更緊。」她頓了頓，「等你要結丹了，到靈脈結上來。我替你護法。」',
          effects: [['tech', 'hanpo'], ['flag', 'hanyi_taught'], ['flag', 'recipe_ningjin'], ['flag', 'hanyi_guard'], ['favor', 'han_yi', 40], ['insight', 2], ['sysexp', 30], ['log', '寒衣傳了你《寒魄訣》和凝金丹方，答應在你結丹時護法']],
        },
      },
      {
        text: '「冰麟死了。」',
        show: (s) => (killed(s, 'ice_qilin') || flag(s, 'qilin_slain')) && !flag(s, 'hanyi_taught'),
        out: {
          text: '「我知道。」寒衣說，「整個裂谷都聽見了。」\n\n她看著靈脈結，看了很久：「牠在這裡伏了三百年。」\n\n她從袖子裡摸出一張紙，遞給你，沒有看你：「凝金丹的丹方。靈髓為主藥，雪蓮為引。你要結丹，就拿去吧——牠的命換的。」\n\n簾子落下來了。',
          effects: [['flag', 'hanyi_taught'], ['flag', 'recipe_ningjin'], ['favor', 'han_yi', -10], ['log', '寒衣給了你凝金丹方']],
        },
      },
      {
        text: '「前輩當年，為什麼沒有結成元嬰？」',
        show: (s) => flag(s, 'hanyi_guard') && !flag(s, 'hanyi_story'),
        out: {
          text: '寒衣看著崖腳下的冰麟。\n\n「結嬰的時候，要把一輩子的念頭都放下。」她說，「我放不下一個人。他死在北原的雪裡，我來找他，找了一路，找到這裡。」\n\n「後來我想，大概不是靈脈結的錯，也不是冰麟的錯。」她笑了笑，「是我自己的錯。」\n\n「現在放下了嗎？」\n\n「快了。」',
          effects: [['flag', 'hanyi_story'], ['favor', 'han_yi', 5], ['mind', 3]],
        },
      },
      {
        text: '請她指點修行。',
        show: (s) => flag(s, 'hanyi_met') && favor(s, 'han_yi') >= 0,
        out: {
          text: (s) =>
            variant(s, [
              '寒衣聽你說了一遍你的功法，閉著眼想了很久，只說了一句：「你急了。」\n\n你在石洞外坐了一天，把這三個字想了一天。',
              '寒衣讓你在靈脈邊坐下，伸出一根手指點在你的眉心。一股冰涼的氣，順著你的經脈走了一圈。「這裡，」她說，「還有這裡。堵著。」',
            ]),
          effects: [['days', 1], ['insight', 1], ['favor', 'han_yi', 1]],
        },
      },
    ],
  },
  {
    id: 'lm_qilin',
    trigger: 'explore',
    mob: true,
    nodes: RIFT,
    cond: (s) => !flag(s, 'node_open') && !killed(s, 'ice_qilin'),
    title: '冰麟',
    steps: {
      start: {
        text: (s) =>
          `那團白色的東西站了起來。\n\n鹿的身子，龍的鱗，額上一隻冰做的角。牠慢慢地朝你走過來，每一步，腳下的苔蘚就結一層霜。牠在你面前站住，低下頭，看著你。\n\n你聞到一股雪的氣味。${
            has(s, 'xuelian', 3) ? '\n\n牠的鼻子動了動，看了一眼你的行囊。' : ''
          }\n\n牠身上的靈壓，比你見過的任何東西都重。`,
        choices: [
          {
            text: '把三朵雪蓮放在牠面前。',
            show: (s) => has(s, 'xuelian', 3),
            out: {
              text: '你把三朵雪蓮放在雪地上，往後退了一步。\n\n冰麟低下頭，聞了聞，一朵一朵吃了下去。吃完，牠抬起頭看著你，看了很久，眼睛裡藍光一閃一閃，像靈脈的光。\n\n然後，牠轉過身，慢慢走到崖腳下，伏了下去，閉上了眼睛。\n\n裂谷的正中，靈脈結露了出來：藍光從地底湧上來，像一口泉。\n\n叮——……本系統無法解釋發生了什麼。本系統只是覺得，這樣很好。',
              effects: [['item', 'xuelian', -3], ['flag', 'qilin_fed'], ['flag', 'node_open'], ['discover', 'lingmai_node'], ['mind', 6], ['sysexp', 30], ['rumor', '聽說靈脈裂谷的冰麟讓開了靈脈結。有人說，是一個修士拿雪蓮餵的。'], ['log', '餵了冰麟三朵雪蓮：牠讓開了靈脈結']],
            },
          },
          {
            text: '拔劍。',
            check: { kind: 'power', diff: 760 },
            fight: { foes: [['ice_qilin', 1]], close: true },
            ok: {
              text: '冰麟倒在靈脈結上，額上的冰角斷成了兩截。牠最後看了你一眼，眼睛裡的藍光，一點一點地暗了。\n\n裂谷裡靜極了。靈脈結的藍光從牠身下湧上來，湧過牠的鱗，像水漫過一塊石頭。',
              effects: [['flag', 'node_open'], ['flag', 'qilin_slain'], ['discover', 'lingmai_node'], ['mind', -3], ['sysexp', 30], ['rumor', '聽說靈脈裂谷的冰麟死了。北原從此又多了一處人人想去的地方。'], ['log', '打倒了靈脈裂谷的冰麟：靈脈結開了']],
            },
            fail: { text: '冰麟的角頂在你胸口上，你飛了出去，撞在冰崖上，眼前一黑。\n\n醒來的時候，你躺在裂谷口的雪地上。冰麟已經回到了靈脈結上，伏著，像什麼也沒發生過。', effects: [['hurt', 2, '死在冰麟的角下']] },
          },
          { text: '慢慢退開。', out: { text: '你一步一步往後退。冰麟看著你退出十幾丈，才慢慢地轉過身，回到靈脈結上，伏了下去。' } },
        ],
      },
    },
  },
  {
    // (killed out in the world, not through its story: the knot is open all the same)
    id: 'lm_node_open',
    trigger: 'explore',
    poi: 'lm_vein',
    nodes: RIFT,
    priority: 6,
    cond: (s) => killed(s, 'ice_qilin') && !flag(s, 'node_open'),
    title: '靈脈結',
    text: '冰麟倒在靈脈結上，額上的冰角斷成了兩截。\n\n裂谷裡靜極了。靈脈結的藍光從牠身下湧上來，湧過牠的鱗，像水漫過一塊石頭。',
    choices: [{ text: '走上靈脈結。', out: { effects: [['flag', 'node_open'], ['flag', 'qilin_slain'], ['discover', 'lingmai_node'], ['sysexp', 10], ['log', '打倒了靈脈裂谷的冰麟：靈脈結開了']] } }],
  },
  {
    id: 'lm_node_gift',
    trigger: 'explore',
    poi: 'lm_vein',
    nodes: RIFT,
    priority: 5,
    cooldown: 30,
    cond: (s) => flag(s, 'qilin_fed'),
    title: '靈髓',
    text: '冰麟從崖腳下站起來，慢慢走到靈脈結邊上，低下頭，吐出一滴藍得透亮的東西，落在你腳邊的雪上。\n\n然後，牠回到崖腳下，伏了下去。',
    choices: [{ text: '撿起靈髓。', out: { effects: [['item', 'lingsui', 1], ['sysexp', 3]] } }],
  },

  // ── 白狼部: 阿蘭, and her father who went after the 白狼王 ──
  {
    id: 'bl_alan',
    trigger: 'visit',
    npc: 'a_lan',
    nodes: CAMP,
    title: '阿蘭',
    text: (s) => {
      if (flag(s, 'alan_closure')) return '阿蘭坐在帳門口削箭桿，腰上掛著一把纏紅繩的獵刀。看見你，她抬起下巴點了點頭：「來了？奶茶在火上。」';
      if (flag(s, 'alan_asked')) return '阿蘭在營火邊擦弓，擦了一遍又一遍。';
      return '一個十八九歲的姑娘坐在營火邊削箭桿，身邊立著一張弓，比她的人還高。她抬起頭，一雙眼睛又黑又亮，像冰原上的夜。\n\n「南邊來的？」她說，「你身上沒有狼皮的味道。」';
    },
    choices: [
      {
        text: '「這張弓，是你的？」',
        show: (s) => !flag(s, 'alan_asked') && !flag(s, 'alan_closure'),
        out: {
          text: '「我阿爹的。」阿蘭把弓拿起來，撫著弓背，「三年前，他追一頭白狼王進了冰原，往東，一直往東。他說三天就回來。」\n\n「部裡的老人說，白狼王是天狼，打不得。阿爹不信。他說天狼吃了部裡二十頭羊，他要討回來。」\n\n她把弓放下：「三年了。我一個人往東找過兩回，都被狼群趕回來了。」\n\n「你要是往東邊去……」她猶豫了一下，「阿爹有一把獵刀，刀柄上纏著紅繩，是我阿娘纏的。你要是看見了，替我帶回來。」',
          effects: [['flag', 'alan_asked'], ['discover', 'bingyuan'], ['favor', 'a_lan', 3], ['sysexp', 5], ['log', '答應阿蘭，往冰原東邊找她阿爹的獵刀']],
        },
      },
      {
        text: '把那把纏紅繩的獵刀給她。',
        show: (s) => has(s, 'alan_knife'),
        out: {
          text: (s) =>
            `阿蘭接過刀，手指在紅繩上摸了一遍，又摸了一遍。\n\n她沒有哭。她把刀抽出來，刀刃上的霜在火光裡化成了水，一滴一滴地往下落。\n\n「他死在哪裡？」\n\n你告訴了她：冰原東邊，一個小小的雪丘，雪底下一具白骨、一張斷弓。${
              killed(s, 'bailang_king') ? '\n\n「天狼呢？」\n\n「也死了。」\n\n阿蘭看著火，看了很久：「阿爹的仇報了。可是白狼部，從此沒有天狼了。」' : '\n\n「他到底還是追上牠了。」阿蘭說，「他一輩子，就想追上牠一回。」'
            }\n\n她站起來，走進帳子，抱出一件皮裘：「阿爹的。他走的時候沒穿——他說追狼的時候穿不住。你拿去，北原的風，它擋得住。」`,
          effects: [['item', 'alan_knife', -1], ['item', 'langqiu', 1], ['flag', 'alan_closure'], ['favor', 'a_lan', 40], ['mind', 3], ['sysexp', 20], ['log', '把阿蘭阿爹的獵刀帶回了白狼部']],
        },
      },
      {
        text: '跟她去冰原上打一天獵。',
        show: (s) => flag(s, 'alan_asked') || flag(s, 'alan_closure'),
        out: {
          text: (s) =>
            variant(s, [
              '阿蘭帶你在冰原上走了一天，教你看雪上的爪印：哪個是狐狸的，哪個是狼的，哪個是昨天的，哪個是一個時辰前的。傍晚，她射中了一頭雪兔，分了你一半。',
              '你們趴在雪坡後頭等了大半天。一群雪羊從坡下走過，阿蘭拉開弓，一箭，最後頭那隻倒下了。她回頭看你：「看見了嗎？只射走在最後的。」',
            ]),
          effects: [['days', 1], ['hp', 0.1], ['favor', 'a_lan', 2]],
        },
      },
    ],
  },
  {
    id: 'bl_remains',
    trigger: 'explore',
    poi: 'bl_remains',
    nodes: ['bingyuan'],
    priority: 5,
    cond: (s) => !has(s, 'alan_knife') && !flag(s, 'alan_closure'),
    title: '雪丘',
    text: '你蹲下來，把雪丘上的雪撥開。\n\n底下是一具白骨，蜷著身子，裹著一件凍成硬殼的狼皮襖。他的手裡還握著一張斷了的弓。身邊的雪裡，插著一把獵刀，刀柄上纏著紅繩。\n\n白骨的四周，全是爪印——比碗口還大的爪印，一圈一圈，像是有什麼東西在這裡繞著他走了很久。',
    choices: [
      {
        text: '拿起那把纏紅繩的獵刀。',
        out: {
          text: (s) =>
            flag(s, 'alan_asked')
              ? '這就是阿蘭說的那把刀。你把雪重新蓋回去，壘了幾塊石頭，又在石頭上插了一根木杆，杆上繫了一根布條——像雪嶺口那樣。'
              : '刀柄上的紅繩，是一個女人纏的，纏得很仔細。你把雪重新蓋回去，壘了幾塊石頭。白狼部的人，也許認得這把刀。',
          effects: [['item', 'alan_knife', 1], ['mind', 2], ['sysexp', 5]],
        },
      },
    ],
  },

  // ── small things out on the snow ──
  {
    id: 'by_frozen_miner',
    trigger: 'explore',
    nodes: ['bingyuan', 'beiyuan_wilds'],
    once: true,
    title: '雪地裡的人',
    text: '一塊大石頭底下坐著一個人，背靠著石頭，兩手揣在袖子裡，頭低著，像在打盹。\n\n你走近了才看清楚：他早就凍死了。眉毛上、鬍子上，結著厚厚的白霜；嘴角卻是往上翹的，像是夢見了什麼好事。\n\n他的懷裡，露出一個信封的角。',
    choices: [
      {
        text: '取出那封信。',
        out: {
          text: '信封凍得發硬，上面的字是用炭條寫的，歪歪扭扭：\n\n「青石鎮北，陳家小石收。」\n\n是東荒的青石鎮。你認得那個地方。\n\n他身上的衣服，是寒鐵堡礦工穿的那種。大概是想趁著礦停了，翻過雁回嶺回家去；走到這裡，走不動了，坐下來歇一歇。\n\n你把他背到背風的地方，用雪埋了，壘了一堆石頭。',
          effects: [['item', 'frozen_letter', 1], ['mind', 3], ['sysexp', 8], ['log', '在北原的雪地裡，從一個凍死的礦工懷裡取出一封寄往青石鎮的信']],
        },
      },
      { text: '合上他的眼睛，走開。', out: { text: '他的眼睛本來就是閉著的。你站了一會兒，走開了。', effects: [['mind', 1]] } },
    ],
  },
  {
    id: 'by_snow_fox',
    trigger: 'explore',
    nodes: ['xueshan', 'duanyun_cliffs', 'beiyuan_wilds'],
    cooldown: 30,
    title: '雪狐',
    text: '雪地裡有一團白東西在掙扎。是一隻雪狐，後腿被一個獸夾夾住了，夾子上的血已經凍成了黑色。\n\n牠看見你，不掙了，縮成一團，一雙黑眼睛直直地看著你。',
    choices: [
      { text: '掰開夾子，放了牠。', out: { text: '你掰開夾子。雪狐一瘸一拐地跑出去幾丈，回頭看了你一眼，鑽進雪裡不見了。', effects: [['mind', 2], ['sysexp', 3]] } },
      { text: '不管牠。', out: { text: '你走開了。走出很遠，回頭看，那團白還在雪地裡，一動不動。' } },
    ],
  },
  {
    id: 'by_aurora',
    trigger: 'explore',
    nodes: OPEN,
    once: true,
    cond: (s) => night(s) && !weatherNow(s).snow,
    title: '天光',
    text: (s) =>
      `夜空忽然亮了。\n\n一道綠光從北邊的天上垂下來，像一幅極大極大的紗，在風裡慢慢地飄；紗的邊上透著紫，透著紅，一層一層，一直鋪到頭頂上。雪地被照得一片青綠，連你的影子都是綠的。${
        awake(s) ? '\n\n「天河斷了以後，」玄微說，「天上就只剩下這個了。這是天河的光，漏下來的一點。」' : '\n\n叮——偵測到高空靈氣異常。本系統……想多看一會兒。'
      }`,
    choices: [{ text: '看著它。', out: { text: '你看了很久，直到那道光一點一點地淡了，散了。', effects: [['hours', 1], ['insight', 1], ['mind', 3], ['sysexp', 5]] } }],
  },

  // ── the first time in each place ──
  {
    id: 'ht_arrive',
    trigger: 'arrive',
    nodes: FORT,
    once: true,
    title: '寒鐵堡',
    text: '石頭壘的堡牆，比東荒的城牆矮，卻厚得多，牆頭上的雪結成了冰。堡門口掛著一塊鐵牌子，鏽得發黑，上面三個字：寒鐵堡。\n\n堡裡的人穿得像一隻一隻的熊，看見你，都停下來看。一個孩子跑過來，拉了拉你的袖子：「你是從南邊來的？南邊冷不冷？」\n\n堡西邊，鐵山黑沉沉地壓在雪地上。山腳下有一個礦口，礦口上架著一個木頭框，框上掛著一盞風燈。',
    choices: [{ text: '「南邊不冷。」', out: { effects: [['sysexp', 5]] } }],
  },
  {
    id: 'mine_arrive',
    trigger: 'arrive',
    nodes: MINE,
    once: true,
    title: '寒鐵礦',
    text: '礦道裡比外頭還冷。石壁上的礦脈黑青黑青的，摸上去冰得燙手。頭頂上一滴水落下來，落到半路，就凍成了一顆冰珠，「叮」的一聲掉在地上。\n\n巷道一條一條往山腹裡伸。最深的那條，口上釘著木板。',
    choices: [{ text: '往裡走。', out: { effects: [['sysexp', 5]] } }],
  },
  {
    id: 'bm_arrive',
    trigger: 'arrive',
    nodes: SEA,
    once: true,
    title: '北冥',
    text: '一大片平平的白，平得像一面鏡子，一直鋪到天邊。風把冰面上的雪吹開，露出底下的冰：黑沉沉的，透明的，看得見裡面凍著的氣泡，一串一串，像是什麼東西吐出來的。\n\n北原的人說這是湖。可是你站在岸邊，怎麼看，它都是一片海。\n\n冰面上有的地方顏色發黑。獵人說，那是薄冰，別踩。',
    choices: [{ text: '走上冰面。', out: { effects: [['sysexp', 5]] } }],
  },
  {
    id: 'bl_arrive',
    trigger: 'arrive',
    nodes: CAMP,
    once: true,
    title: '白狼部',
    text: '冰原上一圈氈帳，圍著一堆營火。火燒的是牛糞和松枝，煙不大，熱氣卻透到骨頭裡。幾條大狗趴在火邊，看見你，抬起頭，又趴下了。\n\n帳子裡走出一個老人，臉被風吹得像一塊老樹皮。他看了你一眼，端過來一碗奶茶。\n\n「喝吧。」他說，「冰原上，不讓人喝口熱的，是要遭天狼罰的。」',
    choices: [{ text: '接過奶茶。', out: { effects: [['hp', 0.1], ['sysexp', 5]] } }],
  },
  {
    id: 'lm_arrive',
    trigger: 'arrive',
    nodes: RIFT,
    once: true,
    title: '靈脈裂谷',
    text: (s) =>
      `冰崖從兩邊夾過來，只留下一道窄窄的口子。從口子進去，你一下子覺得熱了——\n\n谷裡的雪是化的。地是溫的，冒著白氣；石縫裡透出藍光，一明一暗，像在呼吸。水邊長著苔蘚，綠得發亮，是你進北原以來看見的第一片綠。\n\n空氣裡的靈氣濃得發甜，吸一口，渾身的毛孔都張開了。${
        s.player.realm < 3 ? '\n\n叮——偵測到高濃度靈氣。宿主境界尚淺，在此處閉關，靈氣入體過猛，恐傷經脈。' : ''
      }`,
    choices: [{ text: '深深吸一口氣。', out: { effects: [['sysexp', 8]] } }],
  },
  {
    id: 'xs_arrive',
    trigger: 'arrive',
    nodes: ['xueshan'],
    once: true,
    title: '雪山',
    text: '雪峰一座挨著一座，一座比一座高，最高的那座峰頂上，有一點亮光，像一面鏡子在反光。\n\n雪深到膝蓋。山坡上的雪被什麼東西踩得亂七八糟，到處是大腳印——比人的大，五個趾頭。\n\n頭頂上，雪簌簌地往下滑了一點。',
    choices: [{ text: '放輕腳步。', out: { effects: [['sysexp', 5]] } }],
  },
  {
    id: 'dy_arrive',
    trigger: 'arrive',
    nodes: ['duanyun_cliffs'],
    once: true,
    title: '斷雲崖',
    text: '你站在雲上面。\n\n崖下的雲一團一團飄過去，雲縫裡看得見北冥的冰，白得發亮。崖上的風大得站不穩，吹得人只想趴下。\n\n西北邊，雲裡立著一根黑石頭柱子，粗得像一座山，頂上平平的，像是被什麼東西攔腰折斷了。',
    choices: [{ text: '看著那根柱子。', out: { effects: [['discover', 'buzhou'], ['sysexp', 5]] } }],
  },
  {
    id: 'tj_arrive',
    trigger: 'arrive',
    nodes: ['tianjing_peak'],
    once: true,
    title: '天鏡峰',
    text: '峰頂是一整塊冰，平得像一面鏡子，亮得睜不開眼。四面都是雪峰，低頭看，雲海一直鋪到天邊。\n\n冰縫裡開著雪白的花。',
    choices: [{ text: '走到冰鏡上。', out: { effects: [['sysexp', 8]] } }],
  },
  {
    id: 'bz_arrive',
    trigger: 'arrive',
    nodes: ['buzhou'],
    once: true,
    title: '不周山',
    text: '你落在斷口上。腳下的石頭黑得發亮，摸上去，是溫的。\n\n風從斷口上吹過去，發出一聲很長很長的嘆息，像是什麼很大很老的東西，在睡夢裡翻了個身。\n\n斷口的正中，立著一道石門。',
    choices: [{ text: '走向那道門。', out: { effects: [['sysexp', 10]] } }],
  },
];
