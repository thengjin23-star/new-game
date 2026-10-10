// The world in three dimensions: the same painted land, now with height.
// Mountains stand, valleys sink, water lies in its bed, buildings have
// walls and roofs, and the people and trees are painted cards standing on
// the ground. The camera follows you from above and a little behind.
// It offers the same controls as the flat map (worldview.js), which stays
// as the fallback where WebGL is not to be had.

import * as THREE from './gl/three.js';
import { WORLD_W, WORLD_H } from '../world/geo.js';
import { world, hash2 } from '../world/terrain.js';
import { POIS, STRUCTURES } from '../world/places.js';
import { VALLEY, LAKES } from '../world/geo.js';
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
import { createGlows } from './gl/glows.js';
import { drawPerson, drawMob, aura, LOOKS, FOLK_LOOKS, FIGURE } from './figures.js';
import { propSprite, SPRITE } from './sprites.js';
import { makeParticles, drawParticles } from './ink.js';
import { seasonOf } from '../core/calendar.js';
import { asset } from './assets.js';
import { drawActor, drawPose, poseOf, lookOf, drawSpeech, LIVE_PROPS } from './scenery.js';
import { fighters, paintFighter, drawFightMarks } from './battlefx.js';
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

export function createWorld3D(canvas, { onFrame, idle, quality = 'high', onSlow = null, fight = null } = {}) {
  // at high pixel densities the pixels are small enough without multisampling
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 1.8, powerPreference: 'high-performance' });
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
  if (quality === 'low') clouds.group.children.forEach((m, n) => (m.visible = n === 0));
  const cards = createCards(env, renderer, { size: 2048, rows: 8, slot: 128, res: 2, max: 128 });
  scene.add(cards.mesh, cards.ghost);
  const glows = createGlows();
  scene.add(glows.lights.mesh, glows.mists.mesh, glows.shadows.mesh);
  const mood = { tint: [0, 0, 0], amount: 0, dim: 1 };

  // when the phone takes the GPU away and gives it back, the cards are painted again
  canvas.addEventListener('webglcontextrestored', () => cards.reset());
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

  let q = quality;
  let slowT = 0;
  let frameEMA = 16;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = q === 'low' ? 1 : Math.min(2, window.devicePixelRatio || 1);
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

  // in a fight the camera comes in close over the field, and goes back after
  let field = null;
  let fightList = null;
  let zoomBefore = null;

  function followFight(dt, snap) {
    const list = fightList || [];
    const live = list.filter((f) => !f.fallen);
    const pts = live.length ? live : list;
    if (!pts.length) return false;
    const tx = pts.reduce((a, f) => a + f.x, 0) / pts.length;
    const ty = pts.reduce((a, f) => a + f.y, 0) / pts.length + 10;
    if (zoomBefore === null) zoomBefore = zoom;
    zoom += (1.42 - zoom) * (snap ? 1 : 1 - Math.exp(-dt * 3));
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    focus.x += (tx - focus.x) * k;
    focus.y += (ty - focus.y) * k;
    focus.h += (heightAt(tx, ty) - focus.h) * k;
    placeCamera();
    return true;
  }

  function followCamera(dt, snap) {
    const w = s.world;
    if (s.battle && fightList && followFight(dt, snap)) return;
    if (zoomBefore !== null) {
      zoom = zoomBefore;
      zoomBefore = null;
    }
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

  /** A finished picture for a card's slot, drawn with its foot at the bottom middle. */
  function picture(key, tall) {
    const img = asset(`card/${key}`);
    if (!img) return null;
    const h = tall;
    const w = (img.naturalWidth / img.naturalHeight) * h;
    return (c) => c.drawImage(img, -w / 2, -h, w, h);
  }

  function standing() {
    cards.begin();
    const sh = glows.shadows;
    sh.begin();
    const foot = (x, y, r, a = 0.3) => sh.add(x, heightAt(x, y) + 0.6, y, r, 0.1, 0.09, 0.08, a);
    const w = s.world;
    const near = (x, y, r = 900) => Math.abs(x - focus.x) < r && y > focus.y - 1500 && y < focus.y + 700;
    FIGURE.shadows = false;
    SPRITE.shadows = false;
    for (const p of POIS) {
      if (!near(p.x, p.y) || !E.poiVisible(s, p)) continue;
      const kind = p.spriteIf ? (p.spriteIf(s) ? p.sprite : null) : p.sprite;
      const sp = kind && propSprite(kind);
      if (sp) {
        // a few things in the world move: a glint on a sword, lightning in a split tree, a girl's tears
        const moving = kind === 'sword_glint' || kind === 'lightning_tree' || kind === 'girl';
        cards.add(`prop:${kind}`, p.x, heightAt(p.x, p.y), p.y, (c) => {
          c.drawImage(sp.c, -sp.fx, -sp.fy, sp.w, sp.h);
          if (kind === 'sword_glint') sparkle(c, 1, -22, 1);
          if (kind === 'lightning_tree' && Math.sin(t * 3 + p.x) > 0.7) {
            c.strokeStyle = 'rgba(150,190,255,0.9)';
            c.lineWidth = 0.9;
            c.beginPath();
            c.moveTo(-2, -40);
            c.lineTo(3, -30);
            c.lineTo(-1, -22);
            c.stroke();
          }
          if (kind === 'girl') {
            c.strokeStyle = 'rgba(80,110,160,0.6)';
            c.lineWidth = 0.8;
            c.beginPath();
            c.moveTo(5, -20 + Math.sin(t * 6) * 1.5);
            c.lineTo(9, -23);
            c.stroke();
          }
        }, { animated: moving, fps: 12 });
        foot(p.x, p.y, sp.w * 0.45, 0.24);
      }
      // a crowd, a wedding's lanterns, a camp
      if (p.crowd?.(s)) {
        for (let n = 0; n < 9; n++) {
          const x = p.x + (hash2(n, 2, p.x) - 0.5) * 120;
          const y = p.y + 6 + hash2(n, 1, p.x) * 50;
          cards.add(`crowd:${p.id}:${n}`, x, heightAt(x, y), y, (c) => drawPerson(c, 0, 0, FOLK_LOOKS[n % FOLK_LOOKS.length], { t: t + n, face: x < p.x ? 1 : -1 }), { animated: true, fps: 6 });
          foot(x, y, 8);
        }
      }
      if (p.festive?.(s)) cards.add('festive', p.x, heightAt(p.x, p.y), p.y + 2, festive);
      if (p.camp?.(s)) {
        for (let n = 0; n < 4; n++) {
          const x = p.x + (n - 1.5) * 46 + (hash2(n, 3, 1) - 0.5) * 16;
          const y = p.y + 40 + n * 12;
          if (n % 2) cards.add(`camp:${p.id}:${n}`, x, heightAt(x, y), y, (c) => drawPerson(c, 0, 0, FOLK_LOOKS[4], { t: t + n, face: n < 2 ? 1 : -1 }), { animated: true, fps: 6 });
          else cards.add('camp:tent', x, heightAt(x, y), y, tent);
          foot(x, y, n % 2 ? 8 : 15);
        }
      }
    }
    for (const h of world().herbs) {
      if (!near(h.x, h.y, 600) || !E.herbReady(s, h)) continue;
      const sp = propSprite('herb');
      cards.add('prop:herb', h.x, heightAt(h.x, h.y), h.y, (c) => {
        c.drawImage(sp.c, -sp.fx, -sp.fy, sp.w, sp.h);
        sparkle(c, 0, -13, 0.8 + 0.4 * Math.sin(t * 3));
      }, { animated: true, fps: 10 });
    }
    const night = E.isNight(s);
    const inFight = new Set((s.battle?.units || []).map((u) => u.npcId).filter(Boolean));
    for (const n of E.peopleInWorld(s)) {
      if (!near(n.x, n.y) || inFight.has(n.id)) continue;
      const dn = Math.hypot(n.x - w.x, n.y - w.y);
      // at home: they come to the door when you are close
      if (n.inside && dn > E.DOOR) continue;
      const look = LOOKS[n.id] || LOOKS.stranger;
      const pose = poseOf(n, night);
      // busy with something, they face their work; otherwise they turn to you
      const face = n.moving || n.fixed ? n.face : dn < 260 || n.face === undefined ? (n.x > w.x ? -1 : 1) : n.face;
      const pic = pose === 'stand' && !n.moving && picture(`npc:${n.id}`, look.big ? 58 : 50);
      cards.add(`npc:${n.id}`, n.x, heightAt(n.x, n.y), n.y, pic || ((c) => drawPose(c, look, pose, { t: t + n.x * 0.01, face, moving: n.moving })), { animated: !pic, fps: n.moving ? 24 : 8 });
      foot(n.x, n.y, look.big ? 11 : pose === 'sit' || pose === 'fish' ? 11 : 9);
    }
    for (const fk of E.folkInWorld(s)) {
      if (!near(fk.x, fk.y)) continue;
      const pose = poseOf(fk, night);
      const pic = pose === 'stand' && picture(`folk:${fk.look}`, 48);
      cards.add(`folk:${fk.id}`, fk.x, heightAt(fk.x, fk.y), fk.y, pic || ((c) => drawPose(c, lookOf(fk.look), pose, { t: t + fk.line + fk.x * 0.01, moving: fk.moving, face: fk.face })), { animated: !pic, fps: fk.moving ? 24 : 8 });
      foot(fk.x, fk.y, pose === 'sit' ? 11 : 8.5);
    }
    for (const m of E.mobsInWorld(s)) {
      const alpha = 1 - (m.fade || 0);
      m.members.forEach((b, i) => {
        if (!near(b.x, b.y)) return;
        const pic = picture(`mob:${m.def.kind}`, m.def.kind === 'wolf' ? 26 : 44);
        cards.add(`mob:${m.def.id}:${i}`, b.x, heightAt(b.x, b.y), b.y, pic || ((c) => drawMob(c, m.def.kind, 0, 0, { t: t + b.x * 0.01, moving: b.moving, face: b.face })), { animated: !pic, fps: b.moving ? 24 : 8, alpha });
        if (m.def.kind !== 'ghost') foot(b.x, b.y, 12, 0.3 * alpha);
      });
    }
    // the small lives of the wild: grazing, hopping, taking wing
    for (const c of E.wildInWorld(s)) {
      if (!near(c.x, c.y)) continue;
      const alpha = 1 - c.fade;
      cards.add(`wild:${c.id}`, c.x, heightAt(c.x, c.y) + c.fly * 46, c.y, (cx) => drawActor(cx, { a: 'beast', beast: c.kind, face: c.face, moving: c.moving, fly: c.fly, n: c.seed }, { t }), { animated: true, fps: c.moving || c.fly ? 20 : 6, alpha });
      if (!c.fly) foot(c.x, c.y, c.kind === 'deer' || c.kind === 'spirit_deer' ? 11 : 6, 0.24 * alpha);
    }
    // scenes out in the world: who and what is there
    for (const sc of E.scenesInWorld(s)) {
      if (!near(sc.x, sc.y)) continue;
      const alpha = Math.max(0, 1 - sc.fade);
      for (const ac of sc.actors) {
        // a scene that came to blows: its people are in the fight
        if (s.battle && sc.state === 'met' && ac.a !== 'prop') continue;
        const still = ac.a === 'prop' && !LIVE_PROPS.has(ac.prop);
        cards.add(`scene:${sc.uid}:${ac.n}`, ac.x, heightAt(ac.x, ac.y), ac.y, (c) => drawActor(c, ac, { t }), { animated: !still, fps: ac.moving ? 24 : 8, alpha, ghost: sc.inWoods && (!still || ac.prop === 'ginseng') });
        if (!still || ac.prop === 'mule' || ac.prop === 'crates') foot(ac.x, ac.y, ac.pose === 'lie' ? 15 : ac.prop === 'mule' ? 13 : 9, 0.28 * alpha);
      }
    }
    if (fightList) {
      for (const f of fightList) {
        cards.add(`fight:${f.u.id}`, f.x, heightAt(f.x, f.y), f.y, (c) => paintFighter(c, f, { t }), { animated: true, fps: 30, ghost: f.u.side === 'me' });
        if (!f.fallen) foot(f.x, f.y, f.big ? 16 : 10, 0.3);
      }
      sh.end();
      FIGURE.shadows = true;
      SPRITE.shadows = true;
      cards.end();
      return;
    }
    const sit = !!s.secl;
    const moving = E.liveOf(s).moving;
    const me = !sit && picture('player', 50);
    cards.add('player', w.x, heightAt(w.x, w.y), w.y, (c) => {
      if (sit) aura(c, 0, 0, t, 1);
      if (me) me(c);
      else drawPerson(c, 0, 0, LOOKS.player, { t, moving, face: w.face || 1, sit });
    }, { animated: true, fps: moving || sit ? 30 : 10, ghost: true });
    foot(w.x, w.y, sit ? 13 : 9.5, 0.34);
    sh.end();
    FIGURE.shadows = true;
    SPRITE.shadows = true;
    cards.end();
  }

  // ── light after dark, and the mists ──

  /** Doors whose lamps are lit at night: how many lights, by kind of building. */
  const LIT = { mansion: 2, teahouse: 2, auction: 3, shop: 1, house: 1, farmhouse: 1, hall: 1, bighall: 2, tower: 1, teashed: 1, hut: 1, pavilion: 1 };

  function lightsAndMists() {
    const dark = E.darkness(s.tod);
    const L = glows.lights;
    const M = glows.mists;
    L.begin();
    M.begin();
    const bits = fogOf(s).bits;
    const near = (x, y, r = 1300) => Math.abs(x - focus.x) < r && y > focus.y - 1700 && y < focus.y + 800 && !!bits[Math.floor(y / 40) * 130 + Math.floor(x / 40)];
    if (dark > 0.04) {
      for (const st of STRUCTURES) {
        const lit = LIT[st.sprite];
        if (!lit || !near(st.x, st.y)) continue;
        const g = heightAt(st.x, st.y);
        const fz = st.y + st.h / 2 + 3;
        L.add(st.x, g + 9, fz, 18 + st.w * 0.12, 1, 0.62, 0.3, 0.5 * dark);
        if (lit > 1) for (const k of [-1, 1]) L.add(st.x + k * st.w * 0.28, g + 16, fz + 2, 12, 1, 0.5, 0.24, 0.55 * dark);
      }
      for (const st of STRUCTURES) if (st.sprite === 'tent' && near(st.x, st.y)) L.add(st.x - st.w / 2 - 14, heightAt(st.x, st.y) + 4, st.y + st.h / 2 + 4, 34, 1, 0.55, 0.25, 0.7 * dark);
      // your own small light, warmer as your cultivation deepens
      const w = s.world;
      L.add(w.x, heightAt(w.x, w.y) + 14, w.y, 70 + 10 * Math.min(4, s.player.realm), 1, 0.86, 0.66, 0.2 * dark);
    }
    for (const p of POIS) {
      if (!near(p.x, p.y) || !E.poiVisible(s, p)) continue;
      const g = heightAt(p.x, p.y);
      if (p.glow?.(s)) {
        const c = p.region === 'fox_shrine' ? [0.45, 0.65, 1] : p.region === 'ancient_ruins' ? [0.62, 0.5, 1] : [0.95, 0.92, 0.75];
        L.add(p.x, g + 16 + Math.sin(t * 2 + p.x) * 2, p.y, 42, ...c, 0.2 + 0.45 * dark);
      }
      if (p.camp?.(s) && dark > 0.04) L.add(p.x, g + 6, p.y + 50, 46, 1, 0.55, 0.25, 0.7 * dark);
      if (p.zone) {
        for (let k = 0; k < 5; k++) {
          const a = t * 0.2 + k * 1.3;
          M.add(p.x + Math.cos(a) * p.zone * 0.35, g + 18, p.y + Math.sin(a * 0.8) * p.zone * 0.2, p.zone * 0.8, 0.5, 0.36, 0.6, 0.26);
        }
      }
    }
    for (const h of world().herbs) {
      if (!near(h.x, h.y, 700) || !E.herbReady(s, h)) continue;
      L.add(h.x, heightAt(h.x, h.y) + 12, h.y, 9 + 2 * Math.sin(t * 3 + h.id), 0.85, 1, 0.85, 0.25 + 0.35 * dark);
    }
    // lamps carried at night: the watchman's, and whoever comes to the door
    if (dark > 0.04) {
      const w = s.world;
      for (const fk of E.folkInWorld(s)) {
        if (fk.act === 'gong' && near(fk.x, fk.y)) L.add(fk.x + fk.face * 12, heightAt(fk.x, fk.y) + 14, fk.y, 32 + Math.sin(t * 4) * 2, 1, 0.62, 0.3, 0.75 * dark);
      }
      for (const n of E.peopleInWorld(s)) {
        if (!n.inside || Math.hypot(n.x - w.x, n.y - w.y) > E.DOOR) continue;
        L.add(n.x + (n.x > w.x ? -12 : 12), heightAt(n.x, n.y) + 14, n.y, 30, 1, 0.62, 0.3, 0.7 * dark);
      }
    }
    for (const c of E.wildInWorld(s)) {
      if (!near(c.x, c.y)) continue;
      const a = 1 - c.fade;
      if (c.kind === 'spirit_deer') L.add(c.x, heightAt(c.x, c.y) + 16, c.y, 34 + Math.sin(t * 2 + c.seed) * 3, 0.75, 1, 0.9, (0.3 + 0.35 * dark) * a);
      if (c.kind === 'fox') L.add(c.x + c.face * 13, heightAt(c.x, c.y) + 4, c.y, 24 + Math.sin(t * 5 + c.seed) * 3, 0.45, 0.7, 1, (0.4 + 0.4 * dark) * a);
    }
    // a scene's own light: a fire, a ginseng's glow, a fox's blue lantern
    for (const sc of E.scenesInWorld(s)) {
      if (!near(sc.x, sc.y)) continue;
      const a = Math.max(0, 1 - sc.fade);
      for (const ac of sc.actors) {
        const g = heightAt(ac.x, ac.y);
        if (ac.prop === 'campfire') L.add(ac.x, g + 6, ac.y, 40 + Math.sin(t * 9) * 3, 1, 0.55, 0.22, (0.35 + 0.5 * dark) * a);
        if (ac.prop === 'ginseng') L.add(ac.x, g + 8, ac.y, 22, 1, 0.55, 0.5, (0.25 + 0.3 * dark) * a);
        if (ac.beast === 'fox') L.add(ac.x + (ac.face || 1) * 13, g + 4, ac.y, 26 + Math.sin(t * 5) * 3, 0.45, 0.7, 1, (0.5 + 0.4 * dark) * a);
        if (ac.beast === 'spirit_deer') L.add(ac.x, g + 16, ac.y, 34 + Math.sin(t * 2) * 3, 0.75, 1, 0.9, (0.3 + 0.35 * dark) * a);
        if (ac.prop === 'wisp') L.add(ac.x, g + 16, ac.y, 30 + Math.sin(t * 3 + ac.n) * 4, 0.5, 1, 0.75, (0.45 + 0.4 * dark) * a);
      }
    }
    // the spirit mist that lies in 靈溪谷, morning mist on the lake
    if (Math.hypot(focus.x - VALLEY.cx, focus.y - VALLEY.cy) < 1500) {
      for (let k = 0; k < 14; k++) {
        const a = hash2(k, 3, 41) * Math.PI * 2;
        const r = Math.sqrt(hash2(k, 4, 41)) * 0.8;
        const x = VALLEY.cx + Math.cos(a) * VALLEY.rx * r + Math.sin(t * 0.07 + k) * 30;
        const y = VALLEY.cy + Math.sin(a) * VALLEY.ry * r;
        M.add(x, heightAt(x, y) + 20, y, 130, 0.82, 0.95, 0.92, 0.2);
      }
    }
    const morning = s.tod >= 4.5 && s.tod < 9.5 ? Math.sin(((s.tod - 4.5) / 5) * Math.PI) : 0;
    if (morning > 0.02) {
      const [cx, cy, rx, ry] = LAKES[0];
      if (near(cx, cy, 1600)) {
        for (let k = 0; k < 12; k++) {
          const x = cx + (hash2(k, 5, 42) - 0.5) * rx * 1.8 + Math.sin(t * 0.05 + k) * 40;
          const y = cy + (hash2(k, 6, 42) - 0.5) * ry * 1.6;
          M.add(x, 14, y, 150, 0.95, 0.95, 0.93, 0.3 * morning);
        }
      }
    }
    L.end();
    M.end();
  }

  /** Each region has its own air: the valley breathes spirit, the forest broods, the ruins are dusty. */
  const MOODS = {
    lingxi_valley: { tint: [0.8, 0.93, 0.9], amount: 0.38, dim: 1, motes: 'mote' },
    black_forest: { tint: [0.5, 0.58, 0.52], amount: 0.42, dim: 0.86, motes: 'darkleaf' },
    ancient_ruins: { tint: [0.86, 0.74, 0.6], amount: 0.36, dim: 0.95, motes: 'ash' },
    qingyun_sect: { tint: [0.9, 0.94, 0.99], amount: 0.3, dim: 1.02, motes: null },
    mirror_lake: { tint: [0.82, 0.88, 0.93], amount: 0.3, dim: 1, motes: null },
    fox_shrine: { tint: [0.86, 0.82, 0.9], amount: 0.26, dim: 0.96, motes: null },
    hidden_cave: { tint: [0.6, 0.62, 0.66], amount: 0.3, dim: 0.9, motes: null },
  };

  function regionMood(dt) {
    const m = MOODS[s.player.loc] || { tint: [0, 0, 0], amount: 0, dim: 1 };
    const k = Math.min(1, dt * 0.8);
    for (let i = 0; i < 3; i++) mood.tint[i] += ((m.amount ? m.tint[i] : mood.tint[i]) - mood.tint[i]) * k;
    mood.amount += (m.amount - mood.amount) * k;
    mood.dim += (m.dim - mood.dim) * k;
    const hz = env.u.uHaze.value;
    hz.setRGB(hz.r + (mood.tint[0] - hz.r) * mood.amount, hz.g + (mood.tint[1] - hz.g) * mood.amount, hz.b + (mood.tint[2] - hz.b) * mood.amount);
    env.u.uAmbient.value.multiplyScalar(mood.dim);
    return m.motes;
  }

  function sparkle(c, x, y, a) {
    const r = 3 + Math.sin(t * 5 + x) * 1;
    c.strokeStyle = `rgba(255,248,210,${0.9 * a})`;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(x - r, y);
    c.lineTo(x + r, y);
    c.moveTo(x, y - r);
    c.lineTo(x, y + r);
    c.stroke();
  }

  function festive(c) {
    for (const dx of [-26, 26]) {
      c.strokeStyle = 'rgba(36,33,30,0.6)';
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(dx, -30);
      c.lineTo(dx, -22);
      c.stroke();
      c.fillStyle = 'rgba(190,40,34,0.95)';
      c.beginPath();
      c.ellipse(dx, -18, 3.4, 4.2, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(190,40,34,0.9)';
    c.fillRect(-7, -34, 14, 10);
    c.fillStyle = 'rgba(240,210,120,1)';
    c.font = `700 8px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('囍', 0, -29);
  }

  function tent(c) {
    c.fillStyle = 'rgba(120,100,80,0.95)';
    c.beginPath();
    c.moveTo(-14, 0);
    c.lineTo(0, -18);
    c.lineTo(14, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(36,33,30,0.7)';
    c.lineWidth = 0.8;
    c.stroke();
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

  let motes = null;

  function drawOverlay(dt) {
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    const w = s.world;
    if (fightList) {
      drawFightMarks(octx, worldToScreen, 1, s, fight(), fightList, t, FONT);
      paperAndWeather(dt);
      return;
    }
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
    // a beast that has seen you
    octx.font = `700 13px ${FONT}`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = 'rgba(168,50,42,0.92)';
    for (const m of E.mobsInWorld(s)) {
      if (m.state !== 'chase') continue;
      for (const b of m.members) {
        const [bx, by] = worldToScreen(b.x, b.y, 38);
        if (bx > -20 && bx < W + 20 && by > -20 && by < H + 20) octx.fillText('！', bx, by);
      }
    }
    drawLabels();
    drawSceneBubbles();
    drawSpeechBubbles();
    drawBeastMarks();
    drawPlaceNames();
    paperAndWeather(dt);
  }

  function paperAndWeather(dt) {
    // weather and paper; a region's own motes over the season's
    const dark = E.darkness(s.tod);
    const fireflies = dark > 0.6 && (season === 'summer' || season === 'spring') && !['qingshi_town', 'luoxia_market', 'qingyun_sect'].includes(s.player.loc);
    const kind = motes || (fireflies ? 'firefly' : { spring: 'petal', summer: 'seed', autumn: 'leaf', winter: 'snow' }[season]);
    if (!reduce) {
      if (particleKind !== kind) {
        particleKind = kind;
        particles = makeParticles(kind, stream(5), W, H, kind === 'snow' ? 60 : kind === 'seed' ? 10 : kind === 'mote' ? 26 : kind === 'firefly' ? 18 : 22);
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
      if (n.inside && d > E.DOOR) continue;
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

  /** Over beasts that have seen you: a question; over those coming for you: a cry. */
  function drawBeastMarks() {
    for (const m of E.mobsInWorld(s)) {
      if (!m.alert && m.state !== 'chase') continue;
      const mark = m.state === 'chase' ? '！' : '？';
      for (const b of m.members) {
        const [sx, sy] = worldToScreen(b.x, b.y, m.def.kind === 'wolf' ? 30 : 46);
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
        octx.font = `700 15px ${FONT}`;
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.lineWidth = 3;
        octx.strokeStyle = 'rgba(250,246,236,0.85)';
        octx.strokeText(mark, sx, sy);
        octx.fillStyle = mark === '！' ? 'rgba(168,50,42,0.95)' : 'rgba(35,32,27,0.85)';
        octx.fillText(mark, sx, sy);
      }
    }
  }

  /** What people are saying as you pass. */
  function drawSpeechBubbles() {
    const w = s.world;
    const said = [];
    for (const n of E.peopleInWorld(s)) if (n.say && !(n.inside && Math.hypot(n.x - w.x, n.y - w.y) > E.DOOR)) said.push([n.x, n.y, n.say]);
    for (const fk of E.folkInWorld(s)) {
      const say = E.sayingOf(s, fk);
      if (say) said.push([fk.x, fk.y, say]);
    }
    for (const [x, y, text] of said) {
      const [sx, sy] = worldToScreen(x, y, 64);
      if (sx < -90 || sx > W + 90 || sy < -10 || sy > H + 60) continue;
      drawSpeech(octx, sx, sy, text, { font: FONT, size: 11 });
    }
  }

  /** Over a scene that waits for you: a little bubble, so you notice it from afar. */
  function drawSceneBubbles() {
    const w = s.world;
    for (const sc of E.scenesInWorld(s)) {
      if (sc.state !== 'idle') continue;
      const d = Math.hypot(sc.x - w.x, sc.y - w.y);
      const lead = sc.actors.find((a) => a.a !== 'prop') || sc.actors[0];
      // close enough to read what it is: its name; further off, only that something is there
      const named = d < 230 && sc.def.start === 'touch';
      if (named) label(lead.x, lead.y, 46, sc.def.name, 0.75);
      if (!sc.def.bubble || named || d > 520 || d < 70) continue;
      const [bx, by0] = worldToScreen(lead.x, lead.y, 50);
      const by = by0 + Math.sin(t * 3 + sc.uid) * 2;
      if (bx < -20 || bx > W + 20 || by < -20 || by > H + 20) continue;
      octx.fillStyle = 'rgba(250,246,236,0.95)';
      octx.strokeStyle = 'rgba(35,32,27,0.55)';
      octx.lineWidth = 1;
      octx.beginPath();
      octx.ellipse(bx, by, 11, 9, 0, 0, Math.PI * 2);
      octx.moveTo(bx - 3, by + 8);
      octx.lineTo(bx, by + 14);
      octx.lineTo(bx + 3, by + 8);
      octx.fill();
      octx.stroke();
      octx.font = `700 12px ${FONT}`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillStyle = sc.def.bubble === '！' ? 'rgba(168,50,42,0.95)' : 'rgba(35,32,27,0.9)';
      octx.fillText(sc.def.bubble, bx, by + 0.5);
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
    motes = regionMood(dt);
    renderer.setClearColor(env.u.uHaze.value, 1);
    const fx = s.battle && fight?.();
    field = fx ? E.battleField(s) : null;
    fightList = field ? fighters(s, fx, field) : null;
    // the fight's ground: trees on it stand back
    if (fightList?.length) {
      const cx = fightList.reduce((a, f) => a + f.x, 0) / fightList.length;
      const cy = fightList.reduce((a, f) => a + f.y, 0) / fightList.length;
      // reaching toward the eye: a tree just in front can hide a fighter with its crown
      const r = Math.max(...fightList.map((f) => Math.hypot(f.x - cx, f.y - cy))) + 110;
      env.u.uClear.value.set(cx, cy + 55, r);
    } else env.u.uClear.value.set(0, 0, 0);
    followCamera(dt, snap);
    updateFog();
    terrain.update(focus.x, focus.y, season, dt, snap ? 12 : 1);
    decor.update(season);
    water.update(season);
    standing();
    lightsAndMists();
    renderer.render(scene, camera);
    drawOverlay(dt);
  }

  function applyQuality() {
    // the lighter picture: fewer pixels, one layer of cloud
    clouds.group.children.forEach((m, n) => (m.visible = q === 'high' || n === 0));
    resize();
  }

  function frame(now) {
    if (!running) return;
    const raw = (now - (last || now)) / 1000;
    const dt = Math.min(0.1, raw);
    last = now;
    // watch for a device that cannot keep up, and lighten the load once
    if (raw > 0 && raw < 1 && !idle?.() && t > 6) {
      frameEMA += (raw * 1000 - frameEMA) * 0.05;
      slowT = frameEMA > 40 ? slowT + raw : 0;
      if (slowT > 4 && q === 'high' && onSlow) {
        q = 'low';
        applyQuality();
        onSlow();
        onSlow = null;
      }
    }
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
    setQuality(next) {
      q = next;
      onSlow = null;
      applyQuality();
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
      glows.lights.dispose();
      glows.mists.dispose();
      glows.shadows.dispose();
      renderer.dispose();
      overlay.remove();
    },
  };
}
