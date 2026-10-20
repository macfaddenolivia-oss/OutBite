// Event titles and descriptions for the Reminders tool's calendar files, in one language.
// Used by the page script (with this site's own address) and by the ready-made files
// built for visitors without JavaScript.
/**
 * @param {{weeklyTitle:string, weeklyIntro:string, checklistLink:string, seasonTitle:string, seasonBody:string, protectLink:string}} e
 * @param {string[]} items the weekly checklist's Outside · Yard items
 * @param {string} checklistUrl absolute address of the weekly checklist page
 * @param {string} protectUrl absolute address of the Protect page
 */
export function reminderText(e, items, checklistUrl, protectUrl) {
  return {
    weeklyTitle: e.weeklyTitle,
    weeklyDescription: [e.weeklyIntro, ...items.map((i) => `☐ ${i}`), '', e.checklistLink.replace('{url}', checklistUrl)].join('\n'),
    seasonTitle: e.seasonTitle,
    seasonDescription: [e.seasonBody, '', e.protectLink.replace('{url}', protectUrl)].join('\n'),
  };
}
