// npm run build
//  1. precache.json — every file the service worker should keep offline
//  2. dist/yijie-sanxiu.html — the whole game in one page (for claude.ai)

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const files = ['index.html', 'manifest.webmanifest', 'styles/main.css', ...walk('src'), ...walk('icons')]
  .filter((f) => !f.endsWith('.DS_Store'))
  .map((f) => './' + relative(root, join(root, f)).split('\\').join('/'));
writeFileSync(join(root, 'precache.json'), JSON.stringify(files, null, 1) + '\n');

const result = await build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  write: false,
  legalComments: 'none',
});
const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const css = readFileSync(join(root, 'styles/main.css'), 'utf8');

const page = `<title>一介散修</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=swap">
<style>
${css}
/* inside the claude.ai viewer the page root already clears the phone's safe areas */
:root { --sat: 0px; --sab: 0px; }
</style>
<div id="app"></div>
<script>window.__EMBEDDED__ = true;</script>
<script>${js}</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/yijie-sanxiu.html'), page);
console.log(`precache.json: ${files.length} files`);
console.log(`dist/yijie-sanxiu.html: ${(page.length / 1024).toFixed(0)} KB`);
