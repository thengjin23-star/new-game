import { needLs, needItem, npcPower, variant } from '../helpers.js';

const day = (s) => s.tod >= 6 && s.tod < 19;

/** Quietly, without a word to you: how someone you may not have met yet feels about you. */
const regard = (id, n) => (s) => {
  const npc = s.npcs[id];
  if (npc) npc.favor = Math.max(-100, Math.min(100, npc.favor + n));
};

export default [
  {
    id: 'travel_merchant',
    trigger: 'travel',
    weight: 10,
    cooldown: 60,
    title: '行商',
    text: '路邊的茶棚裡，一個行商正在歇腳，騾子背上馱著兩個大箱子。\n\n「道友，」他眼尖，一眼就看出你是修士，「要不要看看貨？價錢好商量。」',
    choices: [
      { text: '買一顆療傷丹（30）。', need: needLs(30), out: { text: '比坊市貴了五塊。路上的東西，就是這個價。', effects: [['ls', -30], ['item', 'heal_pill', 1]] } },
      { text: '買一顆聚氣丹（35）。', need: needLs(35), out: { text: '行商笑瞇瞇地收了錢。', effects: [['ls', -35], ['item', 'juqi_pill', 1]] } },
      {
        text: '只跟他聊聊路上的見聞。',
        out: {
          text: (s) =>
            variant(s, [
              '行商說，南邊的路不太平，最近有劫修專挑落單的煉氣期下手。',
              '行商說，他走了三十年的貨，見過最怪的事，是一隻會打算盤的猴子。',
              '行商說，中州的靈石比東荒賤，一顆聚氣丹只賣二十。「可你得有命走到中州。」',
            ]),
          effects: [['mind', 1]],
        },
      },
    ],
  },

  {
    id: 'travel_robber',
    trigger: 'travel',
    mob: true,
    weight: 8,
    cooldown: 90,
    cond: (s) => s.player.realm >= 1,
    title: '劫修',
    steps: {
      start: {
        effects: [['newnpc', 'robber']],
        text: '山道拐角，一個{npcTitle}抱著胳膊靠在石頭上，像是等了很久。\n\n「這位道友，」{npc}笑著說，「借點盤纏？」',
        choices: [
          {
            text: '動手。',
            check: { kind: 'power', diff: (s, ctx) => npcPower(ctx.npc) },
            fight: { foes: [['cultivator', 1, 'npc']], close: true },
            ok: { text: '{npc}沒想到你這麼硬，捂著傷口逃了。臨走前，扔下了錢袋保命。', effects: [['ls', [8, 20]], ['favor', 'npc', -30]] },
            fail: { text: '{npc}的身法比你快得多。你被打倒在地，錢袋被摸走了。', effects: [['hurt', 1, '死於劫修之手'], ['halfls'], ['favor', 'npc', -10]] },
          },
          { text: '給他一半靈石。', show: (s) => s.player.ls > 0, out: { text: '{npc}掂了掂錢袋，讓開了路：「爽快。」', effects: [['halfls']] } },
          {
            text: '跑。',
            check: { kind: 'jiyuan', diff: 5 },
            ok: { text: '你轉身就跑，鑽進樹林，七拐八拐，甩掉了。', effects: [] },
            fail: { text: '{npc}追上來，一腳把你踹倒。', effects: [['hurt', 1], ['halfls']] },
          },
        ],
      },
    },
  },

  {
    id: 'travel_rain',
    trigger: 'travel',
    weight: 9,
    cooldown: 60,
    title: '避雨',
    steps: {
      start: {
        effects: [['newnpc', 'sanxiu']],
        text: '大雨下了一整天。你躲進路邊的破山神廟，發現裡面已經有人生了火。\n\n是個{npcTitle}，叫{npc}。對方往旁邊挪了挪，給你讓出一塊乾燥的地方。',
        choices: [
          {
            text: '烤火，聊天。',
            check: { kind: 'wuxing', diff: 5 },
            ok: { text: '你們聊了一夜修行的心得。{npc}說的有些話，你琢磨了很久。', effects: [['insight', 1], ['favor', 'npc', 15]] },
            fail: { text: '你們聊了一夜天南地北，誰也沒說修行的事。挺好。', effects: [['mind', 2], ['favor', 'npc', 10]] },
          },
          { text: '分他一半乾糧。', out: { text: '{npc}接過乾糧，說了聲謝。雨停的時候，你們一起走了一段路。', effects: [['favor', 'npc', 20], ['mind', 2]] } },
          { text: '各自守夜，保持距離。', out: { text: '一夜無話。天亮時，{npc}已經走了，火堆還是溫的。', effects: [] } },
        ],
      },
    },
  },

  {
    id: 'travel_old_friend',
    trigger: 'travel',
    weight: 12,
    cooldown: 120,
    cond: (s) => Object.values(s.npcs).some((n) => !n.named && n.alive && n.met && n.favor >= 10),
    title: '故人',
    steps: {
      start: {
        effects: [
          (s, ctx) => {
            const pool = Object.values(s.npcs).filter((n) => !n.named && n.alive && n.met && n.favor >= 10);
            ctx.npc = pool[Math.floor((s.day * 31) % pool.length)];
            ctx.npcId = ctx.npc.id;
          },
        ],
        text: (s, ctx) => {
          const n = ctx.npc;
          const lianqi = ['一層', '二層', '三層', '四層', '五層', '六層', '七層', '八層', '九層'];
          const realm = n.realm >= 2 ? '築基' : '煉氣' + lianqi[Math.min(8, n.stage)];
          return `「{name}！」\n\n有人在路邊叫你。你轉過頭——是{npc}，上次分別之後，就再沒見過。\n\n對方的修為，已經是${realm}了。`;
        },
        choices: [
          {
            text: '找個地方喝一杯。',
            out: {
              text: (s) =>
                variant(s, [
                  '你們喝到深夜。{npc}說起這些年的事：去過哪裡，差點死在哪裡，又在哪裡撿了一條命。',
                  '{npc}說，這些年一直在找一種靈草，找到了，卻發現自己已經不需要它了。',
                  '{npc}說，前些日子差點築基，最後一刻怕了。「我還不想死。」對方說，「你呢？」',
                ]),
              effects: [['days', 1], ['mind', 4], ['favor', 'npc', 8], ['maybe', 0.5, [['insight', 1]]]],
            },
          },
          { text: '寒暄幾句，各自趕路。', out: { text: '你們約好了下次再見。修士的「下次」，有時候是十年。', effects: [['favor', 'npc', 2]] } },
        ],
      },
    },
  },

  {
    id: 'travel_corpse',
    trigger: 'travel',
    weight: 6,
    cooldown: 120,
    title: '路倒',
    text: '路邊的溝裡躺著一個凡人，已經死了好幾天了。看衣著，是個趕路的挑夫，扁擔還壓在身下。',
    choices: [
      { text: '把他埋了。', out: { text: '你挖了個坑，把他和他的扁擔一起埋了。', effects: [['days', 1], ['mind', 3]] } },
      { text: '搜搜他身上。', karma: true, out: { text: '你在他懷裡摸到幾枚銅錢和一塊碎銀。銅錢上，還有他的體溫——不，是你的錯覺。', effects: [['ls', 1], ['mind', -4]] } },
      { text: '繞過去。', out: { text: '你繞了過去。修仙的人，見過的死人多了。' } },
    ],
  },

  {
    id: 'travel_scenery',
    trigger: 'travel',
    weight: 8,
    cooldown: 90,
    title: '雲海',
    text: (s) =>
      variant(s, [
        '翻過山脊的那一刻，腳下是一整片翻湧的雲海。太陽從雲海裡升起來，把一切都染成了金色。',
        '你在一處懸崖邊停下。遠處的群山一層淡過一層，最後融進了天空裡，分不清哪裡是山，哪裡是雲。',
        '夜裡趕路，抬頭一看，滿天的星星低得像是伸手就能摘到。銀河橫過天頂，亮得刺眼。',
      ]),
    choices: [
      {
        text: '駐足靜觀。',
        check: { kind: 'wuxing', diff: 7 },
        ok: { text: '你看了很久很久。等你回過神來，體內的靈氣已經自行運轉了一個周天。（頓悟）', effects: [['insight', 1], ['buff', 'epiphany', 45], ['mind', 3]] },
        fail: { text: '真美。你想。然後繼續趕路。', effects: [['mind', 2]] },
      },
    ],
  },

  {
    id: 'travel_village_demon',
    trigger: 'travel',
    weight: 6,
    cooldown: 240,
    cond: (s) => s.player.realm >= 1,
    title: '山村',
    text: '路過一個小山村，村口跪著一群人。看見你，一個老人顫巍巍地爬過來：「仙師！仙師救命！」\n\n村後的山上有一頭妖狼，已經叼走了三個孩子。',
    choices: [
      {
        text: '上山除妖。',
        check: { kind: 'power', diff: 26 },
        fight: { foes: [['demon_wolf', 1]] },
        ok: {
          text: '你在山洞裡找到了那頭妖狼。還找到了兩個活著的孩子。\n\n村民們殺了一頭豬招待你。走的時候，孩子們追著你跑了好遠。',
          effects: [['days', 2], ['mind', 6], ['sysexp', 3], ['log', '替山村除了一頭妖狼']],
        },
        fail: { text: '妖狼比你想的難纏。你拼著受傷把牠趕跑了，但沒能殺死牠。', effects: [['days', 2], ['hurt', 1], ['mind', 2]] },
      },
      { text: '「我還有要事。」', out: { text: '你走出村口的時候，聽見身後有人在哭。', effects: [['mind', -5]] } },
    ],
  },

  {
    id: 'travel_escort',
    trigger: 'travel',
    weight: 6,
    cooldown: 150,
    cond: (s) => s.player.realm >= 1 && day(s),
    title: '劫鏢',
    text: '前頭傳來兵刃相交的聲音。一輛鏢車翻在路邊，兩個鏢師背靠著背，被三個蒙面人圍在當中，已經見了血。\n\n其中一個鏢師看見了你，啞著嗓子喊：「這位兄弟——搭把手！事後必有重謝！」',
    choices: [
      {
        text: '拔刀相助。',
        check: { kind: 'power', diff: 28 },
        fight: { foes: [['masked', 3]], allies: [['escort', 2]] },
        ok: {
          text: '蒙面人沒想到半路殺出個修士，丟下兩個受傷的同伴跑了。鏢頭給你作了個揖，從車上搬下一個小匣子：「一點心意，不成敬意。」',
          effects: [['ls', [12, 24]], ['mind', 3], ['log', '在路上救下一支鏢隊']],
        },
        fail: {
          text: '你衝上去，捱了一刀，可總算替鏢師們撕開了一個口子。蒙面人見勢不妙，退了。\n\n鏢頭替你裹了傷，塞給你幾塊靈石。',
          effects: [['hurt', 1], ['ls', [4, 8]], ['mind', 2]],
        },
      },
      {
        text: '躲在樹後，等他們兩敗俱傷。',
        karma: true,
        out: {
          text: '你在樹後等到聲音停了。鏢師死了一個，蒙面人也躺下了兩個。你在屍體上摸到了幾塊靈石。\n\n活著的那個鏢師看著你，什麼也沒說。',
          effects: [['ls', [6, 12]], ['mind', -6]],
        },
      },
      { text: '繞道走。', out: { text: '你繞了一個大圈。走出很遠，還能聽見那邊的喊殺聲。', effects: [['mind', -2]] } },
    ],
  },

  {
    id: 'travel_wounded',
    trigger: 'travel',
    weight: 6,
    cooldown: 120,
    cond: (s) => s.player.realm >= 1,
    title: '負傷的人',
    steps: {
      start: {
        effects: [['newnpc', 'sanxiu']],
        text: '路邊的石頭上靠著一個{npcTitle}，一隻手捂著肋下，血從指縫裡往外滲。看見你，{npc}下意識地去摸劍，摸了個空——劍掉在三步外的草叢裡。\n\n「別過來。」聲音很虛。',
        choices: [
          {
            text: '遞過去一顆療傷丹。',
            need: needItem('heal_pill', '療傷丹'),
            out: {
              text: '{npc}盯著丹藥看了很久，才張嘴吞了下去。過了一炷香，臉上總算有了點血色。\n\n「我叫{npc}。」對方說，「欠你一條命。」',
              effects: [['item', 'heal_pill', -1], ['favor', 'npc', 40], ['mind', 3], ['sysexp', 2]],
            },
          },
          {
            text: '撕塊布，替{npc}包紮。',
            out: { text: '你替{npc}把傷口紮緊了。{npc}一直盯著你的手，直到你包完，才鬆了口氣。\n\n「後會有期。」', effects: [['favor', 'npc', 15], ['mind', 2]] },
          },
          { text: '繞開。', out: { text: '修士的事，少管為妙。你繞了過去。' } },
        ],
      },
    },
  },

  {
    id: 'travel_trap',
    trigger: 'travel',
    weight: 5,
    cooldown: 200,
    cond: (s) => day(s) && !s.flags.fox_betrayed,
    title: '獸夾',
    text: '草叢裡有東西在掙扎。你撥開草——是一隻白狐，後腿被獵人的鐵夾子咬住了，血把雪白的毛染紅了一片。\n\n牠看著你，不叫，也不動。',
    choices: [
      {
        text: '掰開夾子，放了牠。',
        out: {
          text: '鐵夾子咬得很死，你掰得滿手是血。白狐一瘸一拐地鑽進了草叢，走之前，回頭看了你一眼。',
          effects: [['flag', 'freed_fox'], ['mind', 4], regard('hu_sanniang', 10)],
        },
      },
      { text: '那是獵人的東西。走開。', out: { text: '你走開了。身後很靜，牠一聲也沒叫。' } },
      {
        text: '狐皮能賣錢。',
        karma: true,
        out: {
          text: '……\n\n那張狐皮，在坊市賣了六塊靈石。那天夜裡，你夢見一雙眼睛，看了你一整夜。',
          effects: [['ls', 6], ['mind', -8], ['flag', 'skinned_fox'], regard('hu_sanniang', -40)],
        },
      },
    ],
  },

  {
    id: 'lake_fisher',
    trigger: 'explore',
    nodes: ['mirror_lake'],
    weight: 6,
    cooldown: 90,
    cond: (s) => s.tod >= 4.5 && s.tod < 9,
    title: '漁翁',
    text: '天剛濛濛亮，湖面上起了一層薄霧。岸邊坐著一個戴斗笠的老漁翁，竿子垂進霧裡，看不見線，也看不見浮子。\n\n你在他身邊站了很久，他一動也沒動。',
    choices: [
      {
        text: '坐下，陪他一起釣。',
        check: { kind: 'xinxing', diff: 5 },
        ok: {
          text: '你們一句話也沒說。太陽升起來，霧散了，老漁翁收起竿子——鉤上什麼也沒有，連餌都沒有。\n\n「釣了一早上，」他說，「釣到一個肯陪老頭子坐著的人。值了。」',
          effects: [['mind', 5], ['insight', 1]],
        },
        fail: { text: '你坐不住，沒一會兒就開始東張西望。老漁翁咳嗽了一聲，你不好意思地站起來，走了。', effects: [['mind', 1]] },
      },
      {
        text: '問他湖裡有什麼。',
        out: {
          text: '「湖裡啊，」老漁翁慢悠悠地說，「有魚，有月亮，還有一座亭子。從前亭子裡住過一個仙人，後來不知道去哪了。」',
          effects: [['mind', 1], ['rumor', '鏡湖的老漁翁說，湖心亭裡從前住過一個仙人。']],
        },
      },
      { text: '不打擾他。', out: { text: '你悄悄地走開了。霧裡，傳來一聲很輕的水響。' } },
    ],
  },
];
