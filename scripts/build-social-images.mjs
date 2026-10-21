#!/usr/bin/env node
// npm run build-social-images
// Makes the two social preview images (what shows when someone pastes a link into a text,
// WhatsApp or email): public/brand/social-en-v2.png and social-es-v2.png, 1200 × 630, on
// plain white: the Outbite logo, the tagline (large, on two lines; up to three in
// Spanish) and a one-line description on the left, and the shared two-wing Aedes
// mosquito (src/assets/source/mosquito.svg) on the right, as tall as the text. Even
// 72px margins. A new file name (-v2) when the design changes, so apps that cached the
// old image fetch the new one; BaseLayout.astro names the current one.
// Text comes from src/config/site.json (tagline) and the locales (social.description).
// Uses a local Chrome in headless mode (set CHROME to its path if it isn't the macOS
// default); nothing is fetched or sent. Run it again after changing the tagline or text.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const site = JSON.parse(readFileSync(join(root, 'src/config/site.json'), 'utf8'));
const logo = readFileSync(join(root, 'public/brand/outbite-logo.svg'), 'utf8').replace(/ width="\d+" height="\d+"/, '');
const mosquito = readFileSync(join(root, 'src/assets/source/mosquito.svg'), 'utf8')
  .replace(/ width="\d+" height="\d+"/, '')
  .replace(/ style="background:#FFFFFF"/, '');
const font = (w) => pathToFileURL(join(root, `node_modules/@fontsource/public-sans/files/public-sans-latin-${w}-normal.woff2`)).href;

const page = (lang) => {
  const loc = JSON.parse(readFileSync(join(root, `src/i18n/locales/${lang}.json`), 'utf8'));
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Public Sans'; font-weight: 400; src: url('${font(400)}'); }
@font-face { font-family: 'Public Sans'; font-weight: 600; src: url('${font(600)}'); }
@font-face { font-family: 'Public Sans'; font-weight: 900; src: url('${font(900)}'); }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 72px; background: #ffffff; color: #17306a; font-family: 'Public Sans', sans-serif; }
.text { width: 680px; }
.logo { display: block; width: 340px; height: 102px; }
h1 { margin: 28px 0 0; font-size: ${lang === 'es' ? 72 : 86}px; font-weight: 900; line-height: 1.04; letter-spacing: -1px; }
p { margin: 28px 0 0; color: #24539a; font-size: 32px; font-weight: 600; line-height: 1.3; }
/* As tall as the text block (set by the script below), in the drawing's proportions. */
.mq { aspect-ratio: 64 / 66; }
.mq svg, .logo svg { width: 100%; height: 100%; display: block; }
</style></head><body>
<div class="text"><div class="logo">${logo}</div><h1>${site.tagline[lang]}</h1><p>${loc.social.description}</p></div>
<div class="mq">${mosquito}</div>
<script>document.querySelector('.mq').style.height = document.querySelector('.text').offsetHeight + 'px';</script>
</body></html>`;
};

const dir = mkdtempSync(join(tmpdir(), 'outbite-social-'));
try {
  for (const lang of ['en', 'es']) {
    const html = join(dir, `${lang}.html`);
    writeFileSync(html, page(lang));
    const out = join(root, `public/brand/social-${lang}-v2.png`);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${out}`, pathToFileURL(html).href], { stdio: 'ignore' });
    console.log(`✅ public/brand/social-${lang}-v2.png`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
