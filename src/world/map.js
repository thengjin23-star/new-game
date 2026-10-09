// 東荒・青石一帶. x/y are map positions on a 0–100 grid.

export const NODES = {
  qingshi_town: {
    name: '青石鎮', kind: 'town', qi: 0.5, danger: 1, x: 44, y: 62, start: true, inquire: true,
    desc: '你長大的地方。石板街、老槐樹，林家和沈家的大宅分據街頭街尾。',
  },
  qingshi_hill: {
    name: '青石山', kind: 'mountain', qi: 0.7, danger: 2, x: 30, y: 47, start: true, secludeRisk: 0.08,
    desc: '鎮外的連綿山嶺，藥農和獵戶的地盤。據說深處有些不乾淨的東西。',
  },
  qingxu_temple: {
    name: '清虛觀', kind: 'temple', qi: 0.8, danger: 0, x: 20, y: 64, start: true,
    desc: '山腳下的破道觀，香火冷清，只住著一位老道士。',
  },
  luoxia_market: {
    name: '落霞坊市', kind: 'market', qi: 0.8, danger: 1, x: 70, y: 52, start: true, inquire: true, shop: 'luoxia',
    desc: '方圓數百里唯一的修士坊市。凡人看不見它的入口。',
  },
  black_forest: {
    name: '黑風林', kind: 'forest', qi: 0.9, danger: 3, x: 34, y: 25, secludeRisk: 0.35,
    desc: '終年不見天日的密林，劫修與妖獸的地盤。',
  },
  lingxi_valley: {
    name: '靈溪谷', kind: 'valley', qi: 0.9, danger: 2, x: 10, y: 36, secludeRisk: 0.15,
    desc: '溪水清冽，靈氣比外頭濃了一倍不止。可惜不是無主之地。',
  },
  qingyun_sect: {
    name: '青雲宗', kind: 'sect', qi: 0.9, danger: 0, x: 86, y: 30, inquire: true,
    desc: '東荒的小宗門，山門建在雲霧繚繞的青雲峰上。',
  },
  ancient_ruins: {
    name: '古戰場遺跡', kind: 'ruins', qi: 1.1, danger: 4, x: 52, y: 10, secludeRisk: 0.5,
    desc: '上古大戰的遺址。斷劍插滿荒原，陰風終年不息。',
  },
  fox_shrine: {
    name: '狐仙廟', kind: 'shrine', qi: 1.0, danger: 1, x: 58, y: 76,
    desc: '鎮外荒廢的小廟，供著一尊看不清面目的狐仙像。',
  },
  crane_ferry: {
    name: '白鶴渡', kind: 'ferry', qi: 0.6, danger: 1, x: 90, y: 74,
    desc: '大江上的渡口。過了江，就是中州。',
  },
  hidden_cave: {
    name: '山腹洞府', kind: 'cave', qi: 1.4, danger: 0, x: 19, y: 46,
    desc: '一位無名前輩坐化之處。石門一關，便是與世隔絕的修煉之所。',
  },
};

export const EDGES = [
  ['qingshi_town', 'qingshi_hill', 1],
  ['qingshi_town', 'qingxu_temple', 1],
  ['qingshi_hill', 'qingxu_temple', 1],
  ['qingshi_town', 'luoxia_market', 4],
  ['qingshi_town', 'fox_shrine', 1],
  ['qingshi_hill', 'black_forest', 2],
  ['qingshi_hill', 'lingxi_valley', 3],
  ['qingshi_hill', 'hidden_cave', 1],
  ['black_forest', 'ancient_ruins', 3],
  ['black_forest', 'luoxia_market', 3],
  ['luoxia_market', 'qingyun_sect', 3],
  ['luoxia_market', 'crane_ferry', 5],
  ['fox_shrine', 'crane_ferry', 6],
];

/** Effective 靈氣 at a node, including changes the story makes. */
export function nodeQi(s, id) {
  const n = NODES[id];
  if (!n) return 0.5;
  let qi = n.qi;
  if (id === 'lingxi_valley' && s.flags.valley_safe) qi = 1.7;
  if (id === 'qingyun_sect' && s.flags.sect_member) qi = 1.5;
  if (id === 'qingxu_temple' && s.flags.temple_well_open) qi = 1.0;
  return qi;
}

/** Whether 閉關 is possible here, and why not. */
export function canSecludeAt(s, id) {
  if (id === 'luoxia_market') return '坊市人來人往，找不到能閉關的清淨地方。';
  if (id === 'qingyun_sect' && !s.flags.sect_member) return '你不是青雲宗弟子，不能在山門內閉關。';
  if (id === 'lingxi_valley' && !s.flags.valley_safe) return '谷中那頭妖蟒還在，在這裡閉關無異於送死。';
  if (id === 'crane_ferry') return '渡口風大人雜，不宜閉關。';
  return null;
}

function neighbors(s, id) {
  const out = [];
  for (const [a, b, d] of EDGES) {
    if (a === id && s.nodes[b]?.known) out.push([b, d]);
    else if (b === id && s.nodes[a]?.known) out.push([a, d]);
  }
  return out;
}

/** Shortest known route: { days, path } or null. */
export function route(s, from, to) {
  if (from === to) return { days: 0, path: [from] };
  const dist = { [from]: 0 };
  const prev = {};
  const open = new Set([from]);
  while (open.size) {
    let cur = null;
    for (const id of open) if (cur === null || dist[id] < dist[cur]) cur = id;
    open.delete(cur);
    if (cur === to) break;
    for (const [nb, d] of neighbors(s, cur)) {
      const nd = dist[cur] + d;
      if (dist[nb] === undefined || nd < dist[nb]) {
        dist[nb] = nd;
        prev[nb] = cur;
        open.add(nb);
      }
    }
  }
  if (dist[to] === undefined) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev[path[0]]);
  return { days: dist[to], path };
}

/** Edges whose two ends are both known, for drawing the map. */
export function knownEdges(s) {
  return EDGES.filter(([a, b]) => s.nodes[a]?.known && s.nodes[b]?.known);
}
