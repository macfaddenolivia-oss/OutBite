// "Traveling soon?" data, built from CDC's lists (src/data/travel-risk.json) and CDC
// Travel Health Notices (src/data/travel-notices.json), both written by npm run update-data.
// One entry per country or territory (ISO code): CDC's entries for each virus (a country
// can have several, e.g. Hawaii and Alaska for Zika), the matching notices, and which
// CDC advice applies. Used by the travel page and the printable trip checklist; the
// visitor's browser only filters this list (nothing is sent or saved).
import risk from '../data/travel-risk.json';
import worldMap from '../data/world-map.json';
import { noticeData, destinationName, formatDate } from './cases';
import { getLocale } from '../i18n';

export type Virus = 'dengue' | 'chikungunya' | 'zika';
export const VIRUSES: Virus[] = ['dengue', 'chikungunya', 'zika'];

// How serious each CDC category is, for sorting the table (higher = more risk). Same
// order as the world maps.
export const LEVEL: Record<Virus, Record<string, number>> = {
  dengue: { 'Frequent or continuous': 3, 'Risk varies based on region': 2, 'Risk varies by region': 2, 'Sporadic or uncertain': 1 },
  chikungunya: { 'Current outbreaks': 3, 'Countries with elevated risk for U.S. travelers': 1 },
  zika: {
    'Current or past Zika transmission': 3,
    'Known to have mosquito that spreads Zika, but no reported Zika cases': 1,
    'Not known to have mosquito that spreads Zika': 0,
  },
};

/** Which CDC advice applies. `any`: CDC lists dengue or chikungunya risk, or Zika
 *  "current or past transmission". zikaNotice: an active Zika Travel Health Notice;
 *  zikaNoNotice: Zika transmission listed but no active notice. */
export type Flag = 'any' | 'dengue' | 'chikOutbreak' | 'chikElevated' | 'zika' | 'zikaNotice' | 'zikaNoNotice';
export const FLAGS: Flag[] = ['any', 'dengue', 'chikOutbreak', 'chikElevated', 'zika', 'zikaNotice', 'zikaNoNotice'];

interface Entry {
  name: string;
  category: string;
  part: boolean;
}
export interface Destination {
  code: string;
  name: string;
  nameEn: string;
  entries: Record<Virus, Entry[]>;
  /** Highest CDC level per virus (-1 = not on CDC's list), for sorting. */
  level: Record<Virus, number>;
  notices: typeof noticeData.notices;
  flags: Flag[];
}

const R = risk as unknown as Record<Virus, { groups: any[]; updated: string; asOf?: string; source: string }>;

function placesOf(v: Virus): Entry[] {
  const g = R[v].groups;
  const list =
    v === 'dengue'
      ? g.flatMap((r: any) => r.categories.flatMap((c: any) => c.places.map((p: any) => ({ ...p, category: c.name }))))
      : g.flatMap((c: any) => c.places.map((p: any) => ({ ...p, category: c.name })));
  return list.filter((p: any) => p.code).map((p: any) => ({ name: p.name, category: p.category, part: Boolean(p.part), code: p.code }));
}

// Country names from the browser's built-in list, with the site's own choices where
// they differ (worldRisk.codeNames, e.g. Spanish "Samoa Estadounidense").
const regionName = (code: string, htmlLang: string) => {
  const own = (getLocale(htmlLang.slice(0, 2)).messages as Record<string, any>).worldRisk?.codeNames?.[code];
  if (own) return own;
  try {
    return new Intl.DisplayNames([htmlLang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

export function destinations(lang: string): Destination[] {
  const htmlLang = getLocale(lang).meta.htmlLang;
  const byVirus = Object.fromEntries(VIRUSES.map((v) => [v, placesOf(v)])) as Record<Virus, (Entry & { code: string })[]>;
  const codes = new Set<string>([...VIRUSES.flatMap((v) => byVirus[v].map((p) => p.code)), ...Object.keys(worldMap.shapes), ...Object.keys(worldMap.dots)]);
  const out: Destination[] = [];
  for (const code of codes) {
    const entries = Object.fromEntries(
      VIRUSES.map((v) => [
        v,
        byVirus[v]
          .filter((p) => p.code === code)
          // The whole country first, then its parts.
          .sort((a, b) => Number(a.part) - Number(b.part))
          .map(({ name, category, part }) => ({ name, category, part })),
      ]),
    ) as Record<Virus, Entry[]>;
    const level = Object.fromEntries(VIRUSES.map((v) => [v, Math.max(-1, ...entries[v].map((e) => LEVEL[v][e.category] ?? 1))])) as Record<Virus, number>;
    const nameEn = regionName(code, 'en');
    // CDC notices name the destination in English: matched by the country's name, or by
    // one of CDC's own place names for it.
    const notices = noticeData.notices.filter(
      (n) => n.destination !== 'Global' && (n.destination === nameEn || VIRUSES.some((v) => entries[v].some((e) => e.name === n.destination))),
    );
    // CDC's worldwide notices apply wherever CDC lists that virus.
    const global = noticeData.notices.filter((n) => n.destination === 'Global' && entries[n.disease as Virus]?.length > 0);
    const has = (v: Virus, cat: string) => entries[v].some((e) => e.category === cat);
    const flags: Flag[] = [];
    const dengue = entries.dengue.length > 0;
    const chikOutbreak = has('chikungunya', 'Current outbreaks');
    const chikElevated = has('chikungunya', 'Countries with elevated risk for U.S. travelers');
    const zika = has('zika', 'Current or past Zika transmission');
    const zikaNotice = notices.some((n) => n.disease === 'zika');
    if (dengue || chikOutbreak || chikElevated || zika) flags.push('any');
    if (dengue) flags.push('dengue');
    if (chikOutbreak) flags.push('chikOutbreak');
    if (chikElevated && !chikOutbreak) flags.push('chikElevated');
    if (zika || zikaNotice) flags.push('zika');
    if (zikaNotice) flags.push('zikaNotice');
    else if (zika) flags.push('zikaNoNotice');
    out.push({ code, name: regionName(code, htmlLang), nameEn, entries, level, notices: [...notices, ...global], flags });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, htmlLang));
}

/** "Per CDC, last updated …" date per virus, and Zika's "classifications as of". */
export function riskDates(htmlLang: string): Record<Virus, { updated: string; asOf: string | null; source: string }> {
  return Object.fromEntries(
    VIRUSES.map((v) => [v, { updated: formatDate(R[v].updated, htmlLang), asOf: R[v].asOf ? formatDate(R[v].asOf!, htmlLang) : null, source: R[v].source }]),
  ) as Record<Virus, { updated: string; asOf: string | null; source: string }>;
}

export { destinationName, formatDate };
