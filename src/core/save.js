import { SAVE_VERSION } from './state.js';
import { levelFor, awaken } from '../world/system.js';
import { hotbarState } from '../world/skills.js';
import { NODES } from '../world/map.js';
import { NAMED } from '../world/npcs.js';
import { DAYS_PER_YEAR } from './calendar.js';
import { syncFog } from '../world/fog.js';

const KEY = 'yijie-sanxiu/save';
const META_KEY = 'yijie-sanxiu/meta';

/** Storage backend; swapped for the artifact host when it offers one. */
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

/** Fill in anything a save from an older build is missing. */
export function migrate(s) {
  if (!s || typeof s !== 'object' || !s.player) throw new Error('不是有效的存檔');
  s.v = SAVE_VERSION;
  s.flags ||= {};
  s.vars ||= { npcSeq: 1 };
  s.seen ||= {};
  s.sched ||= [];
  s.queue ||= [];
  s.rumors ||= [];
  s.log ||= [];
  s.arcIdx ||= 0;
  s.stats ||= { explores: 0, events: 0, travels: 0, seclDays: 0, breakthroughs: 0 };
  s.tod ??= 8;
  // a fight from the days when fights were taken in turns: the story waits on the choice again (fights are fought out in the world now)
  delete s.battle;
  if (s.pending && s.pending.fight !== undefined) s.pending.fight = null;
  if (s.world) {
    s.world.found ||= {};
    s.world.taken ||= {};
    s.world.herbs ||= {};
    s.world.mobs ||= {};
    // more than one map (0.21, save v2): a save from before is on 東荒, and has been nowhere else
    s.world.map ||= 'donghuang';
    s.world.away ||= {};
  }
  s.player.buffs ||= {};
  // what you wear besides a weapon (blood and 靈力 fill themselves the first time they are asked for)
  s.player.gear ||= {};
  s.player.arts ||= [];
  s.player.techs ||= [];
  // the sets you carry into a fight (0.19): the three chosen before, the first of them
  hotbarState(s);
  // (the 劍痕 read before 0.16 left its 劍陣 in you all the same)
  if (s.flags.sword_scar_read && !s.player.arts.includes('jianzhen')) s.player.arts.push('jianzhen');
  // where the factions stand with you; the work you have taken from the boards
  s.rep ||= {};
  s.quests ||= [];
  s.sys.known ||= {};
  s.sys.frags ||= [];
  s.sys.lv = Math.max(s.sys.lv || 1, levelFor(s.sys.exp || 0));
  if (s.sys.bound && s.sys.lv >= 5) awaken(s);
  if (s.sys.lv >= 4) s.sys.subsMax = Math.max(s.sys.subsMax || 1, 2);
  for (const id of Object.keys(NODES)) {
    s.nodes[id] ||= { known: !!NODES[id].start, visited: false, explore: 0 };
  }
  for (const [id, d] of Object.entries(NAMED)) {
    s.npcs[id] ||= {
      id, name: d.name, title: d.title, gender: d.gender,
      born: -Math.round(d.age * DAYS_PER_YEAR), realm: d.realm, stage: d.stage,
      loc: d.loc, alive: true, met: false, favor: 0, luck: !!d.luck, named: true,
    };
  }
  return s;
}

/** Serialize, leaving out the live NPC reference an open event keeps (it is rebuilt from npcId). */
export function serialize(s) {
  syncFog(s);
  return JSON.stringify(s, (k, v) => (k === 'npc' && v && typeof v === 'object' && v.id ? undefined : v));
}

/** Save locally; returns the serialized save so it can also go to the cloud. */
export function saveGame(s) {
  s.savedAt = Date.now();
  const json = serialize(s);
  storage.set(KEY, json);
  return json;
}

export function parseSave(json) {
  try {
    return migrate(JSON.parse(json));
  } catch {
    return null;
  }
}

export function loadGame() {
  const raw = storage.get(KEY);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearGame() {
  storage.remove(KEY);
}

/** Carried across lives: system 見聞 and fragments, the list of past lives. */
export function saveMeta(meta) {
  storage.set(META_KEY, JSON.stringify(meta));
}

export function loadMeta() {
  try {
    return JSON.parse(storage.get(META_KEY) || 'null');
  } catch {
    return null;
  }
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64.trim());
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportCode(s) {
  return 'YJSX1:' + toBase64(serialize(s));
}

export function importCode(code) {
  const body = code.trim().replace(/^YJSX1:/, '');
  return migrate(JSON.parse(fromBase64(body)));
}
