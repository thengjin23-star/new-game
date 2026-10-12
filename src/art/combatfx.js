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

import { drawPerson } from './figures.js';
import { drawBigBeast } from './scenery.js';
import { INK, rgba } from './ink.js';
import { BEAST_MOVES } from '../content/moves.js';
import { TIER_NAME } from '../world/combat.js';

const RED = [168, 50, 42];
const JADE = [59, 106, 91];
const FIRE = [236, 120, 40];
const QI = [150, 225, 235];

// ── figures ──

/** A beast, foot at (0, 0), in the pose of what it is doing. tint: wash it red as a blow lands (cards only). */
export function paintBeast(ctx, b, t, now, { tint = true } = {}) {
  ctx.save();
  const st = b.state;
  let alpha = 1 - (b.fade || 0);
  if (b.phantom) alpha *= 0.8;
  ctx.globalAlpha *= alpha;
  if (st === 'dead') {
    // keels over onto its side
    const k = Math.min(1, b.st / 0.35);
    ctx.rotate(-b.face * 0.9 * k);
  } else if (st === 'windup') {
    // gathering itself: low and tense, a tremor running through it
    const p = Math.min(1, b.st / (b.wind || 0.5));
    ctx.translate(Math.sin(now * 60) * 0.8 * p, 0);
    ctx.scale(1 + 0.07 * p, 1 - (b.move === 'pounce' ? 0.18 : 0.09) * p);
  } else if (st === 'pounce') {
    // in the air
    const p = Math.min(1, (b.went || 0) / Math.max(1, b.len || 1));
    ctx.translate(0, -Math.sin(p * Math.PI) * 16);
    ctx.scale(1.14, 0.9);
  } else if (st === 'hop') {
    ctx.translate(0, -Math.sin(Math.min(1, b.st / 0.26) * Math.PI) * 9);
  } else if (st === 'recover') {
    ctx.scale(1.03, 0.94);
  } else if (st === 'howl') {
    ctx.rotate(-b.face * 0.2 * Math.min(1, b.st / 0.2));
  }
  drawBigBeast(ctx, b.kind, { t: t + b.home[0] * 0.01, face: b.face, moving: b.moving || st === 'pounce' || st === 'hop' });
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

/** The weapon through its swing: raised behind (p 0) to across in front (p 1), then easing back. */
function swing(ctx, weapon, face, p, after) {
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
  const len = weapon === 'qinggang_sword' ? 19 : 14;
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

/** Hands out, 靈力 gathering at the fingertips, then thrown. */
function cast(ctx, k, face, p, after, now) {
  const col = k?.fx === 'fire' ? FIRE : k?.fx === 'shield' ? [120, 170, 230] : QI;
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
  // a beast's coming blow: the whole of it faint, filling from the beast out as it gathers itself
  for (const b of C.beasts || []) {
    if (b.state !== 'windup' && b.state !== 'pounce') continue;
    if (b.move === 'bite' && b.state === 'windup') {
      const M = BEAST_MOVES.bite;
      const p = Math.min(1, b.st / b.wind);
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
    } else if (b.move === 'pounce') {
      const [fx, fy] = b.from || [b.x, b.y];
      const width = b.R.body * 2 + 12;
      const p = b.state === 'windup' ? Math.min(1, b.st / b.wind) : 1;
      const fade = b.state === 'pounce' ? 0.6 : 1;
      g.fillStyle = rgba(RED, 0.14 * fade);
      band(g, fx, fy, b.aim[0], b.aim[1], b.len, width);
      g.fill();
      g.fillStyle = rgba(RED, 0.32 * fade);
      band(g, fx, fy, b.aim[0], b.aim[1], b.len * p, width);
      g.fill();
      g.strokeStyle = rgba(RED, 0.75 * fade);
      g.lineWidth = lw(1.6);
      band(g, fx, fy, b.aim[0], b.aim[1], b.len, width);
      g.stroke();
      // an arrow at its far end, so you know which way it comes
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
    } else if (f.kind === 'slash' || f.kind === 'punch') {
      // the sweep of the blow, along the ground
      g.fillStyle = `rgba(250,246,236,${0.22 * (1 - p)})`;
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
  // over each beast: what it is, its realm, its blood
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of C.beasts || []) {
    if (b.state === 'gone' || b.state === 'vanished' || b.state === 'dead' || (b.fade || 0) > 0.5) continue;
    const [sx, sy] = proj(b.x, b.y, b.R.tall + 9);
    const near = Math.hypot(b.x - w.x, b.y - w.y) < 520;
    if (!near) continue;
    if (b.state === 'notice') mark(ctx, sx, sy - 4 * px, '？', 'rgba(35,32,27,0.9)', px, font);
    else if (b.aggro && b.armed) {
      const bw = 44 * px;
      const bh = 5 * px;
      const frac = Math.max(0, Math.min(1, b.hp / b.maxHp));
      ctx.fillStyle = 'rgba(30,26,22,0.6)';
      ctx.fillRect(sx - bw / 2 - px, sy - bh / 2 - px, bw + 2 * px, bh + 2 * px);
      ctx.fillStyle = 'rgba(186,52,40,0.95)';
      ctx.fillRect(sx - bw / 2, sy - bh / 2, bw * frac, bh);
      const tier = TIER_NAME[b.tier] || '';
      const label = b.phantom ? b.name : `${b.name}・${tier}`;
      ctx.font = `700 ${11 * px}px ${font}`;
      ctx.lineWidth = 3 * px;
      ctx.strokeStyle = 'rgba(250,246,236,0.9)';
      ctx.strokeText(label, sx, sy - 10 * px);
      ctx.fillStyle = b.gap > 0 ? 'rgba(170,30,24,1)' : 'rgba(110,34,26,1)';
      ctx.fillText(label, sx, sy - 10 * px);
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
    const text = pp.kind === 'crit' ? `${pp.text}!` : pp.kind === 'dmg' || pp.kind === 'burn' || pp.kind === 'hurt' ? `-${pp.text}` : pp.text;
    ctx.lineWidth = 3.2 * px;
    ctx.strokeStyle = 'rgba(250,246,236,0.95)';
    ctx.strokeText(text, sx, y);
    ctx.fillStyle = col;
    ctx.fillText(text, sx, y);
    ctx.globalAlpha = 1;
  });
  ctx.restore();
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
  // sword qi: a crescent of cold light, a faint wake behind it
  const [bx, by] = proj(sh.x - sh.ux * 40, sh.y - sh.uy * 40, 15);
  const tail = ctx.createLinearGradient(bx, by, x, y);
  tail.addColorStop(0, rgba(QI, 0));
  tail.addColorStop(1, rgba(QI, 0.45));
  ctx.strokeStyle = tail;
  ctx.lineWidth = 5 * k;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(x, y);
  ctx.stroke();
  const r = 13 * k;
  for (const [wd, col] of [[7, rgba(QI, 0.35)], [3.2, 'rgba(235,252,255,0.95)']]) {
    ctx.strokeStyle = col;
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
    case 'slash': {
      // the blade's arc sweeping across, bright, then gone
      const [cx, cy] = proj(f.x, f.y, 15);
      const [ex, ey] = proj(f.x + f.dir[0] * 10, f.y + f.dir[1] * 10, 15);
      const a = Math.atan2(ey - cy, ex - cx);
      const r = (f.reach * 0.75) * k;
      const sweep = Math.min(1, p * 2.2);
      const a0 = a - f.arc / 2;
      for (const [wd, col] of [[7, `rgba(250,246,236,${0.35 * (1 - p)})`], [2.6, `rgba(255,255,250,${0.95 * (1 - p)})`], [0.8, `rgba(36,33,30,${0.6 * (1 - p)})`]]) {
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
    case 'spark': {
      const [x, y] = proj(f.x, f.y, 14);
      const col = f.of === 'swordqi' ? QI : [255, 246, 220];
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
