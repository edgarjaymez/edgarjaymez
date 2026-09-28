#!/usr/bin/env node
/**
 * check-dist — assert things about the built output that the build itself cannot.
 *
 * `astro build` succeeding only means the code compiled. It does not mean the links resolve, that
 * `<html lang>` matches the path, or that hreflang is reciprocal — and every one of those has been
 * wrong in this repo at some point. This reads `dist/` and checks the claims.
 *
 * v2 covers routing, i18n, exactly one light-DOM `<h1>` per page, and Phosphor icon coverage.
 *
 *   node scripts/check-dist.mjs               check dist/
 *   node scripts/check-dist.mjs --require-all  also fail on registry routes not built yet
 *   node scripts/check-dist.mjs --json        machine-readable
 *
 * A route declared in the registry but absent from dist is reported as **pending**, not failed —
 * the registry describes the finished site, and the routes arrive over several branches. Pass
 * `--require-all` once they all exist. This mirrors how check-art treats undrawn scenes.
 *
 * Exit codes: 0 clean, 1 problems found, 2 no build to check.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import {
  allStaticPaths,
  defaultLocale,
  locales,
  localeMeta,
  routes,
} from "../src/i18n/routes.ts";

const DIST = "dist";

const args = new Set(process.argv.slice(2));
const JSON_OUT = args.has("--json");
const REQUIRE_ALL = args.has("--require-all");
for (const a of args) {
  if (!["--json", "--require-all"].includes(a)) {
    process.stderr.write(`Unknown flag: ${a}\n`);
    process.exit(2);
  }
}

if (!existsSync(DIST)) {
  process.stderr.write(`No ${DIST}/ directory. Run pnpm build first.\n`);
  process.exit(2);
}

const problems = [];
const pending = [];
const fail = (where, message) => problems.push({ where, message });

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

/** `dist/es/contacto/index.html` → `/es/contacto/` */
function urlPathOf(file) {
  const rel = relative(DIST, file).split(sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html"))
    return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

const pages = htmlFiles(DIST);
const byPath = new Map(pages.map((f) => [urlPathOf(f), f]));

// ---- 1. every registry route was actually built ------------------------------------------------

for (const { lang, key, path } of allStaticPaths()) {
  // The root 404 is emitted as /404.html, not /404/, because static hosts want that exact name.
  const candidates =
    key === "notFound" && lang === defaultLocale ? ["/404.html"] : [path];
  if (!candidates.some((c) => byPath.has(c))) {
    const message = `Route "${key}" (${lang}) is declared in the registry but not in dist.`;
    if (REQUIRE_ALL) fail(path, message);
    else pending.push({ where: path, message });
  }
}

/**
 * Is this path part of a route the registry knows about, but which no branch has built yet?
 *
 * Without this, a link to a not-yet-built section reads as a broken link, the report is red for
 * several branches in a row, and people learn to ignore it. A link to a route that is coming is a
 * different fact from a link to nothing, so it is reported differently.
 */
function isPendingRoute(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return false;
  const lang = locales.includes(parts[0]) ? parts[0] : defaultLocale;
  const segment = locales.includes(parts[0]) ? parts[1] : parts[0];
  if (!segment) return false;

  const known = Object.values(routes).some(
    (perLocale) => perLocale[lang] === segment,
  );
  if (!known) return false;

  // Known segment: pending only while its own index is absent from the build.
  const indexPath =
    lang === defaultLocale ? `/${segment}/` : `/${lang}/${segment}/`;
  return !byPath.has(indexPath);
}

// ---- 2. per-page claims ------------------------------------------------------------------------

const attr = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};

for (const [urlPath, file] of byPath) {
  const html = readFileSync(file, "utf8");
  const where = urlPath;

  // <html lang> must match the path's locale prefix.
  const declared = attr(html, /<html[^>]*\blang="([^"]*)"/);
  const seg = urlPath.split("/")[1];
  const expectedLocale = locales.includes(seg) ? seg : defaultLocale;
  const expectedLang = localeMeta[expectedLocale].htmlLang;
  if (!declared) fail(where, "No <html lang> attribute.");
  else if (declared !== expectedLang) {
    fail(
      where,
      `<html lang="${declared}"> but the path implies "${expectedLang}".`,
    );
  }

  // A canonical is required, and must be absolute.
  const canonical = attr(html, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/);
  if (!canonical) fail(where, "No canonical link.");
  else if (!/^https?:\/\//.test(canonical))
    fail(where, `Canonical is not absolute: ${canonical}`);

  // Twitter card tags must use name=, not property=. property= works in some crawlers, which is
  // exactly why the mistake survives.
  if (/<meta[^>]*property="twitter:/.test(html)) {
    fail(
      where,
      'Twitter tags use property="twitter:…"; they must use name="twitter:…".',
    );
  }

  // Internal links must resolve to something that was built.
  const hrefs = [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) continue;
    const hit =
      byPath.has(clean) || existsSync(join(DIST, clean.replace(/^\//, "")));
    if (hit) continue;
    const message = `Link to ${href} does not resolve in dist.`;
    if (isPendingRoute(clean))
      pending.push({ where, message: `${message} (route not built yet)` });
    else fail(where, message);
  }

  // hreflang must be reciprocal: if A claims B, B must claim A.
  const alts = [
    ...html.matchAll(
      /<link[^>]*rel="alternate"[^>]*hreflang="([^"]*)"[^>]*href="([^"]*)"/g,
    ),
  ].map((m) => ({ lang: m[1], href: m[2] }));
  for (const alt of alts) {
    if (alt.lang === "x-default") continue;
    let target;
    try {
      target = new URL(alt.href).pathname;
    } catch {
      fail(
        where,
        `hreflang="${alt.lang}" href is not a valid URL: ${alt.href}`,
      );
      continue;
    }
    const targetFile = byPath.get(target);
    if (!targetFile) {
      const message = `hreflang="${alt.lang}" points at ${target}, which is not in dist.`;
      if (isPendingRoute(target))
        pending.push({ where, message: `${message} (route not built yet)` });
      else fail(where, message);
      continue;
    }
    const back = readFileSync(targetFile, "utf8");
    const claimsUs = [
      ...back.matchAll(/<link[^>]*rel="alternate"[^>]*href="([^"]*)"/g),
    ].some((m) => {
      try {
        return new URL(m[1]).pathname === urlPath;
      } catch {
        return false;
      }
    });
    if (!claimsUs)
      fail(
        where,
        `hreflang to ${target} is not reciprocal — that page does not link back.`,
      );
  }

  // Exactly one light-DOM <h1>. Zero means the page has no heading a crawler or a JS-less visitor
  // can see -- the failure mode Grove's slotless components create, since <gv-title heading="…">
  // serialises as an empty shell. More than one is an outline problem.
  //
  // The root 404 is the one legitimate exception: static hosts only special-case /404.html, so
  // that single page has to answer in both languages and therefore carries two headings, one of
  // them in a `hidden` block. Exempted by path rather than by weakening the rule everywhere.
  const h1s =
    urlPath === "/404.html" ? 1 : (html.match(/<h1[\s>]/g) || []).length;
  if (h1s === 0) {
    fail(
      where,
      "No light-DOM <h1>. A Grove element's heading lives in its shadow root and is absent from " +
        "the server HTML — wrap it so a real heading ships too.",
    );
  } else if (h1s > 1) {
    fail(where, `${h1s} light-DOM <h1> elements; there should be exactly one.`);
  }
}

// ---- 2b. Phosphor icon coverage ----------------------------------------------------------------

// Grove emits <ph-*> elements but never registers them. An icon name with no matching import
// renders nothing at all, with no error anywhere — so the names used are checked against the
// elements the client bundle actually defines.
{
  const iconNames = new Set();
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    for (const m of html.matchAll(/\sicon="([a-z0-9-]+)"/g))
      iconNames.add(m[1]);
  }

  if (iconNames.size) {
    const assetDir = join(DIST, "_astro");
    const bundles = existsSync(assetDir)
      ? readdirSync(assetDir).filter((f) => f.endsWith(".js"))
      : [];
    const bundleSource = bundles
      .map((f) => readFileSync(join(assetDir, f), "utf8"))
      .join("\n");

    for (const name of [...iconNames].sort()) {
      // Phosphor registers <ph-kebab-name>; the module is PhPascalName.
      if (!bundleSource.includes(`ph-${name}`)) {
        const pascal = name.replace(/(^|-)([a-z])/g, (_a, _b, c) =>
          c.toUpperCase(),
        );
        fail(
          "client bundle",
          `icon="${name}" is rendered but <ph-${name}> is not registered. ` +
            `Add: import "@phosphor-icons/webcomponents/Ph${pascal}"; to BaseLayout's script.`,
        );
      }
    }
  }
}

// ---- 3. site-wide -----------------------------------------------------------------------------

if (!existsSync(join(DIST, "sitemap-index.xml"))) {
  fail(
    "sitemap-index.xml",
    "Sitemap integration is active but no sitemap-index.xml was emitted.",
  );
}

const sitemapFile = join(DIST, "sitemap-0.xml");
if (existsSync(sitemapFile)) {
  const xml = readFileSync(sitemapFile, "utf8");
  if (/\/404/.test(xml))
    fail("sitemap-0.xml", "404 pages must be excluded from the sitemap.");
}

// ---- report -----------------------------------------------------------------------------------

if (JSON_OUT) {
  process.stdout.write(
    JSON.stringify(
      { ok: problems.length === 0, pages: pages.length, problems, pending },
      null,
      2,
    ) + "\n",
  );
  process.exit(problems.length ? 1 : 0);
}

process.stdout.write(`checked ${pages.length} page(s) in ${DIST}/\n`);
if (pending.length) {
  process.stdout.write(
    `\n${pending.length} item(s) pending — declared or linked, not built yet:\n`,
  );
  for (const p of pending)
    process.stdout.write(`    ${p.where}  ${p.message}\n`);
}
if (problems.length === 0) {
  process.stdout.write("\nno problems\n");
  process.exit(0);
}
const grouped = new Map();
for (const p of problems) {
  if (!grouped.has(p.where)) grouped.set(p.where, []);
  grouped.get(p.where).push(p.message);
}
for (const [where, messages] of grouped) {
  process.stdout.write(`\n${where}\n`);
  for (const m of messages) process.stdout.write(`    ${m}\n`);
}
process.stdout.write(`\n${problems.length} problem(s)\n`);
process.exit(1);
