// (0.24) An icon for each move, painted with the same ink as the world: the motif of the move in a few
// strokes (a sword's arc, a ball of fire, a shield, a bolt of lightning…), washed with the colour of its
// element (金木水火土). Painted once on a small canvas and kept as a picture the buttons wear behind
// their names.

const EL = { 金: [165, 131, 42], 木: [61, 122, 60], 水: [47, 95, 143], 火: [180, 69, 44], 土: [138, 101, 56] };
const INK = [36, 33, 30];
const STEEL = [176, 184, 190];
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** A soft round wash of colour. */
function wash(c, x, y, r, col, a = 0.5) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.6, rgba(col, a * 0.55));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A brush stroke along points, from w0 thick to w1 thin. */
function brush(c, pts, w0, w1, col, a = 0.9) {
  c.strokeStyle = rgba(col, a);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let k = 1; k < pts.length; k++) {
    c.lineWidth = w0 + ((w1 - w0) * k) / (pts.length - 1);
    c.beginPath();
    c.moveTo(...pts[k - 1]);
    c.lineTo(...pts[k]);
    c.stroke();
  }
}

/** Points along a quadratic curve. */
function curve(a, b, ctrl, n = 12) {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]]);
  }
  return out;
}

/** A sword from (x0, y0) (the hilt) to (x1, y1) (the point). */
function sword(c, x0, y0, x1, y1, w = 5, alpha = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const gx = x0 + ux * len * 0.24;
  const gy = y0 + uy * len * 0.24;
  c.globalAlpha = alpha;
  // the blade
  c.fillStyle = rgba(STEEL, 1);
  c.beginPath();
  c.moveTo(gx - uy * w * 0.5, gy + ux * w * 0.5);
  c.lineTo(x1, y1);
  c.lineTo(gx + uy * w * 0.5, gy - ux * w * 0.5);
  c.closePath();
  c.fill();
  c.strokeStyle = rgba(INK, 0.85);
  c.lineWidth = 1.6;
  c.stroke();
  // the ridge down its middle
  brush(c, [[gx, gy], [x1 - ux * 6, y1 - uy * 6]], 1, 0.5, INK, 0.45);
  // guard and hilt
  brush(c, [[gx - uy * w * 1.3, gy + ux * w * 1.3], [gx + uy * w * 1.3, gy - ux * w * 1.3]], 3.2, 3.2, INK, 0.9);
  brush(c, [[x0, y0], [gx, gy]], 3.4, 3, [96, 62, 40], 1);
  c.globalAlpha = 1;
}

/** A flame, its foot at (x, y), h tall. */
function flame(c, x, y, h, outer, inner) {
  c.fillStyle = rgba(outer, 0.92);
  c.beginPath();
  c.moveTo(x, y - h);
  c.quadraticCurveTo(x + h * 0.55, y - h * 0.45, x + h * 0.3, y);
  c.quadraticCurveTo(x, y + h * 0.12, x - h * 0.3, y);
  c.quadraticCurveTo(x - h * 0.55, y - h * 0.45, x, y - h);
  c.fill();
  c.fillStyle = rgba(inner, 0.95);
  c.beginPath();
  c.moveTo(x, y - h * 0.55);
  c.quadraticCurveTo(x + h * 0.22, y - h * 0.2, x + h * 0.12, y - 1);
  c.quadraticCurveTo(x, y + 1, x - h * 0.12, y - 1);
  c.quadraticCurveTo(x - h * 0.22, y - h * 0.2, x, y - h * 0.55);
  c.fill();
}

const PAINT = {
  // the plain strikes, by weapon
  'strike:slash'(c) {
    brush(c, curve([20, 70], [78, 18], [26, 22]), 7, 1.5, INK, 0.55);
    sword(c, 30, 80, 76, 30, 6);
  },
  'strike:punch'(c) {
    wash(c, 52, 50, 34, [120, 90, 70], 0.4);
    c.fillStyle = rgba([226, 196, 160], 1);
    c.strokeStyle = rgba(INK, 0.9);
    c.lineWidth = 2.4;
    c.beginPath();
    c.ellipse(46, 54, 17, 14, -0.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    for (let k = 0; k < 3; k++) brush(c, [[40 + k * 8, 42 - k * 1], [42 + k * 8, 52]], 1.6, 1.2, INK, 0.7);
    for (const [a, b] of [[[68, 30], [80, 22]], [[72, 46], [86, 44]], [[66, 64], [78, 72]]]) brush(c, [a, b], 3, 1, INK, 0.75);
  },
  'strike:arrow'(c) {
    brush(c, curve([28, 18], [28, 82], [62, 50]), 3.4, 3.4, [110, 76, 46], 1);
    brush(c, [[28, 18], [28, 82]], 1, 1, INK, 0.7);
    brush(c, [[18, 50], [86, 50]], 2.2, 2, INK, 0.9);
    c.fillStyle = rgba(INK, 0.95);
    c.beginPath();
    c.moveTo(90, 50);
    c.lineTo(80, 45);
    c.lineTo(80, 55);
    c.fill();
    brush(c, [[18, 50], [12, 44]], 2, 1, [150, 60, 46], 0.9);
    brush(c, [[18, 50], [12, 56]], 2, 1, [150, 60, 46], 0.9);
  },
  dash(c) {
    for (const [y, x0, x1] of [[34, 18, 66], [50, 10, 74], [66, 22, 62]]) brush(c, [[x0, y], [x1, y]], 1, 4.5, INK, 0.7);
    wash(c, 74, 52, 18, [150, 150, 150], 0.45);
    c.fillStyle = rgba(INK, 0.8);
    c.beginPath();
    c.ellipse(78, 66, 5, 2.4, -0.3, 0, Math.PI * 2);
    c.ellipse(70, 72, 5, 2.4, -0.3, 0, Math.PI * 2);
    c.fill();
  },
  qi(c) {
    wash(c, 62, 46, 30, [120, 160, 210], 0.6);
    c.fillStyle = 'rgba(240,246,252,0.95)';
    c.beginPath();
    c.arc(62, 46, 11, 0, Math.PI * 2);
    c.fill();
    brush(c, curve([18, 66], [52, 50], [30, 50]), 1.5, 5, [70, 110, 160], 0.75);
    brush(c, curve([22, 80], [54, 58], [40, 70]), 1, 3.5, [70, 110, 160], 0.55);
  },
  guard(c, col) {
    wash(c, 50, 50, 40, col || [90, 130, 180], 0.38);
    c.strokeStyle = rgba(col || [70, 110, 160], 0.95);
    c.lineWidth = 5;
    c.beginPath();
    c.arc(50, 50, 28, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = rgba(INK, 0.7);
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(50, 50, 31, 0, Math.PI * 2);
    c.stroke();
    // a figure inside, sheltered
    c.fillStyle = rgba(INK, 0.8);
    c.beginPath();
    c.arc(50, 40, 5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(43, 64);
    c.lineTo(46, 47);
    c.lineTo(54, 47);
    c.lineTo(57, 64);
    c.fill();
  },
  swordqi(c, col) {
    wash(c, 54, 46, 34, col, 0.42);
    brush(c, curve([16, 74], [84, 22], [30, 18]), 9, 1.2, col, 0.95);
    brush(c, curve([24, 80], [88, 34], [44, 30]), 3, 0.8, INK, 0.5);
  },
  swordstep(c, col) {
    wash(c, 56, 50, 30, col, 0.35);
    sword(c, 14, 70, 50, 34, 5, 0.25);
    sword(c, 26, 76, 64, 38, 5, 0.5);
    sword(c, 40, 82, 82, 40, 6, 1);
  },
  feijian(c, col) {
    wash(c, 62, 42, 26, col, 0.4);
    for (const [y, x0] of [[56, 10], [64, 18], [48, 16]]) brush(c, [[x0, y], [x0 + 30, y - 12]], 0.8, 3, col, 0.65);
    sword(c, 34, 66, 88, 24, 6);
  },
  jianzhen(c, col) {
    wash(c, 50, 50, 38, col, 0.35);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      sword(c, 50 + Math.cos(a) * 12, 50 + Math.sin(a) * 12, 50 + Math.cos(a) * 38, 50 + Math.sin(a) * 38, 4.5);
    }
    c.fillStyle = rgba(col, 0.95);
    c.beginPath();
    c.arc(50, 50, 5, 0, Math.PI * 2);
    c.fill();
  },
  fireball(c) {
    wash(c, 56, 46, 36, [220, 110, 50], 0.5);
    brush(c, curve([12, 82], [40, 60], [20, 64]), 1, 5, [190, 80, 40], 0.6);
    c.fillStyle = rgba([226, 92, 44], 0.95);
    c.beginPath();
    c.arc(56, 46, 18, 0, Math.PI * 2);
    c.fill();
    flame(c, 56, 40, 34, [214, 70, 36], [248, 196, 90]);
    c.fillStyle = 'rgba(252,236,180,0.95)';
    c.beginPath();
    c.arc(56, 44, 6, 0, Math.PI * 2);
    c.fill();
  },
  foxfire(c) {
    wash(c, 50, 54, 36, [90, 160, 170], 0.35);
    flame(c, 30, 70, 26, [70, 150, 170], [214, 240, 236]);
    flame(c, 52, 54, 32, [70, 150, 170], [214, 240, 236]);
    flame(c, 74, 72, 24, [70, 150, 170], [214, 240, 236]);
  },
  mend(c, col) {
    wash(c, 50, 54, 36, col, 0.4);
    brush(c, curve([50, 86], [52, 34], [46, 60]), 3.4, 1.6, [70, 100, 60], 0.95);
    for (const [s, y] of [[-1, 52], [1, 40]]) {
      c.fillStyle = rgba(col, 0.95);
      c.beginPath();
      c.moveTo(51, y);
      c.quadraticCurveTo(51 + s * 14, y - 18, 51 + s * 28, y - 10);
      c.quadraticCurveTo(51 + s * 16, y + 4, 51, y);
      c.fill();
      brush(c, [[51, y], [51 + s * 22, y - 9]], 1, 0.6, INK, 0.5);
    }
    c.fillStyle = 'rgba(250,250,236,0.9)';
    for (const [x, y] of [[30, 30], [72, 64], [64, 22]]) {
      c.beginPath();
      c.arc(x, y, 2.2, 0, Math.PI * 2);
      c.fill();
    }
  },
  vine(c, col) {
    wash(c, 50, 54, 36, col, 0.35);
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const a = t * Math.PI * 3.2;
      const r = 6 + t * 28;
      pts.push([50 + Math.cos(a) * r, 54 + Math.sin(a) * r * 0.8]);
    }
    brush(c, pts, 1.4, 4.6, [70, 100, 52], 0.95);
    for (const [x, y, a] of [[70, 40, 0.6], [30, 62, 2.6], [56, 78, -1.2]]) {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.fillStyle = rgba(col, 0.95);
      c.beginPath();
      c.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  },
  frost(c, col) {
    wash(c, 54, 46, 34, [150, 196, 226], 0.5);
    c.fillStyle = 'rgba(226,240,250,0.95)';
    c.strokeStyle = rgba(col, 0.95);
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(86, 16);
    c.lineTo(46, 46);
    c.lineTo(24, 80);
    c.lineTo(56, 52);
    c.closePath();
    c.fill();
    c.stroke();
    brush(c, [[84, 18], [34, 66]], 1, 1, col, 0.6);
    for (const [x, y] of [[22, 40], [70, 70], [80, 50]]) {
      brush(c, [[x - 5, y], [x + 5, y]], 1.4, 1.4, col, 0.7);
      brush(c, [[x, y - 5], [x, y + 5]], 1.4, 1.4, col, 0.7);
    }
  },
  thunder(c) {
    wash(c, 52, 46, 36, [150, 120, 200], 0.42);
    wash(c, 50, 22, 26, [110, 110, 120], 0.55);
    c.fillStyle = 'rgba(250,246,226,0.98)';
    c.strokeStyle = 'rgba(120,90,170,0.95)';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(56, 18);
    c.lineTo(36, 54);
    c.lineTo(50, 54);
    c.lineTo(40, 88);
    c.lineTo(70, 44);
    c.lineTo(55, 44);
    c.lineTo(66, 18);
    c.closePath();
    c.fill();
    c.stroke();
  },
  dici(c, col) {
    wash(c, 50, 62, 38, col, 0.38);
    brush(c, [[10, 78], [90, 78]], 2.6, 2.6, INK, 0.75);
    for (const [x, h, w] of [[30, 34, 9], [52, 50, 12], [72, 30, 8]]) {
      c.fillStyle = rgba([150, 120, 82], 1);
      c.strokeStyle = rgba(INK, 0.9);
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(x - w, 78);
      c.lineTo(x + 2, 78 - h);
      c.lineTo(x + w, 78);
      c.closePath();
      c.fill();
      c.stroke();
    }
    for (const [x, y] of [[18, 70], [84, 68], [40, 72], [62, 70]]) {
      c.fillStyle = rgba(INK, 0.6);
      c.beginPath();
      c.arc(x, y, 1.8, 0, Math.PI * 2);
      c.fill();
    }
  },
  sunwheel(c) {
    wash(c, 50, 50, 42, [232, 160, 60], 0.5);
    c.strokeStyle = rgba([210, 120, 40], 0.95);
    c.lineCap = 'round';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      c.lineWidth = k % 2 ? 2 : 3.4;
      c.beginPath();
      c.moveTo(50 + Math.cos(a) * 22, 50 + Math.sin(a) * 22);
      c.lineTo(50 + Math.cos(a) * (k % 2 ? 32 : 38), 50 + Math.sin(a) * (k % 2 ? 32 : 38));
      c.stroke();
    }
    c.fillStyle = rgba([240, 176, 60], 1);
    c.strokeStyle = rgba([180, 90, 30], 0.95);
    c.lineWidth = 2.2;
    c.beginPath();
    c.arc(50, 50, 17, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  },
  hanyu(c, col) {
    wash(c, 50, 50, 40, [160, 200, 228], 0.5);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const tx = 50 + Math.cos(a) * 34;
      const ty = 50 + Math.sin(a) * 34;
      brush(c, [[50, 50], [tx, ty]], 4, 2, col, 0.95);
      for (const f of [0.55, 0.78]) {
        const bx = 50 + Math.cos(a) * 34 * f;
        const by = 50 + Math.sin(a) * 34 * f;
        for (const s of [-1, 1]) brush(c, [[bx, by], [bx + Math.cos(a + s * 0.8) * 8, by + Math.sin(a + s * 0.8) * 8]], 2, 1.2, col, 0.9);
      }
    }
    c.fillStyle = 'rgba(240,248,252,0.95)';
    c.beginPath();
    c.arc(50, 50, 6, 0, Math.PI * 2);
    c.fill();
  },
  sweep(c, col) {
    wash(c, 50, 64, 36, col, 0.35);
    brush(c, curve([12, 60], [88, 62], [50, 94]), 2, 8, INK, 0.6);
    // the leg sweeping
    brush(c, [[48, 22], [50, 50]], 6, 5, INK, 0.85);
    c.fillStyle = rgba(INK, 0.85);
    c.beginPath();
    c.arc(48, 16, 6, 0, Math.PI * 2);
    c.fill();
    brush(c, [[50, 50], [36, 66], [16, 70]], 5, 4, INK, 0.85);
    brush(c, [[50, 50], [62, 72]], 5, 4, INK, 0.85);
    for (const [x, y] of [[74, 74], [82, 68], [68, 80]]) {
      c.fillStyle = rgba(col, 0.7);
      c.beginPath();
      c.arc(x, y, 3, 0, Math.PI * 2);
      c.fill();
    }
  },
  charge(c, col) {
    wash(c, 56, 50, 36, col, 0.38);
    for (const [y, x0] of [[36, 8], [50, 4], [64, 10]]) brush(c, [[x0, y], [x0 + 26, y]], 1, 3.4, INK, 0.6);
    c.fillStyle = rgba(INK, 0.88);
    c.beginPath();
    c.moveTo(38, 38);
    c.lineTo(64, 38);
    c.lineTo(64, 24);
    c.lineTo(92, 50);
    c.lineTo(64, 76);
    c.lineTo(64, 62);
    c.lineTo(38, 62);
    c.closePath();
    c.fill();
    wash(c, 30, 74, 14, [160, 130, 90], 0.6);
  },
  iron(c, col) {
    wash(c, 50, 50, 42, col, 0.45);
    c.strokeStyle = rgba(col, 0.9);
    c.lineWidth = 2;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26);
      c.lineTo(50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36);
      c.stroke();
    }
    c.fillStyle = rgba([236, 210, 130], 1);
    c.strokeStyle = rgba(INK, 0.9);
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(50, 22);
    c.lineTo(70, 50);
    c.lineTo(50, 78);
    c.lineTo(30, 50);
    c.closePath();
    c.fill();
    c.stroke();
    brush(c, [[50, 22], [50, 78]], 1.2, 1.2, INK, 0.5);
    brush(c, [[30, 50], [70, 50]], 1.2, 1.2, INK, 0.5);
  },
  mirror(c) {
    wash(c, 58, 44, 36, [240, 220, 150], 0.5);
    for (const [a, l] of [[-0.6, 30], [-0.2, 38], [0.2, 32]]) brush(c, [[60, 44], [60 + Math.cos(a) * l, 44 + Math.sin(a) * l]], 3, 1, [220, 180, 90], 0.75);
    c.fillStyle = rgba([150, 116, 60], 1);
    c.beginPath();
    c.arc(44, 50, 24, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = rgba([226, 222, 200], 1);
    c.beginPath();
    c.arc(44, 50, 18, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = rgba(INK, 0.85);
    c.lineWidth = 2;
    c.beginPath();
    c.arc(44, 50, 24, 0, Math.PI * 2);
    c.stroke();
    brush(c, [[36, 44], [42, 38]], 2.4, 1.2, [255, 255, 255], 0.9);
  },
  bell(c, col) {
    wash(c, 50, 54, 40, col, 0.42);
    c.fillStyle = rgba([214, 176, 92], 1);
    c.strokeStyle = rgba(INK, 0.9);
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(50, 16);
    c.quadraticCurveTo(28, 18, 28, 50);
    c.quadraticCurveTo(26, 70, 18, 76);
    c.lineTo(82, 76);
    c.quadraticCurveTo(74, 70, 72, 50);
    c.quadraticCurveTo(72, 18, 50, 16);
    c.fill();
    c.stroke();
    brush(c, [[30, 60], [70, 60]], 1.4, 1.4, INK, 0.55);
    c.fillStyle = rgba(INK, 0.85);
    c.beginPath();
    c.arc(50, 82, 4.5, 0, Math.PI * 2);
    c.fill();
  },
  setsw(c) {
    c.strokeStyle = rgba(INK, 0.8);
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(50, 50, 26, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();
    c.beginPath();
    c.arc(50, 50, 26, Math.PI * 0.1, Math.PI * 0.9);
    c.stroke();
    c.fillStyle = rgba(INK, 0.85);
    for (const [x, y, a] of [[71, 37, 0.5], [29, 63, Math.PI + 0.5]]) {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.beginPath();
      c.moveTo(6, 0);
      c.lineTo(-5, -6);
      c.lineTo(-5, 6);
      c.fill();
      c.restore();
    }
  },
  tal(c) {
    c.save();
    c.translate(50, 50);
    c.rotate(-0.18);
    c.fillStyle = rgba([232, 204, 120], 1);
    c.strokeStyle = rgba(INK, 0.6);
    c.lineWidth = 1.4;
    c.fillRect(-15, -36, 30, 72);
    c.strokeRect(-15, -36, 30, 72);
    c.restore();
    c.save();
    c.translate(50, 50);
    c.rotate(-0.18);
    brush(c, [[-6, -26], [6, -20], [-6, -12], [6, -4], [-4, 4], [4, 14], [0, 26]], 3, 1.6, [178, 46, 38], 0.95);
    c.restore();
  },
  pill(c) {
    wash(c, 50, 54, 36, [190, 120, 80], 0.38);
    c.fillStyle = rgba([150, 70, 46], 1);
    c.strokeStyle = rgba(INK, 0.85);
    c.lineWidth = 2;
    c.beginPath();
    c.arc(50, 54, 20, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,236,210,0.85)';
    c.beginPath();
    c.ellipse(43, 46, 6, 4, -0.6, 0, Math.PI * 2);
    c.fill();
    for (const [x, y] of [[26, 26], [76, 30], [72, 80]]) {
      c.fillStyle = 'rgba(232,200,120,0.85)';
      c.beginPath();
      c.arc(x, y, 2.2, 0, Math.PI * 2);
      c.fill();
    }
  },
};

const cache = new Map();

/** Whether there is an icon for this key (a move's id, 'strike:<fx>', 'dash', 'setsw', 'tal', 'pill'). */
export function hasIcon(key) {
  return !!PAINT[key];
}

/**
 * The icon for a key, as a picture URL (null where there is none, or no canvas). el: the move's element
 * (金木水火土), for its wash.
 */
export function iconUrl(key, el = '') {
  const k = `${key}|${el}`;
  if (cache.has(k)) return cache.get(k);
  const paint = PAINT[key];
  if (!paint || typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.scale(1.28, 1.28);
  paint(c, EL[el] || [120, 116, 108]);
  const url = cv.toDataURL('image/png');
  cache.set(k, url);
  return url;
}
