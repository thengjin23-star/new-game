// 人: the people of the world keep hours. 孫掌櫃 sweeps his doorstep at
// dawn and minds the shop all day; 王二 fishes the creek in the morning;
// when the lamps are lit the town goes indoors, and only the watchman walks
// the street. Named people walk from place to place along the roads; far
// from you, they are simply where they should be. A person at home comes to
// the door when you call. Townsfolk wander, chat, and go home at night.
//
// Nothing here is saved: where everyone is follows from the hour.

import { CELL, WORLD_W, WORLD_H } from './geo.js';
import { world, regionAt, regionIdAt, collides, isReachable, findPath, hash2, REGION_IDS, idxOf, cellX, cellY, PLAYER_R } from './terrain.js';
import { STRUCTURES, NPC_SPOTS, NPC_SHOW, WANDERERS } from './places.js';
import { NODES, PEOPLE_PLACES } from './map.js';

/** Beyond this distance from you, nobody walks: they are already there. */
const SEE = 700;
const WALK = 42; // an easy walk, units per second

// ── named people's days ──

/**
 * By region: [from hour, [x, y], what they do there, facing?]. From that
 * hour on they go there and do that; before the first entry of the day,
 * the last one holds. 'home' is indoors: they come to the door if you call.
 * What they do: stand, sit, sweep, fish, drink, sword, tell, home.
 */
export const ROUTINES = {
  lin_chen: {
    qingshi_town: [
      [0, [2045, 3068], 'home'],
      [5, [2020, 3340], 'sword', -1], // before anyone is up, alone behind the 土地廟
      [7.5, [2060, 3112], 'stand'],
      [17, [1850, 3250], 'sit', -1], // watching the water
      [20, [2045, 3068], 'home'],
      [23, [2020, 3340], 'sword', -1], // and again when the town is asleep
    ],
  },
  shen_qingge: {
    qingshi_town: [
      [0, [2475, 3068], 'home'],
      [6.5, [2470, 3108], 'sword'],
      [8, [2470, 3108], 'stand'],
      [15, [2580, 3150], 'stand'], // under the willows
      [17.5, [2470, 3108], 'stand'],
      [19.5, [2475, 3068], 'home'],
    ],
  },
  sun_zg: {
    qingshi_town: [
      [0, [2185, 3205], 'home'],
      [6, [2225, 3190], 'sweep'],
      [7.5, [2185, 3205], 'stand'],
      [19, [2380, 3215], 'drink'], // a pot of tea before bed
      [21, [2185, 3205], 'home'],
    ],
  },
  wang_er: {
    qingshi_town: [
      [0, [2556, 3326], 'home'],
      [5.5, [1850, 3215], 'fish', -1],
      [10, [2290, 3140], 'sit'], // a bowl of 豆花
      [11, [2620, 3318], 'stand'], // the yard, the chickens
      [19.5, [2556, 3326], 'home'],
    ],
  },
  zhao_hu: {
    qingshi_town: [
      [0, [2330, 2962], 'home'],
      [9.5, [2340, 3172], 'stand'], // his corner
      [13, [2330, 3128], 'sit'],
      [14, [2340, 3172], 'stand'],
      [19, [2425, 3225], 'drink'],
      [23, [2330, 2962], 'home'],
    ],
  },
  song_he: {
    qingxu_temple: [
      [0, [1060, 3172], 'sit'], // he does not sleep much
      [5, [1030, 3232], 'sweep'],
      [8, [1060, 3172], 'sit'],
      [12, [1150, 3138], 'stand'], // at the well
      [13, [990, 3100], 'sit'], // under the pagoda
      [18, [1060, 3172], 'sit'],
    ],
  },
  qian_banxian: {
    luoxia_market: [
      [0, [4100, 2380], 'home'],
      [9, [4100, 2530], 'tell'],
      [12, [3960, 2625], 'stand'],
      [14, [4100, 2530], 'tell'],
      [20, [3700, 2484], 'drink'],
      [23, [4100, 2380], 'home'],
    ],
  },
  su_qingyao: {
    luoxia_market: [
      [0, [3830, 2366], 'home'],
      [8, [3910, 2612], 'stand'],
      [19, [3830, 2366], 'home'],
    ],
  },
};

/** What they say to nobody in particular, by what they are doing. */
const SAYS = {
  sun_zg: { sweep: ['又是一地落葉。'], stand: ['收草藥嘍——價錢公道——', '凝氣草、止血草，都收——'], drink: ['這茶，淡了。'] },
  wang_er: { fish: ['噓——魚要上鉤了。', '今天的魚，比我還懶。'], stand: ['咯咯咯——吃飯嘍！', '這雞，比我還能吃。'], sit: ['老李，再來一碗！'] },
  zhao_hu: { stand: ['看什麼看？', '喲，今天手頭寬裕？'], sit: ['記帳上。'], drink: ['再……再來一壺！'] },
  shen_qingge: { stand: ['哼。'] },
  song_he: { sweep: ['掃地，也是修行。'], stand: ['井水甜得很。'] },
  qian_banxian: { tell: ['話說那一日，天降異象——', '欲知後事如何——', '且聽下回分解！', '啪！'], stand: ['這位客官，印堂發亮啊。'], drink: ['想當年，老夫也見過金丹真人……'] },
};

export function entryAt(list, tod) {
  let e = list[list.length - 1];
  for (const x of list) if (x[0] <= tod) e = x;
  return e;
}

export function routineOf(id, region) {
  return ROUTINES[id]?.[region] || null;
}

function inHours([a, b], tod) {
  return a <= b ? tod >= a && tod < b : tod >= a || tod < b;
}

/** Walk along a path; true once at its end. */
function follow(ent, speed, dt) {
  const p = ent.path;
  if (!p || !p.length) {
    ent.path = null;
    ent.moving = false;
    return true;
  }
  const [tx, ty] = p[0];
  const d = Math.hypot(tx - ent.x, ty - ent.y);
  const len = speed * dt;
  if (Math.abs(tx - ent.x) > 0.5) ent.face = tx < ent.x ? -1 : 1;
  if (d <= len + 0.5) {
    ent.x = tx;
    ent.y = ty;
    p.shift();
    if (!p.length) {
      ent.path = null;
      ent.moving = false;
      return true;
    }
  } else {
    ent.x += ((tx - ent.x) / d) * len;
    ent.y += ((ty - ent.y) / d) * len;
  }
  ent.moving = true;
  return false;
}

function walkersOf(L) {
  if (!L.walkers) L.walkers = {};
  return L.walkers;
}

/** Set someone down where their hour says, doing what it says. */
function settle(k, e) {
  k.entry = e;
  k.x = e[1][0];
  k.y = e[1][1];
  k.act = e[2];
  k.inside = e[2] === 'home';
  if (e[3]) k.face = e[3];
  k.path = null;
  k.moving = false;
}

function walkerOf(s, L, npc) {
  const list = routineOf(npc.id, npc.loc);
  if (!list) return null;
  const W = walkersOf(L);
  let k = W[npc.id];
  if (!k || k.region !== npc.loc) {
    k = W[npc.id] = { id: npc.id, region: npc.loc, face: 1 };
    settle(k, entryAt(list, s.tod ?? 12));
  }
  return k;
}

function updateWalkers(s, L, dt) {
  const w = s.world;
  // hours went by in a blink (a rest, an event): everyone is already where they were going
  const now = s.day * 24 + s.tod;
  const jumped = L.peopleClock !== undefined && (now - L.peopleClock > 1.5 || now < L.peopleClock);
  L.peopleClock = now;
  for (const npc of Object.values(s.npcs)) {
    if (!npc.alive || !npc.named || !npc.loc) continue;
    const k = walkerOf(s, L, npc);
    if (!k) continue;
    const e = entryAt(routineOf(npc.id, npc.loc), s.tod);
    const seen = !jumped && (Math.hypot(k.x - w.x, k.y - w.y) < SEE || Math.hypot(e[1][0] - w.x, e[1][1] - w.y) < SEE);
    if (e !== k.entry) {
      if (!seen) {
        settle(k, e);
        continue;
      }
      // time to go: out of the door, along the road
      k.entry = e;
      k.inside = false;
      k.act = 'walk';
      k.path = findPath(null, k.x, k.y, e[1][0], e[1][1]) || [[e[1][0], e[1][1]]];
    }
    if (!k.path) continue;
    if (!seen) {
      settle(k, e);
      continue;
    }
    // someone is walking up to talk to them: they wait
    if (L.then?.kind === 'npc' && L.then.id === npc.id) {
      k.moving = false;
      continue;
    }
    if (follow(k, WALK, dt)) settle(k, e);
  }
}

/** A fixed-for-the-month spot for a stranger you know, somewhere in their region. */
const strangerPlace = new Map();
function strangerSpot(s, npc) {
  const month = Math.floor(s.day / 30);
  const key = `${npc.id}:${npc.loc}:${month}`;
  if (strangerPlace.has(key)) return strangerPlace.get(key);
  const g = world();
  const ridx = REGION_IDS.indexOf(npc.loc);
  const at = NODES[npc.loc].at;
  let best = null;
  for (let tries = 0; tries < 60 && !best; tries++) {
    const a = hash2(month, tries, npc.id.length * 97 + Number(npc.id.slice(1)) || 1) * Math.PI * 2;
    const r = 60 + hash2(tries, month, 7) * 360;
    const x = at[0] + Math.cos(a) * r;
    const y = at[1] + Math.sin(a) * r;
    if (x < CELL || y < CELL || x > WORLD_W - CELL || y > WORLD_H - CELL) continue;
    const k = idxOf(Math.floor(x / CELL), Math.floor(y / CELL));
    if (g.reg[k] !== ridx || !g.reach[k]) continue;
    if (collides(null, x, y, PLAYER_R + 4)) continue;
    best = [Math.round(x), Math.round(y)];
  }
  const spot = best || at;
  strangerPlace.set(key, spot);
  return spot;
}

/**
 * Everyone you could call on, where they are now: { id, x, y, named, met,
 * name, npc, act, moving, face, inside, say }. `inside`: at home behind the
 * door (still there if you knock).
 */
export function peopleNow(s, L) {
  const out = [];
  for (const npc of Object.values(s.npcs)) {
    if (!npc.alive || !npc.loc) continue;
    if (npc.named) {
      if (NPC_SHOW[npc.id] && !NPC_SHOW[npc.id](s)) continue;
      const k = walkerOf(s, L, npc);
      if (k) {
        out.push({
          id: npc.id, x: k.x, y: k.y, named: true, met: npc.met, name: npc.met ? npc.name : npc.title, npc,
          act: k.moving ? 'walk' : k.act, moving: k.moving, face: k.face, inside: k.inside && !k.moving, fixed: !!k.entry?.[3], say: sayOf(L, k),
        });
        continue;
      }
      const spot = NPC_SPOTS[npc.id]?.[npc.loc];
      if (!spot) continue;
      const [x, y] = typeof spot === 'function' ? spot(s) : spot;
      out.push({ id: npc.id, x, y, named: true, met: npc.met, name: npc.met ? npc.name : npc.title, npc, act: 'stand' });
    } else if (npc.met && PEOPLE_PLACES.includes(npc.loc)) {
      const [x, y] = strangerSpot(s, npc);
      out.push({ id: npc.id, x, y, named: false, met: true, name: npc.name, npc, act: 'stand' });
    }
  }
  return out;
}

// ── townsfolk ──

export const FOLK_LINES = {
  qingshi_town: [
    '今年的雨水不錯，稻子長得好。', '聽說林家那個少爺……唉，可惜了。', '王二那小子又去河邊摸魚了。',
    '回春堂的孫掌櫃，收草藥從不壓價。', '趙虎那幫人又在街口收份子錢了。', '夜裡別往鎮東走，那邊的荒廟不乾淨。',
  ],
  luoxia_market: [
    '一顆聚氣丹三十塊？搶錢啊。', '聽說黑風林最近又死了人。', '茶樓的錢半仙，嘴裡沒一句真話，可就是好聽。',
    '拍賣會每年十月開，壓軸的東西，一年比一年邪乎。', '別在坊市裡動手，執法隊可不是吃素的。', '想去中州？先活到築基再說吧。',
  ],
  farmland: ['靈溪的水澆出來的稻子，特別香。', '前些天田埂邊挖出個瓦罐，可惜是空的。', '天要下雨了，得趕緊收。'],
  qingyun_sect: ['外門大比快到了，師兄們都在閉關。', '藏經閣的老執事，脾氣古怪得很。', '聽說丹房又炸爐了。'],
};

/** What the street sounds like: short things people call out as you pass. */
const CALLS = {
  qingshi_town: ['今天的菜真貴。', '娘，我要吃糖葫蘆！', '讓一讓，讓一讓！', '回來吃飯——', '這天，怕是要下雨。'],
  luoxia_market: ['上好的符籙，一張五塊靈石！', '便宜賣了，便宜賣了！', '道友，看看法器？', '讓一讓！', '聽說了嗎？聚寶閣又進新貨了。'],
  farmland: ['今年收成好。', '天要下雨了。', '牛呢？誰看見我的牛了？'],
  qingyun_sect: ['師兄早。', '又要挑水了……', '噓，執事來了。'],
};

/** Townsfolk with a place and an hour of their own. */
export const EXTRAS = [
  {
    id: 'tofu_li', region: 'qingshi_town', name: '老李頭', look: 'vendor', at: [2318, 3100], face: 1, hours: [6, 19.5], act: 'stand',
    calls: ['豆花——熱豆花——', '三文錢一碗，加糖不加錢！'],
    chat: ['「三文錢一碗，加糖不加錢。客官，來一碗？」', '「我這豆花，賣了三十年了。林家少爺小時候，一口氣能吃五碗。」'],
  },
  {
    id: 'chess_a', region: 'qingshi_town', name: '下棋的老頭', look: 'elder', at: [2492, 3200], face: 1, hours: [8, 17.5], act: 'sit',
    calls: ['將軍！', '嘿嘿，這步妙。'], chat: ['「觀棋不語真君子。」老頭頭也不抬。'],
  },
  {
    id: 'chess_b', region: 'qingshi_town', name: '下棋的老頭', look: 'villager', at: [2528, 3200], face: -1, hours: [8, 17.5], act: 'sit',
    calls: ['悔棋不算！', '等等，我再想想……'], chat: ['「別吵，我在想棋。」'],
  },
  {
    id: 'watchman', region: 'qingshi_town', name: '更夫', look: 'watchman', hours: [19.5, 5], act: 'gong', patrol: [[1900, 3130], [2680, 3125]], calls: 'watch',
    chat: ['「夜裡少出門。鎮東的荒廟，前些天又有人看見鬼火。」', '「我打了二十年的更，什麼沒見過？就是沒見過太平年。」'],
  },
  {
    id: 'drunk', region: 'luoxia_market', name: '醉漢', look: 'drunk', at: [3725, 2490], hours: [20, 2.5], act: 'stagger', wander: 46,
    calls: ['再……再來一壺！', '我、我沒醉！', '嗝。'],
    chat: ['「想當年，老子也是築過基的……築、築過基的人，嗝，不跟你一般見識。」', '「你知道聚寶閣底下埋著什麼嗎？……嗝。我也不知道。」'],
  },
];

const GENG = ['一', '二', '三', '四', '五'];
function watchCall(s, n) {
  const h = s.tod;
  const g = h >= 19 && h < 21 ? 0 : h >= 21 && h < 23 ? 1 : h >= 23 || h < 1 ? 2 : h < 3 ? 3 : 4;
  return [`咚——咚！${GENG[g]}更天——`, '天乾物燥——小心火燭——', g === 2 ? '三更天——平安無事——' : '關門關窗——防偷防盜——'][n % 3];
}

const HOUSES = new Set(['house', 'farmhouse', 'mansion', 'shop', 'teahouse', 'hut', 'hall', 'bighall']);
let doorCache = null;
/** The doors of a region's houses (in front of each, where you would knock). */
export function doorsOf(region) {
  if (!doorCache) {
    doorCache = {};
    for (const st of STRUCTURES) {
      if (!HOUSES.has(st.sprite)) continue;
      // the front (the side you see), else wherever the house can be got into from
      let door = null;
      for (const side of [1, -1]) {
        for (const dy of [14, 24, 34, 44]) {
          for (const dx of [0, -20, 20, -34, 34]) {
            const x = st.x + dx;
            const y = st.y + side * (st.h / 2 + dy);
            if (!door && !collides(null, x, y, 8) && isReachable(x, y)) door = [x, y];
          }
        }
      }
      if (!door) continue;
      const r = regionIdAt(door[0], door[1]);
      (doorCache[r] = doorCache[r] || []).push(door);
    }
  }
  return doorCache[region] || [];
}

function folkOf(L) {
  if (L.folk) return L.folk;
  const g = world();
  L.folk = [];
  for (const [region, n] of Object.entries(WANDERERS)) {
    const ridx = REGION_IDS.indexOf(region);
    const at = NODES[region].at;
    const cand = [];
    for (let j = 0; j < 115; j++) {
      for (let i = 0; i < 130; i++) {
        const k = idxOf(i, j);
        if (g.reg[k] !== ridx || !g.reach[k] || g.solidCell[k]) continue;
        const x = cellX(i);
        const y = cellY(j);
        if (Math.hypot(x - at[0], y - at[1]) > 520) continue;
        cand.push([x, y]);
      }
    }
    const doors = doorsOf(region);
    for (let m = 0; m < n && cand.length; m++) {
      const [x, y] = cand[Math.floor(hash2(m, ridx, 77) * cand.length)];
      const look = Math.floor(hash2(m, ridx, 78) * 6);
      // home: the nearest door; some stay out late (the market never quite sleeps)
      let door = null;
      for (const d of doors) if (!door || Math.hypot(d[0] - x, d[1] - y) < Math.hypot(door[0] - x, door[1] - y)) door = d;
      const owl = hash2(m, ridx, 81) < (region === 'luoxia_market' ? 0.3 : 0.12);
      L.folk.push({
        id: `${region}:${m}`, region, name: '路人', x, y, hx: x, hy: y, tx: x, ty: y, wait: hash2(m, ridx, 79) * 4, look, face: 1,
        line: Math.floor(hash2(m, ridx, 80) * 99), door, owl, bed: 19.5 + hash2(m, ridx, 82) * 2, rise: 5.5 + hash2(m, ridx, 83) * 2, inside: false,
      });
    }
  }
  for (const x of EXTRAS) {
    const [px, py] = x.at || x.patrol[0];
    L.folk.push({ ...x, extra: true, x: px, y: py, face: x.face || 1, leg: 1, wait: 0, line: 0, inside: false, tx: px, ty: py });
  }
  return L.folk;
}

function folkOut(s, f) {
  if (f.extra) return inHours(f.hours, s.tod);
  return !f.inside;
}

function updateFolk(s, L, dt, jumped) {
  const w = s.world;
  for (const f of folkOf(L)) {
    const far = Math.abs(f.x - w.x) > SEE * 1.6 || Math.abs(f.y - w.y) > SEE * 2;
    if (f.extra) {
      updateExtra(s, L, f, dt, far);
      continue;
    }
    const night = !f.owl && (s.tod >= f.bed || s.tod < f.rise);
    if (night) {
      if (f.inside) continue;
      // home for the night: walk to the door (if someone is watching), then in
      const seen = !jumped && Math.hypot(f.x - w.x, f.y - w.y) < SEE;
      if (!f.door) {
        if (!seen) f.inside = true;
      } else if (!seen) {
        f.inside = true;
        f.path = null;
        [f.x, f.y] = f.door;
        continue;
      } else {
        if (!f.homeward) {
          f.homeward = true;
          f.path = findPath(null, f.x, f.y, f.door[0], f.door[1]) || [f.door.slice()];
        }
        if (L.then?.folk === f) {
          f.moving = false;
          continue;
        }
        if (follow(f, 34, dt)) {
          f.inside = true;
          f.homeward = false;
        }
        continue;
      }
    } else if (f.inside) {
      // morning: out of the door and back to the street
      f.inside = false;
      f.homeward = false;
      f.path = null;
      f.tx = f.hx;
      f.ty = f.hy;
      f.wait = Math.random() * 2;
    } else if (f.homeward) {
      // day broke before they got home
      f.homeward = false;
      f.path = null;
    }
    if (far || f.inside) continue;
    if (L.then?.folk === f) {
      f.moving = false;
      continue;
    }
    if (f.wait > 0) {
      f.wait -= dt;
      f.moving = false;
      continue;
    }
    const d = Math.hypot(f.tx - f.x, f.ty - f.y);
    if (d < 4) {
      f.wait = 1.5 + Math.random() * 5;
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 150;
      f.tx = f.hx + Math.cos(a) * r;
      f.ty = f.hy + Math.sin(a) * r;
      continue;
    }
    const sp = 38 * dt;
    const nx = f.x + ((f.tx - f.x) / d) * sp;
    const ny = f.y + ((f.ty - f.y) / d) * sp;
    if (collides(s, nx, ny, 9) || regionAt(s, nx, ny) !== f.region) {
      f.tx = f.x;
      f.ty = f.y;
      continue;
    }
    if (Math.abs(nx - f.x) > 0.01) f.face = nx < f.x ? -1 : 1;
    f.x = nx;
    f.y = ny;
    f.moving = true;
  }
}

function updateExtra(s, L, f, dt, far) {
  if (!inHours(f.hours, s.tod) || far) {
    f.moving = false;
    return;
  }
  if (L.then?.folk === f) {
    f.moving = false;
    return;
  }
  if (f.patrol) {
    // up the street and back, a pause at each end
    if (f.wait > 0) {
      f.wait -= dt;
      f.moving = false;
      return;
    }
    if (!f.path) f.path = [f.patrol[f.leg].slice()];
    if (follow(f, 28, dt)) {
      f.leg = (f.leg + 1) % f.patrol.length;
      f.wait = 3 + Math.random() * 3;
    }
    return;
  }
  if (f.wander) {
    if (f.wait > 0) {
      f.wait -= dt;
      f.moving = false;
      return;
    }
    if (!f.path) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * f.wander;
      const tx = f.at[0] + Math.cos(a) * r;
      const ty = f.at[1] + Math.sin(a) * r;
      if (collides(s, tx, ty, 9)) {
        f.wait = 1;
        return;
      }
      f.path = [[tx, ty]];
    }
    if (follow(f, 14, dt)) f.wait = 2 + Math.random() * 4;
  }
}

/** Townsfolk out and about now (the ones indoors are not). */
export function folkNow(s, L) {
  return folkOf(L).filter((f) => folkOut(s, f));
}

/** What a townsperson says when you talk to them. */
export function folkChat(s, f) {
  f.line += 1;
  if (f.chat) return f.chat[f.line % f.chat.length];
  const lines = FOLK_LINES[f.region] || FOLK_LINES.qingshi_town;
  const fresh = s.rumors.find((r) => !r.read && r.kind !== 'npc');
  if (fresh && f.line % 3 === 0) {
    fresh.read = true;
    return `「聽說了嗎？」${fresh.text}`;
  }
  return `「${lines[f.line % lines.length]}」`;
}

// ── what people say as you pass ──

function sayOf(L, ent) {
  return ent.sayUntil > L.t ? ent.say : null;
}

function speak(L, ent, text) {
  ent.say = text;
  ent.sayUntil = L.t + 3.6;
}

function updateChatter(s, L, dt) {
  const w = s.world;
  // the watchman calls the hours whether anyone listens or not
  for (const f of folkOf(L)) {
    if (f.calls !== 'watch' || !inHours(f.hours, s.tod)) continue;
    f.callT = (f.callT ?? 2) - dt;
    if (f.callT > 0) continue;
    f.callT = 9 + Math.random() * 5;
    f.line += 1;
    const d = Math.hypot(f.x - w.x, f.y - w.y);
    if (d < 900) speak(L, f, watchCall(s, f.line));
    if (d >= 400 && d < 1400 && L.heardWatch !== s.day) {
      L.heardWatch = s.day;
      L.feed.push({ kind: 'ambient', text: `遠處傳來打更聲：「${watchCall(s, 1)}」` });
    }
  }
  L.chatT = (L.chatT ?? 3) - dt;
  if (L.chatT > 0) return;
  L.chatT = 3.5 + Math.random() * 5;
  const cands = [];
  for (const f of folkOf(L)) {
    if (!folkOut(s, f) || f.calls === 'watch' || f.sayUntil > L.t) continue;
    if (Math.hypot(f.x - w.x, f.y - w.y) > 300) continue;
    const lines = f.calls || CALLS[f.region];
    if (lines) cands.push([f, lines]);
  }
  for (const k of Object.values(walkersOf(L))) {
    if (k.inside || k.moving || k.sayUntil > L.t) continue;
    if (Math.hypot(k.x - w.x, k.y - w.y) > 300) continue;
    const lines = SAYS[k.id]?.[k.act];
    if (lines?.length) cands.push([k, lines]);
  }
  if (!cands.length) return;
  const [ent, lines] = cands[Math.floor(Math.random() * cands.length)];
  if (ent === L.lastSpeaker && cands.length > 1) return;
  L.lastSpeaker = ent;
  speak(L, ent, lines[Math.floor(Math.random() * lines.length)]);
}

/** The people of the world, for a frame. */
export function updatePeople(s, L, dt) {
  const before = L.peopleClock;
  updateWalkers(s, L, dt);
  updateFolk(s, L, dt, before !== undefined && (L.peopleClock - before > 1.5 || L.peopleClock < before));
  updateChatter(s, L, dt);
}
