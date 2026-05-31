// @ts-check
import { defineConfig } from "astro/config";

import svelte from "@astrojs/svelte";
import lit from "@astrojs/lit";
import sitemap from "@astrojs/sitemap";

import markdoc from "@astrojs/markdoc";

// https://astro.build/config
export default defineConfig({
  site: "https://edgarjaymez.vercel.app",
  integrations: [svelte(), lit(), sitemap(), markdoc()],
  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
