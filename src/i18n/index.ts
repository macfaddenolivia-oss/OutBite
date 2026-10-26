// Language helpers. Languages are discovered from src/i18n/locales/*.json:
// adding a new <code>.json file adds that language to the whole site.

import site from '../config/site.json';

type Messages = { [key: string]: string | Messages };

interface LocaleMeta {
  name: string; // shown in the language switcher, in its own language
  htmlLang: string;
  ogLocale: string;
  dir: 'ltr' | 'rtl';
}

export interface Locale {
  code: string;
  meta: LocaleMeta;
  messages: Messages;
}

const modules = import.meta.glob<{ default: Messages & { _meta: LocaleMeta } }>('./locales/*.json', {
  eager: true,
});

export const defaultLocale: string = site.defaultLocale;

export const locales: Locale[] = Object.entries(modules)
  .map(([file, mod]) => ({
    code: file.replace(/^.*\/(.+)\.json$/, '$1'),
    meta: mod.default._meta,
    messages: mod.default,
  }))
  // Default language first, then the rest alphabetically by code.
  .sort((a, b) => (a.code === defaultLocale ? -1 : b.code === defaultLocale ? 1 : a.code.localeCompare(b.code)));

export const localeCodes = locales.map((l) => l.code);

export function getLocale(code: string | undefined): Locale {
  return locales.find((l) => l.code === code) ?? getLocale(defaultLocale);
}

/** For pages under src/pages/[lang]/: build one copy of the page per language. */
export function langStaticPaths() {
  return localeCodes.map((lang) => ({ params: { lang } }));
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: string | Messages | undefined = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Returns t(key, vars) for one language. Missing keys fall back to the default
 * language. {siteName} is always available in strings.
 */
export function useTranslations(lang: string) {
  const own = getLocale(lang).messages;
  const fallback = getLocale(defaultLocale).messages;
  return function t(key: string, vars: Record<string, string | number> = {}): string {
    let text = lookup(own, key) ?? lookup(fallback, key);
    if (text === undefined) {
      console.warn(`[i18n] Missing translation key "${key}"`);
      return key;
    }
    const all = { siteName: site.name, ...vars };
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in all ? String(all[name as keyof typeof all]) : match));
  };
}

export const siteName: string = site.name;

export function getTagline(lang: string): string {
  const taglines = site.tagline as Record<string, string>;
  return taglines[lang] ?? taglines[defaultLocale];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** A site address without the host sub-folder, if base names one (e.g. "/sub/es/faq/" →
 *  "/es/faq/"); unchanged since the site moved to outbite.org with base "/". */
export function withoutBase(pathname: string): string {
  return base && pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

/** The full public address of a site path that already includes the sub-folder
 *  (from localizePath or assetPath), using siteUrl; the placeholder until it is set. */
export function siteAddress(path: string): string {
  return new URL(path, site.siteUrl || 'https://outbite.example').href;
}

/** A file in public/, e.g. "brand/favicon.svg" (respecting a host sub-folder, if any). */
export function assetPath(path: string): string {
  return `${base}/${path.replace(/^\//, '')}`;
}

/** "/protect/" + "es" → "/es/protect/" (respecting a host sub-folder, if any). */
export function localizePath(lang: string, path = ''): string {
  const clean = path.replace(/^\//, '');
  return `${base}/${lang}/${clean}`;
}

/** The same page in another language: "/en/protect/" → "/es/protect/". */
export function switchLocalePath(pathname: string, targetLang: string): string {
  const parts = withoutBase(pathname).split('/').filter(Boolean);
  if (parts.length && localeCodes.includes(parts[0])) parts.shift();
  const rest = parts.join('/');
  return localizePath(targetLang, rest ? `${rest}/` : '');
}
