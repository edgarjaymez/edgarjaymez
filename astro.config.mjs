// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

import markdoc from "@astrojs/markdoc";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://edgarjaymez.com",
  integrations: [sitemap(), markdoc()],

  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },

  adapter: cloudflare(),
});