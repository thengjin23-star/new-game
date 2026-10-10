// What stands in the world: buildings, places you can walk up to (POI),
// where people are, what roams, and small things hidden off the road.

import { T } from './geo.js';

const night = (s) => s.tod >= 19.5 || s.tod < 5;

/**
 * Buildings and painted areas. x/y is the centre of the footprint (w×h);
 * the sprite stands on the footprint's bottom edge. block: footprint is solid.
 */
export const STRUCTURES = [
  // 青石鎮
  { x: 2010, y: 2985, w: 170, h: 90, sprite: 'mansion' },
  { x: 2510, y: 2985, w: 160, h: 90, sprite: 'mansion' },
  { x: 2160, y: 3040, w: 70, h: 44, sprite: 'house' },
  { x: 2280, y: 3040, w: 70, h: 44, sprite: 'house' },
  { x: 2380, y: 3035, w: 60, h: 40, sprite: 'house' },
  { x: 2660, y: 3040, w: 70, h: 44, sprite: 'house' },
  { x: 1930, y: 3260, w: 70, h: 44, sprite: 'house' },
  { x: 2060, y: 3255, w: 70, h: 44, sprite: 'house' },
  { x: 2190, y: 3262, w: 90, h: 50, sprite: 'shop' },
  { x: 2290, y: 3255, w: 60, h: 40, sprite: 'house' },
  { x: 2400, y: 3265, w: 100, h: 56, sprite: 'teahouse' },
  { x: 2520, y: 3255, w: 70, h: 44, sprite: 'house' },
  { x: 2650, y: 3250, w: 70, h: 44, sprite: 'house' },
  { x: 2200, y: 2930, w: 60, h: 40, sprite: 'house' },
  { x: 2330, y: 2925, w: 60, h: 40, sprite: 'house' },
  { x: 2640, y: 2930, w: 60, h: 40, sprite: 'house' },
  { x: 2080, y: 3365, w: 60, h: 40, sprite: 'house' },
  { x: 2330, y: 3370, w: 60, h: 40, sprite: 'house' },
  { x: 2470, y: 3375, w: 60, h: 40, sprite: 'house' },
  { x: 1965, y: 3355, w: 44, h: 36, sprite: 'shrine_small' },
  { x: 2600, y: 3365, w: 70, h: 44, sprite: 'farmhouse' },
  { x: 2305, y: 3108, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 2440, y: 3196, w: 26, h: 18, sprite: 'bigtree', landmark: true },
  // where the roads come into town: name stones by the high road, a 牌坊 on the south road
  { x: 1880, y: 3104, w: 18, h: 8, sprite: 'stele', block: false, name: '青石鎮' },
  { x: 2732, y: 3096, w: 18, h: 8, sprite: 'stele', block: false, name: '青石鎮' },
  { x: 2250, y: 3432, w: 74, h: 10, sprite: 'paifang', block: false, name: '青石鎮' },
  // 清虛觀
  { x: 1060, y: 3190, w: 230, h: 130, paint: T.PAVED },
  { x: 1060, y: 3120, w: 120, h: 64, sprite: 'hall', landmark: true },
  { x: 955, y: 3060, w: 40, h: 40, sprite: 'pagoda', landmark: true },
  { x: 1150, y: 3088, w: 26, h: 20, sprite: 'well' },
  // 獵戶營地
  { x: 1730, y: 2765, w: 50, h: 30, sprite: 'tent' },
  // 落霞坊市
  { x: 3820, y: 2470, w: 100, h: 56, sprite: 'shop' },
  { x: 3690, y: 2420, w: 90, h: 56, sprite: 'teahouse' },
  { x: 4090, y: 2460, w: 110, h: 60, sprite: 'teahouse' },
  { x: 4220, y: 2400, w: 120, h: 70, sprite: 'auction', landmark: true },
  { x: 3760, y: 2712, w: 100, h: 56, sprite: 'shop' },
  { x: 3880, y: 2650, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 4120, y: 2700, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 3700, y: 2612, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 4180, y: 2622, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 4050, y: 2655, w: 40, h: 20, sprite: 'stall', block: false },
  { x: 3700, y: 2320, w: 70, h: 44, sprite: 'house' },
  { x: 3830, y: 2330, w: 70, h: 44, sprite: 'house' },
  { x: 4100, y: 2320, w: 70, h: 44, sprite: 'house' },
  { x: 4240, y: 2310, w: 70, h: 44, sprite: 'house' },
  { x: 3700, y: 2800, w: 70, h: 44, sprite: 'house' },
  { x: 3860, y: 2810, w: 70, h: 44, sprite: 'house' },
  { x: 4080, y: 2800, w: 70, h: 44, sprite: 'house' },
  { x: 4240, y: 2790, w: 60, h: 40, sprite: 'house' },
  { x: 3612, y: 2252, w: 30, h: 30, sprite: 'tower' },
  { x: 4308, y: 2252, w: 30, h: 30, sprite: 'tower' },
  { x: 3612, y: 2868, w: 30, h: 30, sprite: 'tower' },
  { x: 4308, y: 2868, w: 30, h: 30, sprite: 'tower' },
  // 青雲宗
  { x: 4300, y: 980, w: 160, h: 80, sprite: 'bighall', landmark: true },
  { x: 4140, y: 1060, w: 44, h: 44, sprite: 'pagoda', landmark: true },
  { x: 4440, y: 1200, w: 70, h: 40, sprite: 'hut' },
  { x: 4480, y: 1040, w: 90, h: 60, sprite: 'house' },
  { x: 4260, y: 1428, w: 120, h: 10, sprite: 'paifang', block: false, landmark: true },
  // 古戰場
  { x: 2600, y: 610, w: 120, h: 40, sprite: 'stonegate', landmark: true },
  // 狐仙廟
  { x: 3110, y: 2975, w: 70, h: 46, sprite: 'shrine' },
  { x: 3030, y: 3012, w: 50, h: 8, sprite: 'torii', block: false },
  // 白鶴渡
  { x: 4480, y: 3880, w: 60, h: 40, sprite: 'hut' },
  { x: 4680, y: 3990, w: 50, h: 16, sprite: 'boat', block: false },
  // 鏡湖：湖心亭
  { x: 3260, y: 3600, w: 96, h: 70, paint: T.BRIDGE },
  { x: 3260, y: 3612, w: 70, h: 50, sprite: 'pavilion', block: false, landmark: true },
  // 野地裡的路邊建築
  { x: 3430, y: 2945, w: 60, h: 36, sprite: 'teashed' },
  { x: 2840, y: 2268, w: 44, h: 36, sprite: 'shrine_small' },
];

const poiSeen = (id) => (s) => !s.seen[id];

/**
 * Points of interest. verb is what the interact button says. Events bind to
 * a POI with `poi: '<id>'` in their definition; `text` is what you see when
 * no event applies. hidden: found only when you come within r. auto: radius
 * inside which a bound event marked `auto` starts by itself.
 */
export const POIS = [
  // 青石鎮
  {
    id: 'lin_gate', region: 'qingshi_town', x: 2010, y: 3066, name: '林家大門', verb: '查看', auto: 150,
    crowd: (s) => (s.day >= 30 && s.day < 60 && !s.flags.lin_breakup_seen) || (s.day >= 180 && s.day < 210 && !s.flags.lin_test_seen),
    text: '林家的朱漆大門緊閉著，門前的石獅子缺了一隻耳朵。',
  },
  {
    id: 'shen_gate', region: 'qingshi_town', x: 2510, y: 3066, name: '沈家大門', verb: '查看', auto: 150,
    crowd: (s) => s.day >= 1099 && s.day < 1125 && !s.flags.pact_seen,
    text: '沈家的門楣比林家高出一截，門口兩個家丁斜眼看人。',
  },
  { id: 'tofu_stall', region: 'qingshi_town', x: 2305, y: 3132, name: '豆花攤', verb: '查看', auto: 110, text: '老李頭的豆花，三文錢一碗，加糖不加錢。' },
  { id: 'teahouse_town', region: 'qingshi_town', x: 2400, y: 3232, name: '茶館', verb: '打聽', action: 'inquire' },
  { id: 'earth_temple', region: 'qingshi_town', x: 1965, y: 3332, name: '土地廟', verb: '查看', text: '小小的土地廟，香爐裡插著三根燒了一半的香。' },
  {
    id: 'old_locust', region: 'qingshi_town', x: 2440, y: 3214, name: '老槐樹', verb: '查看',
    text: (s) => (s.tod >= 8 && s.tod < 17.5 ? '老槐樹下，兩個老頭在下棋，旁邊圍著一圈看熱鬧的。你看了一會兒，看不出誰贏誰輸。' : '老槐樹下空蕩蕩的。石桌上還擺著半局殘棋，誰也沒去動它。'),
  },
  { id: 'stone_bridge', region: 'qingshi_town', x: 1795, y: 3152, name: '鎮口石橋', verb: '查看', text: '鎮口的石橋，橋下是從青石山流下來的溪水。小時候，你常在這裡摸魚。' },
  {
    id: 'wanger_house', region: 'qingshi_town', x: 2600, y: 3330, name: '王二家', verb: '查看', auto: 130,
    festive: (s) => s.day >= 400 && s.day < 450 && !s.flags.wanger_wedding_seen,
    text: '王二家的院門開著，幾隻雞在院子裡踱步。',
  },
  // 清虛觀
  { id: 'temple_hall', region: 'qingxu_temple', x: 1060, y: 3156, name: '清虛觀', verb: '查看', auto: 120, text: '正殿供著三清，泥塑的金身斑駁脫落。香爐裡的灰是新的。', rest: true },
  { id: 'temple_yard', region: 'qingxu_temple', x: 1000, y: 3226, name: '庭院', verb: '灑掃', text: '院子裡的松針又落了一地。' },
  { id: 'old_well', region: 'qingxu_temple', x: 1150, y: 3112, name: '古井', verb: '查看', glow: night, text: '井水清冽，帶著一絲甜味。' },
  // 青石山
  { id: 'hunter_camp', region: 'qingshi_hill', x: 1730, y: 2795, name: '獵戶營地', verb: '查看', auto: 110, text: '火堆早就熄了，樹上掛著幾張曬乾的獸皮。' },
  { id: 'creek_crane', region: 'qingshi_hill', x: 1475, y: 2530, name: '溪邊', verb: '查看', sprite: 'crane_hurt', show: poiSeen('hill_crane'), text: '溪水潺潺。' },
  {
    id: 'cliff_bottom', region: 'qingshi_hill', x: 1360, y: 2700, name: '斷魂崖下', verb: '查看', auto: 140,
    sprite: 'lin_down', spriteIf: (s) => s.day >= 60 && s.day < 960 && !s.seen.hill_lin_cliff,
    text: '抬頭看，斷魂崖高得看不見頂。你就是從那裡掉下來的。',
  },
  { id: 'stele', region: 'qingshi_hill', x: 1720, y: 2560, name: '斷碑', verb: '查看', sprite: 'stele', hidden: { r: 110 }, text: '石碑上的字被風雨磨得模糊。' },
  { id: 'lightning_tree', region: 'qingshi_hill', x: 1110, y: 2592, name: '雷擊木', verb: '查看', sprite: 'lightning_tree', hidden: { r: 130 }, text: '焦黑的老桃樹，偶爾還有細小的電光閃過。' },
  {
    id: 'cave_entrance', region: 'qingshi_hill', x: 1176, y: 2576, name: '石縫', verb: '查看', sprite: 'cave',
    hidden: { r: 140, cond: (s) => !!s.flags.cave_hint || !!s.flags.cave_found },
    rename: (s) => (s.flags.cave_found ? '山腹洞府' : null),
    text: (s) => (s.flags.cave_found ? '石門在你身後合上，洞府裡只有劍痕和寂靜。這裡適合閉關。' : '一道窄窄的石縫，往山腹裡延伸。'),
    rest: true,
  },
  // 黑風林
  { id: 'wolf_lair', region: 'black_forest', x: 1450, y: 1450, name: '狼王岩', verb: '查看', auto: 150, sprite: 'wolfking', show: poiSeen('forest_wolf_king'), text: '岩石上有一道道深深的爪痕。' },
  { id: 'forest_corpse', region: 'black_forest', x: 2350, y: 1700, name: '樹下屍體', verb: '查看', sprite: 'corpse', show: poiSeen('forest_corpse'), text: '一具屍體靠坐在樹根下。' },
  {
    id: 'lost_girl', region: 'black_forest', x: 1900, y: 1975, name: '哭聲', verb: '查看', auto: 160, sprite: 'girl',
    show: (s) => !s.seen.forest_lost_girl && s.npcs.wang_er.alive && s.day < 4320 && (s.nodes.black_forest.explore || 0) >= 20,
    text: '樹洞裡空空的，只有一隻沾了泥的小鞋。',
  },
  { id: 'miasma_a', region: 'black_forest', x: 2950, y: 1400, name: '瘴氣', zone: 170, auto: 170 },
  { id: 'miasma_b', region: 'black_forest', x: 1250, y: 1700, name: '瘴氣', zone: 140, auto: 140 },
  // 落霞坊市
  { id: 'market_shop', region: 'luoxia_market', x: 3820, y: 2504, name: '百草堂', verb: '購物', action: 'shop' },
  { id: 'tavern', region: 'luoxia_market', x: 3690, y: 2454, name: '酒肆', verb: '進入', text: '酒肆裡人聲嘈雜，有人在划拳，有人趴在桌上睡覺。' },
  { id: 'teahouse_market', region: 'luoxia_market', x: 4090, y: 2496, name: '茶樓', verb: '聽書', text: '茶樓裡坐滿了人。' },
  { id: 'market_square', region: 'luoxia_market', x: 3960, y: 2600, name: '坊市路口', verb: '打聽', action: 'inquire' },
  { id: 'auction_house', region: 'luoxia_market', x: 4220, y: 2441, name: '聚寶閣', verb: '查看', festive: (s) => !!s.flags.auction_open, text: '聚寶閣大門緊閉。門口的告示寫著：拍賣會，每年十月中旬。' },
  { id: 'alchemy_shop', region: 'luoxia_market', x: 3760, y: 2680, name: '丹坊', verb: '查看', text: '丹爐的熱氣從門縫裡冒出來。' },
  { id: 'mystery_stall', region: 'luoxia_market', x: 4120, y: 2722, name: '舊貨攤', verb: '查看', text: '瞎了一隻眼的老頭閉著那隻好眼睛打盹。攤子上的東西，跟上回一模一樣。' },
  { id: 'market_alley', region: 'luoxia_market', x: 4250, y: 2760, name: '小巷', verb: '查看', auto: 90, text: '巷子裡堆著破筐和爛菜葉。' },
  { id: 'su_stall', region: 'luoxia_market', x: 3880, y: 2672, name: '雜貨攤', verb: '查看', auto: 110, text: '攤上堆著一堆說不清用途的破爛。' },
  // 靈溪谷
  {
    id: 'python_pool', region: 'lingxi_valley', x: 520, y: 1850, name: '深潭', verb: '查看', auto: 170,
    sprite: 'python', spriteIf: (s) => !s.flags.valley_safe || !!s.flags.python_friend,
    text: (s) => (s.flags.python_friend ? '大蟒在潭底盤著。你們互不打擾。' : '潭水深不見底。'),
  },
  { id: 'spirit_spring', region: 'lingxi_valley', x: 430, y: 1650, name: '靈泉', verb: '查看', glow: () => true, text: '泉眼冒著絲絲白氣。', rest: true },
  // 青雲宗
  { id: 'sect_gate', region: 'qingyun_sect', x: 4260, y: 1462, name: '青雲宗山門', verb: '查看', auto: 140, crowd: (s) => !!s.flags.recruit_open, text: '守山弟子抱著劍，靠在牌坊下打盹。' },
  { id: 'sect_steps', region: 'qingyun_sect', x: 4235, y: 1585, name: '山門外石階', verb: '打聽', action: 'inquire' },
  { id: 'sect_woodshed', region: 'qingyun_sect', x: 4440, y: 1224, name: '柴房', verb: '查看', text: '柴堆得比人還高。', rest: true },
  // 古戰場
  {
    id: 'realm_gate', region: 'ancient_ruins', x: 2600, y: 655, name: '斷石門', verb: '查看', auto: 170,
    glow: (s) => !!s.flags.realm_open,
    camp: (s) => s.day >= 690 && s.day < 720,
    text: '一座斷了一半的石門，門上的符文早已磨平。站在門前，耳邊隱約有風聲，又像有人在說話。',
  },
  { id: 'broken_sword', region: 'ancient_ruins', x: 2950, y: 820, name: '斷劍', verb: '查看', sprite: 'sword_glint', show: (s) => !s.player.items.broken_sword, text: '三寸斷劍插在黑石裡，寒光凜凜。劍身上那股冰冷的意志還在，只是今天，它不想理你。' },
  { id: 'frag_stele', region: 'ancient_ruins', x: 2230, y: 520, name: '倒塌的石碑', verb: '查看', sprite: 'stele_fallen', hidden: { r: 110 }, text: '石碑底下已經空了。' },
  // 狐仙廟
  { id: 'fox_shrine_poi', region: 'fox_shrine', x: 3110, y: 3003, name: '狐仙廟', verb: '查看', auto: 100, glow: night, text: '供桌上的灰被擦過。狐仙像的眼睛，好像在看你。' },
  // 白鶴渡
  { id: 'ferry_pier', region: 'crane_ferry', x: 4590, y: 3950, name: '白鶴渡口', verb: '查看', text: '江風很大。' },
  // 鏡湖
  { id: 'lake_pavilion', region: 'mirror_lake', x: 3260, y: 3622, name: '湖心亭', verb: '歇腳', text: '湖面如鏡，倒映著天上的雲。你在亭子裡坐了一會兒，心也跟著靜了下來。', rest: true },
  // 路上
  { id: 'roadside_tea', region: 'wilds', x: 3415, y: 2914, name: '路邊茶棚', verb: '歇腳', text: '路邊的茶棚，一個老婆婆在燒水。茶是粗茶，兩文錢一碗。趕路的人都在這裡歇歇腳。', rest: true },
  { id: 'hill_god', region: 'wilds', x: 2840, y: 2292, name: '山神廟', verb: '查看', text: '路邊的破山神廟，神像的頭不知被誰砍了去。供桌下有一堆灰燼，像是有人在這裡避過雨。', rest: true },

  // 野地裡的小發現：沒有故事，只有路過的人才會看見
  { id: 'find_lookout', region: 'qingshi_hill', x: 2070, y: 2430, name: '觀景石', verb: '查看', hidden: { r: 90 }, treasure: { text: '你爬上一塊突出的巨石。往南看，青石鎮的炊煙像幾根細線；往北看，黑風林像一團化不開的墨。\n\n你在石頭上坐到日落。', effects: [['insight', 1], ['mind', 2]] } },
  { id: 'find_quiver', region: 'wilds', x: 620, y: 3320, name: '遺落的箭袋', verb: '查看', hidden: { r: 90 }, treasure: { text: '草叢裡躺著一個破舊的箭袋，箭早就沒了，夾層裡還塞著幾塊靈石。', effects: [['ls', 8]] } },
  { id: 'find_jar', region: 'farmland', x: 2760, y: 3880, name: '田埂下的瓦罐', verb: '查看', hidden: { r: 80 }, treasure: { text: '田埂塌了一角，露出一個瓦罐。罐子裡有一小包用油紙包著的東西。', effects: [['ls', 15]] } },
  { id: 'find_niche', region: 'black_forest', x: 3100, y: 1300, name: '林中石龕', verb: '查看', hidden: { r: 90 }, treasure: { text: '一座長滿青苔的小石龕，裡面供著一個小瓷瓶。瓶上沒有字。', effects: [['item', 'juqi_pill', 1]] } },
  { id: 'find_bones', region: 'ancient_ruins', x: 3300, y: 950, name: '盤坐的骸骨', verb: '查看', hidden: { r: 90 }, treasure: { text: '一具骸骨盤坐在斷牆下，像是在等什麼人。骨頭邊上放著一個布包。\n\n你向它拜了拜，拿走了布包。', effects: [['item', 'mystery', 1], ['mind', -1]] } },
  { id: 'find_riverstone', region: 'wilds', x: 4480, y: 2300, name: '江邊的釣魚石', verb: '查看', hidden: { r: 90 }, treasure: { text: '江邊有一塊被磨得光滑的大石頭，上面刻著一行小字：「釣不到魚，也是好的。」\n\n你在石頭上坐了一下午。江水很寬，寬得看不見對岸。', effects: [['mind', 4]] } },
  { id: 'find_chessboard', region: 'wilds', x: 3700, y: 1180, name: '老松下的棋盤', verb: '查看', hidden: { r: 90 }, treasure: { text: '老松樹下有一張石桌，桌上刻著一局沒下完的棋。你看了很久，看不懂，卻又覺得好像懂了什麼。', effects: [['insight', 1]] } },
  { id: 'find_valleycave', region: 'lingxi_valley', x: 300, y: 1900, name: '谷中石洞', verb: '查看', hidden: { r: 90 }, treasure: { text: '石洞裡長滿了凝氣草，像是很久沒人來過。', effects: [['item', 'ningqi_grass', 4]] } },
  { id: 'find_teagarden', region: 'wilds', x: 2500, y: 4130, name: '荒廢的茶園', verb: '查看', hidden: { r: 100 }, treasure: { text: '一片荒廢的茶園，茶樹長得比人還高。你摘了些嫩葉，用山泉煮了一壺。', effects: [['item', 'ningqi_grass', 2], ['mind', 2]] } },
];

export const POI_BY_ID = Object.fromEntries(POIS.map((p) => [p.id, p]));

/** Where named people stand, by the region they are in. */
export const NPC_SPOTS = {
  lin_chen: { qingshi_town: [2060, 3112], qingyun_sect: [4470, 1094] },
  shen_qingge: { qingshi_town: [2470, 3108] },
  song_he: { qingxu_temple: [1100, 3200] },
  wang_er: { qingshi_town: [2556, 3326] },
  sun_zg: { qingshi_town: [2190, 3226] },
  su_qingyao: { luoxia_market: [3910, 2612], ancient_ruins: [2560, 720] },
  hu_sanniang: { fox_shrine: [3080, 3040] },
  qian_banxian: { luoxia_market: [4090, 2516] },
  zhao_hu: { qingshi_town: [2340, 3172] },
};

/** People who only show up under conditions. */
export const NPC_SHOW = {
  hu_sanniang: (s) => night(s) && s.npcs.hu_sanniang.met,
};

/** Things that roam and come at you. power: what their fight asks of you (far stronger, and they run). */
export const MOBS = [
  { id: 'wolves_a', kind: 'wolf', n: 3, x: 1450, y: 2395, r: 150, event: 'hill_wolves', respawn: 45, speed: 125, power: 20 },
  { id: 'wolves_b', kind: 'wolf', n: 2, x: 790, y: 2470, r: 120, event: 'hill_wolves', respawn: 60, speed: 125, power: 20 },
  { id: 'snake_a', kind: 'snake', n: 1, x: 1760, y: 2690, r: 90, event: 'hill_snake', respawn: 90, speed: 70, power: 24 },
  { id: 'bandits_a', kind: 'bandit', n: 3, x: 2120, y: 1610, r: 200, event: 'forest_bandits', respawn: 90, speed: 110, power: 32 },
  { id: 'robber_road', kind: 'bandit', n: 1, x: 3060, y: 2420, r: 140, event: 'travel_robber', respawn: 120, speed: 110, power: 30 },
  { id: 'ghost_a', kind: 'ghost', n: 1, x: 2300, y: 820, r: 150, event: 'ruins_soul', respawn: 30, speed: 80, power: 30 },
  { id: 'ghost_b', kind: 'ghost', n: 1, x: 2950, y: 620, r: 150, event: 'ruins_soul', respawn: 30, speed: 80, power: 30 },
  { id: 'ghost_c', kind: 'ghost', n: 1, x: 2760, y: 1000, r: 150, event: 'ruins_soul', respawn: 30, speed: 80, power: 30 },
];

/**
 * Beasts that fight where they stand (即時戰鬥, world/combat.js): where each
 * roams. power: its strength; tier: its 境界 (1 一階, a match for 煉氣);
 * respawn: days before another takes its place.
 */
export const BEASTS = [
  // 黑風林南緣: a lone demon wolf where the wood thins toward 青石鎮
  { id: 'demon_wolf_a', kind: 'demon_wolf', x: 2400, y: 2150, r: 170, respawn: 5, power: 28, tier: 1 },
];

/** Which regions grow herbs, what they give, and roughly how many spots. */
export const GATHER = {
  qingshi_hill: { n: 18, give: [[70, 'ningqi_grass', 1, 2], [30, 'zhixue_grass', 1, 1]] },
  black_forest: { n: 16, give: [[75, 'ningqi_grass', 1, 3], [15, 'zhixue_grass', 1, 1], [10, 'blood_ginseng', 1, 1]] },
  lingxi_valley: { n: 8, give: [[85, 'ningqi_grass', 2, 3], [15, 'blood_ginseng', 1, 1]] },
  qingxu_temple: { n: 3, give: [[100, 'zhixue_grass', 1, 2]] },
  wilds: { n: 22, give: [[90, 'ningqi_grass', 1, 1], [10, 'zhixue_grass', 1, 1]] },
  farmland: { n: 3, give: [[100, 'zhixue_grass', 1, 1]] },
  mirror_lake: { n: 4, give: [[80, 'ningqi_grass', 1, 2], [20, 'zhixue_grass', 1, 1]] },
  fox_shrine: { n: 3, give: [[100, 'ningqi_grass', 1, 1]] },
};

/** Townsfolk and passers-by who walk around a region (they only talk). */
export const WANDERERS = { qingshi_town: 8, luoxia_market: 11, farmland: 3, qingyun_sect: 4 };
export const GATHER_RESPAWN = 25;
