// 一介散修 is played sideways, like a MOBA: the left thumb walks, the right
// one fights. A phone held upright gets the whole page turned a quarter
// round, so it is the right way up once the phone is turned (and stays so
// with the screen's rotation locked, or in an app that will not turn);
// turned sideways, the page is simply wide.
//
// Whatever reads where a finger is goes through pt() and rectOf(), which
// turn the screen's numbers into the page's. In the page's own terms (its
// width, its height, left and right) nothing changes when it is turned.

/** rot: turned; w, h: the page's own size; vw: the screen's width (the turn's pivot). */
export const orient = { rot: false, w: 0, h: 0, vw: 0, vh: 0 };

const param = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('rotate') : null;

/** A phone or a tablet (a finger, not a mouse). */
function touchy() {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

/** ?rotate=1 always turns the page (for trying it at a desk), ?rotate=0 never does. */
function wantRot(vw, vh) {
  if (param === '1') return true;
  if (param === '0') return false;
  return vh > vw && touchy();
}

/**
 * Look at the screen again; true if the page changed shape. While you are
 * typing, the keyboard squeezes the screen: the page stays as it was.
 */
export function measure() {
  if (typeof window === 'undefined') return false;
  const a = document.activeElement;
  if (orient.vw && a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rot = wantRot(vw, vh);
  const w = rot ? vh : vw;
  const h = rot ? vw : vh;
  if (rot === orient.rot && w === orient.w && h === orient.h && vw === orient.vw) return false;
  Object.assign(orient, { rot, w, h, vw, vh });
  const html = document.documentElement;
  html.classList.toggle('rot', rot);
  html.style.setProperty('--app-w', `${w}px`);
  html.style.setProperty('--app-h', `${h}px`);
  html.style.setProperty('--vp-w', `${vw}px`);
  return true;
}

/** Where a pointer is, in the page's terms. */
export function pt(e) {
  return orient.rot ? { x: e.clientY, y: orient.vw - e.clientX } : { x: e.clientX, y: e.clientY };
}

/** Where an element is, in the page's terms (like getBoundingClientRect). */
export function rectOf(el) {
  const r = el.getBoundingClientRect();
  if (!orient.rot) return r;
  const W = orient.vw;
  return { left: r.top, top: W - r.right, right: r.bottom, bottom: W - r.left, width: r.height, height: r.width, x: r.top, y: W - r.right };
}

/**
 * Keep the page's shape up with the screen: on a turn, a resize, the
 * address bar coming and going. onChange runs after the page changes shape.
 */
export function watchOrient(onChange) {
  measure();
  let timer = 0;
  const again = () => {
    if (measure()) onChange();
  };
  const later = () => {
    again();
    // (some phones tell the new size a moment after the turn)
    clearTimeout(timer);
    timer = setTimeout(again, 350);
  };
  window.addEventListener('resize', later);
  window.addEventListener('orientationchange', later);
  window.visualViewport?.addEventListener('resize', later);
  // (the keyboard went away: look again)
  document.addEventListener('focusout', () => setTimeout(again, 120));
}

/**
 * Turned, the browser's own scrolling of a list may not follow the finger
 * (it scrolls along the screen, not the page). So, turned, lists scroll
 * here: a drag moves the list under the finger and carries on a little
 * after you let go; a drag is never taken for a tap.
 */
export function turnedScrolling(root) {
  let drag = null;
  let fling = 0;
  const can = (n, axis) => {
    const o = getComputedStyle(n)[axis === 'y' ? 'overflowY' : 'overflowX'];
    if (o !== 'auto' && o !== 'scroll') return false;
    return axis === 'y' ? n.scrollHeight > n.clientHeight + 1 : n.scrollWidth > n.clientWidth + 1;
  };
  // the nearest list that scrolls: up and down (or else sideways, like a row of tabs)
  const scroller = (el) => {
    for (let n = el; n && n !== root.parentNode; n = n.parentElement) {
      if (!(n instanceof HTMLElement)) continue;
      const y = can(n, 'y');
      const x = can(n, 'x');
      if (x || y) return { el: n, x, y };
    }
    return null;
  };
  root.addEventListener('pointerdown', (e) => {
    if (!orient.rot || e.pointerType === 'mouse' || drag) return;
    const sc = e.target.closest?.('input, textarea, canvas, .cbt-btn') ? null : scroller(e.target);
    if (!sc) return;
    cancelAnimationFrame(fling);
    const p = pt(e);
    drag = { id: e.pointerId, ...sc, px: p.x, py: p.y, x0: p.x, y0: p.y, t: performance.now(), vx: 0, vy: 0, moved: false };
  }, true);
  root.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = pt(e);
    if (!drag.moved && Math.hypot(p.x - drag.x0, p.y - drag.y0) > 8) drag.moved = true;
    if (!drag.moved) return;
    const now = performance.now();
    const dx = drag.x ? p.x - drag.px : 0;
    const dy = drag.y ? p.y - drag.py : 0;
    drag.el.scrollLeft -= dx;
    drag.el.scrollTop -= dy;
    const dt = Math.max(1, now - drag.t);
    drag.vx = 0.7 * drag.vx + 0.3 * (dx / dt);
    drag.vy = 0.7 * drag.vy + 0.3 * (dy / dt);
    drag.px = p.x;
    drag.py = p.y;
    drag.t = now;
  }, true);
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    // a drag is not a tap: the click that follows is swallowed
    const swallow = (c) => {
      c.stopPropagation();
      c.preventDefault();
    };
    root.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => root.removeEventListener('click', swallow, { capture: true }), 60);
    // (and the list carries on a little, slowing)
    let vx = d.vx * 16;
    let vy = d.vy * 16;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(48, now - last) / 16;
      last = now;
      d.el.scrollLeft -= vx * dt;
      d.el.scrollTop -= vy * dt;
      vx *= Math.pow(0.94, dt);
      vy *= Math.pow(0.94, dt);
      if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) fling = requestAnimationFrame(step);
    };
    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) fling = requestAnimationFrame(step);
  };
  root.addEventListener('pointerup', end, true);
  root.addEventListener('pointercancel', end, true);
}
