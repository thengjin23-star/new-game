// The music: a cue for each place and moment (audio/director.js says which),
// played as it is composed (audio/compose.js) on the instruments of
// audio/voices.js. A cue plays for a couple of minutes and rests a minute
// or so — the quiet is part of it — and when you walk somewhere else, the
// old one fades as the new one comes in. A fight has its own layers: the
// drums first when something is near, the 琵琶 when it comes to blows, the
// 大鼓 and the 嗩吶 for a 首領, a heartbeat when your blood runs low.

import { ctx, bus } from './engine.js';
import { phrase, ground, scale, homeNear, MODES } from './compose.js';
import { pluck, harmonic, blow, bell, drum, pad } from './voices.js';

const PLUCKED = new Set(['guqin', 'zheng', 'pipa']);

/**
 * Each cue. lead/second: who carries the tune (second answers now and
 * then); bass: who holds the ground; pad: a held chord under it; pulse: a
 * plucked beat; bells: struck at a phrase's start; drum: a slow beat.
 * mode/root: the 調; bpm; reg: the tune's range; play/pause: seconds of
 * music, then of quiet.
 */
export const CUES = {
  title: { lead: 'guqin', second: 'xiao', bass: 'guqin', mode: 'yu', root: 50, bpm: 52, reg: [57, 81], bassReg: [38, 50], rhythm: { 1: 3, 1.5: 2, 2: 3, 3: 1 }, harm: 0.18, slide: 0.4, sway: 0.5, play: [120, 160], pause: [6, 12] },
  'temple:day': { lead: 'guqin', bass: 'guqin', bells: 'qing', mode: 'gong', root: 52, bpm: 50, reg: [59, 83], bassReg: [40, 52], rhythm: { 1: 3, 2: 3, 3: 1 }, harm: 0.25, slide: 0.4, sway: 0.5, rest: [3, 6] },
  'temple:night': { lead: 'guqin', bells: 'chime', mode: 'yu', root: 50, bpm: 44, reg: [62, 86], rhythm: { 1.5: 2, 2: 3, 3: 2 }, harm: 0.55, slide: 0.3, sway: 0.4, rest: [4, 8], play: [70, 100], pause: [60, 100] },
  'town:day': { lead: 'dizi', pulse: 'pipa', mode: 'gong', root: 55, bpm: 88, reg: [67, 86], bassReg: [43, 55], rhythm: { 0.5: 3, 1: 4, 1.5: 1, 2: 1 }, trem: 0.1, rest: [1, 3], play: [80, 110], pause: [40, 80] },
  'town:night': { lead: 'xiao', bass: 'guqin', mode: 'yu', root: 52, bpm: 54, reg: [64, 83], bassReg: [40, 52], rhythm: { 1: 3, 1.5: 2, 2: 3 }, rest: [2, 5], play: [70, 100], pause: [60, 110] },
  'market:day': { lead: 'dizi', second: 'pipa', pulse: 'pipa', bells: 'gong', mode: 'zhi', root: 55, bpm: 100, reg: [67, 88], bassReg: [43, 55], rhythm: { 0.5: 4, 1: 4, 1.5: 1 }, trem: 0.15, rest: [1, 2], play: [80, 110], pause: [40, 70] },
  'market:night': { lead: 'xiao', bass: 'guqin', mode: 'yu', root: 52, bpm: 56, reg: [64, 83], bassReg: [40, 52], rhythm: { 1: 3, 2: 3 }, rest: [2, 5], play: [60, 90], pause: [60, 110] },
  'hill:day': { lead: 'xiao', second: 'zheng', mode: 'shang', root: 50, bpm: 60, reg: [62, 81], bassReg: [38, 50], rhythm: { 1: 3, 1.5: 2, 2: 2 }, rest: [2, 4] },
  'hill:night': { lead: 'xiao', bass: 'guqin', mode: 'yu', root: 48, bpm: 50, reg: [60, 79], bassReg: [36, 48], rhythm: { 1: 2, 2: 3, 3: 1 }, rest: [3, 6], play: [60, 90], pause: [70, 120] },
  'farm:day': { lead: 'zheng', second: 'dizi', mode: 'gong', root: 57, bpm: 76, reg: [64, 86], bassReg: [45, 57], rhythm: { 0.5: 2, 1: 4, 1.5: 1, 2: 2 }, rest: [2, 3] },
  'farm:night': { lead: 'guqin', mode: 'yu', root: 52, bpm: 50, reg: [57, 81], rhythm: { 1: 2, 2: 3, 3: 1 }, harm: 0.3, slide: 0.3, rest: [3, 6], play: [60, 90], pause: [70, 120] },
  'lake:day': { lead: 'zheng', second: 'guqin', mode: 'zhi', root: 53, bpm: 64, reg: [62, 84], bassReg: [41, 53], rhythm: { 0.5: 2, 1: 4, 2: 2 }, rest: [2, 4] },
  'lake:night': { lead: 'guqin', pad: true, mode: 'gong', root: 52, bpm: 48, reg: [59, 83], rhythm: { 1: 2, 2: 3, 3: 1 }, harm: 0.4, slide: 0.35, sway: 0.4, rest: [3, 6] },
  'forest:day': { lead: 'xun', bass: 'zheng', mode: 'yu', root: 45, bpm: 50, reg: [57, 76], bassReg: [33, 45], rhythm: { 1: 2, 2: 3, 3: 2 }, rest: [4, 8], play: [60, 90], pause: [60, 100] },
  'forest:night': { lead: 'xun', pad: true, mode: 'yu', root: 43, bpm: 44, reg: [55, 74], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [50, 80], pause: [70, 120] },
  'valley:day': { lead: 'zheng', second: 'guqin', mode: 'jue', root: 52, bpm: 56, reg: [62, 86], bassReg: [40, 52], rhythm: { 0.5: 2, 1: 3, 2: 2 }, harm: 0.3, rest: [2, 5] },
  'ruins:day': { lead: 'xun', drum: 'dagu', mode: 'yu', root: 43, bpm: 44, reg: [55, 74], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [60, 90], pause: [60, 100] },
  'sect:day': { lead: 'guqin', bells: 'zhong', pad: true, mode: 'zhi', root: 50, bpm: 58, reg: [62, 84], bassReg: [38, 50], rhythm: { 1: 3, 1.5: 1, 2: 3 }, slide: 0.3, rest: [2, 4] },
  'shrine:night': { lead: 'pipa', bells: 'chime', mode: 'jue', root: 54, bpm: 62, reg: [64, 86], rhythm: { 0.5: 2, 1: 3, 2: 2 }, trem: 0.45, rest: [2, 5] },
  'river:day': { lead: 'guqin', second: 'xiao', bass: 'guqin', mode: 'shang', root: 48, bpm: 56, reg: [60, 81], bassReg: [36, 48], rhythm: { 1: 3, 1.5: 2, 2: 3 }, harm: 0.2, slide: 0.4, rest: [2, 5] },
  'cave:day': { lead: 'guqin', pad: true, mode: 'yu', root: 45, bpm: 40, reg: [64, 88], rhythm: { 2: 3, 3: 2 }, harm: 0.7, rest: [5, 9] },
  'peak:day': { lead: 'dizi', pad: true, mode: 'gong', root: 55, bpm: 64, reg: [67, 88], rhythm: { 1: 3, 1.5: 2, 2: 3 }, rest: [2, 4] },
  // 南嶺: the 角 mode, airy and a little strange; the jungle and the valley of 蠱 low and slow
  'village:day': { lead: 'dizi', second: 'zheng', pulse: 'pipa', mode: 'jue', root: 57, bpm: 84, reg: [67, 88], bassReg: [45, 57], rhythm: { 0.5: 3, 1: 4, 1.5: 2, 2: 1 }, trem: 0.1, rest: [1, 3], play: [80, 110], pause: [40, 80] },
  'village:night': { lead: 'xiao', bass: 'guqin', mode: 'jue', root: 52, bpm: 52, reg: [64, 83], bassReg: [40, 52], rhythm: { 1: 3, 1.5: 2, 2: 3 }, rest: [2, 5], play: [70, 100], pause: [60, 110] },
  'jungle:day': { lead: 'xun', bass: 'zheng', mode: 'jue', root: 44, bpm: 46, reg: [56, 76], bassReg: [32, 44], rhythm: { 1: 2, 2: 3, 3: 2 }, rest: [4, 8], play: [60, 90], pause: [60, 100] },
  'jungle:night': { lead: 'xun', pad: true, mode: 'yu', root: 42, bpm: 42, reg: [54, 73], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [50, 80], pause: [70, 120] },
  'marsh:day': { lead: 'xiao', pad: true, mode: 'shang', root: 47, bpm: 48, reg: [59, 79], rhythm: { 1: 2, 2: 3, 3: 2 }, slide: 0.3, rest: [4, 7], play: [60, 90], pause: [60, 110] },
  'gu:day': { lead: 'xun', drum: 'dagu', pad: true, mode: 'jue', root: 43, bpm: 40, reg: [55, 74], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [60, 90], pause: [60, 100] },
  'falls:day': { lead: 'zheng', second: 'guqin', mode: 'shang', root: 53, bpm: 62, reg: [62, 84], bassReg: [41, 53], rhythm: { 0.5: 2, 1: 4, 2: 2 }, harm: 0.25, rest: [2, 4] },
  'nanwilds:day': { lead: 'dizi', second: 'zheng', mode: 'jue', root: 52, bpm: 60, reg: [64, 84], bassReg: [40, 52], rhythm: { 1: 3, 1.5: 2, 2: 2 }, rest: [2, 4] },
  'nanwilds:night': { lead: 'xiao', bass: 'guqin', mode: 'yu', root: 48, bpm: 48, reg: [60, 79], bassReg: [36, 48], rhythm: { 1: 2, 2: 3, 3: 1 }, rest: [3, 6], play: [60, 90], pause: [70, 120] },
  // 西漠: the 商 mode (the west's, and autumn's): wide and slow on the sand, the 琵琶 at the spring where the caravans stop
  'desert:day': { lead: 'dizi', pad: true, mode: 'shang', root: 50, bpm: 52, reg: [62, 83], rhythm: { 1: 2, 2: 3, 3: 2 }, slide: 0.35, rest: [4, 8], play: [60, 90], pause: [60, 110] },
  'desert:night': { lead: 'xun', pad: true, mode: 'shang', root: 45, bpm: 44, reg: [57, 76], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [50, 80], pause: [70, 120] },
  'oasis:day': { lead: 'pipa', second: 'dizi', pulse: 'pipa', mode: 'shang', root: 52, bpm: 92, reg: [64, 86], bassReg: [40, 52], rhythm: { 0.5: 4, 1: 4, 1.5: 1 }, trem: 0.25, rest: [1, 3], play: [80, 110], pause: [40, 80] },
  'oasis:night': { lead: 'pipa', bass: 'guqin', mode: 'shang', root: 50, bpm: 56, reg: [62, 84], bassReg: [38, 50], rhythm: { 1: 3, 1.5: 2, 2: 3 }, trem: 0.3, rest: [2, 5], play: [70, 100], pause: [60, 110] },
  'fort:day': { lead: 'xiao', drum: 'dagu', mode: 'shang', root: 48, bpm: 50, reg: [60, 79], rhythm: { 1: 2, 2: 3, 3: 2 }, slide: 0.3, rest: [3, 6], play: [60, 90], pause: [60, 100] },
  'fort:night': { lead: 'xiao', pad: true, mode: 'yu', root: 46, bpm: 44, reg: [58, 77], rhythm: { 2: 3, 3: 2 }, rest: [4, 8], play: [50, 80], pause: [70, 120] },
  'gobi:day': { lead: 'xun', drum: 'dagu', mode: 'shang', root: 44, bpm: 48, reg: [56, 76], bassReg: [32, 44], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [60, 90], pause: [60, 100] },
  'lostcity:day': { lead: 'xun', pad: true, bells: 'qing', mode: 'yu', root: 43, bpm: 40, reg: [55, 74], rhythm: { 2: 3, 3: 2 }, harm: 0.4, rest: [5, 9], play: [60, 90], pause: [60, 110] },
  'deadtemple:day': { lead: 'guqin', bells: 'zhong', pad: true, mode: 'yu', root: 45, bpm: 40, reg: [57, 79], rhythm: { 2: 3, 3: 2 }, harm: 0.5, slide: 0.3, rest: [5, 9], play: [50, 80], pause: [70, 120] },
  'tomb:day': { lead: 'guqin', pad: true, mode: 'shang', root: 43, bpm: 36, reg: [62, 86], rhythm: { 2: 3, 3: 3 }, harm: 0.7, rest: [6, 10] },
  // 北原 (0.23): 羽調 and 角調, the 二胡 and the 塤 for the long snow, a 磬 struck now and then where the cold is deepest
  'snowpass:day': { lead: 'xiao', pad: true, mode: 'yu', root: 47, bpm: 46, reg: [59, 79], rhythm: { 1.5: 2, 2: 3, 3: 2 }, slide: 0.3, rest: [4, 8], play: [60, 90], pause: [60, 110] },
  'minetown:day': { lead: 'erhu', bass: 'guqin', mode: 'jue', root: 47, bpm: 58, reg: [59, 79], bassReg: [35, 47], rhythm: { 1: 3, 1.5: 2, 2: 3 }, slide: 0.35, rest: [2, 5], play: [70, 100], pause: [50, 90] },
  'minetown:night': { lead: 'erhu', pad: true, mode: 'yu', root: 45, bpm: 46, reg: [57, 77], rhythm: { 2: 3, 3: 2 }, slide: 0.4, rest: [4, 8], play: [50, 80], pause: [70, 120] },
  'mine:day': { lead: 'xun', pad: true, bells: 'qing', mode: 'yu', root: 41, bpm: 38, reg: [53, 72], rhythm: { 2: 3, 3: 3 }, harm: 0.4, rest: [6, 10], play: [50, 80], pause: [70, 120] },
  'icesea:day': { lead: 'guqin', second: 'xiao', mode: 'yu', root: 48, bpm: 44, reg: [60, 84], bassReg: [36, 48], rhythm: { 1.5: 2, 2: 3, 3: 2 }, harm: 0.45, slide: 0.4, rest: [4, 8], play: [60, 90], pause: [60, 110] },
  'icesea:night': { lead: 'guqin', bells: 'qing', mode: 'yu', root: 45, bpm: 38, reg: [62, 86], rhythm: { 2: 3, 3: 3 }, harm: 0.6, rest: [5, 9], play: [50, 80], pause: [70, 120] },
  'tundra:day': { lead: 'erhu', pad: true, mode: 'yu', root: 46, bpm: 48, reg: [58, 78], rhythm: { 1.5: 2, 2: 3, 3: 2 }, slide: 0.45, rest: [4, 8], play: [60, 90], pause: [60, 110] },
  'tundra:night': { lead: 'xun', pad: true, mode: 'yu', root: 43, bpm: 40, reg: [55, 74], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [50, 80], pause: [70, 120] },
  'camp:day': { lead: 'erhu', pulse: 'pipa', drum: 'dagu', mode: 'jue', root: 50, bpm: 76, reg: [62, 82], bassReg: [38, 50], rhythm: { 0.5: 2, 1: 4, 1.5: 2 }, slide: 0.3, rest: [1, 3], play: [70, 100], pause: [50, 90] },
  'camp:night': { lead: 'erhu', bass: 'guqin', mode: 'yu', root: 48, bpm: 54, reg: [60, 80], bassReg: [36, 48], rhythm: { 1: 3, 1.5: 2, 2: 3 }, slide: 0.4, rest: [2, 5], play: [60, 90], pause: [60, 110] },
  'rift:day': { lead: 'guqin', bells: 'chime', pad: true, mode: 'gong', root: 50, bpm: 42, reg: [62, 86], rhythm: { 1.5: 2, 2: 3, 3: 2 }, harm: 0.6, slide: 0.3, sway: 0.4, rest: [4, 8], play: [60, 90], pause: [50, 100] },
  'highland:day': { lead: 'xiao', second: 'zheng', mode: 'yu', root: 49, bpm: 52, reg: [61, 81], bassReg: [37, 49], rhythm: { 1: 3, 1.5: 2, 2: 2 }, slide: 0.3, rest: [3, 6] },
  'snowpeak:day': { lead: 'xun', drum: 'dagu', mode: 'yu', root: 44, bpm: 46, reg: [56, 76], bassReg: [32, 44], rhythm: { 2: 3, 3: 2 }, rest: [5, 9], play: [60, 90], pause: [60, 100] },
  'pillar:day': { lead: 'guqin', pad: true, bells: 'zhong', mode: 'yu', root: 41, bpm: 34, reg: [60, 84], rhythm: { 2: 3, 3: 3 }, harm: 0.7, rest: [6, 10], play: [50, 80], pause: [70, 120] },
  sky: { lead: 'dizi', second: 'xiao', pad: true, mode: 'gong', root: 55, bpm: 70, reg: [67, 88], rhythm: { 0.5: 2, 1: 4, 2: 2 }, rest: [1, 3], play: [90, 140], pause: [20, 40] },
  secl: { lead: 'guqin', pad: true, mode: 'gong', root: 48, bpm: 36, reg: [64, 88], rhythm: { 2: 3, 3: 3 }, harm: 0.8, rest: [6, 12], play: [150, 240], pause: [30, 60] },
  realm: { lead: 'xun', pad: true, mode: 'jue', root: 44, bpm: 42, reg: [56, 76], rhythm: { 2: 3, 3: 2 }, rest: [4, 8], play: [90, 150], pause: [30, 60] },
  death: { lead: 'erhu', bass: 'guqin', mode: 'shang', root: 50, bpm: 48, reg: [62, 81], bassReg: [38, 50], rhythm: { 1: 2, 1.5: 2, 2: 3 }, len: [5, 8], echo: 0.4, rest: [2, 3], play: [60, 80], pause: [999, 999] },
};

// (a cue that has no night of its own plays its day one; no day: no music, only the place's sounds)
export function cueFor(name) {
  return CUES[name] || CUES[name.replace(':night', ':day')] || null;
}

const between = ([a, b]) => a + Math.random() * (b - a);

/** One cue, playing: it composes a phrase at a time, a little ahead of when it is heard. */
class Piece {
  constructor(name, def) {
    this.name = name;
    this.def = { len: [4, 7], echo: 0.3, rest: [2, 4], play: [90, 140], pause: [50, 90], ...def };
    const c = ctx();
    this.out = c.createGain();
    this.out.gain.value = 0;
    this.out.connect(bus('music'));
    this.next = c.currentTime + 0.4;
    this.sectionEnd = this.next + between(this.def.play);
    this.prev = null;
    this.lastNote = null;
    this.alive = true;
  }

  fade(to, secs) {
    const c = ctx();
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setTargetAtTime(to, c.currentTime, Math.max(0.05, secs / 3));
  }

  stop(secs = 2.5) {
    this.fade(0, secs);
    this.alive = false;
    const out = this.out;
    setTimeout(() => out.disconnect(), (secs + 6) * 1000);
  }

  /** Compose and schedule whatever falls before `until` (context time). */
  tick(until) {
    const D = this.def;
    while (this.alive && this.next < until) {
      if (this.next >= this.sectionEnd) {
        // the quiet between: only the place's own sounds
        this.next += between(D.pause);
        this.sectionEnd = this.next + between(D.play);
        this.prev = null;
        continue;
      }
      const beat = 60 / (D.bpm * (0.96 + Math.random() * 0.08));
      // now and then the second voice answers with the next phrase
      const second = D.second && this.prev && Math.random() < 0.35;
      const ph = phrase(D, Math.random, this.prev);
      this.prev = ph;
      const t0 = this.next;
      this.under(t0, ph.beats * beat, beat);
      for (const n of ph.notes) this.note(second ? D.second : D.lead, n, t0 + n.at * beat * (0.98 + Math.random() * 0.04), n.dur * beat);
      this.next = t0 + ph.beats * beat + between(D.rest) * beat;
    }
  }

  /** What goes under a phrase: the ground, a held chord, a bell, a pulse, a drum. */
  under(t, secs, beat) {
    const D = this.def;
    if (D.bass) {
      const m = ground(D, Math.random);
      play(D.bass, m, t, Math.min(secs, 4), 0.55, this.out);
    }
    if (D.pad && Math.random() < 0.8) {
      const home = homeNear((D.reg[0] + D.reg[1]) / 2 - 12, D.root, D.mode);
      padInto([home - 12, home - 5, home], t, secs + beat * 2, this.out);
    }
    if (D.bells && Math.random() < 0.55) {
      const notes = scale(D.root, D.reg[0], D.reg[1]);
      const m = D.bells === 'zhong' || D.bells === 'gong' ? homeNear(D.reg[0] - 4, D.root, D.mode) : notes[notes.length - 1 - Math.floor(Math.random() * 4)];
      bellInto(D.bells, m, t, D.bells === 'chime' ? 0.5 : 0.75, this.out);
    }
    if (D.pulse) {
      const lo = scale(D.root, (D.bassReg || [D.reg[0] - 12])[0], D.reg[0]);
      const home = homeNear(lo[Math.floor(lo.length / 2)] || D.root, D.root, D.mode);
      for (let b = 0; b * beat < secs - beat * 0.5; b++) {
        if (Math.random() < 0.18) continue;
        play(D.pulse, b % 2 ? home + 7 : home, t + b * beat, beat * 0.9, b % 4 ? 0.32 : 0.45, this.out);
      }
    }
    if (D.drum) for (let b = 0; b * beat < secs; b += 4) drumInto(D.drum, t + b * beat, 0.35, this.out);
  }

  note(who, n, t, dur) {
    if (n.harm && who === 'guqin') {
      harmonic(n.midi + 12, t, { vel: n.vel, node: this.out });
      return;
    }
    if (n.trem && PLUCKED.has(who)) {
      // 輪指: the note picked again and again, fading
      const k = Math.max(3, Math.floor(dur / 0.075));
      for (let i = 0; i < k; i++) play(who, n.midi, t + i * 0.075, 0.09, n.vel * (0.85 - (i / k) * 0.4), this.out);
      return;
    }
    play(who, n.midi, t, dur, n.vel, this.out, { slide: n.slide, sway: n.sway, from: this.lastNote });
    this.lastNote = n.midi;
  }
}

/** Play a note on whichever instrument, into a piece's own fader. */
function play(who, midi, t, dur, vel, into, orn = {}) {
  if (PLUCKED.has(who)) pluck(who, midi, t, { vel, node: into, dur: who === 'guqin' ? undefined : dur * 1.6, slide: orn.slide, sway: orn.sway });
  else blow(who, midi, t, dur * 0.95, { vel, node: into, from: orn.from });
}

// (the voices go into a bus by name, or into a node: here, the piece's own fader)
const bellInto = (k, m, t, v, into) => bell(k, m, t, { vel: v, node: into });
const drumInto = (k, t, v, into) => drum(k, t, { vel: v, node: into });
const padInto = (ms, t, d, into) => pad(ms, t, d, { node: into });

// ── a fight ──

/**
 * The fight's music: layer 'tense' (something is near: soft drums),
 * 'fight' (drums and a 琵琶 ostinato), 'boss' (with 大鼓 and a 嗩吶 tune);
 * faster when a 首領 rages; a heartbeat when your blood is low.
 */
class Fight {
  constructor() {
    const c = ctx();
    this.out = c.createGain();
    this.out.gain.value = 0;
    this.out.connect(bus('music'));
    this.layer = 'tense';
    this.rage = false;
    this.low = false;
    this.next = c.currentTime + 0.15;
    this.bar = 0;
    this.prev = null;
    this.alive = true;
  }

  set(layer, { rage = false, low = false } = {}) {
    this.layer = layer;
    this.rage = rage;
    this.low = low;
    const c = ctx();
    // (a fight is louder than a walk, but not by much: it is the drums that make it urgent)
    this.out.gain.setTargetAtTime(layer === 'tense' ? 0.35 : layer === 'boss' ? 0.62 : 0.52, c.currentTime, 0.4);
  }

  stop(secs = 3) {
    const c = ctx();
    this.out.gain.setTargetAtTime(0, c.currentTime, secs / 3);
    this.alive = false;
    const out = this.out;
    setTimeout(() => out.disconnect(), (secs + 4) * 1000);
  }

  tick(until) {
    while (this.alive && this.next < until) {
      const bpm = this.layer === 'tense' ? 84 : this.layer === 'boss' ? (this.rage ? 152 : 138) : 128;
      const beat = 60 / bpm;
      const t = this.next;
      const into = this.out;
      if (this.layer === 'tense') {
        // a low pulse, like something breathing
        drum('tanggu', t, { vel: 0.35, node: into });
        drum('tanggu', t + beat * 2, { vel: 0.25, node: into });
        if (this.low) drum('heart', t + beat, { vel: 0.7, node: into });
      } else {
        // the drums: a pattern of eighths with the weight on the one
        const pat = this.bar % 4 === 3 ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.25, 3.5, 3.75] : [0, 1, 1.5, 2.5, 3];
        for (const b of pat) drum('tanggu', t + b * beat, { vel: b === 0 ? 0.75 : b % 1 ? 0.38 : 0.55, node: into });
        if (this.layer === 'boss' || this.bar % 2 === 0) drum('dagu', t, { vel: this.layer === 'boss' ? 0.9 : 0.6, node: into });
        if (this.layer === 'boss') drum('dagu', t + beat * 2, { vel: 0.6, node: into });
        // the 琵琶 underneath: the home note and its fifth, picked fast
        const home = 45 + MODES.yu;
        for (let k = 0; k < 8; k++) {
          const m = k % 4 === 3 ? home + 7 : k === 6 && this.bar % 2 ? home + 10 : home;
          pluck('pipa', m, t + k * beat * 0.5, { vel: k % 2 ? 0.3 : 0.42, dur: beat * 0.45, node: into });
        }
        // over it, every other bar, a tune: the 琵琶's, or a 嗩吶's for a 首領
        if (this.bar % 2 === 1) {
          const lead = this.layer === 'boss' ? 'suona' : 'pipa';
          const ph = phrase({ root: 45, mode: 'yu', reg: lead === 'suona' ? [69, 88] : [64, 84], len: [4, 6], rhythm: { 0.5: 4, 1: 3, 1.5: 1 }, trem: lead === 'pipa' ? 0.3 : 0 }, Math.random, this.prev);
          this.prev = ph;
          for (const n of ph.notes) {
            if (n.at >= 4) break;
            const at = t + n.at * beat;
            if (lead === 'suona') blow('suona', n.midi, at, n.dur * beat * 0.9, { vel: n.vel, node: into });
            else pluck('pipa', n.midi, at, { vel: n.vel * 0.9, dur: n.dur * beat, node: into });
          }
        }
        if (this.low) {
          drum('heart', t, { vel: 0.8, node: into });
          drum('heart', t + beat * 2, { vel: 0.8, node: into });
        }
      }
      this.bar++;
      this.next = t + beat * 4;
    }
  }
}

// ── the conductor ──

const M = { piece: null, fight: null, want: null, layer: 'none', timer: 0, fightOpts: {} };

/** Which cue should be playing (null: none). The old one fades as the new one comes. */
export function setCue(name) {
  if (M.want === name) return;
  M.want = name;
  if (!ctx()) return;
  M.piece?.stop(name ? 3 : 2);
  M.piece = null;
  const def = name ? cueFor(name) : null;
  if (def) {
    M.piece = new Piece(name, def);
    M.piece.fade(M.layer === 'fight' || M.layer === 'boss' ? 0 : M.layer === 'tense' ? 0.55 : 1, 3);
  }
  loop();
}

/** The fight's layer: 'none' | 'tense' | 'fight' | 'boss'. */
export function setFight(layer, opts = {}) {
  M.fightOpts = opts;
  if (layer === M.layer) {
    if (M.fight && (opts.rage !== M.fight.rage || opts.low !== M.fight.low)) M.fight.set(layer, opts);
    return;
  }
  M.layer = layer;
  if (!ctx()) return;
  if (layer === 'none') {
    M.fight?.stop(3.5);
    M.fight = null;
    M.piece?.fade(1, 5);
  } else {
    if (!M.fight) M.fight = new Fight();
    M.fight.set(layer, opts);
    M.piece?.fade(layer === 'tense' ? 0.55 : 0, layer === 'tense' ? 2 : 1.2);
  }
  loop();
}

/** The sound has just come on: start what should be playing. */
export function wake() {
  const name = M.want;
  M.want = null;
  setCue(name);
  const layer = M.layer;
  M.layer = 'none';
  setFight(layer, M.fightOpts);
}

function loop() {
  if (M.timer || typeof setInterval !== 'function') return;
  M.timer = setInterval(() => {
    const c = ctx();
    if (!c || c.state !== 'running') return;
    const until = c.currentTime + 0.8;
    M.piece?.tick(until);
    M.fight?.tick(until);
  }, 120);
}

/** For checking how a cue sounds (offline): compose everything up to `until`. */
export function renderTicks(until) {
  M.piece?.tick(until);
  M.fight?.tick(until);
}
