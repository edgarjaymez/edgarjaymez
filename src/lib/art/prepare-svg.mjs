/**
 * Inline-time preparation of a scenery SVG.
 *
 * What is committed is the **raw Figma export**, unedited — so redrawing a scene is a re-export,
 * never a merge. Everything the page needs is applied here, at build time, on the way into the
 * document.
 *
 * Four jobs:
 *
 * 1. **Namespace the ids.** The journey inlines nineteen SVGs into one document, and the contract
 *    deliberately reuses layer names across scenes — `flame-01` exists in both The Kitchen and The
 *    Fire Circle. Inlined as-is that is a duplicate id, and every `#flame-01` selector silently
 *    binds to whichever came first. Ids become `<scene>-<plane>-<id>`, and the original is kept on
 *    `data-art-id`, which is the stable handle the styled phase should select on.
 * 2. **Turn hex into token references.** `fill="#416943"` becomes
 *    `fill="var(--color-brand-500, #416943)"`, so art follows theme and gamut at runtime while the
 *    committed file stays a plain, Figma-openable export.
 * 3. **Make it a decoration.** `aria-hidden`, `focusable="false"`, and no `width`/`height` on the
 *    root so CSS owns the box.
 * 4. **Anchor it.** `preserveAspectRatio` per the plane's anchor, so a phone crop keeps sky at the
 *    top and ground at the bottom.
 */

import { PLANE_ANCHORS } from "./contract.mjs";
import { normalizeHex } from "./svg-scan.mjs";

/** Strip the XML prolog, doctype and comments — none of them survive usefully inline. */
function stripProlog(source) {
  return source
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

/** Replace one attribute on the root `<svg …>` tag, adding it when absent. */
function setRootAttr(svg, name, value) {
  const rootMatch = svg.match(/<svg\b[^>]*>/);
  if (!rootMatch) return svg;
  const root = rootMatch[0];
  const attrRe = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`, "i");
  const replacement = ` ${name}="${value}"`;
  const next = attrRe.test(root)
    ? root.replace(attrRe, replacement)
    : root.replace(/<svg\b/i, `<svg${replacement}`);
  return svg.replace(root, next);
}

/** Remove an attribute from the root `<svg …>` tag. */
function removeRootAttr(svg, name) {
  const rootMatch = svg.match(/<svg\b[^>]*>/);
  if (!rootMatch) return svg;
  const root = rootMatch[0];
  const next = root.replace(
    new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`, "ig"),
    "",
  );
  return svg.replace(root, next);
}

/**
 * Rewrite every `id="…"` to a namespaced form and record the original on `data-art-id`.
 * Also rewrites same-document references (`url(#id)`, `href="#id"`) so nothing dangles.
 */
function namespaceIds(svg, prefix) {
  const originals = new Set();
  const idRe = /\sid\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = idRe.exec(svg)) !== null) originals.add(m[1]);
  if (originals.size === 0) return svg;

  let out = svg.replace(
    /\sid\s*=\s*"([^"]*)"/g,
    (_all, id) => ` id="${prefix}-${id}" data-art-id="${id}"`,
  );

  for (const id of originals) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(`url\\(#${escaped}\\)`, "g"),
      `url(#${prefix}-${id})`,
    );
    out = out.replace(
      new RegExp(`(href\\s*=\\s*")#${escaped}(")`, "g"),
      `$1#${prefix}-${id}$2`,
    );
  }
  return out;
}

/** Swap literal hex paint values for `var(--token, #hex)`. Unknown colours are left untouched. */
function tokenizeColors(svg, hexToToken) {
  return svg.replace(
    /\b(fill|stroke|stop-color|flood-color|lighting-color)\s*=\s*"([^"]*)"/g,
    (all, attr, value) => {
      const hex = normalizeHex(value);
      if (!hex) return all;
      const names = hexToToken.get(hex);
      if (!names || names.length === 0) return all;
      return `${attr}="var(--${names[0]}, ${hex})"`;
    },
  );
}

/**
 * Prepare one scenery SVG for inlining.
 *
 * @param {string} source raw Figma export
 * @param {{ scene: string, plane: string, hexToToken?: Map<string,string[]> }} options
 * @returns {string}
 */
export function prepareSvg(source, { scene, plane, hexToToken }) {
  let svg = stripProlog(source);

  svg = namespaceIds(svg, `${scene}-${plane}`);
  if (hexToToken && hexToToken.size) svg = tokenizeColors(svg, hexToToken);

  // The wrapper owns the box; the SVG fills it.
  svg = removeRootAttr(svg, "width");
  svg = removeRootAttr(svg, "height");
  svg = setRootAttr(
    svg,
    "preserveAspectRatio",
    PLANE_ANCHORS[plane] || "xMidYMid slice",
  );
  svg = setRootAttr(svg, "aria-hidden", "true");
  svg = setRootAttr(svg, "focusable", "false");

  return svg;
}
