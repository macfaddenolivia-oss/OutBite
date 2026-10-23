# Outbite

**Stop the bite before it starts.**

Outbite is a bilingual (English and Spanish) public-health website about *Aedes* mosquitoes
and the viruses they spread: dengue, Zika and chikungunya. It helps people in the United
States and its territories, including Puerto Rico, understand how these viruses spread and
choose practical ways to protect themselves, their households and their communities. Its
guidance follows CDC and EPA first, then WHO, and its case numbers come straight from CDC's
public data. It is built with [Astro](https://astro.build) as a static site.

## Status

**Preview.** The site is published as a preview at
<https://macfaddenolivia-oss.github.io/OutBite/> while its content awaits expert review
(clinician, entomologist and native Spanish speaker). Don’t rely on it for health decisions
yet.

## Install and build

Needs Node.js 22 or newer (LTS) and npm.

```sh
npm install        # first time only: downloads Astro and the fonts into node_modules/
npm run dev        # starts a local preview at http://localhost:4321/OutBite/ (Ctrl+C to stop)
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
| `npm run build-social-images` | Rebuilds the social preview images in `public/brand/` |
| `npm run build-photos` | Rebuilds the web versions of the photos in `public/photos/`: the *Aedes aegypti* photo (from `design/Aedes_Mosquito.png`) and the Mosquito detective photos (from `design/FindtheAedes/`, listed in `src/content/detective.json`; it names any photo in that folder not listed yet) |

## Publishing

The site is published on GitHub Pages at <https://macfaddenolivia-oss.github.io/OutBite/>
by `.github/workflows/deploy.yml`, using GitHub's own Pages actions. It runs on every push to
`main`, every day at about 10:00 UTC, and by hand (**Run workflow** on the Actions tab). Each
run downloads the latest CDC data (`npm run update-data`), builds the site and publishes it.
Nothing is committed back to the repository. The data from each successful download is saved
in the Actions cache, and every run starts from the newest good copy (that one, or the copy in
git if it's newer), so a failed download never rolls the site back. If a download fails on
the daily run, the run fails and nothing is published (the live site keeps yesterday's
numbers, and GitHub emails you); on a push or by-hand run the site is published with the last
good data and a warning. If CDC's latest reporting week is more than 14 days old, the daily
run fails the same way, while a push or by-hand run publishes with a warning, so a pause in
CDC's publishing never blocks content updates. The comment at the top of `deploy.yml`
explains this step by step.

Every address starts with `/OutBite/` (`base` in `astro.config.mjs`). Links inside the site
use the helpers in `src/i18n/index.ts` (`localizePath`, `assetPath`, `siteAddress`), which
add it for you.

## Settings

These settings are in `src/config/site.json`.

- **`preview`**: `true` while experts are still checking the site. Every page then shows a
  banner that can't be closed ("Preview: this site is still being checked by experts…",
  text in `src/config/alert.json` under `preview`), carries a `noindex` tag, and
  `robots.txt` asks search engines to stay out. Set it to `false` at launch.
- **`siteUrl`**: the site's address without a trailing slash,
  `"https://macfaddenolivia-oss.github.io/OutBite"`. Its path must match `base` in
  `astro.config.mjs`. The QR codes on the printables, the links inside the ready-made
  reminder files and the social preview tags use it.
- **`GOATCOUNTER_CODE`**: your [GoatCounter](https://www.goatcounter.com) site code (the
  `MYCODE` part of `https://MYCODE.goatcounter.com`), using lowercase letters, numbers and
  hyphens only. GoatCounter counts visits without cookies. The counting script is added
  only to production builds (`npm run build`), never to `npm run dev`. Leave it empty for
  no counting.
- **`dailyUpdatesScheduled`**: `true`, because the workflow above updates the data every
  day; the Sources page describes the daily check.

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
| States and territories for the place picker | `src/data/places.json` (names are in the translation files under `places`) |
| Source links used across the site | `src/content/sources.json` (one entry per source; content refers to its ID) |
| Source art used by the build (story mosquito, row of houses, the Mosquito detective yard) | `src/assets/source/` (the yard: `src/assets/source/yard/`, from `design/yard/`) |
| Mosquito detective: photos, clues, yard items and their actions | `src/content/detective.json` (add a photo there with its species, crop and alt text, then run `npm run build-photos`; the game draws from every photo listed) |
| The one real photo (*Aedes aegypti*, CDC PHIL image 9258 by James Gathany, public domain), shown on the FAQ, Words to know and How it spreads step 1 | `src/components/AedesPhoto.astro`, text under `photos` in the translation files |

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
While `preview` is `true` in `src/config/site.json`, the preview banner shows instead.

## License

Code: MIT (see `LICENSE`). Text, drawings, printables and quiz: CC BY 4.0, credited as
"Outbite, by Olivia Macfadden" (see `LICENSE-CONTENT.md`). Material quoted from CDC, EPA
and other sources keeps its own terms.
