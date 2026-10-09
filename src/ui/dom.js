// Tiny DOM helpers: h('div.cls', {attrs}, ...children)

export function h(spec, attrs, ...children) {
  if (attrs === null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    if (attrs !== undefined && attrs !== null) children.unshift(attrs);
    attrs = {};
  }
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

/** Append children, skipping null/false and flattening arrays. */
export function put(el, ...children) {
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

/** Paragraphs from text with blank-line separators; single newlines become line breaks. */
export function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => {
      const el = h('p');
      p.split('\n').forEach((line, i) => {
        if (i) el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(line));
      });
      return el;
    });
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}
