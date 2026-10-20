// @ts-check
import { defineConfig } from 'astro/config';

// Languages are not listed here: they come from src/i18n/locales/*.json.
export default defineConfig({
  // Set this to the real address once a domain is chosen (used for hreflang links).
  // site: 'https://example.org',
  output: 'static',
  build: {
    format: 'directory',
  },
});
