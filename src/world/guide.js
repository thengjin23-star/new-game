// 上手 (0.14): a line at the top of the screen saying what you could do next
// (a hint, never an order — the world is open), and the first-time pointers
// at the buttons (each shown once on this device).

import { atBottleneck } from '../core/cultivation.js';
import { pools } from '../core/body.js';
import { NODES } from './map.js';
import { happenings, tideTonight } from './happenings.js';
import { realmOpen, realmDone, SECRET_REALMS } from './realms.js';
import * as Q from './quests.js';
import * as SECT from './sect.js';

/** The place you know of but have not been to, nearest to where you are. */
function nearestUnseen(s) {
  const here = NODES[s.player.loc]?.at || [s.world?.x || 0, s.world?.y || 0];
  let best = null;
  let bd = Infinity;
  for (const [id, n] of Object.entries(NODES)) {
    if (!n.at || !s.nodes[id]?.known || s.nodes[id]?.visited || n.kind === 'peak' || n.kind === 'isle' || id === 'hidden_cave') continue;
    const d = Math.hypot(n.at[0] - here[0], n.at[1] - here[1]);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
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
    if (h.name.endsWith('開啟') && now) {
      const id = Object.keys(SECRET_REALMS).find((k) => `${SECRET_REALMS[k].name}開啟` === h.name);
      if (id && realmOpen(s, id) !== null && !realmDone(s, id)) return { key: `realm:${id}`, text: h.name, why: `${h.name}，入口在${h.where}。每次開啟只能闖一回，每一層都能見好就收。` };
    }
    if (h.name === '獸潮' && (tide !== null || h.from - s.day <= 1) && s.vars.tideFought !== tide) return { key: 'beasts', text: '獸潮將至：守青石鎮', why: '黑風林的狼群要衝下山了。入夜時人在青石鎮，可以和獵戶一起守鎮口。' };
    if (h.name === '異寶出世') return { key: `omen:${h.spot}`, text: `異寶出世：${h.where}`, why: `寶光落在${h.where}，只亮五天。已經有散修守在那裡了。` };
    if (h.name === '青雲宗開山收徒' && now && !s.flags.sect_member && !s.flags.recruit_declined) return { key: 'recruit', text: '開山收徒：去青雲宗', why: '十年一回。到青雲宗山門前測靈根，就能入門。也可以繼續做散修。' };
    if (h.name === '青雲宗大比' && now && s.flags.sect_member) return { key: 'tourney', text: '宗門大比：到任務堂', why: '每年六月初一到初十，在任務堂前開擂。連勝三場就是魁首。' };
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
  // somewhere you have heard of
  const go = nearestUnseen(s);
  if (go) return { key: `go:${go}`, text: `去看看：${NODES[go].name}`, why: `聽說過${NODES[go].name}，還沒去過。打開地圖，點它，選「走過去」。` };
  return { key: 'free', text: '閉關，或四處走走', why: '找個靈氣濃的地方閉關（修煉頁看得到此地的靈氣），或去還沒探索完的地方走走，留意傳聞和「大事」。' };
}

// ── first-time pointers ──

/** Each pointer: where it points, what it says, and when it applies. view: what is on the screen. */
export const COACH = [
  { id: 'act', at: 'act', text: '點這顆大鈕（或直接點那個人、那樣東西）', when: (s, v) => v.act },
  { id: 'fight', at: 'strike', text: '有東西靠近了！大鈕普攻，圍著的三顆是招式，綠色是閃避', when: (s, v) => v.cbtReady },
  { id: 'sit', at: 'sit', text: '「坐」：歇息、四處搜尋、閉關', when: (s, v) => s.flags.opening_done && (s.world?.walked || 0) > 300 && !v.cbtReady },
  { id: 'menu', at: 'dock', text: '修為滿了：打開「修煉」突破', when: (s) => atBottleneck(s) },
  { id: 'map', at: 'map', text: '點小地圖看大地圖，點一個地方就能走過去', when: (s) => Object.values(s.nodes).filter((n) => n.visited).length >= 2 },
  { id: 'arts', at: 'arts', text: '「術」：會的法術和能燒的符', when: (s, v) => v.arts },
  { id: 'fly', at: 'fly', text: '「飛」：起飛；飛著的時候點地面就飛過去', when: (s, v) => v.fly },
];

/** The first pointer not yet seen that applies now (or null). seen: ids already shown. */
export function coachFor(s, view, seen) {
  if (!s || s.pending || s.secl || s.dead || view.sheet) return null;
  for (const c of COACH) if (!seen[c.id] && c.when(s, view)) return c;
  return null;
}
