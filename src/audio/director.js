// What the sound should be, from what is going on: which music, which of a
// place's sounds and how loud, whether a fight's drums are in, the music
// lowered under a story. soundScene() is a plain function of the game (so
// it can be tested); frame() puts it into effect, and picks up what just
// happened in a fight (each new blow, spell, cry) and your footsteps.

import * as CB from '../world/combat.js';
import * as E from '../world/explore.js';
import { terrainAt } from '../world/terrain.js';
import { T } from '../world/geo.js';
import { weatherNow, skySigns } from '../world/weather.js';
import { seasonOf } from '../core/calendar.js';
import { ctx, unlockOn, onReady, duck, muffle, setLight } from './engine.js';
import { setCue, setFight, wake } from './music.js';
import { setBeds, happen } from './ambience.js';
import * as FX from './sfx.js';

/** Which music a region has (its kind of place). */
export const PLACE = {
  qingshi_town: 'town',
  luoxia_market: 'market',
  qingxu_temple: 'temple',
  qingshi_hill: 'hill',
  wilds: 'hill',
  farmland: 'farm',
  mirror_lake: 'lake',
  black_forest: 'forest',
  lingxi_valley: 'valley',
  ancient_ruins: 'ruins',
  qingyun_sect: 'sect',
  fox_shrine: 'shrine',
  crane_ferry: 'river',
  great_river: 'river',
  river_isle: 'river',
  hidden_cave: 'cave',
  crane_peak: 'peak',
  sword_peak: 'peak',
};

/** The sounds of each kind of place (beds 0–1), and what happens there now and then (odds a second). */
const SOUNDS = {
  town: { beds: { wind: 0.2, crowd: 0.8 }, day: { birds: 0.05 }, night: { clapper: 0.012 } },
  market: { beds: { wind: 0.15, crowd: 1.1 }, day: { birds: 0.02 }, night: { clapper: 0.008 } },
  temple: { beds: { wind: 0.4, leaves: 0.3 }, day: { birds: 0.1, chimes: 0.035 }, night: { chimes: 0.03, owl: 0.008 } },
  hill: { beds: { wind: 0.6, leaves: 0.25 }, day: { birds: 0.08 }, night: { owl: 0.01, howl: 0.005 } },
  farm: { beds: { wind: 0.3, stream: 0.25 }, day: { birds: 0.12 }, night: { frogs: 0.05 } },
  lake: { beds: { wind: 0.35, stream: 0.3 }, day: { birds: 0.06 }, night: { frogs: 0.04 } },
  forest: { beds: { wind: 0.35, leaves: 0.8 }, day: { birds: 0.04 }, night: { owl: 0.015, howl: 0.008 } },
  valley: { beds: { wind: 0.25, stream: 0.9, leaves: 0.3 }, day: { birds: 0.08 }, night: { owl: 0.008 } },
  ruins: { beds: { wind: 0.9, drone: 0.4 }, day: {}, night: { howl: 0.006 } },
  sect: { beds: { wind: 0.5, leaves: 0.2 }, day: { birds: 0.06, bell: 0.012 }, night: { bell: 0.006 } },
  shrine: { beds: { wind: 0.35, leaves: 0.4 }, day: { birds: 0.05, chimes: 0.02 }, night: { chimes: 0.04, owl: 0.01 } },
  river: { beds: { wind: 0.5, river: 0.9 }, day: { birds: 0.03 }, night: {} },
  cave: { beds: { drone: 0.25 }, day: { drip: 0.35 }, night: { drip: 0.35 } },
  peak: { beds: { wind: 1.2 }, day: {}, night: {} },
};

/**
 * The sound of the moment. view: { screen: 'title' | 'create' | 'world' |
 * 'death', sheet, cbtReady }. Returns { cue, beds, ev, muffle, fight,
 * rage, low, duck }.
 */
export function soundScene(s, view = {}) {
  const quiet = { cue: null, beds: { wind: 0.25 }, ev: {}, muffle: 18000, fight: 'none', rage: false, low: false, duck: 1 };
  if (view.screen === 'title' || view.screen === 'create') return { ...quiet, cue: 'title' };
  if (!s || !s.world) return quiet;
  if (view.screen === 'death' || (s.dead && !s.pending)) return { ...quiet, cue: 'death', beds: { wind: 0.3 } };
  const region = s.player.loc;
  const place = PLACE[region] || 'hill';
  const night = (s.tod ?? 8) < 5 || (s.tod ?? 8) >= 19;
  const season = seasonOf(s.day);
  const wx = weatherNow(s);
  const signs = skySigns(s);
  const up = E.airborne(s);
  const S = SOUNDS[place];
  // the music
  let cue = `${place}:${night ? 'night' : 'day'}`;
  if (place === 'shrine' && !night) cue = null; // (the shrine by day is quiet)
  if (up) cue = 'sky';
  if (s.vars?.realmRun) cue = 'realm';
  if (s.secl) cue = 'secl';
  // the place's sounds
  const beds = { ...S.beds };
  const ev = { ...(night ? S.night : S.day) };
  if (night) {
    if (beds.crowd) beds.crowd *= 0.2;
    if (season !== 'winter' && place !== 'peak' && place !== 'cave' && place !== 'ruins') beds.insects = season === 'spring' ? 0.4 : 0.8;
    delete ev.birds;
  }
  if (season === 'winter') {
    delete ev.birds;
    delete ev.frogs;
    if (beds.leaves) beds.leaves *= 0.4;
  }
  let cut = 18000;
  if (wx.wet) {
    beds.rain = wx.thunder ? 1.15 : 0.75;
    beds.wind = Math.max(beds.wind || 0, wx.thunder ? 0.8 : 0.45);
    delete ev.birds;
    if (wx.thunder) ev.thunder = 0.035;
    if (beds.crowd) beds.crowd *= 0.4;
  }
  if (wx.snow) {
    beds.wind = Math.max(beds.wind || 0, 0.5);
    cut = 2400;
  }
  if (wx.fog) {
    cut = Math.min(cut, 4500);
    if (beds.wind) beds.wind *= 0.6;
  }
  // the sky's signs, at night
  if (night && signs.includes('bloodmoon')) beds.drone = Math.max(beds.drone || 0, 0.7);
  if (night && signs.includes('fullmoon')) ev.moonbell = 0.02;
  if (signs.includes('tide')) beds.shimmer = 0.8;
  // up in the air the ground is far: wind, and the rest faint
  if (up) {
    for (const k of Object.keys(beds)) beds[k] *= 0.35;
    beds.wind = 1.15;
    delete ev.drip;
  }
  if (s.secl) {
    for (const k of Object.keys(beds)) beds[k] *= 0.5;
    cut = Math.min(cut, 3000);
  }
  // a fight: its layers
  const C = CB.combatOf(s);
  let fight = 'none';
  let rage = false;
  let low = false;
  if (C.on && !s.pending) {
    const boss = CB.bossOf(s);
    fight = boss ? 'boss' : 'fight';
    rage = !!boss?.enraged;
    const me = CB.hero(s, C);
    low = me.hp < me.cap * 0.3;
  } else if (view.cbtReady && !s.pending && !s.secl) fight = 'tense';
  // under a story, the music steps back; under a page from the menu, a little
  const duckTo = s.pending ? 0.45 : view.sheet ? 0.75 : 1;
  if (s.pending) for (const k of Object.keys(beds)) beds[k] *= 0.7;
  return { cue, beds, ev, muffle: cut, fight, rage, low, duck: duckTo };
}

// ── putting it into effect ──

const D = { screen: 'title', acc: 0, s: null, seen: new WeakSet(), walked: 0, stepAt: 0, up: false, secl: false, dead: false, stage: null, pending: null, lift: false };

/** On the first touch the sound comes on; button presses tick. */
export function init(root) {
  unlockOn(window);
  onReady(() => {
    wake();
    D.acc = 99;
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest?.('button');
    if (!b || b.closest('.cbt-pad') || b.closest('.actbar') || b.classList.contains('choice')) return;
    FX.tap();
  }, true);
}

/** Which screen is up: the title, making a character, the world, a death. */
export function screen(name) {
  D.screen = name;
  if (name !== 'world') apply(soundScene(null, { screen: name }));
}

function apply(sc) {
  setCue(sc.cue);
  setFight(sc.fight, { rage: sc.rage, low: sc.low });
  setBeds(sc.beds);
  muffle(sc.muffle);
  duck('music', sc.duck);
  D.ev = sc.ev;
}

/** Each frame of the world. view: { sheet, cbtReady }. */
export function frame(s, dt, view = {}) {
  if (!ctx()) return;
  D.acc += dt;
  if (D.acc > 0.25) {
    apply(soundScene(s, { ...view, screen: D.screen }));
    D.acc = 0;
  }
  if (D.ev) happen(D.ev, dt);
  if (!s?.world) return;
  if (D.s !== s) {
    // a different life (or a load): start counting from here
    D.s = s;
    D.walked = s.world.walked || 0;
    D.stage = `${s.player.realm}:${s.player.stage}`;
    D.up = E.airborne(s);
    D.secl = !!s.secl;
    D.dead = !!s.dead;
  }
  fightSounds(s);
  feet(s);
  changes(s);
}

/** Each new thing in a fight, once: a blow, a cry, a spell, something loosed or left burning. */
function fightSounds(s) {
  const C = CB.combatOf(s);
  if (!C.fx.length && !C.pops.length && !C.shots.length && !C.pools.length) return;
  const w = s.world;
  const pan = (x) => Math.max(-0.85, Math.min(0.85, (x - w.x) / 520));
  const near = (x, y) => 1 / (1 + Math.hypot(x - w.x, y - w.y) / 600);
  for (const f of C.fx) {
    if (D.seen.has(f)) continue;
    D.seen.add(f);
    FX.effect(f.kind, pan(f.x), near(f.x, f.y));
  }
  for (const p of C.pops) {
    if (D.seen.has(p)) continue;
    D.seen.add(p);
    const pp = pan(p.x);
    if (p.kind === 'dmg' || p.kind === 'crit' || p.kind === 'weak') FX.hit(p.kind, pp, near(p.x, p.y));
    else if (p.kind === 'hurt' || p.kind === 'poison') FX.hurt(pp);
    else if (p.kind === 'miss') FX.dodge(pp);
    else if (p.kind === 'block') FX.block(pp);
    else if (p.kind === 'heal') FX.heal();
    else if (p.kind === 'ally') FX.hit('weak', pp, near(p.x, p.y) * 0.7);
  }
  for (const sh of C.shots) {
    if (D.seen.has(sh)) continue;
    D.seen.add(sh);
    FX.shot(sh.kind, !!sh.foe, pan(sh.x), near(sh.x, sh.y));
  }
  for (const p of C.pools) {
    if (D.seen.has(p)) continue;
    D.seen.add(p);
    FX.pool(p.poison ? 'poison' : p.kind, pan(p.x));
  }
}

/** What is underfoot. */
function groundAt(s, x, y) {
  const t = terrainAt(x, y);
  if (t === T.WATER) return 'water';
  if (t === T.BRIDGE) return 'wood';
  if (t === T.PAVED || t === T.WALL || t === T.GATE) return 'stone';
  if (seasonOf(s.day) === 'winter') return 'snow';
  if (t === T.HILL || t === T.PEAK || t === T.CLIFF) return 'stone';
  if (t === T.FOREST || t === T.DEEP) return 'leaves';
  if (t === T.SAND) return 'sand';
  if (t === T.ROAD || t === T.TRAIL || t === T.WASTE) return 'dirt';
  return 'grass';
}

/** A step every so far you walk (not in the air, not mid-leap). */
function feet(s) {
  const w = s.world;
  const walked = w.walked || 0;
  const moved = walked - D.walked;
  D.walked = walked;
  const lift = E.liftOf(s);
  if (lift.leap && !D.lift) FX.leap();
  if (!lift.leap && D.lift) FX.landing();
  D.lift = !!lift.leap;
  if (moved <= 0 || moved > 200 || E.airborne(s) || lift.leap) return;
  D.stepAt += moved;
  if (D.stepAt < 66) return;
  D.stepAt = 0;
  FX.step(groundAt(s, w.x, w.y), (Math.random() - 0.5) * 0.2);
}

/** Changes worth a sound: up into the air and down, a seclusion begun or ended, a step up, a death. */
function changes(s) {
  const up = E.airborne(s);
  if (up && !D.up) FX.takeoff(s.world.fly?.by);
  if (!up && D.up) FX.landing();
  D.up = up;
  const secl = !!s.secl;
  if (secl !== D.secl) FX.seclusion(secl);
  D.secl = secl;
  const stage = `${s.player.realm}:${s.player.stage}`;
  if (stage !== D.stage) {
    const [r0, g0] = D.stage.split(':').map(Number);
    const up2 = s.player.realm > r0 || (s.player.realm === r0 && s.player.stage > g0);
    if (up2) (s.player.realm > r0 ? FX.breakthrough(true) : FX.stageUp());
    D.stage = stage;
  }
  if (s.dead && !D.dead) FX.death();
  D.dead = !!s.dead;
  const pend = s.pending ? `${s.pending.id || s.pending.title}:${s.pending.step}` : null;
  if (pend && pend !== D.pending && !s.pending.result) FX.page();
  D.pending = pend;
}

/** Word on the screen (a toast), by its kind. */
export function toast(kind) {
  if (kind === 'find') FX.find();
  else if (kind === 'sys') FX.ding();
  else if (kind === 'good') FX.good();
  else if (kind === 'bad') FX.bad();
}

/** A fight's turns. */
export function signal(sig) {
  if (sig.combat === 'start') FX.fightStart();
  else if (sig.combat === 'won') FX.fightWon();
  else if (sig.combat === 'phase' && sig.enraged) FX.rage();
  else if (sig.combat === 'escaped') FX.escaped();
}

/** The outcome of a choice in a story. */
export function result(r) {
  if (!r) return;
  if (r.check) (r.check.ok ? FX.good : FX.bad)();
  else if (r.chips?.some((c) => c.tone === 'good')) FX.good();
}

/** A breakthrough tried: made, or not (made is heard by the step up itself). */
export function tried(ok) {
  if (!ok) FX.breakthrough(false);
}

export const ui = { open: FX.open, close: FX.close, choose: FX.choose, pill: FX.pill, talisman: FX.talisman, good: FX.good, flame: FX.flame, fireMark: FX.fireMark, brush: FX.brush };

/** A slow phone: lighter sound (no reverb). */
export function light(on) {
  setLight(on);
}
