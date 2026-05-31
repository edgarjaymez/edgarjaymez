# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm preview   # Preview production build locally
pnpm prettier  # Format all files (Astro, TS, JS)
```

No test runner is configured.

## Architecture

**Astro 6 portfolio/blog** with bilingual support (English & Spanish), Svelte and Lit components, and GSAP animations. Uses the Grove design system (`@edgarjaymez/grove`).

### i18n Routing

Astro's built-in i18n is configured in `astro.config.mjs` with `prefixDefaultLocale: false`, meaning:
- English (default) pages live at `src/pages/*.astro` and are served without a language prefix (`/`, `/contact`, `/blog/slug`)
- Spanish pages live at `src/pages/es/*.astro` and are served under `/es/` (`/es/`, `/es/contacto`, `/es/blog/slug`)

Note that some Spanish routes have translated slugs (e.g. `contact` → `contacto`).

**Two separate route systems coexist** — be aware of the distinction:
- `src/i18n/ui.ts` — route slug mappings used by `useTranslatedPath` and `LanguageSwitcher`; this is the actively used system
- `src/i18n/routes.ts` — a newer structured format with labels and `getTranslatedSlug`; partially integrated

The helpers in `src/i18n/utils.ts` (`getLangFromUrl`, `useTranslations`, `useTranslatedPath`, `getRouteFromUrl`) are the standard way to detect language and build links in any page or component.

### Content Collections

Defined in `src/content.config.ts`. The `blog` collection uses a glob loader over `src/content/blog/**/*.md`. The `id` of each entry includes the language folder prefix (e.g. `en/hello-world`, `es/hola-mundo`). Blog posts split the `id` on `/` to extract `lang` and `slug` in `getStaticPaths()`.

Frontmatter schema (Zod): `title` (string), `author` (string), `date` (date).

### Key Files

- `src/consts.ts` — Site-wide title and description constants per locale
- `src/layouts/BaseLayout.astro` — Root layout; infers `lang` from URL and renders `LanguageSwitcher` globally
- `src/i18n/ui.ts` — Translation strings and route slug mappings
- `src/i18n/utils.ts` — i18n helpers used across pages and components
- `astro.config.mjs` — Integrations: Svelte, Lit, Sitemap, Markdoc; site URL `https://edgarjaymez.vercel.app`
