// Reads CDC's world risk pages for dengue, chikungunya and Zika into one structure
// (src/data/travel-risk.json), and validates it. Used by update-data.mjs and
// the site's data checks. Reads only public CDC pages/files (allowed by cdc.gov/robots.txt).
//
// Dengue:      https://www.cdc.gov/dengue/areas-with-risk/index.html
//              region headings (h2), then CDC's categories as accordion headings (h3)
//              with the country lists, the "Information for travelers" notes, the date.
// Chikungunya: https://www.cdc.gov/chikungunya/data-maps/index.html
//              "Current outbreaks" and "Countries with elevated risk for U.S. travelers".
// Zika:        https://www.cdc.gov/zika/geo/index.html and the data file its map loads
//              (data-config-url, e.g. /zika/modules/geo/zika-areas-risk.json): every place
//              with its classification, plus the page's "as of" date.
// Country names are matched to ISO 3166-1 alpha-2 codes (i18n-iso-countries plus the
// aliases below). Names that don't match are listed, never guessed; places that are
// only part of a country (e.g. "Chile (Easter Island only)") are kept in the lists but
// not shaded on the map.

import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

countries.registerLocale(en);

// CDC's Spanish dengue page (for its notes in Spanish).
export const DENGUE_ES = 'https://www.cdc.gov/dengue/es/areas-with-risk/areas-con-riesgo-de-dengue.html';

export const RISK_SOURCES = {
  dengue: 'https://www.cdc.gov/dengue/areas-with-risk/index.html',
  chikungunya: 'https://www.cdc.gov/chikungunya/data-maps/index.html',
  zika: 'https://www.cdc.gov/zika/geo/index.html',
};

// CDC's own category names (as shown on each page). The Zika data file says "transmits";
// the page's legend says "spreads", which is what visitors see.
export const RISK_CATEGORIES = {
  dengue: ['Frequent or continuous', 'Sporadic or uncertain', 'Risk varies based on region'],
  chikungunya: ['Current outbreaks', 'Countries with elevated risk for U.S. travelers'],
  zika: [
    'Current or past Zika transmission',
    'Known to have mosquito that spreads Zika, but no reported Zika cases',
    'Not known to have mosquito that spreads Zika',
  ],
};
const ZIKA_FILE_TO_PAGE = {
  'current or past zika transmission': RISK_CATEGORIES.zika[0],
  'known to have mosquito that transmits zika, but no reported zika cases': RISK_CATEGORIES.zika[1],
  'not known to have mosquito that transmits zika': RISK_CATEGORIES.zika[2],
};
export const DENGUE_REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania/Pacific Islands'];

// CDC names that i18n-iso-countries doesn't know as written. Each maps to an ISO code.
const ALIASES = {
  'congo (democratic republic of)': 'CD',
  'democratic republic of the congo': 'CD',
  'congo, democratic republic of the': 'CD',
  'republic of the congo': 'CG',
  'congo (republic of)': 'CG',
  'congo': 'CG',
  'united republic of tanzania': 'TZ',
  'tanzania': 'TZ',
  "cote d'ivoire": 'CI',
  'côte d’ivoire': 'CI',
  'cape verde': 'CV',
  'cabo verde': 'CV',
  'são tomé and príncipe': 'ST',
  'sao tome and principe': 'ST',
  'saint barthelemy': 'BL',
  'saint barthélemy': 'BL',
  'saint martin': 'MF',
  'sint maarten': 'SX',
  'curacao': 'CW',
  'curaçao': 'CW',
  'bonaire': 'BQ',
  'saba': 'BQ',
  'saint eustatius': 'BQ',
  'bonaire, sint eustatius and saba': 'BQ',
  'turks and caicos': 'TC',
  'british virgin islands': 'VG',
  'united states virgin islands': 'VI',
  'us virgin islands': 'VI',
  'u.s. virgin islands': 'VI',
  'bolivia': 'BO',
  'venezuela': 'VE',
  'vietnam': 'VN',
  'viet nam': 'VN',
  'laos': 'LA',
  "lao people's democratic republic": 'LA',
  'burma': 'MM',
  'burma (myanmar)': 'MM',
  'myanmar (burma)': 'MM',
  'micronesia': 'FM',
  'micronesia (federated states of)': 'FM',
  'federated states of micronesia': 'FM',
  'east timor': 'TL',
  'timor-leste': 'TL',
  'timor-leste (east timor)': 'TL',
  'brunei': 'BN',
  'russia': 'RU',
  'syria': 'SY',
  'iran': 'IR',
  'south korea': 'KR',
  'north korea': 'KP',
  'taiwan': 'TW',
  'moldova': 'MD',
  'kosovo': 'XK',
  'eswatini': 'SZ',
  'eswatini (swaziland)': 'SZ',
  'swaziland': 'SZ',
  'the gambia': 'GM',
  'gambia': 'GM',
  'the bahamas': 'BS',
  'bahamas': 'BS',
  'reunion': 'RE',
  'réunion': 'RE',
  'pitcairn islands': 'PN',
  'wallis and futuna': 'WF',
  'wallis and futuna islands': 'WF',
  'saint helena': 'SH',
  'falkland islands': 'FK',
  'falkland islands (islas malvinas)': 'FK',
  'vatican city': 'VA',
  'holy see': 'VA',
  'north macedonia': 'MK',
  'macedonia': 'MK',
  'czechia': 'CZ',
  'czech republic': 'CZ',
  'palestine': 'PS',
  'turkey': 'TR',
  'türkiye': 'TR',
  'turkey (türkiye)': 'TR',
  'netherlands': 'NL',
  'the netherlands': 'NL',
  'united kingdom': 'GB',
  'united states': 'US',
  'united states of america': 'US',
  'mainland china': 'CN',
  'hong kong': 'HK',
  'hong kong sar': 'HK',
  'macau': 'MO',
  'macau sar': 'MO',
  'saint kitts and nevis': 'KN',
  'saint vincent and the grenadines': 'VC',
  'saint lucia': 'LC',
  'virgin islands (british)': 'VG',
  'virgin islands (u.s.)': 'VI',
  'são tomé and principe': 'ST',
  'gaza/west bank': 'PS',
  'united kingdom of great britain and northern ireland': 'GB',
  'vatican': 'VA',
  'turks and caicos islands': 'TC',
  'pitcairn': 'PN',
  'saint helena, ascension and tristan da cunha': 'SH',
  'antigua and barbuda': 'AG',
  'trinidad and tobago': 'TT',
  'aland islands': 'AX',
  'åland islands': 'AX',
  'heard island and mcdonald islands': 'HM',
  'svalbard': 'SJ',
  'jan mayen': 'SJ',
  'norfolk island': 'NF',
  'christmas island': 'CX',
  'cocos (keeling) islands': 'CC',
  'cook islands': 'CK',
  'niue': 'NU',
  'tokelau': 'TK',
  'northern mariana islands': 'MP',
  'american samoa': 'AS',
  'guam': 'GU',
  'puerto rico': 'PR',
  'french polynesia': 'PF',
  'new caledonia': 'NC',
  'western sahara': 'EH',
  'south sudan': 'SS',
  'central african republic': 'CF',
  'equatorial guinea': 'GQ',
  'guinea-bissau': 'GW',
  'papua new guinea': 'PG',
  'solomon islands': 'SB',
  'marshall islands': 'MH',
  'british indian ocean territory': 'IO',
  'french southern and antarctic lands': 'TF',
  'south georgia and the south sandwich islands': 'GS',
  'saint pierre and miquelon': 'PM',
  'bouvet island': 'BV',
  'montenegro': 'ME',
  'serbia': 'RS',
  'bosnia and herzegovina': 'BA',
  'kyrgyzstan': 'KG',
  'united arab emirates': 'AE',
  'saudi arabia': 'SA',
  'sri lanka': 'LK',
  'el salvador': 'SV',
  'costa rica': 'CR',
  'dominican republic': 'DO',
  'cayman islands': 'KY',
};

// Places CDC lists that are only part of a country: listed, not shaded.
const PART_OF = {
  'chile (easter island only)': 'CL',
  'easter island': 'CL',
  'alaska': 'US',
  'hawaii': 'US',
  'continental united states': 'US',
  'azores': 'PT',
  'madeira': 'PT',
  'madeira islands': 'PT',
  'canary islands': 'ES',
  'galapagos islands': 'EC',
  'galápagos islands': 'EC',
  'wake island': 'UM',
  'johnston atoll': 'UM',
  'midway islands': 'UM',
  'zanzibar': 'TZ',
  'bonaire, saba, sint eustatius': 'BQ',
  'saint martin (french part)': 'MF',
  'northern cyprus': 'CY',
  'kurile islands': 'RU',
  'crimea': 'UA',
  'french part of saint martin': 'MF',
  'jammu and kashmir': 'IN',
  'costa rica (northwest region)': 'CR',
  'azores islands': 'PT',
  'corsica': 'FR',
  'sardinia': 'IT',
  'sicily': 'IT',
  'plazas de soberania': 'ES',
  'saint paul and new amsterdamn islands': 'TF',
  'saint paul and new amsterdam islands': 'TF',
  'sovereign base areas of akrotiri and dhekelia': 'CY',
};

const norm = (s) =>
  String(s)
    .replace(/ /g, ' ')
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** { code, part } for a CDC place name, or { code: null } when it doesn't match. */
export function matchPlace(name) {
  const full = norm(name);
  if (PART_OF[full]) return { code: PART_OF[full], part: true };
  if (ALIASES[full]) return { code: ALIASES[full], part: false };
  // CDC's Zika file adds the governing country, e.g. "Anguilla (U.K.)": match the place itself.
  const n = full.replace(/\s*\((u\.k\.|u\.s\.|france|new zealand|australia|denmark|netherlands)\)$/, '');
  name = n;
  if (PART_OF[n]) return { code: PART_OF[n], part: true };
  if (ALIASES[n]) return { code: ALIASES[n], part: false };
  const code = countries.getAlpha2Code(name.trim(), 'en') ?? countries.getAlpha2Code(name.replace(/^the /i, '').trim(), 'en');
  return code ? { code, part: false } : { code: null, part: false };
}

// Named HTML entities CDC uses (including accented letters on the Spanish pages).
const ENTITIES = {
  nbsp: ' ', amp: '&', quot: '"', rsquo: "'", lsquo: "'", ldquo: '“', rdquo: '”', ndash: '–', mdash: '—',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿', ccedil: 'ç', atilde: 'ã', otilde: 'õ', ocirc: 'ô', ecirc: 'ê', acirc: 'â', agrave: 'à', egrave: 'è',
};
const decode = (s) =>
  String(s)
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTITIES[n] ?? m)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&atilde;/g, 'ã')
    .replace(/&eacute;/g, 'é')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&iacute;/g, 'í')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

/** CDC's page date from <meta property="cdc:last_updated">, as YYYY-MM-DD. */
export function pageDate(html) {
  const m = html.match(/<meta property="cdc:last_updated" content="([^"]+)"/);
  if (!m) return null;
  const d = new Date(`${m[1]} 12:00 UTC`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const place = (name) => ({ name, ...matchPlace(name) });

/** Dengue page → { updated, notes, groups: [{ region, categories: [{ name, places }] }] }. */
export function parseDengue(html) {
  const main = html.slice(html.indexOf('<main'));
  const h2s = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => ({ text: decode(m[1]), at: m.index }));
  const groups = [];
  for (let i = 0; i < h2s.length; i++) {
    if (!DENGUE_REGIONS.includes(h2s[i].text)) continue;
    const section = main.slice(h2s[i].at, h2s[i + 1]?.at ?? main.length);
    const categories = [];
    for (const m of section.matchAll(/<h3 class="accordion-header">[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/g)) {
      const name = decode(m[1]);
      const places = [...m[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((li) => decode(li[1])).filter(Boolean).map(place);
      categories.push({ name, places });
    }
    groups.push({ region: h2s[i].text, categories });
  }
  // Notes: the "Information for travelers" paragraphs, minus CDC's standing pointer to
  // country-specific travel information.
  const info = h2s.find((h) => h.text === 'Information for travelers');
  const next = info ? h2s[h2s.indexOf(info) + 1] : null;
  const notes = info
    ? [...main.slice(info.at, next?.at ?? main.length).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => decode(m[1])).filter((t) => t && !/^Before you travel/i.test(t))
    : [];
  return { updated: pageDate(html), notes, groups };
}

/** The Spanish dengue page's "Información para los viajeros" notes (CDC's own Spanish). */
export function parseDengueNotesEs(html) {
  const main = html.slice(html.indexOf('<main'));
  const h2s = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => ({ text: decode(m[1]), at: m.index }));
  const info = h2s.find((h) => /^Información para los viajeros$/i.test(h.text));
  if (!info) return null;
  const next = h2s[h2s.indexOf(info) + 1];
  return [...main.slice(info.at, next?.at ?? main.length).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => decode(m[1]))
    .filter((t) => t && !/^Antes de viajar/i.test(t));
}

/** Chikungunya page → { updated, groups: [{ name, places }], footnote }. */
export function parseChikungunya(html) {
  const main = html.slice(html.indexOf('<main'));
  const after = (heading) => {
    const i = main.search(new RegExp(`<h2[^>]*>\\s*${heading}\\s*</h2>`));
    if (i < 0) return null;
    const ul = main.slice(i).match(/<ul[^>]*>([\s\S]*?)<\/ul>/);
    return ul ? [...ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((li) => decode(li[1])).filter(Boolean) : null;
  };
  const outbreaks = after('Current outbreaks');
  const elevated = after('Countries with elevated risk for U.S. travelers');
  const foot = decode(main.match(/<p[^>]*>\s*(?:<(?:em|i|strong)>\s*)?\*Countries in this list[\s\S]*?<\/p>/)?.[0] ?? '');
  return {
    updated: pageDate(html),
    groups:
      outbreaks && elevated
        ? [
            { name: RISK_CATEGORIES.chikungunya[0], places: outbreaks.map(place) },
            { name: RISK_CATEGORIES.chikungunya[1], places: elevated.map(place) },
          ]
        : null,
    footnote: foot || null,
  };
}

/** The Zika page's data file address (data-config-url), or null. */
export function zikaDataUrl(html) {
  const m = html.match(/data-config-url="([^"]+\.json)"/);
  return m ? new URL(m[1], 'https://www.cdc.gov').href : null;
}

/** Zika page + data file → { updated, asOf, groups: [{ name, places }] }. */
export function parseZika(html, config) {
  const asOf = html.match(/Zika geographic risk classifications \(as of ([A-Z][a-z]+ \d{1,2}, \d{4})\)/);
  const geoCol = config?.columns?.geo?.name;
  const catCol = config?.columns?.primary?.name;
  const rows = Array.isArray(config?.data) ? config.data : [];
  const groups = RISK_CATEGORIES.zika.map((name) => ({ name, places: [] }));
  const unknownCategories = new Set();
  for (const r of rows) {
    const cat = ZIKA_FILE_TO_PAGE[norm(r[catCol] ?? '')];
    if (!cat) {
      unknownCategories.add(String(r[catCol]));
      continue;
    }
    groups.find((g) => g.name === cat).places.push(place(decode(r[geoCol])));
  }
  return {
    updated: pageDate(html),
    asOf: asOf ? new Date(`${asOf[1]} 12:00 UTC`).toISOString().slice(0, 10) : null,
    groups,
    rows: rows.length,
    unknownCategories: [...unknownCategories],
  };
}

/** Checks one virus's section; returns a list of problems (empty = good). */
export function validateRisk(virus, d) {
  const p = [];
  if (!d) return [`${virus}: missing`];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.updated ?? '')) p.push(`${virus}: no CDC "last updated" date`);
  if (!/^https:\/\/www\.cdc\.gov\//.test(d.source ?? '')) p.push(`${virus}: source must be a cdc.gov page`);
  const all = (d.groups ?? []).flatMap((g) => g.places ?? g.categories?.flatMap((c) => c.places) ?? []);
  if (virus === 'dengue') {
    const regions = (d.groups ?? []).map((g) => g.region);
    for (const r of DENGUE_REGIONS) if (!regions.includes(r)) p.push(`dengue: region "${r}" missing`);
    for (const g of d.groups ?? []) {
      if (!g.categories?.length) p.push(`dengue: ${g.region} has no categories`);
      for (const c of g.categories ?? []) {
        if (!RISK_CATEGORIES.dengue.includes(c.name) && !/^Risk varies by region$/.test(c.name)) p.push(`dengue: unknown category "${c.name}" in ${g.region}`);
        if (!c.places?.length) p.push(`dengue: ${g.region} / ${c.name} is empty`);
      }
    }
    if (all.length < 80) p.push(`dengue: only ${all.length} places (expected 80 or more)`);
  } else if (virus === 'chikungunya') {
    if ((d.groups ?? []).length !== 2) p.push('chikungunya: needs the two CDC lists');
    if (!d.groups?.[1]?.places?.length) p.push('chikungunya: the elevated-risk list is empty');
  } else if (virus === 'zika') {
    if ((d.groups ?? []).length !== 3) p.push('zika: needs CDC\'s three categories');
    if (all.length < 200) p.push(`zika: only ${all.length} places (expected 200 or more)`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.asOf ?? '')) p.push('zika: no "as of" date');
    if (d.unknownCategories?.length) p.push(`zika: unknown categories ${d.unknownCategories.join(', ')}`);
  }
  for (const x of all) {
    if (!x.name) p.push(`${virus}: a place without a name`);
    if (x.code !== null && !/^[A-Z]{2}$/.test(x.code)) p.push(`${virus}: bad code for ${x.name}`);
  }
  return p;
}

/** Map shading per code: the category a whole country falls in (parts of countries skipped). */
export function byCode(virus, d) {
  // { code: { category, part } }: a whole-country entry wins; a country with only a
  // partial entry (e.g. "Costa Rica (northwest region)") is marked part: true.
  const out = {};
  const all = [];
  if (virus === 'dengue') for (const g of d.groups) for (const c of g.categories) for (const x of c.places) all.push([x, c.name]);
  else for (const g of d.groups) for (const x of g.places) all.push([x, g.name]);
  for (const [x, cat] of all) if (x.code && !x.part && !out[x.code]) out[x.code] = { category: cat, part: false };
  for (const [x, cat] of all) if (x.code && x.part && !out[x.code]) out[x.code] = { category: cat, part: true };
  return out;
}

export function unmatched(d) {
  const all = (d.groups ?? []).flatMap((g) => g.places ?? g.categories.flatMap((c) => c.places));
  return [...new Set(all.filter((x) => !x.code).map((x) => x.name))];
}
