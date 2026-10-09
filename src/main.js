import { startApp } from './ui/app.js';

const params = new URLSearchParams(location.search);
// ?speed=60 makes 閉關 run 60× faster, for playtesting only.
const speed = Math.max(1, Math.min(600, Number(params.get('speed')) || 1));

startApp(document.getElementById('app'), { speed });

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__EMBEDDED__) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
