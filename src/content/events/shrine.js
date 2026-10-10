import { flag, favor, alive } from '../helpers.js';

const X = ['fox_shrine'];

export default [
  {
    id: 'shrine_meet',
    trigger: 'explore',
    poi: 'fox_shrine_poi',
    auto: true,
    nodes: X,
    once: true,
    priority: 8,
    title: '狐仙廟',
    steps: {
      start: {
        text: '荒廟的門板只剩一扇，供桌上積著厚厚的灰，狐仙像的臉被雨水沖得看不清了。\n\n可供桌前點著一盞燈，燈火是藍色的。\n\n「跟了我一路的，就是你？」\n\n你猛地回頭。一個穿白衣的女子坐在供桌上，赤著腳，晃著腿，眼角有一顆紅痣。',
        choices: [
          { text: '「是我。」', out: { effects: [['meet', 'hu_sanniang'], ['favor', 'hu_sanniang', 5]], next: 'talk' } },
          { text: '「路過。」', out: { effects: [['meet', 'hu_sanniang']], next: 'talk' } },
          {
            text: '「妖怪！」拔出兵器。',
            karma: true,
            check: { kind: 'power', diff: 65 },
            ok: {
              text: '你一劍斬去，白衣女子化作一道白光，從破窗飛走了。\n\n供桌上的藍燈，滅了。',
              effects: [['meet', 'hu_sanniang'], ['favor', 'hu_sanniang', -60], ['flag', 'fox_attacked']],
            },
            fail: {
              text: '她連手都沒抬。你只覺得眼前一花，再醒來時，已經躺在廟外的草堆裡，兵器插在三丈外的樹上。\n\n「小娃娃，」風裡傳來她的笑聲，「三百年前，我也是這麼對付第一個來剝我皮的人。他後來成了我的朋友。」',
              effects: [['meet', 'hu_sanniang'], ['favor', 'hu_sanniang', -10], ['mind', -3]],
            },
          },
        ],
      },
      talk: {
        text: (s) =>
          '「我叫胡三娘。」她說，「在這兒住了三百年。看著青石鎮從三戶人家，長成現在這樣。」\n\n她跳下供桌，湊近你，聞了聞：「你身上……有一股很奇怪的味道。像是不該活著的人，偏偏活著。」' +
          (flag(s, 'skinned_fox')
            ? '\n\n她的鼻子又動了動，笑容淡了下去：「還有血腥味。我小輩的。」'
            : flag(s, 'freed_fox')
              ? '\n\n她瞥了一眼你的手：「前些日子，有人從獸夾裡放了我一個小輩。手上的疤，還沒好呢。」'
              : '') +
          '\n\n「我在這裡修行，不害人。」她回到供桌上坐好，「你能不能，別告訴別人？」',
        choices: [
          {
            text: '「我保證。」',
            out: {
              text: '她笑了，眼角的紅痣跟著一動：「人類的保證，我聽過很多次。」\n\n「不過，」她說，「我願意再信一次。」',
              effects: [['flag', 'fox_promise'], ['favor', 'hu_sanniang', 10], ['sched', 'fox_hunters', 120, 360, { expire: 720 }]],
            },
          },
          {
            text: '「那得看你給我什麼好處。」',
            karma: true,
            out: {
              text: '她看著你，笑容淡了一點：「三百年了，人類還是這個樣子。」\n\n她丟給你一株凝氣草：「先記賬吧。」',
              effects: [['item', 'ningqi_grass', 1], ['favor', 'hu_sanniang', -5], ['sched', 'fox_hunters', 120, 360, { expire: 720 }]],
            },
          },
        ],
      },
    },
  },

  {
    id: 'fox_hunters',
    trigger: 'scheduled',
    nodes: ['qingshi_town', 'fox_shrine', 'luoxia_market'],
    cond: (s) => alive(s, 'hu_sanniang') && !flag(s, 'fox_attacked'),
    title: '獵狐人',
    steps: {
      start: {
        text: '一個背著長劍的年輕人攔住你，亮出一塊腰牌：「青雲宗外門弟子，周延。奉命追查一頭害人的狐妖。」\n\n他壓低聲音：「聽說，你常往鎮東的荒廟跑？」\n\n他手裡捏著一袋靈石，在你眼前晃了晃：「指個路，這五十塊，是你的。」',
        choices: [
          {
            text: '「我不知道什麼狐妖。」',
            karma: true,
            check: { kind: 'xinxing', diff: 5 },
            ok: {
              text: '周延盯著你看了半晌，悻悻地走了。\n\n那天夜裡，你夢見一隻白狐蹲在你窗台上，衝你眨了眨眼睛。',
              effects: [['flag', 'fox_protected'], ['favor', 'hu_sanniang', 20], ['sched', 'fox_gift', 20, 60, { node: 'fox_shrine', expire: 1800 }]],
            },
            fail: { text: '「撒謊。」周延冷笑一聲，沒再多問，轉身往鎮東去了。', next: 'warn' },
          },
          {
            text: '收下靈石，指路。',
            karma: true,
            out: {
              text: '周延拍拍你的肩：「識時務。」\n\n當天夜裡，鎮東的方向燒起了一場大火。你站在屋頂上看著，火光是藍色的。',
              effects: [
                ['ls', 50], ['flag', 'fox_betrayed'], ['favor', 'hu_sanniang', -100], ['mind', -10],
                ['sched', 'fox_revenge', 360, 1080, { expire: 3600 }], ['rumor', '鎮東的荒廟起了一場大火。有人說看見一隻白狐從火裡逃了出去，尾巴著了火。'],
                ['log', '出賣了胡三娘'],
              ],
            },
          },
          { text: '先應付過去，再去報信。', out: { text: '你隨口指了個錯的方向，等周延走遠，拔腿就往荒廟跑。', next: 'warn' } },
        ],
      },
      warn: {
        text: '你趕到荒廟時，胡三娘正坐在供桌上，像是早就知道你會來。\n\n「他要來了，對吧？」她笑了笑，「三百年了，每隔幾十年，總有人要來剝我的皮。」',
        choices: [
          {
            text: '「我替你擋住他。」',
            check: { kind: 'power', diff: 38 },
            ok: {
              text: '你在廟門口截住了周延。一番交手，他捂著胳膊退走了，臨走前恨恨地說：「青雲宗不會放過你們！」\n\n胡三娘倚在門框上看完了全程，輕輕說了一句：「傻子。」',
              effects: [['flag', 'fox_protected'], ['favor', 'hu_sanniang', 30], ['flag', 'zhouyan_enemy'], ['sched', 'fox_gift', 10, 40, { node: 'fox_shrine', expire: 1800 }], ['log', '在狐仙廟前擊退了青雲宗弟子']],
            },
            fail: {
              text: '你沒擋住。可你拖了足夠久——等周延衝進廟裡，供桌上只剩一盞還在搖晃的藍燈。',
              effects: [['hurt', 2], ['favor', 'hu_sanniang', 25], ['flag', 'fox_fled'], ['npc', 'hu_sanniang', 'loc', null], ['sched', 'fox_gift', 300, 700, { expire: 2400 }]],
            },
          },
          {
            text: '「你快走吧。」',
            out: {
              text: '她看了你一會兒，吹滅了燈。\n\n「我會記得你的。」黑暗裡，她的聲音越來越遠。',
              effects: [['favor', 'hu_sanniang', 15], ['flag', 'fox_fled'], ['npc', 'hu_sanniang', 'loc', null], ['sched', 'fox_gift', 300, 700, { expire: 2400 }]],
            },
          },
        ],
      },
    },
  },

  {
    id: 'fox_gift',
    trigger: 'scheduled',
    cond: (s) => alive(s, 'hu_sanniang') && favor(s, 'hu_sanniang') > 0,
    title: '狐火',
    text: (s) =>
      flag(s, 'fox_fled')
        ? '你推開門，桌上多了一個小布包，包上壓著一根白色的狐毛。\n\n布包裡有一張符，和一張字條：「欠你的。——三娘」'
        : '胡三娘坐在供桌上等你，藍燈比往常亮。\n\n「上次的事，謝了。」她說，「三百年了，替我擋刀的人，你是第二個。」\n\n她攤開手，掌心裡跳動著一團幽藍的火焰。',
    choices: [
      {
        text: '收下。',
        out: {
          text: (s) =>
            favor(s, 'hu_sanniang') >= 50
              ? '「狐火符，危急時能救你一命。狐火術，自己慢慢練。」\n\n她想了想，又從供桌底下摸出一個木匣：「這個，我藏了一百年，一直沒捨得吃。給你吧。」\n\n木匣裡，是一枚金黃的果子。'
              : '「狐火符，危急時能救你一命。」她說，「狐火術，自己慢慢練。」',
          effects: [
            ['item', 'foxfire_talisman', 1], ['tech', 'fox_fire'],
            (s, ctx, r) => {
              if (s.npcs.hu_sanniang.favor >= 50) {
                s.player.items.longevity_fruit = (s.player.items.longevity_fruit || 0) + 1;
                r.chips.push({ text: '獲得：壽元果', tone: 'good' });
              }
            },
            ['sysexp', 10], ['log', '胡三娘贈予狐火'],
          ],
        },
      },
    ],
  },

  {
    id: 'fox_revenge',
    trigger: 'scheduled',
    cond: (s) => flag(s, 'fox_betrayed'),
    title: '白狐入夢',
    text: '你做了一個很長的夢。\n\n夢裡你回到了鎮東的荒廟，供桌上坐著一隻白狐，尾巴燒焦了一半。牠看著你，不說話，只是看著你。\n\n然後牠張開嘴，輕輕吸了一口氣。\n\n你醒來的時候，枕頭上落了幾根白頭髮。',
    choices: [
      {
        text: '……',
        out: {
          text: '叮——警告：檢測到宿主壽元流失。流失量：十年。\n\n叮——此為因果反噬，本系統無法干預。',
          effects: [['life', -10], ['mind', -8], ['flag', 'fox_revenged'], ['log', '被胡三娘奪去十年壽元']],
        },
      },
    ],
  },

  {
    id: 'shrine_visit',
    trigger: 'visit',
    npc: 'hu_sanniang',
    nodes: X,
    cooldown: 50,
    title: '胡三娘',
    text: (s) =>
      ({
        0: '胡三娘坐在供桌上曬月亮，尾巴從裙擺下露出來一截，一甩一甩的。',
        1: '胡三娘在剝花生，剝一顆，往狐仙像的嘴裡塞一顆。「三百年了，總得讓它也吃點。」',
        2: '胡三娘蜷在供桌上睡覺。你剛邁進門，她就睜開了一隻眼睛。',
      })[Math.floor(s.day / 50) % 3],
    choices: [
      {
        text: '聽她講三百年前的事。',
        check: { kind: 'wuxing', diff: 5 },
        ok: {
          text: (s) =>
            [
              '「三百年前，這裡還沒有鎮子，只有一個獵戶。他放了我一條生路。」她說，「後來他死了，他的兒子死了，他兒子的兒子也死了。我就一直守著。」',
              '「我見過一個人飛升失敗。」她說，「雷劫劈下來的時候，天上裂開了一道縫。縫後面……什麼都沒有。」',
              '「青雲宗的開山祖師，年輕時偷過我的雞。」她說，「這事你可別往外說。」',
            ][Math.floor(s.day / 50) % 3],
          effects: [['insight', 1], ['favor', 'hu_sanniang', 3]],
        },
        fail: { text: '她講著講著，自己先睡著了。', effects: [['favor', 'hu_sanniang', 2]] },
      },
      {
        text: '帶一隻燒雞給她。',
        need: (s) => (s.player.ls >= 2 ? null : '靈石不足（需 2）'),
        out: { text: '她吃得滿手是油，眼睛眯成了兩道彎月。', effects: [['ls', -2], ['favor', 'hu_sanniang', 6]] },
      },
    ],
  },
];
