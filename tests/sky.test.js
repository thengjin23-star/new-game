// 天時: the weather (from the save's seed, the same at the same hour), what
// it does to walking, seeing and fire, the thunder that finds what flies,
// and the signs in the sky: the full moon, the blood moon, the 靈潮.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/world/explore.js';
import { weatherAt, weatherNow, hoursToClear, skySigns, inTide, bloodMoon, WEATHER } from '../src/world/weather.js';
import { rateParts } from '../src/core/cultivation.js';
import { dayAt } from '../src/core/calendar.js';
import { pools } from '../src/core/body.js';
import { advance, newReport } from '../src/core/time.js';
import { fresh, resolvePending } from './helpers.js';

const DT = 1 / 30;

/** A save with the real weather (fresh() holds the sky clear). */
function open(seed = 1) {
  const s = fresh(seed);
  delete s.vars.sky;
  return s;
}

test('the weather is the same for the same save at the same hour, and different saves have their own', () => {
  const a = open(1);
  const b = open(1);
  const c = open(2);
  let same = 0;
  let differ = 0;
  for (let h = 0; h < 2000; h += 7) {
    assert.equal(weatherAt(a, 'qingshi_town', h), weatherAt(b, 'qingshi_town', h));
    if (weatherAt(a, 'qingshi_town', h) === weatherAt(c, 'qingshi_town', h)) same++;
    else differ++;
  }
  assert.ok(differ > 40, `another life, another sky (${differ} of ${same + differ} hours differ)`);
});

test('a year of weather: mostly fair, rain and storms in the warm months, snow only in winter', () => {
  const s = open(3);
  const count = {};
  const winter = {};
  for (let h = 0; h < 360 * 24; h++) {
    const w = weatherAt(s, 'qingshi_town', h);
    count[w] = (count[w] || 0) + 1;
    if (Math.floor(h / 24) >= 270) winter[w] = (winter[w] || 0) + 1;
  }
  const share = (k) => (count[k] || 0) / (360 * 24);
  assert.ok(share('clear') > 0.35 && share('clear') < 0.65, `clear ${share('clear').toFixed(2)}`);
  assert.ok(share('rain') + share('storm') > 0.08 && share('rain') + share('storm') < 0.3, 'some rain');
  assert.ok(share('snow') > 0 && !winter.rain && !winter.storm, 'in winter it snows instead');
  assert.ok((count.snow || 0) === (winter.snow || 0), 'and only in winter');
  // the weather holds a while: a rainy spell lasts hours, not minutes
  let spells = 0;
  let len = 0;
  let cur = null;
  let run = 0;
  for (let h = 0; h < 360 * 24; h++) {
    const w = weatherAt(s, 'qingshi_town', h);
    if (w !== cur) {
      if (cur === 'rain') {
        spells++;
        len += run;
      }
      cur = w;
      run = 0;
    }
    run++;
  }
  assert.ok(len / spells >= 3, `a rain lasts a while (${(len / spells).toFixed(1)} h)`);
});

test('up on a high peak you stand above the weather', () => {
  const s = open(4);
  for (let h = 0; h < 3000; h += 13) assert.equal(weatherAt(s, 'sword_peak', h), 'clear');
});

test('rain slows you and hides you; fog hides you more; fire burns weaker in the wet', () => {
  const s = fresh(5);
  s.vars.sky = 'clear';
  const walk = E.walkMult(s);
  s.vars.sky = 'rain';
  assert.ok(E.walkMult(s) < walk, 'slower in the rain');
  assert.ok(weatherNow(s).see < 1 && weatherNow(s).wet);
  s.vars.sky = 'fog';
  assert.ok(weatherNow(s).see < WEATHER.rain.see, 'fog hides more than rain');
  s.vars.sky = 'snow';
  assert.ok(E.walkMult(s) < walk, 'snow too');
});

test('a 靈潮 twice a year speeds cultivation half again; the full moon a little', () => {
  const s = fresh(6);
  s.day = dayAt(0, 2, 5);
  const base = rateParts(s).total;
  s.day = dayAt(0, 3, 11);
  assert.ok(inTide(s.day) && skySigns(s).includes('tide'));
  assert.ok(Math.abs(rateParts(s).total / base - 1.5) < 0.01, '靈潮: half as fast again');
  s.day = dayAt(0, 2, 15);
  assert.ok(skySigns(s).includes('fullmoon'));
  assert.ok(rateParts(s).total > base * 1.1, '月華');
  s.day = dayAt(0, 9, 10);
  assert.ok(inTide(s.day), 'and again in autumn');
});

test('a 靈潮 is told of three days before it comes', () => {
  const s = fresh(7);
  s.day = dayAt(0, 2, 20);
  const n = s.rumors.length;
  advance(s, 20, 'active', newReport());
  assert.ok(s.rumors.slice(0, s.rumors.length - n).some((r) => r.text.includes('靈氣要起潮')), 'a word goes round');
});

test('the blood moon: never in the first years; now and then on a full moon after', () => {
  const s = fresh(8);
  for (let d = 0; d < dayAt(5, 9); d++) assert.ok(!bloodMoon(s, d));
  let n = 0;
  let full = 0;
  for (let d = dayAt(6, 1); d < dayAt(16, 1); d++) {
    if (bloodMoon(s, d)) n++;
    if (skySigns(s, d).length && skySigns(s, d)[0].endsWith('moon')) full++;
  }
  assert.ok(n > 5 && n < full * 0.6, `some (${n} of ${full} full moons)`);
});

test('in a thunderstorm the lightning finds you up in the air', () => {
  const s = fresh(9);
  Object.assign(s.player, { realm: 1, stage: 5 });
  s.player.items.feisuo = 1;
  E.placeAt(s, 2930, 3600);
  resolvePending(s);
  s.vars.sky = 'storm';
  s.player.mp = pools(s).maxMp;
  assert.ok(E.takeOff(s));
  const said = E.takeFeed(s).map((f) => f.text);
  assert.ok(said.some((x) => x.includes('招雷')), 'a warning as you go up');
  let struck = false;
  for (let t = 0; t < 120 && E.airborne(s); t += DT) {
    E.step(s, DT, null);
    for (const f of E.takeFeed(s)) if (f.text.includes('雷劈')) struck = true;
    s.player.mp = pools(s).maxMp;
  }
  assert.ok(struck, 'struck');
  for (let t = 0; t < 6 && E.airborne(s); t += DT) E.step(s, DT, null);
  assert.ok(!E.airborne(s), 'and down');
});

test('waiting out the rain', () => {
  const s = open(10);
  // find a rainy hour
  let h = 0;
  while (!WEATHER[weatherAt(s, 'qingshi_town', h)].wet && h < 5000) h++;
  s.day = Math.floor(h / 24);
  s.tod = h % 24;
  E.placeAt(s, 2300, 3150);
  resolvePending(s);
  s.player.loc = 'qingshi_town';
  if (!weatherNow(s).wet) return; // (the hour moved under us: nothing to test)
  const wait = hoursToClear(s);
  assert.ok(wait > 0 && wait <= 24);
  E.rest(s, wait);
  resolvePending(s);
  assert.ok(!weatherNow(s).wet, 'it has stopped');
});
