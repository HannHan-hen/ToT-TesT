// Deterministic RNG so the scene composition is stable across reloads.
export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (a, b) => a + next() * (b - a);
  next.int = (a, b) => Math.floor(next.range(a, b + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

export function offscreen(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

// Soft elliptical contact shadow under sprites.
export function shadow(ctx, x, y, rx, ry, alpha = 0.22) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(30,40,18,${alpha})`);
  g.addColorStop(1, "rgba(30,40,18,0)");
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Blobby organic disc — the building block of bushes and tree canopies.
export function blob(ctx, x, y, r, color, rng, wobble = 0.18) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + (rng ? (rng() - 0.5) * 2 * wobble : Math.sin(a * 3) * wobble * 0.5));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Walk a rounded-rect perimeter, calling fn(x, y, t) every `step` px.
export function alongRoundedRect(x, y, w, h, r, step, fn) {
  const straights = [
    [x + r, y, x + w - r, y],
    [x + w, y + r, x + w, y + h - r],
    [x + w - r, y + h, x + r, y + h],
    [x, y + h - r, x, y + r],
  ];
  const corners = [
    [x + w - r, y + r, -Math.PI / 2, 0],
    [x + w - r, y + h - r, 0, Math.PI / 2],
    [x + r, y + h - r, Math.PI / 2, Math.PI],
    [x + r, y + r, Math.PI, Math.PI * 1.5],
  ];
  let dist = 0;
  for (let i = 0; i < 4; i++) {
    const [x1, y1, x2, y2] = straights[i];
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (let d = 0; d < len; d += step, dist += step) {
      const t = d / len;
      fn(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, dist);
    }
    const [cx, cy, a1, a2] = corners[i];
    const arc = (a2 - a1) * r;
    for (let d = 0; d < arc; d += step, dist += step) {
      const a = a1 + (d / arc) * (a2 - a1);
      fn(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dist);
    }
  }
}
