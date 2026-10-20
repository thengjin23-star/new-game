// 南嶺 (0.21): the country over the pass. 青竹寨 and its people; its well gone
// bitter, and what lies at the bottom of that (萬蠱谷's 蠱母, woken after thirty
// years); a hunter's brother lost in 瘴林; a 散修's pack left behind in it; what
// is behind the falls of 碧潭; the miasma that lies over half the land; and the
// small things that happen on its paths.
import { has, flag, favor, variant, mpNow } from '../helpers.js';

const ZHAI = ['qingzhu_village'];
const PASS = ['ling_pass'];
const FOREST = ['miasma_forest'];
const MARSH = ['poison_marsh'];
const VALLEY = ['wangu_valley'];
const POOL = ['jade_pool'];
const WILDS = ['nanling_wilds'];

/** The 蠱母 is dead (by your hand: it never comes back). */
const motherDead = (s) => (s.vars.kills?.gu_mother || 0) > 0;
/** The miasma cannot touch you: 阿蘿's 避瘴蠱 in your blood, or a 避瘴丹 still working. */
const proof = (s) => flag(s, 'bizhang_gu') || (s.player.buffs?.bizhang || 0) > 0;
const MIASMA = ['zl_miasma_a', 'zl_miasma_b', 'zl_miasma_c', 'zl_miasma_d', 'zz_miasma_a', 'zz_miasma_b', 'gu_miasma_a', 'gu_miasma_b'];

export default [
  // ── 青竹寨 ──
  {
    id: 'qingzhu_arrive',
    trigger: 'arrive',
    nodes: ZHAI,
    once: true,
    title: '青竹寨',
    text: '山路一轉，眼前忽然開闊起來。\n\n半山腰上，竹樓一層一層地疊上去，樓與樓之間拉著晾布的竹竿，藍的、黑的布在風裡飄。寨口的大樹下坐著幾個老人，看見你，都不說話了。\n\n一個白鬍子老人拄著竹杖站起來，用帶著口音的官話問：「東荒來的？」',
    choices: [
      {
        text: '「是。路過，想討口水喝。」',
        out: {
          text: '老人看了你一會兒，點點頭：「我是這裡的寨老，叫我岩伯就行。」\n\n他讓人給你端來一碗水。水有點苦。\n\n「寨井的水，最近都這樣。」岩伯說，「你歇夠了，就早點走吧。寨子裡最近……不太平。」',
          effects: [['meet', 'yan_bo'], ['flag', 'zhai_met'], ['sysexp', 5], ['log', '到了南嶺的青竹寨']],
        },
      },
      {
        text: '「是。我是修士，來南嶺找機緣。」',
        out: {
          text: '老人的眼睛亮了一下，又暗了下去。\n\n「修士……」他喃喃地說，「這些年也來過幾個修士，進了萬蠱谷，就沒出來過。」\n\n他讓人給你端來一碗水。水有點苦。\n\n「我是寨老，岩伯。寨井的水，最近都這樣。」他頓了頓，「你要是真有本事，晚些來找我。」',
          effects: [['meet', 'yan_bo'], ['flag', 'zhai_met'], ['flag', 'gu_heard'], ['sysexp', 5], ['log', '到了南嶺的青竹寨']],
        },
      },
    ],
  },

  {
    id: 'zhai_well_bitter',
    trigger: 'explore',
    poi: 'zhai_well',
    nodes: ZHAI,
    once: true,
    cond: (s) => !flag(s, 'gu_cleared'),
    title: '寨井',
    text: '井很深。你往下看，只看見一圈黑沉沉的水。\n\n一個挑水的婦人在井邊嘆氣：「苦了快一個月了。先是苦，後來寨子裡的娃娃喝了就肚子疼，老人喝了就發燒……」\n\n你打上來半桶。水面上浮著幾隻死蟲，指甲蓋大，背上一圈金紋。',
    choices: [
      {
        text: '撈一隻死蟲，拿去問人。',
        out: {
          text: '你用葉子包起一隻死蟲。婦人看見了，臉一下子白了：「那是……蠱。你去問阿蘿吧，百藥鋪的阿蘿。」',
          effects: [['flag', 'well_seen'], ['flag', 'gu_heard'], ['sysexp', 5]],
        },
      },
      {
        text: '沉下神識，探一探井底。',
        show: (s) => s.player.realm >= 1,
        need: (s) => (mpNow(s) >= 6 ? null : '靈力不足（需 6）'),
        out: {
          text: '你沉下神識。井底的泥裡，密密麻麻伏著一層蟲卵，像撒了一把黑芝麻。卵上纏著一縷極細的氣息，順著地底的水脈，一直往東南去——萬蠱谷的方向。',
          effects: [['mp', -6], ['flag', 'well_seen'], ['flag', 'gu_heard'], ['insight', 1], ['sysexp', 5]],
        },
      },
    ],
  },

  {
    id: 'zhai_well_sweet',
    trigger: 'explore',
    poi: 'zhai_well',
    nodes: ZHAI,
    once: true,
    cond: (s) => flag(s, 'gu_cleared'),
    title: '寨井',
    text: '井邊排著挑水的隊。看見你，排在最前面的婦人硬是把第一桶水讓給了你。\n\n水又清又甜，涼得牙根發酸。',
    choices: [{ text: '喝一大口。', out: { effects: [['hp', 0.3], ['mind', 3]] } }],
  },

  {
    id: 'zhai_elder',
    trigger: 'visit',
    npc: 'yan_bo',
    nodes: ZHAI,
    title: '岩伯',
    text: (s) => {
      if (flag(s, 'gu_cleared')) return '岩伯在屋前曬太陽。見你來了，他笑出一臉皺紋：「恩人來了。坐，坐。」';
      if (motherDead(s)) return '岩伯看見你身上的血，一下子站了起來。';
      if (flag(s, 'gu_task')) return '岩伯在屋前抽著旱煙。看見你，他把煙桿放下：「谷裡怎麼樣了？」';
      return '岩伯坐在寨老屋前的竹椅上，瞇著眼，看寨子裡的人來來去去。\n\n「寨井的事，你也聽說了吧。」他嘆了口氣。';
    },
    choices: [
      {
        text: '「寨井的事，我幫你查。」',
        show: (s) => !flag(s, 'gu_task') && !motherDead(s),
        out: {
          text: '岩伯盯著你看了很久，像在掂量你的斤兩。\n\n「寨子喝的水，是從東邊山裡引來的。竹筧一節接一節，走了三十里。」他用煙桿在地上畫了一條線，「竹筧的源頭，在萬蠱谷的谷口。」\n\n「三十年前，上一任寨老帶著人進谷，把蠱母封在了谷底。如今……」他沒說下去。\n\n「去問問阿蘿。蠱的事，她比我懂。」',
          effects: [['flag', 'gu_task'], ['flag', 'gu_heard'], ['sysexp', 10], ['log', '答應岩伯，查寨井發苦的事']],
        },
      },
      {
        text: '「三十年前，寨子是怎麼封住蠱母的？」',
        show: (s) => flag(s, 'gu_task') && !flag(s, 'yanbo_story'),
        out: {
          text: '岩伯沉默了很久。\n\n「上一任寨老，是我哥。」他說，「他帶了九個人進谷，用火，用刀，用寨子裡傳下來的法子，把蠱母逼回了谷底的洞裡，再拿石頭封上。」\n\n「出來的，只有我一個。」\n\n他把煙桿在鞋底上磕了磕：「那年我四十四。我哥的名字，叫岩松。」',
          effects: [['flag', 'yanbo_story'], ['favor', 'yan_bo', 5], ['insight', 1]],
        },
      },
      {
        text: '「水簾洞的石壁上，落款是一個「岩」字。」',
        show: (s) => flag(s, 'houtu_read') && !flag(s, 'yanbo_cave'),
        out: {
          text: '岩伯手裡的煙桿停住了。\n\n「……那是我爺爺。」他說，「寨子裡都說他年輕時是個修士，後來不知道去了哪裡。原來，他是躲到瀑布後頭去了。」\n\n他看著你，眼眶有點紅：「他的東西，你學會了，就是他的傳人。好好用。」',
          effects: [['flag', 'yanbo_cave'], ['favor', 'yan_bo', 10], ['mind', 3]],
        },
      },
      {
        text: '「蠱母死了。」',
        show: (s) => motherDead(s) && !flag(s, 'gu_nest_burned'),
        out: {
          text: '岩伯的手抖了一下。他抓住你的手臂：「巢呢？蠱母的巢燒了沒有？」\n\n「蠱母死了，巢裡的卵還在。不燒乾淨，明年開春，又是一窩。」',
          effects: [['flag', 'gu_task'], ['flag', 'gu_nest_told']],
        },
      },
      {
        text: '「蠱母死了，巢也燒了。」',
        show: (s) => motherDead(s) && flag(s, 'gu_nest_burned') && !flag(s, 'gu_cleared'),
        out: {
          text: '岩伯沒有說話。他慢慢地轉過身，朝著萬蠱谷的方向跪了下去，磕了三個頭。\n\n那天晚上，寨子裡吹了一夜的蘆笙。第二天一早，寨井的水，清了。\n\n岩伯把一個布包塞到你手裡：「寨子窮，就這些。你別嫌棄。」又說：「阿蘿有東西要給你，你去找她。」',
          effects: [
            ['flag', 'gu_cleared'], ['flag', 'zhai_trust'], ['ls', 120], ['item', 'bizhang_pill', 3], ['favor', 'yan_bo', 30], ['sysexp', 40],
            ['log', '除了萬蠱谷的蠱母，青竹寨的井水清了'], ['rumor', '聽說有個東荒來的修士，翻過山隘，在南嶺的萬蠱谷裡除了一條蠱母。'],
          ],
        },
      },
      {
        text: '「還沒有。」',
        show: (s) => flag(s, 'gu_task') && !motherDead(s),
        out: { text: '岩伯點點頭，又拿起煙桿：「不急。命要緊。」' },
      },
      {
        text: '陪他坐一會兒。',
        out: {
          text: (s) =>
            variant(s, [
              '你們坐著，看寨子裡的孩子在竹樓之間追來追去。岩伯一句話也沒說，你也是。',
              '岩伯給你講寨子裡的事：誰家的牛又跑了，誰家的姑娘要嫁到山那邊去。講著講著，他就睡著了。',
              '岩伯教你說了幾句寨子裡的話。「你好」，「謝謝」，還有「這碗酒，我先乾了」。',
            ]),
          effects: [['favor', 'yan_bo', 2], ['mind', 2]],
        },
      },
    ],
  },

  {
    id: 'zhai_luo',
    trigger: 'visit',
    npc: 'a_luo',
    nodes: ZHAI,
    title: '阿蘿',
    text: (s) =>
      flag(s, 'gu_cleared')
        ? '阿蘿坐在藥鋪門口搗藥。看見你，她停下杵，難得地笑了一下。手腕上那條青蛇，也懶洋洋地抬了抬頭。'
        : '阿蘿坐在藥鋪門口搗藥。手腕上那條青蛇昂起頭，看著你。\n\n「要買藥，進鋪子。要問事，坐下。」',
    choices: [
      {
        text: '「寨井裡的死蟲……」',
        show: (s) => (flag(s, 'well_seen') || flag(s, 'gu_task')) && !flag(s, 'luo_told'),
        out: {
          text: '阿蘿接過你遞來的死蟲，看了一眼，就扔進了火塘。\n\n「金線蠱，蠱母的崽子。」她說，「萬蠱谷裡的蠱母醒了。三十年前寨子用命把牠封在谷底，封印鬆了。」\n\n「蠱母一醒，就要產卵。卵順著水走——寨子的竹筧，就是從谷口引的水。」\n\n她看著你：「你要進谷，記住三件事：瘴氣、蠱蟲、蠱母。瘴氣，用我的避瘴丹擋；蠱蟲怕火；蠱母也怕火，可牠的殼，刀砍不進。」',
          effects: [['flag', 'luo_told'], ['flag', 'gu_task'], ['sysexp', 10], ['log', '阿蘿說：萬蠱谷的蠱母醒了']],
        },
      },
      {
        text: '「岩伯說，你有東西要給我。」',
        show: (s) => flag(s, 'gu_cleared') && !flag(s, 'bizhang_gu'),
        out: {
          text: '阿蘿從竹樓上取下一個小竹筒，倒出一隻米粒大的白蟲，放在你的手背上。白蟲一下子鑽了進去，一點也不疼。\n\n「避瘴蠱。」她說，「養在你血裡，一輩子。從今往後，南嶺的瘴氣，近不了你的身。」\n\n她又笑了笑：「別怕。牠吃瘴氣，不吃人。」',
          effects: [['flag', 'bizhang_gu'], ['favor', 'a_luo', 15], ['sysexp', 15], ['log', '阿蘿在你血裡種了避瘴蠱：南嶺的瘴氣，從此近不了身']],
        },
      },
      {
        text: '「避瘴丹，怎麼配？」',
        show: (s) => !flag(s, 'recipe_bizhang'),
        need: (s) => (has(s, 'zhangling_zhi', 2) ? null : '要先帶兩朵瘴靈芝來（瘴林裡有）'),
        out: {
          text: '阿蘿看了看你手裡的瘴靈芝：「你倒是識貨。」\n\n她把你帶進藥鋪後頭，當著你的面配了一爐：瘴靈芝兩朵，蟾酥一錢，火要小，要慢。\n\n「記住了？」她把兩顆丹塞給你，「記不住，就多來買幾顆。」',
          effects: [['item', 'zhangling_zhi', -2], ['item', 'bizhang_pill', 2], ['flag', 'recipe_bizhang'], ['favor', 'a_luo', 6], ['log', '跟阿蘿學會了避瘴丹的丹方']],
        },
      },
      {
        text: '「你手上那條蛇……」',
        show: (s) => favor(s, 'a_luo') >= 10 && !flag(s, 'luo_snake'),
        out: {
          text: '阿蘿低頭看了看手腕上的青蛇。蛇也抬頭看她。\n\n「牠叫小青，是我的本命蠱。」她說，「我七歲那年，我娘把牠放進我的碗裡。我哭了一整夜，第二天，牠就再也離不開我了。」\n\n「養蠱的人，一輩子只有一條本命蠱。牠死，我也活不長。」',
          effects: [['flag', 'luo_snake'], ['favor', 'a_luo', 4], ['insight', 1]],
        },
      },
      {
        text: '幫她搗一天藥。',
        out: {
          text: '你搗了一整天的藥。阿蘿一邊挑揀，一邊告訴你哪一味治什麼。傍晚，她數了幾塊靈石給你，又說：「手還算穩。」',
          effects: [['days', 1], ['ls', 4], ['favor', 'a_luo', 3]],
        },
      },
    ],
  },

  {
    id: 'zhai_shan',
    trigger: 'visit',
    npc: 'a_shan',
    nodes: ZHAI,
    title: '阿山',
    text: (s) => {
      if (flag(s, 'a_shui_saved')) return '阿山和弟弟阿水坐在竹樓下，分一隻烤山雞。看見你，阿水跳起來直招手。';
      if (flag(s, 'a_shui_found')) return '阿山家的竹樓裡飄出藥味。阿水躺在火塘邊，臉色還是青的，可是醒著。\n\n阿山站在門口，看著你，不知道該說什麼。';
      if (flag(s, 'a_shui_lost')) return '阿山蹲在竹樓下擦弓，一遍又一遍。\n\n「白絲洞，在瘴林的南邊。」他頭也不抬地說。';
      return '阿山蹲在竹樓下擦弓。看見你，他站了起來，又蹲了下去。\n\n過了好一會兒，他才開口，聲音很低：「你是修士？……我弟弟阿水，四天前進瘴林採瘴靈芝，到現在還沒回來。」\n\n「我進去找過。林子深處，有一片白絲洞，我不敢再往裡走。」';
    },
    choices: [
      {
        text: '「我去找。」',
        show: (s) => !flag(s, 'a_shui_lost'),
        out: {
          text: '阿山看著你，用力點了一下頭。\n\n「瘴林南邊，順著往毒沼去的小路走，路的西邊。」他說，「那裡的樹上，全是白絲。」',
          effects: [['flag', 'a_shui_lost'], ['meet', 'a_shan'], ['sysexp', 5], ['log', '答應阿山，去瘴林找他的弟弟阿水']],
        },
      },
      {
        text: '「瘴林那麼大……」',
        show: (s) => !flag(s, 'a_shui_lost'),
        out: { text: '阿山沒有再說話，低下頭，接著擦他的弓。', effects: [['flag', 'a_shui_lost'], ['meet', 'a_shan']] },
      },
      {
        text: '「我這就去。」',
        show: (s) => flag(s, 'a_shui_lost') && !flag(s, 'a_shui_found'),
        out: { text: '阿山點點頭。' },
      },
      {
        text: '「阿水好些了嗎？」',
        show: (s) => flag(s, 'a_shui_found') && !flag(s, 'a_shui_saved'),
        out: {
          text: '阿山把你拉進屋裡，從床底下拖出一個竹箱，把裡面的東西全倒在你面前：幾團毒蛛絲，一小袋靈石，還有一把磨得發亮的骨刀。\n\n「我們家，就這些了。」\n\n阿水在火塘邊撐起身子：「哥，跟他說那個光的事。」\n\n「……阿水說，他上個月在碧潭邊採藥，看見瀑布後面有光。」阿山說，「我們寨子裡的人，誰也不敢靠近那道瀑布。你是修士，你也許能去。」',
          effects: [['flag', 'a_shui_saved'], ['flag', 'falls_hint'], ['flag', 'zhai_trust'], ['item', 'spider_silk', 3], ['ls', 25], ['favor', 'a_shan', 30], ['sysexp', 20], ['log', '把阿水送回了青竹寨']],
        },
      },
      {
        text: '坐下，一起吃。',
        show: (s) => flag(s, 'a_shui_saved'),
        out: {
          text: (s) =>
            variant(s, [
              '山雞烤得焦香。阿水嘴裡塞得滿滿的，還不停地問你東荒是什麼樣子。',
              '阿山話還是不多，可是把最大的一塊雞腿撕給了你。',
              '吃完了，阿水拿出一支竹笛，吹了一首寨子裡的歌。阿山跟著哼，跑了調。',
            ]),
          effects: [['hp', 0.3], ['mind', 3], ['favor', 'a_shan', 2]],
        },
      },
      {
        text: '跟阿山進山打獵。',
        show: (s) => flag(s, 'a_shui_saved'),
        out: {
          text: '你跟著阿山在山裡走了兩天。他教你看獸道，聽鳥叫，找水。回來的時候，你們扛著一頭山羊。',
          effects: [['days', 2], ['ls', 8], ['favor', 'a_shan', 4], ['mind', 2]],
        },
      },
    ],
  },

  {
    id: 'zhai_inquire',
    trigger: 'inquire',
    nodes: ZHAI,
    cooldown: 5,
    title: '銅鼓坪',
    text: '銅鼓坪上，幾個老人圍著火塘坐著。坪中央架著一面銅鼓，鼓面上刻著太陽和一圈一圈的蟲紋。',
    choices: [
      {
        text: '打聽萬蠱谷。',
        out: { text: '「萬蠱谷？」一個缺了牙的老人搖搖頭，「谷口一塊石碑，寫著生人勿入。三十年前進去十個，出來一個。那一個，就是岩伯。」', effects: [['discover', 'wangu_valley']] },
      },
      {
        text: '打聽毒沼。',
        out: {
          text: '「毒沼正中，有兩個石人。」一個老婆婆說，「石人看著的地方，開著一朵蓮花，白的，一年四季都不謝。」\n\n「有人去摘過嗎？」\n\n「有。」老婆婆說，「蓮花邊上，住著一隻蟾，比磨盤還大。」',
          effects: [['discover', 'poison_marsh'], ['flag', 'lotus_hint']],
        },
      },
      {
        text: '打聽碧潭。',
        out: {
          text: '「碧潭的水，是從萬蠱谷流出來的，可是比谷裡的乾淨。」一個老人說，「瀑布底下的水，打在石頭上，什麼髒東西都打散了。」\n\n他想了想，又說：「我小時候聽我爺爺說，瀑布後頭住過一個仙人。」',
          effects: [['discover', 'jade_pool']],
        },
      },
    ],
  },

  // ── 嶺口: 韓三, and his pack ──
  {
    id: 'pass_han',
    trigger: 'visit',
    npc: 'han_san',
    nodes: PASS,
    title: '韓三',
    text: '韓三蹲在火塘邊，烤著一隻說不出名字的鳥。看見你，他往旁邊挪了挪：「坐。」',
    choices: [
      {
        text: '「南嶺什麼樣？」',
        show: (s) => !flag(s, 'han_told'),
        out: {
          text: '「什麼樣？」韓三笑了一聲，「看我這樣，就知道南嶺什麼樣了。」\n\n「往下走，先到青竹寨。寨子裡的人不壞，就是不愛搭理外人。西邊是瘴林，瘴氣要人命——進去之前，記得買避瘴丹，寨子裡的阿蘿有賣。南邊是毒沼；東邊的萬蠱谷……」他搖搖頭，「別去。」\n\n「我在瘴林裡被一窩毒蛛追著跑了半天，包袱都丟了。裡頭是我攢了十年的家當。」',
          effects: [['flag', 'han_told'], ['discover', 'qingzhu_village'], ['discover', 'miasma_forest'], ['sysexp', 5]],
        },
      },
      {
        text: '把包袱還給他。',
        show: (s) => has(s, 'han_pack'),
        out: {
          text: (s) =>
            `韓三接過包袱，手都在抖。他摸著上面那個「韓」字，好半天沒說話。\n\n${s.player.techs?.includes('lianxi') ? '他從包袱裡數出一把靈石塞給你：「我這輩子沒什麼本事，攢下的就這些。你拿著。」' : '他從包袱裡拿出一本冊子塞給你：「我這輩子沒什麼本事，就這本《斂息訣》是保命的東西。給你。」'}\n\n包袱裡還有一塊木牌，刻著兩個名字。他把木牌揣進懷裡，貼著胸口。`,
          effects: (s) => [
            ['item', 'han_pack', -1], ['flag', 'han_pack_returned'], ['favor', 'han_san', 30], ['mind', 4], ['sysexp', 10],
            ...(s.player.techs?.includes('lianxi') ? [['ls', 60]] : [['item', 'book_lianxi', 1]]),
            ['log', '把丟在瘴林裡的包袱還給了韓三'],
          ],
        },
      },
      {
        text: '「一起下去？」',
        show: (s) => flag(s, 'han_told') && !flag(s, 'han_waits'),
        out: {
          text: '韓三看著火，很久沒說話。\n\n「不了。」他說，「我在等一個人。等他從瘴林裡出來。」\n\n火塘裡的柴劈啪響了一聲。你沒有問那個人是誰。',
          effects: [['flag', 'han_waits'], ['mind', 1]],
        },
      },
      {
        text: '分他一口乾糧。',
        out: { text: '韓三接過去，掰了一半還給你：「路還長。」', effects: [['favor', 'han_san', 3], ['mind', 1]] },
      },
    ],
  },

  {
    id: 'zl_han_pack',
    trigger: 'explore',
    poi: 'han_pack',
    nodes: FOREST,
    once: true,
    title: '掛在樹上的包袱',
    text: '一個灰布包袱掛在樹杈上，被白絲纏了好幾圈，像是從什麼東西嘴邊硬扯下來的。包袱上縫著一個「韓」字。',
    choices: [
      {
        text: '取下來，帶出去還給主人。',
        out: { text: '你割開白絲，把包袱取了下來。沉甸甸的。', effects: [['item', 'han_pack', 1], ['flag', 'han_pack_found']] },
      },
      {
        text: '打開，拿走值錢的。',
        karma: true,
        out: {
          text: '包袱裡有幾十塊靈石，一本手抄的冊子，幾件換洗衣服，還有一塊刻著兩個名字的木牌。\n\n你把靈石揣進懷裡，把剩下的連同包袱，扔回了林子裡。',
          effects: [['ls', 45], ['flag', 'han_pack_found'], ['flag', 'han_pack_kept'], ['mind', -3]],
        },
      },
    ],
  },

  // ── 瘴林: 阿水 ──
  {
    id: 'zl_a_shui',
    trigger: 'explore',
    poi: 'web_hollow',
    auto: true,
    nodes: FOREST,
    cond: (s) => flag(s, 'a_shui_lost') && !flag(s, 'a_shui_found'),
    title: '白絲洞',
    text: '兩棵老樹之間，白絲掛了一層又一層。絲裡裹著一團一團的東西——兔子、山雞、一隻小鹿。\n\n最大的一團，是個人。他還在動。\n\n樹上，有什麼東西慢慢地爬了下來。',
    choices: [
      {
        text: '動手。',
        check: { kind: 'power', diff: 40 },
        fight: { foes: [['spider', 3]] },
        ok: {
          text: '最後一隻毒蛛摔在地上，八條腿抽了幾下，不動了。\n\n你割開白絲。裡面是個十四五歲的少年，嘴唇發紫，還有氣。\n\n「哥……」他說，「我哥呢？」\n\n你把他背出了瘴林，一路背回青竹寨。',
          effects: [['flag', 'a_shui_found'], ['sysexp', 15], ['log', '在瘴林的白絲洞救下了阿水']],
        },
        fail: {
          text: '你倒在白絲洞前。醒來的時候，你躺在林子邊上，渾身發麻。\n\n白絲洞還在那裡。那個人，應該也還在。',
          effects: [['hurt', 1]],
        },
      },
      {
        text: '燒一張火符，把牠們逼開。',
        show: (s) => has(s, 'fire_talisman'),
        out: {
          text: '火符一燒，一團火砸進白絲裡。白絲遇火就捲，樹上的毒蛛尖叫著往上逃。\n\n你趁著火勢割開最大的那一團。裡面是個十四五歲的少年，嘴唇發紫，還有氣。\n\n你把他背出了瘴林，一路背回青竹寨。',
          effects: [['item', 'fire_talisman', -1], ['flag', 'a_shui_found'], ['sysexp', 15], ['log', '在瘴林的白絲洞救下了阿水']],
        },
      },
      { text: '先退出去。', out: { text: '你慢慢地退出了白絲洞。樹上的東西，沒有追出來。' } },
    ],
  },

  // ── 碧潭: the falls, and the cave behind them ──
  {
    id: 'bt_falls',
    trigger: 'explore',
    poi: 'falls',
    nodes: POOL,
    title: '瀑布',
    text: (s) =>
      flag(s, 'falls_cave_found')
        ? '碧水從斷崖上直落下來。水簾後面，是你知道的那個石洞。'
        : `碧水從斷崖上直落下來，砸進潭裡，轟隆隆的，震得腳下的石頭都在抖。水霧騰起一丈多高，太陽一照，掛著一道虹。${flag(s, 'falls_hint') ? '\n\n你瞇起眼睛。水簾後面，好像真有一點微微的亮。' : ''}`,
    choices: [
      {
        text: '穿過水簾。',
        show: (s) => flag(s, 'falls_hint') && !flag(s, 'falls_cave_found'),
        need: (s) => (s.player.realm >= 1 ? null : '水太重，凡人穿不過去'),
        out: {
          text: '你運起靈力護住周身，一頭撞進了水簾。\n\n水砸在身上，重得像石頭。你咬著牙往前走了三步——\n\n眼前一暗，又一亮。水聲忽然遠了。你站在一個乾燥的石洞裡，洞壁上刻滿了字。',
          effects: [['flag', 'falls_cave_found'], ['discover', 'water_cave'], ['move', 'water_cave'], ['sysexp', 15], ['log', '在碧潭的瀑布後面，找到了水簾洞']],
        },
      },
      {
        text: '用神識探一探水簾後面。',
        show: (s) => !flag(s, 'falls_hint') && s.player.realm >= 1,
        need: (s) => (mpNow(s) >= 8 ? null : '靈力不足（需 8）'),
        out: {
          text: '你的神識撞上水簾，碎成一片。你又試了一次，這回順著水的縫隙鑽了過去——\n\n水簾後面，是空的。一個洞。',
          effects: [['mp', -8], ['flag', 'falls_hint'], ['insight', 1]],
        },
      },
      {
        text: '進水簾洞。',
        show: (s) => flag(s, 'falls_cave_found'),
        out: { text: '你穿過水簾。水聲一下子遠了。', effects: [['move', 'water_cave']] },
      },
      { text: '看一會兒。', out: { text: '你在潭邊坐了很久。水霧撲在臉上，涼絲絲的。', effects: [['mind', 2]] } },
    ],
  },

  {
    id: 'cave_carvings_read',
    trigger: 'explore',
    poi: 'cave_carvings',
    nodes: ['water_cave'],
    once: true,
    title: '水簾洞',
    text: '洞不大，乾燥，清涼。外面的水聲隔著水簾，聽起來像下著一場很遠的雨。\n\n石壁上刻滿了字，一筆一劃，深得能放進一根手指。開頭四個字：「厚土載物」。\n\n落款，只有一個「岩」字。',
    choices: [
      {
        text: '靜下心來，從頭讀起。',
        out: {
          text: '你在石壁前坐了三天三夜。\n\n字裡講的是土：土怎麼承著山，山怎麼壓著土，土又怎麼一聲不吭地，把一切都承下來。\n\n等你站起來的時候，腳下的石頭，好像和你連在了一起。',
          effects: [['days', 3], ['tech', 'houtu'], ['insight', 2], ['sysexp', 20], ['flag', 'houtu_read'], ['log', '在水簾洞參悟石壁，學會了《厚土訣》']],
        },
      },
    ],
  },

  // ── 萬蠱谷 ──
  {
    id: 'gu_stele',
    trigger: 'explore',
    poi: 'valley_stele',
    nodes: VALLEY,
    title: '谷口石碑',
    text: (s) =>
      `一塊黑石碑立在谷口，碑上刻著四個字：「生人勿入」。字縫裡塞滿了蟲殼。\n\n碑腳下擺著幾個陶碗，碗裡的東西早就乾了。往谷裡看，石壁陡得像刀切的，霧是淡紫色的。${flag(s, 'yanbo_story') ? '\n\n碑的背面，刻著十個名字。第一個是「岩松」。' : ''}`,
    choices: [
      { text: '在碑前放一塊靈石。', need: (s) => (s.player.ls >= 1 ? null : '身上沒有靈石'), out: { text: '你把一塊靈石放進陶碗裡。', effects: [['ls', -1], ['mind', 1]] } },
      { text: '進谷。', out: {} },
    ],
  },

  {
    id: 'gu_nest_burn',
    trigger: 'explore',
    poi: 'gu_nest',
    auto: true,
    nodes: VALLEY,
    once: true,
    cond: (s) => motherDead(s),
    title: '蠱巢',
    text: '蠱母的屍身橫在巢口，甲殼上的金光一點一點暗了下去。\n\n洞裡堆著一層又一層的蟲卵，黑亮黑亮的，有的已經裂開了口子，裡面有東西在動。',
    choices: [
      {
        text: '一把火，燒乾淨。',
        out: {
          text: '你把枯枝和蟲殼堆在洞口，點上了火。\n\n火一直燒到天黑。洞裡有東西在尖叫，叫了很久，然後就沒有聲音了。\n\n風吹過來，帶著一點灰。萬蠱谷裡的嗡嗡聲，好像也輕了一些。',
          effects: [['flag', 'gu_nest_burned'], ['sysexp', 10], ['mind', 2], ['log', '燒了萬蠱谷的蠱巢']],
        },
      },
    ],
  },

  // ── the miasma ──
  {
    id: 'nl_miasma',
    trigger: 'explore',
    poi: MIASMA,
    auto: true,
    nodes: [...FOREST, ...MARSH, ...VALLEY],
    cooldown: 8,
    weight: 7,
    cond: (s) => !proof(s),
    title: '瘴氣',
    text: (s) =>
      variant(s, [
        '霧忽然濃了，淡紫色的，甜得發膩。你吸了一口，眼前就花了。\n\n瘴氣。',
        '腳下的落葉裡冒出一縷一縷的紫煙，越冒越多。等你察覺，四周已經看不清了。\n\n瘴氣。',
        '風停了。霧從地上升起來，帶著一股爛果子的甜味。你的喉嚨一下子發緊。\n\n瘴氣。',
      ]),
    choices: [
      {
        text: '服一顆避瘴丹。',
        show: (s) => has(s, 'bizhang_pill'),
        out: { text: '丹藥入口，一股辛氣直衝腦門。紫霧碰到你，就散開了。往後幾天，瘴氣都近不了身。', effects: [['item', 'bizhang_pill', -1], ['buff', 'bizhang', 3]] },
      },
      {
        text: '服下解毒丹。',
        show: (s) => has(s, 'detox_pill'),
        out: { text: '解毒丹壓住了吸進去的那一口。你屏住呼吸衝了出去——南嶺的瘴氣，比東荒的凶。', effects: [['item', 'detox_pill', -1]] },
      },
      {
        text: '燒一張避瘴符。',
        show: (s) => has(s, 'miasma_talisman'),
        out: { text: '符紙一燃，一圈淡淡的清光罩住了你。紫霧碰到清光就散開，你從容走了出去。', effects: [['item', 'miasma_talisman', -1]] },
      },
      {
        text: '提一口靈力，封住口鼻。',
        show: (s) => s.player.realm >= 1,
        need: (s) => (mpNow(s) >= 15 ? null : '靈力不足（需 15）'),
        out: { text: '你提起一口靈力，封住口鼻與周身毛孔，一步一步走出了瘴氣。出來時，丹田空了一大截。', effects: [['mp', -15]] },
      },
      {
        text: '閉氣衝出去。',
        check: { kind: 'gengu', diff: 7 },
        ok: { text: '你憋著一口氣跑了半里地，衝出瘴氣的時候，臉都青了。', effects: [] },
        fail: { text: '你吸進了一口。眼前一黑，再醒來，已經過了兩天，渾身發軟，嘴裡發苦。', effects: [['days', 2], ['hurt', 1, '瘴毒入骨']] },
      },
    ],
  },

  // ── the first time in each wild place ──
  {
    id: 'zl_arrive',
    trigger: 'arrive',
    nodes: FOREST,
    once: true,
    title: '瘴林',
    text: '一走進林子，光就變成了綠的。\n\n樹幹上爬滿了藤，藤上開著小小的白花，甜得發膩。頭頂的樹枝間掛著一團一團的白絲，風一吹，輕輕地晃。腳下的落葉是濕的，踩下去沒有一點聲音。\n\n叮——偵測到瘴氣。本系統建議宿主：備好避瘴丹，別在紫霧裡久留。',
    choices: [{ text: '屏住呼吸，往裡走。', out: { effects: [['sysexp', 3]] } }],
  },
  {
    id: 'zz_arrive',
    trigger: 'arrive',
    nodes: MARSH,
    once: true,
    title: '毒沼',
    text: '林子到了盡頭，眼前是一望無際的蘆葦和死水。水面上浮著一層油亮的光，底下時不時冒起一串泡。\n\n遠處的蘆葦叢裡立著兩個石人，只露出上半身，臉朝著沼地正中。\n\n蛙聲一陣一陣的，聽得人心裡發毛。',
    choices: [{ text: '找結實的地方下腳。', out: { effects: [['sysexp', 3]] } }],
  },
  {
    id: 'gu_arrive',
    trigger: 'arrive',
    nodes: VALLEY,
    once: true,
    title: '萬蠱谷',
    text: '峽口很窄，兩邊的石壁陡得像刀切的。走過峽口，谷忽然開闊起來——四面都是峭壁，谷底一片林子，林子上浮著淡紫色的霧。\n\n石壁上、樹幹上、地上，到處都是蟲殼。嗡嗡聲從四面八方傳過來，分不清是遠是近。\n\n叮——此地危險等級：極高。本系統建議宿主：退出去。',
    choices: [
      { text: '不退。', out: { effects: [['sysexp', 5]] } },
      { text: '……先退出去，準備好了再來。', out: { effects: [['sysexp', 2]] } },
    ],
  },
  {
    id: 'bt_arrive',
    trigger: 'arrive',
    nodes: POOL,
    once: true,
    title: '碧潭',
    text: '水聲越來越大，大得蓋過了一切。\n\n轉過一根石峰，眼前是一道斷崖。碧水從崖頂直落下來，砸進一潭深綠的水裡，水霧騰起一丈多高，太陽一照，掛著一道虹。\n\n瘴林裡憋了一路的那口氣，到這裡才吐出來。',
    choices: [{ text: '在潭邊歇一歇。', out: { effects: [['mind', 3], ['sysexp', 3]] } }],
  },

  // ── on the paths of 南嶺 ──
  {
    id: 'nl_herb_girl',
    trigger: 'explore',
    nodes: [...WILDS, ...POOL],
    cooldown: 60,
    title: '採藥的姑娘',
    text: '一個背著竹簍的寨子姑娘蹲在石峰腳下，正用小鋤頭挖什麼。看見你，她也不怕，招招手：「你也是來採藥的？」\n\n她簍子裡是幾朵紫黑色的靈芝。',
    choices: [
      {
        text: '「這是什麼？」',
        out: {
          text: '「瘴靈芝。」她說，「長在瘴氣重的地方，越毒的地方長得越好。阿蘿姐拿它配避瘴丹。」\n\n她把最小的一朵塞給你：「送你。下回進瘴林，記得低頭看樹根。」',
          effects: [['item', 'zhangling_zhi', 1], ['mind', 1]],
        },
      },
      {
        text: '幫她挖。',
        out: { text: '你們挖了一個下午。她分給你兩朵，自己背著滿滿一簍，唱著歌走了。', effects: [['item', 'zhangling_zhi', 2]] },
      },
    ],
  },

  {
    id: 'nl_monkeys',
    trigger: 'explore',
    nodes: WILDS,
    cooldown: 45,
    title: '猴子',
    text: '頭頂的石峰上嘩啦一響，一群猴子從崖上竄下來，圍著你吱吱叫。一隻膽大的，一把抓走了你掛在腰上的乾糧袋。',
    choices: [
      {
        text: '追上去。',
        check: { kind: 'gengu', diff: 6 },
        ok: { text: '你三兩步躥上石峰，把乾糧袋搶了回來。那隻猴子氣得直跳腳，扔下一個野果跑了。', effects: [['hp', 0.15], ['mind', 1]] },
        fail: { text: '猴子在石峰上蹦了幾下，就不見了。你站在崖下，喘得像頭牛。', effects: [['mind', -1]] },
      },
      { text: '算了，給牠們吧。', out: { text: '猴子們分完了乾糧，在崖上看著你，好像有點不好意思。', effects: [['mind', 2]] } },
    ],
  },

  {
    id: 'zl_bones',
    trigger: 'explore',
    nodes: FOREST,
    once: true,
    title: '白絲裡的骸骨',
    text: '一棵倒下的老樹底下，裹著一團發黃的白絲。白絲破了個口子，露出一截白骨，和半片道袍。\n\n他身邊落著一個儲物袋，袋口的符文，已經暗了。',
    choices: [
      {
        text: '埋了他，再看袋子。',
        out: {
          text: '你挖了個淺坑，把他埋了。儲物袋裡有二十來塊靈石，一株乾了的血參，和一件說不出用途的東西。',
          effects: [['ls', 22], ['item', 'blood_ginseng', 1], ['item', 'mystery', 1], ['mind', 2]],
        },
      },
      { text: '拿了袋子就走。', karma: true, out: { text: '你拿起儲物袋就走。身後的白絲，好像動了一下。', effects: [['ls', 22], ['item', 'mystery', 1], ['mind', -2]] } },
    ],
  },

  {
    id: 'zz_sink',
    trigger: 'explore',
    nodes: MARSH,
    cooldown: 30,
    title: '爛泥',
    text: '你一腳踩下去，泥沒過了膝蓋。再一動，又往下陷了一截。四周的蘆葦一動不動，水面上冒起一串泡。',
    choices: [
      {
        text: '提氣，一躍而起。',
        show: (s) => (s.player.techs || []).some((t) => t === 'qingshen' || t === 'tayun'),
        out: { text: '你提一口氣，腳下一點，整個人從泥裡拔了出來，落在一叢蘆葦上。', effects: [['mp', -3]] },
      },
      {
        text: '抓住蘆葦，慢慢爬出來。',
        check: { kind: 'gengu', diff: 6 },
        ok: { text: '你抓著一把蘆葦，一點一點把自己拔了出來。鞋子沒了一隻。', effects: [] },
        fail: { text: '你掙扎得越凶，陷得越快。等你終於爬出來的時候，天都黑了，渾身又冷又麻。', effects: [['hurt', 1]] },
      },
    ],
  },

  {
    id: 'gu_husk',
    trigger: 'explore',
    nodes: VALLEY,
    once: true,
    title: '蛻下的殼',
    text: '石壁底下靠著一張蛻下來的殼，空的，金黃泛銅色，一節一節的，比一條船還長。殼上的每一節，都長著兩排腿。\n\n你站在它旁邊，覺得自己很小。',
    choices: [{ text: '繞過去。', out: { effects: [['sysexp', 5], ['mind', -1]] } }],
  },

  {
    id: 'bt_old_fisher',
    trigger: 'explore',
    nodes: POOL,
    cond: (s) => !flag(s, 'falls_hint'),
    once: true,
    title: '潭邊的老漁翁',
    text: '潭邊的石頭上，坐著一個戴斗笠的老漁翁。魚竿一動不動。\n\n「後生，」他頭也不回地說，「這潭裡沒有魚。」\n\n「那您釣什麼？」\n\n老漁翁笑了，用魚竿指了指瀑布：「我在等它後面那個人出來。等了五十年了。」',
    choices: [
      {
        text: '「瀑布後面有人？」',
        out: { text: '老漁翁不說話了。你再看時，石頭上只剩下一根魚竿，斜斜地插在石縫裡。', effects: [['flag', 'falls_hint'], ['insight', 1]] },
      },
    ],
  },

  {
    id: 'pass_view',
    trigger: 'explore',
    nodes: PASS,
    once: true,
    title: '回望',
    text: '你在嶺口停下來，回頭看了一眼。\n\n北邊，東荒的田野只剩一片淡淡的青，青石鎮的方向，有一縷很細的炊煙。南邊，林子綠得發黑，石峰一根一根從霧裡拔起來，像另一個世界。',
    choices: [{ text: '往南走。', out: { effects: [['mind', 2]] } }],
  },
];
