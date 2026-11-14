// 第一章的結局 (0.17): when you cross the great river at 白鶴渡, what became
// of you, and of those whose lives ran alongside yours in 東荒 — told from
// the marks your choices left (flags, favor, who lives), not from a script,
// so a quick crossing reads differently from a slow one. And, once the
// system is whole enough (五級), the next stroke the 命簿 has written for
// each of the named (命簿殘影).

import { FRAGMENT_TOTAL } from '../content/fragments.js';
import { ORIGINS } from '../core/state.js';
import { realmLabel, age } from '../core/cultivation.js';
import { DAYS_PER_YEAR, dayAt } from '../core/calendar.js';
import { FEATS } from './feats.js';

const f = (s, k) => !!s.flags[k];
const npc = (s, id) => s.npcs[id] || {};
const has = (s, id) => (s.player.items[id] || 0) > 0;

/** You, in a line or two. */
export function chapterSelf(s) {
  const p = s.player;
  const years = Math.max(1, Math.round(s.day / DAYS_PER_YEAR));
  const li = Math.round((s.world?.walked || 0) / 1000);
  const kills = Object.values(s.vars.kills || {}).reduce((a, b) => a + b, 0);
  const feats = Object.keys(s.vars.feats || {}).length;
  return {
    line: `${p.name}，${ORIGINS[p.origin]?.name || ''}。${Math.floor(age(s))} 歲，${realmLabel(p)}。`,
    more: `在東荒 ${years} 年，走了 ${li} 里路，打倒 ${kills} 個對手，得了 ${feats} / ${FEATS.length} 個成就。`,
  };
}

/** What became of each of them: [who, how it stands] — those the story was about, and those you came to know. */
export function chapterFates(s) {
  const out = [];
  // 林塵: the one the heavens favour
  {
    const L = npc(s, 'lin_chen');
    const gone = !L.loc;
    const where = gone ? '去了中州' : L.loc === 'qingyun_sect' ? '是青雲宗的親傳弟子' : '還在青石鎮，手上那枚黑戒指，你一直沒看懂';
    let bond = '';
    if (has(s, 'lin_jade')) bond = '他的玉佩在你腰間：遇上麻煩，就去找他。';
    else if (f(s, 'lin_grudge') || L.favor <= -30) bond = '他記得你——那年林家門前，誰笑得最大聲。';
    else if (L.favor >= 30) bond = '你們是朋友。';
    else if (!L.met) bond = '你們沒說過幾句話。';
    out.push(['林塵', `${where}。${bond}`]);
  }
  // 蘇清瑤: the one living it twice
  {
    const S = npc(s, 'su_qingyao');
    let line;
    if (!S.met) line = '一個你沒說過話的白衣女修。後來聽說，她去了中州。';
    else if (f(s, 'su_farewell')) line = '重活一世的人。臨走前她說：「中州見。這一世，我們都要活過血月。」';
    else if (f(s, 'su_rival_end') || f(s, 'su_rival') || f(s, 'su_enemy')) line = '你們在古戰場結了樑子。她說：「中州見。到時候，我們再算。」';
    else if (f(s, 'su_left')) line = '去了中州。她總是知道會發生什麼，只是很少說。';
    else line = '還在落霞坊市的茶樓上，攤著一卷古經。她說話總是留半句。';
    out.push(['蘇清瑤', line]);
  }
  // 松鶴道人: the first who taught you
  {
    const H = npc(s, 'song_he');
    let line;
    if (f(s, 'songhe_zhuji') && H.alive) line = '時隔六十年，築基了。他在清虛觀的老松旁，又種了一棵松。';
    else if (!H.alive) line = has(s, 'book_songhe') || f(s, 'legacy_taken') ? '坐化了。他的手札在你這裡：「想做的事，就去做。想見的人，就去見。」' : '坐化了。清虛觀的老松，一夜之間落光了針葉。';
    else if (f(s, 'songhe_saved')) line = '吃了你給的壽元果，還在等下一次衝關。';
    else line = '還在清虛觀裡。你每次回去，他都要你陪他喝一壺茶。';
    out.push(['松鶴道人', line]);
  }
  // 王二: the friend from before all this
  {
    const W = npc(s, 'wang_er');
    let line;
    if (!W.alive) line = '走了。';
    else if (f(s, 'wanger_married')) line = `娶了翠花${s.day >= 2 * DAYS_PER_YEAR + 60 ? '，有了兒子王小石' : ''}。他說你什麼時候回來，豆花都管夠。`;
    else line = '還在青石鎮的豆花攤上，絮絮叨叨地說著鎮上的事。';
    out.push(['王二', line]);
  }
  // 胡三娘: only if you crossed paths
  if (npc(s, 'hu_sanniang').met) {
    let line;
    if (f(s, 'fox_revenged')) line = '你把她賣給了青雲宗；她拿走了你十年的壽元。算是兩清。';
    else if (f(s, 'fox_betrayed')) line = '你把她賣給了青雲宗。狐仙廟的燈，再也沒亮過。';
    else if (f(s, 'fox_attacked')) line = '你們動過手。狐仙廟的燈，從此只在別人經過時亮。';
    else if (f(s, 'fox_fled')) line = '逃出了東荒。走之前，對你眨了一下眼睛。';
    else if (f(s, 'fox_protected')) line = '你在狐仙廟前替她擋下了青雲宗的弟子。月圓的晚上，廟裡的燈還亮著。';
    else line = '狐仙廟裡修行三百年的狐妖。她的事，還沒有結果。';
    out.push(['胡三娘', line]);
  }
  return out;
}

/** The system, as it stands at the end of the chapter. */
export function chapterSystem(s) {
  const frags = (s.sys.frags || []).length;
  return {
    line: `問道系統 ${s.sys.lv} 級・天機殘頁 ${frags} / ${FRAGMENT_TOTAL}`,
    truth: f(s, 'sys_awakened')
      ? '它想起了自己的名字：玄微。你墜崖那天本該死去，是它讓你活了下來——從那天起，命簿上你那一頁，是空白的。'
      : '它還沒想起自己是誰。',
  };
}

/**
 * (1.2) 命簿全頁 (系統六級): whose line you have changed — the ink on it still wet. Each named person, and
 * what about them is not as the 命簿 first wrote it.
 */
/** (1.3) Came through the night of the blood moon, when 東荒's whole page was to be torn out: their line goes on, where it was not to. */
const throughNight = (s, id) => !!s.flags?.blood_night_done && ['safe', 'fine', 'hurt'].includes(s.vars.night?.fates?.[id]?.fate) && !!s.vars.roster?.[id];
const WET = {
  wang_er: (s) => throughNight(s, 'wang_er'),
  qian_banxian: (s) => throughNight(s, 'qian_banxian'),
  song_he: (s) => f(s, 'songhe_saved'),
  lin_chen: (s) => f(s, 'lin_ruined') || f(s, 'lin_warned') || f(s, 'roster_lin'),
  shen_qingge: (s) => (f(s, 'shen_letter_given') && f(s, 'lin_warned')) || f(s, 'shen_zhuji') || f(s, 'shen_own_path'),
  sun_zg: (s) => f(s, 'sun_to_baicao') || f(s, 'sun_master_done') || throughNight(s, 'sun_zg'),
  su_qingyao: (s) => f(s, 'su_farewell') || f(s, 'su_zz_ally') || f(s, 'su_archive'),
  hu_sanniang: (s) => f(s, 'fox_betrayed'),
  ye_guhan: (s) => s.vars?.duel === 'draw' || s.vars?.duel === 'lin_dead',
  zhao_hu: (s) => f(s, 'zhao_changed') || throughNight(s, 'zhao_hu'),
};

/** Is this person's line one you have changed (命簿全頁, 系統六級)? */
export function fateWet(s, id) {
  return s.sys.lv >= 6 && !!s.npcs[id]?.named && !!WET[id]?.(s);
}

/** How many lines you have changed (for the system page). */
export function wetCount(s) {
  return Object.keys(WET).filter((id) => s.npcs[id]?.met && WET[id](s)).length;
}

/** 命簿殘影 (系統五級): the next stroke the 命簿 has written for each of the named — as it stands now. */
export function fateLine(s, id) {
  if (s.sys.lv < 5) return null;
  const n = s.npcs[id];
  if (!n?.named) return null;
  // (1.3) taken on the night of the blood moon: torn out, not finished
  if (!n.alive) return n.nightTorn ? '命簿：這一頁，被撕掉了。' : '命簿：這一頁，已經寫完了。';
  switch (id) {
    case 'lin_chen':
      // (1.1) after the 生死約戰: as the 命簿 had it, or not
      if (s.vars.duel === 'ye') return '命簿：與葉孤寒，第一戰，負。下一筆：天劍宗的劍池邊，第二戰。';
      if (s.vars.duel === 'draw') return '命簿：與葉孤寒，第一戰——平。這一筆被人改過，墨跡還是濕的。';
      return '命簿：中州，天劍宗山門外，一場生死約戰。';
    case 'shen_qingge':
      // (1.1) the letter: taken over the river in time, its 「三年」 struck out
      if (f(s, 'shen_letter_given') && f(s, 'lin_warned')) return '命簿：沈家敗落之後，一封遲了三年的信。——「三年」兩個字被劃掉了。這一封，沒有遲。';
      // (1.0) the page goes on being written — what she did with hers shows on it
      if (f(s, 'shen_zhuji')) return '命簿：沈家敗落之後，一封遲了三年的信。——這一行底下，有人用自己的筆添了一行：「青雲宗外門，築基。」字寫得很用力。';
      if (f(s, 'shen_own_path')) return '命簿：沈家敗落之後，一封遲了三年的信。——前半句的墨跡淡了：她沒有回沈家。後半句還在。';
      return '命簿：沈家敗落之後，一封遲了三年的信。';
    case 'song_he':
      return f(s, 'songhe_saved') ? '命簿：這一筆被人改過。墨跡還是濕的。' : '命簿：天元三千零一十六年，坐化於清虛觀。';
    case 'wang_er':
      // (1.3) over the river on 上官家's boat, and alive after the night that was to tear his page out
      if (throughNight(s, 'wang_er')) return '命簿：平安終老。臨終前，一直望著門口。——這一行原本在七月十五就該被撕掉。墨跡是濕的。';
      return '命簿：平安終老。臨終前，一直望著門口。';
    case 'sun_zg':
      // (1.1) 百草谷 has written to him: he means to close it himself
      return f(s, 'sun_to_baicao') ? '命簿：回春堂會在血月那年關門。——關門的那隻手，是他自己的。' : '命簿：回春堂會在血月那年關門。';
    case 'su_qingyao':
      // (1.3) through the night of the blood moon: the old line (「歿」) has dried, and gone pale
      if (s.flags.blood_night_done && s.vars.night?.fates?.su_qingyao?.fate === 'fine') return '命簿：這一頁有兩段字跡疊在一起。——舊的那一段，淡得快看不見了。';
      return '命簿：這一頁有兩段字跡疊在一起，看不清哪一段才是真的。';
    case 'hu_sanniang':
      return f(s, 'fox_betrayed') ? '命簿：記仇三百年。' : '命簿：再修行一百年，渡雷劫。';
    case 'ye_guhan':
      // (1.1) the first of the three (whichever it was, the 命簿 is content — unless it did not stop at the 命簿)
      if (s.vars.duel === 'lin_dead') return '命簿：與林塵三戰——後兩戰的字，被血洇開了，認不出來。';
      if (s.vars.duel === 'ye') return '命簿：與林塵三戰，一勝、一負、一平。——「勝」字已經寫上了。';
      if (s.vars.duel === 'draw') return '命簿：與林塵三戰，一勝、一負、一平。——「平」字已經寫上了。';
      return '命簿：與林塵三戰，一勝、一負、一平。';
    case 'qian_banxian':
      return '命簿：他說的書，有一半是真的。';
    // (1.2) 欽天監's 監正: what the book has him do
    case 'wei_changgeng':
      // (1.3) the night come and gone: the stroke fell, or he put the brush down halfway
      if (s.flags.blood_night_done) return s.vars.night?.stoppedAt ? '命簿：天元三千零二十二年七月十五，於玉指峰頂執筆。——「執筆」二字底下：「中途擱筆」。下一筆，還沒有寫。' : '命簿：天元三千零二十二年七月十五，於玉指峰頂執筆。——這一筆，落下去了。下一筆，還沒有寫。';
      return s.day > dayAt(10, 7, 15) ? '命簿：天元三千零二十二年七月十五，於玉指峰頂執筆。——「執筆」二字底下，有一行很小的字：「未竟」。' : '命簿：天元三千零二十二年七月十五，於玉指峰頂執筆。';
    case 'zhao_hu':
      // (1.0) the one who pushes the millstone now: the end of the line is going pale
      return f(s, 'zhao_changed') ? '命簿：橫死街頭，無人收屍。——「無人收屍」四個字的墨淡了，像是快要寫不住了。' : '命簿：橫死街頭，無人收屍。';
    default:
      return null;
  }
}
