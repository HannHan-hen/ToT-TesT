# Turnip Hollow 🌱

A small, cute browser farming game.

**Play:** https://hannhan-hen.github.io/ToT-TesT/

## How to play

- **WASD / arrow keys** to walk, **Space / E** to interact — or just
  **click/tap** where you want to go (interacts on arrival).
- Stand at the tilled field to **plant** turnip seeds in empty cells and
  **harvest** mature ones. Turnips take **three days** to grow.
- A day lasts about a minute; nights pass with a fade.
- Carry your turnips to the **log crate** (top right) to ship them for gold.
- Progress saves locally in your browser.

## How it's built

- Plain HTML5 canvas, no build step, no dependencies. `index.html` + `js/`.
- The scene is composed from individual sprites, y-sorted, with the dreamy
  look painted on top in code (`js/atmosphere.js`): warm light grade, god
  rays, drifting edge fog, chimney smoke, vignette.
- Every sprite key has a **procedural placeholder** (`js/placeholders.js`).
  Real AI-generated art (cleaned via `tools/process_asset.py`, declared in
  `assets/manifest.json`) overrides placeholders one asset at a time, so
  the scene is always complete while art trickles in.

## Asset pipeline

1. Generate art on a solid magenta (#FF00FF) background — prompts live in
   [PROMPTS.md](PROMPTS.md).
2. `python3 tools/process_asset.py` chroma-keys, defringes, trims and
   normalizes sprites (needs `pip install pillow numpy`).
3. Add the sprite to `assets/manifest.json`.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
