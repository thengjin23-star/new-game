import { h, paragraphs, clear } from './dom.js';
import { createScene } from '../art/ink.js';
import { newGame, rollFate, ORIGINS, ATTRS, attrWord } from '../core/state.js';
import { startEvent, choose, continueEvent } from '../core/events.js';
import * as A from '../core/actions.js';
import { ROOTS, INJURY, BUFFS, realmLabel, stageReq, age, lifespan, rateParts, breakthroughInfo, power, atBottleneck, techOf } from '../core/cultivation.js';
import { fmtDate, fmtDuration, seasonOf, SEASON_NAME } from '../core/calendar.js';
import { NODES, route, knownEdges, canSecludeAt, EDGES } from '../world/map.js';
import { ITEMS, displayItem } from '../content/items.js';
import { TECHS } from '../content/techniques.js';
import { FRAGMENTS, FRAGMENT_TOTAL } from '../content/fragments.js';
import { SYS_LEVELS, SYS_FEATURES } from '../world/system.js';
import { npcAge, npcRealm, NAMED } from '../world/npcs.js';
import { saveGame, loadGame, clearGame, exportCode, importCode, migrate, saveMeta, loadMeta, parseSave } from '../core/save.js';
import { connectCloud } from '../platform/cloud.js';

const KIND_NAME = { town: '凡人城鎮', mountain: '山野', temple: '道觀', market: '修士坊市', forest: '密林', valley: '靈谷', sect: '宗門', ruins: '上古遺跡', shrine: '荒廟', ferry: '渡口', cave: '洞府' };
const ITEM_ORDER = ['pill', 'herb', 'material', 'book', 'weapon', 'treasure', 'talisman', 'token', 'unknown'];
const ITEM_KIND = { pill: '丹藥', herb: '靈草', material: '材料', book: '典籍', weapon: '兵器', treasure: '寶物', talisman: '符籙', token: '信物', unknown: '未知' };
const TABS = [
  ['here', '此地'],
  ['cult', '修煉'],
  ['bag', '行囊'],
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

export function startApp(root, { speed = 1 } = {}) {
  const ui = {
    s: null,
    tab: 'here',
    logTab: 'rumors',
    mapOpen: false,
    mapSel: null,
    pills: 0,
    panel: null, // export | import | reset
    create: null,
    scene: null,
    titleScene: null,
    timer: 0,
    cloud: null,
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
          ui.s = s;
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

  function act(fn) {
    if (!ui.s) return;
    fn(ui.s);
    persist();
    render();
  }

  // ── boot ──
  function boot() {
    const s = loadGame();
    if (s) {
      ui.s = s;
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
        render();
      } else persist({ now: true });
    });
    window.addEventListener('resize', () => {
      ui.scene?.resize();
      ui.titleScene?.resize();
    });
  }

  function tick() {
    const s = ui.s;
    if (!s?.secl) return;
    const ended = A.tickSeclusion(s, Date.now());
    if (ended) {
      persist();
      render();
    } else {
      updateLive();
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
    ui.scene?.stop();
    ui.scene = null;
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
            hasSave ? h('button.btn.primary', { onclick: () => { ui.s = loadGame(); ui.tab = 'here'; render(); } }, '繼續修行') : null,
            h('button.btn' + (hasSave ? '' : '.primary'), { onclick: () => beginCreate(meta) }, hasSave ? '開始新的一生' : '踏入仙途'),
            h('button.btn.ghost', { onclick: () => { ui.panel = 'import-title'; renderTitle(); } }, '匯入存檔'),
          ),
          ui.panel === 'import-title' ? importBox(() => { ui.panel = null; }) : null,
          meta?.past?.length ? h('p.past-lives', `前世 ${meta.past.length} 次。系統記得你。`) : null,
          h('p.version', '試玩版 0.1 ・ 第一章「東荒」'),
        ),
      ),
    );
    ui.titleScene?.stop();
    ui.titleScene = createScene(canvas);
    requestAnimationFrame(() => {
      ui.titleScene.set({ kind: 'mountain', seed: 3012, season: seasonOf(new Date().getMonth() * 30), pose: 'stand' });
      ui.titleScene.start();
    });
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
    startEvent(s, 'intro_fall');
    ui.s = s;
    ui.create = null;
    ui.tab = 'here';
    persist();
    render();
  }

  // ── game ──
  function renderGame() {
    ui.titleScene?.stop();
    ui.titleScene = null;
    const s = ui.s;
    let shell = root.querySelector('.game');
    if (!shell) {
      clear(root);
      shell = h('div.game',
        h('header.top'),
        h('div.scene-wrap', h('canvas.scene', { 'aria-label': '當前所在地的水墨景色' }), h('div.scene-overlay')),
        h('main.panel'),
        h('nav.tabs'),
        h('div.layer'),
      );
      root.appendChild(shell);
      ui.scene = createScene(shell.querySelector('canvas.scene'));
    }
    renderTop(shell.querySelector('header.top'));
    const showScene = ui.tab === 'here' || ui.tab === 'cult';
    const wrap = shell.querySelector('.scene-wrap');
    wrap.hidden = !showScene;
    wrap.classList.toggle('short', ui.tab === 'cult');
    renderSceneOverlay(shell.querySelector('.scene-overlay'));
    if (showScene) {
      requestAnimationFrame(() => {
        ui.scene.resize();
        ui.scene.set({ kind: NODES[s.player.loc].kind, seed: hashSeed(s.player.loc, s.seed), season: seasonOf(s.day), pose: s.secl ? 'sit' : 'stand' });
        ui.scene.start();
      });
    } else ui.scene.stop();
    const viewingRumors = ui.tab === 'log' && ui.logTab === 'rumors';
    const unreadNow = viewingRumors ? new Set(s.rumors.filter((r) => !r.read)) : null;
    const panel = shell.querySelector('main.panel');
    const scrollKeep = ui.lastTab === ui.tab ? panel.scrollTop : 0;
    clear(panel);
    panel.appendChild(
      { here: panelHere, cult: panelCult, bag: panelBag, log: panelLog, sys: panelSys }[ui.tab](),
    );
    panel.scrollTop = scrollKeep;
    ui.lastTab = ui.tab;
    // Rumors on screen count as read (they stay bold until the next visit).
    if (unreadNow?.size) {
      for (const r of unreadNow) r.read = true;
      persist();
    }
    renderTabs(shell.querySelector('nav.tabs'));
    renderLayer(shell.querySelector('.layer'));
  }

  function hashSeed(loc, seed) {
    let x = seed | 0;
    for (const ch of loc) x = (x * 31 + ch.charCodeAt(0)) | 0;
    return x;
  }

  function renderTop(el) {
    const s = ui.s;
    const p = s.player;
    const req = stageReq(s);
    const neck = atBottleneck(s);
    clear(el);
    el.append(
      h('div.top-row',
        h('span.pname', p.name),
        h('span.realm', realmLabel(p)),
        h('span.ls', { title: '靈石' }, h('i.gem'), String(p.ls)),
      ),
      h('div.top-row.sub',
        h('span', fmtDate(s.day)),
        h('span', `${Math.floor(age(s))} / ${lifespan(s)} 歲`),
      ),
      h('div.xw',
        bar(p.xw, req, neck ? 'full' : ''),
        h('span.xw-label', { 'data-live': 'xw' }, neck ? `修為圓滿・可突破` : `修為 ${Math.floor(p.xw)} / ${req}`),
      ),
      h('div.flags',
        s.secl ? h('span.pill.calm', '閉關中') : null,
        p.injury ? h('span.pill.bad', INJURY[p.injury].name) : null,
        Object.keys(p.buffs).filter((b) => BUFFS[b]).map((b) => h('span.pill.good', BUFFS[b].name)),
      ),
    );
  }

  function renderSceneOverlay(el) {
    const s = ui.s;
    clear(el);
    el.append(
      h('div.place-seal', NODES[s.player.loc].name),
      h('div.season-tag', SEASON_NAME[seasonOf(s.day)]),
    );
  }

  function renderTabs(el) {
    const s = ui.s;
    clear(el);
    const unread = s.rumors.filter((r) => !r.read).length;
    const badges = {
      cult: atBottleneck(s) || s.secl ? 'dot' : '',
      log: unread ? String(Math.min(99, unread)) : '',
      sys: A.deduceReady(s) ? 'dot' : '',
    };
    for (const [id, label] of TABS) {
      const b = badges[id];
      el.appendChild(
        h('button.tab' + (ui.tab === id ? '.on' : ''), { onclick: () => { ui.tab = id; ui.mapOpen = false; render(); } },
          label, b === 'dot' ? h('span.badge.dot', { 'aria-label': '有新動靜' }) : b ? h('span.badge', b) : null),
      );
    }
  }

  // ── 此地 ──
  function panelHere() {
    const s = ui.s;
    const node = NODES[s.player.loc];
    const st = s.nodes[s.player.loc];
    const busy = !!s.secl;
    const people = Object.values(s.npcs).filter((n) => n.alive && n.met && n.loc === s.player.loc);
    const shop = A.shopHere(s);
    const blocker = canSecludeAt(s, s.player.loc);
    return h('div.here',
      h('section.place',
        h('div.place-head', h('h2', node.name), h('span.kind', KIND_NAME[node.kind] || ''), h('span.danger', { title: '危險' }, '危', '●'.repeat(node.danger) + '○'.repeat(4 - node.danger))),
        h('p.desc', node.desc),
        h('div.explore', h('span', '探索'), bar(st.explore, 100), h('span.num', st.explore + '%')),
      ),
      busy ? h('p.note', '你正在閉關。到「修煉」頁可以提前出關。') : null,
      h('div.actions',
        actionBtn('探索', '2–4 天', () => act(A.explore), busy),
        node.inquire ? actionBtn('打聽', '1 天', () => act(A.inquire), busy) : null,
        actionBtn('前往', '地圖', () => { ui.mapOpen = true; ui.mapSel = null; render(); }, busy),
        actionBtn('閉關', blocker ? '此地不宜' : '修煉頁', () => { ui.tab = 'cult'; render(); }, false),
        shop ? actionBtn('交易', shop.name, () => { ui.tab = 'bag'; render(); }, busy) : null,
      ),
      people.length
        ? h('section.people',
            h('h3', '此地的人'),
            people.map((n) =>
              h('button.person', { disabled: busy, onclick: () => act((x) => A.visit(x, n.id)) },
                seal(n.name[0]),
                h('span.pinfo', h('b', n.name), h('span', n.title)),
                h('span.pact', '拜訪'),
              )),
          )
        : null,
      h('section.recent',
        h('h3', '近況'),
        s.log.length ? h('ul.loglist', s.log.slice(0, 5).map((l) => h('li', h('time', fmtDate(l.day, { withDay: false })), l.text))) : h('p.muted', '一切才剛開始。'),
      ),
    );
  }

  function actionBtn(label, sub, onclick, disabled) {
    return h('button.action', { onclick, disabled }, h('b', label), h('span', sub));
  }

  // ── 修煉 ──
  function panelCult() {
    const s = ui.s;
    const p = s.player;
    const rp = rateParts(s);
    const tech = techOf(s);
    const left = lifespan(s) - age(s);
    const wrap = h('div.cult');
    wrap.append(
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
    if (s.secl) wrap.append(seclusionCard());
    else if (atBottleneck(s)) wrap.append(breakthroughCard());
    else wrap.append(seclusionOptions());
    wrap.append(statusCard(), techCard());
    return wrap;
  }

  function seclusionCard() {
    const x = ui.s.secl;
    return h('section.card.secl',
      h('h3', `於${NODES[x.node].name}閉關`),
      h('div', { 'data-live': 'secl-bar' }, bar(x.done, x.days, 'calm')),
      h('p', { 'data-live': 'secl-text' }, seclText()),
      h('p.muted.small', '關掉遊戲也會繼續。時間到了，回來就能出關。'),
      h('button.btn', { onclick: () => act((s) => A.endSeclusionEarly(s, Date.now())) }, '提前出關'),
    );
  }

  function seclText() {
    const x = ui.s.secl;
    const remain = (x.days - x.done) * x.msPerDay - ((Date.now() - x.start) % x.msPerDay);
    return `已閉關 ${fmtDuration(x.done)} / ${fmtDuration(x.days)}・修為 +${Math.round(x.xw)}・還需${realTime(Math.max(0, remain))}`;
  }

  function updateLive() {
    const s = ui.s;
    if (!s?.secl) return;
    const t = root.querySelector('[data-live="secl-text"]');
    if (t) t.textContent = seclText();
    const b = root.querySelector('[data-live="secl-bar"]');
    if (b) {
      clear(b);
      b.appendChild(bar(s.secl.done, s.secl.days, 'calm'));
    }
    const top = root.querySelector('header.top');
    if (top) renderTop(top);
  }

  function seclusionOptions() {
    const s = ui.s;
    const blocker = A.seclusionBlocker(s);
    const rate = rateParts(s).total;
    return h('section.card',
      h('h3', '閉關'),
      blocker
        ? h('p.warn', blocker)
        : h('div.secl-opts', A.SECLUSION_OPTIONS.map((o) =>
            h('button.secl-opt', { onclick: () => act((x) => A.startSeclusion(x, o.days, Date.now(), speed)) },
              h('b', o.label),
              h('span', `修為約 +${Math.round(rate * o.days)}`),
              h('span', `出關 ${Math.floor(age(s) + o.days / 360)} 歲`),
              h('span.real', realTime((o.days * A.MS_PER_DAY) / speed)),
            ))),
      h('p.muted.small', '閉關時世界照常運轉。你不在的時候，故事也在發生。'),
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
            h('button.btn.small' + (ui.pills === n ? '.on' : ''), { onclick: () => { ui.pills = n; render(); } }, n === 0 ? '不用' : `${n} 顆`)))
        : null,
      info.kind === 'major' && p.realm >= 1 ? h('p.muted.small', '失敗會損失修為、受傷、心境下降；用掉的丹藥不會回來。') : null,
      h('button.btn.primary', { onclick: () => act((x) => A.attemptBreakthrough(x, ui.pills)) }, p.realm === 0 ? '引氣入體' : '衝擊瓶頸'),
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
      wrap.append(
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
    wrap.append(
      h('section.card',
        h('h3', `行囊・靈石 ${p.ls}`),
        ids.length
          ? h('ul.items', ids.map((id) => itemRow(id, shop)))
          : h('p.muted', '行囊空空如也。'),
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
    const s = ui.s;
    const subs = [
      ['rumors', '傳聞'],
      ['people', '人物'],
      ['places', '地點'],
      ['life', '生平'],
      ['frags', '殘頁'],
    ];
    const body = { rumors: logRumors, people: logPeople, places: logPlaces, life: logLife, frags: logFrags }[ui.logTab]();
    return h('div.logpage',
      h('div.subtabs', subs.map(([id, label]) => h('button.subtab' + (ui.logTab === id ? '.on' : ''), { onclick: () => { ui.logTab = id; render(); } }, label))),
      body,
    );
  }

  function logRumors() {
    const s = ui.s;
    if (!s.rumors.length) return h('p.muted.pad', '還沒聽到什麼傳聞。去人多的地方「打聽」看看。');
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
          h('p.muted.small', n.alive ? `${npcRealm(n)}・${npcAge(s, n)} 歲・${favorWord(n.favor)}` : `已故・${favorWord(n.favor)}`),
          h('p', n.named ? NAMED[n.id].bio : `性情${n.trait}。相識於${NODES[n.metAt]?.name || '路上'}。`),
        ),
      )));
  }

  function logPlaces() {
    const s = ui.s;
    const ids = Object.keys(NODES).filter((id) => s.nodes[id].known);
    return h('ul.places', ids.map((id) =>
      h('li',
        h('div.row-between', h('b', NODES[id].name), h('span.muted.small', s.nodes[id].visited ? `探索 ${s.nodes[id].explore}%` : '未曾去過')),
        h('p', NODES[id].desc),
      )));
  }

  function logLife() {
    const s = ui.s;
    return h('div',
      h('p.muted.pad', `${s.player.name}，${ORIGINS[s.player.origin].name}，第 ${s.meta.life} 世。`),
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
        h('p.muted.small', next ? `見聞 ${sys.exp} / ${next}。發現新地點、結識人物、目睹大事，都能增長見聞。` : `見聞 ${sys.exp}。`),
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
            h('button.btn', { disabled: !A.deduceReady(s), onclick: () => act(A.deduce) }, A.deduceReady(s) ? '推演' : '天機尚未恢復'),
          )
        : null,
      h('section.card',
        h('h3', '存檔'),
        h('p.muted.small', '遊戲會自動存在這台裝置上。換手機或清除瀏覽資料前，記得匯出存檔碼。'),
        h('div.btn-row',
          h('button.btn.small', { onclick: () => { ui.panel = ui.panel === 'export' ? null : 'export'; render(); } }, '匯出存檔'),
          h('button.btn.small', { onclick: () => { ui.panel = ui.panel === 'import' ? null : 'import'; render(); } }, '匯入存檔'),
          h('button.btn.small.ghost', { onclick: () => { ui.panel = ui.panel === 'reset' ? null : 'reset'; render(); } }, '重新開始'),
        ),
        ui.panel === 'export' ? exportBox() : null,
        ui.panel === 'import' ? importBox(() => { ui.panel = null; }) : null,
        ui.panel === 'reset'
          ? h('div.confirm',
              h('p', '確定要放棄這一世，從頭開始嗎？目前的存檔會被刪除。'),
              h('div.btn-row',
                h('button.btn.small', { onclick: () => { ui.panel = null; render(); } }, '再想想'),
                h('button.btn.small.danger', { onclick: () => { forgetSave(); ui.s = null; ui.panel = null; root.querySelector('.game')?.remove(); render(); } }, '確定重來'),
              ))
          : null,
      ),
      h('p.version.pad', '一介散修 試玩版 0.1'),
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
              ui.s = s;
              persist();
              done?.();
              ui.tab = 'here';
              render();
            } catch {
              msg.textContent = '這不是有效的存檔碼。請確認整段都複製到了。';
            }
          },
        }, '匯入'),
      ), msg);
  }

  // ── overlays: event sheet, map, death ──
  function renderLayer(el) {
    const s = ui.s;
    clear(el);
    if (s.pending) el.appendChild(eventSheet());
    else if (s.dead) el.appendChild(deathScreen());
    else if (ui.mapOpen) el.appendChild(mapSheet());
    el.classList.toggle('open', el.childElementCount > 0);
  }

  function eventSheet() {
    const s = ui.s;
    const pend = s.pending;
    const pre = pend.pre;
    const preBits = [];
    if (pre?.days) preBits.push(`經過 ${fmtDuration(pre.days)}`);
    if (pre?.xw) preBits.push(`修為 +${pre.xw}`);
    const sheet = h('div.sheet', { role: 'dialog', 'aria-label': pend.title },
      h('div.sheet-inner',
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
      r.check ? h('p.check.' + (r.check.ok ? 'ok' : 'fail'), `${r.check.kind}檢定 ${r.check.ok ? '成功' : '失敗'}（${Math.round(r.check.p * 100)}%）`) : null,
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
    root.querySelector('.game')?.remove();
    beginCreate(meta);
  }

  function mapSheet() {
    const s = ui.s;
    const here = s.player.loc;
    const sel = ui.mapSel;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '-6 -4 112 108');
    svg.setAttribute('class', 'map-svg');
    const mk = (tag, attrs, text) => {
      const e = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      if (text) e.textContent = text;
      svg.appendChild(e);
      return e;
    };
    for (const [a, b, d] of knownEdges(s)) {
      const A1 = NODES[a];
      const B1 = NODES[b];
      mk('line', { x1: A1.x, y1: A1.y, x2: B1.x, y2: B1.y, class: 'edge' });
      mk('text', { x: (A1.x + B1.x) / 2, y: (A1.y + B1.y) / 2 - 1, class: 'edge-days' }, `${d}日`);
    }
    // unknown places next to visited ones show as a question mark
    for (const [a, b] of EDGES) {
      for (const [k, u] of [[a, b], [b, a]]) {
        if (s.nodes[k].visited && !s.nodes[u].known) mk('text', { x: NODES[u].x, y: NODES[u].y + 2, class: 'unknown' }, '？');
      }
    }
    for (const [id, n] of Object.entries(NODES)) {
      if (!s.nodes[id].known) continue;
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'node' + (id === here ? ' here' : '') + (s.nodes[id].visited ? ' visited' : '') + (sel === id ? ' sel' : ''));
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', n.name);
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', n.x);
      c.setAttribute('cy', n.y);
      c.setAttribute('r', id === here ? 3.4 : 2.6);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', n.x);
      t.setAttribute('y', n.y + 7.2);
      t.textContent = n.name;
      const hit = document.createElementNS(ns, 'circle');
      hit.setAttribute('cx', n.x);
      hit.setAttribute('cy', n.y + 2);
      hit.setAttribute('r', 7);
      hit.setAttribute('class', 'hit');
      g.append(hit, c, t);
      const pickNode = () => { ui.mapSel = id; render(); };
      g.addEventListener('click', pickNode);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') pickNode(); });
      svg.appendChild(g);
    }
    const info = sel
      ? (() => {
          const r = route(s, here, sel);
          const n = NODES[sel];
          return h('div.map-info',
            h('div.row-between', h('b', n.name), h('span.muted.small', `${KIND_NAME[n.kind]}・危${'●'.repeat(n.danger)}${'○'.repeat(4 - n.danger)}`)),
            h('p', n.desc),
            sel === here
              ? h('p.muted', '你在這裡。')
              : r
                ? h('button.btn.primary.wide', { onclick: () => { ui.mapOpen = false; act((x) => A.travel(x, sel)); } }, `前往（${fmtDuration(r.days)}）`)
                : h('p.muted', '不知道怎麼走過去。'),
          );
        })()
      : h('p.muted.small.pad', '點選地點查看。打問號的地方，還沒人告訴你那裡有什麼。');
    return h('div.sheet.map', { role: 'dialog', 'aria-label': '地圖' },
      h('div.sheet-inner',
        h('div.row-between', h('h2.sheet-title', '東荒・青石一帶'), h('button.btn.small.ghost', { onclick: () => { ui.mapOpen = false; render(); } }, '關閉')),
        svg,
        info,
      ),
    );
  }

  boot();
  return ui;
}
