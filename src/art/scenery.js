// The people, creatures and things that make up a scene out in the world,
// and the wildlife of the regions: drawn with the same brushes as the rest,
// foot at (0, 0), in world units. Shared by the flat map and the 3D world.

import { INK, rgba } from './ink.js';
import { drawPerson, drawMob, groundShadow, FOLK_LOOKS, LOOKS, FIGURE } from './figures.js';

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

// ── the great beasts (and worse) you fight ──

/** A wolf of any size and coat: grey for the common, near-black for a demon, silver for a king. */
function wolfShape(ctx, t, moving, { body, dark, eye, mane = false, scar = false }) {
  const ph = moving ? Math.sin(t * 14) : 0;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, -7);
  ctx.lineTo(-7 + ph * 3, 0);
  ctx.moveTo(6, -7);
  ctx.lineTo(7 - ph * 3, 0);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -10, 10, 5, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  if (mane) {
    // a ruff of long hair over the shoulders
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(2, -15.5);
    for (let k = 0; k <= 6; k++) ctx.lineTo(2 + k * 1.4, -15.5 - (k % 2 ? 2.6 : 0.4));
    ctx.lineTo(10, -9);
    ctx.lineTo(3, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = body;
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
  ctx.fillStyle = eye;
  ctx.fillRect(11, -12, 1.6, 1.1);
  if (scar) {
    ctx.strokeStyle = 'rgba(150,40,34,0.9)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(10.5, -14);
    ctx.lineTo(12.5, -10.5);
    ctx.stroke();
  }
  ctx.strokeStyle = body;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-9, -11);
  ctx.quadraticCurveTo(-14, -12, -16, -8 + (moving ? Math.sin(t * 7) : 0));
  ctx.stroke();
}

function python(ctx, t) {
  // coiled on the ground, the head reared up and swaying
  const sway = Math.sin(t * 1.6) * 2;
  ctx.lineCap = 'round';
  const coil = () => {
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.bezierCurveTo(-30, -14, -6, -16, -8, -4);
    ctx.bezierCurveTo(-10, 6, 16, 4, 14, -8);
    ctx.bezierCurveTo(12, -20, 4 + sway, -26, 10 + sway, -34);
  };
  ctx.strokeStyle = 'rgba(28,40,32,1)';
  ctx.lineWidth = 8.5;
  coil();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(58,84,62,1)';
  ctx.lineWidth = 6.5;
  coil();
  ctx.stroke();
  // the pale belly and a row of scales along the back
  ctx.strokeStyle = 'rgba(176,180,140,0.7)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([2, 2.5]);
  coil();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(40,58,44,1)';
  ctx.beginPath();
  ctx.ellipse(12 + sway, -36, 6, 3.6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = 'rgba(230,200,60,1)';
  ctx.fillRect(14 + sway, -38, 1.6, 1.2);
  ctx.strokeStyle = 'rgba(190,40,40,0.9)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(17.5 + sway, -35);
  ctx.lineTo(21 + sway, -34 + Math.sin(t * 9));
  ctx.stroke();
}

function bear(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 9) * 1.5 : 0;
  ctx.strokeStyle = 'rgba(30,26,22,1)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const x of [-12, -5, 6, 13]) {
    ctx.moveTo(x, -10);
    ctx.lineTo(x + ph * (x > 0 ? 1 : -1), -1);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(52,44,38,1)';
  ctx.beginPath();
  ctx.ellipse(0, -15, 19, 10, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // the iron-grey ridge down its back
  ctx.strokeStyle = 'rgba(120,124,128,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -22);
  ctx.quadraticCurveTo(0, -27, 12, -22);
  ctx.stroke();
  ctx.fillStyle = 'rgba(46,40,34,1)';
  ctx.beginPath();
  ctx.arc(19, -18, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  for (const dx of [15, 21]) {
    ctx.beginPath();
    ctx.arc(dx, -24, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(120,100,80,1)';
  ctx.beginPath();
  ctx.ellipse(24, -16.5, 3, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,14,1)';
  ctx.fillRect(20.5, -20, 1.3, 1.3);
}

/** 山魈: an imp of the mountain — a hunched ape, long arms to the ground, a red face ridged with blue, a stone in hand. */
function shanxiao(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 10) * 2 : 0;
  const bob = moving ? Math.abs(Math.sin(t * 10)) * 1.2 : Math.sin(t * 2) * 0.4;
  ctx.lineCap = 'round';
  // short bowed legs
  ctx.strokeStyle = 'rgba(62,54,46,1)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-4, -12);
  ctx.lineTo(-6 - ph * 0.6, -1);
  ctx.moveTo(4, -12);
  ctx.lineTo(6 + ph * 0.6, -1);
  ctx.stroke();
  // the body, hunched forward; shaggy shoulders
  ctx.fillStyle = 'rgba(98,86,72,1)';
  ctx.beginPath();
  ctx.ellipse(1, -18 - bob, 9, 11, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = 'rgba(80,70,58,1)';
  ctx.beginPath();
  ctx.ellipse(4, -25 - bob, 8, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // the long arms, knuckles near the ground — the near one holding a stone
  ctx.strokeStyle = 'rgba(70,60,50,1)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, -24 - bob);
  ctx.quadraticCurveTo(-8, -14, -6 + ph, -3);
  ctx.moveTo(8, -24 - bob);
  ctx.quadraticCurveTo(14, -14, 12 - ph, -4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(128,120,108,1)';
  ctx.beginPath();
  ctx.arc(13 - ph, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // the head thrust forward: a red face, blue ridges beside the nose, a yellow eye
  ctx.fillStyle = 'rgba(80,70,58,1)';
  ctx.beginPath();
  ctx.arc(10, -29 - bob, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = 'rgba(190,52,40,1)';
  ctx.beginPath();
  ctx.ellipse(13, -28 - bob, 3.4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(70,110,170,1)';
  ctx.fillRect(14.6, -30 - bob, 1.2, 4);
  ctx.fillStyle = 'rgba(250,220,90,1)';
  ctx.fillRect(12, -31 - bob, 1.4, 1.2);
}

/** 木魅: a dead tree that is not dead — a twisted trunk, branches for arms, roots for feet, two green lights for eyes. */
function mumei(ctx, t, moving) {
  const sway = Math.sin(t * 1.3) * 2;
  ctx.lineCap = 'round';
  // roots spread on the ground (crawling, when it moves)
  ctx.strokeStyle = 'rgba(52,40,30,1)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const [dx, dy] of [[-10, 1], [-5, 2], [6, 2], [11, 0]]) {
    ctx.moveTo(dx * 0.3, -6);
    ctx.quadraticCurveTo(dx * 0.7, -2, dx + (moving ? Math.sin(t * 8 + dx) * 1.5 : 0), dy);
  }
  ctx.stroke();
  // the trunk, twisted
  ctx.fillStyle = 'rgba(70,56,42,1)';
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.bezierCurveTo(-8, -16, -2 + sway * 0.3, -24, -5 + sway * 0.5, -36);
  ctx.lineTo(4 + sway * 0.5, -36);
  ctx.bezierCurveTo(6 + sway * 0.3, -24, 9, -16, 5, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,30,22,0.8)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1, -8);
  ctx.quadraticCurveTo(-3, -18, 0, -28);
  ctx.moveTo(3, -10);
  ctx.quadraticCurveTo(4, -18, 2, -24);
  ctx.stroke();
  // branches for arms, reaching out
  ctx.strokeStyle = 'rgba(60,46,34,1)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-3 + sway * 0.4, -28);
  ctx.quadraticCurveTo(-12, -34 + sway, -16, -26 + sway);
  ctx.moveTo(-14, -30 + sway);
  ctx.lineTo(-19, -34 + sway);
  ctx.moveTo(3 + sway * 0.4, -30);
  ctx.quadraticCurveTo(12, -38 - sway, 18, -30 - sway);
  ctx.moveTo(15, -35 - sway);
  ctx.lineTo(20, -40 - sway);
  ctx.stroke();
  ctx.fillStyle = 'rgba(96,120,60,0.9)';
  for (const [lx, ly] of [[-19, -35], [20, -41], [-6, -38], [6, -39]]) {
    ctx.beginPath();
    ctx.ellipse(lx + sway * 0.5, ly + sway * 0.3, 2.2, 1.2, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // a hollow for a mouth, two green lights for eyes
  ctx.fillStyle = 'rgba(24,18,12,1)';
  ctx.beginPath();
  ctx.ellipse(1 + sway * 0.4, -26, 3.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(150,240,120,${0.75 + 0.25 * Math.sin(t * 3)})`;
  ctx.fillRect(-2 + sway * 0.4, -31, 1.8, 1.6);
  ctx.fillRect(2.6 + sway * 0.4, -31, 1.8, 1.6);
}

/** 玄龜: the old black tortoise of the lake — a shell like a millstone, a long neck, the lake running off its back. */
function xuanTurtle(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 5) * 1.6 : 0;
  const neck = Math.sin(t * 1.4) * 1.5;
  ctx.lineCap = 'round';
  // stumps of legs
  ctx.fillStyle = 'rgba(46,54,50,1)';
  for (const [x, sg] of [[-16, 1], [-6, -1], [8, 1], [17, -1]]) {
    ctx.beginPath();
    ctx.ellipse(x + ph * sg, -3, 4, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the shell: a dark dome, its plates
  ctx.fillStyle = 'rgba(34,42,40,1)';
  ctx.beginPath();
  ctx.ellipse(0, -11, 24, 13, 0, Math.PI, 0);
  ctx.lineTo(24, -7);
  ctx.quadraticCurveTo(0, -1, -24, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,110,104,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const x of [-12, 0, 12]) {
    ctx.moveTo(x - 5, -10);
    ctx.lineTo(x - 2, -18);
    ctx.lineTo(x + 2, -18);
    ctx.lineTo(x + 5, -10);
  }
  ctx.moveTo(-20, -10);
  ctx.lineTo(20, -10);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,84,78,1)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-24, -7);
  ctx.quadraticCurveTo(0, -1, 24, -7);
  ctx.stroke();
  // the neck and the head, out in front
  ctx.strokeStyle = 'rgba(52,62,56,1)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(20, -9);
  ctx.quadraticCurveTo(28, -14 + neck, 31, -19 + neck);
  ctx.stroke();
  ctx.fillStyle = 'rgba(56,66,60,1)';
  ctx.beginPath();
  ctx.ellipse(33, -20 + neck, 5, 3.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(220,200,90,1)';
  ctx.fillRect(34, -22 + neck, 1.5, 1.3);
  // the lake still running off its back
  ctx.strokeStyle = 'rgba(150,200,230,0.6)';
  ctx.lineWidth = 0.8;
  for (let n = 0; n < 4; n++) {
    const q = (t * 0.8 + n / 4) % 1;
    const x = -18 + n * 11;
    ctx.beginPath();
    ctx.moveTo(x, -9 + q * 4);
    ctx.lineTo(x, -7 + q * 4);
    ctx.stroke();
  }
}

/** 赤炎妖虎: a great red tiger, black-striped, flame running along its back and at the tip of its tail. */
function fireTiger(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 10) * 2 : 0;
  const coat = 'rgba(196,82,36,1)';
  const dark = 'rgba(120,40,20,1)';
  // legs
  ctx.lineCap = 'round';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  for (const x of [-14, -7, 8, 15]) {
    ctx.moveTo(x, -10);
    ctx.lineTo(x + ph * (x > 0 ? 1 : -1), -0.5);
  }
  ctx.stroke();
  // the tail, ending in a flame
  const sw = Math.sin(t * 3) * 3;
  ctx.strokeStyle = coat;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -16);
  ctx.quadraticCurveTo(-28, -18 + sw * 0.4, -30, -27 + sw);
  ctx.stroke();
  flameTongue(ctx, -30, -27 + sw, 5.5, t, 0);
  // the body, a pale belly beneath
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(0, -15, 21, 9, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(236,214,180,0.9)';
  ctx.beginPath();
  ctx.ellipse(1, -9.5, 15, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // stripes
  ctx.strokeStyle = 'rgba(30,22,18,0.92)';
  ctx.lineWidth = 1.6;
  for (const x of [-13, -7, -1, 5, 11]) {
    ctx.beginPath();
    ctx.moveTo(x + 1, -23);
    ctx.quadraticCurveTo(x - 2, -18, x + 0.5, -13);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(0, -15, 21, 9, -0.04, 0, Math.PI * 2);
  ctx.stroke();
  // flame along its back
  for (let k = 0; k < 5; k++) flameTongue(ctx, -12 + k * 5.5, -23.5, 3.2 + (k % 2) * 1.2, t, k);
  // the head: ears, a white muzzle, gold eyes, 王 on its brow
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(18, -25);
  ctx.lineTo(19.5, -30);
  ctx.lineTo(22, -26);
  ctx.moveTo(24, -26);
  ctx.lineTo(26.5, -30.5);
  ctx.lineTo(27.5, -25);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(23, -20, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = 'rgba(244,232,212,1)';
  ctx.beginPath();
  ctx.ellipse(27.5, -16.5, 4, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(250,200,60,1)';
  ctx.beginPath();
  ctx.arc(26, -21.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,14,1)';
  ctx.fillRect(26, -22, 0.7, 1.1);
  ctx.strokeStyle = 'rgba(30,22,18,0.9)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (const y of [-26.2, -24.6, -23]) {
    ctx.moveTo(21.4, y);
    ctx.lineTo(24.4, y);
  }
  ctx.moveTo(22.9, -26.2);
  ctx.lineTo(22.9, -23);
  ctx.stroke();
  ctx.fillStyle = 'rgba(30,22,18,1)';
  ctx.beginPath();
  ctx.arc(30.6, -17.4, 1, 0, Math.PI * 2);
  ctx.fill();
}

/** A tongue of flame at (x, y), flickering. */
function flameTongue(ctx, x, y, r, t, k) {
  const f = 1 + Math.sin(t * 13 + k * 1.7) * 0.18;
  const h = r * 2.2 * f;
  const g = ctx.createRadialGradient(x, y - h * 0.25, 0, x, y - h * 0.3, h);
  g.addColorStop(0, 'rgba(255,240,170,0.95)');
  g.addColorStop(0.45, 'rgba(250,150,50,0.85)');
  g.addColorStop(1, 'rgba(220,60,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, y);
  ctx.quadraticCurveTo(x - r * 0.6, y - h * 0.6, x + Math.sin(t * 9 + k) * r * 0.4, y - h);
  ctx.quadraticCurveTo(x + r * 0.7, y - h * 0.5, x + r * 0.8, y);
  ctx.closePath();
  ctx.fill();
}

function skeleton(ctx, t, moving) {
  const bone = 'rgba(226,220,204,1)';
  const ph = moving ? Math.sin(t * 8) * 2 : 0;
  ctx.lineCap = 'round';
  const limb = (pts, w) => {
    ctx.strokeStyle = rgba(INK, 0.75);
    ctx.lineWidth = w + 1.2;
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = bone;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  limb([[-4, -30], [-6 + ph, -16], [-7 + ph, 0]], 2.2);
  limb([[4, -30], [6 - ph, -16], [7 - ph, 0]], 2.2);
  limb([[0, -30], [0, -50]], 2.4);
  // ribs
  for (let k = 0; k < 4; k++) {
    const y = -48 + k * 4;
    limb([[-6 + k * 0.6, y + 2], [0, y], [6 - k * 0.6, y + 2]], 1.1);
  }
  // a rag of a red war-robe, still hanging on
  ctx.fillStyle = 'rgba(130,36,30,0.85)';
  ctx.beginPath();
  ctx.moveTo(-7, -31);
  ctx.lineTo(7, -31);
  ctx.lineTo(9, -18);
  ctx.lineTo(3, -21);
  ctx.lineTo(-2, -16);
  ctx.lineTo(-8, -20);
  ctx.closePath();
  ctx.fill();
  limb([[-6, -49], [-12, -38], [-14, -28]], 1.8);
  limb([[6, -49], [12, -40], [15, -33]], 1.8);
  // the skull, and the light in its eyes
  ctx.fillStyle = bone;
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, -56, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,230,170,0.9)';
  ctx.fillRect(-2.6, -57.5, 1.6, 1.6);
  ctx.fillRect(1, -57.5, 1.6, 1.6);
  // the broken halberd
  ctx.strokeStyle = 'rgba(70,52,36,1)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(15, -33);
  ctx.lineTo(20, -70);
  ctx.stroke();
  ctx.fillStyle = 'rgba(150,154,158,1)';
  ctx.beginPath();
  ctx.moveTo(19.5, -66);
  ctx.lineTo(28, -70);
  ctx.lineTo(26, -60);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

// ── 0.21 南嶺 ──

/** 瘴林毒蛛: a spider the size of a dog — a black-brown body with a red mark on it, eight jointed legs, a cluster of red eyes. */
function spider(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 16) : 0;
  const bob = moving ? Math.abs(Math.sin(t * 16)) * 0.8 : Math.sin(t * 2) * 0.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // four legs a side, each bent up at the knee and down to the ground (the far side's darker, behind)
  const legs = (far) => {
    ctx.strokeStyle = far ? 'rgba(44,36,30,0.85)' : 'rgba(28,22,20,1)';
    ctx.lineWidth = far ? 1.3 : 1.7;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const dx = [-13, -6, 6, 12][i] + (far ? 2 : 0);
      const sw = ph * (i % 2 ? 2 : -2) * (far ? -1 : 1);
      const bx = i * 1.6 - 1.4;
      const by = -8 - bob;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + dx * 0.55 + sw * 0.4, by - (i === 0 || i === 3 ? 7 : 9));
      ctx.lineTo(bx + dx + sw, 0);
    }
    ctx.stroke();
  };
  legs(true);
  // the abdomen, round and dark, an hourglass of red on it
  ctx.fillStyle = 'rgba(46,36,30,1)';
  ctx.beginPath();
  ctx.ellipse(-7, -10 - bob, 8.5, 6.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(196,52,32,0.95)';
  ctx.beginPath();
  ctx.moveTo(-10, -14.5 - bob);
  ctx.lineTo(-5, -14.5 - bob);
  ctx.lineTo(-7.5, -11.5 - bob);
  ctx.closePath();
  ctx.moveTo(-7.5, -11.5 - bob);
  ctx.lineTo(-10, -8.5 - bob);
  ctx.lineTo(-5, -8.5 - bob);
  ctx.closePath();
  ctx.fill();
  // the head
  ctx.fillStyle = 'rgba(60,48,38,1)';
  ctx.beginPath();
  ctx.ellipse(3.5, -8.5 - bob, 5.2, 4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.stroke();
  legs(false);
  // a fang, and the eyes
  ctx.strokeStyle = 'rgba(30,24,20,1)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(7.5, -7 - bob);
  ctx.quadraticCurveTo(10, -5.5 - bob, 8.6, -3.6 - bob);
  ctx.stroke();
  ctx.fillStyle = 'rgba(232,52,40,1)';
  for (const [ex, ey] of [[6.4, -10.6], [7.8, -10], [5.4, -11.4], [7, -11.8]]) {
    ctx.beginPath();
    ctx.arc(ex, ey - bob, 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 毒沼巨蟾: a toad as big as a water jar — squat and warty, a pale throat that swells, a gold
 * eye barred black. king: the lord of the marsh, purple-black, its warts yellow and weeping.
 */
function toad(ctx, t, moving, king = false) {
  const hop = moving ? Math.abs(Math.sin(t * 6)) * 3 : 0;
  const puff = 1 + Math.max(0, Math.sin(t * 2.2)) * 0.14;
  const skin = king ? 'rgba(74,54,78,1)' : 'rgba(96,104,58,1)';
  const dark = king ? 'rgba(42,30,46,1)' : 'rgba(58,64,34,1)';
  const wart = king ? 'rgba(214,184,92,0.95)' : 'rgba(70,58,36,0.9)';
  ctx.lineCap = 'round';
  // the hind leg folded under the haunch, its long foot flat; a front leg propping it up
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(-10, -6 - hop * 0.5, 8, 5.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-5, -1, 7, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(9, -8 - hop);
  ctx.lineTo(11, -0.5);
  ctx.stroke();
  // the body
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -11 - hop, 15, 9.5, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // the throat, swelling and going down
  ctx.fillStyle = king ? 'rgba(206,184,206,0.92)' : 'rgba(222,214,160,0.92)';
  ctx.beginPath();
  ctx.ellipse(10, -6.5 - hop, 5.5 * puff, 3.6 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  // warts
  ctx.fillStyle = wart;
  for (const [wx, wy, wr] of [[-8, -15, 1.4], [-3, -18, 1.6], [3, -17, 1.2], [-11, -10, 1.1], [-2, -12, 1.2], [5, -13, 1], [-6, -7.5, 1]]) {
    ctx.beginPath();
    ctx.arc(wx, wy - hop, wr * (king ? 1.3 : 1), 0, Math.PI * 2);
    ctx.fill();
  }
  // the head: a wide mouth, the eyes up on top
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(11, -13 - hop, 7, 5.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,26,20,0.9)';
  ctx.beginPath();
  ctx.moveTo(5.5, -11 - hop);
  ctx.quadraticCurveTo(12, -8.4 - hop, 17.6, -11.6 - hop);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(9, -18.4 - hop, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = king ? 'rgba(236,90,50,1)' : 'rgba(226,186,60,1)';
  ctx.beginPath();
  ctx.arc(12.4, -18 - hop, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = 'rgba(20,16,14,1)';
  ctx.fillRect(10.6, -18.5 - hop, 3.6, 1);
}

/** 蠱蟲群: a cloud of 蠱 — black-shelled insects the size of a thumb, the wings a blur, circling one another. */
function swarm(ctx, t) {
  const haze = ctx.createRadialGradient(0, -22, 0, 0, -22, 16);
  haze.addColorStop(0, 'rgba(40,36,30,0.45)');
  haze.addColorStop(1, 'rgba(40,36,30,0)');
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.ellipse(0, -22, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let n = 0; n < 16; n++) {
    const a = t * (2.2 + (n % 5) * 0.37) + n * 2.39;
    const r = 4 + ((n * 37) % 11);
    const x = Math.cos(a) * r;
    const y = -22 + Math.sin(a * 1.3 + n) * r * 0.6;
    ctx.fillStyle = 'rgba(222,228,232,0.55)';
    ctx.beginPath();
    ctx.ellipse(x - 0.5, y - 1.6, 1.8, 1, Math.sin(t * 40 + n), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = n % 4 ? 'rgba(26,24,20,1)' : 'rgba(156,124,40,1)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2, 1.4, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 蠱母: the mother of the valley's 蠱 — a centipede as long as a boat, bronze plates edged with gold, its front reared up, jaws dripping. */
function centipede(ctx, t, moving) {
  const N = 12;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const wave = Math.sin(t * (moving ? 9 : 2) - i * 0.8) * (moving ? 1.6 : 0.6);
    const rise = u > 0.55 ? Math.pow((u - 0.55) / 0.45, 1.4) * 24 : 0;
    pts.push([-32 + u * 48, -5 - rise + (u <= 0.55 ? wave * 0.5 : wave * 0.2), u]);
  }
  ctx.lineCap = 'round';
  // the legs, a pair to each plate, rippling down it as it goes (waving in the air, up front)
  ctx.strokeStyle = 'rgba(126,74,32,1)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < N - 1; i++) {
    const [x, y, u] = pts[i];
    const sw = Math.sin(t * (moving ? 14 : 3) - i * 1.1) * 2.2;
    if (u <= 0.55) {
      ctx.moveTo(x - 1, y + 1);
      ctx.lineTo(x - 3 + sw, 0);
      ctx.moveTo(x + 1, y + 1);
      ctx.lineTo(x + 3 - sw, 0.5);
    } else {
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x + 4 + sw, y + 7);
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x - 3 - sw, y + 6.5);
    }
  }
  ctx.stroke();
  // the tail's two prongs
  ctx.strokeStyle = 'rgba(70,48,28,1)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[0][0] - 7, pts[0][1] - 3);
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[0][0] - 6, pts[0][1] + 2);
  ctx.stroke();
  // the plates, from the tail up to the head
  for (let i = 0; i < N - 1; i++) {
    const [x, y, u] = pts[i];
    const [nx, ny] = pts[i + 1];
    const a = Math.atan2(ny - y, nx - x);
    const r = 3.4 + Math.sin(u * Math.PI) * 1.6;
    ctx.fillStyle = i % 2 ? 'rgba(76,52,30,1)' : 'rgba(96,66,34,1)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.25, r, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212,172,74,0.9)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.25, r, a, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  // the head: a flat plate, feelers swept back, two curved jaws, venom at their tips
  const [hx, hy] = pts[N - 1];
  const tw = Math.sin(t * 3) * 1.5;
  ctx.strokeStyle = 'rgba(70,48,28,1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx + 1, hy - 3);
  ctx.quadraticCurveTo(hx - 4, hy - 14 + tw, hx - 14, hy - 12 + tw);
  ctx.moveTo(hx + 2, hy - 3);
  ctx.quadraticCurveTo(hx + 2, hy - 15 - tw, hx - 6, hy - 18 - tw);
  ctx.stroke();
  ctx.fillStyle = 'rgba(110,74,36,1)';
  ctx.beginPath();
  ctx.ellipse(hx + 1, hy, 5.6, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  const shut = Math.sin(t * 4) * 0.8;
  ctx.strokeStyle = 'rgba(40,28,20,1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hx + 4, hy + 1);
  ctx.quadraticCurveTo(hx + 10, hy + 1 - shut, hx + 9, hy + 5);
  ctx.moveTo(hx + 4, hy + 2.5);
  ctx.quadraticCurveTo(hx + 8, hy + 5 + shut, hx + 5.5, hy + 7);
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,190,70,0.9)';
  ctx.beginPath();
  ctx.arc(hx + 9, hy + 5.6, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(232,60,40,1)';
  ctx.beginPath();
  ctx.arc(hx + 2.6, hy - 1.6, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

// ── 0.22 西漠 ──

/** 沙蠍: a scorpion as long as a dog — a black shell gone brown at its edges, pincers held out in front, the tail curled up over its back, an amber sting hanging at the end of it. */
function scorpion(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 18) : 0;
  const bob = moving ? Math.abs(Math.sin(t * 18)) * 0.6 : 0;
  const shell = 'rgba(48,36,28,1)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // four short bent legs a side, scuttling (the far side's paler, behind)
  const legs = (far) => {
    ctx.strokeStyle = far ? 'rgba(70,54,40,0.85)' : 'rgba(34,26,20,1)';
    ctx.lineWidth = far ? 1.1 : 1.4;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const bx = -6 + i * 3.2;
      const sw = ph * (i % 2 ? 1.6 : -1.6) * (far ? -1 : 1);
      ctx.moveTo(bx, -5 - bob);
      ctx.lineTo(bx - 2.4 + sw * 0.4, -8 - bob);
      ctx.lineTo(bx - 4 + sw, 0);
    }
    ctx.stroke();
  };
  // a pincer: the arm out in front, a swollen claw, its two fingers opening and snapping shut
  const claw = (far) => {
    const o = far ? -1.6 : 0;
    const snap = Math.max(0, Math.sin(t * 3 + (far ? 1.4 : 0))) * 0.9;
    ctx.strokeStyle = far ? 'rgba(70,54,40,1)' : shell;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, -6 + o - bob);
    ctx.lineTo(9.5, -9.5 + o - bob);
    ctx.lineTo(12.5, -7.5 + o - bob);
    ctx.stroke();
    ctx.fillStyle = far ? 'rgba(78,60,42,1)' : 'rgba(66,50,36,1)';
    ctx.beginPath();
    ctx.ellipse(15, -7.6 + o - bob, 3.3, 2.3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.strokeStyle = far ? 'rgba(70,54,40,1)' : shell;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(17.6, -8.6 + o - bob);
    ctx.quadraticCurveTo(20.6, -9.8 - snap * 2 + o - bob, 21.2, -7.6 + o - bob);
    ctx.moveTo(17.6, -6.8 + o - bob);
    ctx.quadraticCurveTo(20.2, -5.2 + snap * 2 + o - bob, 20.8, -6.9 + o - bob);
    ctx.stroke();
  };
  legs(true);
  claw(true);
  // the body: a long low shell, ridged across
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(-1, -6 - bob, 9, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(132,98,58,0.85)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const x of [-6, -3, 0, 3]) {
    ctx.moveTo(x, -9.4 - bob);
    ctx.quadraticCurveTo(x + 0.8, -6 - bob, x, -2.6 - bob);
  }
  ctx.stroke();
  legs(false);
  // the tail: segments curling up from the rear and over, each smaller than the last
  const sw = Math.sin(t * 2.4) * 1.2;
  const segs = [[-9, -7.5, 2.6], [-12.5, -10.5, 2.5], [-14.4, -15, 2.4], [-13.4, -19.8, 2.3], [-9.6, -23 + sw * 0.4, 2.2], [-4.6, -23.6 + sw * 0.7, 2.1]];
  for (const [x, y, r] of segs) {
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(x, y - bob, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(132,98,58,0.8)';
    ctx.beginPath();
    ctx.arc(x, y - bob, r * 0.7, -2.4, -0.8);
    ctx.stroke();
  }
  // the sting: a bulb, and the hook of it, hanging over its head
  ctx.fillStyle = 'rgba(176,120,44,1)';
  ctx.beginPath();
  ctx.ellipse(-0.6, -21.8 + sw - bob, 2.6, 2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,28,18,1)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(1.4, -20.6 + sw - bob);
  ctx.quadraticCurveTo(3.6, -19.6 + sw - bob, 3, -17 + sw - bob);
  ctx.stroke();
  claw(false);
  // two small eyes on the front of the shell
  ctx.fillStyle = 'rgba(214,170,90,1)';
  ctx.fillRect(6, -8.4 - bob, 1, 0.9);
  ctx.fillRect(7.4, -8 - bob, 1, 0.9);
}

/** How the dead of 沙陀寺 look (drawn with the people's brush): the robe gone the color of the sand, the skin dried dark to the bone; their abbot's 袈裟 still red and gold. */
const MUMMY_LOOK = { robe: [150, 126, 90], trim: [110, 84, 56], hair: 'bald', skin: [112, 90, 66] };
const KUCHAN_LOOK = { robe: [140, 60, 38], trim: [214, 170, 70], hair: 'bald', skin: [104, 84, 60] };

/** 乾屍: a monk of 沙陀寺 dead sixty years and up again — a lurch, not a walk; stiff arms held out, wrappings, rags of the robe hanging, two embers for eyes. */
function mummy(ctx, t, moving) {
  ctx.save();
  ctx.rotate(Math.sin(t * 2.2) * 0.05);
  const was = FIGURE.shadows;
  FIGURE.shadows = false;
  drawPerson(ctx, 0, 0, MUMMY_LOOK, { t: t * 0.6, moving, face: 1 });
  FIGURE.shadows = was;
  ctx.lineCap = 'round';
  // the wrappings across the robe
  ctx.strokeStyle = 'rgba(214,200,170,0.85)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const y of [-21, -17, -12, -8]) {
    ctx.moveTo(-5.5, y + 1.5);
    ctx.lineTo(5.5, y - 1);
  }
  ctx.stroke();
  // rags hanging off the hem
  ctx.fillStyle = 'rgba(150,126,90,1)';
  for (const x of [-6, -2, 3, 6]) {
    const sg = Math.sin(t * 3 + x) * 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 1.2, -2.5);
    ctx.lineTo(x + sg, 1.2);
    ctx.lineTo(x + 1.2, -2.5);
    ctx.fill();
  }
  // the arms held stiff out in front, the fingers hooked
  ctx.strokeStyle = 'rgba(96,76,56,1)';
  ctx.lineWidth = 1.8;
  const a1 = Math.sin(t * 2) * 0.6;
  const a2 = Math.sin(t * 2 + 1) * 0.6;
  ctx.beginPath();
  ctx.moveTo(3, -23);
  ctx.lineTo(13, -22 + a1);
  ctx.moveTo(1, -22);
  ctx.lineTo(12, -19 + a2);
  ctx.stroke();
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (const [hx, hy] of [[13, -22 + a1], [12, -19 + a2]]) {
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + 2, hy + 1.2);
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + 1.6, hy - 1);
  }
  ctx.stroke();
  // the face: the sockets dark, an ember in each, the mouth fallen open
  ctx.fillStyle = 'rgba(36,26,18,0.92)';
  ctx.beginPath();
  ctx.arc(1.8, -29.6, 1.05, 0, Math.PI * 2);
  ctx.arc(3.8, -29.4, 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(2, -27.4, 2, 1);
  ctx.fillStyle = `rgba(240,150,60,${0.7 + 0.3 * Math.sin(t * 4)})`;
  ctx.fillRect(1.4, -30, 0.9, 0.9);
  ctx.fillRect(3.4, -29.8, 0.9, 0.9);
  ctx.restore();
}

/** 枯禪: 沙陀寺's abbot, sixty years dead and still sitting — cross-legged on the air, a 袈裟 of red and gold in rags, beads round his neck, a ring of gold behind his head gone dull, his eyes shut (and then not). */
function kuchan(ctx, t) {
  const hover = 7 + Math.sin(t * 1.4) * 1.5;
  const hy = -20 - hover;
  // the light about him, and the ring behind his head
  const glow = ctx.createRadialGradient(0, -14 - hover, 0, 0, -14 - hover, 24);
  glow.addColorStop(0, 'rgba(240,200,110,0.28)');
  glow.addColorStop(1, 'rgba(240,200,110,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -14 - hover, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(226,180,80,${0.55 + 0.2 * Math.sin(t * 2)})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0.5, hy, 6.8, 0, Math.PI * 2);
  ctx.stroke();
  const was = FIGURE.shadows;
  FIGURE.shadows = false;
  drawPerson(ctx, 0, -hover, KUCHAN_LOOK, { t, sit: true });
  FIGURE.shadows = was;
  // the 袈裟's patchwork: gold lines over the red, and a tear or two
  ctx.strokeStyle = 'rgba(214,170,70,0.85)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-8, -3 - hover);
  ctx.lineTo(8, -3 - hover);
  ctx.moveTo(-6, -8 - hover);
  ctx.lineTo(6, -8 - hover);
  ctx.moveTo(-3.5, -14 - hover);
  ctx.lineTo(-5.5, -1 - hover);
  ctx.moveTo(3.5, -14 - hover);
  ctx.lineTo(5.5, -1 - hover);
  ctx.stroke();
  ctx.fillStyle = 'rgba(70,40,28,0.9)';
  ctx.beginPath();
  ctx.moveTo(6, -5 - hover);
  ctx.lineTo(9, -1 - hover);
  ctx.lineTo(5, -2 - hover);
  ctx.fill();
  // beads round his neck
  ctx.fillStyle = 'rgba(84,52,30,1)';
  for (let n = 0; n < 7; n++) {
    const a = Math.PI * (0.2 + n * 0.1);
    ctx.beginPath();
    ctx.arc(0.5 + Math.cos(a) * 3.8, hy + 3 + Math.sin(a) * 3, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // the eyes: two dark lines (now and then a glint of gold between them)
  ctx.strokeStyle = 'rgba(30,22,16,0.9)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(1.2, hy - 0.4);
  ctx.lineTo(2.6, hy - 0.2);
  ctx.moveTo(3.2, hy - 0.2);
  ctx.lineTo(4.4, hy - 0.4);
  ctx.stroke();
  if (Math.sin(t * 0.9) > 0.85) {
    ctx.fillStyle = 'rgba(250,210,110,0.95)';
    ctx.fillRect(1.6, hy - 0.8, 0.8, 0.7);
    ctx.fillRect(3.4, hy - 0.8, 0.8, 0.7);
  }
}

/** 沙蛟: the last 蛟 of the dried 西海, that learned to swim in sand — a body as thick as a man, the gold-brown of the dunes banded darker, humped up out of the sand and under again; the head reared, two horns swept back, a fin down its neck. */
function sandJiao(ctx, t, moving) {
  const sw = Math.sin(t * (moving ? 5 : 1.5));
  const hide = 'rgba(178,140,86,1)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const body = (draw) => {
    ctx.beginPath();
    draw();
    ctx.strokeStyle = 'rgba(70,50,30,1)';
    ctx.lineWidth = 8.4;
    ctx.stroke();
    ctx.strokeStyle = hide;
    ctx.lineWidth = 6.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(112,82,48,0.9)';
    ctx.lineWidth = 6.6;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(228,206,160,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };
  // two humps of the body out of the sand behind it
  body(() => {
    ctx.moveTo(-31, 0);
    ctx.bezierCurveTo(-29, -11 + sw, -19, -11 + sw, -17, 0);
  });
  body(() => {
    ctx.moveTo(-13, 0);
    ctx.bezierCurveTo(-11, -14 - sw, -1, -14 - sw, 1, 0);
  });
  // the fin down the neck (behind it), then the neck rearing up out of the sand
  const nx = 9 + sw * 1.2;
  ctx.fillStyle = 'rgba(132,64,40,0.95)';
  ctx.beginPath();
  ctx.moveTo(3, -6);
  for (let k = 0; k <= 5; k++) ctx.lineTo(1 + k * 1.4 + sw * k * 0.2 - 2.4, -8 - k * 3.6 - (k % 2 ? 2.4 : 0));
  ctx.lineTo(nx - 2, -25);
  ctx.closePath();
  ctx.fill();
  body(() => {
    ctx.moveTo(4, 0);
    ctx.bezierCurveTo(5, -10, 3 + sw, -18, nx, -25);
  });
  // the head: long, jaws a little open, the horns swept back, an amber eye
  const hx = nx + 4;
  const hy = -27.5;
  ctx.strokeStyle = 'rgba(206,190,150,1)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx - 3, hy - 3);
  ctx.quadraticCurveTo(hx - 7, hy - 7, hx - 11, hy - 8);
  ctx.moveTo(hx - 1, hy - 3.5);
  ctx.quadraticCurveTo(hx - 3, hy - 9, hx - 7, hy - 11.5);
  ctx.stroke();
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.moveTo(hx - 4, hy - 3);
  ctx.quadraticCurveTo(hx + 3, hy - 5, hx + 9, hy - 1.2);
  ctx.lineTo(hx + 8.6, hy + 0.2);
  ctx.lineTo(hx + 1, hy + 0.6);
  ctx.lineTo(hx + 8, hy + 2.2);
  ctx.quadraticCurveTo(hx + 2, hy + 4.4, hx - 4, hy + 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,190,60,1)';
  ctx.beginPath();
  ctx.arc(hx + 1.6, hy - 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,12,1)';
  ctx.fillRect(hx + 1.4, hy - 2.7, 0.5, 1.4);
  // the sand heaped where it goes under and comes up, rippling round it
  ctx.fillStyle = 'rgba(214,186,134,1)';
  ctx.strokeStyle = 'rgba(150,120,80,0.7)';
  ctx.lineWidth = 0.7;
  for (const x of [-31, -17, -13, 1, 4]) {
    ctx.beginPath();
    ctx.ellipse(x, -0.6, 4.6, 2.2, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
  }
  if (moving) {
    ctx.fillStyle = 'rgba(214,186,134,0.8)';
    for (let n = 0; n < 6; n++) {
      const q = (t * 2 + n / 6) % 1;
      ctx.fillRect(-31 + n * 7 - q * 4, -1 - Math.sin(q * Math.PI) * 4, 1.2, 1.2);
    }
  }
}

/** 石傀 (and 石翁仲, the great one at the 星門): a guard of the old city cut from the yellow stone — blocks for a body, a thousand years of cracks across it, light in its eye slits. general: a helmet, a stone halberd, starlight in the cracks. */
function stoneGuard(ctx, t, moving, general = false) {
  const stone = general ? 'rgba(150,142,126,1)' : 'rgba(166,150,120,1)';
  const shade = general ? 'rgba(104,98,88,1)' : 'rgba(118,104,82,1)';
  const lit = general ? [190, 214, 255] : [240, 176, 80];
  const step = moving ? Math.sin(t * 6) : 0;
  const block = (x, y, w, h, fill = stone) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, y, w, h);
  };
  // legs: two stubby pillars, one lifted at a time
  block(-6.5, -11 - Math.max(0, step) * 1.6, 5, 11, shade);
  block(1.5, -11 - Math.max(0, -step) * 1.6, 5, 11, shade);
  // the far arm
  block(-11, -29, 4.5, 15, shade);
  // the body: wider at the shoulders, a belt of carved scales
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-8, -31);
  ctx.lineTo(8, -31);
  ctx.lineTo(6.5, -10);
  ctx.lineTo(-6.5, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,80,64,0.8)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const y of [-24, -20.5]) {
    for (let x = -6; x < 6; x += 2.4) {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 1.2, y + 2, x + 2.4, y);
    }
  }
  ctx.moveTo(-6.8, -15);
  ctx.lineTo(6.8, -15);
  ctx.stroke();
  // the head: a block, a heavy brow, two slits of light
  block(-4.5, -39, 9, 8);
  ctx.fillStyle = shade;
  ctx.fillRect(-5, -36.6, 10, 1.4);
  ctx.fillStyle = rgba(lit, 0.75 + 0.25 * Math.sin(t * 3));
  ctx.fillRect(0.2, -35, 2.2, 1);
  ctx.fillRect(3, -35, 1.6, 1);
  if (general) {
    // a helmet with a crest, flared at the neck
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(-6, -38);
    ctx.lineTo(6, -38);
    ctx.lineTo(5, -43);
    ctx.lineTo(-5, -43);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.stroke();
    ctx.fillRect(-1, -48, 2, 5);
    ctx.fillStyle = 'rgba(120,58,40,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.quadraticCurveTo(-6, -49, -8, -44);
    ctx.quadraticCurveTo(-4, -46, 0, -45);
    ctx.fill();
  }
  // the cracks of a thousand years (starlight in them, in the great one)
  ctx.strokeStyle = general ? rgba(lit, 0.6 + 0.3 * Math.sin(t * 2.2)) : 'rgba(70,60,46,0.9)';
  ctx.lineWidth = general ? 0.8 : 0.6;
  ctx.beginPath();
  ctx.moveTo(-3, -31);
  ctx.lineTo(-1, -27);
  ctx.lineTo(-3.5, -23);
  ctx.lineTo(-2, -18);
  ctx.moveTo(4, -29);
  ctx.lineTo(2.5, -25);
  ctx.moveTo(-3, -39);
  ctx.lineTo(-1.5, -36.6);
  ctx.moveTo(5, -12);
  ctx.lineTo(3.4, -15);
  ctx.stroke();
  // the near arm: a fist (the great one's holding its halberd upright)
  block(7, -29, 4.5, 15);
  if (general) {
    ctx.strokeStyle = 'rgba(96,88,76,1)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(9.5, 2);
    ctx.lineTo(9.5, -56);
    ctx.stroke();
    ctx.fillStyle = 'rgba(140,134,122,1)';
    ctx.beginPath();
    ctx.moveTo(9.5, -62);
    ctx.lineTo(11, -56);
    ctx.lineTo(8, -56);
    ctx.closePath();
    ctx.moveTo(10.5, -54);
    ctx.quadraticCurveTo(18, -56, 17, -47);
    ctx.quadraticCurveTo(14, -51, 10.5, -50);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  block(7.4, -15.5, 4, 3.4, shade);
}

/** The big ones: a demon wolf, the wolf king, the python, the iron-backed bear, the skeleton general. */
export function drawBigBeast(ctx, kind, { t = 0, face = 1, moving = false } = {}) {
  ctx.save();
  groundShadow(ctx, 0, 0, { demon_wolf: 15, wolf_king: 22, python: 24, bear: 22, skeleton: 12, fire_tiger: 25, shanxiao: 12, mumei: 12, xuan_turtle: 27, spider: 14, toad: 16, toad_king: 25, swarm: 12, gu_mother: 30, scorpion: 15, sand_wolf: 16, mummy: 8, kuchan: 13, sand_jiao: 30, stone_puppet: 11, stone_general: 19 }[kind] || 14, 3);
  ctx.scale(face, 1);
  switch (kind) {
    case 'demon_wolf':
      ctx.scale(1.35, 1.35);
      wolfShape(ctx, t, moving, { body: 'rgba(58,48,46,1)', dark: 'rgba(36,30,28,1)', eye: 'rgba(230,60,40,1)' });
      break;
    case 'wolf_king':
      ctx.scale(1.85, 1.85);
      wolfShape(ctx, t, moving, { body: 'rgba(176,178,180,1)', dark: 'rgba(110,112,114,1)', eye: 'rgba(240,200,60,1)', mane: true, scar: true });
      break;
    case 'python':
      python(ctx, t);
      break;
    case 'bear':
      bear(ctx, t, moving);
      break;
    case 'skeleton':
      skeleton(ctx, t, moving);
      break;
    case 'fire_tiger':
      ctx.scale(1.15, 1.15);
      fireTiger(ctx, t, moving);
      break;
    case 'shanxiao':
      shanxiao(ctx, t, moving);
      break;
    case 'mumei':
      mumei(ctx, t, moving);
      break;
    case 'xuan_turtle':
      ctx.scale(1.1, 1.1);
      xuanTurtle(ctx, t, moving);
      break;
    case 'spider':
      spider(ctx, t, moving);
      break;
    case 'toad':
      toad(ctx, t, moving);
      break;
    case 'toad_king':
      ctx.scale(1.55, 1.55);
      toad(ctx, t, moving, true);
      break;
    case 'swarm':
      ctx.scale(1.5, 1.5);
      swarm(ctx, t);
      break;
    case 'gu_mother':
      ctx.scale(1.15, 1.15);
      centipede(ctx, t, moving);
      break;
    case 'scorpion':
      scorpion(ctx, t, moving);
      break;
    case 'sand_wolf':
      ctx.scale(1.3, 1.3);
      wolfShape(ctx, t, moving, { body: 'rgba(186,154,106,1)', dark: 'rgba(126,98,62,1)', eye: 'rgba(240,190,70,1)' });
      break;
    case 'mummy':
      mummy(ctx, t, moving);
      break;
    case 'kuchan':
      ctx.scale(1.2, 1.2);
      kuchan(ctx, t);
      break;
    case 'sand_jiao':
      ctx.scale(1.15, 1.15);
      sandJiao(ctx, t, moving);
      break;
    case 'stone_puppet':
      stoneGuard(ctx, t, moving);
      break;
    case 'stone_general':
      ctx.scale(1.6, 1.6);
      stoneGuard(ctx, t, moving, true);
      break;
    default:
      break;
  }
  ctx.restore();
}

export const BIG_BEASTS = new Set(['demon_wolf', 'wolf_king', 'python', 'bear', 'skeleton', 'fire_tiger', 'shanxiao', 'mumei', 'xuan_turtle', 'spider', 'toad', 'toad_king', 'swarm', 'gu_mother', 'scorpion', 'sand_wolf', 'mummy', 'kuchan', 'sand_jiao', 'stone_puppet', 'stone_general']);

/** Props that flicker or sway (repainted as they go); the rest are still. */
export const LIVE_PROPS = new Set(['campfire', 'ginseng', 'wisp']);

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
  else drawProp(ctx, ac.prop, { t: t + (ac.n || 0) * 1.3, face: ac.face || 1 });
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
  if (!fly) groundShadow(ctx, 0, 0, kind === 'camel' ? 14 : kind === 'deer' || kind === 'spirit_deer' || kind === 'fox_trapped' ? 11 : 6, 2);
  ctx.scale(face, 1);
  switch (kind) {
    case 'fox':
      fox(ctx, t, moving);
      break;
    case 'redfox':
      fox(ctx, t, moving, { red: true, lantern: false });
      break;
    case 'fox_trapped':
      trappedFox(ctx, t);
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
    case 'camel':
      camel(ctx, t, moving);
      break;
    default:
      break;
  }
  ctx.restore();
}

/** A camel of the caravans (月泉): two humps, a long curved neck, knobbed knees; it chews, and its head nods as it walks. */
function camel(ctx, t, moving) {
  const ph = moving ? Math.sin(t * 6) : 0;
  const nod = moving ? Math.sin(t * 6) * 1.2 : Math.sin(t * 0.8) * 0.6;
  const coat = 'rgba(178,140,92,1)';
  ctx.lineCap = 'round';
  // the far legs, then the near
  ctx.strokeStyle = 'rgba(140,108,70,1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -14);
  ctx.lineTo(-6 - ph * 3, 0);
  ctx.moveTo(6, -14);
  ctx.lineTo(7 + ph * 3, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,124,82,1)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-5, -14);
  ctx.lineTo(-4 + ph * 3, -6);
  ctx.lineTo(-4 + ph * 3.4, 0);
  ctx.moveTo(8, -14);
  ctx.lineTo(9 - ph * 3, -6);
  ctx.lineTo(9 - ph * 3.4, 0);
  ctx.stroke();
  // the body and the two humps
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(1, -17, 12, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const hx of [-4.5, 4.5]) {
    ctx.beginPath();
    ctx.ellipse(hx, -21.5, 3.6, 4.4, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(1, -17, 12, 5.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // the neck curving down and up to the head
  ctx.strokeStyle = coat;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(11, -18);
  ctx.quadraticCurveTo(17, -16 + nod, 17, -26 + nod);
  ctx.stroke();
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(19.5, -27 + nod, 4, 2.2, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.fillStyle = rgba(INK, 0.9);
  ctx.fillRect(18.6, -28.6 + nod, 1, 0.9);
  // a pack and a little bell under the neck
  ctx.fillStyle = 'rgba(150,52,40,0.95)';
  ctx.fillRect(-3, -20, 7, 3.2);
  ctx.fillStyle = 'rgba(206,166,82,1)';
  ctx.beginPath();
  ctx.arc(14.5, -15 + nod * 0.5, 1, 0, Math.PI * 2);
  ctx.fill();
  // the tail
  ctx.strokeStyle = 'rgba(120,92,60,1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-11, -18);
  ctx.quadraticCurveTo(-13, -14, -12.5, -11);
  ctx.stroke();
}

/**
 * A fox. The white one of the shrine carries a little lantern burning blue;
 * a common fox of the fields is red and carries nothing.
 */
function fox(ctx, t, moving, { red = false, lantern = true } = {}) {
  const ph = moving ? Math.sin(t * 13) : 0;
  ctx.strokeStyle = red ? 'rgba(150,84,46,1)' : 'rgba(236,236,232,1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(-5 + ph * 2.4, 0);
  ctx.moveTo(4, -5);
  ctx.lineTo(4 - ph * 2.4, 0);
  ctx.stroke();
  ctx.fillStyle = red ? 'rgba(196,112,60,1)' : 'rgba(246,244,240,1)';
  ctx.beginPath();
  ctx.ellipse(0, -7.5, 8, 3.8, -0.05, 0, Math.PI * 2);
  ctx.fill();
  // the tail, full (and white-tipped, on a red one)
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
  if (red) {
    ctx.fillStyle = 'rgba(244,240,232,1)';
    ctx.beginPath();
    ctx.ellipse(-15, -5, 2.2, 1.6, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = red ? 'rgba(30,24,20,1)' : 'rgba(200,40,40,1)';
  ctx.fillRect(9.5, -9.4, 1, 0.8);
  if (!lantern) return;
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

function trappedFox(ctx, t) {
  // lying on its side, a hind leg in the iron jaws; it breathes, and watches you
  const breath = Math.sin(t * 2) * 0.4;
  ctx.fillStyle = 'rgba(246,244,240,1)';
  ctx.strokeStyle = rgba(INK, 0.45);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(0, -4, 8.5, 3.4 + breath, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, -5);
  ctx.quadraticCurveTo(-15, -8, -14, -1);
  ctx.quadraticCurveTo(-10, -2, -7, -3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -7);
  ctx.lineTo(13, -5);
  ctx.lineTo(7, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(7, -7);
  ctx.lineTo(8, -11);
  ctx.lineTo(10, -6.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,40,40,1)';
  ctx.fillRect(9.5, -5.6, 1, 0.8);
  // blood on the white
  ctx.fillStyle = 'rgba(160,30,26,0.75)';
  ctx.beginPath();
  ctx.ellipse(-6, -2, 2.6, 1.2, 0.3, 0, Math.PI * 2);
  ctx.ellipse(-9, 0.5, 1.4, 0.7, 0, 0, Math.PI * 2);
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
    case 'sword': {
      // a sword laid on the ground, in its scabbard
      ctx.strokeStyle = 'rgba(70,58,46,1)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-12, -1.5);
      ctx.lineTo(8, -2.5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,160,90,1)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(8.5, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(110,40,32,1)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, -2.6);
      ctx.lineTo(14, -2.9);
      ctx.stroke();
      return;
    }
    case 'wisp': {
      // a will-o'-the-wisp: a cold green flame, adrift at the height of a man's waist
      const y = -16 + Math.sin(t * 1.7) * 3;
      const g = ctx.createRadialGradient(0, y, 0, 0, y, 10);
      g.addColorStop(0, 'rgba(210,255,225,0.95)');
      g.addColorStop(0.4, 'rgba(110,220,170,0.55)');
      g.addColorStop(1, 'rgba(60,160,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(180,255,215,0.9)';
      ctx.beginPath();
      ctx.moveTo(-3, y + 2);
      ctx.quadraticCurveTo(Math.sin(t * 5) * 1.5, y - 9 - Math.sin(t * 6) * 2, 3, y + 2);
      ctx.quadraticCurveTo(0, y + 4, -3, y + 2);
      ctx.fill();
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
