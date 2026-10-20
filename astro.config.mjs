// @ts-check
import { defineConfig } from 'astro/config';

// Languages are not listed here: they come from src/i18n/locales/*.json.
export default defineConfig({
  // Published on GitHub Pages at https://macfaddenolivia-oss.github.io/OutBite/: the host
  // (used for hreflang links) and the sub-folder every address starts with. Keep base in
  // step with siteUrl in src/config/site.json.
  site: 'https://macfaddenolivia-oss.github.io',
  base: '/OutBite/',
  output: 'static',
  build: {
    format: 'directory',
  },
});
