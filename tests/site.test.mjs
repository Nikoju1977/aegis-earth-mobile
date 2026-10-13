import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
const ROOT = new URL('../', import.meta.url);
const text = path => readFileSync(new URL(path, ROOT), 'utf8');
const sha = content => createHash('sha256').update(content).digest('hex');

test('Android/Pages use the exact same assets', () => {
  for (const file of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg']) {
    assert.equal(sha(text(file)), sha(text('www/' + file)), file + ' diverged');
  }
});

test('HTML inline scripts are syntactically valid JavaScript', () => {
  const html = text('index.html');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 1, 'Expected at least one inline script');
  for (const [, code] of scripts) new Script(code, { filename: 'index.html inline script' });
});

test('Mobile touch panel and source transparency are present', () => {
  const html = text('index.html');
  assert.match(html, /id="sheet"/);
  assert.match(html, /id="handle"/);
  assert.match(html, /sheetState\("closed"\)/);
  assert.match(html, /sourceStatus\(key\)/);
  assert.match(html, /class="limits"/);
  assert.match(html, /data-tab="radar"/);
});

test('PWA manifest is usable on Android', () => {
  const manifest = JSON.parse(text('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(manifest.icons.length > 0);
});

test('Service worker handles offline navigation', () => {
  const serviceWorker = text('sw.js');
  new Script(serviceWorker);
  assert.match(serviceWorker, /request.mode === 'navigate'/);
  assert.match(serviceWorker, /aegis-pages-v2/);
});

test('Capacitor loads local bundled web directory', () => {
  const config = JSON.parse(text('capacitor.config.json'));
  assert.equal(config.webDir, 'www');
  assert.ok(!config.server?.url, 'Remote server URL would require network and diverge from offline assets');
});
