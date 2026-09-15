#!/usr/bin/env node
// Régénère data/marketing.json avec le jeu de démo.
// Usage : node scripts/seed-demo.mjs [--force] [--empty]
// Sans --force, refuse d'écraser un fichier qui contient déjà des coups.
// --empty écrit un document vide (pipeline + canaux par défaut, aucun coup).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoDoc } from '../js/model/seed.js';
import { emptyDoc } from '../js/model/doc.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const empty = args.includes('--empty');
const OUT = path.join(ROOT, 'data/marketing.json');

if (existsSync(OUT) && !force) {
  const current = JSON.parse(readFileSync(OUT, 'utf8'));
  if (current.ops?.length) {
    console.error(`${OUT} contient déjà ${current.ops.length} coups. Relance avec --force pour écraser.`);
    process.exit(1);
  }
}

const today = new Date().toISOString().slice(0, 10);
const doc = empty ? { ...emptyDoc(), updatedAt: new Date().toISOString() } : demoDoc({ today });
writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${doc.ops.length} coups écrits dans ${path.relative(ROOT, OUT)}`);
