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

    /**
     * `{% linkbutton href="/contact/" text="Get in touch" /%}`
     *
     * How content reaches Grove. Renders a real anchor with a `gv-button` inside, so the link
     * still works with JavaScript off and stays a single tab stop.
     */
    linkbutton: {
      render: component("./src/components/grove/LinkButton.astro"),
      attributes: {
        href: { type: String, required: true },
        text: { type: String, required: true },
        variant: { type: String, default: "filled" },
        color: { type: String, default: "accent" },
        size: { type: String, default: "md" },
      },
    },

    /**
     * `{% notice type="information" heading="…" message="…" /%}`
     *
     * Attributes rather than children, because `gv-feedback-strip` takes strings and projects
     * nothing — a child would vanish on upgrade.
     */
    notice: {
      render: component("./src/components/grove/Notice.astro"),
      attributes: {
        type: {
          type: String,
          default: "information",
          matches: ["information", "success", "danger"],
        },
        heading: { type: String, required: true },
        message: { type: String, required: true },
      },
    },
  },
});
