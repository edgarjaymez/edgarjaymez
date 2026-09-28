// @ts-check
import { defineConfig, envField } from "astro/config";

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

  /**
   * Public configuration, declared rather than read ad hoc from `import.meta.env`.
   *
   * All three are `optional` on purpose — unset is a **supported state**, not a misconfiguration.
   * The contact form ships visibly disabled with a notice rather than silently POSTing nowhere, and
   * the résumé renders without a download link. Declaring them here is what makes those states
   * checkable: a typo'd name is a build error instead of a silently `undefined` feature.
   *
   * `context: "client"` + `access: "public"` means the value is inlined into the client bundle. That
   * is correct for all three — an endpoint URL, a published address and a PDF path are things the
   * browser must know. Nothing secret belongs in this block.
   */
  env: {
    schema: {
      /** Where the contact form POSTs. Unset → the form is disabled with a visible notice. */
      PUBLIC_CONTACT_ENDPOINT: envField.string({
        context: "client",
        access: "public",
        optional: true,
        url: true,
      }),
      /** The address offered while the endpoint is unwired. Unset → the notice points at the links. */
      PUBLIC_CONTACT_EMAIL: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      /** A published résumé PDF. Unset → no download link renders. */
      PUBLIC_RESUME_PDF: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },

  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
