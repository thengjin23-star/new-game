// The ground in three dimensions: the height grid cut into tiles of mesh,
// each wearing the painted ground of the map as its skin. Tiles near the
// camera get a painting of their own; the rest share one small painting of
// the whole world. Steep ground shows bare rock brushed in long strokes.

import * as THREE from './three.js';
import { WORLD_W, WORLD_H, T } from '../../world/geo.js';
import { heights, HS, HW, HH } from '../../world/height.js';
import { world } from '../../world/terrain.js';
import { STRUCTURES } from '../../world/places.js';
import { paintGround } from '../worldview.js';
import { MAPS, mapId } from '../../world/atlas.js';
import { GLSL_COMMON, GLSL_LIGHT } from './env.js';

export const TILE = 640;
const TQ = TILE / HS;
const TX = Math.ceil(WORLD_W / TILE);
const TY = Math.ceil(WORLD_H / TILE);
const PAINT_RES = 1.25;
const GLOBAL_RES = 0.25;

const VERT = /* glsl */ `
attribute float aCav;
varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;
varying float vCav;
void main() {
  vPos = position;
  vNor = normal;
  vUv = uv;
  vCav = aCav;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_LIGHT}
uniform sampler2D uPaint;
uniform sampler2D uGlobal;
uniform float uPainted;
uniform float uSnow;
uniform sampler2D uMarks;
uniform vec4 uMarkRect;
uniform vec3 uRock;
uniform float uFine;
varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;
varying float vCav;
void main() {
  vec2 wuv = vPos.xz / uWorld;
  vec3 far = texture2D(uGlobal, vec2(wuv.x, 1.0 - wuv.y)).rgb;
  vec3 paint = mix(far, texture2D(uPaint, vUv).rgb, uPainted);
  vec3 n = normalize(vNor);
  float steep = 1.0 - n.y;
  float camD = distance(uCam, vPos);
  // (0.24) the ground is not one flat wash: blotches of deeper and paler ink some tens of paces across
  // (gentler on snow, which would only look dirty), and near you the grain of the paper
  float lum = dot(paint, vec3(0.299, 0.587, 0.114));
  float wash = 0.65 * vnoise(vPos.xz * 0.011 + 3.7) + 0.35 * vnoise(vPos.xz * 0.023 + 9.1);
  float wet = smoothstep(0.28, 0.72, wash);
  // (dry patches a little warmer and paler, damp ones deeper and cooler)
  paint *= mix(vec3(1.0), mix(vec3(1.05, 1.04, 1.0), vec3(0.92, 0.945, 0.945), wet), 1.0 - 0.6 * smoothstep(0.8, 0.92, lum));
  float px = length(fwidth(vPos.xz));
  float fine = uFine * (1.0 - smoothstep(0.7, 1.8, px));
  if (fine > 0.0) {
    float g = vnoise(vPos.xz * 0.42) * 0.6 + vnoise(vPos.xz * 1.13 + 7.1) * 0.4;
    paint *= 1.0 + (g - 0.5) * 0.1 * fine;
  }
  // ink gathers in the hollows and at the foot of a slope; ridges and brows are paler
  paint *= 1.0 - 0.13 * smoothstep(0.04, 0.7, vCav);
  paint = mix(paint, min(paint * 1.06 + 0.02, vec3(1.0)), 0.6 * smoothstep(0.06, 0.6, -vCav));
  // 皴: where the ground is steep, bare rock — long strokes down the face (斧劈皴), deeper at its foot
  float grain = vnoise(vPos.xz * 0.045 + vPos.y * 0.02);
  float r = smoothstep(0.14, 0.4, steep + (grain - 0.5) * 0.14);
  vec3 col = paint;
  // (only where there is rock to show: most of the ground is not steep, and skips all this)
  if (r > 0.0) {
    vec2 down = n.xz / max(length(n.xz), 1e-4);
    float across = dot(vPos.xz, vec2(-down.y, down.x));
    float s1 = vnoise(vec2(across * 0.075, vPos.y * 0.018 + grain * 0.6));
    float s2 = vnoise(vec2(across * 0.19 + 5.3, vPos.y * 0.035 + 1.7));
    float strokes = smoothstep(0.55, 0.8, s1) * 0.65 + smoothstep(0.62, 0.86, s2) * 0.35;
    vec3 rock = mix(vec3(0.47, 0.46, 0.43), vec3(0.68, 0.66, 0.61), grain);
    rock *= 1.0 - strokes * 0.42;
    // the layers in the stone (the desert's sandstone shows them most)
    float layers = abs(fract(vPos.y / 9.0 + vnoise(vPos.xz * 0.015) * 1.3) - 0.5);
    rock *= 1.0 - (1.0 - smoothstep(0.02, 0.1, layers)) * (0.05 + 0.13 * smoothstep(1.05, 1.2, uRock.x));
    rock *= 0.8 + 0.2 * smoothstep(0.6, -0.4, vCav);
    // (each map's own stone: grey in 東荒, sandstone in the desert)
    rock *= uRock;
    col = mix(paint, rock, r);
  }
  // high ground is paler, as if seen through more air
  col = mix(col, vec3(0.7, 0.71, 0.7), smoothstep(260.0, 520.0, vPos.y) * 0.35);
  // snow on the heights in winter
  float snow = uSnow * smoothstep(170.0, 250.0, vPos.y + grain * 50.0) * (1.0 - smoothstep(0.4, 0.65, steep));
  col = mix(col, vec3(0.95, 0.95, 0.96), snow);
  col = paintLight(col, n);
  // ink contours on the slopes, every so high
  float hz = vPos.y / 22.0;
  float line = abs(fract(hz) - 0.5) / max(fwidth(hz), 1e-4);
  // (not on the sheer walls, where the strokes are: there they would only crosshatch it)
  float contour = (1.0 - smoothstep(0.0, 1.1, line)) * smoothstep(0.1, 0.32, steep) * (1.0 - smoothstep(0.42, 0.62, steep));
  col = mix(col, vec3(0.15, 0.14, 0.13), contour * 0.22);
  // the brow of a cliff inked in one line, where the ground breaks over into rock
  float edge = abs(r - 0.5) / max(fwidth(r), 1e-3);
  float brow = (1.0 - smoothstep(0.5, 1.6, edge)) * smoothstep(0.02, 0.22, -vCav) * (1.0 - smoothstep(1600.0, 3000.0, camD));
  col = mix(col, vec3(0.15, 0.14, 0.13), brow * 0.6);
  // marks on the ground near you: a beast's coming blow, where your spell will go
  if (uMarkRect.w > 0.5) {
    vec2 muv = (vPos.xz - uMarkRect.xy) / uMarkRect.z;
    if (muv.x > 0.0 && muv.x < 1.0 && muv.y > 0.0 && muv.y < 1.0) {
      vec4 m = texture2D(uMarks, muv);
      col = mix(col, m.rgb, m.a);
    }
  }
  // ground you have not seen fades to grey under the clouds
  float seen = seenAt(vPos.xz);
  vec3 grey = vec3(dot(col, vec3(0.299, 0.587, 0.114)));
  col = mix(mix(grey, col, 0.3) * 0.92 + 0.05, col, seen);
  gl_FragColor = vec4(haze(col, vPos), 1.0);
}
`;

// the ground looked at round each point, for its hollows and brows: two steps out, and the diagonals
const RING = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function tileGeometry(tx, ty, H) {
  const i0 = tx * TQ;
  const j0 = ty * TQ;
  const ni = Math.min(TQ, HW - 1 - i0);
  const nj = Math.min(TQ, HH - 1 - j0);
  const nv = (ni + 1) * (nj + 1);
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const cav = new Float32Array(nv);
  const hAt = (i, j) => H.h[Math.max(0, Math.min(HH - 1, j)) * HW + Math.max(0, Math.min(HW - 1, i))];
  let k = 0;
  for (let j = 0; j <= nj; j++) {
    for (let i = 0; i <= ni; i++) {
      const gi = i0 + i;
      const gj = j0 + j;
      pos[k * 3] = gi * HS;
      pos[k * 3 + 1] = hAt(gi, gj);
      pos[k * 3 + 2] = gj * HS;
      const nx = (hAt(gi - 1, gj) - hAt(gi + 1, gj)) / (2 * HS);
      const nz = (hAt(gi, gj - 1) - hAt(gi, gj + 1)) / (2 * HS);
      const len = Math.hypot(nx, 1, nz);
      nor[k * 3] = nx / len;
      nor[k * 3 + 1] = 1 / len;
      nor[k * 3 + 2] = nz / len;
      uv[k * 2] = i / TQ;
      uv[k * 2 + 1] = 1 - j / TQ;
      // (0.24) how far the ground around sits above it (+: a hollow, the foot of a slope) or below (-: a brow)
      let around = 0;
      for (const [di, dj] of RING) around += hAt(gi + di, gj + dj);
      cav[k] = Math.max(-1, Math.min(1, (around / RING.length - pos[k * 3 + 1]) / 24));
      k++;
    }
  }
  const idx = new Uint32Array(ni * nj * 6);
  let n = 0;
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const a = j * (ni + 1) + i;
      const b = a + 1;
      const c = a + ni + 1;
      const d = c + 1;
      // split each quad along its flatter diagonal
      if (Math.abs(pos[a * 3 + 1] - pos[d * 3 + 1]) < Math.abs(pos[b * 3 + 1] - pos[c * 3 + 1])) idx.set([a, c, d, a, d, b], n);
      else idx.set([a, c, b, b, c, d], n);
      n += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aCav', new THREE.BufferAttribute(cav, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/** Soft shadows painted into the ground under trees, rocks and buildings. */
function paintShadows(ctx, x0, y0, x1, y1) {
  const g = world();
  const blob = (x, y, rx, ry, a) => {
    if (x < x0 - rx || x > x1 + rx || y < y0 - ry || y > y1 + ry) return;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, `rgba(30,28,24,${a})`);
    gr.addColorStop(0.6, `rgba(30,28,24,${a * 0.55})`);
    gr.addColorStop(1, 'rgba(30,28,24,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = gr;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  };
  const SIZE = { pine: [15, 0.26], leaf: [19, 0.26], dark: [21, 0.32], dead: [12, 0.2], bamboo: [14, 0.24], willow: [22, 0.26], bush: [13, 0.24], rock: [16, 0.26], pillar: [10, 0.24], scarecrow: [7, 0.2] };
  for (const d of g.decor) {
    const sz = SIZE[d.kind];
    if (sz) blob(d.x, d.y - 2, sz[0] * d.s, sz[0] * d.s * 0.62, sz[1]);
  }
  for (const st of STRUCTURES) {
    if (!st.sprite || st.paint === T.BRIDGE) continue;
    const [fw, fh] = st.rot % 180 ? [st.h, st.w] : [st.w, st.h];
    blob(st.x, st.y + 2, fw * 0.62 + 10, fh * 0.62 + 8, 0.22);
  }
}

export function createTerrain(renderer, env) {
  const H = heights();
  const group = new THREE.Group();
  group.name = 'terrain';
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // one small painting of everything, for far tiles
  const globalCanvas = document.createElement('canvas');
  globalCanvas.width = 4;
  globalCanvas.height = 4;
  const globalTex = new THREE.CanvasTexture(globalCanvas);
  globalTex.colorSpace = THREE.NoColorSpace;
  let globalSeason = null;

  const base = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...env.u, uPaint: { value: null }, uGlobal: { value: globalTex }, uPainted: { value: 0 }, uRock: { value: new THREE.Vector3(...(MAPS[mapId()]?.rock || [1, 1, 1])) } },
  });
  base.extensions = { derivatives: true };

  const tiles = [];
  for (let ty = 0; ty < TY; ty++) {
    for (let tx = 0; tx < TX; tx++) {
      // a material per tile for its own painting; everything else is shared
      // by reference (cloning would copy every texture's data, per tile)
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { ...env.u, uGlobal: base.uniforms.uGlobal, uPaint: { value: null }, uPainted: { value: 0 }, uRock: base.uniforms.uRock },
      });
      mat.extensions = { derivatives: true };
      const mesh = new THREE.Mesh(tileGeometry(tx, ty, H), mat);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = true;
      group.add(mesh);
      tiles.push({ tx, ty, mesh, mat, tex: null, season: null, used: 0, fade: 0 });
    }
  }

  function paintGlobal(season) {
    globalCanvas.width = Math.round(WORLD_W * GLOBAL_RES);
    globalCanvas.height = Math.round(WORLD_H * GLOBAL_RES);
    const ctx = globalCanvas.getContext('2d');
    ctx.scale(GLOBAL_RES, GLOBAL_RES);
    paintGround(ctx, 0, 0, WORLD_W, WORLD_H, season, 0);
    globalTex.needsUpdate = true;
    globalSeason = season;
  }

  function paintTile(t, season) {
    const x0 = t.tx * TILE;
    const y0 = t.ty * TILE;
    const c = t.tex?.image || document.createElement('canvas');
    c.width = c.height = Math.round(TILE * PAINT_RES);
    const ctx = c.getContext('2d');
    ctx.setTransform(PAINT_RES, 0, 0, PAINT_RES, -x0 * PAINT_RES, -y0 * PAINT_RES);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, TILE, TILE);
    ctx.clip();
    paintGround(ctx, x0, y0, x0 + TILE, y0 + TILE, season);
    paintShadows(ctx, x0, y0, x0 + TILE, y0 + TILE);
    ctx.restore();
    if (!t.tex) {
      t.tex = new THREE.CanvasTexture(c);
      t.tex.colorSpace = THREE.NoColorSpace;
      t.tex.anisotropy = aniso;
      t.tex.minFilter = THREE.LinearMipmapLinearFilter;
      t.tex.generateMipmaps = true;
      t.mat.uniforms.uPaint.value = t.tex;
    }
    t.tex.needsUpdate = true;
    t.season = season;
  }

  function unpaint(t) {
    t.tex?.dispose();
    t.tex = null;
    t.season = null;
    t.fade = 0;
    t.mat.uniforms.uPaint.value = null;
    t.mat.uniforms.uPainted.value = 0;
  }

  const MAX_PAINTED = 14;

  return {
    group,
    /**
     * Keep the tiles around (x, y) painted for this season. budget: how many
     * tiles may be painted now. Returns true while some still wait.
     */
    update(x, y, season, dt, budget = 1, reach = 1500) {
      if (globalSeason !== season) paintGlobal(season);
      const want = tiles
        .map((t) => {
          const cx = Math.max(t.tx * TILE, Math.min((t.tx + 1) * TILE, x));
          const cy = Math.max(t.ty * TILE, Math.min((t.ty + 1) * TILE, y - 250));
          return [t, Math.hypot(cx - x, (cy - (y - 250)) * 0.75)];
        })
        .filter(([, d]) => d < reach)
        .sort((a, b) => a[1] - b[1])
        .slice(0, MAX_PAINTED);
      const keep = new Set(want.map(([t]) => t));
      let waiting = false;
      for (const [t] of want) {
        if (t.season !== season) {
          if (budget > 0) {
            paintTile(t, season);
            budget--;
          } else waiting = true;
        }
      }
      for (const t of tiles) {
        if (!keep.has(t) && t.tex && tiles.filter((o) => o.tex).length > MAX_PAINTED) unpaint(t);
        const target = t.season === season && t.tex ? 1 : 0;
        t.fade += (target - t.fade) * Math.min(1, dt * 4);
        if (target === 0) t.fade = 0;
        t.mat.uniforms.uPainted.value = t.fade;
      }
      return waiting;
    },
    dispose() {
      for (const t of tiles) {
        t.mesh.geometry.dispose();
        t.mat.dispose();
        t.tex?.dispose();
      }
      globalTex.dispose();
    },
  };
}
