// Builds the seasonal-reminder calendar files (.ics, RFC 5545) for the Reminders tool.
// Plain JavaScript so the same code runs in the visitor's browser (the buttons), at
// build time (the ready-made files for visitors without JavaScript) and in the site's
// calendar-file checks. Nothing here talks to any server.
//
// - Floating local times (no time zone): 9:00 AM stays 9:00 AM wherever the calendar is.
// - CRLF line endings, lines folded at 75 octets (UTF-8 bytes), escaped text.
// - Every event has a UID and DTSTAMP; the weekly check repeats every week with no end
//   (RRULE:FREQ=WEEKLY;BYDAY=..), the season reminder every year on the 1st of a month
//   (all-day, RRULE:FREQ=YEARLY).
// - Optional alert (VALARM): at the event time for the weekly check; for the all-day
//   season reminder, at 9:00 AM that day (an all-day event's "event time" is midnight).

export const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const pad = (n, w = 2) => String(n).padStart(w, '0');
const dateValue = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const stampValue = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** TEXT escaping (RFC 5545 §3.3.11). */
export function escapeText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line at 75 octets without splitting a UTF-8 character. */
export function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      out.push(current);
      current = ch;
      bytes = size;
    } else {
      current += ch;
      bytes += size;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

/** The next date on or after `from` that falls on weekday `day` (0 = Sunday). */
export function nextWeekday(from, day) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
  return d;
}

/** The next 1st of `month` (1–12) on or after `from`. */
export function nextFirstOf(from, month) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let d = new Date(from.getFullYear(), month - 1, 1);
  if (d < today) d = new Date(from.getFullYear() + 1, month - 1, 1);
  return d;
}

const alarm = (trigger, text) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(text)}`, `TRIGGER:${trigger}`, 'END:VALARM'];

/**
 * @param {object} o
 * @param {'weekly'|'season'|'both'} o.kind
 * @param {number} [o.day] weekday 0–6 (weekly)
 * @param {string} [o.time] "HH:MM" (weekly)
 * @param {number} [o.month] 1–12 (season)
 * @param {boolean} [o.remind]
 * @param {{weeklyTitle:string, weeklyDescription:string, seasonTitle:string, seasonDescription:string}} o.text
 * @param {Date} [o.now]
 * @param {(kind:string)=>string} [o.uid] makes each event's UID
 */
export function buildIcs({ kind, day = 6, time = '09:00', month = 5, remind = true, text, now = new Date(), uid }) {
  const makeUid = uid ?? ((k) => `${k}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}@outbite`);
  const stamp = stampValue(now);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Outbite//Seasonal reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

  if (kind === 'weekly' || kind === 'both') {
    const [h, m] = time.split(':').map(Number);
    const start = nextWeekday(now, day);
    const startValue = `${dateValue(start)}T${pad(h)}${pad(m)}00`;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m + 15);
    const endValue = `${dateValue(end)}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${makeUid('weekly')}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${startValue}`,
      `DTEND:${endValue}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DAYS[day]}`,
      `SUMMARY:${escapeText(text.weeklyTitle)}`,
      `DESCRIPTION:${escapeText(text.weeklyDescription)}`,
      'TRANSP:TRANSPARENT',
      ...(remind ? alarm('PT0M', text.weeklyTitle) : []),
      'END:VEVENT',
    );
  }

  if (kind === 'season' || kind === 'both') {
    const start = nextFirstOf(now, month);
    const next = new Date(start.getFullYear(), start.getMonth(), 2);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${makeUid('season')}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(start)}`,
      `DTEND;VALUE=DATE:${dateValue(next)}`,
      'RRULE:FREQ=YEARLY',
      `SUMMARY:${escapeText(text.seasonTitle)}`,
      `DESCRIPTION:${escapeText(text.seasonDescription)}`,
      'TRANSP:TRANSPARENT',
      ...(remind ? alarm('PT9H', text.seasonTitle) : []),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** File name for a download. */
export const icsFileName = (kind) =>
  ({ weekly: 'outbite-weekly-check.ics', season: 'outbite-season-reminder.ics', both: 'outbite-reminders.ics' })[kind];
