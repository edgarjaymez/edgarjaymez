// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

import markdoc from "@astrojs/markdoc";

// https://astro.build/config
export default defineConfig({
  site: "https://edgarjaymez.com",

  // Matches the canonical URLs this site already emitted, and matches `pathFor()` in
  // src/i18n/routes.ts, which always returns a trailing slash. This couples to whatever host is
  // eventually chosen — some serve /contact and /contact/ as different URLs — so it is a flagged
  // decision, not an incidental default.
  trailingSlash: "always",

  // Pinned, not defaulted. Astro 7 changed the default to "jsx", which strips whitespace
  // containing line breaks — and prettier-plugin-astro wraps sibling inline elements onto
  // separate lines, so a formatted 5-link nav renders as "WorkLabBlogResumeContact".
  // `true` is the lossless mode: it preserves the whitespace needed to render correctly.
  compressHTML: true,

  integrations: [
    sitemap({
      // Deliberately NOT using the `i18n` option. It pairs pages by identical path across locale
      // prefixes, so it would only ever match routes whose segment is spelled the same in both
      // languages — /contact/ and /es/contacto/ would never pair, and it would emit wrong
      // alternates for the ones that do. hreflang is declared in the document head instead, from
      // the route registry, which knows the real translated segments.
      filter: (page) => !page.includes("/404"),
    }),
    markdoc(),
  ],

  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
