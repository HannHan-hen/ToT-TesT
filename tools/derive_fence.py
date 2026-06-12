#!/usr/bin/env python3
"""Derive open-ended fence segments from the two-post originals.

Chained two-post segments show their overlap; an open segment ends in bare
rails instead, and the next segment's post (or a cap stump) hides the seam.
Finds the right-hand post by scanning column heights (posts rise above the
rails) and crops just past its left edge.
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, "tools")
from process_asset import chroma_key, trim


def open_segment(img: Image.Image):
    """Normalize a fence segment for chaining: starts exactly at its leftmost
    post, ends in bare rails (rightmost post and any detached stubs cut)."""
    a = np.asarray(img)[..., 3]
    h, w = a.shape
    tops = np.array([np.argmax(a[:, x] > 30) if (a[:, x] > 30).any() else h for x in range(w)])
    rail_top = np.median(tops[w // 3: 2 * w // 3])
    is_post = tops < rail_top - h * 0.08
    post_cols = np.where(is_post)[0]
    if len(post_cols) == 0:
        return img, None
    # left edge: snap to the leftmost post (drops stray stubs before it)
    left = post_cols.min()
    # right edge: left edge of the rightmost post block
    x = post_cols.max()
    while x > w // 2 and is_post[x]:
        x -= 1
    post_block = trim(img.crop((x - 2, 0, w, h)))
    return img.crop((max(0, left - 2), 0, x + 4, h)), post_block


def main():
    for name in ["fence_h1", "fence_h2"]:
        src = Image.open(f"assets/sprites/{name}.png").convert("RGBA")
        out, endpost = open_segment(src)
        out.save(f"assets/sprites/{name}_open.png")
        print(f"{name}: {src.size} -> open {out.size}")
        if endpost and name == "fence_h1":
            # the harvested end post doubles as a pixel-identical run cap
            endpost.save("assets/sprites/fence_endpost.png")
            print(f"fence_endpost: {endpost.size}")


if __name__ == "__main__":
    main()
