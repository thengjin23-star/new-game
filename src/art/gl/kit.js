// A small kit for building things out of boxes, roofs and cards: each
// piece is added to one big mesh (one draw for everything that stands still)
// and to an "ink hull" a hair larger, drawn inside-out in ink, which gives
// every edge its brush outline.

import * as THREE from './three.js';

export const OUTLINE = 0.9;

/** Surface kinds the building shader knows how to paint. */
export const K = { PLAIN: 0, WALL: 1, TILE: 2, STRAW: 3, STONE: 4, WOOD: 5, CLOTH: 6 };

export class Kit {
  constructor() {
    this.P = [];
    this.N = [];
    this.C = [];
    this.U = [];
    this.KD = [];
    this.HP = [];
    this.HN = [];
    this.DP = [];
    this.DU = [];
    this.DG = [];
    // a transform applied to everything added (rotate about y, then move)
    this.ox = 0;
    this.oy = 0;
    this.oz = 0;
    this.rc = 1;
    this.rs = 0;
  }

  /** Place what follows at (x, y, z), turned `deg` degrees about the vertical. */
  at(x, y, z, deg = 0) {
    this.ox = x;
    this.oy = y;
    this.oz = z;
    this.rc = Math.cos((deg * Math.PI) / 180);
    this.rs = Math.sin((deg * Math.PI) / 180);
    return this;
  }

  tp(p) {
    const [x, y, z] = p;
    return [this.ox + x * this.rc + z * this.rs, this.oy + y, this.oz - x * this.rs + z * this.rc];
  }

  tn(n) {
    const [x, y, z] = n;
    return [x * this.rc + z * this.rs, y, -x * this.rs + z * this.rc];
  }

  /** A flat triangle (local coordinates). uv: three [u, v] pairs. */
  tri(a, b, c, col, kind = K.PLAIN, uv = null) {
    const A = this.tp(a);
    const B = this.tp(b);
    const C = this.tp(c);
    const n = normal(A, B, C);
    for (const [p, k] of [[A, 0], [B, 1], [C, 2]]) {
      this.P.push(...p);
      this.N.push(...n);
      this.C.push(...col);
      this.U.push(...(uv ? uv[k] : [0, 0]));
      this.KD.push(kind);
    }
  }

  quad(a, b, c, d, col, kind = K.PLAIN, uv = null) {
    this.tri(a, b, c, col, kind, uv && [uv[0], uv[1], uv[2]]);
    this.tri(a, c, d, col, kind, uv && [uv[0], uv[2], uv[3]]);
  }

  hullTri(a, b, c) {
    const A = this.tp(a);
    const B = this.tp(b);
    const C = this.tp(c);
    const n = normal(A, B, C);
    for (const p of [A, B, C]) {
      this.HP.push(...p);
      this.HN.push(...n);
    }
  }

  hullQuad(a, b, c, d) {
    this.hullTri(a, b, c);
    this.hullTri(a, c, d);
  }

  /**
   * A box: centre x, z, bottom y, size sx × sy × sz. opts.pillar: for walls,
   * how far apart the timber posts stand. opts.top/bottom: draw those faces.
   */
  box(x, y, z, sx, sy, sz, col, kind = K.PLAIN, opts = {}) {
    const { top = true, bottom = false, hull = true, pillar = 0, colTop = null } = opts;
    const x0 = x - sx / 2;
    const x1 = x + sx / 2;
    const z0 = z - sz / 2;
    const z1 = z + sz / 2;
    const y0 = y;
    const y1 = y + sy;
    // walls: u counts posts (one per whole number), v runs 0..1 up the wall; else world units
    const vy = kind === K.WALL ? 1 : sy;
    const uvs = (len) => {
      const k = pillar ? Math.max(1, Math.round(len / pillar)) / len : 1;
      return [[0, 0], [len * k, 0], [len * k, vy], [0, vy]];
    };
    // front (+z), back (-z), right (+x), left (-x)
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, kind, uvs(sx));
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, kind, uvs(sx));
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, kind, uvs(sz));
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, kind, uvs(sz));
    if (top) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], colTop || col, kind === K.WALL ? K.PLAIN : kind, [[x0, z1], [x1, z1], [x1, z0], [x0, z0]]);
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col, kind);
    if (hull) this.hullBox(x, y, z, sx, sy, sz);
  }

  hullBox(x, y, z, sx, sy, sz, e = OUTLINE) {
    const x0 = x - sx / 2 - e;
    const x1 = x + sx / 2 + e;
    const z0 = z - sz / 2 - e;
    const z1 = z + sz / 2 + e;
    const y0 = y - e * 0.5;
    const y1 = y + sy + e;
    this.hullQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    this.hullQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    this.hullQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
    this.hullQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    this.hullQuad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  }

  /** An upright cylinder (posts, wells, drums). */
  cylinder(x, y, z, r, h, col, kind = K.PLAIN, seg = 10, hull = true) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r];
      const p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
      this.quad([p1[0], y, p1[1]], [p0[0], y, p0[1]], [p0[0], y + h, p0[1]], [p1[0], y + h, p1[1]], col, kind, [[i, 0], [i + 1, 0], [i + 1, h], [i, h]]);
      this.tri([x, y + h, z], [p1[0], y + h, p1[1]], [p0[0], y + h, p0[1]], col, kind);
      if (hull) {
        const e = OUTLINE;
        const q0 = [x + Math.cos(a0) * (r + e), z + Math.sin(a0) * (r + e)];
        const q1 = [x + Math.cos(a1) * (r + e), z + Math.sin(a1) * (r + e)];
        this.hullQuad([q1[0], y, q1[1]], [q0[0], y, q0[1]], [q0[0], y + h + e, q0[1]], [q1[0], y + h + e, q1[1]]);
        this.hullTri([x, y + h + e, z], [q1[0], y + h + e, q1[1]], [q0[0], y + h + e, q0[1]]);
      }
    }
  }

  /** A slanted beam or post from a to b, square in section. */
  beam(a, b, size, col, kind = K.WOOD) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d);
    const u = d.map((v) => v / len);
    // two directions across the beam
    let s = cross(u, Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
    s = scale(s, 1 / Math.hypot(...s));
    const t = cross(u, s);
    const corner = (p, i, j, e = 0) => add(p, add(scale(s, i * (size / 2 + e)), scale(t, j * (size / 2 + e))));
    const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) {
      const [i0, j0] = ring[k];
      const [i1, j1] = ring[(k + 1) % 4];
      this.quad(corner(a, i0, j0), corner(a, i1, j1), corner(b, i1, j1), corner(b, i0, j0), col, kind, [[0, 0], [1, 0], [1, len], [0, len]]);
      const ea = add(a, scale(u, -OUTLINE));
      const eb = add(b, scale(u, OUTLINE));
      this.hullQuad(corner(ea, i0, j0, OUTLINE), corner(ea, i1, j1, OUTLINE), corner(eb, i1, j1, OUTLINE), corner(eb, i0, j0, OUTLINE));
    }
    this.quad(corner(b, -1, -1), corner(b, 1, -1), corner(b, 1, 1), corner(b, -1, 1), col, kind);
  }

  /**
   * A painted card flat against a wall facing +z (local): door, window,
   * plaque. rect: [u0, v0, u1, v1] in the decal atlas. glow: lit at night.
   */
  decal(rect, x, y, z, w, h, glow = 0, back = false) {
    const [u0, v0, u1, v1] = rect;
    // back: facing -z, so it reads the right way round from behind
    const s = back ? -1 : 1;
    const a = this.tp([x - (s * w) / 2, y, z]);
    const b = this.tp([x + (s * w) / 2, y, z]);
    const c = this.tp([x + (s * w) / 2, y + h, z]);
    const d = this.tp([x - (s * w) / 2, y + h, z]);
    for (const [p, uv] of [[a, [u0, v0]], [b, [u1, v0]], [c, [u1, v1]], [a, [u0, v0]], [c, [u1, v1]], [d, [u0, v1]]]) {
      this.DP.push(...p);
      this.DU.push(...uv);
      this.DG.push(glow);
    }
  }

  /** Bake into geometries: the painted mesh and its ink hull. */
  build() {
    const main = new THREE.BufferGeometry();
    main.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    main.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    main.setAttribute('aCol', new THREE.Float32BufferAttribute(this.C, 3));
    main.setAttribute('aUv', new THREE.Float32BufferAttribute(this.U, 2));
    main.setAttribute('aKind', new THREE.Float32BufferAttribute(this.KD, 1));
    main.computeBoundingSphere();
    const hull = new THREE.BufferGeometry();
    hull.setAttribute('position', new THREE.Float32BufferAttribute(this.HP, 3));
    hull.setAttribute('normal', new THREE.Float32BufferAttribute(this.HN, 3));
    hull.computeBoundingSphere();
    const decals = new THREE.BufferGeometry();
    decals.setAttribute('position', new THREE.Float32BufferAttribute(this.DP, 3));
    decals.setAttribute('aUv', new THREE.Float32BufferAttribute(this.DU, 2));
    decals.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.DG, 1));
    decals.computeBoundingSphere();
    return { main, hull, decals };
  }
}

function normal(a, b, c) {
  const n = cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/**
 * A Chinese roof over a rectangle w × d whose eaves sit at height y:
 * hipped (four slopes meeting at a ridge) or gabled (two slopes, painted
 * ends), with the surface sagging as old roofs do, the corners swept up,
 * a dark fascia under the eaves and a ridge with its ends turned up.
 * Polygonal roofs (pagodas, pavilions) rise to a point.
 */
export function roof(kit, o) {
  const { w, d, y, rise, over = 6, col, kind = K.TILE, lift = 4, gable = false, sides = 4, ridgeCol = [0.2, 0.2, 0.21], ornament = null, finial = true } = o;
  const RINGS = 7;
  const loop = [];
  // the eave outline: points around the rectangle (or polygon), each with how near a corner it is
  if (sides === 4) {
    const hx = w / 2 + over;
    const hz = d / 2 + over;
    const n1 = 8;
    const n2 = 4;
    const edge = (x0, z0, x1, z1, n, last) => {
      for (let i = 0; i < n + (last ? 1 : 0); i++) {
        const t = i / n;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        loop.push({ x: x / hx, z: z / hz, c: cornerness(x / hx, z / hz) });
      }
    };
    edge(-hx, hz, hx, hz, n1);
    edge(hx, hz, hx, -hz, n2);
    edge(hx, -hz, -hx, -hz, n1);
    edge(-hx, -hz, -hx, hz, n2);
  } else {
    const per = 3;
    for (let i = 0; i < sides * per; i++) {
      const a = Math.PI / 2 + (i / (sides * per)) * Math.PI * 2 + Math.PI / sides;
      const k = (i % per) / per;
      const c = Math.abs(k - 0.5) * 2; // 1 at the corners
      const corner = Math.cos(Math.PI / sides) / Math.cos(((k - 0.5) * 2 * Math.PI) / sides);
      loop.push({ x: Math.cos(a) * corner, z: Math.sin(a) * corner, c: c ** 3 });
    }
  }
  const hx0 = w / 2 + over;
  const hz0 = sides === 4 ? d / 2 + over : hx0;
  const ridgeHalf = sides === 4 ? (gable ? hx0 : Math.max(0, w / 2 - d * 0.42)) : 0;
  const ring = (t, e = 0) =>
    loop.map((p) => {
      // shrink towards the ridge line (or the apex)
      const hx = sides === 4 ? hx0 + (ridgeHalf - hx0) * t : hx0 * (1 - t);
      const hz = hz0 * (1 - t);
      const up = lift * p.c * (1 - t) ** 2;
      const px = p.x * hx;
      const pz = p.z * (sides === 4 ? hz : hx);
      const sag = rise * t ** 1.55;
      return [px + Math.sign(px) * e, y + sag + up + e, pz + Math.sign(pz) * e];
    });
  const rings = [];
  const hulls = [];
  for (let k = 0; k <= RINGS; k++) {
    rings.push(ring(k / RINGS));
    hulls.push(ring(k / RINGS, OUTLINE));
  }
  const L = loop.length;
  const n1 = 8;
  const n2 = 4;
  const isSide = (i) => sides === 4 && ((i >= n1 && i < n1 + n2) || i >= 2 * n1 + n2);
  for (let k = 0; k < RINGS; k++) {
    for (let i = 0; i < L; i++) {
      const j = (i + 1) % L;
      const a = rings[k][i];
      const b = rings[k][j];
      const c = rings[k + 1][j];
      const e = rings[k + 1][i];
      const along = (p) => (sides === 4 && !isSide(i) ? p[0] : Math.atan2(p[2], p[0]) * 12);
      if (gable && isSide(i)) continue;
      kit.quad(a, b, c, e, col, kind, [[along(a), k], [along(b), k], [along(c), k + 1], [along(e), k + 1]]);
      const ha = hulls[k][i];
      const hb = hulls[k][j];
      const hc = hulls[k + 1][j];
      const he = hulls[k + 1][i];
      kit.hullQuad(ha, hb, hc, he);
    }
  }
  // the fascia under the eaves
  const fascia = [0.24, 0.17, 0.12];
  for (let i = 0; i < L; i++) {
    const j = (i + 1) % L;
    if (gable && isSide(i)) continue;
    const a = rings[0][i];
    const b = rings[0][j];
    kit.quad([b[0], b[1] - 1.8, b[2]], [a[0], a[1] - 1.8, a[2]], a, b, fascia, K.WOOD);
  }
  const top = rings[RINGS][0][1];
  if (gable) {
    // the gable ends: plastered triangles set in from the roof's ends
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - 1);
      kit.tri([x, y, s * (d / 2)], [x, y, -s * (d / 2)], [x, top - 1, 0], [0.86, 0.83, 0.76], K.PLAIN);
      kit.tri([x, y, -s * (d / 2)], [x, y, s * (d / 2)], [x, top - 1, 0], [0.86, 0.83, 0.76], K.PLAIN);
    }
  }
  if (sides === 4) {
    // the ridge, its ends swept up
    const len = ridgeHalf * 2 + 4;
    kit.box(0, top - 0.5, 0, len, 3, 3.2, ridgeCol, K.PLAIN);
    for (const s of [-1, 1]) kit.beam([s * (len / 2 - 1), top + 1.5, 0], [s * (len / 2 + 2.5), top + 6, 0], 2.6, ornament || ridgeCol, K.PLAIN);
    if (ornament) kit.box(0, top + 2.5, 0, 4, 4, 3, ornament, K.PLAIN);
  } else if (finial) {
    // a finial: a post with beads of gold
    kit.beam([0, top - 2, 0], [0, top + 14, 0], 1.8, [0.2, 0.19, 0.18], K.PLAIN);
    for (let k = 0; k < 3; k++) kit.cylinder(0, top + 3 + k * 4, 0, 2.2 - k * 0.45, 2.4, ornament || [0.78, 0.62, 0.3], K.PLAIN, 8);
  }
  return top;
}

function cornerness(x, z) {
  // 1 at a corner of the rectangle, 0 in the middle of a side
  const ax = Math.abs(x);
  const az = Math.abs(z);
  return Math.min(ax, az) > 0.999 ? 1 : Math.max(ax > 0.999 ? az : 0, az > 0.999 ? ax : 0) ** 4;
}
