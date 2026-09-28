/**
 * Translation helpers.
 *
 * What used to live here and no longer does:
 *
 * - `useTranslatedPath` — replaced by `pathFor` in the route registry. It took a path string, stripped
 *   every slash with `replaceAll`, and looked the result up as a route key, so it only worked for
 *   single-segment top-level paths and silently returned the input unchanged for anything else.
 * - `getRouteFromUrl` — deleted outright. Reverse-mapping a translated segment back to a route key
 *   works only while no two locales share a segment; pages now declare their own route.
 * - `getLangFromUrl` — moved to the registry as `getLang`, so plain Node scripts can import it.
 */

import { defaultLocale, type Locale } from "./routes";
import { ui, type UiKey } from "./ui";

export { getLang } from "./routes";
export type { Locale } from "./routes";

/** Values substituted into a `{placeholder}` in a string. */
export type TranslationParams = Record<string, string | number>;

/**
 * Substitute `{name}` placeholders.
 *
 * An unmatched placeholder is left in place rather than blanked, so a missing parameter shows up as
 * a visible `{name}` in review instead of a silent gap in a sentence.
 */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key) =>
    key in params ? String(params[key]) : whole,
  );
}

/**
 * Get a translator for a locale.
 *
 * Falls back to the default locale for a key the target locale is missing, which the `satisfies`
 * check in `ui.ts` should already prevent at build time — the fallback is for safety, not a strategy.
 */
export function useTranslations(lang: Locale) {
  return function t(key: UiKey, params?: TranslationParams): string {
    const table = ui[lang] as Record<string, string>;
    const value = table[key] ?? ui[defaultLocale][key];
    return interpolate(value, params);
  };
}
