import { WINDOWS } from '../../world/arcs.js';
import { dayAt } from '../../core/calendar.js';
import { has, flag, favor, alive, within, needLs, variant, night } from '../helpers.js';

const T = ['qingshi_town'];

export default [
  {
    id: 'town_return',
    trigger: 'arrive',
    nodes: T,
    once: true,
    priority: 5,
    title: '回鎮',
    text: '青石鎮還是老樣子。石板路、老槐樹，街角賣糖人的老頭在打盹。\n\n「{name}！」王二從人群裡擠出來，一把抓住你的肩膀，「你跑哪去了？大家都說你掉下斷魂崖，屍骨無存了！」\n\n他上下打量你，忽然壓低了聲音：「你……是不是哪裡不一樣了？」',
    choices: [
      {
        text: '「我遇到了仙人。」',
        out: {
          text: '王二愣了一下，然後哈哈大笑：「你也學會吹牛了！」\n\n你沒有解釋，也沒法解釋。\n\n「對了，」他說，「你採的那些草藥，回春堂的孫掌櫃都收。他收得比誰都公道。」',
          effects: [['meet', 'wang_er'], ['favor', 'wang_er', 3], ['meet', 'sun_zg']],
        },
      },
      {
        text: '「沒什麼，命大。」',
        out: {
          text: '「命大好，命大好。」王二拍拍你，「走，我請你喝碗豆花，壓壓驚。」\n\n豆花攤上，他絮絮叨叨地說了一下午鎮上的事：林家那個廢了的少爺、沈家要攀高枝、回春堂孫掌櫃收草藥從不壓價……',
          effects: [['meet', 'wang_er'], ['favor', 'wang_er', 5], ['mind', 2], ['meet', 'sun_zg']],
        },
      },
    ],
  },

  {
    id: 'town_breakup',
    trigger: 'explore',
    poi: 'lin_gate',
    auto: true,
    nodes: T,
    once: true,
    priority: 10,
    cond: (s) => within(s, WINDOWS.breakup),
    title: '林家門前',
    text: '林家大門外圍滿了人。\n\n沈家的管事站在台階上，手捧一紙婚書，聲音大得半條街都聽得見：「我家小姐已被青雲宗長老看中，不日便要入宗修行。林家少爺修為盡失，這門親事——作罷！」\n\n人群裡響起一陣哄笑。台階下，那個叫林塵的少年攥著拳頭，指節發白，一言不發。\n\n轎簾掀開，沈清歌走了出來。她接過婚書，看了林塵一眼，然後——\n\n嘶啦。\n\n叮——檢測到異常的氣運波動。本系統等級不足，無法解析。',
    choices: [
      {
        text: '跟著起鬨：「廢物就該有廢物的樣子！」',
        karma: true,
        out: {
          text: '周圍的人笑得更大聲了。林塵轉過頭，看了你一眼。\n\n只是一眼。你卻莫名覺得後頸發涼，像是被什麼東西記住了。',
          effects: [
            ['flag', 'lin_mocked'], ['favor', 'lin_chen', -25], ['meet', 'lin_chen'], ['meet', 'shen_qingge'],
            ['flag', 'lin_breakup_seen'], ['sysexp', 10], ['log', '在林家門前看了一場退婚'],
          ],
        },
      },
      {
        text: '冷眼旁觀。',
        out: {
          text: '婚書的碎片落在台階上。林塵彎下腰，一片一片撿起來，收進懷裡。\n\n「三年。」他說，聲音不大，「三年之後，我親自登門。」\n\n人群一哄而散。你記住了這個日子。',
          effects: [
            ['flag', 'lin_pact_heard'], ['meet', 'lin_chen'], ['meet', 'shen_qingge'],
            ['flag', 'lin_breakup_seen'], ['sysexp', 10], ['log', '在林家門前看了一場退婚'],
          ],
        },
      },
      {
        text: '站出來說句公道話。',
        karma: true,
        out: {
          text: '「人家落了難，你們笑什麼？」你的聲音不大，卻讓幾個人停了笑。\n\n沈家的管事斜眼看你：「哪來的野小子？」\n\n你沒退。林塵抬起頭，第一次正眼看你。\n\n當天傍晚，趙虎的人在巷口堵住你，把你「教訓」了一頓。可你一直記得林塵那個眼神。',
          effects: [
            ['flag', 'lin_defended'], ['flag', 'lin_pact_heard'], ['favor', 'lin_chen', 30], ['meet', 'lin_chen'],
            ['meet', 'shen_qingge'], ['favor', 'shen_qingge', -10], ['hurt', 1], ['meet', 'zhao_hu'],
            ['favor', 'zhao_hu', -10], ['mind', 6], ['flag', 'lin_breakup_seen'], ['sysexp', 10],
            ['log', '在林家門前替林塵說了一句話'],
          ],
        },
      },
    ],
  },

  {
    id: 'town_lin_test',
    trigger: 'explore',
    poi: 'lin_gate',
    auto: true,
    nodes: T,
    once: true,
    priority: 8,
    cond: (s) => within(s, [dayAt(0, 7), dayAt(0, 8)]),
    title: '林家族比',
    text: '林家演武場今天格外熱鬧，三年一度的家族小比。\n\n林塵上台了，對手是他的堂兄林浩，煉氣三層。\n\n不到十招，林塵被一掌打下擂台，摔在你腳邊，嘴角掛著血。林浩站在台上，居高臨下：「廢物就是廢物。」\n\n林塵撐著地想站起來，又跌了回去。',
    choices: [
      {
        text: '扶他起來。',
        out: {
          text: '他的手很燙，掌心全是繭。\n\n「謝了。」他低聲說。\n\n你注意到他手上那枚黑戒指，似乎……閃了一下。',
          effects: [['favor', 'lin_chen', 10], ['meet', 'lin_chen'], ['flag', 'lin_test_seen']],
        },
      },
      {
        text: '遞給他一株止血草。',
        show: (s) => has(s, 'zhixue_grass'),
        out: {
          text: '林塵愣了一下，接過去，攥在手心裡。\n\n「我記住了。」他說。',
          effects: [['item', 'zhixue_grass', -1], ['favor', 'lin_chen', 15], ['meet', 'lin_chen'], ['flag', 'lin_test_seen']],
        },
      },
      {
        text: '轉身離開。',
        out: { text: '你走出演武場，身後又傳來一陣哄笑。', effects: [['flag', 'lin_test_seen']] },
      },
    ],
  },

  {
    id: 'town_pharmacy',
    trigger: 'visit',
    npc: 'sun_zg',
    nodes: T,
    title: '回春堂',
    text: '回春堂裡瀰漫著藥香。孫掌櫃在櫃檯後撥著算盤，見你進來，眼皮都沒抬：「有貨？」',
    choices: [
      {
        text: '把身上的凝氣草都賣給他。',
        show: (s) => has(s, 'ningqi_grass'),
        out: {
          text: (s) =>
            variant(s, [
              '孫掌櫃捏起一株凝氣草聞了聞，從抽屜裡數出幾塊靈石。\n\n「凡人的藥鋪，也收靈草？」你問。\n\n他笑了笑：「凡人的藥鋪，也得吃飯。」',
              '孫掌櫃一株一株地檢查，挑出兩株曬得不夠乾的，說下次注意，錢卻照樣給了。',
            ]),
          effects: [['sellall', 'ningqi_grass', 3], ['favor', 'sun_zg', 2]],
        },
      },
      {
        text: '幫忙曬藥，換點工錢。',
        out: {
          text: '你在後院翻曬了三天藥材。孫掌櫃給了你兩塊靈石，又多塞了一包陳皮：「泡水喝，順氣。」',
          effects: [['days', 3], ['ls', 2], ['favor', 'sun_zg', 3], ['mind', 1]],
        },
      },
      {
        text: '問他：「掌櫃的，你也是修士吧？」',
        show: (s) => favor(s, 'sun_zg') >= 8 && !flag(s, 'sun_revealed'),
        out: {
          text: '孫掌櫃的算盤停了。\n\n半晌，他嘆了口氣：「煉氣二層。三十年沒動過了。」他看著窗外，「年輕時也想過飛升。後來才明白，能在這小鎮上把日子過好，也是修行。」\n\n他從櫃檯底下拿出一個小瓷瓶推過來：「聚氣丹，放了好些年了，別嫌棄。」',
          effects: [['flag', 'sun_revealed'], ['item', 'juqi_pill', 1], ['favor', 'sun_zg', 5], ['insight', 1]],
        },
      },
      { text: '隨便看看。', out: { text: '你在藥櫃前站了一會兒，記住了幾十種藥材的名字。' } },
    ],
  },

  {
    id: 'town_bully',
    trigger: 'explore',
    poi: 'tofu_stall',
    auto: true,
    nodes: T,
    once: true,
    cond: (s) => !!s.seen.town_return && s.day >= 5,
    title: '豆花攤',
    text: '街口傳來哭喊聲。趙虎帶著兩個跟班，把賣豆花的老李頭的攤子掀翻在地，白花花的豆花灑了一地。\n\n「這個月的份子錢，少了三文。」趙虎一腳踩在老李頭手上。',
    choices: [
      {
        text: '上前阻止。',
        check: { kind: 'power', diff: 9 },
        ok: {
          text: '你一把扣住趙虎的手腕，輕輕一擰。他殺豬般地叫起來。\n\n你自己也愣了——你根本沒用力。\n\n趙虎帶著跟班落荒而逃，臨走撂下一句狠話。老李頭拉著你的手，眼淚都下來了。',
          effects: [
            ['meet', 'zhao_hu'], ['favor', 'zhao_hu', -30], ['flag', 'beat_zhao'], ['mind', 4], ['sysexp', 3],
            ['sched', 'zhao_revenge', 60, 180, { expire: 720 }],
          ],
        },
        fail: {
          text: '你衝上去，被趙虎一拳打在臉上，眼冒金星。三個人圍著你踢了半天才走。\n\n老李頭扶你起來，一邊替你擦血一邊罵：「傻孩子，你逞什麼強！」可他的手在發抖。',
          effects: [['meet', 'zhao_hu'], ['hurt', 1], ['favor', 'zhao_hu', -10], ['mind', 2]],
        },
      },
      {
        text: '去叫巡街的衙役。',
        out: { text: '衙役來了，看見是趙虎，又轉身走了。', effects: [['mind', -2]] },
      },
      {
        text: '當作沒看見。',
        out: { text: '你繞了遠路回家。那天晚上，你睡得不太好。', effects: [['mind', -3]] },
      },
    ],
  },

  {
    id: 'zhao_revenge',
    trigger: 'scheduled',
    nodes: T,
    cond: (s) => !flag(s, 'zhao_done'),
    title: '巷口',
    text: '你剛走進巷子，前後兩頭就被人堵住了。\n\n趙虎站在前面，身邊多了一個面色陰沉的中年人，腰間掛著一柄短劍。\n\n「表舅，就是他。」趙虎指著你。\n\n中年人打量你一眼，冷笑：「煉氣期的小輩，也敢在凡人地界逞威風？」\n\n一股讓你心悸的靈壓，壓了過來。',
    choices: [
      {
        text: '拔劍迎戰。',
        check: { kind: 'power', diff: 34 },
        ok: {
          text: '你們在窄巷裡交手了二十多招。最後一劍，你削斷了他的劍穗。\n\n中年人臉色變了又變，扔下一句「後會有期」，拽著趙虎走了。\n\n從此以後，趙虎見了你就繞道。',
          effects: [['flag', 'zhao_done'], ['mind', 5], ['sysexp', 5]],
        },
        fail: {
          text: '他的短劍快得看不清。你只來得及護住要害，身上就多了三道口子。\n\n「這次只是教訓。」他收起劍，「下次，就沒這麼便宜了。」',
          effects: [['flag', 'zhao_done'], ['hurt', 2], ['mind', -5]],
        },
      },
      {
        text: '認錯，賠錢了事。',
        need: needLs(20),
        out: {
          text: '你掏出二十塊靈石。中年人掂了掂，滿意地走了。趙虎臨走，朝你腳邊吐了一口唾沫。',
          effects: [['ls', -20], ['flag', 'zhao_done'], ['mind', -6]],
        },
      },
      {
        text: '轉身就跑。',
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '你翻過一道矮牆，鑽進了王二家的豬圈。很臭，但很安全。', effects: [['flag', 'zhao_done']] },
        fail: { text: '巷子的另一頭也被堵住了。你挨了一頓好打。', effects: [['flag', 'zhao_done'], ['hurt', 1]] },
      },
    ],
  },

  {
    id: 'town_fox_night',
    trigger: 'explore',
    nodes: T,
    cooldown: 120,
    weight: 6,
    cond: (s) => s.day > 45 && !s.nodes.fox_shrine.known && night(s),
    title: '月下',
    text: (s, ctx) =>
      ctx.data?.scene
        ? '夜裡的街上一個人也沒有。月色很好。\n\n一隻白狐從你前頭的巷口鑽出來，嘴裡叼著一盞小小的燈籠，不慌不忙地往鎮東走，走幾步，停一停。\n\n燈籠裡的火，是藍色的。'
        : '夜裡睡不著，你坐在屋頂上吐納。\n\n月色很好。你看見一隻白狐，嘴裡叼著一盞小小的燈籠，從鎮東的牆頭輕巧地躍過，往荒野去了。\n\n燈籠裡的火，是藍色的。',
    choices: [
      {
        text: '跟上去。',
        check: { kind: 'jiyuan', diff: 4 },
        ok: {
          text: '你遠遠跟著那點藍光，一直到了鎮東的荒廟。白狐鑽進廟門，燈滅了。\n\n你在廟門口站了很久，沒敢進去。',
          effects: [['discover', 'fox_shrine']],
        },
        fail: {
          text: '藍光在一片亂墳邊上消失了。你找了半夜，什麼也沒找到，回來時褲腳全是露水。',
          effects: [['flag', 'fox_glimpse']],
        },
      },
      { text: '眼花了吧。', out: { text: '你揉了揉眼睛。牆頭上什麼也沒有。', effects: [['flag', 'fox_glimpse']] } },
    ],
  },

  {
    id: 'town_performer',
    trigger: 'explore',
    nodes: T,
    cooldown: 30,
    weight: 6,
    cond: (s) => s.tod >= 8 && s.tod < 18,
    title: '賣藝',
    text: '街口圍了一圈人。一個漢子赤著上身在舞刀，刀風呼呼作響；一個紮著羊角辮的小姑娘敲著鑼，挨個兒向看客討錢。\n\n你看了一會兒，看出了點門道：那漢子每一刀出去，呼吸都跟著刀走。',
    choices: [
      { text: '丟幾枚銅錢。', out: { text: '小姑娘衝你鞠了一躬，脆生生地道了聲謝，又敲著鑼往下一個人那兒去了。', effects: [['mind', 2]] } },
      {
        text: '細看他的刀路。',
        check: { kind: 'wuxing', diff: 6 },
        ok: { text: '漢子收刀的時候，氣沉丹田，吐出一口長長的白氣。這是正經的吐納法門——只是他自己大概也不知道。\n\n你默默記下了。', effects: [['insight', 1]] },
        fail: { text: '刀光太快，你什麼也沒看清，只覺得眼花。', effects: [['mind', 1]] },
      },
      { text: '走開。', out: { text: '鑼聲在身後響了很久。' } },
    ],
  },

  {
    id: 'town_thief',
    trigger: 'explore',
    nodes: T,
    cooldown: 60,
    weight: 5,
    cond: (s) => s.tod >= 15 && s.tod < 20.5,
    title: '抓賊',
    text: '「抓賊啊——！」\n\n一個瘦小的身影從巷子裡竄出來，懷裡死死抱著一個錢袋，後頭追著一個氣喘吁吁的胖掌櫃。那小賊直直朝你這邊跑來。',
    choices: [
      {
        text: '伸腳一絆。',
        check: { kind: 'gengu', diff: 4 },
        ok: {
          text: '小賊摔了個狗吃屎，錢袋飛出去老遠。胖掌櫃追上來，一把揪住他的後領，對你千恩萬謝，硬塞給你一塊碎靈石。\n\n你這才看清那小賊的臉：瘦得只剩一雙眼睛，看上去不過十來歲。',
          effects: [['ls', 2], ['mind', 1]],
        },
        fail: { text: '小賊身子一扭，從你腳邊鑽了過去，眨眼就沒了影。胖掌櫃扶著膝蓋喘氣，看你的眼神，像是在怪你。' },
      },
      {
        text: '攔下他，把錢袋還了，再給他一塊靈石。',
        need: needLs(1),
        out: {
          text: '你把錢袋還給了掌櫃，又往小賊手裡塞了一塊碎靈石。\n\n小賊愣住了，攥著靈石看了你很久，一句話也沒說，轉身跑了。',
          effects: [['ls', -1], ['mind', 4]],
        },
      },
      { text: '讓他過去。', out: { text: '小賊從你身邊跑過，回頭看了你一眼。那是一張餓得發青的臉。\n\n胖掌櫃追到你跟前，已經喘得說不出話了。' } },
    ],
  },

  {
    id: 'town_beggar',
    trigger: 'explore',
    poi: 'earth_temple',
    nodes: T,
    once: true,
    title: '老乞丐',
    text: '土地廟門口蹲著一個老乞丐，渾身酸臭，捧著一個缺了口的碗。\n\n「小哥，」他咧開沒剩幾顆牙的嘴，「賞口飯吃？」',
    choices: [
      {
        text: '把身上的乾糧都給他。',
        out: {
          text: '老乞丐狼吞虎嚥地吃完，抹了抹嘴，從懷裡掏出一張髒兮兮的紙片塞給你。\n\n「年輕時在山裡撿的。」他說，「我不識字，你興許看得懂。」\n\n然後他躺下，打起了呼嚕。\n\n他不是什麼隱世高人。他只是一個餓了很久的老人。',
          effects: [['item', 'beggar_map', 1], ['flag', 'cave_hint'], ['mind', 3]],
        },
      },
      {
        text: '給他一塊靈石。',
        need: needLs(1),
        out: {
          text: '老乞丐把靈石在衣服上擦了擦，對著太陽照了半天：「這石頭……好看。」\n\n他想了想，從懷裡掏出一張紙片：「拿這個跟你換。」',
          effects: [['ls', -1], ['item', 'beggar_map', 1], ['flag', 'cave_hint'], ['mind', 2]],
        },
      },
      { text: '走開。', out: { text: '你走過去了。身後傳來破碗被風吹得輕輕打轉的聲音。' } },
    ],
  },

  {
    id: 'town_wanger_wedding',
    trigger: 'explore',
    poi: 'wanger_house',
    auto: true,
    nodes: T,
    once: true,
    priority: 9,
    cond: (s) => within(s, WINDOWS.wangerWedding) && alive(s, 'wang_er'),
    title: '喜酒',
    text: '王二要成親了。\n\n他穿著一身不太合身的紅袍，站在自家院門口，看見你，咧嘴笑得像個傻子：「你可算來了！我還以為你修仙修得不認人了！」\n\n院子裡擺了六桌酒席。王二拉著你的手，眼眶有點紅：「我爹走得早……今天，你坐主桌。」',
    choices: [
      {
        text: '坐主桌，喝個痛快。',
        out: {
          text: '那天你喝了很多酒。修士的身體很快就把酒氣化掉了，可你還是覺得有點醉。\n\n深夜散席時，王二搭著你的肩：「兄弟，不管你以後飛多高，記得回來看看。」',
          effects: [['days', 1], ['favor', 'wang_er', 15], ['mind', 8], ['flag', 'wanger_wedding_seen'], ['log', '喝了王二的喜酒']],
        },
      },
      {
        text: '送十塊靈石當賀禮。',
        need: needLs(10),
        out: {
          text: '王二不知道靈石是什麼，只覺得「亮晶晶的挺好看」，鄭重其事地收進了箱底。\n\n多年以後，這十塊靈石還會派上用場。不過那是後話了。',
          effects: [['ls', -10], ['favor', 'wang_er', 20], ['mind', 6], ['flag', 'wanger_gift'], ['flag', 'wanger_wedding_seen'], ['log', '喝了王二的喜酒']],
        },
      },
      {
        text: '露個面就走。',
        out: { text: '你敬了一杯酒就告辭了。王二追到門口，塞給你一把喜糖。', effects: [['favor', 'wang_er', 3], ['flag', 'wanger_wedding_seen']] },
      },
    ],
  },

  {
    id: 'town_wanger_visit',
    trigger: 'visit',
    npc: 'wang_er',
    nodes: T,
    cooldown: 60,
    title: '王二',
    text: (s) => {
      const y = s.day / 360;
      if (!flag(s, 'wanger_married')) return '王二在地裡鋤草，見你來了，扔下鋤頭就跑過來：「走走走，去河邊摸魚！」\n\n你們都十幾歲，都還以為日子會一直這樣過下去。';
      if (y < 2.5) return '王二家的煙囪冒著煙。翠花在灶前忙活，王二蹲在門檻上，看著自家的三間瓦房傻笑。\n\n「我這輩子，」他說，「也就這樣了。挺好。」';
      if (y < 12) return '一個虎頭虎腦的小孩追著雞滿院子跑。「小石，叫叔叔！」王二喊。\n\n小孩躲到他身後，探出半個腦袋看你。王二笑著搖頭：「這孩子，認生。」';
      if (y < 30) return '王二的鬢角白了。他在院子裡劈柴，劈幾下就要停下來捶捶腰。\n\n「你還是老樣子。」他看著你，說不清是羨慕還是什麼，「我們都老了，就你沒變。」';
      return '王二坐在門口曬太陽，眼睛眯成一條縫。過了好一會兒，他才認出你。\n\n「是你啊。」他說，「我還以為……是我爹年輕時候的樣子。」';
    },
    choices: [
      { text: '陪他喝一杯。', out: { text: '你們喝到月亮出來。說的都是小時候的事。', effects: [['days', 1], ['mind', 4], ['favor', 'wang_er', 4]] } },
      {
        text: '教小石認字。',
        show: (s) => s.day > dayAt(4) && s.day < dayAt(16) && flag(s, 'wanger_married'),
        out: { text: '小石學得很快。王二在旁邊看著，比自己認字還高興。', effects: [['favor', 'wang_er', 6], ['flag', 'taught_xiaoshi'], ['mind', 3]] },
      },
      {
        text: '留下五塊靈石。',
        need: needLs(5),
        out: { text: '「這石頭能換錢？」王二將信將疑。後來他拿去回春堂，換了一頭牛。', effects: [['ls', -5], ['favor', 'wang_er', 8]] },
      },
    ],
  },

  {
    id: 'town_wanger_deathbed',
    trigger: ['arrive', 'explore'],
    poi: 'wanger_house',
    auto: true,
    nodes: T,
    once: true,
    priority: 20,
    cond: (s) => flag(s, 'wanger_dying') && alive(s, 'wang_er'),
    title: '故人',
    text: (s) =>
      `王二躺在床上，瘦得只剩一把骨頭。\n\n他看見你，渾濁的眼睛亮了一下：「你……還是老樣子啊。」他想笑，卻咳了起來，「四十多年了，你一點都沒變。」\n\n他抓住你的手，抓得很緊：「小石的兒子阿土，前些日子摸了一下${flag(s, 'wanger_gift') ? '你當年送的那塊石頭，石頭亮了' : '路過仙師的測靈石，石頭亮了'}。」\n\n「郎中說，那是……仙根。」\n\n「替我……看著他。」`,
    choices: [
      {
        text: '「我答應你。」',
        out: {
          text: '王二笑了，像四十多年前那個偷西瓜被抓住，還在笑的少年。\n\n那天夜裡，他走了。\n\n你在他墳前坐了一夜。修士的一夜很短，凡人的一生也很短。',
          effects: [
            ['flag', 'promise_atu'], ['favor', 'wang_er', 20], ['mind', 5], ['insight', 2],
            ['npc', 'wang_er', 'alive', false], ['unflag', 'wanger_dying'], ['log', '送走了王二'],
          ],
        },
      },
    ],
  },

  {
    id: 'town_lin_pact',
    trigger: 'explore',
    poi: 'shen_gate',
    auto: true,
    nodes: T,
    once: true,
    priority: 10,
    cond: (s) => within(s, WINDOWS.pact) && !flag(s, 'lin_ruined'),
    title: '三年之約',
    text: (s) =>
      `三年之約。\n\n沈家演武場外擠得水洩不通。林塵一襲青衣站在台下，腰間懸著一柄普通的鐵劍。三年前那個攥著拳頭的少年，如今眼神平靜得像一口深井。${
        flag(s, 'lin_opportunity_taken') ? '\n\n他的目光掃過人群，在你身上停了一瞬，微微皺眉，像是聞到了什麼熟悉的氣味。' : ''
      }\n\n沈清歌已是煉氣六層。她拔劍時，台下一片吸氣聲。\n\n林塵只出了一劍。`,
    choices: [
      {
        text: '看清那一劍。',
        check: { kind: 'wuxing', diff: 6 },
        ok: {
          text: '那一劍很慢，慢到你能看清每一縷靈氣的走向；那一劍又很快，快到沈清歌的劍還沒出鞘，就被挑飛了。\n\n你在原地站了很久。那一劍裡有某種東西，你說不上來，但你記住了。',
          effects: [['insight', 2], ['flag', 'pact_seen'], ['meet', 'lin_chen'], ['sysexp', 10], ['log', '目睹三年之約']],
        },
        fail: {
          text: '你只看見一道光。然後，沈清歌的劍就落在了地上。',
          effects: [['flag', 'pact_seen'], ['meet', 'lin_chen'], ['sysexp', 10], ['log', '目睹三年之約']],
        },
      },
      {
        text: '人群散去後，上前道賀。',
        show: (s) => favor(s, 'lin_chen') >= 20,
        out: {
          text: '林塵認出了你。\n\n「是你。」他說，「那時候……謝謝。」\n\n他想了想，又說：「你修行的路子很穩，但太穩了。突破的時候，別給自己留退路。」',
          effects: [['favor', 'lin_chen', 10], ['flag', 'pact_seen'], ['flag', 'lin_advice'], ['sysexp', 10], ['log', '目睹三年之約']],
        },
      },
      {
        text: '低頭躲進人群。',
        show: (s) => flag(s, 'lin_mocked'),
        out: {
          text: '林塵的目光掃過人群。你不知道他有沒有認出你。\n\n你只知道，你的手心全是汗。',
          effects: [['flag', 'pact_seen'], ['mind', -3]],
        },
      },
    ],
  },

  {
    id: 'town_lin_visit',
    trigger: 'visit',
    npc: 'lin_chen',
    nodes: T,
    cooldown: 45,
    title: '林塵',
    text: (s) =>
      flag(s, 'lin_mocked')
        ? '林塵在後山的空地上練拳。看見你，他停了下來，什麼也沒說，只是看著你，直到你自己覺得無趣，走開了。'
        : '林塵在後山的空地上練拳。一拳，又一拳，打在一棵老槐樹上，樹皮早就被打禿了一圈。\n\n他沒有停，只是說：「有事？」',
    choices: [
      {
        text: '「陪你練練。」',
        show: (s) => !flag(s, 'lin_mocked'),
        check: { kind: 'power', diff: 14 },
        ok: { text: '你們拆了幾十招。他沒有靈力，招式卻刁鑽得嚇人。\n\n「不錯。」他擦了擦汗，「再來。」', effects: [['favor', 'lin_chen', 6], ['insight', 1]] },
        fail: { text: '他明明沒有靈力，你卻沒在他手下走過十招。\n\n「你太在意輸贏了。」他說。', effects: [['favor', 'lin_chen', 4], ['hurt', 1]] },
      },
      {
        text: '帶點吃的給他。',
        show: (s) => !flag(s, 'lin_mocked'),
        out: { text: '他沒客氣，三兩口吃完，說了聲「謝了」，又回去打樹。', effects: [['favor', 'lin_chen', 4]] },
      },
      { text: '走開。', out: { text: '拳頭打在樹上的悶響，跟了你一路。' } },
    ],
  },
];
