# Journey scenery — the drawing brief

Everything the code needs from the art, in one place. The rules here are **enforced**, not advisory:

```sh
node scripts/check-art.mjs            # check what exists
node scripts/check-art.mjs --fix      # apply the lossless repairs, then re-check
node scripts/check-art.mjs --json     # machine-readable
```

`pnpm build` fails on art that breaks the contract, so a bad export cannot reach the site quietly.

The authority is [`src/lib/art/contract.mjs`](../../lib/art/contract.mjs) — this README describes it,
the checker enforces it, and all three read from that one file so they cannot drift apart. If this doc
and the checker ever disagree, the checker is right.

---

## 1. What to deliver

One **Figma Section per scene**, holding three same-size **frames** named `sky`, `mid`, `near`.

> **Frames, not groups.** Groups export at content bounds, so a group exports at a different size
> than its neighbours and the planes stop registering with each other.

Export to:

```
src/assets/journey/
  entrance/{sky,mid,near}.svg
  commons/{sky,mid,near}.svg
  quarters/{sky,mid,near}.svg
  kitchen/{sky,mid,near}.svg
  fire/{sky,mid,near}.svg
  edge/{sky,mid,near}.svg
  rail/trail.svg
```

Nineteen files. Nothing else belongs in this directory — the checker flags strays, because a
`mid copy.svg` that nobody notices is worse than a missing file.

**Draw in any order.** Missing files are not an error until someone runs `--require-all`, so a single
finished scene can be checked, wired and reviewed on its own.

---

## 2. Geometry

|                | size                           | what it is                                                      |
| -------------- | ------------------------------ | --------------------------------------------------------------- |
| **Artboard**   | **2400 × 1350**                | what you draw and export                                        |
| Stage          | 1600 × 900, centred            | what a visitor sees at rest                                     |
| Bleed          | 400 left/right, 225 top/bottom | absorbs the 0.88 dissolve scale, plane drift, and 21:9 monitors |
| `safe-desktop` | central 1200 × 900             | keep clear for copy                                             |
| `safe-phone`   | central 420 × 900              | keep clear for copy                                             |
| Rail clearance | 180 from the right edge        | the trail rail floats here                                      |

**The Quarters is a panorama.** It traverses horizontally, so each plane is a different width,
**registered at the left edge**, height unchanged at 1350:

| plane  | width |
| ------ | ----- |
| `sky`  | 2880  |
| `mid`  | 3840  |
| `near` | 5600  |

Export the **frame**, not the selection — the checker requires `viewBox="0 0 <width> 1350"` with a
`0 0` origin.

---

## 3. Layer names are the animation contract

Layer name → SVG `id` → the handle the motion code holds. Rename a layer and the animation silently
stops finding it, so:

- **kebab-case**, lowercase.
- **Redraw freely. Never rename.**
- Numbered series run `-01`, `-02`, … **contiguous from 01**.
- A Figma `_2` duplicate suffix is an **error** — it means two layers share a name.
- Ids must be unique within a plane. Across planes and scenes, reuse is fine and expected: ids are
  namespaced to `<scene>-<plane>-<id>` at build time, with the original kept on `data-art-id`, which
  is what the motion code selects on.

### Required names

| scene      | plane  | must contain                                                               |
| ---------- | ------ | -------------------------------------------------------------------------- |
| `entrance` | `mid`  | `gate-tree-left`, `gate-tree-right`                                        |
| `commons`  | `near` | `stump-01` … (**≥ 3**)                                                     |
| `quarters` | `sky`  | `light-shaft-01` … (**≥ 2**)                                               |
| `quarters` | `mid`  | `door-01` … (**≥ 3**)                                                      |
| `kitchen`  | `mid`  | `steam-curve`, `flame-01` … (**≥ 3**)                                      |
| `fire`     | `near` | `fire-ring-01` … (**≥ 5**), `flame-01` … (**≥ 3**), `ember-01` … (**≥ 6**) |
| `edge`     | `mid`  | `messenger` (the cacomixtle)                                               |
| `edge`     | `near` | `edge-stone`                                                               |
| `rail`     | —      | `trail-path`                                                               |

Everything else in a plane can be named whatever reads well to you — only the names above are load-bearing.

### Strokes that carry motion

`trail-path`, `steam-curve` and every `fire-ring-NN` are **drawn or followed** by the motion code, so
they must be open strokes:

- `fill="none"` — a filled shape has no path to draw along
- a real stroke colour
- **no dash array** — the dash array is how drawing-on works; yours would be overwritten
- `trail-path` and `steam-curve`: a **single open path**, drawn in the direction of travel

`--fix` can set `fill="none"` and drop a dash array for you, since each has exactly one right answer.

---

## 4. Palette — Grove primitives only

Grove's tokens are **all OKLCH and contain no hex**, which Figma cannot read. So the palette is
generated:

```sh
node scripts/art-palette.mjs
```

- [`../palette/swatches.svg`](../palette/swatches.svg) — labelled sheet, open or import it in Figma
- [`../palette/palette.json`](../palette/palette.json) — the machine-readable list

**68 colours**: 6 families (`brand`, `accent`, `gray`, `success`, `danger`, `information`) × 11 steps,
plus `base-light` and `base-dark`. **Exact matches only** — the checker rejects any other colour and
names the file and line.

Two things the sheet marks:

- **✳ shifts on a wide-gamut display.** 13 tokens also ship a higher-chroma variant. The hex you draw
  with is the sRGB baseline; at build time it becomes the _fallback_ in `var(--token, #hex)`, so the
  live page still resolves the real token per theme and gamut. Draw with the hex and ignore the rest.
- **Out of sRGB.** 13 colours are clipped to fit sRGB. They are still legal; they just render slightly
  duller on screen than Grove intends.

**Flat fills.** Gradients need a reviewed allow entry — ask first rather than exporting one.

Re-run `art-palette.mjs` after any Grove bump and commit the diff. That diff is how you find out
whether existing art needs recolouring.

---

## 5. Not allowed

| banned                                        | why                                                                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `<text>`, `<tspan>`, `<textPath>`             | **All copy is live HTML.** "01 / 03", year labels and signs are real text so they translate and screen readers reach them. |
| `<image>`                                     | raster breaks the flat-vector look and cannot be recoloured by token                                                       |
| `<style>`, `style="…"`                        | art must not carry CSS the app cannot see; use presentation attributes so colours stay tokenizable                         |
| `<use>`, `<symbol>`                           | references break when 19 files are inlined into one document                                                               |
| `<filter>`, `<mask>`, `<pattern>`             | defeat plane compositing and token recolouring                                                                             |
| `filter=`, `mask=`, `clip-path=`              | same, as attributes (the root frame clip is the one exception)                                                             |
| `<foreignObject>`, `<script>`, SMIL animation | not art                                                                                                                    |

### Export settings

In Figma's export panel:

- **Include "id" attribute** → **on**. Without it every layer name is lost and nothing can be animated.
- **Simplify stroke** → **off**. It converts strokes to outlines, which breaks the motion paths.
- Colour profile → **sRGB**.

**Commit the raw export, unedited.** Everything the page needs — id namespacing, token colours,
`aria-hidden`, plane anchoring — is applied at build time by
[`prepare-svg.mjs`](../../lib/art/prepare-svg.mjs). That way redrawing a scene is a re-export, never a
merge.

### Budgets

- **≤ 30 KB** per plane
- **≤ 300 elements** per plane
- ~300 KB for the whole journey (advisory; reported, never fatal)

Both per-plane limits are hard errors. Stars are a handful of circles, not hundreds.

---

## 6. Things worth knowing before you start

1. **The planes move at different speeds** — `sky` ×0.15, `mid` ×0.45, `near` ×1.0. Judge depth by
   what belongs to which plane, not by how the three look stacked and still.

2. **Phones re-crop the same art rather than getting a second set**, and each plane anchors
   independently: `sky` holds to the **top**, `near` holds to the **bottom**, `mid` splits the
   difference. So **only deliberately registered pairs may rely on exact cross-plane alignment** — the
   gate trees meeting the path is one; assume nothing else lines up.

3. **Leave the content zones clear.** Per scene that means the hero centre (entrance), stump tops
   (commons), door plaques (quarters), the counter grid (kitchen) and the text column (fire) — plus the
   180px rail clearance on every one.

4. **Art and content are coupled, so draw for growth.** Doors are featured case studies; year-rings
   are years of posts. Draw the trunk-and-door as a **repeatable module**, and at least 5 rings, so both
   can grow without new art.

5. **Flames scale from the bottom-centre.** Place their base there.

6. **The path previews the next surface.** At the entrance, the path is painted in the colour of the
   surface the _next_ scene uses. That continuity is the point — it is how a visitor is drawn onward.

7. **Bridges come later.** One drawn element per scene boundary, to be briefed separately once the
   scenes exist. Draw the scenes first.

---

## 7. Checking your work

```sh
node scripts/check-art.mjs                        # everything present
node scripts/check-art.mjs src/assets/journey/kitchen/mid.svg   # one file
node scripts/check-art.mjs --fix                  # lossless repairs only
node scripts/check-art.mjs --strict               # warnings become errors
node scripts/check-art.mjs --require-all          # also fail on what is not drawn yet
```

Errors name the file, the line and what to do. `--fix` only touches things with exactly one correct
answer, and never changes geometry, colour or shape.

Run the checker on **one real export before drawing everything** — Figma has quirks (ids with spaces,
stroke alignment) that are much cheaper to find on a single test frame than on nineteen.
