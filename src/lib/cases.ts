// CDC case data for the home panel and the "Is it near me?" dashboard.
// Files written by `npm run update-data` (scripts/update-data.mjs); the build only
// reads them (no network needed).
import cases from '../data/cases.json';
import notices from '../data/travel-notices.json';

export type Disease = 'dengue' | 'zika' | 'chikungunya';
export const DISEASES: Disease[] = ['dengue', 'zika', 'chikungunya'];

/** Year-to-date count; null = CDC published no value ("not reported"). */
export type Count = number | null;

interface PlaceCounts {
  ytd: Count;
  weekly: Count[];
}
export interface Split {
  available: boolean;
  url: string;
  asOf: string | null;
  year: number | null;
  states: { local: number; travel: number } | null;
  territories: { local: number; travel: number } | null;
}

export const caseData = cases as unknown as {
  source: { name: string; datasetId: string; datasetUrl: string; apiUrl: string };
  mmwrYear: number;
  mmwrWeek: number;
  weekEnding: string;
  fetchedAt: string;
  national: Record<Disease, number>;
  /** "All of the U.S.": every state, DC and territory added up (year and latest week). */
  allUS: { places: number; ytd: Record<Disease, number>; week: Record<Disease, number>; missing: Record<Disease, string[]> };
  split: Record<Disease, Split>;
  places: Record<string, Record<Disease, PlaceCounts>>;
};

export const noticeData = notices as unknown as {
  source: { feedUrl: string; pageUrl: string };
  fetchedAt: string;
  notices: { title: string; level: number; disease: Disease; destination: string; date: string; url: string }[];
};

/** Year-to-date counts per place, for the browser scripts. */
export function ytdByPlace(): Record<string, Record<Disease, Count>> {
  return Object.fromEntries(
    Object.entries(caseData.places).map(([code, p]) => [code, Object.fromEntries(DISEASES.map((d) => [d, p[d].ytd]))]),
  ) as Record<string, Record<Disease, Count>>;
}

/** "Is it near me?" map (design/map-scale-B.png): places CDC lists with ongoing local
 *  spread are orange whatever their count; everywhere else, 0 = none (white), 1–4 = four
 *  fixed blue steps by cases reported this year (1–9, 10–49, 50–99, 100 or more), -1 = not
 *  reported. Fixed, not taken from the data, so the map means the same thing every year. */
export const MAP_STEPS = [1, 10, 50, 100]; // lower edge of each blue step
export function mapStep(n: Count): number {
  if (n === null) return -1;
  return MAP_STEPS.filter((limit) => n >= limit).length;
}
/** An orange place with fewer than this many cases reported this year gets a line saying
 *  why it's orange anyway ("CDC lists ongoing local spread here…"). */
export const FEW_CASES = 10;

/** Home page map tile: 0 = no cases reported, 1–5 = the five blue steps, -1 = not reported. */
export const BIN_LIMITS = [1, 2, 10, 50, 200]; // lower edge of each step
export function bin(n: Count): number {
  if (n === null) return -1;
  if (n === 0) return 0;
  let step = 0;
  for (let i = 0; i < BIN_LIMITS.length; i++) if (n >= BIN_LIMITS[i]) step = i + 1;
  return step;
}

/** A date like "October 10, 2026" / "10 de octubre de 2026". */
export function formatDate(iso: string, htmlLang: string): string {
  return new Intl.DateTimeFormat(htmlLang, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso),
  );
}

export const CDC_DATA_URL = caseData.source.datasetUrl;

/**
 * A CDC travel-notice destination in the page language, using the built-in
 * Intl.DisplayNames (ISO region codes). CDC writes destinations in English, so the
 * English name is matched back to its code; anything without a match (or a region
 * name like "the Americas") keeps CDC's English name.
 */
const REGION_CODES = (() => {
  const en = new Intl.DisplayNames(['en'], { type: 'region' });
  const byName = new Map<string, string>();
  const A = 'A'.charCodeAt(0);
  for (let i = 0; i < 26; i++)
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      let name: string | undefined;
      try {
        name = en.of(code);
      } catch {
        continue;
      }
      if (name && name !== code) byName.set(name.toLowerCase(), code);
    }
  return byName;
})();
export function destinationName(destination: string, htmlLang: string): string {
  const code = REGION_CODES.get(destination.trim().toLowerCase());
  if (!code) return destination;
  try {
    return new Intl.DisplayNames([htmlLang], { type: 'region' }).of(code) ?? destination;
  } catch {
    return destination;
  }
}

/** Cases newly reported to CDC in the latest MMWR week (CDC's "current week" column),
 *  per place; New York City is already added to New York. null = CDC has no value
 *  ("not reported for this week"), never shown as 0. */
export function latestWeekByPlace(): Record<string, Record<Disease, Count>> {
  const i = caseData.mmwrWeek - 1;
  return Object.fromEntries(
    Object.entries(caseData.places).map(([code, p]) => [code, Object.fromEntries(DISEASES.map((d) => [d, p[d].weekly[i] ?? null]))]),
  ) as Record<string, Record<Disease, Count>>;
}

/** All of the U.S., latest week: stored in cases.json by the data step (the data
 *  checks confirm it equals the sum of the places). */
export function nationalLatestWeek(): Record<Disease, Count> {
  return caseData.allUS.week;
}

/** True if any place has no value from CDC, so the All of the U.S. totals leave it out. */
export const allUSMissing = DISEASES.some((d) => caseData.allUS.missing[d].length > 0);

/** Short week-ending date: "Oct 10" / "10 de oct." (from the data file, never typed in). */
export function formatWeekDate(iso: string, htmlLang: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const part = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(htmlLang, { ...opts, timeZone: 'UTC' }).format(date);
  if (htmlLang.startsWith('es')) {
    const short = part({ month: 'short' }).replace(/\.$/, '');
    return `${date.getUTCDate()} de ${short}${short !== part({ month: 'long' }) ? '.' : ''}`;
  }
  return part({ month: 'short', day: 'numeric' });
}

/** The weekly line's template for a count: "+N reported{ref} …", "None reported{ref} …"
 *  or "Not reported for this week". `{ref}` marks the asterisk link to the note. */
export function weekTemplate(n: Count, text: { weekWith: string; weekWithOne: string; weekNone: string; weekMissing: string }): string {
  if (n === null) return text.weekMissing;
  if (n === 0) return text.weekNone;
  return n === 1 ? text.weekWithOne : text.weekWith;
}

/** CDC pages behind the reported-cases note (checked Oct 16, 2026): counts are cases
 *  reported to CDC by health departments, and under-reporting means the real number
 *  of infections is higher. */
export const REPORTED_NOTE_SOURCES = ['cdc-dengue-current-data', 'cdc-zika-cases-us', 'cdc-chik-cases-us'];
