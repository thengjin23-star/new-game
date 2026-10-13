// Walking the world: movement, the passing of the day, the clouds, and
// everything you run into on the way — places, people, beasts, herbs, the
// road itself. The UI feeds it input every frame; it changes the save and
// starts events, and leaves notes (toasts, banners) for the UI to show.

import { world, regionAt, collides, speedAt, findPath, nearestOpen, canStand } from './terrain.js';
import { heightAt } from './height.js';
import { POIS, POI_BY_ID, GATHER, GATHER_RESPAWN } from './places.js';
import { NODES } from './map.js';
import { NAMED } from './npcs.js';
import { reveal, fogOf } from './fog.js';
import { stageScene, updateScenes, sceneTargets, sceneByUid, meetScene, scenesOf } from './director.js';
import { peopleNow, folkNow, folkChat, updatePeople } from './people.js';
import { updateWild, wildNow, spawnCritter } from './wildlife.js';
import { sysGain } from './system.js';
import { ITEMS, displayItem } from '../content/items.js';
import { pickEvent, startEvent, takeDue, notice } from '../core/events.js';
import { updateCombat, beastTargets, strikeAt, FIGHT_HOURS, combatOf, inCombat } from './combat.js';
import { bodyArt, leapLanding, leapTo, leapShape, leapRules, FLIGHT, flyMeans, flyBlocked, landingNear, flyCost } from './air.js';
import { weatherNow } from './weather.js';
import { inquire, visit } from '../core/actions.js';
import { spendHours, newReport } from '../core/time.js';
import { applyEffects, logLife } from '../core/effects.js';
import { rested, gearStats, pools, spendMp } from '../core/body.js';
import { rand, chance, pickWeighted } from '../core/rng.js';
import { fmtDuration } from '../core/calendar.js';

export const WALK_SPEED = 150; // world units per second, on grass, as a mortal
export const UNITS_PER_HOUR = 375; // a full day of walking covers 9000 units
export const REACH = { poi: 70, npc: 60, herb: 48, folk: 52 };
/** Someone at home comes to the door when you are this close. */
export const DOOR = 150;

export const isNight = (s) => s.tod >= 19.5 || s.tod < 5;

/** 時辰 for an hour of the day. */
export function shichen(tod) {
  const names = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return names[Math.floor(((tod + 1) % 24) / 2)] + '時';
}

/** How the light falls: 0 full day … 1 deep night, with dusk/dawn in between. */
export function darkness(tod) {
  if (tod >= 6.5 && tod < 17.5) return 0;
  if (tod >= 17.5 && tod < 20) return (tod - 17.5) / 2.5;
  if (tod >= 20 || tod < 4.5) return 1;
  return 1 - (tod - 4.5) / 2;
}

// ── the save's world part ──

/** Make sure a save has its place in the world (new games and old saves alike). */
export function ensureWorld(s) {
  if (s.tod === undefined || s.tod === null) s.tod = 8;
  if (s.world) {
    const L = liveOf(s);
    if (!L.settled) {
      // a save made mid-leap (over the water), or on ground that is no longer there: come down somewhere
      L.settled = true;
      const w = s.world;
      if (!w.fly && !canStand(s, w.x, w.y)) {
        const spot = landingNear(s, w.x, w.y, 2000) || nearestOpen(s, w.x, w.y, 30);
        if (spot) [w.x, w.y] = spot;
      }
    }
    return s.world;
  }
  const loc = NODES[s.player.loc]?.at ? s.player.loc : 'qingxu_temple';
  const [x, y] = NODES[loc].at;
  s.world = { x, y, face: 1, fog: '', found: {}, taken: {}, herbs: {}, mobs: {}, walked: 0, enc: 0, region: loc };
  s.player.loc = loc;
  // a save from before the world was open: you have seen the places you have been
  for (const [id, n] of Object.entries(s.nodes)) if (n.visited && NODES[id]?.at) reveal(s, NODES[id].at[0], NODES[id].at[1], 420);
  reveal(s, x, y, revealRadius(s));
  return s.world;
}

// ── live state (never saved) ──

const LIVE = new WeakMap();

export function liveOf(s) {
  let L = LIVE.get(s);
  if (!L) {
    L = { t: 0, path: null, then: null, stuck: 0, lastReveal: null, inAuto: new Set(), folk: null, feed: [], signals: [], banner: null, moving: false, dayTurned: false, npcCache: new Map() };
    LIVE.set(s, L);
  }
  return L;
}

function busy(s) {
  return !!(s.pending || s.secl || s.dead);
}

/** Toasts and stage-ups from time passing go to the feed. */
function flush(s, L, report) {
  for (const t of report.toasts) L.feed.push({ kind: 'sys', text: t });
  for (const u of report.stageUps) L.feed.push({ kind: 'good', text: `境界提升：${u}` });
  for (const c of report.chips) if (c.tone === 'good' || c.tone === 'bad') L.feed.push({ kind: c.tone, text: c.text });
  if (L.feed.length > 30) L.feed.splice(0, L.feed.length - 30);
}

/** Notes for the UI: toasts since last asked. */
export function takeFeed(s) {
  const L = liveOf(s);
  const out = L.feed;
  L.feed = [];
  return out;
}

/** Things the UI should do (open the shop, show a caption) since last asked. */
export function takeSignals(s) {
  const L = liveOf(s);
  const out = L.signals;
  L.signals = [];
  return out;
}

function passHours(s, L, hours) {
  const report = newReport();
  const days = spendHours(s, hours, report);
  if (days) L.dayTurned = true;
  flush(s, L, report);
  return report;
}

export function walkMult(s) {
  const p = s.player;
  let m = 1;
  if (p.realm === 1) m = 1.08 + p.stage * 0.015;
  else if (p.realm === 2) m = 1.6;
  else if (p.realm >= 3) m = 2;
  // (a 神行符 burning: half as fast again; a 輕功: a little faster always)
  const swift = combatOf(s).me?.swift > 0 ? 1.5 : 1;
  const art = bodyArt(s);
  // (rain, snow and mud slow you a little)
  const sky = weatherNow(s).walk;
  return m * [1, 0.9, 0.75, 0.6][p.injury || 0] * (1 + gearStats(s).speed) * swift * (1 + (art?.walk || 0)) * sky;
}

/** How fast the ground here lets you go: rough ground (woods, slopes, tall grass) holds a 輕功 back less. */
function footing(s, x, y) {
  const sp = speedAt(x, y);
  const art = sp < 1 && bodyArt(s);
  return art ? sp + (1 - sp) * art.rough : sp;
}

function revealRadius(s) {
  const base = isNight(s) ? 170 : 260;
  // up in the air you see further (the higher, the further)
  const up = s.world?.fly ? (s.world.fly.by === 'sword' ? 1.6 : 1.3) : 1;
  // (in fog or rain you see less)
  return (base + 20 * Math.min(4, s.player.realm)) * up * weatherNow(s).see;
}

// ── the frame step ──

/**
 * Advance the world by dt seconds. input: {x, y} from the stick (any length,
 * clamped to 1) or null; with no input the player follows a path if one is set.
 */
export function step(s, dt, input) {
  const w = ensureWorld(s);
  const L = liveOf(s);
  dt = Math.min(dt, 0.1);
  L.t += dt;
  if (busy(s)) {
    L.moving = false;
    return;
  }
  updatePeople(s, L, dt);
  updateWild(s, L, dt);
  // a fight goes on in the world as it is: the beasts out there, on this ground, on this clock
  const fight = updateCombat(s, dt, { input, feed: (kind, text) => L.feed.push({ kind, text }), signal: (x) => L.signals.push(x), scene: (id) => scenesOf(L).find((sc) => sc.def.id === id) || null });
  if (busy(s)) {
    // you went down
    stopWalking(L);
    L.moving = false;
    return;
  }
  if (fight.on) {
    // while it lasts, time runs at the fight's pace, and nothing else comes up
    L.fightHours = (L.fightHours || 0) + dt * FIGHT_HOURS;
    if (L.fightHours >= 0.02) {
      passHours(s, L, L.fightHours);
      L.fightHours = 0;
      if (busy(s)) return;
    }
    L.fought = true;
  } else {
    if (L.fought) {
      // over: what was waiting for you in this place can come now
      L.fought = false;
      if (afterFight(s, L)) return;
    }
    if (updateScenes(s, L, dt)) {
      stopWalking(L);
      L.moving = false;
      return;
    }
  }
  // up in the air, or in the middle of a leap: that is how you move now
  if (w.fly) return flyStep(s, L, dt, input);
  if (L.leap) return leapStep(s, L, dt);
  if (fight.hold) {
    // a dash or a blow is carrying you
    L.moving = fight.moved > 0.01;
    if (fight.moved > 0) afterMove(s, L, fight.moved, fight.on);
    return;
  }
  let dx = 0;
  let dy = 0;
  let mag = 0;
  if (fight.steer) {
    // walking up to whoever you went for
    L.path = null;
    L.then = null;
    [dx, dy] = fight.steer;
    mag = 1;
  } else if (input && (input.x || input.y)) {
    L.path = null;
    L.then = null;
    L.resume = null;
    L.chase = 0;
    const len = Math.hypot(input.x, input.y);
    mag = Math.min(1, len);
    dx = input.x / len;
    dy = input.y / len;
  } else if (L.path?.length) {
    const [tx, ty] = L.path[0];
    const d = Math.hypot(tx - w.x, ty - w.y);
    // the path leaps here: from where you stand, if it carries that far
    if (L.path[0].leap && !fight.on && d >= 7 && leapTo(s, w.x, w.y, tx, ty)) {
      if (startLeap(s, L, tx, ty)) {
        L.path.shift();
        if (!L.path.length) L.path = [[tx, ty]];
        return;
      }
      stopWalking(L);
      return;
    }
    if (d < 7) {
      L.path.shift();
      if (!L.path.length) {
        L.path = null;
        L.moving = false;
        arrive(s, L);
        return;
      }
    } else {
      dx = (tx - w.x) / d;
      dy = (ty - w.y) / d;
      mag = 1;
    }
  }
  if (!mag) {
    L.moving = false;
    if (fight.moved > 0) afterMove(s, L, fight.moved, fight.on);
    return;
  }
  const want = WALK_SPEED * footing(s, w.x, w.y) * walkMult(s) * mag * dt * climb(w.x, w.y, dx, dy) * fight.mult;
  // pushing on into water, a cliff or a wall you could leap: a moment's push, and over you go
  if (!fight.on && !fight.steer && !L.path && mag > 0.5 && collides(s, w.x + dx * 8, w.y + dy * 8)) {
    const to = bodyArt(s) && leapLanding(s, w.x, w.y, dx, dy);
    const same = to && L.leapAim && dx * L.leapAim[0] + dy * L.leapAim[1] > 0.9;
    L.leapPush = to ? (same ? L.leapPush + dt : 0) : 0;
    L.leapAim = to ? [dx, dy] : null;
    if (to && L.leapPush >= 0.12) {
      L.leapPush = 0;
      if (startLeap(s, L, to[0], to[1])) return;
    }
  } else L.leapPush = 0;
  const n = Math.max(1, Math.ceil(want / 5));
  let moved = 0;
  for (let k = 0; k < n; k++) {
    const sx = (dx * want) / n;
    const sy = (dy * want) / n;
    if (!collides(s, w.x + sx, w.y + sy)) {
      w.x += sx;
      w.y += sy;
      moved += Math.hypot(sx, sy);
    } else if (sx && !collides(s, w.x + sx, w.y)) {
      w.x += sx;
      moved += Math.abs(sx);
    } else if (sy && !collides(s, w.x, w.y + sy)) {
      w.y += sy;
      moved += Math.abs(sy);
    } else break;
  }
  if (Math.abs(dx) > 0.2) w.face = dx < 0 ? -1 : 1;
  L.moving = moved > 0.01;
  // which way you are going (the director sets scenes ahead of you)
  if (L.moving) {
    const h = L.heading || [dx, dy];
    L.heading = [h[0] * 0.9 + dx * 0.1, h[1] * 0.9 + dy * 0.1];
  }
  if (L.path) {
    if (moved < want * 0.25) {
      L.stuck += dt;
      if (L.stuck > 0.6) repath(s, L);
    } else L.stuck = 0;
  }
  if (moved + fight.moved > 0) afterMove(s, L, moved + fight.moved, fight.on);
}

// ── 輕功: a leap ──

/** Leap from where you stand to (x, y) (a 輕功's 靈力 paid). Returns whether you are off. */
function startLeap(s, L, x, y) {
  const art = bodyArt(s);
  const w = s.world;
  if (!art) return false;
  if (!spendMp(s, art.mp)) {
    if (L.t - (L.saidT || -9) > 4) {
      L.saidT = L.t;
      L.feed.push({ kind: 'bad', text: '靈力不足，躍不過去。' });
    }
    return false;
  }
  const { dur, arc } = leapShape(w.x, w.y, x, y);
  L.leap = { x0: w.x, y0: w.y, x1: x, y1: y, z0: heightAt(w.x, w.y), z1: heightAt(x, y), t: 0, dur, arc };
  if (Math.abs(x - w.x) > 2) w.face = x < w.x ? -1 : 1;
  L.moving = true;
  return true;
}

function leapStep(s, L, dt) {
  const w = s.world;
  const J = L.leap;
  J.t += dt;
  const k = Math.min(1, J.t / J.dur);
  const x = J.x0 + (J.x1 - J.x0) * k;
  const y = J.y0 + (J.y1 - J.y0) * k;
  const moved = Math.hypot(x - w.x, y - w.y);
  w.x = x;
  w.y = y;
  L.moving = true;
  if (k >= 1) {
    L.leap = null;
    L.moving = false;
  }
  if (moved > 0) afterMove(s, L, moved);
}

// ── flight ──

/** Are you up in the air? */
export function airborne(s) {
  return !!s.world?.fly;
}

const UP_TEXT = {
  sword: '你一踏劍身，劍鳴一聲，載著你衝天而起。',
  boat: '飛梭迎風漲大，你踏上去，它便輕輕離了地。',
  wind: '御風符一燃，四下風起，托著你飄上了半空。',
};
const DOWN_TEXT = {
  sword: '你收了劍光，落在地上。',
  boat: '飛梭落了地，縮回巴掌大小。',
  wind: '風停了，你落回地上。',
};

/** Go up into the air: on a sword, a 飛行法器, or a 御風符's wind (by). Returns whether you are up. */
export function takeOff(s, by = flyMeans(s).by) {
  const w = ensureWorld(s);
  const L = liveOf(s);
  if (busy(s) || !by || !FLIGHT[by] || w.fly || L.leap || inCombat(s)) return false;
  const F = FLIGHT[by];
  if (F.mp && pools(s).mp < 4) {
    L.feed.push({ kind: 'bad', text: '靈力不足，飛不起來。' });
    return false;
  }
  stopWalking(L);
  L.resume = null;
  w.fly = { by, z: heightAt(w.x, w.y), state: 'up' };
  if (F.last) w.fly.left = F.last;
  s.vars.flownBy ||= {};
  s.vars.flownBy[by] = true;
  L.feed.push({ kind: 'sys', text: UP_TEXT[by] });
  if (weatherNow(s).thunder) L.feed.push({ kind: 'bad', text: '雷雨天飛上天，怕是會招雷。' });
  return true;
}

/** Come down: here if you can stand here, else at the nearest spot you can. Returns whether you are on your way down. */
export function land(s) {
  const w = s.world;
  if (!w?.fly || busy(s)) return false;
  return comeDown(s, liveOf(s), false);
}

/** Start down (forced: the 靈力 or the wind has given out — any ground will do, however far). */
function comeDown(s, L, forced) {
  const w = s.world;
  const F = w.fly;
  const spot = landingNear(s, w.x, w.y, forced ? 6000 : 700);
  if (!spot) {
    if (L.t - (L.saidT || -9) > 3) {
      L.saidT = L.t;
      L.feed.push({ kind: 'ambient', text: '下面無處落腳。' });
    }
    return false;
  }
  L.path = null;
  if (forced) F.forced = true;
  if (Math.hypot(spot[0] - w.x, spot[1] - w.y) < 6) {
    F.state = 'down';
    L.landing = null;
  } else L.landing = spot;
  return true;
}

function flyStep(s, L, dt, input) {
  const w = s.world;
  const F = w.fly;
  const mode = FLIGHT[F.by] || FLIGHT.boat;
  // what holds you up — 靈力, or the wind of a 符 — until it gives out
  if (F.state !== 'down' && !F.forced) {
    if (mode.mp) {
      const p = s.player;
      pools(s);
      p.mp = Math.max(0, p.mp - flyCost(s, F.by) * dt);
      if (p.mp <= 0) {
        L.feed.push({ kind: 'bad', text: '靈力將盡，你只得落下。' });
        comeDown(s, L, true);
      }
    } else if (F.left !== undefined) {
      F.left -= dt;
      if (F.left <= 8 && !F.warned) {
        F.warned = true;
        L.feed.push({ kind: 'sys', text: '御風符快燒完了。' });
      }
      if (F.left <= 0) {
        L.feed.push({ kind: 'bad', text: '符燒盡了，風托不住你。' });
        comeDown(s, L, true);
      }
    }
  }
  // which way: where you are coming down, the way you steer, or straight to where you tapped
  let dx = 0;
  let dy = 0;
  let mag = 0;
  const steer = input && (input.x || input.y) && !F.forced;
  if (steer) {
    L.path = null;
    L.then = null;
    L.landing = null;
    if (F.state === 'down') F.state = 'air';
    const len = Math.hypot(input.x, input.y);
    mag = Math.min(1, len);
    dx = input.x / len;
    dy = input.y / len;
  } else if (F.state !== 'down') {
    const target = L.landing || L.path?.[0];
    if (target) {
      const d = Math.hypot(target[0] - w.x, target[1] - w.y);
      if (d < 6) {
        if (L.landing) {
          L.landing = null;
          F.state = 'down';
        } else {
          L.path.shift();
          if (!L.path.length) {
            L.path = null;
            // flew to someone or something: come down by it, and see to it there
            if (L.then) {
              L.thenAfter = L.then;
              L.then = null;
              comeDown(s, L, false);
            }
          }
        }
      } else {
        dx = (target[0] - w.x) / d;
        dy = (target[1] - w.y) / d;
        mag = Math.min(1, d / 30);
      }
    }
  }
  // along: as fast as it flies (a little slower while still rising)
  let moved = 0;
  if (mag > 0) {
    const want = WALK_SPEED * mode.speed * mag * dt * (F.state === 'up' ? 0.6 : 1);
    const n = Math.max(1, Math.ceil(want / 8));
    for (let k = 0; k < n; k++) {
      const nx = w.x + (dx * want) / n;
      const ny = w.y + (dy * want) / n;
      // (gliding down with nothing left to hold you up, a high ridge on the way is no bar)
      const why = flyBlocked(s, nx, ny, F.forced ? 'sword' : F.by);
      if (why) {
        if (L.t - (L.saidT || -9) > 3) {
          L.saidT = L.t;
          L.feed.push({ kind: 'ambient', text: why });
        }
        L.path = null;
        if (F.forced) {
          // nothing for it: down here, and to the nearest ground from here
          L.landing = null;
          F.state = 'down';
        }
        break;
      }
      w.x = nx;
      w.y = ny;
      moved += want / n;
    }
    if (Math.abs(dx) > 0.2) w.face = dx < 0 ? -1 : 1;
  }
  // up: over the ground by as much as it flies, rising before a slope ahead; or down to it
  const ground = heightAt(w.x, w.y);
  let zT = ground;
  if (F.state !== 'down') {
    zT = ground + mode.clear;
    if (mag > 0) for (const a of [40, 90, 150]) zT = Math.max(zT, heightAt(w.x + dx * a, w.y + dy * a) + mode.clear);
  }
  F.z += (zT - F.z) * (1 - Math.exp(-dt * (zT > F.z ? 4 : F.state === 'down' ? 3.2 : 1.6)));
  F.z = Math.max(F.z, ground);
  if (F.state === 'up' && F.z > zT - 8) F.state = 'air';
  L.moving = moved > 0.01;
  if (moved > 0) afterFlight(s, L, moved, mode);
  if (w.fly) riverWatch(s, L, dt);
  if (w.fly) thunderWatch(s, L, dt);
  if (w.fly && F.state === 'down' && F.z - ground < 2.5) touchDown(s, L);
}

/** In a thunderstorm the lightning looks for what stands highest; up in the air, that is you. */
function thunderWatch(s, L, dt) {
  const w = s.world;
  if (w.fly.state === 'down' || w.fly.forced || !weatherNow(s).thunder) {
    L.thunderT = 0;
    return;
  }
  L.thunderT = (L.thunderT || 0) + dt;
  if (L.thunderT < 5) return;
  L.thunderT = 0;
  // one in three: struck (the sky is not always so sure of its aim)
  if (rand(s) > 0.34) return;
  const p = s.player;
  const V = pools(s);
  p.hp = Math.max(1, p.hp - V.cap * 0.3);
  L.flash = L.t;
  L.feed.push({ kind: 'bad', text: '一道雷劈在你身邊，渾身一麻，你從半空裡栽了下來。' });
  comeDown(s, L, true);
}

/** When the last lightning struck near you (for the painters' flash), in live seconds. */
export function flashOf(s) {
  return liveOf(s).flash ?? -99;
}

/**
 * Over the great river something old lives under the water, and does not
 * like what flies over its head (the ferryman at 白鶴渡 warned of it): stay
 * out over the open river too long and it comes up for you. The sandbar is
 * out of its way.
 */
function riverWatch(s, L, dt) {
  const w = s.world;
  if (w.fly.state === 'down' || regionAt(s, w.x, w.y) !== 'great_river') {
    L.riverT = Math.max(0, (L.riverT || 0) - dt * 2);
    if (!L.riverT) L.riverSaid = false;
    return;
  }
  L.riverT = (L.riverT || 0) + dt;
  if (L.riverT > 2.5 && !L.riverSaid) {
    L.riverSaid = true;
    L.feed.push({ kind: 'bad', text: '江面下，一道比船還長的黑影跟上了你。' });
  }
  if (L.riverT < 6.5) return;
  L.riverT = 0;
  L.riverSaid = false;
  // it comes up: thrown from the air onto the nearest bank, hurt
  const p = s.player;
  const V = pools(s);
  p.hp = Math.max(1, p.hp - V.cap * (p.realm >= 2 ? 0.25 : 0.45));
  const report = newReport();
  if (p.realm < 2) applyEffects(s, [['hurt', 1]], {}, report);
  const spot = landingNear(s, w.x, w.y, 6000);
  if (spot) placeAt(s, spot[0], spot[1]);
  else w.fly = null;
  L.feed.push({ kind: 'bad', text: '江水猛地炸開，一張比船還大的嘴從你腳下咬上來——浪頭把你掀翻，摔到了岸上。' });
  flush(s, L, report);
  passHours(s, L, 0.5);
}

/** Flying on: the day goes by (slower than on foot), the clouds part wide, you pass over regions (what waits there waits till you land). */
function afterFlight(s, L, moved, mode) {
  const w = s.world;
  w.walked += moved;
  passHours(s, L, moved / (UNITS_PER_HOUR * mode.time));
  if (s.dead) return;
  if (!L.lastReveal || Math.hypot(w.x - L.lastReveal[0], w.y - L.lastReveal[1]) > 30) {
    L.lastReveal = [w.x, w.y];
    clearClouds(s, L, w.x, w.y, revealRadius(s));
  }
  const region = regionAt(s, w.x, w.y);
  if (region !== w.region) enterRegion(s, L, region, true);
  findHidden(s, L, 1.3);
}

/** On the ground again: what waited for you here comes now; and if you flew to someone, you see to them. */
function touchDown(s, L) {
  const w = s.world;
  const by = w.fly.by;
  w.fly = null;
  L.landing = null;
  L.moving = false;
  if (!canStand(s, w.x, w.y)) {
    const spot = landingNear(s, w.x, w.y, 6000) || nearestOpen(s, w.x, w.y, 30);
    if (spot) [w.x, w.y] = spot;
  }
  L.feed.push({ kind: 'ambient', text: DOWN_TEXT[by] || '你落回地上。' });
  const then = L.thenAfter;
  L.thenAfter = null;
  const to = L.arriveLater;
  L.arriveLater = null;
  if (to && to === w.region) {
    arrivals(s, L, to);
    if (s.pending) return;
  }
  findHidden(s, L, 1);
  L.inAuto.clear();
  if (autoTriggers(s, L)) return;
  L.dayTurned = false;
  if (fireDue(s, L)) return;
  if (then) {
    const t = whereNow(s, L, then);
    if (!t) return;
    if (Math.hypot(t.x - w.x, t.y - w.y) <= t.reach + 24) interact(s, t);
    else walkTo(s, t.x, t.y, t);
  }
}

/** How far above the ground under you to draw you (a leap's arc, or how high you fly), and on what. */
export function liftOf(s) {
  const w = s.world;
  if (!w) return { z: 0, by: null };
  if (w.fly) return { z: Math.max(0, w.fly.z - heightAt(w.x, w.y)), by: w.fly.by, state: w.fly.state };
  const J = liveOf(s).leap;
  if (J) {
    const k = Math.min(1, J.t / J.dur);
    const z = J.z0 + (J.z1 - J.z0) * k + 4 * J.arc * k * (1 - k);
    return { z: Math.max(0, z - heightAt(w.x, w.y)), by: null, leap: true };
  }
  return { z: 0, by: null };
}

/** Going uphill is slower: a long stair takes its toll; downhill is no faster. */
export function climb(x, y, dx, dy) {
  const grade = (heightAt(x + dx * 10, y + dy * 10) - heightAt(x, y)) / 10;
  return grade > 0 ? Math.max(0.6, 1 / (1 + grade * 0.9)) : 1;
}

/** After moving: the clouds part, places come into view; and (unless you are fighting) time passes and things happen. */
function afterMove(s, L, moved, fighting = false) {
  const w = s.world;
  w.walked += moved;
  if (!fighting) passHours(s, L, moved / UNITS_PER_HOUR);
  if (s.dead) return;
  if (!L.lastReveal || Math.hypot(w.x - L.lastReveal[0], w.y - L.lastReveal[1]) > 16) {
    L.lastReveal = [w.x, w.y];
    clearClouds(s, L, w.x, w.y, revealRadius(s));
  }
  const region = regionAt(s, w.x, w.y);
  if (region !== w.region) {
    enterRegion(s, L, region, fighting);
    if (s.pending) return;
  }
  findHidden(s, L, 1);
  if (fighting) return;
  if (autoTriggers(s, L)) return;
  if (L.dayTurned) {
    L.dayTurned = false;
    if (fireDue(s, L)) return;
  }
  encounter(s, L, moved);
}

function clearClouds(s, L, x, y, r) {
  const res = reveal(s, x, y, r);
  for (const id of res.done) {
    const report = newReport();
    sysGain(s, 8, report);
    L.feed.push({ kind: 'sys', text: `叮——${NODES[id].name}已探索完畢。` });
    flush(s, L, report);
  }
}

/** Into another region. quiet: in the middle of a fight — what waits here comes once it is over. */
function enterRegion(s, L, to, quiet = false) {
  const w = s.world;
  w.region = to;
  s.player.loc = to;
  const node = NODES[to];
  const n = s.nodes[to];
  if (!node || !n) return;
  const report = newReport();
  let first = false;
  if (!n.known) {
    n.known = true;
    sysGain(s, 10, report);
  }
  if (!n.visited) {
    n.visited = true;
    first = true;
    s.stats.travels += 1;
    sysGain(s, 5, report);
    logLife(s, `初到${node.name}`);
  }
  if (!L.banner || L.banner.id !== to || L.t - L.banner.t > 20) L.banner = { id: to, name: node.name, first, t: L.t };
  flush(s, L, report);
  if (quiet) {
    L.arriveLater = to;
    return;
  }
  arrivals(s, L, to);
}

/** What waits for you on arriving somewhere: something scheduled, something that happens here. */
function arrivals(s, L, to) {
  const queue = [];
  const due = takeDue(s, to);
  if (due) queue.push(due);
  const aid = pickEvent(s, 'arrive', to);
  if (aid) queue.push({ id: aid });
  if (queue.length) {
    stopWalking(L);
    startEvent(s, queue[0].id, { data: queue[0].data || null });
    for (const q of queue.slice(1)) s.queue.push(q.id);
  }
}

/** A fight is over: if you came somewhere new while it lasted, what waits there comes now. */
function afterFight(s, L) {
  const to = L.arriveLater;
  L.arriveLater = null;
  if (!to || to !== s.world.region) return false;
  arrivals(s, L, to);
  return !!s.pending;
}

function fireDue(s, L) {
  const due = takeDue(s, s.player.loc);
  if (!due) return false;
  stopWalking(L);
  startEvent(s, due.id, { data: due.data });
  return true;
}

function stopWalking(L) {
  // something got in the way of a long walk: remember where we were going
  if (L.path?.length && L.goal) L.resume = { goal: L.goal, then: L.then };
  L.path = null;
  L.then = null;
  L.moving = false;
}

/** After an event interrupted an auto-walk, carry on to where we were going. */
export function resume(s) {
  const L = liveOf(s);
  const r = L.resume;
  L.resume = null;
  if (!r || busy(s)) return false;
  return walkTo(s, r.goal[0], r.goal[1], r.then);
}

export function canResume(s) {
  return !!liveOf(s).resume;
}

// ── places ──

export function poiVisible(s, p) {
  const w = s.world;
  if (p.hidden && !(p.id in w.found)) return false;
  if (p.treasure && p.id in w.taken) return false;
  if (p.show && !p.show(s)) return false;
  return true;
}

export function poiName(s, p) {
  return p.rename?.(s) || p.name;
}

function hiddenRange(s, p) {
  return p.hidden.r * (1 + 0.12 * Math.min(4, s.player.realm));
}

/** Notice hidden things close by (searching looks further). */
function findHidden(s, L, mult) {
  const w = s.world;
  for (const p of POIS) {
    if (!p.hidden || p.id in w.found) continue;
    if (p.hidden.cond && !p.hidden.cond(s)) continue;
    if (Math.hypot(p.x - w.x, p.y - w.y) > hiddenRange(s, p) * mult) continue;
    w.found[p.id] = s.day;
    const report = newReport();
    sysGain(s, 2, report);
    L.feed.push({ kind: 'find', text: `發現：${poiName(s, p)}` });
    flush(s, L, report);
  }
}

/**
 * 神識 over everything within r: the hidden places in it are found (each
 * once), the clouds over it part. Returns the names of what was found.
 */
export function senseAround(s, r) {
  const w = ensureWorld(s);
  const L = liveOf(s);
  const out = [];
  for (const p of POIS) {
    if (!p.hidden || p.id in w.found) continue;
    if (p.hidden.cond && !p.hidden.cond(s)) continue;
    if (Math.hypot(p.x - w.x, p.y - w.y) > r) continue;
    w.found[p.id] = s.day;
    const report = newReport();
    sysGain(s, 2, report);
    out.push(poiName(s, p));
    flush(s, L, report);
  }
  clearClouds(s, L, w.x, w.y, r);
  return out;
}

/** A 歸元符: back to the nearest town you have been to (an hour on the way). Returns where, or null. */
export function returnTo(s, towns) {
  const w = ensureWorld(s);
  const L = liveOf(s);
  let best = null;
  let bd = Infinity;
  for (const id of towns) {
    if (!s.nodes[id]?.visited || !NODES[id]?.at) continue;
    const [x, y] = NODES[id].at;
    const d = Math.hypot(x - w.x, y - w.y);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  best ||= towns[towns.length - 1];
  const spot = nearestOpen(s, ...NODES[best].at) || NODES[best].at;
  stopWalking(L);
  placeAt(s, spot[0], spot[1]);
  passHours(s, L, 1);
  return best;
}

function autoTriggers(s, L) {
  const w = s.world;
  for (const p of POIS) {
    if (!p.auto) continue;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d > p.auto * 1.2) {
      L.inAuto.delete(p.id);
      continue;
    }
    if (d > p.auto || L.inAuto.has(p.id)) continue;
    L.inAuto.add(p.id);
    if (!poiVisible(s, p)) continue;
    const id = pickEvent(s, 'explore', p.region, { poi: p.id, auto: true });
    if (id) {
      stopWalking(L);
      startEvent(s, id);
      return true;
    }
  }
  return false;
}

// ── the road ──

const ENCOUNTER = {
  qingshi_hill: [1300, 0.5],
  black_forest: [1000, 0.55],
  wilds: [1500, 0.45],
  farmland: [1900, 0.3],
  mirror_lake: [1800, 0.35],
  fox_shrine: [1700, 0.3],
  crane_ferry: [2000, 0.3],
  ancient_ruins: [1600, 0.25],
  lingxi_valley: [1700, 0.25],
  qingshi_town: [1500, 0.5],
  luoxia_market: [1400, 0.4],
  // up where no road goes, nothing comes along; only the wind
  crane_peak: [700, 0],
  sword_peak: [700, 0],
  river_isle: [900, 0],
};
const ON_THE_ROAD = new Set(['wilds', 'farmland', 'mirror_lake', 'crane_ferry', 'fox_shrine']);

function encounterPick(s, region) {
  return pickEvent(s, ON_THE_ROAD.has(region) ? ['explore', 'travel'] : 'explore', region);
}

function encounter(s, L, moved) {
  const w = s.world;
  const conf = ENCOUNTER[w.region];
  if (!conf) return;
  w.enc += moved;
  if (w.enc < conf[0]) return;
  w.enc = -rand(s) * conf[0] * 0.5;
  if (!chance(s, conf[1] * (isNight(s) ? 1.2 : 1))) {
    ambient(s, L);
    return;
  }
  const id = encounterPick(s, w.region);
  if (!id) return ambient(s, L);
  // something out there: if it can be seen, set it ahead of you and let you choose
  if (stageScene(s, L, id)) return;
  stopWalking(L);
  startEvent(s, id);
}

const AMBIENT = {
  town: ['巷子裡飄來飯菜的香味。', '幾個小孩追著一隻狗跑過去。', '有人在吵架，為了一隻雞。'],
  mountain: ['松濤一陣一陣地響。', '遠處傳來幾聲獵犬的叫聲。', '一隻松鼠從你腳邊竄過。', '山風很涼。'],
  forest: ['林子裡有東西在看你。', '一根枯枝在你身後斷了。', '樹葉沙沙響，可是沒有風。'],
  wilds: ['風吹過荒草，像海浪一樣。', '天上有一隻鷹在盤旋。', '路邊有一座無名的墳。', '遠處有炊煙，不知是哪個村子。'],
  farm: ['田裡的稻子低著頭。', '一個農夫直起腰，朝你點了點頭。', '青蛙叫成一片。'],
  lake: ['湖面上有魚跳了一下。', '一隻白鷺從蘆葦叢裡飛起來。'],
  ruins: ['風從劍林裡穿過，像有人在哭。', '你踩到了什麼東西。是一截白骨。'],
  valley: ['溪水叮咚。', '霧氣在谷裡慢慢地流。'],
  shrine: ['荒草裡有一雙發亮的眼睛，一眨就不見了。'],
  ferry: ['江風很大。'],
  peak: ['山風很大，吹得衣袍獵獵作響。', '雲從腳下流過去。', '一隻鷹在你腳下盤旋。', '往下看，青石鎮小得像一把撒在地上的米。'],
  isle: ['江水從兩邊流過去，嘩嘩地響。', '蘆葦叢裡飛起一隻水鳥。', '江霧漫上來，又退下去。'],
};
const NIGHT_AMBIENT = ['夜很靜。你聽得見自己的腳步聲。', '月亮被雲遮住了。', '遠處有一點燈火。', '貓頭鷹叫了兩聲。'];

function ambient(s, L) {
  if (!chance(s, 0.5)) return;
  const kind = NODES[s.world.region]?.kind;
  const list = isNight(s) && chance(s, 0.5) ? NIGHT_AMBIENT : AMBIENT[kind];
  if (list) L.feed.push({ kind: 'ambient', text: list[Math.floor(rand(s) * list.length)] });
}

// ── people ──

/** Everyone standing somewhere in the world right now (at home, behind their door, too). */
export function peopleInWorld(s) {
  return peopleNow(s, liveOf(s));
}

/** What someone (a person or a passer-by) is saying right now, if anything. */
export function sayingOf(s, ent) {
  if (ent.sayUntil === undefined) return ent.say || null; // already worked out (peopleInWorld)
  return ent.sayUntil > liveOf(s).t ? ent.say : null;
}

// ── herbs ──

export function herbReady(s, h) {
  const t = s.world.herbs[h.id];
  return t === undefined || s.day - t >= GATHER_RESPAWN;
}

// ── townsfolk ──

export function folkInWorld(s) {
  return folkNow(s, liveOf(s));
}

// ── the wild ──

/** Deer, hares, birds and the rest around you now (for drawing). */
export function wildInWorld(s) {
  return wildNow(liveOf(s));
}

/** Set a creature down near you (tools and tests; the wild does this itself). */
export function addCritter(s, kind, x, y, n = 1) {
  return spawnCritter(liveOf(s), kind, x, y, n);
}

// ── what is in reach ──

/** Everything you could interact with, nearest first, each with its distance. */
export function targetsNear(s, radius = 160) {
  const w = s.world;
  const out = [];
  const add = (t) => {
    t.d = Math.hypot(t.x - w.x, t.y - w.y);
    if (t.d <= radius) out.push(t);
  };
  for (const p of POIS) {
    if (!p.verb || !poiVisible(s, p)) continue;
    if (Math.abs(p.x - w.x) > radius || Math.abs(p.y - w.y) > radius) continue;
    add({ kind: 'poi', id: p.id, x: p.x, y: p.y, name: poiName(s, p), verb: p.treasure ? '查看' : p.verb, reach: REACH.poi });
  }
  for (const n of peopleInWorld(s)) {
    if (Math.abs(n.x - w.x) > radius || Math.abs(n.y - w.y) > radius) continue;
    add({ kind: 'npc', id: n.id, x: n.x, y: n.y, name: n.name, verb: n.met ? '拜訪' : '上前', reach: REACH.npc });
  }
  for (const h of world().herbs) {
    if (Math.abs(h.x - w.x) > radius || Math.abs(h.y - w.y) > radius || !herbReady(s, h)) continue;
    add({ kind: 'herb', id: h.id, x: h.x, y: h.y, name: '靈草', verb: '採集', reach: REACH.herb });
  }
  for (const f of folkNow(s, liveOf(s))) {
    if (Math.abs(f.x - w.x) > radius || Math.abs(f.y - w.y) > radius) continue;
    add({ kind: 'folk', id: f.id, x: f.x, y: f.y, name: f.name || '路人', verb: '搭話', reach: REACH.folk, folk: f });
  }
  for (const t of sceneTargets(s, liveOf(s))) add(t);
  for (const t of beastTargets(s)) add(t);
  out.sort((a, b) => a.d / a.reach - b.d / b.reach);
  return out;
}

/** The one thing the act button would act on, if any (none from up in the air). */
export function nearestTarget(s) {
  if (s.world?.fly) return null;
  const list = targetsNear(s, 120);
  return list.find((t) => t.d <= t.reach) || null;
}

// ── doing things ──

/** Walk (by path) to a point; `then` is a target to act on when you get there. */
export function walkTo(s, x, y, then = null) {
  if (busy(s)) return false;
  const w = ensureWorld(s);
  const L = liveOf(s);
  if (w.fly) {
    // in the air you go straight there
    if (w.fly.forced) return false;
    if (w.fly.state === 'down') w.fly.state = 'air';
    L.landing = null;
    L.path = [[x, y]];
    L.then = then;
    L.goal = [x, y];
    L.resume = null;
    return true;
  }
  if (L.leap) return false;
  const path = findPath(s, w.x, w.y, x, y, leapRules(s));
  if (!path || !path.length) {
    L.feed.push({ kind: 'ambient', text: '那邊過不去。' });
    return false;
  }
  if (then) {
    // stop at arm's length rather than on top of it
    const last = path[path.length - 1];
    const d = Math.hypot(last[0] - then.x, last[1] - then.y);
    if (d < 4) {
      const prev = path.length > 1 ? path[path.length - 2] : [w.x, w.y];
      const back = Math.hypot(prev[0] - last[0], prev[1] - last[1]) || 1;
      const k = Math.min(1, (then.reach * 0.6) / back);
      const stop = [last[0] + (prev[0] - last[0]) * k, last[1] + (prev[1] - last[1]) * k];
      if (!collides(s, stop[0], stop[1])) path[path.length - 1] = stop;
    }
  }
  L.path = path;
  L.then = then;
  L.stuck = 0;
  L.goal = [x, y];
  L.resume = null;
  return true;
}

function repath(s, L) {
  L.stuck = 0;
  const w = s.world;
  const goal = L.goal || L.path?.[L.path.length - 1];
  if (!goal) return stopWalking(L);
  const path = findPath(s, w.x, w.y, goal[0], goal[1], leapRules(s));
  if (!path || (L.path && path.length >= L.path.length + 3 && L.repaths > 2)) return stopWalking(L);
  L.repaths = (L.repaths || 0) + 1;
  L.path = path;
}

function arrive(s, L) {
  const then = L.then;
  L.then = null;
  L.repaths = 0;
  L.goal = null;
  if (!then) return;
  const w = s.world;
  // people move: act on them where they are now, or follow a little way
  const t = whereNow(s, L, then);
  if (!t) return;
  const d = Math.hypot(t.x - w.x, t.y - w.y);
  if (d <= t.reach + 24) interact(s, t);
  else if ((L.chase = (L.chase || 0) + 1) <= 3 && d < 600) walkTo(s, t.x, t.y, t);
}

/** A target as it is now (a person who has walked on, a scene that has moved). */
function whereNow(s, L, t) {
  if (t.kind === 'npc') {
    const n = peopleInWorld(s).find((p) => p.id === t.id);
    return n ? { ...t, x: n.x, y: n.y } : null;
  }
  if (t.kind === 'folk') return t.folk && folkNow(s, L).includes(t.folk) ? { ...t, x: t.folk.x, y: t.folk.y } : null;
  if (t.kind === 'scene') {
    const sc = sceneByUid(L, t.id);
    return sc && sc.state === 'idle' ? { ...t, x: sc.x, y: sc.y } : null;
  }
  return t;
}

export function stop(s) {
  stopWalking(liveOf(s));
}

/** Put the player somewhere as if they had just walked there (tools, tests). */
export function placeAt(s, x, y) {
  const w = ensureWorld(s);
  const L = liveOf(s);
  stopWalking(L);
  // on your feet, wherever it is
  w.fly = null;
  L.leap = null;
  L.landing = null;
  w.x = x;
  w.y = y;
  L.lastReveal = [x, y];
  clearClouds(s, L, x, y, revealRadius(s));
  const region = regionAt(s, x, y);
  if (region !== w.region) {
    enterRegion(s, L, region);
    if (s.pending) return;
  }
  findHidden(s, L, 1);
  autoTriggers(s, L);
}

/**
 * Act on a target (from targetsNear). Starts events, or leaves a signal for
 * the UI: { caption: {title, text, rest?} } or { open: 'shop' }.
 */
export function interact(s, t) {
  if (busy(s) || !t || s.world?.fly) return;
  const L = liveOf(s);
  stopWalking(L);
  L.resume = null;
  L.chase = 0;
  if (t.kind === 'poi') return usePoi(s, L, POI_BY_ID[t.id]);
  if (t.kind === 'npc') return meetNpc(s, L, t.id);
  if (t.kind === 'herb') return gather(s, L, world().herbs[t.id]);
  if (t.kind === 'folk') return chatFolk(s, L, t.folk);
  if (t.kind === 'scene') return meetScene(s, L, sceneByUid(L, t.id));
  if (t.kind === 'beast') return strikeAt(s, t.id);
}

/** Set an event's scene near you (tools and tests; the director does this as you walk). */
export function stage(s, eventId, around = true) {
  return stageScene(s, liveOf(s), eventId, { around });
}

/** The scenes out in the world right now (for drawing). */
export function scenesInWorld(s) {
  return scenesOf(liveOf(s));
}

function usePoi(s, L, p) {
  if (!p || !poiVisible(s, p)) return;
  if (p.treasure) {
    const report = newReport();
    s.world.taken[p.id] = s.day;
    applyEffects(s, p.treasure.effects, {}, report);
    logLife(s, `在${NODES[p.region]?.name || '野外'}發現了${p.name}`);
    sysGain(s, 3, report);
    notice(s, p.name, p.treasure.text, { chips: report.chips, toasts: report.toasts });
    return;
  }
  if (p.action === 'shop') {
    L.signals.push({ open: 'shop', poi: p.id });
    return;
  }
  if (p.action === 'board') {
    // (something going on there first: the sect's 大比 in front of the 任務堂)
    const ev = pickEvent(s, 'explore', p.region, { poi: p.id });
    if (ev) return startEvent(s, ev);
    L.signals.push({ open: 'board', board: p.board, poi: p.id });
    return;
  }
  if (p.action === 'inquire') return inquire(s, p.region);
  const id = pickEvent(s, 'explore', p.region, { poi: p.id });
  if (id) {
    passHours(s, L, 0.5);
    if (s.dead) return;
    startEvent(s, id);
    return;
  }
  const text = typeof p.text === 'function' ? p.text(s) : p.text;
  L.signals.push({ caption: { title: poiName(s, p), text: text || '這裡沒什麼特別的。', rest: !!p.rest } });
}

function meetNpc(s, L, id) {
  const npc = s.npcs[id];
  if (!npc?.alive) return;
  if (npc.named && !npc.met) {
    const report = newReport();
    applyEffects(s, [['meet', id]], {}, report);
    const d = NAMED[id];
    notice(s, npc.name, `${d.title}，${npc.name}。\n\n${d.bio}`, { chips: report.chips, toasts: report.toasts });
    return;
  }
  visit(s, id, { near: true });
}

function gather(s, L, h) {
  if (!h || !herbReady(s, h)) return;
  const conf = GATHER[h.region];
  passHours(s, L, 1);
  if (s.dead) return;
  s.world.herbs[h.id] = s.day;
  const report = newReport();
  const [, item, lo, hi] = pickWeighted(s, conf.give, (g) => g[0]);
  const n = lo + Math.floor(rand(s) * (hi - lo + 1));
  applyEffects(s, [['item', item, n]], {}, report);
  L.feed.push({ kind: 'good', text: `採得${displayItem(s, item).name}${n > 1 ? ' ×' + n : ''}` });
}

function chatFolk(s, L, f) {
  L.signals.push({ caption: { title: f.name || '路人', text: folkChat(s, f) } });
}

/** Look around properly: two hours, a wide look, maybe something turns up. */
export function search(s) {
  if (busy(s) || s.world?.fly) return;
  const w = ensureWorld(s);
  const L = liveOf(s);
  stopWalking(L);
  const report = passHours(s, L, 2);
  if (s.dead) return;
  s.stats.explores += 1;
  clearClouds(s, L, w.x, w.y, revealRadius(s) + 180);
  findHidden(s, L, 2.4);
  if (fireDue(s, L)) return;
  const pre = report.days ? { days: report.days, xw: Math.round(report.xw), stageUps: report.stageUps, toasts: [] } : null;
  if (ENCOUNTER[w.region] && chance(s, 0.45)) {
    const id = encounterPick(s, w.region);
    if (id && stageScene(s, L, id, { around: true })) {
      L.feed.push({ kind: 'find', text: '附近好像有動靜。' });
      return;
    }
    if (id) return startEvent(s, id, { pre });
  }
  startEvent(s, 'generic_explore', { pre });
}

/** Sit and let time pass until 'dusk', 'night', 'dawn', or for n hours. */
export function rest(s, until) {
  if (busy(s) || s.world?.fly) return;
  const L = liveOf(s);
  stopWalking(L);
  const target = { dusk: 18, night: 21, dawn: 6 }[until];
  const hours = typeof until === 'number' ? until : (target - s.tod + 24) % 24 || 24;
  passHours(s, L, hours);
  if (s.dead) return;
  if (s.player.mind < 60 && chance(s, 0.3)) s.player.mind += 1;
  L.feed.push({ kind: 'ambient', text: until === 'dawn' ? '天亮了。' : until === 'dusk' ? '太陽落山了。' : until === 'night' ? '夜深了。' : '你歇了一會兒。' });
  // blood and 靈力 come back as you rest
  const [hp, mp] = rested(s, hours);
  if (hp > 0 || mp > 0) L.feed.push({ kind: 'good', text: [hp > 0 && `氣血 +${hp}`, mp > 0 && `靈力 +${mp}`].filter(Boolean).join('、') });
  L.dayTurned = false;
  fireDue(s, L);
}

/** The banner to show for the region you just walked into (and when). */
export function bannerOf(s) {
  return liveOf(s).banner;
}

export function pathOf(s) {
  return liveOf(s).path;
}

export { fmtDuration };
