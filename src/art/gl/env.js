// What every 3D material shares: the light of the hour, the haze, the
// clouds over ground you have not walked, the height of the ground. Each
// material reads the same uniform objects, so one change reaches them all.

import * as THREE from './three.js';
import { WORLD_W, WORLD_H, COLS, ROWS } from '../../world/geo.js';
import { heights, HW, HH, HS } from '../../world/height.js';

/** GLSL helpers every shader may include. */
export const GLSL_COMMON = /* glsl */ `
uniform sampler2D uFog;
uniform sampler2D uHeight;
uniform vec2 uWorld;
uniform float uTime;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm2(vec2 p) {
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.07 + 11.3) + 0.15 * vnoise(p * 4.13 + 5.7);
}
/** How much of the ground at a point you have seen (0..1). */
float seenAt(vec2 xz) {
  return texture2D(uFog, xz / uWorld).r;
}
/** The height of the ground at a point. */
float groundAt(vec2 xz) {
  return texture2D(uHeight, (xz / ${HS.toFixed(1)} + 0.5) / vec2(${HW.toFixed(1)}, ${HH.toFixed(1)})).r;
}
`;

/** GLSL for lighting and haze (fragment shaders). */
export const GLSL_LIGHT = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uHaze;
uniform vec2 uHazeRange;
uniform vec3 uCam;
uniform float uDark;
/** Soft, painted light: no hard terminator, a little warmth in the lit side. */
vec3 paintLight(vec3 col, vec3 n) {
  float ndl = dot(normalize(n), uSunDir);
  float lit = smoothstep(-0.3, 0.8, ndl);
  return col * (uAmbient + uSunColor * lit);
}
vec3 haze(vec3 col, vec3 p) {
  float d = distance(uCam, p);
  return mix(col, uHaze, smoothstep(uHazeRange.x, uHazeRange.y, d) * 0.9);
}
`;

// ambient + sun on flat ground comes to about 1: the painting's own colours
const DAY = { sun: [0.44, 0.42, 0.38], amb: [0.6, 0.6, 0.61], haze: [0.91, 0.9, 0.83] };
const DUSK = { sun: [0.56, 0.36, 0.22], amb: [0.58, 0.48, 0.49], haze: [0.93, 0.79, 0.68] };
const NIGHT = { sun: [0.12, 0.14, 0.22], amb: [0.2, 0.23, 0.34], haze: [0.13, 0.15, 0.21] };

const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function createEnv() {
  const fogData = new Uint8Array(COLS * ROWS);
  const fogTex = new THREE.DataTexture(fogData, COLS, ROWS, THREE.RedFormat, THREE.UnsignedByteType);
  fogTex.magFilter = THREE.LinearFilter;
  fogTex.minFilter = THREE.LinearFilter;
  fogTex.needsUpdate = true;

  const H = heights();
  const hdata = new Uint16Array(HW * HH);
  for (let k = 0; k < hdata.length; k++) hdata[k] = THREE.DataUtils.toHalfFloat(H.h[k]);
  const heightTex = new THREE.DataTexture(hdata, HW, HH, THREE.RedFormat, THREE.HalfFloatType);
  heightTex.magFilter = THREE.LinearFilter;
  heightTex.minFilter = THREE.LinearFilter;
  heightTex.needsUpdate = true;

  const u = {
    uSunDir: { value: new THREE.Vector3(0.3, 0.85, 0.45).normalize() },
    uSunColor: { value: new THREE.Color(...DAY.sun) },
    uAmbient: { value: new THREE.Color(...DAY.amb) },
    uHaze: { value: new THREE.Color(...DAY.haze) },
    uHazeRange: { value: new THREE.Vector2(1500, 4400) },
    uCam: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uFog: { value: fogTex },
    uHeight: { value: heightTex },
    uWorld: { value: new THREE.Vector2(WORLD_W, WORLD_H) },
    uDark: { value: 0 },
    uSnow: { value: 0 },
    uStretch: { value: 1.5 },
    // a fight's ground (x, z, radius): trees standing in it fade back so the fighters can be seen
    uClear: { value: new THREE.Vector3(0, 0, 0) },
    uCot: { value: 0.8 },
  };

  return {
    u,
    fogData,
    fogTex,
    /** Set the light for an hour of the day (dark: 0 day … 1 night). */
    setLight(tod, dark, season) {
      const dusk = tod >= 16 && tod < 19.5 ? Math.sin(((tod - 16) / 3.5) * Math.PI) : tod >= 4.5 && tod < 7 ? Math.sin(((tod - 4.5) / 2.5) * Math.PI) * 0.6 : 0;
      let c = { sun: mix3(DAY.sun, DUSK.sun, dusk), amb: mix3(DAY.amb, DUSK.amb, dusk), haze: mix3(DAY.haze, DUSK.haze, dusk) };
      c = { sun: mix3(c.sun, NIGHT.sun, dark), amb: mix3(c.amb, NIGHT.amb, dark), haze: mix3(c.haze, NIGHT.haze, dark) };
      u.uSunColor.value.setRGB(...c.sun);
      u.uAmbient.value.setRGB(...c.amb);
      u.uHaze.value.setRGB(...c.haze);
      // the sun climbs from the east, stands in the south at noon, sets in the west;
      // by night the moon hangs high in the south-west
      const a = ((tod - 12) / 12) * Math.PI;
      const el = (12 + 50 * Math.max(0, Math.sin((Math.PI * (tod - 6)) / 12))) * (Math.PI / 180);
      const sun = new THREE.Vector3(-Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el));
      const moon = new THREE.Vector3(-0.35, 0.8, 0.5).normalize();
      u.uSunDir.value.copy(sun.lerp(moon, dark).normalize());
      u.uDark.value = dark;
      u.uSnow.value = season === 'winter' ? 1 : 0;
    },
  };
}
