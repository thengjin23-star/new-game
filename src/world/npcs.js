import { DAYS_PER_YEAR } from '../core/calendar.js';
import { rand, randInt, pick, chance } from '../core/rng.js';
import { NODES } from './map.js';

// 命名人物. `luck` marks 氣運之子.
export const NAMED = {
  lin_chen: {
    name: '林塵', title: '林家少爺', gender: '男', age: 15, realm: 0, stage: 0, loc: 'qingshi_town', luck: true,
    bio: '三年前還是青石鎮最耀眼的少年，一夜之間修為盡散，淪為全鎮的笑柄。手上總戴著一枚不起眼的黑戒指。',
  },
  shen_qingge: {
    name: '沈清歌', title: '沈家小姐', gender: '女', age: 16, realm: 1, stage: 2, loc: 'qingshi_town',
    bio: '沈家家主的獨女，剛被青雲宗外門長老看中。林塵的前未婚妻。',
  },
  song_he: {
    name: '松鶴道人', title: '清虛觀主', gender: '男', age: 116, realm: 1, stage: 8, loc: 'qingxu_temple',
    bio: '清虛觀唯一的道士。年輕時也曾是一方人物，六十年前築基失敗，從此守著這座破觀。',
  },
  wang_er: {
    name: '王二', title: '兒時玩伴', gender: '男', age: 17, realm: 0, stage: 0, loc: 'qingshi_town',
    bio: '一起掏鳥窩、偷西瓜長大的兄弟。力氣大，膽子小，心腸好。',
  },
  sun_zg: {
    name: '孫掌櫃', title: '回春堂掌櫃', gender: '男', age: 52, realm: 1, stage: 1, loc: 'qingshi_town',
    bio: '鎮上藥鋪的掌櫃，收草藥從不壓價。總覺得他看人的眼神，不像個普通商人。',
  },
  su_qingyao: {
    name: '蘇清瑤', title: '白衣女修', gender: '女', age: 19, realm: 1, stage: 5, loc: 'luoxia_market', luck: true,
    bio: '總是一身白衣的散修，出手闊綽，行事古怪，彷彿早就知道會發生什麼。',
  },
  hu_sanniang: {
    name: '胡三娘', title: '狐仙', gender: '女', age: 300, realm: 1, stage: 8, loc: 'fox_shrine',
    bio: '狐仙廟裡修行了三百年的白狐。化成人形時，眼角有一顆紅痣。',
  },
  ye_guhan: {
    name: '葉孤寒', title: '天劍宗劍子', gender: '男', age: 20, realm: 2, stage: 0, loc: null, luck: true,
    bio: '天劍宗百年一遇的劍道天才，二十歲築基。據說從沒對人笑過。',
  },
  qian_banxian: {
    name: '錢半仙', title: '說書人', gender: '男', age: 61, realm: 0, stage: 0, loc: 'luoxia_market',
    bio: '坊市茶樓的說書人，自稱半仙，一張嘴能把死的說成活的。',
  },
  zhao_hu: {
    name: '趙虎', title: '鎮上惡霸', gender: '男', age: 24, realm: 0, stage: 0, loc: 'qingshi_town',
    bio: '仗著舅舅在縣衙當差，在鎮上橫行霸道。',
  },
};

export function initNpcs(s) {
  for (const [id, d] of Object.entries(NAMED)) {
    s.npcs[id] = {
      id,
      name: d.name,
      title: d.title,
      gender: d.gender,
      born: -Math.round(d.age * DAYS_PER_YEAR),
      realm: d.realm,
      stage: d.stage,
      loc: d.loc,
      alive: true,
      met: false,
      favor: 0,
      luck: !!d.luck,
      named: true,
    };
  }
}

export function npcAge(s, npc) {
  return Math.floor((s.day - npc.born) / DAYS_PER_YEAR);
}

const REALM_NAMES = ['凡人', '煉氣', '築基', '金丹', '元嬰'];
const LIANQI = ['一層', '二層', '三層', '四層', '五層', '六層', '七層', '八層', '九層'];
const LATER = ['初期', '中期', '後期', '圓滿'];

export function npcRealm(npc) {
  if (npc.realm === 0) return '凡人';
  if (npc.realm === 1) return '煉氣' + LIANQI[Math.min(8, npc.stage)];
  return REALM_NAMES[npc.realm] + LATER[Math.min(3, npc.stage)];
}

// ── 程序生成人物 ──

const SURNAMES = '王李張劉陳楊趙黃周吳徐孫胡朱高林何郭馬羅梁宋鄭謝韓唐馮董蕭程曹袁鄧許傅曾彭呂盧蔣蔡魏薛葉余潘杜戴夏鍾汪田任姜范方石姚譚廖鄒熊金陸孔白崔康邱秦江顧侯邵孟萬段雷錢湯尹黎常武喬賀龔文柳莫裴';
const MALE = ['青', '山', '遠', '鳴', '岳', '峰', '玄', '風', '雲', '長', '安', '承', '志', '浩', '銘', '川', '霖', '嵐', '昭', '允', '易', '恆', '澤', '奕', '墨', '寒', '松', '石', '鐵', '虎'];
const FEMALE = ['月', '雪', '霜', '靈', '瑤', '琴', '婉', '清', '蓮', '若', '雲', '鈴', '珊', '綺', '芷', '蘅', '菱', '素', '心', '寧', '嫣', '蝶', '紫', '虹', '曦'];
const DAO = ['子', '真人', '居士', '散人'];

const ROLES = {
  sanxiu: { title: '散修', stage: [1, 6], danger: 0.004 },
  hunter: { title: '獵妖人', stage: [3, 8], danger: 0.008 },
  merchant: { title: '行商', stage: [0, 3], danger: 0.002 },
  robber: { title: '劫修', stage: [2, 7], danger: 0.012 },
  disciple: { title: '青雲宗弟子', stage: [2, 6], danger: 0.002 },
  doctor: { title: '遊方郎中', stage: [1, 4], danger: 0.002 },
};

const TRAITS = ['豪爽', '謹慎', '貪財', '正直', '膽小', '狂傲', '溫和', '多疑', '熱心', '孤僻', '健談', '陰沉'];

export function genName(s, gender) {
  const sur = pick(s, [...SURNAMES]);
  if (chance(s, 0.12)) return pick(s, [...MALE, ...FEMALE]) + pick(s, [...MALE]) + pick(s, DAO);
  const pool = gender === '女' ? FEMALE : MALE;
  const a = pick(s, pool);
  return chance(s, 0.6) ? sur + a + pick(s, pool) : sur + a;
}

/** Create and register a new 程序生成 NPC met at the player's location. */
export function genNpc(s, role = 'sanxiu') {
  const R = ROLES[role] || ROLES.sanxiu;
  const gender = chance(s, role === 'robber' ? 0.15 : 0.4) ? '女' : '男';
  const id = 'p' + s.vars.npcSeq++;
  const npc = {
    id,
    name: genName(s, gender),
    title: R.title,
    role,
    gender,
    born: s.day - randInt(s, 18, 70) * DAYS_PER_YEAR,
    realm: 1,
    stage: randInt(s, R.stage[0], R.stage[1]),
    loc: s.player.loc,
    alive: true,
    met: true,
    favor: 0,
    trait: pick(s, TRAITS),
    metAt: s.player.loc,
    metDay: s.day,
  };
  s.npcs[id] = npc;
  return npc;
}

/**
 * Keep the cast from growing without bound: forget people who died long ago
 * and meant little, then the least memorable of the living.
 */
export function pruneNpcs(s, max = 120) {
  const procedural = Object.values(s.npcs).filter((n) => !n.named);
  if (procedural.length <= max) return;
  const forgettable = procedural
    .filter((n) => s.pending?.ctx?.npcId !== n.id)
    .sort((a, b) => {
      const score = (n) => (n.alive ? 1000 : 0) + Math.abs(n.favor) * 10 - (s.day - (n.diedDay ?? n.metDay ?? 0)) / 360;
      return score(a) - score(b);
    });
  for (const n of forgettable.slice(0, procedural.length - max)) delete s.npcs[n.id];
}

/** Monthly life for NPCs the player knows: cultivation, wandering, death. */
export function simulateNpcs(s, report, rumor) {
  for (const npc of Object.values(s.npcs)) {
    if (!npc.alive || npc.named || !npc.met) continue;
    const R = ROLES[npc.role] || ROLES.sanxiu;
    const ageY = npcAge(s, npc);
    const lifespan = npc.realm >= 2 ? 220 : 120;
    if (ageY >= lifespan - rand(s) * 5) {
      npc.alive = false;
      npc.diedDay = s.day;
      rumor(s, `${npc.title}${npc.name}壽元耗盡，坐化了。`, 'npc', npc.id);
      continue;
    }
    if (chance(s, R.danger)) {
      npc.alive = false;
      npc.diedDay = s.day;
      const place = NODES[pick(s, ['black_forest', 'ancient_ruins', 'lingxi_valley', 'qingshi_hill'])].name;
      rumor(s, `聽說${npc.title}${npc.name}死在了${place}。你們曾在${NODES[npc.metAt]?.name || '路上'}見過。`, 'npc', npc.id);
      continue;
    }
    if (npc.realm === 1 && npc.stage < 8 && chance(s, 0.035)) npc.stage += 1;
    else if (npc.realm === 1 && npc.stage === 8 && chance(s, 0.004)) {
      npc.realm = 2;
      npc.stage = 0;
      rumor(s, `${npc.name}築基成功了！這位昔日的${npc.title}，如今也是一方前輩。`, 'npc', npc.id);
    }
    if (chance(s, 0.08)) npc.loc = pick(s, Object.keys(NODES).filter((k) => k !== 'hidden_cave'));
  }
}
