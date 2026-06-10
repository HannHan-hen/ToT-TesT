# Turnip Hollow 🌱

A small, cute browser farming game — currently a static scene while we get
the art direction right.

**Live:** https://hannhan-hen.github.io/ToT-TesT/

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
