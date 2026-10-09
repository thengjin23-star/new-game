// The world in three dimensions: the same painted land, now with height.
// Mountains stand, valleys sink, water lies in its bed, buildings have
// walls and roofs, and the people and trees are painted cards standing on
// the ground. The camera follows you from above and a little behind.
// It offers the same controls as the flat map (worldview.js), which stays
// as the fallback where WebGL is not to be had.

import * as THREE from './gl/three.js';
import { WORLD_W, WORLD_H } from '../world/geo.js';
import { world, hash2 } from '../world/terrain.js';
import { POIS } from '../world/places.js';
import { NODES } from '../world/map.js';
import { heightAt } from '../world/height.js';
import { fogOf } from '../world/fog.js';
import * as E from '../world/explore.js';
import { createEnv } from './gl/env.js';
import { createTerrain } from './gl/terrain.js';
import { createCards } from './gl/cards.js';
import { createDecor } from './gl/decor.js';
import { createWater } from './gl/water.js';
import { createClouds } from './gl/clouds.js';
import { createBuildings } from './gl/buildings.js';
import { drawPerson, drawMob, aura, LOOKS, FOLK_LOOKS, FIGURE } from './figures.js';
import { propSprite, SPRITE } from './sprites.js';
import { makeParticles, drawParticles } from './ink.js';
import { seasonOf } from '../core/calendar.js';
import { stream } from '../core/rng.js';

const DEG = Math.PI / 180;
const FONT = "'LXGW WenKai TC', 'Kaiti TC', 'STKaiti', 'BiauKai', serif";
const ZMIN = 0.45;
const ZMAX = 1.5;

/** Can this device draw the 3D world? */
export function canDraw3D() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

export function createWorld3D(canvas, { onFrame, idle } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0xe9e5d4, 1);

  // labels, marks and weather are drawn flat on a canvas laid over the world
  const overlay = document.createElement('canvas');
  overlay.className = 'world-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  canvas.after(overlay);
  const octx = overlay.getContext('2d');

  const env = createEnv();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 30, 9000);
  const terrain = createTerrain(renderer, env);
  scene.add(terrain.group);
  const water = createWater(env);
  scene.add(water.group);
  const buildings = createBuildings(env);
  scene.add(buildings.group);
  const decor = createDecor(env);
  scene.add(decor.mesh);
  const clouds = createClouds(env);
  scene.add(clouds.group);
  const cards = createCards(env, { size: 1024, slot: 128, res: 2, max: 64 });
  scene.add(cards.mesh, cards.ghost);

  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let s = null;
  let W = 1;
  let H = 1;
  let dpr = 1;
  let zoom = 0.82;
  let season = 'spring';
  let raf = 0;
  let running = false;
  let last = 0;
  let t = 0;
  let lastDraw = 0;
  let highlight = null;
  let tapMark = null;
  let lastPos = null;
  let vel = { x: 0, y: 0 };
  const focus = { x: 1360, y: 2740, h: 0 };
  let fogFor = null;
  let particles = [];
  let particleKind = null;
  let grain = null;
  const ray = new THREE.Raycaster();
  const v3 = new THREE.Vector3();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    overlay.width = Math.round(W * dpr);
    overlay.height = Math.round(H * dpr);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    particles = [];
    particleKind = null;
  }

  // ── the camera ──

  function pitch() {
    const k = (zoom - ZMIN) / (ZMAX - ZMIN);
    return (58 - 14 * k) * DEG;
  }

  function placeCamera() {
    const p = pitch();
    const dist = 1250 / zoom;
    camera.position.set(focus.x, focus.h + Math.sin(p) * dist, focus.y + Math.cos(p) * dist);
    camera.lookAt(focus.x, focus.h, focus.y);
    camera.updateMatrixWorld();
    env.u.uCam.value.copy(camera.position);
    // cards are drawn taller as the camera looks more steeply down
    env.u.uStretch.value = 1 + (1 / Math.cos(p) - 1) * 0.7;
    env.u.uCot.value = 1 / Math.tan(p);
    env.u.uHazeRange.value.set(dist * 1.05, dist * 3.2);
  }

  function followCamera(dt, snap) {
    const w = s.world;
    if (lastPos && dt > 0) {
      const vx = (w.x - lastPos[0]) / dt;
      const vy = (w.y - lastPos[1]) / dt;
      vel.x += (vx - vel.x) * Math.min(1, dt * 4);
      vel.y += (vy - vel.y) * Math.min(1, dt * 4);
    }
    lastPos = [w.x, w.y];
    const tx = Math.max(260, Math.min(WORLD_W - 260, w.x + vel.x * 0.35));
    const ty = Math.max(420, Math.min(WORLD_H - 120, w.y + vel.y * 0.35));
    const th = heightAt(w.x, w.y);
    if (snap || Math.hypot(tx - focus.x, ty - focus.y) > 900) {
      focus.x = tx;
      focus.y = ty;
      focus.h = th;
      vel = { x: 0, y: 0 };
    } else {
      const k = 1 - Math.exp(-dt * 5);
      focus.x += (tx - focus.x) * k;
      focus.y += (ty - focus.y) * k;
      focus.h += (th - focus.h) * (1 - Math.exp(-dt * 3));
    }
    placeCamera();
  }

  // ── where things are on the screen ──

  /** The point of the ground under a spot on the screen. */
  function screenToWorld(sx, sy) {
    ray.setFromCamera(new THREE.Vector2((sx / W) * 2 - 1, -(sy / H) * 2 + 1), camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    let prev = 0;
    for (let k = 40; k < 9000; k += 14) {
      const x = o.x + d.x * k;
      const y = o.y + d.y * k;
      const z = o.z + d.z * k;
      if (y <= heightAt(x, z)) {
        let a = prev;
        let b = k;
        for (let n = 0; n < 10; n++) {
          const m = (a + b) / 2;
          if (o.y + d.y * m <= heightAt(o.x + d.x * m, o.z + d.z * m)) b = m;
          else a = m;
        }
        return [Math.max(0, Math.min(WORLD_W, o.x + d.x * b)), Math.max(0, Math.min(WORLD_H, o.z + d.z * b))];
      }
      prev = k;
    }
    // past the edge of the world: the plane of the focus
    const k = (focus.h - o.y) / d.y;
    return [Math.max(0, Math.min(WORLD_W, o.x + d.x * k)), Math.max(0, Math.min(WORLD_H, o.z + d.z * k))];
  }

  /** Where a point of the world shows on the screen; up: how far above the ground (as a card would draw it). */
  function worldToScreen(x, y, up = 0) {
    v3.set(x, heightAt(x, y) + up * env.u.uStretch.value, y).project(camera);
    return [(v3.x + 1) * 0.5 * W, (1 - v3.y) * 0.5 * H];
  }

  // ── what has been seen ──

  function updateFog() {
    const f = fogOf(s);
    if (fogFor !== s.world) {
      for (let k = 0; k < f.bits.length; k++) env.fogData[k] = f.bits[k] ? 255 : 0;
      f.recent.length = 0;
      fogFor = s.world;
      env.fogTex.needsUpdate = true;
      return;
    }
    if (!f.recent.length) return;
    for (const k of f.recent) env.fogData[k] = 255;
    f.recent.length = 0;
    env.fogTex.needsUpdate = true;
  }

  // ── the people and things standing about ──

  function standing() {
    cards.begin();
    const w = s.world;
    const near = (x, y, r = 900) => Math.abs(x - focus.x) < r && y > focus.y - 1500 && y < focus.y + 700;
    FIGURE.shadows = false;
    SPRITE.shadows = false;
    for (const p of POIS) {
      if (!near(p.x, p.y) || !E.poiVisible(s, p)) continue;
      const kind = p.spriteIf ? (p.spriteIf(s) ? p.sprite : null) : p.sprite;
      if (!kind) continue;
      const sp = propSprite(kind);
      if (!sp) continue;
      cards.add(`prop:${kind}`, p.x, heightAt(p.x, p.y), p.y, (c) => c.drawImage(sp.c, -sp.fx, -sp.fy, sp.w, sp.h));
    }
    for (const h of world().herbs) {
      if (!near(h.x, h.y, 600) || !E.herbReady(s, h)) continue;
      const sp = propSprite('herb');
      cards.add('prop:herb', h.x, heightAt(h.x, h.y), h.y, (c) => c.drawImage(sp.c, -sp.fx, -sp.fy, sp.w, sp.h));
    }
    for (const n of E.peopleInWorld(s)) {
      if (!near(n.x, n.y)) continue;
      const look = LOOKS[n.id] || LOOKS.stranger;
      const face = n.x > w.x ? -1 : 1;
      cards.add(`npc:${n.id}`, n.x, heightAt(n.x, n.y), n.y, (c) => drawPerson(c, 0, 0, look, { t: t + n.x * 0.01, face }), { animated: true });
    }
    for (const fk of E.folkInWorld(s)) {
      if (!near(fk.x, fk.y)) continue;
      cards.add(`folk:${fk.id ?? fk.line}`, fk.x, heightAt(fk.x, fk.y), fk.y, (c) => drawPerson(c, 0, 0, FOLK_LOOKS[fk.look], { t: t + fk.line, moving: fk.moving, face: fk.face }), { animated: true });
    }
    for (const m of E.mobsInWorld(s)) {
      m.members.forEach((b, i) => {
        if (!near(b.x, b.y)) return;
        cards.add(`mob:${m.def.id}:${i}`, b.x, heightAt(b.x, b.y), b.y, (c) => drawMob(c, m.def.kind, 0, 0, { t: t + b.x * 0.01, moving: b.moving, face: b.face }), { animated: true });
      });
    }
    const sit = !!s.secl;
    const moving = E.liveOf(s).moving;
    cards.add('player', w.x, heightAt(w.x, w.y), w.y, (c) => {
      if (sit) aura(c, 0, 0, t, 1);
      drawPerson(c, 0, 0, LOOKS.player, { t, moving, face: w.face || 1, sit });
    }, { animated: true, ghost: true });
    FIGURE.shadows = true;
    SPRITE.shadows = true;
    cards.end();
  }

  // ── the flat layer: marks on the ground, names, weather ──

  function groundRing(x, y, r, color, width, dash) {
    octx.strokeStyle = color;
    octx.lineWidth = width;
    octx.setLineDash(dash || []);
    octx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const [px, py] = worldToScreen(x + Math.cos(a) * r, y + Math.sin(a) * r);
      if (k) octx.lineTo(px, py);
      else octx.moveTo(px, py);
    }
    octx.stroke();
    octx.setLineDash([]);
  }

  function drawOverlay(dt) {
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    const w = s.world;
    // marks on the ground
    if (highlight) groundRing(highlight.x, highlight.y + 2, 16 + Math.sin(t * 4) * 2, 'rgba(168,50,42,0.75)', 1.8);
    const path = E.pathOf(s);
    if (path?.length) {
      const [gx, gy] = path[path.length - 1];
      groundRing(gx, gy, 7, 'rgba(168,50,42,0.8)', 2.2);
      octx.strokeStyle = 'rgba(168,50,42,0.45)';
      octx.setLineDash([4, 6]);
      octx.lineWidth = 1.6;
      octx.beginPath();
      const [sx, sy] = worldToScreen(w.x, w.y);
      octx.moveTo(sx, sy);
      for (const [px, py] of path.slice(0, 6)) {
        const [qx, qy] = worldToScreen(px, py);
        octx.lineTo(qx, qy);
      }
      octx.stroke();
      octx.setLineDash([]);
    }
    if (tapMark && t - tapMark.t < 0.6) {
      const k = (t - tapMark.t) / 0.6;
      groundRing(tapMark.x, tapMark.y, 6 + k * 18, `rgba(168,50,42,${0.6 * (1 - k)})`, 1.6);
    }
    groundRing(w.x, w.y, 11, 'rgba(168,50,42,0.3)', 2);
    drawLabels();
    drawPlaceNames();
    // weather and paper
    const kind = { spring: 'petal', summer: 'seed', autumn: 'leaf', winter: 'snow' }[season];
    if (!reduce) {
      if (particleKind !== kind) {
        particleKind = kind;
        particles = makeParticles(kind, stream(5), W, H, kind === 'snow' ? 60 : kind === 'seed' ? 10 : 22);
      }
      drawParticles(octx, kind, particles, W, H, dt * 1000, t * 1000, false);
    }
    if (!grain) {
      const gc = document.createElement('canvas');
      gc.width = gc.height = 128;
      const g = gc.getContext('2d');
      const r = stream(9);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(80,60,30,0.05)' : 'rgba(255,255,255,0.06)';
        g.fillRect(r() * 128, r() * 128, 1, 1);
      }
      grain = octx.createPattern(gc, 'repeat');
    }
    octx.fillStyle = grain;
    octx.fillRect(0, 0, W, H);
    const v = octx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(60,48,30,0)');
    v.addColorStop(1, 'rgba(60,48,30,0.16)');
    octx.fillStyle = v;
    octx.fillRect(0, 0, W, H);
  }

  function label(x, y, up, text, a) {
    const [sx, sy0] = worldToScreen(x, y, up);
    const sy = sy0;
    if (sx < -60 || sx > W + 60 || sy < -20 || sy > H + 20) return;
    octx.font = `700 11px ${FONT}`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    const tw = octx.measureText(text).width + 10;
    octx.fillStyle = `rgba(239,233,219,${0.85 * a})`;
    octx.fillRect(sx - tw / 2, sy - 8, tw, 16);
    octx.strokeStyle = `rgba(35,32,27,${0.35 * a})`;
    octx.lineWidth = 0.7;
    octx.strokeRect(sx - tw / 2, sy - 8, tw, 16);
    octx.fillStyle = `rgba(35,32,27,${a})`;
    octx.fillText(text, sx, sy + 0.5);
  }

  function drawLabels() {
    const w = s.world;
    for (const n of E.peopleInWorld(s)) {
      const d = Math.hypot(n.x - w.x, n.y - w.y);
      if (d < 260) label(n.x, n.y, 46, n.name, n.named ? 1 : 0.8);
    }
    if (highlight && highlight.kind !== 'npc' && highlight.kind !== 'folk') label(highlight.x, highlight.y, highlight.kind === 'herb' ? 28 : 50, highlight.name, 1);
    for (const p of POIS) {
      if (!p.verb || highlight?.id === p.id) continue;
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d > 220 || !E.poiVisible(s, p)) continue;
      label(p.x, p.y, 46, E.poiName(s, p), 0.6);
    }
  }

  /** Names of places you have heard of but not been to, written over the clouds. */
  function drawPlaceNames() {
    const f = fogOf(s);
    octx.font = `700 ${Math.round(16 + 6 * zoom)}px ${FONT}`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    for (const [id, n] of Object.entries(NODES)) {
      if (!s.nodes[id]?.known || s.nodes[id]?.visited) continue;
      const [lx, ly] = n.label || n.at || [];
      if (lx === undefined) continue;
      const i = Math.floor(lx / 40);
      const j = Math.floor(ly / 40);
      if (f.bits[j * 130 + i]) continue;
      const [sx, sy] = worldToScreen(lx, ly, 70);
      if (sx < -100 || sx > W + 100 || sy < -40 || sy > H + 40) continue;
      octx.fillStyle = 'rgba(80,72,62,0.6)';
      octx.fillText(n.name, sx, sy);
      octx.fillStyle = 'rgba(168,50,42,0.55)';
      octx.fillText('？', sx, sy + 24);
    }
  }

  // ── each frame ──

  function draw(dt, snap = false) {
    const nowSeason = seasonOf(s.day);
    if (nowSeason !== season) season = nowSeason;
    env.u.uTime.value = t;
    env.setLight(s.tod, E.darkness(s.tod), season);
    renderer.setClearColor(env.u.uHaze.value, 1);
    followCamera(dt, snap);
    updateFog();
    terrain.update(focus.x, focus.y, season, dt, snap ? 12 : 1);
    decor.update(season);
    water.update(season);
    standing();
    renderer.render(scene, camera);
    drawOverlay(dt);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    t += dt;
    onFrame?.(dt);
    if (s && (!idle?.() || now - lastDraw > 180)) {
      draw(Math.min(0.2, (now - (lastDraw || now)) / 1000));
      lastDraw = now;
    }
    raf = requestAnimationFrame(frame);
  }

  return {
    is3D: true,
    setState(next) {
      s = next;
      if (s) {
        E.ensureWorld(s);
        lastPos = null;
        fogFor = null;
        if (W > 1) followCamera(0, true);
      }
    },
    resize,
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    redraw() {
      if (s) draw(0, true);
    },
    screenToWorld,
    worldToScreen,
    get zoom() {
      return zoom;
    },
    setZoom(z) {
      zoom = Math.max(ZMIN, Math.min(ZMAX, z));
    },
    setHighlight(tg) {
      highlight = tg;
    },
    markTap(x, y) {
      tapMark = { x, y, t };
    },
    snap() {
      if (s) followCamera(0, true);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      terrain.dispose();
      decor.dispose();
      buildings.dispose();
      water.dispose();
      clouds.dispose();
      cards.dispose();
      renderer.dispose();
      overlay.remove();
    },
  };
}
