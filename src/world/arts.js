// 術 as you go: the spells you know and the 符 you carry that do something
// out in the world (the 術 button, or F). In a fight, a 符 burns from its own
// button instead (world/combat.js talismanCmd).

import { SPELLS, TALISMANS, RETURN_TO } from '../content/arts.js';
import { ITEMS } from '../content/items.js';
import { TECHS } from '../content/techniques.js';
import { NODES } from './map.js';
import { gearStats, spendMp } from '../core/body.js';
import { addItem } from '../core/effects.js';
import { newReport } from '../core/time.js';
import { hero, bless, mendSelf, senseBeasts, inCombat } from './combat.js';
import { senseAround, returnTo, liveOf } from './explore.js';

const REALM_WORD = ['', '需引氣入體', '需築基', '需結丹'];

/** Why you cannot cast it (null: you can). */
export function spellLock(s, id) {
  const m = SPELLS[id];
  const p = s.player;
  if (!m) return '沒有這門術';
  if (p.realm < (m.realm ?? 0)) return REALM_WORD[m.realm] || '境界不足';
  if (m.learn && !m.learn.some((a) => (p.arts || []).includes(a) || (p.techs || []).includes(a) || p.tech === a)) {
    return `需習得${m.learn.map((a) => TECHS[a]?.name || a).join('或')}`;
  }
  return null;
}

/** How far your 神識 reaches: further as your cultivation deepens, and with a 照妖鏡 on. */
export function senseRange(s) {
  const p = s.player;
  const base = p.realm >= 2 ? 520 + 60 * p.stage : 260 + 25 * p.stage;
  return Math.round(base * (1 + gearStats(s).sense));
}

/**
 * What you can do as you go: the spells you know, then the 符 you carry that
 * do something out here. Each: { id, kind, name, mp, n (how many 符), left
 * (seconds before it can be cast again), why (why not now) }.
 */
export function artsOf(s) {
  const me = hero(s);
  const out = [];
  for (const [id, m] of Object.entries(SPELLS)) {
    if (spellLock(s, id)) continue;
    const left = me.cds[`art:${id}`] || 0;
    out.push({ id, kind: 'spell', name: m.name, mp: m.mp, left, why: left > 0 ? '還在調息' : me.mp < m.mp ? '靈力不足' : null, desc: m.desc });
  }
  for (const [id, t] of Object.entries(TALISMANS)) {
    const n = s.player.items[id] || 0;
    if (!t.field || !n) continue;
    out.push({ id, kind: 'talisman', name: ITEMS[id].name, n, left: 0, why: null, desc: ITEMS[id].desc });
  }
  return out;
}

/** Cast a spell, or burn a 符, out in the world. Returns whether it went off. */
export function castArt(s, id) {
  if (s.pending || s.dead || s.secl || inCombat(s)) return false;
  const L = liveOf(s);
  const feed = (kind, text) => L.feed.push({ kind, text });
  if (SPELLS[id]) {
    const m = SPELLS[id];
    if (spellLock(s, id)) return false;
    const me = hero(s);
    if ((me.cds[`art:${id}`] || 0) > 0) return false;
    if (!spendMp(s, m.mp)) {
      feed('bad', '靈力不足。');
      return false;
    }
    me.cds[`art:${id}`] = m.cd;
    if (id === 'sense') sense(s, feed);
    else if (id === 'mend') {
      mendSelf(s, 0.3, m.last);
      feed('good', '青木生機流過周身，傷口慢慢收攏。');
    } else if (id === 'conceal') {
      bless(s, 'hidden', m.last);
      feed('sys', '你收斂了氣息。');
    }
    return true;
  }
  const t = TALISMANS[id];
  if (!t?.field || !(s.player.items[id] > 0)) return false;
  addItem(s, id, -1, newReport());
  if (t.field === 'swift') {
    bless(s, 'swift', t.last);
    feed('sys', '神行符一燃，腳下生風。');
  } else if (t.field === 'hide') {
    bless(s, 'hidden', t.last);
    feed('sys', '斂息符化作一縷青煙，你的氣息淡得像一塊石頭。');
  } else if (t.field === 'exorcise') {
    bless(s, 'exorcise', t.last);
    feed('sys', '驅邪符的光罩住了你，陰風繞著你走。');
  } else if (t.field === 'return') {
    const to = returnTo(s, RETURN_TO);
    feed('sys', `一陣風捲起，再睜眼時，你已到了${NODES[to]?.name || ''}。`);
  }
  return true;
}

/** 神識: what lies hidden within reach shows itself; the clouds part. */
function sense(s, feed) {
  const r = senseRange(s);
  const places = senseAround(s, r);
  const lurking = senseBeasts(s, r);
  feed('sys', `神識掃過方圓${Math.round(r / 10)}丈。`);
  for (const name of places) feed('find', `發現：${name}`);
  if (lurking.length) feed('bad', `草叢裡伏著${lurking.length > 1 ? `${lurking.length}條` : '一條'}${lurking[0]}。`);
  if (!places.length && !lurking.length) feed('ambient', '四下沒有什麼藏著的東西。');
}

/** Is it a 符 that does something out in the world? */
export function fieldTalisman(id) {
  return !!TALISMANS[id]?.field;
}

/** Is it a 符 you can burn in a fight? */
export function fightTalisman(id) {
  return !!TALISMANS[id]?.fight;
}
