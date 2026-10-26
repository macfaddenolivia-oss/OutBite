// @ts-check
import { defineConfig } from 'astro/config';

// Languages are not listed here: they come from src/i18n/locales/*.json.
export default defineConfig({
  // Published on GitHub Pages at the custom domain https://outbite.org: the host (used for
  // hreflang links), with no sub-folder. Keep base in step with siteUrl in
  // src/config/site.json. (Old /OutBite/... addresses are sent on by the 404 page.)
  site: 'https://outbite.org',
  base: '/',
  output: 'static',
  build: {
    format: 'directory',
  },
});
