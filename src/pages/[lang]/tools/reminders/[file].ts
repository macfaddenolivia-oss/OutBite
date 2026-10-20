// Ready-made calendar files for visitors without JavaScript, built with the defaults:
// the weekly check on Saturdays at 9:00 AM and the season reminder on May 1, alert on.
// /[lang]/tools/reminders/weekly-check.ics and /season-reminder.ics. Links inside use the
// site's address (siteUrl, like the printables' QR codes).
import type { APIRoute } from 'astro';
import content from '../../../../content/reminders.json';
import printables from '../../../../content/printables.json';
import site from '../../../../config/site.json';
import { buildIcs } from '../../../../lib/ics.js';
import { reminderText } from '../../../../lib/reminder-text.js';
import { localeCodes, localizePath } from '../../../../i18n';
import { getPage } from '../../../../config/pages';

const FILES = { 'weekly-check.ics': 'weekly', 'season-reminder.ics': 'season' } as const;

export function getStaticPaths() {
  return localeCodes.flatMap((lang) => Object.keys(FILES).map((file) => ({ params: { lang, file } })));
}

export const GET: APIRoute = ({ params }) => {
  const lang = (params.lang === 'es' ? 'es' : 'en') as 'en' | 'es';
  const kind = FILES[params.file as keyof typeof FILES];
  const base = (site.siteUrl || 'https://outbite.example').replace(/\/$/, '');
  const yard = printables.text[lang].checklist.items.filter((_, i) => printables.itemLayers[i] === 'yard');
  const text = reminderText(
    content.text[lang].event,
    yard,
    base + localizePath(lang, getPage('checklist').path),
    base + localizePath(lang, getPage('protect').path),
  );
  const d = content.defaults;
  const body = buildIcs({ kind, day: d.day, time: d.time, month: d.month, remind: d.remind, text, uid: (k) => `${k}-default-${lang}@outbite` });
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
