// 即時戰鬥的畫: a fight as it looks, shared by the 3D world and the flat map.
//
//   paintBeast / paintHero — a beast or you, foot at (0, 0), in the pose of
//     what you are doing: gathering for a leap, in the air, swinging, casting,
//     stepping aside, taking a blow.
//   drawGroundMarks — what lies on the ground, drawn in world units: a beast's
//     coming blow (its mark filling as it gathers itself), where your spell
//     will go, whom you are after, scorch and dust.
//   drawCombatOverlay — what is in the air, drawn over everything: sword qi
//     and fireballs in flight, the flash of a blow, a burst, names, realms and
//     blood over the beasts, your shield, the numbers rising.
//
// Positions come through proj(x, y, up) and px is the size of one screen pixel
// in the drawing's own units (as in battlefx.js).

import { drawPerson, drawWolf, drawSnake, drawGhost } from './figures.js';
import { drawBigBeast, drawPose, lookOf } from './scenery.js';
import { INK, rgba } from './ink.js';
import { BEAST_MOVES } from '../content/moves.js';
import { rankOf } from '../world/combat.js';

const RED = [168, 50, 42];
const JADE = [59, 106, 91];
const FIRE = [236, 120, 40];
const QI = [150, 225, 235];
/** Sword qi thrown at you: a colder, redder light than yours. */
const FOE_QI = [222, 96, 84];
const SOUL = [170, 200, 240];

// ── figures ──

/** How the people you fight look: 山賊 masked, 獨眼龍 big and patched, a 劫修 in dark robes. */
const PEOPLE = {
  bandit: { look: { robe: [36, 34, 32], trim: [110, 30, 26], hair: 'bun', short: true }, weapon: 'chaidao', mask: true },
  bandit_chief: { look: { robe: [62, 44, 36], trim: [168, 132, 64], hair: 'bun', big: true }, weapon: 'chaidao', patch: true, blade: 20 },
  cultivator: { look: lookOf('foe'), weapon: 'qinggang_sword' },
};

/**
 * A beast (or a person, or the dead), foot at (0, 0), in the pose of what it
 * is doing. tint: wash it red as a blow lands (cards only). pic: a picture
 * to paint in place of the drawing (an asset for its kind), posed the same.
 */
export function paintBeast(ctx, b, t, now, { tint = true, pic = null } = {}) {
  ctx.save();
  const st = b.state;
  const person = !!b.R.person;
  const spirit = !!b.K.spirit;
  let alpha = 1 - (b.fade || 0);
  if (b.phantom) alpha *= 0.8;
  ctx.globalAlpha *= alpha;
  const M = b.move ? BEAST_MOVES[b.move] : null;
  const p = st === 'windup' ? Math.min(1, b.st / (b.wind || 0.5)) : 0;
  if (st === 'dead') {
    // keels over onto its side (a person lies where he fell; the dead come apart and drift up)
    const k = Math.min(1, b.st / 0.35);
    if (spirit) {
      ctx.translate(0, -b.st * 16);
      ctx.scale(1 + b.st * 0.35, 1 - Math.min(0.5, b.st * 0.25));
    } else if (!person) ctx.rotate(-b.face * 0.9 * k);
  } else if (st === 'windup') {
    // gathering itself: low and tense, a tremor running through it (a snake rears; a man sets his feet)
    if (b.kind === 'snake') ctx.scale(1 - 0.12 * p, 1 + 0.3 * p);
    else if (person || spirit) ctx.translate(-b.face * p * (M?.shape === 'fan' ? 2 : 0.6), 0);
    else {
      ctx.translate(Math.sin(now * 60) * 0.8 * p, 0);
      ctx.scale(1 + 0.07 * p, 1 - (M?.shape === 'leap' ? 0.18 : 0.09) * p);
    }
  } else if (st === 'leap') {
    // in the air (a man runs at you, low; a snake flies straight)
    const q = Math.min(1, (b.went || 0) / Math.max(1, b.len || 1));
    if (person) ctx.rotate(b.face * 0.18);
    else {
      ctx.translate(0, -Math.sin(q * Math.PI) * (b.kind === 'snake' ? 6 : 16));
      ctx.scale(1.14, 0.9);
    }
  } else if (st === 'hop') {
    ctx.translate(0, -Math.sin(Math.min(1, b.st / 0.26) * Math.PI) * 9);
  } else if (st === 'recover' && !person && !spirit) {
    ctx.scale(1.03, 0.94);
  } else if (st === 'howl') {
    ctx.rotate(-b.face * 0.2 * Math.min(1, b.st / 0.2));
  }
  if (pic) pic(ctx);
  else figure(ctx, b, t, now, p);
  if (tint) {
    ctx.globalCompositeOperation = 'source-atop';
    if (b.phantom) {
      ctx.fillStyle = 'rgba(120,170,235,0.42)';
      ctx.fillRect(-70, -90, 140, 100);
    }
    if (b.enraged && st !== 'dead') {
      ctx.fillStyle = `rgba(200,40,30,${0.16 + 0.08 * Math.sin(now * 9)})`;
      ctx.fillRect(-70, -90, 140, 100);
    }
    const flash = Math.max(0, 1 - (now - b.flashT) / 0.2);
    if (flash > 0) {
      ctx.fillStyle = `rgba(230,40,30,${0.65 * flash})`;
      ctx.fillRect(-70, -90, 140, 100);
    }
  }
  ctx.restore();
}

/** The drawing itself, by what it is. */
function figure(ctx, b, t, now, p) {
  const st = b.state;
  const tt = t + b.home[0] * 0.01;
  const face = b.face;
  const moving = b.moving || st === 'leap' || st === 'hop';
  const M = b.move ? BEAST_MOVES[b.move] : null;
  if (b.R.person) return personOf(ctx, b, tt, now, p);
  if (b.kind === 'wolf') return drawWolf(ctx, 0, 0, { t: tt, moving, face });
  if (b.kind === 'snake') return drawSnake(ctx, 0, 0, { t: st === 'windup' ? tt * 3 : tt, face });
  if (b.kind === 'ghost') {
    drawGhost(ctx, 0, 0, { t: tt, face });
    // cold gathering in its hands
    if (st === 'windup') orb(ctx, face * (M?.shape === 'shot' ? 9 : 11), -22, p, now, SOUL);
    return;
  }
  drawBigBeast(ctx, b.kind, { t: tt, face, moving });
}

/** A person: the blade raised as he gathers himself, across as it lands, easing back after; on his knees, or fallen. */
function personOf(ctx, b, t, now, p) {
  const P = PEOPLE[b.kind] || PEOPLE.cultivator;
  const st = b.state;
  const face = b.face;
  if (st === 'yield') {
    drawPose(ctx, P.look, 'kneel', { t, face });
    // the blade thrown down in front of him
    ctx.strokeStyle = 'rgba(190,190,182,1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(face * 9, -1);
    ctx.lineTo(face * 24, 1);
    ctx.stroke();
    return;
  }
  if (st === 'dead') return drawPose(ctx, P.look, 'lie', { t, face });
  drawPerson(ctx, 0, 0, P.look, { t, moving: b.moving || st === 'leap', face });
  const k = P.look.big ? 1.15 : 1;
  ctx.save();
  ctx.scale(k, k);
  if (P.mask) {
    ctx.fillStyle = 'rgba(30,28,26,1)';
    ctx.fillRect(-3.5 + face * 0.5, -29, 7, 3);
  }
  if (P.patch) {
    ctx.strokeStyle = 'rgba(30,28,26,1)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-4, -31);
    ctx.lineTo(4, -28);
    ctx.stroke();
    ctx.fillStyle = 'rgba(30,28,26,1)';
    ctx.beginPath();
    ctx.arc(face * 1.6, -29.4, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const M = b.move ? BEAST_MOVES[b.move] : null;
  const last = b.last ? BEAST_MOVES[b.last] : null;
  if (st === 'windup' && M?.shape === 'shot') cast(ctx, { fx: 'foeqi' }, face, p, 0, now);
  else if (st === 'windup') swing(ctx, P.weapon, face, p * 0.98, 0, P.blade);
  else if (st === 'leap') swing(ctx, P.weapon, face, 0.6, 0, P.blade);
  else if (st === 'recover' && last && last.shape !== 'shot') swing(ctx, P.weapon, face, 1, Math.min(1, b.st / 0.3), P.blade);
  else if (b.aggro || st === 'talk' || st === 'approach') swing(ctx, P.weapon, face, 0.35, 0, P.blade);
  ctx.restore();
}

/**
 * You, foot at (0, 0): walking as ever, but swinging, casting, leaning into a
 * dash, flashing red as you are hit. h: { act, dash, flashT, face, moving, weapon }.
 */
export function paintHero(ctx, look, h, t, now, { tint = true } = {}) {
  const face = h.face || 1;
  const a = h.act;
  ctx.save();
  if (h.dash) ctx.rotate(face * 0.24);
  drawPerson(ctx, 0, 0, look, { t, moving: h.moving || !!h.dash, face });
  if (a) {
    const p = a.at > 0 ? Math.min(1, a.t / a.at) : 1;
    const after = Math.max(0, (a.t - a.at) / Math.max(0.05, a.dur - a.at));
    if (a.kind === 'strike') swing(ctx, h.weapon, face, p, after);
    else cast(ctx, a.k, face, p, after, now);
  }
  if (tint) {
    const flash = Math.max(0, 1 - (now - h.flashT) / 0.22);
    if (flash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(230,40,30,${0.6 * flash})`;
      ctx.fillRect(-30, -50, 60, 60);
    }
  }
  ctx.restore();
}

/** The weapon through its swing: raised behind (p 0) to across in front (p 1), then easing back. blade: its length, if not the usual. */
function swing(ctx, weapon, face, p, after, blade = null) {
  ctx.lineCap = 'round';
  if (weapon === 'hunting_bow') {
    // the bow held out, the string drawn back, then loosed
    const pull = p < 1 ? p * 5 : Math.max(0, 5 - after * 20);
    ctx.strokeStyle = rgba([110, 76, 46], 1);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(face * 7, -19, 9, face > 0 ? -1.2 : Math.PI - 1.2, face > 0 ? 1.2 : Math.PI + 1.2);
    ctx.stroke();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(face * (7 + Math.cos(1.2) * 9), -19 - Math.sin(1.2) * 9);
    ctx.lineTo(face * (7 - pull), -19);
    ctx.lineTo(face * (7 + Math.cos(1.2) * 9), -19 + Math.sin(1.2) * 9);
    ctx.stroke();
    return;
  }
  if (!weapon || weapon === 'fists') {
    // a fist driven out
    const reach = p < 1 ? -2 + p * 12 : 10 - after * 6;
    ctx.strokeStyle = rgba([52, 58, 74], 1);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(face * 3, -21);
    ctx.lineTo(face * (6 + reach), -20);
    ctx.stroke();
    ctx.fillStyle = rgba([230, 210, 182], 1);
    ctx.beginPath();
    ctx.arc(face * (7 + reach), -20, 1.8, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // the angle as if facing right: up and behind, round to forward and down
  const ang = p < 1 ? -2.3 + p * 2.9 : 0.6 - after * 0.9;
  const hx = face * 5;
  const hy = -18;
  const len = blade || (weapon === 'qinggang_sword' ? 19 : 14);
  ctx.strokeStyle = weapon === 'qinggang_sword' ? 'rgba(214,224,232,1)' : 'rgba(190,190,182,1)';
  ctx.lineWidth = weapon === 'qinggang_sword' ? 1.4 : 2.4;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + face * Math.cos(ang) * len, hy + Math.sin(ang) * len);
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

/** Light gathering into a ball (p 0 to 1) at (x, y). */
function orb(ctx, x, y, p, now, col) {
  const r = 2 + p * 4;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, 'rgba(250,252,255,0.95)');
  g.addColorStop(0.35, rgba(col, 0.85));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4 + Math.sin(now * 30) * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Hands out, 靈力 gathering at the fingertips, then thrown. */
function cast(ctx, k, face, p, after, now) {
  const col = k?.fx === 'fire' ? FIRE : k?.fx === 'shield' ? [120, 170, 230] : k?.fx === 'foeqi' ? FOE_QI : QI;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba([52, 58, 74], 1);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(face * 3, -22);
  ctx.lineTo(face * (8 + p * 3), -25 - p * 3);
  if (k?.fx === 'shield') {
    ctx.moveTo(-face * 3, -22);
    ctx.lineTo(-face * (6 + p * 2), -26 - p * 3);
  }
  ctx.stroke();
  const r = (2 + p * 4) * (1 - after);
  if (r > 0.2) {
    const x = face * (11 + p * 3);
    const y = -28 - p * 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, `rgba(255,252,236,${0.95 * (1 - after)})`);
    g.addColorStop(0.35, rgba(col, 0.85 * (1 - after)));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4 + Math.sin(now * 30) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── on the ground ──

function fan(g, x, y, dir, r, arc) {
  const a = Math.atan2(dir[1], dir[0]);
  g.beginPath();
  g.moveTo(x, y);
  g.arc(x, y, r, a - arc / 2, a + arc / 2);
  g.closePath();
}

function band(g, x, y, ux, uy, len, width) {
  const nx = -uy * (width / 2);
  const ny = ux * (width / 2);
  g.beginPath();
  g.moveTo(x + nx, y + ny);
  g.lineTo(x + ux * len + nx, y + uy * len + ny);
  g.lineTo(x + ux * len - nx, y + uy * len - ny);
  g.lineTo(x - nx, y - ny);
  g.closePath();
}

function ring(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
}

/**
 * The marks on the ground, in world units on g (its transform takes world
 * units to its pixels). u: one world unit's width in g's pixels — for strokes
 * that should look the same at any scale.
 */
export function drawGroundMarks(g, s, C, kit, u = 1) {
  const now = C.t;
  const w = s.world;
  const lw = (n) => n / u;
  // a coming blow: the whole of it faint, filling from the one striking out as it gathers itself
  for (const b of C.beasts || []) {
    if (b.state !== 'windup' && b.state !== 'leap') continue;
    const M = BEAST_MOVES[b.move];
    if (!M) continue;
    const p = b.state === 'windup' ? Math.min(1, b.st / b.wind) : 1;
    if (M.shape === 'fan') {
      if (b.state !== 'windup') continue;
      const r = M.reach + 8;
      g.fillStyle = rgba(RED, 0.16);
      fan(g, b.x, b.y, b.aim, r, M.arc);
      g.fill();
      g.fillStyle = rgba(RED, 0.34);
      fan(g, b.x, b.y, b.aim, r * p, M.arc);
      g.fill();
      g.strokeStyle = rgba(RED, 0.75);
      g.lineWidth = lw(1.6);
      fan(g, b.x, b.y, b.aim, r, M.arc);
      g.stroke();
      continue;
    }
    if (M.shape === 'shot' && b.state !== 'windup') continue;
    // a leap (a rush, a strike) or a shot: a lane along the ground, an arrow at its far end
    const [fx, fy] = b.from || [b.x, b.y];
    const shot = M.shape === 'shot';
    const width = shot ? M.width + 8 : Math.max(M.width, b.R.body * 2 + 8);
    const fade = b.state === 'leap' ? 0.6 : 1;
    g.fillStyle = rgba(RED, (shot ? 0.1 : 0.14) * fade);
    band(g, fx, fy, b.aim[0], b.aim[1], b.len, width);
    g.fill();
    g.fillStyle = rgba(RED, (shot ? 0.26 : 0.32) * fade);
    band(g, fx, fy, b.aim[0], b.aim[1], b.len * p, width);
    g.fill();
    g.strokeStyle = rgba(RED, 0.75 * fade);
    g.lineWidth = lw(shot ? 1.2 : 1.6);
    if (shot) g.setLineDash([lw(8), lw(5)]);
    band(g, fx, fy, b.aim[0], b.aim[1], b.len, width);
    g.stroke();
    g.setLineDash([]);
    const ex = fx + b.aim[0] * b.len;
    const ey = fy + b.aim[1] * b.len;
    g.fillStyle = rgba(RED, 0.6 * fade);
    g.beginPath();
    g.moveTo(ex + b.aim[0] * 10, ey + b.aim[1] * 10);
    g.lineTo(ex - b.aim[1] * 9, ey + b.aim[0] * 9);
    g.lineTo(ex + b.aim[1] * 9, ey - b.aim[0] * 9);
    g.closePath();
    g.fill();
  }
  // whom you are after
  const me = C.me;
  const tgt = me?.target && (C.beasts || []).find((b) => b.uid === me.target && b.state !== 'dead' && b.state !== 'gone');
  if (tgt) {
    g.strokeStyle = rgba(RED, 0.8);
    g.lineWidth = lw(2);
    g.setLineDash([lw(7), lw(5)]);
    g.lineDashOffset = -now * lw(20);
    ring(g, tgt.x, tgt.y, tgt.R.body + 9);
    g.stroke();
    g.setLineDash([]);
  }
  // where your spell will go
  const pv = C.preview;
  const k = pv && kit.find((x) => x.id === pv.id);
  if (k && !k.locked) {
    const dx = pv.pt[0] - w.x;
    const dy = pv.pt[1] - w.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = d > 1 ? dx / d : me.dir[0];
    const uy = d > 1 ? dy / d : me.dir[1];
    const ready = !(me.cds[k.id] > 0) && me.mp >= k.mp;
    const col = ready ? [250, 246, 236] : [120, 110, 100];
    if (k.aim === 'line') {
      g.fillStyle = rgba(col, 0.32);
      band(g, w.x, w.y, ux, uy, k.range, k.width + 10);
      g.fill();
      g.strokeStyle = rgba(JADE, 0.85);
      g.lineWidth = lw(1.6);
      g.stroke();
    } else if (k.aim === 'ground') {
      const r = Math.min(d, k.range);
      const cx = w.x + ux * r;
      const cy = w.y + uy * r;
      g.strokeStyle = rgba(JADE, 0.5);
      g.lineWidth = lw(1.2);
      g.setLineDash([lw(6), lw(6)]);
      ring(g, w.x, w.y, k.range);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = rgba(ready ? FIRE : col, 0.3);
      ring(g, cx, cy, k.radius);
      g.fill();
      g.strokeStyle = rgba(ready ? [190, 70, 30] : col, 0.9);
      g.lineWidth = lw(1.8);
      g.stroke();
      g.strokeStyle = rgba(JADE, 0.6);
      g.lineWidth = lw(1.2);
      g.beginPath();
      g.moveTo(w.x, w.y);
      g.lineTo(cx, cy);
      g.stroke();
    } else if (k.aim === 'self') {
      g.strokeStyle = rgba([110, 160, 220], 0.9);
      g.lineWidth = lw(2);
      ring(g, w.x, w.y, 26);
      g.stroke();
    }
  }
  // your shield, a pale ring at your feet
  if (me?.shield > 0) {
    g.strokeStyle = `rgba(110,165,225,${0.55 + 0.15 * Math.sin(now * 6)})`;
    g.lineWidth = lw(2.2);
    ring(g, w.x, w.y, 20);
    g.stroke();
  }
  // scorch where a fireball burst; dust where a leap came down
  for (const f of C.fx) {
    const p = (now - f.t0) / f.dur;
    if (f.kind === 'boom') {
      g.fillStyle = `rgba(60,30,20,${0.3 * (1 - p)})`;
      ring(g, f.x, f.y, f.r * Math.min(1, 0.6 + p * 0.8));
      g.fill();
      g.strokeStyle = rgba(FIRE, 0.8 * (1 - p));
      g.lineWidth = lw(2.5);
      ring(g, f.x, f.y, f.r * (0.5 + p * 0.6));
      g.stroke();
    } else if (f.kind === 'land') {
      g.strokeStyle = `rgba(120,100,80,${0.5 * (1 - p)})`;
      g.lineWidth = lw(2);
      ring(g, f.x, f.y, 14 + p * 26);
      g.stroke();
    } else if (f.kind === 'slash' || f.kind === 'punch' || f.kind === 'cut') {
      // the sweep of the blow, along the ground
      g.fillStyle = f.foe ? rgba(RED, 0.2 * (1 - p)) : `rgba(250,246,236,${0.22 * (1 - p)})`;
      fan(g, f.x, f.y, f.dir, f.reach + 6, f.arc);
      g.fill();
    }
  }
}

// ── in the air ──

/** One world unit's height on the screen at (x, y) (in the drawing's units). */
function unitAt(proj, x, y) {
  const a = proj(x, y, 0);
  const b = proj(x, y, 30);
  return Math.max(0.2, Math.abs(a[1] - b[1]) / 30);
}

const POP = {
  dmg: ['rgba(196,46,36,1)', 15, '700'],
  crit: ['rgba(220,36,28,1)', 21, '900'],
  burn: ['rgba(214,110,40,1)', 12, '700'],
  hurt: ['rgba(150,20,20,1)', 16, '800'],
  miss: ['rgba(40,36,32,1)', 15, '700'],
  block: ['rgba(60,120,180,1)', 13, '700'],
  poison: ['rgba(64,128,58,1)', 14, '700'],
  status: ['rgba(64,128,58,1)', 13, '800'],
  heal: ['rgba(70,130,170,1)', 13, '700'],
  weak: ['rgba(120,112,104,1)', 13, '700'],
};

/**
 * Everything in the air. look: how you are drawn (for the after-images of a
 * dash). font: the family to write with.
 */
export function drawCombatOverlay(ctx, proj, px, s, C, look, t, font) {
  const now = C.t;
  const w = s.world;
  const me = C.me;
  ctx.save();
  ctx.lineCap = 'round';
  // after-images of a dash
  if (me?.trail?.length) {
    for (const tp of me.trail) {
      const age = (now - tp.t0) / 0.3;
      if (age >= 1) continue;
      const [sx, sy] = proj(tp.x, tp.y, 0);
      const k = unitAt(proj, tp.x, tp.y);
      ctx.save();
      ctx.globalAlpha = 0.28 * (1 - age);
      ctx.translate(sx, sy);
      ctx.scale(k, k);
      drawPerson(ctx, 0, 0, look, { t, moving: true, face: w.face || 1 });
      ctx.restore();
    }
  }
  // what flies
  for (const sh of C.shots) drawShot(ctx, proj, px, sh, now);
  // blows, bursts, cries
  for (const f of C.fx) drawFx(ctx, proj, px, f, now);
  // your shield, a pale bubble
  if (me?.shield > 0) {
    const [cx, cy] = proj(w.x, w.y, 17);
    const k = unitAt(proj, w.x, w.y);
    ctx.strokeStyle = `rgba(120,175,235,${0.6 + 0.15 * Math.sin(now * 6)})`;
    ctx.fillStyle = 'rgba(150,195,240,0.14)';
    ctx.lineWidth = 1.6 * px;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15 * k, 22 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // over each of them: what it is, its realm, its blood
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of C.beasts || []) {
    if (b.state === 'gone' || b.state === 'vanished' || b.state === 'dead' || (b.fade || 0) > 0.5) continue;
    const near = Math.hypot(b.x - w.x, b.y - w.y);
    if (b.state === 'hide') {
      // something in the long grass: it stirs as you come near
      if (near < 260) rustle(ctx, proj, px, b, now, near);
      continue;
    }
    if (near > 520) continue;
    const [sx, sy] = proj(b.x, b.y, b.R.tall + 9 + (b.K.spirit ? 6 : 0));
    if (b.state === 'notice') mark(ctx, sx, sy - 4 * px, '？', 'rgba(35,32,27,0.9)', px, font);
    else if (b.state === 'yield') say(ctx, sx, sy - 4 * px, '饒命！', px, font);
    else if (b.state === 'approach' || b.state === 'talk') nameTag(ctx, sx, sy, b.name, 'rgba(35,32,27,0.92)', px, font);
    else if (b.aggro && b.armed) {
      const bw = 44 * px;
      const bh = 5 * px;
      const frac = Math.max(0, Math.min(1, b.hp / b.maxHp));
      ctx.fillStyle = 'rgba(30,26,22,0.6)';
      ctx.fillRect(sx - bw / 2 - px, sy - bh / 2 - px, bw + 2 * px, bh + 2 * px);
      ctx.fillStyle = 'rgba(186,52,40,0.95)';
      ctx.fillRect(sx - bw / 2, sy - bh / 2, bw * frac, bh);
      const rank = rankOf(b);
      nameTag(ctx, sx, sy - 10 * px, rank ? `${b.name}・${rank}` : b.name, b.gap > 0 ? 'rgba(170,30,24,1)' : 'rgba(110,34,26,1)', px, font);
      let bx = sx + bw / 2 + 8 * px;
      for (const [on, ch, col] of [[b.burn, '灼', 'rgba(214,110,40,1)'], [b.enraged, '怒', 'rgba(190,40,30,1)']]) {
        if (!on) continue;
        ctx.fillStyle = 'rgba(250,246,236,0.92)';
        ctx.beginPath();
        ctx.arc(bx, sy, 6 * px, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.font = `700 ${9 * px}px ${font}`;
        ctx.fillText(ch, bx, sy + 0.5 * px);
        bx += 13 * px;
      }
    } else if (b.state === 'flee') mark(ctx, sx, sy, '…', 'rgba(35,32,27,0.7)', px, font);
  }
  // numbers rising off whoever took them (several at once stack)
  C.pops.forEach((pp, i) => {
    const age = now - pp.t0;
    let k = 0;
    for (let j = 0; j < i; j++) if (Math.abs(C.pops[j].x - pp.x) < 4 && Math.abs(C.pops[j].t0 - pp.t0) < 0.15) k++;
    // rising from just over the name
    const [sx, sy0] = proj(pp.x, pp.y, pp.up + 9);
    const lift = 24;
    const [col, size, weight] = POP[pp.kind] || POP.dmg;
    const grow = pp.kind === 'crit' ? 1 + Math.max(0, 0.3 - age) * 1.8 : 1;
    ctx.globalAlpha = Math.max(0, Math.min(1, (1.1 - age) / 0.4));
    ctx.font = `${weight} ${size * grow * px}px ${font}`;
    const y = sy0 - (lift + age * 34 + k * 16) * px;
    const text = pp.kind === 'crit' ? `${pp.text}!` : pp.kind === 'heal' ? `+${pp.text}` : MINUS.has(pp.kind) ? `-${pp.text}` : pp.text;
    ctx.lineWidth = 3.2 * px;
    ctx.strokeStyle = 'rgba(250,246,236,0.95)';
    ctx.strokeText(text, sx, y);
    ctx.fillStyle = col;
    ctx.fillText(text, sx, y);
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

/** Numbers that are blood lost. */
const MINUS = new Set(['dmg', 'burn', 'hurt', 'poison', 'weak']);

/** A name over someone's head. */
function nameTag(ctx, x, y, text, col, px, font) {
  ctx.font = `700 ${11 * px}px ${font}`;
  ctx.lineWidth = 3 * px;
  ctx.strokeStyle = 'rgba(250,246,236,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
}

/** A few words said aloud, in a bubble. */
function say(ctx, x, y, text, px, font) {
  ctx.font = `700 ${12 * px}px ${font}`;
  const wd = ctx.measureText(text).width + 12 * px;
  const ht = 18 * px;
  ctx.fillStyle = 'rgba(250,246,236,0.95)';
  ctx.strokeStyle = 'rgba(35,32,27,0.7)';
  ctx.lineWidth = 1 * px;
  ctx.beginPath();
  ctx.rect(x - wd / 2, y - ht / 2, wd, ht);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(35,32,27,1)';
  ctx.fillText(text, x, y + 0.5 * px);
}

/** Grass stirring where something lies hidden: faster, the closer you come. */
function rustle(ctx, proj, px, b, now, near) {
  const k = unitAt(proj, b.x, b.y);
  const fast = near < 140 ? 9 : 4;
  ctx.strokeStyle = `rgba(62,88,56,${0.75 - near / 520})`;
  ctx.lineWidth = 1.3 * px;
  for (let n = 0; n < 5; n++) {
    const ox = (n - 2) * 4.5;
    const [x, y] = proj(b.x + ox, b.y + (n % 2) * 2, 0);
    const sway = Math.sin(now * fast + n * 1.7) * 2.6 * k;
    const h = (7 + (n % 3) * 2.5) * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway * 0.3, y - h * 0.6, x + sway, y - h);
    ctx.stroke();
  }
}

function mark(ctx, x, y, ch, col, px, font) {
  ctx.font = `700 ${15 * px}px ${font}`;
  ctx.lineWidth = 3 * px;
  ctx.strokeStyle = 'rgba(250,246,236,0.85)';
  ctx.strokeText(ch, x, y);
  ctx.fillStyle = col;
  ctx.fillText(ch, x, y);
}

function drawShot(ctx, proj, px, sh, now) {
  const [x, y] = proj(sh.x, sh.y, 15);
  const [x2, y2] = proj(sh.x + sh.ux * 10, sh.y + sh.uy * 10, 15);
  const a = Math.atan2(y2 - y, x2 - x);
  const k = unitAt(proj, sh.x, sh.y);
  if (sh.kind === 'fire') {
    // a ball of fire with a tail of sparks
    for (let n = 4; n >= 1; n--) {
      const [tx, ty] = proj(sh.x - sh.ux * n * 9, sh.y - sh.uy * n * 9, 15 + Math.sin(now * 20 + n) * 1.5);
      ctx.fillStyle = rgba(FIRE, 0.35 - n * 0.06);
      ctx.beginPath();
      ctx.arc(tx, ty, (6 - n) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    const r = 7 * k;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
    g.addColorStop(0, 'rgba(255,248,210,1)');
    g.addColorStop(0.35, 'rgba(250,170,60,0.95)');
    g.addColorStop(0.75, 'rgba(220,70,30,0.5)');
    g.addColorStop(1, 'rgba(200,50,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (sh.kind === 'arrow') {
    ctx.strokeStyle = rgba(INK, 0.9);
    ctx.lineWidth = 1.4 * px;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * 12 * k, y - Math.sin(a) * 12 * k);
    ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }
  if (sh.kind === 'soul') {
    // a pale bolt of cold, wisps trailing off it
    for (let n = 5; n >= 1; n--) {
      const [tx, ty] = proj(sh.x - sh.ux * n * 7 + Math.sin(now * 9 + n) * 3, sh.y - sh.uy * n * 7, 15 + Math.cos(now * 7 + n) * 2);
      ctx.fillStyle = rgba(SOUL, 0.3 - n * 0.05);
      ctx.beginPath();
      ctx.arc(tx, ty, (6.5 - n) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    const r = 7 * k;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
    g.addColorStop(0, 'rgba(245,250,255,1)');
    g.addColorStop(0.4, rgba(SOUL, 0.85));
    g.addColorStop(1, rgba(SOUL, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // sword qi: a crescent of cold light, a faint wake behind it (red, thrown at you)
  const col = sh.kind === 'foeqi' ? FOE_QI : QI;
  const core = sh.kind === 'foeqi' ? 'rgba(255,236,230,0.95)' : 'rgba(235,252,255,0.95)';
  const [bx, by] = proj(sh.x - sh.ux * 40, sh.y - sh.uy * 40, 15);
  const tail = ctx.createLinearGradient(bx, by, x, y);
  tail.addColorStop(0, rgba(col, 0));
  tail.addColorStop(1, rgba(col, 0.45));
  ctx.strokeStyle = tail;
  ctx.lineWidth = 5 * k;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(x, y);
  ctx.stroke();
  const r = 13 * k;
  for (const [wd, c] of [[7, rgba(col, 0.35)], [3.2, core]]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = wd * px * Math.max(1, k);
    ctx.beginPath();
    ctx.arc(x - Math.cos(a) * r * 0.55, y - Math.sin(a) * r * 0.55, r, a - 1.15, a + 1.15);
    ctx.stroke();
  }
}

function drawFx(ctx, proj, px, f, now) {
  const p = Math.min(1, (now - f.t0) / f.dur);
  const k = unitAt(proj, f.x, f.y);
  switch (f.kind) {
    case 'cut':
    case 'slash': {
      // the blade's arc sweeping across, bright, then gone (theirs edged in red)
      const [cx, cy] = proj(f.x, f.y, 15);
      const [ex, ey] = proj(f.x + f.dir[0] * 10, f.y + f.dir[1] * 10, 15);
      const a = Math.atan2(ey - cy, ex - cx);
      const r = (f.reach * 0.75) * k;
      const sweep = Math.min(1, p * 2.2);
      const a0 = a - f.arc / 2;
      const edge = f.foe ? `rgba(168,50,42,${0.8 * (1 - p)})` : `rgba(36,33,30,${0.6 * (1 - p)})`;
      for (const [wd, col] of [[7, `rgba(250,246,236,${0.35 * (1 - p)})`], [2.6, `rgba(255,255,250,${0.95 * (1 - p)})`], [0.8, edge]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = wd * px;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a0 + f.arc * sweep);
        ctx.stroke();
      }
      break;
    }
    case 'punch': {
      const [x, y] = proj(f.x + f.dir[0] * 22, f.y + f.dir[1] * 22, 15);
      ctx.strokeStyle = `rgba(250,246,236,${0.9 * (1 - p)})`;
      ctx.lineWidth = 2 * px;
      for (let n = 0; n < 6; n++) {
        const a = (n / 6) * Math.PI * 2;
        const r0 = 4 * k * (1 + p);
        const r1 = 9 * k * (1 + p);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.stroke();
      }
      break;
    }
    case 'bite': {
      // white fangs snapping shut
      const [x, y] = proj(f.x + f.dir[0] * 20, f.y + f.dir[1] * 20, 12);
      const shut = Math.min(1, p * 3);
      ctx.strokeStyle = `rgba(255,250,240,${0.95 * (1 - p)})`;
      ctx.lineWidth = 2.2 * px;
      const r = 9 * k;
      ctx.beginPath();
      ctx.arc(x, y - r * (1 - shut) * 0.6, r, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + r * (1 - shut) * 0.6, r, Math.PI + 0.3, Math.PI * 2 - 0.3);
      ctx.stroke();
      break;
    }
    case 'grasp': {
      // three pale claws raking down
      const [x, y] = proj(f.x + f.dir[0] * 24, f.y + f.dir[1] * 24, 16);
      ctx.strokeStyle = rgba(SOUL, 0.95 * (1 - p));
      ctx.lineWidth = 2 * px;
      for (let n = -1; n <= 1; n++) {
        const r = 10 * k;
        const down = Math.min(1, p * 3) * r * 1.6;
        ctx.beginPath();
        ctx.moveTo(x + n * 5 * k - r * 0.3, y - r);
        ctx.quadraticCurveTo(x + n * 5 * k + r * 0.25, y - r + down * 0.5, x + n * 5 * k, y - r + down);
        ctx.stroke();
      }
      break;
    }
    case 'spark': {
      const [x, y] = proj(f.x, f.y, 14);
      const col = f.of === 'swordqi' ? QI : f.of === 'foeqi' ? FOE_QI : f.of === 'soul' ? SOUL : [255, 246, 220];
      ctx.strokeStyle = rgba(col, 0.95 * (1 - p));
      ctx.lineWidth = 1.6 * px;
      for (let n = 0; n < 7; n++) {
        const a = (n / 7) * Math.PI * 2 + 0.4;
        const r1 = (5 + p * 14) * k;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r1 * 0.4, y + Math.sin(a) * r1 * 0.4);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.stroke();
      }
      break;
    }
    case 'boom': {
      // a burst of flame, embers flying up
      const [x, y] = proj(f.x, f.y, 10);
      const r = f.r * k * (0.45 + p * 0.65);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,246,200,${0.95 * (1 - p)})`);
      g.addColorStop(0.4, `rgba(250,150,50,${0.75 * (1 - p)})`);
      g.addColorStop(1, 'rgba(210,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,190,90,${0.9 * (1 - p)})`;
      for (let n = 0; n < 9; n++) {
        const a = n * 2.4;
        const [ex, ey] = proj(f.x + Math.cos(a) * f.r * 0.6 * p, f.y + Math.sin(a) * f.r * 0.4 * p, 10 + p * 34 * (0.5 + (n % 3) * 0.3));
        ctx.beginPath();
        ctx.arc(ex, ey, 1.8 * px * Math.max(1, k), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'howl': {
      const [x, y] = proj(f.x, f.y, 22);
      ctx.strokeStyle = `rgba(150,30,24,${0.7 * (1 - p)})`;
      ctx.lineWidth = 2 * px;
      for (let n = 0; n < 3; n++) {
        const q = (p + n * 0.25) % 1;
        ctx.beginPath();
        ctx.arc(x, y, (8 + q * 40) * k, -2.4, -0.7);
        ctx.stroke();
      }
      break;
    }
    case 'shield': {
      const [x, y] = proj(f.x, f.y, 17);
      ctx.strokeStyle = `rgba(130,180,235,${0.9 * (1 - p)})`;
      ctx.lineWidth = 2.4 * px;
      ctx.beginPath();
      ctx.ellipse(x, y, (15 + p * 12) * k, (22 + p * 14) * k, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'dash': {
      // a smear of ink where you stood
      const [x, y] = proj(f.x, f.y, 8);
      const [x2, y2] = proj(f.x - f.dir[0] * 26, f.y - f.dir[1] * 26, 8);
      ctx.strokeStyle = `rgba(36,33,30,${0.35 * (1 - p)})`;
      ctx.lineWidth = 6 * px;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}
