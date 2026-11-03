// 上手 (0.14): a line at the top of the screen saying what you could do next
// (a hint, never an order — the world is open), and the first-time pointers
// at the buttons (each shown once on this device).

import { atBottleneck } from '../core/cultivation.js';
import { pools } from '../core/body.js';
import { NODES, mapOf } from './map.js';
import { happenings, tideTonight } from './happenings.js';
import { realmOpen, realmDone, SECRET_REALMS } from './realms.js';
import * as Q from './quests.js';
import * as SECT from './sect.js';

/** The place you know of but have not been to, nearest to where you are (on the map you are on). */
function nearestUnseen(s) {
  const here = NODES[s.player.loc]?.at || [s.world?.x || 0, s.world?.y || 0];
  const map = s.world?.map || 'donghuang';
  let best = null;
  let bd = Infinity;
  for (const [id, n] of Object.entries(NODES)) {
    if (!n.at || !s.nodes[id]?.known || s.nodes[id]?.visited || n.kind === 'peak' || n.kind === 'isle' || n.kind === 'cave' || mapOf(id) !== map) continue;
    const d = Math.hypot(n.at[0] - here[0], n.at[1] - here[1]);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}

/** 南嶺 (0.21): where its stories stand — the well and the 蠱母, 阿山's brother, the falls, 韓三's pack. */
function nanlingGoal(s) {
  const f = s.flags;
  const it = s.player.items;
  if ((s.vars.kills?.gu_mother || 0) > 0) {
    if (!f.gu_nest_burned) return { key: 'nl:nest', text: '萬蠱谷：燒了蠱巢', why: '蠱母死了，巢裡的卵還在。到谷底的蠱巢前，一把火燒乾淨。' };
    if (!f.gu_cleared) return { key: 'nl:elder', text: '回青竹寨見岩伯', why: '蠱母死了，巢也燒了。回寨子告訴岩伯。' };
    if (!f.bizhang_gu) return { key: 'nl:luo', text: '去找阿蘿', why: '岩伯說，阿蘿有東西要給你。' };
  } else if (f.luo_told) {
    return { key: 'nl:mother', text: '萬蠱谷：除蠱母', why: '蠱母在萬蠱谷深處。瘴氣用避瘴丹擋；蠱蟲和蠱母都屬金，怕火。牠很強——煉氣後期，帶足丹藥再去。' };
  } else if (f.gu_task || f.well_seen) {
    return { key: 'nl:ask', text: '問阿蘿：井裡的蟲', why: '百藥鋪的阿蘿懂蠱。去問問她，寨井裡那些死蟲是什麼。' };
  }
  if (f.a_shui_lost && !f.a_shui_found) return { key: 'nl:shui', text: '瘴林：找阿水', why: '阿山的弟弟阿水，困在瘴林南邊的白絲洞。進瘴林前，記得帶避瘴丹。' };
  if (f.a_shui_found && !f.a_shui_saved) return { key: 'nl:shan', text: '回寨子見阿山', why: '阿水救回來了。去阿山家看看。' };
  if (f.falls_hint && !f.falls_cave_found) return { key: 'nl:falls', text: '碧潭：瀑布後面', why: '有人看見瀑布後面有光。到碧潭的瀑布前看看。' };
  if (f.falls_cave_found && !f.houtu_read) return { key: 'nl:cave', text: '水簾洞：讀石壁', why: '水簾洞的石壁上刻滿了字。' };
  if (it.han_pack > 0) return { key: 'nl:pack', text: '嶺口：把包袱還給韓三', why: '韓三在嶺口的草棚裡。' };
  if (f.zhai_met && !f.gu_task && !f.well_seen) return { key: 'nl:well', text: '青竹寨：寨井發苦', why: '寨子的井水苦了。到井邊看看，或找寨老岩伯問問。' };
  return null;
}

/** The five steles of 沉沙古城 (content/events/ximo.js). */
const STELES = ['stele_city', 'stele_ferry', 'stele_star', 'stele_break', 'stele_farewell'];

/** 西漠 (0.22): where its stories stand — 禿鷲寨 for 康駝頭, 了空's master in 沙陀寺, the steles of the old city and the gate under its tower. */
function ximoGoal(s) {
  const f = s.flags;
  const kills = s.vars.kills || {};
  if (f.kang_asked && !f.vulture_done) return { key: 'xm:vulture', text: '黑戈壁：禿鷲寨', why: '康駝頭請你去禿鷲寨，跟禿鷲討個說法。禿鷲是築基中期的刀客；寨子在黑戈壁北邊的土堡裡，路上的沙盜會先攔你。' };
  if (f.vulture_done && f.kang_asked && !f.kang_paid) return { key: 'xm:kang', text: '回月泉見康駝頭', why: '禿鷲寨的事了了。回月泉告訴康駝頭。' };
  if ((kills.kuchan || 0) > 0 && !f.shatuo_rest) return { key: 'xm:hall', text: '沙陀寺：再進一次大殿', why: '枯禪倒下了。回大殿看看。' };
  if (f.shatuo_task && !(kills.kuchan > 0)) return { key: 'xm:kuchan', text: '沙陀寺：夜裡的大殿', why: '了空請你替他看一眼師父。沙陀寺的乾屍夜裡才走動，大殿前坐著的就是枯禪。陰屍怕火、怕符，刀劍傷它們不深。' };
  if (f.shatuo_rest && !f.liaokong_told) return { key: 'xm:liao', text: '回月泉見了空', why: '沙陀寺的僧人都安息了。告訴老胡楊底下的了空。' };
  if (f.shatuo_key && !f.dari_read) return { key: 'xm:caves', text: '沙陀寺：藏經窟', why: '枯禪留下一把銅鑰匙，開的是千佛窟最裡頭的藏經窟。' };
  const read = STELES.filter((id) => f[`read_${id}`]).length;
  if (f.palace_open && !f.palace_seen) return { key: 'xm:palace', text: '沉沙古城：地宮', why: '星門開了。走下台階，去地宮裡看看。' };
  if (f.steles_read && !f.palace_open) return { key: 'xm:gate', text: '沉沙古城：星門', why: '五塊碑都讀完了。觀星台背後的星門，該開了——守門的石翁仲很強，準備好再去。' };
  if (read > 0) return { key: 'xm:steles', text: `沉沙古城：讀碑（${read}/5）`, why: '古城裡還有沒讀過的石碑：南門一塊，西邊的舊碼頭一塊，觀星台附近三塊。' };
  if (s.nodes.lost_city?.visited && !read) return { key: 'xm:read', text: '沉沙古城：讀碑', why: '古城裡立著幾塊石碑，刻滿了沒人認得的字。走近看看。' };
  if (s.nodes.yuequan?.visited && !f.kang_asked && !f.vulture_done) return { key: 'xm:caravan', text: '月泉：康家駝隊', why: '月泉東邊紮著一支駝隊，駝隊的頭康駝頭好像有事發愁。' };
  return null;
}

/** 北原 (0.23): where its stories stand — the mine for 霍堡主, the 冰麟 on the knot of the veins, what sleeps under 北冥, 阿蘭's father, 顧遠's iron. */
function beiyuanGoal(s) {
  const f = s.flags;
  const it = s.player.items;
  const kills = s.vars.kills || {};
  const n = s.nodes;
  // the mine
  if (kills.silk_queen > 0 && !f.cocoons_cut) return { key: 'by:cocoons', text: '寒鐵礦：深巷盡頭', why: '冰蠶母死了。巷道盡頭的石頂上，還吊著三個白色的繭。' };
  if (kills.silk_queen > 0 && !f.mine_cleared) return { key: 'by:huo', text: '回寒鐵堡見霍堡主', why: '深巷裡的東西死了。回堡主府告訴霍堡主。' };
  if (f.mine_deep_open && !(kills.silk_queen > 0)) return { key: 'by:queen', text: '寒鐵礦：深巷裡的冰蠶母', why: '冰蠶母在深巷盡頭：噴霜、在你腳下鋪冰、吐絲把你的腳凍在地上（凍住了就閃避掙脫），還會叫冰蠶出來。牠屬水，土的招式剋牠。' };
  if (f.mine_asked && !f.mine_deep_open) return { key: 'by:deep', text: '寒鐵礦：深巷', why: '霍堡主請你下深巷看看。礦口在堡西門外；最深的那條巷道，口上釘著木板。夜裡去，聽得見歌聲。' };
  // the rift
  if ((f.qilin_fed || kills.ice_qilin > 0) && !f.hanyi_taught) return { key: 'by:hanyi', text: '回石洞見寒衣', why: '靈脈結露出來了。去崖腳下的石洞告訴寒衣。' };
  if (f.hanyi_met && !f.node_open) {
    const lotus = it.xuelian || 0;
    if (lotus >= 3) return { key: 'by:feed', text: '靈脈裂谷：把雪蓮給冰麟', why: '三朵雪蓮夠了。走近靈脈結，冰麟會過來看你。' };
    return { key: 'by:lotus', text: `採雪蓮（${lotus}/3）`, why: '寒衣說，冰麟喜歡雪蓮，三朵。天鏡峰頂的冰鏡縫裡最多（只有會飛的上得去）；雪山、斷雲崖上偶爾也採得到。或者，拔劍——牠是北原最強的妖獸。' };
  }
  // 北冥
  if (f.kun_seen && !f.bingsou_told) return { key: 'by:bingsou', text: '北冥：回漁屋見冰叟', why: '你看見了冰底下的那條魚。告訴冰叟。' };
  if (f.bingsou_met && !f.kun_seen) return { key: 'by:kun', text: '北冥：冰心', why: '冰叟說北冥底下睡著一條魚。到北冥正中的冰心看看——夜裡去，或者放出神識往下探（築基）。冰面上顏色發黑的地方是薄冰；夜裡，冰上有雪魄。' };
  // 阿蘭's father
  if (it.alan_knife > 0 && !f.alan_closure) return { key: 'by:alan', text: '白狼部：把獵刀還給阿蘭', why: '那把纏紅繩的獵刀，是阿蘭阿爹的。' };
  if (f.alan_asked && !f.alan_closure) return { key: 'by:remains', text: '冰原東邊：找阿蘭的阿爹', why: '阿蘭的阿爹三年前往冰原東邊追白狼王，再也沒回來。白狼王就在那一帶，小牛那麼大，會叫狼群——小心。' };
  // 顧遠's iron
  if (f.mine_cleared && f.guyuan_met && !f.guyuan_done) return { key: 'by:guyuan', text: '寒鐵堡：顧遠', why: '礦開了。酒館裡的顧遠，可以買鐵回青雲宗了。' };
  // where they start
  if (n.hantie_fort?.visited && !f.mine_asked && !f.mine_cleared) return { key: 'by:fort', text: '寒鐵堡：堡主府', why: '寒鐵堡的礦停了一半，堡主霍堡主好像有事發愁。' };
  if (n.lingmai_rift?.visited && !f.hanyi_met) return { key: 'by:cave', text: '靈脈裂谷：石洞', why: '裂谷崖腳下有一個石洞，洞口掛著獸皮，透出火光。' };
  if (n.bailang_camp?.visited && !f.alan_asked && !f.alan_closure) return { key: 'by:camp', text: '白狼部：阿蘭', why: '營火邊削箭桿的姑娘，身邊立著一張比她還高的弓。' };
  if (n.beiming?.visited && !f.bingsou_met) return { key: 'by:hut', text: '北冥：冰叟', why: '北冥岸邊的冰洞旁，坐著一個釣魚的老人。' };
  return null;
}

/**
 * What you could do next: { key, text, why } (or null while the opening
 * still leads you by the hand). The first that applies, from what cannot
 * wait to what can.
 */
export function nextGoal(s) {
  const p = s.player;
  if (!s.flags.opening_done || s.dead) return null;
  if (s.secl) return null;
  // over the hills (0.21): 東荒's doings are a long way off
  const away = (s.world?.map || 'donghuang') !== 'donghuang';
  // a step you can take now
  if (atBottleneck(s)) {
    return p.realm === 0
      ? { key: 'qi', text: '引氣入體', why: '修為夠了。打開右上的「修煉」，按「引氣入體」，就是煉氣一層的修士了。' }
      : { key: 'bt', text: '衝擊瓶頸', why: '修為已經圓滿。到「修煉」頁衝擊瓶頸；築基可以服築基丹提高成功率，失敗會受傷、掉修為。' };
  }
  if (p.realm === 0) return { key: 'secl0', text: '閉關，攢夠修為', why: '在清虛觀這種靈氣好的地方按「坐」→「閉關」。閉關要真實時間（遊戲一天約三秒），關掉遊戲也會繼續。修為攢夠就能引氣入體。' };
  // a wound, or low blood
  if (p.injury > 0) return { key: 'hurt', text: '養傷', why: '受了傷，氣血上限會變低。「坐」下歇息、閉關，或吃療傷的丹藥。' };
  const V = pools(s);
  if (V.hp < V.cap * 0.35) return { key: 'hp', text: '歇一歇，回氣血', why: '氣血不多了。按「坐」歇息，每個時辰回兩成；或吃回春丹、止血草。' };
  // something happening now, or soon
  const tide = tideTonight(s);
  for (const h of happenings(s, 6)) {
    const now = h.from <= s.day;
    if (h.name === '靈潮' && now) return { key: 'tide', text: '靈潮：快閉關', why: '靈潮這三天修煉快五成。找個靈氣好的地方閉關。' };
    // (the rest happen in 東荒)
    if (away) continue;
    if (h.name.endsWith('開啟') && now) {
      const id = Object.keys(SECRET_REALMS).find((k) => `${SECRET_REALMS[k].name}開啟` === h.name);
      if (id && realmOpen(s, id) !== null && !realmDone(s, id)) return { key: `realm:${id}`, text: h.name, why: `${h.name}，入口在${h.where}。每次開啟只能闖一回，每一層都能見好就收。` };
    }
    if (h.name === '獸潮' && (tide !== null || h.from - s.day <= 1) && s.vars.tideFought !== tide) return { key: 'beasts', text: '獸潮將至：守青石鎮', why: '黑風林的狼群要衝下山了。入夜時人在青石鎮，可以和獵戶一起守鎮口。' };
    if (h.name === '異寶出世') return { key: `omen:${h.spot}`, text: `異寶出世：${h.where}`, why: `寶光落在${h.where}，只亮五天。已經有散修守在那裡了。` };
    if (h.name === '青雲宗開山收徒' && now && !s.flags.sect_member && !s.flags.recruit_declined) return { key: 'recruit', text: '開山收徒：去青雲宗', why: '十年一回。到青雲宗山門前測靈根，就能入門。也可以繼續做散修。' };
    if (h.name === '青雲宗大比' && now && s.flags.sect_member) return { key: 'tourney', text: '宗門大比：到任務堂', why: '每年六月初一到初十，在任務堂前開擂。連勝三場就是魁首。' };
  }
  // where the stories of the land you are in stand
  if (away) {
    const g = (s.world.map === 'ximo' ? ximoGoal : s.world.map === 'beiyuan' ? beiyuanGoal : nanlingGoal)(s);
    if (g) return g;
  }
  // the work you took
  const taken = Q.takenOf(s).map((q) => Q.progress(s, q)).filter(Boolean);
  const done = taken.find((w) => w.done);
  if (done) return { key: `handin:${done.key}`, text: `交差：${done.title}`, why: `${Q.BOARDS[done.board].name}的差事做完了，回榜前交差。` };
  if (s.flags.sect_member) {
    const next = SECT.nextRank(s);
    if (next && !next.why) return { key: 'promote', text: `晉升${next.name}`, why: '貢獻與修為都夠了。到青雲宗的任務堂晉升。' };
  }
  if (taken.length) {
    const w = taken[0];
    return { key: `work:${w.key}`, text: `差事：${w.title}（${w.have}/${w.need}）`, why: Q.askOf(w) };
  }
  // 築基: the chapter's end is across the river
  if (p.realm >= 2 && !s.flags.chapter1_done && !away) return { key: 'ferry', text: '白鶴渡：渡江', why: '築基了，白鶴渡的老船夫肯載你過江了——那是第一章的終點。走之前，想見的人先見一見；渡過江，還可以回到東荒繼續走。' };
  // (0.22) 老秦 has waited forty years for the beacon at 西風口 to answer his
  if (s.flags.laoqin_promise && !s.flags.west_beacon_lit && !away) return { key: 'xm:beacon', text: '西風口：點烽燧', why: '落日關的老秦，四十年沒等到東邊的烽燧亮。到西風口的烽燧下，等天黑了，點一把火。' };
  // the cave you found, not yet made your own
  if (s.flags.cave_found && !s.flags.home_claimed && !away) return { key: 'home', text: '收拾山腹洞府', why: '青石山腹那處洞府，收拾一下就是你的了：能閉關、煉丹、畫符，還能布聚靈陣，讓靈氣更濃。走到石縫前查看。' };
  // somewhere you have heard of
  const go = nearestUnseen(s);
  if (go) return { key: `go:${go}`, text: `去看看：${NODES[go].name}`, why: `聽說過${NODES[go].name}，還沒去過。打開地圖，點它，選「走過去」。` };
  return { key: 'free', text: '閉關，或四處走走', why: '找個靈氣濃的地方閉關（修煉頁看得到此地的靈氣），或去還沒探索完的地方走走，留意傳聞和「大事」。' };
}

// ── first-time pointers ──

/** Each pointer: where it points, what it says, and when it applies. view: what is on the screen. */
export const COACH = [
  { id: 'act', at: 'act', text: '點這顆大鈕（或直接點那個人、那樣東西）', when: (s, v) => v.act },
  { id: 'fight', at: 'strike', text: '有東西靠近了！大鈕普攻，圍著的是招式，綠色閃避', when: (s, v) => v.cbtReady },
  { id: 'sets', at: 'strike', text: '右上寫著「壹」的小鈕：換另一組招式（鍵盤 Tab）。招式在「修煉 → 技能」配', when: (s, v) => v.cbtReady && v.sets },
  { id: 'sit', at: 'sit', text: '「坐」：歇息、四處搜尋、閉關', when: (s, v) => s.flags.opening_done && (s.world?.walked || 0) > 300 && !v.cbtReady },
  // (under the minimap: not while a fight's buttons are up — they reach that high)
  { id: 'menu', at: 'dock', text: '修為滿了：打開「修煉」突破', when: (s, v) => atBottleneck(s) && !v.cbtReady },
  { id: 'map', at: 'map', text: '點小地圖看大地圖，點一個地方就能走過去', when: (s, v) => Object.values(s.nodes).filter((n) => n.visited).length >= 2 && !v.cbtReady },
  { id: 'arts', at: 'arts', text: '「術」：會的法術和能燒的符', when: (s, v) => v.arts },
  { id: 'fly', at: 'fly', text: '「飛」：起飛；飛著的時候點地面就飛過去', when: (s, v) => v.fly },
];

/** The first pointer not yet seen that applies now (or null). seen: ids already shown. */
export function coachFor(s, view, seen) {
  if (!s || s.pending || s.secl || s.dead || view.sheet) return null;
  for (const c of COACH) if (!seen[c.id] && c.when(s, view)) return c;
  return null;
}
