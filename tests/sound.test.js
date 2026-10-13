import test from 'node:test';
import assert from 'node:assert/strict';
import { scale, phrase, ground, isHome, isFifth, PENTA, MODES } from '../src/audio/compose.js';
import { CUES, cueFor } from '../src/audio/music.js';
import { soundScene, PLACE } from '../src/audio/director.js';
import { NODES } from '../src/world/map.js';
import * as CB from '../src/world/combat.js';
import { fresh } from './helpers.js';

/** A seeded stream, so a phrase can be checked twice the same. */
function seeded(n = 1) {
  let x = n >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

test('the scale is the five notes, in every octave', () => {
  const notes = scale(50, 48, 74);
  assert.ok(notes.length >= 10);
  for (const m of notes) assert.ok(PENTA.includes((((m - 50) % 12) + 12) % 12), `${m} is in the scale`);
});

test('a phrase stays in its range, in the scale, and comes home', () => {
  for (const mode of Object.keys(MODES)) {
    const P = { root: 52, mode, reg: [60, 84], len: [4, 8], rhythm: { 0.5: 2, 1: 3, 2: 2 }, slide: 0.4, harm: 0.2 };
    const rng = seeded(7 + mode.length);
    let prev = null;
    for (let k = 0; k < 40; k++) {
      const ph = phrase(P, rng, prev);
      prev = ph;
      assert.ok(ph.notes.length >= 1);
      assert.ok(ph.beats > 0);
      let at = -1;
      for (const n of ph.notes) {
        assert.ok(n.midi >= 60 && n.midi <= 84, `${n.midi} within the range`);
        assert.ok(PENTA.includes((((n.midi - 52) % 12) + 12) % 12));
        assert.ok(n.dur > 0 && n.at > at);
        at = n.at;
        assert.ok(n.vel > 0 && n.vel <= 1);
      }
      const last = ph.notes[ph.notes.length - 1];
      assert.ok(isHome(last.midi, 52, mode) || isFifth(last.midi, 52, mode), `${mode}: ends at home or its fifth`);
    }
  }
});

test('the ground under a phrase is low, and the home note or its fifth', () => {
  const P = { root: 50, mode: 'yu', reg: [60, 81], bassReg: [38, 50] };
  const rng = seeded(3);
  for (let k = 0; k < 30; k++) {
    const m = ground(P, rng);
    assert.ok(m >= 38 && m <= 50);
    assert.ok(isHome(m, 50, 'yu') || isFifth(m, 50, 'yu'));
  }
});

test('every place has music for the day, and every cue is playable', () => {
  for (const id of Object.keys(NODES)) assert.ok(PLACE[id], `${id} has a kind of place`);
  for (const place of new Set(Object.values(PLACE))) {
    if (place === 'shrine') continue; // (quiet by day; its music is at night)
    assert.ok(cueFor(`${place}:day`), `${place} has a day cue`);
    assert.ok(cueFor(`${place}:night`), `${place} has something at night`);
  }
  for (const [name, C] of Object.entries(CUES)) {
    assert.ok(MODES[C.mode] !== undefined, `${name}: a mode`);
    assert.ok(C.bpm > 20 && C.bpm < 200, `${name}: a tempo`);
    assert.ok(C.reg[0] < C.reg[1], `${name}: a range`);
    assert.ok(scale(C.root, C.reg[0], C.reg[1]).length >= 5, `${name}: room for a tune`);
  }
});

test('the sound follows where you are, the hour, the weather and a fight', () => {
  const s = fresh();
  assert.equal(soundScene(null, { screen: 'title' }).cue, 'title');
  s.player.loc = 'qingshi_town';
  s.tod = 10;
  let sc = soundScene(s, { screen: 'world' });
  assert.equal(sc.cue, 'town:day');
  assert.ok(sc.beds.crowd > 0.5, 'a town by day is busy');
  s.tod = 22;
  sc = soundScene(s, { screen: 'world' });
  assert.equal(sc.cue, 'town:night');
  assert.ok(sc.beds.crowd < 0.3, 'and quiet at night');
  // rain
  s.vars.sky = 'storm';
  sc = soundScene(s, { screen: 'world' });
  assert.ok(sc.beds.rain > 0.9 && sc.ev.thunder > 0, 'a storm: rain and thunder');
  s.vars.sky = 'clear';
  // a story open: the music steps back
  s.pending = { id: 'x', title: 'x', step: 'start', choices: [] };
  assert.ok(soundScene(s, { screen: 'world' }).duck < 1);
  s.pending = null;
  // something near: the drums
  assert.equal(soundScene(s, { screen: 'world', cbtReady: true }).fight, 'tense');
  CB.combatOf(s).on = true;
  assert.equal(soundScene(s, { screen: 'world' }).fight, 'fight');
  CB.combatOf(s).on = false;
  // seclusion, and death
  s.secl = { node: 'qingshi_town', days: 30, done: 0, start: 0, msPerDay: 3000, xw: 0 };
  assert.equal(soundScene(s, { screen: 'world' }).cue, 'secl');
  s.secl = null;
  s.dead = true;
  assert.equal(soundScene(s, { screen: 'world' }).cue, 'death');
});
