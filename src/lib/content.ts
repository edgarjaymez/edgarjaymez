/**
 * Content queries.
 *
 * Every read of a collection goes through here, so three rules hold everywhere at once:
 * drafts never reach a build, entries pair across locales by one known rule, and a reserved slug
 * fails loudly instead of producing a URL that collides with a locale prefix.
 */
import { getCollection, getEntry, type CollectionEntry } from "astro:content";

import { defaultLocale, locales, type Locale } from "../i18n/routes";

export type EntryCollection = "blog" | "work" | "lab";
export type AnyEntry = CollectionEntry<EntryCollection>;

/**
 * Slugs that would collide with a locale prefix. `/blog/es/` must mean "the Spanish blog", never
 * "the post whose slug happens to be `es`".
 */
const RESERVED_SLUGS = new Set<string>([...locales, "index", "404"]);

/** `en/hello-world` → `{ locale: "en", slug: "hello-world" }` */
export function splitId(id: string): { locale: Locale; slug: string } {
  const [first, ...rest] = id.split("/");
  const locale = (locales as readonly string[]).includes(first)
    ? (first as Locale)
    : defaultLocale;
  const slug = rest.length ? rest.join("/") : first;
  return { locale, slug };
}

/** The key two locales' versions of the same entry share. */
export function pairingKey(entry: AnyEntry): string {
  const explicit = (entry.data as { translationKey?: string }).translationKey;
  return explicit ?? splitId(entry.id).slug;
}

/** Drafts are visible while developing and absent from a production build. */
function isVisible(entry: AnyEntry): boolean {
  return import.meta.env.DEV || !(entry.data as { draft?: boolean }).draft;
}

function assertSlugIsUsable(entry: AnyEntry): void {
  const { slug } = splitId(entry.id);
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(
      `Content entry "${entry.collection}/${entry.id}" uses the reserved slug "${slug}". ` +
        `It would collide with a locale prefix or a generated route. Rename the file.`,
    );
  }
}

/** Entries of one collection in one locale, newest first, drafts excluded in a build. */
export async function getEntries(
  collection: EntryCollection,
  locale: Locale,
): Promise<AnyEntry[]> {
  const all = await getCollection(collection);
  const mine = all
    .filter((e) => splitId(e.id).locale === locale)
    .filter(isVisible);
  for (const entry of mine) assertSlugIsUsable(entry);
  return mine.sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime());
}

/** The date an entry sorts by. `lab` uses `lastTouched`; everything else uses `date`. */
export function dateOf(entry: AnyEntry): Date {
  const data = entry.data as { date?: Date; lastTouched?: Date };
  return data.lastTouched ?? data.date ?? new Date(0);
}

/**
 * The same entry in another locale, or null.
 *
 * `reference()` is deliberately not used for this: it does not verify the target exists, so a
 * broken pair would build cleanly and 404 at runtime. Resolving it here means a miss is a value
 * we can branch on.
 */
export async function getTranslation(
  entry: AnyEntry,
  locale: Locale,
): Promise<AnyEntry | null> {
  if (splitId(entry.id).locale === locale) return entry;
  const key = pairingKey(entry);
  const all = await getCollection(entry.collection as EntryCollection);
  const match = all.find(
    (candidate) =>
      splitId(candidate.id).locale === locale && pairingKey(candidate) === key,
  );
  return match && isVisible(match) ? match : null;
}

/** Per-locale slugs for an entry, shaped for `route={{ key, slugs }}`. */
export async function slugsFor(
  entry: AnyEntry,
): Promise<Partial<Record<Locale, string>>> {
  const slugs: Partial<Record<Locale, string>> = {};
  for (const locale of locales) {
    const match = await getTranslation(entry, locale);
    if (match) slugs[locale] = splitId(match.id).slug;
  }
  return slugs;
}

/** The static paths for one entry collection in one locale. */
export async function entryPaths(collection: EntryCollection, locale: Locale) {
  const entries = await getEntries(collection, locale);
  return Promise.all(
    entries.map(async (entry) => ({
      params: { slug: splitId(entry.id).slug },
      props: { entry, slugs: await slugsFor(entry) },
    })),
  );
}

/** The per-locale site singleton. */
export async function getSite(locale: Locale) {
  const entry = await getEntry("site", locale);
  if (!entry)
    throw new Error(
      `Missing src/content/site/${locale}.yaml — every locale needs one.`,
    );
  return entry.data;
}

/** The per-locale resume, or null when that locale has none yet. */
export async function getResume(locale: Locale) {
  const entry = await getEntry("resume", locale);
  return entry?.data ?? null;
}

/**
 * Warn once per build about entries that exist in one locale and not the other.
 *
 * A warning, not an error: the blog is expected to lag in one language, and failing the build for
 * that would mean writing every post twice before publishing either.
 */
let parityReported = false;
export async function reportTranslationParity(): Promise<void> {
  if (parityReported) return;
  parityReported = true;

  for (const collection of ["blog", "work", "lab"] as const) {
    // Drafts are excluded: an unfinished post has nothing to translate yet, and reporting it as
    // missing a counterpart trains people to ignore the warning.
    const all = (await getCollection(collection)).filter(
      (e) => !(e.data as { draft?: boolean }).draft,
    );
    const byLocale = new Map<Locale, Set<string>>();
    for (const locale of locales) byLocale.set(locale, new Set());
    for (const entry of all) {
      const { locale } = splitId(entry.id);
      byLocale.get(locale)?.add(pairingKey(entry));
    }
    for (const locale of locales) {
      for (const other of locales) {
        if (locale === other) continue;
        const missing = [...(byLocale.get(locale) ?? [])].filter(
          (k) => !byLocale.get(other)?.has(k),
        );
        if (missing.length) {
          console.warn(
            `[content] ${collection}: ${missing.length} entr${missing.length === 1 ? "y" : "ies"} ` +
              `in "${locale}" with no "${other}" translation — ${missing.join(", ")}`,
          );
        }
      }
    }
  }
}
