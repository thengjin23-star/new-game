// 物品. `use` runs effects when the player uses it from the bag; `power` on a
// weapon or treasure adds to 戰力 while carried; `disguise` makes an item
// look like another until identified.
//
// 裝備 (kind 'gear', and weapons): slot — where it is worn (core/body.js:
// robe 衣袍, charm 佩飾, relic 法器); stats — what it gives while worn
// (hp, mp, def, regen, mpRegen, crit, speed, sense, fire); move — a move
// it lets you carry into a fight (content/moves.js); craft — made at a
// shop from what you bring ({ ls, items }), not bought. A weapon's strike:
// whose swing it borrows (STRIKES), if it has none of its own.

export const ITEMS = {
  // ── 藥草與材料 ──
  ningqi_grass: {
    name: '凝氣草', kind: 'herb', sell: 3,
    desc: '最常見的低階靈草，葉脈泛著微光。',
    use: { text: '你嚼下凝氣草，一縷清涼沉入丹田。', effects: [['xw', 15], ['mp', 0.3]] },
  },
  zhixue_grass: {
    name: '止血草', kind: 'herb', sell: 1,
    desc: '凡人也認得的草藥，敷在傷處能好得快些。',
    use: { text: '你把止血草搗碎敷上，傷口不再滲血。', effects: [['healdays', 20], ['hp', 0.15]] },
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
    use: { text: '血參入腹，渾身燥熱，像是喝了一大碗烈酒。', effects: [['xw', 70], ['healdays', 15], ['hp', 0.35]] },
  },
  wolf_pelt: {
    name: '狼皮', kind: 'material', sell: 4,
    desc: '灰狼的皮，毛色雜亂。鎮上的皮匠肯收。',
  },
  fire_tiger_pelt: {
    name: '赤炎虎皮', kind: 'material', sell: 60,
    desc: '赤炎妖虎的皮，摸上去還是溫熱的。坊市裡識貨的人肯出高價。',
  },
  beast_core: {
    name: '妖獸內丹', kind: 'material', sell: 18,
    desc: '一階妖獸的內丹，只有指甲蓋大小。坊市的丹師會收，煉丹時用得上。',
    use: { text: '你把內丹含在舌下，一股燥熱的妖力慢慢化開。', effects: [['xw', 60], ['mind', -2]] },
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
    desc: '修士常備的傷藥，可治一級傷勢，並回復四成半氣血。',
    use: { text: '藥力化作暖流，傷處的疼痛漸漸退去。', effects: [['heal', 1], ['hp', 0.45]] },
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
  golden_carp: {
    name: '金鱗鯉', kind: 'herb', sell: 30,
    desc: '大江裡喝了一千年靈氣的鯉魚，鱗片像金箔。烤了吃，補氣血，也補靈力。',
    use: { text: '你把金鱗鯉烤了。一口下去，渾身暖洋洋的，靈力像漲潮一樣湧上來。', effects: [['hp', 0.5], ['mp', 0.6], ['xw', 30]] },
  },
  book_lianxi: {
    name: '《斂息訣》', kind: 'book', price: 120, sell: 40,
    desc: '一本薄薄的小冊子，教人收斂氣息，不叫野獸察覺。使用後習得斂息術。',
    use: { text: '你照著冊子上的法門調息，呼吸越來越輕，輕到連自己都聽不見。', effects: [['tech', 'lianxi']] },
  },
  book_qingshen: {
    name: '《輕身術》', kind: 'book', price: 150, sell: 50,
    desc: '坊間常見的身法冊子，紙都翻毛了。使用後習得輕身術：走得快些，溪澗、矮牆、斷崖一躍而過（引氣入體才用得上）。',
    use: { text: '你照著冊子提氣，腳下一點，整個人輕飄飄地彈了起來，又重重地摔了一跤。多摔幾次，就會了。', effects: [['tech', 'qingshen']] },
  },
  book_yujian: {
    name: '《御劍訣》', kind: 'book', sell: 0,
    desc: '青雲宗內門的御劍法門。使用後習得：煉氣七層以上，手上有劍就能御劍飛行。',
    use: { text: '你照著訣中的法門，把一縷靈力送進劍身。劍嗡的一聲，從你手裡浮了起來，懸在半空，等你踏上去。', effects: [['tech', 'yujian']] },
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
    name: '獵弓', kind: 'weapon', sell: 2, power: 0.15, ranged: true,
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
  iron_saber: {
    name: '精鐵刀', kind: 'weapon', price: 90, sell: 30, power: 0.22, strike: 'chaidao',
    desc: '百煉坊打的刀，比柴刀沉，也比柴刀利。',
  },
  hantie_sword: {
    name: '寒鐵劍', kind: 'weapon', price: 520, sell: 200, power: 0.55, strike: 'qinggang_sword',
    desc: '寒鐵鍛的劍，劍身泛著冷光，已摸到了法器的門檻。',
  },

  // ── 衣袍、佩飾、法器 ──
  cloth_robe: {
    name: '青布道袍', kind: 'gear', slot: 'robe', price: 60, sell: 20, stats: { hp: 0.08, mpRegen: 0.3 },
    desc: '坊市裁縫的道袍，針腳細密，穿著透氣。',
  },
  wolf_coat: {
    name: '狼皮襖', kind: 'gear', slot: 'robe', sell: 25, stats: { hp: 0.12, def: 0.04 }, craft: { ls: 30, items: { wolf_pelt: 4 } },
    desc: '幾張狼皮縫成的短襖，擋得住風，也擋得住一點刀。',
  },
  scale_armor: {
    name: '蟒鱗甲', kind: 'gear', slot: 'robe', sell: 120, stats: { def: 0.15, hp: 0.06, speed: -0.03 }, craft: { ls: 120, items: { python_scale: 2 } },
    desc: '靈溪蟒的鱗一片片綴成的甲，刀劍難入，就是沉了些。',
  },
  tiger_robe: {
    name: '赤炎虎皮袍', kind: 'gear', slot: 'robe', sell: 160, stats: { hp: 0.2, def: 0.08, fire: 0.5 }, craft: { ls: 200, items: { fire_tiger_pelt: 1 } },
    desc: '赤炎妖虎的皮做的袍子，終年溫熱，火燒不透。',
  },
  peace_buckle: {
    name: '平安扣', kind: 'gear', slot: 'charm', price: 40, sell: 15, stats: { def: 0.04, regen: 0.3 },
    desc: '青玉磨成的平安扣，說是開過光。受的傷輕一點，好得也快一點。',
  },
  fang_pendant: {
    name: '狼牙墜', kind: 'gear', slot: 'charm', sell: 20, stats: { crit: 0.06 }, craft: { ls: 20, items: { beast_core: 1, wolf_pelt: 2 } },
    desc: '狼牙上嵌了一顆妖獸內丹，戴著叫人心裡發狠。',
  },
  jade_pendant: {
    name: '青玉佩', kind: 'gear', slot: 'charm', price: 180, sell: 70, stats: { mp: 15, mpRegen: 0.5 },
    desc: '溫潤的青玉，存得住一點靈氣。',
  },
  crane_plume: {
    name: '金羽鶴翎', kind: 'gear', slot: 'charm', sell: 0, keep: true, stats: { speed: 0.06, regen: 0.25 },
    desc: '孤鶴峰上，金頸白鶴送你的一根翎羽。羽根是金的，摸上去暖暖的。戴著它，腳下輕快了些，傷也好得快些。',
  },
  zhaoyao_mirror: {
    name: '照妖鏡', kind: 'gear', slot: 'relic', price: 280, sell: 110, stats: { sense: 0.5 }, move: 'mirror',
    desc: '巴掌大的銅鏡，背面刻著八卦。鏡光照處，妖邪現形。戴著它，可以帶「照妖」上陣，神識也看得更遠。',
  },
  zijin_bell: {
    name: '紫金鈴', kind: 'gear', slot: 'relic', price: 360, sell: 140, stats: { def: 0.04 }, move: 'bell',
    desc: '紫金打的小鈴，一搖，聲如洪鐘。戴著它，可以帶「金鐘」上陣。',
  },

  // ── 飛行法器 ──（怎麼飛：world/air.js）
  feisuo: {
    name: '青木飛梭', kind: 'flyer', price: 480, sell: 160,
    desc: '一截青木削成的梭子，巴掌大小，迎風就長。引氣入體之後，以靈力催動，可以載人低空飛行：江湖溪澗、矮山小嶺都飛得過，太高的山就上不去了。飛著的時候一直耗靈力。',
  },

  // ── 符籙與信物 ──（符燒了有什麼用：content/arts.js）
  foxfire_talisman: {
    name: '狐火符', kind: 'talisman', sell: 0,
    desc: '危急時借狐火遁走。戰鬥失敗時自動使用，免去一次傷勢。',
  },
  fire_talisman: {
    name: '火符', kind: 'talisman', price: 25, sell: 8,
    desc: '黃紙硃砂畫的火紋。戰鬥中燒出去，一團烈火砸向敵人，比火球術還猛，不耗靈力。',
  },
  gold_talisman: {
    name: '金光符', kind: 'talisman', price: 30, sell: 10,
    desc: '戰鬥中燒了，一層金光護住周身八息，擋下四成氣血的傷害。',
  },
  exorcise_talisman: {
    name: '驅邪符', kind: 'talisman', price: 20, sell: 6,
    desc: '戰鬥中燒了，身邊的鬼物陰魂被震退、受創；平時燒了，一百八十息之內孤魂野鬼不敢近身。',
  },
  swift_talisman: {
    name: '神行符', kind: 'talisman', price: 20, sell: 6,
    desc: '貼在腿上，一百二十息之內腳下生風，走得快一半。',
  },
  hide_talisman: {
    name: '斂息符', kind: 'talisman', price: 25, sell: 8,
    desc: '燒了，九十息之內氣息全無：野獸要走到跟前才發覺你。一出手就破了。',
  },
  miasma_talisman: {
    name: '避瘴符', kind: 'talisman', price: 15, sell: 5,
    desc: '遇上瘴氣時燒了，瘴毒近不了身。',
  },
  wind_talisman: {
    name: '御風符', kind: 'talisman', price: 45, sell: 15,
    desc: '燒了，一陣風托著你飛上半空，六十息之內任你來去，凡人也用得。太高的山飛不上去。',
  },
  return_talisman: {
    name: '歸元符', kind: 'talisman', price: 40, sell: 12,
    desc: '燒了，一陣風把你送回最近去過的城鎮（青石鎮、落霞坊市或清虛觀）。路上要過一個時辰。',
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

/** Shops: what they sell (stock), and what they make from what you bring (recipes, see craft). */
export const SHOPS = {
  luoxia: {
    name: '百草堂',
    keeper: '錢掌櫃',
    stock: ['juqi_pill', 'heal_pill', 'detox_pill', 'qingxin_pill', 'qinggang_sword', 'book_lieyan'],
  },
  talisman: {
    name: '符籙攤',
    keeper: '畫符的柳老道',
    stock: ['fire_talisman', 'gold_talisman', 'exorcise_talisman', 'swift_talisman', 'hide_talisman', 'miasma_talisman', 'return_talisman', 'wind_talisman', 'zhaoyao_mirror', 'jade_pendant', 'feisuo', 'book_lianxi', 'book_qingshen'],
  },
  smithy: {
    name: '百煉坊',
    keeper: '鐵匠老韓',
    stock: ['iron_saber', 'hantie_sword', 'cloth_robe', 'peace_buckle', 'zijin_bell'],
    recipes: ['wolf_coat', 'fang_pendant', 'scale_armor', 'tiger_robe'],
  },
};
