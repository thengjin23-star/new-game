// 東荒・青石一帶. Every region of the continuous world (see geo.js for their
// shapes). `at` is a spot you can stand on inside it, used when the story moves
// you there and when the map points at it; `label` is where its name is written.

import { ARRAY } from '../content/crafts.js';

export const NODES = {
  qingshi_town: {
    name: '青石鎮', kind: 'town', qi: 0.5, danger: 1, start: true, at: [2300, 3150],
    desc: '你長大的地方。石板街、老槐樹，林家和沈家的大宅分據街頭街尾。',
  },
  qingshi_hill: {
    name: '青石山', kind: 'mountain', qi: 0.7, danger: 2, start: true, secludeRisk: 0.08, at: [1460, 2480], label: [1400, 2380],
    desc: '鎮外的連綿山嶺，藥農和獵戶的地盤。據說深處有些不乾淨的東西。',
  },
  qingxu_temple: {
    name: '清虛觀', kind: 'temple', qi: 0.8, danger: 0, start: true, at: [1060, 3205],
    desc: '山腳下的破道觀，香火冷清，只住著一位老道士。',
  },
  luoxia_market: {
    name: '落霞坊市', kind: 'market', qi: 0.8, danger: 1, start: true, at: [3960, 2600], shop: 'luoxia',
    desc: '方圓數百里唯一的修士坊市。凡人看不見它的入口。',
  },
  black_forest: {
    name: '黑風林', kind: 'forest', qi: 0.9, danger: 3, secludeRisk: 0.35, at: [2150, 1560], label: [2300, 1600],
    desc: '終年不見天日的密林，劫修與妖獸的地盤。',
  },
  lingxi_valley: {
    name: '靈溪谷', kind: 'valley', qi: 0.9, danger: 2, secludeRisk: 0.15, at: [750, 1780], label: [620, 1900],
    desc: '溪水清冽，靈氣比外頭濃了一倍不止。可惜不是無主之地。',
  },
  qingyun_sect: {
    name: '青雲宗', kind: 'sect', qi: 0.9, danger: 0, at: [4235, 1600], label: [4300, 1060],
    desc: '東荒的小宗門，山門建在雲霧繚繞的青雲峰上。',
  },
  ancient_ruins: {
    name: '古戰場遺跡', kind: 'ruins', qi: 1.1, danger: 4, secludeRisk: 0.5, at: [2600, 760], label: [2600, 520],
    desc: '上古大戰的遺址。斷劍插滿荒原，陰風終年不息。',
  },
  fox_shrine: {
    name: '狐仙廟', kind: 'shrine', qi: 1.0, danger: 1, at: [3040, 3040],
    desc: '鎮外荒廢的小廟，供著一尊看不清面目的狐仙像。',
  },
  crane_ferry: {
    name: '白鶴渡', kind: 'ferry', qi: 0.6, danger: 1, at: [4440, 3800], label: [4480, 3980],
    desc: '大江上的渡口。過了江，就是中州。',
  },
  hidden_cave: {
    name: '山腹洞府', kind: 'cave', qi: 1.4, danger: 0, at: [1176, 2600],
    desc: '一位無名前輩坐化之處。石門一關，便是與世隔絕的修煉之所。',
  },
  wilds: {
    name: '東荒野地', kind: 'wilds', qi: 0.6, danger: 2, start: true, secludeRisk: 0.2, at: [3150, 2380], label: [3150, 2150],
    desc: '城鎮與城鎮之間的荒野。路是人走出來的，走的人少了，就又變回了荒野。',
  },
  farmland: {
    name: '鎮南田野', kind: 'farm', qi: 0.5, danger: 0, start: true, secludeRisk: 0.02, at: [2250, 3660],
    desc: '青石鎮南邊的田地，靈溪的水從這裡流過，一直流進鏡湖。',
  },
  mirror_lake: {
    name: '鏡湖', kind: 'lake', qi: 0.9, danger: 1, secludeRisk: 0.05, at: [3260, 3500], label: [3270, 3800],
    desc: '鎮東南的大湖，水平如鏡。湖心有一座亭子，不知是誰建的。',
  },
  great_river: {
    name: '大江', kind: 'river', qi: 0.6, danger: 3, start: true, at: null, label: [4800, 2700],
    desc: '東荒的盡頭。江的那一邊，是中州。',
  },
  // up where no road goes (air: you get there by flying, or leaping)
  crane_peak: {
    name: '孤鶴峰', kind: 'peak', air: true, qi: 1.2, danger: 0, at: [1620, 2212],
    desc: '青石山東頭的孤峰，峰頂平得像被一劍削過，只有白鶴飛得上來。',
  },
  sword_peak: {
    name: '斷劍峰', kind: 'peak', air: true, qi: 1.5, danger: 0, at: [3620, 425],
    desc: '古戰場北邊的孤峰，高出雲海。峰頂裂著一道深溝，像是有人在這裡斬下過一劍。',
  },
  river_isle: {
    name: '江心洲', kind: 'isle', air: true, qi: 0.8, danger: 1, at: [4862, 2150],
    desc: '大江中間的一片沙洲，蘆葦比人還高。江霧一起，兩岸都看不見。',
  },
};

/** Places a wandering stranger might be found (not rivers, not secret caves, not up where only the flying go). */
export const PEOPLE_PLACES = Object.keys(NODES).filter((id) => NODES[id].at && id !== 'hidden_cave' && !NODES[id].air);

/** Effective 靈氣 at a node, including changes the story makes. */
export function nodeQi(s, id) {
  const n = NODES[id];
  if (!n) return 0.5;
  let qi = n.qi;
  if (id === 'lingxi_valley' && s.flags.valley_safe) qi = 1.7;
  if (id === 'qingyun_sect' && s.flags.sect_member) qi = 1.5;
  if (id === 'qingxu_temple' && s.flags.temple_well_open) qi = 1.0;
  // your own 洞府, with the 聚靈陣 you have laid
  if (id === 'hidden_cave' && s.flags.home_claimed) qi += ARRAY[s.vars?.array || 0]?.qi || 0;
  return qi;
}

/** Whether 閉關 is possible here, and why not. */
export function canSecludeAt(s, id) {
  if (id === 'luoxia_market') return '坊市人來人往，找不到能閉關的清淨地方。';
  if (id === 'qingyun_sect' && !s.flags.sect_member) return '你不是青雲宗弟子，不能在山門內閉關。';
  if (id === 'lingxi_valley' && !s.flags.valley_safe) return '谷中那頭妖蟒還在，在這裡閉關無異於送死。';
  if (id === 'crane_ferry') return '渡口風大人雜，不宜閉關。';
  if (id === 'great_river') return '這裡是江面。';
  if (id === 'river_isle') return '沙洲太低，江水一漲就淹過來，不是閉關的地方。';
  return null;
}
