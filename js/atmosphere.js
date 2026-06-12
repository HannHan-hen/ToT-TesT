// The dreamy look: warm light grade, god rays from the top-left, slow fog
// banks at the edges, chimney smoke, and a soft vignette. All painted over
// the (mostly static) scene every frame.
import { makeRng, offscreen } from "./util.js";

const W = 1280, H = 960;

// --- soft radial puff sprite, reused for fog and smoke ---
function makePuff(size, inner, outer) {
  const c = offscreen(size, size);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

const fogPuff = makePuff(256, "rgba(255,250,238,0.85)", "rgba(255,250,238,0)");
const smokePuff = makePuff(128, "rgba(225,220,210,0.6)", "rgba(225,220,210,0)");

// --- fog field: puffs hugging the frame edges, drifting slowly ---
const rng = makeRng(7331);
const fogBlobs = [];
for (let i = 0; i < 34; i++) {
  // park puffs around the border band
  const edge = rng.int(0, 3);
  let x, y;
  if (edge === 0) { x = rng.range(-80, W + 80); y = rng.range(-90, 40); }
  else if (edge === 1) { x = rng.range(-80, W + 80); y = rng.range(H - 40, H + 90); }
  else if (edge === 2) { x = rng.range(-130, 50); y = rng.range(0, H); }
  else { x = rng.range(W - 50, W + 130); y = rng.range(0, H); }
  fogBlobs.push({
    x, y,
    r: rng.range(130, 300),
    alpha: rng.range(0.12, 0.26),
    phase: rng.range(0, Math.PI * 2),
    speed: rng.range(0.05, 0.16),
    drift: rng.range(8, 26),
  });
}
// heavier banks in the corners
for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
  fogBlobs.push({ x: cx, y: cy, r: 380, alpha: 0.42, phase: rng.range(0, 6), speed: 0.05, drift: 10 });
}

// --- chimney smoke particles ---
const smoke = [];
let smokeTimer = 0;

export function updateSmoke(dt, originX, originY) {
  smokeTimer -= dt;
  if (smokeTimer <= 0) {
    smokeTimer = 0.55;
    smoke.push({ x: originX, y: originY, age: 0, life: 5, seed: Math.random() * 6 });
  }
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];
    p.age += dt;
    if (p.age > p.life) smoke.splice(i, 1);
  }
}

export function drawAtmosphere(ctx, t) {
  // 1. warm sun glow from the top-left
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  let g = ctx.createRadialGradient(60, 40, 0, 60, 40, 1150);
  g.addColorStop(0, "rgba(255,214,140,0.7)");
  g.addColorStop(0.55, "rgba(255,200,130,0.24)");
  g.addColorStop(1, "rgba(120,110,140,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 2. god rays
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.translate(-40, -60);
  for (let i = 0; i < 4; i++) {
    const baseA = 0.55 + i * 0.16;
    const sway = Math.sin(t * 0.3 + i * 1.7) * 0.02;
    const a = baseA + sway;
    const len = 1500;
    const w1 = 30 + i * 18, w2 = 170 + i * 70;
    const pulse = 0.1 + 0.05 * Math.sin(t * 0.45 + i * 2.1);
    const dx = Math.cos(a), dy = Math.sin(a);
    const px = -dy, py = dx;
    const grad = ctx.createLinearGradient(0, 0, dx * len, dy * len);
    grad.addColorStop(0, `rgba(255,236,180,${pulse * 1.6})`);
    grad.addColorStop(0.5, `rgba(255,236,180,${pulse})`);
    grad.addColorStop(1, "rgba(255,236,180,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px * w1, py * w1);
    ctx.lineTo(dx * len + px * w2, dy * len + py * w2);
    ctx.lineTo(dx * len - px * w2, dy * len - py * w2);
    ctx.lineTo(-px * w1, -py * w1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3. chimney smoke (below fog so fog reads as nearer)
  for (const p of smoke) {
    const k = p.age / p.life;
    const alpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
    const size = 26 + k * 90;
    const sway = Math.sin(p.age * 1.3 + p.seed) * 14;
    ctx.globalAlpha = alpha * 0.8;
    ctx.drawImage(smokePuff, p.x + sway - size / 2 + k * 30, p.y - k * 120 - size / 2, size, size);
  }
  ctx.globalAlpha = 1;

  // 4. fog
  for (const f of fogBlobs) {
    const ox = Math.sin(t * f.speed + f.phase) * f.drift;
    const oy = Math.cos(t * f.speed * 0.7 + f.phase) * f.drift * 0.5;
    const breathe = 1 + 0.05 * Math.sin(t * f.speed * 1.3 + f.phase * 2);
    const r = f.r * breathe;
    ctx.globalAlpha = f.alpha;
    ctx.drawImage(fogPuff, f.x + ox - r, f.y + oy - r * 0.62, r * 2, r * 1.24);
  }
  ctx.globalAlpha = 1;

  // 5. vignette — warm-dark, never pure black
  g = ctx.createRadialGradient(W / 2, H / 2 - 40, H * 0.32, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, "rgba(45,32,18,0)");
  g.addColorStop(1, "rgba(45,32,18,0.34)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 5b. luminous mist frame hugging the very edges (after the vignette so
  // the rim stays bright), breathing slowly
  const mistW = 92;
  const mistA = 0.42 * (0.85 + 0.15 * Math.sin(t * 0.16));
  const mist = (x1, y1, x2, y2) => {
    const lg = ctx.createLinearGradient(x1, y1, x2, y2);
    lg.addColorStop(0, `rgba(253,249,238,${mistA})`);
    lg.addColorStop(0.55, `rgba(253,249,238,${mistA * 0.35})`);
    lg.addColorStop(1, "rgba(253,249,238,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
  };
  mist(0, 0, mistW, 0);
  mist(W, 0, W - mistW, 0);
  mist(0, 0, 0, mistW * 0.85);
  mist(0, H, 0, H - mistW * 0.85);
  for (const [cx2, cy2] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const rg = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 250);
    rg.addColorStop(0, `rgba(253,249,238,${mistA * 0.9})`);
    rg.addColorStop(1, "rgba(253,249,238,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  // 6. final unifying warm wash
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = "rgba(255,196,120,0.26)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
