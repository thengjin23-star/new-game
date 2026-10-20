// 圖鑑 (0.14): what you have met. The beasts and people who fought you,
// each with a few lines on where it is found and how it fights — written
// once you have met it, a 「？」 until then. (Items: their own words in
// content/items.js.)

/** For each kind of foe (content/foes.js): where, and what to know. */
export const BEAST_NOTES = {
  wolf: { where: '青石山', note: '成群出沒，輪流上、繞著你等空檔；夜裡更凶。倒過一半，剩下的就散了。狼皮能做狼皮襖。' },
  demon_wolf: { where: '東荒野地、青石山深處', note: '一階妖獸，比灰狼大一圈。蓄勢之後一撲很遠，看見地上的紅色就閃。身上有妖獸內丹。' },
  wolf_king: { where: '狼王岩', note: '狼群的頭。血少了會一撲接著一撲，還會叫狼群來；最後發狂。' },
  snake: { where: '青石山的草叢', note: '埋伏在草裡，走近了先咬，帶毒。用神識一掃，就看得見牠伏在哪裡。蛇膽可入藥。' },
  python: { where: '靈溪谷', note: '盤據山谷的大蟒。會纏人、吐毒霧，地上的毒池別踩。鱗片能做蟒鱗甲。' },
  bear: { where: '青石山的林子裡', note: '皮厚力大，一掌拍下來很重。慢，繞著打。' },
  bandit: { where: '黑風林', note: '黑風寨的山賊，會先說話。和寨子交好就讓你過，結了仇見面就打。' },
  bandit_chief: { where: '黑風林', note: '黑風寨的當家，獨眼龍。打倒他，寨子的名聲會大跌，坊市卻會記你一功。' },
  masked: { where: '官道上', note: '劫鏢的蒙面人，下手狠，打不過就跑。' },
  thug: { where: '青石鎮', note: '鎮上的地痞，欺軟怕硬。' },
  cultivator: { where: '東荒野地、秘境、異寶落下的地方', note: '劫修或同行的散修。會劍氣、會護體，打不過時會認輸，也會逃。' },
  enforcer: { where: '青雲宗', note: '青雲宗的執法弟子，切磋點到為止。' },
  blood_robe: { where: '？', note: '一身血袍的魔修，出手帶血氣，會吸人氣血。' },
  swordsman: { where: '青石鎮一帶', note: '習武之人，刀劍功夫紮實，沒有靈力。' },
  ghost: { where: '古戰場遺跡', note: '徘徊的殘魂，刀劍傷它不深，火、符、照妖鏡最有用。驅邪符讓它不敢近身。' },
  skeleton: { where: '古戰場秘境的最深處', note: '一丈高的骷髏將軍，手握斷戟。橫掃一圈、腳下爆裂，血少了會發狂。' },
  fox_spirit: { where: '狐仙廟（夜裡）', note: '修行三百年的狐妖。狐火會追人，還會分身、瞬移。她的命運，看你怎麼選。' },
  fire_tiger: { where: '古戰場北緣', note: '野外的首領。火息、撲擊、地上的火，穿赤炎虎皮袍或抗火的東西去。屬火：水的招式剋牠，金的招式被牠剋。' },
  shanxiao: { where: '古戰場西邊的亂石地', note: '一對一對出沒，遠了丟石頭，近了跺地、伸長手臂抓。屬土：木的招式（藤縛）剋牠。' },
  mumei: { where: '黑風林深處（夜裡）', note: '枯樹成精。藤蔓會從你腳下鑽出來纏住你——閃避就能掙脫；地上的孢子別踩。刀劍傷它不深，屬木：金的法術最管用。' },
  xuan_turtle: { where: '鏡湖東岸', note: '湖裡的老玄龜，野外的首領。噴水、漩渦拖住腳步、一圈浪把人推開。屬水：土的招式剋牠，火的招式被牠剋。龜甲能做玄甲衣。' },
  // 南嶺 (0.21)
  spider: { where: '南嶺・瘴林', note: '三隻一群，咬人帶毒，會從樹上撲下來，還會往你腳下甩一張網——被網住了就閃避掙開。屬木：金的招式剋牠。蛛絲能織成軟甲。' },
  toad: { where: '南嶺・毒沼', note: '蹲在泥水邊不大動，舌頭卻伸得比狼撲得還遠，還會往你腳下吐毒漿（毒池別踩）。屬水：土的招式剋牠。蟾酥是避瘴丹的藥引。' },
  toad_king: { where: '南嶺・毒沼深處', note: '守著沼心蓮的老蟾，野外的首領。血少了會四處噴毒、連跳兩下，一聲蛙鳴把人震開。屬水：土剋牠，火被牠剋。' },
  swarm: { where: '南嶺・萬蠱谷', note: '一團一團的蠱蟲，又快又難打中，叮一口就中毒。屬金：火的招式剋牠——寨子裡的人也說，蠱怕火。' },
  gu_mother: { where: '南嶺・萬蠱谷深處', note: '萬蠱谷的蠱母，一條丈長的百足蟲，野外的首領。毒鉗、衝撞、往前噴毒；血少了會叫出蠱蟲、鑽進地底從你背後冒出來。屬金：火的招式剋牠。帶解毒丹或穿抗毒的甲去。' },
};

/** Who is not a foe of yours (幫手) or never alone (分身): not in the book. */
export const NOT_IN_BOOK = new Set(['escort', 'fox_phantom']);
