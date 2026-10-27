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
// in the drawing's own units.

import { drawPerson, drawWolf, drawSnake, drawGhost, LOOKS } from './figures.js';
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
const FOX = [110, 160, 255];
const GOLD = [214, 170, 70];
const LEAF = [96, 168, 96];
const BLOOD = [176, 28, 36];
const VENOM = [96, 150, 60];
const DUST = [120, 100, 80];
const ICE = [170, 215, 245];
const WATER = [60, 120, 175];
const ICE_DEEP = [70, 130, 190];
/** 掌心雷: the white-blue of a bolt, and the blue round it. */
const BOLT = [214, 228, 255];
const BOLT_DEEP = [86, 118, 210];
/** The light a move gathers into as you cast it. */
const GLOW = { fire: FIRE, shield: [120, 170, 230], foeqi: FOE_QI, foxfire: FOX, mend: LEAF, iron: GOLD, sweep: GOLD, charge: GOLD, bloodqi: BLOOD, bloodring: BLOOD, blink: FOX, mirror: [246, 232, 170], bell: GOLD, feijian: QI, jianzhen: QI, vine: LEAF, frost: ICE, thunder: BOLT_DEEP, spikes: DUST, sandring: [196, 164, 110], sun: [250, 200, 90] };
/** 西漠's: sand flung and whirled; the gold of a dead abbot's palm and beads; starlight from a stone guard's eyes. */
const SAND = [196, 164, 110];
const STAR = [196, 214, 255];

// ── figures ──

/** How the people you fight look: 山賊 masked, 獨眼龍 big and patched; the rest by their kind's look (or the person they are). */
const PEOPLE = {
  bandit: { look: { robe: [36, 34, 32], trim: [110, 30, 26], hair: 'bun', short: true }, weapon: 'chaidao', mask: true },
  bandit_chief: { look: { robe: [62, 44, 36], trim: [168, 132, 64], hair: 'bun', big: true }, weapon: 'chaidao', patch: true, blade: 20 },
  // 西漠: 沙盜 in sand-colored cloth, the faces veiled; 禿鷲 big, black-turbaned, a great curved blade (the veil torn off when he goes all in)
  sand_bandit: { look: { robe: [138, 112, 78], trim: [96, 58, 40], hair: 'turban', wrapCol: [196, 180, 146], veil: true, short: true, skin: [196, 156, 116] }, weapon: 'sabre' },
  vulture: { look: { robe: [58, 46, 40], trim: [170, 130, 60], hair: 'turban', wrapCol: [44, 40, 38], veil: true, big: true, skin: [184, 140, 100] }, weapon: 'sabre', blade: 22, unveil: true },
};

function personLook(b) {
  const P = PEOPLE[b.kind];
  if (P?.unveil && b.enraged) return { ...P, look: { ...P.look, veil: false } };
  if (P) return P;
  return { look: (b.npcId && LOOKS[b.npcId]) || lookOf(b.R.look || 'foe'), weapon: b.R.weapon || 'qinggang_sword', mask: b.kind === 'masked' };
}

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
  } else if (st === 'howl' || st === 'roar' || (st === 'windup' && M?.shape === 'call' && !person)) {
    // head thrown back (a roar shakes it)
    ctx.rotate(-b.face * 0.2 * Math.min(1, b.st / 0.2));
    if (st === 'roar') ctx.translate(Math.sin(now * 50) * 0.7, 0);
  } else if (st === 'stun') {
    // reeling: a sway it cannot help
    ctx.rotate(Math.sin(now * 14) * 0.12);
  } else if (st === 'flinch') {
    // checked by a blow: thrown back on its heels a moment
    ctx.rotate(-b.face * 0.16 * (1 - Math.min(1, b.st / 0.16)));
  }
  // (0.20) a blow just landed: it gives a little, away from it, and comes back
  const struck = b.hitT !== undefined ? 1 - (now - b.hitT) / 0.14 : 0;
  if (struck > 0 && st !== 'dead') {
    ctx.translate(-b.face * 3.5 * struck, 0);
    ctx.scale(1 - 0.06 * struck, 1 + 0.04 * struck);
  }
  // about to be somewhere else: fading as it gathers itself
  if (st === 'windup' && M?.shape === 'blink') ctx.globalAlpha *= 1 - 0.75 * p;
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
      // (0.20) white-hot the moment it lands, then red as it fades
      ctx.fillStyle = flash > 0.75 ? `rgba(255,250,240,${0.85 * flash})` : `rgba(230,40,30,${0.65 * flash})`;
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
  const P = personLook(b);
  const st = b.state;
  const face = b.face;
  // knocked down (one at your side), or fallen
  if (st === 'down') return drawPose(ctx, P.look, 'lie', { t, face });
  // a spar ends with a bow, not on one's knees
  if (st === 'yield' && b.def.spar) return drawPerson(ctx, 0, 0, P.look, { t, face });
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
  if (st === 'windup' && M && M.shape !== 'fan' && M.shape !== 'leap') cast(ctx, { fx: GLOW[M.fx] ? M.fx : 'foeqi' }, face, p, 0, now);
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
  const len = blade || (weapon === 'qinggang_sword' ? 19 : weapon === 'sabre' ? 16 : 14);
  ctx.strokeStyle = weapon === 'qinggang_sword' ? 'rgba(214,224,232,1)' : weapon === 'sabre' ? 'rgba(206,202,190,1)' : 'rgba(190,190,182,1)';
  ctx.lineWidth = weapon === 'qinggang_sword' ? 1.4 : weapon === 'sabre' ? 2 : 2.4;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  const ex = hx + face * Math.cos(ang) * len;
  const ey = hy + Math.sin(ang) * len;
  // a curved blade (西漠's), bowed back along its length
  if (weapon === 'sabre') ctx.quadraticCurveTo(hx + face * Math.cos(ang - 0.45) * len * 0.62, hy + Math.sin(ang - 0.45) * len * 0.62, ex, ey);
  else ctx.lineTo(ex, ey);
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
  const col = GLOW[k?.fx] || QI;
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
    if ((b.state !== 'windup' && b.state !== 'leap') || b.side === 'ally') continue;
    const M = BEAST_MOVES[b.move];
    if (!M) continue;
    const p = b.state === 'windup' ? Math.min(1, b.st / b.wind) : 1;
    if (M.shape === 'call' || M.shape === 'blink') continue;
    if (M.shape === 'ring' || M.shape === 'zone') {
      // all round it, or where you stand: a circle filling as it gathers itself
      if (b.state !== 'windup') continue;
      const spots = M.shape === 'ring' ? [[b.x, b.y]] : b.zones || [];
      const r = M.radius + (M.shape === 'ring' ? 6 : 0);
      for (const [zx, zy] of spots) {
        g.fillStyle = rgba(RED, 0.13);
        ring(g, zx, zy, r);
        g.fill();
        g.fillStyle = rgba(RED, 0.3);
        ring(g, zx, zy, r * p);
        g.fill();
        g.strokeStyle = rgba(RED, 0.8);
        g.lineWidth = lw(M.shape === 'ring' ? 2.2 : 1.8);
        if (M.shape === 'zone') g.setLineDash([lw(7), lw(4)]);
        ring(g, zx, zy, r);
        g.stroke();
        g.setLineDash([]);
      }
      continue;
    }
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
    // a leap (a rush, a strike) or a shot (or a volley of them): a lane along the ground, an arrow at its far end
    const [fx, fy] = b.from || [b.x, b.y];
    const shot = M.shape === 'shot';
    const width = shot ? M.width + 8 : Math.max(M.width, b.R.body * 2 + 8);
    const fade = b.state === 'leap' ? 0.6 : 1;
    const n = shot ? M.count || 1 : 1;
    const a0 = Math.atan2(b.aim[1], b.aim[0]);
    for (let k = 0; k < n; k++) {
      const a = a0 + (k - (n - 1) / 2) * (M.spread || 0);
      const [ux, uy] = n > 1 ? [Math.cos(a), Math.sin(a)] : b.aim;
      g.fillStyle = rgba(RED, (shot ? 0.1 : 0.14) * fade);
      band(g, fx, fy, ux, uy, b.len, width);
      g.fill();
      g.fillStyle = rgba(RED, (shot ? 0.26 : 0.32) * fade);
      band(g, fx, fy, ux, uy, b.len * p, width);
      g.fill();
      g.strokeStyle = rgba(RED, 0.75 * fade);
      g.lineWidth = lw(shot ? 1.2 : 1.6);
      if (shot) g.setLineDash([lw(8), lw(5)]);
      band(g, fx, fy, ux, uy, b.len, width);
      g.stroke();
      g.setLineDash([]);
      const ex = fx + ux * b.len;
      const ey = fy + uy * b.len;
      g.fillStyle = rgba(RED, 0.6 * fade);
      g.beginPath();
      g.moveTo(ex + ux * 10, ey + uy * 10);
      g.lineTo(ex - uy * 9, ey + ux * 9);
      g.lineTo(ex + uy * 9, ey - ux * 9);
      g.closePath();
      g.fill();
    }
  }
  // ground that hurts: venom spat, fire, blood (fading in, and out as it ends)
  for (const pl of C.pools || []) {
    const a = Math.min(1, (now - pl.t0) / 0.25) * Math.max(0, Math.min(1, (pl.until - now) / 0.6));
    const col = pl.kind === 'venom' ? VENOM : pl.kind === 'blood' ? BLOOD : pl.kind === 'water' ? WATER : pl.kind === 'sand' ? SAND : FIRE;
    const fl = pl.kind === 'fire' ? 0.06 * Math.sin(now * 13 + pl.x * 0.3) : 0.03 * Math.sin(now * 4 + pl.y);
    g.fillStyle = rgba(col, (pl.kind === 'fire' ? 0.3 : 0.34) * a);
    ring(g, pl.x, pl.y, pl.r * (1 + fl));
    g.fill();
    g.strokeStyle = rgba(col, 0.7 * a);
    g.lineWidth = lw(1.4);
    ring(g, pl.x, pl.y, pl.r * (0.94 + fl));
    g.stroke();
    // a whirlpool: arms of it turning in toward the heart (quicksand: slower, the sand dark where it sinks)
    if (pl.kind === 'water' || pl.kind === 'sand') {
      const sand = pl.kind === 'sand';
      g.strokeStyle = sand ? rgba([120, 92, 58], 0.6 * a) : rgba([210, 232, 248], 0.7 * a);
      g.lineWidth = lw(1.6);
      for (let n = 0; n < 3; n++) {
        const a0 = now * (sand ? 1.4 : 3.2) + (n * Math.PI * 2) / 3;
        g.beginPath();
        for (let q = 0; q <= 12; q++) {
          const t = q / 12;
          const an = a0 + t * 2.6;
          const r = pl.r * (0.9 - t * 0.75);
          const x = pl.x + Math.cos(an) * r;
          const y = pl.y + Math.sin(an) * r;
          if (q) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
      }
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
    } else if (k.aim === 'bolt') {
      // 掌心雷 (地刺): where the sky (or the ground) will strike (it does not travel: no line to it)
      const r = Math.min(d, k.range);
      const cx = w.x + ux * r;
      const cy = w.y + uy * r;
      g.strokeStyle = rgba(BOLT_DEEP, 0.45);
      g.lineWidth = lw(1.2);
      g.setLineDash([lw(6), lw(6)]);
      ring(g, w.x, w.y, k.range);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = rgba(ready ? BOLT : col, 0.32);
      ring(g, cx, cy, k.radius);
      g.fill();
      g.strokeStyle = rgba(ready ? BOLT_DEEP : col, 0.95);
      g.lineWidth = lw(1.8);
      g.stroke();
      // (a cross where it lands)
      g.beginPath();
      g.moveTo(cx - 7, cy);
      g.lineTo(cx + 7, cy);
      g.moveTo(cx, cy - 7);
      g.lineTo(cx, cy + 7);
      g.stroke();
    } else if (k.aim === 'dash') {
      // where it will carry you
      g.fillStyle = rgba(col, 0.28);
      band(g, w.x, w.y, ux, uy, k.range, k.width);
      g.fill();
      g.strokeStyle = rgba(ready ? GOLD : col, 0.9);
      g.lineWidth = lw(1.6);
      g.stroke();
      const ex = w.x + ux * k.range;
      const ey = w.y + uy * k.range;
      g.fillStyle = rgba(ready ? GOLD : col, 0.8);
      g.beginPath();
      g.moveTo(ex + ux * 10, ey + uy * 10);
      g.lineTo(ex - uy * 9, ey + ux * 9);
      g.lineTo(ex + uy * 9, ey - ux * 9);
      g.closePath();
      g.fill();
    } else if (k.aim === 'around') {
      g.fillStyle = rgba(ready ? GOLD : col, 0.22);
      ring(g, w.x, w.y, k.radius);
      g.fill();
      g.strokeStyle = rgba(ready ? GOLD : col, 0.9);
      g.lineWidth = lw(1.8);
      g.stroke();
    } else if (k.aim === 'seek') {
      g.strokeStyle = rgba(ready ? FOX : col, 0.6);
      g.lineWidth = lw(1.2);
      g.setLineDash([lw(6), lw(6)]);
      ring(g, w.x, w.y, k.range);
      g.stroke();
      g.setLineDash([]);
    } else if (k.aim === 'self') {
      g.strokeStyle = rgba(GLOW[k.fx] || [110, 160, 220], 0.9);
      g.lineWidth = lw(2);
      ring(g, w.x, w.y, 26);
      g.stroke();
    }
  }
  // 回春: green at your feet while it works
  if (me?.regen) {
    g.strokeStyle = rgba(LEAF, 0.5 + 0.2 * Math.sin(now * 5));
    g.lineWidth = lw(2);
    ring(g, w.x, w.y, 18);
    g.stroke();
  }
  // 金剛: a ring of gold at your feet while it holds
  if (me?.ward) {
    g.strokeStyle = rgba(GOLD, 0.6 + 0.2 * Math.sin(now * 8));
    g.lineWidth = lw(2.4);
    ring(g, w.x, w.y, 22);
    g.stroke();
  }
  // your shield, a pale ring at your feet
  if (me?.shield > 0) {
    g.strokeStyle = `rgba(110,165,225,${0.55 + 0.15 * Math.sin(now * 6)})`;
    g.lineWidth = lw(2.2);
    ring(g, w.x, w.y, 20);
    g.stroke();
  }
  // scorch where a fireball burst; dust where a leap came down; green where the vines hold
  for (const f of C.fx) {
    const p = (now - f.t0) / f.dur;
    if (f.kind === 'vines') {
      g.fillStyle = rgba(LEAF, 0.16 * (1 - p));
      ring(g, f.x, f.y, f.r);
      g.fill();
      g.strokeStyle = rgba(LEAF, 0.55 * (1 - p));
      g.lineWidth = lw(2);
      ring(g, f.x, f.y, f.r);
      g.stroke();
    }
    if (f.kind === 'fell') {
      g.fillStyle = f.spirit ? rgba(SOUL, 0.25 * (1 - p)) : `rgba(30,26,22,${0.32 * (1 - p)})`;
      ring(g, f.x, f.y, (f.boss ? 30 : 16) * Math.min(1, 0.4 + p * 1.6));
      g.fill();
    }
    if (f.kind === 'thunder') {
      // 掌心雷: the ground lit white where it struck, then a scorch going grey
      g.fillStyle = rgba(p < 0.25 ? BOLT : [50, 50, 60], (p < 0.25 ? 0.55 : 0.28) * (1 - p));
      ring(g, f.x, f.y, f.r * Math.min(1, 0.7 + p));
      g.fill();
      g.strokeStyle = rgba(BOLT_DEEP, 0.85 * (1 - p));
      g.lineWidth = lw(2.4);
      ring(g, f.x, f.y, f.r * (0.4 + p * 0.7));
      g.stroke();
    }
    if (f.kind === 'boom') {
      g.fillStyle = `rgba(60,30,20,${0.3 * (1 - p)})`;
      ring(g, f.x, f.y, f.r * Math.min(1, 0.6 + p * 0.8));
      g.fill();
      g.strokeStyle = rgba(FIRE, 0.8 * (1 - p));
      g.lineWidth = lw(2.5);
      ring(g, f.x, f.y, f.r * (0.5 + p * 0.6));
      g.stroke();
    } else if (f.kind === 'sun') {
      // 大日輪: a wheel of gold light opening out from you over the ground, its spokes turning
      const q = Math.min(1, p * 1.8);
      g.fillStyle = rgba([250, 206, 110], 0.22 * (1 - p));
      ring(g, f.x, f.y, f.r * q);
      g.fill();
      g.strokeStyle = rgba([250, 214, 120], 0.85 * (1 - p));
      g.lineWidth = lw(3);
      ring(g, f.x, f.y, f.r * q);
      g.stroke();
      g.strokeStyle = rgba(GOLD, 0.6 * (1 - p));
      g.lineWidth = lw(1.6);
      g.beginPath();
      for (let n = 0; n < 12; n++) {
        const a = (n / 12) * Math.PI * 2 + p * 0.8;
        g.moveTo(f.x + Math.cos(a) * f.r * q * 0.35, f.y + Math.sin(a) * f.r * q * 0.35);
        g.lineTo(f.x + Math.cos(a) * f.r * q, f.y + Math.sin(a) * f.r * q);
      }
      g.stroke();
    } else if (f.kind === 'sweep') {
      // the sweep of a leg, all the way round
      g.strokeStyle = rgba(GOLD, 0.7 * (1 - p));
      g.lineWidth = lw(3);
      g.beginPath();
      g.arc(f.x, f.y, f.r * (0.6 + 0.4 * p), 0, Math.PI * 2 * Math.min(1, p * 2.5));
      g.stroke();
    } else if (f.kind === 'slashline') {
      // where the sword went through
      g.strokeStyle = `rgba(250,246,236,${0.55 * (1 - p)})`;
      g.lineWidth = lw(6 * (1 - p) + 1);
      g.beginPath();
      g.moveTo(f.x, f.y);
      g.lineTo(f.to[0], f.to[1]);
      g.stroke();
    } else if (f.kind === 'impact') {
      g.strokeStyle = `rgba(120,100,80,${0.55 * (1 - p)})`;
      g.lineWidth = lw(2.4);
      ring(g, f.x, f.y, 10 + p * 30);
      g.stroke();
    } else if (f.kind === 'land') {
      g.strokeStyle = `rgba(120,100,80,${0.5 * (1 - p)})`;
      g.lineWidth = lw(2);
      ring(g, f.x, f.y, 14 + p * 26);
      g.stroke();
    } else if ((f.kind === 'ring' || f.kind === 'roar' || f.kind === 'bloodring' || f.kind === 'bell' || f.kind === 'croak' || f.kind === 'sandring') && f.r) {
      // a shockwave running out to where it reached (a bell's, gold; a toad's croak, the green of its venom; a whirl of sand)
      const col = f.kind === 'bloodring' ? BLOOD : f.kind === 'roar' ? FIRE : f.kind === 'bell' ? GOLD : f.kind === 'croak' ? VENOM : f.kind === 'sandring' ? SAND : DUST;
      const r = f.r || 70;
      g.fillStyle = rgba(col, 0.14 * (1 - p));
      ring(g, f.x, f.y, r);
      g.fill();
      g.strokeStyle = rgba(col, 0.8 * (1 - p));
      g.lineWidth = lw(3.5 * (1 - p) + 1);
      ring(g, f.x, f.y, r * (0.3 + 0.7 * Math.min(1, p * 1.7)));
      g.stroke();
    } else if (f.kind === 'sense') {
      // 神識 running out over the ground, a pale ring and a fainter one behind
      for (const [lag, a] of [[0, 0.6], [0.18, 0.3]]) {
        const q = Math.max(0, Math.min(1, (now - f.t0 - lag) / (f.dur * 0.8)));
        if (q <= 0) continue;
        g.strokeStyle = `rgba(150,190,230,${a * (1 - q)})`;
        g.lineWidth = lw(2.4);
        ring(g, f.x, f.y, f.r * q);
        g.stroke();
      }
    } else if (f.kind === 'whirl') {
      // the water opening where you stood: rings running in
      for (const lag of [0, 0.2, 0.4]) {
        const q = Math.max(0, Math.min(1, (now - f.t0 - lag) / (f.dur * 0.7)));
        if (q <= 0 || q >= 1) continue;
        g.strokeStyle = rgba(WATER, 0.7 * (1 - q));
        g.lineWidth = lw(2.2);
        ring(g, f.x, f.y, f.r * (1.2 - q * 0.9));
        g.stroke();
      }
    } else if (f.kind === 'quake' || f.kind === 'spikes') {
      // the ground split open: cracks running out from the heart of it, and dust
      g.strokeStyle = `rgba(60,48,38,${0.85 * (1 - p)})`;
      g.lineWidth = lw(2);
      for (let n = 0; n < 7; n++) {
        const a = n * 0.9 + f.x * 0.013;
        const r = f.r * (0.6 + 0.35 * ((n * 37) % 10) / 10);
        g.beginPath();
        g.moveTo(f.x, f.y);
        g.lineTo(f.x + Math.cos(a) * r * 0.5 + Math.cos(a + 1.2) * 5, f.y + Math.sin(a) * r * 0.5 + Math.sin(a + 1.2) * 5);
        g.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
        g.stroke();
      }
      g.strokeStyle = rgba(DUST, 0.6 * (1 - p));
      g.lineWidth = lw(3);
      ring(g, f.x, f.y, f.r * (0.5 + p * 0.6));
      g.stroke();
    } else if (f.kind === 'sandspout') {
      // the sand heaving up from under where it burst: a mound of it, the hollow it leaves
      g.fillStyle = rgba(SAND, 0.4 * (1 - p));
      ring(g, f.x, f.y, f.r * Math.min(1, 0.4 + p * 1.4));
      g.fill();
      g.strokeStyle = `rgba(120,92,58,${0.7 * (1 - p)})`;
      g.lineWidth = lw(2.2);
      ring(g, f.x, f.y, f.r * (0.6 + p * 0.5));
      g.stroke();
    } else if (f.kind === 'venom') {
      // a splash of venom where it came down
      g.fillStyle = rgba(VENOM, 0.45 * (1 - p));
      for (let n = 0; n < 6; n++) {
        const a = n * 1.05 + f.y * 0.01;
        ring(g, f.x + Math.cos(a) * f.r * 0.6 * (0.4 + p), f.y + Math.sin(a) * f.r * 0.6 * (0.4 + p), 5 * (1 - p) + 2);
        g.fill();
      }
    } else if (f.kind === 'breath' || f.kind === 'spray' || f.kind === 'sand' || f.kind === 'zen') {
      // a sheet of fire (or venom, or flung sand, or the gold of a palm) over the ground in front of it
      g.fillStyle = rgba(f.kind === 'spray' ? VENOM : f.kind === 'sand' ? SAND : f.kind === 'zen' ? GOLD : FIRE, (f.kind === 'zen' ? 0.3 : 0.42) * (1 - p));
      fan(g, f.x, f.y, f.dir, f.reach * Math.min(1, 0.4 + p * 2), f.arc);
      g.fill();
    } else if (f.kind === 'web') {
      // a web flung over the ground: threads out from the heart of it, and rings across them
      const q = Math.min(1, p * 6);
      const fade = p > 0.75 ? (1 - p) / 0.25 : 1;
      g.strokeStyle = `rgba(236,234,226,${0.75 * fade})`;
      g.lineWidth = lw(1.2);
      g.beginPath();
      for (let n = 0; n < 8; n++) {
        const a = n * 0.785 + f.x * 0.01;
        g.moveTo(f.x, f.y);
        g.lineTo(f.x + Math.cos(a) * f.r * q, f.y + Math.sin(a) * f.r * q);
      }
      g.stroke();
      for (const rr of [0.35, 0.65, 0.95]) {
        g.beginPath();
        for (let n = 0; n <= 8; n++) {
          const a = n * 0.785 + f.x * 0.01;
          const x = f.x + Math.cos(a) * f.r * rr * q;
          const y = f.y + Math.sin(a) * f.r * rr * q;
          if (n) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
      }
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

/** Moves of the sword: what they strike shows a cut across it. */
const CUTS = new Set(['swordqi', 'swordstep', 'jianzhen', 'feijian']);

/** What each of the 五行 throws off where it lands (and a plain blow: ink). */
const HIT_EL = { 金: [246, 214, 120], 木: [96, 168, 96], 水: [120, 180, 235], 火: [250, 140, 50], 土: [150, 120, 84] };

/**
 * (0.20) The moment a blow lands, at the height of its body: a star of light
 * (larger and brighter for a heavy blow, larger again for a telling one), and
 * what the blow is made of flying off along its way — sparks of 金, leaves of
 * 木, drops of 水, embers of 火, dust of 土; a plain blow throws ink.
 */
function hitFx(ctx, proj, px, f, p, k) {
  const up = (f.tall || 20) * 0.55;
  const [x, y] = proj(f.x, f.y, up);
  const [dx, dy] = f.dir || [0, 0];
  const big = f.crit ? 1.7 : f.blow === 'heavy' ? 1.35 : f.blow === 'ally' || f.blow === 'array' ? 0.7 : 1;
  const u = Math.max(1, k) * px;
  // the star
  const rays = f.crit ? 8 : f.blow === 'heavy' ? 6 : 4;
  const flash = Math.max(0, 1 - p * 2.2);
  if (flash > 0) {
    ctx.strokeStyle = f.crit ? `rgba(255,236,170,${flash})` : `rgba(255,252,240,${0.95 * flash})`;
    ctx.lineWidth = (f.crit ? 2.6 : 1.8) * u;
    for (let n = 0; n < rays; n++) {
      const a = (n / rays) * Math.PI * 2 + (f.t0 * 13) % 1;
      const r0 = (3 + p * 6) * big * u;
      const r1 = (9 + p * 16) * big * u * (n % 2 ? 0.65 : 1);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
    if (f.crit) {
      ctx.strokeStyle = `rgba(220,60,40,${0.8 * flash})`;
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      ctx.arc(x, y, (6 + p * 22) * u, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // a sword's cut: a bright line across it, drawn out, then gone
  if (CUTS.has(f.of)) {
    const q = Math.min(1, p * 3);
    const fade = 1 - p;
    // (across the way the blow went: on screen, at a slant)
    const [ox, oy] = proj(f.x + dy * 20, f.y - dx * 20, up + 8);
    const [qx, qy] = proj(f.x - dy * 20, f.y + dx * 20, up - 8);
    const mx = (ox + qx) / 2;
    const my = (oy + qy) / 2;
    const ex = mx + (qx - mx) * q;
    const ey = my + (qy - my) * q;
    const sx = mx + (ox - mx) * q;
    const sy = my + (oy - my) * q;
    for (const [wd, c] of [[5, `rgba(150,225,235,${0.4 * fade})`], [1.8, `rgba(255,255,255,${0.95 * fade})`]]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = wd * u;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }
  // lightning: it crackles over what it struck
  if (f.of === 'thunder') {
    const fade = 1 - p;
    ctx.strokeStyle = `rgba(200,220,255,${0.95 * fade})`;
    ctx.lineWidth = 1.5 * u;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + ((f.t0 * 37) % 1) * 6 + p * 3;
      let cx = x;
      let cy = y;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 1; j <= 3; j++) {
        const r = j * 6 * u * (0.8 + p);
        const jit = (((i * 7 + j * 13 + Math.floor(p * 12)) % 5) - 2) * 0.35;
        cx = x + Math.cos(a + jit) * r;
        cy = y + Math.sin(a + jit) * r * 0.8;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    return;
  }
  // what flies off, along the blow (玄冰: shards of ice; 狐火: blue embers)
  const ice = f.of === 'frost';
  const fox = f.of === 'foxfire';
  const col = ice ? [210, 235, 255] : fox ? [110, 160, 255] : HIT_EL[f.el] || null;
  const n = Math.round((f.el ? 7 : 5) * Math.min(1.5, big));
  for (let i = 0; i < n; i++) {
    const seed = ((f.t0 * 977 + i * 0.618) % 1 + 1) % 1;
    const spread = (seed - 0.5) * 2.2;
    // (along the blow's way, fanned out; in screen terms, from where it landed)
    const [ax, ay] = proj(f.x + (dx * Math.cos(spread) - dy * Math.sin(spread)) * 30, f.y + (dy * Math.cos(spread) + dx * Math.sin(spread)) * 30, up);
    const vx = (ax - x) / 30;
    const vy = (ay - y) / 30;
    const go = (10 + seed * 18) * p * big;
    let px2 = x + vx * go;
    let py2 = y + vy * go;
    const fade = 1 - p;
    if (f.el === '火') py2 -= p * 14 * u;
    else if (f.el === '水' || f.el === '土' || !f.el) py2 += p * p * 10 * u;
    if (ice) {
      // shards of ice: thin bright splinters
      ctx.strokeStyle = rgba(col, 0.95 * fade);
      ctx.lineWidth = 1.8 * u;
      ctx.beginPath();
      ctx.moveTo(px2, py2);
      ctx.lineTo(px2 - vx * 5 + 1.5 * u, py2 - vy * 5 - 1.5 * u);
      ctx.stroke();
    } else if (f.el === '金') {
      // sparks: bright streaks
      ctx.strokeStyle = rgba(col, fade);
      ctx.lineWidth = 1.4 * u;
      ctx.beginPath();
      ctx.moveTo(px2, py2);
      ctx.lineTo(px2 - vx * 7, py2 - vy * 7);
      ctx.stroke();
    } else if (f.el === '木') {
      // leaves: small, turning
      ctx.save();
      ctx.translate(px2, py2);
      ctx.rotate(seed * 6 + p * 5);
      ctx.fillStyle = rgba(col, 0.9 * fade);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2 * u, 1.4 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.el === '土') {
      // dust: puffs that grow and thin out
      ctx.fillStyle = rgba(col, 0.45 * fade);
      ctx.beginPath();
      ctx.arc(px2, py2, (2 + p * 5) * u, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // drops of water, embers of fire, ink of a plain blow
      ctx.fillStyle = col ? rgba(col, 0.95 * fade) : `rgba(30,26,22,${0.75 * fade})`;
      ctx.beginPath();
      ctx.arc(px2, py2, (col ? 1.9 : 1.6 + seed) * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const POP = {
  dmg: ['rgba(196,46,36,1)', 15, '700'],
  heavy: ['rgba(176,30,22,1)', 18, '900'],
  crit: ['rgba(220,36,28,1)', 21, '900'],
  burn: ['rgba(214,110,40,1)', 12, '700'],
  hurt: ['rgba(150,20,20,1)', 16, '800'],
  miss: ['rgba(40,36,32,1)', 15, '700'],
  block: ['rgba(60,120,180,1)', 13, '700'],
  poison: ['rgba(64,128,58,1)', 14, '700'],
  status: ['rgba(64,128,58,1)', 13, '800'],
  heal: ['rgba(70,130,170,1)', 13, '700'],
  ally: ['rgba(120,84,60,1)', 13, '700'],
  weak: ['rgba(120,112,104,1)', 13, '700'],
  // a blow of the element that overcomes it (五行相剋); a run of 相生 (木生火…) over you
  ke: ['rgba(40,112,82,1)', 18, '900'],
  sheng: ['rgba(170,112,24,1)', 14, '900'],
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
  // 劍陣: the blades going round you, and the faint circle they cut
  if (me?.array) {
    const A = me.array;
    const k = unitAt(proj, w.x, w.y);
    const fade = Math.min(1, A.left / 0.4);
    for (let i = 0; i < A.n; i++) {
      const an = A.ang + (i / A.n) * Math.PI * 2;
      const bx = w.x + Math.cos(an) * A.r;
      const by = w.y + Math.sin(an) * A.r;
      const [sx, sy] = proj(bx, by, 15);
      const [tx, ty] = proj(bx - Math.sin(an) * 10, by + Math.cos(an) * 10, 15);
      // a wake behind each, the way it goes round
      const [wx, wy] = proj(bx + Math.sin(an) * 16, by - Math.cos(an) * 16, 15);
      ctx.strokeStyle = rgba(QI, 0.35 * fade);
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      sword(ctx, sx, sy, Math.atan2(ty - sy, tx - sx), k * 0.9, px, fade);
    }
  }
  // 金剛: gold about you; 回春: green motes rising off you
  if (me?.ward) {
    const [cx, cy] = proj(w.x, w.y, 17);
    const k = unitAt(proj, w.x, w.y);
    ctx.strokeStyle = rgba(GOLD, 0.55 + 0.2 * Math.sin(now * 8));
    ctx.lineWidth = 2 * px;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14 * k, 21 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (me?.regen) {
    const k = unitAt(proj, w.x, w.y);
    for (let n = 0; n < 7; n++) {
      const q = (now * 0.9 + n / 7) % 1;
      const [mx, my] = proj(w.x + Math.sin(n * 2.3 + now * 1.5) * 12, w.y, 4 + q * 38);
      ctx.fillStyle = rgba(LEAF, 0.95 * (1 - q));
      ctx.beginPath();
      ctx.arc(mx, my, (2.6 - q) * k * Math.max(1, px * 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // coiled about you: loops of the snake's body, tightening (or vines, out of the ground, round your
  // legs; or a spider's web, pale and sticky, round the whole of you)
  if (me?.held) {
    const k = unitAt(proj, w.x, w.y);
    const sq = 1 - 0.08 * Math.sin(now * 9);
    const H = me.held;
    for (const up of H.web ? [5, 12, 19, 26] : H.root ? [3, 8, 13] : [6, 13, 20]) {
      const [cx, cy] = proj(w.x, w.y, up);
      ctx.strokeStyle = H.web ? 'rgba(232,230,222,0.85)' : H.root ? 'rgba(52,104,46,0.95)' : 'rgba(70,90,52,0.95)';
      ctx.lineWidth = (H.web ? 1.6 : 3.4) * k * Math.max(1, px * 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 11 * k * sq, 4 * k, H.web ? up * 0.05 : 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = H.web ? 'rgba(255,255,250,0.6)' : 'rgba(150,170,110,0.7)';
      ctx.lineWidth = 1 * k * Math.max(1, px * 2);
      ctx.stroke();
    }
  }
  // flames dancing off the ground where it burns
  for (const pl of C.pools || []) {
    if (pl.kind !== 'fire') continue;
    const fade = Math.max(0, Math.min(1, (pl.until - now) / 0.6));
    for (let n = 0; n < 3; n++) {
      const q = (now * 1.3 + n / 3 + pl.x * 0.01) % 1;
      const a = n * 2.1 + pl.y * 0.02;
      const [fx, fy] = proj(pl.x + Math.cos(a) * pl.r * 0.45, pl.y + Math.sin(a) * pl.r * 0.3, 3 + q * 16);
      const k = unitAt(proj, pl.x, pl.y);
      ctx.fillStyle = rgba(q < 0.4 ? [255, 210, 110] : FIRE, 0.75 * (1 - q) * fade);
      ctx.beginPath();
      ctx.arc(fx, fy, (3.2 - q * 2) * k * Math.max(1, px * 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // over each of them: what it is, its realm, its blood
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of C.beasts || []) {
    if (b.state === 'gone' || b.state === 'vanished' || b.state === 'dead' || (b.fade || 0) > 0.5) continue;
    const near = Math.hypot(b.x - w.x, b.y - w.y);
    if (b.state === 'hide') {
      // something in the long grass: it stirs as you come near (your 神識 has found it: marked)
      if (b.sensedT > now) {
        const [hx, hy] = proj(b.x, b.y, b.R.tall + 10);
        mark(ctx, hx, hy, '伏', 'rgba(168,50,42,0.9)', px, font);
      } else if (near < 260) rustle(ctx, proj, px, b, now, near);
      continue;
    }
    if (near > 520) continue;
    const [sx, sy] = proj(b.x, b.y, b.R.tall + 9 + (b.K.spirit ? 6 : 0));
    if (b.state === 'stun') reel(ctx, sx, sy + 14 * px, px, now);
    if (b.side === 'ally') {
      // one at your side: name and blood in jade
      if (b.state === 'down') {
        nameTag(ctx, sx, sy + 18 * px, `${b.name}（倒地）`, 'rgba(90,86,78,0.9)', px, font);
        continue;
      }
      if (!b.armed || b.state === 'leave') continue;
      const bw = 38 * px;
      const bh = 4 * px;
      ctx.fillStyle = 'rgba(30,26,22,0.5)';
      ctx.fillRect(sx - bw / 2 - px, sy - bh / 2 - px, bw + 2 * px, bh + 2 * px);
      ctx.fillStyle = 'rgba(59,106,91,0.95)';
      ctx.fillRect(sx - bw / 2, sy - bh / 2, bw * Math.max(0, Math.min(1, b.hp / b.maxHp)), bh);
      nameTag(ctx, sx, sy - 9 * px, b.name, 'rgba(46,96,80,1)', px, font);
      continue;
    }
    if (b.state === 'notice') mark(ctx, sx, sy - 4 * px, '？', 'rgba(35,32,27,0.9)', px, font);
    else if (b.state === 'yield') say(ctx, sx, sy - 4 * px, b.def.spar ? '承讓。' : '饒命！', px, font);
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
      for (const [on, ch, col] of [[b.burn, '灼', 'rgba(214,110,40,1)'], [b.chill, '凍', 'rgba(70,130,190,1)'], [b.enraged, '怒', 'rgba(190,40,30,1)']]) {
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
    const grow = pp.kind === 'crit' ? 1 + Math.max(0, 0.3 - age) * 1.8 : pp.kind === 'heavy' ? 1 + Math.max(0, 0.2 - age) * 1.5 : 1;
    ctx.globalAlpha = Math.max(0, Math.min(1, (1.1 - age) / 0.4));
    ctx.font = `${weight} ${size * grow * px}px ${font}`;
    const y = sy0 - (lift + age * 34 + k * 16) * px;
    const text = pp.kind === 'crit' ? `暴擊 ${pp.text}!` : pp.kind === 'heal' ? `+${pp.text}` : MINUS.has(pp.kind) ? `-${pp.text}` : pp.text;
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
const MINUS = new Set(['dmg', 'heavy', 'burn', 'hurt', 'poison', 'weak', 'ally', 'ke']);

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

/** Reeling: little stars going round its head. */
function reel(ctx, x, y, px, now) {
  for (let n = 0; n < 3; n++) {
    const a = now * 6 + (n / 3) * Math.PI * 2;
    ctx.fillStyle = 'rgba(214,170,70,0.95)';
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 10 * px, y + Math.sin(a) * 3.5 * px, 2.2 * px, 0, Math.PI * 2);
    ctx.fill();
  }
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

/** A small 劍, its point along angle a: blade, guard, hilt (k: its scale here). */
function sword(ctx, x, y, a, k, px, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = `rgba(228,238,242,${alpha})`;
  ctx.strokeStyle = `rgba(56,66,76,${0.85 * alpha})`;
  ctx.lineWidth = 0.7 * px;
  ctx.beginPath();
  ctx.moveTo(15 * k, 0);
  ctx.lineTo(1 * k, -1.7 * k);
  ctx.lineTo(-4 * k, -1.5 * k);
  ctx.lineTo(-4 * k, 1.5 * k);
  ctx.lineTo(1 * k, 1.7 * k);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(160,124,50,${alpha})`;
  ctx.fillRect(-5.6 * k, -3.2 * k, 1.8 * k, 6.4 * k);
  ctx.fillStyle = `rgba(58,40,30,${alpha})`;
  ctx.fillRect(-10.5 * k, -1 * k, 5 * k, 2 * k);
  ctx.restore();
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
  if (sh.kind === 'rock') {
    // a stone the size of a fist, tumbling
    ctx.save();
    ctx.translate(x, y - 4 * k);
    ctx.rotate(now * 9 + sh.x * 0.05);
    ctx.fillStyle = 'rgba(120,112,100,1)';
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 0.9 * px;
    ctx.beginPath();
    ctx.moveTo(-5 * k, -2 * k);
    ctx.lineTo(-1 * k, -5 * k);
    ctx.lineTo(5 * k, -3 * k);
    ctx.lineTo(5 * k, 3 * k);
    ctx.lineTo(0, 5 * k);
    ctx.lineTo(-5 * k, 3 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (sh.kind === 'water') {
    // a jet of lake water: a bright head, spray trailing
    for (let n = 5; n >= 1; n--) {
      const [tx, ty] = proj(sh.x - sh.ux * n * 7 + Math.sin(now * 13 + n) * 2, sh.y - sh.uy * n * 7, 14 + Math.cos(now * 9 + n) * 1.5);
      ctx.fillStyle = rgba(WATER, 0.42 - n * 0.07);
      ctx.beginPath();
      ctx.arc(tx, ty, (5.5 - n * 0.7) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    const r = 6 * k;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    gr.addColorStop(0, 'rgba(236,248,255,1)');
    gr.addColorStop(0.5, rgba(WATER, 0.85));
    gr.addColorStop(1, rgba(WATER, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (sh.kind === 'feijian') {
    // the sword itself, point first (hilt first, coming home), a thin bright wake
    const [bx, by] = proj(sh.x - sh.ux * 34, sh.y - sh.uy * 34, 15);
    const tail = ctx.createLinearGradient(bx, by, x, y);
    tail.addColorStop(0, rgba(QI, 0));
    tail.addColorStop(1, rgba(QI, 0.55));
    ctx.strokeStyle = tail;
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x, y);
    ctx.stroke();
    sword(ctx, x, y, sh.home ? a + Math.PI : a, k, px);
    return;
  }
  if (sh.kind === 'frost') {
    // a shard of ice, a trail of cold mist
    for (let n = 4; n >= 1; n--) {
      const [tx, ty] = proj(sh.x - sh.ux * n * 8, sh.y - sh.uy * n * 8, 15 + Math.sin(now * 11 + n) * 1.2);
      ctx.fillStyle = rgba(ICE, 0.3 - n * 0.06);
      ctx.beginPath();
      ctx.arc(tx, ty, (5.5 - n) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(228,245,255,0.97)';
    ctx.strokeStyle = rgba(ICE_DEEP, 0.9);
    ctx.lineWidth = 0.9 * px;
    ctx.beginPath();
    ctx.moveTo(12 * k, 0);
    ctx.lineTo(-3 * k, -3.6 * k);
    ctx.lineTo(-8 * k, 0);
    ctx.lineTo(-3 * k, 3.6 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (sh.kind === 'vine') {
    // a seed of green light, flung to where the vines will come up
    ctx.fillStyle = rgba(LEAF, 0.35);
    ctx.beginPath();
    ctx.arc(x, y, 6 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,246,196,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 2.6 * k, 0, Math.PI * 2);
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
  if (sh.kind === 'mirror') {
    // a shaft of pale gold light off the mirror
    const [bx, by] = proj(sh.x - sh.ux * 60, sh.y - sh.uy * 60, 15);
    const beam = ctx.createLinearGradient(bx, by, x, y);
    beam.addColorStop(0, 'rgba(246,232,170,0)');
    beam.addColorStop(1, 'rgba(250,240,190,0.75)');
    ctx.strokeStyle = beam;
    ctx.lineWidth = 12 * k;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,252,236,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 5 * k, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (sh.kind === 'qi') {
    // a small bolt of 靈力, a short bright tail
    const [bx, by] = proj(sh.x - sh.ux * 18, sh.y - sh.uy * 18, 15);
    const tail = ctx.createLinearGradient(bx, by, x, y);
    tail.addColorStop(0, rgba(QI, 0));
    tail.addColorStop(1, rgba(QI, 0.6));
    ctx.strokeStyle = tail;
    ctx.lineWidth = 4 * k;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,252,255,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 3.2 * k, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (sh.kind === 'foxfire') {
    // a flame of cold blue, flickering as it turns
    const fl = 1 + Math.sin(now * 24 + (sh.seek || 0) * 2) * 0.15;
    for (let n = 3; n >= 1; n--) {
      const [tx, ty] = proj(sh.x - sh.ux * n * 7, sh.y - sh.uy * n * 7, 16 + n);
      ctx.fillStyle = rgba(FOX, 0.28 - n * 0.06);
      ctx.beginPath();
      ctx.arc(tx, ty, (5 - n) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    const r = 6 * k * fl;
    const g = ctx.createRadialGradient(x, y + r * 0.3, 0, x, y, r * 1.8);
    g.addColorStop(0, 'rgba(235,245,255,1)');
    g.addColorStop(0.45, rgba(FOX, 0.9));
    g.addColorStop(1, rgba(FOX, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.9);
    ctx.quadraticCurveTo(x + r * 1.2, y, x, y + r);
    ctx.quadraticCurveTo(x - r * 1.2, y, x, y - r * 1.9);
    ctx.fill();
    return;
  }
  if (sh.kind === 'beads') {
    // a prayer bead flung, spinning, gold edged in light, a short gleam behind it
    for (let n = 3; n >= 1; n--) {
      const [tx, ty] = proj(sh.x - sh.ux * n * 6, sh.y - sh.uy * n * 6, 15);
      ctx.fillStyle = rgba(GOLD, 0.3 - n * 0.07);
      ctx.beginPath();
      ctx.arc(tx, ty, (4.5 - n) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    const r = 3.6 * k * Math.max(1, px * 2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, 'rgba(255,246,200,0.9)');
    g.addColorStop(0.5, rgba(GOLD, 0.45));
    g.addColorStop(1, rgba(GOLD, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(122,82,40,1)';
    ctx.strokeStyle = 'rgba(240,206,120,1)';
    ctx.lineWidth = 0.8 * px * Math.max(1, k);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // the hole bored through it, turning
    const sp = now * 14 + sh.x * 0.1;
    ctx.fillStyle = 'rgba(40,26,14,0.9)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.3, r * 0.3 * Math.abs(Math.cos(sp)), sp, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (sh.kind === 'star') {
    // starlight out of a stone guard's eyes: a long cold beam, a hard white point, motes falling off it
    const wake = Math.min(sh.went || 60, 150);
    const [bx, by] = proj(sh.x - sh.ux * wake, sh.y - sh.uy * wake, 15);
    const tail = ctx.createLinearGradient(bx, by, x, y);
    tail.addColorStop(0, rgba(STAR, 0));
    tail.addColorStop(1, rgba(STAR, 0.6));
    ctx.strokeStyle = tail;
    ctx.lineWidth = 7 * k;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(250,252,255,0.9)';
    ctx.lineWidth = 1.4 * px * Math.max(1, k);
    ctx.stroke();
    for (let n = 0; n < 5; n++) {
      const q = ((now * 2.2 + n * 0.2) % 1) * Math.min(1, wake / 150);
      const [mx, my] = proj(sh.x - sh.ux * wake * q + Math.sin(n * 7.1) * 6, sh.y - sh.uy * wake * q + Math.cos(n * 5.3) * 5, 15 - q * 10);
      ctx.fillStyle = rgba(STAR, 0.8 * (1 - q));
      ctx.fillRect(mx - k, my - k, 2 * k, 2 * k);
    }
    const r = 6 * k;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, rgba(STAR, 0.9));
    g.addColorStop(1, rgba(STAR, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    // a four-pointed glint
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.9 * px * Math.max(1, k);
    ctx.beginPath();
    ctx.moveTo(x - r * 1.8, y);
    ctx.lineTo(x + r * 1.8, y);
    ctx.moveTo(x, y - r * 1.8);
    ctx.lineTo(x, y + r * 1.8);
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
  const col = sh.kind === 'foeqi' ? FOE_QI : sh.kind === 'bloodqi' ? BLOOD : QI;
  const core = sh.kind === 'foeqi' ? 'rgba(255,236,230,0.95)' : sh.kind === 'bloodqi' ? 'rgba(255,200,196,0.95)' : 'rgba(235,252,255,0.95)';
  // (0.20) the way it cut: a long wake from where it was loosed, a bright thread down its middle
  const wake = Math.min(sh.went || 40, sh.kind === 'swordqi' ? 110 : 40);
  const [bx, by] = proj(sh.x - sh.ux * wake, sh.y - sh.uy * wake, 15);
  const tail = ctx.createLinearGradient(bx, by, x, y);
  tail.addColorStop(0, rgba(col, 0));
  tail.addColorStop(1, rgba(col, 0.45));
  ctx.strokeStyle = tail;
  ctx.lineWidth = 5 * k;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(x, y);
  ctx.stroke();
  if (sh.kind === 'swordqi') {
    const thread = ctx.createLinearGradient(bx, by, x, y);
    thread.addColorStop(0, 'rgba(255,255,255,0)');
    thread.addColorStop(1, 'rgba(255,255,255,0.8)');
    ctx.strokeStyle = thread;
    ctx.lineWidth = 1.2 * px * Math.max(1, k);
    ctx.stroke();
  }
  const r = 13 * k;
  // after-images of the crescent along its way
  if (sh.kind === 'swordqi') {
    for (let n = 1; n <= 3; n++) {
      const back = n * 16;
      if (back > (sh.went || 0)) break;
      const [ax, ay] = proj(sh.x - sh.ux * back, sh.y - sh.uy * back, 15);
      ctx.strokeStyle = rgba(col, 0.32 - n * 0.08);
      ctx.lineWidth = (3.2 - n * 0.6) * px * Math.max(1, k);
      ctx.beginPath();
      ctx.arc(ax - Math.cos(a) * r * 0.55, ay - Math.sin(a) * r * 0.55, r * (1 - n * 0.08), a - 1.1, a + 1.1);
      ctx.stroke();
    }
  }
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
      // (the heavy third of a run: a broader, brighter stroke)
      const wide = f.heavy ? 1.8 : 1;
      for (const [wd, col] of [[7, `rgba(250,246,236,${0.35 * (1 - p)})`], [2.6, `rgba(255,255,250,${0.95 * (1 - p)})`], [0.8, edge]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = wd * px * wide;
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
    case 'slashline': {
      // the sword's path, a thin crescent of light
      const [x0, y0] = proj(f.x, f.y, 14);
      const [x1, y1] = proj(f.to[0], f.to[1], 14);
      ctx.strokeStyle = `rgba(255,255,250,${0.9 * (1 - p)})`;
      ctx.lineWidth = (3.5 * (1 - p) + 0.6) * px;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 10 * k, x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(36,33,30,${0.5 * (1 - p)})`;
      ctx.lineWidth = 0.8 * px;
      ctx.stroke();
      break;
    }
    case 'impact': {
      // a blow that throws: a burst of strokes
      const [x, y] = proj(f.x, f.y, 14);
      ctx.strokeStyle = rgba(GOLD, 0.95 * (1 - p));
      ctx.lineWidth = 2.2 * px;
      for (let n = 0; n < 8; n++) {
        const a = (n / 8) * Math.PI * 2;
        const r0 = 6 * k * (1 + p);
        const r1 = 15 * k * (1 + p);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.stroke();
      }
      break;
    }
    case 'sweep': {
      const [x, y] = proj(f.x, f.y, 6);
      ctx.strokeStyle = `rgba(250,246,236,${0.8 * (1 - p)})`;
      ctx.lineWidth = 3 * px;
      ctx.beginPath();
      ctx.ellipse(x, y, f.r * k * (0.6 + 0.4 * p), f.r * k * 0.45 * (0.6 + 0.4 * p), 0, 0, Math.PI * 2 * Math.min(1, p * 2.5));
      ctx.stroke();
      break;
    }
    case 'mend':
    case 'iron': {
      // green rising (回春), or a flash of gold (金剛)
      const col = f.kind === 'mend' ? LEAF : GOLD;
      const [x, y] = proj(f.x, f.y, 17);
      ctx.strokeStyle = rgba(col, 0.9 * (1 - p));
      ctx.lineWidth = 2.4 * px;
      ctx.beginPath();
      ctx.ellipse(x, y, (14 + p * 14) * k, (21 + p * 16) * k, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'claw':
    case 'grasp': {
      // three claws raking down (pale, from the dead)
      const [x, y] = proj(f.x + f.dir[0] * 24, f.y + f.dir[1] * 24, 16);
      ctx.strokeStyle = f.kind === 'claw' ? `rgba(250,246,236,${0.95 * (1 - p)})` : rgba(SOUL, 0.95 * (1 - p));
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
    case 'thunder': {
      // 掌心雷: a bolt out of the sky, forked and flickering, and sparks where it struck
      const [gx, gy] = proj(f.x, f.y, 0);
      const [tx, ty] = proj(f.x, f.y, 300);
      const on = p < 0.4 && (p < 0.12 || Math.floor(p * 40) % 3 !== 1);
      if (on) {
        // (the same jag for the whole of one strike: its own seed)
        const seed = (f.t0 * 997) % 1;
        const steps = 9;
        const pts = [[tx, ty]];
        for (let n = 1; n < steps; n++) {
          const q = n / steps;
          const off = (((seed * 9301 + n * 49297) % 233280) / 233280 - 0.5) * 34 * px * Math.max(1, k);
          pts.push([tx + (gx - tx) * q + off, ty + (gy - ty) * q]);
        }
        pts.push([gx, gy]);
        for (const [wd, col] of [[9, `rgba(110,140,230,${0.35 * (1 - p)})`], [3.2, `rgba(225,235,255,${0.95 - p})`], [1.2, 'rgba(255,255,255,0.95)']]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = wd * px * Math.max(1, k);
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
          ctx.stroke();
        }
        // a fork off the middle
        const m = pts[4];
        ctx.strokeStyle = `rgba(200,215,255,${0.7 * (1 - p)})`;
        ctx.lineWidth = 1.6 * px * Math.max(1, k);
        ctx.beginPath();
        ctx.moveTo(m[0], m[1]);
        ctx.lineTo(m[0] + 22 * px * k * (seed > 0.5 ? 1 : -1), m[1] + 30 * px * k);
        ctx.stroke();
      }
      // the flash on the ground, and sparks thrown up
      const r = f.r * k * (0.3 + p * 0.5);
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      glow.addColorStop(0, `rgba(240,245,255,${0.9 * (1 - p)})`);
      glow.addColorStop(1, 'rgba(120,150,240,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(210,225,255,${0.9 * (1 - p)})`;
      for (let n = 0; n < 8; n++) {
        const a = n * 0.785 + 0.3;
        const [ex, ey] = proj(f.x + Math.cos(a) * f.r * 0.7 * p, f.y + Math.sin(a) * f.r * 0.5 * p, 6 + p * 26 * (0.6 + (n % 3) * 0.3));
        ctx.beginPath();
        ctx.arc(ex, ey, 1.6 * px * Math.max(1, k), 0, Math.PI * 2);
        ctx.fill();
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
    case 'roar': {
      // a roar: arcs of it thrown out from the head, red-gold
      const [x, y] = proj(f.x, f.y, 26);
      ctx.strokeStyle = rgba(FIRE, 0.8 * (1 - p));
      ctx.lineWidth = 2.6 * px;
      for (let n = 0; n < 4; n++) {
        const q = (p * 1.4 + n * 0.22) % 1;
        ctx.beginPath();
        ctx.arc(x, y, (10 + q * 60) * k, -2.6, -0.5);
        ctx.stroke();
      }
      break;
    }
    case 'tongue': {
      // a toad's tongue: out along the line, long and pink, the sticky end swollen — and back
      const out = p < 0.45 ? p / 0.45 : 1 - (p - 0.45) / 0.55;
      const [x0, y0] = proj(f.x + f.dir[0] * 12, f.y + f.dir[1] * 12, 12);
      const [x1, y1] = proj(f.x + f.dir[0] * f.reach * out, f.y + f.dir[1] * f.reach * out, 8);
      ctx.strokeStyle = 'rgba(206,104,120,0.95)';
      ctx.lineWidth = 3 * px * Math.max(1, k);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 8 * k * out, x1, y1);
      ctx.stroke();
      ctx.fillStyle = 'rgba(226,128,140,1)';
      ctx.beginPath();
      ctx.arc(x1, y1, 3.6 * k * Math.max(1, px * 2), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'croak': {
      // the croak: green arcs thrown out from its swelling throat
      const [x, y] = proj(f.x, f.y, 14);
      ctx.strokeStyle = rgba(VENOM, 0.85 * (1 - p));
      ctx.lineWidth = 2.6 * px;
      for (let n = 0; n < 4; n++) {
        const q = (p * 1.4 + n * 0.22) % 1;
        ctx.beginPath();
        ctx.arc(x, y, (10 + q * 60) * k, -2.8, -0.3);
        ctx.stroke();
      }
      break;
    }
    case 'blink': {
      // a puff of blue fox fire where she was (or is)
      const [x, y] = proj(f.x, f.y, 18);
      for (let n = 0; n < 7; n++) {
        const a = n * 0.9;
        const r = (6 + p * 22) * k;
        ctx.fillStyle = rgba(FOX, 0.6 * (1 - p));
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7 - p * 10 * k, (3.5 - p * 2) * k * Math.max(1, px * 2), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'spray': {
      // venom sprayed from its jaws: green drops flung out over the ground in front
      for (let n = 0; n < 12; n++) {
        const q = (n / 12 + p * 0.9) % 1;
        const side = Math.sin(n * 2.3) * f.arc * 0.45;
        const a = Math.atan2(f.dir[1], f.dir[0]) + side;
        const [x, y] = proj(f.x + Math.cos(a) * f.reach * q, f.y + Math.sin(a) * f.reach * q, 16 - q * 12);
        ctx.fillStyle = rgba(VENOM, 0.85 * (1 - p));
        ctx.beginPath();
        ctx.arc(x, y, (2 + q * 2.5) * k * Math.max(1, px * 2), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'breath': {
      // flame pouring from its jaws over the ground in front
      for (let n = 0; n < 10; n++) {
        const q = (n / 10 + p * 0.8) % 1;
        const side = Math.sin(n * 2.3) * f.arc * 0.4;
        const a = Math.atan2(f.dir[1], f.dir[0]) + side;
        const [x, y] = proj(f.x + Math.cos(a) * f.reach * q, f.y + Math.sin(a) * f.reach * q, 14 + q * 6);
        const r = (4 + q * 9) * k * (1 - p * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,240,170,${0.9 * (1 - p)})`);
        g.addColorStop(0.5, rgba(FIRE, 0.7 * (1 - p)));
        g.addColorStop(1, rgba(FIRE, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'shield': {
      // (0.20) 護體 closing round you: a flash, the shell drawing in from wide to close, six
      // marks of light turning on it — then the pale bubble that stays while it holds
      const [x, y] = proj(f.x, f.y, 17);
      const q = Math.min(1, p / 0.4);
      const ease = 1 - (1 - q) ** 3;
      const rx = (15 + (1 - ease) * 20) * k;
      const ry = (22 + (1 - ease) * 24) * k;
      ctx.fillStyle = `rgba(170,205,245,${0.32 * (1 - p)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [lag, wd, a] of [[0, 2.6, 0.95], [0.12, 1.4, 0.6]]) {
        const qq = Math.max(0, Math.min(1, (p - lag) / 0.4));
        const e2 = 1 - (1 - qq) ** 3;
        ctx.strokeStyle = `rgba(130,180,235,${a * (1 - p)})`;
        ctx.lineWidth = wd * px * Math.max(1, k);
        ctx.beginPath();
        ctx.ellipse(x, y, (15 + (1 - e2) * 20) * k, (22 + (1 - e2) * 24) * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(235,245,255,${0.95 * (1 - p)})`;
      for (let n = 0; n < 6; n++) {
        const a = (n / 6) * Math.PI * 2 + now * 2.2;
        const mx = x + Math.cos(a) * rx;
        const my = y + Math.sin(a) * ry;
        const r = 2.4 * px * Math.max(1, k);
        ctx.beginPath();
        ctx.moveTo(mx, my - r * 1.5);
        ctx.lineTo(mx + r, my);
        ctx.lineTo(mx, my + r * 1.5);
        ctx.lineTo(mx - r, my);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'shieldhit': {
      // a blow on the shield: a ripple running over it (and if it broke, shards of it flying)
      const [x, y] = proj(f.x, f.y, 17);
      ctx.strokeStyle = `rgba(200,225,255,${0.95 * (1 - p)})`;
      ctx.lineWidth = (2.6 - p * 1.6) * px * Math.max(1, k);
      ctx.beginPath();
      ctx.ellipse(x, y, (15 + p * 9) * k, (22 + p * 11) * k, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (f.broke) {
        ctx.strokeStyle = `rgba(150,195,240,${0.9 * (1 - p)})`;
        ctx.lineWidth = 1.8 * px * Math.max(1, k);
        for (let n = 0; n < 8; n++) {
          const a = (n / 8) * Math.PI * 2 + 0.3;
          const r0 = (16 + p * 20) * k;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 1.3);
          ctx.lineTo(x + Math.cos(a + 0.18) * (r0 + 6 * k), y + Math.sin(a + 0.18) * (r0 + 6 * k) * 1.3);
          ctx.stroke();
        }
      }
      break;
    }
    case 'hitfx':
      hitFx(ctx, proj, px, f, p, k);
      break;
    case 'fell': {
      // one going down: ink thrown up off it (pale, from a thing of spirit; a ring of gold for a boss)
      const up = (f.tall || 20) * 0.5;
      const col = f.spirit ? SOUL : INK;
      const n = f.boss ? 14 : 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (f.t0 * 7) % 1;
        const r = (f.boss ? 46 : 26) * Math.min(1, p * 2.4);
        const [x, y] = proj(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, up + Math.sin(p * Math.PI) * (f.boss ? 30 : 16) + (i % 3) * 3);
        ctx.fillStyle = rgba(col, (f.spirit ? 0.8 : 0.7) * (1 - p));
        ctx.beginPath();
        ctx.arc(x, y, (2.8 - p * 1.6 + (i % 2)) * px * Math.max(1, k), 0, Math.PI * 2);
        ctx.fill();
      }
      if (f.boss) {
        const [x, y] = proj(f.x, f.y, up);
        ctx.strokeStyle = rgba(GOLD, 0.85 * (1 - p));
        ctx.lineWidth = 3 * px * Math.max(1, k);
        ctx.beginPath();
        ctx.ellipse(x, y, (20 + p * 70) * k, (12 + p * 40) * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'vines': {
      // green vines thrust up out of the ground all about the spot, writhing, then sinking back
      const grow = Math.min(1, p * 5);
      const fade = p > 0.8 ? (1 - p) / 0.2 : 1;
      for (let n = 0; n < 9; n++) {
        const an = n * 2.399 + f.x * 0.01;
        const rr = f.r * (0.25 + ((n * 37) % 10) / 14);
        const gx = f.x + Math.cos(an) * rr;
        const gy = f.y + Math.sin(an) * rr * 0.7;
        const h = (18 + (n % 4) * 7) * grow;
        const sway = Math.sin(now * 5 + n) * 4;
        const [x0, y0] = proj(gx, gy, 0);
        const [x1, y1] = proj(gx + sway * 0.5, gy, h * 0.55);
        const [x2, y2] = proj(gx + sway, gy, h);
        ctx.strokeStyle = `rgba(52,104,46,${0.95 * fade})`;
        ctx.lineWidth = 2.6 * px * Math.max(1, k);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x1 + 4 * k * Math.cos(n), y1, x2, y2);
        ctx.stroke();
        ctx.fillStyle = `rgba(110,172,84,${0.9 * fade})`;
        ctx.beginPath();
        ctx.ellipse(x2, y2, 2.6 * k, 1.5 * k, n, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'web': {
      // threads of web stuck from the ground up round whoever stands in it, sagging as it lets go
      const fade = p > 0.75 ? (1 - p) / 0.25 : 1;
      ctx.strokeStyle = `rgba(240,238,230,${0.8 * fade})`;
      ctx.lineWidth = 1.1 * px * Math.max(1, k);
      for (let n = 0; n < 7; n++) {
        const an = n * 0.9 + f.x * 0.01;
        const [x0, y0] = proj(f.x + Math.cos(an) * f.r * 0.8, f.y + Math.sin(an) * f.r * 0.6, 0);
        const [x1, y1] = proj(f.x + Math.cos(an + 2.2) * 6, f.y + Math.sin(an + 2.2) * 4, 12 + (n % 3) * 7 - p * 6);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 4 * k * p, x1, y1);
        ctx.stroke();
      }
      break;
    }
    case 'spikes': {
      // 地刺: spikes of stone thrust up out of the ground all about the spot, then crumbling back
      const up = p < 0.2 ? p / 0.2 : p > 0.7 ? (1 - p) / 0.3 : 1;
      for (let n = 0; n < 7; n++) {
        const an = n * 2.399 + f.x * 0.01;
        const rr = f.r * (0.15 + ((n * 37) % 10) / 13);
        const gx = f.x + Math.cos(an) * rr;
        const gy = f.y + Math.sin(an) * rr * 0.7;
        const tall = (16 + (n % 3) * 8) * up;
        const [bx, by] = proj(gx, gy, 0);
        const [tx, ty] = proj(gx + 1.5, gy, tall);
        const wd = 4.2 * k * Math.max(1, px * 2);
        ctx.fillStyle = `rgba(${126 - (n % 3) * 12},${104 - (n % 3) * 10},${76 - (n % 3) * 8},0.96)`;
        ctx.beginPath();
        ctx.moveTo(bx - wd, by);
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx + wd, by);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(INK, 0.6);
        ctx.lineWidth = 0.8 * px;
        ctx.stroke();
      }
      break;
    }
    case 'sun': {
      // 大日輪: the sun risen behind you, blazing a moment
      const [x, y] = proj(f.x, f.y, 26 + p * 10);
      const r = (14 + p * 10) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      g.addColorStop(0, `rgba(255,248,214,${0.9 * (1 - p)})`);
      g.addColorStop(0.4, rgba([250, 200, 90], 0.7 * (1 - p)));
      g.addColorStop(1, rgba([250, 200, 90], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sting': {
      // the tail brought over its back and down: a dark hooked stroke from behind to where it strikes, venom where it lands
      const down = Math.min(1, p * 3);
      const [x0, y0] = proj(f.x - f.dir[0] * 8, f.y - f.dir[1] * 8, 18);
      const [cx, cy] = proj(f.x + f.dir[0] * f.reach * 0.3, f.y + f.dir[1] * f.reach * 0.3, 44);
      const [x1, y1] = proj(f.x + f.dir[0] * f.reach * 0.85, f.y + f.dir[1] * f.reach * 0.85, 4 + (1 - down) * 24);
      ctx.strokeStyle = `rgba(40,30,24,${0.85 * (1 - p)})`;
      ctx.lineWidth = 3 * px * Math.max(1, k);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(232,196,110,${0.9 * (1 - p)})`;
      ctx.lineWidth = 1.2 * px * Math.max(1, k);
      ctx.stroke();
      if (down >= 1) {
        const q = (p - 1 / 3) * 1.5;
        for (let n = 0; n < 6; n++) {
          const a = n * 1.05 + f.x * 0.01;
          ctx.fillStyle = rgba(VENOM, 0.85 * (1 - p));
          ctx.beginPath();
          ctx.arc(x1 + Math.cos(a) * 10 * k * q, y1 + Math.sin(a) * 5 * k * q - 4 * k * Math.sin(q * Math.PI), 1.8 * k * Math.max(1, px * 2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'sand': {
      // sand flung (or dust breathed) from it: grains thrown out over the ground in front, a haze of dust behind them
      for (let n = 0; n < 16; n++) {
        const q = (n / 16 + p * 0.9) % 1;
        const side = Math.sin(n * 2.3) * f.arc * 0.48;
        const a = Math.atan2(f.dir[1], f.dir[0]) + side;
        const [x, y] = proj(f.x + Math.cos(a) * f.reach * q, f.y + Math.sin(a) * f.reach * q, 16 - q * 10);
        ctx.fillStyle = rgba(n % 3 ? SAND : [150, 118, 76], 0.9 * (1 - p));
        ctx.fillRect(x - k, y - k, 2 * k * Math.max(1, px * 2), 2 * k * Math.max(1, px * 2));
      }
      const [hx, hy] = proj(f.x + f.dir[0] * f.reach * 0.6, f.y + f.dir[1] * f.reach * 0.6, 12);
      const r = f.reach * 0.45 * k * (0.5 + p * 0.7);
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      g.addColorStop(0, rgba(SAND, 0.45 * (1 - p)));
      g.addColorStop(1, rgba(SAND, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sandring': {
      // a whirl of sand all round it: streaks going round and out, grains thrown wide
      for (let n = 0; n < 14; n++) {
        const an = n * 0.449 + p * 5;
        const rr = f.r * (0.25 + 0.75 * Math.min(1, p * 1.6)) * (0.7 + ((n * 37) % 10) / 33);
        const [x0, y0] = proj(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr * 0.8, 6 + (n % 4) * 5);
        const [x1, y1] = proj(f.x + Math.cos(an + 0.5) * rr, f.y + Math.sin(an + 0.5) * rr * 0.8, 6 + (n % 4) * 5);
        ctx.strokeStyle = rgba(n % 3 ? SAND : [150, 118, 76], 0.75 * (1 - p));
        ctx.lineWidth = 1.6 * px * Math.max(1, k);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      break;
    }
    case 'sandspout': {
      // the sand bursting up out of the ground where it marked: a column of it, falling back
      const up = p < 0.35 ? p / 0.35 : 1;
      for (let n = 0; n < 18; n++) {
        const an = n * 2.399 + f.x * 0.01;
        const rr = f.r * 0.7 * (((n * 37) % 10) / 10);
        const hgt = (30 + (n % 5) * 9) * up * (p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65 * 0.8);
        const [x, y] = proj(f.x + Math.cos(an) * rr * (1 + p * 0.4), f.y + Math.sin(an) * rr * 0.7 * (1 + p * 0.4), hgt);
        ctx.fillStyle = rgba(n % 3 ? SAND : [150, 118, 76], 0.9 * (1 - p * 0.8));
        ctx.beginPath();
        ctx.arc(x, y, (2.4 - (n % 3) * 0.5) * k * Math.max(1, px * 2), 0, Math.PI * 2);
        ctx.fill();
      }
      const [bx, by] = proj(f.x, f.y, 14 * up);
      const r = f.r * 0.8 * k * (0.6 + up * 0.4);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, rgba(SAND, 0.5 * (1 - p)));
      g.addColorStop(1, rgba(SAND, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'zen': {
      // a palm of gold thrust out: the print of a hand, as big as a door, driving forward and fading
      const q = Math.min(1, p * 2.2);
      const [x, y] = proj(f.x + f.dir[0] * f.reach * (0.4 + q * 0.5), f.y + f.dir[1] * f.reach * (0.4 + q * 0.5), 18);
      const s = (10 + q * 9) * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha *= 0.85 * (1 - p);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2);
      g.addColorStop(0, 'rgba(255,240,190,0.7)');
      g.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, s * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(GOLD, 0.75);
      ctx.strokeStyle = 'rgba(255,236,170,0.9)';
      ctx.lineWidth = 1 * px * Math.max(1, k);
      ctx.beginPath();
      ctx.ellipse(0, s * 0.25, s * 0.6, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let n = 0; n < 4; n++) {
        const dx = (n - 1.5) * s * 0.3;
        const fl = s * (0.62 + (n === 1 || n === 2 ? 0.16 : 0));
        ctx.beginPath();
        ctx.ellipse(dx, -s * 0.2 - fl * 0.5, s * 0.12, fl * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(-s * 0.62, s * 0.05, s * 0.12, s * 0.32, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
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
