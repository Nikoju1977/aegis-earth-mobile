#!/usr/bin/env node
/**
 * Single source of truth: GitHub Pages assets at repository root.
 * Capacitor's www/ folder is a generated copy; never edit it directly.
 */
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'icon.svg', 'extras.js', 'extras.css'];
const check = process.argv.includes('--check');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
let mismatches = 0;

for (const name of FILES) {
  const source = join(ROOT, name);
  const target = join(ROOT, 'www', name);
  if (!existsSync(source)) throw new Error('Missing Pages source: ' + name);
  if (!check) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  if (!existsSync(target) || digest(source) !== digest(target)) {
    console.error('OUT OF SYNC: ' + name);
    mismatches += 1;
  } else console.log('OK ' + name);
}
if (mismatches) process.exitCode = 1;
else console.log(check ? 'Web/Android sources match.' : 'Capacitor web assets synchronized.');
