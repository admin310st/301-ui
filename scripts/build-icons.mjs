// scripts/build-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { optimize } from 'svgo';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'static', 'img', 'icons-src');
const OUT_SPRITE = path.join(ROOT, 'static', 'icons-sprite.svg');
const OUT_MAP = path.join(ROOT, 'static', 'icons-map.json');
const OUT_PREVIEW = path.join(ROOT, 'static', 'icons-preview.html');

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...walkDir(full));
    } else if (e.isFile() && e.name.endsWith('.svg')) {
      files.push(full);
    }
  }
  return files;
}

function getCategory(filePath) {
  const rel = path.relative(SRC_ROOT, filePath);
  const parts = rel.split(path.sep);
  const cat = parts[0] || 'mono';
  return cat === 'brand' ? 'brand' : 'mono';
}

function build() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error('[icons] Source dir does not exist:', SRC_ROOT);
    process.exit(1);
  }

  const files = walkDir(SRC_ROOT);
  const symbols = [];
  const map = { mono: [], brand: [] };

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const category = getCategory(file);
    const baseName = path.basename(file, '.svg');
    const id = `i-${category}-${baseName}`;

    const { data } = optimize(raw, {
      multipass: true,
      plugins: [
        { name: 'removeDimensions', active: true },
        { name: 'removeTitle', active: true },
        { name: 'removeDesc', active: true },
        { name: 'removeComments', active: true },
        { name: 'removeMetadata', active: true },
        { name: 'removeXMLNS', active: false },
        { name: 'removeViewBox', active: false }
      ]
    });

    const vbMatch = data.match(/viewBox="([^"]+)"/);
    const viewBox = vbMatch ? vbMatch[1] : '0 0 24 24';

    let inner = data
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '');

    const symbol = `<symbol id="${id}" viewBox="${viewBox}">${inner}</symbol>`;
    symbols.push(symbol);

    map[category].push(baseName);
  }

  const sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">',
    ...symbols,
    '</svg>',
    ''
  ].join('\n');

  fs.writeFileSync(OUT_SPRITE, sprite, 'utf8');
  fs.writeFileSync(OUT_MAP, JSON.stringify(map, null, 2), 'utf8');

  const monoItems = map.mono
    .map(
      (name) =>
        `<div class="item"><svg><use href="#i-mono-${name}"></use></svg><div>mono/${name}</div></div>`
    )
    .join('\n');
  const brandItems = map.brand
    .map(
      (name) =>
        `<div class="item"><svg><use href="#i-brand-${name}"></use></svg><div>brand/${name}</div></div>`
    )
    .join('\n');

  const previewHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Icons preview</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px; }
    .group { margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; }
    .item { text-align: center; font-size: 12px; }
    .item svg { width: 24px; height: 24px; display: block; margin: 0 auto 4px; }
  </style>
</head>
<body>
${sprite}

<div class="group">
  <h2>Mono icons (currentColor)</h2>
  <div class="grid">
${monoItems}
  </div>
</div>

<div class="group">
  <h2>Brand icons (colored)</h2>
  <div class="grid">
${brandItems}
  </div>
</div>
</body>
</html>`;

  fs.writeFileSync(OUT_PREVIEW, previewHtml, 'utf8');

  console.log('[icons] Sprite:', OUT_SPRITE);
  console.log('[icons] Map:', OUT_MAP);
  console.log('[icons] Preview:', OUT_PREVIEW);
}

build();