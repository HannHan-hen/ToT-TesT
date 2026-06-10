# Asset prompt packs

> **Status:** Packs 1, 2 and 3 received and integrated (2026-06-10). All
> placeholder art except ground details is now replaced by generated sprites.

How this works: copy a prompt below into the image generator, attach the
reference image noted, paste the result into the chat. I (Claude) run it
through `tools/process_asset.py`, check coherence, and either slot it into
the scene or ask for a re-roll. Expect ~1.5–2 generations per final asset —
that's normal.

## Golden rules (apply to every prompt)

- Background must be **solid magenta (#FF00FF)** — no gradients, no shadows
  cast onto the background.
- Always **attach the spring cottage** (or another already-accepted asset)
  as a style reference.
- One consistent camera: **3/4 top-down view**, like the cottage — front
  face visible, top surface tilted toward the viewer.
- Light always comes from the **upper left**, soft and warm.

The shared style suffix used in every prompt:

> cozy storybook pixel-art hybrid, painterly shading, warm golden palette,
> thick soft outlines, 3/4 top-down view, soft light from the upper left,
> solid magenta background #FF00FF, no drop shadow on the background

---

## Pack 1 — the world frame

### 1a. Pine trees (one image, 2x2 grid)
> A 2x2 sprite sheet grid of four cute pine trees for a farming game, same
> style as the attached cottage: one tall pine, one medium pine, one short
> plump pine, one slightly leaning pine. Dark warm green needles with
> golden light catching the left side. Each tree centered in its grid cell.
> [style suffix]

### 1b. Round leafy trees (one image, 2x2 grid)
> A 2x2 sprite sheet grid of four cute round deciduous trees, same style as
> the attached cottage: fluffy blob-shaped canopies in two sizes, one with
> tiny white blossoms, one with a slightly darker canopy. [style suffix]

### 1c. Rocks and bushes (one image, 3x2 grid)
> A 3x2 sprite sheet grid: three mossy rounded boulders of different sizes
> on the top row, three small leafy bushes on the bottom row — one plain,
> one with tiny pink flowers, one with white flowers. Same style as the
> attached cottage. [style suffix]

## Pack 2 — the farm

### 2a. Turnip growth stages (one image, 4 in a row)
> A 1x4 sprite sheet, left to right: turnip crop growth stages. Stage 1: two
> tiny sprout leaves in dark tilled soil. Stage 2: a small leafy rosette.
> Stage 3: lush leaves with the top of a purple-white turnip bulb peeking
> out of the soil. Stage 4: a plump round white turnip with a purple crown
> and a lush dark-green leaf rosette, mostly out of the soil. Each stage
> includes its own small square patch of dark tilled soil. [style suffix]

### 2b. Tilled soil tile (single)
> A single square tile of dark tilled farm soil with three soft horizontal
> furrow ridges, slightly rounded corners, a few small stones, seen from
> the same 3/4 top-down angle as the attached cottage. [style suffix]

### 2c. Wooden signs (one image, 2x2 grid)
> A 2x2 sprite sheet grid of four small wooden signposts, same wood tones
> as the attached cottage door: each a single plank board on a short post,
> with a carved icon — a fish, a watering can, a chicken, a leaf.
> [style suffix]

## Pack 3 — the residents

### 3a. Farmer girl (single)
> A cute small farmer girl standing facing the viewer, seen from the same
> high 3/4 angle as the attached cottage: strawberry-blonde hair, simple
> brown work dress over a cream shirt, small boots, gentle smile, chibi
> proportions (large head, small body), about as tall as the cottage door.
> [style suffix]

### 3b. Chicken (single)
> A cute plump white chicken with a red comb and orange beak, standing,
> seen from the same high 3/4 angle as the attached cottage, slightly
> turned to the right. [style suffix]

### 3c. Log pile in a wooden crate (single)
> A small rustic open wooden crate filled with stacked firewood logs, warm
> brown wood matching the attached cottage, seen from the same high 3/4
> angle. [style suffix]

---

## Processing cheatsheet (my side)

```bash
# grids
python3 tools/process_asset.py raw/pines.png --grid 2x2 \
  --names pine_tall,pine_mid,pine_short,pine_lean -o assets/sprites --size 256

# singles
python3 tools/process_asset.py raw/chicken.png -o assets/sprites/chicken.png --size 128
```

Then add the new keys to `assets/manifest.json` — the scene picks them up
automatically and stops using the procedural placeholder.
