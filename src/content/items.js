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
  turtle_shell: {
    name: '玄龜甲', kind: 'material', sell: 90,
    desc: '玄龜背上剝下的一片甲，比鐵還硬，泡在水裡也不鏽。百煉坊能拿它打一件甲衣。',
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
  // 南嶺 (0.21)
  zhangling_zhi: {
    name: '瘴靈芝', kind: 'herb', sell: 30,
    desc: '瘴林裡長的靈芝，紫黑色，傘蓋上總掛著水珠。吸的是瘴氣，有毒也有靈氣：生吃傷神，入丹最好——避瘴丹的主藥。',
    use: { text: '你咬了一口。舌頭一麻，一股熱氣直衝腦門：靈氣是有的，人也昏昏沉沉了大半天。', effects: [['xw', 70], ['mind', -3]] },
  },
  marsh_lotus: {
    name: '沼心蓮', kind: 'herb', sell: 140,
    desc: '毒沼正中，只在死水裡開的白蓮，蓮心一點金。污泥裡長出來，偏偏一點毒也不沾。',
    use: { text: '蓮心入口，先是清苦，然後是一股說不出的甘甜，順著經脈一路涼下去。心裡的雜念，像是沉進了水底。', effects: [['xw', 300], ['mind', 10], ['insight', 1]] },
  },
  spider_silk: {
    name: '毒蛛絲', kind: 'material', sell: 12,
    desc: '瘴林毒蛛吐的絲，又輕又韌，刀割不斷。青竹寨的阿蘿會把它織成軟甲。',
  },
  toad_venom: {
    name: '蟾酥', kind: 'material', sell: 16,
    desc: '毒沼巨蟾耳後的白漿曬乾的，以毒攻毒的藥引。避瘴丹裡少不了它。',
  },
  gu_shell: {
    name: '蠱母甲', kind: 'material', sell: 120,
    desc: '蠱母背上的一片甲，金黃泛銅色，刀砍上去只留一道白印，百毒不侵。阿蘿說，這東西能做一件好甲。',
  },
  // 西漠 (0.22)
  shaji: {
    name: '沙棘果', kind: 'herb', sell: 3,
    desc: '沙地上一叢一叢的刺棵子結的小果，橙黃橙黃的，酸得掉牙。駝夫們走沙海，嘴裡總嚼著一把：生津，解渴。',
    use: { text: '酸得你眼淚都出來了。嘴裡生了津，喉嚨不那麼乾了。', effects: [['hp', 0.12], ['shade', 0.5]] },
  },
  suoyang: {
    name: '鎖陽', kind: 'herb', sell: 14,
    desc: '戈壁上的怪草，沒有葉子，一根紫紅的肉莖從石縫裡頂出來。冬天地凍三尺，它四周的雪也是化的。補精血，壯筋骨。',
    use: { text: '鎖陽又澀又甜。嚼下去，一股熱從腰眼升起來，渾身的筋骨都暖了。', effects: [['xw', 60], ['hp', 0.25]] },
  },
  congrong: {
    name: '肉蓯蓉', kind: 'herb', sell: 45,
    desc: '寄生在梭梭根上的「沙漠人參」，黃褐色，一節一節像鱗片。駝隊的人說，一根百年的蓯蓉，抵得上一株紫雲芝。',
    use: { text: '蓯蓉的藥力綿長，一點一點地沉進經脈，像沙子吸水。', effects: [['xw', 160], ['healdays', 10]] },
  },
  scorpion_tail: {
    name: '沙蠍尾針', kind: 'material', sell: 14,
    desc: '沙蠍尾巴上的毒鉤，一截琥珀色，裡頭的毒還沒乾。藥鋪收它入藥：以毒攻毒。',
  },
  jiao_scale: {
    name: '沙蛟鱗', kind: 'material', sell: 110,
    desc: '沙蛟身上的鱗，金褐色，巴掌大，邊緣磨得像刀。沙子打在上面，一點痕跡也不留；摸上去，總是涼的。',
  },
  star_stone: {
    name: '星紋石', kind: 'material', sell: 60,
    desc: '石傀身上剝下來的一塊石頭，裡頭有銀藍色的紋，夜裡一閃一閃，像把星星封在了石頭裡。',
  },
  // 北原 (0.23)
  xueshen: {
    name: '雪參', kind: 'herb', sell: 12,
    desc: '長在雪底下的參，根白得像雪，掰開來卻是紅心的。北原的人進山，懷裡總揣著一截：嚼一口，渾身就熱了。',
    use: { text: '雪參又苦又甜。嚼下去，一股熱從肚子裡升起來，一直暖到指尖。', effects: [['xw', 60], ['hp', 0.15], ['shade', 0.4]] },
  },
  xuelian: {
    name: '雪蓮', kind: 'herb', sell: 90,
    desc: '開在雪峰頂上、崖縫裡的花，花瓣雪白，花心淡黃，摘下來三年不謝。傳說能續斷骨、補元氣，是結丹的人求之不得的靈藥。',
    use: { text: '雪蓮的藥力清清涼涼的，一路沉到丹田，在那裡慢慢化開。身上的舊傷，好像也輕了一些。', effects: [['xw', 240], ['heal', 1]] },
  },
  lingsui: {
    name: '靈髓', kind: 'herb', sell: 160,
    desc: '靈脈交匯的地方凝出來的一滴東西，藍得透亮，捧在手心像一顆會呼吸的露珠。直接服下是暴殄天物；寒衣說，它是凝金丹的主藥。',
    use: { text: '你把靈髓含在舌下。一股浩浩蕩蕩的靈力衝進經脈，衝得你眼前一黑——等你醒過來，丹田裡多了一大截修為。', effects: [['xw', 600]] },
  },
  hantie_ore: {
    name: '寒鐵礦', kind: 'material', sell: 20,
    desc: '鐵山裡挖出來的礦石，黑青色，冷得燙手。煉出來的鐵叫寒鐵，打成刀劍，比尋常的鐵利三分。',
  },
  bailang_pelt: {
    name: '白狼皮', kind: 'material', sell: 34,
    desc: '冰原狼的皮，毛又長又密，白得發藍。北原的人說，一件狼皮裘，抵得上一座火爐。',
  },
  bailang_king_pelt: {
    name: '白狼王皮', kind: 'material', sell: 260,
    desc: '白狼王的皮，比牛皮還大，毛根是銀的。白狼部的規矩：誰剝下白狼王的皮，誰就是部裡的英雄。',
  },
  bingcan_silk: {
    name: '冰蠶絲', kind: 'material', sell: 42,
    desc: '冰蠶吐的絲，細得看不見，卻扯不斷，摸上去冰涼——織成衣裳，卻是暖的。',
  },
  qilin_horn: {
    name: '冰麟角', kind: 'material', sell: 400,
    desc: '冰麟頭上的獨角，像一截透明的冰，裡頭封著一縷藍光。',
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
  bizhang_pill: {
    name: '避瘴丹', kind: 'pill', price: 30, sell: 12,
    desc: '南嶺人自己配的丹：瘴靈芝為主，蟾酥為引。服下之後三天之內，瘴氣近不了身。',
    use: { text: '丹藥入口，又苦又辣，一股辛氣從鼻子裡直衝出來。之後的每一口呼吸，都帶著一點清涼。', effects: [['buff', 'bizhang', 3]] },
  },
  bingxin_pill: {
    name: '冰心丹', kind: 'pill', price: 35, sell: 14,
    desc: '月泉驛賣的丹，雪白，含在嘴裡冰涼。服下之後三天之內，正午的毒日頭曬不倒你。',
    use: { text: '丹藥入口，一股涼氣從舌根一直沉到丹田。日頭底下，你也覺得像站在樹蔭裡。', effects: [['buff', 'bingxin', 3], ['shade']] },
  },
  nuanshen_pill: {
    name: '暖身丹', kind: 'pill', price: 40, sell: 16,
    desc: '寒鐵堡的郎中配的丹，火紅色，吞下去像吞了一塊炭。服下之後三天之內，北原的寒氣近不了身。',
    use: { text: '丹藥一下肚，一團火就在丹田裡燒起來，熱氣順著經脈一直走到手指頭、腳趾頭。你身上冒起了白氣。', effects: [['buff', 'nuanshen', 3], ['shade']] },
  },
  ningjin_pill: {
    name: '凝金丹', kind: 'pill', sell: 0, keep: true,
    desc: '以靈髓為主藥、雪蓮為引煉成的丹，金色，圓得像一顆小小的太陽。衝擊金丹時服下，助你把一身真元凝成一顆金丹（每顆加成功率一成五，最多兩顆）。',
  },
  shaodaozi: {
    name: '燒刀子', kind: 'food', price: 6, sell: 2,
    desc: '寒鐵堡的烈酒，喝下去像吞了一把刀子，從喉嚨一路燒到肚子。北原的人說：雪地裡迷了路，一口燒刀子能多撐半夜。',
    use: { text: '你仰頭灌了一大口。酒像一道火線，從喉嚨一路燒到肚子，燒得你眼淚都出來了——可是身上，熱了。', effects: [['hp', 0.08], ['shade']] },
  },
  water_skin: {
    name: '水囊', kind: 'food', price: 4, sell: 1,
    desc: '羊皮縫的水囊，灌滿了月泉的水。走沙海的人，身上沒有水囊，就是不要命。日頭底下喝幾口，人就緩過來了。',
    use: { text: '你仰頭灌了幾大口。水是溫的，帶著羊皮的膻味，可這是你這輩子喝過最好喝的水。', effects: [['hp', 0.1], ['shade']] },
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
  lake_pearl: {
    name: '鏡湖明珠', kind: 'material', sell: 80,
    desc: '鏡湖水府裡的明珠，月光下會自己發亮。坊市的珠寶鋪收得起好價錢。',
  },
  golden_carp: {
    name: '金鱗鯉', kind: 'herb', sell: 30,
    desc: '大江裡喝了一千年靈氣的鯉魚，鱗片像金箔。烤了吃，補氣血，也補靈力。',
    use: { text: '你把金鱗鯉烤了。一口下去，渾身暖洋洋的，靈力像漲潮一樣湧上來。', effects: [['hp', 0.5], ['mp', 0.6], ['xw', 30]] },
  },
  // 修仙百藝 (0.15): the tools and what they use
  danlu: {
    name: '青銅丹爐', kind: 'tool', price: 260, sell: 90,
    desc: '一尊三足的小丹爐，揹在身上有點沉。有了它，在「坐」裡就能煉丹（引氣入體之後，用靈力控火）。洞府裡另有一尊。',
  },
  fubi: {
    name: '狼毫符筆', kind: 'tool', price: 60, sell: 20,
    desc: '畫符用的筆，筆桿上刻著符紋。有了它（和符紙、硃砂），在「坐」裡就能畫符——畫過的符才照得出樣子。',
  },
  fu_paper: {
    name: '符紙', kind: 'material', price: 5, sell: 1,
    desc: '黃色的符紙。畫一張符用一張。',
  },
  cinnabar: {
    name: '硃砂', kind: 'material', price: 8, sell: 2,
    desc: '研成粉的硃砂，調了靈泉水就是畫符的墨。畫一張符用一份。',
  },
  book_zhuji_recipe: {
    name: '《築基丹方》', kind: 'book', sell: 120,
    desc: '一頁發黃的丹方，寫著築基丹的配伍與火候。讀過之後就能煉築基丹：紫雲芝兩株、三葉血參兩根、妖獸內丹三顆、鏡湖明珠一顆，火候要穩。',
    use: { text: '你把丹方從頭到尾背了三遍，連那些塗改過的字也記住了。', effects: [['flag', 'recipe_zhuji'], ['log', '讀懂了築基丹方']] },
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
  xingguan_notes: {
    name: '《星官手記》', kind: 'book', sell: 0, keep: true,
    desc: '接天城最後一位星官留在地宮裡的手記：他看了十九年的天河，星在哪裡，河往哪裡流，還有天河斷掉的那一夜。持有時，衝擊金丹成功率 +8%。',
    use: { text: '你翻開手記。字跡清秀，越往後越潦草。最後一頁只有一行：「門在天河的那一頭。河斷了，門還在。」', effects: [['flag', 'notes_read']] },
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
  xuangui_armor: {
    name: '玄甲衣', kind: 'gear', slot: 'robe', sell: 150, stats: { hp: 0.14, def: 0.12, regen: 0.2 }, craft: { ls: 160, items: { turtle_shell: 1, beast_core: 2 } },
    desc: '玄龜甲片綴在內襯上的甲衣，又輕又硬，穿著傷口也好得快些。',
  },
  silk_vest: {
    name: '蛛絲軟甲', kind: 'gear', slot: 'robe', sell: 70, stats: { def: 0.08, speed: 0.04, venom: 0.25 }, craft: { ls: 80, items: { spider_silk: 4 } },
    desc: '阿蘿用毒蛛絲織的軟甲，薄得能穿在衣服底下，輕得像沒穿。刀不容易砍進去，毒也不容易滲進來。',
  },
  gu_armor: {
    name: '金蠱甲', kind: 'gear', slot: 'robe', sell: 180, stats: { hp: 0.12, def: 0.14, venom: 0.5 }, craft: { ls: 200, items: { gu_shell: 1, spider_silk: 2 } },
    desc: '蠱母甲剖成片，用毒蛛絲綴起來的甲衣，金黃發亮。穿著它，被咬上一口，毒只進得來一半。',
  },
  tiger_robe: {
    name: '赤炎虎皮袍', kind: 'gear', slot: 'robe', sell: 160, stats: { hp: 0.2, def: 0.08, fire: 0.5 }, craft: { ls: 200, items: { fire_tiger_pelt: 1 } },
    desc: '赤炎妖虎的皮做的袍子，終年溫熱，火燒不透。',
  },
  jiao_armor: {
    name: '蛟鱗甲', kind: 'gear', slot: 'robe', sell: 200, stats: { hp: 0.14, def: 0.16, cool: 1 }, craft: { ls: 220, items: { jiao_scale: 3 } },
    desc: '沙蛟鱗一片壓一片綴成的甲，金褐色，摸上去總是涼的。刀砍不進，正午的日頭也曬不透。',
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
  hanyu_pendant: {
    name: '寒玉佩', kind: 'gear', slot: 'charm', price: 320, sell: 120, stats: { cool: 1, mpRegen: 0.3 },
    desc: '從更西邊運來的白玉，冰一樣涼，烈日底下摸著也不燙手。戴著它，正午的毒日頭曬不倒你。',
  },
  sarira: {
    name: '枯禪舍利', kind: 'gear', slot: 'charm', sell: 0, keep: true, stats: { mp: 25, mpRegen: 0.8, def: 0.03 },
    desc: '枯禪坐化六十年，留下的一顆舍利，金黃，溫的。握在手裡，心就靜了，靈力也像泉水一樣慢慢湧上來。',
  },
  dingfeng_pearl: {
    name: '定風珠', kind: 'gear', slot: 'relic', sell: 0, keep: true, stats: { wind: 1, def: 0.03 },
    desc: '沙蛟頷下的一顆珠子，渾圓，灰白，裡面像有風在轉。戴著它，沙暴到了身邊也會繞開：沙暴裡照樣走得動、看得清，也飛得起來。',
  },
  // 北原 (0.23): fur and silk against the cold; iron against everything else
  langqiu: {
    name: '狼皮裘', kind: 'gear', slot: 'robe', price: 280, sell: 110, stats: { warm: 1, def: 0.08, hp: 0.05 }, craft: { ls: 120, items: { bailang_pelt: 3 } },
    desc: '三張白狼皮縫的皮裘，毛朝裡穿。北原的冷，穿上它就擋在了外頭（暴風雪裡也只擋得一半）。',
  },
  bailang_qiu: {
    name: '白狼王裘', kind: 'gear', slot: 'robe', sell: 300, stats: { warm: 1, def: 0.14, hp: 0.12, speed: 0.04 }, craft: { ls: 260, items: { bailang_king_pelt: 1, bailang_pelt: 2 } },
    desc: '白狼王的皮做的裘，披在身上，風雪都繞著走。白狼部的人看見它，會對你行禮。',
  },
  bingcan_robe: {
    name: '冰蠶衣', kind: 'gear', slot: 'robe', sell: 280, stats: { warm: 1, def: 0.12, fire: 0.3, mpRegen: 0.2 }, craft: { ls: 300, items: { bingcan_silk: 5 } },
    desc: '冰蠶絲織的衣裳，薄得像一層霧，穿在身上卻冬暖夏涼，水火都不大傷得了。',
  },
  hantie_armor: {
    name: '寒鐵甲', kind: 'gear', slot: 'robe', sell: 240, stats: { def: 0.22, hp: 0.1, speed: -0.06 }, craft: { ls: 240, items: { hantie_ore: 6 } },
    desc: '寒鐵打的鱗甲，刀砍不進，箭射不穿，就是重：穿上它走路，慢上一截。也擋不住冷。',
  },
  bingpo_pearl: {
    name: '冰魄珠', kind: 'gear', slot: 'relic', sell: 0, keep: true, stats: { warm: 1, cool: 1, mp: 30, mpRegen: 0.5 },
    desc: '冰麟額下的一顆珠子，裡面封著一片永不融化的寒氣。戴著它，寒暑都近不了身：北原的冷、西漠的烈日，都繞著你走。',
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
    desc: '燒了，一陣風把你送回這一帶最近去過的城鎮（東荒：青石鎮、落霞坊市或清虛觀；南嶺：青竹寨；西漠：月泉）。路上要過一個時辰。',
  },
  xuesha_token: {
    name: '血煞令', kind: 'token', sell: 0,
    desc: '刻著血色骷髏的鐵牌，摸上去是溫的。',
  },
  qin_token: {
    name: '落日關銅牌', kind: 'token', sell: 0, keep: true,
    desc: '一塊磨得發亮的銅牌，刻著「落日關　戍卒秦」。老秦守了四十年的關，就剩這個了。',
  },
  han_pack: {
    name: '韓三的包袱', kind: 'token', sell: 0,
    desc: '灰布包袱，縫著一個「韓」字，沉甸甸的。嶺口草棚裡的韓三，說他在瘴林裡丟了包袱。',
  },
  beggar_map: {
    name: '泛黃的紙片', kind: 'token', sell: 0,
    desc: '老乞丐給的。畫著幾道彎彎曲曲的線，像是青石山的山脊，有一處打了個叉。',
  },
  lin_jade: {
    name: '林塵的玉佩', kind: 'token', sell: 0,
    desc: '青玉上刻著一個「塵」字。他說：「憑此物，可向我討一個人情。」',
  },
  su_slip: {
    name: '蘇清瑤的玉簡', kind: 'token', sell: 0, keep: true,
    desc: '一枚溫潤的白玉簡，貼在額上，能看見她記下的事：中州幾個大宗門的山門與規矩，還有「天元三千零二十二年，血月」幾個字，刻得特別深。',
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

/**
 * Shops: what they sell (stock), and what they make from what you bring (recipes, see craft;
 * a shop that makes things refines them too, unless refine is false). made: how the making goes
 * ({keeper}, {item}). share: what it asks, as a share of the price (the 坊市's by your standing
 * there, if not its own).
 */
export const SHOPS = {
  luoxia: {
    name: '百草堂',
    keeper: '錢掌櫃',
    stock: ['juqi_pill', 'heal_pill', 'detox_pill', 'qingxin_pill', 'qinggang_sword', 'book_lieyan', 'danlu'],
  },
  talisman: {
    name: '符籙攤',
    keeper: '畫符的柳老道',
    stock: ['fire_talisman', 'gold_talisman', 'exorcise_talisman', 'swift_talisman', 'hide_talisman', 'miasma_talisman', 'return_talisman', 'wind_talisman', 'zhaoyao_mirror', 'jade_pendant', 'feisuo', 'book_lianxi', 'book_qingshen', 'fubi', 'fu_paper', 'cinnabar'],
  },
  smithy: {
    name: '百煉坊',
    keeper: '鐵匠老韓',
    stock: ['iron_saber', 'hantie_sword', 'cloth_robe', 'peace_buckle', 'zijin_bell'],
    recipes: ['wolf_coat', 'fang_pendant', 'scale_armor', 'xuangui_armor', 'tiger_robe'],
  },
  // 南嶺・青竹寨: 阿蘿 keeps the medicine house — and weaves silk and works shell for whoever brings them
  qingzhu: {
    name: '百藥鋪',
    keeper: '阿蘿',
    stock: ['bizhang_pill', 'detox_pill', 'heal_pill', 'juqi_pill', 'miasma_talisman'],
    recipes: ['silk_vest', 'gu_armor'],
    refine: false,
    made: '{keeper}收下東西，進了竹樓後頭，關上門。大半天之後她出來，把一件{item}交到你手上，手指上全是細細的口子。',
    share: (s) => (s.flags.gu_cleared ? 0.8 : s.flags.zhai_trust ? 0.9 : 1),
  },
  // 西漠・月泉: 月娘's 驛站 has what you need to go out on the sand
  yuequan: {
    name: '月泉驛',
    keeper: '月娘',
    stock: ['water_skin', 'bingxin_pill', 'heal_pill', 'detox_pill', 'juqi_pill', 'return_talisman'],
  },
  // 康駝頭's caravan: what comes from further west; and an old saddler who works scale for whoever brings it
  caravan: {
    name: '康家駝隊',
    keeper: '康駝頭',
    stock: ['hanyu_pendant', 'jade_pendant', 'qingxin_pill', 'wind_talisman', 'water_skin', 'mystery'],
    recipes: ['jiao_armor'],
    refine: false,
    made: '{keeper}把東西交給駝隊裡的老皮匠。老人一聲不吭地忙了一整天，傍晚把一件{item}遞給你，又低下頭去補他的鞍子。',
    share: (s) => (s.flags.vulture_done ? 0.85 : 1),
  },
  // 北原・寒鐵堡: the store has what keeps the cold out; the smith works iron, fur and silk
  hantie: {
    name: '寒鐵堡雜貨',
    keeper: '掌櫃的',
    stock: ['shaodaozi', 'nuanshen_pill', 'langqiu', 'heal_pill', 'detox_pill', 'juqi_pill', 'fire_talisman', 'return_talisman'],
  },
  hantie_smith: {
    name: '鐵匠鋪',
    keeper: '鐵匠',
    stock: ['hantie_sword', 'iron_saber'],
    recipes: ['langqiu', 'bailang_qiu', 'bingcan_robe', 'hantie_armor'],
    made: '{keeper}把東西接過去，一聲不吭地幹了一整天。叮叮噹噹的聲音一直響到天黑，他才把一件{item}遞給你，手上全是燙出來的泡。',
    share: (s) => (s.flags.mine_cleared ? 0.85 : 1),
  },
};
