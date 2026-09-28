/**
 * The route registry — the single source of truth for every URL this site serves.
 *
 * Before this, route data lived in two divergent places: a flat `routes` in `ui.ts` (which was the
 * live one) and a nested `{ label, slug }` map here (which nothing imported). Anyone who grepped for
 * `routes` had a 50% chance of reading the dead copy. Now there is one.
 *
 * Two rules make this safe:
 *
 * 1. **Nothing reverse-engineers a URL into a route.** The old `getRouteFromUrl` took a pathname,
 *    popped the last segment, and searched the route table for a matching value — so `/es/contacto/`
 *    only resolved because "contacto" happened to be unique. Add one collision and links silently
 *    point at the wrong page. Instead, every page *declares* which route it is, and the type system
 *    rejects a key that does not exist.
 * 2. **Astro's `astro:i18n` helpers are deliberately unused.** `getRelativeLocaleUrl('es', 'contact')`
 *    returns `/es/contact/`, which 404s here because the Spanish segment is `contacto`. Those helpers
 *    know about locale prefixes but not translated segments. Plain Node scripts (`check-dist.mjs`)
 *    also need this table, and they cannot import from `astro:`.
 */

export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** The default locale is unprefixed: `/contact/`, not `/en/contact/`. */
export const prefixDefaultLocale = false;

interface LocaleMeta {
  /** What the language switcher shows, in that language. */
  label: string;
  /** `<html lang>`. */
  htmlLang: string;
  /** `<link hreflang>`. */
  hreflang: string;
  /** `<meta property="og:locale">`. */
  ogLocale: string;
}

export const localeMeta = {
  en: { label: "English", htmlLang: "en", hreflang: "en", ogLocale: "en_US" },
  es: { label: "Español", htmlLang: "es", hreflang: "es", ogLocale: "es_MX" },
} as const satisfies Record<Locale, LocaleMeta>;

/**
 * Route key → the URL segment in each locale.
 *
 * `home` is the empty segment. `satisfies` is what makes this safe: adding a locale to `locales`, or
 * forgetting a locale on one route, fails `pnpm check` instead of producing a dead link.
 *
 * Spanish segments for `work`, `lab` and `resume` are **proposals awaiting Warden confirmation** —
 * `trabajo`, `laboratorio`, `curriculum` (vs `cv`). Changing one is a one-line edit here; nothing
 * else in the codebase hardcodes a segment.
 */
export const routes = {
  home: { en: "", es: "" },
  work: { en: "work", es: "trabajo" },
  lab: { en: "lab", es: "laboratorio" },
  blog: { en: "blog", es: "blog" },
  resume: { en: "resume", es: "curriculum" },
  contact: { en: "contact", es: "contacto" },
  notFound: { en: "404", es: "404" },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

/** Routes that address a single content entry and therefore need a slug. */
export const entryRoutes = [
  "work",
  "lab",
  "blog",
] as const satisfies readonly RouteKey[];
export type EntryRouteKey = (typeof entryRoutes)[number];

export function isEntryRoute(key: RouteKey): key is EntryRouteKey {
  return (entryRoutes as readonly string[]).includes(key);
}

/**
 * What a page declares about itself. `slugs` maps locale → slug and is required for an entry page;
 * a locale missing from it is a page that has no translation yet, which `alternatesFor` handles.
 */
export interface RouteDescriptor {
  key: RouteKey;
  slugs?: Partial<Record<Locale, string>>;
}

/**
 * Build the path for a route.
 *
 * Always returns a trailing slash, matching `trailingSlash: "always"` in `astro.config.mjs` and the
 * canonical URLs the site already emitted.
 */
export function pathFor(lang: Locale, key: RouteKey, slug?: string): string {
  const segment = routes[key][lang];
  const prefix = lang === defaultLocale && !prefixDefaultLocale ? "" : lang;
  const parts = [prefix, segment, slug].filter((p): p is string => Boolean(p));
  return parts.length === 0 ? "/" : `/${parts.join("/")}/`;
}

export interface Alternate {
  lang: Locale;
  href: string;
  /**
   * True when this locale has the *same* page. False when it only has the section index — which
   * happens when an entry has no translation yet. Only exact alternates may claim `hreflang`;
   * pointing `hreflang="es"` at a Spanish index while the English page is an article is a lie
   * search engines act on.
   */
  exact: boolean;
  label: string;
}

/**
 * Every locale's counterpart of a route.
 *
 * Feeds two consumers with one answer: `<link rel="alternate" hreflang>` (which takes only the exact
 * ones, plus `x-default`) and the language switcher (which takes all of them, falling back to the
 * section index so the switcher never dead-ends).
 */
export function alternatesFor(route: RouteDescriptor): Alternate[] {
  return locales.map((lang) => {
    const needsSlug = isEntryRoute(route.key);
    const slug = route.slugs?.[lang];

    if (needsSlug && !slug) {
      // No translation for this entry: offer the section index instead, and do not claim a pair.
      return {
        lang,
        href: pathFor(lang, route.key),
        exact: false,
        label: localeMeta[lang].label,
      };
    }
    return {
      lang,
      href: pathFor(lang, route.key, needsSlug ? slug : undefined),
      exact: true,
      label: localeMeta[lang].label,
    };
  });
}

/** The alternates that may legitimately be declared as `hreflang` pairs. */
export function hreflangAlternatesFor(route: RouteDescriptor): Alternate[] {
  return alternatesFor(route).filter((a) => a.exact);
}

/**
 * The locale of a URL, from its first path segment.
 *
 * This is the one place a URL is inspected, and it only reads the locale prefix — never a translated
 * segment, which is what made the old reverse lookup fragile.
 */
export function getLang(url: URL): Locale {
  const [, first] = url.pathname.split("/");
  return (locales as readonly string[]).includes(first)
    ? (first as Locale)
    : defaultLocale;
}

/**
 * Every path this site should serve without needing content, for `check-dist.mjs`.
 *
 * Entry *indexes* are included — `/blog/`, `/work/`, `/lab/` are ordinary static pages. Only the
 * detail pages under them are omitted, because which ones exist is decided by the content
 * collections, not by this registry.
 */
export function allStaticPaths(): Array<{
  lang: Locale;
  key: RouteKey;
  path: string;
}> {
  const out: Array<{ lang: Locale; key: RouteKey; path: string }> = [];
  for (const lang of locales) {
    for (const key of Object.keys(routes) as RouteKey[]) {
      out.push({ lang, key, path: pathFor(lang, key) });
    }
  }
  return out;
}
