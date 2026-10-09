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
import { GLSL_COMMON, GLSL_LIGHT } from './env.js';

export const TILE = 640;
const TQ = TILE / HS;
const TX = Math.ceil(WORLD_W / TILE);
const TY = Math.ceil(WORLD_H / TILE);
const PAINT_RES = 1.25;
const GLOBAL_RES = 0.25;

const VERT = /* glsl */ `
varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;
void main() {
  vPos = position;
  vNor = normal;
  vUv = uv;
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
varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;
void main() {
  vec2 wuv = vPos.xz / uWorld;
  vec3 far = texture2D(uGlobal, vec2(wuv.x, 1.0 - wuv.y)).rgb;
  vec3 paint = mix(far, texture2D(uPaint, vUv).rgb, uPainted);
  vec3 n = normalize(vNor);
  float steep = 1.0 - n.y;
  // 皴: where the ground is steep, bare rock brushed in long strokes down the slope
  float grain = vnoise(vPos.xz * 0.045 + vPos.y * 0.02);
  float streak = vnoise(vec2(vPos.x * 0.11 + vPos.z * 0.03, vPos.y * 0.022 + vPos.z * 0.004));
  vec3 rock = mix(vec3(0.44, 0.43, 0.4), vec3(0.64, 0.62, 0.57), grain);
  rock *= 0.72 + 0.36 * smoothstep(0.3, 0.8, streak);
  float r = smoothstep(0.14, 0.4, steep + (grain - 0.5) * 0.14);
  vec3 col = mix(paint, rock, r);
  // high ground is paler, as if seen through more air
  col = mix(col, vec3(0.7, 0.71, 0.7), smoothstep(260.0, 520.0, vPos.y) * 0.35);
  // snow on the heights in winter
  float snow = uSnow * smoothstep(170.0, 250.0, vPos.y + grain * 50.0) * (1.0 - smoothstep(0.4, 0.65, steep));
  col = mix(col, vec3(0.95, 0.95, 0.96), snow);
  col = paintLight(col, n);
  // ink contours on the slopes, every so high
  float hz = vPos.y / 22.0;
  float line = abs(fract(hz) - 0.5) / max(fwidth(hz), 1e-4);
  float contour = (1.0 - smoothstep(0.0, 1.1, line)) * smoothstep(0.1, 0.32, steep);
  col = mix(col, vec3(0.15, 0.14, 0.13), contour * 0.26);
  // ground you have not seen fades to grey under the clouds
  float seen = seenAt(vPos.xz);
  vec3 grey = vec3(dot(col, vec3(0.299, 0.587, 0.114)));
  col = mix(mix(grey, col, 0.3) * 0.92 + 0.05, col, seen);
  gl_FragColor = vec4(haze(col, vPos), 1.0);
}
`;

function tileGeometry(tx, ty, H) {
  const i0 = tx * TQ;
  const j0 = ty * TQ;
  const ni = Math.min(TQ, HW - 1 - i0);
  const nj = Math.min(TQ, HH - 1 - j0);
  const nv = (ni + 1) * (nj + 1);
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
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
    uniforms: { ...env.u, uPaint: { value: null }, uGlobal: { value: globalTex }, uPainted: { value: 0 } },
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
        uniforms: { ...env.u, uGlobal: base.uniforms.uGlobal, uPaint: { value: null }, uPainted: { value: 0 } },
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
