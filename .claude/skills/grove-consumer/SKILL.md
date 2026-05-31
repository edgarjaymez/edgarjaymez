---
name: grove-consumer
description: Run and verify the edgarjaymez Astro portfolio (dev server or static prod build)
---

# Run — edgarjaymez Astro Portfolio

Astro 6 + `@astrojs/lit` + Grove design system (`@edgarjaymez/grove`). Two distinct modes:

- **Dev** — Vite dev server with HMR; port 4321 (falls back to 4322 if in use).
- **Prod preview** — static build served locally; this is what Vercel deploys. Always use this to verify changes before pushing.

## Prerequisites

```bash
pnpm install   # run from /Users/ediazjz/Documents/coding/edgarjaymez
```

Grove is linked as a local file dependency (`file:../grove`). If `../grove/dist/` is missing, build it first:

```bash
cd /Users/ediazjz/Documents/coding/grove && pnpm build
cd /Users/ediazjz/Documents/coding/edgarjaymez
```

## Dev server

```bash
pkill -f "astro dev" 2>/dev/null; true
pnpm dev > /tmp/astro-dev.log 2>&1 &
echo $! > /tmp/dev.pid

# Wait for ready (port may be 4321 or 4322 if 4321 is in use)
for i in $(seq 1 30); do
  curl -sf http://localhost:4321 >/dev/null 2>&1 && echo "ready:4321" && break
  curl -sf http://localhost:4322 >/dev/null 2>&1 && echo "ready:4322" && break
  sleep 1
done
```

Check which port: `grep "Local" /tmp/astro-dev.log`

Stop: `kill $(cat /tmp/dev.pid)`

## Prod build + preview (use this to simulate Vercel)

```bash
pnpm build && pnpm preview > /tmp/preview.log 2>&1 &
echo $! > /tmp/preview.pid

for i in $(seq 1 20); do
  curl -sf http://localhost:4321 >/dev/null 2>&1 && echo "preview ready" && break
  sleep 1
done
```

Stop: `kill $(cat /tmp/preview.pid)`

## Smoke check

After starting either server, verify Grove components are rendering:

```bash
# Home page — must have full DSdDOM for gv-isotype and gv-button (not empty tags)
curl -s http://localhost:4321/ | python3 -c "
import sys; c = sys.stdin.read()
for tag in ['gv-isotype','gv-button']:
    s=c.find('<'+tag); e=c.find('</'+tag+'>')+len('</'+tag+'>')
    print(tag+':', 'OK(DSdDOM)' if 'shadowroot' in c[s:e] else 'BROKEN(empty tag)')
"

# Spanish contact route
curl -sf -o /dev/null -w "%{http_code}" http://localhost:4321/es/contacto   # expect 200
```

If `gv-isotype` or `gv-button` shows `BROKEN(empty tag)`, see gotchas below.

## Routes

| URL               | File                                |
| ----------------- | ----------------------------------- |
| `/`               | `src/pages/index.astro`             |
| `/contact`        | `src/pages/contact.astro`           |
| `/es/`            | `src/pages/es/index.astro`          |
| `/es/contacto`    | `src/pages/es/contacto.astro`       |
| `/es/blog/[slug]` | `src/pages/es/blog/[...slug].astro` |

## Gotchas discovered in development

### Grove components are empty in the static prod build but work in dev

**Root cause**: `import '@edgarjaymez/grove'` in Astro frontmatter is server-side only — Vite does NOT bundle it for the browser. In dev, Vite serves all modules on demand so it appears to work. In the static build (and on Vercel), the browser never receives the Grove JavaScript.

**Fix already in place**: `src/layouts/BaseLayout.astro` includes:

```astro
<script>
  import "@edgarjaymez/grove";
</script>
```

This `<script>` (without `is:inline`) is bundled by Vite for the client.

**Why the script was previously tree-shaken**: Grove's `package.json` had `"sideEffects": ["**/*.css"]` — JS was absent, so Vite eliminated `import '@edgarjaymez/grove'` as dead code. Fixed in `grove/package.json` by adding `"**/*.js"`.

**Rule**: Any Lit component library that uses `@customElement` (which calls `customElements.define()` as a side effect) must declare `"sideEffects": ["**/*.js", "**/*.css"]` in its `package.json`. See [Lit publishing guide](https://lit.dev/docs/tools/publishing/).

### Two imports required — frontmatter AND script tag

`BaseLayout.astro` correctly has both:

```astro
---
import "@edgarjaymez/grove"; // SSR: tells @astrojs/lit to render DSdDOM at build time
---

<head>
  <script>
    import "@edgarjaymez/grove"; // Client: Vite bundles this for the browser
  </script>
</head>
```

Removing either breaks a different environment.

### Spanish contact route is `/es/contacto`, not `/es/contact`

The file is `src/pages/es/contacto.astro` (not `contact.astro`). Route translation is defined in `src/i18n/ui.ts` under `routes.es.contact = "contacto"`. If you rename it back, the LanguageSwitcher will link to a 404.

### Grove must be a versioned npm dependency, not a local file

`package.json` uses `"@edgarjaymez/grove": "0.28.2"` (versioned). If you ever switch back to `"file:../grove"` for local dev, Vercel will fail with `ENOENT: no such file or directory, scandir '/vercel/grove'` because the local path doesn't exist on their build servers. Always revert to a version number before pushing.
