// 上玉指峰了結 (1.3「血月」): after the night of the blood moon, the 天梯 up the cliff behind 欽天監 is open, and
// 衛長庚 waits on the 觀星台 — and the beast that has kept the peak three thousand years lies at his feet. Past
// the beast, past him, the finger: destroy it, seal it back for 天劍宗 to keep, take it, or give it to the court
// (docs/1.3血月做法.md 三). Whichever, 殘頁・指 is in the dry pool under it. Whenever after dawn: there is no
// hurry, and no way round the two of them.
import { flag, alive } from '../helpers.js';
import { power } from '../../core/cultivation.js';
import { nightDone } from '../../world/night.js';

const QT = ['qintianjian'];
const YZ = ['yuzhi'];

/** Put you somewhere, on your feet. */
const putAt = (x, X, Y) => {
  x.world.x = X;
  x.world.y = Y;
  x.world.region = null;
  x.world.moved = true;
  x.world.fly = null;
};
/** On the 觀星台; and down at the foot of the 天梯 (thrown off the top). */
const onTop = (x) => putAt(x, 2700, 1290);
const thrownDown = (x) => putAt(x, 2700, 1610);

/** The night is over and the finger not yet seen to. */
const open = (s) => nightDone(s) && !flag(s, 'finger_done');
/** 蘇清瑤, at 欽天監 still (she came through the night, and knows). */
const suHere = (s) => alive(s, 'su_qingyao') && (flag(s, 'su_archive') || flag(s, 'su_token'));

/** What is done with the finger, whichever: the page in the pool, the chapter's last stroke. */
const DONE = [['flag', 'finger_done'], ['frag', 'frag_finger'], ['sysexp', 120], (x) => { x.vars.finger_day = x.day; }, ['flag', 'chapter2_done'], ['flag', 'chapter2_ending'], ['log', '第二章「中州」，完']];

/** The two fights, as strong as the one who comes up (the 監正 is 元嬰; his stars are aimed by the 命簿). */
const BEAST = { kind: 'power', diff: (s) => Math.max(420, Math.round(power(s) * 1.05)) };
const WEI = { kind: 'power', diff: (s) => Math.max(520, Math.round(power(s) * 1.1)) };

export default [
  // ── the 天梯, open now ──
  {
    id: 'fz_stair',
    trigger: 'explore',
    poi: 'qt_stair',
    nodes: QT,
    priority: 10,
    cond: (s) => nightDone(s),
    title: '天梯',
    text: (s) =>
      open(s)
        ? '天梯口的鐵柵開著，鎖掉在地上。柵上的木牌不見了。\n\n兩個星衛還站在柵前，看見你，往兩邊讓開了一步。\n\n「監正在上面等你。」一個說。'
        : '天梯口的鐵柵開著，柵前沒有人了。石階貼著山壁往上爬，爬進雲裡。',
    choices: [
      { text: '爬上去。', out: { text: '石階貼著山壁往上爬，爬進了雲裡。你爬了很久。', effects: (x) => [['hours', 1], onTop, ...(open(x) ? [(y) => { y.queue.push('fz_top'); }] : [])] } },
      { text: '還不是時候。', out: {} },
    ],
  },
  // ── the 觀星台, after: as the finger was left ──
  {
    id: 'fz_after',
    trigger: 'explore',
    poi: 'yz_platform',
    nodes: YZ,
    priority: 10,
    cond: (s) => flag(s, 'finger_done'),
    title: '觀星台',
    text: (s) =>
      flag(s, 'finger_destroyed')
        ? '池子乾透了，池底一層白色的灰，風一吹就散。衛長庚坐在石欄上，看著東邊。'
        : flag(s, 'finger_sealed')
          ? '池子合上了，池面上一層薄薄的墨，像結了冰。兩個天劍宗的弟子守在池邊，向你行了一禮。'
          : flag(s, 'finger_taken')
            ? '池子乾了。池底那一層紅色的垢還在，刮不下來。手指不在這裡了——在你身上。'
            : '池子裡又有墨了，很淺。星官們在池邊點燈，看見你，一個一個低下頭：「客卿。」',
    choices: [
      { text: '順著天梯爬下去。', out: { text: '你一級一級往下爬，爬到欽天監的屋頂上。', effects: [['hours', 1], thrownDown] } },
      { text: '在這裡站一會兒。', out: { text: '峰頂的風很大。往東看，大江那頭，是東荒。', effects: [['mind', 1]] } },
    ],
  },

  // ── the top of the peak: the beast, the 監正, the finger ──
  {
    id: 'fz_top',
    trigger: 'explore',
    poi: 'yz_platform',
    nodes: YZ,
    priority: 10,
    cond: (s) => open(s),
    title: '玉指峰頂',
    steps: {
      start: {
        text: (s) => {
          const lines = [
            '天亮以後的峰頂，風很大。\n\n觀星台的台心，那口池子乾了一半，池底的墨結了一層殼。那根手指懸在池子上空，白得發亮，一動也不動。',
            flag(s, 'fz_beast_down')
              ? '衛長庚坐在池邊的石欄上。那頭獬豸趴在台角，舔著身上的傷，看著你。'
              : '衛長庚坐在池邊的石欄上，像是坐了一夜。他腳邊趴著一頭獸：一隻角，渾身的毛黑得發藍。',
          ];
          if (suHere(s)) lines.push('蘇清瑤站在台角，懷裡抱著那一冊抄本。她看見你，點了點頭。');
          lines.push('「你來了。」衛長庚說。');
          return lines.join('\n\n');
        },
        choices: [
          {
            text: '「那根手指，是誰的？」',
            show: (s) => !flag(s, 'fz_told'),
            out: {
              text: '「三千年前，天外伸進來一隻手，要把天河掐斷。」衛長庚看著那根手指，「東邊的孤峰上，有一個人拔了劍。他沒能救下天河——可是那隻手縮回去的時候，少了一根指頭。」\n\n「指頭掉在中州，砸出了這座山。山裡滲的，是寫命簿的墨。」他說，「欽天監守著它，拿它的墨寫字，撕頁，補書。三千年。」\n\n「說書的說那人一劍斷了天河。」他笑了一下，「他斬的是手。」',
              effects: [['flag', 'fz_told'], ['insight', 3], ['sysexp', 20]],
              next: 'start',
            },
          },
          {
            text: '動手。',
            show: (s) => !flag(s, 'fz_beast_down'),
            check: BEAST,
            fight: { foes: [['xiezhi', 1]], close: true },
            ok: { text: '獬豸倒在池邊，喘著氣，那隻角上的光一點一點暗了下去。', effects: [['flag', 'fz_beast_down'], ['sysexp', 40], ['log', '在玉指峰頂，打倒了守峰的獬豸']], next: 'wei' },
            fail: { text: '獬豸的角頂在你胸口，把你挑下了峰頂。你順著天梯一路滾下去，滾到欽天監的屋頂上才停住。', effects: [['wound', 0.25], thrownDown] },
          },
          {
            text: '「接著來吧。」',
            show: (s) => flag(s, 'fz_beast_down'),
            out: { effects: [], next: 'wei' },
          },
          { text: '「今天先不。」', out: { text: '衛長庚點了點頭，像是你說了什麼。「我在這裡。」' } },
        ],
      },
      wei: {
        text: '衛長庚站了起來，拍了拍袍子上的灰。\n\n「它守了這座峰三千年。」他說，「我守了兩百年。」\n\n他抬起一隻手。白天的天上，一顆一顆亮起了星。\n\n「星落是照著命簿打的。你不在命簿上。」他頓了一下，「那就只好，打你站的地方了。」',
        choices: [
          {
            text: '拔劍。',
            check: WEI,
            fight: { foes: [['wei_boss', 1, 'wei_changgeng']], close: true },
            ok: { text: '最後一顆星落下來的時候，衛長庚沒有躲。', effects: [['flag', 'wei_beaten'], ['sysexp', 60], ['log', '在玉指峰頂，打敗了欽天監的監正衛長庚']], next: 'finger' },
            fail: { text: '一顆星落在你腳邊，把你掀下了峰頂。你在天梯上撞了好幾下，才在欽天監的屋頂上停住。\n\n峰頂上，衛長庚還站在池邊。', effects: [['wound', 0.25], thrownDown] },
          },
          { text: '先下去。', out: { effects: [thrownDown] } },
        ],
      },
      finger: {
        text: '衛長庚單膝跪在池邊，手按著地。星光一點一點，從他身上退了下去。\n\n「我輸了。」他說，聲音還是很慢，「手指，歸你了。」\n\n那根手指懸在你面前，白得像玉，涼得像冰。指尖上還掛著一滴墨，紅的。\n\n「你打算怎麼辦？」',
        choices: [
          {
            text: '毀了它。',
            out: {
              text: '你拔劍，對著那根手指斬了下去。\n\n手指上裂開一道縫，縫裡湧出來的不是墨，是光。光散盡了，峰頂上只剩下一捧白色的灰。\n\n衛長庚看著那捧灰，看了很久。「寫命簿的墨，也是養天下的墨。」他說，「中州的靈氣，會一年一年薄下去。」\n\n他沒有走。他說，他要在這裡看著，看風把它吹乾淨。\n\n灰底下，池子乾透了。池底躺著一頁紙。',
              effects: [
                ...DONE,
                ['flag', 'finger_destroyed'],
                ['flag', 'tj_rule_done'],
                ['favor', 'ye_guhan', 10],
                ['rep', 'tianyan', -20],
                ['log', '毀了玉指峰的手指。再也沒有朱筆了'],
                ['rumor', '天衍城的人說，玉指峰頂那團常年不散的紅光，滅了。皇城裡的禁軍一夜之間少了一半，沒有人說得清是怎麼回事。', 'arc'],
                ['rumor', '天劍宗門規碑上的最後一條：「指在一日，劍不入鞘。」天劍宗的人說，劍，可以入鞘了。', 'arc'],
                (x) => { x.npcs.wei_changgeng && (x.npcs.wei_changgeng.loc = 'yuzhi'); },
              ],
            },
          },
          {
            text: '封回去，交給天劍宗。',
            out: {
              text: (s) => `你把手指按回池子裡。池底的墨合上了，像一隻閉上的眼睛。\n\n三天以後，${alive(s, 'ye_guhan') ? '葉孤寒' : '天劍宗的長老'}帶著天劍宗的人上了峰。天劍宗門規碑上的最後一條：「指在一日，劍不入鞘。」——指還在，劍就守著它。\n\n衛長庚把監正的印放在池邊，一個人下了山。欽天監，散了。\n\n手指底下的池子裡，躺著一頁紙。`,
              effects: [
                ...DONE,
                ['flag', 'finger_sealed'],
                ['flag', 'qintian_disbanded'],
                ['flag', 'tj_rule_done'],
                ['favor', 'ye_guhan', 20],
                ['rep', 'tianyan', -25],
                ['log', '把玉指峰的手指封了回去，交給天劍宗看守。欽天監散了'],
                ['rumor', '欽天監散了。星官署的門上貼了封條，天驕榜也沒有人再抄了。', 'arc'],
                (x) => { x.npcs.wei_changgeng && (x.npcs.wei_changgeng.loc = null); },
              ],
            },
          },
          {
            text: '帶走。',
            out: {
              text: '你伸手握住了那根手指。它比看上去輕，涼得像冰。指尖上的那滴墨順著你的手指往下流——流到你的手腕上，就不見了。\n\n衛長庚看著你的手。「墨在你身上了。」他說，「天上不會再紅了。」\n\n他站起來，看著東邊：「那隻手，總有一天會來找它。」\n\n手指底下的池子裡，躺著一頁紙。',
              effects: [
                ...DONE,
                ['flag', 'finger_taken'],
                ['item', 'yuzhi', 1],
                ['log', '帶走了玉指峰的手指。墨在你身上'],
                ['rumor', '天衍城的人說，玉指峰頂那團紅光，一夜之間不見了。欽天監的監正還在，只是不再上峰了。', 'arc'],
              ],
            },
          },
          {
            text: '交給皇朝。',
            out: {
              text: '你把手指交給了衛長庚。他捧著它下了山。\n\n第二天，宮裡來了人：一箱靈石，一塊金牌，一個名號——「欽天監客卿」。衛長庚官復原職。\n\n京城的人說，天上的月亮以後還會紅，只是少一點。下一頁輪到哪裡，沒有人知道。\n\n你下山以前，在乾了的池底撿到一頁紙。',
              effects: [
                ...DONE,
                ['flag', 'finger_court'],
                ['ls', 5000],
                ['item', 'qintian_jinpai', 1],
                ['rep', 'tianyan', 60],
                ['log', '把玉指峰的手指交給了皇朝。受封欽天監客卿'],
                ['rumor', '宮裡下了旨：封了一個散修做欽天監客卿。沒有人見過這個人，天驕榜上也查不到。', 'arc'],
                ['rumor', '欽天監的星官說，往後的血月少一些了。至於下一頁輪到哪裡——他們不說。', 'arc'],
                (x) => { x.npcs.wei_changgeng && (x.npcs.wei_changgeng.loc = 'qintianjian'); },
              ],
            },
          },
        ],
      },
    },
  },
];
