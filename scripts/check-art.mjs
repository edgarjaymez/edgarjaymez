#!/usr/bin/env node
/**
 * check-art — validate journey scenery SVGs against the art contract.
 *
 * Zero dependencies. Reads `src/lib/art/contract.mjs`, so the rules here and the rules the brief
 * states cannot drift apart.
 *
 *   node scripts/check-art.mjs                 check everything present
 *   node scripts/check-art.mjs --require-all   also fail on art that has not been drawn yet
 *   node scripts/check-art.mjs --strict        treat warnings as errors
 *   node scripts/check-art.mjs --json          machine-readable output
 *   node scripts/check-art.mjs --fix           apply only lossless repairs, then re-check
 *   node scripts/check-art.mjs path/to.svg     check specific files
 *
 * Exit codes: 0 clean, 1 contract violations, 2 bad usage.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

import {
  BANNED_ATTRIBUTES,
  BANNED_ELEMENTS,
  BUDGETS,
  EXPORT_SETTINGS,
  GEOMETRY,
  PLANES,
  SERIES_PATTERN,
  allPlaneKeys,
  expectedHeight,
  expectedWidth,
  isStrokeId,
  requirementsFor,
} from "../src/lib/art/contract.mjs";
import {
  collectColors,
  normalizeHex,
  parseViewBox,
  scanSvg,
} from "../src/lib/art/svg-scan.mjs";
import {
  extractPalette,
  hexIndex,
  TOKENS_PATH,
} from "../src/lib/art/palette.mjs";

const ART_ROOT = "src/assets/journey";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const explicitFiles = args.filter((a) => !a.startsWith("--"));

const OPT = {
  fix: flags.has("--fix"),
  json: flags.has("--json"),
  strict: flags.has("--strict"),
  requireAll: flags.has("--require-all"),
};

for (const f of flags) {
  if (!["--fix", "--json", "--strict", "--require-all", "--help"].includes(f)) {
    process.stderr.write(`Unknown flag: ${f}\n`);
    process.exit(2);
  }
}
if (flags.has("--help")) {
  process.stdout.write(
    readFileSync(new URL(import.meta.url))
      .toString()
      .split("*/")[0]
      .replace(/^#!.*\n/, "")
      .replace(/^\/\*\*?/, ""),
  );
  process.exit(0);
}

/** `src/assets/journey/kitchen/mid.svg` → `kitchen/mid` */
function keyForPath(path) {
  const rel = relative(ART_ROOT, path).split(sep).join("/");
  return rel.replace(/\.svg$/i, "");
}

function findSvgs(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findSvgs(full));
    else if (/\.svg$/i.test(entry)) out.push(full);
  }
  return out.sort();
}

/** Load the palette, tolerating a missing install rather than crashing the build. */
function loadPalette() {
  if (!existsSync(TOKENS_PATH)) return { index: new Map(), available: false };
  const { palette } = extractPalette(readFileSync(TOKENS_PATH, "utf8"));
  return { index: hexIndex(palette), available: true, size: palette.length };
}

const results = [];

const VALID_KEYS = new Set(allPlaneKeys());

function checkFile(path, palette) {
  const key = keyForPath(path);
  const errors = [];
  const warnings = [];
  const fixes = [];
  const source = readFileSync(path, "utf8");
  const scan = scanSvg(source);

  // A file nobody expects is worse than a missing one: a stray `mid copy.svg` looks like art, gets
  // committed, and is never loaded. Flag it rather than checking it against rules it cannot meet.
  if (!VALID_KEYS.has(key)) {
    errors.push({
      line: 1,
      message:
        `Unexpected file. "${key}.svg" is not a scene/plane the journey loads. ` +
        `Expected one of: ${[...VALID_KEYS].join(", ")}. ` +
        `Rename it, or delete it if it is a duplicate.`,
    });
    return { key, path, errors, warnings, fixes, scan };
  }

  for (const p of scan.problems)
    errors.push({ line: p.line, message: p.message });
  if (!scan.root) return { key, path, errors, warnings, fixes, scan };

  // ---- geometry -----------------------------------------------------------------------------
  const [scene, plane] = key.split("/");
  const vb = parseViewBox(scan.root.attrs.viewBox);
  if (!vb) {
    errors.push({
      line: scan.root.line,
      message: `Root <svg> has no usable viewBox. Expected viewBox="0 0 ${expectedWidth(scene, plane)} ${expectedHeight()}".`,
    });
  } else {
    const wantW = expectedWidth(scene, plane);
    const wantH = expectedHeight();
    if (vb.width !== wantW || vb.height !== wantH) {
      errors.push({
        line: scan.root.line,
        message:
          `viewBox is ${vb.width}x${vb.height}, expected ${wantW}x${wantH}. ` +
          `The artboard is ${GEOMETRY.artboard.width}x${GEOMETRY.artboard.height} ` +
          `(a ${GEOMETRY.stage.width}x${GEOMETRY.stage.height} stage plus ${GEOMETRY.bleed.x}/${GEOMETRY.bleed.y} bleed)` +
          (wantW !== GEOMETRY.artboard.width
            ? `; ${scene} is a panorama, so this plane is wider.`
            : "."),
      });
    }
    if (vb.minX !== 0 || vb.minY !== 0) {
      errors.push({
        line: scan.root.line,
        message: `viewBox origin is ${vb.minX} ${vb.minY}, expected 0 0. Export the frame, not the selection.`,
      });
    }
  }

  // ---- banned elements and attributes -------------------------------------------------------
  for (const el of scan.elements) {
    if (el.closing) continue;
    if (BANNED_ELEMENTS.includes(el.tag)) {
      const why =
        el.tag === "text" || el.tag === "tspan" || el.tag === "textPath"
          ? "Copy is live HTML so it can be translated and read by assistive tech — never drawn."
          : el.tag === "image"
            ? "Raster breaks the flat-vector look and cannot be recoloured by token."
            : el.tag === "style"
              ? "Art must not carry CSS the app cannot see."
              : "It defeats plane compositing or token recolouring.";
      errors.push({
        line: el.line,
        message: `Banned element <${el.tag}>. ${why}`,
      });
    }
    for (const attr of BANNED_ATTRIBUTES) {
      if (el.attrs[attr] === undefined) continue;
      // The root frame clip is the one legal clip-path.
      if (attr === "clip-path" && el.tag === "svg") continue;
      errors.push({
        line: el.line,
        message:
          `Banned attribute ${attr}="…" on <${el.tag}>.` +
          (attr === "style"
            ? " Use presentation attributes so colours stay tokenizable."
            : ""),
      });
    }
  }

  // ---- ids ----------------------------------------------------------------------------------
  for (const dup of scan.duplicateIds) {
    errors.push({
      line: dup.lines[0],
      message: `Duplicate id "${dup.id}" (lines ${dup.lines.join(", ")}). Ids are the animation contract and must be unique within a plane.`,
    });
  }

  const idSet = new Set(scan.ids.map((i) => i.id));

  for (const { id, line } of scan.ids) {
    if (/_\d+$/.test(id)) {
      errors.push({
        line,
        message: `Id "${id}" carries a Figma duplicate suffix. Rename the layer; "_2" means two layers share a name.`,
      });
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      warnings.push({
        line,
        message: `Id "${id}" is not kebab-case. Layer names are the animation contract.`,
      });
    }
  }

  const req = requirementsFor(key);
  if (req) {
    for (const id of req.ids) {
      if (!idSet.has(id)) {
        errors.push({
          line: 1,
          message: `Missing required layer "${id}". The contract needs it to animate this scene.`,
        });
      }
    }
    for (const { prefix, min } of req.series) {
      const members = [...idSet]
        .map((id) => SERIES_PATTERN.exec(id))
        .filter((m) => m && m[1] === prefix)
        .map((m) => Number(m[2]))
        .sort((a, b) => a - b);
      if (members.length < min) {
        errors.push({
          line: 1,
          message: `Series "${prefix}-NN" has ${members.length} member(s), needs at least ${min}. Content grows: draw enough that new entries need no new art.`,
        });
        continue;
      }
      for (let i = 0; i < members.length; i++) {
        if (members[i] !== i + 1) {
          errors.push({
            line: 1,
            message: `Series "${prefix}-NN" must start at 01 and be contiguous; got ${members.map((n) => String(n).padStart(2, "0")).join(", ")}.`,
          });
          break;
        }
      }
    }
  }

  // ---- strokes that carry motion ------------------------------------------------------------
  for (const el of scan.elements) {
    if (el.closing) continue;
    const id = el.attrs.id;
    if (!id || !isStrokeId(id)) continue;
    const fill = (el.attrs.fill || "").trim().toLowerCase();
    if (fill !== "none") {
      errors.push({
        line: el.line,
        message: `"${id}" guides motion, so it must be an open stroke with fill="none" (found fill="${fill || "unset"}").`,
      });
      if (OPT.fix) fixes.push({ kind: "stroke-fill-none", id });
    }
    if (!el.attrs.stroke || el.attrs.stroke.trim().toLowerCase() === "none") {
      errors.push({
        line: el.line,
        message: `"${id}" must carry a real stroke colour.`,
      });
    }
    if (el.attrs["stroke-dasharray"]) {
      errors.push({
        line: el.line,
        message: `"${id}" must not be dashed — the dash array is how the styled phase draws it.`,
      });
      if (OPT.fix) fixes.push({ kind: "drop-dasharray", id });
    }
  }

  // ---- palette ------------------------------------------------------------------------------
  if (palette.available) {
    const colors = collectColors(scan);
    for (const [value, uses] of colors) {
      const hex = normalizeHex(value);
      if (!hex) {
        errors.push({
          line: uses[0].line,
          message: `Colour "${value}" is not a plain hex. Export with the ${EXPORT_SETTINGS.colorProfile} profile and flat fills; gradients need a reviewed allow entry.`,
        });
        continue;
      }
      if (!palette.index.has(hex)) {
        errors.push({
          line: uses[0].line,
          message: `Colour ${hex} is not a Grove primitive (${uses.length} use${uses.length > 1 ? "s" : ""}, first on <${uses[0].tag} ${uses[0].attr}>). Run \`node scripts/art-palette.mjs\` and pick from the swatch sheet.`,
        });
      }
    }
  } else {
    warnings.push({
      line: 1,
      message: `Grove tokens not found at ${TOKENS_PATH}; palette not checked. Run pnpm install.`,
    });
  }

  // ---- budgets ------------------------------------------------------------------------------
  if (scan.bytes > BUDGETS.maxBytes) {
    errors.push({
      line: 1,
      message: `${(scan.bytes / 1024).toFixed(1)} KB exceeds the ${BUDGETS.maxBytes / 1024} KB per-plane budget. Six scenes load here.`,
    });
  }
  if (scan.elementCount > BUDGETS.maxElements) {
    errors.push({
      line: 1,
      message: `${scan.elementCount} elements exceeds the ${BUDGETS.maxElements} per-plane budget. Stars are a handful of circles, not hundreds.`,
    });
  }

  return { key, path, errors, warnings, fixes, scan };
}

/** Lossless repairs only: things with exactly one correct outcome. */
function applyFixes(path, fixes) {
  if (!fixes.length) return 0;
  let source = readFileSync(path, "utf8");
  let applied = 0;
  for (const fix of fixes) {
    const tagRe = new RegExp(
      `<[^>]*\\sid\\s*=\\s*"${fix.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
    );
    const tag = source.match(tagRe);
    if (!tag) continue;
    let next = tag[0];
    if (fix.kind === "stroke-fill-none") {
      next = /\sfill\s*=\s*"[^"]*"/.test(next)
        ? next.replace(/\sfill\s*=\s*"[^"]*"/, ' fill="none"')
        : next.replace(/^<(\w+)/, '<$1 fill="none"');
    } else if (fix.kind === "drop-dasharray") {
      next = next.replace(/\sstroke-dasharray\s*=\s*"[^"]*"/g, "");
    }
    if (next !== tag[0]) {
      source = source.replace(tag[0], next);
      applied++;
    }
  }
  if (applied) writeFileSync(path, source);
  return applied;
}

// ---- run --------------------------------------------------------------------------------------

const palette = loadPalette();
const files = explicitFiles.length ? explicitFiles : findSvgs(ART_ROOT);

for (const path of files) {
  if (!existsSync(path)) {
    results.push({
      key: path,
      path,
      errors: [{ line: 1, message: "File not found." }],
      warnings: [],
      fixes: [],
    });
    continue;
  }
  let result = checkFile(path, palette);
  if (OPT.fix && result.fixes.length) {
    const n = applyFixes(path, result.fixes);
    if (n) result = { ...checkFile(path, palette), fixedCount: n };
  }
  results.push(result);
}

// Missing art is only an error when asked for; before the drawing exists, absence is normal.
const present = new Set(results.map((r) => r.key));
const missing = explicitFiles.length
  ? []
  : allPlaneKeys().filter((k) => !present.has(k));

const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
const warningCount = results.reduce((n, r) => n + r.warnings.length, 0);
const missingCount = OPT.requireAll ? missing.length : 0;
const failed =
  errorCount + missingCount > 0 || (OPT.strict && warningCount > 0);

if (OPT.json) {
  process.stdout.write(
    JSON.stringify(
      {
        ok: !failed,
        checked: results.length,
        errors: errorCount,
        warnings: warningCount,
        missing,
        paletteAvailable: palette.available,
        files: results.map((r) => ({
          key: r.key,
          path: r.path,
          bytes: r.scan ? r.scan.bytes : 0,
          elements: r.scan ? r.scan.elementCount : 0,
          errors: r.errors,
          warnings: r.warnings,
          fixed: r.fixedCount || 0,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  process.exit(failed ? 1 : 0);
}

if (results.length === 0 && missing.length) {
  process.stdout.write(
    `No journey art yet — ${missing.length} plane(s) still to draw.\n`,
  );
  process.stdout.write(`Brief: ${ART_ROOT}/README.md\n`);
  if (!OPT.requireAll) process.exit(0);
}

for (const r of results) {
  const bad = r.errors.length + (OPT.strict ? r.warnings.length : 0);
  const size = r.scan
    ? `${(r.scan.bytes / 1024).toFixed(1)} KB, ${r.scan.elementCount} el`
    : "";
  const status = bad ? "FAIL" : r.warnings.length ? "warn" : "ok";
  process.stdout.write(
    `${status === "FAIL" ? "✗" : status === "warn" ? "!" : "✓"} ${r.key.padEnd(20)} ${size}\n`,
  );
  if (r.fixedCount)
    process.stdout.write(`    fixed ${r.fixedCount} issue(s) losslessly\n`);
  for (const e of r.errors)
    process.stdout.write(`    error  line ${e.line}: ${e.message}\n`);
  for (const w of r.warnings)
    process.stdout.write(`    warn   line ${w.line}: ${w.message}\n`);
}

if (missing.length) {
  const label = OPT.requireAll ? "error" : "not drawn yet";
  process.stdout.write(`\n${missing.length} plane(s) ${label}:\n`);
  for (const k of missing) process.stdout.write(`    ${k}.svg\n`);
}

const totalBytes = results.reduce((n, r) => n + (r.scan ? r.scan.bytes : 0), 0);
if (results.length) {
  process.stdout.write(
    `\n${results.length} file(s), ${(totalBytes / 1024).toFixed(1)} KB total` +
      ` (target ${BUDGETS.totalBytesTarget / 1024} KB for the whole journey)\n`,
  );
}
process.stdout.write(`${errorCount} error(s), ${warningCount} warning(s)\n`);

process.exit(failed ? 1 : 0);
