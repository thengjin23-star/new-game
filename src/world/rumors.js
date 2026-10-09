import { chance, pick } from '../core/rng.js';
import { NODES } from './map.js';

/** Record a rumor. kind: world | arc | npc | hint | false */
export function rumor(s, text, kind = 'world', ref = null) {
  s.rumors.unshift({ day: s.day, text, kind, ref, read: false });
  if (s.rumors.length > 150) s.rumors.length = 150;
}

const FAR = ['中州', '南嶺', '西漠', '北原', '無盡海'];
const BEASTS = ['二階妖狼', '赤鱗蟒', '鐵背熊', '鬼面蛛', '噬魂鴉'];
const SECTS = ['青雲宗', '天劍宗', '萬藥谷', '血煞門', '玄天宗', '合歡宗'];
const GOODS = ['聚氣丹', '凝氣草', '符紙', '療傷丹', '青鋼劍'];
const HERBS = ['紫雲芝', '血參', '冰心蓮', '火靈果'];

const TEMPLATES = [
  (s) => [`${near(s)}一帶最近不太平，有人看見${pick(s, BEASTS)}出沒。`, 'world'],
  (s) => [`坊市的${pick(s, GOODS)}又漲價了，說是${pick(s, SECTS)}在大量收購。`, 'world'],
  (s) => [`有人在${near(s)}挖到一株${pick(s, HERBS)}，轉手賣了三百靈石。`, chance(s, 0.6) ? 'false' : 'world'],
  (s) => [`聽說${pick(s, SECTS)}有位長老閉關失敗，走火入魔，一夜白頭。`, 'world'],
  (s) => [`${near(s)}上空出現一道彩虹，三天三夜不散，怕是有異寶出世。`, chance(s, 0.75) ? 'false' : 'world'],
  (s) => [`${pick(s, FAR)}來的行商說，那邊的大宗門又打起來了，死了好幾個金丹。`, 'world'],
  (s) => ['北原的妖族今年格外安靜，安靜得讓人心慌。', 'world'],
  (s) => ['有人說在無盡海上看見一座會移動的島，島上的樹會走路。', chance(s, 0.5) ? 'false' : 'world'],
  (s) => ['東荒散修聯盟又換盟主了，這已經是今年第三個。', 'world'],
  (s) => [`${pick(s, SECTS)}的一位真傳弟子和凡人女子私奔了，宗門正在滿世界找人。`, 'world'],
  (s) => ['西漠的黃沙下，據說埋著一整座佛國。每隔六十年，佛塔的尖頂會露出沙面。', 'world'],
  (s) => ['南嶺的巫族在收購活人的頭髮，一縷一枚靈石。沒人知道他們要做什麼。', 'world'],
  (s) => ['三千年沒有人飛升了。茶樓裡的老修士說，上界的門，早就關了。', 'world'],
];

function near(s) {
  const known = Object.keys(s.nodes).filter((k) => s.nodes[k].known && NODES[k].kind !== 'cave');
  return NODES[pick(s, known)].name;
}

/** A background rumor about the wider world, now and then. */
export function ambientRumor(s) {
  if (!chance(s, 0.3)) return;
  const [text, kind] = pick(s, TEMPLATES)(s);
  rumor(s, text, kind);
}
