/**
 * The content model — "Astro as the CMS".
 *
 * Every collection is files in this repo, so content is versioned, reviewable and diffable like
 * code. Long-form bodies are Markdoc (`.mdoc`); structured records are YAML or JSON.
 *
 * Two rules protect the thing most likely to break silently — the pairing of an English entry with
 * its Spanish counterpart:
 *
 * 1. **No frontmatter key may be named `slug`.** The glob loader's default `generateId` returns
 *    `data.slug` from the *raw* frontmatter, before any schema runs
 *    (`astro/dist/content/loaders/glob.js`). Two entries that shared a `slug:` would collapse onto
 *    one id and one would vanish from the build with no error. Guarded twice: a custom `generateId`
 *    that ignores it, and `.strict()` schemas that reject the key outright.
 * 2. **Pairing is by `translationKey ?? basename`.** Same-named files pair with zero config;
 *    `es/hola-mundo.mdoc` keeps its own slug by declaring `translationKey: hello-world`.
 *
 * Nesting stays at most two levels deep — the frontmatter has to stay hand-editable, and a
 * three-level object in YAML is where that stops being true.
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * The id is always the path minus its extension — `en/hello-world`, never `data.slug`.
 * The locale is the first segment; the URL slug is the basename.
 */
const idFromPath = ({ entry }: { entry: string }) =>
  entry.replace(/\.[^.]+$/, "");

/** Fields every long-form entry shares. */
const commonEntryFields = {
  title: z.string().min(1),
  description: z
    .string()
    .min(1)
    .max(
      160,
      "Keep descriptions under 160 characters — they are used as meta descriptions.",
    ),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  /** Set only when the translated file has a different basename than its counterpart. */
  translationKey: z.string().optional(),
};

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.mdoc",
    base: "./src/content/blog",
    generateId: idFromPath,
  }),
  schema: ({ image }) =>
    z
      .object({
        ...commonEntryFields,
        author: z.string().default("Edgar Jaymez"),
        cover: image().optional(),
        coverAlt: z.string().optional(),
      })
      .strict(),
});

const work = defineCollection({
  loader: glob({
    pattern: "**/*.mdoc",
    base: "./src/content/work",
    generateId: idFromPath,
  }),
  schema: ({ image }) =>
    z
      .object({
        ...commonEntryFields,
        /** What Edgar did, not what the company does. */
        role: z.string().min(1),
        /** The one-line result. Shown on the card. */
        outcome: z.string().min(1),
        period: z.string().min(1),
        /** Exactly three featured case studies become the doors in The Quarters. */
        featured: z.boolean().default(false),
        order: z.number().int().default(0),
        stack: z.array(z.string()).default([]),
        links: z
          .array(z.object({ label: z.string(), href: z.string().url() }))
          .default([]),
        cover: image().optional(),
        coverAlt: z.string().optional(),
      })
      .strict(),
});

const lab = defineCollection({
  loader: glob({
    pattern: "**/*.mdoc",
    base: "./src/content/lab",
    generateId: idFromPath,
  }),
  schema: ({ image }) =>
    z
      .object({
        ...commonEntryFields,
        /** What is in the pot. */
        note: z.string().min(1),
        /** Kitchen canon: shipped, still cooking, or it did not work out. */
        status: z.enum(["shipped", "simmering", "burnt"]),
        lastTouched: z.coerce.date(),
        href: z.string().url().optional(),
        featured: z.boolean().default(false),
        order: z.number().int().default(0),
        cover: image().optional(),
        coverAlt: z.string().optional(),
      })
      .strict(),
});

/**
 * One file per locale. A JSON Resume v1 subset — the standard fields, plus the extensions the
 * sibling resume repo already uses.
 *
 * Which personal fields are public is the Warden's call; the schema allows them, the content
 * decides. Nothing here requires a phone number or a postal address.
 */
const resume = defineCollection({
  loader: glob({
    pattern: "*.json",
    base: "./src/content/resume",
    generateId: idFromPath,
  }),
  schema: z
    .object({
      basics: z
        .object({
          name: z.string(),
          label: z.string(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          url: z.string().url().optional(),
          summary: z.string().optional(),
          location: z
            .object({
              city: z.string(),
              region: z.string().optional(),
              countryCode: z.string().optional(),
            })
            .optional(),
          profiles: z
            .array(
              z.object({
                network: z.string(),
                username: z.string(),
                url: z.string().url(),
              }),
            )
            .default([]),
        })
        .strict(),
      work: z
        .array(
          z.object({
            name: z.string(),
            position: z.string(),
            url: z.string().url().optional(),
            startDate: z.string(),
            endDate: z.string().optional(),
            summary: z.string().optional(),
            highlights: z.array(z.string()).default([]),
          }),
        )
        .default([]),
      education: z
        .array(
          z.object({
            institution: z.string(),
            area: z.string().optional(),
            studyType: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
          }),
        )
        .default([]),
      skills: z
        .array(
          z.object({
            name: z.string(),
            keywords: z.array(z.string()).default([]),
          }),
        )
        .default([]),
      languages: z
        .array(z.object({ language: z.string(), fluency: z.string() }))
        .default([]),
    })
    .strict(),
});

/**
 * Per-locale site copy: the singleton that holds everything a visitor reads which is not an entry.
 *
 * The scene titles here are the single source for both the scene heading and its rail label — two
 * places showing different words for the same place is the failure this prevents.
 */
const site = defineCollection({
  loader: glob({
    pattern: "*.yaml",
    base: "./src/content/site",
    generateId: idFromPath,
  }),
  schema: z
    .object({
      profile: z
        .object({ name: z.string(), role: z.string(), summary: z.string() })
        .strict(),
      availability: z.object({ open: z.boolean(), note: z.string() }).strict(),
      links: z
        .array(
          z.object({
            label: z.string(),
            href: z.string().url(),
            icon: z.string().optional(),
          }),
        )
        .default([]),
      principles: z
        .array(z.object({ title: z.string(), body: z.string() }))
        .default([]),
      nowCooking: z.string().optional(),
      scenes: z
        .array(
          z.object({
            /** Must match a scene key in src/lib/art/contract.mjs. */
            key: z.string(),
            eyebrow: z.string().optional(),
            title: z.string(),
            intro: z.string().optional(),
          }),
        )
        .default([]),
    })
    .strict(),
});

export const collections = { blog, work, lab, resume, site };
