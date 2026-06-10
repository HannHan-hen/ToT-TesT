// Sprite registry: real generated PNGs (declared in assets/manifest.json)
// take priority; anything not yet generated falls back to its procedural
// placeholder painter. Real images draw bottom-center anchored, same as
// painters, so swapping art never moves the layout.
import { painters } from "./placeholders.js";

const images = new Map();

export async function loadAssets() {
  let manifest = {};
  try {
    manifest = await (await fetch("assets/manifest.json")).json();
  } catch { /* no manifest yet — all placeholders */ }
  await Promise.all(Object.entries(manifest).map(([key, meta]) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images.set(key, { img, meta }); resolve(); };
      img.onerror = () => resolve(); // missing file -> placeholder
      img.src = meta.src;
    })
  ));
}

export function hasRealArt(key) {
  return images.has(key);
}

export function drawSprite(ctx, key, x, y, opts = {}) {
  const entry = images.get(key);
  if (entry) {
    const { img, meta } = entry;
    const w = opts.w ?? opts.h ?? img.width;
    const h = w * (img.height / img.width);
    if (meta.shadow !== false) {
      softShadow(ctx, x, y, w * (meta.shadowScale ?? 0.42), w * 0.13);
    }
    ctx.drawImage(img, x - w / 2, y - h, w, h);
    return;
  }
  const painter = painters[key];
  if (painter) painter(ctx, x, y, opts);
}

function softShadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.translate(x, y - 4);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, "rgba(30,40,18,0.25)");
  g.addColorStop(1, "rgba(30,40,18,0)");
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
