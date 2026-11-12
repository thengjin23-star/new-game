// 史冊 (0.25): what the steles, the ruins and the people who were there say happened, gathered as you
// read them — set down in the order the world remembers it, the oldest first. Where the accounts do not
// agree (who broke the 天河?), both stand: the book does not decide.
// Each entry: the era, a title, where it was read, what it says (in short), and whether you have it.

const frag = (s, id) => !!s.sys?.frags?.includes(id);
const heard = (s, piece) => (s.rumors || []).some((r) => r.text.includes(piece));

export const ERAS = ['上古', '天河斷絕', '三千年來', '近世', '不知年代'];

export const ANNALS = [
  // ── 上古 ──
  {
    id: 'jietian', era: '上古', title: '接天城', where: '西漠・沉沙古城，南門的城碑',
    got: (s) => !!s.flags.read_stele_city,
    text: '西海之濱，有一座城叫接天城。那是天河的渡口，星官住在那裡，萬里之外的人都來朝拜。',
  },
  {
    id: 'ferry', era: '上古', title: '天河之渡', where: '西漠・沉沙古城，舊碼頭的渡碑',
    got: (s) => !!s.flags.read_stele_ferry,
    text: '天河每六十年垂到西海上一次。那一夜，有道者乘舟，從海上溯河而上，登天而去。建城以來，渡過去的有三千七百二十一人。',
  },
  {
    id: 'stargazers', era: '上古', title: '星官', where: '西漠・沉沙古城，觀星台的星官碑',
    got: (s) => !!s.flags.read_stele_star,
    text: '接天城世世代代都有星官觀天。碑上的名字一長串，大半已經認不出了；最後一個叫玄微，十九歲。',
  },
  // ── 天河斷絕 ──
  {
    id: 'break', era: '天河斷絕', title: '斷河', where: '西漠・沉沙古城，觀星台的斷河碑',
    got: (s) => !!s.flags.read_stele_break,
    text: '某年七月初七，夜半，天河從中間斷了，星星像雨一樣落下來。西海一夜乾涸，舟擱在沙上，再沒有人渡過去。碑上還有一句：「或曰：非天自斷，有物斷之。」',
  },
  {
    id: 'hand', era: '天河斷絕', title: '天外之手', where: '天機殘頁・沙',
    got: (s) => frag(s, 'frag_sand'),
    text: '那一夜，末代星官玄微就站在觀星台上。他說他看見了：天外伸進來一隻手，把天河掐斷了。',
  },
  {
    id: 'swordlight', era: '天河斷絕', title: '劍光', where: '東荒・古戰場遺跡，斷劍上的殘魂',
    got: (s) => !!s.flags.ghost_memory,
    text: '古戰場的殘魂還記得那一場大戰：火、血、崩塌的天空，一道把天河劈成兩半的劍光——劍光之後，天上裂開了一道縫。',
  },
  {
    id: 'swordtomb', era: '天河斷絕', title: '劍冢', where: '東荒・古戰場遺跡，劍冢碑',
    got: (s) => !!s.flags.sword_stele_read,
    text: '世人說，劍仙一劍斷了天河。立碑的弟子說不是：那一夜天外有手探入天河，他的師父登上東北的孤峰，仰天一劍，斬下它一指——指斷了，河也斷了，那座峰也裂成了兩半。師父的劍折了，人不知所終。弟子把斷劍插在黑石裡，立碑等後來的人。',
  },
  {
    id: 'cleft', era: '天河斷絕', title: '孤峰上的一劍', where: '東荒・斷劍峰的劍痕',
    got: (s) => !!s.flags.sword_scar_read,
    text: '劍痕裡看見的：一個白衣人站在峰頂，背著一把很長的劍。天上壓著黑雲，雲裡有什麼東西在看著他——像一本攤開的書。他斬了下去，雲散了一角，劍斷了，人也不見了。',
  },
  {
    id: 'farewell', era: '天河斷絕', title: '我去問天', where: '西漠・沉沙古城，星門旁的辭城碑',
    got: (s) => !!s.flags.read_stele_farewell,
    text: '接天城的人散盡了。玄微一個人守著空城三年，把那一夜的星圖刻在地宮的穹頂上，在碑上留下「我去問天」，往東走了。',
  },
  {
    id: 'gate', era: '天河斷絕', title: '天門', where: '天機殘頁・雪（北原・不周山）',
    got: (s) => frag(s, 'frag_snow'),
    text: '北原不周山，天柱斷了，斷口上立著一道門。玄微在門前跪了七天七夜。門裡的人說：「天河不是我斷的，也不是我接得上的。」問他是誰，他說：「我是看門的。」',
  },
  // ── 三千年來 ──
  {
    id: 'legend', era: '三千年來', title: '說書人的傳說', where: '東荒・落霞坊市的茶樓',
    got: (s) => heard(s, '一劍斷了天河'),
    text: '茶樓裡的說書人說：三千年前，有位劍仙在古戰場一劍斷天河；此後三千年，再沒有一個人飛升。有人說，上界的門，就是被那一劍斬斷的。',
  },
  {
    id: 'crack', era: '三千年來', title: '天上的縫', where: '東荒・狐仙廟，胡三娘',
    got: (s) => !!s.flags.hu_story_crack,
    text: '胡三娘見過一個人飛升。雷劫劈下來的時候，天上裂開了一道縫——縫後面，什麼都沒有。',
  },
  {
    id: 'register', era: '三千年來', title: '命簿有漏', where: '東荒・青石山的斷碑',
    got: (s) => !!s.flags.stele_read,
    text: '青石山半山腰的斷碑，只認得出幾句：「天道有缺，命簿有漏……命外之人，可問天道。」不知是誰，在什麼時候刻的。',
  },
  // ── 近世 ──
  {
    id: 'hunter', era: '近世', title: '獵戶與白狐', where: '東荒・狐仙廟，胡三娘',
    got: (s) => !!s.flags.hu_story_hunter,
    text: '三百年前，青石鎮還沒有鎮子，只有一個獵戶。他放了一隻白狐一條生路。後來他死了，他的兒子、孫子也死了，那隻白狐一直守著。',
  },
  {
    id: 'tianjian', era: '三千年來', title: '天劍宗的第一招', where: '東荒・斷劍峰，葉孤寒',
    got: (s) => !!s.flags.ye_lineage,
    text: '中州天劍宗的第一招，是祖師照著斷劍峰的劍痕練出來的。練了三千年，沒有人練到過那一劍的一成。',
  },
  // 1.1 中州
  {
    id: 'yuzhi', era: '天河斷絕', title: '指落中州', where: '中州・天劍宗祖師堂，闕老',
    got: (s) => !!s.flags.tj_ancestors_seen,
    text: '劍仙斬下的那一指，落在中州的腹地；落地的地方長出一座山，白得像玉——玉指峰。大衍的開國皇帝，把都城建在了它的山腳下。',
  },
  {
    id: 'tianjian_founding', era: '三千年來', title: '天劍開宗', where: '中州・天劍宗祖師堂，闕老',
    got: (s) => !!s.flags.tj_ancestors_seen,
    text: '劍仙的弟子收了師父的斷劍，在古戰場立了碑，追著那根手指過了大江，在中州開了天劍宗，留下一句：「指在一日，劍不入鞘。」三千年後，宗裡的人把它當成講劍指手訣的門規。',
  },
  {
    id: 'ge_siblings', era: '近世', title: '葛家兄妹', where: '中州・百草谷，葛雲蘅',
    got: (s) => !!s.flags.ge_book_known,
    text: '五十年前，百草谷的葛雲山去了東荒，要煉一種平常人也煉得起、吃了不會死的築基丹。三十年前，他替徒弟孫長春煉丹，丹爐炸了。他的妹妹葛雲蘅，在百草谷等了他五十年。',
  },
  // 1.0 中州
  {
    id: 'stargazer', era: '三千年來', title: '看星的人', where: '天機殘頁・星（中州・舊觀星台）',
    got: (s) => !!s.sys?.frags?.includes('frag_star'),
    text: '玄微從天門回來，到了中州，在大江邊的荒山上壘了一座石台，夜夜看星。看了四十年，他看懂了：天上攤著一本書，每一顆星都是一個人的名字。他把看星的法子教給七個年輕人；他們給那座石台起了一個名字：欽天監。後來他們問他：能不能改？',
  },
  {
    id: 'jianzheng', era: '三千年來', title: '被鑿掉的名字', where: '中州・舊觀星台下的斷碑',
    got: (s) => !!s.flags.gx_stele_read,
    text: '監正率弟子七人，壘石為台，夜觀天象。台成之夜，天降星雨，七日不絕。監正說：「天有書，星其字也。」碑上監正的名字，被人用鑿子鑿掉了。',
  },
  {
    id: 'motto', era: '三千年來', title: '指在一日，劍不入鞘', where: '中州・天劍宗山門的門規碑',
    got: (s) => !!s.flags.tj_motto_read,
    text: '天劍宗九條門規的最後一條，字比前八條都大：「指在一日，劍不入鞘。」碑下的小字註著：指，劍指也。',
  },
  {
    id: 'legend2', era: '三千年來', title: '另一個版本', where: '中州・臨江城的茶樓',
    got: (s) => !!(s.flags.zz_tale_stele || s.flags.zz_tale_banxian),
    text: '臨江城的說書人說：劍仙一劍斷天河，闖下大禍；他的大弟子在東荒的孤峰上逼死了師父，奪了師父的劍道，到中州開了天劍宗。東荒的說書人說的是斷了天河；劍冢碑上，那個弟子自稱「不肖」。',
  },
  {
    id: 'founder', era: '近世', title: '青雲開山', where: '東荒・青雲宗山門的開山碑',
    got: (s) => !!s.flags.sect_stele_read,
    text: '天元二千七百六十三年，青雲子在青雲峰開山。他本是東荒的散修，壯年時到北原，看見斷柱上的天門緊閉，回來說：「天門既閉，不如教人好好活著。」碑的背面另有一行歪歪扭扭的小字：祖師少時家貧，曾偷過狐仙廟的供雞。',
  },
  {
    id: 'chicken', era: '近世', title: '偷雞的祖師', where: '東荒・狐仙廟，胡三娘',
    got: (s) => !!s.flags.hu_story_founder,
    text: '胡三娘說，青雲宗的開山祖師年輕時偷過她的雞。「這事你可別往外說。」',
  },
  {
    id: 'banxian', era: '近世', title: '看了一眼', where: '東荒・落霞坊市，錢半仙',
    got: (s) => !!s.flags.banxian_past,
    text: '五十年前，錢半仙是煉氣九層的修士。他在古戰場秘境的最深處，看了那道劍光一眼——修為就散了，從此只會說書。',
  },
  // ── 不知年代 ──
  {
    id: 'houtu', era: '不知年代', title: '厚土載物', where: '南嶺・水簾洞的石壁',
    got: (s) => !!s.flags.houtu_read,
    text: '瀑布後面的石洞裡，有人刻下一整面石壁，講土怎麼一聲不吭地承住一切。落款只有一個「岩」字。',
  },
];

/** The entries you have, in the book's order, and how many there are in all. */
export function annalsOf(s) {
  return { have: ANNALS.filter((a) => a.got(s)), total: ANNALS.length };
}
