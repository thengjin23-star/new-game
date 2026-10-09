// People and creatures, drawn every frame so they can walk, bob and turn.
// All sizes in world units; (x, y) is where the feet touch the ground.

import { INK, rgba } from './ink.js';

const SKIN = [230, 210, 182];

/** How each named person looks. */
export const LOOKS = {
  player: { robe: [52, 58, 74], trim: [196, 170, 120], hair: 'bun' },
  lin_chen: { robe: [46, 58, 92], trim: [30, 30, 30], hair: 'bun', ring: true },
  shen_qingge: { robe: [222, 176, 180], trim: [150, 60, 70], hair: 'long', pin: true },
  song_he: { robe: [150, 150, 140], trim: [90, 90, 80], hair: 'topknot', beard: true, whisk: true },
  wang_er: { robe: [128, 96, 64], trim: [80, 60, 40], hair: 'straw', short: true },
  sun_zg: { robe: [98, 72, 52], trim: [60, 44, 32], hair: 'cap', beard: true },
  su_qingyao: { robe: [244, 244, 240], trim: [150, 170, 190], hair: 'long', sword: true },
  hu_sanniang: { robe: [246, 244, 240], trim: [200, 70, 70], hair: 'long', tail: true },
  qian_banxian: { robe: [120, 118, 110], trim: [60, 60, 56], hair: 'cap', beard: true, fan: true },
  zhao_hu: { robe: [40, 38, 36], trim: [120, 40, 30], hair: 'bun', big: true },
  stranger: { robe: [84, 104, 96], trim: [40, 50, 46], hair: 'bun', sword: true },
};

/** Townsfolk: farmer, woman, elder, child, cultivator, disciple. */
export const FOLK_LOOKS = [
  { robe: [140, 112, 76], trim: [90, 70, 50], hair: 'straw', short: true },
  { robe: [90, 110, 140], trim: [170, 80, 70], hair: 'long' },
  { robe: [110, 104, 96], trim: [70, 66, 60], hair: 'topknot', beard: true, cane: true },
  { robe: [170, 96, 70], trim: [90, 60, 40], hair: 'bun', child: true },
  { robe: [76, 96, 90], trim: [40, 50, 46], hair: 'bun', sword: true },
  { robe: [212, 222, 230], trim: [60, 100, 150], hair: 'bun', sword: true },
];

export function groundShadow(ctx, x, y, rx, ry, a = 0.22) {
  ctx.fillStyle = `rgba(20,18,16,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A person. opts: { t (seconds), moving, face (-1|1), sit, alpha, scale }.
 */
export function drawPerson(ctx, x, y, look, opts = {}) {
  const { t = 0, moving = false, face = 1, sit = false, alpha = 1 } = opts;
  const k = (opts.scale || 1) * (look.child ? 0.7 : look.big ? 1.15 : 1);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(k, k);
  const ph = moving ? Math.sin(t * 11) : 0;
  const bob = moving ? Math.abs(Math.sin(t * 11)) * 1.2 : Math.sin(t * 1.6) * 0.25;
  groundShadow(ctx, 0, 0, sit ? 10 : 7.5, 2.6);
  if (sit) return seated(ctx, look, t), ctx.restore();
  ctx.translate(0, -bob);
  // legs
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.lineTo(-2 + ph * 2.6, 0);
  ctx.moveTo(2, -6);
  ctx.lineTo(2 - ph * 2.6, 0);
  ctx.stroke();
  // fox tail
  if (look.tail) {
    ctx.fillStyle = 'rgba(250,250,248,0.95)';
    ctx.beginPath();
    ctx.moveTo(-face * 3, -8);
    ctx.quadraticCurveTo(-face * 14, -6 + Math.sin(t * 2) * 2, -face * 12, -18);
    ctx.quadraticCurveTo(-face * 8, -10, -face * 3, -12);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.5);
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  // sword on the back
  if (look.sword) {
    ctx.strokeStyle = rgba(INK, 0.9);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-face * 5, -10);
    ctx.lineTo(face * 4, -32);
    ctx.stroke();
  }
  // robe
  const hem = look.short ? -5 : -2;
  ctx.fillStyle = rgba(look.robe, 1);
  ctx.beginPath();
  ctx.moveTo(-4, -25);
  ctx.lineTo(4, -25);
  ctx.quadraticCurveTo(6.5, -14, 7.5 + ph * 0.8, hem);
  ctx.lineTo(-7.5 + ph * 0.8, hem);
  ctx.quadraticCurveTo(-6.5, -14, -4, -25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // collar and sash
  ctx.strokeStyle = rgba(look.trim, 0.95);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, -25);
  ctx.lineTo(face * 1.5, -19);
  ctx.moveTo(-5.2, -15);
  ctx.lineTo(5.2, -15);
  ctx.stroke();
  // sleeves swing
  ctx.fillStyle = rgba(look.robe, 1);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 4.5, -23);
    ctx.rotate(s * 0.15 + (moving ? -s * ph * 0.35 : 0));
    ctx.beginPath();
    ctx.ellipse(0, 6, 2.6, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }
  if (look.cane) {
    ctx.strokeStyle = rgba([96, 64, 42], 1);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(face * 7, -16);
    ctx.lineTo(face * 8, 0);
    ctx.stroke();
  }
  if (look.fan) {
    ctx.fillStyle = 'rgba(240,236,224,0.95)';
    ctx.beginPath();
    ctx.moveTo(face * 6, -16);
    ctx.arc(face * 6, -16, 6, face > 0 ? -1.4 : Math.PI + 0.4, face > 0 ? -0.4 : Math.PI + 1.4);
    ctx.closePath();
    ctx.fill();
  }
  if (look.whisk) {
    ctx.strokeStyle = 'rgba(245,245,240,0.95)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(face * 7, -18);
      ctx.lineTo(face * (9 + i * 0.8), -8 + i * 0.6);
    }
    ctx.stroke();
  }
  head(ctx, look, face, t);
  ctx.restore();
}

function head(ctx, look, face, t, y0 = -29) {
  ctx.fillStyle = rgba(SKIN, 1);
  ctx.beginPath();
  ctx.arc(face * 0.5, y0, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.fillStyle = rgba(INK, 0.95);
  switch (look.hair) {
    case 'straw':
      ctx.fillStyle = 'rgba(182,154,100,1)';
      ctx.beginPath();
      ctx.moveTo(-7, y0 - 1);
      ctx.lineTo(face * 0.5, y0 - 7);
      ctx.lineTo(7, y0 - 1);
      ctx.closePath();
      ctx.fill();
      break;
    case 'cap':
      ctx.beginPath();
      ctx.arc(face * 0.5, y0 - 1.5, 3.9, Math.PI, 0);
      ctx.fill();
      break;
    case 'topknot':
      ctx.beginPath();
      ctx.arc(face * 0.5, y0 - 1.2, 3.8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,220,214,1)';
      ctx.beginPath();
      ctx.arc(face * 0.3, y0 - 5.6, 1.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'long':
      ctx.beginPath();
      ctx.arc(face * 0.5, y0 - 1, 4, Math.PI * 0.95, Math.PI * 0.05);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-face * 3.5, y0);
      ctx.quadraticCurveTo(-face * 5, y0 + 8, -face * 3.5 + Math.sin(t * 1.5) * 0.6, y0 + 13);
      ctx.lineTo(-face * 1, y0 + 4);
      ctx.fill();
      if (look.pin) {
        ctx.fillStyle = 'rgba(200,160,80,1)';
        ctx.fillRect(face * 2, y0 - 5, 3, 1);
      }
      break;
    default:
      ctx.beginPath();
      ctx.arc(face * 0.5, y0 - 1.2, 3.8, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(face * 0.2, y0 - 5.4, 1.9, 0, Math.PI * 2);
      ctx.fill();
  }
  if (look.beard) {
    ctx.fillStyle = look.hair === 'topknot' ? 'rgba(236,236,230,1)' : 'rgba(60,54,48,0.95)';
    ctx.beginPath();
    ctx.moveTo(face * 0.5 - 2, y0 + 2);
    ctx.quadraticCurveTo(face * 1, y0 + 9, face * 0.5 + 2, y0 + 2);
    ctx.fill();
  }
  if (look.tail) {
    ctx.fillStyle = 'rgba(200,40,40,1)';
    ctx.beginPath();
    ctx.arc(face * 2, y0 - 0.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function seated(ctx, look, t) {
  // cross-legged, hands folded, breath rising and falling
  const breath = Math.sin(t * 1.3) * 0.5;
  ctx.fillStyle = rgba(look.robe, 1);
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.quadraticCurveTo(0, -3, 11, 0);
  ctx.lineTo(5, -16 - breath);
  ctx.lineTo(-5, -16 - breath);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = rgba(look.trim, 0.95);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.lineTo(0, -10);
  ctx.stroke();
  head(ctx, look, 1, t, -20 - breath);
}

/** The faint glow of qi around a cultivator who sits. */
export function aura(ctx, x, y, t, strength = 1) {
  const r = 26 + Math.sin(t * 1.3) * 3;
  const g = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, r);
  g.addColorStop(0, `rgba(240,214,150,${0.42 * strength})`);
  g.addColorStop(1, 'rgba(240,214,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - 14 - r, r * 2, r * 2);
}

// ── creatures ──

export function drawWolf(ctx, x, y, opts = {}) {
  const { t = 0, moving = false, face = 1, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(face, 1);
  groundShadow(ctx, 0, 0, 12, 2.6);
  const ph = moving ? Math.sin(t * 14) : 0;
  ctx.strokeStyle = 'rgba(70,68,66,1)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, -7);
  ctx.lineTo(-7 + ph * 3, 0);
  ctx.moveTo(6, -7);
  ctx.lineTo(7 - ph * 3, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(112,110,108,1)';
  ctx.beginPath();
  ctx.ellipse(0, -10, 10, 5, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // head
  ctx.fillStyle = 'rgba(104,102,100,1)';
  ctx.beginPath();
  ctx.moveTo(7, -13);
  ctx.lineTo(16, -12);
  ctx.lineTo(10, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -13);
  ctx.lineTo(9, -18);
  ctx.lineTo(11, -13);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,200,80,1)';
  ctx.fillRect(11, -12, 1.4, 1);
  // tail
  ctx.strokeStyle = 'rgba(112,110,108,1)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-9, -11);
  ctx.quadraticCurveTo(-14, -12, -16, -8 + (moving ? Math.sin(t * 7) : 0));
  ctx.stroke();
  ctx.restore();
}

export function drawSnake(ctx, x, y, opts = {}) {
  const { t = 0, face = 1, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(face, 1);
  groundShadow(ctx, 0, 0, 10, 2);
  ctx.strokeStyle = 'rgba(60,96,74,1)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, -1);
  for (let i = 0; i <= 12; i++) ctx.lineTo(-12 + i * 2, -1 - Math.sin(i * 0.9 + t * 4) * 2);
  ctx.quadraticCurveTo(14, -6, 13, -10);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,96,74,1)';
  ctx.beginPath();
  ctx.ellipse(13, -11, 3, 2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,40,40,0.9)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(16, -12);
  ctx.lineTo(19, -12 + Math.sin(t * 20));
  ctx.stroke();
  ctx.restore();
}

const BANDIT = { robe: [36, 34, 32], trim: [110, 30, 26], hair: 'bun', sword: true, short: true };

export function drawBandit(ctx, x, y, opts = {}) {
  drawPerson(ctx, x, y, BANDIT, opts);
  // the mask
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  ctx.fillStyle = 'rgba(30,28,26,1)';
  ctx.fillRect(x - 3.5 + (opts.face || 1) * 0.5, y - 29, 7, 3);
  ctx.restore();
}

export function drawGhost(ctx, x, y, opts = {}) {
  const { t = 0, face = 1, alpha = 1 } = opts;
  const fl = Math.sin(t * 2) * 2;
  ctx.save();
  ctx.globalAlpha *= alpha * 0.78;
  ctx.translate(x, y - 6 + fl);
  const g = ctx.createLinearGradient(0, -34, 0, 4);
  g.addColorStop(0, 'rgba(150,170,200,0.9)');
  g.addColorStop(1, 'rgba(150,170,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-5, -26);
  ctx.quadraticCurveTo(-9, -10, -6 + Math.sin(t * 3) * 2, 4);
  ctx.quadraticCurveTo(0, -2, 6 + Math.cos(t * 3) * 2, 4);
  ctx.quadraticCurveTo(9, -10, 5, -26);
  ctx.closePath();
  ctx.fill();
  // an old helmet
  ctx.fillStyle = 'rgba(90,96,110,0.9)';
  ctx.beginPath();
  ctx.arc(0, -29, 4.5, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,230,255,0.95)';
  ctx.fillRect(face * 1 - 2, -28, 1.3, 1);
  ctx.fillRect(face * 1 + 1, -28, 1.3, 1);
  ctx.restore();
}

/** A creature from places.js MOBS by kind. */
export function drawMob(ctx, kind, x, y, opts) {
  if (kind === 'wolf') drawWolf(ctx, x, y, opts);
  else if (kind === 'snake') drawSnake(ctx, x, y, opts);
  else if (kind === 'bandit') drawBandit(ctx, x, y, opts);
  else if (kind === 'ghost') drawGhost(ctx, x, y, opts);
}
