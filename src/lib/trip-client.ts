// Browser side of the trip advice (travel page and trip checklist): shows only the items
// whose CDC category applies to the chosen destination. Runs entirely in the browser
// on data already in the page; nothing is sent or saved.
//
// Inside a root: [data-show] items (value "always" or a Flag from travel.ts),
// [data-trip-any] (shown when no destination is chosen: "when CDC recommends it" lines),
// [data-trip-one] (shown once one is chosen), [data-trip-need] (buttons disabled until
// one is chosen), [data-trip-norisk] (a chosen place with
// no listed risk) and [data-trip-place="en|es"] (its name).

export interface TripChoice {
  flags: string[];
  /** The destination's name per language. */
  names: Record<string, string>;
}

export function applyTrip(root: ParentNode, choice: TripChoice | null) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-show]')) {
    const show = el.dataset.show!;
    el.hidden = choice !== null && show !== 'always' && !choice.flags.includes(show);
  }
  // A part (before, during, after) with nothing left in it is hidden too.
  for (const el of root.querySelectorAll<HTMLElement>('[data-trip-part]')) el.hidden = ![...el.querySelectorAll<HTMLElement>('[data-show]')].some((i) => !i.hidden);
  for (const el of root.querySelectorAll<HTMLElement>('[data-trip-any]')) el.hidden = choice !== null;
  for (const el of root.querySelectorAll<HTMLElement>('[data-trip-one]')) el.hidden = choice === null;
  for (const el of root.querySelectorAll<HTMLButtonElement>('[data-trip-need]')) el.disabled = choice === null;
  // "CDC lists no risk here" line: only for a destination where no item depends on risk.
  for (const el of root.querySelectorAll<HTMLElement>('[data-trip-norisk]')) el.hidden = choice === null || choice.flags.includes('any');
  for (const el of root.querySelectorAll<HTMLElement>('[data-trip-place]')) el.textContent = choice?.names[el.dataset.tripPlace!] ?? '';
}
