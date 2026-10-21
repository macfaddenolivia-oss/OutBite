// Suggestion cards (src/content/suggestions/*.json) and the shared source list
// (src/content/sources.json). Field rules are kept by the site's content checks.

import sourcesData from '../content/sources.json';
import { defaultLocale } from '../i18n';

export const layers = ['body', 'home', 'yard', 'community'] as const;
export const effortGroups = ['quick', 'regular', 'project'] as const;
export const audienceFilters = ['renter', 'pregnant', 'kids', 'homeowner', 'traveler'] as const;
// Strongest first; used to order cards inside the "By effort" view.
export const evidenceLevels = ['strong', 'moderate', 'limited', 'emerging', 'not-supported', 'linked', 'not-rated'] as const;

export type Layer = (typeof layers)[number];
export type EffortGroup = (typeof effortGroups)[number];

export interface ResearchNote {
  text: string;
  cite: string[];
}

export interface CardText {
  title: string;
  summary: string;
  guidanceNote?: string;
  evidenceMeasures?: string;
  canDo: string[];
  cantDo: string[];
  research: ResearchNote[];
  tips?: string[];
  travel?: string;
}

export interface Suggestion {
  id: string;
  layer: Layer;
  effortGroup: EffortGroup;
  guidance: 'cdc-epa' | 'who' | 'none' | 'unknown';
  evidence: (typeof evidenceLevels)[number];
  evidenceLinked?: string[];
  cost: string[];
  effort: string;
  audiences: string[];
  safetyContacts: boolean;
  travelSource?: string;
  related: string[];
  sources: string[];
  lastReviewed: string;
  text: Record<string, CardText>;
}

export interface Source {
  short: string;
  title: string;
  publisher: string;
  url: string;
  kind: 'official' | 'study' | 'advocacy' | 'news';
  date?: string;
  /** Spanish publisher line, when the publisher needs words (an advocacy group). */
  publisherEs?: string;
  /** "Updated" date (YYYY-MM-DD) shown in the tip's source list. */
  updated?: string;
}

export const sources = sourcesData as Record<string, Source>;

const modules = import.meta.glob<{ default: Suggestion }>('../content/suggestions/*.json', { eager: true });

const idOrder = (id: string) => layers.indexOf(layerOfId(id)) * 100 + Number(id.slice(1));
function layerOfId(id: string): Layer {
  return ({ B: 'body', H: 'home', Y: 'yard', C: 'community' } as const)[id[0] as 'B' | 'H' | 'Y' | 'C'];
}

/** All cards in inventory order (B1…B4, H1…H9, Y1…Y6, C1…C5). */
export const suggestions: Suggestion[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => idOrder(a.id) - idOrder(b.id));

export function getSuggestion(id: string): Suggestion {
  const card = suggestions.find((s) => s.id === id);
  if (!card) throw new Error(`Unknown suggestion: ${id}`);
  return card;
}

/** Card text in one language, falling back to the default language. */
export function cardText(card: Suggestion, lang: string): CardText {
  return card.text[lang] ?? card.text[defaultLocale];
}

/** Order used by the "By effort" view: group, then stronger evidence first, then inventory order. */
export function effortOrder(card: Suggestion): number {
  return effortGroups.indexOf(card.effortGroup) * 10000 + evidenceLevels.indexOf(card.evidence) * 100 + idOrder(card.id);
}
