/**
 * The journey art contract.
 *
 * This file is the single source of truth for what a scenery SVG must look like. The checker
 * (`scripts/check-art.mjs`), the drawing brief (`src/assets/journey/README.md`) and the runtime
 * loader (`src/components/journey/SceneArt.astro`) all read from here, so the rules cannot drift
 * apart from each other.
 *
 * Zero dependencies, plain ESM — it is imported by Node scripts and by Astro alike.
 */

/** Artboard geometry. The stage is what a visitor sees; the bleed absorbs scale and drift. */
export const GEOMETRY = {
  stage: { width: 1600, height: 900 },
  /** 400/225 of bleed on every side: covers the 0.88 dissolve scale, plane drift and 21:9. */
  artboard: { width: 2400, height: 1350 },
  bleed: { x: 400, y: 225 },
  /** Content must stay clear of these, measured from the artboard centre. */
  safe: {
    desktop: { width: 1200, height: 900 },
    phone: { width: 420, height: 900 },
  },
  /** The trail rail floats over the right edge; leave it room. */
  railClearance: 180,
};

/** The three parallax planes, slowest to fastest. Order matters: it is the paint order. */
export const PLANES = ["sky", "mid", "near"];

/**
 * Parallax factors live with the contract so the styled phase cannot invent its own.
 * @type {Record<string, number>}
 */
export const PLANE_FACTORS = { sky: 0.15, mid: 0.45, near: 1.0 };

/**
 * How each plane is anchored when the viewport crops it.
 *
 * Phones re-crop the same art rather than shipping a second set, so the planes must survive being
 * anchored independently: sky holds to the top, near holds to the ground, mid splits the
 * difference. This is why only deliberately registered pairs (gate trees to path) may rely on exact
 * cross-plane alignment.
 * @type {Record<string, string>}
 */
export const PLANE_ANCHORS = {
  sky: "xMidYMin slice",
  mid: "xMidYMid slice",
  near: "xMidYMax slice",
};

/**
 * What one plane must contain.
 * @typedef {{ ids: string[], series: Array<{ prefix: string, min: number }> }} PlaneRequirement
 */

/**
 * One scene: its canon name, its Grove surface, and its three planes. `width` is present only on
 * panoramas.
 * @typedef {{
 *   title: string,
 *   surface: string,
 *   width?: Record<string, number>,
 *   planes: Record<string, PlaneRequirement>
 * }} SceneDefinition
 */

/**
 * Per-scene requirements.
 *
 * `ids` are exact layer names that must exist. `series` are numbered groups: `{ prefix, min }`
 * requires `prefix-01` … at least `min`, contiguous from 01.
 *
 * `width` overrides the artboard width for panoramas (The Quarters traverses horizontally, so each
 * plane is a different width, registered at the left edge).
 *
 * @type {Record<string, SceneDefinition>}
 */
export const SCENES = {
  entrance: {
    title: "The Entrance",
    surface: "ground",
    planes: {
      sky: { ids: [], series: [] },
      mid: { ids: ["gate-tree-left", "gate-tree-right"], series: [] },
      near: { ids: [], series: [] },
    },
  },
  commons: {
    title: "Common Grounds",
    surface: "brand-terrace",
    planes: {
      sky: { ids: [], series: [] },
      mid: { ids: [], series: [] },
      near: { ids: [], series: [{ prefix: "stump", min: 3 }] },
    },
  },
  quarters: {
    title: "The Quarters",
    surface: "brand-summit",
    /** Panorama: registered at the left edge, one width per plane. */
    width: { sky: 2880, mid: 3840, near: 5600 },
    planes: {
      sky: { ids: [], series: [{ prefix: "light-shaft", min: 2 }] },
      mid: { ids: [], series: [{ prefix: "door", min: 3 }] },
      near: { ids: [], series: [] },
    },
  },
  kitchen: {
    title: "The Kitchen",
    surface: "accent-terrace",
    planes: {
      sky: { ids: [], series: [] },
      mid: { ids: ["steam-curve"], series: [{ prefix: "flame", min: 3 }] },
      near: { ids: [], series: [] },
    },
  },
  fire: {
    title: "The Fire Circle",
    surface: "brand-aurora",
    planes: {
      sky: { ids: [], series: [] },
      mid: { ids: [], series: [] },
      near: {
        ids: [],
        series: [
          { prefix: "fire-ring", min: 5 },
          { prefix: "flame", min: 3 },
          { prefix: "ember", min: 6 },
        ],
      },
    },
  },
  edge: {
    title: "The Grove's Edge",
    surface: "ground",
    planes: {
      sky: { ids: [], series: [] },
      mid: { ids: ["messenger"], series: [] },
      near: { ids: ["edge-stone"], series: [] },
    },
  },
};

/**
 * Standalone art that is not a three-plane scene.
 * @type {Record<string, PlaneRequirement>}
 */
export const SINGLETONS = {
  "rail/trail": { ids: ["trail-path"], series: [] },
};

/**
 * Ids that carry motion. These must be open strokes — `fill="none"`, a real `stroke`, no dash
 * array — because the styled phase draws or follows them.
 */
export const STROKE_IDS = [
  /^trail-path$/,
  /^steam-curve$/,
  /^fire-ring-\d{2}$/,
];

/**
 * Elements that must never appear.
 *
 * `text` and `image` are banned because copy is live HTML (i18n + a11y) and raster breaks the flat
 * vector look. The rest either defeat the parallax compositing, cannot be recoloured by token, or
 * (in the case of `style`) let art smuggle in CSS the app cannot see.
 */
export const BANNED_ELEMENTS = [
  "text",
  "tspan",
  "textPath",
  "image",
  "style",
  "use",
  "symbol",
  "filter",
  "mask",
  "pattern",
  "foreignObject",
  "script",
  "animate",
  "animateTransform",
  "animateMotion",
  "set",
];

/** Attributes that must never appear on any element. */
export const BANNED_ATTRIBUTES = ["style", "filter", "mask", "clip-path"];

/** Per-plane budgets. Exceeding these is an error, not a warning — the journey loads six scenes. */
export const BUDGETS = {
  maxBytes: 30 * 1024,
  maxElements: 300,
  /** Advisory: the whole journey should land near this. Reported, never fatal. */
  totalBytesTarget: 300 * 1024,
};

/** Figma export settings the contract depends on. Surfaced in the brief and in error messages. */
export const EXPORT_SETTINGS = {
  includeIdAttribute: true,
  simplifyStroke: false,
  colorProfile: "sRGB",
};

/** `-NN` series must start at 01 and be contiguous. */
export const SERIES_PATTERN = /^(.*)-(\d{2})$/;

/** Every scene/plane pair the journey expects, as flat `scene/plane` keys. */
export function allPlaneKeys() {
  const keys = [];
  for (const scene of Object.keys(SCENES)) {
    for (const plane of PLANES) keys.push(`${scene}/${plane}`);
  }
  for (const key of Object.keys(SINGLETONS)) keys.push(key);
  return keys;
}

/** The expected artboard width for a scene/plane (panoramas override). */
export function expectedWidth(scene, plane) {
  const def = SCENES[scene];
  if (def && def.width && def.width[plane]) return def.width[plane];
  return GEOMETRY.artboard.width;
}

/** The expected artboard height. Uniform today; a function so panoramas can diverge later. */
export function expectedHeight() {
  return GEOMETRY.artboard.height;
}

/** Requirements for one scene/plane, or for a singleton key. */
export function requirementsFor(key) {
  if (SINGLETONS[key]) return SINGLETONS[key];
  const [scene, plane] = key.split("/");
  const def = SCENES[scene];
  if (!def || !def.planes[plane]) return null;
  return def.planes[plane];
}

/** True when an id is required to be an open stroke. */
export function isStrokeId(id) {
  return STROKE_IDS.some((re) => re.test(id));
}
