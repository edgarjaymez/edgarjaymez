/**
 * Shared RSS feed construction.
 *
 * Both locales' feeds come from here so they cannot drift. Two decisions worth stating:
 *
 * 1. **Summary only, no full content.** Markdoc entries have no `rendered.html` the way Markdown
 *    ones do, so there is no body to embed without rendering each entry through the Markdoc
 *    pipeline at feed-build time. The description is what ships.
 * 2. **Each locale gets its own feed**, so a Spanish reader is not subscribed to English posts.
 */
import rss, { type RSSFeedItem } from "@astrojs/rss";

import { localeMeta, pathFor, type Locale } from "../i18n/routes";
import { getEntries, splitId } from "./content";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_ES,
  SITE_TITLE,
  SITE_TITLE_ES,
} from "../consts";

export async function buildFeed(lang: Locale, site: URL | undefined) {
  if (!site) {
    throw new Error(
      "astro.config.mjs must set `site` for the feed to emit absolute URLs.",
    );
  }

  const posts = await getEntries("blog", lang);

  const items: RSSFeedItem[] = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    pubDate: post.data.date,
    link: pathFor(lang, "blog", splitId(post.id).slug),
    categories: post.data.tags,
  }));

  return rss({
    title: lang === "es" ? SITE_TITLE_ES : SITE_TITLE,
    description: lang === "es" ? SITE_DESCRIPTION_ES : SITE_DESCRIPTION,
    site,
    items,
    // Declaring the language is what stops a reader from filing Spanish posts under English.
    customData: `<language>${localeMeta[lang].hreflang}</language>`,
  });
}
