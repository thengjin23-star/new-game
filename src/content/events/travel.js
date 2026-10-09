import { needLs, npcPower, variant } from '../helpers.js';

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
        ok: {
          text: '你在山洞裡找到了那頭妖狼。還找到了兩個活著的孩子。\n\n村民們殺了一頭豬招待你。走的時候，孩子們追著你跑了好遠。',
          effects: [['days', 2], ['mind', 6], ['sysexp', 3], ['log', '替山村除了一頭妖狼']],
        },
        fail: { text: '妖狼比你想的難纏。你拼著受傷把牠趕跑了，但沒能殺死牠。', effects: [['days', 2], ['hurt', 1], ['mind', 2]] },
      },
      { text: '「我還有要事。」', out: { text: '你走出村口的時候，聽見身後有人在哭。', effects: [['mind', -5]] } },
    ],
  },
];
