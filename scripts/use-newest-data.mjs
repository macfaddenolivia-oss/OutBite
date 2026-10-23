#!/usr/bin/env node
// node scripts/use-newest-data.mjs <folder>
// Used by .github/workflows/deploy.yml before it downloads new CDC data. <folder> holds
// the data files saved after the last successful download (restored from the Actions
// cache). For each file, the newer copy wins: the saved one replaces src/data/ only if
// it was downloaded later than the copy in git (its "fetchedAt"), so the site never goes
// back to an older copy in git when a newer good one exists, and a newer copy committed
// to git is never replaced by an older saved one. Prints what it chose.

import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILES = ['cases.json', 'travel-notices.json', 'travel-risk.json'];
const folder = process.argv[2];
if (!folder) {
  console.error('Usage: node scripts/use-newest-data.mjs <folder with the last good data files>');
  process.exit(2);
}
const fetchedAt = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')).fetchedAt ?? '';
  } catch {
    return '';
  }
};
for (const name of DATA_FILES) {
  const saved = join(folder, name);
  const inGit = join(root, 'src/data', name);
  if (!existsSync(saved)) {
    console.log(`${name}: no saved copy; using the copy in git (downloaded ${fetchedAt(inGit) || 'unknown'}).`);
    continue;
  }
  const [a, b] = [fetchedAt(saved), fetchedAt(inGit)];
  if (a && a > b) {
    copyFileSync(saved, inGit);
    console.log(`${name}: using the last good download (${a}), newer than the copy in git (${b || 'unknown'}).`);
  } else console.log(`${name}: keeping the copy in git (${b}); the saved copy (${a || 'unknown'}) isn't newer.`);
}
