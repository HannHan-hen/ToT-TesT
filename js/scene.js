// Static farm scene: grass ground, a mossy fence framing the field, trees
// fading into the fog outside it, and the farm set dressing inside.
// Everything static is cached to offscreen canvases once; the per-frame
// work is just blitting plus the animated atmosphere.
import { makeRng, offscreen, alongRoundedRect } from "./util.js";
import { drawSprite, getImage, hasRealArt } from "./assets.js";
import { painters } from "./placeholders.js";

export const W = 1280, H = 960;

// fence ring geometry (the field boundary) — close to the frame, gently
// rounded corners, like the reference
const RING = { x: 88, y: 78, w: 1104, h: 804, r: 72 };

// where the cottage chimney is, for the smoke emitter (tuned to the sprite)
export const CHIMNEY = { x: 330, y: 88 };

// --- gameplay geometry ---
export const PLOT = [];
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) PLOT.push({ x: 265 + col * 96, y: 559 + row * 96 });
}
export const STAGE_W = [34, 73, 75, 73]; // plant draw width per growth stage
export const WALK = { x1: 118, y1: 132, x2: 1162, y2: 854 }; // inside the fence
export const BLOCKERS = [
  { x1: 150, y1: 240, x2: 452, y2: 376 },   // cottage footprint
  { x1: 962, y1: 196, x2: 1058, y2: 258 },  // shipping bin
  { x1: 1040, y1: 250, x2: 1125, y2: 302 }, // barrels
];
export const BIN = { x: 1010, y: 250 }; // the log crate ships produce

export function buildGround() {
  const c = offscreen(W, H);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const rng = makeRng(4242);

  const grass = getImage("grass");
  if (grass) {
    // mirror-tiled generated grass: a flipped copy always matches its own
    // edge, so the single-screen ground is seam-free by construction
    const s = 0.7;
    const tw = grass.width * s, th = grass.height * s;
    for (let i = 0; i * tw < W; i++) {
      for (let j = 0; j * th < H; j++) {
        ctx.save();
        ctx.translate(i * tw, j * th);
        ctx.scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1);
        ctx.drawImage(grass, i % 2 ? -tw : 0, j % 2 ? -th : 0, tw, th);
        ctx.restore();
      }
    }
    // directional light over the texture: warm top-left, shaded bottom-right
    let lg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1500);
    lg.addColorStop(0, "rgba(255,235,170,0.14)");
    lg.addColorStop(1, "rgba(255,235,170,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
    lg = ctx.createRadialGradient(W, H, 0, W, H, 1500);
    lg.addColorStop(0, "rgba(40,52,26,0.18)");
    lg.addColorStop(1, "rgba(40,52,26,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
  } else {
    // procedural fallback ground
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#97a851");
    g.addColorStop(0.5, "#869c49");
    g.addColorStop(1, "#71883e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
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
    for (let i = 0; i < 5200; i++) {
      const dark = rng() < 0.55;
      ctx.fillStyle = dark
        ? `rgba(60,82,38,${rng.range(0.04, 0.09)})`
        : `rgba(190,205,120,${rng.range(0.04, 0.08)})`;
      ctx.fillRect(rng.range(0, W), rng.range(0, H), rng.range(1, 2.4), rng.range(1, 2.4));
    }
  }

  // dappled light pools
  for (let i = 0; i < 22; i++) {
    const x = rng.range(0, W), y = rng.range(0, H);
    const r = rng.range(70, 190);
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, `rgba(205,220,130,${rng.range(0.04, 0.08)})`);
    g2.addColorStop(1, "rgba(205,220,130,0)");
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }

  // scattered ground decals
  if (hasRealArt("tuft_small")) {
    const decals = [
      ["tuft_small", 17], ["tuft_small", 17], ["tuft_large", 26],
      ["daisies", 21], ["buttercups", 19], ["pebbles", 17], ["clover", 19],
    ];
    for (let i = 0; i < 120; i++) {
      const [key, base] = rng.pick(decals);
      drawSprite(ctx, key, rng.range(30, W - 30), rng.range(36, H - 16),
        { h: base * rng.range(0.8, 1.3), fallback: "tuft" });
    }
  } else {
    for (let i = 0; i < 70; i++) {
      const x = rng.range(60, W - 60), y = rng.range(60, H - 60);
      painters.flower(ctx, x, y, { h: rng.range(5, 8), color: rng.pick(["#f3ecd2", "#f0d98a", "#e9c8d4"]) });
    }
    for (let i = 0; i < 120; i++) {
      painters.tuft(ctx, rng.range(40, W - 40), rng.range(40, H - 40), { h: rng.range(8, 14) });
    }
  }

  // the field itself catches more sun than the woods around it
  for (let i = 0; i < 3; i++) {
    const inset = i * 26;
    ctx.fillStyle = "rgba(255,238,170,0.055)";
    ctx.beginPath();
    ctx.roundRect(RING.x + inset, RING.y + inset, RING.w - inset * 2, RING.h - inset * 2, RING.r - inset * 0.5);
    ctx.fill();
  }

  // the tilled plot is static ground; the plants on it are game state
  drawSprite(ctx, "plot", 361, 777, { w: 303, fallback: "soilpatch" });
  return c;
}

// Everything that never moves: trees, fence, cottage, signs, props.
// Returned as an entity list so dynamic actors (farmer, chicken, crops)
// can y-sort against it every frame.
export function buildStaticEntities() {
  const rng = makeRng(99);
  const ents = [];
  const add = (key, x, y, opts = {}) => ents.push({ key, x, y, opts });

  // --- trees outside the ring: a thin band, cropped by the frame ---
  const treeRng = makeRng(1717);
  alongRoundedRect(RING.x - 26, RING.y - 26, RING.w + 52, RING.h + 52, RING.r, 42, (x, y) => {
    if (treeRng() < 0.38) return;
    // push outward from ring center
    const cx = W / 2, cy = H / 2;
    const dx = x - cx, dy = y - cy;
    const len = Math.hypot(dx, dy);
    const out = treeRng.range(10, 64);
    const tx = x + (dx / len) * out + treeRng.range(-22, 22);
    const ty = y + (dy / len) * out * 0.8 + treeRng.range(-16, 16);
    if (tx < -60 || tx > W + 60 || ty < 24 || ty > H + 70) return;
    const inFrontOfBottomFence = ty > RING.y + RING.h + 20;
    if (inFrontOfBottomFence && Math.abs(tx - W / 2) < 150) return; // keep the gate visible
    if (inFrontOfBottomFence && treeRng() < 0.4) return; // thinner bottom band
    if (treeRng() < 0.62) add("pine", tx, ty, { h: treeRng.range(100, 170), seed: treeRng.int(1, 9999) });
    else add("tree", tx, ty, { h: treeRng.range(90, 140), seed: treeRng.int(1, 9999) });
  });

  // --- the boundary: overgrown mossy fence with bush/rock accents ---
  const F = RING;
  const ringRng = makeRng(31337);
  const yTop = F.y + 26, yBot = F.y + F.h + 26;
  const sideL = F.x + 6, sideR = F.x + F.w - 6;
  const signTopX = W / 2 - 180, signBotX = W / 2, signSideY = H / 2 - 40;
  if (hasRealArt("fence_h1")) {
    // open segments (single built-in post) chain left to right; each joint
    // hides under the next segment's post, and runs close with the
    // pixel-identical end post harvested from the original art
    const SCALE = 110 / 341;
    const OPEN = { fence_h1_open: 253 * SCALE, fence_h2_open: 251 * SCALE };
    const chain = (y, x0, x1) => {
      let x = x0;
      while (x1 - x >= 40) {
        let key = ringRng() < 0.5 ? "fence_h1_open" : "fence_h2_open";
        if (OPEN[key] > x1 - x) key = "fence_h1_open";
        if (OPEN[key] > x1 - x) x = x1 - OPEN[key]; // deepen final overlap
        const w = OPEN[key];
        add(key, x + w / 2, y, { w });
        x += w - 22;
      }
      add("fence_endpost", Math.min(x + 11, x1 - 6), y + 2, { w: 25 });
    };
    // top and bottom runs, with a gap where each sign stands
    chain(yTop, sideL - 10, signTopX - 55);
    chain(yTop, signTopX + 55, sideR + 10);
    chain(yBot, sideL - 10, signBotX - 55);
    chain(yBot, signBotX + 55, sideR + 10);

    // receding side runs: stacked post pieces, gap at the side signs;
    // cuts end naturally because the stack is made of discrete posts
    const vRun = (x, y0, y1) => {
      for (let y = y0; y < y1; y += 68) add("fence_v", x, y, { w: 56 });
    };
    for (const x of [sideL, sideR]) {
      vRun(x, yTop + 76, signSideY - 58);
      vRun(x, signSideY + 160, yBot - 46);
    }

    // bushes and rocks: accents beside the fence, never on it
    for (let i = 0; i < 34; i++) {
      const horizontal = ringRng() < 0.6;
      let ax, ay;
      if (horizontal) {
        ax = ringRng.range(F.x + 50, F.x + F.w - 50);
        const top = ringRng() < 0.5;
        ay = (top ? yTop : yBot) + ringRng.range(8, 18);
        const signX = top ? signTopX : signBotX;
        if (Math.abs(ax - signX) < 80) continue; // keep sign gaps clear
      } else {
        const left = ringRng() < 0.5;
        ax = left ? sideL + ringRng.range(16, 32) : sideR - ringRng.range(16, 32);
        ay = ringRng.range(F.y + 120, F.y + F.h - 10);
        if (Math.abs(ay - signSideY) < 70) continue;
      }
      if (ringRng() < 0.55) add("bush", ax, ay, { h: ringRng.range(34, 50), seed: ringRng.int(1, 9999), flowers: ringRng() < 0.5 });
      else add("rock", ax, ay, { h: ringRng.range(26, 44), seed: ringRng.int(1, 9999) });
    }

    // corner flora hides the runs meeting (the right corners get this from
    // the tree band already; reinforce the left ones)
    add("pine", sideL + 4, yBot + 38, { h: 195, seed: 4242 });
    add("bush", sideL + 16, yTop + 30, { h: 58, seed: 777, flowers: true });
    add("rock", sideL + 44, yTop + 36, { h: 30, seed: 778 });
  } else {
    alongRoundedRect(RING.x, RING.y, RING.w, RING.h, RING.r, 30, (x, y) => {
      const jx = x + ringRng.range(-7, 7), jy = y + ringRng.range(-5, 5);
      const roll = ringRng();
      if (roll < 0.4) add("rock", jx, jy, { h: ringRng.range(34, 60), seed: ringRng.int(1, 9999) });
      else if (roll < 0.85) add("bush", jx, jy, { h: ringRng.range(42, 66), seed: ringRng.int(1, 9999), flowers: ringRng() < 0.5 });
      else add("tuft", jx, jy, { h: 13 });
    });
  }

  // --- signs beside their openings, standing over the fence runs ---
  add("sign_sword", signTopX - 85, yTop + 10, { h: 78, fallback: "sign", icon: "tool" });
  add("sign_fish", sideL, signSideY - 48, { h: 74, fallback: "sign", icon: "fish" });
  add("sign_anvil", sideR, signSideY - 48, { h: 74, fallback: "sign", icon: "bird" });
  add("sign_hops", signBotX - 85, yBot + 10, { h: 78, fallback: "sign", icon: "leaf" });;

  // --- farm contents ---
  add("cottage", 300, 370, { w: 310 });
  add("crate", 1010, 250, { h: 78, fallback: "logpile" });
  add("barrels", 1085, 295, { h: 78, fallback: "logpile" });
  add("basket", 425, 398, { h: 54, fallback: "bush" });

  // a few decorative touches inside the field
  add("rock", 920, 700, { h: 20, seed: 5 });
  add("bush", 1040, 760, { h: 30, seed: 8, flowers: true });
  add("tuft", 520, 430, { h: 12 });
  add("tuft", 880, 380, { h: 12 });

  return ents;
}
