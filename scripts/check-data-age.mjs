#!/usr/bin/env node
// node scripts/check-data-age.mjs
// Used by .github/workflows/deploy.yml after the CDC download, before the build: fails if
// CDC's latest reporting week in src/data/cases.json (the week-ending date the site shows
// as "CDC data through…") is more than 14 days old, so stale numbers never go out quietly
// (the daily run then stops; push and by-hand runs publish with a warning).
// CDC usually publishes a week's data within about a week of its last day.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ageInDays } from './data-lib.mjs';

const MAX_DAYS = 14;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(readFileSync(join(root, 'src/data/cases.json'), 'utf8'));
const days = ageInDays(cases.weekEnding);
const line = `CDC's latest reporting week ends ${cases.weekEnding} (MMWR ${cases.mmwrYear} week ${cases.mmwrWeek}), ${days} days ago; downloaded ${cases.fetchedAt}.`;
if (days > MAX_DAYS) {
  console.error(`❌ ${line} That's more than ${MAX_DAYS} days: CDC may have stopped publishing, or the download keeps failing.`);
  process.exit(1);
}
console.log(`✅ ${line}`);
