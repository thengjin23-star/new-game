// 中州 (1.0「渡江」): the boat really goes over now. The first time is still
// the end of 第一章 (the ending screen, then 鶴歸渡); a save that saw the
// ending before the far bank was open is taken over now; one below 築基 may
// chance 劉家's night barge; and the old ferryman takes anyone home.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { EVENTS } from '../src/content/index.js';
import { NODES } from '../src/world/map.js';
import { useMap, CROSSINGS } from '../src/world/atlas.js';
import { nextGoal } from '../src/world/guide.js';
import { serialize, parseSave } from '../src/core/save.js';
import * as A from '../src/core/actions.js';
import { startEvent, continueEvent } from '../src/core/events.js';
import { migrate } from '../src/core/save.js';
import { bloodMoon } from '../src/world/weather.js';
import { BLOOD_DAY } from '../src/content/events/zhongzhou.js';
import { checkFeats } from '../src/world/feats.js';
import { FRAGMENTS } from '../src/content/fragments.js';
import { nodeQi, canSecludeAt } from '../src/world/map.js';
import { RENT, rentCost } from '../src/world/caves.js';
import { priceOf, shopHere } from '../src/core/actions.js';
import { SHOPS, ITEMS } from '../src/content/items.js';
import { fateLine } from '../src/world/ending.js';
import { FOES } from '../src/content/foes.js';
import { BEAST_MOVES } from '../src/content/moves.js';
import { BEAST_NOTES } from '../src/content/codex.js';
import { BIG_BEASTS } from '../src/art/scenery.js';
import { BEASTS } from '../src/world/places.js';
import { isReachable, collides, regionIdAt } from '../src/world/terrain.js';
import { fresh, resolvePending, goToPoi, pickText, finish, waitUntil } from './helpers.js';

/** Up to a pier and see to it, until the event wanted comes up (what the first visit says comes first). */
function atPier(s, poi, want) {
  goToPoi(s, poi);
  resolvePending(s);
  for (let k = 0; k < 6 && s.pending?.id !== want; k++) {
    resolvePending(s);
    E.interact(s, { kind: 'poi', id: poi });
  }
  assert.equal(s.pending?.id, want, `${want} at ${poi}`);
}

/** The world takes a step (a way over, taken, is gone over on the next one). */
const tick = (s) => E.step(s, 0.05, null);

/** 築基, at 白鶴渡. */
function zhuji(seed) {
  const s = fresh(seed);
  s.flags.opening_done = true;
  Object.assign(s.player, { realm: 2, stage: 0, hp: 9999 });
  return s;
}

test('the first time over: 第一章 ends, the ending screen comes up, and once it is closed the boat puts in at 鶴歸渡', () => {
  const s = zhuji(201);
  s.flags.crane_friend = true;
  try {
    atPier(s, 'ferry_pier', 'ferry_cross');
    pickText(s, '踏上中州');
    assert.doesNotMatch(s.pending.result.text, /推演中/, 'no more 「中州地圖尚在推演中」');
    finish(s);
    assert.ok(s.flags.chapter1_done && s.flags.chapter1_ending && s.flags.zhongzhou_crossed);
    assert.equal(s.world.cross, 'crane_ferry', 'the boat is on the river while the ending is shown');
    assert.equal(s.world.map, 'donghuang');
    // the UI closes the ending (app.js endingScreen) — and the world goes on
    delete s.flags.chapter1_ending;
    const day = s.day;
    const tod = s.tod;
    tick(s);
    assert.equal(s.world.map, 'zhongzhou', 'over the river');
    assert.ok((s.day - day) * 24 + (s.tod - tod) >= CROSSINGS.crane_ferry.hours - 0.01, 'half a day on the water');
    assert.equal(s.player.loc, 'heguidu');
    assert.equal(s.pending?.id, 'hg_arrive', 'the far bank says what it is like');
    assert.match(s.pending.text, /鶴歸/);
    assert.match(s.pending.text, /白鶴/, 'the crane came along');
    finish(s);
    assert.ok(s.flags.crane_in_zhongzhou);
    assert.ok(s.nodes.linjiang?.known, 'the city wall is in sight: 臨江城 is on the map');
    assert.equal(nextGoal(s)?.key, 'zz:city');
    // a save made over here comes back over here
    const back = parseSave(serialize(s));
    assert.equal(back.world.map, 'zhongzhou');
    assert.equal(back.player.loc, 'heguidu');
    // and home again, whenever you like
    atPier(s, 'hg_pier', 'hg_cross');
    pickText(s, '回東荒');
    finish(s);
    tick(s);
    assert.equal(s.world.map, 'donghuang');
    assert.equal(s.player.loc, 'crane_ferry');
    resolvePending(s);
    // and over again: no second ending
    atPier(s, 'ferry_pier', 'ferry_again');
    pickText(s, '過江');
    finish(s);
    assert.ok(!s.flags.chapter1_ending);
    tick(s);
    assert.equal(s.world.map, 'zhongzhou');
    assert.equal(s.player.loc, 'heguidu');
  } finally {
    useMap('donghuang');
  }
});

test('a save that saw the ending before 1.0 (sent back from mid-river) is taken over now, and its goal says so', () => {
  const s = zhuji(202);
  s.flags.chapter1_done = true;
  try {
    assert.equal(nextGoal(s)?.key, 'ferry');
    assert.match(nextGoal(s).text, /中州/);
    atPier(s, 'ferry_pier', 'ferry_again');
    assert.match(s.pending.text, /推演完成/);
    assert.match(s.pending.text, /它也沒跑/);
    pickText(s, '過江');
    finish(s);
    assert.ok(!s.flags.chapter1_ending, 'the ending was seen already');
    tick(s);
    assert.equal(s.world.map, 'zhongzhou');
    finish(s);
    assert.notEqual(nextGoal(s)?.key, 'ferry');
  } finally {
    useMap('donghuang');
  }
});

test('below 築基: the ferryman will not take you, 劉家\'s night barge will — and the river may not let you by', () => {
  const seen = { ok: 0, fail: 0 };
  try {
    for (let seed = 300; seed < 340 && (!seen.ok || !seen.fail); seed++) {
      const s = fresh(seed);
      s.flags.opening_done = true;
      Object.assign(s.player, { realm: 1, stage: 5, ls: 30 });
      atPier(s, 'ferry_pier', 'ferry_wait');
      assert.ok(!EVENTS.ferry_cross.cond(s) && !EVENTS.ferry_again.cond(s), 'no ferry for 煉氣');
      pickText(s, '劉家的貨船');
      const ok = s.pending.result.check.ok;
      finish(s);
      assert.equal(s.player.ls, 20, 'ten stones to the barge master, either way');
      if (ok) {
        seen.ok++;
        assert.ok(s.flags.chapter1_done && s.flags.chapter1_ending && s.flags.zz_smuggled, 'over by the barge: 第一章 is done all the same');
        delete s.flags.chapter1_ending;
        tick(s);
        assert.equal(s.world.map, 'zhongzhou');
        assert.match(s.pending?.text || '', /貨船/, 'the barge put you ashore');
        finish(s);
        // the way home does not ask your realm
        atPier(s, 'hg_pier', 'hg_cross');
        assert.match(s.pending.text, /往回走/);
        pickText(s, '回東荒');
        finish(s);
        tick(s);
        assert.equal(s.world.map, 'donghuang');
      } else {
        seen.fail++;
        assert.ok(!s.flags.chapter1_done && !s.world.cross, 'thrown back on 東荒\'s bank');
        assert.equal(s.world.map, 'donghuang');
      }
      useMap('donghuang');
    }
  } finally {
    useMap('donghuang');
  }
  assert.ok(seen.ok && seen.fail, `both ways it can go (${seen.ok} over, ${seen.fail} thrown back)`);
});

test('the ways over: each way lands on open ground at the pier of the other bank', () => {
  for (const [from, way] of Object.entries(CROSSINGS)) {
    if (!['crane_ferry', 'heguidu'].includes(from)) continue;
    useMap(way.to);
    try {
      const at = NODES[from === 'crane_ferry' ? 'heguidu' : 'crane_ferry'].at;
      assert.ok(Math.hypot(way.at[0] - at[0], way.at[1] - at[1]) < 200, `${from} puts you in by the pier`);
    } finally {
      useMap('donghuang');
    }
  }
});

// ── 1.0's story and ways in 中州 ──

/** A 築基 cultivator just over the river, standing on 鶴歸渡's landing (its welcome said). */
function landed(seed, more = {}) {
  const s = zhuji(seed);
  Object.assign(s.flags, { chapter1_done: true, zhongzhou_crossed: true }, more);
  s.world.cross = 'crane_ferry';
  tick(s);
  assert.equal(s.world.map, 'zhongzhou');
  finish(s);
  return s;
}

/** Take a choice that leads on to another step of the story (past the card that says what you did). */
function goOn(s, text) {
  pickText(s, text);
  if (s.pending?.result && s.pending.result.next) continueEvent(s);
}

/** Up to a place in 中州 and see to it (what the first visit says played out first), till the event wanted comes up. */
function atPoi(s, poi, want) {
  goToPoi(s, poi);
  finish(s);
  for (let k = 0; k < 6 && s.pending?.id !== want; k++) {
    finish(s);
    E.interact(s, { kind: 'poi', id: poi });
  }
  assert.equal(s.pending?.id, want, `${want} at ${poi}`);
}

test('the 天驕榜: beat one of them and the 星官 cannot find you; a week on, the board has a blank row (1.0\'s last scene)', () => {
  const s = landed(401);
  try {
    s.player.hp = 99999;
    atPoi(s, 'lj_board', 'lj_board');
    assert.match(s.pending.text, /葉孤寒/);
    goOn(s, '上擂台');
    pickText(s, '第一百名');
    resolvePending(s);
    assert.ok(s.flags.bang_100 && s.flags.bang_beaten, 'beaten');
    assert.equal(s.vars.bang_day, s.day);
    assert.equal(nextGoal(s)?.key === 'zz:board', false, 'the board is done with for now');
    E.placeAt(s, ...NODES.heguidu.at);
    finish(s);
    s.day += 8;
    atPoi(s, 'lj_board', 'bang_blank');
    assert.match(s.pending.text, /第一百零一名/);
    finish(s);
    assert.ok(s.flags.bang_blank);
    atPoi(s, 'lj_board', 'lj_board');
    assert.match(s.pending.text, /第一百零一名/, 'and it stays on the board');
    finish(s);
  } finally {
    useMap('donghuang');
  }
});

test('林塵 climbs the 天驕榜 from the autumn after he left; 葉孤寒 is first all along', () => {
  const s = landed(402);
  try {
    const board = () => {
      atPoi(s, 'lj_board', 'lj_board');
      const t = s.pending.text;
      finish(s);
      return t;
    };
    s.day = 3 * 360;
    assert.doesNotMatch(board(), /林塵/, 'not yet in 中州');
    s.day = 4 * 360 + 9 * 30;
    assert.match(board(), /第九十一名：林塵/);
    s.day = 6 * 360 + 10;
    assert.match(board(), /第三名：林塵/);
    s.flags.lin_ruined = true;
    assert.doesNotMatch(board(), /林塵/, 'unless he never got to go');
  } finally {
    useMap('donghuang');
  }
});

test('蘇清瑤 in 臨江城: a friend meets you at the teahouse; a rival draws first; a stranger notices you are not in the book', () => {
  try {
    const friend = landed(403);
    Object.assign(friend.npcs.su_qingyao, { met: true, loc: 'linjiang' });
    Object.assign(friend.flags, { su_farewell: true, su_left: true });
    friend.day = 6 * 360 + 30;
    A.visit(friend, 'su_qingyao', { near: true });
    assert.equal(friend.pending?.id, 'su_zz');
    assert.match(friend.pending.text, /星官服/);
    goOn(friend, '茶樓');
    assert.match(friend.pending.text, /那一夜，是誰下的筆/);
    pickText(friend, '幫你');
    finish(friend);
    assert.ok(friend.flags.su_zz_ally && friend.flags.su_zz_met);
    A.visit(friend, 'su_qingyao', { near: true });
    pickText(friend, '那一夜');
    finish(friend);
    assert.ok(friend.flags.su_told_night);

    const rival = landed(404);
    rival.player.hp = 99999;
    Object.assign(rival.npcs.su_qingyao, { met: true, loc: 'linjiang' });
    Object.assign(rival.flags, { su_rival_end: true, su_left: true });
    A.visit(rival, 'su_qingyao', { near: true });
    assert.match(rival.pending.text, /我們再算/);
    pickText(rival, '拔劍');
    resolvePending(rival);
    assert.ok(rival.flags.su_zz_beaten && rival.flags.blood_moon_warned, 'beaten, she tells you the day');

    const stranger = landed(405);
    Object.assign(stranger.npcs.su_qingyao, { loc: 'linjiang' });
    stranger.flags.su_left = true;
    A.visit(stranger, 'su_qingyao', { near: true });
    assert.match(stranger.pending.text, /你不在冊子上/);
    pickText(stranger, '什麼冊子');
    finish(stranger);
    assert.ok(stranger.npcs.su_qingyao.met);
  } finally {
    useMap('donghuang');
  }
});

test('those who went to 中州 before there was one live there now (an old save): 蘇清瑤 at the 榜樓, 葉孤寒 at his sect', () => {
  const s = fresh(406);
  Object.assign(s.npcs.su_qingyao, { loc: null });
  s.flags.su_left = true;
  s.npcs.ye_guhan.loc = null;
  const back = migrate(JSON.parse(serialize(s)));
  assert.equal(back.npcs.su_qingyao.loc, 'linjiang');
  assert.equal(back.npcs.ye_guhan.loc, 'tianjian');
  // (not if she never left)
  const t = fresh(407);
  assert.equal(migrate(JSON.parse(serialize(t))).npcs.su_qingyao.loc, 'luoxia_market');
});

test('天元三千零二十二年七月十五: the moon is red; at dusk the night opens wherever you are — and if you slept through it, you hear of it', () => {
  const s = fresh(408);
  s.flags.opening_done = true;
  assert.ok(bloodMoon(s, BLOOD_DAY), 'that night the moon is red, whatever the dice say');
  waitUntil(s, BLOOD_DAY);
  assert.ok(!EVENTS.blood_moon_omen, 'the old omen is gone: the night itself comes (content/events/bloodnight.js)');
  // seen: at dusk that night
  const seen = parseSave(serialize(s));
  seen.tod = 19.5;
  tick(seen);
  assert.equal(seen.pending?.id, 'night_rise');
  assert.match(seen.pending.text, /紅的/);
  // slept through: dawn, and the rumor
  waitUntil(s, BLOOD_DAY + 5);
  tick(s);
  assert.equal(s.pending?.id, 'night_dawn');
  assert.match(s.pending.text, /天已經亮了/);
  finish(s);
  assert.ok(s.flags.blood_night_done);
  assert.ok(s.rumors.some((r) => r.text.includes('朱紅的筆')));
});

test('王二\'s letter comes over with the ferryman a month after you do; you can write back', () => {
  const s = landed(409);
  try {
    assert.equal(s.vars.zz_first, s.day);
    s.flags.wanger_married = true;
    s.nodes.linjiang.visited = true;
    s.day += 31;
    assert.equal(nextGoal(s)?.key, 'zz:letter');
    atPoi(s, 'hg_pier', 'hg_letter');
    assert.match(s.pending.text, /豆花管夠/);
    assert.match(s.pending.text, /翠花/);
    pickText(s, '回信');
    finish(s);
    assert.ok(s.flags.wanger_letter1 && s.flags.wanger_reply);
    checkFeats(s);
    assert.ok(s.vars.feats.letter !== undefined);
  } finally {
    useMap('donghuang');
  }
});

test('the old observatory: by night the stone beast wakes; beaten, the crack in the platform gives up 殘頁・星', () => {
  const s = landed(410);
  try {
    s.player.hp = 99999;
    s.tod = 22;
    atPoi(s, 'gx_platform', 'gx_platform');
    assert.match(s.pending.text, /睜開了眼睛/);
    pickText(s, '拔劍');
    resolvePending(s, (opts) => opts.find((c) => c.text.includes('伸手')) || opts[0]);
    assert.ok(s.flags.gx_guard_down && s.flags.gx_page);
    assert.ok(s.sys.frags.includes('frag_star'));
    assert.match(FRAGMENTS.frag_star.text, /欽天監/);
  } finally {
    useMap('donghuang');
  }
});

test('a cave rented in the city: fit to sit in, and its 靈氣, while the rent is paid — the street again after', () => {
  const s = landed(411);
  try {
    assert.ok(canSecludeAt(s, 'linjiang'), 'no cave, no seclusion in the city');
    const qi = nodeQi(s, 'linjiang');
    s.player.ls = 1000;
    atPoi(s, 'lj_cave', 'lj_cave');
    pickText(s, '租一個月');
    finish(s);
    assert.equal(s.player.ls, 1000 - rentCost('linjiang', 1));
    assert.equal(canSecludeAt(s, 'linjiang'), null);
    assert.equal(nodeQi(s, 'linjiang'), RENT.linjiang.qi);
    assert.ok(RENT.linjiang.qi > qi);
    s.day += 31;
    assert.ok(canSecludeAt(s, 'linjiang') && nodeQi(s, 'linjiang') === qi, 'the rent ran out');
    assert.ok(rentCost('linjiang', 12) < 12 * RENT.linjiang.month, 'a year costs less a month');
  } finally {
    useMap('donghuang');
  }
});

test('the sky over 臨江城 is the watch\'s: hang over it and they call out, then bring you down', () => {
  const s = landed(412);
  try {
    s.player.items.feisuo = 1;
    E.placeAt(s, 1700, 2700);
    finish(s);
    s.player.mp = 9999;
    assert.ok(E.takeOff(s));
    for (let k = 0; k < 120 && !s.pending; k++) E.step(s, 0.1, null);
    assert.equal(s.pending?.id, 'lj_nofly');
    assert.ok(!E.airborne(s), 'down on the street');
    pickText(s, '認罰');
    finish(s);
    assert.ok((s.rep.linjiang || 0) < 0);
  } finally {
    useMap('donghuang');
  }
});

test('臨江城\'s shops: 上官家\'s 名帖 counts at her store; the 鬼市\'s stall is there only by night', () => {
  const s = landed(413);
  try {
    goToPoi(s, 'lj_shop');
    finish(s);
    const full = priceOf(s, 'guiyuan_jade');
    s.flags.sg_met = true;
    assert.ok(priceOf(s, 'guiyuan_jade') < full);
    goToPoi(s, 'gs_shop');
    finish(s);
    s.tod = 12;
    assert.equal(shopHere(s), null, 'nobody at the stall by day');
    s.tod = 22;
    assert.equal(shopHere(s), SHOPS.guishi);
    assert.ok(SHOPS.guishi.stock.includes('zhuji_pill') && priceOf(s, 'zhuji_pill') > 0, 'a 築基丹 — dear');
    for (const id of [...SHOPS.linjiang.stock, ...SHOPS.linjiang_smith.stock, ...SHOPS.guishi.stock, ...SHOPS.linjiang_smith.recipes]) assert.ok(ITEMS[id], id);
  } finally {
    useMap('donghuang');
  }
});

test('命簿殘影 keeps up: 沈清歌 on her own road, 趙虎 at the millstone', () => {
  const s = fresh(414);
  s.sys.lv = 5;
  const before = fateLine(s, 'shen_qingge');
  s.flags.shen_own_path = true;
  assert.notEqual(fateLine(s, 'shen_qingge'), before);
  s.flags.shen_zhuji = true;
  assert.match(fateLine(s, 'shen_qingge'), /築基/);
  const zhao = fateLine(s, 'zhao_hu');
  s.flags.zhao_changed = true;
  assert.notEqual(fateLine(s, 'zhao_hu'), zhao);
});

test('the beasts of 中州: an element or a person, a page in the 圖鑑, moves that exist, a drawing; each roams open ground on its own map', () => {
  const NEW = ['reed_python', 'wood_spirit', 'cangwu_ape', 'jie_xiu', 'gs_assassin', 'city_guard', 'star_beast', 'yunmeng_jiao'];
  for (const kind of NEW) {
    const F = FOES[kind];
    assert.ok(F?.rt, kind);
    assert.ok(BEAST_NOTES[kind]?.note, `${kind}: a page in the 圖鑑`);
    assert.ok(F.rt.person || BIG_BEASTS.has(kind), `${kind}: drawn`);
    for (const id of [...F.rt.moves, ...(F.rt.phases || []).flatMap((p) => p.moves || [])]) assert.ok(BEAST_MOVES[id], `${kind}: ${id}`);
    for (const [, item] of F.loot || []) assert.ok(ITEMS[item], `${kind}: ${item}`);
  }
  useMap('zhongzhou');
  try {
    for (const def of BEASTS) {
      assert.ok(isReachable(def.x, def.y) && !collides(null, def.x, def.y, 12), `${def.id} stands on open ground`);
      assert.ok(!['linjiang', 'heguidu', 'guishi', 'linjiang_docks'].includes(regionIdAt(def.x, def.y)), `${def.id} keeps out of the town`);
    }
  } finally {
    useMap('donghuang');
  }
});
