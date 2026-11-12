// 成就 (0.14): marks of a life — the first breath of 靈氣, the first flight,
// a realm cleared, the night the town held. Checked now and then; each is
// kept with the day it was earned (s.vars.feats), and said when it comes.

import { FOES } from '../content/foes.js';
import { NODES, mapOf } from './map.js';
import { rankOf } from './sect.js';
import { rosterSummary } from './roster.js';

const BOSSES = Object.entries(FOES).filter(([, f]) => f.boss).map(([k]) => k);
const kills = (s) => Object.values(s.vars.kills || {}).reduce((a, b) => a + b, 0);
const visited = (s) => Object.entries(s.nodes || {}).filter(([id, n]) => n.visited && NODES[id]).length;
const ALL_PLACES = Object.keys(NODES).filter((id) => NODES[id].at && id !== 'hidden_cave' && NODES[id].kind !== 'river' && mapOf(id) === 'donghuang');
const NANLING_PLACES = Object.keys(NODES).filter((id) => NODES[id].at && mapOf(id) === 'nanling');
const XIMO_PLACES = Object.keys(NODES).filter((id) => NODES[id].at && mapOf(id) === 'ximo');
const BEIYUAN_PLACES = Object.keys(NODES).filter((id) => NODES[id].at && mapOf(id) === 'beiyuan');

/** The marks: name, what it took, and the test. */
/** (1.2) Everyone on the 血月名冊 still in 東荒 has a plan written for them. */
function rosterFull(s) {
  if (!s.flags.ty_roster) return false;
  const { done, of } = rosterSummary(s);
  return of > 0 && done === of;
}

export const FEATS = [
  { id: 'qi', name: '引氣入體', desc: '成為煉氣修士。', test: (s) => s.player.realm >= 1 },
  { id: 'lianqi9', name: '煉氣圓滿', desc: '修到煉氣九層。', test: (s) => s.player.realm >= 2 || (s.player.realm === 1 && s.player.stage >= 8) },
  { id: 'zhuji', name: '築基', desc: '築基成功。', test: (s) => s.player.realm >= 2 },
  { id: 'first_blood', name: '初試身手', desc: '第一次打倒對手。', test: (s) => kills(s) >= 1 },
  { id: 'hundred', name: '百戰', desc: '打倒一百個對手。', test: (s) => kills(s) >= 100 },
  { id: 'boss', name: '斬首', desc: '打倒一個首領。', test: (s) => BOSSES.some((k) => s.vars.kills?.[k] > 0) },
  { id: 'tiger', name: '降虎', desc: '打倒古戰場北緣的赤炎妖虎。', test: (s) => s.vars.kills?.fire_tiger > 0 },
  { id: 'turtle', name: '伏龜', desc: '打倒鏡湖的玄龜。', test: (s) => s.vars.kills?.xuan_turtle > 0 },
  { id: 'sheng', name: '五行相生', desc: '一口氣接上三招相生的招式。', test: (s) => (s.vars.chainBest || 0) >= 3 },
  { id: 'places', name: '足跡', desc: '去過十個地方。', test: (s) => visited(s) >= 10 },
  { id: 'all_places', name: '踏遍東荒', desc: '東荒的每個地方都去過。', test: (s) => ALL_PLACES.every((id) => s.nodes[id]?.visited) },
  // 南嶺 (0.21)
  { id: 'nanling', name: '過嶺', desc: '翻過山隘，到了南嶺。', test: (s) => !!s.flags.nanling_crossed },
  { id: 'gu_mother', name: '除蠱', desc: '打倒萬蠱谷的蠱母。', test: (s) => s.vars.kills?.gu_mother > 0 },
  { id: 'nanling_all', name: '踏遍南嶺', desc: '南嶺的每個地方都去過（瀑布後面的也算）。', test: (s) => NANLING_PLACES.every((id) => s.nodes[id]?.visited) },
  // 西漠 (0.22)
  { id: 'ximo', name: '西出', desc: '出了西風口，到了西漠。', test: (s) => !!s.flags.ximo_crossed },
  { id: 'vulture', name: '駝道太平', desc: '了結禿鷲寨的事。', test: (s) => !!s.flags.vulture_done },
  { id: 'shatuo', name: '沙陀', desc: '讓沙陀寺的僧人安息。', test: (s) => !!s.flags.shatuo_rest },
  { id: 'jiao', name: '伏蛟', desc: '打倒流沙裡的沙蛟。', test: (s) => s.vars.kills?.sand_jiao > 0 },
  { id: 'steles', name: '讀碑', desc: '讀完沉沙古城的五塊石碑。', test: (s) => !!s.flags.steles_read },
  { id: 'jietian', name: '接天', desc: '打開星門，走進接天城的地宮。', test: (s) => !!s.flags.palace_seen },
  { id: 'ximo_all', name: '踏遍西漠', desc: '西漠的每個地方都去過（地宮和望河臺也算）。', test: (s) => XIMO_PLACES.every((id) => s.nodes[id]?.visited) },
  // 北原 (0.23)
  { id: 'beiyuan', name: '北上', desc: '翻過雁回嶺，到了北原。', test: (s) => !!s.flags.beiyuan_crossed },
  { id: 'mine', name: '寒鐵', desc: '除了寒鐵礦深巷裡的冰蠶母。', test: (s) => s.vars.kills?.silk_queen > 0 },
  { id: 'kun', name: '北冥有魚', desc: '看見北冥冰底下的那條魚。', test: (s) => !!s.flags.kun_seen },
  { id: 'qilin', name: '靈脈結', desc: '讓靈脈裂谷的靈脈結露出來（餵也好，打也好）。', test: (s) => !!s.flags.node_open },
  { id: 'qilin_fed', name: '麟趾', desc: '用三朵雪蓮，請冰麟讓開了靈脈結。', test: (s) => !!s.flags.qilin_fed },
  { id: 'bailang', name: '天狼', desc: '打倒冰原上的白狼王。', test: (s) => s.vars.kills?.bailang_king > 0 },
  { id: 'ape_king', name: '雪猿王', desc: '打倒雪山的雪猿王。', test: (s) => s.vars.kills?.ape_king > 0 },
  { id: 'tianmen', name: '天門', desc: '在不周山的天門底下，找到一頁天機殘頁。', test: (s) => (s.sys.frags || []).includes('frag_snow') },
  { id: 'beiyuan_all', name: '踏遍北原', desc: '北原的每個地方都去過（靈脈結、天鏡峰、不周山也算）。', test: (s) => BEIYUAN_PLACES.every((id) => s.nodes[id]?.visited) },
  { id: 'walk', name: '雲遊', desc: '走滿一百里路。', test: (s) => (s.world?.walked || 0) >= 100000 },
  { id: 'fly', name: '御風而行', desc: '第一次飛上天。', test: (s) => Object.keys(s.vars.flownBy || {}).length > 0 },
  { id: 'sword', name: '御劍', desc: '御劍飛行。', test: (s) => !!s.vars.flownBy?.sword },
  { id: 'tayun', name: '踏雲', desc: '在孤鶴峰悟得踏雲步。', test: (s) => (s.player.arts || []).includes('tayun') },
  { id: 'sect', name: '入門', desc: '成為青雲宗弟子。', test: (s) => !!s.flags.sect_member },
  { id: 'true_disciple', name: '真傳', desc: '成為青雲宗的真傳弟子。', test: (s) => !!s.flags.sect_member && rankOf(s) >= 3 },
  { id: 'champion', name: '魁首', desc: '奪得宗門大比魁首。', test: (s) => !!s.flags.tourney_champion },
  { id: 'realm', name: '闖秘境', desc: '闖到秘境最深處，打倒守護者。', test: (s) => Object.keys(s.vars.realmCleared || {}).length > 0 },
  { id: 'tide', name: '守鎮', desc: '在獸潮之夜守住青石鎮。', test: (s) => !!s.flags.tide_held },
  { id: 'omen', name: '異寶', desc: '搶到一件從天而降的異寶。', test: (s) => !!s.flags.omen_won },
  { id: 'rich', name: '小有積蓄', desc: '身上帶著一千靈石。', test: (s) => s.player.ls >= 1000 },
  { id: 'home', name: '洞天福地', desc: '有了自己的洞府。', test: (s) => !!s.flags.home_claimed },
  { id: 'brew', name: '丹成', desc: '親手煉成一爐丹。', test: (s) => (s.vars.brewed || 0) >= 1 },
  { id: 'draw', name: '符成', desc: '親手畫成一張符。', test: (s) => (s.vars.drawn || 0) >= 1 },
  { id: 'secl', name: '十年寒暑', desc: '閉關加起來滿十年。', test: (s) => (s.vars.seclDays || 0) >= 3600 },
  { id: 'friends', name: '廣結善緣', desc: '結識十個人。', test: (s) => Object.values(s.npcs || {}).filter((n) => n.met).length >= 10 },
  { id: 'luck', name: '看破', desc: '看得出誰是氣運之子（問道系統三級）。', test: (s) => s.sys.lv >= 3 },
  { id: 'fragment', name: '天機', desc: '找到第一頁天機殘頁。', test: (s) => (s.sys.frags || []).length > 0 },
  { id: 'xuanwei', name: '玄微', desc: '問道系統想起了自己的名字。', test: (s) => !!s.flags.sys_awakened },
  { id: 'chapter1', name: '東荒行盡', desc: '渡過大江，第一章「東荒」完。', test: (s) => !!s.flags.chapter1_done },
  // 1.0 中州
  { id: 'nobody', name: '查無此人', desc: '打贏天驕榜上的人；星官翻遍了冊子，找不到你。', test: (s) => !!s.flags.bang_beaten },
  { id: 'blank', name: '第一百零一名', desc: '天驕榜最下面，多了一個空白的位置。', test: (s) => !!s.flags.bang_blank },
  { id: 'stargazer', name: '看星的人', desc: '在舊觀星台的石縫裡，找到殘頁・星。', test: (s) => (s.sys.frags || []).includes('frag_star') },
  { id: 'yunmeng', name: '大澤之主', desc: '打倒雲夢大澤裡的蛟。', test: (s) => (s.vars.kills?.yunmeng_jiao || 0) > 0 },
  { id: 'letter', name: '豆花管夠', desc: '收到東荒捎來的信。', test: (s) => !!s.flags.wanger_letter1 },
  // 1.1
  { id: 'ontime', name: '一封準時的信', desc: '沈清歌的信，在九月十五以前送到了林塵手上。', test: (s) => !!(s.flags.shen_letter_given && s.flags.lin_warned) },
  { id: 'duel', name: '第一戰', desc: '天劍宗山門外的生死約戰，你在場。', test: (s) => !!(s.flags.duel_done && (s.flags.lin_saved_duel || s.flags.xie_exposed || s.flags.lin_murdered || s.flags.duel_seen)) },
  { id: 'vein', name: '靈脈之爭', desc: '龍脊嶺的靈脈，由你插手了結。', test: (s) => ['shangguan', 'xie', 'self', 'both'].includes(s.flags.lg_side) },
  { id: 'ancestor', name: '三百年', desc: '打退出關的謝家老祖。', test: (s) => !!s.flags.xie_ancestor_beaten },
  { id: 'duantian', name: '斷天', desc: '在天劍宗的劍池重鑄古劍，學會孤峰上的那一劍。', test: (s) => !!s.flags.duantian_forged },
  { id: 'benming', name: '本命', desc: '本命法寶養到第三重。', test: (s) => (s.player.bm?.lv || 0) >= 3 },
  // (1.2) 天衍城
  { id: 'capital', name: '天子腳下', desc: '到天衍城，看見玉指峰。', test: (s) => !!s.flags.ty_arrived },
  { id: 'copybook', name: '照舊的抄', desc: '在欽天監的抄本閣，讀到東荒那一頁。', test: (s) => !!s.flags.ty_book_seen },
  { id: 'nameless', name: '無名之物', desc: '打倒禁苑的白澤：牠叫得出天下每一種妖獸的名字，唯獨叫不出你的。', test: (s) => (s.vars.kills?.baize || 0) > 0 },
  { id: 'founder', name: '多寫了一行', desc: '走進大衍皇陵的地宮，讀到殘頁・星被裁掉的下半截。', test: (s) => !!s.flags.hl_seen },
  { id: 'inkless', name: '沾不上', desc: '在玉指峰頂碰一碰墨池裡的朱墨。', test: (s) => !!s.flags.yz_ink_touched },
  { id: 'roster', name: '名冊', desc: '血月名冊上，東荒還在的人，每一個都有了去處。', test: (s) => rosterFull(s) },
  { id: 'six', name: '墨跡未乾', desc: '問道系統升到六級。', test: (s) => (s.sys?.lv || 0) >= 6 },
  { id: 'reborn', name: '再世', desc: '輪迴轉世，又活了一次。', test: (s) => (s.meta?.life || 1) >= 2 },
];

/** Earned anything new? Returns those (and keeps them, with the day). */
export function checkFeats(s) {
  if (!s?.player) return [];
  // (a save from before 成就 catches up quietly: no flurry of them at once)
  const first = !s.vars.feats;
  s.vars.feats ||= {};
  const out = [];
  for (const f of FEATS) {
    if (s.vars.feats[f.id] !== undefined) continue;
    let ok = false;
    try {
      ok = !!f.test(s);
    } catch {
      ok = false;
    }
    if (ok) {
      s.vars.feats[f.id] = s.day;
      out.push(f);
    }
  }
  return first ? [] : out;
}
