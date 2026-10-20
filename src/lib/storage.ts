// Every key the site saves in the browser's localStorage. The Privacy page lists each
// one (src/content/privacy.json), kept in line with the code by the site's content
// checks: no key that isn't here or that the page doesn't list. Nothing here ever leaves the device.
export const STORAGE = {
  /** Weekly checklist ticks: one entry per week, "outbite.checklist.YYYY-MM-DD" (that week's Monday). */
  checklistPrefix: 'outbite.checklist.',
  /** Protect page "Show first" choices. */
  protectAudiences: 'outbite.protect.audiences',
  /** "Don't count my visits": GoatCounter's own opt-out value ("t" = don't count). */
  skipCounting: 'skipgc',
  /** Text size chosen with the "Text size" buttons: "115" or "130" (no entry = normal). */
  textSize: 'outbite.textSize',
  /** The alert banner the ✕ hid: a short fingerprint of its text, so a new alert shows again. */
  alertDismissed: 'outbite.alertDismissed',
} as const;
