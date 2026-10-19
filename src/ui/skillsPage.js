// 修煉 → 技能 (0.19): the sets you carry into a fight (four places each), the
// 心法 you hold, and the library of every move and 心法 there is — what is
// yours, what is not yet and what it would take. Tap a place, then a move to
// put in it (or a move, then a place): a move already in the set trades
// places with what was there; ✕ empties a place. (A drag of a card onto a
// place would ask a phone held sideways — and turned — for more than taps
// do, for the same thing.)
//
// The first page of the game's UI kept outside app.js: it is given what it
// needs (ctx) and builds its part of the page from it.

import { h } from './dom.js';
import * as SK from '../world/skills.js';
import { MOVES } from '../content/moves.js';
import { rectOf } from '../platform/orient.js';

const SET_NAME = ['第一組', '第二組', '第三組'];
const GLYPH = { line: '→', ground: '◎', self: '◯', dash: '»', around: '✺', seek: '↻', melee: '⚔', bolt: 'ϟ' };
const SCHOOL_TABS = ['全部', '通用', '劍修', '法修', '體修', '法器', '心法'];
const KIND_TABS = ['全部', '攻擊', '範圍', '控制', '身法', '護身', '療傷', '劍陣'];
const STATE_TABS = [['all', '全部'], ['known', '已學會'], ['locked', '未學會']];
const SORT_TABS = [['order', '預設'], ['mp', '靈力'], ['cd', '冷卻'], ['name', '名稱']];

/** A move's (or 心法's) seal: its first word on the colour of its element, how it goes off in the corner. */
export function skillIcon(m) {
  const passive = m.type === 'passive';
  return h('span.sk-icon' + (passive ? '.passive' : '') + (m.locked ? '.locked' : ''), { 'data-el': m.el || '', 'aria-hidden': 'true' },
    h('b', m.name[0]), h('i', passive ? '心' : GLYPH[m.aim] || ''));
}

const cdWord = (cd) => `${Math.round(cd * 10) / 10} 秒`;

/**
 * Once drawn again: if what sel finds is out of sight in the page, scroll the
 * page to it — a phone on its side shows little at once, and the places and
 * the moves to put in them are a long way apart. (In the page's own terms:
 * the phone may be held upright, the page turned.)
 */
function reveal(sel) {
  // (measured at once: the page has just been drawn again, and is laid out when asked)
  const el = document.querySelector(sel);
  const box = el?.closest('.sheet-body');
  if (!el || !box) return;
  const r = rectOf(el);
  const b = rectOf(box);
  if (r.top >= b.top && r.top <= b.bottom - 80) return;
  // (glided there by hand: a smooth scrollTo does nothing inside a turned page)
  const from = box.scrollTop;
  const to = Math.max(0, Math.min(box.scrollHeight - box.clientHeight, from + (r.top - b.top) - 8));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    box.scrollTop = to;
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const q = Math.min(1, (now - t0) / 260);
    box.scrollTop = from + (to - from) * (1 - (1 - q) ** 3);
    if (q < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** A move's numbers in a line. */
function moveLine(m) {
  return [m.school + (m.el ? `・${m.el}` : ''), SK.AIM_WORD[m.aim], m.mp ? `靈力 ${m.mp}` : '不耗靈力', `冷卻 ${cdWord(m.cd)}`].filter(Boolean).join('・');
}

/**
 * The page. ctx: { s, act(fn), redraw(), toast(text, kind), st } — st is the
 * page's own state between draws: set (the set being filled), slot (the place
 * picked), pick (the move picked), q, school, kind, state, sort.
 */
export function skillsPage(ctx) {
  const { s, st } = ctx;
  const hb = SK.hotbarState(s);
  const open = SK.setsOpen(s);
  if (!(st.set >= 0) || st.set >= open) st.set = hb.cur;
  const wrap = h('div.skills');
  wrap.appendChild(setsCard(ctx, open));
  wrap.appendChild(passivesCard(ctx));
  wrap.appendChild(wuxingNote(s));
  wrap.appendChild(libraryCard(ctx));
  return wrap;
}

/** 五行 and 連招, folded away: what the 剋 and the lit buttons in a fight mean. */
function wuxingNote(s) {
  const els = s.player.root?.els || [];
  return h('details.card.sk-note',
    h('summary', '五行相剋與相生連招'),
    h('p.small', '金剋木、木剋土、土剋水、水剋火、火剋金：招式剋得住對手（鈕下有「剋」字），傷得更重；被剋，傷得輕。'),
    h('p.small', '木生火、火生土、土生金、金生水、水生木：四息之內接上相生的下一招（那顆鈕會亮），威力更強，連三招更強。配招時，把能相生的放在同一組。'),
    els.length ? h('p.small.muted', `你的靈根是${els.join('、')}：同屬性的招式也順手些。`) : null,
  );
}

function setsCard(ctx, open) {
  const { s, st, act, redraw } = ctx;
  const hb = SK.hotbarState(s);
  const set = st.set;
  const slots = SK.hotbarOf(s, set);
  const auto = hb.sets[set].auto;
  const place = (i) => {
    const m = slots[i];
    const picked = st.slot === i;
    return h('div.sk-slot' + (picked ? '.sel' : '') + (m ? '' : '.empty') + (m?.locked ? '.locked' : ''),
      h('button.sk-slot-main', {
        type: 'button',
        'aria-label': `${SET_NAME[set]}第${i + 1}格${m ? `：${m.name}` : '（空）'}`,
        onclick: () => {
          if (st.pick) {
            const id = st.pick;
            st.pick = null;
            st.slot = null;
            act((x) => SK.assignSlot(x, set, i, id));
            return;
          }
          st.slot = picked ? null : i;
          redraw();
          if (st.slot !== null) reveal('.sk-hint');
        },
      },
      h('kbd', String(i + 1)),
      m ? skillIcon(m) : h('span.sk-icon.none', '＋'),
      h('span.sk-slot-name', m ? m.name : '空'),
      h('small', st.pick ? `放進「${MOVES[st.pick]?.name || ''}」` : m ? (m.locked ? '未解鎖' : `${m.mp ? `靈力 ${m.mp}` : '不耗靈力'}・${m.mastery}`) : picked ? '點下面的技能放進來' : '點一下選這格')),
      m ? h('button.sk-slot-x', { type: 'button', 'aria-label': `清空第${i + 1}格`, onclick: () => act((x) => SK.assignSlot(x, set, i, null)) }, '✕') : null,
    );
  };
  // (a move picked first: every place says it will take it)
  return h('section.card.sk-sets' + (st.pick ? '.placing' : ''),
    h('div.sk-head', h('h3', '快捷欄'), h('span.muted.small', `戰鬥時一次帶一組（${SK.SLOTS} 招），戰鬥中按「換組」鈕或 Tab 換另一組`)),
    h('div.subtabs.sk-set-tabs', Array.from({ length: SK.SETS }, (_, i) => {
      const lockedSet = i >= open;
      return h('button.subtab' + (i === set ? '.on' : '') + (lockedSet ? '.locked' : ''), {
        type: 'button',
        disabled: lockedSet,
        onclick: () => { st.set = i; st.slot = null; redraw(); },
      }, SET_NAME[i] + (i === hb.cur ? '・使用中' : lockedSet ? '（築基）' : ''));
    })),
    h('div.sk-slots', slots.map((_, i) => place(i))),
    h('div.btn-row.sk-set-acts',
      set !== hb.cur ? h('button.btn.small', { type: 'button', onclick: () => act((x) => SK.useSet(x, set)) }, '戰鬥時先用這組') : null,
      auto
        ? h('span.muted.small', '這組由系統自動配招：學會新招會自己換上。動手改一格，就由你來配。')
        : h('button.btn.small.ghost', { type: 'button', onclick: () => { st.slot = null; act((x) => SK.autoSet(x, set)); } }, '交給系統自動配招'),
    ),
  );
}

function passivesCard(ctx) {
  const { s, act } = ctx;
  const held = SK.heldPassives(s);
  const n = SK.passiveSlots(s);
  const lib = SK.libraryOf(s).passives;
  return h('section.card.sk-passives',
    h('div.sk-head', h('h3', '心法'), h('span.muted.small', n ? `可同時修持 ${n} 門（境界越高越多）；不必施放，一直生效` : '引氣入體之後，才能修持心法')),
    h('div.sk-held', Array.from({ length: Math.max(n, 1) }, (_, i) => {
      const id = held[i];
      const d = id && lib.find((x) => x.id === id);
      return d
        ? h('div.sk-held-one', skillIcon(d), h('b', d.name), h('button.sk-slot-x', { type: 'button', 'aria-label': `放下${d.name}`, onclick: () => act((x) => SK.holdPassive(x, id, false)) }, '✕'))
        : h('div.sk-held-one.empty', n ? '空：點下面的心法修持' : '尚未引氣入體');
    })),
  );
}

function libraryCard(ctx) {
  const { s, st, redraw } = ctx;
  const list = h('div.sk-list');
  const fill = () => {
    const passivesOnly = st.school === '心法';
    const q = { q: st.q || '', school: passivesOnly || st.school === '全部' ? null : st.school || null, kind: !passivesOnly && st.kind && st.kind !== '全部' ? st.kind : null, state: st.state && st.state !== 'all' ? st.state : null, sort: st.sort || 'order' };
    const lib = SK.libraryOf(s, q);
    // (the library narrows the 心法 the same way: by school, and out altogether for a kind of move)
    const moves = passivesOnly ? [] : lib.moves;
    const passives = lib.passives;
    list.replaceChildren(...[...moves.map((m) => moveCard(ctx, m)), ...passives.map((d) => passiveCard(ctx, d))]);
    if (!list.childElementCount) list.appendChild(h('p.muted.pad', '找不到合的技能。換個字，或放寬篩選。'));
    count.textContent = `${moves.length + passives.length} 項`;
  };
  const count = h('span.muted.small');
  const search = h('input.sk-search', {
    type: 'search',
    placeholder: '搜尋：名字、流派、五行、效果…',
    value: st.q || '',
    'aria-label': '搜尋技能',
    oninput: (e) => {
      // (only the list is drawn again: the box keeps its place and what is typed)
      st.q = e.target.value;
      fill();
    },
  });
  const chips = (label, tabs, key, dflt) =>
    h('div.sk-filter', h('span.muted.small', label), tabs.map((t) => {
      const [v, word] = Array.isArray(t) ? t : [t, t];
      const on = (st[key] || dflt) === v;
      return h('button.chip-btn' + (on ? '.on' : ''), { type: 'button', 'aria-pressed': String(on), onclick: () => { st[key] = v; redraw(); } }, word);
    }));
  const card = h('section.card.sk-library',
    h('div.sk-head', h('h3', '技能收藏庫'), count),
    search,
    chips('流派', SCHOOL_TABS, 'school', '全部'),
    // (心法 have no kind of move to narrow them by)
    st.school === '心法' ? null : chips('類型', KIND_TABS, 'kind', '全部'),
    chips('狀態', STATE_TABS, 'state', 'all'),
    chips('排序', SORT_TABS, 'sort', 'order'),
    st.slot !== null && st.slot !== undefined
      ? h('p.sk-hint', `點一門已學會的技能，放進${SET_NAME[st.set]}第 ${st.slot + 1} 格`)
      : st.pick ? h('p.sk-hint', '再點上面快捷欄的一格，放進去') : null,
    list,
  );
  fill();
  return card;
}

function moveCard(ctx, m) {
  const { st, act, redraw } = ctx;
  const where = m.places.map(([set, slot]) => `${SET_NAME[set]}第${slot + 1}格`).join('、');
  const choose = () => {
    if (m.locked) {
      ctx.toast?.(`${m.name}：${m.locked}`, 'bad');
      return;
    }
    if (st.slot !== null && st.slot !== undefined) {
      const slot = st.slot;
      const set = st.set;
      // on to the next empty place, if there is one
      st.slot = null;
      act((x) => {
        SK.assignSlot(x, set, slot, m.id);
        const next = SK.idsOf(x, set).indexOf(null);
        if (next >= 0) st.slot = next;
      });
      return;
    }
    st.pick = st.pick === m.id ? null : m.id;
    redraw();
    if (st.pick) reveal('.sk-sets');
  };
  const xp = m.xp;
  return h('button.sk-card' + (m.locked ? '.locked' : '') + (st.pick === m.id ? '.sel' : '') + (m.places.length ? '.carried' : ''), { type: 'button', 'aria-disabled': String(!!m.locked), onclick: choose },
    skillIcon(m),
    h('div.sk-card-body',
      h('div.sk-card-head', h('b', m.name), m.good ? h('span.tag.good', '精進') : null, h('span.tag', m.kind), m.locked ? null : h('span.tag.mastery', `${m.mastery}${xp.next ? ` ${xp.xp}/${xp.next}` : ''}`)),
      h('p.small.sk-line', moveLine(m)),
      h('p.small', m.desc),
      m.locked ? h('p.small.warn', `未學會：${m.locked}`) : where ? h('p.small.muted', `在${where}`) : null,
    ),
  );
}

function passiveCard(ctx, d) {
  const { s, act, toast } = ctx;
  const toggle = () => {
    if (d.locked) {
      toast?.(`${d.name}：${d.locked}`, 'bad');
      return;
    }
    act((x) => {
      const r = SK.holdPassive(x, d.id, !d.held);
      if (!r.ok) toast?.(r.why, 'bad');
    });
  };
  return h('button.sk-card.passive' + (d.locked ? '.locked' : '') + (d.held ? '.carried' : ''), { type: 'button', 'aria-disabled': String(!!d.locked), onclick: toggle },
    skillIcon(d),
    h('div.sk-card-body',
      h('div.sk-card-head', h('b', d.name), h('span.tag', '心法'), h('span.tag', d.school), d.held ? h('span.tag.good', '修持中') : null),
      h('p.small', d.desc),
      d.locked ? h('p.small.warn', `未能修持：${d.locked}`) : h('p.small.muted', d.held ? '點一下放下' : SK.heldPassives(s).length >= SK.passiveSlots(s) ? '心法欄已滿：先放下一門' : '點一下修持'),
    ),
  );
}
