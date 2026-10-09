// Pictures that stand up in the world, like painted cards set on a model:
// people, beasts and odd things are drawn with the same brushes as the 2D
// map onto a canvas atlas, and each frame's cards are laid out at their
// feet. Cards face the camera's way and are drawn a little taller to make
// up for the camera looking down on them.

import * as THREE from './three.js';
import { GLSL_COMMON, GLSL_LIGHT } from './env.js';

const VERT = /* glsl */ `
${GLSL_COMMON}
attribute vec3 aPos;
attribute vec4 aSize;
attribute vec4 aRect;
attribute float aAlpha;
uniform float uStretch;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vWorld;
varying float vSeen;
void main() {
  vec2 c = position.xy;
  vec3 p = aPos;
  p.x += (c.x - aSize.z) * aSize.x;
  p.y += (c.y - aSize.w) * aSize.y * uStretch;
  vUv = vec2(mix(aRect.x, aRect.z, c.x), mix(aRect.y, aRect.w, c.y));
  vAlpha = aAlpha;
  vWorld = p;
  vSeen = seenAt(aPos.xz);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_LIGHT}
uniform sampler2D uAtlas;
uniform float uGhost;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vWorld;
varying float vSeen;
void main() {
  vec4 c = texture2D(uAtlas, vUv);
  float a = c.a * vAlpha;
  if (uGhost > 0.5) {
    // seen through whatever stands in front: a faint ink silhouette
    if (c.a < 0.35) discard;
    gl_FragColor = vec4(mix(c.rgb, vec3(0.16, 0.15, 0.14), 0.55), 0.42 * vAlpha);
    return;
  }
  if (a < 0.42 || vSeen < 0.3) discard;
  vec3 col = c.rgb * (uAmbient + uSunColor * 0.9);
  gl_FragColor = vec4(haze(col, vWorld), 1.0);
}
`;

/**
 * A layer of cards drawn from one atlas. Slots are slot×slot pixels; at
 * `res` pixels per world unit a slot holds (slot/res)² world units.
 */
export function createCards(env, { size = 1024, slot = 128, res = 2, max = 64 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.premultiplyAlpha = false;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const per = Math.floor(size / slot);
  const unit = slot / res; // world units per slot side

  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  const aSize = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aRect = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
  for (const a of [aPos, aSize, aRect, aAlpha]) a.setUsage(THREE.DynamicDrawUsage);
  quad.setAttribute('aPos', aPos);
  quad.setAttribute('aSize', aSize);
  quad.setAttribute('aRect', aRect);
  quad.setAttribute('aAlpha', aAlpha);
  quad.instanceCount = 0;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...env.u, uAtlas: { value: tex }, uGhost: { value: 0 } },
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(quad, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  // the same cards again, drawn through anything in front of them
  const ghostMat = material.clone();
  Object.assign(ghostMat.uniforms, env.u, { uAtlas: material.uniforms.uAtlas, uGhost: { value: 1 } });
  ghostMat.transparent = true;
  ghostMat.depthTest = false;
  ghostMat.depthWrite = false;
  const ghostGeo = new THREE.InstancedBufferGeometry();
  ghostGeo.index = quad.index;
  for (const name of ['position', 'aPos', 'aSize', 'aRect', 'aAlpha']) ghostGeo.setAttribute(name, quad.getAttribute(name));
  ghostGeo.instanceCount = 0;
  const ghost = new THREE.Mesh(ghostGeo, ghostMat);
  ghost.frustumCulled = false;
  ghost.renderOrder = 50;

  const slots = new Map(); // key → { n, used, drawn }
  const free = Array.from({ length: per * per }, (_, n) => n);
  let frame = 0;
  let items = [];
  let dirty = false;

  function slotFor(key) {
    let sl = slots.get(key);
    if (sl) return sl;
    if (!free.length) {
      // reuse the slot unused the longest
      let oldest = null;
      for (const [k, v] of slots) if (v.used < frame && (!oldest || v.used < oldest[1].used)) oldest = [k, v];
      if (!oldest) return null;
      slots.delete(oldest[0]);
      free.push(oldest[1].n);
    }
    sl = { n: free.pop(), used: frame, drawn: false };
    slots.set(key, sl);
    return sl;
  }

  return {
    mesh,
    ghost,
    unit,
    begin() {
      frame++;
      items = [];
    },
    /**
     * A card this frame. draw(ctx) paints it with its foot at (0, 0) in
     * world units (the slot is `unit` wide; the foot sits at its bottom
     * middle, `footPad` units up). animated: repaint every frame.
     */
    add(key, x, ground, y, draw, { animated = false, alpha = 1, ghost: seeThrough = false, w = unit, h = unit, footPad = 6 } = {}) {
      const sl = slotFor(key);
      if (!sl) return;
      sl.used = frame;
      if (!sl.drawn || animated) {
        const sx = (sl.n % per) * slot;
        const sy = Math.floor(sl.n / per) * slot;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(sx, sy, slot, slot);
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx, sy, slot, slot);
        ctx.clip();
        ctx.setTransform(res, 0, 0, res, sx + slot / 2, sy + slot - footPad * res);
        draw(ctx);
        ctx.restore();
        sl.drawn = true;
        dirty = true;
      }
      items.push({ sl, x, ground, y, alpha, seeThrough, w, h, footPad });
    },
    /** Lay out this frame's cards (call once all are added). */
    end() {
      if (dirty) {
        tex.needsUpdate = true;
        dirty = false;
      }
      const n = Math.min(max, items.length);
      // see-through cards go first so the ghost pass can draw just those
      items.sort((a, b) => b.seeThrough - a.seeThrough);
      let ghosts = 0;
      for (let k = 0; k < n; k++) {
        const it = items[k];
        if (it.seeThrough) ghosts++;
        const sx = (it.sl.n % per) * slot;
        const sy = Math.floor(it.sl.n / per) * slot;
        aPos.setXYZ(k, it.x, it.ground, it.y);
        // the whole slot is the card; its foot is footPad up from the bottom middle
        aSize.setXYZW(k, unit, unit, 0.5, it.footPad / unit);
        aRect.setXYZW(k, sx / size, 1 - (sy + slot) / size, (sx + slot) / size, 1 - sy / size);
        aAlpha.setX(k, it.alpha);
      }
      for (const a of [aPos, aSize, aRect, aAlpha]) a.needsUpdate = true;
      quad.instanceCount = n;
      ghostGeo.instanceCount = ghosts;
    },
    dispose() {
      quad.dispose();
      ghostGeo.dispose();
      material.dispose();
      ghostMat.dispose();
      tex.dispose();
    },
  };
}
