// Language labels on links to other websites, added once to every built page so no
// component can forget them:
// - Spanish pages: a link to an English-only page gets " (en inglés)" and hreflang="en";
//   if it's an official source with a Spanish title (src/content/sources.json titleEs),
//   that title replaces the English one in the link text.
// - English pages: a link to a Spanish-only page (the Puerto Rico Department of Health)
//   gets " (in Spanish)" and hreflang="es".
// Scientific names in the text of every link to another site (source titles) are put in
// italics, like the Genus component does elsewhere (after any Spanish title swap, so the
// swap still matches the plain title).
// Glossary links: in each page's main text, the first use of each word in
// src/content/glossary.json links to its definition on Words to know. Headings,
// existing links, buttons, form controls, menus, scripts, drawings and printable
// sheets are skipped, and the glossary page itself is left alone.
// Runs at build time on the finished HTML (the site is static); links inside the
// site and links that already carry hreflang are left alone.
import { defineMiddleware } from 'astro:middleware';
import sources from './content/sources.json';
import glossary from './content/glossary.json';
import { localizePath, withoutBase } from './i18n';

const SPANISH_HOSTS = ['salud.pr.gov', 'www.salud.pr.gov'];
const NOTE = { es: 'en inglés', en: 'in Spanish' } as const;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const titlesByUrl = new Map<string, { en: string; es: string }>();
for (const s of Object.values(sources as Record<string, { url?: string; title: string; titleEs?: string }>)) {
  if (s.url && s.titleEs) titlesByUrl.set(s.url, { en: s.title, es: s.titleEs });
}

// Same names as src/components/Genus.astro.
const SCI_NAMES = /((?:Aedes|Ae\.) (?:aegypti|albopictus)|(?:Culex|Cx\.) quinquefasciatus|\bBacillus thuringiensis\b|\bisraelensis\b|\bAnopheles\b|\bAedes\b|\bCulex\b|\bWolbachia\b)/g;
function italicizeNames(html: string): string {
  let em = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<em\b/i.test(part)) em++;
        else if (/^<\/em>/i.test(part)) em--;
        return part;
      }
      return em > 0 ? part : part.replace(SCI_NAMES, '<em>$1</em>');
    })
    .join('');
}

function label(html: string, lang: 'en' | 'es'): string {
  return html.replace(/<a\b([^>]*?)\bhref="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (whole, before, href, after, inner) => {
    const plain = `<a${before}href="${href}"${after}>${italicizeNames(inner)}</a>`;
    if (/\bhreflang=/.test(before + after)) return plain;
    let host = '';
    try {
      host = new URL(href.replace(/&amp;/g, '&')).hostname;
    } catch {
      return plain;
    }
    const spanish = SPANISH_HOSTS.includes(host);
    if (lang === 'es' ? spanish : !spanish) return plain;
    let text = inner;
    const titles = lang === 'es' ? titlesByUrl.get(href.replace(/&amp;/g, '&')) : undefined;
    if (titles) {
      for (const form of [titles.en, escapeHtml(titles.en)]) if (text.includes(form)) text = text.split(form).join(escapeHtml(titles.es));
    }
    // "(en inglés)" never splits across lines.
    const note = `<span class="lang-note"> (${NOTE[lang].replace(' ', '&nbsp;')})</span>`;
    // The note goes before the arrow and the (no-break) space joining it to the last word.
    const arrow = text.match(/(?:\s|&nbsp;)*<span aria-hidden="true"[^>]*>→<\/span>\s*$/);
    text = arrow ? text.slice(0, arrow.index) + note + text.slice(arrow.index) : text + note;
    return `<a${before}href="${href}"${after} hreflang="${lang === 'es' ? 'en' : 'es'}">${italicizeNames(text)}</a>`;
  });
}

// ---- Glossary links ----
const SKIP_TAGS = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'summary', 'label', 'option', 'select', 'textarea', 'script', 'style', 'svg', 'title', 'template', 'nav', 'dt', 'caption', 'th', 'noscript']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SKIP_CLASS = /\b(print-sheet|trip-sheets|site-header|site-footer|lang-note|story-art)\b/;
const termsFor = (lang: 'en' | 'es') =>
  (glossary.terms as { id: string; match: Record<string, string[]> }[]).map((term) => ({
    id: term.id,
    re: new RegExp(`(?<![\\p{L}\\p{N}-])(${term.match[lang].join('|')})(?![\\p{L}\\p{N}-])`, 'iu'),
  }));
const TERMS = { en: termsFor('en'), es: termsFor('es') };

function linkGlossary(html: string, lang: 'en' | 'es'): string {
  const start = html.indexOf('<main');
  const end = html.lastIndexOf('</main>');
  if (start < 0 || end < 0) return html;
  const todo = [...TERMS[lang]];
  const stack: boolean[] = []; // per open element: does it skip?
  let skipDepth = 0;
  const parts = html.slice(start, end).split(/(<[^>]+>)/);
  for (let i = 0; i < parts.length && todo.length; i++) {
    const part = parts[i];
    if (part.startsWith('<')) {
      const m = part.match(/^<\/?([a-zA-Z0-9-]+)/);
      if (!m || part.startsWith('<!')) continue;
      const tag = m[1].toLowerCase();
      if (part.startsWith('</')) {
        const skipped = stack.pop();
        if (skipped) skipDepth--;
      } else if (!VOID.has(tag) && !part.endsWith('/>')) {
        const cls = part.match(/\sclass="([^"]*)"/)?.[1] ?? '';
        const skips = SKIP_TAGS.has(tag) || SKIP_CLASS.test(cls) || /\sdata-no-glossary\b/.test(part);
        stack.push(skips);
        if (skips) skipDepth++;
      }
      continue;
    }
    if (skipDepth > 0 || !part.trim()) continue;
    // Link every not-yet-linked word in this text, earliest first, never inside a new link.
    let out = '';
    let rest = part;
    for (;;) {
      let best: { k: number; index: number; text: string } | null = null;
      for (let k = 0; k < todo.length; k++) {
        const found = rest.match(todo[k].re);
        if (found && found.index !== undefined && (!best || found.index < best.index)) best = { k, index: found.index, text: found[0] };
      }
      if (!best) break;
      const href = `${localizePath(lang, 'glossary/')}#${todo[best.k].id}`;
      out += `${rest.slice(0, best.index)}<a class="gloss-link" href="${href}">${best.text}</a>`;
      rest = rest.slice(best.index + best.text.length);
      todo.splice(best.k, 1);
    }
    parts[i] = out + rest;
  }
  return html.slice(0, start) + parts.join('') + html.slice(end);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const path = withoutBase(context.url.pathname);
  const lang = path.startsWith('/es/') ? 'es' : path.startsWith('/en/') ? 'en' : null;
  if (!lang || !response.headers.get('content-type')?.includes('text/html')) return response;
  let html = await response.text();
  if (!path.includes('/glossary/')) html = linkGlossary(html, lang);
  return new Response(label(html, lang), { status: response.status, headers: response.headers });
});
