#!/usr/bin/env python3
"""Asset pipeline: turn raw AI-generated sprite sheets into clean game sprites.

Steps performed per sprite:
  1. (optional) split a uniform grid sheet into cells
  2. chroma-key the solid background color to transparency (soft edge)
  3. un-mix edge pixels so no key-color fringe remains
  4. trim to content bounding box
  5. (optional) fit into a square canvas of a given size, bottom-anchored

Usage examples:
  # single sprite on magenta
  python3 tools/process_asset.py raw/tree.png -o assets/sprites/tree.png --size 256

  # 2x2 sheet of cottage variants, name each cell
  python3 tools/process_asset.py raw/cottages.png --grid 2x2 \
      --names cottage_spring,cottage_summer,cottage_autumn,cottage_winter \
      -o assets/sprites --size 512
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image


def hex_color(s: str):
    s = s.lstrip("#")
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))


def chroma_key(img: Image.Image, key=(255, 0, 255), d_opaque=170.0, d_clear=55.0) -> Image.Image:
    """Key out `key` color. Pixels closer than d_clear become transparent,
    farther than d_opaque stay opaque, in between get soft alpha and their
    color un-mixed (the key contribution is subtracted out)."""
    arr = np.asarray(img.convert("RGBA")).astype(np.float64)
    rgb = arr[..., :3]
    k = np.array(key, dtype=np.float64)

    dist = np.sqrt(((rgb - k) ** 2).sum(axis=-1))
    a = (dist - d_clear) / (d_opaque - d_clear)
    a = np.clip(a, 0.0, 1.0)
    a = a * a * (3 - 2 * a)  # smoothstep

    # un-mix: observed = a*true + (1-a)*key  =>  true = (observed - (1-a)*key)/a
    soft = (a > 0.001) & (a < 0.999)
    a3 = a[..., None]
    with np.errstate(divide="ignore", invalid="ignore"):
        unmixed = (rgb - (1.0 - a3) * k) / np.maximum(a3, 1e-6)
    rgb_out = np.where(soft[..., None], np.clip(unmixed, 0, 255), rgb)

    out = np.empty_like(arr)
    out[..., :3] = rgb_out
    out[..., 3] = arr[..., 3] * a
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def trim(img: Image.Image, alpha_thresh=8) -> Image.Image:
    a = np.asarray(img)[..., 3]
    mask = a > alpha_thresh
    if not mask.any():
        return img
    ys, xs = np.where(mask)
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def fit_square(img: Image.Image, size: int, margin=0.04, anchor="bottom") -> Image.Image:
    """Scale content to fit a size x size canvas, bottom-center anchored so
    sprites of one family share a common ground line."""
    inner = int(size * (1 - 2 * margin))
    scale = min(inner / img.width, inner / img.height)
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    img = img.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - w) // 2
    y = (size - h) // 2 if anchor == "center" else size - h - int(size * margin)
    canvas.paste(img, (x, y))
    return canvas


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("input")
    p.add_argument("-o", "--out", required=True, help="output file, or directory when using --grid")
    p.add_argument("--grid", help="split sheet into ROWSxCOLS cells, e.g. 2x2")
    p.add_argument("--names", help="comma-separated cell names (row-major) for --grid")
    p.add_argument("--key", default="FF00FF", help="background key color (hex)")
    p.add_argument("--size", type=int, help="fit result into a square canvas of this size")
    p.add_argument("--anchor", default="bottom", choices=["bottom", "center"])
    p.add_argument("--no-key", action="store_true", help="input already has transparency")
    args = p.parse_args()

    src = Image.open(args.input).convert("RGBA")
    key = hex_color(args.key)

    if args.grid:
        rows, cols = (int(v) for v in args.grid.lower().split("x"))
        names = args.names.split(",") if args.names else [f"cell_{i}" for i in range(rows * cols)]
        os.makedirs(args.out, exist_ok=True)
        cw, ch = src.width // cols, src.height // rows
        for r in range(rows):
            for c in range(cols):
                cell = src.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
                if not args.no_key:
                    cell = chroma_key(cell, key)
                cell = trim(cell)
                if args.size:
                    cell = fit_square(cell, args.size, anchor=args.anchor)
                path = os.path.join(args.out, names[r * cols + c] + ".png")
                cell.save(path)
                print(f"wrote {path}  {cell.size}")
    else:
        img = src if args.no_key else chroma_key(src, key)
        img = trim(img)
        if args.size:
            img = fit_square(img, args.size, anchor=args.anchor)
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        img.save(args.out)
        print(f"wrote {args.out}  {img.size}")


if __name__ == "__main__":
    sys.exit(main())
