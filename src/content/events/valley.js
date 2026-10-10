import { has, flag } from '../helpers.js';

const V = ['lingxi_valley'];

export default [
  {
    id: 'valley_arrive',
    trigger: 'arrive',
    nodes: V,
    once: true,
    title: '靈溪谷',
    text: '谷口兩側是陡峭的石壁，中間一條小溪蜿蜒而出。溪水清得能看見水底的每一顆石子，水面上浮著一層薄薄的白霧。\n\n你深吸一口氣，靈氣湧進肺裡，涼絲絲的，帶著甜味。\n\n可是谷裡太安靜了。沒有鳥叫，沒有蟲鳴。',
    choices: [{ text: '小心地往裡走。', out: { effects: [['sysexp', 3]] } }],
  },

  {
    id: 'valley_python',
    trigger: 'explore',
    poi: 'python_pool',
    auto: true,
    nodes: V,
    priority: 8,
    cooldown: 20,
    cond: (s) => !flag(s, 'valley_safe'),
    title: '靈溪蟒',
    text: '溪水中央的巨石上，盤著一條水桶粗的青黑大蟒。牠的頭頂鼓起一個小包——那是快要化蛟的徵兆。\n\n牠睜開眼睛，豎瞳裡映出你的影子。\n\n叮——一階上品妖獸。牠在這谷裡修煉的年頭，可能比你的歲數還長。',
    choices: [
      {
        text: '斬蟒。',
        tag: 'danger',
        check: { kind: 'power', diff: 55 },
        fight: { foes: [['python', 1]] },
        ok: {
          text: '溪水被染紅了半里。你斬下蟒首的時候，劍都捲了刃。\n\n從今天起，這座谷，是你的了。',
          effects: [['flag', 'valley_safe'], ['item', 'python_scale', 3], ['sysexp', 15], ['log', '斬殺靈溪蟒，佔據靈溪谷']],
        },
        fail: { text: '蟒尾一掃，你像斷了線的風箏一樣飛出去，撞斷了一棵樹。', effects: [['hurt', 2, '被靈溪蟒絞殺']] },
      },
      {
        text: '用雷擊木布下陷阱。',
        show: (s) => has(s, 'lightning_wood'),
        check: { kind: 'wuxing', diff: 5 },
        ok: {
          text: '你把雷擊木削成尖樁，埋在牠每天出水的必經之路上。三天後，雷光一閃，大蟒在溪邊翻滾了半夜，再也沒有起來。',
          effects: [['item', 'lightning_wood', -1], ['days', 3], ['flag', 'valley_safe'], ['item', 'python_scale', 2], ['sysexp', 15], ['log', '設陷阱除掉了靈溪蟒']],
        },
        fail: { text: '陷阱被牠察覺了。牠繞開了尖樁，然後朝你游了過來。', effects: [['item', 'lightning_wood', -1], ['hurt', 1]] },
      },
      {
        text: '試著與牠溝通。',
        show: (s) => s.player.realm >= 1,
        check: { kind: 'xinxing', diff: 7 },
        ok: {
          text: '你盤膝坐在溪邊，收斂所有的敵意，只是靜靜地吐納。\n\n一天，兩天。第三天，大蟒游過來，在你身邊盤了一圈，然後緩緩沉入了水潭深處。\n\n從此，你在谷中修煉，牠在潭底修煉，井水不犯河水。',
          effects: [['days', 3], ['flag', 'valley_safe'], ['flag', 'python_friend'], ['mind', 6], ['sysexp', 20], ['log', '與靈溪蟒達成默契']],
        },
        fail: { text: '牠沒有耐心聽你吐納。', effects: [['hurt', 1]] },
      },
      { text: '離開。', out: { text: '你慢慢退出了山谷。牠沒有追。' } },
    ],
  },

  {
    id: 'valley_spring',
    trigger: 'explore',
    poi: 'spirit_spring',
    nodes: V,
    cooldown: 150,
    weight: 10,
    cond: (s) => flag(s, 'valley_safe'),
    title: '靈泉',
    text: '水潭邊的石縫裡，有一眼泉水在汩汩地往外冒，泉眼周圍的石頭被靈氣浸得溫潤如玉。',
    choices: [
      {
        text: '在泉中靜坐。',
        out: {
          text: '泉水沒過你的胸口，靈氣順著毛孔往裡鑽。你坐了三天三夜，起身時，渾身輕得像要飄起來。',
          effects: [['days', 3], ['buff', 'valley_spring', 120], ['mind', 4]],
        },
      },
    ],
  },

  {
    id: 'valley_cultivators',
    trigger: 'arrive',
    nodes: V,
    once: true,
    cond: (s) => flag(s, 'valley_safe') && s.player.realm >= 1,
    title: '不速之客',
    text: '谷口來了三個散修。為首的是個絡腮鬍子，看見你，抱了抱拳：「這位道友，聽說靈溪谷的妖蟒沒了，我們兄弟想進來討口靈氣喝。」\n\n話說得客氣，三個人的手，卻都按在兵器上。',
    choices: [
      {
        text: '「谷這麼大，一起修煉吧。」',
        out: {
          text: '絡腮鬍子愣了一下，大笑：「好！道友敞亮！」\n\n之後的日子，谷裡多了三個鄰居。他們偶爾會帶些酒肉回來，跟你講外面的事。',
          effects: [['flag', 'valley_shared'], ['mind', 4], ['rumor', '靈溪谷裡住了幾個散修，聽說谷主是個好說話的人。']],
        },
      },
      {
        text: '「這裡是我的地方。」',
        check: { kind: 'power', diff: 40 },
        fight: { foes: [['cultivator', 3]] },
        ok: { text: '你拔劍出鞘。三個人對視一眼，退走了。', effects: [['mind', 1]] },
        fail: {
          text: '三打一。你被打得滿地找牙，他們卻沒趕你走，只是在谷的另一頭住了下來。',
          effects: [['hurt', 1], ['flag', 'valley_shared'], ['mind', -4]],
        },
      },
    ],
  },

  {
    id: 'valley_deer',
    trigger: 'explore',
    nodes: V,
    cooldown: 120,
    weight: 5,
    cond: (s) => flag(s, 'valley_safe'),
    title: '靈鹿',
    text: '溪邊站著一頭鹿，渾身的毛泛著淡淡的光，頭上的角像兩枝玉雕的珊瑚。\n\n牠看見你，沒有跑。牠低下頭喝了一口水，轉身往谷裡走，走幾步，回頭看你一眼。',
    choices: [
      { text: '跟著牠走。', out: { text: '靈鹿把你帶到一面石壁前，石縫裡長滿了凝氣草。你回過頭，牠已經不見了。', effects: [['item', 'ningqi_grass', 3], ['mind', 2]] } },
      { text: '遠遠看著。', out: { text: '牠在谷口站了一會兒，像是有點失望，然後隱進了霧裡。你在溪邊坐了很久，心裡很靜。', effects: [['mind', 4]] } },
    ],
  },
];
