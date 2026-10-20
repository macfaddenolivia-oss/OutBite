# Outbite

**Stop the bite before it starts.**

Outbite is a bilingual (English and Spanish) public-health website about *Aedes* mosquitoes
and the viruses they spread: dengue, Zika and chikungunya. It helps people in the United
States and its territories, including Puerto Rico, understand how these viruses spread and
choose practical ways to protect themselves, their households and their communities. Its
guidance follows CDC and EPA first, then WHO, and its case numbers come straight from CDC's
public data. It is built with [Astro](https://astro.build) as a static site.

## Status

**In development.** The content is awaiting expert review (clinician, entomologist and
native Spanish speaker) and is not yet published as a website. Don’t rely on it for health
decisions.

## Install and build

Needs Node.js 22 or newer (LTS) and npm.

```sh
npm install        # first time only: downloads Astro and the fonts into node_modules/
npm run dev        # starts a local preview at http://localhost:4321 (Ctrl+C to stop)
npm run build      # builds the finished static site into dist/
npm run preview    # serves the built dist/ folder, to check a build before hosting
```

## Checks

Quality checks are run locally before each release.

## Data and generated files

| Command | What it does |
|---|---|
| `npm run update-data` | Downloads the latest case counts, travel notices and world risk lists from public CDC sources into `src/data/`. Run it daily once hosted, then rebuild |
| `npm run build-map` | Rebuilds the U.S. map shapes (`src/data/us-map.json`) |
| `npm run build-world-map` | Rebuilds the world risk map shapes (`src/data/world-map.json`) |
| `npm run build-zip-data` | Rebuilds the ZIP code lookup (`src/data/zip-to-state.json`) |
| `npm run build-social-images` | Rebuilds the social preview images in `public/brand/` |

## Settings before going live

These settings are in `src/config/site.json`.

- **`siteUrl`**: the site's real address, for example `"https://www.example.org"`. The QR
  codes on the printables and the links inside the ready-made reminder files use it. While
  it is empty, QR codes point to the reserved placeholder `https://outbite.example` and the
  printables show "[site address]".
- **`GOATCOUNTER_CODE`**: your [GoatCounter](https://www.goatcounter.com) site code (the
  `MYCODE` part of `https://MYCODE.goatcounter.com`), using lowercase letters, numbers and
  hyphens only. GoatCounter counts visits without cookies. The counting script is added
  only to production builds (`npm run build`), never to `npm run dev`. Leave it empty for
  no counting.
- **`dailyUpdatesScheduled`**: set to `true` once `npm run update-data` runs daily on the
  host, so the Sources page describes the daily check correctly.

## Where things live

| To change… | Edit |
|---|---|
| Site name, tagline and the settings above | `src/config/site.json` |
| Any interface text (menus, buttons, page titles) | `src/i18n/locales/en.json` and `es.json` |
| Page text | `src/content/` (English and Spanish side by side in each file) |
| The alert banner | `src/config/alert.json` (see below) |
| Colors, fonts, spacing | `src/styles/tokens.css` (every text and background pairing must pass WCAG 2.2 AA) |
| Which font files load (Public Sans 400/600/800/900, Latin + Latin Extended) | `src/styles/fonts.css` |
| Logo, favicon, touch and app icons, social images | `public/brand/`; app name and icon in `src/pages/manifest.webmanifest.ts` |
| Which pages exist, menu order | `src/config/pages.ts` |
| Header, footer, page frame | `src/components/`, `src/layouts/BaseLayout.astro` |
| Individual pages | `src/pages/[lang]/…` (one file builds every language) |
| A suggestion card (Protect page) | `src/content/suggestions/<ID>.json` |
| States/territories and ZIP ranges for the place picker | `src/data/places.json` (names are in the translation files under `places`) |
| Source links used across the site | `src/content/sources.json` (one entry per source; content refers to its ID) |
| Source art used by the build (story mosquito, row of houses) | `src/assets/source/` |

### Suggestion cards

Each card file holds the shared fields (layer, labels, cost, effort, audiences, sources, the
"Last reviewed" date) and a `text` block per language. Adding a language also means adding a
`text.<code>` block to every card.

### Adding a language

Copy `src/i18n/locales/en.json` to `<code>.json` (e.g. `ht.json`), change the `_meta` block
(`name` is shown in the language switcher, written in that language), and translate the
values. Optionally add a tagline for it in `src/config/site.json`; otherwise the English
tagline is used. Missing strings fall back to English.

The Spanish text is a first draft, awaiting review by a native speaker.

### Alert banner

In `src/config/alert.json`, set `"enabled": true`, write the `message` for each language,
choose a `severity` (`info`, `warning`, or `urgent`), and set `expires` (date and time with
time zone, e.g. `2026-11-30T23:59:00-04:00`). The banner disappears automatically after
`expires`, even if the site isn't rebuilt. `link.href` can be a site path like
`/tools/checklist/` (the language prefix is added for you) or a full `https://` address.

## License

Code: MIT (see `LICENSE`). Text, drawings, printables and quiz: CC BY 4.0, credited as
"Outbite, by Olivia Macfadden" (see `LICENSE-CONTENT.md`). Material quoted from CDC, EPA
and other sources keeps its own terms.
