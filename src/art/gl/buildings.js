// Every building in the world, built in three dimensions from the same
// plans the flat map paints: stone platforms, timber-framed plaster walls,
// red pillars, curved tile roofs with upturned eaves, painted doors, lattice
// windows and name boards; the market's walls and gates; the bridges and
// piers. All of it is one still mesh with an ink outline.

import * as THREE from './three.js';
import { CELL, T, MARKET_WALL } from '../../world/geo.js';
import { world, idxOf, colOf, rowOf, hash2 } from '../../world/terrain.js';
import { STRUCTURES } from '../../world/places.js';
import { heights, heightAt, waterAt } from '../../world/height.js';
import { stream } from '../../core/rng.js';
import { Kit, K, roof } from './kit.js';
import { createDecals } from './decals.js';
import { GLSL_COMMON, GLSL_LIGHT } from './env.js';

const C = (r, g, b) => [r / 255, g / 255, b / 255];
const COL = {
  plaster: C(236, 230, 214),
  warm: C(218, 190, 140),
  wallCream: C(226, 214, 188),
  wood: C(98, 66, 44),
  red: C(156, 52, 40),
  tile: C(70, 76, 84),
  tile2: C(88, 84, 80),
  tileRed: C(150, 60, 46),
  straw: C(182, 154, 100),
  stone: C(164, 158, 146),
  stoneDark: C(128, 124, 116),
  gold: C(206, 166, 82),
  mud: C(198, 172, 130),
  canvas: C(156, 126, 90),
  ink: C(46, 42, 38),
  water: C(30, 34, 40),
};

const VERT = /* glsl */ `
attribute vec3 aCol;
attribute vec2 aUv;
attribute float aKind;
varying vec3 vCol;
varying vec3 vNor;
varying vec3 vPos;
varying vec2 vUv;
varying float vKind;
void main() {
  vCol = aCol;
  vNor = normal;
  vPos = position;
  vUv = aUv;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_LIGHT}
uniform float uSnow;
varying vec3 vCol;
varying vec3 vNor;
varying vec3 vPos;
varying vec2 vUv;
varying float vKind;
void main() {
  vec3 col = vCol;
  vec3 n = normalize(vNor);
  int k = int(vKind + 0.5);
  if (k == 1) {
    // plaster between timber posts, a beam along the top, a dark plinth
    float pu = min(fract(vUv.x), 1.0 - fract(vUv.x));
    float aa = fwidth(vUv.x) * 1.2;
    float post = 1.0 - smoothstep(0.045, 0.045 + aa, pu);
    float beam = smoothstep(0.86, 0.87, vUv.y) + (1.0 - smoothstep(0.07, 0.08, vUv.y));
    col = mix(col, vec3(0.36, 0.25, 0.17), clamp(max(post, beam), 0.0, 1.0));
    col *= 0.94 + 0.08 * vnoise(vPos.xz * 0.2 + vPos.y * 0.3);
  } else if (k == 2) {
    // rows of tiles running down the slope
    float g = abs(fract(vUv.x / 2.8) - 0.5);
    col *= 0.78 + 0.3 * smoothstep(0.06, 0.28, g);
    col *= 0.92 + 0.12 * vUv.y / 7.0;
  } else if (k == 3) {
    col *= 0.8 + 0.28 * vnoise(vec2(vUv.x * 0.9 + vPos.y * 0.2, vPos.y * 1.6));
  } else if (k == 4) {
    vec2 b = vec2(vPos.x / 7.0 + vPos.z / 7.0 + floor(vPos.y / 3.6) * 0.5, vPos.y / 3.6);
    vec2 f = abs(fract(b) - 0.5);
    float joint = smoothstep(0.43, 0.48, max(f.x, f.y));
    col *= 0.9 - joint * 0.16 + (hash12(floor(b)) - 0.5) * 0.12;
  } else if (k == 5) {
    col *= 0.88 + 0.14 * vnoise(vec2(vUv.x * 0.5, vUv.y * 1.5));
  } else if (k == 6) {
    col *= 0.92 + 0.1 * vnoise(vPos.xz * 0.4);
  }
  // snow settles on whatever faces the sky
  col = mix(col, vec3(0.95, 0.95, 0.97), uSnow * smoothstep(0.5, 0.85, n.y) * (k == 2 || k == 3 ? 0.92 : 0.7));
  col = paintLight(col, n);
  float seen = seenAt(vPos.xz);
  col = mix(mix(vec3(dot(col, vec3(0.3, 0.59, 0.11))), col, 0.3) * 0.95 + 0.04, col, seen);
  gl_FragColor = vec4(haze(col, vPos), 1.0);
}
`;

const HULL_VERT = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const HULL_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_LIGHT}
varying vec3 vPos;
void main() {
  float seen = seenAt(vPos.xz);
  vec3 ink = mix(vec3(0.55, 0.54, 0.52), vec3(0.14, 0.13, 0.12), seen);
  gl_FragColor = vec4(haze(ink, vPos), 1.0);
}
`;

const DECAL_VERT = /* glsl */ `
attribute vec2 aUv;
attribute float aGlow;
varying vec2 vUv;
varying float vGlow;
varying vec3 vPos;
void main() {
  vUv = aUv;
  vGlow = aGlow;
  vPos = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const DECAL_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_LIGHT}
uniform sampler2D uDecals;
varying vec2 vUv;
varying float vGlow;
varying vec3 vPos;
void main() {
  vec4 c = texture2D(uDecals, vUv);
  if (c.a < 0.5) discard;
  vec3 col = c.rgb * (uAmbient + uSunColor * 0.85);
  // lit windows and lanterns after dark
  col = mix(col, c.rgb * vec3(1.25, 0.95, 0.6) + vec3(0.35, 0.2, 0.05), vGlow * uDark);
  float seen = seenAt(vPos.xz);
  col = mix(mix(vec3(dot(col, vec3(0.3, 0.59, 0.11))), col, 0.3) * 0.95 + 0.04, col, seen);
  gl_FragColor = vec4(haze(col, vPos), 1.0);
}
`;

// ── the builders: one per kind of building, in its own frame (front = +z) ──

function platform(kit, w, d, h, col = COL.stone) {
  kit.box(0, 0, 0, w, h, d, col, K.STONE);
}

function walls(kit, y, w, d, h, col = COL.plaster, pillar = 18, z = 0) {
  kit.box(0, y, z, w, h, d, col, K.WALL, { pillar, top: false });
}

function posts(kit, xs, z, y, h, col = COL.red, r = 1.5) {
  for (const x of xs) kit.cylinder(x, y, z, r, h, col, K.WOOD, 8);
}

function spread(n, half) {
  return Array.from({ length: n }, (_, k) => -half + (2 * half * k) / (n - 1));
}

function steps(kit, w, h, depth, z) {
  const n = Math.max(2, Math.round(h / 2));
  for (let k = 0; k < n; k++) kit.box(0, 0, z + depth / 2 - ((k + 0.5) * depth) / n, w, ((k + 1) * h) / n, depth / n, COL.stone, K.STONE, { hull: k === 0 });
}

export const BUILD = {
  house(kit, dc, st, rnd) {
    const w = st.w - 4;
    const d = st.h - 4;
    platform(kit, w + 4, d + 4, 2);
    walls(kit, 2, w, d, 24);
    kit.decal(dc.door(11, 17), rnd() < 0.5 ? 0 : -w * 0.18, 2, d / 2 + 0.25, 11, 17);
    if (w > 54) kit.decal(dc.window(9, 8), w * 0.27, 11, d / 2 + 0.25, 9, 8, 1);
    roof(kit, { w, d, y: 26, rise: d * 0.42 + 5, over: 6, col: rnd() < 0.5 ? COL.tile : COL.tile2, gable: rnd() < 0.55, lift: 3 });
  },
  shop(kit, dc, st, rnd) {
    BUILD.house(kit, dc, st, rnd);
    const w = st.w - 4;
    const d = st.h - 4;
    const name = st.x > 3000 ? (st.y > 2600 ? '丹坊' : '百草堂') : '回春堂';
    kit.decal(dc.plaque(name, Math.min(30, w * 0.42), 7), 0, 19.5, d / 2 + 0.35, Math.min(30, w * 0.42), 7);
    kit.beam([w / 2 + 6, 0, d / 2 + 2], [w / 2 + 6, 44, d / 2 + 2], 1.6, COL.wood);
    kit.beam([w / 2 + 6, 42, d / 2 + 2], [w / 2 - 2, 42, d / 2 + 2], 1.2, COL.wood);
    kit.decal(dc.banner(st.y > 2600 && st.x > 3000 ? '丹' : '藥', 7, 18), w / 2 + 2, 23, d / 2 + 2.4, 7, 18);
  },
  mansion(kit, dc, st) {
    const W = st.w;
    const D = st.h;
    const gw = W * 0.4;
    const th = 4;
    // the courtyard wall, broken at the front by the gatehouse
    const seg = (x0, x1, z0, z1) => {
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      kit.box(cx, 0, cz, Math.abs(x1 - x0) || th, 16, Math.abs(z1 - z0) || th, COL.wallCream, K.WALL, { pillar: 0, top: false });
      kit.box(cx, 16, cz, (Math.abs(x1 - x0) || th) + 3, 2.6, (Math.abs(z1 - z0) || th) + 3, COL.tile, K.TILE);
    };
    seg(-W / 2, -gw / 2, D / 2 - th / 2, D / 2 - th / 2);
    seg(gw / 2, W / 2, D / 2 - th / 2, D / 2 - th / 2);
    seg(-W / 2, W / 2, -D / 2 + th / 2, -D / 2 + th / 2);
    seg(-W / 2 + th / 2, -W / 2 + th / 2, -D / 2, D / 2);
    seg(W / 2 - th / 2, W / 2 - th / 2, -D / 2, D / 2);
    // the main hall behind
    const hw = W * 0.64;
    const hd = D * 0.36;
    const hz = -D * 0.2;
    kit.box(0, 0, hz, hw + 8, 4, hd + 12, COL.stone, K.STONE);
    walls(kit, 4, hw, hd, 26, COL.plaster, 16, hz);
    posts(kit, spread(6, hw / 2 - 2), hz + hd / 2 + 4, 4, 26);
    kit.decal(dc.door(14, 20, [150, 48, 36]), 0, 4, hz + hd / 2 + 0.25, 14, 20);
    for (const s of [-1, 1]) kit.decal(dc.window(10, 10), s * hw * 0.3, 12, hz + hd / 2 + 0.25, 10, 10, 1);
    roofAt(kit, 0, hz, { w: hw, d: hd + 8, y: 30, rise: hd * 0.5 + 10, over: 6, col: COL.tile, lift: 6, ornament: COL.gold });
    // the gatehouse in front
    const gd = 16;
    const gz = D / 2 - gd / 2 - 2;
    kit.box(0, 0, gz, gw + 6, 4, gd + 6, COL.stone, K.STONE);
    walls(kit, 4, gw, gd, 24, COL.plaster, 12, gz);
    posts(kit, [-gw / 2 + 2, -9, 9, gw / 2 - 2], gz + gd / 2 + 1.5, 4, 24);
    kit.decal(dc.door(15, 19, [150, 48, 36]), 0, 4, gz + gd / 2 + 0.3, 15, 19);
    kit.decal(dc.plaque(st.x < 2300 ? '林府' : '沈府', 16, 6), 0, 23.6, gz + gd / 2 + 0.4, 16, 6);
    for (const s of [-1, 1]) kit.decal(dc.lantern(), s * 12, 16, gz + gd / 2 + 2.2, 4, 6, 1);
    roofAt(kit, 0, gz, { w: gw, d: gd, y: 28, rise: 13, over: 6, col: COL.tile, lift: 5, ornament: COL.gold });
  },
  teahouse(kit, dc, st) {
    const w = st.w - 4;
    const d = st.h - 4;
    platform(kit, w + 4, d + 4, 2);
    walls(kit, 2, w, d, 22, COL.plaster, 14);
    posts(kit, spread(5, w / 2 - 1), d / 2 + 1.5, 2, 22);
    kit.decal(dc.door(13, 17), 0, 2, d / 2 + 0.25, 13, 17);
    for (const s of [-1, 1]) kit.decal(dc.window(11, 9), s * w * 0.3, 10, d / 2 + 0.25, 11, 9, 1);
    roofAt(kit, 0, 0, { w: w + 2, d: d + 2, y: 24, rise: 7, over: 7, col: COL.tile, lift: 4 });
    const uw = w * 0.76;
    const ud = d * 0.7;
    walls(kit, 29, uw, ud, 18, COL.plaster, 12);
    for (const x of spread(3, uw * 0.3)) kit.decal(dc.window(9, 8), x, 34, ud / 2 + 0.25, 9, 8, 1);
    const name = st.x > 3000 ? (st.x < 3800 ? '酒肆' : '茶樓') : '茶館';
    kit.decal(dc.plaque(name, 18, 6), 0, 26, d / 2 + 4.5, 18, 6);
    for (const s of [-1, 1]) kit.decal(dc.lantern(), s * (w / 2 - 3), 15, d / 2 + 6, 4, 6, 1);
    roofAt(kit, 0, 0, { w: uw, d: ud, y: 47, rise: ud * 0.5 + 6, over: 7, col: COL.tile, lift: 6, ornament: COL.gold });
  },
  auction(kit, dc, st) {
    platform(kit, st.w, st.h, 6);
    let y = 6;
    let w = st.w - 8;
    let d = st.h - 10;
    for (let k = 0; k < 3; k++) {
      const h = k ? 17 : 24;
      walls(kit, y, w, d, h, COL.plaster, 14);
      posts(kit, spread(6, w / 2 - 1), d / 2 + 1.4, y, h);
      if (!k) {
        kit.decal(dc.door(16, 20, [150, 46, 36]), 0, y, d / 2 + 0.25, 16, 20);
        kit.decal(dc.plaque('聚寶閣', 26, 7), 0, y + h - 3, d / 2 + 2, 26, 7);
        for (const s of [-1, 1]) kit.decal(dc.lantern(), s * (w / 2 - 4), y + 12, d / 2 + 3, 4, 6, 1);
      } else for (const x of spread(4, w * 0.36)) kit.decal(dc.window(8, 8), x, y + 5, d / 2 + 0.25, 8, 8, 1);
      const last = k === 2;
      roofAt(kit, 0, 0, { w, d, y: y + h, rise: last ? d * 0.55 + 8 : 7, over: last ? 7 : 6, col: COL.tile, lift: last ? 7 : 4, ornament: last ? COL.gold : null });
      y += h + 6;
      w *= 0.82;
      d *= 0.82;
    }
  },
  farmhouse(kit, dc, st) {
    const w = st.w - 6;
    const d = st.h - 6;
    walls(kit, 0, w, d, 18, COL.mud, 0);
    kit.decal(dc.door(9, 14), -w * 0.18, 0, d / 2 + 0.25, 9, 14);
    kit.decal(dc.window(8, 6), w * 0.2, 7, d / 2 + 0.25, 8, 6, 1);
    roofAt(kit, 0, 0, { w: w + 2, d, y: 18, rise: d * 0.62, over: 7, col: COL.straw, kind: K.STRAW, gable: true, lift: 1 });
    // a little fence
    for (let x = -w / 2 - 22; x <= -w / 2 - 4; x += 6) kit.beam([x, 0, d / 2 + 8], [x, 9, d / 2 + 8], 1.1, COL.wood);
    kit.beam([-w / 2 - 23, 6, d / 2 + 8], [-w / 2 - 3, 6, d / 2 + 8], 0.9, COL.wood);
  },
  hut(kit, dc, st) {
    BUILD.farmhouse(kit, dc, st);
  },
  shrine_small(kit, dc, st) {
    platform(kit, st.w - 8, st.h - 6, 3);
    walls(kit, 3, st.w - 18, st.h - 14, 13, COL.wallCream, 0);
    kit.decal(dc.door(7, 10, [70, 46, 34]), 0, 3, (st.h - 14) / 2 + 0.25, 7, 10);
    roofAt(kit, 0, 0, { w: st.w - 16, d: st.h - 12, y: 16, rise: 9, over: 5, col: COL.tileRed, lift: 4 });
    kit.cylinder(0, 0, st.h / 2 + 3, 2.6, 5, COL.ink, K.PLAIN, 8);
  },
  shrine(kit, dc, st) {
    const w = st.w - 12;
    const d = st.h - 10;
    platform(kit, st.w - 4, st.h - 2, 4);
    walls(kit, 4, w, d, 20, C(206, 192, 168), 0);
    posts(kit, spread(3, w / 2 - 1), d / 2 + 1.4, 4, 20, C(150, 72, 58));
    kit.decal(dc.door(12, 15, [70, 46, 34]), 0, 4, d / 2 + 0.25, 12, 15);
    kit.decal(dc.plaque('狐仙廟', 18, 6), 0, 19, d / 2 + 2, 18, 6);
    roofAt(kit, 0, 0, { w: w + 4, d: d + 2, y: 24, rise: d * 0.5 + 6, over: 6, col: COL.tileRed, lift: 7 });
  },
  hall(kit, dc, st) {
    const w = st.w - 12;
    const d = st.h - 16;
    platform(kit, st.w, st.h - 4, 6);
    steps(kit, 20, 6, 8, st.h / 2 + 2);
    walls(kit, 6, w, d, 30, COL.warm, 18);
    posts(kit, spread(6, w / 2 - 1), d / 2 + 4, 6, 30);
    kit.decal(dc.door(16, 22, [140, 46, 34]), 0, 6, d / 2 + 0.25, 16, 22);
    for (const s of [-1, 1]) kit.decal(dc.window(11, 11), s * w * 0.3, 15, d / 2 + 0.25, 11, 11, 1);
    kit.decal(dc.plaque('清虛觀', 22, 7), 0, 29, d / 2 + 4.5, 22, 7);
    roofAt(kit, 0, 0, { w: w + 2, d: d + 8, y: 36, rise: d * 0.55 + 12, over: 8, col: COL.tile, lift: 8, ornament: COL.gold });
  },
  bighall(kit, dc, st) {
    const w = st.w - 10;
    const d = st.h - 14;
    platform(kit, st.w + 8, st.h, 10);
    steps(kit, 30, 10, 14, st.h / 2 + 5);
    walls(kit, 10, w, d, 30, C(224, 198, 152), 16);
    posts(kit, spread(8, w / 2 - 1), d / 2 + 4, 10, 30);
    kit.decal(dc.door(20, 24, [150, 42, 32]), 0, 10, d / 2 + 0.25, 20, 24);
    for (const x of [-w * 0.3, -w * 0.16, w * 0.16, w * 0.3]) kit.decal(dc.window(10, 12), x, 18, d / 2 + 0.25, 10, 12, 1);
    roofAt(kit, 0, 0, { w: w + 4, d: d + 8, y: 40, rise: 9, over: 9, col: COL.tile, lift: 6 });
    const uw = w * 0.72;
    const ud = d * 0.66;
    walls(kit, 47, uw, ud, 18, C(224, 198, 152), 14);
    posts(kit, spread(6, uw / 2 - 1), ud / 2 + 1.4, 47, 18);
    kit.decal(dc.plaque('青雲殿', 26, 8), 0, 53, ud / 2 + 2, 26, 8);
    roofAt(kit, 0, 0, { w: uw, d: ud, y: 65, rise: ud * 0.6 + 12, over: 9, col: COL.tile, lift: 10, ornament: COL.gold });
  },
  pagoda(kit, dc, st) {
    platform(kit, st.w + 10, st.w + 10, 5);
    let y = 5;
    let r = st.w * 0.4;
    for (let k = 0; k < 7; k++) {
      const h = k ? 14 : 20;
      kit.cylinder(0, y, 0, r, h, C(232, 224, 206), K.PLAIN, 8);
      if (!k) kit.decal(dc.door(7, 12, [120, 44, 34]), 0, y, r * 0.93 + 0.3, 7, 12);
      else kit.decal(dc.window(4, 5), 0, y + 4, r * 0.93 + 0.3, 4, 5, 1);
      const top = k === 6;
      roofAt(kit, 0, 0, { w: r * 2, d: r * 2, y: y + h, rise: top ? 18 : 3.5, over: r * 0.18 + 3, col: C(112, 122, 120), lift: 4, sides: 8, finial: top, ornament: COL.gold });
      y += h + 3.5;
      r *= 0.88;
    }
  },
  tower(kit, dc, st) {
    kit.box(0, 0, 0, st.w + 6, 26, st.h + 6, COL.stoneDark, K.STONE);
    walls(kit, 26, st.w - 4, st.h - 4, 14, COL.plaster, 0);
    kit.decal(dc.window(8, 7), 0, 30, (st.h - 4) / 2 + 0.25, 8, 7, 1);
    roofAt(kit, 0, 0, { w: st.w - 4, d: st.h - 4, y: 40, rise: 12, over: 6, col: COL.tile, lift: 5 });
  },
  well(kit) {
    kit.cylinder(0, 0, 0, 11, 6, COL.stone, K.STONE, 12);
    kit.cylinder(0, 5.4, 0, 8.6, 0.8, COL.water, K.PLAIN, 12, false);
    for (const s of [-1, 1]) kit.beam([s * 11, 4, 0], [s * 10, 26, 0], 1.5, COL.wood);
    kit.beam([-13, 25, 0], [13, 25, 0], 1.6, COL.wood);
    kit.box(2, 12, 0, 4, 4, 4, COL.wood, K.WOOD);
  },
  tent(kit, dc, st) {
    const w = st.w * 0.84;
    const d = st.h;
    const hgt = 26;
    const a = [-w / 2, 0, d / 2];
    const b = [w / 2, 0, d / 2];
    const c = [w / 2, 0, -d / 2];
    const e = [-w / 2, 0, -d / 2];
    const ta = [0, hgt, d / 2 + 2];
    const tb = [0, hgt, -d / 2 - 2];
    kit.quad(b, c, tb, ta, COL.canvas, K.CLOTH);
    kit.quad(e, a, ta, tb, COL.canvas, K.CLOTH);
    kit.tri(a, b, ta, C(140, 112, 80), K.CLOTH);
    kit.tri(c, e, tb, C(140, 112, 80), K.CLOTH);
    kit.tri([-6, 0, d / 2 + 0.3], [6, 0, d / 2 + 0.3], [0, 17, d / 2 + 1.4], COL.ink, K.PLAIN);
    kit.hullQuad([b[0] + 1, -0.5, b[2] + 1], [c[0] + 1, -0.5, c[2] - 1], [tb[0], tb[1] + 1, tb[2] - 1], [ta[0], ta[1] + 1, ta[2] + 1]);
    kit.hullQuad([e[0] - 1, -0.5, e[2] - 1], [a[0] - 1, -0.5, a[2] + 1], [ta[0], ta[1] + 1, ta[2] + 1], [tb[0], tb[1] + 1, tb[2] - 1]);
    // drying rack with a pelt, and the fire ring
    const rx = w / 2 + 14;
    for (const s of [-8, 8]) kit.beam([rx + s, 0, 4], [rx + s, 24, 4], 1.2, COL.wood);
    kit.beam([rx - 10, 23, 4], [rx + 10, 23, 4], 1.1, COL.wood);
    kit.box(rx, 9, 4, 14, 13, 1.4, C(140, 110, 80), K.CLOTH);
    for (let k = 0; k < 7; k++) {
      const an = (k / 7) * Math.PI * 2;
      kit.box(-w / 2 - 14 + Math.cos(an) * 6, 0, d / 2 + 4 + Math.sin(an) * 6, 2.6, 2, 2.6, COL.stone, K.STONE, { hull: false });
    }
  },
  stall(kit, dc, st, rnd) {
    const w = st.w;
    const d = st.h;
    kit.box(0, 0, 4, w, 9, d * 0.5, COL.wood, K.WOOD);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.beam([sx * (w / 2 - 1), 0, sz * (d / 2 - 1)], [sx * (w / 2 - 1), 26, sz * (d / 2 - 1)], 1.1, COL.wood);
    const cloth = [C(70, 100, 130), C(160, 70, 56), C(190, 170, 120)][Math.floor(rnd() * 3)];
    kit.quad([-w / 2 - 3, 25, d / 2 + 4], [w / 2 + 3, 25, d / 2 + 4], [w / 2 + 2, 30, -d / 2 - 1], [-w / 2 - 2, 30, -d / 2 - 1], cloth, K.CLOTH);
    kit.hullQuad([-w / 2 - 4, 24.6, d / 2 + 5], [w / 2 + 4, 24.6, d / 2 + 5], [w / 2 + 3, 30.4, -d / 2 - 2], [-w / 2 - 3, 30.4, -d / 2 - 2]);
    for (let k = 0; k < 5; k++) {
      const c = [C(170, 80, 60), C(200, 180, 120), C(90, 120, 90)][k % 3];
      kit.box(-w / 2 + 5 + rnd() * (w - 10), 9, 4 + (rnd() - 0.5) * d * 0.3, 3, 2.4, 3, c, K.PLAIN, { hull: false });
    }
  },
  paifang(kit, dc, st) {
    const span = Math.max(st.w, st.h);
    const xs = [-span / 2, -span * 0.18, span * 0.18, span / 2];
    for (const x of xs) {
      kit.box(x, 0, 0, 7, 5, 7, COL.stone, K.STONE);
      kit.cylinder(x, 0, 0, 2.2, 46, COL.red, K.WOOD, 8);
    }
    kit.box(0, 34, 0, span + 8, 3.2, 3.4, COL.red, K.WOOD);
    kit.box(0, 44, 0, span * 0.42, 3.2, 3.4, COL.red, K.WOOD);
    const name = st.name || '青雲';
    kit.decal(dc.plaque(name, 20, 7), 0, 36.5, 2, 20, 7);
    kit.decal(dc.plaque(name, 20, 7), 0, 36.5, -2, 20, 7, 0, true);
    for (const s of [-1, 1]) roofAt(kit, s * span * 0.34, 0, { w: span * 0.3, d: 6, y: 38, rise: 6, over: 4, col: COL.tile, lift: 3 });
    roofAt(kit, 0, 0, { w: span * 0.44, d: 8, y: 48, rise: 9, over: 5, col: COL.tile, lift: 4, ornament: COL.gold });
  },
  stonegate(kit, dc, st, rnd) {
    for (const s of [-1, 1]) {
      const x = s * st.w * 0.32;
      const hgt = s < 0 ? 72 : 48;
      kit.box(x, 0, 0, 18, hgt, 14, COL.stoneDark, K.STONE);
      kit.box(x, hgt, 0, 20, 4, 16, COL.stoneDark, K.STONE);
    }
    kit.beam([st.w * 0.32 - 4, 50, 0], [st.w * 0.05, 2, 12], 11, COL.stoneDark, K.STONE);
    for (let k = 0; k < 6; k++) kit.box((rnd() - 0.5) * st.w, 0, (rnd() - 0.3) * 30, 6 + rnd() * 8, 3 + rnd() * 4, 6 + rnd() * 6, COL.stone, K.STONE);
  },
  stele(kit, dc, st) {
    // a name stone on a low plinth, the name cut down its face
    kit.box(0, 0, 0, 22, 5, 12, COL.stone, K.STONE);
    kit.box(0, 5, 0, 15, 34, 5, C(140, 136, 128), K.STONE);
    kit.box(0, 39, 0, 17, 3, 6, COL.stoneDark, K.STONE);
    kit.decal(dc.stele(st.name || '', 10, 28), 0, 8.5, 2.65, 10, 28);
  },
  torii(kit, dc, st) {
    const red = C(166, 62, 46);
    for (const s of [-1, 1]) kit.cylinder(s * st.w * 0.36, 0, 0, 1.8, 36, red, K.WOOD, 8);
    kit.box(0, 34, 0, st.w + 12, 3, 3.4, red, K.WOOD);
    for (const s of [-1, 1]) kit.beam([s * (st.w / 2 + 5), 35.5, 0], [s * (st.w / 2 + 9), 38, 0], 2.6, red);
    kit.box(0, 27, 0, st.w, 2, 2.4, red, K.WOOD);
  },
  boat(kit) {
    kit.box(0, -3, 0, 46, 4, 12, COL.wood, K.WOOD);
    for (const s of [-1, 1]) kit.beam([s * 23, -1, 0], [s * 31, 3, 0], 7, COL.wood);
    kit.quad([-8, 1, 6], [8, 1, 6], [8, 10, 0], [-8, 10, 0], C(60, 50, 40), K.CLOTH);
    kit.quad([8, 1, -6], [-8, 1, -6], [-8, 10, 0], [8, 10, 0], C(60, 50, 40), K.CLOTH);
    kit.beam([-18, 1, 0], [-26, 28, 2], 0.9, COL.wood);
    kit.cylinder(16, 1, 0, 2.4, 8, C(50, 46, 42), K.PLAIN, 6);
    roofAt(kit, 16, 0, { w: 7, d: 7, y: 9, rise: 4, over: 1, col: COL.straw, kind: K.STRAW, sides: 6, lift: 0, finial: false });
  },
  pavilion(kit, dc, st) {
    platform(kit, st.w - 6, st.h - 4, 4);
    const r = Math.min(st.w, st.h) * 0.42;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      kit.cylinder(Math.cos(a) * r, 4, Math.sin(a) * r, 1.8, 26, COL.red, K.WOOD, 8);
      const b = ((k + 1) / 6) * Math.PI * 2 + Math.PI / 6;
      if (k !== 1) kit.beam([Math.cos(a) * r, 11, Math.sin(a) * r], [Math.cos(b) * r, 11, Math.sin(b) * r], 1.4, COL.wood);
    }
    roofAt(kit, 0, 0, { w: r * 2.2, d: r * 2.2, y: 30, rise: 24, over: 8, col: COL.tile, lift: 6, sides: 6, ornament: COL.gold });
  },
  teashed(kit, dc, st) {
    const w = st.w - 4;
    const d = st.h - 4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.beam([sx * (w / 2 - 2), 0, sz * (d / 2 - 2)], [sx * (w / 2 - 2), 22, sz * (d / 2 - 2)], 1.6, COL.wood);
    roofAt(kit, 0, 0, { w: w + 2, d, y: 22, rise: d * 0.5, over: 6, col: COL.straw, kind: K.STRAW, gable: true, lift: 1 });
    kit.box(0, 0, 2, 22, 8, 10, COL.wood, K.WOOD);
    for (const s of [-1, 1]) kit.box(0, 0, 2 + s * 10, 20, 4, 3, COL.wood, K.WOOD, { hull: false });
    kit.beam([w / 2 + 6, 0, d / 2], [w / 2 + 6, 40, d / 2], 1.4, COL.wood);
    kit.decal(dc.banner('茶', 7, 17, [150, 60, 46]), w / 2 + 2, 20, d / 2 + 0.6, 7, 17);
  },
};

/** A roof whose centre is offset (x, z) in the building's frame. */
function roofAt(kit, x, z, o) {
  const keep = [kit.ox, kit.oy, kit.oz, kit.rc, kit.rs];
  // move the frame to the roof's centre
  kit.ox += x * kit.rc + z * kit.rs;
  kit.oz += -x * kit.rs + z * kit.rc;
  const top = roof(kit, { ...o, ornament: o.finial === false ? null : o.ornament });
  [kit.ox, kit.oy, kit.oz, kit.rc, kit.rs] = keep;
  return top;
}

// ── the market's walls and gates ──

function marketWalls(kit, dc) {
  const g = world();
  const [x0, y0, x1, y1] = MARKET_WALL;
  const sides = [
    { fixed: rowOf(y0 + 1), along: 'x', from: colOf(x0 + 1), to: colOf(x1 - 1), outward: -1 },
    { fixed: rowOf(y1 - 1), along: 'x', from: colOf(x0 + 1), to: colOf(x1 - 1), outward: 1 },
    { fixed: colOf(x0 + 1), along: 'y', from: rowOf(y0 + 1), to: rowOf(y1 - 1), outward: -1 },
    { fixed: colOf(x1 - 1), along: 'y', from: rowOf(y0 + 1), to: rowOf(y1 - 1), outward: 1 },
  ];
  const H = 32;
  const TH = 20;
  for (const sd of sides) {
    const isWall = (n) => {
      const k = sd.along === 'x' ? idxOf(n, sd.fixed) : idxOf(sd.fixed, n);
      return g.terr[k] === T.WALL;
    };
    // runs of wall, and the gaps between them where roads pass
    const runs = [];
    let start = null;
    for (let n = sd.from; n <= sd.to + 1; n++) {
      const w = n <= sd.to && isWall(n);
      if (w && start === null) start = n;
      if (!w && start !== null) {
        runs.push([start, n - 1]);
        start = null;
      }
    }
    const fixedC = (sd.fixed + 0.5) * CELL;
    const place = (a, b) => {
      // centre and length of cells a..b along the side
      const c0 = a * CELL;
      const c1 = (b + 1) * CELL;
      return sd.along === 'x' ? { x: (c0 + c1) / 2, z: fixedC, len: c1 - c0, rot: 0 } : { x: fixedC, z: (c0 + c1) / 2, len: c1 - c0, rot: 90 };
    };
    for (const [a, b] of runs) {
      const p = place(a, b);
      const ground = Math.min(heightAt(p.x, p.z), ...[-0.45, 0.45].map((f) => (p.rot ? heightAt(p.x, p.z + f * p.len) : heightAt(p.x + f * p.len, p.z))));
      kit.at(p.x, ground - 2, p.z, p.rot);
      kit.box(0, 0, 0, p.len, H + 2, TH, COL.stoneDark, K.STONE);
      // battlements on the outer side
      const outer = sd.outward * (TH / 2 - 1.5);
      for (let x = -p.len / 2 + 5; x < p.len / 2 - 3; x += 11) kit.box(x, H + 2, outer, 6, 5, 3, COL.stoneDark, K.STONE, { hull: false });
      kit.box(0, H + 2, 0, p.len, 1, TH - 3, COL.stone, K.STONE, { hull: false });
    }
    // a gatehouse over each gap
    for (let r = 0; r < runs.length - 1; r++) {
      const a = runs[r][1] + 1;
      const b = runs[r + 1][0] - 1;
      const p = place(a, b);
      const ground = heightAt(p.x, p.z);
      kit.at(p.x, ground - 2, p.z, p.rot);
      for (const s of [-1, 1]) kit.box(s * (p.len / 2 + 8), 0, 0, 18, H + 8, TH + 8, COL.stoneDark, K.STONE);
      kit.box(0, H - 4, 0, p.len + 34, 12, TH + 8, COL.stoneDark, K.STONE);
      walls(kit, H + 8, p.len + 20, TH, 16, COL.plaster, 12);
      posts(kit, spread(4, (p.len + 20) / 2 - 1), TH / 2 + 1.2, H + 8, 16);
      if (!p.rot) kit.decal(dc.plaque('落霞坊', 22, 7), 0, H + 12, TH / 2 + 2.2, 22, 7);
      roofAt(kit, 0, 0, { w: p.len + 22, d: TH + 2, y: H + 24, rise: 14, over: 7, col: COL.tile, lift: 7, ornament: COL.gold });
    }
  }
}

// ── bridges and piers ──

function bridges(kit) {
  const stone = (kind) => kind === 'road' || kind === 'lane';
  for (const b of heights().bridges) {
    const pts = b.pts;
    if (pts.length < 2) continue;
    const half = (b.width * (stone(b.kind) ? 0.62 : 0.56));
    const deckCol = stone(b.kind) ? COL.stone : COL.wood;
    const kind = stone(b.kind) ? K.STONE : K.WOOD;
    kit.at(0, 0, 0, 0);
    const side = (k) => {
      const a = pts[Math.max(0, k - 1)];
      const c = pts[Math.min(pts.length - 1, k + 1)];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      return [-(c[1] - a[1]) / len, (c[0] - a[0]) / len];
    };
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay, az] = pts[k];
      const [bx, by, bz] = pts[k + 1];
      const [nax, nay] = side(k);
      const [nbx, nby] = side(k + 1);
      const L = (x, y, nx, ny, s, z) => [x + nx * s, z, y + ny * s];
      const t = stone(b.kind) ? 5 : 2.2;
      // deck top, and its two edges
      kit.quad(L(ax, ay, nax, nay, -half, az), L(bx, by, nbx, nby, -half, bz), L(bx, by, nbx, nby, half, bz), L(ax, ay, nax, nay, half, az), deckCol, kind, [[0, k * 20], [0, (k + 1) * 20], [half * 2, (k + 1) * 20], [half * 2, k * 20]]);
      for (const s of [-1, 1]) {
        kit.quad(L(ax, ay, nax, nay, s * half, az - t), L(bx, by, nbx, nby, s * half, bz - t), L(bx, by, nbx, nby, s * half, bz), L(ax, ay, nax, nay, s * half, az), deckCol, kind);
        kit.hullQuad(L(ax, ay, nax, nay, s * (half + 0.9), az - t - 0.5), L(bx, by, nbx, nby, s * (half + 0.9), bz - t - 0.5), L(bx, by, nbx, nby, s * (half + 0.9), bz + 0.9), L(ax, ay, nax, nay, s * (half + 0.9), az + 0.9));
      }
      // parapets (stone) or rails (wood)
      for (const s of [-1, 1]) {
        if (stone(b.kind)) {
          const h = 5;
          kit.quad(L(ax, ay, nax, nay, s * (half - 1.2), az), L(bx, by, nbx, nby, s * (half - 1.2), bz), L(bx, by, nbx, nby, s * (half - 1.2), bz + h), L(ax, ay, nax, nay, s * (half - 1.2), az + h), COL.stone, K.STONE);
          kit.quad(L(ax, ay, nax, nay, s * half, az + h), L(bx, by, nbx, nby, s * half, bz + h), L(bx, by, nbx, nby, s * (half - 2.4), bz + h), L(ax, ay, nax, nay, s * (half - 2.4), az + h), COL.stone, K.STONE);
        } else if (b.kind !== 'pier') {
          kit.beam(L(ax, ay, nax, nay, s * (half - 0.8), az + 7), L(bx, by, nbx, nby, s * (half - 0.8), bz + 7), 0.8, COL.wood);
        }
      }
    }
    // posts: rail posts on wooden bridges, legs under piers, piers under stone bridges
    for (let k = 0; k < pts.length; k++) {
      const [x, y, z] = pts[k];
      const [nx, ny] = side(k);
      const bed = heightAt(x, y);
      if (b.kind === 'pier' || (!stone(b.kind) && k % 1 === 0)) {
        for (const s of [-1, 1]) {
          const px = x + nx * s * (half - 0.8);
          const py = y + ny * s * (half - 0.8);
          kit.beam([px, Math.min(bed, z) - 2, py], [px, z + (b.kind === 'pier' ? 2 : 8), py], 1.3, COL.wood);
        }
      } else if (stone(b.kind) && k > 0 && k < pts.length - 1 && z - bed > 3) {
        kit.at(x, bed - 2, y, (Math.atan2(-ny, nx) * 180) / Math.PI);
        kit.box(0, 0, 0, half * 2 - 2, z - bed - 2, 6, COL.stoneDark, K.STONE);
        kit.at(0, 0, 0, 0);
      }
    }
  }
}

/** The stone stair up to 青雲宗: steps the whole way, posts along both sides. */
function stair(kit) {
  const road = world().roads.find((r) => r.pts[r.pts.length - 1][1] === 1330);
  if (!road) return;
  const path = road.path;
  let carried = 0;
  let n = 0;
  for (let k = 1; k < path.length; k++) {
    const [ax, ay] = path[k - 1];
    const [bx, by] = path[k];
    const len = Math.hypot(bx - ax, by - ay);
    const deg = (Math.atan2(-(bx - ax) / len, -(by - ay) / len) * 180) / Math.PI;
    for (let d = carried; d < len; d += 7) {
      const x = ax + ((bx - ax) * d) / len;
      const y = ay + ((by - ay) * d) / len;
      if (y > 1790) continue;
      const z = heightAt(x, y);
      kit.at(x, z - 5, y, deg);
      kit.box(0, 0, 0, 44, 5.6, 7.4, COL.stone, K.STONE, { hull: n % 3 === 0 });
      if (n % 4 === 0) for (const s of [-1, 1]) kit.box(s * 24, 4, 0, 4, 8, 4, COL.stoneDark, K.STONE);
      n++;
    }
    carried = ((carried - len) % 7 + 7) % 7;
  }
}

export function createBuildings(env) {
  const kit = new Kit();
  const dc = createDecals();
  STRUCTURES.forEach((st, i) => {
    // what stands on water stands at the water's surface: a boat floats, a pavilion is up on its deck
    let ground = heightAt(st.x, st.y);
    const wl = waterAt(st.x, st.y);
    if (wl !== null && ground < wl + 2) ground = wl + (st.sprite === 'boat' ? 0 : 4);
    if (st.paint === T.BRIDGE && wl !== null) {
      // a wooden deck on stilts, out over the water
      kit.at(st.x, 0, st.y, 0);
      kit.box(0, wl + 1, 0, st.w, 3, st.h, COL.wood, K.WOOD);
      for (const fx of [-0.45, 0, 0.45]) {
        for (const fz of [-0.42, 0.42]) {
          const x = fx * st.w;
          const z = fz * st.h;
          kit.beam([x, heightAt(st.x + x, st.y + z) - 2, z], [x, wl + 1.5, z], 2.4, COL.wood);
        }
      }
    }
    const make = BUILD[st.sprite];
    if (!make) return;
    kit.at(st.x, ground, st.y, st.rot || 0);
    make(kit, dc, st, stream(Math.floor(hash2(i, 7, 911) * 1e9)));
  });
  marketWalls(kit, dc);
  bridges(kit);
  stair(kit);
  const { main, hull, decals } = kit.build();

  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...env.u }, side: THREE.DoubleSide, extensions: { derivatives: true } });
  const hullMat = new THREE.ShaderMaterial({ vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, uniforms: { ...env.u }, side: THREE.BackSide });
  const decalMat = new THREE.ShaderMaterial({
    vertexShader: DECAL_VERT,
    fragmentShader: DECAL_FRAG,
    uniforms: { ...env.u, uDecals: { value: dc.tex } },
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const group = new THREE.Group();
  group.name = 'buildings';
  const meshes = [new THREE.Mesh(main, mat), new THREE.Mesh(hull, hullMat), new THREE.Mesh(decals, decalMat)];
  for (const m of meshes) {
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    group.add(m);
  }
  return {
    group,
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      mat.dispose();
      hullMat.dispose();
      decalMat.dispose();
      dc.dispose();
    },
  };
}
