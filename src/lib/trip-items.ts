// The "What CDC recommends for this trip" items, in three parts (before, during, after).
// Every item reuses wording already on the site and already checked against CDC or EPA,
// read from where it lives so the two can't drift apart:
// - diseases.json "Before you travel": the pre-travel visit and CDC's acetaminophen quote;
// - the tips (src/content/suggestions): repellent (B1), children (B4), long sleeves (B2), air
//   conditioning (H2), the chikungunya vaccine quotes (B6), condom timeframes (B5);
// - diseases.json pregnancy box: CDC's quotes for pregnant travelers, by CDC category
//   (active Zika Travel Health Notice, or current or past transmission);
// - faq.json: the mosquito net line (packing) and "Prevent mosquito bites for 3 weeks
//   after your trip" (after-trip).
// `show` is the CDC category that makes the item apply (see Flag in travel.ts).
import diseases from '../content/diseases.json';
import faq from '../content/faq.json';
import { cardText, getSuggestion } from './suggestions';
import type { Flag } from './travel';

export type Show = 'always' | Flag;
export interface TripItem {
  id: string;
  show: Show;
  /** Short label before the text (e.g. "Pregnant travelers"). */
  label?: string;
  /** One plain line before a long CDC quote. */
  summary?: string;
  text: string;
  /** A tip on Protect to link to. */
  tip?: string;
  /** Extra source links (ids in sources.json). */
  links?: string[];
}

const firstSentence = (s: string) => s.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? s;
// The tip's line without its plain lead-in (shown separately as the summary).
const withoutLead = (s: string, lead: string) => (s.startsWith(lead) ? s.slice(lead.length).trim() : s);

export function tripItems(lang: 'en' | 'es'): { key: 'before' | 'during' | 'after'; items: TripItem[] }[] {
  const ex = diseases.text[lang].extras as any;
  const preg = (key: string) => ex.pregnancy.find((p: { key: string }) => p.key === key);
  const tip = (id: string) => cardText(getSuggestion(id), lang) as any;
  const q = (faq.text[lang].questions as Record<string, { a: string[] }>);
  const net = q.packing.a[0].split(/(?<=\.)\s+/).find((s) => /screens|mallas/.test(s))!;
  return [
    {
      key: 'before',
      items: [
        { id: 'visit', show: 'always', text: ex.travelVisit },
        { id: 'pack-repellent', show: 'any', text: tip('B1').travel, tip: 'B1' },
        { id: 'acetaminophen', show: 'dengue', text: ex.travelPacking },
        { id: 'chik-recommended', show: 'chikOutbreak', label: tip('B6').title, summary: ex.chikSummary.recommended, text: withoutLead(tip('B6').canDo[0], ex.chikSummary.recommended), tip: 'B6' },
        { id: 'chik-considered', show: 'chikElevated', label: tip('B6').title, summary: ex.chikSummary.considered, text: withoutLead(tip('B6').canDo[1], ex.chikSummary.considered), tip: 'B6' },
        { id: 'pregnant-avoid', show: 'zikaNotice', label: preg('noticeTravel').label, summary: preg('noticeTravel').summary, text: preg('noticeTravel').quote },
        { id: 'pregnant-talk', show: 'zikaNoNotice', label: preg('pastTravel').label, summary: preg('pastTravel').summary, text: preg('pastTravel').quote },
      ],
    },
    {
      key: 'during',
      items: [
        { id: 'repellent', show: 'any', label: tip('B1').title, text: tip('B1').summary, tip: 'B1', links: ['epa-find-repellent'] },
        { id: 'kids', show: 'any', text: tip('B4').travel, tip: 'B4' },
        { id: 'sleeves', show: 'any', text: tip('B2').title, tip: 'B2' },
        { id: 'air', show: 'any', text: tip('H2').title, tip: 'H2' },
        { id: 'net', show: 'any', text: net },
      ],
    },
    {
      key: 'after',
      items: [
        { id: 'three-weeks', show: 'any', text: firstSentence(q['after-trip'].a[0]) },
        // CDC: after travel to an area with an active Zika notice, prevent sexual
        // transmission; after current or past transmission, "if you are concerned".
        { id: 'condoms', show: 'zikaNotice', text: tip('B5').travel, tip: 'B5' },
        { id: 'condoms-concerned', show: 'zikaNoNotice', text: `${ex.zikaConcerned} ${ex.condoms}`, tip: 'B5' },
      ],
    },
  ];
}
