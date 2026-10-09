// The painted details that go flat on walls: doors, lattice windows, the
// boards with a house's name over its gate, lanterns, shop banners. Painted
// once into one atlas; text waits for the brush font and is repainted when
// it arrives.

import * as THREE from './three.js';

const RES = 6; // atlas pixels per world unit
const SIZE = 1024;
const FONT = "'LXGW WenKai TC', 'Kaiti TC', 'STKaiti', 'BiauKai', serif";

const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const INK = [36, 33, 30];
const GOLD = [214, 176, 92];

export function createDecals() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  const regions = new Map();
  let cx = 0;
  let cy = 0;
  let row = 0;

  function paint(r) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(r.px, r.py, r.pw, r.ph);
    ctx.beginPath();
    ctx.rect(r.px, r.py, r.pw, r.ph);
    ctx.clip();
    ctx.setTransform(RES, 0, 0, RES, r.px, r.py);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    r.draw(ctx, r.w, r.h);
    ctx.restore();
  }

  function get(key, w, h, draw) {
    let r = regions.get(key);
    if (r) return r.rect;
    const pw = Math.ceil(w * RES);
    const ph = Math.ceil(h * RES);
    if (cx + pw > SIZE) {
      cx = 0;
      cy += row + 2;
      row = 0;
    }
    r = { px: cx, py: cy, pw, ph, w, h, draw };
    r.rect = [cx / SIZE, 1 - (cy + ph) / SIZE, (cx + pw) / SIZE, 1 - cy / SIZE];
    cx += pw + 2;
    row = Math.max(row, ph);
    regions.set(key, r);
    paint(r);
    tex.needsUpdate = true;
    return r.rect;
  }

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      for (const r of regions.values()) paint(r);
      tex.needsUpdate = true;
    });
  }

  return {
    tex,
    /** A door, two leaves; red doors get gold studs. */
    door(w, h, col = [96, 64, 42]) {
      const red = col[0] > 120;
      return get(`door:${w}:${h}:${col}`, w, h, (c) => {
        c.fillStyle = rgb([60, 42, 30]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = rgb(col);
        c.fillRect(0.6, 0.6, w / 2 - 0.9, h - 0.6);
        c.fillRect(w / 2 + 0.3, 0.6, w / 2 - 0.9, h - 0.6);
        c.strokeStyle = rgb(INK, 0.55);
        c.lineWidth = 0.25;
        for (const x0 of [1.2, w / 2 + 0.9]) {
          c.strokeRect(x0, 1.4, w / 2 - 2.1, h * 0.38);
          c.strokeRect(x0, h * 0.48, w / 2 - 2.1, h * 0.44);
        }
        if (red) {
          c.fillStyle = rgb(GOLD);
          for (let yy = 2.2; yy < h - 1; yy += 2.4) {
            for (let k = 0; k < 3; k++) {
              c.beginPath();
              c.arc(1.6 + k * ((w / 2 - 3) / 2), yy, 0.32, 0, Math.PI * 2);
              c.arc(w / 2 + 1.4 + k * ((w / 2 - 3) / 2), yy, 0.32, 0, Math.PI * 2);
              c.fill();
            }
          }
        }
        c.fillStyle = rgb(red ? GOLD : [40, 30, 22]);
        c.beginPath();
        c.arc(w / 2 - 1, h * 0.52, 0.45, 0, Math.PI * 2);
        c.arc(w / 2 + 1, h * 0.52, 0.45, 0, Math.PI * 2);
        c.fill();
      });
    },
    /** A lattice window over paper. */
    window(w, h) {
      return get(`win:${w}:${h}`, w, h, (c) => {
        c.fillStyle = rgb([236, 226, 196]);
        c.fillRect(0, 0, w, h);
        c.strokeStyle = rgb([90, 62, 42]);
        c.lineWidth = 0.35;
        const n = Math.max(3, Math.round(w / 1.6));
        for (let k = 1; k < n; k++) {
          c.beginPath();
          c.moveTo((k * w) / n, 0);
          c.lineTo((k * w) / n, h);
          c.stroke();
        }
        const m = Math.max(3, Math.round(h / 1.6));
        for (let k = 1; k < m; k++) {
          c.beginPath();
          c.moveTo(0, (k * h) / m);
          c.lineTo(w, (k * h) / m);
          c.stroke();
        }
        c.lineWidth = 0.9;
        c.strokeStyle = rgb([70, 48, 34]);
        c.strokeRect(0.45, 0.45, w - 0.9, h - 0.9);
      });
    },
    /** A name board: dark lacquer, gold rim and gold letters. */
    plaque(text, w, h, bg = [40, 36, 34], fg = GOLD) {
      return get(`plaque:${text}:${w}:${bg}`, w, h, (c) => {
        c.fillStyle = rgb(bg);
        c.fillRect(0, 0, w, h);
        c.strokeStyle = rgb(fg, 0.9);
        c.lineWidth = 0.5;
        c.strokeRect(0.6, 0.6, w - 1.2, h - 1.2);
        c.fillStyle = rgb(fg);
        c.font = `700 ${Math.min(h * 0.7, (w * 0.82) / text.length)}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(text, w / 2, h / 2 + 0.2);
      });
    },
    /** A red paper lantern. */
    lantern(w = 4, h = 6) {
      return get(`lantern:${w}:${h}`, w, h, (c) => {
        c.fillStyle = rgb([40, 30, 26]);
        c.fillRect(w * 0.3, 0, w * 0.4, h * 0.14);
        c.fillRect(w * 0.3, h * 0.76, w * 0.4, h * 0.1);
        c.fillStyle = rgb([196, 52, 38]);
        c.beginPath();
        c.ellipse(w / 2, h * 0.45, w * 0.48, h * 0.34, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = rgb([120, 30, 24], 0.8);
        c.lineWidth = 0.2;
        for (const k of [-0.25, 0, 0.25]) {
          c.beginPath();
          c.ellipse(w / 2, h * 0.45, Math.abs(k) * w * 1.6 + 0.01, h * 0.34, 0, 0, Math.PI * 2);
          c.stroke();
        }
        c.strokeStyle = rgb(GOLD);
        c.lineWidth = 0.3;
        c.beginPath();
        c.moveTo(w / 2, h * 0.86);
        c.lineTo(w / 2, h);
        c.stroke();
      });
    },
    /** A name cut into stone, top to bottom. */
    stele(text, w, h) {
      return get(`stele:${text}:${w}:${h}`, w, h, (c) => {
        c.fillStyle = 'rgba(0,0,0,0)';
        c.clearRect(0, 0, w, h);
        c.fillStyle = rgb([150, 146, 138]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = rgb([44, 40, 36], 0.9);
        const chars = [...text];
        const size = Math.min(w * 0.8, (h * 0.86) / Math.max(1, chars.length));
        c.font = `700 ${size}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        chars.forEach((ch, i) => c.fillText(ch, w / 2, h * 0.07 + size * (i + 0.5)));
      });
    },
    /** A cloth banner with one character, hung from a pole. */
    banner(ch, w, h, col = [70, 110, 140]) {
      return get(`banner:${ch}:${w}:${h}:${col}`, w, h, (c) => {
        c.fillStyle = rgb(col);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(w, 0);
        c.lineTo(w, h * 0.86);
        c.lineTo(w / 2, h);
        c.lineTo(0, h * 0.86);
        c.closePath();
        c.fill();
        c.strokeStyle = rgb([240, 230, 200], 0.8);
        c.lineWidth = 0.3;
        c.strokeRect(0.6, 0.6, w - 1.2, h * 0.8);
        c.fillStyle = rgb([248, 242, 226]);
        c.font = `700 ${w * 0.68}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(ch, w / 2, h * 0.42);
      });
    },
    dispose() {
      tex.dispose();
    },
  };
}
