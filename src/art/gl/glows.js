// Soft lights and hanging mists: lamp-light pooling at doors after dark,
// lanterns, the glow of spirit herbs, will-o'-wisps, the purple breath of
// a cursed place. Each is a soft round card turned to face the camera;
// lights add to what is behind them, mists lie over it.

import * as THREE from './three.js';

const VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aCol;
attribute float aSize;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vUv = position.xy;
  vCol = aCol;
  // face the camera: offset in view space
  vec4 mv = viewMatrix * vec4(aPos, 1.0);
  mv.xy += position.xy * aSize;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform float uSoft;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  float d = length(vUv);
  if (d > 1.0) discard;
  float a = pow(1.0 - d, uSoft) * vCol.a;
  gl_FragColor = vec4(vCol.rgb * a, a);
}
`;

const FLAT_VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aCol;
attribute float aSize;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vUv = position.xy;
  vCol = aCol;
  // lying flat on the ground
  vec3 p = aPos + vec3(position.x * aSize, 0.0, position.y * aSize * 0.55);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

function layer(max, additive, flat = false) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  const aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const aSize = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
  for (const a of [aPos, aCol, aSize]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aPos', aPos);
  geo.setAttribute('aCol', aCol);
  geo.setAttribute('aSize', aSize);
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    vertexShader: flat ? FLAT_VERT : VERT,
    fragmentShader: FRAG,
    uniforms: { uSoft: { value: additive ? 1.8 : flat ? 0.9 : 1.3 } },
    polygonOffset: flat,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    transparent: true,
    depthWrite: false,
    // lights add; mists are laid over (both premultiplied)
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  let n = 0;
  return {
    mesh,
    begin() {
      n = 0;
    },
    add(x, y, z, size, r, g, b, a) {
      if (n >= max) return;
      aPos.setXYZ(n, x, y, z);
      aCol.setXYZW(n, r, g, b, a);
      aSize.setX(n, size);
      n++;
    },
    end() {
      geo.instanceCount = n;
      for (const a of [aPos, aCol, aSize]) a.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

export function createGlows() {
  const lights = layer(240, true);
  const mists = layer(160, false);
  // soft shadows at the feet of whatever moves about
  const shadows = layer(96, false, true);
  lights.mesh.renderOrder = 30;
  mists.mesh.renderOrder = 9;
  shadows.mesh.renderOrder = 1;
  return { lights, mists, shadows };
}
