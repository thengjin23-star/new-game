// 北原 (0.23): north of 東荒, over 雁回嶺. What the north itself does to you —
// the cold that gets into your bones out on the snow, a blizzard, the thin
// ice of 北冥, the snow brought down off the slopes of 雪山.
import { has, mpNow, variant } from '../helpers.js';
import { weatherNow, hoursToClear } from '../../world/weather.js';

/** Out in the open, where the cold gets at you (world/explore.js exposure: not in the fort, the mine, the camp or the rift). */
const OPEN = ['xueling_kou', 'beiming', 'bingyuan', 'duanyun_cliffs', 'xueshan', 'tianjing_peak', 'buzhou', 'beiyuan_wilds'];
/** The thin places on 北冥's ice (world/maps/beiyuan.js THIN_ICE). */
const THIN = ['ti_a', 'ti_b', 'ti_c', 'ti_d', 'ti_e', 'ti_f'];
/** A body art you have (輕身術, 踏雲步). */
const knows = (s, art) => (s.player.arts || []).includes(art);

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
];
