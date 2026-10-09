// Small readers for writing event conditions. They only read state.

export const has = (s, id, n = 1) => (s.player.items[id] || 0) >= n;
export const flag = (s, k) => !!s.flags[k];
export const favor = (s, id) => s.npcs[id]?.favor ?? 0;
export const alive = (s, id) => !!s.npcs[id]?.alive;
export const met = (s, id) => !!s.npcs[id]?.met;
export const within = (s, [a, b]) => s.day >= a && s.day < b;
export const known = (s, node) => !!s.nodes[node]?.known;
export const realmAtLeast = (s, realm, stage = 0) =>
  s.player.realm > realm || (s.player.realm === realm && s.player.stage >= stage);

/** For a choice's `need`: returns a reason string when the player lacks 靈石. */
export const needLs = (n) => (s) => (s.player.ls >= n ? null : `靈石不足（需 ${n}）`);
export const needItem = (id, label) => (s) => (has(s, id) ? null : `需要${label}`);

/** 戰力 a procedural NPC brings to a fight. */
export const npcPower = (npc) => (npc ? 10 + 6 * (npc.stage + 1) + (npc.realm >= 2 ? 80 : 0) : 30);

export const season = (s) => {
  const m = Math.floor((s.day % 360) / 30) + 1;
  return m <= 3 ? 'spring' : m <= 6 ? 'summer' : m <= 9 ? 'autumn' : 'winter';
};

/** Deterministic variant for flavor text, so a reload shows the same words. */
export const variant = (s, list, salt = 0) => list[Math.abs((s.day * 7 + salt * 13) | 0) % list.length];
