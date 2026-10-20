// Browser helpers shared by the home case box and the dashboard. Nothing is sent or
// saved anywhere: both always open on All of the U.S.

/** ZIP → every state or territory it touches (src/data/zip-to-state.json: Census ZIP
 *  Code Tabulation Areas, as "AL": "35004 35005 …"). Empty if the ZIP isn't there. */
let zipIndex: Map<string, string[]> | null = null;
export function statesForZip(table: Record<string, string>, zip: string): string[] {
  if (!zipIndex) {
    zipIndex = new Map();
    for (const [code, list] of Object.entries(table)) for (const z of list.split(' ')) zipIndex.set(z, [...(zipIndex.get(z) ?? []), code]);
  }
  return zipIndex.get(zip) ?? [];
}

/** Fills a weekly line from its template ("+N reported{ref} … {date}"): `{ref}` becomes a
 *  copy of the asterisk link in `refTemplate` (a <template> holding NoteRef). */
export function fillRefText(el: HTMLElement, text: string, refTemplate: HTMLTemplateElement | null) {
  const [before, after] = text.split('{ref}');
  el.replaceChildren(before);
  if (after !== undefined) {
    const ref = refTemplate?.content.firstElementChild?.cloneNode(true);
    if (ref) el.append(ref);
    el.append(after);
  }
}

export interface WeekText {
  weekWith: string;
  weekWithOne: string;
  weekNone: string;
  weekMissing: string;
  date: string;
}

/** The weekly line for a count (null = no value from CDC, never shown as 0). */
export function weekLine(n: number | null, text: WeekText, format: Intl.NumberFormat): string {
  const tpl = n === null ? text.weekMissing : n === 0 ? text.weekNone : n === 1 ? text.weekWithOne : text.weekWith;
  return tpl.replace('{n}', n === null ? '' : format.format(n)).replace('{date}', text.date);
}
