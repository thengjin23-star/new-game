import { has, flag, favor, alive, variant, night } from '../helpers.js';

const P = ['qingxu_temple'];

export default [
  {
    id: 'temple_lesson',
    trigger: 'visit',
    npc: 'song_he',
    nodes: P,
    cooldown: 45,
    title: '松下',
    text: (s) =>
      flag(s, 'songhe_zhuji')
        ? '松鶴道人如今看上去年輕了二十歲，鬍子還是白的，腰卻直了。他正在給老松樹澆水，見你來，笑得像個孩子：「來來來，坐。」'
        : variant(s, [
            '松鶴道人坐在老松樹下，眯著眼睛曬太陽。\n\n「來了？」他說，「坐。」',
            '老道正在補屋頂，一邊補一邊罵天。看見你，他扔下手裡的茅草：「正好，下來陪老道說說話。」',
            '老道在煮茶。茶葉是山上隨手摘的，水是觀後古井打的，味道居然不錯。',
          ]),
    choices: [
      {
        text: '請道長指點修行。',
        check: { kind: 'wuxing', diff: 5 },
        ok: {
          text: (s) =>
            variant(s, [
              '「修行修行，修的是心，行的是路。」他說，「你資質差，就走慢點。走慢點，才看得清路邊的花。」',
              '「靈氣不是吸進來的，是請進來的。」他指著松樹，「你看它，從來不急。三百年了，長得比誰都高。」',
              '「突破這種事，越想越不成。」他說，「什麼時候你忘了要突破，就成了。」',
            ], 1),
          effects: [['insight', 1], ['favor', 'song_he', 3], ['mind', 2]],
        },
        fail: { text: '他說了很多，你聽懂了一半。另一半，他說等你再活二十年就懂了。', effects: [['favor', 'song_he', 2]] },
      },
      {
        text: '陪他下一盤棋。',
        out: {
          text: '老道下棋很臭，悔棋的時候卻理直氣壯：「老道活了一百多年，悔一步棋怎麼了？」',
          effects: [['days', 1], ['favor', 'song_he', 5], ['mind', 4]],
        },
      },
      {
        text: '把壽元果送給他。',
        show: (s) => has(s, 'longevity_fruit') && !flag(s, 'songhe_saved') && s.day > 900,
        karma: true,
        out: {
          text: '老道看著那枚果子，半天沒說話。\n\n「你知道這是什麼嗎？」\n\n「知道。」\n\n「那你知道，老道這把年紀，吃了也是浪費？」\n\n「不浪費。」你說。\n\n老道背過身去，肩膀抖了一下。那天晚上，觀裡的老松樹，抽出了一枝新芽。',
          effects: [
            ['item', 'longevity_fruit', -1], ['flag', 'songhe_saved'], ['unflag', 'songhe_dying'], ['favor', 'song_he', 40],
            ['mind', 10], ['sysexp', 15], ['log', '以壽元果為松鶴道人續命'], ['sched', 'songhe_retry', 600, 1100, { expire: 1800 }],
          ],
        },
      },
      {
        text: '問他年輕時的事。',
        show: (s) => favor(s, 'song_he') >= 20 && !flag(s, 'songhe_story'),
        out: {
          text: '老道沉默了很久。\n\n「六十年前，」他說，「我也衝過築基。」\n\n「丹藥、靈地、心法，該準備的都準備了。最後那一刻，我想起了一個人——一個我答應過要回去娶她的人。我分了心。」\n\n他笑了笑，滿臉皺紋都擠在一起：「後來我回去了。她已經嫁人了，孩子都會打醬油了。」\n\n「所以啊，」他拍拍你的手，「突破的時候，別想別的。」',
          effects: [['flag', 'songhe_story'], ['insight', 2], ['favor', 'song_he', 5], ['mind', 3]],
        },
      },
    ],
  },

  {
    id: 'temple_chores',
    trigger: 'explore',
    poi: 'temple_yard',
    nodes: P,
    cooldown: 30,
    weight: 8,
    title: '灑掃',
    text: (s) =>
      variant(s, [
        '觀裡的落葉又積了一地。你拿起竹掃帚，從前殿掃到後院。',
        '柴房的柴快燒完了。你上山砍了兩捆，劈好，碼得整整齊齊。',
        '屋頂又漏了。你搬來梯子，一片一片地換瓦。',
      ]),
    choices: [
      {
        text: '慢慢做完。',
        out: {
          text: '做完的時候，太陽剛好落山。你坐在台階上，看著被掃乾淨的院子，心裡很靜。',
          effects: [['days', 2], ['mind', 3], ['favor', 'song_he', 2]],
        },
      },
    ],
  },

  {
    id: 'temple_well',
    trigger: 'explore',
    poi: 'old_well',
    nodes: P,
    once: true,
    cond: (s) => night(s),
    title: '古井',
    text: '觀後那口古井，你打過無數次水。\n\n可今晚，月光照進井裡，井底有一點光，不是月亮的倒影。\n\n叮——檢測到微弱的同源波動。',
    choices: [
      {
        text: '順著井繩下去。',
        check: { kind: 'gengu', diff: 5 },
        ok: {
          text: '井壁上長滿青苔，越往下越冷。井底的水只到腳踝，水下壓著一塊非金非玉的薄片，上面的字在發光：\n\n「……問道者，問的不是道，是天。天若無答，則……」\n\n後面的字，斷了。\n\n你上來的時候，井水湧了出來，帶著一股清冽的靈氣。',
          effects: [['frag', 'frag_well'], ['flag', 'temple_well_open'], ['log', '在清虛觀古井底找到天機殘頁']],
        },
        fail: {
          text: '井繩斷了。你摔在井底，疼得半天爬不起來。\n\n手在水裡亂摸，卻摸到一塊冰涼的薄片。',
          effects: [['hurt', 1], ['frag', 'frag_well'], ['flag', 'temple_well_open'], ['log', '在清虛觀古井底找到天機殘頁']],
        },
      },
      { text: '明天再說。', out: { text: '你回去睡了。第二天再看，井底什麼也沒有。……也許只是今晚的月光剛好。' } },
    ],
  },

  {
    id: 'temple_songhe_farewell',
    trigger: ['arrive', 'explore', 'visit'],
    npc: 'song_he',
    poi: 'temple_hall',
    auto: true,
    nodes: P,
    once: true,
    priority: 20,
    cond: (s) => flag(s, 'songhe_dying') && alive(s, 'song_he') && !flag(s, 'songhe_saved'),
    title: '油燈',
    text: '老道躺在竹榻上，屋裡點著一盞油燈。\n\n「你來得正好。」他說，聲音像風吹過枯葉，「老道的時候到了。」\n\n他摸索著，從枕頭底下抽出一本手札：「這一輩子，就攢下這點東西。都是失敗的經驗……失敗的經驗，也是經驗。」',
    choices: [
      {
        text: '餵他服下壽元果。',
        show: (s) => has(s, 'longevity_fruit'),
        karma: true,
        out: {
          text: '老道愣愣地看著你，看著那枚果子，看了很久。\n\n「傻孩子。」他說，聲音在發抖，「這東西，你自己留著，能多活二十年。」\n\n你沒說話，把果子塞進他嘴裡。\n\n那天晚上，觀裡的老松樹，抽出了一枝新芽。',
          effects: [
            ['item', 'longevity_fruit', -1], ['flag', 'songhe_saved'], ['unflag', 'songhe_dying'], ['favor', 'song_he', 40],
            ['mind', 10], ['sysexp', 15], ['log', '以壽元果為松鶴道人續命'], ['sched', 'songhe_retry', 600, 1100, { expire: 1800 }],
          ],
        },
      },
      {
        text: '接過手札。',
        out: {
          text: '你接過手札。老道的手鬆開了，像是終於放下了什麼。\n\n「別學我。」他說，「想做的事，就去做。想見的人，就去見。」\n\n油燈跳了一下。\n\n他走了。',
          effects: [
            ['item', 'book_songhe', 1], ['npc', 'song_he', 'alive', false], ['flag', 'songhe_dead'], ['unflag', 'songhe_dying'],
            ['flag', 'legacy_taken'], ['insight', 2], ['log', '送走了松鶴道人'],
          ],
        },
      },
    ],
  },

  {
    id: 'temple_legacy',
    trigger: ['arrive', 'explore'],
    poi: 'temple_hall',
    auto: true,
    nodes: P,
    once: true,
    priority: 15,
    cond: (s) => flag(s, 'songhe_legacy') && !flag(s, 'legacy_taken'),
    title: '空觀',
    text: '觀門虛掩著。院子裡積滿了落葉，松針鋪了厚厚一層。\n\n竹榻上，壓著一本手札。扉頁上歪歪扭扭地寫著：\n\n「贈{name}。」\n\n你來晚了。',
    choices: [
      {
        text: '收下手札。',
        out: {
          text: '你在竹榻邊坐了很久。然後把院子掃乾淨，關好觀門，才離開。',
          effects: [['item', 'book_songhe', 1], ['flag', 'legacy_taken'], ['mind', -2], ['insight', 1], ['log', '收下松鶴道人的遺物']],
        },
      },
    ],
  },

  {
    id: 'songhe_retry',
    trigger: 'scheduled',
    cond: (s) => alive(s, 'song_he') && flag(s, 'songhe_saved'),
    title: '衝關',
    text: '清虛觀的方向，一道靈光沖天而起。\n\n是松鶴道人。他在衝擊築基——時隔六十年，第二次。',
    choices: [
      {
        text: '趕過去。',
        out: {
          effects: [
            ['days', 1],
            ['pick', [
              [35, [['flag', 'songhe_zhuji'], ['npc', 'song_he', 'realm', 2], ['npc', 'song_he', 'stage', 0], ['item', 'zhuji_pill', 1], ['favor', 'song_he', 10], ['log', '松鶴道人築基成功']]],
              [65, [['npc', 'song_he', 'alive', false], ['flag', 'songhe_dead'], ['item', 'book_songhe', 1], ['flag', 'legacy_taken'], ['insight', 3], ['log', '松鶴道人衝關失敗，含笑坐化']]],
            ]],
          ],
          text: (s) =>
            flag(s, 'songhe_zhuji')
              ? '你趕到時，老道正盤坐在松樹下，周身靈氣如潮。\n\n他睜開眼睛，眼裡有光：「成了。」\n\n然後他從懷裡掏出一個玉瓶，塞給你：「這幾年替坊市丹師打下手，攢的藥材煉成的。本來是給自己準備的……現在用不上了。」\n\n是一顆築基丹。'
              : '你趕到時，靈光已經散了。老道盤坐在松樹下，嘴角帶著笑。\n\n他輸了。可他是笑著走的。\n\n他身邊放著一本手札，扉頁上寫著：「贈{name}。這一次，我沒有分心。」',
        },
      },
    ],
  },
];
