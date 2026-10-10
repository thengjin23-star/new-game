import { has, flag, met, within } from '../helpers.js';
import { WINDOWS } from '../../world/arcs.js';

const R = ['ancient_ruins'];

export default [
  {
    id: 'ruins_arrive',
    trigger: 'arrive',
    nodes: R,
    once: true,
    title: '古戰場',
    text: '灰白色的荒原一眼望不到頭。地上插滿了劍，有的只剩劍柄，有的斷成兩截，鏽得和泥土一個顏色。\n\n風從劍林中穿過，發出嗚嗚的聲音，像很多人在同時哭。\n\n你踩到了什麼東西。低頭一看，是一截白骨。\n\n叮——此地陰氣濃度超標。殘魂反應：大量。本系統建議宿主：守住心神。',
    choices: [{ text: '握緊拳頭，往裡走。', out: { effects: [['sysexp', 5], ['mind', -2]] } }],
  },

  {
    id: 'ruins_soul',
    trigger: 'explore',
    mob: true,
    nodes: R,
    cooldown: 50,
    weight: 10,
    title: '殘魂',
    text: '一道模糊的人影從一柄斷劍上升起來。他穿著一身看不出年代的鎧甲，臉是一團霧。\n\n「殺……」他說，「殺……殺……」\n\n他朝你撲過來的時候，你看見了他的記憶：火、血、崩塌的天空，和一道把天河劈成兩半的劍光。',
    choices: [
      {
        text: '守住心神，看清他的記憶。',
        check: { kind: 'xinxing', diff: 6 },
        ok: {
          text: '你在那片記憶裡站了很久。殘魂穿過你的身體，散了。\n\n你記住了那道劍光。也記住了劍光之後，天空裂開的那一道縫。',
          effects: [['insight', 2], ['sysexp', 4]],
        },
        fail: { text: '你被拖進了那場三千年前的大戰。等你掙脫出來，已經在地上躺了兩天。', effects: [['days', 2], ['mind', -6], ['hurt', 1, '神魂被殘魂撕碎']] },
      },
      {
        text: '用兵器斬散他。',
        check: { kind: 'power', diff: 30 },
        ok: { text: '劍光過處，殘魂發出一聲不甘的嘶吼，化為飛灰。', effects: [['mind', 1]] },
        fail: { text: '劍從他身上穿了過去。他沒有實體，可他的手，卻抓住了你的心。', effects: [['mind', -8], ['hurt', 1, '神魂被殘魂撕碎']] },
      },
    ],
  },

  {
    id: 'ruins_broken_sword',
    trigger: 'explore',
    poi: 'broken_sword',
    nodes: R,
    cooldown: 10,
    cond: (s) => !has(s, 'broken_sword'),
    title: '斷劍',
    text: '所有的劍都鏽了，只有一柄沒有。\n\n它只剩三寸劍身，插在一塊黑石裡，寒光凜凜，像是昨天才斷的。\n\n你伸出手。劍身上，有一股冰冷的意志在抗拒你。',
    choices: [
      {
        text: '握住它。',
        check: { kind: 'xinxing', diff: 6 },
        ok: {
          text: '冰冷的劍意衝進你的經脈，像要把你凍成冰。你咬著牙，一動不動。\n\n很久很久之後，那股意志退了。它像是在說：勉強，算你一個。',
          effects: [['item', 'broken_sword', 1], ['sysexp', 10], ['log', '在古戰場得到一截古劍殘片']],
        },
        fail: { text: '劍意反噬，你的手掌被割開一道深可見骨的口子。斷劍紋絲不動。', effects: [['hurt', 1]] },
      },
      { text: '算了。', out: { text: '你收回手。斷劍上的寒光，好像暗了一點。' } },
    ],
  },

  {
    id: 'ruins_frag',
    trigger: 'explore',
    poi: 'frag_stele',
    nodes: R,
    once: true,
    title: '殘頁',
    text: '一塊倒塌的石碑下，壓著一頁東西。非金非玉，薄如蟬翼，在一片灰白中閃著淡淡的光。\n\n你把它抽出來的那一刻，識海裡響起了一個聲音——不是系統平常的聲音，更老，更疲憊：\n\n「……第七次推演失敗。命簿之外，仍需一人。」\n\n「若有後來者得見此頁——」\n\n聲音斷了。\n\n叮——……叮。系統記憶校正中。',
    choices: [
      {
        text: '「你剛才……說話了？」',
        out: {
          text: '叮——本系統一直在說話。\n\n「不是你。是另一個聲音。」\n\n叮——……權限不足。\n\n這一次，系統沉默了很久，才說出這四個字。',
          effects: [['frag', 'frag_ruins'], ['log', '在古戰場找到天機殘頁']],
        },
      },
    ],
  },

  {
    id: 'ruins_su_camp',
    trigger: 'explore',
    poi: 'realm_gate',
    auto: true,
    nodes: R,
    once: true,
    priority: 5,
    cond: (s) => s.day >= WINDOWS.realm[0] - 30 && s.day < WINDOWS.realm[0] && s.npcs.su_qingyao.loc === 'ancient_ruins',
    title: '營火',
    text: '荒原中央的那座斷石門前，有一堆營火。\n\n蘇清瑤坐在火邊，看見你，愣了很久。\n\n「你也來了？」她說，「真奇怪……上輩子這個時候，這裡只有我一個人。」',
    choices: [
      {
        text: '在她的營火旁坐下。',
        out: {
          text: '她沒有趕你走。你們守著火坐了一夜，誰也沒說話。\n\n天快亮時，她忽然說：「門開的時候，跟緊我。踩我踩過的地方。」',
          effects: [['meet', 'su_qingyao'], ['flag', 'su_met'], ['flag', 'su_ruins_met'], ['favor', 'su_qingyao', 10], ['sysexp', 8]],
        },
      },
      {
        text: '另找地方紮營。',
        out: { text: '你在遠處搭了個窩棚。夜裡往她那邊看，她一直坐著，像在等什麼。', effects: [['meet', 'su_qingyao']] },
      },
    ],
  },

  {
    id: 'ruins_realm',
    trigger: 'explore',
    poi: 'realm_gate',
    auto: true,
    nodes: R,
    cooldown: 3,
    priority: 10,
    cond: (s) => flag(s, 'realm_open') && within(s, WINDOWS.realm) && !flag(s, 'realm_entered'),
    title: '秘境',
    steps: {
      start: {
        text: (s) =>
          `古戰場中央那座斷了一半的石門，此刻亮著。門裡是另一片天地。\n\n門前已經擠了不少散修，有人在罵，有人在笑，有人在默默地檢查兵器。${met(s, 'su_qingyao') ? '\n\n你看見了蘇清瑤。她站在最前面。' : ''}\n\n叮——警告：秘境內死亡率極高。`,
        choices: [
          { text: '跟著人群進去。', out: { next: 'inside', effects: [['flag', 'realm_entered']] } },
          {
            text: '跟在蘇清瑤後面。',
            show: (s) => met(s, 'su_qingyao'),
            out: { next: 'follow', effects: [['flag', 'realm_entered']] },
          },
          { text: '太危險了，離開。', out: { text: '你轉身離開。身後，石門的光芒越來越亮。' } },
        ],
      },
      inside: {
        text: '秘境裡是一片永夜的荒原，天上掛著兩輪殘月。地上全是屍骨，有新有舊。\n\n前方有兩條路。左邊傳來兵器交擊的聲音，右邊一片死寂。',
        choices: [
          { text: '往左。', out: { next: 'fight' } },
          { text: '往右。', out: { next: 'silent' } },
        ],
      },
      fight: {
        text: '一群散修正在圍攻一具骷髏將軍。牠身高一丈，手持一柄斷戟，每一戟都掃倒一片人。',
        choices: [
          {
            text: '加入圍攻。',
            check: { kind: 'power', diff: 45 },
            ok: { text: '骷髏將軍轟然倒塌。在一片混亂的分贓裡，你搶到了一袋靈石和兩顆療傷丹。', effects: [['ls', [50, 80]], ['item', 'heal_pill', 2]], next: 'core' },
            fail: { text: '斷戟擦著你的頭皮掃過。你滾到一邊，趁亂溜了。', effects: [['hurt', 1, '戰死於秘境']], next: 'core' },
          },
          { text: '繞過去。', out: { text: '你貼著石壁，悄悄繞過了戰場。', next: 'core' } },
        ],
      },
      silent: {
        text: '死寂的小路盡頭，是一間小石室。門上刻滿了看不懂的符文，地上散落著幾具前人的骨頭。',
        choices: [
          {
            text: '解開符文。',
            check: { kind: 'wuxing', diff: 6 },
            ok: { text: '最後一道符文亮起時，石門開了。石台上放著一卷殘經，封皮上寫著四個字：《玄水真經》。', effects: [['item', 'book_xuanshui', 1]], next: 'core' },
            fail: { text: '符文爆開，炸得你滿臉是血。石門紋絲不動。', effects: [['hurt', 1, '死於秘境禁制']], next: 'core' },
          },
          { text: '不碰，往前走。', out: { next: 'core' } },
        ],
      },
      follow: {
        text: '蘇清瑤走得很快，每一步都踩在某些石板上，避開另一些。你學著她的樣子，一步不差。\n\n走到一半，她回頭看了你一眼：「別跟著我。」',
        choices: [
          {
            text: '繼續跟。',
            check: { kind: 'jiyuan', diff: (s) => (flag(s, 'su_ruins_met') ? 3 : 6) },
            ok: { next: 'altar' },
            fail: { text: '你踩錯了一塊石板。地面塌陷，你掉進了另一條路。', effects: [['hurt', 1, '死於秘境機關']], next: 'inside' },
          },
          { text: '聽她的，自己走。', out: { next: 'inside' } },
        ],
      },
      altar: {
        text: '你跟著她一路走到秘境的最深處。祭壇上放著一卷古經，和一枚通體金黃的果子。\n\n蘇清瑤看了你很久。\n\n「古經是我的。」她說，「果子，你拿走吧。就當……謝你一路沒有搶。」',
        choices: [
          {
            text: '道謝，收下果子。',
            out: {
              text: '那是一枚壽元果。\n\n出秘境的時候，蘇清瑤說：「上輩子，我在這裡差點死了。這輩子多了一個人，好像也不壞。」',
              effects: [['item', 'longevity_fruit', 1], ['favor', 'su_qingyao', 15], ['sysexp', 20], ['log', '與蘇清瑤同闖古戰場秘境']],
            },
          },
          {
            text: '趁她不備，連古經一起搶。',
            karma: true,
            check: { kind: 'power', diff: 50 },
            ok: {
              text: '你搶到了古經和果子。蘇清瑤沒有追，只是站在祭壇前，用一種很平靜的眼神看著你。\n\n「原來，」她說，「這輩子多出來的人，是你這樣的。」',
              effects: [['item', 'longevity_fruit', 1], ['item', 'book_xuanshui', 1], ['favor', 'su_qingyao', -80], ['flag', 'su_enemy'], ['mind', -10], ['log', '在秘境中搶奪了蘇清瑤']],
            },
            fail: {
              text: '你的手還沒碰到古經，她的劍已經抵在你的喉嚨上。\n\n「我活了兩輩子，」她說，「你覺得我會不防著你？」\n\n她沒有殺你。她只是把你扔出了秘境。',
              effects: [['hurt', 2], ['favor', 'su_qingyao', -60], ['flag', 'su_enemy'], ['mind', -6]],
            },
          },
        ],
      },
      core: {
        text: '秘境開始震動，天上的兩輪殘月一明一暗——出口正在關閉。\n\n你看見不遠處的祭壇上，還有一枚金黃的果子，周圍的人都在往外跑，沒人顧得上它。',
        choices: [
          {
            text: '去拿果子。',
            check: { kind: 'jiyuan', diff: 7 },
            ok: { text: '你抓起果子，在出口合攏的最後一刻滾了出去。', effects: [['item', 'longevity_fruit', 1], ['sysexp', 20], ['log', '闖過古戰場秘境']] },
            fail: { text: '地面裂開，你差點被吞進去。等你爬出秘境，手裡什麼都沒有。', effects: [['hurt', 1, '被困死在秘境中'], ['sysexp', 15], ['log', '闖過古戰場秘境']] },
          },
          { text: '立刻撤離。', out: { text: '你第一批衝出了秘境。回頭看時，石門已經暗了。', effects: [['sysexp', 15], ['log', '闖過古戰場秘境']] } },
        ],
      },
    },
  },

  {
    id: 'ruins_wisps',
    trigger: 'explore',
    nodes: R,
    cooldown: 30,
    weight: 7,
    cond: (s) => s.tod >= 19.5 || s.tod < 5,
    title: '鬼火',
    text: '斷劍林裡飄起了鬼火。一團，兩團，三團……綠瑩瑩的，在半人高的地方慢慢地轉，像是在找什麼東西。\n\n離你最近的那一團停了一下，往遠處飄去，又停下來。像在等你。',
    choices: [
      {
        text: '跟上去。',
        check: { kind: 'jiyuan', diff: 5 },
        ok: { text: '鬼火把你引到一截斷牆下，然後散了。牆根的土是鬆的。你挖了幾下，挖出一個鏽死的鐵盒。', effects: [['item', 'mystery', 1]] },
        fail: { text: '你跟著鬼火繞了半夜，最後發現自己又回到了原地。鬼火散了，風裡傳來一陣笑聲。', effects: [['mind', -3]] },
      },
      {
        text: '念一段往生咒。',
        out: { text: '你不會往生咒，只記得小時候聽和尚念過的幾句。你念了。\n\n鬼火一團一團地暗下去。最後一團，在你面前停了很久，才熄滅。', effects: [['mind', 4], ['sysexp', 2]] },
      },
      { text: '離開這裡。', out: { text: '你轉身就走。走出很遠，還覺得背後有東西在看你。', effects: [['mind', -1]] } },
    ],
  },
];
