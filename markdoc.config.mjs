import { defineMarkdocConfig, component, nodes } from "@astrojs/markdoc/config";

/**
 * Markdoc configuration.
 *
 * Two things worth knowing before editing this file:
 *
 * 1. **Only a node or tag literally named `image` gets its `src` resolved and optimized.** The
 *    integration special-cases that name. A tag called `figure` or `photo` receives the raw string
 *    and ships an unoptimized, unresolved path. That is why the figure below is the `image` *node*
 *    plus an `image` *tag* rendering the same component, rather than a nicely named `figure` tag.
 *
 * 2. **`allowHTML` stays off.** With it on, raw HTML in a body bypasses this config entirely — no
 *    image optimization, no component mapping, and content could inject markup the app never sees.
 *    Anything richer than Markdown reaches the page through a tag declared here.
 *
 * Tag names are single words. The `{% name %}` syntax does not accept a hyphen.
 */
export default defineMarkdocConfig({
  nodes: {
    // Markdown `![alt](./cover.png)` — the standard path, optimized.
    image: {
      ...nodes.image,
      render: component("./src/components/markdoc/Figure.astro"),
    },
    // Keep Astro's defaults for headings so anchors and levels behave.
    heading: nodes.heading,
    document: { ...nodes.document, render: undefined },
  },

  tags: {
    /**
     * `{% image src="./shot.png" alt="…" caption="…" /%}`
     *
     * Named `image` on purpose — see note 1. The caption is what this adds over the plain
     * Markdown form.
     */
    image: {
      render: component("./src/components/markdoc/Figure.astro"),
      attributes: {
        src: { type: String, required: true },
        alt: { type: String, required: true },
        caption: { type: String },
      },
    },

    // The Grove-backed tags — `{% linkbutton %}` and `{% notice %}` — land with the Grove wrapper
    // components in the layout-shell branch. Declaring them here before those components exist
    // would break the build, and a tag that renders a missing component is worse than no tag.
  },
});
