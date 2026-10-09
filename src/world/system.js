import { NODES } from './map.js';
import { DAYS_PER_YEAR } from '../core/calendar.js';

// 問道輔助系統. It grows through 見聞 (exploration), never through fighting.

export const SYS_LEVELS = [0, 60, 180, 400, 800];

export const SYS_FEATURES = [
  { lv: 1, name: '預感', desc: '面臨選擇時，隱約感到吉凶。' },
  { lv: 1, name: '替死', desc: '本該死去時，以重傷瀕死代之。用後需多年才能恢復。' },
  { lv: 1, name: '見聞錄', desc: '記下走過的地方、見過的人、聽過的傳聞。' },
  { lv: 1, name: '壽元警示', desc: '大限將至時提醒。' },
  { lv: 2, name: '鑑定', desc: '看穿未知之物與假貨。' },
  { lv: 2, name: '推演', desc: '每月一次，推演附近的機緣或危機。' },
  { lv: 2, name: '機率顯示', desc: '預感化為具體的數字。' },
  { lv: 3, name: '氣運視界', desc: '看見誰被天道眷顧，哪些選擇會牽動因果。' },
  { lv: 4, name: '謠言辨識', desc: '分辨傳聞的真假。' },
  { lv: 4, name: '雙重替死', desc: '替死可以儲存兩次。' },
];

export function levelFor(exp) {
  let lv = 1;
  for (let i = 0; i < SYS_LEVELS.length; i++) if (exp >= SYS_LEVELS[i]) lv = i + 1;
  return lv;
}

export function rechargeDays(lv) {
  if (lv >= 4) return 6 * DAYS_PER_YEAR;
  if (lv >= 3) return 8 * DAYS_PER_YEAR;
  return 10 * DAYS_PER_YEAR;
}

/** Add 見聞, leveling the system up as thresholds are crossed. */
export function sysGain(s, n, report) {
  if (!s.sys.bound || n <= 0) return;
  s.sys.exp += n;
  const lv = levelFor(s.sys.exp);
  while (s.sys.lv < lv) {
    s.sys.lv += 1;
    const unlocked = SYS_FEATURES.filter((f) => f.lv === s.sys.lv).map((f) => f.name);
    if (s.sys.lv >= 4) s.sys.subsMax = 2;
    report?.toasts.push(`叮——問道系統升至 ${s.sys.lv} 級。解鎖：${unlocked.join('、') || '（無）'}`);
    report?.logs.push(`問道系統升至 ${s.sys.lv} 級`);
  }
}

/** Called when the player would die. Returns true if 替死 saved them. */
export function trySubstitute(s, report) {
  if (!s.sys.bound || s.sys.subs <= 0) return false;
  s.sys.subs -= 1;
  if (s.sys.rechargeAt === null) s.sys.rechargeAt = s.day + rechargeDays(s.sys.lv);
  s.player.injury = 3;
  s.player.injuryDays = 150;
  report?.toasts.push('叮——替死已觸發。宿主存活。替死需重新凝聚。');
  return true;
}

export function rechargeTick(s, report) {
  const sys = s.sys;
  if (sys.rechargeAt !== null && s.day >= sys.rechargeAt) {
    sys.subs = Math.min(sys.subsMax, sys.subs + 1);
    sys.rechargeAt = sys.subs < sys.subsMax ? s.day + rechargeDays(sys.lv) : null;
    report?.toasts.push('叮——替死凝聚完成。');
  }
}

/** 推演 hints, checked in order; the first that applies is given. */
export const DEDUCE = [
  {
    id: 'valley',
    cond: (s) => !s.nodes.lingxi_valley.known,
    text: '西北三日路程，有一處靈氣匯聚之地，被一道陰冷的氣息盤踞。',
    effects: [['discover', 'lingxi_valley']],
  },
  {
    id: 'cave',
    cond: (s) => !s.flags.cave_found && !s.flags.cave_hint,
    text: '青石山腹中空，有前人遺澤，入口在一株雷擊過的老桃樹附近。',
    effects: [['flag', 'cave_hint']],
  },
  {
    id: 'fox',
    cond: (s) => !s.nodes.fox_shrine.known && s.day > 60,
    text: '鎮東荒廟，夜夜有燈。燈下之物，非人。',
    effects: [['discover', 'fox_shrine']],
  },
  {
    id: 'ruins',
    cond: (s) => !s.nodes.ancient_ruins.known && s.day > 300,
    text: '黑風林以北，殺氣與寶光交纏。三年之內，必有異動。',
    effects: [['discover', 'ancient_ruins']],
  },
  {
    id: 'realm',
    cond: (s) => s.day >= 540 && s.day < 720 && !s.flags.realm_entered,
    text: '明年開春，古戰場上，有門將開。門開一月，入者眾，出者寡。',
    effects: [['flag', 'realm_foreseen']],
  },
  {
    id: 'sect',
    cond: (s) => !s.nodes.qingyun_sect.known,
    text: '坊市以東三日，雲中有峰，峰上有宗。',
    effects: [['discover', 'qingyun_sect']],
  },
  {
    id: 'songhe',
    cond: (s) => s.npcs.song_he.alive && s.npcs.song_he.met && s.day > 900 && !s.flags.songhe_saved,
    text: '清虛觀的老道士，命火將熄。凡藥無用，唯壽元果可續。',
    effects: [['flag', 'songhe_foreseen']],
  },
  {
    id: 'ferry',
    cond: (s) => !s.nodes.crane_ferry.known && s.player.realm >= 1 && s.player.stage >= 6,
    text: '坊市往東南五日，大江橫流，江上有鶴。過了江，天地更大。',
    effects: [['discover', 'crane_ferry']],
  },
];

export const DEDUCE_FALLBACK = [
  '天機混沌，無可奉告。',
  '推演結果：宿主今日宜閉關，忌與人爭執。……本系統不負責解釋。',
  '天機遮蔽。系統只看見一片雲霧，和雲霧後面很遠很遠的地方。',
];

export function nodeName(id) {
  return NODES[id]?.name || id;
}
