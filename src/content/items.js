// 物品. `use` runs effects when the player uses it from the bag; `power` on a
// weapon or treasure adds to 戰力 while carried; `disguise` makes an item
// look like another until identified.

export const ITEMS = {
  // ── 藥草與材料 ──
  ningqi_grass: {
    name: '凝氣草', kind: 'herb', sell: 3,
    desc: '最常見的低階靈草，葉脈泛著微光。',
    use: { text: '你嚼下凝氣草，一縷清涼沉入丹田。', effects: [['xw', 15]] },
  },
  zhixue_grass: {
    name: '止血草', kind: 'herb', sell: 1,
    desc: '凡人也認得的草藥，敷在傷處能好得快些。',
    use: { text: '你把止血草搗碎敷上，傷口不再滲血。', effects: [['healdays', 20]] },
  },
  ziyun_zhi: {
    name: '紫雲芝', kind: 'herb', sell: 150,
    desc: '百年一生的靈芝，菌蓋上浮著紫色雲紋。',
    use: { text: '紫雲芝入口即化，一股磅礴的藥力在經脈中奔湧。', effects: [['xw', 320], ['insight', 2]] },
  },
  snake_gall: {
    name: '青鱗蛇膽', kind: 'herb', sell: 12,
    desc: '一階妖蛇的膽，苦得讓人流淚。',
    use: { text: '苦。苦到你懷疑人生。但經脈確實熱了起來。', effects: [['xw', 50]] },
  },
  lightning_wood: {
    name: '雷擊木', kind: 'material', sell: 45,
    desc: '被天雷劈過的老桃木，隱隱有電光流轉。製符煉器的好材料。',
  },
  wolf_core: {
    name: '狼王妖丹', kind: 'material', sell: 90,
    desc: '一階上品妖狼的內丹，蘊含暴烈的妖力。',
    use: { text: '妖丹的力量在體內橫衝直撞，你咬牙煉化，眼前一陣血紅。', effects: [['xw', 450], ['mind', -10]] },
  },
  xuanyin_stone: {
    name: '玄陰石', kind: 'material', sell: 220,
    desc: '觸手冰寒的黑石，夜裡會微微發亮。似乎是某種陣法的核心材料。',
  },
  crane_feather: {
    name: '白鶴翎羽', kind: 'material', sell: 30,
    desc: '潔白無瑕的長羽，坊市的制符師願意出好價錢。',
  },
  blood_ginseng: {
    name: '三葉血參', kind: 'herb', sell: 25,
    desc: '參鬚泛紅，像是浸過血。補氣血的好東西。',
    use: { text: '血參入腹，渾身燥熱，像是喝了一大碗烈酒。', effects: [['xw', 70], ['healdays', 15]] },
  },
  python_scale: {
    name: '靈溪蟒鱗', kind: 'material', sell: 70,
    desc: '巴掌大的青黑鱗片，刀劍難傷。',
  },

  // ── 丹藥 ──
  juqi_pill: {
    name: '聚氣丹', kind: 'pill', price: 30, sell: 12,
    desc: '服下後三個月內，修煉速度提升五成。',
    use: { text: '丹藥化開，周身毛孔似乎都在吸納靈氣。', effects: [['buff', 'juqi', 90]] },
  },
  heal_pill: {
    name: '療傷丹', kind: 'pill', price: 25, sell: 10,
    desc: '修士常備的傷藥，可治一級傷勢。',
    use: { text: '藥力化作暖流，傷處的疼痛漸漸退去。', effects: [['heal', 1]] },
  },
  detox_pill: {
    name: '解毒丹', kind: 'pill', price: 15, sell: 6,
    desc: '可解尋常瘴毒。帶在身上，中毒時會自動服用。',
  },
  qingxin_pill: {
    name: '清心丹', kind: 'pill', price: 40, sell: 16,
    desc: '寧神靜氣，心境 +15。',
    use: { text: '一股清涼直透靈台，雜念如潮水般退去。', effects: [['mind', 15]] },
  },
  zhuji_pill: {
    name: '築基丹', kind: 'pill', sell: 300,
    desc: '突破築基時服用，每顆增加兩成五的成功率，最多兩顆。在「修煉」頁突破時選用。',
  },
  fake_zhuji: {
    name: '假築基丹', kind: 'pill', sell: 1, disguise: 'zhuji_pill',
    desc: '用麵粉、蜂蜜和一點點凝氣草粉搓成的丸子。',
  },
  longevity_fruit: {
    name: '壽元果', kind: 'treasure', sell: 600,
    desc: '傳說食之可延壽二十載。',
    use: { text: '果肉甘甜如蜜。你感到某種一直在流逝的東西，被輕輕補上了一截。', effects: [['life', 20]] },
  },

  // ── 功法典籍 ──
  book_qingmu: {
    name: '《青木訣》', kind: 'book', sell: 60,
    desc: '散修常見的木屬性功法。使用後習得。',
    use: { text: '你翻開書頁，一字一句地參悟。', effects: [['tech', 'qingmu']] },
  },
  book_qingyuan: {
    name: '《青元劍訣》', kind: 'book', sell: 0,
    desc: '前輩遺留的劍訣。使用後習得。',
    use: { text: '劍意透紙而出，你看得入神，指尖不自覺地比劃起來。', effects: [['tech', 'qingyuan_sword']] },
  },
  book_lieyan: {
    name: '《烈焰訣》', kind: 'book', price: 260, sell: 90,
    desc: '火屬性功法。使用後習得。',
    use: { text: '書頁微微發燙。', effects: [['tech', 'lieyan']] },
  },
  book_xuanshui: {
    name: '《玄水真經》殘卷', kind: 'book', sell: 0,
    desc: '古戰場中得來的殘卷。使用後習得。',
    use: { text: '殘卷上的字跡如水波流動，你沉入其中，不知時日。', effects: [['tech', 'xuanshui'], ['days', 10]] },
  },
  book_songhe: {
    name: '《松鶴手札》', kind: 'book', sell: 0, keep: true,
    desc: '松鶴道人一生的修行心得，記著他當年築基失敗的每一個細節。持有時，突破築基成功率 +10%。翻閱可習得松鶴吐納術。',
    use: { text: '字跡蒼勁，最後幾頁卻越寫越抖。你讀到天亮。', effects: [['tech', 'songhe']] },
  },

  // ── 兵器與寶物 ──
  chaidao: {
    name: '柴刀', kind: 'weapon', sell: 0, power: 0.1,
    desc: '砍柴的刀。總比空手好。',
  },
  hunting_bow: {
    name: '獵弓', kind: 'weapon', sell: 2, power: 0.15,
    desc: '父親留下的獵弓，弓背磨得發亮。',
  },
  qinggang_sword: {
    name: '青鋼劍', kind: 'weapon', price: 160, sell: 60, power: 0.35,
    desc: '坊市鐵匠鋪最好的劍，尚算不上法器。',
  },
  broken_sword: {
    name: '古劍殘片', kind: 'treasure', sell: 0, power: 0.2,
    desc: '劍身只剩三寸，寒光不減。帶在身上，戰力 +20%。',
  },

  // ── 符籙與信物 ──
  foxfire_talisman: {
    name: '狐火符', kind: 'talisman', sell: 0,
    desc: '危急時借狐火遁走。戰鬥失敗時自動使用，免去一次傷勢。',
  },
  xuesha_token: {
    name: '血煞令', kind: 'token', sell: 0,
    desc: '刻著血色骷髏的鐵牌，摸上去是溫的。',
  },
  beggar_map: {
    name: '泛黃的紙片', kind: 'token', sell: 0,
    desc: '老乞丐給的。畫著幾道彎彎曲曲的線，像是青石山的山脊，有一處打了個叉。',
  },
  lin_jade: {
    name: '林塵的玉佩', kind: 'token', sell: 0,
    desc: '青玉上刻著一個「塵」字。他說：「憑此物，可向我討一個人情。」',
  },
  mystery: {
    name: '未知之物', kind: 'unknown', price: 12, sell: 2,
    desc: '一件說不出用途的舊物。鑑定之後才知道是什麼。',
    identify: [
      { w: 34, text: '只是一塊刻了花紋的石頭。', effects: [] },
      { w: 22, text: '夾層裡藏著幾株乾枯的凝氣草。', effects: [['item', 'ningqi_grass', 3]] },
      { w: 16, text: '一枚褪色的錢袋，裡面還有靈石。', effects: [['ls', 25]] },
      { w: 12, text: '一個小瓷瓶，裝著一顆聚氣丹。', effects: [['item', 'juqi_pill', 1]] },
      { w: 8, text: '一顆清心丹，封蠟完好。', effects: [['item', 'qingxin_pill', 1]] },
      { w: 5, text: '書脊裡縫著一本功法！', effects: [['item', 'book_qingmu', 1]] },
      { w: 3, text: '一塊冰涼的黑石，夜裡微微發亮。', effects: [['item', 'xuanyin_stone', 1]] },
    ],
  },
};

/** What the player sees for an item, honoring disguises until identified. */
export function displayItem(s, id) {
  const it = ITEMS[id];
  if (!it) return { name: id, desc: '' };
  if (it.disguise && !s.sys.known?.[id]) {
    const d = ITEMS[it.disguise];
    return { name: d.name, desc: d.desc, disguised: true };
  }
  return { name: it.name, desc: it.desc };
}

export const SHOPS = {
  luoxia: {
    name: '百草堂',
    keeper: '錢掌櫃',
    stock: ['juqi_pill', 'heal_pill', 'detox_pill', 'qingxin_pill', 'qinggang_sword', 'book_lieyan'],
  },
};
