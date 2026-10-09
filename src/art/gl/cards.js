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
export function createCards(env, renderer, { size = 1024, slot = 128, res = 2, max = 64 } = {}) {
  // the atlas starts empty; each slot is painted on a small canvas of its
  // own and copied straight into the texture, so a moving figure costs one
  // small upload, not the whole atlas
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const slotCanvas = document.createElement('canvas');
  slotCanvas.width = slotCanvas.height = slot;
  const ctx = slotCanvas.getContext('2d');
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
  const ghostMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...env.u, uAtlas: material.uniforms.uAtlas, uGhost: { value: 1 } },
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
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
  let ready = false;
  const pending = [];

  /** Copy the slot canvas into slot n of the texture. */
  function upload(n) {
    const gl = renderer.getContext();
    const glTex = renderer.properties.get(tex).__webglTexture;
    if (!glTex) return false;
    const sx = (n % per) * slot;
    const sy = Math.floor(n / per) * slot;
    renderer.state.activeTexture(gl.TEXTURE0);
    renderer.state.bindTexture(gl.TEXTURE_2D, glTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, sx, size - sy - slot, gl.RGBA, gl.UNSIGNED_BYTE, slotCanvas);
    return true;
  }

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
    add(key, x, ground, y, draw, { animated = false, fps = 30, alpha = 1, ghost: seeThrough = false, w = unit, h = unit, footPad = 6 } = {}) {
      const sl = slotFor(key);
      if (!sl) return;
      sl.used = frame;
      // a figure standing still needs repainting less often than one walking
      const now = performance.now();
      if (!sl.drawn || (animated && now - (sl.at || 0) >= 1000 / fps)) {
        sl.at = now;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, slot, slot);
        ctx.save();
        ctx.setTransform(res, 0, 0, res, slot / 2, slot - footPad * res);
        draw(ctx);
        ctx.restore();
        // before the texture exists on the GPU, paint into the atlas itself
        if (!ready || !upload(sl.n)) {
          canvas.getContext('2d').clearRect((sl.n % per) * slot, Math.floor(sl.n / per) * slot, slot, slot);
          canvas.getContext('2d').drawImage(slotCanvas, (sl.n % per) * slot, Math.floor(sl.n / per) * slot);
          tex.needsUpdate = true;
          pending.push(sl.n);
        }
        sl.drawn = true;
      }
      items.push({ sl, x, ground, y, alpha, seeThrough, w, h, footPad });
    },
    /** After the GPU lost its memory: paint every card again from scratch. */
    reset() {
      for (const sl of slots.values()) sl.drawn = false;
      ready = false;
    },
    /** Lay out this frame's cards (call once all are added). */
    end() {
      // once the atlas is on the GPU, slots go up one by one
      if (!ready && renderer.properties.get(tex).__webglTexture && !tex.needsUpdate) ready = true;
      pending.length = 0;
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
