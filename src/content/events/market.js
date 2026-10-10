import { dayAt } from '../../core/calendar.js';
import { has, flag, favor, met, needLs, needItem, npcPower, variant } from '../helpers.js';

const M = ['luoxia_market'];

const STORIES = [
  {
    cond: (s) => s.npcs.lin_chen.realm >= 1 && s.npcs.lin_chen.stage >= 6,
    text: '「上回說到，那林塵三年前被退婚，受盡屈辱，三年後一劍敗盡沈家！」錢半仙一拍醒木，「各位看官，這叫什麼？這叫——莫欺少年窮！」\n\n滿堂喝彩。你坐在角落裡，想起那個在崖下攥著半截藥草的少年。',
    rumor: '茶樓裡的說書人，已經開始講林塵的故事了。',
  },
  {
    cond: (s) => s.npcs.lin_chen.realm >= 1,
    text: '「話說那青雲宗收徒大典，測靈石炸開一團紫雷！」錢半仙唾沫橫飛，「各位，雷靈根啊！萬中無一！」\n\n台下有人嘀咕：「那小子三年前還是個廢物呢。」\n\n錢半仙瞪他一眼：「所以說，天意難測！」',
    rumor: '雷靈根林塵的故事，已經傳遍了落霞坊市。',
  },
  {
    cond: () => true,
    text: '「三千年前，有位劍仙在古戰場一劍斷天河——」錢半仙搖頭晃腦，「此後三千年，再無一人飛升。有人說，上界的門，就是被那一劍斬斷的！」\n\n茶客們哄笑。錢半仙也不惱，只是看了一眼窗外，「笑吧，笑吧。」',
    rumor: '傳說三千年前，有位劍仙在古戰場一劍斷了天河。',
  },
  {
    cond: () => true,
    text: '「天劍宗的葉孤寒，二十歲築基！」錢半仙豎起兩根手指，「據說他這輩子只笑過一次，是看見一把好劍。」',
    rumor: '天劍宗劍子葉孤寒，二十歲築基，據說只為一把好劍笑過。',
  },
  {
    cond: () => true,
    text: '「北原有妖，南嶺有巫，西漠有佛，東荒有什麼？」錢半仙環顧四周，「東荒有你們這群窮鬼散修！」\n\n滿堂大笑。笑完了，有幾個人低下頭，悶悶地喝茶。',
    rumor: '天下五域：中州、東荒、南嶺、西漠、北原，還有一片無盡海。',
  },
];

export default [
  {
    id: 'market_duel',
    trigger: 'explore',
    nodes: M,
    cooldown: 40,
    weight: 6,
    cond: (s) => s.tod >= 9 && s.tod < 18,
    title: '鬥法',
    text: '路口圍了一大圈人。圈子當中，兩個修士正在鬥法：一個使劍，一個甩出一張又一張符籙，火光和劍光攪成一團，看得人眼花繚亂。\n\n「好！」有人叫好。\n「執法隊來了——！」又有人喊。',
    choices: [
      {
        text: '看下去。',
        check: { kind: 'wuxing', diff: 6 },
        ok: { text: '使劍的那個，每一劍都留了三分力。你看出來了：他們不是在拚命，是在做給人看——可那三分力一收一放之間，自有章法。', effects: [['insight', 1], ['mind', 1]] },
        fail: { text: '劍光、火光，你看得目不暇給，卻什麼也沒看懂。', effects: [['mind', 1]] },
      },
      {
        text: '趁亂撿地上的東西。',
        karma: true,
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '你在一堆人腳底下摸到了兩塊被踢飛的靈石，揣進懷裡，沒人看見。', effects: [['ls', 3], ['mind', -1]] },
        fail: { text: '你剛彎下腰，一隻手就按住了你的肩膀。是執法隊的人。\n\n「撿什麼呢？」\n\n你被罰了五塊靈石。', effects: [['ls', -5]] },
      },
      { text: '走開，免得殃及池魚。', out: { text: '你剛走開兩步，身後「轟」的一聲——剛才你站的地方，被一團火燒焦了一大片。', effects: [['mind', 1]] } },
    ],
  },

  {
    id: 'market_sword_seller',
    trigger: 'explore',
    nodes: M,
    cooldown: 180,
    weight: 4,
    cond: (s) => s.tod >= 8 && s.tod < 19,
    title: '賣劍',
    steps: {
      start: {
        effects: [['newnpc', 'sanxiu']],
        text: '路邊蹲著一個{npcTitle}，面前鋪著一塊破布，布上只擺了一把劍。那人臉色蠟黃，胸口纏的布條還在滲血。\n\n「青鋼劍，」{npc}說，「八十塊，不還價。我要買藥。」',
        choices: [
          {
            text: '買下。',
            need: needLs(80),
            out: { text: '{npc}把劍遞給你的時候，手抖了一下。「它跟了我十二年。」{npc}說，「別讓它生鏽。」', effects: [['ls', -80], ['item', 'qinggang_sword', 1], ['favor', 'npc', 10]] },
          },
          {
            text: '送{npc}一顆療傷丹。',
            need: needItem('heal_pill', '療傷丹'),
            out: {
              text: '{npc}愣了很久，才把丹藥接過去。「這份情，我記下了。」\n\n{npc}把劍收回了鞘裡：「劍，不賣了。」',
              effects: [['item', 'heal_pill', -1], ['favor', 'npc', 35], ['mind', 3]],
            },
          },
          { text: '搖搖頭，走開。', out: { text: '{npc}沒有抬頭。' } },
        ],
      },
    },
  },

  {
    id: 'market_arrive',
    trigger: 'arrive',
    nodes: M,
    once: true,
    priority: 5,
    title: '落霞坊市',
    text: '穿過一道看似普通的石拱門，眼前忽然豁然開朗。\n\n兩條長街上擠滿了人：擺攤的、吆喝的、討價還價的。有人踩著飛劍從頭頂掠過，有人牽著一隻會說話的鸚鵡。空氣裡混著丹藥、獸血和烤靈米的香味。\n\n落霞坊市。東荒散修的天堂，也是東荒散修的墳場。',
    choices: [
      {
        text: '先四處看看。',
        out: {
          text: '你記下了幾個地方：街口的百草堂賣丹藥和兵器，對面茶樓裡有個說書人，巷子深處有人擺攤賣些說不清來歷的舊貨。\n\n還有，到處都有人在打聽消息。在這裡，消息也是一種貨。',
          effects: [['sysexp', 5]],
        },
      },
    ],
  },

  {
    id: 'market_storyteller',
    trigger: ['explore', 'visit'],
    npc: 'qian_banxian',
    poi: 'teahouse_market',
    nodes: M,
    cooldown: 25,
    weight: 10,
    title: '茶樓',
    text: (s) => STORIES.find((x, i) => x.cond(s) && (i >= 2 ? i === 2 + (Math.floor(s.day / 25) % 3) : true))?.text || STORIES[2].text,
    choices: [
      { text: '站在門口聽一會兒。', out: { text: '你在門口站著聽完了這段。夥計白了你好幾眼。', effects: [['meet', 'qian_banxian']] } },
      {
        text: '要一壺茶，聽完這段。',
        need: needLs(1),
        out: {
          text: '一壺粗茶，一段書。散場時天已經黑了。',
          effects: [
            ['ls', -1], ['meet', 'qian_banxian'], ['mind', 2],
            (s) => {
              const st = STORIES.find((x, i) => x.cond(s) && (i >= 2 ? i === 2 + (Math.floor(s.day / 25) % 3) : true)) || STORIES[2];
              if (!s.rumors.some((r) => r.text === st.rumor)) s.rumors.unshift({ day: s.day, text: st.rumor, kind: 'world', ref: null, read: false });
            },
          ],
        },
      },
      {
        text: '散場後，打賞錢半仙。',
        need: needLs(5),
        out: {
          text: (s) =>
            favor(s, 'qian_banxian') >= 15 && !flag(s, 'banxian_secret')
              ? '錢半仙收了靈石，左右看看，湊過來低聲說：「小友出手大方，老夫送你一句真話。」\n\n「坊市裡有個白衣丫頭，每回聽到古戰場那段，臉都是白的。她不是怕——她是在記。」'
              : '錢半仙收了靈石，眉開眼笑：「小友是個識貨的！下回來，給你留個好座。」',
          effects: [
            ['ls', -5], ['meet', 'qian_banxian'], ['favor', 'qian_banxian', 6],
            (s) => {
              if (s.npcs.qian_banxian.favor >= 21 && !s.flags.banxian_secret) {
                s.flags.banxian_secret = true;
                s.nodes.ancient_ruins.known = true;
              }
            },
          ],
        },
      },
    ],
  },

  {
    id: 'market_su_stone',
    trigger: 'explore',
    poi: 'su_stall',
    auto: true,
    nodes: M,
    once: true,
    priority: 4,
    cond: (s) => s.day >= 200 && !flag(s, 'su_left_market'),
    title: '黑石頭',
    steps: {
      start: {
        text: '雜貨攤前，一個白衣女修正蹲著，在一堆破爛裡挑挑揀揀。\n\n她拿起一塊黑乎乎的石頭。攤主開價兩塊靈石，她眼皮都沒眨就付了。\n\n你注意到，她拿到石頭的那一刻，嘴角微微翹了一下。像是……鬆了一口氣。',
        choices: [
          { text: '上前搭話。', out: { effects: [['meet', 'su_qingyao']], next: 'talk' } },
          {
            text: '搶先開價：「這石頭我出五塊！」',
            karma: true,
            need: needLs(5),
            check: { kind: 'jiyuan', diff: 6 },
            ok: {
              text: '攤主眼睛一亮，把石頭從她手裡拿回來，塞給了你。\n\n白衣女修看著你，那眼神很奇怪，像是在看一個不該出現在這裡的人。\n\n她什麼也沒說，轉身走了。',
              effects: [['ls', -5], ['item', 'xuanyin_stone', 1], ['meet', 'su_qingyao'], ['favor', 'su_qingyao', -20], ['flag', 'su_rival']],
            },
            fail: { text: '攤主搖頭：「人家已經付過錢了。」\n\n白衣女修看了你一眼，走了。', effects: [['meet', 'su_qingyao'], ['favor', 'su_qingyao', -5]] },
          },
          { text: '不關我的事。', out: { text: '你走開了。後來你常想，那塊石頭到底有什麼特別。' } },
        ],
      },
      talk: {
        text: '「這石頭有什麼特別？」你問。\n\n她轉過頭看你，眼裡閃過一絲意外，然後笑了：「好看。」\n\n「我叫蘇清瑤。」她說，「你呢？」\n\n你報了名字。她把你的名字輕輕念了一遍，眉頭皺起來，像在記憶裡翻找什麼——然後放棄了。\n\n「奇怪，」她自言自語，「上輩子……沒聽說過你。」',
        choices: [
          {
            text: '「什麼上輩子？」',
            out: {
              text: '「沒什麼。」她站起來，拍了拍裙擺，「隨口說的。」\n\n叮——檢測到異常：此人的命格裡，有兩段重疊的軌跡。',
              effects: [['flag', 'su_met'], ['favor', 'su_qingyao', 5], ['sysexp', 10]],
            },
          },
        ],
      },
    },
  },

  {
    id: 'market_su_chat',
    trigger: 'visit',
    npc: 'su_qingyao',
    nodes: M,
    cooldown: 60,
    title: '蘇清瑤',
    text: (s) =>
      flag(s, 'realm_closed')
        ? '蘇清瑤坐在茶樓二樓靠窗的位置，面前攤著一卷古經。看見你，她把經卷合上了。\n\n「坐。」她說，「你最近，好像活得還不錯。」'
        : '蘇清瑤在坊市裡收購古戰場的地圖，什麼樣的都要，真的假的都要。\n\n「你也對古戰場有興趣？」她看著你，「勸你一句，別有。」',
    choices: [
      {
        text: '「你好像總知道會發生什麼。」',
        show: (s) => flag(s, 'su_met'),
        check: { kind: 'xinxing', diff: 6 },
        ok: {
          text: '她看了你很久。\n\n「如果我說，我活過一次，你信嗎？」\n\n你沒說話。\n\n「天元三千零二十二年，」她看著窗外，「月亮會變紅。那一年，東荒會死很多人。」她轉回頭，「到時候，離這裡越遠越好。」',
          effects: [['flag', 'blood_moon_warned'], ['favor', 'su_qingyao', 10], ['sysexp', 15], ['log', '從蘇清瑤口中聽說了「血月」']],
        },
        fail: { text: '「也許我只是比較會猜。」她笑了笑，把話題岔開了。', effects: [['favor', 'su_qingyao', 3]] },
      },
      {
        text: '請她喝茶。',
        need: needLs(3),
        out: { text: '她喝茶的樣子很慢，像是在品一段很久以前的回憶。', effects: [['ls', -3], ['favor', 'su_qingyao', 5]] },
      },
      { text: '聊幾句就走。', out: { text: '她說話總是留半句。你習慣了。', effects: [['favor', 'su_qingyao', 1]] } },
    ],
  },

  {
    id: 'market_mystery_stall',
    trigger: 'explore',
    poi: 'mystery_stall',
    nodes: M,
    cooldown: 45,
    weight: 9,
    title: '舊貨攤',
    text: '巷子深處，一個瞎了一隻眼的老頭守著一張破草蓆，上面擺滿了說不清來歷的舊東西：生鏽的指環、缺頁的書、裂了縫的玉、看不出是什麼的骨頭。\n\n「一件十二塊。」老頭說，「賣出去的東西，概不退換。」',
    choices: [
      { text: '買一件。', need: needLs(12), out: { text: '你挑了一件看著最順眼的。', effects: [['ls', -12], ['item', 'mystery', 1]] } },
      { text: '買三件。', need: needLs(33), out: { text: '老頭給你算了個便宜價。', effects: [['ls', -33], ['item', 'mystery', 3]] } },
      { text: '只是看看。', out: { text: '老頭也不招呼你，閉著那隻好眼睛打盹。' } },
    ],
  },

  {
    id: 'market_fake_pill',
    trigger: 'explore',
    poi: 'market_alley',
    auto: true,
    nodes: M,
    once: true,
    weight: 7,
    cond: (s) => s.player.realm >= 1 && s.player.stage >= 2,
    title: '祖傳丹藥',
    text: '一個賊眉鼠眼的漢子把你拉到牆角，從懷裡掏出一個小瓷瓶：「築基丹，祖傳的！急用錢，八十塊靈石，賤賣！」\n\n瓶塞拔開，一股藥香撲鼻而來。',
    choices: [
      {
        text: '買下。',
        need: needLs(80),
        out: { text: '漢子收了錢，一溜煙沒影了。你捏著瓷瓶，心跳得厲害。', effects: [['ls', -80], ['item', 'fake_zhuji', 1]] },
      },
      {
        text: '讓系統鑑定一下。',
        show: (s) => s.sys.lv >= 2,
        out: { text: '叮——鑑定：麵粉、蜂蜜、凝氣草粉。建議宿主報官。\n\n你抬頭時，那漢子已經不見了。', effects: [['mind', 2]] },
      },
      { text: '不買。', out: { text: '「不識貨！」漢子罵了一句，去拉下一個人了。' } },
    ],
  },

  {
    id: 'market_auction',
    trigger: 'explore',
    poi: 'auction_house',
    nodes: M,
    cooldown: 300,
    priority: 6,
    cond: (s) => flag(s, 'auction_open'),
    title: '聚寶閣拍賣會',
    text: '聚寶閣三層樓，座無虛席。\n\n前面拍的都是些尋常貨色。直到最後，拍賣師掀開紅綢，露出一個白玉瓶：\n\n「壓軸之物——築基丹一枚！起價三百靈石！」\n\n全場安靜了一瞬，然後炸開了鍋。',
    choices: [
      {
        text: '出價三百。',
        need: needLs(300),
        check: { kind: 'jiyuan', diff: 7 },
        ok: { text: '沒有人跟價。拍賣師落槌的那一刻，你的手在發抖。', effects: [['ls', -300], ['item', 'zhuji_pill', 1], ['log', '在聚寶閣拍得築基丹']] },
        fail: { text: '「三百二！」二樓雅間裡有人加了價。你咬了咬牙，沒再舉牌。', effects: [] },
      },
      {
        text: '出價四百。',
        need: needLs(400),
        check: { kind: 'jiyuan', diff: 3 },
        ok: { text: '全場一片吸氣聲。你拿到了。', effects: [['ls', -400], ['item', 'zhuji_pill', 1], ['log', '在聚寶閣拍得築基丹']] },
        fail: { text: '「五百！」有人不要命地加價。你只能看著它被拍走。', effects: [] },
      },
      {
        text: '出價五百，志在必得。',
        need: needLs(500),
        out: { text: '五百靈石。沒有人再跟。\n\n你知道，這可能是你這輩子最大的一筆花銷。', effects: [['ls', -500], ['item', 'zhuji_pill', 1], ['log', '在聚寶閣拍得築基丹']] },
      },
      {
        text: '拍幾顆聚氣丹就好（九十靈石）。',
        need: needLs(90),
        out: { text: '三顆聚氣丹，比百草堂便宜一點。', effects: [['ls', -90], ['item', 'juqi_pill', 3]] },
      },
      {
        text: '只是來看熱鬧。',
        out: {
          text: (s) =>
            met(s, 'su_qingyao')
              ? '築基丹最後被一位雅間裡的客人拍走了。散場時，你看見蘇清瑤也在人群裡，什麼都沒買，只是看著拍賣台，像在確認什麼。'
              : '築基丹最後被一位雅間裡的客人拍走了。散場時，有人在門口嚎啕大哭——他押上了全部身家，還是差了二十塊。',
          effects: [['mind', 1]],
        },
      },
    ],
  },

  {
    id: 'market_alchemy_job',
    trigger: 'explore',
    poi: 'alchemy_shop',
    nodes: M,
    cooldown: 40,
    weight: 7,
    title: '丹坊雜役',
    text: '丹坊門口貼著告示：「招雜役，看火、搬藥、洗爐。管飯，十日一結。」',
    choices: [
      {
        text: '去做十天。',
        out: {
          text: (s) =>
            variant(s, [
              '十天裡，你洗了二十三口丹爐，被燙了七次。丹師心情好的時候，會跟你說兩句火候的門道。',
              '你負責看火。第九天夜裡，丹爐裡傳出一聲悶響——炸爐了。丹師灰頭土臉地罵了半夜，工錢倒是一文沒少。',
            ]),
          effects: [['days', 10], ['ls', [6, 10]], ['maybe', 0.25, [['insight', 1]]], ['maybe', 0.15, [['item', 'juqi_pill', 1]]]],
        },
      },
      { text: '算了。', out: { text: '你在告示前站了一會兒，走了。' } },
    ],
  },

  {
    id: 'market_fellow',
    trigger: 'explore',
    poi: 'tavern',
    nodes: M,
    cooldown: 150,
    weight: 6,
    cond: (s) => s.player.realm >= 1,
    title: '結伴',
    steps: {
      start: {
        effects: [['newnpc', 'hunter']],
        text: '一個{npcTitle}在酒肆裡招人：「黑風林裡有頭鐵背熊，妖丹值八十靈石。缺個幫手，打下來對半分！」\n\n他叫{npc}，看起來是個老江湖。',
        choices: [
          { text: '「算我一個。」', out: { next: 'hunt' } },
          { text: '婉拒。', out: { text: '{npc}聳聳肩，又去招呼別人了。' } },
        ],
      },
      hunt: {
        text: '你們在黑風林裡蹲了三天，終於等到了那頭鐵背熊。\n\n牠比{npc}說的大了一倍。',
        choices: [
          {
            text: '正面纏住牠。',
            check: { kind: 'power', diff: 30 },
            fight: { foes: [['bear', 1]], allies: [['cultivator', 1, 'npc']] },
            ok: { next: 'split', text: '你頂住了熊的正面，{npc}從側面一刀捅進了牠的心窩。', effects: [['days', 4]] },
            fail: { next: 'split', text: '你被熊掌拍飛出去。等你爬起來，{npc}已經解決了牠。', effects: [['days', 4], ['hurt', 1]] },
          },
        ],
      },
      split: {
        text: '{npc}剖出妖丹，掂了掂。\n\n他看著你，你看著他。林子裡很安靜。',
        choices: [
          {
            text: '「說好的，對半分。」',
            out: {
              effects: [
                (s, ctx) => {
                  const traitor = ['陰沉', '貪財', '多疑'].includes(ctx.npc.trait);
                  ctx.data = { traitor };
                },
                (s, ctx, r) => {
                  if (ctx.data.traitor) {
                    s.player.injury = Math.min(3, s.player.injury + 1);
                    s.player.injuryDays = 30;
                    ctx.npc.favor = -40;
                    r.chips.push({ text: '受傷：遭人暗算', tone: 'bad' });
                  } else {
                    s.player.ls += 40;
                    ctx.npc.favor = Math.min(100, ctx.npc.favor + 20);
                    r.chips.push({ text: '靈石 +40', tone: 'good' });
                    r.chips.push({ text: `${ctx.npc.name} 好感上升`, tone: 'good' });
                  }
                },
              ],
              text: (s, ctx) =>
                ctx.data?.traitor
                  ? '「對半分？」{npc}笑了，然後一刀捅向你的後腰。\n\n你躲開了要害，眼睜睜看著他揣著妖丹消失在林子裡。\n\n江湖險惡，原來是這個意思。'
                  : '{npc}把四十塊靈石拍在你手裡：「痛快！下回還找你。」',
            },
          },
        ],
      },
    },
  },

  {
    id: 'xuesha_inquiry',
    trigger: 'scheduled',
    nodes: ['luoxia_market', 'qingshi_town'],
    cond: (s) => has(s, 'xuesha_token'),
    title: '血袍人',
    text: '一個穿血紅長袍的人攔住了你。他的眼睛是灰色的，沒有一絲溫度。\n\n「你身上，有我師弟的東西。」\n\n你懷裡的血煞令，忽然燙了起來。',
    choices: [
      {
        text: '交出令牌，說出屍體的位置。',
        out: {
          text: (s) =>
            flag(s, 'buried_corpse')
              ? '他盯著你看了很久。\n\n「你埋了他？」\n\n你點頭。他沉默片刻，丟給你一個瓷瓶：「血煞門的人，不欠人情。」\n\n他轉身，消失在人群裡。'
              : '他接過令牌，冷哼一聲：「師弟的儲物袋呢？」\n\n你只好把身上的靈石掏給他。他看都沒看，收進袖子裡，走了。',
          effects: [
            ['item', 'xuesha_token', -1],
            (s, ctx, r) => {
              if (s.flags.buried_corpse) {
                s.player.items.heal_pill = (s.player.items.heal_pill || 0) + 2;
                r.chips.push({ text: '獲得：療傷丹 ×2', tone: 'good' });
              } else {
                const lost = Math.min(s.player.ls, 60);
                s.player.ls -= lost;
                if (lost) r.chips.push({ text: `靈石 -${lost}`, tone: 'bad' });
              }
            },
            ['flag', 'xuesha_resolved'],
          ],
        },
      },
      {
        text: '裝傻：「什麼令牌？」',
        check: { kind: 'xinxing', diff: 7 },
        ok: {
          text: '他的目光像刀子一樣刮過你的臉。最後，他走了。\n\n但你知道，他還會回來。',
          effects: [['sched', 'xuesha_return', 360, 720, { expire: 1440 }]],
        },
        fail: { text: '他笑了。下一刻，你已經躺在地上，懷裡的令牌不見了。', effects: [['hurt', 2], ['item', 'xuesha_token', -1], ['halfls']] },
      },
      {
        text: '轉身就跑。',
        check: { kind: 'jiyuan', diff: 6 },
        ok: { text: '你鑽進人群，七拐八繞，總算甩掉了他。', effects: [['sched', 'xuesha_return', 360, 720, { expire: 1440 }]] },
        fail: { text: '你沒跑出三步，後心就挨了一掌。', effects: [['hurt', 2], ['item', 'xuesha_token', -1]] },
      },
    ],
  },

  {
    id: 'xuesha_return',
    trigger: 'scheduled',
    cond: (s) => has(s, 'xuesha_token'),
    title: '血袍人又來了',
    text: '夜裡，你被一股血腥味驚醒。\n\n血袍人站在你床前，灰色的眼睛在黑暗裡發著光。\n\n「我給過你機會。」',
    choices: [
      {
        text: '拼死一戰。',
        tag: 'danger',
        check: { kind: 'power', diff: 60 },
        fight: { foes: [['blood_robe', 1]] },
        ok: {
          text: '你不知道自己是怎麼贏的。等你回過神來，血袍人已經倒在地上，胸口插著你的劍。\n\n你在他身上搜出了一本血色的冊子，上面記著血煞門的秘法。你把它燒了。',
          effects: [['item', 'xuesha_token', -1], ['ls', 80], ['mind', -6], ['sysexp', 10], ['log', '斬殺血煞門修士']],
        },
        fail: { text: '他的手穿透了你的胸口。', effects: [['item', 'xuesha_token', -1], ['death', '死於血煞門之手']] },
      },
      {
        text: '把令牌扔給他，跪地求饒。',
        out: { text: '他接住令牌，看了你很久，留下一句「廢物」，消失了。', effects: [['item', 'xuesha_token', -1], ['mind', -10]] },
      },
    ],
  },
];
