import { startApp } from './ui/app.js';
import * as E from './world/explore.js';

const params = new URLSearchParams(location.search);
// ?speed=60 makes 閉關 run 60× faster, for playtesting only.
const speed = Math.max(1, Math.min(600, Number(params.get('speed')) || 1));

const app = startApp(document.getElementById('app'), { speed });
// ?debug: expose the running game for playtesting tools
if (params.has('debug')) window.__debug = { app, E };

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__EMBEDDED__) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
