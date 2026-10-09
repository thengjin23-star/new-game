// The sea of clouds over ground you have not walked: soft layers hanging a
// little above the land, white on top and grey beneath, edged here and
// there with a line of ink like the clouds in old paintings. High peaks
// stand up out of it. As you walk, it parts.

import * as THREE from './three.js';
import { WORLD_W, WORLD_H } from '../../world/geo.js';
import { heights, HW, HH, HS } from '../../world/height.js';
import { GLSL_COMMON, GLSL_LIGHT } from './env.js';

const STEP = 80; // spacing of the cloud mesh
const LAYERS = [
  { lift: 60, alpha: 0.97, scale: 1.0 },
  { lift: 100, alpha: 0.72, scale: 1.35 },
  { lift: 148, alpha: 0.42, scale: 1.8 },
];

const VERT = /* glsl */ `
attribute float aLift;
varying vec3 vPos;
varying float vLift;
void main() {
  vPos = position;
  vLift = aLift;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_LIGHT}
uniform float uAlpha;
uniform float uScale;
uniform float uCot;
varying vec3 vPos;
varying float vLift;
void main() {
  // clear wherever the ground under the cloud, or the ground it would hide
  // from the camera, has been seen
  float a0 = seenAt(vPos.xz);
  float a1 = seenAt(vPos.xz - vec2(0.0, vLift * uCot));
  float unseen = (1.0 - a0) * (1.0 - a1);
  vec2 drift = vec2(uTime * 5.0, uTime * 1.6);
  float puff = fbm2((vPos.xz + drift) * 0.0042 / uScale);
  float fine = vnoise((vPos.xz - drift * 1.7) * 0.016 / uScale);
  float dens = smoothstep(0.18, 0.62, unseen * 1.25 + (puff - 0.5) * 0.75 + (fine - 0.5) * 0.18);
  if (dens < 0.01) discard;
  vec3 col = mix(vec3(0.8, 0.79, 0.77), vec3(0.985, 0.975, 0.955), smoothstep(0.3, 0.8, puff));
  // a brushed line where a cloud's edge turns
  float edge = 1.0 - smoothstep(0.0, 0.06, abs(dens - 0.5));
  col *= 1.0 - edge * 0.2 * smoothstep(0.45, 0.6, fine);
  col *= uAmbient + uSunColor * 0.95;
  gl_FragColor = vec4(haze(col, vPos), dens * uAlpha);
}
`;

function blurField(src, w, h, r) {
  let a = Float32Array.from(src);
  const b = new Float32Array(a.length);
  for (let p = 0; p < 2; p++) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += a[j * w + Math.max(0, Math.min(w - 1, i + k))];
        b[j * w + i] = s / (2 * r + 1);
      }
    }
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += b[Math.max(0, Math.min(h - 1, j + k)) * w + i];
        a[j * w + i] = s / (2 * r + 1);
      }
    }
  }
  return a;
}

export function createClouds(env) {
  const H = heights();
  // the cloud floor follows the lie of the land, not its peaks
  const nx = Math.ceil(WORLD_W / STEP) + 1;
  const ny = Math.ceil(WORLD_H / STEP) + 1;
  const floor = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const gi = Math.min(HW - 1, Math.round((i * STEP) / HS));
      const gj = Math.min(HH - 1, Math.round((j * STEP) / HS));
      floor[j * nx + i] = Math.max(-12, H.ground[gj * HW + gi]);
    }
  }
  const smooth = blurField(floor, nx, ny, 2);

  const group = new THREE.Group();
  group.name = 'clouds';
  const mats = [];
  LAYERS.forEach((L, n) => {
    const pos = new Float32Array(nx * ny * 3);
    const lift = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        pos.set([i * STEP - (i === 0 ? 400 : 0) + (i === nx - 1 ? 600 : 0), smooth[k] + L.lift, j * STEP - (j === 0 ? 400 : 0) + (j === ny - 1 ? 400 : 0)], k * 3);
        lift[k] = L.lift;
      }
    }
    const idx = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i;
        idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aLift', new THREE.BufferAttribute(lift, 1));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...env.u, uAlpha: { value: L.alpha }, uScale: { value: L.scale } },
      transparent: true,
      depthWrite: false,
    });
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 10 + n;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  });

  return {
    group,
    dispose() {
      for (const m of group.children) m.geometry.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
