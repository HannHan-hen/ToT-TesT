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
  if (hasRealArt("fence_h1")) {
    // native sprite widths at a shared scale; joints hide inside the posts
    const SCALE = 110 / 341;
    const PIECE = { fence_h1: 341 * SCALE, fence_h2: 418 * SCALE };
    const POST = 20;
    const chain = (y, x, xEnd) => {
      while (x < xEnd - 24) {
        const key = ringRng() < 0.5 ? "fence_h1" : "fence_h2";
        const w = PIECE[key];
        if (x + w > xEnd) x = xEnd - w; // deepen the last overlap to fit
        add(key, x + w / 2, y, { w });
        x += w - POST;
      }
    };
    chain(yTop, F.x + 30, F.x + F.w - 30);
    chain(yBot, F.x + 30, W / 2 - 56);
    add("fence_gate", W / 2, yBot + 4, { w: 130 });
    chain(yBot, W / 2 + 56 - POST, F.x + F.w - 30);

    // receding side runs: stacked post pieces
    for (const side of [F.x, F.x + F.w]) {
      for (let y = F.y + 96; y < F.y + F.h - 4; y += 46) {
        add("fence_v", side, y, { w: 30 });
      }
    }

    // tall corner pivots
    const cw = 343 * SCALE;
    add("fence_corner", F.x + 18, yTop + 6, { w: cw, flipX: true });
    add("fence_corner", F.x + F.w - 18, yTop + 6, { w: cw });
    add("fence_corner", F.x + 18, yBot + 6, { w: cw, flipX: true });
    add("fence_corner", F.x + F.w - 18, yBot + 6, { w: cw });

    // bushes and rocks demoted to accents in front of the fence
    for (let i = 0; i < 24; i++) {
      const horizontal = ringRng() < 0.6;
      let ax, ay;
      if (horizontal) {
        ax = ringRng.range(F.x + 40, F.x + F.w - 40);
        ay = (ringRng() < 0.5 ? yTop : yBot) + ringRng.range(8, 18);
        if (ay > yBot && Math.abs(ax - W / 2) < 95) continue; // keep the gate clear
      } else {
        ax = (ringRng() < 0.5 ? F.x : F.x + F.w) + ringRng.range(-6, 6);
        ay = ringRng.range(F.y + 110, F.y + F.h - 8);
      }
      if (ringRng() < 0.55) add("bush", ax, ay, { h: ringRng.range(34, 50), seed: ringRng.int(1, 9999), flowers: ringRng() < 0.5 });
      else add("rock", ax, ay, { h: ringRng.range(26, 44), seed: ringRng.int(1, 9999) });
    }
  } else {
    alongRoundedRect(RING.x, RING.y, RING.w, RING.h, RING.r, 30, (x, y) => {
      const jx = x + ringRng.range(-7, 7), jy = y + ringRng.range(-5, 5);
      const roll = ringRng();
      if (roll < 0.4) add("rock", jx, jy, { h: ringRng.range(34, 60), seed: ringRng.int(1, 9999) });
      else if (roll < 0.85) add("bush", jx, jy, { h: ringRng.range(42, 66), seed: ringRng.int(1, 9999), flowers: ringRng() < 0.5 });
      else add("tuft", jx, jy, { h: 13 });
    });
  }

  // --- signs on the fence line, the bottom one beside the gate ---
  add("sign_sword", W / 2 - 180, yTop + 14, { h: 78, fallback: "sign", icon: "tool" });
  add("sign_fish", F.x + 10, H / 2 - 40, { h: 74, fallback: "sign", icon: "fish" });
  add("sign_anvil", F.x + F.w - 10, H / 2 - 40, { h: 74, fallback: "sign", icon: "bird" });
  add("sign_hops", W / 2 + 150, yBot + 12, { h: 78, fallback: "sign", icon: "leaf" });

  // --- farm contents ---
  add("cottage", 300, 370, { w: 310 });
  add("crate", 1010, 250, { h: 78, fallback: "logpile" });
  add("barrels", 1085, 295, { h: 78, fallback: "logpile" });
  add("basket", 425, 398, { h: 54, fallback: "bush" });

  // crop plot: one continuous 3x3 tilled patch with plants y-sorted on top,
  // wrapped snugly around the plant grid and inside the ring (bottom y=850)
  addFlat("plot", 361, 777, { w: 303, fallback: "soilpatch" });
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
