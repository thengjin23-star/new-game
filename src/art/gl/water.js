// Water in its bed: the great river and the mist beyond it, the lakes, and
// the stream ribboning down from 靈溪谷 to the lake. Clear in the shallows,
// dark where deep, with short ink ripples drifting on it and white water
// where the stream runs steep.

import * as THREE from './three.js';
import { WORLD_W, WORLD_H } from '../../world/geo.js';
import { heights, LEVEL } from '../../world/height.js';
import { GLSL_COMMON, GLSL_LIGHT } from './env.js';

const VERT = /* glsl */ `
attribute vec3 aFlow;
varying vec3 vPos;
varying vec3 vFlow;
void main() {
  vPos = position;
  vFlow = aFlow;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_LIGHT}
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform float uIce;
uniform float uRunning;
uniform vec2 uDrift;
varying vec3 vPos;
varying vec3 vFlow;

// short ink strokes on the water, in loose rows, drifting
float ripples(vec2 p, float t) {
  vec2 g = p / vec2(28.0, 12.0);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float r = hash12(id);
  if (r < 0.5) return 0.0;
  float cx = 0.25 + 0.5 * hash12(id + 7.1);
  float len = 0.22 + 0.2 * hash12(id + 3.7);
  float x = (f.x - cx) / len;
  if (abs(x) > 1.0) return 0.0;
  float yc = 0.5 + 0.18 * (x * x - 0.4);
  float d = abs(f.y - yc) * 12.0;
  float w = 0.55 * (1.0 - x * x) + 0.08;
  float fw = max(fwidth(d), 0.05);
  float line = 1.0 - smoothstep(w, w + fw * 1.5, d);
  return line * (0.55 + 0.45 * sin(t * 1.3 + r * 40.0));
}

void main() {
  float ground = groundAt(vPos.xz);
  float depth = vPos.y - ground;
  if (depth < -0.5) discard;
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 22.0, depth));
  // along a stream the ripples run with the water; on still water they idle
  vec2 p = uRunning > 0.5 ? vec2(vFlow.x - uTime * 26.0, vFlow.y) : vPos.xz - uDrift * uTime;
  float rip = ripples(p, uTime);
  col = mix(col, vec3(0.16, 0.17, 0.18), rip * 0.32 * (1.0 - uIce));
  // white water where the stream runs steep
  float steep = uRunning * smoothstep(0.04, 0.16, vFlow.z);
  float froth = steep * smoothstep(0.3, 0.7, vnoise(vec2(vFlow.x * 0.09 - uTime * 2.4, vFlow.y * 0.25)));
  col = mix(col, vec3(0.95, 0.96, 0.95), froth * 0.7);
  // a pale rim where it laps the shore
  float edge = 1.0 - smoothstep(0.2, 3.0, depth);
  col = mix(col, vec3(0.93, 0.93, 0.88), edge * 0.55);
  // ice in winter on still water
  col = mix(col, vec3(0.86, 0.9, 0.93), uIce * 0.65);
  col *= uAmbient + uSunColor * 0.9;
  float a = mix(0.55, 0.9, smoothstep(0.0, 10.0, depth));
  gl_FragColor = vec4(haze(col, vPos), a);
}
`;

function material(env, running, drift = [0, 0]) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      ...env.u,
      uShallow: { value: new THREE.Color(0.56, 0.68, 0.7) },
      uDeep: { value: new THREE.Color(0.3, 0.42, 0.48) },
      uIce: { value: 0 },
      uRunning: { value: running ? 1 : 0 },
      uDrift: { value: new THREE.Vector2(...drift) },
    },
    transparent: true,
    depthWrite: false,
    extensions: { derivatives: true },
  });
}

/** A flat sheet of water (x0..x1, y0..y1) at a level. */
function sheet(x0, y0, x1, y1, level) {
  const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0, 1, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, level, (y0 + y1) / 2);
  geo.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(12), 3));
  return geo;
}

/** An ellipse of water. */
function pond(cx, cy, rx, ry, level) {
  const geo = new THREE.CircleGeometry(1, 48);
  geo.rotateX(-Math.PI / 2);
  geo.scale(rx, 1, ry);
  geo.translate(cx, level, cy);
  geo.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  return geo;
}

/** A ribbon of water along a stream's course, following its falling surface. */
function ribbon(pts, half) {
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3);
  const flow = new Float32Array(n * 2 * 3);
  let s = 0;
  for (let k = 0; k < n; k++) {
    const a = pts[Math.max(0, k - 1)];
    const b = pts[Math.min(n - 1, k + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const slope = Math.abs(b[2] - a[2]) / len;
    if (k) s += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    const [x, y, z] = pts[k];
    pos.set([x + nx * half, z, y + ny * half, x - nx * half, z, y - ny * half], k * 6);
    flow.set([s, half, slope, s, -half, slope], k * 6);
  }
  const idx = [];
  for (let k = 0; k < n - 1; k++) {
    const a = k * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aFlow', new THREE.BufferAttribute(flow, 3));
  geo.setIndex(idx);
  return geo;
}

export function createWater(env) {
  const H = heights();
  const group = new THREE.Group();
  group.name = 'water';
  const still = material(env, false, [1.5, 0.4]);
  const flowing = material(env, false, [0, 7]);
  const running = material(env, true);
  const mats = [still, flowing, running];

  // the great river, and the mist-hung water beyond it, to the world's edge and past it
  const river = H.streams.find((r) => r.id === 'great');
  let minX = WORLD_W;
  for (const [x] of river.pts) minX = Math.min(minX, x);
  group.add(new THREE.Mesh(sheet(minX - river.width / 2 - 260, -600, WORLD_W + 2400, WORLD_H + 1200, LEVEL.river), flowing));
  for (const L of H.lakes) group.add(new THREE.Mesh(pond(L.cx, L.cy, L.rx * 1.3, L.ry * 1.3, L.level), still));
  for (const r of H.streams) {
    if (r.id === 'great') continue;
    group.add(new THREE.Mesh(ribbon(r.pts, r.width / 2 + 22), running));
  }
  for (const m of group.children) {
    m.renderOrder = 5;
    m.matrixAutoUpdate = false;
  }

  return {
    group,
    update(season) {
      still.uniforms.uIce.value = season === 'winter' ? 1 : 0;
      const tint = { spring: [0.56, 0.68, 0.7], summer: [0.5, 0.66, 0.68], autumn: [0.56, 0.64, 0.66], winter: [0.66, 0.74, 0.8] }[season];
      for (const m of mats) m.uniforms.uShallow.value.setRGB(...tint);
    },
    dispose() {
      for (const m of group.children) m.geometry.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
