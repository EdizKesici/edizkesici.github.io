import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// User site: served from the root of https://edizkesici.github.io (no `base`).
export default defineConfig({
  site: 'https://edizkesici.github.io',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'fr', locales: { fr: 'fr-BE', en: 'en' } },
    }),
  ],
});
