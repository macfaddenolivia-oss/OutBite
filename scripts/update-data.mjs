#!/usr/bin/env node
// npm run update-data
// Fetches the dashboard data from public CDC sources and saves it for the build:
//   src/data/cases.json           CDC NNDSS Weekly Data (data.cdc.gov, dataset x9gk-5huc)
//   src/data/travel-notices.json  CDC Travel Health Notices RSS (dengue, Zika, chikungunya)
//   src/data/travel-risk.json     CDC world risk lists (dengue, chikungunya, Zika pages)
// Each file is validated before it is written. If a download or a check fails, the
// last good file is kept, the reason is printed and the script exits with an error (the
// deploy workflow decides what that means: see .github/workflows/deploy.yml). Every
// download gets 30 seconds and one retry. Run daily once hosted, then rebuild.
// No API keys or accounts. Never touches the Puerto Rico Department of Health portal.

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CDC_AREA_CODES,
  DISEASES,
  PLACE_CODES,
  mmwrWeekEnding,
  validateCases,
  validateNotices,
  allUSTotals,
  splitNotes,
} from './data-lib.mjs';
import { DENGUE_ES, RISK_SOURCES, byCode, parseChikungunya, parseDengue, parseDengueNotesEs, parseZika, unmatched, validateRisk, zikaDataUrl } from './travel-risk-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASES_FILE = join(root, 'src/data/cases.json');
const NOTICES_FILE = join(root, 'src/data/travel-notices.json');
const RISK_FILE = join(root, 'src/data/travel-risk.json');
const UA = 'OutbiteDataUpdate/1.0 (public-health education site; reads public CDC data)';

const DATASET_ID = 'x9gk-5huc';
const DATASET_URL = `https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/${DATASET_ID}`;
const API = `https://data.cdc.gov/resource/${DATASET_ID}.json`;
// NNDSS labels for each virus. Dengue is reported in several rows ("Dengue", "Severe
// dengue", in some years "Dengue-like illness"); they are added together.
const LABELS = {
  dengue: ['Dengue virus infections, Dengue', 'Dengue virus infections, Severe dengue', 'Dengue virus infections, Dengue-like illness'],
  zika: ['Zika virus disease, non-congenital'],
  chikungunya: ['Arboviral diseases, Chikungunya virus disease'],
};
// National local vs travel breakdowns (CDC disease data pages). Read only if CDC
// allows automated access; otherwise the site links to them.
const SPLIT_PAGES = {
  dengue: 'https://www.cdc.gov/dengue/data-research/facts-stats/current-data.html',
  zika: 'https://www.cdc.gov/zika/zika-cases-us/index.html',
  chikungunya: 'https://www.cdc.gov/chikungunya/data-maps/index.html',
};
const NOTICES_RSS = 'https://wwwnc.cdc.gov/travel/rss/notices.xml';
const NOTICES_PAGE = 'https://wwwnc.cdc.gov/travel/notices';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Every download: 30 seconds, then one retry (2 seconds later) if it failed or timed out.
const TIMEOUT_MS = 30_000;
async function fetchWithRetry(url, options) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok || attempt === 2) return res;
    } catch (e) {
      if (attempt === 2) throw new Error(e.name === 'TimeoutError' ? `no answer within ${TIMEOUT_MS / 1000} seconds (tried twice)` : `${e.message} (tried twice)`);
    }
    await sleep(2000);
  }
}
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
function writeSafely(file, data) {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(splitNotes(root, file, data), null, 2) + '\n');
  renameSync(tmp, file);
}
async function get(url, accept = 'application/json') {
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': UA, Accept: accept } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res;
}
const soql = (params) => `${API}?${new URLSearchParams(params)}`;

// CDC value + flag → count, 0, or null ("not reported"). In NNDSS tables "-" means
// no reported cases; other flags (N, NN, NP, NC, U) mean no value is available.
function count(value, flag) {
  if (value !== undefined && value !== null && value !== '') return Math.round(Number(value));
  if (flag === '-') return 0;
  return null;
}
// Add counts: null only if every part is null.
const add = (a, b) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));

// CDC's "Cases in the United States" table: columns Year | US States locally acquired |
// US States travel-associated | US Territories locally acquired | US Territories
// travel-associated. Returns the row for `year` (or the latest year) and the page's
// "as of" date, or null if the page doesn't have exactly that shape.
function readSplitTable(html, year) {
  const months = 'January|February|March|April|May|June|July|August|September|October|November|December';
  const asOfMatch = html.replace(/<[^>]+>/g, ' ').match(new RegExp(`as of\\s+(${months})\\s+(\\d{1,2}),\\s+(\\d{4})`, 'i'));
  for (const [table] of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
    const cells = (row) => [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, '').replace(/\s+/g, ' ').trim());
    const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => cells(r[0]));
    const header = rows.map((r) => r.join(' ')).join(' ');
    if (!/US States/i.test(header) || !/Locally acquired/i.test(header) || !/Travel-associated/i.test(header) || !/US Territories/i.test(header)) continue;
    const data = rows.filter((r) => /^\d{4}$/.test(r[0]) && r.length === 5);
    const row = data.find((r) => Number(r[0]) === year) ?? data.at(-1);
    if (!row) continue;
    const n = row.slice(1).map((v) => Number(v.replace(/[^0-9]/g, '')));
    if (n.some((v) => !Number.isInteger(v)) || !asOfMatch) return null;
    const asOf = new Date(`${asOfMatch[1]} ${asOfMatch[2]}, ${asOfMatch[3]} UTC`).toISOString().slice(0, 10);
    return { year: Number(row[0]), asOf, states: { local: n[0], travel: n[1] }, territories: { local: n[2], travel: n[3] } };
  }
  return null;
}

async function updateCases() {
  const prev = readJson(CASES_FILE);
  const allLabels = Object.values(LABELS).flat();
  const labelList = allLabels.map((l) => `'${l.replace(/'/g, "''")}'`).join(',');

  // 1. Current MMWR year and the labels CDC uses in it.
  const yearRows = await (await get(soql({ $select: 'label, max(year) as year', $where: `label in(${labelList})`, $group: 'label' }))).json();
  const year = Math.max(...yearRows.map((r) => Number(r.year)));
  const labelsUsed = Object.fromEntries(
    DISEASES.map((d) => [d, LABELS[d].filter((l) => yearRows.some((r) => r.label === l && Number(r.year) === year))]),
  );
  for (const d of DISEASES) if (!labelsUsed[d].length) throw new Error(`no ${d} label found for ${year}`);
  await sleep(1100); // data.cdc.gov asks for 1s between requests

  // 2. Every week of the current year for these labels.
  const rows = await (
    await get(soql({
      $select: 'states,week,label,m1,m1_flag,m3,m3_flag',
      $where: `year='${year}' AND label in(${labelList})`,
      $limit: '50000',
    }))
  ).json();
  const week = Math.max(...rows.map((r) => Number(r.week)));
  const weekEnding = mmwrWeekEnding(year, week);

  // 3. Per place: year-to-date (latest week's cumulative) and weekly counts.
  const empty = () => ({ ytd: null, weekly: Array(week).fill(null) });
  const places = Object.fromEntries(PLACE_CODES.map((c) => [c, Object.fromEntries(DISEASES.map((d) => [d, empty()]))]));
  const seen = new Set();
  for (const r of rows) {
    const code = CDC_AREA_CODES[r.states];
    if (!code) continue; // regions, "U.S. Residents", "Total", "Non-U.S. Residents"
    const disease = DISEASES.find((d) => labelsUsed[d].includes(r.label));
    if (!disease) continue;
    const w = Number(r.week);
    const cell = places[code][disease];
    cell.weekly[w - 1] = add(cell.weekly[w - 1], count(r.m1, r.m1_flag));
    if (w === week) {
      cell.ytd = add(cell.ytd, count(r.m3, r.m3_flag));
      seen.add(code);
    }
  }
  const missingPlaces = PLACE_CODES.filter((c) => !seen.has(c));
  if (missingPlaces.length) throw new Error(`CDC has no week ${week} rows for: ${missingPlaces.join(', ')}`);

  // 4. National totals: the sum of all states, DC and territories.
  const national = Object.fromEntries(DISEASES.map((d) => [d, PLACE_CODES.reduce((s, c) => s + (places[c][d].ytd ?? 0), 0)]));
  const notReported = PLACE_CODES.flatMap((c) => DISEASES.filter((d) => places[c][d].ytd === null).map((d) => `${c} ${d}`));
  // "All of the U.S.": year and latest-week totals of every state, DC and territory.
  const allUS = allUSTotals(places, week);

  // 5. National local vs travel: read CDC's pages only where the numbers are plain
  //    text in an HTML table (Zika today). Charts are not scraped; the site links instead.
  const split = {};
  for (const d of DISEASES) {
    split[d] = { available: false, url: SPLIT_PAGES[d], asOf: null, year: null, states: null, territories: null, reason: '' };
    try {
      const res = await fetchWithRetry(SPLIT_PAGES[d], { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        split[d].reason = `CDC refused automated access (HTTP ${res.status}); linking instead`;
        continue;
      }
      const parsed = readSplitTable(await res.text(), year);
      if (parsed) Object.assign(split[d], { available: true, reason: 'read from the HTML table on the page' }, parsed);
      else split[d].reason = 'the numbers are not in a plain HTML table (chart or other format); linking instead';
    } catch (e) {
      split[d].reason = `could not reach the page (${e.message}); linking instead`;
    }
  }

  const data = {
    _note:
      'CDC NNDSS Weekly Data. Per-place numbers are year-to-date reported cases (Cumulative YTD Current MMWR Year), including travel-associated cases; CDC does not split local vs travel per place here. null = CDC published no value ("not reported"); 0 = CDC reported no cases ("-").',
    _notes: [
      'New York = "New York" (excluding New York City) + "New York City", which CDC reports separately.',
      'Dengue = the sum of the dengue labels CDC used this year (see labels.dengue).',
      'National = the sum of the 50 states, DC and the five territories.',
      'allUS = "All of the U.S.": the same sum for the year (ytd) and the latest week (week); missing lists places with no value, which the totals leave out.',
      'weekly[i] = cases reported in MMWR week i+1 (current week column).',
    ],
    source: {
      name: 'CDC National Notifiable Diseases Surveillance System (NNDSS), Weekly Data',
      datasetId: DATASET_ID,
      datasetUrl: DATASET_URL,
      apiUrl: API,
    },
    labels: labelsUsed,
    mmwrYear: year,
    mmwrWeek: week,
    weekEnding,
    fetchedAt: new Date().toISOString(),
    national,
    allUS,
    split,
    notReported,
    places,
  };
  const problems = validateCases(data, prev);
  if (problems.length) throw new Error(`validation failed:\n  - ${problems.join('\n  - ')}`);
  writeSafely(CASES_FILE, data);
  return { year, week, weekEnding, labelsUsed, national, notReported, split };
}

async function updateNotices() {
  const xml = await (await get(NOTICES_RSS, 'application/rss+xml, text/xml')).text();
  const decode = (s) =>
    s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const tag = (t) => decode(it.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? '');
    return { title: tag('title'), link: tag('link'), pubDate: tag('pubDate') };
  });
  const notices = [];
  for (const it of items) {
    // "Level 2 - Chikungunya in Nicaragua", "Level 1 - Global Dengue"
    const m = it.title.match(/^Level\s+(\d)\s*-\s*(.+)$/i);
    if (!m) continue;
    const rest = m[2];
    const disease = DISEASES.find((d) => new RegExp(`\\b${d}\\b`, 'i').test(rest));
    if (!disease) continue;
    const inMatch = rest.match(/\bin\s+(.+)$/i);
    const destination = inMatch ? inMatch[1] : /^global\b/i.test(rest) ? 'Global' : rest;
    notices.push({
      title: it.title,
      level: Number(m[1]),
      disease,
      destination,
      date: new Date(it.pubDate).toISOString().slice(0, 10),
      url: it.link,
    });
  }
  const data = {
    _note: 'CDC Travel Health Notices about dengue, Zika or chikungunya, from the CDC RSS feed. The list comes only from CDC.',
    source: { feedUrl: NOTICES_RSS, pageUrl: NOTICES_PAGE },
    fetchedAt: new Date().toISOString(),
    feedItems: items.length,
    notices,
  };
  const problems = validateNotices(data);
  if (problems.length) throw new Error(`validation failed:\n  - ${problems.join('\n  - ')}`);
  writeSafely(NOTICES_FILE, data);
  return data;
}

// World risk lists. Each virus is read and validated on its own: if a page fails or
// changes shape, that virus keeps its last good data (and says so); the file is only
// written when every virus has good data.
async function updateRisk() {
  const prev = readJson(RISK_FILE);
  const html = async (url) => (await get(url, 'text/html')).text();
  const readers = {
    dengue: async () => {
      const d = { source: RISK_SOURCES.dengue, ...parseDengue(await html(RISK_SOURCES.dengue)) };
      // CDC's Spanish notes; if that page can't be read, the Spanish site shows the English note.
      try {
        d.notesEs = parseDengueNotesEs(await html(DENGUE_ES));
      } catch {
        d.notesEs = null;
      }
      return d;
    },
    chikungunya: async () => ({ source: RISK_SOURCES.chikungunya, ...parseChikungunya(await html(RISK_SOURCES.chikungunya)) }),
    zika: async () => {
      const page = await html(RISK_SOURCES.zika);
      const dataUrl = zikaDataUrl(page);
      if (!dataUrl) throw new Error('the Zika page no longer names its data file');
      const config = await (await get(dataUrl)).json();
      return { source: RISK_SOURCES.zika, dataFile: dataUrl, ...parseZika(page, config) };
    },
  };
  const data = { _note: 'CDC world risk lists for dengue, chikungunya and Zika (npm run update-data). Category names are CDC\'s own; place names are CDC\'s, with ISO codes (null = no match; part = only part of a country).', fetchedAt: new Date().toISOString() };
  const report = {};
  for (const [virus, read] of Object.entries(readers)) {
    try {
      const d = await read();
      const problems = validateRisk(virus, d);
      if (problems.length) throw new Error(problems.join('; '));
      d.byCode = byCode(virus, d);
      d.unmatched = unmatched(d);
      d.checkedAt = data.fetchedAt;
      data[virus] = d;
      report[virus] = { ok: true, d };
    } catch (e) {
      if (!prev?.[virus]) throw new Error(`${virus}: ${e.message} (and no earlier good data to keep)`);
      data[virus] = prev[virus];
      report[virus] = { ok: false, reason: e.message };
    }
    await sleep(300);
  }
  writeSafely(RISK_FILE, data);
  return report;
}

let failed = false;
try {
  const r = await updateCases();
  console.log(`✅ Cases: MMWR ${r.year} week ${r.week} (week ending ${r.weekEnding}).`);
  for (const d of DISEASES) console.log(`   ${d}: labels ${JSON.stringify(r.labelsUsed[d])}; national ${r.national[d]}`);
  console.log(`   Not reported (no CDC value): ${r.notReported.length ? r.notReported.join(', ') : 'none'}`);
  for (const d of DISEASES) {
    const x = r.split[d];
    console.log(`   ${d} local/travel split: ${x.reason}${x.available ? ` (${x.year}: states ${x.states.local} local / ${x.states.travel} travel; territories ${x.territories.local} / ${x.territories.travel}; as of ${x.asOf})` : ''}`);
  }
} catch (e) {
  failed = true;
  console.error(`❌ Cases not updated; keeping the last good file. Reason: ${e.message}`);
}
try {
  const n = await updateNotices();
  console.log(`✅ Travel notices: ${n.notices.length} about dengue, Zika or chikungunya (of ${n.feedItems} in CDC's feed).`);
  for (const x of n.notices) console.log(`   Level ${x.level} · ${x.disease} · ${x.destination} · ${x.date}`);
} catch (e) {
  failed = true;
  console.error(`❌ Travel notices not updated; keeping the last good file. Reason: ${e.message}`);
}
try {
  const r = await updateRisk();
  for (const [virus, x] of Object.entries(r)) {
    if (!x.ok) {
      failed = true;
      console.error(`❌ ${virus} world risk list not updated; keeping the last good data. Reason: ${x.reason}`);
      continue;
    }
    const groups = x.d.groups.map((g) => (g.region ? `${g.region}: ${g.categories.map((c) => `${c.name} ${c.places.length}`).join(', ')}` : `${g.name} ${g.places.length}`));
    console.log(`✅ ${virus} world risk (CDC, updated ${x.d.updated}${x.d.asOf ? `, as of ${x.d.asOf}` : ''}): ${Object.keys(x.d.byCode).length} countries on the map.`);
    for (const g of groups) console.log(`   ${g}`);
    console.log(`   Names that didn't match a country: ${x.d.unmatched.length ? x.d.unmatched.join(', ') : 'none'}`);
  }
} catch (e) {
  failed = true;
  console.error(`❌ World risk lists not updated; keeping the last good file. Reason: ${e.message}`);
}
process.exit(failed ? 1 : 0);
