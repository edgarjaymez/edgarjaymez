/**
 * A small, dependency-free SVG scanner.
 *
 * This is deliberately NOT a general XML parser. It walks tags well enough to answer the questions
 * the art contract asks — which elements exist, what ids and attributes they carry, how many there
 * are — and it reports anything it cannot make sense of rather than guessing. Figma's exporter emits
 * a narrow, predictable subset of SVG, so a full parser would be weight without benefit.
 *
 * Everything it returns carries a 1-based `line` so the checker can point at the problem.
 */

/** Matches a whole tag: `<name ...>`, `</name>` or `<name ... />`. */
const TAG_RE = /<\/?([A-Za-z_][\w.:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;

/** Matches one `name="value"` / `name='value'` / bare `name` attribute. */
const ATTR_RE = /([A-Za-z_:][\w.:-]*)\s*(?:=\s*("([^"]*)"|'([^']*)'))?/g;

/** Regions whose contents must be skipped wholesale. */
const SKIP_REGIONS = [
  { open: "<!--", close: "-->" },
  { open: "<![CDATA[", close: "]]>" },
  { open: "<?", close: "?>" },
  { open: "<!DOCTYPE", close: ">" },
];

/** Build an index that maps a character offset to a 1-based line number. */
function lineIndexer(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") starts.push(i + 1);
  }
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * Blank out comments, CDATA, processing instructions and doctypes, preserving newlines so line
 * numbers stay accurate. Returns the masked source.
 */
function maskSkipRegions(source) {
  let out = source;
  for (const { open, close } of SKIP_REGIONS) {
    let from = 0;
    for (;;) {
      const start = out.indexOf(open, from);
      if (start === -1) break;
      let end = out.indexOf(close, start + open.length);
      end = end === -1 ? out.length : end + close.length;
      const slice = out.slice(start, end);
      const blanked = slice.replace(/[^\n]/g, " ");
      out = out.slice(0, start) + blanked + out.slice(end);
      from = end;
    }
  }
  return out;
}

/** Parse an attribute string into a plain object. Later duplicates win, as browsers do. */
function parseAttributes(raw) {
  const attrs = {};
  if (!raw) return attrs;
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    if (!m[1]) continue;
    const value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : "";
    attrs[m[1]] = value;
  }
  return attrs;
}

/**
 * Scan an SVG source string.
 *
 * @param {string} source
 * @returns {{
 *   ok: boolean,
 *   root: { tag: string, attrs: Record<string,string>, line: number } | null,
 *   elements: Array<{ tag: string, attrs: Record<string,string>, line: number, closing: boolean }>,
 *   elementCount: number,
 *   ids: Array<{ id: string, tag: string, line: number }>,
 *   duplicateIds: Array<{ id: string, lines: number[] }>,
 *   bytes: number,
 *   problems: Array<{ code: string, message: string, line: number }>
 * }}
 */
export function scanSvg(source) {
  const problems = [];
  const lineAt = lineIndexer(source);
  const masked = maskSkipRegions(source);

  const elements = [];
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(masked)) !== null) {
    const whole = m[0];
    const closing = whole.startsWith("</");
    const tag = m[1];
    const attrs = closing ? {} : parseAttributes(m[2]);
    elements.push({ tag, attrs, line: lineAt(m.index), closing });
  }

  const open = elements.filter((e) => !e.closing);
  const root = open.length ? open[0] : null;

  if (!root) {
    problems.push({
      code: "no-root",
      message: "No SVG element found in the file.",
      line: 1,
    });
  } else if (root.tag !== "svg") {
    problems.push({
      code: "bad-root",
      message: `Root element is <${root.tag}>, expected <svg>.`,
      line: root.line,
    });
  }

  // Ids, and duplicates among them.
  const ids = [];
  const seen = new Map();
  for (const el of open) {
    const id = el.attrs.id;
    if (!id) continue;
    ids.push({ id, tag: el.tag, line: el.line });
    if (!seen.has(id)) seen.set(id, []);
    seen.get(id).push(el.line);
  }
  const duplicateIds = [];
  for (const [id, lines] of seen) {
    if (lines.length > 1) duplicateIds.push({ id, lines });
  }

  return {
    ok: problems.length === 0,
    root,
    elements,
    // The root itself is structure, not content — budgets count what is drawn inside it.
    elementCount: Math.max(0, open.length - 1),
    ids,
    duplicateIds,
    bytes: Buffer.byteLength(source, "utf8"),
    problems,
  };
}

/** Parse a `viewBox` into numbers, or null when absent/malformed. */
export function parseViewBox(value) {
  if (!value) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minX, minY, width, height] = parts;
  return { minX, minY, width, height };
}

/** Collect every colour literal an SVG paints with, as lowercase 6-digit hex where possible. */
export function collectColors(scan) {
  const found = new Map();
  const paintAttrs = [
    "fill",
    "stroke",
    "stop-color",
    "flood-color",
    "lighting-color",
  ];
  for (const el of scan.elements) {
    if (el.closing) continue;
    for (const attr of paintAttrs) {
      const raw = el.attrs[attr];
      if (!raw) continue;
      const value = raw.trim().toLowerCase();
      if (
        !value ||
        value === "none" ||
        value === "currentcolor" ||
        value === "transparent"
      )
        continue;
      const hex = normalizeHex(value);
      const key = hex || value;
      if (!found.has(key)) found.set(key, []);
      found.get(key).push({ attr, tag: el.tag, line: el.line, raw: value });
    }
  }
  return found;
}

/** `#abc` → `#aabbcc`; passes through 6-digit hex; returns null for anything else. */
export function normalizeHex(value) {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v))
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return null;
}
