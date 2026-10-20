// Shared rules for the dashboard data files (src/data/cases.json and
// src/data/travel-notices.json): used by update-data.mjs before it writes a file,
// and by the site's data checks.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// Notes that describe a data file (_note, _notes, _source: what its fields mean, where it
// comes from) stay out of the published data. They are saved at the same path under
// review/ (git-ignored) instead. Returns the data without them.
export function splitNotes(root, file, data) {
  const notes = {};
  const rest = {};
  for (const [k, v] of Object.entries(data)) (['_note', '_notes', '_source'].includes(k) ? notes : rest)[k] = v;
  if (Object.keys(notes).length) {
    const dest = join(root, 'review', relative(join(root, 'src'), file));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, JSON.stringify(notes, null, 2) + '\n');
  }
  return rest;
}

export const DISEASES = ['dengue', 'zika', 'chikungunya'];

// Every state, DC and territory the site shows (same codes as src/data/places.json).
export const PLACE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
  'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'PR', 'VI', 'GU', 'AS', 'MP',
];

// CDC NNDSS "Reporting Area" names → postal codes. "New York City" is reported
// separately from the rest of New York State; the update script adds it to NY.
export const CDC_AREA_CODES = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO',
  Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY',
  Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'New York City': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'Puerto Rico': 'PR', 'U.S. Virgin Islands': 'VI', Guam: 'GU', 'American Samoa': 'AS',
  'Commonwealth of Northern Mariana Islands': 'MP',
};

/** Saturday that ends MMWR week `week` of `year` (weeks run Sunday–Saturday; week 1 is
 *  the first week with at least four days in the new year). Returns YYYY-MM-DD. */
export function mmwrWeekEnding(year, week) {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dow = jan1.getUTCDay(); // 0 = Sunday
  // Sunday that starts week 1.
  const start = new Date(jan1);
  start.setUTCDate(1 - dow + (dow <= 3 ? 0 : 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + (week - 1) * 7 + 6);
  return end.toISOString().slice(0, 10);
}

const isCount = (v) => v === null || (Number.isInteger(v) && v >= 0);

/** "All of the U.S.": every state, DC and the five territories added up, for the year
 *  and for the latest MMWR week. A place with no value ("not reported") adds nothing
 *  and is listed in `missing`, so the site can say the total leaves it out. */
export function allUSTotals(places, week) {
  const ytd = {};
  const latestWeek = {};
  const missing = {};
  for (const d of DISEASES) {
    ytd[d] = 0;
    latestWeek[d] = 0;
    missing[d] = [];
    for (const code of PLACE_CODES) {
      const p = places?.[code]?.[d];
      const y = p?.ytd ?? null;
      const w = p?.weekly?.[week - 1] ?? null;
      if (y === null) missing[d].push(code);
      else ytd[d] += y;
      if (w === null) {
        if (!missing[d].includes(code)) missing[d].push(code);
      } else latestWeek[d] += w;
    }
  }
  return { places: PLACE_CODES.length, ytd, week: latestWeek, missing };
}

/** Problems with a cases.json object (empty list = valid). `prev` = the last good file. */
export function validateCases(data, prev) {
  const problems = [];
  if (!data || typeof data !== 'object') return ['not an object'];
  if (!Number.isInteger(data.mmwrYear) || !Number.isInteger(data.mmwrWeek) || data.mmwrWeek < 1 || data.mmwrWeek > 53)
    problems.push('MMWR year or week missing or invalid');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.weekEnding ?? '')) problems.push('weekEnding missing');
  if (!data.source?.datasetId || !data.source?.datasetUrl) problems.push('source missing');
  for (const code of PLACE_CODES) {
    const p = data.places?.[code];
    if (!p) {
      problems.push(`place ${code} missing`);
      continue;
    }
    for (const d of DISEASES) {
      if (!p[d] || !isCount(p[d].ytd)) problems.push(`${code} ${d}: year-to-date count must be a non-negative integer or null`);
      // Weekly values (CDC's "current week" column): one per MMWR week up to the latest,
      // each a non-negative whole number or null ("not reported", never shown as 0).
      if (p[d] && (!Array.isArray(p[d].weekly) || !p[d].weekly.every(isCount)))
        problems.push(`${code} ${d}: weekly values must each be a non-negative whole number or null ("not reported")`);
      else if (p[d] && Number.isInteger(data.mmwrWeek) && p[d].weekly.length !== data.mmwrWeek)
        problems.push(`${code} ${d}: ${p[d].weekly.length} weekly values for MMWR week ${data.mmwrWeek}`);
    }
  }
  for (const d of DISEASES) {
    if (!isCount(data.national?.[d])) problems.push(`national ${d} invalid`);
    const s = data.split?.[d];
    if (!s || typeof s.available !== 'boolean' || !s.url) problems.push(`split ${d} missing`);
    else if (s.available) {
      const ok = (o) => o && Number.isInteger(o.local) && o.local >= 0 && Number.isInteger(o.travel) && o.travel >= 0;
      if (!ok(s.states) || !ok(s.territories) || !/^\d{4}-\d{2}-\d{2}$/.test(s.asOf ?? '')) problems.push(`split ${d}: numbers or date invalid`);
    }
  }
  // "All of the U.S." must equal the sum of the places (year and latest week).
  if (!data.allUS) problems.push('allUS total missing');
  else {
    const expected = allUSTotals(data.places, data.mmwrWeek);
    for (const d of DISEASES) {
      if (data.allUS.ytd?.[d] !== expected.ytd[d]) problems.push(`allUS ${d} year total ${data.allUS.ytd?.[d]} is not the sum of the places (${expected.ytd[d]})`);
      if (data.allUS.week?.[d] !== expected.week[d]) problems.push(`allUS ${d} week total ${data.allUS.week?.[d]} is not the sum of the places (${expected.week[d]})`);
    }
  }
  // Nothing at all reported is more likely a broken download than a real year.
  if (DISEASES.every((d) => !data.national?.[d])) problems.push('all national counts are zero');
  if (prev && Number.isInteger(prev.mmwrYear)) {
    const older = data.mmwrYear < prev.mmwrYear || (data.mmwrYear === prev.mmwrYear && data.mmwrWeek < prev.mmwrWeek);
    if (older) problems.push(`week ${data.mmwrYear}-W${data.mmwrWeek} is older than the saved file's ${prev.mmwrYear}-W${prev.mmwrWeek}`);
  }
  return problems;
}

/** Problems with a travel-notices.json object (empty list = valid). */
export function validateNotices(data) {
  const problems = [];
  if (!data || typeof data !== 'object') return ['not an object'];
  if (!/^\d{4}-\d{2}-\d{2}T/.test(data.fetchedAt ?? '')) problems.push('fetchedAt missing');
  if (!Number.isInteger(data.feedItems) || data.feedItems < 1) problems.push('the CDC feed had no items (likely a failed download)');
  if (!Array.isArray(data.notices)) return [...problems, 'notices missing'];
  for (const n of data.notices) {
    if (![1, 2, 3, 4].includes(n.level)) problems.push(`notice "${n.title}": level must be 1–4`);
    if (!DISEASES.includes(n.disease)) problems.push(`notice "${n.title}": unknown disease`);
    if (!/^https:\/\/wwwnc\.cdc\.gov\/travel\/notices\//.test(n.url ?? '')) problems.push(`notice "${n.title}": link must be a CDC notice`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date ?? '')) problems.push(`notice "${n.title}": date missing`);
  }
  return problems;
}

/** Whole days between an ISO date and now. */
export function ageInDays(isoDate, now = new Date()) {
  return Math.floor((now - new Date(isoDate.length === 10 ? `${isoDate}T23:59:59Z` : isoDate)) / 86400000);
}
