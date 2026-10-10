import { h, paragraphs, clear, put } from './dom.js';
import { createScene } from '../art/ink.js';
import { createWorldView, paintWorldThumb } from '../art/worldview.js';
import { createWorld3D, canDraw3D } from '../art/world3d.js';
import { loadAssets, asset } from '../art/assets.js';
import { newGame, rollFate, ORIGINS, ATTRS, attrWord } from '../core/state.js';
import { startEvent, choose, continueEvent, finishFight } from '../core/events.js';
import * as B from '../core/battle.js';
import { createFightPlayer } from '../art/fightplayer.js';
import * as A from '../core/actions.js';
import * as E from '../world/explore.js';
import { ROOTS, INJURY, BUFFS, realmLabel, stageReq, age, lifespan, rateParts, breakthroughInfo, power, atBottleneck, techOf } from '../core/cultivation.js';
import { fmtDate, fmtDuration, seasonOf, SEASON_NAME } from '../core/calendar.js';
import { NODES, canSecludeAt, nodeQi } from '../world/map.js';
import { WORLD_W, WORLD_H, COLS, ROWS } from '../world/geo.js';
import { findPath, regionIdAt, world } from '../world/terrain.js';
import { heights } from '../world/height.js';
import { POIS } from '../world/places.js';
import { fogOf, isRevealed, exploredPct } from '../world/fog.js';
import { ITEMS, displayItem } from '../content/items.js';
import { TECHS } from '../content/techniques.js';
import { FRAGMENTS, FRAGMENT_TOTAL } from '../content/fragments.js';
import { SYS_LEVELS, SYS_FEATURES } from '../world/system.js';
import { npcAge, npcRealm, NAMED } from '../world/npcs.js';
import { saveGame, loadGame, clearGame, exportCode, importCode, migrate, saveMeta, loadMeta, parseSave } from '../core/save.js';
import { connectCloud } from '../platform/cloud.js';

const VERSION = '0.5';
const ITEM_ORDER = ['pill', 'herb', 'material', 'book', 'weapon', 'treasure', 'talisman', 'token', 'unknown'];
const ITEM_KIND = { pill: '丹藥', herb: '靈草', material: '材料', book: '典籍', weapon: '兵器', treasure: '寶物', talisman: '符籙', token: '信物', unknown: '未知' };
const DOCK = [
  ['map', '地圖'],
  ['bag', '行囊'],
  ['cult', '修煉'],
  ['log', '見聞'],
  ['sys', '系統'],
];

function favorWord(f) {
  if (f <= -60) return '仇敵';
  if (f <= -20) return '交惡';
  if (f < 0) return '冷淡';
  if (f < 15) return '尋常';
  if (f < 35) return '友善';
  if (f < 60) return '交好';
  return '莫逆';
}

function realTime(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return '不到一分鐘';
  if (m < 60) return `約 ${m} 分鐘`;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `約 ${hh} 小時 ${mm} 分` : `約 ${hh} 小時`;
}

function seal(text, cls = '') {
  return h('span.seal' + (cls ? '.' + cls : ''), text);
}

function bar(value, max, cls = '') {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return h('div.bar' + (cls ? '.' + cls : ''), h('i', { style: { width: pct + '%' } }));
}

function chipList(chips) {
  if (!chips?.length) return null;
  return h('div.chips', chips.map((c) => h('span.chip.' + (c.tone || 'neutral'), c.text)));
}

function systemLines(toasts) {
  if (!toasts?.length) return null;
  return h('div.sysmsg', toasts.map((t) => h('p', t)));
}

/** 時辰 and the hour in words. */
function timeWord(s) {
  const t = s.tod ?? 8;
  const word = t < 5 ? '深夜' : t < 7 ? '黎明' : t < 11 ? '上午' : t < 13 ? '正午' : t < 17 ? '下午' : t < 19.5 ? '黃昏' : '夜裡';
  return `${E.shichen(t)}・${word}`;
}

export function startApp(root, { speed = 1, view = null } = {}) {
  loadAssets();
  const ui = {
    s: null,
    sheet: null, // map | bag | cult | log | sys | rest | shop
    logTab: 'rumors',
    pills: 0,
    panel: null,
    create: null,
    view: null,
    titleScene: null,
    timer: 0,
    cloud: null,
    joy: null,
    keys: new Set(),
    caption: null,
    layerKey: null,
    hudKeys: {},
    hudT: 0,
    saveT: 0,
    moved: false,
    bannerT: null,
    target: null,
    thumb: null,
    thumbSeason: null,
    map: null,
    shell: null,
    fight: null, // the fight as it is being shown
    fightKey: null,
    fightMenu: null, // 'skills' | 'items'
    fightAim: null, // an action waiting for you to pick who
    fightEndT: null,
  };

  // ── persistence ──
  function persist({ now = false } = {}) {
    if (!ui.s) return;
    const json = saveGame(ui.s);
    ui.cloud?.save(json, ui.s.savedAt, { now });
  }

  function forgetSave() {
    clearGame();
    ui.cloud?.clear();
  }

  function storeMeta(meta) {
    saveMeta(meta);
    ui.cloud?.saveMeta(meta);
  }

  /** When running as a claude.ai page, sync with the player's cloud save. */
  async function syncCloud() {
    const cloud = await connectCloud();
    if (!cloud) return;
    ui.cloud = cloud;
    const remote = await cloud.load();
    const localSaved = ui.s?.savedAt || loadGame()?.savedAt || 0;
    if (remote && remote.savedAt > localSaved) {
      const s = parseSave(remote.json);
      if (s) {
        if (ui.s) {
          adopt(s);
          if (s.secl) A.tickSeclusion(s, Date.now());
          persist();
        } else saveGame(s);
        if (!ui.create) render();
      }
    } else if (ui.s) persist({ now: true });
    const rmeta = await cloud.loadMeta();
    const lmeta = loadMeta();
    if (rmeta && (rmeta.past?.length || 0) > (lmeta?.past?.length || 0)) saveMeta(rmeta);
    else if (lmeta) cloud.saveMeta(lmeta);
  }

  /** Take a save as the one being played. */
  function adopt(s) {
    E.ensureWorld(s);
    ui.s = s;
    ui.layerKey = null;
    ui.hudKeys = {};
    ui.view?.setState(s);
  }

  /** Do something to the save, then save and redraw. */
  function act(fn) {
    if (!ui.s) return;
    fn(ui.s);
    if (!ui.s.pending && !ui.s.dead && E.canResume(ui.s)) E.resume(ui.s);
    persist();
    render();
  }

  // ── boot ──
  function boot() {
    const s = loadGame();
    if (s) {
      adopt(s);
      if (s.secl) A.tickSeclusion(s, Date.now());
      persist();
    }
    render();
    syncCloud();
    clearInterval(ui.timer);
    ui.timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        tick();
        ui.view?.start();
        render();
      } else {
        persist({ now: true });
        ui.view?.stop();
      }
    });
    window.addEventListener('resize', () => {
      ui.view?.resize();
      ui.titleScene?.resize();
      if (ui.sheet === 'map') renderLayer();
    });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', (e) => ui.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => ui.keys.clear());
  }

  function tick() {
    const s = ui.s;
    if (!s?.secl) return;
    const ended = A.tickSeclusion(s, Date.now());
    if (ended) {
      persist();
      render();
    } else {
      updateSecl();
      // keep the save current through a long seclusion, about once a game month
      if (s.secl.done - (ui.seclSaved ?? 0) >= 30 || s.secl.done < (ui.seclSaved ?? 0)) {
        ui.seclSaved = s.secl.done;
        persist();
      }
    }
  }

  // ── top-level render ──
  function render() {
    if (!ui.s) return ui.create ? renderCreate() : renderTitle();
    renderGame();
  }

  // ── title ──
  function renderTitle() {
    stopWorld();
    clear(root);
    const canvas = h('canvas.title-bg', { 'aria-hidden': 'true' });
    const hasSave = !!loadGame();
    const meta = loadMeta();
    root.appendChild(
      h('div.title-screen', canvas,
        h('div.title-inner',
          h('h1.game-title', '一介散修'),
          h('p.tagline', '天道為眾生寫好了命。', h('br'), '只有你，不在命簿上。'),
          h('div.title-actions',
            hasSave ? h('button.btn.primary', { onclick: () => { adopt(loadGame()); render(); } }, '繼續修行') : null,
            h('button.btn' + (hasSave ? '' : '.primary'), { onclick: () => beginCreate(meta) }, hasSave ? '開始新的一生' : '踏入仙途'),
            h('button.btn.ghost', { onclick: () => { ui.panel = 'import-title'; renderTitle(); } }, '匯入存檔'),
          ),
          ui.panel === 'import-title' ? importBox(() => { ui.panel = null; }) : null,
          meta?.past?.length ? h('p.past-lives', `前世 ${meta.past.length} 次。系統記得你。`) : null,
          h('p.version', `試玩版 ${VERSION} ・ 第一章「東荒」`),
        ),
      ),
    );
    ui.titleScene?.stop();
    ui.titleScene = createScene(canvas);
    prepareWorld();
    requestAnimationFrame(() => {
      ui.titleScene.set({ kind: 'mountain', seed: 3012, season: seasonOf(new Date().getMonth() * 30), pose: 'stand' });
      ui.titleScene.start();
    });
  }

  function stopWorld() {
    ui.view?.stop();
    ui.view?.destroy?.();
    ui.view = null;
    ui.shell = null;
  }

  // ── character creation ──
  function beginCreate(meta) {
    const seed = (crypto.getRandomValues(new Uint32Array(1))[0] | 0) || 1;
    ui.create = { name: randomName(), gender: '男', origin: 'farmer', seed, rerolls: 3, meta: meta || null };
    ui.panel = null;
    render();
  }

  function randomName() {
    const sur = '林陳李張王劉楊趙黃周吳徐孫胡朱高何郭馬羅梁宋鄭謝韓唐許沈葉蘇';
    const giv = ['青', '遠', '塵', '舟', '寧', '川', '默', '安', '秋', '白', '言', '晚', '照', '平', '歸', '石', '雨', '溪'];
    const r = () => Math.floor(Math.random() * 1e9);
    const one = giv[r() % giv.length];
    const two = r() % 2 ? giv[r() % giv.length] : '';
    return sur[r() % sur.length] + one + two;
  }

  function renderCreate() {
    ui.titleScene?.stop();
    const c = ui.create;
    const fate = rollFate(c.seed);
    const o = ORIGINS[c.origin];
    const attrs = { ...fate.attrs };
    for (const [k, v] of Object.entries(o.mods)) attrs[k] = Math.max(1, Math.min(10, attrs[k] + v));
    clear(root);
    const nameInput = h('input.name-input', { id: 'name', value: c.name, maxlength: 6, autocomplete: 'off' });
    nameInput.addEventListener('input', () => (c.name = nameInput.value));
    root.appendChild(
      h('div.create',
        h('h2.create-title', '入世'),
        c.meta?.past?.length ? h('p.muted', `第 ${c.meta.past.length + 1} 世。問道系統的記憶仍在。`) : null,
        h('section.create-block',
          h('label.field-label', { for: 'name' }, '姓名'),
          h('div.name-row', nameInput, h('button.btn.small', { onclick: () => { c.name = randomName(); renderCreate(); } }, '隨機')),
          h('div.toggle', ['男', '女'].map((g) => h('button.btn.small' + (c.gender === g ? '.on' : ''), { onclick: () => { c.gender = g; renderCreate(); } }, g))),
        ),
        h('section.create-block',
          h('div.field-label', '出身'),
          h('div.origins', Object.entries(ORIGINS).map(([id, og]) =>
            h('button.origin' + (c.origin === id ? '.on' : ''), { onclick: () => { c.origin = id; renderCreate(); } },
              h('b', og.name), h('span', og.blurb)))),
        ),
        h('section.create-block.fate',
          h('div.field-label', '天命'),
          h('div.attrs', Object.entries(ATTRS).map(([k, label]) =>
            h('div.attr', h('span', label), h('b', attrWord(attrs[k])), h('i', attrs[k])))),
          h('p.root-line', '靈根：', h('b', ROOTS[fate.root.type].name), `（${fate.root.els.join('、')}）`),
          h('p.muted.small', '資質是天定的。可以再看三次，但別抱太大希望——你不是天驕。'),
          h('button.btn.small', { disabled: c.rerolls <= 0, onclick: () => { c.seed = (c.seed * 1103515245 + 12345) | 0; c.rerolls -= 1; renderCreate(); } }, `再觀一次（剩 ${c.rerolls}）`),
        ),
        h('div.create-actions',
          h('button.btn.ghost', { onclick: () => { ui.create = null; render(); } }, '返回'),
          h('button.btn.primary', { onclick: () => startLife(fate) }, '就這樣吧'),
        ),
      ),
    );
  }

  function startLife(fate) {
    const c = ui.create;
    const name = (c.name || '').trim() || randomName();
    const meta = c.meta;
    const s = migrate(newGame({ name, gender: c.gender, origin: c.origin, fate, seed: c.seed, meta: meta ? { sysExp: meta.sysExp, frags: meta.frags, life: meta.past.length, past: meta.past } : null }));
    if (meta?.sysExp) s.sys.bound = false; // re-binds during the opening
    s.world = null;
    E.ensureWorld(s);
    // you wake at the foot of 斷魂崖
    s.world.x = 1360;
    s.world.y = 2740;
    startEvent(s, 'intro_fall');
    ui.create = null;
    adopt(s);
    persist();
    render();
  }

  // ── the world screen ──
  function renderGame() {
    ui.titleScene?.stop();
    ui.titleScene = null;
    if (!ui.shell || !root.contains(ui.shell)) buildShell();
    renderHud(true);
    renderDock();
    renderLayer();
  }

  function buildShell() {
    clear(root);
    const canvas = h('canvas.world-canvas', { 'aria-label': '你所在的世界。按住拖動行走，點一下地面走過去。' });
    const shell = h('div.game.worldmode',
      canvas,
      h('div.hud',
        h('header.hud-top'),
        h('div.hud-row',
          h('button.place-tag', { onclick: showPlaceInfo }),
          h('div.hud-flags'),
        ),
        h('button.minimap-btn', { 'aria-label': '打開地圖', onclick: () => openSheet('map') }, h('canvas.minimap', { width: 192, height: 192 })),
        h('div.toasts', { 'aria-live': 'polite' }),
        h('div.banner'),
      ),
      h('div.joy', { 'aria-hidden': 'true' }, h('i')),
      h('div.walk-hint', h('span', '按住畫面拖動：往那裡走'), h('span', '點地面：自己走過去'), h('span', '點人或東西：走過去互動')),
      h('div.caption'),
      h('div.actbar',
        h('button.sit-btn', { onclick: () => openSheet('rest'), 'aria-label': '歇息、搜尋、閉關' }, '坐'),
        h('button.act-btn', { onclick: doAct }),
      ),
      h('div.secl-bar'),
      h('nav.dock'),
      h('div.layer'),
    );
    root.appendChild(shell);
    ui.shell = shell;
    ui.view = makeView(canvas);
    ui.view.resize();
    ui.view.setState(ui.s);
    ui.view.start();
    bindPointer(shell.querySelector('canvas.world-canvas'));
  }

  /** While the title shows, quietly work out the lie of the land, so the world opens quickly. */
  function prepareWorld() {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    idle(() => {
      world();
      idle(() => heights());
    });
  }

  /** The 3D world where the device can draw it (and the player has not asked for the flat map). */
  function makeView(canvas) {
    const opts = { onFrame, idle: () => !!(ui.s && !ui.s.battle && (ui.s.pending || ui.sheet || ui.s.dead)), fight: () => ui.fight };
    if (viewMode() === '3d') {
      try {
        let chosen = null;
        try {
          chosen = localStorage.getItem('yijie-quality');
        } catch {
          chosen = null;
        }
        return createWorld3D(canvas, {
          ...opts,
          quality: chosen || 'high',
          // a slow device drops to the lighter picture by itself (unless you chose)
          onSlow: chosen ? null : () => toast('畫面較吃力，已改用省電畫質。可在「系統」裡調整。'),
        });
      } catch (e) {
        console.warn('3D world unavailable, using the flat map', e);
        const fresh = canvas.cloneNode(false);
        canvas.replaceWith(fresh);
        canvas = fresh;
      }
    }
    return createWorldView(canvas, opts);
  }

  /** Switch between the 3D world and the flat map (rebuilds the world screen). */
  function setView(mode) {
    try {
      localStorage.setItem('yijie-view', mode);
    } catch {
      /* private mode: it holds for this visit */
    }
    view = mode;
    const keep = ui.sheet;
    stopWorld();
    ui.sheet = keep;
    renderGame();
  }

  function quality() {
    try {
      return localStorage.getItem('yijie-quality') || 'high';
    } catch {
      return 'high';
    }
  }

  function setQuality(q) {
    try {
      localStorage.setItem('yijie-quality', q);
    } catch {
      /* private mode */
    }
    ui.view?.setQuality?.(q);
    renderLayer();
  }

  function viewMode() {
    let pref = view;
    if (!pref) {
      try {
        pref = localStorage.getItem('yijie-view');
      } catch {
        pref = null;
      }
    }
    if (pref === '2d') return '2d';
    return canDraw3D() ? '3d' : '2d';
  }

  const $ = (sel) => ui.shell?.querySelector(sel);

  // ── every frame ──
  function onFrame(dt) {
    const s = ui.s;
    if (!s || !ui.shell) return;
    const paused = !!(s.pending || s.dead || s.secl || ui.sheet);
    if (!paused) {
      const input = currentInput();
      const before = [s.world.x, s.world.y];
      E.step(s, dt, input);
      if (s.world.x !== before[0] || s.world.y !== before[1]) {
        ui.moved = true;
        if (ui.caption && Math.hypot(s.world.x - ui.caption.at[0], s.world.y - ui.caption.at[1]) > 60) hideCaption();
      }
    }
    fightTick(dt);
    for (const f of E.takeFeed(s)) toast(f.text, f.kind);
    for (const sig of E.takeSignals(s)) onSignal(sig);
    // something happened out there: an event, a death
    const key = layerKeyOf(s);
    if (key !== ui.layerKey) {
      persist();
      renderLayer();
      renderDock();
    }
    ui.hudT += dt;
    if (ui.hudT > 0.2) {
      ui.hudT = 0;
      renderHud();
    }
    ui.saveT += dt;
    if (ui.saveT > 6 && ui.moved) {
      ui.saveT = 0;
      ui.moved = false;
      persist();
    }
  }

  function layerKeyOf(s) {
    if (s.battle) return 'fight';
    if (s.dead && !s.pending) return 'dead';
    if (s.pending) {
      const p = s.pending;
      return `ev:${p.id || p.title}:${p.step}:${p.result ? 1 : 0}:${p.notice ? 1 : 0}`;
    }
    return ui.sheet ? `sheet:${ui.sheet}` : '';
  }

  // ── controls ──
  function currentInput() {
    if (ui.joy?.active) return { x: ui.joy.vx, y: ui.joy.vy };
    const k = ui.keys;
    let x = 0;
    let y = 0;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    return x || y ? { x, y } : null;
  }

  function onKey(e) {
    if (!ui.s || !ui.shell || e.target.closest?.('input, textarea')) return;
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
      if (!ui.s.pending && !ui.sheet) {
        ui.keys.add(key);
        e.preventDefault();
      }
      return;
    }
    if (key === 'escape' && ui.sheet) {
      closeSheet();
      return;
    }
    if ((key === 'e' || key === ' ' || key === 'enter') && !ui.s.pending && !ui.sheet && e.target === document.body) {
      e.preventDefault();
      doAct();
    }
    if (key === 'm' && !ui.s.pending) openSheet(ui.sheet === 'map' ? null : 'map');
  }

  function bindPointer(canvas) {
    const pts = new Map();
    let pinch = null;
    const joyEl = $('.joy');
    const JOY_R = 56;
    canvas.addEventListener('pointerdown', (e) => {
      // in a fight the story is open but the field still takes taps (to pick whom to strike)
      if (!ui.s || (ui.s.pending && !ui.s.battle) || ui.sheet) return;
      canvas.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: ui.view.zoom };
        ui.joy = null;
        joyEl.classList.remove('on');
      } else if (pts.size === 1) {
        ui.joy = { active: false, x0: e.clientX, y0: e.clientY, vx: 0, vy: 0 };
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        ui.view.setZoom(pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        return;
      }
      const j = ui.joy;
      if (!j) return;
      const dx = e.clientX - j.x0;
      const dy = e.clientY - j.y0;
      const d = Math.hypot(dx, dy);
      if (!j.active && d > 12) {
        j.active = true;
        if (ui.s?.battle) return; // no walking off mid-fight: a drag is just not a tap
        hideCaption();
        const rect = canvas.getBoundingClientRect();
        joyEl.style.left = `${j.x0 - rect.left}px`;
        joyEl.style.top = `${j.y0 - rect.top}px`;
        joyEl.classList.add('on');
      }
      if (j.active && !ui.s?.battle) {
        const k = Math.min(1, d / JOY_R);
        j.vx = (dx / (d || 1)) * k;
        j.vy = (dy / (d || 1)) * k;
        const knob = joyEl.firstChild;
        knob.style.transform = `translate(${j.vx * JOY_R}px, ${j.vy * JOY_R}px)`;
      }
    });
    const end = (e) => {
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (pinch) {
        if (pts.size < 2) pinch = null;
        return;
      }
      const j = ui.joy;
      ui.joy = null;
      joyEl.classList.remove('on');
      if (!p || !j) return;
      if (!j.active && performance.now() - p.t0 < 500 && e.type === 'pointerup') tap(e.clientX, e.clientY);
      else persist();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      ui.view.setZoom(ui.view.zoom * (e.deltaY > 0 ? 0.9 : 1.1));
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** A tap on the world: walk there, or to the person or thing you tapped. */
  function tap(cx, cy) {
    const s = ui.s;
    if (s?.battle) return fightTap(cx, cy);
    if (!s || s.pending || s.secl || ui.sheet) return;
    const rect = ui.shell.querySelector('canvas.world-canvas').getBoundingClientRect();
    const sx = cx - rect.left;
    const sy = cy - rect.top;
    const [wx, wy] = ui.view.screenToWorld(sx, sy);
    hideCaption();
    // the thing under your finger (people are tall: count a tap on their body)
    let best = null;
    let bd = 34;
    for (const t of E.targetsNear(s, 700)) {
      const [px, py] = ui.view.worldToScreen(t.x, t.y);
      let d = Math.hypot(px - sx, py - sy);
      if (t.kind === 'npc' || t.kind === 'folk') {
        const [bx, by] = ui.view.worldToScreen(t.x, t.y, 18);
        d = Math.min(d, Math.hypot(bx - sx, by - sy));
      }
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    if (best) {
      if (best.d <= best.reach) act((x) => E.interact(x, best));
      else E.walkTo(s, best.x, best.y, best);
      return;
    }
    ui.view.markTap(wx, wy);
    E.walkTo(s, wx, wy);
  }

  function doAct() {
    const s = ui.s;
    if (!s || s.pending || s.secl) return;
    const t = E.nearestTarget(s);
    if (!t) return;
    hideCaption();
    act((x) => E.interact(x, t));
  }

  function onSignal(sig) {
    if (sig.caption) showCaption(sig.caption);
    if (sig.open === 'shop') openSheet('shop');
  }

  // ── HUD ──
  function renderHud(force = false) {
    const s = ui.s;
    if (!s || !ui.shell) return;
    const p = s.player;
    const req = stageReq(s);
    const neck = atBottleneck(s);
    const topKey = `${p.name}|${realmLabel(p)}|${p.ls}|${s.day}|${E.shichen(s.tod)}|${Math.floor(p.xw)}|${req}|${neck}`;
    if (force || ui.hudKeys.top !== topKey) {
      ui.hudKeys.top = topKey;
      const el = $('.hud-top');
      clear(el);
      put(el, 
        h('div.hud-line',
          h('b.hud-name', p.name),
          h('span.hud-realm', realmLabel(p)),
          h('span.hud-ls', { title: '靈石' }, h('i.gem'), String(p.ls)),
        ),
        h('div.hud-line.sub', h('span', fmtDate(s.day)), h('span', timeWord(s))),
        h('div.hud-xw', bar(p.xw, req, neck ? 'full' : ''), h('span', neck ? '修為圓滿・可突破' : `修為 ${Math.floor(p.xw)} / ${req}`)),
      );
    }
    const loc = s.player.loc;
    const pct = exploredPct(s, loc);
    const placeKey = `${loc}|${pct}`;
    if (force || ui.hudKeys.place !== placeKey) {
      ui.hudKeys.place = placeKey;
      const el = $('.place-tag');
      clear(el);
      put(el, h('span.place-seal', NODES[loc]?.name || ''), loc !== 'great_river' ? h('span.place-pct', `探索 ${pct}%`) : null);
    }
    const flagKey = `${!!s.secl}|${p.injury}|${Object.keys(p.buffs).join(',')}|${SEASON_NAME[seasonOf(s.day)]}`;
    if (force || ui.hudKeys.flags !== flagKey) {
      ui.hudKeys.flags = flagKey;
      const el = $('.hud-flags');
      clear(el);
      put(el, 
        h('span.pill.season', SEASON_NAME[seasonOf(s.day)]),
        p.injury ? h('span.pill.bad', INJURY[p.injury].name) : null,
        Object.keys(p.buffs).filter((b) => BUFFS[b]).map((b) => h('span.pill.good', BUFFS[b].name)),
      );
    }
    // the act button and the ring under its target
    const t = !s.pending && !s.secl && !ui.sheet ? E.nearestTarget(s) : null;
    ui.view?.setHighlight(t);
    const actKey = t ? `${t.kind}:${t.id}:${t.verb}:${t.name}` : '';
    if (force || ui.hudKeys.act !== actKey) {
      ui.hudKeys.act = actKey;
      const el = $('.act-btn');
      clear(el);
      el.classList.toggle('on', !!t);
      if (t) put(el, h('b', t.verb), h('span', t.name));
    }
    $('.actbar').hidden = !!s.secl;
    // the first steps: how to walk, until you have walked a little
    $('.walk-hint').classList.toggle('on', (s.world?.walked || 0) < 400 && !s.secl && !s.pending && !ui.sheet);
    // region banner
    const b = E.bannerOf(s);
    if (b && b.t !== ui.bannerT) {
      ui.bannerT = b.t;
      showBanner(b);
    }
    drawMinimap(force);
  }

  function showBanner(b) {
    const el = $('.banner');
    clear(el);
    put(el, b.first ? h('span.banner-sub', '初到') : null, h('span.banner-name', b.name));
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function toast(text, kind = 'sys') {
    const box = $('.toasts');
    if (!box || !text) return;
    const el = h('div.toast.' + kind, text);
    box.appendChild(el);
    while (box.childElementCount > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), kind === 'ambient' ? 2600 : 3800);
    setTimeout(() => el.remove(), kind === 'ambient' ? 3200 : 4400);
  }

  function showCaption(c) {
    const s = ui.s;
    ui.caption = { ...c, at: [s.world.x, s.world.y] };
    const el = $('.caption');
    clear(el);
    put(el, 
      h('div.caption-head', h('b', c.title), h('button.caption-x', { onclick: hideCaption, 'aria-label': '關閉' }, '×')),
      h('div.caption-text', paragraphs(c.text)),
      c.rest
        ? h('div.btn-row',
            h('button.btn.small', { onclick: () => { hideCaption(); act((x) => E.rest(x, 2)); } }, '歇一會兒'),
            h('button.btn.small', { onclick: () => { hideCaption(); act((x) => E.rest(x, 'dusk')); } }, '歇到黃昏'),
            h('button.btn.small', { onclick: () => { hideCaption(); act((x) => E.rest(x, 'dawn')); } }, '歇到天明'))
        : null,
      c.actions ? h('div.btn-row', c.actions) : null,
    );
    el.classList.add('on');
  }

  function hideCaption() {
    ui.caption = null;
    $('.caption')?.classList.remove('on');
  }

  function showPlaceInfo() {
    const s = ui.s;
    const id = s.player.loc;
    const n = NODES[id];
    if (!n) return;
    const here = Object.values(s.npcs).filter((x) => x.alive && x.met && x.loc === id).map((x) => x.name);
    const blocker = canSecludeAt(s, id);
    showCaption({
      title: n.name,
      text: [
        n.desc,
        `探索 ${exploredPct(s, id)}%・靈氣 ${nodeQi(s, id).toFixed(1)}${blocker ? '' : '・可在此閉關'}`,
        here.length ? `認識的人：${here.join('、')}` : '',
      ].filter(Boolean).join('\n\n'),
    });
  }

  // ── the minimap ──
  function worldThumb() {
    const season = seasonOf(ui.s.day);
    if (!ui.thumb || ui.thumbSeason !== season) {
      ui.thumb = paintWorldThumb(season, 0.1);
      ui.thumbSeason = season;
    }
    return ui.thumb;
  }

  function drawMinimap(force) {
    const s = ui.s;
    const cv = $('.minimap');
    if (!cv) return;
    const w = s.world;
    const key = `${Math.round(w.x / 50)}|${Math.round(w.y / 50)}|${ui.thumbSeason}`;
    if (!force && (ui.hudKeys.mini === key || performance.now() - (ui.miniAt || 0) < 600)) return;
    ui.hudKeys.mini = key;
    ui.miniAt = performance.now();
    const g = cv.getContext('2d');
    const SPAN = 1500; // world units across
    const k = cv.width / SPAN;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#efe9dc';
    g.fillRect(0, 0, cv.width, cv.height);
    const thumb = worldThumb();
    const ts = thumb.width / WORLD_W;
    const x0 = w.x - SPAN / 2;
    const y0 = w.y - SPAN / 2;
    g.drawImage(thumb, x0 * ts, y0 * ts, SPAN * ts, SPAN * ts, 0, 0, cv.width, cv.height);
    // clouds
    const f = fogOf(s);
    g.fillStyle = 'rgba(241,238,230,0.96)';
    const c0 = Math.max(0, Math.floor(x0 / 40));
    const r0 = Math.max(0, Math.floor(y0 / 40));
    for (let j = r0; j < Math.min(ROWS, r0 + SPAN / 40 + 2); j++) {
      for (let i = c0; i < Math.min(COLS, c0 + SPAN / 40 + 2); i++) {
        if (f.bits[j * COLS + i]) continue;
        g.fillRect((i * 40 - x0) * k - 0.5, (j * 40 - y0) * k - 0.5, 40 * k + 1, 40 * k + 1);
      }
    }
    // known places nearby
    for (const p of POIS) {
      if (!p.verb || !E.poiVisible(s, p) || !isRevealed(s, p.x, p.y)) continue;
      const px = (p.x - x0) * k;
      const py = (p.y - y0) * k;
      if (px < 0 || py < 0 || px > cv.width || py > cv.height) continue;
      g.fillStyle = 'rgba(35,32,27,0.7)';
      g.fillRect(px - 2, py - 2, 4, 4);
    }
    // something going on out there
    for (const sc of E.scenesInWorld(s)) {
      if (sc.state !== 'idle') continue;
      const px = (sc.x - x0) * k;
      const py = (sc.y - y0) * k;
      if (px < 4 || py < 4 || px > cv.width - 4 || py > cv.height - 4) continue;
      g.fillStyle = sc.def.bubble === '！' ? 'rgba(168,50,42,0.85)' : 'rgba(176,132,60,0.9)';
      g.beginPath();
      g.arc(px, py, 4.5, 0, Math.PI * 2);
      g.fill();
    }
    // you
    g.fillStyle = '#a8322a';
    g.beginPath();
    g.arc(cv.width / 2, cv.height / 2, 6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f7efe1';
    g.lineWidth = 2;
    g.stroke();
  }

  // ── seclusion overlay ──
  function updateSecl() {
    const s = ui.s;
    const el = $('.secl-bar');
    if (!el) return;
    if (!s.secl) {
      el.classList.remove('on');
      return;
    }
    const x = s.secl;
    el.classList.add('on');
    clear(el);
    put(el, 
      h('div.secl-head', h('b', `於${NODES[x.node].name}閉關`), h('button.btn.small', { onclick: () => act((y) => A.endSeclusionEarly(y, Date.now())) }, '提前出關')),
      bar(x.done, x.days, 'calm'),
      h('p.small.muted', seclText()),
    );
    renderHud();
  }

  function seclText() {
    const x = ui.s.secl;
    const remain = (x.days - x.done) * x.msPerDay - ((Date.now() - x.start) % x.msPerDay);
    return `已閉關 ${fmtDuration(x.done)} / ${fmtDuration(x.days)}・修為 +${Math.round(x.xw)}・還需${realTime(Math.max(0, remain))}。關掉遊戲也會繼續。`;
  }

  // ── dock ──
  function renderDock() {
    const s = ui.s;
    const el = $('.dock');
    if (!el) return;
    clear(el);
    const unread = s.rumors.filter((r) => !r.read).length;
    const badges = {
      cult: atBottleneck(s) || s.secl ? 'dot' : '',
      log: unread ? String(Math.min(99, unread)) : '',
      sys: A.deduceReady(s) ? 'dot' : '',
    };
    for (const [id, label] of DOCK) {
      const b = badges[id];
      el.appendChild(
        h('button.dock-btn' + (ui.sheet === id ? '.on' : ''), { onclick: () => openSheet(ui.sheet === id ? null : id) },
          label, b === 'dot' ? h('span.badge.dot', { 'aria-label': '有新動靜' }) : b ? h('span.badge', b) : null),
      );
    }
    updateSecl();
  }

  function openSheet(id) {
    if (!ui.s || ui.s.pending) return;
    ui.sheet = id;
    ui.joy = null;
    ui.keys.clear();
    hideCaption();
    renderDock();
    renderLayer();
  }

  function closeSheet() {
    openSheet(null);
  }

  // ── sheets: panels, events, map, death ──
  function renderLayer() {
    const s = ui.s;
    const el = $('.layer');
    if (!el) return;
    ui.layerKey = layerKeyOf(s);
    clear(el);
    el.classList.remove('dim');
    el.classList.toggle('fight', !!s.battle);
    ui.shell?.classList.toggle('fighting', !!s.battle);
    if (s.battle) el.appendChild(fightPanel());
    else if (s.pending) el.appendChild(eventSheet());
    else if (s.dead) el.appendChild(deathScreen());
    else if (ui.sheet) {
      el.appendChild(ui.sheet === 'map' ? mapSheet() : panelSheet(ui.sheet));
      el.classList.add('dim');
    }
    el.classList.toggle('open', el.childElementCount > 0);
    if (s.pending || s.dead) {
      // rumors on screen count as read
    } else if (ui.sheet === 'log' && ui.logTab === 'rumors') {
      const unread = s.rumors.filter((r) => !r.read);
      if (unread.length) {
        for (const r of unread) r.read = true;
        persist();
        requestAnimationFrame(renderDock);
      }
    }
  }

  function panelSheet(id) {
    const title = { bag: '行囊', shop: '行囊', cult: '修煉', log: '見聞', sys: '問道系統', rest: '歇息' }[id];
    const body = { bag: panelBag, shop: panelBag, cult: panelCult, log: panelLog, sys: panelSys, rest: panelRest }[id]();
    const sheet = h('div.sheet.panel-sheet', { role: 'dialog', 'aria-label': title },
      h('div.sheet-head', h('h2.sheet-title', title), h('button.btn.small.ghost', { onclick: closeSheet }, '關閉')),
      h('div.sheet-body', body),
    );
    return sheet;
  }

  // ── 歇息 ──
  function panelRest() {
    const s = ui.s;
    const id = s.player.loc;
    const blocker = canSecludeAt(s, id);
    const opt = (label, sub, fn) => h('button.action', { onclick: () => { closeSheet(); act(fn); } }, h('b', label), h('span', sub));
    return h('div.rest',
      h('p.muted', `${NODES[id]?.name || ''}・${timeWord(s)}`),
      h('div.actions',
        opt('四處搜尋', '兩個時辰', (x) => E.search(x)),
        opt('歇一會兒', '一個時辰', (x) => E.rest(x, 2)),
        opt('歇到黃昏', '酉時', (x) => E.rest(x, 'dusk')),
        opt('歇到入夜', '亥時', (x) => E.rest(x, 'night')),
        opt('歇到天明', '卯時', (x) => E.rest(x, 'dawn')),
        h('button.action', { onclick: () => openSheet('cult') }, h('b', '閉關'), h('span', blocker ? '此地不宜' : '修煉頁')),
      ),
      h('p.muted.small', '有些人只在夜裡出現，有些東西只在月光下發亮。'),
    );
  }

  // ── 修煉 ──
  function panelCult() {
    const s = ui.s;
    const p = s.player;
    const rp = rateParts(s);
    const tech = techOf(s);
    const left = lifespan(s) - age(s);
    const wrap = h('div.cult');
    put(wrap, 
      h('section.card.realm-card',
        h('div.realm-big', realmLabel(p)),
        h('p.muted', `${ROOTS[p.root.type].name}（${p.root.els.join('、')}）・${tech ? tech.name : '未習功法'}・戰力 ${power(s)}`),
        bar(p.xw, stageReq(s), atBottleneck(s) ? 'full' : ''),
        h('p.rate', `閉關時每日修為 +${rp.total.toFixed(2)}`),
        h('p.breakdown', `基礎 ${rp.base} × 靈根 ${rp.root} × 功法 ${rp.tech.toFixed(2)} × 靈氣 ${rp.qi} × 心境 ${rp.mind.toFixed(2)}${rp.injury < 1 ? ` × 傷勢 ${rp.injury}` : ''}${rp.buff > 1 ? ` × 增益 ${rp.buff.toFixed(2)}` : ''}`),
      ),
      h('section.card',
        h('div.row-between', h('span', '壽元'), h('span', `${Math.floor(age(s))} / ${lifespan(s)} 歲`)),
        bar(age(s), lifespan(s), left < 30 ? 'danger' : 'life'),
        left < 30 ? h('p.warn', `只剩 ${Math.max(0, Math.floor(left))} 年。突破，才能延壽。`) : null,
      ),
    );
    if (s.secl) put(wrap, seclusionCard());
    else if (atBottleneck(s)) put(wrap, breakthroughCard());
    else put(wrap, seclusionOptions());
    put(wrap, statusCard(), techCard());
    return wrap;
  }

  function seclusionCard() {
    const x = ui.s.secl;
    return h('section.card.secl',
      h('h3', `於${NODES[x.node].name}閉關`),
      bar(x.done, x.days, 'calm'),
      h('p', seclText()),
      h('button.btn', { onclick: () => { closeSheet(); act((s) => A.endSeclusionEarly(s, Date.now())); } }, '提前出關'),
    );
  }

  function seclusionOptions() {
    const s = ui.s;
    const blocker = A.seclusionBlocker(s);
    const rate = rateParts(s).total;
    return h('section.card',
      h('h3', `閉關・${NODES[s.player.loc]?.name || ''}`),
      blocker
        ? h('p.warn', blocker)
        : h('div.secl-opts', A.SECLUSION_OPTIONS.map((o) =>
            h('button.secl-opt', { onclick: () => { closeSheet(); act((x) => A.startSeclusion(x, o.days, Date.now(), speed)); } },
              h('b', o.label),
              h('span', `修為約 +${Math.round(rate * o.days)}`),
              h('span', `出關 ${Math.floor(age(s) + o.days / 360)} 歲`),
              h('span.real', realTime((o.days * A.MS_PER_DAY) / speed)),
            ))),
      h('p.muted.small', '閉關就在你站著的地方。靈氣越濃，修煉越快；荒郊野外，也越可能被打擾。閉關時世界照常運轉。'),
    );
  }

  function breakthroughCard() {
    const s = ui.s;
    const p = s.player;
    const pillsOwned = (p.items.zhuji_pill || 0) + (p.items.fake_zhuji || 0);
    const canPill = p.realm === 1 && pillsOwned > 0;
    ui.pills = Math.min(ui.pills, canPill ? Math.min(2, pillsOwned) : 0);
    const info = breakthroughInfo(s, { pills: ui.pills });
    return h('section.card.bt',
      h('h3', `突破：${info.next}`),
      h('div.chance', h('b', Math.round(info.chance * 100) + '%'), h('span', info.kind === 'major' ? '大境界' : '小境界')),
      h('ul.parts', info.parts.map(([label, v]) => h('li', h('span', label), h('span', (v >= 0 ? '+' : '') + Math.round(v * 100) + '%')))),
      canPill
        ? h('div.pills', h('span', '服用築基丹：'), [0, 1, 2].filter((n) => n <= Math.min(2, pillsOwned)).map((n) =>
            h('button.btn.small' + (ui.pills === n ? '.on' : ''), { onclick: () => { ui.pills = n; renderLayer(); } }, n === 0 ? '不用' : `${n} 顆`)))
        : null,
      info.kind === 'major' && p.realm >= 1 ? h('p.muted.small', '失敗會損失修為、受傷、心境下降；用掉的丹藥不會回來。') : null,
      h('button.btn.primary', { onclick: () => { closeSheet(); act((x) => A.attemptBreakthrough(x, ui.pills)); } }, p.realm === 0 ? '引氣入體' : '衝擊瓶頸'),
      h('p.muted.small', '也可以繼續閉關：修為已滿，閉關只會讓時間流逝。'),
    );
  }

  function statusCard() {
    const s = ui.s;
    const p = s.player;
    return h('section.card',
      h('div.stats',
        stat('心境', p.mind, 100),
        h('div.stat', h('span', '傷勢'), h('b', INJURY[p.injury].name)),
        h('div.stat', h('span', '感悟'), h('b', p.insight)),
        h('div.stat', h('span', '戰力'), h('b', power(s))),
      ),
      h('div.attrs', Object.entries(ATTRS).map(([k, label]) => h('div.attr', h('span', label), h('b', attrWord(p.attrs[k])), h('i', p.attrs[k])))),
      Object.keys(p.buffs).length
        ? h('p.muted.small', '增益：' + Object.entries(p.buffs).filter(([b]) => BUFFS[b]).map(([b, d]) => `${BUFFS[b].name}（${d} 天）`).join('、'))
        : null,
    );
  }

  function stat(label, v, max) {
    return h('div.stat', h('span', label), h('b', v), bar(v, max));
  }

  function techCard() {
    const s = ui.s;
    const p = s.player;
    return h('section.card',
      h('h3', '功法'),
      p.techs.length
        ? h('ul.techs', p.techs.map((id) => {
            const t = TECHS[id];
            return h('li' + (p.tech === id ? '.on' : ''),
              h('div', h('b', t.name), h('span.grade', t.grade)),
              h('p', t.desc),
              p.tech === id ? h('span.pill.calm', '修習中') : h('button.btn.small', { onclick: () => act((x) => A.setTech(x, id)) }, '改修此法'));
          }))
        : h('p.muted', '尚未習得功法。'),
      p.arts.length ? h('h3', '術法') : null,
      p.arts.length ? h('ul.techs', p.arts.map((id) => h('li', h('div', h('b', TECHS[id].name), h('span.grade', TECHS[id].grade)), h('p', TECHS[id].desc)))) : null,
    );
  }

  // ── 行囊 ──
  function panelBag() {
    const s = ui.s;
    const p = s.player;
    const shop = A.shopHere(s);
    const wrap = h('div.bag');
    if (shop) {
      put(wrap, 
        h('section.card.shop',
          h('h3', `${shop.name}・${shop.keeper}`),
          h('ul.items', shop.stock.map((id) => {
            const it = ITEMS[id];
            return h('li',
              h('div.item-head', h('b', it.name), h('span.price', `${it.price} 靈石`)),
              h('p', it.desc),
              h('div.item-acts', h('button.btn.small', { disabled: p.ls < it.price || !!s.secl, onclick: () => act((x) => A.buy(x, id)) }, '買下')),
            );
          })),
        ),
      );
    }
    const ids = Object.keys(p.items).filter((id) => ITEMS[id]);
    ids.sort((a, b) => ITEM_ORDER.indexOf(ITEMS[a].kind) - ITEM_ORDER.indexOf(ITEMS[b].kind));
    put(wrap, 
      h('section.card',
        h('h3', `行囊・靈石 ${p.ls}`),
        ids.length ? h('ul.items', ids.map((id) => itemRow(id, shop))) : h('p.muted', '行囊空空如也。'),
      ),
    );
    return wrap;
  }

  function itemRow(id, shop) {
    const s = ui.s;
    const p = s.player;
    const it = ITEMS[id];
    const shown = displayItem(s, id);
    const n = p.items[id];
    const busy = !!s.secl;
    const price = A.sellPrice(s, id);
    return h('li',
      h('div.item-head', h('b', shown.name, n > 1 ? ` ×${n}` : ''), h('span.kindtag', ITEM_KIND[it.kind] || '')),
      h('p', shown.desc),
      h('div.item-acts',
        it.use ? h('button.btn.small', { disabled: busy, onclick: () => act((x) => A.useItem(x, id)) }, it.kind === 'book' ? '研讀' : '使用') : null,
        it.kind === 'weapon' ? h('button.btn.small' + (p.weapon === id ? '.on' : ''), { disabled: busy, onclick: () => act((x) => A.equip(x, id)) }, p.weapon === id ? '卸下' : '裝備') : null,
        A.canIdentify(s, id) ? h('button.btn.small', { disabled: busy, onclick: () => act((x) => A.identify(x, id)) }, A.identifyCost(s) ? '鑑定（10 靈石）' : '系統鑑定') : null,
        shop && price > 0 ? h('button.btn.small.ghost', { disabled: busy, onclick: () => act((x) => A.sell(x, id)) }, `出售 ${price}`) : null,
      ),
    );
  }

  // ── 見聞 ──
  function panelLog() {
    const subs = [
      ['rumors', '傳聞'],
      ['people', '人物'],
      ['places', '地點'],
      ['life', '生平'],
      ['frags', '殘頁'],
    ];
    const body = { rumors: logRumors, people: logPeople, places: logPlaces, life: logLife, frags: logFrags }[ui.logTab]();
    return h('div.logpage',
      h('div.subtabs', subs.map(([id, label]) => h('button.subtab' + (ui.logTab === id ? '.on' : ''), { onclick: () => { ui.logTab = id; renderLayer(); } }, label))),
      body,
    );
  }

  function logRumors() {
    const s = ui.s;
    if (!s.rumors.length) return h('p.muted.pad', '還沒聽到什麼傳聞。去茶館、坊市路口打聽看看，或跟路人搭幾句話。');
    return h('ul.rumors', s.rumors.slice(0, 80).map((r) =>
      h('li' + (r.read ? '' : '.unread'),
        h('time', fmtDate(r.day, { withDay: false })),
        h('p', r.text),
        s.sys.lv >= 4 && r.kind === 'false' ? h('span.tag.bad', '系統：此為謠言') : null,
        s.sys.lv >= 4 && r.kind === 'hint' ? h('span.tag.good', '系統：線索') : null,
      )));
  }

  function logPeople() {
    const s = ui.s;
    const list = Object.values(s.npcs).filter((n) => n.met);
    if (!list.length) return h('p.muted.pad', '還沒結識什麼人。');
    list.sort((a, b) => (b.named ? 1 : 0) - (a.named ? 1 : 0) || b.favor - a.favor);
    return h('ul.people-list', list.map((n) =>
      h('li' + (n.alive ? '' : '.dead'),
        seal(n.name[0], n.alive ? '' : 'grey'),
        h('div',
          h('div.person-head', h('b', n.name), h('span', n.title),
            s.sys.lv >= 3 && n.luck ? h('span.tag.karma', '氣運之子') : null),
          h('p.muted.small', n.alive ? `${npcRealm(n)}・${npcAge(s, n)} 歲・${favorWord(n.favor)}${n.loc && NODES[n.loc] ? `・在${NODES[n.loc].name}` : ''}` : `已故・${favorWord(n.favor)}`),
          h('p', n.named ? NAMED[n.id].bio : `性情${n.trait}。相識於${NODES[n.metAt]?.name || '路上'}。`),
        ),
      )));
  }

  function logPlaces() {
    const s = ui.s;
    const ids = Object.keys(NODES).filter((id) => s.nodes[id]?.known && NODES[id].at);
    return h('ul.places', ids.map((id) =>
      h('li',
        h('div.row-between', h('b', NODES[id].name), h('span.muted.small', s.nodes[id].visited ? `探索 ${exploredPct(s, id)}%` : '未曾去過')),
        h('p', NODES[id].desc),
      )));
  }

  function logLife() {
    const s = ui.s;
    return h('div',
      h('p.muted.pad', `${s.player.name}，${ORIGINS[s.player.origin].name}，第 ${s.meta.life} 世。走了 ${Math.round((s.world?.walked || 0) / 1000)} 里路。`),
      h('ul.loglist.long', s.log.map((l) => h('li', h('time', fmtDate(l.day, { withDay: false })), l.text))),
    );
  }

  function logFrags() {
    const s = ui.s;
    const got = s.sys.frags.filter((f) => FRAGMENTS[f]);
    return h('div',
      h('p.muted.pad', `天機殘頁 ${got.length} / ${FRAGMENT_TOTAL}`),
      got.length
        ? h('ul.frags', got.map((f) => h('li', h('b', FRAGMENTS[f].title), paragraphs(FRAGMENTS[f].text))))
        : h('p.muted.pad', '一頁也沒有。它們散落在世界的各個角落。'),
    );
  }

  // ── 系統 ──
  function panelSys() {
    const s = ui.s;
    const sys = s.sys;
    const next = SYS_LEVELS[sys.lv] ?? null;
    return h('div.syspage',
      h('section.card.sys-card',
        h('div.sys-title', h('span', '問道輔助系統'), h('b', `${sys.lv} 級`)),
        next ? bar(sys.exp - SYS_LEVELS[sys.lv - 1], next - SYS_LEVELS[sys.lv - 1]) : bar(1, 1),
        h('p.muted.small', next ? `見聞 ${sys.exp} / ${next}。走過的地方、發現的東西、結識的人、目睹的大事，都能增長見聞。` : `見聞 ${sys.exp}。`),
      ),
      h('section.card',
        h('h3', '功能'),
        h('ul.features', SYS_FEATURES.map((f) => h('li' + (sys.lv >= f.lv ? '' : '.locked'), h('b', f.name), h('span', sys.lv >= f.lv ? f.desc : `${f.lv} 級解鎖`)))),
      ),
      h('section.card',
        h('h3', '替死'),
        h('p', `剩餘 ${sys.subs} / ${sys.subsMax}`),
        sys.rechargeAt !== null ? h('p.muted.small', `下一次凝聚：${fmtDate(sys.rechargeAt)}`) : null,
      ),
      sys.lv >= 2
        ? h('section.card',
            h('h3', '推演'),
            h('p.muted.small', '每月可推演一次，系統會給出一條附近的線索。'),
            h('button.btn', { disabled: !A.deduceReady(s), onclick: () => { closeSheet(); act(A.deduce); } }, A.deduceReady(s) ? '推演' : '天機尚未恢復'),
          )
        : null,
      h('section.card',
        h('h3', '畫面'),
        h('p.muted.small', canDraw3D() ? '立體：有山有水、有房有雲海的世界。平面：手繪地圖的畫法，最省電。' : '這台裝置無法顯示立體畫面，目前使用平面地圖。'),
        canDraw3D()
          ? h('div.btn-row',
              h('button.btn.small' + (viewMode() === '3d' ? '.on' : ''), { onclick: () => setView('3d') }, '立體'),
              h('button.btn.small' + (viewMode() === '2d' ? '.on' : ''), { onclick: () => setView('2d') }, '平面'),
            )
          : null,
        viewMode() === '3d'
          ? h('div.btn-row',
              h('button.btn.small' + (quality() === 'high' ? '.on' : ''), { onclick: () => setQuality('high') }, '畫質・精細'),
              h('button.btn.small' + (quality() === 'low' ? '.on' : ''), { onclick: () => setQuality('low') }, '畫質・省電'),
            )
          : null,
      ),
      h('section.card',
        h('h3', '操作'),
        h('p.muted.small', '按住畫面任意處拖動：往那個方向走。點一下地面：自己走過去。點人或東西：走過去並互動。兩指捏合：縮放。鍵盤：WASD 或方向鍵行走，E 互動，M 地圖。'),
      ),
      h('section.card',
        h('h3', '存檔'),
        h('p.muted.small', '遊戲會自動存在這台裝置上。換手機或清除瀏覽資料前，記得匯出存檔碼。'),
        h('div.btn-row',
          h('button.btn.small', { onclick: () => { ui.panel = ui.panel === 'export' ? null : 'export'; renderLayer(); } }, '匯出存檔'),
          h('button.btn.small', { onclick: () => { ui.panel = ui.panel === 'import' ? null : 'import'; renderLayer(); } }, '匯入存檔'),
          h('button.btn.small.ghost', { onclick: () => { ui.panel = ui.panel === 'reset' ? null : 'reset'; renderLayer(); } }, '重新開始'),
        ),
        ui.panel === 'export' ? exportBox() : null,
        ui.panel === 'import' ? importBox(() => { ui.panel = null; ui.sheet = null; }) : null,
        ui.panel === 'reset'
          ? h('div.confirm',
              h('p', '確定要放棄這一世，從頭開始嗎？目前的存檔會被刪除。'),
              h('div.btn-row',
                h('button.btn.small', { onclick: () => { ui.panel = null; renderLayer(); } }, '再想想'),
                h('button.btn.small.danger', { onclick: () => { forgetSave(); ui.s = null; ui.panel = null; ui.sheet = null; stopWorld(); render(); } }, '確定重來'),
              ))
          : null,
      ),
      h('p.version.pad', `一介散修 試玩版 ${VERSION}`),
    );
  }

  function exportBox() {
    const code = exportCode(ui.s);
    const ta = h('textarea.code', { id: 'export-code', readonly: true, rows: 4 }, code);
    const msg = h('span.muted.small');
    return h('div.codebox', ta,
      h('div.btn-row',
        h('button.btn.small', {
          onclick: () => {
            navigator.clipboard?.writeText(code).then(
              () => (msg.textContent = '已複製'),
              () => { ta.select(); msg.textContent = '請長按選取後複製'; },
            ) ?? (ta.select(), (msg.textContent = '請長按選取後複製'));
          },
        }, '複製'),
        msg,
      ));
  }

  function importBox(done) {
    const ta = h('textarea.code', { id: 'import-code', rows: 4, placeholder: '貼上存檔碼（YJSX1: 開頭）' });
    const msg = h('p.muted.small');
    return h('div.codebox', ta,
      h('div.btn-row',
        h('button.btn.small', {
          onclick: () => {
            try {
              const s = importCode(ta.value);
              adopt(s);
              persist();
              done?.();
              render();
            } catch {
              msg.textContent = '這不是有效的存檔碼。請確認整段都複製到了。';
            }
          },
        }, '匯入'),
      ), msg);
  }

  // ── events ──
  /** A painted scene for the event, if one has been put in its slot. */
  // ── a fight ──

  /** Each frame: show the fight beat by beat; when it is decided and shown, set the seal, then go on with the story. */
  function fightTick(dt) {
    const s = ui.s;
    if (!s.battle) {
      ui.fight = null;
      ui.fightEndT = null;
      ui.fightShown = false;
      return;
    }
    if (!ui.fight) {
      ui.fight = createFightPlayer();
      ui.fightMenu = null;
      ui.fightAim = null;
      ui.fightKey = null;
    }
    ui.fight.feed(s.battle, B.takeBeats());
    ui.fight.update(dt);
    if (s.battle.over && ui.fight.idle()) {
      ui.fightEndT = (ui.fightEndT ?? 0) + dt;
      if (ui.fightEndT > 1.6) {
        ui.fightEndT = null;
        ui.fight = null;
        act(finishFight);
        return;
      }
    }
    const b = s.battle;
    const key = `${b.turn}:${ui.fight.idle()}:${ui.fightMenu}:${ui.fightAim?.kind}:${b.over}:${ui.fightEndT !== null}`;
    if (key !== ui.fightKey) {
      ui.fightKey = key;
      renderLayer();
    } else fightLive();
  }

  /** What changes every beat: the narration and your bars. */
  function fightLive() {
    const el = $('.fight-panel');
    if (!el || !ui.fight) return;
    const say = el.querySelector('.fight-say');
    if (say && ui.fight.text && say.textContent !== ui.fight.text) say.textContent = ui.fight.text;
    const me = B.unitOf(ui.s.battle, 'me');
    const hp = ui.fight.shown.get('me')?.hp ?? me.hp;
    const hpBar = el.querySelector('.fight-hp i');
    if (hpBar) hpBar.style.width = `${Math.max(0, (hp / me.maxHp) * 100)}%`;
    const hpNum = el.querySelector('.fight-hp-n');
    if (hpNum) hpNum.textContent = `${hp} / ${me.maxHp}`;
  }

  function fightDo(action) {
    const s = ui.s;
    if (!s.battle || s.battle.turn !== 'me' || !ui.fight?.idle()) return;
    ui.fightMenu = null;
    ui.fightAim = null;
    B.act(s, action);
    persist();
    ui.fightKey = null;
  }

  /** An action that needs someone to aim at: with one foe, at them; else pick by tapping. */
  function fightAimAt(action) {
    const o = B.options(ui.s);
    if (!o) return;
    if (o.targets.length === 1) return fightDo({ ...action, target: o.targets[0] });
    ui.fightAim = action;
    ui.fightMenu = null;
    ui.fightKey = null;
  }

  /** A tap on the field: whoever is nearest under your finger. */
  function fightTap(cx, cy) {
    const s = ui.s;
    const o = B.options(s);
    if (!o || !ui.fight?.idle()) return;
    const rect = ui.shell.querySelector('canvas.world-canvas').getBoundingClientRect();
    const field = E.battleField(s);
    let best = null;
    let bd = 64;
    for (const id of o.targets) {
      const u = B.unitOf(s.battle, id);
      const [x, y] = field.at({ t: ui.fight.tOf(id), lane: u.lane, side: u.side });
      for (const up of [8, 24, 40]) {
        const [sx, sy] = ui.view.worldToScreen(x, y, up);
        const d = Math.hypot(sx - (cx - rect.left), sy - (cy - rect.top));
        if (d < bd) {
          bd = d;
          best = id;
        }
      }
    }
    if (!best) return;
    fightDo({ ...(ui.fightAim || { kind: 'attack' }), target: best });
  }

  function fightPanel() {
    const s = ui.s;
    const b = s.battle;
    const fx = ui.fight;
    const me = B.unitOf(b, 'me');
    const ready = fx && fx.idle() && b.turn === 'me' && !b.over;
    const o = ready ? B.options(s) : null;
    const shownHp = fx?.shown.get('me')?.hp ?? me.hp;
    const order = B.upcoming(b, 7).map((id) => B.unitOf(b, id)).filter(Boolean);
    const menu = ui.fightMenu && o
      ? h('div.fight-menu', (ui.fightMenu === 'skills' ? o.skills : o.items).map((k) =>
          h('button.fight-opt', {
            disabled: !!k.why,
            onclick: () => (ui.fightMenu === 'skills'
              ? k.self ? fightDo({ kind: 'skill', id: k.id }) : fightAimAt({ kind: 'skill', id: k.id })
              : fightDo({ kind: 'item', id: k.id })),
          },
          h('b', k.name),
          ui.fightMenu === 'skills' ? h('span.cost', k.mp ? `靈力 ${k.mp}` : '') : h('span.cost', `×${k.n}`),
          h('span.why', k.why || k.desc || (k.all ? '所有對手' : '服下')),
          )))
      : null;
    const btn = (label, onclick, { disabled = false, on = false, sub = null } = {}) =>
      h('button.fight-btn' + (on ? '.on' : ''), { disabled: !ready || disabled, onclick }, h('b', label), sub ? h('span', sub) : null);
    const enter = !ui.fightShown;
    ui.fightShown = true;
    return h('div.fight-panel' + (enter ? '.enter' : ''), { role: 'region', 'aria-label': '戰鬥' },
      b.over ? null : h('div.fight-order', order.map((u, k) => h('span.' + (u.side === 'foe' ? 'foe' : 'ally') + (k === 0 && b.turn ? '.now' : ''), u.side === 'me' ? '你' : u.name))),
      h('p.fight-say', fx?.text || (ready ? '輪到你出手。' : '')),
      h('div.fight-me',
        h('div.fight-stat', h('small', '氣血'), h('div.bar.fight-hp', h('i', { style: { width: `${Math.max(0, (shownHp / me.maxHp) * 100)}%` } })), h('span.fight-hp-n', `${shownHp} / ${me.maxHp}`)),
        me.maxMp ? h('div.fight-stat', h('small', '靈力'), bar(me.mp, me.maxMp, 'fight-mp'), h('span', `${me.mp} / ${me.maxMp}`)) : null,
      ),
      ui.fightAim ? h('div.fight-aim', h('span', '點一下要出手的對手'), h('button.btn.small.ghost', { onclick: () => { ui.fightAim = null; ui.fightKey = null; } }, '取消')) : menu,
      b.over && fx?.idle()
        ? h('div.fight-stamp.' + b.over, { win: '勝', lose: '敗', flee: '走' }[b.over])
        : h('div.fight-acts',
            btn(B.attackName(s), () => fightAimAt({ kind: 'attack' })),
            btn('招式', () => { ui.fightMenu = ui.fightMenu === 'skills' ? null : 'skills'; ui.fightKey = null; }, { disabled: !o?.skills.length, on: ui.fightMenu === 'skills' }),
            btn('物品', () => { ui.fightMenu = ui.fightMenu === 'items' ? null : 'items'; ui.fightKey = null; }, { disabled: !o?.items.length, on: ui.fightMenu === 'items' }),
            btn('防禦', () => fightDo({ kind: 'defend' })),
            btn('後退', () => fightDo({ kind: 'back' }), { disabled: !o?.canBack }),
            b.spar ? null : btn('逃跑', () => fightDo({ kind: 'flee' }), { sub: o ? `${Math.round(o.flee * 100)}%` : null }),
          ),
    );
  }

  function eventPicture(pend) {
    const img = pend.id && asset(`event/${pend.id}`);
    if (!img) return null;
    return h('img.event-pic', { src: img.src, alt: '' });
  }

  function eventSheet() {
    const s = ui.s;
    const pend = s.pending;
    const pre = pend.pre;
    const preBits = [];
    if (pre?.days) preBits.push(`經過 ${fmtDuration(pre.days)}`);
    if (pre?.xw) preBits.push(`修為 +${pre.xw}`);
    const sheet = h('div.sheet.event-sheet', { role: 'dialog', 'aria-label': pend.title },
      h('div.sheet-inner',
        eventPicture(pend),
        h('h2.sheet-title', pend.title),
        preBits.length ? h('p.pre', preBits.join('・')) : null,
        pre?.stageUps?.length ? h('p.pre.good', `境界提升：${pre.stageUps.join('、')}`) : null,
        systemLines(pre?.toasts),
        h('div.story', paragraphs(pend.text)),
        pend.notice ? chipList(pend.chips) : chipList(pend.enterChips),
        systemLines(pend.toasts),
        pend.notice ? h('button.btn.primary.wide', { onclick: () => act(continueEvent) }, '繼續') : null,
        !pend.notice && !pend.result
          ? h('div.choices', pend.choices.map((c) =>
              h('button.choice', { disabled: !!c.disabled, onclick: () => act((x) => choose(x, c.i)) },
                h('span.ctext', c.text),
                c.disabled ? h('span.why', c.disabled) : null,
                c.fight ? h('span.hint.fight', '戰') : null,
                c.hint ? h('span.hint.' + c.hint.kind, c.hint.label) : null,
                c.hint?.karma ? h('span.hint.karma', '因果') : null,
              )))
          : null,
        !pend.notice && pend.result ? resultBlock(pend.result) : null,
      ),
    );
    requestAnimationFrame(() => {
      const r = sheet.querySelector('.result');
      if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return sheet;
  }

  function resultBlock(r) {
    return h('div.result',
      r.check?.fight ? h('p.check.' + (r.check.ok ? 'ok' : 'fail'), { win: '戰鬥：勝', lose: '戰鬥：敗', flee: '戰鬥：脫身' }[r.check.fight])
        : r.check ? h('p.check.' + (r.check.ok ? 'ok' : 'fail'), `${r.check.kind}檢定 ${r.check.ok ? '成功' : '失敗'}（${Math.round(r.check.p * 100)}%）`) : null,
      r.text ? h('div.story', paragraphs(r.text)) : null,
      chipList(r.chips),
      systemLines(r.toasts),
      h('button.btn.primary.wide', { onclick: () => act(continueEvent) }, r.died ? '……' : '繼續'),
    );
  }

  function deathScreen() {
    const s = ui.s;
    const sum = A.lifeSummary(s);
    return h('div.death',
      h('div.death-inner',
        h('h2', '身死道消'),
        h('p.epitaph', `${sum.name}，享年 ${sum.age} 歲，止步${sum.realm}。`),
        h('p.muted', `死因：${sum.cause}`),
        h('ul.loglist.long', s.log.slice(0, 12).map((l) => h('li', h('time', fmtDate(l.day, { withDay: false })), l.text))),
        h('p.muted.small', '叮——宿主生命體徵消失。正在搜尋新的綁定對象……'),
        h('button.btn.primary.wide', { onclick: reincarnate }, '輪迴轉世'),
      ),
    );
  }

  function reincarnate() {
    const s = ui.s;
    const old = loadMeta() || { past: [] };
    const meta = {
      sysExp: s.sys.exp,
      frags: s.sys.frags,
      past: [...(old.past || []), A.lifeSummary(s)],
    };
    storeMeta(meta);
    forgetSave();
    ui.s = null;
    stopWorld();
    beginCreate(meta);
  }

  // ── the map ──
  function mapSheet() {
    const s = ui.s;
    const w = s.world;
    const thumb = worldThumb();
    const width = Math.min(560, window.innerWidth) - 24;
    const height = Math.round(Math.min(window.innerHeight * 0.56, width * 1.05));
    const m = ui.map || (ui.map = { scale: 0.14, cx: w.x, cy: w.y, sel: null });
    if (!ui.mapOpenedAt || ui.mapOpenedAt !== s.day + w.x) {
      m.cx = w.x;
      m.cy = w.y;
      ui.mapOpenedAt = s.day + w.x;
    }
    const cv = h('canvas.bigmap', { width: Math.round(width * 2), height: Math.round(height * 2), style: { width: width + 'px', height: height + 'px' } });
    const info = h('div.map-info');
    const fog = fogImage(s);

    function draw() {
      const g = cv.getContext('2d');
      const k = m.scale * 2;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#f1eee6';
      g.fillRect(0, 0, cv.width, cv.height);
      g.setTransform(k, 0, 0, k, cv.width / 2 - m.cx * k, cv.height / 2 - m.cy * k);
      g.drawImage(thumb, 0, 0, WORLD_W, WORLD_H);
      g.imageSmoothingEnabled = true;
      g.drawImage(fog, 0, 0, WORLD_W, WORLD_H);
      // places you have heard of or been to
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const [id, n] of Object.entries(NODES)) {
        if (!s.nodes[id]?.known) continue;
        const [lx, ly] = n.label || n.at || [];
        if (lx === undefined || id === 'hidden_cave') continue;
        g.font = `700 ${Math.round(26 / m.scale / 2)}px 'LXGW WenKai TC', serif`;
        const label = n.name + (s.nodes[id].visited ? '' : '？');
        g.lineWidth = 6 / m.scale / 2;
        g.strokeStyle = 'rgba(241,238,230,0.9)';
        g.strokeText(label, lx, ly);
        g.fillStyle = s.nodes[id].visited ? 'rgba(35,32,27,0.95)' : 'rgba(120,60,50,0.85)';
        g.fillText(label, lx, ly);
      }
      // places you have found
      for (const p of POIS) {
        if (!p.verb || !E.poiVisible(s, p) || !isRevealed(s, p.x, p.y)) continue;
        g.fillStyle = 'rgba(35,32,27,0.8)';
        g.beginPath();
        g.arc(p.x, p.y, 3.5 / m.scale / 2, 0, Math.PI * 2);
        g.fill();
        if (m.scale > 0.22) {
          g.font = `${Math.round(18 / m.scale / 2)}px 'LXGW WenKai TC', serif`;
          g.fillStyle = 'rgba(35,32,27,0.8)';
          g.fillText(E.poiName(s, p), p.x, p.y - 16 / m.scale / 2);
        }
      }
      // where you are going
      if (m.sel) {
        g.strokeStyle = 'rgba(168,50,42,0.9)';
        g.lineWidth = 3 / m.scale / 2;
        g.beginPath();
        g.arc(m.sel[0], m.sel[1], 14 / m.scale / 2, 0, Math.PI * 2);
        g.stroke();
      }
      // you
      g.fillStyle = '#a8322a';
      g.beginPath();
      g.arc(w.x, w.y, 9 / m.scale / 2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#f7efe1';
      g.lineWidth = 3 / m.scale / 2;
      g.stroke();
    }

    function select(x, y) {
      m.sel = [x, y];
      draw();
      clear(info);
      const region = regionIdAt(x, y);
      const known = isRevealed(s, x, y) || s.nodes[region]?.known;
      const name = known ? NODES[region]?.name || '野外' : '雲霧之中';
      const path = findPath(s, w.x, w.y, x, y);
      let len = 0;
      if (path) {
        let px = w.x;
        let py = w.y;
        for (const [qx, qy] of path) {
          len += Math.hypot(qx - px, qy - py);
          px = qx;
          py = qy;
        }
      }
      const hours = len / E.UNITS_PER_HOUR;
      put(info, 
        h('div.row-between', h('b', name), path ? h('span.muted.small', hours < 1 ? '不到一個時辰的路' : `約 ${Math.max(1, Math.round(hours / 2))} 個時辰的路`) : null),
        path
          ? h('button.btn.primary.wide', { onclick: () => { E.walkTo(s, x, y); closeSheet(); } }, '走過去')
          : h('p.muted', '從這裡走不過去。也許還有別的路，也許沒有。'),
      );
    }

    // pan, pinch, tap
    const pts = new Map();
    let gesture = null;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const vals = [...pts.values()];
      gesture = vals.length === 2
        ? { pinch: Math.hypot(vals[0].x - vals[1].x, vals[0].y - vals[1].y), scale: m.scale }
        : { x: e.clientX, y: e.clientY, cx: m.cx, cy: m.cy, moved: false };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId) || !gesture) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const vals = [...pts.values()];
      if (gesture.pinch && vals.length === 2) {
        m.scale = Math.max(0.06, Math.min(0.5, gesture.scale * (Math.hypot(vals[0].x - vals[1].x, vals[0].y - vals[1].y) / gesture.pinch)));
        draw();
      } else if (!gesture.pinch) {
        const dx = e.clientX - gesture.x;
        const dy = e.clientY - gesture.y;
        if (Math.hypot(dx, dy) > 6) gesture.moved = true;
        m.cx = Math.max(0, Math.min(WORLD_W, gesture.cx - dx / m.scale));
        m.cy = Math.max(0, Math.min(WORLD_H, gesture.cy - dy / m.scale));
        draw();
      }
    });
    cv.addEventListener('pointerup', (e) => {
      const g = gesture;
      pts.delete(e.pointerId);
      if (pts.size === 0) gesture = null;
      if (g && !g.pinch && !g.moved) {
        const rect = cv.getBoundingClientRect();
        const x = m.cx + (e.clientX - rect.left - rect.width / 2) / m.scale;
        const y = m.cy + (e.clientY - rect.top - rect.height / 2) / m.scale;
        select(x, y);
      }
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      m.scale = Math.max(0.06, Math.min(0.5, m.scale * (e.deltaY > 0 ? 0.9 : 1.1)));
      draw();
    }, { passive: false });
    requestAnimationFrame(draw);

    const known = Object.keys(NODES).filter((id) => s.nodes[id]?.known && NODES[id].at && id !== s.player.loc && (id !== 'hidden_cave' || s.flags.cave_found));
    put(info, h('p.muted.small', '拖動地圖查看，點一個地方，選「走過去」。路上遇到什麼，就是什麼。'));
    return h('div.sheet.map-sheet', { role: 'dialog', 'aria-label': '地圖' },
      h('div.sheet-head', h('h2.sheet-title', '東荒・青石一帶'), h('button.btn.small.ghost', { onclick: closeSheet }, '關閉')),
      h('div.sheet-body',
        cv,
        h('div.map-zoom',
          h('button.btn.small', { onclick: () => { m.scale = Math.min(0.5, m.scale * 1.4); draw(); } }, '＋'),
          h('button.btn.small', { onclick: () => { m.scale = Math.max(0.06, m.scale / 1.4); draw(); } }, '－'),
          h('button.btn.small', { onclick: () => { m.cx = w.x; m.cy = w.y; draw(); } }, '回到自己'),
        ),
        info,
        known.length
          ? h('div.map-places',
              h('h3', '知道的地方'),
              h('div.place-chips', known.map((id) => h('button.btn.small', { onclick: () => { m.cx = NODES[id].at[0]; m.cy = NODES[id].at[1]; select(...NODES[id].at); } }, NODES[id].name))))
          : null,
      ),
    );
  }

  /** The clouds as a small image: white where unseen. */
  function fogImage(s) {
    const f = fogOf(s);
    const c = document.createElement('canvas');
    c.width = COLS;
    c.height = ROWS;
    const g = c.getContext('2d');
    const img = g.createImageData(COLS, ROWS);
    for (let k = 0; k < f.bits.length; k++) {
      img.data[k * 4] = 241;
      img.data[k * 4 + 1] = 238;
      img.data[k * 4 + 2] = 230;
      img.data[k * 4 + 3] = f.bits[k] ? 0 : 245;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  boot();
  return ui;
}
