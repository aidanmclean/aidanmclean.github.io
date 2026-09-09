#!/usr/bin/env node
/**
 * dev.js - local preview with rebuild-on-save. No dependencies.
 *
 *   node dev.js        ->  http://localhost:8000
 *
 * Watches data/ and templates/ and re-runs build.js when either changes,
 * so editing data/resume.json and refreshing the browser is the whole loop.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function build(why) {
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { encoding: 'utf8' });
    process.stdout.write(`${why} -> ${out.trim()}\n`);
  } catch (err) {
    process.stdout.write(`${why} -> BUILD FAILED\n${err.stderr || err.message}\n`);
  }
}

build('startup');

// Debounced: editors often fire several events for one save.
let timer = null;
for (const dir of ['data', 'templates']) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, (_e, file) => {
    clearTimeout(timer);
    timer = setTimeout(() => build(`${dir}/${file} changed`), 80);
  });
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, url === '/' ? 'index.html' : url);

    // Never serve outside the project directory.
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');

    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + url);
        return;
      }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(buf);
    });
  })
  .listen(PORT, () => console.log(`\n  preview  ->  http://localhost:${PORT}\n  watching data/ and templates/ — edit, save, refresh\n`));
