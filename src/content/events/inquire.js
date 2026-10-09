import { NODES } from '../../world/map.js';
import { flag, known, variant } from '../helpers.js';

const TOWN = ['qingshi_town'];
const MARKET = ['luoxia_market'];

export default [
  {
    id: 'inq_valley',
    trigger: 'inquire',
    nodes: TOWN,
    once: true,
    cond: (s) => !known(s, 'lingxi_valley') && s.day > 20,
    title: '藥農的話',
    text: '你在茶館裡跟幾個上山採藥的藥農搭話。\n\n「往西翻過三道梁，有個谷，冬天不結冰。」一個老藥農說，「裡頭的草藥長得比外頭快一倍。可沒人敢進——谷裡有條大蛇，有人說有水缸那麼粗。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'lingxi_valley']] } }],
  },
  {
    id: 'inq_forest',
    trigger: 'inquire',
    nodes: TOWN,
    once: true,
    cond: (s) => !known(s, 'black_forest'),
    title: '黑風林',
    text: '「黑風林？」茶館掌櫃壓低了聲音，「青石山往北，兩天的路。裡頭有一窩劫道的，叫黑風寨，專搶落單的仙師。仙師都敢搶，你說他們狠不狠？」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'black_forest']] } }],
  },
  {
    id: 'inq_fox',
    trigger: 'inquire',
    nodes: TOWN,
    once: true,
    cond: (s) => !known(s, 'fox_shrine') && s.day > 30,
    title: '更夫',
    text: '打更的老周說，鎮東那座荒廟，半夜常常亮著燈。藍色的燈。\n\n「我年輕時候好奇，進去看過一次。」他說，「裡頭坐著一個白衣服的女人，衝我笑了笑。我就什麼都不記得了。醒來時，我躺在自家床上，枕頭邊多了一隻燒雞。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'fox_shrine']] } }],
  },
  {
    id: 'inq_lin',
    trigger: 'inquire',
    nodes: TOWN,
    cooldown: 200,
    cond: (s) => s.day > 70,
    title: '鎮上的閒話',
    text: (s) => {
      const lin = s.npcs.lin_chen;
      if (lin.realm === 0) return '「林家那個廢物？每天天不亮就上山，天黑了才回來，渾身是傷。」賣豆花的老李頭搖搖頭，「也不知道在折騰什麼。」';
      if (lin.stage < 6) return '「你聽說了沒？林家那小子，進青雲宗了！還是親傳！」老李頭說得眉飛色舞，「我早說那孩子不簡單，你看他小時候吃豆花，從來不剩一口！」';
      if (lin.loc) return '「林塵回來過一趟，三年之約，一劍就把沈家小姐打下了台。」老李頭說，「沈家現在大門緊閉，連買菜都走後門。」';
      return '「林塵去中州了。」老李頭說，「走的那天，林家祠堂的燈亮了一夜。」';
    },
    choices: [{ text: '聽完。', out: { effects: [['mind', 1]] } }],
  },
  {
    id: 'inq_sect',
    trigger: 'inquire',
    nodes: MARKET,
    once: true,
    cond: (s) => !known(s, 'qingyun_sect'),
    title: '青雲宗',
    text: '「青雲宗？東荒最大的宗門——好吧，東荒也就這一個像樣的宗門。」一個散修嗤笑，「坊市往東三天，青雲峰上。十年開一次山門收徒，資質差的，連雜役都不要。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'qingyun_sect']] } }],
  },
  {
    id: 'inq_ferry',
    trigger: 'inquire',
    nodes: MARKET,
    once: true,
    cond: (s) => !known(s, 'crane_ferry') && s.player.realm >= 1,
    title: '去中州的路',
    text: '「去中州？」老散修上下打量你，「從坊市往東南走五天，有個白鶴渡。過了江就是中州。」\n\n「不過，」他咧嘴一笑，「江裡的東西不吃築基修士，因為築基修士打得過它。你嘛……」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'crane_ferry']] } }],
  },
  {
    id: 'inq_ruins',
    trigger: 'inquire',
    nodes: MARKET,
    once: true,
    cond: (s) => !known(s, 'ancient_ruins') && s.day > 240,
    title: '古戰場',
    text: '「古戰場遺跡，黑風林北邊。」一個獨臂的老修士說，「我這條胳膊，就是丟在那兒的。」\n\n他喝了口酒：「那裡有秘境，幾年開一次。進去的人，一半出不來。出來的那一半，有的發了財，有的瘋了。」',
    choices: [{ text: '記下了。', out: { effects: [['discover', 'ancient_ruins']] } }],
  },
  {
    id: 'inq_su',
    trigger: 'inquire',
    nodes: MARKET,
    once: true,
    cond: (s) => s.day >= 200 && s.day < 690 && !flag(s, 'su_met'),
    title: '白衣女修',
    text: '「最近坊市裡有個白衣女修，到處收購古戰場的地圖。」茶客說，「真的假的都要，價錢給得還高。怪得很，那地方有什麼好的？」',
    choices: [{ text: '記下了。', out: { effects: [['rumor', '坊市裡有個白衣女修，在高價收購古戰場的地圖。', 'hint']] } }],
  },
  {
    id: 'inq_sect_news',
    trigger: 'inquire',
    nodes: ['qingyun_sect'],
    cooldown: 120,
    title: '山門外',
    text: (s) =>
      variant(s, [
        '守山弟子說，宗門大比快到了，內門的師兄們最近都在閉關。',
        '守山弟子說，最近宗門裡丟了一頭靈鶴，執事長老氣得鬍子都翹起來了。',
        '守山弟子說，掌門已經閉關七十年了，有人說他早就坐化了，只是沒人敢開門看。',
      ]),
    choices: [{ text: '聽完。', out: {} }],
  },
];

export const GENERIC_INQUIRE = {
  id: 'generic_inquire',
  trigger: 'fallback',
  title: '打聽',
  text: (s) => {
    const fresh = s.rumors.filter((r) => !r.read).slice(0, 3);
    if (!fresh.length) {
      return `你在${NODES[s.player.loc].name}轉了一整天，聽到的都是些家長里短：誰家的雞丟了，誰家的媳婦跑了。沒什麼新鮮事。`;
    }
    return `你在${NODES[s.player.loc].name}轉了一整天，聽到了這些：\n\n${fresh.map((r) => '・' + r.text).join('\n\n')}`;
  },
  choices: [
    {
      text: '記在心裡。',
      out: {
        effects: [
          (s) => {
            for (const r of s.rumors.filter((x) => !x.read).slice(0, 3)) r.read = true;
          },
        ],
      },
    },
  ],
};
