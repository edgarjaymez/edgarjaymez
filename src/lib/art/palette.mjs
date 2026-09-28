/**
 * The palette half of the art contract.
 *
 * Grove's `tokens.css` contains **no hex at all** — every colour is `oklch()`. Figma cannot consume
 * that, and the art must be drawn from Grove's primitives and nothing else, so this module converts
 * the installed tokens to sRGB hex and exposes them as the only legal palette.
 *
 * The conversion is Björn Ottosson's OKLab matrices followed by the sRGB transfer function. It is
 * done here rather than pulled from a library so the checker keeps its zero-dependency promise, and
 * it is verified against a known value in the test below (`brand-500` → `#416943`, which is already
 * the site's `theme-color`).
 *
 * The installed package is the source of truth, never grove-lit's checked-out source — the app and
 * the design system are routinely on different versions.
 */

/** Where the installed tokens live, relative to the repo root. */
export const TOKENS_PATH =
  "node_modules/@edgarjaymez/grove/dist/tokens/tokens.css";

/** Primitive colour declarations: `--color-brand-500: oklch(48% 0.075 145);` */
const PRIMITIVE_RE = /--color-([a-z]+)-(\d{2,3})\s*:\s*(oklch\([^)]*\))/g;

/** Base surface primitives: `--color-base-light`, `--color-base-dark`. */
const BASE_RE = /--color-base-(light|dark)\s*:\s*(oklch\([^)]*\))/g;

/** `oklch(48% 0.075 145)` / `oklch(0.48 0.075 145deg)` → `{ l, c, h }` with l in 0..1. */
export function parseOklch(value) {
  const inner = value
    .replace(/^oklch\(/i, "")
    .replace(/\)$/, "")
    .trim();
  // Alpha is not used by any primitive; split it off if present.
  const [coords] = inner.split("/");
  const parts = coords
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;

  const rawL = parts[0];
  const l = rawL.endsWith("%") ? parseFloat(rawL) / 100 : parseFloat(rawL);
  const c = parseFloat(parts[1]);
  const h = parseFloat(parts[2]);
  if (![l, c, h].every(Number.isFinite)) return null;
  return { l, c, h };
}

/** OKLCH → linear sRGB. Returns channels that may fall outside 0..1 when out of gamut. */
export function oklchToLinearSrgb({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  return {
    r: 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    g: -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    b: -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  };
}

/** Linear light → sRGB, the standard piecewise transfer function. */
function encodeSrgbChannel(x) {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

function toByte(x) {
  return Math.max(0, Math.min(255, Math.round(x * 255)));
}

/**
 * OKLCH → `#rrggbb`.
 *
 * Out-of-gamut colours are clipped per channel and flagged, so the swatch sheet can say so rather
 * than silently shipping a colour Figma will not reproduce.
 */
export function oklchToHex(oklch) {
  const lin = oklchToLinearSrgb(oklch);
  const clipped =
    lin.r < -1e-6 ||
    lin.r > 1 + 1e-6 ||
    lin.g < -1e-6 ||
    lin.g > 1 + 1e-6 ||
    lin.b < -1e-6 ||
    lin.b > 1 + 1e-6;
  const r = toByte(encodeSrgbChannel(Math.max(0, Math.min(1, lin.r))));
  const g = toByte(encodeSrgbChannel(Math.max(0, Math.min(1, lin.g))));
  const b = toByte(encodeSrgbChannel(Math.max(0, Math.min(1, lin.b))));
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  return { hex, clipped };
}

/**
 * Extract every primitive from a `tokens.css` source.
 *
 * `tokens.css` declares each token several times: once in the opening `:root` (the **sRGB
 * baseline**), then again in nested `:root` blocks carrying wide-gamut variants with higher chroma,
 * and again per `[data-theme]`. The **first** declaration wins here, because the art is flat SVG
 * exported as sRGB and committed with literal hex — a P3 value would not survive the round trip.
 *
 * Alternates are not discarded, only demoted: a token with more than one distinct rendering is
 * marked `variants`, so the swatch sheet can say "this one shifts on a wide-gamut display" instead
 * of pretending the hex is the whole truth. At inline time the hex becomes the *fallback* inside
 * `var(--color-…, #hex)`, so the live page still resolves the real token per mode and gamut.
 *
 * @returns {{ palette: Array<{name,family,step,oklch,hex,clipped,variants}>, conflicts: Array<{name,values}> }}
 */
export function extractPalette(cssSource) {
  const byName = new Map();

  const add = (name, family, step, raw) => {
    const parsed = parseOklch(raw);
    if (!parsed) return;
    const { hex, clipped } = oklchToHex(parsed);
    if (!byName.has(name))
      byName.set(name, { name, family, step, values: new Map() });
    // Map preserves insertion order, so the first declaration stays first.
    const values = byName.get(name).values;
    if (!values.has(hex)) values.set(hex, { oklch: raw, hex, clipped });
  };

  let m;
  PRIMITIVE_RE.lastIndex = 0;
  while ((m = PRIMITIVE_RE.exec(cssSource)) !== null) {
    add(`color-${m[1]}-${m[2]}`, m[1], Number(m[2]), m[3]);
  }
  BASE_RE.lastIndex = 0;
  while ((m = BASE_RE.exec(cssSource)) !== null) {
    add(`color-base-${m[1]}`, "base", m[1], m[2]);
  }

  const palette = [];
  const conflicts = [];
  for (const entry of byName.values()) {
    const distinct = [...entry.values.values()];
    const primary = distinct[0];
    if (distinct.length > 1) {
      conflicts.push({ name: entry.name, values: distinct.map((v) => v.hex) });
    }
    palette.push({
      name: entry.name,
      family: entry.family,
      step: entry.step,
      oklch: primary.oklch,
      hex: primary.hex,
      clipped: primary.clipped,
      variants: distinct.length > 1 ? distinct.slice(1).map((v) => v.hex) : [],
    });
  }

  palette.sort((a, b) => {
    if (a.family !== b.family) return a.family < b.family ? -1 : 1;
    return String(a.step).localeCompare(String(b.step), undefined, {
      numeric: true,
    });
  });

  return { palette, conflicts };
}

/** A hex → token-name lookup, for turning art colours back into token references. */
export function hexIndex(palette) {
  const index = new Map();
  for (const entry of palette) {
    if (!index.has(entry.hex)) index.set(entry.hex, []);
    index.get(entry.hex).push(entry.name);
  }
  return index;
}

/**
 * Self-test: the conversion must reproduce a value we already know independently.
 * `--color-brand-500` is `oklch(48% 0.075 145)` and the site ships `theme-color="#416943"`.
 */
export function selfTest() {
  const { hex } = oklchToHex(parseOklch("oklch(48% 0.075 145)"));
  return { expected: "#416943", actual: hex, pass: hex === "#416943" };
}
