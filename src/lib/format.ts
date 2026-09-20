/**
 * Date formatting.
 *
 * Everything here forces UTC. A post dated `2026-03-17T00:00:00Z` rendered with the machine's local
 * timezone shows as 16 March anywhere west of Greenwich — so the same build produces a different
 * date depending on who ran it. The build already did this before the collection rewrite.
 */
import { localeMeta, type Locale } from "../i18n/routes";

/** A long, readable date — "17 March 2026" / "17 de marzo de 2026". */
export function formatDate(date: Date, lang: Locale): string {
  return new Intl.DateTimeFormat(localeMeta[lang].htmlLang, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Just the month and year, for résumé entries. */
export function formatMonth(date: Date, lang: Locale): string {
  return new Intl.DateTimeFormat(localeMeta[lang].htmlLang, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/** The machine-readable value for a `<time datetime>` attribute. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The year an entry belongs to — the Fire Circle's rings are years. */
export function yearOf(date: Date): number {
  return date.getUTCFullYear();
}
