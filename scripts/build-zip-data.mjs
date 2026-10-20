#!/usr/bin/env node
// npm run build-zip-data
// Builds src/data/zip-to-state.json, the ZIP code box's lookup on "Is it near me?", from
// the U.S. Census Bureau's 2020 ZCTA to County relationship file (public domain):
// https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
// (documented at https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html).
// The download happens only when this script runs, never in a visitor's browser.
//
// Census ZIP Code Tabulation Areas (ZCTAs) are close to, but not exactly, USPS ZIP
// codes: some ZIPs (like PO boxes) have no ZCTA, and some ZCTAs cross state lines. Each
// ZCTA is stored under every state or territory it touches (the state is the first two
// digits of each county's code). The 2020 file covers the 50 states, D.C., Puerto Rico,
// the U.S. Virgin Islands, Guam, American Samoa and the Northern Mariana Islands.
//
// Output (state codes and ZIPs only): { "AL": "35004 35005 …", … }, each state's ZCTAs
// sorted and separated by spaces, states in the order of src/data/places.json.
// Rebuild when the Census publishes a new relationship file.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_REL = 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt';
const OUT = 'src/data/zip-to-state.json';

// State and territory FIPS codes → USPS codes (all 56 places on the site).
const FIPS = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI',
};

const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

const res = await fetch(URL_REL);
if (!res.ok) fail(`Census download failed: HTTP ${res.status}`);
const text = (await res.text()).replace(/^﻿/, '');
const [header, ...lines] = text.trim().split(/\r?\n/);
const cols = header.split('|');
const zi = cols.indexOf('GEOID_ZCTA5_20');
const ci = cols.indexOf('GEOID_COUNTY_20');
if (zi < 0 || ci < 0) fail(`unexpected columns: ${header}`);

const byState = new Map(Object.values(FIPS).map((code) => [code, new Set()]));
for (const line of lines) {
  const f = line.split('|');
  const zip = f[zi];
  if (!zip) continue; // a county part with no ZCTA (water, unpopulated land)
  if (!/^\d{5}$/.test(zip)) fail(`bad ZCTA "${zip}"`);
  const code = FIPS[f[ci].slice(0, 2)];
  if (!code) fail(`unknown state code in county ${f[ci]}`);
  byState.get(code).add(zip);
}

// States in the site's order; every place must have ZIPs.
const order = JSON.parse(readFileSync(join(root, 'src/data/places.json'), 'utf8')).places.map((p) => p.code);
const out = {};
for (const code of order) {
  const zips = [...(byState.get(code) ?? [])].sort();
  if (!zips.length) fail(`no ZCTAs for ${code}`);
  out[code] = zips.join(' ');
}
const json = `${JSON.stringify(out, null, 1)}\n`;
writeFileSync(join(root, OUT), json);

const states = new Map();
for (const [code, zips] of byState) for (const z of zips) states.set(z, [...(states.get(z) ?? []), code]);
const multi = [...states.values()].filter((s) => s.length > 1).length;
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`✅ ${OUT}: ${states.size} ZCTAs (${multi} in more than one state), ${order.length} states and territories.`);
console.log(`   Territories: ${['PR', 'VI', 'GU', 'AS', 'MP'].map((c) => `${c} ${byState.get(c).size}`).join(', ')}.`);
console.log(`   Size: ${kb(json.length)} (${kb(gzipSync(json).length)} gzipped).`);
