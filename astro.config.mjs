// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

import markdoc from "@astrojs/markdoc";

// https://astro.build/config
export default defineConfig({
  site: "https://edgarjaymez.com",
  // Pinned, not defaulted. Astro 7 changed the default to "jsx", which strips whitespace
  // containing line breaks — and prettier-plugin-astro wraps sibling inline elements onto
  // separate lines, so a formatted 5-link nav renders as "WorkLabBlogResumeContact".
  // `true` is the lossless mode: it preserves the whitespace needed to render correctly.
  compressHTML: true,
  integrations: [sitemap(), markdoc()],
  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
