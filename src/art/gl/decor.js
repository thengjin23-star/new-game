// Trees, rocks, reeds and the rest of the wild, as painted cards: every
// picture for the season packed into one atlas, every tree in the world in
// one instanced draw. The wind sways their tops a little.

import * as THREE from './three.js';
import { world } from '../../world/terrain.js';
import { heightAt } from '../../world/height.js';
import { decorSprite, structureSprite, SPRITE } from '../sprites.js';
import { STRUCTURES } from '../../world/places.js';
import { GLSL_COMMON, GLSL_LIGHT } from './env.js';

const RES = 2; // atlas pixels per world unit (as the sprites are painted)
const SWAY = { pine: 0.6, leaf: 1, dark: 0.7, dead: 0.3, bamboo: 1.4, willow: 1.6, bush: 0.5, tuft: 1.2, reed: 1.6, scarecrow: 0.2 };

const VERT = /* glsl */ `
${GLSL_COMMON}
attribute vec3 aPos;
attribute vec4 aSize;
attribute vec4 aRect;
attribute vec2 aSway;
uniform float uStretch;
uniform vec3 uClear;
varying vec2 vUv;
varying vec3 vWorld;
varying float vSeen;
varying float vShade;
varying float vClear;
void main() {
  vClear = uClear.z > 0.0 && distance(aPos.xz, uClear.xy) < uClear.z ? 1.0 : 0.0;
  vec2 c = position.xy;
  vec3 p = aPos;
  float up = (c.y - aSize.w);
  p.x += (c.x - aSize.z) * aSize.x;
  p.y += up * aSize.y * uStretch;
  // wind: the top moves, the foot stays
  float bend = max(0.0, up) * max(0.0, up);
  p.x += sin(uTime * 1.3 + aSway.x) * aSway.y * 3.0 * bend + sin(uTime * 2.9 + aSway.x * 1.7) * aSway.y * 0.8 * bend;
  vUv = vec2(mix(aRect.x, aRect.z, c.x), mix(aRect.y, aRect.w, c.y));
  vWorld = p;
  vSeen = seenAt(aPos.xz);
  // the lower part of a tree is in its own shade
  vShade = 0.82 + 0.18 * smoothstep(0.0, 0.6, c.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_LIGHT}
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec3 vWorld;
varying float vSeen;
varying float vShade;
varying float vClear;
void main() {
  vec4 c = texture2D(uAtlas, vUv);
  if (c.a < 0.45 || vSeen < 0.25) discard;
  // on a fight's ground, only a ghost of the tree stays
  if (vClear > 0.5 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y) * 2.0, 4.0) > 0.5) discard;
  vec3 col = c.rgb * (uAmbient + uSunColor * 0.9) * vShade;
  gl_FragColor = vec4(haze(col, vWorld), 1.0);
}
`;

/** Shelf-pack rectangles (w, h in pixels) into a strip `width` wide. */
function pack(rects, width) {
  const order = rects.map((r, i) => i).sort((a, b) => rects[b].h - rects[a].h);
  let x = 0;
  let y = 0;
  let row = 0;
  const out = [];
  for (const i of order) {
    const r = rects[i];
    if (x + r.w > width) {
      x = 0;
      y += row + 2;
      row = 0;
    }
    out[i] = { x, y };
    x += r.w + 2;
    row = Math.max(row, r.h);
  }
  return { at: out, height: y + row };
}

export function createDecor(env) {
  const g = world();
  // the trees of the wild, and the great trees that stand as landmarks
  const items = [...g.decor, ...STRUCTURES.map((st, i) => ({ st, i })).filter(({ st }) => st.sprite === 'bigtree').map(({ st, i }) => ({ kind: 'big', v: i, st, x: st.x, y: st.y + st.h / 2, s: 1 }))];
  const kinds = [...new Set(items.map((d) => `${d.kind}:${d.v}`))];
  const index = new Map(kinds.map((k, n) => [k, n]));

  const canvas = document.createElement('canvas');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const n = items.length;
  const aPos = new Float32Array(n * 3);
  const aSway = new Float32Array(n * 2);
  items.forEach((d, k) => {
    aPos.set([d.x, heightAt(d.x, d.y), d.y], k * 3);
    aSway.set([(d.x * 0.013 + d.y * 0.007) % 6.283, SWAY[d.kind] || 0], k * 2);
  });
  quad.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
  quad.setAttribute('aSway', new THREE.InstancedBufferAttribute(aSway, 2));
  const aSize = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  const aRect = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  quad.setAttribute('aSize', aSize);
  quad.setAttribute('aRect', aRect);
  quad.instanceCount = n;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...env.u, uAtlas: { value: tex } },
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(quad, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  let season = null;

  function build(next) {
    season = next;
    SPRITE.shadows = false;
    const sprites = kinds.map((k) => {
      const [kind, v] = k.split(':');
      if (kind === 'big') return structureSprite(STRUCTURES[Number(v)], Number(v), season);
      return decorSprite(kind, Number(v), season);
    });
    SPRITE.shadows = true;
    const rects = sprites.map((sp) => ({ w: sp.c.width, h: sp.c.height }));
    const width = 2048;
    const { at, height } = pack(rects, width);
    canvas.width = width;
    canvas.height = Math.min(4096, 2 ** Math.ceil(Math.log2(Math.max(64, height))));
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sprites.forEach((sp, i) => ctx.drawImage(sp.c, at[i].x, at[i].y));
    tex.needsUpdate = true;
    const W = canvas.width;
    const H = canvas.height;
    items.forEach((d, k) => {
      const i = index.get(`${d.kind}:${d.v}`);
      const sp = sprites[i];
      const { x, y } = at[i];
      aSize.setXYZW(k, sp.w * d.s, sp.h * d.s, sp.fx / sp.w, 1 - sp.fy / sp.h);
      aRect.setXYZW(k, x / W, 1 - (y + sp.c.height) / H, (x + sp.c.width) / W, 1 - y / H);
    });
    aSize.needsUpdate = true;
    aRect.needsUpdate = true;
  }

  return {
    mesh,
    update(next) {
      if (next !== season) build(next);
    },
    dispose() {
      quad.dispose();
      material.dispose();
      tex.dispose();
    },
  };
}
