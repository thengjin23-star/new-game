// 成就 (0.14): marks of a life — the first breath of 靈氣, the first flight,
// a realm cleared, the night the town held. Checked now and then; each is
// kept with the day it was earned (s.vars.feats), and said when it comes.

import { FOES } from '../content/foes.js';
import { NODES } from './map.js';
import { rankOf } from './sect.js';

const BOSSES = Object.entries(FOES).filter(([, f]) => f.boss).map(([k]) => k);
const kills = (s) => Object.values(s.vars.kills || {}).reduce((a, b) => a + b, 0);
const visited = (s) => Object.entries(s.nodes || {}).filter(([id, n]) => n.visited && NODES[id]).length;
const ALL_PLACES = Object.keys(NODES).filter((id) => NODES[id].at && id !== 'hidden_cave' && NODES[id].kind !== 'river');

/** The marks: name, what it took, and the test. */
export const FEATS = [
  { id: 'qi', name: '引氣入體', desc: '成為煉氣修士。', test: (s) => s.player.realm >= 1 },
  { id: 'lianqi9', name: '煉氣圓滿', desc: '修到煉氣九層。', test: (s) => s.player.realm >= 2 || (s.player.realm === 1 && s.player.stage >= 8) },
  { id: 'zhuji', name: '築基', desc: '築基成功。', test: (s) => s.player.realm >= 2 },
  { id: 'first_blood', name: '初試身手', desc: '第一次打倒對手。', test: (s) => kills(s) >= 1 },
  { id: 'hundred', name: '百戰', desc: '打倒一百個對手。', test: (s) => kills(s) >= 100 },
  { id: 'boss', name: '斬首', desc: '打倒一個首領。', test: (s) => BOSSES.some((k) => s.vars.kills?.[k] > 0) },
  { id: 'tiger', name: '降虎', desc: '打倒古戰場北緣的赤炎妖虎。', test: (s) => s.vars.kills?.fire_tiger > 0 },
  { id: 'places', name: '足跡', desc: '去過十個地方。', test: (s) => visited(s) >= 10 },
  { id: 'all_places', name: '踏遍東荒', desc: '東荒的每個地方都去過。', test: (s) => ALL_PLACES.every((id) => s.nodes[id]?.visited) },
  { id: 'walk', name: '雲遊', desc: '走滿一百里路。', test: (s) => (s.world?.walked || 0) >= 100000 },
  { id: 'fly', name: '御風而行', desc: '第一次飛上天。', test: (s) => Object.keys(s.vars.flownBy || {}).length > 0 },
  { id: 'sword', name: '御劍', desc: '御劍飛行。', test: (s) => !!s.vars.flownBy?.sword },
  { id: 'tayun', name: '踏雲', desc: '在孤鶴峰悟得踏雲步。', test: (s) => (s.player.arts || []).includes('tayun') },
  { id: 'sect', name: '入門', desc: '成為青雲宗弟子。', test: (s) => !!s.flags.sect_member },
  { id: 'true_disciple', name: '真傳', desc: '成為青雲宗的真傳弟子。', test: (s) => !!s.flags.sect_member && rankOf(s) >= 3 },
  { id: 'champion', name: '魁首', desc: '奪得宗門大比魁首。', test: (s) => !!s.flags.tourney_champion },
  { id: 'realm', name: '闖秘境', desc: '闖到秘境最深處，打倒守護者。', test: (s) => Object.keys(s.vars.realmCleared || {}).length > 0 },
  { id: 'tide', name: '守鎮', desc: '在獸潮之夜守住青石鎮。', test: (s) => !!s.flags.tide_held },
  { id: 'omen', name: '異寶', desc: '搶到一件從天而降的異寶。', test: (s) => !!s.flags.omen_won },
  { id: 'rich', name: '小有積蓄', desc: '身上帶著一千靈石。', test: (s) => s.player.ls >= 1000 },
  { id: 'secl', name: '十年寒暑', desc: '閉關加起來滿十年。', test: (s) => (s.vars.seclDays || 0) >= 3600 },
  { id: 'friends', name: '廣結善緣', desc: '結識十個人。', test: (s) => Object.values(s.npcs || {}).filter((n) => n.met).length >= 10 },
  { id: 'luck', name: '看破', desc: '看得出誰是氣運之子（問道系統三級）。', test: (s) => s.sys.lv >= 3 },
  { id: 'fragment', name: '天機', desc: '找到第一頁天機殘頁。', test: (s) => (s.sys.frags || []).length > 0 },
  { id: 'reborn', name: '再世', desc: '輪迴轉世，又活了一次。', test: (s) => (s.meta?.life || 1) >= 2 },
];

/** Earned anything new? Returns those (and keeps them, with the day). */
export function checkFeats(s) {
  if (!s?.player) return [];
  // (a save from before 成就 catches up quietly: no flurry of them at once)
  const first = !s.vars.feats;
  s.vars.feats ||= {};
  const out = [];
  for (const f of FEATS) {
    if (s.vars.feats[f.id] !== undefined) continue;
    let ok = false;
    try {
      ok = !!f.test(s);
    } catch {
      ok = false;
    }
    if (ok) {
      s.vars.feats[f.id] = s.day;
      out.push(f);
    }
  }
  return first ? [] : out;
}
