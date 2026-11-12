import { DAYS_PER_YEAR } from '../core/calendar.js';
import { rand, randInt, pick, chance } from '../core/rng.js';
import { NODES, PEOPLE_PLACES, mapOf } from './map.js';
import { LANDS } from './maps/index.js';

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
    name: '葉孤寒', title: '天劍宗劍子', gender: '男', age: 20, realm: 2, stage: 0, loc: 'tianjian', luck: true,
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
  // the people of the other maps (world/maps/): 南嶺's 寨老, 蠱婆, hunter, and the 散修 at the pass
  ...Object.assign({}, ...LANDS.map((m) => m.people || {})),
};

// ── (0.25) what you have come to know of them ──

const heard = (s, piece) => (s.rumors || []).some((r) => r.text.includes(piece));
const f = (k) => (s) => !!s.flags[k];

/**
 * What you know of each of 東荒's people beyond their first look: [known?, line], in the order of
 * their lives. A line shows once you have seen it, or heard it told.
 */
const PAST = {
  lin_chen: [
    [(s) => !!s.flags.lin_breakup_seen || heard(s, '被沈家當眾退婚'), '天元三千零一十二年二月，被沈家當眾退婚。'],
    [(s) => !!s.flags.lin_test_seen || heard(s, '一掌打下擂台'), '林家族比，被堂兄林浩一掌打下擂台，吐了三口血。全鎮都在笑，只有他自己沒笑。'],
    [f('lin_saved'), '有一回昏倒在崖下，是你把他背回鎮上的。他說：「我欠你一次。」'],
    [f('ring_touched'), '他手上那枚黑戒指裡，住著一個蒼老的聲音。'],
    [(s) => heard(s, '雷靈根'), '青雲宗收徒大典上，測出萬中無一的雷靈根，被大長老收為親傳。'],
    [(s) => !!s.flags.pact_seen || heard(s, '三年之約'), '三年之約，一劍敗了沈清歌：「三年前你撕的婚書，今天我還給你。」'],
    [(s) => heard(s, '林塵離開東荒'), '離開東荒，去了中州。走之前，在林家祠堂跪了一夜。'],
    // (1.1) over the river
    [f('lin_zz_met'), '在中州當了上官家的客卿，天驕榜上一路爬到第三。謝家請了他三回，他一回都沒去。'],
    [f('lin_warned'), '九月十五以前，他知道了謝家那杯茶裡有什麼。'],
    [(s) => s.vars.duel === 'draw', '天劍宗山門外的生死約戰：他推開謝家的茶，和葉孤寒三十招平手。'],
    [(s) => s.vars.duel === 'ye', '天劍宗山門外的生死約戰：他喝了謝家的茶，輸了。葉孤寒沒有殺他。'],
    [f('lin_dead'), '死在天劍宗山門外的台上。'],
  ],
  shen_qingge: [
    [(s) => !!s.flags.lin_breakup_seen || heard(s, '被沈家當眾退婚'), '親手撕了和林塵的婚書。'],
    [f('shen_talked'), '婚書是她自己要撕的：她不想等一個廢人等一輩子，想修仙。「恨，總比被人可憐好。」'],
    [f('shen_own_path'), '她說：「我不做誰的墊腳石。」'],
    [f('shen_knows'), '你告訴過她命簿的事。她說：「那我就自己寫。」'],
    [f('shen_zhuji'), '一年後，她在青雲宗外門閉關築基，沒有回沈家報喜。'],
    // (1.1)
    [f('shen_fall'), '天元三千零一十九年春，謝家吃下了沈家的生意，沈家敗落了。'],
    [f('shen_letter_offered'), '她寫了一封信給林塵：別喝謝家的東西。她過不了江。'],
  ],
  song_he: [
    [f('songhe_story'), '六十年前衝擊築基，最後一刻想起一個答應過要回去娶的人，分了心。後來回去，她已經嫁人了。'],
    [f('songhe_saved'), '吃了你送的壽元果，那晚觀裡的老松樹抽出了一枝新芽。'],
    [f('songhe_zhuji'), '六十年後，又衝了一次築基——這一回，成了。'],
    [f('songhe_dead'), '坐化了。'],
  ],
  wang_er: [
    [(s) => !!s.flags.wanger_married, '娶了隔壁村的翠花。'],
    [(s) => heard(s, '取名王小石'), '有了兒子，取名王小石。'],
    [(s) => heard(s, '王二的背'), '兒子王小石也成親了。他的背，有點駝了。'],
    [(s) => heard(s, '享年六十二歲'), '走了，享年六十二歲。臨終前一直望著門口，說在等一個朋友。'],
  ],
  sun_zg: [
    [f('sun_revealed'), '其實是修士，煉氣二層，三十年沒動過修為。'],
    [f('sun_past'), '三十年前是落霞坊市丹師葛雲山的徒弟。師父替他煉築基丹，丹爐炸了，師父死在爐前。'],
    [f('ge_letter_found'), '他的名字叫孫長春。'],
    [f('sun_master_done'), '師父留下的字條說：「丹不成，非你之過。」三十年來，他頭一回閉關。'],
    [f('sun_out'), '出關了，到了煉氣三層。'],
    // (1.1)
    [f('sun_to_baicao'), '百草谷的葛雲蘅寫信請他去中州。他說，再過幾年，要自己關了回春堂。'],
  ],
  su_qingyao: [
    [f('banxian_secret'), '每回聽到古戰場那段書，臉色都是白的。錢半仙說，她不是怕，是在記。'],
    [(s) => !!s.flags.su_ruins_met || heard(s, '帶出了一卷古經'), '古戰場的秘境裡，她好像早就知道機關在哪。'],
    [f('blood_moon_warned'), '她說，天元三千零二十二年，月亮會變紅。'],
    [f('su_farewell'), '她是重生的人。上一世，她死在血月那一夜。'],
    // (1.0) in 中州
    [f('su_zz_met'), '在臨江城的榜樓下，又見到了她。'],
    [f('su_zz_ally'), '她進了欽天監：她「預言」的事都和命簿對得上。她在裡面查，那一夜是誰下的筆。'],
    [f('su_told_night'), '上一世她看到的最後一幕：月亮變紅，天上攤開一本書，一支筆落在東荒。'],
  ],
  hu_sanniang: [
    [f('hu_story_hunter'), '三百年前，一個獵戶放了她一條生路。她守著獵戶的子孫，一直守到現在。'],
    [f('hu_story_crack'), '她見過一個人飛升失敗：天上裂開一道縫，縫後面什麼都沒有。'],
    [f('hu_story_founder'), '青雲宗的開山祖師，年輕時偷過她的雞。'],
    [f('fox_protected'), '青雲宗的人來獵狐那一回，你護住了她。'],
    [f('fox_betrayed'), '青雲宗的人來獵狐那一回，你把她賣了。'],
  ],
  qian_banxian: [
    [f('banxian_secret'), '早就看出那個白衣女修在記古戰場的事。'],
    [(s) => ['banxian_tale_nl', 'banxian_tale_xm', 'banxian_tale_by'].some((k) => s.flags[k]), '你給他講過遠方的事，他講成了書。'],
    [f('banxian_past'), '五十年前是煉氣九層的修士。在古戰場秘境最深處看了那道劍光一眼，修為就散了，從此只會說書。'],
  ],
  zhao_hu: [
    [f('beat_zhao'), '在豆花攤前被你當眾教訓過。'],
    [f('zhao_done'), '叫他當修士的表舅，在巷口堵過你。'],
    [f('zhao_changed'), '舅舅被縣衙革了差，表舅死在黑風林。他在老李頭的豆花攤推磨，還那些年掀翻的豆花。'],
  ],
  ye_guhan: [
    [(s) => heard(s, '你很好'), '路過青雲宗，和林塵論劍三招，只說了一句：「你很好。」'],
    [f('ye_met'), '在斷劍峰的劍痕前遇見過他。那道劍痕，他看了三天還沒看完。'],
    [f('ye_lineage'), '他說，天劍宗的第一招，是祖師照著斷劍峰的劍痕練的。'],
    // (1.0) in 中州
    [f('ye_zz_met'), '天劍宗的劍子，天驕榜第一名。常坐在山門外的石階上擦劍。'],
    [f('ye_promise'), '他說，改天帶你上山，去看一樣東西。'],
    [f('ye_lin_asked'), '林塵在天劍宗山門外站了一整天。葉孤寒知道他想打一場；「還不到時候。」'],
  ],
  // (1.1) 中州
  ge_yunheng: [
    [f('ge_met'), '百草谷的谷主，丹術中州第一，脾氣也是。看臉不過四十，頭髮全白了。'],
    [f('ge_book_known'), '葛老（葛雲山）的妹妹。五十年前哥哥去了東荒，她在百草谷等了五十年。'],
    [f('sun_to_baicao'), '她寫信給孫長春：葛雲山的徒弟，就是百草谷的人。'],
  ],
  // (1.0) 中州
  xiao_qi: [
    [f('xiaoqi_met'), '在中州當散修的三條規矩：洞府按月租，別欠；懸賞挑沒人接的接；別惹世家。'],
    [f('xiaoqi_arm'), '四十年前，和一個世家公子爭一株九葉蓮。他換回一顆金丹，那條胳膊換給了那家的狗。'],
  ],
  shangguan_jin: [
    [f('sg_met'), '給了你一張上官家的名帖：在上官家的鋪子裡報這張帖子，價錢好說。'],
    [f('sg_longji'), '龍脊嶺底下的靈脈，謝家想要整條。上官家想要的，是謝家別想要整條。'],
    // (1.1)
    [f('sg_boat_owed'), '龍脊嶺的官司贏了。上官家的樓船，欠你一回：不管什麼時候，不管載什麼人。'],
  ],
  xie_xuanlang: [
    [f('xie_met'), '天劍宗外門弟子，天驕榜第六十七名。走到哪裡都有人前呼後擁。'],
    [f('xie_shen_heard'), '他說，東荒沈家的生意，他爹看上很久了。'],
    // (1.1)
    [f('lg_job_xie'), '他出四百靈石，要你把上官家的礦工趕下龍脊嶺。'],
    [f('xie_ally'), '他給了你一包軟筋散：九月十五，林塵的那杯茶。'],
    [f('xie_exposed'), '天劍宗山門外，他敬林塵的那杯茶，被當眾摔碎了。'],
  ],
};

/** The lines you know of one of them (none: an empty list). */
export function pastOf(s, id) {
  return (PAST[id] || []).filter(([known]) => known(s)).map(([, line]) => line);
}

/** How many there are to know of one of them (for the people page). */
export function pastTotal(id) {
  return (PAST[id] || []).length;
}

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
    // (wandering on: somewhere on the same map)
    if (chance(s, 0.08)) npc.loc = pick(s, PEOPLE_PLACES.filter((id) => mapOf(id) === mapOf(npc.loc)));
  }
}
