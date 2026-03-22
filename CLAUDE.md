# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm preview   # Preview production build locally
```

No test runner is configured.

## Architecture

**Astro 6 portfolio/blog** with bilingual support (English & Spanish), Svelte components, and GSAP animations. Uses the Grove design system (`@edgarjaymez/grove`).

### i18n Routing

Language routing is handled via Astro's file-based routing — no dedicated i18n library. Routes are prefixed with `/en/` or `/es/`, and the root `/` redirects to a default locale. Content is co-located by language under `src/content/blog/{en,es}/`.

Dynamic routes (e.g., `src/pages/en/blog/[...slug].astro`) use `getStaticPaths()` to enumerate content at build time.

### Content Collections

Defined in `src/content.config.ts`. The `blog` collection uses a glob loader over `src/content/blog/**/*.md`. Frontmatter schema (Zod): `title` (string), `author` (string), `date` (date).

### Key Files

- `src/consts.ts` — Site-wide constants (titles, descriptions per locale)
- `src/layouts/BaseLayout.astro` — Root layout used by all pages
- `src/components/BaseHead.astro` — `<head>` metadata
- `astro.config.mjs` — Integrations: Svelte, Sitemap, Markdoc; site URL: `https://edgarjaymez.vercel.app`
