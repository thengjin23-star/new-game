// 戰場的畫: the fighters as they stand, lunge, take a blow and fall; and over
// them what a fight looks like — a ring of ink on the ground, the bars over
// each head, blows in flight, the numbers rising. Shared by the 3D world and
// the flat map: positions come through `proj(x, y, up)`, and `px` is the
// size of one screen pixel in the drawing's own units.

import { drawPose, lookOf, drawBigBeast, BIG_BEASTS } from './scenery.js';
import { drawMob, LOOKS } from './figures.js';
import { swingOf } from './fightplayer.js';

const MOBS = new Set(['wolf', 'snake', 'bandit', 'ghost']);
const ARMED = new Set(['cultivator', 'enforcer', 'blood_robe', 'bandit', 'bandit_chief', 'masked', 'escort', 'swordsman']);

/** How tall someone stands as painted (for the bar just over their head). */
export function tallOf(u) {
  return { wolf: 19, snake: 15, demon_wolf: 25, wolf_king: 36, python: 41, bear: 27, skeleton: 71, ghost: 41 }[u.draw] || 37;
}

function personLook(u) {
  if (u.draw === 'player') return LOOKS.player;
  if (u.draw.startsWith('npc:')) return LOOKS[u.draw.slice(4)] || lookOf('foe');
  if (u.draw.startsWith('person:')) return lookOf(u.draw.slice(7));
  return lookOf('foe');
}

/** Paint a fighter with the foot at (0, 0). tint: wash them red as a blow lands (cards only). */
export function paintFighter(ctx, f, { t, tint = true }) {
  const { u, face, striking, flash, fallen } = f;
  ctx.save();
  if (fallen > 0) {
    ctx.globalAlpha *= Math.max(0, 1 - fallen);
    ctx.rotate(-face * Math.min(1, fallen * 2.5) * 1.3);
  }
  if (MOBS.has(u.draw)) drawMob(ctx, u.draw, 0, 0, { t: t * (striking ? 1.6 : 1), moving: striking, face });
  else if (BIG_BEASTS.has(u.draw)) drawBigBeast(ctx, u.draw, { t, face, moving: striking });
  else drawPose(ctx, personLook(u), striking ? 'fight' : f.armed ? 'sword' : 'stand', { t: striking ? t * 1.4 : t, face });
  if (flash > 0 && tint) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(214,40,30,${0.6 * flash})`;
    ctx.fillRect(-70, -110, 140, 120);
  }
  ctx.restore();
}

/**
 * Everyone on the field as they are to be drawn this moment: where (with
 * the lunge of a blow, the knock of taking one), which way they face,
 * whether they are striking, flashing, falling.
 */
export function fighters(s, fx, field) {
  const b = s.battle;
  const p = fx.progress();
  const beat = fx.beat;
  const base = new Map();
  for (const u of b.units) base.set(u.id, field.at({ t: fx.tOf(u.id), lane: u.lane, side: u.side }));
  const me = base.get('me');
  const foes = b.units.filter((u) => u.side === 'foe');
  const fx0 = foes.reduce((a, u) => a + base.get(u.id)[0], 0) / Math.max(1, foes.length);
  const out = [];
  for (const u of b.units) {
    const sh = fx.shown.get(u.id);
    if (!sh) continue;
    let fallen = 0;
    if (!sh.alive) {
      if (sh.deadT === null || sh.deadT < 0) continue;
      fallen = (fx.t - sh.deadT) / 0.9;
      if (fallen >= 1) continue;
    }
    let [x, y] = base.get(u.id);
    let striking = false;
    if (beat && beat.who === u.id && (beat.kind === 'attack' || beat.kind === 'skill' || beat.kind === 'item')) {
      const [s0, s1] = swingOf(beat);
      striking = p >= s0 && p <= s1 + 0.18;
      const tgt = beat.target && beat.target !== u.id ? base.get(beat.target) : null;
      if (tgt && p >= s0 && p <= s1 + 0.15) {
        const q = (p - s0) / (s1 + 0.15 - s0);
        const d = Math.hypot(tgt[0] - x, tgt[1] - y) || 1;
        const reach = beat.fx === 'arrow' || beat.fx === 'qi' || beat.fx === 'fire' || beat.fx === 'foxfire' || beat.fx === 'swordqi' || beat.fx === 'drain' ? 5 : 14;
        const k = Math.sin(q * Math.PI) * reach;
        x += ((tgt[0] - x) / d) * k;
        y += ((tgt[1] - y) / d) * k;
      }
    }
    const age = fx.t - sh.hitT;
    if (age >= 0 && age < 0.22 && sh.from && base.get(sh.from)) {
      const [ax, ay] = base.get(sh.from);
      const d = Math.hypot(x - ax, y - ay) || 1;
      const k = 7 * (1 - age / 0.22);
      x += ((x - ax) / d) * k;
      y += ((y - ay) / d) * k;
    }
    const lookX = u.side === 'foe' ? me[0] : fx0;
    const face = Math.abs(lookX - x) < 1 ? 1 : lookX < x ? -1 : 1;
    const flashAge = fx.t - sh.flashT;
    out.push({
      u, sh, x, y, face, striking, fallen,
      flash: flashAge >= 0 && flashAge < 0.2 ? 1 - flashAge / 0.2 : 0,
      armed: u.side === 'me' ? !!s.player.weapon : ARMED.has(u.kind) || !!personLook(u)?.sword,
      tall: tallOf(u),
      big: BIG_BEASTS.has(u.draw),
    });
  }
  return out;
}

// ── marks over the field ──

const POP_STYLE = {
  dmg: ['rgba(196,46,36,1)', 16, '700'],
  crit: ['rgba(214,40,30,1)', 22, '900'],
  heal: ['rgba(60,150,80,1)', 16, '700'],
  drain: ['rgba(130,70,160,1)', 15, '700'],
  miss: ['rgba(110,104,96,1)', 14, '700'],
  block: ['rgba(70,110,150,1)', 13, '700'],
  mp: ['rgba(70,110,170,1)', 12, '700'],
  poison: ['rgba(70,140,70,1)', 14, '700'],
  burn: ['rgba(214,110,40,1)', 14, '700'],
  status: ['rgba(60,56,50,1)', 14, '700'],
};

/**
 * Draw the ring, bars, names, marks of what ails each fighter, the blow in
 * flight, and the numbers. font: the family to write with.
 */
export function drawFightMarks(ctx, proj, px, s, fx, list, t, font) {
  const b = s.battle;
  const at = new Map(list.map((f) => [f.u.id, f]));
  // a ring of ink around the field
  const alive = list.filter((f) => !f.fallen);
  if (alive.length) {
    const cx = alive.reduce((a, f) => a + f.x, 0) / alive.length;
    const cy = alive.reduce((a, f) => a + f.y, 0) / alive.length;
    const r = Math.max(70, ...alive.map((f) => Math.hypot(f.x - cx, f.y - cy))) + 34;
    for (const [w, a, jit] of [[2.6, 0.28, 0], [1.1, 0.4, 3]]) {
      ctx.strokeStyle = `rgba(40,34,28,${a})`;
      ctx.lineWidth = w * px;
      ctx.beginPath();
      for (let k = 0; k <= 48; k++) {
        const ang = (k / 48) * Math.PI * 2;
        const rr = r + Math.sin(ang * 3 + jit) * 4 + jit;
        const [sx, sy] = proj(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.92, 0);
        if (k) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      }
      ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // bars and names
  for (const f of list) {
    if (f.fallen) continue;
    const u = f.u;
    const st = b.units.find((x) => x.id === u.id)?.st || {};
    const [sx, sy] = proj(f.x, f.y, f.tall + 7);
    const bw = (u.side === 'me' ? 46 : 40) * px;
    const bh = 5 * px;
    const frac = Math.max(0, Math.min(1, f.sh.hp / u.maxHp));
    ctx.fillStyle = 'rgba(30,26,22,0.55)';
    ctx.fillRect(sx - bw / 2 - px, sy - bh / 2 - px, bw + 2 * px, bh + 2 * px);
    ctx.fillStyle = u.side === 'foe' ? 'rgba(186,52,40,0.95)' : 'rgba(70,150,90,0.95)';
    ctx.fillRect(sx - bw / 2, sy - bh / 2, bw * frac, bh);
    if (u.side === 'me') {
      // you: a small seal of vermilion, so you are never lost among your own side
      const k = 13 * px;
      ctx.fillStyle = 'rgba(178,42,32,0.95)';
      ctx.fillRect(sx - k / 2, sy - 10 * px - k / 2, k, k);
      ctx.font = `700 ${10 * px}px ${font}`;
      ctx.fillStyle = 'rgba(252,244,232,1)';
      ctx.fillText('你', sx, sy - 10 * px + 0.5 * px);
    } else {
      ctx.font = `700 ${11 * px}px ${font}`;
      ctx.lineWidth = 3 * px;
      ctx.strokeStyle = 'rgba(250,246,236,0.85)';
      ctx.strokeText(u.name, sx, sy - 9 * px);
      ctx.fillStyle = u.side === 'foe' ? 'rgba(120,36,28,1)' : 'rgba(40,80,50,1)';
      ctx.fillText(u.name, sx, sy - 9 * px);
    }
    // what ails them (or guards them)
    const marks = [];
    if (st.poison) marks.push(['毒', 'rgba(70,140,70,1)']);
    if (st.burn) marks.push(['灼', 'rgba(214,110,40,1)']);
    if (st.stun) marks.push(['暈', 'rgba(60,56,50,1)']);
    if (st.guard) marks.push(['守', 'rgba(70,110,150,1)']);
    if (st.rage) marks.push(['怒', 'rgba(190,40,30,1)']);
    if (st.shield) marks.push(['盾', 'rgba(60,120,180,1)']);
    marks.forEach(([ch, col], k) => {
      const mx = sx + bw / 2 + (7 + k * 13) * px;
      ctx.fillStyle = 'rgba(250,246,236,0.9)';
      ctx.beginPath();
      ctx.arc(mx, sy, 6 * px, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.font = `700 ${9 * px}px ${font}`;
      ctx.fillText(ch, mx, sy + 0.5 * px);
    });
    if (st.shield) {
      const [bx, by] = proj(f.x, f.y, f.tall * 0.5);
      ctx.strokeStyle = `rgba(90,150,210,${0.45 + Math.sin(t * 4) * 0.1})`;
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.ellipse(bx, by, 18 * px, f.tall * 0.62 * (Math.abs(sy - by) / (f.tall * 0.5 + 7) || 1), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (fx.beat) blowFx(ctx, proj, px, fx, at, t);
  // numbers rising off whoever took them
  for (const pp of fx.pops) {
    const f = at.get(pp.id);
    if (!f) continue;
    const age = fx.t - pp.t0;
    const [sx, sy] = proj(f.x, f.y, f.tall + 20);
    const [col, size, weight] = POP_STYLE[pp.kind] || POP_STYLE.dmg;
    const grow = pp.kind === 'crit' ? 1 + Math.max(0, 0.35 - age) * 1.6 : 1;
    ctx.globalAlpha = Math.max(0, Math.min(1, (1.15 - age) / 0.45));
    ctx.font = `${weight} ${size * grow * px}px ${font}`;
    const y = sy - age * 30 * px;
    ctx.lineWidth = 3.2 * px;
    ctx.strokeStyle = 'rgba(250,246,236,0.95)';
    const text = pp.kind === 'crit' ? `${pp.text}!` : pp.kind === 'dmg' || pp.kind === 'poison' || pp.kind === 'burn' ? (/^\d/.test(pp.text) ? `-${pp.text}` : pp.text) : pp.text;
    ctx.strokeText(text, sx, y);
    ctx.fillStyle = col;
    ctx.fillText(text, sx, y);
    ctx.globalAlpha = 1;
  }
}

/** The blow of the current beat: in flight, landing, or what it leaves. */
function blowFx(ctx, proj, px, fx, at, t) {
  const beat = fx.beat;
  const p = fx.progress();
  const [s0, s1] = swingOf(beat);
  const actor = at.get(beat.who);
  if (!actor) return;
  const mid = (f) => proj(f.x, f.y, f.tall * 0.55);
  const targets = (beat.targets || (beat.target ? [beat.target] : [])).map((id) => at.get(id)).filter(Boolean);
  const [ax, ay] = mid(actor);
  const kind = beat.fx;
  const flight = p >= s0 && p < s1 ? (p - s0) / (s1 - s0) : -1;
  const after = p >= s1 ? (p - s1) / Math.max(0.05, 1 - s1) : -1;
  const ink = (a) => `rgba(36,30,26,${a})`;

  const orb = (x, y, r, inner, outer) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, outer);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const burst = (x, y, color, size, q) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * px * (1 - q);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3;
      const r0 = (4 + q * size * 0.5) * px;
      const r1 = (8 + q * size) * px;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
  };

  // things thrown across the field
  const PROJ = {
    arrow: (x, y, dx, dy) => {
      ctx.strokeStyle = ink(0.9);
      ctx.lineWidth = 1.4 * px;
      ctx.beginPath();
      ctx.moveTo(x - dx * 12 * px, y - dy * 12 * px);
      ctx.lineTo(x + dx * 4 * px, y + dy * 4 * px);
      ctx.stroke();
    },
    qi: (x, y) => orb(x, y, 9 * px, 'rgba(255,255,255,0.95)', 'rgba(170,210,255,0.6)'),
    swordqi: (x, y, dx, dy) => {
      ctx.strokeStyle = 'rgba(120,220,170,0.95)';
      ctx.lineWidth = 3 * px;
      const a = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.arc(x - dx * 6 * px, y - dy * 6 * px, 12 * px, a - 1.1, a + 1.1);
      ctx.stroke();
      orb(x, y, 8 * px, 'rgba(230,255,240,0.9)', 'rgba(120,220,170,0.4)');
    },
    fire: (x, y) => orb(x, y, 12 * px, 'rgba(255,240,180,1)', 'rgba(240,120,40,0.75)'),
    foxfire: (x, y) => orb(x, y, 12 * px, 'rgba(230,245,255,1)', 'rgba(90,150,255,0.75)'),
    talisman: (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 12);
      ctx.fillStyle = 'rgba(236,206,96,1)';
      ctx.fillRect(-4 * px, -7 * px, 8 * px, 14 * px);
      ctx.strokeStyle = 'rgba(180,40,30,0.9)';
      ctx.lineWidth = 0.8 * px;
      ctx.strokeRect(-2.5 * px, -5 * px, 5 * px, 10 * px);
      ctx.restore();
    },
    drain: (x, y) => orb(x, y, 10 * px, 'rgba(240,220,255,0.9)', 'rgba(140,80,190,0.6)'),
  };
  const BURST = { arrow: ink(0.7), qi: 'rgba(160,200,255,0.9)', swordqi: 'rgba(100,210,160,0.95)', fire: 'rgba(240,120,40,0.95)', foxfire: 'rgba(90,150,255,0.95)', talisman: 'rgba(90,150,255,0.95)', drain: 'rgba(140,80,190,0.9)' };

  if (PROJ[kind] && targets.length) {
    for (const tg of targets) {
      const [bx, by] = mid(tg);
      // a drain flows back from them to the one drinking it
      const [fx0, fy0, tx, ty] = kind === 'drain' ? [bx, by, ax, ay] : kind === 'talisman' ? [ax, ay - 30 * px, bx, by] : [ax, ay, bx, by];
      if (flight >= 0) {
        const q = flight;
        const x = fx0 + (tx - fx0) * q;
        const y = fy0 + (ty - fy0) * q - Math.sin(q * Math.PI) * (kind === 'arrow' ? 6 : 14) * px;
        const d = Math.hypot(tx - fx0, ty - fy0) || 1;
        PROJ[kind](x, y, (tx - fx0) / d, (ty - fy0) / d);
      } else if (after >= 0 && after < 0.6) {
        burst(bx, by, BURST[kind], kind === 'talisman' || kind === 'fire' || kind === 'foxfire' ? 26 : 16, after / 0.6);
        if (kind === 'fire' || kind === 'foxfire' || kind === 'talisman') orb(bx, by, (16 + after * 20) * px, kind === 'fire' ? 'rgba(255,220,150,0.5)' : 'rgba(200,225,255,0.5)', kind === 'fire' ? 'rgba(240,120,40,0.25)' : 'rgba(90,150,255,0.25)');
      }
    }
    return;
  }
  // blows that land up close
  if (['slash', 'punch', 'kick', 'bite', 'pounce', 'heavy', 'constrict', 'sweep'].includes(kind) && after >= 0 && after < 0.55) {
    const q = after / 0.55;
    for (const tg of targets) {
      const [bx, by] = mid(tg);
      if (kind === 'slash' || kind === 'sweep' || kind === 'heavy') {
        const dir = tg.x < actor.x ? -1 : 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * (1 - q)})`;
        ctx.lineWidth = (kind === 'heavy' ? 5 : 3.5) * px;
        ctx.beginPath();
        ctx.arc(bx - dir * 8 * px, by, (kind === 'sweep' ? 22 : 15) * px, dir > 0 ? -1.2 : Math.PI - 1.2, dir > 0 ? 1.0 : Math.PI + 1.0);
        ctx.stroke();
        ctx.strokeStyle = ink(0.5 * (1 - q));
        ctx.lineWidth = 1 * px;
        ctx.stroke();
      } else {
        burst(bx, by, ink(0.85), 14, q);
      }
      // a few drops of ink and blood
      if (kind === 'bite' || kind === 'heavy' || kind === 'pounce' || kind === 'slash') {
        for (let k = 0; k < 4; k++) {
          const a = k * 1.9 + beat.who.length;
          ctx.fillStyle = k % 2 ? `rgba(160,30,26,${0.8 * (1 - q)})` : ink(0.7 * (1 - q));
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * (6 + q * 16) * px, by + Math.sin(a) * (4 + q * 12) * px + q * q * 10 * px, (1.8 - q) * px * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    return;
  }
  // around the one who acts
  if ((kind === 'heal' || kind === 'shield' || kind === 'guard') && p > 0.15) {
    const q = (p - 0.15) / 0.85;
    if (kind === 'heal') {
      ctx.fillStyle = `rgba(80,180,100,${0.9 * (1 - q)})`;
      ctx.font = `700 ${12 * px}px sans-serif`;
      for (let k = 0; k < 5; k++) ctx.fillText('+', ax + Math.sin(k * 2.3) * 14 * px, ay + 10 * px - q * (24 + k * 4) * px);
    } else {
      ctx.strokeStyle = kind === 'shield' ? `rgba(90,150,210,${0.8 * (1 - q * 0.6)})` : `rgba(255,255,255,${0.9 * (1 - q)})`;
      ctx.lineWidth = 2.4 * px;
      ctx.beginPath();
      ctx.ellipse(ax, ay, (14 + q * 8) * px, (22 + q * 6) * px, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }
  if (kind === 'venom' && p > 0.3) {
    const q = (p - 0.3) / 0.7;
    for (const tg of targets) {
      const [bx, by] = mid(tg);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = `rgba(110,160,70,${0.35 * (1 - q)})`;
        ctx.beginPath();
        ctx.arc(bx + Math.sin(k * 2.1) * 12 * px, by + Math.cos(k * 1.7) * 6 * px, (8 + q * 10) * px, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
  if (kind === 'howl') {
    for (let k = 0; k < 3; k++) {
      const q = (p * 1.4 - k * 0.2) % 1;
      if (q < 0) continue;
      ctx.strokeStyle = `rgba(150,40,30,${0.6 * (1 - q)})`;
      ctx.lineWidth = 1.6 * px;
      ctx.beginPath();
      ctx.ellipse(ax, ay, (10 + q * 40) * px, (6 + q * 24) * px, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }
  if ((kind === 'poison' || kind === 'burn' || kind === 'stun') && p < 0.8) {
    const q = p / 0.8;
    if (kind === 'stun') {
      ctx.fillStyle = `rgba(200,160,40,${1 - q})`;
      ctx.font = `700 ${11 * px}px sans-serif`;
      for (let k = 0; k < 3; k++) {
        const a = t * 5 + (k * Math.PI * 2) / 3;
        ctx.fillText('★', ax + Math.cos(a) * 12 * px, ay - 24 * px + Math.sin(a) * 4 * px);
      }
    } else {
      ctx.fillStyle = kind === 'poison' ? `rgba(90,160,70,${0.6 * (1 - q)})` : `rgba(240,130,40,${0.7 * (1 - q)})`;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(ax + Math.sin(k * 2.4) * 8 * px, ay - q * 18 * px - k * 3 * px, (3 + k) * px, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
