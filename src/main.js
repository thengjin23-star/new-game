import { startApp } from './ui/app.js';
import * as E from './world/explore.js';
import * as Ev from './core/events.js';
import * as B from './core/battle.js';

const params = new URLSearchParams(location.search);
// ?speed=60 makes 閉關 run 60× faster, for playtesting only.
const speed = Math.max(1, Math.min(600, Number(params.get('speed')) || 1));

// ?view=2d|3d picks how the world is drawn (otherwise: 3D where the device can)
const view = ['2d', '3d'].includes(params.get('view')) ? params.get('view') : null;

const app = startApp(document.getElementById('app'), { speed, view });
// ?debug: expose the running game for playtesting tools
if (params.has('debug')) window.__debug = { app, E, Ev, B };

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__EMBEDDED__) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
