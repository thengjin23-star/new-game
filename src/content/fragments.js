// 天機殘頁: pieces of the system's lost memory.

export const FRAGMENTS = {
  frag_well: {
    title: '殘頁・井',
    text: '……問道者，問的不是道，是天。\n天若無答，則問命簿。\n命簿若無名——\n（字跡在此斷開）',
  },
  frag_ruins: {
    title: '殘頁・劍',
    text: '……第七次推演失敗。\n天河已斷，門已閉，命簿腐朽，眾生皆在書中而不自知。\n命簿之外，仍需一人。\n若有後來者得見此頁——\n（此後是一片被劍氣削去的空白）',
  },
  frag_river: {
    title: '殘頁・江',
    text: '……我把最後的神識，散進天地。\n若有一人，不在命簿之上，又恰好將死——\n便讓他活。\n他會恨我嗎？\n（字跡在這裡被江水洇開了，又像是寫字的人，停了很久）',
  },
  // 西漠 (0.22): under the 觀星台 of 接天城, where it was young
  frag_sand: {
    title: '殘頁・沙',
    text: '……接天城的最後一個星官，是我。\n十九歲那年七月初七，天河斷了。不是自己斷的——我看見了：天外伸進來一隻手，把它掐斷了。\n西海一夜就乾了。城裡的人說，天不要我們了。\n我不信。我把那一夜的星圖刻在地宮的穹頂上，然後往東走，去問天。\n（頁邊畫著一條斷成兩截的河，河邊一顆很小的星）',
  },
  // 北原 (0.23): under the threshold of the gate on the broken pillar of 不周山
  frag_snow: {
    title: '殘頁・雪',
    text: '……往東走了三年，往北又走了九年，走到了天柱底下。\n天柱是斷的。斷口上立著一道門，門裡是天，門外也是天。\n我在門前跪了七天七夜，敲了七天七夜。第八天，門裡有人說話：\n「回去吧。天河不是我斷的，也不是我接得上的。」\n我問他是誰。他說：「我是看門的。」\n（頁角凍著一片雪，一直沒有化）',
  },
  // 中州 (1.0): in a crack of the old observatory north of 臨江城, under the stars
  frag_star: {
    title: '殘頁・星',
    text: '……從天門回來，我到了中州。\n中州的天比別處低，低得像一塊壓下來的石板。我在大江邊的荒山上壘了一座石台，夜夜看星。\n看了四十年，我看懂了：星不是星，是字。天上攤著一本書，每一顆星，都是一個人的名字。\n我把看星的法子，教給了山下的七個年輕人。他們叫我先生。後來，他們給這座石台起了一個名字：欽天監。\n有一天，他們問我：既然看得見，能不能改？\n我說不能。\n他們不信。\n（這一頁的下半截，被人用刀，整整齊齊地裁掉了）',
  },
  // (1.3) on the night of the blood moon, at 子時, out of the book itself, wherever you are
  frag_moon: {
    title: '殘頁・月',
    text: '……第一次看見那支筆落下來，是在一個七月十五。\n月亮紅了。我以為天河又斷了一次。不是。是他們——山下那七個年輕人裡剩下的幾個——拿著那根手指，在天上那本書裡，劃掉了一個村子。\n那個村子的人第二天照常起床，挑水，下田。只是從那一天起，天上再也沒有他們的字。過了一年，那裡只剩下一片荒草。\n我去問他們，為什麼。\n他們說：先生，墨不夠了。要寫新的，就得劃掉舊的。\n（頁邊有一圈紅印，像月亮，又像是有人用沾了墨的拇指，在這裡按了一下）',
  },
};

export const FRAGMENT_TOTAL = 9;

/**
 * (1.2) What a page reads now: 殘頁・星's lower half, cut away, was carved on the founder's coffin in the
 * 皇陵's 地宮 (content/events/tianyan.js hlg_coffin) — once read there, the page is whole.
 */
export const FRAGMENT_REST = {
  frag_star: {
    flag: 'frag_star_whole',
    cut: '（這一頁的下半截，被人用刀，整整齊齊地裁掉了）',
    text: '他們中間最小的那一個，半夜去了東邊那座白色的山。山裡在滲墨，紅的。他拿筆蘸了，在天上那本書裡，給自己寫了一行字。\n第二天，他當了皇帝。\n我走的那天，他在山下送我。他說：先生，你說不能改，可我改了。\n我說：你沒有改。你只是多寫了一行。這本書上的每一個字，都是那隻手寫的；你寫的這一行，它也會照著抄下去，一遍一遍，抄到爛。\n他不懂。\n我也不懂，我為什麼要教他們看星星。\n（下半截是從大衍皇陵的梓宮上拓下來的）',
  },
};

/** A page as it reads for you (whole, if you have found what was cut from it). */
export function fragmentText(s, id) {
  const f = FRAGMENTS[id];
  const rest = FRAGMENT_REST[id];
  if (!f || !rest || !s.flags?.[rest.flag]) return f?.text || '';
  return f.text.replace(rest.cut, rest.text);
}
