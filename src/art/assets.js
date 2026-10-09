// Slots for painted pictures. Wherever the game paints something with its
// own brushes (a person's card, an event's scene), a finished picture may
// take its place: put the file under assets/ and list it in
// assets/manifest.json, e.g.
//
//   { "card/player": "cards/player.webp",
//     "card/npc:lin_chen": "cards/lin_chen.webp",
//     "event/intro_fall": "events/intro_fall.webp" }
//
// Slots with no picture keep the brushwork. The game asks only for files
// the manifest names, and never in the single-page build.

const pictures = new Map();
let asked = false;

/** Read the manifest and start loading what it lists (once). */
export async function loadAssets(base = './assets/') {
  if (asked || typeof window === 'undefined' || window.__EMBEDDED__) return;
  asked = true;
  try {
    const res = await fetch(`${base}manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const list = await res.json();
    for (const [key, file] of Object.entries(list)) {
      if (typeof file !== 'string') continue;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => pictures.set(key, img);
      img.src = base + file;
    }
  } catch {
    /* no pictures: the brushes do it all */
  }
}

/** The picture in a slot, once it has loaded (else null). */
export function asset(key) {
  return pictures.get(key) || null;
}

/** Every slot the game knows how to fill, for whoever paints them. */
export const SLOTS = {
  'card/player': '你自己（站姿，腳在圖底中央，透明背景）',
  'card/npc:<id>': '有名有姓的人物，如 card/npc:lin_chen、card/npc:song_he',
  'card/folk:<0-5>': '路人：農夫、婦人、老者、孩童、散修、宗門弟子',
  'card/mob:<kind>': '野獸與敵人：wolf、snake、bandit、ghost',
  'event/<id>': '事件插圖（橫幅），如 event/intro_fall',
};
