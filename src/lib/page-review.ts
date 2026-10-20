// "Last reviewed" for each page: the date a person last checked the page, read from the
// "lastReviewed" field of the page's content file (pages[].review in src/config/pages.ts).
// Separate from CDC's data dates. Each page is re-checked every 6 weeks.
import { pages, type PageDef } from '../config/pages';
import { withoutBase } from '../i18n';

const files = import.meta.glob<{ lastReviewed?: string }>('../content/**/*.json', { eager: true, import: 'default' });

/** The page for an address like "/es/tools/quiz/" (null for the 404 page and others). */
export function pageForPath(pathname: string): PageDef | null {
  const rest = withoutBase(pathname).replace(/^\/[a-z]{2}\//, '').replace(/^\/$/, '');
  return pages.find((p) => p.path === rest) ?? null;
}

/** The page's lastReviewed date (YYYY-MM-DD), or null if it has none yet. */
export function lastReviewed(page: PageDef): string | null {
  const date = files[`../content/${page.review}`]?.lastReviewed;
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
