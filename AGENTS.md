# AGENTS.md — Grove Design System Reference

This file is the authoritative guide for AI agents working on this project. It covers every Grove component available from `@edgarjaymez/grove`, with props, variants, usage patterns, and selection guidance sourced directly from the component metadata.

---

## Setup

```astro
---
// Astro frontmatter — drives SSR Declarative Shadow DOM at build time
import "@edgarjaymez/grove";
---

<head>
  <!-- Inline script — bundles Grove JS for the browser -->
  <script>
    import "@edgarjaymez/grove";
  </script>
</head>
```

**CSS** (already imported in `BaseHead.astro` — do not re-import):
- `@edgarjaymez/grove/tokens.css` — CSS custom properties for all design tokens
- `@edgarjaymez/grove/fonts.css` — Inclusive Sans, Phosphor icons, Cakra Display

Both imports are required for components to render correctly.

---

## Component Overview

| Tag | Description | Required props | Priority |
|-----|-------------|---------------|----------|
| `gv-button` | Primary action button with icon support | `text` | high |
| `gv-icon` | Phosphor icon via icon font | `unicode` | high |
| `gv-icon-button` | Icon-only action button | `icon`, `aria-label` | high |
| `gv-text-input` | Single-line text field | _(none)_ | high |
| `gv-checkbox` | Binary checked/unchecked toggle | _(none)_ | high |
| `gv-isotype` | Brand logo mark (SVG) | `color`, `size`, `tone` | medium |
| `gv-texture` | Decorative noise grain overlay | _(none)_ | low |
| `gv-todo-category-toggler` | Color-coded category filter toggle | `category`, `count` | medium |

---

## `gv-button`

Primary interactive element for triggering actions.

### Props

| Prop | Attribute | Type | Default | Options |
|------|-----------|------|---------|---------|
| `text` | `text` | string | `''` | Any string — required |
| `variant` | `variant` | string | `'filled'` | `filled` · `tonal` · `outlined` · `ghost` |
| `color` | `color` | string | `'accent'` | `accent` · `gray` |
| `size` | `size` | string | `'md'` | `lg` · `md` · `sm` |
| `icon` | `icon` | string | — | Phosphor unicode character |
| `type` | `type` | string | `'button'` | `button` · `submit` · `reset` |
| `disabled` | `disabled` | boolean | `false` | — |
| `ariaLabel` | `aria-label` | string | — | Required when icon is the sole label |

### Variants

**Style** — controls visual prominence:
- `filled` — Highest prominence with shadow. Use for the main CTA in a section.
- `tonal` — Medium prominence on terrace surface. Use for secondary actions that still need weight.
- `outlined` — Low prominence with border. Use for cancel or alternative actions.
- `ghost` — Minimal weight, no border or fill until hover. Use for tertiary or in-context actions.

**Color:**
- `accent` — Brand emphasis. Default. Use when this is the primary action.
- `gray` — Neutral. Use for utility actions that should not compete with an accent button nearby.

**Size:**
- `lg` — Standalone page-level CTAs with generous tap target.
- `md` — Default for forms, cards, modals, grouped action rows.
- `sm` — Compact: table rows, inline controls.

### Common patterns

```html
<!-- Page-level CTA -->
<gv-button text="Get Started" variant="filled" color="accent" size="lg"></gv-button>

<!-- Form submit -->
<gv-button text="Save changes" variant="filled" color="accent" size="md"></gv-button>

<!-- Secondary action -->
<gv-button text="Learn more" variant="tonal" color="accent" size="md"></gv-button>

<!-- Cancel / dismiss -->
<gv-button text="Cancel" variant="outlined" color="gray" size="md"></gv-button>

<!-- Tertiary / ghost -->
<gv-button text="View details" variant="ghost" color="gray" size="sm"></gv-button>

<!-- With leading icon -->
<gv-button text="Add item" icon="➕" variant="filled" color="accent" size="md"></gv-button>
```

### Navigation link pattern (Astro)

`gv-button` renders a `<button>` element — wrap with `<a>` for navigation:

```astro
<a href={translatePath("/contact")}>
  <gv-button text="Get in touch" variant="filled" color="accent" size="lg"></gv-button>
</a>
```

### Anti-patterns

- **Multiple filled buttons in one section** — Filled is the highest-prominence style. Use one filled + tonal/outlined for others.
- **Button for navigation** — Buttons trigger actions; links navigate. Use `<a>` for routes.
- **Long text labels** — Keep to 1–4 words (e.g. "Save", "Get started").
- **Ghost for a primary action** — Ghost has minimal affordance; reserve for tertiary.

### Composition

Nested: `gv-icon` (injected automatically via `icon` prop).
Common partners: `gv-icon-button`, `gv-text-input`, form, card, modal.

---

## `gv-icon`

Phosphor icon rendered via icon font. Uses `color: inherit` — color is set on the parent.

### Props

| Prop | Attribute | Type | Default |
|------|-----------|------|---------|
| `unicode` | `unicode` | string | — (required) |
| `isFilled` | `is-filled` | boolean | `false` |
| `fillInHover` | `fill-in-hover` | boolean | `false` |

### Common patterns

```html
<!-- Regular (outlined) -->
<gv-icon unicode=""></gv-icon>

<!-- Filled (active/selected state) -->
<gv-icon unicode="" is-filled></gv-icon>

<!-- Fills on hover (interactive affordance) -->
<gv-icon unicode="" fill-in-hover></gv-icon>
```

### Anti-patterns

- **Setting color directly on `gv-icon`** — Color is inherited from parent. Set color on the parent element.
- **`is-filled` + `fill-in-hover` together** — `is-filled` renders fill unconditionally; `fill-in-hover` is redundant.

### Composition

Do not add meaningful text alternatives to the icon itself — label the interactive parent (button, link) instead.

---

## `gv-icon-button`

Icon-only button. `aria-label` is mandatory — there is no visible text.

### Props

| Prop | Attribute | Type | Default | Options |
|------|-----------|------|---------|---------|
| `icon` | `icon` | string | — (required) | Phosphor unicode character |
| `variant` | `variant` | string | `'filled'` | `filled` · `tonal` · `outlined` · `ghost` |
| `color` | `color` | string | `'accent'` | `accent` · `gray` |
| `size` | `size` | string | `'lg'` | `lg` · `md` · `sm` |
| `disabled` | `disabled` | boolean | `false` | — |
| `ariaLabel` | `aria-label` | string | — | **Required** |

### Common patterns

```html
<!-- Toolbar action -->
<gv-icon-button icon="" size="sm" variant="ghost" color="gray" aria-label="Underline text"></gv-icon-button>

<!-- Modal close -->
<gv-icon-button icon="" size="md" variant="ghost" color="gray" aria-label="Close"></gv-icon-button>

<!-- Primary icon CTA -->
<gv-icon-button icon="" size="lg" variant="filled" color="accent" aria-label="Add item"></gv-icon-button>
```

### Anti-patterns

- **Omitting `aria-label`** — Icon-only buttons have no visible text. Always provide a descriptive label.
- **Using for navigation** — Use `<a>` for page routes.
- **When text would clarify** — If the action is ambiguous, use `gv-button` with an icon + text label instead.

---

## `gv-text-input`

Single-line text field with underline styling. Always pair with a `<label>`.

### Props

| Prop | Attribute | Type | Default | Options |
|------|-----------|------|---------|---------|
| `inputId` | `input-id` | string | — | Use this (not `id`) for `<label for>` association |
| `name` | `name` | string | — | For form submission |
| `type` | `type` | string | `'text'` | `text` · `email` · `password` · `search` · `tel` · `url` · `number` |
| `placeholder` | `placeholder` | string | — | — |
| `value` | `value` | string | — | — |
| `color` | `color` | string | `'brand'` | `brand` · `gray` |
| `error` | `error` | boolean | `false` | — |
| `disabled` | `disabled` | boolean | `false` | — |
| `ariaLabel` | `aria-label` | string | — | Alternative to `<label>` |
| `ariaDescribedby` | `aria-describedby` | string | — | Link to error message element |

### Variants

**Color:**
- `brand` — Warm brand surface. Default for most forms on ground/neutral surfaces.
- `gray` — Neutral. Use when the parent background is brand-colored or warmth is excessive.

### Common patterns

```html
<!-- Labeled form field (preferred) -->
<label for="name-input">Full name</label>
<gv-text-input input-id="name-input" placeholder="Jane Smith"></gv-text-input>

<!-- Email field -->
<label for="email-input">Email</label>
<gv-text-input input-id="email-input" type="email" placeholder="you@example.com" color="brand"></gv-text-input>

<!-- Error state with linked message -->
<label for="email-err">Email</label>
<gv-text-input input-id="email-err" error aria-describedby="email-error"></gv-text-input>
<span id="email-error">Enter a valid email address</span>

<!-- Neutral track -->
<gv-text-input color="gray" placeholder="Search…"></gv-text-input>
```

### Anti-patterns

- **No label** — Screen readers can't identify the field. Always use `<label for>` + `input-id`, or `aria-label`.
- **Multi-line content** — `gv-text-input` is single-line only. Use a native `<textarea>` for multi-line entry.
- **`error` + `disabled` simultaneously** — Disabled fields can't be corrected; an error state is misleading.
- **Fixed width on the component** — It defaults to `width: 100%`. Constrain width on the parent container.

### Events

```js
el.addEventListener('input', (e) => console.log(e.detail)); // fires on every keystroke
el.addEventListener('change', (e) => console.log(e.detail)); // fires on blur
```

---

## `gv-checkbox`

Binary checked/unchecked toggle. Always pair with a `<label>`.

### Props

| Prop | Attribute | Type | Default | Options |
|------|-----------|------|---------|---------|
| `checked` | `checked` | boolean | `false` | — |
| `responsive` | `responsive` | string | `'default'` | `default` (24px) · `xl` (28px) |
| `disabled` | `disabled` | boolean | `false` | — |

### Common patterns

```html
<!-- Labeled form checkbox -->
<label style="display:flex; align-items:center; gap:8px">
  <gv-checkbox id="agree"></gv-checkbox>
  <span>I agree to the terms and conditions</span>
</label>

<!-- Larger touch target -->
<gv-checkbox responsive="xl"></gv-checkbox>

<!-- Pre-checked disabled -->
<gv-checkbox checked disabled></gv-checkbox>
```

### Events

```js
el.addEventListener('change', (e) => { isChecked = e.detail; }); // detail: boolean
```

### Anti-patterns

- **No label** — Always pair with `<label>` or `aria-label`.
- **Single on/off setting** — A single toggle is better served by a Switch/Toggle component.

---

## `gv-isotype`

Brand logo mark rendered as an inline SVG. All three props are required.

### Props

| Prop | Attribute | Type | Default | Options |
|------|-----------|------|---------|---------|
| `color` | `color` | string | `'brand'` | `brand` · `accent` · `base` |
| `size` | `size` | number | `40` | Any pixel value |
| `tone` | `tone` | string | `'light'` | `light` · `dark` |
| `label` | `label` | string | — | Provide for standalone logos; omit when decorative |

### Tone rules (critical)

- `tone="light"` — 500-level fills for **light/ground surfaces**
- `tone="dark"` — 50-level fills for **dark surfaces (summit/terrace)**
- Mismatching tone to surface causes low contrast (WCAG failure)

### Common patterns

```html
<!-- Navbar brand mark (light surface) -->
<gv-isotype color="brand" size="40" tone="light" label="Grove"></gv-isotype>

<!-- Hero logo (light surface) -->
<gv-isotype color="brand" size="176" tone="light"></gv-isotype>

<!-- On dark surface -->
<gv-isotype color="brand" size="40" tone="dark"></gv-isotype>

<!-- Neutral/low-emphasis -->
<gv-isotype color="base" size="40" tone="light"></gv-isotype>
```

### Accessibility

- Provide `label` when the isotype is a standalone logo (sets `role="img"` + `aria-label`).
- Omit `label` when decorative or next to a visible wordmark (sets `aria-hidden="true"`).

---

## `gv-texture`

Absolutely positioned SVG noise overlay. Parent **must** have `position: relative` and `overflow: hidden`.

### Props

| Prop | Attribute | Type | Default |
|------|-----------|------|---------|
| `opacity` | `opacity` | number | `1` |

### Common patterns

```html
<!-- On brand summit surface -->
<div style="position: relative; overflow: hidden; background: var(--semantic-color-surface-brand-summit);">
  <gv-texture></gv-texture>
  <!-- content here -->
</div>

<!-- Reduced grain on accent terrace -->
<div style="position: relative; overflow: hidden; background: var(--semantic-color-surface-accent-terrace);">
  <gv-texture opacity="0.4"></gv-texture>
</div>

<!-- Subtle grain on light ground -->
<div style="position: relative; overflow: hidden;">
  <gv-texture opacity="0.25"></gv-texture>
</div>
```

### Anti-patterns

- **Parent without `position: relative`** — Texture escapes its bounds.
- **Full opacity on light surfaces** — Grain is too heavy. Use 0.4 for Accent, ≤0.25 for Ground.

---

## `gv-todo-category-toggler`

Color-coded toggle button for task category filters in dashboards.

### Props

| Prop | Attribute | Type | Default | Options |
|------|-----------|------|---------|---------|
| `category` | `category` | string | — (required) | Category label text |
| `count` | `count` | number | — (required) | Task count to display |
| `color` | `color` | string | `'brand'` | `brand` · `accent` · `information` · `gray` |
| `isSelected` | `is-selected` | boolean | `false` | — |
| `disabled` | `disabled` | boolean | `false` | — |

### Common patterns

```html
<!-- Category filter row -->
<div role="group" aria-label="Filter by category">
  <gv-todo-category-toggler color="brand" category="Design" count="5"></gv-todo-category-toggler>
  <gv-todo-category-toggler color="accent" category="Copy" count="2"></gv-todo-category-toggler>
  <gv-todo-category-toggler color="information" category="Dev" count="8"></gv-todo-category-toggler>
  <gv-todo-category-toggler color="gray" category="Other" count="1"></gv-todo-category-toggler>
</div>

<!-- Pre-selected -->
<gv-todo-category-toggler color="brand" category="Design" count="5" is-selected></gv-todo-category-toggler>
```

### Events

```js
el.addEventListener('toggle', (e) => { isActive = e.detail; }); // detail: boolean
```

### Parent placement

Best on a Ground surface — the component provides its own Terrace elevation. Avoid placing on Terrace or Summit (shadow conflict). Fixed width: 163px; wrap in a flex container with wrapping for narrow viewports.

---

## Composition Patterns

### Button + Icon (leading icon)

The `icon` prop on `gv-button` injects a `gv-icon` automatically. Pass a Phosphor unicode character:

```html
<gv-button text="Download" icon="" variant="filled" color="accent" size="md"></gv-button>
```

On hover, the icon switches from regular to filled weight automatically.

### Form row: TextInput + Button

```html
<form>
  <label for="email">Email</label>
  <gv-text-input input-id="email" name="email" type="email" placeholder="you@example.com"></gv-text-input>

  <label for="message">Message</label>
  <!-- Multi-line: use native textarea, not gv-text-input -->
  <textarea id="message" name="message"></textarea>

  <gv-button text="Send message" variant="filled" color="accent" size="md" type="submit"></gv-button>
</form>
```

### Header: Isotype + navigation

Current pattern used in `BaseLayout.astro`:

```astro
<header>
  <gv-isotype size={40} color="brand" tone="light"></gv-isotype>
  <LanguageSwitcher />
</header>
```

### TextInput with validation

```html
<label for="email-input">Email</label>
<gv-text-input
  input-id="email-input"
  type="email"
  error
  aria-describedby="email-err"
></gv-text-input>
<span id="email-err" role="alert">Enter a valid email address</span>
```

---

## Design Tokens Quick Reference

All tokens are CSS custom properties from `@edgarjaymez/grove/tokens.css`.

### Semantic color surfaces

```css
--semantic-color-surface-brand-terrace
--semantic-color-surface-brand-aurora
--semantic-color-surface-brand-summit
--semantic-color-surface-accent-terrace
--semantic-color-surface-accent-aurora
--semantic-color-surface-accent-summit
--semantic-color-surface-gray-terrace
--semantic-color-surface-gray-aurora
--semantic-color-surface-gray-summit
--semantic-color-surface-ground  /* the page background */
```

### Semantic text colors

```css
--semantic-color-text-on-brand-terrace-base
--semantic-color-text-on-brand-aurora-base
--semantic-color-text-on-brand-summit-base
--semantic-color-text-on-accent-terrace-base
/* pattern: --semantic-color-text-on-{surface}-{level}-{base|subtle} */
```

### Border radius

```css
--border-radius-sm
--border-radius-lg
--border-radius-8xl  /* pill / full-round — used by gv-button */
```

### Spacing (soft grid)

```css
--soft-grid-4   /* 4px  */
--soft-grid-6   /* 6px  */
--soft-grid-8   /* 8px  */
--soft-grid-12  /* 12px */
--soft-grid-16  /* 16px */
--soft-grid-20  /* 20px */
```

### Typography shorthands (font CSS shorthand)

```css
font: var(--typography-single-line-base-base);       /* body text */
font: var(--typography-single-line-subtle-emphasis); /* button md */
font: var(--typography-single-line-label-base);      /* button sm, captions */
```

---

## Accessibility Checklist

- **`gv-text-input`**: Always pair with `<label for="...">` using the `input-id` attribute (not `id`) for correct association. Or provide `aria-label`.
- **`gv-text-input` error state**: Set `error` and link a visible message via `aria-describedby`. `aria-invalid` is set automatically.
- **`gv-icon-button`**: `aria-label` is required on every instance — no visible text exists.
- **`gv-button` icon-only**: If only `icon` is passed with no `text`, set `aria-label`.
- **`gv-isotype`**: Provide `label` only for standalone logos. Omit when decorative or adjacent to text.
- **`gv-checkbox`**: Always wrap in a `<label>` or provide `aria-label` on the parent.
- **`gv-todo-category-toggler` group**: Wrap in `<div role="group" aria-label="Filter by category">`.
- Focus rings are managed globally — never add custom focus styles to Grove components.

---

## What Grove does NOT include

- Multi-line textarea — use native `<textarea>`
- Select / dropdown — use native `<select>` or build a custom component
- Modal / dialog — use native `<dialog>`
- Navigation link — use `<a>` (wrap `gv-button` in `<a>` for styled navigation links)
- Toggle / Switch — use `gv-checkbox` only for multi-select; for single boolean settings, Grove does not yet have a Switch component
