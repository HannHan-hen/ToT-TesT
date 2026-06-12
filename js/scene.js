// Static farm scene: ground texture, a ring of rocks/bushes framing the
// field, trees fading into the fog outside it, and the farm set dressing
// inside. Everything static is cached to offscreen canvases once; the
// per-frame work is just blitting plus the animated atmosphere.
import { makeRng, offscreen, alongRoundedRect } from "./util.js";
import { drawSprite } from "./assets.js";
import { painters } from "./placeholders.js";

export const W = 1280, H = 960;

// fence ring geometry (the field boundary)
const RING = { x: 130, y: 110, w: 1020, h: 740, r: 150 };

// where the cottage chimney is, for the smoke emitter (tuned to the sprite)
export const CHIMNEY = { x: 330, y: 88 };

export function buildGround() {
  const c = offscreen(W, H);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const rng = makeRng(4242);

  // base grass with a soft sunlit gradient toward the top-left
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#97a851");
  g.addColorStop(0.5, "#869c49");
  g.addColorStop(1, "#71883e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // mottled patches
  for (let i = 0; i < 420; i++) {
    const x = rng.range(0, W), y = rng.range(0, H);
    const r = rng.range(18, 85);
    const dark = rng() < 0.55;
    ctx.fillStyle = dark
      ? `rgba(86,112,52,${rng.range(0.05, 0.13)})`
      : `rgba(168,190,104,${rng.range(0.05, 0.11)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * rng.range(0.5, 0.8), rng.range(0, 3), 0, 7);
    ctx.fill();
  }

  // fine grass strokes
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 900; i++) {
    const x = rng.range(0, W), y = rng.range(0, H);
    const s = rng.range(3, 7);
    ctx.strokeStyle = rng() < 0.5
      ? `rgba(70,95,42,${rng.range(0.15, 0.3)})`
      : `rgba(150,175,90,${rng.range(0.12, 0.25)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + rng.range(-2, 2), y - s * 0.7, x + rng.range(-3, 3), y - s);
    ctx.stroke();
  }

  // scattered tiny flowers, denser near the ring
  for (let i = 0; i < 70; i++) {
    const x = rng.range(60, W - 60), y = rng.range(60, H - 60);
    painters.flower(ctx, x, y, { h: rng.range(5, 8), color: rng.pick(["#f3ecd2", "#f0d98a", "#e9c8d4"]) });
  }
  for (let i = 0; i < 120; i++) {
    painters.tuft(ctx, rng.range(40, W - 40), rng.range(40, H - 40), { h: rng.range(8, 14) });
  }

  // the field itself catches more sun than the woods around it
  for (let i = 0; i < 3; i++) {
    const inset = i * 26;
    ctx.fillStyle = "rgba(255,238,170,0.055)";
    ctx.beginPath();
    ctx.roundRect(RING.x + inset, RING.y + inset, RING.w - inset * 2, RING.h - inset * 2, RING.r - inset * 0.5);
    ctx.fill();
  }
  return c;
}

export function buildEntities() {
  const c = offscreen(W, H);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const rng = makeRng(99);
  const ents = [];
  const flats = []; // ground-level tiles (soil) that must never cover sprites
  const add = (key, x, y, opts = {}) => ents.push({ key, x, y, opts });
  const addFlat = (key, x, y, opts = {}) => flats.push({ key, x, y, opts });

  // --- trees outside the ring, denser in the corners ---
  const treeRng = makeRng(1717);
  alongRoundedRect(RING.x - 35, RING.y - 35, RING.w + 70, RING.h + 70, RING.r, 46, (x, y) => {
    if (treeRng() < 0.45) return;
    // push outward from ring center
    const cx = W / 2, cy = H / 2;
    const dx = x - cx, dy = y - cy;
    const len = Math.hypot(dx, dy);
    const out = treeRng.range(30, 130);
    const tx = x + (dx / len) * out + treeRng.range(-25, 25);
    const ty = y + (dy / len) * out * 0.8 + treeRng.range(-20, 20);
    if (tx < -40 || tx > W + 40 || ty < 30 || ty > H + 50) return;
    if (treeRng() < 0.62) add("pine", tx, ty, { h: treeRng.range(100, 170), seed: treeRng.int(1, 9999) });
    else add("tree", tx, ty, { h: treeRng.range(90, 140), seed: treeRng.int(1, 9999) });
  });

  // --- the boundary ring: rocks / bushes / flowers ---
  const ringRng = makeRng(31337);
  alongRoundedRect(RING.x, RING.y, RING.w, RING.h, RING.r, 30, (x, y) => {
    const jx = x + ringRng.range(-7, 7), jy = y + ringRng.range(-5, 5);
    const roll = ringRng();
    if (roll < 0.4) add("rock", jx, jy, { h: ringRng.range(34, 60), seed: ringRng.int(1, 9999) });
    else if (roll < 0.85) add("bush", jx, jy, { h: ringRng.range(42, 66), seed: ringRng.int(1, 9999), flowers: ringRng() < 0.5 });
    else add("tuft", jx, jy, { h: 13 });
  });

  // --- signs at the edge midpoints, sitting on the ring ---
  add("sign_sword", W / 2 - 180, RING.y + 8, { h: 78, fallback: "sign", icon: "tool" });
  add("sign_fish", RING.x + 4, H / 2 - 40, { h: 74, fallback: "sign", icon: "fish" });
  add("sign_anvil", RING.x + RING.w - 2, H / 2 - 40, { h: 74, fallback: "sign", icon: "bird" });
  add("sign_hops", W / 2, RING.y + RING.h + 4, { h: 78, fallback: "sign", icon: "leaf" });

  // --- farm contents ---
  add("cottage", 300, 370, { w: 310 });
  add("crate", 1010, 250, { h: 78, fallback: "logpile" });
  add("barrels", 1085, 295, { h: 78, fallback: "logpile" });
  add("basket", 425, 398, { h: 54, fallback: "bush" });

  // crop plot: one continuous 3x3 tilled patch with plants y-sorted on top,
  // kept well inside the boundary ring (ring bottom edge is at y=850)
  addFlat("plot", 361, 808, { w: 318, fallback: "soilpatch" });
  const stages = [3, 2, 3, 1, 3, 2, 3, 0, 3];
  // sheet's own stage proportions, anchored so a mature plant is ~60% of
  // farmer height — plants should never outscale the people
  const stageW = [34, 73, 75, 73];
  let i = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const st = stages[i++];
      const x = 265 + col * 96, y = 559 + row * 96;
      add(`plant_turnip_${st}`, x, y, { h: stageW[st], fallback: "turnip", stage: st });
    }
  }

  add("farmer", 790, 520, { h: 122, fallback: "character" });
  add("chicken", 640, 320, { h: 68 });

  // a few decorative touches inside the field
  add("rock", 920, 700, { h: 20, seed: 5 });
  add("bush", 1040, 760, { h: 30, seed: 8, flowers: true });
  add("tuft", 520, 430, { h: 12 });
  add("tuft", 880, 380, { h: 12 });

  // ground tiles first, then painter's algorithm by baseline
  for (const e of flats) drawSprite(ctx, e.key, e.x, e.y, e.opts);
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) drawSprite(ctx, e.key, e.x, e.y, e.opts);
  return c;
}
