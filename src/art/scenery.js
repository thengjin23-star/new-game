// The people, creatures and things that make up a scene out in the world,
// and the wildlife of the regions: drawn with the same brushes as the rest,
// foot at (0, 0), in world units. Shared by the flat map and the 3D world.

import { INK, rgba } from './ink.js';
import { drawPerson, drawMob, groundShadow, FOLK_LOOKS, LOOKS } from './figures.js';

const SKIN = [230, 210, 182];
const WOOD = [96, 64, 42];

/** How the people of the scenes look. */
export const SCENE_LOOKS = {
  merchant: { robe: [120, 92, 60], trim: [70, 52, 36], hair: 'cap', beard: true },
  porter: { robe: [128, 116, 96], trim: [80, 70, 56], hair: 'bun', short: true },
  elder: { robe: [118, 110, 98], trim: [70, 66, 60], hair: 'topknot', beard: true, cane: true },
  villager: { robe: [126, 104, 74], trim: [80, 64, 46], hair: 'straw', short: true },
  villager_f: { robe: [104, 116, 132], trim: [160, 84, 70], hair: 'long' },
  child: FOLK_LOOKS[3],
  sanxiu: FOLK_LOOKS[4],
  foe: { robe: [52, 48, 46], trim: [120, 40, 32], hair: 'bun', sword: true },
  fisher: { robe: [96, 104, 100], trim: [60, 66, 62], hair: 'straw', short: true, beard: true },
  farmer: FOLK_LOOKS[0],
  performer: { robe: [176, 64, 48], trim: [230, 190, 90], hair: 'bun', short: true },
  thief: { robe: [60, 58, 54], trim: [40, 38, 36], hair: 'bun', short: true },
  vendor: { robe: [140, 120, 86], trim: [90, 70, 50], hair: 'cap' },
  guard: { robe: [58, 70, 84], trim: [190, 160, 90], hair: 'cap', sword: true },
  disciple: FOLK_LOOKS[5],
  monk: { robe: [196, 150, 70], trim: [150, 70, 40], hair: 'bald' },
  watchman: { robe: [84, 80, 74], trim: [60, 56, 50], hair: 'cap', short: true },
  drunk: { robe: [140, 110, 80], trim: [100, 70, 50], hair: 'bun' },
  wounded: { robe: [92, 108, 102], trim: [140, 40, 34], hair: 'bun', sword: true },
};

export function lookOf(key) {
  if (typeof key === 'number') return FOLK_LOOKS[key % FOLK_LOOKS.length];
  return SCENE_LOOKS[key] || LOOKS[key] || FOLK_LOOKS[0];
}

const POSES = new Set(['sit', 'sweep', 'fish', 'drink', 'sword', 'tell', 'gong', 'stagger', 'lantern']);

/**
 * How someone going about their day stands: a person from peopleInWorld
 * (act, moving, inside) or a passer-by. At home, they come to the door —
 * with a lamp, at night.
 */
export function poseOf(p, night) {
  if (p.moving) return p.act === 'stagger' ? 'stagger' : 'stand';
  if (p.inside) return night ? 'lantern' : 'stand';
  return POSES.has(p.act) ? p.act : 'stand';
}

/** Break a line of speech into short lines: at a pause if one comes, else at about `n` characters. */
function wrap(text, n) {
  const chars = [...text];
  const out = [];
  let line = '';
  chars.forEach((ch, k) => {
    line += ch;
    const next = chars[k + 1];
    const pause = '，。！？、'.includes(ch) || (ch === '—' && next !== '—');
    if (next && ((pause && line.length >= 3) || line.length >= n + 2)) {
      out.push(line);
      line = '';
    }
  });
  if (line) {
    // a lone mark goes back on the line before
    if (out.length && /^[，。！？、—…」]+$/.test(line)) out[out.length - 1] += line;
    else out.push(line);
  }
  return out.slice(0, 3);
}

/**
 * A speech bubble whose tail points down at (x, y): what someone is saying.
 * size is the font size in the context's units.
 */
export function drawSpeech(ctx, x, y, text, { font, size = 11, alpha = 1 } = {}) {
  const lines = wrap(text, 9);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `500 ${size}px ${font}`;
  const pad = size * 0.55;
  const lh = size * 1.25;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const h = lh * lines.length + pad * 1.1;
  const x0 = x - w / 2;
  const y0 = y - size * 0.6 - h;
  const r = size * 0.5;
  ctx.fillStyle = 'rgba(250,246,236,0.94)';
  ctx.strokeStyle = 'rgba(35,32,27,0.5)';
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  ctx.lineTo(x + size * 0.35, y0 + h);
  ctx.lineTo(x, y);
  ctx.lineTo(x - size * 0.15, y0 + h);
  ctx.arcTo(x0, y0 + h, x0, y0, r);
  ctx.arcTo(x0, y0, x0 + w, y0, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(35,32,27,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, k) => ctx.fillText(l, x, y0 + pad * 0.55 + lh * (k + 0.5)));
  ctx.restore();
}

/** Draw one actor of a scene (or a wild creature) with its foot at (0, 0). */
export function drawActor(ctx, ac, { t = 0, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (ac.a === 'person') drawPose(ctx, lookOf(ac.look), ac.pose || 'stand', { t: t + (ac.n || 0) * 0.7, face: ac.face || 1, moving: !!ac.moving });
  else if (ac.a === 'beast') drawBeast(ctx, ac.beast, { t: t + (ac.n || 0), face: ac.face || 1, moving: !!ac.moving, fly: ac.fly || 0 });
  else drawProp(ctx, ac.prop, { t, face: ac.face || 1 });
  ctx.restore();
}

/** A person in some pose: stand, sit, kneel, lie, wave, sword, fight, sweep, fish, lantern, drink. */
export function drawPose(ctx, look, pose, { t = 0, face = 1, moving = false } = {}) {
  switch (pose) {
    case 'sit':
    case 'drink':
      drawPerson(ctx, 0, 0, look, { t, face, sit: true });
      if (pose === 'drink') {
        ctx.fillStyle = rgba([220, 214, 200], 1);
        ctx.fillRect(face * 6 - 1.5, -12 + Math.sin(t * 0.8) * 0.6, 3, 3);
      }
      return;
    case 'kneel':
      return kneel(ctx, look, t, face);
    case 'lie':
      return lying(ctx, look, face);
    case 'stagger': {
      // one too many: the whole man sways from the feet up, a gourd in hand
      ctx.save();
      ctx.rotate(Math.sin(t * 1.7) * 0.13);
      drawPerson(ctx, 0, 0, look, { t, face, moving });
      ctx.fillStyle = 'rgba(196,150,70,1)';
      ctx.strokeStyle = rgba(INK, 0.5);
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(face * 7, -13, 2.4, 0, Math.PI * 2);
      ctx.arc(face * 7, -17, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    case 'fish': {
      drawPerson(ctx, 0, 0, look, { t, face, sit: true });
      ctx.strokeStyle = rgba(WOOD, 1);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(face * 4, -10);
      ctx.lineTo(face * 26, -26);
      ctx.stroke();
      ctx.strokeStyle = rgba(INK, 0.45);
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(face * 26, -26);
      ctx.lineTo(face * 27, -2 + Math.sin(t * 1.2));
      ctx.stroke();
      return;
    }
    default:
      break;
  }
  drawPerson(ctx, 0, 0, look, { t, face, moving });
  if (pose === 'wave') {
    // one arm up, waving
    ctx.strokeStyle = rgba(look.robe, 1);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(face * 4, -23);
    ctx.lineTo(face * (8 + Math.sin(t * 6) * 1.5), -33);
    ctx.stroke();
    ctx.fillStyle = rgba(SKIN, 1);
    ctx.beginPath();
    ctx.arc(face * (8 + Math.sin(t * 6) * 1.5), -34.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (pose === 'sword' || pose === 'fight') {
    const swing = pose === 'fight' ? Math.sin(t * 5) : 0.2;
    const a = -0.6 + swing * 0.9;
    ctx.strokeStyle = 'rgba(214,222,230,1)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(face * 6, -16);
    ctx.lineTo(face * (6 + Math.cos(a) * 18), -16 + Math.sin(a) * 18);
    ctx.stroke();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 0.4;
    ctx.stroke();
    if (pose === 'fight' && Math.sin(t * 5) > 0.75) {
      // the flash of a blow
      ctx.strokeStyle = 'rgba(255,250,220,0.85)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(face * 8, -18, 14, -1.2, 0.4);
      ctx.stroke();
    }
  } else if (pose === 'sweep') {
    const sw = Math.sin(t * 3) * 4;
    ctx.strokeStyle = rgba(WOOD, 1);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(face * 5, -18);
    ctx.lineTo(face * 9 + sw, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(176,150,96,1)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(face * 7 + sw, 0);
    ctx.lineTo(face * 13 + sw, 1);
    ctx.stroke();
  } else if (pose === 'tell') {
    // a folding fan, flicked open and shut as the story goes
    const open = 0.5 + 0.5 * Math.sin(t * 2.2);
    const span = 0.25 + open * 1.2;
    const hx = face * 7;
    const hy = -19;
    const base = face > 0 ? -Math.PI / 2 + 0.25 : -Math.PI / 2 - 0.25 - span;
    ctx.fillStyle = 'rgba(236,228,206,1)';
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.arc(hx, hy, 7, base, base + span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pose === 'gong' || pose === 'lantern') {
    if (pose === 'gong') {
      // the watchman's bamboo clapper, struck now and then
      const hit = Math.sin(t * 1.3) > 0.93;
      ctx.fillStyle = 'rgba(150,112,60,1)';
      ctx.fillRect(-face * 8 - 1.5, -17, 3, 6);
      ctx.strokeStyle = rgba(WOOD, 1);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-face * 4, -15);
      ctx.lineTo(-face * (hit ? 7 : 10), hit ? -14 : -20);
      ctx.stroke();
      if (hit) {
        ctx.strokeStyle = 'rgba(80,70,60,0.6)';
        ctx.lineWidth = 0.5;
        for (const a of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(-face * (11 + Math.cos(a) * 2), -14 + Math.sin(a) * 2);
          ctx.lineTo(-face * (14 + Math.cos(a) * 4), -14 + Math.sin(a) * 4);
          ctx.stroke();
        }
      }
    }
    ctx.strokeStyle = rgba(WOOD, 1);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(face * 6, -16);
    ctx.lineTo(face * 12, -22);
    ctx.lineTo(face * 12, -18);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,170,80,1)';
    ctx.beginPath();
    ctx.ellipse(face * 12, -15, 2.4, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function kneel(ctx, look, t, face) {
  groundShadow(ctx, 0, 0, 9, 2.4);
  ctx.fillStyle = rgba(look.robe, 1);
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(0, -2, 8, 0);
  ctx.lineTo(face * 3, -13);
  ctx.lineTo(-face * 4, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // bowed head
  const bow = 2 + Math.sin(t * 2) * 0.8;
  ctx.fillStyle = rgba(SKIN, 1);
  ctx.beginPath();
  ctx.arc(face * (4 + bow * 0.5), -14 + bow, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.hair === 'straw' ? 'rgba(182,154,100,1)' : look.hair === 'topknot' ? 'rgba(220,220,214,1)' : rgba(INK, 0.95);
  ctx.beginPath();
  ctx.arc(face * (4 + bow * 0.5), -15 + bow, 3.7, Math.PI * 0.9, Math.PI * 0.1);
  ctx.fill();
}

function lying(ctx, look, face) {
  groundShadow(ctx, 0, 0, 14, 3);
  ctx.save();
  ctx.scale(face, 1);
  ctx.fillStyle = rgba(look.robe, 1);
  ctx.beginPath();
  ctx.moveTo(-12, -1);
  ctx.quadraticCurveTo(-2, -7, 9, -4);
  ctx.lineTo(10, 0);
  ctx.lineTo(-12, 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = rgba([210, 196, 176], 1);
  ctx.beginPath();
  ctx.arc(13, -3.5, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(INK, 0.95);
  ctx.beginPath();
  ctx.arc(14, -4.5, 3.5, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();
  ctx.restore();
}

// ── creatures ──

/** A creature: the hostile ones from figures.js, and the wildlife. fly: 0 on the ground … 1 up and away. */
export function drawBeast(ctx, kind, { t = 0, face = 1, moving = false, fly = 0 } = {}) {
  if (kind === 'wolf' || kind === 'snake' || kind === 'bandit' || kind === 'ghost') return drawMob(ctx, kind, 0, 0, { t, face, moving });
  ctx.save();
  if (!fly) groundShadow(ctx, 0, 0, kind === 'deer' || kind === 'spirit_deer' ? 11 : 6, 2);
  ctx.scale(face, 1);
  switch (kind) {
    case 'fox':
      fox(ctx, t, moving);
      break;
    case 'deer':
    case 'spirit_deer':
      deer(ctx, t, moving, kind === 'spirit_deer');
      break;
    case 'rabbit':
      rabbit(ctx, t, moving);
      break;
    case 'crane':
    case 'egret':
      wader(ctx, t, moving, fly, kind === 'crane');
      break;
    case 'crow':
      crow(ctx, t, fly);
      break;
    default:
      break;
  }
  ctx.restore();
}

function fox(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 13) : 0;
  ctx.strokeStyle = 'rgba(236,236,232,1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(-5 + ph * 2.4, 0);
  ctx.moveTo(4, -5);
  ctx.lineTo(4 - ph * 2.4, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(246,244,240,1)';
  ctx.beginPath();
  ctx.ellipse(0, -7.5, 8, 3.8, -0.05, 0, Math.PI * 2);
  ctx.fill();
  // the tail, full and white
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.quadraticCurveTo(-16, -14 + Math.sin(t * 3) * 2, -15, -4);
  ctx.quadraticCurveTo(-11, -6, -7, -6);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -10);
  ctx.lineTo(13, -9);
  ctx.lineTo(7, -5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, -10);
  ctx.lineTo(8, -15);
  ctx.lineTo(10, -10);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.5);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.fillStyle = 'rgba(200,40,40,1)';
  ctx.fillRect(9.5, -9.4, 1, 0.8);
  // a little lantern in its mouth, burning blue
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(12, -8);
  ctx.lineTo(13, -4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,180,255,1)';
  ctx.beginPath();
  ctx.ellipse(13, -2.5, 1.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function deer(ctx, t, moving, spirit) {
  const ph = moving ? Math.sin(t * 12) : 0;
  const body = spirit ? 'rgba(232,240,236,1)' : 'rgba(168,124,82,1)';
  ctx.strokeStyle = spirit ? 'rgba(210,226,220,1)' : 'rgba(120,88,58,1)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const [x, s] of [[-6, 1], [-4, -1], [5, 1], [7, -1]]) {
    ctx.moveTo(x, -10);
    ctx.lineTo(x + ph * 3 * s, 0);
  }
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -12, 10, 4.6, -0.05, 0, Math.PI * 2);
  ctx.fill();
  // neck and head (grazing when still)
  const graze = moving ? 0 : (Math.sin(t * 0.6) > 0.3 ? 1 : 0);
  ctx.beginPath();
  ctx.moveTo(7, -14);
  ctx.lineTo(10, graze ? -8 : -21);
  ctx.lineTo(13, graze ? -6 : -20);
  ctx.lineTo(10, -12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, graze ? -5 : -22, 3.4, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (!graze) {
    ctx.strokeStyle = spirit ? 'rgba(200,230,210,1)' : 'rgba(96,72,48,1)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(10, -24);
    ctx.lineTo(8, -30);
    ctx.lineTo(6, -32);
    ctx.moveTo(8, -30);
    ctx.lineTo(10, -33);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(250,250,246,0.9)';
  for (const [x, y] of [[-3, -13], [1, -14], [4, -12]]) {
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (spirit) {
    const g = ctx.createRadialGradient(0, -14, 1, 0, -14, 20);
    g.addColorStop(0, `rgba(200,255,230,${0.25 + 0.1 * Math.sin(t * 2)})`);
    g.addColorStop(1, 'rgba(200,255,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -34, 40, 40);
  }
}

function rabbit(ctx, t, moving) {
  const hop = moving ? Math.abs(Math.sin(t * 10)) * 4 : 0;
  ctx.fillStyle = 'rgba(176,158,134,1)';
  ctx.beginPath();
  ctx.ellipse(0, -3.5 - hop, 4.4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.6, -6 - hop, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.4, -10 - hop, 0.8, 2.6, 0.2, 0, Math.PI * 2);
  ctx.ellipse(4.6, -10 - hop, 0.8, 2.6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(250,248,244,1)';
  ctx.beginPath();
  ctx.arc(-4.4, -3.8 - hop, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function wader(ctx, t, moving, fly, crane) {
  const white = 'rgba(250,250,248,1)';
  if (fly > 0) {
    // up and away, wings beating
    const up = -10 - fly * 40;
    const beat = Math.sin(t * 9);
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.ellipse(0, up, 7, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3, up);
    ctx.quadraticCurveTo(-8, up - 10 * beat, -16, up - 6 * beat);
    ctx.lineTo(-2, up + 1);
    ctx.moveTo(3, up);
    ctx.quadraticCurveTo(0, up - 12 * beat, -6, up - 10 * beat);
    ctx.lineTo(4, up + 1);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    return;
  }
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-1, -9);
  ctx.lineTo(-1 + (moving ? Math.sin(t * 6) * 2 : 0), 0);
  ctx.moveTo(1, -9);
  ctx.lineTo(1.5, 0);
  ctx.stroke();
  ctx.fillStyle = white;
  ctx.beginPath();
  ctx.ellipse(0, -12, 6, 3.4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  const peck = !moving && Math.sin(t * 0.8) > 0.6;
  ctx.strokeStyle = white;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(4, -13);
  ctx.quadraticCurveTo(7, peck ? -10 : -19, 6, peck ? -6 : -22);
  ctx.stroke();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(6, peck ? -6 : -22);
  ctx.lineTo(10, peck ? -3 : -21);
  ctx.stroke();
  if (crane) {
    ctx.fillStyle = 'rgba(190,40,34,1)';
    ctx.beginPath();
    ctx.arc(6, peck ? -6.5 : -22.5, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(INK, 0.9);
    ctx.beginPath();
    ctx.ellipse(-4, -11, 3, 1.8, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function crow(ctx, t, fly) {
  const up = fly ? -6 - fly * 46 : 0;
  ctx.fillStyle = rgba(INK, 0.95);
  if (fly) {
    const beat = Math.sin(t * 12);
    ctx.beginPath();
    ctx.ellipse(0, up, 4, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1, up);
    ctx.quadraticCurveTo(-5, up - 6 * beat, -10, up - 3 * beat);
    ctx.lineTo(0, up + 1);
    ctx.moveTo(1, up);
    ctx.quadraticCurveTo(5, up - 6 * beat, 10, up - 3 * beat);
    ctx.lineTo(0, up + 1);
    ctx.fill();
    return;
  }
  const hop = Math.max(0, Math.sin(t * 2.3)) > 0.95 ? 2 : 0;
  ctx.beginPath();
  ctx.ellipse(0, -4 - hop, 4, 2.6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.4, -6.4 - hop, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, -4 - hop);
  ctx.lineTo(-7, -2 - hop);
  ctx.lineTo(-3, -2.5 - hop);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(4.8, -6.6 - hop);
  ctx.lineTo(7, -6 - hop);
  ctx.stroke();
}

// ── props ──

/** Things that stand in scenes: a roadside canopy, a mule, crates, a carrying pole, a hut, a ginseng… */
export function drawProp(ctx, kind, { t = 0, face = 1 } = {}) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (kind) {
    case 'canopy': {
      ctx.strokeStyle = rgba(WOOD, 1);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const x of [-18, 18]) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, -24);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(176,150,100,0.97)';
      ctx.beginPath();
      ctx.moveTo(-23, -22);
      ctx.lineTo(23, -22);
      ctx.lineTo(20, -30);
      ctx.lineTo(-20, -30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      return;
    }
    case 'mule': {
      groundShadow(ctx, 0, 0, 12, 2.6);
      ctx.save();
      ctx.scale(-face, 1);
      ctx.strokeStyle = 'rgba(80,70,60,1)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const x of [-7, -4, 5, 8]) {
        ctx.moveTo(x, -9);
        ctx.lineTo(x, 0);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(110,98,86,1)';
      ctx.beginPath();
      ctx.ellipse(0, -12, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -14);
      ctx.lineTo(13, -20);
      ctx.lineTo(16, -18);
      ctx.lineTo(11, -11);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(15, -18, 3.6, 2.2, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -21);
      ctx.lineTo(12, -26);
      ctx.lineTo(14.5, -21);
      ctx.fill();
      // the load
      ctx.fillStyle = 'rgba(150,118,80,1)';
      ctx.fillRect(-7, -22, 6, 8);
      ctx.fillRect(0, -22, 6, 8);
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-7, -22, 6, 8);
      ctx.strokeRect(0, -22, 6, 8);
      ctx.restore();
      return;
    }
    case 'crates': {
      for (const [x, y, w, h] of [[-8, 0, 12, 9], [4, 0, 10, 8], [-3, -9, 10, 8]]) {
        ctx.fillStyle = 'rgba(146,112,74,1)';
        ctx.fillRect(x, y - h, w, h);
        ctx.strokeStyle = rgba(INK, 0.6);
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x, y - h, w, h);
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x + w, y);
        ctx.stroke();
      }
      return;
    }
    case 'pole': {
      ctx.strokeStyle = rgba(WOOD, 1);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.lineTo(14, -1);
      ctx.stroke();
      ctx.fillStyle = 'rgba(150,130,94,1)';
      for (const x of [-14, 14]) {
        ctx.beginPath();
        ctx.ellipse(x, -2, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    case 'hut': {
      ctx.fillStyle = 'rgba(196,172,130,1)';
      ctx.fillRect(-20, -18, 40, 18);
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-20, -18, 40, 18);
      ctx.fillStyle = 'rgba(60,46,34,1)';
      ctx.fillRect(-4, -12, 8, 12);
      ctx.fillStyle = 'rgba(182,154,100,1)';
      ctx.beginPath();
      ctx.moveTo(-26, -16);
      ctx.lineTo(0, -34);
      ctx.lineTo(26, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    case 'ginseng': {
      ctx.strokeStyle = 'rgba(70,120,80,1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a) * 5, -6, Math.cos(a) * 8, -10 + Math.abs(i - 1) * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(80,140,90,1)';
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 8, -10 + Math.abs(i - 1) * 2, 3, 1.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(190,50,44,1)';
      for (const [x, y] of [[0, -14], [-1.5, -12.5], [1.5, -12.8]]) {
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      const g = ctx.createRadialGradient(0, -8, 1, 0, -8, 14);
      g.addColorStop(0, `rgba(255,200,180,${0.25 + 0.15 * Math.sin(t * 3)})`);
      g.addColorStop(1, 'rgba(255,200,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-14, -22, 28, 28);
      return;
    }
    case 'campfire': {
      for (let a = 0; a < Math.PI * 2; a += 0.9) {
        ctx.fillStyle = 'rgba(150,146,138,1)';
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 2.4, 1.8, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const f = Math.sin(t * 9) * 1.2;
      ctx.fillStyle = 'rgba(240,140,50,0.95)';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-3, -6, f, -11);
      ctx.quadraticCurveTo(3, -5, 4, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,120,0.95)';
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.quadraticCurveTo(-1, -4, f * 0.6, -7);
      ctx.quadraticCurveTo(2, -3, 2, 0);
      ctx.fill();
      return;
    }
    case 'basket': {
      ctx.fillStyle = 'rgba(176,146,92,1)';
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(6, -8);
      ctx.lineTo(4.5, 0);
      ctx.lineTo(-4.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.5);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(90,140,90,1)';
      ctx.beginPath();
      ctx.ellipse(0, -8.5, 5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case 'mat': {
      ctx.fillStyle = 'rgba(176,156,120,1)';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.lineTo(11, -6);
      ctx.lineTo(-11, -6);
      ctx.closePath();
      ctx.fill();
      const goods = [[170, 80, 60], [200, 180, 120], [90, 120, 140], [120, 160, 110]];
      goods.forEach((c, i) => {
        ctx.fillStyle = rgba(c, 1);
        ctx.beginPath();
        ctx.ellipse(-8 + i * 5.4, -3.4, 1.8, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      return;
    }
    case 'trap': {
      ctx.strokeStyle = 'rgba(110,104,96,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -2, 6, Math.PI, 0);
      ctx.stroke();
      for (let x = -5; x <= 5; x += 2.5) {
        ctx.beginPath();
        ctx.moveTo(x, -2);
        ctx.lineTo(x * 0.8, -6);
        ctx.stroke();
      }
      return;
    }
    case 'box': {
      ctx.fillStyle = 'rgba(120,92,62,1)';
      ctx.fillRect(-8, -9, 16, 9);
      ctx.strokeStyle = rgba(INK, 0.7);
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-8, -9, 16, 9);
      ctx.fillStyle = 'rgba(200,170,90,1)';
      ctx.fillRect(-1.5, -6, 3, 3);
      return;
    }
    case 'drum': {
      ctx.fillStyle = 'rgba(160,50,40,1)';
      ctx.fillRect(-5, -10, 10, 10);
      ctx.fillStyle = 'rgba(230,214,180,1)';
      ctx.beginPath();
      ctx.ellipse(0, -10, 5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case 'cart': {
      ctx.fillStyle = 'rgba(140,104,68,1)';
      ctx.fillRect(-16, -14, 30, 7);
      ctx.strokeStyle = rgba(INK, 0.7);
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-16, -14, 30, 7);
      for (const x of [-10, 8]) {
        ctx.beginPath();
        ctx.arc(x, -5, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(14, -10);
      ctx.lineTo(26, -6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(176,150,100,1)';
      ctx.fillRect(-14, -24, 24, 10);
      return;
    }
    default:
      break;
  }
}
