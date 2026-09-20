/** @type {import("prettier").Config} */

// No `overrides` block: prettier-plugin-astro registers `.astro` as a language itself, so the
// astro parser is inferred without help. The previous override used the glob
// `"*.astro, *.svelte"` — a single pattern containing a comma, which Prettier does not split, so
// it matched zero files while reading as though it were doing the work.
export default {
  plugins: ["prettier-plugin-astro"],
};
