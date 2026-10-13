import test from 'node:test';
import assert from 'node:assert/strict';
import * as CR from '../src/world/crafts.js';
import { RECIPES, GLYPHS, REFINE, ARRAY } from '../src/content/crafts.js';
import { ITEMS, SHOPS } from '../src/content/items.js';
import { gearStats } from '../src/core/body.js';
import { weaponPower } from '../src/core/cultivation.js';
import { addItem } from '../src/core/effects.js';
import { continueEvent } from '../src/core/events.js';
import { newReport } from '../src/core/time.js';
import { nodeQi } from '../src/world/map.js';
import { POI_BY_ID } from '../src/world/places.js';
import { checkFeats } from '../src/world/feats.js';
import * as E from '../src/world/explore.js';
import { fresh } from './helpers.js';

/** A 煉氣 cultivator with 靈力 to spare, standing in the temple. */
function adept() {
  const s = fresh();
  s.player.realm = 1;
  s.player.stage = 4;
  s.player.mp = 999;
  return s;
}

const give = (s, items) => {
  for (const [k, n] of Object.entries(items)) s.player.items[k] = (s.player.items[k] || 0) + n;
};
const settle = (s) => {
  while (s.pending) continueEvent(s);
};

test('the content holds together: every ingredient, pill, 符 and cost is a real item', () => {
  for (const [id, R] of Object.entries(RECIPES)) {
    assert.ok(ITEMS[id]?.kind === 'pill', `${id} is a pill`);
    for (const k of Object.keys(R.in)) assert.ok(ITEMS[k], `${id} takes ${k}`);
    assert.ok(R.zone > 0 && R.zone < 0.5 && R.mp > 0 && R.out >= 1);
  }
  for (const [id, G] of Object.entries(GLYPHS)) {
    assert.equal(ITEMS[id]?.kind, 'talisman', `${id} is a 符`);
    for (const st of G.strokes) for (const [x, y] of st) assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1, `${id} stays on the paper`);
  }
  for (const c of [...REFINE.cost, ...ARRAY]) if (c) for (const k of Object.keys(c.items)) assert.ok(ITEMS[k], k);
  // what you need to begin is sold somewhere
  const sold = new Set(Object.values(SHOPS).flatMap((sh) => sh.stock));
  for (const id of ['danlu', 'fubi', 'fu_paper', 'cinnabar']) assert.ok(sold.has(id), `${id} is for sale`);
});

test('煉丹: a furnace, 靈力 and the herbs; the fire held well makes more, held badly blows up', () => {
  const s = adept();
  assert.equal(CR.brewWhy(s, 'juqi_pill'), '身邊沒有丹爐。');
  give(s, { danlu: 1 });
  assert.match(CR.brewWhy(s, 'juqi_pill'), /還缺/);
  const mortal = adept();
  give(mortal, { danlu: 1, ningqi_grass: 3 });
  mortal.player.realm = 0;
  assert.match(CR.brewWhy(mortal, 'juqi_pill'), /凡人/, 'a mortal cannot hold the fire');

  const outcome = (hits) => {
    const x = adept();
    give(x, { danlu: 1, ningqi_grass: 3 });
    const before = x.player.items.juqi_pill || 0;
    const when = x.day * 24 + (x.tod ?? 8);
    const r = CR.brew(x, 'juqi_pill', hits);
    settle(x);
    assert.equal(x.player.items.ningqi_grass || 0, 0, 'the herbs are used, however it goes');
    assert.equal(x.day * 24 + x.tod - when, 4, 'two 時辰 pass at the furnace');
    return { ...r, got: (x.player.items.juqi_pill || 0) - before, s: x };
  };
  const top = outcome(3);
  assert.equal(top.grade, '上品');
  assert.equal(top.got, RECIPES.juqi_pill.out + 1);
  assert.equal(outcome(2).got, RECIPES.juqi_pill.out);
  assert.equal(outcome(1).got, RECIPES.juqi_pill.out - 1);
  const boom = outcome(0);
  assert.equal(boom.grade, '炸爐');
  assert.equal(boom.got, 0);
  assert.equal(boom.s.vars.brewed || 0, 0, 'a blown furnace is not a pill made');
  assert.equal(top.s.vars.brewed, 1);
});

test('築基丹: only from its 丹方, and only from a fire held at least 中品', () => {
  const s = adept();
  give(s, { danlu: 1, ziyun_zhi: 4, blood_ginseng: 4, beast_core: 6, lake_pearl: 2 });
  assert.ok(!CR.recipesKnown(s).includes('zhuji_pill'), 'not without the 丹方');
  assert.equal(CR.brewWhy(s, 'zhuji_pill'), '不懂這個丹方。');
  give(s, { book_zhuji_recipe: 1 });
  E.ensureWorld(s);
  s.flags.recipe_zhuji = true;
  assert.ok(CR.recipesKnown(s).includes('zhuji_pill'));
  assert.equal(CR.brewWhy(s, 'zhuji_pill'), null);
  CR.brew(s, 'zhuji_pill', 1);
  settle(s);
  assert.equal(s.player.items.zhuji_pill || 0, 0, '下品 is not enough');
  s.player.mp = 999;
  CR.brew(s, 'zhuji_pill', 2);
  settle(s);
  assert.equal(s.player.items.zhuji_pill, 1);
  // the 丹方 is to be found: in the old battlefield's hoard, and the sect's 寶庫
  assert.ok(ITEMS.book_zhuji_recipe.use);
});

test('畫符: a brush, paper, 硃砂, and a 符 you have seen; a true hand makes two', () => {
  const s = adept();
  give(s, { fubi: 1, fu_paper: 3, cinnabar: 3 });
  s.vars.seen = {};
  assert.deepEqual(CR.drawable(s), []);
  assert.match(CR.drawWhy(s, 'fire_talisman'), /沒見過/);
  s.vars.seen.fire_talisman = true;
  assert.deepEqual(CR.drawable(s), ['fire_talisman']);
  assert.equal(CR.drawWhy(s, 'fire_talisman'), null);
  const perfect = CR.traceScore('fire_talisman', GLYPHS.fire_talisman.strokes);
  assert.equal(CR.drawGrade(perfect), '上品');
  CR.drawFu(s, 'fire_talisman', perfect);
  settle(s);
  assert.equal(s.player.items.fire_talisman, 2);
  assert.equal(s.player.items.fu_paper, 2, 'one sheet a drawing');
  s.player.mp = 999;
  CR.drawFu(s, 'fire_talisman', 0.3);
  settle(s);
  assert.equal(s.player.items.fire_talisman, 2, 'a ruined one makes nothing');
  assert.equal(s.player.items.cinnabar, 1, 'but the 硃砂 is spent');
  assert.equal(s.vars.drawn, 2);
});

test('how true a drawing ran: the glyph itself, a steady hand, a missing stroke, a scribble', () => {
  for (const [id, G] of Object.entries(GLYPHS)) {
    assert.equal(CR.traceScore(id, G.strokes), 1, `${id}: the glyph traced exactly`);
    const steady = G.strokes.map((st) => st.map(([x, y], k) => [x + Math.sin(k) * 0.015, y + 0.02]));
    assert.ok(CR.traceScore(id, steady) >= 0.85, `${id}: a steady hand is 上品`);
    if (G.strokes.length > 1) assert.ok(CR.traceScore(id, G.strokes.slice(1)) < 0.6, `${id}: a stroke missing is no 符`);
    const scribble = Array.from({ length: 21 }, (_, k) => [k % 2 ? 0.05 : 0.95, 0.05 + k * 0.045]);
    assert.ok(CR.traceScore(id, [scribble]) < 0.6, `${id}: ink all over is not the glyph`);
    assert.equal(CR.traceScore(id, []), 0);
    assert.ok(CR.drawTime(id) >= 6 && CR.drawTime(id) <= 16, `${id}: a fair time to draw it in`);
  }
});

test('精煉: at the 百煉坊, gear on you gives a share more each level, up to +3', () => {
  const s = adept();
  give(s, { qinggang_sword: 1, wolf_coat: 1, beast_core: 10, lightning_wood: 2 });
  s.player.ls = 2000;
  s.player.weapon = 'qinggang_sword';
  s.player.gear = { ...(s.player.gear || {}), robe: 'wolf_coat' };
  assert.ok(CR.refinable(s).every((r) => r.why === '要到百煉坊。'), 'only at the smithy');
  const p = POI_BY_ID.smithy_stall;
  E.placeAt(s, p.x, p.y + 20);
  settle(s);
  const hp0 = gearStats(s).hp;
  const pow0 = weaponPower(s);
  const list = CR.refinable(s);
  assert.ok(list.some((r) => r.id === 'qinggang_sword') && list.some((r) => r.id === 'wolf_coat'), 'the sword in hand and the coat on');
  for (let lv = 1; lv <= REFINE.max; lv++) {
    assert.ok(CR.refine(s, 'wolf_coat'), `to +${lv}`);
    settle(s);
  }
  assert.ok(!CR.refine(s, 'wolf_coat'), 'no further than +3');
  assert.equal(CR.refinable(s).find((r) => r.id === 'wolf_coat').why, '已經精煉到頭了。');
  assert.ok(Math.abs(gearStats(s).hp - hp0 * (1 + REFINE.each * REFINE.max)) < 1e-9, 'the coat gives 45% more');
  assert.ok(CR.refine(s, 'qinggang_sword'));
  settle(s);
  assert.ok(weaponPower(s) > pow0, 'a refined sword hits harder');
  // sold or lost, its refining goes with it
  addItem(s, 'wolf_coat', -1, newReport());
  assert.equal(s.player.refine.wolf_coat, undefined);
});

test('洞府: found, then claimed; the 聚靈陣 makes its 靈氣 richer; the furnace and desk come with it', () => {
  const s = adept();
  assert.ok(!CR.hasHome(s));
  CR.claimHome(s);
  assert.ok(!CR.hasHome(s), 'not before it is found');
  s.flags.cave_found = true;
  CR.claimHome(s);
  settle(s);
  assert.ok(CR.hasHome(s));
  const away = CR.arrayNext(s);
  assert.equal(away.why, '要在洞府裡布陣。');
  s.player.loc = 'hidden_cave';
  assert.ok(CR.atHome(s) && CR.hasFurnace(s) && CR.hasBrush(s), 'the furnace and the desk are the cave\'s');
  const qi0 = nodeQi(s, 'hidden_cave');
  give(s, { beast_core: 20, lightning_wood: 2, xuanyin_stone: 1, lake_pearl: 1 });
  s.player.ls = 5000;
  for (let lv = 1; lv < ARRAY.length; lv++) {
    assert.ok(CR.buildArray(s), `the array to ${lv}`);
    settle(s);
  }
  assert.equal(CR.arrayNext(s), null, 'three levels at most');
  assert.ok(Math.abs(nodeQi(s, 'hidden_cave') - (qi0 + ARRAY[ARRAY.length - 1].qi)) < 1e-9);
  assert.ok(nodeQi(s, 'hidden_cave') > nodeQi(s, 'qingxu_temple'), 'richer than the temple');
});

test('the cave entrance, once found, opens the 洞府; 成就 for the crafts', () => {
  const s = adept();
  s.flags.cave_found = true;
  const p = POI_BY_ID.cave_entrance;
  E.placeAt(s, p.x, p.y + 10);
  settle(s);
  assert.equal(s.player.loc, 'hidden_cave');
  E.takeSignals(s);
  // (a story at the cave may come first; then the 洞府 opens)
  let sigs = [];
  for (let k = 0; k < 4 && !sigs.some((g) => g.open === 'home'); k++) {
    E.interact(s, { kind: 'poi', id: 'cave_entrance' });
    settle(s);
    sigs = E.takeSignals(s);
  }
  assert.ok(sigs.some((g) => g.open === 'home'), 'the 洞府 opens');
  checkFeats(s);
  s.flags.home_claimed = true;
  s.vars.brewed = 1;
  s.vars.drawn = 1;
  const got = checkFeats(s).map((f) => f.id);
  for (const id of ['home', 'brew', 'draw']) assert.ok(got.includes(id), id);
});
