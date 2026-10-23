// Every page on the site, in site-map order.
// `path` is the part after /<lang>/. `phase` is the build phase that fills it in.
// Titles, menu labels, and summaries live in src/i18n/locales/*.json under pages.<key>.

export interface PageDef {
  key: string;
  path: string;
  phase?: number;
  group: 'main' | 'disease' | 'tool' | 'info';
  /** The page's content file (in src/content) whose "lastReviewed" date the page shows as
   *  "Last reviewed" (each page is re-checked against current guidance every 6 weeks). */
  review: string;
}

export const pages: PageDef[] = [
  { key: 'home', path: '', group: 'main', review: 'pages/home.json' },
  { key: 'howItSpreads', path: 'how-it-spreads/', phase: 3, group: 'main', review: 'how-it-spreads.json' },
  { key: 'protect', path: 'protect/', phase: 2, group: 'main', review: 'pages/protect.json' },
  { key: 'community', path: 'community/', phase: 7, group: 'main', review: 'community.json' },
  { key: 'nearMe', path: 'near-me/', phase: 6, group: 'main', review: 'pages/near-me.json' },
  { key: 'sick', path: 'sick/', phase: 4, group: 'main', review: 'sick-page.json' },
  { key: 'tools', path: 'tools/', phase: 5, group: 'main', review: 'tools.json' },
  // Tools, in the order the Tools page and the footer list them.
  { key: 'quiz', path: 'tools/quiz/', phase: 5, group: 'tool', review: 'quiz.json' },
  { key: 'checklist', path: 'tools/checklist/', phase: 5, group: 'tool', review: 'pages/checklist.json' },
  { key: 'reminders', path: 'tools/reminders/', phase: 5, group: 'tool', review: 'reminders.json' },
  { key: 'printables', path: 'tools/printables/', phase: 5, group: 'tool', review: 'printables.json' },
  { key: 'travel', path: 'travel/', group: 'tool', review: 'travel.json' },
  { key: 'families', path: 'tools/families/', group: 'tool', review: 'families.json' },
  { key: 'detective', path: 'tools/mosquito-detective/', group: 'tool', review: 'detective.json' },
  { key: 'sources', path: 'sources/', phase: 7, group: 'main', review: 'pages/sources.json' },
  { key: 'dengue', path: 'dengue/', phase: 4, group: 'disease', review: 'diseases.json' },
  { key: 'zika', path: 'zika/', phase: 4, group: 'disease', review: 'diseases.json' },
  { key: 'chikungunya', path: 'chikungunya/', phase: 4, group: 'disease', review: 'diseases.json' },
  { key: 'faq', path: 'faq/', group: 'info', review: 'faq.json' },
  { key: 'about', path: 'about/', group: 'info', review: 'about.json' },
  { key: 'privacy', path: 'privacy/', group: 'info', review: 'privacy.json' },
  { key: 'glossary', path: 'glossary/', group: 'info', review: 'glossary.json' },
];

export const diseaseKeys = ['dengue', 'zika', 'chikungunya'] as const;

// Links shown in the header menu.
/** The tools, in page order (Tools page groups and footer). */
export const toolKeys = pages.filter((p) => p.group === 'tool').map((p) => p.key);

export const mainNavKeys = ['howItSpreads', 'protect', 'community', 'nearMe', 'travel', 'tools', 'detective', 'sources'];

export function getPage(key: string): PageDef {
  const page = pages.find((p) => p.key === key);
  if (!page) throw new Error(`Unknown page key: ${key}`);
  return page;
}
